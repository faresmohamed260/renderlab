# Multi-output DDL and transaction proposal — NOT AUTHORIZED TO APPLY

**Proposal only; not authorized to apply.** Every SQL fragment, signature, privilege, policy, limit, transition, test and implementation recommendation below is **not authorized to apply**. No migration, RPC, index, setting, worker, scheduler, endpoint, provider or release change is authorized. No database was contacted. This document is a reviewable candidate, not executable migration or an accepted implementation contract. Source snapshot: `97317ded18523dc193cb4a674b6690e185ddeb1d`; follow [the proposed phase contract](MULTI_OUTPUT_PHASE_CONTRACT.md) and [architecture direction](MULTI_OUTPUT_PROPOSAL_2026-11-25.md). Count=1 stays on its existing path; first new scope is source-free FIBO Turbo T2I, 2–4 outputs.

## 1. Proposed data layout — not authorized to apply

Existing 0005 makes job owners immutable/non-null; 0012 counts reservations; 0020 freezes deletion and checks cleanup; 0034 serializes owner+request key; 0036 terminalizes a single canonical asset and releases its job reservation; 0037 preserves attach-only recovery. Preserve these child semantics. Do not copy historical assets into groups. Parent/slot records are internal, not browser-readable. No asset FK from a slot: deleting an independently owned asset must not erase successful historical slot state. A group lookup derives current asset from the same-owner canonical slot-0 child asset, excluding deleted assets. Never expose provider identifiers, payloads or R2 keys.

The candidate uses one parent row as the entire weighted hourly charge and occupancy authority. Child reservations remain compatible with existing terminalization but are excluded from **both** ordinary occupancy and ordinary hourly counters by a slot-reservation identity link. No double charge. Each planned slot contains an immutable attempt/reservation identity; only the next eligible slot gets a job and reservation. Explicitly reserve parent occupancy until every active/unknown child is reconciled, not merely until a deadline elapses.

### Candidate DDL (not authorized to apply)

The following is SQL for review only, not a migration. Unique composite indexes on legacy tables are proposed solely to enforce owner-consistent FKs; deployment cost and duplicate/index checks must precede approval.

