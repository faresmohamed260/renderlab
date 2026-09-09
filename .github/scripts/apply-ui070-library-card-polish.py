from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one replacement target, found {count}")
    target.write_text(text.replace(old, new, 1))


batch_path = "src/features/library/library-batch-selection.tsx"
replace_once(
    batch_path,
    '<span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-canvas/80 px-2 py-1 text-[11px] font-semibold text-text backdrop-blur-sm">',
    '<span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-canvas/70 px-2 py-1 text-[11px] font-semibold text-text shadow-sm backdrop-blur-md">',
)

old_card = '''              <Link
                href={`/library/${encodeURIComponent(asset.id)}`}
                className={`kinetic-media-card group block min-w-0 overflow-hidden rounded-2xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  selected ? "border-accent ring-1 ring-accent" : "border-border"
                }`}
                data-selected={selected ? "true" : "false"}
                aria-label={`Open ${title}`}
              >
                <div className="kinetic-media-frame aspect-[4/3] overflow-hidden bg-surface-2">
                  <MediaPreview asset={asset} />
                </div>
                <div className="kinetic-media-meta p-3">
                  <p className="truncate text-sm font-medium text-text">{title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                    <span>{asset.kind === "image" ? "Image" : "Video"}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={asset.createdAt}>{createdLabel(asset.createdAt)}</time>
                  </p>
                </div>
              </Link>
              {selectionMode ? (
                <div className="kinetic-selection-check absolute left-2 top-2 z-10 rounded-xl p-1 shadow-sm">
                  <Checkbox
                    className="size-9 border-2 bg-canvas/90"
                    checked={selected}
                    onCheckedChange={(checked) => toggleAsset(asset.id, checked === true)}
                    aria-label={`Select ${title}`}
                    disabled={busy}
                  />
                </div>
              ) : null}'''
new_card = '''              <Link
                href={`/library/${encodeURIComponent(asset.id)}`}
                className={`kinetic-media-card group block min-w-0 overflow-hidden rounded-2xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  selected ? "border-accent" : "border-border"
                }`}
                data-selected={selected ? "true" : "false"}
                aria-label={`Open ${title}`}
              >
                <div className="kinetic-media-frame aspect-[4/3] overflow-hidden bg-surface-2">
                  <MediaPreview asset={asset} />
                  <div className="kinetic-media-meta absolute inset-x-2 bottom-2 z-[3] rounded-xl px-3 py-2.5">
                    <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-text drop-shadow-sm">{title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                      <span>{asset.kind === "image" ? "Image" : "Video"}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={asset.createdAt}>{createdLabel(asset.createdAt)}</time>
                    </p>
                  </div>
                </div>
              </Link>
              {selectionMode ? (
                <div className="absolute left-1.5 top-1.5 z-10">
                  <Checkbox
                    className="kinetic-selection-checkbox size-11"
                    checked={selected}
                    onCheckedChange={(checked) => toggleAsset(asset.id, checked === true)}
                    aria-label={`Select ${title}`}
                    disabled={busy}
                  />
                </div>
              ) : null}'''
replace_once(batch_path, old_card, new_card)

