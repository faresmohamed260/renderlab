from pathlib import Path


def append_once(path: str, marker: str, block: str) -> None:
    p = Path(path)
    text = p.read_text()
    if marker in text:
        return
    p.write_text(text.rstrip() + "\n\n" + block.strip() + "\n")


append_once(
    "PROJECT.md",
    "## Phase 20 implementation checkpoint — 2026-09-07",
    r'''
## Phase 20 implementation checkpoint — 2026-09-07
**Status: `IMPLEMENTED IN DRAFT / EXACT-HEAD ACCEPTANCE IN PROGRESS`.**
**Draft PR:** #122 — `Implement Phase 20 Create as a Creative Instrument`
**Base:** `main` `33b44663a6305ddb97122c92a5583658d69dd406`
**Current exact implementation/test head at checkpoint:** `b449cc0fbc4d87758e099b1d1d4afcd4d53595bd`

Verified implementation reality at this checkpoint:
- `/create` is recomposed as a Kinetic Precision instrument surface with layered translucent depth, spectral focus response and a stronger prompt stage while preserving the existing Create route and generation contract.
- Image/Video intent uses a shared-layout spring highlight and bounded contextual presence motion; the established 390px one-row essential-control contract remains authoritative.
- Attached references use elevated media-module styling while preserving stable aliases, roles, ownership and continuation semantics.
- `CreateAdvancedPanel` now renders as an integrated precision deck rather than an appended generic settings card; field visibility/validation and the dedicated Advanced control remain unchanged.
- Generate is a luminous tactile actuator whose active presentation is driven only by real `submitting` / nonterminal job state. The lifecycle strip exposes only real RenderLab job categories and does not invent percentage progress, ETA or provider stages.
- Loading/result surfaces use the same dimensional language and existing durable result/continuation contracts.
- Reduced-motion equivalents remove transform/scan choreography without removing hierarchy or meaning.
- No GSAP, Lenis or other new runtime dependency was added: the current Motion + CSS + RenderLab primitive stack proved sufficient for this slice.
- No generation capability, model routing, worker/provider, schema, Supabase, R2, account/admission or deployment boundary changed.

Validation/evidence so far:
- A real 4px narrow Video control-row overflow introduced by the richer instrument padding was found through the configured Create lifecycle and corrected without shrinking the established controls.
- The first active-generation verifier failure was classified as a stale test locator: the product correctly changes the actuator label from `Generate` to `Generating`, so the verifier now targets the stable `.kinetic-generate` product marker and separately asserts `data-active=true` plus visible `Generating` state.
- Connector-authored tree-identical head `b449cc0fbc4d87758e099b1d1d4afcd4d53595bd` exists specifically so the real PR workflow matrix runs after GitHub Actions-authored helper commits were suppressed as `action_required`.
- Final exact-head acceptance still requires terminal success for all attached workflows plus human review of desktop/390px empty Image/Video, reference, Advanced, active-generation, result and reduced-motion artifacts. Do not merge or mark Phase 20 complete before that evidence exists.

Production remains unchanged. Automatic Git → Vercel deployment is disabled; Phase 20 implementation/merge does not authorize deployment.
''',
)

append_once(
    "docs/ui/UI_DECISIONS.md",
    "#### UI-063 implementation checkpoint — 2026-09-07",
    r'''
#### UI-063 implementation checkpoint — 2026-09-07
UI-063 is actively implemented on draft PR #122 from merged planning baseline `33b44663a6305ddb97122c92a5583658d69dd406`. Current exact implementation/test head at this checkpoint is `b449cc0fbc4d87758e099b1d1d4afcd4d53595bd`.

The implemented candidate uses the existing Motion + CSS + RenderLab primitive stack; no GSAP, Lenis or additional animation runtime was needed. The Create composer is now a dimensional Kinetic Precision instrument, Image/Video uses a shared-layout spring treatment, references are elevated media modules, Advanced is an integrated precision deck, Generate remains visibly energized for truthful active job state, lifecycle feedback uses real RenderLab states only, and result/loading surfaces share the same visual language. Reduced-motion behavior removes transform/continuous scan effects while preserving hierarchy.

Configured validation found and corrected one real 390px Video overflow regression. A later Create lifecycle failure was test-only: the verifier retained an exact `Generate` locator after the product truthfully changed the label to `Generating`; the stable product-marker assertion now verifies both active state and visible label. Final acceptance is still pending the complete exact-head workflow matrix and human review required by UI-063. This checkpoint does not mark UI-063 complete, authorize deployment, or change any generation/backend contract.
''',
)

