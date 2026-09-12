# Media Viewer Register + Source Fold v0.2 — browser review notes

## Inherited v0.1 lessons

The focused candidate inherits the validated corrections from Media Viewer Continuity v0.1:

- hidden Source shares Result's grid cell in the default state and no longer creates a dead second row;
- Source moves beside Result only for desktop Compare and below Result only for narrow Compare;
- settled-state verification waits for bounded transitions while separate 0/60/180/360ms evidence captures Source Fold choreography;
- compact experimental Spine controls had explicit accessible names during v0.1 evaluation;
- first-viewport composition was tightened so the attached continuation register begins inside the normal desktop viewport.

The v0.1 final exact head `5cbdc0cd8fad7be4817b6231e36cea7c86518169` passed run `34701563072`; artifact `10300423225`, digest `sha256:c338752da47573b9dd3e1ac5be1d6dc06919727cf1df22df4c5078ef50fec653`.

## Focused v0.2 run 1 — `34703619884`

Exact head: `4b83953cc07a1b68dd9404ed43602fa46466d24b`

The run reached the focused browser verifier and failed during the mobile action-ownership check. The failure exposed a real prototype accessibility gap rather than a visual-composition regression.

At the 390px breakpoint, Favorite and Download intentionally collapse to icon-only 44×44 controls by hiding their visible text spans. The prototype did not provide explicit accessible names, so action identity was not robust in that icon-only state.

## Correction

The focused prototype now gives those two icon-only-capable controls explicit accessible names:

- `Favorite`
- `Download`

The verifier now requires those accessible names directly. It does **not** weaken the design or accessibility gate.

Still required unchanged:

- at least 44×44 mobile quick-action targets;
- singular action ownership: Favorite/Download quick, Collections/Rename/Delete under Manage;
- first-viewport continuation register;
- Result-primary / Source-secondary desktop comparison;
- vertical Result→Source mobile comparison;
- Source-only `Open source` action;
- keyboard-reachable Compare with visible focus;
- media-local pointer depth with stationary controls;
- no horizontal overflow;
- touch-static behavior;
- reduced-motion depth removal and near-zero Source Fold transition duration;
- 0/60/180/360ms Source Fold evidence.

This remains R&D only and does not authorize production Viewer changes, product/API/security/data changes, dependency adoption or deployment.
