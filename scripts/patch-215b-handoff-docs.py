from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))

replace(
    "PROJECT.md",
    "- Security Advisor shows no new findings. Supabase still reports `auth_leaked_password_protection` because the organization is on Free, but the user has explicitly rejected upgrading Supabase solely for that feature. #215B is now the free RenderLab-owned compromised-password-screening slice using Have I Been Pwned Pwned Passwords k-anonymity; after that control is verified, the native Supabase warning is an accepted platform limitation rather than a roadmap blocker. CAPTCHA remains evaluated/deferred. Hosted policy and production presentation are synchronized at the 15-character minimum; post-cutover Vercel checks found no runtime-error clusters and no error/fatal logs for the new deployment.",
    "- Security Advisor shows no new findings. Supabase still reports `auth_leaked_password_protection` because the organization is on Free, but the user explicitly rejected upgrading Supabase solely for that feature. #215B free RenderLab-owned HIBP screening is verified and production-live, so the native warning is an accepted platform limitation rather than a roadmap blocker. CAPTCHA remains evaluated/deferred. Hosted policy, HIBP screening and production presentation are synchronized; post-cutover Vercel checks found no runtime-error clusters and no error/fatal logs.",
)

replace(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "**Status:** ACCEPTED PLANNING BASELINE / MERGED / IMPLEMENTATION ACTIVE",
    "**Status:** ACCEPTED PLANNING BASELINE / #215 COMPLETE + VERIFIED + PRODUCTION-LIVE / NEXT CONTRACT PLANNING: #217",
)
replace(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "A fresh Security Advisor read after #215A hosted execution on 2026-09-14 still reports **Leaked Password Protection Disabled** as the only warning. The other current findings are the expected `rls_enabled_no_policy` informational notices for deliberately server-owned RenderLab tables. The current organization remains on Free. On 2026-09-14 the user explicitly rejected a Supabase plan upgrade solely for this control, so the warning is no longer a billing/plan gate. #215B instead owns free application-layer compromised-password screening; after that is verified, the Supabase-native warning remains visible as an accepted platform limitation and must not be misrepresented as cleared.",
    "A fresh Security Advisor read after #215B verification and production rollout on 2026-09-14 still reports **Leaked Password Protection Disabled** as the only warning. The other current findings are the expected `rls_enabled_no_policy` informational notices for deliberately server-owned RenderLab tables. The organization remains on Free and the user explicitly rejected a Supabase upgrade solely for this feature. #215B free application-layer HIBP screening is verified and production-live, so the native warning is an accepted platform limitation and must not be misrepresented as cleared. #215 is closed; the next default P0 contract-planning slice is #217 privileged MFA/AAL2 step-up.",
)

