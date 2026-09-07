from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one target, found {count}")
    p.write_text(text.replace(old, new, 1))

# PROJECT.md: current cycle/phase status + bounded implementation checkpoint.
replace_once(
    "PROJECT.md",
    '**Status: `ACTIVE / PHASE 20 CONTRACT READY`.**',
    '**Status: `ACTIVE / PHASE 20 IMPLEMENTED + VISUALLY VERIFIED / MERGE BLOCKED BY REDGRAFT OUTAGE`.**',
)
replace_once(
    "PROJECT.md",
    '# Phase 20 Execution Contract — Create as a Creative Instrument\n**Status: `READY FOR IMPLEMENTATION`.**',
    '# Phase 20 Execution Contract — Create as a Creative Instrument\n**Status: `IMPLEMENTED + VISUALLY VERIFIED / MERGE BLOCKED BY REDGRAFT OUTAGE`.**',
)
project = Path("PROJECT.md")
text = project.read_text()
checkpoint = '''\n\n## Phase 20 implementation checkpoint — 2026-09-07\n- Draft PR #122 implements the accepted UI-063 visual scope only. Current product head `d9fd8104e81675a580731ac80d43d0b3af5a880e` changes Create composition/motion plus its lifecycle verifier; it adds no schema, generation capability, worker/provider routing, R2, account/admission or deployment change.\n- Create is now a layered Kinetic Precision instrument: dimensional composer, spring-connected Image/Video intent, elevated reference modules, precision-deck Advanced, tactile luminous Generate actuator, truthful lifecycle-energy treatment, spatial result presentation and complete reduced-motion equivalents. Existing Motion + CSS proved sufficient; no GSAP, Lenis, WebGL or additional animation runtime was adopted.\n- Exact-head Create Lifecycle `34117072016` passed and produced artifact `10016735569` (`sha256:f59ec5f306d45dd6314081cfca6bb4972235e6759aca3638a03f324c908ecf15`). Human review accepted desktop/390px Image/Video, Advanced, active-generation, result and reduced-motion states. A prior artifact exposed real desktop Video compositor clipping; final head removes the problematic pop-layout/horizontal FLIP swap while retaining the shared spring mode indicator, and the corrected artifact has no left-edge clipping or mobile horizontal overflow.\n- Ten of eleven attached exact-head gates pass: Engineering Quality `34117071897`, Create Lifecycle `34117072016`, UI Shell `34117071960`, Integrated Release `34117071953`, Create Durable Upload `34117071942`, Library Lifecycle `34117071889`, Account Ownership `34117071930`, Creative Iteration `34117071913`, Generation Admission `34117071952`, and Brand / Launch `34117071881`.\n- Required Video Generation Integration `34117071950` remains red only at the live-provider leg. Its 1,320-case Video product contract and production build pass, but repeated live submission returns `generation_submission_failed: No configured generation worker is currently available.` Read-only audit `34117911334` then proved both registered REDGraft Modal workspaces return HTTP 404 with `workspace ... is disabled`, including the standby currently marked active in repository routing metadata. Infrastructure drift is recorded on `main` by PR #123 / `980e92e913778599000555c3452490f94f7f8dbb`.\n- Phase 20 therefore remains unmerged and is not `COMPLETE / VERIFIED`. Do not waive the required live Video gate or repeatedly retry it while both registered workspaces are disabled. Resume final acceptance only after a healthy already-approved REDGraft registration is verified or worker recovery/redeployment is separately authorized and completed.\n- No production deployment occurred.\n'''
if "## Phase 20 implementation checkpoint — 2026-09-07" not in text:
    project.write_text(text.rstrip() + checkpoint + "\n")
else:
    raise SystemExit("PROJECT.md: Phase 20 checkpoint already present")

