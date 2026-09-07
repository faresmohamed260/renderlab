from pathlib import Path

FUNCTIONAL_HEAD = "b7358da8f71fd789249515fca87ed01a64789f5f"
CREATE_RUN = "34149277859"
CREATE_ARTIFACT = "10028815164"
CREATE_DIGEST = "sha256:88637c653129ed7cdfba38a3b2fd5fc6022ac297cd41d4e09dcc8646cde01f3c"
VIDEO_RUN = "34149277852"
VIDEO_ARTIFACT = "10029509695"
VIDEO_DIGEST = "sha256:578216c480ed2cc55acf70167494712995617baba1bdcc10786d0a2d6e0d7dc6"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def append_once(path: str, marker: str, block: str) -> None:
    p = Path(path)
    text = p.read_text()
    if marker in text:
        raise SystemExit(f"{path}: closure marker already present")
    p.write_text(text.rstrip() + "\n\n" + block.strip() + "\n")


p = Path("PROJECT.md")
text = p.read_text()
text = replace_once(
    text,
    "**Status: `ACTIVE / PHASE 20 CONTRACT READY`.**",
    "**Status: `ACTIVE / PHASE 20 COMPLETE / VERIFIED`.**",
    "PROJECT Cycle 4 status",
)
text = replace_once(
    text,
    "# Phase 20 Execution Contract — Create as a Creative Instrument\n**Status: `READY FOR IMPLEMENTATION`.**",
    "# Phase 20 Execution Contract — Create as a Creative Instrument\n**Status: `COMPLETE / VERIFIED`.**",
    "PROJECT Phase 20 contract status",
)
p.write_text(text)
append_once(
    "PROJECT.md",
    "## Phase 20 verified closure — 2026-09-07",
    f'''
## Phase 20 verified closure — 2026-09-07
**Status: `COMPLETE / VERIFIED`.**

Phase 20 functional implementation head `{FUNCTIONAL_HEAD}` passed all 17 attached exact-head workflows. Video Generation Integration `{VIDEO_RUN}` passed the 1,320-case pure contract, production build and the complete configured live ownership matrix after the separately authorized REDGraft recovery: 480p Create Video produced 854×480 / 5.00s / 24fps / no audio; 1080p Create Video produced 1920×1080 / 5.00s / 24fps / no audio; 720p portrait/audio Create Video produced 720×1280 / 10.00s / 25fps / audio present; and 2K Animate Original produced 2304×1152 / 5.00s / 30fps / no audio. All four jobs reached durable success and exact cleanup completed. Contextual review artifact `{VIDEO_ARTIFACT}` has ZIP digest `{VIDEO_DIGEST}`.

Create Lifecycle Visual `{CREATE_RUN}` passed on the same exact head and uploaded artifact `{CREATE_ARTIFACT}` (`{CREATE_DIGEST}`). Human review of its 16 desktop/390px states confirms the prompt remains dominant; Image/Video essential controls stay one-row and unclipped at 390px; the Video settings popover remains in viewport; Advanced is integrated into the instrument; reference alias/role hierarchy remains clear; active generation exposes only truthful `Generating` state; durable results retain clear hierarchy; focus remains visible; and reduced-motion states preserve meaning without transform-dependent motion. No corrective visual iteration is required.

The implementation uses the existing Motion + CSS + RenderLab primitive stack and changes no generation capability, model semantics, media/reference identity, account/admission contract, schema, Supabase or R2 contract. The separately authorized REDGraft recovery and routing correction are recorded in `docs/architecture/INFRASTRUCTURE.md`; historical `-01` LTX registrations remain disabled rather than being repurposed. Production remains unchanged, automatic Git → Vercel deployment remains disabled, and this completion does not authorize deployment. Phase 21 remains roadmap-only until Phase 20 is merged and merged-main verification is complete.
''',
)

