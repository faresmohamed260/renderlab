import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const commandPath = ".github/phase13d/command.txt";
const command = (await readFile(commandPath, "utf8")).trim();
if (command !== "preflight") {
  throw new Error(`Unsupported Phase 13D command: ${command || "<empty>"}. This preflight cannot send email.`);
}

const env = {
  SUPABASE_URL: (process.env.SUPABASE_URL || "").replace(/\/$/, ""),
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF || "",
  SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  SITE_URL: (process.env.SITE_URL || "").replace(/\/$/, ""),
  SENDER_DOMAIN: process.env.SENDER_DOMAIN || "",
  FROM_EMAIL: process.env.FROM_EMAIL || "",
  GMAIL_RECIPIENT: process.env.RENDERLAB_13D_GMAIL_RECIPIENT || "",
  OUTLOOK_RECIPIENT: process.env.RENDERLAB_13D_OUTLOOK_RECIPIENT || "",
  SEND_ARMED: process.env.RENDERLAB_13D_SEND_ARMED || "",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const name of ["SUPABASE_URL", "SUPABASE_PROJECT_REF", "SUPABASE_ACCESS_TOKEN", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "SITE_URL", "SENDER_DOMAIN", "FROM_EMAIL"]) {
  assert(env[name], `${name} is required for Phase 13D preflight.`);
  console.log(`${name}_PRESENT=true`);
}

console.log(`RENDERLAB_13D_GMAIL_RECIPIENT_PRESENT=${Boolean(env.GMAIL_RECIPIENT)}`);
console.log(`RENDERLAB_13D_OUTLOOK_RECIPIENT_PRESENT=${Boolean(env.OUTLOOK_RECIPIENT)}`);
console.log(`RENDERLAB_13D_SEND_ARMED=${env.SEND_ARMED === "YES_PHASE13D_REAL_EMAIL"}`);

