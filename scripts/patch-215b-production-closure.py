from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


# PROJECT.md
replace_once(
    "PROJECT.md",
    "- Workstream #215 is the immediate P0 account/security slice under `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md` and `docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md`.",
    "- Workstream #215 Auth/email security hardening is **COMPLETE / VERIFIED / PRODUCTION-LIVE**. Its free RenderLab-owned HIBP compromised-password screening replaced the rejected Supabase paid-plan path. The next default P0 planning slice is #217 privileged MFA/step-up; it still requires its own fresh contract before implementation.",
)
project_old = "- Security Advisor shows no new findings. Supabase still reports `auth_leaked_password_protection` because the organization is on Free, but the user has explicitly rejected upgrading Supabase solely for that feature. #215B is now the free RenderLab-owned compromised-password-screening slice using Have I Been Pwned Pwned Passwords k-anonymity; after that control is verified, the native Supabase warning is an accepted platform limitation rather than a roadmap blocker. CAPTCHA remains evaluated/deferred. Hosted policy and production presentation are synchronized at the 15-character minimum; post-cutover Vercel checks found no runtime-error clusters and no error/fatal logs for the new deployment."
project_new = project_old + "\n- #215B contract amendment PR #249 merged as `31824147c7e3716ddf187a260220c74733102fbe`. Implementation PR #250 exact head `15edffab3662c28c5169584b8982e5df2831c880` passed Engineering `34868698449`, Account Identity `34868698376`, live Compromised Password Screening `34868698510`, UI Shell `34868699614`, Integrated Release `34868698377`, and Brand/Launch `34868698354`. Account Identity artifact `10357573841` has digest `sha256:bc22e9ed81a4e7ef30b82329236c3580c7b6f61d4ced42c47f988741c6f5fad8`.\n- PR #250 merged as `f3f89d0859154b2ab45b5364ce1acb04a0eb204b`; merged-main Engineering `34869098474` and UI Shell `34869098397` both passed. Fresh Security Advisor showed no new findings; the native leaked-password warning remains an explicitly accepted Supabase Free-plan limitation, not an open RenderLab blocker.\n- Explicit guarded rollout `34873131594` deployed exact source `f3f89d0859154b2ab45b5364ce1acb04a0eb204b` as READY Vercel deployment `dpl_44guHU58EZvh9mPfE6bAVfUtHZvh`. `renderlab.faresuniform.uk` was cut over only after the build completed; root, Create, Library, Activity and Settings smoke passed. Post-cutover Vercel checks found no runtime-error clusters and no error/fatal logs. Rollback was not required; `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7` is the immediate known-good rollback target. Automatic Git → Vercel deployment remains disabled."
replace_once("PROJECT.md", project_old, project_new)

# Account & Settings roadmap
replace_once(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "**Current execution:** #215A current-plan hardening is complete, verified and production-live: repository policy merged as `8ea859df84f5173267defbf3e278a95bba403014`, hosted Auth minimum is 15, security notifications/templates are branded, configured acceptance passed, and exact application source `27eda7ed0a619435b9d89531bdeb3fffe772e803` is live as Vercel deployment `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7`. The user permanently rejected upgrading Supabase solely for leaked-password protection; #215B is redefined as free RenderLab-owned compromised-password screening through the Have I Been Pwned Pwned Passwords k-anonymity API.",
    "**Current execution:** #215 is complete, verified and production-live. #215A established the 15-character hosted/application policy, branded security mail and current-plan hardening. #215B replaced the rejected Supabase paid-plan path with free RenderLab-owned HIBP Pwned Passwords k-anonymity screening and is live from exact source `f3f89d0859154b2ab45b5364ce1acb04a0eb204b` as Vercel deployment `dpl_44guHU58EZvh9mPfE6bAVfUtHZvh`. Supabase's native leaked-password warning is an accepted Free-plan limitation, not an open roadmap blocker. The next default contract-planning slice is #217 privileged MFA/step-up.",
)
replace_once(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "| Compromised-password blocking | Security policy | Plan when plan supports it | P0 / #215 |",
    "| Compromised-password blocking | Security policy | Implemented through free RenderLab-owned HIBP k-anonymity screening; native Supabase paid enforcement intentionally not required | COMPLETE / #215 |",
)
replace_once(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "## 11. Workstream A — Auth and email delivery hardening (#215)\n\n**Priority:** P0 prerequisite; much of this is platform hardening rather than Settings UI.\n\n### Planned scope",
    "## 11. Workstream A — Auth and email delivery hardening (#215)\n\n**Status:** COMPLETE / VERIFIED / PRODUCTION-LIVE — #215A hosted/application hardening plus #215B free HIBP compromised-password screening.\n**Priority:** P0 prerequisite; much of this is platform hardening rather than Settings UI.\n\n### Completed scope",
)
replace_once(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "- enable leaked-password protection when hosted plan capability permits and verify the Security Advisor clears.",
    "- block known-compromised passwords in supported RenderLab password-establishment/change flows through the free HIBP Pwned Passwords k-anonymity API; retain the Supabase-native leaked-password warning as an accepted Free-plan platform limitation rather than buying a plan upgrade for this feature.",
)

