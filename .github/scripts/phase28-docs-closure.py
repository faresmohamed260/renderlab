from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "PROJECT.md",
    "**Status: ACTIVE — Landing, Create, Library, Media Viewer, Activity and Settings completed; Admin and final cohesion remain.**",
    "**Status: ACTIVE — Landing, Create, Library, Media Viewer, Activity, Settings and Admin completed; final cohesion remains.**",
)
replace_once(
    "PROJECT.md",
    "Phase 26 closes the approved Activity Job Matrix + History Register slice; it does **not** close the broader RenderLab UI/UX redesign program.",
    "Phase 28 closes the approved Admin System Continuity slice; it does **not** close the broader RenderLab UI/UX redesign program.",
)
replace_once(
    "PROJECT.md",
    "- **Settings:** approved Trust Register / UI-078, merged and merged-main verified, not yet deployed.\n- **Application shell:**",
    "- **Settings:** approved Trust Register / UI-078, merged and merged-main verified, not yet deployed.\n- **Admin:** approved Admin System Continuity v0.2 / UI-079, exact-head and fidelity verified, merged and merged-main verified, not yet deployed.\n- **Application shell:**",
)
replace_once(
    "PROJECT.md",
    "4. **Phase 28 — Admin:** USER-APPROVED DESIGN / UI-079 CONTRACT DEFINED / IMPLEMENTATION NOT STARTED / NOT DEPLOYED. Admin System Continuity v0.2 uses Settings/UI-078 as the binding structural parent, preserves the existing privileged product/security contracts, and is authorized for implementation only after the Phase 28 contract/decision merge.",
    "4. **Phase 28 — Admin:** USER-APPROVED / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED. Admin System Continuity v0.2 is the repository-authoritative Admin composition under UI-079, using Settings/UI-078 as the binding structural parent while preserving the existing privileged product/security contracts.",
)
replace_once("PROJECT.md", "Phases 26 and 27 are closed.", "Phases 26, 27 and 28 are closed.")
replace_once(
    "PROJECT.md",
    "Phase 28 Admin is now the next redesign-planning slice, while Phase 29 remains roadmap-level.",
    "Phase 29 whole-product cohesion is now the next redesign-planning slice.",
)
project = Path("PROJECT.md")
project_text = project.read_text()
marker = "## Phase 28 Admin System Continuity implementation closure — 2026-09-14"
if marker in project_text:
    raise SystemExit("PROJECT.md: Phase 28 closure section already present")
