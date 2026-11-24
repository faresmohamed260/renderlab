# P6-02a isolated design workspace

Foundation only. See [merged contract](../../../docs/ui/P6_02A_SHARED_PRIMITIVES_CREATE_PROTOTYPE_CONTRACT.md) and [V2 spec](../../../docs/ui/DESIGN_LANGUAGE_V2.md). No production imports, routes, credentials, calls, user data, remote assets or new dependencies. The shared CSS and TS owners are under `design/system/v2/`. This skeleton is not a reviewed Create design.

From the repository root with the pinned Node/npm toolchain:

```sh
npm ci --no-audit --no-fund
node scripts/run-p602a-design-prototype.mjs
```

Open http://127.0.0.1:4316 locally. Ctrl+C shuts down the child process tree and removes its scratch copy. To change source, stop and restart; the runner stages tracked prototype files (including tracked working-tree edits), never copies environment files or untracked output. It invokes the locked Next CLI directly, with an explicit standalone project and webpack, without npm scripts or production configuration. No network listener other than loopback. A busy port fails; it never attaches to or kills an unrelated listener.

Credential-free smoke (requires the existing Playwright Chromium browser installed with `node node_modules/@playwright/test/cli.js install chromium`):

```sh
node scripts/run-p602a-design-prototype.mjs --smoke
node --test tests/unit/p602a-foundation.test.mjs
```

Smoke checks the real browser at 1440×900 and 390×844 with normal/reduced preferences, rejects unexpected requests/WebSockets, verifies token CSS and the four roles and removes temporary output. Capture of Create states and recordings comes in step 3, not this foundation. The browser dependency download is CI/tool setup, not prototype network access.

CI: the targeted P6-02a workflow checks isolated launch/browser behavior only when prototype or verification paths change; the existing protected suite still runs. The existing credential-free engineering-quality production build is followed by `node scripts/verify-p602a-isolation.mjs --build`, which checks the production source boundary and actual server/static output for prototype path, markup and token markers. No Vercel deploy or production environment is used. The initial build scan found a prototype marker in the legacy preview route's server file-trace manifest. Root Next configuration now explicitly excludes only the two design-only subtrees from output file tracing across routes; this is a packaging-only boundary, not a runtime route change. The scan still fails on any design entry in emitted trace manifests or chunks. The verifier is a regression guard, not a proof against arbitrary obfuscation; route/import review and inspection of build evidence remain required. Timing/CI results will be recorded from actual runs, not estimated.
