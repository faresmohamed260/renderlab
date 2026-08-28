import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Target checkout path is required.");

function file(rel) {
  return path.join(root, rel);
}
function read(rel) {
  return fs.readFileSync(file(rel), "utf8");
}
function write(rel, text) {
  fs.writeFileSync(file(rel), text, "utf8");
}
function replaceOnce(text, search, replacement, label) {
  const first = text.indexOf(search);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (text.indexOf(search, first + search.length) >= 0) throw new Error(`Ambiguous ${label}`);
  return text.slice(0, first) + replacement + text.slice(first + search.length);
}
function replaceSection(text, start, end, replacement, label) {
  const a = text.indexOf(start);
  if (a < 0) throw new Error(`Missing ${label} start`);
  const b = text.indexOf(end, a + start.length);
  if (b < 0) throw new Error(`Missing ${label} end`);
  return text.slice(0, a) + replacement + text.slice(b);
}
function insertBefore(text, anchor, block, label) {
  if (text.includes(block.trim())) return text;
  const at = text.indexOf(anchor);
  if (at < 0) throw new Error(`Missing ${label} anchor`);
  return text.slice(0, at) + block + text.slice(at);
}

const finalRuns = "Media Delete `33216665876`, Account Ownership `33216665938`, UI Shell `33216665773`, Create Lifecycle `33216665796`, Library Search `33216665758`, Library History `33216665833`, Library Lifecycle `33216665791`, Library Drag Drop `33216665793`, Persistent Media Upload `33216665806`, Media Download `33216665819`, Media Rename `33216665790`, Library Favorites `33216665770`, Library Collections `33216665804`, Generation Integration `33216665787`, and Video Generation `33216665774`";

// PROJECT.md
{
  let text = read("PROJECT.md");
  const replacement = `### Active product slice\n- Durable Media Delete v0.1 / UI-033 is **IN FINAL VALIDATION** on PR #25.\n- UI-033 is intentionally single-asset and Viewer-contextual: tombstone first, retryable R2 purge second, generation history preserved, and no restore/trash or batch/card-selection framework in v0.1.\n- Additive migration \`0009_media_asset_deletion.sql\` is applied as \`20260828221611 renderlab_media_asset_deletion\`.\n- Decision-finalized head \`1d087e5791bd713e4b0f1d540bff18bea5fae386\` passed the complete 15-gate affected suite (${finalRuns}). Desktop/mobile destructive confirmation artifacts were visually reviewed without hierarchy drift.\n- Shared Supabase cleanup is back to zero across all six RenderLab tables and configured fixture users; six RLS tables, six non-null owners, zero browser grants, deletion guards and the active-media index remain intact. Security advisors report only the expected no-policy INFO notices on deliberately server-owned tables; performance advisors report only unused-index INFO notices.\n- Remaining gate before merge: synchronize the full repository handoff on the PR head, rerun the same 15-gate matrix on that exact documentation-finalized head, then merge and verify merged-\`main\` cleanup/no-deployment state.\n\n### Latest completed product slice`;
  text = replaceSection(text, "### Active product slice", "### Latest completed product slice", replacement, "PROJECT active slice");
  write("PROJECT.md", text);
}

