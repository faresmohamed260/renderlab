from pathlib import Path


def replace(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))

replace(
    "PROJECT.md",
    "- Security Advisor shows no new findings. `auth_leaked_password_protection` remains the explicit #215B blocker because the organization is still on Free and leaked-password protection requires Pro+. CAPTCHA remains evaluated/deferred. Hosted policy and production presentation are now synchronized at the 15-character minimum; post-cutover Vercel checks found no runtime-error clusters and no error/fatal logs for the new deployment.",
    "- Security Advisor shows no new findings. Supabase still reports `auth_leaked_password_protection` because the organization is on Free, but the user has explicitly rejected upgrading Supabase solely for that feature. #215B is now the free RenderLab-owned compromised-password-screening slice using Have I Been Pwned Pwned Passwords k-anonymity; after that control is verified, the native Supabase warning is an accepted platform limitation rather than a roadmap blocker. CAPTCHA remains evaluated/deferred. Hosted policy and production presentation are synchronized at the 15-character minimum; post-cutover Vercel checks found no runtime-error clusters and no error/fatal logs for the new deployment."
)

replace(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "**Current execution:** #215A current-plan hardening is complete, verified and production-live: repository policy merged as `8ea859df84f5173267defbf3e278a95bba403014`, hosted Auth minimum is 15, security notifications/templates are branded, configured acceptance passed, and exact application source `27eda7ed0a619435b9d89531bdeb3fffe772e803` is live as Vercel deployment `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7`. #215B leaked-password protection remains the explicit Supabase Pro+ plan gate.",
    "**Current execution:** #215A current-plan hardening is complete, verified and production-live: repository policy merged as `8ea859df84f5173267defbf3e278a95bba403014`, hosted Auth minimum is 15, security notifications/templates are branded, configured acceptance passed, and exact application source `27eda7ed0a619435b9d89531bdeb3fffe772e803` is live as Vercel deployment `dpl_6yCKG1TvPLRZLusxVJG2ALrA5YT7`. The user permanently rejected upgrading Supabase solely for leaked-password protection; #215B is redefined as free RenderLab-owned compromised-password screening through the Have I Been Pwned Pwned Passwords k-anonymity API."
)

replace(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "A fresh Security Advisor read after #215A hosted execution on 2026-09-14 still reports **Leaked Password Protection Disabled** as the only warning. The other current findings are the expected `rls_enabled_no_policy` informational notices for deliberately server-owned RenderLab tables. The current organization remains on Free, so the warning is the explicit #215B Pro+ plan gate rather than unfinished #215A work.",
    "A fresh Security Advisor read after #215A hosted execution on 2026-09-14 still reports **Leaked Password Protection Disabled** as the only warning. The other current findings are the expected `rls_enabled_no_policy` informational notices for deliberately server-owned RenderLab tables. The current organization remains on Free. On 2026-09-14 the user explicitly rejected a Supabase plan upgrade solely for this control, so the warning is no longer a billing/plan gate. #215B instead owns free application-layer compromised-password screening; after that is verified, the Supabase-native warning remains visible as an accepted platform limitation and must not be misrepresented as cleared."
)

replace(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "- Block known compromised/common passwords when the hosted plan supports it rather than relying on decorative strength meters.",
    "- Block known compromised passwords in RenderLab password-establishment/change flows through the free Have I Been Pwned Pwned Passwords k-anonymity API; do not require a Supabase paid-plan upgrade for this control and do not rely on decorative strength meters."
)

replace(
    "docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md",
    "- compromised-password blocking when platform support is enabled.",
    "- RenderLab-owned compromised-password screening through the free HIBP Pwned Passwords range API."
)

