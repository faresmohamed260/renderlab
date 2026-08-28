import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Target checkout path is required.");

const implementationHead = "78015dcfb5881639b32f22f8877874af2c3a336b";
const runs = "Library Batch Delete `33220127853`, Account Ownership `33220127858`, UI Shell `33220127872`, Create Lifecycle `33220127874`, Library Search `33220127883`, Library History `33220127859`, Library Lifecycle `33220127864`, Library Drag Drop `33220127921`, Persistent Media Upload `33220127879`, Media Download `33220127852`, Media Rename `33220127885`, Library Favorites `33220127888`, Library Collections `33220127868`, Media Delete `33220127873`, Generation Integration `33220127851`, and Video Generation `33220127855`";
const audit = "all six RenderLab tables and configured fixture users are back to zero; six RLS tables, six non-null owner columns, zero browser grants, nullable `deleted_at`/`purged_at`, all three deletion-integrity triggers and `media_assets_owner_active_created_at_idx` remain intact; `20260828221611 renderlab_media_asset_deletion` remains the latest migration";

function file(rel) {
  return path.join(root, rel);
}

function read(rel) {
  return fs.readFileSync(file(rel), "utf8");
}

function write(rel, value) {
  fs.writeFileSync(file(rel), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`Duplicate ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

function insertBeforeOnce(text, marker, insertion, label) {
  const index = text.indexOf(marker);
  if (index < 0) throw new Error(`Missing ${label}`);
  if (text.indexOf(marker, index + marker.length) >= 0) throw new Error(`Duplicate ${label}`);
  return text.slice(0, index) + insertion + text.slice(index);
}

// PROJECT.md
{
  const rel = "PROJECT.md";
  let text = read(rel);
  text = replaceOnce(
    text,
    "### Active product slice\n- None. UI-033 is complete; no next Phase 4 product slice has been selected.\n- Batch media management is the next documented management candidate, but it requires its own selection/multi-delete/atomicity/recovery contract rather than being inferred from single-asset Delete.\n",
    `### Active product slice\n- Library Batch Delete v0.1 / UI-034 is **IN FINAL VALIDATION** on PR #29.\n- UI-034 adds explicit page-scoped Library selection and best-effort permanent deletion for at most one server-rendered page (24 assets). Each item reuses the approved UI-033 tombstone/R2 contract; successful items are never rolled back because another selected item fails, and failed items remain eligible for retry.\n- No schema migration is added. Cross-page selection, Trash/restore, batch Favorites/Collections and a global media client store remain out of scope.\n- Implementation head \`${implementationHead}\` passed all 16 affected gates: ${runs}. Desktop selected/confirmation and mobile confirmation artifacts were visually reviewed without Library hierarchy drift.\n- Shared-resource verification is clean: ${audit}.\n- Remaining gate before merge: rerun the same 16-gate matrix on the exact documentation-finalized PR head, repeat the shared-resource audit, then merge and verify merged-\`main\` checks/cleanup/no-deployment state.\n`,
    "PROJECT active UI-034 block",
  );
  text = text.replace(
    "`src/components/ui` owns normalized Alert, Button, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle and ToggleGroup primitives.",
    "`src/components/ui` owns normalized Alert, AlertDialog, Button, Checkbox, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle and ToggleGroup primitives.",
  );
  write(rel, text);
}