// UI_MIGRATION.md
{
  let text = read("docs/ui/UI_MIGRATION.md");
  const block = `### Durable media Delete v0.1 — PR #25 / UI-033\nUI-033 resolves the previously blocked destructive-media contract with the smallest coherent action: one permanent Media Viewer Delete. Batch/card selection remains a separate future slice.\n\n- [x] Define tombstone-first semantics in \`UI_DECISIONS.md\`: \`deleted_at\` makes media immediately unavailable; \`purged_at\` records completed R2 cleanup; user restore/trash is not part of v0.1.\n- [x] Preserve generation-job input/output media IDs as historical opaque references instead of rewriting execution history.\n- [x] Apply \`0009_media_asset_deletion.sql\` as \`20260828221611 renderlab_media_asset_deletion\`.\n- [x] Keep deleted rows out of ordinary owner-scoped Library/Viewer/content/thumbnail/download/Favorites/Collections reads and out of new generation-input resolution.\n- [x] Clear Favorite state plus collection/upload-session links on the first tombstone at the database boundary.\n- [x] Add owner-scoped idempotent \`DELETE /api/media/assets/[assetId]\`; purge primary + optional thumbnail R2 objects and set \`purged_at\` only after physical cleanup succeeds.\n- [x] Return truthful cleanup-pending state when tombstoning succeeds but R2 cleanup does not; never reverse a tombstone.\n- [x] Reject tombstoned media before native or external generation submission; do not implicitly cancel generation already in flight.\n- [x] Add maintained Radix/shadcn AlertDialog confirmation and one visually secondary Viewer Delete action; do not add Library-card or batch actions.\n- [x] Add configured two-account Media Delete lifecycle covering signed-out/foreign denial, database cleanup, R2 purge, historical-job preservation, idempotence, generation-input rejection, responsive confirmation UI and exact cleanup.\n- [x] Decision-finalized head \`1d087e5791bd713e4b0f1d540bff18bea5fae386\` passed all 15 applicable gates: ${finalRuns}.\n- [x] Visually review desktop/mobile Delete confirmation artifacts; Continue remains dominant, existing Favorite/Collections/Rename/Download composition is preserved and mobile confirmation remains touch-friendly.\n- [x] Pre-finalization shared-resource audit returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants, nullable \`deleted_at\`/\`purged_at\`, deletion triggers and \`media_assets_owner_active_created_at_idx\` intact.\n- [x] Post-\`0009\` Supabase advisors show no new actionable security/performance issue: expected server-owned no-policy INFO plus unused-index INFO only.\n- [ ] Pass the complete 15-gate suite on the documentation-finalized exact PR head.\n- [ ] Merge PR #25 and verify merged-\`main\` push checks.\n- [ ] Verify post-merge Supabase/R2 cleanup and zero unintended Vercel deployment.\n\n**Durable Media Delete v0.1 status: \`IN FINAL VALIDATION\`. Batch media management remains out of scope until single-delete is approved and a separate batch interaction/atomicity contract is selected.**\n\n`;
  text = insertBefore(text, "## Phase 5 — Operational & Secondary Experiences", block, "UI-033 migration section");
  const currentWork = `## Current Work\n**Current phase:** Phase 4 — Media & Continuation.  \n**Current product slice:** Durable Media Delete v0.1 / UI-033 is IN FINAL VALIDATION on PR #25.\n**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, and Library Collections PR #24 / UI-032 are merged and approved.\n**Completed foundation prerequisites:** PR #13 / UI-026 maintained primitive purity refactor merged as \`5953934d5f67c16304be7493eda27c88e24c02cc\`; Account Identity PR #16 / UI-029 merged as \`bcb20365db102252db51263968de96fc795be518\`.  \n**Current gate:** documentation-finalize UI-033, rerun all 15 affected workflows on that exact head, then merge only after a clean shared-resource audit.\n**Next product slice:** after UI-033 is fully approved, batch media management may be considered as a separate contract; do not infer selection, multi-delete atomicity, recovery UX or card actions from the single-asset Viewer Delete implementation.\n\n`;
  text = replaceSection(text, "## Current Work", "## Session Handoff Rule", currentWork + "## Session Handoff Rule", "UI_MIGRATION current work");
  write("docs/ui/UI_MIGRATION.md", text);
}

