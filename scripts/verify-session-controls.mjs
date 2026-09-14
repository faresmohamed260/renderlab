import { chromium } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const artifactDir = process.env.RENDERLAB_SESSION_ARTIFACT_DIR || "artifacts";
const runSuffix = `${process.env.GITHUB_RUN_ID || Date.now()}-${randomBytes(4).toString("hex")}`;
const email = `renderlab-session-${runSuffix}@example.com`;
const password = `RenderLab-Session-${runSuffix}-Strong!`;
const controlEmail = `renderlab-session-control-${runSuffix}@example.com`;
const controlPassword = `RenderLab-Session-Control-${runSuffix}-Strong!`;
let userId = null;
let controlUserId = null;

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
})) {
  if (!value) throw new Error(`${name} is required for configured session-control verification.`);
}

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function userClient(label) {
  return createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { "x-renderlab-fixture-client": label } },
  });
}

async function signIn(client, userEmail = email, userPassword = password) {
  const result = await client.auth.signInWithPassword({ email: userEmail, password: userPassword });
  if (result.error) throw result.error;
  const token = result.data.session?.access_token;
  assert(typeof token === "string" && token.length > 20, "Fixture sign-in did not receive an access token.");
  const claims = await client.auth.getClaims(token);
  if (claims.error) throw claims.error;
  const sessionId = claims.data?.claims?.session_id;
  assert(typeof sessionId === "string" && sessionId.length > 20, "Fixture JWT is missing session_id.");
  return { token, sessionId };
}

async function privateMedia(token) {
  return fetch(`${baseUrl}/api/media/assets?limit=1`, {
    headers: { authorization: `Bearer ${token}` },
    redirect: "manual",
  });
}

async function expectPrivateAccepted(token, label) {
  const response = await privateMedia(token);
  assert(response.status === 200, `${label}: expected private RenderLab HTTP 200, got ${response.status}: ${await response.text()}`);
}

async function expectPrivateDenied(token, label) {
  const response = await privateMedia(token);
  assert(response.status === 401, `${label}: expected immediate RenderLab HTTP 401, got ${response.status}: ${await response.text()}`);
}

async function projectedSessions(targetUserId) {
  const { data, error } = await service.rpc("renderlab_auth_session_projection", { p_user_id: targetUserId });
  if (error) throw error;
  assert(Array.isArray(data), "Session projection did not return an array.");
  for (const row of data) {
    const keys = Object.keys(row).sort();
    assert(
      JSON.stringify(keys) === JSON.stringify(["created_at", "last_active_at", "session_id", "user_agent"]),
      `Session projection exposed unexpected fields: ${keys.join(",")}`,
    );
    assert(!("ip" in row), "Session projection exposed IP.");
    assert(!("refresh_token" in row), "Session projection exposed refresh-token material.");
    assert(!("factor_id" in row), "Session projection exposed MFA factor ID.");
  }
  return data;
}

async function waitForSessionCount(targetUserId, expected, label) {
  let last = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    last = await projectedSessions(targetUserId);
    if (last.length === expected) return last;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label}: expected ${expected} live sessions, got ${last?.length ?? "unknown"}.`);
}

async function waitForRenderedSessionCount(page, expected, label) {
  const locator = page.locator('[aria-label="Active RenderLab sessions"] > div');
  let count = -1;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    count = await locator.count();
    if (count === expected) return;
    await page.waitForTimeout(250);
  }
  throw new Error(`${label}: expected ${expected} rendered sessions, got ${count}.`);
}

async function createFixtureUser(userEmail, userPassword, metadata) {
  const result = await service.auth.admin.createUser({
    email: userEmail,
    password: userPassword,
    email_confirm: true,
    app_metadata: { renderlab_fixture: metadata, run: runSuffix },
  });
  if (result.error) throw result.error;
  const id = result.data.user?.id;
  assert(typeof id === "string" && id, `Could not create ${metadata} fixture user.`);
  return id;
}

async function seedAccess(targetUserId) {
  const { error } = await service.from("renderlab_account_access").insert({
    user_id: targetUserId,
    role: "member",
    status: "active",
  });
  if (error) throw error;
}

async function deleteUser(targetUserId) {
  if (!targetUserId) return;
  const accessDelete = await service.from("renderlab_account_access").delete().eq("user_id", targetUserId);
  if (accessDelete.error) throw accessDelete.error;
  const result = await service.auth.admin.deleteUser(targetUserId);
  if (result.error && !/not found/i.test(result.error.message)) throw result.error;
}

async function signOutAndVerify(client, scope, removed, survivor, label) {
  const result = await client.auth.signOut({ scope });
  if (result.error) throw result.error;
  await expectPrivateDenied(removed.token, `${label} removed session`);
  if (survivor) await expectPrivateAccepted(survivor.token, `${label} surviving session`);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px.`);
}

let browser = null;
let primaryError = null;