css_path = "src/app/globals.css"
replace_once(
    css_path,
    '''.kinetic-media-card {
  position: relative;
  isolation: isolate;
  border-color: rgb(255 255 255 / 8%);
  background:
    linear-gradient(180deg, rgb(255 255 255 / 3%), transparent 28%),
    rgb(10 12 18 / 78%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 6%),
    0 14px 38px rgb(0 0 0 / 19%);
  transform: translateZ(0);
  transform-origin: center 72%;
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.kinetic-media-card::before {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  background:
    linear-gradient(125deg, rgb(178 167 255 / 8%), transparent 18% 72%, rgb(115 215 255 / 5%)),
    linear-gradient(90deg, transparent 8%, rgb(178 167 255 / 18%) 50%, transparent 92%) top / 66% 1px no-repeat;
  opacity: 0.52;
  transition: opacity 180ms ease;
  content: "";
  pointer-events: none;
}

.kinetic-media-card[data-selected="true"] {
  border-color: rgb(178 167 255 / 72%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 10%),
    0 0 0 1px rgb(129 114 246 / 44%),
    0 18px 44px rgb(0 0 0 / 26%),
    0 0 30px rgb(129 114 246 / 17%);
}

.kinetic-media-card[data-selected="true"]::before {
  opacity: 0.92;
}
''',
    '''.kinetic-media-card {
  position: relative;
  isolation: isolate;
  border-color: rgb(255 255 255 / 10%);
  background: rgb(8 10 15 / 82%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 7%),
    0 18px 42px rgb(0 0 0 / 24%),
    0 0 0 1px rgb(129 114 246 / 2%);
  transform: translateZ(0);
  transform-origin: center 72%;
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.kinetic-media-card::before {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  background:
    linear-gradient(128deg, rgb(178 167 255 / 10%), transparent 20% 74%, rgb(115 215 255 / 7%)),
    linear-gradient(90deg, transparent 10%, rgb(255 255 255 / 18%) 50%, transparent 90%) top / 70% 1px no-repeat;
  opacity: 0.58;
  transition: opacity 180ms ease;
  content: "";
  pointer-events: none;
}

.kinetic-media-card[data-selected="true"] {
  border-color: rgb(178 167 255 / 58%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 10%),
    0 0 0 1px rgb(129 114 246 / 24%),
    0 20px 46px rgb(0 0 0 / 28%),
    0 0 26px rgb(129 114 246 / 12%);
}

.kinetic-media-card[data-selected="true"]::before {
  opacity: 0.9;
}
''',
)
replace_once(
    css_path,
    '''.kinetic-media-frame::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(180deg, transparent 62%, rgb(5 6 10 / 30%)),
    radial-gradient(circle at 82% 0%, rgb(115 215 255 / 6%), transparent 32%);
  content: "";
  pointer-events: none;
}
''',
    '''.kinetic-media-frame::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(180deg, rgb(5 6 10 / 2%) 0%, transparent 42%, rgb(5 6 10 / 18%) 70%, rgb(5 6 10 / 48%) 100%),
    radial-gradient(circle at 82% 0%, rgb(115 215 255 / 7%), transparent 34%);
  content: "";
  pointer-events: none;
}
''',
)
replace_once(
    css_path,
    '''.kinetic-media-meta {
  position: relative;
  z-index: 3;
  background: linear-gradient(180deg, rgb(14 16 22 / 72%), rgb(9 11 16 / 93%));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.kinetic-selection-deck {
  border-color: rgb(178 167 255 / 18%);
  animation: kinetic-selection-enter 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.kinetic-selection-check {
  border: 1px solid rgb(255 255 255 / 10%);
  background: rgb(6 7 10 / 78%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 8%), 0 8px 26px rgb(0 0 0 / 28%);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}
''',
    '''.kinetic-media-meta {
  border: 1px solid rgb(255 255 255 / 10%);
  background:
    linear-gradient(180deg, rgb(255 255 255 / 5%), transparent 42%),
    linear-gradient(120deg, rgb(129 114 246 / 8%), transparent 48%, rgb(115 215 255 / 4%)),
    rgb(8 10 15 / 72%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 9%),
    0 10px 28px rgb(0 0 0 / 30%);
  backdrop-filter: blur(18px) saturate(128%);
  -webkit-backdrop-filter: blur(18px) saturate(128%);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.kinetic-media-card[data-selected="true"] .kinetic-media-meta {
  border-color: rgb(178 167 255 / 24%);
}

.kinetic-selection-deck {
  border-color: rgb(178 167 255 / 18%);
  animation: kinetic-selection-enter 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.kinetic-selection-checkbox,
.kinetic-selection-checkbox[data-state="checked"] {
  position: relative;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.kinetic-selection-checkbox::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 22px;
  height: 22px;
  border: 1px solid rgb(255 255 255 / 24%);
  border-radius: 7px;
  background: rgb(6 7 10 / 76%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 9%),
    0 5px 18px rgb(0 0 0 / 32%);
  transform: translate(-50%, -50%);
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
  content: "";
  backdrop-filter: blur(14px) saturate(128%);
  -webkit-backdrop-filter: blur(14px) saturate(128%);
}

.kinetic-selection-checkbox:hover::before {
  border-color: rgb(178 167 255 / 44%);
  background: rgb(10 11 17 / 88%);
}

.kinetic-selection-checkbox[data-state="checked"]::before {
  border-color: rgb(178 167 255 / 68%);
  background: linear-gradient(145deg, rgb(129 114 246 / 94%), rgb(105 94 222 / 90%));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 18%),
    0 6px 18px rgb(0 0 0 / 30%),
    0 0 0 1px rgb(129 114 246 / 16%);
}

.kinetic-selection-checkbox [data-slot="checkbox-indicator"] {
  position: relative;
  z-index: 1;
}

.kinetic-selection-checkbox [data-slot="checkbox-indicator"] svg {
  width: 13px;
  height: 13px;
}
''',
)
replace_once(
    css_path,
    '''  .kinetic-media-card:hover .kinetic-media-preview {
    transform: scale(1.018);
    filter: saturate(1.035) contrast(1.015);
  }
''',
    '''  .kinetic-media-card:hover .kinetic-media-preview {
    transform: scale(1.024);
    filter: saturate(1.04) contrast(1.018);
  }

  .kinetic-media-card:hover .kinetic-media-meta {
    border-color: rgb(178 167 255 / 20%);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 11%),
      0 12px 30px rgb(0 0 0 / 34%);
  }
''',
)

