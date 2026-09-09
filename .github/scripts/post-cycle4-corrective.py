from pathlib import Path

BASE = "b3aae9d3159aa3daeeff0390b585d010aa6f71c2"


def replace_once(path: str, old: str, new: str, label: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    p.write_text(text.replace(old, new, 1))


def replace_exact_count(path: str, old: str, new: str, expected: int, label: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected exactly {expected} matches, found {count}")
    p.write_text(text.replace(old, new))


def append_once(path: str, marker: str, block: str):
    p = Path(path)
    text = p.read_text()
    if marker in text:
        raise SystemExit(f"{path}: marker already exists: {marker}")
    p.write_text(text.rstrip() + "\n\n" + block.strip() + "\n")

# 1) AppShell top-right utility alignment.
replace_once(
    "src/components/shell/app-shell.tsx",
    '''function UtilityIcon({ children, reduceMotion }: { children: ReactNode; reduceMotion: boolean }) {
  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.035 }}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      transition={navSpring}
    >
      {children}
    </motion.div>
  );
}''',
    '''function UtilityIcon({ children, reduceMotion }: { children: ReactNode; reduceMotion: boolean }) {
  return (
    <motion.div
      className="flex size-11 shrink-0 items-center justify-center"
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.035 }}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      transition={navSpring}
    >
      {children}
    </motion.div>
  );
}''',
    "AppShell utility wrapper alignment",
)
replace_once(
    "src/components/shell/app-shell.tsx",
    '''          <div className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-black/15 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_20px_rgba(129,114,246,0.04)]">''',
    '''          <div className="ml-auto grid grid-cols-2 place-items-center gap-1 rounded-xl border border-white/[0.07] bg-black/15 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_20px_rgba(129,114,246,0.04)]">''',
    "AppShell utility cluster layout",
)

# 2/3) Library toolbar spacing and direct sort toggle.
replace_once(
    "src/features/library/library-view.tsx",
    '''import { LibrarySortMenu } from "@/features/library/library-sort-menu";''',
    '''import { LibrarySortToggle } from "@/features/library/library-sort-toggle";''',
    "Library sort import",
)
replace_once(
    "src/features/library/library-view.tsx",
    '''            <div className="kinetic-media-toolbar mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3 sm:px-4">
              <nav className="flex rounded-lg bg-surface-2 p-1" aria-label="Library media type">''',
    '''            <div className="kinetic-media-toolbar mt-5 flex flex-col items-stretch gap-3 rounded-2xl border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <nav className="grid w-full grid-cols-3 rounded-lg bg-surface-2 p-1 sm:flex sm:w-auto" aria-label="Library media type">''',
    "Library toolbar mobile layout",
)
replace_once(
    "src/features/library/library-view.tsx",
    '''                    <Button key={filter.value} asChild variant={active ? "secondary" : "ghost"} size="sm">''',
    '''                    <Button key={filter.value} asChild variant={active ? "secondary" : "ghost"} size="sm" className="w-full sm:w-auto">''',
    "Library filter button widths",
)
replace_once(
    "src/features/library/library-view.tsx",
    '''              <div className="flex flex-wrap items-start justify-end gap-2">
                <Button asChild variant={favoriteOnly ? "secondary" : "outline"} size="sm">''',
    '''              <div className="grid w-full grid-cols-2 items-start gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
                <Button asChild variant={favoriteOnly ? "secondary" : "outline"} size="sm" className="w-full sm:w-auto">''',
    "Library action group mobile layout",
)
replace_once(
    "src/features/library/library-view.tsx",
    '''                <LibrarySortMenu
                  sort={sort}
                  newestHref={libraryHref(tab, kind, searchQuery, "newest", favoriteOnly, selectedCollectionId)}
                  oldestHref={libraryHref(tab, kind, searchQuery, "oldest", favoriteOnly, selectedCollectionId)}
                />''',
    '''                <LibrarySortToggle
                  sort={sort}
                  newestHref={libraryHref(tab, kind, searchQuery, "newest", favoriteOnly, selectedCollectionId)}
                  oldestHref={libraryHref(tab, kind, searchQuery, "oldest", favoriteOnly, selectedCollectionId)}
                />''',
    "Library sort component usage",
)
Path("src/features/library/library-sort-toggle.tsx").write_text('''import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaAssetSortOrder } from "@/lib/api/media-assets-contract";

export function LibrarySortToggle({
  sort,
  newestHref,
  oldestHref,
}: {
  sort: MediaAssetSortOrder;
  newestHref: string;
  oldestHref: string;
}) {
  const nextHref = sort === "newest" ? oldestHref : newestHref;
  const label = sort === "oldest" ? "Oldest first" : "Newest first";
  const nextLabel = sort === "oldest" ? "newest" : "oldest";

  return (
    <Button asChild variant="outline" size="sm" className="col-span-2 w-full sm:w-auto">
      <Link href={nextHref} aria-label={`${label}. Switch to ${nextLabel} first.`}>
        <ArrowUpDown aria-hidden="true" data-icon="inline-start" />
        {label}
      </Link>
    </Button>
  );
}
''')
Path("src/features/library/library-sort-menu.tsx").unlink()
replace_once(
    "src/features/library/library-collection-menu.tsx",
    '''    <div className="flex min-w-0 flex-col items-end gap-2">''',
    '''    <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">''',
    "Collection menu mobile width",
)
replace_once(
    "src/features/library/library-collection-menu.tsx",
    '''          <Button variant={selected ? "secondary" : "outline"} size="sm" className="max-w-56">''',
    '''          <Button variant={selected ? "secondary" : "outline"} size="sm" className="w-full max-w-none sm:w-auto sm:max-w-56">''',
    "Collection trigger mobile width",
)

# 4/7) Create trigger spacing + rotating headline.
replace_once(
    "src/features/create/create-workspace.tsx",
    '''const imageModelTriggerLabels: Record<ImageGenerationModel, string> = {
  "flux2-klein-9b": "FLUX",
  "qwen-image-edit-2511": "Qwen",
};''',
    '''const imageModelTriggerLabels: Record<ImageGenerationModel, string> = {
  "flux2-klein-9b": "FLUX",
  "qwen-image-edit-2511": "Qwen",
};
const rotatingCreateHeadlines = [
  "What do you want to create?",
  "What do you want to explore?",
  "What do you want to transform?",
  "What do you want to imagine?",
] as const;''',
    "Rotating Create headline phrases",
)
replace_exact_count(
    "src/features/create/create-workspace.tsx",
    '''          className="relative shrink-0 gap-0 !pl-1.5 !pr-4"''',
    '''          className="shrink-0 gap-1 !px-1.5"''',
    3,
    "Create compact trigger spacing",
)
replace_exact_count(
    "src/features/create/create-workspace.tsx",
    '''<ChevronDown aria-hidden="true" className="absolute right-1 size-3 opacity-70" />''',
    '''<ChevronDown aria-hidden="true" className="size-3 opacity-70" />''',
    3,
    "Create compact chevron spacing",
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  const [referenceMentionOpen, setReferenceMentionOpen] = useState(false);''',
    '''  const [referenceMentionOpen, setReferenceMentionOpen] = useState(false);
  const [createHeadlineIndex, setCreateHeadlineIndex] = useState(0);''',
    "Create headline state",
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  const hasReference = references.length > 0;
  const maxReferences = maxGenerationInputsForOutput(outputKind);
  const heading = hasReference
    ? outputKind === "image"
      ? "Edit an image"
      : "Animate an image"
    : outputKind === "image"
      ? "What do you want to create?"
      : "Create a video";''',
    '''  const hasReference = references.length > 0;
  const maxReferences = maxGenerationInputsForOutput(outputKind);

  useEffect(() => {
    if (reduceMotion || hasReference || outputKind !== "image") {
      setCreateHeadlineIndex(0);
      return;
    }
    const intervalId = window.setInterval(() => {
      setCreateHeadlineIndex((current) => (current + 1) % rotatingCreateHeadlines.length);
    }, 4200);
    return () => window.clearInterval(intervalId);
  }, [hasReference, outputKind, reduceMotion]);

  const heading = hasReference
    ? outputKind === "image"
      ? "Edit an image"
      : "Animate an image"
    : outputKind === "image"
      ? rotatingCreateHeadlines[createHeadlineIndex]
      : "Create a video";''',
    "Create rotating headline effect",
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''            <h2 className="text-[30px] font-semibold tracking-[-0.035em] text-text sm:text-[34px]">{heading}</h2>''',
    '''            <h2 className="min-h-[4.75rem] text-[30px] font-semibold tracking-[-0.035em] text-text sm:min-h-[2.75rem] sm:text-[34px]">
              {!hasReference && outputKind === "image" ? (
                <AnimatePresence initial={false} mode="wait">
                  <motion.span
                    key={createHeadlineIndex}
                    className="block"
                    aria-live="polite"
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
                  >
                    {heading}
                  </motion.span>
                </AnimatePresence>
              ) : heading}
            </h2>''',
    "Create headline rendering",
)

# 5) Shared conservative random seed helper + Advanced die button + failed Retry randomization.
replace_once(
    "src/lib/capabilities/generation.ts",
    '''export const generationAdvancedCapabilities = {
  seed: {
    label: "Seed",
  },''',
    '''export const generationSeedMin = 0;
export const generationSeedMax = 2_147_483_647;

export function randomGenerationSeed(exclude?: number) {
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  const seed = value[0] % (generationSeedMax + 1);
  if (seed !== exclude) return seed;
  return seed === generationSeedMax ? generationSeedMin : seed + 1;
}

export const generationAdvancedCapabilities = {
  seed: {
    label: "Seed",
  },''',
    "Generation random seed helper",
)
replace_once(
    "src/features/create/create-advanced-panel.tsx",
    '''import { RotateCcw } from "lucide-react";''',
    '''import { Dices, RotateCcw } from "lucide-react";''',
    "Advanced dice icon import",
)
replace_once(
    "src/features/create/create-advanced-panel.tsx",
    '''  generationAdvancedCapabilities,
} from "@/lib/capabilities/generation";''',
    '''  generationAdvancedCapabilities,
  randomGenerationSeed,
} from "@/lib/capabilities/generation";''',
    "Advanced random seed import",
)
replace_once(
    "src/features/create/create-advanced-panel.tsx",
    '''          <Field>
            <FieldLabel htmlFor="advanced-seed">{generationAdvancedCapabilities.seed.label}</FieldLabel>
            <Input
              id="advanced-seed"
              type="number"
              step="1"
              value={draft.seed}
              onChange={(event) => onDraftChange({ ...draft, seed: event.target.value })}
            />
          </Field>''',
    '''          <Field>
            <FieldLabel htmlFor="advanced-seed">{generationAdvancedCapabilities.seed.label}</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                id="advanced-seed"
                type="number"
                step="1"
                value={draft.seed}
                onChange={(event) => onDraftChange({ ...draft, seed: event.target.value })}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                aria-label="Randomize seed"
                title="Randomize seed"
                onClick={() => {
                  const currentSeed = Number(draft.seed);
                  onDraftChange({
                    ...draft,
                    seed: String(randomGenerationSeed(Number.isSafeInteger(currentSeed) ? currentSeed : undefined)),
                  });
                }}
              >
                <Dices aria-hidden="true" />
              </Button>
            </div>
          </Field>''',
    "Advanced random seed control",
)
replace_once(
    "src/server/generation/retry-generation.ts",
    '''import { persistedUpscaleSourceAssetId } from "@/lib/capabilities/upscale";''',
    '''import { persistedUpscaleSourceAssetId } from "@/lib/capabilities/upscale";
import { randomGenerationSeed } from "@/lib/capabilities/generation";''',
    "Retry random seed import",
)
replace_once(
    "src/server/generation/retry-generation.ts",
    '''    const request = await reconstructAvailableGenerationRecipeRequest(ownerId, historicalJob);
    if (!request) return retryNotAvailable();
    submitted = await submitGeneration(ownerId, request);''',
    '''    const request = await reconstructAvailableGenerationRecipeRequest(ownerId, historicalJob);
    if (!request) return retryNotAvailable();
    const retryRequest = {
      ...request,
      advanced: {
        ...request.advanced,
        seed: randomGenerationSeed(request.advanced?.seed),
      },
    };
    submitted = await submitGeneration(ownerId, retryRequest);''',
    "Failed Retry random seed behavior",
)

# 6) Remove succeeded entries from user-facing Activity once all recorded output media is unavailable/deleted.
replace_once(
    "src/server/generation/generation-activity.ts",
    '''  const availableIds = await activeOutputIds(ownerId, refreshedItems);
  const items = refreshedItems.map((item) => ({
    ...item,
    outputAssetIds: item.outputAssetIds.filter((id) => availableIds.has(id)),
    canRunAgain: item.status === "succeeded" && reusableIds.has(item.id),
  }));''',
    '''  const availableIds = await activeOutputIds(ownerId, refreshedItems);
  const items = refreshedItems
    .filter((item) => !(
      item.status === "succeeded"
      && item.outputAssetIds.length > 0
      && item.outputAssetIds.every((id) => !availableIds.has(id))
    ))
    .map((item) => ({
      ...item,
      outputAssetIds: item.outputAssetIds.filter((id) => availableIds.has(id)),
      canRunAgain: item.status === "succeeded" && reusableIds.has(item.id),
    }));''',
    "Activity deleted-output visibility",
)
replace_once(
    "src/features/activity/activity-view.tsx",
    '''      ) : items.length === 0 ? (
        <Empty className="mt-8 min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6">
          <EmptyHeader>
            <EmptyMedia><Clock3 aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>{offset > 0 ? "No older activity on this page" : "No generation activity yet"}</EmptyTitle>
            <EmptyDescription>
              {offset > 0
                ? "Go back to more recent work."
                : "Start creating and real generation state will appear here."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="secondary">
              <Link href={offset > 0 ? activityHref(Math.max(0, offset - limit)) : "/"}>
                {offset > 0 ? "Newer activity" : "Create media"}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>''',
    '''      ) : items.length === 0 ? (
        <Empty className="mt-8 min-h-72 rounded-xl border border-dashed border-border bg-surface-1 px-6">
          <EmptyHeader>
            <EmptyMedia><Clock3 aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>
              {offset > 0 || hasMore ? "No visible activity on this page" : "No generation activity yet"}
            </EmptyTitle>
            <EmptyDescription>
              {offset > 0
                ? "Go back to more recent work."
                : hasMore
                  ? "Continue to older activity. Deleted results are omitted automatically."
                  : "Start creating and real generation state will appear here."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="secondary">
              <Link
                href={
                  offset > 0
                    ? activityHref(Math.max(0, offset - limit))
                    : hasMore
                      ? activityHref(offset + limit)
                      : "/"
                }
              >
                {offset > 0 ? "Newer activity" : hasMore ? "Older activity" : "Create media"}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>''',
    "Activity sparse-page empty state",
)

# Tests/verifiers: sort toggle, seed randomization, Activity deleted output, rotating headline, shell alignment.
replace_once(
    "scripts/verify-library-history.mjs",
    '''  const sortButton = page.getByRole("button", { name: "Oldest first", exact: true });
  await sortButton.waitFor({ state: "visible", timeout: 30_000 });''',
    '''  const sortButton = page.getByRole("link", { name: /^Oldest first\\. Switch to newest first\\.$/ });
  await sortButton.waitFor({ state: "visible", timeout: 30_000 });''',
    "Library history direct sort locator",
)
replace_once(
    "scripts/verify-library-history.mjs",
    '''  await sortButton.click();
  const oldestRadio = page.getByRole("menuitemradio", { name: "Oldest first", exact: true });
  await oldestRadio.waitFor({ state: "visible", timeout: 30_000 });
  assert(await oldestRadio.getAttribute("aria-checked") === "true", "Oldest-first dropdown item was not marked selected.");
  await page.screenshot({ path: `${artifactDir}/library-history-desktop-menu.png`, fullPage: true });

  await page.getByRole("menuitemradio", { name: "Newest first", exact: true }).click();''',
    '''  await page.screenshot({ path: `${artifactDir}/library-history-desktop-oldest-toggle.png`, fullPage: true });

  await sortButton.click();''',
    "Library history remove dropdown assertions",
)
replace_once(
    "scripts/verify-library-history.mjs",
    '''  await page.getByRole("button", { name: "Newest first", exact: true }).waitFor({ state: "visible", timeout: 30_000 });''',
    '''  await page.getByRole("link", { name: /^Newest first\\. Switch to oldest first\\.$/ }).waitFor({ state: "visible", timeout: 30_000 });''',
    "Library history newest toggle locator",
)
replace_once(
    "scripts/verify-library-history.mjs",
    '''  assert(await page.getByRole("button", { name: "Newest first", exact: true }).isVisible(), "Library history sort control is not visible on mobile.");''',
    '''  assert(await page.getByRole("link", { name: /^Newest first\\. Switch to oldest first\\.$/ }).isVisible(), "Library history sort toggle is not visible on mobile.");''',
    "Library history mobile toggle locator",
)
replace_once(
    "tests/ui/library.spec.ts",
    '''  await expect(page.getByRole("button", { name: "Oldest first", exact: true })).toHaveCount(0);''',
    '''  await expect(page.getByRole("link", { name: /Oldest first\\. Switch to newest first\\./ })).toHaveCount(0);''',
    "Library signed-out sort locator",
)
for path in ("tests/ui/library.spec.ts", "tests/ui/create.spec.ts"):
    p = Path(path)
    text = p.read_text()
    text = text.replace(
        'getByRole("heading", { name: "What do you want to create?" })',
        'getByRole("heading", { name: /What do you want to (create|explore|transform|imagine)\\?/ })',
    )
    p.write_text(text)

replace_once(
    "tests/ui/create.spec.ts",
    '''  await expect(page.getByRole("spinbutton", { name: "Seed" })).toHaveValue("42");''',
    '''  const seedInput = page.getByRole("spinbutton", { name: "Seed" });
  await expect(seedInput).toHaveValue("42");
  const randomizeSeed = page.getByRole("button", { name: "Randomize seed", exact: true });
  await expect(randomizeSeed).toBeVisible();
  await randomizeSeed.click();
  const randomizedSeed = Number(await seedInput.inputValue());
  expect(Number.isSafeInteger(randomizedSeed)).toBeTruthy();
  expect(randomizedSeed).toBeGreaterThanOrEqual(0);
  expect(randomizedSeed).toBeLessThanOrEqual(2_147_483_647);
  expect(randomizedSeed).not.toBe(42);''',
    "Create random seed UI test",
)
replace_once(
    "tests/ui/create.spec.ts",
    '''  await expect(page.locator('[data-create-motion="context"]')).toHaveCSS("transform", "none");''',
    '''  await expect(page.locator('[data-create-motion="context"]')).toHaveCSS("transform", "none");
  await expect(page.getByRole("heading", { name: "What do you want to create?" })).toBeVisible();
  await page.waitForTimeout(4500);
  await expect(page.getByRole("heading", { name: "What do you want to create?" })).toBeVisible();''',
    "Reduced-motion static headline test",
)
replace_once(
    "scripts/verify-activity.mjs",
    '''  const missingHistoricalAssetId = randomUUID();''',
    '''  const deletedOutputAssetId = randomUUID();''',
    "Activity deleted output fixture id",
)
replace_once(
    "scripts/verify-activity.mjs",
    '''  await createMediaAsset(owner, retryInputAssetId, "Retry active input");''',
    '''  await createMediaAsset(owner, retryInputAssetId, "Retry active input");
  await createMediaAsset(owner, deletedOutputAssetId, "Deleted Activity result", { deletedAt: at(30) });''',
    "Activity deleted output fixture asset",
)
replace_once(
    "scripts/verify-activity.mjs",
    '''    outputAssetIds: [missingHistoricalAssetId],''',
    '''    outputAssetIds: [deletedOutputAssetId],''',
    "Activity deleted output job",
)
replace_once(
    "scripts/verify-activity.mjs",
    '''  assert(await page.getByRole("link", { name: "View result", exact: true }).count() === 1, "Activity rendered a result link for unavailable historical media.");''',
    '''  assert(await page.getByRole("link", { name: "View result", exact: true }).count() === 1, "Activity rendered a result link for unavailable historical media.");
  assert(await page.getByText("Historical deleted output", { exact: true }).count() === 0, "Activity retained an entry after its generated result was deleted.");''',
    "Activity deleted output absence assertion",
)
replace_once(
    "scripts/verify-activity.mjs",
    '''  assert(currentCapture.request?.advanced?.seed === 314159, "Retry did not preserve supported advanced intent.");''',
    '''  const retrySeed = currentCapture.request?.advanced?.seed;
  assert(Number.isSafeInteger(retrySeed), "Retry did not submit a valid randomized seed.");
  assert(retrySeed >= 0 && retrySeed <= 2_147_483_647, `Retry randomized seed was outside the conservative product range: ${retrySeed}`);
  assert(retrySeed !== 314159, "Retry reused the historical seed instead of choosing a new random seed.");
  assert(currentCapture.request?.advanced?.steps === 8 && currentCapture.request?.advanced?.guidance === 2.5, "Retry did not preserve non-seed supported advanced intent.");''',
    "Activity Retry randomized seed assertion",
)
replace_once(
    "tests/ui/kinetic-shell.spec.ts",
    '''  const topbarBox = await topbar.boundingBox();
  expect(topbarBox).not.toBeNull();
  expect(topbarBox!.x).toBeGreaterThan(0);
  expect(topbarBox!.x + topbarBox!.width).toBeLessThan(mobileViewport.width);''',
    '''  const topbarBox = await topbar.boundingBox();
  expect(topbarBox).not.toBeNull();
  expect(topbarBox!.x).toBeGreaterThan(0);
  expect(topbarBox!.x + topbarBox!.width).toBeLessThan(mobileViewport.width);
  const activityUtility = page.getByRole("link", { name: "Open activity", exact: true });
  const settingsUtility = page.getByRole("link", { name: "Open settings and account", exact: true });
  const [activityBox, settingsBox] = await Promise.all([activityUtility.boundingBox(), settingsUtility.boundingBox()]);
  expect(activityBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  expect(Math.abs((activityBox!.y + activityBox!.height / 2) - (settingsBox!.y + settingsBox!.height / 2))).toBeLessThanOrEqual(1);
  expect(activityBox!.width).toBe(settingsBox!.width);
  expect(activityBox!.height).toBe(settingsBox!.height);''',
    "Shell utility alignment test",
)

# Docs: explicit post-production corrective tracker + durable changed decisions.
append_once(
    "docs/ui/UI_MIGRATION.md",
    "## Post-Cycle 4 production corrective review — 2026-09-09",
    f'''## Post-Cycle 4 production corrective review — 2026-09-09
**Status: `AUTHORIZED / IMPLEMENTATION IN PROGRESS`.**
**Baseline:** `{BASE}` (production-rollout documentation baseline; deployed application source remains `cf3923097fce62edbee643df9b2883bd09210046`).

This is user-directed post-production corrective maintenance, not Phase 23 / Cycle 5. The current approved issue set may be extended by later live review, but unreported scope must not be inferred.

- [ ] Align the mobile/topbar Activity and Settings/account utility icons evenly inside their shared control surface.
- [ ] Reflow the narrow Library media/action toolbar so filters, Favorites, Collections and sort are deliberate rather than cramped.
- [ ] Replace the Library sort dropdown with one direct `Newest first` / `Oldest first` toggle while preserving URL-owned ordering.
- [ ] Give compact Create model/aspect/video-setting labels and chevrons clear separation without breaking the one-row narrow control contract.
- [ ] Add a die-style Seed randomizer in Advanced; failed Retry must submit a newly randomized seed while preserving other current-valid intent. Successful Run Again remains unchanged.
- [ ] Remove succeeded Activity entries from the user-facing feed once all recorded result media for that job is deleted/unavailable; internal generation history remains server-owned and is not hard-deleted by this UI/product correction.
- [ ] Rotate the source-free Image Create headline through restrained creative prompts; reduced-motion presents the stable first phrase without timed rotation.

Validation must include UI purity, typecheck/build/unit coverage, affected shell/Create/Library/Activity workflows, 390px screenshots, reduced-motion behavior, no horizontal overflow, fixture cleanup and exact-head review. Production deployment remains a separate explicit operation.''',
)
append_once(
    "docs/ui/UI_DECISIONS.md",
    "### UI-066 — Post-production corrective interaction pass",
    '''### UI-066 — Post-production corrective interaction pass
**Status: `ACCEPTED / USER-DIRECTED`.**

Live Cycle 4 production review supersedes several narrow interaction details without reopening the visual system or creating a new phase:

- AppShell top-right Activity and account/Settings utilities use equal centered control geometry on narrow screens.
- Library keeps URL/server-owned `sort=newest|oldest`, but UI-027's dropdown interaction is superseded by a single direct toggle whose visible label is the current order and whose activation switches to the other order. Newest remains the canonical URL default.
- Narrow Library actions reflow into deliberate full-width/equal groupings before returning to the compact desktop row.
- Create's compact model/aspect/video-setting triggers preserve UI-061's one-row contract while using ordinary flex spacing between label and chevron instead of overlapping absolute placement.
- Source-free Image Create rotates a bounded set of truthful creative headlines with short Motion transitions. Reduced motion disables timed rotation and presents the stable first phrase.
- Advanced Seed gains a die-style randomize action. Randomized product seeds are conservative non-negative 31-bit integers and a randomize action must differ from the current seed.
- Failed-job Retry remains a new distinct job from current-revalidated persisted intent, but now deliberately replaces the historical seed with a new random seed. Other current-valid settings are preserved. Successful Run Again remains a separate unchanged operation.

These are corrective interaction changes only: no new route, global client store, model/provider exposure, schema or deployment contract is introduced.''',
)
append_once(
    "docs/ui/UI_DECISIONS.md",
    "### UI-067 — Deleted generated content leaves the user-facing Activity feed",
    '''### UI-067 — Deleted generated content leaves the user-facing Activity feed
**Status: `ACCEPTED / USER-DIRECTED`.**

When a succeeded generation's recorded result media has been deleted and no active result from that job remains, the corresponding entry is omitted from the ordinary Activity feed. This supersedes UI-035's prior user-facing consequence that deleted-output jobs remained visible without a Viewer action.

The correction changes product visibility, not lifecycle history storage: `generation_jobs` remains server-owned historical/diagnostic state and media tombstones remain intact. Active, failed, cancelled and succeeded jobs with at least one active result keep their existing Activity semantics. No database migration or hard-delete cascade is introduced.''',
)

# Update current component/screen/capability descriptions that otherwise become stale.
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    '''- `LibrarySortMenu` — feature-owned maintained DropdownMenu interaction for explicit Newest/Oldest ordering while URL/server state stays authoritative.''',
    '''- `LibrarySortToggle` — feature-owned direct Newest/Oldest ordering toggle while URL/server state stays authoritative; narrow layout may span the action row for breathing room.''',
    "Component catalog Library sort",
)
replace_once(
    "docs/ui/COMPONENT_CATALOG.md",
    '''- `CreateAdvancedPanel` — CollapsibleContent plus Field/Input/NativeSelect primitives; Image shows negative prompt, seed and — for FLUX — Steps/Guidance, while Qwen keeps its verified fixed 4-step tuning hidden; Video shows negative prompt, seed and frame rate. Resolution/duration/audio remain contextual primary-row Video settings. No tabs. UI-061 keeps Advanced as its own compact primary-row `…` trigger instead of nesting it inside Video settings.''',
    '''- `CreateAdvancedPanel` — CollapsibleContent plus Field/Input/NativeSelect primitives; Image shows negative prompt, seed (with a die-style randomize action) and — for FLUX — Steps/Guidance, while Qwen keeps its verified fixed 4-step tuning hidden; Video shows negative prompt, seed and frame rate. Resolution/duration/audio remain contextual primary-row Video settings. No tabs. UI-061 keeps Advanced as its own compact primary-row `…` trigger instead of nesting it inside Video settings.''',
    "Component catalog Advanced seed",
)
replace_once(
    "docs/ui/SCREEN_REGISTRY.md",
    '''  - Explicit server/URL-owned Newest/Oldest chronological ordering via `sort`; changing direction resets offset while preserving search/kind state.''',
    '''  - Explicit server/URL-owned Newest/Oldest chronological ordering via `sort`; one direct toggle switches direction, changing direction resets offset while preserving search/kind state.''',
    "Screen registry Library sort",
)
replace_once(
    "docs/architecture/FRONTEND_ARCHITECTURE.md",
    '''- Library Newest/Oldest ordering uses the maintained Radix Dropdown Menu wrapper under `src/components/ui`; the selected `sort` value remains URL-owned/server-owned rather than client-owned filter state.''',
    '''- Library Newest/Oldest ordering remains URL-owned/server-owned rather than client-owned filter state; post-production UI-066 uses one direct maintained Button/Link toggle instead of the prior dropdown mechanic.''',
    "Frontend architecture Library sort",
)
append_once(
    "docs/architecture/PRODUCT_CAPABILITIES.md",
    "### Post-Cycle 4 Retry seed correction — verified contract target",
    '''### Post-Cycle 4 Retry seed correction — verified contract target
User-directed production review changes failed-job Retry seed behavior only. A failed prompt-generation Retry still reconstructs and current-revalidates persisted product intent, preserves the original historical row, and creates a new job; immediately before submission it replaces the historical seed with a newly generated non-negative 31-bit seed that differs from the prior seed. Other current-valid advanced settings remain unchanged. Advanced Create exposes the same conservative randomization through a die-style Seed action. Successful Run Again and Reuse Settings keep their existing semantics.''',
)
append_once(
    "PROJECT.md",
    "## Post-Cycle 4 production corrective review — 2026-09-09",
    f'''## Post-Cycle 4 production corrective review — 2026-09-09
**Status: `AUTHORIZED / IMPLEMENTATION IN PROGRESS`.**

Live production review after Cycle 4 authorized a bounded corrective pass on baseline `{BASE}`: AppShell utility alignment, narrow Library toolbar spacing plus direct Newest/Oldest toggle, Create compact-trigger spacing, Advanced seed randomization with new-seed failed Retry behavior, deleted-result removal from the user-facing Activity feed, and a restrained rotating source-free Image Create headline. This is corrective maintenance, not Phase 23 / Cycle 5. Production deployment remains a separate explicit operation.''',
)

for path in ["src/features/library/library-view.tsx", "docs/ui/COMPONENT_CATALOG.md"]:
    text = Path(path).read_text()
    if "LibrarySortMenu" in text or "library-sort-menu" in text:
        raise SystemExit(f"{path}: stale LibrarySortMenu reference")

print("Post-Cycle 4 corrective patch applied.")
