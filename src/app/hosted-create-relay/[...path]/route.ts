import { relayHostedCreate } from "@/server/hosted-create";

async function relay(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return await relayHostedCreate(request, "/api/" + path.join("/")) ?? new Response(null, { status: 404 });
}

export { relay as GET, relay as POST };