verifier = "scripts/verify-library-history.mjs"
verifier_anchor = '''  const oldestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);
  assert(oldestOrder[0] === `/library/${older.id}` && oldestOrder[1] === `/library/${newer.id}`, `Browser oldest-first order was incorrect: ${JSON.stringify(oldestOrder)}`);

  const imagesHref = await page.getByRole("link", { name: "Images", exact: true }).getAttribute("href");'''
verifier_insert = '''  const oldestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);
  assert(oldestOrder[0] === `/library/${older.id}` && oldestOrder[1] === `/library/${newer.id}`, `Browser oldest-first order was incorrect: ${JSON.stringify(oldestOrder)}`);

  await page.getByRole("button", { name: "Select", exact: true }).click();
  const olderCheckbox = page.getByRole("checkbox", { name: `Select ${token} Older`, exact: true });
  await olderCheckbox.waitFor({ state: "visible", timeout: 30_000 });
  const checkboxHitBox = await olderCheckbox.boundingBox();
  assert(checkboxHitBox && checkboxHitBox.width >= 43 && checkboxHitBox.height >= 43, `Library selection checkbox lost its practical hit target: ${JSON.stringify(checkboxHitBox)}`);
  const checkboxVisualBox = await olderCheckbox.evaluate((node) => {
    const visual = getComputedStyle(node, "::before");
    return { width: visual.width, height: visual.height };
  });
  assert(checkboxVisualBox.width === "22px" && checkboxVisualBox.height === "22px", `Library selection checkbox visual box is not compact: ${JSON.stringify(checkboxVisualBox)}`);
  await olderCheckbox.click();
  assert(await olderCheckbox.getAttribute("data-state") === "checked", "Library selection checkbox did not enter checked state.");

  const olderCard = page.locator(`a[href="/library/${older.id}"]`);
  const cardBox = await olderCard.boundingBox();
  const frameBox = await olderCard.locator(".kinetic-media-frame").boundingBox();
  assert(cardBox && frameBox && Math.abs(cardBox.height - frameBox.height) <= 1, `Library media card metadata is still consuming a separate footer row: ${JSON.stringify({ cardBox, frameBox })}`);
  const metadataPosition = await olderCard.locator(".kinetic-media-meta").evaluate((node) => getComputedStyle(node).position);
  assert(metadataPosition === "absolute", `Library media metadata is not integrated over the media frame: ${metadataPosition}`);
  await page.screenshot({ path: `${artifactDir}/library-history-desktop-selected-card.png`, fullPage: true });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  const imagesHref = await page.getByRole("link", { name: "Images", exact: true }).getAttribute("href");'''
