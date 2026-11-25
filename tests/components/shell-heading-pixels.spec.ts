import { test, expect } from "./isolated-io";
import { collectTextContrast, contrastRatio } from "./composited-contrast";
import sharp from "sharp";

// Public Landing deliberately omits the legacy shell (#792). Test the retained signed-in variant.
test.use({ extraHTTPHeaders: { "x-renderlab-fixture-shell": "member" } });

test("Workspace label is not overpainted by a bright neighbor", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const trigger = page.getByRole("button", { name: /^RenderLab sections:/ });
  // The fixture root still mounts the retained legacy disclosure.
  await expect(trigger).toBeVisible();
  await trigger.press("Enter");
  const label = page.getByRole("navigation", { name: "RenderLab navigation" }).getByText("Workspace", { exact: true });
  await expect(label).toBeVisible();
  const row = await collectTextContrast(page, label, "open", "Workspace");
  const box = await label.evaluate(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    const ancestors = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const s = getComputedStyle(node), rect = node.getBoundingClientRect();
      ancestors.push({ tag: node.tagName, cls: node.className, color: s.color, background: s.backgroundColor,
        opacity: s.opacity, position: s.position, zIndex: s.zIndex, rect: rect.toJSON() });
    }
    return { rect: r.toJSON(), ancestors };
  });
  const before = await sharp(await page.screenshot({ scale: "css" })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  await label.evaluate(el => (el as HTMLElement).style.setProperty("-webkit-text-fill-color", "transparent", "important"));
  let hidden: typeof before;
  try {
    hidden = await sharp(await page.screenshot({ scale: "css" })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  } finally {
    await label.evaluate(el => (el as HTMLElement).style.removeProperty("-webkit-text-fill-color"));
  }
  const pixels: { x: number; y: number; rgb: [number, number, number]; ratio: number }[] = [];
  for (let y = Math.max(0, Math.floor(box.rect.top)); y < Math.min(before.info.height, Math.ceil(box.rect.bottom)); y++) {
    for (let x = Math.max(0, Math.floor(box.rect.left)); x < Math.min(before.info.width, Math.ceil(box.rect.right)); x++) {
      const i = (y * before.info.width + x) * 3;
      const rgb: [number, number, number] = [hidden.data[i], hidden.data[i + 1], hidden.data[i + 2]];
      if (rgb.some((v, j) => Math.abs(v - before.data[i + j]) > 3)) pixels.push({ x, y, rgb, ratio: contrastRatio([245, 245, 247], rgb) });
    }
  }
  pixels.sort((a, b) => a.ratio - b.ratio);
  const worst = pixels.slice(0, 5);
  const stacks = await page.evaluate(points => points.map(point => ({
    ...point, stack: document.elementsFromPoint(point.x, point.y).slice(0, 10).map(el => ({
      tag: el.tagName, cls: el.getAttribute("class"), label: el.getAttribute("aria-label"), text: el.textContent?.slice(0, 60),
      background: getComputedStyle(el).backgroundColor, position: getComputedStyle(el).position,
      zIndex: getComputedStyle(el).zIndex, pointerEvents: getComputedStyle(el).pointerEvents,
    })),
  })), worst);
  console.log("WORKSPACE_PIXEL_STACK " + JSON.stringify({ row, box, stacks }));
  expect(row.status, row.detail).toBe("PASS");
});


test("legacy phone disclosure reserves space below the visible trigger focus ring", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: /^RenderLab sections:/ });
  await expect(trigger).toBeVisible();
  await trigger.press("Enter");
  const heading = page.getByRole("navigation", { name: "RenderLab navigation" }).getByText("Workspace", { exact: true });
  await expect(heading).toBeVisible();
  const ring = await trigger.evaluate(el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return { bottom: r.bottom, outline: parseFloat(s.outlineWidth) || 0, offset: parseFloat(s.outlineOffset) || 0 };
  });
  const headingRect = await heading.boundingBox();
  console.log("SHELL_FOCUS_RING_CLEARANCE " + JSON.stringify({ ring, headingRect }));
  expect(headingRect!.y).toBeGreaterThanOrEqual(ring.bottom + Math.max(0, ring.outline + ring.offset));
  await expect(trigger).toBeFocused();
});