// UI_MIGRATION.md
{
  const rel = "docs/ui/UI_MIGRATION.md";
  let text = read(rel);
  const marker = "## Phase 5 — Operational & Secondary Experiences\n";
  const section = `### Library Batch Delete v0.1 — PR #29 / UI-034\nUI-034 extends approved single-asset Delete with the smallest coherent Library batch contract. Selection remains transient and page-scoped; deletion remains per-asset and idempotent rather than pretending database + R2 cleanup is globally transactional.\n\n- [x] Select page-scoped Library Batch Delete as the next Phase 4 media-management slice.\n- [x] Define UI-034: explicit Library selection mode, current-page selection only, maximum 24 durable IDs, reset across Library view navigation, and no global media selection store.\n- [x] Add maintained Radix Checkbox plus a feature-owned \`LibraryBatchSelection\` composition without redesigning the approved Library toolbar/grid hierarchy.\n- [x] Add owner-scoped \`POST /api/media/assets/batch-delete\` with UUID validation, deduplication, a one-page/24-item cap and per-item results.\n- [x] Reuse the existing UI-033 \`deleteMediaAsset\` contract per item; successful tombstones/purges are not rolled back because another selected asset fails.\n- [x] Keep foreign/missing IDs indistinguishable as per-item not-found; retain failed active IDs for retry and report cleanup-pending success truthfully.\n- [x] Add configured two-account batch verification covering request bounds, signed-out/foreign denial, mixed partial success, Favorite/collection/upload-session cleanup, R2 primary/thumbnail purge, generation-history preservation, idempotence, page-scoped selection reset, responsive confirmation and exact cleanup.\n- [x] Correct the first browser verifier timing issue by immediately hiding successfully deleted cards while the authoritative server refresh catches up; the underlying API/database/R2 deletion had already succeeded and cleanup remained exact.\n- [x] Implementation head \`${implementationHead}\` passed all 16 affected gates: ${runs}.\n- [x] Visually review the successful configured artifacts: desktop selection remains compact, selected cards remain media-first, destructive confirmation is explicit, and the mobile dialog remains touch-friendly without hierarchy drift.\n- [x] Pre-finalization shared-resource audit is clean: ${audit}.\n- [ ] Pass the complete 16-gate suite on the documentation-finalized exact PR head.\n- [ ] Merge PR #29 and verify merged-\`main\` push checks.\n- [ ] Verify post-merge shared-resource cleanup and zero unintended Vercel deployment.\n\n**Library Batch Delete v0.1 status: \`IN FINAL VALIDATION\`. Cross-page selection, Trash/restore, batch Favorites/Collections and other bulk-management actions remain separate future contracts.**\n\n`;
  text = insertBeforeOnce(text, marker, section, "UI_MIGRATION Phase 5 marker");
  text = replaceOnce(
    text,
    "**Current product slice:** None. UI-033 is complete; no next Phase 4 product slice has been selected.\n**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, and Durable Media Delete PR #25 / UI-033 are merged and approved.\n**Completed foundation prerequisites:** PR #13 / UI-026 maintained primitive purity refactor merged as `5953934d5f67c16304be7493eda27c88e24c02cc`; Account Identity PR #16 / UI-029 merged as `bcb20365db102252db51263968de96fc795be518`.  \n**Current gate:** No active Phase 4 implementation gate. Select the next slice explicitly before implementation.\n**Next product slice:** Batch media management is the next documented candidate, but it is not yet selected. Define selection, multi-delete atomicity, partial-failure/retry and recovery UX explicitly before implementation; do not infer them from UI-033.\n",
    "**Current product slice:** Library Batch Delete v0.1 / UI-034 is IN FINAL VALIDATION on PR #29.\n**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, and Durable Media Delete PR #25 / UI-033 are merged and approved.\n**Completed foundation prerequisites:** PR #13 / UI-026 maintained primitive purity refactor merged as `5953934d5f67c16304be7493eda27c88e24c02cc`; Account Identity PR #16 / UI-029 merged as `bcb20365db102252db51263968de96fc795be518`.  \n**Current gate:** rerun all 16 affected workflows on the exact documentation-finalized UI-034 head, then merge only after a clean shared-resource audit.\n**Next product slice:** None selected after UI-034. Do not expand batch Delete into Trash/restore, cross-page selection, batch Favorites/Collections or a generic bulk-management framework without a separate contract.\n",
    "UI_MIGRATION current work block",
  );
  write(rel, text);
}

