from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


# PROJECT.md
project = Path("PROJECT.md")
text = project.read_text()
old_priority = "**Cycle 2 — Creative Productivity & Beta Maturity: `COMPLETE / VERIFIED`. Phases 6–12 are complete. Exact 12A-verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` is the accepted Closed-Beta production application at READY Vercel deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`. Hosted Auth production redirects are corrected and verified, Closed-Beta enforcement is active, bounded custom-domain production smoke passed, and exact run-owned cleanup/default restoration is verified.**"
new_priority = "**Cycle 2 — Creative Productivity & Beta Maturity remains `COMPLETE / VERIFIED`. Cycle 3 — Beta Operations & Access Reliability is now planned, with Phase 13 — Email & Invite Production Hardening `CONTRACTED / NOT STARTED`. Production remains the accepted Closed-Beta application `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; this planning contract authorizes no SMTP, DNS, hosted Auth, Vercel or application mutation.**"
if old_priority not in text:
    raise SystemExit("missing Current Priority anchor in PROJECT.md")
text = text.replace(old_priority, new_priority, 1)

scope_anchor = """### Cycle 2 scope boundary
Cycle 2 now explicitly includes Create v2 reference/geometry/composer work, verified Director-video productization, curated Video resolution, Library/Activity productivity, privileged closed-beta admin operations, and brand/launch work. It still does **not** approve generic Models or Workflows screens, ComfyUI graph editing, ordinary-user provider/worker management, arbitrary workflow-parameter forms, inpainting/outpainting, structural guidance, workflow chaining, a full billing system, a global media client store or a cross-page selection framework without separate evidence/decisions.
"""
phase13 = """

### Cycle 3 — Beta Operations & Access Reliability
**Status: `PLANNED`.** Cycle 2 remains complete. Cycle 3 begins with one execution-ready phase only; later Cycle 3 work remains undefined until current evidence justifies it.

- **Phase 13 — Email & Invite Production Hardening: `CONTRACTED / NOT STARTED`.** Make RenderLab's already-implemented admin-invite and password-recovery flows dependable for real external Closed-Beta users by replacing Supabase's built-in development-oriented mail posture with a production-capable transactional delivery path, authenticated sender domain, exact token-hash templates, bounded rate limits and live delivery evidence. This contract does not authorize implementation or production mutation by itself.

### Phase 13 execution contract — Email & Invite Production Hardening
**Status: `CONTRACTED / NOT STARTED`. Planning/documentation only until the user explicitly authorizes implementation and any required vendor/DNS/Auth production changes.**

**Goal / user value**
- Make an admin-issued RenderLab invite reliably reach a real recipient, complete on `renderlab.faresuniform.uk`, claim the intended invitation and yield only the access state the admin granted.
- Make password recovery reliably reach an existing RenderLab user and complete through the verified SSR token-hash flow without localhost fallback, open redirects, link rewriting or stale-session bypass.
- Give the operator a supportable email posture: known sender identity, authenticated DNS, documented rate limits, provider delivery/bounce visibility and bounded credentials instead of relying on Supabase's built-in Auth mailer.

**Verified starting state**
- Cycle 2 production is accepted at application SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42` / READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; Closed-Beta enforcement is active and automatic Git → Vercel deployment remains disabled.
- Admin invitation creation/revocation, RenderLab invitation records, member/admin access transitions, suspension/reactivation, no-public-sign-up behavior and password-recovery completion are already implemented and configured-test verified. Phase 13 must harden delivery rather than invent a second admission system.
- Hosted Supabase Auth Site URL is `https://renderlab.faresuniform.uk`; exact production redirects for `/settings` and `/auth/confirm?type=recovery&next=/settings/password` were corrected and no-email generate-link verified during Phase 12B.
- Phase 10D live evidence showed the project using Supabase's built-in Auth sender `noreply@mail.app.supabase.io` and then hitting `429 over_email_send_rate_limit`; that posture was explicitly accepted only for Closed-Beta technical validation, not external-user deliverability.
- Regular CI intentionally does not depend on real email delivery. Deterministic Auth/link/security tests must remain provider-cheap and self-cleaning; live inbox tests belong to a bounded operator-gated acceptance run.
- Free-plan leaked-password protection remains a separate broader-beta security limitation. Phase 13 must not claim to solve it through email work.

**In scope**
1. **Read-only production email/Auth baseline.** Audit current Supabase Auth mail configuration, Site URL/redirect allowlist, invite/recovery template bodies, SMTP or Send Email Auth Hook state, sender/from identity, Auth email rate limits and any retained Management API credential requirement before changing anything. Record facts, not assumptions.
2. **Delivery architecture decision.** Choose one production transactional path: Supabase custom SMTP backed by a transactional provider, or an equivalent Supabase Send Email Auth Hook when an API-based provider integration is materially better. Provider selection, account creation/paid-plan acceptance and sender address remain explicit operator decisions; do not silently enroll or purchase a service.
3. **Sender-domain authentication.** Use a dedicated RenderLab transactional sender identity under `faresuniform.uk` (exact local-part/subdomain chosen during implementation). Add only provider-required DNS records through the existing Cloudflare zone, preserving unrelated records. Maintain one valid SPF policy, install provider DKIM, and establish DMARC with an explicit policy/aggregate-reporting decision. Verify public DNS and provider authentication state before live acceptance.
4. **Exact invite/recovery templates.** Keep the existing SSR token-hash contract and no-public-sign-up boundary. Production templates must resolve through `{{ .SiteURL }}` and `/auth/confirm`, with invite using `token_hash={{ .TokenHash }}&type=invite&next=/settings` and recovery using `token_hash={{ .TokenHash }}&type=recovery&next=/settings/password`. Do not substitute raw provider confirmation URLs or a client-only token flow.
5. **Transactional message quality.** Give invite and recovery mail concise RenderLab-branded subjects/body copy, a visible reason the recipient is receiving the message, the intended action, expiry/security guidance where supported, and a plain fallback URL. Avoid marketing content, tracking pixels and unrelated product claims in authentication mail.
6. **Link integrity.** Disable provider click/link tracking or any feature that rewrites authentication URLs. Preserve HTTPS custom-domain destinations, token integrity and existing same-origin/hostile-`next` protections.
7. **Rate limits and abuse posture.** Set/document suitable Supabase Auth email limits for a small invitation-only beta and the chosen provider's sending constraints. Admin invites remain privileged; recovery remains enumeration-safe. Do not add public resend/sign-up mechanics merely to consume the new mail capacity.
8. **Delivery observability.** Establish a bounded operator path to inspect accepted/delivered/bounced/complained events without exposing message bodies, tokens or provider credentials through RenderLab Admin responses or repository logs.
9. **Live end-to-end acceptance.** Use run-owned/test recipients supplied or controlled by the operator. Prove at least two independent mailbox providers where practical (prefer Gmail + Outlook or equivalent): real invite receipt → RenderLab confirmation → intended active access; real recovery receipt → password replacement → intended current-session/stale-session behavior; consumed/revoked/invalid links fail closed. Check Inbox/Spam placement and provider delivery events rather than treating API acceptance as delivery.
10. **Cleanup and credential hygiene.** Remove all run-owned Auth/access/invitation fixtures after acceptance, restore generation defaults, and verify no foreign-owner residue. Keep provider/SMTP/API credentials only in approved secret stores. Review whether the Supabase Management API token used for bounded configuration should remain, be narrowed/rotated, or be removed after the phase; never document secret values.

**Out of scope**
- Public sign-up, waitlist/product-led onboarding, marketing/newsletter mail, invitations to arbitrary shared-Supabase users, MFA/CAPTCHA, billing, account deletion, social login or a general notification system.
- A redesign of Landing, Settings or Admin. Existing UI-051/UI-052 account/admin/launch contracts remain authoritative; only the smallest copy/error-state correction is allowed if live email evidence exposes a concrete product defect.
- Fixing Free-plan leaked-password protection, purchasing a broader Supabase plan solely for that warning, or treating unrelated Security Advisor INFO as Phase 13 work.
- Provider/worker/generation changes, R2 changes, schema migrations or a Vercel application deployment unless a verified email-flow product defect requires the smallest code fix. Any code fix creates a new exact candidate and must run its affected validation before deployment.

**Implementation sequence**
- **13A — Audit & operator decisions:** read-only configuration/DNS audit; choose provider/delivery mechanism, sender identity, DMARC posture and live-test inbox set; identify required credentials/costs before mutation.
- **13B — Sender & delivery configuration:** authenticate DNS, configure provider + Supabase SMTP/Send Email Hook, set sender/from/reply posture, set bounded Auth email limits and verify management read-back.
- **13C — Template & link hardening:** install/review exact invite/recovery token-hash templates, disable link rewriting/tracking and re-run deterministic generate-link/negative security verification without real sends.
- **13D — Live delivery acceptance:** send bounded real invite/recovery messages, complete browser flows on `renderlab.faresuniform.uk`, inspect delivery/bounce events, clean fixtures, re-audit production state and record exact evidence.

**Validation / acceptance evidence**
- Read-back of the actual Supabase Auth mail/template/rate-limit configuration without exposing credentials.
- Public DNS proof for the exact provider-required SPF/DKIM/DMARC records and provider-side sender/domain verification.
- Deterministic CI or one-off remote verification that token-hash invite/recovery links preserve `renderlab.faresuniform.uk`, reject hostile redirects, reject consumed/invalid/revoked tokens and leave public sign-up unavailable; regular CI continues to avoid actual email delivery.
- Bounded live mailbox evidence for invite and recovery, including delivered/received state and successful browser completion on the production custom domain. Do not commit recipient addresses, auth tokens or raw provider logs containing sensitive values.
- Final Supabase audit: no run-owned Auth/access/invitation/admission/media/generation residue; sole persistent admin unchanged; generation defaults restored to enabled / 1 active / 12 hourly / no updater.
- If application code changes, affected repository gates and responsive review must pass on one exact candidate before any Vercel deployment. If configuration-only, no Vercel deployment is required.

**Exit criteria**
- Production Auth no longer depends on the built-in `noreply@mail.app.supabase.io` delivery posture for RenderLab invite/recovery mail.
- One documented production sender identity is authenticated and verified; SPF is valid, DKIM passes and DMARC posture is explicitly recorded.
- Invite and recovery templates use the accepted RenderLab SSR token-hash confirmation paths, preserve exact custom-domain redirects and are not rewritten by click tracking.
- Actual Supabase/provider mail limits are documented and suitable for the invitation-only beta; admin invite and recovery abuse boundaries remain intact.
- At least one full real invite lifecycle and one full real recovery lifecycle complete from delivered external email on `renderlab.faresuniform.uk`; delivery evidence covers at least two mailbox providers where practical or records the exact operator limitation if not available.
- Bounce/delivery inspection is operational, test fixtures are removed, privileged credentials are stored/narrowed appropriately, and authoritative docs record provider, sender/domain posture, exact configuration evidence and any deferred broader-beta work.
- Only after all exit criteria are verified may Phase 13 be marked `COMPLETE / VERIFIED`. The planning PR itself does not satisfy or authorize these criteria.
"""
if scope_anchor not in text:
    raise SystemExit("missing Cycle 2 scope anchor in PROJECT.md")
