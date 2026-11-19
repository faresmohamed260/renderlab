export function findImmutableActionRefProblems(files) {
  const problems = [];

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const usesMatch = line.match(/\buses:\s*([^\s#]+)/);
      if (!usesMatch) continue;

      const actionRef = usesMatch[1];
      if (actionRef.startsWith("./") || actionRef.startsWith("docker://")) continue;

      const atIndex = actionRef.lastIndexOf("@");
      const revision = atIndex >= 0 ? actionRef.slice(atIndex + 1) : "";
      if (!/^[0-9a-f]{40}$/i.test(revision)) {
        problems.push(`${file.path}:${index + 1} uses a non-immutable external action ref: ${actionRef}`);
      }
    }
  }

  return problems;
}
