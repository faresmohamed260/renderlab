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
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–11 and Phase 12A are complete/verified. Phase 12B is `ROLLOUT AUTHORIZED / IN PROGRESS` following explicit user authorization on 2026-08-31. The only deployable candidate remains exact verified SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42`; current production remains the older READY deployment at application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca` and is the defined rollback until rollout acceptance.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–11 and Phase 12A are complete/verified. Phase 12B is `ROLLOUT AUTHORIZED / BLOCKED ON SUPABASE AUTH CONFIG`. The exact deployable candidate remains `d6b8f386db3893e583c99b23fc3397b0eb377d42`. Known-account bootstrap is complete, but hosted Auth still rejects the production redirect and falls back to `http://localhost:3000`; no production enforcement or deployment may proceed until Site URL/redirect configuration is corrected and reverified. Current production remains the older READY deployment at application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca` and is the defined rollback.**"
)
replace_once(
    project,
    "- **Phase 12 — Cycle 2 Release Validation: 12B ROLLOUT AUTHORIZED / IN PROGRESS.** Explicit user authorization was received on 2026-08-31 for the exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`. Execute only the contract-defined production bootstrap/enforcement, Auth/env/R2 rechecks, exact-candidate deployment, product smoke, cleanup and rollback/acceptance documentation.",
    "- **Phase 12 — Cycle 2 Release Validation: 12B ROLLOUT AUTHORIZED / BLOCKED ON SUPABASE AUTH CONFIG.** Known-account bootstrap is complete, Vercel required production env keys are present, and production R2 exact-origin CORS recheck passed. Hosted Supabase Auth still resolves the requested custom-domain recovery redirect to `http://localhost:3000`, and the repository has no `SUPABASE_ACCESS_TOKEN` for the required Management API correction. Enforcement and deployment remain intentionally unstarted."
)
replace_once(
    project,
    "**Status: `ROLLOUT AUTHORIZED / IN PROGRESS`. PR #74 merged the execution contract as `c03e26c683c9c7c430c0e55cc306f5889f004844`; PR #75 merged the non-deploying release-verification machinery as exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`. Explicit user authorization for Phase 12B production rollout was received on 2026-08-31.**",
    "**Status: `ROLLOUT AUTHORIZED / BLOCKED ON SUPABASE AUTH CONFIG`. PR #74 merged the execution contract as `c03e26c683c9c7c430c0e55cc306f5889f004844`; PR #75 merged exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`; explicit Phase 12B authorization was received on 2026-08-31. Rollout preflight exposed a hosted Auth URL-configuration blocker before enforcement/deployment.**"
)
marker = "**12B — Authorized Production Rollout — NOT authorized by this contract**\n"
replace_once(
    project,
    marker,
    """**12B rollout preflight evidence — 2026-08-31**
- Known-account bootstrap completed against the sole persistent RenderLab account before enforcement: `renderlab_account_access` now has exactly one active account / one active admin and zero per-account generation overrides. The persistent account UUID remains private and is not repository documentation.
- Vercel production-env metadata preflight `33336831850` verified all seven required Supabase/R2 production keys are present; `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED` is the only missing rollout key and has **not** been created yet.
- Exact-candidate release preflight `33336966309` checked out `d6b8f386db3893e583c99b23fc3397b0eb377d42` and reconfirmed production R2 PUT preflight CORS for all four production aliases/custom-domain origins with no mutation.
- The same Auth preflight generated a run-owned recovery link without sending email and proved the requested `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password` redirect is rejected by hosted Auth and replaced with `http://localhost:3000`. This is a production release blocker for recovery and truthful invitation posture.
- Supabase Management API credential preflight `33337036024` confirmed `SUPABASE_ACCESS_TOKEN` is not configured in GitHub Actions. The connected Supabase tool can manage/query the database but does not expose hosted Auth Site URL / redirect-list mutation.
- Required correction before rollout resumes: set hosted Auth Site URL to `https://renderlab.faresuniform.uk`; add exact production redirect URLs `https://renderlab.faresuniform.uk/settings` and `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password` (Supabase recommends exact production paths), then rerun the no-email generate-link probe and confirm the custom-domain redirects are preserved.
- No Vercel closed-beta enforcement key was added, no new Vercel deployment was created, and the existing READY deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` remains production/rollback while this blocker is open.

**12B — Authorized Production Rollout — authorization received; currently blocked by the Auth configuration gate**
"""
)

