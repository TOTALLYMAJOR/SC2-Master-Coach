function priorityRows(state) {
  const rows = [];
  if (!state.recent.length) rows.push(["Import one replay", "Establish your first evidence-backed baseline."]);
  else rows.push(["Review the latest replay", "Locate the earliest meaningful divergence before adding more advice."]);
  if (!state.players.length) rows.push(["Add a player reference pack", "Comparisons remain unavailable until a local reference exists."]);
  else rows.push(["Choose one master reference", "Keep comparison scoped to a compatible race, matchup, and patch."]);
  rows.push(["Keep evidence current", "Old observations and incompatible patches must not silently blend."]);
  return rows.slice(0, 3);
}

function gameLabel(game) {
  const players = (game.players || []).map((player) => player.name || player.display_name).filter(Boolean);
  return players.length ? players.join(" vs ") : game.display_name || game.source_filename || "Analyzed replay";
}

export async function render({ root, app }) {
  await app.refreshSummary();
  const { status, recent, players, packs } = app.state;
  const priorities = priorityRows(app.state);
  const recentRows = recent.slice(0, 6);
  const featuredPlayers = players.slice(0, 4);

  root.innerHTML = `
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="eyebrow">Master Intel home</span>
        <h1>Turn local replays into evidence you can inspect.</h1>
        <p>The product now begins with replay intelligence, verified player references, and improvement priorities—not the live coaching dashboard.</p>
        <div class="button-row" style="margin-top:22px">
          <button class="button primary" id="homeImportReplay">Import replay</button>
          <button class="button secondary" id="homeImportPack">Import master-player pack</button>
          <button class="button secondary" id="homeInstallDemo">Explore bundled demo</button>
        </div>
      </div>
      <aside class="hero-side" aria-label="Local intelligence summary">
        <div class="metric-stack">
          <div class="metric-row"><strong>${Number(status?.replay_count || 0)}</strong><span>locally analyzed games</span></div>
          <div class="metric-row"><strong>${Number(status?.player_count || 0)}</strong><span>player records available</span></div>
          <div class="metric-row"><strong>${status?.offline_only ? "OFF" : "?"}</strong><span>network dependency for core journeys</span></div>
        </div>
      </aside>
    </section>

    <section class="action-grid" aria-label="Primary actions">
      <button class="action-panel" id="actionReplay"><span class="action-number" aria-hidden="true">01</span><span><strong>Import replay</strong><span>Parse one .SC2Replay locally and store its evidence after restart.</span></span></button>
      <button class="action-panel" id="actionPack"><span class="action-number" aria-hidden="true">02</span><span><strong>Import player pack</strong><span>Validate identities, patch coverage, and provenance from a local file.</span></span></button>
      <a class="action-panel" href="#/players"><span class="action-number" aria-hidden="true">03</span><span><strong>Open player library</strong><span>Search local master records and inspect evidence coverage.</span></span></a>
    </section>

    <section class="summary-grid" aria-label="Data status">
      <article class="summary-card"><span>Recent games</span><strong>${recent.length}</strong><small>stored locally</small></article>
      <article class="summary-card"><span>Player packs</span><strong>${packs.length}</strong><small>automatic downloads disabled</small></article>
      <article class="summary-card"><span>Data freshness</span><strong style="font-size:18px">${app.safe(app.formatDate(status?.latest_local_data))}</strong><small>latest local import</small></article>
      <article class="summary-card"><span>Connectivity</span><strong style="color:var(--green)">Offline ready</strong><small>connect-src restricted to self</small></article>
    </section>

    <section class="content-grid">
      <article class="panel">
        <header class="panel-head"><div><h2>Recent analyzed games</h2><p>Open the stored report without reparsing the original replay.</p></div><button class="button secondary" id="recentImport">Import another</button></header>
        ${recentRows.length ? `<div class="list-stack">${recentRows.map((game) => `<div class="list-row"><a href="#/replay/${encodeURIComponent(game.case_id)}"><strong>${app.safe(gameLabel(game))}</strong><small>${app.safe(game.map || "Unknown map")} · ${app.safe(app.formatDuration(game.duration))} · ${app.safe(app.formatDate(game.imported_at))}</small></a><span class="badge good">Local</span></div>`).join("")}</div>` : `<div class="empty-state"><strong>No replay intelligence yet.</strong><p>Import one replay to create the first durable local case.</p><button class="button primary" id="emptyImportReplay">Import replay</button></div>`}
      </article>

      <article class="panel">
        <header class="panel-head"><div><h2>Your improvement priorities</h2><p>Priorities remain honest when evidence is missing.</p></div><a class="button secondary" href="#/practice">Practice</a></header>
        <div class="list-stack">${priorities.map((row, index) => `<div class="priority-row"><span class="priority-rank">${index + 1}</span><span><strong>${app.safe(row[0])}</strong><small>${app.safe(row[1])}</small></span></div>`).join("")}</div>
      </article>
    </section>

    <section class="panel">
      <header class="panel-head"><div><h2>Master-player library</h2><p>Every identity is explicitly verified, unverified, or synthetic. Names alone never establish professional identity.</p></div><a class="button secondary" href="#/players">View all players</a></header>
      ${featuredPlayers.length ? `<div class="card-grid">${featuredPlayers.map((player) => `<article class="player-card"><div class="badges"><span class="badge">${app.safe(player.race)}</span><span class="badge ${player.identity?.verified ? "good" : "warn"}">${app.safe(player.identity_label)}</span>${player.synthetic ? '<span class="badge warn">Synthetic</span>' : ""}</div><h2>${app.safe(player.display_name)}</h2><p>${app.safe(player.pack_title)} · ${app.safe((player.patch_coverage || []).join(", ") || "Patch coverage not declared")}</p><footer><span class="badge">${app.safe(player.identity_confidence)}</span><a class="button secondary" href="#/player/${encodeURIComponent(player.player_id)}">Open dossier</a></footer></article>`).join("")}</div>` : `<div class="empty-state"><strong>No player records are installed.</strong><p>Import a trusted pack or install the bundled synthetic demonstration.</p><div class="button-row" style="justify-content:center"><button class="button primary" id="emptyInstallDemo">Install demo</button><button class="button secondary" id="emptyImportPack">Import pack</button></div></div>`}
    </section>`;

  ["homeImportReplay", "actionReplay", "recentImport", "emptyImportReplay"].forEach((id) => root.querySelector(`#${id}`)?.addEventListener("click", app.chooseReplay));
  ["homeImportPack", "actionPack", "emptyImportPack"].forEach((id) => root.querySelector(`#${id}`)?.addEventListener("click", app.choosePlayerPack));
  ["homeInstallDemo", "emptyInstallDemo"].forEach((id) => root.querySelector(`#${id}`)?.addEventListener("click", app.installDemo));
}