```sql
-- NOT AUTHORIZED TO APPLY
ALTER TABLE public.generation_jobs
  ADD CONSTRAINT generation_jobs_owner_id_id_uniq UNIQUE (owner_id,id);
ALTER TABLE public.generation_admission_reservations
  ADD CONSTRAINT generation_admission_owner_id_id_uniq UNIQUE (owner_id,id);

CREATE TABLE public.renderlab_generation_groups (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_key text NOT NULL CHECK (request_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
  requested_count smallint NOT NULL CHECK (requested_count BETWEEN 2 AND 4),
  normalized_intent jsonb NOT NULL CHECK (jsonb_typeof(normalized_intent) = 'object'),
  base_seed bigint NOT NULL CHECK (base_seed >= 0),
  seed_min bigint NOT NULL CHECK (seed_min >= 0),
  seed_max bigint NOT NULL CHECK (seed_max >= seed_min),
  admitted_at timestamptz NOT NULL,
  deadline_at timestamptz NOT NULL,
  retain_until timestamptz NOT NULL,
  budget_ms bigint NOT NULL CHECK (budget_ms > 0),
  slot_ceiling_ms bigint NOT NULL CHECK (slot_ceiling_ms > 0),
  persistence_headroom_ms bigint NOT NULL CHECK (persistence_headroom_ms >= 0),
  charged_ms bigint NOT NULL DEFAULT 0 CHECK (charged_ms >= 0 AND charged_ms <= budget_ms),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','stopping','succeeded','partial','failed','cancelled')),
  stop_reason text CHECK (stop_reason IN ('owner_cancel','deadline','budget','child_failure','account_deleting','disabled')),
  stopped_at timestamptz,
  terminal_at timestamptz,
  next_due_at timestamptz NOT NULL,
  claim_token uuid,
  claim_until timestamptz,
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  UNIQUE (owner_id,id),
  UNIQUE (owner_id,request_key),
  CHECK (base_seed BETWEEN seed_min AND seed_max),
  CHECK (deadline_at > admitted_at AND retain_until > deadline_at),
  CHECK ((claim_token IS NULL) = (claim_until IS NULL)),
  CHECK ((stop_reason IS NULL) = (stopped_at IS NULL)),
  CHECK ((status IN ('succeeded','partial','failed','cancelled')) = (terminal_at IS NOT NULL)),
  CHECK (terminal_at IS NULL OR claim_token IS NULL),
  CHECK (status <> 'stopping' OR stopped_at IS NOT NULL),
  CHECK (slot_ceiling_ms <= budget_ms)
);
CREATE INDEX renderlab_groups_owner_admitted_idx
  ON public.renderlab_generation_groups(owner_id,admitted_at DESC);
CREATE INDEX renderlab_groups_owner_active_idx
  ON public.renderlab_generation_groups(owner_id,id)
  WHERE terminal_at IS NULL;
CREATE INDEX renderlab_groups_due_idx
  ON public.renderlab_generation_groups(next_due_at,id)
  WHERE terminal_at IS NULL;
CREATE INDEX renderlab_groups_retention_idx
  ON public.renderlab_generation_groups(retain_until,id)
  WHERE terminal_at IS NOT NULL;

CREATE TABLE public.renderlab_generation_group_slots (
  group_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  slot_index smallint NOT NULL CHECK (slot_index BETWEEN 0 AND 3),
  seed bigint NOT NULL CHECK (seed >= 0),
  planned_attempt_id uuid NOT NULL UNIQUE,
  planned_reservation_id uuid NOT NULL UNIQUE,
  job_id uuid UNIQUE,
  bound_reservation_id uuid UNIQUE,
  state text NOT NULL DEFAULT 'planned'
    CHECK (state IN ('planned','queued','active','succeeded','failed','cancelled','skipped')),
  charge_ms bigint NOT NULL DEFAULT 0 CHECK (charge_ms >= 0),
  terminal_at timestamptz,
  PRIMARY KEY (group_id,slot_index),
  FOREIGN KEY (owner_id,group_id)
    REFERENCES public.renderlab_generation_groups(owner_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_id,job_id)
    REFERENCES public.generation_jobs(owner_id,id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_id,bound_reservation_id)
    REFERENCES public.generation_admission_reservations(owner_id,id) ON DELETE RESTRICT,
  CHECK ((job_id IS NULL) = (bound_reservation_id IS NULL)),
  CHECK (bound_reservation_id IS NULL OR bound_reservation_id = planned_reservation_id),
  CHECK ((state IN ('succeeded','failed','cancelled','skipped')) = (terminal_at IS NOT NULL)),
  CHECK ((state IN ('planned','skipped')) = (job_id IS NULL))
);
CREATE UNIQUE INDEX renderlab_group_single_live_child_idx
  ON public.renderlab_generation_group_slots(group_id)
  WHERE state IN ('queued','active');
CREATE INDEX renderlab_group_slots_owner_group_idx
  ON public.renderlab_generation_group_slots(owner_id,group_id);
CREATE INDEX renderlab_group_slots_owner_job_idx
  ON public.renderlab_generation_group_slots(owner_id,job_id)
  WHERE job_id IS NOT NULL;
CREATE INDEX renderlab_group_slots_owner_reservation_idx
  ON public.renderlab_generation_group_slots(owner_id,bound_reservation_id)
  WHERE bound_reservation_id IS NOT NULL;

ALTER TABLE public.renderlab_generation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renderlab_generation_group_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.renderlab_generation_groups,
  public.renderlab_generation_group_slots FROM PUBLIC,anon,authenticated,
  service_role,renderlab_modal_dispatcher,renderlab_modal_worker;
-- No browser policies; default-deny RLS. No direct service-role DML either.
-- Existing privileged server routines own writes. Definer ownership must be
-- verified as the migration identity with required privileges; no new login.
CREATE TRIGGER renderlab_groups_owner_immutable
  BEFORE UPDATE OF owner_id ON public.renderlab_generation_groups
  FOR EACH ROW EXECUTE FUNCTION public.renderlab_reject_owner_change();
CREATE TRIGGER renderlab_group_slots_owner_immutable
  BEFORE UPDATE OF owner_id ON public.renderlab_generation_group_slots
  FOR EACH ROW EXECUTE FUNCTION public.renderlab_reject_owner_change();
CREATE TRIGGER renderlab_groups_deleting_owner_guard
  BEFORE INSERT ON public.renderlab_generation_groups
  FOR EACH ROW EXECUTE FUNCTION public.renderlab_reject_deleting_owner_insert();
CREATE TRIGGER renderlab_group_slots_deleting_owner_guard
  BEFORE INSERT ON public.renderlab_generation_group_slots
  FOR EACH ROW EXECUTE FUNCTION public.renderlab_reject_deleting_owner_insert();
-- NOT AUTHORIZED TO APPLY
```

