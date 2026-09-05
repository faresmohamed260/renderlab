import { chromium } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import {
  createConfiguredTestAccount,
  configuredTestAccountIdentity,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const artifactDir = process.env.RENDERLAB_ADMIN_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const runToken = process.env.GITHUB_RUN_ID || "local";
const settingsBaselinePath = `/tmp/renderlab-admin-settings-${runToken}.json`;

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
})) {
  if (!value) throw new Error(`${name} is required for configured Admin Operations verification.`);
}

function fixtureUuid(namespace) {
  const hex = createHash("sha256")
    .update(`renderlab-admin-operations-${runToken}-${namespace}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

const outsider = {
  id: fixtureUuid("auth-only-outsider"),
  email: `renderlab-admin-outsider-${runToken}@example.com`,
  password: `RenderLab-Admin-Outsider-${runToken}-Pass!`,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function expectOk(response, label) {
  if (!response.ok) {
    throw new Error(`${label} (${response.status}): ${await response.text()}`);
  }
  return response;
}

async function appRequest(path, account, init = {}) {
  return fetch(`${baseUrl}${path}`, withAccountAuthorization(account, init));
}

async function json(response) {
  return response.json().catch(() => null);
}

async function deleteInvitationEmail(email) {
  await expectOk(
    await serviceRest(`renderlab_beta_invitations?normalized_email=eq.${encodeURIComponent(email.toLowerCase())}`, {
      method: "DELETE",
    }),
    `Could not clean invitation ${email}`,
  );
}

async function deleteOutsider() {
  await expectOk(
    await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(outsider.id)}`, { method: "DELETE" }),
    "Could not clean outsider access",
  );
  const response = await authAdmin(`users/${encodeURIComponent(outsider.id)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not clean outsider Auth fixture (${response.status}): ${await response.text()}`);
  }
}

