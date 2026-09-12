import { readFile, writeFile } from "node:fs/promises";

const path = "scripts/tmp-phase24-docs-closure.mjs";
let text = await readFile(path, "utf8");
const start = text.indexOf('const decisionsPath = "docs/ui/UI_DECISIONS.md";');
const endMarker = "await write(decisionsPath, decisions);";
const end = text.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("Could not locate UI_DECISIONS helper block");
const endIndex = end + endMarker.length;
const replacement = `const decisionsPath = "docs/ui/UI_DECISIONS.md";
let decisions = await read(decisionsPath);
const ui075Heading = "### UI-075 — Library Gallery Rail makes discovery compact and selection an in-place workspace mode";
const ui075Start = decisions.indexOf(ui075Heading);
if (ui075Start < 0) throw new Error(\`${decisionsPath}: UI-075 heading not found\`);
const ui075Replacement = \`### UI-075 — Library Gallery Rail makes discovery compact and selection an in-place workspace mode
**Status:** Accepted / implemented / verified / merged  
**Date:** 2026-09-12

**Decision:** The user-approved Gallery Rail v0.3 direction is the authoritative production composition for \\\`/library\\\`. Library keeps the UI-074 compact horizontal application header, compresses route context, promotes search into the primary retrieval field, consolidates source/filter/organization controls into one compact command rail, and keeps the media field visually dominant. Current-page selection transforms that same command rail in place into selection summary/actions; it does not introduce a generic floating batch toolbar over media.

**Product boundary:** All established Library contracts remain unchanged: Creatives/Uploads are URL/server-owned views over the same durable \\\`media_assets\\\`; kind/search/Favorites/Collections/sort/pagination remain URL/server-owned; uploads and desktop drop stay Uploads-only; selection remains current-page transient state with existing bounded Organize/Delete behavior; cards remain Viewer links; account ownership/security and durable-media identity remain unchanged. No schema, API, worker/provider, storage, routing or deployment change was introduced.

**Card/interaction boundary:** UI-075 supersedes UI-070's card presentation only where the approved v0.3 evidence differs. UI-070's maintained 44×44 checkbox root, centered 22×22 visible indicator, card-link semantics, no quick-actions rule, no hover-only essential behavior and no client-owned media state remain authoritative. Pointer-capable media uses bounded local depth/highlight; touch and reduced motion retain complete static meaning. Ordinary command controls remain stable and touch-safe.

**Truthfulness rule:** Prototype counts and labels remain representative design content rather than product facts. Production shows only route-supported counts/labels, and sort/source context reflects active URL state. No corpus total, progress or capability is fabricated for visual fidelity.

**Verification:** accepted design authority remains R&D head \\\`ba842e919305e07262ae95c81b3c2063a455b54d\\\`, run \\\`34689164957\\\`, artifact \\\`10296866215\\\` (\\\`sha256:db81c13f34514022f01a9e8998de4c0622ee946e316d02655c70477db1a87d95\\\`). Production PR #194 definitive head \\\`d0a6f66937986ace109e301913f17410a8e95548\\\` passed the complete fresh 13-workflow attached set. Human review accepted History artifact \\\`10298855903\\\`, Batch Actions artifact \\\`10298746267\\\` and Drag Drop artifact \\\`10299387838\\\`. PR #194 squash-merged as \\\`af88b93dcb4fcbca502b42f9ea1186192af48a6a\\\`; the two workflows GitHub attached to merged main both passed: Engineering Quality \\\`34699439085\\\` and UI Shell Validation \\\`34699439083\\\`. Production deployment remains unauthorized and unchanged.
\`;
decisions = \\\`${decisions.slice(0, ui075Start)}${ui075Replacement.trimEnd()}\\\\n\\\`;
await write(decisionsPath, decisions);`;
text = `${text.slice(0, start)}${replacement}${text.slice(endIndex)}`;
await writeFile(path, text, "utf8");
console.log("Updated UI-075 closure helper to use EOF delimiter.");
