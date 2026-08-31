# Project

RenderLab is an AI image/video creation platform using cloud-hosted ComfyUI workflows as the generation backend.

## Product Direction
RenderLab is a fresh application, not a direct migration or visual clone of the previous Studio implementation in `saga`.

Saga is reference material for proven behavior, backend integration, workflow capability, persistence, job lifecycle and lessons learned. Its UI, navigation, component hierarchy, routing, deployed runtime and legacy tables are not the RenderLab specification.

## Product UX Principle
**Simple by default, powerful when needed.**

Users interact with understandable creative goals rather than ComfyUI graphs, worker routing or storage implementation. Advanced/model-specific controls are progressively disclosed only when useful.

## Stack
### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui Radix Nova + `radix-ui` through the approved maintained component ecosystem
- Motion for React `13.1.1` for feature-local, reduced-motion-aware interaction continuity
- RenderLab-owned normalized primitive layer under `src/components/ui`
- Server Components by default; Client Components for interactive feature behavior

### Infrastructure
- Vercel deployment target
- Cloudflare R2
- Supabase
- existing cloud-hosted ComfyUI/Modal worker fleet

RenderLab deliberately reuses Saga/Studio infrastructure resources while keeping RenderLab schema, storage prefixes, orchestration, APIs and product contracts independently named and owned. See `docs/architecture/INFRASTRUCTURE.md`.

## Product Architecture Direction
Generation is modeled as:

`Workflow → Inputs → Parameters → Generation Job → Outputs → Continuation Actions`

Generation inputs and media actions use opaque product identities. R2 storage keys, provider IDs and worker routing remain server-side implementation details.

## Product Areas
Public:
- **Brand / Landing** `/`

Primary application:
- **Create** `/create`
- **Library** `/library`

Contextual/utility:
- **Media Viewer** `/library/[assetId]`
- **Activity** `/activity`
- **Settings** `/settings`

Image, Video, Edit, Animate, Models and Workflows are not separate top-level destinations by default.

## Current Priority
**Cycle 2 — Creative Productivity & Beta Maturity remains `COMPLETE / VERIFIED`. Cycle 3 — Beta Operations & Access Reliability is `IN PROGRESS`: Phase 13 — Email & Invite Production Hardening is `IN PROGRESS`, with 13A read-only audit and 13B sender/delivery configuration both `COMPLETE / VERIFIED`; 13C branded template/link hardening is `BLOCKED` on the verified Brevo Free-plan link-rewriting constraint pending an operator provider/plan decision. Production application code remains the accepted Closed-Beta candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`. Phase 13B changed only Brevo/Cloudflare/Supabase Auth email configuration; it created no Vercel deployment and sent no real invite/recovery email.**

### Cycle 2 objective
Move RenderLab from a solid functional MVP into a product that supports repeated serious creative work: richer reference-driven creation, durable reusable inputs, clearer task-oriented controls, useful job recovery, closed-beta operations, and a premium modern creative experience without exposing ComfyUI/provider complexity to ordinary users.

Cycle 2 continues the existing phase numbering, with the post-Phase-6 roadmap revised from direct production feedback:
- **Phase 6 — Cycle 2 Baseline & Production Hardening: COMPLETE.** Production/custom-domain/account/storage/generation capability was reverified and **Closed Beta** selected as the operating boundary.
- **Phase 7 — Create v2 / Creative Direction: COMPLETE / VERIFIED.** **7A Create Foundation** de-crowds the composer, adds source-aware `Original` geometry and curated ratios, makes Create-originated uploads durable Library assets, establishes stable reference identity/order/roles and completes the premium interaction/motion pass. **7B Multi-reference Image Editing** implements the bounded two-Image/one-Video reference product contract with prompt addressing and audited FLUX/Qwen behavior. **7C Director Video** completed the deployed REDGraft audit and deliberately deferred productization because structured Director fields are absent. **7D Video Resolution** is complete under UI-048 with exact 480p/720p/1080p/2K Resolution choices, 480p default, hidden/rejected 4K, canonical persisted `output.resolution`, and inactive Video Steps/Guidance removed/rejected while Image tuning remains unchanged.
- **Phase 8 — Library v2 / Media Workflow Productivity: COMPLETE / VERIFIED.** UI-049 completed both ordered slices. **8A Collection Management** remains verified at exact code/test head `34f9573eaabff6a91c780266ff03fedc9058df56`. **8B Page-scoped Batch Organization** is verified at exact implementation head `e460a7e9e805ac9eb214277eb495adddd3c50f38`: the existing UI-034 current-page selection model now exposes one non-destructive Organize disclosure with explicit Favorite/Unfavorite and Add/Remove Collection target-state actions, bounded owner-scoped 1–24-item APIs, best-effort per-item outcomes and active-filter selection reconciliation. Uploaded and generated media use the same organization path. Phase 8 introduced no schema migration, cross-page selection, Trash/restore, Collections destination, global media client store or deployment.
- **Phase 9 — Activity v2 / Recovery & Job Control: COMPLETE / VERIFIED.** UI-050 failed-job **Retry v0.1** is implemented as owner-scoped `POST /api/generation/jobs/[jobId]/retry`. The server reconstructs only persisted product intent, applies bounded legacy compatibility, current-revalidates capability and inputs, then submits a distinct ordinary job while leaving the historical row immutable. Active/succeeded/cancelled jobs remain non-retryable; Cancel remains deferred because cancellation-safe atomic guards are still absent; no shell-global polling/badge was added. Exact code/test head `ab33e146ccaa7770f3dd66146708f01933cc0173` passed UI Shell `33279062584`, Activity `33279062575`, Account Ownership `33279062570`, Media Delete `33279062563`, Create Lifecycle `33279062581`, Generation Integration `33279062568`, and Video Generation Integration `33279062569`. Final Activity artifact `9722428767` (`sha256:65490c380fe35d5b6a186596cafa1d0706d181c6c827748aaaf8a9dc99e8dcbe`) was reviewed clean after a narrow success-feedback flex defect was found and fixed. Exact fixtures and cleanup-only verification passed; no schema migration or deployment occurred.
- **Phase 10 — Account, Admin & Closed-Beta Operations: COMPLETE / VERIFIED under UI-051.** **10A Account Recovery & Closed-Beta Admission**, **10B Privileged Admin & Access Control**, and **10C Atomic Generation Admission Guardrails are COMPLETE / VERIFIED**. 10C exact code/test head `ca8e426066385934b296b6d4f88324e9c12861f7` passed the complete 22-workflow affected matrix; migration `20260830101734 renderlab_generation_admission` is applied/audited; Create and Activity Retry share one transactional pre-backend admission boundary with default one-active / 12-per-rolling-hour policy, bounded account overrides and fresh-admin global defaults. Production closed-beta enforcement was deliberately kept off through Phase 10 and was enabled only after the Phase 12B known-account bootstrap and Auth redirect gate passed; it is now active on the accepted Closed-Beta production deployment. **10D Auth/Operational Hardening is COMPLETE / VERIFIED**: private product authorization now re-confirms current Supabase Auth session state before trusting identity, while the root proxy retains `getClaims()` only for SSR cookie/signature maintenance. Phase 13B has since replaced the hosted built-in email/rate-limit posture with verified Brevo custom SMTP; Free-plan leaked-password protection remains the separate broader-beta blocker. No deployment was performed or authorized.
- **Phase 11 — Brand & Launch Experience: COMPLETE / VERIFIED under UI-052.** PR #73 merged as `46c5daa2866c6758907ee9be219bcb3cb274ca83`. Final exact PR head `773251734dbd5c5f32770699a57b1ade653604b5` passed 19/19 affected workflows; Brand / Launch artifact `9734984885` (`sha256:8d9929fb5f6d85da4710184ec7bbe756f782593f58525ec2ae660729ad3b32a9`) was human-reviewed clean; merged-main UI Shell `33323421285` passed; live Supabase fixture residue audit returned zero across Auth/access/generation/admission/media/upload/invitation fixtures. No deployment occurred or is authorized.
- **Phase 12 — Cycle 2 Release Validation: COMPLETE / VERIFIED.** Exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` was deployed cleanly as READY production deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2` with `gitDirty=0`. Supabase Auth Site URL + exact invite/recovery redirects were corrected and no-email verified; Closed-Beta enforcement is active; custom-domain public/private media, durable upload/reuse, bounded Create Image, Activity Retry, Create Video and production-specific Admin checks passed; final Auth/data/admission/invitation residue is zero and generation defaults are restored to enabled / 1 active / 12 hourly / no updater. Cycle 2 is complete under the Closed-Beta operating boundary.

### Phase planning protocol
Cycle roadmaps are directional. Before each phase starts, the immediate next phase must be expanded into an execution-ready contract from current repository, production and capability evidence. Later phases remain at roadmap level until their predecessors are complete unless an early cross-phase decision is required to avoid rework.

Each phase contract covers goal, user value, verified starting state, in/out of scope, affected architecture/contracts, required UI/UX decisions, backend/infrastructure dependencies, data/schema and security/ownership implications, validation and responsive review, documentation outputs, exit criteria and next-phase dependencies. The contract is merged before phase execution. Accepting or expanding a phase does not mark it started or complete and does not authorize deployment.

### Cycle 2 scope boundary
Cycle 2 now explicitly includes Create v2 reference/geometry/composer work, verified Director-video productization, curated Video resolution, Library/Activity productivity, privileged closed-beta admin operations, and brand/launch work. It still does **not** approve generic Models or Workflows screens, ComfyUI graph editing, ordinary-user provider/worker management, arbitrary workflow-parameter forms, inpainting/outpainting, structural guidance, workflow chaining, a full billing system, a global media client store or a cross-page selection framework without separate evidence/decisions.


### Cycle 3 — Beta Operations & Access Reliability
**Status: `IN PROGRESS`.** Cycle 2 remains complete. Phase 13 is the active Cycle 3 phase; later Cycle 3 work remains undefined until Phase 13 evidence justifies it.

- **Phase 13 — Email & Invite Production Hardening: `IN PROGRESS`.** 13A read-only audit and 13B sender/delivery configuration are `COMPLETE / VERIFIED`. Brevo custom SMTP is now authenticated on `mail.renderlab.faresuniform.uk`, Supabase Auth uses `RenderLab <noreply@mail.renderlab.faresuniform.uk>` at a bounded 30 emails/hour, and 13C exact branded invite/recovery template + link hardening is `BLOCKED`: the current Brevo Free account cannot satisfy the accepted no-rewrite Auth-link contract. Real mailbox acceptance remains 13D and must not start until 13C clears.

### Phase 13 execution contract — Email & Invite Production Hardening
**Status: `IN PROGRESS`. 13A and 13B are `COMPLETE / VERIFIED`; 13C preflight is `BLOCKED` on the verified Brevo Free-plan transactional link-rewriting constraint. The provider/DNS/Auth production changes required by 13B were explicitly authorized and have been applied/verified. Do not install token-bearing invite/recovery templates, send real Auth email, switch providers, purchase/upgrade a plan, change application code or deploy until the operator selects the smallest acceptable resolution.**

**Goal / user value**
- Make an admin-issued RenderLab invite reliably reach a real recipient, complete on `renderlab.faresuniform.uk`, claim the intended invitation and yield only the access state the admin granted.
- Make password recovery reliably reach an existing RenderLab user and complete through the verified SSR token-hash flow without localhost fallback, open redirects, link rewriting or stale-session bypass.
- Give the operator a supportable email posture: known sender identity, authenticated DNS, documented rate limits, provider delivery/bounce visibility and bounded credentials instead of relying on Supabase's built-in Auth mailer.

**Verified starting state**
- Cycle 2 production is accepted at application SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42` / READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; Closed-Beta enforcement is active and automatic Git → Vercel deployment remains disabled.
- Admin invitation creation/revocation, RenderLab invitation records, member/admin access transitions, suspension/reactivation, no-public-sign-up behavior and password-recovery completion are already implemented and configured-test verified. Phase 13 must harden delivery rather than invent a second admission system.
- Hosted Supabase Auth Site URL is `https://renderlab.faresuniform.uk`; exact production redirects for `/settings` and `/auth/confirm?type=recovery&next=/settings/password` were corrected and no-email generate-link verified during Phase 12B.
- Phase 10D live evidence showed the project using Supabase's built-in Auth sender `noreply@mail.app.supabase.io` and then hitting `429 over_email_send_rate_limit`; that posture was explicitly accepted only for Closed-Beta technical validation, not external-user deliverability.
- Regular CI intentionally does not depend on real email delivery. Deterministic Auth/link/security tests must remain provider-cheap and self-cleaning; live inbox tests belong to a bounded operator-gated acceptance run.
- Free-plan leaked-password protection remains a separate broader-beta security limitation. Phase 13 must not claim to solve it through email work.

**In scope**
1. **Read-only production email/Auth baseline.** Audit current Supabase Auth mail configuration, Site URL/redirect allowlist, invite/recovery template bodies, SMTP or Send Email Auth Hook state, sender/from identity, Auth email rate limits and any retained Management API credential requirement before changing anything. Record facts, not assumptions.
2. **Delivery architecture decision.** Choose one production transactional path: Supabase custom SMTP backed by a transactional provider, or an equivalent Supabase Send Email Auth Hook when an API-based provider integration is materially better. Provider selection, account creation/paid-plan acceptance and sender address remain explicit operator decisions; do not silently enroll or purchase a service.
3. **Sender-domain authentication.** Use a dedicated RenderLab transactional sender identity under `faresuniform.uk` (exact local-part/subdomain chosen during implementation). Add only provider-required DNS records through the existing Cloudflare zone, preserving unrelated records. Maintain one valid SPF policy, install provider DKIM, and establish DMARC with an explicit policy/aggregate-reporting decision. Verify public DNS and provider authentication state before live acceptance.
4. **Exact invite/recovery templates.** Keep the existing SSR token-hash contract and no-public-sign-up boundary. Production templates must resolve through `{{ .SiteURL }}` and `/auth/confirm`, with invite using `token_hash={{ .TokenHash }}&type=invite&next=/settings` and recovery using `token_hash={{ .TokenHash }}&type=recovery&next=/settings/password`. Do not substitute raw provider confirmation URLs or a client-only token flow.
5. **Transactional message quality.** Give invite and recovery mail concise RenderLab-branded subjects/body copy, a visible reason the recipient is receiving the message, the intended action, expiry/security guidance where supported, and a plain fallback URL. Avoid marketing content, tracking pixels and unrelated product claims in authentication mail.
6. **Link integrity.** Disable provider click/link tracking or any feature that rewrites authentication URLs. Preserve HTTPS custom-domain destinations, token integrity and existing same-origin/hostile-`next` protections.
7. **Rate limits and abuse posture.** Set/document suitable Supabase Auth email limits for a small invitation-only beta and the chosen provider's sending constraints. Admin invites remain privileged; recovery remains enumeration-safe. Do not add public resend/sign-up mechanics merely to consume the new mail capacity.
8. **Delivery observability.** Establish a bounded operator path to inspect accepted/delivered/bounced/complained events without exposing message bodies, tokens or provider credentials through RenderLab Admin responses or repository logs.
9. **Live end-to-end acceptance.** Use run-owned/test recipients supplied or controlled by the operator. Prove at least two independent mailbox providers where practical (prefer Gmail + Outlook or equivalent): real invite receipt → RenderLab confirmation → intended active access; real recovery receipt → password replacement → intended current-session/stale-session behavior; consumed/revoked/invalid links fail closed. Check Inbox/Spam placement and provider delivery events rather than treating API acceptance as delivery.
10. **Cleanup and credential hygiene.** Remove all run-owned Auth/access/invitation fixtures after acceptance, restore generation defaults, and verify no foreign-owner residue. Keep provider/SMTP/API credentials only in approved secret stores. Review whether the Supabase Management API token used for bounded configuration should remain, be narrowed/rotated, or be removed after the phase; never document secret values.

