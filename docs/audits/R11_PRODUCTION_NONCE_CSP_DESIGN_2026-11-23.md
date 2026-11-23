# R11 — production nonce-based CSP design (proposal only)

**Status:** planned, not implemented. **Reviewed baseline:** RenderLab main on 2026-11-23. No headers, deploy, secrets, application behavior, provider or production configuration changed in this document.

## Verified current boundary

[`next.config.ts`](../../next.config.ts) emits one static Content-Security-Policy on every route. Production uses `script-src 'self' 'unsafe-inline'` and `connect-src 'self' https: wss:`. It also permits `img-src 'self' data: blob: https:`, `media-src 'self' blob: https:`, and `style-src 'self' 'unsafe-inline'`. This is a real defense-in-depth gap: arbitrary HTTPS / WSS destinations are connect-eligible; inline scripts are not nonce-gated. Fixing these strings without the Next.js rendering integration can break hydration and browser Auth.

## Target contract

1. **Nonce ownership:** Generate a fresh, cryptographically unpredictable random nonce **for each HTML document request** in the server request boundary (Next.js proxy/middleware compatible with the actual pinned framework). Put the same policy in the forwarded request CSP header so Next.js can nonce its own inline bootstrap scripts, and in the outbound response CSP. Never use a constant build-time nonce, expose the nonce through a public configuration variable, or reuse it across responses. Keep `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'` and the existing restrictive permissions/referrer headers.
2. **Scripts:** Production `script-src 'self' 'nonce-{random}'` (assess `'strict-dynamic'` only after testing browser behavior). Remove `'unsafe-inline'` and forbid `'unsafe-eval'` in production. Test Next.js framework scripts, route streaming, hydration, dynamic imports and any app-owned inline injection. Avoid weakening the nonce rule simply to green CI.
3. **Connect origins:** Replace broad `https: wss:` with an explicit, canonical set of exact `https://host[:port]` and (only if actually needed) `wss://host[:port]` origins. The initial verified public Supabase project origin is `https://rashyleshocuvpgcooxy.supabase.co`; the required websocket origin, if the frontend directly uses Realtime, must be confirmed with network/request evidence. For R2, prefer same-origin app-signed proxy paths; add only the actual browser-facing custom R2 domain if direct browser uploads/reads require it, **never** `*.r2.cloudflarestorage.com` or broad `https:`. Modal should normally stay server-to-server; allow a concrete Modal gateway origin **only if** evidence shows a legitimate browser connection. These are categories for inventory, not automatic grants.
4. **Image/media/form/worker policy:** Inventory browser uploads, signed download redirects, image display, blob previews, Auth redirects, fonts, workers, WebSocket and any external CDN. Replace broad `img-src`/`media-src` network schemes with audited hosts while retaining only required `data:`/`blob:` uses. Maintain `frame-src 'none'` unless a verified integration requires a narrowly permitted host.
5. **Styles:** `style-src 'unsafe-inline'` is deliberately an **independent remaining risk** until Tailwind/React/Radix inline style behavior is inventoried. Use nonce-based style loading where supported or document specific unavoidable exceptions; do not claim a fully strict CSP while style inline exceptions remain.
6. **HTML caching:** Per-request nonces require dynamic HTML and response-aware caching. Inspect Next.js static optimization, PPR, streaming, redirects, prefetches, API and immutable asset caching. Do not put request-specific CSP nonces on cacheable shared HTML; API/asset responses need a compatible non-document policy. Measure latency/render impact before release.
7. **Fail closed:** Missing nonce or misconfigured production origin must not silently fall back to `unsafe-inline`/`https:`. Domain configuration must be explicit, validated server-side and should not leak service credentials.

## Incremental implementation and evidence

**Stage A — inventory/offline:** Enumerate current browser-origin requests by route and by feature (signed-in/out, Create, Library, Activity, Settings, Admin, image edit/uploads, MFA). Capture necessary origin+scheme+method without sensitive tokens. Add deterministic policy-builder tests: unique nonces, document/API separation, no wildcard scheme for `connect-src`, proper header forwarding, safe override for error/redirect paths, explicit allowed origins, and disabled production `unsafe-eval`.

**Stage B — Report-Only:** Introduce a separate reviewable code PR using `Content-Security-Policy-Report-Only`; preserve existing enforced policy while collecting **redacted** violations through a bounded internal endpoint or provider telemetry. Reject report spam; do not log URL paths/query strings, headers, tokens, signed URLs, owner IDs or payload bodies. Aggregate directives and origins only. Document false positives from browser extensions. Use controlled staging and a real production-similar Next.js build before requesting any live changes.

**Stage C — enforcement:** After zero unexplained app-owned Report-Only violations in the agreed test matrix, replace static production CSP with the nonce path and explicit origins in a separately reviewed runtime PR. Keep the six protected CI contexts, CodeQL, browser smoke and security regression tests green at exact head. The release operator (worker 1, on separate authorization) follows the production runbook with rollback; this document authorizes **no** deployment or production configuration change.

## Exit proof and rollback

For each relevant route prove that (a) unnonced inline script is blocked, (b) the app and Next.js own nonced scripts hydrate, (c) a disallowed arbitrary HTTPS and WSS connection is blocked, (d) only observed Supabase/R2/Modal connections are permitted, (e) browser Auth/MFA, uploads, signed media and all supported FIBO request flows remain intact, (f) streaming/SSR/caching are correct across two successive document requests with different nonces, (g) violation reporting remains sanitized. Perform network checks without spending provider/GPU budget. Record policy string snapshots, browser-console/Report-Only summaries, test SHA and rollout/rollback evidence in a separate dated audit.

**Rollback:** the release runbook's known-good Vercel deployment/alias path restores the previous header if critical hydration/Auth/asset failures appear. Preserve the prior CSP baseline as explicit **temporary** risk acceptance only; never widen a single origin as a silent workaround.

## Explicit non-goals

No change to `next.config.ts`, `proxy.ts`, authentication, Modal, R2, Supabase settings, DNS, domain aliases, production operations, secrets, UI design or currently enforced headers. This proposal is not evidence that an origin list has been independently verified at runtime.
