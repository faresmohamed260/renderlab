import { readFile, writeFile } from "node:fs/promises";

async function read(path) {
  return readFile(path, "utf8");
}

async function write(path, content) {
  await writeFile(path, content, "utf8");
}

function replaceSection(text, startHeading, endHeading, replacement, path) {
  const start = text.indexOf(startHeading);
  const end = text.indexOf(endHeading, start + startHeading.length);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`${path}: could not locate section ${startHeading} -> ${endHeading}`);
  }
  return `${text.slice(0, start)}${replacement.trimEnd()}\n\n${text.slice(end)}`;
}

function replaceOnce(text, oldValue, newValue, path) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`${path}: expected exactly one replacement target, found ${count}`);
  return text.replace(oldValue, newValue);
}

const projectPath = "PROJECT.md";
let project = await read(projectPath);
project = replaceSection(
  project,
  "## Phase 24 Library Gallery Rail v0.3 — approved design / implementation contract",
  "## Current Verified Baseline — 2026-09-12",
  `## Phase 24 Library Gallery Rail v0.3 — implementation closure — 2026-09-12
- The user-approved Library Gallery Rail v0.3 remains the binding design authority: R&D head \`ba842e919305e07262ae95c81b3c2063a455b54d\`, run \`34689164957\`, artifact \`10296866215\` (\`sha256:db81c13f34514022f01a9e8998de4c0622ee946e316d02655c70477db1a87d95\`). UI-075 and \`docs/ui/LIBRARY_GALLERY_RAIL_IMPLEMENTATION_CONTRACT.md\` governed the bounded production slice.
- PR #194 implemented Gallery Rail without changing Library routes, URL/server ownership, durable-media identity, upload semantics, current-page selection/batch behavior, account ownership/security, schema, provider/worker, storage or deployment contracts. The definitive exact implementation head was \`d0a6f66937986ace109e301913f17410a8e95548\`.
- A fresh same-head PR reopen produced the complete 13-workflow acceptance set, and all 13 passed: Engineering Quality \`34699147928\`, Account Ownership \`34699147963\`, UI Shell \`34699147960\`, Integrated Release \`34699147916\`, Brand / Launch \`34699147993\`, Library Search \`34699148010\`, Library Lifecycle \`34699147921\`, Library History \`34699147952\`, Library Favorites \`34699147991\`, Library Collections \`34699148071\`, Library Batch Delete \`34699147966\`, Media Delete \`34699147951\`, and Library Drag Drop \`34699148008\`. The first Drag Drop attempt on the same SHA was cancelled before job creation by the shared lifecycle concurrency group; the unchanged same-head reopen run executed fully and passed.
- Human fidelity review accepted the real implementation against the approved v0.3 design. History artifact \`10298855903\` (\`sha256:f832cc248f6f88a4caefe6867b12e972b49c08c4b998ab36e5f538d78f7c36d2\`) verified settled desktop/390px selection, 0/60/180/360ms transition evidence and reduced motion. Batch Actions artifact \`10298746267\` (\`sha256:363c76df628f3d75b0c9a80a3a54b00c9d029c2dd757647afe56a60c6f835f12\`) verified real Organize composition. Drag Drop artifact \`10299387838\` (\`sha256:158f374852709351880767c6780bcc62dd1a87c2fadca8e52a73d06412b92655\`) verified desktop drop-active/completed and 390px completed Uploads states.
- Presentation-only verifier corrections were bounded to UI-075 reality: Search targets the new \`Search Library\` accessible name; History waits for the selection rail to settle before the required mobile selected-state capture; Lifecycle verifies Gallery Rail media-frame fill with \`object-fit: cover\` while Viewer still verifies the source asset ratio. Product/security assertions were not weakened. One Lifecycle attempt transiently missed the short-lived \`Added to Library.\` status after upload completion and cleanup; the unchanged retry passed the full verifier.
- PR #194 squash-merged to \`main\` as \`af88b93dcb4fcbca502b42f9ea1186192af48a6a\`. GitHub attached exactly two push workflows to that merge SHA and both passed: Engineering Quality \`34699439085\` and UI Shell Validation \`34699439083\`.
- Phase 24 repository implementation is therefore user-approved, exact-head verified, merged and merged-main verified. Production remains unchanged at source \`0173c4c5ba08360b6352331118abc81978cfa774\` / READY deployment \`dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991\`; automatic Git → Vercel deployment remains disabled and no Phase 24 deployment is authorized.`,
  projectPath,
);
project = project.replace(
  /^- The verified application implementation baseline is .*$/m,
  "- The verified repository application baseline is Phase 24 / PR #194 merge `af88b93dcb4fcbca502b42f9ea1186192af48a6a`; Gallery Rail v0.3 is user-approved, exact-head verified and merged-main verified. Production remains the separately approved source `0173c4c5ba08360b6352331118abc81978cfa774`; no production deployment followed the Phase 24 repository merge.",
);
await write(projectPath, project);

