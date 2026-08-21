(function(){
  "use strict";

  const E=window.SC2StrategyEngine;
  const D=window.SC2StrategyCompilerData;
  if(!E||!D)return;

  const STATUS_ID="v111ScienceStatus";
  const OVERLAY_ID="v111ScienceOverlay";
  const STYLE_ID="v111ScienceInlineStyle";
  let health=null;
  let healthError=null;
  let healthPromise=null;
  let audioStatus=null;
  let lastRun=null;
  let busy=false;

  function safe(value){return String(value??"").replace(/[<>&\"]/g,ch=>({"<":"&lt;",">":"&gt;","&":"&amp;",'\"':"&quot;"}[ch]))}
  function setTextIfChanged(node,text){if(node.textContent!==text)node.textContent=text}

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .v111-science-chip{min-height:38px!important;padding:8px 10px!important;border-color:#2f6d82!important;font-size:13px!important;letter-spacing:.05em;text-transform:uppercase}
      .v111-science-chip.ready{color:#75e7ae!important;border-color:#3f9b70!important}.v111-science-chip.error{color:#ff7a7a!important;border-color:#a84a4a!important}.v111-science-chip.busy{color:#ffd36a!important;border-color:#9b7a37!important}
      .v111-science-overlay{position:fixed;inset:0;z-index:6500;display:grid;place-items:center;padding:22px;background:rgba(0,0,0,.78);backdrop-filter:blur(7px)}
      .v111-science-card{width:min(980px,96vw);max-height:88vh;overflow:auto;border:1px solid #66e7ff;background:#06131d;color:#eefaff;border-radius:7px;box-shadow:0 30px 110px #000;padding:24px}
      .v111-science-card h2{font-size:30px;margin:0 0 8px}.v111-science-card h3{font-size:15px;text-transform:uppercase;letter-spacing:.1em;color:#66e7ff;margin:0 0 7px}.v111-science-card p,.v111-science-card li{font-size:17px;line-height:1.55}.v111-science-card .muted{color:#9cb4c2}
      .v111-science-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.v111-science-badge{display:inline-block;border:1px solid #3f9b70;color:#75e7ae;padding:5px 8px;border-radius:3px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.07em}
      .v111-science-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.v111-science-panel{border:1px solid #23495f;background:#071722;padding:17px;border-radius:5px}.v111-science-panel strong{display:block;font-size:20px;line-height:1.35}.v111-science-panel .status{font-size:25px;font-weight:950;margin:7px 0}.v111-science-panel .status.open,.v111-science-panel .status.continue{color:#6de4a4}.v111-science-panel .status.caution,.v111-science-panel .status.modify{color:#ffd166}.v111-science-panel .status.hold,.v111-science-panel .status.abort{color:#ff7373}
      .v111-science-proof{margin-top:14px;border-top:1px solid #23495f;padding-top:14px}.v111-science-proof ul{padding-left:22px}.v111-science-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.v111-science-actions button{min-height:44px;padding:10px 15px;border:1px solid #3a7896;background:#071722;color:#eefaff;border-radius:4px;font-weight:850;font-size:16px}.v111-science-actions button:hover{border-color:#66e7ff}
      @media(max-width:760px){.v111-science-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function getHealth(force=false){
    if(health&&!force)return health;
    if(healthPromise&&!force)return healthPromise;
    healthPromise=fetch("/api/science/health",{cache:"no-store"})
      .then(async response=>{
        const body=await response.json().catch(()=>({}));
        if(!response.ok||!body.ok)throw new Error(body?.error?.message||`HTTP ${response.status}`);
        health=body;healthError=null;return body;
      })
      .catch(error=>{health=null;healthError=error?.message||String(error);throw error})
      .finally(()=>{healthPromise=null;ensureStatusChip()});
    return healthPromise;
  }

  async function getAudioStatus(){
    try{
      const response=await fetch("/api/science/audio/status",{cache:"no-store"});
      audioStatus=await response.json().catch(()=>({ok:false,message:"Audio diagnostics returned invalid JSON."}));
    }catch(error){audioStatus={ok:false,message:error?.message||String(error),devices:[]}}
    return audioStatus;
  }

  function scienceState(){
    if(busy)return {label:"Python Shadow · Working",cls:"busy"};
    if(health?.ok&&health.enabled)return {label:`Python ${health.mode||"shadow"} · Ready`,cls:"ready"};
    if(healthError)return {label:"Python Shadow · Unavailable",cls:"error"};
    return {label:"Python Shadow · Checking",cls:"busy"};
  }

  function ensureStatusChip(){
    ensureStyle();
    const host=document.querySelector("#v110HudShell .v110-top-actions");
    if(!host)return;
    let button=document.getElementById(STATUS_ID);
    if(!button){
      button=document.createElement("button");
      button.id=STATUS_ID;
      button.type="button";
      button.className="v110-btn v111-science-chip";
      button.addEventListener("click",()=>openDiagnostics());
      button.title="Python Intelligence runs in Shadow Mode on v1.11.1. It may calculate a second opinion but cannot mutate the live Strategic OS plan.";
      host.prepend(button);
    }
    const row=scienceState();setTextIfChanged(button,row.label);button.className=`v110-btn v111-science-chip ${row.cls}`;
  }

  function supportedSnapshot(state){
    const req=state?.request||{};
    return req.selfRace==="Protoss"&&req.opponentRace==="Terran"&&req.goal==="three_base_expand"&&state?.compilation?.selectedPlan;
  }

  function requestFromState(state){
    const req=state.request||{};
    const plan=state.compilation?.selectedPlan||{};
    return {
      request_id:`hud-${Date.now().toString(36)}`,
      capability_id:"digital_twin",
      patch:D.PATCH,
      ruleset_version:health?.ruleset_version||"sc2-5.0.16b-pvt-three-base-foundation-1",
      model_version:"0.1.0",
      session_id:state.sessionId,
      event_sequence:Number(state.eventSequence||0),
      mission:{selfRace:req.selfRace,opponentRace:req.opponentRace,goal:req.goal,risk:req.risk,skillLevel:req.skillLevel},
      policy:{id:plan.id,title:plan.title,buildWindows:(plan.buildWindows||[]).map(row=>({start:row.start,end:row.end,action:row.action,purpose:row.purpose}))},
      intel:E.activeEvidence(Number(state.clock?.gameSecond||0)).map(row=>({
        evidence_id:row.evidenceId,
        type:row.type,
        label:row.label,
        observed_game_second:row.observedGameSecond,
        strategic_confidence:row.strategicConfidence
      })),
      permissions:[],obligations:[],decision:E.currentOutput()||{},
      parameters:{game_second:Number(state.clock?.gameSecond||0)}
    };
  }

  async function runShadow(){
    const state=E.getState();
    await getHealth();
    if(!supportedSnapshot(state)){
      return {unsupported:true,message:"The first Python Digital Twin currently supports Protoss vs Terran → three-base economy. The deterministic Combat HUD remains authoritative for this operation."};
    }
    const payload=requestFromState(state);
    const response=await fetch("/api/science/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const body=await response.json().catch(()=>({}));
    if(!response.ok||!body.ok)throw new Error(body?.error?.message||`Python advisory failed (HTTP ${response.status}).`);
    lastRun=body;return body;
  }

  function deterministicPanel(output){
    if(!output)return `<section class="v111-science-panel"><h3>Strategic OS</h3><p class="muted">No deterministic output is available yet.</p></section>`;
    const status=String(output.planStatus||"continue").toLowerCase();
    return `<section class="v111-science-panel"><h3>Strategic OS · Authoritative</h3><div class="status ${safe(status)}">${safe(status.toUpperCase())}</div><strong>${safe(output.primaryAction||"")}</strong><p>${safe(output.reason||"")}</p><p class="muted"><b>Question:</b> ${safe(output.primaryQuestion||"No question")}</p></section>`;
  }

  function sciencePanel(body){
    if(body?.unsupported)return `<section class="v111-science-panel"><h3>Python Shadow · Bounded scope</h3><div class="status caution">NOT RUN</div><p>${safe(body.message)}</p></section>`;
    const advisory=body?.advisory||{};const meta=advisory.metadata||{};const status=String(meta.recommended_plan_state||"continue").toLowerCase();const permission=String(meta.primary_permission||"CAUTION").toUpperCase();
    return `<section class="v111-science-panel"><h3>Python Digital Twin · Shadow only</h3><div class="status ${safe(status)}">${safe(status.toUpperCase())} · ${safe(permission)}</div><strong>${safe(advisory.action||"")}</strong><p>${safe(advisory.reason||"")}</p><p class="muted"><b>Question:</b> ${safe(advisory.question||"No question")}</p><p class="muted"><b>Confidence:</b> ${safe(advisory.confidence?.band||"unknown")} ${Number.isFinite(advisory.confidence?.score)?`(${Math.round(advisory.confidence.score*100)}%)`:""}</p></section>`;
  }

  function proofHtml(body){
    const advisory=body?.advisory;if(!advisory)return "";
    const items=advisory.proof?.items||[];const unknowns=advisory.proof?.uncertainties||[];const refs=items.map(row=>`<li>${safe(row.claim)}${row.limitation?` <span class="muted">— ${safe(row.limitation)}</span>`:""}</li>`).join("");const uncertainty=unknowns.map(x=>`<li>${safe(x)}</li>`).join("");
    return `<section class="v111-science-proof"><h3>Proof & uncertainty</h3>${refs?`<ul>${refs}</ul>`:""}${uncertainty?`<p class="muted"><b>Still unknown:</b></p><ul class="muted">${uncertainty}</ul>`:""}<p class="muted">Shadow Mode guarantee: canonical state mutated = <b>${body.runtime?.canonical_state_mutated===false?"false":"unknown"}</b>. Python output is advisory and cannot replace deterministic HUD state.</p></section>`;
  }

  function openOverlay(title,content){
    ensureStyle();let overlay=document.getElementById(OVERLAY_ID);if(overlay)overlay.remove();overlay=document.createElement("div");overlay.id=OVERLAY_ID;overlay.className="v111-science-overlay";overlay.innerHTML=`<section class="v111-science-card"><div class="v111-science-head"><div><span class="v111-science-badge">Experimental · v1.11.1</span><h2>${safe(title)}</h2></div></div>${content}<div class="v111-science-actions"><button id="v111ScienceClose">Close</button></div></section>`;document.body.appendChild(overlay);overlay.addEventListener("click",event=>{if(event.target===overlay)overlay.remove()});document.getElementById("v111ScienceClose")?.addEventListener("click",()=>overlay.remove());
  }

  function audioHtml(){
    const row=audioStatus||{};const devices=row.devices||[];const names=devices.slice(0,4).map(device=>`<li>${safe(device.name||`Input ${device.device_id}`)} · ${Number(device.channels||0)} ch</li>`).join("");
    return `<section class="v111-science-panel"><h3>Native microphone</h3><div class="status ${row.ok?'continue':'caution'}">${row.ok?'DEVICE FOUND':'CHECK INPUT'}</div><p>Backend: <b>${safe(row.backend||"unavailable")}</b></p><p>Windows-visible inputs: <b>${Number(row.device_count||0)}</b></p>${names?`<ul>${names}</ul>`:""}<p class="muted">${safe(row.message||"Native microphone diagnostics have not run.")}</p><p class="muted">This verifies Windows device visibility only. Offline tactical speech recognition is the next layer.</p></section>`;
  }

  async function openDiagnostics(){
    await Promise.allSettled([getHealth(true),getAudioStatus()]);
    const state=scienceState();const db=health?.database||{};const caps=health?.capabilities||{};
    openOverlay("Python Intelligence Diagnostics",`<div class="v111-science-grid"><section class="v111-science-panel"><h3>Runtime</h3><div class="status ${state.cls==='ready'?'continue':'caution'}">${safe(state.label)}</div><p>Mode: <b>${safe(health?.mode||"unavailable")}</b></p><p>Strategic authority: <b>${safe(health?.state_authority||"strategic_os")}</b></p><p>May influence live HUD: <b>${health?.may_influence_live_surface?"yes":"no"}</b></p></section><section class="v111-science-panel"><h3>Rules & storage</h3><p>Patch: <b>${safe(health?.patch||D.PATCH)}</b></p><p>Ruleset: <b>${safe(health?.ruleset_version||"unavailable")}</b></p><p>SQLite: <b>${db.ok?"healthy":"unavailable"}</b></p><p>Digital Twin: <b>${safe(caps.digital_twin||"unknown")}</b></p></section>${audioHtml()}</div>${healthError?`<section class="v111-science-proof"><p class="muted">Runtime error: ${safe(healthError)}</p></section>`:""}`);
  }

  async function comparePlan(){
    if(busy)return;busy=true;ensureStatusChip();
    const deterministic=E.currentOutput()||E.evaluate();
    try{
      const body=await runShadow();
      openOverlay("Can I still do my plan?",`<p class="muted">This comparison intentionally shows two systems. The Strategic OS remains authoritative; Python is a Shadow Mode second opinion.</p><div class="v111-science-grid">${deterministicPanel(deterministic)}${sciencePanel(body)}</div>${proofHtml(body)}`);
    }catch(error){
      openOverlay("Can I still do my plan?",`<p class="muted">Python Intelligence is unavailable, so the deterministic Strategic OS remains fully operational.</p><div class="v111-science-grid">${deterministicPanel(deterministic)}<section class="v111-science-panel"><h3>Python Shadow</h3><div class="status hold">UNAVAILABLE</div><p>${safe(error?.message||error)}</p></section></div>`);
    }finally{busy=false;ensureStatusChip()}
  }

  function intercept(event){
    const target=event.target?.closest?.("#v110Check");if(!target)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();comparePlan();
  }

  function boot(){
    ensureStyle();
    document.addEventListener("click",intercept,true);
    const observer=new MutationObserver(()=>ensureStatusChip());
    const hud=document.getElementById("v110HudShell");if(hud)observer.observe(hud,{subtree:true,childList:true});
    window.addEventListener("sc2:strategy-state",()=>ensureStatusChip());
    getHealth().catch(()=>{});ensureStatusChip();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();

  window.SC2PythonShadow={getHealth,getAudioStatus,runShadow,comparePlan,openDiagnostics,get lastRun(){return lastRun}};
})();
