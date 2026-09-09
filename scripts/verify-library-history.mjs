import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { mkdir } from "node:fs/promises";
import process from "node:process";

import { createConfiguredTestAccount, deleteConfiguredTestAccount } from "./lib/configured-test-account.mjs";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.RENDERLAB_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const cleanupOnly = process.argv.includes("--cleanup-only");
const artifactDir = "artifacts";
const token = "History fixture";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function signCookie(value, secret) {
  const signature = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${signature}`;
}

async function setSupabaseSessionCookies(context, account) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue = JSON.stringify({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: account.user,
  });

  await context.addCookies([
    {
      name: cookieName,
      value: `base64-${Buffer.from(cookieValue).toString("base64")}`,
      domain: new URL(baseUrl).hostname,
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

async function createFixtureAsset(ownerId, name, createdAt, kind = "image") {
  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const objectKey = `library-history/${id}.${kind === "image" ? "png" : "mp4"}`;
  const { error } = await admin.from("media_assets").insert({
    id,
    owner_id: ownerId,
    kind,
    display_name: name,
    original_filename: `${name}.${kind === "image" ? "png" : "mp4"}`,
    mime_type: kind === "image" ? "image/png" : "video/mp4",
    r2_object_key: objectKey,
    size_bytes: 128,
    width: kind === "image" ? 1200 : 1920,
    height: kind === "image" ? 900 : 1080,
    duration_seconds: kind === "image" ? null : 4,
    created_at: createdAt,
    updated_at: nowIso,
  });
  if (error) throw new Error(`Could not seed Library history fixture: ${error.message}`);
  return { id, name, objectKey };
}

async function cleanupFixtures(ownerId = null) {
  let query = admin.from("media_assets").select("id, r2_object_key, owner_id").ilike("display_name", `${token}%`);
  if (ownerId) query = query.eq("owner_id", ownerId);
  const { data, error } = await query;
  if (error) throw new Error(`Could not list Library history fixtures for cleanup: ${error.message}`);
  const ids = (data ?? []).map((row) => row.id);
  if (ids.length > 0) {
    const { error: deleteError } = await admin.from("media_assets").delete().in("id", ids);
    if (deleteError) throw new Error(`Could not delete Library history fixtures: ${deleteError.message}`);
  }
  console.log(`Cleaned configured Library history fixture assets=${ids.join(",") || "none"}.`);
}

async function orderedFixtureHrefs(page, fixtureIds) {
  return page.locator("[data-library-grid] a[href^='/library/']").evaluateAll((nodes, ids) => {
    const fixtureSet = new Set(ids);
    return nodes
      .map((node) => node.getAttribute("href"))
      .filter((href) => href && fixtureSet.has(href.split("/").at(-1)));
  }, fixtureIds);
}

async function controlBox(page, label) {
  return page.getByRole("button", { name: label }).boundingBox();
}

if (cleanupOnly) {
  await cleanupFixtures();
  process.exit(0);
}

await mkdir(artifactDir, { recursive: true });

const account = await createConfiguredTestAccount({ admin, label: "library-history" });
let browser;
let older;
let newer;
try {
  const now = Date.now();
  older = await createFixtureAsset(account.user.id, `${token} Older`, new Date(now - 86_400_000).toISOString());
  newer = await createFixtureAsset(account.user.id, `${token} Newer`, new Date(now - 3_600_000).toISOString());

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await setSupabaseSessionCookies(context, account);
  const page = await context.newPage();

  await page.goto(`${baseUrl}/library?q=${encodeURIComponent(token)}`, { waitUntil: "networkidle" });
  const newestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);
  assert(newestOrder[0] === `/library/${newer.id}` && newestOrder[1] === `/library/${older.id}`, `Browser newest-first order was incorrect: ${JSON.stringify(newestOrder)}`);

  const favoritesBox = await controlBox(page, "Favorites");
  const collectionsBox = await controlBox(page, "Collections");
  const sortBox = await page.getByRole("link", { name: /^Newest first\. Switch to oldest first\.$/ }).boundingBox();
  assert(favoritesBox && collectionsBox && sortBox, "Could not measure Library action controls.");
  assert(Math.abs(favoritesBox.y + favoritesBox.height / 2 - (collectionsBox.y + collectionsBox.height / 2)) <= 1, `Favorites and Collections centers are misaligned: ${JSON.stringify({ favoritesBox, collectionsBox })}`);
  assert(Math.abs(collectionsBox.y + collectionsBox.height / 2 - (sortBox.y + sortBox.height / 2)) <= 1, `Collections and sort centers are misaligned: ${JSON.stringify({ collectionsBox, sortBox })}`);
  assert(Math.abs(favoritesBox.height - collectionsBox.height) <= 1 && Math.abs(collectionsBox.height - sortBox.height) <= 1, `Library action heights are inconsistent: ${JSON.stringify({ favoritesBox, collectionsBox, sortBox })}`);

  await page.getByRole("link", { name: /^Newest first\. Switch to oldest first\.$/ }).click();
  await page.waitForLoadState("networkidle");
  const oldestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);
  assert(oldestOrder[0] === `/library/${older.id}` && oldestOrder[1] === `/library/${newer.id}`, `Browser oldest-first order was incorrect: ${JSON.stringify(oldestOrder)}`);

  await page.getByRole("button", { name: "Select", exact: true }).click();
  const olderCheckbox = page.getByRole("checkbox", { name: `Select ${token} Older`, exact: true });
  await olderCheckbox.waitFor({ state: "visible", timeout: 30_000 });
  const checkboxHitBox = await olderCheckbox.boundingBox();
  assert(checkboxHitBox && checkboxHitBox.width >= 43 && checkboxHitBox.height >= 43, `Library selection checkbox lost its practical hit target: ${JSON.stringify(checkboxHitBox)}`);
  const checkboxVisualBox = await olderCheckbox.evaluate((node) => {
    const visual = getComputedStyle(node, "::before");
    return { width: visual.width, height: visual.height };
  });
  assert(checkboxVisualBox.width === "22px" && checkboxVisualBox.height === "22px", `Library selection checkbox visual box is not compact: ${JSON.stringify(checkboxVisualBox)}`);
  await olderCheckbox.click();
  assert(await olderCheckbox.getAttribute("data-state") === "checked", "Library selection checkbox did not enter checked state.");

  const olderCard = page.locator(`a[href="/library/${older.id}"]`);
  const cardBox = await olderCard.boundingBox();
  const frameBox = await olderCard.locator(".kinetic-media-frame").boundingBox();
  assert(cardBox && frameBox && Math.abs(cardBox.height - frameBox.height) <= 2.1, `Library media card metadata is still consuming a separate footer row: ${JSON.stringify({ cardBox, frameBox })}`);
  const metadataPosition = await olderCard.locator(".kinetic-media-meta").evaluate((node) => getComputedStyle(node).position);
  assert(metadataPosition === "absolute", `Library media metadata is not integrated over the media frame: ${metadataPosition}`);
  await page.screenshot({ path: `${artifactDir}/library-history-desktop-selected-card.png`, fullPage: true });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  const imagesHref = await page.getByRole("link", { name: "Images", exact: true }).getAttribute("href");
  assert(imagesHref === `/library?kind=image&q=${encodeURIComponent(token).replace(/%20/g, "+")}&sort=oldest`, `Kind link did not preserve oldest-first state: ${imagesHref}`);

  await page.screenshot({ path: `${artifactDir}/library-history-desktop-oldest.png`, fullPage: true });

  await page.screenshot({ path: `${artifactDir}/library-history-desktop-oldest-toggle.png`, fullPage: true });
  await page.getByRole("link", { name: /^Oldest first\. Switch to newest first\.$/ }).click();
  await page.waitForLoadState("networkidle");
  assert(new URL(page.url()).searchParams.get("sort") === null, `Newest direct sort toggle did not return to the canonical default URL: ${page.url()}`);

  const videoFilterHref = await page.getByRole("link", { name: "Videos", exact: true }).getAttribute("href");
  assert(videoFilterHref === `/library?kind=video&q=${encodeURIComponent(token).replace(/%20/g, "+")}`, `Video filter link did not preserve newest-default state: ${videoFilterHref}`);
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await setSupabaseSessionCookies(mobileContext, account);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${baseUrl}/library?q=${encodeURIComponent(token)}`, { waitUntil: "networkidle" });
  assert(await mobilePage.getByRole("link", { name: /^Newest first\. Switch to oldest first\.$/ }).isVisible(), "Library history sort toggle is not visible on mobile.");
  await mobilePage.screenshot({ path: `${artifactDir}/library-history-mobile-newest.png`, fullPage: true });
  await mobilePage.getByRole("button", { name: "Select", exact: true }).click();
  const mobileCheckbox = mobilePage.getByRole("checkbox").first();
  await mobileCheckbox.click();
  await mobilePage.screenshot({ path: `${artifactDir}/library-history-mobile-selected-card.png`, fullPage: true });
  await mobileContext.close();
} finally {
  if (browser) await browser.close();
  await cleanupFixtures(account.user.id).catch((error) => console.error(error));
  await deleteConfiguredTestAccount({ admin, account }).catch((error) => console.error(error));
}
