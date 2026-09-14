export function normalizeRenderLabSessionClient(userAgent: string | null | undefined) {
  if (!userAgent) return "Unknown browser";

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /(?:Chrome|CriOS)\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent) && /Version\//.test(userAgent)
          ? "Safari"
          : "Unknown browser";

  const platform = /iPhone/.test(userAgent)
    ? "iPhone"
    : /iPad/.test(userAgent)
      ? "iPad"
      : /Android/.test(userAgent)
        ? "Android"
        : /Windows NT/.test(userAgent)
          ? "Windows"
          : /Macintosh|Mac OS X/.test(userAgent)
            ? "macOS"
            : /Linux/.test(userAgent)
              ? "Linux"
              : null;

  if (browser === "Unknown browser") return platform ? `Unknown browser on ${platform}` : browser;
  return platform ? `${browser} on ${platform}` : browser;
}