// SCREEN_REGISTRY.md
{
  let text = read("docs/ui/SCREEN_REGISTRY.md");
  text = replaceOnce(
    text,
    "**Status:** APPROVED — Library base + Favorites v0.1 / UI-031 + Collections v0.1 / UI-032",
    "**Status:** APPROVED — Library base + Favorites v0.1 / UI-031 + Collections v0.1 / UI-032; UI-033 tombstone filtering IN FINAL VALIDATION",
    "Library status",
  );
  text = replaceOnce(
    text,
    "**Approved extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031 and Collections v0.1 / UI-032 are approved separate organization contracts. Delete/batch remains blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit.",
    "**Current extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031 and Collections v0.1 / UI-032 are approved organization contracts. UI-033 now has an explicit tombstone/R2/history contract and is in final validation for single-asset Viewer Delete; batch management remains a separate future contract.",
    "Library extension",
  );
  text = replaceOnce(
    text,
    "**Status:** APPROVED — Media Viewer base + Download + Rename + Favorites + Collections v0.1 / UI-032",
    "**Status:** APPROVED — Media Viewer base + Download + Rename + Favorites + Collections v0.1 / UI-032; Delete v0.1 / UI-033 IN FINAL VALIDATION",
    "Viewer status",
  );
  text = replaceOnce(
    text,
    "`src/app/api/media/assets/[assetId]/route.ts`, `src/app/api/media/assets/[assetId]/favorite/route.ts`, `src/app/api/media/assets/[assetId]/download/route.ts`",
    "`src/app/api/media/assets/[assetId]/route.ts` (GET/PATCH/DELETE), `src/app/api/media/assets/[assetId]/favorite/route.ts`, `src/app/api/media/assets/[assetId]/download/route.ts`",
    "Viewer supporting routes",
  );
  const viewerBullet = "- UI-033 candidate adds one visually secondary permanent `Delete` action beneath existing durable actions. Confirmation uses the maintained AlertDialog primitive; successful deletion tombstones first, removes collection/upload links, purges R2 content/thumbnail, preserves generation-history IDs and returns to Library. Tombstoned media is not reusable as a new generation input.\n";
  text = insertBefore(text, "- UI-030 requires a verified account for private Viewer state;", viewerBullet, "Viewer Delete behavior");
  const evidence = `**Delete validation evidence:** decision-finalized head \`1d087e5791bd713e4b0f1d540bff18bea5fae386\` passed Media Delete \`33216665876\` plus the complete 14 existing affected regressions. Configured verification proved signed-out/foreign denial, database tombstone cleanup, R2 primary/thumbnail purge, generation-history preservation, idempotent retry and rejected post-delete generation reuse. Desktop/mobile confirmation screenshots were visually reviewed clean. Final documentation-head rerun and merge remain pending.\n\n`;
  text = insertBefore(text, "**Do not change:** Provider/worker/R2 identity stays internal.", evidence, "Viewer Delete evidence");
  text = replaceOnce(
    text,
    "Favorite/Collections/Download/Rename remain contextual product actions; do not expose raw R2 keys/signed URLs as durable product links or add collection rename/delete, Library-card/batch membership or destructive media actions without their own contract.",
    "Favorite/Collections/Download/Rename remain contextual product actions; UI-033 Delete follows its explicit tombstone/purge contract. Do not expose raw R2 keys/signed URLs as durable product links or infer collection rename/delete, Library-card selection or batch destructive actions from the single-asset Viewer action.",
    "Viewer do-not-change",
  );
  write("docs/ui/SCREEN_REGISTRY.md", text);
}

