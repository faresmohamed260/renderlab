from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


# PROJECT.md
replace_once(
    "PROJECT.md",
    "with 13A read-only audit and 13B sender/delivery configuration both `COMPLETE / VERIFIED`; 13C branded template/link hardening is next.",
    "with 13A read-only audit and 13B sender/delivery configuration both `COMPLETE / VERIFIED`; 13C branded template/link hardening is `BLOCKED` on the verified Brevo Free-plan link-rewriting constraint pending an operator provider/plan decision.",
)
replace_once(
    "PROJECT.md",
    "and 13C exact branded invite/recovery template + link hardening is next. Real mailbox acceptance remains 13D.",
    "and 13C exact branded invite/recovery template + link hardening is `BLOCKED`: the current Brevo Free account cannot satisfy the accepted no-rewrite Auth-link contract. Real mailbox acceptance remains 13D and must not start until 13C clears.",
)
replace_once(
    "PROJECT.md",
    "**Status: `IN PROGRESS`. 13A and 13B are `COMPLETE / VERIFIED`; 13C is next. The provider/DNS/Auth production changes required by 13B were explicitly authorized and have been applied/verified. This does not authorize unrelated product changes, Vercel deployment or unbounded real-email sending.**",
    "**Status: `IN PROGRESS`. 13A and 13B are `COMPLETE / VERIFIED`; 13C preflight is `BLOCKED` on the verified Brevo Free-plan transactional link-rewriting constraint. The provider/DNS/Auth production changes required by 13B were explicitly authorized and have been applied/verified. Do not install token-bearing invite/recovery templates, send real Auth email, switch providers, purchase/upgrade a plan, change application code or deploy until the operator selects the smallest acceptable resolution.**",
)
project_anchor = "**13B result:** `COMPLETE / VERIFIED`. **Next:** 13C installs the accepted branded token-hash invite/recovery templates, verifies link integrity/tracking posture and re-runs deterministic Auth security coverage without live mailbox sends."
project_block = project_anchor + """

### Phase 13C link-integrity preflight — BLOCKED 2026-08-31
- Read-only run `33401336576` passed from `work/phase-13c-template-preflight`; it changed no Brevo, Supabase, DNS, application or deployment state and sent no email.
- The live Brevo account reports `enterprise=false`, plan `free`, with transactional relay present. Hosted Supabase Auth still reads back the verified 13B custom SMTP/From/rate-limit/Site URL/redirect state; invite and recovery templates remain the default `{{ .ConfirmationURL }}` bodies with no RenderLab branding or token-hash custom link installed.
- Current Brevo transactional behavior redirects links for click tracking by default. Brevo's anonymous-tracking setting still records aggregate clicks and therefore does not satisfy the UI-053 requirement that Auth URLs are not rewritten. Brevo staff guidance states full transactional tracking disablement is available only upon request for Enterprise accounts; this account is not Enterprise.
- Supabase's current Auth email-template guidance explicitly warns that external email tracking can overwrite confirmation links and recommends disabling provider tracking. That warning aligns with UI-053 and the Phase 13 link-integrity contract.
- Therefore 13C must not install token-bearing invite/recovery templates into the current Brevo Free SMTP path. Proceeding would knowingly violate the accepted no-rewrite security/UX boundary.
- **Operator decision required to unblock 13C:** either move Brevo to a plan/support posture that can verify transactional click tracking is fully disabled, or approve a transactional provider change to one that can prove no URL rewriting. No provider switch, purchase or application-flow redesign is implied by this blocker record.
"""
replace_once("PROJECT.md", project_anchor, project_block)

