import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Target checkout path is required.");
function target(rel) { return path.join(root, rel); }
function read(rel) { return fs.readFileSync(target(rel), "utf8"); }
function write(rel, value) { fs.writeFileSync(target(rel), value, "utf8"); }
function replaceOnce(text, from, to, label) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`Expected one ${label}; found ${count}.`);
  return text.replace(from, to);
}

const finalHead = "53b0eb4c648b47a17fee2e735b7dddc85d345518";
const mergeSha = "40945ff8c4c7e3a3db0e115c4d7cae9f50db4445";
const finalRuns = "Media Delete `33218433320`, Account Ownership `33218433329`, UI Shell `33218433381`, Create Lifecycle `33218433291`, Library Search `33218433357`, Library History `33218433299`, Library Lifecycle `33218433285`, Library Drag Drop `33218433305`, Persistent Media Upload `33218433348`, Media Download `33218433296`, Media Rename `33218433406`, Library Favorites `33218433314`, Library Collections `33218433301`, Generation Integration `33218433335`, and Video Generation `33218433309`";
const mainRuns = "UI Shell `33218646377`, Reference Upload `33218646539`, Generation Integration `33218646527`, and Video Generation `33218646602`";

// PROJECT.md
{
  let text = read("PROJECT.md");
  const activeOld = `### Active product slice\n- Durable Media Delete v0.1 / UI-033 is **IN FINAL VALIDATION** on PR #25.\n- UI-033 is intentionally single-asset and Viewer-contextual: tombstone first, retryable R2 purge second, generation history preserved, and no restore/trash or batch/card-selection framework in v0.1.\n- Additive migration \`0009_media_asset_deletion.sql\` is applied as \`20260828221611 renderlab_media_asset_deletion\`.\n- Decision-finalized head \`1d087e5791bd713e4b0f1d540bff18bea5fae386\` passed the complete 15-gate affected suite (Media Delete \`33216665876\`, Account Ownership \`33216665938\`, UI Shell \`33216665773\`, Create Lifecycle \`33216665796\`, Library Search \`33216665758\`, Library History \`33216665833\`, Library Lifecycle \`33216665791\`, Library Drag Drop \`33216665793\`, Persistent Media Upload \`33216665806\`, Media Download \`33216665819\`, Media Rename \`33216665790\`, Library Favorites \`33216665770\`, Library Collections \`33216665804\`, Generation Integration \`33216665787\`, and Video Generation \`33216665774\`). Desktop/mobile destructive confirmation artifacts were visually reviewed without hierarchy drift.\n- Shared Supabase cleanup is back to zero across all six RenderLab tables and configured fixture users; six RLS tables, six non-null owners, zero browser grants, deletion guards and the active-media index remain intact. Security advisors report only the expected no-policy INFO notices on deliberately server-owned tables; performance advisors report only unused-index INFO notices.\n- Remaining gate before merge: synchronize the full repository handoff on the PR head, rerun the same 15-gate matrix on that exact documentation-finalized head, then merge and verify merged-\`main\` cleanup/no-deployment state.\n`;
  const activeNew = `### Active product slice\n- None. UI-033 is complete; no next Phase 4 product slice has been selected.\n- Batch media management is the next documented management candidate, but it requires its own selection/multi-delete/atomicity/recovery contract rather than being inferred from single-asset Delete.\n`;
  text = replaceOnce(text, activeOld, activeNew, "PROJECT active UI-033 block");
  const latestAnchor = "### Latest completed product slice\n- Library Collections v0.1 / UI-032 is **APPROVED**.";
  const latestReplacement = `### Latest completed product slice\n- Durable Media Delete v0.1 / UI-033 is **APPROVED**. PR #25 merged as \`${mergeSha}\` after final exact head \`${finalHead}\` passed all 15 applicable gates: ${finalRuns}.\n- \`0009_media_asset_deletion.sql\` is applied as \`20260828221611 renderlab_media_asset_deletion\`. Delete is tombstone-first and permanent to the user in v0.1; generation history retains opaque media IDs while R2 primary/thumbnail cleanup is retryable and auditable through \`purged_at\`.\n- Desktop/mobile destructive confirmation artifacts were visually reviewed clean: Continue remains dominant, Favorite/Collections/Rename/Download stay intact, and Delete remains visually secondary.\n- Merged \`main\` checks ${mainRuns} passed. Final post-merge Supabase cleanup returned all six RenderLab tables and configured fixture users to zero while retaining six RLS tables, six non-null owners, zero browser grants, deletion guards, nullable \`deleted_at\`/\`purged_at\`, the active-media index and \`0009\` as latest migration.\n- Vercel listed zero RenderLab deployments created after the PR #25 merge; automatic Git deployment remains disabled and UI-033 was not deployed separately.\n- UI-033 remains intentionally narrow: one Viewer-contextual permanent Delete. Batch/card selection, multi-delete atomicity, user Trash/restore/retention and collection deletion remain separate future contracts.\n\n### Previous completed product slice — Library Collections\n- Library Collections v0.1 / UI-032 is **APPROVED**.`;
  text = replaceOnce(text, latestAnchor, latestReplacement, "PROJECT latest completed slice");
  write("PROJECT.md", text);
}

