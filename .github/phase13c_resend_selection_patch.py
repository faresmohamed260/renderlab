from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "PROJECT.md",
    "13C branded template/link hardening is `BLOCKED` on the verified Brevo Free-plan link-rewriting constraint pending an operator provider/plan decision.",
    "13C branded template/link hardening remains `BLOCKED` on execution only: the operator selected Resend on 2026-08-31, and remote preflight run `33410644155` found `RESEND_API_KEY` absent from GitHub Actions secret storage while the existing Supabase and Cloudflare management credentials remain available.",
)

replace_once(
    "PROJECT.md",
    "Brevo custom SMTP is now authenticated on `mail.renderlab.faresuniform.uk`, Supabase Auth uses `RenderLab <noreply@mail.renderlab.faresuniform.uk>` at a bounded 30 emails/hour, and 13C exact branded invite/recovery template + link hardening is `BLOCKED`: the current Brevo Free account cannot satisfy the accepted no-rewrite Auth-link contract. Real mailbox acceptance remains 13D and must not start until 13C clears.",
    "Brevo custom SMTP remains the verified 13B production baseline on `mail.renderlab.faresuniform.uk` until cutover. The operator selected Resend as the replacement 13C provider on 2026-08-31 because its domain-level click/open tracking is disabled by default and it supports Supabase-compatible SMTP. Remote preflight run `33410644155` verified `SUPABASE_ACCESS_TOKEN` and `CLOUDFLARE_API_TOKEN` are present but `RESEND_API_KEY` is not yet configured, so 13C remains blocked on that single credential before provider/DNS/Auth mutation. Real mailbox acceptance remains 13D and must not start until 13C clears.",
)

replace_once(
    "PROJECT.md",
    "**Status: `IN PROGRESS`. 13A and 13B are `COMPLETE / VERIFIED`; 13C preflight is `BLOCKED` on the verified Brevo Free-plan transactional link-rewriting constraint. The provider/DNS/Auth production changes required by 13B were explicitly authorized and have been applied/verified. Do not install token-bearing invite/recovery templates, send real Auth email, switch providers, purchase/upgrade a plan, change application code or deploy until the operator selects the smallest acceptable resolution.**",
    "**Status: `IN PROGRESS`. 13A and 13B are `COMPLETE / VERIFIED`; the 13C provider decision is resolved in favor of Resend, but execution is `BLOCKED` until a Resend API credential exists in approved GitHub secret storage. The operator explicitly authorized the Brevo → Resend provider switch on 2026-08-31. Do not install token-bearing invite/recovery templates or start real Auth delivery until Resend domain authentication, tracking-off state, SMTP cutover and Supabase read-back are verified. No application-code change or Vercel deployment is authorized by this provider decision.**",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "13C branded template/link hardening is `BLOCKED` on the verified Brevo Free-plan link-rewriting constraint pending an operator provider/plan decision.",
    "13C branded template/link hardening remains `BLOCKED` on execution only: the operator selected Resend on 2026-08-31, and remote preflight run `33410644155` verified the existing Supabase/Cloudflare credentials are available while `RESEND_API_KEY` is still absent from GitHub Actions secret storage.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "- [x] Production transactional delivery path/provider is Brevo custom SMTP for the current Closed Beta. Dedicated RenderLab SMTP/API credentials are provisioned in approved GitHub secret storage; the general/master SMTP password was not reused.",
    "- [x] Production transactional delivery path/provider for verified 13B is Brevo custom SMTP for the current Closed Beta. Dedicated RenderLab SMTP/API credentials are provisioned in approved GitHub secret storage; the general/master SMTP password was not reused.\n- [x] 13C provider resolution: the operator selected Resend on 2026-08-31 to replace Brevo before token-bearing templates are installed. Resend click/open tracking must remain disabled and the existing `mail.renderlab.faresuniform.uk` / `RenderLab <noreply@mail.renderlab.faresuniform.uk>` identity is retained.\n- [ ] Provision `RESEND_API_KEY` in approved GitHub Actions secret storage, then create/verify the Resend sender domain, preserve tracking-off state, cut Supabase custom SMTP over to `smtp.resend.com`, and read back the exact production Auth configuration before installing templates. Preflight `33410644155` proved this is the only missing remote credential; Supabase and Cloudflare tokens are present.",
)

replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Current phase:** Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`; 13A and 13B are `COMPLETE / VERIFIED`; 13C branded template/link hardening is `BLOCKED` pending the no-rewrite provider/plan decision.\n**Next sequence:** resolve the 13C provider link-rewriting gate first. After a provider path can prove Auth links are not rewritten, install/review the professional RenderLab invite and recovery token-hash HTML templates and run deterministic generate-link/negative security coverage without real email. 13D remains the later bounded live-mailbox acceptance slice and must not start while 13C is blocked.",
    "**Current phase:** Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`; 13A and 13B are `COMPLETE / VERIFIED`; the 13C provider decision is resolved to Resend and execution is `BLOCKED` only on provisioning `RESEND_API_KEY` in approved GitHub Actions secret storage.\n**Next sequence:** provision the Resend API credential, then remotely create/verify `mail.renderlab.faresuniform.uk`, explicitly verify click/open tracking is off, cut Supabase custom SMTP to Resend and read it back. Only after that provider path proves Auth links are not rewritten should 13C install/review the professional RenderLab invite and recovery token-hash HTML templates and run deterministic generate-link/negative security coverage without real email. 13D remains the later bounded live-mailbox acceptance slice.",
)

infra_anchor = "- This creates a verified provider-plan incompatibility before any token-bearing template is installed. 13C is blocked rather than weakened: do not PATCH invite/recovery templates or start 13D live delivery on the current unverified rewriting path."
infra_add = infra_anchor + "\n\n#### Phase 13C provider resolution — Resend selected 2026-08-31\n- The operator explicitly selected Resend as the replacement transactional provider for Phase 13C. This resolves the provider/plan decision; Brevo remains the verified 13B production SMTP baseline only until the replacement cutover is completed and read back.\n- Official Resend behavior reviewed for this decision: domain-level click/open tracking is disabled by default; SMTP uses `smtp.resend.com` with username `resend` and an API key as the password. RenderLab must keep both tracking controls disabled for Auth mail.\n- Sender identity remains unchanged: `mail.renderlab.faresuniform.uk` and `RenderLab <noreply@mail.renderlab.faresuniform.uk>`. The migration must add only Resend-required sender-domain DNS while preserving unrelated Vercel, Tunnel, apex mail-routing and other Cloudflare records. Existing Brevo authentication records may coexist during cutover unless an exact conflict is verified; remove only provider-owned obsolete records after Resend and Supabase read-back succeed.\n- Remote prerequisite run `33410644155` verified `SUPABASE_ACCESS_TOKEN_PRESENT=true` and `CLOUDFLARE_API_TOKEN_PRESENT=true`, but `RESEND_API_KEY_PRESENT=false`. No Resend API call, DNS mutation, Supabase mutation, email send or deployment occurred.\n- Therefore the only current operator credential gate is a Resend API key stored as GitHub Actions secret `RESEND_API_KEY`. Once present, the remote execution sequence is: create/read Resend domain → apply exact required DNS → verify public DNS/provider status → force/read back tracking disabled → authenticate SMTP without a recipient → PATCH/read back Supabase custom SMTP → only then install 13C token-hash templates.\n"
replace_once("docs/architecture/INFRASTRUCTURE.md", infra_anchor, infra_add)

print("PHASE13C_RESEND_SELECTION_DOCS_PATCHED=true")
