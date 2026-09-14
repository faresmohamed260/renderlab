import { createHash, createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rashyleshocuvpgcooxy.supabase.co";
const publishableKey = "sb_publishable_Erz_UUs49DgHHDkFoXfztA_m6CbHTqw";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const resendKey = process.env.RESEND_API_KEY || "";
const arm = process.env.RENDERLAB_217_REAL_MFA_MAIL_ARMED || "";
const historicalAcceptance = readFileSync("scripts/phase13d-real-gmail-send.mjs", "utf8");
const recipient = historicalAcceptance.match(/const recipient = "([^"]+@gmail\.com)";/)?.[1] || "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(serviceRole, "SUPABASE_SERVICE_ROLE_KEY is required.");
assert(resendKey, "RESEND_API_KEY is required.");
assert(arm === "YES_RENDERLAB_217_REAL_MFA_EMAIL", "Real MFA security-mail verification is not armed.");
assert(recipient.endsWith("@gmail.com"), "Approved historical Gmail test recipient could not be resolved.");

const startedAt = Date.now() - 15_000;
const password = createHash("sha256").update(`${serviceRole}:renderlab-217-mfa-security-mail`).digest("base64url");
const operatorPassword = `RenderLab-Recovery-${randomBytes(32).toString("base64url")}!Aa1`;
const staleProbePassword = `RenderLab-Stale-${randomBytes(24).toString("base64url")}!Aa1`;
let userId = null;

const service = createClient(supabaseUrl, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
const user = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

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

async function resend(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${resendKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`https://api.resend.com${path}`, { ...init, headers });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`Resend ${path} failed with HTTP ${response.status}.`);
  return payload;
}

function assertSafeSecurityMail(message, subject) {
  assert(message?.last_event === "delivered", `Security email did not reach delivered state: ${subject}`);
  assert(message.subject === subject, `Security email subject drifted: ${subject}`);
  assert(typeof message.html === "string" && message.html.includes("RenderLab"), `Security email is missing RenderLab branding: ${subject}`);
  assert(!message.html.includes("{{"), `Security email contains unresolved template variables: ${subject}`);
  assert(!/supabase\.co\/auth\/v1/i.test(message.html), `Security email exposed an internal Supabase Auth URL: ${subject}`);
  assert(!/resend\.(com|dev)\/(?:click|track)/i.test(message.html), `Security email appears to contain a Resend tracking rewrite: ${subject}`);
  if (userId) assert(!message.html.includes(userId), `Security email exposed an internal Auth user ID: ${subject}`);
}

