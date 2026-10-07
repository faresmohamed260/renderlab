# ENT-007 — Verified destructive-loss recovery contract

Date: 2026-10-07
Status: CONTRACT / ACTIVE / DATABASE RESTORE VERIFIED / R2 RETENTION BLOCKED
Tracking: #347
Baseline `main`: `49f2090eb7fbd78c801726dd0327aaaa3d660c6b`

## Goal

Close as much of RenderLab's largest remaining enterprise-readiness gap as the current Free-plan Supabase constraint truthfully permits: establish a real, retained logical recovery path for shared database/Auth state plus a protected recovery path for RenderLab-owned durable Cloudflare R2 objects, then measure evidence-backed recovery point and recovery time rather than inferring them from cadence or provider marketing.

ENT-007 is a disaster-recovery phase. It is not a production release or product redesign. The owner explicitly chose to keep Supabase on the Free plan on 2026-10-07, so this phase must improve recoverability without pretending logical backups equal Supabase managed physical backup/PITR capability.

## Verified starting state

- ENT-006 is complete/verified/merged/not deployed. The authoritative enterprise score remains **8.5/10**; disaster recovery/business continuity remains **5.9/10** and is the largest single score ceiling.
- ENT-007 contract PR #349 merged and verified on `main` as `929cd0e5183d6b07201e0b2884134bd1407061c7`; exact-head and merged-main Engineering Quality/CodeQL passed.
- Free-plan amendment PR #350 merged and verified on `main` as `192e0720b41ee46ff050b9159325f5ff4e67762d`; merged-main Engineering Quality `37541270364` and CodeQL `37541270367` passed.
- Shared Supabase project `rashyleshocuvpgcooxy` (`AI Studio`, `eu-west-1`) is live and `ACTIVE_HEALTHY`; current database engine is PostgreSQL 17 (`17.6.1.155`). The connected `Fares Home Lab` organization remains on the Free plan by explicit owner decision.
- The Supabase project is deliberately shared with S.A.G.A. RenderLab owns its own application tables/contracts but does not own the entire shared database/Auth estate independently.
- Current Supabase documentation recommends regular logical exports for Free-plan projects because downloadable managed backups are not available. Current CLI `supabase db dump` excludes managed schemas such as `auth` by default; Supabase separately documents SQL/`pg_dump` migration of Auth users and hashed passwords between projects.
- The current incident/recovery authority records no verified independently restorable logical backup or measured Supabase destructive-loss RPO/RTO.
- Branch-only bootstrap run `37541773882` verified incoming database SSL enforcement is currently off and JIT/temporary Postgres access is unavailable. Enabling JIT would require changing SSL enforcement and rebooting the deliberately shared database; ENT-007 will not introduce that shared-runtime change merely to obtain a dump connection.
- Branch-only capability run `37542331619` verified the existing protected `SUPABASE_ACCESS_TOKEN` can query `public.media_assets`, `auth.users`, and `supabase_migrations.schema_migrations` through Supabase Management API database-query surfaces without exposing a database password or changing shared runtime state.
- Read-only sizing on 2026-10-07 measured the shared database at roughly 14.9 MB. RenderLab active durable primary media was roughly 5.7 MB across 8 active assets plus 8 thumbnails, so current recovery-storage cost is negligible.
- RenderLab reuses one private Cloudflare R2 resource. Authoritative durable namespaces include generated media, thumbnails, persistent uploads, and deterministic private account-profile avatars. Temporary references, test fixtures, tombstoned/staging objects and regenerable account-export artifacts are not equivalent to durable recovery assets.
- Cloudflare R2 provides private buckets, S3-compatible copy/read/write and bucket-lock retention. Repository CI has working R2 S3 credentials, while the existing `CLOUDFLARE_API_TOKEN` is DNS-scoped rather than R2-admin capable; WANDA-616 remains an owner-authorized control plane when an authenticated Cloudflare session is available.
- Production remains the exact separately recorded deployment source. ENT-007 does not authorize Vercel deployment or alias movement.

