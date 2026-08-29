(function(global){
  "use strict";

  const PATCH="5.0.16b";
  const WORKERS={Protoss:"Probes",Terran:"SCVs",Zerg:"Drones"};
  const BASES={Protoss:"Nexus",Terran:"Command Center",Zerg:"Hatchery"};
  const NUMBERS={one:1,two:2,three:3,four:4,five:5,six:6};
  const SKILLS={
    Bronze:{workerTolerance:7,windowBefore:18,windowAfter:30,maxTargets:2,cueLead:18,interval:120,label:"Guided",focus:"Protect one macro habit at a time.",recoveryLead:"Stabilize the basics"},
    Silver:{workerTolerance:6,windowBefore:16,windowAfter:26,maxTargets:2,cueLead:16,interval:90,label:"Guided",focus:"Keep workers and production continuous.",recoveryLead:"Restore the missing cycle"},
    Gold:{workerTolerance:5,windowBefore:14,windowAfter:22,maxTargets:3,cueLead:14,interval:90,label:"Developing",focus:"Connect scouting to the next spend.",recoveryLead:"Repair the next power window"},
    Platinum:{workerTolerance:4,windowBefore:12,windowAfter:20,maxTargets:3,cueLead:12,interval:60,label:"Developing",focus:"Sequence economy, production, and tech cleanly.",recoveryLead:"Recover the build sequence"},
    Diamond:{workerTolerance:3,windowBefore:10,windowAfter:17,maxTargets:3,cueLead:10,interval:60,label:"Competitive",focus:"Hit the plan window without losing adaptation.",recoveryLead:"Recover before the next army window"},
    Master:{workerTolerance:2,windowBefore:8,windowAfter:14,maxTargets:4,cueLead:8,interval:60,label:"Precision",focus:"Preserve tight execution under imperfect information.",recoveryLead:"Correct the limiting commitment"},
    Grandmaster:{workerTolerance:2,windowBefore:7,windowAfter:12,maxTargets:4,cueLead:7,interval:60,label:"Precision",focus:"Optimize the exception, not only the baseline.",recoveryLead:"Correct the highest-opportunity-cost miss"}
  };
  const AUTHORITY={benchmarkType:"derived_practice_range",reviewState:"expert_review_required",patch:PATCH,reviewers:[],reviewedAt:null,evidenceBoundary:"Generated from the concrete plan schedule and worker-production assumptions; not telemetry or proof of an optimal decision."};
  const FOCUS_PROGRAMS={
    GENERIC_CHECKPOINT_BASELINE:{title:"Checkpoint baseline",question:"Did you complete the chosen opening through this checkpoint?",positive:"Checkpoint completed as intended",negative:"Checkpoint was not completed as intended"},
    GENERIC_TARGET_ADHERENCE:{title:"Target adherence",question:"Did you keep this session to one behavior, one threshold, and one completion rule?",positive:"Target stayed narrow",negative:"Target expanded or changed during the session"},
    WORKER_CONTINUITY_STALL:{title:"Worker growth",question:"Did worker production stay active, or can you name why worker count stopped growing?",positive:"Active or plateau cause named",negative:"Plateau cause not identified"},
    MINERAL_FLOAT_EXPOSURE:{title:"Spend cycle",question:"If minerals crossed 1,000, was the bank planned, and what commitment or constraint came next?",positive:"Plan or constraint named",negative:"Crossed 1,000 without a named plan or constraint"},
    SUPPLY_BLOCK_EXPOSURE:{title:"Supply headroom",question:"Did the next supply provider start before free supply reached zero?",positive:"Provider started in time",negative:"Supply reached zero first"},
    PRODUCTION_IDLE_EXPOSURE:{title:"Production cadence",question:"Was the primary production cycle maintained or deliberately paused?",positive:"Maintained or deliberately paused",negative:"Paused without a clear reason"}
  };

  function normalizeFocus(drill){
    const code=String(drill?.focusCode||"").trim();
    const program=FOCUS_PROGRAMS[code];
    return program?{code,...program,authority:"player_report",outcomeStatus:"reported_only"}:null;
  }

  const STRUCTURES=[
    {key:"gateway",label:"Gateways",pattern:/\bgateways?\b/i},
    {key:"barracks",label:"Barracks",pattern:/\bbarracks\b/i},
    {key:"factory",label:"Factories",pattern:/\bfactor(?:y|ies)\b/i},
    {key:"starport",label:"Starports",pattern:/\bstarports?\b/i},
    {key:"stargate",label:"Stargates",pattern:/\bstargates?\b/i},
    {key:"robotics",label:"Robotics Facilities",pattern:/\brobotics(?: facility)?\b/i},
    {key:"hatchery",label:"Hatcheries",pattern:/\bhatcher(?:y|ies)\b/i,baseRace:"Zerg"},
    {key:"nexus",label:"Nexuses",pattern:/\bnexus(?:es)?\b/i,baseRace:"Protoss"},
    {key:"command_center",label:"Command Centers",pattern:/\bcommand centers?\b/i,baseRace:"Terran"},
    {key:"roach_warren",label:"Roach Warren",pattern:/\broach warren\b/i},
    {key:"baneling_nest",label:"Baneling Nest",pattern:/\bbaneling nest\b/i},
    {key:"spawning_pool",label:"Spawning Pool",pattern:/\bspawning pool\b/i},
    {key:"twilight",label:"Twilight Council",pattern:/\btwilight council\b/i},
    {key:"cybernetics",label:"Cybernetics Core",pattern:/\bcybernetics core\b/i}
  ];

  const SIGNALS={
    normal_natural:{priority:20,group:"expansion",status:"continue",permission:"OPEN",duration:35,suppressesMacro:false,question:"What production follows the confirmed natural?",action:"Continue the benchmark and schedule the next production scout.",reason:"A natural confirms an economic floor, not the absence of pressure."},
    reaper:{priority:55,group:"units",status:"modify",permission:"CAUTION",duration:40,suppressesMacro:true,question:"What follows the Reaper: economy, Factory, or more production?",action:"Protect the first units and confirm the natural before exposed spending.",reason:"The Reaper is actionable scouting pressure, but it does not prove an all-in."},
    factory:{priority:60,group:"technology",status:"modify",permission:"CAUTION",duration:55,suppressesMacro:true,question:"Is the Factory buying control, harassment, or a push?",action:"Preserve mobile coverage and confirm the Factory follow-up before the next luxury.",reason:"Factory evidence creates multiple threat branches; the follow-up determines the response."},
    starport:{priority:65,group:"technology",status:"modify",permission:"CAUTION",duration:65,suppressesMacro:true,question:"Is the Starport producing harassment, detection pressure, or support?",action:"Add minimum mineral-line and detection coverage, then re-scout its use.",reason:"Air mobility changes coverage obligations without automatically invalidating the plan."},
    no_natural:{priority:95,group:"expansion",status:"abort",permission:"HOLD",duration:75,suppressesMacro:true,question:"What immediate power replaces the missing expansion?",action:"Stop exposed economy and load the defensive branch now.",reason:"The economic assumption supporting the scheduled macro checkpoint is absent."},
    extra_production:{priority:85,group:"production",status:"hold",permission:"HOLD",duration:65,suppressesMacro:true,question:"Is the added production crossing the map?",action:"Delay optional economy and add immediate unit throughput.",reason:"Extra production compresses the payoff window for slow investments."},
    move_out:{priority:100,group:"movement",status:"hold",permission:"HOLD",duration:55,suppressesMacro:true,question:"Where will the move-out arrive, and what must survive?",action:"Stop luxury spending and establish defensive geometry.",reason:"Confirmed movement outranks the scheduled worker and infrastructure benchmark."},
    hidden_tech:{priority:75,group:"information",status:"hold",permission:"HOLD",duration:50,suppressesMacro:true,question:"Which missing technology fact changes the next commitment?",action:"Refresh scouting before the next irreversible investment.",reason:"An information gap must reduce confidence rather than silently count as safety."},
    fast_third:{priority:45,group:"expansion",status:"continue",permission:"OPEN",duration:50,suppressesMacro:false,question:"How can you tax the wider economy without donating units?",action:"Continue scaling and pressure exposed territory with a retreat path.",reason:"A fast third creates economic permission, but only while production remains controlled."},
    turtle:{priority:40,group:"posture",status:"modify",permission:"CAUTION",duration:55,suppressesMacro:false,question:"What map space has static defense conceded?",action:"Take economy, tech, or territory instead of attacking the fortified location.",reason:"Static defense protects a location, not the entire map."}
  };

  function skillProfile(value){
    const raw=String(value||"Silver").trim().toLowerCase();
    const key=Object.keys(SKILLS).find(name=>name.toLowerCase()===raw)||
      (raw.includes("grand")?"Grandmaster":raw.includes("master")?"Master":raw.includes("diamond")?"Diamond":raw.includes("plat")?"Platinum":raw.includes("gold")?"Gold":raw.includes("bronze")?"Bronze":"Silver");
    return {...SKILLS[key],name:key};
  }

  function applyCoachingMode(profile,value){
    const mode=["quiet","standard","intensive"].includes(value)?value:"standard",result={...profile,mode};
    if(mode==="quiet"){result.cueLead=Math.max(5,Math.round(result.cueLead*.6));result.interval=Math.max(120,result.interval);result.maxTargets=Math.max(1,result.maxTargets-1)}
    if(mode==="intensive"){result.cueLead+=5;result.interval=Math.min(60,result.interval);result.maxTargets=Math.min(5,result.maxTargets+1)}
    return result;
  }

  function contentStatus(plan){return {...AUTHORITY,planId:plan?.id||null,sourceKind:plan?"concrete_matchup_library":"compiler_fallback"}}

  function inferGoal(plan){
    const text=`${plan?.scenario||""} ${plan?.title||""} ${plan?.concept||""}`.toLowerCase();
    if(/third|econom|macro|drone|compound/.test(text))return "three_base_expand";
    if(/air|stargate|starport/.test(text))return "air_control";
    if(/pressure|contain|tax|attack/.test(text))return "early_pressure";
    if(/safe|stability|defen/.test(text))return "defensive_macro";
    return "balanced_macro";
  }

  function inferRisk(plan){
    const text=`${plan?.scenario||""} ${plan?.title||""}`.toLowerCase();
    if(/all.in|rush|knife|two-base/.test(text))return "greedy";
    if(/safe|stability|standard/.test(text))return "safe";
    return "balanced";
  }

  function adaptLibraryPlan(libraryPlan,basePlan,skill){
    if(!libraryPlan)return basePlan||null;
    const profile=skillProfile(skill);
    const windows=(libraryPlan.steps||[]).map((step,index)=>{
      const at=Math.max(0,Number(step[0])||0);
      return {
        id:`${libraryPlan.id}:step:${index}`,
        benchmarkSecond:at,
        earliestSecond:Math.max(0,at-profile.windowBefore),
        latestSecond:at+profile.windowAfter,
        start:Math.max(0,at-profile.windowBefore),
        end:at+profile.windowAfter,
        action:String(step[1]||"Execute the next build step"),
        label:String(step[1]||"Execute the next build step"),
        phase:String(step[2]||"Execution"),
        purpose:String(step[3]||"Keep the operation on schedule.")
      };
    });
    return {
      ...(basePlan||{}),
      id:libraryPlan.id,
      title:libraryPlan.title,
      story:libraryPlan.concept,
      why:libraryPlan.concept,
      goal:inferGoal(libraryPlan),
      risk:inferRisk(libraryPlan),
      scenario:libraryPlan.scenario,
      buildWindows:windows,
      sourceSteps:(libraryPlan.steps||[]).map(step=>step.slice()),
      source:{...(basePlan?.source||{}),kind:"matchup_library",patch:PATCH,libraryPlanId:libraryPlan.id},
      authority:contentStatus(libraryPlan),
      coachingLevel:profile.label
    };
  }

  function numberValue(value){
    if(value==null)return null;
    const raw=String(value).toLowerCase();
    return /^\d+$/.test(raw)?Number(raw):(NUMBERS[raw]||null);
  }

  function countForAction(action,definition,current){
    if(!definition.pattern.test(action))return current;
    const text=String(action).toLowerCase();
    if(/second\s*\+\s*third/.test(text))return Math.max(current,3);
    if(/\bthird\b/.test(text))return Math.max(current,3);
    if(/\b(?:natural|second)\b/.test(text))return Math.max(current,2);
    const token="(\\d+|one|two|three|four|five|six)";
    const label=definition.key==="command_center"?"command centers?":definition.key==="roach_warren"?"roach warrens?":definition.key.replaceAll("_"," ")+"s?";
    const explicit=text.match(new RegExp(`${token}[^.;,]{0,18}${label}`));
    const amount=numberValue(explicit?.[1]);
    if(amount!=null){
      if(/\badd\b/.test(text.slice(Math.max(0,(explicit?.index||0)-8),explicit.index||0)))return current+amount;
      return Math.max(current,amount);
    }
    if(new RegExp(`\\badd\\b[^.;,]{0,18}${label}`).test(text))return current+1;
    return Math.max(current,1);
  }

  function planRows(plan){
    if(Array.isArray(plan?.sourceSteps))return plan.sourceSteps.map(step=>({at:Number(step[0])||0,action:String(step[1]||""),phase:String(step[2]||"")}));
    return (plan?.buildWindows||[]).map(row=>({at:Number(row.benchmarkSecond??row.start??row.earliestSecond)||0,action:String(row.action||row.label||""),phase:String(row.phase||"")}));
  }

  function structureTargets(plan,second,race){
    const counts=new Map();
    for(const row of planRows(plan).filter(row=>row.at<=second).sort((a,b)=>a.at-b.at)){
      for(const definition of STRUCTURES){
        if(definition.baseRace&&definition.baseRace!==race)continue;
        const current=counts.get(definition.key)||0;
        const next=countForAction(row.action,definition,current);
        if(next>current)counts.set(definition.key,next);
      }
    }
    return STRUCTURES.filter(definition=>counts.has(definition.key)).map(definition=>({key:definition.key,label:definition.label,count:counts.get(definition.key),base:Boolean(definition.baseRace)}));
  }

  function expansionActivations(plan,race){
    const base=BASES[race];
    if(!base)return [];
    const pattern=new RegExp(`\\b${base.replace("Command Center","command center")}(?:es|s)?\\b`,"i");
    const activations=[];
    for(const row of planRows(plan)){
      if(!pattern.test(row.action))continue;
      const text=row.action.toLowerCase();
      const count=/\bthird\b/.test(text)?3:/\b(?:natural|second)\b/.test(text)?2:2;
      activations.push({second:row.at+65,count});
    }
    return activations.sort((a,b)=>a.second-b.second);
  }

  function workerTarget(plan,race,second,profile){
    const rate={Protoss:5.2,Terran:5.0,Zerg:5.1}[race]||5;
    const activations=expansionActivations(plan,race);
    let bases=1,last=0,total=8;
    for(const activation of activations){
      if(activation.second>second)break;
      total+=(activation.second-last)/60*rate*bases;
      last=activation.second;
      bases=Math.max(bases,activation.count);
    }
    total+=(second-last)/60*rate*bases;
    const center=Math.max(8,Math.min(88,Math.round(total)));
    return {label:WORKERS[race]||"Workers",center,min:Math.max(8,center-profile.workerTolerance),max:center+profile.workerTolerance};
  }

  function checkpointSummary(worker,targets,maxTargets){
    const prioritized=targets.slice().sort((a,b)=>Number(a.base)-Number(b.base)||b.count-a.count).slice(0,maxTargets);
    return [`${worker.min}–${worker.max} ${worker.label}`,...prioritized.map(row=>`${row.count} ${row.label}`)].join(" · ");
  }

  function buildCheckpoints(plan,race,skill,coachingMode="standard",focus=null){
    const profile=applyCoachingMode(skillProfile(skill),coachingMode);
    const rows=planRows(plan);
    const last=Math.max(300,...rows.map(row=>row.at));
    const end=Math.min(480,Math.ceil((last+60)/60)*60);
    const checkpoints=[];
    for(let at=120;at<=end;at+=profile.interval){
      const worker=workerTarget(plan,race,at,profile);
      const targets=structureTargets(plan,at,race);
      const primary=targets.filter(row=>!row.base).sort((a,b)=>b.count-a.count)[0]||targets[0]||null;
      checkpoints.push({
        id:`${plan?.id||"plan"}:checkpoint:${at}`,
        at,
        worker,
        targets,
        primaryProduction:primary,
        summary:checkpointSummary(worker,targets,profile.maxTargets),
        rationale:`${profile.focus} Derived practice benchmark; expert review remains required. Report actual state because battlefield evidence may replace it.`,
        authority:contentStatus(plan),
        profile:profile.name,
        focus:null
      });
    }
    if(focus&&checkpoints.length){
      const observationSecond=300;
      const closest=checkpoints.reduce((best,row)=>Math.abs(row.at-observationSecond)<Math.abs(best.at-observationSecond)?row:best,checkpoints[0]);
      closest.focus=focus;
    }
    return checkpoints;
  }

  function createSession({plan,race,opponent,skill,coachingMode="standard",drill=null,drillKey=null}={}){
    const profile=applyCoachingMode(skillProfile(skill),coachingMode);
    const focus=normalizeFocus(drill);
    return {
      id:`checkpoint-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      patch:PATCH,
      planId:plan?.id||null,
      race:race||"Unknown",
      opponent:opponent||"Unknown",
      skill:profile.name,
      profile,
      coachingMode:profile.mode,
      drillKey:String(drillKey||""),
      checkpoints:buildCheckpoints(plan||{},race||"Unknown",profile.name,profile.mode,focus),
      focus,
      confirmations:{},
      evidence:[],
      recovery:null,
      planChanged:false
    };
  }

  function evidenceDetails(value){
    const details=value&&typeof value==="object"?value:{};
    const aliases={low:.35,uncertain:.35,medium:.7,likely:.7,high:1,confirmed:1},rawConfidence=aliases[details.confidence]??Number(details.confidence),confidence=Math.max(0,Math.min(1,Number.isFinite(rawConfidence)?rawConfidence:1));
    const rawCount=Number(details.count),count=Number.isFinite(rawCount)&&rawCount>0?Math.min(20,Math.floor(rawCount)):null;
    const locations=["unknown","main","natural","third","proxy","map_center","our_side","their_side"],location=locations.includes(details.location)?details.location:"unknown";
    return {count,location,confidence,observedSecond:Math.max(0,Number(details.observedSecond)||0)};
  }

  function reportEvidence(session,signalId,second,details={}){
    if(!session||!SIGNALS[signalId])return null;
    const definition=SIGNALS[signalId],reportedSecond=Math.max(0,Number(second)||0),normalized=evidenceDetails(details),observedSecond=Math.min(reportedSecond,details.observedSecond==null?reportedSecond:normalized.observedSecond);
    if(normalized.confidence===0)return directive(session,reportedSecond);
    const evidence={id:signalId,group:definition.group,reportedSecond,observedSecond,expiresSecond:observedSecond+definition.duration,details:{...normalized,observedSecond}};
    if(definition.group==="expansion"&&session.evidence.some(row=>row.group==="expansion"&&row.expiresSecond>=reportedSecond&&row.observedSecond>observedSecond))return directive(session,reportedSecond);
    session.evidence=session.evidence.filter(row=>row.expiresSecond>=reportedSecond&&row.id!==signalId&&!(definition.group==="expansion"&&row.group==="expansion"&&row.observedSecond<=observedSecond));
    session.evidence.push(evidence);
    return directive(session,second);
  }

  function directive(session,second){
    if(!session)return null;
    const now=Math.max(0,Number(second)||0);
    if(session.planChanged)return {id:"plan_changed",status:"hold",permission:"HOLD",suppressesMacro:true,question:"Which operation are you executing now?",action:"Pause reminders and redeploy the correct plan.",reason:"Old benchmarks become harmful after the player changes plans."};
    const score=row=>(SIGNALS[row.id]?.priority||0)*(row.details?.confidence??1)+Math.min(12,Math.max(0,(row.details?.count||1)-1)*4);
    const active=session.evidence.filter(row=>row.expiresSecond>=now).sort((a,b)=>score(b)-score(a)||b.observedSecond-a.observedSecond||b.reportedSecond-a.reportedSecond||a.id.localeCompare(b.id))[0];
    const activeDefinition=active?SIGNALS[active.id]:null,urgentVerification=Boolean(active&&activeDefinition?.priority>=80&&(active.details?.confidence??1)<.5);
    if(session.recovery&&session.recovery.expiresSecond>=now&&(!active||(score(active)<=50&&!urgentVerification)))return session.recovery;
    if(!active)return null;
    const details=active.details||evidenceDetails(),count=details.count>1?`${details.count} `:"",location=details.location!=="unknown"?` near the ${details.location.replaceAll("_"," ")}`:"",confidence=details.confidence>=.9?"Confirmed":details.confidence>=.5?"Likely":"Uncertain",definition=SIGNALS[active.id];
    if(details.confidence<.5)return {id:active.id,...definition,status:"verify",permission:"CAUTION",suppressesMacro:false,requiresConfirmation:true,expiresSecond:active.expiresSecond,evidence:active,attentionScore:score(active),observation:`${confidence} ${count}${active.id.replaceAll("_"," ")}${location}.`,question:"Can you verify this scout report?",action:"Verify this report before changing the active plan.",reason:`Low-confidence report: ${count}${active.id.replaceAll("_"," ")}${location}. The current benchmark remains provisional until confirmed.`};
    return {id:active.id,...definition,requiresConfirmation:false,expiresSecond:active.expiresSecond,evidence:active,attentionScore:score(active),observation:`${confidence} ${count}${active.id.replaceAll("_"," ")}${location}.`,reason:`${definition.reason} ${confidence} report: ${count}${active.id.replaceAll("_"," ")}${location}.`};
  }

  function current(session,second){
    if(!session)return null;
    const now=Math.max(0,Number(second)||0);
    const tactical=directive(session,now);
    if(tactical?.suppressesMacro)return {kind:"directive",key:`directive:${tactical.id}`,directive:tactical};
    const rows=session.checkpoints.filter(row=>!session.confirmations[row.id]);
    const due=rows.find(row=>now>=row.at-session.profile.cueLead&&now<=row.at+session.profile.windowAfter);
    const late=rows.filter(row=>now>row.at+session.profile.windowAfter&&now-(row.at+session.profile.windowAfter)<=session.profile.interval).at(-1);
    const next=due||late||rows.find(row=>row.at>now)||rows.at(-1)||null;
    if(!next)return tactical?{kind:"directive",key:`directive:${tactical.id}`,directive:tactical}:null;
    const phase=now<next.at-session.profile.cueLead?"upcoming":now<=next.at+session.profile.windowAfter?"due":"late";
    return {kind:"checkpoint",key:next.id,checkpoint:next,phase,directive:tactical};
  }

  function confirm(session,{checkpointId,status,workers,production,focusReport,second}={}){
    if(!session)return null;
    const checkpoint=session.checkpoints.find(row=>row.id===checkpointId);
    if(!checkpoint)return null;
    const reportedSecond=Math.max(0,Number(second)||0);
    if(reportedSecond<checkpoint.at-session.profile.cueLead)return null;
    if(checkpoint.focus&&!(["met","missed","uncertain","not_observed"].includes(focusReport)))return null;
    const normalized=["on_track","behind","changed"].includes(status)?status:"on_track";
    const actualWorkers=workers===""||workers==null?null:Math.max(0,Number(workers)||0);
    const actualProduction=production===""||production==null?null:Math.max(0,Number(production)||0);
    const workerGap=actualWorkers==null?0:Math.max(0,checkpoint.worker.min-actualWorkers);
    const productionGap=actualProduction==null||!checkpoint.primaryProduction?0:Math.max(0,checkpoint.primaryProduction.count-actualProduction);
    const outcome=normalized==="changed"?"changed":normalized==="behind"||workerGap>0||productionGap>0?"behind":"on_track";
    const normalizedFocus=checkpoint.focus&&["met","missed","uncertain","not_observed"].includes(focusReport)?focusReport:null;
    const recorded={checkpointId,status:normalized,outcome,workers:actualWorkers,production:actualProduction,workerGap,productionGap,expectedWorkerMin:checkpoint.worker.min,expectedWorkerMax:checkpoint.worker.max,expectedProduction:checkpoint.primaryProduction?.count??null,productionLabel:checkpoint.primaryProduction?.label||"",focusCode:checkpoint.focus?.code||null,focusReport:normalizedFocus,focusAuthority:checkpoint.focus?"player_report":null,focusOutcomeStatus:checkpoint.focus?(normalizedFocus==="not_observed"?"not_evaluated":"reported_only"):null,reportedSecond,recordedAt:Date.now()};
    session.confirmations[checkpointId]=recorded;
    if(normalized==="changed"){
      session.planChanged=true;
      return {recorded,recovery:directive(session,second)};
    }
    if(normalized==="behind"||workerGap>0||productionGap>0){
      const actions=[];
      if(workerGap>0)actions.push(`Restore ${checkpoint.worker.label} production; you reported ${actualWorkers} against the ${checkpoint.worker.min}–${checkpoint.worker.max} practice range`);
      if(productionGap>0)actions.push(`add ${productionGap} ${checkpoint.primaryProduction.label} before the next army window`);
      if(!actions.length)actions.push("identify the missed build step and complete it before optional tech or economy");
      session.recovery={
        id:`recovery:${checkpoint.id}`,
        status:"modify",
        permission:"CAUTION",
        suppressesMacro:true,
        expiresSecond:recorded.reportedSecond+50,
        question:"Which missing commitment blocks the next plan window?",
        action:`${session.profile.recoveryLead}: ${actions.join("; ")}.`,
        reason:"The checkpoint is a correction aid, not proof that the game is lost. Preserve safety while repairing the build."
      };
      return {recorded,recovery:session.recovery};
    }
    session.recovery=null;
    return {recorded,recovery:null};
  }

  const api={PATCH,SKILLS,SIGNALS,AUTHORITY,FOCUS_PROGRAMS,normalizeFocus,skillProfile,applyCoachingMode,contentStatus,inferGoal,inferRisk,adaptLibraryPlan,structureTargets,workerTarget,buildCheckpoints,createSession,evidenceDetails,reportEvidence,directive,current,confirm};
  global.SC2LiveCheckpoints=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