async function waitForSecurityMail(subject) {
  let listed = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await resend("/emails");
    listed = (list.data || []).find((row) =>
      Array.isArray(row?.to)
      && row.to.includes(recipient)
      && row.subject === subject
      && Date.parse(row.created_at) >= startedAt
    ) || null;
    if (listed?.id && listed.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(listed?.id, `Resend did not expose security email: ${subject}`);

  let message = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    message = await resend(`/emails/${encodeURIComponent(listed.id)}`);
    if (message.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assertSafeSecurityMail(message, subject);
  return message;
}

async function waitForSecurityMailById(id, subject) {
  let message = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    message = await resend(`/emails/${encodeURIComponent(id)}`);
    if (message.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assertSafeSecurityMail(message, subject);
  return message;
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

async function cleanup() {
  await user.auth.signOut({ scope: "local" }).catch(() => undefined);
  if (!userId) return;
  const { error } = await service.auth.admin.deleteUser(userId);
  if (error) throw error;
  userId = null;
  console.log("RENDERLAB_217_MFA_SECURITY_MAIL_FIXTURE_CLEAN=true");
}

try {
  console.log("RENDERLAB_217_REAL_MFA_SECURITY_EMAIL_TEST=true");
  console.log("RENDERLAB_217_MFA_SECURITY_EMAIL_RECIPIENT_COUNT=1");

  const domains = await resend("/domains");
  const exact = (domains.data || []).find((row) => String(row?.name || "").toLowerCase().replace(/\.$/, "") === "mail.renderlab.faresuniform.uk");
  assert(exact?.id, "Resend sender domain missing.");
  const domain = await resend(`/domains/${encodeURIComponent(exact.id)}`);
  assert(domain.status === "verified", "Resend sender domain is not verified.");
  assert(domain.open_tracking === false && domain.click_tracking === false, "Resend tracking must remain disabled.");
  console.log("RENDERLAB_217_RESEND_PROVIDER_BASELINE=true");

  const listedUsers = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listedUsers.error) throw listedUsers.error;
  assert(
    !listedUsers.data.users.some((candidate) => String(candidate.email || "").toLowerCase() === recipient),
    "Approved Gmail test recipient already has an Auth user; refusing to touch it.",
  );

  const created = await service.auth.admin.createUser({
    email: recipient,
    password,
    email_confirm: true,
    user_metadata: { source: "renderlab-217-mfa-security-mail-delivery" },
  });
  if (created.error) throw created.error;
  userId = created.data.user?.id ?? null;
  assert(userId, "Supabase did not return the MFA mail fixture user ID.");

  const signedIn = await user.auth.signInWithPassword({ email: recipient, password });
  if (signedIn.error) throw signedIn.error;

  const enrollment = await user.auth.mfa.enroll({ factorType: "totp", friendlyName: "RenderLab security-mail fixture" });
  if (enrollment.error) throw enrollment.error;
  await verifyFactor(enrollment.data.id, enrollment.data.totp.secret);
  console.log("RENDERLAB_217_MFA_FACTOR_ENROLLED=true");

  const enrollmentMail = await waitForSecurityMail("A RenderLab verification method was added");
  const securitySender = typeof enrollmentMail.from === "string" ? enrollmentMail.from.trim() : "";
  assert(securitySender, "Delivered RenderLab enrollment mail did not expose a reusable verified sender identity.");
  console.log("RENDERLAB_217_MFA_ENROLLED_EMAIL_RESEND_DELIVERED=true");

  const session = await user.auth.getSession();
  if (session.error) throw session.error;
  const staleAal2Token = session.data.session?.access_token || "";
  assert(staleAal2Token, "Expected an AAL2 bearer before operator recovery.");

  const frozen = await service.auth.admin.updateUserById(userId, {
    password: operatorPassword,
    ban_duration: "1h",
  });
  if (frozen.error) throw frozen.error;
  console.log("RENDERLAB_217_MFA_OPERATOR_ACCOUNT_FROZEN_AND_PASSWORD_ROTATED=true");

  const blockedWhileFrozen = await updatePasswordWithBearer(staleAal2Token, staleProbePassword);
  assert(!blockedWhileFrozen.ok, `Pre-reset AAL2 bearer remained usable while recovery ban was active (HTTP ${blockedWhileFrozen.status}).`);
  console.log(`RENDERLAB_217_MFA_STALE_BEARER_BLOCKED_WHILE_FROZEN=${blockedWhileFrozen.status}`);

  const listedFactors = await service.auth.admin.mfa.listFactors({ userId });
  if (listedFactors.error) throw listedFactors.error;
  assert(listedFactors.data.factors.length === 1, "Operator recovery expected exactly one verified factor.");
  assert(listedFactors.data.factors[0].id === enrollment.data.id, "Operator recovery factor listing did not match the enrolled factor.");
  const removal = await service.auth.admin.mfa.deleteFactor({ userId, id: enrollment.data.id });
  if (removal.error) throw removal.error;
  console.log("RENDERLAB_217_MFA_OPERATOR_FACTOR_REMOVED=true");

  const operatorResetSubject = "A RenderLab verification method was removed";
  const explicitNotice = await resend("/emails", {
    method: "POST",
    body: JSON.stringify({
      from: securitySender,
      to: [recipient],
      subject: operatorResetSubject,
      html: [
        "<p><strong>RenderLab security notice</strong></p>",
        "<p>A RenderLab operator reset your authenticator after an account-recovery request.</p>",
        "<p>Your previous sessions and password were invalidated as part of this recovery. Use RenderLab password recovery to set a new password, then enroll a new authenticator before privileged Admin access can resume.</p>",
        "<p>If you did not request this recovery, do not complete password recovery and contact the RenderLab operator.</p>",
      ].join(""),
    }),
  });
  assert(typeof explicitNotice?.id === "string" && explicitNotice.id, "Resend did not return an ID for the operator-reset security notice.");
  await waitForSecurityMailById(explicitNotice.id, operatorResetSubject);
  console.log("RENDERLAB_217_MFA_OPERATOR_RESET_EMAIL_RESEND_DELIVERED=true");

  const unfrozen = await service.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (unfrozen.error) throw unfrozen.error;
  console.log("RENDERLAB_217_MFA_OPERATOR_ACCOUNT_UNFROZEN=true");

  const blockedAfterUnfreeze = await updatePasswordWithBearer(staleAal2Token, staleProbePassword);
  assert(!blockedAfterUnfreeze.ok, `Pre-reset AAL2 bearer became usable after recovery unfreeze (HTTP ${blockedAfterUnfreeze.status}).`);
  console.log(`RENDERLAB_217_MFA_STALE_BEARER_BLOCKED_AFTER_UNFREEZE=${blockedAfterUnfreeze.status}`);

  await user.auth.signOut({ scope: "local" }).catch(() => undefined);
  const oldPasswordSignIn = await user.auth.signInWithPassword({ email: recipient, password });
  assert(oldPasswordSignIn.error, "Original password remained valid after operator recovery rotation.");
  console.log("RENDERLAB_217_MFA_OLD_PASSWORD_REJECTED=true");

  const operatorCredentialSignIn = await user.auth.signInWithPassword({ email: recipient, password: operatorPassword });
  if (operatorCredentialSignIn.error) throw operatorCredentialSignIn.error;
  const assurance = await user.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) throw assurance.error;
  assert(assurance.data.currentLevel === "aal1" && assurance.data.nextLevel === "aal1", "Operator recovery did not leave the fixture at AAL1 with no enrolled factor.");
  const postResetFactors = await user.auth.mfa.listFactors();
  if (postResetFactors.error) throw postResetFactors.error;
  assert(postResetFactors.data.totp.length === 0, "Operator recovery left a TOTP factor enrolled.");
  console.log("RENDERLAB_217_MFA_POST_RESET_AAL1_NO_FACTOR=true");
  console.log("RENDERLAB_217_MFA_SECURITY_EMAIL_BRANDING_PRIVACY_OK=true");
} finally {
  await cleanup();
}
