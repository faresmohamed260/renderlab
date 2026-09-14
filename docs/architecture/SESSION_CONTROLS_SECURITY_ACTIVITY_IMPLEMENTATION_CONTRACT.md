# Session Controls & Security Activity — Implementation Contract

**Tracker:** #216  
**Parent roadmap:** #213  
**Audit date:** 2026-09-15  
**Status:** IMPLEMENTATION CONTRACT  
**Baseline:** `main` `8b7f6c9992bd5ea6b3b1bf95179a8a77028daaf0`

## 1. Goal

Add truthful user-facing session visibility and supported sign-out controls without exposing Supabase Auth internals, inventing device/location certainty, or claiming a Security Activity history from a source the hosted project does not currently populate.

This contract authorizes the first implementation slice of #216. It does not authorize deployment.

## 2. Audited current state

RenderLab currently exposes a single Settings action labelled `Sign out everywhere`. The client calls Supabase `signOut()` without a scope, which currently means global sign-out.

The approved shared Supabase project `rashyleshocuvpgcooxy` has live `auth.sessions` rows with session UUID, owner UUID, created/updated/refreshed timestamps, AAL, user-agent and IP fields. Those provider-owned rows are not a browser data source and must remain behind the trusted server boundary.

Current Supabase Auth supports three user sign-out scopes:

- `local`: current session only;
- `others`: every other session while preserving the current session;
- `global`: all sessions.

Supabase deletes the affected session/refresh-token authority, but an already-issued access JWT may remain cryptographically valid until its encoded expiration. The JWT contains a required `session_id` claim corresponding to `auth.sessions.id`. Strong immediate RenderLab revocation therefore requires live session existence to be part of private authorization rather than signature/AAL alone.

The live project currently has **zero rows** in `auth.audit_log_entries` despite active Auth usage. Current Supabase documentation permits database-backed Auth audit storage to be disabled while retaining provider-side dashboard logs. #216 must not silently enable additional database audit retention or build a user-facing Security Activity history on an empty/unverified source.

## 3. Scope decisions

### 3.1 Session inventory ships in this slice

Settings will show the signed-in user's active Supabase Auth sessions through a server-owned projection.

Each projected item may expose only:

- an opaque session identifier for list identity;
- whether the row is the current session;
- session-created timestamp;
- last-active timestamp derived conservatively from `refreshed_at`, falling back to `updated_at`/`created_at`;
- a conservative browser/platform label derived server-side from the stored user-agent string.

The browser must **not** receive:

- IP address;
- raw user-agent text;
- refresh-token material/counters/HMAC keys;
- factor IDs;
- OAuth client IDs;
- user IDs other than the already-known current identity;
- raw provider Auth rows or arbitrary Auth metadata.

No geographic location is derived from IP. No session is labelled “suspicious”, “trusted”, “new device” or similar without a separate risk-detection contract.

### 3.2 Current-session identification is cryptographically verified

The server obtains the request's verified JWT claims using the supported Supabase Auth client and requires a valid `session_id` UUID claim. It does not identify the current session by parsing an unverified cookie/token payload.

The `session_id` must belong to the freshly verified current user and must exist in the owner-scoped live session projection. Missing/mismatched state fails closed.

### 3.3 Private RenderLab authorization becomes live-session aware

The existing fresh Auth + MFA authorization boundary will additionally require the verified request `session_id` to exist in live `auth.sessions` for the same user.

This applies to the shared `getFreshCurrentRenderLabAuthentication()` boundary so private product and Admin APIs lose RenderLab authorization immediately after the corresponding provider session row is revoked, even if the old access JWT has not yet expired.

This is deliberately stronger than relying on `getUser()`/JWT signature alone and aligns sign-out controls with what RenderLab tells the user happened.

### 3.4 Supported sign-out controls

For a signed-in account, Settings exposes three explicit actions:

1. **Sign out this device** → `signOut({ scope: "local" })`
   - ends the current provider session;
   - clears the current browser session;
   - returns to signed-out Settings state.

2. **Sign out other devices** → `signOut({ scope: "others" })`
   - revokes every other provider session while preserving the current one;
   - Settings remains signed in;
   - the session inventory is refreshed and shows only the surviving current session once provider state settles.

3. **Sign out everywhere** → `signOut({ scope: "global" })`
   - revokes all provider sessions, including the current one;
   - clears the current browser session;
   - returns to signed-out Settings state.

Controls must use the supported Auth API. They must not delete rows directly from `auth.sessions`.

### 3.5 No arbitrary row-level revoke in v0.1

The current supported user API exposes local/others/global revocation, not a supported user operation that accepts an arbitrary session UUID and revokes exactly that session.

Therefore the inventory is read-only per row. RenderLab must not show a decorative or SQL-backed `Revoke` button beside individual sessions.

If Supabase later exposes a supported exact-session revoke contract, row-level revoke may be planned separately.

### 3.6 No IP display in v0.1

Although provider rows contain IP addresses, #216 does not expose them.

Reasons:

- IP is personal network data;
- an address does not reliably establish a physical city/device location;
- exposing IP adds privacy surface without being required for the core takeover-response controls.

Any future IP/location display requires a separate privacy/retention/accuracy decision.

### 3.7 Security Activity is deferred, not faked

Current provider documentation describes Auth audit events such as login, logout, password, token and MFA changes. However, the approved hosted project's `auth.audit_log_entries` table is currently empty.

This implementation must therefore **not** add a Security Activity feed, an empty “No activity” component that implies complete coverage, or new-device/suspicious-login alerts.

Before Security Activity ships, a later contract must establish:

- the supported event source actually available to RenderLab;
- whether database audit writing must be enabled;
- retention duration and storage impact;
- privacy treatment of IP/user-agent/metadata;
- a stable sanitization/event taxonomy;
- configured acceptance proving the source is populated and complete enough for the claimed UX.

No hosted audit-retention setting is changed by this slice.

### 3.8 Session lifetime policy is unchanged

Current hosted session lifetime/inactivity/single-session controls are plan-dependent and are not required for this first slice. #216 does not authorize a plan upgrade or a hosted session-lifetime policy change.

RenderLab preserves the current multi-session model and adds user control rather than silently forcing single-session use.

## 4. Database boundary

A narrow repository-owned migration is authorized because `auth.sessions` is provider-owned and deliberately not exposed to ordinary browser/Data API access.

The next migration after current `0018_image_upscale_job_semantics.sql` will add a minimal server-only `SECURITY DEFINER` function in the public API schema that projects owner-scoped session data from `auth.sessions`.

Requirements:

- `security definer` with `set search_path = ''`;
- exact fully-qualified provider table references;
- explicit non-null `p_user_id uuid` input;
- returns only approved session projection fields needed by the server (`id`, creation/update/refresh timestamps, user-agent; AAL only if required internally and not forwarded by default);
- owner filter must be inside the function;
- revoke all from `public`, `anon`, `authenticated`;
- grant execute only to `service_role`;
- no write/delete capability against `auth.sessions`;
- no IP/refresh-token/factor/OAuth projection;
- migration remains repository source of truth and is applied through the approved Supabase migration mechanism before configured acceptance.

The service-role credential remains server-only.

## 5. Application architecture

### Server

Add a server module responsible for:

- invoking the service-role-only session projection;
- validating returned UUID/timestamp/string shapes;
- normalizing user-agent into conservative display labels;
- sorting current session first, then most recently active;
- finding/checking a specific live session for authorization;
- returning `null`/denial on provider/RPC errors rather than falling back to stale claims.

The shared fresh-authentication boundary in `src/lib/supabase/server.ts` will:

