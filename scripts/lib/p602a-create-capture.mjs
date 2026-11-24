import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const compositions = ["empty", "typing", "references", "advanced", "generating", "result", "error", "failed"];
const phases = { empty: "draft", typing: "draft", references: "draft", advanced: "draft", generating: "active", result: "result", error: "error", failed: "failed" };
const prefs = ["no-preference", "reduce"];
const viewportCases = [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 844 }, { width: 195, height: 844 }];
const target = "[data-create-composition]";
const prompt = "#p602a-prompt";

function invariant(condition, message) { if (!condition) throw new Error("Create evidence: " + message); }
const digest = async (filename) => createHash("sha256").update(await readFile(filename)).digest("hex");
const button = (page, name) => page.getByRole("button", { name, exact: true });
const phase = (page, value) => page.waitForFunction((value) => document.querySelector("[data-create-composition]")?.getAttribute("data-create-phase") === value, value);
const job = (page, value) => page.waitForFunction((value) => document.querySelector("[data-create-composition]")?.getAttribute("data-job-status") === value, value);

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.allSettled(document.getAnimations().filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().endTime)).map((animation) => animation.finished));
  });
  await page.waitForFunction(() => {
    const close = (el, name, expected) => Math.abs(Number(getComputedStyle(el).getPropertyValue(name).trim()) - expected) < 0.005;
    const advanced = document.querySelector(".p602a-advanced");
    const result = document.querySelector(".p602a-result-reveal");
    return (!advanced || !advanced.getClientRects().length || close(advanced, "--p602a-disclosure-offset", 0)) &&
      (!result || close(result, "--p602a-reveal", 1)) &&
      [...document.querySelectorAll("[data-reference]")].every((el) => close(el, "--p602a-drag-offset", 0));
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function reset(page, name) {
  await page.locator("#p602a-fixture").selectOption(name);
  await button(page, "Reset fixture").click();
  await page.waitForFunction((name) => document.querySelector("[data-create-composition]")?.getAttribute("data-create-composition") === name, name);
  await phase(page, phases[name]);
  if (name === "generating") await job(page, "running");
  await settle(page);
  await page.mouse.move(0, 0);
}

async function geometry(page, name) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const visible = (el) => el.getClientRects().length && getComputedStyle(el).visibility === "visible";
    const gutter = window.innerWidth - root.clientWidth;
    const select = ".p602a-create-page,.p602a-fixture-controls,.p602a-composition,.p602a-create-grid,.p602a-stage,.p602a-composer,.p602a-field,.p602a-row,.p602a-stack,.p602a-advanced,.p602a-references,.p602a-reference,.p602a-reference-text,.p602a-create-popover";
    const elements = [...document.querySelectorAll(select)].filter(visible);
    const overflow = elements.filter((el) => el.scrollWidth > el.clientWidth).map((el) => ({ name: el.className, scroll: el.scrollWidth, client: el.clientWidth }));
    const controls = [...document.querySelectorAll(".p602a-create-page .p602a-control,.p602a-create-popover .p602a-control")].filter(visible);
    const invalidControls = controls.flatMap((el) => {
      const box = el.getBoundingClientRect();
      return box.width < 24 || box.height < 24 || box.left < -0.5 || box.right > root.clientWidth + 0.5
        ? [{ label: el.getAttribute("aria-label") || el.id || el.textContent, width: box.width, height: box.height, left: box.left, right: box.right }] : [];
    });
    const range = document.querySelector("#create-preview-steps");
    let steps = null;
    if (range && visible(range)) {
      const box = range.getBoundingClientRect();
      const ancestors = [];
      for (let node = range.parentElement; node && node !== document.body; node = node.parentElement) {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const left = rect.left + parseFloat(style.borderLeftWidth);
        const right = rect.right - parseFloat(style.borderRightWidth);
        ancestors.push({ name: node.id || node.className || node.tagName, overflow: node.scrollWidth - node.clientWidth, left: box.left - left, right: right - box.right });
      }
      steps = { width: box.width, scroll: range.scrollWidth, client: range.clientWidth, ancestors };
    }
    return { viewport: window.innerWidth, usable: root.clientWidth, gutter, documentOverflow: root.scrollWidth - root.clientWidth, controls: controls.length, invalidControls, overflow, steps };
  });
  console.log("P6-02a Create geometry:", JSON.stringify({ state: name, ...result }));
  invariant(result.gutter > 0, name + ": scrollbar gutter is zero");
  invariant(result.documentOverflow <= 0 && !result.overflow.length && !result.invalidControls.length, name + ": horizontal overflow or small/clipped control");
  if (result.steps) {
    invariant(result.steps.scroll <= result.steps.client, name + ": range itself overflows");
    invariant(result.steps.ancestors.every((a) => a.overflow <= 0 && a.left >= -0.5 && a.right >= -0.5), name + ": steps baseline overflow or affected ancestor");
  }
  return result;
}

