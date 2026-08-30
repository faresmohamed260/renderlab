from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


project = "PROJECT.md"
replace_once(
    project,
    "**Cycle 2 — Creative Productivity & Beta Maturity. Phases 6–11 and Phase 12A are complete/verified. Phase 12B is `ROLLOUT AUTHORIZED / BLOCKED ON SUPABASE AUTH CONFIG`. The exact deployable candidate remains `d6b8f386db3893e583c99b23fc3397b0eb377d42`. Known-account bootstrap is complete, but hosted Auth still rejects the production redirect and falls back to `http://localhost:3000`; no production enforcement or deployment may proceed until Site URL/redirect configuration is corrected and reverified. Current production remains the older READY deployment at application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca` and is the defined rollback.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity: `COMPLETE / VERIFIED`. Phases 6–12 are complete. Exact 12A-verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` is the accepted Closed-Beta production application at READY Vercel deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`. Hosted Auth production redirects are corrected and verified, Closed-Beta enforcement is active, bounded custom-domain production smoke passed, and exact run-owned cleanup/default restoration is verified.**",
)
replace_once(
    project,
    "Production closed-beta enforcement remains off pending explicit known-RenderLab UUID bootstrap.",
    "Production closed-beta enforcement was deliberately kept off through Phase 10 and was enabled only after the Phase 12B known-account bootstrap and Auth redirect gate passed; it is now active on the accepted Closed-Beta production deployment.",
)
replace_once(
    project,
    "- **Phase 12 — Cycle 2 Release Validation: 12B ROLLOUT AUTHORIZED / BLOCKED ON SUPABASE AUTH CONFIG.** Known-account bootstrap is complete, Vercel required production env keys are present, and production R2 exact-origin CORS recheck passed. Hosted Supabase Auth still resolves the requested custom-domain recovery redirect to `http://localhost:3000`, and the repository has no `SUPABASE_ACCESS_TOKEN` for the required Management API correction. Enforcement and deployment remain intentionally unstarted.",
    "- **Phase 12 — Cycle 2 Release Validation: COMPLETE / VERIFIED.** Exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` was deployed cleanly as READY production deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2` with `gitDirty=0`. Supabase Auth Site URL + exact invite/recovery redirects were corrected and no-email verified; Closed-Beta enforcement is active; custom-domain public/private media, durable upload/reuse, bounded Create Image, Activity Retry, Create Video and production-specific Admin checks passed; final Auth/data/admission/invitation residue is zero and generation defaults are restored to enabled / 1 active / 12 hourly / no updater. Cycle 2 is complete under the Closed-Beta operating boundary.",
)
replace_once(
    project,
    "**Status: `ROLLOUT AUTHORIZED / BLOCKED ON SUPABASE AUTH CONFIG`. PR #74 merged the execution contract as `c03e26c683c9c7c430c0e55cc306f5889f004844`; PR #75 merged exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`; explicit Phase 12B authorization was received on 2026-08-31. Rollout preflight exposed a hosted Auth URL-configuration blocker before enforcement/deployment.**",
    "**Status: `COMPLETE / VERIFIED`. PR #74 merged the execution contract as `c03e26c683c9c7c430c0e55cc306f5889f004844`; PR #75 merged exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`; Phase 12B authorization was received on 2026-08-31; the pre-deploy Auth blocker was corrected and the exact candidate is now the accepted Closed-Beta production release.**",
)

p = Path(project)
text = p.read_text()
anchor = "**12B — Authorized Production Rollout — authorization received; currently blocked by the Auth configuration gate**\n"
if anchor not in text:
    raise SystemExit("missing Phase 12B rollout anchor in PROJECT.md")
