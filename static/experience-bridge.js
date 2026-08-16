(function(){
 if(typeof showReplay!=="function")return;
 const coreShowReplay=showReplay;
 showReplay=function(d){
  coreShowReplay(d);
  const p=d?.players?.[0];
  const a=p?d?.analysis_by_player?.[String(p.pid)]:null;
  if(p&&a)window.dispatchEvent(new CustomEvent("sc2:replay",{detail:{data:d,player:p,analysis:a}}));
 };
})();
