import { createHash } from "node:crypto";

const supabaseUrl = "https://rashyleshocuvpgcooxy.supabase.co";
const publishableKey = "sb_publishable_Erz_UUs49DgHHDkFoXfztA_m6CbHTqw";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const resendKey = process.env.RESEND_API_KEY || "";
const arm = process.env.PHASE13D_REAL_SEND_ARMED || "";
const recipient = "playboy40k@gmail.com";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(serviceRole, "SUPABASE_SERVICE_ROLE_KEY is required.");
assert(resendKey, "RESEND_API_KEY is required.");
assert(arm === "YES_PHASE13D_REAL_EMAIL", "Real external email verification is not armed.");
assert(recipient.endsWith("@gmail.com"), "Recipient must remain the approved Gmail test inbox.");

const startedAt = Date.now() - 15_000;
const passwordA = createHash("sha256").update(`${serviceRole}:renderlab-215a-security-mail-a`).digest("base64url");
const passwordB = createHash("sha256").update(`${serviceRole}:renderlab-215a-security-mail-b`).digest("base64url");
let userId = null;

async function jsonResponse(response, label) {
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const code = typeof payload?.code === "string" ? payload.code : "unknown";
    throw new Error(`${label} failed with HTTP ${response.status}, code=${code}.`);
  }
  return payload;
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRole);
  headers.set("authorization", `Bearer ${serviceRole}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
  return jsonResponse(response, `Supabase Auth admin ${path.split("?")[0]}`);
}

async function resend(path) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  return jsonResponse(response, `Resend ${path}`);
}

async function cleanup() {
  if (!userId) return;
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRole,
      authorization: `Bearer ${serviceRole}`,
    },
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not clean #215A security-mail fixture (${response.status}).`);
  }
  console.log("RENDERLAB_215A_SECURITY_MAIL_FIXTURE_CLEAN=true");
  userId = null;
}

try {
  console.log("RENDERLAB_215A_REAL_SECURITY_EMAIL_TEST=true");
  console.log("RENDERLAB_215A_SECURITY_EMAIL_RECIPIENT_COUNT=1");

  const domains = await resend("/domains");
  const exact = (domains.data || []).find((row) => String(row?.name || "").toLowerCase().replace(/\.$/, "") === "mail.renderlab.faresuniform.uk");
  assert(exact?.id, "Resend sender domain missing.");
  const domain = await resend(`/domains/${encodeURIComponent(exact.id)}`);
  assert(domain.status === "verified", "Resend sender domain is not verified.");
  assert(domain.open_tracking === false && domain.click_tracking === false, "Resend tracking must remain disabled.");
  console.log("RENDERLAB_215A_RESEND_PROVIDER_BASELINE=true");

  const users = await authAdmin("users?page=1&per_page=1000");
  const existingUsers = Array.isArray(users?.users) ? users.users : Array.isArray(users) ? users : [];
  assert(
    !existingUsers.some((user) => String(user?.email || "").toLowerCase() === recipient),
    "Approved Gmail test recipient already has an Auth user; refusing to touch it.",
  );

  const created = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      email: recipient,
      password: passwordA,
      email_confirm: true,
      user_metadata: { source: "renderlab-215a-security-mail-delivery" },
    }),
  });
  userId = created?.id || null;
  assert(typeof userId === "string" && userId.length > 20, "Supabase did not return the fixture user ID.");
  console.log("RENDERLAB_215A_SECURITY_MAIL_FIXTURE_CREATED=true");

  const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email: recipient, password: passwordA }),
  });
  const signIn = await jsonResponse(signInResponse, "Fixture password sign-in");
  assert(typeof signIn?.access_token === "string" && signIn.access_token.length > 20, "Fixture sign-in returned no access token.");

  const updateResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${signIn.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ password: passwordB }),
  });
  await jsonResponse(updateResponse, "Fixture password update");
  console.log("RENDERLAB_215A_SECURITY_MAIL_PASSWORD_CHANGED=true");

  let listed = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await resend("/emails");
    listed = (list.data || []).find((row) =>
      Array.isArray(row?.to)
      && row.to.includes(recipient)
      && row.subject === "Your RenderLab password was changed"
      && Date.parse(row.created_at) >= startedAt
    ) || null;
    if (listed?.id && listed.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(listed?.id, "Resend did not expose the RenderLab password-change security email.");

  let message = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    message = await resend(`/emails/${encodeURIComponent(listed.id)}`);
    if (message.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(message?.last_event === "delivered", "Password-change security email did not reach Resend delivered state.");
  assert(message.subject === "Your RenderLab password was changed", "Password-change security subject drifted.");
  assert(typeof message.html === "string" && message.html.includes("RenderLab"), "Security email HTML is missing RenderLab branding.");
  assert(message.html.includes("password recovery"), "Security email is missing the contracted incident-response instruction.");
  assert(!message.html.includes("{{"), "Security email contains unresolved template variables.");
  assert(!/supabase\.co\/auth\/v1/i.test(message.html), "Security email exposed an internal Supabase Auth URL.");
  assert(!/resend\.(com|dev)\/(?:click|track)/i.test(message.html), "Security email appears to contain a Resend tracking rewrite.");
  assert(!message.html.includes(userId), "Security email exposed an internal Auth user ID.");

  console.log("RENDERLAB_215A_SECURITY_EMAIL_RESEND_DELIVERED=true");
  console.log("RENDERLAB_215A_SECURITY_EMAIL_BRANDING_OK=true");
  console.log("RENDERLAB_215A_SECURITY_EMAIL_PRIVACY_OK=true");
} finally {
  await cleanup();
}
