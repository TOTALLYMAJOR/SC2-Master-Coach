const RACES={
 Zerg:{
  theme:{accent:"#b978ff",accent2:"#e26dff",glow:"rgba(185,120,255,.24)",line:"#49305e"},
  portrait:{name:"Overmind Node",sub:"Zerg tactical cognition",voice:"Larva is optionality. Spend it only after evidence tells you what future state must exist."},
  art:`<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="zg"><stop stop-color="#d36cff"/><stop offset="1" stop-color="#3b163f"/></radialGradient></defs>
    <path d="M54 241 C85 180 92 118 139 82 C121 44 151 26 179 57 C200 8 224 8 233 59 C265 22 296 48 270 85 C321 112 328 178 354 241 C303 216 275 219 244 248 C220 264 181 264 157 246 C124 219 94 217 54 241Z" fill="url(#zg)" stroke="#f2b2ff" stroke-width="4"/>
    <path d="M126 123 C155 90 180 101 197 132 C214 101 247 92 275 126 C250 126 233 139 226 166 C216 190 179 190 168 164 C159 140 145 127 126 123Z" fill="#180d23" stroke="#d77cff" stroke-width="3"/>
    <ellipse cx="165" cy="139" rx="8" ry="5" fill="#ffe0ff"/><ellipse cx="236" cy="139" rx="8" ry="5" fill="#ffe0ff"/>
    <path d="M87 159 Q43 172 35 211 Q77 197 112 200M308 158 Q357 170 367 211 Q323 196 290 202" fill="none" stroke="#c764ef" stroke-width="10" stroke-linecap="round"/>
    <path d="M146 203 Q199 230 256 203" fill="none" stroke="#f0a6ff" stroke-width="5"/>
  </svg>`
 },
 Terran:{
  theme:{accent:"#5bdcff",accent2:"#7ab8ff",glow:"rgba(91,220,255,.22)",line:"#193a52"},
  portrait:{name:"Ghost Command",sub:"Terran operational warfare",voice:"Terran is scheduling. Pressure two places, force the response, then expand behind the defensive tax."},
  art:`<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="tg" x1="0" x2="1"><stop stop-color="#8edfff"/><stop offset="1" stop-color="#163b57"/></linearGradient></defs>
    <path d="M95 244 L118 146 Q124 91 166 72 L178 35 H222 L236 73 Q278 92 284 147 L306 244Z" fill="#102536" stroke="url(#tg)" stroke-width="5"/>
    <path d="M143 106 Q200 72 258 108 L247 170 Q201 190 153 170Z" fill="#07131d" stroke="#79dfff" stroke-width="4"/>
    <path d="M157 127 H245 L237 151 H166Z" fill="#001d2a" stroke="#68eaff" stroke-width="3"/>
    <circle cx="182" cy="139" r="6" fill="#6dff9b"/><circle cx="222" cy="139" r="6" fill="#6dff9b"/>
    <path d="M126 182 L70 212 L54 245 H112 L153 203M273 183 L332 215 L347 245 H287 L249 202" fill="#173d58" stroke="#62cfff" stroke-width="4"/>
    <path d="M166 208 H235 V257 H166Z" fill="#0b1b26" stroke="#417997" stroke-width="3"/>
  </svg>`
 },
 Protoss:{
  theme:{accent:"#ffd45d",accent2:"#6ee7ff",glow:"rgba(255,212,93,.22)",line:"#5b4b22"},
  portrait:{name:"Khalai Nexus",sub:"Protoss psionic command",voice:"Preserve expensive power. Create local asymmetry, force movement, and attack only when abilities make the geometry unfair."},
  art:`<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="pg" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fff2a1"/><stop offset=".55" stop-color="#e6a93e"/><stop offset="1" stop-color="#2b6381"/></linearGradient></defs>
    <path d="M200 25 L248 72 L272 135 L255 213 L200 272 L144 213 L126 135 L153 70Z" fill="#102635" stroke="url(#pg)" stroke-width="6"/>
    <path d="M157 107 Q200 76 244 108 L235 171 Q201 194 165 170Z" fill="#07131d" stroke="#f8d269" stroke-width="4"/>
    <path d="M173 126 Q188 115 196 134 Q187 148 173 141Z" fill="#7df3ff"/><path d="M226 126 Q211 115 204 134 Q213 148 227 141Z" fill="#7df3ff"/>
    <path d="M151 72 L111 117 L126 167M249 72 L291 117 L275 166" fill="none" stroke="#ffd45d" stroke-width="9" stroke-linecap="round"/>
    <path d="M181 198 L200 224 L219 198" fill="none" stroke="#77eaff" stroke-width="5"/>
    <circle cx="200" cy="60" r="13" fill="#7df3ff" opacity=".72"/>
  </svg>`
 }
};

