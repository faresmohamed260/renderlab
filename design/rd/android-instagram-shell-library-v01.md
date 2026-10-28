# RenderLab Android — Instagram-close shell and Library v0.1

**Status:** DESIGN CANDIDATE — for owner review; not a final visual approval or implementation contract.  
**Scope:** native Android layout, information architecture, labels and interaction design only.

**Design iteration notice:** This v0.1 file preserves the original reference translation and audit baseline. Its proposed Grid/root-tab behavior and sample states are superseded **for further review** by [v0.2 corrections](android-instagram-shell-library-v02.md); v0.2 remains an unapproved design candidate, not RenderLab implementation or changed product contracts.  
**Date:** 2026-10-26. **Design authority:** [UI-083](../../docs/ui/UI_DECISIONS.md), [UI system](../../docs/ui/UI_SYSTEM.md), [native M0 contract](../../docs/architecture/MOBILE_APP_PHASE_M0_CONTRACT.md), [screen registry](../../docs/ui/SCREEN_REGISTRY.md).  
**Reference:** owner's two Instagram Android screenshots (feed at 5:33 and grid at 5:34). The original screenshots are the visual benchmark; this text is a working translation, not substituted visual evidence. **Related isolated technical proof:** draft PR #401; it verifies original-clone feed rendering, no-reinstall JS styling and keyboard-activated original Search/Profile tabs, **not touchscreen interactions or RenderLab implementation**.

## 0. Screenshot-measured static design frames — 2026-10-26

The actual owner-supplied screenshots were inspected at **709 × 1536 pixels** each; the design frames use the same canvas dimensions for direct geometry comparison. The artwork is **new, synthetic fixture media**, not copied social content, and should not be mistaken for actual RenderLab user data.

| Frame | Editable source | Screenshot-specific layout verified in this candidate |
| --- | --- | --- |
| A — Library Feed | [Android Feed SVG](../penpot/android-instagram-feed-v01.svg) | Android status row; left plus / centered RenderLab text stand-in / right attention icon; one compact identity row; full-width large media beginning near **y=285**; conditional multi-item counter; compact media-action glyphs; cropped metadata; **five-icon persistent app dock** above Android's system navigation |
| B — contextual Library Grid | [Android Grid SVG](../penpot/android-instagram-grid-v01.svg) | Back / Library / overflow header; **four icon-only tabs** and one active underline; **3 columns** of **portrait 3:4 media thumbnails** starting near **y=264**, approximately **236px wide × 315px high**, ~1–3px seams; video/multi-item thumbnail marks; **no persistent app dock** in the contextual screen |

Both SVGs are **static** and contain embedded synthetic JPEG fixture artwork so they remain inspectable without external URLs. They can be imported into Penpot or rendered directly. The use of the word **RenderLab** in these screenshots is a *typographic stand-in* for the canonical repository-owned brand artwork, not a change to the locked wordmark geometry. The provisional status clock, album grouping icon and badge/counter fixtures are visual placeholders, not user/product data.

**Important correction to the first prose draft:** the original 5:34 Instagram grid clearly presents *portrait* rather than *square* tiles. The original Feed also has **no visible All / Generated / Uploads filter row** between the header and identity row. Source filters therefore move to compact disclosure/overflow in this review frame, while remaining part of the proposed Library functionality. The grid is shown as a **contextual** full-screen Library view consistent with screenshot B; its root-level Browse-tab mapping is still a separate design question.

**Not yet verified:** real device rendering of the actual RenderLab Expo SDK58 app, physical touchscreen/scrolling, keyboard/TalkBack focus order in RenderLab, exact brand/font/icon parity, signed-in owner-scoped data, responsive/large-font layouts, reduced-motion transitions, or visual approval. These static frames do not close Phase M0, PR #399, or any backend/security gate.

## 1. Non-negotiables

