import { test, expect } from "@playwright/test";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { firstAsset } from "../component-app/library-fixtures";

const origin="http://127.0.0.1:4173";
const output=path.resolve("artifacts/phase6-component-review");
const avatar='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#6d50d1"/><circle cx="16" cy="12" r="6" fill="#d5d1e1"/></svg>';
for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
  for(const reducedMotion of ["no-preference","reduce"] as const) {
    test("Round 3 surface screenshots "+viewport.width+" "+reducedMotion,async({browser})=>{
      const key="round3-"+viewport.width+"-"+reducedMotion;
      const frames:string[]=[],errors:string[]=[],unexpected:string[]=[];
      let inspectionSurface: "desktop-inspector" | "phone-sheet" | "phone-viewer-baseline" | null = null;
      await mkdir(output,{recursive:true});
      const context=await browser.newContext({viewport,reducedMotion,colorScheme:"dark",deviceScaleFactor:1,serviceWorkers:"block",
        extraHTTPHeaders:{"x-renderlab-fixture-shell":"owner"}});
      await context.route("**/*",async route=>{
        const request=route.request(),url=new URL(request.url());
        if(url.origin!==origin || request.method()!=="GET") {
          unexpected.push(request.method()+" "+url.origin+url.pathname);return route.abort();
        }
        if(url.pathname==="/api/account/profile")return route.fulfill({json:{profile:{displayName:"Synthetic Member"}}});
        if(url.pathname==="/api/account/profile/avatar")return route.fulfill({contentType:"image/svg+xml",body:avatar});
        if(url.pathname==="/api/account/data-export")return route.fulfill({json:{export:null}});
        if(url.pathname==="/api/account/delete")return route.fulfill({json:{deletion:null}});
        if(url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")){
          unexpected.push(request.method()+" "+url.pathname);return route.abort();
        }
        return route.continue();
      });
      const page=await context.newPage();
      page.on("pageerror",e=>errors.push(e.message));
      page.on("console",m=>{if(m.type()==="error"&&/hydrat|server rendered|did not match/i.test(m.text()))errors.push(m.text());});
      const capture=async(state:string)=>{
        await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.complete&&i.naturalWidth).map(i=>i.decode()));});
        await page.waitForTimeout(800);
        const file=key+"-"+state+".png";
        await page.screenshot({path:path.join(output,file),animations:"allow"});
        expect((await stat(path.join(output,file))).size).toBeGreaterThan(0);
        frames.push(file);
      };
      try {
        // Landing already has its separate, shell-free four-width capture and contrast lane.
        // Capture the actual account/admin/library components here with the real owner shell.
        await page.goto(origin+"/round3-settings");
        await expect(page.getByRole("heading",{name:"Settings",exact:true})).toBeVisible();
        await expect(page.getByText("review@example.invalid",{exact:true}).first()).toBeVisible();
        await capture("settings");
        await page.goto(origin+"/admin");
        await expect(page.getByRole("heading",{name:"Admin",exact:true})).toBeVisible();
        await capture("admin");
        await page.goto(origin+"/round3-library");
        await expect(page.getByRole("heading",{name:"Library",exact:true})).toBeVisible();
        await expect(page.getByRole("link",{name:"Open First image"})).toBeVisible();
        await capture("library");
        await page.getByRole("button",{name:"Select",exact:true}).press("Enter");
        if (viewport.width===390) {
          // Zero-selection state is a separate review frame: the phone toolbar
          // and media grid must remain visible before selecting the first tile.
          await expect(page.getByRole("checkbox",{name:"Select First image"})).not.toBeChecked();
          await expect(page.getByRole("checkbox",{name:"Select Second image"})).not.toBeChecked();
          await expect(page.getByRole("region",{name:"Library media grid"})).toBeVisible();
          await capture("library-selection-empty");
        }
        await page.getByRole("checkbox",{name:"Select First image"}).press("Space");
        await expect(page.getByRole("checkbox",{name:"Select First image"})).toBeChecked();
        await capture("library-selection");
        // Start with the real unselected grid. Below 75rem the pre-Round-3
        // product has no accessible inline inspector; its tile opens Viewer.
        // Record that baseline explicitly, never force hidden desktop CSS.
        await page.goto(origin+"/round3-library");
        const tile=page.getByRole("link",{name:"Open First image",exact:true});
        await expect(tile).toBeVisible();
        if (viewport.width===1440) {
          await page.goto(origin+"/round3-library?inspect="+firstAsset.id);
          await expect(page.getByRole("complementary",{name:"Media inspector"}).getByRole("heading",{name:"First image",exact:true})).toBeVisible();
          inspectionSurface="desktop-inspector";
          await capture("library-inspector");
        } else {
          const href=await tile.getAttribute("href");
          expect(href).not.toBeNull();
          if (href?.includes("inspect=")) {
            // #785 introduces the real phone Sheet. Use the fixture query
            // to preserve the review artwork and assert the actual dialog.
            await page.goto(origin+"/round3-library?inspect="+firstAsset.id);
            const sheet=page.getByRole("dialog",{name:"Media inspector"});
            await expect(sheet).toBeVisible();
            await expect(sheet.getByRole("heading",{name:"First image",exact:true})).toBeVisible();
            inspectionSurface="phone-sheet";
            await capture("library-inspector");
          } else {
            await expect(tile).toHaveAttribute("href","/library/"+firstAsset.id);
            await tile.click();
            await expect(page.getByRole("heading",{name:"First image",exact:true})).toBeVisible();
            inspectionSurface="phone-viewer-baseline";
            await capture("library-viewer-baseline");
          }
        }
        expect(frames).toHaveLength(viewport.width===390?6:5);
        expect(errors).toEqual([]);expect(unexpected).toEqual([]);
      }finally{
        await writeFile(path.join(output,key+".json"),JSON.stringify({key,sourceSha:process.env.REVIEW_SOURCE_SHA??"local-unverified",viewport,reducedMotion,frames,errors,unexpected,inspectionSurface,fixture:"synthetic accounts and media; no live auth or production metrics"},null,2)+"\n");
        console.log("ROUND3_SURFACES",key,JSON.stringify({frames,errors,unexpected,inspectionSurface}));
        await context.close();
      }
    });
  }
}