**Out of scope**
- Public sign-up, waitlist/product-led onboarding, marketing/newsletter mail, invitations to arbitrary shared-Supabase users, MFA/CAPTCHA, billing, account deletion, social login or a general notification system.
- A redesign of Landing, Settings or Admin. Existing UI-051/UI-052 account/admin/launch contracts remain authoritative; only the smallest copy/error-state correction is allowed if live email evidence exposes a concrete product defect.
- Fixing Free-plan leaked-password protection, purchasing a broader Supabase plan solely for that warning, or treating unrelated Security Advisor INFO as Phase 13 work.
- Provider/worker/generation changes, R2 changes, schema migrations or a Vercel application deployment unless a verified email-flow product defect requires the smallest code fix. Any code fix creates a new exact candidate and must run its affected validation before deployment.

**Implementation sequence**
- **13A — Audit & operator decisions:** read-only configuration/DNS audit; choose provider/delivery mechanism, sender identity, DMARC posture and live-test inbox set; identify required credentials/costs before mutation.
- **13B — Sender & delivery configuration:** authenticate DNS, configure provider + Supabase SMTP/Send Email Hook, set sender/from/reply posture, set bounded Auth email limits and verify management read-back.
- **13C — Template & link hardening:** install/review exact invite/recovery token-hash templates, disable link rewriting/tracking and re-run deterministic generate-link/negative security verification without real sends.
- **13D — Live delivery acceptance:** send bounded real invite/recovery messages, complete browser flows on `renderlab.faresuniform.uk`, inspect delivery/bounce events, clean fixtures, re-audit production state and record exact evidence.

**Validation / acceptance evidence**
- Read-back of the actual Supabase Auth mail/template/rate-limit configuration without exposing credentials.
- Public DNS proof for the exact provider-required SPF/DKIM/DMARC records and provider-side sender/domain verification.
- Deterministic CI or one-off remote verification that token-hash invite/recovery links preserve `renderlab.faresuniform.uk`, reject hostile redirects, reject consumed/invalid/revoked tokens and leave public sign-up unavailable; regular CI continues to avoid actual email delivery.
- Bounded live mailbox evidence for invite and recovery, including delivered/received state and successful browser completion on the production custom domain. Do not commit recipient addresses, auth tokens or raw provider logs containing sensitive values.
- Final Supabase audit: no run-owned Auth/access/invitation/admission/media/generation residue; sole persistent admin unchanged; generation defaults restored to enabled / 1 active / 12 hourly / no updater.
- If application code changes, affected repository gates and responsive review must pass on one exact candidate before any Vercel deployment. If configuration-only, no Vercel deployment is required.

**Exit criteria**
- Production Auth no longer depends on the built-in `noreply@mail.app.supabase.io` delivery posture for RenderLab invite/recovery mail.
- One documented production sender identity is authenticated and verified; SPF is valid, DKIM passes and DMARC posture is explicitly recorded.
- Invite and recovery templates use the accepted RenderLab SSR token-hash confirmation paths, preserve exact custom-domain redirects and are not rewritten by click tracking.
- Actual Supabase/provider mail limits are documented and suitable for the invitation-only beta; admin invite and recovery abuse boundaries remain intact.
- At least one full real invite lifecycle and one full real recovery lifecycle complete from delivered external email on `renderlab.faresuniform.uk`; delivery evidence covers at least two mailbox providers where practical or records the exact operator limitation if not available.
- Bounce/delivery inspection is operational, test fixtures are removed, privileged credentials are stored/narrowed appropriately, and authoritative docs record provider, sender/domain posture, exact configuration evidence and any deferred broader-beta work.
- Only after all exit criteria are verified may Phase 13 be marked `COMPLETE / VERIFIED`. The planning PR itself does not satisfy or authorize these criteria.



### Phase 13A audit evidence — verified 2026-08-31
Phase 13 implementation is now `IN PROGRESS`. 13A completed as a read-only production audit; it sent no email and changed no Supabase Auth, Cloudflare DNS, Vercel or application state.

- Read-only GitHub Actions runs `33341207071` and `33341263450` used the existing `SUPABASE_ACCESS_TOKEN` and Cloudflare zone-DNS credential only for GET/read operations. Both passed; the temporary audit workflow was removed after evidence capture and is not intended for `main`.
- Hosted Supabase Auth is correctly anchored to `https://renderlab.faresuniform.uk`; the allowlist still contains exact `/settings` invite and `/auth/confirm?type=recovery&next=/settings/password` recovery destinations. Email auth is enabled, autoconfirm remains off and Closed-Beta admission behavior is unchanged.
- Production mail is still the built-in Supabase path: custom SMTP is not configured, Send Email Auth Hook is disabled, sender/from fields are unset and `rate_limit_email_sent=2` per hour.
- Invite and recovery remain the Supabase default subjects/templates and still use `{{ .ConfirmationURL }}`. They have not yet been replaced with the accepted RenderLab SSR token-hash `/auth/confirm` links.
- `faresuniform.uk` already has an existing Brevo footprint: Brevo verification TXT, `brevo1` + `brevo2` DKIM CNAME selectors and DMARC aggregate reporting to Brevo. Apex mail receiving remains Cloudflare Email Routing with one SPF record `v=spf1 include:_spf.mx.cloudflare.net ~all`. `auth.faresuniform.uk` is already a proxied Cloudflare Tunnel hostname and must not be repurposed as the mail-sending subdomain.
- Current official Brevo material confirms SMTP relay support for transactional mail and a Free tier with 300 sends/day. Reusing the existing Brevo domain footprint through Supabase custom SMTP is therefore the recommended lowest-drift 13B path for the small Closed Beta, but the repository does not claim a Brevo account/SMTP credential is available until the operator explicitly confirms/provisions it.

**13A result:** `COMPLETE / VERIFIED`. **13B sender-domain decision — accepted 2026-08-31:** keep the web application at `renderlab.faresuniform.uk`, isolate RenderLab transactional mail on `mail.renderlab.faresuniform.uk`, and use `RenderLab <noreply@mail.renderlab.faresuniform.uk>` as the default production From identity. User-facing email design remains the accepted professional responsive RenderLab HTML contract under UI-053. **13B provider decision:** Brevo custom SMTP is the approved production transactional-delivery path.

### Phase 13B sender & delivery configuration — COMPLETE / VERIFIED 2026-08-31
- Dedicated `BREVO_API_KEY`, `BREVO_SMTP_LOGIN` and `BREVO_SMTP_KEY` are stored as GitHub repository secrets; Brevo API authentication and SMTP STARTTLS login succeeded without sending a message. The existing Brevo Master Password was not used for the RenderLab configuration.
- Brevo sender domain `mail.renderlab.faresuniform.uk` is provider-verified and authenticated. Final Cloudflare sender DNS contains the two Brevo DKIM CNAME selectors plus Brevo verification TXT at `mail.renderlab.faresuniform.uk` and DMARC TXT at `_dmarc.mail.renderlab.faresuniform.uk`; Brevo reports all four checks passing. Brevo shared-IP authentication did not require a new SPF/MX record, so the existing apex Cloudflare Email Routing MX/SPF posture, Vercel `renderlab.faresuniform.uk` CNAME, Cloudflare Tunnel `auth.faresuniform.uk` and unrelated DNS were preserved.
- A first normalization attempt created two run-owned duplicated TXT names below `mail.renderlab`; corrected run `33399495588` removed exactly those two malformed records, installed the intended TXT names and verified public resolution. Final accepted DNS has no duplicated malformed Phase 13B TXT residue.
- Brevo sender `RenderLab <noreply@mail.renderlab.faresuniform.uk>` is active, and SMTP accepted that envelope sender after authenticated STARTTLS; the verifier issued no recipient/data commands and sent no message.
- Supabase-only run `33399659584` completed successfully after matching the current Management API `smtp_port` string shape. Hosted Auth now reads back `smtp-relay.brevo.com:587`, sender name `RenderLab`, From `noreply@mail.renderlab.faresuniform.uk`, and `rate_limit_email_sent=30`. Production Site URL remains `https://renderlab.faresuniform.uk` and the exact invite/recovery redirect allowlist is preserved.
- Invite/recovery templates remain intentionally unchanged at the end of 13B and are still Phase 13C work. No real Auth invite/recovery email, application-code change, Supabase database migration or Vercel deployment occurred.

**13B result:** `COMPLETE / VERIFIED`. **Next:** 13C installs the accepted branded token-hash invite/recovery templates, verifies link integrity/tracking posture and re-runs deterministic Auth security coverage without live mailbox sends.

### Phase 13C link-integrity preflight — BLOCKED 2026-08-31
- Read-only run `33401336576` passed from `work/phase-13c-template-preflight`; it changed no Brevo, Supabase, DNS, application or deployment state and sent no email.
- The live Brevo account reports `enterprise=false`, plan `free`, with transactional relay present. Hosted Supabase Auth still reads back the verified 13B custom SMTP/From/rate-limit/Site URL/redirect state; invite and recovery templates remain the default `{{ .ConfirmationURL }}` bodies with no RenderLab branding or token-hash custom link installed.
- Current Brevo transactional behavior redirects links for click tracking by default. Brevo's anonymous-tracking setting still records aggregate clicks and therefore does not satisfy the UI-053 requirement that Auth URLs are not rewritten. Brevo staff guidance states full transactional tracking disablement is available only upon request for Enterprise accounts; this account is not Enterprise.
- Supabase's current Auth email-template guidance explicitly warns that external email tracking can overwrite confirmation links and recommends disabling provider tracking. That warning aligns with UI-053 and the Phase 13 link-integrity contract.
- Therefore 13C must not install token-bearing invite/recovery templates into the current Brevo Free SMTP path. Proceeding would knowingly violate the accepted no-rewrite security/UX boundary.
- **Operator decision required to unblock 13C:** either move Brevo to a plan/support posture that can verify transactional click tracking is fully disabled, or approve a transactional provider change to one that can prove no URL rewriting. No provider switch, purchase or application-flow redesign is implied by this blocker record.


### Phase 11 execution contract — expanded 2026-08-30
**Status: `COMPLETE / VERIFIED` under UI-052. PR #73 merged to `main`; exact-head PR validation, required human rendered review, merged-main regression, and live fixture-residue audit are complete. No deployment occurred.**

**Verified merged-main handoff — 2026-08-30**
- PR #73 merged to authoritative `main` as `46c5daa2866c6758907ee9be219bcb3cb274ca83` from exact final PR head `773251734dbd5c5f32770699a57b1ade653604b5`.
- Final PR head `773251734dbd5c5f32770699a57b1ade653604b5` passed **19/19 affected workflows**, including Library Lifecycle `33323168930`, Generation Admission `33323168949`, Account/Admin Operations `33323168964`, UI Shell `33323168937` and Brand / Launch Visual `33323168926`.
- Reviewed implementation artifact `9734984885` (`renderlab-brand-launch-screenshots`, `sha256:8d9929fb5f6d85da4710184ec7bbe756f782593f58525ec2ae660729ad3b32a9`) remains the human-approved Brand / Launch checkpoint: desktop/narrow landing hierarchy, `/create` AppShell, legacy continuation and small-scale mark were clean.
- Merged-main push regression UI Shell `33323421285` passed on `46c5daa2866c6758907ee9be219bcb3cb274ca83`. GitHub scheduled no other push workflow for that merge SHA.
- Live Supabase residue audit after merge returned **0** fixture Auth users, RenderLab account-access rows, generation jobs, generation sources, admission reservations, media assets, media collections/items, media upload sessions and invitations.
- `main` now authoritatively serves public Brand / Landing at `/`, Create at `/create`, and the remaining application routes under `(app)` / `AppShell`, with legacy root continuation preserved.
- Phase 11 changed no Supabase schema/Auth policy/admission default/R2/provider/billing/deployment boundary. Production Closed Beta enforcement and Phase 10 broader-beta Auth blockers remain separately documented.
- Phase 12 implementation has **not** started. No deployment is authorized by this Phase 11 completion.

**Goal / user value**
- Give RenderLab a credible public identity and launch surface that explains the product before a visitor enters the creative workspace.
- Separate marketing/navigation chrome from the dense application shell so each surface can optimize for its job without contaminating the other.
- Preserve closed-beta honesty: invited users can sign in and active users can work, while the public surface does not imply public self-service access or solved broader-beta Auth operations.

**Verified starting state**
- Authoritative starting `main` is `20f91dace0386c6c4f0b4305af2bef1bbc6ea572`. Phase 10A–10D is complete/verified; Phase 11 planning authorizes no deployment or production access-enforcement change.
- Current routes are Create `/`, Library `/library`, Viewer `/library/[assetId]`, Activity `/activity`, Settings `/settings`, Admin `/admin`. Root `src/app/layout.tsx` wraps every page in `AppShell`; shell Create links and the shell wordmark point to `/`.
- Current Create is intentionally draftable while signed out, but durable upload/generation/private operations require verified account state. Sign-in/recovery remains in `/settings`; there is no public product sign-up affordance.
- Viewer continuation links use root Create query intent (`source` + `action`) and Create server-side reloads/validates owner media. Those links must not silently break when Create moves.
- No production brand asset set or `public/` directory exists. Root metadata is only `RenderLab` / `AI image and video creation workspace`; the shell uses a text-only RenderLab wordmark.
- Marketing-safe verified capability is limited to Create Image, Edit Image, Create Video, Animate Image, durable reference/media reuse, Library organization, Activity history/failed-job Retry and closed-beta account/admin controls. Provider/model/worker details remain internal.
- `UI_SYSTEM.md` already defines the dark-first palette, Inter/system typography, violet accent, accessibility baseline and premium-quality bar. `DESIGN_WORKFLOW.md` makes Penpot/open-SVG handoff plus remote GitHub rendered review the approved design loop.

