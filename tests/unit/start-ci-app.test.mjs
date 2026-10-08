import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import test from "node:test";

import {
  parseCliArgs,
  startCiApp,
  validateHealthUrl,
  validateOutputPath,
  validatePort,
  validateTimeoutMs,
} from "../../scripts/start-ci-app.mjs";

async function reservePort() {
  const server = createServer((_request, response) => response.end("reserved"));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address.port;
  server.close();
  await once(server, "close");
  return port;
}

async function stopFixture(child) {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    once(child, "exit"),
    new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

test("CI app startup validates loopback-only configuration", () => {
  assert.equal(validatePort("3000"), 3000);
  assert.equal(validateTimeoutMs("60000"), 60_000);
  assert.equal(validateHealthUrl("http://127.0.0.1:3000/activity", 3000).pathname, "/activity");

  assert.throws(() => validatePort("0"), /port must be an integer/);
  assert.throws(() => validateTimeoutMs("10"), /timeout must be an integer/);
  assert.throws(() => validateHealthUrl("https://127.0.0.1:3000/", 3000), /must use http/);
  assert.throws(() => validateHealthUrl("http://example.com:3000/", 3000), /loopback only/);
  assert.throws(() => validateHealthUrl("http://127.0.0.1:3001/", 3000), /must match configured app port/);
  assert.throws(() => validateOutputPath("server.txt", ".log", "log file"), /must end in \.log/);
  assert.throws(
    () => parseCliArgs(["--port", "3000", "--health-url", "http://127.0.0.1:3000/", "--log-file", "server.log"]),
    /--timeout-ms is required/,
  );
});

test("CI app startup launches the fixed npm start command and records ready PID/log state", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "renderlab-start-ci-success-"));
  const port = await reservePort();
  const logFile = path.join(directory, "server.log");
  const pidFile = path.join(directory, "server.pid");
  let child;
  let requestedCommand;
  let requestedArgs;

  const spawnImpl = (command, args, options) => {
    requestedCommand = command;
    requestedArgs = args;
    const source = `
      const http = require("node:http");
      const server = http.createServer((_request, response) => {
        response.writeHead(204);
        response.end();
      });
      server.listen(${port}, "127.0.0.1", () => console.log("fixture-ready"));
      setInterval(() => {}, 1000);
    `;
    child = spawn(process.execPath, ["-e", source], options);
    return child;
  };

  try {
    const result = await startCiApp(
      {
        cwd: process.cwd(),
        port,
        healthUrl: `http://127.0.0.1:${port}/settings`,
        logFile,
        pidFile,
        timeoutMs: 5_000,
      },
      { spawnImpl, pollIntervalMs: 25 },
    );

    assert.match(requestedCommand, /npm(?:\.cmd)?$/);
    assert.deepEqual(requestedArgs, ["run", "start", "--", "-p", String(port)]);
    assert.equal(result.pid, child.pid);
    assert.equal((await readFile(pidFile, "utf8")).trim(), String(child.pid));
    assert.match(await readFile(logFile, "utf8"), /fixture-ready/);
  } finally {
    await stopFixture(child);
    await rm(directory, { recursive: true, force: true });
  }
});

test("CI app startup fails closed on bounded readiness timeout and removes stale PID state", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "renderlab-start-ci-timeout-"));
  const port = await reservePort();
  const logFile = path.join(directory, "server.log");
  const pidFile = path.join(directory, "server.pid");
  let child;

  const spawnImpl = (_command, _args, options) => {
    child = spawn(process.execPath, ["-e", "console.log('fixture-running'); setInterval(() => {}, 1000);"], options);
    return child;
  };

  try {
    await assert.rejects(
      startCiApp(
        {
          cwd: process.cwd(),
          port,
          healthUrl: `http://127.0.0.1:${port}/library`,
          logFile,
          pidFile,
          timeoutMs: 150,
        },
        { spawnImpl, pollIntervalMs: 25 },
      ),
      /did not become ready/,
    );

    assert.equal(await pathExists(pidFile), false);
    assert.match(await readFile(logFile, "utf8"), /fixture-running/);
  } finally {
    await stopFixture(child);
    await rm(directory, { recursive: true, force: true });
  }
});
