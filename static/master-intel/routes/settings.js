function bytesLabel(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

export async function render({ root, app }) {
  await app.refreshSummary();
  const policy = await app.api.offlinePolicy();
  const { status, packs } = app.state;

  root.innerHTML = `
    <section class="route-head">
      <div><span class="eyebrow">Settings and local data</span><h1>Control the files, not a cloud account.</h1><p>Automatic update checks are disabled. Core journeys use local replay files, local player packs, and the bundled local service.</p></div>
      <a class="button secondary" href="/hud">Open legacy Combat HUD</a>
    </section>

    <section class="status-grid">
      <article class="settings-card">
        <h2>Offline guarantee</h2>
        <p>${app.safe(policy.guarantee)}</p>
        <div class="list-stack">
          <div class="evidence-row"><div><strong>Network required</strong><small>Core replay and player-library journeys</small></div><span class="badge good">No</span></div>
          <div class="evidence-row"><div><strong>Automatic update checks</strong><small>No background GitHub or release request</small></div><span class="badge good">Off</span></div>
          <div class="evidence-row"><div><strong>Browser connection policy</strong><small>Content Security Policy connect-src</small></div><span class="badge good">Self only</span></div>
        </div>
      </article>

      <article class="settings-card">
        <h2>Manual update workflow</h2>
        <p>Obtain a trusted package separately, inspect it here, close the app, then run the installer or replace the portable folder.</p>
        <div class="field"><label for="manualUpdatePackage">Local installer or portable ZIP</label><input id="manualUpdatePackage" type="file" accept=".exe,.zip"></div>
        <div id="manualUpdateResult" class="notice warn" style="margin-top:12px">No package selected. The application will not download one automatically.</div>
        <ol>${policy.manual_update_steps.map((step) => `<li>${app.safe(step)}</li>`).join("")}</ol>
      </article>
    </section>

    <section class="status-grid" style="margin-top:16px">
      <article class="settings-card">
        <h2>Local storage</h2>
        <div class="list-stack">
          <div class="evidence-row"><div><strong>Replay workspace</strong><small>${app.safe(status?.workspace || "Unavailable")}</small></div><span class="badge">${Number(status?.replay_count || 0)} games</span></div>
          <div class="evidence-row"><div><strong>Application data</strong><small>${app.safe(status?.data_root || "Unavailable")}</small></div><span class="badge">${Number(status?.pack_count || 0)} packs</span></div>
          <div class="evidence-row"><div><strong>Last local data change</strong><small>${app.safe(app.formatDate(status?.latest_local_data))}</small></div><span class="badge good">Local</span></div>
        </div>
        <div class="button-row" style="margin-top:15px"><button class="button secondary" id="resetOnboarding">Reset onboarding</button><button class="button danger" id="clearUiState">Clear UI preferences</button></div>
      </article>

      <article class="settings-card">
        <h2>Imported player packs</h2>
        ${packs.length ? `<div class="list-stack">${packs.map((pack) => `
          <div class="list-row"><div><strong>${app.safe(pack.title)}</strong><small>${app.safe(pack.publisher)} · ${pack.player_count} players · ${pack.synthetic ? "synthetic" : "local"}</small></div><button class="button danger" data-remove-pack="${app.safe(pack.pack_id)}">Remove</button></div>`).join("")}</div>` : '<div class="empty-state"><strong>No player packs installed.</strong><p>Import one from the Home or Players screen.</p></div>'}
      </article>
    </section>

    <section class="settings-card" style="margin-top:16px">
      <h2>Data-management roadmap</h2>
      <p>Backup, restore, per-replay deletion, derived-index rebuild, and storage-size accounting are defined for DATA-006. This Milestone 0 screen exposes current paths and safe pack removal without claiming those later tools are complete.</p>
      <div class="button-row"><a class="button secondary" href="#/home">Return home</a><a class="button secondary" href="/hud">Open legacy HUD</a></div>
    </section>`;

  const packageInput = root.querySelector("#manualUpdatePackage");
  const packageResult = root.querySelector("#manualUpdateResult");
  packageInput.addEventListener("change", () => {
    const file = packageInput.files?.[0];
    if (!file) return;
    const valid = /\.(exe|zip)$/i.test(file.name);
    packageResult.className = `notice ${valid ? "" : "danger"}`;
    packageResult.innerHTML = valid
      ? `<strong>Local package selected:</strong> ${app.safe(file.name)} · ${app.safe(bytesLabel(file.size))}. Close SC2 Master Coach before applying it. The file is not uploaded.`
      : `<strong>Unsupported package:</strong> select a trusted .exe installer or .zip portable package.`;
  });

  root.querySelector("#resetOnboarding").addEventListener("click", app.resetOnboarding);
  root.querySelector("#clearUiState").addEventListener("click", () => {
    const preserved = new Set([app.onboardingKey]);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sc2-master-coach:") && !preserved.has(key)) localStorage.removeItem(key);
    });
    app.toast("Local UI preferences cleared. Replay and pack files were not deleted.");
  });

  root.querySelectorAll("[data-remove-pack]").forEach((button) => {
    button.addEventListener("click", async () => {
      const packId = button.dataset.removePack;
      try {
        await app.api.removePack(packId);
        await app.refreshSummary();
        app.toast("Player pack removed locally.");
        await render({ root, app });
      } catch (error) {
        app.showMessage("Player pack could not be removed", `<p>${app.safe(error.message)}</p>`);
      }
    });
  });
}
