import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const runToken = process.env.GITHUB_RUN_ID || "local";
const accountScope =
  process.env.RENDERLAB_TEST_ACCOUNT_SCOPE ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  runToken;
const accountScopeToken = createHash("sha256").update(accountScope).digest("hex").slice(0, 12);

function fixtureUuid(namespace) {
  const hex = createHash("sha256").update(`renderlab-ci-account-${accountScope}-${namespace}`).digest("hex").slice(0, 32).split("");
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

async function serviceRest(path, init = {}) {
  requireConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function serviceRows(path) {
  const response = await serviceRest(path);
  if (!response.ok) {
    throw new Error(`Could not inspect configured account fixture rows (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

function configuredR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
}

async function cleanupOwnedRenderLabRows(ownerId) {
  requireConfig();
  const encodedOwner = encodeURIComponent(ownerId);
  const [sessions, assets, sources] = await Promise.all([
    serviceRows(
      `media_upload_sessions?owner_id=eq.${encodedOwner}&select=id,storage_key,media_asset_id`,
    ),
    serviceRows(
      `media_assets?owner_id=eq.${encodedOwner}&select=id,storage_key,thumbnail_storage_key,generation_job_id`,
    ),
    serviceRows(
      `generation_sources?owner_id=eq.${encodedOwner}&select=id,storage_key`,
    ),
  ]);

  const storageKeys = new Set([
    ...sessions.map((row) => row.storage_key),
    ...assets.flatMap((row) => [row.storage_key, row.thumbnail_storage_key]),
    ...sources.map((row) => row.storage_key),
  ].filter(Boolean));

  const r2 = configuredR2Client();
  if (r2) {
    for (const key of storageKeys) {
      await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key })).catch(() => {});
    }
  }

  for (const table of ["media_upload_sessions", "media_assets", "generation_jobs", "generation_sources"]) {
    const response = await serviceRest(`${table}?owner_id=eq.${encodedOwner}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(`Could not clean configured account ${table} rows (${response.status}): ${await response.text()}`);
    }
  }

  if (sessions.length || assets.length || sources.length) {
    console.log(
      `Cleaned configured account owner rows owner=${ownerId} sessions=${sessions.length} assets=${assets.length} sources=${sources.length} objects=${storageKeys.size}.`,
    );
  }
}

export function configuredTestAccountIdentity(namespace) {
  const id = fixtureUuid(namespace);
  const safeNamespace = namespace.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  return {
    id,
    email: `renderlab-${safeNamespace}-${accountScopeToken}@example.com`,
    password: `RenderLab-${safeNamespace}-${accountScopeToken}-Pass!`,
  };
}

export async function deleteConfiguredTestAccount(accountOrId) {
  const id = typeof accountOrId === "string" ? accountOrId : accountOrId.id;
  await cleanupOwnedRenderLabRows(id);
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
      app_metadata: { renderlab_fixture: namespace, run: runToken, scope: accountScope },
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

function isSignedMediaRedirectPath(pathname) {
  return /^\/api\/media\/assets\/[^/]+\/(?:content|thumbnail|download)$/.test(pathname);
}

export async function routeLocalAppRequestsWithAccount(page, baseUrl, account) {
  const origin = new URL(baseUrl).origin;
  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== origin) {
      await route.continue();
      return;
    }

    const headers = {
      ...request.headers(),
      authorization: `Bearer ${account.accessToken}`,
    };

    // Playwright carries route.continue header overrides across redirects. RenderLab media
    // routes intentionally redirect to signed R2 GETs, so authenticate only the local route
    // and let the browser follow the returned 3xx as a fresh external request.
    if (isSignedMediaRedirectPath(requestUrl.pathname)) {
      const response = await route.fetch({ headers, maxRedirects: 0 });
      await route.fulfill({ response });
      return;
    }

    await route.continue({ headers });
  });
}