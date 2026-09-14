import { createHash, createHmac } from "node:crypto";
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

async function resend(path) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`Resend ${path} failed with HTTP ${response.status}.`);
  return payload;
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
  assert(message?.last_event === "delivered", `Security email did not reach delivered state: ${subject}`);
  assert(message.subject === subject, `Security email subject drifted: ${subject}`);
  assert(typeof message.html === "string" && message.html.includes("RenderLab"), `Security email is missing RenderLab branding: ${subject}`);
  assert(!message.html.includes("{{"), `Security email contains unresolved template variables: ${subject}`);
  assert(!/supabase\.co\/auth\/v1/i.test(message.html), `Security email exposed an internal Supabase Auth URL: ${subject}`);
  assert(!/resend\.(com|dev)\/(?:click|track)/i.test(message.html), `Security email appears to contain a Resend tracking rewrite: ${subject}`);
  if (userId) assert(!message.html.includes(userId), `Security email exposed an internal Auth user ID: ${subject}`);
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

  await waitForSecurityMail("A RenderLab verification method was added");
  console.log("RENDERLAB_217_MFA_ENROLLED_EMAIL_RESEND_DELIVERED=true");

  const removal = await user.auth.mfa.unenroll({ factorId: enrollment.data.id });
  if (removal.error) throw removal.error;
  console.log("RENDERLAB_217_MFA_FACTOR_REMOVED=true");

  await waitForSecurityMail("A RenderLab verification method was removed");
  console.log("RENDERLAB_217_MFA_REMOVED_EMAIL_RESEND_DELIVERED=true");
  console.log("RENDERLAB_217_MFA_SECURITY_EMAIL_BRANDING_PRIVACY_OK=true");
} finally {
  await cleanup();
}
