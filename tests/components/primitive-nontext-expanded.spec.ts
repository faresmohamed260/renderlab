import sharp from "sharp";
import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./isolated-io";
import { contrastRatio } from "./composited-contrast";

type RGB = [number, number, number];
async function sample(page: Page, locator: Locator, label: string, mode: string, kind: "border" | "focus" | "fill" = "border") {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.evaluate((el, kind) => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return { x: Math.floor(r.left + r.width * (kind === "fill" ? 0.75 : 0.5)), y: Math.ceil(r.top), h: r.height,
      outline: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset), outlineStyle: s.outlineStyle };
  }, kind);
  if (kind === "focus") {
    expect(box.outlineStyle, label).toBe("solid");
    expect(box.outline, label).toBeGreaterThanOrEqual(2);
  }
  const {data, info} = await sharp(await page.screenshot({ animations: "disabled", scale: "css" })).removeAlpha().toColourspace("srgb").raw().toBuffer({resolveWithObject:true});
  function pixel(y: number): RGB {
    expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(info.height);
    const i = (y * info.width + box.x) * info.channels;
    return [data[i]!, data[i+1]!, data[i+2]!];
  }
  const y = kind === "focus" ? box.y - box.offset - 1 : kind === "fill" ? box.y + Math.floor(box.h / 2) : box.y;
  const stroke = pixel(y), outside = pixel(kind === "focus" ? y-3 : box.y-3);
  const ratio = contrastRatio(stroke, outside);
  console.log("PRIMITIVE_NON_TEXT " + JSON.stringify({ label, mode, viewport: page.viewportSize(), stroke, outside, ratio }));
  return ratio;
}
const modes = ["default", "more", "forced", "reduced-transparency"] as const;
for (const width of [390, 1440]) for (const mode of modes) {
  test("Rendered non-text control boundaries and focus " + width + " " + mode, async ({page, context, io}) => {
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({reducedMotion:"reduce",contrast: mode==="more"?"more":"no-preference",forcedColors:mode==="forced"?"active":"none"});
    const cdp = mode==="reduced-transparency" ? await context.newCDPSession(page) : undefined;
    try {
      if (cdp) await cdp.send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-transparency",value:"reduce"},{name:"prefers-reduced-motion",value:"reduce"}]});
      await page.goto("/primitives");
      await expect(page.locator('[data-primitives-ready="true"]')).toBeAttached();
      if(mode !== "default") {
        const fallback=await page.evaluate(()=>({material:getComputedStyle(document.documentElement).getPropertyValue("--rl-material-panel").trim(), atmosphere:getComputedStyle(document.documentElement).getPropertyValue("--rl-atmosphere-scene").trim()}));
        expect(fallback).toEqual({material:"none",atmosphere:"none"});
      }
      const check=page.getByRole("checkbox",{name:"Select item"}), sw=page.getByRole("switch",{name:"Enable setting"}), thumb=page.getByRole("slider",{name:"Strength"}), toggle=page.getByRole("button",{name:"Toggle mode"}), select=page.getByRole("combobox",{name:"Fixture choice"});
      const rows: {name:string;ratio:number}[]=[];
      const measure=async (loc:Locator,name:string,kind:"border"|"focus"|"fill"="border")=>rows.push({name,ratio:await sample(page,loc,name,mode,kind)});
      for(const [loc,name] of [[check,"Checkbox"],[sw,"Switch"],[select,"NativeSelect"]] as const) await measure(loc,name+" resting border");
      for(const [loc,name] of [[check,"Checkbox"],[sw,"Switch"],[thumb,"Slider"],[toggle,"Toggle"],[select,"NativeSelect"]] as const) {
        await page.keyboard.press("Tab"); await loc.focus(); await expect(loc).toBeFocused();
        await measure(loc,name+" keyboard outline","focus");
      }
      for(const [loc,name,attr] of [[check,"Checkbox","aria-checked"],[sw,"Switch","aria-checked"],[toggle,"Toggle","aria-pressed"]] as const){
        await loc.focus(); await loc.press("Space"); await expect(loc).toHaveAttribute(attr,"true"); await loc.blur();
        await measure(loc,name+" selected boundary");
      }
      await thumb.blur();
      await measure(page.locator('[data-slot="slider-track"]'),"Slider unfilled track","fill");
      for(const row of rows) expect.soft(row.ratio,row.name+" "+mode).toBeGreaterThanOrEqual(3);
      expect(rows).toHaveLength(12);
      expect(io).toEqual([]);
    } finally {await cdp?.detach();}
  });
}
