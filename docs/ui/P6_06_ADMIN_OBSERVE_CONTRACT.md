# P6-06 — Admin Observe

**Scope:** The owner authorized the read-only Observe slice of Admin. The contract branch is the parent of the implementation branch. Local stacking supports review, and repository acceptance still requires the contract to merge first. Deployment and provider operations require separate authorization.

## Goal and user value

Give authorized operators one place to read dispatch confirmation timing and unreleased reservations for terminal jobs alongside existing product health. Show whether the telemetry is available, how much was sampled and which values can be read as exact counts.

## Verified starting state and gates

- The starting worktree is `7662bd2821519aea10ebaf64e645124daa54865d`. The [production manifest](../production/current.json) records Batch G at `34efe0b84ac1d950581d7b371b65bbf331852e89`. That is the recorded release baseline. This slice uses repository evidence and local fixtures.
- The [frontend QA audit, FQA-02](../audits/FRONTEND_QA_PASS_2026-11-24.md) and [code audit, FE-07](../audits/FRONTEND_CODE_AUDIT_2026-11-24.md) identify omitted fields from the existing Admin dashboard snapshot. P5-03 was deferred to Observe.
- [UI-079, UI-086 and UI-088](UI_DECISIONS.md) govern Admin structure, the dark Violet Studio language and owner/admin navigation. The [approved static comps](../../design/approved/2026-11-25-phase6/README.md) include the phone navigation treatment. The dashboard composition comes from UI-079.
- The existing dashboard loader supplies typed aggregates from bounded optional reads. Verify their fields against the [DTO](../../src/lib/api/admin-contract.ts), [store](../../src/server/observability/generation-operator-store.ts) and [summary](../../src/server/observability/generation-operator-summary.ts) before implementing.

## Sequencing and ownership

The Admin slice owns presentation inside `src/features/admin`, with credential-free fixture and test coverage. Commit the contract and governance record first. Add typed fixtures and failing mounted assertions before changing the component. Use a single Observe implementation slice on top of the contract branch.

## In scope — Observe slice 1

Keep the UI-079 Access, Generation and Health register rows. Inside Health, add compact `HealthCounts` groups immediately after Dispatch health, using semantic headings, label/value pairs and short text for scope and limitations. Preserve the primary metrics, other diagnostic groups, alerts and recent diagnostic filters.

| Input | Presentation |
| --- | --- |
| `generationObservability.available` and nullable groups | Explicitly indicate unavailable telemetry. An unavailable aggregate carries no figures and the remaining Health snapshot stays readable. Treat a null individual group as unavailable. |
| `dispatchLatency` | Show `windowMinutes` and valid `sampleSize` for the recent confirmation window (currently 15 minutes). Show p50 and p95 in seconds for at least 10 samples, a presentation rule for small samples. Preserve measured zero. Use “No timing data” for null percentiles and “No confirmed dispatch timings in this window” for an empty complete sample. Label truncated timings as based on a limited sample and qualify even an empty truncated sample. Explain the elapsed time from acceptance to confirmed dispatch in the outbox. GPU start, generation completion, SLAs and ETAs are outside the measurement. |
| `terminalHeld` | Distinguish unexpired holds from expired unreleased reservations, each with succeeded, failed and cancelled counts. Show the oldest known time since job completion (unexpired only) and count of unexpired reservations with unknown completion time. Use “Unknown” for age when unexpired holds exist without a usable completion time, “None” for a complete sample with no unexpired holds, and “No known age in sample” when a limited sample has no usable age. |
| `terminalHeld.truncated` | Present every returned count as a lower bound with the existing `N+` convention and explain it in visible text. Qualify the oldest age as the oldest observed in the sample. A complete sample can report an exact zero. |

Use semantic tokens from `src/app/semantic-tokens.css` for the new groups, with quiet Violet Studio glass material and legible text. Preserve the 1/4 Admin motion ceiling. The groups are static, with equivalent rendering under reduced motion. Any later authorized interaction motion follows the named roles in `src/lib/ui/spring-roles.ts`. UI-026 and existing shared primitives apply to controls.

## Explicitly out of scope

Additional Admin actions, navigation or routes, charts, polling, new metrics, reads, query changes, API or schema changes, dependency changes, provider configuration and release work are outside this slice. Infrastructure actions such as deployments and management of secrets or Modal/Supabase credentials never belong in the web Admin.

## Architecture, data and dependencies

Consume `snapshot.health.generationObservability` already passed to `AdminOperations`. The dispatch read uses confirmed outbox rows and the reservations read joins unreleased bound reservations to terminal jobs. Each read samples up to 200 rows and detects truncation. A failed optional read yields `available: false` with both groups null. Core health, alerts, DTOs, APIs, persistence and aggregation retain their existing contracts. Render only the existing sanitized aggregate values and human-readable scope. The presentation threshold for percentiles has no effect on alerting.

## Security and ownership

Keep the existing server-derived navigation eligibility and direct-route/API guards. Fresh active-admin authorization and MFA remain mandatory before loading the dashboard. Signed-out users and ordinary members have no Admin navigation or dashboard access. Existing MFA enrollment and challenge redirects, mutation eligibility and ownership safeguards remain authoritative. No new data crosses the server/browser boundary. Individual job, owner and provider identifiers stay outside the new diagnostics.

## Validation matrix and evidence

| Area | Acceptance |
| --- | --- |
| Typed mounted fixtures | Populated, empty, unavailable, truncated, small-sample and measured-zero cases. Assert durations, window, counts, null treatment, lower bounds and existing Health content. Block and assert against unexpected API or external calls. |
| Geometry and accessibility | Inspect mounted Admin Health at desktop and 390 px, with 320 px reflow and 195 px stress for the new groups. Verify readable wrapping, label/value associations, no horizontal overflow in the added groups and equivalent reduced-motion content. Keep existing controls, focus order and functionality. |
| Local engineering | Run unit tests including existing Admin suites, lint, typecheck, UI purity, docs governance, offline production build and mounted Chromium tests with traces off. Keep existing tests, guards and overflow thresholds. |
| Repository acceptance | Review the contract first, then validate the exact implementation head with attached checks and rendered review. Configured Admin coverage owns signed-out, member, MFA and authorized access assertions. Local fixtures cover presentation. |

## Documentation outputs, exit and next dependencies

Register this contract in the index and governance metadata. Observe exits when the aggregate presentation matches the state matrix, existing Health and access contracts are preserved, and evidence is recorded for the implementation head. Provider-backed validation stays outside the local slice.

The later roadmap is **User Control → Job Control → Audit Log → Guards**. User Control and Job Control are for separately reviewed operational actions. Audit Log is for operator accountability. Guards include possible re-authentication for destructive actions, subject to a separately accepted security contract before any such action is exposed. Observe adds no controls for these stages.
