from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


# Library server composition: styling hooks only; URL/product semantics are unchanged.
replace_once(
    "src/features/library/library-view.tsx",
    '<section className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:px-10 lg:pt-16">',
    '<section className="kinetic-media-workspace mx-auto w-full max-w-[1240px] px-4 pb-28 pt-10 sm:px-8 sm:pb-16 sm:pt-14 lg:px-10 lg:pt-16">',
)
replace_once(
    "src/features/library/library-view.tsx",
    '<nav className="mt-8 inline-flex rounded-lg border border-border bg-surface-1 p-1" aria-label="Library sections">',
    '<nav className="kinetic-media-tabs mt-8 inline-flex rounded-xl border border-border p-1" aria-label="Library sections">',
)
replace_once(
    "src/features/library/library-view.tsx",
    '<div className="mt-5 flex flex-wrap items-center justify-between gap-3">',
    '<div className="kinetic-media-toolbar mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3 sm:px-4">',
)
replace_once(
    "src/features/library/library-view.tsx",
    '<form action="/library" method="get" role="search" className="mt-4 flex w-full max-w-xl items-center gap-2">',
    '<form action="/library" method="get" role="search" className="kinetic-media-search mt-4 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border p-2">',
)

# Library cards and selection: static truth + CSS-led bounded depth.
replace_once(
    "src/features/library/library-batch-selection.tsx",
    'className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.015]"',
    'className="kinetic-media-preview size-full object-cover"',
)
replace_once(
    "src/features/library/library-batch-selection.tsx",
    '<img src={asset.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />',
    '<img src={asset.thumbnailUrl} alt="" loading="lazy" className="kinetic-media-preview size-full object-cover" />',
)
replace_once(
    "src/features/library/library-batch-selection.tsx",
    'className="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-1 px-3 py-2.5"',
    'className="kinetic-selection-deck flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-3 py-2.5 sm:px-4"',
)
replace_once(
    "src/features/library/library-batch-selection.tsx",
    'className={`group block min-w-0 overflow-hidden rounded-xl border bg-surface-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${\n                  selected ? "border-accent ring-1 ring-accent" : "border-border hover:border-text-muted/60"\n                }`}',
    'className={`kinetic-media-card group block min-w-0 overflow-hidden rounded-2xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${\n                  selected ? "border-accent ring-1 ring-accent" : "border-border"\n                }`}\n                data-selected={selected ? "true" : "false"}',
)
replace_once(
    "src/features/library/library-batch-selection.tsx",
    '<div className="aspect-[4/3] overflow-hidden bg-surface-2">',
    '<div className="kinetic-media-frame aspect-[4/3] overflow-hidden bg-surface-2">',
)
replace_once(
    "src/features/library/library-batch-selection.tsx",
    '<div className="p-3">\n                  <p className="truncate text-sm font-medium text-text">{title}</p>',
    '<div className="kinetic-media-meta p-3">\n                  <p className="truncate text-sm font-medium text-text">{title}</p>',
)
replace_once(
    "src/features/library/library-batch-selection.tsx",
    '<div className="absolute left-2 top-2 z-10 rounded-lg bg-canvas/80 p-1 shadow-sm backdrop-blur-sm">',
    '<div className="kinetic-selection-check absolute left-2 top-2 z-10 rounded-xl p-1 shadow-sm">',
)

# Viewer composition: same action ordering and capabilities, new media-first hierarchy.
replace_once(
    "src/features/library/media-viewer.tsx",
    '<section className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:px-10 lg:pt-12">',
    '<section className="kinetic-viewer-workspace mx-auto w-full max-w-[1240px] px-4 pb-28 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:px-10 lg:pt-12">',
)
replace_once(
    "src/features/library/media-viewer.tsx",
    '<div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">',
    '<div className="kinetic-viewer-layout mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_304px] lg:items-start lg:gap-6">',
)
replace_once(
    "src/features/library/media-viewer.tsx",
    '<aside className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5">',
    '<aside className="kinetic-viewer-rail rounded-2xl border border-border p-4 sm:p-5">',
)

# Comparison is the only new Motion client behavior; reduced motion keeps the same complete layouts.
replace_once(
    "src/features/library/media-viewer-comparison.tsx",
    'import Link from "next/link";\nimport {\n',
    'import Link from "next/link";\nimport { AnimatePresence, motion, useReducedMotion } from "motion/react";\nimport {\n',
)
replace_once(
    "src/features/library/media-viewer-comparison.tsx",
    'className="max-h-[78vh] max-w-full rounded-xl object-contain"',
    'className="kinetic-viewer-media max-h-[78vh] max-w-full rounded-xl object-contain"',
)
replace_once(
    "src/features/library/media-viewer-comparison.tsx",
    'className="max-h-[78vh] max-w-full rounded-xl"',
    'className="kinetic-viewer-media max-h-[78vh] max-w-full rounded-xl"',
)

