import { createHash } from "node:crypto";

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || "";
const mode = process.argv[2] || "verify";

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
})) {
  if (!value) throw new Error(`${name} is required.`);
}

if (!["prepare", "verify", "cleanup"].includes(mode)) {
  throw new Error(`Unsupported mode: ${mode}`);
}

function deterministicUuid(seed) {
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

const userId = deterministicUuid("renderlab-account-auth-hardening-215a-legacy");
const email = "renderlab-auth215a-legacy@example.com";
const password = createHash("sha256")
  .update(`${serviceRoleKey}:renderlab-account-auth-hardening-215a-legacy`)
  .digest("base64url")
  .slice(0, 12);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function authAdmin(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

async function deleteFixture() {
  const response = await authAdmin(`users/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not remove legacy fixture (${response.status}).`);
  }
}

async function signInFixture() {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  let payload = null;
  const text = await response.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {}

  if (!response.ok) {
    const code = typeof payload?.code === "string" ? payload.code : "unknown";
    throw new Error(`Legacy fixture sign-in failed (${response.status}, code=${code}).`);
  }

  assert(typeof payload?.access_token === "string" && payload.access_token.length > 20, "Legacy fixture sign-in returned no access token.");
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${payload.access_token}`,
    },
  });
  assert(userResponse.ok, `Legacy fixture getUser failed (${userResponse.status}).`);
  const user = await userResponse.json();
  assert(user?.id === userId, "Legacy fixture sign-in resolved an unexpected user.");
  console.log("RENDERLAB_215A_LEGACY_SIGNIN_OK=true");
  console.log("RENDERLAB_215A_LEGACY_PASSWORD_LENGTH=12");
}

if (mode === "prepare") {
  await deleteFixture();
  const response = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      id: userId,
      email,
      password,
      email_confirm: true,
      user_metadata: { source: "renderlab-215a-legacy-fixture" },
    }),
  });
  if (!response.ok) {
    throw new Error(`Could not create legacy fixture (${response.status}).`);
  }
  const user = await response.json();
  assert(user?.id === userId, "Supabase created an unexpected legacy fixture ID.");
  await signInFixture();
  console.log("RENDERLAB_215A_LEGACY_FIXTURE_PREPARED=true");
} else if (mode === "verify") {
  await signInFixture();
  console.log("RENDERLAB_215A_LEGACY_FIXTURE_VERIFIED=true");
} else {
  await deleteFixture();
  console.log("RENDERLAB_215A_LEGACY_FIXTURE_CLEAN=true");
}
