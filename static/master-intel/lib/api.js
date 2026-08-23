const JSON_HEADERS = { Accept: "application/json" };

async function request(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: { ...JSON_HEADERS, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    const message = body.error?.message || body.error || body.detail || `Local request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export const api = {
  status() { return request("/api/intel/status"); },
  recent(limit = 12) { return request(`/api/intel/recent?limit=${encodeURIComponent(limit)}`); },
  packs() { return request("/api/intel/player-packs"); },
  players() { return request("/api/intel/players"); },
  caseDetail(caseId) { return request(`/api/intel/cases/${encodeURIComponent(caseId)}`); },
  offlinePolicy() { return request("/api/intel/offline-policy"); },
  launchContext() { return request("/api/launch-context"); },
  async importReplay(file) {
    const form = new FormData();
    form.append("replay", file, file.name);
    const response = await fetch("/api/replay/analyze", { method: "POST", cache: "no-store", body: form, headers: { Accept: "application/json" } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      const error = new Error(body.error || body.detail || `Replay import failed (${response.status}).`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  },
  async importPlayerPack(file) {
    const form = new FormData();
    form.append("pack", file, file.name);
    return request("/api/intel/player-packs/import", { method: "POST", body: form });
  },
  installDemo() { return request("/api/intel/demo/install", { method: "POST" }); },
  removePack(packId) { return request(`/api/intel/player-packs/${encodeURIComponent(packId)}`, { method: "DELETE" }); },
};
