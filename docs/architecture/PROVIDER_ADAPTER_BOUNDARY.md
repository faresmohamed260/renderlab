# Provider adapter boundary — design and decision record

**Decision:** adopt a typed, server-only operation and adapter contract, initially **unwired**. **Status:** design accepted for additive implementation only (no new production routing). **Date:** 2026-11-23. **Authority:** [Product Charter](../PRODUCT_CHARTER.md), [P0 baseline](BACKEND_PROFESSIONAL_BASELINE_P0_CONTRACT.md), [Unit 4 state-machine specification](P0_04_GENERATION_STATE_MACHINE_SPEC.md), [backend overview](BACKEND_ARCHITECTURE_OVERVIEW.md). This is an incremental P1 extensibility seam, **not** approval to ship a new capability.

## Problem, evidence and constraints

The [Phase 3 same-rubric reassessment](../audits/PHASE3_P0_POST_CAS_GATE_REASSESSMENT_2026-11-23.md) still scores extensibility **2/5**: the only enabled provider is FIBO image; generation request, worker routing and orchestration couple model, image assumptions and lifecycle. In today's code, [`generation.ts`](../../src/lib/capabilities/generation.ts) mixes legacy image/video model inventories and operation definitions; [`generation-contract.ts`](../../src/lib/api/generation-contract.ts) validates FIBO-centric requests; [`worker-fleet.ts`](../../src/server/generation/worker-fleet.ts) configures FIBO-specific endpoints/auth; and [`native-generation.ts`](../../src/server/generation/native-generation.ts) mixes workflow selection, FIBO payloads, dispatch, provider poll, failure classification, R2 persistence and DB transitions. The current [technical claims](../TECHNICAL_CLAIMS.md) remain unchanged.

A new adapter is an **internal** programmatic seam, *not* a newly offered model, public API, durable schema, automatic failover mechanism or source of authority for account/owner access. Existing current-beta routes and functions must remain byte-for-byte behavior-equivalent. This decision does not expand the P0 state model.

## Typed `MediaOperation` envelope

Operation discriminants are user intent, **not** ComfyUI workflow IDs, provider model keys, asset extensions or public API operation strings. This proposal defines:

- `MediaKind = "image" | "video" | "audio"`; source records contain an opaque owner-scoped `{kind, source: {type: "temporary-source" | "media-asset", id}, role}`, never client-trusted URLs or bytes. A separate optional `mask` is an image source, not a generic reference.
- `MediaOperation` is a discriminated union with `kind`, `inputs`, `parameters`, `output`. Common `requestId` is a stable dispatch/idempotency identity **assigned by the application**, not invented by an adapter. Model/provider selection is a server policy decision independent of the operation.
- Parameters are typed per operation with bounded values. They have no requirement to equal the current API parser's fields. Adapter-specific tuning can live in a namespaced validated profile after policy review, never in unvalidated caller-supplied JSON. `output.kind` is required; an operation may yield multiple typed outputs in future, but existing indexing remains one job/output index.
- Every result must carry provenance metadata: internal provider ID and model/version (not user-supplied), operation kind, ordered source IDs/roles including optional mask, effective parameters or their safe redacted digest, dispatch attempt/idempotency token, provider handle, output MIME/kind and index, creation/completion timestamp, and correlation/job identifiers. Server-side settlement is responsible for persisting/verifying authoritative provenance. Do not leak prompts, media URLs, tokens or other owners' IDs into logs/client errors.

| Operation (`kind`) | Required typed inputs | Parameters (examples; future validation) | Output kind(s) | Provenance additional to common record |
| --- | --- | --- | --- | --- |
| `text-to-image` | None | `prompt`, aspect ratio; optional seed, steps | image | Prompt/config digest, model+version, seed/effective aspect |
| `image-edit` | One primary image; optional reference image(s); **optional separate mask** | Instruction/prompt, optional seed/aspect; mask use explicitly flagged | image | Ordered sources and mask source+usage, effective edit/model settings |
| `image-to-image-upscale` | Exactly one primary image | Scale/target dimensions and quality profile | image | Input image ID, dimensions and scale |
| `image-to-image-background-remove` | Exactly one primary image | Transparent background/profile | image (alpha-capable MIME) | Input ID, alpha/policy setting, resulting MIME |
| `face-swap` | **Two distinct** images: target and source face | Approved face-selection/policy configuration (future safety gate) | image | Both role-labeled inputs, model/version, consent/safety decision reference when qualified |
| `text-to-video` / `image-to-video` | Text-to-video: none; image-to-video: one first-frame image | Prompt, duration, frame rate, aspect, resolution, optional soundtrack | video, optionally separate audio only if provider declares it | First-frame source if any; duration/FPS and video/audio stream metadata |
| `text-to-audio` | None | Prompt or text, duration/voice/output encoding | audio | Voice/model/version, effective duration and codec |

