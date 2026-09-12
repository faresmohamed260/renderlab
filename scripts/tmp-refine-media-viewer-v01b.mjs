import { readFile, writeFile } from 'node:fs/promises';

async function patch(path, replacements) {
  let text = await readFile(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) throw new Error(`${path}: expected fragment not found: ${from.slice(0, 100)}`);
    text = text.replace(from, to);
  }
  await writeFile(path, text, 'utf8');
}

await patch('design/prototypes/media-viewer-continuity-v01/style.css', [[
  `.result-frame { z-index: 2; transform-origin: center; }`,
  `.result-frame { z-index: 2; grid-column: 1; grid-row: 1; transform-origin: center; }`,
], [
  `  min-height: min(67vh, 720px);`,
  `  min-height: min(60vh, 620px);`,
], [
  `body[data-concept="fold"] .stage-grid { min-height: min(70vh, 750px); }`,
  `body[data-concept="fold"] .stage-grid { min-height: min(62vh, 650px); }`,
]]);

await patch('scripts/verify-media-viewer-continuity-v01.mjs', [[
  `  await page.waitForTimeout(430);\n}`,
  `  await page.waitForTimeout(430);\n  await page.evaluate(() => window.scrollTo(0, 0));\n}`,
], [
  `  await screenshot(page, \`${'${label}'}-default\`);`,
  `  const registerBox = await page.locator('#register-shell').boundingBox();\n  assert.ok(registerBox, \`${'${label}'}: attached register has geometry\`);\n  const viewportHeight = await page.evaluate(() => window.innerHeight);\n  assert.ok(registerBox.y < viewportHeight, \`${'${label}'}: continuation register begins in the first viewport (y=${'${registerBox.y}'}, h=${'${viewportHeight}'})\`);\n  await screenshot(page, \`${'${label}'}-default\`);`,
], [
  `  await noOverflow(page, \`${'${label}'}-details\`);\n  await screenshot(page, \`${'${label}'}-details\`);`,
  `  await noOverflow(page, \`${'${label}'}-details\`);\n  await page.locator('#detail-panel').scrollIntoViewIfNeeded();\n  await page.waitForTimeout(60);\n  await screenshot(page, \`${'${label}'}-details\`);`,
], [
  `  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });\n\n  for (const concept of ['register', 'spine', 'fold']) {`,
  `  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });\n  await page.locator('.prototype-controls').evaluate((element) => { element.style.display = 'none'; });\n\n  for (const concept of ['register', 'spine', 'fold']) {`,
], [
  `  await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });\n\n  for (const concept of ['register', 'spine', 'fold']) {`,
  `  await mobilePage.goto(baseUrl, { waitUntil: 'domcontentloaded' });\n  await mobilePage.locator('.prototype-controls').evaluate((element) => { element.style.display = 'none'; });\n\n  for (const concept of ['register', 'spine', 'fold']) {`,
], [
  `  await reducedPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });\n  await setState(reducedPage, { concept: 'fold' });`,
  `  await reducedPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });\n  await reducedPage.locator('.prototype-controls').evaluate((element) => { element.style.display = 'none'; });\n  await setState(reducedPage, { concept: 'fold' });`,
]]);

console.log('Applied second Media Viewer v0.1 refinement.');
