from pathlib import Path
import re
import subprocess

BASE = "c786a17fa3a3c7f76dba5a64cb7822926749c1a2"
HEAD = BASE
VISUAL_RUN = "34680601776"
VISUAL_ARTIFACT = "10293387664"
VISUAL_DIGEST = "sha256:e4937a16a2fed2bc160634c73c60322b0748ff3eb5d166b44cbc33f894a92915"
LIFECYCLE_RUN = "34680601698"
LIFECYCLE_ARTIFACT = "10293653778"
LIFECYCLE_DIGEST = "sha256:ba13fc48dcf4d823575b041455d902e48040d2cd554892c0b5b508ee80e88624"


def baseline(path: str) -> str:
    return subprocess.check_output(["git", "show", f"{BASE}:{path}"], text=True)


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text: str, pattern: str, replacement: str, name: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{name}: expected one match, got {count}")
    return updated


path = "PROJECT.md"
text = baseline(path)
block = f"""## Phase 23 Create fidelity correction — 2026-09-12
- Direct user comparison against the explicitly approved Clear Composer v0.5 evidence reopened issue #184 after the first merged Phase 23 implementation proved functionally correct but materially drifted from the approved composition. The design authority remains prototype/code head `6237f59351d2cd7b397881f617a483d62d9bf438`, R&D run `34613720083`, artifact `10269841181` (`sha256:3d3eec07dc2ff4924deb2ce6739bca420fba88e816665af34c4289ed45aae1c0`).
- `main` remains `240ac42e45ec3f6110ed7b9f0682d96d59a448c0` while the correction is carried by PR #188 / `work/phase-23-create-fidelity-correction`; Library redesign R&D #187 remains paused until the correction is merged.
- User-approved correction head `{HEAD}` restores the compact horizontal application header, 900px authoring / 1120px result composition, Image/Video-above-composer order, visible `PROMPT` labelling, reference-before-prompt grammar, flat essential-settings footer, visible setting label/value grammar, stable high-contrast Generate, composer-attached Advanced, truthful registration-framed generating state and asymmetric media-first result rail. The correction changes no schema, worker/provider, routing, auth/admission, ownership, durable-media, storage or deployment contract.
- All 16 directly attached workflows passed on `{HEAD}`, including Engineering Quality `34680601598`, Create Clear Composer Visual `{VISUAL_RUN}`, configured Create Lifecycle `{LIFECYCLE_RUN}`, UI Shell `34680601708`, Integrated Release `34680601834`, Generation Admission `34680601611`, Account Ownership `34680601582` and Video Generation Integration `34680601661`. Clear Composer artifact `{VISUAL_ARTIFACT}` has digest `{VISUAL_DIGEST}`; configured lifecycle artifact `{LIFECYCLE_ARTIFACT}` has digest `{LIFECYCLE_DIGEST}`.
- The configured lifecycle verifier preserves the real continuation contract after Edit: Image mode, `Primary image`, and loaded durable reference preview. The stale large-heading assertion was removed without weakening generation, persistence, ownership or security checks.
- Direct user review of the real desktop generating/result and mobile result renders approved the corrected appearance on 2026-09-12. Merge of PR #188 is explicitly authorized once this documentation-final head completes the normal exact-head acceptance. Production deployment is not authorized; automatic Git → Vercel deployment remains disabled.

"""
text = replace_once(text, r"## Phase 23 Create fidelity correction — 2026-09-12\n.*?(?=## Current Verified Baseline)", block, "PROJECT correction block")
write(path, text)

