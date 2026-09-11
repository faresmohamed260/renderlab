from pathlib import Path

# Normalize contract whitespace so repository hygiene checks judge the actual implementation.
contract = Path('docs/ui/CREATE_CLEAR_COMPOSER_IMPLEMENTATION_CONTRACT.md')
contract.write_text('\n'.join(line.rstrip() for line in contract.read_text().splitlines()) + '\n')

# Update signed-out shell/UI tests from the superseded kinetic heading language to the approved stable Clear Composer headings.
create_spec = Path('tests/ui/create.spec.ts')
text = create_spec.read_text()
text = text.replace('test("Create exposes the reviewed minimal image composer"', 'test("Create exposes the approved Clear Composer image authoring"', 1)
text = text.replace('page.getByRole("heading", { name: /What do you want to (create|explore|transform|imagine)\\?/ })', 'page.getByRole("heading", { name: "Create an image", exact: true })')
text = text.replace('page.getByRole("heading", { name: "What do you want to create?" })', 'page.getByRole("heading", { name: "Create an image", exact: true })')
text = text.replace('  await expect(page.getByText("Advanced", { exact: true })).toBeVisible();\n', '')
create_spec.write_text(text)

library_spec = Path('tests/ui/library.spec.ts')
text = library_spec.read_text()
text = text.replace('page.getByRole("heading", { name: /What do you want to (create|explore|transform|imagine)\\?/ })', 'page.getByRole("heading", { name: "Create an image", exact: true })')
library_spec.write_text(text)

# Durable Create upload: continuation keeps stable Create heading and expresses intent through the attached role.
durable = Path('scripts/verify-create-durable-upload.mjs')
text = durable.read_text()
old = '  await page.getByText("Editing this image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n'
new = '  await page.getByRole("heading", { name: "Create an image", exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n  await page.getByText("Primary image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n'
if old not in text:
    raise SystemExit('durable upload stale continuation marker not found')
durable.write_text(text.replace(old, new, 1))

# Configured Library lifecycle: preserve URL/output/reference invariants while using current continuation semantics.
library_lifecycle = Path('scripts/verify-library-lifecycle.mjs')
text = library_lifecycle.read_text()
old = '  await page.getByRole("heading", { name: "Edit an image", exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n  await page.getByText("Editing this image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n'
new = '  await page.getByRole("heading", { name: "Create an image", exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n  await page.getByText("Primary image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n'
if old not in text:
    raise SystemExit('library lifecycle stale continuation marker not found')
library_lifecycle.write_text(text.replace(old, new, 1))

# Integrated release: generation/persistence/viewer already succeeded; update only the superseded continuation presentation assertion.
integrated = Path('scripts/verify-integrated-release.mjs')
text = integrated.read_text()
old = '  await page.getByRole("heading", { name: "Edit an image", exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n  await page.getByText("Editing this image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n'
new = '  await page.getByRole("heading", { name: "Create an image", exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n  await page.getByText("Primary image", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n'
if old not in text:
    raise SystemExit('integrated release stale continuation marker not found')
integrated.write_text(text.replace(old, new, 1))
