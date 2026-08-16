(function(){
 "use strict";
 const byId=id=>document.getElementById(id);
 const fmtLocal=s=>Math.floor(Math.max(0,s)/60)+":"+String(Math.floor(Math.max(0,s))%60).padStart(2,"0");
 const workers={Zerg:"Drone",Terran:"SCV",Protoss:"Probe"};
 const structurePattern=/(Hatchery|Spawning Pool|Roach Warren|Baneling Nest|Evolution Chamber|Lair|Hive|Hydralisk Den|Spire|Nydus|Supply Depot|Barracks|Refinery|Command Center|Factory|Starport|Engineering Bay|Armory|Bunker|Missile Turret|Ghost Academy|Fusion Core|Pylon|Gateway|Assimilator|Nexus|Cybernetics Core|Forge|Twilight Council|Robotics Facility|Robotics Bay|Stargate|Fleet Beacon|Templar Archive|Dark Shrine|Photon Cannon|Shield Battery)/i;
 let activeRace=typeof race!=="undefined"?race:"Zerg";
 let actualTimes=new Map();
 let spoken=new Set();
 let previousElapsed=typeof elapsed!=="undefined"?elapsed:0;
 let lastRenderSecond=-1;
 let criticalMoments=[];

 function article(word){return /^[aeiou]/i.test(word)?"an":"a"}
 function cleanAction(action){return String(action||"").replace(/\s+if scout permits/i,"").trim()}
 function cueInstruction(action,r){
  const clean=cleanAction(action),worker=workers[r]||"worker";
  if(/continuously/i.test(clean))return `continue ${clean.replace(/ continuously/i,"")} production`;
  if(structurePattern.test(clean)){
   if(r==="Zerg")return `send one ${worker} to morph into ${article(clean)} ${clean}`;
   if(r==="Protoss")return `pull one ${worker} to warp in ${article(clean)} ${clean}`;
   return `pull one ${worker} to build ${article(clean)} ${clean}`;
  }
  if(/\+|Queens|Zerglings|Reaper|SCV|Probe|Drone|Roach|Marine|Stalker|Adept/i.test(clean))return `queue ${clean.replace(/\+/g," and ")}`;
  if(/Orbital|upgrade|research|Stim|Blink|Warp Gate/i.test(clean))return `start ${clean}`;
  return `prepare ${clean}`;
 }
 function speak(text){
  try{
   if(typeof voice!=="undefined"&&voice&&"speechSynthesis" in window){
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);u.rate=1.05;u.pitch=.95;speechSynthesis.speak(u);
   }
  }catch(_e){}
 }
 function addUI(){
  const command=document.querySelector(".command-center");
  if(command&&!byId("advanceCue")){
   const cue=document.createElement("div");cue.id="advanceCue";cue.className="advance-cue idle";
   cue.innerHTML='<div class="cue-count" id="cueCount">—</div><div class="cue-copy"><b id="cueTitle">Advance warning armed</b><span id="cueText">A five-second preparation cue will appear before each build action.</span></div><div class="cue-mode" id="cueMode">visual + optional voice</div>';
   const footer=command.querySelector(".command-footer");footer?command.insertBefore(cue,footer):command.appendChild(cue);
  }
  const queue=byId("buildQueue")?.closest("section");
  if(queue&&!byId("buildLog")){
   const section=document.createElement("section");section.className="frame panel-pad build-log-panel";
   section.innerHTML='<div class="section-title">Build Log <span>planned + cue history</span></div><div class="build-log-toolbar"><button class="hud-btn" id="copyBuildLog">Copy log</button><button class="hud-btn" id="clearBuildLog">Reset session</button></div><div class="build-log" id="buildLog" style="margin-top:6px"></div>';
   queue.after(section);
   byId("copyBuildLog").onclick=copyBuildLog;
   byId("clearBuildLog").onclick=()=>{actualTimes.clear();spoken.clear();previousElapsed=typeof elapsed!=="undefined"?elapsed:0;renderExecutionUI(true)};
  }
  const replay=byId("replayResult")?.closest("section");
  if(replay&&!byId("criticalMoments")){
   const section=document.createElement("section");section.className="frame panel-pad critical-panel";
   section.innerHTML='<div class="section-title">Critical Moment Snapshots <span>reconstructed stills</span></div><div class="critical-note">Generated from replay events, camera/selection evidence and tactical positions. These are analytical reconstructions—not game-rendered video frames.</div><div class="critical-grid" id="criticalMoments"><div class="critical-empty">Analyze a replay to generate the most consequential observation, engagement and doctrine snapshots.</div></div>';
   replay.after(section);
  }
 }
 function resetForRace(){activeRace=race;actualTimes=new Map();spoken=new Set();previousElapsed=elapsed;lastRenderSecond=-1}
 function recordCrossedSteps(){
  const build=BUILD[race]||[];
  build.forEach((step,i)=>{
   if(elapsed>=step[0]&&!actualTimes.has(i)){
    actualTimes.set(i,elapsed);
    const key=`${race}:${i}:now`;
    if(step[0]>0&&previousElapsed<step[0]&&!spoken.has(key)){
     spoken.add(key);speak(`Now, ${cueInstruction(step[1],race)}.`);
    }
   }
  });
 }
 function nextStepInfo(){
  const build=BUILD[race]||[];
  const idx=build.findIndex(step=>step[0]>elapsed);
  return idx<0?null:{idx,step:build[idx],remaining:Math.max(0,build[idx][0]-elapsed)};
 }
 function renderCue(){
  const cue=byId("advanceCue");if(!cue)return;
  const next=nextStepInfo();
  if(!next){cue.className="advance-cue idle";byId("cueCount").textContent="✓";byId("cueTitle").textContent="Opening sequence complete";byId("cueText").textContent="Continue from doctrine and current scouting evidence.";return}
  const instruction=cueInstruction(next.step[1],race),remaining=Math.ceil(next.remaining),key=`${race}:${next.idx}`;
  if(remaining<=5&&remaining>0){
   cue.className="advance-cue prepare";byId("cueCount").textContent=remaining;byId("cueTitle").textContent=`PREPARE · ${next.step[1]}`;byId("cueText").textContent=`In ${remaining} game second${remaining===1?"":"s"}, ${instruction}.`;
   if(!spoken.has(key+":prepare")){spoken.add(key+":prepare");speak(`In five seconds, ${instruction}.`)}
  }else{
   cue.className="advance-cue idle";byId("cueCount").textContent=fmtLocal(remaining);byId("cueTitle").textContent=`Next · ${next.step[1]}`;byId("cueText").textContent=`Prepare cue triggers at ${fmtLocal(Math.max(0,next.step[0]-5))}.`;
  }
 }
 function renderBuildLog(force=false){
  const el=byId("buildLog");if(!el)return;
  const second=Math.floor(elapsed);if(!force&&second===lastRenderSecond)return;lastRenderSecond=second;
  const build=BUILD[race]||[],next=nextStepInfo();
  el.innerHTML=build.map((step,i)=>{
   const actual=actualTimes.get(i),done=actual!==undefined;
   const cls=done?"done":i===next?.idx?"active":"queued";
   const delta=done?actual-step[0]:null;
   const status=done?"Cue issued":i===next?.idx?"Next":"Queued";
   return `<div class="build-log-row ${cls}" data-step="${i}"><div class="build-log-time">${fmtLocal(step[0])}</div><div class="build-log-main"><b>${step[1]}</b><span>${step[2]} · ${step[3]}</span></div><div class="build-log-status">${status}${done?`<span class="build-log-delta">cue ${fmtLocal(actual)} · ${delta===0?"on time":delta>0?`+${delta}s`:`${delta}s`}</span>`:""}</div></div>`;
  }).join("");
  const current=el.querySelector(".active");if(current&&force)current.scrollIntoView({block:"nearest"});
 }
 function copyBuildLog(){
  const lines=(BUILD[race]||[]).map((s,i)=>{const actual=actualTimes.get(i);return `${fmtLocal(s[0])}\t${s[1]}\t${actual===undefined?"not reached":`cue ${fmtLocal(actual)} (${actual-s[0]>=0?"+":""}${actual-s[0]}s)`}`});
  navigator.clipboard?.writeText([`SC2 Master Coach — ${race} build log`,...lines].join("\n"));
  const b=byId("copyBuildLog");if(b){const old=b.textContent;b.textContent="Copied";setTimeout(()=>b.textContent=old,900)}
 }
 function renderExecutionUI(force=false){
  if(typeof race==="undefined"||typeof elapsed==="undefined"||typeof BUILD==="undefined")return;
  if(race!==activeRace||(elapsed===0&&previousElapsed>2))resetForRace();
  recordCrossedSteps();renderCue();renderBuildLog(force);previousElapsed=elapsed;
 }

 function severityRank(v){return v==="high"?4:v==="medium"?3:v==="review"?2:1}
 function createCriticalMoments(detail){
  const data=detail?.data||{},analysis=detail?.analysis||{},player=detail?.player||{};
  const moments=[];
  const obs=analysis.observation_model?.opportunities||[];
  obs.forEach(o=>{
   const late=(o.observation_latency_seconds??0)>5||(o.decision_latency_seconds??0)>10;
   if(o.status!=="plausibly_observed"||late){
    const status=o.status==="not_confirmed"?"Information not confirmed":o.status==="plausibly_visible_not_camera_confirmed"?"Plausibly visible; camera not confirmed":o.status==="camera_attention_without_position_proof"?"Camera attention without position proof":"Late observation/decision";
    moments.push({type:"observation",second:o.camera_attention_second??o.event_second,time:fmtLocal(o.camera_attention_second??o.event_second),title:`${o.enemy_unit} · ${status}`,detail:`Observation ${o.observation_latency_seconds??"—"}s · inference ${o.inference_latency_seconds??"—"}s · decision ${o.decision_latency_seconds??"—"}s · ${o.confidence} confidence`,severity:late?"high":"review",position:o.position,raw:o});
   }
  });
  const oppPid=(data.players||[]).find(p=>p.pid!==player.pid)?.pid;
  (data.engagements||[]).forEach(g=>{
   const me=g.players?.[String(player.pid)]||{},opp=g.players?.[String(oppPid)]||{};
   const lost=me.resources_lost||0,killed=me.resources_killed||0;
   if(lost>=500||g.deaths>=8)moments.push({type:"engagement",second:g.start_second,time:g.start,title:`Engagement · ${killed>=lost?"favorable":"unfavorable"} exchange`,detail:`${g.deaths} deaths · lost ${lost} / killed ${killed} · army before ${me.army_value_before||"—"} vs ${opp.army_value_before||"—"}`,severity:lost>killed*1.35?"high":"medium",position:g.location,raw:g});
  });
  (analysis.violations||[]).forEach(v=>{
   const nearby=(data.engagements||[]).find(g=>Math.abs((g.start_second||0)-(v.second||0))<=25);
   moments.push({type:"doctrine",second:v.second,time:v.time,title:v.title,detail:v.evidence||v.why||"Doctrine review anchor",severity:v.severity||"review",position:nearby?.location||null,raw:v});
  });
  const seen=new Set();
  return moments.sort((a,b)=>severityRank(b.severity)-severityRank(a.severity)||a.second-b.second).filter(m=>{const k=`${m.type}:${m.second}:${m.title}`;if(seen.has(k))return false;seen.add(k);return true}).slice(0,6);
 }
 function drawSnapshot(canvas,m,index){
  const dpr=Math.max(1,window.devicePixelRatio||1),w=640,h=360;canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext("2d");c.scale(dpr,dpr);
  const accent=getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()||"#5bdcff";
  const severity=m.severity==="high"?"#ff7070":m.severity==="medium"?"#ffd166":m.severity==="review"?"#b284ff":accent;
  const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,"#04131d");bg.addColorStop(1,"#010508");c.fillStyle=bg;c.fillRect(0,0,w,h);
  c.strokeStyle="rgba(91,220,255,.09)";c.lineWidth=1;for(let x=0;x<=w;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<=h;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}
  c.strokeStyle="rgba(91,220,255,.25)";c.strokeRect(18,18,w-36,h-36);
  c.fillStyle="#dceaf2";c.font="900 18px system-ui";c.fillText(m.time||fmtLocal(m.second),28,45);
  c.fillStyle=severity;c.font="800 13px system-ui";c.textAlign="right";c.fillText(`${m.type.toUpperCase()} · ${String(m.severity).toUpperCase()}`,w-28,43);c.textAlign="left";
  const p=m.position&&Number.isFinite(+m.position.x)&&Number.isFinite(+m.position.y)?m.position:null;
  const px=p?40+(Math.max(0,Math.min(256,+p.x))/256)*(w-80):w*.62;
  const py=p?55+(1-Math.max(0,Math.min(256,+p.y))/256)*(h-125):h*.48;
  if(m.type==="engagement"){
   for(let r=18;r<=62;r+=15){c.strokeStyle=`rgba(255,112,112,${.7-r/100})`;c.lineWidth=3;c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.stroke()}
   c.fillStyle="#ff7070";c.beginPath();c.arc(px,py,7,0,Math.PI*2);c.fill();
  }else if(m.type==="observation"){
   c.strokeStyle=severity;c.lineWidth=3;c.setLineDash([8,5]);c.strokeRect(px-46,py-30,92,60);c.setLineDash([]);
   c.fillStyle="#ff7070";c.beginPath();c.moveTo(px,py-14);c.lineTo(px+12,py+10);c.lineTo(px-12,py+10);c.closePath();c.fill();
   c.strokeStyle=accent;c.lineWidth=2;c.beginPath();c.moveTo(70,h-105);c.lineTo(px-48,py);c.stroke();
   c.fillStyle=accent;c.beginPath();c.arc(70,h-105,8,0,Math.PI*2);c.fill();
  }else{
   c.strokeStyle=severity;c.lineWidth=4;c.beginPath();c.arc(px,py,34,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(px-52,py);c.lineTo(px+52,py);c.moveTo(px,py-52);c.lineTo(px,py+52);c.stroke();
  }
  c.fillStyle="rgba(2,7,11,.9)";c.fillRect(18,h-92,w-36,74);c.strokeStyle="rgba(91,220,255,.18)";c.strokeRect(18,h-92,w-36,74);
  c.fillStyle="#edf8ff";c.font="800 15px system-ui";const title=String(m.title||"");c.fillText(title.length>68?title.slice(0,65)+"…":title,29,h-64);
  c.fillStyle="#8fa8b8";c.font="12px system-ui";const detail=String(m.detail||"");const words=detail.split(/\s+/);let line="",y=h-42;for(const word of words){const test=line+word+" ";if(c.measureText(test).width>w-60){c.fillText(line,29,y);line=word+" ";y+=16;if(y>h-20)break}else line=test}if(y<=h-20)c.fillText(line,29,y);
  c.fillStyle="rgba(91,220,255,.7)";c.font="700 10px system-ui";c.textAlign="right";c.fillText(`RECONSTRUCTED SNAPSHOT ${String(index+1).padStart(2,"0")}`,w-27,h-22);c.textAlign="left";
 }
 function renderCriticalMoments(detail){
  const el=byId("criticalMoments");if(!el)return;criticalMoments=createCriticalMoments(detail);
  if(!criticalMoments.length){el.innerHTML='<div class="critical-empty">No high-signal critical moments were reconstructed for this replay. Review the complete replay timeline for subtler decisions.</div>';return}
  el.innerHTML=criticalMoments.map((m,i)=>`<article class="critical-card"><canvas class="critical-canvas" data-snapshot="${i}"></canvas><div class="critical-meta"><div class="critical-meta-top"><b>${m.time} · ${m.title}</b><span class="critical-badge ${m.severity}">${m.severity}</span></div><p>${m.detail}</p><div class="snapshot-actions"><button class="hud-btn snapshot-download" data-download="${i}">Save PNG</button></div></div></article>`).join("");
  el.querySelectorAll("canvas[data-snapshot]").forEach(canvas=>drawSnapshot(canvas,criticalMoments[+canvas.dataset.snapshot],+canvas.dataset.snapshot));
  el.querySelectorAll("[data-download]").forEach(btn=>btn.onclick=()=>downloadSnapshot(+btn.dataset.download));
 }
 function downloadSnapshot(i){
  const canvas=byId("criticalMoments")?.querySelector(`canvas[data-snapshot="${i}"]`),m=criticalMoments[i];if(!canvas||!m)return;
  canvas.toBlob(blob=>{if(!blob)return;const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`SC2-Master-Coach-${String(m.time).replace(":","-")}-${m.type}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)},"image/png");
 }
 addUI();
 window.addEventListener("sc2:replay",e=>renderCriticalMoments(e.detail));
 if(window.__sc2LastReplay)renderCriticalMoments(window.__sc2LastReplay);
 setInterval(()=>renderExecutionUI(false),200);
 renderExecutionUI(true);
})();
