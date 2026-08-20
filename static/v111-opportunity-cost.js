(function(){
  "use strict";

  const safe=value=>String(value??"").replace(/[<>&\"]/g,ch=>({"<":"&lt;",">":"&gt;","&":"&amp;",'\"':"&quot;"}[ch]));

  function appendCommitmentContext(){
    const overlay=document.getElementById("v111ScienceOverlay");
    if(!overlay||overlay.querySelector("[data-v111-opportunity-cost]"))return;
    const run=window.SC2PythonShadow?.lastRun;
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
    const actions=overlay.querySelector(".v111-science-actions");
    if(actions)actions.before(section);else overlay.querySelector(".v111-science-card")?.appendChild(section);
  }

  const observer=new MutationObserver(()=>appendCommitmentContext());
  observer.observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener("sc2:strategy-state",()=>appendCommitmentContext());
})();
