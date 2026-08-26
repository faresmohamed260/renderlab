import { CreateWorkspace } from "@/features/create/create-workspace";
import { isGenerationBackendConfigured } from "@/server/generation/submit-generation";

export default function CreatePage() {
  return <CreateWorkspace generationAvailable={isGenerationBackendConfigured()} />;
}
