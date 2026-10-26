# RenderLab Android — Library Feed & Browse v0.2 remediation

**Status:** **REVISED DESIGN CANDIDATE — NOT OWNER-APPROVED OR IMPLEMENTED**  
**Date:** 2026-10-26  
**Input:** [v0.1 enterprise audit](android-instagram-shell-library-v01-audit.md) (A01–A12), [v0.1 working brief](android-instagram-shell-library-v01.md), user-supplied Instagram Feed/Grid 709×1536 screenshots, UI-083 and the current RenderLab product/security contracts.  
**Scope:** design assets, truthful sample fixture metadata, screen/state behavior specification, and a design-only clickable navigation walkthrough. No mobile or web runtime changes; no new Library API, DB/schema, Auth, EAS or APK deployment.

## Design decision proposed for owner approval: root vs contextual navigation

**Five visible bottom anchors; four conceptual product destinations.** Two anchors share the same private Library and owner-scoped media set:

| Root position | Visible symbol | Logical destination | Detail |
|---|---|---|---|
| 1 | Home | **Library · Feed** | Vertical media-first view, fixed native dock |
| 2 | Search | **Library · Browse** | Three-column 3:4 portrait grid, **also keeps the fixed dock** |
| 3 | Square plus | **Create** | Existing native Create intent, *not* Upload |
| 4 | Bell | **Activity** | Existing generation/upload lifecycle; badge only from actionable real jobs |
| 5 | Account circle | **Settings** | Private account, preferences, security; no public Instagram social profile |

The **contextual** portrait Grid screenshot, with back arrow and **no app dock**, is now specifically the UI for **an opened Collection or comparable Library subview**. It is not the root Browse screen. This reconciles screenshot fidelity with the predictable five-slot root navigation in UI-083.

**Illustrated transition contract** (not a working React Native claim):

- Feed ↔ Browse is a **root tab switch**, not a push; underlying Library search/source/kind/favorite/sort and owner identity stay shared. The current scroll position is retained per root presentation until that state expires through normal app navigation. If the native router restores these views from a deep link, it must still produce a predictable selected tab.
- Browse → **Collections** in the compact four-tab strip is a Library collection-list view. Opening a specific owner collection → **contextual collection Grid**, `collection` filter active, back arrow and system bar only.
- Contextual Grid **Back / Android Back / close** → previous Library list/Browse state, including selected source/filter and scroll. Viewer from a media tile uses the same canonical media ID; Back returns to the exact originating grid/scroll location. Switching tabs never fabricates a second library.
- On cold/deep-linked collection open, Android Back returns to an eligible Browse root fallback instead of another owner's data, an empty history, or a social profile. Contextual viewer screens may also hide the root dock under native stack navigation.
- A temporary **Browse Controls** sheet is an overlay on Browse; dismissing it returns Browse unchanged. The asset **Media Actions** sheet overlays Feed/Viewer; dismissing restores the exact source media and scroll.
- The icons and precise route construction are **not code decisions**. Do not infer that any mobile Expo Router route has already been created or validated.

## Static v0.2 screen/state assets

Each link opens a self-contained 709×1536 SVG. Layout vector elements can be edited in Penpot; the original synthetic fixture media embedded inside is JPEG bitmap data (not vector illustrations). The two user reference images are **not** copied into the repository.

| Asset | Role / specific audit issue fixed |
| --- | --- |
| [Library Feed](../penpot/android-instagram-feed-v02.svg) | Root dock, faithful full-width media, canonical brand mark/wordpart weights, no fake Activity dot, **1/4 + four dots**, media glyph mapping |
| [Library Browse](../penpot/android-instagram-browse-v02.svg) | **Root Grid keeps dock**, active Browse nav, compact four-tab organization strip, portrait 3:4 media |
| [Contextual collection](../penpot/android-instagram-collection-v02.svg) | Back-only collection Grid, no persistent app dock; screenshot B fidelity |
| [Browse controls](../penpot/android-instagram-filters-v02.svg) | Search / Upload / source / kind / Favorites / Sort are explicitly discoverable in compact contextual sheet |
| [Media actions](../penpot/android-instagram-media-actions-v02.svg) | Visible action meanings and eligibility explanation while normal Feed stays icon-compact |
| [Scrolled Feed](../penpot/android-instagram-scrolled-feed-v02.svg) | Entire caption/metadata and next media item are reachable above persistent bottom dock |
| [Empty Library](../penpot/android-instagram-empty-library-v02.svg) | Genuine no-media state, direct Upload entry, no fictional user counts |
| [Keyboard focus](../penpot/android-instagram-keyboard-focus-v02.svg) | Visible focused Collections control (focus ≠ selected), subject to later actual Android focus QA |
| [Library loading](../penpot/android-instagram-loading-library-v02.svg) | Skeletons before owner media becomes available; no premature empty-state claim |
| [Library load error](../penpot/android-instagram-error-library-v02.svg) | Clear error and Retry without implying that owner media was deleted |
| [Signed-out Library](../penpot/android-instagram-signed-out-v02.svg) | Private media hidden and sign-in gate displayed, never show synthetic content to signed-out users |
| [Delete confirmation](../penpot/android-instagram-delete-confirmation-v02.svg) | Explicit destructive confirmation, distinct Cancel and Delete actions, no fake undo |

