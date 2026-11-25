import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectTextContrast, collectControlBoundary, type ContrastRow } from "./composited-contrast";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";

const origin = "http://127.0.0.1:4173";
const output = path.resolve("artifacts/phase6-component-review");
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const key = viewport.width + "x" + viewport.height + "-" + reducedMotion;
    test("composited text contrast " + key, async ({ browser }) => {
      test.setTimeout(180_000);
      const rows: ContrastRow[] = [], unexpected: string[] = [], errors: string[] = [];
      await mkdir(output, { recursive: true });
      const context = await browser.newContext({
        viewport, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion, serviceWorkers: "block",
        extraHTTPHeaders: { "x-renderlab-fixture-shell": "create" },
      });
      await context.route("**/*", async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== origin || request.method() !== "GET") {
          unexpected.push(request.method() + " " + url.origin + url.pathname);
          return route.abort();
        }
        if (url.pathname === "/api/generation/jobs" && !url.search) return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
        if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
        if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content" && !url.search) return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
        if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
        if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
          unexpected.push("GET " + url.pathname); return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => {
        if (response.status() >= 400) {
          const detail = "HTTP " + response.status() + " " + response.request().method() + " " + response.url() + " (" + response.request().resourceType() + ")";
          errors.push(detail);
          console.error("REVIEW HTTP ERROR", detail);
        }
      });

      const collect = async (state: string, sample: string, locator: ReturnType<typeof page.locator>) => {
        rows.push(await collectTextContrast(page, locator, state, sample));
      };
      try {
        await page.goto("/review");
        await expect(page.getByRole("heading", { name: "Shared primitive review" })).toBeVisible();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const specimen = page.getByRole("region", { name: "Shared primitive review" });
        for (const label of ["Primary", "Secondary", "Ghost", "Disabled", "Toggle", "Review popover", "Title", "Prompt", "Selected", "Fixture data only.", "Synthetic status message."]) {
          await collect("primitives", label, specimen.getByText(label, { exact: true }));
        }
        for (const [name, field] of [["Input", specimen.locator("#review-input")], ["Textarea", specimen.locator("#review-prompt")]] as const) {
          const value = await field.inputValue();
          rows.push(await collectTextContrast(page, field, "control-text", name + " value", "value"));
          await field.fill("");
          await field.blur();
          await page.waitForTimeout(250);
          // Capture the actual control state around the failing sample without
          // changing the collector, its thresholds, or the rendered styles.
          const evidence = () => field.evaluate(el => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            const pseudo = getComputedStyle(el, "::placeholder");
            return {
              rect: [rect.x, rect.y, rect.width, rect.height], viewport: [innerWidth, innerHeight],
              scroll: [scrollX, scrollY, el.scrollTop, el.scrollLeft],
              active: document.activeElement?.id || document.activeElement?.tagName,
              focused: el.matches(":focus"), value: (el as HTMLInputElement | HTMLTextAreaElement).value,
              background: style.backgroundColor, color: pseudo.color, textFill: pseudo.webkitTextFillColor,
              animations: el.getAnimations({ subtree: true }).map(animation => ({ state: animation.playState, time: animation.currentTime })),
              ancestors: [...(function* () { for (let node = el.parentElement; node; node = node.parentElement) yield node; })()].map(node => ({ tag: node.tagName, top: node.scrollTop, left: node.scrollLeft })),
            };
          });
          await expect(field).not.toBeFocused();
          const beforePlaceholder = await evidence();
          const placeholder = await collectTextContrast(page, field, "control-text", name + " placeholder", "placeholder");
          rows.push(placeholder);
          if (placeholder.status === "MANUAL") {
            console.log("PLACEHOLDER CAPTURE DIAGNOSTIC", key, name, JSON.stringify({ before: beforePlaceholder, after: await evidence(), row: placeholder }));
          }
          await field.fill(value);
          await field.blur();
          await page.waitForTimeout(250);
          rows.push(await collectControlBoundary(page, field, "control-boundary", name + " boundary", false));
          await page.keyboard.press("Tab");
          await field.focus();
          await expect(field).toBeFocused();
          await page.waitForTimeout(250);
          rows.push(await collectControlBoundary(page, field, "control-boundary", name + " focus outline", true));
          await field.blur();
        }
        const popover = specimen.getByRole("button", { name: "Review popover", exact: true });
        await popover.press("Enter");
        await expect(page.getByText("Real shared popover", { exact: true })).toBeVisible();
        await page.waitForTimeout(800);
        await collect("popover", "Real shared popover", page.getByText("Real shared popover", { exact: true }));
        await collect("popover", "Popover action", page.getByText("Popover action", { exact: true }));
        await page.keyboard.press("Escape");
        // Radix restores focus when its exit animation unmounts. Do not send
        // the next trusted key while that pending focus restoration can blur
        // and dismiss the real shell disclosure.
        await expect(page.getByText("Real shared popover", { exact: true })).toHaveCount(0);
        await expect(popover).toBeFocused();
        const trigger = page.locator("header button[aria-expanded]:visible").first();
        await expect(trigger).toBeVisible();
        await trigger.focus();
        await expect(trigger).toBeFocused();
        if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.press("Enter");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await page.waitForTimeout(800);
        for (const label of ["Create", "Library", "Activity", "Settings"]) {
          const candidates = page.getByRole("link", { name: label, exact: true });
          if (await candidates.count() === 1 && await candidates.isVisible()) await collect("shell", label, candidates);
        }
        await page.keyboard.press("Escape");
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await page.goto("/create");
        await expect(page.getByRole("region", { name: "Create with FIBO" })).toBeVisible();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const heading = page.getByRole("heading", {name:"Image setup", exact:true});
        await expect(heading).toBeVisible();
        await collect("create", "Create workspace heading (Image setup)", heading);
        // Sample the actual production contrast/reduced-transparency fallback,
        // not an injected stylesheet. Arbitrary future generated art is unbounded.
        const mediaEvidence = () => page.evaluate(() => {
          const style = getComputedStyle(document.documentElement);
          const token = (name: string) => style.getPropertyValue(name).trim();
          return {
            contrastMore: matchMedia("(prefers-contrast: more)").matches,
            reducedTransparency: matchMedia("(prefers-reduced-transparency: reduce)").matches,
            material: token("--rl-material-panel"),
            atmosphere: token("--rl-atmosphere-scene"),
            panel: token("--rl-surface-panel"),
            layered: token("--rl-surface-panel-layered"),
          };
        });
        const normalMedia = await mediaEvidence();
        expect(normalMedia.contrastMore).toBe(false);
        expect(normalMedia.atmosphere).not.toBe("none");
        const cdp = await context.newCDPSession(page);
        try {
          await cdp.send("Emulation.setEmulatedMedia", { features: [{name:"prefers-contrast",value:"more"},{name:"prefers-reduced-transparency",value:"reduce"},{name:"prefers-reduced-motion",value:reducedMotion}] });
          await expect.poll(mediaEvidence).toMatchObject({ contrastMore: true, material: "none", atmosphere: "none", layered: normalMedia.panel });
          const fallbackMedia = await mediaEvidence();
          console.log("CONTRAST FALLBACK MEDIA", key, JSON.stringify({ normal: normalMedia, fallback: fallbackMedia }));
          await page.waitForTimeout(300);
          await collect("fallback", "Create heading, high contrast / reduced transparency", heading);
        } finally { await cdp.detach(); }
        // Keep an explicit limit rather than claiming a sample covers every artwork.
        rows.push({state:"manual",sample:"Arbitrary future artwork",status:"MANUAL",minimum:4.5,ratio:null,pixels:0,detail:"Unbounded artwork; no universal pixel ratio. Representative rendered gradient / fallback heading measured separately."});
        expect(rows.filter(row => row.state === "control-text")).toHaveLength(4);
        expect(rows.filter(row => row.state === "control-boundary")).toHaveLength(4);
        expect(rows.filter(row => row.state === "create" || row.state === "fallback")).toHaveLength(2);
        // A diagnostic FAIL is real evidence; MANUAL or missing pixels are not.
        const measured = rows.filter(row => ["control-text", "control-boundary", "create", "fallback"].includes(row.state));
        expect(measured, "All ten added samples must yield actual numeric pixel evidence").toHaveLength(10);
        for (const row of measured) {
          expect(row.status, row.sample).not.toBe("MANUAL");
          expect(row.ratio !== null && Number.isFinite(row.ratio) && row.ratio >= 1, row.sample).toBe(true);
          expect(row.pixels, row.sample).toBeGreaterThan(0);
        }
        expect(rows.filter(row => row.state === "primitives" && row.ratio !== null).length, "Must have actual measurements").toBeGreaterThanOrEqual(5);
        expect(rows.filter(row => row.state === "popover" && row.ratio !== null).length, "Must measure rendered overlay").toBeGreaterThan(0);
      } finally {
        await context.close();
        console.log("PHASE6 COMPOSITED CONTRAST " + key + " (diagnostic; no design approval)");
        console.table(rows.map(row => ({ state: row.state, sample: row.sample, status: row.status, ratio: row.ratio?.toFixed(2) ?? "manual",
          minimum: row.minimum, pixels: row.pixels, detail: row.detail })));
        await writeFile(path.join(output, "contrast-" + key + ".json"), JSON.stringify({ key, sourceSha: process.env.REVIEW_SOURCE_SHA ?? "local-unverified",
          method: "actual rendered background pixels; glyph footprint; advisory baseline", rows, unexpected, errors }, null, 2) + "\n");
      }
      expect(unexpected, "No unknown API or external requests").toEqual([]);
      expect(errors, "No browser errors").toEqual([]);
    });
  }
}
