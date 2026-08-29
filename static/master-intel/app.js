import { api } from "./lib/api.js";

const ONBOARDING_KEY = "sc2-master-coach:onboarding:master-intel:v1";
const LAST_REPLAY_KEY = "sc2-master-coach:master-intel:last-replay:v1";
const ACTIVE_DRILL_KEY = "sc2-master-coach:active-drill:v1";
const REPLAY_PLAYER_KEY = "sc2-master-coach:replay-player:v1";
const ACTIVE_EXECUTION_KEY = "sc2-master-coach:active-execution:v1";
const PROGRESSION_KEY = "sc2-master-coach:progression:v2";
const SESSION_RECEIPTS_KEY = "sc2-master-coach:execution-receipts:v1";
const REPLAY_FOLLOWUP_RECEIPTS_KEY = "sc2-master-coach:replay-followups:v1";
const ACTIVE_DRILL_SCHEMA_VERSION = 2;
const REPLAY_FOCUS_CODES = new Set([
  "WORKER_CONTINUITY_STALL",
  "MINERAL_FLOAT_EXPOSURE",
  "SUPPLY_BLOCK_EXPOSURE",
  "PRODUCTION_IDLE_EXPOSURE",
]);
const ROUTES = {
  home: { module: "./routes/home.js", label: "Home" },
  players: { module: "./routes/players.js", label: "Players" },
  player: { module: "./routes/player.js", label: "Player dossier" },
  replay: { module: "./routes/replay.js", label: "Replay analysis" },
  compare: { module: "./routes/compare.js", label: "Compare" },
  practice: { module: "./routes/practice.js", label: "Practice" },
  settings: { module: "./routes/settings.js", label: "Settings" },
};

const root = document.getElementById("routeContent");
const replayInput = document.getElementById("replayImportInput");
const packInput = document.getElementById("playerPackImportInput");
const onboarding = document.getElementById("onboardingDialog");
const messageDialog = document.getElementById("messageDialog");
const messageDialogTitle = document.getElementById("messageDialogTitle");
const messageDialogKicker = document.getElementById("messageDialogKicker");
const messageDialogBody = document.getElementById("messageDialogBody");
const messageDialogClose = document.getElementById("messageDialogClose");
const toastRegion = document.getElementById("toastRegion");
const offlineStatus = document.getElementById("offlineStatus");

const state = {
  status: null,
  recent: [],
  packs: [],
  players: [],
  loads: Object.fromEntries(["status", "recent", "packs", "players"].map((name) => [name, {
    phase: "idle", hasValue: false, error: null, updatedAt: null,
  }])),
  activeRoute: null,
  routeToken: 0,
  lastDialogTrigger: null,
};

function storageRead(storage, key) {
  try { return storage.getItem(key); }
  catch (_) { return null; }
}

function storageWrite(storage, key, value) {
  try { storage.setItem(key, value); return true; }
  catch (_) { return false; }
}

function storageRemove(storage, key) {
  try { storage.removeItem(key); return true; }
  catch (_) { return false; }
}

