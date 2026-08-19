(function(){
  "use strict";

  const D=window.SC2StrategyCompilerData;
  const E=window.SC2StrategyEngine;
  if(!D||!E)return;

  const MANUAL_KEY="sc2-master-coach:strategic-os-manual:v1";
  const MISSION_KEY="sc2-master-coach:strategic-os-mission:v1";
  const listeners=new Set();
  const clone=value=>JSON.parse(JSON.stringify(value));
  const nowIso=()=>new Date().toISOString();

  const OBLIGATION_LIBRARY={
    safe_expand:[
      ["fresh_threat_read","Renew the opponent's attack and production state before the expansion."],
      ["reinforcement_access","Prepare rally, warp-in, creep, or production access to the new base."],
      ["army_coverage","Keep enough force available to cover the wider defensive footprint."],
      ["retreat_plan","Know what survives if the expansion cannot be held."]
    ],
    three_base_expand:[
      ["fresh_threat_read","Renew production and movement information before committing the third."],
      ["reinforcement_access","Create a practical reinforcement route to the third."],
      ["army_coverage","Cover the natural, third, and likely harassment lanes."],
      ["production_conversion","Add enough production for the new economy to become military power."],
      ["retreat_plan","Preserve the core army if the third must be abandoned."]
    ],
    balanced_macro:[
      ["information_cycle","Maintain a repeatable scouting cycle rather than one opening read."],
      ["production_conversion","Convert income into production before the bank becomes dead power."],
      ["upgrade_alignment","Align upgrades with the army that will use the next power window."],
      ["map_warning","Maintain enough warning to protect simultaneous economy and technology."]
    ],
    early_pressure:[
      ["credible_threat","Show enough force to demand a response."],
      ["exit_plan","Define the disengagement trigger before the pressure begins."],
      ["followup_investment","Know whether the pressure buys economy, technology, or a kill attempt."],
      ["counterattack_coverage","Do not leave the home economy undefended against the obvious counter-route."]
    ],
    timing_attack:[
      ["power_alignment","Synchronize units, upgrades, reinforcement, and movement."],
      ["arrival_window","Reach the target before the opponent's answer is complete."],
      ["engagement_gate","Commit only if the intended advantage is actually present."],
      ["fallback_transition","Know what the economy becomes if the timing does not end the game."]
    ],
    air_control:[
      ["recurring_vision","Use air mobility to refresh information, not merely to exist."],
      ["ground_safety","Preserve enough ground stability while resources are invested in air."],
      ["counter_monitoring","Track anti-air production before overcommitting to the same capability."],
      ["air_preservation","Avoid donating expensive mobility for damage that does not change the game."]
    ],
    stable_ground_army:[
      ["frontline_screen","Keep a screen between the opponent and expensive core units."],
      ["vision","See the engagement before committing the stable army."],
      ["retreat_geometry","Maintain a path that preserves the expensive core."],
      ["counter_monitoring","Scout the opponent's answer to the revealed army shape."]
    ],
    map_control:[
      ["vision_network","Maintain information over lanes, expansions, and rotation routes."],
      ["mobile_response","Keep enough mobility to punish movement without overextending."],
      ["controlled_expansion","Convert controlled space into economy or technology."],
      ["renewal","Re-establish control after every major fight or transition."]
    ],
    defensive_macro:[
      ["early_warning","See the attack before it arrives at the production line."],
      ["compact_reinforcement","Keep defensive production and rally geometry compact."],
      ["hold_end_condition","Recognize when the attack is actually over."],
      ["conversion","Turn the successful hold into economy, technology, or counterpressure."]
    ],
    surprise:[
      ["concealment","Preserve the false story until the unusual capability is ready."],
      ["payoff_window","Hit before the cheap counter can be completed."],
      ["extraction","Preserve surviving technology or units after the reveal."],
      ["normal_fallback","Return to a playable standard position if surprise is lost."]
    ]
  };

  const NOT_YET_LIBRARY={
    safe_expand:["Second major technology","Fourth base","Late-game composition split"],
    three_base_expand:["Fourth base","Second splash technology","Late-game upgrade split","Fleet transition"],
    balanced_macro:["Final composition","Fifth-base economy","Late-game spellcaster split"],
    early_pressure:["Fourth base","Second harassment channel","Late-game composition"],
    timing_attack:["Post-timing luxury tech","Extra expansion beyond the fallback","Second timing package"],
    air_control:["Full air transition","Second air-tech branch","Late-game capital units"],
    stable_ground_army:["Second splash system","Fourth base","Late-game air transition"],
    map_control:["Final attack route","Fifth base","Second control army"],
    defensive_macro:["Counterattack route","Fourth base","Luxury technology"],
    surprise:["Second surprise layer","Long-term composition","Fourth base"]
  };

  function loadJson(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}
    catch(_e){return fallback}
  }

  function saveJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value))}catch(_e){}
  }

  let manual=loadJson(MANUAL_KEY,{});
  let missionMeta=loadJson(MISSION_KEY,{constraints:[],preferredCapability:"flexible",updatedAt:null});

  function request(){return E.getState().request||E.defaultRequest()}
  function state(){return E.getState()}
  function plan(){return state().compilation?.selectedPlan||null}
  function output(){return state().planRuntime?.output||E.currentOutput?.()||null}
  function goal(){return D.getGoal(request().goal)}
  function gameSecond(){return Number(state().clock?.gameSecond||0)}

  function evidenceByType(){
    const map=new Map();
    E.activeEvidence(gameSecond()).forEach(row=>{
      const previous=map.get(row.type);
      if(!previous||Number(row.observedGameSecond||0)>Number(previous.observedGameSecond||0))map.set(row.type,row);
    });
    return map;
  }

  function freshness(row){
    if(!row)return {label:"unknown",state:"unknown",age:null};
    const age=Math.max(0,gameSecond()-Number(row.observedGameSecond||0));
    const ttl=Number(row.freshness?.ttlSeconds||60);
    const ratio=ttl?age/ttl:0;
    return {
      age,
      state:ratio<.55?"fresh":ratio<.88?"aging":"expiring",
      label:`${age}s old · ${ratio<.55?"fresh":ratio<.88?"aging":"expiring"}`
    };
  }

  function missionObject(){
    const req=request(),g=goal();
    return {
      id:`${req.selfRace}-${req.opponentRace}-${req.goal}`.toLowerCase(),
      matchup:`${req.selfRace} vs ${req.opponentRace}`,
      selfRace:req.selfRace,
      opponentRace:req.opponentRace,
      goal:req.goal,
      title:g.label,
      objective:g.short,
      risk:req.risk,
      coachStyle:req.coachStyle,
      skillLevel:req.skillLevel,
      constraints:clone(missionMeta.constraints||[]),
      preferredCapability:missionMeta.preferredCapability||"flexible",
      patch:D.PATCH,
      updatedAt:missionMeta.updatedAt||nowIso()
    };
  }

  function policyObject(){
    const p=plan();
    if(!p)return null;
    const runtime=state().planRuntime||{};
    return {
      id:p.id,
      title:p.title,
      matchup:p.matchup,
      risk:p.risk,
      verdict:state().compilation?.verdict||p.verdict||"supported_with_conditions",
      story:p.story,
      why:p.why,
      capabilities:clone(p.capabilities||[]),
      source:clone(p.source||{}),
      status:runtime.status||"continue",
      statusReason:runtime.statusReason||"Operation compiled.",
      activeRuleId:runtime.output?.activeRuleId||null,
      fallbackPlanId:runtime.currentFallbackPlanId||null
    };
  }

  function intelObject(){
    const rows=E.activeEvidence(gameSecond()).map(row=>{
      const fresh=freshness(row);
      return {
        id:row.evidenceId,
        type:row.type,
        label:row.label||D.getSignal(row.type)?.label||row.type,
        source:row.source,
        confidence:row.strategicConfidence??1,
        recognitionConfidence:row.recognitionConfidence,
        observedGameSecond:row.observedGameSecond,
        age:fresh.age,
        freshness:fresh.state,
        freshnessLabel:fresh.label,
        payload:clone(row.payload||{})
      };
    }).sort((a,b)=>b.observedGameSecond-a.observedGameSecond);
    return {
      rows,
      count:rows.length,
      last:rows[0]||null,
      unknown:rows.length===0,
      statement:rows.length?"Live state uses only player-reported, unexpired evidence.":"No live battlefield evidence has been reported yet."
    };
  }

  function assumptionStatus(assumption,map){
    const id=String(assumption.id||"").toLowerCase();
    const label=String(assumption.label||"").toLowerCase();
    const isManual=!!assumption.manual||/(reinforcement|coverage|screen|vision|retreat|execution capacity)/.test(`${id} ${label}`);
    if(isManual&&manual[assumption.id])return {status:"supported",reason:"Player confirmed this obligation."};
    if(isManual)return {status:"unconfirmed",reason:"Requires player confirmation; the app cannot observe it live."};

    if(/opponent.*identified/.test(id)||/opponent race/.test(label)){
      return request().opponentRace!=="Unknown"?{status:"supported",reason:"Opponent race is selected."}:{status:"unconfirmed",reason:"Opponent race remains unknown."};
    }
    if(/economic|natural|terran_economic_floor/.test(`${id} ${label}`)){
      if(map.has("no_natural"))return {status:"invalidated",reason:"No natural was reported."};
      if(map.has("normal_natural")||map.has("fast_third"))return {status:"supported",reason:"Economic investment was reported."};
      return {status:"unconfirmed",reason:"Economic posture has not been reported."};
    }
    if(/production|threat_read/.test(`${id} ${label}`)){
      if(map.has("hidden_tech"))return {status:"weakened",reason:"A technology information gap was reported."};
      if(["extra_production","factory","starport","move_out"].some(key=>map.has(key)))return {status:"supported",reason:"Recent production or movement evidence exists."};
      return {status:"weakened",reason:"The current production read is missing or stale."};
    }
    if(/screen_survives/.test(id)){
      return manual[assumption.id]?{status:"supported",reason:"Player confirmed the mobile screen survives."}:{status:"unconfirmed",reason:"Confirm that the first mobile force is still alive."};
    }
    return {status:"supported",reason:"Supported by the selected operation framework."};
  }

  function assumptionsObject(){
    const p=plan(),map=evidenceByType();
    const rows=(p?.assumptions||[]).map(item=>{
      const evaluation=assumptionStatus(item,map);
      return {...clone(item),...evaluation,manual:!!item.manual||evaluation.status==="unconfirmed"&&/player confirmation/.test(evaluation.reason)};
    });
    return {
      rows,
      supported:rows.filter(x=>x.status==="supported").length,
      weakened:rows.filter(x=>x.status==="weakened").length,
      invalidated:rows.filter(x=>x.status==="invalidated").length,
      unconfirmed:rows.filter(x=>x.status==="unconfirmed").length
    };
  }

  function permission(kind,status,reason,resolver,priority){
    return {kind,status,reason,resolver,priority};
  }

  function permissionsObject(){
    const req=request(),runtime=state().planRuntime||{},map=evidenceByType();
    const has=key=>map.has(key);
    const danger=has("move_out")||has("no_natural")||runtime.status==="abort"||runtime.status==="hold";
    const uncertainty=has("extra_production")||has("hidden_tech")||runtime.status==="modify";
    const economyKnown=has("normal_natural")||has("fast_third");

    const expansion=danger
      ?permission("expansion","HOLD","Immediate threat evidence overrides economic investment.","Defend, renew the threat read, then return to the expansion mission.",100)
      :uncertainty
        ?permission("expansion","CAUTION","Production or technology uncertainty reduces the safety margin.","Refresh movement and production before committing.",80)
        :economyKnown
          ?permission("expansion","OPEN","Reported economy supports the current expansion route.","Confirm reinforcement access and execute inside the window.",55)
          :permission("expansion","CAUTION","The opponent's economic and production posture is not yet sufficiently known.","Identify the natural and first production branch.",65);

    const technology=danger
      ?permission("technology","HOLD","Immediate survival consumes resources that luxury technology would delay.","Stabilize immediate unit throughput first.",90)
      :has("hidden_tech")
        ?permission("technology","CAUTION","A missing opponent tech read makes a narrow counter risky.","Scout before committing to a specialized answer.",70)
        :permission("technology","OPEN","No reported evidence currently invalidates the planned technology.","Buy the capability the operation requires, then protect it.",45);

    const attack=danger
      ?permission("attack","HOLD","The current priority is defense and preservation.","Collapse toward the threatened area and retain the core army.",95)
      :has("turtle")
        ?permission("attack","CAUTION","Static defense makes direct commitment low value.","Attack map control, economy, and lanes rather than the fortress.",60)
        :["early_pressure","timing_attack","map_control","surprise"].includes(req.goal)
          ?permission("attack","OPEN","The selected mission requires a credible pressure or timing channel.","Commit only while the intended power advantage remains present.",50)
          :permission("attack","CAUTION","Pressure may be useful, but it is not the primary mission.","Use threats to buy information or time; preserve the force.",35);

    const workers=has("move_out")||has("no_natural")
      ?permission("workers","COMPRESS","Immediate army demand is elevated.","Reduce worker priority until the threat window is covered.",85)
      :has("extra_production")
        ?permission("workers","CAUTION","Enemy throughput may punish an uninterrupted worker cycle.","Use one shorter worker cycle, then reassess.",60)
        :permission("workers","CONTINUE","No reported evidence currently requires stopping the economic engine.","Continue until a direct threat or production spike changes the window.",30);

    const harassment=has("move_out")
      ?permission("harassment","DISENGAGE","The mobile force is needed to defend the operation.","Return home without donating the harassment group.",90)
      :has("extra_production")||has("no_natural")
        ?permission("harassment","LIMITED","Pressure must not delay defensive readiness.","Show the threat, collect information, and leave early.",65)
        :has("fast_third")||has("turtle")||["early_pressure","map_control"].includes(req.goal)
          ?permission("harassment","ACTIVE","Opponent investment creates territory or attention to contest.","Pressure edges and exposed lanes; damage is optional.",45)
          :permission("harassment","LIMITED","Harassment is useful only if it serves the mission.","Use it for information, displacement, or denial—not ego damage.",30);

    const rows=[expansion,technology,attack,workers,harassment];
    return {rows,primary:rows.slice().sort((a,b)=>b.priority-a.priority)[0]};
  }

  function obligationStatus(id,map){
    if(manual[id])return {status:"satisfied",reason:"Player confirmed."};
    if(id==="fresh_threat_read"||id==="information_cycle"){
      const rows=[...map.values()];
      return rows.length?{status:"active",reason:freshness(rows.sort((a,b)=>b.observedGameSecond-a.observedGameSecond)[0]).label}:{status:"unmet",reason:"No fresh strategic read."};
    }
    if(id==="counter_monitoring"&&["factory","starport","hidden_tech"].some(k=>map.has(k)))return {status:"active",reason:"A counter-relevant technology signal exists."};
    if(id==="early_warning"&&map.has("move_out"))return {status:"urgent",reason:"Move-out reported."};
    return {status:"unconfirmed",reason:"Requires live execution or player confirmation."};
  }

  function obligationsObject(){
    const g=request().goal,map=evidenceByType();
    const rows=(OBLIGATION_LIBRARY[g]||OBLIGATION_LIBRARY.balanced_macro).map(([id,label])=>({id,label,...obligationStatus(id,map)}));
    return {
      rows,
      urgent:rows.filter(x=>x.status==="urgent").length,
      satisfied:rows.filter(x=>x.status==="satisfied").length,
      incomplete:rows.filter(x=>!["satisfied"].includes(x.status)).length
    };
  }

  function decisionObject(){
    const row=output();
    if(!row){
      return {
        status:"continue",
        severity:"normal",
        question:"What information changes the next commitment?",
        action:"Compile the operation.",
        reason:"The Strategic Kernel needs a policy before it can schedule a decision.",
        confidence:{level:"low",explanation:"No compiled policy."},
        windows:[]
      };
    }
    return {
      status:row.planStatus,
      severity:row.severity,
      question:row.primaryQuestion||"",
      action:row.primaryAction,
      reason:row.reason,
      confidence:clone(row.confidence||{level:"moderate",explanation:"Partial information."}),
      windows:clone(row.nextWindows||[]).slice(0,3),
      evidenceIds:clone(row.evidenceIds||[]),
      activeRuleId:row.activeRuleId||null,
      conceptId:row.conceptId||null,
      expiresAtGameSecond:row.expiresAtGameSecond||null
    };
  }

  function scheduleObject(){
    const d=decisionObject();
    const notYet=NOT_YET_LIBRARY[request().goal]||NOT_YET_LIBRARY.balanced_macro;
    return {
      now:{label:d.action,reason:d.reason},
      soon:d.windows.map(row=>({label:row.label,start:row.earliestSecond,end:row.latestSecond})),
      notYet:clone(notYet)
    };
  }

  function threatObject(){
    return {
      rows:(plan()?.threats||[]).map(row=>clone(row)),
      active:state().planRuntime?.output?.activeRuleId||null,
      status:state().planRuntime?.status||"continue"
    };
  }

  function snapshot(){
    return {
      schemaVersion:"1.0",
      generatedAt:nowIso(),
      gameSecond:gameSecond(),
      phase:state().phase,
      mission:missionObject(),
      policy:policyObject(),
      intel:intelObject(),
      assumptions:assumptionsObject(),
      permissions:permissionsObject(),
      obligations:obligationsObject(),
      decision:decisionObject(),
      schedule:scheduleObject(),
      threats:threatObject(),
      events:{count:state().events?.length||0,last:clone(state().events?.at(-1)||null)}
    };
  }

  function notify(){
    const value=snapshot();
    listeners.forEach(fn=>{try{fn(clone(value))}catch(_e){}});
    window.dispatchEvent(new CustomEvent("sc2:strategic-os-state",{detail:clone(value)}));
    return value;
  }

  function configureMission(next,meta={}){
    const req={...E.defaultRequest(),...next};
    missionMeta={
      ...missionMeta,
      constraints:Array.isArray(meta.constraints)?meta.constraints:missionMeta.constraints||[],
      preferredCapability:meta.preferredCapability||missionMeta.preferredCapability||"flexible",
      updatedAt:nowIso()
    };
    saveJson(MISSION_KEY,missionMeta);
    E.configure(req);
    notify();
    return snapshot();
  }

  function compileOperation(next,meta={}){
    configureMission(next,meta);
    E.compile(next);
    E.evaluate();
    return notify();
  }

  function startOperation(){E.start();E.evaluate();return notify()}
  function pauseOperation(){E.pause();return notify()}
  function resumeOperation(){E.resume();return notify()}
  function setClock(second,evaluate=false){E.setClock(second);if(evaluate)E.evaluate();return notify()}
  function evaluate(){E.evaluate();return notify()}
  function reportIntel(type,payload={},source="player_click",confidence=1){E.reportEvidence(type,payload,source,confidence);return notify()}
  function retractIntel(evidenceId){E.retractEvidence(evidenceId);return notify()}
  function clearIntel(){E.clearEvidence();return notify()}
  function selectRisk(risk){E.selectVariant(risk);E.evaluate();return notify()}

  function toggleManual(id){
    manual[id]=!manual[id];
    saveJson(MANUAL_KEY,manual);
    return notify();
  }

  function setManual(id,value){manual[id]=!!value;saveJson(MANUAL_KEY,manual);return notify()}
  function manualState(){return clone(manual)}

  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  function replayEvents(events,nextRequest){return E.replayEvents(events,nextRequest)}
  function reset(){manual={};missionMeta={constraints:[],preferredCapability:"flexible",updatedAt:null};saveJson(MANUAL_KEY,manual);saveJson(MISSION_KEY,missionMeta);E.reset();return notify()}

  E.subscribe(()=>notify());

  window.SC2StrategicKernel={
    snapshot,subscribe,configureMission,compileOperation,startOperation,pauseOperation,resumeOperation,
    setClock,evaluate,reportIntel,retractIntel,clearIntel,selectRisk,toggleManual,setManual,manualState,
    replayEvents,reset
  };
})();