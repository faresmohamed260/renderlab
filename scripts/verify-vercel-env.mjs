const isVercelBuild = process.env.VERCEL === "1";

if (!isVercelBuild) {
  console.log("Skipping Vercel environment verification outside Vercel.");
  process.exit(0);
}

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(`Vercel deployment is missing required environment variables: ${missing.join(", ")}`);
}

const expectedSupabaseUrl = "https://rashyleshocuvpgcooxy.supabase.co";
const privateSupabaseUrl = process.env.SUPABASE_URL.trim().replace(/\/$/, "");
const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, "");

if (privateSupabaseUrl !== expectedSupabaseUrl || publicSupabaseUrl !== expectedSupabaseUrl) {
  throw new Error("Vercel Supabase URLs must target the approved shared RenderLab/Saga project.");
}

const externalBackendUrl = process.env.RENDERLAB_GENERATION_BACKEND_URL?.trim();
const externalBackendToken = process.env.RENDERLAB_GENERATION_BACKEND_TOKEN?.trim();
if (Boolean(externalBackendUrl) !== Boolean(externalBackendToken)) {
  throw new Error(
    "RENDERLAB_GENERATION_BACKEND_URL and RENDERLAB_GENERATION_BACKEND_TOKEN must be configured together or both omitted.",
  );
}

console.log("Vercel production environment contract is complete.");
