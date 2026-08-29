from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1))


# Create uses the shared persistent media upload path and binds the durable media asset.
replace_once(
    "src/features/create/create-workspace.tsx",
    '''import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";\n''',
    '''import type { PublicMediaAsset } from "@/lib/api/media-assets-contract";\nimport {\n  maxMediaUploadBytes,\n  supportedMediaUploadMimeTypes,\n  type MediaUploadMimeType,\n} from "@/lib/api/media-upload-contract";\nimport { uploadPersistentImageFile } from "@/lib/browser/media-upload-client";\n''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''import type {\n  CompleteReferenceUploadResponse,\n  CreateReferenceUploadTicketResponse,\n  ReferenceSource,\n} from "@/lib/api/reference-upload-contract";\nimport { maxReferenceUploadBytes, supportedReferenceMimeTypes } from "@/lib/api/reference-upload-contract";\n''',
    '''''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''async function readImageDimensions(file: File) {\n  try {\n    const bitmap = await createImageBitmap(file);\n    const dimensions = { width: bitmap.width, height: bitmap.height };\n    bitmap.close();\n    return dimensions;\n  } catch {\n    return {};\n  }\n}\n\n''',
    '''''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  referenceUploadAvailable,\n''',
    '''  mediaUploadAvailable,\n''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  referenceUploadAvailable: boolean;\n''',
    '''  mediaUploadAvailable: boolean;\n''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''  const [reference, setReference] = useState<ReferenceSource | null>(null);\n''',
    '''  const [reference, setReference] = useState<PublicMediaAsset | null>(null);\n''',
)

start = '''  async function uploadReference(file: File) {\n'''
end = '''  async function submit(event: FormEvent<HTMLFormElement>) {\n'''
p = Path("src/features/create/create-workspace.tsx")
text = p.read_text()
a = text.find(start)
b = text.find(end, a)
if a < 0 or b < 0:
    raise SystemExit("Could not locate Create uploadReference block")
new_upload = '''  async function uploadReference(file: File) {\n    if (!accountAvailable || !mediaUploadAvailable) return;\n\n    const mimeType = file.type.toLowerCase();\n    if (!(supportedMediaUploadMimeTypes as readonly string[]).includes(mimeType)) {\n      setError("References must be PNG, JPEG, or WebP images.");\n      return;\n    }\n    if (file.size < 1 || file.size > maxMediaUploadBytes) {\n      setError("Reference images must be no larger than 25 MB.");\n      return;\n    }\n\n    setReferenceUploading(true);\n    setError(null);\n\n    const previewUrl = URL.createObjectURL(file);\n    revokePreviewUrl(referencePreviewUrl);\n    setReferencePreviewUrl(previewUrl);\n    setReference(null);\n    setContinuationSource(null);\n\n    try {\n      const asset = await uploadPersistentImageFile(file, mimeType as MediaUploadMimeType);\n      setReference(asset);\n    } catch (uploadError) {\n      setReference(null);\n      setError(uploadError instanceof Error ? uploadError.message : "Reference upload failed.");\n    } finally {\n      setReferenceUploading(false);\n    }\n  }\n\n'''
p.write_text(text[:a] + new_upload + text[b:])

replace_once(
    "src/features/create/create-workspace.tsx",
    '''              source: { type: "temporary-source" as const, id: reference.id },\n''',
    '''              source: { type: "media-asset" as const, id: reference.id },\n''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''                  {continuationSource ? continuationSourceLabel : reference?.filename ?? "Reference image"}\n''',
    '''                  {continuationSource\n                    ? continuationSourceLabel\n                    : reference?.displayName ?? reference?.originalFilename ?? "Reference image"}\n''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''                  disabled={!accountAvailable || !referenceUploadAvailable || referenceUploading}\n''',
    '''                  disabled={!accountAvailable || !mediaUploadAvailable || referenceUploading}\n''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''                      : referenceUploadAvailable\n''',
    '''                      : mediaUploadAvailable\n''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''        {!generationAvailable || !referenceUploadAvailable ? (\n''',
    '''        {!generationAvailable || !mediaUploadAvailable ? (\n''',
)
replace_once(
    "src/features/create/create-workspace.tsx",
    '''              {!referenceUploadAvailable ? <p>Reference uploads are not connected in this environment yet.</p> : null}\n''',
    '''              {!mediaUploadAvailable ? <p>Image uploads are not connected in this environment yet.</p> : null}\n''',
)

# The Create page now checks the durable media upload contract rather than temporary source staging.
replace_once(
    "src/app/page.tsx",
    '''import { isReferenceUploadConfigured } from "@/server/media/reference-uploads";\n''',
    '''import { isMediaUploadConfigured } from "@/server/media/media-uploads";\n''',
)
replace_once(
    "src/app/page.tsx",
    '''      referenceUploadAvailable={isReferenceUploadConfigured()}\n''',
    '''      mediaUploadAvailable={isMediaUploadConfigured()}\n''',
)

# Persistent uploads are a product-wide user media concept, not Library-only provenance.
replace_once(
    "src/server/media/media-uploads.ts",
    '''        provenance: { source: "library-upload" },\n''',
    '''        provenance: { source: "user-upload" },\n''',
)

# Update the static unconfigured-environment expectation to the durable image-upload language.
replace_once(
    "tests/ui/create.spec.ts",
    '''  await expect(page.getByText("Reference uploads are not connected in this environment yet.")).toBeVisible();\n''',
    '''  await expect(page.getByText("Image uploads are not connected in this environment yet.")).toBeVisible();\n''',
)