# Contract closure
contract = "docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md"
replace_once(
    contract,
    "**Status:** #215A CURRENT-PLAN HARDENING COMPLETE + VERIFIED + PRODUCTION-LIVE / #215B FREE COMPROMISED-PASSWORD SCREENING CONTRACTED / SUPABASE PAID UPGRADE REJECTED",
    "**Status:** COMPLETE / VERIFIED / MERGED / PRODUCTION-LIVE — #215A CURRENT-PLAN HARDENING + #215B FREE HIBP COMPROMISED-PASSWORD SCREENING / SUPABASE PAID UPGRADE REJECTED",
)
replace_once(
    contract,
    "Leaked-password protection is a required broader-beta hardening objective, but it is currently blocked by the Supabase Free plan.",
    "Supabase-native leaked-password protection remains unavailable on the Free plan and is intentionally not a RenderLab dependency. The required product control is instead the verified free RenderLab-owned HIBP compromised-password screening described in this contract.",
)
replace_once(
    contract,
    "- **#215B — Free compromised-password screening:** implement and verify the RenderLab-owned HIBP k-anonymity check described above. Supabase-native leaked-password protection remains disabled and its Security Advisor warning remains visible by design.",
    "- **#215B — Free compromised-password screening:** COMPLETE / VERIFIED / PRODUCTION-LIVE. RenderLab screens supported password-establishment/change flows through the HIBP k-anonymity range API. Supabase-native leaked-password protection remains disabled and its Security Advisor warning remains visible by design.",
)
replace_once(
    contract,
    "#215 closes when #215B is verified and the native Supabase warning is documented as an accepted platform limitation rather than a product blocker.",
    "#215's closure condition is satisfied: #215B is verified and production-live, and the native Supabase warning is documented as an accepted platform limitation rather than a product blocker.",
)
stage4_old = """### Stage 4 — #215B free-screening closure

1. implement the bounded HIBP range check under the privacy rules above;
2. verify deterministic compromised, clean and unavailable paths without logging candidate secrets;
3. run an exact-head live HIBP reachability smoke plus Engineering Quality and Account Identity;
4. verify Security Advisor has no **new** findings while accepting that `auth_leaked_password_protection` remains because Supabase-native enforcement is intentionally disabled on Free;
5. merge, verify merged-main checks, update #215/roadmap/infrastructure documentation and close #215;
6. deploy only under a separate explicit production authorization.
"""
stage4_new = """### Stage 4 — #215B free-screening closure — completed and verified 2026-09-14

- Contract amendment PR #249 merged as `31824147c7e3716ddf187a260220c74733102fbe` and permanently removed a Supabase paid-plan upgrade as the leaked-password strategy.
- Implementation PR #250 exact head `15edffab3662c28c5169584b8982e5df2831c880` passed Engineering `34868698449`, Account Identity `34868698376`, live Compromised Password Screening `34868698510`, UI Shell `34868699614`, Integrated Release `34868698377`, and Brand/Launch `34868698354`.
- Account Identity artifact `10357573841` (`sha256:bc22e9ed81a4e7ef30b82329236c3580c7b6f61d4ced42c47f988741c6f5fad8`) verifies the configured account flows while deterministic HIBP mocks prove compromised, safe, unavailable/fail-closed and submit-only privacy behavior.
- PR #250 merged as `f3f89d0859154b2ab45b5364ce1acb04a0eb204b`; merged-main Engineering `34869098474` and UI Shell `34869098397` both passed.
- Fresh Security Advisor after the merge showed no new findings. `auth_leaked_password_protection` remains as the accepted Supabase-native Free-plan warning; the expected server-owned-table `rls_enabled_no_policy` notices remain informational.
- Explicit rollout `34873131594` deployed exact source `f3f89d0859154b2ab45b5364ce1acb04a0eb204b` as READY deployment `dpl_44guHU58EZvh9mPfE6bAVfUtHZvh`, then moved `renderlab.faresuniform.uk` and passed root/Create/Library/Activity/Settings smoke. Post-cutover Vercel audit found no runtime-error clusters and no error/fatal logs. Rollback was not required; `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7` remains the immediate known-good rollback target.
- No Supabase plan/billing change, schema/RLS change, hosted Auth mutation, R2/provider/worker change or automatic Git deployment enablement was introduced by #215B.
"""
replace_once(contract, stage4_old, stage4_new)
replace_once(
    contract,
    "Completing #215A does not automatically authorize #216, #217 or #223 implementation. #215B free compromised-password screening is the immediate remaining slice for #215; after it is verified and #215 closes, re-establish repository/live Auth state and expand the next roadmap slice into its own contract.\n\nDefault sequencing after #215A remains:",
    "#215 is complete and does not automatically authorize #216, #217 or #223 implementation. Re-establish repository/live Auth state before the next workstream and merge its own execution contract before implementation. The next default planning slice is #217 privileged MFA/step-up because Admin/high-risk AAL2 enforcement remains the highest-priority security gap.\n\nDefault sequencing after #215 remains:",
)