async function contrast(page, label) {
  const rows = await page.evaluate((label) => {
    const parse = (value) => {
      const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/.exec(value);
      if (!match) throw new Error("Unsupported computed color: " + value);
      return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])];
    };
    const blend = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
    const background = (el) => {
      const layers = [];
      for (let node = el; node; node = node.parentElement) layers.unshift(parse(getComputedStyle(node).backgroundColor));
      return layers.reduce((bg, fg) => blend(fg, bg), [0, 0, 0, 1]);
    };
    const lum = (rgb) => rgb.slice(0, 3).map((x) => x / 255).map((x) => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const result = [];
    const add = (el, role, fg, bg, threshold) => {
      const rendered = blend(fg, bg);
      result.push({ phase: label, specimen: el.getAttribute("aria-label") || el.id || el.textContent?.trim().slice(0, 80) || el.tagName, role, foreground: rendered.slice(0, 3), background: bg.slice(0, 3), ratio: ratio(rendered, bg), threshold });
    };
    for (const el of document.querySelectorAll("[data-create-composition] [data-contrast], .p602a-create-popover [data-contrast]")) {
      if (!el.getClientRects().length || getComputedStyle(el).visibility !== "visible") continue;
      const style = getComputedStyle(el), bg = background(el), outside = background(el.parentElement);
      if (!(el instanceof HTMLInputElement && el.type === "range")) add(el, "text", parse(style.color), bg, 4.5);
      if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.placeholder && !el.value) add(el, "placeholder", parse(getComputedStyle(el, "::placeholder").color), bg, 4.5);
      if (el.matches(".p602a-control")) {
        add(el, "boundary outside", parse(style.borderTopColor), outside, 3);
        add(el, "boundary inside", parse(style.borderTopColor), bg, 3);
      }
      if (el.matches(":focus-visible") && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) add(el, "focus outline", parse(style.outlineColor), outside, 3);
    }
    return result;
  }, label);
  invariant(rows.length > 0, "missing rendered contrast samples " + label);
  const failed = rows.filter((row) => row.ratio < row.threshold);
  const summary = Object.fromEntries([...new Set(rows.map((row) => row.role))].map((role) => {
    const items = rows.filter((row) => row.role === role);
    return [role, { count: items.length, minimum: Math.min(...items.map((row) => row.ratio)) }];
  }));
  console.log("P6-02a Create contrast:", JSON.stringify({ label, summary, failures: failed }));
  invariant(!failed.length, "rendered contrast below threshold " + JSON.stringify(failed));
  return rows;
}

