
## Phase 16 Post-Merge Closure — 2026-09-05
PR #99 squash-merged Phase 16 to `main` as `ad3cf2a987b60098fdc361a7f8fc358ae706aeae` from exact final PR head `2352f150e0528f2ba3396afc46ccab80aec4e05e`.

The final PR head passed the complete 26-workflow affected matrix. Library Lifecycle encountered one transient network `ECONNRESET`/fetch timeout after healthy build/start behavior; exact fixture cleanup completed and the unchanged rerun passed, so no product change was made to manufacture a green result.

Merged-main push validation then passed all nine workflows attached to exact merge SHA `ad3cf2a987b60098fdc361a7f8fc358ae706aeae`: Activity Cancel Visual `33967198561`, Generation Integration `33967198351`, Video Generation Integration `33967198358`, Reference Upload Integration `33967198361`, UI Shell Validation `33967198395`, Generation Reconciliation `33967198451`, Generation Cancellation `33967198513`, Maintenance Integration `33967198402`, and Creative Iteration `33967198317`.

Phase 16 remains `COMPLETE / VERIFIED / MERGED`. Its final rendered evidence remains artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`), with the accepted Result-primary/source-context comparison treatment and no corrective implementation change required.

No production application rollout, reconciliation/maintenance scheduler activation, `pg_cron`/`pg_net` enablement, schema change or provider-routing change followed the Phase 16 merge. Production remains the separately accepted Closed-Beta deployment recorded above. Phase 17 contract expansion is the next repository phase.

---

# Phase 17 Execution Contract — Observability & Engineering Quality
**Status: `CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.**  
**UI decision:** UI-057.  
**Planning baseline:** merged `main` `ad3cf2a987b60098fdc361a7f8fc358ae706aeae`.

## Goal / user value
Make RenderLab easier to operate and safer to change without turning observability into another product surface or replacing the high-fidelity configured gates that already protect real account/media/generation behavior.

Phase 17 should provide two complementary improvements:
1. engineers get cheap deterministic feedback for conventional code defects before expensive build/browser/live-provider verification; and
2. a fresh-authorized RenderLab admin can understand lifecycle health, failure/failover pressure, capacity and cleanup backlog from bounded privacy-safe aggregates instead of inspecting raw tables/provider traces by hand.

The phase does **not** promise SLAs, provider cost accounting, deterministic render timing or exhaustive distributed tracing.

## Verified starting state — 2026-09-05
1. **Phase 16 is merged and green on `main`.** PR #99 landed as `ad3cf2a...`; all nine merge-triggered workflows succeeded after the final 26-workflow PR matrix.
2. **TypeScript is already strict but not exposed as a cheap script.** `tsconfig.json` has `strict: true` and `noEmit: true`; `package.json` currently has no `typecheck` script.
3. **There is no conventional lint or focused unit-test script.** Current package scripts are development/build/start, `verify:ui-purity` and Playwright UI verification. UI Shell currently runs UI purity, full Next production build, Chromium install/start and Playwright.
4. **Admin Health already exists as the correct operator surface.** Fresh-active-admin bootstrap returns a bounded 24-hour aggregate with `activeJobs`, status counts, operation counts and sanitized failure codes. It does not expose prompts, media contents, provider/worker IDs or raw provider messages.
5. **Lifecycle/maintenance already expose useful structured seams.** `generation_jobs` owns durable status/timestamps/sanitized error/failover state; admission reservations own bounded capacity state; Phase 15 maintenance already returns bounded source/upload/purge summaries. Phase 17 should derive visibility from those contracts before inventing another event store.
6. **Production is intentionally behind repository capability.** Phase 14–16 repository changes are not implicitly deployed and no production reconciliation/maintenance scheduler is active. Phase 17 implementation/merge must preserve that boundary.
7. **No telemetry vendor is currently required by evidence.** Existing platform/server logs plus durable RenderLab aggregates are enough to start. Sentry, OpenTelemetry, Vercel-native additions or another service require an explicit demonstrated gap, privacy review and cost/fit justification rather than adoption for its own sake.