contract = "docs/architecture/AUTH_EMAIL_SECURITY_HARDENING_IMPLEMENTATION_CONTRACT.md"
replace(contract,
    "**Status:** #215A CURRENT-PLAN HARDENING COMPLETE + VERIFIED + PRODUCTION-LIVE / #215B PLAN-GATED",
    "**Status:** #215A CURRENT-PLAN HARDENING COMPLETE + VERIFIED + PRODUCTION-LIVE / #215B FREE COMPROMISED-PASSWORD SCREENING CONTRACTED / SUPABASE PAID UPGRADE REJECTED"
)
replace(contract,
    "This contract narrows #215 to the still-open security and configuration gaps that remain after Phase 13, freezes the existing account/recovery/session guarantees, and separates controls that are executable on the current Supabase Free plan from leaked-password protection, which current Supabase documentation makes available only on Pro and above.",
    "This contract narrows #215 to the still-open security and configuration gaps that remain after Phase 13 and freezes the existing account/recovery/session guarantees. #215A completed every approved current-plan hosted/application hardening action. On 2026-09-14 the user permanently rejected upgrading Supabase solely for leaked-password protection, so #215B is now a free RenderLab-owned compromised-password-screening slice instead of a billing/plan gate."
)
replace(contract,
    "- leaked-password protection remains disabled solely as the explicit #215B **Supabase Pro+ plan gate**.",
    "- Supabase-native leaked-password protection remains disabled on Free; the user explicitly rejected a paid-plan upgrade for this feature, and #215B now owns a free RenderLab-layer alternative instead."
)
replace(contract,
    "#215A is therefore **implementation-complete, verified and production-live for the current Free plan**. #215 remains open only for the separately authorized #215B plan/billing decision and leaked-password-protection closure. Hosted policy and production application presentation are synchronized on the canonical 15-character minimum.",
    "#215A is therefore **implementation-complete, verified and production-live for the current Free plan**. #215 remains open only for #215B free compromised-password screening. No Supabase billing/plan decision remains in this workstream. Hosted policy and production application presentation are synchronized on the canonical 15-character minimum."
)
replace(contract,
    "Hosted Auth and the production application are therefore synchronized on the canonical 15-character password-creation/replacement policy. #215A is complete for the current Free plan. #215B remains independently gated on explicit authorization for a qualifying Supabase plan and leaked-password protection.",
    "Hosted Auth and the production application are therefore synchronized on the canonical 15-character password-creation/replacement policy. #215A is complete for the current Free plan. #215B now proceeds only as the free RenderLab-owned HIBP compromised-password-screening slice; no Supabase plan upgrade will be pursued for this feature."
)
replace(contract,
    "- leaked-password blocking is enabled when the Supabase plan permits it.",
    "- known-compromised passwords are screened in RenderLab password-establishment/change flows through the free Have I Been Pwned Pwned Passwords range API; no Supabase paid-plan upgrade is permitted solely for this control."
)

marker = "The 15-character target follows the accepted account roadmap's NIST-aligned security direction. The hosted Auth setting is authoritative; application copy/validation must consume one RenderLab-owned canonical policy definition rather than duplicating numeric literals across components."
addition = marker + "\n\n#215B compromised-password screening is additionally bound to these privacy/availability rules:\n\n- use the official free `https://api.pwnedpasswords.com/range/{prefix}` endpoint; no API key or subscription is introduced;\n- hash the complete candidate password locally with SHA-1 **only for the HIBP lookup**; SHA-1 is never used for credential storage or verification;\n- send only the first five hexadecimal hash characters to HIBP and compare the returned suffixes locally; never transmit plaintext or the complete hash;\n- set `Add-Padding: true` and ignore padded zero-count records;\n- perform the lookup only after the user submits a complete candidate password, never incrementally while typing;\n- reject a password if its exact full-hash suffix appears with a positive breach count; do not expose prevalence counts as a strength score;\n- use a bounded timeout/retry and fail closed for password establishment/change if the safety check cannot complete, because allowing an unchecked password would silently weaken the promised control;\n- surface sanitized product copy such as `This password has appeared in known data breaches. Choose a different password.`;\n- do not log password values, full hashes, hash suffixes, or range responses.\n\nThis application-layer control is intentionally described as **RenderLab compromised-password screening**, not Supabase-native leaked-password enforcement. A technically capable authenticated user can bypass normal product UI and call the hosted Supabase Auth endpoint directly on the Free plan; eliminating that bypass would require paid/native Auth enforcement or a materially different authentication architecture, neither of which is authorized."
replace(contract, marker, addition)