function safe(value) {
  return String(value ?? "").replace(/[<>&"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  })[character]);
}

function parseRoute() {
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const [pathPart, queryString = ""] = raw.split("?", 2);
  const parts = pathPart.split("/").filter(Boolean);
  const name = ROUTES[parts[0]] ? parts[0] : "home";
  return { name, params: parts.slice(1).map(decodeURIComponent), query: new URLSearchParams(queryString) };
}

function routePath(name, ...params) {
  return `#/${name}${params.length ? `/${params.map((value) => encodeURIComponent(value)).join("/")}` : ""}`;
}

function navigate(name, ...params) {
  const target = routePath(name, ...params);
  if (location.hash === target) renderRoute();
  else location.hash = target;
}

function updateNavigation(route) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    const active = link.dataset.route === route.name || (route.name === "player" && link.dataset.route === "players") || (route.name === "replay" && link.dataset.route === "home");
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function setBusy(busy) {
  root.setAttribute("aria-busy", String(Boolean(busy)));
}

function loading() {
  root.innerHTML = '<section class="loading-shell"><span>Loading local intelligence…</span></section>';
}

async function renderRoute() {
  const route = parseRoute();
  const descriptor = ROUTES[route.name];
  const token = ++state.routeToken;
  state.activeRoute = route;
  updateNavigation(route);
  setBusy(true);
  loading();
  try {
    const module = await import(descriptor.module);
    if (token !== state.routeToken) return;
    await module.render({ root, route, app });
    if (token !== state.routeToken) return;
    document.title = `SC2 Master Coach — ${descriptor.label}`;
    const heading = root.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    } else root.focus({ preventScroll: true });
  } catch (error) {
    if (token !== state.routeToken) return;
    root.innerHTML = `<section class="route-head"><div><span class="eyebrow">Local route error</span><h1>This screen could not open.</h1><p>${safe(error.message || error)}</p></div></section><section class="panel"><div class="button-row"><button class="button primary" id="routeRetry">Retry</button><a class="button secondary" href="#/home">Return home</a></div></section>`;
    root.querySelector("#routeRetry")?.addEventListener("click", renderRoute);
  } finally {
    if (token === state.routeToken) setBusy(false);
  }
}

const SUMMARY_RESOURCES = {
  status: { load: () => api.status(), validate: (value) => value && typeof value === "object" && typeof value.offline_only === "boolean", select: (value) => value },
  recent: { load: () => api.recent(20), validate: (value) => Array.isArray(value?.games), select: (value) => value.games },
  packs: { load: () => api.packs(), validate: (value) => Array.isArray(value?.packs), select: (value) => value.packs },
  players: { load: () => api.players(), validate: (value) => Array.isArray(value?.players), select: (value) => value.players },
};

function normalizedResourceError(error) {
  return error instanceof Error ? error.message : String(error || "Local data could not be read.");
}

async function refreshSummary(names = Object.keys(SUMMARY_RESOURCES)) {
  const selected = [...new Set(names)].filter((name) => SUMMARY_RESOURCES[name]);
  selected.forEach((name) => { state.loads[name] = { ...state.loads[name], phase: "loading", error: null }; });
  const results = await Promise.allSettled(selected.map((name) => SUMMARY_RESOURCES[name].load()));
  results.forEach((result, index) => {
    const name = selected[index];
    if (result.status === "fulfilled" && SUMMARY_RESOURCES[name].validate(result.value)) {
      state[name] = SUMMARY_RESOURCES[name].select(result.value);
      state.loads[name] = { phase: "ready", hasValue: true, error: null, updatedAt: new Date().toISOString() };
      return;
    }
    const error = result.status === "rejected" ? result.reason : new Error(`The local ${name} response was incomplete.`);
    state.loads[name] = { ...state.loads[name], phase: "error", error: normalizedResourceError(error) };
  });
  updateOfflineStatus();
  return state;
}

function updateOfflineStatus() {
  const load = state.loads.status;
  if (load.phase === "ready" && state.status?.offline_only) {
    offlineStatus.className = "intel-status ready";
    offlineStatus.dataset.compactLabel = "Ready";
    offlineStatus.setAttribute("aria-label", "Local service ready. Data remains on this device.");
    offlineStatus.innerHTML = '<span class="status-dot" aria-hidden="true"></span><span>Offline ready · local data only</span>';
  } else if (load.phase === "error") {
    offlineStatus.className = "intel-status error";
    offlineStatus.dataset.compactLabel = load.hasValue ? "Stale" : "Offline";
    offlineStatus.setAttribute("aria-label", "Local service status unavailable or stale.");
    offlineStatus.innerHTML = `<span class="status-dot" aria-hidden="true"></span><span>${load.hasValue ? "Local service status is stale" : "Local service status unavailable"}</span>`;
  }
}

function resourceUnavailable(name) {
  const load = state.loads[name];
  return Boolean(load && load.phase === "error" && !load.hasValue);
}

function resourceStale(name) {
  const load = state.loads[name];
  return Boolean(load && load.phase === "error" && load.hasValue);
}

function resourceIssueMarkup(names) {
  const labels = { status: "local status", recent: "replay library", packs: "pack list", players: "player library" };
  const failed = names.filter((name) => state.loads[name]?.phase === "error");
  if (!failed.length) return "";
  const stale = failed.every(resourceStale);
  const listed = failed.map((name) => labels[name] || name).join(", ");
  return `<section class="notice ${stale ? "warn" : "danger"} resource-issue" role="${stale ? "status" : "alert"}" tabindex="-1"><strong>${stale ? "Showing last loaded local data." : "Some local data could not be read."}</strong> ${safe(listed)} ${failed.length === 1 ? "is" : "are"} ${stale ? "out of date" : "unavailable — not empty"}. Your files were not changed. <button class="button secondary" data-resource-retry="${safe(failed.join(","))}">Retry local data</button></section>`;
}

function wireResourceRetry(container) {
  container.querySelectorAll("[data-resource-retry]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    await refreshSummary(button.dataset.resourceRetry.split(",").filter(Boolean));
    await renderRoute();
  }));
}

