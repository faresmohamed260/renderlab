from pathlib import Path
import re

START = "d8fa1fc754c4e5bdc3648177fb7f833218dc1d95"
PHASE11_MERGE = "46c5daa2866c6758907ee9be219bcb3cb274ca83"
PROD_SHA = "c8e9943dd90cba5971f4dcfcd591445608ce46ca"
PROD_DEPLOY = "dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, got {count}")
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, got {count}")
    return updated


# PROJECT.md: advance priority to the contract stage, expand roadmap bullet, add execution contract.
path = "PROJECT.md"
text = read(path)
text = regex_once(
    text,
    r"## Current Priority\n\*\*.*?\*\*\n\n### Cycle 2 objective",
    f"""## Current Priority
**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–11 are complete and verified. Phase 12 Cycle 2 Release Validation is now expanded into an execution-ready two-gate contract from authoritative `main` `{START}` and current live infrastructure evidence. Phase 12 implementation has not started. Gate 12A is non-deploying exact-candidate/integrated release validation; Gate 12B is a separately authorized production rollout. Current production remains READY deployment `{PROD_DEPLOY}` at application SHA `{PROD_SHA}`, so current `main` has substantial executable drift that must be validated as a release candidate rather than inferred safe from production health. No deployment is authorized.**

### Cycle 2 objective""",
    "PROJECT current priority",
    re.S,
)
text = regex_once(
    text,
    r"^- \*\*Phase 12 — Cycle 2 Release Validation:.*$",
    f"- **Phase 12 — Cycle 2 Release Validation: CONTRACT EXPANDED / IMPLEMENTATION NOT STARTED.** Starting `main` `{START}` is 216 commits ahead of current READY production application SHA `{PROD_SHA}` with real executable changes from Phases 7–11. 12A owns non-deploying exact-candidate + integrated release validation and infrastructure audits. 12B owns a production rollout only after explicit authorization and closed-beta production gates are satisfied; no deployment is authorized by the contract itself.",
    "PROJECT Phase 12 roadmap",
    re.M,
)
contract = f"""
### Phase 12 execution contract — expanded 2026-08-30
**Status: `CONTRACT EXPANDED / IMPLEMENTATION NOT STARTED`. This contract must merge before Phase 12A execution. It authorizes validation work only; it does not authorize deployment, production access-enforcement changes, Auth-hosted configuration changes, R2 mutation, schema changes, or Phase 12B rollout.**

**Goal / user value**
- Prove the complete current RenderLab product works as one release candidate after Phases 6–11 instead of relying on individually green feature slices.
- Catch cross-feature, ownership, persistence, responsive, infrastructure and launch regressions before production receives the large executable delta accumulated since the current deployment.
- Preserve a clean separation between release confidence and deployment permission: validation may complete without creating a Vercel deployment.

**Verified starting state**
- Authoritative contract-start `main` is `{START}`. Phase 11 merged as `{PHASE11_MERGE}`; final Phase 11 exact-head CI, rendered Brand / Launch review, merged-main UI Shell and zero-residue Supabase audit are complete.
- Vercel project `renderlab` is configured as Next.js. Repository `vercel.json` keeps `git.deploymentEnabled=false`; Git pushes/merges are not rollout authorization.
- Current READY production deployment is `{PROD_DEPLOY}` from application SHA `{PROD_SHA}`. Current `main` is **216 commits ahead** and the delta contains application, API, test, workflow and migration-contract changes across Create v2, Library v2, Activity Retry, Account/Admin/Admission and Brand/Launch. Production health therefore cannot substitute for exact-current-candidate validation.
- Vercel currently reports no runtime error clusters over the inspected 7-day window. Production domains remain `renderlab-lake.vercel.app` and `renderlab.faresuniform.uk` plus Vercel project aliases.
- Supabase migrations through `0012_renderlab_generation_admission.sql` are applied. The Phase 11 post-merge live residue audit returned zero RenderLab fixture Auth/access/generation/admission/media/upload/invitation state.
- Current Supabase Security Advisor reports only expected server-owned `rls_enabled_no_policy` INFO plus the known leaked-password-protection WARN. Performance Advisor reports the previously documented one-row `renderlab_beta_settings.updated_by` unindexed-FK INFO plus unused-index INFO; neither is a Phase 12 schema mandate without new evidence.
- Production closed-beta enforcement remains off pending the separately documented known-RenderLab UUID bootstrap. Hosted Supabase built-in mail/rate-limit posture, production Auth Site URL/redirect/template/sender verification and Free-plan leaked-password protection remain open operational/broader-beta evidence gaps.

**12A — Release Candidate Validation — authorized by this contract after merge**
1. Freeze one exact candidate SHA from the then-current `main`. Do not mix results from different heads. Any release-blocking code/config fix creates a new candidate and restarts every affected release gate.
2. Run repository static/build gates on that candidate, including whitespace, UI purity, TypeScript/verifier syntax where applicable, production Next.js build and Deployment Readiness. No cancelled, action-required, queued or stale-head run counts as success.
3. Require the complete configured feature/integration matrix needed by current repository reality: Account Identity/Ownership/Admin, Generation Admission, Reference/Durable Upload, Image/Edit generation, Video/Animate generation, Create lifecycle, Library search/history/lifecycle/drag-drop/Favorites/Collections/batch actions, media Rename/Download/Delete, Activity/Retry, UI Shell and Brand / Launch.
4. Add one dedicated **Integrated Release** verifier/workflow if the existing matrix does not prove the cross-surface path in one run. It must cover an authenticated run-owned account through Create → persisted result/reference reuse → Library → Viewer → organization → Activity/recovery, plus signed-out/foreign ownership rejection, fresh Admin authorization and public landing/Create routing. Prefer a run-owned mock generation backend for this cross-product continuity test so it does not duplicate provider spend; existing configured Generation/Video integration remains authoritative for live native backend mapping.
5. Capture a bounded release artifact set for human review: Landing, Create, Library, Viewer, Activity, Settings and Admin at representative desktop/narrow states; verify hierarchy, overflow, focus/keyboard behavior, readable error/success states and reduced-motion behavior. A green build alone is insufficient.
6. Audit Supabase live state read-only after configured runs: applied migration history, RLS/browser grants, privileged function execute/search-path posture, singleton admission defaults, ownership/deletion integrity and exact fixture cleanup. Security/performance advisor findings must be categorized as expected, release-blocking, or deferred with evidence.
7. Audit production infrastructure read-only without deploying: Vercel project/framework/domains/current READY deployment/runtime errors, required environment-variable **presence/contract** without exposing values, current production SHA drift, and repository automatic-Git-deployment disablement. Reconfirm custom-domain HTTPS and R2 browser-upload CORS contract through non-mutating evidence where available.
8. Record a candidate manifest in existing authoritative docs: exact SHA, every required run/result, human artifact review, infrastructure audit, fixture cleanup and unresolved rollout blockers.

**12A hard boundaries**
- This is release validation, not a feature phase. Do not redesign screens, add capabilities, change routes, refactor architecture, tune providers or broaden scope unless a verified release-blocking defect makes the smallest correction necessary.
- Do not add a schema migration merely to silence informational advisors. A real schema/security defect requires explicit evidence, the smallest correction, and full revalidation.
- Do not mutate production Auth configuration, closed-beta enforcement, UUID bootstrap, R2 CORS, Vercel production settings or provider infrastructure during 12A.
- Phase 10 broader-beta blockers remain truthful and open; do not relabel them complete from absence of errors.

**12A exit criteria**
- One unchanged release-candidate SHA has every required configured gate at terminal success.
- Integrated cross-surface validation passes with exact run-owned cleanup.
- Required desktop/narrow/reduced-motion human review is clean.
- Supabase/Vercel/R2/custom-domain audits expose no unresolved closed-beta release blocker other than explicitly operator-gated rollout actions.
- Authoritative docs record the exact evidence. At this point Phase 12 may be marked **`RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED`** and must stop if no rollout authorization exists.

**12B — Authorized Production Rollout — NOT authorized by this contract**
- Start only after the user explicitly authorizes deployment/production mutation for the exact verified candidate. If authorization is absent, do not create a Vercel deployment or alter production configuration.
- Before rollout, resolve the invitation-only production consistency gate: verify the intended known RenderLab account UUID bootstrap and production closed-beta enforcement state as a separate explicit operator action. Do not silently claim invitation-only production access while the documented enforcement gate is unresolved.
- Verify production Supabase Auth Site URL/redirect behavior needed by sign-in/recovery links and record the built-in-mail/custom-SMTP/leaked-password limitations truthfully. Broader-beta mail capacity/leaked-password limitations may remain blockers to broader beta even if a deliberately bounded Closed Beta rollout is accepted.
- Reconfirm required Vercel environment contract and exact-origin R2 browser-upload CORS before promotion. Any required production mutation must be explicit, scoped and recorded.
- Deploy only the exact verified candidate SHA. Require READY state, correct production aliases/custom domain, HTTPS, route/metadata/landing smoke, authenticated account/private-media smoke, one bounded image and video capability smoke if authorized, durable upload/reuse, Activity/Retry/Admin boundary, and exact cleanup. Observed render timings are evidence samples, not SLAs.
- Define rollback before rollout using the current READY production deployment `{PROD_DEPLOY}` and verify the rollback candidate remains available until the new release is accepted.

**Phase 12 completion states**
- `RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED` — 12A complete, no rollout permission.
- `ROLLOUT AUTHORIZED / IN PROGRESS` — explicit user authorization received and 12B prerequisites are being executed.
- `COMPLETE / VERIFIED` — exact candidate deployed intentionally, custom-domain/product smoke and cleanup pass, production state/docs are reconciled, and no unresolved rollback-triggering defect remains.

**Documentation outputs**
- Keep Phase 12 evidence in `PROJECT.md`, `docs/ui/UI_MIGRATION.md` and the relevant existing architecture/infrastructure documents. Do not create a competing handoff document.
- Update UI/component/screen decision catalogs only if a real release-blocking correction changes those contracts.
- Record rollout evidence only after it actually occurs; planning or authorization is not deployment evidence.

"""
if "### Phase 12 execution contract — expanded 2026-08-30" not in text:
    marker = "### Phase 10D execution contract — expanded 2026-08-30"
    if marker not in text:
        raise RuntimeError("PROJECT Phase 10D marker missing")
    text = text.replace(marker, contract + marker, 1)