Cross-row invariants (not authorized to apply): exactly N contiguous slots 0..N-1 and their seed range, immutable parent request identity/count/intent/seed/bounds/admission/budget and slot index/seed/planned identities, immutable first child binding, monotonic version/charge and legal transition edges are enforced by RPC-only writes and deferred constraint trigger proposal below. An ordinary job never shares a group key; both accept paths and both lookups must use the same advisory lock and check both ledgers. No changes to existing keys or output-slot history. Retention must never remove a group while a child is unterminal, unresolved, or its charge still counts. Until a reviewed retention policy, do not auto-delete group rows or children.

Proposed additional constraint-trigger signatures (not authorized to apply): `renderlab_validate_group_integrity() RETURNS trigger` (deferred on parent/slot INSERT/UPDATE/DELETE, checks exact N, contiguous slots, sum(charge_ms)=charged_ms, terminal outcome and active child consistency; permit explicit whole-group account cleanup only within the authorized finalizer after quiescence); `renderlab_reject_group_identity_change() RETURNS trigger` and `renderlab_reject_slot_identity_change() RETURNS trigger` (BEFORE UPDATE, compare OLD/NEW immutable columns using IS DISTINCT FROM; allow null-to-bound once, reject reassignment and terminal regression). The proposed attachment statements below require reviewed function bodies first and disposable PostgreSQL proof; this proposal does not pretend the listed DDL alone enforces those cross-row invariants. Validate each bound reservation's durable job identity against its same-owner slot job, not merely the independent foreign keys.

```sql
-- NOT AUTHORIZED TO APPLY; function bodies are intentionally not implemented.
CREATE CONSTRAINT TRIGGER renderlab_group_integrity_parent
  AFTER INSERT OR UPDATE OR DELETE ON public.renderlab_generation_groups
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  EXECUTE FUNCTION public.renderlab_validate_group_integrity();
CREATE CONSTRAINT TRIGGER renderlab_group_integrity_slot
  AFTER INSERT OR UPDATE OR DELETE ON public.renderlab_generation_group_slots
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
  EXECUTE FUNCTION public.renderlab_validate_group_integrity();
CREATE TRIGGER renderlab_group_identity_immutable
  BEFORE UPDATE ON public.renderlab_generation_groups FOR EACH ROW
  EXECUTE FUNCTION public.renderlab_reject_group_identity_change();
CREATE TRIGGER renderlab_slot_identity_immutable
  BEFORE UPDATE ON public.renderlab_generation_group_slots FOR EACH ROW
  EXECUTE FUNCTION public.renderlab_reject_slot_identity_change();
```


## 2. Weighted admission and timing — not authorized to apply

At one transaction timestamp t, under the same owner lock and singleton settings lock, effective A and H are the existing active/hourly limits. Ordinary occupancy O = unresolved, unreleased, unexpired ordinary reservations after current reconciliation, excluding a matching same-owner bound group slot. Group occupancy G = nonterminal groups, **including stopping or overdue unresolved groups**. Require O+G+1 <= A for either admission. The weighted hourly count W = ordinary grants admitted in (t-60 min,t], including released/failed grants, excluding group-linked reservations, plus sum(requested_count) over groups admitted in that same window. Ordinary cost =1; group cost=N; accept only if W+cost<=H. An exact replay costs zero new units and no occupancy. No refund for unused planned slots in this candidate; owner must approve. N=4 with H=12 and W=9 rejects atomically; W=8 accepts to 12. N=4 with O=1,G=0,A=1 rejects; with A=2 accepts (one group occupancy, not four). Group children never re-enter ordinary reserve.

