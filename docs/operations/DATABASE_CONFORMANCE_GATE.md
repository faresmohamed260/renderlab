# Disposable PostgreSQL migration and state-machine conformance gate

**Scope:** optional GitHub Actions conformance job; updated 23 November 2026. **Authority:** the [P0-04 state-machine inventory](../architecture/P0_04_GENERATION_STATE_MACHINE_SPEC.md), [P0-03 trust/privileges contract](../architecture/P0_03_TRUST_BOUNDARIES_AND_OWNER_ISOLATION_CONTRACT.md), and [P0-07 atomic terminalization design](../audits/P0_07_ATOMIC_TERMINALIZE_RELEASE_DESIGN_2026-11-23.md). This gate applies all checked-in migrations only to a disposable PostgreSQL service. The additive 0031 RPC migration is a separately reviewed repository artifact, not a hosted Supabase operation. A merge does **not** apply it to production.

## Run it

The [optional workflow](../../.github/workflows/database-conformance.yml) runs on pull requests and main pushes that change migration files, the job-state model, or this gate's scripts/fixtures; it also supports manual dispatch. It is **not** a protected-main required check. The Ubuntu runner starts its own **PostgreSQL 17 Alpine service container**, installs a PostgreSQL client if needed, and runs:

```sh
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=renderlab_conformance \
  PGPASSWORD=<temporary-local-test-password> node scripts/verify-database-conformance.mjs
```

Use only a newly created disposable PostgreSQL 17 database named `renderlab_conformance`, hosted on loopback. The script refuses any other database, remote host, or user. It requires a disposable superuser only to bootstrap roles and execute migration 0030's CREATEROLE/ALTER ROLE operations. There is **no Supabase URL, API key, service account, Docker socket, or production secret** in the workflow. The workflow's password is a literal, fixed **container-only testing credential**, not an application credential.

## Feasibility and test-only Supabase shims

With additive migration 0031, the repository has 34 migrations. Their bootstrap prerequisites, beyond a stock PostgreSQL instance, are: `anon`, `authenticated` and `service_role` role names for grants and revokes; `auth.users(id,email)` for foreign keys and invitation checks; `auth.sessions(user_id,created_at,updated_at,refreshed_at,user_agent)` for the session projection; `auth.uid()` as a minimal request-claim compatibility stub; and `pgcrypto` for compatibility (UUID generation is also built into PostgreSQL 17). Migration 0030 creates and restricts `renderlab_modal_dispatcher` and `renderlab_modal_worker` itself. A disposable `service_role` has BYPASSRLS to model the hosted Supabase trust boundary, while the test still checks explicit table/function grants. All bootstrap objects live in [disposable-supabase-bootstrap.sql](../../tests/fixtures/disposable-supabase-bootstrap.sql), **never under `supabase/migrations`**. This is a minimal shim, not a Supabase Auth emulator or proof of Supabase-managed privileges/default grants.

The runner discovers every numbered `supabase/migrations/*.sql` in filename order, applies each within a transaction together with its SHA-256 tracking marker, and fails on any migration error or existing-file checksum drift. A second pass checks **every existing marker** and executes no DDL. This proves rerun safety of the **migration runner**; it does *not* claim all historical migration SQL is independently reentrant if manually executed twice.

## Evidence and expected gaps

The [SQL conformance fixture](../../tests/fixtures/database-conformance.sql), inside a single rolled-back transaction, proves:

- Mandatory tables and RLS are present, owner identity is NOT NULL, eight job statuses are in the SQL CHECK, durable output and admission uniqueness indexes exist, and invalid status values fail the CHECK.
- Public/browser role read and function EXECUTE denial on selected protected tables and RPCs; server-role access to admission procedures.
- **All 64 ordered state pairs**, generated directly from [the pure TypeScript transition module](../../src/lib/capabilities/generation-job-state-machine.ts), run as real SQL updates. Policy-allowed and idempotent pairs must be accepted.
- Actual admission reservation, bind, owner-return terminal settlement, first release versus replay, owner-scoped reconciliation claim/release, and durable dispatch acceptance/claim/queued cancel procedures use only synthetic fixture UUIDs, with no external provider calls.