try {
  userId = await createFixtureUser(email, password, "session-controls");
  controlUserId = await createFixtureUser(controlEmail, controlPassword, "session-controls-control");
  await seedAccess(userId);
  await seedAccess(controlUserId);

  const controlClient = userClient("control");
  const control = await signIn(controlClient, controlEmail, controlPassword);

  const localA = userClient("local-a");
  const localB = userClient("local-b");
  const localSessionA = await signIn(localA);
  const localSessionB = await signIn(localB);
  assert(localSessionA.sessionId !== localSessionB.sessionId, "Two password sign-ins reused one session_id.");
  let rows = await waitForSessionCount(userId, 2, "local baseline");
  assert(rows.some((row) => row.session_id === localSessionA.sessionId), "Projection is missing local session A.");
  assert(rows.some((row) => row.session_id === localSessionB.sessionId), "Projection is missing local session B.");
  assert(!rows.some((row) => row.session_id === control.sessionId), "Owner-scoped projection leaked another user's session.");
  await expectPrivateAccepted(localSessionA.token, "local baseline A");
  await expectPrivateAccepted(localSessionB.token, "local baseline B");

  await signOutAndVerify(localA, "local", localSessionA, localSessionB, "local sign-out");
  rows = await waitForSessionCount(userId, 1, "local sign-out");
  assert(rows[0]?.session_id === localSessionB.sessionId, "Local sign-out did not preserve exactly the other session.");
  console.log("SESSION_SCOPE_LOCAL=verified");

  const othersC = userClient("others-c");
  const othersD = userClient("others-d");
  const othersSessionC = await signIn(othersC);
  const othersSessionD = await signIn(othersD);
  await waitForSessionCount(userId, 3, "others baseline");
  await expectPrivateAccepted(othersSessionC.token, "others baseline C");
  await expectPrivateAccepted(othersSessionD.token, "others baseline D");

  const othersResult = await localB.auth.signOut({ scope: "others" });
  if (othersResult.error) throw othersResult.error;
  await expectPrivateAccepted(localSessionB.token, "others acting session");
  await expectPrivateDenied(othersSessionC.token, "others removed session C");
  await expectPrivateDenied(othersSessionD.token, "others removed session D");
  rows = await waitForSessionCount(userId, 1, "others sign-out");
  assert(rows[0]?.session_id === localSessionB.sessionId, "Others sign-out did not preserve exactly the acting session.");
  console.log("SESSION_SCOPE_OTHERS=verified");

  const globalE = userClient("global-e");
  const globalSessionE = await signIn(globalE);
  await waitForSessionCount(userId, 2, "global baseline");
  await expectPrivateAccepted(globalSessionE.token, "global baseline E");
  const globalResult = await localB.auth.signOut({ scope: "global" });
  if (globalResult.error) throw globalResult.error;
  await expectPrivateDenied(localSessionB.token, "global acting session");
  await expectPrivateDenied(globalSessionE.token, "global other session");
  await waitForSessionCount(userId, 0, "global sign-out");
  console.log("SESSION_SCOPE_GLOBAL=verified");

  const browserSecondaryClient = userClient("browser-secondary");
  const browserSecondary = await signIn(browserSecondaryClient);
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Active RenderLab sessions", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("This device", { exact: true }).waitFor({ state: "visible" });
  assert((await page.getByText("This device", { exact: true }).count()) === 1, "Settings must mark exactly one current session.");
  assert((await page.locator('[aria-label="Active RenderLab sessions"] > div').count()) >= 2, "Settings did not render both browser and secondary sessions.");
  assert(await page.getByRole("button", { name: "Sign out this device", exact: true }).isVisible(), "Settings is missing local sign-out control.");
  assert(await page.getByRole("button", { name: "Sign out other devices", exact: true }).isVisible(), "Settings is missing others sign-out control.");
  assert(await page.getByRole("button", { name: "Sign out everywhere", exact: true }).isVisible(), "Settings is missing global sign-out control.");
  assert((await page.getByText(/\b(?:IPv4|IPv6|IP address)\b/i).count()) === 0, "Settings rendered network-address language unexpectedly.");
  await mkdir(artifactDir, { recursive: true });
  await page.screenshot({ path: `${artifactDir}/session-controls-desktop.png`, fullPage: true });

  await page.getByRole("button", { name: "Sign out other devices", exact: true }).click();
  await page.getByText("Other RenderLab sessions signed out.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await expectPrivateDenied(browserSecondary.token, "browser other-device sign-out");
  await page.getByText("This device", { exact: true }).waitFor({ state: "visible" });
  await waitForRenderedSessionCount(page, 1, "Settings others sign-out refresh");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  await assertNoHorizontalOverflow(page, "Mobile session controls");
  for (const name of ["Sign out this device", "Sign out other devices", "Sign out everywhere"]) {
    const button = page.getByRole("button", { name, exact: true });
    const box = await button.boundingBox();
    assert(box && box.height >= 44, `${name} mobile target is below 44px.`);
  }
  await page.screenshot({ path: `${artifactDir}/session-controls-mobile.png`, fullPage: true });

  await page.getByRole("button", { name: "Sign out this device", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await waitForSessionCount(userId, 0, "browser local sign-out");
  console.log("SESSION_SETTINGS_BROWSER=verified");

  const globalUiSecondary = userClient("browser-global-secondary");
  const globalUiSecondarySession = await signIn(globalUiSecondary);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Active RenderLab sessions", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByRole("button", { name: "Sign out everywhere", exact: true }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await expectPrivateDenied(globalUiSecondarySession.token, "browser global sign-out secondary");
  await waitForSessionCount(userId, 0, "browser global sign-out");
  console.log("SESSION_SETTINGS_GLOBAL=verified");

  const controlRows = await projectedSessions(controlUserId);
  assert(controlRows.some((row) => row.session_id === control.sessionId), "Fixture cleanup isolation lost the control user's live session.");
  console.log("Session controls configured verification passed: owner-scoped projection, local/others/global semantics, immediate stale-bearer denial, and Settings desktop/mobile controls verified.");
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  try {
    await deleteUser(userId);
    await deleteUser(controlUserId);
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
