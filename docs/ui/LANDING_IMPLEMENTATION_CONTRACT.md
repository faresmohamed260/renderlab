# Landing Production Implementation Contract

**Status:** EXECUTION-READY — COMPLETE DESIGN APPROVED  
**Approved by user:** 2026-09-11  
**Parent design record:** `docs/ui/LANDING_BRAND_RD.md`  
**Creative-development workflow:** `docs/ui/CREATIVE_DEVELOPMENT.md`  
**Parent tracker:** GitHub issue #158

## Purpose
Implement the explicitly approved complete RenderLab public Landing experience on production route `/` without reinterpreting the accepted visual direction and without weakening any existing product, accessibility, security, testing, documentation, or deployment rule.

This contract is the production handoff required by `CREATIVE_DEVELOPMENT.md` after complete-surface design approval. It does not authorize deployment.

## Approved complete-surface evidence
The complete Landing design was assembled from the four individually approved R&D sections and reviewed as one surface.

Accepted complete-surface candidate before the geometry clarification:
- branch: `work/landing-complete-surface-rd-v0.1`
- draft R&D PR: #173
- exact head: `78f91321cd5ced1ce4566cf8c563c37e58cd382e`
- Engineering Quality: `34533941565` — passed
- Landing Complete Surface R&D: `34533941598` — passed
- evidence artifact: `10174651739`
- artifact digest: `sha256:81bf40d58494395dbb82d112d667ce8a5632bfee50b371dbaf7e7105b16fd0a2`

The whole-surface browser gate covers desktop Hero, Thread/Motion, Living Library focus, Resolve-to-Create final state, 390px Hero/Thread/Library/Resolve flow, reverse behavior, touch/keyboard selection, reduced motion, route truth, exact locked-mark loading, media loading, no horizontal overflow, and runtime cleanliness.

## User geometry clarification — LOCKED
The user's complete-surface approval includes one explicit visual correction that takes precedence over any conflicting R&D CSS approximation:

> The lower-right media module in the Lab Grid `R` must read as the **quarter-circle / large outer arc** version shown in the approved review image, not as a square/rectangular tile with one conventionally rounded corner.

### Canonical geometry source
Production must derive this module from the repository-owned locked Lab Grid mark rather than inventing a local radius.

Canonical lower-right mark path from `src/components/brand/renderlab-brand.tsx` / `public/renderlab-mark.svg`:

`M75 91H89A33 33 0 0 1 122 124V132H75Q71 132 71 128V95Q71 91 75 91Z`

Consequences:
- the large outer arc is part of the identity geometry, not decorative border-radius styling;
- Hero and Resolve-to-Create instances of the lower-right media module must use the same canonical mask/clip geometry;
- desktop, mobile, settled, transitional, and reduced-motion states must preserve that silhouette;
- any earlier prototype rule that produces a small-radius rounded rectangle is superseded;
- future repeated Lab Grid media motifs must consume the same geometry rather than creating another approximation.

## Approved visual sequence
The production Landing consists of one authored sequence:

1. **Hero — Lab Matrix**
   - concise left-led product copy;
   - four media modules in the locked Lab Grid `R` proportions;
   - Create → Shape with references → Set in motion → Keep and continue;
   - high-density cinematic media;
   - restrained dark canvas/chrome;
   - bounded pointer depth and ambient media motion;
   - deliberate narrow/mobile adaptation.

2. **One creative thread**
   - one media object remains the anchor through Create → References → Motion → Continue / Library;
   - desktop uses a sticky scroll-driven working-media stage;
   - reverse scrolling is coherent;
   - narrow/mobile is deliberately adapted, not a scaled sticky desktop sequence.

3. **Living Library**
   - spatial media field rather than a feature-card grid;
   - pointer/keyboard/tap selection establishes active work;
   - desktop neighbors yield around focused media;
   - narrow/mobile becomes a horizontal touch-first rail with contextual details.

4. **Resolve to Create**
   - Library context resolves into the Lab Grid media `R` rather than resetting to a generic CTA block;
   - desktop convergence is scroll-linked and reversible;
   - mobile uses a compact already-resolved composition;
   - `Open Create` and `Sign in` remain the only primary conversion actions.

