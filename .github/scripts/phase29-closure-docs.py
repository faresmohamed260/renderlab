from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


def insert_before_once(path: str, marker: str, block: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(marker)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one insertion marker, found {count}: {marker!r}")
    p.write_text(text.replace(marker, block.rstrip() + "\n\n" + marker, 1))


# PROJECT.md — close the redesign program from verified Phase 29 reality.
replace_once(
    "PROJECT.md",
    "**Status: ACTIVE — Landing, Create, Library, Media Viewer, Activity, Settings and Admin completed; final cohesion remains.**",
    "**Status: COMPLETE / VERIFIED IN REPOSITORY — the Phase 23–29 UI/UX redesign program is closed; accumulated post-Landing application redesign remains not deployed.**",
)
replace_once(
    "PROJECT.md",
    "Phase 28 closes the approved Admin System Continuity slice; it does **not** close the broader RenderLab UI/UX redesign program. The redesign must continue as one coherent system derived from the locked Lab Grid identity, approved Lab Matrix Landing, Clear Composer / UI-074 application language, Gallery Rail / UI-075 media language, Media Register + Source Fold / UI-076, and Job Matrix + History Register / UI-077.",
    "Phase 29 closes the repository UI/UX redesign program as one coherent system derived from the locked Lab Grid identity, approved Lab Matrix Landing, Clear Composer / UI-074 application language, Gallery Rail / UI-075 media language, Media Register + Source Fold / UI-076, Job Matrix + History Register / UI-077, Trust Register / UI-078 and Admin System Continuity / UI-079. Future UI work must treat these approved surfaces as current product authority unless a new explicit decision reopens a named surface.",
)
replace_once(
    "PROJECT.md",
    "- **Application shell:** UI-074 compact horizontal header is the current shared shell geometry and should be maintained/cohered rather than restarted as a competing navigation system.",
    "- **Application shell:** UI-074 compact horizontal header is the current shared shell geometry and should be maintained/cohered rather than restarted as a competing navigation system.\n- **Whole-product cohesion:** UI-080 integration audit is exact-head verified, merged and merged-main verified; no current production UI defect required a pixel correction.",
)
replace_once(
    "PROJECT.md",
    "Remaining redesign roadmap, under progressive phase planning:",
    "Redesign program closure record:",
)
replace_once(
    "PROJECT.md",
    "5. **Phase 29 — whole-product cohesion pass:** CONTRACT DEFINED / IMPLEMENTATION NOT STARTED / NOT DEPLOYED. `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` and UI-080 govern the final integration/QA pass over the already approved surfaces; this is not another redesign or capability phase.",
    "5. **Phase 29 — whole-product cohesion pass:** COMPLETE / EXACT-HEAD VERIFIED / HUMAN-REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED. UI-080 and `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` governed a verification-first integration pass. The suspected 390px Create/header collision did not reproduce under deterministic geometry, so no production UI code was changed; durable regression coverage now guards fixed-header clearance, narrow overflow and reduced-motion behavior.",
)
replace_once(
    "PROJECT.md",
    "Phases 26, 27 and 28 are closed. Phase 27 Settings / account-security is implemented, exact-head/fidelity verified, merged as `383def35fdf77566696a0c41f88349613029a37a`, and merged-main verified. This closes only the UI-078 production slice; it does not close the broader Account & Settings capability roadmap or its independent security/profile/privacy workstreams. Phase 29 whole-product cohesion is now contract-defined; production implementation begins only after the Phase 29 planning gate merges. Every remaining surface must reuse the established RenderLab visual/interaction family rather than inventing a new theme. Production deployment remains separate and explicit; current production is still source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`, with automatic Git → Vercel deployment disabled.",
    "Phases 26 through 29 are closed and the repository UI/UX redesign program is complete. Phase 27 still closes only the UI-078 Settings production slice; the broader Account & Settings capability roadmap and workstreams #215–#221/#223 remain independent. Phase 29 intentionally made no production pixel changes because the integrated audit found no evidence-backed defect that justified reopening an approved surface. Production deployment remains separate and explicit; current production is still source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`, with automatic Git → Vercel deployment disabled.",
)
replace_once(
    "PROJECT.md",
    "## Current Verified Baseline — 2026-09-13",
    "## Current Verified Baseline — 2026-09-14",
)
replace_once(
    "PROJECT.md",
    "- The verified repository application baseline is Phase 26 / PR #205 merge `2a49d7e223595cd2f876829a779d3f5d3c362e81`; Job Matrix + History Register v0.2 is user-approved, exact-head verified and merged-main verified. Production remains the separately approved source `0173c4c5ba08360b6352331118abc81978cfa774`; no production deployment followed the Phase 26 repository merge.",
    "- The verified repository application baseline is Phase 29 / PR #237 merge `1c33fccf7de5b919b6a9f15916c66b92334da84a`; UI-080 whole-product cohesion is exact-head verified, human-reviewed and merged-main verified. Phase 29 changed only regression verification, not production UI pixels. Production remains the separately approved source `0173c4c5ba08360b6352331118abc81978cfa774`; no production deployment followed the Phase 29 repository merge.",
)

phase29_project = """## Phase 29 Whole-product cohesion closure — 2026-09-14
- Planning PR #236 merged UI-080 and `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` first as `b4a76e279aea79bcd5779495064f635fb8bc8fbf`.
- PR #237 used a verification-first implementation. Final exact head `e1cf49db3cff9cd635775c07b9c8f9fe9e68660b` changed only `tests/ui/shell.spec.ts` and `tests/unit/ui-cohesion.test.mjs`; no production source, route, capability, backend or infrastructure file changed.
- All workflows GitHub attached to that exact final head passed: Engineering Quality `34788560805`, UI Shell Validation `34788560808`, and Brand / Launch Visual `34788560864`. Final-head shell artifact `10326429843` has digest `sha256:7df45aec014ed0a2203486645f2db11781c817bf28c3c18a7f5936c9d5c41982`.
- Deterministic 390px browser geometry proved the suspected Create title/fixed-header collision did not reproduce. Cross-route checks verified Create, Library, Activity and Settings clear the UI-074 fixed header, do not horizontally overflow at 390px, and retain a reduced-motion-equivalent Create path. Human review found no evidence-backed current visual defect requiring a production pixel correction; approved per-surface compositions therefore remain unchanged.
- The same-product-tree Phase 28 Release Candidate Matrix baseline supplied configured Landing, Viewer, Account/Settings, Admin and cloud-backed state evidence, while Phase 29 added the missing cross-route shell/integration guard rather than rerunning unrelated product work without a changed contract.
- PR #237 squash-merged as `1c33fccf7de5b919b6a9f15916c66b92334da84a`. GitHub attached exactly two push workflows to merged `main` and both passed: Engineering Quality `34788682047` and UI Shell Validation `34788682060`. Merged-main shell artifact `10326969432` has digest `sha256:8ad356af9fc5b1cd9a25b42f63d1a66c00829a2f343ecb753895ced2a29660a4`.
- No API/schema/RLS/Auth/provider/worker/R2/storage/product-security contract changed. The repository redesign program is complete, but production rollout of the accumulated not-yet-deployed application redesign remains a separate explicit operation.

**Phase 29 status: `COMPLETE / EXACT-HEAD VERIFIED / HUMAN-REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED`.**"""
insert_before_once("PROJECT.md", "## Phase 27 Settings Trust Register implementation verification — 2026-09-13", phase29_project)


# UI_MIGRATION.md — turn the active roadmap into verified closure.
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "## Active full-product redesign roadmap — after Phase 26",
    "## Full-product redesign program — repository closure",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Status: `IN PROGRESS`.** Phase 26 completes the Activity slice; Settings, Admin and the final whole-product cohesion pass remain.",
    "**Status: `COMPLETE / VERIFIED IN REPOSITORY / NOT FULLY DEPLOYED`.** Phase 29 closes the Phase 23–29 redesign program; production rollout of the accumulated post-Landing application redesign remains separately explicit.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "The coherent design authority carried forward is the current locked Lab Grid identity + approved Lab Matrix Landing + Clear Composer/UI-074 + Gallery Rail/UI-075 + Media Register/Source Fold UI-076 + Job Matrix/History Register UI-077. Remaining redesign work must reuse that family—editorial hierarchy, technical microtype, Lab Matrix registration, restrained cool/warm atmosphere, compact horizontal shell, media-first composition, obvious ordinary controls and bounded meaningful motion—rather than introducing independent visual systems per screen.",
    "The completed design authority is the current locked Lab Grid identity + approved Lab Matrix Landing + Clear Composer/UI-074 + Gallery Rail/UI-075 + Media Register/Source Fold UI-076 + Job Matrix/History Register UI-077 + Trust Register/UI-078 + Admin System Continuity/UI-079, with UI-080 closing integrated cohesion. Future UI work must preserve that family—editorial hierarchy, technical microtype, Lab Matrix registration, restrained cool/warm atmosphere, compact horizontal shell, media-first composition, obvious ordinary controls and bounded meaningful motion—unless a new explicit decision reopens a named surface.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] **Phase 29 whole-product cohesion pass — CONTRACT DEFINED / IMPLEMENTATION NOT STARTED / NOT DEPLOYED.** Tracker #235 plus `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` / UI-080 govern the final Integration-Mode audit across the already approved Landing, shell, Create, Library, Viewer, Activity, Settings and Admin surfaces. Only evidence-backed cohesion corrections are authorized; no surface redesign, capability/backend expansion or deployment is implied.",
    "- [x] **Phase 29 whole-product cohesion pass — COMPLETE / EXACT-HEAD VERIFIED / HUMAN-REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED.** Tracker #235 plus `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` / UI-080 governed a verification-first Integration-Mode audit. The candidate 390px Create/header overlap did not reproduce; no production UI pixels changed. PR #237 added durable cross-route clearance/overflow/reduced-motion regression coverage and merged as `1c33fccf7de5b919b6a9f15916c66b92334da84a`.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "UI-074 already establishes the shared application-shell geometry; shell changes during later slices should be cohesion corrections only unless a separate explicit redesign decision reopens that system. None of this roadmap authorizes backend/schema/security/product-contract changes or production deployment.",
    "UI-074 remains the shared application-shell geometry and UI-080 now guards its route-content boundary with deterministic cross-route regression coverage. Future shell or surface changes require ordinary integration evidence or an explicit redesign decision; Phase 29 authorized no backend/schema/security/product-contract change or production deployment.",
)
phase27_evidence = "**Phase 27 closure evidence:** final PR #227 head `d48084fef1255ee672936f6da8905ba95bc678ea` passed Account Identity `34768896748`, Account/Admin Operations `34768896750`, Engineering Quality `34768896758`, UI Shell `34768896773`, Brand / Launch `34768896753`, and Integrated Release `34768896737`. Human review accepted the real desktop/390px Trust Register, signed-out form, Active/Suspended access presentation, ordinary password form and verified-recovery form from unchanged implementation code; final-head Account Identity artifact `10321540973` confirmed the configured flow again. PR #227 merged as `383def35fdf77566696a0c41f88349613029a37a`, and merged-main Engineering Quality `34769204247` plus UI Shell Validation `34769204150` passed."
phase29_evidence = phase27_evidence + "\n\n**Phase 29 closure evidence:** planning PR #236 merged the contract/UI-080 gate as `b4a76e279aea79bcd5779495064f635fb8bc8fbf`. Final implementation head `e1cf49db3cff9cd635775c07b9c8f9fe9e68660b` passed Engineering Quality `34788560805`, UI Shell Validation `34788560808`, and Brand / Launch Visual `34788560864`; shell artifact `10326429843` (`sha256:7df45aec014ed0a2203486645f2db11781c817bf28c3c18a7f5936c9d5c41982`) was human-reviewed across the new 390px cross-route and reduced-motion evidence. PR #237 changed only verification files and merged as `1c33fccf7de5b919b6a9f15916c66b92334da84a`. Merged-main Engineering Quality `34788682047` and UI Shell Validation `34788682060` passed; merged-main shell artifact `10326969432` has digest `sha256:8ad356af9fc5b1cd9a25b42f63d1a66c00829a2f343ecb753895ced2a29660a4`. The suspected Create/header collision did not reproduce under deterministic geometry, so no approved surface was reopened and no production UI code changed."
replace_once("docs/ui/UI_MIGRATION.md", phase27_evidence, phase29_evidence)


