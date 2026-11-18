import Link from "next/link";
import { CreateWorkspace } from "@/features/create/create-workspace";
import { getWandaFiboOwner } from "@/server/hosted-create";
import { isWandaPreview } from "@/server/wanda-preview";

export default async function CreatePage() {
  if (!await isWandaPreview()) return <CreateWorkspace />;

  const owner = await getWandaFiboOwner().catch(() => null);
  return owner
    ? <section className="wanda-create-background" aria-label="RenderLab Create background preview" />
    : <section className="wanda-create-background p-6">
        <p>Sign in with an admitted RenderLab account to open FIBO Studio.</p>
        <Link href="/settings" className="underline">Open RenderLab settings</Link>
      </section>;
}
