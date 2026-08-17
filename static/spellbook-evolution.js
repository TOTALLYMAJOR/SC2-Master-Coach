(function(){
  "use strict";
  const lab=window.SC2SpellbookLab;if(!lab)return;
  const replayName=d=>d?.data?.source?.filename||"Replay";

  function matchingPlan(d){
    const me=d?.player,opp=(d?.data?.players||[]).find(x=>x.pid!==me?.pid);
    if(!me||!opp)return null;
    return (window.SC2PlanLibrary?.forMatchup(me.race,opp.race)||[])[0]||null;
  }

  function mutations(d){
    if(!d)return [];
    const a=d.analysis||{},out=[],seen=new Set();
    const add=(code,title,rule,why,second,kind)=>{if(!seen.has(code)){seen.add(code);out.push({code,title,rule,why,second:Number(second)||180,kind})}};
    (a.violations||[]).forEach(v=>{
      if(v.code==="SUPPLY_BLOCK")add(v.code,"Pre-cast supply","Move the next supply structure about 8 seconds earlier.",v.evidence,v.second,"supply");
      else if(v.code==="BANK_CONVERSION")add(v.code,"Production conversion checkpoint","Add a spend/production checkpoint before the bank becomes tactical debt.",v.evidence,v.second,"production");
      else if(v.code==="BAD_EXCHANGE"||v.code==="ENGAGEMENT_GATE")add(v.code,"Engagement gate","Require a concrete compensating advantage before committing this fight.",v.evidence,v.second,"fight");
      else if(v.code==="POSTHOC_GREED_SIGNATURE")add(v.code,"Greed abort trigger","Add an explicit abort condition when enemy production accelerates.",v.evidence,v.second,"abort");
      else if(v.code==="WORKER_GROWTH_STALL")add(v.code,"Macro attention checkpoint","Add a worker-production check at this transition.",v.evidence,v.second,"macro");
    });
    const obs=a.observation_model?.summary||{};
    if((obs.median_observation_latency_seconds??0)>6)add("OBS_LATENCY","Scouting attention checkpoint","Add a camera/scouting reminder before the next irreversible commitment.",`Median observation latency was ${obs.median_observation_latency_seconds}s.`,180,"scout");
    if((obs.median_decision_latency_seconds??0)>10)add("DECISION_LATENCY","Decision deadline","Convert a confirmed scout into a binary action within one production cycle.",`Median decision latency was ${obs.median_decision_latency_seconds}s.`,210,"decision");
    return out.slice(0,6);
  }

  function makeVariant(m){
    const d=lab.getReplay(),base=lab.activePlan()||matchingPlan(d);if(!d||!base)return null;
    const steps=(base.steps||[]).map(s=>s.slice()),before=Math.max(20,m.second-15);
    if(m.kind==="supply"){
      const idx=steps.findIndex(s=>/Pylon|Supply Depot|Overlord/i.test(s[1])&&s[0]<=m.second+30);if(idx>=0)steps[idx][0]=Math.max(0,steps[idx][0]-8);
    }else{
      const action={production:"Production conversion check",fight:"Engagement gate check",abort:"Greed abort check",macro:"Worker cycle check",scout:"Scout / camera checkpoint",decision:"Decision deadline"}[m.kind]||"Personal checkpoint";
      steps.push([before,action,"Personal rule",m.rule]);steps.sort((a,b)=>a[0]-b[0]);
    }
    return {...base,id:`${base.id}-personal-${Date.now()}`,title:`${base.title} · Personal Variant`,type:"Personal Spell",parentId:base.id,steps,personalRules:[...(base.personalRules||[]),{code:m.code,rule:m.rule,why:m.why,sourceReplay:replayName(d),createdAt:new Date().toISOString()}]};
  }

  function adopt(index){
    const m=mutations(lab.getReplay())[index],v=makeVariant(m);if(!m||!v)return;
    const rows=lab.variants();rows.push(v);lab.save(lab.KEYS.variants,rows);lab.render();
  }

  lab.register({
    id:"evolution",label:"Evolution",
    render(el){
      const d=lab.getReplay(),ms=mutations(d),personal=lab.variants().slice().reverse().slice(0,8);
      const proposals=d?(ms.length?ms.map((m,i)=>`<div class="mutation-card"><div><span class="badge review">${lab.safe(m.code)}</span><b>${lab.safe(m.title)}</b><p>${lab.safe(m.rule)}</p><small>${lab.safe(m.why)}</small></div><button class="hud-btn" data-adopt="${i}">Create personal variant</button></div>`).join(""):'<div class="lab-empty">No high-value mutation emerged from this replay.</div>'):'<div class="lab-empty">Analyze a replay to generate evidence-backed refinements.</div>';
      el.innerHTML=`<div class="lab-head"><div><b>Replay-Driven Spell Evolution</b><span>Replays propose changes. Canonical spells are never silently rewritten.</span></div></div><div class="mutation-list">${proposals}</div><div class="mini-title">Personal variants</div>${personal.length?personal.map(p=>`<div class="personal-spell"><div><b>${lab.safe(p.title)}</b><span>${lab.safe(lab.matchup(p))} · ${(p.personalRules||[]).length} learned rule(s)</span></div><button class="hud-btn" data-load-variant="${lab.safe(p.id)}">Load</button></div>`).join(""):'<div class="lab-empty compact">No personal variants yet.</div>'}`;
      el.querySelectorAll("[data-adopt]").forEach(b=>b.onclick=()=>adopt(+b.dataset.adopt));
      el.querySelectorAll("[data-load-variant]").forEach(b=>b.onclick=()=>lab.loadPlan(lab.plan(b.dataset.loadVariant)));
    }
  });
})();
