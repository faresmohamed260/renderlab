from pathlib import Path

workspace = Path('src/features/create/create-workspace.tsx')
text = workspace.read_text()
old = '<section className="clear-create-workspace mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-7xl flex-col px-4 pb-24 pt-10 sm:px-8 sm:pt-16 lg:pb-16 lg:pt-24">'
new = '<section\n      className="clear-create-workspace mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-7xl flex-col px-4 pb-24 pt-10 sm:px-8 sm:pt-16 lg:pb-16 lg:pt-24"\n      data-create-has-stage={jobActive || resultLoading || Boolean(resultAsset) ? "true" : "false"}\n    >'
if old not in text:
    raise SystemExit('workspace section marker not found')
workspace.write_text(text.replace(old, new, 1))

css = Path('src/app/globals.css')
text = css.read_text()
needle = '''  .clear-create-result-media::after {\n    bottom: 0.75rem;\n    left: 0.75rem;\n    font-size: 0.44rem;\n  }\n}'''
replacement = '''  .clear-create-result-media::after {\n    bottom: 0.75rem;\n    left: 0.75rem;\n    font-size: 0.44rem;\n  }\n\n  .clear-create-workspace[data-create-has-stage="true"] {\n    padding-top: 0.75rem;\n  }\n\n  .clear-create-workspace[data-create-has-stage="true"] .clear-create-context {\n    margin-bottom: 0.75rem !important;\n  }\n\n  .clear-create-workspace[data-create-has-stage="true"] .clear-create-context > p {\n    display: none;\n  }\n\n  .clear-create-workspace[data-create-has-stage="true"] .clear-create-context h2 {\n    min-height: 0;\n    font-size: 1.85rem !important;\n    line-height: 1;\n  }\n\n  .clear-create-workspace[data-create-has-stage="true"] .clear-create-context::after {\n    margin-top: 0.55rem;\n  }\n\n  .clear-create-workspace[data-create-has-stage="true"] .clear-create-result-actions {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n}\n'''
if needle not in text:
    raise SystemExit('mobile CSS marker not found')
css.write_text(text.replace(needle, replacement, 1))

verifier = Path('scripts/verify-create-lifecycle.mjs')
text = verifier.read_text()
needle = '''  await page.evaluate(() => window.scrollTo(0, 0));\n  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-result.png`, fullPage: true });\n\n  await edit.click();'''
replacement = '''  await page.evaluate(() => window.scrollTo(0, 0));\n  const mobileDock = page.locator('[data-kinetic-surface="mobile-dock"]');\n  const resultActions = page.locator('[data-create-result-info="true"] button');\n  const dockBox = await mobileDock.boundingBox();\n  const actionBoxes = await resultActions.evaluateAll((buttons) => buttons.map((button) => {\n    const rect = button.getBoundingClientRect();\n    return { top: rect.top, bottom: rect.bottom };\n  }));\n  assert(dockBox && actionBoxes.length > 0, "Could not measure mobile result actions against the fixed dock.");\n  const lowestActionBottom = Math.max(...actionBoxes.map((box) => box.bottom));\n  assert(lowestActionBottom <= dockBox.y - 8, `Mobile result actions were obscured by the fixed dock: actions=${JSON.stringify(actionBoxes)} dock=${JSON.stringify(dockBox)}`);\n  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-result.png`, fullPage: true });\n\n  await edit.click();'''
if needle not in text:
    raise SystemExit('mobile result verifier marker not found')
verifier.write_text(text.replace(needle, replacement, 1))
