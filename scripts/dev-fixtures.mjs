#!/usr/bin/env node
// Local, secret-free live preview of the Phase 6 surfaces.
//
// Starts the mounted-component fixture app in `next dev` (hot reload) and a tiny
// proxy that adds the `x-renderlab-fixture-shell` header the fixture layout needs,
// which a normal browser cannot send. No credentials, network services or
// production data are used; every page renders synthetic fixture data.
//
//   npm run dev:fixtures            -> http://127.0.0.1:3000
//   open /__shell/owner             -> signed-in owner shell (default)
//   open /__shell/signed-out        -> signed-out shell (Landing at /?landing-review=1)
//   open /__shell/member | review | create | none

import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";

const PUBLIC_PORT = Number(process.env.PORT ?? 3000);
const NEXT_PORT = Number(process.env.NEXT_PORT ?? PUBLIC_PORT + 1);
const HOST = "127.0.0.1";
const VARIANTS = new Set(["owner", "member", "signed-out", "review", "create", "none"]);
const COOKIE = "rl-fixture-shell";

const variantOf = (req) => {
  const match = (req.headers.cookie ?? "").match(new RegExp(`(?:^|; )${COOKIE}=([\\w-]+)`));
  return match && VARIANTS.has(match[1]) ? match[1] : "owner";
};
const forwardHeaders = (req) => {
  const headers = { ...req.headers, host: `${HOST}:${NEXT_PORT}` };
  const variant = variantOf(req);
  if (variant !== "none") headers["x-renderlab-fixture-shell"] = variant;
  return headers;
};

const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "tests/component-app", "--hostname", HOST, "--port", String(NEXT_PORT)], {
  stdio: ["ignore", "inherit", "inherit"],
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
const stop = () => { child.kill(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}`);
  const switcher = url.pathname.match(/^\/__shell\/([\w-]+)$/);
  if (switcher) {
    if (!VARIANTS.has(switcher[1])) { res.writeHead(404).end(`Unknown shell. Use: ${[...VARIANTS].join(", ")}`); return; }
    res.writeHead(302, { "set-cookie": `${COOKIE}=${switcher[1]}; Path=/; SameSite=Lax`, location: url.searchParams.get("to") ?? "/" }).end();
    return;
  }
  const upstream = http.request({ host: HOST, port: NEXT_PORT, path: req.url, method: req.method, headers: forwardHeaders(req) }, (up) => {
    res.writeHead(up.statusCode ?? 502, up.headers);
    up.pipe(res);
  });
  upstream.on("error", () => res.writeHead(502).end("Fixture app is still starting; retry in a moment."));
  req.pipe(upstream);
});

// Hot-reload websocket.
server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(NEXT_PORT, HOST, () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`, ...Object.entries(forwardHeaders(req)).map(([k, v]) => `${k}: ${v}`), "", ""];
    upstream.write(lines.join("\r\n"));
    if (head?.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PUBLIC_PORT, HOST, () => {
  console.log(`\nRenderLab fixture preview: http://${HOST}:${PUBLIC_PORT}  (hot reload on)\n`);
  console.log("  Create        /create");
  console.log("  Landing       /__shell/signed-out?to=/%3Flanding-review%3D1   (then /__shell/owner to go back)");
  console.log("  Library       /round3-library");
  console.log("  Settings      /round3-settings");
  console.log("  Admin         /admin");
  console.log("  History       /create-history-mount\n");
});