text = text.replace(
    anchor,
    """**12B — Authorized Production Rollout — COMPLETE / VERIFIED**

**Accepted production rollout evidence — 2026-08-31**
- Supabase Auth repair run `33337864235` corrected hosted Site URL from `http://localhost:3000` to `https://renderlab.faresuniform.uk`, preserved/installed the exact `/settings` and `/auth/confirm?type=recovery&next=/settings/password` redirect destinations, and then generated recovery + invite links without sending email to prove both custom-domain redirects were retained. Run-owned Auth fixtures were deleted.
- The sole persistent RenderLab account remains the Closed-Beta bootstrap: exactly one `admin` / `active` access row with no per-account generation override. Vercel production key `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED=true` is active only in the production environment.
- Production R2 exact-origin PUT preflight CORS remained verified from `33336966309`; required Vercel Supabase/R2 env keys were present from `33336831850`. No R2 policy mutation or provider/backend configuration change was required.
- Final clean Vercel deployment run `33338162385` deployed pristine exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` as `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; Vercel reported `READY`, the exact candidate SHA and `gitDirty=0`. Stable and custom aliases serve the release; `https://renderlab.faresuniform.uk/` returned HTTP 200 with HSTS and the verified Brand / Landing surface.
- Bounded production smoke `33338323520` passed public Landing/Create/Settings, Closed-Beta owner/privacy boundaries, browser-table denial, durable Create upload → Library → Viewer → Create reuse, real Create Image, historical failed-job Activity Retry with immutable history, and one real 5-second 480p Create Video. Generated/uploaded fixtures and R2 objects were exactly cleaned.
- The generic Admin verifier in `33338323520` reached its production-only last-admin assumption after all earlier Admin/UI checks passed: the persistent bootstrapped admin correctly meant the run-owned fixture admin was not the last active admin. Cleanup restored the fixture state. Production-specific follow-up `33338643898` then passed signed-out/member denial, active-admin settings/accounts/health/page access, self-lockout, member suspend/reactivate and exact cleanup without mutating the persistent admin.
- Production Admin screenshots from `33338323520` artifact `9739796661` (`sha256:b360b8674566d95d8ad34bb384fa97e302a7d7628de974bf6e307058cade165c`) were human-reviewed clean at desktop and 390px narrow with no clipping or broken control hierarchy.
- Final audit in `33338643898` proved **0** run-owned Auth fixture users, **0** non-persistent owner rows across jobs/sources/assets/upload sessions/collections, **0** admission reservations, **0** open beta invitations, exactly one active persistent admin with no overrides, and singleton generation defaults `enabled / 1 / 12 / updated_by null`.
- Vercel error/fatal runtime-log query over the rollout/smoke window returned no entries for final deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`.
- Pre-rollout deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` remains the documented rollback baseline. Automatic Git → Vercel deployment remains disabled; future production releases still require explicit release decisions rather than implicit docs-only `main` movement.
- Broader-beta limitations remain intentionally outside this Closed-Beta Cycle 2 acceptance: built-in Supabase mail/rate-limit posture and Free-plan leaked-password protection remain documented hardening work for any broader-access cycle.

""",
    1,
)
p.write_text(text)


