import { createHash, randomUUID } from "node:crypto";
import { operationalAlertCandidateForEvent } from "../src/server/observability/operational-alerts.ts";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
} from "./lib/configured-test-account.mjs";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const rawNamespace = process.env.RENDERLAB_TEST_OBSERVABILITY_NAMESPACE?.trim().toLowerCase();
const cleanupOnly = process.argv.includes("--cleanup-only");
const memberIdentity = configuredTestAccountIdentity("operational-observability-member");

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  RENDERLAB_TEST_OBSERVABILITY_NAMESPACE: rawNamespace,
})) {
  if (!value) throw new Error(`${name} is required for operational observability verification.`);
}

const namespace = rawNamespace.replace(/[^a-z0-9_.:-]/g, "_").slice(0, 20);
if (!namespace) throw new Error("Observability verifier namespace normalized to an empty value.");
const prefix = `test.${namespace}.`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function scoped(value, maxLength = 64) {
  if (prefix.length + value.length <= maxLength) return `${prefix}${value}`;
  const digest = createHash("sha256").update(value).digest("hex");
  return `${prefix}${digest.slice(0, maxLength - prefix.length)}`;
}

function accountCorrelation(userId) {
  const raw = createHash("sha256").update(`renderlab:account-lifecycle:${userId}`).digest("hex").slice(0, 24);
  return scoped(raw);
}

