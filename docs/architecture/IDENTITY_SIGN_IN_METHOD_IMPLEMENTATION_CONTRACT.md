# Identity & Sign-in Method Management — Implementation Contract

**Tracker:** #218  
**Parent roadmap:** #213 / `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`  
**Audit date:** 2026-09-15  
**Status:** IMPLEMENTATION CONTRACT / EMAIL-CHANGE V0.1  
**Baseline:** `main` `a8e19127e4135acc604d9dd8148e1fef5e417e7e`  
**Scope:** secure sign-in-email change for existing password accounts  
**Does not authorize:** OAuth/social identity linking, account merge, profile/display-identity work, provider/plan changes, production deployment

## 1. Goal

Allow an authenticated RenderLab account to change its canonical sign-in email without changing its immutable owner identity, bypassing invitation-only admission, weakening the #217 MFA contract, or implying unsupported identity-linking/account-merge behavior.

This contract authorizes the bounded repository implementation described below after this document is merged. Any hosted Supabase Auth configuration mutation or production deployment remains a separate explicit operation.

## 2. Audited current state

### RenderLab identity and authorization

- Supabase `auth.users.id` is the canonical immutable account/owner identity.
- `renderlab_account_access` is keyed by `user_id`, not email.
- `renderlab_claim_beta_invitation(...)` returns an existing account-access row for the supplied `user_id` before consulting invitation email. An already-admitted account therefore does not re-claim admission merely because its Auth email changes.
- Owner-scoped media/jobs/collections/uploads/admission state are keyed to the same Auth user UUID and require no rewrite during an email change.
- Admin account listing resolves the current Auth user through `auth.admin.getUserById(userId)` and uses the live Auth email. `renderlab_account_access` does not contain a copied account email that could become stale.
- Settings currently shows the sign-in email as read-only and truthfully states that email changes are not yet available.
- `/auth/confirm` currently accepts only `invite` and `recovery`; email-change confirmation is not implemented.

### Existing MFA/session guarantees

#217 is complete and binding:

- one verified TOTP factor maximum;
- optional ordinary-member MFA, but AAL2 is required by RenderLab once a factor is enrolled;
- active Admin requires factor + AAL2;
- recent protected TOTP step-up is 10 minutes for sensitive operations;
- recovery email/session state never counts as MFA.

#216 is complete and binding:

- private RenderLab authorization freshly verifies the Auth user;
- a verified JWT `session_id` must still exist in the owner’s live `auth.sessions`;
- revoked sessions therefore fail closed before access-JWT expiry.

### Hosted Auth/email baseline

#215 verified the current hosted project state and mail path:

- Site URL: `https://renderlab.faresuniform.uk`;
- custom SMTP through Resend;
- email link tracking disabled in the established mail path;
- Secure Email Change enabled;
- branded email-change template;
- `email_changed` security notification enabled and branded;
- password minimum remains 15 with no arbitrary character-class requirement.

The current redirect allowlist was built for the existing invite/recovery flows. #218 must verify the final email-change confirmation URL is allowed before calling the implementation complete. Do not silently broaden the allowlist.

## 3. Current Supabase provider behavior

A fresh 2026-09-15 audit of current Supabase Auth documentation and server source establishes the following.

### 3.1 Provider-enforced AAL for enrolled MFA

Current Auth `/user` update logic rejects email/password/phone changes when the user has MFA enabled and the current provider session is not AAL2. A direct client call such as `updateUser({ email })` from an MFA-enrolled AAL1 session returns `insufficient_aal`.

This is a provider boundary, not merely a RenderLab UI convention.

RenderLab will remain stricter: enrolled-MFA email-change initiation also requires the existing #217 **recent TOTP** rule, not only any old AAL2 session.

### 3.2 Non-MFA email-change initiation

For a password account without enrolled MFA, current Supabase permits a signed-in AAL1 session to initiate `updateUser({ email })`. Provider-side current-password/nonce reauthentication is not an email-change requirement.

RenderLab v0.1 will require current-password verification before its own email-change initiation flow, but this is **defense in depth at the RenderLab surface**, not an unbypassable provider restriction: a browser holding a valid non-MFA Auth session can address the Supabase Auth API directly.

