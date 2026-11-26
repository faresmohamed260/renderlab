import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { collectTextContrast, type ContrastRow } from "./composited-contrast";

const output = path.resolve("artifacts/phase6-component-review");
const origin = "http://127.0.0.1:4173";
for (const viewport of [{width:195,height:422},{width:320,height:844},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]) {
  for (const reducedMotion of ["no-preference","reduce"] as const) {
    test("Round 3 Landing hero " + viewport.width + " " + reducedMotion, async ({browser}) => {
      const key = "landing-" + viewport.width + "-" + reducedMotion;
      await mkdir(output,{recursive:true});
      const context = await browser.newContext({viewport,reducedMotion,colorScheme:"dark",deviceScaleFactor:1,serviceWorkers:"block",extraHTTPHeaders:{"x-renderlab-fixture-shell":"signed-out"}});
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
        await page.goto(origin + "/?landing-review=1");
        await page.evaluate(()=>document.fonts.ready);
        const hero = page.locator('[data-landing-section="hero"]');
        await expect(hero).toBeVisible();
        await page.screenshot({path:path.join(output,key+".png"),animations:"allow",fullPage:false});
        const header = page.locator("[data-landing-header]");
        await expect.soft(header.getByRole("link",{name:"Sign in",exact:true})).toBeVisible();
        await expect.soft(header.getByRole("link",{name:"Sign in",exact:true})).toHaveAttribute("href","/settings");
        await expect.soft(page.locator(".preview-navigation-header")).toHaveCount(0);
        if (viewport.width === 1440) {
          await expect.soft(header.getByRole("link",{name:"Open Create",exact:true})).toBeVisible();
          await expect.soft(header.getByRole("link",{name:"Open Create",exact:true})).toHaveAttribute("href","/create");
          const thumbnails = hero.locator("[data-landing-thumbnail]");
          await expect.soft(thumbnails).toHaveCount(4);
          for (const thumbnail of await thumbnails.all()) {
            await expect.soft(thumbnail).toBeVisible();
            await expect.soft(thumbnail.locator("linearGradient stop")).toHaveCount(3);
            await expect.soft(thumbnail.locator("rect")).toHaveAttribute("fill",/^url\(#.+\)$/);
          }
        }
        await expect.soft(hero.getByRole("heading",{level:1})).toHaveText(/Make it\.\s*Shape it\.\s*Refine it\./);
        await expect.soft(hero.getByText("Invitation-only Closed Beta",{exact:true})).toBeVisible();
        await expect.soft(hero.getByRole("img",{name:"RenderLab Create preview"})).toBeVisible();
        await expect.soft(hero.getByRole("link",{name:"Open Create"})).toHaveAttribute("href","/create");
        await expect.soft(hero.getByRole("list",{name:"What you can do"}).getByRole("listitem")).toHaveCount(4);
        // The approved capability chips and preview are illustrative, not touch controls.
        const chips = hero.getByRole("list",{name:"What you can do"}).getByRole("listitem");
        await expect(chips).toHaveText(["Create image","Edit image","Use references","Save to Library"]);
        const preview = hero.getByRole("img",{name:"RenderLab Create preview"});
        const cta = hero.getByRole("link",{name:"Open Create",exact:true});
        const heading = hero.getByRole("heading",{level:1});
        const bounds = await hero.boundingBox();
        expect(bounds,"hero has rendered geometry").not.toBeNull();
        if (!bounds) throw new Error("Missing hero geometry");
        for (const item of [heading,cta,preview,...await chips.all()]) {
          await expect(item).toBeVisible();
          const rect = await item.boundingBox();
          expect(rect,"hero item has rendered geometry").not.toBeNull();
          if (!rect) throw new Error("Missing hero item geometry");
          expect.soft(rect.width).toBeGreaterThan(0);
          expect.soft(rect.height).toBeGreaterThan(0);
          expect.soft(rect.x).toBeGreaterThanOrEqual(Math.max(0,bounds.x)-1);
          expect.soft(rect.x+rect.width).toBeLessThanOrEqual(Math.min(viewport.width,bounds.x+bounds.width)+1);
          expect.soft(rect.y).toBeGreaterThanOrEqual(bounds.y-1);
          expect.soft(rect.y+rect.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);
          const overflow = await item.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
          expect.soft(overflow.scroll,"hero item horizontal overflow").toBeLessThanOrEqual(overflow.client+1);
        }
        await expect(preview.getByRole("button")).toHaveCount(0);
        await expect(preview.getByRole("link")).toHaveCount(0);
        await expect(hero.getByRole("list",{name:"What you can do"}).getByRole("button")).toHaveCount(0);
        await expect(hero.getByRole("list",{name:"What you can do"}).getByRole("link")).toHaveCount(0);
        const target = await cta.boundingBox();
        expect(target,"CTA target geometry").not.toBeNull();
        if (!target) throw new Error("Missing CTA target geometry");
        expect.soft(target.width,"CTA width").toBeGreaterThanOrEqual(44);
        expect.soft(target.height,"CTA height").toBeGreaterThanOrEqual(44);
        await cta.scrollIntoViewIfNeeded();
        const hit = await cta.evaluate(el=>{
          const r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
          return [-21,0,21].every(dx=>[-21,0,21].every(dy=>{
            const top=document.elementFromPoint(x+dx,y+dy);
            return top!==null && el.contains(top);
          }));
        });
        expect.soft(hit,"unobstructed central 44px CTA target").toBe(true);
        if (reducedMotion === "reduce") {
          expect(await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
          for (const item of [hero,heading,cta,preview,...await chips.all()]) {
            const motion = await item.evaluate(el=>{
              const style=getComputedStyle(el);
              return {animation:style.animationName,transitionMs:style.transitionDuration.split(",").map(v=>parseFloat(v)*(v.trim().endsWith("ms")?1:1000))};
            });
            expect.soft(motion.animation).toBe("none");
            expect.soft(Math.max(...motion.transitionMs)).toBeLessThanOrEqual(0.001);
          }
        }
        // Restore the initial scroll position before existing contrast measurements.
        await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
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

test("Signed-in Landing retains the existing account affordance",async({browser})=>{
  const context=await browser.newContext({viewport:{width:1440,height:900},extraHTTPHeaders:{"x-renderlab-fixture-shell":"member"},serviceWorkers:"block"});
  try {
    await context.route("**/*",route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage();
    await page.goto(origin+"/?landing-review=1");
    await expect(page.locator(".preview-navigation-header").getByRole("button",{name:/Account menu/})).toBeVisible();
    await expect(page.locator("[data-landing-header]")).toBeHidden();
  }finally{await context.close();}
});
