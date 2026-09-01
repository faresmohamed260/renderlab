from pathlib import Path
import re

PROJECT = Path("PROJECT.md")
MIGRATION = Path("docs/ui/UI_MIGRATION.md")
INFRA = Path("docs/architecture/INFRASTRUCTURE.md")
DECISIONS = Path("docs/ui/UI_DECISIONS.md")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# PROJECT.md — reconcile current phase status and add verified 13C evidence.
p = PROJECT.read_text()
p = replace_once(
    p,
    "**Cycle 2 — Creative Productivity & Beta Maturity remains `COMPLETE / VERIFIED`. Cycle 3 — Beta Operations & Access Reliability is `IN PROGRESS`: Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`, with 13A read-only audit and 13B sender/delivery configuration both `COMPLETE / VERIFIED`; 13C branded template/link hardening remains `BLOCKED` on execution only: the operator selected Resend on 2026-08-31, and remote preflight run `33410644155` found `RESEND_API_KEY` absent from GitHub Actions secret storage while the existing Supabase and Cloudflare management credentials remain available. Production application code remains the accepted Closed-Beta candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`. Phase 13B changed only Brevo/Cloudflare/Supabase Auth email configuration; it created no Vercel deployment and sent no real invite/recovery email.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity remains `COMPLETE / VERIFIED`. Cycle 3 — Beta Operations & Access Reliability is `IN PROGRESS`: Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`, with 13A read-only audit, 13B sender/delivery configuration and 13C Resend/template/link hardening all `COMPLETE / VERIFIED`. The current slice is 13D bounded live-mailbox acceptance; no real Phase 13 Auth email has been sent yet. Production Auth now uses Resend SMTP on the existing project-scoped sender identity with provider click/open tracking disabled and the branded token-hash invite/recovery templates installed. Production application code remains the accepted Closed-Beta candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; the Phase 13C configuration work created no Vercel deployment.**",
    "PROJECT current priority",
)
p = p.replace(
    "Phase 13B has since replaced the hosted built-in email/rate-limit posture with verified Brevo custom SMTP; Free-plan leaked-password protection remains the separate broader-beta blocker.",
    "Phase 13C has since replaced the hosted built-in email/rate-limit posture with verified Resend custom SMTP and branded token-hash templates; Free-plan leaked-password protection remains the separate broader-beta blocker.",
    1,
)
p = replace_once(
    p,
    "- **Phase 13 — Email & Invite Production Hardening: `IN PROGRESS`.** 13A read-only audit and 13B sender/delivery configuration are `COMPLETE / VERIFIED`. Brevo custom SMTP remains the verified 13B production baseline on `mail.renderlab.faresuniform.uk` until cutover. The operator selected Resend as the replacement 13C provider on 2026-08-31 because its domain-level click/open tracking is disabled by default and it supports Supabase-compatible SMTP. Remote preflight run `33410644155` verified `SUPABASE_ACCESS_TOKEN` and `CLOUDFLARE_API_TOKEN` are present but `RESEND_API_KEY` is not yet configured, so 13C remains blocked on that single credential before provider/DNS/Auth mutation. Real mailbox acceptance remains 13D and must not start until 13C clears.",
    "- **Phase 13 — Email & Invite Production Hardening: `IN PROGRESS`.** 13A read-only audit, 13B sender/delivery configuration and 13C Resend/template/link hardening are `COMPLETE / VERIFIED`. Corrected no-send cutover run `33541306021` verified the exact Resend sender domain, tracking-off state and Supabase SMTP read-back; final no-send template/security run `33545491994` verified both branded token-hash templates, `{{ .ConfirmationURL }}` removal, no-send invite/recovery link generation, fail-closed invalid/hostile-link behavior and zero Auth fixture residue. 13D real mailbox acceptance is the current remaining slice and requires operator-controlled recipients plus explicit authorization for the bounded real sends.",
    "PROJECT Cycle 3 Phase 13 summary",
)
p = replace_once(
    p,
    "**Status: `IN PROGRESS`. 13A and 13B are `COMPLETE / VERIFIED`; the 13C provider decision is resolved in favor of Resend, but execution is `BLOCKED` until a Resend API credential exists in approved GitHub secret storage. The operator explicitly authorized the Brevo → Resend provider switch on 2026-08-31. Do not install token-bearing invite/recovery templates or start real Auth delivery until Resend domain authentication, tracking-off state, SMTP cutover and Supabase read-back are verified. No application-code change or Vercel deployment is authorized by this provider decision.**",
    "**Status: `IN PROGRESS`. 13A, 13B and 13C are `COMPLETE / VERIFIED`; 13D bounded live-mailbox acceptance is the current remaining slice. Resend is the active production Auth SMTP provider on the accepted project-scoped sender identity, provider click/open tracking is disabled, and both branded token-hash templates are installed and no-send verified. No real Phase 13 Auth email has been sent yet. No application-code change or Vercel deployment was required by 13C.**",
    "PROJECT Phase 13 execution status",
)
marker = "**In scope**\n"
evidence = """**13C implementation / verification evidence — 2026-09-01**
- Corrected Resend cutover run `33541306021` succeeded after a pre-acceptance DNS-name normalization defect was fixed. The malformed duplicated run-owned records from the failed attempt were removed before acceptance; Resend then verified `mail.renderlab.faresuniform.uk` and the provider read-back showed both open and click tracking disabled.
- Supabase Auth reads back custom SMTP `smtp.resend.com:587`, sender name `RenderLab`, From `noreply@mail.renderlab.faresuniform.uk`, `rate_limit_email_sent=30`, the production Site URL and required redirect allowlist unchanged. SMTP authentication was proven without a recipient or DATA send.
- Invite subject is `You're invited to RenderLab`; recovery subject is `Reset your RenderLab password`. Both production templates use the approved RenderLab email shell and production `/renderlab-mark.svg`, while remaining understandable with images blocked.
- Invite and recovery use only the accepted `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}` SSR contracts for `invite` and `recovery`; `{{ .ConfirmationURL }}` is absent and provider/raw Supabase verification links are not embedded.
- Cleanup run `33545252403` removed the one run-owned no-send invite fixture left by an earlier verifier assertion. Direct Supabase audit then returned zero matching Auth users.
- Final no-send run `33545491994` passed Resend domain/tracking read-back, exact template/link read-back, no-send invite/recovery generate-link coverage, zero fixture residue, invalid-link fail-closed behavior and hostile-`next` rejection. It explicitly recorded `PHASE13C_REAL_AUTH_EMAIL_SENT=false`.
- 13C changed provider/DNS/Supabase Auth configuration only. It introduced no application code, database migration, R2/generation change or Vercel deployment. 13D is intentionally still required for real mailbox rendering, Inbox/Spam placement, provider delivery events and actual invite/recovery completion.

"""
if "**13C implementation / verification evidence — 2026-09-01**" not in p:
    p = replace_once(p, marker, evidence + marker, "PROJECT 13C evidence insertion")
