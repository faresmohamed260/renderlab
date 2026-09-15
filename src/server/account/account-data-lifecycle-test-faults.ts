type AccountDataLifecycleFault =
  | "export-write"
  | "r2-delete"
  | "database-finalize"
  | "auth-delete";

const configuredFaults = new Set(
  (process.env.RENDERLAB_TEST_ACCOUNT_DATA_LIFECYCLE_FAULTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

const consumedFaults = new Set<string>();

export function injectAccountDataLifecycleTestFault(phase: AccountDataLifecycleFault) {
  if (!configuredFaults.has(phase) || consumedFaults.has(phase)) return;
  consumedFaults.add(phase);
  throw new Error(`account_test_fault_${phase.replaceAll("-", "_")}`);
}
