import { readFile } from "node:fs/promises";

import { verifyArchiveCatalog } from "./lib/archive-catalog.mjs";
import { verifyComponentSourceRegistry } from "./lib/component-source-governance.mjs";
import { verifyDocsGovernance } from "./lib/docs-governance.mjs";
import { verifyExternalFactRegistry } from "./lib/external-fact-governance.mjs";
import { findPublicDocumentationBoundaryProblems } from "./lib/public-documentation-boundary.mjs";

try {
  const result = await verifyDocsGovernance();
  const publicDocuments = await Promise.all(
    ["README.md", "docs/STATUS.md"].map(async (documentPath) => ({
      path: documentPath,
      body: await readFile(documentPath, "utf8"),
    })),
  );
  const publicBoundaryProblems = findPublicDocumentationBoundaryProblems(publicDocuments);
  if (publicBoundaryProblems.length > 0) {
    throw new Error(`Public documentation boundary verification failed:\n- ${publicBoundaryProblems.join("\n- ")}`);
  }
  const externalFactResult = await verifyExternalFactRegistry();
  const componentSourceResult = await verifyComponentSourceRegistry();
  const archiveResult = await verifyArchiveCatalog();
  console.log(
    `Documentation governance passed: ${result.managedDocuments} managed metadata records, ${result.currentManagedDocuments} current managed documents, ${result.markdownDocuments} tracked Markdown documents, ${externalFactResult.facts} action-sensitive external facts governed (${externalFactResult.reverifyBeforeAction} reverify-before-action), ${componentSourceResult.sources} external component sources governed (${componentSourceResult.activeSources} active), ${archiveResult.catalogedArchives} root archive snapshots cataloged.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
