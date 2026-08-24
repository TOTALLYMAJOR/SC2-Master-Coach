import { api } from "./lib/api.js";

const ONBOARDING_KEY = "sc2-master-coach:onboarding:master-intel:v1";
const LAST_REPLAY_KEY = "sc2-master-coach:master-intel:last-replay:v1";
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
  activeRoute: null,
  routeToken: 0,
  lastDialogTrigger: null,
};

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

async function refreshSummary() {
  const results = await Promise.allSettled([api.status(), api.recent(20), api.packs(), api.players()]);
  if (results[0].status === "fulfilled") state.status = results[0].value;
  if (results[1].status === "fulfilled") state.recent = results[1].value.games || [];
  if (results[2].status === "fulfilled") state.packs = results[2].value.packs || [];
  if (results[3].status === "fulfilled") state.players = results[3].value.players || [];
  updateOfflineStatus(results[0]);
  return state;
}

function updateOfflineStatus(result) {
  if (result?.status === "fulfilled" && result.value.offline_only) {
    offlineStatus.className = "intel-status ready";
    offlineStatus.innerHTML = '<span class="status-dot" aria-hidden="true"></span><span>Offline ready · local data only</span>';
  } else if (result?.status === "rejected") {
    offlineStatus.className = "intel-status error";
    offlineStatus.innerHTML = '<span class="status-dot" aria-hidden="true"></span><span>Local service unavailable</span>';
  }
}

function completeOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ completed: true, completedAt: new Date().toISOString() }));
  if (onboarding.open) onboarding.close();
}

function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
  showOnboarding();
}

function showOnboarding() {
  if (!onboarding || onboarding.open) return;
  state.lastDialogTrigger = document.activeElement;
  onboarding.showModal();
  requestAnimationFrame(() => onboarding.querySelector("[data-onboarding-action]")?.focus());
}

function maybeShowOnboarding() {
  if (!localStorage.getItem(ONBOARDING_KEY)) showOnboarding();
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
  requestAnimationFrame(() => messageDialogClose.focus());
}

function closeMessage() {
  if (messageDialog.open) messageDialog.close();
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
    await refreshSummary();
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
    sessionStorage.setItem(LAST_REPLAY_KEY, JSON.stringify(analysis));
    completeOnboarding();
    await refreshSummary();
    toast("Replay analyzed and stored locally.");
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
    await refreshSummary();
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
    if (!replay?.case?.id) return;
    sessionStorage.setItem(LAST_REPLAY_KEY, JSON.stringify(replay));
    await refreshSummary();
    navigate("replay", replay.case.id);
  } catch (_) {
    // A launch-context failure must not block the local home screen.
  }
}

function getStoredReplay() {
  try { return JSON.parse(sessionStorage.getItem(LAST_REPLAY_KEY) || "null"); }
  catch (_) { return null; }
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
  chooseReplay,
  choosePlayerPack,
  installDemo,
  resetOnboarding,
  showMessage,
  closeMessage,
  toast,
  getStoredReplay,
  formatDate,
  formatDuration,
  initials,
  onboardingKey: ONBOARDING_KEY,
};

window.MasterIntel = app;
replayInput.addEventListener("change", () => handleReplayFile(replayInput.files?.[0]));
packInput.addEventListener("change", () => handlePackFile(packInput.files?.[0]));
onboarding.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-onboarding-action]");
  if (!button) return;
  const action = button.dataset.onboardingAction;
  if (action === "replay") chooseReplay();
  if (action === "pack") choosePlayerPack();
  if (action === "demo") await installDemo();
  if (action === "later") { completeOnboarding(); navigate("home"); }
});
onboarding.addEventListener("close", () => state.lastDialogTrigger?.focus?.());
messageDialog.addEventListener("close", () => state.lastDialogTrigger?.focus?.());
messageDialogClose.addEventListener("click", closeMessage);
window.addEventListener("hashchange", renderRoute);
window.addEventListener("storage", (event) => { if (event.key === ONBOARDING_KEY && !event.newValue) showOnboarding(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && messageDialog.open) closeMessage(); });

async function boot() {
  await refreshSummary();
  if (!location.hash) history.replaceState(null, "", "#/home");
  await renderRoute();
  maybeShowOnboarding();
  await handleLaunchContext();
}

boot();
