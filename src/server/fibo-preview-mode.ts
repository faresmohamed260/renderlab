import "server-only";
import { headers } from "next/headers";

export async function isFiboPreview() {
  return process.env.NODE_ENV === "development"
    && process.env.RENDERLAB_FIBO_PREVIEW === "1"
    && (await headers()).get("host") === "127.0.0.1:3000";
}
