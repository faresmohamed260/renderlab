import fs from "node:fs";
const path = "PROJECT.md";
const from = "- deploy the verified owner-aware `main` only through a separately authorized production rollout;\n- make the owner-aware application code live only through a separately authorized deployment/rollout step;";
const to = "- make the verified owner-aware application code live only through a separately authorized production rollout;";
const text = fs.readFileSync(path, "utf8");
if (text.indexOf(from) === -1 || text.indexOf(from) !== text.lastIndexOf(from)) {
  throw new Error("PROJECT.md: expected exactly one duplicate rollout pair");
}
fs.writeFileSync(path, text.replace(from, to));
console.log("Collapsed duplicate rollout step.");
