# Disposable PostgreSQL migration and state-machine conformance gate

**Scope:** test-only, optional GitHub Actions job; 23 November 2026. **Authority:** the [P0-04 state-machine inventory](../architecture/P0_04_GENERATION_STATE_MACHINE_SPEC.md), [P0-03 trust/privileges contract](../architecture/P0_03_TRUST_BOUNDARIES_AND_OWNER_ISOLATION_CONTRACT.md), and [P0-07 atomic terminalization design](../audits/P0_07_ATOMIC_TERMINALIZE_RELEASE_DESIGN_2026-11-23.md). This gate makes no schema, production, migration, provider, or application changes.

## Run it

The [optional workflow](../../.github/workflows/database-conformance.yml) runs on pull requests and main pushes that change migration files, the job-state model, or this gate's scripts/fixtures; it also supports manual dispatch. It is **not** a protected-main required check. The Ubuntu runner starts its own **PostgreSQL 17 Alpine service container**, installs a PostgreSQL client if needed, and runs:

```sh
PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres PGDATABASE=renderlab_conformance \
  PGPASSWORD=<temporary-local-test-password> node scripts/verify-database-conformance.mjs
```

Use only a newly created disposable PostgreSQL 17 database named `renderlab_conformance`, hosted on loopback. The script refuses any other database, remote host, or user. It requires a disposable superuser only to bootstrap roles and execute migration 0030's CREATEROLE/ALTER ROLE operations. There is **no Supabase URL, API key, service account, Docker socket, or production secret** in the workflow. The workflow's password is a literal, fixed **container-only testing credential**, not an application credential.

## Feasibility and test-only Supabase shims

At this checkpoint the repository has 33 migrations. Their bootstrap prerequisites, beyond a stock PostgreSQL instance, are: `anon`, `authenticated` and `service_role` role names for grants and revokes; `auth.users(id,email)` for foreign keys and invitation checks; `auth.sessions(user_id,created_at,updated_at,refreshed_at,user_agent)` for the session projection; `auth.uid()` as a minimal request-claim compatibility stub; and `pgcrypto` for compatibility (UUID generation is also built into PostgreSQL 17). Migration 0030 creates and restricts `renderlab_modal_dispatcher` and `renderlab_modal_worker` itself. A disposable `service_role` has BYPASSRLS to model the hosted Supabase trust boundary, while the test still checks explicit table/function grants. All bootstrap objects live in [disposable-supabase-bootstrap.sql](../../tests/fixtures/disposable-supabase-bootstrap.sql), **never under `supabase/migrations`**. This is a minimal shim, not a Supabase Auth emulator or proof of Supabase-managed privileges/default grants.

The runner discovers every numbered `supabase/migrations/*.sql` in filename order, applies each within a transaction together with its SHA-256 tracking marker, and fails on any migration error or existing-file checksum drift. A second pass checks **every existing marker** and executes no DDL. This proves rerun safety of the **migration runner**; it does *not* claim all historical migration SQL is independently reentrant if manually executed twice.

## Evidence and expected gaps

The [SQL conformance fixture](../../tests/fixtures/database-conformance.sql), inside a single rolled-back transaction, proves:

- Mandatory tables and RLS are present, owner identity is NOT NULL, eight job statuses are in the SQL CHECK, durable output and admission uniqueness indexes exist, and invalid status values fail the CHECK.
- Public/browser role read and function EXECUTE denial on selected protected tables and RPCs; server-role access to admission procedures.
- **All 64 ordered state pairs**, generated directly from [the pure TypeScript transition module](../../src/lib/capabilities/generation-job-state-machine.ts), run as real SQL updates. Policy-allowed and idempotent pairs must be accepted.
- Actual admission reservation, bind, owner-return terminal settlement, first release versus replay, owner-scoped reconciliation claim/release, and durable dispatch acceptance/claim/queued cancel procedures use only synthetic fixture UUIDs, with no external provider calls.

**Named expected gap — `P0_07_GENERIC_UPDATE`:** PostgreSQL's current job status CHECK constrains status *values*, not all 64 transition edges. A raw internal SQL UPDATE can move a terminal row back to active even though the pure model forbids this. The application has separately introduced expected-status CAS protections, but a generic DB update is still not globally guarded. Every policy-forbidden edge accepted by SQL is counted and logged as an expected gap; this is not presented as policy conformance.

**Named expected gap — `P0_07_NONATOMIC_RELEASE`:** a bound admission reservation remains held after a separately committed generic status transition to `failed`. The later admission RPC can release it on owner return, and repeated unbound release is idempotent; no existing global transactional RPC guarantees atomic terminalization plus release. Both gaps link to the [P0-07 design, not an implemented migration](../audits/P0_07_ATOMIC_TERMINALIZE_RELEASE_DESIGN_2026-11-23.md). If the database changes to enforce previously missing edges, the test requires an explicit review and replacement of the expected-gap assertion.

## Actions budget and cancellation

One Linux runner, one Postgres service, **14-minute hard timeout**, path-filtered events and no `npm ci` (Node 24 reads the pure TypeScript module directly). `cancel-in-progress: true` is safe because every run owns only its ephemeral service container and checkout: there are no shared test accounts, storage buckets, reservations, credentials, provider requests, or cleanup obligations outside that container. A cancelled run discards its database with the job. See [AGENTS.md](../../AGENTS.md) under GitHub Actions Budget Discipline and [Infrastructure](../architecture/INFRASTRUCTURE.md).
