import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import {
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  routeLocalAppRequestsWithAccount,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const artifactDir = process.env.RENDERLAB_PROFILE_CREDENTIAL_ARTIFACT_DIR || "artifacts/account-profile-credential";
const cleanupOnly = process.argv.includes("--cleanup-only");
const namespaces = ["profile-owner-a", "profile-owner-b", "profile-unadmitted", "profile-mfa"];

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
})) {
  if (!value) throw new Error(`${name} is required for configured #223 verification.`);
}

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const bucket = process.env.R2_BUCKET_NAME;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function avatarKey(ownerId) {
  return `renderlab/account-profiles/${ownerId}/avatar.webp`;
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function serviceRows(path) {
  const response = await serviceRest(path);
  if (!response.ok) throw new Error(`Configured #223 database query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function appFetch(path, accessToken, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  if (init.body != null && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${baseUrl}${path}`, { ...init, headers, redirect: init.redirect ?? "manual" });
}

async function appJson(path, accessToken, init = {}) {
  const response = await appFetch(path, accessToken, init);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function passwordToken(account) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  if (!response.ok) throw new Error(`Configured #223 AAL1 sign-in failed (${response.status}).`);
  const payload = await response.json();
  assert(typeof payload.access_token === "string" && payload.access_token.length > 20, "Configured #223 AAL1 token missing.");
  return payload.access_token;
}

async function objectExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error?.name === "NotFound" || error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

async function objectBytes(key) {
  const response = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await response.Body.transformToByteArray());
}

async function profileObjects(ownerId) {
  const response = await r2.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: `renderlab/account-profiles/${ownerId}/`,
  }));
  return (response.Contents ?? []).map((item) => item.Key).filter(Boolean);
}

async function profileApi(accessToken) {
  const result = await appJson("/api/account/profile", accessToken);
  assert(result.response.status === 200 && result.payload?.ok === true, `Profile GET failed (${result.response.status}).`);
  return result.payload.profile;
}

function assertSafeProfilePayload(payload, ownerId) {
  const text = JSON.stringify(payload);
  assert(!text.includes(ownerId), "Profile payload exposed the Auth owner ID.");
  assert(!text.includes("renderlab/account-profiles/"), "Profile payload exposed an R2 storage key.");
  assert(!text.includes("owner_id") && !text.includes("role") && !text.includes("generation_enabled"), "Profile payload exposed access internals.");
}

