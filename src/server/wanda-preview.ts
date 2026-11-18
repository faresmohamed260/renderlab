import "server-only";
import { headers } from "next/headers";

export async function isWandaPreview() {
  return process.env.NODE_ENV === "development"
    && process.env.RENDERLAB_WANDA_FIBO === "1"
    && (await headers()).get("host") === "127.0.0.1:3000";
}