// COMPONENT_CATALOG.md
{
  let text = read("docs/ui/COMPONENT_CATALOG.md");
  text = replaceOnce(
    text,
    "**Current primitives:** Alert, Button, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle, ToggleGroup.",
    "**Current primitives:** Alert, AlertDialog (UI-033 candidate), Button, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle, ToggleGroup.",
    "primitive list",
  );
  const alertDialog = `### AlertDialog\n**Status:** EXPERIMENTAL  \n**Source:** \`src/components/ui/alert-dialog.tsx\`  \n**Origin:** shadcn/Radix AlertDialog wrapper normalized to RenderLab tokens  \n**Purpose:** Accessible modal confirmation for a genuinely destructive action with focus trapping/restoration, labelled title/description and explicit cancel/action semantics.  \n**Used by:** UI-033 Media Viewer Delete candidate only while PR #25 is in final validation.  \n**Reuse rules:** Use for destructive confirmation that truly requires an interruptive modal decision; keep product mutation/copy outside the primitive.  \n**Do not:** Turn ordinary confirmations into modal friction, hide destructive consequences, or bypass feature-owned authorization/data contracts.  \n**Notes:** UI-033 decision-finalized head \`1d087e5791bd713e4b0f1d540bff18bea5fae386\` passed UI purity/build, Media Delete \`33216665876\` and responsive desktop/mobile confirmation review. Promote to APPROVED only after PR #25 final exact-head validation/merge.\n\n`;
  text = insertBefore(text, "### AppShell", alertDialog, "AlertDialog catalog entry");
  text = replaceOnce(
    text,
    "**Variants:** image/video; generated/uploaded metadata; optional dimensions/duration; continuation actions when supported; Viewer-only Favorite, Collections, Download and Rename.",
    "**Variants:** image/video; generated/uploaded metadata; optional dimensions/duration; continuation actions when supported; Viewer-only Favorite, Collections, Download and Rename; UI-033 single-asset Delete candidate in final validation.",
    "MediaViewer variants",
  );
  text = replaceOnce(
    text,
    "**Dependencies:** Next.js Link, maintained Button primitive, Lucide React, `PublicMediaAsset`, shared continuation capabilities, product media/collection routes, feature-owned `MediaViewerActions` and `MediaViewerCollections`.",
    "**Dependencies:** Next.js Link, maintained Button/AlertDialog primitives, Lucide React, `PublicMediaAsset`, shared continuation capabilities, product media/collection routes, feature-owned `MediaViewerActions` and `MediaViewerCollections`.",
    "MediaViewer dependencies",
  );
  text = replaceOnce(
    text,
    "**Origin:** RenderLab feature composition using maintained Button/Input primitives, React client state and Lucide React.",
    "**Origin:** RenderLab feature composition using maintained Button/Input/AlertDialog primitives, React client state and Lucide React.",
    "MediaViewerActions origin",
  );
  text = replaceOnce(
    text,
    "**Purpose:** Viewer-owned secondary action group for durable Favorite + Collections + Rename + Download, including local favorite/rename state and the feature-owned Collections composition.",
    "**Purpose:** Viewer-owned secondary action group for durable Favorite + Collections + Rename + Download plus the UI-033 single-asset Delete candidate, including local mutation/confirmation state and the feature-owned Collections composition.",
    "MediaViewerActions purpose",
  );
  text = replaceOnce(
    text,
    "**Dependencies:** favorite PUT/DELETE, Rename PATCH, Download route, `MediaViewerCollections`, display-name contract and Next.js router refresh.",
    "**Dependencies:** favorite PUT/DELETE, Rename PATCH, asset DELETE, Download route, `MediaViewerCollections`, display-name/delete contracts, maintained AlertDialog and Next.js router navigation/refresh.",
    "MediaViewerActions dependencies",
  );
  text = replaceOnce(
    text,
    "**Do not:** Turn it into a global media-management framework, mutate R2 identity from the client, or infer Delete/batch/collection-management actions from its existence.",
    "**Do not:** Turn it into a global media-management framework, mutate R2 identity from the client, or infer batch/card selection/collection-management actions from the UI-033 single-asset Delete candidate.",
    "MediaViewerActions do-not",
  );
  text = replaceOnce(
    text,
    "**Notes:** Favorite remains full-width above the action stack; Collections is contextual below it; Rename/Download remain paired. UI-032 screenshots confirm the added disclosure does not displace continuation or existing durable actions.",
    "**Notes:** Favorite remains full-width above the action stack; Collections is contextual below it; Rename/Download remain paired. UI-033 places Delete below the existing action stack as a visually secondary destructive action. Decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed the 15 affected gates and desktop/mobile confirmation review; final documentation-head validation/merge is still required before this extension is approved.",
    "MediaViewerActions notes",
  );
  write("docs/ui/COMPONENT_CATALOG.md", text);
}