**Locked route / information-architecture decision — UI-052**
1. **Landing owns `/`.** Phase 11 implementation makes `/` the public Brand / Launch surface.
2. **Create moves to `/create`.** `/create` becomes the application Create destination; `/library`, `/library/[assetId]`, `/activity`, `/settings` and `/admin` keep their URLs.
3. **Split marketing from application layout.** Root layout becomes global document/theme/metadata plumbing only. A marketing route group owns the landing surface without `AppShell`; an application route group owns Create/Library/Viewer/Activity/Settings/Admin under the existing `AppShell`. Route groups do not change public URLs except the deliberate Create move.
4. **Preserve continuation compatibility.** A legacy request to `/` containing `source` or `action` redirects same-origin to `/create` with the full query string preserved; the existing Create server boundary remains responsible for UUID/action/owner/media validation. Bare `/` becomes landing.
5. **Application navigation remains task-first.** Shell Create navigation and shell wordmark/mobile brand affordance point to `/create`, preserving their workspace behavior. Marketing wordmark points to `/`.
6. **Authentication stays where it is.** Landing `Sign in` points to `/settings`. Do not create a second credential form, public registration route, waitlist database or automatic admission path. `Open Create` points to `/create`; signed-out Create remains draftable and persistent actions continue enforcing account/admission rules.

**Brand / visual design contract**
- Begin with a visual-design checkpoint before coding the landing composition: Penpot when available, otherwise versioned open SVG handoff in `design/penpot/`. Review desktop and narrow/mobile states before treating the design as implementation-ready.
- Establish one project-owned RenderLab mark and wordmark system, not unrelated logos. The mark must remain recognizable at favicon/small-navigation scale, work in one-color treatment, and avoid relying on glow, gradients or a generic AI-sparkle glyph for identity.
- Keep the established dark canvas/surface/text foundation and semantic violet accent so marketing and application feel related. Marketing may use more expressive display scale, composition and motion but must not redefine application control density/tokens or push decorative marketing mechanics into `AppShell`, Create or Library.
- Required implementation assets: reusable mark/wordmark treatment, app/favicon icon, social/Open Graph launch image/banner, and repository-owned vector/raster exports required by Next metadata or external launch use.
- Motion may support hierarchy and product-story continuity, but no autoplay background video, cursor gimmicks, constant glow/parallax, heavy WebGL or essential information hidden behind motion. Reduced motion gets a static equivalent.

**Landing content / messaging contract**
- Keep the page concise and product-led: hero/value proposition; proof of the four verified creative operations; durable references/Library/reuse; Activity/recovery continuity; closed-beta access CTA/footer. Product-workspace previews may represent only real RenderLab UI/capability.
- Primary CTA: **Open Create** → `/create`. Secondary account CTA: **Sign in** → `/settings`. Closed-beta language must be clear without exposing internal admission mechanics.
- Do not claim public availability, guaranteed quality, deterministic prompt obedience, render-time SLAs, pricing/cost savings, customer/user counts, provider/model superiority, collaboration, mobile apps, Director controls, cancellation, billing/credits or other unverified capability.
- Do not add pricing, testimonials, fake customer logos/metrics, newsletter/waitlist capture, public registration, blog/CMS, analytics/tracking pixels or third-party marketing cookies in this slice.

**Implementation / architecture boundary**
- Prefer Server Components and static/project-owned assets. Add Client Components only for interactions/motion that materially benefit the page; do not create a marketing client store.
- Reuse maintained RenderLab primitives for conventional interactive controls. Marketing-specific composition may be custom, but generic mechanics still follow the approved component-source order and accessibility requirements.
- Metadata becomes launch-ready with descriptive title/description and project-owned Open Graph/Twitter visuals, without hard-coding an unverified production hostname or implying deployment.
- No Supabase schema/migration, R2 contract, generation/provider contract, Auth policy, admission default, service-role exposure or production environment mutation is expected.

**Validation / review**
- Add a dedicated configured **Brand / Launch Visual** workflow/verifier that production-builds the app, verifies `/` landing and `/create` application semantics, captures at least desktop `1440x1100` and narrow `390x844` landing screenshots, checks horizontal overflow, keyboard-reachable CTAs, focus visibility, reduced-motion behavior, truthful closed-beta copy, metadata and brand asset availability.
- Update UI Shell validation for `/create` active navigation and shell brand behavior. Update Create lifecycle/deep-link verification so `/create` is authoritative and legacy `/?source=...&action=...` redirects to `/create` without losing query intent or weakening server continuation validation.
- Run UI purity, TypeScript, production build and every path-triggered affected workflow. Route/layout movement is shared composition work, so broad regressions must not be suppressed merely to make the launch slice look isolated.
- Human-review final desktop/narrow landing, brand mark at small scale, application shell after route migration and a representative legacy continuation redirect result.

**Documentation outputs / exit criteria**
- Update `PROJECT.md`, `UI_MIGRATION.md`, `UI_DECISIONS.md`, `UI_SYSTEM.md` if brand-system rules actually change, `COMPONENT_CATALOG.md` for adopted reusable brand/marketing components, `SCREEN_REGISTRY.md`, `FRONTEND_ARCHITECTURE.md`, and `design/penpot/README.md` for accepted handoff artifacts.
- Phase 11 completes only when route migration, brand assets, landing page, truthful CTA/auth posture, legacy continuation compatibility, responsive/accessibility/reduced-motion checks, exact-head CI and human visual review all pass and authoritative docs match verified implementation.
- Broader-beta Auth email/template/leaked-password blockers from Phase 10 remain open unless separately resolved with operator evidence. Phase 11 completion does not authorize public self-admission, production enforcement or deployment.
- No Vercel deployment is authorized by this contract. Phase 12 owns final integrated release validation and any later explicitly authorized production rollout.


### Phase 12 execution contract — expanded 2026-08-30
**Status: `COMPLETE / VERIFIED`. PR #74 merged the execution contract as `c03e26c683c9c7c430c0e55cc306f5889f004844`; PR #75 merged exact verified candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`; Phase 12B authorization was received on 2026-08-31; the pre-deploy Auth blocker was corrected and the exact candidate is now the accepted Closed-Beta production release.**

**Goal / user value**
- Prove the complete current RenderLab product works as one release candidate after Phases 6–11 instead of relying on individually green feature slices.
- Catch cross-feature, ownership, persistence, responsive, infrastructure and launch regressions before production receives the large executable delta accumulated since the current deployment.
- Preserve a clean separation between release confidence and deployment permission: validation may complete without creating a Vercel deployment.

**Verified starting state**
- Authoritative contract-start `main` is `d8fa1fc754c4e5bdc3648177fb7f833218dc1d95`. Phase 11 merged as `46c5daa2866c6758907ee9be219bcb3cb274ca83`; final Phase 11 exact-head CI, rendered Brand / Launch review, merged-main UI Shell and zero-residue Supabase audit are complete.
- Vercel project `renderlab` is configured as Next.js. Repository `vercel.json` keeps `git.deploymentEnabled=false`; Git pushes/merges are not rollout authorization.
- Current READY production deployment is `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` from application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`. Current `main` is **216 commits ahead** and the delta contains application, API, test, workflow and migration-contract changes across Create v2, Library v2, Activity Retry, Account/Admin/Admission and Brand/Launch. Production health therefore cannot substitute for exact-current-candidate validation.
- Vercel currently reports no runtime error clusters over the inspected 7-day window. Production domains remain `renderlab-lake.vercel.app` and `renderlab.faresuniform.uk` plus Vercel project aliases.
- Supabase migrations through `0012_renderlab_generation_admission.sql` are applied. The Phase 11 post-merge live residue audit returned zero RenderLab fixture Auth/access/generation/admission/media/upload/invitation state.
- Current Supabase Security Advisor reports only expected server-owned `rls_enabled_no_policy` INFO plus the known leaked-password-protection WARN. Performance Advisor reports the previously documented one-row `renderlab_beta_settings.updated_by` unindexed-FK INFO plus unused-index INFO; neither is a Phase 12 schema mandate without new evidence.
- Production closed-beta enforcement remains off pending the separately documented known-RenderLab UUID bootstrap. Hosted Supabase built-in mail/rate-limit posture, production Auth Site URL/redirect/template/sender verification and Free-plan leaked-password protection remain open operational/broader-beta evidence gaps.

**12A — Release Candidate Validation — authorized by this contract after merge**
1. Freeze one exact candidate SHA from the then-current `main`. Do not mix results from different heads. Any release-blocking code/config fix creates a new candidate and restarts every affected release gate.
2. Run repository static/build gates on that candidate, including whitespace, UI purity, TypeScript/verifier syntax where applicable, production Next.js build and Deployment Readiness. No cancelled, action-required, queued or stale-head run counts as success.
3. Require the complete configured feature/integration matrix needed by current repository reality: Account Identity/Ownership/Admin, Generation Admission, Reference/Durable Upload, Image/Edit generation, Video/Animate generation, Create lifecycle, Library search/history/lifecycle/drag-drop/Favorites/Collections/batch actions, media Rename/Download/Delete, Activity/Retry, UI Shell and Brand / Launch.
4. Add one dedicated **Integrated Release** verifier/workflow if the existing matrix does not prove the cross-surface path in one run. It must cover an authenticated run-owned account through Create → persisted result/reference reuse → Library → Viewer → organization → Activity/recovery, plus signed-out/foreign ownership rejection, fresh Admin authorization and public landing/Create routing. Prefer a run-owned mock generation backend for this cross-product continuity test so it does not duplicate provider spend; existing configured Generation/Video integration remains authoritative for live native backend mapping.
5. Capture a bounded release artifact set for human review: Landing, Create, Library, Viewer, Activity, Settings and Admin at representative desktop/narrow states; verify hierarchy, overflow, focus/keyboard behavior, readable error/success states and reduced-motion behavior. A green build alone is insufficient.
6. Audit Supabase live state read-only after configured runs: applied migration history, RLS/browser grants, privileged function execute/search-path posture, singleton admission defaults, ownership/deletion integrity and exact fixture cleanup. Security/performance advisor findings must be categorized as expected, release-blocking, or deferred with evidence.
7. Audit production infrastructure read-only without deploying: Vercel project/framework/domains/current READY deployment/runtime errors, required environment-variable **presence/contract** without exposing values, current production SHA drift, and repository automatic-Git-deployment disablement. Reconfirm custom-domain HTTPS and R2 browser-upload CORS contract through non-mutating evidence where available.
8. Record a candidate manifest in existing authoritative docs: exact SHA, every required run/result, human artifact review, infrastructure audit, fixture cleanup and unresolved rollout blockers.

**12A hard boundaries**
- This is release validation, not a feature phase. Do not redesign screens, add capabilities, change routes, refactor architecture, tune providers or broaden scope unless a verified release-blocking defect makes the smallest correction necessary.
- Do not add a schema migration merely to silence informational advisors. A real schema/security defect requires explicit evidence, the smallest correction, and full revalidation.
- Do not mutate production Auth configuration, closed-beta enforcement, UUID bootstrap, R2 CORS, Vercel production settings or provider infrastructure during 12A.
- Phase 10 broader-beta blockers remain truthful and open; do not relabel them complete from absence of errors.

**12A exit criteria**
- One unchanged release-candidate SHA has every required configured gate at terminal success.
- Integrated cross-surface validation passes with exact run-owned cleanup.
- Required desktop/narrow/reduced-motion human review is clean.
- Supabase/Vercel/R2/custom-domain audits expose no unresolved closed-beta release blocker other than explicitly operator-gated rollout actions.
- Authoritative docs record the exact evidence. At this point Phase 12 may be marked **`RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED`** and must stop if no rollout authorization exists.


**12A implementation / verification evidence — 2026-08-30**
- PR #75 merged to authoritative `main` as exact release-candidate SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42`. The merge tree is the already-reviewed PR-head tree; no product/runtime/schema/deployment change followed the merge before validation.
- Exact-main Deployment Readiness `33335278699`, Integrated Release `33335278694`, and Release Candidate Matrix `33335278667` passed. The matrix manifest artifact is `9739024806` (`sha256:8185cadab7ab1d20468c476b42486285d084bc56b4aa3dddaed035f77f8d5ab1`) and records **23/23** terminal-success child runs on the same SHA: Account Identity `33335314098`, Account Ownership `33335315029`, Account/Admin `33335316128`, Generation Admission `33335317378`, Reference Upload `33335318397`, Persistent Media Upload `33335319584`, Create Durable Upload `33335320636`, Generation Integration `33335321717`, Video Generation `33335322801`, Create Lifecycle `33335323788`, Library Lifecycle `33335324883`, Library Search `33335325896`, Library History `33335326894`, Library Drag Drop `33335327959`, Library Favorites `33335329164`, Library Collections `33335330446`, Library Batch Delete `33335331517`, Media Rename `33335332593`, Media Download `33335333738`, Media Delete `33335335098`, Activity `33335336197`, UI Shell `33335337206`, and Brand / Launch `33335338275`.
- The automatic push UI Shell run `33335278679` was cancelled when the matrix intentionally dispatched its same-SHA replacement; cancellation was not counted as success. Exact matrix-owned UI Shell `33335337206` completed successfully.
- Exact-main Integrated Release artifact `9738853882` (`sha256:b8b9d48d1f97a93595ff6691708b4a2c5f13d33c0c01c785c7b6f5e35afdd8a6`) was human-reviewed clean across Landing, Create, Library, Viewer, Activity, Settings and Admin desktop/narrow surfaces. Exact-main Create Lifecycle artifact `9738873955` (`sha256:78eb279abb14492cd63550f2c4363bd37c6f6ea4add29e7dd572959d2327137e`) completed the narrow Create/multi-reference/reduced-motion review without clipping or horizontal-overflow defects.
- Integrated Release used the run-owned authenticated mock provider only for the cross-surface continuity path, while configured Generation Integration and Video Generation remained the authoritative live-provider Image/Edit and Video/Animate mapping checks. Video Generation `33335322801` completed all live Create Video + Animate Image cases and exact cleanup.
- The release-owned R2 audit is read-only: `scripts/verify-r2-browser-cors.mjs` signs a probe URL and sends OPTIONS requests only. Exact-main Integrated Release verified all six canonical browser-upload origins, including `https://renderlab-lake.vercel.app` and `https://renderlab.faresuniform.uk`, without CORS/object/config mutation.
- Final Supabase read-only audit found migrations applied through `0012`, RLS enabled on every audited RenderLab table, zero `anon`/`authenticated` table grants, service-role-only privileged SECURITY DEFINER routines with empty search paths, zero orphan/owner-integrity mismatches, and the singleton restored to generation enabled / 1 active / 12 hourly / `updated_by=null`. After the exact-main suite there were **0** release-created Auth users/jobs/sources/assets/uploads/collections/items and **0** total RenderLab access/invitation/admission-reservation fixtures. Pre-existing legitimate project media/history predating 12A was deliberately preserved rather than misclassified as test residue.
- Supabase advisors remain unchanged and non-release-blocking for the Closed Beta: expected server-owned RLS/no-policy INFO, the known Free-plan leaked-password WARN, the one-row settings-FK INFO and unused-index INFO.
- Vercel remains unchanged: production deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` at application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca` is READY; automatic Git deployment remains disabled; no deployment was created by PR #75/12A; the inspected seven-day runtime window contained no error cluster. Production aliases/custom-domain HTTPS remained healthy during the read-only audit.
- **12A exit:** `RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED`. Do not deploy, bootstrap production UUIDs, enable Closed-Beta enforcement, mutate hosted Auth/Vercel/R2/provider settings, or begin 12B until explicit user authorization is received.

