const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

// 1×1 transparent PNG. The integration verifies RenderLab's signed-upload/storage
// contract rather than image processing, so a tiny deterministic fixture is enough.
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z5ZsAAAAASUVORK5CYII=",
  "base64",
);

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { response, payload };
}

console.log(`Checking RenderLab reference upload at ${baseUrl}`);

const ticketResponse = await request("/api/assets/reference/upload-tickets", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    filename: "renderlab-integration-1x1.png",
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

const completion = await request("/api/assets/reference/upload-completions", {
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

console.log(`Reference upload verified successfully. sourceId=${sourceId}`);