# UI_DECISIONS.md — record UI-080 implementation result.
replace_once(
    "docs/ui/UI_DECISIONS.md",
    "**Status:** Accepted / implementation contract defined / not implemented / not deployed",
    "**Status:** Accepted / implemented / exact-head verified / human-reviewed / merged / merged-main verified / not deployed",
)
ui080_gate = "**Implementation gate:** `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` and UI-080 must merge before Phase 29 production UI changes. Final acceptance requires exact-head affected workflows, cross-product desktop/390px evidence, reduced-motion verification for changed temporal paths, no horizontal overflow, human review against the currently approved surface authorities, merged-main verification and repository documentation closure. Production deployment remains separately explicit."
ui080_verification = ui080_gate + "\n\n**Implementation verification:** planning PR #236 merged this decision and the Phase 29 contract first as `b4a76e279aea79bcd5779495064f635fb8bc8fbf`. PR #237 then followed the verification-first rule: final exact head `e1cf49db3cff9cd635775c07b9c8f9fe9e68660b` changed only `tests/ui/shell.spec.ts` and `tests/unit/ui-cohesion.test.mjs`. Engineering Quality `34788560805`, UI Shell Validation `34788560808`, and Brand / Launch Visual `34788560864` all passed; shell artifact `10326429843` has digest `sha256:7df45aec014ed0a2203486645f2db11781c817bf28c3c18a7f5936c9d5c41982`. The new 390px browser geometry proved the suspected Create fixed-header collision did not reproduce, verified no horizontal overflow across Create/Library/Activity/Settings, and retained reduced-motion-equivalent Create geometry. Human review found no evidence-backed integrated visual defect that justified changing approved production pixels. PR #237 squash-merged as `1c33fccf7de5b919b6a9f15916c66b92334da84a`; merged-main Engineering Quality `34788682047` and UI Shell Validation `34788682060` both passed, with shell artifact `10326969432` (`sha256:8ad356af9fc5b1cd9a25b42f63d1a66c00829a2f343ecb753895ced2a29660a4`). No route, feature, account/Admin capability, API/schema/RLS/Auth/provider/worker/R2/storage or deployment contract changed."
replace_once("docs/ui/UI_DECISIONS.md", ui080_gate, ui080_verification)


