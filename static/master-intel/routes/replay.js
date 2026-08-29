function playerRows(players, selectedPid, app) {
  if (!Array.isArray(players) || !players.length) return '<p class="notice warn">Player metadata is unavailable for this replay.</p>';
  return `<div class="card-grid replay-player-options">${players.map((player) => {
    const isSelected = String(player.pid) === String(selectedPid || "");
    return `
    <article class="player-card ${isSelected ? "is-selected" : ""}">
      <div class="badges"><span class="badge">${app.safe(player.play_race || player.race || "Unknown")}</span><span class="badge">Player ${app.safe(player.pid ?? "?")}</span>${isSelected ? '<span class="badge good">This is me</span>' : ""}</div>
      <h2>${app.safe(player.name || player.display_name || "Unknown player")}</h2>
      <p>${app.safe(player.result || "Result unavailable")}</p>
      <button class="button ${isSelected ? "secondary" : "primary"}" data-replay-player="${app.safe(player.pid)}" ${isSelected ? 'aria-pressed="true"' : ""}>${isSelected ? "Selected player" : "This is me"}</button>
    </article>`;
  }).join("")}</div>`;
}

function selectedAnalysis(analysis, playerPid) {
  return (analysis.analysis_by_player || {})[String(playerPid)] || {};
}

