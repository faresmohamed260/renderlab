# RenderLab Modal Project Isolation Contract

Status: **Planning gate / implementation pending**  
Tracker: #206  
Planning baseline: `8b89f30322ab284b4233ebd6880c6fcb60dff819`

## Goal

Make RenderLab's Modal ownership explicit and enforceable so parallel S.A.G.A. development cannot accidentally deploy, reset, maintain, or repurpose the Modal credentials/workspaces that host RenderLab-dependent workers.

This is an infrastructure-governance corrective. It does not change RenderLab product semantics, generation contracts, UI behavior, Supabase/R2 ownership, or production deployment state.

## Verified starting state

A read-only Modal roster audit performed from the existing 47-account S.A.G.A. credential roster on 2026-09-13 established the current workspace/application placement without exposing token IDs or token secrets.

RenderLab currently depends on eight Modal account labels:

| Account | RenderLab dependency / preserved identity |
| --- | --- |
| `modal-01` | active `ltx-primary-02`; gateway `https://faresmohamed260--saga-ltx25-gateway-web.modal.run` |
| `modal-02` | active `ltx-standby-02`; gateway `https://bplay2086--saga-ltx25-gateway-web.modal.run` |
| `modal-42` | active `qwen-primary-01` |
| `modal-43` | active `qwen-standby-01` |
| `modal-44` | historical/disabled `flux-primary-01`; identity retained for durable job history |
| `modal-45` | active `flux-standby-01` and RenderLab-owned `renderlab-image-upscale` / `renderlab-upscale-01` |
| `modal-46` | historical/disabled `ltx-primary-01`; identity retained for durable job history |
| `modal-47` | historical/disabled `ltx-standby-01`; identity retained for durable job history |

The reciprocal S.A.G.A. allocation is `modal-03` through `modal-41`.

The audit also proved the current unsafe overlap: S.A.G.A. still has historical runnable fleet-management workflows backed by an omnibus `SAGA_MODAL_TOKENS_JSON` secret and capable of targeting accounts now required by RenderLab. `modal-45` demonstrably contains both S.A.G.A.-named FLUX apps and the RenderLab-owned image-upscale app.

RenderLab's current normal generation runtime does not authenticate to Modal. It submits to configured public/server-side gateway URLs. Modal credentials are therefore an infrastructure deployment/maintenance concern, not an application-request credential.

The current Generation Integration worker-availability failure reproduces on untouched RenderLab `main`; this contract does not classify that outage as an Activity/UI regression.

## Ownership decision

### RenderLab-owned Modal accounts

`modal-01`, `modal-02`, `modal-42`, `modal-43`, `modal-44`, `modal-45`, `modal-46`, `modal-47`

Only RenderLab infrastructure operations may deploy, stop, reset, prefetch, rename, replace, or otherwise mutate resources in these accounts unless the owner explicitly changes this decision in both repositories.

Historical disabled worker identities remain RenderLab-owned because persisted generation jobs retain `worker_id`; account or worker-ID reuse must not silently change the meaning of durable job metadata.

### S.A.G.A.-owned Modal accounts

`modal-03` through `modal-41` inclusive.

RenderLab infrastructure tooling must reject those accounts.

## Credential policy

Raw Modal token IDs and token secrets must never be committed.

Repository code may know only stable account labels, project ownership, public gateway identities, and optional non-secret evidence metadata.

The implementation must prefer a RenderLab-specific credential input such as `RENDERLAB_MODAL_TOKENS_JSON` for any future Modal mutation workflow. If an omnibus roster is temporarily available, it must be filtered through the checked-in ownership manifest before credentials are exported as `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET`.

Possession of a secret is not authorization to use every entry in it.

## Required implementation

1. Add a checked-in RenderLab Modal ownership manifest containing the eight allowed account labels and no credentials.
2. Add a small shared verifier/helper that fail-closes on any Modal account not owned by RenderLab.
3. Any RenderLab Modal deployment/maintenance workflow or script added now or later must resolve credentials only after that ownership assertion.
4. Add CI/static verification that validates the ownership manifest, rejects overlap with the documented S.A.G.A. allocation, and rejects new infrastructure mutation paths that bypass the ownership helper/manifest.
5. Record the final rule and verified worker/account mapping in `docs/architecture/INFRASTRUCTURE.md` and add an explicit AI/session rule in `AGENTS.md` that cross-project Modal ownership is locked unless the owner deliberately changes both repositories.
6. Do not rewrite the application worker registry solely to rename existing `saga-*` public gateway URLs. Those URLs are provider resource identities and remain valid until a separately authorized worker migration/redeployment changes them.
7. Do not redeploy or reset any Modal worker as part of the isolation implementation itself.

## Reciprocal S.A.G.A. implementation dependency

S.A.G.A. must independently enforce the inverse allowlist (`modal-03`–`modal-41`) and retire/fail-close historical mutable workflows that target RenderLab-owned accounts. RenderLab isolation is not complete until both repositories have merged their reciprocal guards.

Read-only cross-project audit tooling is not part of ordinary development. Any future cross-pool audit must be explicitly labeled read-only and must not expose credential values.

## Secret-store hardening

Repository guards prevent accidental and policy-invalid cross-project use even if both repositories temporarily retain an omnibus credential secret. They are not a cryptographic substitute for least privilege: a maintainer able to edit workflows and access an omnibus secret could deliberately bypass repository code.

The strongest final state is separate secret material / GitHub Environment scope:

- RenderLab secret scope contains only the eight RenderLab-owned credentials.
- S.A.G.A. secret scope contains only `modal-03`–`modal-41`.

Secret-value editing is an account/operations action and is outside this repository-only implementation unless a connected secret-management capability is explicitly available and authorized.

## Validation matrix

Implementation acceptance requires:

- manifest unit/static tests proving exactly the eight RenderLab account labels are accepted and representative S.A.G.A. labels are rejected;
- a negative test proving an omnibus roster containing all 47 entries cannot yield a non-RenderLab credential through the RenderLab helper;
- repository scan proving no active RenderLab Modal mutation path sets Modal credentials without the ownership guard;
- existing Engineering Quality / generation integration gates remain unchanged;
- reciprocal S.A.G.A. guard merged and verified;
- no raw credential value appears in source, logs, artifacts, issues, or documentation.

The current worker outage may still require a separately authorized health/redeployment recovery after isolation. Isolation completion must not be falsely presented as worker recovery.

## Out of scope

- rotating/revoking Modal credentials;
- editing GitHub secret values;
- deploying/redeploying/stopping/resetting workers;
- changing model selection, gateway protocol, generation semantics, admission, Supabase, R2, or Vercel;
- changing Phase 26 Activity UI implementation;
- migrating existing public gateway names solely to remove the historical `saga-` prefix.

## Exit criteria

This corrective is complete only when:

1. the RenderLab manifest/guard/CI rule and authoritative documentation are merged and verified;
2. the reciprocal S.A.G.A. ownership guard is merged and verified;
3. active code in neither repository can accidentally select a credential outside its assigned account set through the shared roster;
4. any remaining secret-store least-privilege action is explicitly recorded as an operational follow-up rather than implied complete;
5. no Modal resource was mutated merely to implement the governance boundary.

After this gate, RenderLab may resume the blocked Generation Integration diagnosis/recovery under its own assigned Modal accounts and then revalidate PR #205 on an exact clean head.