# Infrastructure production record
infra = "docs/architecture/INFRASTRUCTURE.md"
marker = "\n## Security Rules\n"
section = """

## #215B free compromised-password screening production rollout — 2026-09-14

- The user permanently rejected upgrading Supabase solely for native leaked-password protection. RenderLab instead owns a free application-layer compromised-password control using the official HIBP Pwned Passwords range API with browser-side SHA-1 lookup hashing, five-character prefix k-anonymity, padded responses and local suffix comparison. Password plaintext and complete hashes are never sent to HIBP.
- Contract amendment PR #249 merged as `31824147c7e3716ddf187a260220c74733102fbe`; implementation PR #250 exact head `15edffab3662c28c5169584b8982e5df2831c880` passed all six attached workflows, including live no-secret HIBP reachability and configured Account Identity.
- PR #250 merged as `f3f89d0859154b2ab45b5364ce1acb04a0eb204b`; merged-main Engineering `34869098474` and UI Shell `34869098397` passed.
- Explicit guarded rollout `34873131594` deployed exact application source `f3f89d0859154b2ab45b5364ce1acb04a0eb204b` as READY Vercel deployment `dpl_44guHU58EZvh9mPfE6bAVfUtHZvh` (`renderlab-8h61hf59f-faresmohamed260-6733s-projects.vercel.app`). `renderlab.faresuniform.uk` was moved only after build completion; root, Create, Library, Activity and Settings smoke passed.
- Post-cutover Vercel checks found no runtime-error clusters and no error/fatal logs. Rollback was not required; prior deployment `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7` remains the immediate known-good rollback target.
- Fresh Security Advisor showed no new findings. The remaining `auth_leaked_password_protection` warning is accepted as a Supabase-native Free-plan limitation; the existing `rls_enabled_no_policy` INFO notices remain expected for deliberately server-owned tables.
- #215B changed no Supabase plan/billing, hosted Auth configuration, database schema/RLS, R2 contract, generation worker/provider routing or secret inventory. Automatic Git → Vercel deployment remains disabled.
"""
replace_once(infra, marker, section + marker)

print("#215B production closure docs patched")