**Design-only clickable walkthrough:** [android-navigation-v02.html](../prototypes/android-navigation-v02.html) overlays labeled button targets on these SVGs so a reviewer can explore Feed ↔ Browse → contextual Collection → Back, plus Browse controls and Feed media actions. Esc/Backspace also returns to the prior modeled state. It is **not** a React Native emulator, functional backend, native gesture capture, approved target-size implementation or validated production navigation.

## Content type and carousel truth: explicit test fixture

Each grid tile is an **ordinary still image by default**; only the two declared video fixtures and one multi-item fixture get corresponding badges. In the twelve synthetic fixtures, IDs **fixture-03** and **fixture-09** are video *concepts* with video overlay badges, **fixture-02** has four related items with a multi-item badge, and the other **nine** have **no badge**. The sample imagery is a synthetic JPEG even for the video fixtures; it is a **poster illustration, not playable video**. These flags are generated from the declared test metadata in the optional design generator, never from a tile's row/column index.

The Feed shows a **four-frame illustrative series** with index zero. **One shared fixture list drives both `1/4` and exactly four pagination dots.** A standalone still image should show neither a page count nor dots, and video content should not pretend to have carousel frames. Carousel gestures/playback remain unimplemented, not claimed.

## Icon/control contract (design proposal, not approved runtime API)

| Placement | Icon | Meaning | Touch/keyboard/assistive expectations |
| --- | --- | --- | --- |
| Feed top-left | plus | **Create shortcut** | Distinct from persistent Upload; name as Create |
| Feed top-right and root Activity | bell | **Activity** | Only show attention indicator if actual actionable activity exists; the v0.2 fixture shows **no dot** |
| Feed heart | heart | Toggle owner-scoped **Favorite** | Selected state must be announced; API confirmation/error reflected truthfully |
| Feed arrow/copy | copy + arrow | **Reuse in Create** | Creates a new Compose intent linked to existing media, not a repost or refresh |
| Feed sparkles | wand/sparkle | **Edit media** only when capability/asset permits | Hide or explain ineligibility, never initiate unsupported operation |
| Feed download | down arrow | Download media | OS file/permission results and failure feedback |
| Feed folder plus | folder with plus | Add to existing owner **Collection** | Opens owner-scoped selection; never commits an unauthorized album |
| Feed asset overflow | ellipsis | **Media Actions** sheet | Shows labels, delete confirmation as permitted, keyboard/Esc dismissal |
| Browse header magnifier / overflow | search / ellipsis | Search and **Browse Controls** | Both lead to discoverable filtering/search & Upload; no oversized permanent toolbar |
| Browse four compact tabs | grid / folder / sparkles / up arrow | **Items / Collections / Generated / Uploads** | Exact role/state/selected semantics; kinds Images/Videos remain in Browse sheet |

**Albums:** no functioning Albums tab/card is included; it is a distinct proposed future concept with **no approved lifecycle/storage contract**. Existing Collections are a currently supported owner-scoped product capability. Do not silently relabel Collections as Albums, introduce an album API, or show a fake functional Albums panel just to fill a visual slot.

**Source filters:** All / Generated / Uploads in Browse Controls. Generated and Uploads are strictly origin views of existing, durable, account-owned media. The compact source disclosure intentionally avoids the unreferenced filter strip in the Feed screenshot. Exact device/API mapping remains an implementation validation item.

## States and acceptance conditions beyond the static mockups

