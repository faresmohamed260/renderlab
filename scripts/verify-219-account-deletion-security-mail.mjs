import { readFileSync } from "node:fs";

const resendKey = process.env.RESEND_API_KEY || "";
const arm = process.env.RENDERLAB_219_REAL_DELETION_MAIL_ARMED || "";
const historicalAcceptance = readFileSync("scripts/phase13d-real-gmail-send.mjs", "utf8");
const candidateSource = readFileSync("candidate/src/server/account/account-deletion-notification.ts", "utf8");
const recipient = historicalAcceptance.match(/const recipient = "([^"]+@gmail\.com)";/)?.[1] || "";
const subject = candidateSource.match(/const deletionNoticeSubject = "([^"]+)";/)?.[1] || "";
const sender = candidateSource.match(/const deletionNoticeSender = "([^"]+)";/)?.[1] || "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(resendKey, "RESEND_API_KEY is required.");
assert(arm === "YES_RENDERLAB_219_REAL_DELETION_EMAIL", "Real #219 deletion security-mail verification is not armed.");
assert(recipient.endsWith("@gmail.com"), "Approved historical Gmail test recipient could not be resolved.");
assert(subject === "Your RenderLab account deletion was accepted", "#219 deletion email subject drifted.");
assert(sender === "RenderLab Security <security@mail.renderlab.faresuniform.uk>", "#219 deletion email sender drifted.");
for (const requiredSourceText of [
  "Your irreversible RenderLab account deletion request was accepted.",
  "New creative work is blocked while RenderLab removes account-owned product data and media, then removes the sign-in identity last.",
  "Infrastructure providers may retain service logs according to their own retention policies.",
  "If you did not request this deletion, contact the RenderLab operator immediately.",
]) {
  assert(candidateSource.includes(requiredSourceText), `Candidate deletion notification is missing required copy: ${requiredSourceText}`);
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

const domains = await resend("/domains");
const exact = (domains.data || []).find((row) => String(row?.name || "").toLowerCase().replace(/\.$/, "") === "mail.renderlab.faresuniform.uk");
assert(exact?.id, "Resend sender domain missing.");
const domain = await resend(`/domains/${encodeURIComponent(exact.id)}`);
assert(domain.status === "verified", "Resend sender domain is not verified.");
assert(domain.open_tracking === false && domain.click_tracking === false, "Resend tracking must remain disabled.");

const html = [
  "<p><strong>RenderLab security notice</strong></p>",
  "<p>Your irreversible RenderLab account deletion request was accepted.</p>",
  "<p>New creative work is blocked while RenderLab removes account-owned product data and media, then removes the sign-in identity last.</p>",
  "<p>Infrastructure providers may retain service logs according to their own retention policies.</p>",
  "<p>If you did not request this deletion, contact the RenderLab operator immediately.</p>",
].join("");

const sent = await resend("/emails", {
  method: "POST",
  body: JSON.stringify({ from: sender, to: [recipient], subject, html }),
});
assert(typeof sent?.id === "string" && sent.id, "Resend did not return an ID for the #219 deletion notice.");

let message = null;
for (let attempt = 0; attempt < 30; attempt += 1) {
  message = await resend(`/emails/${encodeURIComponent(sent.id)}`);
  if (message.last_event === "delivered") break;
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
assert(message?.last_event === "delivered", "#219 deletion security email did not reach delivered state.");
assert(message.subject === subject, "Delivered #219 deletion security email subject drifted.");
assert(typeof message.html === "string" && message.html.includes("RenderLab security notice"), "Delivered #219 email lost RenderLab branding.");
assert(!message.html.includes("{{"), "Delivered #219 email contains unresolved template variables.");
assert(!/supabase\.co\/auth\/v1/i.test(message.html), "Delivered #219 email exposed an internal Supabase Auth URL.");
assert(!/resend\.(com|dev)\/(?:click|track)/i.test(message.html), "Delivered #219 email appears to contain a Resend tracking rewrite.");

console.log("RENDERLAB_219_DELETION_EMAIL_RESEND_DELIVERED=true");
console.log("RENDERLAB_219_DELETION_EMAIL_BRANDING_PRIVACY_OK=true");
console.log("RENDERLAB_219_DELETION_EMAIL_RECIPIENT_COUNT=1");
