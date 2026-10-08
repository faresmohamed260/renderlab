import { spawn } from "node:child_process";
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const DEFAULT_POLL_INTERVAL_MS = 1_000;

function problem(message) {
  return new Error(`CI app startup configuration error: ${message}`);
}

export function validatePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw problem(`port must be an integer between 1 and 65535; received ${JSON.stringify(value)}`);
  }
  return port;
}

export function validateTimeoutMs(value) {
  const timeoutMs = Number(value);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 50 || timeoutMs > 300_000) {
    throw problem(`timeout must be an integer between 50 and 300000 ms; received ${JSON.stringify(value)}`);
  }
  return timeoutMs;
}

export function validateHealthUrl(value, port) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw problem(`health URL must be an absolute loopback HTTP URL; received ${JSON.stringify(value)}`);
  }

  if (url.protocol !== "http:") {
    throw problem(`health URL must use http:; received ${url.protocol}`);
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw problem(`health URL must target loopback only; received host ${JSON.stringify(url.hostname)}`);
  }
  if (url.username || url.password) {
    throw problem("health URL must not contain credentials");
  }
  if (url.hash) {
    throw problem("health URL must not contain a fragment");
  }

  const healthPort = Number(url.port || 80);
  if (healthPort !== port) {
    throw problem(`health URL port ${healthPort} must match configured app port ${port}`);
  }

  return url;
}

export function validateOutputPath(value, expectedExtension, label, cwd = process.cwd()) {
  if (typeof value !== "string" || value.length === 0 || /[\0\r\n]/.test(value)) {
    throw problem(`${label} must be a non-empty local file path`);
  }
  if (value.length > 4_096) {
    throw problem(`${label} is unreasonably long`);
  }

  const resolved = path.resolve(cwd, value);
  const parsed = path.parse(resolved);
  if (resolved === parsed.root || parsed.base.length === 0) {
    throw problem(`${label} must resolve to a file, not a filesystem root`);
  }
  if (path.extname(resolved).toLowerCase() !== expectedExtension) {
    throw problem(`${label} must end in ${expectedExtension}`);
  }

  return resolved;
}

export function parseCliArgs(argv, cwd = process.cwd()) {
  const allowed = new Set(["--port", "--health-url", "--log-file", "--pid-file", "--timeout-ms"]);
  const values = new Map();

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(flag)) {
      throw problem(`unknown argument ${JSON.stringify(flag)}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw problem(`${flag} requires a value`);
    }
    if (values.has(flag)) {
      throw problem(`${flag} may be provided only once`);
    }
    values.set(flag, value);
  }

  for (const required of ["--port", "--health-url", "--log-file", "--timeout-ms"]) {
    if (!values.has(required)) {
      throw problem(`${required} is required`);
    }
  }

  const port = validatePort(values.get("--port"));
  const timeoutMs = validateTimeoutMs(values.get("--timeout-ms"));
  const healthUrl = validateHealthUrl(values.get("--health-url"), port);
  const logFile = validateOutputPath(values.get("--log-file"), ".log", "log file", cwd);
  const pidFile = values.has("--pid-file")
    ? validateOutputPath(values.get("--pid-file"), ".pid", "PID file", cwd)
    : null;

  if (pidFile === logFile) {
    throw problem("log file and PID file must be different paths");
  }

  return { cwd, healthUrl, logFile, pidFile, port, timeoutMs };
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function readLog(logFile) {
  try {
    return await readFile(logFile, "utf8");
  } catch {
    return "<server log unavailable>";
  }
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.killed) return;
  try {
    child.kill();
  } catch {
    // Best-effort cleanup only. The caller still receives the startup failure.
  }
}

export async function startCiApp(
  options,
  {
    spawnImpl = spawn,
    fetchImpl = fetch,
    sleepImpl = sleep,
    nowImpl = Date.now,
    pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  } = {},
) {
  const port = validatePort(options.port);
  const timeoutMs = validateTimeoutMs(options.timeoutMs);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const healthUrl = validateHealthUrl(String(options.healthUrl), port);
  const logFile = validateOutputPath(options.logFile, ".log", "log file", cwd);
  const pidFile = options.pidFile
    ? validateOutputPath(options.pidFile, ".pid", "PID file", cwd)
    : null;

  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 10 || pollIntervalMs > 10_000) {
    throw problem("internal poll interval must be between 10 and 10000 ms");
  }
  if (pidFile === logFile) {
    throw problem("log file and PID file must be different paths");
  }

  await mkdir(path.dirname(logFile), { recursive: true });
  if (pidFile) await mkdir(path.dirname(pidFile), { recursive: true });

  const logHandle = await open(logFile, "w");
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  let child;
  let spawnError = null;

  try {
    child = spawnImpl(command, ["run", "start", "--", "-p", String(port)], {
      cwd,
      env: process.env,
      stdio: ["ignore", logHandle.fd, logHandle.fd],
      windowsHide: true,
    });
    child.once?.("error", (error) => {
      spawnError = error;
    });
  } finally {
    await logHandle.close();
  }

  if (!child?.pid) {
    await stopChild(child);
    throw new Error("Configured RenderLab server failed to spawn.");
  }

  if (pidFile) {
    await writeFile(pidFile, `${child.pid}\n`, "utf8");
  }

  const deadline = nowImpl() + timeoutMs;
  let lastFetchError = null;

  while (nowImpl() < deadline) {
    if (spawnError) break;
    if (child.exitCode !== null) break;

    try {
      const response = await fetchImpl(healthUrl, { redirect: "manual" });
      if (response.status >= 200 && response.status < 400) {
        child.unref?.();
        return { pid: child.pid, healthUrl: healthUrl.href, logFile, pidFile };
      }
    } catch (error) {
      lastFetchError = error;
    }

    await sleepImpl(pollIntervalMs);
  }

  await stopChild(child);
  if (pidFile) await rm(pidFile, { force: true });
  const serverLog = await readLog(logFile);
  const cause = spawnError
    ? `spawn error: ${spawnError.message}`
    : child.exitCode !== null
      ? `server exited before readiness with code ${child.exitCode}`
      : lastFetchError
        ? `last readiness request failed: ${lastFetchError.message}`
        : `readiness timeout after ${timeoutMs} ms`;

  throw new Error(
    `Configured RenderLab server did not become ready at ${healthUrl.href} (${cause}).\n--- server log ---\n${serverLog}`,
  );
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (entryPath === fileURLToPath(import.meta.url)) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    const result = await startCiApp(options);
    console.log(`Configured RenderLab server is ready at ${result.healthUrl} (pid ${result.pid}).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
