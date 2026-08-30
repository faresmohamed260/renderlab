from pathlib import Path

p = Path("docs/ui/UI_DECISIONS.md")
text = p.read_text()
old = "### UI-052 — Public landing owns `/`; Create moves to `/create`\n**Status:** Accepted  \n**Date:** 2026-08-30  \n"
new = "### UI-052 — Public landing owns `/`; Create moves to `/create`\n**Status:** Accepted\n**Date:** 2026-08-30\n"
if text.count(old) != 1:
    raise SystemExit("UI_DECISIONS: expected one UI-052 status block")
p.write_text(text.replace(old, new, 1))

p = Path("docs/ui/SCREEN_REGISTRY.md")
text = p.read_text()
old = "### Brand / Landing — Phase 11 target\n**Target route:** `/`  \n**Status:** PLANNED — UI-052 contract accepted; implementation not started  \n**Current repository reality:** `/` still serves the approved Create workspace until Phase 11 implementation merges.  \n"
new = "### Brand / Landing — Phase 11 target\n**Target route:** `/`\n**Status:** PLANNED — UI-052 contract accepted; implementation not started\n**Current repository reality:** `/` still serves the approved Create workspace until Phase 11 implementation merges.\n"
if text.count(old) != 1:
    raise SystemExit("SCREEN_REGISTRY: expected one Phase 11 target status block")
p.write_text(text.replace(old, new, 1))
