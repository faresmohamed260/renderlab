import sharp from "sharp";
import type { Locator, Page } from "@playwright/test";

type RGB = readonly [number, number, number];
type RGBA = readonly [number, number, number, number];
type Rect = { x: number; y: number; width: number; height: number };
export type ContrastRow = {
  state: string; sample: string; status: "PASS" | "FAIL" | "MANUAL";
  minimum: number; ratio: number | null; pixels: number; detail: string;
};
const linear = (value: number) => {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (rgb: RGB) => 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
export function contrastRatio(a: RGB, b: RGB) {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
export function compositeForeground(fg: RGBA, bg: RGB): RGB {
  const alpha = fg[3] / 255;
  return [fg[0] * alpha + bg[0] * (1 - alpha), fg[1] * alpha + bg[1] * (1 - alpha), fg[2] * alpha + bg[2] * (1 - alpha)];
}
export function measurePixels(before: Uint8Array, hidden: Uint8Array, repeat: Uint8Array,
  width: number, height: number, rects: Rect[], fg: RGBA) {
  if (width <= 0 || height <= 0 || [before, hidden, repeat].some(bytes => bytes.length !== width * height * 3)) {
    throw Error("Unexpected RGB viewport dimensions");
  }
  let ratio = Infinity, pixels = 0, unstable = false;
  const seen = new Set<number>();
  for (const r of rects) {
    const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y));
    const x1 = Math.min(width, Math.ceil(r.x + r.width)), y1 = Math.min(height, Math.ceil(r.y + r.height));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 3;
      if (seen.has(i)) continue;
      seen.add(i);
      const bg: RGB = [hidden[i], hidden[i + 1], hidden[i + 2]];
      if (bg.some((v, c) => Math.abs(v - repeat[i + c]) > 3)) unstable = true;
      // Only changed glyph-paint pixels; do not infer background from ancestor CSS.
      if (!bg.some((v, c) => Math.abs(v - before[i + c]) > 3)) continue;
      pixels++;
      ratio = Math.min(ratio, contrastRatio(compositeForeground(fg, bg), bg));
    }
  }
  return { ratio: pixels ? ratio : null, pixels, unstable };
}
const raw = async (page: Page) => {
  const screenshot = await page.screenshot({ animations: "allow", scale: "css" });
  return sharp(screenshot).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
};

export async function collectTextContrast(page: Page, locator: Locator, state: string, sample: string): Promise<ContrastRow> {
  const manual = (detail: string, minimum = 4.5): ContrastRow => ({ state, sample, status: "MANUAL", minimum, ratio: null, pixels: 0, detail });
  if (await locator.count() !== 1 || !await locator.isVisible()) return manual("Missing, ambiguous or hidden target");
  await locator.scrollIntoViewIfNeeded();
  const info = await locator.evaluate(element => {
    const style = getComputedStyle(element);
    const minimum = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.667 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
    const unavailable = (reason: string) => ({ minimum, reason, rects: [], fg: null, originalStyle: element.getAttribute("style") });
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const s = getComputedStyle(ancestor);
      // Actual backdrop-filter is supported through screenshot sampling.
      if (Number(s.opacity) !== 1 || s.filter !== "none" || s.mixBlendMode !== "normal") return unavailable("Group opacity/filter/blend requires manual pixel review");
    }
    if (style.textShadow !== "none" || style.backgroundClip.includes("text") || parseFloat(style.webkitTextStrokeWidth) > 0) return unavailable("Complex glyph paint requires manual review");
    const rects = [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
      .flatMap(node => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return [...range.getClientRects()].map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
      }).filter(rect => rect.width > 0 && rect.height > 0);
    if (!rects.length || rects.some(r => r.x < 0 || r.y < 0 || r.x + r.width > innerWidth || r.y + r.height > innerHeight)) return unavailable("No fully visible direct text range; nested/input/icon or clipped content requires separate review");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return unavailable("No color-conversion context");
    ctx.fillStyle = style.webkitTextFillColor || style.color;
    ctx.fillRect(0, 0, 1, 1);
    const data = [...ctx.getImageData(0, 0, 1, 1).data];
    if (!data[3]) return unavailable("Transparent foreground requires manual review");
    return { minimum, reason: null, rects, fg: data as unknown as RGBA, originalStyle: element.getAttribute("style") };
  });
  if (!info.fg) return manual(info.reason ?? "Unresolved foreground", info.minimum);
  const before = await raw(page);
  let hidden: Awaited<ReturnType<typeof raw>>, repeat: Awaited<ReturnType<typeof raw>>;
  try {
    await locator.evaluate(element => {
      if (!(element instanceof HTMLElement)) throw Error("Expected HTML text target");
      element.style.setProperty("-webkit-text-fill-color", "transparent", "important");
    });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    hidden = await raw(page);
    repeat = await raw(page);
  } finally {
    await locator.evaluate((element, original) => {
      if (original === null) element.removeAttribute("style");
      else element.setAttribute("style", original);
    }, info.originalStyle);
  }
  const { width, height, channels } = hidden.info;
  if (channels !== 3 || [before.info, repeat.info].some(image => image.width !== width || image.height !== height || image.channels !== 3)) return manual("Viewport or pixel format changed", info.minimum);
  const measured = measurePixels(before.data, hidden.data, repeat.data, width, height, info.rects, info.fg);
  if (measured.unstable || measured.ratio === null) return manual(measured.unstable ? "Backdrop changed between hidden captures" : "No changed glyph pixels", info.minimum);
  return { state, sample, minimum: info.minimum, ratio: measured.ratio, pixels: measured.pixels,
    status: measured.ratio >= info.minimum ? "PASS" : "FAIL", detail: "Minimum across changed glyph pixels over actual rendered background" };
}
