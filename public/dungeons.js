(()=>{"use strict";
const data=()=>window.soaDungeonData,definition=id=>data().CATALOG.find(d=>d.id===id),itemInfo=item=>data().ITEMS[item?.name]||null;
const state=c=>{c.dungeons||={version:1,serial:0,active:null,quests:{},history:[]};return c.dungeons};
const current=c=>c?.dungeons?.active||null;
const living=c=>(c.enemies||[]).filter(e=>e.hp>0);
const gear=(d,cl,slot)=>Object.values(data().ITEMS).find(i=>i.dungeon===d.id&&i.classes[0]===cl&&i.slot===slot);
const hash=text=>{let h=2166136261;for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const stages=d=>d.bosses.flatMap((boss,index)=>[{id:index*2,boss:null,title:"Approach to "+boss},{id:index*2+1,boss,title:boss}]);
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
 if(s.hp<=1){run.status="failed";scene(c,"You can no longer hold the line. Retreat to the entrance; this expedition cannot continue. Your existing equipment and collected loot remain yours.");return {message:"Dungeon defeat: retreat required. No clearance or new spoils awarded."};}
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
 if(op==="enter"){
  const err=entryError(c,s,d,hero,level);if(err)return {error:err};
  st.serial++;st.active={id:d.id,runId:"dungeon-"+st.serial,seed:Math.floor(Math.random()*4294967296),className:hero.className,stage:0,status:"ready",cleared:[],rested:[],loot:{},roster:[],home:structuredClone(c.scene),startedAtTurn:Number(c.turn)||0};
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
  c.scene=structuredClone(run.home);c.enemies=[];c.enemyLocation=c.scene?.location||"";st.active=null;s.time++;
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
  s.hp=Math.min(max,s.hp+35);run.rested.push(run.stage);s.time++;return {message:"Camp: HP "+before+" → "+s.hp+"; active resource "+old+" → "+s.en+". Mana/Energy recover by up to 30; Rage decays by 5. Camp for this encounter is now spent.",spent:true};
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
function panel(c,s,hero,level,choose,busy=false){
 const root=document.createElement("details");root.className="soa-dungeon-panel";root.open=!!current(c);
 const el=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
 const button=(text,op,id,disabled=false)=>{const b=el("button",text);b.type="button";b.disabled=busy||disabled;b.onclick=()=>{const confirmed=op==="leave"?window.confirm("Return to the entrance? Unfinished progress and unclaimed boss loot will be left behind."):false;if(op==="leave"&&!confirmed)return;choose({dungeonAction:op,dungeon:id,confirmed,text,type:"dungeon"});};return b;};
 root.append(el("summary",current(c)?"Dungeon expedition · "+definition(current(c).id).name:"Dungeons · Classic Era · 26 routes"));
 const run=current(c);
 if(run){
  const d=definition(run.id),q=state(c).quests[run.id];
  root.append(el("p",run.cleared.length+" / "+stages(d).length+" encounters cleared · "+run.status+" · progress saves after every action"));
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
 for(const d of data().CATALOG){const entry=document.createElement("details");entry.append(el("summary",d.name+" · level "+d.level+"+ · recommended "+d.low+"–"+d.high));entry.append(el("p",d.bosses.length+" bosses · "+stages(d).length+" encounters · approach from "+d.region.split("|")[0]),el("p",d.bosses.join(" → ")));
  const error=entryError(c,s,d,hero,level);if(error)entry.append(el("p",error));entry.append(button("Enter "+d.name,"enter",d.id,!!error));const q=state(c).quests[d.id];if(!q?.accepted)entry.append(button("Accept clearance contract","accept",d.id,level<d.level));else if(q.completedRun&&!q.claimed)entry.append(button("Claim clearance contract reward","claim",d.id));else entry.append(el("p",q.claimed?"✓ Clearance contract rewarded":"Clearance contract accepted"));root.append(entry);}
 return root;
}
function questPanel(c){
 const ledger=c?.dungeons?.quests;if(!ledger||!Object.keys(ledger).length)return null;
 const root=document.createElement("section"),title=document.createElement("h3");title.textContent="Dungeon clearance contracts";root.append(title);
 for(const [id,q] of Object.entries(ledger)){const d=definition(id);if(!d)continue;const p=document.createElement("p");p.textContent=(q.claimed?"✓ ":"○ ")+d.quest+" · "+(q.claimed?"Reward claimed":q.completedRun?"Route cleared; claim reward from the dungeon board":"Defeat every boss and minion group in one run");root.append(p);}return root;
}
window.soaDungeons={definition,itemInfo,state,current,stages,entryError,command,settle,scene,panel,questPanel};
})();
