import { createHash } from "node:crypto";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const publicFixture = "password";
const hash = createHash("sha1").update(publicFixture, "utf8").digest("hex").toUpperCase();
const prefix = hash.slice(0, 5);
const suffix = hash.slice(5);

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 8_000);
let response;
try {
  response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: {
      "Add-Padding": "true",
      "User-Agent": "RenderLab-Pwned-Passwords-Verification/1.0",
    },
    signal: controller.signal,
  });
} finally {
  clearTimeout(timeout);
}

assert(response.ok, `Pwned Passwords range API returned HTTP ${response.status}.`);
const body = await response.text();
const lines = body.split(/\r?\n/).filter(Boolean);
assert(lines.length >= 800 && lines.length <= 1_000, `Expected padded response with 800-1000 rows, got ${lines.length}.`);

let matched = false;
for (const line of lines) {
  const [candidateSuffix, countValue] = line.trim().split(":", 2);
  if (candidateSuffix?.toUpperCase() !== suffix) continue;
  const count = Number.parseInt(countValue, 10);
  matched = Number.isFinite(count) && count > 0;
  break;
}

assert(matched, "Pwned Passwords public compromised fixture was not present in the padded range response.");
console.log("Pwned Passwords free range API reachable; padded k-anonymity response verified.");
