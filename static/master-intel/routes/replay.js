function playerRows(players, app) {
  if (!Array.isArray(players) || !players.length) return '<p class="notice warn">Player metadata is unavailable for this replay.</p>';
  return `<div class="card-grid">${players.map((player) => `
    <article class="player-card">
      <div class="badges"><span class="badge">${app.safe(player.play_race || player.race || "Unknown")}</span><span class="badge">Player ${app.safe(player.pid ?? "?")}</span></div>
      <h2>${app.safe(player.name || player.display_name || "Unknown player")}</h2>
      <p>${app.safe(player.result || "Result unavailable")}</p>
    </article>`).join("")}</div>`;
}

function evidenceMoments(analysis, app) {
  const byPlayer = analysis.analysis_by_player || {};
  const first = Object.values(byPlayer)[0] || {};
  const candidates = [];
  const build = first.build || first.build_order || first.buildOrder || [];
  if (Array.isArray(build)) {
    build.slice(0, 8).forEach((row) => candidates.push({
      time: row.time || row.timestamp || row.game_time || "—",
      title: row.action || row.name || row.unit || row.structure || "Build event",
      detail: row.reason || row.detail || row.type || "Observed replay event",
    }));
  }
  const moments = first.critical_moments || first.criticalMoments || analysis.critical_moments || [];
  if (Array.isArray(moments)) {
    moments.slice(0, 6).forEach((row) => candidates.push({
      time: row.time || row.timestamp || "—",
      title: row.title || row.label || "Decision moment",
      detail: row.explanation || row.detail || row.reason || "Calculated replay moment",
    }));
  }
  if (!candidates.length) return '<p class="notice warn">This replay parser result does not yet expose structured timeline events for the Master Intel route.</p>';
  return `<div class="timeline">${candidates.slice(0, 10).map((row) => `
    <div class="timeline-row"><time>${app.safe(row.time)}</time><div><strong>${app.safe(row.title)}</strong><small>${app.safe(row.detail)}</small></div></div>`).join("")}</div>`;
}

export async function render({ root, route, app }) {
  const caseId = route.params[0];
  let manifest = null;
  let analysis = null;
  try {
    const result = await app.api.caseDetail(caseId);
    manifest = result.manifest;
    analysis = result.analysis;
  } catch (_) {
    const stored = app.getStoredReplay();
    if (stored?.case?.id === caseId) {
      analysis = stored;
      manifest = {
        case_id: caseId,
        display_name: stored.case.display_name,
        map: stored.replay?.map,
        duration: stored.replay?.duration,
        players: stored.players,
      };
    }
  }

  if (!analysis || !manifest) {
    root.innerHTML = `<section class="route-head"><div><span class="eyebrow">Replay analysis</span><h1>Replay report not found.</h1><p>The local case may have been deleted or the identifier is invalid.</p></div><button class="button primary" id="replayImportMissing">Import replay</button></section>`;
    root.querySelector("#replayImportMissing")?.addEventListener("click", app.chooseReplay);
    return;
  }

  const replayMeta = analysis.replay || {};
  const players = analysis.players || manifest.players || [];
  const map = replayMeta.map || manifest.map || "Unknown map";
  const duration = replayMeta.duration || manifest.duration;
  const patch = replayMeta.game_version || replayMeta.patch || replayMeta.version || "Not reported";

  root.innerHTML = `
    <section class="route-head compact">
      <div><span class="eyebrow">Replay analysis · local case ${app.safe(caseId)}</span><h1>${app.safe(manifest.display_name || manifest.source_filename || "Analyzed replay")}</h1><p>Every value below comes from the stored local replay analysis. Missing structures remain unavailable rather than estimated.</p></div>
      <div class="button-row"><button class="button primary" id="replayImportAnother">Import another replay</button><a class="button secondary" href="#/home">Return home</a></div>
    </section>

    <section class="summary-grid">
      <article class="summary-card"><span>Map</span><strong style="font-size:19px">${app.safe(map)}</strong><small>observed metadata</small></article>
      <article class="summary-card"><span>Duration</span><strong>${app.safe(app.formatDuration(duration))}</strong><small>game time</small></article>
      <article class="summary-card"><span>Patch / version</span><strong style="font-size:17px">${app.safe(patch)}</strong><small>comparison compatibility input</small></article>
      <article class="summary-card"><span>Storage</span><strong style="color:var(--green);font-size:19px">Local case</strong><small>${app.safe(manifest.source_filename || "replay.SC2Replay")}</small></article>
    </section>

    <section class="panel">
      <header class="panel-head"><div><h2>Players</h2><p>Identity is replay metadata only. It is not professional verification.</p></div><span class="badge warn">Unverified by default</span></header>
      ${playerRows(players, app)}
    </section>

    <section class="content-grid" style="margin-top:16px">
      <article class="panel">
        <header class="panel-head"><div><h2>Replay timeline intelligence</h2><p>Structured events available from the current parser result.</p></div></header>
        ${evidenceMoments(analysis, app)}
      </article>
      <article class="panel">
        <header class="panel-head"><div><h2>Three-moment debrief status</h2><p>The exact divergence model belongs to Milestone 3.</p></div></header>
        <div class="list-stack">
          <div class="evidence-row"><div><strong>Earliest meaningful divergence</strong><small>Unavailable until compatible master-reference evidence exists.</small></div><span class="badge warn">Unavailable</span></div>
          <div class="evidence-row"><div><strong>Highest-impact decision</strong><small>Requires the decision-pattern and comparison pipeline.</small></div><span class="badge warn">Unavailable</span></div>
          <div class="evidence-row"><div><strong>Next practice priority</strong><small>Open Practice to create a provisional target from current local evidence.</small></div><a class="button secondary" href="#/practice">Practice</a></div>
        </div>
      </article>
    </section>

    <section class="panel">
      <header class="panel-head"><div><h2>Evidence boundary</h2><p>Observed replay data is distinct from interpretation and recommendation.</p></div></header>
      <div class="status-grid">
        <div class="notice"><strong>Observed</strong><br>Replay metadata, players, map, duration, and parser-exposed events.</div>
        <div class="notice warn"><strong>Not yet calculated here</strong><br>Master comparison, build fingerprint, divergence score, and practice prescription.</div>
      </div>
    </section>`;

  root.querySelector("#replayImportAnother")?.addEventListener("click", app.chooseReplay);
}
