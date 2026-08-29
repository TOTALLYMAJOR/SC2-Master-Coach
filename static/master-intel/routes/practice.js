let statusMessage = "";

const CORRECTION_DRILLS = {
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
    measure: "No non-cap supply-block window appears before 5:00 in the next replay",
  },
  PRODUCTION_IDLE_EXPOSURE: {
    id: "production-cadence-five",
    title: "Rehearse one repeatable production cadence",
    target: "Cycle through available producers before adding build complexity.",
    measure: "Next replay contains no explicit 30-second producer gap before 5:00",
  },
};

function prescriptions(state, route, replayDetail, selectedPlayerPid) {
  const requestedCaseId = route?.query?.get("replay") || null;
  const requestedPlayerId = route?.query?.get("reference") || null;
  const latest = requestedCaseId
    ? state.recent.find((game) => String(game.case_id) === requestedCaseId)
    : state.recent[0];
  const requestedPlayer = requestedPlayerId
    ? state.players.find((player) => String(player.player_id) === requestedPlayerId)
    : null;
  const rows = [];

  if (latest) {
    const replayName = latest.display_name || latest.source_filename || "Latest analyzed replay";
    const correction = replayDetail?.learning?.one_priority_correction || {};
    const drill = CORRECTION_DRILLS[correction.code];
    const evidenceClass = replayDetail?.analysis?.source?.evidence_class || replayDetail?.learning?.source_evidence_class || "unknown";
    if (selectedPlayerPid && evidenceClass !== "observed_replay") {
      rows.push({
        id: "synthetic-tutorial-boundary",
        type: "review_task",
        title: "Synthetic tutorial cannot create personal coaching",
        target: "Import a real .SC2Replay before activating a replay-derived execution drill.",
        why: "Generated demo values are tutorial context, not observed replay evidence.",
        source: `Synthetic local tutorial: ${replayName} · personal coaching withheld`,
        sourceLabel: `Synthetic tutorial: ${replayName}`,
        sourceCaseId: latest.case_id ? String(latest.case_id) : null,
        reviewHref: `#/replay/${encodeURIComponent(latest.case_id || "")}`,
        reviewLabel: "Review tutorial boundary",
        measure: "One real replay imported and player identity selected",
        successCriterion: "Observed replay evidence available",
        scenario: replayName,
        evidenceStatus: "withheld",
      });
    } else if (selectedPlayerPid && drill && correction.status === "provisional" && correction.evidence_anchor?.status === "calculated") {
      rows.push({
        ...drill,
        type: "execution_drill",
        focusCode: correction.code,
        successCriterion: drill.measure,
        why: `${correction.action} This is a bounded hypothesis from the selected player's replay facts, not an expert-validated verdict.`,
        source: `Selected player ${selectedPlayerPid} in local replay: ${replayName} · ${correction.selection_basis || "earliest local signal"}`,
        sourceLabel: `Selected player ${selectedPlayerPid} · ${replayName}`,
        sourceCaseId: latest.case_id ? String(latest.case_id) : null,
        playerPid: String(selectedPlayerPid),
        scenario: "Next 1v1 practice game",
        evidenceStatus: "provisional",
        sourceEvidenceClass: "observed_replay",
        evidenceAnchorStatus: "calculated",
      });
    } else if (!selectedPlayerPid) {
      rows.push({
        id: "choose-replay-player",
        type: "review_task",
        title: "Identify your player in this replay",
        target: "Choose which replay player is you before the app produces personal coaching.",
        why: "Player order is not identity. Personal guidance remains withheld until you make this local selection.",
        source: `Selected local replay: ${replayName} · personal coaching withheld`,
        sourceLabel: `Selected local replay: ${replayName}`,
        sourceCaseId: latest.case_id ? String(latest.case_id) : null,
        measure: "One explicit replay-player selection",
        successCriterion: "Replay player selected",
        scenario: replayName,
        evidenceStatus: "withheld",
      });
    }
    if (!rows.length || rows[0].type === "review_task") rows.push({
      id: "establish-execution-baseline",
      type: "baseline_collection",
      title: "Establish one execution baseline",
      target: "Follow one chosen opening through its first checkpoint, then report what happened.",
      why: evidenceClass === "observed_replay" ? "The current replay does not support a specific execution correction, so the honest next step is to collect one comparable checkpoint." : "This generic baseline is chosen by the player and is independent of the synthetic tutorial. It does not diagnose the replay.",
      source: evidenceClass === "observed_replay" ? `Selected local replay: ${replayName} · diagnosis withheld` : "Player-chosen generic baseline · not replay-derived",
      sourceLabel: evidenceClass === "observed_replay" ? `Selected local replay: ${replayName}` : "Generic baseline · not replay-derived",
      sourceCaseId: evidenceClass === "observed_replay" && latest.case_id ? String(latest.case_id) : null,
      measure: "One explicit checkpoint report",
      successCriterion: "One checkpoint reported as on track, behind, or plan changed",
      scenario: "Next 1v1 practice game",
      evidenceStatus: "withheld",
      focusCode: "GENERIC_CHECKPOINT_BASELINE",
    });
  } else {
    rows.push({
      id: "establish-execution-baseline",
      type: "baseline_collection",
      title: "Establish one execution baseline",
      target: "Follow one chosen opening through its first checkpoint, then report what happened.",
      why: requestedCaseId ? "The requested replay is not available in the current local library, so it cannot support a practice diagnosis." : "No local replay evidence exists yet, so the product cannot responsibly identify an execution weakness.",
      source: requestedCaseId ? `Requested local replay ${requestedCaseId} unavailable · replay coaching diagnosis withheld` : "Player-selected baseline · replay coaching diagnosis withheld",
      sourceLabel: requestedCaseId ? "Requested replay unavailable" : "Player-selected baseline",
      sourceCaseId: requestedCaseId || null,
      measure: "One explicit checkpoint report",
      successCriterion: "One checkpoint reported as on track, behind, or plan changed",
      scenario: "Next 1v1 practice game",
      evidenceStatus: "withheld",
      focusCode: "GENERIC_CHECKPOINT_BASELINE",
    });
  }

  if (requestedPlayer) {
    rows.push({
      id: "inspect-declared-reference",
      type: "review_task",
      title: "Check whether this reference fits your context",
      target: "Inspect race, patch coverage, provenance, and declared build families before using this player record as context.",
      why: "A local player record is not automatically compatible with your replay, and it cannot create a live coaching target without an explicit compatible build selection.",
      source: `Local player library: ${requestedPlayer.display_name} · comparison and execution drill withheld`,
      sourceLabel: `Local player library: ${requestedPlayer.display_name}`,
      referencePlayerId: requestedPlayer.player_id ? String(requestedPlayer.player_id) : null,
      reviewHref: `#/player/${encodeURIComponent(requestedPlayer.player_id || "")}`,
      reviewLabel: "Inspect reference",
      measure: "Race, patch, provenance, and one declared build family inspected",
      successCriterion: "Reference compatibility inspected; no comparison inferred",
      scenario: requestedPlayer.display_name,
      evidenceStatus: "withheld",
    });
  } else if (requestedPlayerId) {
    rows.push({
      id: "inspect-missing-reference",
      type: "review_task",
      title: "Requested reference is unavailable",
      target: "Return to the player library and choose an available, explicitly labeled reference record.",
      why: "The requested reference cannot support a comparison or practice target because it is not available locally.",
      source: `Requested local reference ${requestedPlayerId} unavailable · comparison withheld`,
      sourceLabel: "Requested reference unavailable",
      referencePlayerId: requestedPlayerId || null,
      reviewHref: "#/players",
      reviewLabel: "Open player library",
      measure: "One available reference selected for inspection",
      successCriterion: "Available reference selected; no comparison inferred",
      scenario: "Local player library",
      evidenceStatus: "withheld",
    });
  }

  rows.push({
    id: "keep-target-narrow",
    type: "baseline_collection",
    title: "Keep the practice target narrow",
    target: "Use one behavior, one measurable threshold, and one completion rule.",
    why: "A narrow target makes later review interpretable even while coaching effectiveness remains unverified.",
    source: "Player-chosen generic baseline · not replay-derived",
    sourceLabel: "Generic baseline · not replay-derived",
    measure: "No more than one active target",
    successCriterion: "One behavior, threshold, and completion rule selected",
    scenario: "Next practice session",
    evidenceStatus: "provisional",
    focusCode: "GENERIC_TARGET_ADHERENCE",
  });

  return rows;
}