// UI_DECISIONS.md
{
  const rel = "docs/ui/UI_DECISIONS.md";
  let text = read(rel);
  const section = `\n\n### UI-034 — Library batch Delete is page-scoped and best-effort\n**Status:** Accepted  \n**Decision:** Library Batch Delete v0.1 adds an explicit transient selection mode to the currently rendered Library page. Selection is not URL state and does not persist across kind/search/Favorites/collection/sort/pagination changes. The product API accepts at most one page of durable IDs (24), resolves every item under the verified account, and applies the existing UI-033 tombstone/R2 deletion contract per item. The batch result is best-effort and per-item: completed deletions are not rolled back because another selected item fails; failed items remain eligible for retry. v0.1 does not add cross-page selection, Trash/restore, batch Favorites/Collections, or a global media client store.  \n**Reason:** Database tombstoning can establish per-asset product unavailability, but R2 cleanup is a distributed per-object operation, so promising all-or-nothing multi-delete across database and storage would be false. Page-scoped selection gives users useful bulk cleanup without inventing durable selection state or a broad management framework.  \n**Consequences:** \`POST /api/media/assets/batch-delete\` is owner-scoped, UUID-bounded, deduplicated and capped at 24. Missing/foreign IDs collapse to per-item not-found. Successful items immediately disappear locally while server-owned Library data refreshes; partial failures are reported truthfully and failed IDs stay selected for retry. No new schema migration is required; UI-034 reuses applied \`0009_media_asset_deletion.sql\`.\n`;
  if (!text.includes("### UI-034 — Library batch Delete is page-scoped and best-effort")) text = text.trimEnd() + section;
  write(rel, text);
}

// UI_SYSTEM.md
{
  const rel = "docs/ui/UI_SYSTEM.md";
  let text = read(rel);
  text = replaceOnce(
    text,
    "Current approved local primitives under `src/components/ui`:\n- `Alert` / `AlertDescription`\n- `Button`\n- `Collapsible` / trigger / content\n- `Empty` composition with heading-preserving `EmptyTitle`\n",
    "Current approved local primitives under `src/components/ui`:\n- `Alert` / `AlertDescription`\n- `AlertDialog` / action / cancel / content / description / title / trigger\n- `Button`\n- `Checkbox` (UI-034 candidate in final validation)\n- `Collapsible` / trigger / content\n- `DropdownMenu` / content / items / radio items\n- `Empty` composition with heading-preserving `EmptyTitle`\n",
    "UI_SYSTEM primitive list",
  );
  write(rel, text);
}

