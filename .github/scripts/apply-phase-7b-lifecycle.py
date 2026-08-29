from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:140]!r}")
    file.write_text(text.replace(old, new, 1))


def replace_regex(path: str, pattern: str, replacement: str) -> None:
    file = Path(path)
    text = file.read_text()
    updated, count = re.subn(pattern, lambda _match: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, found {count}: {pattern[:140]!r}")
    file.write_text(updated)


replace_once(
    "src/features/create/create-workspace.tsx",
    '''  GenerationJob,
  GenerationInputRole,
  OutputKind,''',
    '''  GenerationJob,
  OutputKind,''',
)

replace_once(
    "src/features/create/create-workspace.tsx",
    '''      setImageAspect("original");
      setVideoAspect("original");
    } catch (uploadError) {''',
    '''      if (!targetAlias && references.length === 0) {
        setImageAspect("original");
        setVideoAspect("original");
      }
    } catch (uploadError) {''',
)

replace_once(
    "scripts/verify-create-lifecycle.mjs",
    '''const fixtureAccount = configuredTestAccountIdentity("create-lifecycle");

for (const [name, value] of Object.entries({''',
    '''const fixtureAccount = configuredTestAccountIdentity("create-lifecycle");
const secondaryReferenceBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAZAAAAEsCAIAAABi1XKVAAAETElEQVR42u3by3GrQBBAUUlFlqRAOATAhgU7hUgAqEp8Buihz9m/Z6un+jLY5fd3Gl4ANfgYASBYAIIFCBaAYAEIFiBYAIIFIFiAYAEIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYAIIFCBaAYAEIFiBYAIIFIFiAYAEIFoBgAYIFIFgAggUIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWwG0aI+CIbtz8T/rW2BAsQuZpzX8iYQgWUQq19avoF4JFuE79/erKhWARtFPKhWBRX6eUC8GiylT9/IZlS7CQKtlCsJAq2UKwSJsq2RIspEq2iM7fEqqVT4obFhbYVQs3LNTKZ3fDwrq6auGGhVqZBoKF/TQTr4RYS6+HuGGhVqaEYNlDzEqwsIEmhmBh98wNwbJ1mJ5gYd/MEMHCppkkgmXHME/BwnaZKoKFvTJbBAsQLFwBTBjBwi6ZM4JlizBtwQIQLDzwzRzBsjmYvGABCJaHPOaPYNkWnIJgAQiWBzvOQrCMABAsPNKdCIIFCBYe5jgXwQIQLI9xnI5gAQgWHuDOCMECBAtAsPCu4aQQLECwAAQLbxnOC8ECBAtAsLxf4NQQLECwAAQLQLAAwWI3P7t1dggWIFgAggUgWIBgAQhWKn7N5AQRLECwAAQLQLAAwQIQLADBAgQLQLAABAsQLADBAhAsQLAABAtAsADBYoW+NQMniGABggUgWACCBQgWgGCl49dMzg7BAgQLQLAABAsQLMrxs1unhmABggUgWN4vcF4IFiBYAILlLQMnhWABggUgWN41cEYIFiBYeIA7HQQLQLA8xnEuggUgWB7mOBEECxAsPNKdBYIFCBYe7DgFwcK2mD+CBQgWHvImbwaChc0xcwQLECw88E0bwcIWmTOCZZcwYcECECxcAcwWwbJXmKpgYbvME8HCjpkkgmXTMEPBwr6ZHoKFrTM3BMvuYWKChQ00KwQLe2hKLDRG8KRt7EaTkCo3LGymmSBY2E/TwCuhLc3+eihVbljYWJ8dNyxctaQKNyxS7bBauWHhqiVVCBayJVUIFkmyJVWChWxJFYKFbEkVgkXBCoQtl04hWEQvl04hWEQvl04hWBRox0n9UigEiyvKsiNh8oRgESVhcB5/SwgIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYgGAZASBYAIIFCBaAYAEIFiBYAIIFIFiAYAEIFoBgAYIFIFgAggUIFoBgAQgWIFgAggUgWIBgAQgWgGABggUgWACCBQgWgGABggUgWACCBQgWgGABCBYgWACCBSBYgGABCBaAYAGCBSBYAIIFPNAMNnjReMMTg9AAAAAASUVORK5CYII=",
  "base64",
);

for (const [name, value] of Object.entries({''',
)

replace_regex(
    "scripts/verify-create-lifecycle.mjs",
    r'''  const mentionReference = page\.getByRole\("button", \{ name: "Mention @image1" \}\);.*?  console\.log\("Configured Create generation -> owned persisted result -> Edit continuation -> @image1 mention picker/unresolved guard verified successfully\."\);''',
    '''  const addReference = page.getByRole("button", { name: "Add reference", exact: true });
  assert(await addReference.isEnabled(), "Edit continuation did not allow a second Image reference.");

  const secondTicketPromise = page.waitForResponse(
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
  const originalSecondaryAssetId = secondCompletionPayload.asset.id;

  const image1Mention = page.getByRole("button", { name: "Mention @image1" });
  const image2Mention = page.getByRole("button", { name: "Mention @image2" });
  await image2Mention.waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Primary image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  await page.getByText("Reference image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  assert(!(await addReference.isEnabled()), "Add reference remained enabled after reaching the two-image product maximum.");

  await page.waitForFunction(
    () => {
      const images = Array.from(document.querySelectorAll('img[alt^="Reference @"]'));
      return images.length === 2 && images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0);
    },
    undefined,
    { timeout: 60_000 },
  );

  await page.setViewportSize(desktopViewport);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-multi-reference.png`, fullPage: true });

  await image1Mention.click();
  const image1MenuItem = page.getByRole("menuitem", { name: /@image1/ });
  const image2MenuItem = page.getByRole("menuitem", { name: /@image2/ });
  await image1MenuItem.waitFor({ state: "visible", timeout: 30_000 });
  await image2MenuItem.waitFor({ state: "visible", timeout: 30_000 });
  assert(await image1MenuItem.locator("img").count() === 1, "Multi-reference picker did not render @image1 thumbnail.");
  assert(await image2MenuItem.locator("img").count() === 1, "Multi-reference picker did not render @image2 thumbnail.");
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-desktop-multi-reference-picker.png`, fullPage: true });
  await image1MenuItem.click();
  assert((await prompt.inputValue()).includes("@image1"), "Multi-reference picker did not insert @image1.");

  await image2Mention.click();
  await page.getByRole("menuitem", { name: /@image2/ }).click();
  assert((await prompt.inputValue()).includes("@image2"), "Multi-reference picker did not insert @image2.");

  const replacementCompletionPromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/media/uploads/upload-completions") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  const replacementChooserPromise = page.waitForEvent("filechooser", { timeout: 30_000 });
  await page.getByRole("button", { name: "Reference actions for @image2" }).click();
  await page.getByRole("menuitem", { name: "Replace image", exact: true }).click();
  const replacementChooser = await replacementChooserPromise;
  await replacementChooser.setFiles({
    name: "phase-7b-secondary-replacement.png",
    mimeType: "image/png",
    buffer: secondaryReferenceBytes,
  });
  const replacementCompletion = await replacementCompletionPromise;
  const replacementPayload = await replacementCompletion.json().catch(() => null);
  assert(replacementCompletion.ok() && replacementPayload?.ok && replacementPayload.asset?.id, `Second-reference replacement failed: ${JSON.stringify(replacementPayload)}`);
  const replacementSecondaryAssetId = replacementPayload.asset.id;
  assert(replacementSecondaryAssetId !== originalSecondaryAssetId, "Reference replacement did not produce a new durable media identity.");
  await page.getByRole("button", { name: "Mention @image2" }).waitFor({ state: "visible", timeout: 30_000 });

  await page.setViewportSize(mobileViewport);
  await page.waitForTimeout(250);
  const mobileReferenceActions = page.getByRole("button", { name: "Reference actions for @image2" });
  const mobileActionsBox = await mobileReferenceActions.boundingBox();
  assert(mobileActionsBox && mobileActionsBox.x >= 0 && mobileActionsBox.x + mobileActionsBox.width <= mobileViewport.width, "Two-reference actions overflowed the mobile viewport.");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifactDir}/create-lifecycle-mobile-multi-reference.png`, fullPage: true });

  await page.setViewportSize(desktopViewport);
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Reference actions for @image2" }).click();
  await page.getByRole("menuitem", { name: "Make primary", exact: true }).click();

  const primaryRow = page.getByText("Primary image", { exact: true }).locator("..").locator("..");
  const secondaryRow = page.getByText("Reference image", { exact: true }).locator("..").locator("..");
  assert(await primaryRow.getByRole("button", { name: "Mention @image2" }).count() === 1, "Make primary changed @image2 identity instead of moving its slot.");
  assert(await secondaryRow.getByRole("button", { name: "Mention @image1" }).count() === 1, "Make primary changed @image1 identity instead of moving its slot.");

  await prompt.fill("Place @image1 on the left and @image2 on the right");
  let reorderedBody = null;
  await page.route("**/api/generation/jobs", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    reorderedBody = route.request().postDataJSON();
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: { code: "verification_stop", message: "Verification intentionally stops before a second model generation." } }),
    });
  });
  const generateAfterReorder = page.getByRole("button", { name: "Generate", exact: true });
  assert(await generateAfterReorder.isEnabled(), "Generate was not enabled for a valid two-reference request.");
  await generateAfterReorder.click();
  await page.waitForTimeout(250);
  assert(reorderedBody?.inputs?.length === 2, `Two-reference Create request had the wrong input count: ${JSON.stringify(reorderedBody)}`);
  assert(reorderedBody.inputs[0]?.alias === "image2" && reorderedBody.inputs[0]?.role === "primary-image", `Primary reordered slot was not stable @image2: ${JSON.stringify(reorderedBody.inputs)}`);
  assert(reorderedBody.inputs[0]?.source?.type === "media-asset" && reorderedBody.inputs[0]?.source?.id === replacementSecondaryAssetId, "Primary reordered slot did not use the replaced durable @image2 asset.");
  assert(reorderedBody.inputs[1]?.alias === "image1" && reorderedBody.inputs[1]?.role === "reference", `Secondary reordered slot was not stable @image1: ${JSON.stringify(reorderedBody.inputs)}`);
  assert(reorderedBody.inputs[1]?.source?.type === "media-asset" && reorderedBody.inputs[1]?.source?.id === assets[0].id, "Secondary reordered slot did not preserve the original durable @image1 asset.");
  await page.unroute("**/api/generation/jobs");

  await page.getByRole("radio", { name: "Video", exact: true }).click();
  assert(await page.getByRole("radio", { name: "Image", exact: true }).isChecked(), "Two-reference Image request silently switched to Video.");
  assert(!(await page.getByRole("radio", { name: "Video", exact: true }).isChecked()), "Video became selected while two references were still attached.");
  await page.getByText(/Remove one reference before switching to Video/).waitFor({ state: "visible", timeout: 30_000 });

  await page.getByRole("button", { name: "Remove @image1" }).click();
  assert(!(await generateAfterReorder.isEnabled()), "Generate remained enabled after a referenced @image1 attachment was removed.");
  await page.getByText(/@image1 no longer has an attached image/).waitFor({ state: "visible", timeout: 30_000 });
  await prompt.fill((await prompt.inputValue()).replace("@image1", "").replace(/\\s+/g, " ").trim());
  assert(await generateAfterReorder.isEnabled(), "Generate did not recover after the unresolved @image1 mention was removed.");

  await page.getByRole("radio", { name: "Video", exact: true }).click();
  await page.getByRole("heading", { name: "Animate an image" }).waitFor({ state: "visible", timeout: 30_000 });
  assert(await page.getByRole("radio", { name: "Video", exact: true }).isChecked(), "Video did not become available after returning to one reference.");
  assert(await page.getByRole("button", { name: "Mention @image2" }).isVisible(), "Remaining @image2 identity was lost when switching to Video.");

  console.log("Configured Create generation -> durable two-reference attach/replace -> stable alias mention -> Make primary reorder -> Video limit/unresolved guard verified successfully.");''',
)

print("Phase 7B configured lifecycle patch applied.")
