# Library Gallery Rail v0.3 — focused refinement

**Status:** EXPERIMENTAL / REVIEW CANDIDATE PENDING HUMAN APPROVAL  
**Tracker:** issue #191  
**Branch:** `rd/library-gallery-rail-v03`  
**Production boundary:** R&D only. This does not authorize production `/library` changes, merge to `main`, dependency adoption, route/data changes, or deployment.

## Why this iteration exists

The v0.2 three-concept study established a clear ranking, but a professional visual review found that none of the three was yet approval-ready.

### v0.2 judgment

1. **Gallery Rail — strongest base.** Best balance of obvious controls, media dominance, route familiarity and compatibility with the approved Create/Landing system.
2. **Index Strip — strong alternate.** Excellent media-first density and editorial restraint, but the hierarchy between source, search and secondary filters is weaker and relies more on learned reading order.
3. **Media Ledger — not recommended.** Useful separation, but the persistent route-local column starts to read like a second sidebar/dashboard and works against the corrected horizontal-shell direction.

### Material problems in the v0.2 Gallery Rail

The refinement is not a border/color polish pass. Four structural weaknesses were identified from the final v0.2 desktop/390px renders and selection temporal evidence:

- the Library heading block still behaved too much like an application hero and consumed more first-viewport height than a media workspace needs;
- search was visually underpowered despite being a primary retrieval tool;
- the extra view-note/query rows could re-create the stacked command-chrome problem the redesign is meant to solve;
- selection used a generic bottom floating toolbar that covered media and did not satisfy the Visual North Star target that selection should reshape the workspace.

A secondary legibility issue also remained: media metadata at 6–7px on narrow layouts was too small for ordinary product information.

## v0.3 design decision

Refine Gallery Rail rather than invent another unrelated composition.

### 1. Compress context, not media

- Keep the approved compact horizontal application header.
- Reduce Library title scale and top spacing so the screen reads as a working media surface rather than a marketing/empty-state hero.
- Keep `LIBRARY / MEDIA INDEX` as technical microtype, but make the only summary a compact `24 assets` count beside the title.
- Replace the longer explanatory sentence with the operational line: `Find, organize and continue from generated and uploaded media.`

### 2. Promote search to a real primary control

- Search becomes a bordered, flexible-width field in the first command row rather than a visually incidental text slot.
- Active search is expressed inside the search field itself with a clear action; no redundant full-width query row is added.
- Do not invent a keyboard shortcut badge or command-palette claim.

### 3. One command rail, two purposeful rows

Default mode uses only:

- row 1: Creatives/Uploads source, flexible search, contextual Upload, Select;
- row 2: All/Images/Videos, Favorites, Collections, sort.

The previous separate view-note row is removed. Current source, count and newest-first context move into the media-field heading immediately adjacent to the media they describe.

On narrow layouts, the same hierarchy becomes source/actions → search → horizontally scrollable filters. It does not reproduce desktop chrome vertically beyond those three necessary rows.

### 4. Selection morphs the command rail in place

Selection is the signature v0.3 interaction.

The default command content and selection controls occupy the same bounded command surface. Activating Select:

1. keeps the rail geometry anchored in place;
2. contracts/fades the default retrieval controls;
3. reveals selection summary/actions from the Select side of the rail using bounded clip/geometry expansion;
4. exposes the existing 44×44 selection hit targets / 22×22 indicators on media cards;
5. leaves the media field unobscured by floating chrome.

The selection surface contains the existing product actions only: Select page, Organize, Delete and Cancel. No new batch capability is introduced.

Reduced motion keeps the same state replacement with near-zero duration and no pointer depth.

### 5. Improve media legibility and bounded physicality

- Card title increases to 13px desktop / 11px narrow.
- Supporting media metadata increases to 10px desktop / 9px narrow instead of 6–7px.
- Media stays visually primary; captions remain compact and do not become card-heavy metadata panels.
- Pointer-capable cards use a very small, position-derived tilt and local highlight. Maximum tilt is roughly 1 degree in either axis. Controls do not move.
- Touch receives a static equivalent; no essential action depends on hover.

## Locked product contracts

All issue #191 contracts remain unchanged:

- `/library` and `/library/[assetId]` route ownership;
- Creatives default and Uploads `tab=uploads` semantics over the same durable media identity;
- URL/server ownership for type filter, search, Favorites, Collections, sort and pagination;
- Upload action and desktop drop only in Uploads;
- current-page transient selection and existing Organize/Delete semantics;
- card activation opens Viewer;
- 44×44 checkbox hit target / 22×22 visible indicator;
- no new schema/API/worker/provider/R2/auth/admission/ownership/capability/deployment contract;
- no fake quick actions, generated capabilities or hover-only product actions.

## Acceptance target for this R&D head

The repository-backed verifier must prove:

- desktop 1440×1000 and narrow 390×844 for default, Uploads, search and selection;
- first media begins materially above the current production baseline;
- no horizontal overflow;
- Upload is visible only in Uploads;
- active search stays visible in the search field and exposes Clear;
- selection actions are contextual and appear in the command surface, with no bottom floating selection bar;
- selection targets remain at least 44×44 with 22×22 visible boxes;
- keyboard focus remains visible and reaches Select plus selection actions;
- pointer response is media-local and does not move command controls;
- reduced motion removes pointer transform and collapses the selection transition duration;
- temporal evidence captures the command-rail selection morph from start through settled state.

Passing automation makes v0.3 reviewable, not approved. Human visual approval remains required before a production implementation contract is written.