# ENT-004 — Request-boundary and upload-admission hardening contract

Date: 2026-10-05
Status: execution contract

## Goal
Close the next highest-risk application-security gaps after ENT-001 through ENT-003 by bounding signed upload-ticket abuse and rejecting explicit cross-origin browser mutations, without changing RenderLab product UX, generation routing, durable media semantics, or deployment state.

## Verified starting state

- Baseline repository head: `1fb8e45b42589c2df40c98b1262e74113a5d23b1`.
- Current enterprise score: **8.2/10** after ENT-003.
- Persistent Library/Create upload tickets are issued through `POST /api/media/uploads/upload-tickets`; temporary reference tickets remain available through `POST /api/assets/reference/upload-tickets` for compatibility/integration flows.
- Both upload families require an authenticated RenderLab account and issue 300-second direct-to-R2 PUT URLs.
- Persistent upload bytes are bounded to 25 MB and ENT-001 validates completed PNG/JPEG/WebP objects server-side before promotion.
- Pending persistent upload rows (`media_upload_sessions`) and temporary reference rows (`generation_sources`) are server-owned, owner-scoped, and eventually cleaned by Phase 15 maintenance, but ticket creation currently has no per-account concurrency cap or rolling issuance limit.
- Ticket creation is not race-safe against parallel abuse because no shared upload-admission reservation exists.
- The repository currently contains 29 API route files with state-changing handlers (`POST`, `PUT`, `PATCH`, or `DELETE`). Two are server-secret internal routes (`/api/internal/generation/reconcile`, `/api/internal/maintenance`); the remaining browser-facing mutation routes have no centralized `Origin` / `Sec-Fetch-Site` defense.
- Root `proxy.ts` and `src/lib/supabase/proxy.ts` own Supabase auth-cookie refresh only and must not become product authorization or mutation-policy middleware.
- Current CLI/CI verification frequently authenticates application requests with Bearer tokens and sends neither browser fetch metadata nor an `Origin` header. Internal maintenance/reconciliation use dedicated server-secret Bearer authentication.
- `docs/architecture/FRONTEND_ARCHITECTURE.md` has a stale scaffold-version note (`Next.js 16.3.3`, `sharp 0.34.3`) while current verified dependencies are Next.js 16.3.8 and Sharp 0.35.4.

## User value

RenderLab will place a hard, race-safe bound on signed-upload/staging resource consumption per account and prevent modern browsers from using an authenticated session to execute explicit cross-origin state changes. Legitimate same-origin product flows and non-browser authenticated automation remain compatible.

## In scope

### 1. Atomic shared upload-ticket admission

Add a service-role-only upload-admission reservation model, implemented through a new additive Supabase migration and server module.

The admission boundary is shared across both persistent media tickets and temporary reference tickets so an account cannot bypass limits by alternating endpoints.

Default policy for this phase:

- maximum **8** unresolved/provisional upload admissions per account across both ticket families;
- maximum **30** granted upload admissions per rolling **60 minutes** per account;
- provisional reservations expire after **10 minutes** if the request crashes before a staging row is bound.

Rationale: the current product uses single-file upload interactions and at most a small number of Create references at once. Eight concurrent slots provide substantial legitimate burst headroom while bounding signed-object/staging amplification; thirty hourly grants allow repeated creative iteration while limiting abuse to a finite account-scoped envelope.

The database admission function must:

1. serialize same-owner requests with a transaction-scoped PostgreSQL advisory lock derived from `owner_id`;
2. expire/release stale unbound provisional reservations before counting;
3. count pending `media_upload_sessions`, pending `generation_sources`, and live unbound reservations as the shared unresolved-admission total;
4. reject admission when that total is already 8;
5. count immutable admission history from the previous 60 minutes and reject the 31st grant;
6. insert an admission reservation only after all checks pass;
7. retain recent admission timestamps even when a ticket is completed, failed, released, or its staged resource is later deleted, so delete/complete cycles cannot erase the rolling rate history;
8. prune sufficiently old owner-scoped reservation history during admission so the table does not grow without bound for active accounts.

The schema must be server-owned: RLS enabled; no `anon` or `authenticated` table/function access; only `service_role` may execute the admission RPCs or mutate reservation rows.

