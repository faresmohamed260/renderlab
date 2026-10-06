# ENT-006 — Server-only boundaries contract amendment 2

Date: 2026-10-06
Status: EXECUTION-READY CORRECTION / NOT DEPLOYED

## Supersedes amendment 1 dependency choice

Amendment 1 correctly established that the repository's pinned TypeScript `7.0.2` package no longer exposes the legacy JavaScript Compiler API required by the ENT-006 AST verifier. Its proposed compatibility-package choice is superseded by this amendment before implementation.

A follow-up package-manager audit found that `@typescript/typescript6` depends on a TypeScript 6 compatibility package that also exposes the `tsc` binary. Under npm 11, bin-link collision behavior can cause that transitive TypeScript 6 binary to replace the repository's intended TypeScript 7 `tsc` command. ENT-006 must not silently change the compiler that owns normal repository typechecking.

Therefore the TypeScript 6 alias authorization in amendment 1 is withdrawn and must not be implemented.

## Authorized parser dependency

ENT-006 may add exactly one development-only parser package:

- package: `@babel/parser`
- exact version: `7.29.9`
- purpose: parse JavaScript/TypeScript/TSX modules into an AST for `scripts/verify-server-boundaries.mjs`

`@babel/parser` is parser-only for this phase. It must not be imported by application runtime code, must not replace or wrap `tsc`, and must not introduce a second parser dependency.

The repository's existing `typescript: 7.0.2` dependency and ordinary `tsc`/typecheck path remain unchanged.

## Verifier requirements

The server-boundary verifier must use the parser with `sourceType: "module"` and the TypeScript/JSX syntax plugins needed to parse the current `src` tree. Its AST walk must preserve the original ENT-006 semantics:

- identify actual top-level `"use client"` directives;
- reject runtime static imports in Client Components from `@/server/*` or `@/lib/supabase/server`;
- reject runtime dynamic `import()` from those namespaces;
- allow genuine type-only imports, including named `type` specifiers;
- inspect server-owned source for direct high-risk `process.env` credential reads, including property, element and object-destructuring forms;
- require `import "server-only";` on the canonical 11 privileged leaf modules and on any scanned server-owned module that directly reads a covered credential;
- keep negative self-tests for runtime imports, marker loss and credential-read detection.

## Lockfile and supply-chain requirements

- `package.json` and `package-lock.json` must pin `@babel/parser` exactly at `7.29.9`.
- `npm ci --no-audit --no-fund` must succeed from the checked-in lockfile.
- Existing TypeScript 7 compiler ownership must be proven unchanged by the exact-head typecheck and build gates.
- No runtime dependency, alternate compiler, second parser, workflow action change or package-manager change is authorized.

## Unchanged scope and acceptance

All original ENT-006 contract requirements remain in force except the dependency mechanism explicitly superseded here. In particular, this phase still authorizes no schema/shared-resource mutation, provider/routing change, product API change, UI change, deployment, backup/restore work, workflow consolidation or broad refactor.

The implementation PR may merge only after this amendment is merged to protected `main` and the implementation branch incorporates that amended authority. Final implementation acceptance still requires deterministic install, lint, TypeScript 7 typecheck, all unit tests, verifier self-tests, production build, Engineering Quality, CodeQL and all automatically attached affected workflows, followed by merged-main Engineering Quality and CodeQL.

## Deployment

This amendment does not authorize a Vercel production deployment or any shared runtime mutation.