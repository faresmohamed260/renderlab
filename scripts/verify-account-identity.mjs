import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const artifactDir = process.env.RENDERLAB_ACCOUNT_ARTIFACT_DIR || "artifacts";
const cleanupOnly = process.argv.includes("--cleanup-only");
const runToken = process.env.GITHUB_RUN_ID || "local";

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
})) {
  if (!value) throw new Error(`${name} is required for configured account identity verification.`);
}

function fixtureUserId(token) {
  const hex = createHash("sha256").update(`renderlab-account-${token}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

const userId = fixtureUserId(runToken);
const email = `renderlab-account-${runToken}@example.com`;
const password = `RenderLab-${runToken}-Pass!`;
const changedPassword = `RenderLab-${runToken}-Changed!`;
const recoveredPassword = `RenderLab-${runToken}-Recovered!`;
const belowPolicyPassword = "TooShort-123!";
const compromisedPassword = "passwordpassword";
const unavailableMediaAssetId = "00000000-0000-4000-8000-000000000010";
const staleGenerationRequest = {
  prompt: "Session freshness verification",
  output: { kind: "image", aspectRatio: "original" },
  inputs: [
    {
      alias: "image1",
      role: "primary-image",
      source: { type: "media-asset", id: unavailableMediaAssetId },
    },
  ],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function mockPwnedPasswordLookup(page, passwordValue, mode) {
  const hash = createHash("sha1").update(passwordValue, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const routePattern = "https://api.pwnedpasswords.com/**";
  let getCount = 0;

  const handler = async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "add-padding",
        },
      });
      return;
    }

    assert(request.method() === "GET", `Pwned Passwords lookup used unexpected method ${request.method()}.`);
    const url = new URL(request.url());
    assert(url.pathname === `/range/${prefix}`, "Pwned Passwords lookup must send only the five-character SHA-1 prefix.");
    assert(request.headers()["add-padding"] === "true", "Pwned Passwords lookup must request padded responses.");
    assert(request.postData() == null, "Pwned Passwords lookup must not send a request body.");
    assert(!request.url().includes(passwordValue), "Pwned Passwords lookup URL exposed the candidate password.");
    assert(!request.url().includes(hash), "Pwned Passwords lookup URL exposed the complete password hash.");
    getCount += 1;

    if (mode === "unavailable") {
      await route.abort("failed");
      return;
    }

    const fillerSuffix = suffix === "0".repeat(35) ? "1".repeat(35) : "0".repeat(35);
    const body = mode === "compromised"
      ? `${suffix}:42\r\n${fillerSuffix}:0\r\n`
      : `${fillerSuffix}:0\r\n`;
    await route.fulfill({
      status: 200,
      headers: {
        "access-control-allow-origin": "*",
        "content-type": "text/plain; charset=utf-8",
      },
      body,
    });
  };

  await page.route(routePattern, handler);
  return {
    getCount: () => getCount,
    remove: () => page.unroute(routePattern, handler),
  };
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

async function assertReachableAfterBottomScroll(page, locator, label) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  const state = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const top = document.elementFromPoint(x, y);
    return {
      inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
      topmost: Boolean(top && (top === element || element.contains(top))),
      topTag: top?.tagName ?? null,
    };
  });
  assert(state.inViewport, `${label} could not be brought fully into the mobile viewport.`);
  assert(state.topmost, `${label} remains occluded after targeted scroll (top element: ${state.topTag ?? "none"}).`);
}

function jwtPayload(token) {
  const parts = token.split(".");
  assert(parts.length === 3 && parts[1], "Session access token is not a JWT.");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
}

function assertAccessTokenStillUnexpired(token, label) {
  const payload = jwtPayload(token);
  assert(Number.isFinite(payload?.exp), `${label} access token is missing exp.`);
  assert(payload.exp * 1000 > Date.now() + 30_000, `${label} access token expired before revocation verification.`);
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function expectServiceSuccess(response, label) {
  if (!response.ok) throw new Error(`${label} (${response.status}): ${await response.text()}`);
}

async function passwordSession(passwordValue) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password: passwordValue }),
  });
  if (!response.ok) throw new Error(`Could not create secondary password session (${response.status}): ${await response.text()}`);
  const payload = await response.json();
  assert(typeof payload?.access_token === "string" && payload.access_token, "Secondary session is missing access token.");
  assert(typeof payload?.refresh_token === "string" && payload.refresh_token, "Secondary session is missing refresh token.");
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token };
}

async function refreshSession(refreshToken) {
  return fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

async function authUser(accessToken) {
  return fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${accessToken}`,
    },
  });
}