- Match the two supplied Instagram screenshots **closely**, not loosely: near-black canvas, slim header, original-silhouette outline icon rhythm, low chrome, tight density, edge-to-edge media, exact-feeling gutters, narrow dividers and a tightly packed **three-column, 3:4 portrait-thumbnail grid**; the supplied reference grid is *not square*. Do not add generic SaaS cards, pill filters, huge search hero, prominent gradients or a second invented toolbar.
- Brand is the approved **RenderLab** wordmark, not Instagram artwork. Original/appropriately licensed icons and an Android-compatible licensed/system sans font only. Never ship Instagram-owned fonts/marks/source without separate legal review.
- Distinguish the **native Android product** from the existing **web** app. UI-074 web header/no-bottom-dock and UI-075 web Gallery Rail stay authoritative for web; this document does not alter either.
- Reuse existing RenderLab media identity, owner-scoped data, job lifecycle, Collections, Uploads, Favorites and eligible creative actions. No made-up profiles, followers, engagement counts, album storage, prompts exposed as technical graphs, or fake actions.
- Maintain effective touch targets, system gesture insets, TalkBack labels, keyboard focus/Enter, large text and reduced-motion behavior even when visual icons are compact.
- This candidate makes **no route, API, database, mobile implementation, build, EAS or deployment changes**.

## 2. Bottom navigation: proposed five-position visual mapping

Five evenly spaced **visible anchors** preserve the screenshot's visual cadence while keeping the accepted **four conceptual destinations**. Library has two entry presentations, not two separate media stores or top-level products.

| Position | Screenshot visual counterpart | Proposed RenderLab UI | Conceptual destination | Behavior |
| --- | --- | --- | --- | --- |
| 1 | Home outline/filled house | **Feed** (home icon) | Library | Opens the owner-scoped Library in vertical feed presentation; root/default for media browsing in the native reference concept |
| 2 | Explore/search outline | **Browse** (magnifier icon) | Library | Opens the **same Library** in the Library grid presentation, with contextual search. Switching preserves authorized Library filters when possible |
| 3 | Add/create outline | **Create** (plus-square icon) | Create | Opens the existing Create workflow and intent controls; not a social upload/post |
| 4 | Activity/attention icon position | **Activity** (compact activity/clock outline) | Activity | Opens generation/upload job activity; truthful pending/error badges only |
| 5 | Profile circle outline | **Settings** (person-circle outline) | Settings | Opens private account/settings/preferences; not a social profile |

**Proposed visual state:** 1 or 2 has the selected state when showing the respective Library presentation. Both address the same underlying Library identity; back returns to the user's last Library presentation where appropriate. 3, 4, 5 correspond to actual Create, Activity, Settings. Active icon has the same weight/visual affordance used by the reference, not an app-specific glowing tab container.

**Why the intentional duplicate Library entry is warranted:** the owner requested a feed-first media Library **and** an Instagram-close grid, while the approved product has only four destinations. This solves five visible positions without inventing a fifth feature, route or backend. **This exact mapping is a proposal**, subject to explicit design review; no file in `apps/mobile` should be changed from it automatically.

## 3. Screen A — Library Feed (reference 5:33)

**Appearance/reading order, from top to bottom:**

```text
Android status bar / safe inset (outside app content)
┌──────────────────────────────────┐
│  [+]         RenderLab       [♡/●] │  slim top app bar
├──────────────────────────────────┤
│ (avatar) Media name        [⋯]     │  compact identity/source row
│                                  │
│            ORIGINAL              │  full-bleed media, fitted
│          OWNER MEDIA             │  to real aspect without
│                                  │  silently cropping output
│                                  │
│        •  ◉  • (only if multi)    │  tiny carousel marker if applicable
│  ♡   ↗   ◇   ↓            [▤]    │  favorite / reuse / eligible creative / download / collect
│  Media display name               │  1–2 lines; not a huge hero
│  Prompt/detail …                  │  collapsed excerpt, opens detail
│  Date / type                     │  quiet factual metadata
│                                  │
│  next media row, continuous scroll│
├──────────────────────────────────┤
│  Home  Search  Plus  Activity  User│  fixed five-icon native bar
└──────────────────────────────────┘
Android system gesture/navigation inset
```

Schematic labels are **not exact icon assets or pixel renderings**. The original 5:33 screenshot has **no permanent source-filter row** between the top bar and the media identity row. All / Generated / Uploads remains accessible through a slim header disclosure/overflow, not an extra visible bar that shifts media vertically.