replace(contract,
    "- **#215A — Free-plan hardening:** all executable configuration/application work in this contract is completed and verified; Security Advisor may still contain only the explicitly documented leaked-password warning plus expected server-owned-table informational notices.\n- **#215B — Plan-gated leaked-password closure:** after an explicit plan-upgrade decision, enable leaked-password protection and verify Security Advisor clears that warning.\n\nDo not upgrade the Supabase plan as an incidental implementation detail. Plan/billing change requires explicit user authorization.\n\n#215 may be marked implementation-complete-for-current-plan after #215A, but the broader-beta blocker must remain visibly open until #215B is done.",
    "- **#215A — Free-plan hardening:** all hosted/application configuration work in the original contract is completed, verified and production-live.\n- **#215B — Free compromised-password screening:** implement and verify the RenderLab-owned HIBP k-anonymity check described above. Supabase-native leaked-password protection remains disabled and its Security Advisor warning remains visible by design.\n\nThe user explicitly rejected upgrading Supabase solely for leaked-password protection. That paid path is abandoned for this project unless the user later reopens the decision for unrelated reasons.\n\n#215 closes when #215B is verified and the native Supabase warning is documented as an accepted platform limitation rather than a product blocker."
)

old_plan_block = "### Plan-gated #215B\n\nAfter explicit authorization to move to a qualifying Supabase plan:\n\n- enable leaked-password protection;\n- verify an owned known-compromised test password is rejected through the supported Auth error contract without exposing the password in logs/artifacts;\n- rerun Security Advisor and confirm `auth_leaked_password_protection` clears;\n- rerun Account Identity and the relevant Auth-hardening verification."
new_plan_block = "### Free #215B — RenderLab compromised-password screening\n\nImplementation must remain dependency-light and preserve the existing password/session/recovery contracts:\n\n- add a small account-layer browser helper that SHA-1 hashes the complete submitted candidate with Web Crypto, queries only the five-character prefix from the official HIBP Pwned Passwords range API using padded responses, and compares suffixes locally;\n- call the helper from the shared `AccountPasswordForm` after local length/match validation and before the existing Supabase password mutation, so both ordinary change and verified recovery replacement are covered;\n- do not add an incremental/on-change lookup;\n- use bounded timeout/retry behavior and fail closed with sanitized copy when HIBP cannot be checked;\n- preserve current-password verification, recovery-marker semantics, acting-session preservation, other-session revocation and stale-bearer rejection unchanged;\n- extend deterministic verification to prove a known public compromised-password fixture is blocked before Auth mutation, a generated non-compromised fixture can proceed, network/unavailable behavior fails closed, and no plaintext/full hash is placed in logs/artifacts;\n- perform at least one bounded live range-API smoke at exact head to prove the external dependency is reachable without making CI depend on secret credentials.\n\nDo **not** enable, purchase or simulate Supabase-native leaked-password protection as part of #215B."
replace(contract, old_plan_block, new_plan_block)

replace(contract,
    "### Stage 4 — #215B plan-gated closure\n\nWhen a qualifying Supabase plan is explicitly approved:\n\n1. capture current Auth config/advisor state again;\n2. enable leaked-password protection;\n3. verify rejection behavior using an owned fixture and non-secret evidence;\n4. confirm the Security Advisor warning clears;\n5. update #215 and roadmap documentation.",
    "### Stage 4 — #215B free-screening closure\n\n1. implement the bounded HIBP range check under the privacy rules above;\n2. verify deterministic compromised, clean and unavailable paths without logging candidate secrets;\n3. run an exact-head live HIBP reachability smoke plus Engineering Quality and Account Identity;\n4. verify Security Advisor has no **new** findings while accepting that `auth_leaked_password_protection` remains because Supabase-native enforcement is intentionally disabled on Free;\n5. merge, verify merged-main checks, update #215/roadmap/infrastructure documentation and close #215;\n6. deploy only under a separate explicit production authorization."
)

