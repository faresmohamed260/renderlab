from pathlib import Path

BASELINE = "c17abfef07fbc580c51f458496e4e53502816229"

project = Path("PROJECT.md")
text = project.read_text()
old = "**Status: `ACTIVE / PHASE 21 CONTRACT READY`.**"
if old not in text:
    raise SystemExit("Cycle 4 status guard failed")
text = text.replace(old, "**Status: `ACTIVE / PHASE 22 CONTRACT READY / DESIGN CHECKPOINT REQUIRED`.**", 1)
if "# Phase 22 Execution Contract — Activity, Settings, Landing & System Cohesion" in text:
    raise SystemExit("Phase 22 contract already present")
contract = r'''

---

# Phase 22 Execution Contract — Activity, Settings, Landing & System Cohesion
**Status: `CONTRACT READY / DESIGN CHECKPOINT REQUIRED / IMPLEMENTATION NOT STARTED`.**
**Planning baseline:** `c17abfef07fbc580c51f458496e4e53502816229` (Phase 21 merged baseline).

## Goal / user value
Complete Cycle 4's Kinetic Precision visual language across the remaining ordinary user-facing surfaces without changing what those surfaces mean or who owns their state. Activity should make real lifecycle state easier to scan, Settings should make identity/security/access state feel trustworthy and deliberate, and Landing should present the actual current RenderLab product with the same premium visual confidence already established in Create and Library/Viewer.

The final phase also owns the cross-product visual-system audit needed to prove that Cycle 4 reads as one coherent product at desktop and 390px, with keyboard/focus/reduced-motion parity and a bounded effect budget.

## Verified starting state
1. **Phase 21 is complete and merged.** PR #127 final documentation head `d14511e60e51dfd7faecc46c95b9c858dbd10b8d` passed a clean 18/18 exact-head matrix. It squash-merged to `main` as `c17abfef07fbc580c51f458496e4e53502816229`; all five merged-main checks GitHub attached passed, including UI Shell, Engineering Quality, Creative Iteration, Viewer and Image Upscale. Vercel reported zero deployments created at or after the merge timestamp, so production remains unchanged.
2. **Activity state is server-owned.** `/activity` resolves the current RenderLab account, server-lists owner-scoped `generation_jobs`, keeps pagination in `offset`, and passes truthful availability / `hasActive` state to `ActivityView`. Auto-refresh is enabled only while real active work exists. Existing rows distinguish queued/preparing/running/cancelling/persisting/succeeded/failed/cancelled and preserve separate succeeded Run Again, failed Retry and active Cancel eligibility.
3. **Settings authorization is server-owned.** `/settings` resolves verified Supabase identity, RenderLab access state and fresh active-admin eligibility before rendering. `AccountSettings` owns only sign-in/recovery/sign-out interaction state. Active/suspended/invitation-required state, password security, recovery and the contextual Admin link must keep their existing authorization semantics.
4. **Landing is public and route-separated.** `/` renders without `AppShell`; `/create` and other product routes remain under the application shell. Root `source`/`action` continuation intent still redirects with the full query to `/create`. Landing is closed-beta truthful and currently uses a static product preview; it has no public registration, pricing, testimonial, fake metric, provider/model or SLA claims.
5. **Kinetic Precision already exists elsewhere.** Phase 19 established the atmospheric/dimensional shell, Phase 20 completed Create as the creative instrument and Phase 21 completed Library/Viewer spatial media presentation. Activity and Settings inherit the shell but their internal surfaces remain materially flatter; Landing predates the Kinetic Precision cycle.
6. **Existing validation is strong and reusable.** Activity Visual and Activity Cancel cover configured job/account states and cleanup. Account Identity Visual and Account Ownership cover configured identity/access/security states. Brand / Launch Visual covers responsive public routing/copy/purity/build behavior. UI Shell, Creative Iteration, Create Lifecycle and Library/Viewer workflows provide cross-product regression coverage when shared styling changes.
7. **No new runtime is justified by current evidence.** Existing RenderLab primitives, semantic tokens, CSS and Motion for React `13.1.1` remain the first implementation choice. GSAP, Lenis, WebGL/shader canvases, global smooth-scrolling and a second animation runtime are not justified for this phase.

## Required design checkpoint before implementation
Before Phase 22 visual implementation begins, create and human-review a repository-backed Penpot/open-SVG checkpoint covering at minimum:
- Activity desktop and 390px with active + succeeded + failed/cancelled truth visible;
- Settings desktop and 390px for signed-out and signed-in/access-state composition, including the password/security continuation hierarchy;
- Landing desktop and 390px with its public hero/product-preview direction and closed-beta CTAs;
- a reduced-motion/static representation for any meaningful animated state;
- enough side-by-side system context to judge that Landing, Activity and Settings belong to the same Kinetic Precision product as Create and Library/Viewer.

The checkpoint must be recorded under `design/penpot/` and reviewed before implementation. A design artifact alone is not implementation approval.

## In scope
### 22A — Activity as a truthful kinetic lifecycle surface
- Recompose Activity hierarchy so active work, terminal history, operation identity, timestamps and actions scan faster without changing server ordering, pagination or lifecycle semantics.
- Give active statuses restrained dimensional/kinetic emphasis tied only to real `queued|preparing|running|cancelling|persisting` state. Do not invent percent complete, ETA, provider stages, queue position or SLA language.
- Keep success/failure/cancelled meaning explicit without relying on color alone. Terminal rows should settle visually rather than pulse indefinitely.
- Preserve distinct action contracts: succeeded `View result` / conditional `Run again`; failed `Retry`; active `Cancel` only when server-derived `canCancel` is true.
- Preserve the current server-rendered Activity dataset and feature-local auto-refresh boundary; do not move job truth into a client/global store merely to animate rows.
- Preserve narrow action reachability and the existing 20-row URL pagination contract.

### 22B — Settings as a deliberate trust/security surface
- Bring `/settings` and its password/security continuation into Kinetic Precision while keeping identity, access and privilege resolution server-owned.
- Improve visual hierarchy between identity, Closed Beta access state, password/security actions, feedback and the conditional Admin continuation.
- Keep signed-out Sign in + Forgot password simple and obvious; do not introduce public Create account, social auth, profile editing, preferences or account-management concepts that are not already product requirements.
- Keep active / suspended / invitation-required / transition-access semantics and sanitized feedback truthful. Raw Supabase errors, role editing and other-user data remain forbidden.
- The Admin link remains contextual and appears only after the existing fresh active-admin check; Phase 22 does not redesign `/admin` internals.

### 22C — Landing as the public Kinetic Precision expression
- Recompose `/` so the first public impression matches the premium spatial/kinetic character now proven in Create and Library/Viewer rather than reading as a pre-Cycle-4 static marketing shell.
- Preserve `Open Create` and `Sign in` destinations, closed-beta / invitation-only truth and legacy root continuation redirect behavior.
- Replace or materially refine the current static product preview so it reflects current RenderLab visual language and verified product capability without pretending that a decorative preview is live product state.
- Motion may support hierarchy/continuity only when bounded and reduced-motion-safe. Native scrolling remains authoritative; no scroll hijacking, cursor-following field, heavy particle engine, shader canvas or perpetual decorative choreography.
- Keep forbidden public-signup/pricing/testimonial/fake-metric/provider/model/SLA claims absent. Marketing copy may be updated only to describe already-verified product behavior truthfully.

### 22D — Cycle 4 system-cohesion audit
- Review Landing, Create, Library, Viewer, Activity and Settings together at desktop and 390px after implementation; Admin needs only inherited-shell/regression sanity, not an internal redesign.
- Check page-title scale, surface depth, border/translucency usage, status semantics, focus treatment, touch targets, motion timing and reduced-motion/static equivalents for consistency.
- Check horizontal overflow, text clipping, action wrapping, sticky/fixed chrome collisions, safe-area behavior and media/control distortion.
- Check that no completed Create or Library/Viewer surface was weakened merely to make the newer surfaces look consistent.
- Keep the effect budget bounded: no persistent animation should compete with task/media focus, and large visual effects must degrade cleanly on narrow/reduced-motion paths.

## Explicitly out of scope
- New generation or post-processing capabilities, model/workflow selection, Variations, Restore, Inpaint/Outpaint, additional Upscale factors or Director/LoRA productization.
- Generation lifecycle, retry/run-again/cancel semantics, job schema, scheduling, worker/provider routing, worker deployment or infrastructure recovery.
- Supabase/R2 schema/resource changes, account/admission/privacy policy changes, billing/credits, public signup/waitlist or analytics/marketing-cookie work.
- New top-level routes, separate Image/Video/Activity apps, shell-global client job/account stores or a new application/router architecture.
- New Settings preference systems, profile/avatar/account-deletion/MFA work, role editing or Admin operations redesign.
- Reopening Phase 20 Create composition or Phase 21 Library/Viewer composition except for verified shared-system regressions caused directly by Phase 22 changes.
- Production deployment. Phase 22 completion and Cycle 4 completion do not authorize Vercel production rollout.

## Architecture / component boundary
- Keep Server Components as the page/data default. Client Components stay limited to existing interaction needs or deliberate feature-local presentation mechanics.
- Activity job state remains server-owned; `ActivityAutoRefresh` stays an observational refresh accelerator, not a correctness/data store.
- Settings identity/access/admin state remains server-derived before presentation. Client code must not infer role/access from browser metadata.
- Landing remains public and independent of application-shell/account state. Decorative/product-preview state must not become an auth or product-data dependency.
- Use existing RenderLab primitives and Phase 19 tokens first. If a maintained external motion component is genuinely needed, evaluate it under the existing component-source/accessibility/performance rules and document adoption in `COMPONENT_CATALOG.md`; otherwise add no dependency.
- Shared visual changes belong in existing semantic tokens/styles only when they truly apply cross-product; avoid feature-specific values masquerading as global design-system rules.

## Backend / infrastructure / data implications
None are expected. This phase is visual/interaction-only. No migration, Supabase/R2 mutation, worker/provider/routing change, scheduler change, secret change or deployment configuration change is authorized. Any discovered requirement for one of those boundaries must stop and become a separately reviewed scope decision rather than being smuggled into Phase 22.

## Security / ownership invariants
- Activity remains private to the verified RenderLab account and foreign jobs collapse through existing ownership behavior.
- Settings remains available according to current identity/access rules, including suspended-user recovery/sign-out behavior.
- Admin visibility/authorization remains based on fresh server-side active-admin checks.
- Landing exposes no private product/account state.
- Browser motion/presentation state never authorizes access or changes durable truth.

## Validation matrix
Final exact-head acceptance requires, at minimum:
1. `npm run build`, `npm run verify:ui-purity`, type-check/lint/unit gates through Engineering Quality and UI Shell.
2. Activity Visual with configured active/succeeded/failed states, Retry behavior, responsive screenshots and exact cleanup.
3. Activity Cancel Visual with active cancellation eligibility/control behavior and cleanup.
4. Account Identity Visual across signed-out, active/suspended/recovery/password states as currently covered; update screenshot assertions where Phase 22 changes composition.
5. Account Ownership to prove no visual refactor weakened account/privacy boundaries.
6. Brand / Launch Visual for `/`, `/create`, root continuation, forbidden-claim checks, desktop/390px and reduced-motion behavior.
7. Creative Iteration where Activity successful Run Again and Viewer/Create continuation regressions are affected.
8. Create Lifecycle and Library Lifecycle (plus Viewer/Upscale visual coverage where shared global styling changes) as the Cycle 4 cohesion regression set.
9. Every workflow GitHub actually attaches to the final PR head must be green. Exact-head acceptance cannot borrow success from an older SHA.
10. Configured fixture cleanup must succeed; shared-resource cleanup failures remain real gate failures.

No live generation spend is required merely for visual cohesion unless an actually affected existing workflow already requires its bounded provider proof. Do not broaden worker-backed testing solely to make Phase 22 look more comprehensive.

## Responsive / human visual review
Human review is mandatory after configured automation. At minimum inspect:
- Landing: 1440-class desktop + 390px; hero, product preview, CTA hierarchy, footer and reduced-motion/static path.
- Activity: desktop + 390px with simultaneous active, succeeded and failed/cancelled rows; action wrapping; pagination; keyboard focus; reduced-motion active-state equivalent.
- Settings: desktop + 390px signed-out and signed-in access states; suspended/invitation feedback where the fixture supports it; password/security continuation and conditional Admin hierarchy.
- Cross-product: representative Create, Library and Viewer screenshots beside the three Phase 22 surfaces to judge title scale, depth/effect budget, focus semantics and narrow-layout consistency.

Reject a candidate that is technically green but still reads as generic utility/admin UI, as well as one that becomes decorative/noisy, hides status meaning behind motion/color, clips at 390px, or weakens accessibility.

## Documentation outputs
On verified implementation, update:
- `PROJECT.md` and `docs/ui/UI_MIGRATION.md` with exact-head and merged-main evidence;
- `docs/ui/UI_DECISIONS.md` with the accepted Phase 22 visual decision after the design checkpoint is reviewed;
- `docs/ui/UI_SYSTEM.md` for any truly system-wide visual rule/effect-budget change;
- `docs/ui/SCREEN_REGISTRY.md` for verified Activity/Settings/Landing composition/status;
- `docs/ui/COMPONENT_CATALOG.md` only if a reusable component/mechanic is actually adopted;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` only if a verified frontend boundary changes.

Do not update capability/infrastructure/schema docs unless verified reality actually changes those boundaries.

## Exit criteria
Phase 22 is complete only when:
- the required design checkpoint is reviewed before implementation;
- Activity, Settings and Landing visibly belong to Kinetic Precision while preserving their existing product/security semantics;
- the final cross-product desktop/390px/reduced-motion/accessibility/effect-budget audit passes;
- exact final-head minimum/attached workflows and configured cleanup are green;
- human implementation screenshots pass review;
- authoritative repository docs match the verified implementation and merge state;
- merged `main` checks pass after the expected-head guarded merge.

**Cycle 4 closure:** Phase 22 completion closes the Kinetic Visual Experience cycle only after merged-main verification. Production rollout remains a separate explicit operation, and no Phase 23 is implied or pre-authorized by this contract.
'''
project.write_text(text.rstrip() + contract + "\n")

