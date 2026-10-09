import { verifyDocsGovernance } from "./lib/docs-governance.mjs";

try {
  const result = await verifyDocsGovernance();
  console.log(
    `Documentation governance passed: ${result.managedDocuments} managed metadata records, ${result.currentManagedDocuments} current managed documents, ${result.markdownDocuments} tracked Markdown documents.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
