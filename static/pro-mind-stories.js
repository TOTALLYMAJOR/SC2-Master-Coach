(function(){
  "use strict";

  const stories={
    PvT:{
      id:"false-front",
      title:"The False Front",
      scene:"Your mobile force shows itself on one side of Terran territory. Terran rotates to respect the threat. While their attention and army are pulled right, a Probe establishes the next Nexus on the safer opposite side.",
      beats:["Show a credible threat without committing to a bad fight.","Make Terran spend attention, movement, or defensive units on that threat.","Use the time bought by the rotation to place and power the new Nexus.","Leave before the distraction turns into a donation, then reposition to protect the investment."],
      lesson:"A threat can protect an expansion without dealing damage. Attention, distance, and army displacement are resources.",
      branch:{
        blink:"Blink Stalkers become the screen. Threaten the right edge, force Bio to turn, then use the relocation window to take the third elsewhere. The Stalkers' job is to remain alive enough to come home before the counterattack.",
        stargate:"Air units become the lantern and decoy. Show them over a mineral line or production lane, force anti-air attention, then spend the information and distraction window on economy somewhere Terran is not currently looking.",
        colossus:"The Colossus army becomes the moving wall. Hold a threatening central posture that Terran cannot simply walk through, then use that stable front to make a third Nexus safer behind the army rather than racing the army away from it."
      }
    },
    PvZ:{
      id:"pin-the-larva",
      title:"Pin the Larva",
      scene:"Adepts, Stalkers, or air units appear where Zerg must respect them. Zerg spends larva on Lings, Roaches, Queens, or defensive positioning instead of Drones. Protoss uses the defensive larva cycle to establish the next Nexus.",
      beats:["Create a threat Zerg must answer.","Watch whether the answer is units or workers.","Do not force a prepared surround merely to prove the pressure was real.","Expand while the larva cycle is paying the defensive tax."],
      lesson:"Pressure can be economically successful even when nothing dies. The real target can be the opponent's next production choice."
    },
    PvP:{
      id:"mirror-feint",
      title:"The Mirror Feint",
      scene:"A mobile group threatens one lane and makes the opposing army reveal where it wants to defend. The expansion goes down only after the threat creates local distance and the Protoss army can still return through warp-in geometry.",
      beats:["Threaten where reinforcement favors you.","Make the opponent reveal army position or hidden tech.","Expand only after local superiority is understood.","Keep a recall, warp-in, Battery, or retreat concept for the new footprint."],
      lesson:"In a mirror, the valuable advantage is often local superiority at the exact place and time of the decision."
    },
    TvZ:{
      id:"tax-collector",
      title:"The Tax Collector",
      scene:"Hellions, Reapers, drops, or air pressure show on one side of the creep. Zerg has to make defensive units and move Queens. Terran does not need to dive; the pressure buys a safer Command Center and delays unrestricted Drone production.",
      beats:["Threaten the edge of the economy.","Force army larva, Queen movement, or creep attention.","Keep the pressure units alive when the surround closes.","Add the next Command Center while Zerg pays the defensive tax."],
      lesson:"Terran pressure is often a financing mechanism for Terran economy, not a demand to end the game immediately."
    },
    TvP:{
      id:"split-the-shield",
      title:"Split the Shield",
      scene:"A drop, Raven, or mobile Bio group asks a question in one location while the main army controls another. Protoss must divide attention and expensive units. Terran uses that split to secure the next Command Center or production wave.",
      beats:["Present two problems that cannot both be answered by the same slow army position.","Do not trade the distraction for nothing; preserve Medivacs and mobile Bio.","Use the attention split to expand or reposition the main army.","Rejoin before Protoss can punish the divided forces."],
      lesson:"Multi-prong pressure creates value by dividing attention and defensive geometry, not just by killing workers."
    },
    TvT:{
      id:"siege-the-road",
      title:"Siege the Road, Not the Castle",
      scene:"Tanks and air vision control the route between Terran bases rather than charging the defended main. The opponent must unsiege, rotate, or give up space. Your next Command Center is built behind that controlled road.",
      beats:["Own the next movement lane with vision and siege range.","Force the opponent to reveal or relocate Tanks.","Do not turn positional advantage into a frontal Tank trade.","Expand while the route remains expensive for the opponent to cross."],
      lesson:"In TvT, territory and safe movement can be worth more than direct damage."
    },
    ZvT:{
      id:"creep-curtain",
      title:"The Creep Curtain",
      scene:"Lings, Banes, Queens, and creep make the center of the map dangerous enough that Terran must clear slowly. Behind that curtain, Zerg adds Drones or another Hatchery while preserving the ability to collapse on an overextended push.",
      beats:["Use creep and mobile units as early warning, not merely attack tools.","Make Terran spend scans, time, and positioning to advance.","Drone only while the production read supports it.","Convert the warning time into a surround before the new economy is exposed."],
      lesson:"Map control protects economy by buying warning time and shortening your reinforcement path."
    },
    ZvP:{
      id:"larva-reserve",
      title:"The Larva Reserve",
      scene:"Zerg shows enough units and map presence to prevent Protoss from freely walking across the map. That screen buys a Drone cycle. The next scout then decides whether the following larva cycle stays economic or becomes the army that protects the new base.",
      beats:["Create enough map friction that Protoss cannot attack for free.","Spend one safe larva cycle on economy.","Refresh the Protoss tech and Gateway count.","Turn the next larva cycle into defense before the power spike arrives."],
      lesson:"Zerg expansion safety is often created one larva cycle earlier than the fight itself."
    },
    ZvZ:{
      id:"threaten-drones-buy-drones",
      title:"Threaten Drones, Buy Drones",
      scene:"A small Ling presence threatens the opponent's mineral line and forces respect. You are not required to sacrifice it. If the opponent makes extra Lings to stay safe, your own next larva can become Drones behind the threat.",
      beats:["Show enough speedling threat to force a defensive answer.","Read whether the opponent responds with Lings or Drones.","Avoid donating the threat into a prepared wall or surround.","Use the information advantage to choose your own next larva cycle."],
      lesson:"In ZvZ, a surviving threat can change the opponent's larva allocation and therefore finance your economy."
    }
  };

  function get(matchup,branchId){
    const story=stories[matchup]||null;
    if(!story)return null;
    return {...story,branchText:story.branch?.[branchId]||story.scene};
  }

  window.SC2ProMindStories={all:stories,get};
})();