async function appBearer(path, accessToken, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);
  if (init.body != null) headers.set("content-type", "application/json");
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: "manual" });
}

async function expectBearerMediaAccepted(session, label) {
  assertAccessTokenStillUnexpired(session.accessToken, label);
  const response = await appBearer("/api/media/assets?limit=1", session.accessToken);
  if (response.status !== 200) {
    throw new Error(`${label} private media baseline expected 200, got ${response.status}: ${await response.text()}`);
  }
}

async function expectBearerRevoked(session, label, { generation = false } = {}) {
  assertAccessTokenStillUnexpired(session.accessToken, label);

  const authResponse = await authUser(session.accessToken);
  assert(!authResponse.ok, `${label} Supabase getUser unexpectedly accepted the revoked session (${authResponse.status}).`);

  const mediaResponse = await appBearer("/api/media/assets?limit=1", session.accessToken);
  assert(mediaResponse.status === 401, `${label} private media expected 401, got ${mediaResponse.status}: ${await mediaResponse.text()}`);

  if (generation) {
    const generationResponse = await appBearer("/api/generation/jobs", session.accessToken, {
      method: "POST",
      body: JSON.stringify(staleGenerationRequest),
    });
    assert(
      generationResponse.status === 401,
      `${label} generation boundary expected 401, got ${generationResponse.status}: ${await generationResponse.text()}`,
    );
  }

  const refreshResponse = await refreshSession(session.refreshToken);
  assert(!refreshResponse.ok, `${label} refresh token unexpectedly remained valid (${refreshResponse.status}).`);
}