**12B rollout preflight evidence — 2026-08-31**
- Known-account bootstrap completed against the sole persistent RenderLab account before enforcement: `renderlab_account_access` now has exactly one active account / one active admin and zero per-account generation overrides. The persistent account UUID remains private and is not repository documentation.
- Vercel production-env metadata preflight `33336831850` verified all seven required Supabase/R2 production keys are present; `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED` is the only missing rollout key and has **not** been created yet.
- Exact-candidate release preflight `33336966309` checked out `d6b8f386db3893e583c99b23fc3397b0eb377d42` and reconfirmed production R2 PUT preflight CORS for all four production aliases/custom-domain origins with no mutation.
- The same Auth preflight generated a run-owned recovery link without sending email and proved the requested `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password` redirect is rejected by hosted Auth and replaced with `http://localhost:3000`. This is a production release blocker for recovery and truthful invitation posture.
- Supabase Management API credential preflight `33337036024` confirmed `SUPABASE_ACCESS_TOKEN` is not configured in GitHub Actions. The connected Supabase tool can manage/query the database but does not expose hosted Auth Site URL / redirect-list mutation.
- Required correction before rollout resumes: set hosted Auth Site URL to `https://renderlab.faresuniform.uk`; add exact production redirect URLs `https://renderlab.faresuniform.uk/settings` and `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password` (Supabase recommends exact production paths), then rerun the no-email generate-link probe and confirm the custom-domain redirects are preserved.
- No Vercel closed-beta enforcement key was added, no new Vercel deployment was created, and the existing READY deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` remains production/rollback while this blocker is open.

**12B — Authorized Production Rollout — COMPLETE / VERIFIED**

**Accepted production rollout evidence — 2026-08-31**
- Supabase Auth repair run `33337864235` corrected hosted Site URL from `http://localhost:3000` to `https://renderlab.faresuniform.uk`, preserved/installed the exact `/settings` and `/auth/confirm?type=recovery&next=/settings/password` redirect destinations, and then generated recovery + invite links without sending email to prove both custom-domain redirects were retained. Run-owned Auth fixtures were deleted.
- The sole persistent RenderLab account remains the Closed-Beta bootstrap: exactly one `admin` / `active` access row with no per-account generation override. Vercel production key `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED=true` is active only in the production environment.
- Production R2 exact-origin PUT preflight CORS remained verified from `33336966309`; required Vercel Supabase/R2 env keys were present from `33336831850`. No R2 policy mutation or provider/backend configuration change was required.
- Final clean Vercel deployment run `33338162385` deployed pristine exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` as `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; Vercel reported `READY`, the exact candidate SHA and `gitDirty=0`. Stable and custom aliases serve the release; `https://renderlab.faresuniform.uk/` returned HTTP 200 with HSTS and the verified Brand / Landing surface.
- Bounded production smoke `33338323520` passed public Landing/Create/Settings, Closed-Beta owner/privacy boundaries, browser-table denial, durable Create upload → Library → Viewer → Create reuse, real Create Image, historical failed-job Activity Retry with immutable history, and one real 5-second 480p Create Video. Generated/uploaded fixtures and R2 objects were exactly cleaned.
- The generic Admin verifier in `33338323520` reached its production-only last-admin assumption after all earlier Admin/UI checks passed: the persistent bootstrapped admin correctly meant the run-owned fixture admin was not the last active admin. Cleanup restored the fixture state. Production-specific follow-up `33338643898` then passed signed-out/member denial, active-admin settings/accounts/health/page access, self-lockout, member suspend/reactivate and exact cleanup without mutating the persistent admin.
- Production Admin screenshots from `33338323520` artifact `9739796661` (`sha256:b360b8674566d95d8ad34bb384fa97e302a7d7628de974bf6e307058cade165c`) were human-reviewed clean at desktop and 390px narrow with no clipping or broken control hierarchy.
- Final audit in `33338643898` proved **0** run-owned Auth fixture users, **0** non-persistent owner rows across jobs/sources/assets/upload sessions/collections, **0** admission reservations, **0** open beta invitations, exactly one active persistent admin with no overrides, and singleton generation defaults `enabled / 1 / 12 / updated_by null`.
- Vercel error/fatal runtime-log query over the rollout/smoke window returned no entries for final deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`.
- Pre-rollout deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` remains the documented rollback baseline. Automatic Git → Vercel deployment remains disabled; future production releases still require explicit release decisions rather than implicit docs-only `main` movement.
- Broader-beta limitations remain intentionally outside this Closed-Beta Cycle 2 acceptance: built-in Supabase mail/rate-limit posture and Free-plan leaked-password protection remain documented hardening work for any broader-access cycle.

- Start only after the user explicitly authorizes deployment/production mutation for the exact verified candidate. If authorization is absent, do not create a Vercel deployment or alter production configuration.
- Before rollout, resolve the invitation-only production consistency gate: verify the intended known RenderLab account UUID bootstrap and production closed-beta enforcement state as a separate explicit operator action. Do not silently claim invitation-only production access while the documented enforcement gate is unresolved.
- Verify production Supabase Auth Site URL/redirect behavior needed by sign-in/recovery links and record the built-in-mail/custom-SMTP/leaked-password limitations truthfully. Broader-beta mail capacity/leaked-password limitations may remain blockers to broader beta even if a deliberately bounded Closed Beta rollout is accepted.
- Reconfirm required Vercel environment contract and exact-origin R2 browser-upload CORS before promotion. Any required production mutation must be explicit, scoped and recorded.
- Deploy only the exact verified candidate SHA. Require READY state, correct production aliases/custom domain, HTTPS, route/metadata/landing smoke, authenticated account/private-media smoke, one bounded image and video capability smoke if authorized, durable upload/reuse, Activity/Retry/Admin boundary, and exact cleanup. Observed render timings are evidence samples, not SLAs.
- Define rollback before rollout using the current READY production deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` and verify the rollback candidate remains available until the new release is accepted.

**Phase 12 completion states**
- `RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED` — 12A complete, no rollout permission.
- `ROLLOUT AUTHORIZED / IN PROGRESS` — explicit user authorization received and 12B prerequisites are being executed.
- `COMPLETE / VERIFIED` — exact candidate deployed intentionally, custom-domain/product smoke and cleanup pass, production state/docs are reconciled, and no unresolved rollback-triggering defect remains.

**Documentation outputs**
- Keep Phase 12 evidence in `PROJECT.md`, `docs/ui/UI_MIGRATION.md` and the relevant existing architecture/infrastructure documents. Do not create a competing handoff document.
- Update UI/component/screen decision catalogs only if a real release-blocking correction changes those contracts.
- Record rollout evidence only after it actually occurs; planning or authorization is not deployment evidence.

### Phase 10D execution contract — expanded 2026-08-30
**Status: `COMPLETE / VERIFIED`. The execution contract merged before implementation; PR #70 is merged to `main` as `5950958dc58143b099bc2877a942829c045f700e` and merged-main acceptance is recorded below.**

**Goal / user value**
- Make private RenderLab access respond immediately to Supabase session revocation instead of accepting an otherwise valid signed JWT until expiry.
- Preserve the already-working invitation/recovery/password UX while making its security boundary explicit and testable.
- Finish Phase 10 with truthful hosted Auth/email/security readiness evidence: solve what can be solved in-repo, and keep plan/operator-dependent launch blockers explicit rather than masking them.

**Verified starting state**
- Authoritative starting `main` is `0bad0efa96fd4a74cd531f21c38641d6b31708ab`, with Phase 10C merge `26508e77975ee4dd26f60860f999e4bc55c99eca` and all four merged-main regressions green.
- Root Supabase proxy/session maintenance uses verified `auth.getClaims()`; ordinary private `getCurrentRenderLabAccount()` currently derives identity from the same claims path before the RenderLab access lookup. Privileged Admin already uses fresh `auth.getUser()`.
- One-time audit runs `33311990845` and `33312153080` used exact run-owned Auth users and cleaned them. The latter independently left no matching Auth/access/job/source/media/upload/reservation rows.
- Hosted two-session evidence from `33312153080`: password update through session A returned `200`; session A remained current (`getUser 200`, refresh `200`), while session B was revoked immediately (`getUser 403 session_not_found`, refresh `400 refresh_token_not_found`); sign-in with the new password returned `200`.
- Current Supabase Auth logs show recovery mail from `noreply@mail.app.supabase.io`, confirming the built-in Supabase mailer is still in use. One run-owned recovery request succeeded, while a subsequent near-term request returned `429 over_email_send_rate_limit`. This mail posture is not broader-beta-ready.
- GitHub Actions has no `SUPABASE_ACCESS_TOKEN`, so hosted Auth Site URL, redirect allowlist and email-template configuration cannot currently be read through the Management API from repository CI.
- Supabase organization/project is on the Free plan; leaked-password protection remains unavailable on that plan. Security Advisor otherwise reports only the expected server-owned `rls_enabled_no_policy` INFO notices plus the leaked-password WARN. Current Phase 10 privileged tables/functions remain browser-revoked/service-role-only.

**In scope**
1. **Fresh private-account authorization.** Keep `getClaims()` in the root proxy for SSR cookie refresh/signature validation, but require a fresh Auth-server `getUser()` result before `getCurrentRenderLabAccount()` returns a private product principal. Only then resolve active RenderLab access when admission enforcement is enabled. Do not query `auth.sessions` directly from application code and do not add a second session store.
2. **Fresh security-sensitive Settings state.** `/settings` signed-in identity, `/settings/password`, invitation/recovery completion and any account-security action must not trust a revoked session solely because its JWT remains cryptographically valid. Preserve the existing fresh-admin boundary.
3. **Password/session behavior.** Preserve Supabase's verified behavior that the session performing a password change may remain valid while other sessions are revoked. Extend configured verification to prove a captured stale second-session bearer is immediately denied by RenderLab private APIs after ordinary password change and after recovery/password replacement, while the intended current session remains usable. Global sign-out must also make a captured stale session fail the fresh private boundary.
4. **Recovery/invite boundary.** Keep enumeration-safe recovery copy, server-side token-hash/PKCE completion, user-bound 10-minute HttpOnly recovery marker, same-origin redirects and no public account creation. Add negative coverage for invalid/consumed token hashes and untrusted `next`/origin values so no open redirect or recovery bypass appears.
5. **Hosted Auth/email readiness evidence.** Before broader beta, operator evidence must confirm production Site URL + redirect allowlist, invite and recovery templates using the SSR token-hash `/auth/confirm` flow, production-capable custom SMTP or equivalent Send Email Auth Hook, suitable Auth email rate limits, disabled link tracking, and sender-domain SPF/DKIM/DMARC posture. Regular CI must not depend on real email delivery.
6. **Security/operational re-audit.** Re-run Security Advisor, table/browser-grant checks, privileged-function ACL/search-path checks, exact fixture cleanup, singleton baseline, Admin response sanitization and provider-spend boundaries after implementation.

**Out of scope**
- Purchasing/upgrading the Supabase plan, procuring/configuring SMTP credentials, changing DNS records, or adding a Management API token without separate operator authorization/credentials.
- MFA productization, CAPTCHA product work, account/data deletion, billing/credits, provider/worker administration, generic feature flags, public-beta launch, route/IA redesign, or any Create/Library/Activity redesign.
- New database schema is not expected. If implementation evidence unexpectedly requires schema, stop and re-expand this contract before adding a migration.
- No production UUID bootstrap, no `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED=true`, and no Vercel deployment.

**Architecture / security contract**
- `proxy.ts` + `src/lib/supabase/proxy.ts`: `getClaims()` remains session-cookie maintenance only, never the final private authorization check.
- `src/lib/supabase/server.ts`: private account resolution becomes fresh-Auth-backed; revoked/unknown/anonymous sessions fail closed before RenderLab access/data lookup. A lightweight claims helper may remain only where no private authorization decision is made.
- Settings/password and Admin reuse the same server-owned identity distinction; browser metadata/JWT role claims never become authorization state.
- Service-role credentials stay server/CI-only. No browser grant or RLS-policy expansion is part of 10D.

**Validation / review**
- Extend the existing Account Identity configured verifier rather than create a parallel auth framework. Use deterministic run-owned identities, two independent sessions, captured stale bearer/refresh tokens, real browser password/recovery interactions, exact cleanup and no email-delivery dependency.
- Assert revoked stale bearer access fails a representative private media API and generation/account boundary immediately even while its JWT has not expired; assert current session continuity after password change; assert global sign-out and recovery invalidate other sessions as expected.
- Keep invalid/expired/consumed recovery links fail-closed and same-origin; preserve active/suspended admission behavior and no public Create-account affordance.
- Run exact changed-file/whitespace, UI purity, TypeScript/build and all path-triggered regressions. Because the private account helper is shared by media/generation/upload/history routes, accept the broad affected workflow matrix rather than bypassing it.
- Human review is required only for Settings/password states if visible copy/layout changes. Do not create unrelated UI work merely to obtain screenshots.

**Documentation outputs / exit criteria**
- Update `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md`, `docs/architecture/FRONTEND_ARCHITECTURE.md` and `docs/architecture/INFRASTRUCTURE.md` with verified final behavior/evidence.
- Phase 10D can close with external broader-beta blockers explicitly open; closing the engineering slice does not falsely claim the Free-plan leaked-password or built-in-mail limitations are solved.
- Before broader beta or production admission enforcement, leaked-password protection must be available/enabled and hosted Auth email/redirect/template posture must be operator-verified and production-capable. Until then, broader-beta release remains blocked.
- No deployment or production access-enforcement change is authorized by completing this slice.

### Phase 10D implementation evidence — verified 2026-08-30
- Exact accepted code/test head `585a606666eae5b8813f54ba19ea253fcccaaf4f` passed all 21 path-triggered workflows: Account Identity Visual `33313458456`, Account Ownership `33313458433`, UI Shell Validation `33313458451`, Reference Upload Integration `33313458387`, Persistent Media Upload Integration `33313458429`, Create Lifecycle Visual `33313458372`, Generation Integration `33313458400`, Video Generation Integration `33313458436`, Activity Visual `33313458444`, Library Lifecycle Visual `33313458464`, Library Search Visual `33313458447`, Library History Visual `33313458381`, Library Drag Drop Visual `33313458434`, Library Favorites Visual `33313458457`, Library Collections Visual `33313458392`, Library Batch Delete Visual `33313458435`, Media Download Visual `33313458386`, Media Rename Visual `33313458374`, Media Delete Visual `33313458396`, Account/Admin Operations `33313458427`, and Generation Admission `33313458380`.
- Account Identity `33313458456` extended the existing configured auth verifier rather than adding a parallel framework. It proved ordinary password change preserves the acting browser session while a captured still-unexpired second-session JWT is immediately denied by current Supabase `getUser`, private RenderLab media, the pre-backend generation identity boundary and refresh. The same stale-session denial passed after token-hash recovery/password replacement and default-global sign-out. Invalid and consumed recovery hashes failed closed, hostile `next=https://evil.example/...` remained same-origin, recovery still required no old password, suspended access stayed denied, and public Create-account remained absent.
- `src/lib/supabase/server.ts` now makes the shared server identity helper fresh-Auth-backed with `auth.getUser()`. `getCurrentRenderLabAccount()` therefore fails closed for revoked/unknown sessions before private product lookup. Root `proxy.ts` / `src/lib/supabase/proxy.ts` remains unchanged on `getClaims()` for SSR cookie refresh/signature validation, and the already-fresh Admin boundary is preserved.
- Account Identity artifact `9732716345` (`renderlab-account-identity-screenshots`, `sha256:4818217e835ebe3ff3b580b2543e59243374816c83bb60209a7144fed1290019`) contains the existing five Settings/recovery states. No visible UI code/copy/layout changed in 10D, so the contract did not require a new human visual-approval cycle.
- Independent live cleanup for run-owned user `57f65a30-4a74-4189-8194-567a21a46e38` found 0 matching Auth, account-access, invitation, admission-reservation, generation-job/source, media-asset and upload-session rows. `renderlab_beta_settings` remained `generation_enabled=true`, `max_active_jobs=1`, `max_jobs_per_hour=12`, `updated_by=null`.
- Phase 10 server-owned tables remain RLS-enabled with no anon/authenticated DML grants. All RenderLab SECURITY DEFINER routines remain explicit empty-search-path and service-role-only. Security Advisor reports only expected server-owned `rls_enabled_no_policy` INFO plus the existing leaked-password WARN. No 10D schema migration was added.
- Broader beta remains blocked until production Site URL/redirect allowlist and invite/recovery token-hash templates are operator-verified, built-in Supabase email is replaced by production-capable custom SMTP or equivalent with suitable rate limits/link-tracking/sender-domain posture, and leaked-password protection is available/enabled on a qualifying Supabase plan. No Vercel deployment, production UUID bootstrap or access-enforcement change was performed or authorized.
- PR #70 merged to `main` as `5950958dc58143b099bc2877a942829c045f700e`. Merged-main Reference Upload `33314652092`, UI Shell `33314652107`, Generation Integration `33314652101`, and Video Generation Integration `33314652229` all passed. An independent exact audit found 0 rows for the three deterministic push-run fixture identities across `auth.users`, `renderlab_account_access`, `generation_admission_reservations`, `generation_jobs`, `generation_sources`, `media_assets`, and `media_upload_sessions`; `renderlab_beta_settings` remained `generation_enabled=true`, `max_active_jobs=1`, `max_jobs_per_hour=12`, `updated_by=null`. No deployment or production access-enforcement change occurred.

