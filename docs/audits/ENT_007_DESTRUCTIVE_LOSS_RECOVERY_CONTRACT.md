# ENT-007 — Verified destructive-loss recovery contract

Date: 2026-10-06  
Status: CONTRACT / IMPLEMENTATION BLOCKED ON EXPLICIT INFRASTRUCTURE AUTHORIZATION  
Tracking: #347  
Baseline `main`: `23a219ef632b98a48e9015a85c9ede603df280e1`

## Goal

Close RenderLab's largest remaining enterprise-readiness gap by establishing an actually restorable destructive-loss recovery path for the shared Supabase project and RenderLab-owned durable Cloudflare R2 state, then measure evidence-backed recovery point and recovery time rather than inferring them from documentation or provider marketing.

ENT-007 is a disaster-recovery phase. It is not a production release, not a product redesign, and not permission to mutate shared infrastructure merely because the contract is merged.

## Verified starting state

- ENT-006 is complete/verified/merged/not deployed. The authoritative enterprise score remains **8.5/10**; disaster recovery/business continuity remains **5.9/10** and is the largest single score ceiling.
- Current repository `main` is `23a219ef632b98a48e9015a85c9ede603df280e1` after the ENT-006 closeout merge.
- Shared Supabase project `rashyleshocuvpgcooxy` (`AI Studio`, `eu-west-1`) is live and `ACTIVE_HEALTHY`; current database engine is PostgreSQL 17 (`17.6.1.155`).
- The Supabase project is deliberately shared with S.A.G.A. RenderLab owns its own application tables/contracts but does not own the entire shared database/Auth estate independently.
- The current incident/recovery authority records no verified downloadable database backup, PITR restore, independently restorable logical backup, or measured Supabase destructive-loss RPO/RTO.
- Current provider documentation confirms Free-plan projects do not expose downloadable managed backups. Paid managed daily backups and restore-to-new-project exist; PITR is a separately paid finer-grained recovery option.
- The repository contains no `pg_dump`, `supabase db dump`, `rclone`, or other accepted database/object backup workflow.
- RenderLab reuses one private Cloudflare R2 resource. Authoritative durable namespaces include generated media, thumbnails, persistent uploads, and deterministic private account-profile avatars. Temporary references, test fixtures, tombstoned/staging objects and regenerable account-export artifacts are not equivalent to durable recovery assets.
- Cloudflare R2 currently provides bucket-lock retention and S3-compatible object copy operations, but the repository has no separately verified backup bucket/destination or restore exercise.
- Production remains the exact separately recorded deployment source. ENT-007 planning does not authorize deployment or alias movement.

## Recovery architecture decision

### 1. Supabase: full shared-project recovery is the authoritative database path

Because Supabase Auth and the hosted project are shared with S.A.G.A., a RenderLab-only logical export must **not** be credited as full project/Auth disaster recovery. ENT-007 therefore treats a provider-supported full-project backup restored into a **new isolated Supabase project** as the authoritative database recovery path.

Minimum acceptable path:

- move the shared Supabase organization/project onto a provider plan that exposes managed backups and restore-to-new-project **only after explicit owner authorization of the paid-plan change**;
- preserve the source project and restore into a new isolated project for drills; never overwrite/reset the live shared project to prove recovery;
- verify RenderLab-owned schema/data, Auth identity continuity needed by RenderLab, RLS/grants, migration state and service-role boundaries on the isolated restore;
- record the actual available restore point and measured restore duration.

PITR is an optional stronger follow-on inside ENT-007 only if separately authorized. Daily managed backup restore may establish a coarse recovery objective; PITR may establish a materially tighter one. No numerical RPO is credited before the real restore point is observed and recorded.

A custom logical export may be retained as a portability/secondary artifact later, but it does not replace the full shared-project recovery proof in this phase.

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

## Authorization gates

Merging this contract authorizes **planning only**.

Before implementation may mutate provider state, the owner must explicitly authorize each applicable item:

1. any Supabase paid-plan upgrade;
2. PITR or another paid Supabase add-on;
3. creation of a new Supabase restore/drill project if it incurs cost;
4. creation of an R2 backup bucket/destination;
5. creation/rotation of backup-only credentials;
6. bucket-lock/retention configuration;
7. any scheduled backup workflow that consumes provider resources.

Absence of authorization is a blocker, not permission to choose a cheaper or broader alternative silently.

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

- restore a selected managed backup into a new isolated project;
- never reset or restore over the live shared project;
- verify the expected RenderLab migration set and table presence;
- verify representative RenderLab ownership/foreign-key integrity and absence of orphaned durable references;
- verify RLS and browser-role revocations remain intact for RenderLab-owned private tables;
- verify service-role-only routines/privileges that current RenderLab operation depends on;
- verify a bounded run-owned Auth/account fixture by opaque identity only; do not publish emails, password material, MFA secrets, tokens or raw user rows as evidence;
- record restore-point age and elapsed restore time.

Because the restored database includes shared S.A.G.A. state, drill evidence must inspect and report only RenderLab-owned invariants. The restore project itself is sensitive shared data and must be deleted/retired under an explicit cleanup step after evidence is captured.

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

- **database observed RPO:** age of the newest successfully restorable Supabase recovery point at drill time;
- **database observed RTO:** elapsed time from restore initiation until RenderLab verification gates pass on the isolated project;
- **R2 observed RPO:** age of the newest complete protected backup generation covering the drill fixture;
- **R2 observed RTO:** elapsed time from restore initiation until bytes and metadata pass in the isolated restore target;
- **combined recovery RTO:** elapsed time until the cross-store fixture is coherent and verification-complete.

Any published objective must be no stronger than repeated observed evidence plus the provider contract actually purchased/configured.

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
3. a valid database recovery point exists;
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

ENT-007 is complete only when RenderLab can point to a real, retained recovery point for both the shared Supabase project and RenderLab-owned durable R2 state, successfully restore both into isolated targets, prove cross-store coherence, measure the observed recovery point/time, and document the privacy/retention/operator boundary.

A backup that has never been restored does not count. A runbook without a recoverable copy does not count. A RenderLab-only logical database dump does not count as full recovery of the deliberately shared Supabase/Auth project.
