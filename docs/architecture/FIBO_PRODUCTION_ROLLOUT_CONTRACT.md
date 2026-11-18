# FIBO Production Rollout Contract

**Status:** `AUTHORIZED / IMPLEMENTATION PENDING`  
**Authorized:** 2026-11-18 by the owner  
**Use boundary:** private, invite-only, noncommercial RenderLab portfolio demo

## Goal and user value

Make Bria FIBO 2.0 Edit Turbo a normal production image-model choice in RenderLab Create. A signed-in admitted user selects FIBO, submits through the existing RenderLab generation API, and receives the result through the existing durable job, Activity, R2, Library, Viewer, continuation, and cancellation lifecycle.

## Verified starting state

- The native FIBO graph and private asynchronous HTTP gateway are merged on `main` and were qualified in the approved `faresmohamed260/main` Modal workspace.
- The qualification app is private and named `renderlab-fibo-native-candidate`; it is not a production registration.
- RenderLab production has no FIBO gateway URL, proxy key, proxy secret, or admission flag.
- FIBO is accepted by the API only when explicitly requested, but is not listed in the standard Create model menu.
- Existing production source `d7571a230b3f1c5719552628db020823adb4da73` and deployment `dpl_5LZbW2kA6bFZpYvy2p8bFXzZ2ABF` remain the rollback baseline until cutover succeeds.

## In scope

- Add FIBO to the existing image-model capability list and Create model selector.
- Keep FLUX as the default; selecting FIBO must be explicit.
- Constrain FIBO UI/API requests to its qualified ratios, 1–8 steps, guidance 1, bounded prompts, and current image-input limits.
- Deploy a production-named Modal gateway from reviewed protected `main` in the existing WANDA/`faresmohamed260` profile and main environment.
- Use a Modal proxy token only as the production server-to-worker runtime credential. This is not a new Modal profile or workspace credential.
- Store `RENDERLAB_FIBO_GATEWAY_URL`, `RENDERLAB_FIBO_MODAL_KEY`, `RENDERLAB_FIBO_MODAL_SECRET`, and `RENDERLAB_FIBO_GENERATION=1` only in Vercel Production; secrets remain server-only.
- Stage a production Vercel deployment without moving the custom domain, verify it, then explicitly cut over `renderlab.faresuniform.uk`.
- Preserve the prior deployment and candidate gateway until post-cutover verification passes.

## Out of scope

- No public/anonymous generation, new account tier, billing, schema, storage bucket, route, local fallback, standby worker, or automatic failover.
- No FIBO masks, manual VGL, browser-held provider credentials, multi-output batches, or FIBO Studio frontend release.
- No change to FLUX, Qwen, LTX, Upscale, existing admission, or owner-scoped persistence contracts.
- No commercial use. Reassess the BRIA license before monetization, client work, public service, or other commercial use.

## Security and failure contract

- Browser requests terminate at RenderLab. Only the RenderLab server receives the Modal proxy credential and calls the worker.
- FIBO remains single-primary, with no ambiguous-submit retry and no poll reassignment.
- Disabling `RENDERLAB_FIBO_GENERATION` stops new admission while retaining gateway configuration for polling/cancelling existing jobs.
- Provider call IDs remain signed; proxy-authenticated requests do not follow redirects.

## Validation matrix

1. Unit/type/build checks cover capability listing, FIBO-specific controls, parsing, routing, proxy headers, call IDs, polling, persistence, and cancellation.
2. Exact-head GitHub checks pass before infrastructure mutation.
3. Production gateway rejects unauthenticated requests and passes authenticated text-to-image, single-source edit, polling, result PNG, and cancellation checks.
4. Staged Vercel production build is `READY`, advertises FIBO only when all four settings are present, and preserves signed-out route behavior.
5. A signed-in admitted account completes one FIBO text-to-image and one edit through RenderLab; results persist to Library and remain owner-scoped. Cancellation is verified without a durable output.
6. Existing Create and generation regression workflows remain green.
7. After alias cutover, inspect runtime errors/logs and update the production manifest plus the four production authorities; run Production Documentation Sync for the exact deployed SHA.

## Exit criteria

The phase is complete only when the exact reviewed source is live on the custom domain, the production gateway and end-to-end RenderLab lifecycle are verified, rollback remains available, secrets were not exposed, and repository production documentation matches live state.
