import { createHmac, timingSafeEqual } from "node:crypto";

export const PASSWORD_RECOVERY_COOKIE_NAME = "renderlab_password_recovery";
export const PASSWORD_RECOVERY_TTL_SECONDS = 10 * 60;

function recoverySecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

function signature(userId: string, expiresAt: number, secret: string) {
  return createHmac("sha256", secret).update(`${userId}:${expiresAt}`).digest("base64url");
}

export function createPasswordRecoveryMarker(userId: string) {
  const secret = recoverySecret();
  if (!secret) return null;
  const expiresAt = Date.now() + PASSWORD_RECOVERY_TTL_SECONDS * 1000;
  return `${expiresAt}.${signature(userId, expiresAt, secret)}`;
}

export function isPasswordRecoveryMarkerValid(value: string | undefined, userId: string) {
  const secret = recoverySecret();
  if (!secret || !value) return false;

  const separator = value.indexOf(".");
  if (separator < 1) return false;
  const expiresAt = Number(value.slice(0, separator));
  const suppliedSignature = value.slice(separator + 1);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !suppliedSignature) return false;

  const expected = Buffer.from(signature(userId, expiresAt, secret));
  const supplied = Buffer.from(suppliedSignature);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
