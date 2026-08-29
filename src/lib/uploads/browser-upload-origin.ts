export const canonicalRenderLabUploadOrigin = "https://renderlab-lake.vercel.app";

const approvedVercelBrowserUploadOrigins = new Set([
  canonicalRenderLabUploadOrigin,
  "https://renderlab-faresmohamed260-6733s-projects.vercel.app",
  "https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app",
]);

export function unsupportedVercelBrowserUploadOrigin(
  origin = typeof window === "undefined" ? "" : window.location.origin,
) {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app")) return null;
    return approvedVercelBrowserUploadOrigins.has(url.origin) ? null : url.origin;
  } catch {
    return null;
  }
}

export function assertBrowserUploadOriginSupported() {
  const unsupportedOrigin = unsupportedVercelBrowserUploadOrigin();
  if (!unsupportedOrigin) return;
  throw new Error(
    `Uploads are not available from this Vercel deployment URL. Open ${canonicalRenderLabUploadOrigin} and try again.`,
  );
}

export function browserUploadFetchErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TypeError) {
    return `${fallback} Check your connection and try again.`;
  }
  return error instanceof Error ? error.message : fallback;
}
