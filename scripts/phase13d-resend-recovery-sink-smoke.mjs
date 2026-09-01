const env = {
  supabaseUrl: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
  projectRef: process.env.SUPABASE_PROJECT_REF || "",
  managementToken: process.env.SUPABASE_ACCESS_TOKEN || "",
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
  resendKey: process.env.RESEND_API_KEY || "",
  siteUrl: (process.env.SITE_URL || "").replace(/\/$/, ""),
  arm: process.env.PHASE13D_RESEND_RECOVERY_SINK_ARM || "",
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
  SUPABASE_PUBLISHABLE_KEY: env.publishableKey,
  RESEND_API_KEY: env.resendKey,
  SITE_URL: env.siteUrl,
})) assert(value, `${name} is required.`);
assert(env.arm === "YES_RESEND_TEST_SINK_RECOVERY_ONLY", "Phase 13D recovery sink smoke is not armed.");

const testEmail = `delivered+renderlab-phase13d-recovery-${env.runId}@resend.dev`;
assert(/^delivered\+renderlab-phase13d-recovery-[a-zA-Z0-9_-]+@resend\.dev$/.test(testEmail), "Recipient escaped the approved Resend delivered sink.");
const tempPassword = `RenderLab-Phase13D-${env.runId}-Recovery!`;
let invitedUserId = null;
let invitationId = null;
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
  return fetch(`${env.supabaseUrl}/auth/v1/${path}`, { ...init, headers });
}

