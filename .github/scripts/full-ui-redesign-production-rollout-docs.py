from pathlib import Path

DEPLOY_SHA = "b6deedad8a229b34828da0c3760b62fa147c1981"
DEPLOYMENT = "dpl_CB145taZqMd6r7MqAoMweYTJzmvh"
DEPLOY_URL = "https://renderlab-6r28s40a8-faresmohamed260-6733s-projects.vercel.app"
ROLLOUT_RUN = "34795391075"
ROLLBACK = "dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991"


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1))


def insert_before_once(path: str, marker: str, block: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(marker)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one insertion marker, found {count}: {marker!r}")
    p.write_text(text.replace(marker, block.rstrip() + "\n\n" + marker, 1))


def append_once(path: str, heading: str, block: str):
    p = Path(path)
    text = p.read_text()
    if heading in text:
        raise SystemExit(f"{path}: rollout heading already present")
    p.write_text(text.rstrip() + "\n\n" + block.rstrip() + "\n")


rollout_block = f"""## Phase 23–29 UI/UX redesign production rollout — 2026-09-14
**Status: `COMPLETE / VERIFIED / PRODUCTION-LIVE`.**

- Explicit user authorization deployed exact repository source `{DEPLOY_SHA}` through guarded GitHub Actions rollout `{ROLLOUT_RUN}`. The deployed application tree contains the fully closed Phase 23–29 redesign; the Phase 29 implementation itself made no production-pixel changes beyond regression verification.
- Vercel production deployment `{DEPLOYMENT}` (`{DEPLOY_URL}`) reached `READY` with exact Git metadata `{DEPLOY_SHA}` and the production environment contract passed during the Vercel build.
- The rollout explicitly assigned `renderlab.faresuniform.uk` to the new deployment because the project-level production alias does not reliably move the custom domain by itself. Custom-domain root, `/create`, `/library`, `/activity` and `/settings` smoke all passed after cutover.
- The post-cutover Vercel runtime-error audit found no runtime-error clusters in the rollout window. The prior accepted Landing deployment `{ROLLBACK}` remains the immediate known-good alias restoration target; rollback was not required.
- No Supabase migration/schema/RLS/Auth configuration, Cloudflare R2 contract, provider/worker, generation routing, scheduler, `pg_cron` or `pg_net` state changed during this rollout. Automatic Git → Vercel deployment remains disabled.
"""

# PROJECT.md — current production pointer and redesign program state.
replace_once(
    "PROJECT.md",
    "**Status: COMPLETE / VERIFIED IN REPOSITORY — the Phase 23–29 UI/UX redesign program is closed; accumulated post-Landing application redesign remains not deployed.**",
    "**Status: COMPLETE / VERIFIED / PRODUCTION-LIVE — the Phase 23–29 UI/UX redesign program is closed and the completed application redesign is now live in production.**",
)
for old, new in [
    ("- **Create:** approved Clear Composer v0.5 plus UI-074 fidelity correction, merged and verified, not yet deployed.", "- **Create:** approved Clear Composer v0.5 plus UI-074 fidelity correction, merged, verified and production-live."),
    ("- **Library:** approved Gallery Rail v0.3 / UI-075, merged and verified, not yet deployed.", "- **Library:** approved Gallery Rail v0.3 / UI-075, merged, verified and production-live."),
    ("- **Media Viewer:** approved Media Register + Source Fold v0.2 / UI-076, merged and merged-main verified, not yet deployed.", "- **Media Viewer:** approved Media Register + Source Fold v0.2 / UI-076, merged, merged-main verified and production-live."),
    ("- **Activity:** approved Job Matrix + History Register v0.2 / UI-077, merged and merged-main verified, not yet deployed.", "- **Activity:** approved Job Matrix + History Register v0.2 / UI-077, merged, merged-main verified and production-live."),
    ("- **Settings:** approved Trust Register / UI-078, merged and merged-main verified, not yet deployed.", "- **Settings:** approved Trust Register / UI-078, merged, merged-main verified and production-live."),
    ("- **Admin:** approved Admin System Continuity v0.2 / UI-079, exact-head and fidelity verified, merged and merged-main verified, not yet deployed.", "- **Admin:** approved Admin System Continuity v0.2 / UI-079, exact-head/fidelity verified, merged, merged-main verified and production-live."),
]:
    replace_once("PROJECT.md", old, new)
replace_once(
    "PROJECT.md",
    "5. **Phase 29 — whole-product cohesion pass:** COMPLETE / EXACT-HEAD VERIFIED / HUMAN-REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED. UI-080 and `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` governed a verification-first integration pass. The suspected 390px Create/header collision did not reproduce under deterministic geometry, so no production UI code was changed; durable regression coverage now guards fixed-header clearance, narrow overflow and reduced-motion behavior.",
    "5. **Phase 29 — whole-product cohesion pass:** COMPLETE / EXACT-HEAD VERIFIED / HUMAN-REVIEWED / MERGED / MERGED-MAIN VERIFIED / PRODUCTION-LIVE. UI-080 and `docs/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` governed a verification-first integration pass. The suspected 390px Create/header collision did not reproduce under deterministic geometry, so no production UI code was changed; durable regression coverage now guards fixed-header clearance, narrow overflow and reduced-motion behavior.",
)
replace_once(
    "PROJECT.md",
    "Phases 26 through 29 are closed and the repository UI/UX redesign program is complete. Phase 27 still closes only the UI-078 Settings production slice; the broader Account & Settings capability roadmap and workstreams #215–#221/#223 remain independent. Phase 29 intentionally made no production pixel changes because the integrated audit found no evidence-backed defect that justified reopening an approved surface. Production deployment remains separate and explicit; current production is still source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`, with automatic Git → Vercel deployment disabled.",
    f"Phases 26 through 29 are closed and the repository UI/UX redesign program is complete. Phase 27 still closes only the UI-078 Settings production slice; the broader Account & Settings capability roadmap and workstreams #215–#221/#223 remain independent. Phase 29 intentionally made no production pixel changes because the integrated audit found no evidence-backed defect that justified reopening an approved surface. The completed redesign is now production-live from exact source `{DEPLOY_SHA}` at READY deployment `{DEPLOYMENT}`; automatic Git → Vercel deployment remains disabled.",
)
replace_once(
    "PROJECT.md",
    "- The verified repository application baseline is Phase 29 / PR #237 merge `1c33fccf7de5b919b6a9f15916c66b92334da84a`; UI-080 whole-product cohesion is exact-head verified, human-reviewed and merged-main verified. Phase 29 changed only regression verification, not production UI pixels. Production remains the separately approved source `0173c4c5ba08360b6352331118abc81978cfa774`; no production deployment followed the Phase 29 repository merge.",
    f"- The verified repository application baseline is the completed Phase 29/UI-080 redesign tree, production-live from exact repository source `{DEPLOY_SHA}` at READY Vercel deployment `{DEPLOYMENT}`. Phase 29 changed only regression verification, not production UI pixels; guarded rollout `{ROLLOUT_RUN}` moved the custom domain and passed root/Create/Library/Activity/Settings smoke without rollback.",
)
insert_before_once("PROJECT.md", "## Phase 29 Whole-product cohesion closure — 2026-09-14", rollout_block)

# UI_MIGRATION.md — current program-level production state. Historical per-phase closure blocks stay as dated evidence.
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Status: `COMPLETE / VERIFIED IN REPOSITORY / NOT FULLY DEPLOYED`.** Phase 29 closes the Phase 23–29 redesign program; production rollout of the accumulated post-Landing application redesign remains separately explicit.",
    "**Status: `COMPLETE / VERIFIED / PRODUCTION-LIVE`.** Phase 29 closes the Phase 23–29 redesign program and the accumulated application redesign is now live in production.",
)
for old, new in [
    ("- [x] Create redesign — user-approved / exact-head verified / merged / merged-main verified / not deployed.", "- [x] Create redesign — user-approved / exact-head verified / merged / merged-main verified / production-live."),
    ("- [x] Library redesign — user-approved / exact-head verified / merged / merged-main verified / not deployed.", "- [x] Library redesign — user-approved / exact-head verified / merged / merged-main verified / production-live."),
    ("- [x] **Phase 25 Media Viewer redesign — COMPLETE / VERIFIED / MERGED / NOT DEPLOYED.**", "- [x] **Phase 25 Media Viewer redesign — COMPLETE / VERIFIED / MERGED / PRODUCTION-LIVE.**"),
    ("- [x] **Phase 26 Activity redesign — COMPLETE / VERIFIED / MERGED / NOT DEPLOYED.**", "- [x] **Phase 26 Activity redesign — COMPLETE / VERIFIED / MERGED / PRODUCTION-LIVE.**"),
]:
    replace_once("docs/ui/UI_MIGRATION.md", old, new)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [x] **Phase 27 Settings/account-security redesign — COMPLETE / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED.**",
    "- [x] **Phase 27 Settings/account-security redesign — COMPLETE / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / PRODUCTION-LIVE.**",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [x] **Phase 28 Admin redesign — COMPLETE / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED.**",
    "- [x] **Phase 28 Admin redesign — COMPLETE / EXACT-HEAD VERIFIED / FIDELITY REVIEWED / MERGED / MERGED-MAIN VERIFIED / PRODUCTION-LIVE.**",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [x] **Phase 29 whole-product cohesion pass — COMPLETE / EXACT-HEAD VERIFIED / HUMAN-REVIEWED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED.**",
    "- [x] **Phase 29 whole-product cohesion pass — COMPLETE / EXACT-HEAD VERIFIED / HUMAN-REVIEWED / MERGED / MERGED-MAIN VERIFIED / PRODUCTION-LIVE.**",
)
ui_rollout = rollout_block + "\nHistorical per-phase `NOT DEPLOYED` statements elsewhere in this file record the state at each phase's original closure and are superseded for current production state by this rollout record."
insert_before_once("docs/ui/UI_MIGRATION.md", "## Phase 23 — Create Clear Composer v0.5 closure — 2026-09-11", ui_rollout)

