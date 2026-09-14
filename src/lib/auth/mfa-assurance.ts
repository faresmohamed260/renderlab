export type RenderLabAuthenticatorAssuranceLevel = "aal1" | "aal2" | null;

export type RenderLabAuthenticationMethod = {
  method: string;
  timestamp: number;
};

export type RenderLabMfaAssurance = {
  currentLevel: RenderLabAuthenticatorAssuranceLevel;
  nextLevel: RenderLabAuthenticatorAssuranceLevel;
  currentAuthenticationMethods: RenderLabAuthenticationMethod[];
  verifiedTotpFactorCount: number | null;
};

export const RENDERLAB_RECENT_TOTP_STEP_UP_SECONDS = 10 * 60;

function assuranceLevel(value: unknown): RenderLabAuthenticatorAssuranceLevel {
  return value === "aal1" || value === "aal2" ? value : null;
}

function authenticationMethods(value: unknown): RenderLabAuthenticationMethod[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const method = "method" in candidate ? candidate.method : null;
    const timestamp = "timestamp" in candidate ? candidate.timestamp : null;
    if (typeof method !== "string" || typeof timestamp !== "number") return [];
    return [{ method, timestamp }];
  });
}

function verifiedTotpFactorCount(value: unknown) {
  if (value == null) return null;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

export function normalizeRenderLabMfaAssurance(value: unknown): RenderLabMfaAssurance | null {
  if (!value || typeof value !== "object") return null;
  const currentLevel = assuranceLevel("currentLevel" in value ? value.currentLevel : null);
  const nextLevel = assuranceLevel("nextLevel" in value ? value.nextLevel : null);
  if (!currentLevel || !nextLevel) return null;
  return {
    currentLevel,
    nextLevel,
    currentAuthenticationMethods: authenticationMethods(
      "currentAuthenticationMethods" in value ? value.currentAuthenticationMethods : null,
    ),
    verifiedTotpFactorCount: verifiedTotpFactorCount(
      "verifiedTotpFactorCount" in value ? value.verifiedTotpFactorCount : null,
    ),
  };
}

export function isRenderLabMfaEnrolled(assurance: RenderLabMfaAssurance) {
  if (assurance.verifiedTotpFactorCount !== null) return assurance.verifiedTotpFactorCount > 0;
  return assurance.nextLevel === "aal2";
}

export function isRenderLabMfaFactorStateSupported(assurance: RenderLabMfaAssurance) {
  return assurance.verifiedTotpFactorCount === null || assurance.verifiedTotpFactorCount <= 1;
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
