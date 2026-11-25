import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";

const origin = "http://127.0.0.1:4184";
const next = path.resolve("node_modules/next/dist/bin/next");
const env = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", CI: "true" };
const server = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", "4184"], { env, stdio: "inherit" });
const exited = once(server, "exit");
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error("Production Next server exited before readiness");
    try {
      const response = await fetch(origin + "/", { redirect: "manual", signal: AbortSignal.timeout(2000) });
      await response.body?.cancel();
      ready = true;
      break;
    } catch { await delay(500); }
  }
  assert.ok(ready, "Production Next server ready");
  // Current product intentionally exposes signed-out private-state pages, not
  // login redirects. Admin is concealed as not-found. Pin status AND Location.
  const cases = [
    { route: "/create", status: 200, location: null, marker: /Sign in with an account that has Create access|Sign in to upload/ },
    { route: "/activity", status: 200, location: null, marker: /Sign in to view Activity/ },
    { route: "/library", status: 200, location: null, marker: /Sign in to use Library/ },
    { route: "/admin", status: 404, location: null, marker: null },
  ];
  const failures = [];
  for (const c of cases) {
    try {
    const response = await fetch(origin + c.route, { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { accept: "text/html" } });
    const location = response.headers.get("location");
    const html = await response.text();
    console.log("SIGNED_OUT_HTTP " + JSON.stringify({ route: c.route, status: response.status, location, contentType: response.headers.get("content-type") }));
    assert.equal(response.status, c.status, c.route + " HTTP status");
    assert.equal(location, c.location, c.route + " Location");
    assert.match(response.headers.get("content-type") ?? "", /text\/html/i);
    if (c.marker) assert.match(html, c.marker, c.route + " signed-out private-state content");
    } catch (error) { failures.push(c.route + ": " + String(error)); }
  }
  assert.deepEqual(failures, [], "All signed-out routes must preserve the same public contract");
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) {
    await Promise.race([exited, delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
  }
}
