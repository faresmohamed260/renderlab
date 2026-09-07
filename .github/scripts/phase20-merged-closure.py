from pathlib import Path

MERGED_MAIN = "09ea91f753be5279428ccf25a7b043300678c3f3"
FINAL_PR_HEAD = "514193d6f62dd6e574674faa07e58ececa6b11d4"
FINAL_TREE = "c19e45c9ad5fae33f59d75cd715f5ae9352c4551"
FINAL_CREATE_RUN = "34155889018"
FINAL_CREATE_ARTIFACT = "10031015976"
FINAL_CREATE_DIGEST = "sha256:54b060f45f84b5b7eae73a642f1ee0722170579a3a418ea103cf5c10bec4ae59"
FINAL_VIDEO_RUN = "34155888979"
FINAL_VIDEO_ARTIFACT = "10031170247"
FINAL_VIDEO_DIGEST = "sha256:6c53d7d11d8f74fb23d9555a608bf38fa3d463c7d9b8ef6c893c729f8eeab6de"
MERGED_VIDEO_RUN = "34156796984"
LATEST_VERCEL_DEPLOYMENT = "dpl_Ck2HEMFpt2aRUwSVTrYA6YcFTbbi"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def append_once(path: str, marker: str, block: str) -> None:
    p = Path(path)
    text = p.read_text()
    if marker in text:
        raise SystemExit(f"{path}: marker already present")
    p.write_text(text.rstrip() + "\n\n" + block.strip() + "\n")


p = Path("PROJECT.md")
text = p.read_text()
text = replace_once(
    text,
    "**Status: `ACTIVE / PHASE 20 COMPLETE / VERIFIED`.**",
    "**Status: `ACTIVE / PHASE 20 MERGED / PHASE 21 NEXT`.**",
    "PROJECT Cycle 4 status",
)
text = replace_once(
    text,
    "# Phase 20 Execution Contract — Create as a Creative Instrument\n**Status: `COMPLETE / VERIFIED`.**",
    "# Phase 20 Execution Contract — Create as a Creative Instrument\n**Status: `COMPLETE / VERIFIED / MERGED`.**",
    "PROJECT Phase 20 status",
)
p.write_text(text)
append_once(
    "PROJECT.md",
    "## Phase 20 merged-main verification — 2026-09-07",
    f'''
## Phase 20 merged-main verification — 2026-09-07
**Status: `COMPLETE / VERIFIED / MERGED`.**

Final PR head `{FINAL_PR_HEAD}` passed all 17 attached exact-head workflows and has tree `{FINAL_TREE}`. Final Create Lifecycle `{FINAL_CREATE_RUN}` artifact `{FINAL_CREATE_ARTIFACT}` (`{FINAL_CREATE_DIGEST}`) was human-reviewed clean across the required desktop/390px and reduced-motion states. Final Video Generation Integration `{FINAL_VIDEO_RUN}` passed the 1,320-case contract and all four real recovered REDGraft Video/Animate cases, with exact cleanup and artifact `{FINAL_VIDEO_ARTIFACT}` (`{FINAL_VIDEO_DIGEST}`).

PR #122 squash-merged to `main` as `{MERGED_MAIN}` with the same tree `{FINAL_TREE}`. Every post-merge check completed successfully: 10 merged-main workflows / 11 check-runs, including Engineering Quality, UI Shell, Creative Iteration, Generation Integration, Generation Reconciliation, Generation Cancellation, Activity Cancel, Image Model Routing, Image Upscale and Video Generation Integration `{MERGED_VIDEO_RUN}`. The merged-main Video check again completed successfully through the recovered REDGraft route.

A live Vercel audit after the merge found no deployment created at or after `{MERGED_MAIN}`. The newest RenderLab deployment remains `{LATEST_VERCEL_DEPLOYMENT}`, created on 2026-09-06 22:15:21 UTC from older commit `71a9034039a64beec66894cc4f79b1f62bfc7bf7`; production therefore remains unchanged.

Phase 21 is now the next roadmap phase and may be expanded into an execution-ready contract from this verified merged baseline. Phase 21 implementation has not begun, and no production deployment is authorized by this closure.
''',
)