replace(contract,
    "- Security Advisor has no new security findings; the leaked-password warning may remain only because the current Free plan blocks that feature;",
    "- Security Advisor has no new security findings; `auth_leaked_password_protection` is allowed to remain as a documented Supabase-native limitation after the RenderLab-owned HIBP control is verified;"
)

replace(contract,
    "### #215B — broader-beta leaked-password acceptance\n\n- qualifying Supabase plan explicitly approved and active;\n- leaked-password protection enabled;\n- owned compromised-password test is rejected without secret leakage;\n- `auth_leaked_password_protection` Security Advisor warning clears;\n- relevant exact-head account/security verification passes;\n- roadmap/issue documentation records the completed blocker.",
    "### #215B — free compromised-password-screening acceptance\n\n- no Supabase billing/plan upgrade is introduced for this control;\n- official HIBP Pwned Passwords range lookup is used with five-character SHA-1 prefix k-anonymity and padded responses;\n- plaintext passwords and complete hashes never leave the browser for the HIBP lookup and are never logged/stored by RenderLab;\n- known-compromised password fixture is rejected before Supabase password mutation in both ordinary/recovery shared-form coverage;\n- deterministic unavailable/network failure path fails closed with sanitized product copy;\n- a generated non-compromised password proceeds through existing password replacement/session semantics;\n- exact-head Engineering Quality, Account Identity and bounded live HIBP reachability verification pass;\n- Security Advisor has no new findings; its native leaked-password warning remains documented/accepted rather than falsely claimed cleared;\n- roadmap/issue/infrastructure documentation records the completed free alternative."
)

replace(contract,
    "Completing #215A does not automatically authorize #216, #217 or #223 implementation. After #215A is verified, re-establish repository/live Auth state and expand the next immediate roadmap slice into its own contract.",
    "Completing #215A does not automatically authorize #216, #217 or #223 implementation. #215B free compromised-password screening is the immediate remaining slice for #215; after it is verified and #215 closes, re-establish repository/live Auth state and expand the next roadmap slice into its own contract."
)

infra = "docs/architecture/INFRASTRUCTURE.md"
anchor = "- Automatic Git → Vercel deployment remains disabled; future production releases still require explicit authorization.\n\n## Security Rules"
insert = "- Automatic Git → Vercel deployment remains disabled; future production releases still require explicit authorization.\n\n## #215B free compromised-password screening decision — 2026-09-14\n\n- The user explicitly rejected upgrading Supabase solely for native leaked-password protection. RenderLab will not move to Pro+ for this feature.\n- The selected free replacement is the official Have I Been Pwned **Pwned Passwords** range API, the same underlying breach-password service Supabase documents for its native paid feature. The Pwned Passwords range API requires no API key/subscription.\n- RenderLab will use browser-side Web Crypto SHA-1 only to derive the HIBP lookup hash, transmit only the first five hexadecimal characters, request `Add-Padding: true`, and compare returned suffixes locally. Plaintext passwords and complete hashes must never be sent to HIBP, stored or logged.\n- The lookup runs only on complete form submission, never incrementally while the user types. Password establishment/change fails closed after a bounded timeout/retry if the check cannot complete.\n- This is an application-layer product control, not equivalent to Supabase-native Auth enforcement. On Supabase Free, a technically capable authenticated user can bypass normal RenderLab UI and call the hosted Auth endpoint directly; removing that bypass would require a paid/native hook or a materially different Auth architecture and is not authorized.\n- Security Advisor will therefore continue to report `auth_leaked_password_protection`. After #215B is verified, that warning is an accepted Supabase-platform limitation rather than a RenderLab broader-beta blocker.\n- No Supabase plan/billing change, schema/RLS change, new secret, paid HIBP subscription, R2 change or generation infrastructure change is authorized by this decision.\n\n## Security Rules"
replace(infra, anchor, insert)

print("#215B free compromised-password-screening docs patched")