The table is a **typing pressure test**, not newly enabled routes. More complex operations (e.g. multi-reference video) extend this union by an explicit variant and capability requirements, not by an untyped escape hatch.

## Adapter contract and separation of responsibility

Proposed internal `ProviderAdapter` interface under `src/server/generation/adapters/`:

```ts
interface ProviderAdapter {
  readonly id: string;
  capabilities(): readonly OperationCapability[]; // operation, permitted media inputs, output kinds, bounds, mask, cancellation
  availability(): ProviderAvailability; // enabled/disabled + sanitized reason, no config/secret disclosure
  validate(operation: MediaOperation): ValidationResult; // pure, exact role/count/media/output contract
  hints(operation: MediaOperation): { timeoutMs: number; estimatedCost?: CostHint };
  submit(ctx: AdapterCallContext, operation: MediaOperation): Promise<SubmitOutcome>;
  poll(ctx: AdapterCallContext, handle: ProviderHandle): Promise<PollOutcome>;
  cancel(ctx: AdapterCallContext, handle: ProviderHandle): Promise<CancelOutcome>;
  mapError(error: unknown): AdapterError; // known typed error code + safe message + retry disposition
}
```

`AdapterCallContext` is **server-created** with verified owner/job identity, stable attempt key and bounded request deadline; provider handles are opaque and never owner authority. Each operation is validated against **both** the discriminated union and the chosen adapter's capability declaration; an unavailable adapter or undeclared operation fails closed. Selecting an adapter must not enable a capability by itself: a separate policy/catalog allowlist and qualified rollout gate control whether a request is actually accepted. Report disabled/unavailable capabilities as disabled, not as silently routed to FIBO.

The submit outcome distinguishes **accepted** (stable provider call handle), **unconfirmed/ambiguous send** (do not automatically duplicate) and **rejected**. Poll returns pending, ready with typed media outputs/provenance, or a classified failure; cancel returns confirmed, not-running or retryable/unconfirmed. `mapError` normalizes errors into existing categories: invalid input → `invalid_request`; unsupported/disabled → `generation_disabled`; unavailable/timeout → `generation_backend_unavailable` or an existing provider-stalled job error according to settlement policy; submission rejection → `generation_submission_failed`; provider failure → `generation_failed`; explicit FIBO process exit → `generation_failed` with current process-exit signal. Errors must not invent new public API codes or imply a provider fault is an owner authorization decision. Owner access, admission and rate-limit errors remain **application owned**; never map provider payloads to `generation_access_denied` or `generation_active_limit_reached`.

`hints` are bounded operational planning inputs, **not** a cost quote or permission to spend; the server enforces approved budgets, deadlines and max attempts. Timeout and retry defaults must preserve today's existing FIBO values until a separately qualified migration; cancellation support must be declared truthfully.

### Durable lifecycle stays outside adapters

```text
owner authorization + request validation + admission reservation
    -> durable job + dispatch-outbox accept (same existing DB contract)
    -> explicit adapter selection *after rollout permission* (future, not yet wired)
    -> submit with one durable attempt identity; ambiguous sends remain unresolved
    -> claim-serialized reconcile / provider poll / optional cancellation
    -> app verifies bytes and MIME, persists deterministic R2 object + indexed asset
    -> guarded state update and idempotent admission release
```

Adapters do **not** write `generation_jobs`, outbox, admission or `media_assets`, assign owner IDs, generate new attempt keys on retry, decide release/settlement, or make unscoped DB/R2 calls. They return only provider observations for the **existing** orchestration to consume. The [Unit 4 eight states](P0_04_GENERATION_STATE_MACHINE_SPEC.md) stay **queued, preparing, running, cancelling, persisting, succeeded, failed, cancelled**, with exactly the documented legal transitions and no new terminal states. Outbox state remains separate. Preserve status CAS, provider ambiguity, cancellation claims and owner-return reconciliation. The known **non-atomic** terminalize/release gap is neither hidden nor solved by an adapter. No new schema columns or migration are implied by adding TypeScript types.

### Transitional FIBO facade (additive implementation)

Because the current `submitNativeGeneration` *already accepts a durable dispatch*, `pollNativeGeneration` *already performs persistence/DB settlement*, and `requestGenerationCancellation` *already owns claims/settlement*, a FIBO adapter that delegates to them is a **legacy application-lifecycle facade**, **not yet** a pure provider-only adapter. It must be **unwired**, with explicit adapter dependencies injectable in tests; no production path should call it. It can prove selection, capability checks and delegating behavior without creating double job admissions/dispatch or bypassing owner/claim checks. A later migration will extract provider-only transports before plugging a provider adapter into the live durable lifecycle.

## P1-02 provider-only port integration (backend-only)

