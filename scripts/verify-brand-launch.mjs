import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const canonicalOrigin = "https://renderlab-lake.vercel.app";
const artifactDir = "artifacts";
const lockedBowlPath = "M56 0H88A34 34 0 0 1 122 34V49A34 34 0 0 1 88 83H56Z";
const lockedBottomRightPath = "M75 91H89A33 33 0 0 1 122 124V132H75Q71 132 71 128V95Q71 91 75 91Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

async function verifyFocus(page, locator, label) {
  await locator.focus();
  const focusState = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focused: document.activeElement === element,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  assert(focusState.focused, `${label} could not receive keyboard focus.`);
  const hasOutline = focusState.outlineStyle !== "none" && focusState.outlineWidth !== "0px";
  const hasRing = focusState.boxShadow !== "none" && focusState.boxShadow !== "";
  assert(hasOutline || hasRing, `${label} has no visible focus treatment.`);
}

async function verifyLockedBrand(page, label) {
  const brand = page.locator('[data-renderlab-brand="locked-lab-grid"]').first();
  await brand.waitFor();
  const mark = brand.locator('svg[data-renderlab-mark="lab-grid"]');
  assert(await mark.count() === 1, `${label} does not render the locked Lab Grid mark.`);

  const renderPart = brand.locator('[data-renderlab-wordmark-part="render"]');
  const labPart = brand.locator('[data-renderlab-wordmark-part="lab"]');
  assert((await renderPart.textContent()) === "Render", `${label} Render wordmark segment changed.`);
  assert((await labPart.textContent()) === "Lab", `${label} Lab wordmark segment changed.`);

  const paths = await mark.locator("path").evaluateAll((elements) => elements.map((element) => element.getAttribute("d")));
  assert(paths.includes(lockedBowlPath), `${label} lost the locked upper bowl geometry.`);
  assert(paths.includes(lockedBottomRightPath), `${label} lost the locked lower-right quarter-arc geometry.`);
}

async function waitForLandingMedia(page, label) {
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('[data-landing-experience] img')];
    return images.length >= 16 && images.every((image) => image.complete && image.naturalWidth > 100 && image.naturalHeight > 100);
  }, null, { timeout: 60_000 });
  const count = await page.locator('[data-landing-experience] img').count();
  assert(count >= 16, `${label} has too few loaded media objects: ${count}.`);
}

async function verifyQuarterArc(page, label) {
  const sources = page.locator('[data-renderlab-br-source]');
  assert(await sources.count() === 1, `${label} does not expose exactly one canonical quarter-arc mask source.`);
  assert((await sources.first().getAttribute("data-renderlab-br-source")) === lockedBottomRightPath, `${label} quarter-arc mask is not sourced from the locked mark path.`);

  const cells = page.locator('[data-quarter-arc="locked"]');
  assert(await cells.count() === 2, `${label} must render the locked quarter-arc media module in Hero and Resolve.`);
  for (let index = 0; index < 2; index += 1) {
    const clip = await cells.nth(index).evaluate((element) => getComputedStyle(element).clipPath);
    assert(clip.includes("renderlab-br-quarter-mask"), `${label} quarter-arc instance ${index} fell back to rounded-rectangle geometry: ${clip}`);
  }
}

async function setSectionProgress(page, selector, progress) {
  await page.evaluate(({ selector: targetSelector, progress: targetProgress }) => {
    const section = document.querySelector(targetSelector);
    if (!(section instanceof HTMLElement)) throw new Error(`Missing ${targetSelector}`);
    const viewport = window.innerHeight;
    const usable = Math.max(1, section.offsetHeight - viewport);
    window.scrollTo({ top: section.offsetTop + usable * targetProgress, behavior: "instant" });
  }, { selector, progress });
  await page.waitForTimeout(450);
}

