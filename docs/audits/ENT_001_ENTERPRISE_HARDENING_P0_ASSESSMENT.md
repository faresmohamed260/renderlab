# ENT-001 — Enterprise hardening P0 reassessment

Date: 2026-10-05
Status: post-implementation assessment / superseded for current enterprise score by ENT-002
Implementation merge: `966f2813c8a2bc6551310d17d0791752ca09c6d5`
Current follow-on assessment: `ENT_002_CI_SUPPLY_CHAIN_HARDENING_ASSESSMENT.md` (8.2/10 after ENT-002)
Baseline audit head: `f9bebb81bff8c7f0b2046f977a693a2b58c12091`

## Executive result

The original repository-wide enterprise engineering audit scored RenderLab **7.8/10** overall and identified five immediate P0 hardening needs before materially expanding access:

1. decode/validate uploaded media server-side;
2. derive image geometry server-side;
3. bound decoded image dimensions/pixel count;
4. bound prompt and negative-prompt length;
5. add standard HTTP/browser security headers and CSP.

ENT-001 closes those five source-level P0 findings without changing RenderLab's server-owned generation lifecycle, authorization architecture, Supabase/R2 topology, worker routing, or deployment state.

My post-ENT-001 enterprise-engineering assessment is **8.1/10**.

That is a deliberate, conservative increase of **+0.3 points** rather than a claim that RenderLab is now a mature enterprise platform. The highest-risk application-boundary weaknesses improved materially, but CI/workflow sprawl, conventional coverage measurement, observability, disaster recovery, developer portability, and large-module maintainability remain substantially unchanged.

> This assessment is for the merged repository state. ENT-001 was **not deployed** as part of this work, so the production site should not be credited with the new HTTP headers or upload behavior until a separately authorized exact-SHA deployment and production verification occurs.

## What changed

### Media/storage trust boundary

Before ENT-001, upload completion verified ticket byte size and R2 `Content-Type` metadata but did not prove that the object was actually a valid image. Client-provided width/height could become durable geometry.

After ENT-001, newly completed PNG/JPEG/WebP media and references:

- are read back from R2 server-side before promotion;
- are decoded with Sharp;
- must have an actual decoded format matching the signed ticket MIME type;
- must be single-frame/non-animated;
- are bounded to 8,192 px per edge and 33,554,432 decoded pixels;
- undergo a full pixel decode so header-only/truncated payloads do not pass merely because metadata parses;
- persist server-derived width/height rather than client geometry;
- fail closed and best-effort delete the run-owned R2 object when verification fails.

The public completion request shape remains compatibility-preserving, but its geometry fields are no longer authoritative.

### Generation request bounds

The server generation contract now caps both:

- prompt: **8,000 characters**;
- negative prompt: **8,000 characters**.

The bounds are enforced before persisted generation intent/provider dispatch.

### Browser/HTTP hardening

The Next.js source configuration now:

- disables `X-Powered-By`;
- enforces Content Security Policy with restrictive `base-uri`, `object-src`, `frame-ancestors`, and other source directives;
- sends `X-Frame-Options: DENY`;
- sends `X-Content-Type-Options: nosniff`;
- sends `Referrer-Policy: strict-origin-when-cross-origin`;
- sends a restrictive `Permissions-Policy` for camera, microphone, geolocation, payment, and USB.

Development-only `unsafe-eval` is not included in the production CSP path.

## Verification evidence

The final implementation head before merge was `59a88960b307d23754f1c247c88719555b45eff9`.

Verified at that head:

- **Engineering Quality** passed, including lint, TypeScript, 62/62 unit tests, negative-gate fixtures, Modal ownership verification, UI primitive verification, and production build.
- Lint finished with the repository's existing **17 warnings / 0 errors**; ENT-001's temporary nullable-spread warnings were removed before merge.
- **Reference Upload Integration** passed with a real signed R2 upload while deliberately submitting false client geometry; completion returned the server-decoded 1×1 geometry.
- **Persistent Media Upload Integration** passed with the same non-authoritative-geometry proof.
- **Deployment Readiness**, **Account Ownership**, **Image Model Routing**, **Create Lifecycle Visual**, **UI Shell Validation**, and **Integrated Release** passed on the final head.
- The same implementation had already passed Generation Integration, Generation Reconciliation, Maintenance Integration, Image Upscale Integration, and the broader release/lifecycle set before the final two lint-only metadata-spread edits. Those final edits did not change generation, worker, database, request, or decode semantics.
- One final-head Library Drag Drop visual run was cancelled by workflow concurrency rather than failing; the same functional code had already passed that visual workflow before the lint-only edits.

No Supabase schema, Auth policy, R2 configuration, provider routing, secret, scheduler, or production deployment was changed.

## Before/after scorecard

