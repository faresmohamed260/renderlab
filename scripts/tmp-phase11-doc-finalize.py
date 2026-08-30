from pathlib import Path
import re

HEAD = "8975b7b42b518eea0a462b28528ddd41d90ad986"
ART = "9734984885"
DIG = "sha256:8d9929fb5f6d85da4710184ec7bbe756f782593f58525ec2ae660729ad3b32a9"


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one literal match, found {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, new: str, label: str, flags: int = 0) -> str:
    updated, count = re.subn(pattern, new, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return updated


# PROJECT.md — replace only current Phase 11 state/evidence blocks.
path = "PROJECT.md"
text = read(path)
text = regex_once(
    text,
    r"## Current Priority\n.*?\n\n### Cycle 2 objective",
    f"""## Current Priority
**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–10 are complete and verified. Phase 11 Brand & Launch Experience is implemented on PR #73 under UI-052 and its product/visual acceptance gates are complete: validated implementation head `{HEAD}` passed all 19 affected PR workflows, and exact Brand / Launch artifact `{ART}` was human-reviewed clean across landing desktop/narrow, `/create` AppShell, small-scale brand treatment and legacy continuation. The remaining gate is final documentation-only exact-head CI, guarded merge, and merged-main verification. Broader-beta Auth email/template/leaked-password blockers remain explicitly open. No deployment is authorized.**

### Cycle 2 objective""",
    "PROJECT Current Priority",
    re.S,
)
text = regex_once(
    text,
    r"^- \*\*Phase 11 — Brand & Launch Experience:.*$",
    f"- **Phase 11 — Brand & Launch Experience: IMPLEMENTATION VERIFIED / READY FOR MERGE under UI-052.** PR #73 implements public Brand/Landing `/`, authoritative Create `/create`, the marketing/application shell split, legacy continuation compatibility and the reviewed RenderLab brand/launch assets. Validated implementation head `{HEAD}` passed 19/19 affected PR workflows; Brand / Launch Visual `33321365147` produced artifact `{ART}` (`{DIG}`), and human review was clean. `main` remains `37c0ee922792244ffdf2e3887db08cecc3eab97d` until merge; merge still does not authorize deployment.",
    "PROJECT Phase 11 roadmap",
    re.M,
)
text = regex_once(
    text,
    r"(### Phase 11 execution contract — expanded 2026-08-30\n)\*\*Status:.*?\*\*",
    r"\1**Status: `IMPLEMENTATION VERIFIED / READY FOR MERGE` under UI-052. PR #73 contains the route/layout/brand implementation; all 19 affected workflows on the validated implementation head and the required human launch-artifact review are complete. The final documentation-only head must retain normal exact-head CI before merge.**",
    "PROJECT Phase 11 status",
    re.S,
)
project_handoff = f"""**Current verified implementation handoff — 2026-08-30**
- Authoritative `main` remains `37c0ee922792244ffdf2e3887db08cecc3eab97d` (PR #72 Phase 11 contract merge). PR #73 targets that unchanged base.
- Reviewed design checkpoint ancestor `9d50244a63ecacda9b37bebf023706948817fd96` and route audit `33318762853` established the approved design/routing boundary before implementation.
- PR #73 implements `/` Landing, `/create` Create, `(app)` AppShell ownership for Library/Viewer/Activity/Settings/Admin, full-query same-origin legacy continuation, updated shell/Viewer links, reusable RenderLab branding, favicon/mark/Open Graph assets and Brand / Launch verification.
- Guarded staging `33319652665` and clean static gate `33320451225` passed scoped static/build checks.
- Validated implementation head `{HEAD}` passed **19/19 affected PR workflows**. Account/Admin Operations `33321365154` and Library Lifecycle Visual `33321365125` close the older concurrency-cancelled gaps; Create Lifecycle `33321365191`, Library Drag Drop `33321365146` and Generation Admission `33321365155` also passed on the same head.
- Brand / Launch Visual `33321365147` published artifact `{ART}` (`renderlab-brand-launch-screenshots`, `{DIG}`). Human review is complete and clean: desktop/narrow hierarchy and wrapping have no horizontal clipping; CTA/closed-beta posture is clear; the mark remains legible at small scale; `/create` preserves the established application feel; legacy continuation lands in the correct signed-out/private-media state.
- No Phase 11 visual defect requires another product-code iteration. This documentation-only reconciliation records the reviewed implementation evidence before merge.
- No deployment, schema, Supabase/Auth policy, admission-default, R2/provider, billing or broader-beta blocker change is authorized by Phase 11.

**Goal / user value**"""
text = regex_once(
    text,
    r"\*\*Current verified implementation handoff — 2026-08-30\*\*.*?\*\*Goal / user value\*\*",
    project_handoff,
    "PROJECT Phase 11 handoff",
    re.S,
)
write(path, text)


# UI migration tracker — close verified acceptance gates, but not merge/post-merge gates.
path = "docs/ui/UI_MIGRATION.md"
text = read(path)
text = regex_once(
    text,
    r"(### Phase 11 — Brand & Launch Experience\n)\*\*Contract status:\*\*.*$",
    r"\1**Contract status:** `IMPLEMENTATION VERIFIED / READY FOR MERGE` under UI-052. Contract merged as `37c0ee922792244ffdf2e3887db08cecc3eab97d`; PR #73 implementation and required human review are complete, with final documentation-only exact-head CI still required before merge.",
    "UI_MIGRATION Phase 11 status",
    re.M,
)
migration_handoff = f"""#### Current verified implementation handoff — 2026-08-30
- [x] Authoritative `main` is `37c0ee922792244ffdf2e3887db08cecc3eab97d`; PR #73 targets that unchanged base. Reviewed-design ancestor is `9d50244a63ecacda9b37bebf023706948817fd96`.
- [x] Desktop/narrow open-SVG checkpoint is reviewed; route audit `33318762853` passed before implementation without an API rename.
- [x] PR #73 implements `/` landing, `/create` Create, `(app)` AppShell route ownership, legacy root-query redirect, updated shell/Viewer links, brand/favicon/Open Graph assets, launch verifier/workflow and affected route-test/workflow updates.
- [x] Guarded staging `33319652665` and clean static gate `33320451225` passed scoped static/build checks.
- [x] Validated implementation head `{HEAD}` passed **19/19 affected PR workflows**. Account/Admin Operations `33321365154` and Library Lifecycle Visual `33321365125` close the older concurrency-cancelled gaps; Create Lifecycle `33321365191`, Library Drag Drop `33321365146` and Generation Admission `33321365155` also passed.
- [x] Brand / Launch Visual `33321365147` artifact `{ART}` (`{DIG}`) was human-reviewed clean for landing desktop/narrow, `/create` AppShell, small-scale brand treatment and legacy continuation. No Phase 11 visual correction is required.
- [x] No horizontal clipping, misleading public-access implication or generic AI-marketing drift was found; `/create` remains recognizably the established application and legacy continuation reaches the correct signed-out/private-media state.
- [x] Deployment, schema, Supabase/Auth policy, admission defaults, R2/provider contracts and Phase 10 broader-beta blockers remain unchanged.
- [ ] Merge PR #73 only after this documentation-only final head reaches terminal success on every affected workflow. Merge and deployment remain separate operations.

#### Locked product / IA boundary"""
text = regex_once(
    text,
    r"#### Current verified implementation handoff — 2026-08-30.*?#### Locked product / IA boundary",
    migration_handoff,
    "UI_MIGRATION Phase 11 handoff",
    re.S,
)
text = regex_once(
    text,
    r"^- \[ \] UI Shell/Create/deep-link tests are updated.*$",
    f"- [x] UI Shell/Create/deep-link tests are updated; validated implementation head `{HEAD}` passed all 19 affected workflows, including the previously cancelled Account/Admin and Library Lifecycle gates, and the required human review is complete.",
    "UI_MIGRATION acceptance tests",
    re.M,
)
text = regex_once(
    text,
    r"^- \[ \] No schema/R2/provider/Auth/admission/deployment change is expected or authorized\..*$",
    "- [x] No schema/R2/provider/Auth/admission/deployment change occurred or is authorized. Phase 10 broader-beta email/template/leaked-password blockers remain open. Phase 12 owns integrated release validation and any separately authorized rollout.",
    "UI_MIGRATION no-infra acceptance",
    re.M,
)
current_work = f"""## Current Work
**Current cycle:** Cycle 2 — Creative Productivity & Beta Maturity is in progress; Phases 6–10 are complete/verified and Phase 11 implementation is verified under UI-052 pending merge of PR #73.
**Current phase contract:** Phase 11 — Brand & Launch Experience is `IMPLEMENTATION VERIFIED / READY FOR MERGE` under UI-052.
**Next implementation sequence:** require terminal success on every affected workflow for this documentation-only final head, merge PR #73 with an unchanged verified head, then verify expected merged-main regressions and exact fixture cleanup. Record the merged-main Phase 11 handoff in existing authoritative docs. Do not start Phase 12 before that verification is complete.
**Current gate:** validated application head `{HEAD}` passed 19/19 affected workflows; Brand / Launch Visual `33321365147` artifact `{ART}` was human-reviewed clean. Only final docs-head CI, guarded merge and merged-main verification remain. No deployment unless explicitly authorized.
**Completed Cycle 2:** Phase 6 baseline/hardening → Phase 7 Create v2 → Phase 8 Library v2 → Phase 9 Activity Retry v0.1 → Phase 10 Account/Admin/Closed-Beta Operations.
**Later Cycle 2:** Phase 12 integrated release validation after Phase 11 is merged and verified on `main`.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter library and selection from external ecosystems such as Civitai/Hugging Face, with compatibility/source/license/cache/admin/safety/strength contracts defined before implementation.
**Persistent scope boundary:** Models/Workflows remain non-destinations for ordinary users; ComfyUI nodes/provider routing stay internal. Trash/restore, safe cancellation productization, billing and cross-page selection still require their own evidence/decisions.

## Session Handoff Rule"""
text = regex_once(
    text,
    r"## Current Work\n.*?## Session Handoff Rule",
    current_work,
    "UI_MIGRATION Current Work",
    re.S,
)
write(path, text)


# Screen registry — reflect the implemented PR route state without claiming main has merged it yet.
path = "docs/ui/SCREEN_REGISTRY.md"
text = read(path)
text = replace_once(
    text,
    "Cycle 2 includes the privileged Admin surface at `/admin` under UI-051 and Phase 11 locks a public **Brand/Landing** target at `/` under UI-052, with Create moving to `/create` only when the Phase 11 implementation merges.",
    "Cycle 2 includes the privileged Admin surface at `/admin` under UI-051. PR #73 implements UI-052's public **Brand/Landing** at `/` and authoritative Create workspace at `/create`; `main` adopts that routing when the verified PR merges.",
    "SCREEN_REGISTRY IA",
)
text = replace_once(text, "### Create\n**Route:** `/`", "### Create\n**Route:** `/create`", "SCREEN_REGISTRY Create route")
if "### Brand / Landing\n" not in text:
    brand_screen = f"""### Brand / Landing
**Route:** `/`  
**Status:** APPROVED on validated PR #73 implementation; pending merge to `main`  
**Implementation:** `src/app/page.tsx`, `src/components/brand/renderlab-brand.tsx`, `src/app/opengraph-image.tsx`  
**Design artifacts:** `design/penpot/brand-launch-v0.1-desktop.svg`, `design/penpot/brand-launch-v0.1-mobile.svg`

**Purpose:** Public product home for verified RenderLab capability and truthful invitation-only Closed Beta access without application-shell chrome or public self-admission.

**Verified behavior:** `/` renders without `AppShell`; `/create` and application routes use the `(app)` shell; Open Create → `/create`; Sign in → `/settings`; legacy root continuation preserves the complete query into `/create`; only verified operations/reuse/recovery are claimed; forbidden public-signup/pricing/testimonial/fake-metric/provider/SLA claims remain absent.

**Approval evidence:** validated head `{HEAD}` passed 19/19 affected workflows. Brand / Launch Visual `33321365147` artifact `{ART}` (`{DIG}`) was human-reviewed clean at 1440×1100, 390×844, `/create` shell and legacy-continuation states.

**Do not change:** Do not add public registration/waitlist, pricing/testimonials/fake metrics, provider/model claims, analytics marketing cookies, decorative heavy motion or application-shell marketing chrome without a new explicit decision.

"""
    text = replace_once(text, "### Create\n", brand_screen + "### Create\n", "SCREEN_REGISTRY Brand insertion")
write(path, text)


# Frontend architecture — the PR branch implementation is no longer a future target.
path = "docs/architecture/FRONTEND_ARCHITECTURE.md"
text = read(path)
text = regex_once(
    text,
    r"## Routing\n```text\n.*?\n```",
    """## Routing
```text
/                  Brand / Landing (public, no AppShell)
/create            Create
/library           Library
/library/[assetId] Media Viewer
/activity          Activity
/settings          Settings / Account
/admin             Admin (fresh active-admin authorization)
```""",
    "FRONTEND_ARCHITECTURE routing",
    re.S,
)
text = replace_once(text, "- Create remains the default route.", "- Bare `/` is the public Brand / Landing route; Create is the authoritative `/create` application route under `AppShell`.", "FRONTEND_ARCHITECTURE default route")
text = replace_once(text, "### Phase 11 planned landing / application routing boundary — UI-052", "### Phase 11 landing / application routing boundary — UI-052 — implemented / verified", "FRONTEND_ARCHITECTURE Phase 11 heading")
text = replace_once(text, "The verified current routing block above remains authoritative until Phase 11 implementation merges. UI-052 locks the target migration:", "PR #73 implements the UI-052 routing boundary shown above; the application branch is verified and `main` adopts it when the PR merges:", "FRONTEND_ARCHITECTURE Phase 11 intro")
text = replace_once(text, "Until implementation merges, `/` remains Create and this section is a planned contract, not a claim about current runtime behavior.", f"On validated PR #73 head `{HEAD}`, `/` is Landing and `/create` is Create; all 19 affected workflows and required rendered review passed. `main` retains its pre-merge route state only until the guarded PR merge. No deployment follows from that merge.", "FRONTEND_ARCHITECTURE Phase 11 conclusion")
write(path, text)


# Component catalog — register the new reusable brand treatment and actual AppShell owner.
path = "docs/ui/COMPONENT_CATALOG.md"
text = read(path)
text = replace_once(text, "**Used by:** root layout  ", "**Used by:** `src/app/(app)/layout.tsx` for `/create`, Library/Viewer, Activity, Settings and Admin application routes  ", "COMPONENT_CATALOG AppShell owner")
text = replace_once(text, "**Notes:** Production build + Playwright desktop/mobile rendering approved; not locked.", f"**Notes:** Production build + Playwright desktop/mobile rendering approved; not locked. UI-052 / PR #73 moves shell ownership from the global root layout to `src/app/(app)/layout.tsx`; validated head `{HEAD}` preserves the established application composition while public `/` renders without `AppShell`.", "COMPONENT_CATALOG AppShell notes")
if "### RenderLabBrand\n" not in text:
    brand_component = f"""### RenderLabBrand
**Status:** APPROVED  
**Source:** `src/components/brand/renderlab-brand.tsx`  
**Origin:** RenderLab-owned geometric mark/wordmark from the reviewed UI-052 design checkpoint  
**Purpose:** Shared RenderLab identity for landing, shell and small navigation/favicon scales without glow/gradient dependence.  
**Used by:** public Brand / Landing and application `AppShell`; matching vector asset at `public/renderlab-mark.svg`, app icon at `src/app/icon.svg`.  
**Reuse rules:** Reuse the component/mark geometry; marketing destination is `/`, application-shell destination is `/create`; preserve accessible labeling and monochrome legibility.  
**Do not:** Fork unrelated RenderLab logos, substitute generic AI sparkle/glow identity, or couple branding to provider/model/runtime claims.  
**Notes:** UI-052 validated head `{HEAD}` passed Brand / Launch Visual `33321365147` and all 19 affected workflows. Artifact `{ART}` (`{DIG}`) was human-reviewed clean.

"""
    text = replace_once(text, "### Collapsible\n", brand_component + "### Collapsible\n", "COMPONENT_CATALOG Brand insertion")
write(path, text)


# Penpot handoff — preserve design-artifact status while recording application approval.
path = "design/penpot/README.md"
text = read(path)
text = replace_once(
    text,
    "This makes the pair a **REVIEWED DESIGN CANDIDATE**, not an approved implementation; the rendered application still requires the configured Brand / Launch Visual workflow and human screenshot review required by UI-052.",
    f"The SVG pair remains a **REVIEWED DESIGN CANDIDATE** rather than the application source of truth. The matching PR #73 implementation at validated head `{HEAD}` passed Brand / Launch Visual `33321365147` and all 19 affected workflows; artifact `{ART}` (`{DIG}`) was human-reviewed clean for landing desktop/narrow, `/create` shell, small-scale mark and legacy continuation. The rendered implementation is approved for merge under UI-052 without changing the design-artifact authority order.",
    "Penpot Phase 11 approval",
)
write(path, text)


# UI decision — append verified implementation evidence to accepted UI-052.
path = "docs/ui/UI_DECISIONS.md"
text = read(path)
marker = "**Implementation evidence — UI-052 (2026-08-30):**"
if marker not in text:
    text = text.rstrip() + f"\n\n{marker} PR #73 implements the accepted `/` Landing → `/create` Create route/layout split without changing the other public application URLs. Validated implementation head `{HEAD}` passed all 19 affected PR workflows, led by UI Shell `33321365126`, Account/Admin Operations `33321365154`, Library Lifecycle `33321365125`, Create Lifecycle `33321365191`, Library Drag Drop `33321365146`, Generation Admission `33321365155` and Brand / Launch Visual `33321365147`. Brand artifact `{ART}` (`{DIG}`) was human-reviewed clean at desktop/narrow plus `/create` shell and legacy-continuation states. No schema/Auth/admission/R2/provider/billing/deployment change occurred.\n"
write(path, text)


# Fail closed if the expected final state was not actually written.
required = {
    "PROJECT.md": ["IMPLEMENTATION VERIFIED / READY FOR MERGE", "19/19 affected PR workflows", ART],
    "docs/ui/UI_MIGRATION.md": ["IMPLEMENTATION VERIFIED / READY FOR MERGE", "19/19 affected PR workflows", ART],
    "docs/ui/SCREEN_REGISTRY.md": ["### Brand / Landing", "### Create\n**Route:** `/create`"],
    "docs/architecture/FRONTEND_ARCHITECTURE.md": ["/create            Create", "implemented / verified"],
    "docs/ui/COMPONENT_CATALOG.md": ["### RenderLabBrand", "src/app/(app)/layout.tsx"],
    "design/penpot/README.md": [ART, "rendered implementation is approved for merge"],
    "docs/ui/UI_DECISIONS.md": ["Implementation evidence — UI-052", ART],
}
for file_path, needles in required.items():
    body = read(file_path)
    missing = [needle for needle in needles if needle not in body]
    if missing:
        raise RuntimeError(f"{file_path}: missing finalization markers {missing}")

print("Phase 11 documentation reconciliation complete")
