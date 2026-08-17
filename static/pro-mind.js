(function(){
  "use strict";
  const DATA=window.SC2ProMindData;
  if(!DATA)return;
  const $=id=>document.getElementById(id);
  const SAFE=v=>String(v??"").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
  const SIGNAL_KEY="sc2-master-coach:quick-signals:v1";
  const SIGNAL_TIME_KEY="sc2-master-coach:signal-times:v1";
  const GATE_KEY="sc2-master-coach:pro-mind-gates:v1";
  const PATCH="5.0.16b";
  let root=null;

  function load(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}}
  function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function gameSecond(){const text=$("clock")?.textContent||"0:00";const m=text.match(/(\d+):(\d+)/);return m?(+m[1]*60)+(+m[2]):0}
  function signals(){return new Set(load(SIGNAL_KEY,[]))}
  function signalTimes(){return load(SIGNAL_TIME_KEY,{})}
  function matchupKey(){
    const raw=$("railMatchup")?.textContent||"";
    if(DATA.get(raw))return raw;
    const my=$("railRace")?.textContent||"";
    const opp=$("planOpponent")?.value||$("opponent")?.value||"Unknown";
    const l=r=>r==="Protoss"?"P":r==="Terran"?"T":r==="Zerg"?"Z":"?";
    const key=`${l(my)}v${l(opp)}`;
    return DATA.get(key)?key:null;
  }
  function currentModel(){const key=matchupKey();return key?DATA.get(key):null}
  function currentQuestion(model,t){return model?.questions?.find(q=>t>=q.from&&t<q.to)||model?.questions?.at(-1)||null}
  function currentScout(model,t){
    if(!model?.scouts?.length)return null;
    return model.scouts.find(s=>t>=s.from&&t<=s.to)||model.scouts.find(s=>t<s.from)||model.scouts.at(-1);
  }
  function infoAge(t){
    const times=signalTimes(),entries=Object.values(times).filter(x=>x&&Number.isFinite(+x.gameSecond));
    if(!entries.length)return null;
    const latest=entries.sort((a,b)=>(+b.gameSecond)-(+a.gameSecond))[0];
    return Math.max(0,t-(+latest.gameSecond));
  }
  function gateState(key){const all=load(GATE_KEY,{});return all[key]||{}}
  function toggleGate(key,id){const all=load(GATE_KEY,{}),row=all[key]||{};row[id]=!row[id];all[key]=row;save(GATE_KEY,all);render()}

  function expansionEvaluation(model,key,t){
    const set=signals(),manual=gateState(key),age=infoAge(t);
    const opponentKnown=!!model;
    let evidence="unknown";
    if(set.has("allin")||set.has("moveout"))evidence="fail";
    else if(set.has("pressure")||set.has("hidden"))evidence="caution";
    else if(age!=null&&age<=75)evidence="pass";
    else if(set.has("greed")||set.has("turtle"))evidence="pass";
    const manualRows=(model?.expansion?.manual||[]).map((label,i)=>({id:`m${i}`,label,ok:!!manual[`m${i}`]}));
    const passCount=(opponentKnown?1:0)+(evidence==="pass"?1:0)+manualRows.filter(x=>x.ok).length;
    const total=2+manualRows.length;
    let status="CAUTION",cls="warn";
    if(!opponentKnown||evidence==="fail"){status="HOLD";cls="bad"}
    else if(evidence==="pass"&&manualRows.every(x=>x.ok)){status="OPEN";cls="good"}
    return {status,cls,passCount,total,evidence,age,manualRows};
  }

  function favoredBranch(model,set){
    const priority=["allin","moveout","pressure","hidden","tech","greed","turtle"];
    const sig=priority.find(x=>set.has(x));
    const id=sig?model?.signalBias?.[sig]:null;
    return id?model.branches.find(b=>b.id===id):null;
  }

  function liveSignalResponse(model,set){
    const priority=["allin","moveout","pressure","hidden","tech","greed","turtle"];
    const sig=priority.find(x=>set.has(x));
    return sig?{signal:sig,text:model?.signalResponses?.[sig]||"Re-evaluate the current branch from fresh evidence."}:null;
  }

  function speakCurrent(){
    const model=currentModel(),t=gameSecond();if(!model||!("speechSynthesis" in window))return;
    const q=currentQuestion(model,t),resp=liveSignalResponse(model,signals()),fav=favoredBranch(model,signals());
    const text=`${matchupKey()} pro mind. ${resp?.text||q?.question||model.thesis} ${fav?`${fav.title}. ${fav.buys}`:""}`;
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=1.01;u.pitch=.96;speechSynthesis.speak(u);
  }

  function renderUnknown(){
    root.innerHTML=`<div class="pro-head"><div><div class="section-title">PRO MIND // Unwritten Game <span>patch ${PATCH}</span></div><p>The pro does not choose a matchup plan before the matchup exists. Keep the opening flexible, identify the opponent, then populate the decision model.</p></div><button class="hud-btn" id="proRead" disabled>Read Pro Mind</button></div><div class="pro-unknown"><strong>Opponent unknown</strong><p>Your first strategic job is information acquisition. The app will not fabricate Terran, Zerg, or Protoss assumptions before you report the race.</p><div class="pro-unknown-actions"><button class="hud-btn" data-pro-opp="Terran">Terran</button><button class="hud-btn" data-pro-opp="Zerg">Zerg</button><button class="hud-btn" data-pro-opp="Protoss">Protoss</button></div><small>Unspoken rule: preserve options until evidence closes them.</small></div>`;
    root.querySelectorAll("[data-pro-opp]").forEach(b=>b.onclick=()=>{
      const val=b.dataset.proOpp;
      if($("planOpponent")){$("planOpponent").value=val;$("planOpponent").dispatchEvent(new Event("change"))}
      if($("opponent")){$("opponent").value=val;$("opponent").dispatchEvent(new Event("change"))}
      window.dispatchEvent(new CustomEvent("sc2:opponent",{detail:{opponent:val}}));render();
    });
  }

  function render(){
    if(!root)return;
    const model=currentModel(),key=matchupKey(),t=gameSecond();
    if(!model||!key){renderUnknown();return}
    const set=signals(),q=currentQuestion(model,t),scout=currentScout(model,t),exp=expansionEvaluation(model,key,t),fav=favoredBranch(model,set),response=liveSignalResponse(model,set);
    const branchHtml=model.branches.map(b=>`<details class="pro-branch ${fav?.id===b.id?"favored":""}" ${fav?.id===b.id?"open":""}><summary><span>${fav?.id===b.id?"CURRENT LEAN":"OPEN BRANCH"}</span><b>${SAFE(b.title)}</b></summary><div class="pro-branch-grid"><div><b>What you buy</b><p>${SAFE(b.buys)}</p></div><div><b>Choose when</b><p>${SAFE(b.when)}</p></div><div><b>Hidden cost</b><p>${SAFE(b.cost)}</p></div><div><b>How to protect it</b><p>${SAFE(b.protect)}</p></div><div class="wide"><b>What breaks it</b><p>${SAFE(b.breaks)}</p></div></div></details>`).join("");
    const investments=model.investments.map(i=>`<details class="pro-invest"><summary><b>${SAFE(i.title)}</b><span>WHY + RESPONSIBILITY</span></summary><p>${SAFE(i.purpose)}</p><ul>${i.responsibilities.map(x=>`<li>${SAFE(x)}</li>`).join("")}</ul><div class="pro-warning">${SAFE(i.warning)}</div></details>`).join("");
    const manualHtml=exp.manualRows.map(x=>`<button class="pro-gate ${x.ok?"ok":""}" data-gate="${x.id}"><span>${x.ok?"✓":"?"}</span><b>${SAFE(x.label)}</b></button>`).join("");
    const infoLabel=exp.age==null?"No timed live read":exp.age<=45?`${exp.age}s old · fresh`:exp.age<=90?`${exp.age}s old · aging`:`${exp.age}s old · stale`;
    root.innerHTML=`
      <div class="pro-head"><div><div class="section-title">PRO MIND // Unwritten Game <span>${SAFE(key)} · patch ${PATCH}</span></div><p>${SAFE(model.thesis)}</p></div><button class="hud-btn" id="proRead">Read Pro Mind</button></div>
      ${response?`<div class="pro-override"><b>Evidence changed the thought process</b><strong>${SAFE(response.text)}</strong></div>`:""}
      <div class="pro-now">
        <div class="pro-question"><span>WHAT WOULD A PRO ASK RIGHT NOW?</span><strong>${SAFE(q?.question||"What information changes the next commitment?")}</strong><p>${SAFE(q?.why||"")}</p><small>UNSPOKEN RULE · ${SAFE(q?.rule||"Evidence outranks the script.")}</small></div>
        <div class="pro-scout"><span>${t>=scout.from&&t<=scout.to?"SCOUT NOW":"NEXT INFORMATION WINDOW"}</span><strong>${SAFE(scout.label)}</strong><p><b>${SAFE(scout.question)}</b><br>${SAFE(scout.purpose)}</p><small>${SAFE(scout.changes)}</small></div>
      </div>
      <div class="pro-section-title"><b>OPEN STRATEGIC BRANCHES</b><span>Do not choose a tech name; choose the capability you are missing.</span></div>
      <div class="pro-branches">${branchHtml}</div>
      <div class="pro-expansion">
        <div class="pro-expansion-head"><div><span>EXPANSION PERMISSION</span><b>${SAFE(model.expansion.name)}</b><p>${SAFE(model.expansion.thesis)}</p></div><div class="pro-permission ${exp.cls}"><strong>${exp.status}</strong><span>${exp.passCount}/${exp.total} gates</span></div></div>
        <div class="pro-gates"><div class="pro-gate read ${exp.evidence}"><span>${exp.evidence==="pass"?"✓":exp.evidence==="fail"?"×":"?"}</span><b>Fresh threat / production read</b><small>${SAFE(infoLabel)}</small></div>${manualHtml}</div>
        <div class="pro-expansion-note">The app can verify only reported evidence. Position, reinforcement access, and vision are manual confirmations because Master Coach has no live SC2 integration.</div>
      </div>
      <div class="pro-section-title"><b>YOU BOUGHT THIS — NOW PROTECT THE INVESTMENT</b><span>Major purchases create new responsibilities.</span></div>
      <div class="pro-investments">${investments}</div>`;
    $("proRead").onclick=speakCurrent;
    root.querySelectorAll("[data-gate]").forEach(b=>b.onclick=()=>toggleGate(key,b.dataset.gate));
  }

  function mount(){
    if($("proMindPanel"))return;
    const anchor=$("planLibraryPanel")||$("buildPriorityZone")||document.querySelector(".command-center");
    if(!anchor)return;
    root=document.createElement("section");root.id="proMindPanel";root.className="frame panel-pad pro-mind";anchor.after(root);render();
    const nodes=[$("clock"),$("railMatchup"),$("railRace"),$("planOpponent"),$("opponent")].filter(Boolean);
    const obs=new MutationObserver(render);nodes.forEach(n=>obs.observe(n,{childList:true,subtree:true,characterData:true,attributes:true}));
    ["change","input"].forEach(evt=>document.addEventListener(evt,e=>{if(["planOpponent","opponent"].includes(e.target?.id))render()}));
    ["sc2:signal","sc2:opponent","sc2:plan-loaded","sc2:replay"].forEach(evt=>window.addEventListener(evt,render));
    document.querySelector("#evidenceList")&&new MutationObserver(render).observe(document.querySelector("#evidenceList"),{subtree:true,attributes:true,attributeFilter:["class"]});
  }
  function start(){mount();if(!root){let tries=0;const timer=setInterval(()=>{mount();if(root||++tries>40)clearInterval(timer)},250)}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
