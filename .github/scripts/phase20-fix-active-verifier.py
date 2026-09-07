from pathlib import Path

path = Path("scripts/verify-create-lifecycle.mjs")
text = path.read_text()
old = '''  assert((await generate.getAttribute("data-active")) === "true", "Generate actuator did not expose its active-generation treatment.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-active-generation.png`, fullPage: true });'''
new = '''  const activeGenerate = page.locator(".kinetic-generate");
  assert((await activeGenerate.getAttribute("data-active")) === "true", "Generate actuator did not expose its active-generation treatment.");
  assert((await activeGenerate.textContent())?.includes("Generating"), "Generate actuator did not communicate the active generation state.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-active-generation.png`, fullPage: true });'''
if text.count(old) != 1:
    raise SystemExit(f"expected one active verifier target, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