### Phase 10A implementation evidence — verified 2026-08-30
- Exact code/test head `e36140911c63527927ef404d1befa7670d590f8a` passed all 20 path-triggered workflows: Account Identity `33282141315`, Account Ownership `33282141349`, UI Shell `33282141382`, Reference Upload `33282141379`, Persistent Media Upload `33282141310`, Create Durable Upload `33282141312`, Create Lifecycle `33282141327`, Generation Integration `33282141375`, Video Generation Integration `33282141367`, Activity `33282141358`, Library Lifecycle `33282141333`, Library Search `33282141308`, Library History `33282141378`, Library Drag Drop `33282141368`, Library Favorites `33282141323`, Library Collections `33282141334`, Library Batch Delete/Actions `33282141359`, Media Download `33282141305`, Media Rename `33282141360`, and Media Delete `33282141328`.
- Account Identity artifact `9723305472` (`renderlab-account-identity-screenshots`, `sha256:161433ae6d549b63b147ca7215fe4e07bc06609d0db3beb8a5d9e188939dc834`) contains five final-head states: desktop active signed-in, mobile active signed-in, mobile suspended, mobile signed-out, and mobile recovery-complete. Human review found no clipping/overlap, clear Active/Suspended status, reachable password/sign-out actions, no public Create-account affordance, and clean narrow recovery completion.
- Repository migration `0010_renderlab_account_admission.sql` is applied to the approved shared Supabase project as `20260829234212 renderlab_account_admission`. `renderlab_account_access` and `renderlab_beta_invitations` are RLS-enabled and browser-revoked; `renderlab_claim_beta_invitation(uuid,text)` is SECURITY DEFINER with an empty search path and service-role-only execute. Post-suite audit returned both new tables to 0 rows.
- Validation found and fixed two concrete defects before acceptance: the ownership verifier initially omitted access rows while enforcement was enabled, and recovery redirects reconstructed an internal `localhost` origin that dropped fresh session cookies when the browser used `127.0.0.1`. The ownership fixtures now seed/clean exact run-owned access rows, and auth/password-completion redirects use relative same-origin `Location` headers. A later Playwright strict-selector ambiguity was fixed with exact password labels. The independent final static gate `33282265302` passed exact 15-file scope, `git diff --check`, verifier syntax, UI purity, TypeScript and production build.
- Production `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED` remains default-off. Enabling it still requires an explicit operator-supplied bootstrap of known RenderLab Supabase Auth UUIDs; there is no shared `auth.users` scan/backfill. No Vercel deployment was created or authorized.

### Phase 10B implementation evidence — verified 2026-08-30
- Exact accepted code/test head `56d5a2c26fc14f6fcad8c7093024bcc9632eb7c8` passed all 20 path-triggered workflows: Account/Admin Operations `33287455993`, Account Identity `33287456000`, Account Ownership `33287455999`, UI Shell `33287456001`, Reference Upload `33287455974`, Persistent Media Upload `33287455982`, Create Lifecycle `33287455983`, Generation Integration `33287455998`, Video Generation Integration `33287455985`, Activity `33287455979`, Library Lifecycle `33287455975`, Library Search `33287455997`, Library History `33287456005`, Library Drag Drop `33287455984`, Library Favorites `33287456018`, Library Collections `33287455995`, Library Batch Delete `33287455978`, Media Download `33287455994`, Media Rename `33287456011`, and Media Delete `33287456007`.
- Account/Admin Operations verified signed-out/member denial, fresh active-admin access, RenderLab-only account discovery, generic invite delivery behavior, invite revoke, member/admin transitions, suspend/reactivate, bounded generation override set/clear/rejection, last-active-admin and self-lockout protection, sanitized health aggregates, Settings Admin-link visibility and exact cleanup.
- Admin artifact `9724888784` (`renderlab-admin-operations-screenshots`, `sha256:02eab0838958d8da7c9b966159c05acc72ec0f8cf1181b7d0603a12cf56acd38`) contains desktop and narrow Admin states. Human review found a clean dense desktop composition, readable stacked narrow records/actions, no horizontal clipping and no provider/worker/workflow/raw-error leakage.
- Repository migration `0011_renderlab_admin_access_control.sql` is applied as `20260830015449 renderlab_admin_access_control`. The account tables remain RLS-enabled/browser-revoked; `renderlab_admin_set_account_access` and `renderlab_admin_health` are SECURITY DEFINER with empty search paths and service-role-only execute. Advisors added no actionable 10B issue; the pre-existing leaked-password warning remains 10D work.
- Independent exact fixture audit found 0 run-owned access rows, invitations, generation jobs and Auth users after the final Admin run. Production admission enforcement remains off; no deployment was performed or authorized. Phase 10C global defaults/reservations/Create+Retry admission enforcement remains explicitly unimplemented.

### Phase 10C implementation evidence — verified 2026-08-30
- Exact accepted code/test head `ca8e426066385934b296b6d4f88324e9c12861f7` passed all 22 path-triggered workflows: Reference Upload Integration `33309162337`, Persistent Media Upload Integration `33309162319`, Account Ownership `33309162346`, UI Shell Validation `33309162321`, Library Lifecycle `33309162309`, Media Rename `33309162308`, Account Identity `33309162338`, Create Durable Upload `33309162312`, Library History `33309162326`, Media Download `33309162330`, Library Search `33309162311`, Media Delete `33309162359`, Library Collections `33309162340`, Library Favorites `33309162339`, Account/Admin Operations `33309162310`, Activity `33309162322`, Create Lifecycle `33309162323`, Video Generation Integration `33309162305`, Generation Integration `33309162306`, Library Drag Drop `33309162344`, Library Batch Delete `33309162320`, and Generation Admission `33309162313`.
- Generation Admission `33309162313` used run-owned accounts/reservations plus a local authenticated mock backend with zero provider generation spend. It verified signed-out `401`, missing/suspended access `403`, global/account generation-disabled `503`, default/override active and rolling-hour limits, same-owner race safety, provisional release with hourly accounting preserved, terminal-slot release, bounded unbound/missing-job leases, malformed/unavailable-input preflight, and Create ↔ Retry shared admission before mock-backend dispatch.
- `0012_renderlab_generation_admission.sql` is applied as `20260830101734 renderlab_generation_admission`. `renderlab_beta_settings` and `generation_admission_reservations` are RLS-enabled/browser-revoked; privileged admission/settings routines use empty search paths and service-role-only execute. Safe singleton defaults are generation enabled, one active job and twelve admitted dispatches per rolling hour.
- Admission artifact `9731487718` (`renderlab-generation-admission-screenshots`, `sha256:e6e94bfabbd125c20c65aa959900a0081d6ca94bbd5b6d6a5b28fd817a09c3e7`) and Admin artifact `9731449736` (`renderlab-admin-operations-screenshots`, `sha256:66188b46f4249a7be6e7efba6f613331de07525f76b8a931f5ffbf85e3f56e81`) were human-reviewed on desktop/narrow layouts. Create/Activity denial feedback is readable without clipping or hierarchy drift; Admin global defaults remain compact inside the existing Generation controls section without provider/workflow/worker/raw-error exposure.
- Validation found and fixed test-orchestration issues rather than weakening product admission: only Admin + Generation Admission serialize singleton mutation; ordinary generation regressions use explicit run-owned test account overrides; Admission closes Chromium; Activity terminalizes only its accepted mock attempts before its later mobile Retry while preserving its deliberately active seeded job.
- Final exact live cleanup found zero run-owned access/job/source/media/upload/reservation/Auth rows and zero exact Admin invitation rows; `renderlab_beta_settings` was restored to `generation_enabled=true`, `max_active_jobs=1`, `max_jobs_per_hour=12`, `updated_by=null`. Security advisors add only expected server-owned RLS/no-policy INFO plus the pre-existing leaked-password WARN reserved for 10D; the singleton `updated_by` unindexed-FK performance INFO is non-actionable for a one-row table.
- Production `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED` remains off. No Vercel deployment, production UUID bootstrap, billing/credits, Cancel, provider controls or 10D hardening was included.

- PR #68 merged to `main` as `26508e77975ee4dd26f60860f999e4bc55c99eca`. Merged-main UI Shell `33310860293`, Reference Upload `33310860327`, Generation Integration `33310860295`, and Video Generation Integration `33310860292` all passed. A final exact audit of the three deterministic shared-resource accounts from those push runs found 0 access/job/source/media/upload/reservation/Auth rows, and `renderlab_beta_settings` remained `generation_enabled=true`, `max_active_jobs=1`, `max_jobs_per_hour=12`, `updated_by=null`.

### Post-Cycle-2 direction — LoRA/model extensibility
User-selectable LoRA support is an **accepted future product direction**, but it is deliberately outside Cycle 2. A later cycle should define external model discovery/import from sources such as Civitai/Hugging Face, durable LoRA library identity, base-model/workflow compatibility, version/hash/source/license metadata, safe download/cache/storage behavior, admin approval/policy, selector UX and generation strength (including any multiple-LoRA composition rules). Phase 7 architecture must remain able to represent optional model adapters later without exposing them prematurely.

### Cycle 2 execution gate
- Roadmap status: `ACCEPTED / REVISED FROM CLOSED-BETA FEEDBACK`.
- Cycle execution status: `IN PROGRESS`.
- Phase 6: `COMPLETE`; operating boundary: **Closed Beta**.
- Current completed phase contract: **Phase 9 — Activity v2 / Recovery & Job Control**, `EXPANDED / COMPLETE`; execution `COMPLETE / VERIFIED` under UI-050.
- Current phase contract: **Phase 10 — Account, Admin & Closed-Beta Operations**, `IN PROGRESS` under UI-051; **10A, 10B and 10C are COMPLETE / VERIFIED**.
- Remaining implementation sequence: **10D Auth/Operational Hardening**. It must be expanded/executed from merged 10C reality and preserve the shared-resource boundary; Phase 11 remains blocked until Phase 10 closes.
- Phase 8A acceptance: exact code/test head `34f9573eaabff6a91c780266ff03fedc9058df56` passed the complete 16-workflow minimum/affected set: UI Shell `33275470009`, Account Ownership `33275469977`, Library Collections `33275469972`, Library Favorites `33275470058`, Library Batch Delete `33275470041`, Library Lifecycle `33275469967`, Library Search `33275469987`, Library History `33275469981`, Library Drag Drop `33275469963`, Persistent Media Upload `33275794675`, Media Download `33275795313`, Media Rename `33275795970`, Media Delete `33275470098`, Create Lifecycle `33275469978`, Generation Integration `33275469986`, and Video Generation Integration `33275469940`. Configured Collections artifact `9721370669` (`sha256:26eb381867bf2b270363dbb8561c0cfbe93df873e2d191873b4aeda5bb208389`) was reviewed across desktop/narrow manager, empty, delete-confirmation, active-filter and Viewer-membership states; exact fixtures cleaned successfully and no deployment was created or authorized.
- Phase 8B acceptance: exact implementation head `e460a7e9e805ac9eb214277eb495adddd3c50f38` passed the complete 16-workflow minimum/affected set: UI Shell `33276766491`, Account Ownership `33276766501`, Library Collections `33276766508`, Library Favorites `33276766502`, Library Batch Delete/Actions `33276766476`, Library Lifecycle `33276766549`, Library Search `33276766510`, Library History `33276766481`, Library Drag Drop `33276766492`, Persistent Media Upload `33276766522`, Media Download `33276766512`, Media Rename `33276766480`, Media Delete `33276766497`, Create Lifecycle `33276766503`, Generation Integration `33276766505`, and Video Generation Integration `33276766504`. Configured Batch Actions artifact `9721752806` (`renderlab-library-batch-actions-screenshots`, `sha256:9dfebfad4a97aa79e6bd11a2b86de5071fa7a1e6739258d95688d37496b3adb0`) contains eight exact-head desktop/narrow organization, filter-reconciliation and Delete-regression screenshots; rendered review found Organize secondary to permanent Delete, target-state actions readable/touch-reachable, narrow wrapping clean and successful Favorite/Collection removal pruning truthful. The verifier cleaned 8 owner assets / 9 owner R2 objects and 1 foreign asset / 1 foreign R2 object, its cleanup-only step passed, and the unchanged Video Generation cleanup step passed. No schema or deployment change occurred.
- Phase 9A acceptance: exact code/test head `ab33e146ccaa7770f3dd66146708f01933cc0173` passed UI Shell `33279062584`, Activity `33279062575`, Account Ownership `33279062570`, Media Delete `33279062563`, Create Lifecycle `33279062581`, Generation Integration `33279062568`, and Video Generation Integration `33279062569`. Activity `33279062575` verified failed-only retry, two-account privacy, original-row immutability, distinct attempts, current parser/input revalidation, positional alias compatibility, legacy Video `480p` normalization and inactive tuning removal, source readiness, provider-metadata isolation and sanitized backend failures against a run-local authenticated mock backend with no generation spend. Final artifact `9722428767` (`sha256:65490c380fe35d5b6a186596cafa1d0706d181c6c827748aaaf8a9dc99e8dcbe`) contains ten desktop/narrow states and was visually reviewed clean after fixing the narrow feedback-wrap defect. Owner/foreign Auth/Supabase/media/source fixtures and cleanup-only verification passed. No schema migration, Cancel surface, shell-global polling or deployment was introduced.
- Phase 10 contract evidence: repository audit at merged `main` `ced9632e343a89ac9a815175835b6f3899eac10d` found Settings has only sign-in/sign-up/sign-out, no recovery/change-password flow, no RenderLab admin/role authorization abstraction, no account/admin/limit schema and no app-level generation rate/concurrency guard. The live shared Supabase project is `ACTIVE_HEALTHY`; Security Advisor still reports the expected server-owned RLS/no-policy informational notices plus the Phase 6 `auth_leaked_password_protection` warning. Current Supabase documentation confirms SSR recovery via PKCE/token-hash verification, server-only Auth admin APIs, plan-gated leaked-password protection, built-in Auth rate limits and custom-SMTP recommendations. UI-051 therefore uses a RenderLab-owned access registry rather than user-editable metadata or a scan/backfill of the shared Auth namespace.