// COMPONENT_CATALOG.md
{
  const rel = "docs/ui/COMPONENT_CATALOG.md";
  let text = read(rel);
  text = text.replace(
    "**Current primitives:** Alert, AlertDialog, Button, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle, ToggleGroup.",
    "**Current primitives:** Alert, AlertDialog, Button, Checkbox (UI-034 candidate), Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle, ToggleGroup.",
  );
  text = text.replace(
    "**Used by:** application shell, Create, Create Advanced, Library search/filter/sort/upload/Favorites/Collections/empty state, Media Viewer and Viewer Favorite/Collections/Rename/Download actions.",
    "**Used by:** application shell, Create, Create Advanced, Library search/filter/sort/upload/Favorites/Collections/selection/empty state, Media Viewer and Viewer Favorite/Collections/Rename/Download/Delete actions.",
  );
  const checkboxSection = `### Checkbox\n**Status:** EXPERIMENTAL\n**Source:** \`src/components/ui/checkbox.tsx\`\n**Origin:** shadcn/Radix Checkbox wrapper normalized to RenderLab tokens\n**Purpose:** Accessible checked/unchecked selection control for UI-034 page-scoped Library media selection.\n**Used by:** \`LibraryBatchSelection\` only while PR #29 is in final validation.\n**Reuse rules:** Use maintained checked-state/focus semantics for real multi-selection; keep media IDs and batch product behavior outside the primitive.\n**Do not:** Turn Checkbox into durable selection state, a card data store or a substitute for URL/server-owned Library filtering.\n**Notes:** UI-034 implementation head \`${implementationHead}\` passed UI Shell \`33220127872\`, Library Batch Delete \`33220127853\` and the complete affected implementation matrix. Promote the UI-034 usage to approved only after exact documentation-head validation and merge.\n\n`;
  text = insertBeforeOnce(text, "### AppShell\n", checkboxSection, "COMPONENT_CATALOG AppShell marker");
  text = text.replace(
    "**Origin:** RenderLab composition from `design/penpot/library-v0.1.svg`, extended by approved Upload/search/history/drag-drop/Favorites behavior and the verified UI-032 Collections contract.\n**Purpose:** Durable-media Library with URL-owned literal search, kind/Favorites/collection filtering, chronological ordering, responsive browsing, metadata, pagination, upload entry and Viewer deep links.\n**Variants:** All/Images/Videos; Favorites on/off; optional selected collection; Newest/Oldest; active/clear search; configured/unavailable/empty/no-match/paginated states; transient desktop drag-active upload state; desktop/mobile.\n**Dependencies:** Next.js Link, maintained Button/Input/DropdownMenu/Alert/Empty primitives, native hidden form plumbing, Lucide, `PublicMediaAsset`, media-list/search/sort/favorite/collection contracts, feature-owned `LibraryUploadButton`, `LibraryDropUploadSurface`, `LibrarySortMenu` and `LibraryCollectionMenu`.\n**Reuse rules:** Extend this authoritative Library composition against approved durable contracts. Keep search/history/Favorites/Collections URL/server-owned and persistent upload paths on the shared feature-owned transaction.\n**Do not:** Couple to legacy `studio_*`, expose storage identity, move organization/search/history into page-only client filtering, or infer card/batch/destructive management from toolbar organization controls.\n",
    "**Origin:** RenderLab composition from `design/penpot/library-v0.1.svg`, extended by approved Upload/search/history/drag-drop/Favorites/Collections behavior and the UI-034 batch-selection candidate.\n**Purpose:** Durable-media Library with URL-owned literal search, kind/Favorites/collection filtering, chronological ordering, responsive browsing, metadata, pagination, upload entry, page-scoped batch selection and Viewer deep links.\n**Variants:** All/Images/Videos; Favorites on/off; optional selected collection; Newest/Oldest; active/clear search; configured/unavailable/empty/no-match/paginated states; transient desktop drag-active upload state; UI-034 selection/confirmation state; desktop/mobile.\n**Dependencies:** Next.js Link, maintained Button/Checkbox/Input/DropdownMenu/Alert/AlertDialog/Empty primitives, native hidden form plumbing, Lucide, `PublicMediaAsset`, media-list/search/sort/favorite/collection/batch-delete contracts, feature-owned `LibraryBatchSelection`, `LibraryUploadButton`, `LibraryDropUploadSurface`, `LibrarySortMenu` and `LibraryCollectionMenu`.\n**Reuse rules:** Extend this authoritative Library composition against approved durable contracts. Keep search/history/Favorites/Collections URL/server-owned; keep UI-034 selection transient/page-scoped; keep persistent upload paths on the shared feature-owned transaction.\n**Do not:** Couple to legacy `studio_*`, expose storage identity, move organization/search/history into page-only client filtering, persist selection across Library views, or infer other batch management actions from Delete.\n",
  );
  const batchSection = `### LibraryBatchSelection\n**Status:** EXPERIMENTAL\n**Source:** \`src/features/library/library-batch-selection.tsx\`\n**Origin:** RenderLab feature composition using maintained Checkbox/Button/AlertDialog/Alert primitives and the UI-033 deletion contract.\n**Purpose:** Explicit page-scoped Library selection plus permanent Delete for the currently rendered media page.\n**Used by:** \`LibraryView\` when media items are present.\n**Dependencies:** \`POST /api/media/assets/batch-delete\`, \`PublicMediaAsset\`, maintained Checkbox/AlertDialog/Button/Alert/Spinner, Next.js router refresh.\n**Reuse rules:** Selection is transient browser interaction state over the current server-rendered page. A keyed Library view resets it across kind/search/Favorites/collection/sort/pagination navigation. Successful items may disappear locally while server-owned data refreshes.\n**Do not:** Persist selection globally, select across pages, promise all-or-nothing R2/database deletion, add batch Favorites/Collections implicitly, or expose storage identity.\n**Notes:** UI-034 implementation head \`${implementationHead}\` passed Library Batch Delete \`33220127853\` plus the complete 15 existing affected regressions; desktop/mobile selection and confirmation artifacts were reviewed clean. Final documentation-head validation/merge remains required.\n\n`;
  text = insertBeforeOnce(text, "### LibraryUploadButton\n", batchSection, "COMPONENT_CATALOG LibraryUploadButton marker");
  write(rel, text);
}

