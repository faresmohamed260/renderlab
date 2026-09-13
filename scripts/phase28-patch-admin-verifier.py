from pathlib import Path

path = Path("scripts/verify-admin-operations.mjs")
text = path.read_text()

old = '  await page.getByRole("heading", { name: "Generation controls", exact: true }).waitFor({ state: "visible" });'
new = '  await page.getByRole("heading", { name: "Generation", exact: true }).waitFor({ state: "visible" });'
if old not in text:
    raise SystemExit("Generation heading assertion not found")
text = text.replace(old, new, 1)

anchor = '''  await page.getByText("Maintenance backlog", { exact: true }).waitFor({ state: "visible" });
  assert(
    (await page.getByRole("navigation", { name: "Application navigation" }).getByRole("link", { name: "Admin", exact: true }).count()) === 0,
    "Admin was added to ordinary application navigation.",
  );'''
replacement = '''  await page.getByText("Maintenance backlog", { exact: true }).waitFor({ state: "visible" });
  await page.getByText("Default or blank means inherit the global value.", { exact: true }).waitFor({ state: "visible" });

  assert((await page.locator('[data-admin-register="system-continuity"]').count()) === 1, "Admin must render one Settings-derived registered surface.");
  assert((await page.locator('[data-admin-row]').count()) === 3, "Admin must render exactly three top-level registered rows.");
  for (const rowKey of ["access", "generation", "health"]) {
    assert((await page.locator(`[data-admin-row="${rowKey}"]`).count()) === 1, `Admin registered row ${rowKey} is missing or duplicated.`);
  }
  assert(await page.locator(`[id="role-${adminAccount.id}"]`).isDisabled(), "Acting admin role control must remain disabled.");
  assert(await page.locator(`[id="status-${adminAccount.id}"]`).isDisabled(), "Acting admin status control must remain disabled.");

  assert(
    (await page.getByRole("navigation", { name: "Application navigation" }).getByRole("link", { name: "Admin", exact: true }).count()) === 0,
    "Admin was added to ordinary application navigation.",
  );'''
if anchor not in text:
    raise SystemExit("Admin structural assertion anchor not found")
text = text.replace(anchor, replacement, 1)

old_capture = '''  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert(!desktopOverflow, "Desktop Admin layout has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/admin-operations-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("main").getByRole("heading", { name: "Admin", exact: true }).waitFor({ state: "visible" });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert(!mobileOverflow, "Narrow Admin layout has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/admin-operations-mobile.png`, fullPage: true });'''
new_capture = '''  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert(!desktopOverflow, "Desktop Admin layout has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/admin-operations-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("main").getByRole("heading", { name: "Admin", exact: true }).waitFor({ state: "visible" });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert(!mobileOverflow, "Narrow Admin layout has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/admin-operations-mobile.png`, fullPage: true });

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert(!reducedOverflow, "Reduced-motion narrow Admin layout has horizontal clipping.");
  await page.screenshot({ path: `${artifactDir}/admin-operations-mobile-reduced.png`, fullPage: true });
  await page.emulateMedia({ reducedMotion: "no-preference" });'''
if old_capture not in text:
    raise SystemExit("Admin screenshot block not found")
text = text.replace(old_capture, new_capture, 1)

path.write_text(text)
