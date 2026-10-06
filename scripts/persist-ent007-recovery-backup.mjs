import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  decodeBackupKey,
  decryptSnapshot,
  durableR2KeysFromTables,
  stableJson,
} from "./lib/ent007-recovery.mjs";

const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
const sourceBucket = String(process.env.R2_BUCKET_NAME || "").trim();
const backupBucket = String(process.env.ENT007_R2_BACKUP_BUCKET || "renderlab-dr-backup").trim();
const outputDir = resolve(process.env.ENT007_OUTPUT_DIR || "artifacts/ent007-recovery");
const encryptionKey = decodeBackupKey(process.env.ENT007_BACKUP_ENCRYPTION_KEY);

for (const [name, value] of Object.entries({ accountId, accessKeyId, secretAccessKey, sourceBucket, backupBucket })) {
  if (!value) throw new Error(`Missing ENT-007 R2 configuration: ${name}`);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
function copySource(bucket, key) {
  return `${encodeURIComponent(bucket)}/${key.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

async function loadSnapshotOutputs() {
  const files = await readdir(outputDir);
  const encryptedName = files.find((name) => name.endsWith(".snapshot.enc.json"));
  const manifestName = files.find((name) => name.endsWith(".manifest.json"));
  if (!encryptedName || !manifestName) throw new Error("ENT-007 snapshot outputs are incomplete.");

  const encryptedText = await readFile(join(outputDir, encryptedName), "utf8");
  const manifestText = await readFile(join(outputDir, manifestName), "utf8");
  const envelope = JSON.parse(encryptedText);
  const manifest = JSON.parse(manifestText);
  const plaintext = decryptSnapshot(envelope, encryptionKey);
  const snapshot = JSON.parse(plaintext.toString("utf8"));
  return { encryptedText, envelope, manifest, snapshot };
}

async function assertRetentionEnforced(generationId) {
  const key = `ent007/retention-probes/${generationId}.txt`;
  await client.send(new PutObjectCommand({
    Bucket: backupBucket,
    Key: key,
    Body: Buffer.from("renderlab-ent007-retention-probe\n", "utf8"),
    ContentType: "text/plain",
  }));

  try {
    await client.send(new DeleteObjectCommand({ Bucket: backupBucket, Key: key }));
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 403 || error?.name === "AccessDenied") return;
    throw error;
  }
  throw new Error("ENT-007 backup bucket retention is not enforced; refusing to persist backup data.");
}
async function copyDurableObjects(snapshot, generationId) {
  const keys = durableR2KeysFromTables(snapshot.tables);
  let totalBytes = 0;

  for (const key of keys) {
    const sourceHead = await client.send(new HeadObjectCommand({ Bucket: sourceBucket, Key: key }));
    const targetKey = `ent007/generations/${generationId}/objects/${key}`;
    await client.send(new CopyObjectCommand({
      Bucket: backupBucket,
      Key: targetKey,
      CopySource: copySource(sourceBucket, key),
      MetadataDirective: "COPY",
    }));
    const targetHead = await client.send(new HeadObjectCommand({ Bucket: backupBucket, Key: targetKey }));
    const sourceSize = Number(sourceHead.ContentLength ?? -1);
    const targetSize = Number(targetHead.ContentLength ?? -2);
    if (sourceSize < 0 || sourceSize !== targetSize) {
      throw new Error("ENT-007 durable object copy size verification failed.");
    }
    const sourceType = String(sourceHead.ContentType || "application/octet-stream").split(";")[0].trim().toLowerCase();
    const targetType = String(targetHead.ContentType || "application/octet-stream").split(";")[0].trim().toLowerCase();
    if (sourceType !== targetType) throw new Error("ENT-007 durable object copy content-type verification failed.");
    totalBytes += sourceSize;
  }

  return { objectCount: keys.length, totalBytes };
}

async function persistGeneration({ encryptedText, manifest, snapshot }) {
  const generationId = manifest.generationId;
  await assertRetentionEnforced(generationId);
  const storage = await copyDurableObjects(snapshot, generationId);
  if (storage.objectCount !== manifest.durableObjectCount) {
    throw new Error("ENT-007 durable object count changed between snapshot and persistence.");
  }

  const prefix = `ent007/generations/${generationId}`;
  const persistedManifest = {
    ...manifest,
    backupBucket,
    objectBackupCount: storage.objectCount,
    objectBackupBytes: storage.totalBytes,
    completedAt: new Date().toISOString(),
  };
  await client.send(new PutObjectCommand({
    Bucket: backupBucket,
    Key: `${prefix}/snapshot.enc.json`,
    Body: encryptedText,
    ContentType: "application/json",
  }));
  await client.send(new PutObjectCommand({
    Bucket: backupBucket,
    Key: `${prefix}/manifest.json`,
    Body: `${stableJson(persistedManifest)}\n`,
    ContentType: "application/json",
  }));

  const completion = {
    format: "renderlab-ent007-backup-complete",
    version: 1,
    generationId,
    completedAt: persistedManifest.completedAt,
    encryptedEnvelopeSha256: manifest.encryptedEnvelopeSha256,
    objectBackupCount: storage.objectCount,
    objectBackupBytes: storage.totalBytes,
  };
  await client.send(new PutObjectCommand({
    Bucket: backupBucket,
    Key: `${prefix}/complete.json`,
    Body: `${stableJson(completion)}\n`,
    ContentType: "application/json",
  }));
  await client.send(new HeadObjectCommand({ Bucket: backupBucket, Key: `${prefix}/complete.json` }));
  return completion;
}

const outputs = await loadSnapshotOutputs();
const completion = await persistGeneration(outputs);
console.log(JSON.stringify({
  generationId: completion.generationId,
  objectBackupCount: completion.objectBackupCount,
  objectBackupBytes: completion.objectBackupBytes,
  completedAt: completion.completedAt,
}));
