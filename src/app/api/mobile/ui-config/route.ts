import { NextResponse } from "next/server";
import { parseAndroidUiConfigOverride } from "@/lib/api/android-ui-config-contract";

/**
 * Anonymous GET is intentional: the payload is public, presentational and
 * constrained to four already-existing Android routes. No owner data, tokens,
 * privileged capabilities, arbitrary URLs or remote code are included.
 *
 * A checked-in fallback works with existing infrastructure. An optional
 * server-only environment override takes effect only on a separately
 * authorized Vercel deployment / environment rollout, not from this PR.
 */
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  try {
    const config = parseAndroidUiConfigOverride(process.env.RENDERLAB_ANDROID_UI_CONFIG_JSON);
    return NextResponse.json(config, { headers });
  } catch {
    // Invalid server configuration fails closed; never leak its raw contents.
    return NextResponse.json(
      { ok: false, error: { code: "android_ui_config_unavailable" } },
      { status: 503, headers },
    );
  }
}
