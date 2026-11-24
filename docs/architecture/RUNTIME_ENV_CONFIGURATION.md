# Runtime environment configuration contract

**Phase:** Backend Professional Baseline P0-02 | **Authority:** Normative implementation contract | **Owner:** Engineering / Infrastructure | **Verified:** 2026-11-23

## Single schema and no-value validation

- [Typed source](../../src/lib/config/runtime-env.ts) is the only application layer reading `process.env`. Reads are lazy, including public Next.js keys, so a missing optional setting cannot crash unrelated routes. Each of the audited application call sites uses `envString`, `envFlag`, or the narrow typed helper.
- [Vercel build preflight](../../scripts/verify-vercel-env.mjs) consumes the **same schema**. Under Vercel Production it validates all 16 required names, expected enabled flags, minimum credential lengths, the approved Supabase project and HTTPS Modal gateway origin. Preview/non-production Vercel retains the ten baseline checks and conditionally requires gateway credentials only when enabled. Local ordinary builds remain secret-free and are covered by an offline fixture in the Node unit suite.
- [Vercel names-only dashboard inventory](../operations/PRODUCTION_ENV_REQUIRED_NAMES.json) records the 16 Production required names observed on WANDA; schema-vs-inventory checks are **symmetric**, including missing and unexpected names. The inventory stores **no values**. This names-only list cannot prove actual credential values; the separately staged Production build preflight does so without printing those values.
- **Failure mode:** Production build/deploy fails fast if required values are absent/malformed. At runtime, privileged and provider operations still handle missing credentials only when invoked. Optional absent flags use the stated defaults; mandatory Production beta enforcement remains **fail closed** even if its flag drifts. A missing mask flag yields a sanitized diagnostic and disables only masked editing instead of crashing ordinary Create requests.
- Every diagnostic contains only the configuration **name and a generic reason**, never the value, token prefix, length of non-length-check secrets, URL components from invalid input or derived hashes. The offline matrix exercises this property.

## Variable inventory, category, default and boundary