- **Header:** left add action → Create (quick start), center canonical RenderLab wordmark, right activity/attention affordance → Activity. Two access points to Create serve distinct contexts (quick header affordance and persistent global tab), not two product features. Badge only for actual actionable attention. Preserve screen-reader labels.
- **Source view:** compact **All / Generated / Uploads** in header/overflow disclosure, **not** a permanently visible bar in the Feed reference composition. These are presentations of actual owner-scoped durable media. `Generated` corresponds to the existing creative outputs, **not** an invented server category; `Uploads` corresponds to completed durable media upload records. Exact API filtering must be verified before implementation. State must not pretend temporary/local picker files are stored Library objects.
- **Feed card:** small circular asset/source thumbnail, asset display name (or safe type fallback), factual source/date and overflow; media occupies the full content width with minimal surrounding chrome. Honor content aspect ratio and unsupported/failed media fallback. No invented username, badge or social engagement.
- **Media action row:** map the reference icon positions to **Favorite**, **Reuse in Create**, **eligible contextual edit/animate/upscale action**, **Download**, and **Add to Collection** where supported. Do not show disabled actions as working; ineligible actions hide or explain availability in a contextual sheet. Overflow owns existing Rename, Delete (with confirmation), details and Collection management when allowed. All actions operate on canonical durable asset IDs and owner security.
- **Caption/details:** display name foremost; a *short collapsed* prompt excerpt only if this media actually has a prompt; metadata remains subordinate. Tap media → full Viewer; returning restores feed position.
- **Scrolling:** one continuous vertical media feed, not separate paged social posts. No autoplay video with sound; video gets a meaningful poster, playback affordance, mute and loading/error state. Empty/search/no-results/pagination states must be truthful.
- **Feed ↔ grid:** first and second bottom icons switch Library presentation and preserve search/source/kind/Favorites/sort/collection state if the native data contract supports it. Do not fork or refetch unrestricted account media on a tab switch.

## 4. Screen B — Library Grid (reference 5:34)

**Appearance/reading order:**

```text
Android status bar / safe inset
┌──────────────────────────────────┐
│  [‹] Library                [⋯]   │  reference-like contextual header
│   ▦           ▣            ◇     │  compact Items / Albums / Collections icons
│   ━━━                            │  one selected underline
├──────────────────────────────────┤
│[  3:4  ][  3:4  ][  3:4  ]     │
│[portrait][portrait][portrait]    │  tiny/no gutters; 3 across
│[portrait][portrait][portrait]    │  badges only for real video/multi
│[portrait][portrait][portrait]    │
│ ... natural continuous scroll    │
└──────────────────────────────────┘
Android system navigation only (contextual screen: no fixed app tab bar in the supplied 5:34 reference)
```

- **Items (functional intent):** all individual durable media. Three equal **portrait tiles (~3:4 width:height, approximately 236×315 at 709×1536 source resolution)** with the reference's compact spacing and original asset thumbnail/crop treatment only **for thumbnail presentation**, never overwrite full media. Tap → Viewer. Long-press may enter **supported** batch selection when native semantics are accepted; visible check, count and cancel affordance, no accidental destructive action.
- **Albums (proposed, NOT functional):** the owner asked for Albums, but UI-083 explicitly says lifecycle/storage are unapproved. In review visuals, identify it as **future concept**, never imply it already saves/reorders media. Do not invent an album table, API, migration or fully enabled control. Final launched navigation may omit it pending approval instead of displaying a dead tab.
- **Collections (supported domain concept):** owner-scoped existing Collections are distinct from Albums. Show collection previews and selection from currently supported owner collections; tap opens collection-filtered Items. No public collection discovery.
- **Source + media kind:** expose All / Generated / Uploads and Images/Videos through contextual overflow/disclosure to preserve the original compact icon-only top strip. Do not insert a persistent third toolbar that the source screenshot lacks. Search is activated by magnifier/field within the Browse view; Favorites, sort and owner-collection filtering remain available in contextual disclosure. Preserve existing server-owned query and sorting contracts, especially literal search and direction-aware pagination.
- **Back / overflow:** back returns to Feed or prior Library context; overflow reveals Search, Filter, Sort, Favorites, Upload, selection mode and supported organization. This **contextual Grid mockup** omits the persistent root tab bar, matching the supplied reference. The five-icon dock appears on native root Feed and other eligible root contexts, not necessarily on this contextual Grid. The exact Browse-tab-to-contextual-grid transition requires explicit owner review.
- **Viewer:** full-sized authentic media, gesture-safe close, factual metadata, eligibility-gated creative continuation. Neither Feed nor Grid stores separate copies of assets.

