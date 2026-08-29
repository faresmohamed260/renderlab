from pathlib import Path

path = Path("docs/ui/UI_MIGRATION.md")
text = path.read_text()

replacements = [
    (
        "- [x] Choose a deliberate bounded product maximum: **2 image references for Image output, 1 image reference for Video output**. UI-046 records the evidence-backed v0.1 boundary; server/UI enforcement is the active implementation task rather than relying on worker permissiveness.",
        "- [x] Choose and enforce a deliberate bounded product maximum: **2 image references for Image output, 1 image reference for Video output**. UI-046 records the evidence-backed v0.1 boundary and PR #53 implements it in the centralized capability, request-validation and Create UI contracts rather than relying on worker permissiveness.",
    ),
    (
        "- [ ] Phase 7A foundation is implemented and verified before Phase 7B/7C/7D are treated as complete.",
        "- [x] The Phase 7A dependency foundation required by later slices is implemented and verified: durable Create uploads, source-aware geometry/ratios, composer hierarchy, stable reference identity/order/roles and prompt addressing are merged. The separate Phase 7A premium-interaction pass remains open as its own Phase 7 exit item and is not misrepresented as complete.",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match, found {count}: {old[:100]!r}")
    text = text.replace(old, new, 1)

path.write_text(text)
print("Finalized Phase 7B tracker consistency.")
