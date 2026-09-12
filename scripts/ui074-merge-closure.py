from pathlib import Path
import re

MERGE_SHA = "3f0d21ed55554b3c48791d35dd17cb6005212076"
FINAL_PR_HEAD = "b6a2590875432ba75c28db9e0f4b465133e1873c"
APPROVED_IMPL = "c786a17fa3a3c7f76dba5a64cb7822926749c1a2"
VISUAL_ARTIFACT = "10293387664"
VISUAL_DIGEST = "sha256:e4937a16a2fed2bc160634c73c60322b0748ff3eb5d166b44cbc33f894a92915"
LIFECYCLE_ARTIFACT = "10293653778"
LIFECYCLE_DIGEST = "sha256:ba13fc48dcf4d823575b041455d902e48040d2cd554892c0b5b508ee80e88624"

MAIN_RUNS = (
    "Engineering Quality `34684825581`, Video Generation Integration `34684825378`, "
    "Creative Iteration `34684825592` (unchanged attempt 2 after attempt 1 hit a transient Supabase 504 during fixture inspection), "
    "Activity Cancel Visual `34684825420`, and UI Shell Validation `34684825448`"
)


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text: str, pattern: str, replacement: str, name: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{name}: expected one match, got {count}")
    return updated


# PROJECT.md
path = "PROJECT.md"
text = read(path)
block = f"""## Phase 23 Create fidelity correction — 2026-09-12
- Direct user comparison against the explicitly approved Clear Composer v0.5 evidence reopened issue #184 after the first merged Phase 23 implementation proved functionally correct but materially drifted from the approved composition. The binding visual authority remains prototype/code head `6237f59351d2cd7b397881f617a483d62d9bf438`, R&D run `34613720083`, artifact `10269841181` (`sha256:3d3eec07dc2ff4924deb2ce6739bca420fba88e816665af34c4289ed45aae1c0`).
- The user-approved correction implementation head `{APPROVED_IMPL}` restored the compact horizontal application header, 900px authoring / 1120px result composition, Image/Video-above-composer order, visible `PROMPT` labelling, reference-before-prompt grammar, flat essential-settings footer, visible setting label/value grammar, stable high-contrast Generate, composer-attached Advanced, truthful registration-framed generating state and asymmetric media-first result rail. No schema, worker/provider, routing, auth/admission, ownership, durable-media, storage or deployment contract changed.
- Documentation-final PR head `{FINAL_PR_HEAD}` passed all 16 workflows GitHub attached to that exact head. PR #188 then squash-merged to `main` as `{MERGE_SHA}`. The five workflows GitHub actually attached to merged `main` all passed: {MAIN_RUNS}.
- Accepted browser evidence remains Clear Composer artifact `{VISUAL_ARTIFACT}` (`{VISUAL_DIGEST}`) and configured Create Lifecycle artifact `{LIFECYCLE_ARTIFACT}` (`{LIFECYCLE_DIGEST}`). Direct user review approved the real desktop generating/result and mobile result renders on 2026-09-12.
- The stale post-Edit heading assertion was replaced with the actual continuation invariants—Image mode, `Primary image`, and loaded durable reference preview—without weakening generation, persistence, ownership, admission or security checks.
- The fidelity correction no longer blocks the next UI-migration work. The rejected pre-approval Library concept must not be resumed; future Library work restarts from the now-merged approved Create/Landing system.
- Production remains unchanged at source `0173c4c5ba08360b6352331118abc81978cfa774` / READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`. Automatic Git → Vercel deployment remains disabled and no deployment is authorized by this closure.

"""
text = replace_once(
    text,
    r"## Phase 23 Create fidelity correction — 2026-09-12\n.*?(?=## Current Verified Baseline)",
    block,
    "PROJECT fidelity block",
)
text = replace_once(
    text,
    r"## Current Verified Baseline — 2026-09-11\n- Current repository `main` is .*?(?=\n- Cycle 2)",
    f"## Current Verified Baseline — 2026-09-12\n- Current repository `main` is `{MERGE_SHA}`, the squash merge of PR #188 / UI-074 Create fidelity correction. The correction is user-approved, exact-head verified and merged-main verified. Production is still the separately approved source `0173c4c5ba08360b6352331118abc81978cfa774`; no production deployment followed this merge.",
    "PROJECT baseline",
)
write(path, text)


