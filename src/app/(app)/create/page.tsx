import { WandaFiboWorkspace } from "@/features/create/wanda-fibo-workspace";
import { CreateWorkspace } from "@/features/create/create-workspace";
import { getWandaFiboOwner } from "@/server/hosted-create";
import { isWandaPreview } from "@/server/wanda-preview";

export default async function CreatePage() {
  if (!await isWandaPreview()) return <CreateWorkspace />;

  const owner = await getWandaFiboOwner().catch(() => null);
  return <WandaFiboWorkspace admitted={!!owner} />;
}
