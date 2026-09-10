# Landing Brand R&D 0.1 prototype

**Status:** EXPERIMENTAL design evidence for issue #158. This is not a production route and must not be deployed as product UI.

Open `index.html` through an ordinary static HTTP server. The prototype demonstrates the `Resolved Thread` interaction hypothesis:
- bounded pointer depth in the hero media stack;
- one scroll-driven media object changing from Create → Shape → Motion → Keep;
- responsive non-pinned narrow behavior;
- `prefers-reduced-motion` static resolved behavior.

The prototype contains no product API calls, Auth behavior, generation state, storage state, or production dependencies. CTA hrefs are intentionally inert placeholders; product navigation remains owned by the real Landing implementation.

See `design/brand/landing-brand-rd-v0.1.md` and issue #158 for the complete design boundary and acceptance gate.