# UI_MIGRATION.md
path = "docs/ui/UI_MIGRATION.md"
text = read(path)
block = f"""## Phase 23 fidelity correction closure — 2026-09-12
- [x] Direct user fidelity review rejected the first merged Phase 23 pixels as materially divergent from the approved v0.5 artifact; the approved v0.5 evidence remained authoritative throughout the correction.
- [x] PR #188 restored the approved compact horizontal shell and Clear Composer composition without changing product/backend/security/data contracts.
- [x] User-approved implementation head `{APPROVED_IMPL}` passed all 16 directly attached workflows and produced accepted browser evidence: Clear Composer artifact `{VISUAL_ARTIFACT}` (`{VISUAL_DIGEST}`) and configured Create Lifecycle artifact `{LIFECYCLE_ARTIFACT}` (`{LIFECYCLE_DIGEST}`).
- [x] Documentation-final PR head `{FINAL_PR_HEAD}` passed all 16 workflows GitHub attached to that exact head.
- [x] PR #188 squash-merged to `main` as `{MERGE_SHA}`.
- [x] Every workflow GitHub actually attached to merged `main` passed: {MAIN_RUNS}. Creative Iteration attempt 1 failed only on a transient Supabase 504 while inspecting a configured fixture; the unchanged retry passed the full verifier and cleanup.
- [x] Direct user review approved the corrected real desktop generating/result and mobile result appearance on 2026-09-12.
- [x] The stale post-Edit presentation wait was replaced only with the real continuation invariants: Image mode, `Primary image`, and loaded durable reference preview; product/security assertions remain intact.
- [x] The Create fidelity correction no longer blocks Library redesign work. The previously rejected Library concept stays rejected; future Library work must restart from the merged Create/Landing visual system.
- [ ] Production deployment remains separately explicit and automatic Git → Vercel deployment stays disabled.

**Phase 23 correction status: `USER-APPROVED / EXACT-HEAD VERIFIED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED`.**

"""
text = replace_once(
    text,
    r"## Phase 23 fidelity correction reopening — 2026-09-12\n.*?(?=## Phase 0)",
    block,
    "UI_MIGRATION correction block",
)
write(path, text)


# UI_DECISIONS.md
path = "docs/ui/UI_DECISIONS.md"
text = read(path)
block = f"""### UI-074 — Approved Create fidelity requires compact horizontal application chrome
**Status:** Accepted / user-approved / merged / merged-main verified
**Date:** 2026-09-12
**Decision:** Direct user fidelity review of the first merged UI-073 implementation reaffirmed the approved Clear Composer v0.5 artifact as the visual authority. Application routes now use the compact horizontal application header accepted in PR #188: no persistent desktop left rail and no fixed mobile bottom dock. Create uses the approved 900px authoring / 1120px result composition, reference-before-prompt grammar, visible Prompt and setting labels, flat settings footer, stable high-contrast Generate, attached Advanced, registration-framed truthful generating state and asymmetric media-first result rail.
**Reason:** The first merged Phase 23 implementation preserved product behavior but materially diverged from the explicitly approved v0.5 composition. Fidelity QA is a separate acceptance gate under `DESIGN_WORKFLOW.md`; technically green output does not override explicit visual approval.
**Consequences:** UI-074 supersedes UI-071's rail/mobile-dock visual geometry on repository `main`. Navigation destinations, route hierarchy, account access, generation/upload/media contracts, schema, provider/worker routing, storage, ownership, admission and deployment policy remain unchanged. The compact horizontal header remains the authoritative shell geometry for Create/Library/Activity/Settings at desktop and narrow widths while preserving keyboard/touch semantics and reduced-motion equivalence. Production still uses the prior deployed source until a separately authorized deployment.
**Verification:** user-approved implementation head `{APPROVED_IMPL}` passed all 16 directly attached workflows with accepted visual artifact `{VISUAL_ARTIFACT}` (`{VISUAL_DIGEST}`) and lifecycle artifact `{LIFECYCLE_ARTIFACT}` (`{LIFECYCLE_DIGEST}`). Documentation-final PR head `{FINAL_PR_HEAD}` passed all 16 workflows attached to it. PR #188 squash-merged as `{MERGE_SHA}`; merged-main verification passed {MAIN_RUNS}. The first Creative Iteration merged-main attempt encountered only a transient Supabase 504 during fixture inspection and passed unchanged on attempt 2. Production deployment remains unauthorized.
"""
text = replace_once(
    text,
    r"### UI-074 — Approved Create fidelity requires compact horizontal application chrome\n.*\Z",
    block,
    "UI_DECISIONS UI-074",
)
write(path, text)