## Required invariants
- **Observability is observational.** Logging/metrics failure must never become a generation, cancellation, maintenance, upload or account correctness dependency.
- **Product truth remains authoritative.** Admin metrics summarize persisted/current product state; they do not fabricate percentages, queue positions, cost, autoscaling capacity or SLA claims.
- **Privacy is deny-by-default.** Diagnostics must not record prompts/negative prompts, media bytes/content/display names, account email, Auth/session tokens or cookies, signed URLs, R2 keys, service/provider credentials, raw request bodies, or raw provider error bodies.
- **Opaque correlation is not authorization.** Correlation/job IDs may connect internal events, but never grant access and never replace owner/fresh-admin checks.
- **Cheap checks supplement high-fidelity gates.** Lint/typecheck/unit feedback must not replace configured Playwright, shared-resource, reconciliation/cancellation/maintenance or live Image/Video integration when those paths are affected.
- **No new operations product.** Ordinary users continue to see product-level state/errors only. Operator observability extends existing fresh-admin Health rather than creating a provider console or new top-level destination.

## 17A — Cheap conventional engineering feedback
Add conventional package-level scripts with these stable purposes:
- `npm run lint` — maintained repository linting for relevant TypeScript/TSX/JavaScript/config sources;
- `npm run typecheck` — TypeScript checking with no emit against the current Next/TS configuration;
- `npm run test:unit` — deterministic focused tests for pure contracts with no network, shared Supabase/R2, browser or provider requirement.

Implementation may choose the lightest maintained Node-compatible lint/test runner after verifying compatibility with the repository's current Next.js/TypeScript/ESM setup. This contract does not require Jest, Vitest or another brand merely for convention.

Focused unit coverage should target pure/high-risk contracts first: generation request/capability normalization and bounded compatibility helpers; recipe/retry reconstruction rules where isolatable without service calls; sanitized/typed error classification; lifecycle timing/backlog aggregation helpers introduced by this phase; and structured diagnostic event redaction/normalization/correlation behavior.

Add one cheap GitHub engineering-quality gate/workflow so these checks can fail without first installing Chromium or invoking shared cloud/provider fixtures. `verify:ui-purity` remains authoritative for visible primitive policy and may be included in the cheap gate when efficient.

## 17B — Structured server diagnostics and correlation
Introduce one small server-owned diagnostic boundary rather than scattered ad-hoc log payloads. Events use a typed/bounded envelope: event name/level, timestamp, opaque correlation ID, optional opaque RenderLab job ID, product operation/lifecycle phase/status where relevant, typed diagnostic/error code and non-negative duration/count/attempt scalars when meaningful.

Do not add an unrestricted details bag that encourages raw request/provider dumping. Any event-specific fields must be explicit bounded scalars/enums and pass the same redaction policy.

Instrument the highest-value lifecycle boundaries rather than every function call: generation admission/submission outcome; reconciliation claim/provider-ready/failover/finalization outcome; cancellation intent/provider acknowledgement/local terminalization outcome; bounded maintenance pass/category failures; and durable result finalization boundaries where correlation materially helps incident reconstruction.

Correlation IDs are generated/trusted server-side and propagated through internal lifecycle work where useful. A browser-supplied identifier is never trusted for authorization or used to override server correlation state.

## 17C — Privileged Admin Health expansion
Extend the existing `/admin` **Health** section and its fresh-admin server contract; do not add another route or ordinary shell navigation item.

The v0.1 operator view remains bounded and aggregate. From current durable state, expose truthful snapshots/rolling-window summaries where derivable without scanning unbounded history:
- lifecycle outcomes by status/operation and current active state;
- completion timing aggregates or clearly labelled timing bands from persisted timestamps, with sample counts and no SLA language;
- sanitized failure-code counts;
- failover incidence/counts from persisted failover history without worker/provider identity;
- cancellation/cancelling counts where useful;
- stale-active age buckets aligned with existing lifecycle bounds rather than an invented ETA;
- admission/capacity snapshot from current active jobs/reservations and configured limits, without claiming provider autoscaling capacity;
- maintenance backlog for stale/unreferenced/cleaning sources, stale/cleaning uploads and tombstoned pending media purges.

