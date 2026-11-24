# P6-02a isolated design workspace

Foundation only. See [merged contract](../../../docs/ui/P6_02A_SHARED_PRIMITIVES_CREATE_PROTOTYPE_CONTRACT.md) and [V2 spec](../../../docs/ui/DESIGN_LANGUAGE_V2.md). No production imports, routes, credentials, calls, user data, remote assets or new dependencies. The shared CSS and TS owners are under `design/system/v2/`. This skeleton is not a reviewed Create design.

From the repository root with the pinned Node/npm toolchain:

```sh
npm ci --no-audit --no-fund
node scripts/run-p602a-design-prototype.mjs
```

Open http://127.0.0.1:4316 locally. Ctrl+C shuts down the child process tree and removes its scratch copy. To change source, stop and restart; the runner stages tracked prototype files (including tracked working-tree edits), never copies environment files or untracked output. It invokes the locked Next CLI directly, with an explicit standalone project and webpack, without npm scripts or production configuration. No network listener other than loopback. A busy port fails; it never attaches to or kills an unrelated listener.

Credential-free smoke (requires the existing Playwright Chromium browser installed with `node node_modules/@playwright/test/cli.js install chromium`):

```sh
node scripts/run-p602a-design-prototype.mjs --smoke
node --test tests/unit/p602a-foundation.test.mjs
```

Smoke checks the real browser at 1440×900 and 390×844 with normal/reduced preferences, rejects unexpected requests/WebSockets, verifies token CSS and the four roles and removes temporary output. Capture of Create states and recordings comes in step 3, not this foundation. The browser dependency download is CI/tool setup, not prototype network access.

CI: the targeted P6-02a workflow checks isolated launch/browser behavior only when prototype or verification paths change; the existing protected suite still runs. The existing credential-free engineering-quality production build is followed by `node scripts/verify-p602a-isolation.mjs --build`, which checks the production source boundary and actual server/static output for prototype path, markup and token markers. No Vercel deploy or production environment is used. The initial build scan found a prototype marker in the legacy preview route's server file-trace manifest. Root Next configuration now explicitly excludes only the two design-only subtrees from output file tracing across routes; this is a packaging-only boundary, not a runtime route change. The scan still fails on any design entry in emitted trace manifests or chunks. The verifier is a regression guard, not a proof against arbitrary obfuscation; route/import review and inspection of build evidence remain required. Timing/CI results will be recorded from actual runs, not estimated.

## Step 2: shared-primitives board

The board is design-only, not a second production component library. The existing
`src/components/ui/` inventory is the source of semantics, not the old Tailwind
palette. `app/primitives.tsx` adapts the same maintained mechanics using canonical
V2 roles; native controls live only in these adapters. `app/showcase.tsx` uses
those adapters. No existing wrapper or production source is imported or changed.

| Existing file | Design-only adapter / meaningful states |
| --- | --- |
| button.tsx | Button, link via Slot, icon, primary/secondary/destructive, live hover/focus/press, disabled/busy |
| input.tsx, textarea.tsx, label.tsx, field.tsx | Input/Textarea/Label/Field/Description/Error, empty/filled/invalid/disabled/valid, editable/focusable |
| checkbox.tsx | Radix Checkbox, checked/unchecked/disabled, keyboard toggle |
| toggle.tsx, toggle-group.tsx | Radix Toggle/ToggleGroup, selected/unselected/disabled, keyboard selection |
| native-select.tsx | NativeSelect wrapper; OS-native choices, empty/selected/disabled |
| collapsible.tsx | Radix Collapsible, open/closed/disabled; spring feedback, immediate hidden state on close |
| dropdown-menu.tsx | Radix DropdownMenu, trigger/checked/disabled entries, keyboard and collision positioning |
| alert-dialog.tsx | Radix AlertDialog, safe Cancel focus, confirm/disabled, in-memory outcome |
| alert.tsx | Alert neutral, warning, error and success with text and icon |
| empty.tsx | Empty with title/description, no fabricated media |
| spinner.tsx | Spinner pending marker plus visible status; intentionally static so no fake progress or perpetual decorative motion |

Hover, focus and press are **live** states, not simulated attributes. Button
press and disclosure entrance use the named snappy/smooth springs; press scale
and disclosure travel are bounded geometry, not new palette or physics
constants. Collapsible close hides immediately for semantics; normal opening
uses the current spring value, Reduce Motion commits immediately. Other
maintained mechanics use immediate geometry and token color transitions where
applicable. Link and native select retain OS semantics. No claim of upstream
license equivalence for copied styles; these are independently authored design
adapters using installed Radix/React Spring, not copied upstream source.
Popover/Tooltip/Dialog/Sheet gaps: maintained menu and alert dialog cover
current fixture needs; assess actual Create need in step 3, do not add generic
wrappers. Slider/Switch/Tabs/Progress/Skeleton/Toast gaps: no new component or
capability here; use existing semantic controls when appropriate. Rich prompt
and media stay feature-owned.

Browser smoke checks live hover/focus/press, selection and disclosure,
keyboard menu dismissal, dialog safe focus and restoration, rendered geometry
and actual computed opaque text/placeholder/edge/focus contrast. It logs
ratios and fails on insufficient required contrast. Composited translucent
materials over media, pixel sampling, genuine 200% zoom, complete IME/touch
and temporal evidence remain later checkpoint work. Narrow 195/320 production
shell acceptance is a separate P6-02 implementation gate, not claimed here.
