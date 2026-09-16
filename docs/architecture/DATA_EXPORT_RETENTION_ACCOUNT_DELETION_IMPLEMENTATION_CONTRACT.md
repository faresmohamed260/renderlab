# Data Export, Retention & Account Deletion Implementation Contract

**Tracker:** #219  
**Parent roadmap:** #213 / `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`  
**Planning baseline:** `main` `e66fe3bfa93674d2a8ef2218b1efef5767a51df4`  
**Audit date:** 2026-09-15  
**Status:** IMPLEMENTED + VERIFIED — EXACT-HEAD ACCEPTANCE COMPLETE / PRODUCTION DEPLOYMENT NOT AUTHORIZED
**Scope:** truthful data-use/retention disclosure, account-data export, bounded durable-media export affordance, owner-wide deletion orchestration, active-job/upload quiescence, storage cleanup, fresh destructive-action authorization, residue verification and configured two-account acceptance  
**Out of scope:** #223 profile/avatar/username implementation, linked identities, new billing/commercial retention, a new queue vendor, paid Vercel/Supabase plan changes, arbitrary security-activity history, legal-policy drafting, production deployment

**Post-closure integration note — 2026-09-16:** #219 is production-live and #223 has now completed the required lifecycle registration. New account exports use schema version 2 and include safe profile/display/avatar metadata plus an authenticated avatar download path without exposing R2 identity. The deterministic profile-avatar key participates in owner storage purge/proof even if profile metadata is stale; `renderlab_account_profiles` participates in transactional finalization and database residue verification; `purge_pending` avatar cleanup participates in daily maintenance; and configured two-account acceptance proves deletion/non-interference. Exact #223 Account Data Lifecycle run `35062679557` passed on implementation-verification head `e49c0d366a9aafb0ff0194692c0b6d915fc480b3`. Historical statements below correctly describe the original #219 planning/closure baseline where no profile existed; this note records the now-realized additive registry extension.

## 1. Purpose

#219 gives RenderLab a real user-data lifecycle instead of a decorative Settings control. Export must describe the data RenderLab actually holds. Account deletion must remove user-owned creative/product state without weakening the existing ownership model, orphaning asynchronous work, or leaving reachable R2 objects behind.

The core ownership rule remains unchanged: RenderLab-owned product rows use the immutable Supabase Auth user ID as owner identity, and the existing `ON DELETE RESTRICT` foreign keys are an intentional integrity boundary. Account deletion therefore cannot begin with `auth.users` deletion and cannot solve the dependency graph by globally changing those foreign keys to `CASCADE`.

This contract freezes the retention, export and deletion policy before implementation. If provider behavior or the live schema contradicts a dependency recorded here, implementation must stop at that boundary and amend the contract rather than weakening the safety model ad hoc.

## 2. Verified starting state

### 2.1 Canonical identity and authorization

- Supabase `auth.users.id` is the immutable account identity and ownership principal.
- RenderLab admission/role state lives in `renderlab_account_access`; ordinary private product authorization requires active access, while Settings intentionally remains available to signed-in suspended users for security/recovery operations.
- #216 private authorization also requires the JWT `session_id` to remain present in the owner's live `auth.sessions`; revoked still-unexpired bearer tokens therefore fail private RenderLab authorization.
- #217 provides one-factor TOTP MFA, AAL2-aware authorization and a reusable **recent TOTP step-up** primitive: the latest provider-authenticated TOTP method must be within 10 minutes when a sensitive operation applies to an MFA-enrolled account.
- #218 secure sign-in-email change is complete and merged, and keeps `auth.users.id` unchanged.

### 2.2 Owner graph

The current live/repository model has six user-owned data classes represented by seven `ON DELETE RESTRICT` relations that must be resolved before the Auth identity can disappear:

1. `generation_jobs.owner_id`;
2. `generation_sources.owner_id`;
3. `media_assets.owner_id`;
4. `media_upload_sessions.owner_id`;
5. `media_collections.owner_id`;
6. `media_collection_items.owner_id`;
7. `generation_admission_reservations.owner_id`.

Additional user-linked state has different semantics:

