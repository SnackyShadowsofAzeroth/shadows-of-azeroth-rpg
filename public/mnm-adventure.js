(()=>{"use strict";
const KEY="soa-mnm-adventure-v1",VERSION=1;
const STATS=["str","sta","dex","agi","int","wis","cha"];
const STAT_NAMES={str:"Strength",sta:"Stamina",dex:"Dexterity",agi:"Agility",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};
const REGIONS=[
 {id:"night-harbor",name:"Night Harbor",description:"A\u00eathoril's western port, where the coastal charts point out toward Szuur.",lore:"Night Harbor is the Crown Jewel of the West, a great port on A\u00eathoril's western coast."},
 {id:"underdocks",name:"The Underdocks",description:"A shadowed port beneath Night Harbor, carrying trade down toward the Deep.",lore:"The Underdocks lie far below Night Harbor and connect its trade routes with the Deep."},
 {id:"faelindral",name:"Faelindral",description:"A city in the trees in the enchanted lands of Calafrey.",lore:"Faelindral stands north of Szuur among the green lands of Calafrey."},
 {id:"ail-vorith",name:"Ail'vorith",description:"The Deep Elves' dark capital beneath eastern Calafrey.",lore:"Ail'vorith rests deep below the eastern lands of Calafrey."}
];
const APPROACHES=[
 {id:"chart",label:"Compare the route chart",stat:"int",dc:12,detail:"Follow the old marks and find where the signal route bends."},
 {id:"tracks",label:"Read the ground",stat:"wis",dc:12,detail:"Study wind-scoured footprints and the disturbed sand."},
 {id:"question",label:"Question the haulers",stat:"cha",dc:13,detail:"Ask the caravan hands what they heard before the bell went quiet."}
];
const ENCOUNTER=[
 {id:"str",label:"Drive it back",stat:"str",dc:14,detail:"Meet its force and break its hold on the route slate."},
 {id:"sta",label:"Hold the breach",stat:"sta",dc:12,detail:"Keep your footing as the loose ground shifts beneath you."},
 {id:"dex",label:"Strike at its grip",stat:"dex",dc:13,detail:"Use a precise opening to make it drop what it stole."},
 {id:"agi",label:"Slip inside its reach",stat:"agi",dc:12,detail:"Turn its lunge aside and take the safer ground."},
 {id:"int",label:"Read its feint",stat:"int",dc:13,detail:"Watch the creature's movement and answer the real threat."},
 {id:"wis",label:"Wait for its overreach",stat:"wis",dc:12,detail:"Keep calm, watch its balance, and counter when it commits."},
 {id:"cha",label:"Command it to yield",stat:"cha",dc:14,detail:"Make your voice carry over the wind and leave no doubt."}
];
const clone=value=>JSON.parse(JSON.stringify(value));
const cleanText=value=>String(value??"").replace(/[<>]/g,"").slice(0,220);
function createSave(profile){
 return {version:VERSION,characterId:String(profile?.id||""),stage:"origin",origin:"",clue:false,approachUsed:"",enemyResolve:3,enemyPressure:0,outcome:"",completed:false,racialFeatureUsed:false,trollAdaptationReady:false,titanBraceReady:false,calafreyWardReady:false,spiritLatticeReady:false,wyrdpathReady:false,journal:[],updatedAt:new Date().toISOString()};
}
function statLine(profile){
 const scores=profile?.stats||{};
 return Object.fromEntries(STATS.map(key=>[key,Math.trunc(Number(scores[key])||10)]));
}
function validSave(value,profile){
 if(!value||typeof value!=="object"||Array.isArray(value)||value.version!==VERSION||value.characterId!==String(profile?.id||""))return false;
 if(!["origin","briefing","approach","encounter","aftermath","complete"].includes(value.stage))return false;
 if(value.origin&&!REGIONS.some(region=>region.id===value.origin))return false;
 if(typeof value.clue!=="boolean"||!Number.isInteger(value.enemyResolve)||value.enemyResolve<0||value.enemyResolve>3||!Number.isInteger(value.enemyPressure)||value.enemyPressure<0||value.enemyPressure>3)return false;
 if(value.approachUsed===undefined)value.approachUsed="";
 if(typeof value.approachUsed!=="string"||value.approachUsed!==""&&!APPROACHES.some(item=>item.id===value.approachUsed))return false;
 if(!["","victory","driven-off","withdrew","mapped","parley"].includes(value.outcome)||typeof value.completed!=="boolean"||!Array.isArray(value.journal)||value.journal.length>100||value.journal.some(x=>typeof x!=="string"))return false;
 if(value.racialFeatureUsed!==undefined&&typeof value.racialFeatureUsed!=="boolean"||value.trollAdaptationReady!==undefined&&typeof value.trollAdaptationReady!=="boolean")return false;
 if(value.racialFeatureUsed===undefined)value.racialFeatureUsed=false;
 if(value.trollAdaptationReady===undefined)value.trollAdaptationReady=false;
 for(const key of ["titanBraceReady","calafreyWardReady","spiritLatticeReady","wyrdpathReady"]){if(value[key]===undefined)value[key]=false;if(typeof value[key]!=="boolean")return false;}
 return value.stage!=="complete"||value.completed===true;
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
function useRacialFeature(save){if(save.racialFeatureUsed)throw new Error("This racial feature has already been used this chapter.");save.racialFeatureUsed=true;}
function raiseDanger(save,profile){
 if(save.titanBraceReady){save.titanBraceReady=false;return " Titan's Craft holds the marker steady; Danger does not rise."}
 if(save.calafreyWardReady){save.calafreyWardReady=false;return " Calafrey Discipline absorbs the setback; Danger does not rise."}
 save.enemyPressure=Math.min(3,save.enemyPressure+1);
 if(profile?.raceId==="troll"&&!save.racialFeatureUsed&&save.enemyPressure===3){
  save.racialFeatureUsed=true;save.enemyPressure=2;save.enemyResolve=Math.max(0,save.enemyResolve-1);
  if(save.enemyResolve===0){save.stage="aftermath";save.outcome="victory";return " Tempered Survivor turns the near escape into a counter; the scavenger yields the slate."}
  return " Tempered Survivor keeps the scavenger from escaping, holding Danger at 2 and removing 1 Resolve."
 }
 if(save.enemyPressure>=3){save.stage="aftermath";save.outcome="driven-off";return " Danger reaches 3; the scavenger escapes through a narrow cut."}
 return " Danger rises to "+save.enemyPressure+"."
}
function transition(current,profile,action,roll){
 if(!validSave(current,profile))throw new Error("M&M adventure save does not match this character.");
 const next=clone(current);
 if(action?.type==="origin"&&next.stage==="origin"){
  const region=REGIONS.find(item=>item.id===action.region);
  if(!region)throw new Error("Choose a listed starting region.");
  next.origin=region.id;next.stage="briefing";addJournal(next,"Story begins in "+region.name+".");
  return {state:next,message:"Your story begins in "+region.name+"."};
 }
 if(action?.type==="accept"&&next.stage==="briefing"){
  next.stage="approach";addJournal(next,"Accepted the signal-keeper's request to investigate the quiet marker at Dune Gate.");
  return {state:next,message:"The Dune Gate trail is yours to follow."};
 }
 if(action?.type==="approach"&&next.stage==="approach"){
  const option=APPROACHES.find(item=>item.id===action.id);if(!option)throw new Error("Choose an investigation approach.");
  const result=check(profile,option.stat,option.dc,roll);next.approachUsed=option.id;next.clue=result.success;next.enemyResolve=result.success?2:3;next.enemyPressure=0;next.stage="encounter";
  const outcome=result.success?"You find a useful lead before the scavenger blocks the route.":"The clues remain uncertain, but the stolen signal slate draws you to the creature.";
  addJournal(next,option.label+": d20 "+result.roll+" "+(result.modifier>=0?"+":"")+result.modifier+" = "+result.total+" vs DC "+result.dc+" - "+(result.success?"success":"failure")+".");
  return {state:next,message:outcome,roll:result};
 }
 if(action?.type==="humanRetry"&&next.stage==="encounter"){
  if(profile?.raceId!=="human"||next.racialFeatureUsed||next.clue)throw new Error("Many Roads is only available after a failed investigation.");
  const option=APPROACHES.find(item=>item.id===action.id);if(!option||option.id===next.approachUsed)throw new Error("Choose a different investigation approach.");
  useRacialFeature(next);
  const result=check(profile,option.stat,option.dc,roll);
  if(result.success){next.clue=true;next.enemyResolve=Math.min(next.enemyResolve,2);}
  addJournal(next,"Many Roads - "+option.label+": d20 "+result.roll+" "+(result.modifier>=0?"+":"")+result.modifier+" = "+result.total+" vs DC "+result.dc+" - "+(result.success?"success":"failure")+".");
  return {state:next,message:result.success?"A different human perspective uncovers the route clue.":"The second approach fails to clarify the trail, but reveals how the scavenger is moving.",roll:result};
 }
 if(action?.type==="racial"){
  if(action.id!==profile?.raceId||next.racialFeatureUsed)throw new Error("This racial feature is not available to this character.");
  if(profile.raceId==="gnome"&&next.stage==="approach"){
   useRacialFeature(next);next.clue=true;next.enemyResolve=2;next.enemyPressure=0;next.approachUsed="";next.stage="encounter";
   addJournal(next,"Eureka - a patient insight reveals the missing signal trail without a check.");
   return {state:next,message:"Eureka! A puzzling detail resolves into a clear lead. The scavenger begins at 2 Resolve."};
  }
  if(profile.raceId==="deep_gnome"&&next.stage==="encounter"){
   useRacialFeature(next);next.stage="aftermath";next.outcome="mapped";
   addJournal(next,"Spiral Cartographer - mapped a safe alternate route past the scavenger.");
   return {state:next,message:"The deep gnome maps a safe route through the broken ground. The slate remains lost, but the caravan receives a reliable warning."};
  }
  if(profile.raceId==="dwarf"&&next.stage==="encounter"){
   useRacialFeature(next);
   if(next.enemyPressure>0)next.enemyPressure--;
   else next.titanBraceReady=true;
   addJournal(next,next.titanBraceReady?"Titan's Craft - braced the marker against the next setback.":"Titan's Craft - repaired the marker and removed 1 Danger.");
   return {state:next,message:next.titanBraceReady?"You brace the signal marker; the next Danger increase is canceled.":"You repair the marker under pressure, reducing Danger by 1."};
  }
  if(profile.raceId==="deep_dwarf"&&next.stage==="encounter"){
   useRacialFeature(next);next.spiritLatticeReady=true;
   addJournal(next,"Spirit Lattice - prepared a bound spirit to catch the scavenger's next opening.");
   return {state:next,message:"A spirit is bound into a precise lattice. The next failed exchange will cost the scavenger 1 Resolve, though Danger will still rise."};
  }
  if(profile.raceId==="high_elf"&&next.stage==="encounter"){
   useRacialFeature(next);next.calafreyWardReady=true;
   addJournal(next,"Calafrey Discipline - prepared a measured ward against one setback.");
   return {state:next,message:"A measured ward takes shape. The next failed exchange will not raise Danger."};
  }
  if(profile.raceId==="wood_elf"&&next.stage==="encounter"){
   useRacialFeature(next);next.wyrdpathReady=true;
   addJournal(next,"Wyrdpath - followed living signs to take a flanking line.");
   return {state:next,message:"The wood elf follows signs in the scrub and takes a living flank. The next successful exchange removes 2 Resolve instead of 1."};
  }
  if(profile.raceId==="deep_elf"&&next.stage==="encounter"&&next.clue&&next.enemyResolve>0){
   useRacialFeature(next);next.enemyResolve=Math.max(0,next.enemyResolve-1);
   if(next.enemyResolve===0){next.stage="aftermath";next.outcome="victory"}
   addJournal(next,"Shadow's Veil - used the known opening to strike unseen and remove 1 Resolve.");
   return {state:next,message:next.outcome==="victory"?"The known opening lets the deep elf take the signal slate from the shadows.":"The deep elf uses the clue to strike unseen, removing 1 Resolve without increasing Danger."};
  }
  if(profile.raceId==="ogre"&&next.stage==="encounter"){
   useRacialFeature(next);next.enemyResolve=Math.max(0,next.enemyResolve-1);
   if(next.enemyResolve===0){next.stage="aftermath";next.outcome="victory";addJournal(next,"Storm Coast Fury - a committed assault broke the scavenger's hold on the signal slate.");return {state:next,message:"The committed assault takes the slate. The scavenger yields before another exchange."}}
   const danger=raiseDanger(next,profile);addJournal(next,"Storm Coast Fury - removed 1 Resolve and risked 1 Danger.");
   return {state:next,message:"The ogre lands a committed blow, removing 1 Resolve."+danger};
  }
  if(profile.raceId==="halfling"&&next.stage==="encounter"&&next.enemyResolve===1){
   useRacialFeature(next);next.stage="aftermath";next.outcome="parley";
   addJournal(next,"Fontborn Memory - settled the encounter with a remembered wayfarer's tale.");
   return {state:next,message:"An old road-tale gives both sides a way to stand down. The scavenger returns the slate peacefully."};
  }
  if(profile.raceId==="goblin"&&next.stage==="encounter"&&next.clue){
   useRacialFeature(next);
   const result=check(profile,"dex",13,roll);
   if(result.success){next.stage="aftermath";next.outcome="victory"}
   else raiseDanger(next,profile);
   addJournal(next,"Secret-Sense - hidden-route Dexterity check: d20 "+result.roll+" "+(result.modifier>=0?"+":"")+result.modifier+" = "+result.total+" vs DC 13 - "+(result.success?"success":"failure")+".");
   const message=result.success?"The goblin spots an unguarded seam, slips through, and recovers the slate.":next.outcome==="driven-off"?"The hidden route closes as the scavenger escapes through another cut.":"The hidden route is watched; Danger rises to "+next.enemyPressure+".";
   return {state:next,message,roll:result};
  }
  throw new Error("This racial feature is not available at this point in the chapter.");
 }
 if(action?.type==="combat"&&next.stage==="encounter"){
  const option=ENCOUNTER.find(item=>item.id===action.id)||(action.id==="class"?{id:"class",label:"Use "+profile.className+" training",stat:bestClassStat(profile),dc:14,detail:"Use your strongest class stat."}:null);if(!option)throw new Error("Choose an encounter action.");
  const result=check(profile,option.stat,option.dc,roll);let featureMessage="";
  if(result.success){
   const progress=next.wyrdpathReady?2:1;
   if(next.wyrdpathReady){next.wyrdpathReady=false;featureMessage=" Wyrdpath turns the flank into a decisive opening."}
   next.enemyResolve=Math.max(0,next.enemyResolve-progress);
   if(next.enemyResolve===0){next.stage="aftermath";next.outcome="victory"}
  }else{
   if(next.spiritLatticeReady){next.spiritLatticeReady=false;next.enemyResolve=Math.max(0,next.enemyResolve-1);featureMessage=" Spirit Lattice catches the scavenger in a bound spirit, removing 1 Resolve."}
   if(next.enemyResolve===0){next.stage="aftermath";next.outcome="victory"}
   else featureMessage+=raiseDanger(next,profile);
  }
  addJournal(next,option.label+": d20 "+result.roll+" "+(result.modifier>=0?"+":"")+result.modifier+" = "+result.total+" vs DC "+result.dc+" - "+(result.success?"success":"failure")+".");
  let message=result.success?"Your move turns the encounter in your favor.":"The scavenger forces you to give ground.";
  if(next.outcome==="victory")message="The scavenger yields the route slate and retreats into the broken ground.";
  if(next.outcome==="driven-off")message="The scavenger slips away through a narrow cut. You keep the trail and can still finish the job.";
  return {state:next,message:message+featureMessage,roll:result};
 }
 if(action?.type==="retreat"&&next.stage==="encounter"){
  next.stage="aftermath";next.outcome="withdrew";addJournal(next,"Withdrew from the encounter and chose a safer route back.");
  return {state:next,message:"You withdraw before the ground can trap you. The route can still be reported honestly."};
 }
 if(action?.type==="complete"&&next.stage==="aftermath"){
  next.stage="complete";next.completed=true;
  const resultText=next.outcome==="victory"?"Recovered the Dune Gate signal slate after driving off the scavenger.":next.outcome==="parley"?"Recovered the signal slate through a peaceful parley.":next.outcome==="mapped"?"Mapped a reliable safe route around the scavenger; the signal slate remains missing.":next.outcome==="driven-off"?"Marked the scavenger's escape route and restored a safe warning at Dune Gate.":"Mapped a safer approach to Dune Gate and warned the caravan crew.";
  addJournal(next,"Chapter complete: "+resultText);
  return {state:next,message:"Chapter complete. The signal route is recorded in the journal."};
 }
 throw new Error("That action is not available in the current chapter.");
}
function bestClassStat(profile){
 const bonus=profile?.classBonuses||{};
 return STATS.reduce((best,key)=>Number(bonus[key]||0)>Number(bonus[best]||0)?key:best,STATS[0]);
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
    if(!validSave(parsed,profile))throw new Error("The M&M adventure save does not match the active character or current save format.");
    save=parsed;
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
 let view="adventure",statusText=loadMessage;
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
 function perform(action,needsRoll,extra){
  if(blocked||!save)return;
  if(window.soaSaveRules?.isIntegrityBlocked?.()){blocked=true;statusText="Saved data is paused until the character archive is recovered.";render();return;}
  const before=save;
  try{
   const roll=needsRoll?Math.floor(Math.random()*20)+1:undefined;
   const result=transition(save,profile,action,roll);
   save=result.state;
   localStorage.setItem(KEY,JSON.stringify(save));
   statusText=result.message+(result.roll?" Roll "+result.roll.roll+" + "+result.roll.modifier+" = "+result.roll.total+" vs DC "+result.roll.dc+" \u00b7 "+(result.roll.success?"Success":"Failure")+".":"");
  }catch(error){save=before;statusText=error.message}
  render();
  app.querySelector("h2")?.focus();
 }
 function renderOrigin(panel){
  panel.append(el("p","Choose the opening region for this custom story chapter on A\u00eathoril. The official game's starting-city eligibility can depend on race, faith/deity, and class; this story-origin choice does not enforce that full matrix.","soa-mnm-rule-note"));
  const grid=el("div",undefined,"soa-mnm-origin-grid");
  for(const region of REGIONS)grid.append(button(region.name,region.description+" "+region.lore,()=>perform({type:"origin",region:region.id},false)));
  panel.append(grid);
 }
 function renderBriefing(panel){
  const region=REGIONS.find(item=>item.id===save.origin);
  panel.append(el("div","ORIGINAL PROJECT STORY \u00b7 CHAPTER ONE","soa-mnm-kicker"),el("h2","The Quiet Signal at Dune Gate"));
  panel.append(el("p","From "+region.name+", you travel toward the outer reaches of Szuur. Sera Fen, a caravan signal-keeper, says the warning bell at Dune Gate has gone silent. A route slate is missing, and the next caravan is already on the road."));
  panel.append(el("p","The Szuur route and its missing signal are original story material for this game. Your race and class shape your character sheet; no official M&M class abilities are being simulated in this chapter."));
  panel.append(button("Take the trail","Accept the signal-keeper's request and investigate the marker.",()=>perform({type:"accept"},false),"med"));
 }
 function renderApproach(panel){
  panel.append(el("div","QUEST · INVESTIGATE","soa-mnm-kicker"),el("h2","Find the missing signal"));
  panel.append(el("p","The trail leaves the caravan road at a half-buried marker. Choose how "+profile.name+" looks for the missing route slate. A failed check still advances the story, but leaves the scavenger harder to corner."));
  panel.append(actionList(APPROACHES,"approach"));
  if(profile.raceId==="gnome"&&!save.racialFeatureUsed)panel.append(button("Eureka - reveal the clue","Use a once-per-chapter insight instead of rolling. The scavenger begins at 2 Resolve.",()=>perform({type:"racial",id:"gnome"},false),"med"));
 }
 function renderEncounter(panel){
  panel.append(el("div","ENCOUNTER · ORIGINAL STORY RULES","soa-mnm-kicker"),el("h2","A scavenger blocks the marker"));
  panel.append(el("p","A masked scavenger drags the route slate into the broken ground. This is a custom narrative encounter, not a creature or combat rule from the official game."));
  const meters=el("div",undefined,"soa-mnm-encounter-meters");
  meters.append(meter("Scavenger resolve",save.enemyResolve,save.clue?2:3),meter("Danger",save.enemyPressure,3));
  panel.append(meters,el("p","Win by reducing Resolve to zero. Three Danger lets the scavenger escape; retreat remains available. Racial features are original Shadows of Azeroth rules."));
  const racial=window.soaMnmRules.racialAbilities?.[profile.raceId];
  if(racial){
   const states=[];
   if(save.racialFeatureUsed)states.push("used this chapter");
   else if(profile.raceId==="troll")states.push("passive safeguard ready");
   else states.push("available once this chapter");
   if(save.titanBraceReady)states.push("Titan's brace prepared");
   if(save.calafreyWardReady)states.push("Calafrey ward prepared");
   if(save.spiritLatticeReady)states.push("Spirit Lattice prepared");
   if(save.wyrdpathReady)states.push("Wyrdpath flank prepared");
   panel.append(el("p",racial.name+" · "+states.join(" · ")+" - "+racial.effect,"soa-mnm-feature-status"));
  }
  if(!save.racialFeatureUsed){
   const use=(label,detail,id,needsRoll=false)=>panel.append(button(label,detail,()=>perform({type:"racial",id},needsRoll),"med"));
   if(profile.raceId==="human"&&!save.clue){
    const alternatives=APPROACHES.filter(item=>item.id!==save.approachUsed);
    const options=el("div",undefined,"soa-mnm-racial-options");
    options.append(el("h3","Many Roads - change your approach"),el("p","The first investigation failed. Choose a different method for one fresh roll; it gets no racial modifier."));
    for(const item of alternatives)options.append(button(item.label,item.detail+" · "+STAT_NAMES[item.stat]+" · DC "+item.dc,()=>perform({type:"humanRetry",id:item.id},true),"low"));
    panel.append(options);
   }
   if(profile.raceId==="deep_gnome")use("Spiral Cartographer - map a safe route","Complete with a reliable warning instead of recovering the slate.","deep_gnome");
   if(profile.raceId==="dwarf")use("Titan's Craft - brace or repair","Remove 1 Danger, or brace the marker to cancel the next Danger increase.","dwarf");
   if(profile.raceId==="deep_dwarf")use("Spirit Lattice - prepare a bound spirit","The next failed exchange also removes 1 scavenger Resolve; Danger still rises.","deep_dwarf");
   if(profile.raceId==="high_elf")use("Calafrey Discipline - prepare a ward","The next failed exchange will not increase Danger.","high_elf");
   if(profile.raceId==="wood_elf")use("Wyrdpath - take a living flank","The next successful exchange removes 2 Resolve instead of 1; no roll bonus.","wood_elf");
   if(profile.raceId==="deep_elf"&&save.clue&&save.enemyResolve>0)use("Shadow's Veil - strike unseen","Use the known opening to remove 1 Resolve without increasing Danger.","deep_elf");
   if(profile.raceId==="ogre")use("Storm Coast Fury - committed assault","Remove 1 Resolve and add 1 Danger.","ogre");
   if(profile.raceId==="halfling"&&save.enemyResolve===1)use("Fontborn Memory - parley","End the encounter peacefully and recover the slate through an old wayfarer's tale.","halfling");
   if(profile.raceId==="goblin"&&save.clue)use("Secret-Sense - slip through the hidden route","Unmodified Dexterity check, DC 13. Success takes the slate; failure adds Danger.","goblin",true);
  }
  const classStat=bestClassStat(profile),classBonus=Number(profile.classBonuses?.[classStat]||0);
  const signature={id:"class",label:"Use "+profile.className+" training",stat:classStat,dc:14,detail:"Make the encounter fit your strongest class stat ("+STAT_NAMES[classStat]+", class modifier "+(classBonus>=0?"+":"")+classBonus+")."};
  panel.append(actionList(ENCOUNTER.filter(x=>x.id!=="sta"),"combat"));
  panel.append(actionList([ENCOUNTER.find(x=>x.id==="sta"),signature],"combat"));
  panel.append(button("Withdraw safely","End the encounter and return with a route report.",()=>perform({type:"retreat"},false),"low"));
 }
 function meter(label,value,max){
  const wrap=el("div",undefined,"soa-mnm-meter");wrap.append(el("span",label),el("strong",value+" / "+max));
  const track=el("div",undefined,"soa-mnm-meter-track"),fill=el("i");fill.style.width=(max?Math.max(0,Math.min(100,value/max*100)):0)+"%";track.append(fill);wrap.append(track);return wrap;
 }
 function renderAftermath(panel){
  panel.append(el("div","QUEST · RETURN","soa-mnm-kicker"),el("h2",save.outcome==="victory"?"The route is safe":save.outcome==="parley"?"The slate is returned":save.outcome==="mapped"?"A safe route is mapped":save.outcome==="driven-off"?"The threat is marked":"A safer route home"));
  const line=save.outcome==="victory"?"The signal slate is recovered. Sera restores the warning bell before the caravan reaches the broken ground.":save.outcome==="parley"?"The scavenger returns the signal slate after a peaceful exchange, and Sera restores the warning bell.":save.outcome==="mapped"?"The slate remains missing, but the safe alternate route is mapped and Sera can warn every caravan.":save.outcome==="driven-off"?"Sera records the danger and marks the scavenger's escape route.":"Sera Fen records the danger and marks a safer route around the damaged signal post.";
  panel.append(el("p",line),el("p","Your choices and the encounter are saved in the Journey Log."));
  panel.append(button("Record the chapter","Complete the quest and preserve its outcome in the journal.",()=>perform({type:"complete"},false),"med"));
 }
 function renderComplete(panel){
  panel.append(el("div","CHAPTER ONE \u00b7 COMPLETE","soa-mnm-kicker"),el("h2","The Quiet Signal at Dune Gate"));
  panel.append(el("p","The caravan route is marked safe, and your account of the encounter is preserved. Open the Journey Log to review your choices and rolls."));
  panel.append(el("p","This first chapter does not award XP, equipment, or levels yet; those systems are still being converted to the new game."));
  panel.append(button("Review the Journey Log","See region choice, checks, encounter actions, and quest outcome.",()=>setView("journal",false)));
 }
 function renderJournal(panel){
  panel.append(el("div","YOUR ADVENTURE \u00b7 LOCAL JOURNAL","soa-mnm-kicker"),el("h2","Journey Log"));
  if(!save?.journal?.length)panel.append(el("p","Your story has not begun. Choose a starting region on the Adventure tab."));
  else{const list=el("ol",undefined,"soa-mnm-journal");for(const line of save.journal)list.append(el("li",line));panel.append(list)}
  panel.append(el("p","Saved on this device with the selected character's other save data. It is included in the character archive backup."));
 }
 function render(){
  if(!app.isConnected)return;
  app.replaceChildren();
  const hero=el("section",undefined,"soa-mnm-game-heading");
  hero.append(el("div","MONSTERS & MEMORIES \u00b7 ORIGINAL ADVENTURE","soa-mnm-kicker"),el("h1",profile.name));
  hero.append(el("p",profile.race+" "+profile.className+" \u00b7 Level "+(profile.level||1)+" \u00b7 "+(save?.origin?REGIONS.find(x=>x.id===save.origin)?.name:"Choose an opening region"),"soa-mnm-subtitle"));
  const racial=window.soaMnmRules.racialAbilities?.[profile.raceId];if(racial)hero.append(el("p","CUSTOM RACIAL FEATURE · "+racial.name+" - "+racial.description+" Effect: "+racial.effect,"soa-mnm-feature"));
  app.append(hero);
  const tabs=el("div",undefined,"soa-mnm-tabs");tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","M&M character views");
  for(const [id,label] of [["adventure","Adventure"],["character","Character"],["journal","Journey Log"],["combat","Combat"],["progress","Progress"],["inventory","Items"]]){
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
  }else if(view==="combat"||view==="progress"||view==="inventory"){
   const systemPanel=window.soaMnmSystems?.render?.(view,profile,()=>render());
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
  rules.append(el("p","Checks use this project's existing d20 helper: d20 + floor((starting stat \u2212 10) / 2) against the printed DC; natural 20 succeeds and natural 1 fails. DCs and the Resolve/Pressure encounter are custom Shadows of Azeroth story rules. The Combat, Progress, and Items views expose documented M&M rules, but do not resolve damage, award or level XP, or create catalog items until official formulas and data are available."));
  app.append(rules);
  const roster=el("button","\u2630 Character Select","soa-mnm-roster-button");roster.type="button";roster.onclick=()=>window.soaCharacters?.showMenu?.();app.append(roster);
 }
 function el(tag,text,cls){
  const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;
 }
 if(blocked&&!save)save=createSave(profile);
 render();
}
window.soaMnmAdventure=Object.freeze({key:KEY,createSave,validSave,transition,regions:REGIONS.map(x=>({...x})),approaches:APPROACHES.map(x=>({...x})),encounter:ENCOUNTER.map(x=>({...x})),boot});
document.addEventListener("DOMContentLoaded",boot);
})();