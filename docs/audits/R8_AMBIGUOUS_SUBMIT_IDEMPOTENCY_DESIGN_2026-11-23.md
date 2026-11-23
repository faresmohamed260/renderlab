# R8 — Ambiguous generation acceptance and request-level idempotency (design only)

**Status:** DESIGN PROPOSAL / NOT IMPLEMENTED · 2026-11-23 · Owner: backend engineering. No database migration, OpenAPI change, runtime behavior, provider invocation or deployment is authorized by this design. The active FIBO beta remains non-idempotent at the HTTP request level.

## Observed failure (source references)

1. `submitGeneration()` reserves admission in `src/server/generation/submit-generation.ts`, then calls `submitNativeGeneration()`. A falsy submission result unconditionally releases that reservation. The success path separately binds the reservation to the returned job.
2. `acceptDurableDispatch()` in `src/server/generation/native-generation.ts` generates a **new** `p_attempt_id: randomUUID()` for every invocation of `rpc/renderlab_accept_generation_dispatch`. The migration `0030_modal_generation_dispatch_outbox.sql` atomically inserts a job and durable outbox attempt, but it is not a request-idempotent RPC.
3. A database transaction can commit the job/outbox while the HTTP/PostgREST response is lost. The app catches the error as `generation_submission_failed`, releases its still-unbound reservation, and the user/client can retry with a new attempt UUID, creating a second job. This is a **different ambiguity** from the already-handled Modal `spawn` lost-response case. Existing per-attempt dispatch deduplication cannot recover the original HTTP submission key.
4. `src/lib/api/generation-api-source.ts` explicitly describes no `Idempotency-Key` guarantee, including distinct Retry and Run Again requests. Its `api/openapi.v1.json` output is **generated**; editing that JSON directly is invalid.

### Required invariants

- **One owner + one intent key + one normalized request = at most one accepted job/outbox + one admission grant.** Concurrent identical POSTs return the *same* job ID; request replays must not consume another quota grant, create a new dispatch attempt or extend the attempt admission deadline.
- The same owner's key reused with different normalized request is a **409 conflict**, not a silent replay. Another owner's identical key has no visibility into the first account's job.
- An uncertain accept response is **not proof of rejection**. Never release its reservation until a server-only authoritative lookup proves no job could have committed and no acceptance remains in flight. Otherwise hold and reconcile through the original key/attempt. Any stale lease follows existing conservative admission policy.
- An HTTP response replay must not trigger a fresh Modal wake when the same outbox is already accepted; the existing dispatcher may naturally pick up the recorded attempt. Provider execution is **not promised exactly once**; this is a database acceptance/identity guarantee only.
- Terminal settlement, cancellation and 0031 atomic terminalize/release keep their current independent constraints. The request idempotency record must outlive ambiguous in-flight work and the maximum client replay horizon.

## Proposed SQL and ownership contract (future additive migration, separately reviewed)

1. Add `renderlab_generation_request_keys` (or equivalent durable acceptance registry) with `owner_id uuid not null`, `request_key` as a bounded opaque identifier, `normalized_request_digest`, `job_id uuid` unique nullable until accepted, `attempt_id uuid` unique, `reservation_id uuid` nullable, `state` (accepting/accepted/definitively-rejected), `created_at`, `updated_at`, `replay_retain_until`. Unique `(owner_id, request_key)`; foreign keys and RLS enabled; revoke `anon`/`authenticated` table and RPC access. Restrict lookup/accept to `service_role`, with explicit `owner_id` predicates and `SECURITY DEFINER SET search_path=''` schema-qualified SQL. The key is server-unpredictable (UUIDv4 or strong random 128-bit minimum), validated as bounded ASCII, never logged or exposed in diagnostics. Do not store a prompt, source media or secret in this table. A canonical digest must include the complete *normalized* request, exact model/operation and resolved source identities. The digest is **not a secret** and must not be used for authentication.
2. Prefer one additive `renderlab_accept_generation_dispatch_idempotent(..., p_owner_id, p_request_key, p_request_digest)` transaction. It serializes on the owner/key unique index, enforces account eligibility and generation-admission capacity, then reserves **and binds** admission and inserts job/outbox and immutable acceptance mapping in the same database transaction. Existing current RPC remains available for old application/rollback version. A same-key/same-digest replay returns the original job and reservation identity *without* a second admission grant; mismatch returns a typed conflict; rejected transaction cannot leave a partial accepted job. Avoid `ON CONFLICT DO NOTHING` without a fresh locked read because it can turn a concurrent accepted operation into a false rejection.
3. Add service-only owner-key lookup `renderlab_lookup_generation_request_acceptance(p_owner_id,p_request_key,p_request_digest)`, returning a constrained `accepted(job_id, attempt_id, reservation_id)`, `not_found`, `in_flight` or `conflict` result. A `not_found` response is safe to act on **only** if the transactional serialization/locking contract excludes a still-in-flight uncommitted accept for that key; otherwise classify as `in_flight`. Return no cross-owner material. Bind the original `attempt_id` to the durable outbox; never invent a replacement during reconciliation.
4. Maintain an expiry policy separate from short-lived dispatch-outbox cleanup: retain identity at least through all unresolved, queued, running, persisting, reconciliation and rollback intervals, plus a **documented client replay window** (propose 30 days after terminalization). Retire only terminal, unreferenced keys after expiry in an explicit least-privilege cleanup; never delete while still unresolved, or while an old/new app mix could replay the key. Audit indexing/storage growth before selecting final TTL.

