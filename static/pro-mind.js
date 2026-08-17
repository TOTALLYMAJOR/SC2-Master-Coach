(function(){
  "use strict";
  const DATA=window.SC2ProMindData;
  const STORIES=window.SC2ProMindStories;
  if(!DATA)return;
  const $=id=>document.getElementById(id);
  const SAFE=v=>String(v??"").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
  const SIGNAL_KEY="sc2-master-coach:quick-signals:v1";
  const SIGNAL_TIME_KEY="sc2-master-coach:signal-times:v1";
  const GATE_KEY="sc2-master-coach:pro-mind-gates:v1";
  const PATCH="5.0.16b";
  const openBranches=new Set();
  const openInvestments=new Set();
  let root=null;
  let lastStructuralSignature="";

  function load(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}}
  function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function gameSecond(){const text=$("clock")?.textContent||"0:00";const m=text.match(/(\d+):(\d+)/);return m?(+m[1]*60)+(+m[2]):0}
  function signals(){return new Set(load(SIGNAL_KEY,[]))}
  function signalTimes(){return load(SIGNAL_TIME_KEY,{})}
  function matchupKey(){
    const my=$("railRace")?.textContent||"";
    const selector=$("planOpponent");
    const selectedOpp=selector?.value;
    if(selectedOpp==="Unknown")return null;
    const opp=selectedOpp||$("opponent")?.value||"Unknown";
    const l=r=>r==="Protoss"?"P":r==="Terran"?"T":r==="Zerg"?"Z":"?";
    const computed=`${l(my)}v${l(opp)}`;
    if(DATA.get(computed))return computed;
    const raw=$("railMatchup")?.textContent||"";
    return DATA.get(raw)?raw:null;
  }
  function currentModel(){const key=matchupKey();return key?DATA.get(key):null}
  function currentQuestion(model,t){return model?.questions?.find(q=>t>=q.from&&t<q.to)||model?.questions?.at(-1)||null}
  function currentScout(model,t){if(!model?.scouts?.length)return null;return model.scouts.find(s=>t>=s.from&&t<=s.to)||model.scouts.find(s=>t<s.from)||model.scouts.at(-1)}
  function infoAge(t){const times=signalTimes(),entries=Object.values(times).filter(x=>x&&Number.isFinite(+x.gameSecond));if(!entries.length)return null;const latest=entries.sort((a,b)=>(+b.gameSecond)-(+a.gameSecond))[0];return Math.max(0,t-(+latest.gameSecond))}
  function gateState(key){const all=load(GATE_KEY,{});return all[key]||{}}
  function toggleGate(key,id){const all=load(GATE_KEY,{}),row=all[key]||{};row[id]=!row[id];all[key]=row;save(GATE_KEY,all);render(true)}
  function detailsKey(key,type,id){return `${key}:${type}:${id}`}
  function infoLabel(age){return age==null?"No timed live read":age<=45?`${age}s old · fresh`:age<=90?`${age}s old · aging`:`${age}s old · stale`}
  function updateDynamicAge(age){const el=$("proInfoAge");if(el)el.textContent=infoLabel(age)}

  function expansionEvaluation(model,key,t){
    const set=signals(),manual=gateState(key),age=infoAge(t);
    let evidence="unknown";
    if(set.has("allin")||set.has("moveout"))evidence="fail";
    else if(set.has("pressure")||set.has("hidden"))evidence="caution";
    else if(age!=null&&age<=75)evidence="pass";
    else if(set.has("greed")||set.has("turtle"))evidence="pass";
    const manualRows=(model?.expansion?.manual||[]).map((label,i)=>({id:`m${i}`,label,ok:!!manual[`m${i}`]}));
    const passCount=1+(evidence==="pass"?1:0)+manualRows.filter(x=>x.ok).length;
    const total=2+manualRows.length;
    let status="CAUTION",cls="warn";
    if(evidence==="fail"){status="HOLD";cls="bad"}
    else if(evidence==="pass"&&manualRows.every(x=>x.ok)){status="OPEN";cls="good"}
    return {status,cls,passCount,total,evidence,age,manualRows};
  }

  function favoredBranch(model,set){const priority=["allin","moveout","pressure","hidden","tech","greed","turtle"],sig=priority.find(x=>set.has(x)),id=sig?model?.signalBias?.[sig]:null;return id?model.branches.find(b=>b.id===id):null}
  function liveSignalResponse(model,set){const priority=["allin","moveout","pressure","hidden","tech","greed","turtle"],sig=priority.find(x=>set.has(x));return sig?{signal:sig,text:model?.signalResponses?.[sig]||"Re-evaluate the current branch from fresh evidence."}:null}
  function storyFor(key,branchId){return STORIES?.get?.(key,branchId)||null}

  function speakCurrent(){
    const model=currentModel(),t=gameSecond();if(!model||!("speechSynthesis" in window))return;
    const q=currentQuestion(model,t),resp=liveSignalResponse(model,signals()),fav=favoredBranch(model,signals()),story=storyFor(matchupKey(),fav?.id);
    const text=`${matchupKey()} pro mind. ${resp?.text||q?.question||model.thesis} ${fav?`${fav.title}. ${fav.buys}`:""} ${story?`${story.title}. ${story.lesson}`:""}`;
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=1.01;u.pitch=.96;speechSynthesis.speak(u);
  }

  function renderUnknown(){
    lastStructuralSignature="unknown";
    root.innerHTML=`<div class="pro-head"><div><div class="section-title">PRO MIND // Unwritten Game <span>patch ${PATCH}</span></div><p>The pro does not choose a matchup plan before the matchup exists. Keep the opening flexible, identify the opponent, then populate the decision model.</p></div><button class="hud-btn" id="proRead" disabled>Read Pro Mind</button></div><div class="pro-unknown"><strong>Opponent unknown</strong><p>Your first strategic job is information acquisition. The app will not fabricate Terran, Zerg, or Protoss assumptions before you report the race.</p><div class="pro-unknown-actions"><button class="hud-btn" data-pro-opp="Terran">Terran</button><button class="hud-btn" data-pro-opp="Zerg">Zerg</button><button class="hud-btn" data-pro-opp="Protoss">Protoss</button></div><small>Unspoken rule: preserve options until evidence closes them.</small></div>`;
    root.querySelectorAll("[data-pro-opp]").forEach(b=>b.onclick=()=>{const val=b.dataset.proOpp;if($("planOpponent")){$("planOpponent").value=val;$("planOpponent").dispatchEvent(new Event("change"))}if($("opponent")){$("opponent").value=val;$("opponent").dispatchEvent(new Event("change"))}window.dispatchEvent(new CustomEvent("sc2:opponent",{detail:{opponent:val}}));render(true)});
  }

  function bindDetailState(key){
    root.querySelectorAll("details[data-pro-branch]").forEach(d=>d.addEventListener("toggle",()=>{
      const k=detailsKey(key,"branch",d.dataset.proBranch);
      if(d.open)openBranches.add(k);else openBranches.delete(k);
    }));
    root.querySelectorAll("details[data-pro-invest]").forEach(d=>d.addEventListener("toggle",()=>{
      const k=detailsKey(key,"invest",d.dataset.proInvest);
      if(d.open)openInvestments.add(k);else openInvestments.delete(k);
    }));
  }

  function render(force=false){
    if(!root)return;
    const model=currentModel(),key=matchupKey(),t=gameSecond();
    if(!model||!key){if(lastStructuralSignature!=="unknown"||force)renderUnknown();return}
    const set=signals(),q=currentQuestion(model,t),scout=currentScout(model,t),exp=expansionEvaluation(model,key,t),fav=favoredBranch(model,set),response=liveSignalResponse(model,set),story=storyFor(key,fav?.id);
    const signature=JSON.stringify({key,q:q?.question,scout:scout?.label,signals:[...set].sort(),status:exp.status,evidence:exp.evidence,manual:exp.manualRows.map(x=>x.ok),fav:fav?.id,response:response?.text,story:story?.id});
    if(!force&&signature===lastStructuralSignature){updateDynamicAge(exp.age);return}
    lastStructuralSignature=signature;

    const branchHtml=model.branches.map(b=>{
      const detailKey=detailsKey(key,"branch",b.id),open=openBranches.has(detailKey),branchStory=storyFor(key,b.id);
      return `<details class="pro-branch ${fav?.id===b.id?"favored":""}" data-pro-branch="${SAFE(b.id)}" ${open?"open":""}><summary data-tip="Click to keep this strategic branch open while the game clock continues. A highlighted branch is the current lean, not an automatic command."><span>${fav?.id===b.id?"CURRENT LEAN":"OPEN BRANCH"}</span><b>${SAFE(b.title)}</b><i class="pro-help" aria-hidden="true">?</i></summary><div class="pro-branch-story"><b>Battle story</b><p>${SAFE(branchStory?.branchText||"Create a credible problem in one place, then spend the opponent's reaction time somewhere more valuable.")}</p></div><div class="pro-branch-grid"><div data-tip="The capability this branch adds to your position—not merely the unit or building name."><b>What you buy</b><p>${SAFE(b.buys)}</p></div><div data-tip="Evidence that makes this branch worth its cost right now."><b>Choose when</b><p>${SAFE(b.when)}</p></div><div data-tip="Every tech choice spends resources, time, production, attention, or flexibility that could have gone elsewhere."><b>Hidden cost</b><p>${SAFE(b.cost)}</p></div><div data-tip="What you must do after buying this capability so the investment actually produces value."><b>How to protect it</b><p>${SAFE(b.protect)}</p></div><div class="wide" data-tip="The game state or execution mistake that invalidates the branch and should make you reconsider it."><b>What breaks it</b><p>${SAFE(b.breaks)}</p></div></div></details>`;
    }).join("");

    const investments=model.investments.map((i,index)=>{const id=`i${index}`,open=openInvestments.has(detailsKey(key,"invest",id));return `<details class="pro-invest" data-pro-invest="${id}" ${open?"open":""}><summary data-tip="Open this to see the responsibilities created by the purchase. Expensive units and expansions are not self-protecting."><b>${SAFE(i.title)}</b><span>WHY + RESPONSIBILITY</span><i class="pro-help" aria-hidden="true">?</i></summary><p>${SAFE(i.purpose)}</p><ul>${i.responsibilities.map(x=>`<li>${SAFE(x)}</li>`).join("")}</ul><div class="pro-warning">${SAFE(i.warning)}</div></details>`}).join("");
    const manualHtml=exp.manualRows.map(x=>`<button class="pro-gate ${x.ok?"ok":""}" data-gate="${x.id}" data-tip="Master Coach cannot verify this live without game integration. Click when you have personally confirmed it in-game."><span>${x.ok?"✓":"?"}</span><b>${SAFE(x.label)}</b></button>`).join("");
    const storyHtml=story?`<div class="pro-story"><div class="pro-story-head"><span>BATTLE STORY // HOW THE PLAN CREATES TIME</span><b>${SAFE(story.title)}</b></div><p>${SAFE(story.scene)}</p><ol>${story.beats.map(x=>`<li>${SAFE(x)}</li>`).join("")}</ol><strong>${SAFE(story.lesson)}</strong></div>`:"";

    root.innerHTML=`<div class="pro-head"><div><div class="section-title">PRO MIND // Unwritten Game <span>${SAFE(key)} · patch ${PATCH}</span></div><p>${SAFE(model.thesis)}</p></div><button class="hud-btn" id="proRead" data-tip="Reads the current professional question, evidence response, favored capability, and battle-story lesson aloud.">Read Pro Mind</button></div>${response?`<div class="pro-override"><b>Evidence changed the thought process</b><strong>${SAFE(response.text)}</strong></div>`:""}<div class="pro-now"><div class="pro-question" data-tip="A pro-style question is more durable than a memorized command because its answer determines the next branch."><span>WHAT WOULD A PRO ASK RIGHT NOW?</span><strong>${SAFE(q?.question||"What information changes the next commitment?")}</strong><p>${SAFE(q?.why||"")}</p><small>UNSPOKEN RULE · ${SAFE(q?.rule||"Evidence outranks the script.")}</small></div><div class="pro-scout" data-tip="This is not 'scout because the clock says so.' It states what information the scout must resolve before the next commitment."><span>${scout&&t>=scout.from&&t<=scout.to?"SCOUT NOW":"NEXT INFORMATION WINDOW"}</span><strong>${SAFE(scout?.label||"Refresh information")}</strong><p><b>${SAFE(scout?.question||"What changed since the last read?")}</b><br>${SAFE(scout?.purpose||"Renew information before commitment.")}</p><small>${SAFE(scout?.changes||"The next decision should use fresh evidence.")}</small></div></div><div class="pro-section-title"><b>OPEN STRATEGIC BRANCHES <span class="pro-help" data-tip="These are capabilities still available from the current state. Opening one does not select or lock it; it explains the trade.">?</span></b><span>Do not choose a tech name; choose the capability you are missing.</span></div><div class="pro-branches">${branchHtml}</div>${storyHtml}<div class="pro-expansion" data-tip="Expansion Permission is a decision gate, not a guarantee. OPEN means the reported evidence plus your manual protection checks support the investment."><div class="pro-expansion-head"><div><span>EXPANSION PERMISSION</span><b>${SAFE(model.expansion.name)}</b><p>${SAFE(model.expansion.thesis)}</p></div><div class="pro-permission ${exp.cls}"><strong>${exp.status}</strong><span>${exp.passCount}/${exp.total} gates</span></div></div><div class="pro-gates"><div class="pro-gate read ${exp.evidence}" data-tip="A production or threat read loses value as the opponent has time to spend new resources and change the game state."><span>${exp.evidence==="pass"?"✓":exp.evidence==="fail"?"×":"?"}</span><b>Fresh threat / production read</b><small id="proInfoAge">${SAFE(infoLabel(exp.age))}</small></div>${manualHtml}</div><div class="pro-expansion-note">The app can verify only reported evidence. Position, reinforcement access, and vision are manual confirmations because Master Coach has no live SC2 integration.</div></div><div class="pro-section-title"><b>YOU BOUGHT THIS — NOW PROTECT THE INVESTMENT <span class="pro-help" data-tip="A professional decision includes the obligations created after the purchase. The unit, tech, or base only becomes valuable if those obligations are met.">?</span></b><span>Major purchases create new responsibilities.</span></div><div class="pro-investments">${investments}</div>`;
    $("proRead").onclick=speakCurrent;
    root.querySelectorAll("[data-gate]").forEach(b=>b.onclick=()=>toggleGate(key,b.dataset.gate));
    bindDetailState(key);
  }

  function mount(){
    if($("proMindPanel"))return;
    const anchor=$("planLibraryPanel")||$("buildPriorityZone")||document.querySelector(".command-center");if(!anchor)return;
    root=document.createElement("section");root.id="proMindPanel";root.className="frame panel-pad pro-mind";anchor.after(root);render(true);
    const clock=$("clock");if(clock)new MutationObserver(()=>render(false)).observe(clock,{childList:true,subtree:true,characterData:true});
    const structuralNodes=[$("railMatchup"),$("railRace"),$("planOpponent"),$("opponent")].filter(Boolean);const obs=new MutationObserver(()=>render(true));structuralNodes.forEach(n=>obs.observe(n,{childList:true,subtree:true,characterData:true,attributes:true}));
    ["change","input"].forEach(evt=>document.addEventListener(evt,e=>{if(["planOpponent","opponent"].includes(e.target?.id))render(true)}));
    ["sc2:signal","sc2:opponent","sc2:plan-loaded","sc2:replay"].forEach(evt=>window.addEventListener(evt,()=>render(true)));
    const evidence=document.querySelector("#evidenceList");if(evidence)new MutationObserver(()=>render(true)).observe(evidence,{subtree:true,attributes:true,attributeFilter:["class"]});
  }
  function start(){mount();if(!root){let tries=0;const timer=setInterval(()=>{mount();if(root||++tries>40)clearInterval(timer)},250)}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