| Area | Baseline | Post ENT-001 | Change | Reason |
|---|---:|---:|---:|---|
| Architecture | 8.8 | 8.8 | — | Core architecture was already strong and intentionally preserved. |
| Authentication / identity | 9.1 | 9.1 | — | No auth changes. |
| Authorization / ownership | 8.8 | 8.8 | — | Owner/service-role model preserved. |
| Database security | 8.8 | 8.8 | — | No schema/RLS/RPC security change. |
| Generation lifecycle | 9.2 | 9.2 | — | Durable lifecycle preserved. |
| API/input contracts | 8.2 | **8.7** | +0.5 | Prompt and negative-prompt resource bounds are now explicit server contracts. |
| Media/storage integrity | 6.8 | **8.5** | +1.7 | Full server decode, actual-format verification, single-frame and decoded-geometry bounds, server-derived geometry, fail-closed cleanup. |
| Dependency security | 8.8 | 8.8 | — | No supply-chain phase in ENT-001. |
| Application security hardening | 7.0 | **8.3** | +1.3 | CSP, anti-framing, nosniff, referrer/permissions policy and powered-by removal are now source-enforced. CSRF/origin defense remains open. |
| CI/CD | 8.0 | 8.0 | — | Verification remained strong; workflow duplication was not addressed. |
| Automated testing | 7.9 | **8.3** | +0.4 | 62 unit tests plus stronger upload/security boundary integration evidence. Coverage measurement remains absent. |
| Frontend engineering | 8.0 | 8.0 | — | No frontend architecture refactor. |
| Maintainability | 6.9 | 6.9 | — | God modules/workflow/docs complexity remains. |
| Developer experience | 7.1 | 7.1 | — | Windows/WSL and EOL parity remain open. |
| Observability | 6.7 | 6.7 | — | Durable telemetry sink/alerts remain open. |
| Operations / DR | 6.1 | 6.1 | — | Restore/runbook/RPO/RTO work remains open. |
| Documentation | 7.5 | **7.8** | +0.3 | Current architecture/status docs now record the hardened trust boundary, but broader documentation sprawl remains. |
| Release governance | 8.0 | 8.0 | — | Existing exact-SHA discipline preserved; no team-governance phase. |

The arithmetic mean of the category scores moves from approximately **7.87** to **8.11**, which supports the rounded overall reassessment of **8.1/10**.

## Remaining weak points

### P1 — highest-value next cycle

1. **Upload admission/abuse controls** — cap pending upload sessions per account and rate-limit upload-ticket creation; consider retained-storage quotas later.
2. **Centralized same-origin mutation defense** — add an Origin / `Sec-Fetch-Site` guard for cookie-authenticated state-changing routes.
3. **CodeQL** — add JS/TS code scanning.
4. **CI simplification** — convert remaining `npm install` workflows to deterministic `npm ci`, then extract reusable setup/workflow building blocks.
5. **Action supply-chain hardening** — SHA-pin GitHub Actions after compatibility verification and let Dependabot maintain the pins.
6. **Explicit server module boundaries** — add `server-only` to secret/data-bearing server modules where appropriate.
7. **Cross-platform test/dev parity** — normalize EOL behavior, add `.gitattributes`, and establish one supported local development mode.
8. **Coverage measurement** — publish line/function/branch coverage first; add realistic gates only after measuring the baseline.
9. **Persistent observability** — route the existing structured diagnostics model to a durable telemetry backend with actionable alerts.
10. **Operations/DR runbook** — document provider outage, credential compromise, backup/restore verification, RPO/RTO, and escalation assumptions.

### P2 — maintenance cost reduction

- decompose `create-workspace.tsx` into state/reference/submit/result controllers plus composition;
- split native generation input preparation, routing/transport, normalization and finalization;
- reduce global CSS to genuinely global concerns;
- separate current architecture truth from ADR/history/audit evidence;
- add CODEOWNERS/review governance when a second maintainer meaningfully joins;
- close confirmed obsolete PRs/branches.

## Enterprise interpretation

RenderLab is now materially safer at the two boundaries that were most exposed in the original audit: **untrusted uploaded bytes** and **browser-facing HTTP policy**. It also has an explicit request-size boundary for generation text.

The repository should no longer be assessed as having a weak media-integrity model merely because R2 reports the MIME type the client supplied. The server now establishes media truth from decoded bytes before durable promotion.

However, the project is still below mature multi-team enterprise readiness because the lowest scores remain largely untouched:

- maintainability: 6.9;
- observability: 6.7;
- operations/DR: 6.1;
- developer experience: 7.1;
- CI/CD remains comprehensive but operationally expensive.

The next enterprise-hardening cycle should therefore resist further feature/security scatter and concentrate on **CI simplification + CodeQL/supply-chain controls + developer parity + durable observability/operations**, followed by module decomposition. That sequence attacks the remaining readiness ceiling without destabilizing RenderLab's strongest architecture: owner-verified server authority and durable generation lifecycle management.
