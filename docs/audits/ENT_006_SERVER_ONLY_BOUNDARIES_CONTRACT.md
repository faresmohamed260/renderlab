# ENT-006 — Explicit server-only module boundaries contract

Date: 2026-10-06
Status: COMPLETE / VERIFIED / MERGED / NOT DEPLOYED

## Goal
Close the highest-value post-ENT-005 application-boundary weakness by making RenderLab's privileged server modules explicit build-time server-only boundaries and by enforcing that Client Components cannot acquire runtime dependencies on `src/server` or the privileged Supabase server client.

ENT-006 is intentionally a boundary-hardening phase, not a server-architecture refactor. It must preserve product behavior, route behavior, provider routing, database schema, shared infrastructure and production deployment state.

## Verified starting state

- Baseline repository head: `ee6eac53bf32188a35b0225650dd0268025b2f49`.
- Authoritative enterprise score: **8.5/10** after ENT-005.
- `src/server` contains 50 server-domain modules, but no production module currently imports the framework `server-only` marker.
- The current direct credential-bearing/server-privileged seams are concentrated in modules that read Supabase service-role credentials, Resend credentials, generation backend credentials, or Cloudflare R2 credentials.
- Current Client Components use server-owned types only through `import type` in limited places; no verified runtime Client Component import of `@/server/*` or `@/lib/supabase/server` is part of the approved architecture.
- Next.js 16.3.8 supports `import "server-only"` as a build-time environment-poisoning guard. Next.js handles the marker internally, so this phase does not require adding an npm dependency merely to use the marker.
- The direct Node unit suite imports several pure modules under `src/server` at runtime. ENT-006 must not blanket-mark every pure domain/helper module and thereby break intentional direct-unit boundaries without a security reason.
- Production remains separately pinned to the exact SHA recorded in the production authorities. ENT-006 does not authorize deployment.

## Security objective

A module that owns credentials, privileged service-role data access, or privileged external-service access must fail the Next.js build if it is ever pulled into a Client Component module graph. A future Client Component must also fail repository quality checks if it introduces a runtime import from the server-owned module namespace even when the imported target is not yet credential-bearing.

This is defense in depth. Existing private environment variables remain server-side, but absence of a `NEXT_PUBLIC_` prefix is not treated as a sufficient architectural boundary.

## In scope

### 1. Mark current privileged leaf modules server-only

Add a top-level side-effect `import "server-only";` to the current credential/data-bearing leaf modules:

- `src/lib/supabase/server.ts`
- `src/server/data/supabase-rest.ts`
- `src/server/storage/r2.ts`
- `src/server/account/account-data-lifecycle.ts`
- `src/server/account/account-deletion-notification.ts`
- `src/server/account/account-sessions.ts`
- `src/server/account/recovery-flow.ts`
- `src/server/admin/admin-operations.ts`
- `src/server/generation/poll-generation.ts`
- `src/server/generation/submit-generation.ts`
- `src/server/observability/operational-alert-notification.ts`

The marker is an import-graph boundary only. It must not change exported function signatures, error contracts, authentication/authorization checks, retry semantics, or provider/storage behavior.

### 2. Preserve pure direct-unit seams

Do **not** mechanically add the marker to every file under `src/server`.

Pure deterministic modules that are intentionally executed directly by the Node unit suite — for example health summarization, diagnostics normalization, same-origin validation, image inspection, worker failure classification and capability/geometry helpers — remain directly testable unless they independently become privileged.

Higher-level server modules that import a marked privileged leaf inherit the Next.js client-build barrier transitively; they do not require duplicate markers merely for directory consistency.

### 3. Enforce Client Component import ownership

Add one repository verifier that parses TypeScript/TSX import declarations and fails when a file whose module boundary is `"use client"` has a **runtime** import from:

- `@/server/*`; or
- `@/lib/supabase/server`.

The verifier must permit genuine type-only imports, including both `import type { ... }` and named-specifier `import { type ... }` forms, because those imports are erased and carry no browser runtime dependency.

Dynamic runtime imports from the same server-owned namespaces are also forbidden in Client Components.

### 4. Enforce privileged-module markers

The same verifier must require the canonical privileged module list above to contain the exact `server-only` side-effect import.