## Product behavior that must remain unchanged
- Bare `/` remains public Landing and does not render `AppShell`.
- Root continuation intent (`source` or `action`) preserves the full query and redirects to `/create`.
- `Open Create` targets `/create`.
- `Sign in` targets `/settings`.
- Closed Beta / invitation-only / no-public-sign-up truth remains explicit.
- Do not add registration, waitlist, pricing, testimonials, fake metrics, provider/model claims, SLA claims, public admission, analytics marketing cookies, automatic variant/branch/lineage claims, or fabricated generation state.
- Current metadata, Open Graph route behavior, favicon/app icon identity, and canonical origin behavior remain truthful unless a separately verified branding update is required by this implementation.

## Implementation architecture
- Keep `src/app/page.tsx` as the server route boundary so continuation-query redirect remains server-owned.
- Move the interactive approved Landing surface into a bounded Landing client component under `src/features/landing/`.
- Reuse `RenderLabBrand` / `RenderLabMark` exactly; do not redraw the identity.
- Reuse maintained `Button` and other approved shared primitives for visible conventional controls.
- Use the existing Motion for React runtime for bounded pointer/layout/scroll choreography where it fits. No new animation dependency is approved by this contract.
- Prefer native scrolling. Do not add Lenis, GSAP, Three.js/WebGL, or another runtime unless a concrete production-fidelity blocker is proven and separately reviewed.
- Keep Landing-specific styling isolated from application surfaces. Do not globally restyle Create, Library, Activity, Settings, Admin, or shared shell behavior as a side effect.

## Media contract
The accepted R&D photographs establish crop density, visual energy, color balance, and motion intent, but they are not identity assets.

Production media must be owned/cleared for the intended use. Replacing a photograph is allowed only when the replacement preserves the approved section hierarchy, media dominance, crop logic, and narrative role. Do not fall back to abstract placeholder geometry.

## Accessibility and responsive contract
- Semantic heading order and navigable links/controls remain intact.
- Interactive Library media choices must have keyboard focus and visible focus treatment; touch must not depend on hover.
- Pointer depth is enhancement only; meaning and action remain complete without it.
- 390px layout must preserve deliberate composition, readable copy, reachable conversion actions, and no document-level horizontal overflow.
- `prefers-reduced-motion: reduce` must produce a complete static equivalent with no essential running animation or scroll dependency.
- Important state changes must not fabricate product progress or availability.

## Validation matrix
Before implementation can be called `APPROVED`:

1. Exact implementation head passes Engineering Quality.
2. Exact implementation head passes the existing Brand / Launch Visual workflow, updated only as needed to assert the newly approved copy/composition instead of obsolete Landing copy.
3. The Landing browser verifier covers at minimum:
   - 1440px Hero;
   - Section 02 Create/References/Motion/Continue progression and reverse behavior;
   - Section 03 pointer selection, keyboard selection, and narrow/touch selection;
   - Section 04 pre-resolution, resolved, and reverse states;
   - 390px whole-page flow;
   - reduced-motion whole-page behavior;
   - `Open Create` / `Sign in` targets;
   - continuation-query redirect preservation;
   - locked brand fidelity;
   - canonical lower-right quarter-circle module geometry in Hero and Resolve states;
   - media load success;
   - no horizontal overflow;
   - console/page-error cleanliness.
4. All other workflows actually attached to the exact head must pass; do not waive existing gates because this is a visual change.
5. Human fidelity review compares real production-candidate browser evidence to the accepted R&D evidence and this geometry clarification.
6. Documentation is updated from verified implementation reality only.

## Explicitly out of scope
- Create/Library/Viewer/Activity/Settings/Admin redesign.
- Product behavior or route changes beyond preserving existing root continuation redirect.
- Auth/backend/schema/R2/Supabase/worker/infrastructure changes.
- New public-admission behavior.
- New animation/runtime dependency without a separately documented need.
- Production deployment.

## Exit criteria
This implementation slice is complete only when:
- production `/` faithfully implements the approved four-section sequence;
- the lower-right Lab Grid media module is consistently the canonical quarter-circle/large-arc geometry everywhere it appears;
- all required exact-head workflows pass;
- desktop/mobile/reduced-motion and temporal evidence are reviewed clean;
- no material visual drift from the accepted design remains;
- source-of-truth docs reflect the verified implementation;
- the implementation PR is merged.

Deployment remains a separate explicit user-authorized operation after merge.