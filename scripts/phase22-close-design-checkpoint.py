from pathlib import Path

RUN_ID = "34265429235"
JOB_ID = "102193457119"
ARTIFACT_ID = "10071612375"
ARTIFACT_DIGEST = "sha256:0508d5df26e4304e21239a02c2618d93cef924f5a18aa1ba7180bb13eb3422ab"
REVIEW_HEAD = "362730b64bc36b149c19ba7d27038c1766687f08"
EVIDENCE_COMMIT = "6e2e08a39e7fbb1210b84593a4fd126fb1a84f26"


def replace_exact(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise SystemExit(f"expected exactly one match in {path}: {old!r}; found {text.count(old)}")
    p.write_text(text.replace(old, new, 1))


replace_exact(
    "design/penpot/phase22-system-cohesion-v0.1.md",
    "**Status:** `DESIGN CANDIDATE / REVIEW PENDING`  ",
    "**Status:** `APPROVED / IMPLEMENTATION READY`",
)

checkpoint = Path("design/penpot/phase22-system-cohesion-v0.1.md")
text = checkpoint.read_text()
marker = "\nProduction deployment is not authorized by this checkpoint.\n"
if text.count(marker) != 1:
    raise SystemExit("checkpoint production marker mismatch")
evidence = f'''\n## Verified render review — 2026-09-08\n- Exact review workflow `{RUN_ID}` / job `{JOB_ID}` passed XML validation, remote `librsvg` rasterization, contact-sheet composition and artifact upload against review head `{REVIEW_HEAD}`.\n- Review artifact `{ARTIFACT_ID}` (`phase22-system-cohesion-review`) has digest `{ARTIFACT_DIGEST}` and contains the exact Activity, Settings, Landing and cohesion rasters plus the contact sheet.\n- Human review accepted desktop + 390px hierarchy across all four boards. Activity keeps truthful active/terminal meaning and distinct Run Again / Retry / Cancel actions with no fabricated percentage, ETA, provider stage, queue position or SLA. Settings keeps identity/security/access hierarchy and contextual Admin treatment without role/profile/preference invention. Landing keeps invitation-only Closed Beta truth, `Open Create` primary / `Sign in` secondary hierarchy and a clearly static product preview without signup/pricing/testimonial/fake-metric/provider/SLA claims.\n- Cross-product review accepted the intended surface roles and bounded effect budget: Create remains intent-dominant; Library/Viewer media-dominant; Activity lifecycle-dominant; Settings trust-dominant; Landing atmosphere-dominant. Reduced-motion/static meaning and 390px reachability are explicit in the checkpoint. No corrective visual iteration is required.\n- The self-cleaning review helper was removed by evidence commit `{EVIDENCE_COMMIT}`. No product source, runtime dependency, backend/auth/schema/worker/routing/infrastructure or deployment configuration changed during checkpoint review.\n\n**Checkpoint decision:** Phase 22 product implementation may begin from the merged checkpoint, subject to the controlling execution contract and exact-head implementation acceptance. This approval is visual/design approval only; it does not mark any 22A–22D implementation item complete.\n'''
checkpoint.write_text(text.replace(marker, evidence + marker, 1))

replace_exact(
    "PROJECT.md",
    "**Status: `CONTRACT READY / DESIGN CHECKPOINT REQUIRED / IMPLEMENTATION NOT STARTED`.**",
    "**Status: `DESIGN CHECKPOINT APPROVED / IMPLEMENTATION READY / IMPLEMENTATION NOT STARTED`.**",
)

replace_exact(
    "docs/ui/UI_MIGRATION.md",
    "**Status: `ACTIVE / PHASE 21 CONTRACT READY`.**",
    "**Status: `ACTIVE / PHASE 22 DESIGN CHECKPOINT APPROVED`.**",
)
replace_exact(
    "docs/ui/UI_MIGRATION.md",
    "- **Phase 22 — Activity, Settings, Landing & System Cohesion:** `CONTRACT READY / DESIGN CHECKPOINT REQUIRED / IMPLEMENTATION NOT STARTED` — expanded from verified Phase 21 merged baseline `c17abfef07fbc580c51f458496e4e53502816229`.",
    f"- **Phase 22 — Activity, Settings, Landing & System Cohesion:** `DESIGN CHECKPOINT APPROVED / IMPLEMENTATION READY / IMPLEMENTATION NOT STARTED` — contract baseline `c17abfef07fbc580c51f458496e4e53502816229`; reviewed checkpoint evidence `{RUN_ID}` / artifact `{ARTIFACT_ID}`.",
)
replace_exact(
    "docs/ui/UI_MIGRATION.md",
    "**Status: `CONTRACT READY / DESIGN CHECKPOINT REQUIRED / IMPLEMENTATION NOT STARTED`.** Planning baseline `c17abfef07fbc580c51f458496e4e53502816229`.",
    f"**Status: `DESIGN CHECKPOINT APPROVED / IMPLEMENTATION READY / IMPLEMENTATION NOT STARTED`.** Planning baseline `c17abfef07fbc580c51f458496e4e53502816229`; checkpoint review run `{RUN_ID}`, artifact `{ARTIFACT_ID}` (`{ARTIFACT_DIGEST}`).",
)
replace_exact(
    "docs/ui/UI_MIGRATION.md",
    "- [ ] Create and human-review the required repository-backed desktop/390px Activity + Settings + Landing design checkpoint before implementation.",
    "- [x] Create and human-review the required repository-backed desktop/390px Activity + Settings + Landing design checkpoint before implementation; Activity, Settings, Landing and cross-product cohesion boards passed exact remote raster/human review with no corrective iteration required.",
)

# Self-clean so the durable branch contains only repository state, not staging machinery.
Path("scripts/phase22-close-design-checkpoint.py").unlink()
workflow = Path(".github/workflows/phase22-close-design-checkpoint.yml")
if workflow.exists():
    workflow.unlink()
