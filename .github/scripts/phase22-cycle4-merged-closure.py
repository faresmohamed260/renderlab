from pathlib import Path

MERGED_MAIN = "e29f02a71c051e432b16a4bc34fb755fec4d5d8f"
FINAL_PR_HEAD = "7049845b7d2c8e5a7c31c0c1a32a20e665f35b87"
FINAL_TREE = "7847166e1f6f301b02572d2b420faa703b62ea67"
FINAL_PR_MATRIX = "34285994347"
FINAL_PR_MANIFEST = "10080083708"
FINAL_PR_MANIFEST_DIGEST = "sha256:8d9b4c7c30fa27a1d950cf20eb96a64d72f928c66aa3e697b92d57477f9d3d43"
MERGE_MATRIX = "34287754646"
MERGE_MANIFEST = "10084078116"
MERGE_MANIFEST_DIGEST = "sha256:89c525e0d5a9f6803e20a8e76b48fad40bbdbd34e53eb4e2f0ffecea191659b9"


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


# PROJECT.md
p = Path("PROJECT.md")
text = p.read_text()
text = replace_once(
    text,
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `ACTIVE / PHASE 22 CONTRACT READY / DESIGN CHECKPOINT REQUIRED`.**",
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `COMPLETE / VERIFIED / MERGED`.**",
    "PROJECT Cycle 4 status",
)
text = replace_once(
    text,
    "# Phase 22 Execution Contract — Activity, Settings, Landing & System Cohesion\n**Status: `VERIFIED ON IMPLEMENTATION HEAD / MERGE PENDING`.**",
    "# Phase 22 Execution Contract — Activity, Settings, Landing & System Cohesion\n**Status: `COMPLETE / VERIFIED / MERGED`.**",
    "PROJECT Phase 22 status",
)
p.write_text(text)
append_once(
    "PROJECT.md",
    "## Phase 22 / Cycle 4 merged-main closure — 2026-09-09",
    f'''
## Phase 22 / Cycle 4 merged-main closure — 2026-09-09
**Status: `COMPLETE / VERIFIED / MERGED`.**

Definitive PR #130 head `{FINAL_PR_HEAD}` was a connector/user-authored tree-identical validation commit on accepted tree `{FINAL_TREE}`. All 15 workflows GitHub attached to that exact PR head succeeded. Release Candidate Matrix `{FINAL_PR_MATRIX}` also passed its exact-SHA 23-child configured matrix and published manifest artifact `{FINAL_PR_MANIFEST}` (`{FINAL_PR_MANIFEST_DIGEST}`).

PR #130 was marked ready and guarded squash-merged with `expected_head_sha={FINAL_PR_HEAD}`. The resulting `main` commit is `{MERGED_MAIN}` and preserves the exact accepted tree `{FINAL_TREE}`.

Every workflow GitHub actually attached to the merged `main` push reached terminal success: Engineering Quality `34287754692`, Image Upscale Integration `34287754640`, Integrated Release `34287754668`, Activity Cancel Visual `34287754684`, Creative Iteration `34287754635`, Release Candidate Matrix `{MERGE_MATRIX}` and UI Shell Validation `34287754636`. Release Candidate Matrix attempt 1 was not waived: its Generation Bridge child hit a transient Supabase REST 504 while polling an already-running job; unchanged same-SHA attempt 2 completed all 23/23 children and published final manifest artifact `{MERGE_MANIFEST}` (`{MERGE_MANIFEST_DIGEST}`). The attached UI Shell push run was likewise rerun on the same merge SHA after matrix same-ref concurrency cancelled its first attempt; attempt 2 passed the full shell suite.

No repository-triggered production rollout was performed or authorized. `vercel.json` continues to set `git.deploymentEnabled=false`, automatic Git → Vercel deployment remains disabled, and this closure changes documentation only. Phase 22 therefore closes Cycle 4 as `COMPLETE / VERIFIED / MERGED`. No Phase 23 implementation or production deployment is implied or authorized.
''',
)

