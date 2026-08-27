import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

const key = "renderlab/uploads/2026/08/508af8e8-da64-4f30-8866-29b0fb63d308.png";
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
console.log(`Deleted stale RenderLab lifecycle fixture object ${key}.`);