async function updateDisplayName(accessToken, displayName) {
  return appJson("/api/account/profile", accessToken, {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
}

async function cleanupAccounts(accounts = []) {
  const seen = new Set();
  for (const account of accounts) {
    if (!account?.id || seen.has(account.id)) continue;
    seen.add(account.id);
    await deleteConfiguredTestAccount(account).catch(() => null);
  }
  if (!accounts.length) {
    for (const namespace of namespaces) {
      const { configuredTestAccountIdentity } = await import("./lib/configured-test-account.mjs");
      await deleteConfiguredTestAccount(configuredTestAccountIdentity(namespace)).catch(() => null);
    }
  }
}

async function verifyApiContract(accountA, accountB, unadmitted, mfaAccount) {
  const initialA = await appJson("/api/account/profile", accountA.accessToken);
  assert(initialA.response.status === 200 && initialA.payload?.profile?.displayName === null, "Account A default profile is incorrect.");
  assert(initialA.payload?.profile?.avatarState === "none" && initialA.payload?.profile?.avatarUrl === null, "Account A default avatar state is incorrect.");
  assertSafeProfilePayload(initialA.payload, accountA.id);

  const normalized = await updateDisplayName(accountA.accessToken, "  Profile   Owner 😀  ");
  assert(normalized.response.status === 200 && normalized.payload?.profile?.displayName === "Profile Owner 😀", "Display-name normalization failed.");

  const longName = await updateDisplayName(accountA.accessToken, "😀".repeat(81));
  assert(longName.response.status === 400 && longName.payload?.error?.code === "profile_display_name_too_long", "Overlong Unicode display name was not rejected.");
  const controlName = await updateDisplayName(accountA.accessToken, `Control\u0007Name`);
  assert(controlName.response.status === 400 && controlName.payload?.error?.code === "profile_display_name_invalid", "Control-character display name was not rejected.");
  const extraKey = await appJson("/api/account/profile", accountA.accessToken, {
    method: "PATCH",
    body: JSON.stringify({ displayName: "Safe", ownerId: accountB.id }),
  });
  assert(extraKey.response.status === 400 && extraKey.payload?.error?.code === "profile_request_invalid", "Profile mutation accepted browser-supplied owner identity.");

  const bBefore = await profileApi(accountB.accessToken);
  assert(bBefore.displayName === null, "Account B inherited Account A profile state.");
  const setB = await updateDisplayName(accountB.accessToken, "Profile Sentinel B");
  assert(setB.response.status === 200, "Account B profile seed failed.");
  const aAfterB = await profileApi(accountA.accessToken);
  assert(aAfterB.displayName === "Profile Owner 😀", "Account B mutation changed Account A profile state.");

  const unadmittedResponse = await appJson("/api/account/profile", unadmitted.accessToken);
  assert(unadmittedResponse.response.status === 403 && unadmittedResponse.payload?.error?.code === "renderlab_access_required", "Unadmitted shared-Auth identity gained profile access.");
  const unadmittedRows = await serviceRows(`renderlab_account_profiles?owner_id=eq.${encodeURIComponent(unadmitted.id)}&select=owner_id`);
  assert(unadmittedRows.length === 0, "Unadmitted identity created a profile row as a side effect.");

  const suspended = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(accountB.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "suspended", updated_at: new Date().toISOString() }),
  });
  assert(suspended.ok, "Could not suspend Account B for profile policy check.");
  const suspendedEdit = await updateDisplayName(accountB.accessToken, "Suspended Profile B");
  assert(suspendedEdit.response.status === 200 && suspendedEdit.payload?.profile?.displayName === "Suspended Profile B", "Suspended admitted account could not manage its profile.");
  await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(accountB.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "active", updated_at: new Date().toISOString() }),
  });

  const mfaAal1 = await passwordToken(mfaAccount);
  const blockedMfa = await appJson("/api/account/profile", mfaAal1);
  assert(blockedMfa.response.status === 403 && blockedMfa.payload?.error?.code === "mfa_required", "MFA-enrolled AAL1 profile request was not blocked.");
  const allowedMfa = await appJson("/api/account/profile", mfaAccount.accessToken);
  assert(allowedMfa.response.status === 200, "AAL2 profile request did not succeed.");

  console.log("RENDERLAB_223_PROFILE_API_ISOLATION=true");
  console.log("RENDERLAB_223_PROFILE_ADMISSION_MFA=true");
  return { mfaAal1 };
}

async function verifyAvatarServerValidation(accountA, activeHash) {
  const small = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 10, g: 20, b: 30 } },
  }).png().toBuffer();
  const smallForm = new FormData();
  smallForm.set("image", new File([small], "small.png", { type: "image/png" }));
  const smallResult = await appJson("/api/account/profile/avatar", accountA.accessToken, { method: "POST", body: smallForm });
  assert(smallResult.response.status === 400 && smallResult.payload?.error?.code === "avatar_dimensions_invalid", "Undersized avatar was not rejected server-side.");

  const largeForm = new FormData();
  largeForm.set("image", new File([Buffer.alloc(3 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }));
  const largeResult = await appJson("/api/account/profile/avatar", accountA.accessToken, { method: "POST", body: largeForm });
  assert(largeResult.response.status === 413 && largeResult.payload?.error?.code === "avatar_file_too_large", "Oversized avatar was not rejected server-side.");

  const stillActive = await profileApi(accountA.accessToken);
  assert(stillActive.avatarState === "active", "Invalid replacement made the active avatar non-readable.");
  const bytes = await objectBytes(avatarKey(accountA.id));
  assert(createHash("sha256").update(bytes).digest("hex") === activeHash, "Invalid replacement changed the stored avatar.");
  console.log("RENDERLAB_223_AVATAR_VALIDATION=true");
}

