import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = (process.env.CLOUDFLARE_R2_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID)?.trim();
const accessKeyId = (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID)?.trim();
const secretAccessKey = (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY)?.trim();
const bucketName = (process.env.CLOUDFLARE_R2_BUCKET ?? process.env.R2_BUCKET_NAME)?.trim();

let client: S3Client | null = null;

export function isR2Configured() {
  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
}

function getClient() {
  if (!isR2Configured()) throw new Error("R2 storage is not configured.");
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export async function createSignedUploadUrl({ key, contentType, expiresIn = 300 }: { key: string; contentType: string; expiresIn?: number }) {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucketName!, Key: key, ContentType: contentType }),
    { expiresIn, signableHeaders: new Set(["content-type"]) },
  );
}

export async function createSignedReadUrl(key: string, expiresIn = 300) {
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucketName!, Key: key }), { expiresIn });
}

export async function createSignedDownloadUrl({
  key,
  contentDisposition,
  expiresIn = 300,
}: {
  key: string;
  contentDisposition: string;
  expiresIn?: number;
}) {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucketName!,
      Key: key,
      ResponseContentDisposition: contentDisposition,
    }),
    { expiresIn },
  );
}

export async function readR2Object(key: string) {
  const response = await fetch(await createSignedReadUrl(key), { cache: "no-store" });
  if (!response.ok) throw new Error(`R2 object could not be read (${response.status}).`);
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: String(response.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase(),
  };
}

export async function writeR2Object({ key, contentType, body }: { key: string; contentType: string; body: Uint8Array }) {
  const response = await fetch(await createSignedUploadUrl({ key, contentType }), {
    method: "PUT",
    headers: { "content-type": contentType },
    body: Uint8Array.from(body).buffer,
  });
  if (!response.ok) throw new Error(`R2 object could not be written (${response.status}).`);
}

export async function deleteR2Object(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucketName!, Key: key }));
}

export async function headR2Object(key: string) {
  const object = await getClient().send(new HeadObjectCommand({ Bucket: bucketName!, Key: key }));
  return {
    sizeBytes: Number(object.ContentLength ?? 0),
    contentType: String(object.ContentType ?? "application/octet-stream").split(";")[0].trim().toLowerCase(),
    etag: String(object.ETag ?? "").replace(/^"|"$/g, ""),
  };
}
