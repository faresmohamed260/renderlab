import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  decodeBackupKey,
  decryptSnapshot,
  durableR2KeysFromTables,
  sha256Hex,
} from "./lib/ent007-recovery.mjs";

const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
const primaryAccessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
const primarySecretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
const primaryBucket = String(process.env.R2_BUCKET_NAME || "").trim();
const backupAccessKeyId = String(process.env.ENT007_R2_BACKUP_ACCESS_KEY_ID || "").trim();
const backupSecretAccessKey = String(process.env.ENT007_R2_BACKUP_SECRET_ACCESS_KEY || "").trim();
const backupSessionToken = String(process.env.ENT007_R2_BACKUP_SESSION_TOKEN || "").trim();
const backupBucket = String(process.env.ENT007_R2_BACKUP_BUCKET || "renderlab-dr-backup").trim();
const generationId = String(process.env.ENT007_GENERATION_ID || "").trim();
const outputDir = resolve(process.env.ENT007_OUTPUT_DIR || "artifacts/ent007-retained-restore");
const encryptionKey = decodeBackupKey(process.env.ENT007_BACKUP_ENCRYPTION_KEY);
const runId = String(process.env.ENT007_RESTORE_RUN_ID || process.env.GITHUB_RUN_ID || randomUUID()).trim();

for (const [name, value] of Object.entries({
  accountId,
  primaryAccessKeyId,
  primarySecretAccessKey,
  primaryBucket,
  backupAccessKeyId,
  backupSecretAccessKey,
  backupBucket,
  generationId,
})) {
  if (!value) throw new Error(`Missing ENT-007 R2 restore configuration: ${name}`);
}
if (!/^\d{14}-[0-9a-f]{8}$/.test(generationId)) throw new Error("ENT007_GENERATION_ID is invalid.");
if (!/^[A-Za-z0-9-]{1,80}$/.test(runId)) throw new Error("ENT007_RESTORE_RUN_ID is invalid.");

function createClient(accessKeyId, secretAccessKey, sessionToken = "") {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: sessionToken
      ? { accessKeyId, secretAccessKey, sessionToken }
      : { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}
const primaryClient = createClient(primaryAccessKeyId, primarySecretAccessKey);
const backupClient = createClient(backupAccessKeyId, backupSecretAccessKey, backupSessionToken);

async function bodyToBuffer(body) {
  if (!body?.transformToByteArray) throw new Error("ENT-007 R2 restore body is not readable.");
  return Buffer.from(await body.transformToByteArray());
}
function normalizedContentType(value) {
  return String(value || "application/octet-stream").split(";")[0].trim().toLowerCase();
}
async function readObject(client, bucket, key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await bodyToBuffer(response.Body);
  return { bytes, sha256: sha256Hex(bytes), contentType: normalizedContentType(response.ContentType) };
}
async function loadSnapshot() {
  const files = await readdir(outputDir);
  const encryptedName = files.find((name) => name.endsWith(".snapshot.enc.json"));
  const manifestName = files.find((name) => name.endsWith(".manifest.json"));
  if (!encryptedName || !manifestName) throw new Error("ENT-007 retained restore outputs are incomplete.");
  const envelope = JSON.parse(await readFile(join(outputDir, encryptedName), "utf8"));
  const manifest = JSON.parse(await readFile(join(outputDir, manifestName), "utf8"));
  const plaintext = decryptSnapshot(envelope, encryptionKey);
  return { snapshot: JSON.parse(plaintext.toString("utf8")), manifest };
}

const started = performance.now();
const restoredKeys = [];
let primaryDeleteSimulationPassed = false;
let primaryError = null;
try {
  const { snapshot, manifest } = await loadSnapshot();
  if (manifest.generationId !== generationId) throw new Error("ENT-007 R2 restore generation mismatch.");
  const durableKeys = durableR2KeysFromTables(snapshot.tables);
  if (durableKeys.length !== manifest.durableObjectCount || durableKeys.length !== manifest.objectBackupCount) {
    throw new Error("ENT-007 R2 restore object-count mismatch.");
  }

  let restoredBytes = 0;
  const restorePrefix = `renderlab/dr-restore-fixtures/${runId}/objects`;
  for (let index = 0; index < durableKeys.length; index += 1) {
    const sourceKey = durableKeys[index];
    const backupKey = `ent007/generations/${generationId}/objects/${sourceKey}`;
    const backupObject = await readObject(backupClient, backupBucket, backupKey);
    const restoreKey = `${restorePrefix}/${index.toString().padStart(4, "0")}`;
    await primaryClient.send(new PutObjectCommand({
      Bucket: primaryBucket,
      Key: restoreKey,
      Body: backupObject.bytes,
      ContentType: backupObject.contentType,
    }));
    restoredKeys.push(restoreKey);
    const restoredObject = await readObject(primaryClient, primaryBucket, restoreKey);
    if (restoredObject.sha256 !== backupObject.sha256 || restoredObject.bytes.length !== backupObject.bytes.length) {
      throw new Error("ENT-007 isolated R2 restore byte verification failed.");
    }
    if (restoredObject.contentType !== backupObject.contentType) {
      throw new Error("ENT-007 isolated R2 restore content-type verification failed.");
    }
    restoredBytes += restoredObject.bytes.length;
  }

  if (durableKeys.length > 0) {
    const firstRestoreKey = restoredKeys.shift();
    await primaryClient.send(new DeleteObjectCommand({ Bucket: primaryBucket, Key: firstRestoreKey }));
    try {
      await primaryClient.send(new HeadObjectCommand({ Bucket: primaryBucket, Key: firstRestoreKey }));
      throw new Error("ENT-007 primary-delete simulation did not delete the isolated restore object.");
    } catch (error) {
      const status = error?.$metadata?.httpStatusCode;
      if (status !== 404 && error?.name !== "NotFound" && error?.name !== "NoSuchKey") throw error;
    }
    const retainedBackupKey = `ent007/generations/${generationId}/objects/${durableKeys[0]}`;
    await backupClient.send(new HeadObjectCommand({ Bucket: backupBucket, Key: retainedBackupKey }));
    primaryDeleteSimulationPassed = true;
  }

  const elapsedMs = Math.round(performance.now() - started);
  console.log(JSON.stringify({
    format: "renderlab-ent007-r2-restore-evidence",
    version: 1,
    generationId,
    restoredObjectCount: durableKeys.length,
    restoredBytes,
    crossStoreReferenceCount: durableKeys.length,
    primaryDeleteSimulationPassed,
    elapsedMs,
  }));
} catch (error) {
  primaryError = error;
}

let cleanupFailures = 0;
for (const key of restoredKeys) {
  try {
    await primaryClient.send(new DeleteObjectCommand({ Bucket: primaryBucket, Key: key }));
  } catch {
    cleanupFailures += 1;
  }
}
if (cleanupFailures > 0) {
  const cleanupError = new Error(`ENT-007 isolated R2 restore cleanup failed for ${cleanupFailures} object(s).`);
  if (!primaryError) primaryError = cleanupError;
  else console.error("ENT-007 R2 restore cleanup also failed after the primary verifier error.");
}
if (primaryError) throw primaryError;
