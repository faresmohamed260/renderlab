import { test, expect } from "@playwright/test";
import { fixtureImage } from "../component-app/fixtures";

for (const width of [1440,390]) {
  test("Landing and workspace shell retain real route semantics at " + width, async ({page,context})=>{
    await page.setViewportSize({width,height:844});
    await context.setExtraHTTPHeaders({"x-renderlab-fixture-shell":"signed-out"});
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    await context.route("**/*",route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.hostname==="images.unsplash.com"&&request.resourceType()==="image")return route.fulfill({contentType:"image/png",body:Buffer.from(fixtureImage.split(",")[1],"base64")});
      if(url.origin!=="http://127.0.0.1:4173")return route.abort();
      if(url.pathname==="/api/account/profile")return route.fulfill({json:{profile:{displayName:"Synthetic Member"}}});
      if(url.pathname==="/api/account/profile/avatar")return route.fulfill({status:404});
      if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/create-preview/"))return route.abort();
      return route.continue();
    });
    await page.goto("/?landing-review=1");
    await expect(page.locator("[data-landing-header]")).toBeVisible();
    await expect(page.locator(".preview-navigation-header")).toHaveCount(0);
    await page.goto("/library");
    await expect(page.locator(".preview-navigation-header")).toHaveCount(1);
    await expect(page.getByRole("heading",{name:"Library",exact:true})).toBeVisible();
    if(width===390)await expect(page.getByRole("button",{name:"Open navigation"})).toBeVisible();
    else await expect(page.getByRole("navigation",{name:"Primary navigation"})).toBeVisible();
    await page.goBack();
    await expect(page.locator("[data-landing-header]")).toBeVisible();
    await expect(page.locator(".preview-navigation-header")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
  test("signed-in Landing keeps the existing legacy account header at " + width, async ({page,context})=>{
    await page.setViewportSize({width,height:844});
    await context.setExtraHTTPHeaders({"x-renderlab-fixture-shell":"member"});
    await context.route("**/*",route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.hostname==="images.unsplash.com"&&request.resourceType()==="image")return route.fulfill({contentType:"image/png",body:Buffer.from(fixtureImage.split(",")[1],"base64")});
      if(url.origin!=="http://127.0.0.1:4173")return route.abort();
      if(url.pathname==="/api/account/profile")return route.fulfill({json:{profile:{displayName:"Synthetic Member"}}});
      if(url.pathname==="/api/account/profile/avatar")return route.fulfill({status:404});
      if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/create-preview/"))return route.abort();
      return route.continue();
    });
    await page.goto("/?landing-review=1");
    await expect(page.locator("[data-landing-header]")).toBeVisible();
    await expect(page.locator(".preview-navigation-header")).toHaveCount(1);
    await expect(page.locator(".preview-navigation-header").getByRole("button",{name:/Account menu/})).toBeVisible();
  });
}