Keep the existing dense/conventional Admin visual language. Prefer compact stat/table composition over a new dashboard framework. If visible Health composition changes, configured Admin verification captures desktop+narrow states and human review confirms readability/no sensitive-data leakage.

The Admin payload remains aggregate and excludes prompts, media content/names, account email/owner identity, R2 identity, provider job IDs, worker IDs, workflow IDs, raw failover payloads and raw provider messages.

## 17D — Typed error classification over text matching
Where current gateway/worker contracts provide stable machine-readable failure categories, normalize them into typed internal diagnostic codes at the adapter boundary and carry only sanitized product codes into user/Admin contracts.

Textual/raw-message classification may remain a compatibility fallback for provider responses that do not yet expose a stable code. Do not break a working gateway or invent a provider code solely to eliminate every string match in one phase.

Any gateway contract change preserves existing product error privacy and is proven by affected Image/Video/reconciliation/cancellation regressions. Provider-specific details stay server-internal and are not added to ordinary Activity/Create/Admin payloads.

## 17E — Telemetry/tooling decision boundary
Start with the repository's existing server/platform logging and database-derived bounded aggregates. Evaluate external telemetry only after structured event/Admin Health implementation demonstrates a concrete unanswered need such as retention/search/cross-request correlation that current tooling cannot satisfy reasonably.

Adopting Sentry, OpenTelemetry, a Vercel observability add-on or another vendor requires a specific gap, current plan/cost/retention fit, server/client collection boundary, explicit redaction fields, secret/config ownership and non-blocking failure behavior. No vendor adoption, client analytics/RUM or persistent event-store schema is a Phase 17 exit requirement.

## Explicitly out of scope
- New top-level Observability/Operations/Workers/Models/Workflows route.
- Ordinary-user provider, worker, queue, failover, cleanup or infrastructure controls.
- Client product analytics, marketing pixels, session replay, prompt/content analytics or behavioral profiling.
- Logging prompts, uploaded/generated media content or names, account email, Auth/session material, signed URLs/R2 keys, credentials or raw provider bodies.
- Billing/credits/provider-cost ledger, GPU utilization claims, exact autoscaling capacity, render-time SLA/ETA or cost promises.
- A generic audit/event-sourcing platform or new durable telemetry table without an audited need and contract amendment.
- Replacing existing Playwright/shared-resource/live-provider gates with unit tests.
- Phase 18 creative capability work, Variations, Director, LoRA/model adapter, Upscale/Restore or Inpaint/Outpaint implementation.
- Production application deployment, production reconciliation/maintenance scheduling, `pg_cron`/`pg_net` activation or unrelated infrastructure mutation.
- UI-054 BIMI/mailbox-avatar implementation or unrelated Auth/email work.

## Architecture / data boundaries
- Existing `generation_jobs`, `generation_admission_reservations`, staging/upload/media tombstone state and Phase 15 maintenance predicates are the first source for operator aggregates.
- Existing Admin fresh-auth/fresh-role boundary remains authoritative. Extend the existing admin contract/service/RPC or use equally bounded server queries; do not grant browsers raw table access.
- A small server observability/diagnostic module may centralize event normalization/redaction/correlation. It stays server-only.
- No schema migration is pre-approved. First prove required v0.1 aggregates from existing timestamps/status/error/failover/reservation/staging fields. If a required metric cannot be derived truthfully and durable new state is genuinely necessary, stop and amend this contract before DDL/event storage.
- Existing RLS/browser-grant revocation and `SECURITY DEFINER` empty-search-path/service-role-only posture remains intact for any changed privileged function.

