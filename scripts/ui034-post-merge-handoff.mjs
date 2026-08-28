import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || ".");

function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  if (first < 0) throw new Error(`Could not find ${label}`);
  if (text.indexOf(before, first + before.length) >= 0) throw new Error(`Found duplicate ${label}`);
  return `${text.slice(0, first)}${after}${text.slice(first + before.length)}`;
}

async function edit(relativePath, transform) {
  const filePath = path.join(root, relativePath);
  const before = await readFile(filePath, "utf8");
  const after = transform(before);
  if (after === before) throw new Error(`${relativePath} did not change`);
  await writeFile(filePath, after, "utf8");
}

const finalHead = "1e634fe9a582b8a7676cb70cfc7bcd5754f613ce";
const mergeSha = "8b0b0339f216f3ce704d965ef005b2cd020f3ae8";
const finalRuns = "Library Batch Delete `33220710307`, Account Ownership `33220710301`, UI Shell `33220710365`, Create Lifecycle `33220710378`, Library Search `33220710297`, Library History `33220710393`, Library Lifecycle `33220710305`, Library Drag Drop `33220710389`, Persistent Media Upload `33220710300`, Media Download `33220710329`, Media Rename `33220710371`, Library Favorites `33220710303`, Library Collections `33220710404`, Media Delete `33220710375`, Generation Integration `33220710351`, and Video Generation `33220710347`";
const mergedRuns = "UI Shell `33221101101`, Generation Integration `33221101106`, and Video Generation `33221101117`";

await edit("PROJECT.md", (text) => {
  text = replaceOnce(
    text,
    `### Active product slice\n- Library Batch Delete v0.1 / UI-034 is **IN FINAL VALIDATION** on PR #29.\n- UI-034 adds explicit page-scoped Library selection and best-effort permanent deletion for at most one server-rendered page (24 assets). Each item reuses the approved UI-033 tombstone/R2 contract; successful items are never rolled back because another selected item fails, and failed items remain eligible for retry.\n- No schema migration is added. Cross-page selection, Trash/restore, batch Favorites/Collections and a global media client store remain out of scope.\n- Implementation head \`78015dcfb5881639b32f22f8877874af2c3a336b\` passed all 16 affected gates: Library Batch Delete \`33220127853\`, Account Ownership \`33220127858\`, UI Shell \`33220127872\`, Create Lifecycle \`33220127874\`, Library Search \`33220127883\`, Library History \`33220127859\`, Library Lifecycle \`33220127864\`, Library Drag Drop \`33220127921\`, Persistent Media Upload \`33220127879\`, Media Download \`33220127852\`, Media Rename \`33220127885\`, Library Favorites \`33220127888\`, Library Collections \`33220127868\`, Media Delete \`33220127873\`, Generation Integration \`33220127851\`, and Video Generation \`33220127855\`. Desktop selected/confirmation and mobile confirmation artifacts were visually reviewed without Library hierarchy drift.\n- Shared-resource verification is clean: all six RenderLab tables and configured fixture users are back to zero; six RLS tables, six non-null owner columns, zero browser grants, nullable \`deleted_at\`/\`purged_at\`, all three deletion-integrity triggers and \`media_assets_owner_active_created_at_idx\` remain intact; \`20260828221611 renderlab_media_asset_deletion\` remains the latest migration.\n- Remaining gate before merge: rerun the same 16-gate matrix on the exact documentation-finalized PR head, repeat the shared-resource audit, then merge and verify merged-\`main\` checks/cleanup/no-deployment state.`,
    `### Active product slice\n- None. UI-034 is complete; no next Phase 4 product slice has been selected.`,
    "PROJECT active UI-034 block",
  );

  text = replaceOnce(
    text,
    `### Latest completed product slice\n- Durable Media Delete v0.1 / UI-033 is **APPROVED**.`,
    `### Latest completed product slice\n- Library Batch Delete v0.1 / UI-034 is **APPROVED**. PR #29 merged as \`${mergeSha}\` after final exact head \`${finalHead}\` passed all 16 affected gates: ${finalRuns}.\n- UI-034 keeps selection transient and current-page scoped (maximum 24 assets), composes the existing UI-033 tombstone/R2 deletion per item, and reports truthful partial success without rolling back completed deletions.\n- Desktop selection/confirmation and mobile confirmation artifacts were visually reviewed clean. Final pre-merge and post-merge shared-resource audits both returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants, deletion guards/index intact, and \`0009\` still latest.\n- Merged \`main\` checks ${mergedRuns} passed.\n- Vercel listed zero RenderLab deployments created after the PR #29 merge; automatic Git deployment remains disabled and UI-034 was not deployed separately.\n- No new schema migration was added. Cross-page selection, Trash/restore, batch Favorites/Collections and broader bulk-management remain separate future contracts.\n\n### Previous completed product slice — Durable Media Delete\n- Durable Media Delete v0.1 / UI-033 is **APPROVED**.`,
    "PROJECT latest completed heading",
  );
  return text;
});