const migrationPath = "docs/ui/UI_MIGRATION.md";
let migration = await read(migrationPath);
migration = replaceSection(
  migration,
  "## Phase 24 — Library Gallery Rail v0.3",
  "## Phase 0 — Product & Capability Baseline",
  `## Phase 24 — Library Gallery Rail v0.3 closure — 2026-09-12
**Status: \`USER-APPROVED / EXACT-HEAD VERIFIED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED\`.**

- [x] Restarted Library R&D from merged UI-074 Create/Landing visual authority rather than the rejected pre-approval Library direction.
- [x] Final Gallery Rail v0.3 design authority remains R&D head \`ba842e919305e07262ae95c81b3c2063a455b54d\`, run \`34689164957\`, artifact \`10296866215\`, digest \`sha256:db81c13f34514022f01a9e8998de4c0622ee946e316d02655c70477db1a87d95\`; user approval is recorded on #191.
- [x] UI-075 and \`docs/ui/LIBRARY_GALLERY_RAIL_IMPLEMENTATION_CONTRACT.md\` were merged before implementation under PR #193 / \`275cf0535ceb444652b6c61af3ce4a72a319ad17\`.
- [x] PR #194 implemented one compact Gallery Rail, first-class search, media-first cards, in-place current-page selection mode, real Organize/Delete integration, bounded media-local pointer depth, static touch behavior and reduced-motion equivalence while preserving URL/server state and every locked Library product/security contract.
- [x] Definitive implementation head \`d0a6f66937986ace109e301913f17410a8e95548\` passed the fresh complete 13-workflow attached set: Engineering \`34699147928\`, Ownership \`34699147963\`, Shell \`34699147960\`, Integrated Release \`34699147916\`, Brand/Launch \`34699147993\`, Search \`34699148010\`, Lifecycle \`34699147921\`, History \`34699147952\`, Favorites \`34699147991\`, Collections \`34699148071\`, Batch Delete \`34699147966\`, Media Delete \`34699147951\`, and Drag Drop \`34699148008\`.
- [x] Human fidelity review accepted History artifact \`10298855903\` (\`sha256:f832cc248f6f88a4caefe6867b12e972b49c08c4b998ab36e5f538d78f7c36d2\`), Batch Actions artifact \`10298746267\` (\`sha256:363c76df628f3d75b0c9a80a3a54b00c9d029c2dd757647afe56a60c6f835f12\`) and Drag Drop artifact \`10299387838\` (\`sha256:158f374852709351880767c6780bcc62dd1a87c2fadca8e52a73d06412b92655\`) against the approved v0.3 direction across desktop, 390px, temporal selection and reduced-motion states.
- [x] Presentation verifier migrations were bounded to the approved redesign: Search uses the new accessible name, History captures settled mobile selection, and Lifecycle validates Gallery Rail frame fill while Viewer retains source-ratio verification. Existing behavior/security assertions remain intact.
- [x] PR #194 squash-merged as \`af88b93dcb4fcbca502b42f9ea1186192af48a6a\`.
- [x] Every workflow GitHub actually attached to merged \`main\` passed: Engineering Quality \`34699439085\` and UI Shell Validation \`34699439083\`.
- [ ] Production deployment remains separately explicit. Production is still source \`0173c4c5ba08360b6352331118abc81978cfa774\` / READY deployment \`dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991\`; automatic Git → Vercel deployment remains disabled.

**Phase 24 boundary preserved:** no schema/API/provider/worker/R2/auth/admission/ownership/capability/routing/deployment contract changed. Creatives/Uploads, search/filter/sort/organization, durable identity, Viewer activation and current-page batch semantics remain product-truthful and server/URL-owned where previously defined.`,
  migrationPath,
);
await write(migrationPath, migration);