function evidenceLabel(drill) {
  if (drill.type === "baseline_collection") return "Not replay-derived";
  return drill.evidenceStatus === "withheld" ? "Evidence withheld" : "Provisional";
}

function focusReportLabel(value) {
  return value === "met" ? "Reported met" : value === "missed" ? "Reported missed" : value === "uncertain" ? "Reported uncertain" : "No report yet";
}

export async function render({ root, route, app }) {
  await app.refreshSummary();
  const requestedCaseId = route?.query?.get("replay") || app.state.recent[0]?.case_id || null;
  let selectedPlayerPid = requestedCaseId ? app.getReplayPlayer(requestedCaseId) : null;
  let replayDetail = null;
  let replayDetailError = null;
  if (requestedCaseId) {
    try {
      replayDetail = await app.api.caseDetail(requestedCaseId);
      selectedPlayerPid = replayDetail.selected_player_pid || null;
    }
    catch (error) { replayDetailError = error; }
  }
  const replayBasisUnavailable = app.resourceUnavailable("recent") || Boolean(replayDetailError && replayDetailError.status !== 404);
  const playerBasisUnavailable = app.resourceUnavailable("players");
  const candidateRows = prescriptions(app.state, route, replayDetail, selectedPlayerPid);
  const rows = candidateRows.filter((row) => {
    if (replayBasisUnavailable && (row.sourceCaseId || row.id === "establish-execution-baseline")) return false;
    if (playerBasisUnavailable && (row.referencePlayerId || row.id === "report-first-checkpoint")) return false;
    return true;
  });
  const activeDrill = app.getActiveDrill();
  const activeExecution = app.getActiveExecution();
  const availableRows = rows.filter((row) => row.id !== activeDrill?.id);
  const canExecuteActive = activeDrill && activeDrill.type !== "review_task";
  const history = app.getPracticeHistory(activeDrill);
  const focusSummary = activeDrill?.focusCode ? history.report?.focusSummary : null;
  const latestReceipt = history.receipts.at(-1) || null;
  const latestReplayFollowup = history.replayFollowups.at(-1) || null;
  const progressionHorizon = history.report?.horizon || null;
  const distinctMetReplayFollowups = new Set(
    history.replayFollowups
      .filter((row) => row?.status === "met" && row.targetCaseId)
      .map((row) => row.targetCaseId),
  ).size;
  const receiptReports = Array.isArray(latestReceipt?.checkpointReports) ? latestReceipt.checkpointReports : [];
  const receiptFocusReports = receiptReports.filter((row) => row?.focusReport).length;
  const replayFollowupAction = latestReplayFollowup && latestReplayFollowup.status === "met" && distinctMetReplayFollowups >= 2
    ? { title: "Review or replace this target", instruction: "Two distinct later comparable replays met the criterion. Inspect both receipts, then deliberately keep or replace the target. This is readiness for your decision, not proof of improvement." }
    : latestReplayFollowup ? ({
    met: { title: "One replay follow-up met the criterion", instruction: "Inspect the receipt, then repeat or deliberately replace the target. One replay is not durable improvement proof." },
    missed: { title: "The replay signal recurred", instruction: "Keep the target active and review the observed window before the next attempt." },
    "needs-report": { title: "Add the missing player explanation", instruction: "The replay signal is observed, but the full criterion still needs your report about intent or cause." },
    "not-observed": { title: "The trigger was not observed", instruction: "Run another comparable attempt; this replay could not evaluate the response to the target condition." },
  })[latestReplayFollowup.status] : null;
  const nextFocusAction = replayFollowupAction || focusSummary?.recommendation || {
    title: activeDrill?.focusCode ? "Create the first comparable report" : "Report the first plan checkpoint",
    instruction: activeDrill?.focusCode ? "Run Guided Execution and answer the practice-focus prompt at one scheduled checkpoint." : "Run Guided Execution and report one scheduled checkpoint as on track, behind, or plan changed.",
  };
  const latestCheckpoint = receiptReports.at(-1) || null;
  const optionsMarkup = `<div class="practice-options">${availableRows.map((row) => {
    const index = rows.indexOf(row);
    const isReviewTask = row.type === "review_task";
    return `
      <article class="practice-card compact-option">
        <div class="practice-option-copy"><div class="badges"><span class="badge">${row.type === "execution_drill" ? "Execution drill" : row.type === "review_task" ? "Review task" : "Generic baseline"}</span><span class="badge warn">${evidenceLabel(row)}</span></div><h2>${app.safe(row.title)}</h2><p>${app.safe(row.target)}</p></div>
        <details class="practice-details"><summary>Why this target and how to measure it</summary><div class="list-stack">
          <div class="evidence-row"><div><strong>Why</strong><small>${app.safe(row.why)}</small></div></div>
          <div class="evidence-row"><div><strong>Source</strong><small>${app.safe(row.source)}</small></div></div>
          <div class="evidence-row"><div><strong>Measure</strong><small>${app.safe(row.measure)}</small></div></div>
          <div class="evidence-row"><div><strong>Suggested scenario</strong><small>${app.safe(row.scenario)}</small></div></div>
        </div></details>
        <footer>${isReviewTask ? `<a class="button primary" href="${app.safe(row.reviewHref || `#/replay/${encodeURIComponent(row.sourceCaseId || "")}`)}">${app.safe(row.reviewLabel || "Choose replay player")}</a>` : `<button class="button primary" data-practice-start="${index}">${activeDrill ? "Replace active" : "Choose drill"}</button>`}</footer>
      </article>`;
  }).join("") || '<div class="empty-state"><strong>No alternative drills.</strong><p>Keep the current target or import another replay to generate a new bounded option.</p></div>'}</div>`;

  root.innerHTML = `
    <section class="route-head ${activeDrill ? "compact active-practice-head" : ""}">
      <div><span class="eyebrow">Practice command center</span><h1>${activeDrill ? "Continue the active target." : "Carry one improvement target into the next game."}</h1><p>${activeDrill ? `Run ${app.safe(activeDrill.title)}, inspect the next receipt, then decide whether to repeat or replace it.` : "Choose one local drill, keep its authority visible, and return here after guided execution. The active drill persists on this device until you replace or clear it."}</p></div>
      <button class="button secondary" id="practiceImportReplay">${activeDrill ? "Import next replay" : "Import replay"}</button>
    </section>

    ${app.resourceIssueMarkup(["recent", "players"])}
    ${replayDetailError && replayDetailError.status !== 404 ? '<section class="notice danger resource-issue" role="alert"><strong>Replay analysis is temporarily unavailable.</strong> No replay-derived drill was generated, and your saved case was not deleted. <button class="button secondary" id="practiceCaseRetry">Retry replay analysis</button></section>' : ""}
    ${activeExecution ? `<section class="panel active-drill interrupted-execution"><header class="panel-head"><div><span class="eyebrow">Interrupted guided session</span><h2>${app.safe(activeExecution.plan?.title || activeExecution.teamPlan?.title || "Practice operation")}</h2><p>Saved at ${app.formatDuration(activeExecution.timerSeconds)}. Resume paused and approximate; the session's drill snapshot will not be replaced by changes on this screen.</p></div><a class="button primary" href="/hud">Resume paused session</a></header></section>` : ""}
    ${statusMessage ? `<p class="notice drill-status" role="status" aria-live="polite">${app.safe(statusMessage)}</p>` : ""}

    <section class="panel active-drill" aria-labelledby="activeDrillTitle">
      <header class="panel-head">
        <div><span class="eyebrow">Active drill</span><h2 id="activeDrillTitle">${activeDrill ? app.safe(activeDrill.title) : "No active drill yet"}</h2><p>${activeDrill ? app.safe(activeDrill.target) : "Choose one bounded target below. It will remain available after restart on this device."}</p></div>
        ${activeDrill ? `<div class="badges"><span class="badge good">Active locally</span><span class="badge warn">${evidenceLabel(activeDrill)}</span></div>` : '<span class="badge warn">Not selected</span>'}
      </header>
      ${activeDrill ? `
        <div class="active-drill-layout">
          <div class="evidence-row"><div><strong>Measure</strong><small>${app.safe(activeDrill.measure)}</small></div></div>
        </div>
        <details class="practice-details active-drill-details"><summary>Why this drill and where it came from</summary><div class="list-stack"><div class="evidence-row"><div><strong>Why this drill</strong><small>${app.safe(activeDrill.why)}</small></div></div><div class="evidence-row"><div><strong>Evidence source</strong><small>${app.safe(activeDrill.source)}</small></div></div><div class="evidence-row"><div><strong>Suggested scenario</strong><small>${app.safe(activeDrill.scenario)}</small></div></div></div></details>
        <div class="button-row" style="margin-top:16px">
          ${canExecuteActive ? `<a class="button primary" href="/hud" aria-label="Start guided execution for ${app.safe(activeDrill.title)}">Start guided execution</a>` : `<a class="button primary" href="#/replay/${encodeURIComponent(activeDrill.sourceCaseId || "")}">Complete replay task</a>`}
          <button class="button secondary" id="chooseReplacement">Choose a replacement</button>
          <button class="button danger" id="clearActiveDrill">Clear active drill</button>
        </div>
        <p class="notice warn" style="margin-top:16px"><strong>Execution boundary:</strong> Guided Execution carries this target and uses its type to frame the session. Strategic OS and player-reported battlefield evidence still control live decisions; coaching effectiveness remains unverified.</p>
        <section class="practice-continuity" aria-labelledby="practiceContinuityTitle">
          <header><div><span class="eyebrow">Improvement continuity</span><h3 id="practiceContinuityTitle">What happened, and what happens next</h3></div><span class="badge">Player reports only</span></header>
          ${!history.available ? `<div class="notice danger" role="status"><strong>Local practice history is unavailable.</strong><p>${!history.progressionAvailable ? "Checkpoint progression could not be read. " : ""}${!history.receiptsAvailable ? "Session receipts could not be read. " : ""}${!history.replayFollowupsAvailable ? "Replay follow-up receipts could not be read." : ""} The active drill remains unchanged.</p></div>` : `
            <div class="continuity-grid">
              <article><span>${activeDrill.focusCode ? "Latest focus report" : "Latest checkpoint report"}</span><strong>${activeDrill.focusCode ? app.safe(focusReportLabel(focusSummary?.latest?.value)) : app.safe(latestCheckpoint?.status ? String(latestCheckpoint.status).replaceAll("_", " ") : "No report yet")}</strong><small>${activeDrill.focusCode ? (focusSummary?.reported ? `${focusSummary.met} met · ${focusSummary.missed} missed · ${focusSummary.uncertain} uncertain for this target` : "Answer one scheduled focus prompt to establish a baseline") : (receiptReports.length ? `${receiptReports.length} checkpoint report${receiptReports.length === 1 ? "" : "s"} in the latest receipt` : "Report one scheduled checkpoint to establish a baseline")}</small></article>
              <article><span>Completed local sessions</span><strong>${history.receipts.length}</strong><small>${latestReceipt ? `Latest: ${app.safe(app.formatDate(latestReceipt.endedAt))}` : "No completed Guided Execution receipt yet"}</small></article>
              <article><span>Comparable replay follow-ups</span><strong>${history.replayFollowups.length}</strong><small>${latestReplayFollowup ? `${app.safe(latestReplayFollowup.title)} · ${app.safe(app.formatDate(latestReplayFollowup.recordedAt))}` : "No later comparable replay receipt yet"}</small></article>
              <article class="continuity-next"><span>Next best action</span><strong>${app.safe(nextFocusAction.title)}</strong><small>${app.safe(nextFocusAction.instruction)}</small></article>
            </div>
            ${latestReceipt ? `<details class="practice-details session-receipt"><summary>Inspect latest local session receipt</summary><div class="receipt-grid"><div><span>Operation</span><strong>${app.safe(latestReceipt.plan?.title || "Practice operation")}</strong></div><div><span>Matchup</span><strong>${app.safe(latestReceipt.matchup || "Not recorded")}</strong></div><div><span>Elapsed</span><strong>${app.safe(app.formatDuration(latestReceipt.elapsedSeconds))}</strong></div><div><span>Reports</span><strong>${receiptReports.length} plan · ${receiptFocusReports} focus</strong></div></div>${latestReceipt.notes ? `<p class="receipt-notes"><strong>Session note:</strong> ${app.safe(latestReceipt.notes)}</p>` : '<p class="receipt-notes">No session note was saved.</p>'}</details>` : ""}
            ${latestReplayFollowup ? `<details class="practice-details session-receipt"><summary>Inspect latest replay follow-up receipt</summary><div class="receipt-grid"><div><span>Observed result</span><strong>${app.safe(latestReplayFollowup.title)}</strong></div><div><span>Target replay</span><strong>${app.safe(latestReplayFollowup.targetCaseId)}</strong></div><div><span>Criterion</span><strong>${app.safe(latestReplayFollowup.criterion)}</strong></div><div><span>Authority</span><strong>One replay observation</strong></div></div><p class="receipt-notes">${app.safe(latestReplayFollowup.detail)}</p></details>` : ""}
          `}
          <div class="button-row continuity-actions">
            ${activeDrill.sourceCaseId ? `<a class="button secondary" href="#/replay/${encodeURIComponent(activeDrill.sourceCaseId)}">Review source replay</a>` : ""}
            <button class="button secondary" id="practiceNextReplay">Import next replay</button>
          </div>
          <p class="evidence-note">Checkpoint and focus totals are local player reports. Replay follow-up receipts are derived observations from demonstrably later comparable replays; neither proves causality or durable improvement.${progressionHorizon ? ` Analysis horizon: up to ${app.safe(progressionHorizon.dimensionObservationLimit)} recent checkpoint observations inform dimension summaries, while local history retains up to ${app.safe(progressionHorizon.storedEventLimit)} events.` : ""}</p>
        </section>
      ` : `
        <div class="empty-state"><strong>Choose one target before guided execution.</strong><p>No target will be inferred from missing replay or reference evidence.</p><button class="button primary" id="chooseFirstDrill">Choose a drill</button></div>
      `}
    </section>

    ${activeDrill ? `<details class="panel reference-library-disclosure practice-replacements" id="practiceReplacements"><summary><span><span class="eyebrow">Alternative targets</span><strong id="availableDrillsTitle" tabindex="-1">Replace the active drill</strong><small>Open only when the current target no longer fits.</small></span><span class="badge">${availableRows.length} available</span></summary><div class="reference-library-body">${optionsMarkup}</div></details>` : `<section aria-labelledby="availableDrillsTitle" style="margin-top:20px"><div class="route-head compact"><div><span class="eyebrow">Available drills</span><h2 id="availableDrillsTitle" tabindex="-1">Choose the active drill</h2><p>Suggestions are workflow prompts. They remain provisional or withheld rather than claiming expert-validated diagnosis.</p></div></div>${optionsMarkup}</section>`}

    <section class="panel" style="margin-top:16px"><header class="panel-head"><div><h2>Evidence boundary</h2><p>These are workflow prescriptions, not calculated coaching diagnoses.</p></div></header><p class="notice warn">Replay-to-master comparison, expert coaching validity, and measured player improvement remain withheld until compatible evidence and real-player validation exist.</p></section>`;

  statusMessage = "";
  app.wireResourceRetry(root);
  root.querySelector("#practiceCaseRetry")?.addEventListener("click", () => render({ root, route, app }));
  root.querySelector("#practiceImportReplay")?.addEventListener("click", app.chooseReplay);
  root.querySelector("#practiceNextReplay")?.addEventListener("click", app.chooseReplay);

  const focusChoices = () => {
    const disclosure = root.querySelector("#practiceReplacements");
    if (disclosure) disclosure.open = true;
    const heading = root.querySelector("#availableDrillsTitle");
    heading?.scrollIntoView({ block: "start" });
    heading?.focus({ preventScroll: true });
  };
  const rerenderWithFocus = async (selector) => {
    await render({ root, route, app });
    requestAnimationFrame(() => {
      const target = root.querySelector(selector) || root.querySelector("h1");
      if (!target) return;
      if (!target.matches("button,a,input,select,textarea,[tabindex]")) target.tabIndex = -1;
      target.scrollIntoView({ block: "start", inline: "nearest" });
      target.focus({ preventScroll: true });
    });
  };
  root.querySelector("#chooseReplacement")?.addEventListener("click", focusChoices);
  root.querySelector("#chooseFirstDrill")?.addEventListener("click", focusChoices);

  root.querySelector("#clearActiveDrill")?.addEventListener("click", async () => {
    try {
      const cleared = app.clearActiveDrill();
      statusMessage = cleared ? `${cleared.title} was cleared. You can choose it again below.` : "There was no active drill to clear.";
      app.toast(statusMessage);
      await rerenderWithFocus("#availableDrillsTitle");
    } catch (error) {
      app.showMessage("Active drill could not be cleared", `<p>${app.safe(error.message || error)}</p><p>Your locally stored drill was not changed.</p>`, "Local practice storage");
    }
  });

  root.querySelectorAll("[data-practice-start]").forEach((button) => button.addEventListener("click", async () => {
    const candidate = rows[Number(button.dataset.practiceStart)];
    if (!candidate) return;
    const replacing = Boolean(app.getActiveDrill());
    try {
      app.setActiveDrill(candidate);
      statusMessage = replacing ? `${candidate.title} replaced the previous active drill.` : `${candidate.title} is now your active drill.`;
      app.toast(statusMessage);
      await rerenderWithFocus("#activeDrillTitle");
    } catch (error) {
      app.showMessage("Practice drill could not be saved", `<p>${app.safe(error.message || error)}</p><p>No active drill was changed.</p>`, "Local practice storage");
    }
  }));
}
