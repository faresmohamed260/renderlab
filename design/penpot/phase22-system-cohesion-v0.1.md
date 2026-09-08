# Phase 22 — Activity, Settings, Landing & System Cohesion v0.1

**Status:** `APPROVED / IMPLEMENTATION READY`
**Phase:** 22 / Cycle 4 — Kinetic Visual Experience  
**Planning baseline:** `39e46584c22b1955fec7c4f966285307b1b8208c`  
**Controlling contract:** `PROJECT.md` Phase 22 Execution Contract

## Purpose
This checkpoint translates the merged Phase 22 contract into a repository-backed visual direction before implementation. It does not change product behavior, backend state, authorization, schema, workers, routing or deployment.

## Boards
- `design/penpot/phase22-activity-kinetic-v0.1.svg` — Activity desktop + 390px lifecycle hierarchy and reduced-motion/status contract.
- `design/penpot/phase22-settings-trust-v0.1.svg` — Settings signed-in desktop + 390px plus signed-out/access-state and trust/security hierarchy.
- `design/penpot/phase22-landing-kinetic-v0.1.svg` — Landing desktop + 390px hero/product-preview direction and public-truth/motion limits.
- `design/penpot/phase22-system-cohesion-v0.1.svg` — cross-product surface roles, shared constants, 390px/reduced-motion/effect-budget acceptance.

All boards are open SVGs intended for Penpot import/editing and remote raster review. The repository remains authoritative.

## Locked visual direction in this candidate
### Activity
- Active work gets one restrained spectral status rail/bloom tied only to real active lifecycle states.
- Terminal states settle to quiet surfaces; status meaning uses icon + text + tone, never color alone.
- Operation identity and sanitized job summary remain primary; timestamps are subordinate.
- `Run again`, `Retry`, `Cancel` remain visibly distinct because their product semantics are distinct.
- No fake percentage, ETA, provider stage, queue position or SLA language.

### Settings
- Settings uses Kinetic Precision through calm surface depth, typography and explicit state hierarchy—not through perpetual motion.
- Identity/access is primary, security is a deliberate second section, and Admin stays contextual/subordinate.
- Signed-out state remains a simple Sign in + Forgot password path; no public Create account or social-auth invention.
- Active / invitation-required / suspended truth uses text and surface treatment together; browser presentation never infers authorization.

### Landing
- Landing carries the strongest atmospheric expression in the cycle but remains native-scroll and reduced-motion-safe.
- `Open Create` is primary, `Sign in` secondary, and Closed Beta / invitation-only truth stays visible.
- Product preview uses current verified Create/Library vocabulary and shapes while clearly reading as a static product illustration, not live account/job state.
- No public signup/waitlist, pricing, testimonial, fake metric, provider/model or SLA claims.

### System cohesion
- Shared family resemblance comes from near-black atmosphere, spectral cyan/violet edge, selective glass depth, page-title rhythm, focus semantics and motion discipline.
- Surface roles remain intentionally distinct: Create intent-dominant; Library/Viewer media-dominant; Activity lifecycle-dominant; Settings trust-dominant; Landing atmosphere-dominant.
- Admin internals remain outside Phase 22 except inherited-shell regression sanity.

## Motion / effect budget
- Existing CSS + Motion for React `13.1.1` + RenderLab primitives are sufficient for the design intent.
- Activity may use only low-amplitude active-state motion and must provide a static equivalent under reduced motion.
- Settings should have no perpetual motion; optional entrance depth is brief and nonessential.
- Landing may use one bounded entrance/settle sequence; no scroll hijacking, parallax dependency, pointer-following field, particle engine or shader canvas.
- No GSAP, Lenis or second animation runtime is justified by this checkpoint.

## Review gate
Before implementation, remotely rasterize the exact SVG boards and human-review:
1. desktop and 390px hierarchy for each target surface;
2. active/succeeded/failed or cancelled Activity meaning and action reachability;
3. signed-in and signed-out/access-state Settings hierarchy;
4. Landing CTA/closed-beta truth and product-preview honesty;
5. reduced-motion/static equivalents and focus/status semantics;
6. cross-product cohesion without weakening Create or Library/Viewer;
7. effect budget: no decorative noise, no hidden meaning, no narrow overflow implied by the layouts.

If the rendered checkpoint fails review, revise the SVGs and rerender. Do not begin Phase 22 product implementation until this file is updated with verified render evidence and `IMPLEMENTATION READY` status.

## Verified render review — 2026-09-08
- Exact review workflow `34265429235` / job `102193457119` passed XML validation, remote `librsvg` rasterization, contact-sheet composition and artifact upload against review head `362730b64bc36b149c19ba7d27038c1766687f08`.
- Review artifact `10071612375` (`phase22-system-cohesion-review`) has digest `sha256:0508d5df26e4304e21239a02c2618d93cef924f5a18aa1ba7180bb13eb3422ab` and contains the exact Activity, Settings, Landing and cohesion rasters plus the contact sheet.
- Human review accepted desktop + 390px hierarchy across all four boards. Activity keeps truthful active/terminal meaning and distinct Run Again / Retry / Cancel actions with no fabricated percentage, ETA, provider stage, queue position or SLA. Settings keeps identity/security/access hierarchy and contextual Admin treatment without role/profile/preference invention. Landing keeps invitation-only Closed Beta truth, `Open Create` primary / `Sign in` secondary hierarchy and a clearly static product preview without signup/pricing/testimonial/fake-metric/provider/SLA claims.
- Cross-product review accepted the intended surface roles and bounded effect budget: Create remains intent-dominant; Library/Viewer media-dominant; Activity lifecycle-dominant; Settings trust-dominant; Landing atmosphere-dominant. Reduced-motion/static meaning and 390px reachability are explicit in the checkpoint. No corrective visual iteration is required.
- The self-cleaning review helper was removed by evidence commit `6e2e08a39e7fbb1210b84593a4fd126fb1a84f26`. No product source, runtime dependency, backend/auth/schema/worker/routing/infrastructure or deployment configuration changed during checkpoint review.

**Checkpoint decision:** Phase 22 product implementation may begin from the merged checkpoint, subject to the controlling execution contract and exact-head implementation acceptance. This approval is visual/design approval only; it does not mark any 22A–22D implementation item complete.

Production deployment is not authorized by this checkpoint.
