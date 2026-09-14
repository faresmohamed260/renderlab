export type RenderLabAuthenticatorAssuranceLevel = "aal1" | "aal2" | null;

export type RenderLabAuthenticationMethod = {
  method: string;
  timestamp: number;
};

export type RenderLabMfaAssurance = {
  currentLevel: RenderLabAuthenticatorAssuranceLevel;
  nextLevel: RenderLabAuthenticatorAssuranceLevel;
  currentAuthenticationMethods: RenderLabAuthenticationMethod[];
};

export const RENDERLAB_RECENT_TOTP_STEP_UP_SECONDS = 10 * 60;

export function isRenderLabMfaEnrolled(assurance: RenderLabMfaAssurance) {
  return assurance.nextLevel === "aal2";
}

export function isRenderLabMfaChallengeRequired(assurance: RenderLabMfaAssurance) {
  return isRenderLabMfaEnrolled(assurance) && assurance.currentLevel !== "aal2";
}

export function hasRecentRenderLabTotpStepUp(
  assurance: RenderLabMfaAssurance,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (assurance.currentLevel !== "aal2") return false;

  return assurance.currentAuthenticationMethods.some(({ method, timestamp }) => {
    if (method !== "totp" || !Number.isFinite(timestamp)) return false;
    const ageSeconds = nowSeconds - timestamp;
    return ageSeconds >= -60 && ageSeconds <= RENDERLAB_RECENT_TOTP_STEP_UP_SECONDS;
  });
}

export function renderLabSafeMfaNextPath(value: string | null | undefined, fallback = "/settings") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const parsed = new URL(value, "https://renderlab.invalid");
    if (parsed.origin !== "https://renderlab.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