const decisionsPath = "docs/ui/UI_DECISIONS.md";
let decisions = await read(decisionsPath);
decisions = replaceSection(
  decisions,
  "### UI-075 — Library Gallery Rail makes discovery compact and selection an in-place workspace mode",
  "### UI-076",
  `### UI-075 — Library Gallery Rail makes discovery compact and selection an in-place workspace mode
**Status:** Accepted / implemented / verified / merged  
**Date:** 2026-09-12

**Decision:** The user-approved Gallery Rail v0.3 direction is the authoritative production composition for \`/library\`. Library keeps the UI-074 compact horizontal application header, compresses route context, promotes search into the primary retrieval field, consolidates source/filter/organization controls into one compact command rail, and keeps the media field visually dominant. Current-page selection transforms that same command rail in place into selection summary/actions; it does not introduce a generic floating batch toolbar over media.

**Product boundary:** All established Library contracts remain unchanged: Creatives/Uploads are URL/server-owned views over the same durable \`media_assets\`; kind/search/Favorites/Collections/sort/pagination remain URL/server-owned; uploads and desktop drop stay Uploads-only; selection remains current-page transient state with existing bounded Organize/Delete behavior; cards remain Viewer links; account ownership/security and durable-media identity remain unchanged. No schema, API, worker/provider, storage, routing or deployment change was introduced.

**Card/interaction boundary:** UI-075 supersedes UI-070's card presentation only where the approved v0.3 evidence differs. UI-070's maintained 44×44 checkbox root, centered 22×22 visible indicator, card-link semantics, no quick-actions rule, no hover-only essential behavior and no client-owned media state remain authoritative. Pointer-capable media uses bounded local depth/highlight; touch and reduced motion retain complete static meaning. Ordinary command controls remain stable and touch-safe.

**Truthfulness rule:** Prototype counts and labels remain representative design content rather than product facts. Production shows only route-supported counts/labels, and sort/source context reflects active URL state. No corpus total, progress or capability is fabricated for visual fidelity.

**Verification:** accepted design authority remains R&D head \`ba842e919305e07262ae95c81b3c2063a455b54d\`, run \`34689164957\`, artifact \`10296866215\` (\`sha256:db81c13f34514022f01a9e8998de4c0622ee946e316d02655c70477db1a87d95\`). Production PR #194 definitive head \`d0a6f66937986ace109e301913f17410a8e95548\` passed the complete fresh 13-workflow attached set. Human review accepted History artifact \`10298855903\`, Batch Actions artifact \`10298746267\` and Drag Drop artifact \`10299387838\`. PR #194 squash-merged as \`af88b93dcb4fcbca502b42f9ea1186192af48a6a\`; the two workflows GitHub attached to merged main both passed: Engineering Quality \`34699439085\` and UI Shell Validation \`34699439083\`. Production deployment remains unauthorized and unchanged.`,
  decisionsPath,
);
await write(decisionsPath, decisions);

const registryPath = "docs/ui/SCREEN_REGISTRY.md";
let registry = await read(registryPath);
registry = replaceOnce(
  registry,
  "**Phase 24 redesign:** USER-APPROVED DESIGN / IMPLEMENTATION PENDING. Authority: Gallery Rail v0.3 R&D head `ba842e919305e07262ae95c81b3c2063a455b54d`, artifact `10296866215`; production contract: `docs/ui/LIBRARY_GALLERY_RAIL_IMPLEMENTATION_CONTRACT.md`; implementation tracker: #192.",
  "**Phase 24 redesign:** APPROVED / IMPLEMENTED / VERIFIED / MERGED / NOT DEPLOYED. Authority: Gallery Rail v0.3 R&D head `ba842e919305e07262ae95c81b3c2063a455b54d`, artifact `10296866215`; production contract: `docs/ui/LIBRARY_GALLERY_RAIL_IMPLEMENTATION_CONTRACT.md`; definitive implementation head `d0a6f66937986ace109e301913f17410a8e95548`; PR #194 merge `af88b93dcb4fcbca502b42f9ea1186192af48a6a`. The fresh 13-workflow exact-head acceptance set and both workflows attached to merged main passed; production remains on the prior deployed source until separately authorized.",
  registryPath,
);
const libraryStart = registry.indexOf("### Library\n");
const viewerStart = registry.indexOf("### Media Viewer", libraryStart);
if (libraryStart < 0 || viewerStart < 0) throw new Error(`${registryPath}: Library section not found`);
let librarySection = registry.slice(libraryStart, viewerStart);
librarySection = librarySection.replace(
  /^\*\*Status:\*\* APPROVED.*$/m,
  "**Status:** APPROVED — Gallery Rail v0.3 / UI-075 with existing durable-media discovery, upload, Favorites, Collections, Delete and page-scoped batch organization contracts",
);
const phase24Needle = "**Phase 24 visual direction:** Gallery Rail v0.3 may replace the current stacked Library command composition and the UI-070 card presentation only to the extent defined by UI-075. It must preserve maintained 44×44 / 22×22 selection geometry, card→Viewer activation, URL/server-owned discovery, current-page batch semantics, Uploads-only upload/drop and all ownership/security contracts.";
librarySection = replaceOnce(
  librarySection,
  phase24Needle,
  `**Phase 24 Gallery Rail closure:** Gallery Rail v0.3 now replaces the former stacked Library command composition under UI-075. Search is first-class, retrieval/organization controls share one compact rail, selection morphs that rail in place, media remains dominant, and card metadata is attached/legible. The implementation preserves maintained 44×44 / 22×22 selection geometry, card→Viewer activation, URL/server-owned discovery, current-page batch semantics, Uploads-only upload/drop and all ownership/security contracts. Exact implementation head \`d0a6f66937986ace109e301913f17410a8e95548\` passed the fresh 13-workflow suite; PR #194 merged as \`af88b93dcb4fcbca502b42f9ea1186192af48a6a\`, and merged-main Engineering Quality \`34699439085\` plus UI Shell \`34699439083\` passed.`,
  registryPath,
);
registry = `${registry.slice(0, libraryStart)}${librarySection}${registry.slice(viewerStart)}`;
await write(registryPath, registry);