migration = Path("docs/ui/UI_MIGRATION.md")
text = migration.read_text()
old = "- **Phase 22 — Activity, Settings, Landing & System Cohesion:** roadmap only until Phase 21 evidence closes."
if old not in text:
    raise SystemExit("UI_MIGRATION Phase 22 roadmap guard failed")
text = text.replace(old, "- **Phase 22 — Activity, Settings, Landing & System Cohesion:** `CONTRACT READY / DESIGN CHECKPOINT REQUIRED / IMPLEMENTATION NOT STARTED` — expanded from verified Phase 21 merged baseline `c17abfef07fbc580c51f458496e4e53502816229`.", 1)
old_cleanup = "- [ ] Verify exact configured fixture cleanup and update authoritative implementation docs from reality before Phase 21 completion."
if old_cleanup not in text:
    raise SystemExit("UI_MIGRATION Phase 21 cleanup guard failed")
text = text.replace(old_cleanup, "- [x] Verify exact configured fixture cleanup and update authoritative implementation docs from reality before Phase 21 completion. Final clean exact-head Library Lifecycle `34258560488`, Creative Iteration `34258560437`, Image Upscale Integration `34258560340` and their cleanup steps passed before PR #127 merged as `c17abfef07fbc580c51f458496e4e53502816229`; all five merged-main checks then passed and Vercel created no deployment.", 1)
if "## Phase 22 acceptance tracker" in text:
    raise SystemExit("Phase 22 tracker already present")
