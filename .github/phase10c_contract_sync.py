from pathlib import Path

project = Path("PROJECT.md")
text = project.read_text()
text = text.replace(
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–9, Phase 10A Account Recovery & Closed-Beta Admission, and Phase 10B Privileged Admin & Access Control are complete and exact-head verified under UI-051. Phase 10C Atomic Generation Admission Guardrails is the next implementation slice but has not started. No deployment is authorized.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–9 plus Phase 10A and 10B are complete and exact-head verified under UI-051. The execution-ready Phase 10C Atomic Generation Admission Guardrails contract is now approved for implementation; implementation has not started. No deployment is authorized.**",
)
text = text.replace(
    "10C generation guardrails is next but unstarted; 10D hardening remains unimplemented.",
    "10C generation guardrails now has an execution-ready contract approved for implementation but no implementation/schema migration has started; 10D hardening remains unimplemented.",
)
text = text.replace(
    "Phase 10C is the next slice and has not started.",
    "Phase 10C has an approved execution-ready contract and is the next implementation slice; implementation has not started.",
)
project.write_text(text)

migration = Path("docs/ui/UI_MIGRATION.md")
text = migration.read_text()
old = """#### Slice 10C — Atomic Generation Admission Guardrails
- Centralize admission inside the shared generation submission boundary so Create and Activity Retry cannot bypass it.
- Order: parse/current capability validation → owner/input preflight → transactional admission reservation → native/external submit → bind/release reservation based on submission result.
- Effective settings resolve global defaults plus nullable account overrides. `status=suspended`, missing access, global/account generation disabled, active-limit reached and rolling-hour-limit reached all stop before backend/provider network work.
- Product responses are stable/sanitized: access denial `403`, generation disabled `503`, and rate/concurrency limits `429` with user-understandable messages and no provider detail.
- Same-owner reservation creation is serialized transactionally in Postgres. A non-bound reservation expires conservatively if the process dies; immediate submission failure releases concurrency while the admitted dispatch still counts against the rolling-hour abuse window.
"""
new = """#### Slice 10C — Atomic Generation Admission Guardrails — EXECUTION CONTRACT

##### Goal and user value
Give the closed beta a race-safe server-owned spend/abuse boundary without turning generation into a billing system. Create and Activity Retry must obey the same clear availability rules, admins must be able to pause generation or tune typed defaults/known-account overrides, and denied requests must stop before any provider/worker request can spend money or leak backend detail.

##### Verified starting state — merged `main` `0d3ae4ce5e13e9f634e2ac0991f745fc3a3229a5`
- Phase 10A/10B is merged and verified. `0010` / `0011` are applied; `renderlab_account_access` already owns active/suspended state plus nullable `generation_enabled`, `max_active_jobs` (`1..4`) and `max_jobs_per_hour` (`1..120`) overrides.
- `renderlab_beta_settings` and `generation_admission_reservations` do not exist in GitHub or the shared project. No `0012` exists yet.
- `POST /api/generation/jobs` parses the current product request, resolves a verified identity/account and calls shared `submitGeneration(ownerId, request)`. `submitGeneration` performs owner/input preflight, then chooses the authenticated external backend or native orchestration.
- Activity Retry reconstructs only a failed owner-owned historical request, current-revalidates product intent/inputs, then calls the same `submitGeneration`; the historical row remains immutable.
- Native submission creates an owner-scoped `generation_jobs` row before its first worker request. External submission returns the same UUID-shaped RenderLab job contract. Polling owns later provider status/failover for the already-admitted job and is not a new user dispatch.
- Current product routes collapse most submission failures to `502/503`; admission-specific `403/429` contracts do not exist yet.
- Production closed-beta access enforcement remains off and no deployment is authorized. 10C implementation therefore must not be deployed until a later explicitly authorized rollout has the required known-account bootstrap.

##### Accepted architecture and ordering
1. Keep one admission service inside shared `submitGeneration`. Create and Retry may not implement parallel count/check logic.
2. Preserve existing request/capability validation and owner/input preflight before reserving, so malformed or unavailable-input attempts do not consume the rolling-hour window.
3. Immediately after preflight, reserve admission transactionally in Postgres **before any native/external backend or provider network request**.
4. Reservation resolves one effective policy from the singleton global defaults plus the current account row: account nullable override wins, otherwise global value. Defaults are `generationEnabled=true`, `maxActiveJobs=1`, `maxJobsPerHour=12`; account limit overrides remain bounded to `1..4` and `1..120`.
5. Missing access or `status=suspended` denies admission even if the wider closed-beta route-enforcement flag is off. Generation routes must distinguish a missing authentication identity (`401`) from an authenticated identity denied by RenderLab admission (`403`); do not reuse an access-filtered helper in a way that turns suspension into `401`.
6. Same-owner reserve attempts serialize by locking the owner access row before policy/count evaluation. Admission also reads/locks the singleton settings row so a concurrent global admin change cannot race a reservation. Existing account-admin mutations already lock the target access row and therefore serialize with admission overrides/status changes.
7. A reservation is the concurrency slot. Every unreleased, unexpired reservation for the owner counts toward the active limit. Successful submission binds the reservation to the returned RenderLab job UUID. Immediate submission failure releases the concurrency slot but leaves the reservation row/admission timestamp intact so the admitted attempt still counts against the rolling 60-minute limit.
8. Terminal job observation (`succeeded|failed|cancelled`) releases the bound reservation through the shared poll path. Poll-time worker failover/reassignment is continuation of the same admitted job and must not create a second reservation or increment the hourly count.
9. An unbound reservation expires after a bounded conservative TTL if the process dies between reserve and bind/release. Bound reservations are normally released on terminal poll and retain a conservative safety expiry so a permanently unobserved completion cannot lock the account forever. Expiry is a safety valve, not a second rate-limit window.
10. If backend dispatch succeeds but reservation binding cannot be confirmed, never resubmit the provider request. Preserve the successful job response and leave the original reservation conservatively occupying its slot until release/expiry; this fails closed on spend rather than risking duplicate generation.
11. `GET /api/generation/jobs` remains a backend/capability signal, not an account-admission oracle. Admission is enforced on Create submission and Retry submission only; polling an existing owner job does not consume new admission.

##### Planned additive `0012` data boundary
- `renderlab_beta_settings`: exactly one server-owned typed row with `generation_enabled boolean not null default true`, `max_active_jobs integer not null default 1 check 1..4`, `max_jobs_per_hour integer not null default 12 check 1..120`, nullable `updated_by` canonical Auth UUID, and `updated_at`. No JSON feature-flag bag.
- `generation_admission_reservations`: server-owned UUID identity, `owner_id`, immutable `admitted_at`, bounded `expires_at`, nullable resulting RenderLab `job_id`, nullable `released_at`, and only the minimal typed state needed to distinguish active/bound/released admission. It stores no prompt, media, workflow, provider, worker, credential or billing/credit data.
- Index for owner + recent admission supports the rolling-hour count; an owner + unreleased/expiry index supports active-slot checks; a partial job lookup supports terminal release. Old released/expired rows may be pruned only outside the rolling-hour accounting window.
- Both tables follow the existing server-owned public-schema pattern: RLS enabled, all `anon`/`authenticated` grants revoked, service-role access only.
- Transactional admission/bind/release and global-settings mutation routines must be SECURITY DEFINER only where required, use `set search_path=''` with schema-qualified relations, revoke execute from `public`/`anon`/`authenticated`, and grant only `service_role`. No browser role receives raw table/function access.
- `renderlab_beta_settings` is initialized by migration to the accepted safe defaults. Applying `0012` does not by itself deploy the 10C application runtime or enable production closed-beta route enforcement.

##### Product/API contract
- Extend the shared generation error contract with stable sanitized product codes for: `generation_access_denied` (`403`), `generation_disabled` (`503`), `generation_active_limit_reached` (`429`), and `generation_rate_limit_reached` (`429`). Existing validation/auth/backend failures keep their current meanings.
- Create keeps the current composer/results hierarchy and existing Alert feedback. A denied request preserves the draft and shows only the product message; no provider/limit-internal identifiers are exposed.
- Activity Retry keeps the current failed-row action/busy/result composition. Admission-specific errors must survive Retry mapping instead of being collapsed into generic `generation_submission_failed`; the historical failed row remains unchanged.
- Add fresh-active-admin-only `GET|PATCH /api/admin/settings`. The settings payload is exactly `{ generationEnabled, maxActiveJobs, maxJobsPerHour, updatedAt }`; PATCH writes all three typed values atomically after bounds validation. No arbitrary feature flags/provider controls are accepted.
- Extend the existing Admin **Generation controls** section with one compact global-default editor above the existing per-account overrides. Do not add a fourth Admin section, new route, shell destination, client-global admin store, provider selector or redesign. Maintained Field/Input/NativeSelect/Button/Spinner/Alert mechanics remain sufficient.
- Admin account overrides stay nullable and mean “inherit global”. Global defaults are never nullable.

##### Validation and remote-development contract
- Add a configured **Generation Admission** verifier/workflow rather than relying on compilation. It must use exact run-owned accounts/jobs/reservations and a local mock owner-aware generation backend so admission tests spend **zero real provider generation** and can assert backend request counts.
- Verify signed-out `401`; missing/suspended access `403`; global disabled and per-account disabled `503`; default one-active limit and account active-limit override; default 12-admitted rolling-hour limit and account hourly override; expiry/release behavior; immediate-failure release with hourly count preserved; successful bind; terminal-poll release; and malformed/unavailable-input attempts not consuming admission.
- Prove same-owner race safety with concurrent reserve/Create attempts: at default active limit exactly one may cross the backend boundary and the competing request must receive `429`. Also prove Create and Activity Retry cannot bypass one another by occupying the slot/hour window through one surface and denying the other before mock-backend dispatch.
- Extend Account/Admin Operations coverage for fresh-admin global settings GET/PATCH, invalid bounds, global controls rendering and exact restoration of the singleton settings baseline. The verifier must never enumerate shared Auth users.
- Workflows that can exercise real shared generation admission while the global singleton is temporarily changed must share one GitHub concurrency group with the Generation Admission verifier. Audit the actual affected workflows during implementation; do not allow a global-disabled test window to race live Generation/Video verification.
- Static/scope gate precedes any shared-project migration: `git diff --check`, `npm run verify:ui-purity`, TypeScript, production build, verifier syntax, exact changed-file audit and an explicit guard rejecting 10D/deployment scope.
- Only after that gate may the exact reviewed `0012` be applied. Immediately audit migration history, defaults/checks/indexes, RLS, grants, function ACL/search paths, advisors and exact fixture/baseline restoration.
- Exact implementation head must pass every path-triggered workflow, with special attention to Generation Admission, Account/Admin Operations, Activity, Create Lifecycle, Account Identity, Account Ownership, UI Shell, Generation Integration and Video Generation Integration.
- Human-review the real Admin global-controls desktop/narrow screenshots plus representative Create and Activity admission-error states. Compilation/DOM assertions are not visual approval.

##### Explicitly out of Phase 10C
- Billing, credits, purchases, usage ledger, refunds or quota monetization.
- Generic roles/permissions, arbitrary feature flags, provider/worker/workflow controls, model routing or ComfyUI settings in Admin.
- Cancel, cancellation-safe worker termination, job priority/queue editing, prompt/media/provider exposure or global client job state.
- 10D auth/session hardening, leaked-password remediation, broad audit/observability work or production access bootstrap.
- Any Create/Library/Activity redesign, new shell destination, deployment, or enabling production closed-beta enforcement.

##### Exit criteria and handoff
10C is complete only after the contract above is implemented, the reviewed `0012` is applied/audited, all exact-head affected workflows pass, Admin/Create/Activity screenshots are human-reviewed, global settings and run-owned account/job/reservation/Auth fixtures are exactly restored/cleaned, repository docs record real evidence, and the PR merges with merged-`main` regressions green. Only then may 10D Auth/Operational Hardening be expanded/executed; no deployment is implied.
"""
if old not in text:
    raise SystemExit("10C placeholder block not found")