async function cleanupFixture() {
  await expectServiceSuccess(
    await serviceRest(`renderlab_beta_invitations?normalized_email=eq.${encodeURIComponent(email.toLowerCase())}`, { method: "DELETE" }),
    "Could not remove account invitation fixture",
  );
  await expectServiceSuccess(
    await serviceRest(`generation_admission_reservations?owner_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }),
    "Could not remove account admission reservations",
  );
  await expectServiceSuccess(
    await serviceRest(`generation_jobs?owner_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }),
    "Could not remove account generation jobs",
  );
  await expectServiceSuccess(
    await serviceRest(`generation_sources?owner_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }),
    "Could not remove account generation sources",
  );
  await expectServiceSuccess(
    await serviceRest(`media_upload_sessions?owner_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }),
    "Could not remove account media upload sessions",
  );
  await expectServiceSuccess(
    await serviceRest(`media_assets?owner_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }),
    "Could not remove account media assets",
  );
  await expectServiceSuccess(
    await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }),
    "Could not remove account access fixture",
  );
  const response = await authAdmin(`users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not remove account fixture (${response.status}): ${await response.text()}`);
  }
  console.log(`Account identity fixture clean user=${userId}.`);
}

async function createFixture() {
  await cleanupFixture();
  const response = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      id: userId,
      email,
      password,
      email_confirm: true,
      user_metadata: { source: "renderlab-account-identity-ci", run: runToken },
    }),
  });
  if (!response.ok) throw new Error(`Could not create account fixture (${response.status}): ${await response.text()}`);
  const user = await response.json();
  assert(user?.id === userId, "Supabase created an unexpected account fixture ID.");

  const invitation = await serviceRest("renderlab_beta_invitations", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      normalized_email: email.toLowerCase(),
      role: "member",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
  });
  await expectServiceSuccess(invitation, "Could not create closed-beta invitation fixture");
}

async function setAccessStatus(status) {
  const response = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
  });
  await expectServiceSuccess(response, `Could not set account access ${status}`);
}

async function recoveryTokenHash() {
  const response = await authAdmin("generate_link", {
    method: "POST",
    body: JSON.stringify({ type: "recovery", email }),
  });
  if (!response.ok) throw new Error(`Could not generate recovery fixture link (${response.status}): ${await response.text()}`);
  const payload = await response.json();
  const tokenHash = payload?.properties?.hashed_token || payload?.hashed_token;
  assert(typeof tokenHash === "string" && tokenHash.length > 10, "Recovery fixture did not return a hashed token.");
  return tokenHash;
}

function assertSameOriginLocation(urlValue, expectedPath, expectedAuth = null) {
  const url = new URL(urlValue);
  const expectedOrigin = new URL(baseUrl).origin;
  assert(url.origin === expectedOrigin, `Auth flow escaped the RenderLab origin: ${url.origin}.`);
  assert(url.pathname === expectedPath, `Auth flow expected ${expectedPath}, got ${url.pathname}.`);
  if (expectedAuth != null) {
    assert(url.searchParams.get("auth") === expectedAuth, `Auth flow expected auth=${expectedAuth}, got ${url.search}.`);
  }
}

if (cleanupOnly) {
  await cleanupFixture();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });
let browser;
let primaryError = null;

try {
  await createFixture();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
  const page = await context.newPage();

  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Account", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor({ state: "visible" });
  assert(
    (await page.getByLabel("Password").getAttribute("minlength")) === null,
    "Sign-in must not client-block legacy credentials using the new-password minimum.",
  );
  assert(await page.getByRole("link", { name: "Open Admin", exact: true }).count() === 0, "Signed-out Settings exposed the Admin operations link.");
  await assertNoHorizontalOverflow(page, "Desktop signed-out Settings");
  await page.screenshot({ path: `${artifactDir}/account-identity-desktop-signed-out.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertNoHorizontalOverflow(page, "Narrow signed-out Settings");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-out.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText(email, { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible" });
  assert(await page.getByText("Sign-in email", { exact: true }).isVisible(), "Signed-in Settings is missing Sign-in email framing.");
  assert(await page.getByText("Ends RenderLab sessions on every device and browser.", { exact: true }).isVisible(), "Signed-in Settings is missing global sign-out scope copy.");
  assert(await page.getByRole("link", { name: "Change password", exact: true }).isVisible(), "Signed-in Settings is missing Change password.");
  assert(await page.getByRole("button", { name: "Sign out everywhere", exact: true }).isVisible(), "Signed-in Settings is missing Sign out everywhere.");
  await page.screenshot({ path: `${artifactDir}/account-identity-desktop-signed-in.png`, fullPage: true });

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertNoHorizontalOverflow(page, "Narrow signed-in Settings");
  await assertReachableAfterBottomScroll(page, page.getByRole("link", { name: "Change password", exact: true }), "Narrow Settings Change password");
  await assertReachableAfterBottomScroll(page, page.getByRole("button", { name: "Sign out everywhere", exact: true }), "Narrow Settings Sign out everywhere");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-in-actions.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-in.png`, fullPage: true });

  await setAccessStatus("suspended");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Suspended", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const deniedMedia = await page.request.get(`${baseUrl}/api/media/assets`);
  assert(deniedMedia.status() === 401, `Suspended account media API expected 401, got ${deniedMedia.status()}.`);
  await assertReachableAfterBottomScroll(page, page.getByRole("link", { name: "Change password", exact: true }), "Suspended Settings Change password");
  await assertReachableAfterBottomScroll(page, page.getByRole("button", { name: "Sign out everywhere", exact: true }), "Suspended Settings Sign out everywhere");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-suspended-actions.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-suspended.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await assertNoHorizontalOverflow(page, "Desktop suspended Settings");
  await page.screenshot({ path: `${artifactDir}/account-identity-desktop-suspended.png`, fullPage: true });

  await setAccessStatus("active");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  const staleAfterPasswordChange = await passwordSession(password);
  await expectBearerMediaAccepted(staleAfterPasswordChange, "Secondary pre-password-change session");

  await page.getByRole("link", { name: "Change password", exact: true }).click();
  await page.getByRole("heading", { name: "Change password", exact: true }).waitFor({ state: "visible" });
  assert(await page.getByLabel("Current password").isVisible(), "Ordinary password change must require the current password.");
  assert(
    await page.getByText("Use at least 15 characters.", { exact: true }).isVisible(),
    "Password replacement must display the canonical 15-character policy.",
  );
  assert(
    (await page.getByLabel("New password", { exact: true }).getAttribute("minlength")) === "15",
    "New-password input must use the canonical 15-character minimum.",
  );
  await assertNoHorizontalOverflow(page, "Desktop password change");
  await page.screenshot({ path: `${artifactDir}/account-identity-desktop-password-change.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertNoHorizontalOverflow(page, "Narrow password change");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-password-change.png`, fullPage: true });
  await page.getByLabel("Current password").fill(password);
  await page.getByLabel("New password", { exact: true }).fill(belowPolicyPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(belowPolicyPassword);
  assert(
    await page.getByRole("button", { name: "Update password", exact: true }).isDisabled(),
    "Below-policy password must remain client-blocked before Auth mutation.",
  );

  const compromisedLookup = await mockPwnedPasswordLookup(page, compromisedPassword, "compromised");
  await page.getByLabel("New password", { exact: true }).fill(compromisedPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(compromisedPassword);
  await page.waitForTimeout(100);
  assert(compromisedLookup.getCount() === 0, "Compromised-password lookup must not run incrementally while typing.");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await page.getByText("This password has appeared in known data breaches. Choose a different password.", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  assert(compromisedLookup.getCount() === 1, `Compromised-password submit expected one range GET, got ${compromisedLookup.getCount()}.`);
  await compromisedLookup.remove();

  const unavailableLookup = await mockPwnedPasswordLookup(page, changedPassword, "unavailable");
  await page.getByLabel("New password", { exact: true }).fill(changedPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(changedPassword);
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await page.getByText("Password safety check is unavailable. Try again.", { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  assert(unavailableLookup.getCount() === 2, `Unavailable password-safety check should retry once then fail closed; got ${unavailableLookup.getCount()} GETs.`);
  await unavailableLookup.remove();

  const safeChangeLookup = await mockPwnedPasswordLookup(page, changedPassword, "safe");
  await page.getByRole("button", { name: "Update password", exact: true }).click();
  await page.getByText("Password updated.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(safeChangeLookup.getCount() === 1, `Safe ordinary password change expected one range GET, got ${safeChangeLookup.getCount()}.`);
  await safeChangeLookup.remove();
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  const actingMediaAfterPasswordChange = await page.request.get(`${baseUrl}/api/media/assets?limit=1`);
  assert(
    actingMediaAfterPasswordChange.status() === 200,
    `Acting session should remain usable after password change, got ${actingMediaAfterPasswordChange.status()}.`,
  );
  await expectBearerRevoked(staleAfterPasswordChange, "Secondary post-password-change session", { generation: true });

  const staleAfterRecovery = await passwordSession(changedPassword);
  await expectBearerMediaAccepted(staleAfterRecovery, "Secondary pre-recovery session");

  const tokenHash = await recoveryTokenHash();
  const invalidContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  try {
    const invalidPage = await invalidContext.newPage();
    await invalidPage.goto(
      `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(`${tokenHash}-invalid`)}&type=recovery&next=${encodeURIComponent("https://evil.example/escape")}`,
      { waitUntil: "networkidle", timeout: 60_000 },
    );
    assertSameOriginLocation(invalidPage.url(), "/settings", "link_invalid");
  } finally {
    await invalidContext.close();
  }

  const recoveryContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  const recoveryPage = await recoveryContext.newPage();
  await recoveryPage.goto(
    `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=${encodeURIComponent("https://evil.example/escape")}`,
    { waitUntil: "networkidle", timeout: 60_000 },
  );
  assertSameOriginLocation(recoveryPage.url(), "/settings/password");
  await recoveryPage.getByRole("heading", { name: "Set a new password", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await recoveryPage.getByText("Verified recovery link", { exact: true }).waitFor({ state: "visible" });
  assert((await recoveryPage.getByLabel("Current password").count()) === 0, "Verified recovery flow should not ask for the old password.");
  await assertNoHorizontalOverflow(recoveryPage, "Narrow verified recovery");
  await recoveryPage.screenshot({ path: `${artifactDir}/account-identity-mobile-recovery-form.png`, fullPage: true });
  await recoveryPage.setViewportSize({ width: 1440, height: 1024 });
  await recoveryPage.emulateMedia({ reducedMotion: "no-preference" });
  await assertNoHorizontalOverflow(recoveryPage, "Desktop verified recovery");
  await recoveryPage.screenshot({ path: `${artifactDir}/account-identity-desktop-recovery-form.png`, fullPage: true });
  await recoveryPage.setViewportSize({ width: 390, height: 844 });
  await recoveryPage.emulateMedia({ reducedMotion: "reduce" });

  const consumedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark" });
  try {
    const consumedPage = await consumedContext.newPage();
    await consumedPage.goto(
      `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=${encodeURIComponent("https://evil.example/escape")}`,
      { waitUntil: "networkidle", timeout: 60_000 },
    );
    assertSameOriginLocation(consumedPage.url(), "/settings", "link_invalid");
  } finally {
    await consumedContext.close();
  }

  const safeRecoveryLookup = await mockPwnedPasswordLookup(recoveryPage, recoveredPassword, "safe");
  await recoveryPage.getByLabel("New password", { exact: true }).fill(recoveredPassword);
  await recoveryPage.getByLabel("Confirm new password", { exact: true }).fill(recoveredPassword);
  await recoveryPage.getByRole("button", { name: "Update password", exact: true }).click();
  await recoveryPage.getByText("Password updated.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(safeRecoveryLookup.getCount() === 1, `Safe recovery password change expected one range GET, got ${safeRecoveryLookup.getCount()}.`);
  await safeRecoveryLookup.remove();
  await recoveryPage.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  const recoveryActingMedia = await recoveryPage.request.get(`${baseUrl}/api/media/assets?limit=1`);
  assert(recoveryActingMedia.status() === 200, `Recovery session should remain usable after password replacement, got ${recoveryActingMedia.status()}.`);
  await expectBearerRevoked(staleAfterRecovery, "Secondary post-recovery session", { generation: true });

  const preRecoveryBrowserMedia = await page.request.get(`${baseUrl}/api/media/assets?limit=1`);
  assert(preRecoveryBrowserMedia.status() === 401, `Pre-recovery browser session expected 401 after recovery replacement, got ${preRecoveryBrowserMedia.status()}.`);
  await recoveryPage.screenshot({ path: `${artifactDir}/account-identity-mobile-recovery-complete.png`, fullPage: true });

  const staleAfterGlobalSignOut = await passwordSession(recoveredPassword);
  await expectBearerMediaAccepted(staleAfterGlobalSignOut, "Secondary pre-global-sign-out session");

  await recoveryPage.getByRole("button", { name: "Sign out everywhere", exact: true }).click();
  await recoveryPage.getByLabel("Email").waitFor({ state: "visible", timeout: 30_000 });
  assert(await recoveryPage.getByRole("button", { name: "Forgot password", exact: true }).isVisible(), "Signed-out Settings is missing Forgot password.");
  assert((await recoveryPage.getByRole("button", { name: "Create account", exact: true }).count()) === 0, "Closed-beta Settings must not expose public Create account.");
  await recoveryPage.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-out.png`, fullPage: true });
  await expectBearerRevoked(staleAfterGlobalSignOut, "Secondary post-global-sign-out session", { generation: true });

  await recoveryPage.getByLabel("Email").fill(email);
  await recoveryPage.getByLabel("Password").fill(recoveredPassword);
  await recoveryPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await recoveryPage.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

  await recoveryContext.close();
  console.log(`Configured account identity/admission/recovery/session freshness verified user=${userId}.`);
} catch (error) {
  primaryError = error;
} finally {
  if (browser) await browser.close().catch(() => {});
  try {
    await cleanupFixture();
  } catch (cleanupError) {
    if (!primaryError) primaryError = cleanupError;
    else console.error(cleanupError);
  }
}

if (primaryError) throw primaryError;