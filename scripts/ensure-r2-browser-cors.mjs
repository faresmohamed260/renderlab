import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2Bucket = process.env.R2_BUCKET_NAME;
const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() || null;
const requiredOrigins = (process.env.RENDERLAB_BROWSER_UPLOAD_ORIGINS
  || "http://127.0.0.1:3000,http://localhost:3000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
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
  for (const origin of requiredOrigins) {
    if (!rule.allowed?.origins?.includes(origin)) {
      throw new Error(`RenderLab browser upload CORS is missing origin ${origin}.`);
    }
  }
  if (!rule.allowed?.methods?.includes("PUT")) {
    throw new Error("RenderLab browser upload CORS does not allow PUT.");
  }
  if (!rule.allowed?.headers?.some((header) => header.toLowerCase() === "content-type")) {
    throw new Error("RenderLab browser upload CORS does not allow Content-Type.");
  }
  console.log(`RenderLab browser upload CORS verified through the Cloudflare API for ${requiredOrigins.join(", ")}; preserved ${unmanagedRules.length} unmanaged rule(s).`);
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
    CORSConfiguration: {
      CORSRules: [...unmanagedRules, managedRule],
    },
  }));

  const verifiedRules = await readS3Rules();
  const verified = verifiedRules.find((rule) => rule.ID === managedRuleId);
  if (!verified) throw new Error("RenderLab browser upload CORS rule was not persisted through the S3 API.");
  for (const origin of requiredOrigins) {
    if (!verified.AllowedOrigins?.includes(origin)) {
      throw new Error(`RenderLab browser upload CORS is missing origin ${origin}.`);
    }
  }
  if (!verified.AllowedMethods?.includes("PUT")) {
    throw new Error("RenderLab browser upload CORS does not allow PUT.");
  }
  if (!verified.AllowedHeaders?.some((header) => header.toLowerCase() === "content-type")) {
    throw new Error("RenderLab browser upload CORS does not allow Content-Type.");
  }

  console.log(`RenderLab browser upload CORS verified through the S3 API for ${requiredOrigins.join(", ")}; preserved ${unmanagedRules.length} unmanaged rule(s).`);
}

if (cloudflareApiToken) {
  await ensureWithCloudflareApi();
} else {
  await ensureWithS3Api();
}