// FRONTEND_ARCHITECTURE.md
{
  let text = read("docs/architecture/FRONTEND_ARCHITECTURE.md");
  text = replaceOnce(
    text,
    "Library Collections v0.1 / UI-032 is approved and merged through PR #24 as `143f7bfb0be8b4857e5dd45959466e71ae22a42d` after final 14-gate head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578`, with migrations `0007`/`0008` applied and verified. Activity remains a placeholder.",
    "Library Collections v0.1 / UI-032 is approved and merged through PR #24 as `143f7bfb0be8b4857e5dd45959466e71ae22a42d` after final 14-gate head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578`, with migrations `0007`/`0008` applied and verified. Durable Media Delete v0.1 / UI-033 is in final validation on PR #25; additive `0009_media_asset_deletion.sql` is applied as `20260828221611 renderlab_media_asset_deletion`, and decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed all 15 affected gates. Activity remains a placeholder.",
    "approved product state",
  );
  text = replaceOnce(text, "- Alert / AlertDescription\n", "- Alert / AlertDescription\n- AlertDialog / Action / Cancel / Content / Description / Title / Trigger (UI-033 candidate)\n", "primitive AlertDialog");
  text = replaceOnce(
    text,
    "- Durable Rename stays on the Viewer asset identity; the client submits a bounded display-name mutation and refreshes server-rendered asset state.\n",
    "- Durable Rename stays on the Viewer asset identity; the client submits a bounded display-name mutation and refreshes server-rendered asset state.\n- Durable Delete / UI-033 stays Viewer-contextual: confirmation is local client state, while owner-scoped tombstone + R2 purge is a server product mutation. Deleted asset IDs remain valid only as preserved generation-history references, not active product media.\n",
    "routing Delete rule",
  );
  text = replaceOnce(text, "PATCH    /api/media/assets/[assetId]\n", "PATCH    /api/media/assets/[assetId]\nDELETE   /api/media/assets/[assetId]\n", "DELETE API line");
  text = replaceOnce(
    text,
    "`GET /api/media/assets` accepts bounded `kind`, `q`, `sort`, `favorite`, `collection`, `limit`, `offset`; `favorite` accepts only `true`, `collection` requires a UUID when present, and `sort` accepts only `newest|oldest` with newest as default. `PATCH /api/media/assets/[assetId]` remains the UI-025 Rename mutation; UI-031 uses idempotent owner-scoped favorite PUT/DELETE; UI-032 uses owner-scoped collection list/create plus idempotent membership PUT/DELETE. Picker and drag/drop persistent uploads both use the same existing media-upload ticket/completion APIs. Browser components do not call workers, Supabase service-role APIs or raw R2 credentials directly.",
    "`GET /api/media/assets` accepts bounded `kind`, `q`, `sort`, `favorite`, `collection`, `limit`, `offset`; `favorite` accepts only `true`, `collection` requires a UUID when present, and `sort` accepts only `newest|oldest` with newest as default. `PATCH /api/media/assets/[assetId]` remains the UI-025 Rename mutation; UI-031 uses idempotent owner-scoped favorite PUT/DELETE; UI-032 uses owner-scoped collection list/create plus idempotent membership PUT/DELETE. UI-033 adds owner-scoped idempotent `DELETE /api/media/assets/[assetId]`: tombstone first, then R2 primary/thumbnail purge, with `purged_at` recorded only after physical cleanup succeeds. Picker and drag/drop persistent uploads both use the same existing media-upload ticket/completion APIs. Browser components do not call workers, Supabase service-role APIs or raw R2 credentials directly.",
    "API contract paragraph",
  );
  text = replaceOnce(
    text,
    "- `server/media` — owner-scoped durable media/query/upload/download/rename/reference plus Collections services;",
    "- `server/media` — owner-scoped durable media/query/upload/download/rename/delete/reference plus Collections services;",
    "server media ownership",
  );
  text = replaceOnce(
    text,
    "Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, Library transient drag/drop interaction, the small Library sort/collection navigation menus, Viewer Favorite/Collections/Rename interaction state, Settings account form actions and interactions that truly require browser state.",
    "Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, Library transient drag/drop interaction, the small Library sort/collection navigation menus, Viewer Favorite/Collections/Rename interaction state plus UI-033 Delete confirmation/busy/error state, Settings account form actions and interactions that truly require browser state.",
    "client boundaries",
  );
  const flow = `## Durable Media Delete Flow — UI-033 / PR #25 (final validation)\n\n\`\`\`text\nverified owner + opaque media asset ID\n  -> DELETE /api/media/assets/[assetId]\n  -> owner-scoped media lookup including tombstones\n  -> first call sets deleted_at (database trigger clears favorite + collection/upload links)\n  -> active product reads stop returning the asset\n  -> server deletes primary + optional thumbnail R2 objects\n  -> purged_at set only after storage cleanup succeeds\n  -> Viewer returns to Library\n\`\`\`\n\nRules:\n- delete is permanent to the user in v0.1; no restore/trash/retention UI is implied;\n- \`deleted_at\` cannot be cleared and \`purged_at\` cannot precede deletion;\n- generation jobs preserve historical input/output media IDs rather than rewriting execution history;\n- collection membership cannot be created for a tombstoned asset;\n- a tombstoned media asset is rejected as a new native or external generation input before backend submission;\n- an already-issued short-lived signed R2 URL may remain valid until its original expiry, but no new product signed-media URL is issued after tombstoning;\n- successful tombstone + failed R2 cleanup is represented as cleanup pending and is retryable through the idempotent DELETE route;\n- batch/card selection, multi-delete atomicity and recovery UX are separate future contracts.\n\nDecision-finalized head \`1d087e5791bd713e4b0f1d540bff18bea5fae386\` passed all 15 affected gates, including Media Delete \`33216665876\`, Account Ownership \`33216665938\`, Generation \`33216665787\` and Video Generation \`33216665774\`. Desktop/mobile confirmation artifacts were visually reviewed clean. Final documentation-head rerun/merge remains required before UI-033 is APPROVED.\n\n`;
  text = insertBefore(text, "## Account Identity Flow", flow, "Delete architecture flow");
  write("docs/architecture/FRONTEND_ARCHITECTURE.md", text);
}

