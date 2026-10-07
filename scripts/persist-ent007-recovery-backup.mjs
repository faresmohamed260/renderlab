import { appendFile, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
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
  stableJson,
} from "./lib/ent007-recovery.mjs";

const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
const sourceAccessKeyId = String(process.env.R2_ACCESS_KEY_ID || "").trim();
const sourceSecretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || "").trim();
const sourceBucket = String(process.env.R2_BUCKET_NAME || "").trim();
const backupAccessKeyId = String(process.env.ENT007_R2_BACKUP_ACCESS_KEY_ID || "").trim();
const backupSecretAccessKey = String(process.env.ENT007_R2_BACKUP_SECRET_ACCESS_KEY || "").trim();
const backupSessionToken = String(process.env.ENT007_R2_BACKUP_SESSION_TOKEN || "").trim();
const backupBucket = String(process.env.ENT007_R2_BACKUP_BUCKET || "renderlab-dr-backup").trim();
const outputDir = resolve(process.env.ENT007_OUTPUT_DIR || "artifacts/ent007-recovery");
const allowSharedProbeOnly = process.env.ENT007_ALLOW_SHARED_BACKUP_CREDENTIALS_FOR_PROBE === "1";
const encryptionKey = decodeBackupKey(process.env.ENT007_BACKUP_ENCRYPTION_KEY);

for (const [name, value] of Object.entries({
  accountId,
  sourceAccessKeyId,
  sourceSecretAccessKey,
  sourceBucket,
  backupAccessKeyId,
  backupSecretAccessKey,
  backupBucket,
})) {
  if (!value) throw new Error(`Missing ENT-007 R2 configuration: ${name}`);
}

const credentialsAreShared = sourceAccessKeyId === backupAccessKeyId
  && sourceSecretAccessKey === backupSecretAccessKey
  && !backupSessionToken;
if (credentialsAreShared && !allowSharedProbeOnly) {
  throw new Error("ENT-007 retained backup requires separately scoped backup R2 credentials.");
}

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

const sourceClient = createClient(sourceAccessKeyId, sourceSecretAccessKey);
const backupClient = createClient(backupAccessKeyId, backupSecretAccessKey, backupSessionToken);

async function bodyToBuffer(body) {
  if (!body?.transformToByteArray) throw new Error("ENT-007 R2 response body is not readable.");
  return Buffer.from(await body.transformToByteArray());
}

function normalizedContentType(value) {
  return String(value || "application/octet-stream").split(";")[0].trim().toLowerCase();
}

async function readObject(client, bucket, key) {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await bodyToBuffer(response.Body);
  const declaredLength = Number(response.ContentLength ?? bytes.length);
  if (declaredLength !== bytes.length) throw new Error("ENT-007 R2 object length did not match response bytes.");
  return {
    bytes,
    contentType: normalizedContentType(response.ContentType),
    sha256: sha256Hex(bytes),
  };
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
  return { encryptedText, manifest, snapshot };
}

async function assertRetentionEnforced(generationId) {
  const key = `ent007/retention-probes/${generationId}.txt`;
  await backupClient.send(new PutObjectCommand({
    Bucket: backupBucket,
    Key: key,
    Body: Buffer.from("renderlab-ent007-retention-probe\n", "utf8"),
    ContentType: "text/plain",
  }));

  try {
    await backupClient.send(new DeleteObjectCommand({ Bucket: backupBucket, Key: key }));
  } catch (error) {
    const lockCode = error?.name === "ObjectLockedByBucketPolicy"
      || error?.Code === "ObjectLockedByBucketPolicy"
      || error?.code === "ObjectLockedByBucketPolicy";
    if (lockCode) return;
    throw new Error(`ENT-007 retention probe deletion failed without a bucket-lock signal (${error?.name || "unknown"}).`);
  }
  throw new Error("ENT-007 backup bucket retention is not enforced; refusing to persist backup data.");
}

async function copyDurableObjects(snapshot, generationId) {
  const keys = durableR2KeysFromTables(snapshot.tables);
  let totalBytes = 0;

  for (const key of keys) {
    const source = await readObject(sourceClient, sourceBucket, key);
    const targetKey = `ent007/generations/${generationId}/objects/${key}`;
    await backupClient.send(new PutObjectCommand({
      Bucket: backupBucket,
      Key: targetKey,
      Body: source.bytes,
      ContentType: source.contentType,
    }));
    const target = await readObject(backupClient, backupBucket, targetKey);
    if (source.sha256 !== target.sha256 || source.bytes.length !== target.bytes.length) {
      throw new Error("ENT-007 durable object backup byte verification failed.");
    }
    if (source.contentType !== target.contentType) {
      throw new Error("ENT-007 durable object backup content-type verification failed.");
    }
    totalBytes += source.bytes.length;
  }

  return { objectCount: keys.length, totalBytes };
}

async function persistGeneration({ encryptedText, manifest, snapshot }) {
  const generationId = manifest.generationId;
  await assertRetentionEnforced(generationId);
  if (credentialsAreShared) {
    throw new Error("ENT-007 shared R2 credentials are retention-probe-only; refusing backup persistence.");
  }

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
  await backupClient.send(new PutObjectCommand({
    Bucket: backupBucket,
    Key: `${prefix}/snapshot.enc.json`,
    Body: encryptedText,
    ContentType: "application/json",
  }));
  await backupClient.send(new PutObjectCommand({
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
  await backupClient.send(new PutObjectCommand({
    Bucket: backupBucket,
    Key: `${prefix}/complete.json`,
    Body: `${stableJson(completion)}\n`,
    ContentType: "application/json",
  }));
  await backupClient.send(new HeadObjectCommand({ Bucket: backupBucket, Key: `${prefix}/complete.json` }));
  return completion;
}

const outputs = await loadSnapshotOutputs();
const completion = await persistGeneration(outputs);
const evidence = {
  generationId: completion.generationId,
  objectBackupCount: completion.objectBackupCount,
  objectBackupBytes: completion.objectBackupBytes,
  completedAt: completion.completedAt,
};
console.log(JSON.stringify(evidence));
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, [
    `generation_id=${completion.generationId}`,
    `completed_at=${completion.completedAt}`,
    `object_backup_count=${completion.objectBackupCount}`,
    `object_backup_bytes=${completion.objectBackupBytes}`,
    "",
  ].join("\n"));
}