| Variable | Category | Absent/default | Acceptance / affected boundary |
| --- | --- | --- | --- |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | production-required | unset (undefined) | string. Required in build; server-only R2 access key identifier. |
| `CLOUDFLARE_R2_ACCOUNT_ID` | production-required | unset (undefined) | string. Required in build; R2 resource target, used only for media paths. |
| `CLOUDFLARE_R2_BUCKET` | production-required | unset (undefined) | string. Required in build; object-storage bucket for RenderLab media. |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | production-required | unset (undefined) | string. Required in build; server-only R2 credential; never log. |
| `CRON_SECRET` | production-required | unset (undefined) | string. Required in build, minimum 16 characters; affects authenticated maintenance endpoint only. |
| `GITHUB_ACTIONS` | test-only | false | boolean, exact true. CI-only marker, strict true; never a production feature toggle. |
| `LOCALAPPDATA` | optional | unset (undefined) | string. Windows preview history location; fallback is OS temporary directory. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | optional | unset (undefined) | string. Optional public Next.js client key; unset keeps client Auth unconfigured. |
| `NEXT_PUBLIC_SUPABASE_URL` | optional | unset (undefined) | string. Optional public Next.js client URL; unset keeps client Auth unconfigured. |
| `NODE_ENV` | optional | unset (undefined) | string. Provided by Node/Next; production/development mode selection. Missing means no implicit production assumption. |
| `R2_ACCESS_KEY_ID` | optional | unset (undefined) | string. Legacy R2 alias; only read if canonical CLOUDFLARE_R2_* setting is absent. |
| `R2_ACCOUNT_ID` | optional | unset (undefined) | string. Legacy R2 alias; only read if canonical CLOUDFLARE_R2_* setting is absent. |
| `R2_BUCKET_NAME` | optional | unset (undefined) | string. Legacy R2 alias; only read if canonical CLOUDFLARE_R2_* setting is absent. |
| `R2_SECRET_ACCESS_KEY` | optional | unset (undefined) | string. Legacy R2 alias; only read if canonical CLOUDFLARE_R2_* setting is absent. |
| `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED` | feature-required (Production required) | false | boolean, exact flex. Enforced in Production even if configuration drifts (legacy yes/on/1 accepted); outside Production the explicit configured flag controls enforcement and defaults false. Runtime drift must fail closed and log only this setting name. |
| `RENDERLAB_CREATE_PREVIEW` | optional | false | boolean, exact 1. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_CREATE_PREVIEW_ADVANCED_PROMPT` | optional | false | boolean, exact 1. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_CREATE_PREVIEW_CANCEL` | optional | false | boolean, exact 1. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_CREATE_PREVIEW_EXTENDED` | optional | false | boolean, exact 1. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_CREATE_PREVIEW_LIVE_PREVIEW` | optional | false | boolean, exact 1. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_CREATE_PREVIEW_MASKS` | optional | false | boolean, exact 1. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_CREATE_PREVIEW_PYTHON` | optional | unset (undefined) | string. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_CREATE_PREVIEW_VARIABLE_STEPS` | optional | false | boolean, exact 1. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_FIBO_AUTOVGL_ENABLED` | optional | false | boolean, exact true. FIBO optional preview/feature switch; absent means disabled. |
| `RENDERLAB_FIBO_GATEWAY_URL` | feature-required | unset (undefined) | string. Legacy optional gateway alias only if canonical URL is absent; same Modal HTTPS validation when configured. |
| `RENDERLAB_FIBO_GENERATION` | feature-required (Production required) | false | boolean, exact 1. Mandatory Production = 1; otherwise false by default in development. An inactive FIBO provider must not require gateway credentials. |
| `RENDERLAB_FIBO_MASK_ENABLED` | feature-required (Production required) | false | boolean, exact true. Mandatory Production = true; defaults false off Production. Runtime drift is diagnosed without crashing unrelated Create paths. |
| `RENDERLAB_FIBO_MODAL_KEY` | feature-required (Production required) | unset (undefined) | string. Required when FIBO gateway is configured or FIBO is enabled; Modal proxy auth. |
| `RENDERLAB_FIBO_MODAL_SECRET` | feature-required (Production required) | unset (undefined) | string. Required with Modal proxy key when FIBO gateway configured or FIBO enabled; server-only. |
| `RENDERLAB_FIBO_PREVIEW` | optional | false | boolean, exact 1. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_GENERATION_BACKEND_TOKEN` | feature-required | unset (undefined) | string. Legacy external backend setting; not part of current FIBO production. Absent keeps old external path unavailable. |
| `RENDERLAB_GENERATION_BACKEND_URL` | feature-required | unset (undefined) | string. Legacy external backend setting; not part of current FIBO production. Absent keeps old external path unavailable. |
| `RENDERLAB_GENERATION_GATEWAY_URL` | feature-required (Production required) | unset (undefined) | string. Canonical FIBO gateway; required for enabled FIBO (legacy FIBO_GATEWAY_URL alias accepted). HTTPS *.modal.run only. |
| `RENDERLAB_GENERATION_RECONCILER_SECRET` | production-required | unset (undefined) | string. Required in build, minimum 32 characters; dedicated reconciliation bearer secret. |
| `RENDERLAB_HOSTED_CREATE` | optional | false | boolean, exact 1. Local/development preview only; disabled unless explicitly enabled with its declared strict boolean encoding. |
| `RENDERLAB_MAINTENANCE_BATCH_LIMIT` | optional | 8 | number. Finite number; default 8. At runtime, invalid input returns the same safe default as prior code. |
| `RENDERLAB_MAINTENANCE_SECRET` | optional | unset (undefined) | string. Optional maintenance bearer; absent disables its authenticated operation without affecting public routes. |
| `RENDERLAB_TEST_ACCOUNT_DATA_LIFECYCLE_FAULTS` | test-only | unset (undefined) | string. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_ADMIN_HEALTH_OWNER_ID` | test-only | unset (undefined) | string. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_ADMIN_HEALTH_OWNER_SCOPE` | test-only | false | boolean, exact true. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_GENERATION_FINALIZATION_FAULTS` | test-only | false | boolean, exact true. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_GENERATION_FINALIZATION_FAULT_SEQUENCE` | test-only | unset (undefined) | string. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_MAINTENANCE_FAULTS` | test-only | false | boolean, exact true. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_MAINTENANCE_OWNER_ID` | test-only | unset (undefined) | string. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_MAINTENANCE_OWNER_SCOPE` | test-only | false | boolean, exact true. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL` | test-only | unset (undefined) | string. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_NATIVE_WORKER_OVERRIDE` | test-only | false | boolean, exact true. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_OBSERVABILITY_NAMESPACE` | test-only | unset (undefined) | string. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_OBSERVABILITY_PERSIST` | test-only | false | boolean, exact true. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_RECONCILER_OWNER_ID` | test-only | unset (undefined) | string. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_RECONCILER_OWNER_SCOPE` | test-only | false | boolean, exact true. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RENDERLAB_TEST_UPLOAD_ADMISSION_FAULTS` | test-only | false | boolean, exact true. Run-owned fixture switch/identifier only. Production preflight rejects any nonempty test override; absent in live operation. |
| `RESEND_API_KEY` | production-required | unset (undefined) | string. Required in build; affects transaction/alert email only; no key in logs. |
| `SUPABASE_PUBLISHABLE_KEY` | production-required | unset (undefined) | string. Required in build; public server Auth key; may not be missing from Production. |
| `SUPABASE_SERVICE_ROLE_KEY` | production-required | unset (undefined) | string. Required in build; server-only privileged DB access. Never expose it to client modules or logs. |
| `SUPABASE_URL` | production-required | unset (undefined) | string. Required in Vercel prebuild; must equal the approved Supabase project URL. Missing runtime DB config affects DB-backed operations only. |
| `VERCEL_ENV` | optional | unset (undefined) | string. Platform deployment environment marker; unset outside Vercel. |

## Validation and rollback

**Offline matrix:** all-valid, each of the 16 required names missing, malformed values, optional toggles on/off, FIBO gateway absent while disabled, credential pairing when enabled, legacy alias validation, names-only drift both directions, secret redaction, and CI preflight `--fixture`. Run `npm run test:unit`, `npm run build`, `npm run verify:ui-purity`, `npm run verify:docs-governance`.

**Runtime release is separate from merge.** Before staging, inspect the 16 Production names in Vercel for exact team/project/scope without revealing values, and keep all user traffic on the last known-good deployment. Stage the qualified SHA, require READY and successful schema validation of the actual Production environment, then promote the public alias only after its rollback anchor is confirmed. Check the health and capability endpoint with both mask and closed-beta admission protection still enabled. No generation is necessary.

**Known-good rollback before this P0-02 change:** deployment `dpl_7ZvwdWi4B7qr1EkTnDYbBWNYPsBZ` at app SHA `e209bfee430c8e61789aeabc8a63579f05b0435c` in team `faresmohamedsalah10-1681`, project `renderlab`. If a startup regression or capability drift appears, restore that READY deployment with the [production release runbook](../operations/PRODUCTION_RELEASE_RUNBOOK.md), re-read the alias/health and flags, update the canonical release record and five mirrors, and run Production Documentation Sync. **Do not disable beta enforcement or rotate credentials as an expedient rollback.**

**Change discipline:** No database migrations, Modal worker rollout or generation in P0-02. This document does not approve a frontend/model phase.

**Retired upscale-worker configuration:** `RENDERLAB_UPSCALE_WORKER_GATEWAY_URL` and its two `RENDERLAB_TEST_UPSCALE_WORKER_*` overrides are no longer runtime settings. The standalone unauthenticated upscale Modal app was removed from the repository, and the exported worker resolver now always returns `null`, irrespective of inherited variables. Historical Phase 18 verifier scripts and audit records remain provenance only: no current workflow calls them or the removed worker, and the upscale API remains a same-origin-checked HTTP 410 stub.
