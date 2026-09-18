# RenderLab production user audit — 2026-09-17 / closure 2026-09-18

## Verdict

**Production acceptance: PASS WITH CONTROLLED SAFETY EXCLUSIONS.**

The first strict production audit found one material product defect: Activity could remain visually stuck on `RUNNING` after an accepted generation had completed. That P2 finding is now fixed, merged, production-deployed and re-verified through the real custom-domain user path.

Current production serves exact repository source `ae083473e29a0f9e60f49087a33d1c8d0ce95cd1` at READY deployment `dpl_ASvYe7jgaZMBPqsh6weHLEo4mdxT`. Post-fix production journey run `35292334383` successfully completed all four generation operations — Image, Edit, Animate and standalone Video — from live Create through the same mounted Activity surface into durable Viewer media. The run explicitly exercised both 1440px and 390px-class browser geometry and uploaded 26 screenshots. Production session-control run `35293048807` then verified local / other-device / global sign-out behavior with disposable users at desktop and 390px. A read-only AAL2 Admin audit, run `35293115875`, verified the privileged Admin surface at desktop, 390px and reduced motion without submitting any invitation, account, generation-setting or other Admin mutation.

No unresolved P0, P1, P2 or P3 product defect was found in the completed audit scope. The remaining limitations are deliberate safety boundaries rather than hidden passes: the audit did not change a real user's password/email, delete a real account, submit production-global Admin configuration changes, or re-send security mail merely to prove behavior already covered by configured acceptance. Those high-side-effect paths remain backed by the repository's existing exact-fixture security/lifecycle suites and are identified explicitly below.

The screenshot review found no new responsive, hierarchy, overflow, media-rendering or control-reachability defect in the post-fix generation journeys. Native video controls were present in both generated-video Viewer paths; mobile Create and Viewer stayed within the viewport; Activity truthfully exposed Running, Persisting and Completed states; and result/continuation actions remained reachable.

## Production provenance and audit evidence

| Item | Verified value |
| --- | --- |
| Custom domain | `https://renderlab.faresuniform.uk` |
| Current live repository source | `ae083473e29a0f9e60f49087a33d1c8d0ce95cd1` |
| Current production deployment | `dpl_ASvYe7jgaZMBPqsh6weHLEo4mdxT` / `https://renderlab-m9xecmup1-faresmohamed260-6733s-projects.vercel.app` |
| Activity-fix production rollout | GitHub Actions `35292170973`, successful |
| Rollout proof | Exact pristine checkout, READY deployment, explicit custom-domain alias, smoke on root/Create/Library/Activity/Settings/Password/Profile/Preferences, rollback skipped, temporary ops branch removed |
| Original roadmap-complete rollout | `35253785761`, source `c2b7c022cd91167822f75874ef7caf70b0ec264c` |
| Initial production audit | `35258165837`, artifact `10512554453`, `sha256:7a98903c3f476c39830a862783a9a6b55ff6d11662e14482f2668c7a833ff3cc` |
| Defect reproduction run | `35269965598`, artifact `10518743048`, `sha256:608daf18ffc6dd8918736f20f6cf17a68de0545aa425adaac88132f2c07d8561` |
| Configured Activity regression | `35277589256`, artifact `10521626476`, `sha256:c66694a0dd9fd1aeca2a965f80106c07e4cc1cd2344da851c2e6cbf1dd0da8d5` |
| Post-fix complete production journey | `35292334383`, successful |
| Complete-journey artifact | `10527172224`, `sha256:27bbadc26b65ac63c59bb01284187544401512108a57ed5dc2a1a330e5bd6d8c` |
| Production Sessions audit | `35293048807`, successful |
| Sessions artifact | `10526537902`, `sha256:c5fa47e6cfa9d9786ad3b69b27347bd48f566e4c13da781725250d1977ceeb2a` |
| Production AAL2 Admin read-only audit | `35293115875`, successful |
| Admin raw artifact | `10526138600`, `sha256:de5839764e8a56ca973b1b679b5b00fe4c63ce55fa270c9a8532ec66ea2a1431` — restricted because the raw Admin directory naturally contains admitted-account identifiers |
| Post-cutover Vercel health | No grouped runtime-error clusters and no warning/error/fatal logs in the inspected post-rollout window |
| Fixture residue after audit | 0 matching production-audit Auth users, 0 matching account-access rows, 0 `QA journey %` generation jobs |

## Method and safety boundary

The audit was conducted from the user-facing custom domain rather than a local build or Vercel preview. It combined public signed-out inspection, authenticated disposable-account browser sessions, real production generation/provider work, real session semantics, and a disposable TOTP/AAL2 administrator.

