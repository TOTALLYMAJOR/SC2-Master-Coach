(function(){
  "use strict";

  const safe=value=>String(value??"").replace(/[<>&\"]/g,ch=>({"<":"&lt;",">":"&gt;","&":"&amp;",'\"':"&quot;"}[ch]));

  function insertBeforeActions(overlay,section){
    const actions=overlay.querySelector(".v111-science-actions");
    if(actions)actions.before(section);else overlay.querySelector(".v111-science-card")?.appendChild(section);
  }

  function appendThreatHazard(overlay,run){
    if(overlay.querySelector("[data-v111-threat-hazard]"))return;
    const hazard=run?.advisory?.metadata?.threat_hazard;if(!hazard)return;
    const bands=hazard.bands||[];const drivers=(hazard.drivers||[]).slice(0,4);
    const section=document.createElement("section");section.className="v111-science-proof";section.dataset.v111ThreatHazard="true";
    section.innerHTML=`
      <h3>Near-term attack hazard · qualitative</h3>
      <div class="v111-science-grid">${bands.map(row=>`<section class="v111-science-panel"><h3>${Number(row.from_seconds)}–${Number(row.to_seconds)} sec</h3><div class="status ${row.level==="HIGH"?'hold':row.level==="MODERATE"?'caution':'continue'}">${safe(row.level)}</div></section>`).join("")}</div>
      ${drivers.length?`<ul>${drivers.map(row=>`<li>${safe(row)}</li>`).join("")}</ul>`:""}
      <p><b>Next resolving intel:</b> ${safe(hazard.next_resolving_intel||"Refresh production and movement.")}</p>
      <p class="muted">${safe(hazard.boundary||"Qualitative hazard only; no calibrated attack probability is claimed.")}</p>
    `;
    insertBeforeActions(overlay,section);
  }

  function appendCommitmentContext(){
    const overlay=document.getElementById("v111ScienceOverlay");
    if(!overlay)return;
    const run=window.SC2PythonShadow?.lastRun;
    appendThreatHazard(overlay,run);
    if(overlay.querySelector("[data-v111-opportunity-cost]"))return;
    const ledger=run?.advisory?.metadata?.commitment_window;
    if(!ledger)return;

    const totals=ledger.totals||{};
    const items=(ledger.items||[]).slice(0,5);
    const alternatives=(ledger.alternatives||[]).slice(0,3);
    const section=document.createElement("section");
    section.className="v111-science-proof";
    section.dataset.v111OpportunityCost="true";
    section.innerHTML=`
      <h3>Opportunity-cost window · next ${Number(ledger.horizon_seconds||75)}s</h3>
      <p><b>Recognized named commitments:</b> ${Number(totals.mineral||0)} minerals + ${Number(totals.gas||0)} gas.</p>
      ${items.length?`<ul>${items.map(row=>`<li><b>${safe(row.action)}</b> — ${Number(row.mineral||0)}M / ${Number(row.gas||0)}G <span class="muted">(${safe(row.kind)})</span></li>`).join("")}</ul>`:"<p class=\"muted\">No named cost-bearing action falls inside the current horizon.</p>"}
      ${alternatives.length?`<p class="muted"><b>What those resources compete with:</b></p><ul class="muted">${alternatives.map(row=>`<li>${safe(row.label)} — ${Number(row.mineral||0)}M / ${Number(row.gas||0)}G: ${safe(row.strategic_meaning)}</li>`).join("")}</ul>`:""}
      <p class="muted">${safe(ledger.boundary||"This is a transparent commitment ledger, not an estimate of the player's exact live bank.")}</p>
    `;
    insertBeforeActions(overlay,section);
  }

  const observer=new MutationObserver(()=>appendCommitmentContext());
  observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener("sc2:strategy-state",()=>appendCommitmentContext());
})();
