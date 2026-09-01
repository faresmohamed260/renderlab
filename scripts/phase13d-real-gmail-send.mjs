const supabaseUrl = "https://rashyleshocuvpgcooxy.supabase.co";
const siteUrl = "https://renderlab.faresuniform.uk";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const resendKey = process.env.RESEND_API_KEY || "";
const arm = process.env.PHASE13D_REAL_SEND_ARMED || "";
const recipients = ["playboy40k@gmail.com", "bplay2086@gmail.com"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(serviceRole, "SUPABASE_SERVICE_ROLE_KEY is required.");
assert(resendKey, "RESEND_API_KEY is required.");
assert(arm === "YES_PHASE13D_REAL_EMAIL", "Phase 13D real send is not armed.");
assert(recipients.length === 2 && recipients.every((email) => email.endsWith("@gmail.com")), "Recipients must remain the two approved Gmail test inboxes.");

const startedAt = Date.now() - 15_000;
const created = [];

async function jsonResponse(response, label) {
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}.`);
  return payload;
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRole);
  headers.set("authorization", `Bearer ${serviceRole}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
  return jsonResponse(response, `Supabase REST ${path.split("?")[0]}`);
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRole);
  headers.set("authorization", `Bearer ${serviceRole}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, { ...init, headers });
  return jsonResponse(response, `Supabase Auth ${path.split("?")[0]}`);
}

async function resend(path) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  return jsonResponse(response, `Resend ${path}`);
}

function decodeHtmlEntities(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&#x2F;", "/").replaceAll("&#47;", "/").replaceAll("&quot;", '"');
}

function confirmUrls(html) {
  const decoded = decodeHtmlEntities(html || "");
  return [...new Set(decoded.match(/https:\/\/renderlab\.faresuniform\.uk\/auth\/confirm\?[^\s"'<>]+/g) || [])];
}

console.log("PHASE13D_REAL_EXTERNAL_SEND=true");
console.log("PHASE13D_GMAIL_RECIPIENT_COUNT=2");

const domains = await resend("/domains");
const exact = (domains.data || []).find((row) => String(row?.name || "").toLowerCase().replace(/\.$/, "") === "mail.renderlab.faresuniform.uk");
assert(exact?.id, "Resend sender domain missing.");
const domain = await resend(`/domains/${encodeURIComponent(exact.id)}`);
assert(domain.status === "verified", "Resend sender domain is not verified.");
assert(domain.open_tracking === false && domain.click_tracking === false, "Resend tracking must remain disabled.");
console.log("PHASE13D_PROVIDER_BASELINE=true");

const users = await authAdmin("admin/users?page=1&per_page=1000");
const existingUsers = Array.isArray(users?.users) ? users.users : Array.isArray(users) ? users : [];
for (const email of recipients) {
  assert(!existingUsers.some((user) => String(user?.email || "").toLowerCase() === email), "A test recipient already has an Auth user.");
  const existingInvites = await serviceRest(`renderlab_beta_invitations?normalized_email=eq.${encodeURIComponent(email)}&select=id`);
  assert(existingInvites.length === 0, "A test recipient already has a RenderLab invitation.");
}

for (let index = 0; index < recipients.length; index += 1) {
  const email = recipients[index];
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const inviteRows = await serviceRest("renderlab_beta_invitations?select=id,normalized_email", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ normalized_email: email, role: "member", expires_at: expiry }),
  });
  assert(inviteRows.length === 1, "RenderLab invitation row was not created exactly once.");

  const invite = await authAdmin(`invite?redirect_to=${encodeURIComponent(`${siteUrl}/settings`)}`, {
    method: "POST",
    body: JSON.stringify({ email, data: { renderlab_fixture: "phase13d-real-gmail", recipient_slot: index + 1 } }),
  });
  const userId = invite?.id || invite?.user?.id || null;
  assert(typeof userId === "string" && userId.length > 20, "Supabase did not return the invited Auth user ID.");
  created.push({ email, userId, invitationId: inviteRows[0].id });
  console.log(`PHASE13D_INVITE_${index + 1}_ACCEPTED=true`);
}

for (let index = 0; index < recipients.length; index += 1) {
  const email = recipients[index];
  let listed = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await resend("/emails");
    listed = (list.data || []).find((row) =>
      Array.isArray(row?.to)
      && row.to.includes(email)
      && row.subject === "You're invited to RenderLab"
      && Date.parse(row.created_at) >= startedAt
    ) || null;
    if (listed?.id && listed.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(listed?.id, "Resend did not expose one of the Gmail invitations.");
  let message = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    message = await resend(`/emails/${encodeURIComponent(listed.id)}`);
    if (message.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(message?.last_event === "delivered", "A Gmail invite did not reach Resend delivered state.");
  assert(message.subject === "You're invited to RenderLab", "Invite subject drifted.");
  assert(typeof message.html === "string" && message.html.includes("RenderLab"), "Invite HTML missing RenderLab branding.");
  assert(!message.html.includes("{{ .ConfirmationURL }}"), "Invite contains raw ConfirmationURL template text.");
  assert(!/supabase\.co\/auth\/v1\/verify/i.test(message.html), "Invite exposed a raw Supabase verification URL.");
  assert(!/resend\.(com|dev)\/(?:click|track)/i.test(message.html), "Invite appears to contain a Resend tracking rewrite.");
  const urls = confirmUrls(message.html);
  assert(urls.length >= 1, "Invite HTML did not retain a RenderLab confirmation URL.");
  const parsed = new URL(urls[0]);
  assert(parsed.origin === siteUrl && parsed.pathname === "/auth/confirm", "Invite confirmation destination drifted.");
  assert(parsed.searchParams.get("type") === "invite" && parsed.searchParams.get("next") === "/settings", "Invite confirmation parameters drifted.");
  assert((parsed.searchParams.get("token_hash") || "").length > 20, "Invite token hash is missing.");
  console.log(`PHASE13D_GMAIL_${index + 1}_RESEND_DELIVERED=true`);
  console.log(`PHASE13D_GMAIL_${index + 1}_LINK_INTEGRITY=true`);
}

console.log("PHASE13D_REAL_GMAIL_INVITES_SENT=2");
console.log("PHASE13D_TEST_FIXTURES_INTENTIONALLY_RETAINED=true");
console.log("PHASE13D_AWAITING_HUMAN_MAILBOX_CHECK=true");
