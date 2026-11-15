(()=>{"use strict";
const KEY="soa-mnm-adventure-v1",VERSION=2;
let activeBindPointReturn=()=>false;
const STATS=["str","sta","dex","agi","int","wis","cha"];
const STAT_NAMES={str:"Strength",sta:"Stamina",dex:"Dexterity",agi:"Agility",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};
const REGIONS=[
 {id:"night-harbor",name:"Night Harbor",zone:"Shaded Dunes",description:"The world's trade hub on A\u00eathoril, with ships, caravans, and roads leading in every direction.",lore:"Night Harbor is the Crown Jewel of the West. Twilight Harbor is its busy waterfront in the Shaded Dunes."},
 {id:"underdocks",name:"The Underdocks",zone:"Beneath Night Harbor",description:"A subterranean port and starting home for Deep Gnomes, Deep Elves, Goblins, and Ogres.",lore:"A guarded lift links the Underdocks to the streets and waterfront of Night Harbor."},
 {id:"penshaw",name:"Penshaw",zone:"Keepers Bight",description:"A Wood Elf city and custom M&M: RPG starting home in Keepers Bight.",lore:"Boats sail between Penshaw and Twilight Harbor in Night Harbor. Travelers of every race can take the passage."},
 {id:"faelindral",name:"Faelindral",zone:"Calafrey",description:"A city in the trees in the enchanted lands of Calafrey.",lore:"Faelindral stands north of Szuur among the green lands of Calafrey."},
 {id:"ail-vorith",name:"Ail'vorith",zone:"Eastern Calafrey",description:"The Deep Elves' dark capital beneath eastern Calafrey.",lore:"Ail'vorith rests deep below the eastern lands of Calafrey."}
];
const TRAVEL_ROUTES=[
 {from:"night-harbor",to:"underdocks",name:"The Underdocks Lift",method:"Lift",detail:"Descend from Night Harbor into the Underdocks below."},
 {from:"underdocks",to:"night-harbor",name:"Night Harbor Lift",method:"Lift",detail:"Ride the lift up from the Underdocks into Night Harbor."},
 {from:"night-harbor",to:"penshaw",name:"Twilight Harbor Passage",method:"Boat",detail:"Sail from Twilight Harbor in the Shaded Dunes to Penshaw in Keepers Bight. All races may book passage."},
 {from:"penshaw",to:"night-harbor",name:"Twilight Harbor Passage",method:"Boat",detail:"Sail from Penshaw back to Twilight Harbor in Night Harbor."},
 {from:"faelindral",to:"night-harbor",name:"Calafrey Trade Road",method:"Caravan",detail:"Follow the established trade road west to Night Harbor."},
 {from:"night-harbor",to:"faelindral",name:"Calafrey Trade Road",method:"Caravan",detail:"Travel north from Night Harbor toward the wooded lands of Calafrey."},
 {from:"ail-vorith",to:"underdocks",name:"Deep Trade Passage",method:"Passage",detail:"Follow the deep trade route to the Underdocks beneath Night Harbor."},
 {from:"underdocks",to:"ail-vorith",name:"Deep Trade Passage",method:"Passage",detail:"Travel through the deep route toward Ail'vorith beneath eastern Calafrey."}
];
const APPROACHES=[
 {id:"chart",label:"Compare the route chart",stat:"int",dc:12,detail:"Follow the old marks and find where the signal route bends."},
 {id:"tracks",label:"Read the ground",stat:"wis",dc:12,detail:"Study wind-scoured footprints and the disturbed sand."},
 {id:"question",label:"Question the haulers",stat:"cha",dc:13,detail:"Ask the caravan hands what they heard before the bell went quiet."}
];
const clone=value=>JSON.parse(JSON.stringify(value));
const cleanText=value=>String(value??"").replace(/[<>]/g,"").slice(0,220);
function startingRegionForProfile(profile){
 const requested=window.soaMnmRules?.startLocationForRace?.(profile?.raceId)||profile?.startingLocation||"night-harbor";
 return REGIONS.some(region=>region.id===requested)?requested:"night-harbor";
}
function createSave(profile){
 const origin=startingRegionForProfile(profile),region=REGIONS.find(item=>item.id===origin);
 return {version:VERSION,characterId:String(profile?.id||""),stage:"briefing",origin,currentLocation:origin,clue:false,approachUsed:"",outcome:"",completed:false,racialFeatureUsed:false,combatEncounterId:"",combatKillsAtStart:0,combatFoeName:"",journal:["You begin in "+region.name+(region.zone?" in "+region.zone:"")+(origin==="night-harbor"?", the world's trade hub.":".")],aiCampaign:window.soaMnmAiChronicle?.createCampaign?.(profile)||null,updatedAt:new Date().toISOString()};
}
function validSave(value,profile){
 if(!value||typeof value!=="object"||Array.isArray(value)||value.version!==VERSION||value.characterId!==String(profile?.id||""))return false;
 if(value.aiCampaign===undefined)value.aiCampaign=window.soaMnmAiChronicle?.createCampaign?.(profile)||null;
 if(value.aiCampaign!==null&&window.soaMnmAiChronicle&&!window.soaMnmAiChronicle.validCampaign(value.aiCampaign,profile))return false;
 if(!["origin","briefing","approach","encounter","aftermath","complete"].includes(value.stage))return false;
 if(value.origin&&!REGIONS.some(region=>region.id===value.origin))return false;
 if(value.currentLocation===undefined)value.currentLocation=value.origin||startingRegionForProfile(profile);
 if(typeof value.currentLocation!=="string"||!REGIONS.some(region=>region.id===value.currentLocation))return false;
 if(typeof value.clue!=="boolean")return false;
 if(value.approachUsed===undefined)value.approachUsed="";
 if(typeof value.approachUsed!=="string"||value.approachUsed!==""&&!APPROACHES.some(item=>item.id===value.approachUsed))return false;
 if(value.combatEncounterId===undefined)value.combatEncounterId="";
 if(value.combatKillsAtStart===undefined)value.combatKillsAtStart=0;
 if(value.combatFoeName===undefined)value.combatFoeName="";
 if(typeof value.combatEncounterId!=="string"||value.combatEncounterId.length>100||!Number.isInteger(value.combatKillsAtStart)||value.combatKillsAtStart<0||typeof value.combatFoeName!=="string"||value.combatFoeName.length>220)return false;
 if(!["","victory","driven-off","withdrew","mapped","parley"].includes(value.outcome)||typeof value.completed!=="boolean"||!Array.isArray(value.journal)||value.journal.length>100||value.journal.some(x=>typeof x!=="string"))return false;
 if(value.racialFeatureUsed!==undefined&&typeof value.racialFeatureUsed!=="boolean")return false;
 if(value.racialFeatureUsed===undefined)value.racialFeatureUsed=false;
 return value.stage!=="complete"||value.completed===true;
}
function migrateAdventureSave(value){
 if(!value||typeof value!=="object"||Array.isArray(value))return {save:value,changed:false};
 let changed=false;
 if(value.version===1){
  value.version=VERSION;changed=true;
  for(const key of ["enemyResolve","enemyPressure","trollAdaptationReady","titanBraceReady","calafreyWardReady","spiritLatticeReady","wyrdpathReady"])delete value[key];
 }
 if(value.version===VERSION){
  for(const [key,fallback] of [["combatEncounterId",""],["combatKillsAtStart",0],["combatFoeName",""]]){
   if(value[key]===undefined){value[key]=fallback;changed=true;}
  }
 }
 return {save:value,changed};
}
function statLine(profile){
 const source=profile?.stats||{};
 return Object.fromEntries(STATS.map(key=>{
  const score=Number(source[key]);
  return [key,Number.isFinite(score)?Math.trunc(score):10];
 }));
}
function check(profile,stat,dc,roll,storyBonus=0){
 const n=Math.trunc(Number(roll));
 if(n<1||n>20)throw new RangeError("A check needs a d20 result from 1 to 20.");
 const result=window.soaMnmRules.d20Check({roll:n,ability:stat,scores:statLine(profile),skillBonus:storyBonus,dc});
 const modifier=window.soaMnmRules.abilityModifier(statLine(profile)[stat]);
 return {roll:n,stat,modifier,storyBonus,total:result.total,dc,success:result.success,critical:result.critical};
}
function addJournal(save,line){
 save.journal.push(cleanText(line));
 if(save.journal.length>100)save.journal=save.journal.slice(-100);
 save.updatedAt=new Date().toISOString();
}
function migrateStartingLocation(save,profile){
 let changed=false;
 if(save?.currentLocation===undefined){save.currentLocation=save.origin||startingRegionForProfile(profile);changed=true;}
 if(save?.stage!=="origin"||save.origin)return changed;
 const origin=startingRegionForProfile(profile),region=REGIONS.find(item=>item.id===origin);
 save.origin=origin;save.currentLocation=origin;save.stage="briefing";
 addJournal(save,"You begin in "+region.name+(region.zone?" in "+region.zone:"")+(origin==="night-harbor"?", the world's trade hub.":"."));
 return true;
}
function useRacialFeature(save){if(save.racialFeatureUsed)throw new Error("This racial feature has already been used this chapter.");save.racialFeatureUsed=true;}
function transition(current,profile,action,roll){
 if(!validSave(current,profile))throw new Error("M&M adventure save does not match this character.");
 const next=clone(current);
 if(action?.type==="origin"&&next.stage==="origin"){
  const region=REGIONS.find(item=>item.id===action.region);
  if(!region)throw new Error("Choose a listed starting region.");
  const required=startingRegionForProfile(profile);
  if(region.id!==required)throw new Error("This race begins in "+REGIONS.find(item=>item.id===required).name+".");
  next.origin=region.id;next.currentLocation=region.id;next.stage="briefing";addJournal(next,"Story begins in "+region.name+".");
  return {state:next,message:"Your story begins in "+region.name+"."};
 }
 if(action?.type==="travel"){
  const route=TRAVEL_ROUTES.find(item=>item.from===next.currentLocation&&item.to===action.to);
  if(!route)throw new Error("There is no direct route from this location.");
  const from=REGIONS.find(item=>item.id===route.from),to=REGIONS.find(item=>item.id===route.to);
  next.currentLocation=route.to;
  addJournal(next,"Traveled from "+from.name+" to "+to.name+" by "+route.method.toLowerCase()+".");
  return {state:next,message:"You arrive in "+to.name+(to.zone?", "+to.zone:".")};
 }
 if(action?.type==="accept"&&next.stage==="briefing"){
  next.stage="approach";addJournal(next,"Accepted the signal-keeper's request to investigate the quiet marker at Dune Gate.");
  return {state:next,message:"The Dune Gate trail is yours to follow."};
 }
 if(action?.type==="approach"&&next.stage==="approach"){
  const option=APPROACHES.find(item=>item.id===action.id);if(!option)throw new Error("Choose an investigation approach.");
  const result=check(profile,option.stat,option.dc,roll);next.approachUsed=option.id;next.clue=result.success;next.outcome="";next.combatEncounterId="";next.combatKillsAtStart=0;next.combatFoeName="";next.stage="encounter";
  const message=result.success?"You find a useful lead at the broken marker. Something is guarding the route.":"The clues remain uncertain, but a hostile creature blocks the route.";
  addJournal(next,option.label+": d20 "+result.roll+" "+(result.modifier>=0?"+":"")+result.modifier+" = "+result.total+" vs DC "+result.dc+" - "+(result.success?"success":"failure")+".");
  return {state:next,message,roll:result};
 }
 if(action?.type==="humanRetry"&&next.stage==="encounter"){
  if(profile?.raceId!=="human"||next.racialFeatureUsed||next.clue||next.combatEncounterId)throw new Error("Many Roads is only available after a failed investigation, before combat starts.");
  const option=APPROACHES.find(item=>item.id===action.id);if(!option||option.id===next.approachUsed)throw new Error("Choose a different investigation approach.");
  useRacialFeature(next);
  const result=check(profile,option.stat,option.dc,roll);
  if(result.success)next.clue=true;
  addJournal(next,"Many Roads - "+option.label+": d20 "+result.roll+" "+(result.modifier>=0?"+":"")+result.modifier+" = "+result.total+" vs DC "+result.dc+" - "+(result.success?"success":"failure")+".");
  return {state:next,message:result.success?"A different human perspective uncovers a useful clue.":"The second approach fails to clarify the trail, but you can still face the threat or report a detour.",roll:result};
 }
 if(action?.type==="racial"){
  if(action.id!==profile?.raceId||next.racialFeatureUsed)throw new Error("This racial feature is not available to this character.");
  if(profile.raceId==="gnome"&&next.stage==="approach"){
   useRacialFeature(next);next.clue=true;next.approachUsed="";next.stage="encounter";
   addJournal(next,"Eureka - a patient insight reveals the missing signal trail without a check.");
   return {state:next,message:"Eureka! A decisive detail comes into focus without a roll."};
  }
  if(profile.raceId==="deep_gnome"&&next.stage==="encounter"&&!next.combatEncounterId){
   useRacialFeature(next);next.stage="aftermath";next.outcome="mapped";
   addJournal(next,"Spiral Cartographer - mapped a safe alternate route around the threat.");
   return {state:next,message:"The deep gnome maps a safe alternate route and leaves a reliable warning for the caravan."};
  }
  if(profile.raceId==="goblin"&&next.stage==="encounter"&&next.clue&&!next.combatEncounterId){
   useRacialFeature(next);
   const result=check(profile,"dex",13,roll);
   if(result.success){next.stage="aftermath";next.outcome="mapped"}
   addJournal(next,"Secret-Sense - hidden-route Dexterity check: d20 "+result.roll+" "+(result.modifier>=0?"+":"")+result.modifier+" = "+result.total+" vs DC 13 - "+(result.success?"success":"failure")+".");
   const message=result.success?"The goblin finds a hidden route around the creature and signals the caravan safely.":"The hidden route is watched. You can still face the threat or report a detour.";
   return {state:next,message,roll:result};
  }
  throw new Error("This racial feature is not available at this point in the chapter.");
 }
 if(action?.type==="retreat"&&next.stage==="encounter"){
  if(next.combatEncounterId)throw new Error("Use Try to escape in the Combat panel before leaving this encounter.");
  next.stage="aftermath";next.outcome="withdrew";addJournal(next,"Chose a safe detour around the threat and warned the caravan.");
  return {state:next,message:"You choose a safer route and warn the caravan crew. The chapter can still be completed."};
 }
 if(action?.type==="complete"&&next.stage==="aftermath"){
  next.stage="complete";next.completed=true;
  const resultText=next.outcome==="victory"?"Cleared the broken signal marker and helped restore the warning bell.":next.outcome==="parley"?"Reached a peaceful resolution and helped restore the warning bell.":next.outcome==="mapped"?"Mapped a reliable safe route and warned the caravan.":next.outcome==="driven-off"?"Marked the threat's escape route and restored a safe warning at Dune Gate.":"Reported a safe detour so the caravan could pass Dune Gate.";
  addJournal(next,"Chapter complete: "+resultText);
  return {state:next,message:"Chapter complete. The signal route is recorded in the journal."};
 }
 throw new Error("That action is not available in the current chapter.");
}
function boot(){
 const profile=window.soaCharacters?.profile?.();
 if(!profile||profile.system!=="mnm")return;
 let save=null,blocked=false,loadMessage="";
 try{
  if(window.soaSaveRules?.isIntegrityBlocked?.()){blocked=true;loadMessage="Saved data is paused until the character archive is recovered."}
  else{
   const raw=localStorage.getItem(KEY);
   if(raw===null){save=createSave(profile);localStorage.setItem(KEY,JSON.stringify(save));}
   else{
    const parsed=JSON.parse(raw);
    const storedCampaign=parsed?.aiCampaign,needsAiMigration=!storedCampaign||storedCampaign.version!==window.soaMnmAiChronicle?.version;
    const migratedCampaign=storedCampaign?window.soaMnmAiChronicle?.migrateCampaign?.(storedCampaign,profile):window.soaMnmAiChronicle?.createCampaign?.(profile);
    if(storedCampaign&&!migratedCampaign)throw new Error("The saved M&M campaign did not pass its character or save-format check.");
    parsed.aiCampaign=migratedCampaign||null;
    const migration=migrateAdventureSave(parsed);
    save=migration.save;
    if(!validSave(save,profile))throw new Error("The M&M adventure save does not match the active character or current save format.");
    const locationMigrated=migrateStartingLocation(save,profile);
    if(migration.changed||locationMigrated||needsAiMigration)localStorage.setItem(KEY,JSON.stringify(save));
   }
  }
 }catch(error){
  blocked=true;loadMessage="The M&M adventure save could not be read safely and was not reset.";
  window.soaSaveRules?.reportCorruption?.(KEY);
  window.soaReportStorageFailure?.(loadMessage+" Restore a known-good character backup to continue.");
 }
 const screen=document.getElementById("soa-character-screen");
 const record=document.getElementById("soa-profession-panel");
 if(!screen)return;
 screen.replaceChildren();screen.setAttribute("aria-label","M&M Adventure and character record");
 const app=el("div",undefined,"soa-mnm-game");
 screen.append(app);
 app.addEventListener("soa-mnm-system-update",()=>render());
 let view="ai",statusText=loadMessage;
 function button(label,description,onClick,cls){
  const b=el("button",undefined,"soa-mnm-choice"+(cls?" "+cls:""));b.type="button";
  b.append(el("strong",label),el("span",description));b.onclick=onClick;return b;
 }
 function actionList(choices,kind){
  const list=el("div",undefined,"soa-mnm-choice-grid");
  for(const choice of choices){
   const text=choice.detail+" \u00b7 "+STAT_NAMES[choice.stat]+" \u00b7 DC "+choice.dc;
   list.append(button(choice.label,text,()=>perform({type:kind,id:choice.id},true)));
  }
  return list;
 }
 function setView(name,focus){
  view=name;render();
  if(focus)app.querySelector('[data-view="'+name+'"]')?.focus();
 }
 function perform(action,needsRoll){
  if(blocked||!save)return;
  if(window.soaSaveRules?.isIntegrityBlocked?.()){blocked=true;statusText="Saved data is paused until the character archive is recovered.";render();return;}
  const before=save;
  try{
   const roll=needsRoll?Math.floor(Math.random()*20)+1:undefined;
   const result=transition(save,profile,action,roll);
   save=result.state;
   localStorage.setItem(KEY,JSON.stringify(save));
   statusText=result.message+(result.roll?" Roll "+result.roll.roll+" + "+result.roll.modifier+" = "+result.roll.total+" vs DC "+result.roll.dc+" · "+(result.roll.success?"Success":"Failure")+".":"");
  }catch(error){save=before;statusText=error.message}
  render();
  app.querySelector("h2")?.focus();
 }
 function persistAiCampaign(options={}){
  if(blocked||!save)return false;
  if(window.soaSaveRules?.isIntegrityBlocked?.()){blocked=true;statusText="Saved data is paused until the character archive is recovered.";render();return false;}
  const previousUpdatedAt=save.updatedAt;
  try{save.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(save));statusText=options.message||"Campaign saved to this character's story.";if(options.render!==false)render();return true}
  catch{save.updatedAt=previousUpdatedAt;statusText="The campaign could not be saved. Your previous saved story is intact.";return false}
 }
 activeBindPointReturn=destination=>{
  if(blocked||!save)return false;
  synchronizeStoryCombat();
  const target=REGIONS.find(region=>region.id===String(destination))||REGIONS.find(region=>region.id===startingRegionForProfile(profile))||REGIONS[0];
  const next=clone(save);
  next.currentLocation=target.id;
  addJournal(next,"Defeat returned you to your bind point in "+target.name+". Your belongings remain on a recoverable corpse.");
  try{localStorage.setItem(KEY,JSON.stringify(next));save=next;view="inventory";statusText="You wake in "+target.name+". Travel back to the encounter region to recover your corpse.";render();return true}
  catch{statusText="You were defeated, but your return to the bind point could not be saved. Your previous adventure remains intact.";render();return false}
 };
 function renderOrigin(panel){
  const start=REGIONS.find(region=>region.id===startingRegionForProfile(profile));
  panel.append(el("p","Your "+profile.race+" begins in "+start.name+(start.zone?", in "+start.zone:"") +". Use the World tab to travel between connected locations.","soa-mnm-rule-note"));
  const grid=el("div",undefined,"soa-mnm-origin-grid");
  grid.append(button(start.name,start.description+" "+start.lore,()=>perform({type:"origin",region:start.id},false)));
  panel.append(grid);
 }
 function renderBriefing(panel){
  const region=REGIONS.find(item=>item.id===save.origin);
  panel.append(el("div","ORIGINAL PROJECT STORY \u00b7 CHAPTER ONE","soa-mnm-kicker"),el("h2","The Quiet Signal at Dune Gate"));
  const departure=profile.raceId==="human"?"From Night Harbor, the world's western trade hub, you travel toward the outer reaches of Szuur.":"From "+region.name+", you travel toward the outer reaches of Szuur.";
  panel.append(el("p",departure+" Sera Fen, a caravan signal-keeper, says the warning bell at Dune Gate has gone silent. A route slate is missing, and the next caravan is already on the road."));
  panel.append(el("p","The Szuur route and its missing signal are original story material for this game. Your race and class shape your character sheet; no official M&M class abilities are being simulated in this chapter."));
  panel.append(button("Take the trail","Accept the signal-keeper's request and investigate the marker.",()=>perform({type:"accept"},false),"med"));
 }
 function renderApproach(panel){
  panel.append(el("div","QUEST · INVESTIGATE","soa-mnm-kicker"),el("h2","Find the missing signal"));
  panel.append(el("p","The trail leaves the caravan road at a half-buried marker. Choose how "+profile.name+" searches for the missing signal. A failed check still advances the story; you can fight the threat or take a safe detour."));
  panel.append(actionList(APPROACHES,"approach"));
  if(profile.raceId==="gnome"&&!save.racialFeatureUsed)panel.append(button("Eureka - reveal the clue","Use a once-per-chapter insight to uncover the trail without a roll.",()=>perform({type:"racial",id:"gnome"},false),"med"));
 }
 const STORY_COMBAT_TACTICS={
  dwarf:{id:"brace",label:"Titan's Craft",detail:"Brace against the next incoming strike."},
  deep_dwarf:{id:"weaken",label:"Spirit Lattice",detail:"Bind a spirit to weaken the foe's next strike."},
  high_elf:{id:"ward",label:"Calafrey Discipline",detail:"Set a ward that weakens the foe's next strike."},
  wood_elf:{id:"flank",label:"Wyrdpath",detail:"Follow living signs and deal a quick 4 damage from the flank."},
  deep_elf:{id:"ambush",label:"Shadow's Veil",detail:"Use a discovered opening to deal 5 damage unseen.",requiresClue:true},
  ogre:{id:"assault",label:"Storm Coast Fury",detail:"Commit to a forceful opening and deal 7 damage."},
  troll:{id:"recover",label:"Tempered Survivor",detail:"Recover 8 Health and 2 Focus."},
  halfling:{id:"parley",label:"Fontborn Memory",detail:"At low foe Health, use a road-tale to settle the encounter peacefully.",requiresYield:true}
 };
 function currentStoryProfile(){
  const state=window.soaMnmSystems?.read?.(profile);
  return {...profile,level:state?.ok?state.save.level:profile.level||1};
 }
 function persistAdventure(next,message){
  if(blocked||window.soaSaveRules?.isIntegrityBlocked?.()){blocked=true;statusText="Saved data is paused until the character archive is recovered.";return false}
  try{next.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(next));save=next;if(message!==undefined)statusText=message;return true}
  catch{statusText="The adventure could not be saved. Your previous story remains intact.";return false}
 }
 function finishStoryCombat(outcomeOverride){
  if(!save?.combatEncounterId)return false;
  const systemState=window.soaMnmSystems?.read?.(profile);
  if(!systemState?.ok){statusText=systemState?.error||"Combat data could not be read.";return false}
  const outcome=outcomeOverride||(systemState.save.rpg.kills>save.combatKillsAtStart?"victory":"withdrew");
  const foeName=save.combatFoeName||"the threat";
  const next=clone(save);next.stage="aftermath";next.outcome=outcome;next.combatEncounterId="";next.combatFoeName="";next.combatKillsAtStart=systemState.save.rpg.kills;
  const line=outcome==="victory"?"Defeated "+foeName+" and cleared the broken signal marker.":outcome==="parley"?"Settled the encounter with "+foeName+" through a peaceful exchange.":"Withdrew from "+foeName+" and helped Sera mark a safe detour.";
  addJournal(next,line);
  return persistAdventure(next,outcome==="victory"?"The threat is defeated. Sera can restore the warning bell.":outcome==="parley"?"The encounter ended peacefully; the caravan is safe.":"You reached safety. Sera marks a detour for the caravan.");
 }
 function synchronizeStoryCombat(){
  if(save?.stage!=="encounter"||!save.combatEncounterId)return false;
  const state=window.soaMnmSystems?.read?.(profile);
  if(!state?.ok||state.save.rpg.encounter?.id===save.combatEncounterId)return false;
  return finishStoryCombat();
 }
 function beginStoryCombat(){
  if(blocked||!save||save.stage!=="encounter")return;
  if(window.soaSaveRules?.isIntegrityBlocked?.()){blocked=true;statusText="Saved data is paused until the character archive is recovered.";render();return}
  const systems=window.soaMnmSystems,state=systems?.read?.(profile);
  if(!state?.ok){statusText=state?.error||"Turn-based combat is unavailable right now.";render();return}
  let systemState=state.save,foe=systemState.rpg.encounter;
  if(!foe){
   const started=systems.startEncounter(currentStoryProfile(),save.currentLocation);
   if(!started?.ok){statusText=started?.error||"A fight could not be started. Recover Health or finish the active encounter first.";render();return}
   systemState=started.save;foe=systemState.rpg.encounter||started.result?.encounter;
  }
  if(!foe){statusText="No active foe was found. Try starting the encounter again.";render();return}
  const next=clone(save);next.combatEncounterId=foe.id;next.combatKillsAtStart=systemState.rpg.kills;next.combatFoeName=cleanText(foe.name);
  if(!persistAdventure(next,"You face "+foe.name+". Use Health, Focus, attacks, verified memorized abilities, items, or escape.")){render();return}
  render();
 }
 function useStoryCombatTactic(tactic){
  if(!tactic||save.racialFeatureUsed)return;
  const before=clone(save),next=clone(save);next.racialFeatureUsed=true;addJournal(next,"Used "+tactic.label+" during the encounter.");
  if(!persistAdventure(next))return;
  const result=window.soaMnmSystems?.useRacialCombatTactic?.(profile,tactic.id);
  if(!result?.ok){
   persistAdventure(before,result?.error||"The racial feature could not be used.");
   render();return;
  }
  if(result.result?.parley)finishStoryCombat("parley");
  else statusText=result.result?.line||tactic.label+" takes effect.";
  render();
 }
 function renderEncounter(panel){
  panel.append(el("div","ENCOUNTER · TURN-BASED COMBAT","soa-mnm-kicker"),el("h2","A threat blocks the marker"));
  panel.append(el("p","A hostile creature has occupied the broken signal marker. Clear the route in the same turn-based combat used in the Combat tab, then help Sera restore the warning bell. These combat rules are original M&M: RPG rules."));
  const racial=window.soaMnmRules.racialAbilities?.[profile.raceId];
  if(racial)panel.append(el("p",racial.name+" · Original racial feature: "+racial.effect,"soa-mnm-feature-status"));
  if(!save.racialFeatureUsed&&profile.raceId==="human"&&!save.clue){
   const alternatives=APPROACHES.filter(item=>item.id!==save.approachUsed);
   const options=el("div",undefined,"soa-mnm-racial-options");
   options.append(el("h3","Many Roads - change your approach"),el("p","The first investigation failed. Choose a different method for one fresh roll; it gets no racial modifier."));
   for(const item of alternatives)options.append(button(item.label,item.detail+" · "+STAT_NAMES[item.stat]+" · DC "+item.dc,()=>perform({type:"humanRetry",id:item.id},true),"low"));
   panel.append(options);
  }
  if(!save.racialFeatureUsed&&!save.combatEncounterId&&profile.raceId==="deep_gnome")panel.append(button("Spiral Cartographer - map a safe route","Leave a reliable warning and secure a safe outcome without fighting.",()=>perform({type:"racial",id:"deep_gnome"},false),"med"));
  if(!save.racialFeatureUsed&&!save.combatEncounterId&&profile.raceId==="goblin"&&save.clue)panel.append(button("Secret-Sense - find a hidden route","Try a Dexterity check, DC 13. Success secures the route without a fight.",()=>perform({type:"racial",id:"goblin"},true),"med"));
  const systems=window.soaMnmSystems,state=systems?.read?.(profile);
  if(save.combatEncounterId){
   const foe=state?.ok?state.save.rpg.encounter:null;
   const tactic=STORY_COMBAT_TACTICS[profile.raceId];
   if(foe?.id===save.combatEncounterId&&tactic&&!save.racialFeatureUsed&&(!tactic.requiresClue||save.clue)&&(!tactic.requiresYield||foe.hp<=Math.ceil(foe.maxHp*.25))){
    panel.append(button(tactic.label,tactic.detail,()=>useStoryCombatTactic(tactic),"med"));
   }else if(tactic?.requiresYield&&!save.racialFeatureUsed&&foe?.id===save.combatEncounterId){
    panel.append(el("p","Fontborn Memory is ready once the foe's Health falls below one quarter.","soa-mnm-feature-status"));
   }
   const combat=systems?.render?.("combat",currentStoryProfile(),()=>{synchronizeStoryCombat();render()},{locationId:save.currentLocation,returnToBindPoint:destination=>activeBindPointReturn(destination)});
   if(combat)panel.append(combat);
   else panel.append(el("p","Combat could not be loaded. Your saved encounter is still intact.","soa-mnm-live"));
  }else{
   const foe=state?.ok?state.save.rpg.encounter:null;
   panel.append(button(foe?"Resume the active fight":"Fight to clear the marker",foe?"Continue the current turn-based encounter.":"Start a regional foe encounter using Health, Focus, equipment, and verified memorized abilities.",beginStoryCombat,"med"));
   panel.append(button("Take a safe detour","Avoid the fight, warn the caravan, and complete the chapter with a safe route report.",()=>perform({type:"retreat"},false),"low"));
  }
 }
 function renderAftermath(panel){
  panel.append(el("div","QUEST · RETURN","soa-mnm-kicker"),el("h2",save.outcome==="victory"?"The route is safe":save.outcome==="parley"?"The threat stands down":save.outcome==="mapped"?"A safe route is mapped":"A safer route home"));
  const line=save.outcome==="victory"?"With the threat cleared, Sera restores the warning bell before the caravan arrives.":save.outcome==="parley"?"The creature turns away after a peaceful exchange, and Sera restores the warning bell.":save.outcome==="mapped"?"The threat remains, but the safe alternate route is marked and Sera warns the caravan.":"You fall back from the threat. Sera marks a safe detour so the caravan can pass.";
  panel.append(el("p",line),el("p","Your choices and the encounter are saved in the Journey Log."));
  panel.append(button("Record the chapter","Complete the quest and preserve its outcome in the journal.",()=>perform({type:"complete"},false),"med"));
 }
 function renderComplete(panel){
  panel.append(el("div","CHAPTER ONE · COMPLETE","soa-mnm-kicker"),el("h2","The Quiet Signal at Dune Gate"));
  panel.append(el("p","The caravan route is marked safe, and your account of the encounter is preserved. Open the Journey Log to review your choices and combat."));
  const rewardId="chapter-one",systems=window.soaMnmSystems,systemSave=systems?.read?.(profile),claimed=!!(systemSave?.ok&&systemSave.save.rpg.claimedStories.includes(rewardId));
  panel.append(el("p","This chapter has a player-claimed reward of 100 custom XP. The amount and leveling curve are original M&M: RPG rules, not an official M&M reward value."));
  if(claimed)panel.append(el("p","Chapter One's custom XP reward has already been claimed."));
  else panel.append(button("Claim 100 custom XP","Record this one-time chapter reward in your character's progression.",()=>{
   const result=systems?.claimStoryReward?.(profile,rewardId,100);
   if(result?.ok){statusText="Claimed "+result.result.xp+" custom XP for completing Chapter One.";render()}
   else{statusText=result?.error||"The chapter reward could not be saved.";render()}
  },"med"));
  panel.append(button("Continue to the next chapter","Open the AI Chronicle and generate what happens next.",()=>setView("ai",true),"med"));
  panel.append(button("Review the Journey Log","See region choice, checks, combat, and quest outcome.",()=>setView("journal",false)));
 }
 function renderJournal(panel){
  panel.append(el("div","YOUR ADVENTURE \u00b7 LOCAL JOURNAL","soa-mnm-kicker"),el("h2","Journey Log"));
  if(!save?.journal?.length)panel.append(el("p","Your story has not begun. Choose a starting region on the Adventure tab."));
  else{const list=el("ol",undefined,"soa-mnm-journal");for(const line of save.journal)list.append(el("li",line));panel.append(list)}
  panel.append(el("p","Saved on this device with the selected character's other save data. It is included in the character archive backup."));
 }
 function renderWorld(panel){
  const current=REGIONS.find(region=>region.id===save.currentLocation)||REGIONS[0];
  panel.append(el("div","A\u00caTHORIL \u00b7 WORLD","soa-mnm-kicker"),el("h2",current.name));
  panel.append(el("p",(current.zone?current.zone+" \u00b7 ":"")+current.description+" "+current.lore));
  if(current.id==="night-harbor")panel.append(el("p","Twilight Harbor is Night Harbor's waterfront in the Shaded Dunes. Every race can sail from here to Penshaw, in Keepers Bight; travelers from the Underdocks ride the lift up first."));
  const routes=TRAVEL_ROUTES.filter(route=>route.from===current.id);
  if(routes.length){
   panel.append(el("h3","Travel from here"));
   const grid=el("div",undefined,"soa-mnm-choice-grid");
   for(const route of routes)grid.append(button(route.name,route.method+" \u00b7 "+route.detail,()=>perform({type:"travel",to:route.to},false)));
   panel.append(grid);
  }
  panel.append(button("Continue the campaign","Return to your generated story and current location.",()=>setView("ai",false),"med"));
 }
 function render(){
  if(!app.isConnected)return;
  if(!blocked)synchronizeStoryCombat();
  const storyCombatVisible=view==="adventure"&&save?.stage==="encounter"&&Boolean(save?.combatEncounterId);
  if(view!=="combat"&&!storyCombatVisible)window.soaMnmSystems?.stopAutoAttackRunner?.();
  app.replaceChildren();
  const hero=el("section",undefined,"soa-mnm-game-heading");
  hero.append(el("div","MONSTERS & MEMORIES \u00b7 ORIGINAL ADVENTURE","soa-mnm-kicker"),el("h1",profile.name));
  const current=REGIONS.find(x=>x.id===save?.currentLocation);
  const currentLevel=window.soaMnmSystems?.progressFor?.(profile)?.level||profile.level||1;
  const currentProfile={...profile,level:currentLevel};
  hero.append(el("p",profile.race+" "+profile.className+" \u00b7 Level "+currentLevel+" \u00b7 "+(current?"In "+current.name+(current.zone?" · "+current.zone:""):"Choose an opening region"),"soa-mnm-subtitle"));
  const racial=window.soaMnmRules.racialAbilities?.[profile.raceId];if(racial)hero.append(el("p","CUSTOM RACIAL FEATURE · "+racial.name+" - "+racial.description+" Effect: "+racial.effect,"soa-mnm-feature"));
  app.append(hero);
  const tabs=el("div",undefined,"soa-mnm-tabs");tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","M&M character views");
  for(const [id,label] of [["ai","Adventure"],["adventure","Offline Chapter"],["world","World"],["character","Character"],["journal","Journey Log"],["combat","Combat"],["progress","Progress"],["inventory","Items"]]){
   const b=el("button",label,"soa-mnm-tab");b.type="button";b.dataset.view=id;b.setAttribute("role","tab");b.setAttribute("aria-selected",String(view===id));b.onclick=()=>setView(id,false);tabs.append(b);
  }
  app.append(tabs);
  if(statusText){const live=el("p",statusText,"soa-mnm-live");live.setAttribute("role","status");live.setAttribute("aria-live","polite");app.append(live)}
  if(blocked){const pane=el("section",undefined,"soa-mnm-adventure-panel");pane.append(el("h2","Adventure paused"),el("p",loadMessage||"Saved story data is unavailable; it has not been reset."));app.append(pane)}
  else if(view==="character"){
   if(record){record.hidden=false;app.append(record)}
   else app.append(el("p","The character record is temporarily unavailable."));
  }else if(view==="journal"){
   const pane=el("section",undefined,"soa-mnm-adventure-panel");renderJournal(pane);app.append(pane);
  }else if(view==="world"){
   const pane=el("section",undefined,"soa-mnm-adventure-panel");renderWorld(pane);app.append(pane);
  }else if(view==="ai"){
   const aiPanel=window.soaMnmAiChronicle?.render?.(currentProfile,save,persistAiCampaign);
   if(aiPanel)app.append(aiPanel);
   else{const pane=el("section",undefined,"soa-mnm-adventure-panel");pane.append(el("h2","AI Chronicle unavailable"),el("p","The AI story module did not load. Your offline adventure remains available."));app.append(pane)}
  }else if(view==="combat"||view==="progress"||view==="inventory"){
   const systemPanel=window.soaMnmSystems?.render?.(view,currentProfile,()=>render(),{locationId:save.currentLocation,returnToBindPoint:destination=>activeBindPointReturn(destination)});
   if(systemPanel)app.append(systemPanel);
   else{const pane=el("section",undefined,"soa-mnm-adventure-panel");pane.append(el("h2","M&M system unavailable"),el("p","The M&M rules module did not load."));app.append(pane)}
  }else{
   const pane=el("section",undefined,"soa-mnm-adventure-panel");
   const steps=["origin","briefing","approach","encounter","aftermath","complete"];
   pane.append(el("div","CHAPTER ONE \u00b7 STEP "+(steps.indexOf(save.stage)+1)+" OF "+steps.length,"soa-mnm-kicker"));
   if(save.stage==="origin")renderOrigin(pane);
   else if(save.stage==="briefing")renderBriefing(pane);
   else if(save.stage==="approach")renderApproach(pane);
   else if(save.stage==="encounter")renderEncounter(pane);
   else if(save.stage==="aftermath")renderAftermath(pane);
   else renderComplete(pane);
   app.append(pane);
  }
  const rules=el("details",undefined,"soa-mnm-rules-disclosure");
  rules.append(el("summary","Story rules and M&M source note"));
  rules.append(el("p","Adventure is the continuing generated campaign. Chapter choices and custom d20 checks are saved locally before the Story Director responds; previous chapters, combat outcomes, and unresolved leads carry forward. Offline Chapter One remains available. Combat, Progress, Items, and story-check values are original M&M: RPG rules, separate from confirmed M&M facts."));
  app.append(rules);
  const roster=el("button","\u2630 Character Select","soa-mnm-roster-button");roster.type="button";roster.onclick=()=>window.soaCharacters?.showMenu?.();app.append(roster);
 }
 function el(tag,text,cls){
  const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;
 }
 if(blocked&&!save)save=createSave(profile);
 render();
}
function start(){window.soaCharacters?.organizeSections?.();boot()}
window.soaMnmAdventure=Object.freeze({key:KEY,version:VERSION,humanStartRegion:"night-harbor",createSave,validSave,migrateAdventureSave,transition,migrateStartingLocation,migrateHumanStartingCity:migrateStartingLocation,regions:REGIONS.map(x=>({...x})),travelRoutes:TRAVEL_ROUTES.map(x=>({...x})),approaches:APPROACHES.map(x=>({...x})),returnToBindPoint:destination=>activeBindPointReturn(destination),boot});
if(document.readyState==="complete")start();else window.addEventListener("load",start,{once:true});
})();

