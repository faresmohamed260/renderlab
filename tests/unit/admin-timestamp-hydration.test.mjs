import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { transformSync } = require("next/dist/build/swc");

// Render the actual AdminOperations source, not a copied date-format helper.
// The child receives the transpiled client component on stdin and server-renders
// it with deterministic synthetic dashboard data and inert UI/router dependencies.
const adminSource = readFileSync(new URL("../../src/features/admin/admin-operations.tsx", import.meta.url), "utf8");
const compiledAdmin = transformSync(adminSource, {
  filename: "src/features/admin/admin-operations.tsx",
  jsc: {
    parser: { syntax: "typescript", tsx: true },
    transform: { react: { runtime: "automatic" } },
    target: "es2022",
  },
  module: { type: "commonjs" },
}).code;

const renderScript = String.raw`
const { readFileSync } = require("node:fs");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

// Simulate different default browser locales without relying on installed
// operating-system locales. An explicitly selected locale is left unchanged.
const NativeDateTimeFormat = Intl.DateTimeFormat;
Intl.DateTimeFormat = class ConfigurableDefaultLocale extends NativeDateTimeFormat {
  constructor(locales, options) {
    super(locales ?? process.env.ADMIN_TEST_DEFAULT_LOCALE, options);
  }
};

const DisplayOnlyComponent = ({ children }) => React.createElement(React.Fragment, null, children);
const ui = new Proxy({}, {
  get: (_, name) => name === "__esModule" ? false : DisplayOnlyComponent,
});
function fixtureRequire(id) {
  if (id === "next/navigation") return { useRouter: () => ({ refresh() {} }) };
  if (id.endsWith(".module.css")) return {};
  if (id.startsWith("@/components/ui/")) return ui;
  return require(id);
}
const module = { exports: {} };
new Function("require", "module", "exports", readFileSync(0, "utf8"))(
  fixtureRequire,
  module,
  module.exports,
);

const nearMidnightUtc = "2026-11-23T23:55:00.000Z";
const bounded = { count: 0, truncated: false };
const snapshot = {
  accounts: [],
  invitations: [
    { id: "invite-valid", email: "fixture@example.invalid", role: "member", expiresAt: nearMidnightUtc, createdAt: nearMidnightUtc },
    { id: "invite-invalid", email: "invalid@example.invalid", role: "member", expiresAt: "invalid-date", createdAt: nearMidnightUtc },
  ],
  settings: { generationEnabled: true, maxActiveJobs: 1, maxJobsPerHour: 10, updatedAt: nearMidnightUtc },
  health: {
    windowHours: 24,
    since: nearMidnightUtc,
    activeJobs: 0,
    statusCounts: {},
    operationCounts: {},
    errorCodeCounts: {},
    recentJobs: {
      sampleSize: 0, truncated: false,
      completionTiming: { sampleCount: 0, p50Ms: null, p95Ms: null },
      failovers: { jobsWithFailover: 0, eventCount: 0 },
    },
    oldestActiveJob: {
      ageSeconds: null, status: null, warningSeconds: 3600, warning: false,
      byStatusSeconds: { queued: null, running: null, cancelling: null, persisting: null },
    },
    dispatchHealth: {
      oldestDueSeconds: 0, expiredClaims: 0, unresolved: 0,
      scheduledHeartbeatAgeSeconds: null, scheduledHeartbeatMissing: true,
    },
    activeStateAge: {
      sampleSize: 0, truncated: false, under15Minutes: 0, minutes15To60: 0,
      hours1To2: 0, over2Hours: 0,
    },
    capacity: {
      activeReservations: bounded, generationEnabled: true,
      maxActiveJobsPerAccount: 1, maxJobsPerHourPerAccount: 10,
    },
    maintenanceBacklog: {
      staleSourceCandidates: bounded, cleaningSources: bounded,
      staleUploadCandidates: bounded, cleaningUploads: bounded, pendingMediaPurges: bounded,
    },
    recentDiagnostics: {
      lookbackHours: 24, limit: 20, eventFilter: null, levelFilter: null,
      codeFilter: null, truncated: false,
      events: [{
        timestamp: nearMidnightUtc, event: "generation.submission", level: "info",
        correlationId: "fixture-correlation", operation: null, phase: null,
        status: null, code: null, durationMs: null, count: null,
        successCount: null, failureCount: null, attempt: null,
      }],
    },
    operationalAlerts: [{
      label: "Fixture alert", family: "fixture", severity: "warning", state: "open",
      firstSeenAt: nearMidnightUtc, lastSeenAt: nearMidnightUtc, occurrenceCount: 1,
      lastEvent: "fixture", lastCode: null, lastNotifiedAt: null,
    }],
  },
};

process.stdout.write(renderToStaticMarkup(
  React.createElement(module.exports.AdminOperations, {
    snapshot,
    actorUserId: "fixture-admin",
  }),
));
`;

function renderAdminIn(tz, defaultLocale) {
  const result = spawnSync(process.execPath, ["-e", renderScript], {
    input: compiledAdmin,
    encoding: "utf8",
    timeout: 15_000,
    maxBuffer: 4 * 1024 * 1024,
    env: {
      ...process.env,
      TZ: tz,
      ADMIN_TEST_DEFAULT_LOCALE: defaultLocale,
    },
  });
  assert.equal(result.status, 0, `SSR failed for ${tz}/${defaultLocale}: ${result.stderr || result.error?.message}`);
  assert.equal(result.stderr, "", `Unexpected server-render warning for ${tz}/${defaultLocale}`);
  return result.stdout;
}

test("AdminOperations SSR date text is identical across server time zones and default locales", () => {
  const utcEnglish = renderAdminIn("UTC", "en-US");
  const cairoGerman = renderAdminIn("Africa/Cairo", "de-DE");
  const utcGerman = renderAdminIn("UTC", "de-DE");
  const cairoEnglish = renderAdminIn("Africa/Cairo", "en-US");

  // The pre-fix Admin formatter uses the local timezone and default locale;
  // the near-midnight fixture crosses into the next day in Cairo.
  assert.equal(cairoGerman, utcEnglish, "Admin hydration would mismatch across timezone and locale");
  assert.equal(utcGerman, utcEnglish, "Admin hydration would mismatch across locale");
  assert.equal(cairoEnglish, utcEnglish, "Admin hydration would mismatch across timezone");
  assert.match(utcEnglish, /UTC/, "Visible Admin timestamp text must identify UTC");
  assert.match(utcEnglish, /invalid-date/, "Invalid timestamps must retain the original fallback");
});