Let B be approved aggregate execution budget in ms, T be approved per-slot ceiling (at most validated provider bound), P be persistence headroom, D be fixed parent deadline. Before committing a new child require charged_ms+T<=B and t+T+P<=D; charge T pessimistically and permanently at acceptance of the child in this candidate, with no downward adjustment (actual observed usage is separate telemetry, not a credit). This preserves the monotonic charge invariant; any refund policy is a separate owner decision. Never start a slot just because time remains if the full bound does not fit. The 420s renderer timeout is source evidence, **not** authorization to set T, B, D or P. Freeze seed range [L,U] after contract verification; use numeric intermediate arithmetic to avoid bigint overflow: seed_i=L+mod((base_seed::numeric-L)+i,U::numeric-L+1), cast only after bounds check. Current worker default seed 42 does not establish allowed full range; no guessed MAX_SEED.

## 3. RPC contract and privilege proposal — not authorized to apply

Signature specification only, NOT runnable function definitions. All functions are planned SECURITY DEFINER SET search_path = '' only where needed to operate on the browser-revoked records, with fully qualified names, no dynamic SQL, verified owner from server session, and no direct browser invocation. Explicit `REVOKE ALL ON FUNCTION ... FROM PUBLIC,anon,authenticated,service_role,renderlab_modal_dispatcher,renderlab_modal_worker` followed by the listed EXECUTE grant, performed in same transaction as creation. No new login role; unattended runner identity/permission is a separate authorization. Do not grant dispatcher/renderer these group RPCs. RPC inputs here are internal; server validates and normalizes exact FIBO intent, digest and payload, not trusted from browser.

| Proposed exact signature | Return / permission | Transaction responsibility |
| --- | --- | --- |
| renderlab_accept_generation_group(uuid,text,text,uuid,smallint,jsonb,bigint,bigint,bigint,uuid[],uuid[],bigint,bigint,bigint,timestamptz,jsonb) | TABLE(outcome text, group_id uuid, version bigint); service_role | owner, key, digest, group ID, count, normalized intent, base/min/max seed, ordered attempt and reservation UUID arrays, B/T/P, deadline, first payload. Check both ledgers; atomically admit parent, N slots, first child + outbox + reservation. Reject malformed, changed count/digest, disabled/deleting/ineligible, bad bounds, conflicts; replay no side effects. |
| renderlab_lookup_generation_group_acceptance(uuid,text,text) | TABLE(outcome text, group_id uuid, version bigint); service_role | Same owner/key try-lock; in_flight vs authoritative absent; no identity for mismatch. |
| renderlab_read_generation_group(uuid,uuid) | TABLE(group_id uuid,requested_count smallint,status text,version bigint,slots jsonb); service_role | Owner filter; ordered bounded sanitized slot projection, active accessible canonical asset IDs only. |
| renderlab_claim_generation_groups(uuid,integer,integer) | TABLE(group_id uuid,owner_id uuid,version bigint,claim_until timestamptz); service_role initially, runner grant separately reviewed | Token, bounded limit and lease seconds; claim due nonterminal parents using SKIP LOCKED in short transaction, no child/outbox access while claiming. |
| renderlab_advance_generation_group(uuid,uuid,uuid,bigint,jsonb) | TABLE(outcome text,version bigint,job_id uuid); service_role | Owner/group/token/expected version/next validated payload; reconcile previous child from locked durable row; CAS, stop/deadline/budget/account checks; insert exactly one next child, reservation and outbox atomically using immutable IDs. Never network call in transaction. |
| renderlab_stop_generation_group(uuid,uuid) | TABLE(outcome text,version bigint); service_role | Serialize with advance, fence new slots and mark stopping; existing queued cancellation only through current authority; persisting child may complete. No fake terminal cancellation. |
| renderlab_release_generation_group_claim(uuid,uuid,uuid,bigint) | boolean; service_role | Owner/group/token/version CAS; stale claim no effect, next_due_at bounded. |
| renderlab_validate_group_integrity() / renderlab_reject_group_identity_change() / renderlab_reject_slot_identity_change() | trigger; no public execution grant | Cross-row / identity guards above. |

Exact candidate function grants — **not authorized to apply**; only after creation of the approved functions within one transaction. Verify the role inventory before execution. Trigger functions remain revoked.

