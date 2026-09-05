from pathlib import Path

p = Path("scripts/verify-creative-iteration.mjs")
text = p.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    if old not in text:
        raise SystemExit(f"marker not found: {old[:100]}")
    text = text.replace(old, new, 1)

mp4_b64 = "AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAOxbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAtx0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAEAAAABAAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAIAAABAAAAAAJUbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAKABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAAB/21pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAb9zdGJsAAAAv3N0c2QAAAAAAAAAAQAAAK9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAEAAQABIAAAASAAAAAAAAAABFUxhdmM2MS4xOS4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAANWF2Y0MBZAAK/+EAGGdkAAqs2UQmwEQAAAMABAAAAwBQPEiWWAEABmjr48siwP34+AAAAAAQcGFzcAAAAAEAAAABAAAAFGJ0cnQAAAAAAAAa2AAAAAAAAAAYc3R0cwAAAAAAAAABAAAACgAABAAAAAAUc3RzcwAAAAAAAAABAAAAAQAAAGBjdHRzAAAAAAAAAAoAAAABAAAIAAAAAAEAABQAAAAAAQAACAAAAAABAAAAAAAAAAEAAAQAAAAAAQAAFAAAAAABAAAIAAAAAAEAAAAAAAAAAQAABAAAAAABAAAIAAAAABxzdHNjAAAAAAAAAAEAAAABAAAACgAAAAEAAAA8c3RzegAAAAAAAAAAAAAACgAAAtsAAAAOAAAADAAAAAwAAAAMAAAAFAAAAA4AAAAMAAAADAAAABQAAAAUc3RjbwAAAAAAAAABAAAD4QAAAGF1ZHRhAAAAWW1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALGlsc3QAAAAkqXRvbwAAABxkYXRhAAAAAQAAAABMYXZmNjEuNy4xMDMAAAAIZnJlZQAAA2NtZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTIgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAJWWIhAAR//7n4/wKa+MHxFAeera7lRdGuPbFGbUl4+7cIe2Iz+EAAAAKQZokbEEP/qpX3gAAAAhBnkJ4h38FvQAAAAgBnmF0Q38HfAAAAAgBnmNqQ38HfQAAABBBmmhJqEFomUwId//+qZ01AAAACkGehkURLDv/Bb0AAAAIAZ6ldEN/B30AAAAIAZ6nakN/B3wAAAAQQZqpSahBbJlMCG///qePiA=="

replace_once(
'''const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z5ZsAAAAASUVORK5CYII=",
  "base64",
);''',
'''const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC0lEQVR42mP8/x8AAusB9Y9Z5ZsAAAAASUVORK5CYII=",
  "base64",
);'''.replace("AAAC0l", "AAAC1H") + f'''\nconst mp4Bytes = Buffer.from("{mp4_b64}", "base64");'''
)

# Add a durable generated-video fixture helper without changing existing image fixture semantics.
marker = '''async function createGenerationSource(account, {'''
video_helper = '''async function createVideoMediaAsset(account, {
  id = randomUUID(),
  displayName,
  generationJobId = null,
  generationOutputIndex = null,
}) {
  const key = `renderlab/phase16-fixtures/${account.id}/result-video-${id}.mp4`;
  const thumbnailKey = `renderlab/phase16-fixtures/${account.id}/result-video-${id}-poster.png`;
  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    Body: mp4Bytes,
    ContentType: "video/mp4",
  }));
  await r2Client.send(new PutObjectCommand({
    Bucket: r2Bucket,
    Key: thumbnailKey,
    Body: pngBytes,
    ContentType: "image/png",
  }));
  const response = await supabase("media_assets", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      id,
      owner_id: account.id,
      generation_job_id: generationJobId,
      generation_output_index: generationOutputIndex,
      origin: "generated",
      kind: "video",
      mime_type: "video/mp4",
      storage_key: key,
      thumbnail_storage_key: thumbnailKey,
      original_filename: null,
      display_name: displayName,
      size_bytes: mp4Bytes.length,
      width: 64,
      height: 64,
      duration_ms: 1000,
      provenance: { prompt: displayName, operation: "animate-image" },
      metadata: { verification: "phase16-creative-iteration" },
    }),
  });
  if (!response.ok) throw new Error(`Could not create Phase 16 video fixture (${response.status}): ${await response.text()}`);
  return (await response.json())[0];
}

'''
if marker not in text:
    raise SystemExit("createGenerationSource marker not found")