# UI_DECISIONS.md — add current deployment override and update final UI-080 status.
replace_once(
    "docs/ui/UI_DECISIONS.md",
    "**Status:** Accepted / implemented / exact-head verified / human-reviewed / merged / merged-main verified / not deployed",
    "**Status:** Accepted / implemented / exact-head verified / human-reviewed / merged / merged-main verified / production-live",
)
append_once(
    "docs/ui/UI_DECISIONS.md",
    "## Current UI redesign deployment state — 2026-09-14",
    f"""## Current UI redesign deployment state — 2026-09-14
UI-074 through UI-080 and their approved Create, Library, Viewer, Activity, Settings and Admin compositions are production-live from exact source `{DEPLOY_SHA}` at READY Vercel deployment `{DEPLOYMENT}`. Guarded rollout `{ROLLOUT_RUN}` explicitly moved `renderlab.faresuniform.uk` and passed root/Create/Library/Activity/Settings smoke; rollback to prior deployment `{ROLLBACK}` was not required. Historical per-decision `not deployed` labels record the state at the time each decision closed and are superseded by this current deployment record. Automatic Git → Vercel deployment remains disabled.""",
)

# SCREEN_REGISTRY.md — one authoritative current-production note; screen-specific historical evidence remains dated.
insert_before_once(
    "docs/ui/SCREEN_REGISTRY.md",
    "## Application Shell",
    f"""## Current production application — 2026-09-14
The completed Phase 23–29 UI/UX redesign is production-live from exact repository source `{DEPLOY_SHA}` at READY Vercel deployment `{DEPLOYMENT}`. Guarded rollout `{ROLLOUT_RUN}` explicitly assigned `renderlab.faresuniform.uk` and passed root plus `/create`, `/library`, `/activity` and `/settings` smoke; the prior Landing deployment `{ROLLBACK}` remains the immediate known-good alias restoration target and was not needed. Current production therefore includes UI-074 shell, UI-075 Library, UI-076 Viewer, UI-077 Activity, UI-078 Settings, UI-079 Admin and UI-080 cohesion verification. Historical per-screen statements below that say a redesign was not yet deployed describe the state at that phase's closure and are superseded by this current production record. Automatic Git → Vercel deployment remains disabled.""",
)

