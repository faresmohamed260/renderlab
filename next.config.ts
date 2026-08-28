import type { NextConfig } from "next";

const supabaseUrl = process.env.SUPABASE_URL?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  || "";
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  || "";

const nextConfig: NextConfig = {
  env: {
    // Supabase project URL + publishable key are intentionally public browser configuration.
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  },
};

export default nextConfig;
