# Phase 27 Settings / Account Security R&D v0.1

**Status:** Proposed visual direction — awaiting user review  
**Tracker:** #211  
**Baseline:** `750a5365ad9786f9216f7acef10d829cae048d60`  
**R&D branch:** `rd/settings-account-security-v01`  
**Production implementation:** not authorized by this artifact

## 1. Purpose

Phase 27 is a focused visual-system pass over the already-working account and password surfaces. The goal is not to invent account features. The goal is to make the real Settings states feel like a finished part of the same RenderLab product as Create, Library, Viewer and Activity while preserving their current security boundaries exactly.

Settings is deliberately the calmest application surface. Its assigned expressiveness is **1/4**. The composition therefore uses the current UI-074 compact horizontal application header, compressed editorial hierarchy, technical microtype, precise one-pixel registration, restrained cool/warm atmosphere and the canonical quarter-arc accent without turning authentication into a marketing page or a dashboard of cards.

The checkpoint consists of:

- `design/penpot/settings-account-security-v0.1-desktop.svg`
- `design/penpot/settings-account-security-v0.1-mobile.svg`

The SVGs are open repository-backed handoff artifacts. They are design evidence, not implementation approval.

## 2. Authority and preserved contracts

The current repository implementation remains authoritative over all behavior shown here.

### Server-owned truth

- Supabase Auth `auth.users.id` remains the canonical account identity.
- `/settings` resolves current identity on the server.
- Closed Beta access/admission state remains server-derived.
- Admin continuation is present only when a fresh active-admin identity check matches the current account.
- `/settings/password` determines recovery mode from the server-validated signed recovery marker.
- Invalid, expired or missing recovery state remains fail-closed.

### Browser-owned interaction only

The client account components continue to own only form interaction and sanitized user feedback:

- email/password sign-in;
- forgot-password request;
- current-password reauthentication for an ordinary password change;
- new-password submission in verified recovery mode;
- sign-out;
- busy/error/success presentation.

The R&D direction does **not** move access, role, admission, recovery eligibility or Admin authority into browser state.

### Existing verification baseline

The configured Account Identity workflow remains the core implementation gate. It already exercises real isolated Supabase fixtures and verifies signed-out, signed-in active, suspended, password/recovery, desktop, 390px, reduced motion, action reachability, session revocation and fixture cleanup. Phase 27 should extend that verifier only where the approved presentation adds a materially new state assertion; it should not create a parallel auth contract.

## 3. Product-state map

| State | User truth | Primary action | Secondary / recovery | R&D treatment |
| --- | --- | --- | --- | --- |
| Runtime unavailable | Account runtime cannot be configured/verified | none | retry through normal navigation later | restrained inline system notice; never fake signed-out state |
| Signed out | No verified session | Sign in | Forgot password | focused credential surface; Closed Beta note remains contextual; no signup |
| Recovery request sent | Request accepted without account enumeration | Return to sign in / continue | resend only through same existing control if supported | quiet success notice in the same credential register |
| Invitation accepted | Auth link succeeded | Continue/sign in as current flow allows | none invented | positive inline event notice above account register |
| Invitation required | Identity exists but admission missing under enforcement | no product-access action invented | password/sign-out remain if authenticated | explicit textual access state; no fake request-access button |
| Active | Authenticated and admitted | Change password | Sign out | identity first, access truth second, security third |
| Suspended | Authenticated but private product use paused | Change password | Sign out | warm caution treatment; recovery actions remain fully available |
| Transition access | Enforcement disabled | Change password | Sign out | neutral temporary access language; no stronger authorization claim |
| Active admin | Active account plus fresh admin check | normal Settings actions | Open Admin | Admin is a subordinate contextual continuation, never the page focus |
| Normal password change | Verified session, no valid recovery marker | Update password | Back to Settings | current password + new + confirm; conventional form hierarchy |
| Verified recovery | Valid signed short-lived recovery marker | Set new password | Back to Settings after completion | new + confirm only; clearly labels verified recovery context |
| Invalid / expired recovery | Recovery marker is not valid | normal fail-closed route behavior | restart Forgot password from Settings | never render an old-password-free form without valid server marker |
| Busy / error / success | Existing async auth operation state | current operation | safe retry where already supported | status sits adjacent to the task; no modal spectacle or fabricated progress |

## 4. Visual concept — Trust Register

The proposed composition is a **Trust Register** rather than a stack of independent SaaS cards.

### Desktop

The application header remains the compact UI-074 horizontal bar. Below it, Settings uses one bounded content field with a narrow registration column and a wider functional register:

1. **Account context** — small route label plus concise `Settings` heading.
2. **Identity row** — verified email as the primary account identifier, without avatar/profile invention.
3. **Access row** — a textual state marker plus one sentence of server-derived meaning. Color supports but never carries authorization meaning.
4. **Security row** — conventional password continuation and sign-out, separated by a rule rather than nested cards.
5. **Privileged continuation** — only when real admin eligibility exists; visually subordinate to ordinary account security.

The signed-out variant keeps the same registered field but narrows the active task to a conventional credential form. Closed Beta context sits as a compact trust note, not a second promotional panel.

The suspended variant keeps the exact same geometry as active. Only semantic copy and restrained warm state tone change. This avoids making suspension feel like a different product or hiding recovery controls when they are most needed.

Password change and recovery use the same register grammar. Recovery is differentiated with a small verified-link context label and the absence of the current-password field; it is not styled as a celebratory or exceptional marketing state.

### 390px

The registration column collapses into a single stacked reading order:

`route context → identity/access → security → privileged continuation if present`.

For signed-out and password surfaces, labels remain immediately adjacent to fields. Actions remain full-width or naturally touch-safe. There is no bottom dock assumption, no off-canvas account action and no fixed footer competing with the current compact header.

The mobile artifact deliberately shows the same representative states as desktop instead of offering a single happy-path mock.

## 5. Typography, spacing and surface rules

- Route eyebrow / registration labels: 10–11px, uppercase or technical microtype, widened tracking.
- Primary route heading: approximately 30–36px desktop, 26–30px narrow; Settings should not compete with creative media surfaces.
- Account identity: approximately 18–22px desktop and 17–19px narrow.
- Body/status copy: 12–14px with compact line length.
- Primary vertical rhythm: 16 / 24 / 32px rather than large marketing gaps.
- Interactive height: target 44px effective minimum where practical.
- Borders/rules: one-pixel low-contrast registration; avoid multiple rounded containers nested inside one another.
- Radius: restrained, usually 10–14px for actual controls/notices. The content field itself is primarily registered by rules rather than a giant floating glass card.
- Accent: violet/cool signal for normal selected/active context; warm amber/red only for suspension/error meaning; green only as supporting confirmation, never as the sole access indicator.
- Atmosphere: near-black base with very low-opacity cool/warm radial fields inherited from the product; no large glow behind forms.

## 6. Interaction and motion budget

Settings does not need a dedicated animation runtime or complex choreography.

Allowed motion:

- brief 140–220ms opacity/position settling for local feedback where the current system already supports it;
- spinner only for genuine pending auth operations;
- normal focus/pressed transitions from maintained primitives.

Not allowed:

- perpetual ambient animation;
- pulsing access status;
- animated authorization claims;
- sliding panels that move credential fields unexpectedly;
- decorative parallax, orbital, 3D or landing-page motion.

With `prefers-reduced-motion: reduce`, state changes render immediately and all meaning remains textual/static.

## 7. Accessibility requirements for implementation

- Every field retains a programmatic visible label.
- Password fields keep browser password semantics and autocomplete contracts from the implementation.
- Focus-visible treatment must remain obvious against the near-black field.
- Status notices must be understandable without color.
- Sign out, Change password, Forgot password and conditional Open Admin remain keyboard reachable.
- Narrow layouts must have no horizontal overflow and must allow the last security action to scroll fully above the viewport edge.
- Touch targets should remain at least 44px effective where practical.
- Synthetic examples in design artifacts use `.test` data only.

## 8. Explicit non-goals / rejection criteria

Reject an implementation derived from this concept if it introduces any of the following:

- Create account, public signup, waitlist or request-access affordances not already backed by a product contract;
- avatar/profile/personal-details editing;
- role editing or an Admin-console subset inside Settings;
- client-inferred account/admission/Admin truth;
- raw Supabase/provider errors;
- provider, worker, storage or infrastructure identity;
- a preference dashboard merely to make Settings feel fuller;
- card-within-card nesting that turns each label into a floating panel;
- historical desktop left rail or fixed mobile bottom dock;
- password-recovery UI that bypasses current server marker validation;
- a new auth library, animation runtime, schema, API or route solely for visual reasons;
- production deployment as part of this R&D slice.

## 9. Review questions

The R&D checkpoint asks for visual-direction approval on four questions only:

1. Does the Trust Register feel like a finished RenderLab utility surface rather than generic account SaaS UI?
2. Is the identity → access → security hierarchy clear enough in active and suspended states?
3. Is the signed-out experience focused enough without looking like an unrelated auth landing page?
4. Do normal password change and verified recovery feel obviously related while still communicating their different security requirements?

If the direction is approved, the next repository step is a **Phase 27 implementation contract** that names exact files, selectors, verification changes and acceptance evidence. Production code must not begin merely because this R&D artifact exists.
