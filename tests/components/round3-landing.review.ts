import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { collectTextContrast, type ContrastRow } from "./composited-contrast";

const output = path.resolve("artifacts/phase6-component-review");
const origin = "http://127.0.0.1:4173";
for (const viewport of [{width:195,height:422},{width:320,height:844},{width:390,height:844},{width:1440,height:900}]) {
  for (const reducedMotion of ["no-preference","reduce"] as const) {
    test("Round 3 Landing hero " + viewport.width + " " + reducedMotion, async ({browser}) => {
      const key = "landing-" + viewport.width + "-" + reducedMotion;
      await mkdir(output,{recursive:true});
      const context = await browser.newContext({viewport,reducedMotion,colorScheme:"dark",deviceScaleFactor:1,serviceWorkers:"block"});
      const placeholder = await sharp({create:{width:64,height:64,channels:3,background:"#25374b"}}).png().toBuffer();
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === origin && route.request().method() === "GET") return route.continue();
        if (url.hostname === "images.unsplash.com" && route.request().resourceType() === "image") return route.fulfill({contentType:"image/png",body:placeholder});
        return route.abort();
      });
      const page = await context.newPage();
      const errors: string[] = [], rows: ContrastRow[] = [];
      page.on("pageerror",error=>errors.push(error.message));
      page.on("console",message=>{if(message.type()==="error" && /hydrat|server rendered|did not match/i.test(message.text())) errors.push(message.text());});
      try {
        await page.goto(origin + "/landing");
        await page.evaluate(()=>document.fonts.ready);
        const hero = page.locator('[data-landing-section="hero"]');
        await expect(hero).toBeVisible();
        await page.screenshot({path:path.join(output,key+".png"),animations:"allow",fullPage:false});
        await expect.soft(hero.getByRole("heading",{level:1})).toHaveText(/Make it\.\s*Shape it\.\s*Refine it\./);
        await expect.soft(hero.getByText("Invitation-only Closed Beta",{exact:true})).toBeVisible();
        await expect.soft(hero.getByRole("img",{name:"RenderLab Create preview"})).toBeVisible();
        await expect.soft(hero.getByRole("link",{name:"Open Create"})).toHaveAttribute("href","/create");
        await expect.soft(hero.getByRole("list",{name:"What you can do"}).getByRole("listitem")).toHaveCount(4);
        await expect.soft(page.locator('[data-landing-section="thread"]')).toBeAttached();
        await expect.soft(page.locator('[data-landing-section="library"]')).toBeAttached();
        const geometry = await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
        expect.soft(geometry.scroll).toBeLessThanOrEqual(geometry.viewport+1);
        for (const [sample,locator] of [
          ["Eyebrow",hero.getByText("Creative image workspace",{exact:true})],
          ["Headline",hero.getByRole("heading",{level:1}).locator("span").first()],
          ["Supporting copy",hero.getByText("Create images. Shape them with references. Save the results and pick up where you left off.",{exact:true})],
          ["CTA",hero.getByRole("link",{name:"Open Create"})],
          ["Beta truth",hero.getByText("Invitation-only Closed Beta",{exact:true})],
        ] as const) {
          const row = await collectTextContrast(page,locator,"landing",sample);
          rows.push(row);
          expect.soft(row.status,sample).toBe("PASS");
        }
        expect(errors,"No hydration errors").toEqual([]);
      } finally {
        await writeFile(path.join(output,key+".json"),JSON.stringify({sourceSha:process.env.REVIEW_SOURCE_SHA,viewport,reducedMotion,rows,errors},null,2)+"\n");
        console.log("ROUND3_LANDING",key,JSON.stringify({rows,errors}));
        await context.close();
      }
    });
  }
}
