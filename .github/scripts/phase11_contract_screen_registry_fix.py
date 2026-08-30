from pathlib import Path

path = Path("docs/ui/SCREEN_REGISTRY.md")
text = path.read_text()

old_planned = '''### Brand / Landing — planned Cycle 2 launch surface
**Route:** TBD; current `/` remains Create until Phase 11 explicitly changes information architecture.
**Status:** PLANNED — Phase 11
**Purpose:** RenderLab brand identity, logo/banners, landing/onboarding presentation and launch messaging appropriate to the access posture.
**Boundary:** Phase 11 must explicitly decide whether a landing page takes `/` and Create moves elsewhere or whether landing uses another route. No route change is implied by planning alone.'''

new_target = '''### Brand / Landing — Phase 11 target
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

appended = '''\n\n### Brand / Landing — Phase 11 target
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

**Related route migration:** Create remains `APPROVED` at current `/` until implementation. Phase 11 will move that same authoritative Create surface to `/create`, update the application shell accordingly and preserve legacy `/?source=...&action=...` continuation intent through a same-origin redirect to `/create` before existing server validation.\n'''

if text.count(old_planned) != 1:
    raise SystemExit(f"expected one old planned Brand/Landing section, found {text.count(old_planned)}")
if text.count(appended) != 1:
    raise SystemExit(f"expected one appended duplicate Brand/Landing section, found {text.count(appended)}")

text = text.replace(old_planned, new_target, 1)
text = text.replace(appended, "\n", 1)
path.write_text(text)