- `renderlab_account_access.user_id` uses `ON DELETE CASCADE` and remains the live admission/role record until final identity deletion;
- claimed `renderlab_beta_invitations.claimed_user_id` uses `ON DELETE SET NULL`, but the invitation also contains the claimed email address and therefore needs explicit de-identification rather than relying on the FK alone;
- `renderlab_beta_settings.updated_by` uses `ON DELETE SET NULL`; it is global system state, not account-owned data;
- Auth sessions/factors/identities are Supabase-owned provider state and are removed with the Auth user through the supported Admin Auth boundary.

No durable RenderLab profile/avatar/username table exists at the planning baseline. #223 is independent. If #223 or any other user-linked schema lands before #219 closes, that state must be added to the export/deletion registry and configured acceptance before #219 may merge.

### 2.3 R2 object classes

Current user content can exist in R2 as:

- durable generated/uploaded media referenced by `media_assets.storage_key`;
- optional durable thumbnails/posters referenced by `media_assets.thumbnail_storage_key`;
- temporary generation/reference source objects referenced by `generation_sources.storage_key`;
- persistent upload-session objects referenced by `media_upload_sessions.storage_key` before/after promotion;
- deterministic generation output/thumbnail candidates that may have been written before their `media_assets` row was committed during finalization fault/race recovery.

Deletion must derive keys only from owner-scoped database state and deterministic owner-job candidates. It must not run an unbounded bucket-wide delete or guess another account's object keys.

### 2.4 Existing deletion and maintenance behavior

Media deletion today is intentionally two-stage:

1. mark an immutable `media_assets.deleted_at` tombstone, which removes collection/upload-session links and hides the asset from product reads;
2. physically delete the durable object/thumbnail from R2 and record `purged_at`.

Generation history may retain the opaque asset ID after ordinary media deletion. #219 account deletion is stronger: once the owner-wide lifecycle completes, the account's product rows themselves are removed after physical storage cleanup succeeds.

RenderLab already has an idempotent internal maintenance/reconciliation surface and a configured maintenance integration workflow, but `vercel.json` has no production cron at the planning baseline. The connected Vercel team is on Hobby. Current Vercel policy supports cron jobs on Hobby but limits schedule frequency to once per day. #219 may therefore add one daily recovery cron; it must not require a plan upgrade or a new queue service.

### 2.5 Presigned upload race

Both durable Library uploads and temporary reference uploads currently issue R2 presigned `PUT` URLs valid for **300 seconds**.

Those URLs cannot be revoked individually after issuance. Deleting only the database row is therefore insufficient: a client holding an already-issued upload URL could write/rewrite the object after a premature cleanup sweep.

Account deletion must include an upload **quiescence window**. The deletion request freezes new work immediately, waits until every pre-existing 300-second write ticket must have expired, then performs the final R2/object residue sweep before the Auth identity is removed. The initial implementation uses a six-minute minimum from the accepted deletion request (five-minute ticket lifetime plus one-minute clock/processing margin).

## 3. Binding data-retention policy

This is the initial RenderLab product retention policy implemented by #219. It is a technical/product contract, not legal advice or a claim of regulatory certification.

### 3.1 Auth identity and account access

While the account exists:

- canonical email/Auth identity, identities, sessions and MFA factors are held by Supabase Auth according to the hosted provider contract;
- RenderLab access/role/quota state remains until the account is deleted.

On completed account deletion:

- user-owned product state and R2 objects described below are removed first;
- the claimed beta invitation is de-identified as specified in section 8;
- the Supabase Auth identity is hard-deleted **last** through the supported service-role Admin Auth API;
- provider-owned sessions/factors/identities disappear with that Auth identity;
- the access row cascades with the Auth identity.

RenderLab does not retain a product-owned email/name tombstone after successful deletion in v0.1.

### 3.2 Generation jobs and prompts

`generation_jobs` contains prompts, inputs, model/workflow parameters, provider job IDs, operational failure metadata and output references.

Policy:

- jobs/history are retained while the account exists so Activity/history/retry/provenance work correctly;
- ordinary media deletion does not automatically erase job/prompt history;
- account deletion hard-deletes all owner jobs after active work is quiesced and all associated R2 output candidates are purged;
- no prompt body is retained in a new deletion/audit table.