project.write_text(project_text.rstrip() + "\n\n" + marker + "\n" + """
- UI-079 and `docs/ui/ADMIN_SYSTEM_CONTINUITY_IMPLEMENTATION_CONTRACT.md` merged before production source changes through PR #233 / `67b3adde88e84540e0769df67378da2cb01d3c9d`.
- PR #234 final implementation head `f6cd795621fbf7bd7b7cc5b96b3916318ff420d8` passed all six attached workflows: Engineering Quality `34782575335`, UI Shell Validation `34782575216`, Brand / Launch Visual `34782575431`, Integrated Release `34782575237`, Account/Admin Operations `34782575266`, and Release Candidate Matrix `34782575303`.
- Release Candidate Matrix passed 23/23 exact-SHA children and published manifest artifact `10324459955` (`sha256:4387f4ba2eeb30d88902280fa5f72029ca4566b8e6d468a8edd3e6c8f3b8f783`). Final configured Admin artifact `10325429374` (`sha256:c0be71ba4bf685002dfce9bd74d8cacd866fc1004c03c0326daf08d630c65ce2`) was human-reviewed faithful at 1440px, 390px and reduced-motion 390px against approved v0.2 and Settings/UI-078.
- PR #234 squash-merged as `f2eda00362ac2931192428bc18f96b62fd697c43`. Merged-main Engineering Quality `34783516541`, Integrated Release `34783516490`, UI Shell Validation `34783516479` attempt 2, and Release Candidate Matrix `34783516480` all passed. The merged-main matrix again passed its complete exact-SHA child set and published manifest artifact `10326650718` (`sha256:a8e23f5b2a1e311527fda584f180edf77357ef6e0f03811707a5ee76c3b3c1fe`).
- The implementation changes presentation only: one Settings-derived Admin register with `01 Access`, `02 Generation`, `03 Health`. Existing fresh-admin authorization, RenderLab-only account scope, invitation/role/status protections, generation controls/admission semantics, bounded Health/privacy rules, APIs/schema/RLS/Auth/provider/worker/R2/storage and deployment state remain unchanged.
- Production remains unchanged at source `0173c4c5ba08360b6352331118abc81978cfa774` / READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`; automatic Git → Vercel deployment remains disabled and no Phase 28 deployment is authorized.
""".lstrip())

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] **Phase 28 Admin redesign — USER-APPROVED DESIGN / UI-079 CONTRACT DEFINED / IMPLEMENTATION NOT STARTED / NOT DEPLOYED.** Binding R&D authority is draft PR #232 head `419a58c8c7877bab21673342775eb0650108412e`, run `34777699455`, artifact `10323843563` (`sha256:1ada86fbb81b19ee0da11dbadbc5bab1aa15f31b56652f64aabd8eac6001940b`). Settings/UI-078 is the structural parent; rejected PR #231 remains closed unmerged. `docs/ui/ADMIN_SYSTEM_CONTINUITY_IMPLEMENTATION_CONTRACT.md` and UI-079 must merge before production Admin source changes.",
    "- [x] **Phase 28 Admin redesign — COMPLETE / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED.** Approved v0.2 authority remains R&D PR #232 head `419a58c8c7877bab21673342775eb0650108412e`, run `34777699455`, artifact `10323843563` (`sha256:1ada86fbb81b19ee0da11dbadbc5bab1aa15f31b56652f64aabd8eac6001940b`). UI-079 plus `docs/ui/ADMIN_SYSTEM_CONTINUITY_IMPLEMENTATION_CONTRACT.md` merged first through PR #233 / `67b3adde88e84540e0769df67378da2cb01d3c9d`; PR #234 then implemented the Settings/UI-078-derived Admin register and merged as `f2eda00362ac2931192428bc18f96b62fd697c43`. Rejected PR #231 remains closed unmerged.",
)
migration = Path("docs/ui/UI_MIGRATION.md")
migration_text = migration.read_text()
if "**Phase 28 closure evidence:**" in migration_text:
    raise SystemExit("UI_MIGRATION.md: Phase 28 closure evidence already present")
migration.write_text(migration_text.rstrip() + """

**Phase 28 closure evidence:** final implementation head `f6cd795621fbf7bd7b7cc5b96b3916318ff420d8` passed all six attached workflows, including Account/Admin Operations `34782575266` and Release Candidate Matrix `34782575303` with 23/23 exact-SHA children. Manifest artifact `10324459955` has digest `sha256:4387f4ba2eeb30d88902280fa5f72029ca4566b8e6d468a8edd3e6c8f3b8f783`; configured Admin artifact `10325429374` has digest `sha256:c0be71ba4bf685002dfce9bd74d8cacd866fc1004c03c0326daf08d630c65ce2` and was human-reviewed faithful at desktop, 390px and reduced motion. PR #234 merged as `f2eda00362ac2931192428bc18f96b62fd697c43`; merged-main Engineering Quality `34783516541`, Integrated Release `34783516490`, UI Shell Validation `34783516479` attempt 2, and Release Candidate Matrix `34783516480` all passed. The merged-main matrix again passed its full child set and published manifest artifact `10326650718` (`sha256:a8e23f5b2a1e311527fda584f180edf77357ef6e0f03811707a5ee76c3b3c1fe`). Production remains unchanged and deployment remains separately explicit.
""")

replace_once(
    "docs/ui/UI_DECISIONS.md",
    "**Status:** Accepted / user-approved design / implementation contract defined / not implemented / not deployed",
    "**Status:** Accepted / implemented / exact-head verified / fidelity reviewed / merged / merged-main verified / not deployed",
)
decisions = Path("docs/ui/UI_DECISIONS.md")
decisions_text = decisions.read_text()
if "PR #234 final implementation head" in decisions_text:
    raise SystemExit("UI_DECISIONS.md: UI-079 implementation evidence already present")
if "### UI-079 — Admin reuses the Settings Trust Register skeleton for system continuity" not in decisions_text:
    raise SystemExit("UI_DECISIONS.md: UI-079 anchor missing")
