from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    if old not in text:
        raise SystemExit(f"{path}: expected text not found: {old[:80]!r}")
    file_path.write_text(text.replace(old, new, 1))


replace_once(
    "PROJECT.md",
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `ACTIVE / PHASE 19 CONTRACT READY`.**",
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `ACTIVE / PHASE 19 COMPLETE / PHASE 20 NEXT`.**",
)
replace_once(
    "PROJECT.md",
    "# Phase 19 Execution Contract — Kinetic Foundation & App Shell\n**Status: `READY FOR IMPLEMENTATION`.**",
    "# Phase 19 Execution Contract — Kinetic Foundation & App Shell\n**Status: `COMPLETE / VERIFIED`.**",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `ACTIVE / PHASE 19 READY`.**",
    "# Cycle 4 — Kinetic Visual Experience\n**Status: `ACTIVE / PHASE 19 COMPLETE / PHASE 20 NEXT`.**",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- **Phase 19 — Kinetic Foundation & App Shell:** `READY FOR IMPLEMENTATION` — atmospheric canvas, dimensional/glass shell chrome, morphing active navigation, tactile feedback, top-level route continuity, reduced-motion/static equivalents.",
    "- **Phase 19 — Kinetic Foundation & App Shell:** `COMPLETE / VERIFIED` — atmospheric canvas, dimensional floating glass shell chrome, morphing active navigation, tactile feedback, fast top-level route continuity and reduced-motion/static equivalents.",
)

for old in [
    "- [ ] Extend semantic visual tokens/effect budget without weakening contrast/status semantics.",
    "- [ ] Add subtle atmospheric application canvas with reduced-motion static fallback.",
    "- [ ] Transform desktop shell chrome into dimensional translucent surfaces.",
    "- [ ] Add spring/shared-layout active navigation state and tactile hover/press response.",
    "- [ ] Transform the mobile bottom navigation into a compact floating dock with safe-area handling.",
    "- [ ] Add top-level route-content continuity that does not break prefetch/refresh/focus behavior.",
    "- [ ] Pass purity/lint/typecheck/unit/build and affected shell/Create/Library/Activity exact-head regressions.",
    "- [ ] Review desktop + 390px Create/Library/Activity renders for obvious visible improvement, no overflow and reduced-motion correctness.",
    "- [ ] Update component/screen/architecture records from verified implementation reality.",
]:
    replace_once("docs/ui/UI_MIGRATION.md", old, old.replace("[ ]", "[x]"))

replace_once(
    "docs/ui/UI_DECISIONS.md",
    "**Status:** Accepted / Phase 19 implementation authorized",
    "**Status:** Accepted / implemented / verified",
)

