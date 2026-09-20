# UI-082 Viewer — Media-first v0.1

**Status:** Accepted / implemented / verified checkpoint  
**Tracker:** #305  
**Parent contract:** `docs/ui/MEDIA_FIRST_HIERARCHY_CORRECTION_CONTRACT.md`

## Intent

The durable result is the Viewer. Context, prompt, metadata and actions support it; they do not compete with it.

The current product/security behavior stays unchanged. This file specifies only composition, hierarchy, typography and presentation density for checkpoint 2.

## Desktop composition

```text
← Library   VIEWER / MEDIA
Generated image                                      Favorite  Download
CREATIVE · IMAGE · 1024 × 1536 · 20 SEP 2026

┌────────────────────────────────────────────────────────────────────────────┐
│ RESULT / 01                                                                │
│                                                                            │
│                         durable media result                               │
│                                                                            │
│ RESULT  Generated image                                      1024 / 1536   │
├────────────────────────────────────────────────────────────────────────────┤
│ CONTINUE FROM MEDIA                  [ Edit ] [ Animate ] [ Reuse settings ]│
│ Keep the result in motion.                                                │
├────────────────────────────────────────────────────────────────────────────┤
│ PROMPT                                                                     │
│ Full-body high-fashion editorial photograph …                    (3 lines) │
├────────────────────────────────────────────────────────────────────────────┤
│ [ Prompt ] [ Details ] [ Manage ]                       [ Compare source ] │
└────────────────────────────────────────────────────────────────────────────┘
```

Rules:
- The header is compact enough that the media stage begins in the first viewport.
- The H1 is a stable asset label: display name → original filename → generic Generated/Uploaded image/video. Prompt text is never the H1.
- Favorite/Download stay in the same compact context band as asset identity.
- The result frame uses the stable asset label; prompt text does not repeat in the frame caption.
- The prompt has one attached canonical location beneath the media/continuation region. Collapsed state is line-clamped; the existing Prompt disclosure reveals the complete copy.
- Registration marks remain subordinate accents.
- Wide desktop may use up to roughly 1600px of content width; it should not force prompt or media into a narrow central column on a large display.

## Narrow / touch

```text
← Library   VIEWER / MEDIA
Generated image                       ★   ↓
CREATIVE · IMAGE · 1024 × 1536

┌────────────────────────────┐
│                            │
│         RESULT             │
│                            │
├────────────────────────────┤
│ Edit         Animate       │
│ Reuse settings             │
├────────────────────────────┤
│ PROMPT                     │
│ clamped preview            │
├────────────────────────────┤
│ Prompt Details Manage      │
│ Compare source             │
└────────────────────────────┘
```

Rules:
- 44×44 effective quick actions remain intact.
- Result remains before Source when Compare is open.
- No essential interaction depends on hover.
- Prompt preview is bounded and may not push media below it because it follows the media.
- No horizontal overflow at 390px.

## Typography

- Stable Viewer H1: ~24–30px desktop, ~22–24px narrow.
- Body/prompt: 13–15px with comfortable line height.
- Technical/registration text: 9–11px only when nonessential; essential labels target 10–12px minimum.
- Action controls remain maintained RenderLab primitives.

## Motion

Existing Source Fold and bounded image depth remain. No new animation runtime or new signature motion is introduced. Reduced motion keeps complete settled states and zero-duration disclosure/source transitions where already supported.

## Explicit non-goals

No sidebar, new route, new asset title field, new prompt editing/copy capability, new media action, new persistence, new comparison state or new data contract. This checkpoint fixes presentation hierarchy only.
