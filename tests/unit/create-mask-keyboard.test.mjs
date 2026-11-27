import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { initialMaskPoint, keyboardMaskCommand } from "../../src/features/create/create-mask-keyboard.ts";

test("FE-04 keyboard cursor starts at a meaningful image coordinate, moves precisely and clamps to every edge", () => {
  assert.deepEqual(initialMaskPoint(101, 51), { x: 50, y: 25 });
  assert.deepEqual(initialMaskPoint(1, 1), { x: 0, y: 0 });
  const point = { x: 50, y: 25 };
  for (const [key, expected] of [
    ["ArrowLeft", { x: 49, y: 25 }], ["ArrowRight", { x: 51, y: 25 }],
    ["ArrowUp", { x: 50, y: 24 }], ["ArrowDown", { x: 50, y: 26 }],
  ]) {
    assert.deepEqual(keyboardMaskCommand(key, false, point, 101, 51), { kind: "move", point: expected });
  }
  assert.deepEqual(keyboardMaskCommand("ArrowLeft", true, { x: 3, y: 2 }, 101, 51), { kind: "move", point: { x: 0, y: 2 } });
  assert.deepEqual(keyboardMaskCommand("ArrowUp", true, { x: 3, y: 2 }, 101, 51), { kind: "move", point: { x: 3, y: 0 } });
  assert.deepEqual(keyboardMaskCommand("ArrowRight", true, { x: 98, y: 48 }, 101, 51), { kind: "move", point: { x: 100, y: 48 } });
  assert.deepEqual(keyboardMaskCommand("ArrowDown", true, { x: 98, y: 48 }, 101, 51), { kind: "move", point: { x: 98, y: 50 } });
  assert.deepEqual(keyboardMaskCommand("ArrowDown", true, { x: 0, y: 0 }, 1, 1), { kind: "move", point: { x: 0, y: 0 } });
});

test("FE-04 explicit paint is separate from movement and does not consume Tab, Escape, or range keys", () => {
  const point = { x: 10, y: 12 };
  for (const key of ["Enter", " "]) assert.deepEqual(keyboardMaskCommand(key, false, point, 30, 40), { kind: "apply", point });
  for (const key of ["Tab", "Escape", "Home", "End", "b", "h", "+"]) assert.equal(keyboardMaskCommand(key, false, point, 30, 40), null);
});

const read = (path) => readFile(new URL("../../" + path, import.meta.url), "utf8");
test("FE-04 production mask surface uses existing pixel, history and save paths with named keyboard and live feedback", async () => {
  const editor = await read("src/features/create/create-preview-mask-editor.tsx");
  assert.match(editor, /keyboardMaskCommand\(event\.key, event\.shiftKey/);
  assert.match(editor, /event\.target !== event\.currentTarget/);
  assert.match(editor, /record\(ctx\);\s*if \(tool === "fill" \|\| tool === "color"\) selectColor\(ctx, command\.point, tool === "fill"\);\s*else paint\(ctx, command\.point, command\.point\);/);
  assert.match(editor, /aria-label="Mask canvas"[^>]*aria-describedby=\{instructionsId\}/);
  assert.match(editor, /id=\{instructionsId\}/);
  assert.match(editor, /role="status"[^>]*aria-live="polite"/);
  assert.match(editor, /aria-pressed=\{tool === "brush"\}/);
  assert.match(editor, /type="range" min=\{4\} max=\{250\}/);
  assert.match(editor, /onClick=\{\(\) => modify\(false\)\}>Clear/);
  assert.match(editor, /onClick=\{finish\}>Done masking/);
  assert.match(editor, /output\.toBlob/);
  assert.match(editor, /new File\(\[blob\], "image-mask\.png", \{ type: "image\/png" \}\)/);
});

test("FE-04 Escape precedes input/readiness guards and restores focus to the current trigger or safe fallback", async () => {
  const editor = await read("src/features/create/create-preview-mask-editor.tsx");
  assert.match(editor, /if \(event\.key === "Escape"\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);[\s\S]*?onClose\(\);[\s\S]*?return;[\s\S]*?if \(event\.target instanceof HTMLInputElement/);
  assert.match(editor, /viewer\.showModal\(\);[\s\S]*?viewport\.current\?\.focus/);
  const workspace = await read("src/features/create/create-preview-workspace.tsx");
  const stage = await read("src/features/create/create-preview-stage.tsx");
  assert.match(workspace, /onClose=\{closeMaskEditor\}/);
  assert.match(workspace, /onSave=\{\(region\) => \{[\s\S]*?closeMaskEditor\(region \? "Mask saved\." : "Mask cleared\."\);/);
  assert.match(workspace, /data-create-mask-trigger/);
  assert.match(workspace, /getClientRects\(\)\.length/);
  assert.match(stage, /data-create-mask-trigger/);
  assert.match(stage, /if \(viewerOpen\) \{ restoring\.current = true; dialog\.current\?\.close\(\); \} maskAction\.open\(\);/);
});

test("FE-04 closing announces the outcome after the editor unmounts and the workspace is a last-resort focus target", async () => {
  const workspace = await read("src/features/create/create-preview-workspace.tsx");
  assert.match(workspace, /function closeMaskEditor\(announcement = "Mask changes cancelled\."\)/);
  assert.match(workspace, /setMaskAnnouncement\(announcement\)/);
  assert.match(workspace, /role="status" aria-live="polite"[^>]*>\{maskAnnouncement\}/);
  assert.match(workspace, /<section ref=\{workspaceRoot\} tabIndex=\{-1\}/);
  assert.match(workspace, /getComputedStyle\(node\)\.visibility === "visible"/);
  assert.match(workspace, /target \?\? root/);
  const editor = await read("src/features/create/create-preview-mask-editor.tsx");
  assert.match(editor, /type="range" min=\{4\} max=\{250\} aria-label="Brush size"/);
  assert.match(editor, /if \(!mounted\.current\) return;/);
  assert.match(editor, /if \(!savingRef\.current\) onClose\(\)/);
});
