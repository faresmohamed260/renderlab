# UI Decision Historical Evidence

This directory stores historical UI decision evidence that is useful for provenance but is not current decision authority.

Current UI decision authority remains `docs/ui/UI_DECISIONS.md`. That current file should optimize for the durable decision itself: status, decision, reason/context, consequences, supersession, and concise links to evidence. Exact workflow run IDs, artifact digests, PR/merge chronology, rollout/deployment narratives, and run-by-run closure detail belong here or under `docs/audits/**` once they are no longer needed to decide today's product behavior.

## Pre-separation snapshot

`UI_DECISIONS_PRE_EVIDENCE_SEPARATION_2026-10-12.md` is a lossless repository snapshot of `docs/ui/UI_DECISIONS.md` from protected `main` before decision/evidence separation began.

Provenance:
- repository commit: `e46eb0088128105560d95249a79354b768f0f75d`;
- source blob: `ad2b71d3a1169cc04407ffc02b05685082654a13`;
- snapshot date: `2026-10-12` UTC.

The snapshot preserves the mixed decision + implementation/verification evidence exactly as it existed at that point. It is historical evidence, not a competing current decision register.

## Migration boundary

Governance remediation is intentionally incremental. This checkpoint establishes the lossless evidence anchor and the repository rule for future separation. A later checkpoint may remove detailed historical evidence from `docs/ui/UI_DECISIONS.md` only after confirming that every still-binding decision, reason/context, consequence, supersession relationship, and evidence pointer remains represented in current authority.

Do not update this snapshot to match later current state. Update the current UI authority instead.
