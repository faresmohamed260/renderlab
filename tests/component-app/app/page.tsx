import { CreatePreviewWorkspace } from "@/features/create/create-preview-workspace";
import { LandingExperience } from "@/features/landing/landing-experience";
import { createProps } from "../fixtures";

export default async function FixtureCreate({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  if ((await searchParams)["landing-review"] === "1") return <LandingExperience />;
  return <CreatePreviewWorkspace {...createProps} />;
}