replace(
    "docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md",
    "### Current password presentation\n\nThe application currently hard-codes an eight-character client floor in:\n\n- signed-out password input enablement;\n- new-password validation;\n- new-password `minLength` attributes;\n- visible `Use at least 8 characters.` guidance.\n\nThe actual hosted Auth password policy remains the authoritative enforcement boundary. #215 owns the real policy; #223 owns visible field ergonomics such as Show/Hide password, Caps Lock feedback and broader credential-field interaction quality.",
    "### Current password presentation\n\nThe production application now uses one canonical **15-character** password-creation/replacement policy shared by the account layer. Sign-in intentionally applies no client minimum-length gate so existing admitted credentials reach authoritative Supabase Auth rather than being rejected by browser presentation logic. Ordinary password change and verified recovery replacement both run the free RenderLab-owned HIBP compromised-password screen before Auth mutation.\n\nThe hosted Auth password policy remains authoritative for minimum length. #223 still owns visible field ergonomics such as Show/Hide password, Caps Lock feedback and broader credential-field interaction quality.",
)
replace(
    "docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md",
    "- #215B remains plan-gated and no Supabase billing/plan change is authorized by #215A.",
    "- At this preflight point Supabase-native leaked-password protection was still plan-gated. That path was later superseded by the user's explicit no-upgrade decision and the free HIBP #215B implementation recorded below.",
)
replace(
    "docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md",
    "#215A is therefore **implementation-complete, verified and production-live for the current Free plan**. #215 remains open only for #215B free compromised-password screening. No Supabase billing/plan decision remains in this workstream. Hosted policy and production application presentation are synchronized on the canonical 15-character minimum.",
    "#215A is therefore **implementation-complete, verified and production-live for the current Free plan**. #215B is also complete, verified and production-live through the free RenderLab-owned HIBP control. No Supabase billing/plan decision remains in this workstream. Hosted policy, compromised-password screening and production application presentation are synchronized on the canonical 15-character minimum.",
)
replace(
    "docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md",
    "Hosted Auth and the production application are therefore synchronized on the canonical 15-character password-creation/replacement policy. #215A is complete for the current Free plan. #215B now proceeds only as the free RenderLab-owned HIBP compromised-password-screening slice; no Supabase plan upgrade will be pursued for this feature.\n\n## 3. Binding product/security decisions",
    "Hosted Auth and the production application are therefore synchronized on the canonical 15-character password-creation/replacement policy. #215A is complete for the current Free plan. The former paid leaked-password path is permanently rejected.\n\n### Stage 4 #215B free compromised-password screening — completed, verified and production-live 2026-09-14\n\n- Contract amendment PR #249 merged as `31824147c7e3716ddf187a260220c74733102fbe`, replacing the former Supabase Pro+ gate with free RenderLab-owned HIBP Pwned Passwords k-anonymity screening.\n- Implementation PR #250 exact head `15edffab3662c28c5169584b8982e5df2831c880` passed all six attached workflows: Engineering `34868698449`, Account Identity `34868698376`, Compromised Password Screening `34868698510`, UI Shell `34868699614`, Integrated Release `34868698377`, and Brand/Launch `34868698354`.\n- Account Identity artifact `10357573841` has digest `sha256:bc22e9ed81a4e7ef30b82329236c3580c7b6f61d4ced42c47f988741c6f5fad8`. Verification proved submit-only lookup, five-character-prefix disclosure only, padded responses, local suffix comparison, compromised rejection, bounded retry/fail-closed behavior, safe ordinary/recovery password mutation, and preservation of existing recovery/session/revocation guarantees.\n- PR #250 merged as `f3f89d0859154b2ab45b5364ce1acb04a0eb204b`; merged-main Engineering `34869098474` and UI Shell `34869098397` both passed.\n- Explicit guarded rollout `34873131594` deployed exact source `f3f89d0859154b2ab45b5364ce1acb04a0eb204b` as READY Vercel deployment `dpl_44guHU58EZvh9mPfE6bAVfUtHZvh`. `renderlab.faresuniform.uk` moved only after build completion; root, Create, Library, Activity and Settings smoke passed.\n- Post-cutover Vercel checks found no runtime-error clusters and no error/fatal logs. Rollback was not required; `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7` remains the immediate known-good rollback target. Automatic Git → Vercel deployment remains disabled.\n- Fresh Security Advisor showed no new findings. The remaining `auth_leaked_password_protection` warning is accepted as a Supabase-native Free-plan limitation; the existing server-owned `rls_enabled_no_policy` INFO notices remain expected.\n- #215 is complete and closed. The next default P0 account-security contract-planning slice is #217 privileged MFA/AAL2 step-up; #216 session controls/security activity follows by default.\n\n## 3. Binding product/security decisions",
)

replace(
    "docs/architecture/INFRASTRUCTURE.md",
    "- Security Advisor will therefore continue to report `auth_leaked_password_protection`. After #215B is verified, that warning is an accepted Supabase-platform limitation rather than a RenderLab broader-beta blocker.",
    "- Security Advisor continues to report `auth_leaked_password_protection`. #215B is verified and production-live, so that warning is an accepted Supabase-platform limitation rather than a RenderLab broader-beta blocker; it must not be presented as cleared.",
)

print("#215B closure docs reconciled")