PROJECT.write_text(p)


# UI_MIGRATION.md — replace the stale Phase 13 tracker as one coherent authoritative block.
m = MIGRATION.read_text()
new_phase13 = r'''## Phase 13 — Email & Invite Production Hardening — IN PROGRESS
Phase 13 is the active phase of Cycle 3 — Beta Operations & Access Reliability. 13A read-only audit, 13B sender/delivery configuration and 13C Resend/template/link hardening are `COMPLETE / VERIFIED`. 13D bounded live-mailbox acceptance is the current remaining slice. Production application code remains the accepted Closed-Beta application; automatic Git → Vercel deployment remains disabled.

### Required execution evidence
- [x] Audit actual production Supabase Auth Site URL/redirects, invite/recovery templates, built-in/custom mail state, sender identity, email rate limits and management-credential requirements read-only before mutation. Runs `33341207071` + `33341263450` passed with no production mutation.
- [x] Keep the project-scoped email identity: web `renderlab.faresuniform.uk`; transactional sender domain `mail.renderlab.faresuniform.uk`; default From `RenderLab <noreply@mail.renderlab.faresuniform.uk>`.
- [x] Establish a production-capable custom SMTP path. 13B first verified Brevo; 13C subsequently replaced it with Resend after the Brevo Free account could not prove the UI-053 no-rewrite requirement.
- [x] Provision the approved Resend credential in GitHub Actions secret storage and verify the exact sender domain. Corrected no-send cutover run `33541306021` completed the provider/DNS/Auth cutover.
- [x] Verify provider-required sender-domain DNS and remove malformed run-owned records from the pre-acceptance normalization attempt. Resend reports `mail.renderlab.faresuniform.uk` verified; unrelated Vercel, Tunnel and apex mail-routing records remain preserved.
- [x] Keep Resend open/click tracking explicitly disabled. Final no-send verification `33545491994` read back `RESEND_OPEN_TRACKING=false` and `RESEND_CLICK_TRACKING=false`.
- [x] Configure/read back Supabase custom SMTP as `smtp.resend.com:587`, sender `RenderLab <noreply@mail.renderlab.faresuniform.uk>` and `rate_limit_email_sent=30`, while preserving the production Site URL and redirect allowlist.
- [x] Install/review the professional responsive RenderLab invite HTML template using `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/settings`, the approved brand shell, accessible CTA, security copy and visible fallback link.
- [x] Install/review the professional responsive RenderLab recovery HTML template using `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/settings/password`, reusing the shell with security-focused recovery copy.
- [x] Remove raw `{{ .ConfirmationURL }}` use and verify provider/raw Supabase verification links are absent from the production invite/recovery bodies.
- [x] Keep normal CI independent of live mail. Final no-send run `33545491994` passed invite/recovery Admin generate-link coverage, invalid-link fail-closed behavior, hostile-`next` rejection and zero Auth fixture residue. Cleanup run `33545252403` removed the one earlier run-owned invite fixture before final acceptance.
- [ ] Run a bounded operator-gated live invite lifecycle from Admin → delivered external email → `renderlab.faresuniform.uk` confirmation → intended active access; verify consumed/revoked/invalid behavior where practical.
- [ ] Run a bounded operator-gated real recovery lifecycle → delivered external email → password replacement → intended current/stale-session behavior on the production domain.
- [ ] Cover at least two independent mailbox providers where practical, preferably Gmail + Outlook or equivalent; record Inbox/Spam placement and provider delivery/bounce evidence.
- [ ] Verify final 13D cleanup/defaults: zero run-owned Auth/access/invitation/admission/media/generation residue, sole persistent admin unchanged, generation defaults enabled / 1 / 12 / no updater.
- [ ] Review provider/API/Management credential retention after live acceptance and narrow/rotate/remove temporary privileged credentials when continuing retention is not justified.
- [ ] Record final 13D delivery/rendering/cleanup evidence in `PROJECT.md` and `docs/architecture/INFRASTRUCTURE.md` before marking Phase 13 `COMPLETE / VERIFIED`.

### 13A read-only audit — COMPLETE / VERIFIED 2026-08-31
- Hosted Auth had the correct production Site URL/redirect allowlist but no custom SMTP, a 2/hour built-in send rate, and default invite/recovery templates using `{{ .ConfirmationURL }}`.
- Public + Cloudflare DNS inventory established the existing parent-domain Brevo/Cloudflare Email Routing footprint without mutation.
- The accepted project-scoped sender domain/From identity was locked under UI-053.

### 13B sender & delivery configuration — COMPLETE / VERIFIED 2026-08-31
- Brevo was the first verified custom-SMTP baseline. Corrected run `33399495588` authenticated `mail.renderlab.faresuniform.uk`; Supabase run `33399659584` read back `smtp-relay.brevo.com:587`, the RenderLab From identity and `30/hour`.
- 13B deliberately left the default templates untouched and sent no real email.
- This remains historical acceptance evidence; Brevo is no longer the active Supabase SMTP provider after 13C.

### 13C Resend + template/link hardening — COMPLETE / VERIFIED 2026-09-01
- The operator selected Resend after read-only preflight proved the active Brevo Free account could not establish a no-link-rewrite guarantee. Resend keeps the existing sender identity rather than creating a second mail namespace.
- The first cutover attempt exposed a hostname-normalization defect and created three malformed duplicated run-owned DNS records. Supabase was not switched while Resend stayed pending. Those records were deleted, hostname normalization was corrected, and the accepted cutover is successful run `33541306021`.
- Accepted current provider state: Resend domain verified; open tracking false; click tracking false; Supabase SMTP `smtp.resend.com:587`; sender `RenderLab <noreply@mail.renderlab.faresuniform.uk>`; Auth email rate `30/hour`; production Site URL/redirects preserved.
- Production subjects are `You're invited to RenderLab` and `Reset your RenderLab password`. Both templates use the approved responsive RenderLab shell, production brand mark plus text fallback, one prominent CTA, security context and a visible fallback link.
- Final no-send verifier `33545491994` passed exact token-hash template read-back, `ConfirmationURL` removal, no-send invite/recovery generation, zero fixture residue, invalid-link fail-closed behavior and hostile-`next` rejection. No real Auth email was sent and no Vercel deployment occurred.

### 13D live mailbox acceptance — PENDING OPERATOR-GATED SEND
- Real external delivery is intentionally separate from 13C deterministic verification.
- Use only operator-controlled test recipients supplied through approved secret storage; do not commit or log recipient addresses.
- Actual invite/recovery sends require explicit operator authorization for the bounded 13D run.
- Do not infer mailbox placement or rendering from provider API acceptance alone; inspect recipient Inbox/Spam and provider delivery events.

### Scope guardrails
- Do not add public sign-up, waitlist, newsletter/marketing mail, MFA/CAPTCHA, general notifications or a second invitation/admission model.
- Do not redesign Landing, Settings or Admin for this phase. Make only evidence-driven application fixes if live delivery exposes a real defect.
- Free-plan leaked-password protection remains a separate broader-beta security item.
- Configuration-only Phase 13 work requires no Vercel deployment. Any application defect fix creates/revalidates an exact application candidate and requires explicit rollout authorization.

'''
pattern = re.compile(r"## Phase 13 — Email & Invite Production Hardening — IN PROGRESS\n.*?(?=## Feature/Surface Procedure)", re.S)
if len(pattern.findall(m)) != 1:
    raise SystemExit("UI_MIGRATION Phase 13 section: expected one match")
