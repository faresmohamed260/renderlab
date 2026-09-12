import { readFile, writeFile } from "node:fs/promises";

const path = "scripts/verify-library-lifecycle.mjs";
const source = await readFile(path, "utf8");
const oldAssertion = "  assertRatio(cardMetrics, fixtureWidth / fixtureHeight, \"Uploaded Library card image\");";
const replacement = `  const cardFrame = card.locator('[data-library-media-frame="true"]');
  const cardFrameBox = await cardFrame.boundingBox();
  assert(cardFrameBox, "Uploaded Library card media frame could not be measured.");
  const cardFrameRatio = cardFrameBox.width / cardFrameBox.height;
  assert(cardFrameRatio > 1.10 && cardFrameRatio < 1.16, \`Uploaded Library Gallery Rail frame ratio \${cardFrameRatio.toFixed(3)} did not match UI-075.\`);
  assert(
    Math.abs(cardMetrics.renderedWidth - cardFrameBox.width) < 1
      && Math.abs(cardMetrics.renderedHeight - cardFrameBox.height) < 1,
    \`Uploaded Library image does not fill its Gallery Rail media frame: \${JSON.stringify({ cardMetrics, cardFrameBox })}\`,
  );
  assert(cardMetrics.objectFit === "cover", \`Uploaded Library Gallery Rail image object-fit changed: \${cardMetrics.objectFit}\`);`;

const occurrences = source.split(oldAssertion).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected one stale Library card ratio assertion, found ${occurrences}.`);
}

await writeFile(path, source.replace(oldAssertion, replacement), "utf8");