// SCREEN_REGISTRY.md
{
  const rel = "docs/ui/SCREEN_REGISTRY.md";
  let text = read(rel);
  text = text.replace(
    "**Status:** APPROVED — Library base + Favorites v0.1 / UI-031 + Collections v0.1 / UI-032 + UI-033 tombstone filtering",
    "**Status:** APPROVED base + Favorites / UI-031 + Collections / UI-032 + UI-033 tombstone filtering; Library Batch Delete / UI-034 IN FINAL VALIDATION",
  );
  text = text.replace(
    "**Implementation:** `src/features/library/library-view.tsx`  \n**Sort control:** `src/features/library/library-sort-menu.tsx`",
    "**Implementation:** `src/features/library/library-view.tsx`  \n**Batch selection:** `src/features/library/library-batch-selection.tsx`  \n**Sort control:** `src/features/library/library-sort-menu.tsx`",
  );
  text = text.replace(
    "**Supporting:** `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-upload-contract.ts`, `src/lib/api/media-collections-contract.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-uploads.ts`, `src/server/media/media-collections.ts`, `GET /api/media/assets`, `GET|POST /api/media/collections`, collection membership routes, media-upload ticket/completion routes",
    "**Supporting:** `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-upload-contract.ts`, `src/lib/api/media-collections-contract.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-uploads.ts`, `src/server/media/media-collections.ts`, `GET /api/media/assets`, `POST /api/media/assets/batch-delete`, `GET|POST /api/media/collections`, collection membership routes, media-upload ticket/completion routes",
  );
  text = text.replace(
    "- Collections remain a compact Library selector plus Viewer contextual membership action, not a new top-level destination, card/batch action system or client-owned media store.\n",
    "- Collections remain a compact Library selector plus Viewer contextual membership action, not a new top-level destination, card/batch action system or client-owned media store.\n- UI-034 candidate adds an explicit Library `Select` mode over only the current rendered page, maintained Checkbox selection, Select/Clear Page, Cancel and one destructive batch Delete action. Selection resets when the Library URL/server view changes.\n- UI-034 batch Delete is capped at 24 IDs and best-effort per item; successful items are not rolled back because another selected item fails, while failed items remain selected for retry. It reuses UI-033 tombstone/R2 semantics and adds no schema migration.\n",
  );
  text = text.replace(
    "- UI-032 final head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed all 14 affected gates, including Collections `33210501106`, Account Ownership `33210501089`, Favorites `33210501168`, Library Lifecycle `33210501160`, Generation `33210501178` and Video Generation `33210501167`; four responsive Collections artifacts were visually reviewed, PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d`, merged-main checks UI Shell `33210876059`, Reference Upload `33210876022`, Generation Integration `33210876042`, and Video Generation `33210876085` passed, and post-merge shared-resource cleanup returned to zero.\n\n**Approved extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031, Collections v0.1 / UI-032 and single-asset Durable Media Delete v0.1 / UI-033 are approved. Batch management remains a separate future contract.\n",
    `- UI-032 final head \`fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578\` passed all 14 affected gates, including Collections \`33210501106\`, Account Ownership \`33210501089\`, Favorites \`33210501168\`, Library Lifecycle \`33210501160\`, Generation \`33210501178\` and Video Generation \`33210501167\`; four responsive Collections artifacts were visually reviewed, PR #24 merged as \`143f7bfb0be8b4857e5dd45959466e71ae22a42d\`, merged-main checks UI Shell \`33210876059\`, Reference Upload \`33210876022\`, Generation Integration \`33210876042\`, and Video Generation \`33210876085\` passed, and post-merge shared-resource cleanup returned to zero.\n- UI-034 implementation head \`${implementationHead}\` passed all 16 affected gates: ${runs}. Configured validation covered request bounds, signed-out and foreign denial, mixed partial success, database/R2 cleanup, preserved generation history, idempotence, Library-view selection reset and responsive real-browser deletion. Desktop selected/confirmation and mobile confirmation artifacts were visually reviewed clean; the shared-resource audit returned to zero with \`0009\` still latest.\n\n**Current extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031, Collections v0.1 / UI-032 and single-asset Durable Media Delete v0.1 / UI-033 are approved. Library Batch Delete v0.1 / UI-034 is IN FINAL VALIDATION on PR #29 and deliberately remains page-scoped/best-effort.\n`,
  );
  write(rel, text);
}