write(path, text)


# UI_MIGRATION.md: replace roadmap checklist with execution-ready Phase 12 tracker and current work.
path = "docs/ui/UI_MIGRATION.md"
text = read(path)
phase12 = f"""### Phase 12 — Cycle 2 Release Validation
**Contract status:** `CONTRACT EXPANDED / IMPLEMENTATION NOT STARTED`. Starting authoritative `main` is `{START}`. 12A is non-deploying validation; 12B remains separately authorization-gated.

#### Verified preflight — 2026-08-30
- [x] Phase 11 is complete/verified and merged; Phase 12 prerequisite is satisfied.
- [x] Current READY Vercel production deployment is `{PROD_DEPLOY}` from application SHA `{PROD_SHA}`; current `main` is 216 commits ahead with executable drift, so production health cannot stand in for release-candidate validation.
- [x] Vercel project remains Next.js with production domains `renderlab-lake.vercel.app` / `renderlab.faresuniform.uk`; repository automatic Git deployment remains disabled. No runtime error clusters were reported in the inspected 7-day window.
- [x] Supabase migrations through `0012` are applied; Phase 11 post-merge fixture audit is zero. Security Advisor remains expected server-owned RLS INFO + leaked-password WARN; performance findings remain the documented one-row settings FK INFO + unused-index INFO.
- [x] Production Closed-Beta enforcement/known-account UUID bootstrap is still unresolved and must not be mutated during 12A. Hosted Auth Site URL/redirect/template/sender/custom-SMTP evidence and Free-plan leaked-password support remain separately documented operational/broader-beta gaps.

#### 12A — Release Candidate Validation
- [ ] Freeze one exact candidate SHA after this contract merges; any release-blocking fix creates a new candidate and invalidates stale-head evidence.
- [ ] Run static/build/deployment-readiness gates and require terminal success for the complete configured feature/integration matrix; cancelled/action-required/queued runs are not success.
- [ ] Prove integrated Account → Create → persisted generation/reference reuse → Library → Viewer → organization → Activity/recovery continuity plus signed-out/foreign denial, fresh Admin authorization and public Landing/Create routing in one dedicated release run if existing workflows do not already cover it as one path.
- [ ] Keep integrated continuity provider-cheap by using a run-owned mock backend where appropriate; retain existing configured Image/Edit and Video/Animate integration as the authoritative live-provider mapping checks.
- [ ] Capture/review bounded desktop+narrow release artifacts for Landing, Create, Library, Viewer, Activity, Settings and Admin; include overflow/focus/reduced-motion/accessibility checks.
- [ ] Run read-only Supabase migration/RLS/grant/function/singleton/integrity/advisor/fixture audit and exact cleanup after configured validation.
- [ ] Run read-only Vercel project/domain/current-deployment/runtime/env-contract audit plus current-production SHA drift; re-confirm custom-domain HTTPS and R2 exact-origin browser-upload contract without production mutation.
- [ ] Record one exact candidate manifest in authoritative docs. If all 12A gates pass and deployment is still unauthorized, mark `RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED` and stop.

#### 12A scope guardrails
- [ ] No feature expansion, redesign, architecture refactor, provider tuning or migration unless required by a verified release-blocking defect; make only the smallest fix and fully revalidate its new exact head.
- [ ] Do not mutate Vercel production, Supabase Auth hosted settings, closed-beta enforcement/bootstrap, R2 CORS or provider infrastructure during 12A.
- [ ] Do not convert informational advisors or broader-beta Auth limitations into invented Phase 12 fixes without evidence.

#### 12B — Authorized Production Rollout — blocked until explicit authorization
- [ ] Receive explicit user authorization for deployment/production mutation of the exact 12A-verified candidate. Without it, do not deploy.
- [ ] Resolve/verify known RenderLab UUID bootstrap + production closed-beta enforcement before treating invitation-only launch posture as production-consistent.
- [ ] Verify production Auth Site URL/redirect behavior and truthfully retain built-in-mail/custom-SMTP/leaked-password limitations that still block broader beta.
- [ ] Reconfirm required Vercel environment contract and R2 exact-origin CORS; perform only explicitly authorized mutations.
- [ ] Deploy exactly the verified candidate; require READY state, aliases/custom-domain HTTPS, landing/routes/metadata, authenticated/private-media, durable upload/reuse, bounded Image+Video, Activity/Retry/Admin smoke and exact cleanup.
- [ ] Keep `{PROD_DEPLOY}` available as the pre-rollout rollback candidate until the new release is accepted.
- [ ] Record actual production deployment SHA/ID, smoke/cleanup evidence and final infrastructure state before marking Phase 12 `COMPLETE / VERIFIED`.
"""
text = regex_once(
    text,
    r"### Phase 12 — Cycle 2 Release Validation\n(?:- \[ \].*\n)+",
    phase12 + "\n",
    "UI_MIGRATION Phase 12 expansion",
)
current_work = f"""## Current Work
**Current cycle:** Cycle 2 — Creative Productivity & Beta Maturity is in progress; Phases 6–11 are complete/verified.
**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `CONTRACT EXPANDED / IMPLEMENTATION NOT STARTED` on top of authoritative starting `main` `{START}`.
**Next sequence:** merge this docs-only Phase 12 execution contract first. Then 12A may freeze one current-main release candidate and run the non-deploying integrated validation/audit sequence. 12B remains blocked unless the user explicitly authorizes deployment and production mutations.
**Release reality:** current READY production is `{PROD_DEPLOY}` / `{PROD_SHA}`, while contract-start `main` is 216 commits ahead with executable changes. Production health is useful baseline evidence, not candidate evidence.
**Deployment boundary:** no deployment or production configuration mutation is authorized by contract expansion or 12A validation. The invitation-only production enforcement/bootstrap gate must be explicitly resolved before an authorized rollout is accepted as production-consistent.
**Broader-beta boundary:** Supabase built-in mail/rate-limit posture, unverified production Auth Site URL/redirect/template/sender/custom-SMTP posture and Free-plan leaked-password protection remain open until separately evidenced; do not hide them inside release-validation success.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter library and selection from external ecosystems such as Civitai/Hugging Face remains post-Cycle-2 and out of Phase 12.

## Session Handoff Rule"""
text = regex_once(
    text,
    r"## Current Work\n.*?## Session Handoff Rule",
    current_work,
    "UI_MIGRATION Current Work",
    re.S,
)
write(path, text)


