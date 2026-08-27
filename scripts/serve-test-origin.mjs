import { createServer } from "node:https";
import { request as httpRequest } from "node:http";
import { readFile } from "node:fs/promises";

const listenHost = process.env.RENDERLAB_TEST_PROXY_HOST || "0.0.0.0";
const listenPort = Number(process.env.RENDERLAB_TEST_PROXY_PORT || 443);
const targetHost = process.env.RENDERLAB_TEST_PROXY_TARGET_HOST || "127.0.0.1";
const targetPort = Number(process.env.RENDERLAB_TEST_PROXY_TARGET_PORT || 3000);
const certPath = process.env.RENDERLAB_TEST_TLS_CERT;
const keyPath = process.env.RENDERLAB_TEST_TLS_KEY;

if (!certPath || !keyPath) {
  throw new Error("RENDERLAB_TEST_TLS_CERT and RENDERLAB_TEST_TLS_KEY are required.");
}

const [cert, key] = await Promise.all([readFile(certPath), readFile(keyPath)]);

const server = createServer({ cert, key }, (incoming, outgoing) => {
  const proxy = httpRequest({
    hostname: targetHost,
    port: targetPort,
    method: incoming.method,
    path: incoming.url,
    headers: incoming.headers,
  }, (response) => {
    outgoing.writeHead(response.statusCode || 502, response.statusMessage, response.headers);
    response.pipe(outgoing);
  });

  proxy.on("error", (error) => {
    if (!outgoing.headersSent) outgoing.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end(`RenderLab test-origin proxy failed: ${error.message}`);
  });

  incoming.pipe(proxy);
});

server.listen(listenPort, listenHost, () => {
  console.log(`RenderLab test-origin proxy listening on https://${listenHost}:${listenPort} -> http://${targetHost}:${targetPort}.`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
