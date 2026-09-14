const PWNED_PASSWORDS_RANGE_URL = "https://api.pwnedpasswords.com/range";
const LOOKUP_TIMEOUT_MS = 4_000;
const LOOKUP_ATTEMPTS = 2;

export const COMPROMISED_PASSWORD_MESSAGE =
  "This password has appeared in known data breaches. Choose a different password.";
export const PASSWORD_SAFETY_UNAVAILABLE_MESSAGE =
  "Password safety check is unavailable. Try again.";

export type CompromisedPasswordScreeningResult = "safe" | "compromised" | "unavailable";

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function sha1Hex(value: string) {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto unavailable");
  const encoded = new TextEncoder().encode(value);
  return bytesToHex(await globalThis.crypto.subtle.digest("SHA-1", encoded));
}

function rangeContainsSuffix(body: string, expectedSuffix: string) {
  for (const line of body.split(/\r?\n/)) {
    const [suffix, countValue] = line.trim().split(":", 2);
    if (!suffix || !countValue || suffix.toUpperCase() !== expectedSuffix) continue;
    const count = Number.parseInt(countValue, 10);
    return Number.isFinite(count) && count > 0;
  }
  return false;
}

async function fetchRange(prefix: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(`${PWNED_PASSWORDS_RANGE_URL}/${prefix}`, {
      method: "GET",
      headers: { "Add-Padding": "true" },
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Pwned Passwords lookup failed");
    return await response.text();
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function screenRenderLabCompromisedPassword(
  password: string,
): Promise<CompromisedPasswordScreeningResult> {
  let hash: string;
  try {
    hash = await sha1Hex(password);
  } catch {
    return "unavailable";
  }

  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  for (let attempt = 0; attempt < LOOKUP_ATTEMPTS; attempt += 1) {
    try {
      const range = await fetchRange(prefix);
      return rangeContainsSuffix(range, suffix) ? "compromised" : "safe";
    } catch {
      if (attempt === LOOKUP_ATTEMPTS - 1) return "unavailable";
    }
  }

  return "unavailable";
}
