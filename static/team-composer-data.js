(function(){
  "use strict";

  const PATCH="5.0.16b";
  const MAPS=["Unknown","Fields of Death CE","Gemgarden LE","New Bed of Chaos LE","Reclamation LE","Rhoskallian LE","Rust Bucket LE","Sludge City","Undercurrent LE","Yellowjacket"];
  const RACES=["Unknown","Protoss","Terran","Zerg"];

  const RACE={
    Protoss:{
      worker:"Probe",base:"Nexus",supply:"Pylon",first:"Gateway",gas:"Assimilator",
      strengths:{Screen:2,Anchor:3,Scout:2,Harasser:2,Expander:3,Closer:3},
      language:{
        Screen:"mobile Stalkers/Adepts and warp-in threat",Anchor:"Robo/Colossus/Immortal ground stability",Scout:"Observer, Oracle, hallucination and edge vision",Harasser:"Blink, Oracle or Prism pressure",Expander:"Nexus growth backed by Pylon/warp reinforcement",Closer:"splash, upgrades and preserved expensive tech"
      }
    },
    Terran:{
      worker:"SCV",base:"Command Center",supply:"Supply Depot",first:"Barracks",gas:"Refinery",
      strengths:{Screen:3,Anchor:3,Scout:2,Harasser:3,Expander:3,Closer:3},
      language:{
        Screen:"Bio/Hellion/Reaper pressure that forces rotations",Anchor:"Tank-supported ground control",Scout:"Reaper, Raven, Viking and Scan information",Harasser:"Medivac, Mine, Hellion or air harassment",Expander:"Command Center growth behind pressure and lane control",Closer:"Bio/Tank/Ghost or air-supported finishing power"
      }
    },
    Zerg:{
      worker:"Drone",base:"Hatchery",supply:"Overlord",first:"Spawning Pool",gas:"Extractor",
      strengths:{Screen:3,Anchor:2,Scout:3,Harasser:3,Expander:3,Closer:3},
      language:{
        Screen:"Ling/Roach movement that taxes attention and larva",Anchor:"Roach/Ravager/Lurker or Queen-supported ground mass",Scout:"Overlord, Ling, Overseer and creep information",Harasser:"run-bys, Mutalisks or Nydus-style pressure",Expander:"Hatchery/Drone growth protected by creep and warning time",Closer:"Lurker, Hive or overwhelming remax capability"
      }
    }
  };

  const A=[
    {id:"shield-scale",title:"Shield & Scale",subtitle:"Safe macro · survive first, compound second",base:94,robustness:"Very high",mechanics:"Low",surprise:"Low",coord:"Low",roles:[["Anchor","Expander"],["Scout","Anchor"]],story:"Both players preserve a defensive spine, share scouting responsibility, and refuse low-value fights while two economies mature. The first objective is not damage; it is to make the opponents prove they can punish the scaling before you buy more economy.",scout:"What is the earliest combined attack that can reach either player?",abort:"One opponent has sacrificed economy for a concentrated early attack.",rhythm:["Establish safe openings","Identify both enemy races and first tech","Cover the weaker ally while adding economy","Add production before the first combined timing","Take the first favorable fight together","Compound the surviving economy"]},
    {id:"false-front",title:"The False Front",subtitle:"One pressures · one expands",base:96,robustness:"High",mechanics:"Medium",surprise:"Medium",coord:"Medium",roles:[["Screen","Harasser"],["Expander","Anchor"]],story:"One player shows a credible threat on one side of the battlefield. The opponents rotate units and attention to respect it. The partner spends that displacement window on a new expansion, reinforcement access, and the army needed to survive the counterattack. Damage is optional; time and movement are the real prize.",scout:"Can the opponents counterattack before the new expansion has reinforcement support?",abort:"The pressure player cannot disengage safely or the opponents are already moving across the map together.",rhythm:["Open without revealing the full plan","Scout the opponents' defensive allocation","Pressure player shows a believable threat","Expansion player spends the rotation window","Pressure force disengages alive","Team collapses home for the counterattack"]},
    {id:"hammer-anvil",title:"Hammer & Anvil",subtitle:"Coordinated timing · fix then collapse",base:91,robustness:"Medium",mechanics:"Medium",surprise:"Medium",coord:"High",roles:[["Screen","Anchor"],["Closer","Harasser"]],story:"The anvil fixes the enemy army in a place it cannot comfortably abandon. The hammer approaches from a second lane or timing window. The goal is not two independent attacks; it is to make the same enemy army answer incompatible problems at once.",scout:"Where will the enemy army be forced to stand when both allied forces arrive?",abort:"Your armies cannot arrive within the same timing window or one opponent has a decisive defensive power spike.",rhythm:["Build compatible early armies","Share the first complete tech read","Anvil takes visible space","Hammer moves through the second lane","Commit only when both forces can connect","Disengage if the enemy retains one clean defensive arc"]},
    {id:"lantern-blade",title:"Lantern & Blade",subtitle:"One sees · one kills",base:90,robustness:"High",mechanics:"Medium",surprise:"Medium",coord:"Medium",roles:[["Scout","Harasser"],["Closer","Anchor"]],story:"One player spends mobility and attention to keep enemy tech, movement, and weak points visible. The partner concentrates resources into the composition that exploits those reads. The scout does not need to win fights; the scout makes the blade's fights unfair.",scout:"What expensive enemy choice can one ally reveal early enough for the other ally to punish?",abort:"The information player is losing core units for scouting or both allies duplicate the same expensive counter.",rhythm:["Preserve flexible openings","Assign one player primary information duty","Reveal tech and movement repeatedly","Blade player commits to the minimum correct answer","Use vision to choose the engagement","Transition before the enemy counter-counter completes"]},
    {id:"fortress-flank",title:"Fortress & Flank",subtitle:"Ground anchor · mobile second army",base:89,robustness:"High",mechanics:"Medium",surprise:"Low",coord:"Medium",roles:[["Anchor","Closer"],["Harasser","Screen"]],story:"One army becomes the stable front the opponents cannot walk through cheaply. The second army refuses to stack behind it; it attacks edges, reinforcements, drops, run-bys, or exposed expansions. The fortress creates certainty while the flank converts that certainty into map pressure.",scout:"Can the opponents bypass the anchor or isolate the mobile ally?",abort:"The anchor lacks vision/retreat geometry or the mobile force is too small to create a credible second problem.",rhythm:["Build a durable front and a mobile complement","Scout bypass routes and air threats","Anchor claims the safe central geometry","Mobile ally threatens edges and reinforcements","Expand behind controlled space","Converge only for a high-value fight"]},
    {id:"hidden-hand",title:"The Hidden Hand",subtitle:"Fast tech · concealed payoff",base:82,robustness:"Medium",mechanics:"High",surprise:"Very high",coord:"Medium",roles:[["Screen","Scout"],["Closer","Harasser"]],story:"One ally behaves conventionally and absorbs the opponents' scouting attention. The second ally invests in a concealed or accelerated tech payoff. The disguise matters only if the tech arrives before the opponents can cheaply adapt, so the screen must create believable normalcy without dying for the secret.",scout:"Have the opponents seen the tech, or are they still spending as if the game is normal?",abort:"The tech is revealed early, the opponents are all-in, or the screen player cannot survive the investment period.",rhythm:["Show a normal opening shell","Hide the expensive commitment","Use the screen to deny clean scouting","Hit before the cheap counter is ready","Take damage only if the payoff is decisive","Transition immediately if surprise is lost"]},
    {id:"hold-door",title:"Hold the Door",subtitle:"Anti-rush · absorb then counter",base:93,robustness:"Very high",mechanics:"Low",surprise:"Low",coord:"Low",roles:[["Anchor","Scout"],["Anchor","Closer"]],story:"The team assumes nothing. Early warning, compact reinforcement paths, and shared defensive geometry are prioritized until both enemy economies are confirmed. If the opponents over-invest in aggression, the defense becomes the economic advantage and the counterattack begins only after the rush has actually broken.",scout:"Which opponent is cutting economy, and where will their armies combine?",abort:"Both opponents are clearly macroing; staying over-defensive would donate the economic initiative.",rhythm:["Scout both enemies early","Keep defensive production compact","Defend the threatened ally together","Do not chase after the first hold","Confirm the rush is over","Counter or expand from the resource advantage"]},
    {id:"siege-harvest",title:"Siege & Harvest",subtitle:"Contain exits · partner compounds",base:92,robustness:"High",mechanics:"Medium",surprise:"Medium",coord:"Medium",roles:[["Screen","Anchor"],["Expander","Closer"]],story:"The containment player attacks roads, ramps, air lanes, creep edges, and reinforcement paths rather than the defended heart of the enemy base. The partner treats that restricted movement as economic permission. The contain succeeds when the enemy must spend to escape while your team spends to grow.",scout:"Can the opponents break the contain with one coordinated move before the partner's economy pays back?",abort:"The contain requires trading into static defense or the expanding ally cannot reinforce the containment player.",rhythm:["Create an army that can hold a lane","Identify the opponents' easiest breakout route","Contain movement rather than diving bases","Partner adds expansion and production","Force expensive attempts to regain map access","Collapse together when the economic lead is real"]},
    {id:"two-doors",title:"Two Doors",subtitle:"Multi-prong · divide the response",base:87,robustness:"Medium",mechanics:"High",surprise:"High",coord:"High",roles:[["Harasser","Screen"],["Harasser","Scout"]],story:"Both allies threaten different doors at nearly the same time. Neither force must win alone. The plan works when the opponents split a concentrated army, expose reinforcements, or reveal which base they are willing to abandon. Your advantage is the decision tree you force onto them.",scout:"Which opponent army is responsible for which door, and how quickly can they rotate?",abort:"The two allied threats are too far apart in time or one force can be trapped before the other becomes credible.",rhythm:["Build two mobile threat channels","Scout rotation paths","Show the first threat without overcommitting","Second threat appears before the response resets","Take the weaker target, not the most dramatic target","Leave before the divided armies recombine"]},
    {id:"wild-card",title:"The Wild Card",subtitle:"High-risk surprise · maximum learning",base:76,robustness:"Low",mechanics:"High",surprise:"Very high",coord:"High",roles:[["Harasser","Scout"],["Closer","Screen"]],story:"The team deliberately creates an unusual game state: transport play, hidden tech, extreme mobility, proxy pressure, Nydus-style access, or another asymmetric route. The objective is to exploit expectation and learn from a state opponents rarely practice—not to pretend the strategy is universally safe.",scout:"What standard assumption are the opponents relying on that this plan can violate?",abort:"The surprise is fully identified before payoff or the team lacks the mechanics to retreat into a normal game.",rhythm:["Preserve a believable standard shell","Create the asymmetric access point","Confirm the opponents still believe the standard story","Strike the neglected layer","Extract value and preserve surviving tech","Transition into the strongest normal follow-up"]}
  ];

  function race(r){return RACE[r]||RACE.Protoss}
  function roleFit(r,roles){const x=race(r);return roles.reduce((n,k)=>n+(x.strengths[k]||1),0)}
  function roleLanguage(r,roles){const x=race(r);return roles.map(k=>x.language[k]||k).join(" + ")}
  function unknownCount(ctx){return [ctx.enemy1,ctx.enemy2].filter(x=>x==="Unknown").length}
  function difficultyPenalty(level,mechanics){
    if(!level)return 0;
    const low=/Bronze|Silver/i.test(level),mid=/Gold|Platinum/i.test(level);
    if(mechanics==="High")return low?-8:mid?-3:0;
    if(mechanics==="Medium")return low?-2:0;
    return 0;
  }
  function coordinationModifier(level,need){
    if(!level)return 0;
    const casual=level==="Casual",voice=level==="Voice-coordinated";
    if(need==="High")return casual?-8:voice?5:0;
    if(need==="Medium")return casual?-2:voice?2:0;
    return 0;
  }
  function enemyModifier(a,ctx){
    const enemies=[ctx.enemy1,ctx.enemy2].filter(x=>x!=="Unknown");
    let n=0;
    if(!enemies.length&&["shield-scale","hold-door"].includes(a.id))n+=4;
    if(enemies.filter(x=>x==="Zerg").length===2&&["hold-door","fortress-flank","lantern-blade"].includes(a.id))n+=3;
    if(enemies.filter(x=>x==="Terran").length===2&&["two-doors","siege-harvest","lantern-blade"].includes(a.id))n+=3;
    if(enemies.filter(x=>x==="Protoss").length===2&&["two-doors","hammer-anvil","hold-door"].includes(a.id))n+=2;
    if(unknownCount(ctx)>0&&["hidden-hand","wild-card"].includes(a.id))n-=3;
    return n;
  }
  function assignRoles(a,ctx){
    const first={you:a.roles[0],ally:a.roles[1]};
    const second={you:a.roles[1],ally:a.roles[0]};
    const f=roleFit(ctx.me,first.you)+roleFit(ctx.ally,first.ally);
    const s=roleFit(ctx.me,second.you)+roleFit(ctx.ally,second.ally);
    return s>f?second:first;
  }

  function baseOpening(r){
    if(r==="Terran")return [
      {start:0,end:25,action:"SCVs continuously",purpose:"Fund every later branch."},
      {start:28,end:38,action:"Supply Depot",purpose:"Stay ahead of supply and establish wall geometry."},
      {start:44,end:58,action:"Barracks + Refinery",purpose:"Open scouting, units, and tech."},
      {start:92,end:115,action:"Orbital + first scout unit",purpose:"Turn the opening into information and income."},
      {start:125,end:165,action:"Command Center if the team read is safe",purpose:"Exploit the current 300-mineral Command Center without ignoring the combined attack window."}
    ];
    if(r==="Zerg")return [
      {start:0,end:25,action:"Drones continuously",purpose:"Build economic optionality."},
      {start:28,end:38,action:"Overlord",purpose:"Preserve supply and scouting access."},
      {start:65,end:82,action:"Natural Hatchery",purpose:"Add larva, economy, and defensive depth."},
      {start:88,end:105,action:"Spawning Pool",purpose:"Unlock Queens, Lings, and team safety."},
      {start:130,end:165,action:"Queens + first scouting units",purpose:"Inject, warn the ally, and identify the first combined threat."}
    ];
    return [
      {start:0,end:25,action:"Probes continuously",purpose:"Fund the opening and preserve options."},
      {start:28,end:38,action:"Pylon",purpose:"Power the opening and avoid the first block."},
      {start:48,end:62,action:"Gateway",purpose:"Start the first unit and tech channel."},
      {start:64,end:80,action:"Assimilator",purpose:"Fund Cybernetics and the chosen capability."},
      {start:88,end:118,action:"Nexus if the team read is safe",purpose:"Establish economy without donating the first combined attack window."},
      {start:112,end:135,action:"Cybernetics Core",purpose:"Unlock scouting and advanced unit paths."}
    ];
  }

  function roleStep(r,roles){
    const main=roles[0],x=race(r),unit=roleLanguage(r,roles);
    const table={
      Screen:{start:165,end:220,action:`Create a credible screen with ${unit}`,purpose:"Force enemy movement without donating the force."},
      Anchor:{start:175,end:245,action:`Build the stable front: ${unit}`,purpose:"Give the team a place the opponents cannot cross cheaply."},
      Scout:{start:150,end:220,action:`Establish repeatable information: ${unit}`,purpose:"Refresh both opponents before the next irreversible purchase."},
      Harasser:{start:185,end:260,action:`Open the harassment lane: ${unit}`,purpose:"Create attention, economic tax, or army displacement."},
      Expander:{start:205,end:285,action:`Prepare the next ${x.base} plus reinforcement access`,purpose:"Spend the partner's pressure window on future power."},
      Closer:{start:235,end:330,action:`Invest in finishing capability: ${unit}`,purpose:"Convert the team read into the composition that ends favorable fights."}
    };
    return table[main]||table.Anchor;
  }

  function buildFor(r,roles,a){
    const steps=baseOpening(r).map(x=>({...x}));
    const role=roleStep(r,roles);steps.push(role);
    if(roles.includes("Expander"))steps.push({start:275,end:350,action:`Secure the new ${race(r).base} and reinforcement route`,purpose:"The expansion is not complete until the team can actually defend and reinforce it."});
    else if(roles.includes("Harasser"))steps.push({start:270,end:345,action:"Pressure a second lane, then disengage",purpose:"Attack attention and movement; do not turn the story into an unnecessary all-in."});
    else steps.push({start:275,end:350,action:"Add production before the next team timing",purpose:"Turn the chosen strategic role into repeatable unit throughput."});
    steps.push({start:345,end:430,action:`Execute ${a.title} team window`,purpose:a.story});
    steps.push({start:430,end:540,action:"Re-scout, defend the counter, then compound",purpose:"The first successful maneuver changes the enemy response; refresh information before repeating it."});
    return steps;
  }

  function makePlan(a,ctx){
    const assignment=assignRoles(a,ctx);
    const score=Math.max(55,Math.min(99,a.base+difficultyPenalty(ctx.skill,a.mechanics)+coordinationModifier(ctx.coordination,a.coord)+enemyModifier(a,ctx)-unknownCount(ctx)*2));
    const confidence=unknownCount(ctx)===0?"High":unknownCount(ctx)===1?"Medium":"Low until opponents are identified";
    const youRoles=assignment.you,allyRoles=assignment.ally;
    return {
      ...a,score,confidence,youRoles,allyRoles,
      youRoleLabel:youRoles.join(" + "),allyRoleLabel:allyRoles.join(" + "),
      youRoleText:roleLanguage(ctx.me,youRoles),allyRoleText:roleLanguage(ctx.ally,allyRoles),
      yourBuild:buildFor(ctx.me,youRoles,a),allyBuild:buildFor(ctx.ally,allyRoles,a),
      matchup:`${ctx.me}+${ctx.ally} vs ${ctx.enemy1}+${ctx.enemy2}`,
      map:ctx.map||"Unknown",patch:PATCH,
      source:"MBMapps current-patch strategic synthesis; timing windows are benchmarks, not execution proof."
    };
  }

  function plans(ctx){return A.map(a=>makePlan(a,ctx)).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title))}
  window.SC2TeamComposerData={PATCH,MAPS,RACES,plans,race};
})();
