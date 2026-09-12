import { readFile, writeFile } from "node:fs/promises";

async function insertBefore(path, marker, section) {
  const text = await readFile(path, "utf8");
  if (text.includes(section.heading)) {
    console.log(`${path}: roadmap section already present`);
    return;
  }
  const index = text.indexOf(marker);
  if (index < 0) throw new Error(`${path}: insertion marker not found`);
  const next = `${text.slice(0, index)}\n${section.body.trim()}\n${text.slice(index)}`;
  await writeFile(path, next, "utf8");
  console.log(`${path}: roadmap section inserted`);
}

await insertBefore(
  "PROJECT.md",
  "\n## Current Verified Baseline — 2026-09-12\n",
  {
    heading: "## UI/UX redesign program — continuation roadmap — 2026-09-12",
    body: `## UI/UX redesign program — continuation roadmap — 2026-09-12
**Status: ACTIVE — Landing, Create and Library completed; remaining product surfaces still require redesign.**

Phase 24 closed the approved Library Gallery Rail slice; it did **not** close the broader RenderLab UI/UX redesign program. The redesign must continue as one coherent system derived from the locked Lab Grid identity, approved Lab Matrix Landing, Clear Composer / UI-074 application language and Gallery Rail / UI-075 media language.

Completed redesign slices:
- **Landing:** approved Lab Matrix public experience, production-live.
- **Create:** approved Clear Composer v0.5 plus UI-074 fidelity correction, merged and verified, not yet deployed.
- **Library:** approved Gallery Rail v0.3 / UI-075, merged and verified, not yet deployed.
- **Application shell:** UI-074 compact horizontal header is the current shared shell geometry and should be maintained/cohered rather than restarted as a competing navigation system.

Remaining redesign roadmap, under progressive phase planning:
1. **Phase 25 — Media Viewer:** ACTIVE R&D in issue #196. Extend Gallery Rail media-object continuity into a cinematic inspection/continuation workspace while preserving all current Viewer product/security/capability contracts. Viewer remains a 3/4-expressiveness surface.
2. **Phase 26 — Activity:** roadmap only until Phase 25 evidence closes. Bring real generation lifecycle/history states into the same authored system at 2/4 expressiveness without weakening Retry / Run Again / Cancel truth or operational clarity.
3. **Phase 27 — Settings / account-security flows:** roadmap only. Apply the shared typography, spacing, shell and trust language at 1/4 expressiveness across signed-out, signed-in, access-status, password and recovery states.
4. **Phase 28 — Admin:** roadmap only. Apply the coherent system to the privileged operational surface at 1/4 expressiveness while preserving dense clarity and authorization boundaries.
5. **Phase 29 — whole-product cohesion pass:** roadmap only. Audit the completed system end-to-end for shell/navigation continuity, typography, spacing, responsive behavior, empty/loading/error states, focus/touch semantics, reduced motion and cross-surface transitions before calling the redesign program complete.

Only the immediate Phase 25 R&D slice may be expanded now; later phases remain roadmap-level until predecessor evidence exists. Every remaining surface must reuse the established RenderLab visual/interaction family rather than inventing a new theme. Production deployment remains separate and explicit; current production is still source \`0173c4c5ba08360b6352331118abc81978cfa774\` at READY deployment \`dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991\`, with automatic Git → Vercel deployment disabled.
`,
  },
);

await insertBefore(
  "docs/ui/UI_MIGRATION.md",
  "\n## Phase 0 — Product & Capability Baseline\n",
  {
    heading: "## Active full-product redesign roadmap — after Phase 24",
    body: `## Active full-product redesign roadmap — after Phase 24
**Status: \`IN PROGRESS\`.** Phase 24 completes the Library slice only; the full UI/UX redesign is not complete.

The coherent design authority carried forward is the current locked Lab Grid identity + approved Lab Matrix Landing + Clear Composer/UI-074 + Gallery Rail/UI-075. Remaining redesign work must reuse that family—editorial hierarchy, technical microtype, Lab Matrix registration, restrained cool/warm atmosphere, compact horizontal shell, media-first composition, obvious ordinary controls and bounded meaningful motion—rather than introducing independent visual systems per screen.

- [x] Landing redesign — approved / production-live.
- [x] Create redesign — user-approved / exact-head verified / merged / merged-main verified / not deployed.
- [x] Library redesign — user-approved / exact-head verified / merged / merged-main verified / not deployed.
- [ ] **Phase 25 Media Viewer redesign — ACTIVE R&D (#196).** Audit current desktop/390px image/video/Compare/Upscale/action states; build interaction references; explore 3+ same-family compositions; prototype signature Library→Viewer / Compare / Viewer→Create continuity; obtain explicit user approval before a production implementation contract.
- [ ] **Phase 26 Activity redesign — ROADMAP ONLY.** Expand only after Phase 25 produces verified evidence.
- [ ] **Phase 27 Settings/account-security redesign — ROADMAP ONLY.** Expand only after the prior slice closes.
- [ ] **Phase 28 Admin redesign — ROADMAP ONLY.** Expand only after the prior slice closes.
- [ ] **Phase 29 whole-product cohesion pass — ROADMAP ONLY.** Final cross-surface audit before the redesign program may be called complete.

UI-074 already establishes the shared application-shell geometry; shell changes during later slices should be cohesion corrections only unless a separate explicit redesign decision reopens that system. None of this roadmap authorizes backend/schema/security/product-contract changes or production deployment.
`,
  },
);
