import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of equal-length SHA-256 digests.
 * Fail closed for missing or sub-32-character server secrets.
 */
export function isAuthorizedInternalBearer(header: string | null, configuredSecret: string | null | undefined): boolean {
  const secret = configuredSecret?.trim();
  if (!secret || secret.length < 32 || !header) return false;
  const suppliedHash = createHash("sha256").update(header, "utf8").digest();
  const expectedHash = createHash("sha256").update(`Bearer ${secret}`, "utf8").digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}
