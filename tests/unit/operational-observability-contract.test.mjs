import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("operational observability migration stays server-owned and privacy bounded", async () => {
  const migration = await source("supabase/migrations/0028_renderlab_operational_observability.sql");

  for (const table of ["renderlab_diagnostic_events", "renderlab_operational_alerts"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "i"));
  }

  assert.match(migration, /grant select, insert, delete on table public\.renderlab_diagnostic_events to service_role/i);
  assert.match(migration, /revoke all on sequence public\.renderlab_diagnostic_events_id_seq from public, anon, authenticated/i);
  assert.match(migration, /grant usage, select on sequence public\.renderlab_diagnostic_events_id_seq to service_role/i);
  assert.match(migration, /grant select, insert, update on table public\.renderlab_operational_alerts to service_role/i);
  assert.match(migration, /code text check \(code is null or code in \(/i);
  assert.match(migration, /occurred_at < pg_catalog\.now\(\) - interval '30 days'/i);
  assert.match(migration, /pg_catalog\.pg_advisory_xact_lock/i);
  assert.match(migration, /interval '60 minutes'/i);

  const diagnosticTable = migration.split("create table if not exists public.renderlab_diagnostic_events")[1]
    ?.split("create index if not exists renderlab_diagnostic_events_occurred_idx")[0] ?? "";
  for (const forbiddenColumn of ["prompt", "email", "owner_id", "storage_key", "provider_job_id", "worker_id", "user_agent", "ip_address"]) {
    assert(!new RegExp(`\\b${forbiddenColumn}\\b`, "i").test(diagnosticTable), `Diagnostic table must not store ${forbiddenColumn}.`);
  }
});

test("Admin diagnostic projection omits server-only job identity", async () => {
  const store = await source("src/server/observability/diagnostic-store.ts");
  const projection = store.split("export function adminDiagnosticProjection")[1]
    ?.split("export function adminOperationalAlertProjection")[0] ?? "";
  assert(projection.includes("correlationId: row.correlation_id"));
  assert(!projection.includes("job_id"));
  assert(!projection.includes("jobId"));
});

test("diagnostic filters are allowlisted before PostgREST query construction", async () => {
  const page = await source("src/app/(app)/admin/page.tsx");
  assert.match(page, /isDiagnosticEventName\(event\)/);
  assert.match(page, /isDiagnosticLevel\(level\)/);
  assert.match(page, /isDiagnosticCode\(code\)/);
  assert.match(page, /getAdminDashboard\(admin\.identity\.id, diagnosticQuery\)/);
});

test("configured Admin observability reads and direct fixtures stay run-owned when a test namespace is active", async () => {
  const store = await source("src/server/observability/diagnostic-store.ts");
  const verifier = await source("scripts/verify-admin-operations.mjs");
  assert.match(store, /params\.set\("correlation_id", `like\.\$\{testPrefix\}\*`\)/);
  assert.match(store, /params\.set\("alert_key", `like\.\$\{testPrefix\}\*`\)/);
  assert.match(verifier, /scopeObservabilityIdentifier\(`admin-health-\$\{runToken\}`, 64\)/);
  assert.match(verifier, /scopeObservabilityIdentifier\(`admin-health-\$\{runToken\}`, 80\)/);
});

test("durable persistence remains background observational work", async () => {
  const diagnostics = await source("src/server/observability/diagnostics.ts");
  assert.match(diagnostics, /await import\("next\/server"\)/);
  assert.match(diagnostics, /after\(async \(\) =>/);
  assert.match(diagnostics, /diagnostic_persistence_failed/);
  assert.match(diagnostics, /Diagnostics are observational and must never become a product correctness dependency/);
});
