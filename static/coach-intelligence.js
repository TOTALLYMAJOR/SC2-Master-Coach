(function(){
 "use strict";
 const PROFILE_KEY="sc2-master-coach:first-run:v1";
 const PLAN_KEY="sc2-master-coach:active-plan:v1";
 const $c=id=>document.getElementById(id);
 let replayDetail=null;
 let coachPanel=null;
 let planPanel=null;
 let legacyMap=null;
 let legacyMapExplainer=null;
 let activePlanId=localStorage.getItem(PLAN_KEY)||"";

 const safe=x=>String(x??"").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
 const fmt=s=>`${Math.floor(Math.max(0,+s||0)/60)}:${String(Math.floor(Math.max(0,+s||0))%60).padStart(2,"0")}`;

 function profile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"null")||{}}catch{return {}}}
 function saveReplayIdentity(name){const p=profile();p.replayName=name;p.done=p.done!==false;localStorage.setItem(PROFILE_KEY,JSON.stringify(p))}
 function speak(text){
  if(!text||!("speechSynthesis" in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(String(text));u.rate=.96;u.pitch=1;u.volume=1;speechSynthesis.speak(u);
 }
 function planSpeech(plan){
  if(!plan)return "No strategy plan is selected.";
  const steps=(plan.steps||[]).map(step=>`At ${fmt(step[0])}, ${step[1]}. ${step[3]}`).join(" ");
  return `${plan.title}. ${plan.concept} ${steps}`;
 }

 function installCoachPanel(){
  legacyMap=document.querySelector(".tactical-map");
  if(!legacyMap||$c("coachBriefing"))return;
  legacyMap.classList.add("coach-replaced-map");
  const label=legacyMap.querySelector(".map-label");if(label)label.textContent="Abstract decision map · conceptual model, not the actual StarCraft II map";
  coachPanel=document.createElement("section");
  coachPanel.id="coachBriefing";coachPanel.className="frame panel-pad coach-briefing";
  coachPanel.innerHTML=`<div class="coach-head"><div><div class="coach-title">Coach Narrative</div><div class="coach-sub" id="coachSub">Plain-language strategy replaces the abstract center diagram.</div></div><div class="coach-actions"><button class="hud-btn" id="readCoachBtn">Read briefing</button><button class="hud-btn" id="toggleDecisionMap">Show decision map</button></div></div><div id="coachNarrativeBody"></div><div class="map-explainer" id="mapExplainer">The decision map is an abstract coaching model showing pressure, contest and tech relationships. It is not a replay screenshot or literal StarCraft II terrain. The Moment Intelligence Theater below is where actual replay frames and tactical maps belong.</div>`;
  legacyMap.before(coachPanel);
  $c("readCoachBtn").onclick=()=>speak(currentBriefingText());
  $c("toggleDecisionMap").onclick=()=>{
   const hidden=legacyMap.classList.toggle("coach-replaced-map");
   $c("toggleDecisionMap").textContent=hidden?"Show decision map":"Hide decision map";
   $c("mapExplainer").classList.toggle("show",!hidden);
  };
  renderLiveNarrative();
 }

 function installPlanPanel(){
  if($c("planLibraryPanel"))return;
  const zone=$c("buildPriorityZone")||document.querySelector(".command-center");
  if(!zone)return;
  planPanel=document.createElement("section");
  planPanel.id="planLibraryPanel";planPanel.className="frame panel-pad plan-library-panel";
  planPanel.innerHTML=`<div class="plan-head"><div><div class="section-title">Build & Strategy Library <span>matchup + scenario</span></div><div class="coach-sub">Choose the game state you want to practice, load it into the live build queue, or have the coach read the entire plan aloud.</div></div><div class="plan-actions"><span class="active-plan-badge" id="activePlanBadge"></span><button class="hud-btn" id="loadPlanBtn">Load into coach</button><button class="hud-btn" id="readPlanBtn">Read plan</button></div></div><div class="plan-controls"><div class="plan-field"><label>My race</label><select id="planRace"><option>Zerg</option><option>Terran</option><option>Protoss</option></select></div><div class="plan-field"><label>Opponent</label><select id="planOpponent"><option>Zerg</option><option>Terran</option><option>Protoss</option></select></div><div class="plan-field"><label>Scenario</label><select id="planScenario"></select></div><div class="plan-field"><label>Plan</label><select id="planSelect"></select></div></div><div class="plan-preview" id="planPreview"></div>`;
  zone.after(planPanel);
  const raceNow=$c("railRace")?.textContent||"Zerg",oppNow=$c("opponent")?.value||"Terran";
  $c("planRace").value=raceNow;$c("planOpponent").value=oppNow;
  ["planRace","planOpponent"].forEach(id=>$c(id).addEventListener("change",populateScenarios));
  $c("planScenario").addEventListener("change",populatePlans);
  $c("planSelect").addEventListener("change",renderPlanPreview);
  $c("readPlanBtn").onclick=()=>speak(planSpeech(selectedPlan()));
  $c("loadPlanBtn").onclick=loadSelectedPlan;
  populateScenarios();
 }

 function plansForMatchup(){return window.SC2PlanLibrary?.forMatchup($c("planRace")?.value,$c("planOpponent")?.value)||[]}
 function populateScenarios(){
  const scenarios=[...new Set(plansForMatchup().map(p=>p.scenario))];
  const el=$c("planScenario");if(!el)return;
  el.innerHTML=scenarios.map(s=>`<option>${safe(s)}</option>`).join("");
  populatePlans();
 }
 function populatePlans(){
  const scenario=$c("planScenario")?.value;
  const rows=plansForMatchup().filter(p=>!scenario||p.scenario===scenario);
  const el=$c("planSelect");if(!el)return;
  el.innerHTML=rows.map(p=>`<option value="${safe(p.id)}">${safe(p.title)}</option>`).join("");
  if(activePlanId&&rows.some(p=>p.id===activePlanId))el.value=activePlanId;
  renderPlanPreview();
 }
 function selectedPlan(){return window.SC2PlanLibrary?.get($c("planSelect")?.value)||null}
 function renderPlanPreview(){
  const plan=selectedPlan(),el=$c("planPreview");if(!el)return;
  if(!plan){el.innerHTML='<div class="status">No plan exists for this matchup/scenario yet.</div>';return}
  el.innerHTML=`<h3>${safe(plan.title)}</h3><p><b>${safe(plan.type)}</b> · ${safe(plan.concept)} Timings are benchmark windows for the current 5.0.16b economy; scouting evidence can override the script.</p><div class="plan-preview-steps">${(plan.steps||[]).slice(0,9).map(s=>`<div class="plan-step"><b>${fmt(s[0])} · ${safe(s[2])}</b><strong>${safe(s[1])}</strong><span>${safe(s[3])}</span></div>`).join("")}</div>`;
  if($c("activePlanBadge"))$c("activePlanBadge").textContent=plan.id===activePlanId?"Active plan":"";
 }
 function loadSelectedPlan(){
  const plan=selectedPlan();if(!plan||typeof BUILD!=="object")return;
  BUILD[plan.race]=(plan.steps||[]).map(step=>step.slice());
  activePlanId=plan.id;localStorage.setItem(PLAN_KEY,activePlanId);
  const raceButton=[...document.querySelectorAll(".race-btn")].find(b=>b.dataset.race===plan.race);if(raceButton)raceButton.click();
  if($c("opponent")){$c("opponent").value=plan.opponent;$c("opponent").dispatchEvent(new Event("change"));}
  renderPlanPreview();renderLiveNarrative();
  window.dispatchEvent(new CustomEvent("sc2:plan-loaded",{detail:plan}));
 }

 function liveBriefingData(){
  return {
   doctrine:$c("doctrineName")?.textContent||"Current doctrine",
   posture:$c("doctrinePosture")?.textContent||"",
   execute:$c("execute")?.textContent||"Continue the current plan",
   why:$c("executeWhy")?.textContent||"",
   next:$c("nextAction")?.textContent||"Adapt to the next observation",
   threat:$c("alertLevel")?.textContent||"STABLE",
   threatCopy:$c("alertCopy")?.textContent||"No exception signal selected.",
   matchup:$c("railMatchup")?.textContent||"",
  };
 }
 function renderLiveNarrative(){
  if(!coachPanel||replayDetail)return;
  const x=liveBriefingData(),plan=window.SC2PlanLibrary?.get(activePlanId);
  $c("coachSub").textContent="Live strategy in plain language · what to do, why it matters, and what comes next.";
  $c("coachNarrativeBody").innerHTML=`<div class="narrative-headline">${safe(x.matchup)} · ${safe(plan?.title||x.doctrine)}${plan?` — ${safe(plan.scenario)}`:""}</div><div class="coach-live-grid"><div class="coach-live-card"><b>Right now</b><strong>${safe(x.execute)}</strong><span>${safe(x.why)}</span></div><div class="coach-live-card"><b>Why this state matters</b><strong>${safe(x.threat)}</strong><span>${safe(x.threatCopy)}</span></div><div class="coach-live-card"><b>Next transition</b><strong>${safe(x.next)}</strong><span>${safe(plan?.concept||x.posture||"Scout before the next irreversible commitment.")}</span></div></div><div class="coach-boundary">This live briefing is coaching guidance from the selected build, matchup doctrine and scouting buttons. It does not read the live StarCraft II process or automate gameplay.</div>`;
 }
 function currentBriefingText(){
  if(replayDetail){return replayDetail.analysis?.strategy_narrative?.spoken_text||fallbackReplaySpeech(replayDetail)}
  const x=liveBriefingData(),plan=window.SC2PlanLibrary?.get(activePlanId);
  return `${x.matchup}. ${plan?.title||x.doctrine}. Right now, ${x.execute}. ${x.why} Threat state ${x.threat}. ${x.threatCopy} Next, ${x.next}. ${plan?.concept||x.posture}`;
 }

 function identityReason(player){
  const p=profile();
  if(p.replayName&&String(p.replayName).trim().toLowerCase()===String(player?.name||"").trim().toLowerCase())return "remembered replay identity";
  if(window.__sc2IdentityReason)return window.__sc2IdentityReason;
  return "confirm this player once";
 }
 function renderReplayNarrative(detail){
  replayDetail=detail;if(!coachPanel)return;
  const data=detail.data||{},player=detail.player||{},analysis=detail.analysis||{},n=analysis.strategy_narrative||{};
  $c("coachSub").textContent="Replay story · what the game was trying to become, where it bent, and what to change next.";
  const players=data.players||[];
  const identity=`<div class="identity-bar"><label>Viewing replay as</label><select id="replayIdentitySelect">${players.map(p=>`<option value="${p.pid}" ${p.pid===player.pid?"selected":""}>${safe(p.name)} · ${safe(p.race)} · ${safe(p.result)}</option>`).join("")}</select><div class="identity-reason">${safe(identityReason(player))}<br>selection is saved locally</div></div>`;
  const chapters=(n.chapters||[]).map(ch=>`<div class="narrative-chapter"><b>${safe(ch.label)}</b><p>${safe(ch.text)}</p></div>`).join("");
  $c("coachNarrativeBody").innerHTML=`${identity}<div class="narrative-headline">${safe(n.headline||`${analysis.matchup||"Replay"} strategy review`)}</div><div class="narrative-chapters">${chapters||`<div class="narrative-chapter"><b>Replay review</b><p>${safe(fallbackReplaySpeech(detail))}</p></div>`}</div><div class="coach-boundary">${safe(n.evidence_boundary||"Replay facts and coaching interpretations are kept separate; the app does not claim access to private thought.")}</div>`;
  const select=$c("replayIdentitySelect");if(select)select.onchange=()=>{
   const pid=+select.value,chosen=players.find(p=>p.pid===pid);if(chosen)saveReplayIdentity(chosen.name);
   if(typeof window.sc2ShowReplayAs==="function")window.sc2ShowReplayAs(pid);
  };
  syncPlanSelectorsFromReplay(detail);
 }
 function fallbackReplaySpeech(detail){
  const p=detail.player||{},a=detail.analysis||{},v=(a.violations||[])[0];
  return `You are reviewing ${p.name||"the selected player"} in ${a.matchup||"this matchup"}. ${a.doctrine?.summary||"Use evidence before commitment."} ${v?`The first major review point is ${v.title} at ${v.time}. ${v.better}`:"No high-confidence doctrine violation was found."}`;
 }
 function syncPlanSelectorsFromReplay(detail){
  if(!$c("planRace")||!$c("planOpponent"))return;
  const p=detail.player||{},opp=(detail.data?.players||[]).find(x=>x.pid!==p.pid);
  if(p.race)$c("planRace").value=p.race;if(opp?.race)$c("planOpponent").value=opp.race;
  populateScenarios();
  const fastThird=detectFastThird(detail);
  if(fastThird&&[...$c("planScenario").options].some(o=>o.value==="Opponent Fast Third / 3 Bases")){$c("planScenario").value="Opponent Fast Third / 3 Bases";populatePlans()}
 }
 function detectFastThird(detail){
  const p=detail.player||{},opp=(detail.data?.players||[]).find(x=>x.pid!==p.pid);if(!opp)return false;
  const ex=(detail.data?.build_events||[]).filter(e=>e.pid===opp.pid&&e.kind==="expansion"&&e.second<=330);
  return ex.length>=2;
 }

 function observeLiveChanges(){
  const nodes=["execute","executeWhy","nextAction","alertLevel","alertCopy","doctrineName","doctrinePosture","railMatchup"].map($c).filter(Boolean);
  if(!nodes.length)return;
  const obs=new MutationObserver(()=>{if(!replayDetail)renderLiveNarrative()});nodes.forEach(n=>obs.observe(n,{childList:true,subtree:true,characterData:true}));
 }
 function start(){
  installCoachPanel();installPlanPanel();observeLiveChanges();
  window.addEventListener("sc2:replay",e=>renderReplayNarrative(e.detail));
  window.addEventListener("sc2:plan-loaded",()=>{replayDetail=null;renderLiveNarrative()});
  if(window.__sc2LastReplay)renderReplayNarrative(window.__sc2LastReplay);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
