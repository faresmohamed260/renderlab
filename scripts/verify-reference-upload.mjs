import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const fixtureFilename = "renderlab-integration-1x1.png";
const fixtureAccount = configuredTestAccountIdentity("reference-upload");
const cleanupOnly = process.argv.includes("--cleanup-only");

// 1×1 transparent PNG. The integration verifies RenderLab's signed-upload/storage
// contract rather than image processing, so a tiny deterministic fixture is enough.
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z5ZsAAAAASUVORK5CYII=",
  "base64",
);

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2Bucket = process.env.R2_BUCKET_NAME;

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: r2AccountId,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for reference upload verification.`);
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function request(path, account, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, withAccountAuthorization(account, init));
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

async function supabase(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("apikey", supabaseKey);
  headers.set("authorization", `Bearer ${supabaseKey}`);
  if (init.body != null && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers });
}

async function cleanupIntegrationFixtures() {
  const query = `generation_sources?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&filename=eq.${encodeURIComponent(fixtureFilename)}&select=id,storage_key`;
  const response = await supabase(query);
  if (!response.ok) throw new Error(`Could not query integration fixtures (${response.status}).`);
  const fixtures = await response.json();

  for (const fixture of fixtures) {
    if (fixture.storage_key) {
      await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: fixture.storage_key })).catch(() => {});
    }
    const deletion = await supabase(
      `generation_sources?owner_id=eq.${encodeURIComponent(fixtureAccount.id)}&id=eq.${encodeURIComponent(fixture.id)}`,
      { method: "DELETE" },
    );
    if (!deletion.ok) throw new Error(`Could not delete integration fixture row (${deletion.status}).`);
  }

  await deleteConfiguredTestAccount(fixtureAccount);
  if (fixtures.length) {
    console.log(`Cleaned ${fixtures.length} reference integration fixture(s) for owner=${fixtureAccount.id}.`);
  }
}

console.log(`Checking RenderLab reference upload at ${baseUrl}`);
await cleanupIntegrationFixtures();
if (cleanupOnly) process.exit(0);

let verified = false;
try {
  const account = await createConfiguredTestAccount("reference-upload");
  const ticketResponse = await request("/api/assets/reference/upload-tickets", account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: fixtureFilename,
      mimeType: "image/png",
      sizeBytes: pngBytes.length,
    }),
  });

  if (!ticketResponse.response.ok) {
    throw new Error(`Upload ticket failed (${ticketResponse.response.status}): ${JSON.stringify(ticketResponse.payload)}`);
  }

  const ticket = ticketResponse.payload?.ticket;
  const { sourceId, uploadUrl, method, headers } = ticket ?? {};
  if (!sourceId || !uploadUrl || method !== "PUT" || headers?.["content-type"] !== "image/png") {
    throw new Error(`Upload ticket returned an invalid contract: ${JSON.stringify(ticketResponse.payload)}`);
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: pngBytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Signed R2 upload failed (${uploadResponse.status}): ${await uploadResponse.text()}`);
  }

  const completion = await request("/api/assets/reference/upload-completions", account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceId, width: 1, height: 1 }),
  });

  if (!completion.response.ok) {
    throw new Error(`Upload completion failed (${completion.response.status}): ${JSON.stringify(completion.payload)}`);
  }

  const source = completion.payload?.source;
  if (!source || source.id !== sourceId || source.status !== "ready" || source.mimeType !== "image/png") {
    throw new Error(`Upload completion returned an invalid source: ${JSON.stringify(completion.payload)}`);
  }

  const ownerResponse = await supabase(`generation_sources?id=eq.${encodeURIComponent(sourceId)}&select=owner_id&limit=1`);
  if (!ownerResponse.ok) throw new Error(`Could not verify reference source owner (${ownerResponse.status}).`);
  const ownerRows = await ownerResponse.json();
  if (ownerRows[0]?.owner_id !== account.id) throw new Error("Reference source did not inherit the authenticated account owner.");

  verified = true;
  console.log(`Reference upload verified successfully. owner=${account.id} sourceId=${sourceId}`);
} finally {
  await cleanupIntegrationFixtures();
}

if (!verified) process.exitCode = 1;
