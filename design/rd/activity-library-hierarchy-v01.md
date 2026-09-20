# UI-082 Activity + Library — Hierarchy v0.1

**Status:** Accepted implementation checkpoint  
**Tracker:** #305  
**Parent contract:** `docs/ui/MEDIA_FIRST_HIERARCHY_CORRECTION_CONTRACT.md`

## Scope

Checkpoint 3 corrects the same content-derived hierarchy and legibility problems where they reproduce on Activity and Library. It does not alter job lifecycle truth, ordering, retry/run-again/cancel eligibility, Library query/filter/selection state, media ownership, route behavior or persistence.

## Evidence baseline

- Production QA-002 Activity evidence shows a generation prompt rendered as the dominant `h2` inside the primary Job Matrix cell at up to 38px. For long prompts this makes request text read like a page hero rather than job content.
- Activity essential technical labels currently include several 8–9px values, below the UI-082 preferred floor.
- Library production evidence already keeps media visually primary. Its command surface is useful but visually heavier than necessary, with a tall glass treatment and several 9–10px essential labels.
- Library mobile composition is already coherent and must not be destabilized by a desktop-only aesthetic correction.

## Activity composition

The Job Matrix remains the approved 01 / 02 / 03 newest-work composition.

Rules:

- Job summary/request text is **content preview**, not a section heading. It must not create an unbounded heading hierarchy.
- Primary job summary uses a readable medium scale and a bounded three-line presentation on desktop.
- Secondary job summaries use a bounded compact presentation.
- On 390px the primary summary may use an additional line when needed, but must remain bounded and must not push state/action context out of practical reach.
- Status, timestamp, operation kind and action remain immediately scannable.
- Full summary text remains in the DOM; visual clamping must not replace or mutate lifecycle/product data.
- Existing failure copy redaction, Retry, Run Again, Cancel, View result, live refresh and History Register behavior are unchanged.
- Essential job metadata should generally be at least 10px. Decorative registration may remain smaller when it is not the only carrier of information.

Approximate desktop hierarchy:

```text
ACTIVITY
Recent generations...

┌─────────────────────────────────────────────────────────────┐
│ RL / 01                                  SEP 20, 8:10 PM UTC│
│ ● COMPLETED  Complete                                      │
│                                                             │
│ Request summary / prompt preview, bounded to three lines    │
│ even when the generation prompt is deliberately very long. │
│ CREATE IMAGE                                                │
│                                                             │
│ [ View result ] [ Run again ]                               │
└─────────────────────────────────────────────────────────────┘
```

## Library composition

Library remains media-first. Checkpoint 3 does **not** replace its command rail or card grammar.

Rules:

- Preserve Creatives/Uploads, search, filters, Favorites, Collections, Select and sort behavior exactly.
- Reduce avoidable glass/chrome intensity and small amounts of command-surface height only where touch targets remain unchanged.
- Raise essential technical labels toward the 10–12px floor.
- Do not reduce the media grid, card preview area or mobile scanability.
- Do not hide controls to make the screen look simpler.
- If rendered review shows no meaningful improvement from a structural change, retain the existing structure and record the audit instead.

## Acceptance evidence

Activity configured evidence must include:
- deliberately long newest-job summary at 1440px;
- 390px reduced-motion view;
- no horizontal overflow;
- bounded summary geometry;
- unchanged 01/02/03 order, state and actions;
- existing privacy/redaction, Retry/Run Again/Cancel and refresh assertions.

Library evidence must include:
- desktop and 390px gallery;
- media remains the primary visual object;
- command controls remain complete and reachable;
- selection/filter/search states remain intact;
- no horizontal overflow.

## Non-goals

No new job fields, naming model, route, sidebar, pagination model, filter capability, Library persistence behavior, animation runtime or data contract.
