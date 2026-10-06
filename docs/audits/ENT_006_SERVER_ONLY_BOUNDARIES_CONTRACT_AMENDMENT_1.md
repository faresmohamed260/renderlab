# ENT-006 — Server-only boundaries contract amendment 1

Date: 2026-10-06
Status: EXECUTION-READY AMENDMENT / NOT DEPLOYED

## Reason for amendment

The merged ENT-006 contract required an AST-based verifier but stated that no new package dependency was required. Exact-head implementation evidence proved that assumption false under the repository's pinned TypeScript `7.0.2` toolchain.

TypeScript 7.0 is the native compiler line and no longer exposes the legacy in-process JavaScript Compiler API used for `createSourceFile` / AST traversal. The implementation verifier therefore cannot correctly satisfy the merged AST requirement by importing the repository's `typescript` package. Exact-head Engineering Quality failed at that boundary while lint, typecheck, unit tests, CodeQL and the surrounding integration matrix remained otherwise healthy.

This amendment changes only the verifier dependency mechanism. All original ENT-006 security, scope, acceptance and non-deployment requirements remain authoritative.

## Authorized change

ENT-006 may add exactly one development-only compiler-API dependency under a distinct package alias:

- package alias: `@typescript/compiler-api`
- source package: `@typescript/typescript6`
- exact version: `6.0.3`

The existing `typescript: 7.0.2` dependency remains unchanged and continues to own the repository's normal `tsc` command/typecheck path. The alias exists only so `scripts/verify-server-boundaries.mjs` can parse TypeScript/TSX source into an AST using the maintained TypeScript 6 JavaScript Compiler API.

The verifier must import from `@typescript/compiler-api`, never replace or downgrade the project's TypeScript 7 compiler, and must not expose the alias to application runtime code.

## Lockfile and supply-chain requirements

- `package.json` and `package-lock.json` must pin the alias deterministically.
- `npm ci --no-audit --no-fund` must remain valid from the checked-in lockfile.
- No second parser/compiler dependency is authorized.
- No runtime dependency is authorized.
- Existing immutable GitHub Action pinning and CodeQL controls remain unchanged.

## Unchanged implementation contract

The original ENT-006 requirements remain unchanged:

- the 11 canonical credential/data-bearing leaf modules require top-level `import "server-only";` markers;
- runtime static or dynamic Client Component imports from `@/server/*` and `@/lib/supabase/server` must fail the verifier;
- genuine type-only imports remain allowed;
- direct high-risk credential reads in server-owned modules require an explicit server-only marker;
- negative self-tests must prove marker loss, runtime imports and credential-read violations are detected;
- Engineering Quality remains the mandatory gate;
- no schema/shared-resource mutation, provider/routing change, UI change, product API change, production deployment, backup/restore work, workflow consolidation or broad refactor is authorized.

## Acceptance

Before implementation may merge:

1. this amendment must be merged to protected `main` after exact-head Engineering Quality and CodeQL pass;
2. the ENT-006 implementation branch must incorporate the merged amendment;
3. the final implementation head must pass deterministic install, lint, typecheck, all unit tests, server-boundary self-tests, production build, Engineering Quality, CodeQL and all automatically attached affected workflows;
4. merged-main Engineering Quality and CodeQL must pass before repository closure;
5. the implementation and closure branches must be removed after merge.

## Deployment

This amendment does not authorize a Vercel production deployment or any shared runtime mutation.