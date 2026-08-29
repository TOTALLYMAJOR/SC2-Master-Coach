function bytesLabel(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

export async function render({ root, app }) {
  await app.refreshSummary();
  let policy = null;
  let policyError = null;
  try { policy = await app.api.offlinePolicy(); }
  catch (error) { policyError = error; }
  const { status, packs } = app.state;
  const statusKnown = app.state.loads.status.hasValue;
  const packsKnown = app.state.loads.packs.hasValue;

  root.innerHTML = `
    <section class="route-head">
      <div><span class="eyebrow">Settings and local data</span><h1>Control the files, not a cloud account.</h1><p>Automatic update checks are disabled. Core journeys use local replay files, local player packs, and the bundled local service.</p></div>
      <a class="button secondary" href="/hud">Open guided execution</a>
    </section>

    ${app.resourceIssueMarkup(["status", "packs"])}
    ${policyError ? '<section class="notice danger resource-issue" role="alert"><strong>Offline-policy details could not be read.</strong> Settings and local recovery tools remain available. <button class="button secondary" id="policyRetry">Retry policy</button></section>' : ""}

    <section class="status-grid">
      <article class="settings-card">
        <h2>Offline guarantee</h2>
        <p>${policy ? app.safe(policy.guarantee) : "The policy response is unavailable. The interface will not infer a guarantee from a failed request."}</p>
        <div class="list-stack">
          <div class="evidence-row"><div><strong>Network required</strong><small>Core replay and player-library journeys</small></div><span class="badge ${policy ? "good" : "danger"}">${policy ? (policy.network_required ? "Yes" : "No") : "Unknown"}</span></div>
          <div class="evidence-row"><div><strong>Automatic update checks</strong><small>No background release request</small></div><span class="badge ${policy ? "good" : "danger"}">${policy ? (policy.automatic_update_checks ? "On" : "Off") : "Unknown"}</span></div>
          <div class="evidence-row"><div><strong>Browser connection policy</strong><small>Content Security Policy connect-src</small></div><span class="badge ${policy ? "good" : "danger"}">${policy ? (policy.connect_policy === "self_only" ? "Self only" : "Review") : "Unknown"}</span></div>
        </div>
      </article>

      <article class="settings-card">
        <h2>Manual update workflow</h2>
        <p>Obtain a trusted package separately, review its local filename, type, and size here, then close the app before installation. This screen does not verify publisher signatures or authenticity.</p>
        <div class="field"><label for="manualUpdatePackage">Local installer or portable ZIP</label><input id="manualUpdatePackage" type="file" accept=".exe,.zip"></div>
        <div id="manualUpdateResult" class="notice warn" style="margin-top:12px">No package selected. The application will not download one automatically.</div>
        <ol>${(policy?.manual_update_steps || ["Obtain a trusted package outside the application.", "Close SC2 Master Coach before applying an update.", "Back up both local data folders before a major upgrade."]).map((step) => `<li>${app.safe(step)}</li>`).join("")}</ol>
      </article>
    </section>

    <section class="status-grid" style="margin-top:16px">
      <article class="settings-card">
        <h2>Local storage</h2>
        <div class="list-stack">
          <div class="evidence-row"><div><strong>Replay workspace</strong><small>${statusKnown ? app.safe(status?.workspace) : "Status unavailable — path not confirmed"}</small></div><span class="badge">${statusKnown ? `${Number(status?.replay_count || 0)} games` : "—"}</span></div>
          <div class="evidence-row"><div><strong>Application data</strong><small>${statusKnown ? app.safe(status?.data_root) : "Status unavailable — path not confirmed"}</small></div><span class="badge">${statusKnown ? `${Number(status?.pack_count || 0)} packs` : "—"}</span></div>
          <div class="evidence-row"><div><strong>Last local data change</strong><small>${statusKnown ? app.safe(app.formatDate(status?.latest_local_data)) : "Unavailable"}</small></div><span class="badge ${statusKnown ? "good" : "danger"}">${statusKnown ? "Local" : "Unknown"}</span></div>
        </div>
        <div class="button-row" style="margin-top:15px"><button class="button secondary" id="openReplayStorage" ${statusKnown ? "" : "disabled"}>Open replay library</button><button class="button secondary" id="openAppStorage" ${statusKnown ? "" : "disabled"}>Open app data</button></div>
        <div class="button-row" style="margin-top:10px"><button class="button secondary" id="resetOnboarding">Reset onboarding</button><button class="button danger" id="clearUiState">Clear UI preferences</button></div>
      </article>

      <article class="settings-card">
        <h2>Imported player packs</h2>
        ${packs.length ? `<div class="list-stack">${packs.map((pack) => `
          <div class="list-row"><div><strong>${app.safe(pack.title)}</strong><small>${app.safe(pack.publisher)} · ${pack.player_count} players · ${pack.synthetic ? "synthetic" : "local"}</small></div><button class="button danger" data-remove-pack="${app.safe(pack.pack_id)}" data-pack-title="${app.safe(pack.title)}" data-player-count="${Number(pack.player_count || 0)}">Remove from library</button></div>`).join("")}</div>` : packsKnown ? '<div class="empty-state"><strong>No player packs installed.</strong><p>Import one from the Home or Players screen.</p></div>' : '<div class="notice danger"><strong>Pack list unavailable — not empty.</strong><p>Retry local data before importing or removing packs.</p></div>'}
      </article>
    </section>

    <section class="status-grid" style="margin-top:16px">
      <article class="settings-card">
        <h2>System check and support</h2>
        <p>Create a sanitized report you can attach to a support request. It stays local until you choose to share it and excludes paths, replay names, player identities, and raw audio.</p>
        <div class="button-row"><button class="button primary" id="downloadSupportReport">Download support report</button><button class="button secondary" id="retrySystemCheck">Run system check</button></div>
        <p class="notice" id="supportStatus" role="status" aria-live="polite" style="margin-top:14px">Core replay coaching and optional tools are reported separately so an unavailable optional tool does not imply the whole app is broken.</p>
      </article>
      <article class="settings-card">
        <h2>Back up safely</h2>
        <p>Manual folder backup is the supported recovery method in this build. Automated restore has not been verified.</p>
        <ol><li>Open both local-data folders above.</li><li>Leave the folder windows open, then close SC2 Master Coach.</li><li>Copy both folders to your backup location.</li></ol>
        <p class="notice warn"><strong>Restore boundary:</strong> close the app, copy a same-version backup back to the displayed locations, relaunch, and run System check. Browser session history may be stored separately and is not claimed as part of this backup.</p>
      </article>
    </section>`;

  const packageInput = root.querySelector("#manualUpdatePackage");
  const packageResult = root.querySelector("#manualUpdateResult");
  packageInput.addEventListener("change", () => {
    const file = packageInput.files?.[0];
    if (!file) return;
    const valid = /\.(exe|zip)$/i.test(file.name);
    packageResult.className = `notice ${valid ? "" : "danger"}`;
    packageResult.innerHTML = valid
      ? `<strong>Local package metadata:</strong> ${app.safe(file.name)} · ${app.safe(bytesLabel(file.size))}. Type and size look eligible; publisher authenticity is not verified. Close SC2 Master Coach before applying it. The file is not uploaded.`
      : `<strong>Unsupported package:</strong> select a trusted .exe installer or .zip portable package.`;
  });

  root.querySelector("#resetOnboarding").addEventListener("click", app.resetOnboarding);
  root.querySelector("#clearUiState").addEventListener("click", () => {
    const uiPreferenceKeys = ["sc2-master-coach:v110-hud:v1", "sc2-master-coach:strategy-ui:v1", "sc2-master-coach:strategic-os-ui:v1"];
    uiPreferenceKeys.forEach((key) => localStorage.removeItem(key));
    app.toast("Interface preferences cleared. Player identity, replay selection, drills, progression, history, interrupted sessions, and receipts were preserved.");
  });

  app.wireResourceRetry(root);
  root.querySelector("#policyRetry")?.addEventListener("click", () => render({ root, app }));
  root.querySelector("#retrySystemCheck")?.addEventListener("click", async () => {
    const button = root.querySelector("#retrySystemCheck");
    const supportStatus = root.querySelector("#supportStatus");
    button.disabled = true;
    supportStatus.textContent = "Running local checks…";
    try {
      const report = await app.api.supportReport();
      const core = Object.entries(report.core || {});
      const coreUnavailable = core.filter(([, value]) => (typeof value === "string" ? value : value?.status) !== "ready").map(([name]) => name.replaceAll("_", " "));
      const optionalUnavailable = Object.entries(report.optional || {}).filter(([, value]) => value?.status !== "ready").map(([name]) => name.replaceAll("_", " "));
      supportStatus.className = `notice ${coreUnavailable.length ? "danger" : optionalUnavailable.length ? "warn" : "good"}`;
      supportStatus.innerHTML = coreUnavailable.length
        ? `<strong>Core check needs attention:</strong> ${app.safe(coreUnavailable.join(", "))}. Optional tools: ${app.safe(optionalUnavailable.join(", ") || "ready")}.`
        : `<strong>Core local service ready.</strong> ${optionalUnavailable.length ? `Optional tools unavailable: ${app.safe(optionalUnavailable.join(", "))}. Manual fallbacks remain available.` : "Optional tools ready."}`;
    } catch (error) {
      supportStatus.className = "notice danger";
      supportStatus.textContent = "System check could not be completed. No diagnostic data was uploaded.";
    } finally { button.disabled = false; button.focus({ preventScroll: true }); }
  });

  const openStorage = async (target) => {
    try { await app.api.openStorage(target); app.toast(`${target === "replays" ? "Replay library" : "Application data"} opened.`); }
    catch (error) { app.showMessage("Folder could not be opened", `<p>${app.safe(error.message)}</p><p>Copy the displayed path and open it manually.</p>`, "Local recovery"); }
  };
  root.querySelector("#openReplayStorage")?.addEventListener("click", () => openStorage("replays"));
  root.querySelector("#openAppStorage")?.addEventListener("click", () => openStorage("application"));

  root.querySelector("#downloadSupportReport")?.addEventListener("click", async () => {
    const button = root.querySelector("#downloadSupportReport");
    const supportStatus = root.querySelector("#supportStatus");
    button.disabled = true;
    supportStatus.textContent = "Running local checks…";
    try {
      const report = await app.api.supportReport();
      const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sc2-master-coach-support-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      supportStatus.textContent = "Support report downloaded locally. Nothing was uploaded.";
    } catch (error) {
      supportStatus.textContent = "Support report could not be generated. No diagnostic data was uploaded.";
      app.showMessage("Support report unavailable", `<p>${app.safe(error.message)}</p>`, "Local support");
    } finally { button.disabled = false; }
  });

  root.querySelectorAll("[data-remove-pack]").forEach((button) => {
    button.addEventListener("click", async () => {
      const packId = button.dataset.removePack;
      const confirmed = window.confirm(`Remove ${button.dataset.packTitle} from the local library?\n\nThis removes the imported copy and ${button.dataset.playerCount} player record(s). Replays, active drills, and session receipts are preserved. Re-import the original pack file to recover it.`);
      if (!confirmed) return;
      try {
        button.disabled = true;
        await app.api.removePack(packId);
        app.state.packs = app.state.packs.filter((pack) => String(pack.pack_id) !== String(packId));
        app.toast("Player pack removed locally.");
        await render({ root, app });
      } catch (error) {
        button.disabled = false;
        app.showMessage("Player pack could not be removed", `<p>${app.safe(error.message)}</p>`);
      }
    });
  });
}