async function exercise(page, name, reducedMotion, rows, mark) {
  const order = () => page.locator("[data-reference]").evaluateAll((els) => els.map((el) => el.getAttribute("data-reference")));
  const generate = button(page, "Generate");
  switch (name) {
    case "empty":
      invariant(await generate.isDisabled(), "empty fixture permits generate");
      await page.locator(prompt).focus();
      await page.keyboard.type("A local sketch");
      invariant(await generate.isEnabled(), "typing did not enable generate");
      await settle(page);
      rows.push(...await contrast(page, "typing focus"));
      break;
    case "typing":
      await page.locator(prompt).focus();
      await page.keyboard.press("End");
      await page.keyboard.type(" Natural light.");
      await page.keyboard.press("Control+Enter");
      await phase(page, "active");
      await job(page, "accepted");
      invariant(await button(page, "Rendering").isDisabled(), "duplicate generation available");
      await button(page, "Advance fixture").click(); await job(page, "queued");
      mark("queued");
      await button(page, "Advance fixture").click(); await job(page, "running");
      mark("running");
      await button(page, "Advance fixture").click(); await phase(page, "result");
      mark("result from explicit event");
      await settle(page);
      rows.push(...await contrast(page, "typing to result"));
      break;
    case "references": {
      invariant((await order()).join(",") === "sample-a,sample-b", "initial reference identities");
      await button(page, "Attach sample image").click();
      invariant((await order()).length === 3, "attachment missing");
      const move = button(page, "Move Desert architecture later");
      await move.focus(); await page.keyboard.press("Space");
      invariant((await order()).join(",") === "sample-b,sample-a,sample-c", "keyboard reorder");
      invariant((await page.locator(prompt).inputValue()).includes("arch from @image2"), "alias not remapped");
      const grip = button(page, "Drag Desert architecture");
      const other = page.locator('[data-reference="sample-b"] .p602a-art');
      await grip.evaluate((el) => {
        const card = el.closest("[data-reference]");
        const prior = card?.previousElementSibling;
        if (prior) prior.scrollIntoView({ block: "center" });
      });
      const start = await grip.boundingBox(), end = await other.boundingBox();
      invariant(start && end, "missing drag geometry");
      const y = end.y + Math.min(end.height / 2, 32), x = end.x + end.width / 2;
      const sx = start.x + start.width / 2, sy = start.y + start.height / 2;
      invariant(sy >= 0 && sy < page.viewportSize().height && y >= 0 && y < page.viewportSize().height, "drag endpoints outside viewport");
      await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(x, y, { steps: 10 }); await page.mouse.up();
      invariant((await order()).join(",") === "sample-a,sample-b,sample-c", "direct drag reorder");
      await settle(page);
      const remove = button(page, "Remove Warm evening sky");
      await remove.click();
      invariant((await order()).join(",") === "sample-a,sample-b", "reference removal");
      await button(page, "Replace Soft sandstone texture").click();
      invariant((await order()).join(",") === "sample-a,sample-c", "reference replacement");
      await settle(page);
      rows.push(...await contrast(page, "references reordered"));
      break;
    }
    case "advanced": {
      const advanced = page.getByRole("button", { name: /^Advanced / });
      await advanced.click();
      invariant(await advanced.getAttribute("aria-expanded") === "false", "disclosure did not close");
      await advanced.focus(); await page.keyboard.press("Space");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await settle(page);
      invariant(await advanced.getAttribute("aria-expanded") === "true", "disclosure lost state during motion preference switch");
      await page.emulateMedia({ reducedMotion });
      const queue = button(page, "Queue");
      await queue.focus(); await page.keyboard.press("Enter");
      await page.getByRole("dialog", { name: "queue" }).waitFor();
      await settle(page);
      await geometry(page, "advanced popover");
      rows.push(...await contrast(page, "queue open"));
      await page.keyboard.press("Escape");
      await page.getByRole("dialog", { name: "queue" }).waitFor({ state: "hidden" });
      invariant(await queue.evaluate((el) => document.activeElement === el), "popover focus did not return");
      await page.locator("#create-preview-steps").focus();
      await page.keyboard.press("ArrowRight");
      invariant(await generate.isDisabled(), "unsupported step count did not block generation");
      await page.keyboard.press("ArrowLeft");
      invariant(await generate.isEnabled(), "supported step count did not restore generation");
      await settle(page);
      rows.push(...await contrast(page, "advanced range focus"));
      break;
    }
    case "generating":
      await button(page, "Cancel render").click(); await job(page, "cancelling");
      invariant(await button(page, "Cancelling…").isDisabled(), "duplicate cancellation available");
      await button(page, "Advance fixture").click(); await phase(page, "draft");
      invariant((await page.locator(prompt).inputValue()).length > 0, "cancellation lost recipe");
      await reset(page, "generating");
      await button(page, "Fail fixture").click(); await phase(page, "failed");
      invariant(await page.getByRole("img", { name: "Synthetic sandstone arch result" }).count() === 0, "failed job fabricated a result");
      break;
    case "result": {
      await button(page, "Compare source and result").click();
      await page.getByRole("region", { name: "Media stage" }).getByRole("img", { name: "Desert architecture" }).waitFor();
      await button(page, "Compare source and result").click();
      await page.getByRole("img", { name: "Synthetic sandstone arch result" }).waitFor();
      await button(page, "History · 1").click();
      await settle(page); await geometry(page, "populated history");
      await button(page, "Reuse settings").click(); await phase(page, "draft");
      invariant((await page.locator(prompt).inputValue()).length > 0, "reuse lost settings");
      break;
    }
    case "error":
      const recoverable = page.getByRole("region", { name: "Image composer" }).getByRole("alert");
      invariant(await recoverable.count() === 1 && await recoverable.isVisible(), "recoverable error missing or duplicated in composer");
      invariant((await recoverable.textContent()).includes("Could not submit the sample."), "wrong recoverable error message");
      invariant((await page.locator(prompt).inputValue()).length > 0, "error lost prompt");
      await generate.click(); await phase(page, "active"); await job(page, "accepted");
      break;
    case "failed":
      const terminal = page.getByRole("region", { name: "Media stage" }).getByRole("alert");
      invariant(await terminal.count() === 1 && await terminal.isVisible(), "terminal failure missing or duplicated in stage");
      invariant((await terminal.textContent()).includes("No result was saved."), "wrong terminal failure message");
      invariant(await page.getByRole("img", { name: "Synthetic sandstone arch result" }).count() === 0, "terminal failure fabricated media");
      await button(page, "Reuse settings").click(); await phase(page, "draft");
      invariant((await page.locator(prompt).inputValue()).length > 0, "failed reuse lost recipe");
      break;
  }
  await settle(page);
  mark(name + " interaction complete");
}

