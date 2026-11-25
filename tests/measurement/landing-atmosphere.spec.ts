import { test, expect } from "@playwright/test";
import sharp from "sharp";

const origin = "http://127.0.0.1:4183";
const plates = [
  { name: "hero", widths: [1200, 1920, 3840] },
  { name: "resolve", widths: [1920, 3840] },
];
const png = (name: string) => "/landing/" + name + "-atmosphere-v2.png";
const optimized = (name: string, width: number) => "/_next/image?url=" + encodeURIComponent(png(name)) + "&w=" + width + "&q=75";

async function psnr(reference: Buffer, candidate: Buffer) {
  const a = await sharp(reference).toColourspace("srgb").removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(candidate).toColourspace("srgb").removeAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(a.info.width).toBe(b.info.width);
  expect(a.info.height).toBe(b.info.height);
  expect(a.info.channels).toBe(b.info.channels);
  expect(a.data.length).toBe(b.data.length);
  let error = 0;
  for (let i = 0; i < a.data.length; i++) error += (a.data[i]! - b.data[i]!) ** 2;
  return error === 0 ? Infinity : 10 * Math.log10(255 ** 2 / (error / a.data.length));
}

test("each real Next optimizer candidate saves encoded bytes and preserves >=38 dB PSNR", async ({ request }) => {
  const measurements = [];
  for (const plate of plates) {
    const original = await request.get(origin + png(plate.name), { maxRedirects: 0 });
    expect(original.ok()).toBe(true);
    expect(original.headers()["content-type"]).toContain("image/png");
    const bytes = await original.body();
    const source = await sharp(bytes).metadata();
    for (const width of plate.widths) {
      const response = await request.get(origin + optimized(plate.name, width), {
        headers: { Accept: "image/webp" }, maxRedirects: 0,
      });
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/webp");
      const body = await response.body();
      const meta = await sharp(body).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(Math.min(width, source.width!));
      expect(Math.abs(meta.height! - source.height! * meta.width! / source.width!)).toBeLessThanOrEqual(1);
      const reference = await sharp(bytes).resize(meta.width, meta.height, { fit: "fill" }).png().toBuffer();
      const score = await psnr(reference, body);
      const row = { plate: plate.name, width, dimensions: [meta.width, meta.height], originalBytes: bytes.length,
        optimizedBytes: body.length, savedBytes: bytes.length - body.length, psnrDb: Number.isFinite(score) ? score : "Infinity" };
      measurements.push(row);
      console.log("LANDING_IMAGE_MEASUREMENT " + JSON.stringify(row));
      expect.soft(body.length, JSON.stringify(row)).toBeLessThan(bytes.length);
      expect.soft(score, JSON.stringify(row)).toBeGreaterThanOrEqual(38);
    }
  }
  expect(measurements).toHaveLength(5);
});

test("real Landing background crop, gradient and locked arc geometry stay identical with source plates", async ({ browser }) => {
  const placeholder = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#25374b" } }).png().toBuffer();
  for (const viewport of [{ width: 1100, height: 700 }, { width: 1440, height: 900 }, { width: 2000, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: "reduce", serviceWorkers: "block" });
    try {
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        if (url.hostname === "images.unsplash.com" && route.request().resourceType() === "image")
          return route.fulfill({ contentType: "image/png", body: placeholder });
        return route.abort();
      });
      const page = await context.newPage();
      await page.goto(origin, { waitUntil: "networkidle" });
      const root = page.locator("[data-landing-experience]");
      await expect(root).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      for (const name of ["hero", "thread", "library", "resolve"]) {
        const section = page.locator('[data-landing-section="' + name + '"]');
        await section.scrollIntoViewIfNeeded();
        const snapshot = () => page.evaluate((name) => {
          const el = document.querySelector('[data-landing-section="' + name + '"]')!;
          const style = getComputedStyle(el, name === "library" ? "::before" : null);
          const rect = (el: Element) => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
          return { image: style.backgroundImage, position: style.backgroundPosition, size: style.backgroundSize,
            attachment: style.backgroundAttachment, box: rect(el), arcs: [...document.querySelectorAll('[data-quarter-arc="locked"]')].map(el => ({
              rect: rect(el), clip: getComputedStyle(el).clipPath, borderRadius: getComputedStyle(el).borderRadius,
              children: [...el.querySelectorAll("img,svg,path")].map(child => ({ box: rect(child), path: child.getAttribute("d"), clip: getComputedStyle(child).clipPath })),
            })), paths: [...document.querySelectorAll("clipPath path")].map(el => el.getAttribute("d")) };
        }, name);
        const before = await snapshot();
        expect(before.image).toContain("/_next/image?");
        await root.evaluate(el => {
          const style = (el as HTMLElement).style;
          style.setProperty("--landing-hero-atmosphere", 'url("/landing/hero-atmosphere-v2.png")');
          style.setProperty("--landing-resolve-atmosphere", 'url("/landing/resolve-atmosphere-v2.png")');
        });
        const original = await snapshot();
        expect(original.image).toContain("/landing/");
        const withoutUrls = (s: string) => s.replace(/url\("[^"]*"\)/g, "url(plate)");
        expect(withoutUrls(before.image)).toBe(withoutUrls(original.image));
        expect({ ...before, image: undefined }).toEqual({ ...original, image: undefined });
        expect(before.arcs.length).toBeGreaterThan(0);
        console.log("LANDING_GEOMETRY_MATCH " + JSON.stringify({ viewport, section: name, position: before.position, size: before.size, attachment: before.attachment, lockedArcs: before.arcs.length }));
        await root.evaluate(el => {
          (el as HTMLElement).style.removeProperty("--landing-hero-atmosphere");
          (el as HTMLElement).style.removeProperty("--landing-resolve-atmosphere");
        });
      }
    } finally { await context.close(); }
  }
});
