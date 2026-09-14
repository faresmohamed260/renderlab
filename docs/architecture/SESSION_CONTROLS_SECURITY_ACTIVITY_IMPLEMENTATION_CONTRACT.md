# Session Controls & Security Activity — Implementation Contract

**Tracker:** #216  
**Parent roadmap:** #213  
**Audit date:** 2026-09-15  
**Status:** IMPLEMENTED / VERIFIED / MERGED / NOT DEPLOYED  
**Planning baseline:** `main` `8b7f6c9992bd5ea6b3b1bf95179a8a77028daaf0`  
**Implementation PR:** #259  
**Verified candidate:** `061b4bf49637b4fb09f0f1486b6a85f251ea6650`  
**Implementation merge:** `590c15f6fc9db9c107b3bc67fae80083fe0d55c4`

## 1. Goal

Add truthful user-facing session visibility and supported sign-out controls without exposing Supabase Auth internals, inventing device/location certainty, or claiming a Security Activity history from a source the hosted project does not currently populate.

This contract authorized the first implementation slice of #216. The bounded slice is now implemented and verified. It did not authorize deployment, and the merged application remains **not deployed** pending a separate explicit rollout decision.

## 2. Audited provider state

The approved shared Supabase project `rashyleshocuvpgcooxy` has live `auth.sessions` rows with session UUID, owner UUID, created/updated/refreshed timestamps, AAL, user-agent and IP fields. Those provider-owned rows are not a browser data source and remain behind the trusted server boundary.

Current Supabase Auth supports three user sign-out scopes:

- `local`: current session only;
- `others`: every other session while preserving the current session;
- `global`: all sessions.

Supabase deletes the affected session/refresh-token authority, but an already-issued access JWT may remain cryptographically valid until its encoded expiration. The JWT contains a required `session_id` claim corresponding to `auth.sessions.id`. Strong immediate RenderLab revocation therefore requires live session existence to be part of private authorization rather than signature/AAL alone.

The live project had **zero rows** in `auth.audit_log_entries` despite active Auth usage at the implementation audit. Current Supabase documentation permits database-backed Auth audit storage to be disabled while retaining provider-side dashboard logs. #216 therefore did not silently enable additional database audit retention or build a user-facing Security Activity history on an empty/unverified source.

## 3. Implemented scope decisions

### 3.1 Session inventory

Settings shows the signed-in user's active Supabase Auth sessions through a server-owned projection.

Each projected item exposes only:

- an opaque session identifier for list identity;
- whether the row is the current session;
- session-created timestamp;
- last-active timestamp derived conservatively from provider session timestamps;
- a conservative browser/platform label derived server-side from the stored user-agent string.

The browser does **not** receive:

- IP address;
- raw user-agent text;
- refresh-token material/counters/HMAC keys;
- factor IDs;
- OAuth client IDs;
- raw provider Auth rows or arbitrary Auth metadata.

No geographic location is derived from IP. No session is labelled “suspicious”, “trusted”, “new device” or similar without a separate risk-detection contract.

### 3.2 Current-session identification is verified

The server obtains the request's verified JWT claims using the supported Supabase Auth client and requires a valid `session_id` UUID claim. It does not identify the current session by parsing an unverified cookie/token payload.

The `session_id` must belong to the freshly verified current user and must exist in the owner-scoped live session projection. Missing/mismatched state fails closed.

### 3.3 Private RenderLab authorization is live-session aware

The shared `getFreshCurrentRenderLabAuthentication()` boundary requires the verified request `session_id` to exist in live `auth.sessions` for the same user in addition to fresh user, factor and AAL checks.

Private product and Admin APIs therefore lose RenderLab authorization immediately after the corresponding provider session row is revoked, even if the old access JWT has not yet expired.

### 3.4 Supported sign-out controls

For a signed-in account, Settings exposes three explicit actions:

1. **Sign out this device** → `signOut({ scope: "local" })`
   - ends the current provider session;
   - clears the current browser session;
   - returns to signed-out Settings state.

