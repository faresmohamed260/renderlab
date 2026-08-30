from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

project = "PROJECT.md"
replace_once(
    project,
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–11 are complete/verified and Phase 12A Release Candidate Validation is `RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED`. PR #75 merged the permanent release-verification machinery to `main` as `d6b8f386db3893e583c99b23fc3397b0eb377d42`; that exact merged SHA passed Deployment Readiness, Integrated Release and the complete 23-workflow configured matrix with required human artifact review and final read-only infrastructure/security cleanup. Phase 12B production rollout remains separately authorization-gated. Current production is still the older READY deployment at application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`; no deployment is authorized.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–11 and Phase 12A are complete/verified. Phase 12B is `ROLLOUT AUTHORIZED / IN PROGRESS` following explicit user authorization on 2026-08-31. The only deployable candidate remains exact verified SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42`; current production remains the older READY deployment at application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca` and is the defined rollback until rollout acceptance.**"
)
replace_once(
    project,
    "- **Phase 12 — Cycle 2 Release Validation: 12A RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED.** PR #75 merged the release-verification machinery as `d6b8f386db3893e583c99b23fc3397b0eb377d42`; the exact merged SHA passed the complete configured matrix, integrated continuity, responsive/reduced-motion human review, and read-only Supabase/Vercel/R2/custom-domain audits with exact run-owned cleanup. 12B remains blocked until explicit deployment/production-mutation authorization.",
    "- **Phase 12 — Cycle 2 Release Validation: 12B ROLLOUT AUTHORIZED / IN PROGRESS.** Explicit user authorization was received on 2026-08-31 for the exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`. Execute only the contract-defined production bootstrap/enforcement, Auth/env/R2 rechecks, exact-candidate deployment, product smoke, cleanup and rollback/acceptance documentation."
)
replace_once(
    project,
    "**Status: `RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED`. PR #74 merged the execution contract as `c03e26c683c9c7c430c0e55cc306f5889f004844`; PR #75 merged the non-deploying release-verification machinery as `d6b8f386db3893e583c99b23fc3397b0eb377d42`. 12A is complete/verified; 12B deployment/production mutation is not authorized.**",
    "**Status: `ROLLOUT AUTHORIZED / IN PROGRESS`. PR #74 merged the execution contract as `c03e26c683c9c7c430c0e55cc306f5889f004844`; PR #75 merged the non-deploying release-verification machinery as exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`. Explicit user authorization for Phase 12B production rollout was received on 2026-08-31.**"
)

migration = "docs/ui/UI_MIGRATION.md"
replace_once(
    migration,
    "- [ ] Receive explicit user authorization for deployment/production mutation of the exact 12A-verified candidate. Without it, do not deploy.",
    "- [x] Receive explicit user authorization for deployment/production mutation of the exact 12A-verified candidate. Authorization received 2026-08-31 for `d6b8f386db3893e583c99b23fc3397b0eb377d42`."
)
replace_once(
    migration,
    "**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED`; PR #75 merged the verified release machinery/candidate to `main` as `d6b8f386db3893e583c99b23fc3397b0eb377d42`.",
    "**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `ROLLOUT AUTHORIZED / IN PROGRESS`; explicit user authorization was received 2026-08-31 for exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`."
)
replace_once(
    migration,
    "**Next sequence:** stop until explicit Phase 12B rollout authorization. If authorized, re-confirm UUID bootstrap/Closed-Beta enforcement, production Auth redirect posture, Vercel env contract and R2 exact-origin CORS; then deploy exactly verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`, smoke-test production, clean exact fixtures and record the rollout evidence.",
    "**Next sequence:** execute Phase 12B prerequisites and rollout for exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`: known-account UUID bootstrap + Closed-Beta enforcement, production Auth/env/R2 checks, exact-candidate deployment, production smoke, exact cleanup, rollback acceptance and authoritative evidence."
)
replace_once(
    migration,
    "**Deployment boundary:** Phase 12B remains blocked without explicit user authorization. 12A completed without Vercel deployment, production access-enforcement/bootstrap, hosted Auth, R2 or provider mutation.",
    "**Deployment boundary:** Phase 12B production mutation is explicitly authorized for the exact verified candidate only. Keep the existing READY deployment as rollback until acceptance; do not drift to newer code or unrelated infrastructure changes."
)
