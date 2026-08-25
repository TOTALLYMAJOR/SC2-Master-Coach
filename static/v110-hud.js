(function(){
  "use strict";

  const D=window.SC2StrategyCompilerData;
  const E=window.SC2StrategyEngine;
  const T=window.SC2TeamComposerData;
  const L=window.SC2PlanLibrary;
  const C=window.SC2LiveCheckpoints;
  const P=window.SC2CoachProgression;
  if(!D||!E||!T||!L||!C||!P)return;

  const UI_KEY="sc2-master-coach:v110-hud:v1";
  const REVIEW_KEY="sc2-master-coach:v110-review:v1";
  const HISTORY_KEY="sc2-master-coach:v110-random-history:v1";
  const CHECKPOINT_HISTORY_KEY="sc2-master-coach:checkpoint-history:v1";
  const PROGRESSION_KEY="sc2-master-coach:progression:v2";
  const PROFILE_KEYS=["sc2-master-coach:first-run:v1","sc2-master-coach:profile:v1","sc2-master-coach:strategy-ui:v1"];
  const $=id=>document.getElementById(id);
  const safe=value=>String(value??"").replace(/[<>&\"]/g,ch=>({"<":"&lt;",">":"&gt;","&":"&amp;",'\"':"&quot;"}[ch]));

  let root=null;
  let view="deploy";
  let mode="1v1";
  let plan=null;
  let compilation=null;
  let teamPlan=null;
  let timerSeconds=0;
  let timerRunning=false;
  let timerSynced=false;
  let timerAnchor=performance.now();
  let timerHandle=null;
  let lastEngineSecond=null;
  let voiceEnabled=true;
  let lastScenario=null;
  let spokenPrep=new Set();
  let checkpointSession=null;
  let renderedCheckpointKey=null;
  let announcedCheckpoints=new Set();
  let previousIds=loadJson(HISTORY_KEY,[]);if(!Array.isArray(previousIds))previousIds=[];
  let coachingMode=["quiet","standard","intensive"].includes(loadJson(UI_KEY,{})?.coachingMode)?loadJson(UI_KEY,{}).coachingMode:"standard";
  let scoutDetails={count:1,location:"unknown",confidence:"confirmed"};
  let overlayReturnFocus=null;
  let lastSpoken={text:"",at:0};

  const state={
    self:rememberedRace(),
    enemy:"Terran",
    ally:"Terran",
    enemy2:"Unknown",
    skill:rememberedSkill(),
    coordination:"Voice-coordinated",
    map:"Unknown"
  };

  const GOAL_WEIGHTS={safe_expand:1.1,three_base_expand:1.8,balanced_macro:1.8,early_pressure:1.5,timing_attack:1.2,air_control:1.0,stable_ground_army:1.35,map_control:1.15,defensive_macro:1.1,surprise:.45};

  const PRINCIPLES={
    safe_expand:"An expansion is safe because the punish window is controlled—not because the clock says expand.",
    three_base_expand:"Future economy is purchased with temporary military weakness; information protects the investment.",
    balanced_macro:"Good macro is the conversion of information into the right mix of workers, production, upgrades, and army.",
    early_pressure:"Pressure succeeds when it forces a costly response; damage is optional.",
    timing_attack:"A timing is a temporary relationship between two armies, not a timestamp.",
    air_control:"Air units often purchase information and response range before they purchase damage.",
    stable_ground_army:"Expensive core units are systems of obligations: screen, vision, reinforcement, and retreat.",
    map_control:"Control is valuable when it changes where the opponent may safely move, expand, or reinforce.",
    defensive_macro:"A successful defense creates advantage only when you recognize when to stop defending and start scaling.",
    surprise:"Deception matters only while the opponent still believes the false story—and only if you have an exit when they stop believing it."
  };

  const SIGNAL_HELP={
    reaper:"Reaper seen. This is scouting/pressure evidence, not automatic proof of an all-in.",
    normal_natural:"Natural confirmed. This proves an economic floor, not that production is harmless.",
    no_natural:"No natural. Concentrated aggression or hidden investment becomes more plausible; greed needs renewed evidence.",
    extra_production:"Production increased. The window for slow investments to pay back is shrinking.",
    move_out:"Move-out confirmed. Immediate timing evidence overrides luxury spending.",
    starport:"Starport or air tech seen. Add only the minimum coverage until the actual use is known.",
    factory:"Factory seen. Control, harassment, or a push are now credible branches.",
    fast_third:"Fast third confirmed. Opponent economy creates permission to match scaling or pressure exposed territory.",
    hidden_tech:"Technology is unresolved. Missing information should lower confidence before irreversible spending.",
    turtle:"Static defense confirmed. Attack the map and economy instead of feeding the fortified location."
  };

  const SHELL_NAV=[
    {id:"deploy",label:"Mission Control",code:"PREP-01"},
    {id:"hud",label:"Live Coach",code:"EXEC-02"},
    {id:"spellbook",label:"Doctrine Lab",code:"STUDY-03"},
    {id:"review",label:"Debrief",code:"LEARN-04"}
  ];

  function loadJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch(_e){return fallback}}
  function saveJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_e){return false}}
  function loadText(key,fallback=""){try{return localStorage.getItem(key)??fallback}catch(_e){return fallback}}
  function saveText(key,value){try{localStorage.setItem(key,String(value));return true}catch(_e){return false}}

  function rememberedRace(){
    const own=loadText(UI_KEY,"");
    if(own){try{const row=JSON.parse(own);if(["Protoss","Terran","Zerg"].includes(row?.self))return row.self}catch(_e){}}
    for(const key of PROFILE_KEYS){const row=loadJson(key,null);const race=row?.race||row?.selfRace||row?.preferredRace;if(["Protoss","Terran","Zerg"].includes(race))return race}
    return "Protoss";
  }

  function rememberedSkill(){
    for(const key of PROFILE_KEYS){const row=loadJson(key,null),skill=row?.skill||row?.skillLevel||row?.level;if(skill)return skill}
    return "Silver";
  }

  function persistUi(){return saveJson(UI_KEY,{schemaVersion:2,mode,self:state.self,enemy:state.enemy,ally:state.ally,enemy2:state.enemy2,voiceEnabled,coachingMode})}
  function fmt(seconds){seconds=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`}
  function matchupKey(){const L={Protoss:"P",Terran:"T",Zerg:"Z",Unknown:"?"};return `${L[state.self]||"?"}v${L[state.enemy]||"?"}`}
  function currentPlan(){return mode==="1v1"?(plan||E.getState().compilation?.selectedPlan):teamPlan}
  function artFor(race){return D.artFor(race||"Unknown")}

  function mount(){
    root=document.createElement("div");root.id="v110HudShell";root.className="v110-shell";document.body.appendChild(root);
    document.body.classList.remove("strategic-os-default","strategy-default","team-default","team-advanced");document.body.classList.add("v110-hud-default");
    render();wireGlobalKeys();window.addEventListener("beforeunload",persistUi);
  }

  function navIcon(id){
    const common='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" aria-hidden="true"';
    if(id==="deploy")return `<svg ${common}><path d="M4 18 12 4l8 14H4Z"/><path d="M8 14h8M12 9v9"/></svg>`;
    if(id==="hud")return `<svg ${common}><circle cx="12" cy="12" r="3"/><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>`;
    if(id==="spellbook")return `<svg ${common}><path d="M4 5.5c3.2-.8 5.8-.1 8 2v12c-2.2-2.1-4.8-2.8-8-2V5.5ZM20 5.5c-3.2-.8-5.8-.1-8 2v12c2.2-2.1 4.8-2.8 8-2V5.5Z"/></svg>`;
    return `<svg ${common}><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-7"/><circle cx="7" cy="15" r="1"/><circle cx="11" cy="11" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="19" cy="6" r="1"/></svg>`;
  }
  function navButton(id,label,code){const active=view===id||(view==="brief"&&id==="deploy");return `<button data-v110-nav="${id}" class="v110-rail-link ${active?"active":""}" ${active?'aria-current="page"':""}><span class="v110-rail-edge" aria-hidden="true"></span><span class="v110-rail-icon">${navIcon(id)}</span><span class="v110-rail-copy"><strong>${label}</strong><small>${code}</small></span><span class="v110-rail-marker" aria-hidden="true">◂</span></button>`}
  function sessionState(){if(!currentPlan())return {label:"STANDBY",tone:"muted"};if(view!=="hud")return {label:view==="brief"?"BRIEFING":"STUDY",tone:"cyan"};if(timerRunning)return {label:"LIVE",tone:"ok"};return {label:timerSynced?"PAUSED":"READY",tone:timerSynced?"warn":"cyan"}}
  function statusSnapshot(){
    const p=currentPlan(),session=sessionState(),output=p?liveOutput():null,signal=lastScenario?D.getSignal(lastScenario):null;
    return [
      {label:"SESSION",value:session.label,tone:session.tone,dot:true,id:"v110StatusSession"},
      {label:"MODE",value:mode.toUpperCase(),tone:"cyan"},
      {label:"MATCHUP",value:mode==="1v1"?matchupKey():(p?.matchup||"2V2 TEAM")},
      {label:"MATCH CLOCK",value:fmt(timerSeconds),tone:timerSynced?"ok":"warn",id:"v110StatusClock"},
      {label:"PLAN",value:(output?.status||"unassigned").toUpperCase(),tone:planTone(output?.status),dot:Boolean(output),id:"v110StatusPlan"},
      {label:"INTEL",value:signal?.label||lastScenario?.replaceAll("_"," ")||"UNREPORTED",tone:lastScenario?"cyan":"muted",id:"v110StatusIntel"},
      {label:"COACH",value:coachingMode.toUpperCase()},
      {label:"AUDIO",value:voiceEnabled?"ON":"MUTED",tone:voiceEnabled?"ok":"muted",id:"v110StatusAudio"}
    ];
  }
  function planTone(status){return status==="continue"?"ok":status==="modify"?"warn":status?"crit":"muted"}
  function statusCell(row){return `<div class="v110-status-cell"><span class="v110-status-label">${safe(row.label)}</span><strong class="v110-status-value tone-${safe(row.tone||"default")}">${row.dot?'<i class="v110-status-dot" aria-hidden="true"></i>':""}<span${row.id?` id="${row.id}"`:""}>${safe(row.value)}</span></strong></div>`}
  function statusBar(){return `<header class="v110-statusbar" aria-label="Current operation status">${statusSnapshot().map(statusCell).join("")}<span class="v110-status-scan" aria-hidden="true"></span></header>`}
  function commandRail(){return `<aside class="v110-rail"><div class="v110-rail-brand"><div class="v110-rail-insignia" aria-hidden="true"><svg viewBox="0 0 44 44" fill="none"><path d="M22 3 39 13v18L22 41 5 31V13L22 3Z"/><path d="m22 10 10 6v12l-10 6-10-6V16l10-6Z"/><path d="M22 15v14M15 22h14"/></svg></div><div><strong>MASTER COACH</strong><span>COMBAT SYSTEM // ${safe(D.PATCH)}</span></div></div><div class="v110-rail-section">OPERATION MODULES</div><nav class="v110-nav-list" aria-label="Primary navigation">${SHELL_NAV.map(row=>navButton(row.id,row.label,row.code)).join("")}</nav><div class="v110-rail-spacer"></div><section class="v110-rail-block" aria-label="Evidence boundary"><div class="v110-rail-section">STATE AUTHORITY</div><p><i class="v110-status-dot" aria-hidden="true"></i><span>LOCAL-ONLY RUNTIME</span></p><p><i class="v110-status-dot cyan" aria-hidden="true"></i><span>PLAYER-REPORTED INTEL</span></p><small>No direct SC2 process access</small></section><div class="v110-rail-operator"><span class="v110-rail-avatar" aria-hidden="true">${safe(state.self[0])}</span><span><strong>${safe(state.skill)}</strong><small>${safe(state.self)} program</small></span><button class="v110-rail-command" id="v110Command" aria-haspopup="dialog" aria-label="Open command palette">CMD <kbd>Ctrl/⌘ K</kbd></button></div></aside>`}
  function chrome(content){return `<a class="v110-skip" href="#v110Main">Skip to coaching</a><div class="v110-command-shell">${commandRail()}<div class="v110-workspace">${statusBar()}<main class="v110-main" id="v110Main" tabindex="-1">${content}</main></div></div>${overlays()}`}
  function overlays(){return `<div class="v110-overlay" id="v110Palette" role="dialog" aria-modal="true" aria-labelledby="v110PaletteTitle" hidden><section class="v110-palette"><h2 class="v110-sr-only" id="v110PaletteTitle">Command palette</h2><label class="v110-sr-only" for="v110CommandInput">Search commands</label><input id="v110CommandInput" placeholder="Command… e.g. sync timer to 4:25"><div id="v110CommandList"></div></section></div><div class="v110-overlay" id="v110Modal" role="dialog" aria-modal="true" aria-labelledby="v110ModalTitle" hidden><section class="v110-modal"><h2 id="v110ModalTitle"></h2><p id="v110ModalBody"></p><button class="v110-btn primary" id="v110ModalClose">Close</button></section></div><div class="v110-overlay countdown" id="v110Countdown" role="status" aria-live="assertive" aria-atomic="true" hidden><strong id="v110CountNumber">3</strong><span>Match timer synchronization</span></div><div class="v110-toast" id="v110Toast" role="status" aria-live="polite" aria-atomic="true"></div><div class="v110-sr-only" id="v110Urgent" role="alert" aria-live="assertive" aria-atomic="true"></div>`}

  function render(){if(!root)return;const content=view==="deploy"?deployView():view==="brief"?briefView():view==="hud"?hudView():view==="spellbook"?spellbookView():reviewView();root.innerHTML=chrome(content);wireView()}

  function deployView(){return `<section class="v110-hero"><span>Load the mission. Stop browsing builds.</span><h1>Who is on the battlefield?</h1><p>Your race is remembered. Report the opponent—or ally and enemies in 2v2—and Master Coach assigns one curated current-patch operation.</p></section><section class="v110-mode-row"><div class="v110-segmented" aria-label="Game mode"><button data-mode="1v1" aria-pressed="${mode==="1v1"}" class="${mode==="1v1"?"active":""}">1v1</button><button data-mode="2v2" aria-pressed="${mode==="2v2"}" class="${mode==="2v2"?"active":""}">2v2</button></div><button class="v110-help" aria-label="How operation selection works" data-tip="You report who is playing. You do not browse ten builds. Master Coach chooses one valid operation and lets you reroll it.">?</button></section><section class="v110-duel">${raceCard("You","v110Self",state.self,["Protoss","Terran","Zerg"])}<div class="v110-vs"><b>VS</b><span>matchup</span></div>${raceCard("Enemy","v110Enemy",state.enemy,["Terran","Zerg","Protoss","Unknown"])}</section>${mode==="2v2"?`<section class="v110-team-fields"><div class="v110-field"><label for="v110Ally">Ally</label>${selectHtml("v110Ally",state.ally,["Terran","Protoss","Zerg","Unknown"],"Ally race")}</div><div class="v110-field"><label for="v110Enemy2">Enemy 2</label>${selectHtml("v110Enemy2",state.enemy2,["Unknown","Terran","Zerg","Protoss"],"Second enemy race")}</div></section>`:coachingModeField()}${practiceFocusMarkup()}<section class="v110-deploy-cta"><div><strong>${safe(matchupLabel())}</strong><span>No strategy selection required. Random means curated from valid current-patch plans—not arbitrary.</span></div><button class="v110-btn primary mega" id="v110Deploy">Deploy Random Operation →</button></section>`}
  function raceCard(label,id,race,options){return `<article class="v110-race-card"><img src="${safe(artFor(race))}" alt="${safe(race)} race-inspired strategy art"><div class="v110-race-shade"></div><div class="v110-race-copy"><span>${label}</span><strong>${safe(race)}</strong>${selectHtml(id,race,options,`${label} race`)}</div></article>`}
  function selectHtml(id,value,options,label=id){return `<select id="${id}" aria-label="${safe(label)}">${options.map(x=>`<option value="${x}" ${x===value?"selected":""}>${x}</option>`).join("")}</select>`}
  function coachingModeField(){const descriptions={quiet:"Fewer reminders; tactical evidence still interrupts.",standard:"Balanced reminders and tactical interruptions.",intensive:"Earlier cues and denser practice targets."};return `<section class="v110-coach-mode"><label for="v110CoachingMode">Coaching intensity</label><select id="v110CoachingMode">${["quiet","standard","intensive"].map(value=>`<option value="${value}" ${coachingMode===value?"selected":""}>${value[0].toUpperCase()+value.slice(1)}</option>`).join("")}</select><span>${descriptions[coachingMode]}</span></section>`}
  function matchupLabel(){return mode==="1v1"?`${state.self} vs ${state.enemy}`:`${state.self} + ${state.ally} vs ${state.enemy} + ${state.enemy2}`}
  function progressionEvents(){const current=P.normalizeEvents(loadJson(PROGRESSION_KEY,[]));return current.length?current:P.migrateLegacy(loadJson(CHECKPOINT_HISTORY_KEY,[]))}
  function progressionReport(matchup=null){return P.analyze(progressionEvents(),{matchup})}
  function practiceFocusMarkup(){const report=progressionReport(matchupKey());return `<section class="v110-practice-focus"><div><span class="v110-label">Adaptive practice focus · ${safe(report.confidence)} confidence</span><strong>${safe(report.headline)}</strong></div><p>${safe(report.recommendation.instruction)}</p></section>`}

  function briefView(){
    const p=currentPlan();if(!p)return deployView();const context=planContext(p),build=buildRows(p);
    return `<section class="v110-brief-card"><div class="v110-brief-art"><img src="${safe(artFor(state.self))}" alt="${safe(state.self)} strategy art"></div><div class="v110-brief-copy"><div class="v110-badges"><span>${safe(mode==="1v1"?matchupKey():p.matchup)}</span><span>Curated random</span><span>Patch ${D.PATCH}</span>${mode==="1v1"?"<span>Practice guidance · expert review required</span>":""}</div><h1>${safe(p.title)}</h1><p>${safe(p.story)}</p><div class="v110-actions"><button class="v110-btn primary" id="v110Start">Sync 3–2–1 & Start HUD →</button><button class="v110-btn" id="v110Reroll">Reroll Operation</button><button class="v110-btn" id="v110ReadBrief">Read Mission Brief</button></div></div></section><section class="v110-context-grid">${contextCard("Mission",context.mission)}${contextCard("First units' real job",context.unitJob)}${contextCard("Expected response",context.expected)}${contextCard("Pivot",context.pivot)}${contextCard("Failure condition",context.failure)}${contextCard("Unspoken rule",context.unspoken)}</section><section class="v110-build-card"><div class="v110-section-head"><div><span>Execution</span><h2>Build windows with reasons</h2><p>These are tolerant windows. Battlefield evidence outranks the schedule.</p></div><button class="v110-help" aria-label="How timing windows work" data-tip="The start of a window is preparation, not a magical timestamp. If reported evidence invalidates the route, the HUD changes the plan instead of insisting on the old timing.">?</button></div><div class="v110-build-list">${build.map((row,i)=>`<div class="v110-build-row"><time>${fmt(row.start)}–${fmt(row.end)}</time><div><b>${safe(row.action)}</b><span>${safe(row.purpose)}</span></div><em>${i+1}</em></div>`).join("")}</div></section>`
  }
  function contextCard(title,body){return `<article class="v110-context-card"><h3>${title}</h3><p>${safe(body)}</p></article>`}

  function planContext(p){
    if(mode==="2v2")return {mission:`Your role: ${p.youRoleLabel}. Your ally: ${p.allyRoleLabel}. Execute ${p.title} without turning the maneuver into two unrelated fights.`,unitJob:p.youRoleText,expected:`The opponents should be forced to answer this team question: ${p.scout}`,pivot:"If the team cannot create or preserve the intended timing window, stop forcing the story and regroup together.",failure:p.abort,unspoken:teamPrinciple(p.id)};
    const goal=D.getGoal(p.goal||compilation?.request?.goal);const matchup=D.getMatchup(state.self,state.enemy);const abort=(p.branchRules||[]).find(x=>x.status==="abort")||(p.branchRules||[])[0];const early=buildRows(p).find(x=>/scout|stalker|adept|reaper|ling|queen|observer|oracle|phoenix/i.test(x.action))||buildRows(p)[2];
    return {mission:`${goal?.label||"Execute the operation"}. ${goal?.short||p.why}`,unitJob:firstUnitPurpose(p,early),expected:(p.threats||[]).slice(0,2).map(x=>x.label).join(" or ")||matchup?.secondQuestion||"A response that changes the next investment window.",pivot:abort?`${abort.question} If that branch is confirmed: ${abort.action}`:(p.scouting?.[1]?.question||"Renew the read before the next irreversible commitment."),failure:abort?.reason||(p.threats?.[0]?.detail||"The assumptions supporting the operation are no longer true."),unspoken:PRINCIPLES[p.goal]||"Information is useful only while it still predicts the game you are playing."}
  }

  function firstUnitPurpose(p,early){
    if(p.goal==="air_control")return "The first air-capable investment buys recurring information and response range before it is asked to deal damage.";
    if(p.goal==="early_pressure")return "The first force exists to create a credible problem, force spending or movement, and leave alive when the response is sufficient.";
    if(p.goal==="stable_ground_army")return "The first inexpensive units become the screen that protects the expensive core, vision, and retreat path later.";
    if(p.goal==="three_base_expand"||p.goal==="safe_expand")return "The first mobile units buy information and time so the economic investment becomes legal; preserve them instead of donating them for marginal damage.";
    return early?`${early.action}: ${early.purpose}`:"The first units create information, warning, and strategic options before the expensive commitment."
  }

  function teamPrinciple(id){const rows={"false-front":"A threat can defend an expansion without dealing damage; attention and army displacement are resources.","hammer-anvil":"Two armies become one tactic only when they force the same opponent into incompatible responses.","lantern-blade":"Information has combat value when one ally converts it into a better fight for the other.","siege-harvest":"Containment succeeds when the opponent spends to regain movement while your team spends to grow.","two-doors":"The strongest target is often the one the opponent cannot cover after the first rotation.","hold-door":"The hold creates advantage only after you confirm the rush is actually over."};return rows[id]||"Team strategy is a division of strategic labor: each player should know which problem they are creating for the opponent."}
  function buildRows(p){return mode==="2v2"?(p.yourBuild||[]):(p.buildWindows||[]).map(x=>({start:x.start??x.earliestSecond??0,end:x.end??x.latestSecond??x.start??0,action:x.action,purpose:x.purpose||"Execute the current operation."}))}

  function activeCheckpoint(){return C.current(checkpointSession,timerSeconds)}
  function checkpointMarkup(){
    if(!checkpointSession)return "";
    const current=activeCheckpoint();
    if(!current)return `<section class="v110-checkpoint complete"><div><span class="v110-label">Practice checkpoints</span><strong>All scheduled checkpoints reported</strong><p>Continue from battlefield evidence and the active plan.</p></div></section>`;
    if(current.kind==="directive")return `<section class="v110-checkpoint tactical"><div><span class="v110-label">${current.directive.requiresConfirmation?"Verify report · benchmark unchanged":"Benchmark paused · tactical evidence active"}</span><strong>${safe(current.directive.action)}</strong><p>${safe(current.directive.reason)}</p></div><div class="v110-checkpoint-state hold">${safe(current.directive.permission)}</div></section>`;
    const cp=current.checkpoint,primary=cp.primaryProduction,intel=current.directive;
    return `<section class="v110-checkpoint ${safe(current.phase)}" data-checkpoint-key="${safe(cp.id)}"><div class="v110-checkpoint-copy"><span class="v110-label">${current.phase==="upcoming"?"Upcoming":"Report checkpoint"} · ${safe(cp.profile)} tolerance</span><strong>${fmt(cp.at)} · ${safe(cp.summary)}</strong><p>${safe(cp.rationale)}${intel?` <b>Active intel:</b> ${safe(intel.action)}`:""}</p></div><div class="v110-checkpoint-inputs"><label>Actual ${safe(cp.worker.label)}<input id="v110WorkersActual" inputmode="numeric" type="number" min="0" max="120" placeholder="${cp.worker.min}–${cp.worker.max}"></label>${primary?`<label>Actual ${safe(primary.label)}<input id="v110ProductionActual" inputmode="numeric" type="number" min="0" max="30" placeholder="${primary.count}"></label>`:""}</div><div class="v110-checkpoint-actions"><button class="v110-btn primary" data-checkpoint-report="on_track" data-checkpoint-id="${safe(cp.id)}">On track</button><button class="v110-btn" data-checkpoint-report="behind" data-checkpoint-id="${safe(cp.id)}">Behind</button><button class="v110-btn" data-checkpoint-report="changed" data-checkpoint-id="${safe(cp.id)}">Plan changed</button></div></section>`
  }

  function hudView(){
    const p=currentPlan();if(!p)return deployView();const output=liveOutput();
    return `<section class="v110-hud-top"><div><b>${safe(p.title)}</b><span>${safe(mode==="1v1"?matchupKey():p.matchup)} · ${safe(p.source?.kind==="matchup_library"?"Concrete matchup plan":"Compiler fallback")}</span></div><div class="v110-clock"><strong id="v110Clock">${fmt(timerSeconds)}</strong><span id="v110SyncState" class="${timerSynced?"synced":""}">${timerSynced?"SYNCED":"APPROXIMATE"}</span></div><div class="v110-plan-state ${safe(output.status)}"><i aria-hidden="true"></i>${safe(output.status.toUpperCase())}</div></section><section class="v110-fps-grid"><article class="v110-hud-panel"><span class="v110-label">One question</span><div class="v110-question" id="v110Question">${safe(output.question)}</div><p>Report what you observe. Master Coach chooses the strategic branch.</p></article><article class="v110-hud-panel reticle"><div><span class="v110-label">Do now</span><h1 id="v110Action">${safe(output.action)}</h1><p id="v110Reason">${safe(output.reason)}</p></div></article><article class="v110-hud-panel"><span class="v110-label">Primary permission</span><div class="v110-permission ${output.permission==="OPEN"?"open":output.permission==="HOLD"?"hold":""}" id="v110Permission">${safe(output.permission)}</div><p id="v110PermissionWhy">${safe(output.permissionWhy)}</p></article></section><section class="v110-next" id="v110Next">${output.next.map(row=>`<div><time>${fmt(row.start)}–${fmt(row.end)}</time><b>${safe(row.action)}</b></div>`).join("")||"<div><b>No upcoming window compiled.</b></div>"}</section><div id="v110CheckpointHost" role="region" aria-label="Live practice checkpoint" aria-live="polite" aria-atomic="true">${checkpointMarkup()}</div><section class="v110-scenario-box"><div class="v110-scenario-head"><b>Report what you see</b><span>One click reports immediately. Optional detail improves confidence.</span></div><div class="v110-scenarios">${scenarioRows().map((row,i)=>`<button class="v110-scenario ${lastScenario===row.id?"active":""}" aria-pressed="${lastScenario===row.id}" data-signal="${row.id}" data-tip="${safe(SIGNAL_HELP[row.id]||row.tip||"")}"><kbd>${i+1}</kbd>${safe(row.label)}</button>`).join("")}</div>${scoutDetailMarkup()}</section><section class="v110-hud-controls"><button class="v110-btn" id="v110Pause" aria-pressed="${!timerRunning}">${timerRunning?"Pause":"Resume"}</button><button class="v110-btn" data-shift="-10">−10s</button><button class="v110-btn" data-shift="-5">−5s</button><button class="v110-btn" data-shift="-1">−1s</button><button class="v110-btn" id="v110Resync">3–2–1 Sync</button><button class="v110-btn" data-shift="1">+1s</button><button class="v110-btn" data-shift="5">+5s</button><button class="v110-btn" data-shift="10">+10s</button><button class="v110-btn" id="v110Check">Can I Still Do My Plan?</button><button class="v110-btn" id="v110Voice" aria-pressed="${voiceEnabled}">Audio ${voiceEnabled?"On":"Off"}</button></section>`
  }

  function scoutDetailMarkup(){return `<details class="v110-scout-detail"><summary>Scout detail (optional)</summary><div><label for="v110ScoutCount">Count</label><select id="v110ScoutCount"><option value="1" ${scoutDetails.count===1?"selected":""}>1</option><option value="2" ${scoutDetails.count===2?"selected":""}>2</option><option value="3" ${scoutDetails.count===3?"selected":""}>3+</option></select><label for="v110ScoutLocation">Location</label><select id="v110ScoutLocation">${[["unknown","Unknown"],["main","Main"],["natural","Natural"],["third","Third"],["proxy","Proxy"],["map_center","Map center"],["our_side","Our side"],["their_side","Their side"]].map(([value,label])=>`<option value="${value}" ${scoutDetails.location===value?"selected":""}>${label}</option>`).join("")}</select><label for="v110ScoutConfidence">Confidence</label><select id="v110ScoutConfidence"><option value="confirmed" ${scoutDetails.confidence==="confirmed"?"selected":""}>Confirmed</option><option value="likely" ${scoutDetails.confidence==="likely"?"selected":""}>Likely</option><option value="uncertain" ${scoutDetails.confidence==="uncertain"?"selected":""}>Uncertain</option></select></div></details>`}

  function liveOutput(){
    const tactical=C.directive(checkpointSession,timerSeconds);
    if(mode==="1v1"){
      const o=E.currentOutput()||E.evaluate(),primary=permissionFromStatus(o?.planStatus||"continue"),base={status:o?.planStatus||"continue",question:o?.primaryQuestion||"What information changes the next commitment?",action:o?.primaryAction||"Read the battlefield",reason:o?.reason||plan?.why||"Keep the operation legal with fresh evidence.",permission:primary.status,permissionWhy:primary.reason,next:(o?.nextWindows||[]).map(x=>({start:x.earliestSecond,end:x.latestSecond,action:x.label})).slice(0,3)};
      return tactical?{...base,status:tactical.status,question:tactical.question,action:tactical.action,reason:tactical.reason,permission:tactical.permission,permissionWhy:tactical.suppressesMacro?"The scheduled macro benchmark is paused until this evidence expires or the plan is re-confirmed.":"The benchmark remains available, but this evidence changes how it should be executed."}:base
    }
    const base=teamLiveOutput();return tactical?{...base,status:tactical.status,question:tactical.question,action:tactical.action,reason:tactical.reason,permission:tactical.permission,permissionWhy:tactical.suppressesMacro?"The team benchmark is paused while immediate evidence is active.":base.permissionWhy}:base
  }
  function permissionFromStatus(status){if(status==="abort"||status==="hold")return {status:"HOLD",reason:"Immediate threat or invalidated assumptions outrank the scheduled investment."};if(status==="modify")return {status:"CAUTION",reason:"The mission remains valid, but the fast implementation needs a fresh read or more immediate power."};return {status:"OPEN",reason:"The current reported evidence does not invalidate the operation; keep scouting before the next irreversible spend."}}

  function teamLiveOutput(){
    const p=teamPlan,step=currentBuildStep(p?.yourBuild||[],timerSeconds),next=(p?.yourBuild||[]).filter(x=>x.start>timerSeconds).slice(0,3);const base={status:"continue",question:p?.scout||"What enemy choice changes the team timing?",action:step?.action||"Read both enemy openings",reason:step?.purpose||p?.story||"Preserve the team operation.",permission:"OPEN",permissionWhy:"Continue while both allies can preserve the intended team window.",next};
    if(lastScenario==="move_out")return {...base,status:"hold",question:"Where will the combined enemy pressure arrive first?",action:"Collapse home together. Stop luxury spending.",reason:"A confirmed move-out overrides the displacement or economic script.",permission:"HOLD",permissionWhy:"Team survival and reinforcement take priority."};
    if(lastScenario==="no_natural")return {...base,status:"hold",question:"Which opponent is concentrating the missing economy into immediate power?",action:"Cancel exposed greed and cover the threatened ally.",reason:"One-base investment can punish a team plan before its payoff arrives.",permission:"HOLD",permissionWhy:"Do not widen the team's economic footprint until the aggression is understood."};
    if(lastScenario==="extra_production")return {...base,status:"modify",question:"Is the new production attacking or protecting economy?",action:"Delay the next team luxury and synchronize immediate units.",reason:"Higher throughput compresses the time available for the plan to pay back.",permission:"CAUTION",permissionWhy:"Refresh movement before the next expansion or tech spend."};
    if(lastScenario==="fast_third")return {...base,status:"continue",question:"Which exposed lane does the wider enemy economy create?",action:"Continue scaling and pressure the exposed edge without donating units.",reason:"Enemy economy creates time and territory to exploit.",permission:"OPEN",permissionWhy:"Match the scaling or tax the exposed footprint."};
    if(lastScenario==="starport"||lastScenario==="hidden_tech")return {...base,status:"modify",question:"What coverage does the new technology actually require?",action:"Add the minimum team answer and keep the core operation intact.",reason:"Tech evidence changes obligations; over-countering can surrender the plan.",permission:"CAUTION",permissionWhy:"Cover the vulnerable layer and re-scout."};
    return base
  }
  function currentBuildStep(rows,t){return rows.find(x=>t>=x.start&&t<=x.end)||rows.find(x=>t<x.start)||rows.at(-1)||null}

  function spellbookView(){
    const p=currentPlan();if(!p)return `<section class="v110-hero"><span>Study outside the fight</span><h1>Spellbook</h1><p>Deploy an operation first.</p></section>`;const context=planContext(p),assumptions=mode==="1v1"?(p.assumptions||[]):[],threats=mode==="1v1"?(p.threats||[]):[];
    return `<section class="v110-hero compact"><span>Study outside the fight</span><h1>${safe(p.title)}</h1><p>Deep context lives here so the Live HUD can remain a one-glance instrument.</p></section><section class="v110-authority"><strong>Benchmark status: expert review required</strong><span>${safe(p.authority?.evidenceBoundary||C.AUTHORITY.evidenceBoundary)}</span></section><section class="v110-study-grid"><article><h2>Mission story</h2><p>${safe(p.story)}</p><h3>Unspoken strategic principle</h3><p>${safe(context.unspoken)}</p><h3>Why this build exists</h3><p>${safe(p.why||context.mission)}</p><h3>First units' real job</h3><p>${safe(context.unitJob)}</p></article><article><h2>Decision model</h2><h3>Expected response</h3><p>${safe(context.expected)}</p><h3>Pivot</h3><p>${safe(context.pivot)}</p><h3>Failure condition</h3><p>${safe(context.failure)}</p>${assumptions.length?`<h3>Assumptions</h3><ul>${assumptions.map(x=>`<li><b>${safe(x.label)}</b> — ${safe(x.detail)}</li>`).join("")}</ul>`:""}${threats.length?`<h3>Credible punish routes</h3><ul>${threats.map(x=>`<li><b>${safe(x.label)}</b> — ${safe(x.detail)}</li>`).join("")}</ul>`:""}</article></section>`
  }

  function reviewView(){const notes=loadText(REVIEW_KEY,""),report=progressionReport(),weakest=report.weakest;return `<section class="v110-review"><span class="v110-label">No-replay learning loop · ${safe(report.confidence)} confidence</span><h1>Practice progression</h1><p>Your self-reported checkpoints reveal recurring execution leaks without claiming hidden game truth.</p><div class="v110-progress-grid"><article><span>On track</span><strong>${report.accuracy}%</strong><small>${report.eligible} eligible reports</small></article><article><span>Checkpoint streak</span><strong>${report.streaks.checkpointOnTrack}</strong><small>consecutive on-track reports</small></article><article><span>Top focus</span><strong>${safe(weakest?.label||"Establish baseline")}</strong><small>${safe(weakest?.trend.direction||"insufficient evidence")}</small></article></div><section class="v110-next-drill"><span class="v110-label">Next deliberate-practice drill</span><h2>${safe(report.recommendation.title)}</h2><p>${safe(report.recommendation.instruction)}</p></section><label class="v110-review-label" for="v110ReviewNotes">Session notes</label><textarea id="v110ReviewNotes" placeholder="Example: I took the third after seeing the natural, then extra production hit before my Gateways were ready.">${safe(notes)}</textarea><div class="v110-actions"><button class="v110-btn primary" id="v110SaveReview">Save Debrief Locally</button><button class="v110-btn" id="v110OpenAdvanced">Open Advanced Review</button></div></section>`}

  function scenarioRows(){if(state.enemy==="Terran")return [signal("reaper","Reaper"),signal("normal_natural","Normal natural"),signal("extra_production","Extra production"),signal("move_out","Move-out"),signal("starport","Air / tech"),signal("fast_third","Fast third")];if(state.enemy==="Zerg")return [signal("normal_natural","Normal natural"),signal("no_natural","No natural"),signal("extra_production","Army / production"),signal("move_out","Move-out"),signal("hidden_tech","Hidden tech"),signal("fast_third","Fast third")];return [signal("normal_natural","Normal natural"),signal("no_natural","No natural"),signal("extra_production","Extra production"),signal("move_out","Move-out"),signal("hidden_tech","Hidden tech"),signal("fast_third","Fast third")]}
  function signal(id,label){const base=D.getSignal(id);return {id,label,tip:base?.tip||SIGNAL_HELP[id]}}

  function chooseRandomOperation(){state.self=rememberedRace();state.skill=rememberedSkill();lastScenario=null;spokenPrep=new Set();announcedCheckpoints=new Set();renderedCheckpointKey=null;timerSeconds=0;timerRunning=false;timerSynced=false;lastEngineSecond=null;stopTimer();if(mode==="1v1")chooseRandomOneVOne();else chooseRandomTeam();checkpointSession=mode==="1v1"?C.createSession({plan:currentPlan(),race:state.self,opponent:state.enemy,skill:state.skill,coachingMode}):null;previousIds.push(currentPlan()?.id);previousIds=previousIds.filter(Boolean).slice(-8);saveJson(HISTORY_KEY,previousIds);view="brief";render()}
  function weightedGoal(){const rows=D.GOALS.filter(g=>state.enemy!=="Unknown"||!["timing_attack","surprise"].includes(g.id));const total=rows.reduce((n,g)=>n+(GOAL_WEIGHTS[g.id]||1),0);let roll=Math.random()*total;for(const g of rows){roll-=GOAL_WEIGHTS[g.id]||1;if(roll<=0)return g}return rows[0]}
  function chooseRisk(goal){const roll=Math.random();if(goal.id==="surprise")return roll<.55?"balanced":"greedy";return roll<.25?"safe":roll<.88?"balanced":"greedy"}

  function chooseRandomOneVOne(){
    let chosen=null,request=null;
    for(let attempt=0;attempt<12;attempt++){const goal=weightedGoal(),risk=chooseRisk(goal),req={mode:"1v1",selfRace:state.self,opponentRace:state.enemy,goal:goal.id,risk,skillLevel:state.skill,coachStyle:"mentor"},candidates=D.candidates(req).slice().sort((a,b)=>scoreCandidate(b,req)-scoreCandidate(a,req)),preferred=candidates.find(x=>x.risk===risk)||candidates[0];if(preferred&&!previousIds.slice(-2).includes(preferred.id)){chosen=preferred;request=req;break}if(!chosen&&preferred){chosen=preferred;request=req}}
    E.configure(request);compilation=E.compile(request);const base=compilation.selectedPlan||chosen,libraryRows=L.forMatchup(state.self,state.enemy),fresh=libraryRows.filter(row=>!previousIds.slice(-2).includes(row.id)),pool=fresh.length?fresh:libraryRows,standard=pool.filter(row=>row.scenario==="Standard"),program=P.programForSkill(state.skill,progressionReport(matchupKey())),guided=["standard_safe"].includes(program.planPool),developing=program.planPool==="standard_controlled_pressure",eligible=(guided||developing&&Math.random()<.7)&&standard.length?standard:pool,libraryPlan=eligible[Math.floor(Math.random()*eligible.length)]||null;plan=C.adaptLibraryPlan(libraryPlan,base,state.skill);teamPlan=null
  }
  function scoreCandidate(candidate,req){let score=100;if(candidate.risk===req.risk)score+=10;if(candidate.source?.patch===D.PATCH)score+=10;if(previousIds.includes(candidate.id))score-=18;if(/Bronze|Silver/i.test(state.skill)&&candidate.risk==="greedy")score-=12;return score}
  function chooseRandomTeam(){const ctx={me:state.self,ally:state.ally,enemy1:state.enemy,enemy2:state.enemy2,skill:state.skill,coordination:state.coordination,map:state.map},ranked=T.plans(ctx),pool=ranked.filter(x=>x.score>=ranked[0].score-12).slice(0,7),fresh=pool.filter(x=>!previousIds.slice(-2).includes(x.id)),rows=fresh.length?fresh:pool;teamPlan=rows[Math.floor(Math.random()*rows.length)]||ranked[0];plan=null;compilation=null}

  async function synchronize(){const box=$("v110Countdown"),number=$("v110CountNumber");if(!box||!number)return;box.hidden=false;for(const value of ["3","2","1","LIVE"]){number.textContent=value;playEarcon(value==="LIVE"?"good":"info");await wait(650)}box.hidden=true;timerSeconds=0;timerSynced=true;timerRunning=true;timerAnchor=performance.now();lastEngineSecond=null;if(mode==="1v1"){try{E.start();syncEngineClock(true)}catch(_e){}}startTimer();view="hud";render()}
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  function stopTimer(){if(timerHandle){cancelAnimationFrame(timerHandle);timerHandle=null}}
  function syncEngineClock(force=false){if(mode!=="1v1")return;const whole=Math.floor(timerSeconds);if(!force&&whole===lastEngineSecond)return;lastEngineSecond=whole;try{E.setClock(whole);if(force||whole%5===0)E.evaluate()}catch(_e){}}
  function startTimer(){stopTimer();timerAnchor=performance.now();const tick=now=>{if(timerRunning){const delta=Math.max(0,Math.min((now-timerAnchor)/1000,.25));timerSeconds+=delta;timerAnchor=now;syncEngineClock();updateHudDynamic();maybeBuildPrep();maybeCheckpointCue()}else timerAnchor=now;timerHandle=requestAnimationFrame(tick)};timerHandle=requestAnimationFrame(tick)}
  function maybeBuildPrep(){if(!voiceEnabled)return;const rows=buildRows(currentPlan());for(const row of rows){const key=`${row.start}:${row.action}`,delta=row.start-timerSeconds;if(delta>4.5&&delta<=5.5&&!spokenPrep.has(key)){spokenPrep.add(key);speak(`In five seconds, ${row.action}.`);break}}}
  function maybeCheckpointCue(){const current=activeCheckpoint();if(!voiceEnabled||current?.kind!=="checkpoint"||current.phase!=="due"||announcedCheckpoints.has(current.key))return;announcedCheckpoints.add(current.key);speak(`Checkpoint. Target ${current.checkpoint.summary}. Report on track, behind, or plan changed.`)}

  function updateHudDynamic(){if(view!=="hud")return;const clock=$("v110Clock");if(clock&&clock.textContent!==fmt(timerSeconds))clock.textContent=fmt(timerSeconds);const o=liveOutput(),session=sessionState(),signal=lastScenario?D.getSignal(lastScenario):null;setText("v110Question",o.question);setText("v110Action",o.action);setText("v110Reason",o.reason);setText("v110Permission",o.permission);setText("v110PermissionWhy",o.permissionWhy);setStatus("v110StatusClock",fmt(timerSeconds),timerSynced?"ok":"warn");setStatus("v110StatusSession",session.label,session.tone);setStatus("v110StatusPlan",o.status.toUpperCase(),planTone(o.status));setStatus("v110StatusIntel",signal?.label||lastScenario?.replaceAll("_"," ")||"UNREPORTED",lastScenario?"cyan":"muted");const stateNode=root.querySelector(".v110-plan-state");if(stateNode){stateNode.className=`v110-plan-state ${o.status}`;stateNode.innerHTML=`<i aria-hidden="true"></i>${safe(o.status.toUpperCase())}`}const next=$("v110Next");if(next)next.innerHTML=o.next.map(row=>`<div><time>${fmt(row.start)}–${fmt(row.end)}</time><b>${safe(row.action)}</b></div>`).join("")||"<div><b>No upcoming window compiled.</b></div>";renderCheckpointDynamic()}
  function setText(id,text){const node=$(id),value=text||"";if(node&&node.textContent!==value)node.textContent=value}
  function setStatus(id,text,tone){const node=$(id);if(!node)return;setText(id,text);const value=node.parentElement;if(value)value.className=`v110-status-value tone-${tone||"default"}`}

  function checkpointRenderKey(){const current=activeCheckpoint();return current?`${current.key}:${current.phase||"directive"}:${current.directive?.id||""}`:"complete"}
  function renderCheckpointDynamic(force=false){const host=$("v110CheckpointHost");if(!host)return;const key=checkpointRenderKey();if(!force&&key===renderedCheckpointKey)return;renderedCheckpointKey=key;host.innerHTML=checkpointMarkup();wireCheckpoint()}
  function wireCheckpoint(){const host=$("v110CheckpointHost");if(!host)return;renderedCheckpointKey=checkpointRenderKey();host.querySelectorAll("[data-checkpoint-report]").forEach(button=>button.onclick=()=>confirmCheckpoint(button.dataset.checkpointId,button.dataset.checkpointReport))}
  function persistCheckpointResult(result){const legacy=loadJson(CHECKPOINT_HISTORY_KEY,[]),rows=Array.isArray(legacy)?legacy:[],legacySaved=saveJson(CHECKPOINT_HISTORY_KEY,[...rows,{sessionId:checkpointSession?.id,planId:checkpointSession?.planId,matchup:matchupKey(),skill:state.skill,...result.recorded}].slice(-120)),checkpoint=checkpointSession?.checkpoints.find(row=>row.id===result.recorded.checkpointId),event=P.toEvent({session:checkpointSession,checkpoint,result,matchup:matchupKey()}),events=P.upsert(loadJson(PROGRESSION_KEY,[]),event);return saveJson(PROGRESSION_KEY,events)&&legacySaved}
  function confirmCheckpoint(checkpointId,status){const workers=$("v110WorkersActual")?.value??null,production=$("v110ProductionActual")?.value??null,result=C.confirm(checkpointSession,{checkpointId,status,workers,production,second:timerSeconds});if(!result)return;const persisted=persistCheckpointResult(result);renderCheckpointDynamic(true);const message=!persisted?"Recorded for this session; local history is unavailable.":status==="changed"?"Plan reminders paused. Redeploy the operation you are actually playing.":result.recovery?result.recovery.action:"Checkpoint recorded. Continue to the next benchmark.";toast(message);playEarcon(result.recovery?"danger":"good");if(voiceEnabled)speak(shorten(message,22));updateHudDynamic()}

  function readScoutDetails(){return {count:Number($("v110ScoutCount")?.value)||1,location:$("v110ScoutLocation")?.value||"unknown",confidence:$("v110ScoutConfidence")?.value||"confirmed",observedSecond:timerSeconds}}
  function updateScenarioButtons(){root.querySelectorAll(".v110-scenario[data-signal]").forEach(button=>{const active=button.dataset.signal===lastScenario;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))})}
  function reportSignal(id){lastScenario=id;scoutDetails=readScoutDetails();const directive=C.reportEvidence(checkpointSession,id,timerSeconds,scoutDetails);if(mode==="1v1"){try{E.reportEvidence(id,{...scoutDetails},"player_click",scoutDetails.confidence==="uncertain"?.35:scoutDetails.confidence==="likely"?.7:1);E.evaluate()}catch(_e){}}updateScenarioButtons();updateHudDynamic();toast(`Reported: ${D.getSignal(id)?.label||id.replaceAll("_"," ")}`);playEarcon(["move_out","no_natural"].includes(id)?"danger":id==="fast_third"?"good":"info");const o=liveOutput();if(directive?.suppressesMacro||directive?.requiresConfirmation)setText("v110Urgent",`${directive.permission}. ${directive.action}`);if(voiceEnabled)speak(`${o.action}. ${shorten(o.reason,15)}`)}
  function shorten(text,limit){const words=String(text||"").split(/\s+/);return words.slice(0,limit).join(" ")+(words.length>limit?"…":"")}
  function speak(text){if(!voiceEnabled||!("speechSynthesis" in window)||!text)return;const now=Date.now();if(lastSpoken.text===text&&now-lastSpoken.at<3000)return;lastSpoken={text,at:now};try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text),voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/Microsoft.*(Aria|Jenny|Guy|Sonia|Ryan|Christopher)/i.test(v.name))||voices.find(v=>/Natural|Neural/i.test(v.name))||voices.find(v=>/^en/i.test(v.lang))||null;u.rate=.96;u.pitch=.98;u.volume=.96;speechSynthesis.speak(u)}catch(_e){}}
  function readBrief(){const p=currentPlan();if(!p)return;const c=planContext(p);speak(`${p.title}. ${p.story} Your job: ${c.unitJob} Pivot: ${c.pivot} Unspoken rule: ${c.unspoken}`)}
  function playEarcon(type){if(!voiceEnabled)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=new AC(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type="sine";osc.frequency.value=type==="danger"?220:type==="good"?660:440;gain.gain.setValueAtTime(.001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.055,ctx.currentTime+.01);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);osc.start();osc.stop(ctx.currentTime+.2);setTimeout(()=>ctx.close(),260)}catch(_e){}}
  function toggleTimer(){timerRunning=!timerRunning;timerAnchor=performance.now();if(mode==="1v1"){try{timerRunning?E.resume():E.pause()}catch(_e){}}const button=$("v110Pause");if(button){button.textContent=timerRunning?"Pause":"Resume";button.setAttribute("aria-pressed",String(!timerRunning))}}
  function toggleAudio(){voiceEnabled=!voiceEnabled;if(!voiceEnabled&&"speechSynthesis" in window)try{speechSynthesis.cancel()}catch(_e){}persistUi();const button=$("v110Voice");if(button){button.textContent=`Audio ${voiceEnabled?"On":"Off"}`;button.setAttribute("aria-pressed",String(voiceEnabled))}setStatus("v110StatusAudio",voiceEnabled?"ON":"MUTED",voiceEnabled?"ok":"muted");toast(`Coach audio ${voiceEnabled?"enabled":"muted"}`)}
  function shiftTimer(delta){timerSeconds=Math.max(0,timerSeconds+delta);timerSynced=false;timerAnchor=performance.now();lastEngineSecond=null;syncEngineClock(true);render();toast(`Timer ${delta>=0?"+":""}${delta}s · now approximate`)}
  function showView(next){if(next==="hud"&&!currentPlan()){toast("Deploy an operation first.");view="deploy";render();return}view=next;render()}

  function openLegacy(which){stopTimer();root.hidden=true;document.body.classList.remove("v110-hud-default","strategic-os-default","strategy-default","team-default","team-advanced");if(which==="advanced")document.body.classList.add("team-advanced");else if(which==="compiler")document.body.classList.add("strategy-default");else if(which==="team")document.body.classList.add("team-default");else document.body.classList.add("strategic-os-default");ensureReturnButton()}
  function ensureReturnButton(){let button=document.getElementById("v110Return");if(button)return;button=document.createElement("button");button.id="v110Return";button.className="v110-return";button.textContent="Return to Live HUD";button.onclick=()=>{document.body.classList.remove("strategic-os-default","strategy-default","team-default","team-advanced");document.body.classList.add("v110-hud-default");root.hidden=false;button.remove();render()};document.body.appendChild(button)}

  function wireView(){
    root.querySelectorAll("[data-v110-nav]").forEach(b=>b.onclick=()=>showView(b.dataset.v110Nav));const command=$("v110Command");if(command)command.onclick=openPalette;const modalClose=$("v110ModalClose");if(modalClose)modalClose.onclick=()=>closeOverlay("v110Modal");const palette=$("v110Palette");if(palette)palette.onclick=e=>{if(e.target===palette)closeOverlay("v110Palette")};const modal=$("v110Modal");if(modal)modal.onclick=e=>{if(e.target===modal)closeOverlay("v110Modal")};
    if(view==="deploy"){root.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;persistUi();render()});onChange("v110Self",v=>{state.self=v;persistUi();render()});onChange("v110Enemy",v=>{state.enemy=v;persistUi();render()});onChange("v110Ally",v=>{state.ally=v;persistUi();render()});onChange("v110Enemy2",v=>{state.enemy2=v;persistUi();render()});onChange("v110CoachingMode",v=>{coachingMode=v;persistUi();render()});const deploy=$("v110Deploy");if(deploy)deploy.onclick=chooseRandomOperation}
    if(view==="brief"){$("v110Start").onclick=synchronize;$("v110Reroll").onclick=chooseRandomOperation;$("v110ReadBrief").onclick=readBrief}
    if(view==="hud"){root.querySelectorAll("[data-signal]").forEach(b=>b.onclick=()=>reportSignal(b.dataset.signal));root.querySelectorAll("[data-shift]").forEach(b=>b.onclick=()=>shiftTimer(Number(b.dataset.shift)));wireCheckpoint();$("v110Pause").onclick=toggleTimer;$("v110Resync").onclick=synchronize;$("v110Check").onclick=()=>{const o=liveOutput();modalDialog(`Plan status: ${o.status.toUpperCase()}`,`${o.reason} ${o.permissionWhy}`)};$("v110Voice").onclick=toggleAudio;if(timerRunning&&!timerHandle)startTimer()}
    if(view==="review"){const save=$("v110SaveReview");if(save)save.onclick=()=>toast(saveText(REVIEW_KEY,$("v110ReviewNotes").value)?"Debrief saved locally":"Debrief remains in this session; local storage is unavailable");const advanced=$("v110OpenAdvanced");if(advanced)advanced.onclick=()=>openLegacy("advanced")}
  }
  function onChange(id,fn){const node=$(id);if(node)node.onchange=e=>fn(e.target.value)}
  function modalDialog(title,body){const modal=$("v110Modal");if(!modal)return;overlayReturnFocus=document.activeElement;setText("v110ModalTitle",title);setText("v110ModalBody",body);modal.hidden=false;setTimeout(()=>$("v110ModalClose")?.focus(),20)}
  function toast(text){const node=$("v110Toast");if(!node)return;node.textContent=text;node.classList.add("show");clearTimeout(node._hide);node._hide=setTimeout(()=>node.classList.remove("show"),2200)}

  function closeOverlay(id){const overlay=$(id);if(overlay)overlay.hidden=true;const target=overlayReturnFocus;overlayReturnFocus=null;if(target&&typeof target.focus==="function")setTimeout(()=>target.focus(),0)}
  function trapFocus(event,container){if(event.key!=="Tab"||!container||container.hidden)return;const rows=[...container.querySelectorAll("button,input,select,textarea,[href],[tabindex]:not([tabindex='-1'])")].filter(node=>!node.disabled&&!node.hidden);if(!rows.length)return;const first=rows[0],last=rows.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}
  function openPalette(){const palette=$("v110Palette"),input=$("v110CommandInput");if(!palette||!input)return;overlayReturnFocus=document.activeElement;palette.hidden=false;input.value="";renderCommands("");input.oninput=e=>renderCommands(e.target.value);setTimeout(()=>input.focus(),20)}
  function commands(){return [["Deploy random operation","Assign one curated current-patch policy",chooseRandomOperation],["Reroll operation","Replace the current mission without browsing",chooseRandomOperation],["Start 3–2–1 timer sync","Align HUD zero with the StarCraft countdown",async()=>{await synchronize()}],["Pause / resume timer","Toggle the live match clock",toggleTimer],["Can I still do my plan?","Re-evaluate from current reported intel",()=>{const o=liveOutput();showView("hud");setTimeout(()=>modalDialog(`Plan status: ${o.status.toUpperCase()}`,`${o.reason} ${o.permissionWhy}`),0)}],["Report Reaper","Add Reaper evidence",()=>reportSignal("reaper")],["Report no natural","Add no-natural evidence",()=>reportSignal("no_natural")],["Report extra production","Add production-spike evidence",()=>reportSignal("extra_production")],["Report move-out","Add immediate movement evidence",()=>reportSignal("move_out")],["Read mission story","Speak the current operation briefing",readBrief],["Open Spellbook","Show deep build context",()=>showView("spellbook")],["Return to Live HUD","Return to the one-glance command surface",()=>showView("hud")],["Open Strategy Compiler","Open the legacy detailed compiler",()=>openLegacy("compiler")],["Open 2v2 Team Composer","Open the legacy team composer",()=>openLegacy("team")],["Open Advanced Command Center","Open replay, PRO MIND, Spellbook Lab, and telemetry",()=>openLegacy("advanced")]]}
  function renderCommands(query){const list=$("v110CommandList");if(!list)return;const q=String(query||"").trim().toLowerCase(),rows=commands(),filtered=rows.filter(x=>!q||`${x[0]} ${x[1]}`.toLowerCase().includes(q)),time=q.match(/sync.*?(\d+):(\d{1,2})/);let html="";if(time){const seconds=Number(time[1])*60+Number(time[2]);html+=`<button class="v110-command" data-sync="${seconds}"><span>Sync timer to ${fmt(seconds)}</span><small>Set approximate clock</small></button>`}html+=filtered.map(row=>`<button class="v110-command" data-command="${rows.indexOf(row)}"><span>${safe(row[0])}</span><small>${safe(row[1])}</small></button>`).join("");list.innerHTML=html||"<div class=\"v110-empty\">No command found.</div>";list.querySelectorAll("[data-command]").forEach(b=>b.onclick=()=>{const fn=rows[Number(b.dataset.command)][2];$("v110Palette").hidden=true;fn()});const sync=list.querySelector("[data-sync]");if(sync)sync.onclick=()=>{timerSeconds=Number(sync.dataset.sync);timerSynced=false;timerAnchor=performance.now();lastEngineSecond=null;$("v110Palette").hidden=true;view="hud";syncEngineClock(true);render();toast(`Timer set to ${fmt(timerSeconds)} · approximate`)}}

  function wireGlobalKeys(){document.addEventListener("keydown",async e=>{const palette=$("v110Palette"),modal=$("v110Modal");if(palette&&!palette.hidden)trapFocus(e,palette);else if(modal&&!modal.hidden)trapFocus(e,modal);const typing=["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName||"");if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"&&!root.hidden){e.preventDefault();if(palette&&!palette.hidden)closeOverlay("v110Palette");else openPalette();return}if(root.hidden)return;if(e.key==="Escape"){if(palette&&!palette.hidden)closeOverlay("v110Palette");else if(modal&&!modal.hidden)closeOverlay("v110Modal");return}if(typing)return;const key=e.key.toLowerCase();if(key==="s"){e.preventDefault();await synchronize();return}if(key==="r"){chooseRandomOperation();return}if(key==="v"){readBrief();return}if(key==="p"&&currentPlan()){const o=liveOutput();modalDialog(`Plan status: ${o.status.toUpperCase()}`,`${o.reason} ${o.permissionWhy}`);return}if(key==="b"){showView("spellbook");return}if(key==="h"&&currentPlan()){showView("hud");return}if(e.key===" "&&view==="hud"){e.preventDefault();toggleTimer();return}if(/^[1-6]$/.test(e.key)&&view==="hud"){const row=scenarioRows()[Number(e.key)-1];if(row)reportSignal(row.id)}})}

  const saved=loadJson(UI_KEY,null);if(saved&&typeof saved==="object"){if(["1v1","2v2"].includes(saved.mode))mode=saved.mode;if(["Protoss","Terran","Zerg"].includes(saved.self))state.self=saved.self;if(["Protoss","Terran","Zerg","Unknown"].includes(saved.enemy))state.enemy=saved.enemy;if(["Protoss","Terran","Zerg","Unknown"].includes(saved.ally))state.ally=saved.ally;if(["Protoss","Terran","Zerg","Unknown"].includes(saved.enemy2))state.enemy2=saved.enemy2;if(typeof saved.voiceEnabled==="boolean")voiceEnabled=saved.voiceEnabled}
  mount();
})();
