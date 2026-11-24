import { spawn, spawnSync, execFileSync } from "node:child_process";
import { copyFile, lstat, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const project = "design/rd/p6-02a-create";
const system = "design/system/v2";
const host = "127.0.0.1";
const port = 4316;
const origin = "http://" + host + ":" + port;
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--smoke")) {
  throw new Error("Usage: node scripts/run-p602a-design-prototype.mjs [--smoke]");
}
const smoke = args[0] === "--smoke";

// Explicit allowlist; no NODE_OPTIONS, NEXT_PUBLIC_*, service credentials or proxy variables.
const allowedEnv = new Set(["PATH", "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT",
  "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "TMPDIR",
  "LANG", "LC_ALL", "PLAYWRIGHT_BROWSERS_PATH"]);
const env = Object.fromEntries(Object.entries(process.env)
  .filter(([key, value]) => allowedEnv.has(key.toUpperCase()) && typeof value === "string"));
Object.assign(env, { NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "development" });

let scratch, child, exited = false, requestedStop = false;
let signalExit = 0;
let browser;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const onSignal = (code) => {
  signalExit = code;
  requestedStop = true;
};
const onInterrupt = () => onSignal(130);
const onTerminate = () => onSignal(143);
process.on("SIGINT", onInterrupt);
process.on("SIGTERM", onTerminate);

async function reserveCheck() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host, port, exclusive: true }, () => server.close(resolve));
  });
}

async function stage() {
  const artifacts = path.join(root, "artifacts");
  await mkdir(artifacts, { recursive: true });
  scratch = await mkdtemp(path.join(artifacts, "p602a-"));
  const files = execFileSync("git", ["ls-files", "-z", "--", project, system], {
    cwd: root, encoding: "utf8", env,
  }).split("\0").filter(Boolean);
  if (!files.includes(project + "/app/page.tsx") || !files.includes(system + "/tokens.css")) {
    throw new Error("Tracked prototype sources missing.");
  }
  for (const file of files) {
    const segments = file.split("/");
    if (segments.some((segment) => segment.startsWith(".") || segment === "node_modules")
        || !/\.(?:ts|tsx|mjs|json|css|md|svg|png|webp|jpg|jpeg)$/i.test(file)) {
      throw new Error("Unexpected tracked prototype file: " + file);
    }
    const source = path.join(root, file);
    if (!(await lstat(source)).isFile()) throw new Error("Non-regular prototype source: " + file);
    const destination = path.join(scratch, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}

async function waitForApp() {
  const until = Date.now() + 90_000;
  while (!exited && !requestedStop && Date.now() < until) {
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(10_000), redirect: "error" });
      if (response.ok && (await response.text()).includes("data-p602a-isolated")) return;
    } catch {
      // The local dev server may still be compiling.
    }
    await sleep(300);
  }
  throw new Error("Isolated foundation did not become ready.");
}

async function browserSmoke() {
  const { chromium } = await import("@playwright/test");
  browser = await chromium.launch({ env });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const unexpected = [];
      const context = await browser.newContext({ viewport, reducedMotion, serviceWorkers: "block" });
      try {
        await context.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (url.origin === origin && (url.pathname === "/" || url.pathname === "/favicon.ico" || url.pathname.startsWith("/_next/"))) {
            await route.continue();
          } else {
            unexpected.push(url.origin + url.pathname);
            await route.abort();
          }
        });
        await context.routeWebSocket("**/*", (socket) => {
          const url = new URL(socket.url());
          if (url.origin === "ws://" + host + ":" + port && url.pathname.startsWith("/_next/")) socket.connectToServer();
          else { unexpected.push(url.origin + url.pathname); socket.close(); }
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(origin, { waitUntil: "load" });
        await page.locator("[data-p602a-isolated='foundation']").waitFor();
        const state = await page.evaluate(() => {
          const css = getComputedStyle(document.documentElement);
          return {
            canvas: css.getPropertyValue("--rlv2-canvas").trim(),
            duration: css.getPropertyValue("--rlv2-duration-normal").trim(),
            reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
            width: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          };
        });
        const roles = await page.locator("[data-p602a-isolated] li").allTextContents();
        if (state.canvas !== "#0b0c10" || state.duration !== (reducedMotion === "reduce" ? "0ms" : "160ms")
            || state.reduced !== (reducedMotion === "reduce") || state.scroll > state.width
            || roles.length !== 4 || !roles.includes("drag-release: 324 / 30 / 1")) {
          throw new Error("Foundation browser state mismatch.");
        }
        if (unexpected.length || errors.length) throw new Error("Unexpected browser activity: " + [...unexpected, ...errors].join("; "));
        console.log("Foundation browser smoke passed:", viewport.width, viewport.height, reducedMotion);
      } finally {
        await context.close();
      }
      if (unexpected.length) throw new Error("Unexpected browser requests during shutdown.");
    }
  }
}

async function stopChild() {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    if (!exited) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { env, windowsHide: true, stdio: "ignore" });
  } else {
    try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    await sleep(250);
    try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  }
  for (let i = 0; !exited && i < 40; i++) await sleep(100);
  if (!exited) throw new Error("Prototype process did not stop.");
}

try {
  await reserveCheck();
  await stage();
  if (requestedStop) throw new Error("Prototype start cancelled.");
  child = spawn(process.execPath, [
    path.join(root, "node_modules", "next", "dist", "bin", "next"),
    "dev", path.join(scratch, project), "--webpack", "--hostname", host, "--port", String(port),
  ], { cwd: path.join(scratch, project), env, stdio: "inherit", detached: process.platform !== "win32", windowsHide: true });
  let spawnError;
  let childCode;
  child.once("error", (error) => { spawnError = error; exited = true; });
  child.once("exit", (code) => { childCode = code; exited = true; });
  await waitForApp();
  console.log("Isolated prototype:", origin);
  if (smoke) await browserSmoke();
  else while (!exited && !requestedStop) await sleep(250);
  if (spawnError) throw spawnError;
  if (exited && !requestedStop) throw new Error("Prototype server exited unexpectedly: " + childCode);
} finally {
  try {
    if (browser) await browser.close();
  } finally {
    try { await stopChild(); }
    finally {
      if (scratch) await rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      process.off("SIGINT", onInterrupt);
      process.off("SIGTERM", onTerminate);
      if (signalExit) process.exitCode = signalExit;
    }
  }
}