### 2. Reservation bind/release lifecycle

Both ticket creation services must reserve admission before creating a staging row.

- After a persistent upload session or reference source is created, bind the reservation to that staging resource and end the provisional slot; the actual pending row then owns unresolved-cap accounting.
- If row creation, R2 signing, or any pre-response preparation fails, release the provisional reservation.
- Persistent-upload signing failure must continue marking its staging row failed.
- Reference-upload signing failure must be tightened to mark the created source failed (and perform any existing safe object cleanup when applicable) instead of leaving an avoidable pending row until maintenance.
- A crash between row creation and reservation bind may temporarily double-count one account slot; this conservative state must self-heal when the provisional lease expires and must never create an unbounded lockout.

### 3. Stable API failure contracts

Extend both upload API contracts with explicit account-scoped 429 failures:

- `upload_active_limit_reached` — too many unresolved/provisional uploads;
- `upload_rate_limit_reached` — rolling ticket grant limit reached.

Do not expose internal reservation IDs, storage keys, database errors, provider details, or rate-history rows to the browser.

Existing authentication, file type, compressed-byte, decoded-image, ownership, and storage-backend failure semantics remain intact.

### 4. Centralized same-origin mutation defense

Add one reusable server request-boundary helper for browser-facing state-changing API handlers. Do **not** move this policy into the root Supabase proxy.

For `POST`, `PUT`, `PATCH`, and `DELETE` browser-facing routes:

- if `Sec-Fetch-Site` is present, only `same-origin` is accepted; `same-site`, `cross-site`, and other explicit non-origin values are rejected;
- if `Origin` is present, its normalized origin must exactly equal one of the server-observed destination origins derived from the request URL and destination host/protocol metadata; this accounts for reverse-proxy/Next.js URL normalization without accepting an arbitrary origin;
- if both headers are absent, allow the request to proceed so verified non-browser Bearer/CLI/CI/server-to-server callers remain compatible;
- explicit cross-origin rejection must occur before application mutation logic;
- return a stable 403 JSON error such as `cross_origin_request_blocked` without leaking request-header details.

The helper is defense-in-depth for authenticated browser mutations; it does not replace authentication, authorization, MFA, owner scoping, or server-secret checks.

### 5. Route coverage and explicit exemptions

Apply the helper to every browser-facing state-changing API route currently in the repository, including account, admin, upload, generation, media, collection, and other owner/admin mutation endpoints.

The two current server-secret internal routes are exempt:

- `/api/internal/generation/reconcile`;
- `/api/internal/maintenance`.

Any future exemption must be explicit in source with a concrete reason and must be recognized by repository verification. A static verifier must fail if a browser-facing mutation handler is added without the shared guard or an approved explicit exemption.

### 6. Verification

Add unit/static tests for the origin guard covering at least:

- matching `Origin` accepted;
- mismatched `Origin` rejected;
- `Sec-Fetch-Site: same-origin` accepted;
- `same-site` and `cross-site` rejected;
- no fetch metadata accepted for non-browser compatibility;
- guard result is stable and does not echo sensitive headers.

Add configured integration coverage for upload admission covering at least:

- same-account parallel ticket race cannot exceed the 8-slot unresolved cap;
- Library and reference ticket families share the same cap and hourly history;
- completion/failure/release frees unresolved capacity without erasing hourly admission history;
- 31st rolling-hour grant is denied after 30 admitted tickets;
- stale provisional leases do not permanently block an account;
- one account's limits do not affect another account;
- signed-out/foreign ownership behavior remains unchanged;
- signing/preparation failure releases provisional capacity and reference signing failure does not leave a permanent pending row;
- run-owned database/Auth/R2 fixtures are cleaned exactly.

Configured browser/API verification must also prove an authenticated cross-site mutation is rejected before state changes, while existing Bearer-based exact-head integration requests without browser metadata continue to work.

### 7. Documentation accuracy

Correct the stale dependency versions in `docs/architecture/FRONTEND_ARCHITECTURE.md` to the verified current Next.js 16.3.8 / Sharp 0.35.4 baseline.

After verified implementation, update `docs/STATUS.md`, `docs/architecture/INFRASTRUCTURE.md`, `docs/architecture/PRODUCT_CAPABILITIES.md`, and the authoritative enterprise assessment only where the implemented security/data contract belongs.