function completeOnboarding() {
  const saved = storageWrite(localStorage, ONBOARDING_KEY, JSON.stringify({ completed: true, completedAt: new Date().toISOString() }));
  if (onboarding.open) onboarding.close();
  syncDialogLock();
  return saved;
}

function resetOnboarding() {
  storageRemove(localStorage, ONBOARDING_KEY);
  showOnboarding();
}

function showOnboarding() {
  if (!onboarding || onboarding.open) return;
  state.lastDialogTrigger = document.activeElement;
  onboarding.showModal();
  syncDialogLock();
  requestAnimationFrame(() => onboarding.querySelector("[data-onboarding-action]")?.focus());
}

function syncDialogLock() {
  document.body.classList.toggle("dialog-open", Boolean(onboarding?.open || messageDialog?.open));
}

function maybeShowOnboarding() {
  if (!storageRead(localStorage, ONBOARDING_KEY)) showOnboarding();
}

function showMessage(title, body, kicker = "Master Intel") {
  state.lastDialogTrigger = document.activeElement;
  messageDialogKicker.textContent = kicker;
  messageDialogTitle.textContent = title;
  if (typeof body === "string") messageDialogBody.innerHTML = body;
  else {
    messageDialogBody.replaceChildren();
    messageDialogBody.append(body);
  }
  messageDialog.showModal();
  syncDialogLock();
  requestAnimationFrame(() => messageDialogClose.focus());
}

function closeMessage() {
  if (messageDialog.open) messageDialog.close();
  syncDialogLock();
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  toastRegion.append(node);
  window.setTimeout(() => node.remove(), 3200);
}

function chooseReplay() {
  replayInput.value = "";
  replayInput.click();
}

function choosePlayerPack() {
  packInput.value = "";
  packInput.click();
}

async function installDemo() {
  try {
    const result = await api.installDemo();
    completeOnboarding();
    toast(`${result.pack.title} installed locally.`);
    navigate("players");
    return result;
  } catch (error) {
    showMessage("Bundled demo could not be installed", `<p>${safe(error.message)}</p>`, "Local demonstration");
    throw error;
  }
}

async function handleReplayFile(file) {
  if (!file) return null;
  if (!file.name.toLowerCase().endsWith(".sc2replay")) {
    showMessage("Choose a StarCraft II replay", "<p>The selected file must end in <strong>.SC2Replay</strong>.</p>", "Replay import");
    return null;
  }
  toast(`Analyzing ${file.name} locally…`);
  try {
    const analysis = await api.importReplay(file);
    const caseId = analysis.case?.id;
    if (!caseId) throw new Error("Replay analysis completed without a local case identifier.");
    const preferenceSaved = storageWrite(sessionStorage, LAST_REPLAY_KEY, JSON.stringify(analysis));
    completeOnboarding();
    toast(preferenceSaved ? "Replay analyzed and stored locally." : "Replay stored locally; temporary browser preferences are unavailable.");
    navigate("replay", caseId);
    return analysis;
  } catch (error) {
    const detail = error.body?.detail ? `<p class="notice warn">${safe(error.body.detail)}</p>` : "";
    showMessage("Replay import failed", `<p>${safe(error.message)}</p>${detail}`, "Local replay analysis");
    return null;
  }
}

async function handlePackFile(file) {
  if (!file) return null;
  toast(`Validating ${file.name} locally…`);
  try {
    const result = await api.importPlayerPack(file);
    completeOnboarding();
    toast(`${result.pack.title} imported.`);
    navigate("players");
    return result;
  } catch (error) {
    showMessage("Player pack was rejected", `<p>${safe(error.message)}</p><p>No local library data was changed.</p>`, "Integrity and identity boundary");
    return null;
  }
}

async function handleLaunchContext() {
  try {
    const context = await api.launchContext();
    const replay = context.replay;
    if (!replay?.case?.id) return null;
    storageWrite(sessionStorage, LAST_REPLAY_KEY, JSON.stringify(replay));
    completeOnboarding();
    return String(replay.case.id);
  } catch (_) {
    // A launch-context failure must not block the local home screen.
    return null;
  }
}

function getStoredReplay() {
  try { return JSON.parse(storageRead(sessionStorage, LAST_REPLAY_KEY) || "null"); }
  catch (_) { return null; }
}

