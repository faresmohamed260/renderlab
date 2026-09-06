export type GenerationWorker = {
  id: string;
  ecosystem: "flux2-klein-9b" | "ltx25-redgraft" | "qwen-image-edit-2511";
  gatewayUrl: string;
  displayName: string;
  role: "primary" | "standby";
  routingStatus: "active" | "disabled";
};

const testGatewayOverride = process.env.RENDERLAB_TEST_NATIVE_WORKER_OVERRIDE === "true"
  ? process.env.RENDERLAB_TEST_NATIVE_WORKER_GATEWAY_URL?.trim().replace(/\/$/, "") || null
  : null;

function gatewayUrl(productionUrl: string) {
  return testGatewayOverride || productionUrl;
}

// Public routing metadata copied from the verified Saga worker registry.
// No credentials are stored here. RenderLab owns this registry going forward.
// Disabled registrations remain resolvable for historical in-flight/job metadata,
// but new submissions only route through active entries.
// The explicit test-only override lets configured CI exercise native lifecycle
// semantics against a run-owned local worker without provider spend.
export const generationWorkers: GenerationWorker[] = [
  {
    id: "flux-primary-01",
    ecosystem: "flux2-klein-9b",
    gatewayUrl: gatewayUrl("https://grimcircuit--saga-flux2-klein-gateway-web.modal.run"),
    displayName: "FLUX.2 Klein 9B · Primary",
    role: "primary",
    routingStatus: "disabled",
  },
  {
    id: "flux-standby-01",
    ecosystem: "flux2-klein-9b",
    gatewayUrl: gatewayUrl("https://silentspecter67--saga-flux2-klein-gateway-web.modal.run"),
    displayName: "FLUX.2 Klein 9B · Standby",
    role: "standby",
    routingStatus: "active",
  },
  {
    id: "ltx-primary-01",
    ecosystem: "ltx25-redgraft",
    gatewayUrl: gatewayUrl("https://dreadcipher67--saga-ltx25-gateway-web.modal.run"),
    displayName: "REDGraft LTX 2.5 · Primary",
    role: "primary",
    routingStatus: "disabled",
  },
  {
    id: "ltx-standby-01",
    ecosystem: "ltx25-redgraft",
    gatewayUrl: gatewayUrl("https://blackzerox67--saga-ltx25-gateway-web.modal.run"),
    displayName: "REDGraft LTX 2.5 · Standby",
    role: "standby",
    routingStatus: "active",
  },
  {
    id: "qwen-primary-01",
    ecosystem: "qwen-image-edit-2511",
    gatewayUrl: gatewayUrl("https://voidtrek--saga-qwen-image-edit-2511-gateway-web.modal.run"),
    displayName: "Qwen Image Edit 2511 · Primary",
    role: "primary",
    routingStatus: "active",
  },
  {
    id: "qwen-standby-01",
    ecosystem: "qwen-image-edit-2511",
    gatewayUrl: gatewayUrl("https://nyxprotocol--saga-qwen-image-edit-2511-gateway-web.modal.run"),
    displayName: "Qwen Image Edit 2511 · Standby",
    role: "standby",
    routingStatus: "active",
  },
];

export function workersForEcosystem(ecosystem: GenerationWorker["ecosystem"]) {
  return generationWorkers
    .filter((worker) => worker.ecosystem === ecosystem && worker.routingStatus === "active")
    .sort((a, b) => (a.role === b.role ? a.id.localeCompare(b.id) : a.role === "primary" ? -1 : 1));
}

export function findWorker(workerId: string) {
  return generationWorkers.find((worker) => worker.id === workerId) ?? null;
}