text = text.replace(scope_anchor, scope_anchor + phase13, 1)

old_current = """## Current Work
**Current cycle:** Cycle 2 — Creative Productivity & Beta Maturity is `COMPLETE / VERIFIED`; Phases 6–12 are complete.
**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `COMPLETE / VERIFIED`; exact accepted production application remains `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`.
**Next sequence:** Cycle 2 has no remaining release task. Start a separately scoped/contracted next cycle before broader-beta expansion or new feature work; do not silently fold post-Cycle-2 backlog into this completed release.
**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` is the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; docs-only `main` may advance beyond that application SHA. Automatic Git deployment remains disabled.
**Deployment boundary:** Cycle 2 production rollout is accepted for exact application SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42`; Closed-Beta enforcement is active. Future deployment changes require a new explicit release scope and must not treat docs-only `main` as an implicitly verified application candidate.
**Broader-beta boundary:** production Auth Site URL and exact invite/recovery redirects are now verified. Built-in mail/rate-limit posture, custom-SMTP/sender productionization and Free-plan leaked-password protection remain separate broader-beta hardening work rather than Cycle 2 blockers.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter library remains out of Phase 12.
"""
new_current = """## Current Work
**Current cycle:** Cycle 3 — Beta Operations & Access Reliability is `PLANNED`; Cycle 2 remains `COMPLETE / VERIFIED`.
**Current phase contract:** Phase 13 — Email & Invite Production Hardening is `CONTRACTED / NOT STARTED`.
**Next sequence:** await explicit Phase 13 implementation authorization. Once authorized, begin with 13A read-only Auth/mail/DNS audit and operator decisions before any SMTP/provider/DNS/template/rate-limit mutation.
**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` remains the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; docs-only `main` may advance beyond that application SHA. Automatic Git deployment remains disabled.
**Deployment boundary:** this Phase 13 planning contract authorizes no production mutation and no Vercel deployment. Configuration-only Phase 13 execution should require no app deployment; any verified code fix must create/revalidate a new exact candidate before rollout.
**Broader-beta boundary:** Phase 13 targets the built-in Auth mailer/rate-limit/sender-domain/template-deliverability gap. Free-plan leaked-password protection remains a separate security hardening item and must not be relabeled complete by this phase.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter library remains outside Phase 13 and is not silently included in Cycle 3 planning.
"""
if old_current not in text:
    raise SystemExit("missing Current Work block in PROJECT.md")
