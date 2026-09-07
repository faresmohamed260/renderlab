from pathlib import Path

path = Path("scripts/verify-create-lifecycle.mjs")
text = path.read_text()

old = '''  const videoMode = page.getByRole("radio", { name: "Video", exact: true });
  await videoMode.click();
  const videoSettings = page.getByRole("button", { name: /^Video settings\\./ });'''
new = '''  const videoMode = page.getByRole("radio", { name: "Video", exact: true });
  await videoMode.click();
  // Phase 20 uses bounded shared-layout motion between Image and Video. Visual
  // acceptance screenshots should capture the settled state, not an in-flight frame.
  await page.waitForTimeout(500);
  const videoSettings = page.getByRole("button", { name: /^Video settings\\./ });'''
if text.count(old) != 1:
    raise SystemExit(f"expected one Video mode transition target, found {text.count(old)}")
text = text.replace(old, new, 1)

old = '''  await videoAdvancedButton.click();
  await page.getByLabel("Frame rate").waitFor({ state: "visible", timeout: 10_000 });'''
new = '''  await videoAdvancedButton.click();
  await page.getByLabel("Frame rate").waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(300);'''
if text.count(old) != 1:
    raise SystemExit(f"expected one Video Advanced transition target, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
