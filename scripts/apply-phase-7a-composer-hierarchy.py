from pathlib import Path

ROOT = Path.cwd()


def replace_once(path: str, old: str, new: str, label: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


# create-workspace imports
replace_once(
    "src/features/create/create-workspace.tsx",
    'import { ChevronDown, ImageIcon, MoreHorizontal, Plus, Volume2, VolumeX, X } from "lucide-react";',
    'import { ChevronDown, ImageIcon, MoreHorizontal, Plus, Volume2, X } from "lucide-react";',
    "lucide imports",
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '  DropdownMenu,\n  DropdownMenuContent,\n  DropdownMenuLabel,\n  DropdownMenuRadioGroup,\n  DropdownMenuRadioItem,\n  DropdownMenuSeparator,\n  DropdownMenuTrigger,',
    '  DropdownMenu,\n  DropdownMenuCheckboxItem,\n  DropdownMenuContent,\n  DropdownMenuItem,\n  DropdownMenuLabel,\n  DropdownMenuRadioGroup,\n  DropdownMenuRadioItem,\n  DropdownMenuSeparator,\n  DropdownMenuTrigger,',
    "dropdown imports",
)
replace_once(
    "src/features/create/create-workspace.tsx",
    'import { Toggle } from "@/components/ui/toggle";\n',
    '',
    "remove standalone toggle import",
)

# Add compact contextual Video menu after aspect-ratio menu.
anchor = '''function pollRetryDelay(attempt: number) {'''
video_menu = '''function VideoSettingsMenu({
  durationSeconds,
  audioEnabled,
  advancedOpen,
  onDurationChange,
  onAudioChange,
  onAdvancedToggle,
}: {
  durationSeconds: (typeof videoDurations)[number];
  audioEnabled: boolean;
  advancedOpen: boolean;
  onDurationChange: (value: (typeof videoDurations)[number]) => void;
  onAudioChange: (value: boolean) => void;
  onAdvancedToggle: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          aria-label={`Video settings. Duration ${durationSeconds} seconds. Audio ${audioEnabled ? "on" : "off"}`}
          className="shrink-0 gap-1.5"
        >
          <span>{durationSeconds} s</span>
          <span className="hidden text-xs text-text-muted sm:inline">· {audioEnabled ? "Audio" : "Silent"}</span>
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuLabel>Duration</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={String(durationSeconds)}
          onValueChange={(next) => onDurationChange(Number(next) as (typeof videoDurations)[number])}
        >
          {videoDurations.map((duration) => (
            <DropdownMenuRadioItem key={duration} value={String(duration)}>
              {duration} seconds
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={audioEnabled}
          onCheckedChange={(checked) => onAudioChange(checked === true)}
        >
          <Volume2 aria-hidden="true" />
          Audio
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onAdvancedToggle}>
          <MoreHorizontal aria-hidden="true" />
          {advancedOpen ? "Hide Advanced controls" : "Advanced controls"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function pollRetryDelay(attempt: number) {'''
replace_once(
    "src/features/create/create-workspace.tsx",
    anchor,
    video_menu,
    "insert video settings menu",
)

# Move Advanced below essentials and de-crowd the controls.
old_block = '''          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CreateAdvancedPanel
              outputKind={outputKind}
              draft={advancedDraft}
              onDraftChange={setAdvancedDraft}
              onReset={resetAdvanced}
            />

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pb-1 sm:flex-nowrap sm:overflow-visible sm:pb-0">'''
new_block = '''          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pb-1 sm:flex-nowrap sm:overflow-visible sm:pb-0">'''
replace_once(
    "src/features/create/create-workspace.tsx",
    old_block,
    new_block,
    "move advanced after essentials start",
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '                  className="shrink-0"\n                >',
    '                  size="sm"\n                  className="shrink-0"\n                >',
    "compact output intent",
)

old_video_controls = '''                {outputKind === "video" ? (
                  <>
                    <Toggle
                      pressed={audioEnabled}
                      onPressedChange={setAudioEnabled}
                      size="sm"
                      aria-label={`Audio ${audioEnabled ? "on" : "off"}`}
                      title={audioEnabled ? "Generate video with audio" : "Generate video without audio"}
                      className="shrink-0 gap-1.5 bg-surface-2"
                    >
                      {audioEnabled ? <Volume2 aria-hidden="true" className="size-4" /> : <VolumeX aria-hidden="true" className="size-4" />}
                      <span className="hidden sm:inline">Audio</span>
                    </Toggle>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const currentIndex = videoDurations.indexOf(durationSeconds);
                        setDurationSeconds(videoDurations[(currentIndex + 1) % videoDurations.length]);
                      }}
                      aria-label={`Duration ${durationSeconds} seconds. Activate to choose the next duration.`}
                      className="shrink-0"
                    >
                      {durationSeconds} s
                    </Button>
                  </>
                ) : null}

                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-pressed={advancedOpen}
                    aria-label={advancedOpen ? "Close Advanced controls" : "Open Advanced controls"}
                    title="Advanced generation controls"
                    className={advancedOpen ? "bg-surface-3" : undefined}
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </CollapsibleTrigger>'''
new_video_controls = '''                {outputKind === "video" ? (
                  <VideoSettingsMenu
                    durationSeconds={durationSeconds}
                    audioEnabled={audioEnabled}
                    advancedOpen={advancedOpen}
                    onDurationChange={(value) => {
                      setDurationSeconds(value);
                      setError(null);
                    }}
                    onAudioChange={(value) => {
                      setAudioEnabled(value);
                      setError(null);
                    }}
                    onAdvancedToggle={() => setAdvancedOpen((current) => !current)}
                  />
                ) : (
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      aria-pressed={advancedOpen}
                      aria-label={advancedOpen ? "Close Advanced controls" : "Open Advanced controls"}
                      title="Advanced generation controls"
                      className={advancedOpen ? "bg-surface-3" : undefined}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </Button>
                  </CollapsibleTrigger>
                )}'''
replace_once(
    "src/features/create/create-workspace.tsx",
    old_video_controls,
    new_video_controls,
    "contextual video controls",
)

old_end = '''              <Button type="submit" size="lg" disabled={!canSubmit} className="w-full sm:w-auto">
                {submitting || jobActive ? <Spinner data-icon="inline-start" /> : null}
                {submitting ? "Submitting" : jobActive ? "Generating" : "Generate"}
              </Button>
            </div>
          </Collapsible>'''
new_end = '''              <Button type="submit" size="lg" disabled={!canSubmit} className="w-full sm:w-auto">
                {submitting || jobActive ? <Spinner data-icon="inline-start" /> : null}
                {submitting ? "Submitting" : jobActive ? "Generating" : "Generate"}
              </Button>
            </div>

            <CreateAdvancedPanel
              outputKind={outputKind}
              draft={advancedDraft}
              onDraftChange={setAdvancedDraft}
              onReset={resetAdvanced}
            />
          </Collapsible>'''
replace_once(
    "src/features/create/create-workspace.tsx",
    old_end,
    new_end,
    "advanced after essentials end",
)

# Advanced panel now expands below the essential row.
replace_once(
    "src/features/create/create-advanced-panel.tsx",
    '<CollapsibleContent className="mb-3 rounded-xl border border-border bg-surface-2 p-4">',
    '<CollapsibleContent className="mt-3 rounded-xl border border-border bg-surface-2 p-4">',
    "advanced panel spacing",
)

# Update UI assertions around contextual Video settings and mobile layering.
path = ROOT / "tests/ui/create.spec.ts"
text = path.read_text(encoding="utf-8")
old = '''test("Create switches to video essentials without exposing backend workflow details", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/");

  await page.getByRole("radio", { name: "Video", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Create a video" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Aspect ratio 16:9/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Duration 5 seconds/ })).toBeVisible();
  const audio = page.getByRole("button", { name: "Audio on" });
  await expect(audio).toBeVisible();
  await expect(audio).toHaveAttribute("aria-pressed", "true");
  await audio.click();
  await expect(page.getByRole("button", { name: "Audio off" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("workflow", { exact: false })).toHaveCount(0);

  await page.screenshot({ path: "artifacts/create-desktop-video.png", fullPage: true });
});

test("mobile Video keeps audio available in the essentials row", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/");

  await page.getByRole("radio", { name: "Video", exact: true }).click();
  const audio = page.getByRole("button", { name: "Audio on" });
  await expect(audio).toBeVisible();
  await expect(audio).toHaveAttribute("aria-pressed", "true");
  const audioBox = await audio.boundingBox();
  expect(audioBox).not.toBeNull();
  expect(audioBox!.x).toBeGreaterThanOrEqual(0);
  expect(audioBox!.x + audioBox!.width).toBeLessThanOrEqual(mobileViewport.width);
  const duration = page.getByRole("button", { name: /Duration 5 seconds/ });
  await expect(duration).toBeVisible();
  const durationBox = await duration.boundingBox();
  expect(durationBox).not.toBeNull();
  expect(durationBox!.x).toBeGreaterThanOrEqual(0);
  expect(durationBox!.x + durationBox!.width).toBeLessThanOrEqual(mobileViewport.width);
  await expect(page.getByRole("button", { name: "Open Advanced controls" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeVisible();

  await page.screenshot({ path: "artifacts/create-mobile-video.png", fullPage: true });
});'''
new = '''test("Create keeps Video duration, audio, and Advanced contextual without exposing backend workflow details", async ({ page }) => {
  await page.setViewportSize(desktopViewport);
  await page.goto("/");

  await page.getByRole("radio", { name: "Video", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Create a video" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Aspect ratio 16:9/ })).toBeVisible();
  const settings = page.getByRole("button", { name: /Video settings\. Duration 5 seconds\. Audio on/ });
  await expect(settings).toBeVisible();
  await expect(page.getByRole("button", { name: "Audio on" })).toHaveCount(0);
  await settings.click();
  await expect(page.getByRole("menuitemradio", { name: "5 seconds" })).toHaveAttribute("data-state", "checked");
  const audio = page.getByRole("menuitemcheckbox", { name: "Audio" });
  await expect(audio).toHaveAttribute("data-state", "checked");
  await audio.click();
  await expect(page.getByRole("button", { name: /Video settings\. Duration 5 seconds\. Audio off/ })).toBeVisible();
  await expect(page.getByText("workflow", { exact: false })).toHaveCount(0);

  await page.screenshot({ path: "artifacts/create-desktop-video.png", fullPage: true });
});

test("mobile Video keeps the essential row compact and contextual settings reachable", async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto("/");

  await page.getByRole("radio", { name: "Video", exact: true }).click();
  const settings = page.getByRole("button", { name: /Video settings\. Duration 5 seconds\. Audio on/ });
  await expect(settings).toBeVisible();
  const settingsBox = await settings.boundingBox();
  expect(settingsBox).not.toBeNull();
  expect(settingsBox!.x).toBeGreaterThanOrEqual(0);
  expect(settingsBox!.x + settingsBox!.width).toBeLessThanOrEqual(mobileViewport.width);
  await settings.click();
  await expect(page.getByRole("menuitemradio", { name: "5 seconds" })).toBeVisible();
  await expect(page.getByRole("menuitemcheckbox", { name: "Audio" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Advanced controls" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeVisible();

  await page.screenshot({ path: "artifacts/create-mobile-video.png", fullPage: true });
});'''
if text.count(old) != 1:
    raise RuntimeError(f"video test block: expected exactly one match, found {text.count(old)}")
text = text.replace(old, new, 1)

old = '''  await page.getByRole("button", { name: "Open Advanced controls" }).click();
  await expect(page.getByText("Advanced", { exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Seed" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.screenshot({ path: "artifacts/create-mobile-advanced.png", fullPage: true });'''
new = '''  await page.getByRole("button", { name: "Open Advanced controls" }).click();
  await expect(page.getByText("Advanced", { exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Seed" })).toBeVisible();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation).toBeVisible();
  const generateAfterOpen = await generate.boundingBox();
  const navigationBox = await mobileNavigation.boundingBox();
  expect(generateAfterOpen).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(generateAfterOpen!.y + generateAfterOpen!.height).toBeLessThan(navigationBox!.y);
  await page.screenshot({ path: "artifacts/create-mobile-advanced.png", fullPage: true });'''
if text.count(old) != 1:
    raise RuntimeError(f"mobile advanced test: expected exactly one match, found {text.count(old)}")
text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")

print("Phase 7A composer hierarchy patch applied.")
