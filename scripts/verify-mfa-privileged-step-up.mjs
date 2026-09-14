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
let password = `RenderLab-MFA-${runSuffix}-Strong!`;
const replacementPassword = `${password}-replacement`;
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

async function fetchAdminHealth() {
  const response = await fetch(`${baseUrl}/api/admin/health`, {
    headers: { authorization: `Bearer ${await currentAccessToken()}` },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function expectAdminMfaRequired(label) {
  const { response, body } = await fetchAdminHealth();
  assert(response.status === 403, `${label}: expected HTTP 403, got ${response.status}`);
  assert(body?.error?.code === "admin_mfa_required", `${label}: expected admin_mfa_required, got ${body?.error?.code}`);
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

async function main() {
  const failures = [];
  let firstFactorId = null;

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

    const enrollment = await user.auth.mfa.enroll({ factorType: "totp", friendlyName: "RenderLab CI authenticator" });
    if (enrollment.error) throw enrollment.error;
    firstFactorId = enrollment.data.id;
    await verifyFactor(enrollment.data.id, enrollment.data.totp.secret);
    await expectAal("aal2", "aal2", "after first-factor verification");

    const authorized = await fetchAdminHealth();
    assert(authorized.response.ok && authorized.body?.ok === true, `Admin at AAL2 should be authorized; got ${authorized.response.status}`);

    await user.auth.signOut({ scope: "local" });
    const signedBackIn = await user.auth.signInWithPassword({ email, password });
    if (signedBackIn.error) throw signedBackIn.error;
    await expectAal("aal1", "aal2", "password sign-in with enrolled MFA");
    await expectAdminMfaRequired("Admin at AAL1 with enrolled MFA");

    const directSecondEnrollment = await user.auth.mfa.enroll({ factorType: "totp", friendlyName: "Forbidden second factor" });
    if (!directSecondEnrollment.error) {
      failures.push("Hosted Auth accepted a second direct TOTP enrollment. mfa_max_enrolled_factors=1 is not enforced.");
      await user.auth.mfa.unenroll({ factorId: directSecondEnrollment.data.id }).catch(() => undefined);
    }

    const directPasswordUpdate = await user.auth.updateUser({ password: replacementPassword });
    if (directPasswordUpdate.error) {
      console.log(`DIRECT_PASSWORD_UPDATE_AT_AAL1=rejected (${directPasswordUpdate.error.message})`);
    } else {
      password = replacementPassword;
      console.log("DIRECT_PASSWORD_UPDATE_AT_AAL1=accepted");
    }

    const factors = await user.auth.mfa.listFactors();
    if (factors.error) throw factors.error;
    const verifiedFirst = factors.data.totp.find((factor) => factor.id === firstFactorId && factor.status === "verified");
    assert(verifiedFirst, "Expected the original verified factor to remain available.");

    await verifyFactor(firstFactorId, enrollment.data.totp.secret);
    await expectAal("aal2", "aal2", "after MFA challenge");

    const removal = await user.auth.mfa.unenroll({ factorId: firstFactorId });
    if (removal.error) throw removal.error;
    firstFactorId = null;
    const refreshed = await user.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    await expectAal("aal1", "aal1", "after sole-factor removal");
    await expectAdminMfaRequired("Admin during replacement gap");

    if (failures.length > 0) throw new Error(failures.join("\n"));
    console.log("MFA configured fixture passed: one-factor provider cap, AAL transitions, Admin denial/authorization and removal gap verified.");
  } finally {
    await user.auth.signOut({ scope: "local" }).catch(() => undefined);
    if (fixtureUserId) {
      const deleted = await service.auth.admin.deleteUser(fixtureUserId);
      if (deleted.error) console.error(`Fixture cleanup failed for ${fixtureUserId}: ${deleted.error.message}`);
    }
  }
}

await main();