async function rest(path, init = {}, token = serviceRoleKey, apikey = serviceRoleKey) {
  const headers = new Headers(init.headers);
  headers.set("apikey", apikey);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function expectOk(response, label) {
  if (!response.ok) throw new Error(`${label} (${response.status}): ${await response.text()}`);
  return response;
}

async function jsonRows(path) {
  return expectOk(await rest(path), `Observability query ${path}`).then((response) => response.json());
}

async function insertDiagnostic(row) {
  const response = await expectOk(await rest("renderlab_diagnostic_events?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  }), "Insert diagnostic fixture");
  const rows = await response.json();
  assert(rows.length === 1, "Diagnostic fixture insert did not return exactly one row.");
  return rows[0];
}

async function recordAlert({ key, family, severity, event, code, seenAt }) {
  const response = await expectOk(await rest("rpc/renderlab_record_operational_alert", {
    method: "POST",
    body: JSON.stringify({
      p_alert_key: scoped(key, 80),
      p_family: family,
      p_severity: severity,
      p_event: event,
      p_code: code ?? null,
      p_seen_at: seenAt,
    }),
  }), `Record ${family} alert`);
  const rows = await response.json();
  assert(rows.length === 1, `${family} alert RPC did not return exactly one row.`);
  return rows[0];
}

async function cleanup() {
  await expectOk(await rest("rpc/renderlab_cleanup_test_operational_observability", {
    method: "POST",
    body: JSON.stringify({ p_prefix: prefix }),
  }), "Clean run-owned observability fixtures");
  await deleteConfiguredTestAccount(memberIdentity).catch(() => {});
}

if (cleanupOnly) {
  await cleanup();
  console.log(`Operational observability cleanup completed namespace=${namespace}.`);
  process.exit(0);
}

let member;
try {
  await cleanup();
  member = await createConfiguredTestAccount("operational-observability-member");

  const anonResponse = await rest("renderlab_diagnostic_events?select=id&limit=1", {}, publishableKey, publishableKey);
  assert(!anonResponse.ok, `Anonymous Data API unexpectedly read diagnostics (${anonResponse.status}).`);
  const memberResponse = await rest("renderlab_operational_alerts?select=alert_key&limit=1", {}, member.accessToken, publishableKey);
  assert(!memberResponse.ok, `Authenticated member unexpectedly read operational alerts (${memberResponse.status}).`);

  const oldCorrelation = scoped("retention-old");
  await insertDiagnostic({
    occurred_at: new Date(Date.now() - 31 * 24 * 60 * 60_000).toISOString(),
    event: "maintenance.pass",
    level: "info",
    correlation_id: oldCorrelation,
    phase: "source-claims",
    count: 1,
    success_count: 1,
    failure_count: 0,
  });
  await expectOk(await rest("rpc/renderlab_prune_diagnostic_events", {
    method: "POST",
    body: JSON.stringify({ p_limit: 2000 }),
  }), "Prune retained diagnostics");
  const oldRows = await jsonRows(`renderlab_diagnostic_events?correlation_id=eq.${encodeURIComponent(oldCorrelation)}&select=id`);
  assert(oldRows.length === 0, "31-day diagnostic fixture survived bounded retention pruning.");

  const now = Date.now();
  let generationAlert = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const seenAt = new Date(now + attempt * 1000).toISOString();
    const event = {
      event: "generation.reconciliation",
      level: "warn",
      timestamp: seenAt,
      correlationId: scoped(`generation-${attempt}`),
      operation: "create-video",
      phase: "stalled",
      status: "running",
      code: "generation_provider_stalled",
      attempt,
    };
    await insertDiagnostic({
      occurred_at: event.timestamp,
      event: event.event,
      level: event.level,
      correlation_id: event.correlationId,
      operation: event.operation,
      phase: event.phase,
      status: event.status,
      code: event.code,
      attempt: event.attempt,
    });
    const providerFailures = await jsonRows(
      `renderlab_diagnostic_events?correlation_id=like.${encodeURIComponent(prefix)}*&event=in.(generation.submission,generation.reconciliation)&code=eq.generation_provider_stalled&select=id&limit=3`,
    );
    const candidate = operationalAlertCandidateForEvent(event, providerFailures.length);
    if (candidate) {
      generationAlert = await recordAlert({
        key: candidate.alertKey,
        family: candidate.family,
        severity: candidate.severity,
        event: event.event,
        code: event.code,
        seenAt,
      });
      if (attempt === 3) assert(generationAlert.should_notify === true, "Third provider failure did not claim initial notification.");
      if (attempt === 4) assert(generationAlert.should_notify === false, "Provider alert cooldown allowed duplicate notification inside 60 minutes.");
    } else {
      const premature = await jsonRows(`renderlab_operational_alerts?alert_key=eq.${encodeURIComponent(scoped("generation-provider-degradation", 80))}&select=alert_key`);
      assert(premature.length === 0, `Provider degradation alert opened before threshold at attempt ${attempt}.`);
    }
  }
  assert(generationAlert?.occurrence_count === 2, `Generation alert dedupe count was not 2: ${JSON.stringify(generationAlert)}.`);

  const maintenanceSeenAt = new Date(now + 10_000).toISOString();
  const maintenanceEvent = {
    event: "maintenance.pass",
    level: "error",
    timestamp: maintenanceSeenAt,
    correlationId: scoped("maintenance-failure"),
    phase: "media-purges",
    count: 1,
    successCount: 0,
    failureCount: 1,
  };
  await insertDiagnostic({
    occurred_at: maintenanceEvent.timestamp,
    event: maintenanceEvent.event,
    level: maintenanceEvent.level,
    correlation_id: maintenanceEvent.correlationId,
    phase: maintenanceEvent.phase,
    count: maintenanceEvent.count,
    success_count: maintenanceEvent.successCount,
    failure_count: maintenanceEvent.failureCount,
  });
  const maintenanceCandidate = operationalAlertCandidateForEvent(maintenanceEvent);
  assert(maintenanceCandidate?.family === "maintenance-failure", "Production classifier did not classify maintenance failure.");
  const maintenanceAlert = await recordAlert({
    key: maintenanceCandidate.alertKey,
    family: maintenanceCandidate.family,
    severity: maintenanceCandidate.severity,
    event: maintenanceEvent.event,
    seenAt: maintenanceSeenAt,
  });
  assert(maintenanceAlert.should_notify === true, "Maintenance failure did not claim its first notification.");

  const rawUserId = randomUUID();
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const seenAt = new Date(now + 20_000 + attempt * 1000).toISOString();
    const deletionEvent = {
      event: "account.data_lifecycle",
      level: attempt >= 3 ? "error" : "warn",
      timestamp: seenAt,
      correlationId: accountCorrelation(rawUserId),
      phase: "deletion-retry",
      code: "account_deletion_retryable",
      attempt,
    };
    await insertDiagnostic({
      occurred_at: deletionEvent.timestamp,
      event: deletionEvent.event,
      level: deletionEvent.level,
      correlation_id: deletionEvent.correlationId,
      phase: deletionEvent.phase,
      code: deletionEvent.code,
      attempt: deletionEvent.attempt,
    });
    const deletionCandidate = operationalAlertCandidateForEvent(deletionEvent);
    if (attempt < 3) assert(deletionCandidate === null, `Deletion retry ${attempt} alerted before threshold.`);
    if (attempt === 3) {
      assert(deletionCandidate?.family === "account-deletion-stuck", "Production classifier did not classify third deletion retry.");
      const deletionAlert = await recordAlert({
        key: deletionCandidate.alertKey,
        family: deletionCandidate.family,
        severity: deletionCandidate.severity,
        event: deletionEvent.event,
        code: deletionEvent.code,
        seenAt,
      });
      assert(deletionAlert.should_notify === true && deletionAlert.severity === "critical", "Third deletion retry did not open a critical alert.");
    }
  }

  const ordinaryEvent = {
    event: "generation.submission",
    level: "warn",
    timestamp: new Date(now + 30_000).toISOString(),
    correlationId: scoped("ordinary-rate-limit"),
    operation: "create-image",
    phase: "rejected",
    code: "generation_rate_limit_reached",
  };
  assert(operationalAlertCandidateForEvent(ordinaryEvent, 99) === null, "Production classifier alerted on ordinary rate-limit rejection.");
  await insertDiagnostic({
    occurred_at: ordinaryEvent.timestamp,
    event: ordinaryEvent.event,
    level: ordinaryEvent.level,
    correlation_id: ordinaryEvent.correlationId,
    operation: ordinaryEvent.operation,
    phase: ordinaryEvent.phase,
    code: ordinaryEvent.code,
  });

  const diagnosticRows = await jsonRows(`renderlab_diagnostic_events?correlation_id=like.${encodeURIComponent(prefix)}*&select=correlation_id,event,level,operation,phase,status,code,duration_ms,count,success_count,failure_count,attempt&order=occurred_at.asc`);
  const alertRows = await jsonRows(`renderlab_operational_alerts?alert_key=like.${encodeURIComponent(prefix)}*&select=alert_key,family,severity,state,occurrence_count,last_notified_at&order=alert_key.asc`);
  assert(alertRows.length === 3, `Expected exactly three run-owned operational alerts, got ${JSON.stringify(alertRows)}.`);
  assert(!JSON.stringify(diagnosticRows).includes(rawUserId), "Raw account identity leaked into durable diagnostics.");
  assert(!alertRows.some((row) => row.alert_key.includes("ordinary-rate-limit")), "Ordinary rate-limit event opened an operational alert.");

  console.log(`Operational observability verification passed namespace=${namespace} diagnostics=${diagnosticRows.length} alerts=${alertRows.length}.`);
} finally {
  await cleanup();
}
