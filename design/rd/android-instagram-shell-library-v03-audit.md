# RenderLab Android Library v0.3 — design-only artifact review

**Date:** 2026-10-26  
**Status:** **DESIGN CANDIDATE; REVISIONS/RENDERED REVIEW STILL REQUIRED; OWNER APPROVAL PENDING.**  
**Scope:** PR #400 design branch only. No React Native/Expo runtime change, service call, APK, merge, deployment or external account mutation.

## Authority and inspection method
- `AGENTS.md`, `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md` (especially UI-083), `docs/ui/DESIGN_WORKFLOW.md`, and existing [v0.2 remediation contract](android-instagram-shell-library-v02.md).
- All referenced SVG source blobs were retrieved from the current draft branch and checked as text for 709×1536 geometry, balanced element tags, selected-label and screen-state wording, and expected fixture/image counts. These are **source-structure checks**, **not raster/pixel tests**. Balanced tags alone do not establish standards-compliant XML or visual fidelity.
- A [reproducible contact-sheet renderer](../tools/android_v03_review.py) is committed, but **its raster output has not been executed/reviewed in this checkpoint**. No native Android device, touch, focus or typography verification occurred. Thus no claim of completed visual-diff QA or certified accessibility is made.

## v0.3 artifacts
| Area | Actual candidate files | Intent |
| --- | --- | --- |
| Browse IA | [root Items Browse](../penpot/android-instagram-browse-v03.svg), [root Collections](../penpot/android-instagram-collections-v03.svg) | Two organization tabs while retaining five root dock anchors; contextual collection opens separately |
| Browse controls | [All-source sheet](../penpot/android-instagram-filters-v03.svg), [Generated-selected](../penpot/android-instagram-filters-generated-v03.svg), [Uploads-selected](../penpot/android-instagram-filters-uploads-v03.svg) | All / Generated / Uploads are sources; All types / Images / Videos are kinds; no misleading default Images selection |
| Filter results | [Generated items](../penpot/android-instagram-generated-filter-v03.svg), [Uploaded items](../penpot/android-instagram-uploads-filter-v03.svg) | Synthetic source metadata determines filtered results and badges, not the selected chip alone |
| Media content stress | [9:16 / 16:9 crop](../penpot/android-instagram-crop-stress-v03.svg), [long caption / long title](../penpot/android-instagram-long-caption-v03.svg) | Illustrative viewport stress, not real codec/video/frame test |
| Collection contextual | [v0.2 opened grid, unchanged](../penpot/android-instagram-collection-v02.svg), [empty collection](../penpot/android-instagram-empty-collection-v03.svg) | Contextual back-only screen, with truthful empty state |
| Secondary Browse states | [empty Library](../penpot/android-instagram-empty-library-v03.svg), [loading](../penpot/android-instagram-loading-library-v03.svg), [load error](../penpot/android-instagram-error-library-v03.svg), [focus](../penpot/android-instagram-keyboard-focus-v03.svg) | Replace stale four-tab shell with two-tab shell in non-populated states |
| Review interaction | [v0.3 walkthrough](../prototypes/android-navigation-v03.html), [v0.2/v0.3 side-by-side source viewer](../prototypes/android-v02-v03-comparison.html) | Keyboard-operable HTML review interactions, not Android or backend runtime |

Unchanged v0.2 Feed, Media Actions, signed-out gate and delete-confirmation frames remain reference inputs: they did not require a changed organization strip in this bounded iteration. The synthetic named Collections covers do **not** imply real collections, membership counts, or an Albums lifecycle.

## Findings and current disposition

| ID | Severity | Evidence and decision |
| --- | --- | --- |
| V03-01 | **P1 addressed in candidate** | The previous parallel Items / Collections / Generated / Uploads tabs conflated *organization* with *asset source*. Root Browse now offers Items / Collections; All / Generated / Uploads are filter options in Browse controls. This is a **proposed design**, not an accepted product policy or working filter. |
| V03-02 | **P1 addressed in candidate** | v0.2 Browse controls defaulted to visually selected **Images** even though the default grid contains video concepts. v0.3 now selects **All types** by default, with separate Images and Videos options. |
| V03-03 | **P1 corrected during source QA** | Initial v0.3 Generated screen showed a chip over the unfiltered 12-item grid. The revised committed file now reflows the nine `source=generated` fixtures: indices 0,2,3,4,6,7,8,10,11. Two of those are video poster concepts. Uploads shows indices 1,5,9; one is a declared four-item still group. Video/media badges are derived from fixture metadata. |
| V03-04 | **P1 addressed in candidate** | A distinct root Collections list precedes the contextual, back-only Collection grid. Returning to Collections is modeled in the v0.3 walkthrough; actual Android Back, deep link and scroll restoration are untested. |
| V03-05 | **P2 addressed in candidate** | Added empty Collection, source-filter chips, source-selected sheet state, extreme-ratio crop illustrations and long-caption stress. Loading, error, Empty Library and keyboard-focus screens use the revised root organization strip. |
| V03-06 | **P1 open — visual acceptance blocker** | Actual **rasterized** output at full reference size, 390dp-equivalent, dynamic text scale and side-by-side reference comparison was **not inspected**. Source geometry cannot prove optical hierarchy, text ellipsizing, contrast, touch clearances or cropping fidelity. Run the committed renderer and inspect its PNGs; also evaluate originals with Penpot or native screenshots. |
| V03-07 | **P1 open — usability gate** | Important creative actions are still icon-compact in Feed and explained in the v0.2 action sheet. No actual user comprehension, assistive label quality, disabled-capability behavior, or task success has been observed. |
| V03-08 | **P1 open — technical gate** | Expo SDK58/Phase M0 security, React Native route ownership, safe-area insets, TalkBack, reduced motion, auth/resource ownership, gesture/navigation restoration, video playback, uploads and permissions remain untouched/unverified. PR #401 third-party clone lab must not be treated as launch-ready. |

## Repository source checks (executed on fetched branch blobs, not local runtime)
- All **14 current v0.3 SVG candidates** were re-fetched after the corrections and checked for `width=709`, `height=1536`, `viewBox=0 0 709 1536`, root opening/closing tags and balanced SVG tag stacks; **14/14 passed those limited source checks**. This does **not** replace a standards-compliant XML parse/render run.
- Generated result contained **nine** `<image>` elements and **two** explicit video-poster badge groups; Uploads result contained **three** `<image>` elements. These are correct according to `design/tools/android_v02_generator.py` `FIXTURES` source mapping.
- Empty contextual Collection lacks the root dock in markup. Root Browse, root Collections and filtered Items variants include it.
- `All types` is the visibly selected default in v0.3 Browse controls, and selected Generated/Uploads sheets have distinct corresponding selected-source styling.

## Candidate recommendation and next gate
**Keep v0.2 as the preserved baseline and v0.3 as a review candidate. Do not mark design approved or begin Android implementation.** Next: run `python design/tools/android_v03_review.py --out /tmp/renderlab-android-v03-review` on a working design workstation with CairoSVG/Pillow, inspect actual contact sheets, examine 709×1536 and narrow/large-text presentations, correct real visual problems, and obtain **explicit human acceptance of the two-mode organization model, labeled action meanings, and Albums exclusion**. After that, separately satisfy mobile Phase M0/security and engineering acceptance gates. No merge or production action is authorized by this report.
