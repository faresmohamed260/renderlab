import { chromium } from "@playwright/test";
import { createHash, createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  configuredTestAccountIdentity,
  routeLocalAppRequestsWithAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const resendKey = process.env.RESEND_API_KEY || "";
const artifactDir = process.env.RENDERLAB_EMAIL_IDENTITY_ARTIFACT_DIR || "artifacts/email-identity";
const cleanupOnly = process.argv.includes("--cleanup-only");
const runToken = `${process.env.GITHUB_RUN_ID || "local"}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`;
const adminNamespace = "email-identity-admin";

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  RESEND_API_KEY: resendKey,
})) {
  if (!value) throw new Error(`${name} is required for configured email identity verification.`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fixtureUuid(namespace) {
  const hex = createHash("sha256")
    .update(`renderlab-email-identity-${runToken}-${namespace}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

const fixtures = {
  nonMfa: {
    id: fixtureUuid("non-mfa-user"),
    invitationId: fixtureUuid("non-mfa-invitation"),
    assetId: fixtureUuid("non-mfa-asset"),
  },
  mfa: {
    id: fixtureUuid("mfa-user"),
  },
  directProbe: {
    id: fixtureUuid("direct-probe-user"),
  },
};

function makePassword(namespace) {
  return `RenderLab-${createHash("sha256").update(`${serviceRoleKey}:${runToken}:${namespace}`).digest("base64url").slice(0, 30)}!Aa9`;
}

async function jsonResponse(response, label) {
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const code = typeof payload?.code === "string"
      ? payload.code
      : typeof payload?.error?.code === "string"
        ? payload.error.code
        : "unknown";
    throw new Error(`${label} failed with HTTP ${response.status}, code=${code}.`);
  }
  return payload;
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

async function expectServiceSuccess(response, label) {
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}.`);
  return response;
}

async function serviceRows(path) {
  return jsonResponse(await serviceRest(path), "Service row query");
}

async function resend(path) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  return jsonResponse(response, `Resend ${path}`);
}

async function discoverOwnedGmailAddress() {
  let after = null;
  for (let page = 0; page < 5; page += 1) {
    const query = new URLSearchParams({ limit: "100" });
    if (after) query.set("after", after);
    const list = await resend(`/emails?${query.toString()}`);
    const rows = Array.isArray(list?.data) ? list.data : [];
    for (const row of rows) {
      for (const recipient of Array.isArray(row?.to) ? row.to : []) {
        if (typeof recipient === "string" && /^[^+@]+@gmail\.com$/i.test(recipient.trim())) {
          return recipient.trim().toLowerCase();
        }
      }
    }
    if (!list?.has_more || rows.length === 0) break;
    after = rows.at(-1)?.id || null;
    if (!after) break;
  }
  throw new Error("Could not resolve the approved owned Gmail acceptance inbox from prior RenderLab mail history.");
}

function gmailAlias(address, label) {
  const match = /^([^@]+)@gmail\.com$/i.exec(address);
  assert(match?.[1], "Owned acceptance inbox is not a Gmail address.");
  const safe = `${label}-${runToken}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 48);
  return `${match[1]}+${safe}@gmail.com`;
}

function createUserClient() {
  return createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function createAuthUser(id, email, password, source) {
  const response = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      id,
      email,
      password,
      email_confirm: true,
      app_metadata: { renderlab_fixture: source, run: runToken },
    }),
  });
  const payload = await jsonResponse(response, `Create ${source} Auth fixture`);
  assert(payload?.id === id, `${source} Auth fixture returned an unexpected user ID.`);
}

async function seedMemberAccess(userId) {
  await expectServiceSuccess(
    await serviceRest("renderlab_account_access?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, role: "member", status: "active" }),
    }),
    "Seed member access",
  );
}

async function readAccess(userId) {
  const rows = await serviceRows(
    `renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}&select=user_id,role,status,generation_enabled,max_active_jobs,max_jobs_per_hour&limit=1`,
  );
  assert(rows?.[0], "Expected RenderLab access row is missing.");
  return rows[0];
}

async function createInvitation(id, email) {
  await expectServiceSuccess(
    await serviceRest("renderlab_beta_invitations", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id,
        normalized_email: email.toLowerCase(),
        role: "member",
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    }),
    "Seed target-email invitation",
  );
}

async function createRepresentativeAsset(userId, assetId) {
  await expectServiceSuccess(
    await serviceRest("media_assets", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: assetId,
        owner_id: userId,
        generation_job_id: null,
        origin: "uploaded",
        kind: "image",
        mime_type: "image/png",
        storage_key: `renderlab/email-identity/${runToken}/${assetId}.png`,
        thumbnail_storage_key: null,
        original_filename: "email-identity-fixture.png",
        display_name: "Email identity fixture",
        size_bytes: 1,
        provenance: { fixture: "email-identity" },
        metadata: { fixture: "email-identity" },
      }),
    }),
    "Seed representative owner-scoped asset",
  );
}

async function signIn(client, email, password) {
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;
  const session = result.data.session;
  assert(session?.access_token && session?.refresh_token, "Password sign-in did not return a complete session.");
  return { accessToken: session.access_token, refreshToken: session.refresh_token };
}

async function appBearer(path, token, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: init.redirect ?? "manual" });
}

async function appEmailChange(token, email, currentPassword) {
  return appBearer("/api/account/email-change", token, {
    method: "POST",
    body: JSON.stringify({ email, ...(currentPassword == null ? {} : { currentPassword }) }),
  });
}

async function readAuthUser(userId) {
  const payload = await jsonResponse(await authAdmin(`users/${encodeURIComponent(userId)}`), "Read Auth user");
  assert(payload?.id === userId, "Auth user identity changed unexpectedly.");
  return payload;
}

async function passwordSignInStatus(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return { ok: false, status: response.status, userId: null };
  const payload = await response.json();
  return { ok: true, status: response.status, userId: payload?.user?.id ?? null };
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Unexpected TOTP secret encoding.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function currentTotp(secret, timeMs = Date.now()) {
  const counter = BigInt(Math.floor(timeMs / 1000 / 30));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function verifyTotp(client, factorId, secret) {
  let lastError = null;
  for (const offset of [0, -30_000, 30_000]) {
    const result = await client.auth.mfa.challengeAndVerify({
      factorId,
      code: currentTotp(secret, Date.now() + offset),
    });
    if (!result.error) return;
    lastError = result.error;
  }
  throw lastError ?? new Error("TOTP verification failed.");
}

function htmlDecode(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function emailChangeLink(html) {
  if (typeof html !== "string") return null;
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => htmlDecode(match[1]));
  for (const href of [...new Set(hrefs)]) {
    let url;
    try { url = new URL(href); } catch { continue; }
    const type = url.searchParams.get("type");
    if (type !== "email_change") continue;
    const tokenHash = url.searchParams.get("token_hash") || url.searchParams.get("token");
    if (!tokenHash) continue;
    return { url, tokenHash };
  }
  return null;
}

function scannerSafeConfirmation(link) {
  return link.url.origin === "https://renderlab.faresuniform.uk"
    && link.url.pathname === "/auth/confirm"
    && link.url.searchParams.get("type") === "email_change"
    && Boolean(link.url.searchParams.get("token_hash"));
}

function assertMailBaseline(message, label) {
  assert(message?.last_event === "delivered", `${label} did not reach delivered state.`);
  assert(typeof message?.html === "string" && message.html.includes("RenderLab"), `${label} is missing RenderLab branding.`);
  assert(!message.html.includes("{{"), `${label} contains unresolved template variables.`);
  assert(!/resend\.(com|dev)\/(?:click|track)/i.test(message.html), `${label} appears to contain a tracking rewrite.`);
}

async function recentMessagesForRecipient(recipient, startedAtMs) {
  const list = await resend("/emails?limit=100");
  return (Array.isArray(list?.data) ? list.data : []).filter((row) =>
    Array.isArray(row?.to)
    && row.to.some((value) => String(value).toLowerCase() === recipient.toLowerCase())
    && Date.parse(row.created_at) >= startedAtMs
  );
}

async function waitForConfirmationMail(recipient, startedAtMs, excludedIds = new Set()) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const rows = await recentMessagesForRecipient(recipient, startedAtMs);
    for (const row of rows) {
      if (!row?.id || excludedIds.has(row.id)) continue;
      const message = await resend(`/emails/${encodeURIComponent(row.id)}`);
      const link = emailChangeLink(message?.html);
      if (!link) continue;
      if (message.last_event !== "delivered") continue;
      assertMailBaseline(message, "Email-change confirmation mail");
      return { id: row.id, message, link, scannerSafe: scannerSafeConfirmation(link) };
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Timed out waiting for an email-change confirmation mail.");
}

async function waitForEmailChangedNotification(recipients, startedAtMs, excludedIds) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    for (const recipient of recipients) {
      const rows = await recentMessagesForRecipient(recipient, startedAtMs);
      for (const row of rows) {
        if (!row?.id || excludedIds.has(row.id)) continue;
        const message = await resend(`/emails/${encodeURIComponent(row.id)}`);
        if (emailChangeLink(message?.html)) continue;
        const searchable = `${message?.subject || ""} ${message?.html || ""}`.toLowerCase();
        if (!searchable.includes("email") || !searchable.includes("chang")) continue;
        if (message.last_event !== "delivered") continue;
        assertMailBaseline(message, "Email-changed security notification");
        assert(!/supabase\.co\/auth\/v1/i.test(message.html), "Email-changed security notification exposed an internal Auth URL.");
        return message;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Timed out waiting for the email-changed security notification.");
}

async function confirmHash(tokenHash, expectedAuth) {
  const url = new URL("/auth/confirm", baseUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", "email_change");
  const response = await fetch(url, { redirect: "manual" });
  assert(response.status === 307, `Email confirmation expected 307, got ${response.status}.`);
  const location = response.headers.get("location");
  assert(location, "Email confirmation did not return a redirect location.");
  const resolved = new URL(location, baseUrl);
  assert(resolved.origin === new URL(baseUrl).origin, "Email confirmation escaped the RenderLab origin.");
  assert(resolved.pathname === "/settings", `Email confirmation returned unexpected path ${resolved.pathname}.`);
  assert(resolved.searchParams.get("auth") === expectedAuth, `Email confirmation expected auth=${expectedAuth}.`);
}

async function inspectSession(accessToken, refreshToken, expectedEmail) {
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, authorization: `Bearer ${accessToken}` },
  });
  let userLive = false;
  if (userResponse.ok) {
    const user = await userResponse.json();
    userLive = true;
    assert(String(user?.email || "").toLowerCase() === expectedEmail.toLowerCase(), "Surviving session resolved a stale canonical email.");
  }

  const refreshResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  let refreshLive = false;
  if (refreshResponse.ok) {
    const refreshed = await refreshResponse.json();
    refreshLive = true;
    assert(String(refreshed?.user?.email || "").toLowerCase() === expectedEmail.toLowerCase(), "Refreshed session returned a stale canonical email.");
  }
  return { userLive, refreshLive };
}

async function sanitizeEmailForScreenshot(page, email) {
  await page.evaluate(({ from, to }) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      if (node.textContent?.includes(from)) node.textContent = node.textContent.replaceAll(from, to);
    }
  }, { from: email, to: "owned-test@example.invalid" });
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px.`);
}