Run-owned fixtures were deliberately isolated from real accounts and cleaned after each workflow. Provider-backed generations were allowed to finish naturally; worker-backed work was not cancelled to save time. Browser evidence was reviewed manually after the automated assertions passed.

The following actions were intentionally **not** repeated against real user state:

- changing the owner's production password or sign-in email;
- revoking the owner's real sessions;
- deleting or exporting the owner's real account;
- sending fresh real security email merely for audit completeness;
- deleting/renaming/favoriting real media;
- firing Retry / Run Again / Cancel against real history;
- changing Admin access, invitations, account overrides or global generation limits.

These exclusions do not turn those paths into assumed passes. Their product presentation was inspected where safe, and the repository's configured security/lifecycle acceptance remains the evidence for destructive semantics. Issue #278 tracks the remaining work to make more of this production audit permanently repeatable with exact run-owned fixtures.

## Severity scale

| Severity | Meaning |
| --- | --- |
| P0 | Production unavailable, broad data loss, or critical security compromise |
| P1 | Core journey blocked or severe integrity/security failure |
| P2 | Major feature degradation with a workaround |
| P3 | Localized functional, accessibility or responsive defect |
| P4 | Documentation, polish, or QA-depth issue without current user harm |

## Findings

### RLQA-001 — Production pointer drift in repository documentation

- **Severity:** P4
- **Status:** corrected; release-governance prevention remains in QA roadmap #278
- **Observed:** after the first 2026-09-17 rollout, several authoritative current-production blocks still named the superseded 2026-09-15 source.
- **Impact:** no runtime impact, but a fresh session could make a wrong deployment or audit decision from stale handoff data.
- **Correction:** PR #277 synchronized the first 2026-09-17 rollout. This closure synchronizes the later Activity-fix rollout and audit completion.
- **Prevention target:** QA-001 requires release closure to detect disagreement between Vercel exact source and PROJECT/UI Migration/Screen Registry/Infrastructure.

### RLQA-002 — Activity failed to refresh completed generation to terminal result

- **Severity:** P2
- **Status:** **RESOLVED / MERGED / DEPLOYED / PRODUCTION-REVERIFIED**
- **Original production source:** `c2b7c022cd91167822f75874ef7caf70b0ec264c`
- **Reproduction:** submit a valid Image from Create, open Activity and leave the page mounted. Run `35269965598` observed the row remain `RUNNING` for the full 30-minute audit bound although provider work completed.
- **Root cause:** `src/features/activity/activity-auto-refresh.tsx` scheduled one timeout. After the first server refresh returned with active work still present, the mounted effect retained the same dependency state and never scheduled a subsequent refresh.
- **Fix:** active-only recurring five-second refresh while server truth says nonterminal work exists.
- **Configured proof:** Activity Visual `35277589256` terminalized a fixture after the first refresh and required the same mounted page to observe a later terminal transition.
- **Deployment proof:** rollout `35292170973` deployed exact merged-main source `ae083473e29a0f9e60f49087a33d1c8d0ce95cd1`.
- **Production proof:** run `35292334383` observed four real production jobs reach `succeeded` from the mounted Activity path: Image, Edit, Animate and standalone Video. Animate and standalone Video also exposed the truthful intermediate `persisting` state before `succeeded`.
- **Result discovery:** all four successful jobs exposed Viewer media; generated images rendered actual pixels and generated videos exposed playable native video with controls.
- **Cleanup:** complete-journey cleanup passed and direct post-run inspection found zero remaining QA jobs / audit fixture users / access rows.

No further Activity-refresh defect was observed after deployment.

## Whole-product coverage matrix