2. **Sign out other devices** → `signOut({ scope: "others" })`
   - revokes every other provider session while preserving the current one;
   - Settings remains signed in;
   - the session inventory refreshes to the surviving current session once provider state settles.

3. **Sign out everywhere** → `signOut({ scope: "global" })`
   - revokes all provider sessions, including the current one;
   - clears the current browser session;
   - returns to signed-out Settings state.

The controls use supported Supabase Auth APIs. They do not delete rows directly from `auth.sessions`.

### 3.5 No arbitrary row-level revoke in v0.1

The supported user API exposes local/others/global revocation, not a supported user operation that accepts an arbitrary session UUID and revokes exactly that session.

The inventory is therefore read-only per row. RenderLab does not show a decorative or SQL-backed `Revoke` button beside individual sessions.

If Supabase later exposes a supported exact-session revoke contract, row-level revoke may be planned separately.

### 3.6 No IP display in v0.1

Although provider rows contain IP addresses, #216 does not expose them. IP is personal network data and does not reliably establish a physical city/device location. Any future IP/location display requires a separate privacy/retention/accuracy decision.

### 3.7 Security Activity is deferred, not faked

Provider documentation describes Auth audit events such as login, logout, password, token and MFA changes. However, the approved hosted project's `auth.audit_log_entries` table was empty at audit time.

This implementation therefore does **not** add a Security Activity feed, an empty “No activity” component that implies complete coverage, or new-device/suspicious-login alerts.

Before Security Activity ships, a later contract must establish:

- the supported event source actually available to RenderLab;
- whether database audit writing must be enabled;
- retention duration and storage impact;
- privacy treatment of IP/user-agent/metadata;
- a stable sanitization/event taxonomy;
- configured acceptance proving the source is populated and complete enough for the claimed UX.

No hosted audit-retention setting was changed by this slice.

### 3.8 Session lifetime policy is unchanged

Current hosted session lifetime/inactivity/single-session controls are plan-dependent and are not required for this slice. #216 did not authorize a plan upgrade or a hosted session-lifetime policy change.

RenderLab preserves the current multi-session model and adds user control rather than silently forcing single-session use.

## 4. Database boundary

Migration `0019_renderlab_auth_session_projection.sql` adds the minimal server-only `public.renderlab_auth_session_projection(p_user_id uuid)` projection over provider-owned `auth.sessions`.

Verified hosted properties:

- `SECURITY DEFINER`;
- owner `postgres`;
- `search_path` is empty;
- fully-qualified provider relation access;
- owner filter inside the function;
- returns only session ID, created timestamp, last-active timestamp and user-agent for server-side normalization;
- no IP, refresh-token, factor or OAuth projection;
- no write/delete capability against `auth.sessions`;
- `anon`, `authenticated` and `PUBLIC` cannot execute;
- `service_role` can execute.

The migration is present in the repository and applied to the approved shared project. The service-role credential remains server-only.

## 5. Application architecture

### Server

`src/server/account/account-sessions.ts` is responsible for:

- invoking the service-role-only session projection;
- validating returned UUID/timestamp/string shapes;
- normalizing user-agent into conservative display labels through the pure formatter;
- sorting current session first, then most recently active;
- finding/checking a specific live session for authorization;
- returning `null`/denial on provider/RPC errors rather than falling back to stale claims.

The shared fresh-authentication boundary in `src/lib/supabase/server.ts`:

1. freshly verifies the user;
2. obtains verified JWT claims and `session_id`;
3. obtains current MFA assurance and authoritative live factor state;
4. verifies that `session_id` exists in live owner-scoped sessions;
5. fails closed if any required provider truth is missing/inconsistent.

### Settings

The Settings server component loads the sanitized session projection only for a freshly verified signed-in identity. The client renders the compact inventory, exactly one verified `This device` marker, created/last-active times and the three supported sign-out scope actions while preserving existing MFA/password/Admin controls.

The UI is an extension of the approved Phase 27 Settings system, not a redesign.

## 6. User-agent normalization

User-agent display is descriptive only; it is not an authorization signal.

Labels are intentionally coarse, for example:

- `Chrome on Windows`
- `Safari on macOS`
- `Safari on iPhone`
- `Chrome on Android`
- `Firefox on Linux`
- `Unknown browser`

