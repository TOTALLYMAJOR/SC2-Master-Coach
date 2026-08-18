(function(){
  "use strict";
  const D=window.SC2StrategyCompilerData;if(!D)return;

  const STORAGE_KEY="sc2-master-coach:strategy-engine:v1";
  const MAX_EVENTS=3000;
  const listeners=new Set();
  const nowIso=()=>new Date().toISOString();
  const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  function defaultRequest(){
    return {mode:"1v1",selfRace:"Protoss",opponentRace:"Terran",goal:"three_base_expand",risk:"balanced",skillLevel:"Silver",coachStyle:"mentor"};
  }

  function defaultState(){
    return {
      schemaVersion:"1.0",
      sessionId:uid("session"),
      phase:"setup",
      patch:{gameVersion:D.PATCH,compilerDataVersion:D.DATA_VERSION,verifiedAt:nowIso()},
      request:defaultRequest(),
      clock:{gameSecond:0,running:false,source:"manual_timer",confidence:"approximate"},
      eventSequence:0,
      events:[],
      evidence:[],
      compilation:null,
      planRuntime:null,
      mastery:{},
      attention:{queue:[],lastSpokenAtGameSecond:-999,lastSpokenHash:""},
      pendingVoice:null,
      createdAt:nowIso(),
      updatedAt:nowIso()
    };
  }

  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(!raw||raw.schemaVersion!=="1.0")return defaultState();
      raw.clock.running=false;
      return raw;
    }catch(_e){return defaultState()}
  }

  let state=load();

  function persist(){
    state.updatedAt=nowIso();
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(_e){}
  }

  function notify(){
    const snapshot=getState();
    listeners.forEach(fn=>{try{fn(snapshot)}catch(_e){}});
    window.dispatchEvent(new CustomEvent("sc2:strategy-state",{detail:snapshot}));
  }

  function appendEvent(type,payload={},meta={}){
    const event={
      eventId:uid("evt"),
      sequence:++state.eventSequence,
      type,payload:clone(payload),
      gameSecond:Number.isFinite(meta.gameSecond)?meta.gameSecond:state.clock.gameSecond,
      source:meta.source||"ui",
      createdAt:nowIso()
    };
    state.events.push(event);
    if(state.events.length>MAX_EVENTS)state.events=state.events.slice(-MAX_EVENTS);
    reduce(event);
    persist();notify();
    return event;
  }

  function reduce(event){
    switch(event.type){
      case "match.configured":
        state.request={...defaultRequest(),...event.payload};
        state.phase="setup";
        state.evidence=[];
        state.compilation=null;
        state.planRuntime=null;
        state.clock={gameSecond:0,running:false,source:"manual_timer",confidence:"user_synchronized"};
        break;
      case "strategy.compiled":
        state.compilation=event.payload;
        state.planRuntime={status:"continue",activeStepId:null,completedStepIds:[],currentFallbackPlanId:null,lastEvaluatedGameSecond:state.clock.gameSecond,statusReason:"Initial plan compiled.",supportingEvidenceIds:[]};
        state.phase="compiled";
        break;
      case "strategy.variant_selected":
        state.request.risk=event.payload.risk;
        state.compilation=event.payload.compilation;
        state.planRuntime={status:"continue",activeStepId:null,completedStepIds:[],currentFallbackPlanId:null,lastEvaluatedGameSecond:state.clock.gameSecond,statusReason:"Plan variant selected.",supportingEvidenceIds:[]};
        break;
      case "session.started":
        state.phase="live";state.clock.running=true;state.clock.confidence="user_synchronized";break;
      case "session.paused":state.clock.running=false;break;
      case "session.resumed":state.clock.running=true;break;
      case "clock.set":state.clock.gameSecond=Math.max(0,+event.payload.gameSecond||0);break;
      case "evidence.reported":
        state.evidence.push(event.payload);
        break;
      case "evidence.retracted":{
        const row=state.evidence.find(x=>x.evidenceId===event.payload.evidenceId);if(row)row.status="retracted";break;
      }
      case "evidence.cleared":state.evidence=[];break;
      case "plan.evaluated":state.planRuntime={...state.planRuntime,...event.payload};break;
      case "voice.pending":state.pendingVoice=event.payload;break;
      case "voice.cleared":state.pendingVoice=null;break;
      case "mastery.updated":state.mastery[event.payload.conceptId]=event.payload;break;
      case "attention.cue_queued":state.attention.queue.push(event.payload);break;
      case "attention.cue_spoken":
        state.attention.lastSpokenAtGameSecond=event.payload.gameSecond;
        state.attention.lastSpokenHash=event.payload.hash;
        state.attention.queue=state.attention.queue.filter(x=>x.cueId!==event.payload.cueId);
        break;
    }
  }

  function riskDistance(a,b){const order={safe:0,balanced:1,greedy:2};return Math.abs((order[a]??1)-(order[b]??1))}
  function scorePlan(plan,request){
    let score=100-riskDistance(plan.risk,request.risk)*18;
    if(request.opponentRace==="Unknown")score-=12;
    if(request.skillLevel&&/Bronze|Silver/i.test(request.skillLevel)&&plan.risk==="greedy")score-=10;
    if(request.skillLevel&&/Master|Grandmaster/i.test(request.skillLevel)&&plan.risk==="greedy")score+=3;
    if(plan.verdict==="unsupported")score-=50;
    return clamp(score,0,100);
  }

  function compile(request={}){
    const req={...defaultRequest(),...request};
    const candidates=D.candidates(req).map(p=>({...p,compilerScore:scorePlan(p,req)})).sort((a,b)=>b.compilerScore-a.compilerScore);
    const preferred=candidates.find(x=>x.risk===req.risk)||candidates[0];
    const safer=candidates.filter(x=>riskDistance(x.risk,"safe")<riskDistance(preferred.risk,"safe")).sort((a,b)=>b.compilerScore-a.compilerScore)[0]||candidates.find(x=>x.risk==="safe");
    const greedier=candidates.filter(x=>riskDistance(x.risk,"greedy")<riskDistance(preferred.risk,"greedy")).sort((a,b)=>b.compilerScore-a.compilerScore)[0]||candidates.find(x=>x.risk==="greedy");
    const compilation={
      compilationId:uid("compile"),compilerVersion:D.DATA_VERSION,request:req,
      verdict:preferred.verdict||"supported_with_conditions",
      selectedPlan:preferred,
      candidates,
      alternatives:{safer:safer?.id===preferred.id?null:safer||null,greedier:greedier?.id===preferred.id?null:greedier||null},
      score:{objectiveFit:preferred.compilerScore,patchConfidence:preferred.source?.patch===D.PATCH?95:55,mechanicalFit:request.skillLevel&&/Bronze|Silver/i.test(request.skillLevel)&&preferred.risk==="greedy"?58:82,informationBurden:preferred.risk==="greedy"?72:preferred.risk==="safe"?34:52},
      compiledAt:nowIso()
    };
    appendEvent("strategy.compiled",compilation,{source:"compiler"});
    return compilation;
  }

  function selectVariant(risk){
    const req={...state.request,risk};
    const options=D.candidates(req).map(p=>({...p,compilerScore:scorePlan(p,req)}));
    const selected=options.find(x=>x.risk===risk)||options.sort((a,b)=>b.compilerScore-a.compilerScore)[0];
    const compilation={...state.compilation,request:req,selectedPlan:selected,candidates:options,compiledAt:nowIso()};
    appendEvent("strategy.variant_selected",{risk,compilation},{source:"ui"});
    return compilation;
  }

  function configure(request){appendEvent("match.configured",request,{source:"ui"});return getState()}
  function start(){if(!state.compilation)compile(state.request);appendEvent("session.started",{}, {source:"ui"});return evaluate()}
  function pause(){appendEvent("session.paused",{}, {source:"ui"})}
  function resume(){appendEvent("session.resumed",{}, {source:"ui"})}
  function setClock(gameSecond){appendEvent("clock.set",{gameSecond},{source:"timer",gameSecond})}

  function evidenceTtl(type){return D.getSignal(type)?.ttl??60}
  function reportEvidence(type,payload={},source="player_click",confidence=1){
    const signal=D.getSignal(type);
    const observedGameSecond=state.clock.gameSecond;
    const ttl=evidenceTtl(type);
    const evidence={
      evidenceId:uid("evidence"),type,subject:"opponent_1",payload:clone(payload),source,
      observedGameSecond,receivedWallTime:Date.now(),recognitionConfidence:source==="player_voice"?confidence:undefined,
      strategicConfidence:confidence,freshness:{policy:"fixed_ttl",ttlSeconds:ttl,expiresAtGameSecond:observedGameSecond+ttl},
      status:"active",label:signal?.label||type
    };
    appendEvent("evidence.reported",evidence,{source,gameSecond:observedGameSecond});
    evaluate();
    return evidence;
  }

  function retractEvidence(evidenceId){appendEvent("evidence.retracted",{evidenceId},{source:"ui"});evaluate()}
  function clearEvidence(){appendEvent("evidence.cleared",{}, {source:"ui"});evaluate()}

  function activeEvidence(gameSecond=state.clock.gameSecond){
    return state.evidence.filter(x=>x.status==="active"&&(!x.freshness?.expiresAtGameSecond||x.freshness.expiresAtGameSecond>=gameSecond));
  }

  function evidenceMap(gameSecond=state.clock.gameSecond){
    const map=new Map();
    activeEvidence(gameSecond).forEach(x=>{
      const prev=map.get(x.type);
      if(!prev||x.observedGameSecond>prev.observedGameSecond)map.set(x.type,x);
    });
    return map;
  }

  function ruleMatches(rule,set){
    const when=rule.when||{};
    if(when.all&&!when.all.every(x=>set.has(x)))return false;
    if(when.any&&!when.any.some(x=>set.has(x)))return false;
    if(when.none&&when.none.some(x=>set.has(x)))return false;
    return true;
  }

  function currentStep(plan,t){
    const rows=(plan?.buildWindows||[]).slice().sort((a,b)=>a.start-b.start);
    return rows.find(x=>t>=x.start&&t<=x.end)||rows.find(x=>t<x.start)||rows.at(-1)||null;
  }

  function nextWindows(plan,t){return (plan?.buildWindows||[]).filter(x=>x.start>t).sort((a,b)=>a.start-b.start).slice(0,3)}

  function currentScout(plan,t){
    const rows=plan?.scouting||[];
    return rows.find(x=>t>=x.from&&t<=x.to)||rows.find(x=>t<x.from)||rows.at(-1)||null;
  }

  function confidenceFor(plan,map){
    let n=state.request.opponentRace==="Unknown"?25:52;
    if(map.has("normal_natural")||map.has("no_natural"))n+=15;
    if(map.has("extra_production")||map.has("factory")||map.has("starport"))n+=12;
    if(map.has("hidden_tech"))n-=18;
    if(map.has("move_out"))n+=8;
    if(plan?.source?.patch===D.PATCH)n+=8;
    n=clamp(n,10,96);
    return {score:n,level:n>=76?"high":n>=48?"moderate":"low",explanation:n>=76?"Current-patch plan plus fresh, decision-relevant evidence.":n>=48?"The plan is supported, but one or more important facts remain unresolved.":"The coach is operating with limited or stale information."};
  }

  function masteryFor(conceptId){
    return state.mastery[conceptId]||{conceptId,masteryProbability:.25,confidence:.2,attempts:0,independentSuccesses:0,promptedSuccesses:0,failures:0,currentTeachingLevel:"tell",lastUpdatedAt:null};
  }

  function teachingLevel(probability){return probability<.35?"tell":probability<.55?"prompt":probability<.75?"question":probability<.9?"hint":"silent"}

  function recordMastery(conceptId,success,independent=false){
    const prev=masteryFor(conceptId);
    const delta=success?(independent ? .09 : .055):-.08;
    const next={...prev,masteryProbability:clamp(prev.masteryProbability+delta,.02,.98),confidence:clamp(prev.confidence+.04,.1,.98),attempts:prev.attempts+1,independentSuccesses:prev.independentSuccesses+(success&&independent?1:0),promptedSuccesses:prev.promptedSuccesses+(success&&!independent?1:0),failures:prev.failures+(success?0:1),lastUpdatedAt:nowIso()};
    next.currentTeachingLevel=teachingLevel(next.masteryProbability);
    appendEvent("mastery.updated",next,{source:"teaching"});
    return next;
  }

  function adaptQuestion(question,conceptId,status){
    const style=state.request.coachStyle||"mentor";
    const mastery=masteryFor(conceptId||"production_scouting");
    if(status==="abort"||status==="hold")return question;
    if(style==="commander")return question;
    if(style==="silent_test"&&mastery.currentTeachingLevel!=="silent")return "What is the next decision-critical fact?";
    if(mastery.currentTeachingLevel==="tell")return question;
    if(mastery.currentTeachingLevel==="prompt")return question.replace(/^What /,"Before the next commitment, what ");
    if(mastery.currentTeachingLevel==="question")return question;
    if(mastery.currentTeachingLevel==="hint")return conceptId==="expansion_permission"?"Expansion permission?":"Fresh read?";
    return style==="professor"?question:"";
  }

  function evaluate(){
    const compilation=state.compilation;if(!compilation)return null;
    const plan=compilation.selectedPlan,t=state.clock.gameSecond,map=evidenceMap(t),set=new Set(map.keys());
    const rule=(plan.branchRules||[]).slice().sort((a,b)=>b.priority-a.priority).find(x=>ruleMatches(x,set));
    const step=currentStep(plan,t),scout=currentScout(plan,t),next=nextWindows(plan,t);
    let status=rule?.status||"continue";
    let question=rule?.question||scout?.question||"What information changes the next commitment?";
    let action=rule?.action||step?.action||"Read the battlefield";
    let reason=rule?.reason||step?.purpose||plan.why;
    const concept=scout?.concept||step?.concept||"production_scouting";
    question=adaptQuestion(question,concept,status);
    const confidence=confidenceFor(plan,map);
    const output={
      outputId:uid("output"),generatedAtGameSecond:t,severity:status==="abort"?"emergency":status==="hold"?"override":status==="modify"?"caution":"normal",
      planStatus:status,primaryQuestion:question,primaryAction:action,reason,confidence,
      nextWindows:next.map(x=>({label:x.action,earliestSecond:x.start,latestSecond:x.end})),
      voiceText:rule?.voice||shortVoice(action,status),
      evidenceIds:[...map.values()].map(x=>x.evidenceId),conceptId:concept,activeRuleId:rule?.id||null,
      expiresAtGameSecond:scout?.to||step?.end||null
    };
    const runtime={status,activeStepId:step?.id||null,currentFallbackPlanId:rule?.fallback||null,lastEvaluatedGameSecond:t,statusReason:reason,supportingEvidenceIds:output.evidenceIds,output};
    appendEvent("plan.evaluated",runtime,{source:"compiler",gameSecond:t});
    queueOutputCue(output);
    window.dispatchEvent(new CustomEvent("sc2:strategy-output",{detail:clone(output)}));
    return output;
  }

  function shortVoice(action,status){
    const clean=String(action||"").replace(/\s+/g," ").trim();
    if(status==="abort")return "Plan invalid. Use the safer fallback now.";
    if(status==="hold")return "Hold the plan. Defend and re-evaluate.";
    if(status==="modify")return clean.split(" ").slice(0,11).join(" ");
    return clean.split(" ").slice(0,10).join(" ");
  }

  function queueOutputCue(output){
    const priority=output.severity==="emergency"?100:output.severity==="override"?90:output.severity==="caution"?75:55;
    const hash=`${output.planStatus}:${output.voiceText}`;
    if(hash===state.attention.lastSpokenHash)return;
    const exists=state.attention.queue.some(x=>x.hash===hash);if(exists)return;
    appendEvent("attention.cue_queued",{cueId:uid("cue"),category:output.severity,priority,voiceText:output.voiceText,visualAction:output.primaryAction,visualReason:output.reason,hash,createdGameSecond:state.clock.gameSecond,state:"queued"},{source:"attention"});
  }

  function nextCue(){
    const t=state.clock.gameSecond;
    const rows=state.attention.queue.filter(x=>x.state==="queued").sort((a,b)=>b.priority-a.priority);
    const cue=rows[0];if(!cue)return null;
    const emergency=cue.priority>=90;
    if(!emergency&&t-state.attention.lastSpokenAtGameSecond<30)return null;
    return clone(cue);
  }

  function markCueSpoken(cue){if(!cue)return;appendEvent("attention.cue_spoken",{cueId:cue.cueId,gameSecond:state.clock.gameSecond,hash:cue.hash},{source:"voice"})}

  const COMMAND_PATTERNS=[
    {intent:"ask_status",patterns:["can i still expand","can i still do my plan","is the plan safe","plan status"]},
    {intent:"ask_why",patterns:["why","why this","explain"]},
    {intent:"ask_next",patterns:["what next","next action","what should i do"]},
    {intent:"safer_plan",patterns:["safer plan","make it safer","safe version"]},
    {intent:"greedier_plan",patterns:["greedier plan","faster plan","greedy version"]},
    {intent:"pause",patterns:["pause coach","pause"]},
    {intent:"resume",patterns:["resume coach","resume"]},
    {intent:"clear_evidence",patterns:["clear intel","clear evidence","reset intel"]}
  ];

  function normalizeVoice(text){return String(text||"").toLowerCase().replace(/[.,!?]/g," ").replace(/\s+/g," ").trim()}
  function phraseMatch(text,phrase){return text===phrase||text.includes(phrase)}
  function parseVoice(text,recognitionConfidence=1){
    const normalized=normalizeVoice(text),intents=[];
    COMMAND_PATTERNS.forEach(row=>{if(row.patterns.some(p=>phraseMatch(normalized,p)))intents.push({intent:row.intent})});
    D.SIGNALS.forEach(signal=>{if(signal.voice.some(p=>phraseMatch(normalized,p)))intents.push({intent:"report_evidence",evidenceType:signal.id,label:signal.label})});
    const countMatch=normalized.match(/\b(one|two|three|four|five|six|\d+)\s+(barracks|gateways?|factories|starports?)\b/);
    if(countMatch){
      const word={one:1,two:2,three:3,four:4,five:5,six:6}[countMatch[1]]||+countMatch[1];
      intents.push({intent:"report_evidence",evidenceType:"extra_production",payload:{count:word,structure:countMatch[2]}});
    }
    const race=["protoss","terran","zerg"].find(r=>normalized===r||normalized===`opponent ${r}`);
    if(race)intents.push({intent:"set_opponent_race",race:race[0].toUpperCase()+race.slice(1)});
    const dedup=[];const index=new Map();
    intents.forEach(x=>{
      const k=`${x.intent}:${x.evidenceType||x.race||""}`;
      if(!index.has(k)){index.set(k,dedup.length);dedup.push(x)}
      else if(x.payload){const i=index.get(k);dedup[i]={...dedup[i],payload:{...(dedup[i].payload||{}),...x.payload}}}
    });
    const confidence=clamp(recognitionConfidence,0,1);
    const highImpact=dedup.some(x=>["no_natural","move_out"].includes(x.evidenceType)||x.intent==="clear_evidence");
    const confirmationRequired=confidence<.86||(highImpact&&confidence<.94);
    return {transcriptId:uid("transcript"),rawText:text,normalizedText:normalized,intents:dedup,recognitionConfidence:confidence,contextConfidence:dedup.length?Math.min(1,.68+dedup.length*.1):.15,confirmationRequired,unsupported:dedup.length===0};
  }

  function applyVoice(parsed,confirmed=false){
    if(!parsed||parsed.unsupported)return {applied:false,reason:"No supported voice command was recognized."};
    if(parsed.confirmationRequired&&!confirmed){appendEvent("voice.pending",parsed,{source:"voice"});return {applied:false,confirmationRequired:true,parsed}}
    const results=[];
    parsed.intents.forEach(intent=>{
      if(intent.intent==="report_evidence")results.push(reportEvidence(intent.evidenceType,intent.payload||{},"player_voice",parsed.recognitionConfidence));
      else if(intent.intent==="set_opponent_race"){configure({...state.request,opponentRace:intent.race});results.push(compile(state.request))}
      else if(intent.intent==="safer_plan")results.push(selectVariant("safe"));
      else if(intent.intent==="greedier_plan")results.push(selectVariant("greedy"));
      else if(intent.intent==="pause")pause();
      else if(intent.intent==="resume")resume();
      else if(intent.intent==="clear_evidence")clearEvidence();
      else if(intent.intent==="ask_status"||intent.intent==="ask_next")results.push(evaluate());
      else if(intent.intent==="ask_why")results.push(state.planRuntime?.output||evaluate());
    });
    appendEvent("voice.cleared",{}, {source:"voice"});
    return {applied:true,results};
  }

  function confirmPendingVoice(){const pending=state.pendingVoice;if(!pending)return {applied:false};return applyVoice(pending,true)}
  function dismissPendingVoice(){appendEvent("voice.cleared",{}, {source:"voice"})}

  function reset(){state=defaultState();persist();notify();return getState()}
  function getState(){return clone(state)}
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  function currentOutput(){return clone(state.planRuntime?.output||null)}
  function explain(){const o=state.planRuntime?.output||evaluate();return o?`${o.primaryAction}. ${o.reason}`:"Compile a plan first."}
  function replayEvents(events,request=defaultRequest()){
    const old=state;state=defaultState();state.request={...defaultRequest(),...request};
    events.forEach(e=>{state.eventSequence=Math.max(state.eventSequence,e.sequence||0);reduce(clone(e))});
    const result=getState();state=old;return result;
  }

  window.SC2StrategyEngine={
    STORAGE_KEY,defaultRequest,getState,subscribe,configure,compile,selectVariant,start,pause,resume,setClock,
    reportEvidence,retractEvidence,clearEvidence,activeEvidence,evaluate,currentOutput,explain,
    parseVoice,applyVoice,confirmPendingVoice,dismissPendingVoice,
    recordMastery,masteryFor,nextCue,markCueSpoken,reset,replayEvents
  };
})();
