(function(){
  "use strict";
  const D=window.SC2StrategyCompilerData,E=window.SC2StrategyEngine;if(!D||!E)return;
  const $=id=>document.getElementById(id);
  const SAFE=v=>String(v??"").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
  const UI_KEY="sc2-master-coach:strategy-ui:v1";
  const SKILLS=["Bronze","Silver","Gold","Platinum","Diamond","Master","Grandmaster"];
  const STYLE_LABELS={commander:"Commander",mentor:"Mentor",professor:"Professor",silent_test:"Silent Test"};
  let root=null,stage="setup",request=loadUi(),compilation=null,output=null;
  let timer=null,liveOffset=0,liveStartedAt=0,livePaused=true,lastEvaluationSecond=-999,lastClockWhole=-1,voiceEnabled=true;
  let recognition=null,listening=false,pendingVoice=null;

  function loadUi(){
    try{return {...E.defaultRequest(),...(JSON.parse(localStorage.getItem(UI_KEY)||"null")||{})}}
    catch(_e){return E.defaultRequest()}
  }
  function saveUi(){try{localStorage.setItem(UI_KEY,JSON.stringify(request))}catch(_e){}}
  function fmt(s){s=Math.max(0,Math.floor(+s||0));return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`}
  function windowText(w){return `${fmt(w.earliestSecond??w.start)}–${fmt(w.latestSecond??w.end)}`}
  function goal(){return D.getGoal(request.goal)}
  function engineState(){return E.getState()}
  function currentPlan(){return engineState().compilation?.selectedPlan||compilation?.selectedPlan||null}

  function showCompiler(){
    document.body.classList.add("strategy-default");
    document.body.classList.remove("team-default","team-advanced");
    root?.removeAttribute("hidden");
  }
  function showTeamComposer(){
    stopTimer();
    document.body.classList.remove("strategy-default","team-advanced");
    document.body.classList.add("team-default");
  }
  function showAdvanced(){
    stopTimer();
    document.body.classList.remove("strategy-default","team-default");
    document.body.classList.add("team-advanced");
  }

  function goalIcon(id){
    const common='viewBox="0 0 64 64" aria-hidden="true" focusable="false"';
    const map={
      shield:'<path d="M32 5 54 14v16c0 14-9 23-22 29C19 53 10 44 10 30V14Z"/><path d="M22 32l7 7 14-17"/>',
      bases:'<circle cx="20" cy="37" r="12"/><circle cx="44" cy="27" r="12"/><path d="M29 31l6 2M12 50h40"/>',
      balance:'<path d="M32 8v46M15 18h34M19 18 9 39h20Zm26 0L35 39h20ZM20 54h24"/>',
      pressure:'<path d="M8 40 31 17l10 10 15-15M39 12h17v17"/><path d="M10 55h44"/>',
      clock:'<circle cx="32" cy="32" r="24"/><path d="M32 17v16l12 7"/>',
      air:'<path d="M7 38 29 30 41 9l7 3-4 22 13 8-3 6-17-4-12 13-6-3 4-15-16 4Z"/>',
      anchor:'<path d="M32 8v34M21 20h22M13 36c2 13 10 20 19 20s17-7 19-20M7 36h12m26 0h12"/>',
      map:'<path d="m7 14 15-6 20 7 15-6v41l-15 6-20-7-15 6Z"/><path d="M22 8v41m20-34v41"/>',
      fortress:'<path d="M9 54V22h8v-9h10v9h10v-9h10v9h8v32Z"/><path d="M25 54V39h14v15"/>',
      spark:'<path d="m32 5 5 18 18 5-18 5-5 18-5-18-18-5 18-5Z"/><path d="m50 43 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"/>'
    };
    return `<svg class="strategy-goal-icon" ${common}>${map[id]||map.spark}</svg>`;
  }

  function helpButton(title,body,label="Explain"){
    return `<button class="strategy-help" type="button" data-help-title="${SAFE(title)}" data-help-body="${SAFE(body)}" aria-label="${SAFE(label)}">?</button>`;
  }

  function workflow(active){
    const steps=[
      ["setup","1","Choose matchup"],
      ["goal","2","Choose goal"],
      ["plan","3","Review plan"],
      ["live","4","Run coach"]
    ];
    const order={setup:0,goal:1,plan:2,live:3};
    return `<nav class="strategy-workflow" aria-label="Strategy workflow">${steps.map(([id,n,label])=>`<div class="strategy-workflow-step ${order[id]<order[active]?"done":id===active?"active":""}"><span>${order[id]<order[active]?"✓":n}</span><b>${label}</b></div>`).join("")}</nav>`;
  }

  function raceCard(kind,race){
    const label=kind==="self"?"I am":"Opponent";
    const selectId=kind==="self"?"strategySelfRace":"strategyOpponentRace";
    const value=kind==="self"?request.selfRace:request.opponentRace;
    const options=D.RACES.filter(x=>kind==="opponent"||x!=="Unknown").map(x=>`<option value="${x}" ${x===value?"selected":""}>${x}</option>`).join("");
    return `<section class="strategy-race-card ${kind}" data-race="${SAFE(race)}">
      <img src="${SAFE(D.artFor(race))}" alt="Original ${SAFE(race)}-inspired strategy illustration">
      <div class="strategy-race-shade"></div>
      <div class="strategy-race-copy"><span>${label}</span><strong>${SAFE(race)}</strong><label for="${selectId}">${kind==="self"?"Choose your race":"Choose who you face"}</label><select id="${selectId}">${options}</select></div>
      ${helpButton(`${label}: ${race}`,kind==="self"?"Your race determines legal tech paths, build actions, worker names, and the capabilities available to reach the goal.":"Opponent race activates the matchup knowledge model. Unknown remains valid, but recommendations become more conservative.")}
    </section>`;
  }

  function topBar(){
    return `<header class="strategy-topbar">
      <div class="strategy-brand"><b>SC2 Master Coach // Strategy Compiler</b><span>Patch ${D.PATCH} · original race-inspired SVG illustrations · local, rules-driven coaching</span></div>
      <div class="strategy-top-actions">
        <button class="strategy-btn" id="strategyHow">How this works</button>
        <button class="strategy-btn" id="strategyTeamMode">2v2 Team Composer</button>
        <button class="strategy-btn" id="strategyAdvanced">Advanced</button>
      </div>
    </header>`;
  }

  function setupView(){
    const g=goal();
    return `${workflow("goal")}
      <section class="strategy-hero">
        <div class="strategy-kicker">One goal. One executable policy. One next decision.</div>
        <h1>Build the strategy—not just the build order.</h1>
        <p>Select the matchup and what you want to accomplish. Master Coach compiles a current-patch plan, explains its assumptions, and gives you a safe fallback when new intel breaks the original route.</p>
      </section>
      <section class="strategy-duel" aria-label="Choose matchup">
        ${raceCard("self",request.selfRace)}
        <div class="strategy-vs"><span>VS</span><small>Step 1</small></div>
        ${raceCard("opponent",request.opponentRace)}
      </section>
      <section class="strategy-section strategy-goal-section">
        <div class="strategy-section-head"><div><span>Step 2</span><h2>What do you want to accomplish?</h2><p>Pick the strategic outcome. The compiler chooses an implementation that fits the matchup and risk level.</p></div>${helpButton("Choose a strategic goal","A goal is the outcome you want—three bases, air control, pressure, defense—not a rigid build. If one implementation becomes unsafe, Master Coach tries another route to preserve the same goal.")}</div>
        <div class="strategy-goal-grid">${D.GOALS.map(x=>`<button class="strategy-goal-card ${x.id===request.goal?"selected":""}" data-goal="${x.id}" aria-pressed="${x.id===request.goal}" data-tip="${SAFE(x.short)}">${goalIcon(x.glyph)}<b>${SAFE(x.label)}</b><span>${SAFE(x.short)}</span><i>${x.id===request.goal?"Selected":"Choose"}</i></button>`).join("")}</div>
      </section>
      <section class="strategy-section strategy-preferences">
        <div class="strategy-pref-block"><div class="strategy-pref-title"><b>Risk tolerance</b>${helpButton("Risk tolerance","Safe delays payoff to buy more protection. Balanced preserves flexibility. Greedy accelerates payoff but demands fresher information and cleaner execution.")}</div><div class="strategy-segmented">${D.RISKS.map(x=>`<button data-risk="${x}" class="${request.risk===x?"selected":""}">${x}</button>`).join("")}</div></div>
        <div class="strategy-pref-block"><div class="strategy-pref-title"><b>Coach style</b>${helpButton("Coach style","Commander gives direct orders. Mentor asks questions when safe. Professor explains more before and after decisions. Silent Test speaks only for overrides.")}</div><select id="strategyCoachStyle">${D.COACH_STYLES.map(x=>`<option value="${x}" ${request.coachStyle===x?"selected":""}>${STYLE_LABELS[x]}</option>`).join("")}</select></div>
        <div class="strategy-pref-block"><div class="strategy-pref-title"><b>Skill level</b>${helpButton("Skill level","Used to avoid recommending high-risk execution paths when a more robust route teaches the same strategic concept. It is not a ceiling on what you can learn.")}</div><select id="strategySkill">${SKILLS.map(x=>`<option ${request.skillLevel===x?"selected":""}>${x}</option>`).join("")}</select></div>
      </section>
      <section class="strategy-cta-panel">
        <div><span>Selected objective</span><strong>${SAFE(g.label)} · ${SAFE(request.selfRace)} vs ${SAFE(request.opponentRace)}</strong><p>${SAFE(g.short)}</p></div>
        <button class="strategy-btn strategy-primary strategy-mega" id="forgeStrategy">Forge My Strategy <span>→</span></button>
      </section>`;
  }

  function artDuel(){
    return `<div class="strategy-art-duel"><div><img src="${SAFE(D.artFor(request.selfRace))}" alt="${SAFE(request.selfRace)} strategy art"><span>${SAFE(request.selfRace)}</span></div><b>VS</b><div><img src="${SAFE(D.artFor(request.opponentRace))}" alt="${SAFE(request.opponentRace)} strategy art"><span>${SAFE(request.opponentRace)}</span></div></div>`;
  }

  function planView(){
    const c=compilation||engineState().compilation;if(!c)return setupView();
    const p=c.selectedPlan,g=D.getGoal(request.goal);
    const statusLabel={supported:"SUPPORTED",supported_with_conditions:"SUPPORTED WITH CONDITIONS",not_recommended:"NOT RECOMMENDED",unsupported:"NO VERIFIED PLAN"}[c.verdict]||"SUPPORTED WITH CONDITIONS";
    return `${workflow("plan")}
      <section class="strategy-plan-hero strategy-section">
        ${artDuel()}
        <div class="strategy-plan-hero-copy"><div class="strategy-verdict ${SAFE(c.verdict)}">${statusLabel}</div><span>${SAFE(p.matchup)} · ${SAFE(g.label)} · ${SAFE(p.risk)} risk</span><h1>${SAFE(p.title)}</h1><p>${SAFE(p.story)}</p><div class="strategy-hero-ctas"><button class="strategy-btn strategy-primary" id="startGuidedCoach">Start Guided Coach <span>→</span></button><button class="strategy-btn" id="readCompiledPlan">Read plan aloud</button></div></div>
      </section>
      <section class="strategy-section strategy-story-board">
        <div class="strategy-section-head"><div><span>Battle story</span><h2>How the plan creates an advantage</h2></div>${helpButton("Battle story","The story is the causal model behind the timings. It explains what problem you create, what response you want, and which investment that response protects.")}</div>
        <p>${SAFE(p.why)}</p>
        <div class="strategy-causal-flow"><div><b>1</b><span>Scout</span><small>${SAFE(p.scouting?.[0]?.question||"Identify the opening")}</small></div><i>→</i><div><b>2</b><span>Create permission</span><small>Use information, pressure, or defense to buy time.</small></div><i>→</i><div><b>3</b><span>Make the investment</span><small>${SAFE(g.label)}</small></div><i>→</i><div><b>4</b><span>Protect the payoff</span><small>Vision, reinforcements, and a fallback.</small></div></div>
      </section>
      <div class="strategy-plan-grid">
        <section class="strategy-section"><div class="strategy-section-head"><div><span>Execution</span><h2>Build windows</h2></div>${helpButton("Build windows","Windows are deliberately tolerant. The earliest time is preparation, the latest time is when the step starts losing its intended strategic relationship. Evidence can override the schedule.")}</div><div class="strategy-window-list">${p.buildWindows.map((w,i)=>`<div class="strategy-window"><time>${fmt(w.start)}–${fmt(w.end)}</time><div><span>${SAFE(w.phase||"Plan")}</span><b>${SAFE(w.action)}</b><p>${SAFE(w.purpose)}</p></div><em>${i+1}</em></div>`).join("")}</div></section>
        <aside class="strategy-plan-side">
          <section class="strategy-section"><div class="strategy-section-head"><div><span>Legality</span><h2>Assumptions</h2></div>${helpButton("Plan assumptions","These are the facts that make this implementation reasonable. When a required assumption is invalidated, the app modifies or aborts the route rather than pretending the original script is still correct.")}</div><div class="strategy-compact-list">${p.assumptions.map(x=>`<div><b>${SAFE(x.label)}</b><span>${SAFE(x.detail)}</span>${x.manual?"<i>Manual confirmation</i>":""}</div>`).join("")}</div></section>
          <section class="strategy-section"><div class="strategy-section-head"><div><span>Opponent punish routes</span><h2>What can break it?</h2></div>${helpButton("Punish routes","These are documented strategic possibilities, not claims that the opponent has chosen them. Report what you actually see and the compiler updates the route.")}</div><div class="strategy-compact-list danger">${p.threats.map(x=>`<div><b>${SAFE(x.label)}</b><span>${SAFE(x.detail)}</span></div>`).join("")}</div></section>
        </aside>
      </div>
      <section class="strategy-section strategy-alternatives"><div><span>Same goal, different safety margin</span><h2>Choose a route</h2><p>The compiler preserves your goal whenever possible. Change the implementation—not the objective—when the game demands it.</p></div><div class="strategy-alt-actions"><button class="strategy-btn" id="saferPlan" ${c.alternatives.safer?"":"disabled"}>Try safer plan</button><button class="strategy-btn" id="greedierPlan" ${c.alternatives.greedier?"":"disabled"}>Try greedier plan</button><button class="strategy-btn" id="changeStrategy">Change matchup or goal</button></div></section>
      <section class="strategy-source-note"><b>Knowledge boundary:</b> ${SAFE(p.source.kind)} · patch ${SAFE(p.source.patch)} · ${SAFE(p.source.note)}</section>`;
  }

  function signalButtons(){
    const primary=D.SIGNALS.slice(0,8),more=D.SIGNALS.slice(8);
    return `<div class="strategy-intel-grid">${primary.map(s=>`<button class="strategy-intel" data-evidence="${s.id}" data-tip="${SAFE(s.tip)}"><span>${SAFE(s.label)}</span><small>Report</small></button>`).join("")}</div>${more.length?`<details class="strategy-more-intel"><summary>More intel</summary><div class="strategy-intel-grid">${more.map(s=>`<button class="strategy-intel" data-evidence="${s.id}" data-tip="${SAFE(s.tip)}"><span>${SAFE(s.label)}</span><small>Report</small></button>`).join("")}</div></details>`:""}`;
  }

  function liveView(){
    const p=currentPlan();if(!p)return planView();
    output=E.currentOutput()||E.evaluate();
    const o=output||{planStatus:"continue",primaryQuestion:"What changed?",primaryAction:"Read the battlefield",reason:p.why,confidence:{level:"low",explanation:"No live evidence yet."},nextWindows:[]};
    return `${workflow("live")}
      <section class="strategy-live-head"><div><div class="strategy-live-status ${SAFE(o.planStatus)}"><i></i>${SAFE(o.planStatus)}</div><b>${SAFE(p.title)}</b><span>${SAFE(p.matchup)} · ${SAFE(D.getGoal(request.goal).label)}</span></div><time id="strategyLiveClock">${fmt(engineState().clock.gameSecond)}</time></section>
      <section class="strategy-live-focus strategy-section">
        <div class="strategy-live-question"><span>One question</span><strong id="liveQuestion">${SAFE(o.primaryQuestion||"What is the next decision-critical fact?")}</strong></div>
        <div class="strategy-live-action"><span>Do now</span><h1 id="liveAction">${SAFE(o.primaryAction)}</h1><p id="liveReason">${SAFE(o.reason)}</p></div>
        <div class="strategy-confidence"><span>Confidence</span><b id="liveConfidence">${SAFE(o.confidence.level)}</b><small id="liveConfidenceWhy">${SAFE(o.confidence.explanation)}</small></div>
      </section>
      <section class="strategy-live-next"><div class="strategy-section-head"><div><span>Only three future windows</span><h2>Prepare next</h2></div>${helpButton("Why only three windows?","The live coach deliberately suppresses the full build. You need the current action and a short preparation horizon, not the entire strategic database competing for attention.")}</div><div id="liveNextWindows" class="strategy-next-grid">${(o.nextWindows||[]).map(x=>`<div><time>${windowText(x)}</time><b>${SAFE(x.label)}</b></div>`).join("")||"<div><b>No additional opening windows</b></div>"}</div></section>
      <section class="strategy-section strategy-live-intel"><div class="strategy-section-head"><div><span>Manual live information</span><h2>What did you see?</h2><p>The app knows the rules and your selected plan. You supply only the few observations that change the decision.</p></div>${helpButton("What Master Coach can know live","Without direct game integration, the app knows your selected races, goal, plan, timer, rules, and the facts you report. It does not know exact minerals, camera position, army location, or whether you completed a cue.")}</div>${signalButtons()}
        <div class="strategy-voice-row"><button class="strategy-btn strategy-primary strategy-mic" id="strategyMic"><span class="mic-dot"></span><b>${listening?"Listening…":"Tap to report intel"}</b><small>${recognitionSupported()?"Try: “Reaper”, “No natural”, “Three Barracks”, “Move out”":"Voice recognition is unavailable in this WebView; use the buttons."}</small></button><div id="voiceResult" class="strategy-voice-result">${pendingVoice?`Heard: <b>${SAFE(pendingVoice.rawText)}</b><div><button class="strategy-btn" id="confirmVoice">Confirm</button><button class="strategy-btn" id="dismissVoice">Dismiss</button></div>`:"Voice commands become the same structured evidence as a button click."}</div></div>
      </section>
      <section class="strategy-live-cta-bar"><button class="strategy-btn strategy-primary" id="checkPlan">Can I still do my plan?</button><button class="strategy-btn" id="whyLive">Why?</button><button class="strategy-btn" id="toggleLive">${livePaused?"Start / Resume":"Pause"}</button><button class="strategy-btn" id="minusLive">−10s</button><button class="strategy-btn" id="plusLive">+10s</button><button class="strategy-btn" id="backPlan">Battle plan</button></section>`;
  }

  function modal(){return `<div class="strategy-modal" id="strategyModal" hidden role="dialog" aria-modal="true" aria-labelledby="strategyModalTitle"><div class="strategy-modal-card"><button class="strategy-modal-close" id="strategyModalClose" aria-label="Close">×</button><span>Workflow help</span><h2 id="strategyModalTitle"></h2><div id="strategyModalBody"></div></div></div>`}

  function render(){
    if(!root)return;
    const view=stage==="setup"?setupView():stage==="plan"?planView():liveView();
    root.innerHTML=`${topBar()}<main class="strategy-stage">${view}</main>${modal()}`;
    wireCommon();
    if(stage==="setup")wireSetup();else if(stage==="plan")wirePlan();else wireLive();
  }

  function openHelp(title,body){
    const m=$("strategyModal");if(!m)return;
    $("strategyModalTitle").textContent=title;
    $("strategyModalBody").innerHTML=`<p>${SAFE(body)}</p>`;
    m.hidden=false;$("strategyModalClose")?.focus();
  }
  function closeHelp(){const m=$("strategyModal");if(m)m.hidden=true}

  function wireCommon(){
    $("strategyHow").onclick=()=>openHelp("The four-step workflow","1. Choose the matchup. 2. Choose the strategic goal. 3. Review one compiled plan and its assumptions. 4. Run a minimal coach that asks one question, gives one action, and changes only when your reported intel justifies it.");
    $("strategyTeamMode").onclick=showTeamComposer;
    $("strategyAdvanced").onclick=showAdvanced;
    $("strategyModalClose").onclick=closeHelp;
    $("strategyModal").onclick=e=>{if(e.target.id==="strategyModal")closeHelp()};
    root.querySelectorAll("[data-help-title]").forEach(b=>b.onclick=()=>openHelp(b.dataset.helpTitle,b.dataset.helpBody));
  }

  function wireSetup(){
    $("strategySelfRace").onchange=e=>{request.selfRace=e.target.value;saveUi();render()};
    $("strategyOpponentRace").onchange=e=>{request.opponentRace=e.target.value;saveUi();render()};
    root.querySelectorAll("[data-goal]").forEach(b=>b.onclick=()=>{request.goal=b.dataset.goal;if(!request.risk)request.risk=D.getGoal(request.goal).defaultRisk;saveUi();render()});
    root.querySelectorAll("[data-risk]").forEach(b=>b.onclick=()=>{request.risk=b.dataset.risk;saveUi();render()});
    $("strategyCoachStyle").onchange=e=>{request.coachStyle=e.target.value;saveUi()};
    $("strategySkill").onchange=e=>{request.skillLevel=e.target.value;saveUi()};
    $("forgeStrategy").onclick=()=>{
      saveUi();E.configure(request);compilation=E.compile(request);stage="plan";render();window.scrollTo({top:0,behavior:"smooth"});
    };
  }

  function speak(text){
    if(!voiceEnabled||!("speechSynthesis" in window)||!text)return;
    try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=1.02;u.pitch=.96;speechSynthesis.speak(u)}catch(_e){}
  }

  function planNarrative(){
    const p=currentPlan();if(!p)return "";
    const assumptions=p.assumptions.map(x=>x.label).join("; ");
    return `${p.title}. ${p.story} Why it works: ${p.why} The plan assumes: ${assumptions}. First question: ${p.scouting?.[0]?.question||"What changed?"}`;
  }

  function wirePlan(){
    $("startGuidedCoach").onclick=()=>{startLive();stage="live";render();window.scrollTo({top:0,behavior:"smooth"})};
    $("readCompiledPlan").onclick=()=>speak(planNarrative());
    $("saferPlan").onclick=()=>{compilation=E.selectVariant("safe");render()};
    $("greedierPlan").onclick=()=>{compilation=E.selectVariant("greedy");render()};
    $("changeStrategy").onclick=()=>{stage="setup";render();window.scrollTo({top:0,behavior:"smooth"})};
  }

  function currentElapsed(){return livePaused?liveOffset:liveOffset+(performance.now()-liveStartedAt)/1000}
  function startLive(){
    if(!engineState().compilation){E.configure(request);compilation=E.compile(request)}
    E.start();liveOffset=0;liveStartedAt=performance.now();livePaused=false;lastEvaluationSecond=-999;lastClockWhole=-1;startTimer();
  }
  function stopTimer(){if(timer){clearInterval(timer);timer=null}livePaused=true}
  function startTimer(){if(timer)clearInterval(timer);timer=setInterval(tick,500)}
  function toggleTimer(){
    if(livePaused){liveStartedAt=performance.now();livePaused=false;E.resume();startTimer()}
    else{liveOffset=currentElapsed();livePaused=true;E.pause()}
    updateLiveDynamic();
  }
  function shiftTime(delta){liveOffset=Math.max(0,currentElapsed()+delta);liveStartedAt=performance.now();lastClockWhole=Math.floor(liveOffset);E.setClock(liveOffset);output=E.evaluate();updateLiveDynamic(true)}
  function tick(){
    if(stage!=="live"||livePaused)return;
    const t=currentElapsed(),whole=Math.floor(t);if(whole!==lastClockWhole){E.setClock(t);lastClockWhole=whole}
    if(Math.floor(t/5)!==Math.floor(lastEvaluationSecond/5)){output=E.evaluate();lastEvaluationSecond=t;maybeSpeakCue()}
    updateLiveDynamic();
  }

  function maybeSpeakCue(){const cue=E.nextCue();if(!cue)return;speak(cue.voiceText);E.markCueSpoken(cue)}

  function updateLiveDynamic(force=false){
    if(stage!=="live")return;
    const t=currentElapsed();if($("strategyLiveClock"))$("strategyLiveClock").textContent=fmt(t);
    const o=output||E.currentOutput();if(!o)return;
    const status=root.querySelector(".strategy-live-status");if(status){status.className=`strategy-live-status ${o.planStatus}`;status.innerHTML=`<i></i>${SAFE(o.planStatus)}`}
    if($("liveQuestion"))$("liveQuestion").textContent=o.primaryQuestion||"What is the next decision-critical fact?";
    if($("liveAction"))$("liveAction").textContent=o.primaryAction;
    if($("liveReason"))$("liveReason").textContent=o.reason;
    if($("liveConfidence"))$("liveConfidence").textContent=o.confidence.level;
    if($("liveConfidenceWhy"))$("liveConfidenceWhy").textContent=o.confidence.explanation;
    if($("liveNextWindows"))$("liveNextWindows").innerHTML=(o.nextWindows||[]).map(x=>`<div><time>${windowText(x)}</time><b>${SAFE(x.label)}</b></div>`).join("")||"<div><b>No additional opening windows</b></div>";
    if(force)maybeSpeakCue();
  }

  function reportEvidence(type){output=E.reportEvidence(type,{},"player_click",1)&&E.currentOutput();render();maybeSpeakCue()}

  function recognitionSupported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition)}
  function setupRecognition(){
    const C=window.SpeechRecognition||window.webkitSpeechRecognition;if(!C)return null;
    const r=new C();r.lang="en-US";r.interimResults=false;r.maxAlternatives=1;
    r.onstart=()=>{listening=true;const b=$("strategyMic");if(b){b.classList.add("listening");b.querySelector("b").textContent="Listening…"}};
    r.onend=()=>{listening=false;const b=$("strategyMic");if(b){b.classList.remove("listening");b.querySelector("b").textContent="Tap to report intel"}};
    r.onerror=e=>{openHelp("Voice input problem",`Voice recognition could not continue: ${e.error||"unknown error"}. Use the Quick Intel buttons instead.`)};
    r.onresult=e=>{
      const alt=e.results?.[0]?.[0],text=alt?.transcript||"",confidence=Number.isFinite(alt?.confidence)?alt.confidence:1;
      const parsed=E.parseVoice(text,confidence),result=E.applyVoice(parsed,false);
      if(result.confirmationRequired){pendingVoice=parsed;render()}
      else if(result.applied){pendingVoice=null;output=E.currentOutput()||E.evaluate();render();maybeSpeakCue()}
      else openHelp("Voice command not recognized",`Heard “${text}”. Try a short phrase such as Reaper, No natural, Three Barracks, Factory, Starport, Move out, Safer plan, or Can I still expand?`);
    };
    return r;
  }
  function toggleMic(){
    if(!recognitionSupported()){openHelp("Voice unavailable","This Windows WebView does not expose browser speech recognition. The Quick Intel buttons provide the same structured evidence without a paid service.");return}
    if(!recognition)recognition=setupRecognition();
    try{if(listening)recognition.stop();else recognition.start()}catch(_e){}
  }

  function wireLive(){
    root.querySelectorAll("[data-evidence]").forEach(b=>b.onclick=()=>reportEvidence(b.dataset.evidence));
    $("strategyMic").onclick=toggleMic;
    if($("confirmVoice"))$("confirmVoice").onclick=()=>{const result=E.confirmPendingVoice();pendingVoice=null;output=E.currentOutput()||E.evaluate();render();if(result.applied)maybeSpeakCue()};
    if($("dismissVoice"))$("dismissVoice").onclick=()=>{E.dismissPendingVoice();pendingVoice=null;render()};
    $("checkPlan").onclick=()=>{output=E.evaluate();updateLiveDynamic(true);speak(`${output.planStatus}. ${output.primaryAction}`)};
    $("whyLive").onclick=()=>{const o=E.currentOutput()||E.evaluate();speak(o.reason);openHelp("Why this recommendation?",`${o.reason} Confidence is ${o.confidence.level}: ${o.confidence.explanation}`)};
    $("toggleLive").onclick=toggleTimer;
    $("minusLive").onclick=()=>shiftTime(-10);
    $("plusLive").onclick=()=>shiftTime(10);
    $("backPlan").onclick=()=>{stopTimer();stage="plan";render();window.scrollTo({top:0,behavior:"smooth"})};
    if(!timer&&!livePaused)startTimer();
  }

  function mount(){
    if($("strategyCompilerShell"))return;
    root=document.createElement("div");root.id="strategyCompilerShell";root.className="strategy-shell";
    const anchor=$("teamShell")||document.querySelector(".hud");anchor?.before(root);
    const back=document.createElement("button");back.id="strategyReturn";back.className="strategy-btn strategy-primary strategy-return";back.textContent="Return to Strategy Compiler";back.onclick=()=>{showCompiler();stage=engineState().compilation?"plan":"setup";render()};document.body.appendChild(back);
    showCompiler();
    const existing=engineState();
    if(existing.compilation){compilation=existing.compilation;request={...request,...existing.request};stage="plan"}
    render();
    document.addEventListener("keydown",e=>{if(e.key==="Escape")closeHelp()});
  }

  function start(){mount()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