// FRONTEND_ARCHITECTURE.md
{
  const rel = "docs/architecture/FRONTEND_ARCHITECTURE.md";
  let text = read(rel);
  text = text.replace(
    "Durable Media Delete v0.1 / UI-033 is approved and merged through PR #25 as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445`; additive `0009_media_asset_deletion.sql` is applied as `20260828221611 renderlab_media_asset_deletion`, and final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed all 15 affected gates. Activity remains a placeholder.",
    `Durable Media Delete v0.1 / UI-033 is approved and merged through PR #25 as \`40945ff8c4c7e3a3db0e115c4d7cae9f50db4445\`; additive \`0009_media_asset_deletion.sql\` is applied as \`20260828221611 renderlab_media_asset_deletion\`, and final exact head \`53b0eb4c648b47a17fee2e735b7dddc85d345518\` passed all 15 affected gates. Library Batch Delete v0.1 / UI-034 is in final validation on PR #29; it adds no schema migration and implementation head \`${implementationHead}\` passed all 16 affected gates. Activity remains a placeholder.`,
  );
  text = text.replace("- Button\n- Collapsible", "- Button\n- Checkbox (UI-034 candidate)\n- Collapsible");
  text = text.replace(
    "- Durable Delete / UI-033 stays Viewer-contextual: confirmation is local client state, while owner-scoped tombstone + R2 purge is a server product mutation. Deleted asset IDs remain valid only as preserved generation-history references, not active product media.\n- Library drag/drop is transient browser interaction state only; it does not become URL or durable media-management state.\n",
    "- Durable Delete / UI-033 stays Viewer-contextual: confirmation is local client state, while owner-scoped tombstone + R2 purge is a server product mutation. Deleted asset IDs remain valid only as preserved generation-history references, not active product media.\n- UI-034 Library batch selection is transient current-page browser state, not URL/durable state. Library navigation resets selection. Batch Delete composes the existing owner-scoped UI-033 mutation per item and reports partial success rather than claiming cross-service transactionality.\n- Library drag/drop is transient browser interaction state only; it does not become URL or durable media-management state.\n",
  );
  text = text.replace("DELETE   /api/media/assets/[assetId]\nPUT", "DELETE   /api/media/assets/[assetId]\nPOST     /api/media/assets/batch-delete\nPUT");
  text = text.replace(
    "UI-033 adds owner-scoped idempotent `DELETE /api/media/assets/[assetId]`: tombstone first, then R2 primary/thumbnail purge, with `purged_at` recorded only after physical cleanup succeeds. Picker and drag/drop persistent uploads both use the same existing media-upload ticket/completion APIs.",
    "UI-033 adds owner-scoped idempotent `DELETE /api/media/assets/[assetId]`: tombstone first, then R2 primary/thumbnail purge, with `purged_at` recorded only after physical cleanup succeeds. UI-034 adds owner-scoped `POST /api/media/assets/batch-delete`, capped at 24 deduplicated UUIDs, which composes that same single-asset deletion per item and returns per-item outcomes/summary. Picker and drag/drop persistent uploads both use the same existing media-upload ticket/completion APIs.",
  );
  text = text.replace("│       ├── library-view.tsx\n│       ├── library-sort-menu.tsx", "│       ├── library-view.tsx\n│       ├── library-batch-selection.tsx\n│       ├── library-sort-menu.tsx");
  text = text.replace(
    "Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, Library transient drag/drop interaction, the small Library sort/collection navigation menus, Viewer Favorite/Collections/Rename interaction state plus UI-033 Delete confirmation/busy/error state, Settings account form actions and interactions that truly require browser state.",
    "Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, Library transient drag/drop interaction, UI-034 page-scoped selection/batch-delete feedback, the small Library sort/collection navigation menus, Viewer Favorite/Collections/Rename interaction state plus UI-033 Delete confirmation/busy/error state, Settings account form actions and interactions that truly require browser state.",
  );
  text = text.replace(
    "- Library file-picker/drop uploading, drag-active and local feedback state;\n- Viewer Rename editor",
    "- Library file-picker/drop uploading, drag-active and local feedback state;\n- UI-034 current-page selected media IDs, batch confirmation/busy/error state and immediately hidden successful-delete IDs while server data refreshes;\n- Viewer Rename editor",
  );
  text = text.replace(
    "Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one. UI-030 ownership enforcement is complete; approved UI-031 keeps Favorites on the durable asset, approved UI-032 keeps Collections as a separate owner-scoped relation, and approved UI-033 keeps deletion state server-owned through durable tombstones rather than a global client media-management store.",
    "Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one. UI-030 ownership enforcement is complete; approved UI-031 keeps Favorites on the durable asset, approved UI-032 keeps Collections as a separate owner-scoped relation, approved UI-033 keeps deletion state server-owned through durable tombstones, and UI-034 keeps selection bounded to one rendered Library page rather than creating a global client media-management store.",
  );
  const flow = `## Library Batch Delete Flow — UI-034 / PR #29 (final validation)\n\n\`\`\`text\nserver-rendered Library page (<= 24 active assets)\n  -> explicit local Select mode\n  -> transient selected opaque media IDs\n  -> POST /api/media/assets/batch-delete\n  -> verified owner + UUID/dedupe/page-size validation\n  -> sequential per-item UI-033 deleteMediaAsset(owner, id)\n  -> per-item deleted/cleanupPending/not-found/unavailable result\n  -> successful cards disappear locally + router.refresh()\n  -> failed active IDs stay selected for retry\n\`\`\`\n\nRules:\n- selection is current-page transient state and resets across Library URL/server-view navigation;\n- batch requests are capped at 24 IDs and add no durable selection table/state;\n- each asset keeps the existing UI-033 tombstone-first/R2 cleanup semantics and owner boundary;\n- batch execution is intentionally best-effort because database tombstones and distributed R2 deletion cannot truthfully provide one cross-service transaction;\n- completed item deletion is never reversed because another selected item fails;\n- foreign/missing IDs remain indistinguishable as per-item not-found;\n- no new migration is required; applied \`0009_media_asset_deletion.sql\` remains the schema authority;\n- cross-page selection, Trash/restore, retention, batch Favorites/Collections and generic bulk action infrastructure are outside v0.1.\n\nImplementation head \`${implementationHead}\` passed all 16 affected workflows, including Library Batch Delete \`33220127853\`, Media Delete \`33220127873\`, Account Ownership \`33220127858\`, Library Lifecycle \`33220127864\`, Generation \`33220127851\` and Video Generation \`33220127855\`. Successful desktop/mobile batch artifacts were visually reviewed clean and the shared-resource audit returned to zero. Final exact documentation-head rerun/merge remains required.\n\n`;
  text = insertBeforeOnce(text, "## Account Identity Flow\n", flow, "FRONTEND Account Identity marker");
  write(rel, text);
}