## Implementation checkpoint — 2026-10-07

Current implementation evidence is **partial and non-promotional**. It proves the database logical-recovery mechanism but does not satisfy ENT-007 exit criteria yet.

- Exact repository-side retained-recovery checkpoint: `bbff89377ceb6086006b3ea17a76d01f5e439fbc` on `work/ent-007-recovery-implementation`; exact-head run `37620760683` passed the live snapshot, isolated database restore, non-promotable backup refusal and cleanup workflow.
- Live integration run `37608353935` completed successfully. A bounded encrypted snapshot was collected from `rashyleshocuvpgcooxy` through the Management API, decrypted/validated only on the disposable runner, and removed after the drill. The safe manifest recorded 10 contracted public tables, 1 RenderLab Auth user, 1 Auth identity, migration head `20261005202352 renderlab_operational_observability_privilege_hardening`, and the currently active durable-object set selected from RenderLab state.
- Latest exact-head run `37620760683` reconstructed all 29 checked-in RenderLab migrations in isolated PostgreSQL 17 and restored the bounded logical snapshot. Verification reported `restoredSessionCount=0`, `rlsMissingCount=0`, `browserPrivilegeViolationCount=0`, `orphanMediaReferenceCount=0`, and `ownerOrphanCount=0`; restore verification elapsed 2,291 ms. This is drill evidence only, **not** destructive-loss RTO while no retained recovery generation exists.
- The restore deliberately replaces migration-seeded `renderlab_beta_settings` with the backed-up authoritative singleton. Active sessions and MFA state are not restored; fresh sign-in and MFA re-enrollment remain the accepted Free-plan recovery behavior.
- Authorized provider mutation created private WEUR bucket `renderlab-dr-backup` through the existing R2 S3 credentials. No backup payload has been promoted into it.
- Existing `CLOUDFLARE_API_TOKEN` is verified under-scoped for R2 bucket administration/token provisioning. Existing R2 S3 credentials can list/create buckets, but Cloudflare's S3-compatible API cannot configure bucket lock. Wrangler 4.148.0 device OAuth on WANDA again reached the Cloudflare authorization page on 2026-10-07 and timed out after five minutes without establishing a session; no control-plane mutation occurred.
- `scripts/persist-ent007-recovery-backup.mjs` now requires separately scoped backup credentials, writes a retention probe before copying, streams source bytes with primary-read authority, writes with backup authority, verifies SHA-256 bytes/content type, and writes `complete.json` only after all checks. Exact-head run `37620760683` proved the current unlocked destination is still rejected for the intended retention reason. Permanent daily/manual backup and manual selected-generation retained-restore workflows are now checked in; the restore path verifies retained snapshot identity/hash, isolated PostgreSQL recovery, run-owned R2 byte restore, cross-store reference count, primary-delete simulation and cleanup.
- Separate backup-scoped R2 credentials and at least 7-day bucket lock therefore remain blockers before retained database/object backup, R2 restore, cross-store restore, RPO/RTO measurement, account-deletion retention documentation, implementation PR closure, or enterprise-score reassessment.
- No Vercel deployment, alias movement, Supabase hosted-runtime mutation, paid-plan/PITR change, provider routing change, or production schedule activation occurred.

## Recovery architecture decision

### 1. Supabase: Free-plan logical recovery is the accepted database path

The owner explicitly chose to remain on Supabase Free. ENT-007 therefore accepts a repository-managed **logical** recovery path as the best currently available database/Auth protection, while preserving a permanent capability disclaimer: it is not equivalent to Supabase managed physical backups, restore-to-new-project or PITR.

Minimum accepted backup generation:

- run on an approved schedule plus `workflow_dispatch`;
- use the existing protected `SUPABASE_ACCESS_TOKEN` only through Supabase Management API database-query surfaces; do not add or rotate a long-lived database password merely for backup;
- treat the checked-in RenderLab migration chain plus verified hosted migration history as schema/RLS/routine reconstruction authority rather than scraping provider-managed DDL;
- export deterministic, versioned logical data for every RenderLab-owned durable/account/operations table required by current product state;
- derive the RenderLab owner/user identity set from RenderLab-owned rows, then export only the bounded managed Auth rows required to reconstruct those identities rather than copying unrelated S.A.G.A. Auth state;
- keep Management API queries read-only and schema-qualified; use the beta read-only endpoint where its `supabase_read_only_user` can see the required relation, and the generic query endpoint with `read_only: true` only for provider-managed relations such as `auth` that were explicitly verified but are not exposed to `supabase_read_only_user`;
- capture migration-head/history evidence needed to prove which RenderLab migrations are represented by the backup;
- hash every backup payload and publish only a secret-safe manifest;
- store backup payloads only in the dedicated private retained backup destination, never Git or ordinary short-lived Actions artifacts.

The logical backup must minimize shared-project blast radius: it backs up RenderLab-owned application state plus only the Auth identity rows needed by RenderLab. It must not become a general S.A.G.A. database export. Auth secrets/tokens/session material are included only when a later restore requirement proves they are necessary and safe; otherwise the recovery contract requires fresh authentication after restoration and records the omitted continuity explicitly.

Minimum accepted restore proof:

- restore into a separate isolated Supabase project or other isolated Postgres/Supabase-compatible target; never overwrite/reset the live shared project for a drill;
- apply the checked-in RenderLab migration chain to reconstruct RenderLab schema/RLS/routines, then import the versioned logical snapshot in a documented dependency-safe order;
- import only the bounded Auth identity records carried by the backup and preserve provider-owned Auth schema ownership;
- verify representative RenderLab rows, ownership/foreign-key integrity, RLS/grants, migration state and Auth identity continuity needed by RenderLab;
- require fresh sign-in after restore unless the drill separately proves compatible JWT-signing/session configuration; active JWT/session continuity is not assumed;
- measure the age of the restored backup and elapsed restore/verification time.

Explicit Free-plan limitations that remain after a successful drill:

- no provider-managed physical backup or PITR guarantee;
- no automatic preservation of project-level Auth settings, API keys, Edge Functions, Realtime settings, extensions/settings, or provider encryption root key/Vault decryptability;
- no claim that a database logical backup alone recreates the complete Supabase platform project;
- no numerical RPO stronger than the newest successfully restored logical generation actually observed.

These limitations reduce the eventual enterprise-readiness credit compared with a paid managed-backup implementation, but they do not block ENT-007 from establishing a materially better, tested recovery posture on the approved Free-plan constraint.

### 2. R2: dedicated protected backup destination for RenderLab-owned durable objects

Create a dedicated backup bucket/destination only after explicit resource/cost authorization. The minimum accepted design is:

- separate backup destination from the primary bucket;
- separately scoped backup credentials; application runtime credentials must not be reused as the backup authority;
- backup destination protected by a bucket-lock retention rule or equivalent immutability control;
- retention window no shorter than the accepted database backup window;
- no automatic propagation of primary deletes into still-retained backup generations;
- backup selection driven by authoritative RenderLab durable state rather than blindly copying every shared-bucket object.

The durable object set must include, when referenced by active RenderLab state:

- generated primary media under `renderlab/generations/...`;
- generated thumbnails under `renderlab/thumbnails/...`;
- persistent uploads under `renderlab/uploads/...`;
- deterministic account-profile avatars under `renderlab/account-profiles/<owner-id>/avatar.webp`.

Exclude from the durable backup set unless a later contract proves a need:

- temporary generation references/staging objects;
- test/verification fixture prefixes;
- tombstoned or cleanup-eligible objects;
- transient account-export artifacts that can be regenerated from durable state.

A same-Cloudflare-account backup bucket protects against application-credential compromise and accidental primary deletion only to the extent proved by scoped credentials and retention. It must not be described as provider/account-failure independence. A separate account/provider may later strengthen that boundary without changing the restore contract.

## Authorization state

The owner authorized the revised minimum path on 2026-10-07:

1. keep Supabase on the Free plan; no Pro upgrade and no PITR;
2. create a dedicated Cloudflare R2 backup bucket/destination;
3. create/use backup-scoped R2 credentials where the available control plane permits;
4. configure bucket-lock retention of at least 7 days;
5. add a repository-owned scheduled/manual logical database + durable-object backup workflow;
6. create/use an isolated no-cost Supabase restore target for drills when available under the Free-plan organization limits;
7. perform no Vercel production deployment or alias movement as part of ENT-007.

Provider/resource mutations remain bounded to the recovery resources above. Absence of a provider capability is recorded as a limitation rather than permission to broaden scope.

## Backup workflow requirements

After provider prerequisites are authorized and provisioned, add a repository-owned backup workflow with these properties:

- `workflow_dispatch` plus an approved recurring schedule; no pull-request trigger and no ordinary push trigger;
- `cancel-in-progress: false` because interrupted backup state must remain inspectable/reconstructible;
- exact pinned external actions under the existing supply-chain policy;
- least-privilege GitHub permissions;
- secrets only from approved secret stores; no database password, access key, connection string, signed URL or object key list in logs/artifacts;
- run manifest containing only safe operational evidence: source project/bucket identity, start/end timestamps, backup generation/restore-point identity, migration-head identity where available, RenderLab table/object counts, total bytes, success/failure summary and cleanup result;
- deterministic failure behavior: a partially completed backup is not promoted as a valid recovery point.

The workflow must not commit backup data to Git and must not use short-lived GitHub Actions artifacts as the sole durable backup store.

## Restore-drill requirements

Recovery is not credited until an isolated restore drill passes.

### Supabase drill

- restore a selected logical backup generation into a new isolated project/target;
- never reset or restore over the live shared project;
- verify the expected RenderLab migration set and table presence;
- verify representative RenderLab ownership/foreign-key integrity and absence of orphaned durable references;
- verify RLS and browser-role revocations remain intact for RenderLab-owned private tables;
- verify service-role-only routines/privileges that current RenderLab operation depends on;
- verify bounded Auth identity continuity using opaque identifiers only; do not publish emails, password hashes, MFA secrets, tokens or raw user rows as evidence;
- explicitly record any project-level configuration that a logical restore does not recreate;
- record backup-generation age and elapsed restore/verification time.

Because the logical backup includes sensitive shared project state, drill evidence must inspect and report only RenderLab-owned invariants. Any isolated Supabase restore project is sensitive shared data and must be deleted/retired under an explicit cleanup step after evidence is captured.

### R2 drill

- use run-owned deterministic DR fixture objects representing each backed-up durable object class;
- prove the fixtures enter a valid retained backup generation;
- restore them into an isolated destination/prefix, never over the live primary keys;
- verify exact byte/hash equality, content type and expected object count;
- verify a primary-delete simulation cannot remove the retained backup copy during the lock window;
- cleanup only run-owned drill targets; never broad-delete the backup destination.

### Cross-store drill

For the same run-owned media fixture, prove that restored Supabase metadata resolves to a restored R2 object with matching opaque product identity and byte evidence. Database-only recovery and object-only recovery do not establish usable product recovery separately.

## RPO/RTO measurement rules

Do not assign recovery numbers from cadence alone.

Record at minimum:

- **database observed RPO:** age of the newest successfully restored logical backup generation at drill time;
- **database observed RTO:** elapsed time from restore initiation until RenderLab verification gates pass on the isolated project;
- **R2 observed RPO:** age of the newest complete protected backup generation covering the drill fixture;
- **R2 observed RTO:** elapsed time from restore initiation until bytes and metadata pass in the isolated restore target;
- **combined recovery RTO:** elapsed time until the cross-store fixture is coherent and verification-complete.

Any published objective must be no stronger than repeated observed evidence plus the actual Free-plan/logical-backup contract and configured R2 retention.

## Privacy, deletion and retention boundary

Backups necessarily change the meaning of immediate physical erasure. ENT-007 must update the account-data/deletion and incident-recovery authorities before claiming completion:

