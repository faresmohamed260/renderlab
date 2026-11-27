import { test, expect, type Page, type Locator } from "@playwright/test";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";
import { collectTextContrast, measurePixels, type ContrastRow } from "./composited-contrast";
import sharp from "sharp";
import { openHistory, closeHistory, historyTrigger, openAdvanced, advancedTrigger, manualPrompt, iconContrast } from "./ui-lead-create-journey";

// The shared collector deliberately excludes input/placeholder glyphs. For this
// feature's actual input, hide only glyph paint, preserve its layout/backdrop,
// and use the same measured-pixel contrast implementation.
async function placeholderContrast(page: Page, field: Locator, state: string): Promise<ContrastRow> {
  await field.scrollIntoViewIfNeeded();
  const info = await field.evaluate(el => {
    const pseudo = el instanceof HTMLTextAreaElement ? "::placeholder" : "::before";
    const css = getComputedStyle(el, pseudo), r = el.getBoundingClientRect();
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.globalAlpha = Number(css.opacity);
    ctx.fillStyle = css.webkitTextFillColor || css.color;
    ctx.fillRect(0, 0, 1, 1);
    return { pseudo, fg: [...ctx.getImageData(0, 0, 1, 1).data] as unknown as [number, number, number, number],
      rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
  });
  const raw = async () => sharp(await page.screenshot({ scale: "css", animations: "allow" })).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const before = await raw();
  const rule = await page.addStyleTag({ content: "#create-preview-prompt" + info.pseudo + " { -webkit-text-fill-color: transparent !important; }" });
  let measured: ReturnType<typeof measurePixels>;
  try {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const hidden = await raw(), repeat = await raw();
    measured = measurePixels(before.data, hidden.data, repeat.data, hidden.info.width, hidden.info.height, [info.rect], info.fg);
  } finally { await rule.evaluate(node => node.parentNode?.removeChild(node)); }
  const ratio = measured.ratio;
  return { state, sample: "#create-preview-prompt placeholder", minimum: 4.5, ratio, pixels: measured.pixels,
    status: measured.unstable || ratio === null ? "MANUAL" : ratio >= 4.5 ? "PASS" : "FAIL",
    detail: measured.unstable ? "Unstable actual backdrop" : "Actual placeholder glyph footprint on rendered surface" };
}

for (const { width, variant } of [{ width:390,variant:"create" },{ width:390,variant:"owner" },{ width:1440,variant:"create" }]) {
  test("assigned Create contrast rows on actual member surfaces at " + width + " " + variant, async ({ browser }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 },
      colorScheme:"dark", reducedMotion:"reduce", serviceWorkers:"block",
      extraHTTPHeaders:{"x-renderlab-fixture-shell":variant} });
    const unexpected: string[] = [], errors: string[] = [];
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== "http://127.0.0.1:4173" || request.method() !== "GET") {
        unexpected.push(request.method() + " " + url.origin + url.pathname); return route.abort();
      }
      if (url.pathname === "/api/generation/jobs" && !url.search) return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
      if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
      if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content" && !url.search) return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
      if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
      if (url.pathname === "/api/account/profile/avatar") return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
        unexpected.push(url.pathname); return route.abort();
      }
      return route.continue();
    });
    try {
      const page=await context.newPage();
      page.on("pageerror",error=>errors.push(error.message));
      await page.goto("/create");
      const phone=width===390;
      const workspace=page.getByRole("region",{name:"Create with FIBO"});
      const header=page.locator(".preview-navigation-header");
      const rows: ContrastRow[]=[];
      const history=await openHistory(page);
      await expect(history.locator("[data-create-history-image]")).toHaveCount(1);
      await closeHistory(page);
      await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
      const text=async (target:Locator,state:string,label:string)=>{
        await expect(target).toBeVisible();
        const row=await collectTextContrast(page,target,state,label); rows.push(row); console.log("CREATE_MANUAL_CONTRAST "+JSON.stringify({width,...row}));
      };
      const icon=async(target:Locator,state:string,label:string)=>{
        const row=await iconContrast(page,target,state,label); rows.push(row); console.log("CREATE_MANUAL_CONTRAST "+JSON.stringify({width,...row}));
      };
      for (const state of ["create-shell","shell-dismissed"]) {
        if(state==="shell-dismissed") {
          if(phone) {
            const trigger=header.getByRole("button",{name:/RenderLab.*Open navigation/,includeHidden:true});
            await trigger.press("Enter");
            const dialog=page.getByRole("dialog",{name:"RenderLab"});
            await expect(dialog).toBeVisible();
            const hiddenBy=(element:Locator)=>element.evaluate(el=>el.closest('[aria-hidden="true"]')?.tagName??null);
            const historyButton=header.locator('.rebuild-phone-action');
            expect(await hiddenBy(trigger)).not.toBeNull();
            expect(await hiddenBy(historyButton)).not.toBeNull();
            await expect(workspace).toHaveCount(0);
            await expect(dialog.getByRole("button",{name:"Close menu"})).toBeFocused();
            for(const key of ["Tab","Tab","Shift+Tab"]){
              await page.keyboard.press(key);
              expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
            }
            await historyButton.evaluate(el=>(el as HTMLElement).focus({preventScroll:true}));
            await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
            await page.keyboard.press("Escape");
            await expect(dialog).toHaveCount(0);
            await expect(trigger).toBeFocused();
            await expect(trigger).toHaveAttribute("aria-expanded","false");
            await expect(workspace).toBeVisible();
            expect(await hiddenBy(trigger)).toBeNull();
            expect(await hiddenBy(historyButton)).toBeNull();
          } else {
            const account=header.getByRole("button",{name:/Account menu/});
            await account.press("Enter");
            await expect(account).toHaveAttribute("aria-expanded","true");
            const menu=header.locator('.preview-account-menu[aria-hidden="false"]');
            await expect(menu).toBeVisible();
            // Real header labels must remain unobscured while the floating
            // disclosure is open; it may overlay page content by design.
            for(const [label,target] of [
              ["Queue",header.getByRole("button",{name:"Queue",exact:true})],
              ["Search actions",header.getByRole("button",{name:/Search actions/}).getByText("Search actions",{exact:true})]
            ] as const) {
              const paint=await target.evaluate(el=>{
                const rect=el.getBoundingClientRect();
                return [.15,.5,.85].map(f=>{const hit=document.elementFromPoint(rect.left+rect.width*f,rect.top+rect.height/2);return !!hit&&el.contains(hit);});
              });
              expect(paint.every(Boolean),label+" unobscured while account menu open").toBe(true);
              await text(target,"account open",label);
            }
            await page.keyboard.press("Escape");
            await expect(account).toBeFocused();
            await expect(account).toHaveAttribute("aria-expanded","false");
          }
        }
        if(phone) {
          const logo=header.getByRole("button",{name:/RenderLab.*Open navigation/});
          await text(logo.getByText("RenderLab",{exact:true}),state,"Brand");
          await icon(historyTrigger(page).locator("svg"),state,"History");
          await text(workspace.getByRole("button",{name:/^Mode:/}),state,"Mode");
          await text(workspace.getByRole("button",{name:/^Shape /}),state,"Shape");
          const refs=workspace.getByRole("button",{name:"References",exact:true});
          await icon(refs.locator("svg"),state,"References");
          await refs.press("Enter");
          const popover=page.locator('[data-slot="popover-content"][aria-label="References"]');
          await expect(popover).toBeVisible();
          await text(popover.getByText(/References ·/),state,"References heading");
          await icon(popover.getByRole("button",{name:"Add a reference image"}).locator("svg"),state,"Add reference");
          await text(popover.getByRole("button",{name:"Select region"}),state,"Select region");
          await page.keyboard.press("Escape");
          await expect(refs).toBeFocused();
        } else {
          await text(header.getByRole("button",{name:"Queue",exact:true}),state,"Queue");
          const search=header.getByRole("button",{name:/Search actions/});
          await text(search.getByText("Search actions",{exact:true}),state,"Search actions");
          await text(search.locator("kbd"),state,"Search shortcut");
          await text(workspace.getByText("Shape",{exact:true}),state,"Shape");
          const refs=workspace.getByRole("region",{name:"References"});
          await text(refs.getByText(/References ·/),state,"References heading");
          await icon(refs.getByRole("button",{name:"Add a reference image"}).locator("svg"),state,"Add reference");
          await text(refs.getByRole("button",{name:"Select region"}),state,"Select region");
          await text(workspace.locator("#create-preview-main-prompt-label"),state,"Prompt label");
        }
        rows.push(await placeholderContrast(page,page.locator("#create-preview-prompt"),state));
        const blocker=await page.locator("#create-preview-blocker").evaluate(el=>{
          const r=el.getBoundingClientRect();
          return {width:r.width,height:r.height,describedBy:document.querySelector('[aria-describedby="create-preview-blocker"]')!==null};
        });
        expect(blocker.describedBy).toBe(true);
        expect(blocker.width).toBeLessThanOrEqual(1);
        expect(blocker.height).toBeLessThanOrEqual(1);
        const panel=await openHistory(page);
        await text(panel.getByRole("heading",{name:"This session"}),state,"History heading");
        await text(panel.getByRole("heading",{name:"Prompt history"}),state,"Prompt history heading");
        await closeHistory(page);
        const advanced=await openAdvanced(page);
        await text(advanced.locator('label[for="create-preview-seed"]'),state,"Seed label");
        await text(advanced.locator('label[for="create-preview-steps"]'),state,"Steps label");
        await text(advanced.locator("output"),state,"Steps output");
        await text(advanced.getByText("Use my own structured prompt",{exact:true}),state,"Structured prompt label");
        if(!await manualPrompt(page).isChecked()) await manualPrompt(page).check();
        await expect(advanced.getByRole("textbox",{name:"Manual VGL JSON"})).toBeVisible();
        await manualPrompt(page).uncheck();
        if(phone){
          await page.keyboard.press("Escape");
          await expect(advanced).toHaveCount(0);
          await expect(advancedTrigger(page)).toBeFocused();
        }
      }
      for(const row of rows) console.log("CREATE_MANUAL_CONTRAST "+JSON.stringify({width,...row}));
      expect(rows.filter(row=>row.status!=="PASS"),"Unresolved or failing measured Create contrast").toEqual([]);
      expect(unexpected).toEqual([]);
      expect(errors).toEqual([]);
    } finally {await context.close();}
  });
}