```sql
-- NOT AUTHORIZED TO APPLY
REVOKE ALL ON FUNCTION public.renderlab_accept_generation_group(uuid,text,text,uuid,smallint,jsonb,bigint,bigint,bigint,uuid[],uuid[],bigint,bigint,bigint,timestamptz,jsonb)
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
REVOKE ALL ON FUNCTION public.renderlab_lookup_generation_group_acceptance(uuid,text,text)
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
REVOKE ALL ON FUNCTION public.renderlab_read_generation_group(uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
REVOKE ALL ON FUNCTION public.renderlab_claim_generation_groups(uuid,integer,integer)
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
REVOKE ALL ON FUNCTION public.renderlab_advance_generation_group(uuid,uuid,uuid,bigint,jsonb)
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
REVOKE ALL ON FUNCTION public.renderlab_stop_generation_group(uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
REVOKE ALL ON FUNCTION public.renderlab_release_generation_group_claim(uuid,uuid,uuid,bigint)
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
REVOKE ALL ON FUNCTION public.renderlab_validate_group_integrity()
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
REVOKE ALL ON FUNCTION public.renderlab_reject_group_identity_change()
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
REVOKE ALL ON FUNCTION public.renderlab_reject_slot_identity_change()
  FROM PUBLIC, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;
GRANT EXECUTE ON FUNCTION public.renderlab_accept_generation_group(uuid,text,text,uuid,smallint,jsonb,bigint,bigint,bigint,uuid[],uuid[],bigint,bigint,bigint,timestamptz,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.renderlab_lookup_generation_group_acceptance(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.renderlab_read_generation_group(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.renderlab_claim_generation_groups(uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.renderlab_advance_generation_group(uuid,uuid,uuid,bigint,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.renderlab_stop_generation_group(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.renderlab_release_generation_group_claim(uuid,uuid,uuid,bigint) TO service_role;
```

Existing `renderlab_reserve_generation_admission(uuid)` retains signature and caller grants but needs reviewed replacement body for the weighted formula. Both existing 0034 accept/lookup functions retain signature/return shape but require cross-ledger checks under their existing owner/key lock; a cross-kind replay returns conflict, not another result shape. Existing unkeyed acceptance still shares reserve path. Existing 0036 terminalize routine retains its single-child behavior and does not acquire group/owner locks after locking child. Do not change worker or provider payload. Existing deletion/export/finalizer needs a separately authorized group-aware update, including removal of slot bindings before reservations/jobs and retention of unresolved attempt identities until quiescence. No new public API or schema advertised until owner approves.

## 4. Lock ordering and race proof — not authorized to apply

Keyed accepts: advisory owner+key lock (same existing hash), matching acceptance record if present, owner access row, singleton settings row, parent, ordered slots, then existing child resources. Unkeyed ordinary reserve starts at owner row; never acquires key lock afterwards. Group stop and advance: owner access -> singleton settings if needed -> parent -> slot(s) ordered by index -> existing outbox row -> existing child job -> child reservation. Existing terminalization 0036 already locks outbox -> job -> reservation; it must not call back into a group lock. Parent advancement is separate durable reconciliation, not a callback inside terminalization. Claim sweep only locks group rows and commits before advance attempts. Account deletion must serialize owner/access lifecycle and parent fencing before child cleanup; existing account-deletion lock order must be reconciled with Admin's role/status locks before implementation, and deadlock-tested. Do not hold any lock over provider/HTTP/R2. Recovery after expired lease uses new token + version CAS, attaches to existing child attempt identity, never resends blindly. Terminal groups release occupancy only once every outstanding child is proven terminal; failed/cancelled/partial distinctions use durable child outcome, not asset visibility after deletion.

## 5. Disposable-PostgreSQL acceptance plan — not authorized to apply

Use the existing disposable PostgreSQL harness and migrations through recorded 0037; no hosted DB, secrets, provider execution or schema apply under this proposal. Future test cases must be written first and reproduce failure before an implementation. At least two independent connections with barrier-controlled transactions; assert rows, counts, exact identity, privileges and no residual locks after each rollback. Cases:

