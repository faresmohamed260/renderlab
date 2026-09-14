import { createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error("SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const runSuffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
const email = `renderlab-ci-mfa-${runSuffix}@example.com`;
const password = `RenderLab-MFA-${runSuffix}-Strong!`;
const replacementPassword = `${password}-replacement`;
const operatorRecoveryPassword = `RenderLab-Recovery-${randomBytes(32).toString("base64url")}!Aa1`;
const staleProbePassword = `RenderLab-Stale-${randomBytes(24).toString("base64url")}!Aa1`;
let fixtureUserId = null;

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const user = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function totp(secret, timeMs = Date.now()) {
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

async function getAal() {
  const { data, error } = await user.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
}

async function expectAal(currentLevel, nextLevel, label) {
  const aal = await getAal();
  assert(aal.currentLevel === currentLevel, `${label}: expected current ${currentLevel}, got ${aal.currentLevel}`);
  assert(aal.nextLevel === nextLevel, `${label}: expected next ${nextLevel}, got ${aal.nextLevel}`);
  return aal;
}

async function currentAccessToken() {
  const { data, error } = await user.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  assert(token, "Expected an active user access token.");
  return token;
}

async function fetchAdminHealthWithToken(token) {
  const response = await fetch(`${baseUrl}/api/admin/health`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function fetchAdminHealth() {
  return fetchAdminHealthWithToken(await currentAccessToken());
}

async function fetchPrivateProductWithToken(token) {
  const response = await fetch(`${baseUrl}/api/media/assets?limit=1`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function fetchPrivateProduct() {
  return fetchPrivateProductWithToken(await currentAccessToken());
}

async function expectAdminMfaRequired(label) {
  const { response, body } = await fetchAdminHealth();
  assert(response.status === 403, `${label}: expected HTTP 403, got ${response.status}`);
  assert(body?.error?.code === "admin_mfa_required", `${label}: expected admin_mfa_required, got ${body?.error?.code}`);
}

async function updatePasswordWithBearer(token, nextPassword) {
  return fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ password: nextPassword }),
  });
}

async function verifyFactor(factorId, secret) {
  let lastError = null;
  for (const offset of [0, -30_000, 30_000]) {
    const { error } = await user.auth.mfa.challengeAndVerify({ factorId, code: totp(secret, Date.now() + offset) });
    if (!error) return;
    lastError = error;
  }
  throw lastError ?? new Error("TOTP verification failed.");
}

async function enrollAndVerify(label) {
  const enrollment = await user.auth.mfa.enroll({ factorType: "totp", friendlyName: label });
  if (enrollment.error) throw enrollment.error;
  await verifyFactor(enrollment.data.id, enrollment.data.totp.secret);
  return enrollment.data;
}

async function expectSecondEnrollmentRejected(label) {
  const attempt = await user.auth.mfa.enroll({ factorType: "totp", friendlyName: `Forbidden second factor ${label}` });
  if (!attempt.error) {
    await user.auth.mfa.unenroll({ factorId: attempt.data.id }).catch(() => undefined);
    throw new Error(`${label}: hosted Auth accepted a second direct TOTP enrollment; factor cap is not enforced.`);
  }
  console.log(`${label}=rejected (${attempt.error.message})`);
}

async function main() {
  let currentFactorId = null;

  try {
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    fixtureUserId = created.data.user?.id ?? null;
    assert(fixtureUserId, "Fixture user was not created.");

    const { error: accessError } = await service.from("renderlab_account_access").insert({
      user_id: fixtureUserId,
      role: "admin",
      status: "active",
    });
    if (accessError) throw accessError;

    const signedIn = await user.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    await expectAal("aal1", "aal1", "before enrollment");
    await expectAdminMfaRequired("Admin without MFA");

    const enrollment = await enrollAndVerify("RenderLab CI authenticator");
    currentFactorId = enrollment.id;
    await expectAal("aal2", "aal2", "after first-factor verification");

    const authorized = await fetchAdminHealth();
    assert(authorized.response.ok && authorized.body?.ok === true, `Admin at AAL2 should be authorized; got ${authorized.response.status}`);
    const privateAtAal2 = await fetchPrivateProduct();
    assert(privateAtAal2.response.ok, `Private product access at AAL2 should be authorized; got ${privateAtAal2.response.status}.`);
    console.log("PRIVATE_PRODUCT_ACCESS_AT_AAL2=authorized");

    await expectSecondEnrollmentRejected("DIRECT_SECOND_ENROLLMENT_AT_AAL2");

    await user.auth.signOut({ scope: "local" });
    const signedBackIn = await user.auth.signInWithPassword({ email, password });
    if (signedBackIn.error) throw signedBackIn.error;
    await expectAal("aal1", "aal2", "password sign-in with enrolled MFA");
    await expectAdminMfaRequired("Admin at AAL1 with enrolled MFA");

    const privateAtAal1 = await fetchPrivateProduct();
    assert(privateAtAal1.response.status === 401, `Private product access at AAL1 with enrolled MFA should be denied; got ${privateAtAal1.response.status}.`);
    assert(privateAtAal1.body?.error?.code === "authentication_required", `Private AAL1 denial should use authentication_required, got ${privateAtAal1.body?.error?.code}.`);
    console.log("PRIVATE_PRODUCT_ACCESS_AT_AAL1=denied");

    await expectSecondEnrollmentRejected("DIRECT_SECOND_ENROLLMENT_AT_AAL1");

    const directUnenrollAtAal1 = await user.auth.mfa.unenroll({ factorId: currentFactorId });
    assert(directUnenrollAtAal1.error, "Hosted Auth accepted verified-factor unenroll at AAL1.");
    console.log(`DIRECT_FACTOR_UNENROLL_AT_AAL1=rejected (${directUnenrollAtAal1.error.message})`);

    const directPasswordUpdate = await user.auth.updateUser({ password: replacementPassword });
    assert(
      directPasswordUpdate.error,
      "Hosted Auth accepted direct password replacement at AAL1 despite an enrolled MFA factor.",
    );
    console.log(`DIRECT_PASSWORD_UPDATE_AT_AAL1=rejected (${directPasswordUpdate.error.message})`);

    const factors = await user.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    const verifiedFirst = factors.data.totp.find((factor) => factor.id === currentFactorId && factor.status === "verified");
    assert(verifiedFirst, "Expected the original verified factor to remain available after rejected AAL1 mutations.");

    await verifyFactor(currentFactorId, enrollment.totp.secret);
    await expectAal("aal2", "aal2", "after MFA challenge");

    const removal = await user.auth.mfa.unenroll({ factorId: currentFactorId });
    if (removal.error) throw removal.error;
    console.log("DIRECT_FACTOR_UNENROLL_AT_AAL2=success");
    currentFactorId = null;
    const refreshed = await user.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    await expectAal("aal1", "aal1", "after sole-factor removal");
    await expectAdminMfaRequired("Admin during replacement gap");

    const replacement = await enrollAndVerify("RenderLab CI operator-reset fixture");
    currentFactorId = replacement.id;
    await expectAal("aal2", "aal2", "before operator reset");

    const preResetToken = await currentAccessToken();
    const frozen = await service.auth.admin.updateUserById(fixtureUserId, {
      password: operatorRecoveryPassword,
      ban_duration: "1h",
    });
    if (frozen.error) throw frozen.error;
    console.log("OPERATOR_MFA_ACCOUNT_FROZEN_AND_PASSWORD_ROTATED=success");

    const staleWhileFrozen = await updatePasswordWithBearer(preResetToken, staleProbePassword);
    assert(!staleWhileFrozen.ok, `Pre-reset AAL2 bearer remained usable while recovery freeze was active (HTTP ${staleWhileFrozen.status}).`);
    console.log(`OPERATOR_MFA_STALE_BEARER_WHILE_FROZEN=${staleWhileFrozen.status}`);

    const listed = await service.auth.admin.mfa.listFactors({ userId: fixtureUserId });
    if (listed.error) throw listed.error;
    assert(listed.data.factors.length === 1, `Operator factor listing expected one factor, got ${listed.data.factors.length}.`);
    const operatorFactor = listed.data.factors[0];
    assert(operatorFactor.id === currentFactorId, "Operator factor listing did not return the exact verified fixture factor.");
    assert(operatorFactor.status === "verified", `Operator factor listing expected verified status, got ${operatorFactor.status}.`);

    const deletedFactor = await service.auth.admin.mfa.deleteFactor({ userId: fixtureUserId, id: currentFactorId });
    if (deletedFactor.error) throw deletedFactor.error;
    currentFactorId = null;
    console.log("OPERATOR_MFA_ADMIN_FACTOR_DELETE=success");

    const staleAdminAfterDelete = await fetchAdminHealthWithToken(preResetToken);
    assert(
      staleAdminAfterDelete.response.status === 403,
      `Operator factor reset must immediately remove RenderLab Admin authorization; got HTTP ${staleAdminAfterDelete.response.status}.`,
    );
    console.log(`OPERATOR_MFA_RESET_OLD_ADMIN_STATUS=${staleAdminAfterDelete.response.status}`);

    const unfrozen = await service.auth.admin.updateUserById(fixtureUserId, { ban_duration: "none" });
    if (unfrozen.error) throw unfrozen.error;
    console.log("OPERATOR_MFA_ACCOUNT_UNFROZEN=success");

    const staleAfterUnfreeze = await updatePasswordWithBearer(preResetToken, staleProbePassword);
    assert(!staleAfterUnfreeze.ok, `Pre-reset AAL2 bearer became usable after recovery unfreeze (HTTP ${staleAfterUnfreeze.status}).`);
    console.log(`OPERATOR_MFA_STALE_BEARER_AFTER_UNFREEZE=${staleAfterUnfreeze.status}`);

    const staleAdminAfterUnfreeze = await fetchAdminHealthWithToken(preResetToken);
    assert(
      staleAdminAfterUnfreeze.response.status === 403,
      `Pre-reset AAL2 bearer regained RenderLab Admin authorization after unfreeze; got HTTP ${staleAdminAfterUnfreeze.response.status}.`,
    );

    await user.auth.signOut({ scope: "local" }).catch(() => undefined);
    const oldPasswordSignIn = await user.auth.signInWithPassword({ email, password });
    assert(oldPasswordSignIn.error, "Original password remained valid after operator recovery rotation.");
    console.log("OPERATOR_MFA_OLD_PASSWORD_REJECTED=true");

    const recoverySignIn = await user.auth.signInWithPassword({ email, password: operatorRecoveryPassword });
    if (recoverySignIn.error) throw recoverySignIn.error;
    await expectAal("aal1", "aal1", "after operator recovery sign-in");
    const postResetFactors = await user.auth.mfa.listFactors();
    if (postResetFactors.error) throw postResetFactors.error;
    assert(postResetFactors.data.totp.length === 0, "Operator recovery left a TOTP factor enrolled.");
    await expectAdminMfaRequired("Admin after operator reset before re-enrollment");
    console.log("OPERATOR_MFA_POST_RESET_AAL1_NO_FACTOR=true");

    const recoveredFactor = await enrollAndVerify("RenderLab CI post-recovery authenticator");
    currentFactorId = recoveredFactor.id;
    await expectAal("aal2", "aal2", "after operator recovery re-enrollment");
    const recoveredAdmin = await fetchAdminHealth();
    assert(
      recoveredAdmin.response.ok && recoveredAdmin.body?.ok === true,
      `Admin should return only after post-recovery TOTP reaches AAL2; got ${recoveredAdmin.response.status}.`,
    );
    console.log("OPERATOR_MFA_ADMIN_RESTORED_AFTER_REENROLLMENT=true");

    console.log("MFA configured fixture passed: one-factor provider cap at AAL1/AAL2, AAL1 unenroll/password rejection, private-product and Admin AAL enforcement, replacement gap, and freeze/rotation/delete/unfreeze operator recovery verified.");
  } finally {
    await user.auth.signOut({ scope: "local" }).catch(() => undefined);
    if (fixtureUserId) {
      const deleted = await service.auth.admin.deleteUser(fixtureUserId);
      if (deleted.error) console.error(`Fixture cleanup failed for ${fixtureUserId}: ${deleted.error.message}`);
    }
  }
}

await main();
