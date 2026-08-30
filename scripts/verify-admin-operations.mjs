import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
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
  const secretMarker = `raw-provider-marker-${runToken}`;
  const response = await serviceRest("generation_jobs", {
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
        completed_at: new Date().toISOString(),
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
        completed_at: null,
      },
    ]),
  });
  await expectOk(response, "Could not seed Admin health fixture jobs");
  return secretMarker;
}

if (cleanupOnly) {
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
let primaryError = null;

try {
  adminAccount = await createConfiguredTestAccount("admin-operations-admin");
  memberAccount = await createConfiguredTestAccount("admin-operations-member");
  await createOutsider();
  await deleteInvitationEmail(outsider.email);

  await setAccountAccess(adminAccount.id, { role: "admin", status: "active" });
  await setAccountAccess(memberAccount.id, { role: "member", status: "active" });
  const secretMarker = await seedHealthJobs(memberAccount.id);

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
  assert(Number(healthPayload?.health?.activeJobs) >= 1, "Admin health did not count the active run-owned job.");
  assert(Number(healthPayload?.health?.operationCounts?.["create-image"]) >= 1, "Admin health missed create-image.");
  assert(Number(healthPayload?.health?.statusCounts?.failed) >= 1, "Admin health missed failed status.");
  assert(Number(healthPayload?.health?.errorCodeCounts?.generation_failed) >= 1, "Admin health did not sanitize the raw worker error code.");
  const healthJson = JSON.stringify(healthPayload);
  for (const forbidden of [
    secretMarker,
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
  await page.getByRole("heading", { name: "Health", exact: true }).waitFor({ state: "visible" });
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