p = Path("src/features/library/media-viewer-comparison.tsx")
text = p.read_text()
start = text.index("export function MediaViewerMediaStage({")
end = text.index("export function MediaViewerCompareButton()")
new_stage = r'''export function MediaViewerMediaStage({
  asset,
  title,
  source,
  sourceTitle,
}: {
  asset: PublicMediaAsset;
  title: string;
  source: PublicMediaAsset | null;
  sourceTitle: string | null;
}) {
  const { open } = useComparison();
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: "easeOut" as const };

  return (
    <AnimatePresence initial={false} mode="wait">
      {!source || !open ? (
        <motion.div
          key="result-only"
          id={comparisonRegionId}
          className="kinetic-viewer-stage flex min-h-[52vh] items-center justify-center overflow-hidden rounded-2xl border border-border p-2 sm:p-4 lg:min-h-[70vh]"
          initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.992 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4, scale: 0.996 }}
          transition={transition}
        >
          <ResultMedia asset={asset} title={title} />
        </motion.div>
      ) : (
        <motion.div
          key="source-result"
          id={comparisonRegionId}
          className="kinetic-compare-stage grid gap-3 lg:grid-cols-[minmax(220px,2fr)_minmax(0,3fr)] lg:items-stretch"
          aria-label="Source and result comparison"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
          transition={transition}
        >
          <motion.div
            layout={!reduceMotion}
            className="kinetic-compare-result order-1 flex min-h-[52vh] flex-col rounded-2xl border border-accent/50 p-2 sm:p-4 lg:order-2 lg:min-h-[70vh]"
            transition={transition}
          >
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text">
              {asset.kind === "video" ? "Result video" : "Result"}
            </p>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-surface-2 p-2 sm:p-3">
              <ResultMedia asset={asset} title={title} />
            </div>
          </motion.div>

          <motion.div
            layout={!reduceMotion}
            className="kinetic-compare-source order-2 rounded-2xl border border-border p-3 lg:order-1 lg:flex lg:min-h-[70vh] lg:flex-col lg:p-4"
            initial={reduceMotion ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={transition}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Source</p>
            <div className="mt-2 grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:items-stretch lg:justify-center">
              <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl bg-surface-2 p-1.5 lg:h-auto lg:min-h-0 lg:flex-1 lg:p-2">
                <img
                  src={source.contentUrl}
                  alt={sourceTitle || "Source image"}
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              </div>
              <div className="min-w-0 lg:pt-3">
                <p className="line-clamp-2 text-sm text-text">{sourceTitle || "Source image"}</p>
                <Button asChild variant="secondary" size="sm" className="mt-2">
                  <Link href={`/library/${encodeURIComponent(source.id)}`}>Open source</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'''
p.write_text(text[:start] + new_stage + text[end:])

# Kinetic Precision media styling, built only from existing tokens.
css = Path("src/app/globals.css")
text = css.read_text()
marker = "@keyframes kinetic-precision-reveal {\n"
if text.count(marker) != 1:
    raise SystemExit("globals.css keyframe insertion marker missing or duplicated")