# SCREEN_REGISTRY.md
path = "docs/ui/SCREEN_REGISTRY.md"
text = read(path)
text = replace_once(
    text,
    r"Approved behavior:\n- compact persistent desktop left navigation;\n- Create/Library primary, Activity/Settings secondary;\n- desktop application routes rely on the persistent rail and omit the redundant full-width top context bar; mobile/narrow application routes retain the compact utility header for account/Settings access;\n- feature surfaces own route content, not the shell;\n- narrow layouts use bottom navigation for primary destinations;\n- touch-friendly semantic navigation\.",
    "Approved behavior:\n- compact fixed horizontal application header across desktop and narrow layouts;\n- RenderLab/Create identity at the left with Library plus Activity/Settings-account access at the right;\n- no persistent desktop left rail and no fixed mobile bottom dock under UI-074;\n- feature surfaces own route content, not the shell;\n- navigation destinations and route hierarchy remain unchanged;\n- keyboard/touch-friendly semantic navigation with reduced-motion equivalence.",
    "SCREEN_REGISTRY shell behavior",
)
text = replace_once(
    text,
    r"\*\*Phase 23 fidelity correction — user-approved / merge authorized:\*\*.*?\n\n",
    f"**Phase 23 / UI-074 fidelity correction — merged / verified:** PR #188 restored the approved compact horizontal application header across application routes and removed the persistent desktop rail / fixed mobile dock. User-approved implementation head `{APPROVED_IMPL}` and documentation-final head `{FINAL_PR_HEAD}` passed their complete attached suites; PR #188 squash-merged as `{MERGE_SHA}`. Merged-main UI Shell `34684825448` passed. Production remains unchanged until a separately authorized deployment.\n\n",
    "SCREEN_REGISTRY shell correction note",
)
text = text.replace(
    "**Phase 23 design authority:** `design/rd/create-usability-first-v05.md`, `docs/ui/CREATE_CLEAR_COMPOSER_IMPLEMENTATION_CONTRACT.md`; PR #185 is merged to `main` as `d360f60afeca0b6c417ff1c12dec3c7e922c20f7` and Clear Composer is now the repository-authoritative Create surface. Production remains on the prior deployed source until a separately authorized rollout.",
    f"**Phase 23 design authority:** `design/rd/create-usability-first-v05.md`, `docs/ui/CREATE_CLEAR_COMPOSER_IMPLEMENTATION_CONTRACT.md`; fidelity correction PR #188 is merged to `main` as `{MERGE_SHA}` and the corrected Clear Composer/UI-074 shell is the repository-authoritative Create surface. Production remains on the prior deployed source until a separately authorized rollout.",
)
text = replace_once(
    text,
    r"\*\*Phase 23 fidelity correction — user-approved / merge authorized, 2026-09-12:\*\*.*?\n\n",
    f"**Phase 23 fidelity correction closure — 2026-09-12:** PR #188 restored the approved 900px authoring / 1120px result widths, mode-before-composer order, visible `PROMPT`, reference-before-prompt grammar, flat labelled settings footer, stable high-contrast Generate, attached Advanced, truthful registration-framed generating stage and asymmetric media-first result rail while preserving all Create product contracts. User-approved implementation head `{APPROVED_IMPL}` produced accepted artifacts `{VISUAL_ARTIFACT}` and `{LIFECYCLE_ARTIFACT}`; documentation-final head `{FINAL_PR_HEAD}` passed all 16 attached workflows. PR #188 squash-merged as `{MERGE_SHA}`, and all five merged-main workflows passed, including unchanged Creative Iteration retry after a transient Supabase 504. Production remains unchanged and deployment remains separately explicit.\n\n",
    "SCREEN_REGISTRY Create correction note",
)
write(path, text)


# COMPONENT_CATALOG.md
path = "docs/ui/COMPONENT_CATALOG.md"
text = read(path)
text = text.replace(
    "**Purpose:** Persistent responsive application chrome: desktop sidebar, mobile/narrow utility header, mobile bottom navigation and utility navigation.",
    "**Purpose:** Persistent responsive application chrome: one compact horizontal header across desktop and narrow layouts with Brand/Create identity, Library, Activity and Settings/account access.",
)
text = replace_once(
    text,
    r"\*\*Phase 23 / UI-074 fidelity correction:\*\* PR #188 changes AppShell presentation.*?\n\n",
    f"**Phase 23 / UI-074 fidelity correction — merged:** PR #188 changes AppShell presentation to the approved compact horizontal header on desktop and narrow layouts, with Brand/Create, Library, Activity and Settings/account access and no desktop rail or mobile dock. It reuses the existing `AppShell`, `Button`, `RenderLabBrand`, Next.js navigation, Lucide and Motion stack; no new shell primitive, route, navigation destination or client data store was introduced. Documentation-final head `{FINAL_PR_HEAD}` passed all 16 attached workflows; PR #188 squash-merged as `{MERGE_SHA}` and merged-main UI Shell `34684825448` passed. UI-074 now supersedes UI-071 shell geometry on `main`; production remains unchanged until separately deployed.\n\n",
    "COMPONENT_CATALOG AppShell UI-074",
)
text = replace_once(
    text,
    r"\*\*Phase 23 fidelity-correction candidate:\*\*.*?\n\n",
    f"**Phase 23 fidelity correction reopening — historical:** Direct user fidelity review reopened the merged UI-073 pixels without reopening Create product semantics. PR #188 kept `CreateWorkspace` as the single authoritative feature owner and restored the approved v0.5 composition through Create-owned markup/CSS plus the scoped `src/app/create-clear-composer.css`; no generic component, architecture boundary, product capability or animation runtime was added. The correction is now merged as `{MERGE_SHA}`.\n\n",
    "COMPONENT_CATALOG historical candidate note",
)
text = replace_once(
    text,
    r"\*\*Phase 23 / UI-074 fidelity correction:\*\* `CreateWorkspace` remains.*?\n\n",
    f"**Phase 23 / UI-074 fidelity correction — merged:** `CreateWorkspace` remains the single authoritative Create surface with the approved v0.5 900px authoring / 1120px result geometry, mode switch above the composer, reference-before-Prompt grammar, flat labelled settings footer, high-contrast Generate, composer-attached Advanced, truthful registration-framed generating state and asymmetric media-first result rail. Continuation remains capability-derived and existing upload/polling/persistence/alias/native-video/security contracts are unchanged. Accepted browser evidence is artifact `{VISUAL_ARTIFACT}` (`{VISUAL_DIGEST}`) plus lifecycle artifact `{LIFECYCLE_ARTIFACT}` (`{LIFECYCLE_DIGEST}`). Documentation-final head `{FINAL_PR_HEAD}` passed all 16 attached workflows; PR #188 merged as `{MERGE_SHA}` and all five merged-main workflows passed after one unchanged Creative Iteration retry for a transient Supabase 504. Production remains unchanged.\n\n",
    "COMPONENT_CATALOG Create UI-074",
)
write(path, text)