additions = {
    "PROJECT.md": """

## Phase 19 verified implementation evidence — 2026-09-07
- Exact implementation head `ea21d56e4ac643ec32d586759fc48c2ef165e44b` passed Engineering Quality `34094816665`, UI Shell Validation `34094816643`, Create Lifecycle Visual `34094816661`, Brand / Launch Visual `34094816547`, Account/Admin Operations `34094816585`, and Integrated Release `34094816569`.
- UI Shell artifact `10008197585` (`sha256:8d6dfdc25b14b2c276d3893e720a3e81260719555e47a3f34c4119611d042448`) contains reviewed 1440px Create / Library / Activity plus 390px Create and reduced-motion Library evidence.
- Review rejected the first visually conservative candidate and strengthened the final spectral atmosphere, luminous edge separation, floating desktop rail/topbar, shared-layout active state and mobile dock before closure.
- Top-level route entrance motion was tightened to 220ms with only 3px blur / 6px travel so visual continuity does not reintroduce the earlier perception of slow tab switching.
- The implementation preserves explicit full-route prefetch plus section refresh behavior, account/privacy semantics, feature routes and product contracts. No schema, R2, worker/provider, generation capability or deployment change occurred.
- Phase 20 may now be expanded from roadmap level into an execution contract. Production rollout remains explicit and separate.
""",
    "docs/ui/UI_MIGRATION.md": """

### Phase 19 verified closure — 2026-09-07
Exact implementation head `ea21d56e4ac643ec32d586759fc48c2ef165e44b` is visually and functionally verified. UI Shell `34094816643` produced artifact `10008197585` (`sha256:8d6dfdc25b14b2c276d3893e720a3e81260719555e47a3f34c4119611d042448`); 1440px Create / Library / Activity, 390px Create and reduced-motion Library evidence were reviewed after the initial candidate was deliberately strengthened. Engineering Quality, Create Lifecycle, Brand / Launch, Account/Admin and Integrated Release also passed on the same exact head. Phase 19 changes only shared frontend visual/motion composition; no production deployment is implied.
""",
    "docs/ui/UI_DECISIONS.md": """

**UI-062 verification:** Phase 19 implementation head `ea21d56e4ac643ec32d586759fc48c2ef165e44b` realizes the decision with floating translucent desktop rail/topbar, spectral atmospheric canvas, luminous edge treatment, shared-layout spring active navigation, tactile control response, floating mobile dock and 220ms top-level route continuity. UI Shell `34094816643` / artifact `10008197585` is the reviewed rendered evidence. Reduced motion removes continuous ambient movement and route transforms. No product/backend/deployment boundary changed.
""",
    "docs/ui/UI_SYSTEM.md": """

### Phase 19 implemented foundation
The Kinetic Precision foundation is now implemented at the application-shell layer. `globals.css` owns semantic spectral/glass/elevation tokens and a CSS-only low-frequency ambient canvas. `AppShell` owns floating dimensional desktop/mobile chrome, Motion shared-layout selection and tactile press/hover response, plus a deliberately short 220ms top-level route entrance. Continuous ambience uses CSS transforms/opacity; there is no permanent JavaScript animation loop. `prefers-reduced-motion` removes ambience animation and transform-dependent route movement while retaining the full static composition. This visual layer is the baseline for subsequent Cycle 4 feature work; feature content should extend it rather than create a competing atmosphere.
""",
    "docs/ui/COMPONENT_CATALOG.md": """

## Cycle 4 Phase 19 component update — AppShell
**Status:** APPROVED / KINETIC FOUNDATION VERIFIED
`AppShell` remains the authoritative application chrome and now owns the UI-062 Kinetic Precision shell layer: floating translucent desktop rail/topbar, luminous edge separation, shared-layout spring active navigation, tactile hover/press response, floating mobile dock and reduced-motion-aware fast route continuity. It still owns no feature data or product state. Exact implementation head `ea21d56e4ac643ec32d586759fc48c2ef165e44b`; rendered evidence UI Shell `34094816643` / artifact `10008197585`.
""",
    "docs/ui/SCREEN_REGISTRY.md": """

## Cycle 4 Phase 19 shared screen treatment
Create, Library/Viewer, Activity, Settings and Admin continue using their existing routes and feature ownership but now inherit the UI-062 Kinetic Precision `AppShell`: atmospheric spectral canvas, floating dimensional rail/topbar, morphing active navigation, tactile navigation response and floating mobile dock. Phase 19 does not claim feature-internal redesign; Create internal composition remains Phase 20, Library/Viewer internals Phase 21, and Activity/Settings internals Phase 22. Exact reviewed shell head `ea21d56e4ac643ec32d586759fc48c2ef165e44b`.
""",
    "docs/architecture/FRONTEND_ARCHITECTURE.md": """

### Cycle 4 Phase 19 kinetic shell boundary — implemented / verified
UI-062 extends the existing client `AppShell` without changing routing or server ownership. Global semantic CSS owns the static/glass/spectral visual system and CSS-only low-frequency ambience. `motion/react` remains the discrete interaction engine for shared-layout navigation springs, tactile pointer response and a 220ms top-level route entrance. Motion state is visual only; Next.js route prefetch/section refresh, Server Component data ownership, account authorization and feature state remain unchanged. Reduced motion removes ambient animation and transform-dependent entrance movement. No WebGL/canvas runtime, permanent pointer loop, new package, schema, API or deployment boundary was introduced. Exact head `ea21d56e4ac643ec32d586759fc48c2ef165e44b` passed UI Shell `34094816643`, Engineering Quality `34094816665`, Create Lifecycle `34094816661`, Brand / Launch `34094816547`, Account/Admin `34094816585` and Integrated Release `34094816569`.
""",
}

for filename, addition in additions.items():
    path = Path(filename)
    text = path.read_text()
    marker = addition.strip().splitlines()[0]
    if marker in text:
        raise SystemExit(f"{filename}: evidence section already present")
    path.write_text(text.rstrip() + "\n" + addition.rstrip() + "\n")
