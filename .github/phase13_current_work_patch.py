from pathlib import Path
import re


def replace_current_work(path: str, replacement: str, required: bool = True) -> None:
    p = Path(path)
    text = p.read_text()
    pattern = r"## Current Work\n.*?(?=\n## Session Handoff Rule)"
    updated, count = re.subn(pattern, replacement.rstrip() + "\n", text, count=1, flags=re.S)
    if required and count != 1:
        raise SystemExit(f"expected one Current Work section in {path}, got {count}")
    if count == 1:
        p.write_text(updated)


# PROJECT.md currently has no dedicated Current Work section; Current Priority + the
# Phase 13 contract are its authoritative forward-looking state. Keep this optional
# so a future reintroduction of the section can be updated without making the patch brittle.
replace_current_work(
    "PROJECT.md",
    """## Current Work
**Current cycle:** Cycle 3 — Beta Operations & Access Reliability is `PLANNED`; Cycle 2 remains `COMPLETE / VERIFIED`.
**Current phase contract:** Phase 13 — Email & Invite Production Hardening is `CONTRACTED / NOT STARTED`.
**Next sequence:** await explicit Phase 13 implementation authorization. Once authorized, begin with 13A read-only Auth/mail/DNS audit and operator decisions before any SMTP/provider/DNS/template/rate-limit mutation.
**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` remains the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; docs-only `main` may advance beyond that application SHA. Automatic Git deployment remains disabled.
**Deployment boundary:** this Phase 13 planning contract authorizes no production mutation and no Vercel deployment. Configuration-only Phase 13 execution should require no app deployment; any verified code fix must create/revalidate a new exact candidate before rollout.
**Broader-beta boundary:** Phase 13 targets the built-in Auth mailer/rate-limit/sender-domain/template-deliverability gap. Free-plan leaked-password protection remains a separate security hardening item and must not be relabeled complete by this phase.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter library remains outside Phase 13 and is not silently included in Cycle 3 planning.
""",
    required=False,
)

replace_current_work(
    "docs/ui/UI_MIGRATION.md",
    """## Current Work
**Current cycle:** Cycle 3 — Beta Operations & Access Reliability is `PLANNED`; Cycle 2 remains `COMPLETE / VERIFIED`.
**Current phase contract:** Phase 13 — Email & Invite Production Hardening is `CONTRACTED / NOT STARTED`.
**Next sequence:** implementation is authorization-gated. Start with read-only 13A Auth/mail/DNS audit and provider/sender/DMARC/live-inbox decisions before any production email configuration change.
**Release reality:** exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` remains the accepted Closed-Beta production application at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; docs-only `main` may advance beyond that application SHA. Automatic Git deployment remains disabled.
**Deployment boundary:** the Phase 13 contract itself changes no production configuration. Prefer configuration-only execution; if a verified application defect requires code, revalidate one exact candidate before any Vercel rollout.
**Broader-beta boundary:** Phase 13 is specifically responsible for production-capable invite/recovery delivery, sender-domain authentication, templates, rate limits and live mailbox evidence. Leaked-password protection remains separate.
**Post-Cycle-2 accepted direction:** LoRA/model-adapter work is outside Phase 13.
""",
)