path = "docs/ui/UI_MIGRATION.md"
text = baseline(path)
block = f"""## Phase 23 fidelity correction reopening — 2026-09-12
- [x] Direct user fidelity review rejected the first merged Phase 23 pixels as materially divergent from the approved v0.5 artifact; issue #184 remains the tracker and the approved v0.5 evidence remains authoritative.
- [x] PR #188 / `work/phase-23-create-fidelity-correction` restores the approved horizontal shell and Clear Composer composition without changing product/backend/security/data contracts.
- [x] User-approved exact implementation head `{HEAD}` passed all 16 directly attached workflows, including Engineering Quality `34680601598`, UI Shell `34680601708`, Create Clear Composer Visual `{VISUAL_RUN}`, configured Create Lifecycle `{LIFECYCLE_RUN}`, Integrated Release `34680601834`, Generation Admission `34680601611`, Account Ownership `34680601582` and Video Generation Integration `34680601661`.
- [x] Create Clear Composer Visual artifact `{VISUAL_ARTIFACT}` has digest `{VISUAL_DIGEST}`; configured Create Lifecycle artifact `{LIFECYCLE_ARTIFACT}` has digest `{LIFECYCLE_DIGEST}`.
- [x] The repeated pre-fix lifecycle failure was isolated to the stale post-Edit heading wait after real generation and durable persistence had already succeeded. The verifier now asserts Image mode, `Primary image`, and the loaded durable reference preview; product/security invariants remain intact.
- [x] Direct user review approved the real corrected desktop generating/result and mobile result appearance on 2026-09-12.
- [x] Production remains unchanged; Library R&D #187 remains paused pending merge closure.
- [x] Merge is explicitly authorized after the documentation-final exact head passes the normal attached workflow set.
- [ ] Production deployment remains separately explicit and automatic Git → Vercel deployment stays disabled.

**Phase 23 correction status: `VISUALLY APPROVED / IMPLEMENTATION EXACT-HEAD VERIFIED / MERGE AUTHORIZED / DOCUMENTATION-FINAL EXACT-HEAD ACCEPTANCE PENDING / NOT DEPLOYED`.**

"""
text = replace_once(text, r"## Phase 23 fidelity correction reopening — 2026-09-12\n.*?(?=## Phase 0)", block, "UI_MIGRATION correction block")
write(path, text)

path = "docs/ui/UI_DECISIONS.md"
text = baseline(path)
block = f"""### UI-074 — Approved Create fidelity requires compact horizontal application chrome
**Status:** Accepted / user-approved / exact-head verified / merge authorized
**Date:** 2026-09-12
**Decision:** Direct user fidelity review of the first merged UI-073 implementation reaffirms the approved Clear Composer v0.5 artifact as the visual authority and accepts the correction candidate's compact horizontal application header across application routes. The fidelity target has no persistent desktop left rail and no fixed mobile bottom dock; Create uses the approved 900px authoring / 1120px result composition, reference-before-prompt grammar, visible Prompt and setting labels, flat settings footer, stable Generate, attached Advanced, registration-framed truthful generating state and asymmetric media-first result rail.
**Reason:** The first merged Phase 23 implementation preserved product behavior but materially diverged from the explicitly approved v0.5 composition. Fidelity QA is a separate acceptance gate under `DESIGN_WORKFLOW.md`; technically green output does not override explicit visual approval.
**Consequences:** PR #188 changes shell presentation and Create composition only. Navigation destinations, route hierarchy, account access, generation/upload/media contracts, schema, provider/worker routing, storage, ownership, admission and deployment policy remain unchanged. The compact horizontal header must preserve Create/Library/Activity/Settings reachability at desktop and narrow widths, keyboard/touch semantics and reduced-motion equivalence. This decision supersedes UI-071's rail/mobile-dock visual geometry when the accepted correction is merged; production remains unchanged until a separately authorized deployment.
**Verification:** user-approved exact implementation head `{HEAD}` passed all 16 directly attached workflows, including Engineering Quality `34680601598`, UI Shell `34680601708`, Create Clear Composer Visual `{VISUAL_RUN}`, configured Create Lifecycle `{LIFECYCLE_RUN}`, Integrated Release `34680601834`, Generation Admission `34680601611`, Account Ownership `34680601582` and Video Generation Integration `34680601661`. Visual artifact `{VISUAL_ARTIFACT}` (`{VISUAL_DIGEST}`) and lifecycle artifact `{LIFECYCLE_ARTIFACT}` (`{LIFECYCLE_DIGEST}`) are the accepted browser evidence. Direct user visual approval was given on 2026-09-12; merge is explicitly authorized after documentation-final exact-head acceptance. Production deployment remains unauthorized.
"""
text = replace_once(text, r"### UI-074 — Approved Create fidelity requires compact horizontal application chrome\n.*\Z", block, "UI_DECISIONS UI-074")
write(path, text)