async function verifyProfileBrowser(accountA, accountB) {
  await mkdir(artifactDir, { recursive: true });
  const firstImage = await sharp({
    create: { width: 800, height: 600, channels: 3, background: { r: 24, g: 82, b: 134 } },
  }).png().toBuffer();
  const secondImage = await sharp({
    create: { width: 720, height: 920, channels: 3, background: { r: 132, g: 48, b: 78 } },
  }).jpeg({ quality: 92 }).toBuffer();

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
    const page = await context.newPage();
    await routeLocalAppRequestsWithAccount(page, baseUrl, accountA);

    await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.getByRole("link", { name: "Edit profile", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    const profileY = (await page.getByText("Profile", { exact: true }).first().boundingBox())?.y ?? Number.POSITIVE_INFINITY;
    const emailY = (await page.getByText("Sign-in email", { exact: true }).boundingBox())?.y ?? Number.NEGATIVE_INFINITY;
    assert(profileY < emailY, "Settings Account row does not present Profile before sign-in identity.");

    await page.getByRole("link", { name: "Edit profile", exact: true }).click();
    await page.getByRole("heading", { name: "Edit profile", exact: true }).waitFor({ state: "visible" });
    assert((await page.getByLabel("Display name").inputValue()) === "Profile Owner 😀", "Profile editor did not load Account A display name.");
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `Desktop profile editor has horizontal overflow: ${overflow}px.`);
    await page.screenshot({ path: `${artifactDir}/profile-editor-desktop.png`, fullPage: true });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: "invalid.txt", mimeType: "text/plain", buffer: Buffer.from("not-an-image") });
    await page.getByText("Choose a JPEG, PNG or WebP image.", { exact: true }).waitFor({ state: "visible" });

    await fileInput.setInputFiles({ name: "avatar-first.png", mimeType: "image/png", buffer: firstImage });
    const cropStage = page.getByRole("group", { name: "Profile picture crop preview" });
    await cropStage.waitFor({ state: "visible" });
    const beforePosition = await page.getByAltText("Selected profile picture crop preview").getAttribute("style");
    await cropStage.focus();
    await page.keyboard.press("ArrowRight");
    const afterPosition = await page.getByAltText("Selected profile picture crop preview").getAttribute("style");
    assert(beforePosition !== afterPosition, "Keyboard crop nudge did not update the preview.");
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.getByText("1.1×", { exact: true }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Reset crop", exact: true }).click();
    await page.getByText("1.0×", { exact: true }).waitFor({ state: "visible" });
    await page.screenshot({ path: `${artifactDir}/profile-crop-desktop.png`, fullPage: true });

    await page.getByLabel("Display name").fill("  Profile   Owner 😀  ");
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await page.getByText("Profile updated.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    assert((await page.getByLabel("Display name").inputValue()) === "Profile Owner 😀", "Profile editor did not reflect normalized display name.");
    await page.getByLabel("Current profile picture").waitFor({ state: "visible" });

    const firstStored = await objectBytes(avatarKey(accountA.id));
    const firstHash = createHash("sha256").update(firstStored).digest("hex");
    const firstMetadata = await sharp(firstStored).metadata();
    assert(firstMetadata.format === "webp" && firstMetadata.width === 512 && firstMetadata.height === 512, "Stored avatar is not normalized 512×512 WebP.");
    const objectsAfterFirst = await profileObjects(accountA.id);
    assert(objectsAfterFirst.length === 1 && objectsAfterFirst[0] === avatarKey(accountA.id), "Avatar storage created historical or non-deterministic keys.");

    const avatarRedirect = await appFetch("/api/account/profile/avatar", accountA.accessToken);
    assert(avatarRedirect.status === 307 && avatarRedirect.headers.get("location"), "Owner-authenticated avatar read did not produce a private signed redirect.");
    const signedRead = await fetch(avatarRedirect.headers.get("location"));
    assert(signedRead.ok, `Signed avatar read failed (${signedRead.status}).`);
    const signedBytes = Buffer.from(await signedRead.arrayBuffer());
    assert(createHash("sha256").update(signedBytes).digest("hex") === firstHash, "Signed avatar read did not match the deterministic stored object.");

    await verifyAvatarServerValidation(accountA, firstHash);

    await fileInput.setInputFiles({ name: "avatar-second.jpg", mimeType: "image/jpeg", buffer: secondImage });
    await page.getByRole("group", { name: "Profile picture crop preview" }).waitFor({ state: "visible" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `390px profile editor has horizontal overflow: ${overflow}px.`);
    for (const name of ["Move crop left", "Move crop up", "Move crop down", "Move crop right", "Zoom out", "Zoom in"]) {
      const box = await page.getByRole("button", { name, exact: true }).boundingBox();
      assert(box && box.width >= 44 && box.height >= 44, `${name} is below the 44px touch target contract.`);
    }
    await page.screenshot({ path: `${artifactDir}/profile-editor-mobile-reduced.png`, fullPage: true });
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.getByRole("button", { name: "Move crop down", exact: true }).click();
    await page.getByRole("button", { name: "Save profile", exact: true }).click();
    await page.getByText("Profile updated.", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });

    const secondStored = await objectBytes(avatarKey(accountA.id));
    const secondHash = createHash("sha256").update(secondStored).digest("hex");
    assert(secondHash !== firstHash, "Avatar replacement did not replace the deterministic object.");
    const objectsAfterReplace = await profileObjects(accountA.id);
    assert(objectsAfterReplace.length === 1 && objectsAfterReplace[0] === avatarKey(accountA.id), "Avatar replacement left historical storage objects.");

    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
    await page.getByLabel("Current profile picture").waitFor({ state: "visible" });
    overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `Desktop Settings after profile update has horizontal overflow: ${overflow}px.`);
    await page.screenshot({ path: `${artifactDir}/settings-profile-desktop.png`, fullPage: true });

    await page.goto(`${baseUrl}/settings/profile`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Remove avatar", exact: true }).click();
    await page.getByText(/Profile picture removed\./).waitFor({ state: "visible", timeout: 30_000 });
    await page.getByLabel("Profile picture placeholder").waitFor({ state: "visible" });
    assert(!(await objectExists(avatarKey(accountA.id))), "Avatar object remained after successful removal.");
    const removed = await profileApi(accountA.accessToken);
    assert(removed.avatarState === "none" && removed.avatarUrl === null, "Removed avatar remained readable in profile state.");
    const removedRead = await appJson("/api/account/profile/avatar", accountA.accessToken);
    assert(removedRead.response.status === 404 && removedRead.payload?.error?.code === "avatar_not_found", "Removed avatar read route did not become authoritative 404.");

    const bProfile = await profileApi(accountB.accessToken);
    assert(bProfile.avatarState === "none", "Account A avatar work changed Account B avatar state.");
    assert(!(await objectExists(avatarKey(accountB.id))), "Account A avatar work created Account B avatar storage.");

    await context.close();
  } finally {
    await browser.close();
  }

  console.log("RENDERLAB_223_AVATAR_CROP_REPLACE_REMOVE=true");
  console.log("RENDERLAB_223_PROFILE_DESKTOP_MOBILE=true");
}