# UI_MIGRATION: show completed visual work but keep exact-head closure open.
replace_once(
    "docs/ui/UI_MIGRATION.md",
    '**Status: `ACTIVE / PHASE 20 CONTRACT READY`.**',
    '**Status: `ACTIVE / PHASE 20 IMPLEMENTED + VISUALLY VERIFIED / MERGE BLOCKED BY REDGRAFT OUTAGE`.**',
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    '## Phase 20 acceptance tracker\n**Status: `READY FOR IMPLEMENTATION`.** UI-063 is the controlling visual/product decision.',
    '## Phase 20 acceptance tracker\n**Status: `IMPLEMENTED + VISUALLY VERIFIED / MERGE BLOCKED BY REDGRAFT OUTAGE`.** UI-063 is the controlling visual/product decision.',
)
for old, new in [
    ('- [ ] Recompose the Create composer as a distinctive Kinetic Precision instrument surface without changing generation semantics.', '- [x] Recompose the Create composer as a distinctive Kinetic Precision instrument surface without changing generation semantics.'),
    ('- [ ] Add shared-layout morphing Image/Video selection while preserving one-row 390px control density.', '- [x] Add shared-layout morphing Image/Video selection while preserving one-row 390px control density.'),
    ('- [ ] Elevate reference previews/slots with truthful alias/role hierarchy and reduced-motion-safe insertion/removal/reorder feedback.', '- [x] Elevate reference previews/slots with truthful alias/role hierarchy and reduced-motion-safe insertion/removal/reorder feedback.'),
    ('- [ ] Recompose Advanced as a coherent precision deck using the same validated field state and dedicated control in both modes.', '- [x] Recompose Advanced as a coherent precision deck using the same validated field state and dedicated control in both modes.'),
    ('- [ ] Upgrade Generate into a tactile actuator with visual states derived only from truthful product lifecycle/admission state.', '- [x] Upgrade Generate into a tactile actuator with visual states derived only from truthful product lifecycle/admission state.'),
    ('- [ ] Upgrade result arrival/presentation without changing durable media or continuation contracts.', '- [x] Upgrade result arrival/presentation without changing durable media or continuation contracts.'),
    ('- [ ] Keep reduced motion, keyboard/touch parity, focus visibility and no-horizontal-overflow behavior complete.', '- [x] Keep reduced motion, keyboard/touch parity, focus visibility and no-horizontal-overflow behavior complete.'),
    ('- [ ] Human-review desktop and 390px empty/mode/reference/Advanced/active/result states and reject visually timid or noisy candidates.', '- [x] Human-review desktop and 390px empty/mode/reference/Advanced/active/result states and reject visually timid or noisy candidates.'),
    ('- [ ] Record only actually adopted third-party mechanics/dependencies and update authoritative docs from verified implementation reality.', '- [x] Record only actually adopted third-party mechanics/dependencies and update authoritative docs from verified implementation reality.'),
]:
    replace_once("docs/ui/UI_MIGRATION.md", old, new)

migration = Path("docs/ui/UI_MIGRATION.md")
text = migration.read_text()
marker = 'Production deployment remains explicit and separate.\n'
addition = '''\n### Phase 20 verified implementation checkpoint — 2026-09-07\n- [x] Product/visual head `d9fd8104e81675a580731ac80d43d0b3af5a880e` is visually accepted after correcting a real desktop Video compositor clipping defect found through artifact review.\n- [x] Create Lifecycle `34117072016` / artifact `10016735569` (`sha256:f59ec5f306d45dd6314081cfca6bb4972235e6759aca3638a03f324c908ecf15`) passes desktop/390px Image/Video, Advanced, active-generation, result and reduced-motion coverage with no final clipping/overflow.\n- [x] 10/11 exact-head gates pass; required Video Generation Integration remains blocked only by live REDGraft availability after its pure 1,320-case contract/build passed.\n- [x] Read-only audit `34117911334` proves both registered REDGraft Modal workspaces are disabled; PR #123 / `980e92e913778599000555c3452490f94f7f8dbb` records the infrastructure drift on `main`.\n- [ ] Re-run and pass the required exact-head Video Generation Integration after healthy REDGraft infrastructure is separately restored/verified.\n- [ ] Mark PR #122 ready, merge with expected-head protection and close Phase 20 only after the complete required exact-head matrix is green.\n\n'''
# Insert after the Phase 20 tracker's deployment boundary: use last occurrence to avoid earlier sections.
pos = text.rfind(marker)
if pos == -1:
    raise SystemExit("UI_MIGRATION.md: deployment marker not found")
if "### Phase 20 verified implementation checkpoint — 2026-09-07" in text:
    raise SystemExit("UI_MIGRATION.md: checkpoint already present")
pos += len(marker)
migration.write_text(text[:pos] + addition + text[pos:])

# UI_DECISIONS: record implementation evidence without claiming completion.
decisions = Path("docs/ui/UI_DECISIONS.md")
text = decisions.read_text()
marker = '**Acceptance:** final approval requires exact-head functional regressions plus human desktop/390px review of empty Image/Video, reference, Advanced, active-generation, result and reduced-motion states. A technically passing but visually timid candidate is not sufficient.\n'
addition = '''\n**Implementation checkpoint — 2026-09-07:** Draft PR #122 implements UI-063 at product head `d9fd8104e81675a580731ac80d43d0b3af5a880e` using the existing Motion + CSS stack only. Create Lifecycle `34117072016` / artifact `10016735569` (`sha256:f59ec5f306d45dd6314081cfca6bb4972235e6759aca3638a03f324c908ecf15`) is human-reviewed clean after a real desktop Video compositor-clipping defect was found in an earlier artifact and corrected. Ten of eleven required exact-head gates pass. The sole blocker is live Video Generation Integration `34117071950`: pure Video contract/build passes, while live submit cannot route because read-only audit `34117911334` proves both registered REDGraft Modal workspaces are disabled. That infrastructure drift is separately recorded on `main` by PR #123 / `980e92e913778599000555c3452490f94f7f8dbb`. UI-063 is therefore **implemented and visually verified but not complete/merged**; final acceptance still requires a green live Video gate after separately authorized/verified worker recovery or a healthy already-approved registration. No deployment occurred.\n'''
if marker not in text:
    raise SystemExit("UI_DECISIONS.md: UI-063 acceptance marker not found")
if "**Implementation checkpoint — 2026-09-07:** Draft PR #122" in text:
    raise SystemExit("UI_DECISIONS.md: checkpoint already present")
decisions.write_text(text.replace(marker, marker + addition, 1))