# docs/ui/UI_MIGRATION.md
p = Path("docs/ui/UI_MIGRATION.md")
text = p.read_text()
text = replace_once(
    text,
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `ACTIVE / PHASE 22 IMPLEMENTATION VERIFIED / MERGE PENDING`.**",
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `COMPLETE / VERIFIED / MERGED`.**",
    "UI_MIGRATION Cycle 4 status",
)
text = replace_once(
    text,
    "- **Phase 22 — Activity, Settings, Landing & System Cohesion:** `VERIFIED ON IMPLEMENTATION HEAD / MERGE PENDING` — contract baseline `c17abfef07fbc580c51f458496e4e53502816229`; reviewed checkpoint evidence `34265429235` / artifact `10071612375`; exact implementation head `c081d53afecdd76f8c687cfc950d8f4bb0454a8a`.",
    f"- **Phase 22 — Activity, Settings, Landing & System Cohesion:** `COMPLETE / VERIFIED / MERGED` — definitive PR head `{FINAL_PR_HEAD}`; guarded squash merge `{MERGED_MAIN}`; merged-main verification complete.",
    "UI_MIGRATION Phase 22 roadmap status",
)
text = replace_once(
    text,
    "- [ ] This handoff docs commit changes repository documentation after the green `287a3e26...` head. Before merge, obtain a user/connector-authored exact-head retrigger on the unchanged documentation tree and require every attached workflow to be green; do not borrow older-SHA success.",
    f"- [x] The documentation-finalized tree received connector/user-authored tree-identical retrigger `{FINAL_PR_HEAD}`; all 15 workflows attached to that definitive PR head succeeded, including Release Candidate Matrix `{FINAL_PR_MATRIX}` with 23/23 exact-SHA children.",
    "UI_MIGRATION final PR retrigger",
)
text = replace_once(
    text,
    "- [ ] Mark PR #130 ready only after that final exact-head gate; guarded squash-merge with `expected_head_sha`.",
    f"- [x] Mark PR #130 ready after the final exact-head gate and guarded squash-merge with `expected_head_sha={FINAL_PR_HEAD}`; merged `main` is `{MERGED_MAIN}` with accepted tree `{FINAL_TREE}`.",
    "UI_MIGRATION guarded merge",
)
text = replace_once(
    text,
    "- [ ] Verify all workflows attached to the merged `main` commit, then update Phase 22 / Cycle 4 to `COMPLETE / VERIFIED / MERGED`.",
    "- [x] Verify every workflow attached to merged `main`: all 7 push workflows are terminal-success after same-SHA matrix/UI-Shell reruns resolved transient infrastructure/concurrency interruptions without repository changes.",
    "UI_MIGRATION merged main verification",
)
text = replace_once(
    text,
    "- [ ] Production rollout remains separate and unauthorized.",
    "- [x] Production rollout remained separate and unauthorized; automatic Git → Vercel deployment is still disabled and no deployment operation was performed by this closure.",
    "UI_MIGRATION production boundary",
)
p.write_text(text)
append_once(
    "docs/ui/UI_MIGRATION.md",
    "### Phase 22 / Cycle 4 merged-main closure — 2026-09-09",
    f'''
### Phase 22 / Cycle 4 merged-main closure — 2026-09-09
- [x] Definitive PR head `{FINAL_PR_HEAD}` preserved accepted tree `{FINAL_TREE}` and passed all 15 attached workflows. Release Candidate Matrix `{FINAL_PR_MATRIX}` passed all 23 exact-SHA children; manifest `{FINAL_PR_MANIFEST}` (`{FINAL_PR_MANIFEST_DIGEST}`).
- [x] PR #130 guarded squash-merged as `{MERGED_MAIN}` with the same tree.
- [x] All seven workflows attached to the merge push succeeded: Engineering Quality `34287754692`, Image Upscale Integration `34287754640`, Integrated Release `34287754668`, Activity Cancel Visual `34287754684`, Creative Iteration `34287754635`, Release Candidate Matrix `{MERGE_MATRIX}` and UI Shell Validation `34287754636`.
- [x] Release Candidate Matrix attempt 2 passed 23/23 children after attempt 1 encountered a transient Supabase REST 504 in Generation Bridge; final manifest `{MERGE_MANIFEST}` (`{MERGE_MANIFEST_DIGEST}`). UI Shell attempt 2 passed after the matrix's same-ref dispatch cancelled the first attached push attempt; no product regression was accepted or waived.
- [x] Phase 22 and Cycle 4 are `COMPLETE / VERIFIED / MERGED`. Production deployment remains separate and unauthorized; no Phase 23 is implied.
''',
)

