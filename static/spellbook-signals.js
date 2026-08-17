(function(){
  "use strict";
  const lab=window.SC2SpellbookLab;if(!lab)return;
  const SIGNALS=[
    {key:"greed",label:"Fast third",voice:"Fast third confirmed. Keep economy; pressure the exposed base."},
    {key:"pressure",label:"Extra production",voice:"Production spike. Verify attack before adding more greed."},
    {key:"moveout",evidence:"pressure",label:"Move-out",voice:"Move-out confirmed. Stop luxury spending and set defensive geometry."},
    {key:"tech",label:"Air / tech",voice:"Tech shift. Add the minimum answer and keep scouting."},
    {key:"turtle",label:"Turtle",voice:"Static defense confirmed. Attack the map, not the fortress."},
    {key:"hidden",label:"Hidden tech",voice:"Information gap. Scout before the next irreversible commitment."},
    {key:"allin",label:"No natural",voice:"No natural. Survival overrides the economic script."}
  ];
  const signals=()=>new Set(lab.load(lab.KEYS.signals,[]));
  const voiceOn=()=>lab.load(lab.KEYS.quickVoice,true)!==false;

  function speak(text){if(voiceOn())lab.speak(text,1.07)}
  function cast(s){
    const set=signals(),key=s.evidence||s.key,button=document.querySelector(`#evidenceList [data-k="${CSS.escape(key)}"]`);
    if(button&&!button.classList.contains("active"))button.click();
    set.add(s.key);lab.save(lab.KEYS.signals,[...set]);speak(s.voice);lab.render();
  }
  function clear(){document.querySelectorAll("#evidenceList [data-k].active").forEach(b=>b.click());lab.save(lab.KEYS.signals,[]);lab.render()}

  lab.register({
    id:"signals",label:"Quick Signals",
    render(el){
      const known=lab.knowledge(),set=signals(),plan=lab.activePlan();
      el.innerHTML=`<div class="lab-head"><div><b>Second-Screen Quick Signals</b><span>One tap supplies information the app cannot obtain live without game integration.</span></div><div class="lab-actions"><button class="hud-btn ${voiceOn()?"active":""}" id="quickVoice">Brief voice ${voiceOn()?"ON":"OFF"}</button><button class="hud-btn" id="compactLive">Compact live mode</button><button class="hud-btn" id="clearQuick">Clear</button></div></div><div class="opponent-report"><b>Opponent race</b>${["Unknown","Terran","Zerg","Protoss"].map(x=>`<button class="hud-btn ${known.opponent===x?"active":""}" data-opp="${x}">${x}</button>`).join("")}</div><div class="signal-grid">${SIGNALS.map(s=>`<button class="spell-signal ${set.has(s.key)?"active":""}" data-signal="${s.key}"><b>${lab.safe(s.label)}</b><span>${lab.safe(s.voice)}</span></button>`).join("")}</div><div class="communication-rule"><b>Live communication governor</b><span>Normal callouts stay to one short sentence. The coach speaks scheduled build cues, explicit signals, and strategic overrides; explanations wait for replay review.</span><strong>${plan?`Active spell: ${lab.safe(plan.title)}`:"No spell loaded."}</strong></div>`;
      el.querySelectorAll("[data-signal]").forEach(b=>b.onclick=()=>{const s=SIGNALS.find(x=>x.key===b.dataset.signal);if(s)cast(s)});
      el.querySelectorAll("[data-opp]").forEach(b=>b.onclick=()=>lab.setOpponent(b.dataset.opp));
      lab.$("quickVoice").onclick=()=>{lab.save(lab.KEYS.quickVoice,!voiceOn());lab.render()};
      lab.$("clearQuick").onclick=clear;
      lab.$("compactLive").onclick=()=>{document.body.classList.toggle("spellbook-compact-live");lab.$("compactLive").classList.toggle("active",document.body.classList.contains("spellbook-compact-live"))};
    }
  });
})();
