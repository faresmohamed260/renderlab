const env = {
  supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
  projectRef: process.env.SUPABASE_PROJECT_REF || "",
  managementToken: process.env.SUPABASE_ACCESS_TOKEN || "",
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  resendKey: process.env.RESEND_API_KEY || "",
  siteUrl: (process.env.SITE_URL || "").replace(/\/$/, ""),
  arm: process.env.PHASE13D_RESEND_SINK_ARM || "",
  runId: process.env.GITHUB_RUN_ID || "local",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const [name, value] of Object.entries({
  SUPABASE_URL: env.supabaseUrl,
  SUPABASE_PROJECT_REF: env.projectRef,
  SUPABASE_ACCESS_TOKEN: env.managementToken,
  SUPABASE_SERVICE_ROLE_KEY: env.serviceRole,
  RESEND_API_KEY: env.resendKey,
  SITE_URL: env.siteUrl,
})) {
  assert(value, `${name} is required.`);
}
assert(env.arm === "YES_RESEND_TEST_SINK_ONLY", "Phase 13D Resend sink smoke is not armed.");

const testEmail = `delivered+renderlab-phase13d-${env.runId}@resend.dev`;
assert(/^delivered\+renderlab-phase13d-[a-zA-Z0-9_-]+@resend\.dev$/.test(testEmail), "Test recipient escaped the approved Resend delivered sink.");
const startedAt = Date.now() - 10_000;
const invitationExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
let invitedUserId = null;
let invitationId = null;
let resendEmailId = null;
let primaryError = null;

async function jsonResponse(response, label) {
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}.`);
  return payload;
}

async function serviceRest(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", env.serviceRole);
  headers.set("authorization", `Bearer ${env.serviceRole}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, { ...init, headers });
  return jsonResponse(response, `Supabase service REST ${path.split("?")[0]}`);
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", env.serviceRole);
  headers.set("authorization", `Bearer ${env.serviceRole}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(`${env.supabaseUrl}/auth/v1/${path}`, { ...init, headers });
  return { response, payload: await response.text() };
}

async function resend(path) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${env.resendKey}` },
  });
  return jsonResponse(response, `Resend ${path}`);
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&#47;", "/")
    .replaceAll("&quot;", '"');
}

