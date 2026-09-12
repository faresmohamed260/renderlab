# Media Viewer Register + Source Fold v0.2 — focused Phase 25 candidate

**Status:** REVIEW CANDIDATE PENDING HUMAN APPROVAL  
**Tracker:** issue #196  
**Branch:** `rd/media-viewer-register-fold-v02`  
**Prototype:** `design/prototypes/media-viewer-register-fold-v02/`  
**Production boundary:** R&D only. This does not authorize production `/library/[assetId]` changes, dependency adoption, route/data/security changes, merge to `main`, or deployment.

## Why v0.2 exists

The complete v0.1 study tested three same-family topologies against the current Viewer product contracts. Exact v0.1 head `5cbdc0cd8fad7be4817b6231e36cea7c86518169` passed remote-browser run `34701563072`; artifact `10300423225` (`sha256:c338752da47573b9dd3e1ac5be1d6dc06919727cf1df22df4c5078ef50fec653`) contains desktop/390px, image/video, disclosure, Compare, temporal 0/60/180/360ms and reduced-motion evidence.

Visual review established a clear ranking:

1. **Media Register — strongest hierarchy/base.** It extends Gallery Rail most directly and keeps the durable asset as the workspace instead of reverting to a record-detail sidebar.
2. **Source Fold — strongest Compare choreography.** It makes Result/Source read as one media relationship and gives Phase 25 its meaningful 3/4-expressiveness interaction.
3. **Inspection Spine — not recommended.** It is compact and valid, but adds a learned control vocabulary without enough value over the clearer attached register.

v0.2 therefore stops treating the concepts as peers. It combines the Media Register hierarchy with Source Fold comparison and removes the duplicate action ownership found during v0.1 critique.

## Focused design direction

### 1. The asset is the workspace

The Viewer should read as the expanded state of a Gallery Rail media object:

- compact UI-074 horizontal application header remains unchanged;
- `Library → Viewer / media object` context sits directly above the asset;
- title and truthful durable-media facts remain concise and attached to the media context;
- the inspection stage dominates the composition;
- Lab Matrix registration, 64px grid cadence, quiet cool/warm atmosphere and technical microtype carry forward from Landing/Create/Library;
- no persistent second application sidebar is introduced.

The current conventional 304px Prompt/Details/Continue/Actions rail is not the v0.2 direction.

### 2. Continuation is an attached register

Immediately beneath the media stage, one attached register owns continuation:

- `CONTINUE FROM MEDIA` identifies the next-step area;
- capability-derived continuation remains conventional and obvious;
- the prototype represents the eligible-state set with `Edit image`, `Animate`, `Reuse settings`, and `Upscale 2×`, but production visibility remains entirely controlled by existing capability/job/admission truth;
- Edit is the visual primary in the representative image state; other available actions remain secondary;
- no action is fabricated merely to fill the rail.

The register must begin inside the normal desktop first viewport rather than being pushed below a decorative stage.

### 3. Prompt / Details / Manage disclose locally

A compact attached mode strip owns `Prompt`, `Details`, `Manage`, and `Compare source`.

- disclosures expand from the same register geometry rather than opening a disconnected property card;
- media remains visible and dominant;
- dismissing a disclosure returns to the same stage geometry;
- narrow layouts keep the strip in document flow; no fixed mobile tool dock is introduced;
- reduced motion uses immediate state replacement without spatial transform.

Action ownership is singular:

- **Quick actions:** Favorite, Download;
- **Manage disclosure:** Collections, Rename, Delete;
- **Continuation register:** capability-derived Edit/Animate/Reuse settings/Upscale only when current truth permits them.

The v0.1 duplicate Favorite/Download entries inside Manage are removed in v0.2.

### 4. Source Fold is the signature Compare interaction

Compare Source is the only interaction that receives the stronger spatial choreography.

Desktop:

1. Result begins as the single dominant registered media sheet.
2. Activating `Compare source` reallocates the same stage rather than spawning a floating card.
3. Result contracts/shifts into the primary share of the field.
4. Source reveals from the same registration boundary with bounded clipping/translation.
5. Settled layout keeps Result materially wider than Source.
6. Source exposes only `Open source`; it does not gain a second action set.
7. Closing comparison reverses to the exact single-result geometry.

390px/touch:

- Result remains first;
- Source unfolds vertically below Result rather than squeezing both into narrow columns;
- Compare remains an explicit touch control; no hover gesture is required.

Reduced motion:

- skip the unfolding transform and show the complete settled Result/Source layout immediately.

### 5. Bounded media depth only

Fine-pointer default Result may use the same small media-local depth grammar established in Gallery Rail.

- controls and application chrome stay stationary;
- Compare disables the single-object tilt so the two-object relationship remains stable;
- touch receives the static equivalent;
- reduced motion disables the transform entirely.

## Locked product / engineering contracts

All issue #196 contracts remain unchanged:

- `/library/[assetId]` route ownership and application-shell placement;
- one opaque owner-scoped durable `media_asset` identity;
- current ownership/tombstone/fail-closed behavior;
- truthful image/video/source/result geometry;
- real native video controls;
- truthful prompt/details/durable metadata;
- Favorite, Collections, Rename, Download and permanent Delete semantics;
- capability-derived and server-revalidated Viewer → Create continuation;
- current-valid `Reuse settings` eligibility;
- current-valid same-owner `Compare source` eligibility;
- Result-primary / Source-contextual comparison semantics;
- existing Upscale 2× eligibility, admission and lifecycle semantics;
- no new durable compare state, global media/router store or client-owned authorization state;
- no schema/API/provider/worker/R2/auth/admission/ownership/capability/routing/deployment change;
- maintained primitive purity for any later production implementation;
- keyboard/focus/touch semantics, no hover-only essential action, no horizontal overflow, and `prefers-reduced-motion`.

## Acceptance target for this focused candidate

The v0.2 verifier must prove, on one exact head:

- desktop 1440×1000 default image, video, Prompt/Details/Manage disclosure and Compare states;
- 390×844 default, Details, Manage and Compare states;
- continuation register begins inside the first desktop viewport;
- no horizontal body/document overflow;
- compact UI-074 header remains visible with no desktop shell rail or mobile dock;
- Result is primary and Source spatially secondary on desktop;
- Source follows Result vertically on narrow layouts;
- `Open source` belongs only to the Source frame;
- Compare is keyboard reachable with visible focus;
- ordinary narrow actions/controls keep at least 44px effective height where practical;
- fine-pointer depth remains media-local and does not move attached controls;
- touch does not require pointer depth;
- reduced motion disables depth and collapses Source Fold transition duration;
- temporal evidence captures Source Fold at 0 / 60 / 180 / 360ms;
- evidence screenshots omit prototype-switcher chrome so visual review judges the product composition itself.

Passing automation makes v0.2 reviewable, not approved. Explicit human approval is still required before a Phase 25 implementation decision/contract may be merged or production Viewer source may change.
