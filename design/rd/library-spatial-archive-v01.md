# Library Clear Archive — aligned R&D direction

**Status:** REVIEWED DESIGN CANDIDATE / browser verification pending  
**Scope:** `/library` visual and interaction R&D only  
**Production impact:** none — this prototype does not change production `/library`

## Direction decision

Library does not get an independent visual identity.

The user clarified that the application must continue the same approved direction established by Create. The binding system reference is therefore:

- UI-073 Clear Composer for application-surface clarity and control behavior;
- the production Landing Lab Matrix for identity, grid, registration, cool/warm atmosphere and restrained geometric accents;
- UI-070 for current media-first Library card truth;
- UI-071 for rail-only desktop application chrome;
- UI-064 / Visual North Star for Library media-object continuity and bounded media-only depth.

Earlier A/B/C Library explorations are superseded by this single system-continuation direction. They are not candidates for separate approval.

## Product behavior that stays locked

This R&D changes no product contract. Production Library still owns:

- Creatives / Uploads;
- URL/server-owned search, kind filtering and newest/oldest sorting;
- Favorites and Collections;
- current-page selection;
- batch Favorite/Unfavorite and Add/Remove Collection;
- page-scoped permanent Delete confirmation;
- durable upload picker + desktop drag/drop through the existing upload transaction;
- durable `media-asset` identity;
- deep links to Media Viewer;
- owner/privacy boundaries;
- truthful empty/error/pagination state.

## System translation from Clear Composer

### Shared application grammar

- near-black canvas;
- 64px Lab Matrix registration grid;
- cool blue + warm orange atmospheric restraint;
- precise rules and quarter-arc registration details;
- desktop rail-only shell; compact mobile utility header + bottom dock;
- conventional, stationary controls;
- no generic SaaS card nesting;
- one primary feature surface rather than many independent panels;
- 44px practical touch targets;
- visible keyboard focus;
- reduced-motion equivalent.

### Library-specific adaptation

Create makes the composer dominant. Library makes **media** dominant.

The Library command surface is therefore a single flat technical strip that owns discovery/organization and morphs into page-selection mode. It should not become a large dashboard header, a separate toolbar stack, or a floating command palette.

Media cards keep UI-070's full-frame 4:3 composition and compact metadata shelf. Pointer-capable depth is allowed on media only. Controls and page chrome remain stationary.

## Desktop composition

1. Stable compact `Library` heading and short purpose line.
2. One command surface:
   - Creatives / Uploads
   - All / Images / Videos
   - search
   - Favorites
   - Collection
   - sort
   - Select
3. Thin archive register row with current context/count.
4. Media-first grid.
5. Selection mode replaces the command strip content in the same geometry rather than adding a second toolbar.
6. Selection targets remain 44×44 with a visually compact selection box.

## 390px composition

- compact utility header stays;
- page title remains compact;
- command surface stacks into two logical rows without horizontal overflow;
- primary destination controls remain obvious;
- search is full-width;
- organization controls wrap;
- media grid becomes two columns;
- touch targets are at least 44px;
- bottom dock remains unobstructed;
- selection mode remains page-scoped and reachable.

## Motion / interaction choreography

### Media pointer depth

**Start:** card is flat.  
**Response:** on fine pointer only, the media object gains shallow bounded perspective and a local spotlight.  
**Settled:** pointer leave returns to flat.  
**Controls:** never move with this effect.  
**Reduced motion / touch:** flat media, same hierarchy.

### Selection mode

**Start:** discovery command strip.  
**Action:** Select.  
**Transition:** the same strip changes content to current-page selection count/actions; media cards expose their selection targets.  
**Settled:** selected media keeps a static unmistakable border/registration state.  
**Exit:** Cancel restores discovery content and clears transient selection.  
**Reduced motion:** immediate state replacement; no meaning depends on animation.

## Explicit non-goals

- no separate Library visual brand;
- no alternate A/B/C system choice;
- no giant editorial headline;
- no orbital/3D navigation;
- no command-palette replacement of existing URL/server behavior;
- no hover-only essential actions;
- no client-owned media/filter dataset;
- no new product feature, route, primitive, dependency, schema, API, provider or deployment.

## Approval gate

This R&D slice may be considered for production only after:

- browser verification passes on exact R&D head;
- desktop default + selection evidence is reviewed;
- 390px default + selection evidence is reviewed;
- pointer-depth evidence is reviewed;
- keyboard focus is visible;
- reduced-motion behavior is reviewed;
- no horizontal overflow exists;
- explicit human approval confirms the Library feels like the same RenderLab system as Clear Composer.