await edit("docs/ui/UI_MIGRATION.md", (text) => {
  text = replaceOnce(
    text,
    `- [ ] Pass the complete 16-gate suite on the documentation-finalized exact PR head.\n- [ ] Merge PR #29 and verify merged-\`main\` push checks.\n- [ ] Verify post-merge shared-resource cleanup and zero unintended Vercel deployment.\n\n**Library Batch Delete v0.1 status: \`IN FINAL VALIDATION\`. Cross-page selection, Trash/restore, batch Favorites/Collections and other bulk-management actions remain separate future contracts.**`,
    `- [x] Final exact head \`${finalHead}\` passed all 16 affected gates: ${finalRuns}.\n- [x] Merge PR #29 as \`${mergeSha}\`; merged-\`main\` checks ${mergedRuns} passed.\n- [x] Verify post-merge shared-resource cleanup: all six RenderLab tables and configured fixture users returned to zero; six RLS tables, six non-null owners, zero browser grants, nullable deletion timestamps, all three deletion-integrity triggers and \`media_assets_owner_active_created_at_idx\` remain intact; \`20260828221611 renderlab_media_asset_deletion\` is still latest. Vercel created zero deployments after the merge.\n\n**Library Batch Delete v0.1 status: \`APPROVED\`. PR #29 merged as \`${mergeSha}\` after final exact head \`${finalHead}\` passed all 16 affected gates. Cross-page selection, Trash/restore, batch Favorites/Collections and other bulk-management actions remain separate future contracts.**`,
    "UI_MIGRATION final UI-034 checklist",
  );

  text = replaceOnce(
    text,
    `**Current product slice:** Library Batch Delete v0.1 / UI-034 is IN FINAL VALIDATION on PR #29.\n**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, and Durable Media Delete PR #25 / UI-033 are merged and approved.\n**Completed foundation prerequisites:** PR #13 / UI-026 maintained primitive purity refactor merged as \`5953934d5f67c16304be7493eda27c88e24c02cc\`; Account Identity PR #16 / UI-029 merged as \`bcb20365db102252db51263968de96fc795be518\`.  \n**Current gate:** rerun all 16 affected workflows on the exact documentation-finalized UI-034 head, then merge only after a clean shared-resource audit.`,
    `**Current product slice:** None. UI-034 is complete; no next Phase 4 product slice has been selected.\n**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, Durable Media Delete PR #25 / UI-033, and Library Batch Delete PR #29 / UI-034 are merged and approved.\n**Completed foundation prerequisites:** PR #13 / UI-026 maintained primitive purity refactor merged as \`5953934d5f67c16304be7493eda27c88e24c02cc\`; Account Identity PR #16 / UI-029 merged as \`bcb20365db102252db51263968de96fc795be518\`.  \n**Current gate:** No active Phase 4 implementation gate. Select the next slice explicitly before implementation.`,
    "UI_MIGRATION current work",
  );
  return text;
});

await edit("docs/ui/UI_SYSTEM.md", (text) => replaceOnce(
  text,
  "- `Checkbox` (UI-034 candidate in final validation)",
  "- `Checkbox`",
  "UI_SYSTEM Checkbox status",
));

