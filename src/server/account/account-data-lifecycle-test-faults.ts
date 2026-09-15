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

export function installAccountDataLifecycleAuthDeleteTestFault() {
  if (!configuredFaults.has("auth-delete")) return;
  const originalFetch = globalThis.fetch;
  if ((originalFetch as typeof originalFetch & { __renderlabAccountLifecycleWrapped?: boolean }).__renderlabAccountLifecycleWrapped) {
    return;
  }

  const wrappedFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    const method = String(init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
    if (method === "DELETE" && /\/auth\/v1\/admin\/users\/[^/?]+(?:\?|$)/.test(url)) {
      injectAccountDataLifecycleTestFault("auth-delete");
    }
    return originalFetch(input, init);
  };

  (wrappedFetch as typeof wrappedFetch & { __renderlabAccountLifecycleWrapped?: boolean }).__renderlabAccountLifecycleWrapped = true;
  globalThis.fetch = wrappedFetch;
}
