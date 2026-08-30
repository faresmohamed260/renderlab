import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = (process.env.RENDERLAB_TEST_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const artifactDir = "artifacts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

async function verifyFocus(page, locator, label) {
  await locator.focus();
  const focused = await locator.evaluate((element) => document.activeElement === element);
  assert(focused, `${label} could not receive keyboard focus.`);
  const outline = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  assert(outline.style !== "none" && outline.width !== "0px", `${label} has no visible focus outline.`);
}

await mkdir(artifactDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await desktop.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
  assert(new URL(desktop.url()).pathname === "/", "Bare root did not remain the landing route.");
  await desktop.getByRole("heading", { name: "Create images. Shape them. Put them in motion." }).waitFor();
  assert(await desktop.getByRole("navigation", { name: "Application navigation" }).count() === 0, "Landing unexpectedly rendered AppShell navigation.");
  const openCreate = desktop.getByRole("link", { name: /Open Create/ }).first();
  const signIn = desktop.getByRole("link", { name: "Sign in", exact: true }).first();
  assert((await openCreate.getAttribute("href")) === "/create", "Landing Open Create CTA does not target /create.");
  assert((await signIn.getAttribute("href")) === "/settings", "Landing Sign in CTA does not target /settings.");
  await desktop.getByText("Invitation-only access · No public sign-up").waitFor();
  for (const label of ["Create Image", "Edit Image", "Create Video", "Animate Image"]) {
    await desktop.getByText(label, { exact: true }).first().waitFor();
  }
  for (const forbidden of ["Pricing", "Testimonials", "Join waitlist", "Create account"]) {
    assert(await desktop.getByText(forbidden, { exact: false }).count() === 0, `Landing exposes forbidden launch claim/control: ${forbidden}`);
  }
  await assertNoHorizontalOverflow(desktop, "Desktop landing");
  await verifyFocus(desktop, openCreate, "Open Create");
  await verifyFocus(desktop, signIn, "Sign in");
  const title = await desktop.title();
  assert(title.includes("RenderLab") && title.includes("Image & video"), `Unexpected landing title: ${title}`);
  const description = await desktop.locator('meta[name="description"]').getAttribute("content");
  assert(description?.includes("Create images and videos"), "Launch metadata description is missing or untruthful.");
  const icon = await desktop.request.get(`${baseUrl}/icon.svg`);
  assert(icon.ok(), `Brand icon unavailable: ${icon.status()}`);
  const og = desktop.locator('meta[property="og:image"]');
  assert(await og.count() > 0, "Open Graph image metadata is missing.");
  const ogUrl = await og.first().getAttribute("content");
  assert(Boolean(ogUrl), "Open Graph image URL is empty.");
  const ogResponse = await desktop.request.get(new URL(ogUrl, baseUrl).toString());
  assert(ogResponse.ok(), `Open Graph image failed: ${ogResponse.status()}`);
  assert((ogResponse.headers()["content-type"] || "").includes("image/png"), "Open Graph image is not PNG.");
  await desktop.screenshot({ path: `${artifactDir}/brand-launch-desktop.png`, fullPage: true });

  const create = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
  await create.goto(`${baseUrl}/create`, { waitUntil: "networkidle", timeout: 60_000 });
  await create.getByRole("navigation", { name: "Application navigation" }).waitFor();
  await create.getByRole("textbox", { name: "Prompt" }).waitFor();
  const currentCreate = create.getByRole("link", { name: "Create", exact: true }).first();
  assert((await currentCreate.getAttribute("aria-current")) === "page", "Create nav is not active on /create.");
  const shellBrand = create.getByRole("link", { name: "Open Create workspace" }).first();
  assert((await shellBrand.getAttribute("href")) === "/create", "AppShell brand does not return to /create.");
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
  await mobile.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });
  await mobile.getByRole("heading", { name: "Create images. Shape them. Put them in motion." }).waitFor();
  await mobile.getByRole("link", { name: /Open Create/ }).first().waitFor();
  await mobile.getByRole("link", { name: "Sign in", exact: true }).first().waitFor();
  await assertNoHorizontalOverflow(mobile, "Narrow landing");
  const animations = await mobile.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(animations === 0, `Reduced-motion landing has ${animations} running animation(s).`);
  await mobile.screenshot({ path: `${artifactDir}/brand-launch-mobile.png`, fullPage: true });

  console.log("Brand / Launch Visual verified successfully.");
} finally {
  await browser.close();
}
