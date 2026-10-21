(()=>{"use strict";
// Offline-deterministic bounty ledger. No AI text can pay currency or manufacture loot.
const BOARDS=[
 {region:/stormwind|old town|elwynn/i,place:"Stormwind Bounty Board",contracts:[
  {id:"sw-defias",title:"Defias Saboteur",target:"Defias Saboteur",description:"A wanted Defias explosives specialist operating near Old Town.",copper:12500,level:8,rarity:"standard",items:["SI:7 Supply Voucher"]},
  {id:"sw-smuggler",title:"Dockside Smuggler",target:"Dockside Smuggler",description:"Wanted for trafficking stolen military supplies.",copper:8700,level:6,rarity:"standard",items:[]},
  {id:"sw-master",title:"The Masked Defias Captain",target:"Masked Defias Captain",description:"Dangerous veteran commander. High-risk bounty.",copper:50000,level:14,rarity:"elite",items:["Captain's Signet","Defias Shadowblade"]}]},
 {region:/darkshire|duskwood|raven hill/i,place:"Darkshire Bounty Board",contracts:[
  {id:"dw-grave",title:"Raven Hill Grave-Robber",target:"Raven Hill Grave-Robber",description:"A grave robber supplying a necromantic circle.",copper:7800,level:6,rarity:"standard",items:[]},
  {id:"dw-ghoul",title:"The Rotting Ghoul",target:"Rotting Ghoul",description:"An undead predator stalking the cemetery.",copper:14600,level:9,rarity:"standard",items:["Purified Bone Charm"]},
  {id:"dw-wraith",title:"Wraith of the Blackwood",target:"Wraith of the Blackwood",description:"Extremely dangerous spectral bounty.",copper:54000,level:15,rarity:"elite",items:["Wraithbound Trinket"]}]},
 {region:/ironforge|dun morogh/i,place:"Ironforge Bounty Board",contracts:[
  {id:"if-bandit",title:"Mountain Pass Bandit",target:"Mountain Pass Bandit",description:"A robber attacking supply caravans.",copper:9400,level:7,rarity:"standard",items:[]},
  {id:"if-golem",title:"Runaway War Golem",target:"Runaway War Golem",description:"A lethal machine loose in the mountain passes.",copper:57000,level:15,rarity:"elite",items:["Reinforced Gear","Ironforge Warhammer"]}]},
 {region:/darnassus|teldrassil/i,place:"Darnassus Bounty Board",contracts:[
  {id:"da-poacher",title:"Ashenvale Poacher",target:"Ashenvale Poacher",description:"A poacher has been taking protected wildlife near the forest paths.",copper:10200,level:7,rarity:"standard",items:[]},
  {id:"da-satyr",title:"Satyr Corruptor",target:"Satyr Corruptor",description:"A satyr is threatening travelers at the edge of the forest.",copper:28500,level:11,rarity:"standard",items:["Moonwell Salve"]}]},
 {region:/exodar|azuremyst|bloodmyst/i,place:"The Exodar Bounty Board",contracts:[
  {id:"ex-raider",title:"Azuremyst Raider",target:"Azuremyst Raider",description:"A raider has been ambushing supply runners on Azuremyst Isle.",copper:9800,level:7,rarity:"standard",items:[]},
  {id:"ex-crystal",title:"Corrupted Crystal Stalker",target:"Corrupted Crystal Stalker",description:"A dangerous creature is drawn to unstable crystal fragments.",copper:26000,level:10,rarity:"standard",items:["Stabilized Crystal Shard"]}]},
 {region:/orgrimmar|durotar/i,place:"Orgrimmar Bounty Board",contracts:[
  {id:"og-scrapper",title:"Valley Scrapper",target:"Valley Scrapper",description:"A scavenger gang is stealing tools from the Valley of Honor.",copper:9200,level:6,rarity:"standard",items:[]},
  {id:"og-raider",title:"Drygulch Raider Captain",target:"Drygulch Raider Captain",description:"A raider captain has been attacking caravans outside the city.",copper:27500,level:11,rarity:"standard",items:["Caravan Guard's Token"]}]},
 {region:/thunder bluff|mulgore/i,place:"Thunder Bluff Bounty Board",contracts:[
  {id:"tb-poacher",title:"Mulgore Poacher",target:"Mulgore Poacher",description:"A poacher is hunting on the rolling plains without regard for the local herds.",copper:9000,level:6,rarity:"standard",items:[]},
  {id:"tb-bristleback",title:"Bristleback Ravager",target:"Bristleback Ravager",description:"A Bristleback raider has been threatening travelers near the bluffs.",copper:25500,level:10,rarity:"standard",items:["Kodo-Leather Bracers"]}]},
 {region:/undercity|tirisfal/i,place:"Undercity Bounty Board",contracts:[
  {id:"uc-graverobber",title:"Tirisfal Graverobber",target:"Tirisfal Graverobber",description:"A grave robber is disturbing burial sites north of the city.",copper:9400,level:6,rarity:"standard",items:[]},
  {id:"uc-scourge",title:"Scourge Remnant",target:"Scourge Remnant",description:"A lingering Scourge threat has been seen among the ruins of Tirisfal.",copper:29000,level:11,rarity:"standard",items:["Forsaken Field Dressing"]}]},
 {region:/brill/i,place:"Brill Bounty Board",contracts:[
  {id:"brill-ghoul",title:"Brill Cemetery Ghoul",target:"Brill Cemetery Ghoul",description:"A ghoul has been prowling the cemetery beyond the town's lanterns.",copper:8200,level:5,rarity:"standard",items:[]},
  {id:"brill-scavenger",title:"Tirisfal Grave Scavenger",target:"Tirisfal Grave Scavenger",description:"A scavenger is looting fresh graves outside Brill.",copper:15000,level:8,rarity:"standard",items:["Forsaken Grave Dust"]}]},
 {region:/silvermoon|eversong|ghostlands/i,place:"Silvermoon City Bounty Board",contracts:[
  {id:"sm-thief",title:"Eversong Relic Thief",target:"Eversong Relic Thief",description:"A relic thief has been targeting homes along the Eversong roads.",copper:11000,level:7,rarity:"standard",items:[]},
  {id:"sm-felstalker",title:"Fel-Touched Stalker",target:"Fel-Touched Stalker",description:"A fel-touched beast has been sighted beyond the city patrols.",copper:30000,level:12,rarity:"standard",items:["Sunfury Warding Charm"]}]},
 {region:/crossroads|barrens/i,place:"The Crossroads Bounty Board",contracts:[
  {id:"cr-harpy",title:"Windfury Harpy",target:"Windfury Harpy",description:"Harpy raiders have been harassing caravans on the Barrens road.",copper:8500,level:6,rarity:"standard",items:[]},
  {id:"cr-kolkar",title:"Kolkar Outrider",target:"Kolkar Outrider",description:"A Kolkar outrider has been scouting the Crossroads approaches.",copper:18500,level:9,rarity:"standard",items:["Barrens Trail Rations"]}]},
 {region:/razor hill|echo isles/i,place:"Razor Hill Bounty Board",contracts:[
  {id:"rh-quilboar",title:"Dreadmaul Quilboar",target:"Dreadmaul Quilboar",description:"A quilboar raider has been threatening the roads south of Durotar.",copper:7800,level:5,rarity:"standard",items:[]},
  {id:"rh-scout",title:"Dustwind Scout",target:"Dustwind Scout",description:"A hostile scout has been watching the settlement's supply route.",copper:16000,level:8,rarity:"standard",items:["Durotar Scout's Band"]}]}
];
const format=n=>{const c=Math.max(0,Math.floor(n));return [Math.floor(c/10000)+"g",Math.floor(c%10000/100)+"s",c%100+"c"].join(" ")};
const boardAt=location=>BOARDS.find(b=>b.region.test(String(location||"")));
const definition=id=>BOARDS.flatMap(b=>b.contracts).find(c=>c.id===id);
const ensure=campaign=>{
 if(!campaign||typeof campaign!=="object")return null;
 if(!campaign.quests||typeof campaign.quests!=="object"||Array.isArray(campaign.quests))campaign.quests={};
 const q=campaign.quests;
 for(const key of ["accepted","completed","claimed","missions"]){if(!q[key]||typeof q[key]!=="object"||Array.isArray(q[key]))q[key]={}}
 for(const key of ["accepted","completed","claimed","missions"])for(const [id,value] of Object.entries(q[key]))if(!value||typeof value!=="object"||Array.isArray(value))delete q[key][id];
 if(!Array.isArray(q.inventory))q.inventory=[];
 q.inventory=q.inventory.filter(item=>item&&typeof item==="object"&&typeof item.name==="string").map(item=>({name:item.name.slice(0,80),source:typeof item.source==="string"?item.source.slice(0,90):"Unknown",rarity:typeof item.rarity==="string"?item.rarity:"common"})).slice(-200);
 if(!Array.isArray(q.receipts))q.receipts=[];
 q.receipts=q.receipts.filter(receipt=>typeof receipt==="string").slice(-500);
 if(!Array.isArray(q.rewardHistory))q.rewardHistory=[];
 q.rewardHistory=q.rewardHistory.filter(reward=>reward&&typeof reward.title==="string"&&Number.isSafeInteger(reward.copper)&&reward.copper>=0&&Array.isArray(reward.items)&&reward.items.every(item=>typeof item==="string")).slice(-60);
 if(!q.lastReward||typeof q.lastReward!=="object"||typeof q.lastReward.title!=="string"||!Number.isSafeInteger(q.lastReward.copper)||q.lastReward.copper<0||!Array.isArray(q.lastReward.items)||!q.lastReward.items.every(item=>typeof item==="string"))q.lastReward=null;
 return q;
};
const stableRare=(characterId,id)=>{let h=2166136261;for(const c of String(characterId)+"|"+id)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h%50===0}; // 2% per character and elite contract; stable across retries
function accept(campaign,id,location){
 const b=boardAt(location),contract=b?.contracts.find(c=>c.id===id);
 if(!contract)return {error:"Find this contract at its local bounty board."};
 const q=ensure(campaign);if(q.accepted[id]||q.claimed[id])return {error:"Contract already accepted or claimed."};
 q.accepted[id]={started:campaign.turn||0,location:String(location).slice(0,90)};
 return {message:"Accepted: "+contract.title+". Reward on verified completion: "+format(contract.copper)+(contract.items.length?" + "+contract.items.join(", "):"")};
}
function onDefeat(campaign,enemy){
 const q=ensure(campaign),name=String(enemy||"").trim().toLowerCase();
 for(const id of Object.keys(q.accepted)){const c=definition(id);if(c&&c.target.toLowerCase()===name&&!q.completed[id])q.completed[id]={turn:campaign.turn||0,target:c.target};}
 missionDefeat(campaign,name);
}
function claim(campaign,id,location,wallet){
 const board=boardAt(location),contract=board?.contracts.find(c=>c.id===id);
 const q=ensure(campaign);
 if(!contract||!q.accepted[id]||!q.completed[id]||q.claimed[id])return {error:"Return to the issuing board after defeating the tracked target."};
 if(!Number.isSafeInteger(wallet)||wallet<0||wallet+contract.copper>Number.MAX_SAFE_INTEGER)return {error:"Wallet value invalid. Payment not issued."};
 const characterId=window.soaCharacters?.profile?.()?.id||"snacky";
 const rare=contract.rarity==="elite"&&stableRare(characterId,id)?"Rare Bounty Relic":null;
 const items=[...contract.items,...(rare?[rare]:[])];
 const receipt="bounty:"+id;
 if(q.receipts.includes(receipt))return {error:"Already paid."};
 q.receipts.push(receipt);q.receipts=q.receipts.slice(-500);
 q.claimed[id]={turn:campaign.turn||0,amount:contract.copper,items};
 q.inventory.push(...items.map(name=>({name,source:contract.title,rarity:name===rare?"rare":"common"})));
 q.lastReward={title:contract.title,copper:contract.copper,items,receipt,atTurn:campaign.turn||0};
 q.rewardHistory||=[];q.rewardHistory.push(q.lastReward);q.rewardHistory=q.rewardHistory.slice(-60);
 return {copper:contract.copper,items,wallet:wallet+contract.copper,description:"The bounty clerk counts "+format(contract.copper)+" into your purse"+(items.length?" and issues "+items.join(", "):"")+". Verified payout."};
}
// User-confirmed completed Stormwind explosives operation: one 5g party award.
// Currency is deposited once into the existing shared campaign wallet.
const STORMWIND_MISSION="mission:stormwind-explosives-defused:v1";
function grantStormwindMission(campaign,wallet){
 const q=ensure(campaign);
 if(q.claimed[STORMWIND_MISSION]||q.receipts.includes(STORMWIND_MISSION))return {alreadyPaid:true};
 const amount=50000;
 if(!Number.isSafeInteger(wallet)||wallet<0||wallet>Number.MAX_SAFE_INTEGER-amount)return {error:"Invalid wallet balance. Mission payment not applied."};
 const reward={title:"Stormwind Explosives — Mission Completed",copper:amount,items:[],receipt:STORMWIND_MISSION,atTurn:campaign.turn||0};
 q.claimed[STORMWIND_MISSION]={turn:campaign.turn||0,amount,items:[],partyTotal:true};
 q.receipts.push(STORMWIND_MISSION);q.receipts=q.receipts.slice(-500);
 q.lastReward=reward;
 q.rewardHistory||=[];q.rewardHistory.push(reward);q.rewardHistory=q.rewardHistory.slice(-60);
 return {wallet:wallet+amount,copper:amount,items:[],description:"SI:7 quartermaster: \"Five gold for your entire crew, Lugnuts. Stormwind owes you all a debt.\" Party mission reward: +5g 0s 0c."};
}

// Engine-authored mission contracts: AI cannot invent payout values or complete objectives.
const MISSIONS=[
 {id:"si7-intelligence",title:"SI:7 Intelligence Courier",issuer:"SI:7 Handler",region:/stormwind|old town/i,objective:{kind:"defeat",target:"Defias Intelligence Courier"},reward:{copper:18000,items:[{name:"Sealed SI:7 Field Kit",rarity:"uncommon",slot:"trinket"}]},description:"Intercept the named Defias courier and return to the SI:7 handler."},
 {id:"duskwood-necromancer",title:"Raven Hill Necromancer",issuer:"Darkshire Watch",region:/darkshire|duskwood|raven hill/i,objective:{kind:"defeat",target:"Raven Hill Necromancer"},reward:{copper:24500,items:[{name:"Consecrated Silver Pendant",rarity:"uncommon",slot:"trinket"}]},description:"Defeat the named necromancer and return to the Darkshire Watch."},
 {id:"ironforge-saboteur",title:"Ironforge Supply Sabotage",issuer:"Ironforge Quartermaster",region:/ironforge|dun morogh/i,objective:{kind:"defeat",target:"Mountain Saboteur"},reward:{copper:21000,items:[{name:"Reinforced Explorer's Gloves",rarity:"uncommon",slot:"armor"}]},description:"Defeat the wanted saboteur and return to the quartermaster."}
];
function journal(campaign){const q=ensure(campaign);q.missions||={};q.rewardHistory||=[];return q}
function missionById(id){return MISSIONS.find(m=>m.id===id)}
function startMission(campaign,id,location){
 const mission=missionById(id),q=journal(campaign);
 if(!mission||!mission.region.test(String(location||"")))return {error:"This mission is not offered here."};
 if(q.missions[id])return {error:"Mission already recorded."};
 q.missions[id]={state:"active",started:campaign.turn||0};
 return {message:"Mission accepted: "+mission.title+" · "+format(mission.reward.copper)+(mission.reward.items.length?" + "+mission.reward.items.map(x=>x.name).join(", "):"")+". Objective: "+mission.description};
}
function missionDefeat(campaign,name){
 const q=journal(campaign);
 for(const [id,state] of Object.entries(q.missions)){
  const m=missionById(id);
  if(state.state==="active"&&m&&m.objective.kind==="defeat"&&m.objective.target.toLowerCase()===String(name).toLowerCase()){
   state.state="completed";state.completed=campaign.turn||0;state.proof=m.objective.target;
  }
 }
}
function claimMission(campaign,id,location,wallet){
 const q=journal(campaign),m=missionById(id),entry=q.missions[id];
 if(!m||!entry||entry.state!=="completed"||!m.region.test(String(location||"")))return {error:"The mission must be verified and returned to its issuing region."};
 if(!Number.isSafeInteger(wallet)||wallet<0||wallet>Number.MAX_SAFE_INTEGER-m.reward.copper)return {error:"Invalid wallet value."};
 const receipt="mission:"+id;
 if(q.receipts.includes(receipt))return {error:"Already paid."};
 const items=m.reward.items.map(item=>({...item,source:m.title}));
 const reward={title:m.title,copper:m.reward.copper,items:items.map(x=>x.name),receipt,atTurn:campaign.turn||0,issuer:m.issuer};
 q.receipts.push(receipt);q.receipts=q.receipts.slice(-500);
 entry.state="claimed";entry.reward=reward;
 q.inventory.push(...items);q.rewardHistory.push(reward);q.rewardHistory=q.rewardHistory.slice(-60);q.lastReward=reward;
 return {wallet:wallet+m.reward.copper,copper:m.reward.copper,items:reward.items,description:m.issuer+": \"Your verified mission payment is "+format(m.reward.copper)+".\" "+(items.length?"Additional equipment: "+items.map(x=>x.name).join(", ")+".":"")};
}
function missionPanel(campaign,location,wallet,onChange){
 const q=journal(campaign),el=document.createElement("details");
 const h=document.createElement("summary");h.textContent="Mission Journal & Rewards";el.append(h);
 for(const m of MISSIONS){
  const record=q.missions[m.id];
  if(!record&&!m.region.test(String(location||"")))continue;
  const row=document.createElement("div");row.style.cssText="border-top:1px solid #a48b68;padding:9px 0";
  const title=document.createElement("strong");title.textContent=m.title;row.append(title);
  const desc=document.createElement("p");desc.textContent=m.description+" · Reward "+format(m.reward.copper)+(m.reward.items.length?" + "+m.reward.items.map(x=>x.name).join(", "):"");row.append(desc);
  const button=document.createElement("button");button.type="button";
  button.textContent=record?.state==="claimed"?"Paid":record?.state==="completed"?"Claim verified mission reward":record?"In progress":"Accept mission";
  button.disabled=record?.state==="claimed"||record?.state==="active"||!m.region.test(String(location||""));
  button.onclick=()=>onChange(record?.state==="completed"?claimMission(campaign,m.id,location,wallet()):startMission(campaign,m.id,location));row.append(button);el.append(row);
 }
 const history=document.createElement("details"),hd=document.createElement("summary");hd.textContent="Payment history · "+q.rewardHistory.length+" receipts";history.append(hd);
 for(const reward of q.rewardHistory.slice().reverse().slice(0,25)){const line=document.createElement("p");line.textContent=reward.title+" · +"+format(reward.copper)+(reward.items?.length?" · "+reward.items.join(", "):"");history.append(line)}
 el.append(history);return el;
}
function panel(campaign,location,wallet,onChange){
 const q=ensure(campaign),board=boardAt(location),wrapper=document.createElement("details");
 wrapper.className="soa-bounty-board";const summary=document.createElement("summary");summary.textContent="Contracts & Bounties"+(board?" · "+board.place:"");wrapper.append(summary);
 const intro=document.createElement("p");intro.textContent=board?"The posted rewards are fixed before acceptance. Defeat the named target, then return to this issuing board to claim.":"Bounty boards are posted in Stormwind, Ironforge, Darnassus, the Exodar, Orgrimmar, Thunder Bluff, Undercity, Silvermoon City, Darkshire, Brill, the Crossroads, and Razor Hill. Accepted contracts travel with you.";wrapper.append(intro);
 const makeText=txt=>{const p=document.createElement("p");p.textContent=txt;wrapper.append(p)};
 for(const id of Object.keys(q.accepted)){const c=definition(id);if(c&&!board?.contracts.includes(c))makeText(c.title+" · "+(q.claimed[id]?"Paid":q.completed[id]?"Ready to claim at issuing board":"Active"))}
 if(board)for(const c of board.contracts){
 const card=document.createElement("div");card.style.cssText="padding:12px 0;border-top:1px solid #a38b67";
 const title=document.createElement("strong");title.textContent=c.title+(c.rarity==="elite"?" · Elite":"");card.append(title);
 const info=document.createElement("p");info.textContent=c.description+" Reward: "+format(c.copper)+(c.items.length?" + "+c.items.join(", "):"")+".";card.append(info);
 const button=document.createElement("button");button.type="button";
 button.textContent=q.claimed[c.id]?"Paid":q.completed[c.id]?"Claim verified reward":q.accepted[c.id]?"Active · target not defeated":"Accept contract";
 button.disabled=Boolean(q.claimed[c.id]||(q.accepted[c.id]&&!q.completed[c.id]));
 button.onclick=()=>{const result=q.completed[c.id]?claim(campaign,c.id,location,wallet()):accept(campaign,c.id,location);onChange(result);};
 card.append(button);wrapper.append(card);
 }
 if(q.lastReward)makeText("Latest verified payout: "+q.lastReward.title+" · +"+format(q.lastReward.copper)+(q.lastReward.items.length?" · Items: "+q.lastReward.items.join(", "):""));
 if(q.inventory.length){const bag=document.createElement("details");const head=document.createElement("summary");head.textContent="Reward inventory · "+q.inventory.length+" items";bag.append(head);for(const item of q.inventory){const p=document.createElement("p");p.textContent=item.name+" ("+item.rarity+") · "+item.source;bag.append(p)}wrapper.append(bag)}
 return wrapper;
}
window.soaQuests={boardAt,definition,ensure,accept,onDefeat,claim,grantStormwindMission,panel,missionPanel,startMission,claimMission,missionDefeat,journal,format,stableRare};
})();