# SCREEN_REGISTRY.md — record the integrated shell/screen audit without changing screen authority.
shell_evidence = "**Phase 23 / UI-074 fidelity correction — merged / verified:** PR #188 restored the approved compact horizontal application header across application routes and removed the persistent desktop rail / fixed mobile dock. User-approved implementation head `c786a17fa3a3c7f76dba5a64cb7822926749c1a2` and documentation-final head `b6a2590875432ba75c28db9e0f4b465133e1873c` passed their complete attached suites; PR #188 squash-merged as `3f0d21ed55554b3c48791d35dd17cb6005212076`. Merged-main UI Shell `34684825448` passed. Production remains unchanged until a separately authorized deployment."
shell_evidence_new = shell_evidence + "\n\n**Phase 29 / UI-080 whole-product cohesion closure — merged / verified:** final implementation head `e1cf49db3cff9cd635775c07b9c8f9fe9e68660b` added deterministic cross-route regression coverage for fixed-header clearance, 390px horizontal overflow and reduced-motion geometry without changing production UI code. UI Shell `34788560808`, Engineering Quality `34788560805` and Brand / Launch `34788560864` passed; browser evidence confirmed Create, Library, Activity and Settings clear the UI-074 fixed header and remain overflow-free at 390px. The suspected Create/header collision did not reproduce, so no feature-local or shared-shell pixel correction was justified. PR #237 merged as `1c33fccf7de5b919b6a9f15916c66b92334da84a`; merged-main UI Shell `34788682060` and Engineering Quality `34788682047` passed. Existing Landing/Create/Library/Viewer/Activity/Settings/Admin screen authorities and statuses therefore remain unchanged; Phase 29 closes integration quality rather than redefining any screen. Production deployment remains separate."
replace_once("docs/ui/SCREEN_REGISTRY.md", shell_evidence, shell_evidence_new)


