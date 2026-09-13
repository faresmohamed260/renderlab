from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "PROJECT.md",
    "5. **Phase 29 — whole-product cohesion pass:** roadmap only. Audit the completed system end-to-end for shell/navigation continuity, typography, spacing, responsive behavior, empty/loading/error states, focus/touch semantics, reduced motion and cross-surface transitions before calling the redesign program complete.",
    "5. **Phase 29 — whole-product cohesion pass:** CONTRACT DEFINED / IMPLEMENTATION NOT STARTED / NOT DEPLOYED. `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` and UI-080 govern the final integration/QA pass over the already approved surfaces; this is not another redesign or capability phase.",
)
replace_once(
    "PROJECT.md",
    "Phase 29 whole-product cohesion is now the next redesign-planning slice.",
    "Phase 29 whole-product cohesion is now contract-defined; production implementation begins only after the Phase 29 planning gate merges.",
)

project = Path("PROJECT.md")
project_text = project.read_text()
marker = "## Phase 29 whole-product cohesion planning gate — 2026-09-14"
if marker in project_text:
    raise SystemExit("PROJECT.md: Phase 29 planning section already exists")
project.write_text(project_text.rstrip() + "\n\n" + marker + "\n" + """
- Tracker #235 owns the final cohesion phase from clean baseline `fcab275189089106ee7186e9ddd0b935aa5aeade`.
- `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` defines an Integration-Mode audit/correction pass that preserves UI-074 through UI-079, the approved Landing and locked RenderLabBrand rather than reopening their designs.
- In scope is evidence-backed shell/content clearance, typography/spacing drift, responsive overflow/clipping, empty/loading/error presentation, focus/touch reachability, reduced-motion equivalence and cross-surface continuity. New capabilities, routes, account/Admin work, backend/infrastructure changes, new UI runtimes and deployment remain out of scope.
- Same-product-tree Phase 28 Release Candidate Matrix evidence provides the initial integrated visual baseline. A possible 390px Create fixed-header/content-clearance issue is explicitly a candidate to reproduce geometrically before any correction.
- Production deployment remains separate and explicit.
""".lstrip())

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] **Phase 29 whole-product cohesion pass — ROADMAP ONLY.** Final cross-surface audit before the redesign program may be called complete.",
    "- [ ] **Phase 29 whole-product cohesion pass — CONTRACT DEFINED / IMPLEMENTATION NOT STARTED / NOT DEPLOYED.** Tracker #235 plus `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` / UI-080 govern the final Integration-Mode audit across the already approved Landing, shell, Create, Library, Viewer, Activity, Settings and Admin surfaces. Only evidence-backed cohesion corrections are authorized; no surface redesign, capability/backend expansion or deployment is implied.",
)

migration = Path("docs/ui/UI_MIGRATION.md")
migration_text = migration.read_text()
if "**Phase 29 planning evidence:**" in migration_text:
    raise SystemExit("UI_MIGRATION.md: Phase 29 planning evidence already exists")
migration.write_text(migration_text.rstrip() + "\n\n" + """
**Phase 29 planning evidence:** clean starting baseline is `fcab275189089106ee7186e9ddd0b935aa5aeade`; tracker #235 and `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` define the contract-first final cohesion pass. Binding visual authorities remain UI-074 through UI-079, the approved Lab Matrix Landing and locked RenderLabBrand. The merged Phase 28 product tree already has a 23/23 exact-SHA Release Candidate Matrix baseline, and Phase 29 will use those real browser artifacts to identify only current integrated-app inconsistencies. Production implementation must wait for this planning gate to merge; production deployment remains separately explicit.
""".lstrip())

decisions = Path("docs/ui/UI_DECISIONS.md")
decisions_text = decisions.read_text()
if "### UI-080 — Whole-product cohesion repairs integration drift without reopening approved surfaces" in decisions_text:
    raise SystemExit("UI_DECISIONS.md: UI-080 already exists")
decisions.write_text(decisions_text.rstrip() + "\n\n" + """
### UI-080 — Whole-product cohesion repairs integration drift without reopening approved surfaces
**Status:** Accepted / implementation contract defined / not implemented / not deployed  
**Date:** 2026-09-14

**Decision:** Phase 29 is the final Integration-Mode cohesion pass for the current UI/UX redesign program. It preserves the approved Lab Matrix Landing, UI-074 shell, UI-075 Library, UI-076 Viewer, UI-077 Activity, UI-078 Settings and UI-079 Admin compositions while auditing their integrated behavior for shell/content clearance, accidental typography/spacing drift, responsive overflow/clipping, feedback-state attachment, focus/touch reachability, reduced-motion equivalence and cross-surface continuity. Only defects demonstrated by the current implementation or deterministic browser evidence may change production UI.

**Reason:** The major surfaces were intentionally designed and verified in separate phases with different expressiveness levels. The final product needs an end-to-end integration gate, but making every surface visually identical—or using a cleanup phase to redesign accepted work—would destroy those deliberate distinctions and repeat prior drift. Cohesion therefore means shared boundaries and interaction quality, not visual homogenization.

**Consequences:** Existing surface authorities remain binding. Fix the smallest true owner of a demonstrated problem: shared shell/primitive when the defect is shared; feature-local layout when it is not. Keep the current UI-074 header geometry unless evidence shows the shell itself is wrong. Preserve maintained primitive semantics and substantive product/security assertions. Do not add routes, features, account/Admin capability, backend/schema/Auth/provider/storage changes, new animation runtimes or deployment under Phase 29.

**Initial audit rule:** same-product-tree Phase 28 browser evidence is the starting point. The apparent 390px Create title/header collision is treated only as a candidate defect until deterministic geometry reproduces it; if reproduced, correct the owning content boundary and add regression coverage rather than changing the approved shell height by assumption.

**Implementation gate:** `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` and UI-080 must merge before Phase 29 production UI changes. Final acceptance requires exact-head affected workflows, cross-product desktop/390px evidence, reduced-motion verification for changed temporal paths, no horizontal overflow, human review against the currently approved surface authorities, merged-main verification and repository documentation closure. Production deployment remains separately explicit.
""".lstrip())

print("Phase 29 planning docs patched successfully")