text = text.replace(old_current, new_current, 1)
project.write_text(text)


# docs/ui/UI_MIGRATION.md
migration = Path("docs/ui/UI_MIGRATION.md")
text = migration.read_text()
cycle2_anchor = """### Cycle 2 explicit non-commitments
Cycle 2 does not include the future LoRA/Civitai/Hugging Face library/adapter system, generic Models/Workflows screens, ComfyUI graph editing, ordinary-user provider/worker management, arbitrary workflow-parameter generation, inpainting/outpainting, pose/depth/edge guidance, workflow chaining, full billing, a global media client store or cross-page selection. LoRA/model-adapter support is now an accepted post-Cycle-2 direction rather than an ignored idea. Safe cancellation and Trash/restore remain contingent on their own evidence/decisions.
"""
phase13_ui = """

## Phase 13 — Email & Invite Production Hardening — CONTRACTED / NOT STARTED
Phase 13 is the first contracted phase of Cycle 3 — Beta Operations & Access Reliability. It is primarily an Auth/email/infrastructure hardening phase, not a screen redesign. Existing UI-051 Account/Admin and UI-052 Brand/Launch contracts remain authoritative unless live delivery evidence proves a concrete product defect.

### Required execution evidence
- [ ] Audit actual production Supabase Auth Site URL/redirects, invite/recovery templates, built-in/custom mail state, sender identity, email rate limits and management-credential requirements read-only before mutation.
- [ ] Choose one operator-approved production transactional delivery path (custom SMTP or equivalent Send Email Auth Hook), provider account/plan and RenderLab sender identity under `faresuniform.uk`.
- [ ] Add/verify only provider-required sender-domain DNS: one valid SPF posture, provider DKIM and explicit DMARC policy/reporting; preserve unrelated Cloudflare DNS records.
- [ ] Configure Supabase/provider sender/from/reply posture and bounded invitation-only Auth email limits; record actual values without exposing credentials.
- [ ] Install/review exact SSR token-hash invite template using `/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/settings` through `{{ .SiteURL }}`.
- [ ] Install/review exact SSR token-hash recovery template using `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/settings/password` through `{{ .SiteURL }}`.
- [ ] Disable provider link/click tracking or any URL rewriting that could mutate Auth links; preserve existing hostile-`next`, invalid/consumed token and no-public-sign-up protections.
- [ ] Keep regular CI independent of live mail. Re-run deterministic generate-link/security coverage after config changes with exact fixture cleanup.
- [ ] Run a bounded operator-gated live invite lifecycle from Admin → delivered external email → `renderlab.faresuniform.uk` confirmation → intended active access; verify revoke/consumed failure behavior where practical.
- [ ] Run a bounded operator-gated real recovery lifecycle → delivered external email → password replacement → current/stale-session behavior on the production domain.
- [ ] Cover at least two independent mailbox providers where practical (prefer Gmail + Outlook or equivalent), inspect Inbox/Spam placement plus provider delivery/bounce events, and record any operator limitation rather than inventing coverage.
- [ ] Verify final cleanup/defaults: zero run-owned Auth/access/invitation/admission/media/generation residue, sole persistent admin unchanged, generation defaults enabled / 1 / 12 / no updater.
- [ ] Review provider/API/Management credentials after acceptance; keep them only in approved secret stores and narrow/rotate/remove temporary privileged credentials when no longer required.
- [ ] Record exact provider/sender/DNS/template/rate-limit/live-delivery evidence in `PROJECT.md` and `docs/architecture/INFRASTRUCTURE.md` before marking Phase 13 `COMPLETE / VERIFIED`.

### Scope guardrails
- Planning does not authorize SMTP/provider signup or purchase, DNS mutation, hosted Auth mutation, email sending, Vercel deployment or application changes.
- Do not add public sign-up, waitlist, newsletter/marketing mail, MFA/CAPTCHA, general notifications or a second invitation/admission model.
- Do not redesign Landing, Settings or Admin for this phase. Make only evidence-driven copy/error-state fixes if live delivery exposes a real defect.
- Do not treat Free-plan leaked-password protection as an email deliverability task; it remains separate broader-beta security work.
- Configuration-only completion requires no Vercel deployment. Any necessary application code fix creates a new exact candidate and requires affected validation before rollout.
"""
if cycle2_anchor not in text:
    raise SystemExit("missing Cycle 2 non-commitments anchor in UI_MIGRATION.md")