| State | Reviewed in v0.2 | Still requires actual native proof |
| --- | --- | --- |
| Populated Feed & root Browse | Yes, SVG | Native SDK58 rendering, owner data, gestures and media loading |
| Contextual Collection and Android Back | SVG + browser walkthrough | Expo Router stack, deep links, restoration, source filters, secure asset membership |
| Search, upload, sort, kinds, Favorites | Browse sheet SVG | Correct API-backed semantics, upload picker/tickets/completion, error/loading and announcement |
| Carousel, video/multi badges | Metadata-based static fixture | Real video playback, item grouping identity, 1/4 swipe/dot sync |
| Creative actions and capability eligibility | Media Actions sheet SVG | Real operation eligibility, confirmations, authorization and error handling |
| Empty private Library | SVG | Auth/admission guards and actual owner-empty response |
| Scroll clearance | Scrolled Feed SVG | Native scroll, hit areas, safe insets at diverse device/font configurations |
| Keyboard focus | SVG | Android accessibility roles, TalkBack, actual focus order, Enter, large text, RTL |
| Loading, network error, destructive confirmation | **New v0.2 static frames** | Backend, retry, authorization, correct dialog focus and successful/canceled flows still unimplemented/unverified |
| Reduced motion and media-to-Viewer continuity | Declared as design goals | Temporal design evidence & reduced-motion fallback, native gesture QA |

### P0/P1 issue disposition

| Audit finding | v0.2 disposition |
| --- | --- |
| **A01** root Browse vs contextual Grid | **Design structure corrected**: distinct root Browse + contextual collection Grid + Back behavior + walkthrough. Owner acceptance pending. |
| **A02** unlabeled/undefined Grid tabs | **Meanings defined**: Items, Collections, Generated, Uploads; icon strip visually still compact, labels visible on root; Albums intentionally excluded. Native labels pending. |
| **A03** every tile badged | **Fixture corrected**: only two video posters and one multi-item tile show badges. |
| **A04** counter vs dots | **Fixed in visuals and generator**: four dots = 1/4. |
| **A05** creative action ambiguity | **Clarified** via action sheet and explicit icon matrix. Still requires human usability/accessibility review. |
| **A06** Upload/Search/Filters discovery | **Illustrated** Browse sheet with actual named actions. Runtime integration remains open. |
| **A07** social Activity indicator | **Visual corrected**: consistent bell in Feed and bottom Activity, no invented red dot. |

### P2 issue disposition

- **A08 brand/fonts:** reused **exact locked RenderLabMark path geometry** from \`src/components/brand/renderlab-brand.tsx\` and the distinct **Render (bold) + Lab (regular)** wordpart model. Static SVG font stack prefers Roboto, then fallback for offline renderer; parity with production Android font rendering remains **unverified**. Do not import unlicensed Instagram brand assets.
- **A09 media variety:** retained twelve original synthetic landscape/portrait/architecture/stage concept fixtures without user content; realistic dynamic range/extreme aspect coverage is **still outstanding**. Normal still images and realistic mixed types are represented at metadata level.
- **A10 clearance:** added explicit scrolled Feed state with caption/next media above fixed dock; actual scrolling and insets still require device QA.
- **A11 accessibility:** added focus-state design and keyboard-operable browser walkthrough, but native dp hit areas, dynamic font, TalkBack, RTL, focus, OS gesture insets and reduced-motion remain required gates, **not verified**.
- **A12 state matrix:** added Empty, Loading, Network Error, Signed-out, and Delete Confirmation static frames. Native retry/permission/destructive interaction remains unverified because static screens do not prove working behavior.

## Reproducible handoff

Source design frames are the committed SVGs above. The optional helper scripts \`design/tools/android_v02_fixtures.py\` and \`design/tools/android_v02_generator.py\` regenerate the deterministic synthetic artwork and twelve SVG frames without importing the owner's original Instagram screenshots. The generator requires Pillow, NumPy and CairoSVG **only on the design workstation/CI sandbox**; these are **not mobile runtime dependencies**. Run with \`RENDERLAB_MOCKUP_OUTPUT=/your/scratch/dir python design/tools/android_v02_generator.py\`. Generated PNG previews and screenshot comparison are review artifacts, not app runtime code.

**Approval request:** Owner must explicitly review the v0.2 navigation model, labeled creative action semantics, and Album exclusion. After design approval, the actual RenderLab Android SDK58 Phase M0/security gates and a separately accepted bounded implementation phase still apply. These static mockups **do not authorize or substitute** native development, third-party clone adoption, production release or APK distribution.
