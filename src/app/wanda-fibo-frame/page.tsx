import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getWandaFiboOwner } from "@/server/hosted-create";
import { FiboStudioFrame } from "@/features/create/fibo-studio-frame";

export default async function FiboFramePage() {
  if (process.env.NODE_ENV !== "development" || process.env.RENDERLAB_WANDA_FIBO !== "1"
    || (await headers()).get("host") !== "127.0.0.1:3000") notFound();
  if (!await getWandaFiboOwner().catch(() => null)) {
    return <main className="p-6"><p>Sign in with an admitted RenderLab account to open FIBO Studio.</p>
      <a href="/settings" target="_top" className="underline">Open RenderLab settings</a></main>;
  }
  return <FiboStudioFrame />;
}