async function verifySettingsUi(account) {
  await mkdir(artifactDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
    const page = await desktop.newPage();
    await routeLocalAppRequestsWithAccount(page, baseUrl, account);
    await page.goto(`${baseUrl}/settings/email`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByRole("heading", { name: "Change sign-in email", exact: true }).waitFor({ state: "visible" });
    const emailInput = page.getByLabel("New sign-in email");
    const passwordInput = page.getByLabel("Current password");
    await emailInput.focus();
    await page.keyboard.press("Tab");
    assert(await passwordInput.evaluate((element) => element === document.activeElement), "Desktop keyboard focus did not move from new email to current password.");
    await sanitizeEmailForScreenshot(page, account.email);
    await page.screenshot({ path: `${artifactDir}/email-change-desktop.png`, fullPage: true });
    await desktop.close();

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      hasTouch: true,
      isMobile: true,
    });
    const mobilePage = await mobile.newPage();
    await routeLocalAppRequestsWithAccount(mobilePage, baseUrl, account);
    await mobilePage.goto(`${baseUrl}/settings/email`, { waitUntil: "networkidle", timeout: 60_000 });
    await mobilePage.getByRole("heading", { name: "Change sign-in email", exact: true }).waitFor({ state: "visible" });
    await assertNoHorizontalOverflow(mobilePage, "Email-change mobile Settings");
    await mobilePage.getByLabel("New sign-in email").tap();
    assert(await mobilePage.getByLabel("New sign-in email").evaluate((element) => element === document.activeElement), "Mobile touch did not focus the new email field.");
    await mobilePage.getByLabel("Current password").tap();
    assert(await mobilePage.getByLabel("Current password").evaluate((element) => element === document.activeElement), "Mobile touch did not focus the current password field.");
    await sanitizeEmailForScreenshot(mobilePage, account.email);
    await mobilePage.screenshot({ path: `${artifactDir}/email-change-mobile.png`, fullPage: true });
    await mobile.close();
  } finally {
    await browser.close();
  }
}