// INFRASTRUCTURE.md
{
  let text = read("docs/architecture/INFRASTRUCTURE.md");
  text = replaceOnce(
    text,
    "- `0008_media_collection_asset_fk_index.sql` — applied as `20260828202601 renderlab_media_collection_asset_fk_index`; adds leading `media_asset_id` coverage for the membership foreign-key lookup/cascade path identified by the Supabase performance advisor. It changes no product behavior or R2 contract.\n",
    "- `0008_media_collection_asset_fk_index.sql` — applied as `20260828202601 renderlab_media_collection_asset_fk_index`; adds leading `media_asset_id` coverage for the membership foreign-key lookup/cascade path identified by the Supabase performance advisor. It changes no product behavior or R2 contract.\n- `0009_media_asset_deletion.sql` — applied as `20260828221611 renderlab_media_asset_deletion`; adds nullable `media_assets.deleted_at` / `purged_at`, tombstone-state guards, first-delete cleanup of Favorite/collection/upload-session links, protection against adding deleted media to collections, and partial `media_assets_owner_active_created_at_idx` for ordinary active browsing. It does not hard-delete generation history.\n",
    "0009 migration entry",
  );
  text = replaceOnce(
    text,
    "Do not reapply migrations 0003, 0004, 0005, 0006, 0007 or 0008.",
    "Do not reapply migrations 0003, 0004, 0005, 0006, 0007, 0008 or 0009.",
    "migration reapply rule",
  );
  text = replaceOnce(
    text,
    "- UI-030 satisfies the ownership-isolation prerequisite for personal organization; UI-031 Favorites and UI-032 Collections are approved separate organization slices. Delete/batch remains blocked on explicit destructive cleanup/recovery semantics.",
    "- UI-030 satisfies the ownership-isolation prerequisite for personal organization; UI-031 Favorites and UI-032 Collections are approved separate organization slices. UI-033 now owns the explicit single-asset tombstone/R2/history semantics in final validation; batch media management remains separate.",
    "identity delete boundary",
  );
  text = replaceOnce(
    text,
    "migration history includes `20260828174940 renderlab_core_account_ownership_enforce`; later organization migrations `20260828183102 renderlab_media_favorites`, `20260828201740 renderlab_media_collections` and `20260828202601 renderlab_media_collection_asset_fk_index` are also applied;",
    "migration history includes `20260828174940 renderlab_core_account_ownership_enforce`; later migrations `20260828183102 renderlab_media_favorites`, `20260828201740 renderlab_media_collections`, `20260828202601 renderlab_media_collection_asset_fk_index` and `20260828221611 renderlab_media_asset_deletion` are also applied;",
    "ownership migration history",
  );
  const deletionBoundary = `### Durable media deletion boundary — UI-033 / PR #25 (final validation)\nUI-033 resolves the previously deferred destructive storage/reference/history contract for one durable asset without introducing batch selection or a user Trash model.\n\nDatabase boundary:\n- \`0009_media_asset_deletion.sql\` is applied as \`20260828221611 renderlab_media_asset_deletion\`;\n- \`media_assets.deleted_at\` is the immutable product tombstone and \`purged_at\` is only valid at/after deletion;\n- first tombstone clears Favorite state and deletes same-asset collection memberships plus completed upload-session staging links;\n- database guards prevent tombstone reversal and prevent collection membership from targeting deleted media;\n- generation-job JSON input/output IDs are deliberately preserved as historical opaque references; the media row itself remains as the durable tombstone;\n- ordinary owner-scoped active browsing is supported by partial \`media_assets_owner_active_created_at_idx\`; raw browser grants remain zero and RLS remains enabled.\n\nStorage/runtime boundary:\n- owner-scoped \`DELETE /api/media/assets/[assetId]\` tombstones before storage mutation;\n- the server deletes the primary R2 object plus optional thumbnail and records \`purged_at\` only after successful physical cleanup;\n- a tombstone with incomplete physical cleanup remains explicitly retryable/idempotent rather than being reported as fully purged;\n- previously issued short-lived signed URLs cannot be revoked, but active product routes issue no new signed media after tombstoning;\n- new generation submission preflights durable inputs so tombstoned media cannot be sent to native or external generation backends; already-running jobs are not cancelled implicitly.\n\nVerification state before final documentation-head rerun: decision-finalized head \`1d087e5791bd713e4b0f1d540bff18bea5fae386\` passed all 15 affected PR gates, including Media Delete \`33216665876\`, Account Ownership \`33216665938\`, Generation \`33216665787\`, Video Generation \`33216665774\`, Favorites \`33216665770\` and Collections \`33216665804\`. Configured Delete verification covered two-account denial, database cleanup, R2 primary/thumbnail purge, preserved generation history, idempotent retry, rejected post-delete generation reuse, responsive confirmation UI and exact cleanup.\n\nShared-resource audit after that suite returned all six RenderLab tables and configured fixture users to zero, with six RLS-enabled tables, six non-null owners, zero browser grants, nullable deletion timestamps, deletion guards and the active-media index intact. Post-\`0009\` security advisors report only expected \`rls_enabled_no_policy\` INFO for deliberately server-owned tables; performance advisors report unused-index INFO only, including the new active index on the currently empty/low-traffic dataset. No advisor requires a UI-033 schema change.\n\nBatch/card selection, multi-delete atomicity, retention/recovery and collection deletion remain separate future contracts.\n\n`;
  text = insertBefore(text, "### GitHub Actions / repository visibility", deletionBoundary, "Delete infrastructure boundary");
  write("docs/architecture/INFRASTRUCTURE.md", text);
}

console.log("UI-033 pre-merge documentation synchronized.");
