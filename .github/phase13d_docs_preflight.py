from pathlib import Path

PROJECT = Path("PROJECT.md")
MIGRATION = Path("docs/ui/UI_MIGRATION.md")
INFRA = Path("docs/architecture/INFRASTRUCTURE.md")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


p = PROJECT.read_text()
p = replace_once(
    p,
    "**Cycle 2 — Creative Productivity & Beta Maturity remains `COMPLETE / VERIFIED`. Cycle 3 — Beta Operations & Access Reliability is `IN PROGRESS`: Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`, with 13A read-only audit, 13B sender/delivery configuration and 13C Resend/template/link hardening all `COMPLETE / VERIFIED`. The current slice is 13D bounded live-mailbox acceptance; no real Phase 13 Auth email has been sent yet. Production Auth now uses Resend SMTP on the existing project-scoped sender identity with provider click/open tracking disabled and the branded token-hash invite/recovery templates installed. Production application code remains the accepted Closed-Beta candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; the Phase 13C configuration work created no Vercel deployment.**",
    "**Cycle 2 — Creative Productivity & Beta Maturity remains `COMPLETE / VERIFIED`. Cycle 3 — Beta Operations & Access Reliability is `IN PROGRESS`: Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`, with 13A read-only audit, 13B sender/delivery configuration and 13C Resend/template/link hardening all `COMPLETE / VERIFIED`. The current slice is 13D bounded live-mailbox acceptance. No-send preflight run `33549168096` is green for provider/Auth/template observability, the sole persistent admin, zero pending invitations, generation defaults and production fail-closed Auth behavior; it also confirms no real Phase 13 Auth email has been sent. The only remaining execution gate is operator-controlled Gmail + Outlook test recipients in approved GitHub secret storage plus the explicit real-send arm and explicit chat authorization. Production application code remains the accepted Closed-Beta candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; Phase 13 has created no Vercel deployment.**",
    "PROJECT Current Priority",
)
p = replace_once(
    p,
    "- **Phase 13 — Email & Invite Production Hardening: `IN PROGRESS`.** 13A read-only audit, 13B sender/delivery configuration and 13C Resend/template/link hardening are `COMPLETE / VERIFIED`. Corrected no-send cutover run `33541306021` verified the exact Resend sender domain, tracking-off state and Supabase SMTP read-back; final no-send template/security run `33545491994` verified both branded token-hash templates, `{{ .ConfirmationURL }}` removal, no-send invite/recovery link generation, fail-closed invalid/hostile-link behavior and zero Auth fixture residue. 13D real mailbox acceptance is the current remaining slice and requires operator-controlled recipients plus explicit authorization for the bounded real sends.",
    "- **Phase 13 — Email & Invite Production Hardening: `IN PROGRESS`.** 13A read-only audit, 13B sender/delivery configuration and 13C Resend/template/link hardening are `COMPLETE / VERIFIED`. Corrected no-send cutover run `33541306021` verified the exact Resend sender domain, tracking-off state and Supabase SMTP read-back; final no-send template/security run `33545491994` verified both branded token-hash templates, `{{ .ConfirmationURL }}` removal, no-send invite/recovery link generation, fail-closed invalid/hostile-link behavior and zero Auth fixture residue. 13D no-send preflight `33549168096` also passed and proves the production delivery path is internally ready; the current blocker is only the two operator-controlled recipient secrets plus the explicit real-send arm and explicit user send authorization.",
    "PROJECT Cycle 3 Phase 13 summary",
)
anchor = "- 13C changed provider/DNS/Supabase Auth configuration only. It introduced no application code, database migration, R2/generation change or Vercel deployment. 13D is intentionally still required for real mailbox rendering, Inbox/Spam placement, provider delivery events and actual invite/recovery completion.\n"
addition = """

**13D no-send preflight evidence — 2026-09-01**
- Temporary branch `work/phase-13d-live-mail-acceptance` carries a preflight-only harness whose command is restricted to `preflight`; the current branch contains no send-capable execution path.
- Run `33549168096` / job `99994060939` passed. It re-verified Resend domain status, open/click tracking disabled, Resend sent-email observability, Supabase Resend SMTP/template state, exactly one persistent active RenderLab admin, zero pre-existing pending invitations, generation defaults `enabled / 1 / 12 / updated_by null`, and production invalid confirmation fail-closed behavior.
- The same run reported `PHASE13D_REAL_EMAIL_SENT=false`, `PHASE13D_RECIPIENTS_READY=false`, `PHASE13D_REAL_SEND_ARMED=false` and `PHASE13D_SEND_READY=false`.
- Remaining operator inputs must be stored as GitHub Actions secrets, never committed or logged: `RENDERLAB_13D_GMAIL_RECIPIENT`, `RENDERLAB_13D_OUTLOOK_RECIPIENT`, and `RENDERLAB_13D_SEND_ARMED=YES_PHASE13D_REAL_EMAIL`. Presence of these secrets alone is not send authorization; the user must also explicitly authorize the bounded 13D real sends in chat.
"""
if "**13D no-send preflight evidence — 2026-09-01**" not in p:
    p = replace_once(p, anchor, anchor + addition, "PROJECT 13D preflight insertion")
PROJECT.write_text(p)