async function deleteRawUser(userId) {
  await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }).catch(() => undefined);
  await serviceRest(`media_assets?owner_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE" }).catch(() => undefined);
  const response = await authAdmin(`users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error(`Could not delete Auth fixture ${userId} (${response.status}).`);
}

async function cleanupFixtures() {
  await serviceRest(`renderlab_beta_invitations?id=eq.${encodeURIComponent(fixtures.nonMfa.invitationId)}`, { method: "DELETE" }).catch(() => undefined);
  for (const userId of [fixtures.nonMfa.id, fixtures.mfa.id, fixtures.directProbe.id]) {
    await deleteRawUser(userId).catch(() => undefined);
  }
  await deleteConfiguredTestAccount(configuredTestAccountIdentity(adminNamespace)).catch(() => undefined);
  console.log("RENDERLAB_218_FIXTURE_CLEAN=true");
}

if (cleanupOnly) {
  await cleanupFixtures();
  process.exit(0);
}

let primaryError = null;
let scannerSafeAll = true;

try {
  await cleanupFixtures();

  const ownedInbox = await discoverOwnedGmailAddress();
  const emails = {
    nonMfaOld: gmailAlias(ownedInbox, "rl218-member-old"),
    nonMfaNew: gmailAlias(ownedInbox, "rl218-member-new"),
    mfaOld: gmailAlias(ownedInbox, "rl218-mfa-old"),
    mfaNew: gmailAlias(ownedInbox, "rl218-mfa-new"),
    directOld: gmailAlias(ownedInbox, "rl218-direct-old"),
    directNew: gmailAlias(ownedInbox, "rl218-direct-new"),
  };
  const nonMfaPassword = makePassword("non-mfa");
  const mfaPassword = makePassword("mfa");
  const directPassword = makePassword("direct");

  const domains = await resend("/domains");
  const exactDomain = (domains?.data || []).find((row) => String(row?.name || "").toLowerCase().replace(/\.$/, "") === "mail.renderlab.faresuniform.uk");
  assert(exactDomain?.id, "Verified RenderLab Resend domain is missing.");
  const domain = await resend(`/domains/${encodeURIComponent(exactDomain.id)}`);
  assert(domain.status === "verified", "RenderLab Resend domain is not verified.");
  assert(domain.open_tracking === false && domain.click_tracking === false, "RenderLab Resend tracking must remain disabled.");
  console.log("RENDERLAB_218_RESEND_BASELINE=true");

  // Provider-direct non-MFA initiation is intentionally documented as bypassing
  // RenderLab's current-password defense-in-depth while still requiring the
  // provider's Secure Email Change confirmations.
  await createAuthUser(fixtures.directProbe.id, emails.directOld, directPassword, "email-identity-direct-probe");
  const directClient = createUserClient();
  await signIn(directClient, emails.directOld, directPassword);
  const directStart = await directClient.auth.updateUser({ email: emails.directNew });
  assert(!directStart.error, "Direct provider AAL1 email-change initiation unexpectedly failed for a non-MFA user.");
  assert((await readAuthUser(fixtures.directProbe.id)).email?.toLowerCase() === emails.directOld.toLowerCase(), "Direct provider initiation changed canonical email before confirmations.");
  await deleteRawUser(fixtures.directProbe.id);
  console.log("RENDERLAB_218_NON_MFA_DIRECT_AAL1_INITIATION_CONFIRMED=true");

  await createAuthUser(fixtures.nonMfa.id, emails.nonMfaOld, nonMfaPassword, "email-identity-member");
  await seedMemberAccess(fixtures.nonMfa.id);
  await createRepresentativeAsset(fixtures.nonMfa.id, fixtures.nonMfa.assetId);
  await createInvitation(fixtures.nonMfa.invitationId, emails.nonMfaNew);
  const accessBefore = await readAccess(fixtures.nonMfa.id);

  const memberPrimary = createUserClient();
  const memberSecondary = createUserClient();
  const primarySession = await signIn(memberPrimary, emails.nonMfaOld, nonMfaPassword);
  const secondarySession = await signIn(memberSecondary, emails.nonMfaOld, nonMfaPassword);
  await verifySettingsUi({ id: fixtures.nonMfa.id, email: emails.nonMfaOld, password: nonMfaPassword, accessToken: primarySession.accessToken });
  console.log("RENDERLAB_218_SETTINGS_DESKTOP_MOBILE_A11Y=true");

  const wrongPasswordResponse = await appEmailChange(primarySession.accessToken, emails.nonMfaNew, `${nonMfaPassword}-wrong`);
  assert(wrongPasswordResponse.status === 403, `Wrong-current-password email change expected 403, got ${wrongPasswordResponse.status}.`);
  const wrongPayload = await wrongPasswordResponse.json().catch(() => null);
  assert(wrongPayload?.error?.code === "email_change_current_password_invalid", "Wrong-current-password email change returned an unexpected error code.");
  console.log("RENDERLAB_218_WRONG_CURRENT_PASSWORD_REJECTED=true");

  const nonMfaMailStart = Date.now() - 5_000;
  const startResponse = await appEmailChange(primarySession.accessToken, emails.nonMfaNew, nonMfaPassword);
  assert(startResponse.status === 200, `Correct-current-password email change expected 200, got ${startResponse.status}.`);
  const startPayload = await startResponse.json();
  assert(startPayload?.ok === true, "Correct-current-password email change did not return success.");
  assert((await readAuthUser(fixtures.nonMfa.id)).email?.toLowerCase() === emails.nonMfaOld.toLowerCase(), "Initiation changed canonical email before confirmations.");
  const stillPrimary = await memberPrimary.auth.getUser();
  assert(!stillPrimary.error && stillPrimary.data.user?.id === fixtures.nonMfa.id, "Current-password verification replaced or invalidated the primary session.");
  console.log("RENDERLAB_218_NON_MFA_INITIATION=true");

  const nonMfaOldMail = await waitForConfirmationMail(emails.nonMfaOld, nonMfaMailStart);
  const nonMfaNewMail = await waitForConfirmationMail(emails.nonMfaNew, nonMfaMailStart, new Set([nonMfaOldMail.id]));
  scannerSafeAll = scannerSafeAll && nonMfaOldMail.scannerSafe && nonMfaNewMail.scannerSafe;
  console.log(`RENDERLAB_218_NON_MFA_CONFIRMATION_TEMPLATE_SCANNER_SAFE=${nonMfaOldMail.scannerSafe && nonMfaNewMail.scannerSafe}`);

  await confirmHash(nonMfaOldMail.link.tokenHash, "email_change_confirmation_pending");
  assert((await readAuthUser(fixtures.nonMfa.id)).email?.toLowerCase() === emails.nonMfaOld.toLowerCase(), "First non-MFA mailbox confirmation changed canonical email.");
  await confirmHash(nonMfaOldMail.link.tokenHash, "link_invalid");
  const notificationStart = Date.now() - 2_000;
  await confirmHash(nonMfaNewMail.link.tokenHash, "email_changed");
  const memberAfter = await readAuthUser(fixtures.nonMfa.id);
  assert(memberAfter.email?.toLowerCase() === emails.nonMfaNew.toLowerCase(), "Second non-MFA confirmation did not finalize the new email.");
  assert(memberAfter.id === fixtures.nonMfa.id, "Non-MFA email change changed the immutable user ID.");
  console.log("RENDERLAB_218_NON_MFA_DUAL_CONFIRMATION=true");
  console.log("RENDERLAB_218_USED_CONFIRMATION_REJECTED=true");

  const oldSignIn = await passwordSignInStatus(emails.nonMfaOld, nonMfaPassword);
  const newSignIn = await passwordSignInStatus(emails.nonMfaNew, nonMfaPassword);
  assert(!oldSignIn.ok, "Old email still authenticated after completed email change.");
  assert(newSignIn.ok && newSignIn.userId === fixtures.nonMfa.id, "New email did not authenticate the same immutable user.");
  console.log("RENDERLAB_218_SIGN_IN_IDENTIFIER_SWITCH=true");

  const accessAfter = await readAccess(fixtures.nonMfa.id);
  assert(JSON.stringify(accessAfter) === JSON.stringify(accessBefore), "RenderLab access role/status/overrides changed during email change.");
  const assets = await serviceRows(`media_assets?id=eq.${encodeURIComponent(fixtures.nonMfa.assetId)}&select=id,owner_id&limit=1`);
  assert(assets?.[0]?.owner_id === fixtures.nonMfa.id, "Representative product data changed owner during email change.");
  const invitations = await serviceRows(`renderlab_beta_invitations?id=eq.${encodeURIComponent(fixtures.nonMfa.invitationId)}&select=id,claimed_at,claimed_user_id,revoked_at&limit=1`);
  assert(invitations?.[0] && invitations[0].claimed_at == null && invitations[0].claimed_user_id == null && invitations[0].revoked_at == null, "Target-email invitation was consumed or transferred by email change.");
  console.log("RENDERLAB_218_OWNERSHIP_ACCESS_INVITATION_STABLE=true");

  const adminAccount = await createConfiguredTestAccount(adminNamespace);
  await expectServiceSuccess(
    await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(adminAccount.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ role: "admin", status: "active", updated_at: new Date().toISOString() }),
    }),
    "Promote configured email-identity Admin",
  );
  const adminAccountsResponse = await fetch(`${baseUrl}/api/admin/accounts`, withAccountAuthorization(adminAccount));
  assert(adminAccountsResponse.status === 200, `Admin live-email lookup expected 200, got ${adminAccountsResponse.status}.`);
  const adminAccountsPayload = await adminAccountsResponse.json();
  const adminAccountJson = JSON.stringify(adminAccountsPayload);
  assert(adminAccountJson.includes(fixtures.nonMfa.id), "Admin account listing is missing the changed-email fixture.");
  assert(adminAccountJson.includes(emails.nonMfaNew), "Admin account listing did not resolve the new canonical Auth email.");
  console.log("RENDERLAB_218_ADMIN_LIVE_EMAIL_RESOLUTION=true");

  await waitForEmailChangedNotification(
    [emails.nonMfaOld, emails.nonMfaNew],
    notificationStart,
    new Set([nonMfaOldMail.id, nonMfaNewMail.id]),
  );
  console.log("RENDERLAB_218_EMAIL_CHANGED_NOTIFICATION_DELIVERED=true");

  const primaryState = await inspectSession(primarySession.accessToken, primarySession.refreshToken, emails.nonMfaNew);
  const secondaryState = await inspectSession(secondarySession.accessToken, secondarySession.refreshToken, emails.nonMfaNew);
  console.log(`RENDERLAB_218_PRIMARY_SESSION_USER_LIVE=${primaryState.userLive}`);
  console.log(`RENDERLAB_218_PRIMARY_SESSION_REFRESH_LIVE=${primaryState.refreshLive}`);
  console.log(`RENDERLAB_218_SECONDARY_SESSION_USER_LIVE=${secondaryState.userLive}`);
  console.log(`RENDERLAB_218_SECONDARY_SESSION_REFRESH_LIVE=${secondaryState.refreshLive}`);

  // MFA account: provider must reject direct AAL1 mutation, RenderLab must also
  // reject its own AAL1 initiation, then recent TOTP/AAL2 can start the same
  // two-mailbox flow. Confirm in the opposite order to prove order independence.
  await createAuthUser(fixtures.mfa.id, emails.mfaOld, mfaPassword, "email-identity-mfa");
  await seedMemberAccess(fixtures.mfa.id);
  const mfaEnrollmentClient = createUserClient();
  await signIn(mfaEnrollmentClient, emails.mfaOld, mfaPassword);
  const enrollment = await mfaEnrollmentClient.auth.mfa.enroll({ factorType: "totp", friendlyName: "RenderLab #218 configured verifier" });
  if (enrollment.error) throw enrollment.error;
  await verifyTotp(mfaEnrollmentClient, enrollment.data.id, enrollment.data.totp.secret);
  await mfaEnrollmentClient.auth.signOut({ scope: "local" });

  const mfaClient = createUserClient();
  const mfaAal1Session = await signIn(mfaClient, emails.mfaOld, mfaPassword);
  const assuranceBefore = await mfaClient.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceBefore.error) throw assuranceBefore.error;
  assert(assuranceBefore.data.currentLevel === "aal1" && assuranceBefore.data.nextLevel === "aal2", "MFA fixture did not start at AAL1 with an enrolled factor.");

  const directMfaAttempt = await mfaClient.auth.updateUser({ email: emails.mfaNew });
  assert(directMfaAttempt.error?.code === "insufficient_aal", `Provider direct MFA AAL1 mutation expected insufficient_aal, got ${directMfaAttempt.error?.code || "success"}.`);
  const appMfaAal1 = await appEmailChange(mfaAal1Session.accessToken, emails.mfaNew, null);
  assert(appMfaAal1.status === 403, `RenderLab MFA AAL1 initiation expected 403, got ${appMfaAal1.status}.`);
  const appMfaAal1Payload = await appMfaAal1.json().catch(() => null);
  assert(appMfaAal1Payload?.error?.code === "email_change_mfa_required", "RenderLab MFA AAL1 initiation returned an unexpected error code.");
  console.log("RENDERLAB_218_MFA_AAL1_PROVIDER_AND_APP_BLOCKED=true");

  await verifyTotp(mfaClient, enrollment.data.id, enrollment.data.totp.secret);
  const mfaSessionResult = await mfaClient.auth.getSession();
  if (mfaSessionResult.error) throw mfaSessionResult.error;
  const mfaAal2Session = mfaSessionResult.data.session;
  assert(mfaAal2Session?.access_token && mfaAal2Session.refresh_token, "MFA fixture did not receive an AAL2 session.");
  const mfaMailStart = Date.now() - 5_000;
  const mfaStartResponse = await appEmailChange(mfaAal2Session.access_token, emails.mfaNew, null);
  assert(mfaStartResponse.status === 200, `Recent-TOTP MFA initiation expected 200, got ${mfaStartResponse.status}.`);
  assert((await readAuthUser(fixtures.mfa.id)).email?.toLowerCase() === emails.mfaOld.toLowerCase(), "MFA initiation changed canonical email before confirmations.");
  console.log("RENDERLAB_218_MFA_RECENT_TOTP_INITIATION=true");

  const mfaOldMail = await waitForConfirmationMail(emails.mfaOld, mfaMailStart);
  const mfaNewMail = await waitForConfirmationMail(emails.mfaNew, mfaMailStart, new Set([mfaOldMail.id]));
  scannerSafeAll = scannerSafeAll && mfaOldMail.scannerSafe && mfaNewMail.scannerSafe;
  console.log(`RENDERLAB_218_MFA_CONFIRMATION_TEMPLATE_SCANNER_SAFE=${mfaOldMail.scannerSafe && mfaNewMail.scannerSafe}`);

  await confirmHash(mfaNewMail.link.tokenHash, "email_change_confirmation_pending");
  assert((await readAuthUser(fixtures.mfa.id)).email?.toLowerCase() === emails.mfaOld.toLowerCase(), "First MFA mailbox confirmation changed canonical email.");
  await confirmHash(mfaOldMail.link.tokenHash, "email_changed");
  const mfaAfter = await readAuthUser(fixtures.mfa.id);
  assert(mfaAfter.email?.toLowerCase() === emails.mfaNew.toLowerCase() && mfaAfter.id === fixtures.mfa.id, "MFA dual confirmation did not finalize the same immutable user.");
  console.log("RENDERLAB_218_MFA_DUAL_CONFIRMATION_ORDER_INDEPENDENT=true");

  const factorsAfter = await authAdmin(`users/${encodeURIComponent(fixtures.mfa.id)}/factors`);
  const factorsPayload = await jsonResponse(factorsAfter, "Read post-email-change MFA factors");
  const factorRows = Array.isArray(factorsPayload) ? factorsPayload : Array.isArray(factorsPayload?.factors) ? factorsPayload.factors : [];
  const verifiedTotp = factorRows.filter((factor) => factor?.factor_type === "totp" && factor?.status === "verified");
  assert(verifiedTotp.length === 1 && verifiedTotp[0].id === enrollment.data.id, "Email change did not preserve the single verified TOTP factor.");
  console.log("RENDERLAB_218_MFA_FACTOR_PRESERVED=true");

  const postAssurance = await mfaClient.auth.mfa.getAuthenticatorAssuranceLevel();
  if (postAssurance.error) {
    console.log("RENDERLAB_218_MFA_POST_CONFIRM_SESSION_LIVE=false");
  } else {
    console.log("RENDERLAB_218_MFA_POST_CONFIRM_SESSION_LIVE=true");
    console.log(`RENDERLAB_218_MFA_POST_CONFIRM_CURRENT_AAL=${postAssurance.data.currentLevel}`);
    console.log(`RENDERLAB_218_MFA_POST_CONFIRM_NEXT_AAL=${postAssurance.data.nextLevel}`);
    const protectedResponse = await appBearer("/api/media/assets?limit=1", mfaAal2Session.access_token);
    if (postAssurance.data.currentLevel === "aal2") {
      assert(protectedResponse.status === 200, `Surviving AAL2 MFA session should retain protected access, got ${protectedResponse.status}.`);
    } else {
      assert(protectedResponse.status === 401, `Post-confirm AAL1 MFA session should fail closed, got ${protectedResponse.status}.`);
    }
  }
  console.log("RENDERLAB_218_MFA_POST_CONFIRM_ASSURANCE_HANDLED=true");

  assert(scannerSafeAll, "Hosted email-change confirmation template is not scanner-safe. Configure it to use the RenderLab token-hash /auth/confirm boundary before #218 can close.");
  console.log("RENDERLAB_218_HOSTED_EMAIL_CHANGE_TEMPLATE_SCANNER_SAFE=true");
  console.log("RENDERLAB_218_CONFIGURED_ACCEPTANCE=true");
} catch (error) {
  primaryError = error;
  throw error;
} finally {
  try {
    await cleanupFixtures();
  } catch (cleanupError) {
    if (!primaryError) throw cleanupError;
    console.error("Email identity cleanup failed after the primary verifier error.");
  }
}