path = "docs/ui/SCREEN_REGISTRY.md"
text = baseline(path)
shell = f"""**Phase 23 fidelity correction — user-approved / merge authorized:** UI-074 / PR #188 restores the approved compact horizontal application header across application routes and removes the persistent desktop rail / fixed mobile dock from the accepted candidate tree. Navigation destinations and shell/feature ownership are unchanged. User-approved exact implementation head `{HEAD}` passed UI Shell `34680601708`, Brand / Launch `34680601653`, Account Identity `34680601778` and the complete 16-workflow attached suite. Current merged `main`/production remain unchanged until the guarded merge/deployment operations occur."""
text = replace_once(text, r"\*\*Phase 23 fidelity-correction candidate — merge pending:\*\*.*?\n\n", shell + "\n\n", "SCREEN_REGISTRY shell note")
create = f"""**Phase 23 fidelity correction — user-approved / merge authorized, 2026-09-12:** Direct user comparison rejected the first merged Phase 23 composition as visually divergent from the approved v0.5 evidence, so issue #184 was reopened and PR #188 became the correction vehicle. The accepted candidate restores the approved 900px authoring / 1120px result widths, mode-before-composer order, visible `PROMPT`, reference-before-prompt grammar, flat labelled settings footer, stable high-contrast Generate, attached Advanced, truthful registration-framed generating stage and asymmetric media-first result rail while preserving all existing Create product contracts. Exact head `{HEAD}` passed all 16 directly attached workflows. Create Clear Composer Visual `{VISUAL_RUN}` produced artifact `{VISUAL_ARTIFACT}` (`{VISUAL_DIGEST}`); configured Create Lifecycle `{LIFECYCLE_RUN}` produced artifact `{LIFECYCLE_ARTIFACT}` (`{LIFECYCLE_DIGEST}`). Direct user review approved the real corrected desktop generating/result and mobile result renders on 2026-09-12. Merge is authorized after documentation-final exact-head acceptance; production remains unchanged and deployment remains separately explicit."""
text = replace_once(text, r"\*\*Phase 23 fidelity correction reopening — 2026-09-12:\*\*.*?\n\n", create + "\n\n", "SCREEN_REGISTRY Create note")
write(path, text)

path = "docs/ui/COMPONENT_CATALOG.md"
text = baseline(path)
shell = f"""**Phase 23 / UI-074 fidelity correction:** PR #188 changes AppShell presentation to the approved compact horizontal header on both desktop and narrow layouts, with Brand/Create, Library, Activity and Settings/account access and no desktop rail or mobile dock. It reuses the existing `AppShell`, `Button`, `RenderLabBrand`, Next.js navigation, Lucide and Motion stack; no new shell primitive, route, navigation destination or client data store is introduced. User-approved exact implementation head `{HEAD}` passed UI Shell `34680601708` and all other directly attached workflows. The correction supersedes UI-071 geometry after merge; production remains unchanged until separately deployed."""
text = replace_once(text, r"\*\*Phase 23 / UI-074 fidelity-correction candidate:\*\*.*?\n\n", shell + "\n\n", "COMPONENT_CATALOG AppShell note")
marker = "**Phase 23 / UI-073 Clear Composer candidate:**"
idx = text.find(marker)
if idx < 0:
    raise SystemExit("COMPONENT_CATALOG Create marker not found")
next_heading = text.find("\n### ", idx)
if next_heading < 0:
    next_heading = len(text)