- PR #51 merged as `7afe257b069e74d322d8f83c1a0868a30acd3686` from exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a`. The head passed Account Ownership, UI Shell, Create Durable Upload, Create Lifecycle, Library Lifecycle, Media Delete, Activity, Generation Integration and Video Generation; desktop/narrow reference artifacts were reviewed clean. Stable `@imageN` aliases, unresolved-alias blocking, structured alias/source/role persistence and deterministic native alias→worker-position translation are implemented.
- Phase 7B contextual audit run `33263044354` used run-owned synthetic adult references against merged application SHA `7afe257b069e74d322d8f83c1a0868a30acd3686`. Human review found FLUX preserved the edited subject strongly in the outfit-only case and represented both intended people with correct `@image1`/`@image2` left/right semantics even when physical request order was deliberately reversed. Fixtures were cleaned after artifact capture.
- Qwen contract audit `33263338596` verified the deployed gateway is ready, reports `multiple_references=true`, and accepts repeated multipart `image_files` on `/jobs/edit`. Qwen contextual run `33263401453` completed the same bounded cases but showed materially more facial/stylistic drift than FLUX. Therefore v0.1 keeps **FLUX as the internal Image Edit route**, leaves Qwen internal/unselected, and does not add a model selector.
- The accepted Phase 7B v0.1 product boundary is **at most two image references for Image output and at most one image reference for Video output**. For a two-image edit, request slot 1 is `primary-image` and slot 2 is `reference`; reordering may change those slot roles/order but must never change which durable asset an existing `@imageN` alias names. RenderLab guarantees mapping/validation, not deterministic model obedience.
- PR #53 implemented that boundary and merged as `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`. Polished product commit `360fa79ea85dd09ce90101518fedaca5645aaa71` and exact validation retrigger head `acf3f8e792c2b895a9999cca24060a1c33484463` have identical trees. The exact head passed Account Ownership `33266025758`, Create Durable Upload `33266025798`, Library Lifecycle `33266025756`, Activity `33266025837`, UI Shell `33266025763`, Media Delete `33266025759`, Video Generation `33266025764`, Create Lifecycle `33266025789`, and Generation Integration `33266025757`.
- Configured Create Lifecycle `33266025789` verified a second durable owner-scoped upload, replacement without alias churn, two-reference mention selection, `Make primary` reorder with alias identity preserved, correct submitted slot roles/order, two-reference Video blocking, unresolved-alias recovery and exact fixture cleanup. Desktop/narrow artifacts were reviewed after the responsive polish; narrow `Primary image` / `Reference image` labels remain readable and actions wrap without overflow. No schema, route, provider/model selector, infrastructure or deployment change was introduced.
- Configured Create Durable Upload run `33256497167` verified signed persistent upload → owner-scoped `media_asset` with no generation job → ordinary Library visibility → generation request binding through the same opaque `media-asset` identity → exact R2/database/Auth cleanup. No generation spend was required for that contract test.
- Source-aware geometry + curated ratio expansion merged through PR #47 as `de50efe6ba462ec604ea2cace741e11904a62425`. Exact implementation head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f` passed the complete 20-workflow retriggered affected suite, including Generation Integration `33259410952`, Video Generation Integration `33259411008`, Create Lifecycle `33259411062`, Library Lifecycle `33259411170`, UI Shell `33259410968` and Deployment Readiness `33259410991`. Earlier exact-head configured runs `33258831654` / `33258831636` explicitly verified real output geometry for Create Image 16:9 → Edit Original → Edit 4:5 and Create Video 16:9 → Animate Original from a 2:1 source; all generation/reference/media/Auth fixtures cleaned.
- The shared browser upload transaction now serves both Library and Create while feature-specific picker/drop validation remains feature-owned. User-facing Create no longer depends on temporary `generation_sources` for newly uploaded references; temporary-source APIs remain an internal compatibility/staging capability until separately retired.
- Composer hierarchy/de-crowding merged through PR #49 as `d324d7c8a520052d3c4bdc81f5f6c11edbdf50ee`. Exact implementation head `d52db83efb2af056e2e1598b54b988794ff19ab1` passed UI Shell `33261129925`, Create Lifecycle `33261129910`, Library Lifecycle `33261129917`, Account Ownership `33261129909`, Create Durable Upload `33261129940`, and Video Generation `33261129918`. Desktop/narrow artifacts were reviewed: Video duration/audio/Advanced are contextualized through maintained Dropdown Menu mechanics, Image/Video uses the maintained compact ToggleGroup, and Advanced expands below the primary controls/Generate row. No generation/API/schema/worker/route/deployment contract changed.
- Phase 7C live audit `33266905978` probed both configured REDGraft gateways plus primary runtime health without spawning generation. Primary/standby expose the same `/jobs/video` contract: one shared `prompt`, optional `negative_prompt`, `seed`, `resolution`, `duration_seconds`, `audio_enabled`, `aspect_ratio`, `frame_rate`, and at most one optional `image_file`; there are no structured storyboard/frame/scene/action/dialogue/speech/sound/audio-prompt/camera/shot fields. Runtime health remains ready on NVIDIA A10 with 480p/720p/1080p/2K and 24/25/30 fps. UI-047 therefore defers Director product UI rather than fabricating controls over an unstructured prompt.
- The same audit found live/source drift: deployed OpenAPI does not expose `steps` or `cfg`. A non-generating invalid-duration probe deliberately sent `steps=999` and `cfg=999`; the live endpoint ignored those extras and returned the duration validation error, proving they are not active deployed Video controls. The next Video slice must reconcile that product/UI contract before treating steps/guidance as effective Video tuning.
- Phase 7D implementation is complete and verified at exact code/test head `594ad7eb39a9d5eec1d2f0283ac6e327f86129b3`. UI Shell `33270777087`, Account Ownership `33270777089`, Media Delete `33270777092`, Activity `33270777133`, Create Durable Upload `33270777088`, Library Lifecycle `33270777082`, Generation Integration `33270777083`, Create Lifecycle `33270777086`, and Video Generation Integration `33270777081` all passed. The live matrix produced 854×480 / 1920×1080 / 720×1280 / 2304×1152 outputs for the 480p, 1080p, 720p portrait-audio and 2K Animate-Original cases respectively; timings are bounded samples, not SLAs. Contextual output review passed and exact run-owned fixtures were cleaned. No deployment was created or authorized. Phase 7 later closed after the separate Phase 7A premium interaction/motion pass was verified and merged through PR #58.
- Phase 7A premium interaction/motion is complete on PR #58 candidate exact head `51c293dad114c98754933ab192b13427a90d9570`. RenderLab now pins Motion for React `13.1.1` for feature-local Create spatial continuity: reference add/remove/reorder, Image↔Video contextual-control changes, operation/context copy, Advanced field changes and result arrival. Configured Create Lifecycle `33273370720` proved an in-flight layout transform for `Make primary`, settled `@image2` into the primary slot, verified reduced-motion mode changes settle with `transform: none`, uploaded artifact `9720784693` (`sha256:0bc1ce993c5c21feb3e00f8c8166c8e484b8dd0939633e8ccca5fb734cdf8f1d`) and cleaned its exact run-owned fixtures. Desktop reorder and narrow reduced-motion screenshots were reviewed clean. No backend, schema, provider, route, infrastructure or deployment contract changed.
- Phase 7B contextual acceptance requires real output artifacts, not only accepted requests or dimension checks: bounded synthetic-person outfit edits should preserve recognizable subject appearance, two-person multi-reference cases should visibly represent both intended people, and `@imageN`-directed prompts should be reviewed against the intended mapping. RenderLab guarantees deterministic mapping/validation, while model obedience and identity fidelity remain probabilistic and are evaluated truthfully rather than promised deterministically.
- Phase 7B/7C/7D must not bypass the Phase 7A input/media/composer foundations they depend on.

### Phase 6 verified baseline — 2026-08-29
- Audit starting `main`: `5072fe96495ea53d06f4891c6073b16203c819d2`. Vercel production remains READY on deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` from application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`; the repository delta from that production SHA through the audit-starting `main` is documentation-only, so there is no executable application drift.
- The latest production build passed the canonical Vercel environment preflight without exposing secret values. Fresh custom-domain verification returned the exact CNAME `736ea4abfec91fb9.vercel-dns-017.com`, HTTPS `200` from Vercel and a valid TLS certificate for `renderlab.faresuniform.uk`.
- Remote production audit run `33250031468` passed account session, two-account privacy/ownership, custom-domain persistent upload → Library → Viewer → Edit handoff, Create Image → durable Edit continuation, Create Video and Animate Image on the real production domain. Vercel reported no runtime errors during/after the audit and no deployment was created by the audit branch.
- At the Phase 6 audit baseline, deployed FLUX primary live-accepted and completed a two-reference edit (`reference_count=2`) while the then-current RenderLab UI still submitted at most one reference and the request parser lacked product count/role enforcement. Phase 7B subsequently closed that gap through UI-046 / PR #53; this bullet remains historical Phase 6 evidence rather than the current product contract.
- REDGraft live runtime health enables `480p`, `720p`, `1080p` and `2K`; `4K` is represented internally but disabled and is not a product capability. RenderLab currently submits Video at fixed `480p`. A bounded live `720p`, `16:9`, 5-second, 24-fps, audio-off probe produced a verified `1280×720` MP4.
- One bounded sample observed: account identity 7s, ownership 15s, custom-domain upload/media 16s, Create Image + durable Edit 91s, Create Video + Animate 155s, direct two-reference FLUX 12.6s and direct 720p Video 62.7s. These are audit samples, not SLAs. Provider per-generation cost and exact deployment-wide worker capacity are not reliably observable from current contracts and remain unresolved rather than estimated.
- RenderLab still has no app-level per-user generation rate/concurrency/abuse limit. Supabase security advisors remain the expected server-owned RLS-with-no-policy INFO notices plus a beta-readiness warning that leaked-password protection is disabled. This audit makes no Auth/config mutation.
- Final cleanup verified zero Phase 6 fixture rows and zero Phase 6 Auth users while preserving RLS, `owner_id NOT NULL`, zero browser grants, ownership/integrity triggers and latest migration `20260828221611 renderlab_media_asset_deletion`. Pre-existing non-fixture product data was left untouched.
- **Closed Beta** is the selected Cycle 2 operating boundary. Keep access controlled until Phase 10 addresses broader-access rate/concurrency/abuse controls and the Auth leaked-password-protection warning; broader beta remains a separate explicit decision.

### Approved product state
- Application shell: `APPROVED`.
- Create: `APPROVED`; complete configured browser lifecycle run `33031817744`.
- Library v0.1: `APPROVED`; credential-free run `33034606323`, configured lifecycle `33034606396`.
- Persistent Library upload: `APPROVED`, merged through PR #9 as `d306f2abd1831538c51692545d72db1e5e9e0814`.
- Library search v0.1: `APPROVED`, merged through PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`.
- Durable Media Download v0.1: `APPROVED`, merged through PR #11 as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`.
- Durable Media Rename v0.1: `APPROVED`, merged through PR #12 as `d76f0ce30502e2aff2384dcd168f07b2184768a4` after exact-head six-gate CI and clean shared-resource verification.
- Maintained UI primitive foundation / UI-026: `APPROVED`, merged through PR #13 as `5953934d5f67c16304be7493eda27c88e24c02cc`.
- Library history ordering v0.1 / UI-027: `APPROVED`, merged through PR #14 as `a7ecaa6a704e4378b31e694e5f21c5629920b520` after final documentation-head eight-gate CI, responsive screenshot review, clean fixture verification and green post-merge `main` UI Shell `33097463519`.
- Library drag-and-drop upload v0.1 / UI-028: `APPROVED`, merged through PR #15 as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`. Final exact head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`; responsive screenshots were re-reviewed, shared fixtures were verified clean, and merged `main` UI Shell `33109435978` passed.
- Account Identity Foundation v0.1 / UI-029: `APPROVED`, merged through PR #16 as `bcb20365db102252db51263968de96fc795be518`. Final exact head `55a5df4351b5f9f23bde7dc9b2e73213481dd9e2` passed Account Identity `33112405837`, UI Shell `33112405863`, Create Lifecycle `33112405840`, Library Search `33112405831`, Library History `33112405838`, Library Lifecycle `33112405858`, Library Drag Drop `33112405827`, Media Download `33112405889`, and Media Rename `33112405850`; responsive Settings screenshots and exact auth-fixture cleanup were reviewed clean. Merged `main` UI Shell `33113289145` and Reference Upload Integration `33113289156` passed.
- Create supports Create Image, Edit Image, Create Video and Animate Image.
- Durable generated and uploaded media share RenderLab `media_assets`, product APIs and opaque `media-asset` identity.
- Viewer/Create continuation is capability-derived and server-validates durable asset identity/action compatibility.
- Activity v0.1 / UI-035 is `APPROVED` and account-private over RenderLab `generation_jobs`.

### Active product slice
- None. Activity v0.1 / UI-035 remains complete and approved; the reported custom-domain upload failure and missing Video audio control were resolved as completed production-usability maintenance in PR #36 and PR #37.
- The Phase 5 Models/Workflows evaluation found no dedicated user-facing surface justified by the current verified capability set, and the capability audit found no additional approved capability-specific experience beyond Create/Viewer/Activity. Future new user goals require explicit new slices rather than speculative empty screens.

