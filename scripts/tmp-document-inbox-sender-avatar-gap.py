from pathlib import Path

project = Path("PROJECT.md")
migration = Path("docs/ui/UI_MIGRATION.md")
decisions = Path("docs/ui/UI_DECISIONS.md")
infra = Path("docs/architecture/INFRASTRUCTURE.md")

project_text = project.read_text()
marker = "## Post-Phase-13 follow-up — Inbox sender avatar"
if marker not in project_text:
    project_text = project_text.rstrip() + """


## Post-Phase-13 follow-up — Inbox sender avatar
**Status: `OPEN / OBSERVED`, not part of completed Phase 13.** Real Gmail acceptance after Phase 13 showed the RenderLab invite/recovery messages arriving and functioning correctly, but Gmail's inbox list still renders a generic sender avatar instead of the RenderLab mark. The desired product outcome is a verified RenderLab logo in the sender-avatar slot where the receiving mailbox supports authenticated brand indicators.

This is not an HTML-template defect: the branded logo inside the message body is already implemented under UI-053. Inbox-list sender imagery is controlled by mailbox/provider identity mechanisms. The current follow-up should investigate standards-based BIMI for Gmail rather than fake the avatar through the From display name, emoji, or message-body images.

Before any implementation, re-audit current public SPF/DKIM/DMARC and the shared `faresuniform.uk` mail-routing blast radius. Current Resend BIMI guidance requires DMARC enforcement (`p=quarantine` or `p=reject`, `pct=100`); when BIMI is used on a subdomain, the root/apex domain must also be at enforcement. It also requires a BIMI-compatible SVG Tiny P/S logo plus a supported mark certificate for broad Gmail display: VMC requires a qualifying trademark, while CMC requires verified established logo use and currently provides Gmail avatar display without the VMC checkmark. Mailbox providers still retain final display/reputation discretion. Phase 13A historically recorded apex DMARC at `p=none`; do not change that parent-domain policy from documentation assumptions—verify live DNS and the effect on unrelated `faresuniform.uk` mail first.

No DNS, DMARC, certificate purchase, logo-format conversion, provider configuration, application code, or Vercel deployment is authorized by this follow-up record. The next session should first establish feasibility/cost/eligibility and propose the smallest safe implementation contract.
"""
    project.write_text(project_text)

migration_text = migration.read_text()
section = """
## Post-Phase-13 observed gap — Inbox sender avatar
- [ ] Gmail currently shows a generic avatar for `RenderLab <noreply@mail.renderlab.faresuniform.uk>` even though the message body is correctly branded and Phase 13 delivery/link flows are verified.
- [ ] Treat inbox sender imagery as a separate authenticated-brand surface, not an email-template image issue.
- [ ] Investigate Gmail BIMI feasibility before implementation: live SPF/DKIM/DMARC, parent-domain DMARC blast radius, BIMI SVG Tiny P/S suitability, VMC/CMC eligibility/cost, and mailbox-provider display/reputation behavior.
- [ ] Do not change the shared parent-domain DMARC policy, purchase a certificate, mutate DNS, or deploy application code merely to close this tracker item without an explicit implementation decision.

**Desired outcome:** supported mailbox clients show the RenderLab mark beside the sender name, similar to established branded senders, while email authentication and unrelated `faresuniform.uk` mail remain safe.

"""
if "## Post-Phase-13 observed gap — Inbox sender avatar" not in migration_text:
    anchor = "## Current Work"
    if anchor not in migration_text:
        raise SystemExit("UI_MIGRATION Current Work anchor missing")
    migration_text = migration_text.replace(anchor, section + anchor, 1)
    migration.write_text(migration_text)

infra_text = infra.read_text()
infra_section = """
## Post-Phase-13 mailbox brand indicator follow-up — observed 2026-09-02
The production Auth mail path is healthy, but external Gmail acceptance showed a generic inbox sender avatar rather than the RenderLab mark. This is separate from the hosted Auth HTML templates and requires mailbox-level authenticated brand identity.

Current implementation direction to investigate is BIMI for Gmail. Resend's current BIMI guidance requires:
- DMARC enforcement at `p=quarantine` or `p=reject` with `pct=100`;
- for BIMI on the RenderLab sending subdomain, root/apex DMARC must also be at enforcement;
- a publicly reachable HTTPS BIMI logo in SVG Tiny P/S format;
- a supported mark certificate for Gmail brand-avatar use (VMC for a qualifying trademark or CMC where established logo-use requirements can be proven).

Phase 13A recorded the existing apex DMARC posture as `p=none`, and Phase 13 did not authorize a parent-domain enforcement change. The next implementation session must re-read live DNS rather than relying on that historical value, inventory all `faresuniform.uk` senders/routes, and assess the effect of enforcement before any DMARC mutation. Do not assume the existing application SVG is BIMI-compliant and do not purchase a VMC/CMC until eligibility, cost and product value are reviewed. Provider acceptance does not guarantee that Gmail or another mailbox will render a logo; reputation/display policy remains mailbox-controlled.

This follow-up currently authorizes documentation/research only. It changes no Resend SMTP state, Supabase Auth configuration, Cloudflare DNS, application code, schema, generation infrastructure or Vercel deployment.

"""
if "## Post-Phase-13 mailbox brand indicator follow-up — observed 2026-09-02" not in infra_text:
    anchor = "## Security Rules"
    if anchor not in infra_text:
        raise SystemExit("INFRASTRUCTURE Security Rules anchor missing")
    infra_text = infra_text.replace(anchor, infra_section + anchor, 1)
    infra.write_text(infra_text)

decisions_text = decisions.read_text()
if "### UI-054 — Inbox sender avatar uses authenticated RenderLab brand identity" not in decisions_text:
    decisions_text = decisions_text.rstrip() + """


### UI-054 — Inbox sender avatar uses authenticated RenderLab brand identity
**Status:** Accepted  
**Date:** 2026-09-02  
**Decision:** Where a receiving mailbox supports authenticated brand indicators, RenderLab should present the RenderLab mark in the inbox sender-avatar slot for transactional Auth mail. This mailbox-list identity is separate from the logo rendered inside the HTML message. Implement it through standards/provider-supported authenticated brand mechanisms such as BIMI rather than From-name tricks, emoji, contact-avatar assumptions, or message-body images.  
**Reason:** Post-Phase-13 real Gmail acceptance proved delivery, rendering and Auth links, but Gmail still displayed a generic sender avatar. A verified sender mark improves recognition and professional polish without weakening the transactional email security model.  
**Consequences:** A future implementation must first audit live SPF/DKIM/DMARC and all shared `faresuniform.uk` mail flows. Current Resend BIMI guidance requires DMARC enforcement and, for subdomain BIMI, enforcement at the root/apex as well; it also requires a BIMI-compatible SVG Tiny P/S logo and an eligible VMC or CMC for Gmail brand-avatar display. Phase 13A historically recorded apex DMARC at `p=none`, so no enforcement change may be inferred or applied without a fresh blast-radius audit. The existing RenderLab application SVG must not be assumed BIMI-compliant. Mailbox display remains conditional on provider policy/reputation and is not guaranteed. This decision approves the desired identity outcome only; it does not authorize DNS/DMARC changes, certificate purchase, provider mutation, application code or deployment.
"""
    decisions.write_text(decisions_text)
