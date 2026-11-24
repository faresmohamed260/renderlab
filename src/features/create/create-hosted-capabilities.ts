/**
 * Client projection of the existing GenerationCapabilities response.
 * Unadvertised features remain false; this is not a new server capability.
 */
export type HostedCreateCapabilities = {
  ready: boolean;
  manualVgl: boolean;
  mask: boolean;
  autoVglAdvertised: boolean;
  inspiration: boolean;
  multiOutput: boolean;
  negativeConditioning: boolean;
  generatedVglNotice: string;
};

export function readHostedCreateCapabilities(value: unknown): HostedCreateCapabilities {
  const flags = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const ready = flags.available === true && flags.fiboAvailable === true;
  const autoVglAdvertised = ready && flags.fiboAutoVglAvailable === true;
  return {
    ready,
    manualVgl: ready,
    mask: ready && flags.fiboMaskAvailable === true,
    autoVglAdvertised,
    inspiration: false,
    multiOutput: false,
    negativeConditioning: false,
    // The server may accept autoVgl, but the workspace does not expose
    // generated sidecar provenance through the public result contract.
    generatedVglNotice: autoVglAdvertised
      ? "Generated VGL is advertised by the server but not available in this workspace. Enter manual JSON instead."
      : "Generated VGL is unavailable. Enter manual JSON instead.",
  };
}

export async function fetchHostedCreateCapabilities(signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const response = await fetcher("/api/generation/jobs", { cache: "no-store", signal });
  if (!response.ok) throw new Error("Could not verify generation availability.");
  return readHostedCreateCapabilities(await response.json());
}

/** Suppress the browser's native file navigation without accepting a source. */
export function rejectUnavailableInspirationDrop(event: Pick<DragEvent, "dataTransfer" | "preventDefault">) {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "none";
}
