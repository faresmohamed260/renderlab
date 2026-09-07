# Phase 21 Spatial Media v0.1 — Library & Viewer checkpoint

**Status: `CANDIDATE / REVIEW IN PROGRESS`**

**UI decision:** UI-064  
**Contract baseline:** `5400de0413a03dbba466e896098cd5df438608d4`

This package is the repository-backed visual checkpoint required before Phase 21 implementation. It evolves the already-approved Library and Media Viewer into the Cycle 4 Kinetic Precision visual language without changing current media, ownership, navigation, organization, continuation, comparison, Upscale or deployment contracts.

## Candidate files
- `phase21-library-spatial-v0.1.svg` — desktop Library default, 390px Library default, selection/organization state, and reduced-motion/touch guidance.
- `phase21-viewer-spatial-v0.1.svg` — desktop default Viewer, 390px default Viewer, current action hierarchy, and card → Viewer continuity guidance.
- `phase21-compare-spatial-v0.1.svg` — desktop active Compare source, 390px active Compare source, open/close choreography, and reduced-motion equivalence.

## Locked visual direction
1. **Media remains more important than chrome.** Spectral edge light, glass and elevation frame media; they do not sit behind body copy or compete with the image/video itself.
2. **Library cards become tactile media objects, not action consoles.** Fine-pointer hover may use no more than a shallow lift/tilt response; keyboard/touch and reduced-motion users see an equally clear static hierarchy.
3. **Selection truth is static.** A selected card has a strong spectral ring plus checked badge. Motion may accompany entry into selection mode but never carries the meaning.
4. **Creatives / Uploads remain UI-060 URL-owned sections.** The active section may use a shared-layout highlight, but the design does not introduce a new client-only tab model, third section, or parallel asset store.
5. **Discovery/organization remains compact precision chrome.** Search, kind, Favorites, Collections, sort and Select stay available without turning the page into a filter console.
6. **Card → Viewer continuity is perceptual first.** Match media geometry and key the Viewer media-stage entrance to the durable media object. A literal cross-route shared element is optional only if conventional Next navigation/back/deep-link behavior remains intact and no global media/router store is required.
7. **Viewer is one media stage plus subordinate precision chrome.** Prompt, Details, Continue and Actions remain result/current-media owned, but visually recede behind the media.
8. **Current Viewer actions are preserved.** Edit, Animate, eligible Upscale 2×, Reuse settings, Favorite, Collections, Rename, Download and Delete retain current capability/ownership behavior.
9. **Comparison preserves UI-056.** Result is the larger desktop pane and appears first/full-width on narrow layouts. Source is contextual, exposes only `Open source`, and never gains management actions.
10. **Comparison motion explains one spatial transformation.** Result expands/contracts from the default stage while Source reveals/retracts beside it. `Close comparison` remains secondary to creative continuation.
11. **Reduced motion is complete.** The same selected states, Viewer hierarchy and Compare layouts appear with no tilt and with opacity-only or immediate layout changes. No meaning depends on transform motion.
12. **No backend implication.** The checkpoint adds no media identity, route, schema, storage, generation, worker/routing, account/admission or deployment requirement.

## Motion / effect budget
- card hover/focus micro response: 120–180ms; fine-pointer visual lift ≤4px and rotation ≤1.2°;
- selection/toolbar presence: roughly 180–220ms;
- Viewer stage / Compare spatial transition: roughly 260–380ms or equivalent bounded spring;
- no continuous JavaScript animation loop, scroll hijacking, cursor follower, full-grid parallax, shader or permanent particle system.

## Review checklist
The checkpoint is not approved until rendered inspection confirms:
- desktop and 390px Library remain readable with no clipped controls or horizontal overflow;
- media dominates card/chrome treatment;
- selection is unmistakable without motion;
- desktop and 390px Viewer preserve current action hierarchy and native-media expectations;
- comparison keeps Result clearly primary and Source contextual;
- Source exposes no management actions;
- reduced-motion guidance preserves complete hierarchy;
- spectral effects remain restrained rather than generic neon/cyberpunk noise;
- no design artifact stretches or distorts intended media geometry.

Production deployment is not authorized by this checkpoint. Phase 21 product implementation must not begin until this package is render-reviewed and its verified status is recorded in the authoritative project/UI trackers.