await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const runtimeErrors = [];
  desktop.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  desktop.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });

  await desktop.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  assert(new URL(desktop.url()).pathname === "/", "Bare root did not remain the landing route.");
  await desktop.getByRole("heading", { name: "Render what you imagine." }).waitFor();
  assert(await desktop.getByRole("complementary", { name: "Application navigation" }).count() === 0, "Landing unexpectedly rendered AppShell navigation.");
  assert(await desktop.locator('[data-landing-experience="approved-lab-matrix"]').count() === 1, "Approved Landing experience root is missing.");
  assert(await desktop.locator('[data-landing-section]').count() === 4, "Landing does not contain exactly four approved sections.");
  await verifyLockedBrand(desktop, "Landing brand");
  await waitForLandingMedia(desktop, "Desktop landing");
  await verifyQuarterArc(desktop, "Desktop landing");

  const openCreate = desktop.getByRole("link", { name: /Open Create/ }).first();
  const signIn = desktop.getByRole("link", { name: "Sign in", exact: true }).first();
  assert((await openCreate.getAttribute("href")) === "/create", "Landing Open Create CTA does not target /create.");
  assert((await signIn.getAttribute("href")) === "/settings", "Landing Sign in CTA does not target /settings.");
  await desktop.getByText("Closed beta · invitation only", { exact: true }).first().waitFor();
  await desktop.getByText("No public sign-up", { exact: true }).waitFor();
  await desktop.getByRole("heading", { name: "Make it. Shape it. Move it. Keep going." }).waitFor();
  await desktop.getByRole("heading", { name: "Every result stays alive." }).waitFor();
  await desktop.getByRole("heading", { name: "Keep the thread moving." }).waitFor();

  for (const forbidden of ["Pricing", "Testimonials", "Join waitlist", "Create account"]) {
    assert(await desktop.getByText(forbidden, { exact: false }).count() === 0, `Landing exposes forbidden launch claim/control: ${forbidden}`);
  }

  await assertNoHorizontalOverflow(desktop, "Desktop landing");
  await verifyFocus(desktop, openCreate, "Open Create");
  await verifyFocus(desktop, signIn, "Sign in");
  await desktop.screenshot({ path: `${artifactDir}/brand-launch-desktop-hero.png` });

  await setSectionProgress(desktop, '[data-landing-section="thread"]', 0.58);
  const threadStage = desktop.locator('[data-landing-section="thread"] [data-active]').first();
  assert((await threadStage.getAttribute("data-active")) === "2", "Thread did not reach Motion state at expected scroll progress.");
  await desktop.screenshot({ path: `${artifactDir}/brand-launch-desktop-thread-motion.png` });
  await setSectionProgress(desktop, '[data-landing-section="thread"]', 0.08);
  assert((await threadStage.getAttribute("data-active")) === "0", "Thread did not reverse to Create state.");

  await desktop.locator('[data-landing-section="library"]').scrollIntoViewIfNeeded();
  const libraryCard = desktop.locator('[data-library-card="2"]');
  await libraryCard.focus();
  await desktop.waitForTimeout(220);
  assert((await libraryCard.getAttribute("aria-pressed")) === "true", "Keyboard focus did not select Living Library media.");
  await desktop.getByRole("heading", { name: "Motion test" }).waitFor();
  await desktop.screenshot({ path: `${artifactDir}/brand-launch-desktop-library-focus.png` });

  await setSectionProgress(desktop, '[data-landing-section="resolve"]', 0.96);
  await desktop.waitForTimeout(250);
  await verifyQuarterArc(desktop, "Resolved desktop landing");
  await desktop.screenshot({ path: `${artifactDir}/brand-launch-desktop-resolved.png` });
  await setSectionProgress(desktop, '[data-landing-section="resolve"]', 0.12);
  await desktop.screenshot({ path: `${artifactDir}/brand-launch-desktop-resolve-reverse.png` });

  assert(runtimeErrors.length === 0, `Landing runtime errors: ${runtimeErrors.join(" | ")}`);

  const title = await desktop.title();
  assert(title.includes("RenderLab") && title.includes("Image & video"), `Unexpected landing title: ${title}`);
  const description = await desktop.locator('meta[name="description"]').getAttribute("content");
  assert(description?.includes("Create images and videos"), "Launch metadata description is missing or untruthful.");

  const icon = await desktop.request.get(`${baseUrl}/icon.svg`);
  assert(icon.ok(), `Brand icon unavailable: ${icon.status()}`);
  const iconBody = await icon.text();
  assert(iconBody.includes(lockedBowlPath), "App icon does not use the locked Lab Grid bowl geometry.");
  assert(iconBody.includes(lockedBottomRightPath), "App icon does not preserve the locked lower-right quarter-arc geometry.");
  assert(iconBody.includes("#F7C7F1") && iconBody.includes("#73D7FF"), "App icon lost the locked cyan/blue/violet/pink color character.");

  const publicMark = await desktop.request.get(`${baseUrl}/renderlab-mark.svg`);
  assert(publicMark.ok(), `Public RenderLab mark unavailable: ${publicMark.status()}`);
  const publicMarkBody = await publicMark.text();
  assert(publicMarkBody.includes(lockedBowlPath), "Public RenderLab mark does not use the locked Lab Grid geometry.");
  assert(publicMarkBody.includes(lockedBottomRightPath), "Public RenderLab mark lost the lower-right quarter-arc geometry.");

  const og = desktop.locator('meta[property="og:image"]');
  assert(await og.count() > 0, "Open Graph image metadata is missing.");
  const ogUrl = await og.first().getAttribute("content");
  assert(Boolean(ogUrl), "Open Graph image URL is empty.");
  const parsedOgUrl = new URL(ogUrl, baseUrl);
  assert(parsedOgUrl.origin === canonicalOrigin, `Open Graph metadata uses unexpected origin: ${parsedOgUrl.origin}`);
  assert(parsedOgUrl.pathname.startsWith("/opengraph-image"), `Unexpected Open Graph image path: ${parsedOgUrl.pathname}`);
  const ogResponse = await desktop.request.get(`${baseUrl}${parsedOgUrl.pathname}${parsedOgUrl.search}`);
  assert(ogResponse.ok(), `Open Graph image failed locally: ${ogResponse.status()}`);
  assert((ogResponse.headers()["content-type"] || "").includes("image/png"), "Open Graph image is not PNG.");

  const create = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
  await create.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
  await create.getByRole("complementary", { name: "Application navigation" }).waitFor();
  await create.getByRole("textbox", { name: "Prompt" }).waitFor();
  const currentCreate = create.getByRole("link", { name: "Create", exact: true }).first();
  assert((await currentCreate.getAttribute("aria-current")) === "page", "Create nav is not active on /create.");
  const shellBrand = create.getByRole("link", { name: "Open Create workspace" }).first();
  assert((await shellBrand.getAttribute("href")) === "/create", "AppShell brand does not return to /create.");
  await verifyLockedBrand(create, "Application shell brand");
  await create.screenshot({ path: `${artifactDir}/brand-launch-create-shell.png`, fullPage: true });

  const legacy = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const source = "00000000-0000-4000-8000-000000000000";
  await legacy.goto(`${baseUrl}/?source=${source}&action=edit-image&campaign=legacy`, { waitUntil: "networkidle", timeout: 60_000 });
  const legacyUrl = new URL(legacy.url());
  assert(legacyUrl.pathname === "/create", `Legacy continuation did not redirect to /create: ${legacyUrl.pathname}`);
  assert(legacyUrl.searchParams.get("source") === source, "Legacy redirect lost source query intent.");
  assert(legacyUrl.searchParams.get("action") === "edit-image", "Legacy redirect lost action query intent.");
  assert(legacyUrl.searchParams.get("campaign") === "legacy", "Legacy redirect did not preserve unrelated query intent.");
  await legacy.getByText("Sign in from Settings to continue from private RenderLab media.").waitFor();
  await legacy.screenshot({ path: `${artifactDir}/brand-launch-legacy-continuation.png`, fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const mobileErrors = [];
  mobile.on("pageerror", (error) => mobileErrors.push(`pageerror: ${error.message}`));
  mobile.on("console", (message) => {
    if (message.type() === "error") mobileErrors.push(`console: ${message.text()}`);
  });
  await mobile.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await mobile.getByRole("heading", { name: "Render what you imagine." }).waitFor();
  await waitForLandingMedia(mobile, "Narrow landing");
  await verifyLockedBrand(mobile, "Narrow landing brand");
  await verifyQuarterArc(mobile, "Narrow landing");
  await assertNoHorizontalOverflow(mobile, "Narrow landing");
  const animations = await mobile.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(animations === 0, `Reduced-motion landing has ${animations} running animation(s).`);
  await mobile.locator('[data-landing-section="thread"]').scrollIntoViewIfNeeded();
  await mobile.getByRole("heading", { name: "Make it. Shape it. Move it. Keep going." }).waitFor();
  await mobile.locator('[data-landing-section="library"]').scrollIntoViewIfNeeded();
  const mobileCard = mobile.locator('[data-library-card="3"]');
  await mobileCard.click();
  assert((await mobileCard.getAttribute("aria-pressed")) === "true", "Touch/click selection did not update Living Library state.");
  await mobile.locator('[data-landing-section="resolve"]').scrollIntoViewIfNeeded();
  await mobile.getByText("No public sign-up", { exact: true }).waitFor();
  await mobile.screenshot({ path: `${artifactDir}/brand-launch-mobile.png`, fullPage: true });
  assert(mobileErrors.length === 0, `Narrow landing runtime errors: ${mobileErrors.join(" | ")}`);

  console.log("Brand / Launch Visual verified successfully.");
} finally {
  await browser.close();
}
