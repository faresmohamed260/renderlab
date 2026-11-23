import { envFlag, envString } from "../lib/config/runtime-env.ts";
import "server-only";
import { headers } from "next/headers";

export async function isCreatePreview() {
  return envString("NODE_ENV") === "development"
    && envFlag("RENDERLAB_CREATE_PREVIEW")
    && (await headers()).get("host") === "127.0.0.1:3000";
}
