import { headers } from "next/headers";
import { getCurrentRenderLabIdentity } from "@/lib/supabase/server";
import { PreviewNavigationShell } from "@/components/shell/preview-navigation-shell";
import { redirect } from "next/navigation";

import { LandingExperience } from "@/features/landing/landing-experience";

function serializeSearchParams(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }
  return query.toString();
}

function hasContinuationIntent(params: Record<string, string | string[] | undefined>) {
  return Object.prototype.hasOwnProperty.call(params, "source") || Object.prototype.hasOwnProperty.call(params, "action");
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (hasContinuationIntent(params)) {
    const query = serializeSearchParams(params);
    redirect(query ? `/create?${query}` : "/create");
  }

  const preview = process.env.NODE_ENV === "development" && process.env.RENDERLAB_WANDA_FIBO === "1"
    && (await headers()).get("host") === "127.0.0.1:3000";
  const landing = <LandingExperience />;
  return preview ? <PreviewNavigationShell accountId={(await getCurrentRenderLabIdentity().catch(() => null))?.id ?? null}>{landing}</PreviewNavigationShell> : landing;
}