### 3.3 Temporary generation sources

Temporary sources are retained only as required by the existing upload/generation lifecycle and maintenance policy. They are not durable Library media unless explicitly promoted through the durable-media path.

Account deletion removes every owner source row and its R2 object regardless of ordinary source-cleanup age/state.

### 3.4 Durable media, thumbnails and ordinary media tombstones

Active durable media bytes and thumbnails remain until the user deletes the asset or deletes the account.

For ordinary per-asset deletion:

- product visibility/reuse ends at tombstone time;
- physical R2 purge follows through the existing deletion/maintenance path;
- the tombstone metadata may remain while the account exists because generation history can retain the opaque asset relationship.

For account deletion:

- active and already-tombstoned rows are both included;
- all known primary/thumbnail objects must be physically absent before final identity deletion;
- media rows are then hard-deleted with the rest of owner product state.

### 3.5 Upload sessions, Collections/Favorites and admission reservations

These are user-owned product state and have no post-deletion retention exception.

- upload-session rows/objects are removed;
- Collection memberships and Collections are removed;
- Favorite state disappears with the media row;
- generation-admission reservations are removed after active jobs have been cancelled/settled.

### 3.6 Export artifacts

A successful account export is a private R2 artifact owned by the requesting account.

- logical download availability expires **24 hours** after completion;
- after logical expiry the application must refuse download even if physical cleanup has not yet run;
- the next daily maintenance pass physically removes expired artifacts and then removes or terminally marks their export rows;
- account deletion purges all export artifacts immediately as part of owner cleanup, regardless of their normal expiry;
- no export artifact is retained after successful account deletion.

### 3.7 Admission/invitation history

A claimed `renderlab_beta_invitations` row is system/admission history, but `normalized_email` remains directly identifying.

On account deletion, the claimed invitation is retained only in **de-identified** form:

- `claimed_user_id` is cleared;
- `normalized_email` is replaced with a non-routable random deletion marker that cannot be used to recover the old email address;
- `claimed_at`, role, invitation creation/expiry and revoked state may remain as non-identifying operational history.

The deletion marker must not be a plain hash of the email or user ID. The implementation should use a random UUID-based local part under an invalid/internal domain so the retained row cannot be used as a stable cross-system pseudonymous identifier.

Open/unclaimed invitations are not account-owned and are not changed by self-service account deletion.

### 3.8 Global system settings and future audit evidence

`renderlab_beta_settings` is global system state. Its `updated_by` reference is allowed to become `NULL`; the global values remain.

At the planning baseline, RenderLab has no populated product-owned user security/audit event store that #219 needs to retain. The shared `auth.audit_log_entries` database table has not been established as a complete product-visible source and is outside this product-owned deletion graph.

Future Admin/security audit records may require a legitimate retention/de-identification exception, but that exception does **not** exist merely because #219 mentions it. Any future user-linked audit schema must define its retention policy and join the lifecycle registry before it ships.

### 3.9 Aggregate operational metrics and provider records

Aggregate, genuinely non-identifying operational metrics may remain. They must not include prompts, media bytes, email, raw user ID or another field that can reasonably be joined back to the deleted account.

RenderLab cannot truthfully promise synchronous deletion of every internal log maintained by Supabase, Cloudflare, Vercel or Modal where those providers do not expose per-user deletion APIs to the application. The product disclosure must distinguish:

- RenderLab-controlled product rows and R2 objects, which #219 removes;
- provider/service logs and processor records, which are governed by the applicable provider retention/erasure contract.

No deletion-complete message may claim that third-party infrastructure logs were synchronously erased when RenderLab cannot prove that.

## 4. Data-use transparency contract

The Data & Privacy surface must explain current infrastructure reality in plain language.

### 4.1 What RenderLab stores

The disclosure must accurately cover:

- account/sign-in identity and access state;
- prompts, generation settings and job history;
- temporary reference uploads while needed by generation/cleanup;
- durable Library uploads/results and thumbnails until user/account deletion;
- Collections/Favorites and operational admission/reservation metadata;
- account-data export artifacts for their short download window.

### 4.2 Systems that process content

Current processing/storage disclosure must identify roles rather than expose secrets:

- **Supabase** — Auth plus RenderLab product metadata/database state;
- **Cloudflare R2** — object storage for uploaded/generated media, thumbnails, temporary sources and export artifacts;
- **Modal-operated compute** — generation/upscale workloads receive the content required to perform the requested operation;
- **Vercel** — hosts the RenderLab web application/API execution plane.

### 4.3 Training/product-improvement statement

RenderLab itself does **not** train models on user prompts/uploads/results in the current product architecture and must not display a fake “Do not train on my data” toggle.

Current Modal terms permit use of Customer Data as necessary to provide the service and distinguish aggregate de-identified service data from uploaded/submitted Customer Data. The product disclosure may summarize that provider role conservatively, but must link to the applicable public policy/terms rather than turning this implementation contract into a legal guarantee.

If RenderLab later adopts a model/API provider that trains on or optionally reuses user content, #219's disclosure and any opt-out surface must be amended before that provider is treated as equivalent.

## 5. Export product contract

### 5.1 User flow

Settings gains a Data & Privacy section with an **Export account data** action.

The request is asynchronous from the browser's perspective:

1. authenticated user requests an export;
2. server creates/returns the owner's current export request state;
3. a bounded processor attempts the export immediately;
4. if it cannot complete, the request remains durable and the daily maintenance recovery pass retries it;
5. Settings polls/reloads a small status endpoint; keeping the browser open is not required for eventual retry;
6. a ready export exposes an owner-authorized download action until `expires_at`.

Only one non-expired active/ready export per owner is required for v0.1. Repeated requests should be idempotent or explicitly replace an expired/failed request rather than creating unbounded artifacts.

### 5.2 Artifact format

v0.1 exports a versioned UTF-8 JSON artifact (optionally compressed for transport/storage if the implementation preserves a standard machine-readable content type/filename).

Top-level fields must include at least:

- `schemaVersion`;
- `generatedAt`;
- `account` — safe canonical identity/account timestamps and RenderLab access state;
- `generationJobs`;
- `generationSources` metadata;
- `mediaAssets` metadata/provenance/deletion state;
- `mediaUploadSessions` metadata;
- `collections` and memberships;
- `generationAdmissionReservations`;
- `sessions` — privacy-safe projection only;
- `mfa` — factor presence/type/status metadata only, never TOTP secret/challenge codes;
- `claimedInvitation` when one belongs to the account;
- `retentionAndProcessing` — versioned summary/links sufficient to interpret temporary vs durable data;
- `durableMediaManifest`.

Raw access/refresh tokens, password hashes, TOTP secrets, recovery markers, service keys, raw provider IP/user-agent internals and unrelated Admin/global records are forbidden.

### 5.3 Durable-media manifest instead of a huge ZIP

v0.1 does **not** build an unbounded serverless ZIP containing every image/video. That would duplicate large R2 objects through the web function and creates avoidable memory/runtime failure modes.

Instead, the export contains a media manifest for every active durable media asset with safe metadata plus its stable authenticated RenderLab download path. Existing owner-scoped media download behavior remains the byte-download mechanism.

This satisfies bounded media export without issuing durable public links or embedding short-lived signed R2 URLs into a long-lived JSON artifact.

Deleted/purged assets may appear as historical metadata when the row still exists but must not claim downloadable bytes.

### 5.4 Export completeness and bounds

The processor must page database reads instead of assuming one PostgREST response can represent an arbitrarily large account. The artifact is complete for the registered #219 data classes or the export fails explicitly; silent truncation is forbidden.

Export generation must have configured fixture coverage for multiple pages/boundaries even if the current beta accounts are small.

## 6. Export authorization

Export status/download is account-sensitive but not destructive.

- request/status/download endpoints require a freshly verified live RenderLab session and exact owner match;
- MFA-enrolled accounts must be at AAL2 to create or download the export;
- an AAL1 account with no enrolled factor may export without being forced to enroll MFA solely for this feature;
- export APIs never accept a user ID supplied as authority; owner ID comes from the authenticated server context;
- a suspended account may still use Data & Privacy export while its Auth identity exists, unless an account deletion is already in progress.

A ready artifact is served through an authenticated RenderLab endpoint that creates a short-lived signed R2 download URL only after the owner/status/expiry check.

