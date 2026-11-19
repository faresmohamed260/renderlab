import { relayHostedCreate } from "@/server/hosted-create";

export async function GET(request: Request) {
  return await relayHostedCreate(request, "/api/account/profile") ?? new Response(null, { status: 404 });
}
