from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact match, found {count}\n--- target ---\n{old}")
    p.write_text(text.replace(old, new, 1))

workspace = "src/features/create/create-workspace.tsx"
replace_once(
    workspace,
    '''                {outputKind === "image" ? (
                  <ImageModelMenu value={imageModel} onValueChange={setImageModel} />
                ) : null}

                <AspectRatioMenu''',
    '''                <AnimatePresence initial={false} mode="popLayout">
                  {outputKind === "image" ? (
                    <motion.div
                      key="image-model"
                      layout="position"
                      data-create-motion="mode-control"
                      className="shrink-0"
                      initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, x: -6 }}
                      transition={contextTransition}
                    >
                      <ImageModelMenu value={imageModel} onValueChange={setImageModel} />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AspectRatioMenu''',
)

verifier = "scripts/verify-create-lifecycle.mjs"
replace_once(
    verifier,
    '''    const controls = [...row.querySelectorAll('[data-slot="button"], [data-slot="toggle-group"]')]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 4 && rect.height > 4);''',
    '''    const controls = [...row.children]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 4 && rect.height > 4);''',
)

tests = "tests/ui/create.spec.ts"
replace_once(
    tests,
    '''  await expect(page.getByRole("menuitemcheckbox", { name: "Audio" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Advanced controls" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeVisible();''',
    '''  await expect(page.getByRole("menuitemcheckbox", { name: "Audio" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /Advanced controls/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  const advanced = page.getByRole("button", { name: "Open Advanced controls", exact: true });
  await expect(advanced).toBeVisible();
  await advanced.click();
  await expect(page.getByRole("combobox", { name: "Frame rate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeVisible();''',
)