## 7. Account-deletion authorization and confirmation

Deletion is irreversible once accepted.

### 7.1 Fresh reauthentication

The final delete request requires fresh password reauthentication for password-backed RenderLab accounts. Reauthentication freshness is bounded to 10 minutes and must be proven in the server-owned deletion flow; a browser boolean is not authority.

For an account with a verified TOTP factor, deletion also requires the existing #217 recent TOTP step-up primitive, which implies current AAL2 and a TOTP authentication method within 10 minutes.

This preserves #217's rule that MFA-enrolled sensitive account mutations require recent TOTP without forcing an ordinary member who never enrolled MFA to bootstrap MFA merely to delete their account.

An active Admin already requires a verified factor/AAL2, so Admin self-deletion necessarily requires both fresh password reauthentication and recent TOTP.

### 7.2 Explicit confirmation

The UI must enumerate consequences before acceptance:

- generation/activity history, prompts and references are deleted;
- Library media and uploads are deleted from RenderLab-controlled R2;
- Collections/Favorites/settings tied to the account are deleted;
- active work is cancelled or allowed to settle only as required for safe cleanup;
- export files are deleted;
- the account cannot be restored after final Auth deletion;
- provider/internal infrastructure logs may follow provider retention rather than instant application deletion.

A destructive confirmation dialog must use the approved alert-dialog primitive and must not rely on color alone.

A typed phrase may be used as an error-prevention affordance, but it is not authentication evidence and cannot replace fresh password/TOTP proof.

### 7.3 Last-active-admin safeguard

Self-service deletion must reject an active Admin when that account is the last active RenderLab Admin.

The last-admin check and initial deletion freeze must be atomic with respect to the authoritative access table so two Admins cannot concurrently delete themselves and leave zero active Admins.

This is a system-continuity guard, not a permanent ban: another active Admin can first be established through the existing Admin governance path, after which self-deletion may proceed.

## 8. Deletion state machine

### 8.1 New lifecycle control row

Implementation may add a server-only lifecycle table keyed by `auth.users.id`, for example `renderlab_account_lifecycle`, containing only control-plane state required to resume deletion safely.

Required conceptual fields:

- `user_id` primary key;
- `state` (`deleting`, terminal failure state only if useful for operator diagnosis; no reversible “soft deleted” product state);
- `requested_at`;
- `quiescence_until`;
- bounded retry/error metadata safe for server/operator use;
- `updated_at`.

The lifecycle row may use `ON DELETE CASCADE` because it is the deletion control record itself and should disappear with the Auth identity. This does not change the existing RESTRICT ownership rules for user product data.

### 8.2 Freeze new work

Acceptance performs an atomic server/database operation that:

1. validates the account/access row;
2. enforces the last-active-admin rule;
3. creates the deletion lifecycle row idempotently;
4. changes active RenderLab access to `suspended` so normal private/Admin gates stop new product work immediately;
5. records `quiescence_until >= requested_at + 6 minutes`.

Deletion is not cancellable in v0.1 after this point. The account may access only the minimum authenticated Settings/lifecycle status/sign-out surface required to understand progress until Auth deletion finishes.

### 8.3 Database-level insert guard

Application authorization alone is not sufficient because a request authorized just before the freeze can still be in flight.

#219 therefore requires a database-owned deletion guard that rejects **new owner product rows** for an owner whose lifecycle state is `deleting`.

The guard must cover every registered owner relation that can create new product state, including generation jobs/sources, durable media, upload sessions, Collections/memberships and generation reservations. It must be service-role-safe and must not depend on browser RLS.

Updates/deletes needed to cancel/clean existing state remain permitted. Late finalization attempts may fail closed rather than create new media after deletion begins.

### 8.4 Cancel/settle active jobs

The processor enumerates owner jobs in non-terminal states (`queued`, `preparing`, `running`, `persisting`) and reuses the existing generation cancellation/provider contract where possible.

Deletion must not delete the job row while the application still believes provider work can legitimately produce a result. It repeatedly cancels/reconciles until each owner job is terminal or the provider contract gives a safe terminal result.

A transient provider failure leaves deletion pending for retry; it does not skip directly to Auth deletion.