decisions.write_text(decisions_text.rstrip() + "\n\n" + """
**Implementation verification:** PR #233 merged UI-079 and the Phase 28 contract first as `67b3adde88e84540e0769df67378da2cb01d3c9d`. PR #234 final implementation head `f6cd795621fbf7bd7b7cc5b96b3916318ff420d8` passed all six attached workflows: Engineering Quality `34782575335`, UI Shell Validation `34782575216`, Brand / Launch Visual `34782575431`, Integrated Release `34782575237`, Account/Admin Operations `34782575266`, and Release Candidate Matrix `34782575303`. The matrix passed 23/23 exact-SHA children; manifest artifact `10324459955` has digest `sha256:4387f4ba2eeb30d88902280fa5f72029ca4566b8e6d468a8edd3e6c8f3b8f783`. Configured Admin artifact `10325429374` (`sha256:c0be71ba4bf685002dfce9bd74d8cacd866fc1004c03c0326daf08d630c65ce2`) was human-reviewed faithful against approved v0.2 and Settings/UI-078 at 1440px, 390px and reduced-motion 390px. PR #234 squash-merged as `f2eda00362ac2931192428bc18f96b62fd697c43`; merged-main Engineering Quality `34783516541`, Integrated Release `34783516490`, UI Shell Validation `34783516479` attempt 2, and Release Candidate Matrix `34783516480` all passed. The merged-main matrix again passed the complete exact-SHA child set and published manifest artifact `10326650718` (`sha256:a8e23f5b2a1e311527fda584f180edf77357ef6e0f03811707a5ee76c3b3c1fe`). No Admin server/API/schema/RLS/Auth/provider/worker/R2/storage or deployment contract changed; production remains unchanged.
""".lstrip())

replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Status:** APPROVED / VERIFIED — Phase 10B + 10C / UI-051",
    "**Status:** APPROVED — UI-079 Admin System Continuity implemented / exact-head verified / fidelity reviewed / merged / merged-main verified / not deployed",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Implementation:** `src/app/admin/page.tsx`, `src/features/admin/admin-operations.tsx`, `src/server/admin/*`, `src/app/api/admin/**`",
    "**Implementation:** `src/app/(app)/admin/page.tsx`, `src/features/admin/admin-operations.tsx`, `src/features/admin/admin-operations.module.css`, `src/server/admin/*`, `src/app/api/admin/**`",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "**Purpose:** Operate the controlled RenderLab beta without exposing provider infrastructure or the shared Supabase Auth namespace.\n\n**Verified v0.1 composition:**",
    "**Purpose:** Operate the controlled RenderLab beta without exposing provider infrastructure or the shared Supabase Auth namespace.\n\n**Phase 28 / UI-079 closure:** Admin now uses the approved Settings/UI-078 structural parent: the UI-074 horizontal shell plus one continuous registered surface with exactly `01 Access`, `02 Generation`, `03 Health`. Access keeps invitations, pending invitations and admitted-account controls; Generation keeps global defaults visually parent to nullable account overrides; Health keeps the existing four primary values plus six bounded diagnostic groups without becoming a generic KPI dashboard. Final PR head `f6cd795621fbf7bd7b7cc5b96b3916318ff420d8` passed all six attached workflows and configured artifact `10325429374` (`sha256:c0be71ba4bf685002dfce9bd74d8cacd866fc1004c03c0326daf08d630c65ce2`) was human-reviewed faithful at 1440px, 390px and reduced motion. PR #234 merged as `f2eda00362ac2931192428bc18f96b62fd697c43`; merged-main Engineering Quality `34783516541`, Integrated Release `34783516490`, UI Shell Validation `34783516479` attempt 2, and Release Candidate Matrix `34783516480` passed, with the matrix again completing its full exact-SHA child set. Production remains unchanged pending separate authorization.\n\n**Verified v0.1 behavior retained:**",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "- desktop uses dense maintained-primitive rows/cards; narrow layout stacks records/actions without horizontal clipping.",
    "- desktop uses one Settings-derived registered surface with dense maintained-primitive controls inside its value cells; narrow layout collapses each numbered label into the Settings-style band above content without hiding controls or causing horizontal clipping.",
)

print("Phase 28 authoritative documentation patched successfully.")