migration = "docs/ui/UI_MIGRATION.md"
replace_once(
    migration,
    "#### 12B — Authorized Production Rollout — authorized; blocked on hosted Supabase Auth URL configuration",
    "#### 12B — Authorized Production Rollout — COMPLETE / VERIFIED",
)
replace_once(
    migration,
    "- [ ] Known RenderLab account bootstrap is complete: exactly one active admin/access row with no generation override. Production closed-beta enforcement remains intentionally off until the hosted Auth URL blocker below is corrected and reverified.",
    "- [x] Known RenderLab account bootstrap is complete: exactly one active admin/access row with no generation override; production Closed-Beta enforcement is now active after the Auth gate passed.",
)
replace_once(
    migration,
    "- [ ] BLOCKER: run `33336966309` proved hosted Auth replaces the requested custom-domain recovery redirect with `http://localhost:3000`. Correct Site URL + exact production redirect allowlist, then rerun the no-email recovery/invite redirect probe. GitHub currently has no `SUPABASE_ACCESS_TOKEN` (`33337036024`).",
    "- [x] Hosted Auth URL blocker resolved: `33337864235` set Site URL `https://renderlab.faresuniform.uk`, installed exact `/settings` and recovery-confirm redirects, and no-email generated recovery/invite links preserved both custom-domain destinations; temporary Auth fixtures were cleaned.",
)
replace_once(
    migration,
    "- [ ] Vercel env presence and R2 exact-origin CORS are reverified (`33336831850`, `33336966309`); all required production keys exist, R2 is clean, and only the not-yet-created closed-beta enforcement key remains pending after the Auth blocker clears.",
    "- [x] Vercel env presence and R2 exact-origin CORS reverified (`33336831850`, `33336966309`); all required production keys exist and the production-only Closed-Beta enforcement key is enabled.",
)
replace_once(
    migration,
    "- [ ] Deploy exactly the verified candidate; require READY state, aliases/custom-domain HTTPS, landing/routes/metadata, authenticated/private-media, durable upload/reuse, bounded Image+Video, Activity/Retry/Admin smoke and exact cleanup.",
    "- [x] Exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` deployed cleanly by `33338162385` as READY `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2` with `gitDirty=0`; custom-domain Landing/routes/privacy/durable upload+reuse/real Image+Retry+Video/Admin smoke passed across `33338323520` + production-specific follow-up `33338643898`.",
)
replace_once(
    migration,
    "- [ ] Keep `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` available as the pre-rollout rollback candidate until the new release is accepted.",
    "- [x] Pre-rollout deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` retained as the documented rollback baseline through rollout acceptance.",
)
replace_once(
    migration,
    "- [ ] Record actual production deployment SHA/ID, smoke/cleanup evidence and final infrastructure state before marking Phase 12 `COMPLETE / VERIFIED`.",
    "- [x] Production SHA/deployment ID, Auth/enforcement state, smoke evidence, runtime-log result, human Admin artifact review and exact zero-residue/default-restoration audit recorded; Phase 12 and Cycle 2 are `COMPLETE / VERIFIED`.",
)
replace_once(
    migration,
    "**Current cycle:** Cycle 2 — Creative Productivity & Beta Maturity is in progress; Phases 6–11 and Phase 12A are complete/verified.",
    "**Current cycle:** Cycle 2 — Creative Productivity & Beta Maturity is `COMPLETE / VERIFIED`; Phases 6–12 are complete.",
)
replace_once(
    migration,
    "**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `ROLLOUT AUTHORIZED / BLOCKED ON SUPABASE AUTH CONFIG`; exact verified candidate remains `d6b8f386db3893e583c99b23fc3397b0eb377d42`.",
    "**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `COMPLETE / VERIFIED`; exact accepted production application remains `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`.",
)
replace_once(
    migration,
    "**Next sequence:** correct hosted Supabase Auth URL Configuration first: Site URL `https://renderlab.faresuniform.uk`; exact redirect URLs `https://renderlab.faresuniform.uk/settings` and `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password`. Reverify generated links preserve those redirects; only then add closed-beta enforcement, deploy exact candidate, smoke/cleanup and record acceptance.",
    "**Next sequence:** Cycle 2 has no remaining release task. Start a separately scoped/contracted next cycle before broader-beta expansion or new feature work; do not silently fold post-Cycle-2 backlog into this completed release.",
)
replace_once(
    migration,
    "**Release reality:** exact merged release candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` is fully 12A-verified, while current READY production remains the older application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`. Automatic Git deployment is still disabled and 12A created no deployment.",
    "**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` is the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; docs-only `main` may advance beyond that application SHA. Automatic Git deployment remains disabled.",
)
replace_once(
    migration,
    "**Deployment boundary:** rollout remains authorized for the exact verified candidate, but deployment/enforcement are blocked until the hosted Auth URL gate passes. Existing READY production remains rollback; do not drift to newer code or unrelated infrastructure changes.",
    "**Deployment boundary:** Cycle 2 production rollout is accepted for exact application SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42`; Closed-Beta enforcement is active. Future deployment changes require a new explicit release scope and must not treat docs-only `main` as an implicitly verified application candidate.",
)
replace_once(
    migration,
    "**Broader-beta boundary:** built-in mail/rate-limit posture, unverified production Auth Site URL/redirect/template/sender/custom-SMTP posture and Free-plan leaked-password protection remain open until separately evidenced.",
    "**Broader-beta boundary:** production Auth Site URL and exact invite/recovery redirects are now verified. Built-in mail/rate-limit posture, custom-SMTP/sender productionization and Free-plan leaked-password protection remain separate broader-beta hardening work rather than Cycle 2 blockers.",
)


