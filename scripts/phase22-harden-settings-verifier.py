from pathlib import Path

path = Path("scripts/verify-account-identity.mjs")
text = path.read_text()

old = '''async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

function jwtPayload(token) {'''
new = '''async function assertNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has horizontal overflow: ${overflow}px`);
}

async function assertReachableAfterBottomScroll(page, locator, label) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(80);
  const state = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const top = document.elementFromPoint(x, y);
    return {
      inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight,
      topmost: Boolean(top && (top === element || element.contains(top))),
      topTag: top?.tagName ?? null,
    };
  });
  assert(state.inViewport, `${label} could not be brought fully into the mobile viewport.`);
  assert(state.topmost, `${label} remains occluded after bottom scroll (top element: ${state.topTag ?? "none"}).`);
}

function jwtPayload(token) {'''
if text.count(old) != 1:
    raise SystemExit(f"expected helper insertion point once, found {text.count(old)}")
text = text.replace(old, new, 1)

old = '''  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor({ state: "visible" });
  await assertNoHorizontalOverflow(page, "Desktop signed-out Settings");'''
new = '''  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor({ state: "visible" });
  assert(await page.getByRole("link", { name: "Open Admin", exact: true }).count() === 0, "Signed-out Settings exposed the Admin operations link.");
  await assertNoHorizontalOverflow(page, "Desktop signed-out Settings");'''
if text.count(old) != 1:
    raise SystemExit(f"expected signed-out assertion point once, found {text.count(old)}")
text = text.replace(old, new, 1)

old = '''  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertNoHorizontalOverflow(page, "Narrow signed-in Settings");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-in.png`, fullPage: true });

  await setAccessStatus("suspended");'''
new = '''  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await assertNoHorizontalOverflow(page, "Narrow signed-in Settings");
  await assertReachableAfterBottomScroll(page, page.getByRole("link", { name: "Change password", exact: true }), "Narrow Settings Change password");
  await assertReachableAfterBottomScroll(page, page.getByRole("button", { name: "Sign out", exact: true }), "Narrow Settings Sign out");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-in-actions.png` });
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-signed-in.png`, fullPage: true });

  await setAccessStatus("suspended");'''
if text.count(old) != 1:
    raise SystemExit(f"expected signed-in mobile point once, found {text.count(old)}")
text = text.replace(old, new, 1)

old = '''  const deniedMedia = await page.request.get(`${baseUrl}/api/media/assets`);
  assert(deniedMedia.status() === 401, `Suspended account media API expected 401, got ${deniedMedia.status()}.`);
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-suspended.png`, fullPage: true });'''
new = '''  const deniedMedia = await page.request.get(`${baseUrl}/api/media/assets`);
  assert(deniedMedia.status() === 401, `Suspended account media API expected 401, got ${deniedMedia.status()}.`);
  await assertReachableAfterBottomScroll(page, page.getByRole("link", { name: "Change password", exact: true }), "Suspended Settings Change password");
  await assertReachableAfterBottomScroll(page, page.getByRole("button", { name: "Sign out", exact: true }), "Suspended Settings Sign out");
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-suspended-actions.png` });
  await page.screenshot({ path: `${artifactDir}/account-identity-mobile-suspended.png`, fullPage: true });'''
if text.count(old) != 1:
    raise SystemExit(f"expected suspended point once, found {text.count(old)}")
text = text.replace(old, new, 1)

path.write_text(text)