# docs/ui/UI_DECISIONS.md
p = Path("docs/ui/UI_DECISIONS.md")
text = p.read_text()
text = replace_once(
    text,
    "### UI-065 — Activity, Settings and Landing complete Kinetic Precision system cohesion\n**Status:** Accepted / Implemented / Exact-head verified / Merge pending",
    "### UI-065 — Activity, Settings and Landing complete Kinetic Precision system cohesion\n**Status:** Accepted / Implemented / Verified / Merged",
    "UI_DECISIONS UI-065 status",
)
text = replace_once(
    text,
    "**Consequences:** UI-065 changes no generation/media/account/admission/schema/storage/worker/provider/routing/deployment contract and adopts no new dependency. Phase 22 remains merge-pending until PR #130 is guarded-merged and merged-main checks pass. Production rollout remains a separate explicit operation; this decision implies no Phase 23.",
    "**Consequences:** UI-065 changes no generation/media/account/admission/schema/storage/worker/provider/routing/deployment contract and adopts no new dependency. PR #130 is now guarded-merged and merged-main verification is complete, so Phase 22 and Cycle 4 are complete/verified/merged. Production rollout remains a separate explicit operation; this decision implies no Phase 23.",
    "UI_DECISIONS UI-065 consequences",
)
p.write_text(text)
append_once(
    "docs/ui/UI_DECISIONS.md",
    "#### UI-065 merged-main verification — 2026-09-09",
    f'''
#### UI-065 merged-main verification — 2026-09-09
Definitive PR head `{FINAL_PR_HEAD}` passed all 15 attached exact-head workflows and preserved tree `{FINAL_TREE}`. PR #130 then guarded squash-merged as `{MERGED_MAIN}` with the same tree. All seven workflows GitHub attached to the merge push succeeded, including Release Candidate Matrix `{MERGE_MATRIX}` and UI Shell `34287754636` after same-SHA reruns. Matrix attempt 1 was classified as a transient Supabase REST 504 during Generation Bridge polling; attempt 2 passed all 23/23 configured children and published manifest `{MERGE_MANIFEST}` (`{MERGE_MANIFEST_DIGEST}`). UI Shell attempt 1 was cancelled by matrix same-ref concurrency after its tests had passed; the unchanged attached push run passed on attempt 2. No product/security semantics changed during those reruns. Production deployment remains separate and unauthorized, so UI-065 and Cycle 4 are `COMPLETE / VERIFIED / MERGED` without implying Phase 23.
''',
)

# docs/architecture/INFRASTRUCTURE.md
append_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "## Phase 22 / Cycle 4 CI and deployment closure — 2026-09-09",
    f'''
## Phase 22 / Cycle 4 CI and deployment closure — 2026-09-09
Phase 22 final PR head `{FINAL_PR_HEAD}` passed all 15 attached pull-request workflows, including the event-aware Account/Admin Operations + Generation Admission path and Release Candidate Matrix `{FINAL_PR_MATRIX}` with 23/23 exact-SHA children. PR #130 then guarded squash-merged as `{MERGED_MAIN}` with unchanged accepted tree `{FINAL_TREE}`.

GitHub attached exactly seven push workflows to that merge SHA, and all seven are terminal-success: Engineering Quality `34287754692`, Image Upscale Integration `34287754640`, Integrated Release `34287754668`, Activity Cancel Visual `34287754684`, Creative Iteration `34287754635`, Release Candidate Matrix `{MERGE_MATRIX}` and UI Shell Validation `34287754636`.

Two same-SHA reruns are part of the verified infrastructure record rather than waivers. Release Candidate Matrix attempt 1 failed only after Generation Bridge run `34287832577` encountered a transient Supabase REST 504 while polling an already-running job; unchanged attempt 2 passed all 23/23 children and published final manifest `{MERGE_MANIFEST}` (`{MERGE_MANIFEST_DIGEST}`). The attached UI Shell push run's first attempt was cancelled when the matrix dispatched a same-`main` UI Shell child under the workflow's broad same-ref concurrency key; its 22 tests had already passed. After matrix dispatch quiesced, the original attached run was rerun on the same merge SHA and attempt 2 passed. This known same-ref scheduling interaction was not changed during docs closure because acceptance required and obtained success on the exact merge tree without introducing another workflow-change cycle.

Repository deployment behavior is unchanged: `vercel.json` keeps `git.deploymentEnabled=false`, automatic Git → Vercel deployment remains disabled, and no deployment operation was performed or authorized by the Phase 22 merge or this documentation closure. The repository's previously recorded production baseline therefore remains separate from Cycle 4 repository closure. No Supabase/R2/schema/worker/provider/routing/runtime infrastructure mutation or scheduler activation accompanies this closure.
''',
)
