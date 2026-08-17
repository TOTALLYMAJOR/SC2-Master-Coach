(function(){
  "use strict";
  const lab=window.SC2SpellbookLab;if(!lab)return;
  function prescription(d){
    if(!d)return [];
    const a=d.analysis||{},codes=new Set((a.violations||[]).map(v=>v.code)),obs=a.observation_model?.summary||{},out=[];
    const add=(spell,why,metric)=>{if(!out.some(x=>x.spell===spell))out.push({spell,why,metric})};
    if((obs.median_observation_latency_seconds??0)>6)add("Scout on Schedule","Your camera reached meaningful information late.","Median observation latency ≤ 5s");
    if((obs.median_decision_latency_seconds??0)>10)add("Decide Within One Cycle","Information arrived, but your response command lagged.","Median decision latency ≤ 8s");
    if(codes.has("BANK_CONVERSION"))add("Production Conversion","Resources stayed latent instead of becoming army/economy.","No sustained ≥1000 bank below max supply");
    if(codes.has("SUPPLY_BLOCK"))add("Supply Pre-cast","Supply locks delayed production cycles.","No sustained supply block >10s");
    if(codes.has("BAD_EXCHANGE")||codes.has("ENGAGEMENT_GATE"))add("Engagement Gate","A costly fight lacked a compensating advantage.","No major >1.45x unfavorable exchange");
    if(codes.has("POSTHOC_GREED_SIGNATURE"))add("Greed Abort","Economy continued into a rising enemy army cycle.","Abort greed within one production cycle of pressure evidence");
    if(codes.has("WORKER_GROWTH_STALL"))add("Worker Rhythm","Macro attention fell out of the control loop.","No unexplained 60s worker stall before 55 workers");
    if(!out.length)add("Repeat the Chosen Spell","No dominant failure signal emerged. Repeat before changing strategy.","Two comparable games with the same plan");
    return out.slice(0,3);
  }
  const current=()=>lab.load(lab.KEYS.curriculum,null);
  function start(){const d=lab.getReplay();if(!d)return;lab.save(lab.KEYS.curriculum,{createdAt:new Date().toISOString(),matchup:d.analysis?.matchup||"",planId:lab.activePlan()?.id||null,focus:prescription(d),game:1,total:5});lab.render()}
  function advance(){const c=current();if(!c)return;c.game=Math.min(c.total,c.game+1);lab.save(lab.KEYS.curriculum,c);lab.render()}
  lab.register({
    id:"curriculum",label:"Prescription",
    render(el){
      const d=lab.getReplay(),rec=prescription(d),c=current();
      const cards=d?rec.map((x,i)=>`<div class="prescription-card"><span>${i+1}</span><div><b>${lab.safe(x.spell)}</b><p>${lab.safe(x.why)}</p><strong>Success metric · ${lab.safe(x.metric)}</strong></div></div>`).join(""):'<div class="lab-empty">Analyze a replay to prescribe the next training spells.</div>';
      const progress=c?`<div class="curriculum-card"><div class="curriculum-top"><b>Game ${c.game} / ${c.total}</b><span>${lab.safe(c.matchup)} · ${lab.safe(lab.plan(c.planId)?.title||"strategy experiment")}</span></div><div class="five-game">${[[1,"baseline"],[2,"focus"],[3,"repeat"],[4,"stress"],[5,"verify"]].map(([n,label])=>`<div class="${c.game>=n?"done":""}">${n}<small>${label}</small></div>`).join("")}</div><p>Keep the strategy stable while testing one weakness. Review whether the metric moved before changing the spell again.</p></div>`:"";
      el.innerHTML=`<div class="lab-head"><div><b>Post-Game Spell Prescription</b><span>Turn one replay diagnosis into a bounded five-game experiment.</span></div><div class="lab-actions"><button class="hud-btn" id="startRx" ${!d?"disabled":""}>Start 5-game prescription</button>${c?'<button class="hud-btn" id="advanceRx">Advance game</button>':""}</div></div><div class="prescription-grid">${cards}</div>${progress}`;
      if(lab.$("startRx"))lab.$("startRx").onclick=start;
      if(lab.$("advanceRx"))lab.$("advanceRx").onclick=advance;
    }
  });
})();