const systemPath = "docs/ui/UI_SYSTEM.md";
let system = await read(systemPath);
system = replaceSection(
  system,
  "## Application Shell Direction",
  "## Maintained Primitive Foundation",
  `## Application Shell Direction
The repository implementation is authoritative. UI-074 / PR #188 established the current application-shell geometry: one compact horizontal application header across desktop and narrow layouts, with no persistent desktop left rail and no fixed mobile bottom dock. The shell is \`APPROVED\`, not \`LOCKED\`.

The header owns product/global navigation, account access, lightweight Activity/global-attention access and the route-content boundary. Create, Library, Activity, Settings and Admin continue to use the same route hierarchy and access rules; UI-074 changed presentation geometry only. Phase 24 / UI-075 does not alter shell ownership—it composes the approved Gallery Rail inside Library feature content.

### Shell/feature boundary
The persistent application shell owns:
- global/product navigation;
- compact product/route context where useful without duplicating feature headings;
- account access;
- lightweight access to Activity/global generation attention state;
- the route-content region.

The shell does **not** own:
- Create prompt/composer layout;
- operation/model controls;
- references/uploads;
- generation results;
- Library grids/cards or Gallery Rail controls;
- feature-specific toolbars or settings.

Those belong to their feature surfaces. Do not reintroduce page-specific shells, a permanent Create settings rail, or duplicate route chrome.

### Desktop
- Use one compact horizontal application header; do not restore a persistent desktop left rail.
- RenderLab/Create identity anchors the left side; Library, Activity and Settings/account access remain available in the established horizontal navigation hierarchy.
- Create and Library remain the primary product destinations; Activity and Settings remain utility destinations without requiring a second navigation surface.
- Main route content occupies the largest possible area and begins below the compact header; feature surfaces own their own context and controls.
- Avoid a redundant full-width route context bar when the feature already supplies its page context.
- Idle state should not show a persistent “ready” status pill. Global status becomes explicit only when a job, failure, degraded state or other meaningful attention condition exists.

### Mobile / narrow layouts
- Keep the same compact horizontal header model rather than introducing a separate bottom-dock navigation product.
- Do not add a fixed mobile bottom dock; Create, Library, Activity and Settings/account access remain reachable through the responsive header/utility composition.
- Preserve at least 44×44 effective touch targets for ordinary interactive controls where practical.
- Feature content owns its responsive controls, sheets/disclosures and safe-area spacing.
- Avoid reproducing desktop chrome vertically or hiding essential navigation behind hover-only behavior.

### Shell density targets
These are current design targets rather than immutable constants:
- compact application header: approximately 52–56px;
- primary navigation/control hit area: at least 44px effective touch height where practical;
- application chrome gaps: approximately 12–16px;
- no reserved desktop sidebar width and no fixed mobile bottom-navigation height.

Implementation may tune these values after rendered review while preserving the horizontal-header hierarchy, feature boundary, keyboard/touch semantics and reduced-motion equivalence.`,
  systemPath,
);
await write(systemPath, system);

console.log("Phase 24 closure documentation patched.");