**New 0031 RPC verification:** [atomic-terminalize-conformance.sql](../../tests/fixtures/atomic-terminalize-conformance.sql) executes the *new function* against all 24 pure-model terminal edges (the 8×3 subset of the 64 matrix), covering allowed application, forbidden conflict, same-status idempotence, owner isolation, valid/forged reconciliation claims, missing canonical output, a bound reservation released exactly once, a missing historical reservation, and an injected exception after the job update that rolls back both writes. [verify-atomic-terminalize-concurrency.mjs](../../scripts/verify-atomic-terminalize-concurrency.mjs) runs **two independent PostgreSQL sessions** and confirms a real row-lock wait before releasing the first transaction. It tests failed-vs-success, success-vs-failed, duplicate success, and cancelled-vs-success, asserting one winner, no contradictory status/output, one reservation release, and a replay after an assumed lost response. The success branch requires existing same-owner indexed media at output slot 0; the RPC has no provider or R2 I/O.

**Rollout rule:** merge 0031 with its green database proof, but do not apply it anywhere real or deploy a caller until the owner-authorized migration operation. The old application and its functions remain unchanged. **Migration first, application deployment second.** The 0031 function's scoped atomicity is not a global guarantee while generic PATCH, admission bind and queued outbox cancellation still use the old paths.

**Named expected gap — `P0_07_GENERIC_UPDATE`:** PostgreSQL's current job status CHECK constrains status *values*, not all 64 transition edges. A raw internal SQL UPDATE can move a terminal row back to active even though the pure model forbids this. The application has separately introduced expected-status CAS protections, but a generic DB update is still not globally guarded. Every policy-forbidden edge accepted by SQL is counted and logged as an expected gap; this is not presented as policy conformance.

**Named expected gap — `P0_07_NONATOMIC_RELEASE`:** a bound admission reservation remains held after a separately committed generic status transition to `failed`. The later admission RPC can release it on owner return, and repeated unbound release is idempotent; legacy SQL writes remain independent; the **new 0031 RPC** does release atomically when called. Both old-path gaps link to the [P0-07 design](../audits/P0_07_ATOMIC_TERMINALIZE_RELEASE_DESIGN_2026-11-23.md). If the database changes to enforce previously missing edges, the test requires an explicit review and replacement of the expected-gap assertion.

## Actions budget and cancellation

One Linux runner, one Postgres service, **14-minute hard timeout**, path-filtered events and no `npm ci` (Node 24 reads the pure TypeScript module directly). `cancel-in-progress: true` is safe because every run owns only its ephemeral service container and checkout: there are no shared test accounts, storage buckets, reservations, credentials, provider requests, or cleanup obligations outside that container. A cancelled run discards its database with the job. See [AGENTS.md](../../AGENTS.md) under GitHub Actions Budget Discipline and [Infrastructure](../architecture/INFRASTRUCTURE.md).


## P0-07 PR B application switch — held until a coordinated release

**Repository state, not deployed state:** PR A's additive migration `0031_atomic_generation_terminalize_release.sql` is merged, but merging does **not** install its function on the shared Supabase project. PR B introduces an application-only adapter in `src/server/generation/atomic-terminalization.ts` for reviewed completion/failure, stale-dispatch failure and in-flight cancellation. The old queued-before-dispatch cancel RPC and owner-return legacy reservation cleanup remain compatibility exceptions; the system must not claim a global invariant while those writers remain.

**Required rollout order:** (1) separately authorize and apply migration 0031 through the approved hosted Supabase migration operation; (2) read back function signature, `service_role` execute grant, browser-role denials and current live job/reservation state; (3) separately authorize and qualify the exact PR B application SHA against all protected checks and CodeQL; (4) stage, verify and promote the Vercel release under the production release runbook; (5) run only separately approved hosted lifecycle smoke, document rollback and synchronize the canonical release record. Do **not** infer installation, a deploy, or live safety from either Git merge or disposable CI.

**Mixed-version compatibility:** before migration application, a PostgreSQL/PostgREST missing-function response for this literal, service-only RPC allows the caller to fall back to its original expected-status PATCH followed by the existing idempotent release path. An installed RPC that reports `conflict` or `not_found` is **not** a fallback; the application rereads the owner-scoped row and retains the existing already-terminal-or-changed outcome. Other database failures and timeouts fail closed rather than silently retrying a non-atomic mutation. PR B has no authority to apply migrations, change hosted grants, deploy or run production workflows. If the release must be rolled back, restore the known-good Vercel alias and **leave the additive function installed** for any in-flight callers until full absence is proven.

**Evidence:** the Unit 5 deterministic harness exercises atomic success and cancellation, the uninstalled-RPC fallback and an installed-RPC failure; the existing 64-edge policy tests and disposable 24-terminal-edge/4-race PostgreSQL tests remain separate authorities. No provider generation is part of this PR.
