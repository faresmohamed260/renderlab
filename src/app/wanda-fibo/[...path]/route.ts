import { wandaFibo } from "@/server/wanda-fibo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return wandaFibo(request, (await context.params).path.join("/"));
}

export { handle as GET, handle as POST };
