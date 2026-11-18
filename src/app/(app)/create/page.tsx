import { createHash } from "node:crypto";
import { Suspense } from "react";
import { WandaFiboWorkspace } from "@/features/create/wanda-fibo-workspace";
import { CreateWorkspace } from "@/features/create/create-workspace";
import { getWandaFiboOwner } from "@/server/hosted-create";
import { isWandaPreview } from "@/server/wanda-preview";

export default async function CreatePage() {
  if (!await isWandaPreview()) return <CreateWorkspace />;

  return <Suspense fallback={<p className="wanda-fibo-create-loading" role="status">Loading Create…</p>}>
    <WandaCreate />
  </Suspense>;
}

async function WandaCreate() {
  const hostedOnly = process.env.RENDERLAB_HOSTED_CREATE === "1";
  const owner = await getWandaFiboOwner().catch(() => null);
  const savedEditsAccount = owner && !hostedOnly ? createHash("sha256").update("wanda-fibo-edits:" + owner).digest("hex") : undefined;
  return <WandaFiboWorkspace key={savedEditsAccount ?? "guest"} savedEditsAccount={savedEditsAccount} admitted={!!owner} hostedOnly={hostedOnly} masksEnabled={process.env.RENDERLAB_WANDA_FIBO_MASKS === "1"} advancedPrompt={process.env.RENDERLAB_WANDA_FIBO_ADVANCED_PROMPT === "1"} variableSteps={process.env.RENDERLAB_WANDA_FIBO_VARIABLE_STEPS === "1"} extendedSetup={process.env.RENDERLAB_WANDA_FIBO_EXTENDED === "1"} />;
}
