function renderCards(players, app) {
  if (!players.length) {
    return `<div class="empty-state"><strong>No matching player records.</strong><p>Import a local player pack or install the bundled synthetic demo.</p><div class="button-row" style="justify-content:center"><button class="button primary" id="playersInstallDemo">Install demo</button><button class="button secondary" id="playersImportPack">Import pack</button></div></div>`;
  }
  return `<div class="card-grid">${players.map((player) => {
    const coverage = player.coverage || {};
    const replayCount = Number(coverage.replay_count || coverage.replays || 0);
    const matchups = Array.isArray(coverage.matchups) ? coverage.matchups.join(", ") : "Not declared";
    return `<article class="player-card" data-player-card data-name="${app.safe(player.display_name.toLowerCase())}" data-race="${app.safe(player.race)}" data-confidence="${app.safe(player.identity_confidence)}" data-pack="${app.safe(player.pack_title.toLowerCase())}">
      <div class="badges"><span class="badge">${app.safe(player.race)}</span><span class="badge ${player.identity?.verified ? "good" : "warn"}">${app.safe(player.identity_label)}</span>${player.synthetic ? '<span class="badge warn">Synthetic</span>' : ""}</div>
      <h2>${app.safe(player.display_name)}</h2>
      <p>${app.safe(player.pack_title)} · patch ${app.safe((player.patch_coverage || []).join(", ") || "not declared")}</p>
      <div class="stat-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <div class="stat-cell"><span class="stat-label">Replays</span><strong>${replayCount || "—"}</strong></div>
        <div class="stat-cell"><span class="stat-label">Matchups</span><strong style="font-size:15px">${app.safe(matchups)}</strong></div>
      </div>
      <footer><span class="badge">${app.safe(player.identity_confidence)}</span><a class="button secondary" href="#/player/${encodeURIComponent(player.player_id)}">Open dossier</a></footer>
    </article>`;
  }).join("")}</div>`;
}

export async function render({ root, app }) {
  await app.refreshSummary();
  const allPlayers = app.state.players;
  root.innerHTML = `
    <section class="route-head">
      <div><span class="eyebrow">Local master-player library</span><h1>Search evidence coverage before trusting a comparison.</h1><p>Identity, patch, matchup, replay count, and provenance remain visible. A replay name alone never verifies a professional player.</p></div>
      <div class="button-row"><button class="button primary" id="playersImport">Import player pack</button><button class="button secondary" id="playersDemo">Install demo</button></div>
    </section>
    <section class="panel">
      <div class="filter-row" role="search" aria-label="Player filters">
        <div class="field grow"><label for="playerSearch">Search player or pack</label><input id="playerSearch" type="search" placeholder="Name, alias, or pack"></div>
        <div class="field"><label for="raceFilter">Race</label><select id="raceFilter"><option value="">All races</option><option>Protoss</option><option>Terran</option><option>Zerg</option><option>Random</option></select></div>
        <div class="field"><label for="confidenceFilter">Identity confidence</label><select id="confidenceFilter"><option value="">All confidence</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option><option value="unverified">Unverified</option></select></div>
      </div>
      <div id="playerResults" aria-live="polite">${renderCards(allPlayers, app)}</div>
    </section>`;

  const search = root.querySelector("#playerSearch");
  const race = root.querySelector("#raceFilter");
  const confidence = root.querySelector("#confidenceFilter");
  const results = root.querySelector("#playerResults");

  const filter = () => {
    const term = search.value.trim().toLowerCase();
    const raceValue = race.value;
    const confidenceValue = confidence.value;
    const filtered = allPlayers.filter((player) => {
      const aliases = (player.aliases || []).join(" ").toLowerCase();
      const haystack = `${player.display_name} ${aliases} ${player.pack_title}`.toLowerCase();
      return (!term || haystack.includes(term)) && (!raceValue || player.race === raceValue) && (!confidenceValue || player.identity_confidence === confidenceValue);
    });
    results.innerHTML = renderCards(filtered, app);
    results.querySelector("#playersInstallDemo")?.addEventListener("click", app.installDemo);
    results.querySelector("#playersImportPack")?.addEventListener("click", app.choosePlayerPack);
  };

  search.addEventListener("input", filter);
  race.addEventListener("change", filter);
  confidence.addEventListener("change", filter);
  root.querySelector("#playersImport").addEventListener("click", app.choosePlayerPack);
  root.querySelector("#playersDemo").addEventListener("click", app.installDemo);
  root.querySelector("#playersInstallDemo")?.addEventListener("click", app.installDemo);
  root.querySelector("#playersImportPack")?.addEventListener("click", app.choosePlayerPack);
}
