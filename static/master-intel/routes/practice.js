function prescriptions(state, app) {
  const rows = [];
  if (!state.recent.length) {
    rows.push({ title: "Create a replay baseline", target: "Import and review one complete replay.", measure: "One durable local case", scenario: "Any current matchup", status: "Ready" });
  } else {
    rows.push({ title: "Name the earliest divergence", target: "Identify the first moment where execution no longer matched intent.", measure: "One timestamp + supporting event", scenario: state.recent[0].display_name || "Latest replay", status: "Provisional" });
  }
  if (state.players.length) {
    rows.push({ title: "Choose one compatible reference", target: "Select a master record with matching race and patch coverage.", measure: "One reference player", scenario: state.players[0].display_name, status: "Ready" });
  } else {
    rows.push({ title: "Install reference evidence", target: "Import a trusted player pack or the synthetic demonstration.", measure: "At least one player record", scenario: "Player library", status: "Blocked" });
  }
  rows.push({ title: "Keep the practice target narrow", target: "One behavior, one measurable threshold, one completion rule.", measure: "No more than one active target", scenario: "Next three replays", status: "Ready" });
  return rows;
}

export async function render({ root, app }) {
  await app.refreshSummary();
  const rows = prescriptions(app.state, app);
  root.innerHTML = `
    <section class="route-head">
      <div><span class="eyebrow">Practice prescriptions</span><h1>Convert evidence into one trainable behavior.</h1><p>Practice should be connected to observed weakness, measurable in later replays, and replaceable when the evidence changes.</p></div>
      <button class="button primary" id="practiceImportReplay">Import replay</button>
    </section>
    <section class="card-grid">${rows.map((row, index) => `
      <article class="practice-card">
        <div class="badges"><span class="badge">Priority ${index + 1}</span><span class="badge ${row.status === "Blocked" ? "danger" : row.status === "Provisional" ? "warn" : "good"}">${app.safe(row.status)}</span></div>
        <h2>${app.safe(row.title)}</h2>
        <p>${app.safe(row.target)}</p>
        <div class="list-stack">
          <div class="evidence-row"><div><strong>Measure</strong><small>${app.safe(row.measure)}</small></div></div>
          <div class="evidence-row"><div><strong>Suggested scenario</strong><small>${app.safe(row.scenario)}</small></div></div>
        </div>
        <footer><button class="button secondary" data-practice-dismiss="${index}">Dismiss</button><button class="button primary" data-practice-start="${index}">Set active</button></footer>
      </article>`).join("")}</section>
    <section class="panel" style="margin-top:16px"><header class="panel-head"><div><h2>Evidence boundary</h2><p>These are Milestone 0 workflow prescriptions, not calculated coaching diagnoses.</p></div></header><p class="notice warn">Replay-linked weakness detection and progress measurement arrive after the normalized data model and three-moment debrief.</p></section>`;

  root.querySelector("#practiceImportReplay")?.addEventListener("click", app.chooseReplay);
  root.querySelectorAll("[data-practice-start]").forEach((button) => button.addEventListener("click", () => app.toast("Practice target saved locally for this prototype route.")));
  root.querySelectorAll("[data-practice-dismiss]").forEach((button) => button.addEventListener("click", () => button.closest(".practice-card")?.remove()));
}
