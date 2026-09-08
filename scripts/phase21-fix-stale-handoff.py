from pathlib import Path

path = Path("docs/ui/UI_MIGRATION.md")
text = path.read_text()
old = "Production deployment remains explicit and separate. PR #122 squash-merged as `09ea91f753be5279428ccf25a7b043300678c3f3`; all 10 merged-main workflows / 11 check-runs passed on that merged tree, including Video Generation Integration `34156796984`. A post-merge Vercel audit found no deployment at or after the merge. Phase 20 is complete/verified/merged, and Phase 21 is now ready for execution-contract expansion only; implementation has not begun."
new = "Production deployment remains explicit and separate. PR #122 squash-merged as `09ea91f753be5279428ccf25a7b043300678c3f3`; all 10 merged-main workflows / 11 check-runs passed on that merged tree, including Video Generation Integration `34156796984`. A post-merge Vercel audit found no deployment at or after the merge. That Phase 20 closure made Phase 21 ready for execution-contract expansion; Phase 21 has since been implemented and verified in the tracker below, while production deployment remains separate and unauthorized."
if text.count(old) != 1:
    raise SystemExit(f"expected one stale Phase 20 handoff sentence, found {text.count(old)}")
path.write_text(text.replace(old, new, 1).rstrip() + "\n")
