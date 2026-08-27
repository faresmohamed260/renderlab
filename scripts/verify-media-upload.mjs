import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  configuredTestAccountIdentity,
  createConfiguredTestAccount,
  deleteConfiguredTestAccount,
  withAccountAuthorization,
} from "./lib/configured-test-account.mjs";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const r2Bucket = process.env.R2_BUCKET_NAME;
const cleanupOnly = process.argv.includes("--cleanup-only");
const fixtureFilename = "renderlab-اختبار-画像.png";
const fixtureDisplayName = "Persistent upload verification";
const fixtureAccount = configuredTestAccountIdentity("media-upload");
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z5ZsAAAAASUVORK5CYII=",
  "base64",
);

for (const [name, value] of Object.entries({
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: supabaseKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: r2Bucket,
})) {
  if (!value) throw new Error(`${name} is required for persistent media upload verification.`);
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

async function rows(path) {
  const response = await supabase(path);
  if (!response.ok) throw new Error(`Supabase upload verification query failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function cleanupFixtures() {
  const sessions = await rows(
    `media_upload_sessions?filename=eq.${encodeURIComponent(fixtureFilename)}&select=id,storage_key,media_asset_id`,
  );

  for (const session of sessions) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: session.storage_key })).catch(() => {});
    const sessionDelete = await supabase(`media_upload_sessions?id=eq.${encodeURIComponent(session.id)}`, { method: "DELETE" });
    if (!sessionDelete.ok) throw new Error(`Could not remove media upload session fixture (${sessionDelete.status}).`);
    if (session.media_asset_id) {
      const assetDelete = await supabase(`media_assets?id=eq.${encodeURIComponent(session.media_asset_id)}`, { method: "DELETE" });
      if (!assetDelete.ok) throw new Error(`Could not remove uploaded media asset fixture (${assetDelete.status}).`);
    }
  }

  await deleteConfiguredTestAccount(fixtureAccount);
  if (sessions.length) console.log(`Cleaned ${sessions.length} persistent media upload fixture(s).`);
}

await cleanupFixtures();
if (cleanupOnly) process.exit(0);

let primaryError = null;
try {
  const account = await createConfiguredTestAccount("media-upload");
  const ticketResult = await request("/api/media/uploads/upload-tickets", account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: fixtureFilename,
      displayName: fixtureDisplayName,
      mimeType: "image/png",
      sizeBytes: pngBytes.length,
    }),
  });
  assert(ticketResult.response.status === 201, `Upload ticket returned ${ticketResult.response.status}: ${JSON.stringify(ticketResult.payload)}`);
  const ticket = ticketResult.payload?.ticket;
  assert(ticketResult.payload?.ok && ticket?.uploadId && ticket?.uploadUrl, `Upload ticket contract is invalid: ${JSON.stringify(ticketResult.payload)}`);
  assert(ticket.method === "PUT", "Persistent upload ticket must use PUT.");
  assert(ticket.headers?.["content-type"] === "image/png", "Persistent upload ticket must bind the MIME type.");
  assert(!JSON.stringify(ticket).includes("storage_key"), "Persistent upload ticket exposed storage metadata.");

  const uploadResponse = await fetch(ticket.uploadUrl, {
    method: ticket.method,
    headers: ticket.headers,
    body: pngBytes,
  });
  assert(uploadResponse.ok, `Signed persistent R2 upload failed (${uploadResponse.status}): ${await uploadResponse.text()}`);

  const completionRequest = () => request("/api/media/uploads/upload-completions", account, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uploadId: ticket.uploadId, width: 1, height: 1 }),
  });
  const [completion, concurrentCompletion] = await Promise.all([completionRequest(), completionRequest()]);
  assert(completion.response.ok && completion.payload?.ok, `Persistent upload completion failed (${completion.response.status}): ${JSON.stringify(completion.payload)}`);
  assert(concurrentCompletion.response.ok && concurrentCompletion.payload?.ok, `Concurrent persistent upload completion failed (${concurrentCompletion.response.status}): ${JSON.stringify(concurrentCompletion.payload)}`);
  const asset = completion.payload.asset;
  assert(asset?.id, "Persistent upload completion did not return a durable asset ID.");
  assert(concurrentCompletion.payload.asset?.id === asset.id, "Concurrent completion did not recover to the same durable asset.");
  assert(asset.origin === "uploaded", `Persistent upload origin is incorrect: ${JSON.stringify(asset)}`);
  assert(asset.generationJobId === null, "Persistent upload should not claim a generation job.");
  assert(asset.kind === "image" && asset.mimeType === "image/png", "Persistent upload media identity is incorrect.");
  assert(asset.displayName === fixtureDisplayName, "Persistent upload display name was not preserved.");
  assert(asset.originalFilename === fixtureFilename, "Persistent upload filename was not preserved.");
  assert(asset.sizeBytes === pngBytes.length, "Persistent upload size was not persisted.");
  assert(asset.width === 1 && asset.height === 1, "Persistent upload dimensions were not persisted.");

  const repeated = await completionRequest();
  assert(repeated.response.ok && repeated.payload?.asset?.id === asset.id, "Persistent upload completion is not sequentially idempotent.");

  const metadata = await request(`/api/media/assets/${encodeURIComponent(asset.id)}`, account, {
    headers: { accept: "application/json" },
  });
  assert(metadata.response.ok && metadata.payload?.asset?.id === asset.id, "Uploaded asset was not available through the ordinary media metadata API.");
  assert(metadata.payload.asset.origin === "uploaded", "Ordinary media API lost uploaded origin metadata.");

  const contentResponse = await fetch(`${baseUrl}${asset.contentUrl}`, withAccountAuthorization(account));
  assert(contentResponse.ok, `Uploaded asset content could not be loaded (${contentResponse.status}).`);
  assert(String(contentResponse.headers.get("content-type") || "").startsWith("image/png"), "Uploaded asset content MIME type is incorrect.");
  assert(Buffer.from(await contentResponse.arrayBuffer()).length === pngBytes.length, "Uploaded asset content length changed.");

  const listResult = await request("/api/media/assets?kind=image&limit=48", account, { headers: { accept: "application/json" } });
  assert(listResult.response.ok && listResult.payload?.ok, "Library media list could not be loaded after persistent upload.");
  assert(listResult.payload.items.some((item) => item.id === asset.id && item.origin === "uploaded"), "Persistent upload did not appear through the ordinary Library media list contract.");

  const sessionRows = await rows(`media_upload_sessions?id=eq.${encodeURIComponent(ticket.uploadId)}&select=status,media_asset_id,filename,owner_id`);
  assert(sessionRows[0]?.status === "completed" && sessionRows[0]?.media_asset_id === asset.id, "Upload session was not linked to the promoted media asset.");
  assert(sessionRows[0]?.filename === fixtureFilename, "Upload session did not preserve the original Unicode filename.");
  assert(sessionRows[0]?.owner_id === account.id, "Upload session was not owned by the authenticated fixture account.");

  console.log(`Persistent media upload verified successfully. owner=${account.id} upload=${ticket.uploadId} asset=${asset.id}`);
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanupFixtures();
  } catch (cleanupError) {
    console.error(cleanupError);
    if (!primaryError) primaryError = cleanupError;
  }
}

if (primaryError) throw primaryError;
