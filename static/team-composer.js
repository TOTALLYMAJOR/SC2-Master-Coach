(function(){
  "use strict";
  const DATA=window.SC2TeamComposerData;if(!DATA)return;
  const $=id=>document.getElementById(id);
  const SAFE=v=>String(v??"").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
  const STORE="sc2-master-coach:team-composer:v1";
  const SIGNAL_KEY="sc2-master-coach:quick-signals:v1";
  const SIGNAL_TIME_KEY="sc2-master-coach:signal-times:v1";
  const SIGNALS=[
    ["allin","No natural","Combined aggression possible. Abort exposed greed and defend together."],
    ["greed","Fast third","Opponent economy is expanding. Use pressure to buy your own scaling window."],
    ["pressure","Extra production","Production spike. Delay an exposed expansion until both players can cover it."],
    ["moveout","Move-out","Move-out confirmed. Collapse toward the threatened player before counterattacking."],
    ["tech","Air / tech","Tech shift. Assign one player the minimum answer; do not duplicate expensive counters blindly."],
    ["turtle","Turtle","Static defense is a map concession. Take space and economy instead of feeding the fortress."],
    ["hidden","Hidden tech","Information gap. Re-scout before the next irreversible team commitment."]
  ];
  const SKILLS=["Unranked","Bronze","Silver","Gold","Platinum","Diamond","Master","Grandmaster"];
  const COORD=["Casual","Practiced","Voice-coordinated"];
  let root=null,stage="setup",plans=[],selected=null,liveTimer=null,liveStartedAt=0,liveOffset=0,livePaused=true,livePauseAt=0,spoken=new Set(),previousSecond=0;

  function load(){try{return JSON.parse(localStorage.getItem(STORE)||"null")||{}}catch{return {}}}
  function save(){localStorage.setItem(STORE,JSON.stringify(state))}
  const initial=load();
  const inferredRace=($("railRace")?.textContent||"").trim();
  let state={
    me:initial.me||(["Protoss","Terran","Zerg"].includes(inferredRace)?inferredRace:"Protoss"),
    ally:initial.ally||"Unknown",enemy1:initial.enemy1||"Unknown",enemy2:initial.enemy2||"Unknown",
    map:initial.map||"Unknown",skill:initial.skill||"Silver",coordination:initial.coordination||"Casual"
  };

  function options(values,current){return values.map(v=>`<option ${v===current?"selected":""}>${SAFE(v)}</option>`).join("")}
  function fmt(s){s=Math.max(0,Math.floor(s));return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`}
  function windowText(step){return `${fmt(step.start)}–${fmt(step.end)}`}
  function help(text){return `<span class="team-help" data-tip="${SAFE(text)}">?</span>`}
  function bodyMode(advanced){document.body.classList.toggle("team-advanced",advanced);document.body.classList.toggle("team-default",!advanced)}
  function advanced(){bodyMode(true)}
  function teamMode(){bodyMode(false);render()}

  function shell(){
    if(root)return;
    root=document.createElement("div");root.id="teamShell";root.className="team-shell";
    const hud=document.querySelector(".hud");hud?.before(root);document.body.classList.add("team-default");
    const back=document.createElement("button");back.id="teamAdvancedReturn";back.className="team-btn primary team-advanced-return";back.textContent="Return to Team Coach";back.onclick=teamMode;document.body.appendChild(back);
  }
  function chrome(content){
    return `<div class="team-top"><div class="team-brand"><b>SC2 Master Coach // Team Composer</b><span>Patch ${DATA.PATCH} · four races → ten plans → one battle story → minimal live coach</span></div><div class="team-top-actions"><button class="team-btn" id="teamHome">Setup</button><button class="team-btn" id="teamAdvanced">Advanced Command Center</button></div></div><div class="team-stage">${content}</div>`;
  }
  function wireChrome(){if($("teamHome"))$("teamHome").onclick=()=>{stopLive();stage="setup";selected=null;render()};if($("teamAdvanced"))$("teamAdvanced").onclick=advanced}

  function setupView(){
    const ready=state.me!=="Unknown"&&state.ally!=="Unknown";
    return `<div class="team-hero"><div class="team-kicker">Start with the match, not the dashboard</div><h1>Who is on the battlefield?</h1><p>State the four races you know. Opponents can remain Unknown until scouting identifies them. Master Coach will rank ten team plans without pretending uncertain information is known.</p></div><section class="team-card team-setup"><div class="team-setup-grid">
      <div class="team-field major"><label>I am ${help("Your race drives your personal build windows and role language.")}</label><select id="teamMe">${options(DATA.RACES,state.me)}</select></div>
      <div class="team-field major"><label>My ally ${help("The plan assigns your ally a distinct job rather than giving both players independent build orders.")}</label><select id="teamAlly">${options(DATA.RACES,state.ally)}</select></div>
      <div class="team-field major"><label>Opponent 1 ${help("Leave Unknown if you have not identified the race yet. Unknown lowers recommendation confidence rather than fabricating a matchup.")}</label><select id="teamEnemy1">${options(DATA.RACES,state.enemy1)}</select></div>
      <div class="team-field major"><label>Opponent 2 ${help("Opponent race can be updated later from Live mode as scouting resolves it.")}</label><select id="teamEnemy2">${options(DATA.RACES,state.enemy2)}</select></div>
    </div><div class="team-setup-secondary">
      <div class="team-field"><label>Map · optional ${help("The current 5.0.16 2v2 map pool is available for context. This version records map context but does not invent unverified geometry ratings.")}</label><select id="teamMap">${options(DATA.MAPS,state.map)}</select></div>
      <div class="team-field"><label>My skill ${help("Used only to reduce rankings for mechanically demanding plans at lower leagues; it is not a judgment of potential.")}</label><select id="teamSkill">${options(SKILLS,state.skill)}</select></div>
      <div class="team-field"><label>Coordination ${help("High-synchronization plans rank lower for casual teams and higher when both players can coordinate timing over voice.")}</label><select id="teamCoord">${options(COORD,state.coordination)}</select></div>
    </div><div class="team-setup-footer"><div class="team-setup-note"><b>Current evidence boundary:</b> race composition is user-reported. Timing windows are current-patch coaching benchmarks, not proof that an in-game action happened.</div><button class="team-btn primary" id="showTeamPlans" ${ready?"":"disabled"}>Show 10 Team Strategies</button></div>${ready?"":"<div class=\"team-empty\">Choose both allied races to rank team strategies. Enemy races may remain Unknown.</div>"}</section>`;
  }
  function wireSetup(){
    const ids={teamMe:"me",teamAlly:"ally",teamEnemy1:"enemy1",teamEnemy2:"enemy2",teamMap:"map",teamSkill:"skill",teamCoord:"coordination"};
    Object.entries(ids).forEach(([id,key])=>{const el=$(id);if(el)el.onchange=()=>{state[key]=el.value;save();render()}});
    const b=$("showTeamPlans");if(b)b.onclick=()=>{plans=DATA.plans(state);stage="strategies";render()};
  }

  function planCard(p,i){return `<article class="team-plan-card" data-plan="${SAFE(p.id)}"><div class="team-plan-top"><div><div class="team-plan-rank">#${i+1} · ${SAFE(p.subtitle)}</div><h3>${SAFE(p.title)}</h3><div class="subtitle">${SAFE(p.matchup)}</div></div><div class="team-fit"><strong>${p.score}</strong><span>team fit · ${SAFE(p.confidence)}</span></div></div><div class="team-story-mini">${SAFE(p.story)}</div><div class="team-role-strip"><div><b>Your role</b><span>${SAFE(p.youRoleLabel)} · ${SAFE(p.youRoleText)}</span></div><div><b>Ally role</b><span>${SAFE(p.allyRoleLabel)} · ${SAFE(p.allyRoleText)}</span></div></div><div class="team-badges"><span class="team-badge">Robustness ${SAFE(p.robustness)}</span><span class="team-badge">Mechanics ${SAFE(p.mechanics)}</span><span class="team-badge">Coord ${SAFE(p.coord)}</span><span class="team-badge">Surprise ${SAFE(p.surprise)}</span></div><button class="team-btn primary">Choose plan</button></article>`}
  function strategiesView(){if(!plans.length)plans=DATA.plans(state);return `<div class="team-section-head"><div><h2>Choose one of 10 team plans</h2><p>Ranked by race-role fit, mechanical load, opponent information, and coordination requirement—not fabricated global win rate.</p></div><div class="team-section-meta">${SAFE(state.me)} + ${SAFE(state.ally)}<br>vs ${SAFE(state.enemy1)} + ${SAFE(state.enemy2)}</div></div><div class="team-plan-grid">${plans.map(planCard).join("")}</div><div class="team-plan-actions"><button class="team-btn" id="backSetup">Edit match setup</button></div>`}
  function wireStrategies(){document.querySelectorAll("[data-plan]").forEach(card=>card.onclick=e=>{if(e.target.closest("button")||e.currentTarget===card){selected=plans.find(p=>p.id===card.dataset.plan);stage="plan";render()}});if($("backSetup"))$("backSetup").onclick=()=>{stage="setup";render()}}

  function buildList(build){return `<div class="team-build-list">${build.map(s=>`<div class="team-build-step"><time>${windowText(s)}</time><div><b>${SAFE(s.action)}</b><span>${SAFE(s.purpose)}</span></div></div>`).join("")}</div>`}
  function planView(){if(!selected)return setupView();return `<div class="team-plan-view"><section class="team-card team-plan-hero"><div class="team-plan-title-row"><div><div class="team-kicker">Selected team strategy</div><h1>${SAFE(selected.title)}</h1><p>${SAFE(selected.subtitle)} · ${SAFE(selected.matchup)} · patch ${DATA.PATCH}</p></div><div class="team-plan-score"><strong>${selected.score}</strong><span>team fit · ${SAFE(selected.confidence)}</span></div></div></section><section class="team-card team-story"><h3>Battle Story ${help("The story is a mental model: what problem your team creates, where attention moves, and which investment that movement protects.")}</h3><p>${SAFE(selected.story)}</p></section><div class="team-role-cards"><section class="team-card team-subcard"><h3>Your role — ${SAFE(state.me)}</h3><strong>${SAFE(selected.youRoleLabel)}</strong><p>${SAFE(selected.youRoleText)}</p></section><section class="team-card team-subcard"><h3>Ally role — ${SAFE(state.ally)}</h3><strong>${SAFE(selected.allyRoleLabel)}</strong><p>${SAFE(selected.allyRoleText)}</p></section></div><div class="team-build-columns"><section class="team-card team-subcard"><h3>Your build windows ${help("Windows are intentionally tolerant. Scouting evidence can override them; the app does not treat a few seconds of variance as strategic failure.")}</h3>${buildList(selected.yourBuild)}</section><section class="team-card team-subcard"><h3>Ally build windows</h3>${buildList(selected.allyBuild)}</section></div><div class="team-decision-row"><section class="team-card team-decision"><b>Critical scout</b><p>${SAFE(selected.scout)}</p></section><section class="team-card team-decision"><b>Abort condition</b><p>${SAFE(selected.abort)}</p></section></div><section class="team-card team-subcard"><h3>Team rhythm</h3>${selected.rhythm.map((r,i)=>`<div class="team-build-step"><time>${i+1}</time><div><b>${SAFE(r)}</b></div></div>`).join("")}<p>${SAFE(selected.source)}</p></section><div class="team-plan-actions"><button class="team-btn" id="backStrategies">Back to 10 plans</button><button class="team-btn" id="readTeamPlan">Read plan aloud</button><button class="team-btn primary" id="startTeamLive">Start Live Coach</button></div></div>`}
  function speak(text){try{if("speechSynthesis" in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=1.02;u.pitch=.96;speechSynthesis.speak(u)}}catch(_e){}}
  function readSelected(){if(!selected)return;speak(`${selected.title}. ${selected.story} Your role is ${selected.youRoleLabel}. ${selected.youRoleText}. Your ally's role is ${selected.allyRoleLabel}. ${selected.allyRoleText}. Critical scouting question: ${selected.scout}. Abort the plan if: ${selected.abort}.`)}
  function wirePlan(){if($("backStrategies"))$("backStrategies").onclick=()=>{stage="strategies";render()};if($("readTeamPlan"))$("readTeamPlan").onclick=readSelected;if($("startTeamLive"))$("startTeamLive").onclick=()=>{startLive();stage="live";render()}}

  function elapsed(){if(!livePaused)return liveOffset+(performance.now()-liveStartedAt)/1000;return liveOffset}
  function stepAt(build,t){return build.find(s=>t>=s.start&&t<=s.end)||build.find(s=>t<s.start)||build.at(-1)}
  function nextSteps(build,t){return build.filter(s=>s.start>t).slice(0,3)}
  function currentAlly(t){return stepAt(selected.allyBuild,t)}
  function currentYou(t){return stepAt(selected.yourBuild,t)}
  function startLive(){liveOffset=0;liveStartedAt=performance.now();livePaused=false;spoken=new Set();previousSecond=0;startTicker()}
  function stopLive(){if(liveTimer){clearInterval(liveTimer);liveTimer=null}livePaused=true}
  function startTicker(){if(liveTimer)clearInterval(liveTimer);liveTimer=setInterval(tick,250)}
  function togglePause(){if(livePaused){liveStartedAt=performance.now();livePaused=false}else{liveOffset=elapsed();livePaused=true}renderLiveDynamic()}
  function shift(delta){liveOffset=Math.max(0,elapsed()+delta);liveStartedAt=performance.now();previousSecond=liveOffset;renderLiveDynamic()}
  function voiceCues(t){
    selected.yourBuild.forEach((s,i)=>{const remaining=s.start-t,prep=`prep:${i}`,now=`now:${i}`;if(remaining>0&&remaining<=5&&!spoken.has(prep)){spoken.add(prep);speak(`In five seconds, ${s.action}.`)}if(t>=s.start&&previousSecond<s.start&&!spoken.has(now)){spoken.add(now);speak(`Now, ${s.action}.`)}});
  }
  function tick(){if(stage!=="live"||!selected)return;const t=elapsed();voiceCues(t);previousSecond=t;renderLiveDynamic()}
  function liveView(){if(!selected)return planView();const t=elapsed(),me=currentYou(t),ally=currentAlly(t),next=nextSteps(selected.yourBuild,t);return `<div class="team-live"><div class="team-live-head"><div class="team-live-title"><b>${SAFE(selected.title)}</b><span>${SAFE(selected.matchup)} · ${SAFE(selected.subtitle)}</span></div><div class="team-clock" id="teamClock">${fmt(t)}</div></div><section class="team-card team-live-main"><div class="team-live-label">My action now</div><div class="team-live-action" id="teamLiveAction">${SAFE(me?.action||"Read the battlefield")}</div><div class="team-live-why" id="teamLiveWhy">${SAFE(me?.purpose||selected.story)}</div></section><div class="team-live-columns"><section class="team-card team-live-card"><b>Ally objective</b><strong id="teamAllyAction">${SAFE(ally?.action||selected.allyRoleLabel)}</strong><p id="teamAllyWhy">${SAFE(ally?.purpose||selected.allyRoleText)}</p></section><section class="team-card team-live-card"><b>Why this team plan works</b><strong>${SAFE(selected.subtitle)}</strong><p>${SAFE(selected.story)}</p></section></div><div class="team-next-list" id="teamNext">${next.map(s=>`<div class="team-next"><time>${windowText(s)}</time><b>${SAFE(s.action)}</b></div>`).join("")||'<div class="team-next"><b>Opening sequence complete</b></div>'}</div><section class="team-card team-signal-wrap"><div class="team-signal-head"><b>I see</b><span>Only report high-value facts; the coach does not see the live game.</span></div><div class="team-signals">${SIGNALS.map(s=>`<button class="team-signal" data-team-signal="${s[0]}" title="${SAFE(s[2])}">${SAFE(s[1])}</button>`).join("")}</div><div class="team-opponent-update"><label>Opponent 1</label><select id="liveEnemy1">${options(DATA.RACES,state.enemy1)}</select><label>Opponent 2</label><select id="liveEnemy2">${options(DATA.RACES,state.enemy2)}</select></div></section><div class="team-live-controls"><button class="team-btn" id="teamPause">${livePaused?"Resume":"Pause"}</button><button class="team-btn" id="teamMinus">−10s</button><button class="team-btn" id="teamPlus">+10s</button><button class="team-btn" id="teamReadStory">Read story</button><button class="team-btn" id="teamPlanBack">Battle plan</button><button class="team-btn" id="teamAdvancedLive">Advanced</button></div></div>`}
  function renderLiveDynamic(){if(stage!=="live"||!selected)return;const t=elapsed(),me=currentYou(t),ally=currentAlly(t),next=nextSteps(selected.yourBuild,t);if($("teamClock"))$("teamClock").textContent=fmt(t);if($("teamLiveAction"))$("teamLiveAction").textContent=me?.action||"Read the battlefield";if($("teamLiveWhy"))$("teamLiveWhy").textContent=me?.purpose||selected.story;if($("teamAllyAction"))$("teamAllyAction").textContent=ally?.action||selected.allyRoleLabel;if($("teamAllyWhy"))$("teamAllyWhy").textContent=ally?.purpose||selected.allyRoleText;if($("teamNext"))$("teamNext").innerHTML=next.map(s=>`<div class="team-next"><time>${windowText(s)}</time><b>${SAFE(s.action)}</b></div>`).join("")||'<div class="team-next"><b>Opening sequence complete</b></div>';if($("teamPause"))$("teamPause").textContent=livePaused?"Resume":"Pause"}
  function reportSignal(sig){
    const row=SIGNALS.find(x=>x[0]===sig);if(!row)return;document.querySelectorAll("[data-team-signal]").forEach(b=>b.classList.toggle("active",b.dataset.teamSignal===sig));
    localStorage.setItem(SIGNAL_KEY,JSON.stringify([sig]));const times={};times[sig]={gameSecond:Math.floor(elapsed()),at:new Date().toISOString()};localStorage.setItem(SIGNAL_TIME_KEY,JSON.stringify(times));window.dispatchEvent(new CustomEvent("sc2:signal",{detail:{signal:sig,gameSecond:Math.floor(elapsed()),source:"team-composer"}}));speak(row[2]);
  }
  function updateEnemy(which,value){state[which]=value;save();plans=DATA.plans(state);selected=plans.find(p=>p.id===selected?.id)||selected;window.dispatchEvent(new CustomEvent("sc2:opponent",{detail:{opponent:value,source:"team-composer"}}));render()}
  function wireLive(){document.querySelectorAll("[data-team-signal]").forEach(b=>b.onclick=()=>reportSignal(b.dataset.teamSignal));if($("teamPause"))$("teamPause").onclick=togglePause;if($("teamMinus"))$("teamMinus").onclick=()=>shift(-10);if($("teamPlus"))$("teamPlus").onclick=()=>shift(10);if($("teamReadStory"))$("teamReadStory").onclick=readSelected;if($("teamPlanBack"))$("teamPlanBack").onclick=()=>{stopLive();stage="plan";render()};if($("teamAdvancedLive"))$("teamAdvancedLive").onclick=advanced;if($("liveEnemy1"))$("liveEnemy1").onchange=e=>updateEnemy("enemy1",e.target.value);if($("liveEnemy2"))$("liveEnemy2").onchange=e=>updateEnemy("enemy2",e.target.value);startTicker()}

  function render(){
    if(!root)return;
    let content=stage==="setup"?setupView():stage==="strategies"?strategiesView():stage==="plan"?planView():liveView();root.innerHTML=chrome(content);wireChrome();if(stage==="setup")wireSetup();else if(stage==="strategies")wireStrategies();else if(stage==="plan")wirePlan();else wireLive();
  }
  function start(){shell();render()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
