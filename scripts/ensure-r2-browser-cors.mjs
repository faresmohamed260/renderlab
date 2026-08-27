import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2Bucket = process.env.R2_BUCKET_NAME;
const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() || null;
const requiredOrigins = (process.env.RENDERLAB_BROWSER_UPLOAD_ORIGINS
  || "http://127.0.0.1:3000,http://localhost:3000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const probeOrigins = Array.from(new Set([
  ...requiredOrigins,
  ...(process.env.RENDERLAB_BROWSER_UPLOAD_PROBE_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]));
const managedRuleId = "renderlab-browser-uploads";

for (const [name, value] of Object.entries({
  R2_ACCOUNT_ID: r2AccountId,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required to configure RenderLab browser upload CORS.`);
}
if (!requiredOrigins.length) throw new Error("At least one RenderLab browser upload origin is required.");

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function cloudflareRequest(method, body) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(r2AccountId)}/r2/buckets/${encodeURIComponent(r2Bucket)}/cors`,
    {
      method,
      headers: {
        authorization: `Bearer ${cloudflareApiToken}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(`Cloudflare R2 CORS ${method} failed (${response.status}): ${JSON.stringify(payload?.errors ?? payload)}`);
  }
  return payload?.result ?? payload;
}

async function ensureWithCloudflareApi() {
  const current = await cloudflareRequest("GET");
  const existingRules = Array.isArray(current?.rules) ? current.rules : [];
  const unmanagedRules = existingRules.filter((rule) => rule.id !== managedRuleId);
  const managedRule = {
    id: managedRuleId,
    allowed: {
      origins: requiredOrigins,
      methods: ["PUT"],
      headers: ["content-type"],
    },
    exposeHeaders: ["etag"],
    maxAgeSeconds: 3600,
  };
  await cloudflareRequest("PUT", { rules: [...unmanagedRules, managedRule] });
  const verified = await cloudflareRequest("GET");
  const rule = verified?.rules?.find((candidate) => candidate.id === managedRuleId);
  if (!rule) throw new Error("RenderLab browser upload CORS rule was not persisted through the Cloudflare API.");
  console.log(`RenderLab browser upload CORS reconciled through the Cloudflare API for ${requiredOrigins.join(", ")}; preserved ${unmanagedRules.length} unmanaged rule(s).`);
}

async function readS3Rules() {
  try {
    const response = await r2Client.send(new GetBucketCorsCommand({ Bucket: r2Bucket }));
    return response.CORSRules ?? [];
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NoSuchCORSConfiguration") return [];
    throw error;
  }
}

async function ensureWithS3Api() {
  const existingRules = await readS3Rules();
  const unmanagedRules = existingRules.filter((rule) => rule.ID !== managedRuleId);
  const managedRule = {
    ID: managedRuleId,
    AllowedOrigins: requiredOrigins,
    AllowedMethods: ["PUT"],
    AllowedHeaders: ["content-type"],
    ExposeHeaders: ["etag"],
    MaxAgeSeconds: 3600,
  };
  await r2Client.send(new PutBucketCorsCommand({
    Bucket: r2Bucket,
    CORSConfiguration: { CORSRules: [...unmanagedRules, managedRule] },
  }));
  console.log(`RenderLab browser upload CORS reconciled through the S3 API for ${requiredOrigins.join(", ")}; preserved ${unmanagedRules.length} unmanaged rule(s).`);
}

async function probeCors() {
  const signedUrl = await getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: `renderlab/cors-probes/${randomUUID()}.png`,
      ContentType: "image/png",
    }),
    { expiresIn: 300, signableHeaders: new Set(["content-type"]) },
  );
  const supported = new Set();
  for (const origin of probeOrigins) {
    const response = await fetch(signedUrl, {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "PUT",
        "access-control-request-headers": "content-type",
      },
    });
    const allowOrigin = response.headers.get("access-control-allow-origin");
    const allowMethods = response.headers.get("access-control-allow-methods") || "";
    const allowHeaders = response.headers.get("access-control-allow-headers") || "";
    const ok = response.ok
      && (allowOrigin === origin || allowOrigin === "*")
      && allowMethods.toUpperCase().split(/\s*,\s*/).includes("PUT")
      && (allowHeaders === "*" || allowHeaders.toLowerCase().split(/\s*,\s*/).includes("content-type"));
    if (ok) supported.add(origin);
    console.log(`R2 CORS preflight origin=${origin} status=${response.status} allowed=${ok} allow-origin=${allowOrigin || "<none>"} allow-methods=${allowMethods || "<none>"} allow-headers=${allowHeaders || "<none>"}`);
  }
  return requiredOrigins.every((origin) => supported.has(origin));
}

let managed = false;
if (cloudflareApiToken) {
  await ensureWithCloudflareApi();
  managed = true;
} else {
  try {
    await ensureWithS3Api();
    managed = true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode !== 403 && error?.name !== "AccessDenied") throw error;
    console.log("R2 object credentials cannot manage bucket CORS; probing existing policy instead.");
  }
}

const requiredReady = await probeCors();
if (!requiredReady) {
  throw new Error(`Shared R2 bucket does not currently allow all required RenderLab browser upload origins: ${requiredOrigins.join(", ")}.${managed ? " CORS reconciliation completed but preflight still failed." : " Bucket-admin authority is required to add them."}`);
}
console.log(`RenderLab browser upload CORS preflight verified for ${requiredOrigins.join(", ")}.`);