| Case | Setup / action | Required result |
| --- | --- | --- |
| Atomic rollback | Inject fault after parent, after slots, after job, after reservation and after outbox insert in separate runs | Zero new group/slot/job/reservation/outbox/key rows and no hourly debit after rollback. |
| Weighted limits | A=1,H=12; seed W=8 then N=4; W=9 then N=4; seed one live ordinary job; repeat with A=2 | 12 exactly accepts, 13 rejects, no partial rows, occupancy formula above. |
| Ordinary/group contention | Two connections barrier before owner lock: ordinary vs N=4, group vs group, distinct keys | At most approved capacity/weight commits; no overspend or deadlock; ordinary count excludes child rows. |
| Same key/replay | Concurrent same owner/key equal digest, differing digest/count, group vs ordinary, other owner same key; lookup during uncommitted acceptance | Identical replay identity, no extra debit; conflict without identity; other owner independent; in_flight not false absence. |
| Owner and RLS | Attempt foreign owner+job/reservation/parent link, owner reassignment, direct SELECT/DML and function EXECUTE as anon/authenticated/service_role/dispatcher/renderer | FK/guard rejects, direct table access revoked, only declared RPC privileges, own server read cannot leak foreign IDs. |
| Slot structure | N=2 with slot 2, missing slot 1, duplicate index/attempt/reservation, wrong seed, concurrent child 1+2, rebind existing child | Deferred validation/unique/identity guards reject; transaction rollback. |
| Budget/deadline | Exactly T/P boundary vs one ms short, near signed bigint seed wrap, stale caller input, unknown provider cost | Conservative budget fence, deterministic seeds, no start when short, no refund for ambiguity. |
| Cancel vs advance | Barrier on parent and reverse arrival; queued/running/persisting child; late cancel after final success | No child after stop commits; queued cancel authority preserved; persisting success retained; truthful partial/terminal classification. |
| Reconciliation | Commit child terminalization, kill controller before advance; expire/reclaim lease; concurrent duplicate advance with stale version | Single next child with stable IDs, no duplicate dispatch or spend; unknown child remains occupying. |
| Outbox | Simulate lost response, attach-only exhausted claim, deadline close, terminal job with asset conflict | Existing child invariants unchanged; never blind resend; no phantom release/terminalization. |
| Account deletion/export | Race begin deletion with group acceptance/advance; quiesce; export owner groups; delete active asset and terminal owner account | No new work after freeze; export owner only; deleted asset absent without rewriting success; finalizer refuses unresolved children and removes slots before referenced rows; no residual reservations. |
| Retention and legacy | Existing ordinary key replay and unkeyed admission; cleanup attempt on active/unknown group, terminal within rolling window, expired lease | Count=1 behavior unchanged; no unsafe prune or early quota refund; all grants accounted exactly once. |
| Lock order | Repeat terminalize/stop/advance, account freeze/Admin settings, ordinary reserve and group accept under opposite arrival | No deadlocks, no exceeded deadline/cap, no leaked locks; timeout is failure, not retry-to-green. |

## 6. Open risks and approval checklist — not authorized to apply

- Exact owner policy A/H/B/T/P/D, seed bounds, global queue cap/kill switch, usage attribution, no-refund policy, and unattended controller authority remain undecided. Do not infer them from local Studio timings or A10 estimates.
- Cross-ledger compatibility requires changing existing RPC bodies and deployment sequencing; old app must not silently bypass weighted admission; rollback must retain settlement/read/cancel for existing groups.
- Composite indexes on live legacy tables may lock/write-amplify; analyze cardinality, preflight uniqueness, migration lock/rollback design and verify grants/search_path before owner approval.
- Constraint triggers, full RPC bodies, immutable transition table and account finalizer/export integration need an implementation review and executable disposable tests. The SQL block is a schema candidate, not complete deployable migration.
- Account deletion lock ordering, unresolved provider attempts, worker crashes, R2/DB non-atomic persistence, bound reservation retention and group projection after asset deletion require explicit proof.
- Group-level occupancy can hold indefinitely if provider cannot prove terminal; alert and manual recovery policy required. No timeout-based blind release.
- No new provider contract or credentials; any unattended runner deployment/spend requires separate authority. Keep image count hidden pending all gates.

**Not authorized to apply any statement in this proposal.** No production or disposable database mutation, no migration file, no runtime code, no provider calls.