## 5. Other native destinations (same bottom bar)

**Create:** one default Image/Video intent, one main prompt, attachment/reference input, essential visible settings, one clear Generate action, Advanced disclosure when relevant. Keep UI compact; this spec does not create a new ComfyUI-facing control layer or implement generation.

**Activity:** job queue/history, status, output links and meaningful failures/retry eligibility, no fake social notifications. Right header access from the Feed points here too.

**Settings:** authenticated account/preferences/security/status, with admin entry only for authorized accounts. No Instagram-style public profile, follower count or direct messaging.

## 6. State and motion contract for later visual prototype

| Event / state | Visual behavior | Accessibility/validation |
| --- | --- | --- |
| Cold open / signed out | Do not display private media. Show admitted sign-in/recovery state, not synthetic social cards | No owner data rendered without verified session/admission |
| Root tab press | Selected outline/fill state changes without dramatic motion; preserve system gesture boundary | Real touchscreen selection **and** keyboard/TalkBack activation must be separately proven |
| Feed scroll | Media enters/exits viewport naturally; no oversized cards | Actual drag/scroll interaction, performance and reduced-motion |
| Media opens Viewer | Visually continuous asset handoff if appropriate; static cut for reduced motion | Viewer opens correct owner-scoped ID and returns to scroll position |
| Feed → Grid | Same media collection, new density and geometry; no duplicated backend entities | Source/filter and selection state are truthful |
| Source/kind/collection changes | Quiet pending indicator; content updates based on owner-scoped server results | No phantom local data; error/retry/empty states |
| Job in progress | Actual status only; optional attention indicator | No fabricated completion progress |
| Albums concept | Clearly labelled proposal in design reviews; no active operation | Requires separately approved album domain and UX contract |
| Multi-select and Delete | Explicit count, checked states, confirmation, undo only if supported | No implicit permanent batch selection |

## 7. Pixel-comparison / native acceptance checklist

1. Create side-by-side full-screen **Feed and Grid** native design frames at reference-matched Android resolution and at narrow/large-font variants. Measure status/topbar height, wordmark baseline, item identity row, media/tiles, bottom-bar inset, icon geometry and control spacing **against the owner's screenshots**, not the public clone.
2. Establish approved original icon set, wordmark usage, licensed font, exact tap targets and safe-area behavior. Resolve where source filters fit without replacing Instagram-close layout with a dashboard.
3. Show real states: generated image, uploaded image, video, multi-item source where supported, empty Library, active job, unavailable operation, and the proposed-but-unimplemented Albums state.
4. Validate touch and keyboard/TalkBack root tab switching and scroll on the **actual RenderLab Expo SDK58 app**, not only the isolated vulnerable Expo SDK53 reference clone. PR #401 demonstrated keyboard activation but simulated ADB touchscreen taps/scrolling remained unverified.
5. Obtain explicit owner review of the proposed five-position mapping, Feed/Grid presentation toggle and treatment of Albums before promoting this v0.1 to accepted native detail design or opening a native feature-implementation phase.
6. Maintain separate phase/security gates: M0 scaffold PR #399 is unfinished, the high-severity Expo/node-forge finding is unresolved, and the third-party Instagram clone has 41 audit findings (4 critical, 18 high). Do not merge/adopt that clone, deploy native code or mutate shared backend/EAS resources on this design artifact.

**Deliverable status:** design architecture, layout and interaction copy **plus two rendered static review frames** committed as self-contained, Penpot-importable SVGs. This is **not** owner-approved final design, real-device QA or application implementation. The original screenshot pixel-comparison has been carried out for major geometry, but typography, canonical wordmark, icon geometry, diverse device sizes and input states still require review.
