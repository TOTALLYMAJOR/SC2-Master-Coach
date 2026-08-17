(function(){
 "use strict";
 const PROFILE_KEY="sc2-master-coach:first-run:v1";
 if(typeof showReplay!=="function")return;
 const bridgedShowReplay=showReplay;
 const normalize=value=>String(value||"").trim().toLowerCase().replace(/#[0-9]+$/," ").trim();
 function profile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||"null")||{}}catch{return {}}}
 function choose(data,forcedPid){
  const players=data?.players||[];
  if(!players.length)return {player:null,reason:"no replay players"};
  if(forcedPid!=null){const p=players.find(x=>+x.pid===+forcedPid);if(p)return {player:p,reason:"confirmed by you"}}
  const saved=profile(),savedName=normalize(saved.replayName);
  if(savedName){const p=players.find(x=>normalize(x.name)===savedName);if(p)return {player:p,reason:"matched your saved replay identity"}}
  const profileName=normalize(saved.name);
  if(profileName){const p=players.find(x=>normalize(x.name)===profileName);if(p)return {player:p,reason:"matched your local profile name"}}
  if(saved.race){const sameRace=players.filter(x=>x.race===saved.race);if(sameRace.length===1)return {player:sameRace[0],reason:"inferred from your unique preferred race — confirm once"}}
  return {player:players[0],reason:"temporary first-player fallback — confirm which player is you"};
 }
 showReplay=function(data,forcedPid){
  if(!data)return;
  const originalPlayers=data.players||[],picked=choose(data,forcedPid),player=picked.player;
  if(!player){bridgedShowReplay(data);return}
  const ordered={...data,players:[player,...originalPlayers.filter(x=>x.pid!==player.pid)]};
  window.__sc2ReplayData=data;
  window.__sc2IdentityReason=picked.reason;
  bridgedShowReplay(ordered);
 };
 window.sc2ShowReplayAs=pid=>{if(window.__sc2ReplayData)showReplay(window.__sc2ReplayData,pid)};
 window.sc2ReplayIdentity=()=>({player:window.__sc2LastReplay?.player||null,reason:window.__sc2IdentityReason||null});
})();
