# Landing Production Implementation Contract

**Status:** COMPLETE / VERIFIED / MERGED — NOT DEPLOYED  
**Approved by user:** 2026-09-11  
**Implementation merged:** PR #174 / `1dc04f68d059a9f7d903c8313fe2e690aeec9d0e`  
**Parent design record:** `docs/ui/LANDING_BRAND_RD.md`  
**Creative-development workflow:** `docs/ui/CREATIVE_DEVELOPMENT.md`  
**Parent tracker:** GitHub issue #158

## Purpose
Implement the explicitly approved complete RenderLab public Landing experience on production route `/` without reinterpreting the accepted visual direction and without weakening any existing product, accessibility, security, testing, documentation, or deployment rule.

This contract is the production handoff required by `CREATIVE_DEVELOPMENT.md` after complete-surface design approval. It does not authorize deployment.

## Verified implementation closure
The production implementation is complete and merged on `main`.

Final implementation candidate:
- implementation branch: `work/landing-production-implementation`;
- PR: #174 — merged;
- exact implementation head: `a7f94b77bf1be989c0101376aa0404cbb28b34ae`;
- merge commit on `main`: `1dc04f68d059a9f7d903c8313fe2e690aeec9d0e`.

All workflows attached to the final exact implementation head passed:
- Engineering Quality `34539565814`;
- Create Durable Upload `34539565867`;
- Account Ownership `34539565817`;
- UI Shell Validation `34539565835`;
- Brand / Launch Visual `34539565857`;
- Integrated Release `34539565832`;
- Library Lifecycle Visual `34539565822`;
- Release Candidate Matrix `34539565841`.

Brand / Launch Visual artifact `10176777155` (`sha256:249575e790be67219927ccefb6edef00efaf6aedc5694a95f2ed62f4aef48e38`) was reviewed against the accepted design. It covers the desktop Hero, creative-thread motion state, Living Library focus, resolved closing state, and 390px mobile surface. The canonical lower-right quarter-circle / large-arc module remained correct after the final production-media replacement.

Merged-main verification also passed Engineering Quality `34540955036` and Integrated Release `34540955056`. The first push-triggered UI Shell run was superseded/cancelled by the repository's workflow orchestration; follow-up exact-main UI Shell `34541063502` passed, and exact-main Brand / Launch Visual `34541065002` passed.

No production deployment was performed. Automatic Git → Vercel deployment remains disabled; rollout remains a separate explicit user-authorized operation.

## Approved complete-surface evidence
The complete Landing design was assembled from the four individually approved R&D sections and reviewed as one surface.

Accepted complete-surface candidate before the geometry clarification:
- branch: `work/landing-complete-surface-rd-v0.1`;
- draft R&D PR: #173;
- exact head: `78f91321cd5ced1ce4566cf8c563c37e58cd382e`;
- Engineering Quality: `34533941565` — passed;
- Landing Complete Surface R&D: `34533941598` — passed;
- evidence artifact: `10174651739`;
- artifact digest: `sha256:81bf40d58494395dbb82d112d667ce8a5632bfee50b371dbaf7e7105b16fd0a2`.

The whole-surface browser gate covers desktop Hero, Thread/Motion, Living Library focus, Resolve-to-Create final state, 390px Hero/Thread/Library/Resolve flow, reverse behavior, touch/keyboard selection, reduced motion, route truth, exact locked-mark loading, media loading, no horizontal overflow, and runtime cleanliness.

## User geometry clarification — LOCKED
The user's complete-surface approval includes one explicit visual correction that takes precedence over any conflicting R&D CSS approximation:

> The lower-right media module in the Lab Grid `R` must read as the **quarter-circle / large outer arc** version shown in the approved review image, not as a square/rectangular tile with one conventionally rounded corner.

### Canonical geometry source
Production derives this module from the repository-owned locked Lab Grid mark rather than inventing a local radius.

Canonical lower-right mark path from `src/components/brand/renderlab-brand.tsx` / `public/renderlab-mark.svg`:

`M75 91H89A33 33 0 0 1 122 124V132H75Q71 132 71 128V95Q71 91 75 91Z`

