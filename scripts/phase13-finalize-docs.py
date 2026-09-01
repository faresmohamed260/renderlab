from pathlib import Path
import re


def sub_once(text: str, pattern: str, replacement: str, *, flags: int = 0, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one replacement, got {count}")
    return updated


def replace_once(text: str, old: str, new: str, *, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one exact match, got {count}")
    return text.replace(old, new, 1)


project_path = Path("PROJECT.md")
project = project_path.read_text()
project = sub_once(
    project,
    r"(## Current Priority\n)\*\*.*?\*\*\n\n(### Cycle 2 objective)",
    r"\1**Cycle 2 — Creative Productivity & Beta Maturity remains `COMPLETE / VERIFIED`. Cycle 3 — Beta Operations & Access Reliability remains `IN PROGRESS`, with Phase 13 — Email & Invite Production Hardening now `COMPLETE / VERIFIED`. Real external Gmail acceptance used two operator-controlled test inboxes: invite run `33556525753` delivered both messages through Resend with production link integrity, the operator confirmed both messages arrived and both invite links redirected successfully into signed-in RenderLab, and Supabase then showed two claimed invitations / two active members. Recovery run `33557320718` delivered a real password-reset message with the production token-hash link intact; the operator completed password replacement, and Auth read-back confirmed the target account remained confirmed/signed-in with a password present and one-time confirmation/recovery tokens cleared. Final guarded cleanup removed both temporary test Auth users/invitations/access rows; the independent audit returned zero test residue, exactly one active admin, zero pending invitations, and generation defaults enabled / 1 active / 12 hourly / no updater. The operator-selected external set was two Gmail inboxes, so Outlook-specific rendering was not exercised and exact Inbox-vs-Spam folder placement was not separately captured; that limitation is recorded rather than overstated. Production application code remains the accepted Closed-Beta candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; Phase 13 created no Vercel deployment.**\n\n\2",
    flags=re.S,
    label="PROJECT current priority",
)
project = replace_once(
    project,
    "**Status: `IN PROGRESS`.** Cycle 2 remains complete. Phase 13 is the active Cycle 3 phase; later Cycle 3 work remains undefined until Phase 13 evidence justifies it.",
    "**Status: `IN PROGRESS`.** Cycle 2 remains complete. Phase 13 is now `COMPLETE / VERIFIED`; the next Cycle 3 phase is intentionally not yet contracted and must be planned from the post-Phase-13 repository/production baseline before execution.",
    label="PROJECT cycle 3 status",
)
project = sub_once(
    project,
    r"- \*\*Phase 13 — Email & Invite Production Hardening: `IN PROGRESS`\.\*\*.*?\n\n(### Phase 13 execution contract)",
    "- **Phase 13 — Email & Invite Production Hardening: `COMPLETE / VERIFIED`.** 13A audit, 13B sender/delivery configuration, 13C Resend/template/link hardening and 13D bounded live-mailbox acceptance are complete. Deterministic and provider-sink evidence remains `33541306021`, `33545491994`, `33549168096`, `33554608805` and `33554945434`. External Gmail invite run `33556525753` delivered two real messages; the operator confirmed both arrived and both links completed into signed-in RenderLab, while Supabase confirmed two claimed invitations / two active members. External Gmail recovery run `33557320718` delivered the production reset message; the operator completed password replacement and Auth read-back showed cleared one-time tokens. Final guarded cleanup returned both test accounts/invitations/access rows to zero, preserved the sole active admin and restored/verified generation defaults enabled / 1 / 12 / no updater. The selected external test set contained two Gmail inboxes, so Outlook-specific rendering and exact Inbox-vs-Spam folder placement were not separately verified; this is the recorded operator limitation allowed by the phase exit criterion rather than a claim of cross-provider coverage.\n\n\\1",
    flags=re.S,
    label="PROJECT phase 13 roadmap bullet",
)
project = sub_once(
    project,
    r"(### Phase 13 execution contract — Email & Invite Production Hardening\n)\*\*Status:.*?\*\*\n",
    r"\1**Status: `COMPLETE / VERIFIED`. 13A–13D are complete. Resend is the active production Auth SMTP provider on the accepted project-scoped sender identity, provider click/open tracking is disabled, both branded token-hash templates are installed, real Gmail invite/recovery delivery and browser completion are accepted, and final test cleanup/defaults are clean. No application-code change or Vercel deployment was required by Phase 13.**\n",
    flags=re.S,
    label="PROJECT phase 13 contract status",
)
project = replace_once(
    project,
    "- These provider-sink runs do not satisfy external mailbox acceptance. 13D remains `IN PROGRESS` until operator-controlled Gmail + Outlook (or equivalent independent providers) are checked for Inbox/Spam placement and real client rendering and the bounded user invite/recovery lifecycles are completed.\n\n**In scope**",
    "- These provider-sink runs did not by themselves satisfy external mailbox acceptance; they were followed by the real Gmail acceptance below.\n\n**13D external Gmail acceptance evidence — 2026-09-01**\n- Real invite run `33556525753` sent exactly two operator-authorized RenderLab invitations to two dedicated Gmail test inboxes. Supabase accepted both sends, Resend reported both delivered, and stored-message checks preserved the production From identity plus unrewritten token-hash links. The operator confirmed both messages arrived and both invitation links redirected successfully into signed-in RenderLab. Supabase read-back then showed exactly two test Auth users, two active member rows, two claimed invitations and zero pending invitations.\n- Real recovery run `33557320718` targeted one of those accepted test accounts. Supabase accepted the recovery request, Resend reported delivery, and stored-message verification preserved the exact production recovery token-hash URL without tracking rewrite. The operator completed the password-replacement flow in the browser. Post-completion Auth read-back showed the target account confirmed and signed in, with a password present, an update after account creation, and both confirmation/recovery one-time tokens cleared.\n- The operator-selected mailbox set contained two Gmail inboxes rather than independent Gmail + Outlook providers. Cross-provider Outlook rendering was therefore not exercised, and exact Gmail Inbox-vs-Spam folder placement was not separately recorded. The exit criterion explicitly permits recording the exact operator limitation when a second provider is not available; do not reinterpret this as verified Outlook coverage.\n- Final guarded cleanup first proved the two test accounts owned no generation/media/upload/collection/admission state. It then deleted exactly two invitation rows and exactly two Auth users; account-access rows cascaded under the verified FK. Independent post-cleanup audit returned `0` test Auth users, `0` test invitations and `0` test access rows, exactly one active admin, zero pending invitations and generation defaults enabled / 1 active / 12 hourly / no updater.\n- Credential-retention review completed at closure. Existing Resend, Supabase Management and Cloudflare DNS credentials remain retained as ongoing operator-management credentials rather than Phase-13-only fixtures. Brevo credentials/records are historical rollback context only and are not the active production route. No Gmail recipient Actions secrets were created for this operator-authorized run; recipient values existed only in temporary unmerged execution helpers.\n- Phase 13 changed transactional email/DNS/hosted-Auth configuration only. The accepted production application/deployment remained unchanged and automatic Git → Vercel deployment stayed disabled.\n\n**In scope**",
    label="PROJECT real 13D evidence insertion",
)
project_path.write_text(project)


migration_path = Path("docs/ui/UI_MIGRATION.md")
migration = migration_path.read_text()
migration = replace_once(
    migration,
    "## Phase 13 — Email & Invite Production Hardening — IN PROGRESS\nPhase 13 is the active phase of Cycle 3 — Beta Operations & Access Reliability. 13A read-only audit, 13B sender/delivery configuration and 13C Resend/template/link hardening are `COMPLETE / VERIFIED`. 13D bounded live-mailbox acceptance is the current remaining slice. Production application code remains the accepted Closed-Beta application; automatic Git → Vercel deployment remains disabled.",
    "## Phase 13 — Email & Invite Production Hardening — COMPLETE / VERIFIED\nPhase 13 is complete under Cycle 3 — Beta Operations & Access Reliability. 13A read-only audit, 13B sender/delivery configuration, 13C Resend/template/link hardening and 13D bounded live-mailbox acceptance are all `COMPLETE / VERIFIED`. Production application code remains the accepted Closed-Beta application; automatic Git → Vercel deployment remains disabled.",
    label="UI_MIGRATION phase heading",
)
check_replacements = {
    "- [ ] Run a bounded operator-gated live invite lifecycle from Admin → delivered external email → `renderlab.faresuniform.uk` confirmation → intended active access; verify consumed/revoked/invalid behavior where practical.":
    "- [x] Run a bounded operator-gated live invite lifecycle from Admin → delivered external email → `renderlab.faresuniform.uk` confirmation → intended active access. Real Gmail run `33556525753` delivered two invitations; the operator confirmed both arrived and redirected successfully into signed-in RenderLab, and Supabase confirmed two active members / two claimed invitations.",
    "- [ ] Run a bounded operator-gated real recovery lifecycle → delivered external email → password replacement → intended current/stale-session behavior on the production domain.":
    "- [x] Run a bounded operator-gated real recovery lifecycle → delivered external email → password replacement on the production domain. Real Gmail recovery run `33557320718` delivered the reset email with link integrity; the operator completed password replacement and Auth read-back confirmed cleared one-time tokens and a valid password-bearing confirmed account.",
    "- [ ] Cover at least two independent mailbox providers where practical, preferably Gmail + Outlook or equivalent; record Inbox/Spam placement and provider delivery/bounce evidence.":
    "- [x] Resolve mailbox-provider coverage explicitly. The operator supplied two independent Gmail test inboxes; both real invite messages and one recovery message were provider-delivered and human-completed. Outlook-specific rendering was not available in the selected test set and exact Inbox-vs-Spam folder placement was not separately recorded, so this limitation is retained rather than claiming cross-provider coverage.",
    "- [ ] Verify final 13D cleanup/defaults: zero run-owned Auth/access/invitation/admission/media/generation residue, sole persistent admin unchanged, generation defaults enabled / 1 / 12 / no updater.":
    "- [x] Verify final 13D cleanup/defaults. Guarded cleanup removed exactly the two external test invitations/Auth users; independent audit returned zero test Auth/access/invitation residue, exactly one active admin, zero pending invitations and generation defaults enabled / 1 / 12 / no updater.",
    "- [ ] Review provider/API/Management credential retention after live acceptance and narrow/rotate/remove temporary privileged credentials when continuing retention is not justified.":
    "- [x] Review provider/API/Management credential retention after live acceptance. Resend, Supabase Management and Cloudflare DNS credentials remain justified as ongoing operator-management credentials; Brevo is historical rollback context and not the active route. No Phase-13 mailbox-recipient Actions secrets were created for the operator-authorized Gmail run.",
    "- [ ] Record final 13D delivery/rendering/cleanup evidence in `PROJECT.md` and `docs/architecture/INFRASTRUCTURE.md` before marking Phase 13 `COMPLETE / VERIFIED`.":
    "- [x] Record final 13D delivery/rendering/cleanup evidence in `PROJECT.md`, `docs/architecture/INFRASTRUCTURE.md`, `docs/ui/UI_DECISIONS.md` and this tracker before marking Phase 13 `COMPLETE / VERIFIED`.",
}
for old, new in check_replacements.items():
    migration = replace_once(migration, old, new, label=f"UI_MIGRATION checklist {old[:28]}")
migration = sub_once(
    migration,
    r"### 13D live mailbox acceptance — PENDING OPERATOR-GATED SEND\n.*?\n### Scope guardrails",
    "### 13D live mailbox acceptance — COMPLETE / VERIFIED 2026-09-01\n- No-send preflight `33549168096` and controlled Resend sink runs `33554608805` / `33554945434` remain the deterministic/provider lifecycle baseline.\n- External Gmail invite run `33556525753` sent exactly two operator-authorized invitations. Resend reported both delivered with production From/subject/token-hash link integrity. The operator confirmed both Gmail messages arrived and both links redirected successfully into signed-in RenderLab; Supabase then showed two claimed invitations / two active members.\n- External Gmail recovery run `33557320718` delivered the production reset message to one accepted test account with the recovery token-hash link intact. The operator completed password replacement in the browser; Auth read-back confirmed the account remained confirmed/signed-in, had a password present and had cleared confirmation/recovery one-time tokens.\n- The selected external set contained two Gmail inboxes. Outlook-specific client rendering was not exercised and exact Gmail Inbox-vs-Spam folder placement was not separately recorded. This is the exact operator limitation permitted by the exit criterion; do not claim independent-provider coverage.\n- Before cleanup, the two test accounts had zero generation sources/jobs/media/uploads/collections/collection items/admission reservations. Guarded cleanup deleted exactly two test invitation rows and two Auth users; account access cascaded. Independent final audit returned zero matching test Auth/invitation/access rows, exactly one active admin, zero pending invitations and generation defaults enabled / 1 / 12 / no updater.\n- Credential review retained Resend/Supabase Management/Cloudflare DNS credentials for ongoing operations; Brevo remains historical rollback context only and is not active. The real Gmail run used no repository recipient secrets.\n- Phase 13 required no application-code change, schema migration, R2/generation change or Vercel deployment.\n\n### Scope guardrails",
    flags=re.S,
    label="UI_MIGRATION 13D section",
)
migration = sub_once(
    migration,
    r"\*\*Current phase:\*\*.*?\n\*\*Next sequence:\*\*.*?\n\*\*Release reality:\*\*",
    "**Current phase:** Phase 13 — Email & Invite Production Hardening is `COMPLETE / VERIFIED`; no next Cycle 3 phase is currently contracted.\n**Next sequence:** Re-establish the post-Phase-13 repository/production baseline and expand the immediate next Cycle 3 phase contract before implementation; do not infer or start a new phase from older conversation history.\n**Release reality:**",
    flags=re.S,
    label="UI_MIGRATION current work",
)
migration = replace_once(
    migration,
    "**Deployment boundary:** Phase 13A–13C changed email/DNS/hosted-Auth configuration only; no application code or Vercel deployment changed. Phase 13 remains configuration-first; any necessary application code fix must create/revalidate an exact candidate before any Vercel rollout.",
    "**Deployment boundary:** Phase 13 changed email/DNS/hosted-Auth configuration only; no application code or Vercel deployment changed. The accepted Closed-Beta production application/deployment remains unchanged; any future application code fix must create/revalidate an exact candidate before rollout.",
    label="UI_MIGRATION deployment boundary",
)
migration_path.write_text(migration)


infra_path = Path("docs/architecture/INFRASTRUCTURE.md")
infra = infra_path.read_text()
infra = replace_once(
    infra,
    "Cycle 2 production is accepted and Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`: 13A, 13B and 13C are `COMPLETE / VERIFIED`, while 13D bounded live-mailbox acceptance remains operator-gated. Phase 13C changed only transactional-email/DNS/hosted-Auth configuration; no application or Vercel deployment changed, and no real Phase 13 Auth email has been sent yet.",
    "Cycle 2 production is accepted and Phase 13 — Email & Invite Production Hardening is `COMPLETE / VERIFIED`: 13A–13D passed. Phase 13 changed only transactional-email/DNS/hosted-Auth configuration plus bounded external-mailbox verification; no application or Vercel deployment changed.",
    label="INFRA operating rules status",
)
infra = replace_once(
    infra,
    "**Status: `IN PROGRESS`; 13A, 13B and 13C `COMPLETE / VERIFIED`; 13D live mailbox acceptance pending.** The active production Auth mail provider is now Resend custom SMTP. Brevo remains historical 13B evidence and rollback context, not the current Supabase SMTP route.",
    "**Status: `COMPLETE / VERIFIED`; 13A–13D complete.** The active production Auth mail provider is Resend custom SMTP. Brevo remains historical 13B evidence and rollback context, not the current Supabase SMTP route.",
    label="INFRA phase 13 status",
)
infra = sub_once(
    infra,
    r"#### Phase 13D infrastructure boundary — pending live acceptance\n.*?\nPhase 13 requires no Supabase database migration",
    "#### Phase 13D external mailbox acceptance — COMPLETE / VERIFIED 2026-09-01\n- No-send preflight `33549168096` plus Resend delivered-sink invite/recovery runs `33554608805` and `33554945434` established the deterministic/provider baseline before external-mailbox use.\n- Real external Gmail invite run `33556525753` sent exactly two operator-authorized invitations. Supabase accepted both; Resend reported both delivered and stored-message verification preserved the production From identity and unrewritten token-hash links. The operator confirmed both messages arrived and both links redirected successfully into signed-in RenderLab. Supabase then showed exactly two claimed invitations / two active member rows for the test accounts.\n- Real Gmail recovery run `33557320718` sent one production password-reset message to an accepted test account. Supabase accepted the request; Resend reported delivered; stored-message verification preserved the exact recovery token-hash path without tracking rewrite. The operator completed password replacement in the production browser flow. Auth read-back confirmed a confirmed/signed-in password-bearing account with cleared confirmation/recovery one-time tokens.\n- The operator-selected external mailbox set consisted of two Gmail inboxes. Outlook-specific rendering was not exercised and exact Gmail Inbox-vs-Spam folder placement was not separately captured. This is the recorded operator limitation under the exit criterion; provider API delivery plus successful human receipt/completion are verified, but cross-provider rendering is not claimed.\n- Pre-cleanup audit proved the two test accounts owned no generation sources/jobs/media/uploads/collections/collection items/admission reservations. Guarded cleanup then deleted exactly two test invitation rows and exactly two Auth users; `renderlab_account_access` cascaded via its verified FK. Independent final audit returned zero matching test Auth/invitation/access rows, exactly one active admin, zero pending invitations and `renderlab_beta_settings` restored/verified as generation enabled / 1 active / 12 hourly / `updated_by=null`.\n- Credential-retention review is complete. `RESEND_API_KEY`, `SUPABASE_ACCESS_TOKEN` and the existing Cloudflare DNS credential remain justified as ongoing operator-management credentials. Brevo credentials/DNS are historical rollback context only and are not the active Supabase SMTP route. No Gmail recipient Actions secrets were created for the final operator-authorized run.\n- Normal CI remains independent of external mailbox delivery; real mailbox sends remain bounded operator actions rather than a recurring gate.\n\nPhase 13 requires no Supabase database migration",
    flags=re.S,
    label="INFRA 13D completed section",
)
infra_path.write_text(infra)


decisions_path = Path("docs/ui/UI_DECISIONS.md")
decisions = decisions_path.read_text()
decisions = replace_once(
    decisions,
    "Final no-send run `33545491994` verified the exact invite/recovery token-hash `/auth/confirm` paths, absence of `{{ .ConfirmationURL }}`, provider tracking-off state, invalid-link/hostile-`next` fail-closed behavior and zero Auth fixture residue. This evidence closes deterministic 13C implementation only; actual mailbox rendering, Inbox/Spam placement and real invite/recovery delivery remain 13D acceptance evidence.",
    "Final no-send run `33545491994` verified the exact invite/recovery token-hash `/auth/confirm` paths, absence of `{{ .ConfirmationURL }}`, provider tracking-off state, invalid-link/hostile-`next` fail-closed behavior and zero Auth fixture residue. Phase 13D then completed bounded external Gmail acceptance: invite run `33556525753` delivered two real branded invitations and the operator confirmed both arrived and completed successfully into signed-in RenderLab; recovery run `33557320718` delivered the branded reset message and the operator completed password replacement. Supabase/Auth read-back confirmed claimed active access and cleared one-time recovery state before guarded cleanup returned both external test accounts/invitations/access rows to zero while preserving the sole admin and generation defaults. The operator-selected set contained two Gmail inboxes, so Outlook-specific rendering and exact Inbox-vs-Spam folder placement are not claimed. UI-053 is therefore implemented and accepted for the current Closed-Beta email boundary.",
    label="UI_DECISIONS UI-053 evidence",
)
decisions_path.write_text(decisions)

for path in [project_path, migration_path, infra_path, decisions_path]:
    if not path.read_text().strip():
        raise SystemExit(f"{path}: empty after patch")

print("PHASE13_DOC_PATCH=PASS")
