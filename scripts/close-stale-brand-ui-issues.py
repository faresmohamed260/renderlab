from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


decisions = Path("docs/ui/UI_DECISIONS.md")
text = decisions.read_text()

old_status = "### UI-071 — Desktop application chrome is rail-only and Create drop copy aligns as one unit\n**Status:** Accepted / Implemented / Verified / Merged / Not production deployed"
new_status = "### UI-071 — Desktop application chrome is rail-only and Create drop copy aligns as one unit\n**Status:** Accepted / Implemented / Verified / Merged / Production Live"
text = replace_once(text, old_status, new_status, "UI-071 status")

old_boundary = "**Production boundary:** UI-071 is not production deployed. The recorded production source remains `378ea68b5c3087f84e83cc73682de2f919168c0a`; automatic Git deployment remains disabled and rollout requires separate explicit authorization."
new_boundary = "**Production boundary:** UI-071 first became production-live in exact source `a1f3cdcf095c9088fe3c2c0eebafaf52b5d609a7` at READY deployment `dpl_5U3URZkAjMqB3gZMS3pnXP7by2Ra`; guarded rollout run `34460364114` passed Landing plus `/create`, `/library`, `/activity` and `/settings` smoke without rollback. UI-071 remains included in the current accepted production application source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`, now served with the approved Lab Matrix Landing. Automatic Git → Vercel deployment remains disabled."
text = replace_once(text, old_boundary, new_boundary, "UI-071 production boundary")

if "### UI-072 — Current production Lab Grid identity is the binding brand authority" in text:
    raise SystemExit("UI-072 already exists")

ui072 = """

### UI-072 — Current production Lab Grid identity is the binding brand authority
**Status:** Accepted / Implemented / Verified / Production Live
**Date:** 2026-09-11

**Decision:** The current `RenderLabBrand` implementation and associated production mark/icon assets are the binding settled RenderLab logo/wordmark geometry and spacing. Earlier concept-board imagery, rejected vector experiments and descriptive R&D prose remain historical design evidence; they must not be used to reinterpret, re-vectorize or otherwise alter the accepted production logo when they conflict with the shipped implementation. Changing the settled logo requires the user to explicitly reopen the identity decision.

**Reason:** PR #157 productionized the Lab Grid identity and its exact implementation head passed every workflow GitHub attached. A later documentation interpretation treated older negative-space wording as evidence that the shipped logo needed correction, but the user explicitly confirmed on 2026-09-11 that the logo currently rendered on the production Landing is correct. PR #178 therefore made the accepted deployed implementation the production identity authority and superseded issue #161.

**Consequences:** Reuse `src/components/brand/renderlab-brand.tsx` and the associated current production mark/icon assets rather than reconstructing the logo from older R&D references. The brand system may evolve around this identity, but logo geometry/spacing is locked unless explicitly reopened. This decision changes no product behavior, route, Auth/backend/schema/infrastructure contract or deployment policy.

**Verification:** PR #157 exact head `160fa1c978e71ac25e3d1ab44cbfe658bc985148` passed Integrated Release `34496009188`, Create Lifecycle Visual `34496009231`, Engineering Quality `34496009196`, Brand / Launch Visual `34496009308` and UI Shell Validation `34496009205`. Brand / Launch produced artifact `10159844632` (`sha256:84d546973ceb3bab94d13957de15ff5d1d16bc204606b65d09ebf36b55c7d8af`). PR #157 merged as `b55ce6757ed6c1e2a00e5ca0b5c8a562a4ae7047`. The current accepted production source `0173c4c5ba08360b6352331118abc81978cfa774` serves this identity, and PR #178 merged the user's explicit production-authority clarification as `02b8e730f8a0891e39d1b6f1ca73e3b16f5fe4f9`.
"""
text = text.replace(new_boundary, new_boundary + ui072, 1)
decisions.write_text(text)

catalog = Path("docs/ui/COMPONENT_CATALOG.md")
text = catalog.read_text()
start = text.index("### RenderLabBrand\n")
end = text.index("\n### Collapsible\n", start)
new_block = """### RenderLabBrand
**Status:** LOCKED
**Source:** `src/components/brand/renderlab-brand.tsx`
**Origin:** RenderLab-owned Lab Grid production identity, productionized by PR #157 and locked to the accepted deployed implementation by UI-072 / PR #178
**Purpose:** Shared RenderLab identity for Landing, application shell, public metadata and small icon scales using the accepted Lab Grid mark plus continuous `Render` bold / `Lab` light wordmark.
**Used by:** public Brand / Landing and application `AppShell`; matching production assets include `public/renderlab-mark.svg`, `public/renderlab-mark-color.svg`, `public/renderlab-mark-black.svg`, `public/renderlab-mark-white.svg`, `src/app/icon.svg`, `src/app/opengraph-image.tsx`, and the repository design master `design/brand/lab-grid-r-production-master.svg`.
**Reuse rules:** Reuse the current component and associated production asset geometry. Marketing destination is `/`; application-shell destination is `/create`. Preserve accessible labeling, current wordmark hierarchy and the shipped mark geometry/spacing. Treat older concept-board prose and rejected vector experiments as historical context only where they do not conflict with the accepted production implementation.
**Do not:** Re-vectorize or “correct” the current mark from older R&D references, introduce competing RenderLab logos, alter settled geometry/spacing without explicit user authorization, or couple branding to provider/model/runtime claims.
**Notes:** PR #157 exact head `160fa1c978e71ac25e3d1ab44cbfe658bc985148` passed all five attached workflows: Integrated Release `34496009188`, Create Lifecycle Visual `34496009231`, Engineering Quality `34496009196`, Brand / Launch Visual `34496009308`, and UI Shell Validation `34496009205`. Brand / Launch artifact `10159844632` has digest `sha256:84d546973ceb3bab94d13957de15ff5d1d16bc204606b65d09ebf36b55c7d8af`; PR #157 merged as `b55ce6757ed6c1e2a00e5ca0b5c8a562a4ae7047`. The user explicitly confirmed the current production Landing logo is correct on 2026-09-11; PR #178 merged that authority clarification as `02b8e730f8a0891e39d1b6f1ca73e3b16f5fe4f9`, superseding issue #161 and any conflicting older negative-space interpretation.
"""
text = text[:start] + new_block + text[end:]
catalog.write_text(text)
