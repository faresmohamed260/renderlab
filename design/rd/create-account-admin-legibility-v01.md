# UI-082 Checkpoint 4 — Create, account, Admin legibility v0.1

**Status:** Accepted implementation checkpoint
**Tracker:** #305
**Parent contract:** `docs/ui/MEDIA_FIRST_HIERARCHY_CORRECTION_CONTRACT.md`
**Baseline main:** `a305bf39ec6b2c4969eafaec9b749c41bb2fbf2e`

## Scope

Checkpoint 4 completes the remaining route-family audit before whole-product acceptance. It preserves all product/security/backend behavior and changes only reproduced hierarchy/legibility defects.

### 4A — Create

The Clear Composer remains the approved composition. Current hierarchy is correct: task heading → output mode/reference/prompt/settings → truthful lifecycle/result → continuation.

Evidence-backed corrections:
- active lifecycle registration text currently renders below the UI-082 technical-text floor (~9.3px);
- persisted-result kicker currently renders at 9px;
- raise those essential context labels to 10px without changing stage geometry, result geometry, composer order, touch targets, model/settings behavior, generation truth or reduced-motion behavior.

Non-changes:
- decorative result media registration may remain below 10px because it is not the sole carrier of information;
- the low-emphasis capability footer is decorative registration and does not replace task controls;
- no Clear Composer structural redesign.

### 4B — Settings / Profile / Preferences + Admin

Account-family audit:
- current essential helper/value/status text is already at or above the UI-082 floor (roughly 10.4px+ technical labels and 13px+ helper/body text);
- preserve the Trust Register, Profile and Preferences compositions unless rendered verification exposes a defect;
- no account capability, authentication, MFA, session, email, profile, preference, export or deletion semantics change.

Admin corrections:
- preserve the Settings-derived 01/02/03 register and all privileged controls;
- raise only reproduced sub-10px operational microtype:
  - account identity metadata / user ID from ~9.9px to 10.4px;
  - “you” badge, metric labels and diagnostic titles from ~9.3px to 10px;
- retain operational density and current responsive grids.

### 4C — Landing + shell audit

- Preserve locked `RenderLabBrand` geometry and Landing quarter-circle composition.
- Preserve UI-074 compact horizontal shell geometry.
- Change pixels only if the current exact-head rendered evidence shows a legibility, clipping, collision or hierarchy defect.
- Otherwise record a verified no-change audit.

## Acceptance

### Create
- desktop and 390px Clear Composer remain overflow-free;
- output mode → reference → prompt → settings order remains unchanged;
- active lifecycle and persisted-result essential context labels are at least 10px;
- result media still leads the persistent composer;
- 44px mobile essential targets and reduced-motion behavior remain intact.

### Account / Admin
- Settings/Profile/Preferences keep their approved structure and readable body/helper rhythm;
- Admin renders exactly three top-level rows and preserves all authorization/self-lockout/last-admin constraints;
- Admin essential operational micro labels are at least 10px;
- desktop, 390px and reduced-motion Admin remain overflow-free.

### Landing / shell
- Landing and application shell remain visually unchanged unless a reproduced defect requires correction;
- existing Brand / Launch and UI Shell verifiers remain authoritative.

## Non-goals

No route, navigation, capability, generation, media, account, role, MFA, session, storage, schema, provider, worker, deployment or automatic-Git-deployment changes.