infra = Path("docs/architecture/INFRASTRUCTURE.md")
text = infra.read_text()
heading = "### Phase 12B accepted Closed-Beta production rollout — 2026-08-31"
if heading in text:
    raise SystemExit("Phase 12B accepted rollout section already exists")
text += """

### Phase 12B accepted Closed-Beta production rollout — 2026-08-31
Phase 12B is `COMPLETE / VERIFIED` for the Cycle 2 Closed-Beta operating boundary. Exact 12A-verified application SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42` is the accepted production application.

The earlier Auth URL blocker was resolved by run `33337864235`: Supabase hosted Auth Site URL is now `https://renderlab.faresuniform.uk`; exact production redirect destinations `https://renderlab.faresuniform.uk/settings` and `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password` are configured, and no-email generated invite/recovery links preserved those destinations. The sole persistent RenderLab account remains exactly one active admin with no per-account generation overrides. Vercel production `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED=true` is active.

Required production Supabase/R2 env presence was reconfirmed in `33336831850`; read-only exact-origin R2 CORS preflight passed in `33336966309`. Final clean deployment run `33338162385` deployed pristine exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` as Vercel deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`. Vercel reported `READY`, exact candidate SHA and `gitDirty=0`. Stable aliases and custom domain route to the release. `https://renderlab.faresuniform.uk/` returned HTTP 200 with HSTS and the Phase 11 Brand / Landing metadata/content. Error/fatal runtime-log inspection for the rollout/smoke window returned no entries.

Bounded production smoke `33338323520` ran against `https://renderlab.faresuniform.uk` while explicitly checking out the exact candidate. It passed public Landing/Create/Settings routes, signed-out denial and two-account ownership/privacy, browser-table denial, durable Create upload → Library → Viewer → Create reuse, real Create Image, failed-job Activity Retry with immutable history and a real 5-second 480p Create Video. All generated/uploaded smoke media, DB rows and R2 objects were cleaned. The generic Admin verifier then reached a production-only assumption: its run-owned admin was not the last active admin because the persistent bootstrapped admin correctly existed. All earlier Admin/UI assertions had passed and its cleanup completed. Production-specific Admin follow-up `33338643898` passed signed-out/member denial, active-admin Settings/Accounts/Health/Admin page, self-lockout, member suspend/reactivate and cleanup without mutating the persistent admin.

Production Admin artifact `9739796661` (`sha256:b360b8674566d95d8ad34bb384fa97e302a7d7628de974bf6e307058cade165c`) from `33338323520` was human-reviewed clean on desktop and 390px narrow: no horizontal clipping, broken controls or hierarchy regression. Final `33338643898` audit returned zero run-owned Auth fixture users, zero non-persistent owner rows across generation jobs/sources/media assets/upload sessions/collections, zero generation admission reservations and zero open beta invitations. Final access state is one active persistent admin with no overrides; singleton admission defaults are `generation_enabled=true`, `max_active_jobs=1`, `max_jobs_per_hour=12`, `updated_by=null`.

Pre-rollout deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` remains the documented rollback baseline. Automatic Git → Vercel deployments remain disabled. Documentation-only commits may place repository `main` ahead of deployed application SHA; this does not make the docs head an application release candidate. A future production release requires a separately verified candidate/release scope.

Closed-Beta Cycle 2 acceptance does not resolve broader-beta Auth hardening. Supabase built-in mail/rate-limit posture and Free-plan leaked-password protection remain documented limitations; custom SMTP/sender/template productionization belongs to a separately scoped broader-access cycle.
"""
infra.write_text(text)
