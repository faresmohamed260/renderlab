from pathlib import Path

path = Path('scripts/verify-library-history.mjs')
text = path.read_text(encoding='utf-8')

old = '''  const oldestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);
  assert(oldestOrder[0] === `/library/${older.id}` && oldestOrder[1] === `/library/${newer.id}`, `Browser oldest-first order was incorrect: ${JSON.stringify(oldestOrder)}`);

  await page.getByRole("button", { name: "Select", exact: true }).click();
  const olderCheckbox = page.getByRole("checkbox", { name: `Select ${token} Older`, exact: true });
'''
new = '''  const oldestOrder = await orderedFixtureHrefs(page, [older.id, newer.id]);
  assert(oldestOrder[0] === `/library/${older.id}` && oldestOrder[1] === `/library/${newer.id}`, `Browser oldest-first order was incorrect: ${JSON.stringify(oldestOrder)}`);

  const desktopOverflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    html: document.documentElement.scrollWidth,
  }));
  assert(desktopOverflow.body <= desktopOverflow.viewport + 1 && desktopOverflow.html <= desktopOverflow.viewport + 1, `Library Gallery Rail overflows desktop: ${JSON.stringify(desktopOverflow)}`);
  const desktopFirstCard = await page.locator('[data-library-media-grid="true"] > div').first().boundingBox();
  assert(desktopFirstCard && desktopFirstCard.y < 455, `Library Gallery Rail media begins too low on desktop: ${JSON.stringify(desktopFirstCard)}`);
  const desktopRailBefore = await page.locator('[data-library-gallery-rail="true"]').boundingBox();
  assert(desktopRailBefore, "Could not measure Library Gallery Rail before selection.");
  await page.screenshot({ path: `${artifactDir}/library-history-desktop-selection-t000.png`, fullPage: false });

  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.waitForTimeout(60);
  await page.screenshot({ path: `${artifactDir}/library-history-desktop-selection-t060.png`, fullPage: false });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${artifactDir}/library-history-desktop-selection-t180.png`, fullPage: false });
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${artifactDir}/library-history-desktop-selection-t360.png`, fullPage: false });
  const desktopSelectionMode = await page.locator('[data-library-selection-mode="true"]').boundingBox();
  assert(desktopSelectionMode && Math.abs(desktopSelectionMode.y - desktopRailBefore.y) <= 2, `Library selection mode did not settle in the command-rail origin: ${JSON.stringify({ desktopRailBefore, desktopSelectionMode })}`);

  const olderCheckbox = page.getByRole("checkbox", { name: `Select ${token} Older`, exact: true });
'''
if old not in text:
    raise SystemExit('desktop evidence marker missing')
text = text.replace(old, new, 1)

old = '''  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await page.getByRole("link", { name: /^Newest first\\. Switch to oldest first\\.$/ }).isVisible(), "Library history sort toggle is not visible on mobile.");
  await page.screenshot({ path: `${artifactDir}/library-history-mobile-newest.png`, fullPage: true });
  await page.getByRole("button", { name: "Select", exact: true }).click();
  const mobileCheckbox = page.getByRole("checkbox").first();
  await mobileCheckbox.click();
  await page.screenshot({ path: `${artifactDir}/library-history-mobile-selected-card.png`, fullPage: true });

  const ownerRowsResponse = await supabase(`media_assets?id=in.(${older.id},${newer.id})&select=id,owner_id`);
'''
new = '''  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.scrollTo(0, 0));
  assert(await page.getByRole("link", { name: /^Newest first\\. Switch to oldest first\\.$/ }).isVisible(), "Library history sort toggle is not visible on mobile.");
  const mobileOverflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
    html: document.documentElement.scrollWidth,
  }));
  assert(mobileOverflow.body <= mobileOverflow.viewport + 1 && mobileOverflow.html <= mobileOverflow.viewport + 1, `Library Gallery Rail overflows mobile: ${JSON.stringify(mobileOverflow)}`);
  const mobileFirstCard = await page.locator('[data-library-media-grid="true"] > div').first().boundingBox();
  assert(mobileFirstCard && mobileFirstCard.y < 545, `Library Gallery Rail media begins too low on mobile: ${JSON.stringify(mobileFirstCard)}`);
  const mobileClear = page.getByRole("link", { name: "Clear Library search", exact: true });
  const mobileClearBox = await mobileClear.boundingBox();
  assert(mobileClearBox && mobileClearBox.width >= 44 && mobileClearBox.height >= 44, `Library mobile search-clear target is below 44px: ${JSON.stringify(mobileClearBox)}`);
  const mobileSelect = page.getByRole("button", { name: "Select", exact: true });
  const mobileSelectBox = await mobileSelect.boundingBox();
  assert(mobileSelectBox && mobileSelectBox.height >= 44, `Library mobile Select target is below 44px: ${JSON.stringify(mobileSelectBox)}`);
  await page.screenshot({ path: `${artifactDir}/library-history-mobile-newest.png`, fullPage: true });
  await mobileSelect.click();
  const mobileCheckbox = page.getByRole("checkbox").first();
  const mobileCheckboxBox = await mobileCheckbox.boundingBox();
  assert(mobileCheckboxBox && mobileCheckboxBox.width >= 43 && mobileCheckboxBox.height >= 43, `Library mobile selection target is too small: ${JSON.stringify(mobileCheckboxBox)}`);
  await mobileCheckbox.click();
  await page.screenshot({ path: `${artifactDir}/library-history-mobile-selected-card.png`, fullPage: true });

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseUrl}/library?q=${query}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const reducedCard = page.locator(`a[href="/library/${newer.id}"]`);
  const reducedCardBox = await reducedCard.boundingBox();
  assert(reducedCardBox, "Could not measure Library card for reduced-motion verification.");
  await page.mouse.move(reducedCardBox.x + reducedCardBox.width * 0.78, reducedCardBox.y + reducedCardBox.height * 0.25);
  await page.waitForTimeout(50);
  const reducedTransform = await reducedCard.evaluate((node) => getComputedStyle(node).transform);
  assert(reducedTransform === "none", `Reduced motion did not disable Gallery Rail card depth: ${reducedTransform}`);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  const reducedDurations = await page.locator('[data-library-selection-mode="true"]').evaluate((node) => getComputedStyle(node).transitionDuration);
  const reducedMaxSeconds = Math.max(...reducedDurations.split(",").map((value) => {
    const trimmed = value.trim();
    return trimmed.endsWith("ms") ? Number.parseFloat(trimmed) / 1000 : Number.parseFloat(trimmed);
  }));
  assert(reducedMaxSeconds < 0.01, `Reduced motion left a material Library selection transition: ${reducedDurations}`);
  await page.screenshot({ path: `${artifactDir}/library-history-desktop-reduced-motion-selection.png`, fullPage: false });

  const ownerRowsResponse = await supabase(`media_assets?id=in.(${older.id},${newer.id})&select=id,owner_id`);
'''
if old not in text:
    raise SystemExit('mobile/reduced evidence marker missing')
text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
