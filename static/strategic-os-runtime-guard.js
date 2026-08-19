(function(){
  "use strict";
  const K=window.SC2StrategicKernel;
  if(!K)return;

  const originalSetClock=K.setClock.bind(K);
  const originalReset=K.reset.bind(K);
  let lastSecond=null;
  let lastEvaluatedSecond=null;

  K.setClock=function(second,evaluate=false){
    const normalized=Math.max(0,Math.floor(Number(second)||0));
    if(normalized===lastSecond){
      if(evaluate&&lastEvaluatedSecond!==normalized){
        lastEvaluatedSecond=normalized;
        return originalSetClock(normalized,true);
      }
      return K.snapshot();
    }
    lastSecond=normalized;
    if(evaluate)lastEvaluatedSecond=normalized;
    return originalSetClock(normalized,evaluate);
  };

  K.reset=function(){
    lastSecond=null;
    lastEvaluatedSecond=null;
    return originalReset();
  };
})();