function replayPlayerSelections() {
  try {
    const envelope = JSON.parse(storageRead(localStorage, REPLAY_PLAYER_KEY) || "null");
    return envelope?.schemaVersion === 1 && envelope.players && typeof envelope.players === "object" ? envelope.players : {};
  } catch (_) { return {}; }
}

function getReplayPlayer(caseId) {
  const value = replayPlayerSelections()[String(caseId)];
  return typeof value === "string" && value ? value : null;
}

async function setReplayPlayer(caseId, playerPid) {
  await api.selectCasePlayer(caseId, playerPid);
  const players = replayPlayerSelections();
  players[String(caseId)] = String(playerPid);
  const saved = storageWrite(localStorage, REPLAY_PLAYER_KEY, JSON.stringify({
    schemaVersion: 1,
    storedAt: new Date().toISOString(),
    players,
  }));
  if (!saved) throw new Error("Replay-player selection could not be saved in browser storage.");
  return String(playerPid);
}

function normalizeDrill(drill) {
  if (!drill || typeof drill !== "object") return null;
  const required = ["id", "title", "target", "why", "source", "measure", "scenario", "evidenceStatus"];
  if (required.some((field) => typeof drill[field] !== "string" || !drill[field].trim())) return null;
  const evidenceStatus = drill.evidenceStatus.toLowerCase();
  if (!["provisional", "withheld"].includes(evidenceStatus)) return null;
  const normalized = {
    id: drill.id.trim(),
    title: drill.title.trim(),
    target: drill.target.trim(),
    why: drill.why.trim(),
    source: drill.source.trim(),
    sourceLabel: typeof drill.sourceLabel === "string" && drill.sourceLabel.trim() ? drill.sourceLabel.trim() : drill.source.trim(),
    measure: drill.measure.trim(),
    scenario: drill.scenario.trim(),
    evidenceStatus,
    sourceCaseId: typeof drill.sourceCaseId === "string" && drill.sourceCaseId.trim() ? drill.sourceCaseId.trim() : null,
    sourceEvidenceClass: typeof drill.sourceEvidenceClass === "string" && drill.sourceEvidenceClass.trim() ? drill.sourceEvidenceClass.trim() : null,
    evidenceAnchorStatus: typeof drill.evidenceAnchorStatus === "string" && drill.evidenceAnchorStatus.trim() ? drill.evidenceAnchorStatus.trim() : null,
    referencePlayerId: typeof drill.referencePlayerId === "string" && drill.referencePlayerId.trim() ? drill.referencePlayerId.trim() : null,
    playerPid: typeof drill.playerPid === "string" && drill.playerPid.trim() ? drill.playerPid.trim() : null,
    sourceRace: typeof drill.sourceRace === "string" && drill.sourceRace.trim() ? drill.sourceRace.trim() : null,
    opponentRace: typeof drill.opponentRace === "string" && drill.opponentRace.trim() ? drill.opponentRace.trim() : null,
    sourceMatchup: typeof drill.sourceMatchup === "string" && drill.sourceMatchup.trim() ? drill.sourceMatchup.trim() : null,
    sourcePatch: typeof drill.sourcePatch === "string" && drill.sourcePatch.trim() ? drill.sourcePatch.trim() : null,
    sourceMap: typeof drill.sourceMap === "string" && drill.sourceMap.trim() ? drill.sourceMap.trim() : null,
    sourceDigest: typeof drill.sourceDigest === "string" && drill.sourceDigest.trim() ? drill.sourceDigest.trim() : null,
    sourcePlayedAt: typeof drill.sourcePlayedAt === "string" && drill.sourcePlayedAt.trim() ? drill.sourcePlayedAt.trim() : null,
    evidenceAnchorSecond: Number.isFinite(Number(drill.evidenceAnchorSecond)) ? Number(drill.evidenceAnchorSecond) : null,
    type: ["execution_drill", "review_task", "baseline_collection"].includes(drill.type) ? drill.type : "execution_drill",
    focusCode: typeof drill.focusCode === "string" && drill.focusCode.trim() ? drill.focusCode.trim() : null,
    successCriterion: typeof drill.successCriterion === "string" && drill.successCriterion.trim() ? drill.successCriterion.trim() : drill.measure.trim(),
    createdAt: typeof drill.createdAt === "string" ? drill.createdAt : null,
    updatedAt: typeof drill.updatedAt === "string" ? drill.updatedAt : null,
  };
  const replayDerived = REPLAY_FOCUS_CODES.has(normalized.focusCode) || (normalized.type === "execution_drill" && Boolean(normalized.sourceCaseId));
  if (replayDerived && !(
    normalized.type === "execution_drill"
    && normalized.evidenceStatus === "provisional"
    && normalized.sourceEvidenceClass === "observed_replay"
    && normalized.evidenceAnchorStatus === "calculated"
    && normalized.playerPid
  )) return null;
  return normalized;
}

