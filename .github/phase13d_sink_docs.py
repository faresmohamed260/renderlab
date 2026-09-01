from pathlib import Path

PROJECT = Path('PROJECT.md')
MIGRATION = Path('docs/ui/UI_MIGRATION.md')
INFRA = Path('docs/architecture/INFRASTRUCTURE.md')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


p = PROJECT.read_text()
p = replace_once(
    p,
    "No-send preflight run `33549168096` is green for provider/Auth/template observability, the sole persistent admin, zero pending invitations, generation defaults and production fail-closed Auth behavior; it also confirms no real Phase 13 Auth email has been sent. The only remaining execution gate is operator-controlled Gmail + Outlook test recipients in approved GitHub secret storage plus the explicit real-send arm and explicit chat authorization.",
    "No-send preflight run `33549168096` is green for provider/Auth/template observability, the sole persistent admin, zero pending invitations, generation defaults and production fail-closed Auth behavior. Controlled Resend test-sink runs `33554608805` and `33554945434` then verified actual Supabase→Resend invite/recovery delivery, stored HTML/link integrity, production confirmation entry, consumed-link failure and exact cleanup without sending to an external user mailbox. The remaining execution gate is operator-controlled Gmail + Outlook test recipients in approved GitHub secret storage plus the explicit real-send arm and explicit chat authorization.",
    'PROJECT current priority sink evidence',
)
p = replace_once(
    p,
    "13D no-send preflight `33549168096` also passed and proves the production delivery path is internally ready; the current blocker is only the two operator-controlled recipient secrets plus the explicit real-send arm and explicit user send authorization.",
    "13D no-send preflight `33549168096` passed, followed by controlled Resend delivered-sink invite run `33554608805` and invite+recovery run `33554945434`. Those runs prove actual SMTP delivery, stored branded token-hash HTML, production invite claim/recovery confirmation entry, consumed-link fail-closed behavior and exact synthetic cleanup. External Gmail/Outlook mailbox placement/rendering and operator-completed user lifecycles remain the only acceptance gap, gated on the two recipient secrets plus the explicit real-send arm and explicit user send authorization.",
    'PROJECT Phase 13 summary sink evidence',
)
p = replace_once(
    p,
    "**Status: `IN PROGRESS`. 13A, 13B and 13C are `COMPLETE / VERIFIED`; 13D bounded live-mailbox acceptance is the current remaining slice. Resend is the active production Auth SMTP provider on the accepted project-scoped sender identity, provider click/open tracking is disabled, and both branded token-hash templates are installed and no-send verified. No real Phase 13 Auth email has been sent yet. No application-code change or Vercel deployment was required by 13C.**",
    "**Status: `IN PROGRESS`. 13A, 13B and 13C are `COMPLETE / VERIFIED`; 13D bounded live-mailbox acceptance is the current remaining slice. Resend is the active production Auth SMTP provider on the accepted project-scoped sender identity, provider click/open tracking is disabled, and both branded token-hash templates are installed and verified. Controlled messages have been sent only to Resend's official delivered test sink; no external Gmail/Outlook user mailbox has been used yet. No application-code change or Vercel deployment was required by Phase 13.**",
    'PROJECT Phase 13 status sink evidence',
)
anchor = "- Remaining operator inputs must be stored as GitHub Actions secrets, never committed or logged: `RENDERLAB_13D_GMAIL_RECIPIENT`, `RENDERLAB_13D_OUTLOOK_RECIPIENT`, and `RENDERLAB_13D_SEND_ARMED=YES_PHASE13D_REAL_EMAIL`. Presence of these secrets alone is not send authorization; the user must also explicitly authorize the bounded 13D real sends in chat.\n"
addition = """

**13D controlled provider-sink evidence — 2026-09-01**
- Resend's official `delivered+label@resend.dev` test sink was used only for bounded provider/lifecycle verification; no external user mailbox was targeted. Execution helpers remain on temporary work branches and are not application code or merge candidates.
- Invite sink run `33554608805` / job `100012248325` passed. Supabase Auth sent the production invite through Resend, Resend reported `delivered`, the stored message preserved the exact RenderLab From identity and branded token-hash confirmation URL without a provider/raw-Supabase tracking rewrite, the live production `/auth/confirm` route claimed the exact invitation into active member access, consumed-link replay failed closed, and the run cleaned its synthetic Auth/access/invitation state.
- Recovery sink run `33554945434` / job `100013355135` passed. It first established the same exact synthetic invitation prerequisite, then Supabase accepted a real recovery send through Resend, Resend reported delivery, the stored recovery HTML preserved the exact `/auth/confirm?token_hash=...&type=recovery&next=/settings/password` contract, the production route issued the RenderLab recovery marker and routed to password replacement, replay failed closed, and admission remained active.
- Independent post-run Supabase audit returned `0` matching synthetic Auth users, `0` synthetic invitations and `0` synthetic access rows; the persistent baseline remains exactly one active admin, zero pending invitations, and generation defaults enabled / 1 active / 12 hourly / no updater.
- These provider-sink runs do not satisfy external mailbox acceptance. 13D remains `IN PROGRESS` until operator-controlled Gmail + Outlook (or equivalent independent providers) are checked for Inbox/Spam placement and real client rendering and the bounded user invite/recovery lifecycles are completed.
"""
if '**13D controlled provider-sink evidence — 2026-09-01**' not in p:
    p = replace_once(p, anchor, anchor + addition, 'PROJECT sink evidence insertion')