async function createOutsider() {
  await deleteOutsider();
  const response = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      id: outsider.id,
      email: outsider.email,
      password: outsider.password,
      email_confirm: true,
      app_metadata: {
        renderlab_fixture: "admin-operations-auth-only",
        run: runToken,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not create outsider Auth fixture (${response.status}): ${await response.text()}`);
  }
}

function settingsShape(row) {
  return {
    singleton_id: row.singleton_id,
    generation_enabled: row.generation_enabled,
    max_active_jobs: row.max_active_jobs,
    max_jobs_per_hour: row.max_jobs_per_hour,
    updated_by: row.updated_by ?? null,
    updated_at: row.updated_at,
  };
}

async function readGenerationSettings() {
  const response = await expectOk(
    await serviceRest("renderlab_beta_settings?singleton_id=eq.1&select=singleton_id,generation_enabled,max_active_jobs,max_jobs_per_hour,updated_by,updated_at&limit=1"),
    "Could not read Admin generation settings baseline",
  );
  const result = await response.json();
  assert(result?.[0], "Admin generation settings singleton is missing.");
  return settingsShape(result[0]);
}

async function captureGenerationSettingsBaseline() {
  const baseline = await readGenerationSettings();
  await writeFile(settingsBaselinePath, JSON.stringify(baseline), "utf8");
  return baseline;
}

async function restoreGenerationSettingsBaseline(baseline) {
  if (!baseline) return;
  await expectOk(
    await serviceRest("renderlab_beta_settings?singleton_id=eq.1", {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        generation_enabled: baseline.generation_enabled,
        max_active_jobs: baseline.max_active_jobs,
        max_jobs_per_hour: baseline.max_jobs_per_hour,
        updated_by: baseline.updated_by,
        updated_at: baseline.updated_at,
      }),
    }),
    "Could not restore Admin generation settings baseline",
  );
  const restored = await readGenerationSettings();
  assert(JSON.stringify(restored) === JSON.stringify(baseline), "Admin generation settings baseline was not restored exactly.");
  await rm(settingsBaselinePath, { force: true });
}

async function restoreGenerationSettingsBaselineFromFile() {
  try {
    const baseline = JSON.parse(await readFile(settingsBaselinePath, "utf8"));
    await restoreGenerationSettingsBaseline(baseline);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function setAccountAccess(userId, patch) {
  await expectOk(
    await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }),
    `Could not seed RenderLab account access ${userId}`,
  );
}

async function seedHealthJobs(ownerId) {
  const now = Date.now();
  const failedCreatedAt = new Date(now - 30_000).toISOString();
  const failedCompletedAt = new Date(now - 10_000).toISOString();
  const activeAt = new Date(now - 20 * 60_000).toISOString();
  const staleAt = new Date(now - 30 * 60 * 60_000).toISOString();
  const cleaningAt = new Date(now - 20 * 60_000).toISOString();
  const secretMarker = `raw-provider-marker-${runToken}`;
  const storageMarker = `private-storage-marker-${runToken}`;
  const contentMarker = `private-content-marker-${runToken}`;

  await expectOk(
    await serviceRest("generation_jobs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          owner_id: ownerId,
          status: "failed",
          operation: "create-image",
          output_kind: "image",
          prompt: `private prompt ${secretMarker}`,
          workflow_id: `private-workflow-${runToken}`,
          model: `private-model-${runToken}`,
          ecosystem: "private-ecosystem",
          inputs: [],
          parameters: {},
          worker_id: `private-worker-${runToken}`,
          provider_job_id: `private-provider-job-${runToken}`,
          error_code: "WORKER_CREDIT_EXHAUSTED",
          error_message: `raw backend error ${secretMarker}`,
          failover_history: [{
            kind: "unavailable",
            workerId: `private-worker-${runToken}`,
            at: failedCompletedAt,
          }],
          created_at: failedCreatedAt,
          updated_at: failedCompletedAt,
          completed_at: failedCompletedAt,
        },
        {
          owner_id: ownerId,
          status: "queued",
          operation: "create-video",
          output_kind: "video",
          prompt: `active private prompt ${secretMarker}`,
          workflow_id: `active-private-workflow-${runToken}`,
          model: `active-private-model-${runToken}`,
          ecosystem: "private-ecosystem",
          inputs: [],
          parameters: {},
          worker_id: null,
          provider_job_id: null,
          error_code: null,
          error_message: null,
          failover_history: [],
          created_at: activeAt,
          updated_at: activeAt,
          completed_at: null,
        },
      ]),
    }),
    "Could not seed Admin health fixture jobs",
  );

  await expectOk(
    await serviceRest("generation_admission_reservations", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        owner_id: ownerId,
        expires_at: new Date(now + 30 * 60_000).toISOString(),
      }),
    }),
    "Could not seed Admin health admission fixture",
  );

  const staleSourceId = randomUUID();
  const cleaningSourceId = randomUUID();
  await expectOk(
    await serviceRest("generation_sources", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          id: staleSourceId,
          owner_id: ownerId,
          storage_key: `renderlab/admin-health/${storageMarker}/stale-source-${staleSourceId}.png`,
          filename: `${contentMarker}-stale.png`,
          mime_type: "image/png",
          size_bytes: 1,
          purpose: "reference",
          status: "ready",
          metadata: { private: contentMarker },
          created_at: staleAt,
          updated_at: staleAt,
        },
        {
          id: cleaningSourceId,
          owner_id: ownerId,
          storage_key: `renderlab/admin-health/${storageMarker}/cleaning-source-${cleaningSourceId}.png`,
          filename: `${contentMarker}-cleaning.png`,
          mime_type: "image/png",
          size_bytes: 1,
          purpose: "reference",
          status: "cleaning",
          metadata: { private: contentMarker },
          created_at: staleAt,
          updated_at: cleaningAt,
        },
      ]),
    }),
    "Could not seed Admin health source backlog fixtures",
  );

  const staleUploadId = randomUUID();
  const cleaningUploadId = randomUUID();
  await expectOk(
    await serviceRest("media_upload_sessions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        {
          id: staleUploadId,
          owner_id: ownerId,
          storage_key: `renderlab/admin-health/${storageMarker}/stale-upload-${staleUploadId}.png`,
          filename: `${contentMarker}-upload-stale.png`,
          display_name: `${contentMarker} upload stale`,
          mime_type: "image/png",
          size_bytes: 1,
          status: "pending",
          metadata: { private: contentMarker },
          created_at: staleAt,
          updated_at: staleAt,
        },
        {
          id: cleaningUploadId,
          owner_id: ownerId,
          storage_key: `renderlab/admin-health/${storageMarker}/cleaning-upload-${cleaningUploadId}.png`,
          filename: `${contentMarker}-upload-cleaning.png`,
          display_name: `${contentMarker} upload cleaning`,
          mime_type: "image/png",
          size_bytes: 1,
          status: "cleaning",
          metadata: { private: contentMarker },
          created_at: staleAt,
          updated_at: cleaningAt,
        },
      ]),
    }),
    "Could not seed Admin health upload backlog fixtures",
  );

  const purgeAssetId = randomUUID();
  await expectOk(
    await serviceRest("media_assets", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: purgeAssetId,
        owner_id: ownerId,
        generation_job_id: null,
        origin: "uploaded",
        kind: "image",
        mime_type: "image/png",
        storage_key: `renderlab/admin-health/${storageMarker}/purge-${purgeAssetId}.png`,
        thumbnail_storage_key: null,
        original_filename: `${contentMarker}-purge.png`,
        display_name: `${contentMarker} purge`,
        size_bytes: 1,
        provenance: { private: contentMarker },
        metadata: { private: contentMarker },
        created_at: staleAt,
        updated_at: staleAt,
        deleted_at: staleAt,
        purged_at: null,
      }),
    }),
    "Could not seed Admin health purge backlog fixture",
  );

  return { secretMarker, storageMarker, contentMarker, completionMs: 20_000 };
}

if (cleanupOnly) {
  await restoreGenerationSettingsBaselineFromFile();
  await deleteInvitationEmail(outsider.email).catch(() => {});
  await deleteOutsider().catch(() => {});
  await deleteConfiguredTestAccount(configuredTestAccountIdentity("admin-operations-member")).catch(() => {});
  await deleteConfiguredTestAccount(configuredTestAccountIdentity("admin-operations-admin")).catch(() => {});
  console.log("Admin Operations exact fixture cleanup completed.");
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let browser;
let adminAccount;
let memberAccount;
let settingsBaseline = null;
let primaryError = null;

try {
  adminAccount = await createConfiguredTestAccount("admin-operations-admin");
  memberAccount = await createConfiguredTestAccount("admin-operations-member");
  await createOutsider();
  await deleteInvitationEmail(outsider.email);

  await setAccountAccess(adminAccount.id, { role: "admin", status: "active" });
  await setAccountAccess(memberAccount.id, { role: "member", status: "active" });
  const healthFixture = await seedHealthJobs(memberAccount.id);
  settingsBaseline = await captureGenerationSettingsBaseline();
  const healthExpectedSettings = { ...settingsBaseline };

  const signedOutSettings = await fetch(`${baseUrl}/api/admin/settings`);
  assert(signedOutSettings.status === 403, `Signed-out Admin settings expected 403, got ${signedOutSettings.status}.`);
  const memberSettings = await appRequest("/api/admin/settings", memberAccount);
  assert(memberSettings.status === 403, `Member Admin settings expected 403, got ${memberSettings.status}.`);

  const adminSettings = await appRequest("/api/admin/settings", adminAccount);
  assert(adminSettings.status === 200, `Active admin settings expected 200, got ${adminSettings.status}.`);
  const adminSettingsPayload = await json(adminSettings);
  assert(adminSettingsPayload?.ok === true, "Admin settings GET was not successful.");
  assert(adminSettingsPayload.settings?.generationEnabled === settingsBaseline.generation_enabled, "Admin settings GET returned the wrong generation state.");
  assert(adminSettingsPayload.settings?.maxActiveJobs === settingsBaseline.max_active_jobs, "Admin settings GET returned the wrong active-job limit.");
  assert(adminSettingsPayload.settings?.maxJobsPerHour === settingsBaseline.max_jobs_per_hour, "Admin settings GET returned the wrong hourly limit.");

  const nextSettings = {
    generationEnabled: !settingsBaseline.generation_enabled,
    maxActiveJobs: settingsBaseline.max_active_jobs === 2 ? 3 : 2,
    maxJobsPerHour: settingsBaseline.max_jobs_per_hour === 24 ? 25 : 24,
  };
  const updateSettings = await appRequest("/api/admin/settings", adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(nextSettings),
  });
  assert(updateSettings.status === 200, `Admin settings PATCH expected 200, got ${updateSettings.status}.`);
  const updateSettingsPayload = await json(updateSettings);
  assert(updateSettingsPayload?.settings?.generationEnabled === nextSettings.generationEnabled, "Admin settings PATCH did not store the generation state.");
  assert(updateSettingsPayload?.settings?.maxActiveJobs === nextSettings.maxActiveJobs, "Admin settings PATCH did not store the active-job limit.");
  assert(updateSettingsPayload?.settings?.maxJobsPerHour === nextSettings.maxJobsPerHour, "Admin settings PATCH did not store the hourly limit.");

  const invalidSettings = await appRequest("/api/admin/settings", adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ generationEnabled: true, maxActiveJobs: 5, maxJobsPerHour: 12 }),
  });
  assert(invalidSettings.status === 400, `Out-of-range global active limit expected 400, got ${invalidSettings.status}.`);
  const extraSettings = await appRequest("/api/admin/settings", adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ generationEnabled: true, maxActiveJobs: 1, maxJobsPerHour: 12, provider: "forbidden" }),
  });
  assert(extraSettings.status === 400, `Arbitrary Admin generation setting expected 400, got ${extraSettings.status}.`);

  await restoreGenerationSettingsBaseline(settingsBaseline);
  settingsBaseline = null;

  const signedOutAccounts = await fetch(`${baseUrl}/api/admin/accounts`);
  assert(signedOutAccounts.status === 403, `Signed-out Admin accounts expected 403, got ${signedOutAccounts.status}.`);

  const memberAccounts = await appRequest("/api/admin/accounts", memberAccount);
  assert(memberAccounts.status === 403, `Member Admin accounts expected 403, got ${memberAccounts.status}.`);

  const signedOutHealth = await fetch(`${baseUrl}/api/admin/health`);
  assert(signedOutHealth.status === 403, `Signed-out Admin health expected 403, got ${signedOutHealth.status}.`);
  const memberHealth = await appRequest("/api/admin/health", memberAccount);
  assert(memberHealth.status === 403, `Member Admin health expected 403, got ${memberHealth.status}.`);
  const memberInvite = await appRequest("/api/admin/invitations", memberAccount, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: outsider.email, role: "member" }),
  });
  assert(memberInvite.status === 403, `Member Admin invitation expected 403, got ${memberInvite.status}.`);

  const signedOutPage = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
  assert(signedOutPage.status === 404, `Signed-out /admin expected 404, got ${signedOutPage.status}.`);

  const memberPageResponse = await appRequest("/admin", memberAccount, { redirect: "manual" });
  assert(memberPageResponse.status === 404, `Member /admin expected 404, got ${memberPageResponse.status}.`);

  const adminAccounts = await appRequest("/api/admin/accounts", adminAccount);
  assert(adminAccounts.status === 200, `Active admin accounts expected 200, got ${adminAccounts.status}.`);
  const adminAccountsPayload = await json(adminAccounts);
  assert(adminAccountsPayload?.ok === true, "Admin accounts response was not successful.");
  const accountJson = JSON.stringify(adminAccountsPayload);
  assert(accountJson.includes(adminAccount.id), "Admin account list is missing the active admin fixture.");
  assert(accountJson.includes(memberAccount.id), "Admin account list is missing the member fixture.");
  assert(!accountJson.includes(outsider.id), "Admin account list enumerated an Auth-only identity without RenderLab access.");
  assert(!accountJson.includes(outsider.email), "Admin account list leaked an Auth-only email without RenderLab access.");

  const healthResponse = await appRequest("/api/admin/health", adminAccount);
  assert(healthResponse.status === 200, `Admin health expected 200, got ${healthResponse.status}.`);
  const healthPayload = await json(healthResponse);
  assert(healthPayload?.ok === true, "Admin health response was not successful.");
  const health = healthPayload?.health;
  assert(health?.activeJobs === 1, `Admin health active-job count was not exact: ${JSON.stringify(health?.activeJobs)}.`);
  assert(JSON.stringify(health?.statusCounts) === JSON.stringify({ failed: 1, queued: 1 }), `Admin health status counts were not exact: ${JSON.stringify(health?.statusCounts)}.`);
  assert(JSON.stringify(health?.operationCounts) === JSON.stringify({ "create-image": 1, "create-video": 1 }), `Admin health operation counts were not exact: ${JSON.stringify(health?.operationCounts)}.`);
  assert(JSON.stringify(health?.errorCodeCounts) === JSON.stringify({ generation_failed: 1 }), `Admin health safe error counts were not exact: ${JSON.stringify(health?.errorCodeCounts)}.`);
  assert(health?.recentJobs?.sampleSize === 2 && health?.recentJobs?.truncated === false, `Admin health recent-job bound was not exact: ${JSON.stringify(health?.recentJobs)}.`);
  assert(health?.recentJobs?.completionTiming?.sampleCount === 1, "Admin health completion sample count was not exact.");
  assert(health?.recentJobs?.completionTiming?.p50Ms === healthFixture.completionMs, `Admin health p50 timing was not exact: ${JSON.stringify(health?.recentJobs?.completionTiming)}.`);
  assert(health?.recentJobs?.completionTiming?.p95Ms === healthFixture.completionMs, `Admin health p95 timing was not exact: ${JSON.stringify(health?.recentJobs?.completionTiming)}.`);
  assert(health?.recentJobs?.failovers?.jobsWithFailover === 1 && health?.recentJobs?.failovers?.eventCount === 1, `Admin health failover incidence was not exact: ${JSON.stringify(health?.recentJobs?.failovers)}.`);
  assert(JSON.stringify(health?.activeStateAge) === JSON.stringify({ sampleSize: 1, truncated: false, under15Minutes: 0, minutes15To60: 1, hours1To2: 0, over2Hours: 0 }), `Admin health active-age buckets were not exact: ${JSON.stringify(health?.activeStateAge)}.`);
  assert(JSON.stringify(health?.capacity?.activeReservations) === JSON.stringify({ count: 1, truncated: false }), `Admin health active reservations were not exact: ${JSON.stringify(health?.capacity?.activeReservations)}.`);
  assert(health?.capacity?.generationEnabled === healthExpectedSettings.generation_enabled, "Admin health generation capacity state did not match the restored singleton.");
  assert(health?.capacity?.maxActiveJobsPerAccount === healthExpectedSettings.max_active_jobs, "Admin health active limit did not match the restored singleton.");
  assert(health?.capacity?.maxJobsPerHourPerAccount === healthExpectedSettings.max_jobs_per_hour, "Admin health hourly limit did not match the restored singleton.");
  for (const [label, value] of Object.entries(health?.maintenanceBacklog ?? {})) {
    assert(JSON.stringify(value) === JSON.stringify({ count: 1, truncated: false }), `Admin health maintenance backlog ${label} was not exact: ${JSON.stringify(value)}.`);
  }
  assert(Object.keys(health?.maintenanceBacklog ?? {}).length === 5, "Admin health maintenance backlog did not expose exactly five bounded categories.");
  const healthJson = JSON.stringify(healthPayload);
  for (const forbidden of [
    healthFixture.secretMarker,
    healthFixture.storageMarker,
    healthFixture.contentMarker,
    `private-workflow-${runToken}`,
    `private-model-${runToken}`,
    `private-worker-${runToken}`,
    `private-provider-job-${runToken}`,
    "WORKER_CREDIT_EXHAUSTED",
    "raw backend error",
  ]) {
    assert(!healthJson.includes(forbidden), `Admin health leaked privileged job detail: ${forbidden}.`);
  }

  browser = await chromium.launch({ headless: true });

  const memberContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
  const memberPage = await memberContext.newPage();
  await routeLocalAppRequestsWithAccount(memberPage, baseUrl, memberAccount);
  await memberPage.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  assert((await memberPage.getByRole("link", { name: "Open Admin", exact: true }).count()) === 0, "Member Settings exposed the Admin link.");
  await memberContext.close();

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1100 }, colorScheme: "dark" });
  const page = await adminContext.newPage();
  await routeLocalAppRequestsWithAccount(page, baseUrl, adminAccount);

  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("link", { name: "Open Admin", exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("main").getByRole("heading", { name: "Admin", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("heading", { name: "Access", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("heading", { name: "Generation controls", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("heading", { name: "Global defaults", exact: true }).waitFor({ state: "visible" });
  await page.locator("#global-generation-enabled").waitFor({ state: "visible" });
  await page.locator("#global-max-active").waitFor({ state: "visible" });
  await page.locator("#global-max-hourly").waitFor({ state: "visible" });
  await page.getByRole("heading", { name: "Health", exact: true }).waitFor({ state: "visible" });
  await page.getByText("Completion p50", { exact: true }).waitFor({ state: "visible" });
  await page.getByText("Active state age", { exact: true }).waitFor({ state: "visible" });
  await page.getByText("Maintenance backlog", { exact: true }).waitFor({ state: "visible" });
  assert(
    (await page.getByRole("navigation", { name: "Application navigation" }).getByRole("link", { name: "Admin", exact: true }).count()) === 0,
    "Admin was added to ordinary application navigation.",
  );

  await page.getByLabel("Invite email").fill(outsider.email);
  await page.locator("#admin-invite-role").selectOption("member");
  await page.getByRole("button", { name: "Create invitation", exact: true }).click();
  await page.getByText(
    "Invitation recorded. If this address can receive a RenderLab invite, it will arrive shortly.",
    { exact: true },
  ).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText(outsider.email, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert(!desktopOverflow, "Desktop Admin layout has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/admin-operations-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("main").getByRole("heading", { name: "Admin", exact: true }).waitFor({ state: "visible" });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert(!mobileOverflow, "Narrow Admin layout has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/admin-operations-mobile.png`, fullPage: true });

  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await page.getByText("Invitation revoked.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await adminContext.close();

  const duplicateInviteResponse = await appRequest("/api/admin/invitations", adminAccount, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: outsider.email, role: "member" }),
  });
  assert(duplicateInviteResponse.status === 201, `Existing Auth identity invite expected generic 201, got ${duplicateInviteResponse.status}.`);
  const duplicateInvitePayload = await json(duplicateInviteResponse);
  assert(
    duplicateInvitePayload?.message === "Invitation recorded. If this address can receive a RenderLab invite, it will arrive shortly.",
    "Existing Auth identity invite did not return the generic delivery message.",
  );
  const duplicatePayloadText = JSON.stringify(duplicateInvitePayload).toLowerCase();
  for (const oracleText of ["already registered", "user exists", "auth user", "duplicate user"]) {
    assert(!duplicatePayloadText.includes(oracleText), `Invite delivery exposed an Auth account oracle: ${oracleText}.`);
  }
  const invitationId = duplicateInvitePayload?.invitation?.id;
  assert(typeof invitationId === "string", "Generic invite response did not include the RenderLab invitation ID.");
  const revokeDuplicate = await appRequest(`/api/admin/invitations/${encodeURIComponent(invitationId)}`, adminAccount, {
    method: "DELETE",
  });
  assert(revokeDuplicate.status === 200, `Invitation revoke expected 200, got ${revokeDuplicate.status}.`);

  const promote = await appRequest(`/api/admin/accounts/${memberAccount.id}`, adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role: "admin" }),
  });
  assert(promote.status === 200, `Member promotion expected 200, got ${promote.status}.`);

  const selfLockout = await appRequest(`/api/admin/accounts/${adminAccount.id}`, adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role: "member" }),
  });
  assert(selfLockout.status === 409, `Self-lockout expected 409, got ${selfLockout.status}.`);
  const selfLockoutPayload = await json(selfLockout);
  assert(selfLockoutPayload?.error?.code === "self_lockout", "Self-lockout did not return the sanitized self_lockout code.");

  const demote = await appRequest(`/api/admin/accounts/${memberAccount.id}`, adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role: "member" }),
  });
  assert(demote.status === 200, `Second-admin demotion expected 200, got ${demote.status}.`);

  const lastAdmin = await appRequest(`/api/admin/accounts/${adminAccount.id}`, adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "suspended" }),
  });
  assert(lastAdmin.status === 409, `Last-active-admin protection expected 409, got ${lastAdmin.status}.`);
  const lastAdminPayload = await json(lastAdmin);
  assert(lastAdminPayload?.error?.code === "last_active_admin", "Last-active-admin protection returned the wrong sanitized code.");

  const suspendMember = await appRequest(`/api/admin/accounts/${memberAccount.id}`, adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "suspended" }),
  });
  assert(suspendMember.status === 200, `Member suspension expected 200, got ${suspendMember.status}.`);

  const reactivateMember = await appRequest(`/api/admin/accounts/${memberAccount.id}`, adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "active" }),
  });
  assert(reactivateMember.status === 200, `Member reactivation expected 200, got ${reactivateMember.status}.`);

  const overrides = await appRequest(`/api/admin/accounts/${memberAccount.id}`, adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ generationEnabled: false, maxActiveJobs: 4, maxJobsPerHour: 120 }),
  });
  assert(overrides.status === 200, `Generation override update expected 200, got ${overrides.status}.`);
  const overridesPayload = await json(overrides);
  assert(overridesPayload?.account?.generationEnabled === false, "Generation enabled override was not stored.");
  assert(overridesPayload?.account?.maxActiveJobs === 4, "Active-job override was not stored.");
  assert(overridesPayload?.account?.maxJobsPerHour === 120, "Hourly override was not stored.");

  const invalidOverride = await appRequest(`/api/admin/accounts/${memberAccount.id}`, adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maxActiveJobs: 5 }),
  });
  assert(invalidOverride.status === 400, `Out-of-range active-job override expected 400, got ${invalidOverride.status}.`);

  const clearOverrides = await appRequest(`/api/admin/accounts/${memberAccount.id}`, adminAccount, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ generationEnabled: null, maxActiveJobs: null, maxJobsPerHour: null }),
  });
  assert(clearOverrides.status === 200, `Generation override clear expected 200, got ${clearOverrides.status}.`);

  console.log(
    `Admin Operations verified admin=${adminAccount.id} member=${memberAccount.id} auth_only=${outsider.id}.`,
  );
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    if (settingsBaseline) {
      await restoreGenerationSettingsBaseline(settingsBaseline);
      settingsBaseline = null;
    } else {
      await restoreGenerationSettingsBaselineFromFile();
    }
    await deleteInvitationEmail(outsider.email);
    await deleteOutsider();
    if (memberAccount) await deleteConfiguredTestAccount(memberAccount);
    if (adminAccount) await deleteConfiguredTestAccount(adminAccount);
  } catch (cleanupError) {
    if (!primaryError) primaryError = cleanupError;
    else console.error(cleanupError);
  }
}

if (primaryError) throw primaryError;