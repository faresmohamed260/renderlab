import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { emptyHistory, fixtureAsset, fixtureImage } from "../component-app/fixtures";
import { firstAsset } from "../component-app/library-fixtures";

const origin = "http://127.0.0.1:4173";
const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page, label: string) {
  const report = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(report.testEngine.version).toBe("4.14.1");
  expect(report.passes.length + report.violations.length + report.incomplete.length).toBeGreaterThan(0);
  const rows = [
    ...report.violations.map(rule => ({ disposition: "violation", rule })),
    ...report.incomplete.map(rule => ({ disposition: "manual", rule })),
  ].flatMap(({ disposition, rule }) => rule.nodes.map(node => ({
    disposition, rule: rule.id, impact: node.impact ?? rule.impact ?? "unknown",
    target: JSON.stringify(node.target), detail: node.failureSummary ?? rule.description,
  })));
  console.log("AXE INFORMATIONAL", label, JSON.stringify({ engine: report.testEngine.version,
    violations: report.violations.length, incomplete: report.incomplete.length, passes: report.passes.length }));
  console.table(rows);
  console.log("AXE NODE DETAIL",JSON.stringify({label,rows}));
  return report;
}

test("axe negative and positive controls", async ({ page }) => {
  await page.setContent('<html lang="en"><title>Fixture</title><main><button></button></main></html>');
  const negative = await scan(page, "negative control");
  expect(negative.violations.some(rule => rule.id === "button-name")).toBe(true);
  await page.setContent('<html lang="en"><title>Fixture</title><main><button>Named action</button></main></html>');
  const positive = await scan(page, "positive control");
  expect(positive.violations.some(rule => rule.id === "button-name")).toBe(false);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test("mounted axe scan " + viewport.width, async ({ browser }) => {
    const context = await browser.newContext({ viewport, colorScheme: "dark", reducedMotion: "reduce",
      serviceWorkers: "block", extraHTTPHeaders: { "x-renderlab-fixture-shell": "create" } });
    const unexpected: string[] = [], errors: string[] = [], scanned: string[] = [];
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin || request.method() !== "GET") {
        unexpected.push(request.method() + " " + url.origin + url.pathname);
        return route.abort();
      }
      if (url.pathname === "/api/generation/jobs" && !url.search) {
        return route.fulfill({ json: { available: true, fiboAvailable: true, fiboMaskAvailable: true } });
      }
      if (url.pathname === "/api/media/assets" && url.searchParams.get("origin") === "generated") {
        return route.fulfill({ json: { ...emptyHistory, items: [fixtureAsset] } });
      }
      // Exact content URL of the one synthetic asset returned by this fixture.
      if (url.pathname === "/api/media/assets/" + fixtureAsset.id + "/content" && !url.search) {
        return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
      }
      if (url.pathname === "/api/account/profile") return route.fulfill({ json: { profile: { displayName: "Synthetic Member" } } });
      if (url.pathname === "/api/account/profile/avatar") {
        return route.fulfill({ contentType: "image/png", body: Buffer.from(fixtureImage.split(",")[1], "base64") });
      }
      if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/create-preview/")) {
        unexpected.push("GET " + url.pathname); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    const measure = async (label: string) => {
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await scan(page, viewport.width + "/" + label);
      scanned.push(label);
    };
    try {
      await page.goto(origin + "/create");
      await expect(page.getByRole("region", { name: "Create with FIBO" })).toBeVisible();
      await expect(page.locator("[data-create-history-image]")).toHaveCount(1);
      await measure("create-shell");
      const shell = page.locator("header button[aria-expanded]:visible").first();
      await expect(shell).toBeVisible();
      if (await shell.getAttribute("aria-expanded") !== "true") await shell.press("Enter");
      await expect(shell).toHaveAttribute("aria-expanded", "true");
      await measure("shell-disclosure");
      await page.keyboard.press("Escape");
      await page.goto(origin + "/review");
      await expect(page.getByRole("heading", { name: "Shared primitive review" })).toBeVisible();
      await measure("review");
      await page.getByRole("button", { name: "Review popover", exact: true }).press("Enter");
      await expect(page.getByText("Real shared popover")).toBeVisible();
      await measure("review-popover");
      await page.goto(origin + "/primitives");
      await expect(page.locator('[data-primitives-ready="true"]')).toBeAttached();
      await expect(page.getByRole("button", { name: "Open sheet" })).toBeVisible();
      await measure("primitives");
      await page.getByRole("button", { name: "Open sheet" }).press("Enter");
      await expect(page.getByRole("dialog", { name: "History fixture" })).toBeVisible();
      await measure("primitives-sheet");
    } finally {
      await context.close();
      console.log("AXE STATE COVERAGE", viewport.width, JSON.stringify(scanned));
    }
    expect(scanned).toEqual(["create-shell", "shell-disclosure", "review", "review-popover", "primitives", "primitives-sheet"]);
    expect(unexpected, "No unknown provider, mutation or external network requests").toEqual([]);
    expect(errors, "No uncaught browser errors").toEqual([]);
  });
}