| Area | Desktop | 390px / narrow | Final audit result |
| --- | --- | --- | --- |
| Landing and navigation | Public live walkthrough | 390px + reduced-motion evidence | **Pass.** Public/application boundary, Closed Beta truth, links and fixed shell behavior remain coherent; no horizontal overflow observed. |
| Signed-out access | Settings sign-in, Create gating, Library/Activity private states | 390px Settings/Create | **Pass.** No false public-signup path; private actions gate truthfully; focus remains visible. |
| Create — Image | Real provider-backed production submission | Mobile result/Viewer proof | **Pass.** Live job progressed through Activity to durable Viewer after the fix. |
| Create — Edit | Continuation from generated Image | Edit submitted from 390px Create | **Pass.** Durable primary image remained attached; live Edit succeeded and Viewer rendered the edited result. |
| Create — Animate | Continuation from generated Image | Mobile generated-video Viewer | **Pass.** Live Animate progressed Running → Persisting → Completed and produced playable durable video. |
| Create — standalone Video | Desktop result inspection | Submitted from 390px Create | **Pass.** Live Video progressed through Activity to playable Viewer media. |
| Create references | Real durable upload/drop, aliases, reorder and limits from initial audit | Narrow source layout | **Pass.** Count/role constraints and stable aliases remained correct; exact cleanup passed. |
| Library browse/search/filter | Run-owned uploads and ordinary browsing | Narrow controls/list/grid | **Pass.** Source/type/search/sort/selection behavior remained coherent; no new regression found. |
| Viewer | Generated Image/Edit/Animate/Video plus fixture media | 390px generated image/video Viewer | **Pass.** Media rendered, native video controls were present, continuation controls remained reachable, no horizontal overflow observed. |
| Activity / history | Real production jobs observed live | Mobile Activity states included in generation run | **Pass for lifecycle refresh.** Running/Persisting/Completed truth advanced without manual reload. Retry/Run Again/Cancel against real history remains intentionally excluded; configured fixture coverage remains authoritative. |
| Profile | Live route and initial controlled fixture UX | 390px/reduced-motion crop evidence | **Pass.** Display identity remains separate from sign-in/access/ownership. |
| Password and sign-in email | Production forms inspected | Narrow credential surfaces | **Pass for user-facing presentation and policy.** Real credential/email mutations were not repeated because they revoke sessions/send mail; configured security acceptance remains authoritative. |
| Sessions | Disposable users with multiple live sessions | Real production 390px Settings | **Pass.** Local, other-device and global sign-out semantics succeeded; mobile actions met the 44px target check and no overflow was detected. |
| MFA / step-up | Disposable TOTP fixture obtained AAL2 | Reduced-motion/mobile Admin entry proof | **Pass for assurance boundary.** AAL1 Admin fails closed; AAL2 fixture gained privileged entry. MFA enrollment UI remains covered by configured suite rather than repeated as a live mailbox/account operation. |
| Data & Privacy | Export/delete presentation inspected | Same Settings family at 390px | **Pass for presentation; destructive execution intentionally controlled.** Existing #219 configured lifecycle acceptance remains the destructive-semantics authority. |
| Preferences | Production default state + prior save/read/reset/precedence fixture | 390px reduced motion | **Pass.** Create defaults remain subordinate to recipe/continuation capability truth. |
| Admin | AAL2 run-owned Admin opened live production | 390px + reduced motion | **Pass read-only.** Access / Generation / Health all rendered with no overflow. No invitation/access/global-setting mutation was submitted. |
| Keyboard/focus | Signed-out + authenticated flows | Narrow visible focus | **Pass.** Essential controls remain keyboard reachable and focus-visible. |
| Reduced motion | Existing production fixture evidence + live Admin reduced-motion audit | 390px | **Pass.** Functional content survives without motion dependency. |
| Empty/loading/error states | Signed-out empties, generation active states, failed-history fixtures | Narrow equivalents | **Pass in audited states.** No indefinite generic loading state observed. |
| Production runtime | Vercel smoke + live browser journeys | Same origin | **Pass in audit window.** No grouped runtime errors and no warning/error/fatal logs observed after the fixed deployment. |

## Real production generation journey results

Production journey run `35292334383` intentionally used four different user paths and viewport contexts:

| Journey | Submission context | Activity evidence | Viewer evidence |
| --- | --- | --- | --- |
| Image | Desktop 1440 | Running → Completed | Desktop + 390px generated image |
| Edit | 390px continuation from generated Image | Running → Completed | Desktop + 390px edited image |
| Animate | Desktop continuation from generated Image | Running → Persisting → Completed | Desktop + 390px generated video with native controls |
| Standalone Video | 390px Video Create | Running → Persisting → Completed | Desktop + 390px generated video with native controls |

The workflow completed in one browser-owned sequence and did not use manual reload as a recovery mechanism.

## Representative screenshot evidence

### Image result reached terminal Activity

![Post-fix production Image shown as completed in Activity](evidence/postfix-image-activity-complete.webp)

### Generated Image Viewer on mobile

![Post-fix generated Image Viewer at 390px](evidence/postfix-image-viewer-mobile.webp)

### Edit submitted from mobile Create

![Production Edit generation active on the 390px Create surface](evidence/postfix-edit-mobile-active.webp)

### Animate result in desktop Viewer

![Production Animate output in the desktop Viewer with native video controls](evidence/postfix-animate-viewer-desktop.webp)

### Standalone Video result on mobile

![Production standalone Video output in the 390px Viewer](evidence/postfix-video-viewer-mobile.webp)

