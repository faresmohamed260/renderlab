import { headers } from "next/headers";
import { CreateWorkspace } from "@/features/create/create-workspace";

export default async function CreatePage() {
  if (process.env.NODE_ENV === "development" && process.env.RENDERLAB_WANDA_FIBO === "1"
    && (await headers()).get("host") === "127.0.0.1:3000") {
    return <iframe title="RenderLab Create preview" src="/wanda-fibo-frame"
      className="block h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-72px)] w-full border-0" />;
  }
  return <CreateWorkspace />;
}
