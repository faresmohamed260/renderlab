import sharp from "sharp";
import type { Locator, Page } from "@playwright/test";

type RGB = readonly [number, number, number];
type RGBA = readonly [number, number, number, number];
type Rect = { x: number; y: number; width: number; height: number };
type Point = [number, number];
type PixelPair = { a: Point; b: Point };
type PixelEvidence = PixelPair & { edge: string; kind: string; painted: RGB; adjacent: RGB; ratio: number };
export type ContrastRow = {
  state: string; sample: string; status: "PASS" | "FAIL" | "MANUAL";
  minimum: number; ratio: number | null; pixels: number; detail: string;
  pixelEvidence?: { scale: number; viewport: [number, number]; borderWidths: number[]; outlineWidth: number; outlineOffset: number; pairs: PixelEvidence[]; interior: PixelEvidence[] };
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

export async function collectTextContrast(page: Page, locator: Locator, state: string, sample: string, control?: "value" | "placeholder"): Promise<ContrastRow> {
  const manual = (detail: string, minimum = 4.5): ContrastRow => ({ state, sample, status: "MANUAL", minimum, ratio: null, pixels: 0, detail });
  if (await locator.count() !== 1 || !await locator.isVisible()) return manual("Missing, ambiguous or hidden target");
  await locator.scrollIntoViewIfNeeded();
  const info = await locator.evaluate((element, control) => {
    const style = getComputedStyle(element, control === "placeholder" ? "::placeholder" : null);
    const minimum = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.667 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
    const unavailable = (reason: string) => ({ minimum, reason, rects: [], fg: null, originalStyle: element.getAttribute("style") });
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const s = getComputedStyle(ancestor);
      // Actual backdrop-filter is supported through screenshot sampling.
      if (Number(s.opacity) !== 1 || s.filter !== "none" || s.mixBlendMode !== "normal") return unavailable("Group opacity/filter/blend requires manual pixel review");
    }
    if (style.textShadow !== "none" || style.backgroundClip.includes("text") || parseFloat(style.webkitTextStrokeWidth) > 0) return unavailable("Complex glyph paint requires manual review");
    const rects = control && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
      ? (() => {
          if (control === "value" ? !element.value : element.value || !element.placeholder) return [];
          const r = element.getBoundingClientRect(), box = getComputedStyle(element);
          const left = parseFloat(box.borderLeftWidth) + parseFloat(box.paddingLeft);
          const right = parseFloat(box.borderRightWidth) + parseFloat(box.paddingRight);
          const top = parseFloat(box.borderTopWidth) + parseFloat(box.paddingTop);
          const bottom = parseFloat(box.borderBottomWidth) + parseFloat(box.paddingBottom);
          return [{ x: r.x + left, y: r.y + top, width: r.width - left - right, height: r.height - top - bottom }];
        })()
      : [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
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
    if (control === "placeholder") ctx.globalAlpha = Number(style.opacity);
    ctx.fillRect(0, 0, 1, 1);
    const data = [...ctx.getImageData(0, 0, 1, 1).data];
    if (!data[3]) return unavailable("Transparent foreground requires manual review");
    return { minimum, reason: null, rects, fg: data as unknown as RGBA, originalStyle: element.getAttribute("style") };
  }, control);
  if (!info.fg) return manual(info.reason ?? "Unresolved foreground", info.minimum);
  const before = await raw(page);
  let hidden: Awaited<ReturnType<typeof raw>>, repeat: Awaited<ReturnType<typeof raw>>;
  let placeholderStyle: Awaited<ReturnType<Page["addStyleTag"]>> | undefined;
  try {
    if (control === "placeholder") {
      await locator.evaluate(element => element.setAttribute("data-review-hide-placeholder", ""));
      placeholderStyle = await page.addStyleTag({ content: "[data-review-hide-placeholder]::placeholder { -webkit-text-fill-color: transparent !important; color: transparent !important; }" });
    } else await locator.evaluate(element => {
      if (!(element instanceof HTMLElement)) throw Error("Expected HTML text target");
      element.style.setProperty("-webkit-text-fill-color", "transparent", "important");
    });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    hidden = await raw(page);
    repeat = await raw(page);
  } finally {
    if (placeholderStyle) await placeholderStyle.evaluate(node => {
      node.parentNode?.removeChild(node);
    });
    if (control === "placeholder") await locator.evaluate(element => element.removeAttribute("data-review-hide-placeholder"));
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

// Sample straight mid-edge pixels, avoiding rounded corners and antialiasing.
// For a focus outline compare the painted ring against its adjacent exterior
// and interior pixels. This is a finite representative sample, not a proof
// for every point of a control perimeter or every possible artwork.
export function measureBoundarySamples(data: Uint8Array, width: number, height: number, pairs: { a: [number, number]; b: [number, number] }[]) {
  const rgb = ([x,y]: [number,number]): RGB | null => {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= width || y >= height) return null;
    const i = (y * width + x) * 3;
    return [data[i],data[i+1],data[i+2]];
  };
  const ratios = pairs.map(({a,b}) => { const x=rgb(a),y=rgb(b); return x && y ? contrastRatio(x,y) : null; });
  return { ratio: ratios.length && ratios.every(x => x !== null) ? Math.min(...ratios as number[]) : null, pixels: ratios.filter(x=>x!==null).length };
}
export async function collectControlBoundary(page: Page, locator: Locator, state: string, sample: string, focused: boolean): Promise<ContrastRow> {
  await locator.scrollIntoViewIfNeeded();
  const info = await locator.evaluate(el => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return {
      x: r.x, y: r.y, w: r.width, h: r.height, outline: parseFloat(s.outlineWidth),
      offset: parseFloat(s.outlineOffset), style: s.outlineStyle, focus: el.matches(":focus-visible"),
      borders: [s.borderTopWidth, s.borderBottomWidth, s.borderLeftWidth, s.borderRightWidth].map(parseFloat),
      scale: devicePixelRatio, viewportWidth: innerWidth, viewportHeight: innerHeight,
    };
  });
  const manual = (detail: string): ContrastRow => ({ state, sample, status: "MANUAL", minimum: 3, ratio: null, pixels: 0, detail });
  if (focused && (!info.focus || info.style === "none" || info.outline <= 0)) return { state, sample, status: "FAIL", minimum: 3, ratio: 1, pixels: 0, detail: "No visible CSS focus outline" };
  if (!focused && info.borders.some(width => !(width > 0))) return { state, sample, status: "FAIL", minimum: 3, ratio: 1, pixels: 0, detail: "Missing painted control border" };

  const { x, y, w, h, scale } = info;
  if (!(scale > 0) || !Number.isFinite(scale)) return manual("Invalid device scale");
  const edges = [
    { name: "top", x: x+w/2, y, dx: 0, dy: -1 },
    { name: "bottom", x: x+w/2, y: y+h, dx: 0, dy: 1 },
    { name: "left", x, y: y+h/2, dx: -1, dy: 0 },
    { name: "right", x: x+w, y: y+h/2, dx: 1, dy: 0 },
  ];
  type NamedPair = PixelPair & { edge: string; kind: string };
  const interior: NamedPair[] = [];
  const pairs: NamedPair[] = edges.flatMap((e, i) => {
    // Snap the normal axis to the raster edge, and choose actual device-pixel
    // centers on either side. Never downsample a one-CSS-pixel stroke.
    const px = e.dx ? Math.round(e.x * scale) : Math.floor(e.x * scale);
    const py = e.dy ? Math.round(e.y * scale) : Math.floor(e.y * scale);
    const at = (d: number): Point => [Math.floor(px + e.dx*d), Math.floor(py + e.dy*d)];
    const pair = (a: number, b: number, kind: string): NamedPair => ({ a: at(a), b: at(b), edge: e.name, kind });
    if (focused) {
      const inner = Math.round(info.offset * scale);
      const outer = Math.round((info.offset + info.outline) * scale);
      const ring = (inner + outer) / 2;
      return [pair(ring, outer + .5, "ring/exterior"), pair(ring, inner - .5, "ring/interior")];
    }
    const width = Math.max(1, Math.round(info.borders[i] * scale));
    const border = -width / 2;
    interior.push(pair(border, -width - .5, "border/fill"));
    return [pair(border, .5, "border/exterior")];
  });
  const capture = async () => sharp(await page.screenshot({ animations: "allow", scale: "device" }))
    .removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const a = await capture(), b = await capture();
  const { width, height, channels } = a.info;
  if (channels !== 3 || b.info.channels !== 3 || b.info.width !== width || b.info.height !== height ||
    Math.abs(width - info.viewportWidth * scale) > 1 || Math.abs(height - info.viewportHeight * scale) > 1) return manual("Device raster or viewport changed");
  const first = measureBoundarySamples(a.data, width, height, pairs), second = measureBoundarySamples(b.data, width, height, pairs);
  if (first.ratio === null || second.ratio === null || Math.abs(first.ratio-second.ratio) > .05) return manual("Boundary outside viewport or unstable");
  const rgb = ([px, py]: Point): RGB => {
    const index = (py * width + px) * 3;
    return [a.data[index], a.data[index+1], a.data[index+2]];
  };
  const evidence = (p: NamedPair): PixelEvidence => {
    const painted = rgb(p.a), adjacent = rgb(p.b);
    return { ...p, painted, adjacent, ratio: contrastRatio(painted, adjacent) };
  };
  const pixelEvidence = { scale, viewport: [width, height] as [number, number], borderWidths: info.borders,
    outlineWidth: info.outline, outlineOffset: info.offset, pairs: pairs.map(evidence),
    interior: interior.filter(p => [p.a,p.b].every(([px,py]) => px >= 0 && py >= 0 && px < width && py < height)).map(evidence) };
  const ratio = Math.min(first.ratio, second.ratio);
  return { state, sample, minimum: 3, ratio, pixels: first.pixels, status: ratio >= 3 ? "PASS" : "FAIL",
    detail: "Actual native device-pixel stroke / adjacent surface; minimum across straight mid-edges", pixelEvidence };
}