### Real production session controls

![Run-owned production session inventory and sign-out controls at 390px](evidence/production-sessions-mobile.webp)

### AAL2 Admin — privacy-safe evidence

The raw Admin artifact contains the legitimate admitted-account directory and is therefore not embedded in repository documentation. The committed excerpts intentionally omit the account-list/override identity regions while preserving the live privileged screen, Access entry, Health field and responsive composition.

![Privacy-safe desktop excerpt from the live AAL2 Admin audit](evidence/production-admin-aal2-desktop-privacy-safe.webp)

![Privacy-safe mobile excerpt from the live AAL2 Admin audit](evidence/production-admin-aal2-mobile-privacy-safe.webp)

The initial audit's earlier screenshots remain in this directory as historical evidence of signed-out states, Library/Viewer/Profile/Preferences behavior and the reproduced pre-fix Activity defect.

## Visual and UX judgement

The post-fix generation evidence is visually coherent with the approved Lab Matrix / Clear Composer / Trust Register system. The largest mobile prompts make Activity intentionally dense, but they remain contained and readable with actions below them; no horizontal clipping or inaccessible off-canvas action was observed. Generated media remains the dominant Viewer object. Edit/Animate/Reuse controls read as continuation rather than a second navigation system.

The 390px Create composer preserves its essential mode/settings/generation controls without horizontal overflow. The mobile Viewer keeps media first and continuation actions below the result. Video uses the browser's real playback controls rather than decorative controls. The Admin mobile surface is long and information-dense by nature, but it preserves document order and no horizontal overflow was detected.

No new P3 visual/accessibility defect is opened from this evidence.

## Cleanup and data-integrity result

Every mutating production audit workflow used deterministic run-owned identities and unconditional cleanup.

- complete generation journey cleanup passed; four durable media assets and their owned R2/DB state were removed;
- session-control verifier deleted both disposable users after local/other/global sign-out verification;
- AAL2 Admin verifier deleted its TOTP-enabled Admin fixture;
- direct post-audit shared-project inspection returned **0 audit fixture Auth users, 0 audit access rows and 0 QA journey jobs**;
- no global generation singleton, real invitation, real account access row, hosted Auth configuration or real-user content was changed.

## Controlled exclusions and residual risk

A production audit should not create user harm merely to maximize checkbox coverage. Therefore this acceptance does not claim that irreversible/external-delivery paths were re-executed against the owner's real account.

The following rely on exact configured acceptance plus production presentation rather than fresh destructive live submission:

- password replacement and its other-session revocation behavior;
- sign-in email change and the two-mailbox confirmation/security-mail sequence;
- account export expiry/maintenance details beyond presentation;
- permanent account deletion and its R2/Auth/provider cleanup chain;
- invitation delivery;
- Admin access/status/global generation setting writes;
- Activity Retry/Run Again/Cancel against real history.

These are the principal residual QA-depth items, not observed production defects.

## Next QA roadmap — issue #278

The production audit itself is now complete. The next work is to make this level of testing routine rather than ad hoc.

### QA-001 — Release-record synchronization

Require every guarded production rollout to reconcile PROJECT, UI Migration, Screen Registry and Infrastructure to the exact live deployment/source after cutover.

### QA-002 — Permanent production user journey

The manually dispatchable `production-complete-user-journey.yml` is now in the repository and run `35292334383` proved its production fixture/cleanup model. The next refinement is a source/domain manifest and a normal operator-dispatch path that does not require a temporary trigger branch in tool-constrained sessions.

### QA-003 — Fixture-safe mutation and privileged visual coverage

A temporary AAL2 Admin production audit proved the security/read-only pattern. Productize that pattern without exposing directory PII in artifacts, and add fixture-owned Retry/Run Again/Cancel production coverage that cannot spend provider work against real history or mutate global settings.

Issue #278 remains the roadmap tracker. None of these QA-institutionalization tasks authorizes unrelated product redesign, hosted Auth changes or global production mutations.

## Final judgement

RenderLab's roadmap-complete application plus the Activity refresh correction is now production-live and the audited core user experience passes. The initial P2 finding was real and correctly blocked acceptance; after its fix and guarded rollout, the exact same class of real production journey passed across Image, Edit, Animate and Video with durable result discovery and responsive Viewer evidence. Sessions and AAL2 Admin were additionally re-audited with run-owned production fixtures.

The appropriate current status is therefore **PASS WITH CONTROLLED SAFETY EXCLUSIONS**, with no unresolved P0–P3 finding from the completed audit and issue #278 carrying the next QA-institutionalization work.