function evidenceMoments(analysis, playerPid, app) {
  const byPlayer = analysis.analysis_by_player || {};
  const first = byPlayer[String(playerPid)] || {};
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

function normalizedText(value) {
  return String(value || "").trim().toLowerCase();
}

function isKnownComparisonValue(value) {
  const normalized = normalizedText(value);
  return Boolean(normalized) && !new Set(["unknown", "unreported", "none", "n/a", "not reported"]).has(normalized);
}

function declaredMatch(values, target) {
  if (!target || !Array.isArray(values) || !values.length) return null;
  const normalizedTarget = normalizedText(target);
  return values.some((value) => normalizedText(value) === normalizedTarget);
}

export function replayPatch(analysis, manifest = null, fingerprint = null) {
  return fingerprint?.patch
    || analysis?.replay?.game_version
    || analysis?.replay?.patch
    || analysis?.replay?.version
    || analysis?.replay?.release
    || manifest?.patch
    || "";
}

export function referenceReadiness(analysis, replayPlayerPid, players, app, manifest = null) {
  const first = selectedAnalysis(analysis, replayPlayerPid);
  const fingerprint = first.hard_data?.fact_envelope?.compatibility_fingerprint || {};
  const replayPlayer = (analysis.players || []).find((player) => String(player.pid) === String(replayPlayerPid)) || {};
  const race = fingerprint.race || replayPlayer.play_race || replayPlayer.race || "";
  const matchup = fingerprint.matchup || first.matchup || "";
  const patch = replayPatch(analysis, manifest, fingerprint);

  const candidates = (Array.isArray(players) ? players : []).map((player) => {
    const raceMatch = race ? normalizedText(player.race) === normalizedText(race) : null;
    const matchupMatch = declaredMatch(player.coverage?.matchups, matchup);
    const patchMatch = declaredMatch(player.patch_coverage, patch);
    const checks = [raceMatch, matchupMatch, patchMatch];
    const state = checks.every((check) => check === true)
      ? "ready"
      : checks.some((check) => check === false)
        ? "blocked"
        : "incomplete";
    return { player, state, raceMatch, matchupMatch, patchMatch };
  }).sort((left, right) => ({ ready: 0, incomplete: 1, blocked: 2 }[left.state] - ({ ready: 0, incomplete: 1, blocked: 2 }[right.state])));

  const readyCount = candidates.filter((candidate) => candidate.state === "ready").length;
  const value = (raw) => raw || "Not reported";
  const checkBadge = (label, result) => `<span class="badge ${result === true ? "good" : result === false ? "danger" : "warn"}">${label}: ${result === true ? "match" : result === false ? "mismatch" : "not declared"}</span>`;
  const candidateRows = candidates.length
    ? candidates.slice(0, 6).map(({ player, state, raceMatch, matchupMatch, patchMatch }) => `
      <article class="reference-candidate is-${state}">
        <div class="reference-candidate-copy">
          <div class="badges"><span class="badge ${state === "ready" ? "good" : state === "blocked" ? "danger" : "warn"}">${state === "ready" ? "Basic context match" : state === "blocked" ? "Context mismatch" : "Evidence incomplete"}</span>${player.synthetic ? '<span class="badge warn">Synthetic</span>' : ""}</div>
          <h3>${app.safe(player.display_name)}</h3>
          <p>${app.safe(player.pack_title)} · ${app.safe(player.identity_label)} identity</p>
        </div>
        <div class="reference-checks" aria-label="Compatibility checks">
          ${checkBadge("Race", raceMatch)}
          ${checkBadge("Matchup", matchupMatch)}
          ${checkBadge("Patch", patchMatch)}
        </div>
        <a class="button secondary" href="#/player/${encodeURIComponent(player.player_id)}">Inspect evidence</a>
      </article>`).join("")
    : '<div class="empty-state"><strong>No local reference records.</strong><p>Import a player pack to evaluate race, matchup, and patch readiness. Practice can still proceed from replay-local evidence.</p><a class="button secondary" href="#/players">Open player library</a></div>';

  return `<section class="panel reference-readiness ${readyCount ? "is-ready" : "is-limited"}">
    <header class="panel-head">
      <div><span class="eyebrow">Contextual reference gate</span><h2>Reference readiness</h2><p>Local player records are checked against the selected replay before they can inform practice context.</p></div>
      <span class="badge ${readyCount ? "good" : "warn"}">${readyCount ? `${readyCount} candidate${readyCount === 1 ? "" : "s"}` : "No complete candidate"}</span>
    </header>
    <div class="reference-fingerprint" aria-label="Replay compatibility fingerprint">
      <div><span>Race</span><strong>${app.safe(value(race))}</strong></div>
      <div><span>Matchup</span><strong>${app.safe(value(matchup))}</strong></div>
      <div><span>Patch</span><strong>${app.safe(value(patch))}</strong></div>
    </div>
    <div class="reference-list">${candidateRows}</div>
    <div class="reference-gate notice warn">
      <strong>${readyCount ? "A basic context match is available; calculated comparison is still withheld." : "Reference comparison is not ready."}</strong>
      <span>Race, matchup, and patch are only a first gate. Map, five-minute evidence coverage, provenance-backed calculations, and master-performance comparison remain unavailable.</span>
    </div>
  </section>`;
}

function hardDataPanel(analysis, playerPid, app, learning) {
  const first = selectedAnalysis(analysis, playerPid);
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
      <div class="evidence-row"><div><strong>Compatible cohort</strong><small>${app.safe(cohort.compatible_prior_games || 0)} prior games match race, matchup, patch, and map with comparable first-five-minute evidence coverage.</small></div><span class="badge">${app.safe(cohort.status || "Withheld")}</span></div>
      <div class="evidence-row"><div><strong>Recurring first-five signature</strong><small>${recurringText}</small></div><span class="badge">${app.safe(recurring.status || "Withheld")}</span></div>
      <div class="evidence-row"><div><strong>One priority correction</strong><small>${app.safe(correction.action || correction.reason || "No supported correction signal was available.")}</small></div><span class="badge warn">${app.safe(correction.status || "Withheld")}</span></div>
    </div>
  </section>`;
}

const CORRECTION_PRESENTATION = {
  WORKER_CONTINUITY_STALL: {
    id: "worker-continuity-five",
    title: "Protect worker growth for five minutes",
    target: "Keep intended worker growth moving through 5:00 and name the cause of any plateau.",
    measure: "Next replay review finds no unexplained worker-count plateau before 5:00",
  },
  MINERAL_FLOAT_EXPOSURE: {
    id: "spend-cycle-five",
    title: "Run one five-minute spend cycle",
    target: "When minerals cross 1,000, name whether the bank is planned and choose the next commitment or constraint response.",
    measure: "Every 1,000-mineral crossing has a reported plan or constraint and a next response",
  },
  SUPPLY_BLOCK_EXPOSURE: {
    id: "supply-headroom-five",
    title: "Protect supply headroom for five minutes",
    target: "Start the next supply provider before the following production cycle reaches zero free supply.",
    measure: "Start the next provider before production reaches zero free supply",
  },
  PRODUCTION_IDLE_EXPOSURE: {
    id: "production-cadence-five",
    title: "Rehearse one repeatable production cadence",
    target: "Cycle through available producers before adding build complexity.",
    measure: "Next replay contains no explicit 30-second producer gap before 5:00",
  },
};

export function correctionDrill(analysis, caseId, playerPid, learning, manifest) {
  const correction = learning?.one_priority_correction || {};
  const presentation = CORRECTION_PRESENTATION[correction.code];
  const evidenceClass = analysis?.source?.evidence_class || learning?.source_evidence_class || "unknown";
  if (!presentation || correction.status !== "provisional" || evidenceClass !== "observed_replay" || correction.evidence_anchor?.status !== "calculated") return null;
  const player = (analysis.players || []).find((row) => String(row.pid) === String(playerPid));
  const opponent = (analysis.players || []).find((row) => String(row.pid) !== String(playerPid));
  const playerAnalysis = selectedAnalysis(analysis, playerPid);
  const fingerprint = playerAnalysis.hard_data?.fact_envelope?.compatibility_fingerprint || {};
  const replayName = analysis.replay?.map || analysis.replay?.display_name || `Local replay ${caseId}`;
  return {
    id: presentation.id,
    title: correction.title || presentation.title,
    target: correction.target || presentation.target,
    why: `${correction.action} This remains a bounded practice hypothesis, not an expert-validated verdict.`,
    source: `${player?.name || `Player ${playerPid}`} in ${replayName} · ${correction.selection_basis || "local replay signal"}`,
    sourceLabel: `${player?.name || `Player ${playerPid}`} · ${replayName}`,
    measure: correction.measure || presentation.measure,
    scenario: "Next comparable 1v1 practice game",
    evidenceStatus: "provisional",
    sourceEvidenceClass: "observed_replay",
    evidenceAnchorStatus: "calculated",
    sourceCaseId: String(caseId),
    playerPid: String(playerPid),
    sourceRace: fingerprint.race || player?.play_race || player?.race || "Unknown",
    opponentRace: opponent?.play_race || opponent?.race || "Unknown",
    sourceMatchup: fingerprint.matchup || playerAnalysis.matchup || "Unknown",
    sourcePatch: replayPatch(analysis, manifest, fingerprint) || "Unknown",
    sourceMap: fingerprint.map || analysis.replay?.map || "Unknown",
    sourceDigest: analysis.source?.digest_sha256 || playerAnalysis.hard_data?.fact_envelope?.source?.digest_sha256 || manifest?.digest_sha256 || null,
    sourcePlayedAt: analysis.replay?.date || manifest?.played_at || null,
    evidenceAnchorSecond: Number(correction.evidence_anchor?.start_second || 0),
    type: "execution_drill",
    focusCode: correction.code,
    successCriterion: correction.measure || presentation.measure,
  };
}

export function replayFollowup(analysis, caseId, playerPid, learning, activeDrill, manifest = null) {
  if (!activeDrill?.focusCode || !activeDrill.sourceCaseId || String(activeDrill.sourceCaseId) === String(caseId)) return null;
  if (!playerPid || analysis?.source?.evidence_class !== "observed_replay") return { status: "withheld", title: "Follow-up withheld", detail: "Select your identity in an observed replay before evaluating this practice target." };
  const selected = selectedAnalysis(analysis, playerPid);
  const fingerprint = selected.hard_data?.fact_envelope?.compatibility_fingerprint || {};
  const required = [
    ["race", activeDrill.sourceRace, fingerprint.race],
    ["matchup", activeDrill.sourceMatchup, fingerprint.matchup || selected.matchup],
    ["patch", activeDrill.sourcePatch, replayPatch(analysis, manifest, fingerprint)],
    ["map", activeDrill.sourceMap, fingerprint.map],
  ];
  const mismatches = required.filter(([, expected, actual]) => !isKnownComparisonValue(expected) || !isKnownComparisonValue(actual) || normalizedText(expected) !== normalizedText(actual)).map(([label]) => label);
  if (mismatches.length) return { status: "withheld", title: "Not a comparable follow-up", detail: `Different or missing ${mismatches.join(", ")}. Keep this replay separate from the active target's evidence.` };
  const sourcePlayedAt = Date.parse(activeDrill.sourcePlayedAt || "");
  const targetPlayedAt = Date.parse(analysis.replay?.date || manifest?.played_at || "");
  if (!Number.isFinite(sourcePlayedAt) || !Number.isFinite(targetPlayedAt)) {
    return { status: "withheld", title: "Follow-up chronology unavailable", detail: "Both replay-played timestamps are required before this case can be treated as a later attempt." };
  }
  if (targetPlayedAt <= sourcePlayedAt) {
    return { status: "withheld", title: "Not a later replay", detail: "This replay was played before or at the same time as the source replay, so it cannot evaluate the later practice attempt." };
  }
  const current = learning?.current_first_five_signals || {};
  if (current.status !== "calculated") return { status: "withheld", title: "Five-minute follow-up incomplete", detail: current.reason || "Replay coverage does not reach the observation boundary." };
  const evaluation = current.evaluations?.[activeDrill.focusCode];
  if (!evaluation || evaluation.status !== "calculated" || typeof evaluation.signal_present !== "boolean") {
    return { status: "withheld", title: "Follow-up evidence unavailable", detail: evaluation?.reason || "This replay does not expose the facts required to evaluate the active target." };
  }
  const signalPresent = evaluation.signal_present;
  if (activeDrill.focusCode === "MINERAL_FLOAT_EXPOSURE") return signalPresent
    ? { status: "needs-report", title: "Threshold exposure observed", detail: "The replay shows a qualifying mineral-bank window, but only you can report whether it was planned and what constrained spending." }
    : { status: "not-observed", title: "Threshold did not occur", detail: "This replay cannot evaluate the plan-or-constraint response because the qualifying mineral-bank trigger was not observed." };
  if (activeDrill.focusCode === "SUPPLY_BLOCK_EXPOSURE" && !signalPresent) {
    return { status: "not-observed", title: "Supply-block signal not observed", detail: "No qualifying supply-block window appears before 5:00. The replay does not prove when the next provider was started relative to the planned production cycle, so the full practice criterion remains unevaluated." };
  }
  if (signalPresent && ["WORKER_CONTINUITY_STALL", "PRODUCTION_IDLE_EXPOSURE"].includes(activeDrill.focusCode)) {
    return { status: "needs-report", title: "Replay signal needs your report", detail: "The targeted replay signal appears before 5:00. Report whether the interruption was deliberate or explained before judging the full practice criterion." };
  }
  return signalPresent
    ? { status: "missed", title: "Replay criterion not met", detail: `The same ${activeDrill.focusCode.replaceAll("_", " ").toLowerCase()} signal appears before 5:00.` }
    : { status: "met", title: "Replay criterion met once", detail: "The targeted first-five-minute signal is absent in this comparable replay. This is one observed follow-up, not proof of causality or durable improvement." };
}

function followupMarkup(result, activeDrill, app) {
  if (!result) return "";
  const tone = result.status === "met" ? "good" : result.status === "missed" ? "danger" : "warn";
  const label = result.status === "met" ? "Observed once" : result.status === "missed" ? "Signal recurred" : result.status === "needs-report" ? "Player report required" : result.status === "not-observed" ? "Trigger absent" : "Withheld";
  return `<section class="panel coach-read replay-followup"><header class="panel-head"><div><span class="eyebrow">Active-drill replay follow-up</span><h2>${app.safe(result.title)}</h2><p>${app.safe(result.detail)}</p></div><span class="badge ${tone}">${label}</span></header><div class="evidence-row"><div><strong>${app.safe(activeDrill.title)}</strong><small>Source case ${app.safe(activeDrill.sourceCaseId)} · current case evaluated only when race, matchup, patch, map, and five-minute coverage align.</small></div><a class="button secondary" href="#/practice">Open practice loop</a></div></section>`;
}

function coachRead(analysis, caseId, playerPid, learning, app) {
  const player = (analysis.players || []).find((row) => String(row.pid) === String(playerPid));
  if (!playerPid) return `<section class="panel coach-read is-withheld"><header class="panel-head"><div><span class="eyebrow">Coach read</span><h2>Personal coaching is withheld.</h2><p>Choose which replay player is you. The app will not silently turn the first player record into personal advice.</p></div><span class="badge warn">Selection required</span></header></section>`;
  const correction = learning?.one_priority_correction || {};
  const presentation = CORRECTION_PRESENTATION[correction.code] || {};
  const title = correction.title || presentation.title;
  const measure = correction.measure || presentation.measure;
  const signal = correction.evidence_anchor || {};
  const measurement = correction.measurement || {};
  const evidenceClass = analysis?.source?.evidence_class || learning?.source_evidence_class || "unknown";
  const synthetic = String(evidenceClass).startsWith("synthetic");
  const when = signal.status === "calculated" ? gameTime(signal.start_second) : "Baseline not established";
  if (synthetic) return `<section class="panel coach-read is-withheld"><header class="panel-head"><div><span class="eyebrow">Synthetic tutorial · ${app.safe(player?.name || `Player ${playerPid}`)}</span><h2>${app.safe(title || "Practice-target preview")}</h2><p>This generated fixture can demonstrate the evidence contract, but it cannot create replay-derived personal coaching or a Guided Execution drill.</p></div><span class="badge warn">Tutorial only</span></header>${title ? `<div class="coach-read-grid"><div><span>Fixture signal</span><strong>${app.safe(when)}</strong></div><div><span>A real replay could observe</span><strong>${app.safe(measurement.replay_observed_component || "A parser-supported signal")}</strong></div><div><span>Only a player can report</span><strong>${app.safe(measurement.player_report_component || "Whether the behavior was deliberate and what caused it")}</strong></div><div><span>Follow-up rule</span><strong>${app.safe(measure || "Review a comparable real replay manually.")}</strong></div></div>` : ""}<div class="button-row"><button class="button primary" id="syntheticImportReplay">Import a real replay</button><a class="button secondary" href="#/practice?replay=${encodeURIComponent(caseId)}">Open baseline practice</a></div><p class="evidence-note">Synthetic data remains tutorial context. Personal correction, outcome, and improvement claims are withheld.</p></section>`;
  if (evidenceClass !== "observed_replay") return `<section class="panel coach-read is-withheld"><header class="panel-head"><div><span class="eyebrow">Evidence authority unresolved · ${app.safe(player?.name || `Player ${playerPid}`)}</span><h2>Personal coaching is withheld.</h2><p>This case does not declare observed-replay authority, so it cannot create a replay-derived correction or Guided Execution drill.</p></div><span class="badge warn">Unknown source</span></header><div class="button-row"><button class="button primary" id="syntheticImportReplay">Import a real replay</button><a class="button secondary" href="#/practice?replay=${encodeURIComponent(caseId)}">Open baseline practice</a></div></section>`;
  if (!title || correction.status === "withheld") return `<section class="panel coach-read is-withheld"><header class="panel-head"><div><span class="eyebrow">Your next practice target · ${app.safe(player?.name || `Player ${playerPid}`)}</span><h2>No supported execution correction yet.</h2><p>${app.safe(correction.reason || learning?.reason || "The selected player's normalized facts do not support a bounded correction.")}</p></div><span class="badge warn">Withheld</span></header><a class="button secondary" href="#/practice?replay=${encodeURIComponent(caseId)}">Collect a baseline instead</a></section>`;
  if (signal.status !== "calculated") return `<section class="panel coach-read is-withheld"><header class="panel-head"><div><span class="eyebrow">Your next practice target · ${app.safe(player?.name || `Player ${playerPid}`)}</span><h2>Correction-specific baseline not established.</h2><p>The selected five-minute correction has no qualifying matching signal before 5:00, so it cannot become a replay-derived execution drill.</p></div><span class="badge warn">Withheld</span></header><a class="button secondary" href="#/practice?replay=${encodeURIComponent(caseId)}">Collect a baseline instead</a></section>`;
  return `<section class="panel coach-read"><header class="panel-head"><div><span class="eyebrow">Your next practice target · ${app.safe(player?.name || `Player ${playerPid}`)}</span><h2>${app.safe(title)}</h2><p>${app.safe(correction.action)}</p></div><span class="badge ${signal.status === "calculated" ? "good" : "warn"}">${signal.status === "calculated" ? "Evidence-timed" : "Baseline needed"}</span></header><div class="coach-read-grid"><div><span>Correction-specific signal</span><strong>${app.safe(when)}</strong></div><div><span>Replay can observe</span><strong>${app.safe(measurement.replay_observed_component || "The relevant replay signal when parser facts are available")}</strong></div><div><span>Only you can report</span><strong>${app.safe(measurement.player_report_component || "Whether the behavior was deliberate and what caused it")}</strong></div><div><span>Follow-up rule</span><strong>${app.safe(measure || "Review the same target in a later comparable replay.")}</strong></div></div><div class="button-row"><button class="button primary" id="activateCorrection">Use this practice target</button><a class="button secondary" href="#/practice?replay=${encodeURIComponent(caseId)}">Review all practice options</a></div><p class="evidence-note">Derived practice hypothesis · player report now · manual next-replay review later. Automatic improvement verification is not implemented.</p></section>`;
}

export async function render({ root, route, app }) {
  await app.refreshSummary();
  const caseId = route.params[0];
  let selectedPid = app.getReplayPlayer(caseId);
  let manifest = null;
  let analysis = null;
  let learning = null;
  let caseError = null;
  let sessionFallback = false;
  let selectionRecoveryRequired = false;
  try {
    const result = await app.api.caseDetail(caseId, selectedPid);
    manifest = result.manifest;
    analysis = result.analysis;
    learning = result.learning;
    selectedPid = result.selected_player_pid || null;
    selectionRecoveryRequired = Boolean(result.selection_recovery_required);
  } catch (error) {
    caseError = error;
    const stored = app.getStoredReplay();
    if (stored?.case?.id === caseId) {
      sessionFallback = true;
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
    const unavailable = caseError && caseError.status !== 404;
    root.innerHTML = `<section class="route-head"><div><span class="eyebrow">Replay analysis</span><h1>${unavailable ? "Replay report is temporarily unavailable." : "Replay report not found."}</h1><p>${unavailable ? "The local case could not be read. It was not deleted, and no learning conclusion was generated." : "The local case may have been deleted or the identifier is invalid."}</p></div><div class="button-row">${unavailable ? '<button class="button primary" id="replayCaseRetry">Retry report</button>' : '<button class="button primary" id="replayImportMissing">Import replay</button>'}</div></section>`;
    root.querySelector("#replayImportMissing")?.addEventListener("click", app.chooseReplay);
    root.querySelector("#replayCaseRetry")?.addEventListener("click", () => render({ root, route, app }));
    return;
  }

  const replayMeta = analysis.replay || {};
  const players = analysis.players || manifest.players || [];
  if (!players.some((player) => String(player.pid) === String(selectedPid || ""))) selectedPid = null;
  const map = replayMeta.map || manifest.map || "Unknown map";
  const duration = replayMeta.duration || manifest.duration;
  const patch = replayPatch(analysis, manifest) || "Not reported";
  const playersKnown = app.state.loads.players.hasValue;
  const evidenceClass = analysis.source?.evidence_class || learning?.source_evidence_class || "unknown";
  const observed = evidenceClass === "observed_replay";
  const synthetic = String(evidenceClass).startsWith("synthetic");
  const authorityLabel = observed ? "Replay analysis" : synthetic ? "Synthetic tutorial analysis" : "Evidence authority unresolved";
  const authorityIntro = observed
    ? "Every value below comes from the stored local replay analysis. Missing structures remain unavailable rather than estimated."
    : synthetic
      ? "This generated fixture demonstrates the local workflow. It is not observed replay evidence and cannot create personal replay coaching."
      : "This case does not declare observed-replay authority. Facts remain inspectable, but personal coaching is withheld.";
  const activeDrill = app.getActiveDrill();
  const followup = replayFollowup(analysis, caseId, selectedPid, learning, activeDrill, manifest);
  if (followup && activeDrill && ["met", "missed", "needs-report", "not-observed"].includes(followup.status)) {
    const targetPlayedAt = analysis.replay?.date || null;
    const targetDigest = analysis.source?.digest_sha256 || selectedAnalysis(analysis, selectedPid).hard_data?.fact_envelope?.source?.digest_sha256 || manifest?.digest_sha256 || caseId;
    app.recordReplayFollowup({
      id: [activeDrill.sourceCaseId, caseId, activeDrill.focusCode, activeDrill.playerPid, selectedPid, activeDrill.createdAt].join(":"),
      sourceCaseId: String(activeDrill.sourceCaseId),
      targetCaseId: String(caseId),
      sourceDigest: activeDrill.sourceDigest || String(activeDrill.sourceCaseId),
      targetDigest: String(targetDigest),
      sourcePlayerPid: String(activeDrill.playerPid),
      targetPlayerPid: String(selectedPid),
      sourcePlayedAt: activeDrill.sourcePlayedAt,
      targetPlayedAt,
      drillCreatedAt: activeDrill.createdAt,
      focusCode: activeDrill.focusCode,
      criterion: activeDrill.successCriterion || activeDrill.measure,
      status: followup.status,
      title: followup.title,
      detail: followup.detail,
    });
  }

  root.innerHTML = `
    <section class="route-head compact">
      <div><span class="eyebrow">${authorityLabel} · local case ${app.safe(caseId)}</span><h1>${app.safe(manifest.display_name || manifest.source_filename || "Analyzed replay")}</h1><p>${authorityIntro}</p></div>
      <div class="button-row"><button class="button secondary" id="replayImportAnother">Import another replay</button></div>
    </section>

    ${app.resourceIssueMarkup(["players"])}
    ${selectionRecoveryRequired ? '<section class="notice warn" role="status"><strong>Replay identity needs to be selected again.</strong> The previously stored player record is no longer present in this analysis. Replay facts remain available; personal coaching is withheld until you choose a current player below.</section>' : ""}
    ${synthetic ? '<section class="notice warn" role="status"><strong>Synthetic demo · tutorial authority only.</strong> Generated values remain labeled synthetic. Import a real .SC2Replay before activating replay-derived personal coaching.</section>' : !observed ? '<section class="notice warn" role="status"><strong>Evidence authority unresolved.</strong> Personal coaching remains withheld until this case can be identified as observed replay evidence.</section>' : ""}
    ${sessionFallback ? '<section class="notice warn" role="status"><strong>Showing session-only analysis.</strong> The saved case could not be refreshed. Saved learning and personal coaching are withheld until the case loads again.</section>' : ""}

    <section class="summary-grid replay-summary">
      <article class="summary-card"><span>Map</span><strong style="font-size:19px">${app.safe(map)}</strong><small>${synthetic ? "synthetic fixture metadata" : "observed metadata"}</small></article>
      <article class="summary-card"><span>Duration</span><strong>${app.safe(app.formatDuration(duration))}</strong><small>game time</small></article>
      <article class="summary-card"><span>Patch / version</span><strong style="font-size:17px">${app.safe(patch)}</strong><small>comparison compatibility input</small></article>
      <article class="summary-card"><span>Storage</span><strong style="color:var(--green);font-size:19px">Local case</strong><small>${app.safe(manifest.source_filename || "replay.SC2Replay")}</small></article>
    </section>

    ${selectedPid ? `<details class="panel identity-disclosure"><summary><span><span class="eyebrow">Replay identity</span><strong>${app.safe(players.find((player) => String(player.pid) === String(selectedPid))?.name || `Player ${selectedPid}`)}</strong><small>${observed ? "Personal coaching is scoped to this player." : synthetic ? "Tutorial identity selected · personal coaching remains withheld." : "Identity selected · personal coaching remains withheld while authority is unresolved."}</small></span><span class="badge ${observed ? "good" : "warn"}">Change player</span></summary>${playerRows(players, selectedPid, app)}</details>` : `<section class="panel"><header class="panel-head"><div><span class="eyebrow">Required before personal coaching</span><h2>Which player are you?</h2><p>Select your replay identity for this local case. Results and names are metadata; the app does not infer ownership from player order.</p></div><span class="badge warn">Coaching withheld</span></header>${playerRows(players, selectedPid, app)}</section>`}

    ${sessionFallback ? '<section class="panel coach-read is-withheld"><header class="panel-head"><div><span class="eyebrow">Coach read</span><h2>Saved learning is unavailable.</h2><p>This temporary session analysis can show parser facts, but it cannot stand in for the stored case learning record.</p></div><span class="badge warn">Withheld</span></header></section>' : coachRead(analysis, caseId, selectedPid, learning, app)}

    ${sessionFallback ? "" : followupMarkup(followup, activeDrill, app)}

    ${selectedPid ? `<details class="replay-disclosure"><summary><span><strong>Inspect ${synthetic ? "tutorial data" : "replay evidence"}</strong><small>Normalized facts and structured timeline events</small></span><span class="badge ${synthetic ? "warn" : ""}">${synthetic ? "Synthetic + derived" : "Observed + derived"}</span></summary><div class="replay-disclosure-body">${hardDataPanel(analysis, selectedPid, app, learning)}<section class="panel"><header class="panel-head"><div><h2>${synthetic ? "Tutorial timeline data" : "Replay timeline intelligence"}</h2><p>Structured events available from the current parser result.</p></div></header>${evidenceMoments(analysis, selectedPid, app)}</section></div></details>` : '<section class="panel"><p class="notice warn"><strong>Personal analysis withheld.</strong> Select your replay player above to open normalized hard data, learning fingerprint, and practice guidance.</p></section>'}

    ${selectedPid ? `<details class="replay-disclosure"><summary><span><strong>Why this recommendation is bounded</strong><small>Reference compatibility, provenance, and withheld claims</small></span><span class="badge warn">Inspect limits</span></summary><div class="replay-disclosure-body">${playersKnown ? referenceReadiness(analysis, selectedPid, app.state.players, app, manifest) : '<section class="panel"><p class="notice danger"><strong>Reference library unavailable — not empty.</strong> Reference readiness is withheld until local player data can be read.</p></section>'}<section class="panel"><header class="panel-head"><div><h2>Evidence boundary</h2><p>${synthetic ? "Synthetic fixture data remains distinct from observed replay evidence, interpretation, and recommendation." : "Observed replay data is distinct from interpretation and recommendation."}</p></div></header><div class="status-grid"><div class="notice"><strong>${synthetic ? "Synthetic fixture facts" : "Observed replay facts"}</strong><br>Metadata, players, resources, structures, supply-provider events, and parser-exposed events.</div><div class="notice"><strong>Derived</strong><br>Continuity segments, threshold exposure, supply-block windows, and compatibility fields.</div><div class="notice warn"><strong>Withheld when unsupported</strong><br>Intent, causality, exact queued-unit delay, utilization without producer cycles, personal coaching from synthetic data, and master comparison.</div></div></section></div></details>` : ""}`;

  root.querySelector("#replayImportAnother")?.addEventListener("click", app.chooseReplay);
  root.querySelector("#syntheticImportReplay")?.addEventListener("click", app.chooseReplay);
  root.querySelector("#activateCorrection")?.addEventListener("click", () => {
    const drill = correctionDrill(analysis, caseId, selectedPid, learning, manifest);
    if (!drill) return;
    try {
      app.setActiveDrill(drill);
      app.toast(`${drill.title} is now your active practice target.`);
      app.navigate("practice");
    } catch (error) {
      app.showMessage("Practice target could not be saved", `<p>${app.safe(error.message || error)}</p><p>Your previous active target was not changed.</p>`, "Local practice storage");
    }
  });
  app.wireResourceRetry(root);
  root.querySelectorAll("[data-replay-player]").forEach((button) => button.addEventListener("click", async () => {
    try {
      button.disabled = true;
      await app.setReplayPlayer(caseId, button.dataset.replayPlayer);
      app.toast("Replay player selected. Personal coaching recalculated from that player's facts.");
      void render({ root, route, app });
    } catch (error) {
      app.showMessage("Replay player could not be saved", `<p>${app.safe(error.message || error)}</p><p>Personal coaching remains withheld.</p>`, "Replay identity");
    }
  }));
}