// INFRASTRUCTURE.md
{
  const rel = "docs/architecture/INFRASTRUCTURE.md";
  let text = read(rel);
  text = text.replace(
    "- UI-030 satisfies the ownership-isolation prerequisite for personal organization; UI-031 Favorites and UI-032 Collections are approved separate organization slices. UI-033 owns the approved single-asset tombstone/R2/history semantics; batch media management remains separate.",
    "- UI-030 satisfies the ownership-isolation prerequisite for personal organization; UI-031 Favorites and UI-032 Collections are approved separate organization slices. UI-033 owns the approved single-asset tombstone/R2/history semantics; UI-034 composes that contract for page-scoped best-effort batch Delete without a new schema migration.",
  );
  const insert = `UI-034 / PR #29 adds no Supabase migration and no new R2 contract. Implementation head \`${implementationHead}\` reuses applied \`0009_media_asset_deletion.sql\` per selected asset and passed all 16 affected workflows, including configured mixed owner/foreign partial-success deletion. The implementation-head shared-resource audit found ${audit}. Final documentation-head rerun/merge remains required before UI-034 is approved.\n\n`;
  text = insertBeforeOnce(text, "Service-role access remains server-only.", insert, "INFRASTRUCTURE service-role marker");
  write(rel, text);
}

console.log("UI-034 pre-merge documentation synchronized.");