The provider-enforced protection for the actual identity switch is therefore Secure Email Change’s mailbox-confirmation contract.

### 3.3 Secure Email Change

With Secure Email Change enabled, Supabase documents two confirmations:

- one sent to the current email;
- one sent to the requested new email.

Current Auth verification code explicitly returns after the first confirmation without applying the final change and asks the user to confirm the other email. Only the completed flow finalizes the identity change.

#218 must prove this behavior against the approved hosted project with run-owned test identities. A configuration label alone is insufficient evidence. In particular, implementation must not ship if hosted confirmation/autoconfirm settings cause one-click or immediate replacement behavior.

### 3.4 Session behavior

Email-change verification can issue a fresh Auth session. The audited provider path does not justify claiming that every pre-existing session is revoked by an email change.

RenderLab will not invent such a guarantee. Configured acceptance must measure the actual current/other-session behavior. Any surviving session remains subject to #216 live-session verification and fresh `getUser()` identity resolution, so RenderLab should display the provider’s current canonical email even when an older JWT contains stale email claims.

## 4. V0.1 product decisions

### 4.1 Email change ships; identity linking does not

V0.1 implements **sign-in-email change only**.

OAuth/social/manual identity linking is deferred because:

- no current RenderLab user friction requires another sign-in method;
- manual identity linking remains a separate provider capability with collision, unlinking and recovery consequences;
- adding providers would expand hosted configuration, consent, callback, account-collision and admission scope without solving the current #218 requirement.

No disabled “Connect Google/GitHub” UI is added for appearance.

### 4.2 Canonical identity never changes

Successful email change must preserve exactly the same `auth.users.id`.

No RenderLab owner/access/media/job/collection/upload/admission row is re-keyed. Email is a sign-in identifier and current contact/security-notification destination; it is not RenderLab ownership or authorization identity.

### 4.3 Display identity remains separate

#223 owns display name/avatar/username. The #218 UI must label the value as **Sign-in email** and must not imply changing it changes display identity or ownership.

## 5. Initiation assurance contract

Email change is a sensitive identity operation.

### 5.1 MFA-enrolled account

Before RenderLab initiates an email update:

1. obtain fresh current authentication through the existing shared server boundary;
2. require exactly one verified TOTP factor under the #217 policy;
3. require current AAL2;
4. require a TOTP authentication-method timestamp within the existing 10-minute recent-step-up window;
5. otherwise route the user through the existing MFA challenge flow and return to the email-change screen.

The provider’s own AAL2 requirement is a second independent layer. Do not weaken #217’s recent-TOTP rule to “AAL2 sometime earlier”.

### 5.2 Non-MFA password account

RenderLab requires the user’s current password immediately before initiation.

Preferred implementation:

- perform verification with an ephemeral Supabase client that does not persist or replace the primary browser/server session;
- never log, store, screenshot or return the password;
- initiate the email update only after successful verification;
- use sanitized failure text.

This check protects the RenderLab workflow against accidental/ordinary misuse. The product copy and documentation must not claim it makes provider-direct AAL1 initiation impossible.

### 5.3 Recovery sessions

A password-recovery marker/session is not sufficient proof for email change.

- enrolled-MFA recovery still requires current AAL2 + recent TOTP under #217;
- a recovery link/marker does not substitute for the ordinary current-password check on a non-MFA account;
- the recovery password flow must not silently continue into email mutation.

## 6. Initiation API and UI

Prefer a server-owned same-origin initiation endpoint or server action rather than scattering identity-policy checks across Settings components.

The initiation boundary must:

- require fresh RenderLab authentication;
- validate a syntactically valid, normalized candidate email;
- reject a candidate equal to the current canonical email;
- apply the assurance matrix above;
- call the supported Supabase user email-update API under the user’s own session;
- use a fixed RenderLab-owned confirmation destination;
- return sanitized stable errors;
- never expose service-role credentials or provider internals.

