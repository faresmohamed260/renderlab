import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  decodeBackupKey,
  decryptSnapshot,
  durableR2KeysFromTables,
  sha256Hex,
  stableJson,
} from "./lib/ent007-recovery.mjs";

const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
const backupAccessKeyId = String(process.env.ENT007_R2_BACKUP_ACCESS_KEY_ID || "").trim();
const backupSecretAccessKey = String(process.env.ENT007_R2_BACKUP_SECRET_ACCESS_KEY || "").trim();
const backupSessionToken = String(process.env.ENT007_R2_BACKUP_SESSION_TOKEN || "").trim();
const backupBucket = String(process.env.ENT007_R2_BACKUP_BUCKET || "renderlab-dr-backup").trim();
const generationId = String(process.env.ENT007_GENERATION_ID || "").trim();
const outputDir = resolve(process.env.ENT007_OUTPUT_DIR || "artifacts/ent007-retained-restore");
const encryptionKey = decodeBackupKey(process.env.ENT007_BACKUP_ENCRYPTION_KEY);

for (const [name, value] of Object.entries({
  accountId,
  backupAccessKeyId,
  backupSecretAccessKey,
  backupBucket,
  generationId,
})) {
  if (!value) throw new Error(`Missing ENT-007 retained restore configuration: ${name}`);
}
if (!/^\d{14}-[0-9a-f]{8}$/.test(generationId)) throw new Error("ENT007_GENERATION_ID is invalid.");

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: backupSessionToken
    ? { accessKeyId: backupAccessKeyId, secretAccessKey: backupSecretAccessKey, sessionToken: backupSessionToken }
    : { accessKeyId: backupAccessKeyId, secretAccessKey: backupSecretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function getText(key) {
  const response = await client.send(new GetObjectCommand({ Bucket: backupBucket, Key: key }));
  if (!response.Body?.transformToString) throw new Error("ENT-007 retained object body is not readable.");
  return response.Body.transformToString("utf8");
}

const prefix = `ent007/generations/${generationId}`;
const [encryptedText, manifestText, completionText] = await Promise.all([
  getText(`${prefix}/snapshot.enc.json`),
  getText(`${prefix}/manifest.json`),
  getText(`${prefix}/complete.json`),
]);
const envelope = JSON.parse(encryptedText);
const manifest = JSON.parse(manifestText);
const completion = JSON.parse(completionText);

if (manifest.generationId !== generationId || completion.generationId !== generationId) {
  throw new Error("ENT-007 retained generation identity mismatch.");
}
if (completion.format !== "renderlab-ent007-backup-complete" || completion.version !== 1) {
  throw new Error("ENT-007 retained generation completion marker is invalid.");
}
const envelopeHash = sha256Hex(stableJson(envelope));
if (manifest.encryptedEnvelopeSha256 !== envelopeHash || completion.encryptedEnvelopeSha256 !== envelopeHash) {
  throw new Error("ENT-007 retained encrypted snapshot hash mismatch.");
}
const plaintext = decryptSnapshot(envelope, encryptionKey);
const snapshot = JSON.parse(plaintext.toString("utf8"));
if (snapshot.sourceProjectRef !== manifest.sourceProjectRef) {
  throw new Error("ENT-007 retained snapshot source-project mismatch.");
}
const durableKeys = durableR2KeysFromTables(snapshot.tables);
if (durableKeys.length !== manifest.durableObjectCount || durableKeys.length !== completion.objectBackupCount) {
  throw new Error("ENT-007 retained durable-object count mismatch.");
}

await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, `${generationId}.snapshot.enc.json`), `${stableJson(envelope)}\n`, { encoding: "utf8", mode: 0o600 });
await writeFile(join(outputDir, `${generationId}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });

const ageSeconds = Math.max(0, Math.round((Date.now() - Date.parse(manifest.generatedAt)) / 1000));
const evidence = {
  format: "renderlab-ent007-retained-download-evidence",
  version: 1,
  generationId,
  generatedAt: manifest.generatedAt,
  completedAt: completion.completedAt,
  backupAgeSeconds: ageSeconds,
  tableCount: Object.keys(snapshot.tables).length,
  durableObjectCount: durableKeys.length,
};
console.log(JSON.stringify(evidence));
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, [
    `generation_id=${generationId}`,
    `generated_at=${manifest.generatedAt}`,
    `completed_at=${completion.completedAt}`,
    `backup_age_seconds=${ageSeconds}`,
    "",
  ].join("\n"));
}
