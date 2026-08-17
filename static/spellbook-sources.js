(function(){
  "use strict";
  const lab=window.SC2SpellbookLab;if(!lab)return;
  const builtins=[
    {id:"blizzard-5016b",title:"Blizzard · StarCraft II 5.0.16b Hotfix Patch Notes",url:"https://news.blizzard.com/en-us/article/24291949/starcraft-ii-5-0-16b-hotfix-patch-notes",patch:"5.0.16b",kind:"Official balance",checkedAt:"2026-08-17",note:"Authoritative live balance baseline."},
    {id:"blizzard-5016",title:"Blizzard · StarCraft II 5.0.16 Patch Notes",url:"https://news.blizzard.com/en-us/article/24259080/starcraft-ii-5-0-16-patch-notes",patch:"5.0.16",kind:"Official economy + balance",checkedAt:"2026-08-17",note:"Eight-worker start and underlying economy reset."},
    {id:"mbmapps",title:"MBMapps · Master Coach strategy synthesis",url:"",patch:"5.0.16b",kind:"Curated doctrine",checkedAt:"2026-08-17",note:"In-app strategies. Timing windows are coaching benchmarks, not proof of universal win rate."}
  ];
  const users=()=>lab.load(lab.KEYS.sources,[]);
  const state=s=>s.timeless?["STABLE PRINCIPLE","good"]:String(s.patch||"").toLowerCase()===lab.PATCH.toLowerCase()?["CURRENT PATCH","good"]:s.patch?["REVIEW / STALE","bad"]:["VERIFY PATCH","warn"];
  function add(){const title=lab.$("sourceTitle")?.value.trim();if(!title)return;const rows=users();rows.push({id:`user-${Date.now()}`,title,url:lab.$("sourceUrl")?.value.trim()||"",patch:lab.$("sourcePatch")?.value.trim()||"",kind:lab.$("sourceKind")?.value||"Web reference",checkedAt:new Date().toISOString().slice(0,10),timeless:!!lab.$("sourceTimeless")?.checked,note:lab.$("sourceNote")?.value.trim()||"Manually added. Content is not automatically scraped."});lab.save(lab.KEYS.sources,rows);lab.render()}
  lab.register({
    id:"sources",label:"Sources",
    render(el){
      const rows=[...builtins,...users()];
      el.innerHTML=`<div class="lab-head"><div><b>Knowledge Sources & Staleness</b><span>Web knowledge is curated into the spellbook; it does not silently browse during a match.</span></div></div><div class="source-list">${rows.map(s=>{const st=state(s);return `<div class="source-card"><div><span class="badge ${st[1]}">${st[0]}</span><b>${lab.safe(s.title)}</b><small>${lab.safe(s.kind)} · patch ${lab.safe(s.patch||"unspecified")} · checked ${lab.safe(s.checkedAt||"unknown")}</small><p>${lab.safe(s.note||"")}</p></div>${s.url?`<button class="hud-btn" data-source="${lab.safe(s.url)}">Open source</button>`:""}</div>`}).join("")}</div><div class="source-form"><div class="mini-title">Add a web or coaching source</div><input id="sourceTitle" placeholder="Source title"><input id="sourceUrl" placeholder="https://..."><input id="sourcePatch" value="${lab.PATCH}" placeholder="Patch"><select id="sourceKind"><option>Build / strategy</option><option>Replay / match</option><option>Official balance</option><option>Guide / analysis</option><option>Web reference</option></select><input id="sourceNote" placeholder="What should the spellbook learn from this?"><label><input type="checkbox" id="sourceTimeless"> Timeless principle</label><button class="hud-btn" id="addSource">Add source</button></div><div class="coach-boundary">Source presence is not evidence of effectiveness. Personal effectiveness is measured separately from your linked replays.</div>`;
      el.querySelectorAll("[data-source]").forEach(b=>b.onclick=()=>window.open(b.dataset.source,"_blank","noopener"));
      lab.$("addSource").onclick=add;
    }
  });
})();
