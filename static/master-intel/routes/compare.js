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
  const playersKnown = app.state.loads.players.hasValue;
  const gamesKnown = app.state.loads.recent.hasValue;
  const hasPlayers = app.state.players.length > 0;
  const hasGames = app.state.recent.length > 0;

  root.innerHTML = `
    <section class="route-head">
      <div><span class="eyebrow">You vs. reference</span><h1>Compare only compatible evidence.</h1><p>The readiness gate requires your selected replay identity plus the same race, matchup, and compatible patch. Missing values remain unavailable rather than estimated.</p></div>
      <div class="button-row"><button class="button secondary" id="compareImportReplay">Import replay</button><button class="button secondary" id="compareImportPack">Import player pack</button></div>
    </section>

    ${app.resourceIssueMarkup(["recent", "players"])}

    <section class="compare-card">
      <div class="filter-row">
        <div class="field grow"><label for="compareReplay">Your replay</label><select id="compareReplay" ${hasGames ? "" : "disabled"}>${hasGames ? optionGames(app.state.recent, app) : `<option>${gamesKnown ? "No replay available" : "Replay list unavailable"}</option>`}</select></div>
        <div class="field grow"><label for="comparePlayer">Player-pack reference</label><select id="comparePlayer" ${hasPlayers ? "" : "disabled"}>${hasPlayers ? optionPlayers(app.state.players, selectedPlayer, app) : `<option>${playersKnown ? "No player pack available" : "Reference library unavailable"}</option>`}</select></div>
        <button class="button primary" id="runComparison" ${hasGames && hasPlayers ? "" : "disabled"}>Check compatibility</button>
      </div>
      ${!gamesKnown || !playersKnown ? '<div class="notice danger"><strong>Compatibility cannot be checked while a source is unavailable.</strong><p>Retry local data. No evidence source is being treated as empty.</p></div>' : !hasGames || !hasPlayers ? `<div class="empty-state"><strong>Two local evidence sources are required.</strong><p>${!hasGames ? "Import one of your replays. " : ""}${!hasPlayers ? "Import a player pack or install the synthetic demo." : ""}</p></div>` : '<div id="comparisonResult" class="notice">Choose a replay and reference, then check compatibility.</div>'}
    </section>

    <section class="content-grid" style="margin-top:16px">
      <article class="compare-card"><h2>Comparison contract</h2><div class="list-stack">
        <div class="evidence-row"><div><strong>Race</strong><small>Must match the player role being compared.</small></div><span class="badge">Required</span></div>
        <div class="evidence-row"><div><strong>Matchup</strong><small>Must be the same opposing race and mode.</small></div><span class="badge">Required</span></div>
        <div class="evidence-row"><div><strong>Patch compatibility</strong><small>Incompatible balance eras are never blended silently.</small></div><span class="badge">Required</span></div>
      </div></article>
      <article class="compare-card"><h2>Comparison boundary</h2><p>Opening timings, worker production, supply management, expansion timing, production capacity, upgrades, composition, and engagement timing require normalized reference evidence.</p><p class="notice warn">Player-pack declarations can establish readiness only. This build does not fabricate a performance comparison or treat a synthetic record as master evidence.</p></article>
    </section>`;

  root.querySelector("#compareImportReplay")?.addEventListener("click", app.chooseReplay);
  root.querySelector("#compareImportPack")?.addEventListener("click", app.choosePlayerPack);
  app.wireResourceRetry(root);
  root.querySelector("#runComparison")?.addEventListener("click", async () => {
    const playerId = root.querySelector("#comparePlayer").value;
    const gameId = root.querySelector("#compareReplay").value;
    const player = app.state.players.find((row) => row.player_id === playerId);
    const game = app.state.recent.find((row) => row.case_id === gameId);
    const result = root.querySelector("#comparisonResult");
    result.className = "notice warn";
    result.innerHTML = "Checking local evidence declarations…";
    try {
      const detail = await app.api.caseDetail(gameId);
      const selectedPid = String(detail.selected_player_pid || "");
      const replayPlayer = (detail.analysis?.players || []).find((row) => String(row.pid) === selectedPid);
      const replayAnalysis = detail.analysis?.analysis_by_player?.[selectedPid] || {};
      const replayRace = replayPlayer?.play_race || replayPlayer?.race || "";
      const replayMatchup = replayAnalysis.matchup || game?.matchup || "";
      const declaredPatches = player?.patch_coverage || [];
      const declaredMatchups = player?.coverage?.matchups || [];
      const checks = [
        ["replay identity", Boolean(selectedPid)],
        ["race", Boolean(replayRace && player?.race && replayRace === player.race)],
        ["matchup", Boolean(replayMatchup && declaredMatchups.includes(replayMatchup))],
        ["patch", Boolean(declaredPatches.length && (declaredPatches.includes(game?.patch) || declaredPatches.includes(game?.game_version)))],
      ];
      const missing = checks.filter(([, pass]) => !pass).map(([label]) => label);
      result.className = `notice ${missing.length ? "danger" : "warn"}`;
      result.innerHTML = missing.length
        ? `<strong>Readiness withheld.</strong> Missing or incompatible: ${app.safe(missing.join(", "))}. No comparison was calculated.`
        : `<strong>Reference readiness reached.</strong> Race, matchup, patch, and your replay identity align by local declarations. Normalized reference facts are still unavailable, so no performance comparison was calculated.`;
    } catch (error) {
      result.className = "notice danger";
      result.innerHTML = `<strong>Readiness check unavailable.</strong> ${app.safe(error.message || error)} No comparison was calculated.`;
    }
  });
}