function getActiveDrill() {
  try {
    const envelope = JSON.parse(storageRead(localStorage, ACTIVE_DRILL_KEY) || "null");
    if (envelope?.schemaVersion !== ACTIVE_DRILL_SCHEMA_VERSION) return null;
    return normalizeDrill(envelope.drill);
  } catch (_) {
    return null;
  }
}

function getActiveExecution() {
  try {
    const envelope = JSON.parse(storageRead(localStorage, ACTIVE_EXECUTION_KEY) || "null");
    if (!(envelope?.schemaVersion === 1 && envelope.session && typeof envelope.session === "object")) return null;
    if (envelope.session.drill && !normalizeDrill(envelope.session.drill)) return null;
    return envelope.session;
  } catch (_) { return null; }
}

function readLocalCollection(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return { available: true, rows: Array.isArray(value) ? value : [] };
  } catch (_) {
    return { available: false, rows: [] };
  }
}

function getPracticeHistory(drill = null) {
  const focusCode = typeof drill === "string" ? drill : drill?.focusCode || null;
  const drillKey = drill && typeof drill !== "string" ? [drill.id || "drill", drill.sourceCaseId || "local", drill.playerPid || "self", drill.createdAt || "current"].join(":") : null;
  const progression = readLocalCollection(PROGRESSION_KEY);
  const receipts = readLocalCollection(SESSION_RECEIPTS_KEY);
  const replayFollowups = readLocalCollection(REPLAY_FOLLOWUP_RECEIPTS_KEY);
  const engine = window.SC2CoachProgression;
  const progressionAvailable = progression.available && Boolean(engine?.analyze && engine?.normalizeEvents);
  const normalized = progressionAvailable ? engine.normalizeEvents(progression.rows) : [];
  return {
    available: progressionAvailable && receipts.available && replayFollowups.available,
    progressionAvailable,
    receiptsAvailable: receipts.available,
    replayFollowupsAvailable: replayFollowups.available,
    report: progressionAvailable ? engine.analyze(normalized, { focusCode, drillKey }) : null,
    receipts: receipts.rows.filter((row) => {
      if (!(row && typeof row === "object" && row.schemaVersion === 1)) return false;
      if (!drill || typeof drill === "string") return true;
      const snapshot = row.drill;
      if (!snapshot || typeof snapshot !== "object") return false;
      if (focusCode && snapshot.focusCode !== focusCode) return false;
      if (drill.sourceCaseId && snapshot.sourceCaseId !== drill.sourceCaseId) return false;
      if (drill.playerPid && snapshot.playerPid !== drill.playerPid) return false;
      if (drill.createdAt && snapshot.createdAt !== drill.createdAt) return false;
      if (!focusCode && drill.title && snapshot.title !== drill.title) return false;
      return true;
    }).slice(-40),
    replayFollowups: replayFollowups.rows.filter((row) => {
      if (!(row && typeof row === "object" && row.schemaVersion === 1)) return false;
      if (!drill || typeof drill === "string") return true;
      if (focusCode && row.focusCode !== focusCode) return false;
      if (drill.sourceCaseId && row.sourceCaseId !== drill.sourceCaseId) return false;
      if (drill.playerPid && row.sourcePlayerPid !== drill.playerPid) return false;
      if (drill.createdAt && row.drillCreatedAt !== drill.createdAt) return false;
      return true;
    }).slice(-40),
  };
}

function recordReplayFollowup(candidate) {
  if (!candidate || !["met", "missed", "needs-report", "not-observed"].includes(candidate.status)) return null;
  const stored = readLocalCollection(REPLAY_FOLLOWUP_RECEIPTS_KEY);
  if (!stored.available) return null;
  const required = ["id", "sourceCaseId", "targetCaseId", "focusCode", "sourcePlayedAt", "targetPlayedAt", "drillCreatedAt"];
  if (required.some((key) => typeof candidate[key] !== "string" || !candidate[key].trim())) return null;
  const existing = stored.rows.find((row) => row?.schemaVersion === 1 && row.id === candidate.id);
  if (existing) return existing;
  const receipt = {
    schemaVersion: 1,
    evaluatorSchema: "replay-followup-v2",
    recordedAt: new Date().toISOString(),
    evidenceClass: "derived_replay_followup_observation",
    outcomeAuthority: "single_observation_not_improvement_proof",
    ...candidate,
  };
  const saved = storageWrite(localStorage, REPLAY_FOLLOWUP_RECEIPTS_KEY, JSON.stringify([...stored.rows, receipt].slice(-100)));
  return saved ? receipt : null;
}

