import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const bucketName = process.env.R2_BUCKET_NAME?.trim();

let client: S3Client | null = null;

export function isR2Configured() {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
}

function getClient() {
  if (!isR2Configured()) {
    throw new Error("R2 storage is not configured.");
  }

  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  return client;
}

export async function createSignedUploadUrl({
  key,
  contentType,
  expiresIn = 300,
}: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: bucketName!,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getClient(), command, {
    expiresIn,
    signableHeaders: new Set(["content-type"]),
  });
}

export async function putR2Object({
  key,
  contentType,
  body,
}: {
  key: string;
  contentType: string;
  body: Uint8Array;
}) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucketName!,
      Key: key,
      ContentType: contentType,
      Body: body,
    }),
  );
}

export async function headR2Object(key: string) {
  const object = await getClient().send(
    new HeadObjectCommand({
      Bucket: bucketName!,
      Key: key,
    }),
  );

  return {
    sizeBytes: Number(object.ContentLength ?? 0),
    contentType: String(object.ContentType ?? "application/octet-stream")
      .split(";")[0]
      .trim()
      .toLowerCase(),
    etag: String(object.ETag ?? "").replace(/^"|"$/g, ""),
  };
}
