import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const runToken = process.env.GITHUB_RUN_ID || "local";
const accountScope = process.env.RENDERLAB_TEST_ACCOUNT_SCOPE || runToken;
const accountScopeToken = createHash("sha256").update(accountScope).digest("hex").slice(0, 12);
const bypassGenerationAdmission = process.env.RENDERLAB_TEST_GENERATION_ADMISSION_BYPASS === "true";
const mfaNamespace = process.env.RENDERLAB_TEST_MFA_NAMESPACE?.trim() || "";

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
    `renderlab/account-profiles/${ownerId}/avatar.webp`,
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

  for (const table of ["media_upload_sessions", "media_assets", "generation_jobs", "generation_sources", "renderlab_account_profiles"]) {
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

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Unexpected configured-account TOTP secret encoding.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function currentTotp(secret, timeMs = Date.now()) {
  const counter = BigInt(Math.floor(timeMs / 1000 / 30));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

async function createAal2AccessToken(account, namespace) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email: account.email, password: account.password });
  if (signedIn.error) throw signedIn.error;

  const enrollment = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `RenderLab CI ${namespace}`,
  });
  if (enrollment.error) throw enrollment.error;

  let verificationError = null;
  for (const offset of [0, -30_000, 30_000]) {
    const verified = await client.auth.mfa.challengeAndVerify({
      factorId: enrollment.data.id,
      code: currentTotp(enrollment.data.totp.secret, Date.now() + offset),
    });
    if (!verified.error) {
      const session = await client.auth.getSession();
      if (session.error) throw session.error;
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error("Configured MFA account fixture did not receive an AAL2 access token.");
      return accessToken;
    }
    verificationError = verified.error;
  }

  throw verificationError ?? new Error("Configured MFA account fixture could not verify TOTP.");
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

  const admissionResponse = await serviceRest(`generation_admission_reservations?owner_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!admissionResponse.ok) {
    const detail = await admissionResponse.text();
    const relationMissing = admissionResponse.status === 404 && detail.includes("generation_admission_reservations");
    if (!relationMissing) {
      throw new Error(`Could not clean configured account admission reservations (${admissionResponse.status}): ${detail}`);
    }
  }

  const accessResponse = await serviceRest(`renderlab_account_access?user_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!accessResponse.ok) {
    throw new Error(`Could not clean configured account access (${accessResponse.status}): ${await accessResponse.text()}`);
  }
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

  const accessResponse = await serviceRest("renderlab_account_access?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: account.id,
      role: "member",
      status: "active",
      ...(bypassGenerationAdmission
        ? {
            generation_enabled: true,
            max_active_jobs: 4,
            max_jobs_per_hour: 120,
          }
        : {}),
    }),
  });
  if (!accessResponse.ok) {
    throw new Error(`Could not seed configured account access (${accessResponse.status}): ${await accessResponse.text()}`);
  }

  if (mfaNamespace === namespace) {
    const accessToken = await createAal2AccessToken(account, namespace);
    return { ...account, accessToken };
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

function isSignedMediaRedirectRequest(pathname, method) {
  if (pathname === "/api/account/profile/avatar") return method === "GET" || method === "HEAD";
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

    // Header overrides from route.continue() follow redirects. Resolve signed-media reads
    // outside Playwright's page-bound request context so the local Authorization header never
    // reaches R2 and browser teardown cannot dispose an in-flight route.fetch() callback.
    if (isSignedMediaRedirectRequest(requestUrl.pathname, request.method())) {
      const method = request.method();
      const response = await fetch(request.url(), {
        method,
        headers,
        redirect: "manual",
        body: method === "GET" || method === "HEAD" ? undefined : request.postDataBuffer() ?? undefined,
      });
      const responseHeaders = {};
      response.headers.forEach((value, name) => {
        if (name !== "content-encoding" && name !== "content-length") responseHeaders[name] = value;
      });
      const body = method === "HEAD" ? undefined : Buffer.from(await response.arrayBuffer());
      await route.fulfill({ status: response.status, headers: responseHeaders, body });
      return;
    }

    await route.continue({ headers });
  });
}
