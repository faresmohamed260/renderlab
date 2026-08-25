const parse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.detail || payload;
    throw new Error(detail.message || "Studio request failed.");
  }
  return payload;
};

const apiBase = `${import.meta.env.VITE_RENDERLAB_API_BASE || ""}${import.meta.env.VITE_RENDERLAB_API_PREFIX || "/studio"}`;
const path = (suffix) => `${apiBase}${suffix}`;

export const studioApi = {
  eventsUrl: () => path("/events"),
  runtime: () => fetch(path("/runtime")).then(parse),
  workspace: () => fetch(path("/comfyui/workspace")).then(parse),
  workflows: () => fetch(path("/workflows")).then(parse),
  models: () => fetch(path("/models")).then(parse),
  sessions: () => fetch(path("/sessions")).then(parse),
  createSession: (name = "Untitled exploration") => fetch(path("/sessions"), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
  }).then(parse),
  session: (id) => fetch(path(`/sessions/${id}`)).then(parse),
  renameSession: (id, name) => fetch(path(`/sessions/${id}`), {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
  }).then(parse),
  generate: (request) => fetch(path("/generations"), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
  }).then(parse),
  upload: (file) => fetch(path(`/assets?filename=${encodeURIComponent(file.name)}`), {
    method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file,
  }).then(parse),
  cancel: (id) => fetch(path(`/generations/${id}/cancel`), { method: "POST" }).then(parse),
  queue: () => fetch(path("/queue")).then(parse),
  library: (query = "") => fetch(path(`/library${query}`)).then(parse),
  favorite: (id, favorite) => fetch(path(`/assets/${id}`), {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ favorite }),
  }).then(parse),
  providerSettings: () => fetch(path("/settings/providers")).then(parse),
  saveProviderKey: (id, apiKey) => fetch(path(`/settings/providers/${id}`), {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: apiKey }),
  }).then(parse),
  removeProviderKey: (id) => fetch(path(`/settings/providers/${id}`), { method: "DELETE" }).then(parse),
  modelDownloads: () => fetch(path("/model-downloads")).then(parse),
  startModelDownload: (request) => fetch(path("/model-downloads"), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
  }).then(parse),
  cancelModelDownload: (id) => fetch(path(`/model-downloads/${id}/cancel`), { method: "POST" }).then(parse),
  retryModelDownload: (id) => fetch(path(`/model-downloads/${id}/retry`), { method: "POST" }).then(parse),
};
