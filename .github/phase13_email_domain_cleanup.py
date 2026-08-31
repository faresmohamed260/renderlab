from pathlib import Path
p = Path('docs/ui/UI_MIGRATION.md')
s = p.read_text()
old = "Phase 13 is the first active phase of Cycle 3 — Beta Operations & Access Reliability. 13A read-only audit is `COMPLETE / VERIFIED`; 13B sender/delivery configuration is awaiting the explicit provider/sender/credential decision. It remains primarily an Auth/email/infrastructure hardening phase, not a screen redesign. Existing UI-051 Account/Admin and UI-052 Brand/Launch contracts remain authoritative unless live delivery evidence proves a concrete product defect."
new = "Phase 13 is the first active phase of Cycle 3 — Beta Operations & Access Reliability. 13A read-only audit is `COMPLETE / VERIFIED`; the 13B sender-domain/From identity decision is accepted, while transactional provider/account and SMTP credentials remain the explicit operator gate. It remains primarily an Auth/email/infrastructure hardening phase, not a screen redesign. Existing UI-051 Account/Admin and UI-052 Brand/Launch contracts remain authoritative unless live delivery evidence proves a concrete product defect."
if old not in s:
    raise SystemExit('phase intro anchor missing')
s = s.replace(old, new, 1)
old = "- Lowest-drift recommendation for 13B is existing-domain Brevo SMTP via Supabase custom SMTP. This is a recommendation, not an inferred credential/account state; provider/sender/credential selection remains an explicit operator gate."
new = "- Lowest-drift provider recommendation for 13B is Brevo SMTP via Supabase custom SMTP. The sender domain/From identity is now accepted as `mail.renderlab.faresuniform.uk` / `RenderLab <noreply@mail.renderlab.faresuniform.uk>`; provider account/plan and SMTP credential provisioning remain the explicit operator gate."
if old not in s:
    raise SystemExit('13A recommendation anchor missing')
s = s.replace(old, new, 1)
p.write_text(s)
