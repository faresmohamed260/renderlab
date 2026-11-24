import { spawn, spawnSync, execFileSync } from "node:child_process";
import { copyFile, lstat, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { captureCreate } from "./lib/p602a-create-capture.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const project = "design/rd/p6-02a-create";
const system = "design/system/v2";
const host = "127.0.0.1";
const port = 4316;
const origin = "http://" + host + ":" + port;
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !["--smoke", "--capture"].includes(args[0]))) {
  throw new Error("Usage: node scripts/run-p602a-design-prototype.mjs [--smoke | --capture]");
}
const smoke = args[0] === "--smoke" || args[0] === "--capture";
const capture = args[0] === "--capture";

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

async function verifyShowcase(page, reducedMotion, viewport) {
  const board = page.locator("[data-p602a-board]");
  await board.waitFor();
  // Wait for hydration, not only the SSR document.
  await page.waitForFunction((reduced) => document.querySelector("[data-motion-mode]")?.textContent === (reduced ? "Reduced" : "Normal"), reducedMotion === "reduce");
  const states = await board.locator("[data-state]").evaluateAll((nodes) => [...new Set(nodes.map((node) => node.getAttribute("data-state")))].sort());
  for (const state of ["idle", "hover", "focus", "pressed", "selected", "disabled", "pending", "error", "empty", "success"]) {
    if (!states.includes(state)) throw new Error("Missing showcase state: " + state);
  }
  const checkGeometry = async () => {
    const geometry = await page.evaluate(() => {
      const visible = (el) => el.getClientRects().length > 0;
      const bad = [...document.querySelectorAll(".p602a-control, .p602a-menu-item")].filter(visible).flatMap((el) => {
        const box = el.getBoundingClientRect();
        return box.width < 24 || box.height < 24 ? [el.textContent + " " + box.width + "x" + box.height] : [];
      });
      const overflow = [...document.querySelectorAll(".p602a-example, .p602a-grid, .p602a-section, .p602a-field, .p602a-popover, .p602a-dialog")]
        .filter(visible).filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.className);
      return { bad, overflow, documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
    });
    if (geometry.bad.length || geometry.overflow.length || geometry.documentOverflow) throw new Error("Showcase geometry: " + JSON.stringify(geometry));
  };
  const measure = async (label, selector = "[data-contrast]") => {
    const result = await page.evaluate(({ selector, label }) => {
      // Computed rendered CSS, including inherited colors and alpha compositing
      // against ancestor backgrounds. This is not screenshot pixel sampling.
      const parse = (value) => {
        const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/.exec(value);
        if (!match) throw new Error("Unsupported computed color: " + value);
        return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])];
      };
      const composite = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
      const background = (el) => {
        const layers = [];
        for (let node = el; node; node = node.parentElement) layers.unshift(parse(getComputedStyle(node).backgroundColor));
        return layers.reduce((bg, fg) => composite(fg, bg), [0, 0, 0, 1]);
      };
      const lum = (rgb) => rgb.slice(0, 3).map((c) => c / 255).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
      const rows = [];
      const add = (el, role, foreground, bg, threshold) => {
        const fg = composite(foreground, bg);
        rows.push({ phase: label, specimen: el.getAttribute("data-testid") || el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 70) || el.id || el.tagName,
          state: el.closest("[data-state]")?.getAttribute("data-state") || label, role, foreground: fg.slice(0, 3), background: bg.slice(0, 3), ratio: ratio(fg, bg), threshold });
      };
      for (const el of document.querySelectorAll(selector)) {
        if (!el.getClientRects().length || getComputedStyle(el).visibility !== "visible") continue;
        const style = getComputedStyle(el);
        const bg = background(el);
        const outside = background(el.parentElement);
        add(el, "text", parse(style.color), bg, 4.5);
        if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && el.placeholder && !el.value) {
          add(el, "placeholder", parse(getComputedStyle(el, "::placeholder").color), bg, 4.5);
        }
        if (el.matches(".p602a-control, .p602a-menu-item")) {
          add(el, "control boundary", parse(style.borderTopColor), outside, 3);
        }
        if (el.matches(":focus-visible") && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) {
          add(el, "focus outline", parse(style.outlineColor), outside, 3);
        }
      }
      return rows;
    }, { selector, label });
    if (!result.length) throw new Error("No rendered contrast samples for " + label);
    // Emit measurements immediately, even if a later interaction or assertion fails.
    const phaseSummary = Object.fromEntries([...new Set(result.map((row) => row.role))].map((role) => {
      const samples = result.filter((row) => row.role === role);
      return [role, { count: samples.length, minimum: Math.min(...samples.map((row) => row.ratio)) }];
    }));
    console.log("P6-02a rendered contrast phase:", JSON.stringify({ viewport, reducedMotion, label, summary: phaseSummary }));
    console.log("P6-02a rendered contrast phase samples:", JSON.stringify({ viewport, reducedMotion, label, measurements: result }));
    const failed = result.filter((row) => row.ratio < row.threshold);
    if (failed.length) throw new Error("Rendered contrast below threshold: " + JSON.stringify(failed));
    return result;
  };
  await checkGeometry();
  const measurements = await measure("initial");
  const hover = page.getByTestId("hover");
  await hover.hover();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-testid="hover"]')).backgroundColor === "rgb(113, 96, 208)");
  measurements.push(...await measure("hover", '[data-testid="hover"]'));
  await hover.focus();
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => document.querySelector('[data-testid="focus"]')?.matches(":focus-visible"));
  measurements.push(...await measure("focus", '[data-testid="focus"]'));
  if (!measurements.some((row) => row.phase === "focus" && row.role === "focus outline")) throw new Error("Missing actual focus outline measurement");
  const press = page.getByTestId("press");
  await press.scrollIntoViewIfNeeded();
  const box = await press.boundingBox();
  if (!box) throw new Error("Press specimen hidden");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await press.locator("xpath=self::*[@data-pressed='true']").waitFor();
  measurements.push(...await measure("pressed", '[data-testid="press"]'));
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('[data-testid="press"]')?.textContent === "Activated");
  const checkbox = page.locator("#check-idle");
  await checkbox.focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => document.querySelector("#check-idle")?.getAttribute("aria-checked") === "true");
  const toggle = page.getByRole("button", { name: "Grid view" });
  await toggle.click();
  if (await toggle.getAttribute("aria-pressed") !== "true") throw new Error("Toggle state failed");
  const group = page.getByRole("radiogroup", { name: "View", exact: true });
  await group.getByRole("radio", { name: "One" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "radio" && document.activeElement.textContent === "Two");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-checked") === "true");
  if (await group.getByRole("radio", { name: "Two" }).getAttribute("aria-checked") !== "true" ||
      await group.getByRole("radio", { name: "One" }).getAttribute("aria-checked") !== "false") throw new Error("Toggle group keyboard selection failed");
  await page.locator("#select-idle").selectOption("b");
  if (await page.locator("#select-idle").inputValue() !== "b") throw new Error("Native select did not change");
  await page.locator("#sample-text").fill("Edited in the local fixture");
  if (await page.locator("#sample-text").inputValue() !== "Edited in the local fixture") throw new Error("Textarea did not edit");
  if (!(await page.getByRole("button", { name: "Working" }).isDisabled())) throw new Error("Pending action must be disabled");
  const disclosure = page.getByRole("button", { name: /Advanced settings/ });
  await disclosure.click();
  if (await disclosure.getAttribute("aria-expanded") !== "true") throw new Error("Disclosure did not open");
  await disclosure.click();
  if (await disclosure.getAttribute("aria-expanded") !== "false") throw new Error("Disclosure did not close");
  const menuTrigger = page.getByRole("button", { name: "More actions" });
  await menuTrigger.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await menu.waitFor();
  await checkGeometry();
  measurements.push(...await measure("open menu", ".p602a-popover [data-contrast]"));
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.textContent === "More actions");
  const dialogTrigger = page.getByRole("button", { name: "Remove sample", exact: true }).first();
  await dialogTrigger.click();
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  await page.waitForFunction(() => document.activeElement?.textContent === "Cancel");
  await checkGeometry();
  measurements.push(...await measure("open confirmation", ".p602a-dialog [data-contrast]"));
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.activeElement?.textContent === "Remove sample");
  await dialogTrigger.click();
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByText("Sample removed locally.").waitFor();
  await page.emulateMedia({ reducedMotion: reducedMotion === "reduce" ? "no-preference" : "reduce" });
  await page.waitForFunction((reduced) => document.querySelector("[data-motion-mode]")?.textContent === (reduced ? "Normal" : "Reduced"), reducedMotion === "reduce");
  await page.emulateMedia({ reducedMotion });
  const summary = Object.fromEntries([...new Set(measurements.map((row) => row.role))].map((role) => {
    const samples = measurements.filter((row) => row.role === role);
    return [role, { count: samples.length, minimum: Math.min(...samples.map((row) => row.ratio)) }];
  }));
  console.log("P6-02a rendered contrast summary:", JSON.stringify({ viewport, reducedMotion, summary }));
  console.log("P6-02a rendered contrast samples:", JSON.stringify({ viewport, reducedMotion, measurements }));
}

async function browserSmoke() {
  const { chromium } = await import("@playwright/test");
  browser = await chromium.launch({ env, ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--disable-features=OverlayScrollbar"] });
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
        page.on("console", (message) => {
          if (message.type() === "error" && /hydrat|server.rendered HTML/i.test(message.text())) errors.push(message.text());
        });
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
        await verifyShowcase(page, reducedMotion, viewport);
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
  if (smoke) {
    await browserSmoke();
    if (capture) await captureCreate({ browser, root, origin, host, port });
  }
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