text = text.replace(cycle2_anchor, cycle2_anchor + phase13_ui, 1)

old_migration_current = """## Current Work
**Current cycle:** Cycle 2 — Creative Productivity & Beta Maturity is `COMPLETE / VERIFIED`; Phases 6–12 are complete.
**Current phase contract:** Phase 12 — Cycle 2 Release Validation is `COMPLETE / VERIFIED`; exact accepted production application remains `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`.
**Next sequence:** Cycle 2 has no remaining release task. Start a separately scoped/contracted next cycle before broader-beta expansion or new feature work; do not silently fold post-Cycle-2 backlog into this completed release.
**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` is the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; docs-only `main` may advance beyond that application SHA. Automatic Git deployment remains disabled.
**Deployment boundary:** Cycle 2 production rollout is accepted for exact application SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42`; Closed-Beta enforcement is active. Future deployment changes require a new explicit release scope and must not treat docs-only `main` as an implicitly verified application candidate.
**Broader-beta boundary:** production Auth Site URL and exact invite/recovery redirects are now verified. Built-in mail/rate-limit posture, custom-SMTP/sender productionization and Free-plan leaked-password protection remain separate broader-beta hardening work rather than Cycle 2 blockers.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter library remains out of Phase 12.
"""
new_migration_current = """## Current Work
**Current cycle:** Cycle 3 — Beta Operations & Access Reliability is `PLANNED`; Cycle 2 remains `COMPLETE / VERIFIED`.
**Current phase contract:** Phase 13 — Email & Invite Production Hardening is `CONTRACTED / NOT STARTED`.
**Next sequence:** implementation is authorization-gated. Start with read-only 13A Auth/mail/DNS audit and provider/sender/DMARC/live-inbox decisions before any production email configuration change.
**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` remains the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; docs-only `main` may advance beyond that application SHA. Automatic Git deployment remains disabled.
**Deployment boundary:** the Phase 13 contract itself changes no production configuration. Prefer configuration-only execution; if a verified application defect requires code, revalidate one exact candidate before any Vercel rollout.
**Broader-beta boundary:** Phase 13 is specifically responsible for production-capable invite/recovery delivery, sender-domain authentication, templates, rate limits and live mailbox evidence. Leaked-password protection remains separate.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter work is outside Phase 13.
"""
if old_migration_current not in text:
    raise SystemExit("missing Current Work block in UI_MIGRATION.md")
