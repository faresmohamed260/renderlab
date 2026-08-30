import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2Bucket = process.env.R2_BUCKET_NAME;
const requiredOrigins = (process.env.RENDERLAB_BROWSER_UPLOAD_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

for (const [name, value] of Object.entries({
  R2_ACCOUNT_ID: r2AccountId,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for read-only RenderLab R2 CORS verification.`);
}
if (!requiredOrigins.length) {
  throw new Error("RENDERLAB_BROWSER_UPLOAD_ORIGINS must list the exact origins to verify.");
}

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

// Signing a PUT request does not create an object. The verifier only sends OPTIONS
// requests to the signed URL, so this audit cannot mutate bucket data or CORS config.
const signedUrl = await getSignedUrl(
  r2Client,
  new PutObjectCommand({
    Bucket: r2Bucket,
    Key: `renderlab/release-cors-probes/${randomUUID()}.png`,
    ContentType: "image/png",
  }),
  { expiresIn: 300, signableHeaders: new Set(["content-type"]) },
);

const failures = [];
for (const origin of requiredOrigins) {
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
  const originAllowed = allowOrigin === origin || allowOrigin === "*";
  const putAllowed = allowMethods.toUpperCase().split(/\s*,\s*/).includes("PUT");
  const contentTypeAllowed = allowHeaders === "*"
    || allowHeaders.toLowerCase().split(/\s*,\s*/).includes("content-type");
  const allowed = response.ok && originAllowed && putAllowed && contentTypeAllowed;

  console.log(
    `R2 CORS audit origin=${origin} status=${response.status} allowed=${allowed} `
    + `allow-origin=${allowOrigin || "<none>"} allow-methods=${allowMethods || "<none>"} `
    + `allow-headers=${allowHeaders || "<none>"}`,
  );
  if (!allowed) failures.push(origin);
}

if (failures.length) {
  throw new Error(`R2 browser-upload CORS is not ready for: ${failures.join(", ")}.`);
}
console.log(`Read-only R2 browser-upload CORS audit passed for ${requiredOrigins.length} exact origin(s).`);
