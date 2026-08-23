function optionPlayers(players, selected, app) {
  return players.map((player) => `<option value="${app.safe(player.player_id)}" ${player.player_id === selected ? "selected" : ""}>${app.safe(player.display_name)} · ${app.safe(player.race)} · ${app.safe(player.identity_label)}</option>`).join("");
}

function optionGames(games, app) {
  return games.map((game) => `<option value="${app.safe(game.case_id)}">${app.safe(game.display_name || game.source_filename || game.case_id)} · ${app.safe(game.map || "Unknown map")}</option>`).join("");
}

export async function render({ root, route, app }) {
  await app.refreshSummary();
  const query = route.query || new URLSearchParams();
  const selectedPlayer = query.get("player") || app.state.players[0]?.player_id || "";
  const hasPlayers = app.state.players.length > 0;
  const hasGames = app.state.recent.length > 0;

  root.innerHTML = `
    <section class="route-head">
      <div><span class="eyebrow">You vs. Master</span><h1>Compare only compatible evidence.</h1><p>The comparison gate requires the same race, matchup, and compatible patch. Missing values remain unavailable rather than estimated.</p></div>
      <div class="button-row"><button class="button secondary" id="compareImportReplay">Import replay</button><button class="button secondary" id="compareImportPack">Import player pack</button></div>
    </section>

    <section class="compare-card">
      <div class="filter-row">
        <div class="field grow"><label for="compareReplay">Your replay</label><select id="compareReplay" ${hasGames ? "" : "disabled"}>${hasGames ? optionGames(app.state.recent, app) : '<option>No replay available</option>'}</select></div>
        <div class="field grow"><label for="comparePlayer">Master reference</label><select id="comparePlayer" ${hasPlayers ? "" : "disabled"}>${hasPlayers ? optionPlayers(app.state.players, selectedPlayer, app) : '<option>No player pack available</option>'}</select></div>
        <button class="button primary" id="runComparison" ${hasGames && hasPlayers ? "" : "disabled"}>Check compatibility</button>
      </div>
      ${!hasGames || !hasPlayers ? `<div class="empty-state"><strong>Two local evidence sources are required.</strong><p>${!hasGames ? "Import one of your replays. " : ""}${!hasPlayers ? "Import a player pack or install the synthetic demo." : ""}</p></div>` : '<div id="comparisonResult" class="notice">Choose a replay and reference, then check compatibility.</div>'}
    </section>

    <section class="content-grid" style="margin-top:16px">
      <article class="compare-card"><h2>Comparison contract</h2><div class="list-stack">
        <div class="evidence-row"><div><strong>Race</strong><small>Must match the player role being compared.</small></div><span class="badge">Required</span></div>
        <div class="evidence-row"><div><strong>Matchup</strong><small>Must be the same opposing race and mode.</small></div><span class="badge">Required</span></div>
        <div class="evidence-row"><div><strong>Patch compatibility</strong><small>Incompatible balance eras are never blended silently.</small></div><span class="badge">Required</span></div>
      </div></article>
      <article class="compare-card"><h2>Planned comparison dimensions</h2><p>Opening timings, worker production, supply management, expansion timing, production capacity, upgrades, composition, and engagement timing.</p><p class="notice warn">Milestone 0 establishes the route and evidence gate. Calculation arrives after DATA-001 through INTEL-003.</p></article>
    </section>`;

  root.querySelector("#compareImportReplay")?.addEventListener("click", app.chooseReplay);
  root.querySelector("#compareImportPack")?.addEventListener("click", app.choosePlayerPack);
  root.querySelector("#runComparison")?.addEventListener("click", () => {
    const playerId = root.querySelector("#comparePlayer").value;
    const gameId = root.querySelector("#compareReplay").value;
    const player = app.state.players.find((row) => row.player_id === playerId);
    const game = app.state.recent.find((row) => row.case_id === gameId);
    const declaredPatches = player?.patch_coverage || [];
    const compatible = declaredPatches.length === 0 ? null : declaredPatches.includes(game?.patch) || declaredPatches.includes(game?.game_version);
    const result = root.querySelector("#comparisonResult");
    result.className = `notice ${compatible === false ? "danger" : "warn"}`;
    result.innerHTML = compatible === false
      ? `<strong>Blocked:</strong> ${app.safe(player.display_name)} does not declare compatible patch coverage for this replay.`
      : `<strong>Evidence gate reached.</strong> The local player and replay are selected, but this Milestone 0 route does not fabricate timing comparisons before the normalized schema exists.`;
  });
}
