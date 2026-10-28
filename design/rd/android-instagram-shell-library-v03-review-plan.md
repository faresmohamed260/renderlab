# Android Library v0.3 — bounded usability refinement proposal

**Status:** V0.3 RASTER RENDERED AND INSPECTED IN GITHUB ACTIONS AT 709×1536; DESIGN OWNER ACCEPTANCE AND NATIVE QA PENDING. **Scope:** design-only follow-up to v0.2 in draft PR #400. No native implementation, merge, or deployment authorization.

## Source and boundary
Based on the actual v0.2 SVGs, walkthrough source and `android-instagram-shell-library-v02.md`, the v0.1 audit, UI-083 and repository UI governance. Retain the Instagram-inspired media-first layout, root Feed/Browse five-icon dock, contextual back-only Collection grid, existing owner-scoped asset semantics, and synthetic fixtures. Do not introduce Albums persistence or social behavior.

## Candidate refinements to render and compare
1. **Browse organization vs origin.** Keep **Items** and **Collections** as the compact primary organization switch. Move **Generated / Uploads** to an explicit source selector in the Browse controls sheet, alongside **All**. Keep media kind (Image / Video), Favorites, and Sort as independent filters. Show selected source with a compact, dismissible filter chip only when non-default, without adding a permanent Feed filter bar. Evaluate against existing four-tab v0.2; do not treat this as accepted IA.
2. **Discoverability.** Keep Feed's media-first icon row but expose action names in the existing overflow sheet, with unambiguous accessible names for Favorite, Reuse in Create, Edit (eligibility-gated), Download, Add to Collection, and Delete. Make Search visibly accessible from the Browse header and Upload from Browse controls and empty state. Ensure Create remains distinct from Upload.
3. **Realistic content stress frames.** Add visual cases for long/truncated asset title, extreme portrait and landscape crops, mixed image/video posters, collection with zero items, non-default Generated filter, and long caption above fixed dock. Use only synthetic data and correct badges/counts.

## Acceptance matrix (must inspect actual rendered artifacts)
- **IA:** A first-time user can distinguish browsing Items/Collections from filtering Generated/Uploads; selected organization and origin are visually distinct; reset is obvious.
- **Actions:** Label, consequence, disabled/hidden eligibility and destructive confirmation are explicit; controls do not imply unsupported APIs.
- **Media:** Single still has no badge; videos have video marker; multi-item count and pagination agree; aspect-ratio handling does not crop essential UI.
- **Layout:** No content hidden by Android system bars, keyboard or dock at reference 709×1536, narrow screen and large text; tap areas require native dp verification.
- **Navigation:** Feed ↔ Browse retains state; Collection/Viewer Back returns to origin; deep-link fallback is owner-safe.
- **Accessibility:** Native TalkBack order/labels, font scaling, RTL, reduced motion and touch are outstanding, not certified by SVG/browser evidence.
- **Security:** PR #399 M0 security and PR #401 clone limitations remain independent blockers.

## Deliverables and review gate
Prepare side-by-side **v0.2 vs v0.3 rendered** Feed, Browse, Browse Controls, Collection and stress states, plus an updated clickable walkthrough. Record measured visual differences and a finding-by-finding disposition. Seek explicit owner design approval before any mobile code changes. Preserve v0.2 unchanged as the comparison baseline.

**Checkpoint update — 2026-10-26:** The v0.3 SVG screens, distinct root Collections list, selected-filter states, corrected fixture-filter results, four revised non-populated Browse states, clickable walkthrough, and expanded side-by-side comparison are now committed on the PR #400 draft branch. See [v0.3 audit / source-check report](android-instagram-shell-library-v03-audit.md) for exact file links and the explicit limitations. A [contact-sheet render/validation utility](../tools/android_v03_review.py) is committed but has not been run on a full local repository checkout. Checkpoint 25 locally rendered and inspected the contextual Empty Collection vector state, corrected misleading contextual icons, aligned organization icons and enlarged three primary CTA artworks. See the [v0.3 audit](android-instagram-shell-library-v03-audit.md) for exact scope. Do not label the **full 15-screen set** as raster-reviewed, owner-accepted, implemented or ready to merge.


**Checkpoint 26 — 2026-10-27:** Enlarged root Browse labels to 26 SVG units, enlarged source/kind control backgrounds and source-chip row to 88 units, updated review hotspots, and added [source regression gate](../tools/android_v03_source_gate.py). The independent GitHub-connector source audit reports 15/15 structural/content checks passed. This **does not** mean the current complete SVG set was raster-rendered or device-tested. See [the audit's Checkpoint 26 record](android-instagram-shell-library-v03-audit.md) for exact limitations and remaining acceptance gates. PR remains a design-only draft.


**Checkpoint 27 — 2026-10-27:** Re-ran source validation and full-resolution CairoSVG rendering on the PR branch in a temporary read-only GitHub Actions runner. Successful [run 40446398423](https://github.com/faresmohamed260/renderlab/actions/runs/40446398423) produced 18 full-resolution PNG screenshots, five contact sheets, and a manifest; [audit](android-instagram-shell-library-v03-audit.md) records observed visual issues and corrections. Source gate passed 15/15. The rendered cases now show corrected Browse-sheet headings, non-overlapping long captions, and a clean contextual empty-state CTA. The two-mode hierarchy and action meanings remain **owner-approval candidates**, not native features. The temporary workflow may be removed after artifact collection; re-run the committed scripts in an authorized checkout if needed later. No merge/implementation/security sign-off was implied.