Consequences:
- the large outer arc is part of the identity geometry, not decorative border-radius styling;
- Hero and Resolve-to-Create instances of the lower-right media module use the same canonical mask/clip geometry;
- desktop, mobile, settled, transitional, and reduced-motion states preserve that silhouette;
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

## Product behavior that remains unchanged
- Bare `/` remains public Landing and does not render `AppShell`.
- Root continuation intent (`source` or `action`) preserves the full query and redirects to `/create`.
- `Open Create` targets `/create`.
- `Sign in` targets `/settings`.
- Closed Beta / invitation-only / no-public-sign-up truth remains explicit.
- Do not add registration, waitlist, pricing, testimonials, fake metrics, provider/model claims, SLA claims, public admission, analytics marketing cookies, automatic variant/branch/lineage claims, or fabricated generation state.
- Current metadata, Open Graph route behavior, favicon/app icon identity, and canonical origin behavior remain truthful unless a separately verified branding update is required.

## Implementation architecture
- `src/app/page.tsx` remains the server route boundary so continuation-query redirect stays server-owned.
- The interactive approved Landing surface lives in `src/features/landing/landing-experience.tsx` with Landing-only styling in `landing-experience.module.css`.
- `RenderLabBrand` / `RenderLabMark` are reused exactly; the identity is not redrawn.
- Maintained `Button` primitives are reused for conventional visible controls.
- Existing Motion for React provides bounded pointer/layout/scroll choreography; no new animation dependency was added.
- Native scrolling remains the baseline; Lenis, GSAP, Three.js/WebGL were not added.
- Landing styling remains isolated from Create, Library, Activity, Settings, Admin, and shared application-shell behavior.

## Media contract
The accepted R&D photographs established crop density, visual energy, color balance, and motion intent but were not treated as production identity assets.

The final implementation replaced temporary R&D media with a reviewed Unsplash-licensed nature/abstract set and records exact source/license provenance in `docs/ui/LANDING_MEDIA_SOURCES.md`. The selected set avoids intentional identifiable people and visible brand marks. Future replacement with RenderLab-owned/generated media is allowed only when the approved hierarchy, media dominance, crop logic, narrative role, and documented right-to-use basis are preserved.

## Accessibility and responsive contract
- Semantic heading order and navigable links/controls remain intact.
- Interactive Library media choices support keyboard focus and touch; meaning does not depend on hover.
- Pointer depth is enhancement only; meaning and action remain complete without it.
- 390px layout preserves deliberate composition, readable copy, reachable conversion actions, and no document-level horizontal overflow.
- `prefers-reduced-motion: reduce` produces a complete static equivalent with no essential running animation or scroll dependency.
- Important state changes do not fabricate product progress or availability.

## Validation matrix — VERIFIED
The final implementation satisfied the production contract:

1. Exact implementation head passed Engineering Quality.
2. Exact implementation head passed the updated Brand / Launch Visual workflow.
3. Browser verification covered 1440px Hero; Section 02 forward/reverse progression; Section 03 pointer/keyboard/touch selection; Section 04 pre-resolution/resolved/reverse states; 390px whole-page flow; reduced motion; route targets; continuation-query preservation; locked brand fidelity; canonical lower-right quarter-circle geometry; media loading; no horizontal overflow; and runtime cleanliness.
4. Every workflow attached to the final exact head passed.
5. Human fidelity review accepted the final production-candidate browser evidence, including the production-media swap and geometry lock.
6. Final implementation/closure state is recorded in repository documentation.

## Explicitly out of scope
- Create/Library/Viewer/Activity/Settings/Admin redesign.
- Product behavior or route changes beyond preserving existing root continuation redirect.
- Auth/backend/schema/R2/Supabase/worker/infrastructure changes.
- New public-admission behavior.
- New animation/runtime dependency without a separately documented need.
- Production deployment.

## Exit criteria — SATISFIED
- production `/` implementation faithfully implements the approved four-section sequence on `main`;
- the lower-right Lab Grid media module consistently uses the canonical quarter-circle/large-arc geometry everywhere it appears;
- all required exact-head workflows passed;
- desktop/mobile/reduced-motion and temporal evidence were reviewed clean;
- no material visual drift from the accepted design remains;
- source-of-truth Landing docs reflect verified implementation reality;
- PR #174 is merged.

Deployment remains a separate explicit user-authorized operation after merge.