# Local backend demo — zero credentials, zero provider spend

**Audience:** first-hour contributors, reviewers and hiring engineers. **Purpose:** a deterministic walkthrough of the existing FIBO image-job lifecycle, not a local production server or proof of real SQL isolation.

## Quick start

Use Node 24.x and npm 11.x. After cloning and installing with `npm ci --no-audit --no-fund`:

```bash
npm run demo:backend
npm run demo:backend -- --scenario owner-return-settlement
npm run demo:backend -- --scenario process-exit --json
npm run test:unit
```

The default is **success**. Available names: `success`, `admission-denied`, `cancel-mid-run`, `provider-terminal-failure`, `process-exit`, `ambiguous-then-recovery`, and `owner-return-settlement`. Use `--help` for CLI syntax. JSON mode emits a stable `schemaVersion: 1` object: scenario, fixed clock, numbered lifecycle events, final state/counters, and sanitized database/provider trace operations. No addresses, provider tokens, real user IDs, timing metrics, or random IDs are printed.

## What the timeline demonstrates

1. **Submit and admission:** the actual Next.js POST route validates a fixture FIBO image request and reserves a fake owner-scoped admission slot (or responds 429 without creating a job).
2. **Durable outbox and dispatch:** the application submit code records the fake queued job/outbox, and the Next.js `after()` callback wakes the fake Modal dispatch gateway.
3. **Provider result and reconciliation:** the same production polling/reconciliation modules consume fake 200/404/409/422 outcomes. The 409 is the exact `FIBO_PROCESS_EXITED` mapping.
4. **Persist, settle and release:** success writes a fake R2 primary object and thumbnail plus one fake media row, reaches `succeeded`, and releases the admission reservation. Failure and cancellation reach their correct terminal states without media.
5. **Recovery:** ambiguous 404 leaves the job running until the later fake ready response; owner return on Activity recovers a crash after the primary R2 write without another provider poll.

**Important trace semantics:** numbered timeline entries group observable stages and effects; actual low-level read/write ordering is available in the JSON `trace` array. Several stages happen within one reconciliation call, so an event row is **not** a separately timed transaction.

The CLI imports `tests/helpers/generation-critical-path-runtime.mjs` unchanged. Its fixed clock, in-memory PostgREST/R2, provider fake, deterministic UUIDs and fail-closed unknown-network handler are shared with `tests/unit/generation-critical-path-offline.test.mjs`. The CLI's own `tests/unit/backend-demo.test.mjs` executes all seven scenarios twice in separate Node processes and checks outcome, ordered phases, trace predicates, and release/media counters.

## Boundaries and honest claims

This is a **secret-free application-orchestration demonstration** of imported production logic, **not** an isolated Supabase PostgreSQL integration, real transaction/CAS proof, Modal GPU run, production fixture, browser app or always-on finalization. It does not test private credentials, cross-process dispatch race guarantees, cloud object-store durability or an unattended user who never returns. See [P0-05 test map](../audits/P0_05_DETERMINISTIC_CRITICAL_PATH_TEST_MAP_2026-11-23.md), [state-machine invariants](../architecture/P0_04_GENERATION_STATE_MACHINE_SPEC.md), and the [technical claims sheet](../TECHNICAL_CLAIMS.md). No deployment, network, Docker, external account or GPU is required.