function extractRenderLabConfirmUrls(html) {
  const decoded = decodeHtmlEntities(html);
  const matches = decoded.match(/https:\/\/renderlab\.faresuniform\.uk\/auth\/confirm\?[^\s"'<>]+/g) || [];
  return [...new Set(matches)];
}

async function cleanup() {
  if (invitedUserId) {
    for (const [table, filter] of [
      ["generation_admission_reservations", `owner_id=eq.${encodeURIComponent(invitedUserId)}`],
      ["generation_jobs", `owner_id=eq.${encodeURIComponent(invitedUserId)}`],
      ["generation_sources", `owner_id=eq.${encodeURIComponent(invitedUserId)}`],
      ["media_upload_sessions", `owner_id=eq.${encodeURIComponent(invitedUserId)}`],
      ["media_assets", `owner_id=eq.${encodeURIComponent(invitedUserId)}`],
      ["renderlab_account_access", `user_id=eq.${encodeURIComponent(invitedUserId)}`],
    ]) {
      await serviceRest(`${table}?${filter}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
    }
  }
  await serviceRest(`renderlab_beta_invitations?normalized_email=eq.${encodeURIComponent(testEmail)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  }).catch(() => {});
  if (invitedUserId) {
    const { response } = await authAdmin(`admin/users/${encodeURIComponent(invitedUserId)}`, {
      method: "DELETE",
      body: JSON.stringify({ should_soft_delete: false }),
    });
    if (!response.ok && response.status !== 404) throw new Error(`Could not delete exact synthetic Auth user (${response.status}).`);
  }
}

try {
  console.log("PHASE13D_RESEND_SINK_ONLY=true");
  console.log("PHASE13D_EXTERNAL_MAILBOX_SEND=false");

  const authConfigResponse = await fetch(`https://api.supabase.com/v1/projects/${env.projectRef}/config/auth`, {
    headers: { Authorization: `Bearer ${env.managementToken}`, "User-Agent": "RenderLab-Phase13D-ResendSink/1.0" },
  });
  const authConfig = await jsonResponse(authConfigResponse, "Supabase Auth config read");
  assert(authConfig.smtp_host === "smtp.resend.com", "Supabase Auth SMTP is not Resend.");
  assert(String(authConfig.smtp_port) === "587", "Unexpected Supabase SMTP port.");
  assert(authConfig.smtp_admin_email === "noreply@mail.renderlab.faresuniform.uk", "Unexpected Supabase From address.");
  assert(authConfig.mailer_subjects_invite === "You're invited to RenderLab", "Unexpected invite subject.");

  const domains = await resend("/domains");
  const exactDomain = (domains.data || []).find((row) => String(row?.name || "").toLowerCase().replace(/\.$/, "") === "mail.renderlab.faresuniform.uk");
  assert(exactDomain?.id, "Resend sender domain was not found.");
  const domain = await resend(`/domains/${encodeURIComponent(exactDomain.id)}`);
  assert(domain.status === "verified", "Resend sender domain is not verified.");
  assert(domain.open_tracking === false && domain.click_tracking === false, "Resend tracking must remain disabled.");
  console.log("PHASE13D_PROVIDER_BASELINE=true");

  const existingInvitations = await serviceRest(`renderlab_beta_invitations?normalized_email=eq.${encodeURIComponent(testEmail)}&select=id`);
  assert(existingInvitations.length === 0, "Synthetic invitation unexpectedly existed before the run.");

  const invitations = await serviceRest("renderlab_beta_invitations?select=id,normalized_email,role,expires_at,created_at", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ normalized_email: testEmail, role: "member", expires_at: invitationExpiry }),
  });
  assert(invitations.length === 1, "Synthetic RenderLab invitation was not created exactly once.");
  invitationId = invitations[0].id;

  const inviteUrl = `${env.supabaseUrl}/auth/v1/invite?redirect_to=${encodeURIComponent(`${env.siteUrl}/settings`)}`;
  const inviteResponse = await fetch(inviteUrl, {
    method: "POST",
    headers: {
      apikey: env.serviceRole,
      authorization: `Bearer ${env.serviceRole}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: testEmail,
      data: { renderlab_fixture: "phase13d-resend-sink", run: env.runId },
    }),
  });
  const invitePayload = await jsonResponse(inviteResponse, "Supabase Auth invite send");
  invitedUserId = invitePayload?.id || invitePayload?.user?.id || null;
  assert(typeof invitedUserId === "string" && invitedUserId.length > 20, "Supabase invite response did not return the synthetic user ID.");
  console.log("PHASE13D_SUPABASE_INVITE_ACCEPTED=true");

  let listed = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await resend("/emails");
    listed = (list.data || []).find((row) =>
      Array.isArray(row?.to)
      && row.to.includes(testEmail)
      && row.subject === "You're invited to RenderLab"
      && Date.parse(row.created_at) >= startedAt
    ) || null;
    if (listed?.id && listed.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(listed?.id, "Resend did not expose the synthetic invite in sent-email observability.");
  resendEmailId = listed.id;

  let message = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    message = await resend(`/emails/${encodeURIComponent(resendEmailId)}`);
    if (message.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(message?.last_event === "delivered", `Synthetic Resend message did not reach delivered state.`);
  assert(message.from === "RenderLab <noreply@mail.renderlab.faresuniform.uk>", "Synthetic invite has the wrong From identity.");
  assert(Array.isArray(message.to) && message.to.length === 1 && message.to[0] === testEmail, "Synthetic invite recipient did not remain the Resend test sink.");
  assert(message.subject === "You're invited to RenderLab", "Synthetic invite subject drifted.");
  assert(typeof message.html === "string" && message.html.includes("RenderLab"), "Synthetic invite HTML was not retained for verification.");
  assert(!message.html.includes("{{ .ConfirmationURL }}"), "Synthetic invite contains raw ConfirmationURL template text.");
  assert(!/supabase\.co\/auth\/v1\/verify/i.test(message.html), "Synthetic invite exposed a raw Supabase verification URL.");
  assert(!/resend\.(com|dev)\/(?:click|track)/i.test(message.html), "Synthetic invite appears to contain a Resend tracking rewrite.");

  const confirmUrls = extractRenderLabConfirmUrls(message.html);
  assert(confirmUrls.length >= 1, "Synthetic invite HTML did not contain the RenderLab confirmation URL.");
  const parsed = new URL(confirmUrls[0]);
  assert(parsed.origin === env.siteUrl, "Synthetic invite confirmation escaped the production origin.");
  assert(parsed.pathname === "/auth/confirm", "Synthetic invite confirmation has the wrong path.");
  assert(parsed.searchParams.get("type") === "invite", "Synthetic invite confirmation has the wrong flow type.");
  assert(parsed.searchParams.get("next") === "/settings", "Synthetic invite confirmation has the wrong next path.");
  const tokenHash = parsed.searchParams.get("token_hash");
  assert(typeof tokenHash === "string" && tokenHash.length > 20, "Synthetic invite confirmation token hash is missing.");
  console.log("PHASE13D_RESEND_DELIVERED=true");
  console.log("PHASE13D_STORED_HTML_LINK_INTEGRITY=true");

  const confirmResponse = await fetch(parsed.toString(), { redirect: "manual" });
  assert(confirmResponse.status === 307, `Production invite confirmation expected 307, got ${confirmResponse.status}.`);
  assert(confirmResponse.headers.get("location") === "/settings?auth=invitation_accepted", "Production invite confirmation did not accept the exact RenderLab invitation.");

  const invitationRows = await serviceRest(`renderlab_beta_invitations?id=eq.${encodeURIComponent(invitationId)}&select=claimed_at,claimed_user_id,revoked_at`);
  assert(invitationRows.length === 1, "Synthetic invitation disappeared before acceptance verification.");
  assert(invitationRows[0].claimed_at != null, "Synthetic invitation was not marked claimed.");
  assert(invitationRows[0].claimed_user_id === invitedUserId, "Synthetic invitation claimed the wrong user.");
  assert(invitationRows[0].revoked_at == null, "Synthetic invitation was unexpectedly revoked.");
  const accessRows = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(invitedUserId)}&select=role,status`);
  assert(accessRows.length === 1 && accessRows[0].role === "member" && accessRows[0].status === "active", "Synthetic invite did not create active member access.");

  const replayResponse = await fetch(parsed.toString(), { redirect: "manual" });
  assert(replayResponse.status === 307, `Consumed invite replay expected 307, got ${replayResponse.status}.`);
  assert(replayResponse.headers.get("location") === "/settings?auth=link_invalid", "Consumed invite replay did not fail closed.");
  console.log("PHASE13D_SYNTHETIC_INVITE_LIFECYCLE=true");
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanup();
    const invitationResidue = await serviceRest(`renderlab_beta_invitations?normalized_email=eq.${encodeURIComponent(testEmail)}&select=id`);
    assert(invitationResidue.length === 0, "Synthetic invitation cleanup residue remains.");
    if (invitedUserId) {
      const accessResidue = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(invitedUserId)}&select=user_id`);
      assert(accessResidue.length === 0, "Synthetic access cleanup residue remains.");
    }
    console.log("PHASE13D_SYNTHETIC_DB_RESIDUE=0");
  } catch (cleanupError) {
    if (!primaryError) primaryError = cleanupError;
    else console.error("Synthetic cleanup also failed; direct residue audit is required.");
  }
}

if (primaryError) throw primaryError;
console.log("PHASE13D_RESEND_SINK_SMOKE=PASS");
console.log("PHASE13D_REAL_USER_MAILBOX_ACCEPTANCE=false");
