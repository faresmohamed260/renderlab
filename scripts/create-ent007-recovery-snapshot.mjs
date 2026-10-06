import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import {
  buildSafeManifest,
  collectEnt007Snapshot,
  decodeBackupKey,
  encryptSnapshot,
  stableJson,
} from "./lib/ent007-recovery.mjs";

const projectRef = String(process.env.SUPABASE_PROJECT_REF || "rashyleshocuvpgcooxy").trim();
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const encryptionKey = decodeBackupKey(process.env.ENT007_BACKUP_ENCRYPTION_KEY);
const outputDir = resolve(process.env.ENT007_OUTPUT_DIR || "artifacts/ent007-recovery");

if (!accessToken) throw new Error("SUPABASE_ACCESS_TOKEN is required.");
if (!/^[a-z0-9]{20}$/.test(projectRef)) throw new Error("SUPABASE_PROJECT_REF is invalid.");

async function managementQuery(sql, { managed }) {
  const suffix = managed ? "database/query" : "database/query/read-only";
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/${suffix}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(managed ? { query: sql, read_only: true } : { query: sql }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase Management API query failed (${response.status}): ${body.slice(0, 240)}`);
  }
  return response.json();
}
const generatedAt = new Date().toISOString();
const generationId = `${generatedAt.replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomBytes(4).toString("hex")}`;
const snapshot = await collectEnt007Snapshot({
  query: managementQuery,
  projectRef,
  generatedAt,
});
const plaintext = Buffer.from(stableJson(snapshot), "utf8");
const encryptedEnvelope = encryptSnapshot(plaintext, encryptionKey);
const manifest = buildSafeManifest({ snapshot, plaintext, encryptedEnvelope, generationId });

await mkdir(outputDir, { recursive: true });
const encryptedPath = join(outputDir, `${generationId}.snapshot.enc.json`);
const manifestPath = join(outputDir, `${generationId}.manifest.json`);
await writeFile(encryptedPath, `${stableJson(encryptedEnvelope)}\n`, { encoding: "utf8", mode: 0o600 });
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });

console.log(JSON.stringify({
  generationId,
  rowCounts: manifest.rowCounts,
  authUserCount: manifest.authUserCount,
  authIdentityCount: manifest.authIdentityCount,
  durableObjectCount: manifest.durableObjectCount,
  migrationHead: manifest.migrationHead,
  encryptedEnvelopeSha256: manifest.encryptedEnvelopeSha256,
}));
