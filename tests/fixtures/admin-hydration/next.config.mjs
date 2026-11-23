import path from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

// Resolve the production UI and the existing dependencies from this repo.
// No network service, live authentication, or database is used.
export default {
  turbopack: { root: path.resolve(fixtureDir, "../../..") },
};
