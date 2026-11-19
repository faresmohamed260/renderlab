import { createPreview } from "@/server/create-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return createPreview(request, (await context.params).path.join("/"));
}

export { handle as GET, handle as POST };
