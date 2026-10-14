const EXPECTED_MODAL_UNIVERSE = Array.from(
  { length: 47 },
  (_, index) => `modal-${String(index + 1).padStart(2, "0")}`,
);

function sameArray(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    JSON.stringify(left) === JSON.stringify(right);
}

function hasExactUniverse(renderLabAccounts, sagaAccounts) {
  if (!Array.isArray(renderLabAccounts) || !Array.isArray(sagaAccounts)) return false;
  const combined = [...renderLabAccounts, ...sagaAccounts].sort();
  return JSON.stringify(combined) === JSON.stringify([...EXPECTED_MODAL_UNIVERSE].sort());
}

export function findCrossRepoModalOwnershipProblems({ renderLabManifest, sagaManifest }) {
  const problems = [];
  if (renderLabManifest?.project !== "renderlab") {
    problems.push("RenderLab ownership manifest must declare project=renderlab.");
  }
  if (sagaManifest?.project !== "saga") {
    problems.push("S.A.G.A. ownership manifest must declare project=saga.");
  }

  const renderLabOwned = renderLabManifest?.ownedAccountLabels;
  const renderLabSagaReservation = renderLabManifest?.reservedForOtherProjects?.saga;
  const sagaOwned = sagaManifest?.ownedAccountLabels;
  const sagaRenderLabReservation = sagaManifest?.reservedForOtherProjects?.renderlab;

  if (!sameArray(renderLabOwned, sagaRenderLabReservation)) {
    problems.push("RenderLab-owned accounts disagree with S.A.G.A.'s RenderLab reservation.");
  }
  if (!sameArray(renderLabSagaReservation, sagaOwned)) {
    problems.push("S.A.G.A.-owned accounts disagree with RenderLab's S.A.G.A. reservation.");
  }
  if (!hasExactUniverse(renderLabOwned, sagaOwned)) {
    problems.push("Combined cross-repository ownership must cover exactly modal-01 through modal-47 once.");
  }
  if (
    Array.isArray(renderLabOwned) && Array.isArray(sagaOwned) &&
    renderLabOwned.some((label) => sagaOwned.includes(label))
  ) {
    problems.push("Cross-repository Modal ownership overlaps.");
  }
  return problems;
}

export function assertCrossRepoModalOwnership(input) {
  const problems = findCrossRepoModalOwnershipProblems(input);
  if (problems.length > 0) {
    throw new Error(`Cross-repository Modal ownership verification failed:\n- ${problems.join("\n- ")}`);
  }
}

export const MODAL_ACCOUNT_UNIVERSE = Object.freeze([...EXPECTED_MODAL_UNIVERSE]);
