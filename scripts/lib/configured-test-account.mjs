import { createHash } from "node:crypto";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const runToken = process.env.GITHUB_RUN_ID || "local";

function fixtureUuid(namespace) {
  const hex = createHash("sha256").update(`renderlab-ci-account-${runToken}-${namespace}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20, 32).join("")}`;
}

function requireConfig() {
  for (const [name, value] of Object.entries({
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  })) {
    if (!value) throw new Error(`${name} is required for configured account test fixtures.`);
  }
}

async function authAdmin(path, init = {}) {
  requireConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/auth/v1/admin/${path}`, { ...init, headers });
}

export function configuredTestAccountIdentity(namespace) {
  const id = fixtureUuid(namespace);
  const safeNamespace = namespace.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  return {
    id,
    email: `renderlab-${safeNamespace}-${runToken}@example.com`,
    password: `RenderLab-${safeNamespace}-${runToken}-Pass!`,
  };
}

export async function deleteConfiguredTestAccount(accountOrId) {
  const id = typeof accountOrId === "string" ? accountOrId : accountOrId.id;
  const response = await authAdmin(`users/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not delete configured account fixture ${id} (${response.status}): ${await response.text()}`);
  }
}

export async function createConfiguredTestAccount(namespace) {
  const account = configuredTestAccountIdentity(namespace);
  await deleteConfiguredTestAccount(account);

  const createResponse = await authAdmin("users", {
    method: "POST",
    body: JSON.stringify({
      id: account.id,
      email: account.email,
      password: account.password,
      email_confirm: true,
      app_metadata: { renderlab_fixture: namespace, run: runToken },
    }),
  });
  if (!createResponse.ok) {
    throw new Error(`Could not create configured account fixture (${createResponse.status}): ${await createResponse.text()}`);
  }

  const signInResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  if (!signInResponse.ok) {
    throw new Error(`Could not sign in configured account fixture (${signInResponse.status}): ${await signInResponse.text()}`);
  }
  const payload = await signInResponse.json();
  if (typeof payload?.access_token !== "string" || payload.access_token.length < 20) {
    throw new Error("Configured account fixture did not receive an access token.");
  }

  return { ...account, accessToken: payload.access_token };
}

export function withAccountAuthorization(account, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${account.accessToken}`);
  return { ...init, headers };
}

export async function routeLocalAppRequestsWithAccount(page, baseUrl, account) {
  const origin = new URL(baseUrl).origin;
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (new URL(request.url()).origin !== origin) {
      await route.continue();
      return;
    }
    await route.continue({
      headers: {
        ...request.headers(),
        authorization: `Bearer ${account.accessToken}`,
      },
    });
  });
}
