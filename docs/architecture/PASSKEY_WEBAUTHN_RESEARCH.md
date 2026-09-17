# Passkeys / WebAuthn Research Decision

**Tracker:** #221  
**Parent roadmap:** #213 / `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`  
**Research baseline:** `main` `888acaa300a8e027bf25251d6cf808ad3abbc9ea`  
**Audit date:** 2026-09-17  
**Status:** RESEARCH CHECKPOINT COMPLETE / IMPLEMENTATION DEFERRED / NO HOSTED MUTATION / NOT DEPLOYED

## 1. Decision

Do **not** promote #221 into implementation yet.

RenderLab's current architecture can accommodate optional passkey sign-in without bypassing account admission, role/access authorization, live-session enforcement, password recovery, or the existing TOTP/AAL2 privileged policy. The blocking issue is provider maturity and configuration certainty, not a fundamental RenderLab architecture mismatch.

Supabase currently documents hosted passkeys as **experimental** and requires explicit client opt-in. The API may change without notice. The approved hosted project contains the current WebAuthn credential/challenge schema, but this research did not mutate Auth configuration and did not establish the live values of `passkey_enabled`, WebAuthn RP ID, display name, or allowed origins through an independently readable hosted configuration surface. Those facts must be verified before any implementation contract can authorize enrollment.

#221 therefore remains a research/deferred capability. Password + email recovery and the existing TOTP/AAL2 policy remain the production authentication/recovery baseline.

## 2. Current provider capability

Current official Supabase documentation establishes:

- Passkey support is experimental and requires `auth.experimental.passkey: true` when creating a compatible Supabase client.
- `@supabase/supabase-js` v2.105.0 or later is required. RenderLab currently pins `2.112.4`, so the library version is sufficient.
- Registration requires an existing confirmed, non-anonymous user.
- Passkey sign-in uses discoverable WebAuthn credentials and can create an ordinary Supabase Auth session without first asking for email/username.
- Supported management operations include register, sign in, list, rename, inspect `last_used_at`, and delete; trusted-server admin APIs can also list/revoke passkeys.
- Hosted configuration requires a stable RP display name, RP ID, and allowed origins. HTTPS is required except for loopback development origins. Changing the RP ID invalidates existing passkeys.
- SSO and anonymous-user limitations remain provider constraints.

Primary provider reference: https://supabase.com/docs/guides/auth/passkeys

## 3. Approved hosted-project read-only audit

Read-only inspection of approved shared Supabase project `rashyleshocuvpgcooxy` on 2026-09-17 found:

- project state `ACTIVE_HEALTHY`;
- `auth.webauthn_credentials` exists and is empty;
- `auth.webauthn_challenges` exists and is empty;
- `auth.webauthn_credentials` is owner-linked to `auth.users` and stores credential/public-key identity, AAGUID, sign counter, transports, backup flags, friendly name, timestamps, and `last_used_at`;
- `auth.webauthn_challenges` stores registration/authentication challenge state with expiry;
- no WebAuthn credential or challenge fixture was created by this research.

The presence of these Auth-owned tables proves that the current hosted Auth schema contains passkey-era support. It does **not** prove that passkeys are enabled for this project or that the project has a correct RP configuration.

No Supabase Auth configuration, schema, user, credential, challenge, factor, email template, or production application state was mutated.

## 4. RenderLab integration fit

### 4.1 Admission and authorization stay separate

A passkey would be an Auth sign-in method only. It must not become RenderLab authorization.

After Supabase creates a session, the existing RenderLab server boundary must continue to freshly verify:

- canonical `auth.users.id` identity;
- signed JWT claims and `session_id`;
- owner-scoped live `auth.sessions` membership;
- RenderLab admission/access status;
- role and privileged-operation policy.

This preserves the invitation-only and suspended-account boundaries. A valid passkey for a Supabase user must never create, infer, restore, or bypass RenderLab admission.

### 4.2 Passkey sign-in is not assumed to satisfy Admin AAL2

Current Supabase MFA documentation defines `aal2` around conventional sign-in plus an enrolled/verified MFA factor. The current passkey documentation does not establish that a passwordless passkey sign-in should be treated by RenderLab as satisfying its existing TOTP/AAL2 Admin policy.

RenderLab therefore must keep the #217 privileged policy unchanged unless a later implementation contract has explicit provider evidence and configured acceptance proving a deliberate assurance-policy change. In the current system:

- passkey sign-in may eventually replace password entry as an optional first-factor/member sign-in path;
- enrolled TOTP remains the verified step-up mechanism for accounts that require `aal2`, including active Admin access;
- no passkey enrollment or sign-in may silently weaken, bypass, or reinterpret current TOTP enforcement.

## 5. RP domain and origin strategy

The production application currently uses `https://renderlab.faresuniform.uk` as its public custom domain. That hostname is the narrow candidate RP ID because it scopes credentials to RenderLab rather than unnecessarily widening them to sibling `*.faresuniform.uk` applications.

This research does **not** lock that RP ID.

Before enrollment is ever enabled, an implementation contract must explicitly confirm:

1. `renderlab.faresuniform.uk` is the durable public authentication hostname rather than a temporary alias;
2. whether any additional RenderLab subdomain genuinely needs to share the same passkeys;
3. the exact production origin list;
4. the exact loopback origins used only for configured development/CI acceptance;
5. that no Vercel-generated preview hostname is being made a durable passkey identity accidentally.

