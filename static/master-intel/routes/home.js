function priorityRows(state, activeDrill, app) {
  const rows = [];
  if (activeDrill) rows.push(["Continue active drill", `${activeDrill.title} · Measure: ${activeDrill.measure}`]);
  if (app.resourceUnavailable("recent")) rows.push(["Replay library unavailable", "Retry local data before drawing a replay-based conclusion."]);
  else if (!state.recent.length) rows.push(["Import one replay", "Establish your first evidence-backed baseline."]);
  else rows.push(["Review the latest replay", "Find one correction-specific signal before adding more advice."]);
  if (activeDrill) rows.push(["Take the target into Guided Execution", "Live battlefield reports can change the plan; the practice target never overrides tactical evidence."]);
  else rows.push(["Choose one measurable target", "Start with one behavior, one threshold, and one follow-up rule."]);
  rows.push(["Review the next comparable replay", "The app will not claim improvement automatically; compare the same signal and keep causes explicit."]);
  return rows.slice(0, 3);
}

function gameLabel(game) {
  const players = (game.players || []).map((player) => player.name || player.display_name).filter(Boolean);
  return players.length ? players.join(" vs ") : game.display_name || game.source_filename || "Analyzed replay";
}

function isSyntheticGame(game) {
  return String(game?.source_evidence_class || "").startsWith("synthetic");
}

function evidenceLabel(game) {
  const value = String(game?.source_evidence_class || "unknown");
  return value === "observed_replay" ? "Observed replay" : value.startsWith("synthetic") ? "Synthetic tutorial" : "Authority unresolved";
}

