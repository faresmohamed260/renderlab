export type GenerationWorker = {
  id: string;
  ecosystem: "flux2-klein-9b" | "ltx25-redgraft" | "qwen-image-edit-2511";
  gatewayUrl: string;
  displayName: string;
  role: "primary" | "standby";
};

// Public routing metadata copied from the verified Saga worker registry.
// No credentials are stored here. RenderLab owns this registry going forward.
export const generationWorkers: GenerationWorker[] = [
  {
    id: "flux-primary-01",
    ecosystem: "flux2-klein-9b",
    gatewayUrl: "https://grimcircuit--saga-flux2-klein-gateway-web.modal.run",
    displayName: "FLUX.2 Klein 9B · Primary",
    role: "primary",
  },
  {
    id: "flux-standby-01",
    ecosystem: "flux2-klein-9b",
    gatewayUrl: "https://silentspecter67--saga-flux2-klein-gateway-web.modal.run",
    displayName: "FLUX.2 Klein 9B · Standby",
    role: "standby",
  },
  {
    id: "ltx-primary-01",
    ecosystem: "ltx25-redgraft",
    gatewayUrl: "https://dreadcipher67--saga-ltx25-gateway-web.modal.run",
    displayName: "REDGraft LTX 2.5 · Primary",
    role: "primary",
  },
  {
    id: "ltx-standby-01",
    ecosystem: "ltx25-redgraft",
    gatewayUrl: "https://blackzerox67--saga-ltx25-gateway-web.modal.run",
    displayName: "REDGraft LTX 2.5 · Standby",
    role: "standby",
  },
  {
    id: "qwen-primary-01",
    ecosystem: "qwen-image-edit-2511",
    gatewayUrl: "https://voidtrek--saga-qwen-image-edit-2511-gateway-web.modal.run",
    displayName: "Qwen Image Edit 2511 · Primary",
    role: "primary",
  },
  {
    id: "qwen-standby-01",
    ecosystem: "qwen-image-edit-2511",
    gatewayUrl: "https://nyxprotocol--saga-qwen-image-edit-2511-gateway-web.modal.run",
    displayName: "Qwen Image Edit 2511 · Standby",
    role: "standby",
  },
];

export function workersForEcosystem(ecosystem: GenerationWorker["ecosystem"]) {
  return generationWorkers
    .filter((worker) => worker.ecosystem === ecosystem)
    .sort((a, b) => (a.role === b.role ? a.id.localeCompare(b.id) : a.role === "primary" ? -1 : 1));
}

export function findWorker(workerId: string) {
  return generationWorkers.find((worker) => worker.id === workerId) ?? null;
}