## Shared Supabase migration boundary

A new **additive, backward-compatible** RenderLab migration is authorized because transactional admission cannot be implemented safely in process memory or with non-atomic route checks.

- Do not modify or repurpose legacy Saga/Studio tables.
- Do not weaken existing RLS or browser privilege revocations.
- Do not destructively rewrite existing RenderLab upload/source rows.
- The migration may add the RenderLab-owned reservation table, indexes, checks, and service-role-only RPCs required by this contract.
- Applying the migration to the already-approved shared RenderLab Supabase project is permitted only after source review/static validation and only as required for configured integration verification.
- The migration must remain backward-compatible with the currently deployed older application source: merely applying it must not alter existing production request behavior until the new application source is separately deployed.
- Verification fixtures may create only clearly run-owned rows/users/objects and must clean them.

No replacement Supabase project is authorized.

## Explicitly out of scope

- Production/Vercel deployment or production alias changes.
- R2 bucket/resource configuration changes.
- Provider/worker/model routing changes.
- Generation admission policy changes.
- New user-facing quota/settings UI or admin quota controls.
- Retained-storage quotas or billing/plan enforcement.
- CAPTCHA/device fingerprinting/IP reputation services.
- Broad `server-only` module-boundary expansion.
- Cross-platform EOL/Windows command-shim normalization.
- Coverage gates, durable observability backend, alerting, DR/runbooks, CI consolidation, large-module decomposition, or CSS/UI refactors.
- Changing root `proxy.ts` from its current auth-cookie refresh responsibility.

Those remain separate follow-on work.

## Architecture and security constraints

- Authentication/authorization must continue using fresh Supabase user validation and existing account/admin/MFA rules.
- Upload admission is account-scoped and server authoritative. Browser state cannot choose or override limits.
- Admission checks must be race-safe across concurrent Next.js instances/processes; no in-memory limiter can be the authoritative control.
- The same-origin guard must not treat Bearer authentication as inherently browser-originated and must not break existing server-secret internal routes.
- Existing ENT-001 media validation and ENT-002 CI/supply-chain controls remain unchanged.
- Error responses must fail closed without exposing service-role/database/R2 details.
- No production deployment is authorized.

## Validation matrix

Before implementation closure:

- migration/schema static review and privilege verification;
- `npm run lint`;
- `npm run typecheck`;
- `npm run test:unit`;
- `npm run build`;
- `npm run verify:engineering-quality` in a supported Linux environment if Windows command-shim behavior remains unresolved;
- targeted request-boundary/unit tests;
- exact-head Engineering Quality;
- exact-head CodeQL JavaScript/TypeScript;
- exact-head Persistent Media Upload Integration;
- exact-head Reference Upload Integration;
- exact-head Account Ownership;
- exact-head Generation Admission and account/admin lifecycle workflows affected by mutation guarding;
- exact-head Maintenance Integration if reservation lifecycle/cleanup interacts with Phase 15;
- exact-head Release Candidate Matrix when the repository trigger/qualification policy requires it;
- merged-main Engineering Quality and CodeQL after implementation merge.

Static repository verification must prove every state-changing browser-facing route is guarded or explicitly exempted with an approved reason.

## Exit criteria

ENT-004 is complete only when:

1. upload ticket issuance across persistent and temporary-reference flows is governed by one race-safe per-account admission boundary;
2. the 8 unresolved/provisional and 30/hour defaults are enforced transactionally and verified under parallel requests;
3. failures/crashes cannot permanently consume capacity and completion/deletion cannot erase rolling rate history;
4. browser-facing mutations reject explicit non-same-origin requests through one shared helper;
5. non-browser Bearer/CLI/CI and server-secret internal integrations retain their verified behavior;
6. route-coverage verification prevents silent guard regression;
7. the additive Supabase migration and all run-owned fixtures are verified/clean;
8. relevant exact-head and merged-main checks pass;
9. authoritative documentation reflects verified reality; and
10. no deployment or unrelated refactor occurred.

After closure, rerun the enterprise scorecard conservatively and choose the next phase from the remaining weakest areas rather than expanding ENT-004 retroactively.