For non-MFA current-password verification, implementation may submit the password over the same-origin TLS request to this server boundary and verify it using an isolated nonpersistent Auth client, provided the password is never stored/logged. If implementation evidence shows a safer equivalent that preserves the primary session, it may be used instead.

The Settings surface should provide a dedicated small flow (for example `/settings/email`) integrated into the current Trust Register system. This is an extension of the approved Settings design, not a redesign.

After successful initiation, show truthful pending copy such as:

- the current sign-in email remains active;
- confirmations were sent to both addresses;
- the change is not complete until both provider confirmations succeed.

Do not expose confirmation hashes/tokens or raw provider errors.

## 7. Confirmation contract

### 7.1 RenderLab server confirmation route

Extend the existing `/auth/confirm` boundary to support the provider’s `email_change` verification type using token-hash verification and a fixed safe destination.

Requirements:

- accept only explicitly supported Auth email-flow types;
- keep invite/recovery behavior unchanged;
- never accept an arbitrary external `next` URL;
- preserve the established server-side token-hash pattern so mail scanners/prefetchers do not receive a direct one-click provider mutation URL;
- treat an invalid/expired/consumed token as a sanitized failure;
- distinguish “one confirmation accepted; confirm the other mailbox” from “email change completed” where the provider response exposes that distinction;
- after final completion, freshly resolve the Auth user before presenting the new sign-in email.

The hosted email-change template and redirect allowlist may require a bounded configuration update to use the RenderLab server-confirmation URL. Such a hosted mutation is **not** authorized by this docs-only contract merge. If required, implementation must prepare the exact delta and stop before applying it until separately authorized.

### 7.2 Old email remains authoritative until completion

After initiation and after only one mailbox confirmation:

- `auth.users.email` must remain the old email;
- old-email/password sign-in remains the canonical sign-in path;
- Settings/Admin must continue to resolve the old email;
- no RenderLab access/ownership state changes.

Only after the provider’s complete secure-email-change flow succeeds may the canonical Auth email become the new value.

### 7.3 Completion

After final confirmation:

- `auth.users.id` is unchanged;
- `auth.users.email` is the new verified address;
- old email can no longer authenticate that account;
- new email + existing password authenticates the same user UUID;
- Settings and Admin resolve the new email from fresh Auth truth;
- owner/access state remains unchanged;
- existing MFA factor remains attached to the same user identity;
- the provider’s actual assurance/session result is handled truthfully. If the confirmation-created session is AAL1 for an MFA-enrolled account, RenderLab must route to MFA challenge rather than granting private/Admin access.

## 8. Invitation and collision behavior

### Already-admitted account

An existing RenderLab account keeps its same `renderlab_account_access.user_id` row regardless of email change.

A pending invitation matching the new email must **not** be consumed or transferred to the already-admitted user merely because the email changed. The current claim routine’s existing-access short circuit is binding and must be covered by configured acceptance.

### Email already owned by another Auth account

Use the provider’s uniqueness protection. The authenticated user may receive a sanitized “that address cannot be used” result, but RenderLab must not expose another account’s identity, access status or invitation state.

No account merge is performed or implied.

## 9. Admin behavior

No Admin schema/data rewrite is required.

Admin account display/search must continue to resolve the user’s current email from fresh Supabase Auth state by `user_id`. Configured acceptance must prove the same Admin-visible account row shows the new email after completion without changing RenderLab role/status/overrides/ownership.

## 10. Security notifications

#215 already enabled the provider `email_changed` security notification.

Configured acceptance must prove the actual production-equivalent hosted path delivers the branded notification for an owned test identity after successful change. Do not claim delivery merely because the toggle is enabled.

If notification delivery fails while the provider change succeeds, the application must not falsely roll back or claim the identity stayed unchanged; record/report the notification failure separately and stop #218 closure until the expected mail path is healthy.

## 11. Session semantics

Do not automatically add a global sign-out merely because the email changed unless provider/security evidence demonstrates it is required.

Configured acceptance must record:

- the initiating session after first and final confirmation;
- at least one second pre-existing session;
- whether either provider session survives final email change;
- whether refresh succeeds;
- whether the fresh Auth user on each surviving session resolves the new email;
- for MFA accounts, whether final-confirmation sessions are AAL1 or AAL2 and whether RenderLab correctly challenges before protected access.

