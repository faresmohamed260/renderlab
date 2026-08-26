import { CreateWorkspace } from "@/features/create/create-workspace";
import { isGenerationBackendConfigured } from "@/server/generation/submit-generation";
import { isReferenceUploadConfigured } from "@/server/media/reference-uploads";

export default function CreatePage() {
  return (
    <CreateWorkspace
      generationAvailable={isGenerationBackendConfigured()}
      referenceUploadAvailable={isReferenceUploadConfigured()}
    />
  );
}