function setActiveDrill(candidate) {
  const previous = getActiveDrill();
  const normalized = normalizeDrill(candidate);
  if (!normalized) throw new Error("The selected practice drill is incomplete and could not be saved.");
  const now = new Date().toISOString();
  const drill = {
    ...normalized,
    createdAt: previous?.id === normalized.id && previous.createdAt ? previous.createdAt : now,
    updatedAt: now,
  };
  const saved = storageWrite(localStorage, ACTIVE_DRILL_KEY, JSON.stringify({
    schemaVersion: ACTIVE_DRILL_SCHEMA_VERSION,
    storedAt: now,
    drill,
  }));
  if (!saved) throw new Error("The active drill could not be saved in browser storage.");
  return drill;
}

function clearActiveDrill() {
  const previous = getActiveDrill();
  if (!storageRemove(localStorage, ACTIVE_DRILL_KEY)) throw new Error("The active drill could not be cleared from browser storage.");
  return previous;
}

function formatDate(value) {
  if (!value) return "No local data yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDuration(value) {
  if (value == null) return "Unknown duration";
  if (typeof value === "string" && value.includes(":")) return value;
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function initials(name) {
  return String(name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

const app = {
  api,
  state,
  safe,
  navigate,
  routePath,
  refreshSummary,
  resourceUnavailable,
  resourceStale,
  resourceIssueMarkup,
  wireResourceRetry,
  chooseReplay,
  choosePlayerPack,
  installDemo,
  resetOnboarding,
  showMessage,
  closeMessage,
  toast,
  getStoredReplay,
  getReplayPlayer,
  setReplayPlayer,
  getActiveDrill,
  getActiveExecution,
  getPracticeHistory,
  recordReplayFollowup,
  setActiveDrill,
  clearActiveDrill,
  formatDate,
  formatDuration,
  initials,
  onboardingKey: ONBOARDING_KEY,
  activeDrillKey: ACTIVE_DRILL_KEY,
  activeExecutionKey: ACTIVE_EXECUTION_KEY,
  progressionKey: PROGRESSION_KEY,
  sessionReceiptsKey: SESSION_RECEIPTS_KEY,
  replayFollowupReceiptsKey: REPLAY_FOLLOWUP_RECEIPTS_KEY,
  replayPlayerKey: REPLAY_PLAYER_KEY,
  activeDrillSchemaVersion: ACTIVE_DRILL_SCHEMA_VERSION,
};

window.MasterIntel = app;
replayInput.addEventListener("change", () => handleReplayFile(replayInput.files?.[0]));
packInput.addEventListener("change", () => handlePackFile(packInput.files?.[0]));
onboarding.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-onboarding-action]");
  if (!button) return;
  const action = button.dataset.onboardingAction;
  if (action === "replay") chooseReplay();
  if (action === "practice") { completeOnboarding(); navigate("practice"); }
  if (action === "demo") await installDemo();
  if (action === "later") { completeOnboarding(); navigate("home"); }
});
onboarding.addEventListener("close", () => { syncDialogLock(); state.lastDialogTrigger?.focus?.(); });
messageDialog.addEventListener("close", () => { syncDialogLock(); state.lastDialogTrigger?.focus?.(); });
messageDialogClose.addEventListener("click", closeMessage);
window.addEventListener("hashchange", renderRoute);
window.addEventListener("storage", (event) => {
  if (event.key === ONBOARDING_KEY && !event.newValue) showOnboarding();
  if ([ACTIVE_DRILL_KEY, ACTIVE_EXECUTION_KEY].includes(event.key) && ["home", "practice"].includes(state.activeRoute?.name)) renderRoute();
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && messageDialog.open) closeMessage(); });

async function boot() {
  const launchCaseId = await handleLaunchContext();
  if (launchCaseId) history.replaceState(null, "", routePath("replay", launchCaseId));
  else if (!location.hash) history.replaceState(null, "", "#/home");
  await renderRoute();
  if (!launchCaseId) maybeShowOnboarding();
}

boot();
