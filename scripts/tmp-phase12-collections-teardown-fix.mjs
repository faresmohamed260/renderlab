import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/verify-library-collections.mjs";
let text = readFileSync(path, "utf8");

const replacements = [
  [
    "  await emptyContext.close();",
    "  await emptyPage.unrouteAll({ behavior: \"ignoreErrors\" });\n  await emptyContext.close();",
  ],
  [
    "\n\n  console.log(`Configured Library Collections + Phase 8A management rendered successfully. owner=${owner.id} asset=${collectionAsset.id}`);",
    "\n  await page.unrouteAll({ behavior: \"ignoreErrors\" });\n  await context.close();\n\n  console.log(`Configured Library Collections + Phase 8A management rendered successfully. owner=${owner.id} asset=${collectionAsset.id}`);",
  ],
];

for (const [before, after] of replacements) {
  if (text.split(before).length !== 2) {
    throw new Error(`Expected exactly one teardown anchor: ${before}`);
  }
  text = text.replace(before, after);
}

writeFileSync(path, text);