### Latest maintenance / production usability fixes
- Custom-domain browser upload CORS / PR #36 is complete. A user-visible `Failed to fetch` during signed direct-R2 upload from `https://renderlab.faresuniform.uk` was traced to missing browser-origin coverage, not to the upload API, authentication, ownership or durable-media model. The canonical configured upload-origin list now includes the custom production domain. Final head `a66bcff942efa82b9823f031b25487e97eeb3fa6` passed Library Lifecycle `33238196620` and Library Drag Drop `33238196599`, including a successful `204` PUT preflight plus a real upload lifecycle. PR #36 merged as `0d4f05980e78a3c3b29beb68e91ebf0e225d2815`; merged-`main` Generation Integration `33238360406`, Video Generation `33238360399`, and UI Shell `33238360429` passed.
- Video audio control / PR #37 / UI-036 is complete. Video output now exposes an explicit contextual Audio on/off control, default ON. The product request carries `output.audioEnabled`; image requests reject the video-only field; native REDGraft submission maps the validated value to worker `audio_enabled` rather than hardcoding audio on. Final head `5178ef95ab63e816925c66a3305c9c255708886e` passed all eight affected gates: Account Ownership `33239584670`, UI Shell `33239584665`, Create Lifecycle `33239584685`, Video Generation `33239584671`, Generation Integration `33239584676`, Media Delete `33239584663`, Library Lifecycle `33239584662`, and Activity `33239584661`. PR #37 merged as `713e8a6940c25fd0dc82994507537fe1a0d06b42`; merged-`main` Generation Integration `33239701484`, UI Shell `33239701487`, and Video Generation `33239701476` passed.
- Custom-domain DNS activation / 2026-08-29: Cloudflare now has a DNS-only `CNAME` for `renderlab.faresuniform.uk` targeting Vercel's assigned `736ea4abfec91fb9.vercel-dns-017.com`. The repository `CLOUDFLARE_API_TOKEN` is intentionally zone-DNS scoped and is not an R2-admin credential. R2 browser-CORS reconciliation must therefore fall back to the existing R2 S3 credentials when the generic Cloudflare token receives an R2 authorization `401`/`403`; a DNS-scoped token must not break upload verification.
- PR #36 and PR #37 add no schema migration and do not redesign Create or change the account/private-media ownership model. Automatic Git deployment remains disabled; repository merge is not implicit production deployment authorization.

### Latest completed product slice
- Activity v0.1 / UI-035 is **APPROVED**. PR #34 merged as `7e1e7c4e3c1dc1f6d226998e7d372715c2220bc4` after final exact head `f0a1100ea379a5aaba43d2694bb34496b563a1b2` passed all six affected gates: Activity `33223434378`, Account Ownership `33223434363`, UI Shell `33223434381`, Create Lifecycle `33223434428`, Generation Integration `33223434364`, and Video Generation `33223434355`.
- Activity is an owner-scoped recent-generation surface backed by RenderLab `generation_jobs`; it presents real persisted lifecycle state, sanitized product failures, newest-first 20-job pagination, lightweight refresh only while work is active, and Viewer result links only for still-active owner media. Worker/provider/workflow/failover metadata remains internal; UI-035 adds no cancellation/retry mutation, global job store or schema migration.
- Configured two-account verification proved signed-out/private isolation, pagination, active state, internal-error redaction, active/deleted result-link behavior, responsive rendering and exact cleanup. Desktop/mobile implementation artifacts were visually reviewed clean; the final exact head reran the same Activity lifecycle successfully after reduced-motion polish.
- Merged `main` checks UI Shell `33223633751`, Generation Integration `33223633631`, and Video Generation `33223633627` passed. Final shared-resource audit returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants and `20260828221611 renderlab_media_asset_deletion` still latest. Vercel listed zero deployments created after the merge, so automatic Git deployment remains disabled and UI-035 was not deployed separately.
- Models/Workflows and additional capability-specific surfaces were evaluated and are not justified as separate product screens by the current verified capability set.

### Previous completed product slice — Library Batch Delete
- Library Batch Delete v0.1 / UI-034 is **APPROVED**. PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8` after final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates: Library Batch Delete `33220710307`, Account Ownership `33220710301`, UI Shell `33220710365`, Create Lifecycle `33220710378`, Library Search `33220710297`, Library History `33220710393`, Library Lifecycle `33220710305`, Library Drag Drop `33220710389`, Persistent Media Upload `33220710300`, Media Download `33220710329`, Media Rename `33220710371`, Library Favorites `33220710303`, Library Collections `33220710404`, Media Delete `33220710375`, Generation Integration `33220710351`, and Video Generation `33220710347`.
- UI-034 keeps selection transient and current-page scoped (maximum 24 assets), composes the existing UI-033 tombstone/R2 deletion per item, and reports truthful partial success without rolling back completed deletions.
- Desktop selection/confirmation and mobile confirmation artifacts were visually reviewed clean. Final pre-merge and post-merge shared-resource audits both returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants, deletion guards/index intact, and `0009` still latest.
- Merged `main` checks UI Shell `33221101101`, Generation Integration `33221101106`, and Video Generation `33221101117` passed.
- Vercel listed zero RenderLab deployments created after the PR #29 merge; automatic Git deployment remains disabled and UI-034 was not deployed separately.
- No new schema migration was added. Cross-page selection, Trash/restore, batch Favorites/Collections and broader bulk-management remain separate future contracts.

### Previous completed product slice — Durable Media Delete
- Durable Media Delete v0.1 / UI-033 is **APPROVED**. PR #25 merged as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445` after final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed all 15 applicable gates: Media Delete `33218433320`, Account Ownership `33218433329`, UI Shell `33218433381`, Create Lifecycle `33218433291`, Library Search `33218433357`, Library History `33218433299`, Library Lifecycle `33218433285`, Library Drag Drop `33218433305`, Persistent Media Upload `33218433348`, Media Download `33218433296`, Media Rename `33218433406`, Library Favorites `33218433314`, Library Collections `33218433301`, Generation Integration `33218433335`, and Video Generation `33218433309`.
- `0009_media_asset_deletion.sql` is applied as `20260828221611 renderlab_media_asset_deletion`. Delete is tombstone-first and permanent to the user in v0.1; generation history retains opaque media IDs while R2 primary/thumbnail cleanup is retryable and auditable through `purged_at`.
- Desktop/mobile destructive confirmation artifacts were visually reviewed clean: Continue remains dominant, Favorite/Collections/Rename/Download stay intact, and Delete remains visually secondary.
- Merged `main` checks UI Shell `33218646377`, Reference Upload `33218646539`, Generation Integration `33218646527`, and Video Generation `33218646602` passed. Final post-merge Supabase cleanup returned all six RenderLab tables and configured fixture users to zero while retaining six RLS tables, six non-null owners, zero browser grants, deletion guards, nullable `deleted_at`/`purged_at`, the active-media index and `0009` as latest migration.
- Vercel listed zero RenderLab deployments created after the PR #25 merge; automatic Git deployment remains disabled and UI-033 was not deployed separately.
- UI-033 remains intentionally narrow: one Viewer-contextual permanent Delete. Batch/card selection, multi-delete atomicity, user Trash/restore/retention and collection deletion remain separate future contracts.

### Previous completed product slice — Library Collections
- Library Collections v0.1 / UI-032 is **APPROVED**. PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d` after final exact head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed all 14 applicable gates: Library Collections `33210501106`, Account Ownership `33210501089`, UI Shell `33210501226`, Create Lifecycle `33210501211`, Library Search `33210501182`, Library History `33210501191`, Library Lifecycle `33210501160`, Library Drag Drop `33210501202`, Persistent Media Upload `33210501130`, Media Download `33210501133`, Media Rename `33210501203`, Library Favorites `33210501168`, Generation Integration `33210501178`, and Video Generation `33210501167`.
- `0007_media_collections.sql` is applied as `20260828201740 renderlab_media_collections`; `0008_media_collection_asset_fk_index.sql` is applied as `20260828202601 renderlab_media_collection_asset_fk_index`. Collections remain server-owned with RLS enabled, zero browser grants, non-null immutable owners and database-enforced same-owner collection/media membership.
- Four fresh desktop/mobile Library/Viewer Collections artifacts were visually reviewed without hierarchy drift. Final pre-merge and post-merge audits both returned zero rows across all six RenderLab tables, zero fixture users, zero browser grants, six RLS-enabled tables, six `NOT NULL` owners, all nine ownership/integrity triggers and all expected Collections indexes.
- Merged `main` checks UI Shell `33210876059`, Reference Upload `33210876022`, Generation Integration `33210876042`, and Video Generation `33210876085` passed. Vercel listed zero RenderLab deployments created after the PR #24 merge; automatic Git deployment remains disabled and UI-032 was not deployed separately.
- Collections v0.1 remains intentionally narrow: named account-owned collections, many-to-many durable-media membership, one URL/server-owned Library collection filter and Viewer-only create/add/remove membership. Collection rename/delete, Library-card/batch membership and media Delete/batch remain separate future contracts.

### Previous completed product slice — Library Favorites
- Library Favorites v0.1 / UI-031 is **APPROVED**. PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431` after final exact head `4bd41d55af27c7240d75862424039fc59027988e` passed all 13 applicable gates: Library Favorites `33205471360`, Account Ownership `33205471266`, UI Shell `33205471298`, Create Lifecycle `33205471299`, Library Search `33205471263`, Library History `33205471326`, Library Lifecycle `33205471335`, Library Drag Drop `33205471286`, Persistent Media Upload `33205471255`, Media Download `33205471419`, Media Rename `33205471361`, Generation Integration `33205471331`, and Video Generation `33205471358`.
- The implementation-head suite `85460b7920afe66eee7ff35da03d4f43c9f207fd` also passed all 13 applicable gates before documentation finalization. Four fresh desktop/mobile Library Favorites and Media Viewer screenshots were visually reviewed without hierarchy drift.
- The final pre-merge and post-merge Supabase audits both found 0 core rows, 0 null owners, 0 RenderLab fixture users, 0 browser grants, four RLS-enabled core tables, four `NOT NULL` owner columns, all six UI-030 enforcement triggers, nullable `favorited_at`, and applied migration `20260828183102 renderlab_media_favorites` with its partial owner/favorite index intact.
- Merged `main` push checks UI Shell `33205766730`, Reference Upload `33205766693`, Generation Integration `33205766671`, and Video Generation `33205766691` all passed. Vercel listed zero RenderLab deployments created after the PR #23 merge; automatic Git deployment remains disabled and UI-031 was not deployed separately.
- Favorites v0.1 remains intentionally narrow: owner-scoped favorite metadata on existing durable `media_assets`, server-owned `favorite=true` Library filtering that composes with kind/search/sort/pagination, and one contextual Media Viewer toggle. Collections, Library-card/batch favorite actions, Delete/batch, new top-level navigation and a global client media store remain out of scope.

### Previous completed product slice — Core Account Ownership
- Core Account Ownership v0.1 / UI-030 is **APPROVED**. PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; owner-aware production deployment `dpl_DYs48pvBEvzDuDbHwcEn4f9LGabE` is READY at `https://renderlab-lake.vercel.app` from exact application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c`; corrected `0005` was applied as `20260828174940 renderlab_core_account_ownership_enforce` after live two-account verification and a zero-unowned-row audit.
- Validated implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed all 14 configured PR gates: Account Ownership `33131090207`, Account Identity `33131090197`, UI Shell `33131090250`, Create Lifecycle `33131090243`, Library Search `33131090279`, Library History `33131090264`, Library Lifecycle `33131090245`, Library Drag Drop `33131090242`, Persistent Media Upload `33131090265`, Media Download `33131090206`, Media Rename `33131090198`, Reference Upload `33131090263`, Generation Integration `33131090251`, and Video Generation `33131090262`.
- Final PR documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured gates again before merge. PR #17 then merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; push-triggered `main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` all passed.
- The staged `0005_core_account_ownership_enforce.sql` was corrected after rollback-only semantic testing found an invalid shared trigger-field reference. Table-specific owner-link triggers pass same-owner, cross-owner, null-owner, owner-immutability, Auth-delete restriction and existing FK cleanup compatibility simulations against the live prepared schema.
- The optional external generation adapter requires both `RENDERLAB_GENERATION_BACKEND_URL` and server-only `RENDERLAB_GENERATION_BACKEND_TOKEN`; submit and poll authenticate with that token before forwarding the owner header. Native generation remains the fallback when the external pair is incomplete.
- Shared Supabase has both ownership migrations applied: `20260827203604 renderlab_core_account_ownership_prepare` and `20260828174940 renderlab_core_account_ownership_enforce`. All four owner columns are `NOT NULL`; six UI-030 enforcement triggers and their three functions are active; RLS remains enabled; browser roles still have no raw core-table grants; final cleanup left 0 core rows and 0 RenderLab fixture Auth users.
- The repository is public, which resolved the previous private-repository hosted Actions capacity failure. Mid-development validation remains GitHub-first. Repository `vercel.json` disables automatic Git deployments and pins `framework: nextjs`; `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration. During the authorized rollout the Vercel project preset was corrected to Next.js and the stale explicit `dist` output override was removed. Automatic Git deployment remains disabled, so production deployment is still explicit only.
- Deployment Readiness v0.1 merged through PR #18 as `2b8a5170df0675a691deb8d5a7031f1dc14d803b`. Exact candidate `da7f9c23224f5a03ba0832fe8fcd773d1586e0c2` passed all 15 configured gates; merged `main` Deployment Readiness `33137972011`, UI Shell `33137972042`, Reference Upload `33137972130`, Generation Integration `33137972033`, and Video Generation `33137972021` all passed. Vercel created no deployment for the PR #18 merge. During the later authorized rollout the dashboard project preset was corrected from Vite to Next.js and the stale `dist` output override was removed while repository `vercel.json` continued to disable automatic Git deployments. Final post-merge Supabase audit found 0 core rows, 0 null owners, 0 RenderLab fixture users, 0 browser core-table grants, four still-nullable owner columns, 0 enforcement triggers, and migration history still ending at applied `0004`.
- UI-030 provides the enforced ownership boundary used by approved Favorites v0.1 / UI-031 and approved Collections v0.1 / UI-032; Delete/batch remains a separate blocked management contract pending destructive cleanup/recovery semantics.

Do not redesign approved surfaces merely because new media capabilities or ownership enforcement are added.

## Maintained UI Primitive Contract
UI-026 makes maintained conventional controls a repository-enforced frontend foundation rule.

- `components.json` configures shadcn `radix-nova`.
- `src/components/ui` owns normalized Alert, AlertDialog, Button, Checkbox, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle and ToggleGroup primitives.
- Conventional visible controls in `src/features` and `src/components/shell` compose those approved primitives rather than hand-styled raw native controls.
- Native `file` and `hidden` inputs remain allowed as browser/form plumbing.
- Local wrappers own RenderLab tokens, variants, spacing, required semantic elements and product accessibility adaptations; features should not rebuild the same mechanic independently.
- Correct maintained accessibility semantics are authoritative. Create Image/Video is a required Radix single-choice `radiogroup` with checked `radio` items; Library history ordering uses maintained Radix Dropdown Menu radio items.
- `npm run verify:ui-purity` rejects raw visible button/select/textarea/ordinary-input controls in feature/shell code and runs in UI Shell CI.
- Shared primitive/config/package changes retrigger the dependent Create, Library Search, Library Lifecycle, Library History, Download, Rename and Shell regressions.