# Contract status itself must match reality after closure.
replace_once(
    "docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md",
    "**Status:** Accepted execution boundary pending merge  ",
    "**Status:** Closed / implementation verified / merged / merged-main verified / not deployed  ",
)
closure_block = """## Closure evidence
Planning PR #236 merged this contract and UI-080 first as `b4a76e279aea79bcd5779495064f635fb8bc8fbf`.

PR #237 final exact head `e1cf49db3cff9cd635775c07b9c8f9fe9e68660b` changed only Phase 29 regression verification. Engineering Quality `34788560805`, UI Shell Validation `34788560808` and Brand / Launch Visual `34788560864` passed. UI Shell artifact `10326429843` (`sha256:7df45aec014ed0a2203486645f2db11781c817bf28c3c18a7f5936c9d5c41982`) supplied the final exact-head cross-route evidence.

The candidate 390px Create/header overlap did not reproduce under deterministic bounding geometry. Create, Library, Activity and Settings cleared the UI-074 fixed header and stayed free of horizontal overflow at 390px; the reduced-motion Create path remained geometrically equivalent. Human review found no evidence-backed current integration defect requiring a production UI correction, so the accepted per-surface designs remained untouched.

PR #237 squash-merged as `1c33fccf7de5b919b6a9f15916c66b92334da84a`. Merged-main Engineering Quality `34788682047` and UI Shell Validation `34788682060` passed; merged-main shell artifact `10326969432` has digest `sha256:8ad356af9fc5b1cd9a25b42f63d1a66c00829a2f343ecb753895ced2a29660a4`.

Phase 29 therefore closes the repository UI/UX redesign program without a production-pixel diff. No backend/security/infrastructure contract changed and no production deployment occurred.
"""
insert_before_once("docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md", "## Deployment boundary", closure_block)

print("Phase 29 closure docs patched successfully")
