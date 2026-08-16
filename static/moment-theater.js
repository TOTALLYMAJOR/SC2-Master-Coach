(function(){
  "use strict";
  const $m=id=>document.getElementById(id);
  const MODES=["player","truth","map"];
  let replayDetail=null;
  let moments=[];
  let selectedIndex=0;
  let mode="player";
  let captureReady=null;
  let theaterInitialized=false;

  const fmt=s=>`${Math.floor(Math.max(0,+s||0)/60)}:${String(Math.floor(Math.max(0,+s||0))%60).padStart(2,"0")}`;
  const severityRank=s=>s==="high"?4:s==="medium"?3:s==="review"?2:1;
  const safe=x=>String(x??"").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));

  function waitForAnchor(){
    const log=document.querySelector(".build-log-panel");
    const queue=$m("buildQueue")?.closest("section");
    const anchor=log||queue;
    if(anchor){initTheater(anchor);return}
    const observer=new MutationObserver(()=>{
      const found=document.querySelector(".build-log-panel")||$m("buildQueue")?.closest("section");
      if(found){observer.disconnect();initTheater(found)}
    });
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),10000);
  }

  function initTheater(anchor){
    if(theaterInitialized)return;
    theaterInitialized=true;
    const section=document.createElement("section");
    section.id="momentTheater";
    section.className="frame panel-pad moment-theater";
    section.innerHTML=`
      <div class="moment-head">
        <div><div class="section-title">Moment Intelligence Theater <span>actual SC2 frame + tactical truth</span></div><div class="moment-sub">Click the display to cycle Player POV → Observer Truth → Tactical Map.</div></div>
        <div class="moment-mode-tabs" role="tablist">
          <button class="hud-btn moment-mode active" data-mode="player">Player POV</button>
          <button class="hud-btn moment-mode" data-mode="truth">Observer Truth</button>
          <button class="hud-btn moment-mode" data-mode="map">Tactical Map</button>
        </div>
      </div>
      <div class="moment-layout">
        <div class="moment-stage" id="momentStage" tabindex="0" aria-label="Critical moment display; click to change view">
          <img id="momentFrame" alt="StarCraft II replay frame" hidden>
          <canvas id="momentMap" width="1280" height="720"></canvas>
          <div class="moment-loading" id="momentLoading"><strong>Awaiting replay</strong><span>Analyze a replay to populate actual engine frames and tactical intelligence.</span></div>
          <div class="moment-stage-top"><span id="momentTime">—</span><b id="momentModeLabel">TACTICAL MAP</b></div>
          <div class="moment-stage-bottom"><strong id="momentTitle">No critical moment selected</strong><span id="momentDetail">The theater uses the empty center workspace for the most decision-relevant replay evidence.</span></div>
          <img id="momentMinimap" class="moment-minimap" alt="SC2 minimap frame" hidden>
        </div>
        <aside class="moment-intel">
          <div class="intel-kicker">Decision chain</div>
          <div class="decision-chain" id="decisionChain"></div>
          <div class="intel-kicker">What this communicates</div>
          <div class="intel-copy" id="momentIntelCopy">Player POV shows the engine-rendered information state. Observer Truth reveals what existed at the same camera and timestamp. Tactical Map explains why the difference mattered.</div>
          <div class="intel-status" id="captureStatus">Checking local SC2 rendering capability…</div>
          <div class="moment-intel-actions"><button class="hud-btn" id="renderMomentBtn">Render actual SC2 frames</button><button class="hud-btn" id="openCaseBtn">Open case folder</button></div>
        </aside>
      </div>
      <div class="moment-filmstrip" id="momentFilmstrip"><div class="moment-empty">No replay moments loaded.</div></div>`;
    anchor.after(section);
    document.body.classList.add("moment-theater-ready");
    section.querySelectorAll(".moment-mode").forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
    $m("momentStage").onclick=()=>cycleMode();
    $m("momentStage").onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();cycleMode()}};
    $m("renderMomentBtn").onclick=()=>captureSelected(true);
    $m("openCaseBtn").onclick=openCaseFolder;
    checkCaptureStatus();
    if(replayDetail)loadReplay(replayDetail);
  }

  async function checkCaptureStatus(){
    try{
      const r=await fetch("/api/replay/capture/status"),d=await r.json();
      captureReady=!!d.available;
      const status=$m("captureStatus");
      if(status){
        status.className="intel-status "+(captureReady?"ok":"warn");
        status.textContent=captureReady
          ?"Actual frame rendering ready. SC2 Master Coach will launch the local SC2 renderer on demand."
          :(d.reason||"Actual frame rendering is unavailable; tactical reconstruction remains active.");
      }
    }catch(e){
      captureReady=false;
      if($m("captureStatus")){$m("captureStatus").className="intel-status warn";$m("captureStatus").textContent="Capture service unavailable; tactical map remains active."}
    }
  }

  function deriveMoments(detail){
    const data=detail?.data||{},analysis=detail?.analysis||{},player=detail?.player||{};
    const rows=[];
    const obs=analysis.observation_model?.opportunities||[];
    obs.forEach((o,i)=>{
      const late=(o.observation_latency_seconds??0)>5||(o.decision_latency_seconds??0)>10;
      if(o.status!=="plausibly_observed"||late){
        rows.push({
          id:`obs-${i}-${o.event_second}`,
          type:"observation",severity:late?"high":"review",
          second:o.camera_attention_second??o.event_second,
          time:fmt(o.camera_attention_second??o.event_second),
          title:`${o.enemy_unit} · ${o.status.replaceAll("_"," ")}`,
          detail:`Observation ${o.observation_latency_seconds??"—"}s · inference ${o.inference_latency_seconds??"—"}s · decision ${o.decision_latency_seconds??"—"}s · ${o.confidence} confidence`,
          position:o.position||null,raw:o,
        });
      }
    });
    const opp=(data.players||[]).find(p=>p.pid!==player.pid);
    (data.engagements||[]).forEach((g,i)=>{
      const me=g.players?.[String(player.pid)]||{},them=opp?g.players?.[String(opp.pid)]||{}:{};
      const lost=me.resources_lost||0,killed=me.resources_killed||0;
      if(lost>=400||g.deaths>=6){
        rows.push({
          id:`fight-${i}-${g.start_second}`,
          type:"engagement",severity:lost>killed*1.35?"high":"medium",
          second:g.start_second,time:g.start,
          title:`Engagement · ${killed>=lost?"favorable":"unfavorable"} exchange`,
          detail:`${g.deaths} deaths · lost ${lost} / killed ${killed} · army ${me.army_value_before||"—"} vs ${them.army_value_before||"—"}`,
          position:g.location||null,raw:g,
        });
      }
    });
    (analysis.violations||[]).forEach((v,i)=>{
      const near=(data.engagements||[]).find(g=>Math.abs((g.start_second||0)-(v.second||0))<=25);
      rows.push({
        id:`doctrine-${i}-${v.second}`,
        type:"doctrine",severity:v.severity||"review",
        second:v.second,time:v.time||fmt(v.second),title:v.title,
        detail:v.evidence||v.why||"Doctrine review anchor",
        position:near?.location||null,raw:v,
      });
    });
    const seen=new Set();
    const filtered=rows.sort((a,b)=>severityRank(b.severity)-severityRank(a.severity)||a.second-b.second).filter(x=>{
      const key=`${x.type}:${x.second}:${x.title}`;if(seen.has(key))return false;seen.add(key);return true;
    });
    if(!filtered.length){
      const first=(data.engagements||[])[0];
      if(first)filtered.push({id:"first-engagement",type:"engagement",severity:"review",second:first.start_second,time:first.start,title:"First reconstructed engagement",detail:`${first.deaths||0} unit deaths in the engagement window.`,position:first.location||null,raw:first});
    }
    return filtered.slice(0,12);
  }

  function nearestCamera(second){
    const cams=replayDetail?.analysis?.observation_model?.camera_timeline||[];
    if(!cams.length)return null;
    let best=cams[0];
    for(const c of cams){if(c.second<=second)best=c;else break}
    return Number.isFinite(+best.x)&&Number.isFinite(+best.y)?{x:+best.x,y:+best.y,second:best.second}:null;
  }

  function loadReplay(detail){
    replayDetail=detail;
    moments=deriveMoments(detail);
    selectedIndex=0;
    renderFilmstrip();
    selectMoment(0,true);
  }

  function renderFilmstrip(){
    const el=$m("momentFilmstrip");if(!el)return;
    if(!moments.length){el.innerHTML='<div class="moment-empty">No high-signal critical moments were reconstructed.</div>';return}
    el.innerHTML=moments.map((m,i)=>`<button class="moment-thumb ${i===selectedIndex?"active":""}" data-index="${i}"><span>${safe(m.time)}</span><b>${safe(m.type)}</b><small>${safe(m.title)}</small><i class="${safe(m.severity)}">${safe(m.severity)}</i></button>`).join("");
    el.querySelectorAll("[data-index]").forEach(b=>b.onclick=()=>selectMoment(+b.dataset.index,true));
  }

  function selectMoment(index,autoCapture){
    selectedIndex=Math.max(0,Math.min(moments.length-1,index));
    const moment=moments[selectedIndex];if(!moment)return;
    renderFilmstrip();
    $m("momentTime").textContent=moment.time||fmt(moment.second);
    $m("momentTitle").textContent=moment.title;
    $m("momentDetail").textContent=moment.detail;
    renderDecisionChain(moment);
    renderTacticalMap(moment);
    moment.frames=null;
    setMode("map");
    if(autoCapture&&captureReady&&replayDetail?.data?.case?.id)captureSelected(false);
    else if(!replayDetail?.data?.case?.id)showLoading("Tactical reconstruction active","This replay has no persisted case file, so actual SC2 rendering is unavailable for this item.");
  }

  function renderDecisionChain(moment){
    const raw=moment.raw||{};
    const values=moment.type==="observation"?[
      ["AVAILABLE",raw.plausible_visible_second==null?"—":fmt(raw.plausible_visible_second),"Information could enter the player's state"],
      ["CAMERA",raw.camera_attention_second==null?"—":fmt(raw.camera_attention_second),raw.observation_latency_seconds==null?"not confirmed":`+${raw.observation_latency_seconds}s`],
      ["INFERENCE",raw.inference_proxy_second==null?"—":fmt(raw.inference_proxy_second),raw.inference_latency_seconds==null?"no proxy":`+${raw.inference_latency_seconds}s`],
      ["DECISION",raw.decision_second==null?"—":fmt(raw.decision_second),raw.decision_latency_seconds==null?"no command":`+${raw.decision_latency_seconds}s`],
    ]:[
      ["STATE",moment.time,"Critical state reconstructed"],
      ["ATTENTION",nearestCamera(moment.second)?fmt(nearestCamera(moment.second).second):"—","Recorded camera anchor"],
      ["DECISION",moment.type.toUpperCase(),moment.severity+" review signal"],
      ["OUTCOME",moment.raw?.resources_lost??moment.raw?.evidence??"Review",moment.detail],
    ];
    $m("decisionChain").innerHTML=values.map((x,i)=>`<div class="chain-node"><span>${i+1}</span><div><b>${safe(x[0])}</b><strong>${safe(x[1])}</strong><small>${safe(x[2])}</small></div></div>`).join("");
    $m("momentIntelCopy").textContent=moment.type==="observation"
      ?"Compare Player POV with Observer Truth. The difference isolates whether the enemy information was absent, visible but unattended, or observed without a timely response."
      :moment.type==="engagement"
        ?"Use Player POV to inspect formation and screen information, Observer Truth to expose hidden reinforcements and Tactical Map to understand approach geometry."
        :"The doctrine view anchors a strategic violation to the actual screen state, recorded camera location and resulting outcome.";
  }

  function showLoading(title,copy){
    const el=$m("momentLoading");if(!el)return;
    el.hidden=false;el.innerHTML=`<strong>${safe(title)}</strong><span>${safe(copy)}</span>`;
  }
  function hideLoading(){if($m("momentLoading"))$m("momentLoading").hidden=true}

  function setMode(next){
    if(!MODES.includes(next))return;
    mode=next;
    document.querySelectorAll(".moment-mode").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
    const moment=moments[selectedIndex];
    const frame=$m("momentFrame"),map=$m("momentMap"),mini=$m("momentMinimap");
    $m("momentModeLabel").textContent=mode==="player"?"PLAYER POV · ACTUAL SC2 RENDER":mode==="truth"?"OBSERVER TRUTH · FOG DISABLED":"TACTICAL MAP · DECISION GEOMETRY";
    if(mode==="map"){
      frame.hidden=true;map.hidden=false;mini.hidden=true;hideLoading();renderTacticalMap(moment);return;
    }
    const info=moment?.frames?.[mode];
    if(info?.url){
      map.hidden=true;frame.hidden=false;frame.src=info.url;frame.alt=mode==="player"?"Actual StarCraft II player-perspective replay frame":"Actual StarCraft II replay frame with fog disabled";
      const min=moment.frames[mode==="player"?"player_minimap":"truth_minimap"];
      if(min?.url){mini.src=min.url;mini.hidden=false}else mini.hidden=true;
      hideLoading();
    }else{
      frame.hidden=true;map.hidden=false;mini.hidden=true;renderTacticalMap(moment);
      showLoading("Actual SC2 frame not rendered yet",captureReady?"Select Render actual SC2 frames. The local game client may open briefly while the replay frame is rendered.":"Install/run StarCraft II locally or set SC2PATH. Tactical reconstruction remains available.");
    }
  }
  function cycleMode(){setMode(MODES[(MODES.indexOf(mode)+1)%MODES.length])}

  function renderTacticalMap(moment){
    const canvas=$m("momentMap");if(!canvas||!moment)return;
    const c=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
    c.clearRect(0,0,w,h);
    const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,"#061824");bg.addColorStop(1,"#01070b");c.fillStyle=bg;c.fillRect(0,0,w,h);
    c.strokeStyle="rgba(91,220,255,.09)";c.lineWidth=1;for(let x=0;x<w;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<h;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}
    const camera=nearestCamera(moment.second),p=moment.position;
    const toPx=pos=>({x:60+(Math.max(0,Math.min(256,+pos.x))/256)*(w-120),y:55+(1-Math.max(0,Math.min(256,+pos.y))/256)*(h-110)});
    const cam=camera?toPx(camera):{x:w*.28,y:h*.65};
    const target=p&&Number.isFinite(+p.x)&&Number.isFinite(+p.y)?toPx(p):{x:w*.68,y:h*.38};
    c.strokeStyle="rgba(91,220,255,.45)";c.lineWidth=3;c.setLineDash([12,8]);c.beginPath();c.moveTo(cam.x,cam.y);c.lineTo(target.x,target.y);c.stroke();c.setLineDash([]);
    c.fillStyle="#5bdcff";c.beginPath();c.arc(cam.x,cam.y,13,0,Math.PI*2);c.fill();c.strokeStyle="#a6edff";c.lineWidth=3;c.strokeRect(cam.x-70,cam.y-42,140,84);
    const sev=moment.severity==="high"?"#ff7070":moment.severity==="medium"?"#ffd166":"#b284ff";
    for(let r=24;r<=78;r+=18){c.strokeStyle=sev+Math.round((1-r/100)*255).toString(16).padStart(2,"0");c.lineWidth=4;c.beginPath();c.arc(target.x,target.y,r,0,Math.PI*2);c.stroke()}
    c.fillStyle=sev;c.beginPath();c.arc(target.x,target.y,11,0,Math.PI*2);c.fill();
    c.fillStyle="#edf8ff";c.font="900 24px system-ui";c.fillText(moment.time,28,40);c.font="800 18px system-ui";c.fillText("RECORDED CAMERA",cam.x-72,cam.y-56);c.fillStyle=sev;c.fillText(moment.type.toUpperCase(),target.x+20,target.y-15);
    c.fillStyle="rgba(2,7,11,.88)";c.fillRect(24,h-112,w-48,88);c.strokeStyle="rgba(91,220,255,.22)";c.strokeRect(24,h-112,w-48,88);
    c.fillStyle="#edf8ff";c.font="800 20px system-ui";c.fillText(String(moment.title).slice(0,90),40,h-76);c.fillStyle="#8fa8b8";c.font="15px system-ui";c.fillText(String(moment.detail).slice(0,130),40,h-46);
  }

  async function captureSelected(force){
    const moment=moments[selectedIndex],detail=replayDetail;if(!moment||!detail)return;
    const caseId=detail.data?.case?.id;
    if(!caseId){showLoading("Actual frame unavailable","This replay was not persisted as a local case. Re-analyze a real .SC2Replay file.");return}
    if(moment.frames&&!force){setMode("player");return}
    const camera=nearestCamera(moment.second)||moment.position||null;
    showLoading("Rendering actual StarCraft II frames…","SC2 Master Coach is replaying this moment through the local SC2 RGB renderer. Player POV and Observer Truth are captured at the same timestamp and camera.");
    $m("renderMomentBtn").disabled=true;
    try{
      const r=await fetch("/api/replay/capture",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        case_id:caseId,player_id:detail.player.pid,second:moment.second,camera:camera?{x:camera.x,y:camera.y}:null,moment_key:moment.id,
      })});
      const d=await r.json();if(!r.ok)throw new Error(d.detail||d.error||"Frame capture failed");
      moment.frames=d.frames||{};moment.capture=d;
      $m("captureStatus").className="intel-status ok";$m("captureStatus").textContent=`Actual SC2 engine frame rendered at ${d.frames?.player?.width||1280}×${d.frames?.player?.height||720}. Saved in ${d.workspace||"the replay case workspace"}. Click the display to compare POV, truth and map.`;
      setMode("player");
    }catch(e){
      $m("captureStatus").className="intel-status warn";$m("captureStatus").textContent=e.message||"Actual frame capture failed; tactical reconstruction remains available.";
      setMode("map");showLoading("SC2 frame capture unavailable",e.message||"Tactical reconstruction remains active.");
    }finally{$m("renderMomentBtn").disabled=false}
  }

  async function openCaseFolder(){
    const caseId=replayDetail?.data?.case?.id;if(!caseId){$m("captureStatus").className="intel-status warn";$m("captureStatus").textContent="No local replay case exists for this item.";return}
    try{const r=await fetch(`/api/cases/${caseId}/open`,{method:"POST"}),d=await r.json();if(!r.ok)throw new Error(d.error||"Could not open case folder");$m("captureStatus").className="intel-status ok";$m("captureStatus").textContent=`Opened ${d.workspace}.`}catch(e){$m("captureStatus").className="intel-status warn";$m("captureStatus").textContent=e.message||"Could not open case folder."}
  }

  window.addEventListener("sc2:replay",e=>{replayDetail=e.detail;if(theaterInitialized)loadReplay(e.detail)});
  waitForAnchor();
})();