migration.write_text(text.replace(old, new))

frontend = Path("docs/architecture/FRONTEND_ARCHITECTURE.md")
text = frontend.read_text()
old = """Generation admission becomes part of the shared `submitGeneration` server boundary. After current request/input validation but before native/external network work, a service-role-only transactional reservation resolves global/account `generationEnabled`, one-active-job default and 12-admitted-jobs/rolling-hour default (bounded account overrides: active 1–4, hourly 1–120). Same-owner reservation checks serialize in Postgres. Create and Retry therefore cannot bypass one another. Immediate dispatch failure releases concurrency while preserving the rolling-hour admission count; unbound/crashed reservations expire conservatively. These are abuse/spend guardrails, not billing credits.
"""
new = """Generation admission becomes part of the shared `submitGeneration` server boundary. After current request/input validation but before native/external network work, a service-role-only transactional reservation resolves global/account `generationEnabled`, one-active-job default and 12-admitted-jobs/rolling-hour default (bounded account overrides: active 1–4, hourly 1–120). Same-owner reserve attempts serialize by locking the account access row, while admission also coordinates with the singleton global-settings row so account/global admin mutations cannot race policy evaluation. Create and Retry therefore cannot bypass one another.

`generation_admission_reservations` is the temporary concurrency authority: an unreleased/unexpired reservation occupies a slot before backend dispatch; successful submission binds the reservation to the returned RenderLab job UUID; terminal status observed through the existing poll boundary releases the slot. Immediate submission failure releases concurrency but the immutable admission timestamp still counts in the rolling-hour abuse window. Poll-time failover is continuation of the same admitted job and never reserves again. Crashed/unbound work expires conservatively, and bound work has a safety expiry so missing terminal observation cannot create a permanent lock. These are abuse/spend guardrails, not billing credits.

10C adds typed singleton `renderlab_beta_settings` plus fresh-admin-only `GET|PATCH /api/admin/settings`; the existing Admin Generation controls section shows global defaults above nullable per-account overrides. Generation routes keep `401` for no verified identity, while the admission layer owns authenticated RenderLab access denial (`403`), generation-disabled (`503`) and active/hour limits (`429`). `GET /api/generation/jobs` remains a backend capability signal rather than an admission oracle. No provider controls, generic flags or global client admin/job store are introduced.
"""
if old not in text:
    raise SystemExit("frontend 10C paragraph not found")
frontend.write_text(text.replace(old, new))

infra = Path("docs/architecture/INFRASTRUCTURE.md")
text = infra.read_text()
marker = "### Account identity boundary — UI-029\n"
block = """### Phase 10C generation-admission contract — approved / unimplemented
UI-051 now has an execution-ready 10C contract. The next additive migration is expected to be `0012_renderlab_generation_admission.sql`, introducing only typed singleton `renderlab_beta_settings` and server-only `generation_admission_reservations` plus the minimum service-role-only transactional routines for reserve/bind/release and fresh-admin global-settings mutation. Defaults are generation enabled, one active reservation/account and twelve admitted reservations per rolling hour; existing account overrides remain 1–4 active and 1–120/hour. Same-owner reservation checks must serialize before any backend/provider request. Both tables remain RLS-enabled/browser-revoked and privileged routines use empty search paths with no public/anon/authenticated execute. The migration must not be applied until the implementation branch passes its pre-migration static/scope gate. Production access enforcement remains off and no deployment is authorized.

"""
if marker not in text:
    raise SystemExit("infrastructure insertion marker not found")
if block not in text:
    text = text.replace(marker, block + marker)
infra.write_text(text)