text = text.replace(old_migration_current, new_migration_current, 1)
migration.write_text(text)


# docs/architecture/INFRASTRUCTURE.md
infra = Path("docs/architecture/INFRASTRUCTURE.md")
text = infra.read_text()
old_rules = """## Infrastructure Operating Rules
No infrastructure rollout is currently queued by the repository. Cycle 2 Phase 6 baseline evidence is complete pending the user-approved operating boundary; no Phase 7 implementation or production rollout is authorized by that audit.
"""
new_rules = """## Infrastructure Operating Rules
Cycle 2 production is accepted and Phase 13 — Email & Invite Production Hardening is `CONTRACTED / NOT STARTED` as the first planned Cycle 3 phase. The Phase 13 planning contract authorizes no SMTP/provider signup or purchase, Cloudflare DNS mutation, hosted Supabase Auth mutation, live email send, Vercel deployment or application change until the user explicitly authorizes implementation.
"""
if old_rules not in text:
    raise SystemExit("missing Infrastructure Operating Rules intro")
text = text.replace(old_rules, new_rules, 1)

heading = "### Phase 13 Email & Invite Production Hardening infrastructure contract — 2026-08-31"
if heading in text:
    raise SystemExit("Phase 13 infrastructure contract already exists")
text += f"""

{heading}
**Status: `CONTRACTED / NOT STARTED`.** This section defines the infrastructure acceptance boundary only; it does not authorize production mutation.

Current Closed-Beta production already has the application-side admission and security contract needed for external invites: admin-only invitation creation/revocation, server-owned `renderlab_beta_invitations`, active account enforcement, fresh Auth-backed private authorization, token-hash invite/recovery confirmation and no public sign-up. Phase 12B corrected hosted Auth Site URL to `https://renderlab.faresuniform.uk` and verified exact invite/recovery redirects. The remaining weakness is mail delivery infrastructure, not account ownership architecture.

Phase 10D live evidence showed Supabase built-in Auth delivery from `noreply@mail.app.supabase.io` and an `over_email_send_rate_limit` response. That built-in posture remains acceptable for deterministic technical verification only; Phase 13 must replace it for production invite/recovery delivery before broader external-beta reliance.

Accepted Phase 13 infrastructure sequence:
1. Read actual hosted Auth mail/template/rate-limit state and current `faresuniform.uk` sender DNS before mutation. Reuse the approved shared Supabase project; do not create another Auth project.
2. Operator selects and provisions one production transactional delivery mechanism: Supabase custom SMTP with a transactional provider, or an equivalent Supabase Send Email Auth Hook. Vendor/account/plan choice and costs require explicit operator acceptance.
3. Establish one RenderLab transactional sender identity under `faresuniform.uk`. Provider-required DNS must be applied through the existing Cloudflare zone with preservation of unrelated records: avoid multiple SPF records, verify provider DKIM, and configure/document DMARC policy/reporting. DNS authentication must be publicly resolved and provider-verified before live acceptance.
4. Configure Supabase/provider sender/from/reply posture, bounded invitation-only email limits and invite/recovery templates. Templates must use the existing SSR token-hash paths through `{{{{ .SiteURL }}}}`: invite `/auth/confirm?token_hash={{{{ .TokenHash }}}}&type=invite&next=/settings`; recovery `/auth/confirm?token_hash={{{{ .TokenHash }}}}&type=recovery&next=/settings/password`.
5. Disable click/link tracking or URL rewriting for Auth mail. Authentication tokens, raw confirmation URLs, provider keys and recipient addresses must not be emitted into repository logs or durable docs.
6. Keep normal CI free of real email delivery. Use generate-link and browser/security tests for deterministic coverage; reserve actual sends for a bounded operator-gated acceptance run.
7. Live acceptance must cover real external receipt and browser completion for an invite and recovery on `renderlab.faresuniform.uk`, with at least two independent mailbox providers where practical, provider delivery/bounce evidence, Inbox/Spam observation, consumed/revoked/invalid-link failure and exact fixture cleanup.
8. Final audit preserves the sole persistent production admin, zero run-owned access/invitation/Auth/admission/media/generation residue and generation defaults enabled / 1 active / 12 hourly / no updater.
9. Credential hygiene is part of acceptance. SMTP/API/management credentials remain secret-store-only. Any privileged Supabase Management API credential used for bounded configuration must be reviewed after the phase and narrowed, rotated or removed when continuing retention is not justified.

Phase 13 requires no Supabase database migration, R2 change, worker/provider-generation change or Vercel deployment when completed purely as email/Auth/DNS configuration. If live testing exposes an application defect, make only the smallest code correction, validate a new exact application candidate through affected gates and obtain deployment authorization before replacing the accepted Cycle 2 production build.

The Free-plan leaked-password-protection warning is intentionally separate from this email phase. Phase 13 may improve delivery reliability and sender trust, but it must not claim broader-beta security completion until leaked-password protection and any other separately contracted requirements are actually resolved.
"""
infra.write_text(text)
