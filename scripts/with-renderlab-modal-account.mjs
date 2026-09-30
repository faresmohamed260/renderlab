import { spawnSync } from "node:child_process";
import {
  assertRenderLabModalAccount,
  filterRenderLabModalRoster,
} from "./lib/modal-project-ownership.mjs";

const separator = process.argv.indexOf("--");
const label = process.argv[2];
if (!label || separator < 3 || separator === process.argv.length - 1) {
  throw new Error("Usage: with-renderlab-modal-account.mjs <owned-label> -- <command> [args...]");
}
assertRenderLabModalAccount(label);

const rawRoster = process.env.MODAL_ROSTER_JSON;
if (!rawRoster) throw new Error("MODAL_ROSTER_JSON is required.");
const parsed = JSON.parse(rawRoster);
const rows = Array.isArray(parsed) ? parsed : parsed.accounts;
const roster = filterRenderLabModalRoster(rows);
const row = roster.find((candidate) => String(candidate.label || candidate.name || candidate.account).trim() === label);
if (!row) throw new Error(`Owned Modal account ${label} is missing.`);

let tokenId = row.token_id || row.tokenId;
let tokenSecret = row.token_secret || row.tokenSecret;
const combined = row.api_key || row.apiKey || row.token;
if ((!tokenId || !tokenSecret) && typeof combined === "string") {
  const delimiter = combined.indexOf(":");
  if (delimiter > 0) {
    tokenId = combined.slice(0, delimiter);
    tokenSecret = combined.slice(delimiter + 1);
  }
}
if (!tokenId || !tokenSecret) throw new Error(`Modal account ${label} has no usable token pair.`);

const command = process.argv[separator + 1];
const args = process.argv.slice(separator + 2);
const result = spawnSync(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    MODAL_TOKEN_ID: String(tokenId),
    MODAL_TOKEN_SECRET: String(tokenSecret),
  },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