# INFRASTRUCTURE.md — durable rollout evidence and rollback boundary.
append_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "## Full UI/UX redesign production rollout — 2026-09-14",
    f"""## Full UI/UX redesign production rollout — 2026-09-14
The user explicitly authorized rollout after Phase 29 repository closure. Guarded GitHub Actions run `{ROLLOUT_RUN}` checked out exact source `{DEPLOY_SHA}`, required a pristine tree and a configured `VERCEL_TOKEN`, and deployed with the established pinned Vercel CLI path while `VERCEL_ORG_ID=team_r09C6RLmb2acHapENECQIn9T` and `VERCEL_PROJECT_ID=prj_UGFbrAJ0fg2H0cZOznBoCZ8RCsJU` were prebound.

Vercel created production deployment `{DEPLOYMENT}` at `{DEPLOY_URL}`. It reached `READY`; deployment metadata reports exact Git SHA `{DEPLOY_SHA}`, Next.js project framework and CLI production source. The Vercel build ran the repository prebuild environment-contract verifier successfully.

Because the project production alias does not reliably move `renderlab.faresuniform.uk`, the rollout explicitly ran `vercel alias set` for the custom domain after the deployment completed. Root, `/create`, `/library`, `/activity` and `/settings` then passed custom-domain smoke. The rollback step was armed to restore the custom-domain alias to prior accepted deployment `{ROLLBACK}` on post-deploy failure, but it was skipped because smoke passed. The temporary rollout branch self-deleted.

A post-cutover Vercel runtime-error query found no runtime-error clusters in the rollout window. No Supabase schema/migration/RLS/Auth configuration, R2 resource/CORS contract, worker/provider/routing, scheduler, `pg_cron` or `pg_net` mutation accompanied this rollout. Repository `vercel.json` continues to disable automatic Git deployment; future production mutations remain explicit operations.""",
)

print("Full UI redesign production rollout docs patched successfully")