export async function captureCreate({ browser, root, origin, host, port }) {
  const output = await mkdtemp(path.join(root, "artifacts", "p602a-create-evidence-"));
  const frames = [], sessions = [], geometryRows = [], contrastRows = [];
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  for (const viewport of viewportCases) {
    for (const reducedMotion of prefs) {
      const recorded = viewport.width >= 390;
      const mode = reducedMotion === "reduce" ? "reduced" : "normal";
      const key = viewport.width + "x" + viewport.height + "-" + mode;
      const unexpected = [], errors = [];
      const raw = path.join(output, "raw-" + key);
      if (recorded) await mkdir(raw, { recursive: true });
      const context = await browser.newContext({ viewport, reducedMotion, deviceScaleFactor: 1, serviceWorkers: "block", ...(recorded ? { recordVideo: { dir: raw, size: viewport } } : {}) });
      const milestones = [], start = performance.now();
      const mark = (event) => milestones.push({ event, elapsedMs: Math.round(performance.now() - start) });
      let video;
      try {
        await context.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (url.origin === origin && (["/", "/compose", "/favicon.ico", "/p602a-artwork.svg", "/p602a-source.svg"].includes(url.pathname) || url.pathname.startsWith("/_next/"))) await route.continue();
          else { unexpected.push(url.origin + url.pathname); await route.abort(); }
        });
        await context.routeWebSocket("**/*", (socket) => {
          const url = new URL(socket.url());
          if (url.origin === "ws://" + host + ":" + port && url.pathname.startsWith("/_next/")) socket.connectToServer();
          else { unexpected.push(url.origin + url.pathname); socket.close(); }
        });
        const page = await context.newPage();
        video = page.video();
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => { if (message.type() === "error" && /hydrat|server.rendered HTML/i.test(message.text())) errors.push(message.text()); });
        page.on("response", (response) => { if (response.status() >= 400 && /\/p602a-(?:artwork|source)\.svg$/.test(response.url())) errors.push("Artwork response " + response.status()); });
        await page.goto(origin + "/compose", { waitUntil: "load" });
        await page.locator(target).waitFor();
        invariant(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches) === (reducedMotion === "reduce"), key + ": motion preference not applied");
        for (const name of compositions) {
          await reset(page, name);
          mark(name + " settled frame");
          geometryRows.push({ key, state: name, ...(await geometry(page, name)) });
          const samples = await contrast(page, name);
          if (recorded) {
            const filename = key + "-" + name + ".png";
            await page.locator(target).screenshot({ path: path.join(output, filename), animations: "allow" });
            frames.push({ key, state: name, file: filename, sha256: await digest(path.join(output, filename)) });
            await exercise(page, name, reducedMotion, samples, mark);
          } else if (name === "advanced") {
            await button(page, "Queue").click();
            await page.getByRole("dialog", { name: "queue" }).waitFor();
            await settle(page); geometryRows.push({ key, state: "advanced popover", ...(await geometry(page, "advanced popover")) });
            samples.push(...await contrast(page, "advanced popover"));
            await page.keyboard.press("Escape");
          } else if (name === "references") {
            await button(page, "Attach sample image").click();
            await button(page, "Attach sample image").click();
            await settle(page); geometryRows.push({ key, state: "four references", ...(await geometry(page, "four references")) });
          } else if (name === "result") {
            await button(page, "History · 1").click();
            await settle(page); geometryRows.push({ key, state: "populated history", ...(await geometry(page, "populated history")) });
          }
          contrastRows.push(...samples.map((row) => ({ key, ...row })));
          invariant(!unexpected.length && !errors.length, key + ": unexpected browser activity " + [...unexpected, ...errors].join("; "));
        }
      } finally {
        await context.close();
      }
      invariant(!unexpected.length && !errors.length, key + ": unexpected browser activity during shutdown");
      if (recorded) {
        invariant(video, key + ": missing recording");
        const filename = key + ".webm";
        await video.saveAs(path.join(output, filename));
        await video.delete();
        const size = (await stat(path.join(output, filename))).size;
        invariant(size > 0, key + ": empty video");
        sessions.push({ key, file: filename, sha256: await digest(path.join(output, filename)), bytes: size, milestones });
      }
      console.log("P6-02a Create context passed:", key);
    }
  }
  invariant(frames.length === 32 && sessions.length === 4 && geometryRows.length >= 64 && contrastRows.length > 0, "incomplete capture matrix");
  const evidence = { sourceSha: sha, browser: browser.version(), deviceScaleFactor: 1, viewports: viewportCases, motionPreferences: prefs, frames, sessions, geometry: geometryRows, contrast: contrastRows };
  await writeFile(path.join(output, "capture-manifest.json"), JSON.stringify(evidence, null, 2) + "\n");
  console.log("P6-02a Create capture complete:", JSON.stringify({ sourceSha: sha, frames: frames.length, videos: sessions.length, geometry: geometryRows.length, contrast: contrastRows.length, minRatio: Math.min(...contrastRows.map((r) => r.ratio)), output: path.basename(output) }));
}