p = Path("docs/ui/UI_MIGRATION.md")
text = p.read_text()
old = '''## Phase 20 acceptance tracker\n**Status: `READY FOR IMPLEMENTATION`.** UI-063 is the controlling visual/product decision.\n\n- [ ] Recompose the Create composer as a distinctive Kinetic Precision instrument surface without changing generation semantics.\n- [ ] Add shared-layout morphing Image/Video selection while preserving one-row 390px control density.\n- [ ] Elevate reference previews/slots with truthful alias/role hierarchy and reduced-motion-safe insertion/removal/reorder feedback.\n- [ ] Recompose Advanced as a coherent precision deck using the same validated field state and dedicated control in both modes.\n- [ ] Upgrade Generate into a tactile actuator with visual states derived only from truthful product lifecycle/admission state.\n- [ ] Upgrade result arrival/presentation without changing durable media or continuation contracts.\n- [ ] Keep reduced motion, keyboard/touch parity, focus visibility and no-horizontal-overflow behavior complete.\n- [ ] Pass exact-head purity/quality/build plus affected Create/model/reference/generation/integrated regressions.\n- [ ] Human-review desktop and 390px empty/mode/reference/Advanced/active/result states and reject visually timid or noisy candidates.\n- [ ] Record only actually adopted third-party mechanics/dependencies and update authoritative docs from verified implementation reality.\n\nProduction deployment remains explicit and separate.'''
new = '''## Phase 20 acceptance tracker\n**Status: `IMPLEMENTED IN DRAFT / EXACT-HEAD ACCEPTANCE IN PROGRESS`.** UI-063 is the controlling visual/product decision. Draft PR #122; checkpoint exact head `b449cc0fbc4d87758e099b1d1d4afcd4d53595bd`.\n\n- [x] Recompose the Create composer as a distinctive Kinetic Precision instrument surface without changing generation semantics.\n- [x] Add shared-layout morphing Image/Video selection while preserving one-row 390px control density.\n- [x] Elevate reference previews/slots with truthful alias/role hierarchy and reduced-motion-safe insertion/removal/reorder feedback.\n- [x] Recompose Advanced as a coherent precision deck using the same validated field state and dedicated control in both modes.\n- [x] Upgrade Generate into a tactile actuator with visual states derived only from truthful product lifecycle/admission state.\n- [x] Upgrade result arrival/presentation without changing durable media or continuation contracts.\n- [x] Keep reduced motion, keyboard/touch parity, focus visibility and no-horizontal-overflow behavior complete in implementation; configured lifecycle caught and corrected a 4px narrow Video overflow regression.\n- [ ] Pass the final exact-head purity/quality/build plus every attached Create/model/reference/generation/integrated regression. The connector-authored tree-identical checkpoint head exists so suppressed Actions-authored commits receive a real matrix.\n- [ ] Human-review final desktop and 390px empty/mode/reference/Advanced/active/result/reduced-motion artifacts on the final exact head.\n- [x] No optional third-party runtime was adopted; existing Motion + CSS + RenderLab primitives were sufficient. Authoritative in-progress implementation evidence is recorded, but final completion evidence remains pending.\n\nVerifier note: the active-generation lifecycle now asserts the stable `.kinetic-generate` product marker, `data-active=true` and visible `Generating` label; the earlier exact `Generate` locator failure was a stale test assumption, not a product-state failure.\n\nProduction deployment remains explicit and separate. Do not mark Phase 20 complete or merge PR #122 until the final exact-head matrix and rendered review pass.'''
if old not in text:
    raise SystemExit("UI_MIGRATION Phase 20 tracker target not found")
p.write_text(text.replace(old, new, 1))
