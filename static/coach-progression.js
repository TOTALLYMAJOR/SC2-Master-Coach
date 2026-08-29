(function(global){
  "use strict";

  const VERSION=2;
  const LIMIT=240;
  const DIMENSIONS={
    worker_economy:{label:"Worker economy",drill:"Hit the worker minimum at the first four reported checkpoints in three sessions."},
    production_capacity:{label:"Production capacity",drill:"Have the required primary production ready at three consecutive checkpoints."},
    checkpoint_execution:{label:"Checkpoint execution",drill:"Report four scheduled checkpoints without a late or behind state."}
  };
  const PROGRAMS={
    Bronze:{planPool:"standard_safe",cadence:90,maxTargets:1,teaching:"plain_language",recoveryActions:1,drill:"fundamentals"},
    Silver:{planPool:"standard_safe",cadence:75,maxTargets:2,teaching:"cause_and_effect",recoveryActions:1,drill:"consistency"},
    Gold:{planPool:"standard_controlled_pressure",cadence:60,maxTargets:2,teaching:"one_scout_contingency",recoveryActions:2,drill:"scout_to_spend"},
    Platinum:{planPool:"full_non_greedy",cadence:60,maxTargets:3,teaching:"branch_and_permission",recoveryActions:2,drill:"branch_execution"},
    Diamond:{planPool:"full",cadence:60,maxTargets:3,teaching:"exact_deficit",recoveryActions:2,drill:"recurring_weakness"},
    Master:{planPool:"full",cadence:60,maxTargets:4,teaching:"exception_handling",recoveryActions:2,drill:"opportunity_cost"},
    Grandmaster:{planPool:"full",cadence:60,maxTargets:4,teaching:"tradeoff_collapsed",recoveryActions:2,drill:"contingency_precision"}
  };

  function finite(value,fallback=null){if(value==null||value==="")return fallback;const number=Number(value);return Number.isFinite(number)?number:fallback}
  function text(value,max=100){return String(value||"").trim().slice(0,max)}
  function skillName(value){const raw=text(value,30).toLowerCase();return Object.keys(PROGRAMS).find(key=>key.toLowerCase()===raw)||(raw.includes("grand")?"Grandmaster":raw.includes("master")?"Master":raw.includes("diamond")?"Diamond":raw.includes("plat")?"Platinum":raw.includes("gold")?"Gold":raw.includes("bronze")?"Bronze":"Silver")}
  function programForSkill(skill,report=null){const name=skillName(skill),base={name,...PROGRAMS[name]};return report?.weakest?{...base,adaptiveFocus:report.weakest.id}:base}

  function toEvent({session,checkpoint,result,matchup,recordedAt=Date.now()}={}){
    const record=result?.recorded||result||{},workerMin=finite(checkpoint?.worker?.min),workerMax=finite(checkpoint?.worker?.max),workerCenter=finite(checkpoint?.worker?.center),productionTarget=finite(checkpoint?.primaryProduction?.count),workers=finite(record.workers),production=finite(record.production);
    const workerDeficit=workers==null||workerMin==null?null:Math.max(0,workerMin-workers),productionDeficit=production==null||productionTarget==null?null:Math.max(0,productionTarget-production),status=["on_track","behind","changed"].includes(record.status)?record.status:"unknown";
    const sessionId=text(session?.id||record.sessionId),checkpointId=text(checkpoint?.id||record.checkpointId,140),id=`${sessionId||"legacy"}:${checkpointId||recordedAt}`;
    return {schema:VERSION,id,recordedAt:Math.max(0,finite(recordedAt,Date.now())),sessionId,patch:text(session?.patch||record.patch,20),planId:text(session?.planId||record.planId),matchup:text(matchup||record.matchup,12),race:text(session?.race||record.race,20),opponent:text(session?.opponent||record.opponent,20),skill:skillName(session?.skill||record.skill),checkpoint:{id:checkpointId,at:finite(checkpoint?.at),profile:text(checkpoint?.profile||record.skill,24)},report:{status,workers,production,reportedSecond:Math.max(0,finite(record.reportedSecond,0)),focus:record.focusCode?{code:text(record.focusCode,60),value:["met","missed","uncertain","not_observed"].includes(record.focusReport)?record.focusReport:null,authority:"player_report",outcomeStatus:record.focusReport==="not_observed"?"not_evaluated":"reported_only"}:null},target:{workers:{label:text(checkpoint?.worker?.label||"Workers",30),min:workerMin,max:workerMax,center:workerCenter},production:checkpoint?.primaryProduction?{key:text(checkpoint.primaryProduction.key),label:text(checkpoint.primaryProduction.label,40),count:productionTarget}:null},derived:{workerDeficit,productionDeficit,changed:status==="changed",confidence:workerDeficit!=null||productionDeficit!=null?"high":"medium"}};
  }

  function legacyEvent(row,index){
    if(!row||typeof row!=="object")return null;const status=["on_track","behind","changed"].includes(row.status)?row.status:"unknown",recordedAt=Math.max(0,finite(row.recordedAt,index));
    return {schema:VERSION,id:`legacy:${text(row.sessionId)}:${text(row.checkpointId)}:${index}`,recordedAt,sessionId:text(row.sessionId),patch:text(row.patch,20),planId:text(row.planId),matchup:text(row.matchup,12),race:text(row.race,20),opponent:text(row.opponent,20),skill:skillName(row.skill),checkpoint:{id:text(row.checkpointId,140),at:null,profile:skillName(row.skill)},report:{status,workers:finite(row.workers),production:finite(row.production),reportedSecond:Math.max(0,finite(row.reportedSecond,0))},target:{workers:{label:"Workers",min:null,max:null,center:null},production:null},derived:{workerDeficit:null,productionDeficit:null,changed:status==="changed",confidence:"low"}};
  }
  function migrateLegacy(rows){return (Array.isArray(rows)?rows:[]).map(legacyEvent).filter(Boolean)}
  function normalizeEvents(rows){return (Array.isArray(rows)?rows:[]).filter(row=>row&&row.schema===VERSION&&row.id&&row.report).slice(-LIMIT)}
  function upsert(rows,event,{limit=LIMIT}={}){const next=normalizeEvents(rows).filter(row=>row.id!==event?.id);if(event?.id)next.push(event);return next.sort((a,b)=>a.recordedAt-b.recordedAt).slice(-limit)}

  function classify(event){
    if(!event||event.derived?.changed||!["on_track","behind"].includes(event.report?.status))return [];
    const rows=[],confidence=event.derived?.confidence||"low",status=event.report?.status;
    if(event.derived?.workerDeficit!=null){const target=Math.max(1,event.target?.workers?.min||1),deficit=event.derived.workerDeficit;rows.push({dimension:"worker_economy",miss:deficit>0,severity:Math.min(1,deficit/target),weight:1,confidence,event})}
    if(event.derived?.productionDeficit!=null){const target=Math.max(1,event.target?.production?.count||1),deficit=event.derived.productionDeficit;rows.push({dimension:"production_capacity",miss:deficit>0,severity:Math.min(1,deficit/target),weight:1,confidence,event})}
    if(status==="behind"||!rows.length)rows.push({dimension:"checkpoint_execution",miss:status==="behind",severity:status==="behind"?.5:0,weight:confidence==="low"?.4:.65,confidence,event});
    return rows;
  }
  function calculateTrend(observations,{recent=3,prior=3}={}){const rows=observations.slice(-(recent+prior));if(rows.length<recent+prior)return {direction:"insufficient",delta:0};const oldRows=rows.slice(0,prior),newRows=rows.slice(prior),mean=list=>list.reduce((sum,row)=>sum+row.severity,0)/list.length,delta=mean(oldRows)-mean(newRows);return {direction:delta>=.15?"improving":delta<=-.15?"declining":"steady",delta:Number(delta.toFixed(2))}}
  function playerReportEvidenceConfidence(reportCount,sessionCount){return reportCount>=12&&sessionCount>=4?"high":reportCount>=5&&sessionCount>=2?"developing":"low"}
  function calculateStreaks(events){
    const eligible=events.filter(event=>["on_track","behind"].includes(event.report?.status)&&!event.derived?.changed),observations=eligible.map(event=>({event,miss:classify(event).some(row=>row.miss)}));let checkpointOnTrack=0;for(let index=observations.length-1;index>=0&&!observations[index].miss;index--)checkpointOnTrack+=1;
    const sessions=[];for(const row of observations){let group=sessions.find(item=>item.id===row.event.sessionId);if(!group){group={id:row.event.sessionId,total:0,success:0};sessions.push(group)}group.total+=1;if(!row.miss)group.success+=1}
    let sessionOnTrack=0;for(let index=sessions.length-1;index>=0&&sessions[index].total&&sessions[index].success/sessions[index].total>=.75;index--)sessionOnTrack+=1;return {checkpointOnTrack,sessionOnTrack};
  }
  function summarizeFocus(events,focusCode=null){
    const allRows=events.filter(event=>event?.report?.focus).sort((a,b)=>a.recordedAt-b.recordedAt),latestCode=focusCode||allRows.at(-1)?.report?.focus?.code||null,rows=allRows.filter(event=>!latestCode||event.report.focus.code===latestCode),counts={met:0,missed:0,uncertain:0,not_observed:0,unreported:0};
    for(const event of rows){const value=event.report.focus.value;counts[value in counts?value:"unreported"]+=1}
    const latest=rows.at(-1)?.report?.focus||null,reported=counts.met+counts.missed+counts.uncertain,evaluated=counts.met+counts.missed,code=latestCode,human=text(code,80).replaceAll("_"," ").toLowerCase();
    const sessions=[];for(const event of rows){if(!event.sessionId)continue;let session=sessions.find(item=>item.id===event.sessionId);if(!session){session={id:event.sessionId,value:null,recordedAt:0};sessions.push(session)}if(event.recordedAt>=session.recordedAt){session.value=event.report.focus.value;session.recordedAt=event.recordedAt}}
    sessions.sort((a,b)=>a.recordedAt-b.recordedAt);let consecutiveMetSessions=0;for(let index=sessions.length-1;index>=0&&sessions[index].value==="met";index--)consecutiveMetSessions+=1;
    const graduationReady=consecutiveMetSessions>=2,graduation={status:graduationReady?"reported_ready_for_replay_review":"continue_reporting",authority:"player_report",distinctSessionsReported:sessions.length,consecutiveMetSessions,requiredConsecutiveMetSessions:2,evidenceBoundary:"Readiness is based on local player reports. It is not proof of mastery, gameplay improvement, or replay-observed correction."};
    let recommendation={title:"Establish a practice-focus report",instruction:"Answer the focus prompt at a scheduled checkpoint. This is a player report, not verified gameplay evidence."};
    if(latest?.value==="missed")recommendation={title:`Repeat ${human||"the same practice focus"}`,instruction:"You reported the focus as missed. Repeat the same target once and name the cause before changing drills."};
    else if(latest?.value==="uncertain")recommendation={title:"Make the focus easier to observe",instruction:"You reported uncertainty. Use one concrete trigger and one response so the next checkpoint can be answered confidently."};
    else if(latest?.value==="not_observed")recommendation={title:"Repeat until the trigger is observable",instruction:"The condition did not occur, so this session cannot evaluate the focus. Keep the target or choose a clearer trigger before drawing a conclusion."};
    else if(graduationReady)recommendation={title:"Review a later comparable replay",instruction:"You reported this focus met in two distinct sessions. Review a later comparable replay before replacing it. This is readiness for review, not proof of improvement."};
    else if(latest?.value==="met")recommendation={title:"Repeat before replacing the focus",instruction:"You reported the focus as met. Repeat it in another session before treating it as ready for replay review."};
    return {authority:"player_report",outcomeStatus:"reported_only",code,label:human||null,total:rows.length,reported,evaluated,otherFocusReports:allRows.length-rows.length,...counts,latest,graduation,recommendation};
  }
  function analyze(input,{now=Date.now(),matchup=null,focusCode=null,drillKey=null,minEvidence=3}={}){
    const supplied=Array.isArray(input)?input:[],suppliedValid=supplied.filter(row=>row&&row.schema===VERSION&&row.id&&row.report).length,retained=normalizeEvents(input).sort((a,b)=>a.recordedAt-b.recordedAt),events=retained.filter(event=>(!matchup||event.matchup===matchup)&&(!drillKey||event.drillKey===drillKey)),observations=events.flatMap(classify),dimensionWindow=observations.slice(-20),aggregates={};
    for(const observation of dimensionWindow){const ageDays=Math.max(0,(now-observation.event.recordedAt)/86400000),recency=Math.pow(.5,ageDays/21),weight=observation.weight*recency,key=observation.dimension,row=aggregates[key]||(aggregates[key]={dimension:key,evidence:0,misses:0,weightedMiss:0,successWeight:0,evidenceWeight:0,sessions:new Set(),observations:[]});row.evidence+=1;row.evidenceWeight+=weight;row.weightedMiss+=observation.severity*weight;if(observation.miss)row.misses+=1;else row.successWeight+=weight;if(observation.event.sessionId)row.sessions.add(observation.event.sessionId);row.observations.push(observation)}
    const dimensions=Object.values(aggregates).map(row=>{const recent=row.observations.slice(-5),recurring=row.evidence>=minEvidence&&row.sessions.size>=2&&recent.filter(item=>item.miss).length>=2&&row.weightedMiss/Math.max(.001,row.evidenceWeight)>=.35;return {id:row.dimension,label:DIMENSIONS[row.dimension].label,evidence:row.evidence,distinctSessions:row.sessions.size,misses:row.misses,reportedConsistency:Math.round(100*(row.successWeight+1)/(row.evidenceWeight+2)),recurring,trend:calculateTrend(row.observations),confidence:playerReportEvidenceConfidence(row.evidence,row.sessions.size),confidenceAuthority:"local_player_report_volume_and_distinct_sessions"}}).sort((a,b)=>Number(b.recurring)-Number(a.recurring)||b.misses-a.misses||a.reportedConsistency-b.reportedConsistency),weakest=dimensions[0]||null,streaks=calculateStreaks(events),eligible=events.filter(event=>["on_track","behind"].includes(event.report?.status)&&!event.derived?.changed);
    const success=eligible.filter(event=>!classify(event).some(row=>row.miss)).length,accuracy=eligible.length?Math.round(success/eligible.length*100):0,recommendation=weakest?{id:`drill:${weakest.id}`,dimension:weakest.id,title:DIMENSIONS[weakest.id].label,instruction:DIMENSIONS[weakest.id].drill,successCriterion:DIMENSIONS[weakest.id].drill,matchup,confidence:weakest.confidence}:{id:"drill:baseline",dimension:"checkpoint_execution",title:"Establish a baseline",instruction:"Complete and report three checkpoints in one concrete plan.",successCriterion:"Three checkpoint reports",matchup,confidence:"low"};
    const focusSummary=summarizeFocus(events,focusCode);
    const horizon={authority:"bounded_local_history",storedEventLimit:LIMIT,suppliedValidEvents:suppliedValid,retainedEvents:retained.length,scopedEvents:events.length,dimensionObservationLimit:20,availableDimensionObservations:observations.length,dimensionObservationsUsed:dimensionWindow.length,storedLimitReached:retained.length===LIMIT,inputWasTruncated:suppliedValid>LIMIT,dimensionWindowTruncated:observations.length>dimensionWindow.length,focusReportsUsed:focusSummary.total};
    const distinctSessions=new Set(eligible.map(event=>event.sessionId).filter(Boolean)).size,confidence=playerReportEvidenceConfidence(eligible.length,distinctSessions),confidenceBasis={authority:"local_player_report_volume_and_distinct_sessions",eligibleReports:eligible.length,distinctSessions,highThreshold:{eligibleReports:12,distinctSessions:4},developingThreshold:{eligibleReports:5,distinctSessions:2},coachingValidity:"UNVERIFIED"};
    return {schema:VERSION,total:events.length,eligible:eligible.length,accuracy,confidence,confidenceBasis,streaks,dimensions,weakest,recommendation,focusSummary,horizon,headline:eligible.length?`${accuracy}% on track · ${weakest?.trend.direction||"baseline"}`:"Complete checkpoints to establish a practice baseline."};
  }

  const api={VERSION,LIMIT,DIMENSIONS,PROGRAMS,skillName,programForSkill,toEvent,migrateLegacy,normalizeEvents,upsert,classify,calculateTrend,calculateStreaks,summarizeFocus,analyze};
  global.SC2CoachProgression=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