- successful account deletion continues to remove active primary RenderLab state according to the existing lifecycle contract;
- retained backups may contain pre-deletion state until the documented backup-retention window expires;
- restore drills never promote restored user data to production;
- a real disaster cutover requires a separately authorized operator decision and a documented deletion/reconciliation review before serving restored state;
- no backup implementation may silently weaken existing primary account-deletion convergence or fixture cleanup guarantees.

Do not claim backup retention semantics that the configured provider/resource cannot prove.

## Security and credential boundary

- Backup credentials are server/CI-only and must never enter browser/runtime product bundles.
- Prefer dedicated read/backup scope over reusing application service credentials.
- R2 backup credentials should be restricted to the backup workflow/destination and protected by retention controls.
- Database backup/restore credentials must not be written into repository files, workflow artifacts or logs.
- A restore target is sensitive production-derived data even when isolated; access must be at least as restricted as the source and cleanup must be explicit.
- Engineering Quality/server-only verification must cover any new source module that acquires backup credentials.

## Explicitly out of scope

ENT-007 does **not** authorize:

- production Vercel deployment or alias movement;
- changing user-facing product behavior or UI;
- changing generation/provider/Modal routing;
- repurposing or mutating legacy S.A.G.A. application tables;
- restoring a drill over the live Supabase project or live R2 keys;
- broad R2 prefix sweeps/deletes;
- enabling Supabase SSL enforcement/JIT or rebooting the shared database solely to obtain backup connectivity;
- rotating or introducing a persistent shared Postgres password solely for ENT-007 backup;
- treating GitHub artifacts or repository commits as the long-term backup store;
- claiming provider/account-failure independence from a same-provider/same-account backup;
- developer portability, test-coverage tooling, workflow consolidation or large-module decomposition except where narrowly necessary for the recovery workflow itself.

## Validation matrix

### Contract PR

Before this contract is merged:

1. `git diff --check`;
2. Engineering Quality passes on the exact contract head;
3. CodeQL passes on the exact contract head;
4. the PR changes documentation only.

### Implementation/verification

ENT-007 may be marked complete only after the authorized implementation head proves:

1. configured backup resources/credentials exist with intended scope;
2. the scheduled/manual backup workflow completes without leaking secrets or personal data;
3. a complete hashed logical database/Auth backup generation exists in retained backup storage;
4. a complete protected R2 backup generation exists;
5. isolated Supabase restore succeeds and RenderLab integrity/security checks pass;
6. isolated R2 restore succeeds with exact fixture-byte verification;
7. the cross-store fixture is coherent after restore;
8. measured RPO/RTO evidence is recorded;
9. restore-target and run-owned fixture cleanup is verified;
10. Engineering Quality and CodeQL pass on the exact implementation head;
11. all affected account/data-lifecycle and storage workflows pass on the exact implementation head;
12. implementation merges to protected `main` and merged-main quality/security checks pass;
13. repository authorities and enterprise reassessment reflect only verified reality.

## Documentation outputs on completion

Update existing authorities rather than creating competing truth:

- this contract with exact closure evidence;
- `docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md` with the real backup/restore path, retention and measured objectives;
- `docs/architecture/INFRASTRUCTURE.md` with backup resource/credential ownership and restore isolation;
- account-data/deletion documentation for backup-retention semantics;
- `docs/STATUS.md` and `PROJECT.md` with exact phase status;
- a same-rubric ENT-007 enterprise reassessment only after real restore evidence and merged-main verification are complete.

## Exit criteria

ENT-007 is complete only when RenderLab can point to a real, retained logical recovery generation for the shared database/Auth data plus retained RenderLab durable R2 state, successfully restore both into isolated targets, prove cross-store coherence, measure the observed recovery point/time, and document the privacy/retention/operator boundary.

A backup that has never been restored does not count. A runbook without a recoverable copy does not count. Completion on the Free plan must continue to state that logical recovery is **not** full Supabase platform recovery and does not earn the same disaster-recovery credit as provider-managed physical backup/PITR.