# CREATE_CLEAR_COMPOSER_IMPLEMENTATION_CONTRACT.md
path = "docs/ui/CREATE_CLEAR_COMPOSER_IMPLEMENTATION_CONTRACT.md"
text = read(path)
block = f"""## Fidelity correction closure — 2026-09-12

Direct user comparison against the approved v0.5 artifact reopened this contract after the first merged Phase 23 implementation proved functionally correct but materially drifted from the accepted visual composition. The binding evidence did not change: prototype/code head `6237f59351d2cd7b397881f617a483d62d9bf438`, run `34613720083`, artifact `10269841181`, digest `sha256:3d3eec07dc2ff4924deb2ce6739bca420fba88e816665af34c4289ed45aae1c0`.

PR #188 restored the approved compact horizontal application header; the 900px Create authoring column and 1120px result composition; Image/Video selection above the composer; visible `PROMPT` labelling; reference-before-prompt order; flat labelled essential settings; a conventional high-contrast stable Generate action; Advanced attached flush to the composer; the truthful registration-framed generating stage; and the detailed asymmetric media-first result rail. Existing generation, upload, account/admission, ownership, durable-media, native-video, capability and continuation contracts remained unchanged. No schema, provider/worker, R2/storage, route hierarchy or deployment change was part of the correction.

User-approved implementation head `{APPROVED_IMPL}` passed all 16 directly attached workflows and produced the accepted browser evidence:
- Create Clear Composer Visual artifact `{VISUAL_ARTIFACT}` — `{VISUAL_DIGEST}`;
- configured Create Lifecycle artifact `{LIFECYCLE_ARTIFACT}` — `{LIFECYCLE_DIGEST}`.

The prior lifecycle red was verifier-only: real generation submission, provider reconciliation and durable persistence had completed successfully before a stale large-heading wait timed out. The corrected verifier asserts the actual post-Edit continuation invariants—Image mode, `Primary image`, and a loaded durable `Reference preview`—without weakening ownership, admission, persistence or security assertions.

Documentation-final exact PR head `{FINAL_PR_HEAD}` passed all 16 workflows GitHub attached to that head. PR #188 then squash-merged to `main` as `{MERGE_SHA}`.

GitHub attached five push workflows to merged `main`, and all are successful: {MAIN_RUNS}. Creative Iteration attempt 1 failed before its product assertions because Supabase returned HTTP 504 while the configured fixture helper inspected cleanup rows; the unchanged attempt 2 passed the full creative-iteration contract and cleanup. No product correction was required. No Release Candidate Matrix was attached to the merge SHA, so it is not claimed as merged-main evidence for this correction.

Direct user review approved the corrected real desktop generating/result and mobile result renders on 2026-09-12. The fidelity correction is therefore **user-approved / exact-head verified / merged / merged-main verified**. Issue #184 may close against this evidence.

The correction no longer blocks the next UI migration work. Library must restart from the merged Create/Landing system; the earlier rejected Library concept remains rejected and must not be resumed as a competing visual direction.

Production deployment is not part of this closure. Production remains source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`; automatic Git → Vercel deployment remains disabled and deployment requires separate explicit authorization.
"""
text = replace_once(
    text,
    r"## Fidelity correction reopening — 2026-09-12\n.*\Z",
    block,
    "Create contract closure block",
)
write(path, text)
