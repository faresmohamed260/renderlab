import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const r2Bucket = process.env.R2_BUCKET_NAME;
const requiredOrigins = (process.env.RENDERLAB_BROWSER_UPLOAD_ORIGINS
  || "http://127.0.0.1:3000,http://localhost:3000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const managedRuleId = "renderlab-browser-uploads";

for (const [name, value] of Object.entries({
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required to configure RenderLab browser upload CORS.`);
}
if (!requiredOrigins.length) throw new Error("At least one RenderLab browser upload origin is required.");

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function readRules() {
  try {
    const response = await r2Client.send(new GetBucketCorsCommand({ Bucket: r2Bucket }));
    return response.CORSRules ?? [];
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NoSuchCORSConfiguration") return [];
    throw error;
  }
}

const existingRules = await readRules();
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

const verifiedRules = await readRules();
const verified = verifiedRules.find((rule) => rule.ID === managedRuleId);
if (!verified) throw new Error("RenderLab browser upload CORS rule was not persisted.");
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

console.log(`RenderLab browser upload CORS verified for ${requiredOrigins.join(", ")}; preserved ${unmanagedRules.length} unmanaged rule(s).`);