The formatter does not expose browser patch versions, device model identifiers or raw UA and does not claim a physical device identity. Unit tests cover Chromium/Safari/Firefox/Edge/mobile/unknown cases.

## 7. Verified acceptance

Configured verification creates only run-owned Auth users/sessions and proves:

1. multiple sessions for one fixture user have distinct `session_id` claims represented in the live projection;
2. projection is owner-scoped and exposes only the approved fields;
3. current session is derived from verified claim/live-row equality;
4. `local` removes the acting session while preserving another;
5. the old locally signed-out bearer is denied by private RenderLab authorization before JWT expiry;
6. `others` preserves the acting session and removes the other fixture sessions;
7. removed-other-session bearer is immediately denied;
8. `global` removes all fixture sessions and old bearers are denied;
9. Settings desktop and 390px views render the inventory/current marker and all three controls without overflow or undersized touch targets;
10. inherited MFA/Admin/account/release behavior remains compatible with the live-session check;
11. fixture cleanup is exact and leaves no test Auth/account residue;
12. no access token, refresh token, password, service-role key, raw user-agent or IP appears in logs/artifacts.

The configured workflow emits the verified markers:

- `SESSION_SCOPE_LOCAL=verified`
- `SESSION_SCOPE_OTHERS=verified`
- `SESSION_SCOPE_GLOBAL=verified`
- `SESSION_SETTINGS_BROWSER=verified`
- `SESSION_SETTINGS_GLOBAL=verified`

A cleanup hardening pass added `scripts/cleanup-stale-session-control-fixtures.mjs`. It removes only users carrying the exact `session-controls` / `session-controls-control` fixture tags, only after the age guard, and uses supported Supabase Admin Auth deletion. It reduced stale fixture debt from 10 tagged users to 0; the successful verifier then left 0 tagged users.

## 8. Failure behavior

- Session projection/RPC unavailable: fail closed for private authorization and show a non-sensitive Settings availability message where applicable.
- Missing/invalid JWT `session_id`: fail closed.
- Session claim belongs to a different owner: fail closed.
- Session disappears between page render and action: treat revocation as already achieved where the provider operation is idempotent; never recreate a session.
- `others` fails: preserve the current local session and report failure; do not silently fall back to global.
- `local`/`global` fails: do not claim signed out until provider response/session state confirms it.

## 9. Non-goals retained after closure

This slice does not implement:

- exact arbitrary session-row revoke;
- IP or geolocation display;
- device fingerprinting/trust;
- suspicious-login scoring;
- new-device alerts;
- Auth audit-log retention changes;
- Security Activity UI;
- session lifetime/inactivity/single-session hosted configuration;
- schema exposure of `auth.sessions` to browser roles;
- deployment.

## 10. Closure evidence

#216 implementation is verified complete for the bounded v0.1 contract:

- implementation PR #259 exact candidate: `061b4bf49637b4fb09f0f1486b6a85f251ea6650`;
- application implementation merge: `590c15f6fc9db9c107b3bc67fae80083fe0d55c4`;
- exact-head Session Controls configured verification passed;
- exact-head Account Identity, MFA Privileged Step-Up, Account/Admin Operations, Integrated Release and Engineering Quality passed;
- the hosted migration and execute privileges were independently re-audited after apply;
- merged-main push workflows all passed on `590c15f6fc9db9c107b3bc67fae80083fe0d55c4`: Image Upscale Integration `34903482310`, Image Model Routing `34903482253`, UI Shell Validation `34903482120`, Creative Iteration `34903482087`, Engineering Quality `34903482265`, Generation Reconciliation `34903482279`, Generation Integration `34903482258`, Video Generation Integration `34903482130`, and Reference Upload Integration `34903482498`;
- the Video Generation merged-main run completed all four configured live Video/Animate cases plus cleanup successfully;
- production deployment was not performed and remains a separate explicit operation.

The Security Activity half of the roadmap label remains intentionally deferred rather than falsely represented as implemented. A future implementation requires a trustworthy populated event source and an explicit privacy/retention contract.