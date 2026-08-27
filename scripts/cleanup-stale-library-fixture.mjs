import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";

const key = "renderlab/uploads/2026/08/dde3c1c0-d65e-498a-a4b1-78cc9cbd0264.png";
const bucket = process.env.R2_BUCKET_NAME;

for (const name of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]) {
  if (!process.env[name]) throw new Error(`${name} is required.`);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
let stillExists = true;
try {
  await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
} catch (error) {
  if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound") stillExists = false;
  else throw error;
}
if (stillExists) throw new Error(`Stale lifecycle object still exists after delete: ${key}`);
console.log(`Deleted and verified absent stale RenderLab lifecycle fixture object ${key}.`);