await edit("docs/ui/COMPONENT_CATALOG.md", (text) => {
  text = replaceOnce(text, "Checkbox (UI-034 candidate)", "Checkbox", "catalog primitive list");
  text = replaceOnce(text, "**Used by:** UI-033 Media Viewer Delete.", "**Used by:** UI-033 Media Viewer Delete and UI-034 Library Batch Delete confirmation.", "AlertDialog usage");
  text = replaceOnce(text, "### Checkbox\n**Status:** EXPERIMENTAL", "### Checkbox\n**Status:** APPROVED", "Checkbox status");
  text = replaceOnce(text, "**Used by:** `LibraryBatchSelection` only while PR #29 is in final validation.", "**Used by:** `LibraryBatchSelection`.", "Checkbox usage");
  text = replaceOnce(
    text,
    "**Notes:** UI-034 implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed UI Shell `33220127872`, Library Batch Delete `33220127853` and the complete affected implementation matrix. Promote the UI-034 usage to approved only after exact documentation-head validation and merge.",
    `**Notes:** UI-034 final exact head \`${finalHead}\` passed UI Shell \`33220710365\`, Library Batch Delete \`33220710307\` and the complete 16-gate affected suite; PR #29 merged as \`${mergeSha}\`. Responsive selection/confirmation review was clean.`,
    "Checkbox notes",
  );
  text = replaceOnce(text, "extended by approved Upload/search/history/drag-drop/Favorites/Collections behavior and the UI-034 batch-selection candidate.", "extended by approved Upload/search/history/drag-drop/Favorites/Collections behavior and approved UI-034 batch selection.", "LibraryView origin");
  text = replaceOnce(text, "### LibraryBatchSelection\n**Status:** EXPERIMENTAL", "### LibraryBatchSelection\n**Status:** APPROVED", "LibraryBatchSelection status");
  text = replaceOnce(
    text,
    "**Notes:** UI-034 implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed Library Batch Delete `33220127853` plus the complete 15 existing affected regressions; desktop/mobile selection and confirmation artifacts were reviewed clean. Final documentation-head validation/merge remains required.",
    `**Notes:** UI-034 final exact head \`${finalHead}\` passed Library Batch Delete \`33220710307\` plus all 15 existing affected regressions; desktop/mobile selection and confirmation artifacts were reviewed clean. PR #29 merged as \`${mergeSha}\`; merged-\`main\` ${mergedRuns} passed and post-merge cleanup returned to zero.`,
    "LibraryBatchSelection notes",
  );
  return text;
});

await edit("docs/ui/SCREEN_REGISTRY.md", (text) => {
  text = replaceOnce(
    text,
    "**Status:** APPROVED base + Favorites / UI-031 + Collections / UI-032 + UI-033 tombstone filtering; Library Batch Delete / UI-034 IN FINAL VALIDATION",
    "**Status:** APPROVED — Library base + Favorites / UI-031 + Collections / UI-032 + UI-033 tombstone filtering + Library Batch Delete / UI-034",
    "Library screen status",
  );
  text = replaceOnce(text, "- UI-034 candidate adds an explicit Library `Select` mode", "- UI-034 adds an explicit Library `Select` mode", "Library behavior candidate wording");
  text = replaceOnce(
    text,
    "\n\n**Current extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031, Collections v0.1 / UI-032 and single-asset Durable Media Delete v0.1 / UI-033 are approved. Library Batch Delete v0.1 / UI-034 is IN FINAL VALIDATION on PR #29 and deliberately remains page-scoped/best-effort.",
    `\n- UI-034 final exact head \`${finalHead}\` passed all 16 affected gates: ${finalRuns}. PR #29 merged as \`${mergeSha}\`; merged-\`main\` ${mergedRuns} passed, the post-merge shared-resource audit returned to zero, and Vercel created no deployment from the merge.\n\n**Current extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031, Collections v0.1 / UI-032, single-asset Durable Media Delete v0.1 / UI-033 and Library Batch Delete v0.1 / UI-034 are approved. UI-034 deliberately remains page-scoped and best-effort per item.`,
    "Library current extension",
  );
  return text;
});