PR #13 was foundation-only and preserved approved Create/Library/Viewer/shell product behavior. Implementation head `36ee8e8eb80645d1389afa749a36b493e2abbb61` passed UI Shell `33088086901`, Create Lifecycle `33088086892`, Library Search `33088086914`, Library Lifecycle `33088086872`, Media Download `33088086907`, and Media Rename `33088086871`. Final-code UI Shell and Library lifecycle desktop/mobile screenshots were visually inspected with no unintended hierarchy/layout drift. Library lifecycle verified real Upload → Library → Viewer → Edit continuation, correct Radix Image selection, 400×300 media geometry and self-cleanup.

Final exact PR head `89dc69e394bf467227e0131432c301050d718999` passed UI Shell `33089808029`, Create Lifecycle `33089808086`, Library Search `33089807606`, Library Lifecycle `33089807890`, Media Download `33089807786`, and Media Rename `33089807776`. Create Lifecycle attempt 1 was blocked before browser execution by a transient Microsoft Ubuntu apt-repository 403 during Playwright dependency installation; unchanged attempt 2 completed successfully. Direct pre-merge cleanup found `0` upload sessions, no recent RenderLab-named test media assets and no remaining configured Create lifecycle test job. PR #13 merged as `5953934d5f67c16304be7493eda27c88e24c02cc`; post-merge `main` UI Shell `33092354072` and Reference Upload Integration `33092353971` both passed.

## Account Identity Foundation v0.1 Contract
UI-029 establishes a real RenderLab account principal while deliberately leaving media/job ownership enforcement to the next slice.

- Supabase Auth `auth.users.id` is the canonical account identity.
- Settings owns the initial email/password sign-in, account-creation and sign-out experience.
- Browser/server sessions use maintained Supabase SSR cookie handling; root `proxy.ts` refreshes sessions and server identity is read from verified claims.
- Browser code receives only the public Supabase project URL and publishable key; service-role credentials remain server-only.
- Existing Create and Library behavior is not gated or redesigned by this slice.
- UI-029 does not add owner columns, account-scoped media queries, Favorites/Collections, Delete/batch behavior or a schema migration.

Final exact PR head `55a5df4351b5f9f23bde7dc9b2e73213481dd9e2` passed Account Identity `33112405837`, UI Shell `33112405863`, Create Lifecycle `33112405840`, Library Search `33112405831`, Library History `33112405838`, Library Lifecycle `33112405858`, Library Drag Drop `33112405827`, Media Download `33112405889`, and Media Rename `33112405850`. Account Identity created one run-owned confirmed Supabase user through the server-only Auth admin API, signed in through the actual Settings UI, verified cookie persistence across reload, rendered desktop/mobile signed-in states, signed out, rendered the mobile signed-out state and deleted the exact fixture. Direct final cleanup found `0` account CI users and zero shared Library drag/drop/lifecycle fixtures. PR #16 merged as `bcb20365db102252db51263968de96fc795be518`; merged `main` UI Shell `33113289145` and Reference Upload Integration `33113289156` both passed.

## Core Account Ownership v0.1 Contract
UI-030 owner-scopes the existing core persistence model without introducing a parallel account-media system.

- Supabase Auth `auth.users.id` / verified `claims.sub` is the canonical owner identity.
- `generation_sources`, `generation_jobs`, `media_assets` and `media_upload_sessions` carry `owner_id -> auth.users.id ON DELETE RESTRICT`.
- Raw core tables remain server-owned: RLS stays enabled, `anon`/`authenticated` have no direct table grants, and product routes/services use the server-only service role after resolving verified account context.
- Private media list/read/rename/content/thumbnail/download, upload ticket/completion, reference ticket/completion, generation submission/polling and generation input resolution are owner-scoped.
- New pending/durable records receive the authenticated owner; generated output media inherits the generation job owner.
- Foreign opaque media/job/upload/reference IDs resolve like ordinary not-found records; ownership is not disclosed.
- Create may hold a signed-out draft, but persistent upload/generation actions require a verified non-anonymous account.
- An optional external RenderLab generation backend is trusted only when both `RENDERLAB_GENERATION_BACKEND_URL` and server-only `RENDERLAB_GENERATION_BACKEND_TOKEN` are configured. RenderLab authenticates submit/poll calls with that bearer token; the external service must verify it before trusting `x-renderlab-owner-id`. A URL without the token does not activate the external path.
- The prepare migration allowed nullable owners during rolling deployment. Applied `0005` now rejects unowned rows, requires owner non-null/immutable, and enforces the table-specific same-owner relational guards.
- The required enforcement sequence was owner-aware application live first, then a final no-unowned-row audit, then `0005`; the completed production rollout followed that order.
- Configured fixtures are isolated by deterministic test owner; cleanup reconstructs DB/R2 state by owner, deletes in dependency order, then removes the Auth fixture. Active workflows must not perform namespace-wide service-role deletion across owners.

Validated implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed all 14 configured PR gates, including the two-account Account Ownership gate, owner-bound upload/reference/generation persistence, signed-out denial, foreign opaque-ID denial, real browser Library/Viewer/Create lifecycles, generated image/video flows, Download/Rename, responsive UI artifacts and exact cleanup. The resumed suite exposed one verifier-only issue: Playwright's header override followed product-media 302 redirects and leaked the fixture bearer to signed R2 requests. The shared helper now authenticates the local route with a non-following fetch and lets Chromium follow the signed external redirect cleanly; the four affected lifecycle tests all pass after that fix.

Corrected `0005` was applied after exact application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` became READY in production and live two-account Account Ownership run `33196254711` passed. Migration `20260828174940 renderlab_core_account_ownership_enforce` makes all four owners `NOT NULL`, binds four owner-immutability triggers plus the media→job and upload→asset same-owner guards, and preserves RLS/no-browser-grant boundaries. Post-enforcement production run `33196534150` passed the same two-account isolation suite and cleanup; final shared-resource audit found zero core rows and zero RenderLab fixture Auth users. Supabase security advisors still report only the expected informational no-policy notices for these deliberately server-owned tables; performance notices remain unused-index INFO findings on empty/low-traffic tables.

**Core Account Ownership v0.1 status: `APPROVED`; owner-aware production is live, corrected `0005` is applied and verified, post-enforcement two-account isolation is green, and final shared-resource cleanup is clean.**

## Persistent Media Upload Contract
UI-022 defines the approved durable upload model.

- Durable user uploads are ordinary `media_assets` with `origin = uploaded`.
- Pending direct-to-R2 transfer state belongs to server-side `media_upload_sessions`.
- `generation_sources` remains temporary generation/reference state; legacy Saga `studio_uploads` is not reused.
- Migration `0003_persistent_media_uploads.sql` is applied as `20260827031630 renderlab_persistent_media_uploads`.
- Browser upload is ticket → signed R2 PUT → completion → server HEAD verification → durable asset promotion.
- PNG/JPEG/WebP up to 25 MB are supported.
- Unicode filenames are preserved after control/path cleanup and length bounding.
- Concurrent completion races recover to the unique durable asset winner.

## Library Drag-and-Drop Upload v0.1 Contract
UI-028 adds a second interaction path into UI-022 without changing persistence.

- The ordinary visible Upload button + native file picker remain the keyboard/touch/mobile baseline.
- Desktop file drag over Library reveals a temporary full-surface drop affordance; there is no persistent dropzone.
- Exactly one PNG/JPEG/WebP image up to 25 MB is accepted per drop; multi-file drops fail locally before ticket creation.
- Picker and drop use the same feature-owned `library-upload-client.ts` transaction: upload ticket → signed R2 PUT → completion → durable `media_assets` promotion.
- Success refreshes the server-owned Library and announces completion; errors stay local. No global media store or toast framework is introduced.
- Configured verification is serialized with the shared Library upload fixture lock, uses run-unique fixtures, and asserts exactly one ticket/completion/session/asset/card.
- Under UI-030 configured verification cleanup is additionally owner-scoped; the active Drag Drop workflow no longer runs namespace-wide destructive cleanup across owners.
- Drag/drop adds no schema migration, account/organization state, Delete/batch framework or new R2/CORS contract.

Final exact PR head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`. Drag Drop `33109026739` verified pre-run namespace cleanup, real DataTransfer upload through ticket → signed R2 PUT → completion, exact one session/asset/card, and post-run cleanup using the run-unique fixture `renderlab-drop-33109026739-اختبار-画像.png`. Desktop drag-active/completed and mobile completed screenshots were re-reviewed with no hierarchy drift. Direct Supabase cleanup after the exact-head suite found `0` drag/drop sessions, `0` drag/drop assets, `0` legacy lifecycle sessions and `0` legacy lifecycle assets. PR #15 merged as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`; push-triggered merged `main` UI Shell `33109435978` passed.

## Library Search v0.1 Contract
UI-023 defines durable-media discovery.

- Search state is shareable URL parameter `q`.
- Search is server-owned against durable `media_assets`, not a client-only current-page filter.
- Queries are whitespace-normalized and capped at 120 characters.
- Matching is case-insensitive literal substring across `display_name`, `original_filename`, and generated `provenance.prompt`.
- Search composes with All/Images/Videos and URL-owned chronological ordering/pagination.
- v0.1 adds no relevance ranking, model/date filters, command palette, collection schema or dedicated search service/index.

PR #10 passed implementation and documentation-finalized Search/upload/lifecycle/UI gates before merge. Post-merge main shell `33070215358` passed.

## Durable Media Download v0.1 Contract
UI-024 defines Download as a contextual product-media action.

- Media Viewer exposes one secondary `Download` action for durable generated/uploaded media.
- `/api/media/assets/[assetId]/download` reloads the durable asset and redirects to a short-lived signed R2 GET with attachment `Content-Disposition`.
- RenderLab does not proxy media bytes through the application server and never treats raw R2 identity as product identity.
- Uploaded downloads preserve a sanitized Unicode basename with canonical extension from verified MIME.
- Generated downloads use deterministic `renderlab-<kind>-<id-prefix>.<ext>` names rather than prompts/storage keys.
- v0.1 adds no Library-card Download or batch framework.

PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef` after implementation and documentation-finalized configured verification; `main` remained green.

## Durable Media Rename v0.1 Contract
UI-025 defines Rename as durable display identity, not file/storage mutation.

### Product behavior
- Media Viewer exposes `Rename` beside Download under secondary **Actions**.
- Rename changes only `media_assets.display_name` through `PATCH /api/media/assets/[assetId]`.
- Names remove control characters, collapse whitespace, must remain non-empty and are capped at 240 characters.
- Original uploaded filename, MIME, R2 storage key, generated provenance/prompt and Download filename semantics remain unchanged.
- Library search immediately discovers the new display name because `display_name` is already part of UI-023.
- The edit UI is feature-owned inline Viewer state; Rename and Download remain side-by-side while the form expands beneath them.
- v0.1 adds no Library-card rename, modal framework, global store, delete, batch actions, favorites/collections or database migration.

### Verified approval evidence
Final exact-head `70cbcc4daeafb9a48c0253df38796811d4cf4f03` passed UI Shell `33077320919`, Library Search `33077320839`, Persistent Media Upload `33077320935`, Media Download `33077320886`, Media Rename `33077321228`, and Library Lifecycle `33077320976`. Direct Supabase cleanup immediately before merge found `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions. PR #12 merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`.

The configured Library lifecycle is serialized with `concurrency: renderlab-library-lifecycle-shared` and targets the exact durable asset ID returned by its own upload completion while separately asserting the expected human display name. Fixture-name uniqueness is not a correctness assumption.

## Library History Ordering v0.1 Contract
UI-027 defines the approved chronological history control.

- URL state is `sort=newest|oldest`; Newest first is canonical and omitted from clean links.
- Ordering is server-owned against durable `media_assets`; it is not client-only sorting of the current page.
- `created_at` and `id` use the same direction to keep pagination deterministic.
- Sort composes with `q`, All/Images/Videos, Clear and `offset`; changing sort drops stale offset.
- Pagination labels follow the active direction so `Newer` / `Older` remain truthful.
- The visible selector is feature-owned `LibrarySortMenu` composed from the maintained shadcn/Radix Dropdown Menu primitive.
- No schema migration, global client media store, relevance ranking, model/date filter console, Favorites/Collections, Delete or batch framework is introduced.

Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`. Desktop Oldest, open Dropdown menu and mobile Newest screenshots were visually reviewed without unintended hierarchy drift. Direct Supabase verification found `0` history fixtures and `0` upload sessions.

Final exact documentation head `cae17cb2850f3a995bbe3d106669ce651e3e0aa1` passed UI Shell `33097006928`, Create Lifecycle `33097006913`, Persistent Media Upload Integration `33097007064`, Library Lifecycle `33097006853`, Library Search `33097007092`, Library History `33097006833`, Media Download `33097006968`, and Media Rename `33097006959`. PR #14 merged as `a7ecaa6a704e4378b31e694e5f21c5629920b520`; the merged `main` UI Shell run `33097463519` passed.

UI-030 ownership enforcement is complete in production and Favorites v0.1 / UI-031 is approved as the first owner-scoped personal-organization slice. Collections remains a separate future contract. Delete remains deliberately deferred until database/R2/reference-history cleanup plus recovery/tombstone semantics are defined.

## R2 Browser CORS State
The admin-capable R2 access-key credentials manage the exact-origin `renderlab-browser-uploads` rule through the S3 API for:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-lake.vercel.app`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

Download uses product-route → signed-R2 top-level GET navigation. Rename is a server-side Supabase metadata mutation and introduces no R2 object write/move or new CORS requirement. History ordering is a server-side Supabase query concern and adds no R2/CORS requirement. Drag/drop reuses the same direct browser PUT origin policy as the approved Upload button and introduces no new CORS surface.

If a future user-facing production origin changes, add that exact origin before serving direct browser uploads there. Do not use broad wildcard CORS or replace direct-to-R2 transfers with an application-server proxy merely for convenience.

## Still Open in Phase 4
No Phase 4 product slice is active. Remaining follow-ups, in order:
- evaluate Collections only through a separate RenderLab-owned organization contract if/when that slice is explicitly selected;
- delete and batch management only after durable storage/reference/recovery semantics are explicit;
- other Library interaction enhancements only when separately justified.

Do not infer Saga organization/destructive-action schemas automatically. UI-030 is complete; future personal organization must continue using the verified account-private product boundary rather than global flags or legacy `studio_*` state.

## Infrastructure Cleanup Still Open
- Remove the transitional Studio compatibility adapter once no migration/debugging requirement depends on it.
- Keep capability definitions/native workflow defaults aligned as backend capability grows; do not expose controls merely because a worker accepts them.
- If the eventual public RenderLab origin differs from currently configured stable Vercel domains, add the exact origin to R2 CORS before direct browser upload use.

## Source of Truth
The `renderlab` repository is authoritative. ChatGPT Project context is secondary continuity context and current conversations are temporary working context.

See:
- `AGENTS.md`
- `docs/ui/UI_MIGRATION.md`
- `docs/ui/UI_DECISIONS.md`
- `docs/ui/SCREEN_REGISTRY.md`
- `docs/architecture/FRONTEND_ARCHITECTURE.md`
- `docs/architecture/INFRASTRUCTURE.md`
