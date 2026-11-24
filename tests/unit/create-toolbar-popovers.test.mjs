import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("P5-01 toolbar popovers share an exclusive state and late close cannot close the new panel", async () => {
  const { nextCreateToolbarPopover } = await import("../../src/features/create/create-toolbar-popover-state.ts");
  let state = null;
  state = nextCreateToolbarPopover(state, "queue", true);
  assert.equal(state, "queue");
  state = nextCreateToolbarPopover(state, "shortcuts", true);
  assert.equal(state, "shortcuts");
  state = nextCreateToolbarPopover(state, "queue", false);
  assert.equal(state, "shortcuts");
  state = nextCreateToolbarPopover(state, "shortcuts", false);
  assert.equal(state, null);
  state = nextCreateToolbarPopover(state, "shortcuts", true);
  state = nextCreateToolbarPopover(state, "queue", true);
  assert.equal(state, "queue");
  state = nextCreateToolbarPopover(state, "shortcuts", false);
  assert.equal(state, "queue");
  assert.equal(nextCreateToolbarPopover(state, "queue", false), null);
});

test("P5-01 Queue and Shortcuts use the maintained portal, trigger and controlled dismissal", async () => {
  const workspace = await readFile(new URL("../../src/features/create/create-preview-workspace.tsx", import.meta.url), "utf8");
  const wrapper = await readFile(new URL("../../src/components/ui/popover.tsx", import.meta.url), "utf8");
  assert.match(wrapper, /import \{ Popover as PopoverPrimitive \} from "radix-ui"/);
  assert.match(wrapper, /<PopoverPrimitive\.Portal>/);
  assert.match(wrapper, /<PopoverPrimitive\.Content/);
  assert.match(workspace, /<Popover open=\{toolbarPopover === "queue"\} onOpenChange=/);
  assert.match(workspace, /<Popover open=\{toolbarPopover === "shortcuts"\} onOpenChange=/);
  assert.match(workspace, /<PopoverTrigger asChild>/);
  assert.match(workspace, /<Button ref=\{queue\}/);
  assert.match(workspace, /<PopoverContent[^>]*aria-label="Queue"/);
  assert.match(workspace, /<PopoverContent[^>]*aria-label="Shortcuts"/);
  assert.match(workspace, /setToolbarPopover\("queue"\)/);
  assert.doesNotMatch(workspace, /queue\.current\.open|<details ref=\{queue\}/);
  // Radix's default Escape dismissal and focus restoration must remain intact.
  assert.doesNotMatch(wrapper, /onEscapeKeyDown|onCloseAutoFocus/);
  assert.match(wrapper, /collisionPadding=\{collisionPadding\}/);
  assert.match(wrapper, /avoidCollisions/);
});

test("P5-01 portalled panel widths and heights respect actual collision bounds", async () => {
  const css = await readFile(new URL("../../src/app/renderlab-background.css", import.meta.url), "utf8");
  assert.match(css, /\.create-preview-toolbar-popover\s*\{[^}]*max-inline-size:[^;]*--radix-popover-content-available-width/s);
  assert.match(css, /\.create-preview-toolbar-popover\s*\{[^}]*max-block-size:[^;]*--radix-popover-content-available-height/s);
  assert.match(css, /\.create-preview-toolbar-popover\s*\{[^}]*overflow:\s*auto/s);
  assert.doesNotMatch(css, /\.create-preview-queue-jobs\s*\{[^}]*position:\s*absolute/s);
});
