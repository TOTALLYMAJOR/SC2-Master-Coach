(function(){
 "use strict";
 const byId=id=>document.getElementById(id);
 let observer=null;

 function addLogToggle(zone,logSection){
  const toolbar=logSection.querySelector(".build-log-toolbar");
  if(!toolbar||byId("buildLogVisibility"))return;
  const button=document.createElement("button");
  button.className="hud-btn";
  button.id="buildLogVisibility";
  button.textContent="Show full log";
  button.addEventListener("click",()=>{
   const expanded=zone.classList.toggle("log-expanded");
   button.textContent=expanded?"Compact log":"Show full log";
   button.setAttribute("aria-expanded",String(expanded));
  });
  toolbar.prepend(button);
 }

 function keepReplayTheaterOutsideBuildZone(zone){
  const theater=byId("momentTheater");
  if(theater&&theater.parentElement===zone)zone.after(theater);
 }

 function prioritizeBuildOrder(){
  const command=document.querySelector(".command-center");
  const queue=byId("buildQueue")?.closest("section");
  if(!command||!queue)return false;

  let zone=byId("buildPriorityZone");
  if(!zone){
   zone=document.createElement("section");
   zone.id="buildPriorityZone";
   zone.className="build-priority-zone";
   zone.innerHTML='<div class="build-priority-heading"><div><b>BUILD EXECUTION</b><span>current → next → preparation cue</span></div><div class="build-priority-live"><i></i> ALWAYS VISIBLE</div></div>';
   command.after(zone);
  }

  if(queue.parentElement!==zone){
   queue.classList.add("build-queue-priority");
   zone.appendChild(queue);
  }

  const log=byId("buildLog")?.closest("section");
  if(log){
   log.classList.add("build-log-priority");
   if(log.parentElement!==zone)zone.appendChild(log);
   addLogToggle(zone,log);
  }
  keepReplayTheaterOutsideBuildZone(zone);
  return true;
 }

 function start(){
  prioritizeBuildOrder();
  observer=new MutationObserver(()=>prioritizeBuildOrder());
  observer.observe(document.body,{childList:true,subtree:true});
  let attempts=0;
  const timer=setInterval(()=>{
   prioritizeBuildOrder();
   attempts+=1;
   if(attempts>40&&byId("buildLog"))clearInterval(timer);
  },250);
 }

 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
 else start();
})();
