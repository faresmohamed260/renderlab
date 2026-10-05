# ENT-001 — Enterprise hardening P0 contract

Date: 2026-10-05
Status: execution contract

## Goal
Close the highest-risk application-boundary findings from the 2026-10-04 enterprise engineering audit without changing RenderLab's product UX, generation lifecycle ownership, shared infrastructure topology, or deployment state.

## Verified starting state
- Baseline repository head: `f9bebb81bff8c7f0b2046f977a693a2b58c12091`.
- Media and reference upload completion validate ticket byte size and R2 `Content-Type`, but they do not decode the uploaded object before durable registration/readiness and currently accept client-supplied width/height as stored geometry.
- The existing Upscale source path already demonstrates server-side Sharp decoding, actual-format verification, single-frame enforcement, and geometry validation; ENT-001 should reuse that philosophy rather than invent a second trust model.
- Generation request parsing requires a non-empty prompt but does not bound prompt or negative-prompt length.
- `next.config.ts` does not currently define the requested application security headers and does not disable `X-Powered-By`.

## User value
Uploaded images become trustworthy durable media rather than metadata-trusted blobs, generation requests have explicit resource bounds, and browsers receive a stronger default security posture without changing normal product workflows.

## In scope
1. **Uploaded-image integrity**
   - Read the uploaded R2 object server-side after ticket/HEAD verification and before durable media registration or reference readiness.
   - Decode with Sharp and require an actual PNG, JPEG, or WebP format matching the ticket MIME type.
   - Reject animated/multi-page inputs.
   - Derive persisted width/height from decoded media, never from client geometry.
   - Enforce explicit input edge and decoded-pixel ceilings suitable for RenderLab's current image workflows.
   - Delete the run-owned R2 object and mark the upload/source failed when validation fails.
   - Preserve the existing public completion request shape for compatibility; client-supplied width/height may remain accepted but are non-authoritative.

2. **Generation text bounds**
   - Add explicit product constants for maximum prompt and negative-prompt lengths.
   - Reject over-limit requests at the server generation contract before persistence/provider dispatch.
   - Preserve existing trimming and unresolved-reference behavior.

3. **HTTP/browser hardening**
   - Disable the Next.js powered-by header.
   - Add `X-Content-Type-Options`, `Referrer-Policy`, anti-framing protection, and a minimal `Permissions-Policy`.
   - Introduce Content Security Policy in a compatibility-conscious form. If an enforced policy cannot be proven safe through the existing build/runtime validation, begin with Report-Only rather than risk breaking the application.

4. **Verification and authoritative documentation**
   - Extend unit/contract coverage for new text and media validation boundaries where practical.
   - Extend existing media/reference verification scripts so the trust-boundary behavior is exercised by repository CI rather than documented only in prose.
   - Update current architecture/capability/infrastructure documentation to describe verified behavior, not planned behavior.

## Explicitly out of scope
- Upload-session quotas/rate limiting or retained-storage quotas.
- A new CSRF/origin mutation guard.
- CodeQL, action SHA pinning, bulk `npm install` → `npm ci` migration, or workflow consolidation.
- Test coverage infrastructure, Windows/WSL development policy, observability vendors, disaster-recovery runbooks, CODEOWNERS, or signing policy.
- Decomposition of Create, generation orchestration, account lifecycle, or global CSS.
- Supabase schema/RLS/Auth-policy changes, R2 resource configuration changes, worker/provider routing changes, new secrets, or deployment/cutover.

Those findings remain follow-on enterprise-hardening work after ENT-001 is verified.

## Architecture and security constraints
- Browser state remains non-authoritative for identity, ownership, generation lifecycle, storage identity, and uploaded-media geometry.
- Existing server-owned owner checks and service-role boundaries must remain unchanged.
- Shared Saga/RenderLab Supabase, R2, and Modal ownership decisions remain unchanged.
- Upload validation must fail closed. A malformed or mismatched object must not become a durable `media_asset` or a `ready` generation source.
- Validation errors exposed to clients must remain sanitized; internal object keys and provider/security credentials must not leak.
- The existing 25 MB compressed-byte cap remains in force in addition to decoded geometry limits.
- No production deployment is authorized by this contract.

## Data implications
No database migration is planned. Existing `width`/`height`, status, metadata, and ownership fields are sufficient. The semantic change is that newly completed image uploads persist server-derived geometry.

Existing durable assets are not retroactively rewritten in ENT-001.

## Validation matrix
Before implementation closure:
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`
- `npm run verify:engineering-quality`
- existing media upload integration workflow
- existing reference upload integration workflow
- any affected generation integration workflow caused by prompt-contract changes
- exact-head GitHub checks required by branch protection

Verification must cover at least:
- valid PNG/JPEG/WebP completion;
- MIME/actual-format mismatch rejection;
- undecodable bytes rejection;
- animated/multi-page rejection where fixture support permits;
- decoded edge/pixel limit rejection;
- server-derived geometry taking precedence over client geometry;
- prompt at limit accepted and prompt over limit rejected;
- negative prompt at limit accepted and over limit rejected;
- expected HTTP headers represented by configuration/build validation.

No real provider-backed generation is required solely for these contract changes unless an existing affected workflow requires its own run-owned fixture contract.

## Documentation outputs
On verified implementation, update the existing authoritative locations rather than creating parallel architecture truth:
- `docs/architecture/PRODUCT_CAPABILITIES.md` for generation/request and media capability boundaries;
- `docs/architecture/INFRASTRUCTURE.md` for R2/upload validation and HTTP deployment posture where relevant;
- `PROJECT.md` or `docs/STATUS.md` only if needed to record durable phase status/closure.

This contract remains execution/history evidence; it must not become a competing current architecture reference.

## Exit criteria
ENT-001 is complete only when:
1. all three in-scope hardening areas are implemented;
2. malformed/mismatched/over-limit uploaded images cannot become durable/ready media;
3. persisted geometry is server-derived for new uploads;
4. prompt and negative-prompt bounds are enforced server-side;
5. security headers are present in the application configuration with a CSP posture that is explicitly documented;
6. relevant tests/workflows pass at the exact implementation head;
7. authoritative documentation matches the verified code; and
8. no deployment, shared-resource mutation, or unrelated refactor occurred.

After closure, rerun the enterprise scorecard against the original audit baseline and record remaining P1/P2 gaps separately rather than inflating ENT-001 scope.