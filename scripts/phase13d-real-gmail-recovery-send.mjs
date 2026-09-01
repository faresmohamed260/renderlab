const SUPABASE_URL = "https://rashyleshocuvpgcooxy.supabase.co";
const SITE_URL = "https://renderlab.faresuniform.uk";
const TEST_EMAIL = "playboy40k@gmail.com";
const SUBJECT = "Reset your RenderLab password";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const resendKey = process.env.RESEND_API_KEY || "";
const arm = process.env.PHASE13D_REAL_RECOVERY_ARM || "";
assert(publishableKey, "SUPABASE_PUBLISHABLE_KEY is required.");
assert(resendKey, "RESEND_API_KEY is required.");
assert(arm === "YES_PHASE13D_REAL_RECOVERY_EMAIL", "Real recovery send is not armed.");
assert(TEST_EMAIL.endsWith("@gmail.com"), "Recovery target must remain the approved Gmail test account.");

async function jsonResponse(response, label) {
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(`${label} failed with HTTP ${response.status}.`);
  return payload;
}

async function resend(path) {
  const response = await fetch(`https://api.resend.com${path}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  return jsonResponse(response, `Resend ${path}`);
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&#47;", "/")
    .replaceAll("&quot;", '"');
}

function extractConfirmUrls(html) {
  const decoded = decodeHtmlEntities(html);
  const matches = decoded.match(/https:\/\/renderlab\.faresuniform\.uk\/auth\/confirm\?[^\s"'<>]+/g) || [];
  return [...new Set(matches)];
}

console.log("PHASE13D_REAL_RECOVERY_EXTERNAL_SEND=true");
const startedAt = Date.now() - 10_000;
const recoverResponse = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
  method: "POST",
  headers: {
    apikey: publishableKey,
    "content-type": "application/json",
  },
  body: JSON.stringify({ email: TEST_EMAIL }),
});
await jsonResponse(recoverResponse, "Supabase recovery request");
console.log("PHASE13D_REAL_RECOVERY_REQUEST_ACCEPTED=true");

let listed = null;
for (let attempt = 0; attempt < 30; attempt += 1) {
  const list = await resend("/emails");
  listed = (list.data || []).find((row) =>
    Array.isArray(row?.to)
    && row.to.includes(TEST_EMAIL)
    && row.subject === SUBJECT
    && Date.parse(row.created_at) >= startedAt
  ) || null;
  if (listed?.id && listed.last_event === "delivered") break;
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
assert(listed?.id, "Resend did not expose the real Gmail recovery message.");

let message = null;
for (let attempt = 0; attempt < 15; attempt += 1) {
  message = await resend(`/emails/${encodeURIComponent(listed.id)}`);
  if (message.last_event === "delivered") break;
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
assert(message?.last_event === "delivered", "Real Gmail recovery did not reach delivered state.");
assert(Array.isArray(message.to) && message.to.length === 1 && message.to[0] === TEST_EMAIL, "Recovery recipient drifted.");
assert(message.subject === SUBJECT, "Recovery subject drifted.");
assert(typeof message.html === "string" && message.html.includes("RenderLab"), "Recovery HTML missing RenderLab branding.");
assert(!message.html.includes("{{ .ConfirmationURL }}"), "Recovery HTML contains raw ConfirmationURL template text.");
assert(!/supabase\.co\/auth\/v1\/verify/i.test(message.html), "Recovery HTML exposed raw Supabase verification URL.");
assert(!/resend\.(com|dev)\/(?:click|track)/i.test(message.html), "Recovery HTML appears to contain a Resend tracking rewrite.");

const urls = extractConfirmUrls(message.html);
assert(urls.length >= 1, "Recovery HTML did not contain the RenderLab confirmation URL.");
const parsed = new URL(urls[0]);
assert(parsed.origin === SITE_URL, "Recovery confirmation escaped production origin.");
assert(parsed.pathname === "/auth/confirm", "Recovery confirmation path drifted.");
assert(parsed.searchParams.get("type") === "recovery", "Recovery confirmation type drifted.");
assert(parsed.searchParams.get("next") === "/settings/password", "Recovery confirmation next path drifted.");
const tokenHash = parsed.searchParams.get("token_hash");
assert(typeof tokenHash === "string" && tokenHash.length > 20, "Recovery token hash is missing.");
console.log("PHASE13D_REAL_RECOVERY_RESEND_DELIVERED=true");
console.log("PHASE13D_REAL_RECOVERY_LINK_INTEGRITY=true");
console.log("PHASE13D_AWAITING_HUMAN_RECOVERY_CLICK=true");