text = text.replace(marker, video_helper + marker, 1)

# Add a succeeded Animate result with the same durable primary image source.
marker = '''  const videoJob = await createJob(owner, {'''
animate_fixture = '''  const compareVideoResultId = randomUUID();
  const compareVideoJob = await createJob(owner, {
    status: "succeeded",
    operation: "animate-image",
    outputKind: "video",
    prompt: "Phase16 compare @image1 animated result",
    inputs: [{ alias: "image1", role: "first-frame", source: { type: "media-asset", id: activeInput.id } }],
    parameters: videoParameters({ aspectRatio: "original", resolution: "720p", durationSeconds: 10 }),
    outputAssetIds: [compareVideoResultId],
  });
  await createVideoMediaAsset(owner, {
    id: compareVideoResultId,
    displayName: "Phase16 compare video result",
    generationJobId: compareVideoJob.id,
    generationOutputIndex: 0,
  });

'''
if marker not in text:
    raise SystemExit("videoJob marker not found")
text = text.replace(marker, animate_fixture + marker, 1)

# Add generated result fixtures for fail-closed comparison cases.
marker = '''  const failedJob = await createJob(owner, {'''
negative_fixtures = '''  const temporaryResult = await createMediaAsset(owner, {
    displayName: "Phase16 temporary comparison result",
    origin: "generated",
    generationJobId: temporaryJob.id,
    generationOutputIndex: 0,
  });
  const tombstonedResult = await createMediaAsset(owner, {
    displayName: "Phase16 deleted-source comparison result",
    origin: "generated",
    generationJobId: tombstonedJob.id,
    generationOutputIndex: 0,
  });
  const foreignInputResult = await createMediaAsset(owner, {
    displayName: "Phase16 foreign-source comparison result",
    origin: "generated",
    generationJobId: foreignInputJob.id,
    generationOutputIndex: 0,
  });
  const noSourceJob = await createJob(owner, {
    status: "succeeded",
    operation: "create-image",
    outputKind: "image",
    prompt: "Phase16 no primary source comparison",
    parameters: imageParameters({ aspectRatio: "1:1" }),
  });
  const noSourceResult = await createMediaAsset(owner, {
    displayName: "Phase16 no-source comparison result",
    origin: "generated",
    generationJobId: noSourceJob.id,
    generationOutputIndex: 0,
  });

'''
if marker not in text:
    raise SystemExit("failedJob marker not found")
text = text.replace(marker, negative_fixtures + marker, 1)

# Exercise the approved Image→Image comparison before navigating to Create.
old = '''  const reuseLink = page.getByRole("link", { name: "Reuse settings", exact: true });
  await reuseLink.waitFor({ state: "visible", timeout: 30_000 });
  assert((await reuseLink.getAttribute("href")) === `/create?recipe=${imageJob.id}`, "Viewer Reuse settings link did not target the producing recipe.");
  await reuseLink.click();'''