#216 remains authoritative for explicit local/others/global incident-response controls.

## 12. Configured acceptance

Use only run-owned Auth/access/invitation fixtures and owned test mailboxes/aliases. Cleanup must be exact and must not delete unrelated users/mail/data.

At minimum prove:

1. baseline fixture has old email, immutable user UUID and active RenderLab access;
2. target email is distinct and owned by the verifier;
3. non-MFA wrong-current-password initiation fails through RenderLab;
4. non-MFA correct-current-password initiation succeeds without replacing the primary session;
5. direct provider AAL1 initiation behavior is documented honestly for non-MFA accounts;
6. after initiation, canonical Auth email remains old;
7. first mailbox confirmation alone does **not** change canonical email;
8. second required confirmation finalizes the new email;
9. confirmation order is either proven order-independent or the UI/mail copy matches the provider’s required order;
10. reused/invalid/expired confirmation material fails safely;
11. same `auth.users.id` exists before/after;
12. existing RenderLab account-access role/status/overrides are unchanged;
13. representative owner-scoped product data remains owned by the same UUID;
14. a pending invitation for the new email is not claimed/transferred by the already-admitted user;
15. Admin account listing resolves the new email from live Auth state;
16. old-email/password sign-in fails after completion and new-email/same-password sign-in reaches the same UUID;
17. `email_changed` security notification is delivered through the approved hosted mail path;
18. at least two pre-existing sessions are observed before/after and the actual provider revocation/refresh behavior is recorded;
19. MFA fixture at AAL1 gets provider `insufficient_aal` on direct email mutation;
20. MFA fixture with recent TOTP/AAL2 can initiate the change;
21. both confirmations remain required for the MFA fixture;
22. post-confirmation MFA assurance is handled fail-closed/challenge-first;
23. Settings works on desktop and 390px with keyboard/touch/focus parity;
24. no password, TOTP code, access/refresh token, email-change token/hash, service-role key or Management API token appears in logs/screenshots/artifacts;
25. all exact Auth/access/invitation/product fixtures are removed or restored.

A behavioral two-mailbox test is mandatory even when hosted `secure_email_change_enabled` reads true. If one confirmation or initiation itself replaces the canonical email, **stop #218 implementation closure** and correct the hosted Auth contract before shipping.

## 13. Workflow expectations

Implementation must add or extend configured verification so email-change behavior is continuously exercised with the existing account/MFA/Admin/release gates.

Minimum merge gate on one exact candidate head:

- Engineering Quality;
- Account Identity;
- MFA;
- Admin Operations;
- Integrated Release;
- a dedicated configured Identity/Email Change verifier covering the acceptance above.

Do not weaken existing account/recovery/MFA assertions merely to make the new flow pass.

## 14. Non-goals

This v0.1 does not implement:

- OAuth/social sign-in providers;
- manual identity linking/unlinking;
- account merge;
- phone sign-in or SMS identity;
- display name/avatar/username;
- independent recovery email;
- changing `auth.users.id`;
- per-email RenderLab admission records;
- a new RenderLab identity database table;
- global session revocation unless separately justified;
- production deployment.

## 15. Closure definition

#218 email-change v0.1 is complete only when:

- the implementation contract is merged before product implementation;
- any required hosted email-template/redirect delta is explicitly authorized, applied and read back;
- the real hosted project proves two-mailbox Secure Email Change behavior;
- exact-head configured Identity/Email Change plus Account Identity/MFA/Admin/Integrated Release/Engineering gates pass;
- merged-main verification passes;
- documentation reflects verified implementation and session behavior;
- issue #218 is updated to distinguish completed email change from deferred identity linking;
- production remains explicitly **NOT DEPLOYED** unless a separate rollout is authorized.

If provider behavior materially contradicts this contract—especially AAL2 enforcement for enrolled MFA, two-confirmation Secure Email Change, immutable user UUID, or session behavior—stop closure and amend the contract from verified evidence rather than hiding the discrepancy.