await edit("docs/architecture/FRONTEND_ARCHITECTURE.md", (text) => {
  text = replaceOnce(
    text,
    "Library Batch Delete v0.1 / UI-034 is in final validation on PR #29; it adds no schema migration and implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed all 16 affected gates.",
    `Library Batch Delete v0.1 / UI-034 is approved and merged through PR #29 as \`${mergeSha}\`; it adds no schema migration and final exact head \`${finalHead}\` passed all 16 affected gates.`,
    "frontend approved product state",
  );
  text = replaceOnce(text, "- Checkbox (UI-034 candidate)", "- Checkbox", "frontend Checkbox status");
  text = replaceOnce(text, "## Library Batch Delete Flow — UI-034 / PR #29 (final validation)", "## Library Batch Delete Flow — UI-034 / PR #29 (approved)", "batch flow heading");
  text = replaceOnce(
    text,
    "Implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed all 16 affected workflows, including Library Batch Delete `33220127853`, Media Delete `33220127873`, Account Ownership `33220127858`, Library Lifecycle `33220127864`, Generation `33220127851` and Video Generation `33220127855`. Successful desktop/mobile batch artifacts were visually reviewed clean and the shared-resource audit returned to zero. Final exact documentation-head rerun/merge remains required.",
    `Final exact head \`${finalHead}\` passed all 16 affected workflows: ${finalRuns}. Successful desktop/mobile batch artifacts were visually reviewed clean. PR #29 merged as \`${mergeSha}\`; merged-\`main\` ${mergedRuns} passed, the post-merge shared-resource audit returned all six RenderLab tables and configured fixture users to zero with the deletion/ownership boundary intact, and Vercel created zero deployments after the merge.`,
    "batch flow verification",
  );
  return text;
});

await edit("docs/architecture/INFRASTRUCTURE.md", (text) => {
  text = replaceOnce(
    text,
    "Batch/card selection, multi-delete atomicity, retention/recovery and collection deletion remain separate future contracts.",
    `UI-034 now implements page-scoped batch selection and best-effort per-item Delete by composing the UI-033 contract. Cross-page selection, global atomic multi-delete, retention/recovery, batch Favorites/Collections and collection deletion remain separate future contracts.\n\n### Library Batch Delete boundary — UI-034 / PR #29 (approved)\nUI-034 adds no schema migration or storage namespace. \`POST /api/media/assets/batch-delete\` accepts at most 24 deduplicated durable UUIDs under the verified owner and sequentially composes the existing idempotent UI-033 delete contract per item. Completed tombstones/purges are never rolled back because another selected item fails; foreign/missing IDs collapse to per-item not-found and cleanup-pending success remains truthful/retryable.\n\nFinal exact head \`${finalHead}\` passed all 16 affected gates: ${finalRuns}. PR #29 merged as \`${mergeSha}\`; merged-\`main\` ${mergedRuns} passed. The final post-merge audit found zero rows in all six RenderLab tables, zero configured fixture users, six RLS-enabled tables, six non-null owners, zero browser grants, nullable \`deleted_at\`/\`purged_at\`, all three deletion-integrity triggers and \`media_assets_owner_active_created_at_idx\` intact, with \`20260828221611 renderlab_media_asset_deletion\` still the latest migration. Vercel listed zero deployments created after the PR #29 merge, preserving the disabled automatic-Git-deployment boundary.`,
    "infrastructure batch boundary",
  );
  text = replaceOnce(
    text,
    "- `GET /api/media/assets/:assetId`\n- `PATCH /api/media/assets/:assetId` — current bounded UI-025 display-name Rename mutation",
    "- `GET /api/media/assets/:assetId`\n- `PATCH /api/media/assets/:assetId` — current bounded UI-025 display-name Rename mutation\n- `DELETE /api/media/assets/:assetId` — UI-033 owner-scoped tombstone + R2 purge\n- `POST /api/media/assets/batch-delete` — UI-034 page-bounded best-effort composition of UI-033 Delete",
    "infrastructure media APIs",
  );
  text = replaceOnce(
    text,
    "- `verify-library-lifecycle.mjs` + `library-lifecycle-visual.yml` — shared-resource lifecycle is serialized and exact durable fixture identity is used for browser targeting\n- `verify-library-search.mjs` + `library-search-visual.yml`",
    "- `verify-library-lifecycle.mjs` + `library-lifecycle-visual.yml` — shared-resource lifecycle is serialized and exact durable fixture identity is used for browser targeting\n- `verify-library-batch-delete.mjs` + `library-batch-delete-visual.yml` — page-scoped selection, per-item partial success, R2/database cleanup, ownership isolation, idempotence and responsive confirmation\n- `verify-library-search.mjs` + `library-search-visual.yml`",
    "infrastructure workflow list",
  );
  return text;
});

console.log("UI-034 post-merge repository handoff synchronized.");