export async function render({ root, app }) {
  await app.refreshSummary();
  const { status, recent, players, packs } = app.state;
  const activeDrill = app.getActiveDrill();
  const activeExecution = app.getActiveExecution();
  const priorities = priorityRows(app.state, activeDrill, app);
  const recentRows = recent.slice(0, 6);
  const latestGame = recentRows[0] || null;
  const latestIsSynthetic = isSyntheticGame(latestGame);
  const featuredPlayers = players.slice(0, 4);
  const statusKnown = app.state.loads.status.hasValue;
  const recentKnown = app.state.loads.recent.hasValue;
  const packsKnown = app.state.loads.packs.hasValue;
  const playersKnown = app.state.loads.players.hasValue;

  root.innerHTML = `
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="eyebrow">Master Intel home</span>
        <h1>${activeExecution ? "Resume your interrupted coaching session." : activeDrill ? "Continue your active improvement drill." : "Turn local replays into evidence you can inspect."}</h1>
        <p>${activeExecution ? `Your <strong>${app.safe(activeExecution.plan?.title || activeExecution.teamPlan?.title || "practice operation")}</strong> session is saved at ${app.formatDuration(activeExecution.timerSeconds)}. It resumes paused and approximate until you resync.` : activeDrill ? `Your local focus is <strong>${app.safe(activeDrill.title)}</strong>. Measure: ${app.safe(activeDrill.measure)}. ${activeDrill.sourceEvidenceClass === "observed_replay" ? "It comes from one observed replay and remains a provisional practice hypothesis." : "It is a player-chosen baseline, not a replay-derived diagnosis."}` : "Review one replay locally, choose one bounded practice target, and carry it into your next match. The app keeps observed facts, player reports, and hypotheses distinct."}</p>
        <div class="button-row" style="margin-top:22px">
          ${activeExecution ? '<a class="button primary" href="/hud">Resume paused session</a><a class="button secondary" href="#/practice">Open practice</a>' : activeDrill ? '<a class="button primary" href="#/practice">Continue improvement</a><a class="button secondary" href="/hud">Start guided execution</a>' : '<button class="button primary" id="homeImportReplay">Import replay</button>'}
          <button class="button secondary" id="homeInstallDemo">Explore bundled demo</button>
        </div>
      </div>
      <aside class="hero-side" aria-label="Local intelligence summary">
        <div class="metric-stack">
          <div class="metric-row"><strong>${statusKnown ? Number(status?.replay_count || 0) : "—"}</strong><span>locally analyzed games</span></div>
          <div class="metric-row"><strong>${activeDrill ? "READY" : "NEXT"}</strong><span>${activeDrill ? "practice target selected" : "choose one practice target"}</span></div>
          <div class="metric-row"><strong>${statusKnown ? (status?.offline_only ? "LOCAL" : "?") : "—"}</strong><span>replay processing and core coaching</span></div>
        </div>
      </aside>
    </section>

    ${app.resourceIssueMarkup(["status", "recent", "packs", "players"])}

    <section class="action-grid" aria-label="Primary actions">
      ${activeDrill ? `<a class="action-panel" href="/hud"><span class="action-number" aria-hidden="true">01</span><span><strong>Run the active target</strong><span>Carry ${app.safe(activeDrill.title)} into Guided Execution.</span></span></a>` : '<button class="action-panel" id="actionReplay"><span class="action-number" aria-hidden="true">01</span><span><strong>Review one replay</strong><span>Import a .SC2Replay locally and select which player is you.</span></span></button>'}
      ${activeDrill ? '<button class="action-panel" id="actionReplay"><span class="action-number" aria-hidden="true">02</span><span><strong>Import the next replay</strong><span>Create a chronology-bounded follow-up receipt when the replay is comparable.</span></span></button>' : recentKnown && recentRows.length ? `<a class="action-panel" href="#/replay/${encodeURIComponent(latestGame.case_id)}"><span class="action-number" aria-hidden="true">02</span><span><strong>${latestIsSynthetic ? "Explore the tutorial boundary" : "Choose one practice target"}</strong><span>${latestIsSynthetic ? "The latest case is a synthetic walkthrough. Import a real replay before using personal coaching." : "Open the latest report and use one correction whose evidence and limits you can inspect."}</span></span></a>` : '<a class="action-panel" href="#/practice"><span class="action-number" aria-hidden="true">02</span><span><strong>Choose one practice target</strong><span>Use a bounded baseline until replay evidence is available.</span></span></a>'}
      ${activeDrill?.sourceCaseId ? `<a class="action-panel" href="#/replay/${encodeURIComponent(activeDrill.sourceCaseId)}"><span class="action-number" aria-hidden="true">03</span><span><strong>Review the source evidence</strong><span>Return to the replay moment and the limits behind this target.</span></span></a>` : '<a class="action-panel" href="/hud"><span class="action-number" aria-hidden="true">03</span><span><strong>Run Guided Execution</strong><span>Carry the target into a match while live player reports retain tactical authority.</span></span></a>'}
    </section>

    <section class="summary-grid" aria-label="Data status">
      <article class="summary-card"><span>Recent games</span><strong>${recentKnown ? recent.length : "—"}</strong><small>${recentKnown ? "stored locally" : "unavailable, not empty"}</small></article>
      <article class="summary-card"><span>Active target</span><strong style="font-size:18px">${activeDrill ? app.safe(activeDrill.title) : "Not selected"}</strong><small>${activeDrill ? "saved on this device" : "choose one before guided execution"}</small></article>
      <article class="summary-card"><span>Data freshness</span><strong style="font-size:18px">${statusKnown ? app.safe(app.formatDate(status?.latest_local_data)) : "—"}</strong><small>latest local import</small></article>
      <article class="summary-card"><span>Privacy</span><strong style="color:${statusKnown ? "var(--green)" : "var(--red)"}">${statusKnown ? "Local by default" : "Status unavailable"}</strong><small>no cloud account required for core journeys</small></article>
    </section>

    <section class="content-grid">
      <article class="panel">
        <header class="panel-head"><div><h2>Recent analyzed games</h2><p>Open the stored report without reparsing the original replay.</p></div><button class="button secondary" id="recentImport">Import another</button></header>
        ${recentRows.length ? `<div class="list-stack">${recentRows.map((game) => `<div class="list-row"><a href="#/replay/${encodeURIComponent(game.case_id)}"><strong>${app.safe(gameLabel(game))}</strong><small>${app.safe(game.map || "Unknown map")} · ${app.safe(app.formatDuration(game.duration))} · ${app.safe(app.formatDate(game.imported_at))}</small></a><span class="badge ${app.resourceStale("recent") || game.source_evidence_class !== "observed_replay" ? "warn" : "good"}">${app.resourceStale("recent") ? "Last loaded" : evidenceLabel(game)}</span></div>`).join("")}</div>` : !recentKnown ? `<div class="notice danger"><strong>Replay library unavailable — not empty.</strong><p>Retry local data before importing or diagnosing from this screen.</p></div>` : `<div class="empty-state"><strong>No replay intelligence yet.</strong><p>Import one replay to create the first durable local case.</p><button class="button primary" id="emptyImportReplay">Import replay</button></div>`}
      </article>

      <article class="panel">
        <header class="panel-head"><div><h2>${activeDrill ? "Your current improvement priority" : "Next setup steps"}</h2><p>${activeDrill ? "One active target remains primary until you replace or clear it." : "Complete the local evidence loop before treating any advice as personal."}</p></div><a class="button ${activeDrill ? "primary" : "secondary"}" href="#/practice">${activeDrill ? "Continue improvement" : "Practice"}</a></header>
        <div class="list-stack">${priorities.map((row, index) => `<div class="priority-row"><span class="priority-rank">${index + 1}</span><span><strong>${app.safe(row[0])}</strong><small>${app.safe(row[1])}</small></span></div>`).join("")}</div>
      </article>
    </section>

    <details class="panel reference-library-disclosure">
      <summary><span><span class="eyebrow">Optional reference tools</span><strong>Inspect player records and provenance</strong><small>Reference records are context only; they do not calculate a master comparison or create a practice target automatically.</small></span><span class="badge">${playersKnown ? `${players.length} local` : "Unavailable"}</span></summary>
      <div class="reference-library-body"><div class="button-row"><a class="button secondary" href="#/players">Open player library</a><button class="button secondary" id="actionPack">Import player pack</button></div>
      ${featuredPlayers.length ? `<div class="card-grid">${featuredPlayers.map((player) => `<article class="player-card"><div class="badges"><span class="badge">${app.safe(player.race)}</span><span class="badge ${player.identity?.independently_verified ? "good" : "warn"}">${app.safe(player.identity_label)}</span>${player.synthetic ? '<span class="badge warn">Synthetic</span>' : ""}</div><h2>${app.safe(player.display_name)}</h2><p>${app.safe(player.pack_title)} · ${app.safe((player.patch_coverage || []).join(", ") || "Patch coverage not declared")}</p><footer><span class="badge">Publisher claim: ${app.safe(player.publisher_declared_confidence)}</span><a class="button secondary" href="#/player/${encodeURIComponent(player.player_id)}">Open dossier</a></footer></article>`).join("")}</div>` : !playersKnown ? `<div class="notice danger"><strong>Player library unavailable — not empty.</strong><p>Retry local data before installing or importing a replacement.</p></div>` : `<div class="empty-state"><strong>No player records are installed.</strong><p>Import a trusted pack or install the bundled synthetic demonstration.</p><div class="button-row" style="justify-content:center"><button class="button primary" id="emptyInstallDemo">Install demo</button><button class="button secondary" id="emptyImportPack">Import pack</button></div></div>`}
      </div>
    </details>`;

  ["homeImportReplay", "actionReplay", "recentImport", "emptyImportReplay"].forEach((id) => root.querySelector(`#${id}`)?.addEventListener("click", app.chooseReplay));
  ["homeImportPack", "actionPack", "emptyImportPack"].forEach((id) => root.querySelector(`#${id}`)?.addEventListener("click", app.choosePlayerPack));
  ["homeInstallDemo", "emptyInstallDemo"].forEach((id) => root.querySelector(`#${id}`)?.addEventListener("click", app.installDemo));
  app.wireResourceRetry(root);
}
