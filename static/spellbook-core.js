(function(){
  "use strict";
  const PATCH="5.0.16b";
  const KEYS={profile:"sc2-master-coach:first-run:v1",plan:"sc2-master-coach:active-plan:v1",ledger:"sc2-master-coach:spell-ledger:v1",variants:"sc2-master-coach:personal-spells:v1",sources:"sc2-master-coach:knowledge-sources:v1",signals:"sc2-master-coach:quick-signals:v1",curriculum:"sc2-master-coach:curriculum:v1",quickVoice:"sc2-master-coach:quick-voice:v1"};
  const tabs=[];
  const $=id=>document.getElementById(id);
  const safe=v=>String(v??"").replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
  const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch{return fallback}};
  const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const profile=()=>load(KEYS.profile,{});
  const canonical=id=>window.SC2PlanLibrary?.get(id)||null;
  const variants=()=>load(KEYS.variants,[]);
  const plan=id=>variants().find(x=>x.id===id)||canonical(id);
  const activePlan=()=>plan(localStorage.getItem(KEYS.plan)||"");
  const matchup=p=>{const l=r=>r==="Zerg"?"Z":r==="Terran"?"T":r==="Protoss"?"P":"?";return p?`${l(p.race)}v${l(p.opponent)}`:""};
  const fmt=s=>`${Math.floor(Math.max(0,+s||0)/60)}:${String(Math.floor(Math.max(0,+s||0))%60).padStart(2,"0")}`;
  let replay=window.__sc2LastReplay||null;
  let active="performance";
  let root=null;

  function speak(text,rate=1.04){if(!text||!("speechSynthesis" in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(String(text));u.rate=rate;u.pitch=.96;speechSynthesis.speak(u)}
  function knowledge(){const p=profile(),pl=activePlan(),signals=load(KEYS.signals,[]);return {race:document.getElementById("railRace")?.textContent||p.race||"Unknown",opponent:pl?.opponent||($("planOpponent")?.value&&$("planOpponent").value!=="Unknown"?$("planOpponent").value:"Unknown"),plan:pl?.title||"No spell loaded",signals,replay:replay?.data?.source?.filename||null}}
  function renderKnowledge(){const el=$("spellKnowledge");if(!el)return;const k=knowledge();el.innerHTML=`<div><b>${safe(k.race)}</b><span>my race</span></div><div><b>${safe(k.opponent)}</b><span>opponent · ${k.opponent==="Unknown"?"not reported yet":"known"}</span></div><div><b>${safe(k.plan)}</b><span>active spell</span></div><div><b>${safe(k.signals.length?k.signals.join(", "):"none")}</b><span>reported live evidence</span></div><div class="unknown"><b>Unavailable live</b><span>exact minerals · army positions · enemy production · camera · completed actions unless you report them</span></div>`}
  function renderTabs(){const bar=$("spellTabs");if(!bar)return;bar.innerHTML=tabs.map((t,i)=>`<button class="hud-btn ${t.id===active?"active":""}" data-spell-tab="${safe(t.id)}">${i+1} · ${safe(t.label)}</button>`).join("");bar.querySelectorAll("[data-spell-tab]").forEach(b=>b.onclick=()=>{active=b.dataset.spellTab;render()})}
  function render(){if(!root)return;renderKnowledge();renderTabs();const tab=tabs.find(t=>t.id===active)||tabs[0];if(tab){active=tab.id;tab.render($("spellBody"),api)}}
  function addUnknownOpponent(){const s=$("planOpponent");if(!s)return;if(![...s.options].some(o=>o.value==="Unknown"))s.insertBefore(new Option("Unknown","Unknown"),s.firstChild);if(!replay&&!activePlan()){s.value="Unknown";s.dispatchEvent(new Event("change"))}}
  function mount(){if($("spellbookLab"))return;const anchor=$("planLibraryPanel")||$("buildPriorityZone")||document.querySelector(".command-center");if(!anchor)return;root=document.createElement("section");root.id="spellbookLab";root.className="frame panel-pad spellbook-lab";root.innerHTML=`<div class="spell-head"><div><div class="section-title">Coach Lab // Spellbook <span>tune the intelligence</span></div><p>Measure what works for you, evolve spells from replay evidence, and keep live communication minimal.</p></div><button class="hud-btn" id="spellCollapse">Collapse</button></div><div class="spell-knowledge" id="spellKnowledge"></div><div class="spell-tabs" id="spellTabs"></div><div id="spellBody"></div>`;anchor.after(root);$("spellCollapse").onclick=()=>{const c=root.classList.toggle("collapsed");$("spellCollapse").textContent=c?"Open Coach Lab":"Collapse"};render()}
  const api={PATCH,KEYS,$,safe,load,save,profile,plan,variants,activePlan,matchup,fmt,speak,knowledge,getReplay:()=>replay,setReplay:d=>{replay=d;render()},render,register(tab){tabs.push(tab);if(!tabs.some(t=>t.id===active))active=tabs[0].id;render()},setOpponent(value){const p=$("planOpponent");if(p){p.value=value;p.dispatchEvent(new Event("change"))}if(value!=="Unknown"&&$("opponent")){$("opponent").value=value;$("opponent").dispatchEvent(new Event("change"))}render()},loadPlan(p){if(!p||typeof BUILD!=="object")return;BUILD[p.race]=(p.steps||[]).map(s=>s.slice());localStorage.setItem(KEYS.plan,p.id);const rb=[...document.querySelectorAll(".race-btn")].find(b=>b.dataset.race===p.race);if(rb)rb.click();if($("opponent")){$("opponent").value=p.opponent;$("opponent").dispatchEvent(new Event("change"))}window.dispatchEvent(new CustomEvent("sc2:plan-loaded",{detail:p}));render()}};
  window.SC2SpellbookLab=api;
  function start(){addUnknownOpponent();mount();window.addEventListener("sc2:replay",e=>api.setReplay(e.detail));window.addEventListener("sc2:plan-loaded",()=>render());const nodes=["railRace","railMatchup","alertLevel","execute","nextAction"].map($).filter(Boolean);if(nodes.length){const o=new MutationObserver(renderKnowledge);nodes.forEach(n=>o.observe(n,{childList:true,subtree:true,characterData:true}))}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