m = pattern.sub(new_phase13, m, count=1)
MIGRATION.write_text(m)


# INFRASTRUCTURE.md — correct the operating rule and replace the stale Phase 13 tail.
i = INFRA.read_text()
i = replace_once(
    i,
    "Cycle 2 production is accepted and Phase 13 — Email & Invite Production Hardening is `CONTRACTED / NOT STARTED` as the first planned Cycle 3 phase. The Phase 13 planning contract authorizes no SMTP/provider signup or purchase, Cloudflare DNS mutation, hosted Supabase Auth mutation, live email send, Vercel deployment or application change until the user explicitly authorizes implementation.",
    "Cycle 2 production is accepted and Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`: 13A, 13B and 13C are `COMPLETE / VERIFIED`, while 13D bounded live-mailbox acceptance remains operator-gated. Phase 13C changed only transactional-email/DNS/hosted-Auth configuration; no application or Vercel deployment changed, and no real Phase 13 Auth email has been sent yet.",
    "INFRA operating rule",
)
infra_phase13 = r'''### Phase 13 Email & Invite Production Hardening infrastructure state — 2026-09-01
**Status: `IN PROGRESS`; 13A, 13B and 13C `COMPLETE / VERIFIED`; 13D live mailbox acceptance pending.** The active production Auth mail provider is now Resend custom SMTP. Brevo remains historical 13B evidence and rollback context, not the current Supabase SMTP route.

Current accepted transactional identity:
- web application: `renderlab.faresuniform.uk`;
- sending domain: `mail.renderlab.faresuniform.uk`;
- From: `RenderLab <noreply@mail.renderlab.faresuniform.uk>`;
- Supabase custom SMTP: `smtp.resend.com:587`;
- Auth email rate limit: `30/hour`;
- Resend open tracking: disabled;
- Resend click tracking: disabled.

The accepted Cycle 2 production application remains SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`. Automatic Git → Vercel deployment remains disabled. 13C required no application code, schema, R2 or generation-worker change and created no Vercel deployment.

#### Phase 13A read-only production audit — verified 2026-08-31
Runs `33341207071` and `33341263450` established the hosted Auth and DNS baseline with no mutation. Supabase had the correct production Site URL/redirect allowlist, no custom SMTP, `rate_limit_email_sent=2`, Send Email Auth Hook disabled and default invite/recovery templates using `{{ .ConfirmationURL }}`. Cloudflare/public DNS inventory recorded the existing parent-domain Brevo and Cloudflare Email Routing records without changing them.

#### Phase 13B historical Brevo sender/delivery baseline — verified 2026-08-31
Corrected execution run `33399495588` authenticated `mail.renderlab.faresuniform.uk` with the provider-required Brevo records and removed the malformed duplicated TXT owners produced by the first 13B normalization attempt. Supabase run `33399659584` read back `smtp-relay.brevo.com:587`, sender name `RenderLab`, From `noreply@mail.renderlab.faresuniform.uk` and `rate_limit_email_sent=30`. No real email was sent and templates remained unchanged.

13C read-only preflight then established that the active Brevo Free account could not prove complete transactional click-link rewriting disablement. Because Supabase warns that provider tracking can overwrite Auth confirmation links and UI-053 requires no Auth-link rewriting, the operator explicitly selected Resend rather than weakening the contract.

#### Phase 13C Resend cutover — COMPLETE / VERIFIED 2026-09-01
- The first Resend cutover attempt exposed a DNS hostname-normalization defect: API-returned relative Cloudflare-style names were suffixed twice, creating three malformed run-owned records. Resend correctly remained pending and Supabase SMTP was not switched during that failed state.
- Those malformed records were removed and normalization corrected. Accepted cutover run `33541306021` then created/read the exact `mail.renderlab.faresuniform.uk` Resend domain, installed only the required Resend authentication records, waited for public/provider verification, forced/read back open/click tracking disabled, authenticated SMTP without a recipient and switched/read back Supabase SMTP.
- Resend domain verification succeeded. The required Resend DKIM/SPF-class records coexist with preserved unrelated Vercel web DNS, Cloudflare Tunnel state, apex Email Routing and historical provider records where no conflict exists. No duplicated malformed 13C DNS names remain.
- Supabase now reads back `smtp.resend.com:587`, `RenderLab <noreply@mail.renderlab.faresuniform.uk>`, `rate_limit_email_sent=30`, production Site URL `https://renderlab.faresuniform.uk` and the required redirect allowlist. SMTP authentication proof ended before RCPT/DATA, so it sent no message.

#### Phase 13C branded template/link state — COMPLETE / VERIFIED 2026-09-01
- Invite subject: `You're invited to RenderLab`.
- Recovery subject: `Reset your RenderLab password`.
- Both hosted templates use the approved UI-053 table-based RenderLab shell, production `{{ .SiteURL }}/renderlab-mark.svg` plus readable text wordmark fallback, dark/violet palette, accessible primary CTA, concise security/context copy and a visible fallback link.
- Invite link contract: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/settings`.
- Recovery link contract: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/settings/password`.
- Raw `{{ .ConfirmationURL }}` is absent from both bodies; provider/raw Supabase verification URLs are not embedded.
- Cleanup run `33545252403` deleted the one exact no-send invite fixture left by an earlier verifier cleanup assertion; direct Supabase audit then returned zero matching users.
- Final verifier `33545491994` passed provider tracking/domain read-back, both exact templates, no-send invite/recovery Admin link generation, zero fixture residue, production invalid-link fail-closed behavior and hostile-`next` rejection. It explicitly recorded no real Auth email send.

#### Phase 13D infrastructure boundary — pending live acceptance
- Real sends are intentionally excluded from normal CI and from 13C. 13D must use bounded operator-controlled recipients and explicit send authorization.
- Prefer two independent providers such as Gmail and Outlook. Recipient addresses must live only in approved secret storage or equivalent transient operator input and must never be committed or printed in Actions logs.
- Acceptance must distinguish provider API acceptance from mailbox delivery: inspect delivered/bounced/complained events plus Inbox/Spam placement and actual email-client rendering/link behavior.
- Live invite acceptance must verify delivered invite → production confirmation → intended RenderLab access, plus consumed/revoked/invalid behavior where practical. Live recovery must verify delivered reset → production confirmation → password replacement and current/stale-session behavior.
- Final cleanup must leave zero run-owned Auth/access/invitation/admission/media/generation residue, preserve the sole persistent admin and restore generation defaults to enabled / 1 active / 12 hourly / no updater.
- After acceptance, review retention of Resend/Supabase/Cloudflare management credentials and narrow, rotate or remove any temporary privilege that no longer has an operational justification.

Phase 13 requires no Supabase database migration, R2 change, worker/provider-generation change or Vercel deployment when completed as email/Auth/DNS configuration. If 13D exposes an application defect, make only the smallest code correction, validate a new exact application candidate through affected gates and obtain deployment authorization before replacing the accepted Cycle 2 production build.

Free-plan leaked-password protection remains a separate broader-beta security limitation; email deliverability work does not close it.
'''
pattern = re.compile(r"### Phase 13 Email & Invite Production Hardening infrastructure contract — 2026-08-31\n.*\Z", re.S)
if len(pattern.findall(i)) != 1:
    raise SystemExit("INFRA Phase 13 tail: expected one match")
