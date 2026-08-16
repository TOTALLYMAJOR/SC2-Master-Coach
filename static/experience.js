(function(){
 const $x=id=>document.getElementById(id);
 const stateKey="sc2-master-coach:first-run:v1";
 function addExperienceUI(){
  const replaySection=$x("replayResult")?.parentElement;
  if(replaySection){
   const q=document.createElement("div");q.className="quick-actions";q.innerHTML='<button class="hud-btn" id="latestReplayBtn">Analyze latest replay</button><button class="hud-btn" id="onboardingBtn">Setup</button>';
   replaySection.insertBefore(q,$x("replayResult"));
   const obs=document.createElement("div");obs.id="observationPanel";obs.className="obs-panel";obs.style.display="none";obs.innerHTML='<div class="section-title">Observation Reconstruction <span>camera → visibility → decision</span></div><div id="obsBody"></div>';
   replaySection.appendChild(obs);
  }
  const overlay=document.createElement("div");overlay.id="firstRun";overlay.className="first-run";overlay.innerHTML=`<div class="onboard-card"><h2>Welcome, Commander</h2><p>Three choices get you into the coach. Everything else can wait. Your profile stays on this computer.</p><div class="onboard-fields"><label>Name<input id="obName" placeholder="Commander"></label><label>Preferred race<select id="obRace"><option>Zerg</option><option>Terran</option><option>Protoss</option></select></label><label>Current level<select id="obLevel"><option>Bronze</option><option>Silver</option><option>Gold</option><option>Platinum</option><option>Diamond</option><option>Master+</option></select></label></div><div class="onboard-actions"><button class="onboard-action" id="obTrain"><strong>TRAIN NOW</strong><span>Open the Command HUD and start the practice clock.</span></button><button class="onboard-action" id="obReplay"><strong>ANALYZE REPLAY</strong><span>Choose a .SC2Replay or let the app find your latest game.</span></button><button class="onboard-action" id="obDemo"><strong>TRY DEMO MATCH</strong><span>See the replay and observation engine without finding a file first.</span></button></div></div>`;document.body.appendChild(overlay);
  const up=document.createElement("div");up.id="updateBanner";up.className="update-banner";up.innerHTML='<strong id="updateTitle">Update available</strong><p id="updateCopy"></p><button class="hud-btn" id="updateBtn">Download update</button>';document.body.appendChild(up);
 }
 function saveProfile(){localStorage.setItem(stateKey,JSON.stringify({name:$x("obName").value||"Commander",race:$x("obRace").value,level:$x("obLevel").value,done:true}))}
 function applyProfile(){try{const p=JSON.parse(localStorage.getItem(stateKey)||"null");if(p?.race){const b=[...document.querySelectorAll(".race-btn")].find(x=>x.dataset.race===p.race);if(b)b.click()}return p}catch{return null}}
 function closeOnboard(){saveProfile();$x("firstRun").classList.remove("show")}
 async function latestReplay(){const status=$x("replayStatus");status.textContent="Finding your latest replay…";try{const r=await fetch("/api/replay/analyze-latest",{method:"POST"}),d=await r.json();if(!r.ok)throw new Error(d.detail||d.error||d.hint);showReplay(d);status.textContent="Latest replay reconstructed.";status.className="status ok";return true}catch(e){status.textContent=e.message||"No replay found automatically.";status.className="status error";return false}}
 function renderObservation(a){const model=a?.observation_model,p=$x("observationPanel"),body=$x("obsBody");if(!p||!body||!model)return;p.style.display="block";const s=model.summary||{},c=model.coverage||{};const fmt=v=>v==null?"—":v;body.innerHTML=`<div class="obs-grid"><div class="obs-metric"><b>${fmt(c.plausibly_observed)}/${fmt(c.opportunities)}</b><span>Plausibly observed</span></div><div class="obs-metric"><b>${fmt(s.median_observation_latency_seconds)}s</b><span>Observation latency</span></div><div class="obs-metric"><b>${fmt(s.median_inference_proxy_latency_seconds)}s</b><span>Inference proxy</span></div><div class="obs-metric"><b>${fmt(s.median_decision_latency_seconds)}s</b><span>Decision latency</span></div></div><div class="obs-list">${(model.opportunities||[]).slice(0,10).map(x=>`<div class="obs-row"><span>${x.event_time}</span><div><strong>${x.enemy_unit}</strong><br>${x.status.replaceAll("_"," ")} · decision ${x.decision_proxy||"not confirmed"}</div><span class="confidence ${x.confidence}">${x.confidence}</span></div>`).join("")||'<div class="status">No observation opportunities reconstructed from this replay.</div>'}</div><div class="status">${model.evidence_boundary||""}</div>`}
 async function launchContext(){try{const r=await fetch("/api/launch-context"),d=await r.json();if(d.replay){showReplay(d.replay);$x("firstRun")?.classList.remove("show")}}catch{}}
 async function checkUpdate(){try{const r=await fetch("/api/update/check"),d=await r.json();if(d.available){$x("updateTitle").textContent=`SC2 Master Coach ${d.latest_version} is available`;$x("updateCopy").textContent="Updates are distributed free through GitHub Releases.";$x("updateBanner").classList.add("show")}}catch{}}
 addExperienceUI();const profile=applyProfile();if(!profile?.done)$x("firstRun").classList.add("show");
 $x("onboardingBtn").onclick=()=>{$x("firstRun").classList.add("show")};
 $x("latestReplayBtn").onclick=latestReplay;
 $x("obTrain").onclick=()=>{closeOnboard();if(!$x("playBtn").classList.contains("active"))$x("playBtn").click()};
 $x("obReplay").onclick=async()=>{closeOnboard();if(!(await latestReplay()))$x("replayFile").click()};
 $x("obDemo").onclick=()=>{closeOnboard();$x("demoBtn").click()};
 $x("updateBtn").onclick=async()=>{await fetch("/api/update/open",{method:"POST"});$x("updateBanner").classList.remove("show")};
 window.addEventListener("sc2:replay",e=>renderObservation(e.detail.analysis));
 launchContext();checkUpdate();
})();
