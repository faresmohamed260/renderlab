from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# Activity: preserve all lifecycle/retry/privacy assertions and add visual evidence for
# signed-out narrow and active narrow reduced-motion states.
replace_once(
    "scripts/verify-activity.mjs",
    '''function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function wait(ms) {''',
    '''function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

function wait(ms) {''',
)
replace_once(
    "scripts/verify-activity.mjs",
    '''  await signedOutPage.getByRole("heading", { name: "Sign in to view Activity" }).waitFor({ state: "visible", timeout: 30_000 });
  assert((await signedOutPage.getByText("Nebula active study").count()) === 0, "Signed-out Activity exposed private job data.");
  assertRetryError(await postRetry(signedOutPage, retryImageJob.id), 401, "authentication_required", "Signed-out Retry");
  await signedOutContext.close();''',
    '''  await signedOutPage.getByRole("heading", { name: "Sign in to view Activity" }).waitFor({ state: "visible", timeout: 30_000 });
  assert((await signedOutPage.getByText("Nebula active study").count()) === 0, "Signed-out Activity exposed private job data.");
  assertRetryError(await postRetry(signedOutPage, retryImageJob.id), 401, "authentication_required", "Signed-out Retry");
  await signedOutPage.setViewportSize({ width: 390, height: 844 });
  await assertNoHorizontalOverflow(signedOutPage, "Signed-out narrow Activity");
  await signedOutPage.screenshot({ path: `${artifactDir}/activity-signed-out-mobile.png`, fullPage: true });
  await signedOutContext.close();''',
)
replace_once(
    "scripts/verify-activity.mjs",
    '''  await page.screenshot({ path: `${artifactDir}/activity-desktop.png`, fullPage: true });
  await page.screenshot({ path: `${artifactDir}/activity-retry-desktop.png`, fullPage: true });

  await page.goto(`${baseUrl}/activity?offset=20`, { waitUntil: "networkidle", timeout: 60_000 });''',
    '''  await page.screenshot({ path: `${artifactDir}/activity-desktop.png`, fullPage: true });
  await page.screenshot({ path: `${artifactDir}/activity-retry-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertNoHorizontalOverflow(page, "Narrow reduced-motion Activity");
  await page.getByText("Nebula active study", { exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Retry", exact: true }).first().waitFor({ state: "visible" });
  const activityAnimations = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
  assert(activityAnimations === 0, `Reduced-motion Activity has ${activityAnimations} running animation(s).`);
  await page.screenshot({ path: `${artifactDir}/activity-mobile-reduced-motion.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.goto(`${baseUrl}/activity?offset=20`, { waitUntil: "networkidle", timeout: 60_000 });''',
)

# Settings: preserve auth/security/revocation behavior and add signed-out desktop/mobile plus
# signed-in mobile reduced-motion visual evidence.
replace_once(
    "scripts/verify-account-identity.mjs",
    '''function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function jwtPayload(token) {''',
    '''function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

function jwtPayload(token) {''',
)
replace_once(
    "scripts/verify-account-identity.mjs",
    '''  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Account", exact: true }).waitFor({ state: "visible" });
  await page.getByLabel("Email").fill(email);''',
    '''  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Account", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor({ state: "visible" });
  await assertNoHorizontalOverflow(page, "Desktop signed-out Settings");
  await page.screenshot({ path: `${artifactDir}/account-identity-desktop-signed-out.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertNoHorizontalOverflow(page, "Narrow signed-out Settings");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-out.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByLabel("Email").fill(email);''',
)
replace_once(
    "scripts/verify-account-identity.mjs",
    '''  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-in.png`, fullPage: true });''',
    '''  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("Active", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertNoHorizontalOverflow(page, "Narrow signed-in Settings");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-in.png`, fullPage: true });''',
)