const DOCTRINES={
 "ZvT":{name:"Elastic Swarm",posture:"ABSORB → SURROUND → OVERWHELM",win:"Absorb scheduled Terran pressure without sacrificing the larva economy that powers the second army.",eco:"Drone while production and CC evidence permits it; compress Drone windows when production outpaces expansion.",fight:"Trade space for time, break siege geometry, attack reinforcements, then collapse.",q:"Where is Terran spending the next two production cycles?"},
 "ZvP":{name:"Information Elasticity",posture:"READ → ALLOCATE → DENY SPIKE",win:"Convert Protoss tech and Gateway counts into the correct larva allocation before the power spike arrives.",eco:"Greed is earned by evidence; a third Nexus is not safety if Gateways spike.",fight:"Avoid Battery and splash geometry; force expensive Protoss units to reposition.",q:"What exact Protoss power spike is being purchased?"},
 "ZvZ":{name:"Larva Knife-Fight",posture:"COUNT → SURVIVE → COMPOUND",win:"Read Drone-versus-army cycles earlier than the opponent and exploit reinforcement geometry.",eco:"Worker leads matter only if they survive the next larva cycle.",fight:"Stop damage-chasing when defender reinforcement flips the local fight.",q:"Did the opponent's last larva cycle become Drones or army?"},
 "TvZ":{name:"Scheduled Taxation",posture:"SCOUT → SCHEDULE → MULTI-PRONG",win:"Force Zerg larvae into army instead of Drones while expanding behind repeatable production pressure.",eco:"Third CC and scalable production belong behind credible pressure.",fight:"Siege before contact, clear creep, pre-split, and refuse the prepared surround.",q:"Can your next scheduled threat force the worse larva choice?"},
 "TvP":{name:"Geometry & Tax",posture:"IDENTIFY SPIKE → PRE-SPLIT → FORCE MOVEMENT",win:"Make expensive Protoss power units defend too much space while Bio production compounds.",eco:"Expand behind pressure when Protoss is stable or greedy.",fight:"Threaten a second location before demanding a frontal win.",q:"Which Protoss power spike is approaching, and where can it be made inefficient?"},
 "TvT":{name:"Vision Siege Chess",posture:"SEE → POSITION → DENY ROTATION",win:"Convert information and air control into superior Tank geometry.",eco:"Expand only when army location and siege lanes are controlled.",fight:"Air superiority exists to improve vision and siege placement, not erase a ground deficit.",q:"Where can the enemy siege next?"},
 "PvT":{name:"Asymmetric Power",posture:"SEE → THREATEN → PRESERVE",win:"Use tech thresholds, Blink/Prism geometry and preservation to create threats Terran cannot answer simultaneously.",eco:"Take economy when mobile map control buys safety.",fight:"Preserve splash/casters and force Terran to move before committing.",q:"Can your current power spike attack the Terran schedule rather than the fortress?"},
 "PvZ":{name:"Power-Spike Leverage",posture:"CLASSIFY → PIN → EXPAND",win:"Use concentrated power spikes and warp geometry to force larvae into defense while economy compounds.",eco:"Reconcile army size with Drone/base evidence before canceling economy.",fight:"Use chokes, spell geometry and threatened bases to compress Zerg choices.",q:"What is the next Zerg larva cycle becoming?"},
 "PvP":{name:"Local Superiority",posture:"VERIFY → PRESERVE → OUT-GEOMETRY",win:"Create local asymmetry with vision, Blink, Batteries, warp geometry and tech timing.",eco:"Hidden tech increases scouting priority, not automatic panic.",fight:"Visible Stalker count is not the whole local fight; reinforcement geometry matters.",q:"What hidden allocation would make the visible army misleading?"}
};

const BUILD={
 Zerg:[[0,"Drone continuously","Opening","Build the economy that pays for every later decision."],[32,"Overlord","Opening","Stay ahead of the first supply block."],[73,"Natural Hatchery","Opening","Economy + larva + map claim."],[97,"Spawning Pool","Opening","Queens and defense without strangling expansion."],[145,"2 Queens + first Zerglings","Stabilize","Inject immediately; Lings scout and protect."],[194,"Third Hatchery","Expand","Convert a safe read into economy."],[220,"Roach Warren","Tech","Insurance against ground aggression."]],
 Terran:[[0,"SCVs continuously","Opening","Worker cycles establish the income floor."],[32,"Supply Depot","Opening","Create room and start wall geometry."],[48,"Barracks + Refinery","Opening","Begin the Reaper-tech backbone."],[105,"Orbital + Reaper","Scout","MULE economy plus information."],[145,"Command Center","Expand","Expand behind scouting pressure."],[195,"Factory + second gas","Tech","Unlock flexible 1/1/1 responses."],[235,"Starport","Tech","Reconfigure production rapidly."]],
 Protoss:[[0,"Probes continuously","Opening","Chrono + worker continuity fund tech."],[35,"Pylon","Opening","Power-field geometry already matters."],[55,"Gateway","Opening","Begin the tech chain."],[70,"Assimilator","Opening","Gas funds power spikes."],[115,"Nexus if scout permits","Expand","Expansion follows evidence, not habit."],[125,"Cybernetics Core","Tech","Unlock advanced Gateway tech."],[225,"Twilight Council","Tech","Blink gives mobility and preservation."]]
};

const EVIDENCE={
 Zerg:[["No enemy natural","allin"],["Extra production","pressure"],["Air tech","tech"],["Opponent turtles","turtle"],["Greedy expansion","greed"],["Hidden information","hidden"]],
 Terran:[["No enemy natural","allin"],["Fast tech","tech"],["Greedy third","greed"],["Heavy static","turtle"],["Large move-out","pressure"],["Hidden army","hidden"]],
 Protoss:[["No enemy natural","allin"],["Fast air","tech"],["Heavy timing","pressure"],["Greedy third","greed"],["Turtle/static","turtle"],["Hidden tech","hidden"]]
};
