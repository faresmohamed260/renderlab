import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../../src/app/renderlab-background.css", import.meta.url), "utf8");
const workspace = await readFile(new URL("../../src/features/create/create-preview-workspace.tsx", import.meta.url), "utf8");

function rule(source, selector) {
  const escaped = selector.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(escaped + "\\s*\\{([^}]+)\\}"));
  assert.ok(match, "Missing layout rule: " + selector);
  return match[1];
}

function narrowRules() {
  const start = css.indexOf("@media (max-width: 320px)");
  assert.notEqual(start, -1, "Extreme-narrow layout is missing");
  // Match the media block's balanced braces, not unrelated desktop overrides.
  let depth = 0;
  const open = css.indexOf("{", start);
  for (let index = open; index < css.length; index++) {
    if (css[index] === "{") depth++;
    else if (css[index] === "}" && --depth === 0) return css.slice(open + 1, index);
  }
  assert.fail("Unclosed extreme-narrow media query");
}

test("FQA-12 extreme-narrow Create reflows visible reference tiles instead of compressing four labels", () => {
  const narrow = narrowRules();
  assert.match(rule(narrow, ".create-preview-tiles"), /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(rule(narrow, ".create-preview-setup-slot > [inert]"), /display:\s*none/);
  const button = rule(narrow, ".create-preview-workspace .create-preview-tile > button:first-child");
  assert.match(button, /aspect-ratio:\s*auto/);
  assert.match(button, /min-inline-size:\s*0/);
  assert.match(rule(narrow, ".create-preview-tile > button:first-child > span"), /overflow-wrap:\s*anywhere/);
});

test("FQA-12 composer reflows settings, action labels and recent prompts without hiding overflow", () => {
  const narrow = narrowRules();
  assert.match(rule(narrow, ".create-preview-settings"), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(rule(narrow, ".create-preview-workspace .create-preview-submit-actions > button"), /white-space:\s*normal/);
  assert.match(rule(narrow, ".create-preview-workspace .create-preview-submit-actions > button"), /max-inline-size:\s*100%/);
  assert.match(rule(narrow, ".create-preview-recents > div"), /inline-size:\s*100%/);
  assert.doesNotMatch(narrow, /overflow(?:-x|-inline)?:\s*(?:hidden|clip)/);
});

test("FQA-15 VGL disclosure hit areas are at least 32 CSS px and 44 on mobile", () => {
  const summary = rule(css, ".create-preview-workspace .create-preview-extra summary");
  assert.match(summary, /min-block-size:\s*32px/);
  assert.match(summary, /padding-block:\s*6px/);
  assert.match(css, /@media \(max-width: 700px\)\s*\{\s*\.create-preview-workspace \.create-preview-extra summary\s*\{[^}]*min-block-size:\s*44px/);
  // Negative prompt control removed by owner decision (2026-11-26); only the VGL disclosure remains.
  assert.doesNotMatch(workspace, /create-preview-negative-label/);
  // The rebuilt composer gates manual VGL behind the "Use my own structured prompt" checkbox.
  assert.match(workspace, /htmlFor="create-preview-vgl-enabled"/);
});
