import type { NextConfig } from "next";

const supabaseUrl = process.env.SUPABASE_URL?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  || "";
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || "";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(process.env.RENDERLAB_WANDA_FIBO === "1" ? { devIndicators: false as const } : {}),
  env: {
    // Supabase project URL + publishable key are intentionally public browser configuration.
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const host = [{ type: "host" as const, value: "127\\.0\\.0\\.1" }];
    const hosted = process.env.RENDERLAB_HOSTED_CREATE === "1";
    const previewProfile = hosted && process.env.RENDERLAB_WANDA_FIBO === "1"
      ? ["account/profile", "account/profile/avatar"].map((path) => ({
          source: "/api/preview-account/" + path.slice("account/".length),
          destination: "/hosted-create-relay/" + path,
          has: host,
        }))
      : [];
    if (!hosted) return [];
    const paths = [
      "generation/jobs", "generation/jobs/:id", "generation/jobs/:id/cancel",
      "media/assets", "media/assets/:id([a-f0-9-]{36})", "media/assets/:id/content", "media/assets/:id/thumbnail",
      "media/uploads/upload-tickets", "media/uploads/upload-completions",
    ];
    return { beforeFiles: [...previewProfile, ...paths.map((path) => ({
      source: "/api/" + path,
      destination: "/hosted-create-relay/" + path.replace(":id([a-f0-9-]{36})", ":id"),
      has: host,
    }))], afterFiles: [], fallback: [] };
  },
  async headers() {
    const base = [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
    if (process.env.NODE_ENV !== "development" || process.env.RENDERLAB_WANDA_FIBO !== "1") return base;
    const host = [{ type: "host" as const, value: "127.0.0.1" }].map(
      (rule) => ({ ...rule, value: rule.value.replaceAll(".", "\\.") }),
    );
    return [...base,
      { source: "/create", has: host, headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy.replace("frame-src 'none'", "frame-src 'self'") },
      ] },
      { source: "/wanda-fibo-frame", has: host, headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy.replace("frame-ancestors 'none'", "frame-ancestors 'self'") },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ] },
    ];
  },
};

export default nextConfig;