tracker = r'''

## Phase 22 acceptance tracker
**Status: `CONTRACT READY / DESIGN CHECKPOINT REQUIRED / IMPLEMENTATION NOT STARTED`.** Planning baseline `c17abfef07fbc580c51f458496e4e53502816229`.

- [ ] Create and human-review the required repository-backed desktop/390px Activity + Settings + Landing design checkpoint before implementation.
- [ ] Activity: strengthen truthful lifecycle/status hierarchy while preserving server ordering, pagination, auto-refresh and separate Run Again / Retry / Cancel eligibility.
- [ ] Activity: provide static/reduced-motion equivalents and no fake percentage, ETA, provider stages or queue/SLA claims.
- [ ] Settings: align signed-out, active/suspended/access-status and password/security composition with Kinetic Precision without changing identity/access/admin authorization semantics.
- [ ] Landing: align the public hero/product-preview/CTA composition with current Kinetic Precision while preserving closed-beta truth, `/create` + `/settings` destinations and root continuation redirect behavior.
- [ ] Keep public signup/pricing/testimonial/fake-metric/provider/model/SLA claims absent; no marketing analytics/cookie expansion.
- [ ] Keep Admin internal redesign, new Settings preferences, capability/schema/worker/routing/infrastructure and production deployment out of scope.
- [ ] Run the final Cycle 4 desktop/390px/reduced-motion/accessibility/effect-budget cohesion audit across Landing, Create, Library, Viewer, Activity and Settings.
- [ ] Pass Engineering Quality, UI Shell, Activity Visual, Activity Cancel, Account Identity, Account Ownership, Brand / Launch, affected Creative Iteration/Create/Library/Viewer gates and every workflow actually attached to the exact final head.
- [ ] Verify configured cleanup and human-review final implementation screenshots before marking Phase 22 or Cycle 4 complete.
'''
migration.write_text(text.rstrip() + tracker + "\n")

