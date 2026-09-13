from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


project = Path("PROJECT.md")
text = project.read_text()
text = replace_once(
    text,
    "## UI/UX redesign program — continuation roadmap — 2026-09-12",
    "## UI/UX redesign program — continuation roadmap — 2026-09-13",
    "PROJECT roadmap date",
)
text = replace_once(
    text,
    "Phase 24 closed the approved Library Gallery Rail slice; it did **not** close the broader RenderLab UI/UX redesign program. The redesign must continue as one coherent system derived from the locked Lab Grid identity, approved Lab Matrix Landing, Clear Composer / UI-074 application language and Gallery Rail / UI-075 media language.",
    "Phase 26 closes the approved Activity Job Matrix + History Register slice; it does **not** close the broader RenderLab UI/UX redesign program. The redesign must continue as one coherent system derived from the locked Lab Grid identity, approved Lab Matrix Landing, Clear Composer / UI-074 application language, Gallery Rail / UI-075 media language, Media Register + Source Fold / UI-076, and Job Matrix + History Register / UI-077.",
    "PROJECT roadmap authority",
)
project.write_text(text)


migration = Path("docs/ui/UI_MIGRATION.md")
text = migration.read_text()
text = replace_once(
    text,
    "**Status: `IN PROGRESS`.** Phase 25 completes the Media Viewer slice only; the full UI/UX redesign is not complete.",
    "**Status: `IN PROGRESS`.** Phase 26 completes the Activity slice; Settings, Admin and the final whole-product cohesion pass remain.",
    "UI_MIGRATION roadmap status",
)
text = replace_once(
    text,
    "The coherent design authority carried forward is the current locked Lab Grid identity + approved Lab Matrix Landing + Clear Composer/UI-074 + Gallery Rail/UI-075. Remaining redesign work must reuse that family—editorial hierarchy, technical microtype, Lab Matrix registration, restrained cool/warm atmosphere, compact horizontal shell, media-first composition, obvious ordinary controls and bounded meaningful motion—rather than introducing independent visual systems per screen.",
    "The coherent design authority carried forward is the current locked Lab Grid identity + approved Lab Matrix Landing + Clear Composer/UI-074 + Gallery Rail/UI-075 + Media Register/Source Fold UI-076 + Job Matrix/History Register UI-077. Remaining redesign work must reuse that family—editorial hierarchy, technical microtype, Lab Matrix registration, restrained cool/warm atmosphere, compact horizontal shell, media-first composition, obvious ordinary controls and bounded meaningful motion—rather than introducing independent visual systems per screen.",
    "UI_MIGRATION design authority",
)
migration.write_text(text)


decisions = Path("docs/ui/UI_DECISIONS.md")
text = decisions.read_text()
start_marker = "### UI-077 — Activity uses a chronological Job Matrix with an attached History Register"
start = text.find(start_marker)
if start < 0:
    raise SystemExit("UI-077 section missing")
next_start = text.find("\n### UI-", start + len(start_marker))
end = len(text) if next_start < 0 else next_start
section = text[start:end]
section = replace_once(
    section,
    "**Implementation gate:** `docs/ui/ACTIVITY_JOB_MATRIX_IMPLEMENTATION_CONTRACT.md` must be merged before production Activity source changes. Functional QA and fidelity QA remain separate: a technically green implementation still fails if it materially returns to isolated rounded cards/status-pill-led hierarchy, becomes an Admin ledger, fabricates progress, breaks the `01 / 02 / 03` → attached-register chronology, or diverges from the accepted desktop/390px/temporal/reduced-motion evidence. Production deployment remains separately explicit.",
    "**Implementation gate:** satisfied through planning PR #204 before production source changes. Functional QA and fidelity QA remain separate: future Activity changes still fail if they materially return to isolated rounded cards/status-pill-led hierarchy, become an Admin ledger, fabricate progress, break the `01 / 02 / 03` → attached-register chronology, or diverge from the accepted desktop/390px/temporal/reduced-motion evidence. Production deployment remains separately explicit.",
    "UI-077 implementation gate",
)
text = text[:start] + section + text[end:]
decisions.write_text(text.rstrip() + "\n")


registry = Path("docs/ui/SCREEN_REGISTRY.md")
text = registry.read_text()
text = text.replace(
    "Production remains unchanged pending separate authorization.\n\n\n**Current verified behavior:**",
    "Production remains unchanged pending separate authorization.\n\n**Current verified behavior:**",
    1,
)
registry.write_text(text)
