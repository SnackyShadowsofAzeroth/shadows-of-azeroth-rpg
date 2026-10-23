(()=>{"use strict";
const data=()=>window.soaDungeonData,definition=id=>data().CATALOG.find(d=>d.id===id),itemInfo=item=>data().ITEMS[item?.name]||null;
const ADVENTURERS=[
 {id:"mira-stoneward",name:"Mira Stoneward",role:"Shieldbearer",className:"Warrior",maxHp:52,armorClass:17,attackBonus:5,damageDie:8,damageBonus:4},
 {id:"kael-quickbranch",name:"Kael Quickbranch",role:"Ranger",className:"Hunter",maxHp:38,armorClass:15,attackBonus:6,damageDie:8,damageBonus:3},
 {id:"yselle-dawnmere",name:"Yselle Dawnmere",role:"Field Healer",className:"Priest",maxHp:42,armorClass:15,attackBonus:5,damageDie:6,damageBonus:3,healer:true}
];
const state=c=>{c.dungeons||={version:1,serial:0,active:null,quests:{},party:[],history:[]};if(!Array.isArray(c.dungeons.party))c.dungeons.party=[];return c.dungeons};
const current=c=>c?.dungeons?.active||null;
const living=c=>(c.enemies||[]).filter(e=>e.hp>0);
const gear=(d,cl,slot)=>Object.values(data().ITEMS).find(i=>i.dungeon===d.id&&i.classes[0]===cl&&i.slot===slot);
const hash=text=>{let h=2166136261;for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const stages=d=>d.bosses.flatMap((boss,index)=>[{id:index*2,boss:null,title:"Approach to "+boss},{id:index*2+1,boss,title:boss}]);
const recruit=id=>ADVENTURERS.find(x=>x.id===id);
function deployParty(c,run){
 const d=definition(run.id),tier=Math.max(0,Math.min(4,Math.floor(((d?.low||10)-13)/12)));
 const members=(run.party||[]).map(id=>{const offer=recruit(id);return offer?{...offer,maxHp:offer.maxHp+tier*4,hp:offer.maxHp+tier*4,armorClass:offer.armorClass+Math.floor(tier/2),attackBonus:offer.attackBonus+Math.floor(tier/2),damageBonus:offer.damageBonus+tier,dungeonGuest:true,dungeonMemberId:id}:null;}).filter(Boolean);
 c.combatAllies=[...(run.homeAllies||[]).slice(0,Math.max(0,6-members.length)),...members];
 c.partyHealth||={};for(const ally of members)c.partyHealth[ally.name]={hp:ally.hp,maxHp:ally.maxHp,derived:false};
}
function entryError(c,s,d,hero,level){
 if(!d)return "Unknown dungeon.";
 if(current(c))return "Finish or leave your current dungeon first.";
 if(living(c).length)return "Disengage from the current encounter first.";
 if(level<d.level)return "Requires level "+d.level+"; recommended "+d.low+"–"+d.high+".";
 if(!data().CLASSES.includes(hero?.className))return "Select a supported character first.";
 if(s.hp<=1)return "Recover your health before entering a dungeon.";
 if(!new RegExp(d.region,"i").test(c.scene?.location||""))return "Travel to "+d.region.split("|")[0]+" or the dungeon entrance first.";
 return null;
}
function scene(c,message){
 const run=current(c);if(!run)return;
 const d=definition(run.id),stage=stages(d)[run.stage],bosses=run.cleared.filter(i=>i%2===1).length;
 c.scene={title:run.status==="complete"?d.name+" — Cleared":run.status==="failed"?"The expedition falters":stage?.title||d.name,location:d.name+" · Sector "+(run.stage+1),story:message+"\n\n"+bosses+" / "+d.bosses.length+" boss encounters cleared. Every boss and its associated minion group must fall before this route is complete.",choices:[],enemies:(c.enemies||[]).map(e=>({...e})),allies:c.combatAllies||[],journal:""};
 c.enemyLocation=c.scene.location;
}
function pull(c,s,hero){
 const run=current(c),d=definition(run.id),stage=stages(d)[run.stage];
 if(!stage||run.status!=="ready"||living(c).length)return {error:"This encounter cannot be started yet."};
 if(["aquatic","travel","flight"].includes(hero.form))return {error:"Return to a combat-capable form before pulling."};
 const lvl=d.low,make=(name,index,boss=false)=>{const hp=boss?45+lvl:16+Math.floor(lvl*.4);return {name,maxHp:hp,hp,armorClass:Math.min(18,11+Math.floor(lvl/15)+(boss?1:0)),attackBonus:Math.min(8,2+Math.floor(lvl/18)+(boss?1:0)),damageDie:boss?8:4,dungeonRun:run.runId,dungeonStage:run.stage,dungeonId:run.runId+":"+run.stage+":"+index,dungeonBoss:boss,dungeonSpecial:boss?(/mage|priest|prophet|warlock|invoker|doan|gandling|arugal|frost|thalnos|kelris|jammal|jargba/i.test(name)?"spell":"fury"):null};};
 c.enemies=stage.boss?[make(stage.boss,0,true),make(d.minions[1]+" Guard",1)]:d.minions.map((name,i)=>make(name+" "+(i+1),i));
 run.status="fighting";run.roster=c.enemies.map(e=>e.dungeonId);
 scene(c,stage.boss?"You confront "+stage.boss+" and a loyal guard. The boss prepares a powerful attack every third round; interrupting it prevents that enemy's response. Choose targets carefully.":"A patrol blocks the route. Both minions must be defeated before you can approach the next boss.");
 s.time++;return {message:"Encounter started: "+stage.title+". No attacks or damage have occurred yet.",spent:true,startEncounter:true};
}
function settle(c,s,event){
 const run=current(c);if(!run||run.status!=="fighting"||!event||event.round!==c.combatRound)return {message:""};
 const foes=(c.enemies||[]).filter(e=>e.dungeonRun===run.runId&&e.dungeonStage===run.stage&&run.roster.includes(e.dungeonId));
 if(foes.length!==run.roster.length)return {error:"Dungeon roster is incomplete. Reload before continuing."};
 if(s.hp<=1&&foes.some(e=>e.hp>0)){run.status="failed";scene(c,"You can no longer hold the line. Retreat to the entrance; this expedition cannot continue. Your existing equipment and collected loot remain yours.");return {message:"Dungeon defeat: retreat required. No clearance or new spoils awarded."};}
 for(const foe of foes)if(foe.dungeonBoss&&foe.hp===0&&!run.loot[foe.dungeonId]){
  const d=definition(run.id),roll=1+hash(run.seed+":"+foe.dungeonId)%100,chance=run.stage===stages(d).length-1?60:35;
  const slot=["weapon","armor","trinket"][hash(foe.dungeonId+":"+run.seed)%3],item=gear(d,run.className,slot);
  run.loot[foe.dungeonId]={boss:foe.name,roll,chance,item:roll<=chance?item.name:null,collected:false,stage:run.stage};
 }
 if(foes.some(e=>e.hp>0))return {message:""};
 if(!run.cleared.includes(run.stage))run.cleared.push(run.stage);
 run.status=run.cleared.length===stages(definition(run.id)).length?"complete":"cleared";
 if(run.status==="complete"){
  const q=state(c).quests[run.id];if(q?.accepted&&!q.claimed)q.completedRun=run.runId;
 }
 const message=run.status==="complete"?"Dungeon cleared: every required boss and minion group is defeated. Search boss spoils, claim your clearance contract, then return to your journey.":"Encounter cleared. Search any boss spoils and make camp before advancing.";
 scene(c,message);return {message,waveCleared:true,complete:run.status==="complete"};
}
function command(c,s,action,hero,level){
 if(window.soaSaveRules?.isIntegrityBlocked?.()||c.pending)return {error:"Resolve the pending save or story action first."};
 const st=state(c),op=action.dungeonAction,d=definition(action.dungeon||st.active?.id),run=st.active;
 if(op==="accept"){
  if(!d||level<d.level)return {error:"You do not meet the dungeon quest's level requirement."};
  if(st.quests[d.id]?.accepted)return {error:"This clearance contract is already accepted."};
  const alreadyCleared=st.active?.id===d.id&&st.active.status==="complete"?st.active.runId:null;
  st.quests[d.id]={accepted:true,claimed:false,completedRun:alreadyCleared};return {message:"Accepted clearance contract: "+d.quest+". Defeat all listed bosses and their minions in one run. One-time reward: a class trinket and "+d.low*20+" copper.",spent:false};
 }
 if(op==="recruit"||op==="dismiss"){
  if(run)return {error:"Your party is committed for this expedition. Change the roster after returning to the entrance."};
  if(!data().CATALOG.some(route=>new RegExp(route.region,"i").test(c.scene?.location||"")))return {error:"Meet adventurers at a dungeon entrance before forming a party."};
  if(!recruit(action.adventurer))return {error:"That adventurer is not available."};
  const present=st.party.includes(action.adventurer);
  if(op==="dismiss"){
   if(!present)return {error:"That adventurer is not in your group."};st.party=st.party.filter(id=>id!==action.adventurer);return {message:recruit(action.adventurer).name+" leaves the group. You can recruit another adventurer here.",spent:false};
  }
  if(present)return {error:"That adventurer has already joined your group."};
  if(st.party.length>=2)return {error:"Your dungeon party is full. Dismiss someone before recruiting another adventurer."};
  st.party.push(action.adventurer);return {message:recruit(action.adventurer).name+" joins your group. Up to two adventurers can accompany you; their health carries through the run.",spent:false};
 }
 if(op==="enter"){
  const err=entryError(c,s,d,hero,level);if(err)return {error:err};
  st.serial++;st.active={id:d.id,runId:"dungeon-"+st.serial,seed:Math.floor(Math.random()*4294967296),className:hero.className,party:st.party.slice(),partyRound:0,homeAllies:structuredClone(c.combatAllies||[]),stage:0,status:"ready",cleared:[],rested:[],loot:{},roster:[],home:structuredClone(c.scene),startedAtTurn:Number(c.turn)||0};if(st.active.party.length)deployParty(c,st.active);
  c.enemies=[];scene(c,"You enter "+d.name+". This full-clear expedition tracks every encounter and saves your progress between decisions. Prepare before pulling the first patrol.");s.time++;return {message:"Entered "+d.name+". No health, resources or equipment granted.",spent:true};
 }
 if(op==="claim"){
  const q=d&&st.quests[d.id];if(!q?.accepted||q.claimed||!q.completedRun)return {error:"Accept the contract and clear every required encounter before claiming."};
  if(living(c).length)return {error:"Finish combat before claiming a contract reward."};
  c.quests||={};c.quests.inventory||=[];if(c.quests.inventory.length>=200)return {error:"Inventory full. The contract reward remains unclaimed."};
  const reward=gear(d,hero.className,"trinket"),amount=d.low*20;if(!reward||!Number.isSafeInteger(s.money)||s.money>Number.MAX_SAFE_INTEGER-amount)return {error:"This character or wallet cannot accept the reward."};
  c.quests.inventory.push({name:reward.name,rarity:reward.rarity,source:"Dungeon clearance: "+d.name});s.money+=amount;q.claimed=true;q.claimedAtTurn=Number(c.turn)||0;s.time++;
  return {message:"Clearance contract paid once: "+amount+" copper and "+reward.name+" added to inventory. Equip rewards in Character → Loadout & Equipment.",spent:true};
 }
 if(!run||!d)return {error:"No dungeon expedition is active."};
 if(d.id!==run.id)return {error:"Choose an action for the active dungeon."};
 if(op==="leave"){
  if(!["complete","failed"].includes(run.status)&&action.confirmed!==true)return {error:"Confirm abandoning the unfinished expedition first."};
  const pending=Object.values(run.loot).some(x=>!x.collected&&x.item);
  if(pending&&action.confirmed!==true)return {error:"Collect your pending boss loot first, or confirm leaving it behind."};
  st.history.push({id:run.id,runId:run.runId,completed:run.status==="complete",bosses:run.cleared.filter(i=>i%2===1).length});st.history=st.history.slice(-20);
  for(const ally of c.combatAllies||[])if(ally.dungeonGuest&&c.partyHealth)delete c.partyHealth[ally.name];
  c.combatAllies=structuredClone(run.homeAllies||[]);c.scene=structuredClone(run.home);c.enemies=[];c.enemyLocation=c.scene?.location||"";st.active=null;s.time++;
  return {message:"Returned to the dungeon entrance and your saved journey. Collected items remain in inventory; the expedition is archived.",spent:true,abandonEncounter:true};
 }
 if(run.status==="failed")return {error:"This expedition failed. Retreat before taking another action."};
 if(op==="pull")return pull(c,s,hero);
 if(living(c).length||run.status==="fighting")return {error:"Defeat the current enemies before searching, resting or advancing."};
 if(op==="next"){
  if(run.status!=="cleared"||!run.cleared.includes(run.stage))return {error:"Clear the current encounter first."};
  run.stage++;run.status="ready";run.roster=[];c.enemies=[];scene(c,"The cleared passage leads onward. Prepare for "+stages(d)[run.stage].title+".");s.time++;return {message:"Advanced to the next encounter. No enemies were skipped or defeated.",spent:true};
 }
 if(op==="rest"){
  if(!run.cleared.includes(run.stage)||run.rested.includes(run.stage))return {error:"You may camp once after each cleared encounter."};
  const max=100+(window.soaRacialAbilities?.passives?.(hero.race)?.maxHp||0),before=s.hp,old=s.en;
  const druid=window.soaDruid?.current?.();
  if(druid){druid.pools.mana=Math.min(100,druid.pools.mana+30);druid.pools.energy=Math.min(100,druid.pools.energy+30);druid.pools.rage=Math.max(0,druid.pools.rage-5);s.en=druid.pools[window.soaDruid.FORMS[druid.form].resource];}
  else s.en=hero.className==="Warrior"?Math.max(0,s.en-5):Math.min(100,s.en+30);
  s.hp=Math.min(max,s.hp+35);let partyHealed=0;for(const ally of c.combatAllies||[])if(ally.dungeonGuest&&ally.hp>0){const amount=Math.min(15,ally.maxHp-ally.hp);ally.hp+=amount;partyHealed+=amount;if(c.partyHealth)c.partyHealth[ally.name]={hp:ally.hp,maxHp:ally.maxHp,derived:false};}run.rested.push(run.stage);s.time++;return {message:"Camp: HP "+before+" → "+s.hp+"; active resource "+old+" → "+s.en+(partyHealed?"; adventurers recover "+partyHealed+" HP":"")+". Mana/Energy recover by up to 30; Rage decays by 5. Camp for this encounter is now spent.",spent:true};
 }
 if(op==="loot"){
  const spoils=Object.values(run.loot).filter(x=>!x.collected);if(!spoils.length)return {error:"No unsearched boss spoils remain."};
  c.quests||={};c.quests.inventory||=[];
  const awards=spoils.filter(x=>x.item);if(c.quests.inventory.length+awards.length>200)return {error:"Inventory full. Make space before collecting; the saved loot rolls remain available."};
  for(const x of spoils){if(x.item)c.quests.inventory.push({name:x.item,rarity:itemInfo({name:x.item}).rarity,source:"Dungeon boss: "+x.boss});x.collected=true;}
  s.time++;return {message:spoils.map(x=>x.boss+": d100 "+x.roll+" vs "+x.chance+"% · "+(x.item?x.item+" added to inventory; equip it yourself.":"No equipment drop.")).join(" "),spent:true};
 }
 return {error:"Unknown dungeon action."};
}
function resolveParty(c,s,event,hero,rules){
 const run=current(c);if(!run||run.status!=="fighting"||!run.party?.length||!event||event.round!==c.combatRound||run.partyRound>=event.round)return null;
 run.partyRound=event.round;const members=(c.combatAllies||[]).filter(a=>a.dungeonGuest&&a.hp>0),outcomes=[],encounter=c.xpEncounter;
 const heroMax=100+(window.soaRacialAbilities?.passives?.(hero?.race)?.maxHp||0),wounded=[{name:hero?.name||"Your hero",hp:s.hp,maxHp:heroMax,player:true},...(c.combatAllies||[]).filter(a=>Number.isInteger(a.hp)&&a.hp>0&&a.maxHp>0).map(a=>({...a,player:false}))].filter(a=>a.hp<a.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
 for(const ally of members){
  if(!living(c).length)break;
  if(ally.healer&&wounded[0]&&wounded[0].hp/wounded[0].maxHp<.8){
   const target=wounded[0],amount=rules.damage(8,3),before=target.player?s.hp:(c.combatAllies.find(a=>a.name===target.name)?.hp||0),after=Math.min(target.maxHp,before+amount),actual=after-before;
   if(target.player)s.hp=after;else{const recipient=c.combatAllies.find(a=>a.name===target.name);recipient.hp=after;if(c.partyHealth)c.partyHealth[target.name]={hp:after,maxHp:recipient.maxHp,derived:false};}
   outcomes.push({actor:ally.name,kind:"heal",target:target.name,amount:actual,before,after});target.hp=after;
   const ev=(c.combatLog||[]).at(-1)?.events;if(ev)ev.push({name:ally.name,side:"ally",delta:actual,after,maxHp:target.maxHp});continue;
  }
  const target=living(c).find(e=>e.name===event.target)||living(c)[0],block=rules.statBlock(target),roll=rules.attack(ally.attackBonus,block.ac),raw=rules.damage(ally.damageDie,ally.damageBonus),damage=roll.hit?Math.min(target.hp,rules.mitigate(raw,"physical",block)):0,before=target.hp;
  target.hp=Math.max(0,target.hp-damage);outcomes.push({actor:ally.name,kind:"attack",target:target.name,hit:!!roll.hit,roll:roll.die,total:roll.total,ac:block.ac,damage,before,after:target.hp});
  const ev=(c.combatLog||[]).at(-1)?.events;if(ev)ev.push({name:target.name,side:"enemy",delta:-damage,after:target.hp,maxHp:target.maxHp,source:ally.name});
  if(before>0&&target.hp===0){window.soaQuests?.onDefeat?.(c,target.name);if(encounter&&!encounter.defeated.some(e=>e.name===target.name))encounter.defeated.push({name:target.name,maxHp:target.maxHp});event.defeatedTargets||=[];event.defeatedTargets.push({name:target.name,maxHp:target.maxHp});c.defeatedEnemies||=[];c.defeatedEnemies.push(String(c.enemyLocation||c.scene?.location||"")+"|"+target.name.toLowerCase());c.defeatedEnemies=c.defeatedEnemies.slice(-80);}
 }
 if(!outcomes.length)return null;
 if(encounter&&!living(c).length)encounter.pendingVictory=true;
 event.partyActions=outcomes;event.details||=[];event.details.push(...outcomes.map(x=>x.kind==="heal"?x.actor+" heals "+x.target+" for "+x.amount+" HP ("+x.before+" → "+x.after+").":x.actor+" attacks "+x.target+": "+(x.hit?"hit for "+x.damage+" damage":"missed")+" (d20 "+x.roll+" + "+(x.total-x.roll)+" = "+x.total+" vs AC "+x.ac+")."));
 return outcomes.map(x=>x.kind==="heal"?x.actor+" heals "+x.target+" for "+x.amount+" HP.":x.actor+(x.hit?" hits "+x.target+" for "+x.damage+" damage.":" misses "+x.target+".")).join(" ");
}
function panel(c,s,hero,level,choose,busy=false){
 const root=document.createElement("details");root.className="soa-dungeon-panel";root.open=!!current(c);
 const el=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
 const button=(text,op,id,disabled=false,extra={})=>{const b=el("button",text);b.type="button";b.disabled=busy||disabled;b.onclick=()=>{const confirmed=op==="leave"?window.confirm("Return to the entrance? Unfinished progress and unclaimed boss loot will be left behind."):false;if(op==="leave"&&!confirmed)return;choose({dungeonAction:op,dungeon:id,confirmed,text,type:"dungeon",...extra});};return b;};
 root.append(el("summary",current(c)?"Dungeon expedition · "+definition(current(c).id).name:"Dungeons · Classic Era · 26 routes"));
 const run=current(c);
 if(run){
  const d=definition(run.id),q=state(c).quests[run.id];
  root.append(el("p",run.cleared.length+" / "+stages(d).length+" encounters cleared · "+run.status+" · progress saves after every action"));
  if(run.party?.length)root.append(el("p","Your group · "+run.party.map(id=>recruit(id)?.name).filter(Boolean).join(" · ")+" · adventurers act after the enemy response each exchange; camp restores some of their health too."));
  const checklist=document.createElement("details");checklist.append(el("summary","Boss and minion checklist"));d.bosses.forEach((boss,i)=>checklist.append(el("p",(run.cleared.includes(i*2)?"✓":"○")+" Minion patrol · "+(run.cleared.includes(i*2+1)?"✓":"○")+" "+boss+" and guard")));root.append(checklist);
  const rewards=Object.values(run.loot);if(rewards.length){const ledger=document.createElement("details");ledger.append(el("summary","Boss loot ledger · "+rewards.length));for(const row of rewards)ledger.append(el("p",row.boss+" · roll "+row.roll+" / "+row.chance+"% · "+(row.item||"No drop")+(row.collected?" · searched":" · unsearched")));root.append(ledger);}
  if(!q?.accepted)root.append(button("Accept clearance contract","accept",d.id));
  if(run.status==="ready")root.append(button("Pull next encounter","pull",d.id));
  if(["cleared","complete"].includes(run.status)){
   root.append(button("Search boss spoils","loot",d.id,!rewards.some(x=>!x.collected)),button("Make camp · +35 HP · once per cleared encounter","rest",d.id,run.rested.includes(run.stage)));
   if(run.status==="cleared")root.append(button("Advance through cleared passage","next",d.id));
   if(run.status==="complete"&&q?.accepted)root.append(button(q.claimed?"Clearance reward claimed":"Claim clearance contract reward","claim",d.id,q.claimed));
  }
  root.append(button(run.status==="failed"?"Retreat to entrance":"Return to entrance","leave",d.id));return root;
 }
 root.append(el("p","Travel to the dungeon's region to enter. Level gates and recommended Classic ranges are shown below. Fixed full-clear routes include all listed bosses plus two minions and a boss guard per sector. Rare spawns, class summon chains and WoW key puzzles are not reproduced. Boss drop chances: 35%, final boss 60%. Gear statistics are adapted to this game's combat rules."));
 const lobby=state(c),located=data().CATALOG.find(route=>new RegExp(route.region,"i").test(c.scene?.location||""));
 const group=document.createElement("section");group.className="soa-dungeon-party";
 group.append(el("h4",located?"Adventurers at the entrance":"Dungeon party"));
 if(located){group.append(el("p","A few independent adventurers are looking for a group near "+located.name+". Recruit up to two; they act after the enemy response each exchange and can be hurt or downed during the run."));
  if(lobby.party.length)group.append(el("p","Your group · "+lobby.party.map(id=>recruit(id)?.name).filter(Boolean).join(" · ")));
  for(const member of ADVENTURERS){const joined=lobby.party.includes(member.id),row=document.createElement("div");row.className="soa-dungeon-recruit";row.append(el("strong",member.name+" · "+member.role),el("p",member.className+" · "+member.maxHp+" HP · AC "+member.armorClass+" · "+(member.healer?"heals the most wounded ally or casts Smite":"attacks once after your turn")));
   row.append(button(joined?"Leave group":"Recruit "+member.name,joined?"dismiss":"recruit",located.id,!joined&&lobby.party.length>=2,{adventurer:member.id}));group.append(row);
  }
  if(!lobby.party.length)group.append(el("p","You can enter alone. Joining is optional."));
 }else group.append(el("p","Travel to a dungeon entrance to meet adventurers and set your group. You can still enter alone."));
 root.append(group);
 for(const d of data().CATALOG){const entry=document.createElement("details");entry.append(el("summary",d.name+" · level "+d.level+"+ · recommended "+d.low+"–"+d.high));entry.append(el("p",d.bosses.length+" bosses · "+stages(d).length+" encounters · approach from "+d.region.split("|")[0]),el("p",d.bosses.join(" → ")));
  const error=entryError(c,s,d,hero,level);if(error)entry.append(el("p",error));entry.append(button("Enter "+d.name,"enter",d.id,!!error));const q=state(c).quests[d.id];if(!q?.accepted)entry.append(button("Accept clearance contract","accept",d.id,level<d.level));else if(q.completedRun&&!q.claimed)entry.append(button("Claim clearance contract reward","claim",d.id));else entry.append(el("p",q.claimed?"✓ Clearance contract rewarded":"Clearance contract accepted"));root.append(entry);}
 return root;
}
function questPanel(c){
 const ledger=c?.dungeons?.quests;if(!ledger||!Object.keys(ledger).length)return null;
 const root=document.createElement("section"),title=document.createElement("h3");title.textContent="Dungeon clearance contracts";root.append(title);
 for(const [id,q] of Object.entries(ledger)){const d=definition(id);if(!d)continue;const p=document.createElement("p");p.textContent=(q.claimed?"✓ ":"○ ")+d.quest+" · "+(q.claimed?"Reward claimed":q.completedRun?"Route cleared; claim reward from the dungeon board":"Defeat every boss and minion group in one run");root.append(p);}return root;
}
window.soaDungeons={definition,itemInfo,state,current,stages,entryError,command,settle,resolveParty,scene,panel,questPanel,ADVENTURERS};
})();