function curlJson(url, { headers = [] } = {}) {
  const args = ["--fail-with-body", "--silent", "--show-error", "--location"];
  for (const header of headers) args.push("--header", header);
  args.push(url);
  const stdout = execFileSync("curl", args, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(stdout);
}

const resendHeaders = [`Authorization: Bearer ${env.RESEND_API_KEY}`];
const domains = curlJson("https://api.resend.com/domains", { headers: resendHeaders });
const exactDomains = (domains.data || []).filter((row) => String(row?.name || "").toLowerCase().replace(/\.$/, "") === env.SENDER_DOMAIN.toLowerCase().replace(/\.$/, ""));
assert(exactDomains.length === 1, `Expected exactly one Resend domain for ${env.SENDER_DOMAIN}.`);
const domain = curlJson(`https://api.resend.com/domains/${encodeURIComponent(exactDomains[0].id)}`, { headers: resendHeaders });
assert(domain.status === "verified", "Resend sender domain is not verified.");
assert(domain.open_tracking === false, "Resend open tracking must remain disabled.");
assert(domain.click_tracking === false, "Resend click tracking must remain disabled.");
console.log("RESEND_DOMAIN_VERIFIED=true");
console.log("RESEND_OPEN_TRACKING=false");
console.log("RESEND_CLICK_TRACKING=false");

// Verify the same API key can observe SMTP-originated messages later without logging any message metadata.
execFileSync("curl", [
  "--fail-with-body", "--silent", "--show-error", "--output", "/tmp/resend-emails.json",
  "--header", `Authorization: Bearer ${env.RESEND_API_KEY}`,
  "https://api.resend.com/emails?limit=1",
], { stdio: ["ignore", "ignore", "pipe"] });
const emailList = JSON.parse(await readFile("/tmp/resend-emails.json", "utf8"));
assert(Array.isArray(emailList.data), "Resend sent-email observability endpoint returned an unexpected shape.");
console.log("RESEND_SENT_EMAIL_OBSERVABILITY=true");

const authConfigResponse = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/config/auth`, {
  headers: {
    Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
    "User-Agent": "RenderLab-Phase13D-Preflight/1.0",
  },
});
assert(authConfigResponse.ok, `Supabase Auth config read failed (${authConfigResponse.status}).`);
const authConfig = await authConfigResponse.json();
assert(authConfig.site_url === env.SITE_URL, "Unexpected production Auth Site URL.");
assert(authConfig.smtp_host === "smtp.resend.com", "Supabase Auth SMTP is not Resend.");
assert(String(authConfig.smtp_port) === "587", "Unexpected Supabase Auth SMTP port.");
assert(authConfig.smtp_admin_email === env.FROM_EMAIL, "Unexpected Supabase Auth From address.");
assert(authConfig.smtp_sender_name === "RenderLab", "Unexpected Supabase Auth sender name.");
assert(Number(authConfig.rate_limit_email_sent) === 30, "Unexpected Supabase Auth email rate limit.");
assert(authConfig.mailer_subjects_invite === "You're invited to RenderLab", "Unexpected invite subject.");
assert(authConfig.mailer_subjects_recovery === "Reset your RenderLab password", "Unexpected recovery subject.");
const inviteBody = String(authConfig.mailer_templates_invite_content || "");
const recoveryBody = String(authConfig.mailer_templates_recovery_content || "");
for (const [name, body, flow, next] of [
  ["invite", inviteBody, "invite", "/settings"],
  ["recovery", recoveryBody, "recovery", "/settings/password"],
]) {
  assert(!body.includes("{{ .ConfirmationURL }}"), `${name} template regressed to ConfirmationURL.`);
  assert(body.includes("{{ .TokenHash }}"), `${name} template is missing TokenHash.`);
  assert(body.includes("{{ .SiteURL }}"), `${name} template is missing SiteURL.`);
  assert(body.includes(`type=${flow}`), `${name} template is missing flow type.`);
  assert(body.includes(`next=${next}`) || body.includes(`next=${next.replaceAll("/", "&#x2F;")}`), `${name} template is missing expected next path.`);
}
console.log("SUPABASE_RESEND_SMTP_TEMPLATE_BASELINE=true");

async function serviceRest(path) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  assert(response.ok, `Supabase service REST read failed for ${path.split("?")[0]} (${response.status}).`);
  return response.json();
}

const accessRows = await serviceRest("renderlab_account_access?select=user_id,role,status,generation_enabled,max_active_jobs,max_jobs_per_hour&order=created_at.asc");
const activeAdmins = accessRows.filter((row) => row.role === "admin" && row.status === "active");
assert(activeAdmins.length === 1, `Expected exactly one active persistent RenderLab admin; found ${activeAdmins.length}.`);
assert(accessRows.length === 1, `Expected the accepted one-account Closed-Beta baseline; found ${accessRows.length} RenderLab access rows.`);
console.log("RENDERLAB_PERSISTENT_ADMIN_BASELINE=true");

const pendingInvitations = await serviceRest(`renderlab_beta_invitations?select=id&claimed_at=is.null&revoked_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`);
assert(pendingInvitations.length === 0, `Expected zero pre-existing pending RenderLab invitations; found ${pendingInvitations.length}.`);
console.log("RENDERLAB_PENDING_INVITATIONS_BASELINE=0");

const settingsRows = await serviceRest("renderlab_beta_settings?singleton_id=eq.1&select=generation_enabled,max_active_jobs,max_jobs_per_hour,updated_by&limit=1");
assert(settingsRows.length === 1, "RenderLab generation settings singleton is missing.");
const settings = settingsRows[0];
assert(settings.generation_enabled === true, "Generation baseline is not enabled.");
assert(Number(settings.max_active_jobs) === 1, "Generation active-job baseline is not 1.");
assert(Number(settings.max_jobs_per_hour) === 12, "Generation hourly baseline is not 12.");
assert(settings.updated_by == null, "Generation settings updater baseline is not null.");
console.log("RENDERLAB_GENERATION_DEFAULTS_BASELINE=true");

const settingsPage = await fetch(`${env.SITE_URL}/settings`, { redirect: "manual" });
assert(settingsPage.status === 200, `Production Settings expected 200, got ${settingsPage.status}.`);
const invalidConfirm = await fetch(`${env.SITE_URL}/auth/confirm?type=invite`, { redirect: "manual" });
assert(invalidConfirm.status === 307, `Invalid production invite confirm expected 307, got ${invalidConfirm.status}.`);
assert(invalidConfirm.headers.get("location") === "/settings?auth=link_invalid", "Invalid production invite link did not fail closed to Settings.");
console.log("PRODUCTION_AUTH_SURFACE_PREFLIGHT=true");

const recipientReady = Boolean(env.GMAIL_RECIPIENT && env.OUTLOOK_RECIPIENT);
const sendArmed = env.SEND_ARMED === "YES_PHASE13D_REAL_EMAIL";
console.log(`PHASE13D_RECIPIENTS_READY=${recipientReady}`);
console.log(`PHASE13D_REAL_SEND_ARMED=${sendArmed}`);
console.log(`PHASE13D_SEND_READY=${recipientReady && sendArmed}`);
console.log("PHASE13D_REAL_EMAIL_SENT=false");
