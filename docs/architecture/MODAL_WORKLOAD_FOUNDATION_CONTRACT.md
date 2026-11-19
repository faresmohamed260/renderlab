# Modal workload foundation — phase contract

**Status: Proposed for review.** This contract does not authorize deployment, cloud resource creation, GPU usage, or product scope changes.

## Goal and starting point

Prepare reusable Modal app and worker scaffolding so the next supported capability can focus on its model, workflow, and integration, rather than recreating deployment and operational plumbing. Start from repository main at `2595cd4` and [the recorded production release](../production/current.json). The private `renderlab-generation-gateway` currently includes a GPU render function, and the only live model is FIBO. The production route, worker identity, existing weights and supported features stay unchanged. Existing ComfyUI and upscale source files are not evidence of additional live capabilities. Reverify the production alias and provider resource inventory before any hosted work.

## Scope

| App | Foundation scope |
| --- | --- |
| `renderlab-generation-gateway` | Reuse the existing private gateway. Document where future workload backends plug in; do not change live routes or create a second gateway. |
| `renderlab-image-generation` | Add a deployable shell for image creation and editing. Do not move the current renderer or connect the shell to production traffic in this phase. |
| `renderlab-video-generation` | Add a deployable shell for future video generation and editing. No video workflows or models. |
| `renderlab-image-tools` | Add a deployable shell for future image utilities. No tool implementations or model runtimes. |
| `renderlab-video-tools` | Add a deployable shell for future video utilities. No tool implementations or model runtimes. |

Use workload-oriented app names, not one app per feature or model. Give each shell an internal, CPU-only readiness function that reports the app identity and that no workload is configured. No web endpoints, scheduled functions, GPU allocations, warm instances, model loading, or user job admission. An inactive shell must never accept or advertise a generation capability. A readiness response is not model qualification.

Share the small pieces that are genuinely common: configuration and a checked app inventory, structured logging with non-secret correlation IDs, a minimal base image for shells, and explicit build/deploy commands that verify workspace and environment before making changes. Provide starter templates for a reusable ComfyUI runner and a direct Python runner, without starting either in a shell. Identify how a future worker would mount environment-local volumes and attach only the secrets it needs. Shells need neither. Do not clone production credentials, mount production weights in another environment, or create broadly shared credentials for placeholders. Follow the existing [Modal ownership contract](MODAL_PROJECT_ISOLATION_CONTRACT.md).

The app definitions can be reviewed in GitHub before they appear in Modal. Dashboard creation requires a separately approved deploy to an exact workspace/environment; do not create or recreate persistent development or staging environments as part of this PR. Any later dashboard-only deployment must verify the new names are unoccupied, leave the live gateway untouched, and have a separate stop procedure for the new apps.

## Not in scope

No new features, weights, task workflows, custom nodes, external providers, UI, database or storage-schema changes, public routes, production switch, or changes to FIBO behavior. Keeping ComfyUI alive across calls, GPU/idle tuning, and the deferred audit fixes are separate work. Adding a real task later still needs task-specific validation, inputs and outputs, capability routing, appropriate hardware and dependencies, and qualification of results and cancellation; a workflow and weights alone do not enable a feature.

## Validation and exit criteria

- **Repository:** Check that the four shells import and register distinct names, have CPU-only internal readiness, and declare no GPU, model volume, secret, public endpoint, activation route, or schedule. Test that deployment commands reject unexpected workspace/environment and that inactive shells cannot be selected for a job. Preserve the FIBO routing and packaging checks; no visual review is needed because no UI changes.
- **Hosting, only with separate approval:** Verify each approved shell appears in the target Modal environment under the intended name, reports unconfigured through its internal readiness function, allocates no GPU, and leaves the current production app and aliases unchanged. Check existing image capability read-only; no production GPU smoke is part of the shell deploy.
- **Handoff:** Record the verified source/tree, validation and any non-production or production resource changes in the existing infrastructure authority. Mark repo scaffolding and hosted shells separately; do not mark deployment complete based on code. Any later FIBO move requires separate release approval, preserved job status/cancel behavior, and a verified recovery path.