It must also scan source modules under `src/server` plus `src/lib/supabase/server.ts` for direct reads of the current high-risk credential names and fail if a newly credential-bearing module is not marked. Initial credential families include:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RENDERLAB_GENERATION_BACKEND_TOKEN`
- `CLOUDFLARE_R2_*`
- compatibility `R2_*` credential names

Internal App Router route files that read route-authentication secrets remain server route modules by framework ownership and are not required to move into this leaf-module marker list during ENT-006.

### 5. Make the boundary a required quality gate

Integrate the verifier into the existing Engineering Quality path so a future regression cannot merge merely because the current production build happens not to traverse the offending module graph.

The quality verifier must fail on at least these negative conditions:

- a canonical privileged module loses its marker;
- a new direct credential read appears in an unmarked server module;
- a Client Component adds a runtime static import from `@/server/*`;
- a Client Component adds a runtime dynamic import from `@/server/*` or `@/lib/supabase/server`.

## Explicitly out of scope

ENT-006 does **not** authorize:

- production deployment or Vercel alias movement;
- Supabase migrations, Auth policy changes, RLS changes or shared-resource mutation;
- R2 configuration/resource changes;
- provider/worker routing or credential changes;
- converting modules to Server Actions or changing API routes;
- React taint APIs;
- broad `src/server` module decomposition;
- cross-platform EOL/tool-shim remediation;
- test-coverage tooling/gates;
- CI workflow consolidation;
- destructive-loss backup/restore capability;
- UI redesign or product-surface changes.

## Data and infrastructure implications

None. ENT-006 changes source import boundaries and repository verification only.

No schema migration, new environment variable, new secret, new package dependency, new cron/scheduler, or external service is required.

## Validation matrix

Implementation is not complete until the exact implementation head passes:

1. `git diff --check`;
2. lint with zero errors;
3. TypeScript no-emit;
4. the full Node unit suite;
5. the new server-boundary verifier's positive and negative fixtures;
6. production `next build`, proving legitimate Server Component/route imports remain valid and Client Component graphs remain clean;
7. Engineering Quality on the exact PR head;
8. JavaScript/TypeScript CodeQL on the exact PR head;
9. all automatically affected repository workflows triggered by the changed privileged modules.

The implementation must also prove that the existing type-only Client Component imports remain accepted and that no runtime client dependency on marked modules is introduced.

## Documentation outputs

On verified implementation/closure, update the existing authoritative locations rather than creating competing architecture truth:

- this contract status and closure evidence;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` with the explicit server-only module rule;
- `docs/architecture/INFRASTRUCTURE.md` with credential-bearing module ownership;
- `docs/STATUS.md` and `PROJECT.md` with the verified enterprise-hardening handoff;
- a same-rubric ENT-006 reassessment only after exact-head and merged-main evidence is complete.

## Exit criteria

ENT-006 may be marked complete only when:

- the canonical privileged leaf modules are explicitly server-only;
- Client Component runtime imports from server-owned namespaces are statically rejected;
- direct credential-bearing server modules cannot be introduced without a marker;
- current type-only browser contracts still build;
- exact-head quality, CodeQL, build and affected integration workflows pass;
- implementation is merged to protected `main`;
- merged-main Engineering Quality and CodeQL pass;
- temporary implementation/closure branches are removed;
- repository documentation records only verified reality.

## Closure evidence — 2026-10-06

ENT-006 is complete in repository source and remains **not deployed**.

- Implementation PR #342 final head `8b9d87b9ce70f63f5c755a10de19975d7acdc36a` passed Engineering Quality run `37490780105` and CodeQL run `37490780138`.
- Engineering Quality proved deterministic dependency installation, lint, TypeScript no-emit using repository-owned TypeScript `7.0.2`, the full unit suite, negative quality fixtures including the server-boundary verifier, and the production Next.js build.
- The final-head Library Lifecycle pull-request run was cancelled before useful execution and was superseded by unchanged exact-head workflow-dispatch run `37493401969`, which passed. The remaining affected exact-head integration, lifecycle, account, upload, generation, UI and release-readiness workflows passed.
- PR #342 squash-merged to protected `main` as `6c80535737fb67a0239ac8cc05a2feaf014d49bf`.
- Merged-main Engineering Quality run `37494017112` and CodeQL run `37494017131` passed on that exact merge SHA; affected merged-main push workflows were also accepted.
- The implementation pins dev-only `@babel/parser@7.29.9`; `typescript@7.0.2` remains the normal compiler and owner of `tsc`.
- The canonical 11 privileged leaf modules carry the `server-only` marker; Client Component runtime imports from server-owned namespaces and unmarked direct high-risk credential reads are statically rejected while genuine type-only imports remain allowed.
- No Supabase/R2 mutation, provider-routing change, credential change, Vercel production deployment, alias movement or other shared-runtime mutation was performed by ENT-006.

The same-rubric reassessment is recorded in `docs/audits/ENT_006_SERVER_ONLY_BOUNDARIES_ASSESSMENT.md`. The official rounded enterprise score remains **8.5/10**: ENT-006 materially strengthens architecture and application security, but the dominant score ceilings remain destructive-loss recovery, developer portability, coverage visibility and maintainability debt.

## Deployment boundary

**NOT AUTHORIZED.**

Merging ENT-006 changes source truth only. Production must not be credited with this build-time boundary until a later separately authorized exact-SHA production release is verified and documented.
