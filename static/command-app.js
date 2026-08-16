let race="Zerg", elapsed=0, running=false, speed=1, timer=null, selected=new Set(), voice=false;
const $=id=>document.getElementById(id);
const fmt=s=>Math.floor(Math.max(0,s)/60)+":"+String(Math.floor(Math.max(0,s))%60).padStart(2,"0");
const raceLetter=r=>r==="Zerg"?"Z":r==="Terran"?"T":"P";
function matchup(){return raceLetter(race)+"v"+raceLetter($("opponent").value)}
function currentStep(){
 const b=BUILD[race];let i=0;for(let n=0;n<b.length;n++){if(elapsed>=b[n][0])i=n;else break}return [i,b[i]];
}
function applyTheme(){
 const r=RACES[race],t=r.theme,root=document.documentElement;
 root.style.setProperty("--accent",t.accent);root.style.setProperty("--accent2",t.accent2);root.style.setProperty("--race-glow",t.glow);root.style.setProperty("--line",t.line);
 $("raceArt").innerHTML=r.art;$("portraitName").textContent=r.portrait.name;$("portraitSub").textContent=r.portrait.sub;$("voiceLine").textContent=r.portrait.voice;
 $("railRace").textContent=race;
 document.querySelectorAll(".race-btn").forEach(b=>b.classList.toggle("active",b.dataset.race===race));
}
function threatModel(){
 const k=[...selected];let score=18,name="STABLE",title="Low strategic pressure",detail="No evidence conflicts with the current economic plan.",cls="";
 if(k.includes("allin")){score=94;name="CRITICAL";title="All-in commitment";detail="Survival allocation overrides the economic script.";cls="critical"}
 else if(k.includes("pressure")){score=78;name="HIGH";title="Pressure wave active";detail="Prepare for the next reinforcement cycle before contact.";cls="critical"}
 else if(k.includes("hidden")){score=62;name="UNCERTAIN";title="Information deficit";detail="Resolve the missing allocation before a fragile commitment.";cls="caution"}
 else if(k.includes("tech")){score=49;name="TECH SHIFT";title="Composition transition";detail="Buy enough of the answer without over-countering.";cls="caution"}
 else if(k.includes("greed")){score=39;name="WINDOW";title="Economic opportunity";detail="Tax greed with economy, map control or efficient pressure.";cls="caution"}
 else if(k.includes("turtle")){score=34;name="CONTAIN";title="Static-defense state";detail="Attack the map, not the fortress.";cls="caution"}
 return {score,name,title,detail,cls};
}
function priorities(){
 const t=threatModel(),d=DOCTRINES[matchup()]||{},step=currentStep()[1],arr=[];
 if(t.name==="CRITICAL")arr.push(["Survive next cycle","Cancel luxury spending and turn production currency into immediate defense."]);
 else if(t.name==="HIGH")arr.push(["Meet pressure before contact","Position for the next wave, not the units currently visible."]);
 else if(t.name==="UNCERTAIN")arr.push(["Resolve uncertainty","Scout before making the most fragile commitment."]);
 else if(t.name==="WINDOW")arr.push(["Tax the greed window","Expand or force defensive spending without a frontal fortress test."]);
 else arr.push([step[1],step[3]]);
 arr.push(["Protect doctrine",d.eco||"Keep the economic spine intact."]);
 arr.push(["Ask next question",d.q||"What changes the next decision?"]);
 return arr;
}
function renderEvidence(){
 $("evidenceList").innerHTML=EVIDENCE[race].map(([n,k],i)=>`<button class="hud-btn ${selected.has(k)?"active":""}" data-k="${k}" style="text-align:left">${i+1} · ${n}</button>`).join("");
 $("evidenceList").querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{selected.has(b.dataset.k)?selected.delete(b.dataset.k):selected.add(b.dataset.k);renderAll()});
}
function renderMap(){
 const t=threatModel(),c=RACES[race].theme.accent;
 $("mapSvg").innerHTML=`
 <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
 <path d="M62 272 C105 221 127 176 186 172 C245 168 262 116 324 122 C394 128 419 78 538 55" fill="none" stroke="${c}" stroke-opacity=".22" stroke-width="7"/>
 <path d="M82 250 L185 185 L298 210 L395 143 L523 72" fill="none" stroke="${c}" stroke-opacity=".65" stroke-width="2" stroke-dasharray="7 5"/>
 <circle cx="82" cy="250" r="26" fill="#07131d" stroke="${c}" stroke-width="3"/><text x="82" y="254" text-anchor="middle" fill="${c}" font-size="12">YOU</text>
 <circle cx="523" cy="72" r="27" fill="#07131d" stroke="#ff7070" stroke-width="3"/><text x="523" y="76" text-anchor="middle" fill="#ff9292" font-size="11">ENEMY</text>
 <circle cx="298" cy="210" r="10" fill="${c}" opacity=".8"/><circle class="map-ping" cx="298" cy="210" r="${t.score>70?40:27}" fill="none" stroke="${t.score>70?"#ff7070":c}" stroke-width="3"/>
 <circle cx="395" cy="143" r="8" fill="#ffd166"/><circle cx="185" cy="185" r="7" fill="#61e6a6"/>
 <text x="310" y="201" fill="#a8bdca" font-size="10">CONTEST</text><text x="404" y="135" fill="#ffd166" font-size="10">TECH</text>
 `;
}
function renderQueue(){
 const b=BUILD[race],i=currentStep()[0],items=b.slice(i,Math.min(b.length,i+4));
 $("buildQueue").innerHTML=items.map((x,n)=>`<div class="build-item" style="--p:${n===0?75:20}%"><b>${x[1]}</b><span>${fmt(x[0])} · ${x[2]}</span></div>`).join("");
}
function renderDoctrine(){
 const d=DOCTRINES[matchup()]||DOCTRINES["ZvT"];
 $("railMatchup").textContent=matchup();$("railDoctrine").textContent=d.name;$("matchupCode").textContent=matchup();$("doctrineName").textContent=d.name;$("doctrinePosture").textContent=d.posture;
 $("docWin").textContent=d.win;$("docEco").textContent=d.eco;$("docFight").textContent=d.fight;$("docQuestion").textContent=d.q;
}
function renderCommand(){
 const [i,s]=currentStep(),b=BUILD[race],next=b[i+1];
 $("phase").textContent=s[2];$("clock").textContent=fmt(elapsed);$("execute").textContent=s[1];$("executeWhy").textContent=s[3];
 $("nextAction").textContent=next?`${next[1]} · ${fmt(next[0])}`:"Adapt to game state";$("nextCountdown").textContent=next?fmt(Math.max(0,next[0]-elapsed)):"—";
}
function renderThreat(){
 const t=threatModel();$("alertLevel").textContent=t.name;$("alertLevel").className="alert-level "+t.cls;$("alertCopy").textContent=t.detail;
 $("railThreat").textContent=t.name;$("railThreat").className="rail-value "+(t.cls==="critical"?"bad":t.cls==="caution"?"warn":"good");
 $("threatScore").textContent=t.score;$("threatRing").style.setProperty("--threat-deg",Math.round(t.score*3.6)+"deg");$("threatTitle").textContent=t.title;$("threatDetail").textContent=t.detail;
}
function renderPriority(){
 $("priorityList").innerHTML=priorities().map((x,i)=>`<div class="priority"><div class="priority-num">${i+1}</div><div><b>${x[0]}</b><span>${x[1]}</span></div></div>`).join("");
}
function renderAll(){applyTheme();renderDoctrine();renderEvidence();renderCommand();renderThreat();renderPriority();renderMap();renderQueue()}
document.querySelectorAll(".race-btn").forEach(b=>b.onclick=()=>{race=b.dataset.race;selected.clear();elapsed=0;renderAll()});
$("opponent").onchange=()=>renderAll();
$("playBtn").onclick=()=>{running=!running;$("playBtn").textContent=running?"Pause":"Start";$("playBtn").classList.toggle("active",running);clearInterval(timer);if(running)timer=setInterval(()=>{elapsed+=speed;renderCommand();renderQueue()},1000)};
$("minusBtn").onclick=()=>{elapsed=Math.max(0,elapsed-10);renderCommand();renderQueue()};
$("plusBtn").onclick=()=>{elapsed+=10;renderCommand();renderQueue()};
$("speedBtn").onclick=()=>{speed=speed===1?2:speed===2?4:1;$("speedBtn").textContent=speed+"×"};
$("voiceBtn").onclick=()=>{voice=!voice;$("voiceBtn").classList.toggle("active",voice);if(voice&&"speechSynthesis"in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance($("execute").textContent))}};
$("fullscreenBtn").onclick=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch(e){}};
document.querySelectorAll(".command-key").forEach(b=>b.onclick=()=>{const c=b.dataset.command;if(c==="Reset"){elapsed=0;selected.clear();renderAll()}else if(c==="Replay")$("replayFile").click();else if(c==="Scout"){if(EVIDENCE[race][5])selected.add(EVIDENCE[race][5][1]);renderAll()}else if(c==="Pressure"){selected.add("pressure");renderAll()}else if(c==="Expand"){selected.add("greed");renderAll()}else if(c==="Hold"){selected.add("allin");renderAll()}else if(c==="Recover"){selected.delete("pressure");selected.delete("allin");renderAll()}else if(c==="Adapt"){selected.add("tech");renderAll()}else if(c==="Trap"){selected.add("hidden");renderAll()}});
document.addEventListener("keydown",e=>{if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName))return;const k=e.key.toLowerCase();if(k===" "){e.preventDefault();$("playBtn").click()}if(/^[1-6]$/.test(k)){const x=$("evidenceList").children[+k-1];if(x)x.click()}const map={q:"Scout",w:"Pressure",e:"Expand",a:"Hold",s:"Adapt",d:"Recover",z:"Trap",x:"Replay",c:"Reset"};if(map[k]){const b=[...document.querySelectorAll(".command-key")].find(x=>x.dataset.command===map[k]);if(b)b.click()}});
const drop=$("replayDrop"),file=$("replayFile"),status=$("replayStatus");
drop.onclick=()=>file.click();["dragenter","dragover"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add("drag")}));["dragleave","drop"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove("drag")}));drop.addEventListener("drop",e=>{const f=e.dataTransfer.files?.[0];if(f)analyzeReplay(f)});file.onchange=()=>{if(file.files[0])analyzeReplay(file.files[0])};
async function health(){try{const r=await fetch("/api/health"),d=await r.json();status.textContent=d.parser_ready?"Replay parser ready.":"Replay server online; parser dependency unavailable.";status.className="status "+(d.parser_ready?"ok":"error")}catch(e){status.textContent="Replay service not running.";status.className="status error"}}
async function analyzeReplay(f){status.textContent="Analyzing replay…";status.className="status";const form=new FormData();form.append("replay",f);try{const r=await fetch("/api/replay/analyze",{method:"POST",body:form}),d=await r.json();if(!r.ok)throw new Error(d.detail||d.error);showReplay(d);status.textContent="Replay reconstructed.";status.className="status ok"}catch(e){status.textContent=e.message||"Replay analysis failed.";status.className="status error"}}
function showReplay(d){const p=d.players?.[0],a=p?d.analysis_by_player?.[String(p.pid)]:null;if(!p||!a)return;$("replayResult").classList.add("show");$("replayMetrics").innerHTML=[["Score",a.score],["Matchup",a.matchup],["Flags",a.violations?.length||0]].map(x=>`<div class="replay-metric"><b>${x[1]}</b><span>${x[0]}</span></div>`).join("");race=p.race&&RACES[p.race]?p.race:race;const opp=d.players.find(x=>x.pid!==p.pid);if(opp&&RACES[opp.race])$("opponent").value=opp.race;const s=a.stats?.at(-1)||{};$("workersVal").textContent=s.workers??"—";$("basesVal").textContent=s.bases??"—";$("armyVal").textContent=s.army_supply_approx??"—";$("bankVal").textContent=s.bank??"—";renderAll()}
$("demoBtn").onclick=async()=>{try{const r=await fetch("/api/demo"),d=await r.json();showReplay(d);status.textContent="Synthetic replay demo loaded.";status.className="status ok"}catch(e){status.textContent="Demo unavailable.";status.className="status error"}};
health();renderAll();
