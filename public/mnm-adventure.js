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
const RACIAL_STORY_FEATURES={
 human:{phase:"approach",stats:STATS},
 gnome:{phase:"approach",stats:["int"]},
 deep_gnome:{phase:"approach",stats:["int","wis"]},
 dwarf:{phase:"approach",stats:["int","sta"]},
 deep_dwarf:{phase:"approach",stats:["int"]},
 high_elf:{phase:"approach",stats:["int"]},
 wood_elf:{phase:"approach",stats:["wis","agi"]},
 deep_elf:{phase:"encounter",stats:["agi"]},
 ogre:{phase:"encounter",stats:["str","sta"]},
 halfling:{phase:"approach",stats:["wis"]},
 goblin:{phase:"approach",stats:["int","wis"]}
};
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
 return {version:VERSION,characterId:String(profile?.id||""),stage:"origin",origin:"",clue:false,enemyResolve:3,enemyPressure:0,outcome:"",completed:false,racialFeatureUsed:false,trollAdaptationReady:false,journal:[],updatedAt:new Date().toISOString()};
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
 if(!["","victory","driven-off","withdrew"].includes(value.outcome)||typeof value.completed!=="boolean"||!Array.isArray(value.journal)||value.journal.length>100||value.journal.some(x=>typeof x!=="string"))return false;
 if(value.racialFeatureUsed!==undefined&&typeof value.racialFeatureUsed!=="boolean"||value.trollAdaptationReady!==undefined&&typeof value.trollAdaptationReady!=="boolean")return false;
 if(value.racialFeatureUsed===undefined)value.racialFeatureUsed=false;
 if(value.trollAdaptationReady===undefined)value.trollAdaptationReady=false;
 return value.stage!=="complete"||value.completed===true;
}
function racialStoryBonus(profile,save,phase,stat){
 if(save.racialFeatureUsed)return {bonus:0,name:""};
 if(profile?.raceId==="troll"){
  if(phase==="encounter"&&save.trollAdaptationReady)return {bonus:1,name:"Tempered Survivor"};
  return {bonus:0,name:""};
 }
 const feature=RACIAL_STORY_FEATURES[profile?.raceId];
 if(!feature||feature.phase!==phase||!feature.stats.includes(stat))return {bonus:0,name:""};
 const description=window.soaMnmRules.racialAbilities?.[profile.raceId];
 return {bonus:1,name:description?.name||"Custom racial feature"};
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
  const trait=racialStoryBonus(profile,next,"approach",option.stat);const result=check(profile,option.stat,option.dc,roll,trait.bonus);if(trait.bonus)next.racialFeatureUsed=true;if(profile.raceId==="troll"&&!result.success)next.trollAdaptationReady=true;next.clue=result.success;next.enemyResolve=result.success?2:3;next.enemyPressure=0;next.stage="encounter";
  let outcome=result.success?"You find a useful lead before the scavenger blocks the route.":"The clues remain uncertain, but the stolen signal slate draws you to the creature.";
  addJournal(next,option.label+": d20 "+result.roll+" "+(result.modifier>=0?"+":"")+result.modifier+(result.storyBonus?" + racial feature "+result.storyBonus:"")+" = "+result.total+" vs DC "+result.dc+" \u2014 "+(result.success?"success":"failure")+".");
  if(trait.bonus)outcome+=" "+trait.name+" reveals a useful opening.";
  if(profile.raceId==="troll"&&!result.success)outcome+=" Tempered Survivor is ready for the next encounter check.";
  return {state:next,message:outcome,roll:result};
 }
 if(action?.type==="combat"&&next.stage==="encounter"){
  const option=ENCOUNTER.find(item=>item.id===action.id)||(action.id==="class"?{id:"class",label:"Use "+profile.className+" training",stat:bestClassStat(profile),dc:14,detail:"Use your strongest class stat."}:null);if(!option)throw new Error("Choose an encounter action.");
  const trait=racialStoryBonus(profile,next,"encounter",option.stat);const result=check(profile,option.stat,option.dc,roll,trait.bonus);if(trait.bonus){next.racialFeatureUsed=true;next.trollAdaptationReady=false;}
  if(result.success){next.enemyResolve=Math.max(0,next.enemyResolve-1);if(next.enemyResolve===0){next.stage="aftermath";next.outcome="victory"}}
  else{next.enemyPressure=Math.min(3,next.enemyPressure+1);if(next.enemyPressure===3){next.stage="aftermath";next.outcome="driven-off"}}
  addJournal(next,option.label+": d20 "+result.roll+" "+(result.modifier>=0?"+":"")+result.modifier+(result.storyBonus?" + racial feature "+result.storyBonus:"")+" = "+result.total+" vs DC "+result.dc+" \u2014 "+(result.success?"success":"failure")+".");
  let message=result.success?"Your move turns the encounter in your favor.":"The scavenger forces you to give ground.";
  if(next.outcome==="victory")message="The scavenger yields the route slate and retreats into the broken ground.";
  if(next.outcome==="driven-off")message="The scavenger slips away through a narrow cut. You keep the trail and can still finish the job.";
  return {state:next,message,roll:result};
 }
 if(action?.type==="retreat"&&next.stage==="encounter"){
  next.stage="aftermath";next.outcome="withdrew";addJournal(next,"Withdrew from the encounter and chose a safer route back.");
  return {state:next,message:"You withdraw before the ground can trap you. The route can still be reported honestly."};
 }
 if(action?.type==="complete"&&next.stage==="aftermath"){
  next.stage="complete";next.completed=true;
  const resultText=next.outcome==="victory"?"Recovered the Dune Gate signal slate after driving off the scavenger.":next.outcome==="driven-off"?"Marked the scavenger's escape route and restored a safe warning at Dune Gate.":"Mapped a safer approach to Dune Gate and warned the caravan crew.";
  addJournal(next,"Chapter complete: "+resultText);
  return {state:next,message:"Chapter complete. The signal route is recorded in your journal."};
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
  panel.append(el("div","QUEST \u00b7 INVESTIGATE","soa-mnm-kicker"),el("h2","Find the missing signal"));
  panel.append(el("p","The trail leaves the caravan road at a half-buried marker. Choose how "+profile.name+" looks for the missing route slate. A failed check still advances the story, but leaves the scavenger harder to corner."));
  panel.append(actionList(APPROACHES,"approach"));
 }
 function renderEncounter(panel){
  panel.append(el("div","ENCOUNTER \u00b7 ORIGINAL STORY RULES","soa-mnm-kicker"),el("h2","A scavenger blocks the marker"));
  panel.append(el("p","A masked scavenger drags the route slate into the broken ground. This is a custom narrative encounter, not a creature or combat rule from the official game."));
  const meters=el("div",undefined,"soa-mnm-encounter-meters");
  meters.append(meter("Scavenger resolve",save.enemyResolve,save.clue?2:3),meter("Danger",save.enemyPressure,3));
  panel.append(meters,el("p","Win by reducing resolve to zero. Three failed exchanges let the scavenger escape; retreat is always available. No character death is possible in this story prototype."));
  const racial=window.soaMnmRules.racialAbilities?.[profile.raceId];if(racial){const traitState=save.racialFeatureUsed?"Custom racial story feature used this chapter.":profile.raceId==="troll"?(save.trollAdaptationReady?"Tempered Survivor is ready after the failed investigation.":"Tempered Survivor responds to a setback; it has not triggered this chapter."):"Custom racial story feature may add +1 to one lore-matched check this chapter.";panel.append(el("p",racial.name+" \u00b7 "+traitState,"soa-mnm-feature-status"));}
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
  panel.append(el("div","QUEST \u00b7 RETURN","soa-mnm-kicker"),el("h2",save.outcome==="victory"?"The route is safe":save.outcome==="driven-off"?"The threat is marked":"A safer route home"));
  const line=save.outcome==="victory"?"The signal slate is recovered. Sera restores the warning bell before the caravan reaches the broken ground.":"Sera Fen records the danger and marks a safer route around the damaged signal post.";
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
  const racial=window.soaMnmRules.racialAbilities?.[profile.raceId];if(racial)hero.append(el("p","CUSTOM RACIAL FEATURE \u00b7 "+racial.name+" \u2014 "+racial.description,"soa-mnm-feature"));
  app.append(hero);
  const tabs=el("div",undefined,"soa-mnm-tabs");tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","Adventure views");
  for(const [id,label] of [["adventure","Adventure"],["character","Character"],["journal","Journey Log"]]){
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
  rules.append(el("p","Checks use this project's existing d20 helper: d20 + floor((starting stat \u2212 10) / 2) against the printed DC; natural 20 succeeds and natural 1 fails. DCs and the Resolve/Pressure encounter are custom Shadows of Azeroth story rules. They do not replace official M&M combat, class abilities, XP, or item rules."));
  app.append(rules);
  const roster=el("button","\u2630 Character Select","soa-mnm-roster-button");roster.type="button";roster.onclick=()=>window.soaCharacters?.showMenu?.();app.append(roster);
 }
 function el(tag,text,cls){
  const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;
 }
 if(blocked&&!save)save=createSave(profile);
 render();
}
window.soaMnmAdventure=Object.freeze({key:KEY,createSave,validSave,transition,regions:REGIONS.map(x=>({...x})),approaches:APPROACHES.map(x=>({...x})),encounter:ENCOUNTER.map(x=>({...x})),racialStoryFeatures:{...RACIAL_STORY_FEATURES},boot});
document.addEventListener("DOMContentLoaded",boot);
})();