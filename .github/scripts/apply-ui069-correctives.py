from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one match, found {count}")
    target.write_text(text.replace(old, new, 1))


# Create: desktop file drop reuses the existing durable reference-upload transaction.
replace_once(
    "src/features/create/create-workspace.tsx",
    'import { ChevronDown, MoreHorizontal, Plus, Sparkles, Volume2, X } from "lucide-react";',
    'import { ChevronDown, ImagePlus, MoreHorizontal, Plus, Sparkles, Volume2, X } from "lucide-react";',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    'import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";',
    'import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''function isTerminalJob(job: GenerationJob | null) {
  return Boolean(job && ["succeeded", "failed", "cancelled"].includes(job.status));
}

export function CreateWorkspace''',
    '''function isTerminalJob(job: GenerationJob | null) {
  return Boolean(job && ["succeeded", "failed", "cancelled"].includes(job.status));
}

function isFileDrag(event: DragEvent<HTMLElement>) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function CreateWorkspace''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const promptSelectionRef = useRef({ start: 0, end: 0 });
  const [prompt, setPrompt] = useState(() => initialRecipe?.request.prompt ?? "");''',
    '''  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const promptSelectionRef = useRef({ start: 0, end: 0 });
  const referenceDragDepth = useRef(0);
  const [prompt, setPrompt] = useState(() => initialRecipe?.request.prompt ?? "");''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  const [referenceUploadTargetAlias, setReferenceUploadTargetAlias] = useState<GenerationInputAlias | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);''',
    '''  const [referenceUploadTargetAlias, setReferenceUploadTargetAlias] = useState<GenerationInputAlias | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [referenceDragActive, setReferenceDragActive] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  const hasReference = references.length > 0;
  const maxReferences = maxGenerationInputsForOutput(outputKind);

  useEffect(() => {''',
    '''  const hasReference = references.length > 0;
  const maxReferences = maxGenerationInputsForOutput(outputKind);
  const referenceDropAvailable =
    accountAvailable
    && mediaUploadAvailable
    && !referenceUploading
    && references.length < maxReferences;

  useEffect(() => {''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  function chooseReferenceFile(targetAlias: GenerationInputAlias | null) {
    setReferenceUploadTargetAlias(targetAlias);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }

  function startContinuation(action: ContinuationAction) {''',
    '''  function chooseReferenceFile(targetAlias: GenerationInputAlias | null) {
    setReferenceUploadTargetAlias(targetAlias);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  }

  function resetReferenceDragState() {
    referenceDragDepth.current = 0;
    setReferenceDragActive(false);
  }

  function handleReferenceDragEnter(event: DragEvent<HTMLFormElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    referenceDragDepth.current += 1;
    if (!referenceDropAvailable) return;
    setError(null);
    setReferenceDragActive(true);
  }

  function handleReferenceDragOver(event: DragEvent<HTMLFormElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = referenceDropAvailable ? "copy" : "none";
  }

  function handleReferenceDragLeave(event: DragEvent<HTMLFormElement>) {
    if (!isFileDrag(event) || referenceDragDepth.current === 0) return;
    event.preventDefault();
    referenceDragDepth.current = Math.max(0, referenceDragDepth.current - 1);
    if (referenceDragDepth.current === 0) setReferenceDragActive(false);
  }

  async function handleReferenceDrop(event: DragEvent<HTMLFormElement>) {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    resetReferenceDragState();
    if (referenceUploading) return;
    if (!accountAvailable) {
      setError("Sign in to add a private reference image.");
      return;
    }
    if (!mediaUploadAvailable) {
      setError("Reference upload storage is not configured in this environment.");
      return;
    }

    const files = Array.from(event.dataTransfer.files);
    if (files.length !== 1) {
      setError("Drop one image at a time.");
      return;
    }
    await uploadReference(files[0]!, null);
  }

  function startContinuation(action: ContinuationAction) {''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''        <form onSubmit={submit} noValidate className="kinetic-composer relative isolate overflow-hidden rounded-[24px] border p-3 sm:p-4" data-create-instrument="true" data-create-mode={outputKind}>
          <Label htmlFor="create-prompt" className="sr-only">Prompt</Label>
          <Textarea''',
    '''        <form
          onSubmit={submit}
          noValidate
          className="kinetic-composer relative isolate overflow-hidden rounded-[24px] border p-3 sm:p-4"
          data-create-instrument="true"
          data-create-mode={outputKind}
          data-create-drop-active={referenceDragActive ? "true" : "false"}
          onDragEnter={handleReferenceDragEnter}
          onDragOver={handleReferenceDragOver}
          onDragLeave={handleReferenceDragLeave}
          onDrop={(event) => void handleReferenceDrop(event)}
        >
          <Label htmlFor="create-prompt" className="sr-only">Prompt</Label>
          {referenceDragActive ? (
            <div
              className="pointer-events-none absolute inset-0 !z-30 flex items-center justify-center bg-canvas/90 px-6 text-center backdrop-blur-sm"
              data-create-drop-overlay="true"
              role="status"
            >
              <div className="flex flex-col items-center gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-text">
                  <ImagePlus aria-hidden="true" className="size-5 text-accent-bright" />
                  Drop image to add as reference
                </span>
                <span className="text-xs text-text-muted">PNG, JPEG or WebP · up to 25 MB</span>
              </div>
            </div>
          ) : null}
          <Textarea''',
)

# Library: explicit full-route prefetch plus immediate pending feedback while preserving URL/server ownership.
navigation_link = Path("src/features/library/library-navigation-link.tsx")
if navigation_link.exists():
    raise SystemExit("src/features/library/library-navigation-link.tsx already exists")
navigation_link.write_text('''"use client";\n\nimport Link, { useLinkStatus } from "next/link";\nimport type { ComponentProps } from "react";\nimport { Spinner } from "@/components/ui/spinner";\n\nfunction LibraryNavigationPendingIndicator() {\n  const { pending } = useLinkStatus();\n  if (!pending) return null;\n\n  return (\n    <span\n      className="ml-0.5 inline-flex size-3.5 items-center justify-center text-text-muted"\n      data-library-navigation-pending="true"\n      aria-hidden="true"\n    >\n      <Spinner className="size-3.5" />\n    </span>\n  );\n}\n\nexport function LibraryNavigationLink({ children, ...props }: ComponentProps<typeof Link>) {\n  return (\n    <Link {...props} prefetch={true}>\n      {children}\n      <LibraryNavigationPendingIndicator />\n    </Link>\n  );\n}\n''')

replace_once(
    "src/features/library/library-view.tsx",
    'import { LibraryDropUploadSurface } from "@/features/library/library-drop-upload-surface";\nimport { LibrarySortToggle } from "@/features/library/library-sort-toggle";',
    'import { LibraryDropUploadSurface } from "@/features/library/library-drop-upload-surface";\nimport { LibraryNavigationLink } from "@/features/library/library-navigation-link";\nimport { LibrarySortToggle } from "@/features/library/library-sort-toggle";',
)
replace_once(
    "src/features/library/library-view.tsx",
    '''                    <Link
                      href={libraryHref(section.value, kind, searchQuery, sort, favoriteOnly, selectedCollectionId)}
                      aria-current={active ? "page" : undefined}
                    >
                      {section.label}
                    </Link>''',
    '''                    <LibraryNavigationLink
                      href={libraryHref(section.value, kind, searchQuery, sort, favoriteOnly, selectedCollectionId)}
                      aria-current={active ? "page" : undefined}
                    >
                      {section.label}
                    </LibraryNavigationLink>''',
)
replace_once(
    "src/features/library/library-view.tsx",
    '''                      <Link
                        href={libraryHref(tab, filter.value, searchQuery, sort, favoriteOnly, selectedCollectionId)}
                        aria-current={active ? "page" : undefined}
                      >
                        {filter.label}
                      </Link>''',
    '''                      <LibraryNavigationLink
                        href={libraryHref(tab, filter.value, searchQuery, sort, favoriteOnly, selectedCollectionId)}
                        aria-current={active ? "page" : undefined}
                      >
                        {filter.label}
                      </LibraryNavigationLink>''',
)
replace_once(
    "src/features/library/library-view.tsx",
    '              <div className="grid w-full grid-cols-2 items-start gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">',
    '              <div className="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">',
)
replace_once(
    "src/features/library/library-view.tsx",
    '''                <Button asChild variant={favoriteOnly ? "secondary" : "outline"} size="sm" className="w-full sm:w-auto">
                  <Link href={libraryHref(tab, kind, searchQuery, sort, !favoriteOnly, selectedCollectionId)}>
                    <Star aria-hidden="true" data-icon="inline-start" className={favoriteOnly ? "fill-current" : undefined} />
                    Favorites
                  </Link>
                </Button>''',
    '''                <Button asChild variant={favoriteOnly ? "secondary" : "outline"} size="sm" className="w-full self-center sm:w-auto">
                  <LibraryNavigationLink href={libraryHref(tab, kind, searchQuery, sort, !favoriteOnly, selectedCollectionId)}>
                    <Star aria-hidden="true" data-icon="inline-start" className={favoriteOnly ? "fill-current" : undefined} />
                    Favorites
                  </LibraryNavigationLink>
                </Button>''',
)
replace_once(
    "src/features/library/library-collection-menu.tsx",
    '<div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">',
    '<div className="flex min-w-0 flex-col items-stretch sm:items-end">',
)
replace_once(
    "src/features/library/library-collection-menu.tsx",
    '''      <Collapsible open={managerOpen} onOpenChange={setManagerOpen}>
        <CollapsibleContent>''',
    '''      <Collapsible open={managerOpen} onOpenChange={setManagerOpen}>
        <CollapsibleContent className="pt-2">''',
)
replace_once(
    "src/features/library/library-sort-toggle.tsx",
    '''import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";''',
    '''import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LibraryNavigationLink } from "@/features/library/library-navigation-link";''',
)
replace_once(
    "src/features/library/library-sort-toggle.tsx",
    '''      <Link href={nextHref} aria-label={`${label}. Switch to ${nextLabel} first.`}>
        <ArrowUpDown aria-hidden="true" data-icon="inline-start" />
        {label}
      </Link>''',
    '''      <LibraryNavigationLink href={nextHref} aria-label={`${label}. Switch to ${nextLabel} first.`}>
        <ArrowUpDown aria-hidden="true" data-icon="inline-start" />
        {label}
      </LibraryNavigationLink>''',
)

# Viewer: prevent intrinsic media/long titles from forcing the one-column layout wider than the viewport.
replace_once(
    "src/features/library/media-viewer.tsx",
    '        <div className="kinetic-viewer-layout mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_304px] lg:items-start lg:gap-6">',
    '        <div className="kinetic-viewer-layout mt-4 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_304px] lg:items-start lg:gap-6">',
)
replace_once(
    "src/features/library/media-viewer.tsx",
    '          <aside className="kinetic-viewer-rail rounded-2xl border border-border p-4 sm:p-5">',
    '          <aside className="kinetic-viewer-rail min-w-0 rounded-2xl border border-border p-4 sm:p-5">',
)
replace_once(
    "src/features/library/media-viewer.tsx",
    '<h2 className="mt-3 text-xl font-semibold leading-7 text-text">{title}</h2>',
    '<h2 className="mt-3 break-words text-xl font-semibold leading-7 text-text [overflow-wrap:anywhere]">{title}</h2>',
)
replace_once(
    "src/features/library/media-viewer.tsx",
    '<dl className="mt-3 grid grid-cols-[92px_1fr] gap-x-3 gap-y-2 text-sm">',
    '<dl className="mt-3 grid min-w-0 grid-cols-[92px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">',
)
replace_once(
    "src/features/library/media-viewer.tsx",
    '<dd className="break-words text-text">{asset.originalFilename}</dd>',
    '<dd className="min-w-0 break-words text-text [overflow-wrap:anywhere]">{asset.originalFilename}</dd>',
)
replace_once(
    "src/features/library/media-viewer-comparison.tsx",
    '        className="kinetic-viewer-stage flex min-h-[52vh] items-center justify-center overflow-hidden rounded-2xl border border-border p-2 sm:p-4 lg:min-h-[70vh]"',
    '        className="kinetic-viewer-stage flex min-h-[52vh] w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border border-border p-2 sm:p-4 lg:min-h-[70vh]"',
)
replace_once(
    "src/features/library/media-viewer-comparison.tsx",
    '      className="kinetic-compare-stage grid gap-3 lg:grid-cols-[minmax(220px,2fr)_minmax(0,3fr)] lg:items-stretch"',
    '      className="kinetic-compare-stage grid min-w-0 gap-3 lg:grid-cols-[minmax(220px,2fr)_minmax(0,3fr)] lg:items-stretch"',
)
replace_once(
    "src/features/library/media-viewer-comparison.tsx",
    '        className="kinetic-compare-result order-1 flex min-h-[52vh] flex-col rounded-2xl border border-accent/50 p-2 sm:p-4 lg:order-2 lg:min-h-[70vh]"',
    '        className="kinetic-compare-result order-1 flex min-h-[52vh] min-w-0 flex-col rounded-2xl border border-accent/50 p-2 sm:p-4 lg:order-2 lg:min-h-[70vh]"',
)
replace_once(
    "src/features/library/media-viewer-comparison.tsx",
    '        className="kinetic-compare-source order-2 rounded-2xl border border-border p-3 lg:order-1 lg:flex lg:min-h-[70vh] lg:flex-col lg:p-4"',
    '        className="kinetic-compare-source order-2 min-w-0 rounded-2xl border border-border p-3 lg:order-1 lg:flex lg:min-h-[70vh] lg:flex-col lg:p-4"',
)

# Configured Create lifecycle: prove the second durable reference can arrive by drag/drop instead of the picker.
replace_once(
    "scripts/verify-create-lifecycle.mjs",
    '''  const secondTicketPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-tickets") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  const secondCompletionPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-completions") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  const secondChooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
  await addReference.click();
  const secondChooser = await secondChooserPromise;
  await secondChooser.setFiles({
    name: "phase-7b-secondary-reference.png",
    mimeType: "image/png",
    buffer: secondaryReferenceBytes,
  });
  await secondTicketPromise;
  const secondCompletion = await secondCompletionPromise;
  const secondCompletionPayload = await secondCompletion.json().catch(() => null);
  assert(secondCompletion.ok() && secondCompletionPayload?.ok && secondCompletionPayload.asset?.id, `Second Create reference upload failed: ${JSON.stringify(secondCompletionPayload)}`);
  const originalSecondaryAssetId = secondCompletionPayload.asset.id;''',
    '''  const secondTicketPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-tickets") && response.request().method() === "POST",
    { timeout: 30_000 },
  );
  const secondCompletionPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-completions") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  const composer = page.locator('[data-create-instrument="true"]');
  const droppedReferenceData = await page.evaluateHandle(({ base64 }) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], "phase-7b-secondary-reference.png", { type: "image/png" }));
    return transfer;
  }, { base64: secondaryReferenceBytes.toString("base64") });
  await composer.dispatchEvent("dragenter", { dataTransfer: droppedReferenceData });
  await page.locator('[data-create-drop-overlay="true"]').waitFor({ state: "visible", timeout: 5_000 });
  await composer.dispatchEvent("dragover", { dataTransfer: droppedReferenceData });
  await composer.dispatchEvent("drop", { dataTransfer: droppedReferenceData });
  await page.locator('[data-create-drop-overlay="true"]').waitFor({ state: "hidden", timeout: 5_000 });
  await secondTicketPromise;
  const secondCompletion = await secondCompletionPromise;
  const secondCompletionPayload = await secondCompletion.json().catch(() => null);
  await droppedReferenceData.dispose();
  assert(secondCompletion.ok() && secondCompletionPayload?.ok && secondCompletionPayload.asset?.id, `Dragged Create reference upload failed: ${JSON.stringify(secondCompletionPayload)}`);
  const originalSecondaryAssetId = secondCompletionPayload.asset.id;''',
)

# Configured Library lifecycle: reproduce the user-reported long-name intermediate-width Viewer overflow.
replace_once(
    "scripts/verify-library-lifecycle.mjs",
    'const fixtureFilename = "renderlab-اختبار-画像.png";',
    'const fixtureFilename = "file_00000001390820a9d2b9d79fa42e541_اختبار_画像.png";',
)
replace_once(
    "scripts/verify-library-lifecycle.mjs",
    '''const desktopViewport = { width: 1440, height: 1024 };
const mobileViewport = { width: 390, height: 844 };''',
    '''const desktopViewport = { width: 1440, height: 1024 };
const intermediateViewport = { width: 700, height: 900 };
const mobileViewport = { width: 390, height: 844 };''',
)
replace_once(
    "scripts/verify-library-lifecycle.mjs",
    '''  await page.screenshot({ path: `${artifactDir}/library-lifecycle-desktop-viewer.png`, fullPage: true });

  await page.setViewportSize(mobileViewport);''',
    '''  await page.screenshot({ path: `${artifactDir}/library-lifecycle-desktop-viewer.png`, fullPage: true });

  await page.setViewportSize(intermediateViewport);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  const viewerLayoutMetrics = await page.locator(".kinetic-viewer-layout").evaluate((layout) => {
    const layoutBox = layout.getBoundingClientRect();
    const stage = document.getElementById("media-viewer-comparison")?.getBoundingClientRect() || null;
    const rail = document.querySelector(".kinetic-viewer-rail")?.getBoundingClientRect() || null;
    return {
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      layoutLeft: layoutBox.left,
      layoutRight: layoutBox.right,
      stageLeft: stage?.left ?? null,
      stageRight: stage?.right ?? null,
      railLeft: rail?.left ?? null,
      railRight: rail?.right ?? null,
    };
  });
  assert(viewerLayoutMetrics.scrollWidth <= viewerLayoutMetrics.innerWidth, `Intermediate Viewer overflowed horizontally: ${JSON.stringify(viewerLayoutMetrics)}`);
  assert(viewerLayoutMetrics.layoutLeft >= 0 && viewerLayoutMetrics.layoutRight <= viewerLayoutMetrics.innerWidth, `Intermediate Viewer layout escaped the viewport: ${JSON.stringify(viewerLayoutMetrics)}`);
  assert(viewerLayoutMetrics.stageLeft !== null && viewerLayoutMetrics.stageLeft >= 0 && viewerLayoutMetrics.stageRight <= viewerLayoutMetrics.innerWidth, `Intermediate Viewer media stage escaped the viewport: ${JSON.stringify(viewerLayoutMetrics)}`);
  assert(viewerLayoutMetrics.railLeft !== null && viewerLayoutMetrics.railLeft >= 0 && viewerLayoutMetrics.railRight <= viewerLayoutMetrics.innerWidth, `Intermediate Viewer rail escaped the viewport: ${JSON.stringify(viewerLayoutMetrics)}`);
  await page.screenshot({ path: `${artifactDir}/library-lifecycle-intermediate-viewer.png`, fullPage: true });

  await page.setViewportSize(mobileViewport);''',
)

# Library history: catch the closed Collections wrapper's phantom gap misalignment.
replace_once(
    "scripts/verify-library-history.mjs",
    '''  const sortButton = page.getByRole("link", { name: /^Oldest first\\. Switch to newest first\\.$/ });
  await sortButton.waitFor({ state: "visible", timeout: 30_000 });
  const oldestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);''',
    '''  const sortButton = page.getByRole("link", { name: /^Oldest first\\. Switch to newest first\\.$/ });
  await sortButton.waitFor({ state: "visible", timeout: 30_000 });
  const favoritesButton = page.getByRole("link", { name: "Favorites", exact: true });
  const collectionsButton = page.getByRole("button", { name: "Collections", exact: true });
  const [favoritesBox, collectionsBox, sortBox] = await Promise.all([
    favoritesButton.boundingBox(),
    collectionsButton.boundingBox(),
    sortButton.boundingBox(),
  ]);
  assert(favoritesBox && collectionsBox && sortBox, "Could not measure Library action controls.");
  const favoritesCenter = favoritesBox.y + favoritesBox.height / 2;
  const collectionsCenter = collectionsBox.y + collectionsBox.height / 2;
  const sortCenter = sortBox.y + sortBox.height / 2;
  assert(Math.abs(favoritesCenter - collectionsCenter) <= 1 && Math.abs(favoritesCenter - sortCenter) <= 1, `Library action controls are vertically misaligned: ${JSON.stringify({ favoritesBox, collectionsBox, sortBox })}`);
  assert(Math.abs(favoritesBox.height - collectionsBox.height) <= 1 && Math.abs(favoritesBox.height - sortBox.height) <= 1, `Library action controls do not share one control height: ${JSON.stringify({ favoritesBox, collectionsBox, sortBox })}`);
  const oldestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);''',
)

# Sanity guards.
for path in [
    "src/features/create/create-workspace.tsx",
    "src/features/library/library-view.tsx",
    "src/features/library/library-collection-menu.tsx",
    "src/features/library/library-sort-toggle.tsx",
    "src/features/library/media-viewer.tsx",
    "src/features/library/media-viewer-comparison.tsx",
    "scripts/verify-create-lifecycle.mjs",
    "scripts/verify-library-lifecycle.mjs",
    "scripts/verify-library-history.mjs",
]:
    text = Path(path).read_text()
    if "\r\n" in text:
        raise SystemExit(f"{path}: unexpected CRLF")