migration = "docs/ui/UI_MIGRATION.md"
replace_once(
    migration,
    "#### 12B — Authorized Production Rollout — blocked until explicit authorization",
    "#### 12B — Authorized Production Rollout — authorized; blocked on hosted Supabase Auth URL configuration"
)
replace_once(
    migration,
    "- [ ] Resolve/verify known RenderLab UUID bootstrap + production closed-beta enforcement before treating invitation-only launch posture as production-consistent.",
    "- [ ] Known RenderLab account bootstrap is complete: exactly one active admin/access row with no generation override. Production closed-beta enforcement remains intentionally off until the hosted Auth URL blocker below is corrected and reverified."
)
replace_once(
    migration,
    "- [ ] Verify production Auth Site URL/redirect behavior and truthfully retain built-in-mail/custom-SMTP/leaked-password limitations that still block broader beta.",
    "- [ ] BLOCKER: run `33336966309` proved hosted Auth replaces the requested custom-domain recovery redirect with `http://localhost:3000`. Correct Site URL + exact production redirect allowlist, then rerun the no-email recovery/invite redirect probe. GitHub currently has no `SUPABASE_ACCESS_TOKEN` (`33337036024`)."
)
replace_once(
    migration,
    "- [ ] Reconfirm required Vercel environment contract and R2 exact-origin CORS; perform only explicitly authorized mutations.",
    "- [ ] Vercel env presence and R2 exact-origin CORS are reverified (`33336831850`, `33336966309`); all required production keys exist, R2 is clean, and only the not-yet-created closed-beta enforcement key remains pending after the Auth blocker clears."
)
replace_once(
    migration,
    "**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `ROLLOUT AUTHORIZED / IN PROGRESS`; explicit user authorization was received 2026-08-31 for exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`.",
    "**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `ROLLOUT AUTHORIZED / BLOCKED ON SUPABASE AUTH CONFIG`; exact verified candidate remains `d6b8f386db3893e583c99b23fc3397b0eb377d42`."
)
replace_once(
    migration,
    "**Next sequence:** execute Phase 12B prerequisites and rollout for exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`: known-account UUID bootstrap + Closed-Beta enforcement, production Auth/env/R2 checks, exact-candidate deployment, production smoke, exact cleanup, rollback acceptance and authoritative evidence.",
    "**Next sequence:** correct hosted Supabase Auth URL Configuration first: Site URL `https://renderlab.faresuniform.uk`; exact redirect URLs `https://renderlab.faresuniform.uk/settings` and `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password`. Reverify generated links preserve those redirects; only then add closed-beta enforcement, deploy exact candidate, smoke/cleanup and record acceptance."
)
replace_once(
    migration,
    "**Deployment boundary:** Phase 12B production mutation is explicitly authorized for the exact verified candidate only. Keep the existing READY deployment as rollback until acceptance; do not drift to newer code or unrelated infrastructure changes.",
    "**Deployment boundary:** rollout remains authorized for the exact verified candidate, but deployment/enforcement are blocked until the hosted Auth URL gate passes. Existing READY production remains rollback; do not drift to newer code or unrelated infrastructure changes."
)

infra = Path("docs/architecture/INFRASTRUCTURE.md")
text = infra.read_text()
heading = "### Phase 12B rollout preflight — Auth URL blocker — 2026-08-31"
if heading not in text:
    text += """

### Phase 12B rollout preflight — Auth URL blocker — 2026-08-31
Phase 12B received explicit rollout authorization for exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`, but production deployment remains blocked by hosted Supabase Auth URL configuration.

The sole persistent RenderLab account was bootstrapped before enforcement with one `renderlab_account_access` row: `admin` / `active`, no per-account generation overrides. Verification found exactly one active account and one active admin. The account UUID is operational/private data and is intentionally not copied into repository documentation. Closed-beta enforcement remains off.

Vercel preflight `33336831850` used the existing repository `VERCEL_TOKEN` without exposing it and verified all seven required production Supabase/R2 environment keys are present. `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED` is absent and intentionally remains absent while the Auth gate is open. No deployment was created.

Exact-candidate preflight `33336966309` checked out `d6b8f386db3893e583c99b23fc3397b0eb377d42` and passed read-only R2 CORS OPTIONS probes for `renderlab-lake.vercel.app`, `renderlab.faresuniform.uk` and the two canonical Vercel aliases. Its no-email Supabase Admin generate-link probe then requested recovery redirect `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password`; hosted Auth returned `redirect_to=http://localhost:3000`, proving the production redirect is not currently accepted and the Site URL remains a local fallback.

Supabase documents Site URL as the default redirect and requires `redirectTo` destinations to match the configured Redirect URLs. For production it recommends exact redirect paths. Before rollout resumes, configure Site URL `https://renderlab.faresuniform.uk` and exact redirects `https://renderlab.faresuniform.uk/settings` plus `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password`, then rerun the no-email link probe. Management API endpoint is `PATCH /v1/projects/rashyleshocuvpgcooxy/config/auth`, but GitHub Management API preflight `33337036024` confirmed no `SUPABASE_ACCESS_TOKEN` secret is currently available, and the connected Supabase tool does not expose hosted Auth URL mutation.

This blocker does not alter the broader-beta findings: built-in Supabase email/rate-limit posture and Free-plan leaked-password protection remain documented limitations. Existing production/rollback remains READY deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` at application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`. Do not add enforcement or deploy until the Auth URL probe passes.
"""
    infra.write_text(text)
