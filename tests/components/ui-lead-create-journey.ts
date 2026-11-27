import { expect, type Page } from "@playwright/test";

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) <= 700;
const name = (mode: "edit" | "generate") => mode === "edit" ? "Edit image" : "Text to image";
export function modeChoice(page: Page, mode: "edit" | "generate") {
  return page.getByRole("radio", { name: name(mode), exact: true });
}
export function modeTrigger(page: Page) {
  return page.getByRole("button", { name: /^Mode:/ });
}
export async function assertMode(page: Page, mode: "edit" | "generate") {
  if (isPhone(page)) await expect(modeTrigger(page)).toHaveAccessibleName("Mode: " + name(mode).toLowerCase());
  else await expect(modeChoice(page, mode)).toHaveAttribute("aria-checked", "true");
}
export async function selectMode(page: Page, mode: "edit" | "generate") {
  if (isPhone(page)) await modeTrigger(page).click();
  await modeChoice(page, mode).click();
  await assertMode(page, mode);
}
export const advancedTrigger = (page: Page) => page.getByRole("button", { name: isPhone(page) ? "Advanced settings" : "Advanced", exact: true });
export const historyTrigger = (page: Page) => page.getByRole("button", { name: "Session and prompt history", exact: true });
export async function openHistory(page: Page) {
  if (isPhone(page)) {
    await historyTrigger(page).press("Enter");
    const sheet = page.getByRole("dialog", { name: "History" });
    await expect(sheet).toBeVisible();
    return sheet;
  }
  return page.getByRole("region", { name: "Create history" });
}
export async function closeHistory(page: Page) {
  if (isPhone(page)) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "History" })).toHaveCount(0);
    await expect(historyTrigger(page)).toBeFocused();
  }
}
export const manualPrompt = (page: Page) => page.getByRole("checkbox", { name: "Use my own structured prompt" });
export async function openAdvanced(page: Page) {
  const opener = advancedTrigger(page);
  if (isPhone(page)) {
    await opener.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Advanced" });
    await expect(sheet).toBeVisible();
    await expect.poll(() => sheet.evaluate(el => Math.abs(el.getBoundingClientRect().bottom - innerHeight))).toBeLessThan(1);
    return sheet;
  }
  if (await opener.getAttribute("aria-expanded") !== "true") await opener.press("Enter");
  return page.locator("#create-desktop-advanced-fields");
}

/** Pixel evidence for icon-only controls replacing former text buttons. */
export async function iconContrast(page: Page, icon: import("@playwright/test").Locator, state: string, sample: string) {
  const { measurePixels } = await import("./composited-contrast");
  const sharp = (await import("sharp")).default;
  await icon.scrollIntoViewIfNeeded();
  await expect(icon).toBeVisible();
  const info = await icon.evaluate(el => {
    const r = el.getBoundingClientRect(), css = getComputedStyle(el);
    const canvas = document.createElement("canvas"); canvas.width=canvas.height=1;
    const ctx=canvas.getContext("2d")!;ctx.fillStyle=css.stroke === "none" ? css.color : css.stroke;ctx.fillRect(0,0,1,1);
    return { rect:{x:r.x,y:r.y,width:r.width,height:r.height}, fg:[...ctx.getImageData(0,0,1,1).data] as [number,number,number,number], original:el.getAttribute("style") };
  });
  const settle=()=>page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const raw=async()=>sharp(await page.screenshot({scale:"css",animations:"allow"})).removeAlpha().toColourspace("srgb").raw().toBuffer({resolveWithObject:true});
  await settle();
  const before=await raw();
  let measured:ReturnType<typeof measurePixels>;
  try {
    await icon.evaluate(el=>(el as SVGElement).style.setProperty("visibility","hidden","important"));
    await settle();
    const hidden=await raw(), repeat=await raw();
    measured=measurePixels(before.data,hidden.data,repeat.data,hidden.info.width,hidden.info.height,[info.rect],info.fg);
  } finally {
    await icon.evaluate((el,original)=>{if(original===null)el.removeAttribute("style");else el.setAttribute("style",original)},info.original);
  }
  return {state,sample,minimum:3,ratio:measured.ratio,pixels:measured.pixels,
    status:measured.unstable||measured.ratio===null?"MANUAL" as const:measured.ratio>=3?"PASS" as const:"FAIL" as const,
    detail:"Actual icon stroke pixel footprint (non-text contrast)"};
}
