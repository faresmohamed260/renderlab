from pathlib import Path

path = Path("scripts/verify-create-lifecycle.mjs")
text = path.read_text()

old = '''  await page.setViewportSize(mobileViewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("radio", { name: "Image", exact: true }).click();
  const mobileImageModel = page.getByRole("button", { name: "Image model FLUX.2 Klein", exact: true });'''
new = '''  await page.setViewportSize(mobileViewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("radio", { name: "Image", exact: true }).click();
  // Give the media-query update and any already-started layout transition a bounded
  // frame window to settle before capturing the reduced-motion acceptance state.
  await page.waitForTimeout(500);
  const mobileImageModel = page.getByRole("button", { name: "Image model FLUX.2 Klein", exact: true });'''
if text.count(old) != 1:
    raise SystemExit(f"expected one mobile Image transition target, found {text.count(old)}")
text = text.replace(old, new, 1)

old = '''  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Video", exact: true }).click();
  const reducedModeControl = page.locator('[data-create-motion="mode-control"]');'''
new = '''  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await page.waitForTimeout(500);
  const reducedModeControl = page.locator('[data-create-motion="mode-control"]');'''
if text.count(old) != 1:
    raise SystemExit(f"expected one mobile Video transition target, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
