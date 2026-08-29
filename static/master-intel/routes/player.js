function list(values, fallback, app) {
  if (!Array.isArray(values) || !values.length) return `<p class="notice warn">${app.safe(fallback)}</p>`;
  return `<ul>${values.map((value) => `<li>${app.safe(typeof value === "string" ? value : value.label || JSON.stringify(value))}</li>`).join("")}</ul>`;
}

function timingRows(timings, app) {
  if (!Array.isArray(timings) || !timings.length) return '<p class="notice warn">No timing distribution is included in this local pack.</p>';
  return `<div class="timeline">${timings.map((row) => `
    <div class="timeline-row"><time>${app.safe(row.median || row.time || "—")}</time><div><strong>${app.safe(row.label || row.event || "Timing")}</strong><small>${app.safe(row.range || row.note || "Observed local reference")}</small></div></div>`).join("")}</div>`;
}

export async function render({ root, route, app }) {
  await app.refreshSummary();
  const playerId = route.params[0];
  const player = app.state.players.find((row) => row.player_id === playerId);
  if (!player) {
    const unavailable = app.resourceUnavailable("players");
    root.innerHTML = `<section class="route-head"><div><span class="eyebrow">Player dossier</span><h1>${unavailable ? "Player library unavailable." : "Player record not found."}</h1><p>${unavailable ? "The local service could not confirm this record. Your player packs were not changed." : "The pack may have been removed or the player ID is invalid."}</p></div><div class="button-row">${unavailable ? '<button class="button primary" data-resource-retry="players">Retry local data</button>' : ""}<a class="button secondary" href="#/players">Return to players</a></div></section>`;
    app.wireResourceRetry(root);
    return;
  }

  const coverage = player.coverage || {};
  const dossier = player.dossier || {};
  const initials = app.initials(player.display_name);
  const sampleSize = Number(coverage.replay_count || coverage.replays || 0);
  const smallSample = sampleSize > 0 && sampleSize < 5;

  root.innerHTML = `
    <section class="route-head compact">
      <div><span class="eyebrow">Player dossier · local evidence</span><h1>${app.safe(player.display_name)}</h1><p>Every claim is limited to the imported pack and its declared patch coverage.</p></div>
      <div class="button-row"><a class="button secondary" href="#/players">Back to players</a><a class="button primary" href="#/practice?reference=${encodeURIComponent(player.player_id)}">Use in Practice</a></div>
    </section>

    ${smallSample ? '<p class="notice warn"><strong>Small sample:</strong> this dossier contains fewer than five supporting replays. Treat patterns as provisional.</p>' : ""}
    ${player.synthetic ? '<p class="notice warn"><strong>Synthetic demonstration:</strong> these values show product behavior, not claims about a real professional player.</p>' : ""}

    <section class="dossier-layout">
      <aside class="dossier-card identity-card">
        <div class="identity-mark" aria-hidden="true">${app.safe(initials)}</div>
        <h1>${app.safe(player.display_name)}</h1>
        <p>${app.safe(player.race)} reference · ${app.safe(player.pack_title)}</p>
        <div class="badges"><span class="badge ${player.identity?.independently_verified ? "good" : "warn"}">${app.safe(player.identity_label)}</span><span class="badge">Publisher claim: ${app.safe(player.publisher_declared_confidence)}</span>${player.synthetic ? '<span class="badge warn">Synthetic</span>' : ""}</div>
        <div class="stat-grid" style="grid-template-columns:1fr 1fr;margin-top:18px">
          <div class="stat-cell"><span class="stat-label">Replays</span><strong>${sampleSize || "—"}</strong></div>
          <div class="stat-cell"><span class="stat-label">Race</span><strong style="font-size:17px">${app.safe(player.race)}</strong></div>
        </div>
        <p><strong>Aliases</strong><br>${app.safe((player.aliases || []).join(", ") || "None declared")}</p>
        <p><strong>Patch coverage</strong><br>${app.safe((player.patch_coverage || []).join(", ") || "Not declared")}</p>
      </aside>

      <div class="list-stack">
        <article class="dossier-card"><h2>Opening preferences</h2>${list(dossier.opening_preferences, "No opening preference evidence is included.", app)}</article>
        <article class="dossier-card"><h2>Build-order families</h2>${list(dossier.build_families, "No build fingerprints have been supplied yet.", app)}</article>
        <article class="dossier-card"><h2>Timing distributions</h2>${timingRows(dossier.timings, app)}</article>
        <article class="dossier-card"><h2>Economy and production tendencies</h2>${list(dossier.economy_tendencies, "No economy tendency evidence is included.", app)}${list(dossier.production_tendencies, "No production tendency evidence is included.", app)}</article>
        <article class="dossier-card"><h2>Aggression and adaptation profile</h2>${list(dossier.aggression_profile, "No aggression evidence is included.", app)}${list(dossier.map_adaptations, "No map-specific adaptation evidence is included.", app)}</article>
        <article class="dossier-card"><h2>Evidence coverage</h2>
          <div class="stat-grid">
            <div class="stat-cell"><span class="stat-label">Matchups</span><strong style="font-size:17px">${app.safe((coverage.matchups || []).join(", ") || "—")}</strong></div>
            <div class="stat-cell"><span class="stat-label">Maps</span><strong>${Number(coverage.map_count || 0) || "—"}</strong></div>
            <div class="stat-cell"><span class="stat-label">Last local trend</span><strong style="font-size:15px">${app.safe(coverage.last_observed || "Not declared")}</strong></div>
            <div class="stat-cell"><span class="stat-label">Pack</span><strong style="font-size:15px">${app.safe(player.pack_title)}</strong></div>
          </div>
          <p class="notice">This Milestone 0 dossier displays pack-declared evidence. Replay-level drill-down arrives with the local intelligence schema and fingerprint pipeline.</p>
        </article>
      </div>
    </section>`;
  if (app.resourceStale("players")) {
    root.insertAdjacentHTML("afterbegin", app.resourceIssueMarkup(["players"]));
    app.wireResourceRetry(root);
  }
}