**Compatibility fallback if an atomic admission+accept RPC is not feasible:** first persist a durable owner/key → reservation/attempt binding **before** dispatch; require lookup-before-release and a conflict-safe unique key on accept. Still treat uncertain lookup/accept as unresolved, never retry with a fresh attempt. This is a higher-risk two-transaction design because partial states, leases and repair workers must be proven in PostgreSQL; do not ship merely an app-side retry map.

## App state machine and failure handling (future unit)

`POST (owner, normalized request, stable client key)` → validate owner/input/entitlement → atomic idempotent SQL accept:

- **Committed, first submit:** 202 with original job; single admission grant; schedule existing outbox wake.
- **Committed, replay:** 202 with **same** job ID/attempt and immutable deadline; do not consume admission or dispatch a second provider call.
- **Same key, different digest:** 409 `generation_idempotency_conflict`; no information about another owner.
- **Definite pre-transaction validation/admission denial:** keep existing 400/403/429/503 semantics; no job/reservation created.
- **Timeout, disconnect or unknown RPC outcome:** look up same owner/key. Accepted → return/reconcile original job; serialized definitive absence → retry **same key and same attempt**; in-flight/unverifiable or lookup failure → return sanitized `generation_acceptance_unconfirmed` (proposed 503 with Retry-After) and **retain admission hold** until an authoritative resolution. Never release on network uncertainty. Do not convert a transient PostgREST error into a newly allocated attempt.
- **Crash after acceptance before response/bind/wake:** committed transaction already bound reservation; replay recovers by owner/key and the scheduled dispatcher sees the same outbox.
- **HTTP client disconnect/reconnect:** client persists the key only for that *one* intended submission; explicit new Create, Run Again and Retry use different keys. Browser retry should not create a new key when recovering an uncertain response.

## HTTP / generated OpenAPI 3.1 contract (future, not edited by this PR)

- Add a bounded, documented `Idempotency-Key` request header to `POST /api/generation/jobs` in `src/app/api/generation/jobs/route.ts` and its canonical `src/lib/api/generation-api-source.ts`. V1 compatibility choice: accept the header **optionally** for existing clients; only header-bearing requests gain a guarantee and explicit absent-key legacy semantics remain until a separately approved API-version change. A later version may require the header.
- Document scoped key lifetime and uniqueness; add 409 `generation_idempotency_conflict` and an explicit sanitized uncertain-accept response (e.g. `generation_acceptance_unconfirmed`, 503 + optional `Retry-After`). Preserve the existing 202 `GenerationSuccess` body and stable job resource URL; optional `Idempotent-Replayed` response header is informational only. Do not reveal key/digest or owner identity in headers, error bodies or logs.
- Update the **canonical** `generation-api-source.ts` request/response/error metadata, `idempotency.request` descriptor and documentation; regenerate `api/openapi.v1.json` with its existing generator, update executable parsing/contract-drift tests and 1,128-case differential verification. Do **not** hand-edit the generated OpenAPI file. Decide how Retry/Run Again receive independent intent keys in a separate reviewed contract; never silently pretend they share Create POST guarantees.

## Deterministic acceptance matrix before any runtime switch

| Case | Expected result |
| --- | --- |
| Concurrent same-owner/same-key/same-payload (two SQL sessions and 20-process app replay) | One accepted job/outbox and reservation; both 202s identify same job |
| Reused key with changed prompt, source, model or operation | Sanitized 409, no new job |
| Identical key under different authenticated owners | Independently scoped rows; cross-owner lookup denied |
| Commit succeeds, PostgREST response dropped | Lookup finds original accepted job; admission retained and bound |
| Timeout while original accept transaction holds lock | Concurrent retry waits/returns in-flight; no duplicate or premature release |
| SQL exception rolls back before commit | No job/outbox/admission; exact key can retry safely |
| Process dies after accepted commit but before HTTP 202/wake | Replay returns same row; scheduled dispatch resumes |
| Repeated replay after terminal 0031 settlement and during rollback-app version skew | Same historical job, no extra admission, no duplicate output |
| Expired key with unresolved/active job | Retention prevents deletion/reuse |
| Old client lacking key | Documented legacy behavior unchanged, no false exactly-once claim |
| Generated OpenAPI/parser/schema drift | CI rejects undocumented header/errors, no manual JSON edits |

**Rollout boundary:** additive SQL and new service-only grants first, then exact-head tested application caller, then worker-1-managed release under the runbook, with rollback of the app **without dropping** the additive table/RPC while in-flight callers/keys may exist. Requires separate owner/engineering sign-off, disposable PostgreSQL conformance and release qualification. No live provider test is approved here.