// UI_MIGRATION.md
{
  let text = read("docs/ui/UI_MIGRATION.md");
  text = replaceOnce(text, "- [ ] Pass the complete 15-gate suite on the documentation-finalized exact PR head.", `- [x] Final exact head \`${finalHead}\` passed the complete 15-gate suite: ${finalRuns}.`, "final exact-head checkbox");
  text = replaceOnce(text, "- [ ] Merge PR #25 and verify merged-`main` push checks.", `- [x] Merge PR #25 as \`${mergeSha}\`; merged-\`main\` checks ${mainRuns} passed.`, "merge checkbox");
  text = replaceOnce(text, "- [ ] Verify post-merge Supabase/R2 cleanup and zero unintended Vercel deployment.", "- [x] Verify post-merge shared-resource cleanup: all six RenderLab tables and configured fixture users returned to zero; RLS/owner/grant/deletion invariants remain intact; Vercel created zero deployments from the merge.", "post-merge checkbox");
  text = replaceOnce(
    text,
    "**Durable Media Delete v0.1 status: `IN FINAL VALIDATION`. Batch media management remains out of scope until single-delete is approved and a separate batch interaction/atomicity contract is selected.**",
    `**Durable Media Delete v0.1 status: \`APPROVED\`. PR #25 merged as \`${mergeSha}\` after final exact head \`${finalHead}\` passed all 15 affected gates. Batch media management remains a separate future contract.**`,
    "UI-033 status",
  );
  text = replaceOnce(text, "**Current product slice:** Durable Media Delete v0.1 / UI-033 is IN FINAL VALIDATION on PR #25.", "**Current product slice:** None. UI-033 is complete; no next Phase 4 product slice has been selected.", "current product slice");
  text = replaceOnce(
    text,
    "**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, and Library Collections PR #24 / UI-032 are merged and approved.",
    "**Completed product slices:** Persistent Upload PR #9, Library Search PR #10, Download PR #11, Rename PR #12, History Ordering PR #14, Drag/drop Upload PR #15, Core Account Ownership PR #17 / UI-030, Library Favorites PR #23 / UI-031, Library Collections PR #24 / UI-032, and Durable Media Delete PR #25 / UI-033 are merged and approved.",
    "completed product slices",
  );
  text = replaceOnce(
    text,
    "**Current gate:** documentation-finalize UI-033, rerun all 15 affected workflows on that exact head, then merge only after a clean shared-resource audit.",
    "**Current gate:** No active Phase 4 implementation gate. Select the next slice explicitly before implementation.",
    "current gate",
  );
  text = replaceOnce(
    text,
    "**Next product slice:** after UI-033 is fully approved, batch media management may be considered as a separate contract; do not infer selection, multi-delete atomicity, recovery UX or card actions from the single-asset Viewer Delete implementation.",
    "**Next product slice:** Batch media management is the next documented candidate, but it is not yet selected. Define selection, multi-delete atomicity, partial-failure/retry and recovery UX explicitly before implementation; do not infer them from UI-033.",
    "next product slice",
  );
  write("docs/ui/UI_MIGRATION.md", text);
}