m = MIGRATION.read_text()
anchor = "### 13D live mailbox acceptance — PENDING OPERATOR-GATED SEND\n- Real external delivery is intentionally separate from 13C deterministic verification.\n- Use only operator-controlled test recipients supplied through approved secret storage; do not commit or log recipient addresses.\n- Actual invite/recovery sends require explicit operator authorization for the bounded 13D run.\n- Do not infer mailbox placement or rendering from provider API acceptance alone; inspect recipient Inbox/Spam and provider delivery events.\n"
replacement = """### 13D live mailbox acceptance — PENDING OPERATOR-GATED SEND
- Real external delivery is intentionally separate from 13C deterministic verification.
- No-send preflight run `33549168096` / job `99994060939` passed: Resend domain/tracking state, sent-email observability, Supabase Resend SMTP/templates, the sole persistent admin, zero pending invitations, generation defaults and production Auth fail-closed behavior all remain correct; `PHASE13D_REAL_EMAIL_SENT=false`.
- Temporary branch `work/phase-13d-live-mail-acceptance` currently carries only a `preflight`-restricted harness and no send-capable execution path.
- Use only operator-controlled test recipients supplied through approved GitHub secret storage; do not commit or log recipient addresses. Required secret names are `RENDERLAB_13D_GMAIL_RECIPIENT` and `RENDERLAB_13D_OUTLOOK_RECIPIENT`.
- The separate send interlock is `RENDERLAB_13D_SEND_ARMED=YES_PHASE13D_REAL_EMAIL`. The preflight currently reads recipient presence false and send-arm false, so `PHASE13D_SEND_READY=false`.
- Secret presence/arm state does not itself authorize a real send. Actual invite/recovery sends still require explicit user authorization in chat for the bounded 13D run.
- Do not infer mailbox placement or rendering from provider API acceptance alone; inspect recipient Inbox/Spam and provider delivery events.
"""
m = replace_once(m, anchor, replacement, "UI_MIGRATION 13D section")
m = replace_once(
    m,
    "**Current phase:** Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`; 13A and 13B are `COMPLETE / VERIFIED`; the 13C provider decision is resolved to Resend and execution is `BLOCKED` only on provisioning `RESEND_API_KEY` in approved GitHub Actions secret storage.\n**Next sequence:** provision the Resend API credential, then remotely create/verify `mail.renderlab.faresuniform.uk`, explicitly verify click/open tracking is off, cut Supabase custom SMTP to Resend and read it back. Only after that provider path proves Auth links are not rewritten should 13C install/review the professional RenderLab invite and recovery token-hash HTML templates and run deterministic generate-link/negative security coverage without real email. 13D remains the later bounded live-mailbox acceptance slice.\n**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` remains the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; docs-only `main` may advance beyond that application SHA. Automatic Git deployment remains disabled.\n**Deployment boundary:** 13B changed Brevo/Cloudflare/Supabase Auth mail configuration only; no application code or Vercel deployment changed. Phase 13 remains configuration-first; any necessary application code fix must create/revalidate an exact candidate before any Vercel rollout.",
    "**Current phase:** Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`; 13A, 13B and 13C are `COMPLETE / VERIFIED`; 13D bounded live-mailbox acceptance is the active remaining slice. No-send preflight `33549168096` is green and no real Phase 13 Auth email has been sent.\n**Next sequence:** provision `RENDERLAB_13D_GMAIL_RECIPIENT`, `RENDERLAB_13D_OUTLOOK_RECIPIENT` and `RENDERLAB_13D_SEND_ARMED=YES_PHASE13D_REAL_EMAIL` in GitHub Actions secret storage, then obtain explicit user authorization in chat before adding/executing the bounded real-send path. Live acceptance must inspect provider delivery events plus Gmail/Outlook Inbox/Spam rendering and complete the real invite/recovery lifecycles with exact cleanup.\n**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` remains the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; docs-only `main` may advance beyond that application SHA. Automatic Git deployment remains disabled.\n**Deployment boundary:** Phase 13A–13C changed email/DNS/hosted-Auth configuration only; no application code or Vercel deployment changed. Phase 13 remains configuration-first; any necessary application code fix must create/revalidate an exact candidate before any Vercel rollout.",
    "UI_MIGRATION Current Work",
)
MIGRATION.write_text(m)


i = INFRA.read_text()
anchor = "#### Phase 13D infrastructure boundary — pending live acceptance\n- Real sends are intentionally excluded from normal CI and from 13C. 13D must use bounded operator-controlled recipients and explicit send authorization.\n- Prefer two independent providers such as Gmail and Outlook. Recipient addresses must live only in approved secret storage or equivalent transient operator input and must never be committed or printed in Actions logs.\n"
replacement = """#### Phase 13D infrastructure boundary — pending live acceptance
- Real sends are intentionally excluded from normal CI and from 13C. 13D must use bounded operator-controlled recipients and explicit send authorization.
- Branch-only no-send preflight `33549168096` / job `99994060939` passed on `work/phase-13d-live-mail-acceptance`. The harness is command-restricted to `preflight` and currently contains no send-capable path.
- Preflight re-verified Resend domain verification, open/click tracking disabled, Resend sent-email observability, Supabase `smtp.resend.com:587` plus the exact hosted templates, exactly one persistent active admin, zero pending invitations, generation defaults enabled / 1 / 12 / no updater, and production Auth fail-closed behavior. It explicitly recorded `PHASE13D_REAL_EMAIL_SENT=false`.
- Prefer two independent providers such as Gmail and Outlook. Recipient addresses must live only in approved secret storage and must never be committed or printed in Actions logs. Required secrets: `RENDERLAB_13D_GMAIL_RECIPIENT` and `RENDERLAB_13D_OUTLOOK_RECIPIENT`.
- Real-send execution has a separate secret interlock `RENDERLAB_13D_SEND_ARMED=YES_PHASE13D_REAL_EMAIL`; current preflight reports both recipient secrets absent and the arm disabled. Even after these exist, a real send still requires explicit user authorization in chat.
"""
i = replace_once(i, anchor, replacement, "INFRA 13D boundary")
INFRA.write_text(i)

print("PHASE13D_PREFLIGHT_DOCS_UPDATED=true")
