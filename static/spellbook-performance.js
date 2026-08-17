(function(){
  "use strict";
  const lab=window.SC2SpellbookLab;if(!lab)return;
  const ledger=()=>lab.load(lab.KEYS.ledger,[]);
  const replayName=d=>d?.data?.source?.filename||d?.data?.replay?.date||"Replay";
  const makeKey=(d,p)=>`${replayName(d)}|${d?.player?.pid||"?"}|${p.id}`;

  function record(){
    const d=lab.getReplay(),p=lab.activePlan();
    if(!d||!p)return "Analyze a replay and load a spell first.";
    const me=d.player||{},a=d.analysis||{},opp=(d.data?.players||[]).find(x=>x.pid!==me.pid);
    if(me.race!==p.race)return `Replay player is ${me.race}; active spell is ${p.race}.`;
    if(opp&&opp.race!==p.opponent)return `Replay is ${a.matchup}; active spell is ${lab.matchup(p)}.`;
    const rows=ledger(),k=makeKey(d,p);
    if(rows.some(x=>x.key===k))return "This replay is already linked to that spell.";
    const result=String(me.result||"Unknown");
    rows.push({key:k,planId:p.id,title:p.title,matchup:a.matchup||lab.matchup(p),result,won:/victory|win/i.test(result),lost:/defeat|loss/i.test(result),score:Number(a.score)||0,flags:(a.violations||[]).length,replay:replayName(d),at:new Date().toISOString()});
    lab.save(lab.KEYS.ledger,rows);
    return "Replay linked. Personal effectiveness updated.";
  }

  function stats(){
    const grouped={};
    ledger().forEach(r=>{
      const x=grouped[r.planId]||(grouped[r.planId]={title:r.title,w:0,l:0,n:0,s:0,flags:0});
      x.n++;if(r.won)x.w++;if(r.lost)x.l++;x.s+=r.score||0;x.flags+=r.flags||0;
    });
    return Object.values(grouped).map(x=>({...x,avg:x.n?Math.round(x.s/x.n):0})).sort((a,b)=>b.n-a.n||b.avg-a.avg);
  }

  const maturity=n=>n>=15?["STRONGER SAMPLE","good"]:n>=5?["DEVELOPING","warn"]:["EARLY SAMPLE","review"];

  lab.register({
    id:"performance",label:"Effectiveness",
    render(el){
      const rows=stats(),p=lab.activePlan(),d=lab.getReplay();
      const cards=rows.length?rows.map(r=>{
        const m=maturity(r.n),decided=r.w+r.l,pct=decided?Math.round(r.w*100/decided):null;
        return `<div class="effect-card"><div><b>${lab.safe(r.title)}</b><span class="badge ${m[1]}">${m[0]}</span></div><strong>${r.w}–${r.l}</strong><small>${pct==null?"No decided games":pct+"% of linked decided games"} · ${r.n} sample${r.n===1?"":"s"}</small><p>Coach score ${r.avg} · ${r.flags} review flags</p></div>`;
      }).join(""):'<div class="lab-empty">No outcomes yet. Load a spell, play, analyze the replay, then link it here.</div>';
      el.innerHTML=`<div class="lab-head"><div><b>Personal Spell Effectiveness</b><span>Only replays you explicitly link count. No invented global win rate.</span></div><div class="lab-actions"><button class="hud-btn" id="spellRecord" ${!p||!d?"disabled":""}>Link replay to active spell</button><button class="hud-btn" id="spellLedgerClear">Clear</button></div></div><div class="lab-callout" id="spellRecordStatus">${p?`Active: ${lab.safe(p.title)}.`:"Load a strategy first."} ${d?`Replay: ${lab.safe(replayName(d))}.`:"Analyze a replay to record an outcome."}</div><div class="effect-grid">${cards}</div>`;
      const b=lab.$("spellRecord");if(b)b.onclick=()=>{lab.$("spellRecordStatus").textContent=record();lab.render()};
      const c=lab.$("spellLedgerClear");if(c)c.onclick=()=>{if(confirm("Clear your local spell ledger?")){localStorage.removeItem(lab.KEYS.ledger);lab.render()}};
    }
  });
})();