A parent RP ID such as `faresuniform.uk` must not be selected merely for convenience because it broadens credential scope across sibling subdomains. A Vercel-generated hostname must not become the long-lived RP identity while the custom RenderLab domain is authoritative.

Because changing RP ID makes existing passkeys unusable, this decision is a one-way compatibility boundary once real users enroll.

## 6. Browser and UX findings

WebAuthn itself is broadly available across modern browsers and devices, while some newer convenience surfaces vary by browser/version. Current MDN guidance classifies the Web Authentication API as broadly available and conditional passkey mediation as broadly available, while individual extensions/capabilities still require feature detection.

Future implementation must therefore:

- feature-detect WebAuthn rather than infer support from browser brand;
- treat passkey creation/sign-in cancellation as a normal user-controlled outcome, not an account error;
- keep password sign-in available while the feature is optional/experimental;
- preserve paste/password-manager behavior for the password path;
- provide explicit success/failure status after the operating-system credential dialog returns;
- make create/manage/remove actions keyboard- and assistive-technology-usable around the platform dialog;
- verify desktop and mobile platform-authenticator behavior plus at least one cross-device/hybrid path before production rollout;
- avoid depending on conditional mediation/autofill as the only sign-in entry point.

References:
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
- https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Passkeys
- https://fidoalliance.org/design-guidelines/

## 7. Password, recovery, and account-safety policy

While Supabase passkeys remain experimental, RenderLab must use an additive coexistence model:

- existing email/password sign-in remains available;
- existing sign-in-email password recovery remains available;
- passkeys are optional and never the sole recovery mechanism;
- enrolling a passkey does not remove or disable the account password;
- losing/removing all passkeys does not make the account unrecoverable;
- password replacement/recovery semantics and compromised-password screening remain unchanged;
- passkey registration and deletion are sensitive sign-in-method changes and require a future contract to define recent proof/step-up requirements before mutation.

A future passwordless-only or passkey-as-recovery product would be a separate security decision and is not authorized by #221.

## 8. Management and Settings shape for a future implementation

If #221 is later promoted, the product should remain subordinate to the existing Security/Account system rather than creating a new top-level destination.

The minimum future management surface should support:

- register a passkey while already authenticated;
- list current passkeys using provider-owned metadata only;
- rename a passkey;
- show coarse creation and last-used timestamps;
- delete/revoke an individual passkey;
- explain that passwords/recovery remain available;
- avoid exposing raw credential IDs, public keys, AAGUID internals, attestation blobs, challenge state, or provider implementation details.

No application UI for this surface is authorized by this research checkpoint.

## 9. Security notifications

Supabase currently exposes project-level security notification templates for:

- password changed;
- email changed;
- phone changed;
- MFA factor enrolled/unenrolled;
- sign-in identity linked/unlinked.

Current provider documentation does not establish a dedicated passkey-added/passkey-removed notification contract that this research can safely treat as production truth.

Before promotion, configured acceptance must determine which provider event—if any—is emitted for passkey registration/deletion and prove that the corresponding RenderLab-branded security notification is actually delivered. If Supabase does not emit an appropriate security notification, the implementation contract must decide whether RenderLab owns a separate notification path. This is a promotion blocker, not something to guess from similarly named MFA/identity templates.

Reference: https://supabase.com/docs/guides/auth/auth-email-templates

## 10. Required promotion gate

#221 may move from research to an implementation-planning phase only when all of the following are true:

1. **Provider maturity:** Supabase no longer labels the intended production passkey API experimental, or an explicit project decision accepts that instability with a bounded rollback/compatibility plan.
2. **Hosted configuration read:** current `passkey_enabled`, RP ID, RP display name and allowed origins are read from the approved hosted project without mutation and reconciled with repository intent.
3. **Stable RP decision:** the durable RenderLab authentication hostname and exact origin set are explicitly accepted before any real credential enrollment.
4. **Assurance policy:** passkey session AAL/AMR behavior is empirically verified and the existing TOTP/Admin policy is either preserved or deliberately amended with exact evidence.
5. **Recovery:** password/email recovery coexistence is preserved and tested; passkeys are not the sole recovery path.
6. **Notifications:** registration/removal notification behavior is verified rather than inferred.
7. **Compatibility:** configured browser/device acceptance covers supported, unsupported, cancelled, duplicate, stale/unknown credential, cross-device, and lost-device/removal cases.
8. **No admission bypass:** passkey-authenticated sessions pass through the same RenderLab admission, access, live-session, role and suspension boundaries as password sessions.
9. **Execution-ready contract:** a separate implementation contract is reviewed and merged before any hosted Auth mutation or application implementation begins.

Until those gates are satisfied, the correct repository state is **research complete at this checkpoint, implementation deferred**.

## 11. Explicitly not authorized

This research does not authorize:

- enabling hosted passkeys;
- changing WebAuthn RP settings;
- registering a real passkey or test credential in the shared project;
- changing password, recovery, MFA, AAL or Admin enforcement;
- changing Supabase email/security-notification configuration;
- adding passkey UI or sign-in code;
- adding schema migrations;
- changing production domains;
- deploying any application change.