p = Path("docs/ui/UI_MIGRATION.md")
text = p.read_text()
text = replace_once(
    text,
    "- **Phase 20 — Create as a Creative Instrument:** `READY FOR IMPLEMENTATION` — immersive instrument frame, morphing Image/Video context, reference choreography, precision-deck Advanced, tactile Generate/lifecycle states and spatial result arrival.",
    "- **Phase 20 — Create as a Creative Instrument:** `COMPLETE / VERIFIED` — immersive instrument frame, morphing Image/Video context, reference choreography, precision-deck Advanced, tactile Generate/lifecycle states and spatial result arrival; exact functional and rendered evidence are verified below.",
    "UI_MIGRATION roadmap Phase 20",
)
text = replace_once(
    text,
    "- **Phase 21 — Library & Viewer Spatial Media Experience:** roadmap only until Phase 20 evidence closes.",
    "- **Phase 21 — Library & Viewer Spatial Media Experience:** roadmap only; expand only after Phase 20 is merged and merged-main verification is complete.",
    "UI_MIGRATION roadmap Phase 21",
)
text = replace_once(
    text,
    "**Status: `IMPLEMENTED IN DRAFT / EXACT-HEAD ACCEPTANCE IN PROGRESS`.** UI-063 is the controlling visual/product decision. Draft PR #122; checkpoint exact head `b449cc0fbc4d87758e099b1d1d4afcd4d53595bd`.",
    f"**Status: `COMPLETE / VERIFIED`.** UI-063 is the controlling visual/product decision. PR #122 functional acceptance head `{FUNCTIONAL_HEAD}`.",
    "UI_MIGRATION tracker status",
)
text = replace_once(
    text,
    "- [ ] Pass the final exact-head purity/quality/build plus every attached Create/model/reference/generation/integrated regression. The connector-authored tree-identical checkpoint head exists so suppressed Actions-authored commits receive a real matrix.",
    f"- [x] Pass the final exact-head purity/quality/build plus every attached Create/model/reference/generation/integrated regression. All 17 attached workflows passed on functional head `{FUNCTIONAL_HEAD}`.",
    "UI_MIGRATION exact-head checkbox",
)
text = replace_once(
    text,
    "- [ ] Human-review final desktop and 390px empty/mode/reference/Advanced/active/result/reduced-motion artifacts on the final exact head.",
    f"- [x] Human-review final desktop and 390px empty/mode/reference/Advanced/active/result/reduced-motion artifacts on functional head `{FUNCTIONAL_HEAD}`; Create Lifecycle `{CREATE_RUN}` artifact `{CREATE_ARTIFACT}` (`{CREATE_DIGEST}`) is visually accepted with no corrective iteration required.",
    "UI_MIGRATION human review checkbox",
)
text = replace_once(
    text,
    "- [x] No optional third-party runtime was adopted; existing Motion + CSS + RenderLab primitives were sufficient. Authoritative in-progress implementation evidence is recorded, but final completion evidence remains pending.",
    f"- [x] No optional third-party runtime was adopted; existing Motion + CSS + RenderLab primitives were sufficient. Video Generation Integration `{VIDEO_RUN}` completed all four real worker-backed Video/Animate cases and cleanup, with review artifact `{VIDEO_ARTIFACT}` (`{VIDEO_DIGEST}`).",
    "UI_MIGRATION completion evidence",
)
text = replace_once(
    text,
    "Production deployment remains explicit and separate. Do not mark Phase 20 complete or merge PR #122 until the final exact-head matrix and rendered review pass.",
    "Production deployment remains explicit and separate. Phase 20 is complete/verified at the functional and rendered-evidence boundary; PR #122 may proceed through documentation-head validation and guarded merge, but no deployment is authorized. Phase 21 remains roadmap-only until merged-main verification completes.",
    "UI_MIGRATION merge note",
)
p.write_text(text)

p = Path("docs/ui/UI_DECISIONS.md")
text = p.read_text()
text = replace_once(
    text,
    "**Status:** Accepted / Phase 20 implementation authorized",
    "**Status:** Accepted / Implemented / Verified",
    "UI_DECISIONS UI-063 status",
)
p.write_text(text)
append_once(
    "docs/ui/UI_DECISIONS.md",
    "#### UI-063 verified closure — 2026-09-07",
    f'''
#### UI-063 verified closure — 2026-09-07
UI-063 is implemented and verified on functional head `{FUNCTIONAL_HEAD}`. All 17 attached workflows passed. Create Lifecycle `{CREATE_RUN}` / artifact `{CREATE_ARTIFACT}` (`{CREATE_DIGEST}`) was human-reviewed across desktop, 390px, references, Advanced, active generation, durable result and reduced-motion states; the instrument remains visibly stronger than the Phase 19 baseline without clipping, fake progress or loss of focus/reduced-motion semantics. Video Generation Integration `{VIDEO_RUN}` separately proved the recovered real REDGraft path across 480p, 1080p, 720p portrait/audio and 2K Animate Original, with all four durable jobs succeeding and cleanup completing. No GSAP, Lenis or additional animation runtime was adopted; Motion + CSS + existing RenderLab primitives remain sufficient. UI-063 changes no product generation semantics and authorizes no production deployment.
''',
)

p = Path("docs/architecture/INFRASTRUCTURE.md")
text = p.read_text()
outage_tail = "This note is evidence only. It does not disable routes, change routing metadata, redeploy/restart a worker, create a replacement worker, alter provider credentials, change Vercel/Supabase/R2 state, or authorize any such mutation. Production application state remains separately governed by the last explicit deployment record."
recovery = f'''

### REDGraft recovery — 2026-09-07
Following separate recovery authorization, REDGraft LTX 2.5 capacity was restored on two zero-task Modal accounts and registered under new RenderLab worker identities rather than repurposing the disabled historical registrations:

- `ltx-primary-02` → `https://faresmohamed260--saga-ltx25-gateway-web.modal.run` — active primary;
- `ltx-standby-02` → `https://bplay2086--saga-ltx25-gateway-web.modal.run` — active standby.

The historical `ltx-primary-01` (`dreadcipher67`) and `ltx-standby-01` (`blackzerox67`) registrations remain present but disabled. This is deliberate because persisted jobs retain `worker_id` and polling resolves that identity through `findWorker(row.worker_id)`; reusing an old ID for a different Modal account would silently change the meaning of historical job metadata. The recovered pair was therefore re-keyed to `-02` identities before RenderLab routing was enabled.

Both replacement gateways were verified ready with matching worker identity before the routing update. RenderLab functional head `{FUNCTIONAL_HEAD}` then passed all 17 attached workflows. Video Generation Integration `{VIDEO_RUN}` proved the real recovered route end-to-end across 480p, 1080p, 720p portrait/audio and 2K Animate Original with inspected dimensions/duration/fps/audio matching contract, durable success for all four jobs and exact cleanup. Contextual artifact `{VIDEO_ARTIFACT}` has ZIP digest `{VIDEO_DIGEST}`.

This recovery changes only the REDGraft worker/routing registration needed to restore the already-approved Create Video / Animate Image capability. It does not change product capability semantics, schema, Supabase, R2, admission/account behavior, Vercel deployment state, or the separate RenderLab image-upscale worker. Production application deployment remains explicit and was not performed by this recovery.
'''
if "### REDGraft recovery — 2026-09-07" in text:
    raise SystemExit("INFRASTRUCTURE recovery already present")
text = replace_once(text, outage_tail, outage_tail + recovery, "INFRASTRUCTURE outage tail")
p.write_text(text)