new = '''  const reuseLink = page.getByRole("link", { name: "Reuse settings", exact: true });
  await reuseLink.waitFor({ state: "visible", timeout: 30_000 });
  assert((await reuseLink.getAttribute("href")) === `/create?recipe=${imageJob.id}`, "Viewer Reuse settings link did not target the producing recipe.");

  const compareButton = page.getByRole("button", { name: "Compare source", exact: true });
  await compareButton.waitFor({ state: "visible", timeout: 30_000 });
  assert((await page.getByRole("link", { name: "Open source", exact: true }).count()) === 0, "Viewer exposed source context before comparison was opened.");
  await compareButton.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Close comparison", exact: true }).waitFor({ state: "visible" });
  await page.getByText("Result", { exact: true }).waitFor({ state: "visible" });
  await page.getByText("Source", { exact: true }).waitFor({ state: "visible" });
  const openSource = page.getByRole("link", { name: "Open source", exact: true });
  assert((await openSource.getAttribute("href")) === `/library/${activeInput.id}`, "Comparison source did not link to its ordinary Viewer.");
  assert(await page.locator('#media-viewer-comparison img[src*="/api/media/assets/"]').count() >= 2, "Image comparison did not render both durable product images.");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Desktop comparison introduced horizontal overflow.");
  await page.screenshot({ path: `${artifactDir}/phase16-viewer-compare-image-desktop.png`, fullPage: true });

  await page.getByRole("button", { name: "Close comparison", exact: true }).click();
  await compareButton.waitFor({ state: "visible" });
  assert((await page.getByRole("link", { name: "Open source", exact: true }).count()) === 0, "Closing comparison did not restore the default Viewer.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await compareButton.click();
  await page.getByRole("button", { name: "Close comparison", exact: true }).waitFor({ state: "visible" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Narrow comparison introduced horizontal overflow.");
  await page.screenshot({ path: `${artifactDir}/phase16-viewer-compare-image-narrow.png`, fullPage: true });
  await page.getByRole("button", { name: "Close comparison", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1024 });

  await reuseLink.click();'''
replace_once(old, new)

# Add Image→Video and negative comparison coverage before Activity verification.
marker = '''  await page.goto(`${baseUrl}/activity`, { waitUntil: "networkidle", timeout: 60_000 });'''
compare_tests = '''  await page.goto(`${baseUrl}/library/${compareVideoResultId}`, { waitUntil: "networkidle", timeout: 60_000 });
  const videoCompareButton = page.getByRole("button", { name: "Compare source", exact: true });
  await videoCompareButton.waitFor({ state: "visible", timeout: 30_000 });
  await videoCompareButton.click();
  await page.getByText("Result video", { exact: true }).waitFor({ state: "visible" });
  await page.getByText("Source", { exact: true }).waitFor({ state: "visible" });
  assert(await page.locator('#media-viewer-comparison video[controls]').count() === 1, "Image→Video comparison did not preserve result video controls.");
  assert((await page.getByRole("link", { name: "Open source", exact: true }).getAttribute("href")) === `/library/${activeInput.id}`, "Image→Video comparison resolved the wrong durable source.");
  await page.screenshot({ path: `${artifactDir}/phase16-viewer-compare-video-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "Narrow video comparison introduced horizontal overflow.");
  await page.screenshot({ path: `${artifactDir}/phase16-viewer-compare-video-narrow.png`, fullPage: true });
  await page.getByRole("button", { name: "Close comparison", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Compare source", exact: true }).waitFor({ state: "visible" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 1024 });

  for (const unavailableResult of [temporaryResult, tombstonedResult, foreignInputResult, noSourceResult]) {
    await page.goto(`${baseUrl}/library/${unavailableResult.id}`, { waitUntil: "networkidle", timeout: 60_000 });
    assert((await page.getByRole("button", { name: "Compare source", exact: true }).count()) === 0, `Unavailable comparison source leaked for result ${unavailableResult.id}.`);
    assert((await page.getByRole("link", { name: "Open source", exact: true }).count()) === 0, `Unavailable comparison source link leaked for result ${unavailableResult.id}.`);
  }

'''
if marker not in text:
    raise SystemExit("activity marker not found")
text = text.replace(marker, compare_tests + marker, 1)

text = text.replace("reusableJobs=3", "reusableJobs=3 compareCases=2")
p.write_text(text)