p = Path("docs/ui/UI_MIGRATION.md")
text = p.read_text()
text = replace_once(
    text,
    "**Status: `ACTIVE / PHASE 20 CONTRACT READY`.**",
    "**Status: `ACTIVE / PHASE 20 MERGED / PHASE 21 NEXT`.**",
    "UI_MIGRATION Cycle 4 status",
)
text = replace_once(
    text,
    "- **Phase 20 — Create as a Creative Instrument:** `COMPLETE / VERIFIED` — immersive instrument frame, morphing Image/Video context, reference choreography, precision-deck Advanced, tactile Generate/lifecycle states and spatial result arrival; exact functional and rendered evidence are verified below.",
    "- **Phase 20 — Create as a Creative Instrument:** `COMPLETE / VERIFIED / MERGED` — immersive instrument frame, morphing Image/Video context, reference choreography, precision-deck Advanced, tactile Generate/lifecycle states and spatial result arrival; final exact-head and merged-main evidence are verified below.",
    "UI_MIGRATION roadmap Phase 20",
)
text = replace_once(
    text,
    "- **Phase 21 — Library & Viewer Spatial Media Experience:** roadmap only; expand only after Phase 20 is merged and merged-main verification is complete.",
    "- **Phase 21 — Library & Viewer Spatial Media Experience:** `NEXT / READY FOR CONTRACT EXPANSION` — Phase 20 is merged and merged-main verified; implementation has not begun.",
    "UI_MIGRATION roadmap Phase 21",
)
text = replace_once(
    text,
    "**Status: `COMPLETE / VERIFIED`.** UI-063 is the controlling visual/product decision. PR #122 functional acceptance head `b7358da8f71fd789249515fca87ed01a64789f5f`.",
    f"**Status: `COMPLETE / VERIFIED / MERGED`.** UI-063 is the controlling visual/product decision. Final PR head `{FINAL_PR_HEAD}`; squash-merged to `main` as `{MERGED_MAIN}`.",
    "UI_MIGRATION Phase 20 tracker status",
)
text = replace_once(
    text,
    "- [x] Pass the final exact-head purity/quality/build plus every attached Create/model/reference/generation/integrated regression. All 17 attached workflows passed on functional head `b7358da8f71fd789249515fca87ed01a64789f5f`.",
    f"- [x] Pass the final exact-head purity/quality/build plus every attached Create/model/reference/generation/integrated regression. All 17 attached workflows passed on final PR head `{FINAL_PR_HEAD}`.",
    "UI_MIGRATION final exact-head evidence",
)
text = replace_once(
    text,
    "- [x] Human-review final desktop and 390px empty/mode/reference/Advanced/active/result/reduced-motion artifacts on functional head `b7358da8f71fd789249515fca87ed01a64789f5f`; Create Lifecycle `34149277859` artifact `10028815164` (`sha256:88637c653129ed7cdfba38a3b2fd5fc6022ac297cd41d4e09dcc8646cde01f3c`) is visually accepted with no corrective iteration required.",
    f"- [x] Human-review final desktop and 390px empty/mode/reference/Advanced/active/result/reduced-motion artifacts on final PR head `{FINAL_PR_HEAD}`; Create Lifecycle `{FINAL_CREATE_RUN}` artifact `{FINAL_CREATE_ARTIFACT}` (`{FINAL_CREATE_DIGEST}`) is visually accepted with no corrective iteration required.",
    "UI_MIGRATION final visual evidence",
)
text = replace_once(
    text,
    "- [x] No optional third-party runtime was adopted; existing Motion + CSS + RenderLab primitives were sufficient. Video Generation Integration `34149277852` completed all four real worker-backed Video/Animate cases and cleanup, with review artifact `10029509695` (`sha256:578216c480ed2cc55acf70167494712995617baba1bdcc10786d0a2d6e0d7dc6`).",
    f"- [x] No optional third-party runtime was adopted; existing Motion + CSS + RenderLab primitives were sufficient. Final-head Video Generation Integration `{FINAL_VIDEO_RUN}` completed all four real worker-backed Video/Animate cases and cleanup, with review artifact `{FINAL_VIDEO_ARTIFACT}` (`{FINAL_VIDEO_DIGEST}`).",
    "UI_MIGRATION final Video evidence",
)
text = replace_once(
    text,
    "Production deployment remains explicit and separate. Phase 20 is complete/verified at the functional and rendered-evidence boundary; PR #122 may proceed through documentation-head validation and guarded merge, but no deployment is authorized. Phase 21 remains roadmap-only until merged-main verification completes.",
    f"Production deployment remains explicit and separate. PR #122 squash-merged as `{MERGED_MAIN}`; all 10 merged-main workflows / 11 check-runs passed on that merged tree, including Video Generation Integration `{MERGED_VIDEO_RUN}`. A post-merge Vercel audit found no deployment at or after the merge. Phase 20 is complete/verified/merged, and Phase 21 is now ready for execution-contract expansion only; implementation has not begun.",
    "UI_MIGRATION merged-main note",
)
p.write_text(text)