PROJECT.write_text(p)


m = MIGRATION.read_text()
m = replace_once(
    m,
    "**Current phase:** Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`; 13A, 13B and 13C are `COMPLETE / VERIFIED`; 13D bounded live-mailbox acceptance is the active remaining slice. No-send preflight `33549168096` is green and no real Phase 13 Auth email has been sent.",
    "**Current phase:** Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`; 13A, 13B and 13C are `COMPLETE / VERIFIED`; 13D bounded live-mailbox acceptance is the active remaining slice. No-send preflight `33549168096` is green; controlled Resend delivered-sink invite `33554608805` and recovery `33554945434` runs also pass. No external Gmail/Outlook user mailbox has been used yet.",
    'UI_MIGRATION current phase',
)
m = replace_once(
    m,
    "**Next sequence:** provision `RENDERLAB_13D_GMAIL_RECIPIENT`, `RENDERLAB_13D_OUTLOOK_RECIPIENT` and `RENDERLAB_13D_SEND_ARMED=YES_PHASE13D_REAL_EMAIL` in GitHub Actions secret storage, then obtain explicit user authorization in chat before adding/executing the bounded real-send path. Live acceptance must inspect provider delivery events plus Gmail/Outlook Inbox/Spam rendering and complete the real invite/recovery lifecycles with exact cleanup.",
    "**Next sequence:** provision `RENDERLAB_13D_GMAIL_RECIPIENT`, `RENDERLAB_13D_OUTLOOK_RECIPIENT` and `RENDERLAB_13D_SEND_ARMED=YES_PHASE13D_REAL_EMAIL` in GitHub Actions secret storage, then obtain explicit user authorization in chat before adding/executing the bounded external-mailbox path. Provider delivery/link entry is already proven by the controlled Resend sink runs; remaining acceptance must inspect Gmail/Outlook Inbox/Spam rendering and complete the operator-controlled invite/recovery lifecycles with exact cleanup.",
    'UI_MIGRATION next sequence',
)
anchor = "- Secret presence/arm state does not itself authorize a real send. Actual invite/recovery sends still require explicit user authorization in chat for the bounded 13D run.\n- Do not infer mailbox placement or rendering from provider API acceptance alone; inspect recipient Inbox/Spam and provider delivery events.\n"
replacement = """- Secret presence/arm state does not itself authorize an external-mailbox send. Actual Gmail/Outlook invite/recovery sends still require explicit user authorization in chat for the bounded 13D run.
- Controlled Resend delivered-sink invite run `33554608805` passed actual SMTP delivery, exact From/subject/stored-HTML checks, unrewritten production token-hash link entry, invitation claim to active member, consumed-link failure and exact synthetic cleanup.
- Controlled Resend delivered-sink recovery run `33554945434` passed actual recovery SMTP delivery, exact stored recovery token-hash link entry, production recovery marker/redirect behavior, consumed-link failure and exact cleanup.
- Independent post-run Supabase audit returned zero matching synthetic Auth/invitation/access rows; exactly one active admin, zero pending invitations and generation defaults enabled / 1 / 12 / no updater remain intact.
- These test-sink sends are provider/lifecycle evidence only. Do not infer Gmail/Outlook placement or rendering from them; external mailbox Inbox/Spam and client rendering remain required for final 13D acceptance.
"""
m = replace_once(m, anchor, replacement, 'UI_MIGRATION 13D sink evidence')
MIGRATION.write_text(m)


i = INFRA.read_text()
i = replace_once(
    i,
    "- Real sends are intentionally excluded from normal CI and from 13C. 13D must use bounded operator-controlled recipients and explicit send authorization.",
    "- External user-mailbox sends are intentionally excluded from normal CI and from 13C. 13D external acceptance must use bounded operator-controlled recipients and explicit send authorization. Controlled Resend official test-sink sends are allowed only as bounded provider/lifecycle evidence and do not count as mailbox acceptance.",
    'INFRA 13D send boundary',
)
anchor = "- Real-send execution has a separate secret interlock `RENDERLAB_13D_SEND_ARMED=YES_PHASE13D_REAL_EMAIL`; current preflight reports both recipient secrets absent and the arm disabled. Even after these exist, a real send still requires explicit user authorization in chat.\n"
addition = """- Controlled provider-sink invite run `33554608805` / job `100012248325` passed actual Supabase→Resend delivery, stored From/HTML/token-hash integrity, production invitation claim, consumed-link fail-closed behavior and exact cleanup.
- Controlled provider-sink recovery run `33554945434` / job `100013355135` passed actual recovery delivery, stored recovery-link integrity, production recovery-marker/redirect behavior, consumed-link fail-closed behavior and exact cleanup.
- Independent post-run Supabase audit found zero matching sink-test Auth users/invitations/access rows; the sole active admin, zero pending invitations and enabled / 1 / 12 / no-updater generation defaults remain unchanged.
- These runs used only Resend's official delivered test sink and did not exercise external Gmail/Outlook mailbox placement or rendering. Final 13D acceptance still requires those operator-controlled mailbox checks.
"""
if 'Controlled provider-sink invite run `33554608805`' not in i:
    i = replace_once(i, anchor, anchor + addition, 'INFRA sink evidence insertion')
INFRA.write_text(i)

print('PHASE13D_SINK_DOCS_UPDATED=true')
