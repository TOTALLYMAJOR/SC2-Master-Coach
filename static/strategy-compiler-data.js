(function(){
  "use strict";

  const PATCH="5.0.16b";
  const DATA_VERSION="1.8.0-compiler-1";
  const RACES=["Protoss","Terran","Zerg","Unknown"];
  const RISKS=["safe","balanced","greedy"];
  const COACH_STYLES=["commander","mentor","professor","silent_test"];

  const ART={
    Protoss:"/artwork/protoss-strategy.svg",
    Terran:"/artwork/terran-strategy.svg",
    Zerg:"/artwork/zerg-strategy.svg",
    Unknown:"/artwork/unknown-strategy.svg"
  };

  const GOALS=[
    {id:"safe_expand",label:"Expand safely",short:"Secure economy without opening a clear punish window.",glyph:"shield",defaultRisk:"safe",concept:"expansion_permission"},
    {id:"three_base_expand",label:"Get three bases",short:"Build a three-base economy with scouting gates and a fallback.",glyph:"bases",defaultRisk:"balanced",concept:"expansion_permission"},
    {id:"balanced_macro",label:"Balanced macro",short:"Grow economy, production, upgrades, and information together.",glyph:"balance",defaultRisk:"balanced",concept:"opportunity_cost"},
    {id:"early_pressure",label:"Pressure early",short:"Force a response without turning every threat into an all-in.",glyph:"pressure",defaultRisk:"balanced",concept:"army_preservation"},
    {id:"timing_attack",label:"Hit a timing",short:"Synchronize units, upgrades, and movement into one power window.",glyph:"clock",defaultRisk:"balanced",concept:"attack_window"},
    {id:"air_control",label:"Control the air",short:"Buy vision, mobility, harassment, or air superiority.",glyph:"air",defaultRisk:"balanced",concept:"tech_transition"},
    {id:"stable_ground_army",label:"Strong ground army",short:"Build a stable army shape with protection and retreat geometry.",glyph:"anchor",defaultRisk:"safe",concept:"army_preservation"},
    {id:"map_control",label:"Control the map",short:"Use vision, movement, lanes, and pressure to restrict options.",glyph:"map",defaultRisk:"balanced",concept:"map_control"},
    {id:"defensive_macro",label:"Defend and scale",short:"Absorb pressure efficiently, then turn the hold into economy.",glyph:"fortress",defaultRisk:"safe",concept:"attack_window"},
    {id:"surprise",label:"Surprise them",short:"Create an unusual state with a clear extraction and fallback plan.",glyph:"spark",defaultRisk:"greedy",concept:"counter_adaptation"}
  ];

  const RACE={
    Protoss:{
      worker:"Probe",base:"Nexus",supply:"Pylon",opening:"Gateway",gas:"Assimilator",core:"Cybernetics Core",
      air:"Stargate",ground:"Robotics Facility",mobile:"Blink Stalkers",vision:"Observer or hallucinated Phoenix",defense:"Shield Battery and warp-in access",
      color:"#6ceeff"
    },
    Terran:{
      worker:"SCV",base:"Command Center",supply:"Supply Depot",opening:"Barracks",gas:"Refinery",core:"Factory",
      air:"Starport",ground:"Factory/Tank production",mobile:"Bio, Hellion, or Medivac pressure",vision:"Reaper, Scan, Raven, or Viking",defense:"Bunker, Tank line, and rally geometry",
      color:"#ff7652"
    },
    Zerg:{
      worker:"Drone",base:"Hatchery",supply:"Overlord",opening:"Spawning Pool",gas:"Extractor",core:"Lair or composition tech",
      air:"Spire",ground:"Roach Warren, Hydralisk Den, or Lurker path",mobile:"Ling, Roach/Ravager, or Mutalisk pressure",vision:"Overlord, Overseer, Ling, and creep",defense:"Queens, creep warning, and larva reserve",
      color:"#9cf66e"
    }
  };

  const MATCHUPS={
    PvT:{
      thesis:"Protoss should preserve options until Terran reveals how early minerals, gas, and production are being allocated.",
      firstQuestion:"Is Terran expanding normally?",
      secondQuestion:"What capability is Terran buying next: Bio throughput, Factory control, Starport mobility, or another Command Center?",
      stableQuestion:"Can my next Nexus or tech investment survive the earliest credible Terran pressure?",
      threats:["Reaper scouting or pressure","No-natural concentrated production","Factory/Starport harassment","Bio/Tank move-out before the third is protected"],
      scout:"Check the natural, then renew production before the next irreversible economic commitment.",
      capability:"Choose mobility, information, or stable ground splash based on the capability Terran is creating."
    },
    PvZ:{
      thesis:"Protoss decisions should follow what Zerg larva becomes, not merely the number of Hatcheries on screen.",
      firstQuestion:"Is Zerg spending larva on Drones, speed, or immediate units?",
      secondQuestion:"What must Zerg build to defend my first credible threat?",
      stableQuestion:"Can my next Nexus survive the next larva-to-army cycle?",
      threats:["Ling flood or speed pressure","Roach/Ravager timing","Mutalisk or hidden Spire transition","Drone surge that outscales passive Protoss"],
      scout:"Refresh Drone, tech, and army allocation before every large economy or tech commitment.",
      capability:"Choose air information, mobile Gateway pressure, or stable Robo splash based on larva allocation."
    },
    PvP:{
      thesis:"The mirror is a hidden-allocation and local-superiority game where reinforcement geometry changes visible army counts.",
      firstQuestion:"What hidden allocation would make the visible army misleading?",
      secondQuestion:"Where is my local reinforcement advantage?",
      stableQuestion:"Can I widen my defensive footprint without giving away the next local fight?",
      threats:["Proxy or concealed tech","Blink pressure with superior vision","Immortal/Battery timing","Oracle or air information gap"],
      scout:"Resolve hidden tech before committing to a fragile expansion or dive.",
      capability:"Choose Blink geometry, Robo stability, or Oracle information based on the unresolved allocation."
    },
    TvP:{
      thesis:"Terran must identify the next Protoss power spike and make expensive Protoss units defend too much space.",
      firstQuestion:"Is Protoss expanding, compressing Gateway production, or accelerating tech?",
      secondQuestion:"What power spike arrives next?",
      stableQuestion:"Can my next Command Center be protected without giving Protoss a clean timing?",
      threats:["Blink pressure","Oracle or Prism harassment","Colossus/Immortal timing","Fast third into high Gateway throughput"],
      scout:"Use Reaper, Scan, air vision, and movement to refresh tech and production before the next CC or move-out.",
      capability:"Choose mobility, Tank geometry, Raven utility, or Bio throughput based on the Protoss spike."
    },
    TvZ:{
      thesis:"Terran pressure is valuable when it taxes Zerg larva and map freedom without donating the pressure force.",
      firstQuestion:"How much larva can Zerg safely turn into Drones?",
      secondQuestion:"Can this pressure force army larva without taking a bad fight?",
      stableQuestion:"Can my next Command Center finish before Zerg converts the economy into a punish window?",
      threats:["Ling/Bane counterattack","Roach/Ravager timing","Mutalisk map swing","Zerg economy becoming unmanageable"],
      scout:"Read Drone count, tech, creep, and army lanes before every expansion or production shift.",
      capability:"Choose harassment, containment, or stable Bio/Mech geometry based on Zerg's larva response."
    },
    TvT:{
      thesis:"Terran mirror strategy revolves around air information, siege position, and owning the next rotation before it arrives.",
      firstQuestion:"Where is the opponent's first gas and Factory investment going?",
      secondQuestion:"Where will the next Tank line establish?",
      stableQuestion:"Can my next Command Center be reinforced without losing the air or siege-information war?",
      threats:["Reaper/Hellion pressure","Tank/Raven timing","Air-control snowball","Containment of the next expansion"],
      scout:"Refresh Tank position, Starport count, and expansion state before crossing a siege lane.",
      capability:"Choose air vision, mobile pressure, or Tank-supported containment based on where the next line will form."
    },
    ZvP:{
      thesis:"Zerg must identify the exact Protoss power spike early enough to allocate larva before it arrives.",
      firstQuestion:"What exact Protoss spike is being purchased?",
      secondQuestion:"How many larva may safely become Drones before that spike?",
      stableQuestion:"Will my next Hatchery or Drone cycle survive the incoming composition?",
      threats:["Adept/Gateway pressure","Oracle or air control","Immortal/Archon timing","Fast Protoss third into production"],
      scout:"Use Overlord, Ling, Overseer, and creep information to classify the spike before spending the larva cycle.",
      capability:"Choose economy, immediate army, or composition tech from the verified Protoss investment."
    },
    ZvT:{
      thesis:"Zerg's central question is what Terran's next production cycles can create and how much larva remains safe for Drones.",
      firstQuestion:"What is Terran buying in the next production cycles?",
      secondQuestion:"Is the next Terran move pressure, harassment, economy, or a tech transition?",
      stableQuestion:"Can my next Drone or Hatchery cycle finish before the push reaches me?",
      threats:["Hellion pressure","Bio/Tank timing","Mine or air harassment","Fast third into high Terran throughput"],
      scout:"Refresh production and movement before every major Drone cycle.",
      capability:"Choose larva economy, Ling/Bane mobility, Roach safety, or later Lurker control from the production read."
    },
    ZvZ:{
      thesis:"Zerg mirror strategy depends on whether the opponent's most recent larva cycle became Drones or army.",
      firstQuestion:"Did the last larva cycle become Drones or fighting units?",
      secondQuestion:"Where does local reinforcement speed favor a fight?",
      stableQuestion:"Can my next Drone cycle survive the opponent's next larva conversion?",
      threats:["Ling flood","Baneling volatility","Roach timing","Hidden worker lead behind defensive units"],
      scout:"Use Overlords, Lings, and unit counts to update larva allocation continuously.",
      capability:"Choose Drone growth, immediate units, or Roach stability based on the hidden allocation."
    }
  };

  const SIGNALS=[
    {id:"reaper",label:"Reaper",short:"Reaper seen",tip:"A Reaper is common scouting/pressure evidence. It does not by itself prove an all-in.",ttl:55,voice:["reaper","reaper seen","they have a reaper"]},
    {id:"normal_natural",label:"Normal natural",short:"Natural confirmed",tip:"Confirms an economic floor, but does not prove production is harmless.",ttl:70,voice:["natural","normal natural","natural confirmed","they expanded"]},
    {id:"no_natural",label:"No natural",short:"No natural",tip:"Raises the risk of concentrated aggression or hidden tech. Re-scout before greed.",ttl:55,voice:["no natural","no expansion","one base"]},
    {id:"fast_third",label:"Fast third",short:"Fast third",tip:"Economic investment can create a window to match economy or pressure exposed territory.",ttl:80,voice:["fast third","third command center","three bases"]},
    {id:"extra_production",label:"Extra production",short:"Production spike",tip:"More production compresses the time available for economy to pay back.",ttl:55,voice:["extra production","more production","two barracks","three barracks","four barracks","extra gateways"]},
    {id:"factory",label:"Factory",short:"Factory seen",tip:"Factory evidence changes the plausible pressure, control, and harassment set.",ttl:70,voice:["factory","factory seen"]},
    {id:"starport",label:"Starport",short:"Starport seen",tip:"Starport evidence raises mobility and harassment questions. Confirm the actual use before over-countering.",ttl:70,voice:["starport","starport seen","air tech"]},
    {id:"move_out",label:"Move-out",short:"Move-out confirmed",tip:"A confirmed move-out is immediate timing evidence and should override luxury spending.",ttl:35,voice:["move out","moving out","army coming","attack coming"]},
    {id:"turtle",label:"Turtle",short:"Static defense",tip:"Static defense protects locations but often concedes map space and economic permission elsewhere.",ttl:80,voice:["turtle","turtling","lots of defense"]},
    {id:"hidden_tech",label:"Hidden tech",short:"Information gap",tip:"Missing information is itself a strategic risk before irreversible spending.",ttl:50,voice:["hidden tech","can't see tech","unknown tech"]}
  ];

  const BASE_OPENINGS={
    Protoss:[
      {id:"workers",start:0,end:25,action:"Probes continuously",purpose:"Protect the income engine and keep options open.",phase:"Opening",concept:"opportunity_cost"},
      {id:"supply",start:28,end:38,action:"Pylon",purpose:"Power the opening and stay ahead of supply.",phase:"Opening",concept:"build_consistency"},
      {id:"opening",start:48,end:64,action:"Gateway",purpose:"Open the first unit, scouting, and tech channel.",phase:"Opening",concept:"production_scouting"},
      {id:"gas",start:64,end:82,action:"Assimilator",purpose:"Fund Cybernetics and the capability you eventually choose.",phase:"Opening",concept:"opportunity_cost"},
      {id:"natural",start:88,end:120,action:"Natural Nexus if the opening read permits",purpose:"Convert a safe opening into economy without ignoring the first attack window.",phase:"Expand",concept:"expansion_permission"},
      {id:"core",start:112,end:138,action:"Cybernetics Core",purpose:"Unlock reliable scouting and advanced unit paths.",phase:"Tech",concept:"production_scouting"}
    ],
    Terran:[
      {id:"workers",start:0,end:25,action:"SCVs continuously",purpose:"Protect the income engine and all later production choices.",phase:"Opening",concept:"opportunity_cost"},
      {id:"supply",start:28,end:38,action:"Supply Depot",purpose:"Stay ahead of supply and establish wall geometry.",phase:"Opening",concept:"build_consistency"},
      {id:"opening",start:44,end:60,action:"Barracks + Refinery",purpose:"Open Reaper scouting, units, and tech.",phase:"Opening",concept:"production_scouting"},
      {id:"orbital",start:92,end:118,action:"Orbital + first scout unit",purpose:"Turn the opening into information and income.",phase:"Scout",concept:"production_scouting"},
      {id:"natural",start:125,end:170,action:"Command Center if the attack window is understood",purpose:"Use the current 300-mineral Command Center without ignoring near-term pressure.",phase:"Expand",concept:"expansion_permission"},
      {id:"factory",start:175,end:220,action:"Factory or additional production by plan",purpose:"Purchase the capability the matchup actually requires.",phase:"Tech",concept:"tech_transition"}
    ],
    Zerg:[
      {id:"workers",start:0,end:25,action:"Drones continuously",purpose:"Build economic and larva optionality.",phase:"Opening",concept:"opportunity_cost"},
      {id:"supply",start:28,end:40,action:"Overlord",purpose:"Preserve supply and scouting access.",phase:"Opening",concept:"build_consistency"},
      {id:"natural",start:65,end:84,action:"Natural Hatchery",purpose:"Add larva, economy, and defensive depth.",phase:"Expand",concept:"expansion_permission"},
      {id:"opening",start:88,end:108,action:"Spawning Pool",purpose:"Unlock Queens, Lings, and safety.",phase:"Opening",concept:"attack_window"},
      {id:"queens",start:130,end:170,action:"Queens + first scouting units",purpose:"Inject, warn, and classify the first threat.",phase:"Scout",concept:"production_scouting"},
      {id:"third",start:175,end:225,action:"Third Hatchery if the larva/attack read permits",purpose:"Convert a safe cycle into compounding larva and economy.",phase:"Expand",concept:"expansion_permission"}
    ]
  };

  const GOAL_PHASES={
    safe_expand:(r)=>[
      {id:"goal-scout",start:155,end:215,action:`Use ${r.vision} to renew the threat read`,purpose:"A safe expansion is a decision made from fresh information.",phase:"Scout",concept:"information_expiration"},
      {id:"goal-production",start:205,end:275,action:"Add immediate production or defense before greed",purpose:"Buy enough present power to protect the economic investment.",phase:"Protect",concept:"opportunity_cost"},
      {id:"goal-expand",start:265,end:345,action:`Secure the next ${r.base}`,purpose:"Expand only after warning, army coverage, and reinforcement access are credible.",phase:"Expand",concept:"expansion_permission"}
    ],
    three_base_expand:(r)=>[
      {id:"goal-scout",start:150,end:215,action:`Create a fresh information window with ${r.vision}`,purpose:"The third-base branch depends on an updated production and attack read.",phase:"Scout",concept:"production_scouting"},
      {id:"goal-screen",start:205,end:285,action:`Create a credible screen with ${r.mobile}`,purpose:"Pressure attention and movement without donating the force.",phase:"Screen",concept:"army_preservation"},
      {id:"goal-expand",start:275,end:365,action:`Establish the third ${r.base}`,purpose:"Spend the information and displacement window on future economy.",phase:"Expand",concept:"expansion_permission"},
      {id:"goal-protect",start:330,end:430,action:`Protect it with ${r.defense}`,purpose:"The expansion is incomplete until warning and reinforcements can reach it.",phase:"Protect",concept:"reinforcement_geometry"}
    ],
    balanced_macro:(r)=>[
      {id:"goal-scout",start:155,end:220,action:`Renew information with ${r.vision}`,purpose:"Macro remains balanced only if the next opponent investment is understood.",phase:"Scout",concept:"information_expiration"},
      {id:"goal-production",start:210,end:300,action:"Add production and the first relevant upgrade",purpose:"Convert income into repeatable power rather than banking resources.",phase:"Production",concept:"opportunity_cost"},
      {id:"goal-expand",start:285,end:390,action:`Add the next ${r.base} when the punish window is covered`,purpose:"Compound only when current army and future economy can coexist.",phase:"Expand",concept:"expansion_permission"}
    ],
    early_pressure:(r)=>[
      {id:"goal-production",start:145,end:220,action:`Increase mobile unit throughput for ${r.mobile}`,purpose:"A credible threat must be large enough to force a response.",phase:"Production",concept:"attack_window"},
      {id:"goal-scout",start:190,end:250,action:"Scout the defensive allocation before committing",purpose:"Attack the weakest response, not the most dramatic target.",phase:"Scout",concept:"production_scouting"},
      {id:"goal-pressure",start:235,end:330,action:"Show pressure, force movement, then disengage alive",purpose:"Attention, information, and displacement can be the payoff even without kills.",phase:"Pressure",concept:"army_preservation"}
    ],
    timing_attack:(r)=>[
      {id:"goal-tech",start:155,end:245,action:"Start the upgrade or tech that defines the power window",purpose:"The timing exists because several advantages complete together.",phase:"Tech",concept:"attack_window"},
      {id:"goal-production",start:220,end:315,action:"Synchronize production and reinforcements",purpose:"Units arriving late are not part of the timing.",phase:"Production",concept:"reinforcement_geometry"},
      {id:"goal-move",start:300,end:410,action:"Move before the opponent's next answer completes",purpose:"A timing loses value as counters, economy, and defensive geometry mature.",phase:"Attack",concept:"attack_window"}
    ],
    air_control:(r)=>[
      {id:"goal-air",start:155,end:245,action:`Begin ${r.air}`,purpose:"Buy air information, mobility, or superiority—define which one before overproducing.",phase:"Tech",concept:"tech_transition"},
      {id:"goal-scout",start:225,end:310,action:"Use the first air cycle to reveal tech and movement",purpose:"Air control earns value through information and positional freedom, not idle unit count.",phase:"Scout",concept:"production_scouting"},
      {id:"goal-transition",start:295,end:410,action:"Add the minimum ground or economy layer the new information supports",purpose:"Do not over-counter a branch the opponent has not actually purchased.",phase:"Adapt",concept:"counter_adaptation"}
    ],
    stable_ground_army:(r)=>[
      {id:"goal-ground",start:155,end:255,action:`Build ${r.ground}`,purpose:"Purchase a stable fighting shape rather than a collection of disconnected units.",phase:"Tech",concept:"army_preservation"},
      {id:"goal-body",start:225,end:335,action:"Add body units, vision, and retreat space",purpose:"Expensive ground power needs protection and a way to leave bad fights.",phase:"Protect",concept:"reinforcement_geometry"},
      {id:"goal-control",start:315,end:430,action:"Claim a defensible lane and force the opponent to approach badly",purpose:"Stable ground armies create value through geometry before combat starts.",phase:"Control",concept:"map_control"}
    ],
    map_control:(r)=>[
      {id:"goal-vision",start:145,end:220,action:`Expand vision with ${r.vision}`,purpose:"Map control begins with knowing which lanes are safe and which are contested.",phase:"Scout",concept:"map_control"},
      {id:"goal-mobile",start:205,end:310,action:`Project ${r.mobile} onto edges and transit lanes`,purpose:"Threaten movement without becoming trapped in static defense.",phase:"Control",concept:"army_preservation"},
      {id:"goal-economy",start:285,end:410,action:`Take the next ${r.base} behind controlled space`,purpose:"Territory matters because it protects economy, reinforcements, and future choices.",phase:"Expand",concept:"expansion_permission"}
    ],
    defensive_macro:(r)=>[
      {id:"goal-read",start:140,end:210,action:"Identify the earliest credible attack and its arrival route",purpose:"Defense is efficient only when it answers the real threat rather than every possible threat.",phase:"Scout",concept:"attack_window"},
      {id:"goal-defend",start:195,end:310,action:`Build compact defense with ${r.defense}`,purpose:"Create time and reinforcement efficiency without freezing the economy forever.",phase:"Defend",concept:"reinforcement_geometry"},
      {id:"goal-scale",start:300,end:420,action:`Add the next ${r.base} after the threat is actually broken`,purpose:"The reward for an efficient hold is the right to scale.",phase:"Expand",concept:"expansion_permission"}
    ],
    surprise:(r)=>[
      {id:"goal-shell",start:135,end:210,action:"Show a believable standard opening shell",purpose:"Surprise works only while the opponent's model remains wrong.",phase:"Mask",concept:"deception"},
      {id:"goal-hide",start:185,end:290,action:`Conceal or accelerate ${r.air} / ${r.ground}`,purpose:"The hidden investment must arrive before the cheap counter becomes available.",phase:"Hide",concept:"deception"},
      {id:"goal-hit",start:275,end:390,action:"Strike the neglected layer, then extract surviving tech",purpose:"A surprise is a temporary information advantage, not permission to stay all-in forever.",phase:"Attack",concept:"counter_adaptation"}
    ]
  };

  function matchupKey(selfRace,opponentRace){
    const code=r=>r==="Protoss"?"P":r==="Terran"?"T":r==="Zerg"?"Z":"?";
    return `${code(selfRace)}v${code(opponentRace)}`;
  }

  function cloneWindows(rows,shift=0){return rows.map(x=>({...x,start:Math.max(0,x.start+shift),end:Math.max(0,x.end+shift)}))}

  function pvtThreeBasePlan(risk){
    const r=RACE.Protoss;
    const shifts={safe:45,balanced:0,greedy:-22};
    const titles={safe:"Defensive Bridge into Third",balanced:"Information-First Triple Nexus",greedy:"Fast Triple Nexus"};
    const verdicts={safe:"supported",balanced:"supported_with_conditions",greedy:"supported_with_conditions"};
    const stories={
      safe:"Build enough early production and information to absorb common Terran pressure, then add the third after the attack window is better understood.",
      balanced:"Use early Gateway units to buy information and time. If Terran remains economically normal, convert that window into a third Nexus and protect the wider footprint.",
      greedy:"Use a lean Gateway shell and rapid information to establish the third before heavy production. The upside is large, but stale or missing information is dangerous."
    };
    const base=cloneWindows(BASE_OPENINGS.Protoss,risk==="greedy"?-3:risk==="safe"?5:0);
    const goal=cloneWindows(GOAL_PHASES.three_base_expand(r),shifts[risk]);
    if(risk==="safe")goal[0].action="Add immediate Gateway/Robo safety, then renew production";
    if(risk==="greedy")goal[1].action="Keep a small mobile screen alive; do not trade it";
    return {
      id:`pvt-three-base-${risk}`,title:titles[risk],risk,goal:"three_base_expand",matchup:"PvT",verdict:verdicts[risk],
      story:stories[risk],
      why:"The plan treats the third Nexus as future power purchased with a temporary reduction in immediate army. Scouting and a surviving mobile screen protect that investment.",
      capabilities:["early_information","mobile_screen","economic_compounding"],
      assumptions:[
        {id:"terran_economic_floor",label:"Terran has a normal economic floor",detail:"A natural or equivalent economic commitment is confirmed.",required:true},
        {id:"production_read",label:"Terran production is recently understood",detail:"The read is fresh enough to judge the next attack window.",required:true},
        {id:"screen_survives",label:"The first Gateway force remains alive",detail:"The screen buys information, drop response, and time; it is not disposable damage.",required:true},
        {id:"reinforcement_access",label:"The third can receive reinforcements",detail:"Pylon, warp-in, rally, and retreat geometry are prepared.",required:true,manual:true}
      ],
      threats:[
        {id:"reaper",label:"Reaper scouting/pressure",detail:"A Reaper is a common early information and pressure tool. Confirm the follow-up before calling it a rush."},
        {id:"no_natural",label:"No-natural production",detail:"Concentrated aggression can punish the temporary army deficit created by a fast third."},
        {id:"factory_starport",label:"Factory/Starport harassment",detail:"Mines, drops, or air mobility can stretch the wider defensive footprint."},
        {id:"move_out",label:"Early Bio/Tank move-out",detail:"A move-out before reinforcement access can close the fast-third branch."}
      ],
      scouting:[
        {from:70,to:135,question:"Is Terran expanding normally?",purpose:"Separate ordinary Reaper-expand pressure from concentrated one-base investment.",concept:"production_scouting"},
        {from:150,to:225,question:"What follows the Reaper: economy, extra Barracks, Factory, or Starport?",purpose:"The follow-up determines how much immediate safety the third needs.",concept:"production_scouting"},
        {from:225,to:330,question:"Has production increased or an army moved out before the third commitment?",purpose:"Refresh the attack window immediately before the largest economic spend.",concept:"information_expiration"}
      ],
      buildWindows:[...base,...goal],
      branchRules:[
        {id:"pvt-moveout",priority:100,when:{any:["move_out"]},status:"hold",question:"Where will the push arrive, and can your army meet it before the third?",action:"Hold the third. Add units and defensive geometry now.",reason:"A confirmed move-out is immediate timing evidence; survival outranks the economic script.",voice:"Hold third. Units now. Defend first.",fallback:"pvt-three-base-safe"},
        {id:"pvt-no-natural",priority:95,when:{any:["no_natural"]},status:"abort",question:"What is Terran spending the missing Command Center resources on?",action:"Abort the fast third and load the defensive two-base bridge.",reason:"The plan assumed a normal Terran economic floor. That assumption is no longer supported.",voice:"No natural. Cancel fast third. Defend.",fallback:"pvt-three-base-safe"},
        {id:"pvt-production",priority:85,when:{any:["extra_production"]},status:"modify",question:"Is the increased production crossing the map or protecting Terran economy?",action:"Delay the third window and add immediate unit throughput.",reason:"Your long-term goal remains valid, but the fast implementation has less safety margin.",voice:"Delay third. Add units. Re-scout movement.",fallback:"pvt-three-base-safe"},
        {id:"pvt-hidden",priority:75,when:{any:["hidden_tech"]},status:"hold",question:"Which missing tech fact could invalidate the third?",action:"Hold irreversible spending until the tech gap is renewed.",reason:"Unknown tech is a decision risk, not evidence of safety.",voice:"Tech unknown. Scout before third."},
        {id:"pvt-starport",priority:65,when:{any:["starport"]},status:"modify",question:"Is the Starport producing harassment, information, or support?",action:"Keep the third plan, but prepare detection and mineral-line coverage.",reason:"Starport mobility attacks the wider defensive footprint created by three bases.",voice:"Starport seen. Cover harassment. Keep scouting."},
        {id:"pvt-factory",priority:60,when:{any:["factory"]},status:"continue",question:"Is the Factory buying control, harassment, or a push?",action:"Continue the plan while preserving the first mobile units.",reason:"Factory evidence narrows the threat set but does not by itself invalidate economy.",voice:"Factory seen. Preserve units. Check follow-up."},
        {id:"pvt-fast-third",priority:55,when:{any:["fast_third"]},status:"continue",question:"How will Terran protect the wider third-base footprint?",action:"Continue your third and pressure exposed territory without diving the main.",reason:"Terran has also purchased future economy, increasing the value of map pressure and your own scaling.",voice:"Fast third. Continue economy. Pressure edges."},
        {id:"pvt-reaper",priority:40,when:{any:["reaper"]},status:"continue",question:"What follows the Reaper: natural, production, Factory, or Starport?",action:"Preserve the first unit and confirm the natural.",reason:"A Reaper is information and pressure, not automatic proof of a rush.",voice:"Reaper seen. Confirm the natural."}
      ],
      source:{kind:"MBMapps rules-driven synthesis",patch:PATCH,confidence:risk==="greedy"?"reviewed framework":"reviewed framework",note:"Timing windows are tolerant coaching benchmarks, not execution proof."}
    };
  }

  function genericPlan(request,risk){
    const self=RACE[request.selfRace]||RACE.Protoss;
    const key=matchupKey(request.selfRace,request.opponentRace);
    const matchup=MATCHUPS[key]||{
      thesis:"Preserve options until the opponent race and first strategic investment are known.",
      firstQuestion:"What is the opponent's race and economic posture?",secondQuestion:"What changed?",stableQuestion:"What information is missing?",threats:["Unknown opponent"],scout:"Identify the opponent before irreversible commitment.",capability:"Keep the opening flexible."
    };
    const goal=GOALS.find(x=>x.id===request.goal)||GOALS[0];
    const riskShift=risk==="safe"?38:risk==="greedy"?-20:0;
    const titlePrefix=risk==="safe"?"Safe":risk==="greedy"?"Accelerated":"Information-First";
    const goalRows=GOAL_PHASES[goal.id]?GOAL_PHASES[goal.id](self):GOAL_PHASES.balanced_macro(self);
    const statusForPressure=["safe_expand","three_base_expand","balanced_macro","air_control","map_control"].includes(goal.id)?"modify":"continue";
    return {
      id:`${key.toLowerCase()}-${goal.id}-${risk}`,
      title:`${titlePrefix} ${goal.label}`,
      risk,goal:goal.id,matchup:key,verdict:request.opponentRace==="Unknown"?"supported_with_conditions":"supported_with_conditions",
      story:`${matchup.thesis} Your objective is ${goal.label.toLowerCase()}; the build preserves that intent while using scouting to decide whether the current implementation stays legal.`,
      why:goal.short,
      capabilities:[goal.concept,"fresh_information","fallback_preserves_intent"],
      assumptions:[
        {id:"opponent_identified",label:"Opponent race and opening posture are known",detail:"Unknown information lowers confidence and keeps the opening flexible.",required:true},
        {id:"threat_read",label:"The near-term punish window is understood",detail:"A large economic or tech investment needs a recent threat read.",required:true},
        {id:"execution_capacity",label:"The plan fits current mechanics and attention",detail:"A theoretically strong plan is not useful if it creates too many simultaneous obligations.",required:true}
      ],
      threats:matchup.threats.map((x,i)=>({id:`threat-${i}`,label:x,detail:"This threat is a documented strategic possibility, not a claim that the opponent selected it."})),
      scouting:[
        {from:60,to:145,question:matchup.firstQuestion,purpose:matchup.scout,concept:"production_scouting"},
        {from:145,to:275,question:matchup.secondQuestion,purpose:"Use the answer to choose the missing capability rather than a favorite tech label.",concept:"tech_transition"},
        {from:260,to:420,question:matchup.stableQuestion,purpose:"Refresh information before the next irreversible commitment.",concept:"information_expiration"}
      ],
      buildWindows:[...cloneWindows(BASE_OPENINGS[request.selfRace]||BASE_OPENINGS.Protoss,risk==="safe"?5:risk==="greedy"?-4:0),...cloneWindows(goalRows,riskShift)],
      branchRules:[
        {id:"generic-moveout",priority:100,when:{any:["move_out"]},status:"hold",question:"What must survive the incoming timing?",action:"Stop luxury spending and establish defensive geometry.",reason:"A confirmed move-out is more important than the original schedule.",voice:"Move-out. Defend now. Preserve core units."},
        {id:"generic-no-natural",priority:95,when:{any:["no_natural"]},status:"abort",question:"What immediate power replaces the missing expansion?",action:"Abort exposed greed and load the safer implementation.",reason:"The economic assumption supporting the plan is no longer confirmed.",voice:"No natural. Use the safer plan.",fallback:"safer"},
        {id:"generic-production",priority:85,when:{any:["extra_production"]},status:statusForPressure,question:"Is the production preparing an attack or protecting economy?",action:statusForPressure==="modify"?"Delay the next luxury investment and add immediate power.":"Continue pressure while preserving retreat geometry.",reason:"Increased production reduces the time available for slow investments to pay back.",voice:"Production increased. Recheck the attack window."},
        {id:"generic-hidden",priority:75,when:{any:["hidden_tech"]},status:"hold",question:"Which missing tech fact changes the next decision?",action:"Scout before the next irreversible commitment.",reason:"An information gap should reduce confidence, not be silently treated as safety.",voice:"Tech unknown. Scout before committing."},
        {id:"generic-fast-third",priority:55,when:{any:["fast_third"]},status:"continue",question:"How can you exploit the wider economic footprint without donating units?",action:"Continue the plan and pressure exposed lanes or match economy.",reason:"Opponent economy can create permission to scale or attack territory rather than the defended main.",voice:"Fast third. Continue and pressure edges."},
        {id:"generic-turtle",priority:50,when:{any:["turtle"]},status:"continue",question:"What map space has static defense conceded?",action:"Take territory, economy, or tech instead of feeding the fortress.",reason:"Static defense protects a location, not the entire map.",voice:"Turtle confirmed. Take the map."}
      ],
      source:{kind:"MBMapps rules-driven matchup framework",patch:PATCH,confidence:"framework",note:"Use as a strategic policy with broad windows; no global win rate is claimed."}
    };
  }

  function candidates(request){
    if(request.selfRace==="Protoss"&&request.opponentRace==="Terran"&&request.goal==="three_base_expand"){
      return [pvtThreeBasePlan("safe"),pvtThreeBasePlan("balanced"),pvtThreeBasePlan("greedy")];
    }
    return RISKS.map(risk=>genericPlan(request,risk));
  }

  function getGoal(id){return GOALS.find(x=>x.id===id)||GOALS[0]}
  function getMatchup(selfRace,opponentRace){return MATCHUPS[matchupKey(selfRace,opponentRace)]||null}
  function getSignal(id){return SIGNALS.find(x=>x.id===id)||null}
  function artFor(race){return ART[race]||ART.Unknown}

  window.SC2StrategyCompilerData={
    PATCH,DATA_VERSION,RACES,RISKS,COACH_STYLES,ART,GOALS,RACE,MATCHUPS,SIGNALS,
    matchupKey,candidates,getGoal,getMatchup,getSignal,artFor
  };
})();
