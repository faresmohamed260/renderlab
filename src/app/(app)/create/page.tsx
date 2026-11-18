import { WandaFiboWorkspace } from "@/features/create/wanda-fibo-workspace";
import { CreateWorkspace } from "@/features/create/create-workspace";
import { getWandaFiboOwner } from "@/server/hosted-create";
import { isWandaPreview } from "@/server/wanda-preview";

export default async function CreatePage() {
  if (!await isWandaPreview()) return <CreateWorkspace />;

  const owner = await getWandaFiboOwner().catch(() => null);
  return <WandaFiboWorkspace admitted={!!owner} advancedPrompt={process.env.RENDERLAB_WANDA_FIBO_ADVANCED_PROMPT === "1"} variableSteps={process.env.RENDERLAB_WANDA_FIBO_VARIABLE_STEPS === "1"} extendedSetup={process.env.RENDERLAB_WANDA_FIBO_EXTENDED === "1"} />;
}