system = Path("docs/ui/UI_SYSTEM.md")
text = system.read_text()
old = "Cycle 4 Phase 20 applied this elevated interaction-quality bar to Create and is now complete/verified/merged. Phase 21 is the next deliberate feature-level application: Library and Media Viewer become the Kinetic Precision spatial media workspace while preserving mature durable-media, ownership, organization and continuation contracts."
if old not in text:
    raise SystemExit("UI_SYSTEM phase-state guard failed")
new = "Cycle 4 Phase 20 applied this elevated interaction-quality bar to Create and Phase 21 applied it to Library/Media Viewer; both are complete/verified/merged. Phase 22 is the final Cycle 4 application: Activity, Settings and public Landing must reach the same Kinetic Precision quality while preserving their mature lifecycle, account/security and closed-beta routing contracts, followed by a cross-product cohesion audit."
system.write_text(text.replace(old, new, 1))

registry = Path("docs/ui/SCREEN_REGISTRY.md")
text = registry.read_text()
text2 = text.replace("`src/app/activity/page.tsx`", "`src/app/(app)/activity/page.tsx`", 1)
text2 = text2.replace("`src/app/settings/page.tsx`", "`src/app/(app)/settings/page.tsx`", 1)
if text2 == text:
    raise SystemExit("SCREEN_REGISTRY route-group correction guard failed")
registry.write_text(text2)
