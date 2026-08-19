(function(){
  "use strict";

  const D=window.SC2StrategyCompilerData;
  const E=window.SC2StrategyEngine;
  const K=window.SC2StrategicKernel;
  if(!D||!E||!K)return;

  const $=id=>document.getElementById(id);
  const SAFE=value=>String(value??"").replace(/[<>&"]/g,char=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[char]));
  const UI_KEY="sc2-master-coach:strategic-os-ui:v1";
  const SKILLS=["Bronze","Silver","Gold","Platinum","Diamond","Master","Grandmaster"];
  const STYLE_LABELS={commander:"Commander",mentor:"Mentor",professor:"Professor",silent_test:"Silent Test"};
  const CONSTRAINTS=[
    ["simple_execution","Simpler execution","Reduce simultaneous micro and branching."],
    ["low_spellcaster_micro","Low spellcaster micro","Prefer plans that do not depend on frequent spellcasting."],
    ["prefer_stable_ground","Stable ground army","Favor durable ground geometry and protected expensive units."],
    ["prefer_mobility","Mobility","Favor movement, scouting, response range, and preservation."],
    ["avoid_multi_prong","Avoid multi-prong","Do not require several attack groups at once."],
    ["information_first","Information first","Prioritize scouting before irreversible investment."]
  ];
  const PRIMARY_INTEL=["reaper","normal_natural","no_natural","extra_production","move_out","hidden_tech"];
  const SECONDARY_INTEL=["fast_third","factory","starport","turtle"];

  let root=null;
  let stage="mission";
  let snapshot=K.snapshot();
  let request=loadRequest();
  let constraints=loadConstraints();
  let timer=null;
  let liveOffset=0;
  let liveStartedAt=0;
  let livePaused=true;
  let recognition=null;
  let listening=false;
  let voiceMessage="Use voice or Quick Intel to report only decision-changing facts.";
  let pendingVoice=null;

  function loadRequest(){
    try{return {...E.defaultRequest(),...(JSON.parse(localStorage.getItem(UI_KEY)||"null")||{})}}
    catch(_e){return E.defaultRequest()}
  }

  function loadConstraints(){
    try{return JSON.parse(localStorage.getItem(`${UI_KEY}:constraints`)||"[]")||[]}
    catch(_e){return []}
  }

  function persist(){
    try{
      localStorage.setItem(UI_KEY,JSON.stringify(request));
      localStorage.setItem(`${UI_KEY}:constraints`,JSON.stringify(constraints));
    }catch(_e){}
  }

  function fmt(seconds){
    const value=Math.max(0,Math.floor(Number(seconds)||0));
    return `${Math.floor(value/60)}:${String(value%60).padStart(2,"0")}`;
  }

  function currentGoal(){return D.getGoal(request.goal)}
  function bodyMode(mode){
    document.body.classList.remove("strategic-os-default","strategy-default","team-default","team-advanced");
    document.body.classList.add(mode);
  }
  function showOs(){bodyMode("strategic-os-default");root?.removeAttribute("hidden")}
  function showLegacy(){stopTimer();bodyMode("strategy-default")}
  function showTeam(){stopTimer();bodyMode("team-default")}
  function showAdvanced(){stopTimer();bodyMode("team-advanced")}

  function help(title,body,label="Explain"){
    return `<button class="os-help" type="button" data-help-title="${SAFE(title)}" data-help-body="${SAFE(body)}" aria-label="${SAFE(label)}">?</button>`;
  }

  function statusClass(value){return String(value||"unknown").toLowerCase().replace(/[^a-z0-9_-]+/g,"-")}
  function optionRows(values,current){return values.map(value=>`<option value="${SAFE(value)}" ${value===current?"selected":""}>${SAFE(value)}</option>`).join("")}

  function topBar(){
    return `<header class="os-topbar">
      <div class="os-brand"><b>SC2 Master Coach // Strategic OS</b><span>Mission → Policy → Intel → Permission → Obligation → Decision · patch ${SAFE(D.PATCH)}</span></div>
      <div class="os-top-actions">
        <button class="os-btn" id="osHow">How it works</button>
        <button class="os-btn" id="osTeam">2v2 Operations</button>
        <button class="os-btn" id="osLegacy">Strategy Compiler</button>
        <button class="os-btn" id="osAdvanced">Advanced</button>
      </div>
    </header>`;
  }

  function workflow(active){
    const rows=[
      ["mission","1","Mission Control"],
      ["warroom","2","War Room"],
      ["command","3","Command Surface"],
      ["after","4","After Action"]
    ];
    const order={mission:0,warroom:1,command:2,after:3};
    return `<nav class="os-workflow" aria-label="Strategic OS workflow">${rows.map(([id,n,label])=>`<div class="os-workflow-step ${order[id]<order[active]?"done":id===active?"active":""}"><span>${order[id]<order[active]?"✓":n}</span><b>${label}</b></div>`).join("")}</nav>`;
  }

  function racePanel(kind,race){
    const isSelf=kind==="self";
    const id=isSelf?"osSelfRace":"osOpponentRace";
    const choices=D.RACES.filter(value=>isSelf?value!=="Unknown":true);
    return `<section class="os-race-panel ${kind}">
      <img src="${SAFE(D.artFor(race))}" alt="Original ${SAFE(race)}-inspired tactical illustration">
      <div class="os-race-overlay"></div>
      <div class="os-race-copy"><span>${isSelf?"I AM":"I FACE"}</span><strong>${SAFE(race)}</strong><label for="${id}">${isSelf?"Choose your race":"Choose opponent race"}</label><select id="${id}">${optionRows(choices,race)}</select></div>
      ${help(isSelf?"Your command identity":"Opponent model",isSelf?"Your race defines legal technology, production, worker, expansion, and force-design options.":"The opponent race activates a matchup model. Unknown is allowed, but the OS keeps permissions conservative until the matchup is identified.")}
    </section>`;
  }

  function missionView(){
    const goal=currentGoal();
    return `${workflow("mission")}
      <section class="os-hero">
        <div class="os-kicker">State the operation before the match begins</div>
        <h1>What mission are you trying to accomplish?</h1>
        <p>The Strategic OS does not begin with every feature. It begins with your intent, compiles one policy, and maintains the strategic truth that makes the policy legal.</p>
      </section>

      <section class="os-duel">
        ${racePanel("self",request.selfRace)}
        <div class="os-vs"><span>VS</span><small>Matchup</small></div>
        ${racePanel("opponent",request.opponentRace)}
      </section>

      <section class="os-section">
        <div class="os-section-head"><div><span>Mission</span><h2>Choose the outcome—not the favorite unit</h2><p>The policy compiler will select a safe, balanced, or greedy implementation of this mission.</p></div>${help("Mission","A mission describes the state you want to create. A policy is one executable route. If evidence breaks that route, the OS tries to preserve the mission through a fallback.")}</div>
        <div class="os-goal-grid">${D.GOALS.map(row=>`<button class="os-goal ${row.id===request.goal?"selected":""}" data-goal="${row.id}" aria-pressed="${row.id===request.goal}" data-tip="${SAFE(row.short)}"><b>${SAFE(row.label)}</b><span>${SAFE(row.short)}</span><i>${row.id===request.goal?"MISSION SELECTED":"SELECT MISSION"}</i></button>`).join("")}</div>
      </section>

      <section class="os-section os-doctrine-section">
        <div class="os-section-head"><div><span>Doctrine</span><h2>How should the system shape the operation?</h2><p>These are execution constraints and preferences. They guide the recommendation without pretending to change game rules.</p></div>${help("Doctrine and constraints","Doctrine describes how you prefer to create advantage. Constraints prevent the system from recommending plans that are strategically valid but impractical for you.")}</div>
        <div class="os-constraint-grid">${CONSTRAINTS.map(([id,label,tip])=>`<button class="os-constraint ${constraints.includes(id)?"selected":""}" data-constraint="${id}" data-tip="${SAFE(tip)}"><b>${SAFE(label)}</b><span>${SAFE(tip)}</span></button>`).join("")}</div>
        <div class="os-preferences">
          <label><span>Risk tolerance</span><select id="osRisk">${optionRows(D.RISKS,request.risk)}</select></label>
          <label><span>Coach style</span><select id="osCoachStyle">${D.COACH_STYLES.map(value=>`<option value="${value}" ${value===request.coachStyle?"selected":""}>${SAFE(STYLE_LABELS[value])}</option>`).join("")}</select></label>
          <label><span>Skill level</span><select id="osSkill">${optionRows(SKILLS,request.skillLevel)}</select></label>
        </div>
      </section>

      <section class="os-mission-cta">
        <div><span>Operation request</span><strong>${SAFE(request.selfRace)} vs ${SAFE(request.opponentRace)} · ${SAFE(goal.label)} · ${SAFE(request.risk)}</strong><p>${SAFE(goal.short)}</p></div>
        <button class="os-btn os-primary os-mega" id="compileOperation">Compile Operation <span>→</span></button>
      </section>`;
  }

  function missionSummary(){
    const m=snapshot.mission;
    return `<div class="os-object-card mission"><span>MISSION</span><b>${SAFE(m.title)}</b><p>${SAFE(m.objective)}</p><small>${SAFE(m.matchup)} · ${SAFE(m.risk)} risk</small></div>`;
  }

  function policySummary(){
    const p=snapshot.policy;
    if(!p)return `<div class="os-object-card policy"><span>POLICY</span><b>Not compiled</b><p>Compile an operation to establish the executable policy.</p></div>`;
    return `<div class="os-object-card policy"><span>POLICY</span><b>${SAFE(p.title)}</b><p>${SAFE(p.why||p.story)}</p><small>${SAFE(p.verdict)} · ${SAFE(p.risk)} route</small></div>`;
  }

  function intelSummary(){
    const i=snapshot.intel;
    return `<div class="os-object-card intel"><span>INTEL</span><b>${i.count?`${i.count} active reports`:"No live intel"}</b><p>${SAFE(i.last?`${i.last.label} · ${i.last.freshnessLabel}`:i.statement)}</p><small>Only unexpired player reports are treated as live facts.</small></div>`;
  }

  function permissionSummary(){
    const p=snapshot.permissions.primary;
    return `<div class="os-object-card permission ${statusClass(p.status)}"><span>PERMISSION</span><b>${SAFE(p.kind)} · ${SAFE(p.status)}</b><p>${SAFE(p.reason)}</p><small>${SAFE(p.resolver)}</small></div>`;
  }

  function obligationSummary(){
    const o=snapshot.obligations;
    const first=o.rows.find(row=>row.status==="urgent")||o.rows.find(row=>row.status!=="satisfied")||o.rows[0];
    return `<div class="os-object-card obligation"><span>OBLIGATION</span><b>${SAFE(first?.label||"No active obligation")}</b><p>${SAFE(first?.reason||"The operation is currently clear.")}</p><small>${o.satisfied}/${o.rows.length} explicitly satisfied</small></div>`;
  }

  function decisionSummary(){
    const d=snapshot.decision;
    return `<div class="os-object-card decision ${statusClass(d.status)}"><span>DECISION</span><b>${SAFE(d.action)}</b><p>${SAFE(d.question||d.reason)}</p><small>${SAFE(d.status)} · ${SAFE(d.confidence.level)} confidence</small></div>`;
  }

  function assumptionRows(){
    return snapshot.assumptions.rows.map(row=>`<div class="os-ledger-row ${statusClass(row.status)}"><div><span>${SAFE(row.status)}</span><b>${SAFE(row.label)}</b><p>${SAFE(row.detail)}</p><small>${SAFE(row.reason)}</small></div>${row.manual||row.status==="unconfirmed"?`<button class="os-btn os-small ${row.status==="supported"?"confirmed":""}" data-assumption="${SAFE(row.id)}">${row.status==="supported"?"Confirmed":"Confirm"}</button>`:""}</div>`).join("");
  }

  function permissionRows(){
    return snapshot.permissions.rows.map(row=>`<div class="os-permission ${statusClass(row.status)}"><span>${SAFE(row.kind)}</span><b>${SAFE(row.status)}</b><p>${SAFE(row.reason)}</p><small>${SAFE(row.resolver)}</small></div>`).join("");
  }

  function obligationRows(){
    return snapshot.obligations.rows.map(row=>`<div class="os-obligation ${statusClass(row.status)}"><div><span>${SAFE(row.status)}</span><b>${SAFE(row.label)}</b><small>${SAFE(row.reason)}</small></div><button class="os-btn os-small ${row.status==="satisfied"?"confirmed":""}" data-obligation="${SAFE(row.id)}">${row.status==="satisfied"?"Satisfied":"Confirm"}</button></div>`).join("");
  }

  function buildRows(){
    const plan=E.getState().compilation?.selectedPlan;
    return (plan?.buildWindows||[]).map((row,index)=>`<div class="os-window"><time>${fmt(row.start)}–${fmt(row.end)}</time><div><span>${SAFE(row.phase||"Operation")}</span><b>${SAFE(row.action)}</b><p>${SAFE(row.purpose)}</p></div><em>${index+1}</em></div>`).join("");
  }

  function threats(){
    return snapshot.threats.rows.map(row=>`<div class="os-threat"><b>${SAFE(row.label)}</b><p>${SAFE(row.detail)}</p></div>`).join("");
  }

  function scheduler(){
    const schedule=snapshot.schedule;
    return `<div class="os-scheduler">
      <section class="now"><span>NOW</span><b>${SAFE(schedule.now.label)}</b><p>${SAFE(schedule.now.reason)}</p></section>
      <section class="soon"><span>SOON</span>${schedule.soon.length?schedule.soon.map(row=>`<div><time>${fmt(row.start)}–${fmt(row.end)}</time><b>${SAFE(row.label)}</b></div>`).join(""):'<div><b>No upcoming window compiled.</b></div>'}</section>
      <section class="not-yet"><span>NOT YET</span>${schedule.notYet.map(label=>`<div><b>${SAFE(label)}</b></div>`).join("")}</section>
    </div>`;
  }

  function artDuel(){
    const m=snapshot.mission;
    return `<div class="os-art-duel"><div><img src="${SAFE(D.artFor(m.selfRace))}" alt="${SAFE(m.selfRace)} operation art"><span>${SAFE(m.selfRace)}</span></div><b>VS</b><div><img src="${SAFE(D.artFor(m.opponentRace))}" alt="${SAFE(m.opponentRace)} operation art"><span>${SAFE(m.opponentRace)}</span></div></div>`;
  }

  function warRoomView(){
    const p=snapshot.policy;
    if(!p)return missionView();
    return `${workflow("warroom")}
      <section class="os-war-hero os-section">
        ${artDuel()}
        <div class="os-war-copy"><div class="os-operation-state ${statusClass(p.status)}">${SAFE(p.status)}</div><span>${SAFE(snapshot.mission.matchup)} · ${SAFE(snapshot.mission.title)} · patch ${SAFE(snapshot.mission.patch)}</span><h1>${SAFE(p.title)}</h1><p>${SAFE(p.story)}</p><div class="os-hero-actions"><button class="os-btn os-primary" id="startCommand">Start Command Surface <span>→</span></button><button class="os-btn" id="readOperation">Read Operation</button><button class="os-btn" id="editMission">Edit Mission</button></div></div>
      </section>

      <section class="os-object-grid" aria-label="Canonical strategic objects">
        ${missionSummary()}${policySummary()}${intelSummary()}${permissionSummary()}${obligationSummary()}${decisionSummary()}
      </section>

      <section class="os-section os-story">
        <div class="os-section-head"><div><span>Operational story</span><h2>How the policy creates permission for the mission</h2></div>${help("Operational story","The timings are subordinate to the causal model. The policy explains what you learn, what advantage you create, what you invest in, and what protects the payoff.")}</div>
        <p>${SAFE(p.why||p.story)}</p>
        <div class="os-causal-flow"><div><b>1</b><span>Acquire intel</span><small>${SAFE(snapshot.decision.question||"Resolve the opening")}</small></div><i>→</i><div><b>2</b><span>Create permission</span><small>${SAFE(snapshot.permissions.primary.reason)}</small></div><i>→</i><div><b>3</b><span>Invest</span><small>${SAFE(snapshot.mission.title)}</small></div><i>→</i><div><b>4</b><span>Honor obligations</span><small>Vision, reinforcement, preservation, and fallback.</small></div></div>
      </section>

      <div class="os-war-grid">
        <section class="os-section"><div class="os-section-head"><div><span>Policy execution</span><h2>Operation windows</h2><p>Windows are benchmarks. Intel can modify or suspend them.</p></div>${help("Operation windows","The policy retains the strategic relationship between actions. A late prerequisite may move a later window; the OS should not call a physically impossible target a player failure.")}</div><div class="os-window-list">${buildRows()}</div></section>
        <aside class="os-war-side">
          <section class="os-section"><div class="os-section-head"><div><span>Assumption ledger</span><h2>What makes this policy legal?</h2></div>${help("Assumption ledger","An assumption is a fact the policy relies on. Unknown assumptions lower confidence. Invalidated assumptions trigger modification, hold, or fallback.")}</div><div class="os-ledger">${assumptionRows()}</div></section>
          <section class="os-section"><div class="os-section-head"><div><span>Threat model</span><h2>How can the opponent break it?</h2></div>${help("Threat model","Threats are credible possibilities, not claims about the opponent's actual choice. Report only what you see.")}</div><div class="os-threat-list">${threats()}</div></section>
        </aside>
      </div>

      <section class="os-section"><div class="os-section-head"><div><span>Permission engine</span><h2>Which decisions are currently legal?</h2></div>${help("Permissions","Permissions translate intel into operational legality. OPEN is not certainty. HOLD means the current risk overrides the planned investment.")}</div><div class="os-permission-grid">${permissionRows()}</div></section>

      <section class="os-section"><div class="os-section-head"><div><span>Obligation engine</span><h2>What responsibilities did the mission create?</h2></div>${help("Obligations","A base, technology, timing, or force package creates responsibilities. The purchase is not strategically complete until those responsibilities are covered.")}</div><div class="os-obligation-list">${obligationRows()}</div></section>

      <section class="os-section"><div class="os-section-head"><div><span>Strategic scheduler</span><h2>Now, soon, and not yet</h2><p>The OS reduces load by deferring decisions that do not deserve attention yet.</p></div>${help("Not Yet scheduler","Not Yet is permission to ignore a real future decision until its prerequisites become relevant.")}</div>${scheduler()}</section>

      <section class="os-war-cta"><div><span>Operation ready</span><b>${SAFE(snapshot.decision.action)}</b><p>${SAFE(snapshot.decision.reason)}</p></div><div><button class="os-btn" id="saferOperation">Safer Route</button><button class="os-btn" id="greedierOperation">Greedier Route</button><button class="os-btn os-primary os-mega" id="startCommandBottom">Enter Command Surface <span>→</span></button></div></section>`;
  }

  function permissionDetails(){
    return `<details class="os-command-details"><summary>Other permissions</summary><div class="os-command-permissions">${snapshot.permissions.rows.map(row=>`<div class="${statusClass(row.status)}"><span>${SAFE(row.kind)}</span><b>${SAFE(row.status)}</b><small>${SAFE(row.resolver)}</small></div>`).join("")}</div></details>`;
  }

  function quickIntel(ids){
    const active=new Set(snapshot.intel.rows.map(row=>row.type));
    return ids.map(id=>{
      const signal=D.getSignal(id);if(!signal)return "";
      return `<button class="os-intel ${active.has(id)?"active":""}" data-intel="${SAFE(id)}" data-tip="${SAFE(signal.tip)}"><span>${SAFE(signal.label)}</span><small>${active.has(id)?"reported":"tap to report"}</small></button>`;
    }).join("");
  }

  function voicePanel(){
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    const supported=!!SpeechRecognition;
    return `<div class="os-voice-row"><button class="os-btn os-mic ${listening?"listening":""}" id="osMic" ${supported?"":"disabled"}><span class="os-mic-dot"></span><b>${supported?(listening?"Listening…":"Speak Intel"):"Voice unavailable"}</b><small>${supported?"Say: Reaper, no natural, three Barracks, move out…":"Use Quick Intel; embedded WebView may not expose speech recognition."}</small></button><div class="os-voice-message"><b>Voice adapter</b><span>${SAFE(voiceMessage)}</span>${pendingVoice?'<div><button class="os-btn os-small" id="confirmVoice">Confirm</button><button class="os-btn os-small" id="cancelVoice">Cancel</button></div>':""}</div></div>`;
  }

  function commandView(){
    const d=snapshot.decision,p=snapshot.permissions.primary,o=snapshot.obligations.rows.find(row=>row.status==="urgent")||snapshot.obligations.rows.find(row=>row.status!=="satisfied")||snapshot.obligations.rows[0];
    return `${workflow("command")}
      <section class="os-command-head"><div><div class="os-plan-status ${statusClass(d.status)}"><i></i>${SAFE(d.status)}</div><b>${SAFE(snapshot.policy?.title||"Compiled operation")}</b><span>${SAFE(snapshot.mission.matchup)} · ${SAFE(snapshot.mission.title)}</span></div><time id="osClock">${fmt(snapshot.gameSecond)}</time></section>

      <section class="os-command-focus os-section">
        <div class="os-command-question"><span>ONE QUESTION</span><strong id="osQuestion">${SAFE(d.question||"What information changes the next commitment?")}</strong></div>
        <div class="os-command-action"><span>DO NOW</span><h1 id="osAction">${SAFE(d.action)}</h1><p id="osReason">${SAFE(d.reason)}</p></div>
        <div class="os-command-permission ${statusClass(p.status)}"><span>PRIMARY PERMISSION</span><b id="osPrimaryPermission">${SAFE(p.kind)} · ${SAFE(p.status)}</b><small id="osPermissionReason">${SAFE(p.reason)}</small></div>
      </section>

      <section class="os-command-next os-section"><div class="os-section-head"><div><span>Only three future windows</span><h2>What becomes relevant next?</h2></div>${help("Three-window limit","The Strategic OS knows more than it displays. Only the next three windows are allowed onto the Command Surface.")}</div><div class="os-next-grid" id="osNextGrid">${d.windows.length?d.windows.map(row=>`<div><time>${fmt(row.earliestSecond)}–${fmt(row.latestSecond)}</time><b>${SAFE(row.label)}</b></div>`).join(""):'<div><b>No upcoming window compiled.</b></div>'}</div></section>

      <section class="os-command-scheduler os-section"><div class="os-section-head"><div><span>Cognitive-load governor</span><h2>Now, soon, not yet</h2></div>${help("Cognitive-load governor","The OS does not merely tell you what to think about. It explicitly identifies decisions that may be deferred.")}</div>${scheduler()}</section>

      <section class="os-command-obligation os-section"><div><span>ACTIVE OBLIGATION</span><b>${SAFE(o?.label||"Maintain the operation")}</b><p>${SAFE(o?.reason||"No urgent obligation.")}</p></div><button class="os-btn os-small ${o?.status==="satisfied"?"confirmed":""}" data-obligation="${SAFE(o?.id||"")}">${o?.status==="satisfied"?"Satisfied":"Confirm when covered"}</button></section>

      <section class="os-command-intel os-section"><div class="os-section-head"><div><span>Quick Intel</span><h2>Report only decision-changing facts</h2><p>The OS does not see the live match. These inputs change the policy state.</p></div>${help("Quick Intel","A button reports one observation with a timestamp and expiry. The OS distinguishes what you reported from what it inferred.")}</div><div class="os-intel-grid">${quickIntel(PRIMARY_INTEL)}</div><details class="os-more-intel"><summary>More intel signals</summary><div class="os-intel-grid">${quickIntel(SECONDARY_INTEL)}</div></details>${voicePanel()}</section>

      ${permissionDetails()}

      <section class="os-command-controls"><button class="os-btn" id="osPause">${livePaused?"Resume":"Pause"}</button><button class="os-btn" id="osMinus">−10s</button><button class="os-btn" id="osPlus">+10s</button><button class="os-btn" id="osStatus">Can I still do my plan?</button><button class="os-btn" id="osWhy">Why?</button><button class="os-btn os-primary" id="openWarRoom">War Room</button></section>`;
  }

  function chrome(content){return `${topBar()}<main class="os-stage">${content}</main><div class="os-modal" id="osModal" hidden><section><button class="os-modal-close" id="osModalClose" aria-label="Close">×</button><span>Strategic OS explanation</span><h2 id="osModalTitle"></h2><p id="osModalBody"></p></section></div>`}

  function render(){
    if(!root)return;
    snapshot=K.snapshot();
    const content=stage==="mission"?missionView():stage==="warroom"?warRoomView():commandView();
    root.innerHTML=chrome(content);
    wireCommon();
    if(stage==="mission")wireMission();
    else if(stage==="warroom")wireWarRoom();
    else wireCommand();
  }

  function wireCommon(){
    $("osHow")?.addEventListener("click",()=>openModal("How the Strategic OS works","Mission states the outcome. Policy is the executable route. Intel records only player-reported facts. Permission decides what is currently legal. Obligation tracks what an investment must protect. Decision exposes only one question, one action, and one reason."));
    $("osTeam")?.addEventListener("click",showTeam);
    $("osLegacy")?.addEventListener("click",showLegacy);
    $("osAdvanced")?.addEventListener("click",showAdvanced);
    root.querySelectorAll("[data-help-title]").forEach(button=>button.addEventListener("click",()=>openModal(button.dataset.helpTitle,button.dataset.helpBody)));
    $("osModalClose")?.addEventListener("click",closeModal);
    $("osModal")?.addEventListener("click",event=>{if(event.target.id==="osModal")closeModal()});
  }

  function wireMission(){
    $("osSelfRace")?.addEventListener("change",event=>{request.selfRace=event.target.value;persist();render()});
    $("osOpponentRace")?.addEventListener("change",event=>{request.opponentRace=event.target.value;persist();render()});
    root.querySelectorAll("[data-goal]").forEach(button=>button.addEventListener("click",()=>{request.goal=button.dataset.goal;request.risk=D.getGoal(request.goal).defaultRisk||request.risk;persist();render()}));
    root.querySelectorAll("[data-constraint]").forEach(button=>button.addEventListener("click",()=>{
      const id=button.dataset.constraint;
      constraints=constraints.includes(id)?constraints.filter(value=>value!==id):[...constraints,id];
      persist();render();
    }));
    $("osRisk")?.addEventListener("change",event=>{request.risk=event.target.value;persist()});
    $("osCoachStyle")?.addEventListener("change",event=>{request.coachStyle=event.target.value;persist()});
    $("osSkill")?.addEventListener("change",event=>{request.skillLevel=event.target.value;persist()});
    $("compileOperation")?.addEventListener("click",()=>{
      persist();
      snapshot=K.compileOperation(request,{constraints,preferredCapability:preferredCapability()});
      stage="warroom";
      render();
    });
  }

  function preferredCapability(){
    if(constraints.includes("prefer_stable_ground"))return "stable_ground";
    if(constraints.includes("prefer_mobility"))return "mobility";
    if(constraints.includes("information_first"))return "information";
    return "flexible";
  }

  function wireWarRoom(){
    const start=()=>{snapshot=K.startOperation();stage="command";startTimer();render()};
    $("startCommand")?.addEventListener("click",start);
    $("startCommandBottom")?.addEventListener("click",start);
    $("editMission")?.addEventListener("click",()=>{stopTimer();stage="mission";render()});
    $("readOperation")?.addEventListener("click",readOperation);
    $("saferOperation")?.addEventListener("click",()=>{snapshot=K.selectRisk("safe");request.risk="safe";persist();render()});
    $("greedierOperation")?.addEventListener("click",()=>{snapshot=K.selectRisk("greedy");request.risk="greedy";persist();render()});
    root.querySelectorAll("[data-assumption]").forEach(button=>button.addEventListener("click",()=>{snapshot=K.toggleManual(button.dataset.assumption);render()}));
    root.querySelectorAll("[data-obligation]").forEach(button=>button.addEventListener("click",()=>{snapshot=K.toggleManual(button.dataset.obligation);render()}));
  }

  function wireCommand(){
    root.querySelectorAll("[data-intel]").forEach(button=>button.addEventListener("click",()=>{
      snapshot=K.reportIntel(button.dataset.intel,{},"player_click",1);
      render();
    }));
    root.querySelectorAll("[data-obligation]").forEach(button=>button.addEventListener("click",()=>{snapshot=K.toggleManual(button.dataset.obligation);render()}));
    $("osPause")?.addEventListener("click",toggleTimer);
    $("osMinus")?.addEventListener("click",()=>shiftTime(-10));
    $("osPlus")?.addEventListener("click",()=>shiftTime(10));
    $("osStatus")?.addEventListener("click",()=>{snapshot=K.evaluate();render();openModal("Current operation status",`${snapshot.decision.status.toUpperCase()}: ${snapshot.decision.action} ${snapshot.decision.reason}`)});
    $("osWhy")?.addEventListener("click",()=>openModal("Why this decision?",`${snapshot.decision.reason} Confidence is ${snapshot.decision.confidence.level}: ${snapshot.decision.confidence.explanation}`));
    $("openWarRoom")?.addEventListener("click",()=>{stopTimer();stage="warroom";render()});
    $("osMic")?.addEventListener("click",toggleVoice);
    $("confirmVoice")?.addEventListener("click",confirmVoice);
    $("cancelVoice")?.addEventListener("click",cancelVoice);
    if(!livePaused)startTicker();
  }

  function openModal(title,body){
    const modal=$("osModal");if(!modal)return;
    $("osModalTitle").textContent=title;
    $("osModalBody").textContent=body;
    modal.hidden=false;
  }
  function closeModal(){if($("osModal"))$("osModal").hidden=true}

  function readOperation(){
    const p=snapshot.policy,d=snapshot.decision;
    speak(`${p.title}. Mission: ${snapshot.mission.title}. ${p.story} Current decision: ${d.action}. ${d.reason}`);
  }

  function speak(text){
    try{
      if(!("speechSynthesis" in window))return;
      speechSynthesis.cancel();
      const utterance=new SpeechSynthesisUtterance(text);
      utterance.rate=1.02;utterance.pitch=.96;
      speechSynthesis.speak(utterance);
    }catch(_e){}
  }

  function elapsed(){return livePaused?liveOffset:liveOffset+(performance.now()-liveStartedAt)/1000}
  function startTimer(){liveOffset=snapshot.gameSecond||0;liveStartedAt=performance.now();livePaused=false;startTicker()}
  function stopTimer(){if(timer){clearInterval(timer);timer=null}liveOffset=elapsed();livePaused=true}
  function startTicker(){
    if(timer)clearInterval(timer);
    timer=setInterval(()=>{
      if(stage!=="command"||livePaused)return;
      const second=Math.floor(elapsed());
      const shouldEvaluate=second%5===0;
      snapshot=K.setClock(second,shouldEvaluate);
      renderCommandDynamic();
    },500);
  }
  function toggleTimer(){
    if(livePaused){liveStartedAt=performance.now();livePaused=false;K.resumeOperation();startTicker()}
    else{liveOffset=elapsed();livePaused=true;K.pauseOperation();if(timer){clearInterval(timer);timer=null}}
    render();
  }
  function shiftTime(delta){liveOffset=Math.max(0,elapsed()+delta);liveStartedAt=performance.now();snapshot=K.setClock(Math.floor(liveOffset),true);render()}

  function renderCommandDynamic(){
    if(stage!=="command")return;
    snapshot=K.snapshot();
    const d=snapshot.decision,p=snapshot.permissions.primary;
    if($("osClock"))$("osClock").textContent=fmt(snapshot.gameSecond);
    if($("osQuestion"))$("osQuestion").textContent=d.question||"What information changes the next commitment?";
    if($("osAction"))$("osAction").textContent=d.action;
    if($("osReason"))$("osReason").textContent=d.reason;
    if($("osPrimaryPermission"))$("osPrimaryPermission").textContent=`${p.kind} · ${p.status}`;
    if($("osPermissionReason"))$("osPermissionReason").textContent=p.reason;
    if($("osNextGrid"))$("osNextGrid").innerHTML=d.windows.length?d.windows.map(row=>`<div><time>${fmt(row.earliestSecond)}–${fmt(row.latestSecond)}</time><b>${SAFE(row.label)}</b></div>`).join(""):'<div><b>No upcoming window compiled.</b></div>';
  }

  function toggleVoice(){
    if(listening){try{recognition?.stop()}catch(_e){};return}
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SpeechRecognition){voiceMessage="SpeechRecognition is unavailable in this embedded runtime. Quick Intel remains fully functional.";render();return}
    try{
      recognition=new SpeechRecognition();
      recognition.lang="en-US";
      recognition.interimResults=false;
      recognition.continuous=false;
      recognition.maxAlternatives=1;
      recognition.onstart=()=>{listening=true;voiceMessage="Listening for a supported tactical phrase…";render()};
      recognition.onend=()=>{listening=false;render()};
      recognition.onerror=event=>{
        listening=false;
        const code=event.error||"unknown";
        const guidance={
          "not-allowed":"Microphone permission was denied. Enable Windows desktop-app microphone access.",
          "audio-capture":"No usable microphone input was found. Check the Windows default input device.",
          "network":"The browser speech service is unavailable. Use Quick Intel instead.",
          "service-not-allowed":"Speech recognition is not permitted in this WebView runtime.",
          "no-speech":"No supported phrase was heard. Try a shorter command such as ‘Reaper’ or ‘Move out’."
        }[code]||`Voice recognition failed: ${code}.`;
        voiceMessage=guidance;render();
      };
      recognition.onresult=event=>{
        const result=event.results?.[0]?.[0];
        const transcript=result?.transcript||"";
        const confidence=Number.isFinite(result?.confidence)?result.confidence:1;
        const parsed=E.parseVoice(transcript,confidence);
        voiceMessage=`Heard: “${transcript}”`;
        if(parsed.unsupported){voiceMessage+= ". No supported tactical intent was recognized.";render();return}
        if(parsed.confirmationRequired){pendingVoice=parsed;voiceMessage+= ". Confirm before the operation changes.";render();return}
        E.applyVoice(parsed,true);snapshot=K.evaluate();voiceMessage+= ". Intel applied.";render();
      };
      recognition.start();
    }catch(error){
      listening=false;
      voiceMessage=`The microphone could not start: ${error?.message||error}. Use Quick Intel while microphone access is repaired.`;
      render();
    }
  }

  function confirmVoice(){
    if(!pendingVoice)return;
    E.applyVoice(pendingVoice,true);pendingVoice=null;snapshot=K.evaluate();voiceMessage="Voice intel confirmed and applied.";render();
  }
  function cancelVoice(){pendingVoice=null;E.dismissPendingVoice?.();voiceMessage="Voice intel was discarded.";render()}

  function mount(){
    if($("strategicOsShell")){root=$("strategicOsShell");showOs();render();return}
    root=document.createElement("div");
    root.id="strategicOsShell";
    root.className="os-shell";
    const strategyShell=$("strategyCompilerShell");
    if(strategyShell)strategyShell.before(root);else document.body.prepend(root);

    const returnButton=document.createElement("button");
    returnButton.id="strategicOsReturn";
    returnButton.className="os-btn os-primary os-return";
    returnButton.textContent="Return to Strategic OS";
    returnButton.addEventListener("click",()=>{showOs();render()});
    document.body.appendChild(returnButton);

    showOs();render();
  }

  K.subscribe(value=>{
    snapshot=value;
    if(!root)return;
    if(stage==="command")renderCommandDynamic();
    else render();
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();