replace_once(verifier, verifier_anchor, verifier_insert)
replace_once(
    verifier,
    '''  assert(await page.getByRole("link", { name: /^Newest first\\. Switch to oldest first\\.$/ }).isVisible(), "Library history sort toggle is not visible on mobile.");
  await page.screenshot({ path: `${artifactDir}/library-history-mobile-newest.png`, fullPage: true });
''',
    '''  assert(await page.getByRole("link", { name: /^Newest first\\. Switch to oldest first\\.$/ }).isVisible(), "Library history sort toggle is not visible on mobile.");
  await page.screenshot({ path: `${artifactDir}/library-history-mobile-newest.png`, fullPage: true });
  await page.getByRole("button", { name: "Select", exact: true }).click();
  const mobileCheckbox = page.getByRole("checkbox").first();
  await mobileCheckbox.click();
  await page.screenshot({ path: `${artifactDir}/library-history-mobile-selected-card.png`, fullPage: true });
''',
)

project_path = "PROJECT.md"
project_anchor = '- Repository `main` additionally includes two verified post-production UI corrections not yet deployed: UI-068 / PR #138 merge `c33539ae682d1d1d32cc4c0eb410ec94fd556666` (desktop Create shell/composer focus cleanup) and UI-069 / PR #140 merge `c71554b692864c84cd1bc9f796255fdde71eae43` (Create reference drag/drop, Viewer narrow/intermediate containment, Library action alignment and explicit prefetch/pending feedback for URL/server-owned Library navigation). UI-069 exact PR head `cf065b62032d8b2d3be497b358b0b81067a99675` passed all 22 attached workflows and all six workflows attached to merged `main` passed. Live production remains source `0d584c5dab288ad1e99a7b7c1aac2a2ec12bf814` recorded above.'
project_new = project_anchor + '\n- UI-070 is a user-authorized post-production Library visual correction currently implemented on the work branch and awaiting exact-head rendered verification: card-level selection keeps the maintained Checkbox semantics with a 44×44 interactive root but a compact 22×22 visible box, and Library media cards become media-first full-bleed tiles with a floating glass metadata shelf instead of a separate opaque footer. No Library data, route, selection, media, schema or deployment contract changes.'
replace_once(project_path, project_anchor, project_new)

screen_path = "docs/ui/SCREEN_REGISTRY.md"
screen_anchor = '- UI-034 adds an explicit Library `Select` mode over only the current rendered page, maintained Checkbox selection, Select/Clear Page, Cancel and one destructive batch Delete action. Selection resets when the Library URL/server view changes.'
screen_new = screen_anchor + '\n- UI-070 keeps UI-034 selection semantics unchanged while making card-level selection visually compact: the maintained checkbox retains a 44×44 interactive/focus root with a centered 22×22 visible control. Library cards use the media frame as the full card surface with a compact floating glass metadata shelf for title/kind/date rather than a separate opaque footer; no card quick actions or client-owned media state are introduced.'
replace_once(screen_path, screen_anchor, screen_new)

catalog_path = "docs/ui/COMPONENT_CATALOG.md"
catalog_anchor = '**Notes:** UI-034 final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed UI Shell `33220710365`, Library Batch Delete `33220710307` and the complete 16-gate affected suite; PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`. Responsive selection/confirmation review was clean.'
catalog_new = catalog_anchor + '\n\n**UI-070 composition note:** Library keeps the same maintained Radix Checkbox root and checked/focus semantics, but the card composition uses a 44×44 transparent interactive root around a centered 22×22 visible box so selection remains practical without visually dominating the media card.'
replace_once(catalog_path, catalog_anchor, catalog_new)