for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
  test("Round 3 integrated surface axe coverage "+viewport.width,async({browser})=>{
    const scanned:string[]=[],unexpected:string[]=[],errors:string[]=[];
    const openContext=async(variant:"owner"|"signed-out")=>{
      const context=await browser.newContext({viewport,colorScheme:"dark",reducedMotion:"reduce",serviceWorkers:"block",extraHTTPHeaders:{"x-renderlab-fixture-shell":variant}});
      await context.route("**/*",async route=>{
        const request=route.request(),url=new URL(request.url());
        if(variant==="signed-out"&&url.hostname==="images.unsplash.com"&&request.method()==="GET"&&request.resourceType()==="image")
          return route.fulfill({contentType:"image/png",body:Buffer.from(fixtureImage.split(",")[1],"base64")});
        if(url.origin!==origin||request.method()!=="GET"){
          unexpected.push(request.method()+" "+url.origin+url.pathname);return route.abort();
        }
        if(url.pathname==="/api/account/profile")return route.fulfill({json:{profile:{displayName:"Synthetic Member"}}});
        if(url.pathname==="/api/account/profile/avatar")return route.fulfill({contentType:"image/png",body:Buffer.from(fixtureImage.split(",")[1],"base64")});
        if(url.pathname==="/api/account/data-export")return route.fulfill({json:{export:null}});
        if(url.pathname==="/api/account/delete")return route.fulfill({json:{deletion:null}});
        if(url.pathname==="/api/generation/jobs"&&!url.search)return route.fulfill({json:{available:true,fiboAvailable:true,fiboMaskAvailable:true}});
        if(url.pathname==="/api/media/assets"&&url.searchParams.get("origin")==="generated")return route.fulfill({json:{...emptyHistory,items:[fixtureAsset]}});
        if(url.pathname==="/api/media/assets/"+fixtureAsset.id+"/content"&&!url.search)return route.fulfill({contentType:"image/png",body:Buffer.from(fixtureImage.split(",")[1],"base64")});
        if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/create-preview/")){
          unexpected.push(request.method()+" "+url.pathname);return route.abort();
        }
        return route.continue();
      });
      const page=await context.newPage();
      page.on("pageerror",error=>errors.push(error.message));
      page.on("console",message=>{if(message.type()==="error"&&/hydrat|server rendered|did not match/i.test(message.text()))errors.push(message.text());});
      return {context,page};
    };
    const measure=async(page:Page,label:string)=>{
      await page.evaluate(()=>document.fonts.ready.then(()=>undefined));
      const report=await scan(page,viewport.width+"/round3/"+label);
      if(label==="landing") expect(report.violations.filter(rule=>["color-contrast","label-content-name-mismatch"].includes(rule.id))).toEqual([]);
      scanned.push(label);
    };
    const {context,page}=await openContext("owner");
    let inspectorState:string;
    try{
      await page.goto(origin+"/round3-settings");
      await expect(page.getByRole("heading",{name:"Settings",exact:true})).toBeVisible();
      await expect(page.getByText("review@example.invalid",{exact:true}).first()).toBeVisible();
      await measure(page,"settings");
      if(viewport.width===390){
        const nav=page.getByRole("button",{name:"Open navigation"});
        await expect(nav).toBeVisible();
        await nav.press("Enter");
        const sidebar=page.getByRole("dialog",{name:"RenderLab navigation"});
        await expect(sidebar).toBeVisible();
        await expect(sidebar.getByRole("navigation",{name:"Workspace navigation"})).toBeVisible();
        await measure(page,"sidebar");
        await page.keyboard.press("Escape");
        await expect(sidebar).toHaveCount(0);
        await expect(nav).toBeFocused();
      }else{
        await expect(page.getByRole("navigation",{name:"Primary navigation"})).toBeVisible();
      }
      await page.goto(origin+"/admin");
      await expect(page.getByRole("heading",{name:"Admin",exact:true})).toBeVisible();
      await measure(page,"admin");
      await page.goto(origin+"/round3-library");
      await expect(page.getByRole("heading",{name:"Library",exact:true})).toBeVisible();
      const tile=page.getByRole("link",{name:"Open First image image Nov 24",exact:true});
      await expect(tile).toBeVisible();
      await measure(page,"library-grid");
      await page.getByRole("button",{name:"Select",exact:true}).press("Enter");
      const checkbox=page.getByRole("checkbox",{name:"Select First image"});
      await expect(checkbox).not.toBeChecked();
      await measure(page,"library-selection-empty");
      await checkbox.press("Space");
      await expect(checkbox).toBeChecked();
      await measure(page,"library-selection");
      await page.goto(origin+"/round3-library");
      if(viewport.width===1440){
        await page.goto(origin+"/round3-library?inspect="+firstAsset.id);
        const inspector=page.getByRole("complementary",{name:"Media inspector"});
        await expect(inspector.getByRole("heading",{name:"First image",exact:true})).toBeVisible();
        inspectorState="library-inspector";
      }else{
        // SSR starts with the desktop viewer link. Require the hydrated phone
        // inspector contract before opening the fixture's equivalent route.
        await expect(tile).toHaveAttribute("href","/library?inspect="+firstAsset.id);
        await page.goto(origin+"/round3-library?inspect="+firstAsset.id);
        const sheet=page.getByRole("dialog",{name:"Media inspector"});
        await expect(sheet.getByRole("heading",{name:"First image",exact:true})).toBeVisible();
        await expect(sheet.getByRole("link",{name:"Open Viewer",exact:true})).toHaveAttribute("href","/library/"+firstAsset.id);
        inspectorState="library-phone-sheet";
      }
      await measure(page,inspectorState);
    }finally{await context.close();}
    const publicPage=await openContext("signed-out");
    try{
      await publicPage.page.goto(origin+"/?landing-review=1");
      await expect(publicPage.page.locator("[data-landing-header]").getByRole("link",{name:"Sign in",exact:true})).toBeVisible();
      await expect(publicPage.page.getByRole("heading",{level:1})).toBeVisible();
      await measure(publicPage.page,"landing");
    }finally{await publicPage.context.close();}
    expect(scanned).toEqual(["settings",...(viewport.width===390?["sidebar"]:[]),"admin","library-grid","library-selection-empty","library-selection",inspectorState!,"landing"]);
    console.log("AXE ROUND3 STATE COVERAGE",viewport.width,JSON.stringify(scanned));
    expect(unexpected).toEqual([]);
    expect(errors).toEqual([]);
  });
}