1. freshly verify the user;
2. obtain verified JWT claims and `session_id`;
3. obtain current MFA assurance and authoritative live factor state;
4. verify that `session_id` exists in live owner-scoped sessions;
5. fail closed if any required provider truth is missing/inconsistent.

### Settings server component

`src/app/(app)/settings/page.tsx` will load the sanitized session projection only for a freshly verified signed-in identity. A session-inventory failure must not leak provider errors; the UI may show session controls unavailable while retaining ordinary account recovery/security access where safe.

### Client Settings component

The existing Settings component will:

- replace the single ambiguous Sessions row with a compact session inventory;
- clearly mark `This device` only on the verified current session;
- show created/last-active times and conservative reported browser/platform labels;
- expose the three supported sign-out scope actions;
- preserve existing MFA/password/Admin controls and visual system;
- use accessible button labels/status feedback and avoid confirmation patterns that obscure which scope is being revoked.

The UI change is an extension of the existing Phase 27 Settings system, not a redesign.

## 6. User-agent normalization

User-agent display is descriptive only; it is not an authorization signal.

Prefer labels such as:

- `Chrome on Windows`
- `Safari on macOS`
- `Safari on iPhone`
- `Chrome on Android`
- `Firefox on Linux`
- `Unknown browser`

Rules:

- parse only enough to provide a coarse recognizable label;
- do not expose browser patch versions, device model identifiers or raw UA;
- do not claim a physical device identity;
- tests must cover common Chromium/Safari/Firefox and unknown strings.

No new dependency is required unless implementation audit proves the built-in parser would be materially less safe/maintainable.

## 7. Revocation verification contract

Configured verification must create only run-owned Auth users/sessions and clean them in `finally`.

At minimum prove:

1. two or more sessions can be created for one fixture user;
2. each access token contains a distinct `session_id` represented in the live projection;
3. the session endpoint/projection returns only the fixture user's sessions and does not expose IP/raw Auth internals;
4. current session is identified from verified claim/live-row equality;
5. `scope: "local"` removes the current session row while preserving another session;
6. the old locally signed-out bearer is denied by a private RenderLab API immediately, before JWT expiry;
7. a fresh surviving session remains authorized;
8. `scope: "others"` preserves the acting session and removes the other fixture sessions;
9. removed-other-session bearer is immediately denied by private RenderLab authorization;
10. `scope: "global"` removes all fixture sessions and old bearers are denied;
11. MFA-enrolled/AAL2 Admin session behavior remains compatible with the live-session check;
12. suspended/non-admitted account behavior remains unchanged;
13. all fixture sessions/users/access rows are cleaned up;
14. no access token, refresh token, password, service-role key, raw user-agent or IP appears in logs/artifacts.

A browser/Settings acceptance should additionally prove the inventory labels/current marker and all three controls at desktop/mobile widths without regressing the existing Settings security rows.

## 8. Failure behavior

- Session projection/RPC unavailable: fail closed for private authorization and show a non-sensitive Settings availability message where applicable.
- Missing/invalid JWT `session_id`: fail closed.
- Session claim belongs to a different owner: fail closed.
- Session disappears between page render and action: treat revocation as already achieved where the provider operation is idempotent; never recreate a session.
- `others` fails: preserve the current local session and report the operation failed; do not silently fall back to global.
- `local`/`global` fails: do not claim signed out until provider response/session state confirms it.

## 9. Non-goals

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

## 10. Documentation and closure

Implementation is complete only after:

- the migration is present in the repository and verified applied to the approved shared project;
- configured exact-head session-control verification passes;
- existing account/MFA/Admin/release workflows pass on the exact candidate;
- merged-main verification passes;
- #216 and the account/settings roadmap are updated to distinguish completed session controls from deferred Security Activity;
- production state remains explicitly `NOT DEPLOYED` unless a separate rollout is authorized.

If implementation discovers that any provider behavior above is materially false—especially sign-out/session-row semantics or JWT `session_id` behavior—stop closure, record the verified discrepancy, and amend this contract before claiming completion.