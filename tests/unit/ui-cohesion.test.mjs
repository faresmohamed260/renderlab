import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appShell = readFileSync("src/components/shell/app-shell.tsx", "utf8");
const shellSpec = readFileSync("tests/ui/shell.spec.ts", "utf8");

test("UI-074 fixed header and route-content offsets remain paired", () => {
  assert.match(appShell, /h-16[^\n]*lg:h-\[72px\]/);
  assert.match(appShell, /pt-16[^\n]*lg:pt-\[72px\]/);
  assert.doesNotMatch(appShell, /data-kinetic-surface=["']desktop-rail["']/);
  assert.doesNotMatch(appShell, /data-kinetic-surface=["']mobile-dock["']/);
});

test("Phase 29 browser coverage retains cross-route clearance and reduced-motion checks", () => {
  for (const route of ["/create", "/library", "/activity", "/settings"]) {
    assert.match(shellSpec, new RegExp(`path: \\"${route.replace("/", "\\/")}\\"`));
  }
  assert.match(shellSpec, /expectContentClearsTopbar/);
  assert.match(shellSpec, /expectNoHorizontalOverflow/);
  assert.match(shellSpec, /reducedMotion: "reduce"/);
});