decisions_path = Path("docs/ui/UI_DECISIONS.md")
decisions = decisions_path.read_text()
marker = "### UI-070 — Library media cards are media-first and selection chrome is visually compact"
if marker in decisions:
    raise SystemExit("UI_DECISIONS.md: UI-070 marker already exists")
decisions += '''

### UI-070 — Library media cards are media-first and selection chrome is visually compact
**Status:** Accepted / Implemented / Verification pending
**Date:** 2026-09-10

**Decision:** User-directed post-production review refines only the Library card presentation and card-level selection chrome. The maintained Radix Checkbox remains the selection mechanic, keyboard/focus semantics remain unchanged, and its interactive root stays 44×44px; the visible box is reduced to 22×22px and uses restrained checked-state accent treatment instead of the previous 36×36px filled square inside a second styled shell. Library media cards remain links to the same Viewer and keep the same title/kind/date information, but the visual composition becomes media-first: the 4:3 media frame is the full card surface and metadata sits in a compact floating glass shelf over the lower media edge rather than a separate opaque footer. Video identity moves to the top-right so it cannot compete with the top-left selection control.

**Guardrails:** No card quick actions, Favorite/Collection controls, client-owned media/filter state, selection persistence, route, grid-count, durable media identity or server contract changes. The card remains fully understandable without hover; hover only adds restrained lift/saturation using the existing reduced-motion-safe Kinetic Precision system. No new primitive, animation runtime or dependency is introduced.

**Verification requirement:** Exact-head UI purity/lint/typecheck/unit/build must pass, configured Library History must prove the 44px checkbox root / 22px visual box and integrated metadata geometry, and desktop + 390px selected-card screenshots must be human-reviewed before this decision is marked Verified/Merged. Production rollout remains a separate explicit operation and UI-070 does not authorize Phase 23 / Cycle 5.
'''
decisions_path.write_text(decisions)

migration_path = Path("docs/ui/UI_MIGRATION.md")
migration = migration_path.read_text()
migration_marker = "## Post-production UI-070 Library card polish — 2026-09-10"
if migration_marker in migration:
    raise SystemExit("UI_MIGRATION.md: UI-070 marker already exists")
migration += '''

## Post-production UI-070 Library card polish — 2026-09-10
**Status: `ACCEPTED / IMPLEMENTED / VERIFICATION PENDING`.**

This is a user-directed post-production Library presentation correction, not Phase 23 / Cycle 5.

- [x] Replace the visually oversized card selection control with a centered 22×22 visible checkbox while retaining the maintained 44×44 Checkbox interaction/focus root and unchanged page-scoped selection semantics.
- [x] Refine Library media cards from a plain media-plus-opaque-footer stack into a media-first full-card tile with a compact floating glass title/kind/date shelf, restrained selected-state accent, and non-overlapping top-right Video identity.
- [x] Preserve the same card Viewer link, media geometry, grid, title/kind/date data, selection lifecycle, server/URL ownership and reduced-motion behavior; add no card quick actions or new dependency.
- [ ] Exact-head cheap engineering gates pass.
- [ ] Configured Library History verifies checkbox/card geometry and emits desktop + 390px selected-card artifacts.
- [ ] Human rendered review accepts selected/unselected cards at desktop and 390px.
- [ ] PR exact-head affected workflows pass and merged-main state is verified before marking UI-070 complete.

Live production remains exact source `0d584c5dab288ad1e99a7b7c1aac2a2ec12bf814` at READY deployment `dpl_BpMCWYggKkzf8FuWpb2vLun46r3M`. UI-068, UI-069 and this UI-070 work remain outside production until a separate explicit rollout is authorized.
'''
migration_path.write_text(migration)