media_css = r'''.kinetic-media-workspace,
.kinetic-viewer-workspace {
  position: relative;
  isolation: isolate;
}

.kinetic-media-workspace::before,
.kinetic-viewer-workspace::before {
  position: absolute;
  inset: 0 3% auto;
  z-index: -1;
  height: 360px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 18% 18%, rgb(129 114 246 / 11%), transparent 38%),
    radial-gradient(circle at 82% 8%, rgb(115 215 255 / 6%), transparent 34%);
  filter: blur(34px);
  content: "";
  pointer-events: none;
}

.kinetic-media-tabs,
.kinetic-media-toolbar,
.kinetic-media-search,
.kinetic-selection-deck,
.kinetic-viewer-rail {
  background:
    linear-gradient(180deg, rgb(255 255 255 / 3.2%), transparent 28%),
    linear-gradient(118deg, rgb(129 114 246 / 5%), transparent 42%, rgb(115 215 255 / 2.5%)),
    rgb(10 12 18 / 72%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 7%),
    0 16px 46px rgb(0 0 0 / 17%);
  backdrop-filter: blur(20px) saturate(128%);
  -webkit-backdrop-filter: blur(20px) saturate(128%);
}

.kinetic-media-toolbar,
.kinetic-media-search {
  border-color: rgb(255 255 255 / 7%);
}

.kinetic-media-card {
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

.kinetic-media-frame {
  position: relative;
  isolation: isolate;
}

.kinetic-media-frame::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    linear-gradient(180deg, transparent 62%, rgb(5 6 10 / 30%)),
    radial-gradient(circle at 82% 0%, rgb(115 215 255 / 6%), transparent 32%);
  content: "";
  pointer-events: none;
}

.kinetic-media-preview {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 180ms ease;
}

.kinetic-media-meta {
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

.kinetic-viewer-layout {
  perspective: 1600px;
}

.kinetic-viewer-stage,
.kinetic-compare-result,
.kinetic-compare-source {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(circle at 50% 18%, rgb(129 114 246 / 7%), transparent 34%),
    linear-gradient(180deg, rgb(255 255 255 / 2.8%), transparent 24%),
    rgb(9 11 16 / 84%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 7%),
    0 30px 84px rgb(0 0 0 / 28%);
  backdrop-filter: blur(22px) saturate(126%);
  -webkit-backdrop-filter: blur(22px) saturate(126%);
}

.kinetic-viewer-stage::before,
.kinetic-compare-result::before {
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background:
    linear-gradient(90deg, transparent 12%, rgb(178 167 255 / 20%) 48%, rgb(115 215 255 / 10%) 70%, transparent 90%) top / 78% 1px no-repeat,
    radial-gradient(circle at 50% 100%, rgb(129 114 246 / 8%), transparent 38%);
  content: "";
  pointer-events: none;
}

.kinetic-viewer-media {
  filter: drop-shadow(0 24px 48px rgb(0 0 0 / 30%));
}

.kinetic-viewer-rail {
  position: sticky;
  top: 88px;
  border-color: rgb(255 255 255 / 8%);
}

.kinetic-viewer-rail::before {
  position: absolute;
  inset-block: 10%;
  left: -1px;
  width: 1px;
  border-radius: 999px;
  background: linear-gradient(to bottom, transparent, rgb(178 167 255 / 28%), rgb(115 215 255 / 12%), transparent);
  box-shadow: 0 0 24px rgb(129 114 246 / 18%);
  content: "";
  pointer-events: none;
}

.kinetic-compare-result {
  border-color: rgb(178 167 255 / 42%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 8%),
    0 0 0 1px rgb(129 114 246 / 10%),
    0 30px 84px rgb(0 0 0 / 30%),
    0 0 36px rgb(129 114 246 / 10%);
}

.kinetic-compare-source {
  border-color: rgb(255 255 255 / 7%);
  background:
    linear-gradient(180deg, rgb(255 255 255 / 2.5%), transparent 24%),
    rgb(9 11 16 / 72%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 5%), 0 20px 56px rgb(0 0 0 / 20%);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
}

@media (hover: hover) and (pointer: fine) {
  .kinetic-media-card:hover {
    border-color: rgb(178 167 255 / 28%);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 8%),
      0 22px 48px rgb(0 0 0 / 26%),
      0 0 28px rgb(129 114 246 / 9%);
    transform: translateY(-4px) rotateX(0.45deg) rotateY(-0.7deg);
  }

  .kinetic-media-card:hover::before {
    opacity: 0.82;
  }

  .kinetic-media-card:hover .kinetic-media-preview {
    transform: scale(1.018);
    filter: saturate(1.035) contrast(1.015);
  }
}

@media (max-width: 1023px) {
  .kinetic-viewer-rail {
    position: relative;
    top: auto;
  }
}

@keyframes kinetic-selection-enter {
  from {
    opacity: 0;
    transform: translateY(-5px) scale(0.992);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

'''
css.write_text(text.replace(marker, media_css + marker, 1))

# Reduced-motion extension for CSS-only affordances.
text = css.read_text()
reduce_marker = '''  .kinetic-lifecycle[data-active="true"]::after {
    left: 34%;
    opacity: 0.1;
  }
}'''
replacement = '''  .kinetic-lifecycle[data-active="true"]::after {
    left: 34%;
    opacity: 0.1;
  }

  .kinetic-media-card,
  .kinetic-media-preview {
    transition: none;
  }

  .kinetic-media-card:hover,
  .kinetic-media-card:focus-visible,
  .kinetic-media-card:hover .kinetic-media-preview {
    transform: none;
    filter: none;
  }

  .kinetic-selection-deck {
    animation: none;
  }
}
'''
if text.count(reduce_marker) != 1:
    raise SystemExit("globals.css reduced-motion marker missing or duplicated")
css.write_text(text.replace(reduce_marker, replacement, 1))

# Branch source of truth: implementation started, acceptance not yet claimed.
replace_once(
    "PROJECT.md",
    "**Status: `ACCEPTED / DESIGN CHECKPOINT REVIEWED / IMPLEMENTATION NOT STARTED`.**",
    "**Status: `IMPLEMENTATION IN DRAFT / VALIDATION PENDING`.**",
)
replace_once(
    "docs/ui/UI_MIGRATION.md",
    "**Status: `DESIGN CHECKPOINT REVIEWED / IMPLEMENTATION NOT STARTED`.** UI-064 is the controlling visual/product decision.",
    "**Status: `IMPLEMENTATION IN DRAFT / VALIDATION PENDING`.** UI-064 is the controlling visual/product decision.",
)
replace_once(
    "docs/ui/UI_DECISIONS.md",
    "**Status:** Accepted / Design checkpoint reviewed / Implementation not started",
    "**Status:** Accepted / Implementation in draft / Validation pending",
)
