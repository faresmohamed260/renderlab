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

  return <LandingExperience />;
}
