type SourceResult = { assetId?: string; image_data: string; filename?: string };

export async function loadCreateResultSource(
  result: SourceResult,
  signal: AbortSignal,
  isImageMime: (type: string) => boolean,
): Promise<File> {
  const filename = result.filename ?? "result.png";
  if (!result.assetId) {
    const bytes = Uint8Array.from(atob(result.image_data.split(",")[1]), (ch) => ch.charCodeAt(0));
    return new File([bytes], filename, { type: "image/png" });
  }

  const response = await fetch(
    "/api/media/assets/" + encodeURIComponent(result.assetId) + "/content?source=1",
    { signal, cache: "no-store" },
  );
  if (!response.ok) throw new Error("Source image is unavailable.");
  const blob = await response.blob();
  if (!blob.size || !isImageMime(blob.type)) throw new Error("Invalid source image.");
  return new File([blob], filename, { type: blob.type });
}
