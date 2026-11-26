import { randomBytes } from "node:crypto";

// Local-only known-length incompressible transfer for checking CDP throttling.
// This is not a production route and never reads a provider or account.
export const dynamic = "force-dynamic";
export function GET() {
  return new Response(new Uint8Array(randomBytes(128 * 1024)), {
    headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" },
  });
}
