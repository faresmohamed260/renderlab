from pathlib import Path

def patch(path, old, new):
    p=Path(path); s=p.read_text()
    if old not in s:
        raise SystemExit(f'missing anchor in {path}: {old[:80]}')
    p.write_text(s.replace(old,new,1))

patch(
    'PROJECT.md',
    'Hosted built-in email/rate-limit posture and Free-plan leaked-password protection remain explicit broader-beta blockers without changing the Closed-Beta operating boundary.',
    'Phase 13B has since replaced the hosted built-in email/rate-limit posture with verified Brevo custom SMTP; Free-plan leaked-password protection remains the separate broader-beta blocker.',
)

patch(
    'docs/ui/UI_MIGRATION.md',
    '- [x] Production transactional delivery path/provider is approved as Brevo custom SMTP for the current Closed Beta. Provision a dedicated RenderLab SMTP key and Brevo API key/login only in approved GitHub secret storage; do not reuse a general/master SMTP password when a scoped RenderLab key can be created.',
    '- [x] Production transactional delivery path/provider is Brevo custom SMTP for the current Closed Beta. Dedicated RenderLab SMTP/API credentials are provisioned in approved GitHub secret storage; the general/master SMTP password was not reused.',
)
patch(
    'docs/ui/UI_MIGRATION.md',
    '- Planning does not authorize SMTP/provider signup or purchase, DNS mutation, hosted Auth mutation, email sending, Vercel deployment or application changes.',
    '- Prior planning alone did not authorize production mutation; the user explicitly authorized the completed 13B Brevo/DNS/Supabase configuration. Further provider purchase/account changes, real email sending, Vercel deployment or application changes still require the applicable phase/operator gate.',
)