p = Path("docs/ui/UI_DECISIONS.md")
text = p.read_text()
text = replace_once(
    text,
    "### UI-063 — Create becomes the signature Kinetic Precision creative instrument\n**Status:** Accepted / Implemented / Verified",
    "### UI-063 — Create becomes the signature Kinetic Precision creative instrument\n**Status:** Accepted / Implemented / Verified / Merged",
    "UI_DECISIONS UI-063 status",
)
p.write_text(text)
append_once(
    "docs/ui/UI_DECISIONS.md",
    "#### UI-063 merged-main verification — 2026-09-07",
    f'''
#### UI-063 merged-main verification — 2026-09-07
Final PR head `{FINAL_PR_HEAD}` passed all 17 exact-head workflows and rendered review, then PR #122 squash-merged as `{MERGED_MAIN}` with the same tree `{FINAL_TREE}`. All 10 post-merge workflows / 11 check-runs completed successfully on merged `main`, including Video Generation Integration `{MERGED_VIDEO_RUN}` through the recovered REDGraft fleet. A live Vercel audit after merge found no new deployment, so production remains unchanged. UI-063 is therefore merged and verified; Phase 21 may now be expanded into its own execution contract, but this decision does not pre-authorize Phase 21 implementation or production deployment.
''',
)

p = Path("docs/architecture/INFRASTRUCTURE.md")
text = p.read_text()
recovery_tail = "This recovery changes only the REDGraft worker/routing registration needed to restore the already-approved Create Video / Animate Image capability. It does not change product capability semantics, schema, Supabase, R2, admission/account behavior, Vercel deployment state, or the separate RenderLab image-upscale worker. Production application deployment remains explicit and was not performed by this recovery."
recovery_postmerge = f'''

Phase 20 final PR head `{FINAL_PR_HEAD}` subsequently passed the complete 17-workflow exact-head matrix and squash-merged as `{MERGED_MAIN}` with unchanged tree `{FINAL_TREE}`. Merged-main verification also completed successfully across all 10 push workflows / 11 check-runs; Video Generation Integration `{MERGED_VIDEO_RUN}` again passed through the recovered REDGraft route. A live Vercel deployment audit after merge found no RenderLab deployment created at or after `{MERGED_MAIN}`; the newest deployment remains `{LATEST_VERCEL_DEPLOYMENT}` from 2026-09-06 22:15:21 UTC. The recovery is therefore verified in merged repository state while production application deployment remains unchanged.
'''
if "Phase 20 final PR head `514193d6f62dd6e574674faa07e58ececa6b11d4` subsequently passed" in text:
    raise SystemExit("INFRASTRUCTURE merged-main recovery evidence already present")
text = replace_once(text, recovery_tail, recovery_tail + recovery_postmerge, "INFRASTRUCTURE recovery tail")
p.write_text(text)