i = pattern.sub(infra_phase13, i, count=1)
INFRA.write_text(i)


# UI_DECISIONS.md — preserve UI-053 decision and append implementation evidence.
d = DECISIONS.read_text()
ui53_evidence = """

**Implementation evidence — UI-053 (2026-09-01):** UI-053 is implemented in hosted production Auth configuration. Corrected Resend cutover run `33541306021` verified `mail.renderlab.faresuniform.uk`, disabled open/click tracking and switched Supabase custom SMTP to `smtp.resend.com:587` while preserving `RenderLab <noreply@mail.renderlab.faresuniform.uk>` and the production Auth URL contract. The invite and recovery subjects are `You're invited to RenderLab` and `Reset your RenderLab password`; both hosted HTML templates reuse the production RenderLab mark plus text fallback, the established dark/violet product palette, one accessible CTA, security/context copy and a visible fallback link. Final no-send run `33545491994` verified the exact invite/recovery token-hash `/auth/confirm` paths, absence of `{{ .ConfirmationURL }}`, provider tracking-off state, invalid-link/hostile-`next` fail-closed behavior and zero Auth fixture residue. This evidence closes deterministic 13C implementation only; actual mailbox rendering, Inbox/Spam placement and real invite/recovery delivery remain 13D acceptance evidence.
"""
if "**Implementation evidence — UI-053 (2026-09-01):**" not in d:
    if not d.endswith("\n"):
        d += "\n"
    d += ui53_evidence.lstrip("\n")
DECISIONS.write_text(d)

print("PHASE13C_DOCS_RECONCILED=true")