async function dispatchCapsLock(locator, enabled) {
  await locator.evaluate((element, state) => {
    const event = new KeyboardEvent(state ? "keydown" : "keyup", { key: "A", bubbles: true });
    Object.defineProperty(event, "getModifierState", {
      value: (key) => key === "CapsLock" && state,
    });
    element.dispatchEvent(event);
  }, enabled);
}

async function assertPasswordControl(locator, autoComplete) {
  assert((await locator.getAttribute("autocomplete")) === autoComplete, `Password field autocomplete should be ${autoComplete}.`);
  assert((await locator.getAttribute("type")) === "password", "Password field did not default to concealed type.");
}

async function verifyCredentialBrowser(accountA) {
  const browser = await chromium.launch({ headless: true });
  try {
    const signedOutContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
    await signedOutContext.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseUrl).origin });
    const signedOut = await signedOutContext.newPage();
    await signedOut.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
    const signInPassword = signedOut.getByLabel("Password", { exact: true });
    await assertPasswordControl(signInPassword, "current-password");
    const showSignIn = signedOut.getByRole("button", { name: "Show password", exact: true });
    const showBox = await showSignIn.boundingBox();
    assert(showBox && showBox.width >= 44 && showBox.height >= 44, "Sign-in password reveal control is below 44px.");
    await signedOut.evaluate(() => navigator.clipboard.writeText("PasteProbe-RenderLab-223!"));
    await signInPassword.focus();
    await signedOut.keyboard.press("Control+V");
    assert((await signInPassword.inputValue()) === "PasteProbe-RenderLab-223!", "Password field blocked ordinary paste behavior.");
    await showSignIn.click();
    const hideSignIn = signedOut.getByRole("button", { name: "Hide password", exact: true });
    assert((await signInPassword.getAttribute("type")) === "text" && (await hideSignIn.getAttribute("aria-pressed")) === "true", "Sign-in reveal state is not accessible/functional.");
    await hideSignIn.click();
    await signInPassword.fill("");
    await dispatchCapsLock(signInPassword, true);
    await signedOut.getByText("Caps Lock is on", { exact: true }).waitFor({ state: "visible" });
    await dispatchCapsLock(signInPassword, false);
    await signedOut.getByText("Caps Lock is on", { exact: true }).waitFor({ state: "hidden" });
    await signedOut.screenshot({ path: `${artifactDir}/credential-signin-desktop.png`, fullPage: true });
    await signedOutContext.close();

    const context = await browser.newContext({ viewport: { width: 1440, height: 1024 }, colorScheme: "dark" });
    const page = await context.newPage();
    await routeLocalAppRequestsWithAccount(page, baseUrl, accountA);
    await page.goto(`${baseUrl}/settings/password`, { waitUntil: "networkidle", timeout: 60_000 });
    const current = page.getByLabel("Current password", { exact: true });
    const next = page.getByLabel("New password", { exact: true });
    const confirm = page.getByLabel("Confirm new password", { exact: true });
    await assertPasswordControl(current, "current-password");
    await assertPasswordControl(next, "new-password");
    await assertPasswordControl(confirm, "new-password");

    await current.fill("VisibilityProbe-223!");
    await page.getByRole("button", { name: "Show password", exact: true }).first().click();
    assert((await current.getAttribute("type")) === "text", "Current-password reveal did not work.");
    assert((await next.getAttribute("type")) === "password" && (await confirm.getAttribute("type")) === "password", "Password reveal state leaked across fields.");
    await page.getByRole("button", { name: "Hide password", exact: true }).click();
    await dispatchCapsLock(current, true);
    await page.getByText("Caps Lock is on", { exact: true }).waitFor({ state: "visible" });
    await dispatchCapsLock(current, false);

    await next.fill("short");
    await page.getByRole("status").filter({ hasText: /^Use at least 15 characters\.$/ }).waitFor({ state: "visible" });
    await next.fill("LongEnoughPassword223!");
    await page.getByText("Length requirement met.", { exact: true }).waitFor({ state: "visible" });
    await confirm.fill("DifferentPassword223!");
    await page.getByText("Passwords do not match", { exact: true }).waitFor({ state: "visible" });
    await confirm.fill("LongEnoughPassword223!");
    await page.getByText("Passwords match", { exact: true }).waitFor({ state: "visible" });

    await current.fill("");
    await next.fill("");
    await confirm.fill("");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `390px password page has horizontal overflow: ${overflow}px.`);
    await page.screenshot({ path: `${artifactDir}/credential-password-mobile-reduced.png`, fullPage: true });

    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.goto(`${baseUrl}/settings/email`, { waitUntil: "networkidle" });
    await assertPasswordControl(page.getByLabel("Current password", { exact: true }), "current-password");

    await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Delete account", exact: true }).click();
    await page.getByRole("heading", { name: "Permanently delete this RenderLab account?", exact: true }).waitFor({ state: "visible" });
    await assertPasswordControl(page.getByLabel("Current password", { exact: true }), "current-password");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await context.close();
  } finally {
    await browser.close();
  }

  console.log("RENDERLAB_223_CREDENTIAL_REVEAL_PASTE_CAPSLOCK=true");
  console.log("RENDERLAB_223_CREDENTIAL_AUTOCOMPLETE_MATCH=true");
}

