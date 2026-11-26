import test from "node:test";
import assert from "node:assert/strict";
import { resolveCreateShortcut, nextResultIndex } from "../../src/features/create/use-create-shortcuts.ts";

const event = (key, patch = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, isComposing: false, defaultPrevented: false, ...patch });
const context = { enabled: true, focused: true, editable: false, prompt: false, overlay: false, canGenerate: true, canStep: true };

test("Create shortcuts require workspace focus and opt-in", () => {
  for (const key of ["/", "[", "]"]) {
    assert.equal(resolveCreateShortcut(event(key), { ...context, focused: false }), null);
    assert.equal(resolveCreateShortcut(event(key), { ...context, enabled: false }), null);
    assert.equal(resolveCreateShortcut(event(key), { ...context, editable: true }), null);
    assert.equal(resolveCreateShortcut(event(key), { ...context, overlay: true }), null);
    for (const patch of [{ repeat: true }, { isComposing: true }, { defaultPrevented: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
      assert.equal(resolveCreateShortcut(event(key, patch), context), null);
    }
  }
  assert.equal(resolveCreateShortcut(event("/"), context), "prompt");
  assert.equal(resolveCreateShortcut(event("["), context), "previous");
  assert.equal(resolveCreateShortcut(event("]"), context), "next");
  assert.equal(resolveCreateShortcut(event("]"), { ...context, canStep: false }), null);
  assert.equal(resolveCreateShortcut(event("["), { ...context, canStep: false }), null);
});

test("intentional Generate only accepts exact Ctrl/Cmd Enter and existing gates", () => {
  for (const mod of ["ctrlKey", "metaKey"]) {
    const key = event("Enter", { [mod]: true });
    assert.equal(resolveCreateShortcut(key, context), "generate");
    assert.equal(resolveCreateShortcut(key, { ...context, editable: true, prompt: true }), "generate");
    for (const patch of [{ editable: true }, { focused: false }, { canGenerate: false }, { enabled: false }, { overlay: true }]) {
      assert.equal(resolveCreateShortcut(key, { ...context, ...patch }), null);
    }
    for (const patch of [{ isComposing: true }, { repeat: true }, { defaultPrevented: true }, { shiftKey: true }, { altKey: true }, { ctrlKey: true, metaKey: true }]) {
      assert.equal(resolveCreateShortcut({ ...key, ...patch }, context), null);
    }
  }
  for (const key of ["Enter", "Escape", "k", "ArrowLeft"]) assert.equal(resolveCreateShortcut(event(key), context), null);
});

test("result stepping wraps without selecting nonexistent results", () => {
  assert.equal(nextResultIndex(0, -1, 3), 2);
  assert.equal(nextResultIndex(2, 1, 3), 0);
  assert.equal(nextResultIndex(-1, 1, 3), 0);
  assert.equal(nextResultIndex(-1, -1, 3), 2);
  assert.equal(nextResultIndex(1, 1, 3), 2);
  assert.equal(nextResultIndex(-1, 1, 0), -1);
  assert.equal(nextResultIndex(0, 1, 1), -1);
});
