import { appendFile } from "node:fs/promises";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import {
  assertEnt007GenerationId,
  selectLatestCompleteEnt007Generation,
} from "./lib/ent007-drill-selection.mjs";

const requestedGenerationId = String(process.env.ENT007_REQUESTED_GENERATION_ID || "").trim();
const maxAgeSeconds = Number(process.env.ENT007_MAX_GENERATION_AGE_SECONDS || 172800);
const accountId = String(process.env.R2_ACCOUNT_ID || "").trim();
const accessKeyId = String(process.env.ENT007_R2_BACKUP_ACCESS_KEY_ID || "").trim();
const secretAccessKey = String(process.env.ENT007_R2_BACKUP_SECRET_ACCESS_KEY || "").trim();
const sessionToken = String(process.env.ENT007_R2_BACKUP_SESSION_TOKEN || "").trim();
const backupBucket = String(process.env.ENT007_R2_BACKUP_BUCKET || "renderlab-dr-backup").trim();

async function emit({ generationId, selectionSource, ageSeconds = "" }) {
  const lines = [
    `ENT007_GENERATION_ID=${generationId}`,
  ];
  if (process.env.GITHUB_ENV) {
    await appendFile(process.env.GITHUB_ENV, `${lines.join("\n")}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, [
      `generation_id=${generationId}`,
      `selection_source=${selectionSource}`,
      `selection_age_seconds=${ageSeconds}`,
      "",
    ].join("\n"));
  }
  console.log(JSON.stringify({ generationId, selectionSource, ageSeconds }));
}

if (requestedGenerationId) {
  await emit({
    generationId: assertEnt007GenerationId(requestedGenerationId),
    selectionSource: "requested",
  });
  process.exit(0);
}

for (const [name, value] of Object.entries({ accountId, accessKeyId, secretAccessKey, backupBucket })) {
  if (!value) throw new Error(`Missing ENT-007 generation selection configuration: ${name}`);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: sessionToken
    ? { accessKeyId, secretAccessKey, sessionToken }
    : { accessKeyId, secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

const objects = [];
let continuationToken;
do {
  const response = await client.send(new ListObjectsV2Command({
    Bucket: backupBucket,
    Prefix: "ent007/generations/",
    ContinuationToken: continuationToken,
  }));
  objects.push(...(response.Contents || []));
  continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
} while (continuationToken);

const selected = selectLatestCompleteEnt007Generation(objects, { maxAgeSeconds });
await emit({
  generationId: selected.generationId,
  selectionSource: "latest-complete",
  ageSeconds: selected.ageSeconds,
});