// SCREEN_REGISTRY.md
{
  let text = read("docs/ui/SCREEN_REGISTRY.md");
  text = replaceOnce(text, "**Status:** APPROVED — Library base + Favorites v0.1 / UI-031 + Collections v0.1 / UI-032; UI-033 tombstone filtering IN FINAL VALIDATION", "**Status:** APPROVED — Library base + Favorites v0.1 / UI-031 + Collections v0.1 / UI-032 + UI-033 tombstone filtering", "Library UI-033 status");
  text = replaceOnce(
    text,
    "**Current extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031 and Collections v0.1 / UI-032 are approved organization contracts. UI-033 now has an explicit tombstone/R2/history contract and is in final validation for single-asset Viewer Delete; batch management remains a separate future contract.",
    "**Approved extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031, Collections v0.1 / UI-032 and single-asset Durable Media Delete v0.1 / UI-033 are approved. Batch management remains a separate future contract.",
    "Library extension approval",
  );
  text = replaceOnce(text, "**Status:** APPROVED — Media Viewer base + Download + Rename + Favorites + Collections v0.1 / UI-032; Delete v0.1 / UI-033 IN FINAL VALIDATION", "**Status:** APPROVED — Media Viewer base + Download + Rename + Favorites + Collections v0.1 / UI-032 + Delete v0.1 / UI-033", "Viewer UI-033 status");
  text = replaceOnce(text, "- UI-033 candidate adds one visually secondary permanent `Delete` action beneath existing durable actions.", "- UI-033 adds one visually secondary permanent `Delete` action beneath existing durable actions.", "Viewer Delete behavior label");
  const oldEvidence = "**Delete validation evidence:** decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed Media Delete `33216665876` plus the complete 14 existing affected regressions. Configured verification proved signed-out/foreign denial, database tombstone cleanup, R2 primary/thumbnail purge, generation-history preservation, idempotent retry and rejected post-delete generation reuse. Desktop/mobile confirmation screenshots were visually reviewed clean. Final documentation-head rerun and merge remain pending.";
  const newEvidence = `**Delete approval evidence:** final exact head \`${finalHead}\` passed ${finalRuns}. Configured verification proved signed-out/foreign denial, database tombstone cleanup, R2 primary/thumbnail purge, generation-history preservation, idempotent retry and rejected post-delete generation reuse. Desktop/mobile confirmation screenshots were visually reviewed clean. PR #25 merged as \`${mergeSha}\`; merged-\`main\` ${mainRuns} passed and post-merge shared-resource cleanup returned to zero.`;
  text = replaceOnce(text, oldEvidence, newEvidence, "Viewer Delete evidence");
  write("docs/ui/SCREEN_REGISTRY.md", text);
}

// COMPONENT_CATALOG.md
{
  let text = read("docs/ui/COMPONENT_CATALOG.md");
  text = replaceOnce(text, "**Current primitives:** Alert, AlertDialog (UI-033 candidate), Button, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle, ToggleGroup.", "**Current primitives:** Alert, AlertDialog, Button, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle, ToggleGroup.", "primitive label");
  text = replaceOnce(text, "### AlertDialog\n**Status:** EXPERIMENTAL", "### AlertDialog\n**Status:** APPROVED", "AlertDialog status");
  text = replaceOnce(text, "**Used by:** UI-033 Media Viewer Delete candidate only while PR #25 is in final validation.", "**Used by:** UI-033 Media Viewer Delete.", "AlertDialog usage");
  text = replaceOnce(
    text,
    "**Notes:** UI-033 decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed UI purity/build, Media Delete `33216665876` and responsive desktop/mobile confirmation review. Promote to APPROVED only after PR #25 final exact-head validation/merge.",
    `**Notes:** UI-033 final exact head \`${finalHead}\` passed Media Delete \`33218433320\`, UI Shell \`33218433381\` and the complete affected suite; PR #25 merged as \`${mergeSha}\`. Desktop/mobile confirmation review verified focus-safe destructive confirmation without hierarchy drift.`,
    "AlertDialog approval notes",
  );
  text = replaceOnce(text, "UI-033 single-asset Delete candidate in final validation.", "approved UI-033 single-asset Delete.", "MediaViewer variant approval");
  text = replaceOnce(text, "plus the UI-033 single-asset Delete candidate", "plus approved UI-033 single-asset Delete", "MediaViewerActions purpose approval");
  text = replaceOnce(text, "from the UI-033 single-asset Delete candidate.", "from the UI-033 single-asset Delete action.", "MediaViewerActions do-not approval");
  text = replaceOnce(
    text,
    "Decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed the 15 affected gates and desktop/mobile confirmation review; final documentation-head validation/merge is still required before this extension is approved.",
    `Final exact head \`${finalHead}\` passed all 15 affected gates and desktop/mobile confirmation review; PR #25 merged as \`${mergeSha}\` and merged-\`main\` checks remained green.`,
    "MediaViewerActions notes approval",
  );
  write("docs/ui/COMPONENT_CATALOG.md", text);
}