# docs/ui/UI_MIGRATION.md
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "13A read-only audit and 13B sender/delivery configuration are `COMPLETE / VERIFIED`; 13C branded template/link hardening is next.",
    "13A read-only audit and 13B sender/delivery configuration are `COMPLETE / VERIFIED`; 13C branded template/link hardening is `BLOCKED` on the verified Brevo Free-plan link-rewriting constraint pending an operator provider/plan decision.",
)
ui_anchor = "- 13B introduced no application code, database migration, R2/provider-generation change or Vercel deployment. 13C is now the next execution slice."
ui_block = ui_anchor.replace("13C is now the next execution slice.", "13C preflight is the current execution slice and is blocked before template mutation.") + """

### 13C link-integrity preflight — BLOCKED 2026-08-31
- Read-only run `33401336576` passed with no production mutation or email send. Brevo account read-back is Free / non-Enterprise; Supabase still has the verified 13B SMTP state and default `{{ .ConfirmationURL }}` invite/recovery templates.
- Brevo transactional click tracking rewrites links by default. Anonymous tracking still retains aggregate click tracking, while full transactional tracking disablement is documented by Brevo staff as an Enterprise/support capability. The active account therefore cannot currently prove the UI-053 no-rewrite requirement.
- Supabase warns that external provider tracking can overwrite Auth links. Do not install the token-hash templates or begin 13D live delivery while this constraint is unresolved.
- Unblocking requires an explicit operator choice: verified Brevo tracking disablement through an eligible plan/support path, or an approved provider change with proven no-rewrite Auth links.
"""
replace_once("docs/ui/UI_MIGRATION.md", ui_anchor, ui_block)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current phase:** Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`; 13A and 13B are `COMPLETE / VERIFIED`; 13C branded template/link hardening is next.",
    "**Current phase:** Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`; 13A and 13B are `COMPLETE / VERIFIED`; 13C branded template/link hardening is `BLOCKED` pending the no-rewrite provider/plan decision.",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Next sequence:** install/review the professional RenderLab invite and recovery token-hash HTML templates, verify provider/link-tracking posture so Auth URLs are not rewritten, then run deterministic generate-link and negative security coverage without real email. 13D remains the later bounded live-mailbox acceptance slice.",
    "**Next sequence:** resolve the 13C provider link-rewriting gate first. After a provider path can prove Auth links are not rewritten, install/review the professional RenderLab invite and recovery token-hash HTML templates and run deterministic generate-link/negative security coverage without real email. 13D remains the later bounded live-mailbox acceptance slice and must not start while 13C is blocked.",
)

# docs/architecture/INFRASTRUCTURE.md
replace_once(
    "docs/architecture/INFRASTRUCTURE.md",
    "**Status: `IN PROGRESS`; 13A and 13B `COMPLETE / VERIFIED`, 13C next.** 13A was read-only; 13B applied and verified only Brevo/Cloudflare/Supabase Auth mail configuration and sent no real email.",
    "**Status: `IN PROGRESS`; 13A and 13B `COMPLETE / VERIFIED`, 13C `BLOCKED`.** 13A was read-only; 13B applied and verified only Brevo/Cloudflare/Supabase Auth mail configuration and sent no real email. 13C preflight verified that the active Brevo Free account cannot currently satisfy the accepted no-rewrite Auth-link requirement.",
)
infra_anchor = "- 13B deliberately did not change invite/recovery template bodies, send a real Auth message, change application code/schema/R2/generation infrastructure or create a Vercel deployment. Template/link hardening is 13C; real external delivery acceptance is 13D."
infra_block = infra_anchor + """

#### Phase 13C link-integrity preflight — blocked 2026-08-31
- Read-only GitHub Actions run `33401336576` used the existing Brevo API and Supabase Management credentials only for GET/read operations. It logged no account PII, template bodies, recipient addresses or secret values and sent no message.
- Brevo account capability read-back: `enterprise=false`, plan `free`, transactional relay present. Supabase read-back remained exact for the 13B custom SMTP host/From identity, `rate_limit_email_sent=30`, production Site URL and invite/recovery allowlist. Invite/recovery bodies remain the unmodified Supabase defaults using `{{ .ConfirmationURL }}`.
- Brevo's current transactional-email behavior uses link redirection for click tracking. Anonymous tracking still measures aggregate clicks, so it does not remove URL rewriting. Brevo staff guidance limits complete transactional tracking disablement to Enterprise accounts upon request; the active RenderLab account is Free.
- Supabase's current hosted Auth template documentation warns that external email tracking can overwrite confirmation links and recommends disabling tracking. RenderLab's accepted UI-053 contract independently requires provider click/link rewriting to stay disabled for Auth URLs.
- This creates a verified provider-plan incompatibility before any token-bearing template is installed. 13C is blocked rather than weakened: do not PATCH invite/recovery templates or start 13D live delivery on the current unverified rewriting path.
- Resolution requires explicit operator approval for either (a) a Brevo plan/support path that can prove transactional click tracking is fully disabled, or (b) a provider change whose SMTP/API path can prove no Auth-link rewriting. Neither purchase nor provider migration is authorized by this record alone.
"""
replace_once("docs/architecture/INFRASTRUCTURE.md", infra_anchor, infra_block)
