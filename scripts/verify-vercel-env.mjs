const isVercelBuild = process.env.VERCEL === "1";

if (!isVercelBuild) {
  console.log("Skipping Vercel environment verification outside Vercel.");
  process.exit(0);
}

const required = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDFLARE_R2_ACCOUNT_ID",
  "CLOUDFLARE_R2_ACCESS_KEY_ID",
  "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_BUCKET",
  "RENDERLAB_UPSCALE_WORKER_GATEWAY_URL",
  "RESEND_API_KEY",
  "CRON_SECRET",
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(`Vercel deployment is missing required environment variables: ${missing.join(", ")}`);
}

const expectedSupabaseUrl = "https://rashyleshocuvpgcooxy.supabase.co";
const supabaseUrl = process.env.SUPABASE_URL.trim().replace(/\/$/, "");

if (supabaseUrl !== expectedSupabaseUrl) {
  throw new Error("Vercel SUPABASE_URL must target the approved shared RenderLab/Saga project.");
}

const externalBackendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL?.trim();
const externalBackendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN?.trim();
if (Boolean(externalBackendUrl) !== Boolean(externalBackendToken)) {
  throw new Error(
    "RENDERLAB_GENERATION_BACKEND_URL and RENDERLAB_GENERATION_BACKEND_TOKEN must be configured together or both omitted.",
  );
}

const fiboEnabled = process.env.RENDERLAB_FIBO_GENERATION?.trim() === "1";
const fiboUrl = process.env.RENDERLAB_FIBO_GATEWAY_URL?.trim();
const fiboKey = process.env.RENDERLAB_FIBO_MODAL_KEY?.trim();
const fiboSecret = process.env.RENDERLAB_FIBO_MODAL_SECRET?.trim();
if (fiboEnabled && (!fiboUrl || !fiboKey || !fiboSecret)) {
  throw new Error("Enabled FIBO generation requires its gateway URL and server-only Modal proxy credentials.");
}
if (fiboUrl && (!/^https:\/\/[a-z0-9-]+\.modal\.run$/.test(fiboUrl) || !fiboKey || !fiboSecret)) {
  throw new Error("FIBO gateway configuration must use a Modal HTTPS origin and complete proxy credentials.");
}

const upscaleWorkerUrl = new URL(process.env.RENDERLAB_UPSCALE_WORKER_GATEWAY_URL.trim());
if (upscaleWorkerUrl.protocol !== "https:") {
  throw new Error("RENDERLAB_UPSCALE_WORKER_GATEWAY_URL must use HTTPS.");
}

if (process.env.CRON_SECRET.trim().length < 16) {
  throw new Error("CRON_SECRET must be a nontrivial bearer secret for the account-lifecycle recovery cron.");
}

console.log("Vercel production environment contract is complete.");