## Security / privacy implications
Verification explicitly proves diagnostic redaction. Tests seed sentinel prompt/email/storage/provider-error strings and assert they are absent from structured events and Admin responses while expected typed codes/counts remain present.

Logs may use opaque internal job/correlation identity for incident stitching, but account identity is omitted by default. If implementation proves an owner identifier is required for a specific server-only incident use case, it must be explicitly bounded/hashed or separately justified; it does not enter the Admin aggregate contract.

No correlation, telemetry or Admin aggregation endpoint becomes a public data-enumeration surface. Fresh-admin authorization remains required before privileged health reads.

## Required validation matrix
### Cheap quality gate
- lint passes on exact head and its selected config/fixture regression proves violations fail;
- typecheck runs without emit and its selected regression proves type errors fail;
- unit tests run with no network/secrets/browser and cover selected pure contracts;
- the cheap gate does not install Chromium or invoke live providers/shared production fixtures.

### Structured diagnostics
- correlation stays stable across one representative submit/reconcile/finalize lifecycle where propagated;
- separate operations receive distinct correlation IDs;
- typed event names/codes/status/durations are bounded/machine-readable;
- diagnostic emission failure is non-fatal to product correctness;
- seeded prompt/email/signed-URL/R2-key/token/raw-provider sentinels never appear in emitted event payloads.

### Admin Health
Use exact run-owned admin/member/job/reservation/staging/media fixtures and prove signed-out/member/non-admin fail-closed behavior; exact status/operation/failure/failover/timing/stale/capacity/backlog aggregates; no mutation of unrelated history; absence of prohibited identity/content/provider/storage fields; desktop+narrow readability if UI changes; and exact Auth/Supabase/R2/singleton cleanup.

### Lifecycle/provider regressions
Audit path filters and run every affected workflow, expected to include Engineering Quality, Account/Admin Operations, UI Shell when package/config/UI changes, Generation Reconciliation, Generation Cancellation, Maintenance Integration, Generation Admission, Activity when shared job/error serialization changes, and Image/Video Generation when lifecycle adapters/error classification are touched.

Live provider spend is not required merely for logging/Admin aggregation. Existing configured Image/Video live cases become required when provider adapter/error-classification code is changed, and exact cleanup remains mandatory.

## Documentation outputs
On verified implementation, update `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md`, `docs/architecture/FRONTEND_ARCHITECTURE.md` if the server diagnostic/Admin boundary materially changes, `docs/architecture/INFRASTRUCTURE.md` for logging/telemetry/runtime/privileged-function reality, `docs/ui/SCREEN_REGISTRY.md` for actual Admin Health behavior, `COMPONENT_CATALOG.md` only for a real new Admin composition/mechanic, and `PRODUCT_CAPABILITIES.md` only if product-visible generation/error semantics change.

## Exit criteria
Phase 17 is `COMPLETE / VERIFIED` only when:
- conventional `lint`, `typecheck` and focused `test:unit` scripts provide cheap deterministic feedback and an exact-head GitHub quality gate is green;
- structured server diagnostics/correlation cover accepted lifecycle boundaries with explicit redaction and non-fatal emission;
- fresh-admin Health exposes truthful bounded lifecycle timing/failure/failover/capacity/stale/backlog visibility without sensitive product/provider/storage data;
- typed error classification improves adapters that have stable machine-readable evidence while safe compatibility fallbacks remain where needed;
- no telemetry vendor/event-store/schema is introduced without required evidence/contract amendment;
- affected exact-head configured regressions and required Admin desktop/narrow human review pass;
- exact run-owned fixtures clean and existing RLS/grant/privileged-function/singleton invariants remain intact;
- authoritative docs match implementation reality;
- no production deployment or scheduler activation is inferred from implementation/merge.

Only after Phase 17 is `COMPLETE / VERIFIED` should Phase 18 be expanded into an execution-ready Next Creative Capability contract from a fresh deployed-worker audit.
