import { readFile, writeFile } from 'node:fs/promises';

async function patch(path, replacements) {
  let text = await readFile(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) throw new Error(`${path}: expected fragment not found: ${from.slice(0, 80)}`);
    text = text.replace(from, to);
  }
  await writeFile(path, text, 'utf8');
}

await patch('design/prototypes/media-viewer-continuity-v01/style.css', [[
  `.source-frame {\n  z-index: 1;\n  visibility: hidden;`,
  `.source-frame {\n  z-index: 1;\n  grid-column: 1;\n  grid-row: 1;\n  visibility: hidden;`,
], [
  `body[data-compare="on"] .source-frame { visibility: visible; opacity: 1; clip-path: inset(0 0 0 0 round 14px); transform: translateX(0) scale(1); transition-delay: 0s; }`,
  `body[data-compare="off"] .source-frame { pointer-events: none; }\nbody[data-compare="on"] .source-frame { grid-column: 2; grid-row: 1; visibility: visible; opacity: 1; clip-path: inset(0 0 0 0 round 14px); transform: translateX(0) scale(1); transition-delay: 0s; }`,
], [
  `  body[data-compare="on"] .stage-grid,\n  body[data-concept="fold"][data-compare="on"] .stage-grid {\n    grid-template-columns: 1fr;\n    grid-template-rows: minmax(360px, 52vh) minmax(260px, 38vh);\n    gap: 10px;\n  }`,
  `  body[data-compare="on"] .stage-grid,\n  body[data-concept="fold"][data-compare="on"] .stage-grid {\n    grid-template-columns: 1fr;\n    grid-template-rows: minmax(360px, 52vh) minmax(260px, 38vh);\n    gap: 10px;\n  }\n  body[data-compare="on"] .source-frame { grid-column: 1; grid-row: 2; }`,
]]);

await patch('scripts/verify-media-viewer-continuity-v01.mjs', [[
  `  await page.waitForTimeout(30);`,
  `  await page.waitForTimeout(430);`,
]]);

await patch('design/prototypes/media-viewer-continuity-v01/index.html', [[
  `<button type="button" data-spine-panel="prompt">P</button>\n          <button type="button" data-spine-panel="details">D</button>\n          <button type="button" data-spine-panel="manage">M</button>\n          <button type="button" data-spine-compare="true">S</button>`,
  `<button type="button" data-spine-panel="prompt" aria-label="Prompt">P</button>\n          <button type="button" data-spine-panel="details" aria-label="Details">D</button>\n          <button type="button" data-spine-panel="manage" aria-label="Manage">M</button>\n          <button type="button" data-spine-compare="true" aria-label="Compare source">S</button>`,
]]);

console.log('Applied first Media Viewer v0.1 refinement.');