// FRONTEND_ARCHITECTURE.md
{
  let text = read("docs/architecture/FRONTEND_ARCHITECTURE.md");
  text = replaceOnce(
    text,
    "Durable Media Delete v0.1 / UI-033 is in final validation on PR #25; additive `0009_media_asset_deletion.sql` is applied as `20260828221611 renderlab_media_asset_deletion`, and decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed all 15 affected gates.",
    `Durable Media Delete v0.1 / UI-033 is approved and merged through PR #25 as \`${mergeSha}\`; additive \`0009_media_asset_deletion.sql\` is applied as \`20260828221611 renderlab_media_asset_deletion\`, and final exact head \`${finalHead}\` passed all 15 affected gates.`,
    "frontend top UI-033 state",
  );
  text = replaceOnce(text, "- AlertDialog / Action / Cancel / Content / Description / Title / Trigger (UI-033 candidate)", "- AlertDialog / Action / Cancel / Content / Description / Title / Trigger", "frontend primitive label");
  text = replaceOnce(text, "## Durable Media Delete Flow — UI-033 / PR #25 (final validation)", "## Durable Media Delete Flow — UI-033 / PR #25 (approved)", "delete flow heading");
  text = replaceOnce(
    text,
    "Decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed all 15 affected gates, including Media Delete `33216665876`, Account Ownership `33216665938`, Generation `33216665787` and Video Generation `33216665774`. Desktop/mobile confirmation artifacts were visually reviewed clean. Final documentation-head rerun/merge remains required before UI-033 is APPROVED.",
    `Final exact head \`${finalHead}\` passed all 15 affected gates, including Media Delete \`33218433320\`, Account Ownership \`33218433329\`, Generation \`33218433335\` and Video Generation \`33218433309\`. Desktop/mobile confirmation artifacts were visually reviewed clean. PR #25 merged as \`${mergeSha}\`; merged-\`main\` ${mainRuns} passed and post-merge cleanup returned to zero.`,
    "delete flow evidence",
  );
  text = replaceOnce(
    text,
    "Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one. UI-030 ownership enforcement is complete; approved UI-031 keeps Favorites on the durable asset, while active UI-032 adds Collections as a separate owner-scoped relation rather than a global client organization store.",
    "Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one. UI-030 ownership enforcement is complete; approved UI-031 keeps Favorites on the durable asset, approved UI-032 keeps Collections as a separate owner-scoped relation, and approved UI-033 keeps deletion state server-owned through durable tombstones rather than a global client media-management store.",
    "frontend state architecture freshness",
  );
  write("docs/architecture/FRONTEND_ARCHITECTURE.md", text);
}

// INFRASTRUCTURE.md
{
  let text = read("docs/architecture/INFRASTRUCTURE.md");
  text = replaceOnce(text, "UI-033 now owns the explicit single-asset tombstone/R2/history semantics in final validation; batch media management remains separate.", "UI-033 owns the approved single-asset tombstone/R2/history semantics; batch media management remains separate.", "infrastructure identity UI-033 state");
  text = replaceOnce(text, "### Durable media deletion boundary — UI-033 / PR #25 (final validation)", "### Durable media deletion boundary — UI-033 / PR #25 (approved)", "infrastructure delete heading");
  const oldVerification = "Verification state before final documentation-head rerun: decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed all 15 affected PR gates, including Media Delete `33216665876`, Account Ownership `33216665938`, Generation `33216665787`, Video Generation `33216665774`, Favorites `33216665770` and Collections `33216665804`. Configured Delete verification covered two-account denial, database cleanup, R2 primary/thumbnail purge, preserved generation history, idempotent retry, rejected post-delete generation reuse, responsive confirmation UI and exact cleanup.";
  const newVerification = `Final verification: exact head \`${finalHead}\` passed all 15 affected PR gates, including Media Delete \`33218433320\`, Account Ownership \`33218433329\`, Generation \`33218433335\`, Video Generation \`33218433309\`, Favorites \`33218433314\` and Collections \`33218433301\`. Configured Delete verification covered two-account denial, database cleanup, R2 primary/thumbnail purge, preserved generation history, idempotent retry, rejected post-delete generation reuse, responsive confirmation UI and exact cleanup. PR #25 merged as \`${mergeSha}\`; merged-\`main\` ${mainRuns} passed.`;
  text = replaceOnce(text, oldVerification, newVerification, "infrastructure final verification");
  text = replaceOnce(
    text,
    "Shared-resource audit after that suite returned all six RenderLab tables and configured fixture users to zero, with six RLS-enabled tables, six non-null owners, zero browser grants, nullable deletion timestamps, deletion guards and the active-media index intact.",
    "Final pre-merge and post-merge shared-resource audits returned all six RenderLab tables and configured fixture users to zero, with six RLS-enabled tables, six non-null owners, zero browser grants, nullable deletion timestamps, deletion guards and the active-media index intact. Vercel listed zero RenderLab deployments created after the PR #25 merge, preserving the disabled automatic-Git-deployment boundary.",
    "infrastructure final audit",
  );
  write("docs/architecture/INFRASTRUCTURE.md", text);
}

console.log("UI-033 completion handoff synchronized.");
