(function(){
  "use strict";

  const E=window.SC2StrategyEngine;
  if(!E)return;

  const BUTTON_ID="v111NativeMic";
  const OVERLAY_ID="v111VoiceOverlay";
  let status=null;
  let listening=false;

  const safe=value=>String(value??"").replace(/[<>&\"]/g,ch=>({"<":"&lt;",">":"&gt;","&":"&amp;",'\"':"&quot;"}[ch]));
  const setTextIfChanged=(node,text)=>{if(node.textContent!==text)node.textContent=text};

  async function getStatus(force=false){
    if(status&&!force)return status;
    try{
      const response=await fetch("/api/science/voice/status",{cache:"no-store"});
      status=await response.json().catch(()=>({ok:false,message:"Voice status returned invalid JSON."}));
    }catch(error){status={ok:false,message:error?.message||String(error)}}
    ensureButton();return status;
  }

  function ensureButton(){
    const host=document.querySelector("#v110HudShell .v110-hud-controls");
    if(!host)return;
    let button=document.getElementById(BUTTON_ID);
    if(!button){
      button=document.createElement("button");button.id=BUTTON_ID;button.type="button";button.className="v110-btn";button.addEventListener("click",listen);
      host.appendChild(button);
    }
    const nextDisabled=listening;
    const nextText=listening?"Native Mic · Listening…":status?.ok?"Native Mic · Ready":"Native Mic · Setup";
    const nextTitle=status?.ok?"Listen for one short offline tactical phrase. Raw audio is not retained.":"Open offline voice diagnostics.";
    if(button.disabled!==nextDisabled)button.disabled=nextDisabled;
    if(button.textContent!==nextText)button.textContent=nextText;
    if(button.title!==nextTitle)button.title=nextTitle;
  }

  function closeOverlay(){document.getElementById(OVERLAY_ID)?.remove()}
  function overlay(title,body,actions=""){
    closeOverlay();const node=document.createElement("div");node.id=OVERLAY_ID;node.className="v111-science-overlay";node.innerHTML=`<section class="v111-science-card"><div class="v111-science-head"><div><span class="v111-science-badge">Offline tactical voice</span><h2>${safe(title)}</h2></div></div>${body}<div class="v111-science-actions">${actions}<button id="v111VoiceClose">Close</button></div></section>`;document.body.appendChild(node);node.addEventListener("click",event=>{if(event.target===node)closeOverlay()});document.getElementById("v111VoiceClose")?.addEventListener("click",closeOverlay);return node;
  }

  function statusBody(row){
    const audio=row?.audio||{};const devices=audio.devices||[];
    return `<div class="v111-science-grid"><section class="v111-science-panel"><h3>Recognizer</h3><div class="status ${row?.ok?'continue':'caution'}">${row?.ok?'READY':'NOT READY'}</div><p>Backend: <b>${safe(row?.backend||"vosk")}</b></p><p>Offline: <b>${row?.offline?"yes":"no"}</b></p><p>Model: <b>${safe(row?.model_name||"missing")}</b></p><p>Model packaged: <b>${row?.model_ready?"yes":"no"}</b></p><p class="muted">${safe(row?.message||"")}</p></section><section class="v111-science-panel"><h3>Input</h3><p>sounddevice: <b>${row?.sounddevice_ready?"ready":"missing"}</b></p><p>Input devices: <b>${devices.length}</b></p>${devices.slice(0,4).map(d=>`<p class="muted">${safe(d.name)} · ${Number(d.channels||0)} ch</p>`).join("")}<p class="muted">Raw audio retained: <b>${row?.raw_audio_retained?"yes":"no"}</b></p></section></div>`;
  }

  async function listen(){
    const ready=await getStatus(true);
    if(!ready?.ok){overlay("Offline voice setup",statusBody(ready));return}
    if(listening)return;
    listening=true;ensureButton();
    try{
      const response=await fetch("/api/science/voice/listen",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({timeout_seconds:4})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body?.error?.message||`Voice request failed (HTTP ${response.status}).`);
      if(!body?.transcript){overlay("No tactical phrase heard",`<p class="muted">No supported phrase was recognized. Try a short command such as <b>Reaper</b>, <b>no natural</b>, <b>three Barracks</b>, or <b>move out</b>.</p>`);return}
      applyTranscript(body.transcript,Number(body.confidence||0));
    }catch(error){overlay("Offline voice unavailable",`<p>${safe(error?.message||error)}</p><p class="muted">Quick Intel remains fully functional.</p>`)}
    finally{listening=false;ensureButton()}
  }

  function applyTranscript(transcript,confidence){
    const parsed=E.parseVoice(transcript,confidence);
    if(parsed.unsupported){overlay("Phrase not mapped",`<p>Heard: <b>${safe(transcript)}</b></p><p class="muted">The local recognizer heard speech, but the Strategy Engine did not map it to a supported tactical intent.</p>`);return}
    if(parsed.confirmationRequired){
      const node=overlay("Confirm tactical report",`<p>Heard: <b>${safe(transcript)}</b></p><p class="muted">Recognition confidence ${Math.round(confidence*100)}%. High-impact reports require confirmation before evidence changes.</p>`,`<button id="v111VoiceConfirm">Apply report</button>`);
      node.querySelector("#v111VoiceConfirm")?.addEventListener("click",()=>{closeOverlay();applyParsed(parsed,true)});return;
    }
    applyParsed(parsed,false);
  }

  function permissionFor(status){
    if(status==="abort"||status==="hold")return {status:"HOLD",reason:"Immediate threat or invalidated assumptions outrank the scheduled investment."};
    if(status==="modify")return {status:"CAUTION",reason:"The mission remains valid, but the fast implementation needs a fresh read or more immediate power."};
    return {status:"OPEN",reason:"Current player-reported evidence does not invalidate the operation; renew information before the next irreversible spend."};
  }

  function refreshHud(evidenceType){
    const output=E.currentOutput()||E.evaluate();if(!output)return;
    const set=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value||""};
    set("v110Question",output.primaryQuestion);
    set("v110Action",output.primaryAction);
    set("v110Reason",output.reason);
    const permission=permissionFor(output.planStatus||"continue");
    set("v110Permission",permission.status);set("v110PermissionWhy",permission.reason);
    const permissionNode=document.getElementById("v110Permission");if(permissionNode)permissionNode.className=`v110-permission ${permission.status==="OPEN"?"open":permission.status==="HOLD"?"hold":""}`;
    const planState=document.querySelector("#v110HudShell .v110-plan-state");if(planState){const statusText=String(output.planStatus||"continue").toLowerCase();planState.className=`v110-plan-state ${statusText}`;planState.innerHTML=`<i></i>${safe(statusText.toUpperCase())}`}
    const next=document.getElementById("v110Next");if(next)next.innerHTML=(output.nextWindows||[]).slice(0,3).map(row=>`<div><time>${formatSeconds(row.earliestSecond)}–${formatSeconds(row.latestSecond)}</time><b>${safe(row.label)}</b></div>`).join("")||"<div><b>No upcoming window compiled.</b></div>";
    document.querySelectorAll("#v110HudShell [data-signal]").forEach(button=>button.classList.toggle("active",button.dataset.signal===evidenceType));
  }

  function formatSeconds(value){const seconds=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`}

  function applyParsed(parsed,confirmed){
    for(const intent of parsed.intents||[]){
      if(intent.intent==="report_evidence"){
        E.reportEvidence(intent.evidenceType,intent.payload||{},"player_voice",parsed.recognitionConfidence||1);
        refreshHud(intent.evidenceType);
      }else if(intent.intent==="ask_status"||intent.intent==="ask_why"||intent.intent==="ask_next"){
        window.SC2PythonShadow?.comparePlan?.();
      }else if(intent.intent==="pause"){
        document.getElementById("v110Pause")?.click();
      }else if(intent.intent==="resume"){
        const pause=document.getElementById("v110Pause");if(pause&&/resume/i.test(pause.textContent||""))pause.click();
      }
    }
    if(confirmed){
      // Confirmation applies only the player's explicit report. It never
      // accepts a Python advisory into canonical Strategic OS state.
    }
  }

  function syncEvidenceHighlight(){
    const active=E.activeEvidence?.()||[];if(!active.length)return;
    const latest=active.slice().sort((a,b)=>(b.observedGameSecond||0)-(a.observedGameSecond||0))[0];
    if(!latest?.type)return;
    document.querySelectorAll("#v110HudShell [data-signal]").forEach(button=>button.classList.toggle("active",button.dataset.signal===latest.type));
  }

  function boot(){
    const observer=new MutationObserver(()=>{ensureButton();syncEvidenceHighlight()});
    const hud=document.getElementById("v110HudShell");if(hud)observer.observe(hud,{subtree:true,childList:true});
    window.addEventListener("sc2:strategy-state",()=>syncEvidenceHighlight());
    getStatus().catch(()=>{});ensureButton();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  window.SC2NativeVoice={getStatus,listen,applyTranscript,refreshHud};
})();