### 8.5 Wait out upload tickets

Before final storage cleanup, `now >= quiescence_until` must be true.

This protects against pre-existing 300-second presigned PUT URLs recreating or overwriting objects after cleanup. No new upload tickets can be issued after the freeze because normal account authorization and the database insert guard deny new work.

### 8.6 Build owner storage-key set

After quiescence and active-job settlement, build a de-duplicated set from:

- all owner `media_assets.storage_key` values;
- all owner non-null `media_assets.thumbnail_storage_key` values;
- all owner `generation_sources.storage_key` values;
- all owner `media_upload_sessions.storage_key` values;
- every deterministic generated-output candidate for every owner generation job that could have been written before media-row commit;
- deterministic generated thumbnail/poster candidates for those jobs;
- owner account-export artifact keys.

The deterministic candidate logic must share the canonical generation key derivation rather than reimplementing a subtly different filename algorithm in the deletion module.

### 8.7 Physical R2 cleanup and proof

Delete the full owner key set idempotently. Missing keys are success.

Before database product rows are removed, perform a bounded proof pass using `HEAD`/equivalent for every derived key and require each object to be absent. Any remaining object leaves deletion pending/retryable.

Do not list/delete the entire shared bucket. Cross-account safety is more important than convenience.

### 8.8 Database product cleanup

Once jobs are terminal and R2 absence is proven, remove owner product rows through one server-owned transactional database function/procedure so partial row deletion cannot strand a broken graph.

Required deletion order/behavior includes:

- collection memberships before/with Collections;
- upload sessions;
- media assets;
- generation sources;
- generation admission reservations;
- generation jobs;
- export rows/artifacts already confirmed absent;
- any future registered owner row introduced before #219 closure.

The transaction must also de-identify the claimed invitation as described in section 3.7.

`renderlab_account_access` and the lifecycle row remain until the Auth deletion step so authorization stays frozen and resumable if the provider call fails.

### 8.9 Final residue check

Before calling Supabase Admin Auth deletion, the processor must re-query every registered owner relation and require zero owner rows other than the intentionally retained access/lifecycle control rows.

It must also re-verify:

- no non-terminal owner job exists;
- no derived owner R2 key exists;
- claimed invitation no longer contains the deleted account email/user link;
- cross-account sentinel rows/objects are unchanged in configured acceptance.

### 8.10 Auth identity last

Only after all previous gates succeed may the server call the supported Supabase Admin `deleteUser(userId)` hard-delete path using the service-role client.

Direct SQL deletion from `auth.users`, `auth.sessions`, `auth.identities` or `auth.mfa_factors` is forbidden.

Auth deletion is expected to remove provider-owned identities/sessions/factors and cascade the RenderLab access/lifecycle control rows according to their FKs.

If the Admin Auth call fails transiently, deletion remains safely frozen and the recovery processor retries. The system must never reactivate the account automatically just because the final provider call failed.

## 9. Asynchronous execution and recovery

### 9.1 Immediate bounded processor

Deletion/export request routes may invoke the idempotent processor immediately to reduce latency, but the HTTP request is not the only completion mechanism.

The processor must be bounded so one request cannot monopolize the Vercel Hobby function limit. Work is resumable from database state.

### 9.2 Daily production recovery cron

#219 may extend the existing internal maintenance endpoint/engine and add a single Vercel cron in `vercel.json` that runs once daily, the supported Hobby cadence.

The cron is a recovery guarantee, not the only trigger. It retries:

- pending export creation/expiry cleanup;
- pending deletion after the upload quiescence window;
- transient provider/R2/Auth finalization failures.

The cron endpoint must use `CRON_SECRET`/equivalent server secret validation and must not be callable as an unauthenticated maintenance backdoor.

No Vercel plan upgrade, Vercel Queue, Supabase paid feature, external worker queue or new infrastructure vendor is part of #219.

## 10. Schema and server architecture

Implementation is expected to add, subject to exact migration review:

- an account lifecycle/deletion control table;
- an account export request table;
- database guard/finalizer functions/triggers needed for atomic freeze, insert denial, last-admin safety and transactional owner cleanup;
- indexes that make pending-work and owner lookup bounded;
- grants restricted to `service_role`/database owner, matching the current server-owned-table pattern.

