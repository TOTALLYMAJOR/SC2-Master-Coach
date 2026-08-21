(function(){
  "use strict";

  const D=window.SC2StrategyCompilerData;
  const E=window.SC2StrategyEngine;
  const T=window.SC2TeamComposerData;
  if(!D||!E||!T)return;

  const UI_KEY="sc2-master-coach:v110-hud:v1";
  const REVIEW_KEY="sc2-master-coach:v110-review:v1";
  const HISTORY_KEY="sc2-master-coach:v110-random-history:v1";
  const PROFILE_KEYS=["sc2-master-coach:profile:v1","sc2-master-coach:strategy-ui:v1"];
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
  let previousIds=loadJson(HISTORY_KEY,[]);

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

  function loadJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch(_e){return fallback}}
  function saveJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_e){}}

  function rememberedRace(){
    const own=localStorage.getItem(UI_KEY);
    if(own){try{const row=JSON.parse(own);if(["Protoss","Terran","Zerg"].includes(row?.self))return row.self}catch(_e){}}
    for(const key of PROFILE_KEYS){try{const row=JSON.parse(localStorage.getItem(key)||"null");const race=row?.race||row?.selfRace||row?.preferredRace;if(["Protoss","Terran","Zerg"].includes(race))return race}catch(_e){}}
    return "Protoss";
  }

  function rememberedSkill(){
    for(const key of PROFILE_KEYS){try{const row=JSON.parse(localStorage.getItem(key)||"null");const skill=row?.skill||row?.skillLevel;if(skill)return skill}catch(_e){}}
    return "Silver";
  }

  function persistUi(){saveJson(UI_KEY,{mode,self:state.self,enemy:state.enemy,ally:state.ally,enemy2:state.enemy2,voiceEnabled})}
  function fmt(seconds){seconds=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`}
  function matchupKey(){const L={Protoss:"P",Terran:"T",Zerg:"Z",Unknown:"?"};return `${L[state.self]||"?"}v${L[state.enemy]||"?"}`}
  function currentPlan(){return mode==="1v1"?(E.getState().compilation?.selectedPlan||plan):teamPlan}
  function artFor(race){return D.artFor(race||"Unknown")}

  function mount(){
    root=document.createElement("div");root.id="v110HudShell";root.className="v110-shell";document.body.appendChild(root);
    document.body.classList.remove("strategic-os-default","strategy-default","team-default","team-advanced");document.body.classList.add("v110-hud-default");
    render();wireGlobalKeys();window.addEventListener("beforeunload",persistUi);
  }

  function chrome(content){return `<header class="v110-topbar"><div class="v110-brand"><b>SC2 Master Coach // Combat HUD</b><span>Patch ${D.PATCH} · Created by MBMapps</span></div><nav class="v110-nav" aria-label="Primary navigation">${navButton("deploy","Deploy")}${navButton("hud","Live HUD")}${navButton("spellbook","Spellbook")}${navButton("review","Review")}</nav><div class="v110-top-actions"><button class="v110-btn" id="v110Command">Command <kbd>Ctrl/⌘ K</kbd></button></div></header><main class="v110-main">${content}</main>${overlays()}`}
  function navButton(id,label){return `<button data-v110-nav="${id}" class="${view===id||(view==="brief"&&id==="deploy")?"active":""}">${label}</button>`}
  function overlays(){return `<div class="v110-overlay" id="v110Palette" hidden><section class="v110-palette"><input id="v110CommandInput" placeholder="Command… e.g. sync timer to 4:25"><div id="v110CommandList"></div></section></div><div class="v110-overlay" id="v110Modal" hidden><section class="v110-modal"><h2 id="v110ModalTitle"></h2><p id="v110ModalBody"></p><button class="v110-btn primary" id="v110ModalClose">Close</button></section></div><div class="v110-overlay countdown" id="v110Countdown" hidden><strong id="v110CountNumber">3</strong><span>Match timer synchronization</span></div><div class="v110-toast" id="v110Toast"></div>`}

  function render(){if(!root)return;const content=view==="deploy"?deployView():view==="brief"?briefView():view==="hud"?hudView():view==="spellbook"?spellbookView():reviewView();root.innerHTML=chrome(content);wireView()}

  function deployView(){return `<section class="v110-hero"><span>Load the mission. Stop browsing builds.</span><h1>Who is on the battlefield?</h1><p>Your race is remembered. Report the opponent—or ally and enemies in 2v2—and Master Coach assigns one curated current-patch operation.</p></section><section class="v110-mode-row"><div class="v110-segmented"><button data-mode="1v1" class="${mode==="1v1"?"active":""}">1v1</button><button data-mode="2v2" class="${mode==="2v2"?"active":""}">2v2</button></div><button class="v110-help" data-tip="You report who is playing. You do not browse ten builds. Master Coach chooses one valid operation and lets you reroll it.">?</button></section><section class="v110-duel">${raceCard("You","v110Self",state.self,["Protoss","Terran","Zerg"])}<div class="v110-vs"><b>VS</b><span>matchup</span></div>${raceCard("Enemy","v110Enemy",state.enemy,["Terran","Zerg","Protoss","Unknown"])}</section>${mode==="2v2"?`<section class="v110-team-fields"><div class="v110-field"><label>Ally</label>${selectHtml("v110Ally",state.ally,["Terran","Protoss","Zerg","Unknown"])}</div><div class="v110-field"><label>Enemy 2</label>${selectHtml("v110Enemy2",state.enemy2,["Unknown","Terran","Zerg","Protoss"])}</div></section>`:""}<section class="v110-deploy-cta"><div><strong>${safe(matchupLabel())}</strong><span>No strategy selection required. Random means curated from valid current-patch plans—not arbitrary.</span></div><button class="v110-btn primary mega" id="v110Deploy">Deploy Random Operation →</button></section>`}
  function raceCard(label,id,race,options){return `<article class="v110-race-card"><img src="${safe(artFor(race))}" alt="${safe(race)} race-inspired strategy art"><div class="v110-race-shade"></div><div class="v110-race-copy"><span>${label}</span><strong>${safe(race)}</strong>${selectHtml(id,race,options)}</div></article>`}
  function selectHtml(id,value,options){return `<select id="${id}">${options.map(x=>`<option value="${x}" ${x===value?"selected":""}>${x}</option>`).join("")}</select>`}
  function matchupLabel(){return mode==="1v1"?`${state.self} vs ${state.enemy}`:`${state.self} + ${state.ally} vs ${state.enemy} + ${state.enemy2}`}

  function briefView(){
    const p=currentPlan();if(!p)return deployView();const context=planContext(p),build=buildRows(p);
    return `<section class="v110-brief-card"><div class="v110-brief-art"><img src="${safe(artFor(state.self))}" alt="${safe(state.self)} strategy art"></div><div class="v110-brief-copy"><div class="v110-badges"><span>${safe(mode==="1v1"?matchupKey():p.matchup)}</span><span>Curated random</span><span>Patch ${D.PATCH}</span></div><h1>${safe(p.title)}</h1><p>${safe(p.story)}</p><div class="v110-actions"><button class="v110-btn primary" id="v110Start">Sync 3–2–1 & Start HUD →</button><button class="v110-btn" id="v110Reroll">Reroll Operation</button><button class="v110-btn" id="v110ReadBrief">Read Mission Brief</button></div></div></section><section class="v110-context-grid">${contextCard("Mission",context.mission)}${contextCard("First units' real job",context.unitJob)}${contextCard("Expected response",context.expected)}${contextCard("Pivot",context.pivot)}${contextCard("Failure condition",context.failure)}${contextCard("Unspoken rule",context.unspoken)}</section><section class="v110-build-card"><div class="v110-section-head"><div><span>Execution</span><h2>Build windows with reasons</h2><p>These are tolerant windows. Battlefield evidence outranks the schedule.</p></div><button class="v110-help" data-tip="The start of a window is preparation, not a magical timestamp. If reported evidence invalidates the route, the HUD changes the plan instead of insisting on the old timing.">?</button></div><div class="v110-build-list">${build.map((row,i)=>`<div class="v110-build-row"><time>${fmt(row.start)}–${fmt(row.end)}</time><div><b>${safe(row.action)}</b><span>${safe(row.purpose)}</span></div><em>${i+1}</em></div>`).join("")}</div></section>`
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

  function hudView(){
    const p=currentPlan();if(!p)return deployView();const output=liveOutput();
    return `<section class="v110-hud-top"><div><b>${safe(p.title)}</b><span>${safe(mode==="1v1"?matchupKey():p.matchup)}</span></div><div class="v110-clock"><strong id="v110Clock">${fmt(timerSeconds)}</strong><span id="v110SyncState" class="${timerSynced?"synced":""}">${timerSynced?"SYNCED":"APPROXIMATE"}</span></div><div class="v110-plan-state ${safe(output.status)}"><i></i>${safe(output.status.toUpperCase())}</div></section><section class="v110-fps-grid"><article class="v110-hud-panel"><span class="v110-label">One question</span><div class="v110-question" id="v110Question">${safe(output.question)}</div><p>Report what you observe. Master Coach chooses the strategic branch.</p></article><article class="v110-hud-panel reticle"><div><span class="v110-label">Do now</span><h1 id="v110Action">${safe(output.action)}</h1><p id="v110Reason">${safe(output.reason)}</p></div></article><article class="v110-hud-panel"><span class="v110-label">Primary permission</span><div class="v110-permission ${output.permission==="OPEN"?"open":output.permission==="HOLD"?"hold":""}" id="v110Permission">${safe(output.permission)}</div><p id="v110PermissionWhy">${safe(output.permissionWhy)}</p></article></section><section class="v110-next" id="v110Next">${output.next.map(row=>`<div><time>${fmt(row.start)}–${fmt(row.end)}</time><b>${safe(row.action)}</b></div>`).join("")||"<div><b>No upcoming window compiled.</b></div>"}</section><section class="v110-scenario-box"><div class="v110-scenario-head"><b>Report what you see</b><span>The player reports reality. Master Coach chooses the branch.</span></div><div class="v110-scenarios">${scenarioRows().map((row,i)=>`<button class="v110-scenario ${lastScenario===row.id?"active":""}" data-signal="${row.id}" data-tip="${safe(SIGNAL_HELP[row.id]||row.tip||"")}"><kbd>${i+1}</kbd>${safe(row.label)}</button>`).join("")}</div></section><section class="v110-hud-controls"><button class="v110-btn" id="v110Pause">${timerRunning?"Pause":"Resume"}</button><button class="v110-btn" data-shift="-10">−10s</button><button class="v110-btn" data-shift="-5">−5s</button><button class="v110-btn" data-shift="-1">−1s</button><button class="v110-btn" id="v110Resync">3–2–1 Sync</button><button class="v110-btn" data-shift="1">+1s</button><button class="v110-btn" data-shift="5">+5s</button><button class="v110-btn" data-shift="10">+10s</button><button class="v110-btn" id="v110Check">Can I Still Do My Plan?</button><button class="v110-btn" id="v110Voice">Voice ${voiceEnabled?"On":"Off"}</button></section>`
  }

  function liveOutput(){
    if(mode==="1v1"){const o=E.currentOutput()||E.evaluate();const primary=permissionFromStatus(o?.planStatus||"continue");return {status:o?.planStatus||"continue",question:o?.primaryQuestion||"What information changes the next commitment?",action:o?.primaryAction||"Read the battlefield",reason:o?.reason||plan?.why||"Keep the operation legal with fresh evidence.",permission:primary.status,permissionWhy:primary.reason,next:(o?.nextWindows||[]).map(x=>({start:x.earliestSecond,end:x.latestSecond,action:x.label})).slice(0,3)}}
    return teamLiveOutput()
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
    return `<section class="v110-hero compact"><span>Study outside the fight</span><h1>${safe(p.title)}</h1><p>Deep context lives here so the Live HUD can remain a one-glance instrument.</p></section><section class="v110-study-grid"><article><h2>Mission story</h2><p>${safe(p.story)}</p><h3>Unspoken strategic principle</h3><p>${safe(context.unspoken)}</p><h3>Why this build exists</h3><p>${safe(p.why||context.mission)}</p><h3>First units' real job</h3><p>${safe(context.unitJob)}</p></article><article><h2>Decision model</h2><h3>Expected response</h3><p>${safe(context.expected)}</p><h3>Pivot</h3><p>${safe(context.pivot)}</p><h3>Failure condition</h3><p>${safe(context.failure)}</p>${assumptions.length?`<h3>Assumptions</h3><ul>${assumptions.map(x=>`<li><b>${safe(x.label)}</b> — ${safe(x.detail)}</li>`).join("")}</ul>`:""}${threats.length?`<h3>Credible punish routes</h3><ul>${threats.map(x=>`<li><b>${safe(x.label)}</b> — ${safe(x.detail)}</li>`).join("")}</ul>`:""}</article></section>`
  }

  function reviewView(){const notes=localStorage.getItem(REVIEW_KEY)||"";return `<section class="v110-review"><span class="v110-label">Secondary workflow</span><h1>After-action review</h1><p>Start with what you remember. Replay analysis can validate details later; it does not block the live strategy system.</p><textarea id="v110ReviewNotes" placeholder="Example: I took the third after seeing the natural, then extra production hit before my Gateways were ready.">${safe(notes)}</textarea><div class="v110-actions"><button class="v110-btn primary" id="v110SaveReview">Save Debrief Locally</button><button class="v110-btn" id="v110OpenAdvanced">Open Replay / Advanced</button></div></section>`}

  function scenarioRows(){if(state.enemy==="Terran")return [signal("reaper","Reaper"),signal("normal_natural","Normal natural"),signal("extra_production","Extra production"),signal("move_out","Move-out"),signal("starport","Air / tech"),signal("fast_third","Fast third")];if(state.enemy==="Zerg")return [signal("normal_natural","Normal natural"),signal("no_natural","No natural"),signal("extra_production","Army / production"),signal("move_out","Move-out"),signal("hidden_tech","Hidden tech"),signal("fast_third","Fast third")];return [signal("normal_natural","Normal natural"),signal("no_natural","No natural"),signal("extra_production","Extra production"),signal("move_out","Move-out"),signal("hidden_tech","Hidden tech"),signal("fast_third","Fast third")]}
  function signal(id,label){const base=D.getSignal(id);return {id,label,tip:base?.tip||SIGNAL_HELP[id]}}

  function chooseRandomOperation(){lastScenario=null;spokenPrep=new Set();timerSeconds=0;timerRunning=false;timerSynced=false;lastEngineSecond=null;stopTimer();if(mode==="1v1")chooseRandomOneVOne();else chooseRandomTeam();previousIds.push(currentPlan()?.id);previousIds=previousIds.filter(Boolean).slice(-8);saveJson(HISTORY_KEY,previousIds);view="brief";render()}
  function weightedGoal(){const rows=D.GOALS.filter(g=>state.enemy!=="Unknown"||!["timing_attack","surprise"].includes(g.id));const total=rows.reduce((n,g)=>n+(GOAL_WEIGHTS[g.id]||1),0);let roll=Math.random()*total;for(const g of rows){roll-=GOAL_WEIGHTS[g.id]||1;if(roll<=0)return g}return rows[0]}
  function chooseRisk(goal){const roll=Math.random();if(goal.id==="surprise")return roll<.55?"balanced":"greedy";return roll<.25?"safe":roll<.88?"balanced":"greedy"}

  function chooseRandomOneVOne(){
    let chosen=null,request=null;
    for(let attempt=0;attempt<12;attempt++){const goal=weightedGoal(),risk=chooseRisk(goal),req={mode:"1v1",selfRace:state.self,opponentRace:state.enemy,goal:goal.id,risk,skillLevel:state.skill,coachStyle:"mentor"},candidates=D.candidates(req).slice().sort((a,b)=>scoreCandidate(b,req)-scoreCandidate(a,req)),preferred=candidates.find(x=>x.risk===risk)||candidates[0];if(preferred&&!previousIds.slice(-2).includes(preferred.id)){chosen=preferred;request=req;break}if(!chosen&&preferred){chosen=preferred;request=req}}
    E.configure(request);compilation=E.compile(request);plan=compilation.selectedPlan||chosen;teamPlan=null
  }
  function scoreCandidate(candidate,req){let score=100;if(candidate.risk===req.risk)score+=10;if(candidate.source?.patch===D.PATCH)score+=10;if(previousIds.includes(candidate.id))score-=18;if(/Bronze|Silver/i.test(state.skill)&&candidate.risk==="greedy")score-=12;return score}
  function chooseRandomTeam(){const ctx={me:state.self,ally:state.ally,enemy1:state.enemy,enemy2:state.enemy2,skill:state.skill,coordination:state.coordination,map:state.map},ranked=T.plans(ctx),pool=ranked.filter(x=>x.score>=ranked[0].score-12).slice(0,7),fresh=pool.filter(x=>!previousIds.slice(-2).includes(x.id)),rows=fresh.length?fresh:pool;teamPlan=rows[Math.floor(Math.random()*rows.length)]||ranked[0];plan=null;compilation=null}

  async function synchronize(){const box=$("v110Countdown"),number=$("v110CountNumber");if(!box||!number)return;box.hidden=false;for(const value of ["3","2","1","LIVE"]){number.textContent=value;playEarcon(value==="LIVE"?"good":"info");await wait(650)}box.hidden=true;timerSeconds=0;timerSynced=true;timerRunning=true;timerAnchor=performance.now();lastEngineSecond=null;if(mode==="1v1"){try{E.start();syncEngineClock(true)}catch(_e){}}startTimer();view="hud";render()}
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  function stopTimer(){if(timerHandle){cancelAnimationFrame(timerHandle);timerHandle=null}}
  function syncEngineClock(force=false){if(mode!=="1v1")return;const whole=Math.floor(timerSeconds);if(!force&&whole===lastEngineSecond)return;lastEngineSecond=whole;try{E.setClock(whole);if(force||whole%5===0)E.evaluate()}catch(_e){}}
  function startTimer(){stopTimer();timerAnchor=performance.now();const tick=now=>{if(timerRunning){const delta=Math.max(0,Math.min((now-timerAnchor)/1000,.25));timerSeconds+=delta;timerAnchor=now;syncEngineClock();updateHudDynamic();maybeBuildPrep()}else timerAnchor=now;timerHandle=requestAnimationFrame(tick)};timerHandle=requestAnimationFrame(tick)}
  function maybeBuildPrep(){if(!voiceEnabled)return;const rows=buildRows(currentPlan());for(const row of rows){const key=`${row.start}:${row.action}`,delta=row.start-timerSeconds;if(delta>4.5&&delta<=5.5&&!spokenPrep.has(key)){spokenPrep.add(key);speak(`In five seconds, ${row.action}.`);break}}}

  function updateHudDynamic(){if(view!=="hud")return;const clock=$("v110Clock");if(clock)clock.textContent=fmt(timerSeconds);const o=liveOutput();setText("v110Question",o.question);setText("v110Action",o.action);setText("v110Reason",o.reason);setText("v110Permission",o.permission);setText("v110PermissionWhy",o.permissionWhy);const stateNode=root.querySelector(".v110-plan-state");if(stateNode){stateNode.className=`v110-plan-state ${o.status}`;stateNode.innerHTML=`<i></i>${safe(o.status.toUpperCase())}`}const next=$("v110Next");if(next)next.innerHTML=o.next.map(row=>`<div><time>${fmt(row.start)}–${fmt(row.end)}</time><b>${safe(row.action)}</b></div>`).join("")||"<div><b>No upcoming window compiled.</b></div>"}
  function setText(id,text){const node=$(id);if(node)node.textContent=text||""}

  function reportSignal(id){lastScenario=id;if(mode==="1v1"){try{E.reportEvidence(id,{},"player_click",1);E.evaluate()}catch(_e){}}render();toast(`Reported: ${D.getSignal(id)?.label||id.replaceAll("_"," ")}`);playEarcon(["move_out","no_natural"].includes(id)?"danger":id==="fast_third"?"good":"info");const o=liveOutput();if(voiceEnabled)speak(`${o.action}. ${shorten(o.reason,15)}`)}
  function shorten(text,limit){const words=String(text||"").split(/\s+/);return words.slice(0,limit).join(" ")+(words.length>limit?"…":"")}
  function speak(text){if(!voiceEnabled||!("speechSynthesis" in window)||!text)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text),voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/Microsoft.*(Aria|Jenny|Guy|Sonia|Ryan|Christopher)/i.test(v.name))||voices.find(v=>/Natural|Neural/i.test(v.name))||voices.find(v=>/^en/i.test(v.lang))||null;u.rate=.96;u.pitch=.98;u.volume=.96;speechSynthesis.speak(u)}catch(_e){}}
  function readBrief(){const p=currentPlan();if(!p)return;const c=planContext(p);speak(`${p.title}. ${p.story} Your job: ${c.unitJob} Pivot: ${c.pivot} Unspoken rule: ${c.unspoken}`)}
  function playEarcon(type){try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=new AC(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.type="sine";osc.frequency.value=type==="danger"?220:type==="good"?660:440;gain.gain.setValueAtTime(.001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.055,ctx.currentTime+.01);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.18);osc.start();osc.stop(ctx.currentTime+.2);setTimeout(()=>ctx.close(),260)}catch(_e){}}
  function shiftTimer(delta){timerSeconds=Math.max(0,timerSeconds+delta);timerSynced=false;timerAnchor=performance.now();lastEngineSecond=null;syncEngineClock(true);render();toast(`Timer ${delta>=0?"+":""}${delta}s · now approximate`)}
  function showView(next){if(next==="hud"&&!currentPlan()){toast("Deploy an operation first.");view="deploy";render();return}view=next;render()}

  function openLegacy(which){stopTimer();root.hidden=true;document.body.classList.remove("v110-hud-default","strategic-os-default","strategy-default","team-default","team-advanced");if(which==="advanced")document.body.classList.add("team-advanced");else if(which==="compiler")document.body.classList.add("strategy-default");else if(which==="team")document.body.classList.add("team-default");else document.body.classList.add("strategic-os-default");ensureReturnButton()}
  function ensureReturnButton(){let button=document.getElementById("v110Return");if(button)return;button=document.createElement("button");button.id="v110Return";button.className="v110-return";button.textContent="Return to Live HUD";button.onclick=()=>{document.body.classList.remove("strategic-os-default","strategy-default","team-default","team-advanced");document.body.classList.add("v110-hud-default");root.hidden=false;button.remove();render()};document.body.appendChild(button)}

  function wireView(){
    root.querySelectorAll("[data-v110-nav]").forEach(b=>b.onclick=()=>showView(b.dataset.v110Nav));const command=$("v110Command");if(command)command.onclick=openPalette;const modalClose=$("v110ModalClose");if(modalClose)modalClose.onclick=()=>$("v110Modal").hidden=true;const palette=$("v110Palette");if(palette)palette.onclick=e=>{if(e.target===palette)palette.hidden=true};const modal=$("v110Modal");if(modal)modal.onclick=e=>{if(e.target===modal)modal.hidden=true};
    if(view==="deploy"){root.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;persistUi();render()});onChange("v110Self",v=>{state.self=v;persistUi();render()});onChange("v110Enemy",v=>{state.enemy=v;persistUi();render()});onChange("v110Ally",v=>{state.ally=v;persistUi();render()});onChange("v110Enemy2",v=>{state.enemy2=v;persistUi();render()});const deploy=$("v110Deploy");if(deploy)deploy.onclick=chooseRandomOperation}
    if(view==="brief"){$("v110Start").onclick=synchronize;$("v110Reroll").onclick=chooseRandomOperation;$("v110ReadBrief").onclick=readBrief}
    if(view==="hud"){root.querySelectorAll("[data-signal]").forEach(b=>b.onclick=()=>reportSignal(b.dataset.signal));root.querySelectorAll("[data-shift]").forEach(b=>b.onclick=()=>shiftTimer(Number(b.dataset.shift)));$("v110Pause").onclick=()=>{timerRunning=!timerRunning;timerAnchor=performance.now();if(mode==="1v1"){try{timerRunning?E.resume():E.pause()}catch(_e){}}render()};$("v110Resync").onclick=synchronize;$("v110Check").onclick=()=>{const o=liveOutput();modalDialog(`Plan status: ${o.status.toUpperCase()}`,`${o.reason} ${o.permissionWhy}`)};$("v110Voice").onclick=()=>{voiceEnabled=!voiceEnabled;persistUi();render();toast(`Coach voice ${voiceEnabled?"enabled":"muted"}`)};if(timerRunning&&!timerHandle)startTimer()}
    if(view==="review"){const save=$("v110SaveReview");if(save)save.onclick=()=>{localStorage.setItem(REVIEW_KEY,$("v110ReviewNotes").value);toast("Debrief saved locally")};const advanced=$("v110OpenAdvanced");if(advanced)advanced.onclick=()=>openLegacy("advanced")}
  }
  function onChange(id,fn){const node=$(id);if(node)node.onchange=e=>fn(e.target.value)}
  function modalDialog(title,body){const modal=$("v110Modal");if(!modal)return;setText("v110ModalTitle",title);setText("v110ModalBody",body);modal.hidden=false}
  function toast(text){const node=$("v110Toast");if(!node)return;node.textContent=text;node.classList.add("show");clearTimeout(node._hide);node._hide=setTimeout(()=>node.classList.remove("show"),2200)}

  function openPalette(){const palette=$("v110Palette"),input=$("v110CommandInput");if(!palette||!input)return;palette.hidden=false;input.value="";renderCommands("");input.oninput=e=>renderCommands(e.target.value);setTimeout(()=>input.focus(),20)}
  function commands(){return [["Deploy random operation","Assign one curated random current-patch policy",chooseRandomOperation],["Reroll operation","Replace the current mission without browsing",chooseRandomOperation],["Start 3–2–1 timer sync","Align HUD zero with the StarCraft countdown",async()=>{await synchronize()}],["Pause / resume timer","Toggle the live match clock",()=>{timerRunning=!timerRunning;timerAnchor=performance.now();render()}],["Can I still do my plan?","Re-evaluate from current reported intel",()=>{const o=liveOutput();showView("hud");setTimeout(()=>modalDialog(`Plan status: ${o.status.toUpperCase()}`,`${o.reason} ${o.permissionWhy}`),0)}],["Report Reaper","Add Reaper evidence",()=>reportSignal("reaper")],["Report no natural","Add no-natural evidence",()=>reportSignal("no_natural")],["Report extra production","Add production-spike evidence",()=>reportSignal("extra_production")],["Report move-out","Add immediate movement evidence",()=>reportSignal("move_out")],["Read mission story","Speak the current operation briefing",readBrief],["Open Spellbook","Show deep build context",()=>showView("spellbook")],["Return to Live HUD","Return to the one-glance command surface",()=>showView("hud")],["Open Strategy Compiler","Open the legacy detailed compiler",()=>openLegacy("compiler")],["Open 2v2 Team Composer","Open the legacy team composer",()=>openLegacy("team")],["Open Advanced Command Center","Open replay, PRO MIND, Spellbook Lab, and telemetry",()=>openLegacy("advanced")]]}
  function renderCommands(query){const list=$("v110CommandList");if(!list)return;const q=String(query||"").trim().toLowerCase(),rows=commands(),filtered=rows.filter(x=>!q||`${x[0]} ${x[1]}`.toLowerCase().includes(q)),time=q.match(/sync.*?(\d+):(\d{1,2})/);let html="";if(time){const seconds=Number(time[1])*60+Number(time[2]);html+=`<button class="v110-command" data-sync="${seconds}"><span>Sync timer to ${fmt(seconds)}</span><small>Set approximate clock</small></button>`}html+=filtered.map(row=>`<button class="v110-command" data-command="${rows.indexOf(row)}"><span>${safe(row[0])}</span><small>${safe(row[1])}</small></button>`).join("");list.innerHTML=html||"<div class=\"v110-empty\">No command found.</div>";list.querySelectorAll("[data-command]").forEach(b=>b.onclick=()=>{const fn=rows[Number(b.dataset.command)][2];$("v110Palette").hidden=true;fn()});const sync=list.querySelector("[data-sync]");if(sync)sync.onclick=()=>{timerSeconds=Number(sync.dataset.sync);timerSynced=false;timerAnchor=performance.now();lastEngineSecond=null;$("v110Palette").hidden=true;view="hud";syncEngineClock(true);render();toast(`Timer set to ${fmt(timerSeconds)} · approximate`)}}

  function wireGlobalKeys(){document.addEventListener("keydown",async e=>{const typing=["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName||"");if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"&&!root.hidden){e.preventDefault();const palette=$("v110Palette");if(palette&&!palette.hidden)palette.hidden=true;else openPalette();return}if(root.hidden)return;if(e.key==="Escape"){const p=$("v110Palette"),m=$("v110Modal");if(p)p.hidden=true;if(m)m.hidden=true;return}if(typing)return;const key=e.key.toLowerCase();if(key==="s"){e.preventDefault();await synchronize();return}if(key==="r"){chooseRandomOperation();return}if(key==="v"){readBrief();return}if(key==="p"&&currentPlan()){const o=liveOutput();modalDialog(`Plan status: ${o.status.toUpperCase()}`,`${o.reason} ${o.permissionWhy}`);return}if(key==="b"){showView("spellbook");return}if(key==="h"&&currentPlan()){showView("hud");return}if(e.key===" "&&view==="hud"){e.preventDefault();timerRunning=!timerRunning;timerAnchor=performance.now();render();return}if(/^[1-6]$/.test(e.key)&&view==="hud"){const row=scenarioRows()[Number(e.key)-1];if(row)reportSignal(row.id)}})}

  const saved=loadJson(UI_KEY,null);if(saved){if(saved.mode)mode=saved.mode;if(saved.self)state.self=saved.self;if(saved.enemy)state.enemy=saved.enemy;if(saved.ally)state.ally=saved.ally;if(saved.enemy2)state.enemy2=saved.enemy2;if(typeof saved.voiceEnabled==="boolean")voiceEnabled=saved.voiceEnabled}
  mount();
})();