if (cleanupOnly) {
  await cleanupAccounts();
  process.exit(0);
}

const accounts = [];
let primaryError = null;
try {
  await cleanupAccounts();
  const accountA = await createConfiguredTestAccount("profile-owner-a");
  accounts.push(accountA);
  const accountB = await createConfiguredTestAccount("profile-owner-b");
  accounts.push(accountB);
  const unadmitted = await createConfiguredTestAccount("profile-unadmitted");
  accounts.push(unadmitted);
  const mfaAccount = await createConfiguredTestAccount("profile-mfa");
  accounts.push(mfaAccount);

  const unadmittedDelete = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(unadmitted.id)}`, { method: "DELETE" });
  assert(unadmittedDelete.ok, "Could not remove admission from shared-Auth profile fixture.");

  const { mfaAal1 } = await verifyApiContract(accountA, accountB, unadmitted, mfaAccount);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, colorScheme: "dark" });
    const page = await context.newPage();
    await routeLocalAppRequestsWithAccount(page, baseUrl, { accessToken: mfaAal1 });
    await page.goto(`${baseUrl}/settings/profile`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForURL(/\/settings\/mfa\/challenge\?next=/, { timeout: 30_000 });
    await context.close();
  } finally {
    await browser.close();
  }
  console.log("RENDERLAB_223_PROFILE_MFA_ROUTE_GATE=true");

  await verifyProfileBrowser(accountA, accountB);
  await verifyCredentialBrowser(accountA);

  const profileRowsA = await serviceRows(`renderlab_account_profiles?owner_id=eq.${encodeURIComponent(accountA.id)}&select=owner_id,display_name,avatar_state`);
  assert(profileRowsA.length === 1 && profileRowsA[0].display_name === "Profile Owner 😀" && profileRowsA[0].avatar_state === "none", "Final Account A profile state is incorrect.");
  const accessRowsA = await serviceRows(`renderlab_account_access?user_id=eq.${encodeURIComponent(accountA.id)}&select=role,status`);
  assert(accessRowsA[0]?.role === "member" && accessRowsA[0]?.status === "active", "Profile work altered Account A access/role semantics.");

  console.log("RENDERLAB_223_PROFILE_CREDENTIAL_CONFIGURED_ACCEPTANCE=true");
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanupAccounts(accounts);
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