# INFRASTRUCTURE.md: record the live preflight that materially shapes the Phase 12 contract.
path = "docs/architecture/INFRASTRUCTURE.md"
text = read(path)
preflight = f"""
### Phase 12 pre-release infrastructure audit — 2026-08-30
This is read-only contract evidence, not rollout authorization.

- Contract-start repository `main`: `{START}`. Phase 11 merge: `{PHASE11_MERGE}`.
- Connected Vercel project `renderlab` (`prj_UGFbrAJ0fg2H0cZOznBoCZ8RCsJU`) reports framework `nextjs`; production domains include `renderlab-lake.vercel.app` and `renderlab.faresuniform.uk`. Repository `vercel.json` continues to disable automatic Git deployment.
- Current READY production deployment is `{PROD_DEPLOY}` from GitHub application SHA `{PROD_SHA}`. The compare from `{PROD_SHA}` to `{START}` is 216 commits ahead and includes executable application/API/workflow/migration-contract changes from Phases 7–11. Phase 12 must validate a current exact release candidate before any authorized deployment rather than using old-production health as a proxy.
- Vercel reported no grouped runtime errors in the inspected seven-day production window. This demonstrates current deployed-baseline health only; it says nothing about the undeployed current-main executable delta.
- Supabase Phase 11 post-merge fixture audit returned zero RenderLab fixture Auth users, account-access rows, generation jobs/sources/admission reservations, media assets/collections/items/upload sessions and invitations. Migrations remain applied through `20260830101734 renderlab_generation_admission` (`0012`).
- Fresh Security Advisor evidence remains expected INFO `rls_enabled_no_policy` on deliberately server-owned RenderLab tables plus WARN `auth_leaked_password_protection`; no new DDL finding was introduced. Fresh Performance Advisor evidence remains INFO for the one-row `renderlab_beta_settings.updated_by` FK plus unused indexes; Phase 12 does not create a schema migration solely to silence these informational notices.
- Production closed-beta enforcement remains off pending the known-RenderLab UUID bootstrap. Production Auth Site URL/redirect/template/sender/custom-SMTP evidence is still incomplete and built-in mail/rate-limit plus Free-plan leaked-password limitations remain explicit. Phase 12A audits these without mutation; Phase 12B may address production rollout prerequisites only after explicit authorization.
- R2/browser upload contract remains the existing owner-scoped signed-PUT flow and exact-origin CORS model. Phase 12A may verify its current state non-mutating; any CORS reconciliation is a production mutation and belongs only to an explicitly authorized rollout.

"""
marker = "### Account identity boundary — UI-029"
if "### Phase 12 pre-release infrastructure audit — 2026-08-30" not in text:
    if marker not in text:
        raise RuntimeError("INFRASTRUCTURE insertion marker missing")
    text = text.replace(marker, preflight + marker, 1)
write(path, text)