section = text[idx:next_heading]
correction = f"""

**Phase 23 / UI-074 fidelity correction:** `CreateWorkspace` remains the single authoritative Create surface while PR #188 restores the approved v0.5 composition: 900px authoring / 1120px result geometry, mode switch above the composer, reference-before-Prompt grammar, flat labelled settings footer, high-contrast Generate, composer-attached Advanced, truthful registration-framed generating state and asymmetric media-first result rail. Continuation remains capability-derived and existing upload/polling/persistence/alias/native-video/security contracts are unchanged. User-approved exact head `{HEAD}` passed all 16 attached workflows; accepted browser evidence is Clear Composer artifact `{VISUAL_ARTIFACT}` (`{VISUAL_DIGEST}`) and configured lifecycle artifact `{LIFECYCLE_ARTIFACT}` (`{LIFECYCLE_DIGEST}`). Merge is authorized after documentation-final exact-head acceptance; production remains unchanged."""
if "**Phase 23 / UI-074 fidelity correction:**" not in section:
    section = section.rstrip() + correction + "\n"
    text = text[:idx] + section + text[next_heading:]
write(path, text)

path = "docs/ui/CREATE_CLEAR_COMPOSER_IMPLEMENTATION_CONTRACT.md"
text = baseline(path)
block = f"""## Fidelity correction reopening — 2026-09-12

Direct user comparison against the approved v0.5 artifact reopened this contract after the first merged Phase 23 implementation proved functionally correct but materially drifted from the accepted visual composition. The approved evidence did not change: prototype/code head `6237f59351d2cd7b397881f617a483d62d9bf438`, run `34613720083`, artifact `10269841181`, digest `sha256:3d3eec07dc2ff4924deb2ce6739bca420fba88e816665af34c4289ed45aae1c0` remain the binding visual authority.

Issue #184 is reopened and PR #188 / `work/phase-23-create-fidelity-correction` is the correction vehicle. Library R&D #187 remains paused until Create fidelity closes.

The accepted correction restores the approved compact horizontal application header instead of the merged desktop rail/mobile dock geometry; the 900px Create authoring column and 1120px result composition; Image/Video selection above the composer; visible `PROMPT` labelling; reference-before-prompt order; a flat essential-settings footer with visible setting label/value grammar; a conventional high-contrast stable Generate action; Advanced attached flush to the composer; the truthful registration-framed generating stage; and the detailed asymmetric media-first result rail. Existing generation, upload, account/admission, ownership, durable-media, native-video, capability and continuation contracts remain unchanged. No schema, provider/worker, R2/storage, route hierarchy or deployment change is part of the correction.

User-approved exact implementation head `{HEAD}` passed every workflow GitHub attached directly to that head (16/16): Engineering Quality `34680601598`, Create Clear Composer Visual `{VISUAL_RUN}`, Brand / Launch Visual `34680601653`, Account Ownership `34680601582`, Create Durable Upload `34680601647`, UI Shell `34680601708`, Account Identity `34680601778`, Activity Cancel `34680601718`, Library Lifecycle `34680601719`, Activity Visual `34680601683`, Account/Admin Operations `34680601575`, Create Lifecycle `{LIFECYCLE_RUN}`, Creative Iteration `34680601697`, Generation Admission `34680601611`, Integrated Release `34680601834`, and Video Generation Integration `34680601661`.

Accepted browser evidence:
- Create Clear Composer Visual artifact `{VISUAL_ARTIFACT}` — `{VISUAL_DIGEST}`;
- configured Create Lifecycle artifact `{LIFECYCLE_ARTIFACT}` — `{LIFECYCLE_DIGEST}`.

The prior lifecycle red was verifier-only: real generation submission, provider reconciliation and durable persistence completed successfully, then the verifier waited on a superseded large heading. The corrected verifier asserts the actual continuation invariants after Edit: Image mode, `Primary image`, and a loaded durable `Reference preview`. No product behavior or security/ownership assertion was weakened to manufacture a green result.

Direct user review of the real desktop generating/result and mobile result renders approved the corrected appearance on 2026-09-12. Merge of PR #188 is explicitly authorized once the documentation-final exact head passes the repository's normal attached acceptance set. Production deployment is not authorized; automatic Git → Vercel deployment remains disabled. The broader UI migration continues after Create correction closure, with Library work restarting from this approved Create/Landing system rather than the rejected prior Library concept.
"""
text = replace_once(text, r"## Fidelity correction reopening — 2026-09-12\n.*\Z", block, "Create contract correction block")
write(path, text)
