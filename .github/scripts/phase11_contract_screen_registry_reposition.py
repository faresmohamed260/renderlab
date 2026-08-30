from pathlib import Path

path = Path("docs/ui/SCREEN_REGISTRY.md")
text = path.read_text()
section = '''### Brand / Landing — Phase 11 target
**Target route:** `/`
**Status:** PLANNED — UI-052 contract accepted; implementation not started
**Current repository reality:** `/` still serves the approved Create workspace until Phase 11 implementation merges.

**Purpose:** Public product home for RenderLab identity, verified creative capability and closed-beta entry into the application.

**Locked target behavior:**
- marketing surface renders outside `AppShell` while sharing RenderLab global tokens/theme;
- primary `Open Create` → `/create`; account `Sign in` → `/settings`;
- concise truthful product proof for Create/Edit Image, Create/Animate Video, durable reference/Library reuse and Activity/recovery continuity;
- no public signup/waitlist, pricing, testimonials, fabricated metrics, provider/model claims or unverified capability;
- desktop+narrow design checkpoint precedes implementation; final surface requires responsive/accessibility/reduced-motion browser review.

**Related route migration:** Create remains `APPROVED` at current `/` until implementation. Phase 11 will move that same authoritative Create surface to `/create`, update the application shell accordingly and preserve legacy `/?source=...&action=...` continuation intent through a same-origin redirect to `/create` before existing server validation.'''
anchor = "## Creation Experience Resolution"
if text.count(section) != 1:
    raise SystemExit(f"expected one Brand/Landing target section, found {text.count(section)}")
if text.count(anchor) != 1:
    raise SystemExit(f"expected one creation-resolution anchor, found {text.count(anchor)}")
text = text.replace("\n\n" + section, "", 1)
text = text.replace(anchor, section + "\n\n" + anchor, 1)
path.write_text(text)
