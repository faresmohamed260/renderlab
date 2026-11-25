import { existsSync } from "node:fs";
import { resolve } from "node:path";
import production from "../../postcss.config.mjs";

// Next's nested Turbopack root already points at the repository. Resolve the
// Tailwind filesystem scan base without new URL(directory, import.meta.url):
// Turbopack treats that expression as an asset import, not a directory path.
const candidates = [resolve(process.cwd()), resolve(process.cwd(), "../..")];
const base = candidates.find(root => existsSync(resolve(root, "src/app/globals.css")) && existsSync(resolve(root, "postcss.config.mjs")));
if (!base) throw Error("Cannot locate production stylesheet root from nested fixture");

export default {
  ...production,
  plugins: {
    ...production.plugins,
    "@tailwindcss/postcss": { ...production.plugins["@tailwindcss/postcss"], base },
  },
};
