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

function gameTime(second) {
  const value = Math.max(0, Number(second) || 0);
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

function hardDataPanel(analysis, app, learning) {
  const first = Object.values(analysis.analysis_by_player || {})[0] || {};
  const hard = first.hard_data;
  if (!hard) return `<section class="panel"><p class="notice warn">Normalized hard-data analysis is unavailable for this stored case. Re-import the replay with the current parser.</p></section>`;
  const envelope = hard.fact_envelope || {};
  const coverage = envelope.coverage || {};
  const fingerprint = envelope.compatibility_fingerprint || {};
  const worker = hard.worker_continuity || {};
  const mineral1000 = (hard.mineral_exposure?.thresholds || []).find((row) => row.minerals === 1000) || {};
  const supply = hard.supply_blocks || {};
  const production = hard.production_utilization || {};
  const earliest = hard.earliest_signal || {};
  const decision = hard.decision_context || {};
  const decisionAvailable = Boolean(hard.decision_context);
  const commitments = decision.commitment_windows || [];
  const expansions = decision.expansion_reviews || [];
  const attention = decision.attention_debt || {};
  const repetitions = decision.repeated_phase_failures?.within_replay || [];
  const productionValue = production.availability === "calculated"
    ? `${app.safe(production.utilization_percent)}%`
    : "Withheld";
  const earliestValue = earliest.status === "calculated"
    ? `${gameTime(earliest.second)} · ${String(earliest.code || "signal").replaceAll("_", " ")}`
    : "No qualifying signal";
  const commitmentText = decisionAvailable
    ? `${app.safe(commitments.length)} commitment windows reconstructed from conservative observation proxies.`
    : "Unavailable for this stored case; re-import with the current observation pipeline.";
  const expansionText = !decisionAvailable
    ? "Unavailable for this stored case."
    : expansions.length
      ? `First expansion evidence grade ${app.safe(expansions[0].scouting_evidence_grade)}; strategic safety remains withheld without matchup policy.`
      : "No expansion commitment was available for grading.";
  const attentionText = attention.availability === "calculated"
    ? `${app.safe(attention.windows?.length || 0)} camera, selection, or command gaps exceeded ${app.safe(attention.gap_threshold_seconds || 20)} seconds.`
    : "Withheld because complete camera, selection, or command timeline rows are unavailable.";
  const repetitionText = decisionAvailable
    ? `${app.safe(repetitions.length)} within-replay repeated signatures; cross-replay recurrence remains withheld until a compatible case cohort exists.`
    : "Unavailable for this stored case; cross-replay recurrence remains withheld.";
  const macro = learning?.personal_macro_fingerprint?.features || {};
  const opponent = learning?.opponent_behavior_fingerprint || {};
  const cohort = learning?.compatible_cohort || {};
  const recurring = learning?.recurring_first_five_signature || {};
  const correction = learning?.one_priority_correction || {};
  const recurringText = recurring.status === "calculated"
    ? `${app.safe(recurring.signals?.length || 0)} recurring first-five-minute signatures across ${app.safe(cohort.cohort_games_including_target || 0)} compatible games.`
    : "Withheld until at least two strictly compatible games exist.";
  return `<section class="panel">
    <header class="panel-head"><div><h2>Normalized hard data</h2><p>Replay facts are normalized once; derived durations preserve their sample coverage and never claim intent.</p></div><span class="badge">Schema ${app.safe(hard.schema_version || "?")}</span></header>
    <div class="summary-grid">
      <article class="summary-card"><span>Worker continuity</span><strong>${app.safe(worker.segments?.length || 0)} segments</strong><small>${app.safe(coverage.resource_sample_count || 0)} observed samples · 1s RLE map</small></article>
      <article class="summary-card"><span>Minerals ≥1,000</span><strong>${app.safe(mineral1000.total_exposure_seconds || 0)}s</strong><small>derived exposure, not presumed waste</small></article>
      <article class="summary-card"><span>Supply blocks</span><strong>${app.safe(supply.windows?.length || 0)}</strong><small>${app.safe(supply.total_exposure_seconds || 0)}s production-delay exposure</small></article>
      <article class="summary-card"><span>Production utilization</span><strong style="font-size:19px">${productionValue}</strong><small>${production.availability === "calculated" ? "explicit producer cycles" : "producer-cycle facts unavailable"}</small></article>
    </div>
    <div class="status-grid" style="margin-top:16px">
      <div class="notice"><strong>Earliest local signal</strong><br>${app.safe(earliestValue)}<br><small>Not a master-reference divergence claim.</small></div>
      <div class="notice"><strong>Compatibility fingerprint</strong><br>${app.safe(fingerprint.race || "?")} · ${app.safe(fingerprint.matchup || "?")} · ${app.safe(fingerprint.patch || "?")} · ${app.safe(fingerprint.map || "?")}<br><small>${app.safe(fingerprint.status || "incomplete")}</small></div>
    </div>
    <div class="list-stack" style="margin-top:16px">
      <div class="evidence-row"><div><strong>Information before commitments</strong><small>${commitmentText}</small></div><span class="badge">${decisionAvailable ? "Derived" : "Unavailable"}</span></div>
      <div class="evidence-row"><div><strong>Expansion evidence coverage</strong><small>${expansionText}</small></div><span class="badge warn">Safety withheld</span></div>
      <div class="evidence-row"><div><strong>Attention-debt proxy</strong><small>${attentionText}</small></div><span class="badge">${attention.availability === "calculated" ? "Proxy" : "Withheld"}</span></div>
      <div class="evidence-row"><div><strong>Repeated phase signatures</strong><small>${repetitionText}</small></div><span class="badge">Local only</span></div>
      <div class="evidence-row"><div><strong>Decision quality versus outcome</strong><small>Outcome is reported separately. Reasonableness is withheld without exact information state and an applicable matchup policy.</small></div><span class="badge warn">No hindsight verdict</span></div>
    </div>
    <header class="panel-head" style="margin-top:20px"><div><h3>Learning fingerprint</h3><p>Win/loss and opponent intent are excluded from these vectors.</p></div><span class="badge">Strict cohort</span></header>
    <div class="list-stack">
      <div class="evidence-row"><div><strong>Personal macro fingerprint</strong><small>Workers at 5:00: ${app.safe(macro.workers_at_5_minutes ?? "unavailable")} · Supply-block exposure: ${app.safe(macro.supply_block_exposure_first_5_minutes ?? "unavailable")}s · Result excluded.</small></div><span class="badge">Behavior only</span></div>
      <div class="evidence-row"><div><strong>Opponent behavior fingerprint</strong><small>${opponent.status === "calculated" ? "Observed economy, expansion, resource, and attention features are available." : "Opponent normalized facts are unavailable."} Intent is not inferred.</small></div><span class="badge">No intent</span></div>
      <div class="evidence-row"><div><strong>Compatible cohort</strong><small>${app.safe(cohort.compatible_prior_games || 0)} prior games match race, matchup, patch, map, and duration bucket.</small></div><span class="badge">${app.safe(cohort.status || "Withheld")}</span></div>
      <div class="evidence-row"><div><strong>Recurring first-five signature</strong><small>${recurringText}</small></div><span class="badge">${app.safe(recurring.status || "Withheld")}</span></div>
      <div class="evidence-row"><div><strong>One priority correction</strong><small>${app.safe(correction.action || correction.reason || "No supported correction signal was available.")}</small></div><span class="badge warn">${app.safe(correction.status || "Withheld")}</span></div>
    </div>
  </section>`;
}

export async function render({ root, route, app }) {
  const caseId = route.params[0];
  let manifest = null;
  let analysis = null;
  let learning = null;
  try {
    const result = await app.api.caseDetail(caseId);
    manifest = result.manifest;
    analysis = result.analysis;
    learning = result.learning;
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

    ${hardDataPanel(analysis, app, learning)}

    <section class="content-grid" style="margin-top:16px">
      <article class="panel">
        <header class="panel-head"><div><h2>Replay timeline intelligence</h2><p>Structured events available from the current parser result.</p></div></header>
        ${evidenceMoments(analysis, app)}
      </article>
      <article class="panel">
        <header class="panel-head"><div><h2>Three-moment debrief status</h2><p>Local hard-data signals are separate from compatible-reference divergence, which remains Milestone 3.</p></div></header>
        <div class="list-stack">
          <div class="evidence-row"><div><strong>Earliest evidence-backed signal</strong><small>Calculated from local worker, resource, supply, and explicit production-cycle facts when available.</small></div><span class="badge">Local only</span></div>
          <div class="evidence-row"><div><strong>Master-reference divergence</strong><small>Unavailable until compatible master-reference evidence exists; provenance is required.</small></div><span class="badge warn">Withheld</span></div>
          <div class="evidence-row"><div><strong>Highest-impact decision</strong><small>Requires the decision-pattern and comparison pipeline.</small></div><span class="badge warn">Unavailable</span></div>
          <div class="evidence-row"><div><strong>Next practice priority</strong><small>Open Practice to create a provisional target from current local evidence.</small></div><a class="button secondary" href="#/practice">Practice</a></div>
        </div>
      </article>
    </section>

    <section class="panel">
      <header class="panel-head"><div><h2>Evidence boundary</h2><p>Observed replay data is distinct from interpretation and recommendation.</p></div></header>
      <div class="status-grid">
        <div class="notice"><strong>Observed replay facts</strong><br>Metadata, players, periodic resources, structures, supply-provider events, and parser-exposed events.</div>
        <div class="notice"><strong>Derived</strong><br>Worker continuity segments, threshold exposure, supply-block windows, and compatible fingerprint fields.</div>
        <div class="notice warn"><strong>Withheld when unsupported</strong><br>Intent, causality, exact queued-unit delay, production utilization without producer cycles, and master comparison.</div>
      </div>
    </section>`;

  root.querySelector("#replayImportAnother")?.addEventListener("click", app.chooseReplay);
}
