import { test, expect } from "@playwright/test";
import { collectTextContrast, type ContrastRow } from "./composited-contrast";

const origin = "http://127.0.0.1:4173";
for (const width of [195,320,390,1440]) {
  for (const reducedMotion of ["no-preference","reduce"] as const) {
    test("Round 3 Admin Observe at " + width + " " + reducedMotion, async ({browser}) => {
      test.setTimeout(90_000);
      const context = await browser.newContext({viewport:{width,height:width===195?422:900},reducedMotion,deviceScaleFactor:1,colorScheme:"dark",serviceWorkers:"block"});
      const unexpected: string[] = [], errors: string[] = [], rows: ContrastRow[] = [];
      await context.route("**/*",async route=>{
        const req=route.request(), url=new URL(req.url());
        if(url.origin!==origin || req.method()!=="GET" || url.pathname.startsWith("/api/")) {
          unexpected.push(req.method()+" "+url.pathname); return route.abort();
        }
        return route.continue();
      });
      const page=await context.newPage();
      page.on("pageerror",e=>errors.push(e.message));
      try {
        await page.goto(origin+"/admin");
        await page.evaluate(()=>document.fonts.ready);
        const overview=page.getByRole("region",{name:"Generation health overview"});
        await expect(overview).toBeVisible();
        const nav=page.getByRole("navigation",{name:"Admin sections"});
        for(const name of ["Observe","Limits","Access"]) await expect(nav.getByRole("link",{name,exact:true})).toBeVisible();
        await expect(nav.getByText("Control · later",{exact:true})).toBeVisible();
        await expect(overview.locator('[data-observe-stat="active"]')).toContainText("1");
        await expect(overview.locator('[data-observe-stat="latency"]')).toContainText("0 s");
        await expect(overview.locator('[data-observe-stat="confirmation"]')).toContainText("12");
        await expect(overview.locator('[data-observe-stat="held"]')).toContainText("4");
        await expect(overview.getByRole("figure",{name:"Confirmed dispatch percentiles"})).toBeVisible();
        const table=overview.getByRole("table",{name:"Terminal reservations by status"});
        await expect(table.getByRole("row")).toHaveCount(4);
        const locked=overview.getByRole("region",{name:"Controls, not available yet"});
        for(const title of ["Pause generation","Cancel stuck jobs","Adjust limits"]) await expect(locked.getByRole("heading",{name:title})).toBeVisible();
        await expect(locked.locator("button,a,input,select,[tabindex]")).toHaveCount(0);
        expect(await overview.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
        for(const [sample,locator] of [
          ["Active label",overview.getByText("Active jobs",{exact:true})],
          ["Median label",overview.getByText("Dispatch latency (median)",{exact:true})],
          ["Confirmation label",overview.getByText("Outbox confirmation",{exact:true})],
          ["Held label",overview.locator('[data-observe-stat="held"]').getByText("Terminal reservations",{exact:true})],
          ["Locked control",locked.getByRole("heading",{name:"Pause generation"})],
        ] as const) {
          const row=await collectTextContrast(page,locator,"admin-observe",sample);
          rows.push(row); expect.soft(row.status,sample).toBe("PASS");
        }
        expect(errors).toEqual([]); expect(unexpected).toEqual([]);
      } finally {
        console.log("ROUND3_ADMIN",width,reducedMotion,JSON.stringify({rows,errors,unexpected}));
        await context.close();
      }
    });
  }
}
test("Round 3 summary distinguishes unavailable, empty, lower-bound and small sample", async ({page}) => {
  for (const [state,latency,held] of [
    ["unavailable","Unavailable","Unavailable"],
    ["empty","No timings","0"],
    ["truncated-empty","No timings in sample","0+"],
    ["small","Insufficient samples","1"],
    ["missing-percentile","0 s","4"],
  ]) {
    await page.goto("/admin?state="+state);
    const overview=page.getByRole("region",{name:"Generation health overview"});
    await expect(overview.locator('[data-observe-stat="latency"]')).toContainText(latency);
    await expect(overview.locator('[data-observe-stat="held"]')).toContainText(held);
  }
});