async function resend(path) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${env.resendKey}` },
  });
  return jsonResponse(response, `Resend ${path}`);
}

function parseFromIdentity(value) {
  const raw = String(value || "").trim();
  const bracketed = /^(.*?)\s*<([^<>]+)>$/.exec(raw);
  if (!bracketed) return { displayName: "", address: raw.toLowerCase() };
  return {
    displayName: bracketed[1].trim().replace(/^"|"$/g, ""),
    address: bracketed[2].trim().toLowerCase(),
  };
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

async function waitForDeliveredMessage(subject, startedAt) {
  let row = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const list = await resend("/emails");
    row = (list.data || []).find((candidate) =>
      Array.isArray(candidate?.to)
      && candidate.to.includes(testEmail)
      && candidate.subject === subject
      && Date.parse(candidate.created_at) >= startedAt
    ) || null;
    if (row?.id && row.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(row?.id, `Resend did not expose the ${subject} message.`);
  let message = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    message = await resend(`/emails/${encodeURIComponent(row.id)}`);
    if (message.last_event === "delivered") break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  assert(message?.last_event === "delivered", `${subject} did not reach delivered state.`);
  return message;
}

function verifyMessageIdentity(message, subject) {
  const from = parseFromIdentity(message.from);
  assert(from.address === "noreply@mail.renderlab.faresuniform.uk", `${subject} has the wrong From mailbox.`);
  assert(from.displayName === "RenderLab", `${subject} has the wrong From display name.`);
  assert(Array.isArray(message.to) && message.to.length === 1 && message.to[0] === testEmail, `${subject} escaped the Resend test sink.`);
  assert(message.subject === subject, `${subject} subject drifted.`);
  assert(typeof message.html === "string" && message.html.includes("RenderLab"), `${subject} HTML was not retained.`);
  assert(!message.html.includes("{{ .ConfirmationURL }}"), `${subject} contains raw ConfirmationURL template text.`);
  assert(!/supabase\.co\/auth\/v1\/verify/i.test(message.html), `${subject} exposed a raw Supabase verification URL.`);
  assert(!/resend\.(com|dev)\/(?:click|track)/i.test(message.html), `${subject} appears to contain a Resend tracking rewrite.`);
}

function exactConfirmUrl(message, type, next) {
  const urls = extractRenderLabConfirmUrls(message.html);
  assert(urls.length >= 1, `${type} message is missing the RenderLab confirmation URL.`);
  const matching = urls.map((url) => new URL(url)).find((url) =>
    url.origin === env.siteUrl
    && url.pathname === "/auth/confirm"
    && url.searchParams.get("type") === type
    && url.searchParams.get("next") === next
    && (url.searchParams.get("token_hash") || "").length > 20
  );
  assert(matching, `${type} message does not contain the exact accepted token-hash contract.`);
  return matching;
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
    const response = await authAdmin(`admin/users/${encodeURIComponent(invitedUserId)}`, {
      method: "DELETE",
      body: JSON.stringify({ should_soft_delete: false }),
    });
    if (!response.ok && response.status !== 404) throw new Error(`Could not delete the exact synthetic Auth user (${response.status}).`);
  }
}

try {
  console.log("PHASE13D_RESEND_RECOVERY_SINK_ONLY=true");
  console.log("PHASE13D_EXTERNAL_MAILBOX_SEND=false");

  const authConfig = await jsonResponse(await fetch(`https://api.supabase.com/v1/projects/${env.projectRef}/config/auth`, {
    headers: { Authorization: `Bearer ${env.managementToken}`, "User-Agent": "RenderLab-Phase13D-RecoverySink/1.0" },
  }), "Supabase Auth config read");
  assert(authConfig.smtp_host === "smtp.resend.com", "Supabase Auth SMTP is not Resend.");
  assert(String(authConfig.smtp_port) === "587", "Unexpected Supabase SMTP port.");
  assert(authConfig.smtp_admin_email === "noreply@mail.renderlab.faresuniform.uk", "Unexpected Supabase From address.");
  assert(authConfig.smtp_sender_name === "RenderLab", "Unexpected Supabase sender display name.");
  assert(authConfig.mailer_subjects_invite === "You're invited to RenderLab", "Unexpected invite subject.");
  assert(authConfig.mailer_subjects_recovery === "Reset your RenderLab password", "Unexpected recovery subject.");

  const domains = await resend("/domains");
  const exactDomain = (domains.data || []).find((row) => String(row?.name || "").toLowerCase().replace(/\.$/, "") === "mail.renderlab.faresuniform.uk");
  assert(exactDomain?.id, "Resend sender domain was not found.");
  const domain = await resend(`/domains/${encodeURIComponent(exactDomain.id)}`);
  assert(domain.status === "verified", "Resend sender domain is not verified.");
  assert(domain.open_tracking === false && domain.click_tracking === false, "Resend tracking must remain disabled.");
  console.log("PHASE13D_PROVIDER_BASELINE=true");

  const invitations = await serviceRest("renderlab_beta_invitations?select=id,normalized_email,role,expires_at,created_at", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      normalized_email: testEmail,
      role: "member",
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
  });
  assert(invitations.length === 1, "Synthetic RenderLab invitation was not created exactly once.");
  invitationId = invitations[0].id;

  const inviteStartedAt = Date.now() - 5_000;
  const inviteResponse = await fetch(`${env.supabaseUrl}/auth/v1/invite?redirect_to=${encodeURIComponent(`${env.siteUrl}/settings`)}`, {
    method: "POST",
    headers: { apikey: env.serviceRole, authorization: `Bearer ${env.serviceRole}`, "content-type": "application/json" },
    body: JSON.stringify({ email: testEmail, data: { renderlab_fixture: "phase13d-resend-recovery-sink", run: env.runId } }),
  });
  const invitePayload = await jsonResponse(inviteResponse, "Supabase Auth invite send");
  invitedUserId = invitePayload?.id || invitePayload?.user?.id || null;
  assert(typeof invitedUserId === "string" && invitedUserId.length > 20, "Supabase invite response did not return a synthetic user ID.");

  const inviteMessage = await waitForDeliveredMessage("You're invited to RenderLab", inviteStartedAt);
  verifyMessageIdentity(inviteMessage, "You're invited to RenderLab");
  const inviteUrl = exactConfirmUrl(inviteMessage, "invite", "/settings");
  const inviteConfirm = await fetch(inviteUrl.toString(), { redirect: "manual" });
  assert(inviteConfirm.status === 307 && inviteConfirm.headers.get("location") === "/settings?auth=invitation_accepted", "Synthetic invite did not complete through the production confirmation route.");
  const inviteRows = await serviceRest(`renderlab_beta_invitations?id=eq.${encodeURIComponent(invitationId)}&select=claimed_at,claimed_user_id,revoked_at`);
  assert(inviteRows.length === 1 && inviteRows[0].claimed_at != null && inviteRows[0].claimed_user_id === invitedUserId && inviteRows[0].revoked_at == null, "Synthetic invitation claim state is incorrect.");
  const accessRows = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(invitedUserId)}&select=role,status`);
  assert(accessRows.length === 1 && accessRows[0].role === "member" && accessRows[0].status === "active", "Synthetic invite did not establish active member access.");
  const inviteReplay = await fetch(inviteUrl.toString(), { redirect: "manual" });
  assert(inviteReplay.status === 307 && inviteReplay.headers.get("location") === "/settings?auth=link_invalid", "Consumed invite replay did not fail closed.");
  console.log("PHASE13D_SYNTHETIC_INVITE_PREREQUISITE=true");

  const passwordResponse = await authAdmin(`admin/users/${encodeURIComponent(invitedUserId)}`, {
    method: "PUT",
    body: JSON.stringify({ password: tempPassword }),
  });
  assert(passwordResponse.ok, `Could not establish the synthetic recovery prerequisite (${passwordResponse.status}).`);

  const recoveryStartedAt = Date.now() - 5_000;
  const recoveryRedirect = `${env.siteUrl}/auth/confirm?type=recovery&next=/settings/password`;
  const recoveryResponse = await fetch(`${env.supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(recoveryRedirect)}`, {
    method: "POST",
    headers: {
      apikey: env.publishableKey,
      authorization: `Bearer ${env.publishableKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email: testEmail }),
  });
  assert(recoveryResponse.ok, `Supabase recovery send was not accepted (${recoveryResponse.status}).`);
  console.log("PHASE13D_SUPABASE_RECOVERY_ACCEPTED=true");

  const recoveryMessage = await waitForDeliveredMessage("Reset your RenderLab password", recoveryStartedAt);
  verifyMessageIdentity(recoveryMessage, "Reset your RenderLab password");
  const recoveryUrl = exactConfirmUrl(recoveryMessage, "recovery", "/settings/password");
  console.log("PHASE13D_RECOVERY_RESEND_DELIVERED=true");
  console.log("PHASE13D_RECOVERY_STORED_HTML_LINK_INTEGRITY=true");

  const recoveryConfirm = await fetch(recoveryUrl.toString(), { redirect: "manual" });
  assert(recoveryConfirm.status === 307, `Production recovery confirmation expected 307, got ${recoveryConfirm.status}.`);
  assert(recoveryConfirm.headers.get("location") === "/settings/password", "Production recovery confirmation did not route to password replacement.");
  const setCookies = typeof recoveryConfirm.headers.getSetCookie === "function"
    ? recoveryConfirm.headers.getSetCookie()
    : [recoveryConfirm.headers.get("set-cookie") || ""];
  assert(setCookies.some((value) => value.includes("renderlab_password_recovery=")), "Production recovery confirmation did not issue the RenderLab recovery marker.");

  const recoveryReplay = await fetch(recoveryUrl.toString(), { redirect: "manual" });
  assert(recoveryReplay.status === 307 && recoveryReplay.headers.get("location") === "/settings?auth=link_invalid", "Consumed recovery replay did not fail closed.");
  const accessAfterRecovery = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(invitedUserId)}&select=role,status`);
  assert(accessAfterRecovery.length === 1 && accessAfterRecovery[0].role === "member" && accessAfterRecovery[0].status === "active", "Recovery confirmation changed RenderLab admission unexpectedly.");
  console.log("PHASE13D_SYNTHETIC_RECOVERY_LIFECYCLE=true");
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
    else console.error("Synthetic cleanup also failed; independent residue audit is required.");
  }
}

if (primaryError) throw primaryError;
console.log("PHASE13D_RESEND_RECOVERY_SINK_SMOKE=PASS");
console.log("PHASE13D_REAL_USER_MAILBOX_ACCEPTANCE=false");