Browser roles (`anon`, `authenticated`) must not receive direct table mutation access.

The service-role key remains server-only.

A central code registry/helper should define the #219 owner data classes and storage-key derivation so export, residue verification and deletion do not drift into three independent lists.

## 11. API contract

Exact route names may follow existing account route conventions, but v0.1 requires these capabilities:

### Export

- create/get current export request;
- poll export status;
- authenticated download redirect/stream for a ready unexpired export.

Stable error classes should distinguish at least:

- authentication/session invalid;
- MFA challenge required where enrolled;
- deletion already in progress;
- export not ready;
- export expired;
- backend temporarily unavailable.

### Deletion

- start deletion after explicit confirmation and fresh authorization;
- read current deletion status while Auth identity still exists.

Stable error classes should distinguish at least:

- fresh password reauthentication required/failed;
- MFA recent-step-up required;
- last active Admin;
- deletion already accepted;
- backend temporarily unavailable.

Do not return raw Supabase/R2/provider error bodies to the browser.

## 12. Settings UI contract

This is a capability addition, not a Settings redesign.

The existing approved Settings/Phase-27 trust-register composition remains the visual base.

Data & Privacy must provide:

- concise processing/retention explanation with a route/detail disclosure that can be kept current;
- Export account data status/action;
- clear note that durable media files are downloaded through the manifest's authenticated media links rather than one unbounded ZIP;
- Account deletion destructive action separated visually/semantically from ordinary controls;
- progress/pending state after deletion is accepted;
- truthful completion behavior: after final Auth deletion, the user becomes signed out because the identity no longer exists.

Desktop and 390px must remain usable. Keyboard, screen-reader, touch, focus and reduced-motion parity are required. Existing shared primitives must be used for visible controls.

## 13. Notification policy

A successful destructive deletion should attempt an account-deletion security/transactional notification **before** the final Auth identity is removed, while the canonical email still exists.

The implementation must use the already-approved RenderLab mail path/provider and record only delivery-safe operational status, not message bodies containing user data.

Notification failure must not permanently trap a user account in undeletable state. The configured acceptance test must establish the expected behavior and the user-facing copy must not claim delivery unless delivery was confirmed.

No new email provider migration is part of #219.

## 14. Configured validation matrix

#219 is not complete with unit tests alone. A configured workflow must use run-owned temporary identities/content and prove the real Supabase/R2 boundaries without touching production user data.

Minimum matrix:

### Export correctness

- create account A and account B fixtures;
- seed A with jobs/prompts/parameters, temporary source metadata/object, durable media + thumbnail, upload session, Collection/membership, Favorite and reservation state;
- seed B with sentinel rows/objects;
- request A export;
- prove export artifact becomes ready and is owner-only;
- prove JSON schema/version and all registered A data classes are present without secrets;
- prove durable media manifest points only to A authenticated media downloads;
- prove B cannot read A export/status/artifact;
- prove logical expiry denies download and maintenance physically purges the artifact.

### Destructive authorization

- no fresh password proof -> deletion denied;
- MFA-enrolled account without recent TOTP -> deletion denied;
- recent password + recent TOTP -> accepted;
- non-MFA ordinary member can delete after fresh password proof without forced MFA enrollment;
- last active Admin -> deletion denied;
- with another active Admin present -> protected Admin self-deletion may proceed.

### New-work freeze and race safety

- once deletion is accepted, Create/generation admission is denied;
- new reference/durable upload ticket creation is denied;
- new Collection/media product rows for the deleting owner are rejected at the database guard even when using the service-role fixture path;
- another account remains able to work normally;
- a presigned upload URL issued immediately before deletion can still write during the 300-second window, proving why quiescence exists;
- final deletion does not proceed before `quiescence_until`;
- after expiry, cleanup removes that late object and verifies absence.

### Active job handling

- run-owned active job is cancelled/settled through the existing provider/mock configured lifecycle;
- deletion cannot remove job history or Auth identity while active provider work is unresolved;
- deterministic finalization-orphan R2 candidates are purged even when no `media_assets` row exists.

### Owner residue and non-interference

After A deletion completes:

- `auth.admin.getUserById(A)` reports no user;
- A has zero rows in every registered owner relation;
- A access/lifecycle/export rows are absent through cascade/finalization;
- A claimed invitation is de-identified and contains neither A user ID nor prior email;
- every derived A R2 key is absent;
- all B sentinel rows/objects remain byte-for-byte/logically unchanged;
- B Auth/access/session/MFA state is unchanged.

### Retry/idempotency

Inject at least one recoverable failure at each external boundary class:

- R2 delete/proof failure;
- database cleanup interruption before finalizer commit;
- Auth Admin delete failure after product cleanup;
- export artifact write failure.

Re-running the processor must converge without reactivating the account, duplicating export artifacts or touching another owner.

### Repository gates

Final exact-head verification includes at least:

- engineering quality/build/typecheck/lint/unit tests;
- targeted account-data-lifecycle configured workflow;
- maintenance integration because production recovery behavior changes;
- Account/Settings visual workflow at desktop and 390px;
- existing session/MFA/account-identity workflows because authorization and Settings sensitive-operation plumbing are reused;
- all other workflows selected by the repository's normal exact-head/changed-path rules.

## 15. Documentation outputs

Before #219 closes, update verified reality in the existing sources of truth:

- this contract — implementation/closure status;
- `ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`;
- `PROJECT.md`;
- `FRONTEND_ARCHITECTURE.md` for lifecycle/export server boundaries;
- `INFRASTRUCTURE.md` for the production maintenance cron, R2/export key policy and shared provider processing/retention boundary;
- Settings `SCREEN_REGISTRY.md` / `UI_MIGRATION.md` / `COMPONENT_CATALOG.md` only for real UI/component state that changes;
- issue #219 with exact-head and merged-main evidence.

Do not create a separate privacy-policy document merely to repeat this implementation contract unless/when RenderLab has an actual public policy/legal requirement.

## 16. Exit criteria

#219 is complete only when all of the following are true:

1. retention/data-use decisions above are implemented and user-facing copy matches reality;
2. export is owner-scoped, machine-readable, complete for every registered current data class, short-lived and physically cleaned;
3. durable media export is truthfully represented through the authenticated manifest/download path without an unbounded ZIP promise;
4. destructive deletion uses fresh password proof and recent TOTP/AAL2 when MFA exists;
5. last-active-admin deletion is safely blocked;
6. new work is frozen at both authorization and database-insert boundaries;
7. active jobs settle/cancel safely;
8. pre-existing 300-second upload tickets are allowed to expire before the final storage sweep;
9. all owner R2 keys, including deterministic pre-row generation candidates, are proven absent;
10. owner product rows are removed transactionally without weakening existing RESTRICT FKs;
11. the claimed invitation is de-identified;
12. Supabase Auth identity is hard-deleted last via supported Admin API;
13. configured two-account tests prove zero registered owner residue and cross-account non-interference;
14. retry/fault tests prove the lifecycle converges idempotently;
15. exact-head workflows and merged-main verification pass;
16. repository documentation matches verified implementation reality.

Merging #219 does **not** authorize production deployment. Deployment remains a separate explicit operation.

## 17. Implementation verification — 2026-09-15

#219 is implemented and verified on PR #265. Exact implementation head `886a4722826b268ad156eda22e817002471cd04c` passed all 38 workflows GitHub attached to the pull request, including Account Data Lifecycle, Session Controls, Engineering Quality, UI Shell Validation, Integrated Release, Maintenance Integration, Account/Admin Operations, Account Identity, generation/media regressions, and Video Generation Integration. The configured lifecycle acceptance proves owner-scoped export, authenticated durable-media manifest behavior, logical expiry plus physical export cleanup, fresh destructive authorization, MFA step-up where applicable, last-active-Admin protection, immediate work freeze, active-generation cancellation, six-minute upload quiescence, owner-derived R2 purge/proof, transactional product cleanup, invitation de-identification, Auth deletion last, two-account non-interference, and recovery from export-write, R2-delete, database-finalization, and Auth-delete injected faults. The #219 Supabase migrations are live. Real account-deletion security-mail acceptance passed on the approved Gmail test lane with tracking disabled. No production application deployment was performed or authorized by #219.