The provider-only FIBO port in `src/server/generation/adapters/fibo-provider-port.ts`
is deliberately distinct from the **unwired** legacy `createFiboAdapter` facade.
The legacy facade's `submit` calls the entire application lifecycle and therefore
**must never be wired** into an application submission path.

The approved provider-only integration performs only payload preparation for
the already-durable outbox, signed FIBO status observation/failure translation,
and a single signed cancellation DELETE. It does **not** send a provider submit
from the application: the durable dispatch outbox and existing worker dispatcher
remain the one authorized submission path. No secondary attempt key or provider
call can be generated by adapter selection. Existing application modules retain
the owner/session check, admission reservation, one durable job/outbox acceptance,
reconciliation/cancellation claims, optional masked source verification, status-CAS,
R2/media persistence and 0031 atomic terminalization/reservation release.

For retired/historical workers, existing direct status and cancellation handling
remains unchanged. The test-only fake second adapter remains registered only in
offline conformance, never in production policy. No additional model, capability,
provider fallback, API response or schema is enabled. This source integration is
**not proof of deployment**; Worker 1 owns the separately authorized release and
production evidence. Exact-head tests and CI for the staged implementation are
recorded in PRs #626 (provider-only port), #627 (payload and status), and #630
(cancellation wiring). PR #627 was merged into its former stacked base, so #630
replays those reviewed payload/status changes onto protected main as well.

## Planned migration, incremental and gated (NOT part of this task)

1. **Now, docs PR:** accept this operation/interface decision with no new routing, schema or API behavior.
2. **Now, additive implementation PR:** typed operation and validation, default-disabled registry, test-only fake second utility adapter, FIBO legacy facade delegating existing functions with injected test doubles, deterministic conformance tests. No existing route imports the registry. No production provider calls in tests.
3. **Later, separately authorized:** extract FIBO payload/transport, worker auth/poll/error decoding from `native-generation.ts` and `worker-fleet.ts` behind a pure provider-level FIBO implementation; preserve same durable attempt/handle, status behavior and sanitized errors. Side-by-side shadow conformance first; never dual-submit.
4. **Later:** shift validated `generation.ts` capability inventory and `generation-contract.ts` parsing (owned by the API contract workstream) to explicit, versioned operation conversion at the server boundary, then adapt `submit-generation.ts`, `reconcile-generation.ts`, `cancel-generation.ts` to use a gated adapter registry. Keep authorization, admission, outbox and settlement application owned.
5. **Later:** independent schema/provenance review if richer output/inputs cannot fit existing records, provider safety/ownership review, offline+hosted tests, explicit cost/deploy authorization, release runbook and production claims updates **before** new-model enablement.

### Responsibility target

| Current file | Current coupling | Future destination / retained responsibility |
| --- | --- | --- |
| `src/lib/capabilities/generation.ts` | UI-facing mixed models, media kinds, operations | Curated exposed capability model; server-only adapter operation definitions remain separate |
| `src/lib/api/generation-contract.ts` | FIBO image parser and historical operations | Versioned public contract + explicit conversion, **only in worker 2 / later approved work** |
| `src/server/generation/worker-fleet.ts` | FIBO endpoint/auth and worker selection | Provider configuration/transport in FIBO adapter; fleet policy stays server-side |
| `src/server/generation/native-generation.ts` | FIBO payload, provider I/O, state transitions, R2 | Provider-specific I/O behind adapter; owner-safe durable settlement and persistence in orchestrator |
| `src/server/generation/submit-generation.ts` | Admission and FIBO branching | Retains admission; eventually selects qualified adapter after durable acceptance |
| `src/server/generation/reconcile-generation.ts`, `cancel-generation.ts` | Provider calls intertwined with claims | Retain claims, conditional transitions, settlement; delegate only provider observation/cancel |
| `src/server/media/media-assets.ts` | Image/video persistence assumptions | App-owned verified output persistence; future audio MIME/kind after schema review |

## Verification and exclusions

**Additive implementation acceptance:** both FIBO and test-only second adapter pass a shared offline deterministic conformance suite for declared capabilities, strict input/role/kind/mask rules, successful submit/poll/cancel delegates, mapped errors, stable synthetic clock/attempt and disabled operations. An injected registry test proves selecting a second provider needs no modification to FIBO code. No network, cloud, real generation or runtime call site may be exercised. Use Unit 5's fake-clock/test-double discipline.

**Out of scope:** new UI, new models/providers in production, new routes, API/schema edits, SQL migrations, workflow changes, production/deploy/config/secrets/provider operations, R2/Modal calls, billing, feature toggles, changes to existing job transitions, owner-return settlement behavior or claims. Preserve the existing one-live-FIBO truth until separate acceptance and release. Exact-head required CI/CodeQL and docs governance remain mandatory; neither docs nor unwired code is a release.
