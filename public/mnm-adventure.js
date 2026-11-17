(()=>{"use strict";
const KEY="soa-mnm-adventure-v1",VERSION=3;
let activeBindPointReturn=()=>false;
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
const clone=value=>JSON.parse(JSON.stringify(value));
const cleanText=value=>String(value??"").replace(/[<>]/g,"").slice(0,220);
function startingRegionForProfile(profile){
 const requested=window.soaMnmRules?.startLocationForRace?.(profile?.raceId)||profile?.startingLocation||"night-harbor";
 return REGIONS.some(region=>region.id===requested)?requested:"night-harbor";
}
const ARENA_NAMES=Object.freeze({"night-harbor":"Night Harbor Arena",underdocks:"Underdocks Fighting Pits",penshaw:"Penshaw Arena",faelindral:"Faelindral Challenge Grounds","ail-vorith":"Ail'vorith Arena"});
function arenaNameForRegion(id){return ARENA_NAMES[id]||((REGIONS.find(region=>region.id===id)?.name||"City")+" Arena")}
function validArenaRecord(value){return !!value&&typeof value==="object"&&!Array.isArray(value)&&["bouts","wins","withdrawals"].every(key=>Number.isSafeInteger(value[key])&&value[key]>=0)&&value.wins<=value.bouts&&value.withdrawals<=value.bouts&&value.wins+value.withdrawals<=value.bouts}
function createSave(profile){
 const origin=startingRegionForProfile(profile),region=REGIONS.find(item=>item.id===origin);
 return {version:VERSION,characterId:String(profile?.id||""),currentLocation:origin,currentSite:"city",arenaRecord:{bouts:0,wins:0,withdrawals:0},arenaEncounterId:"",arenaKillsAtStart:0,arenaFoeName:"",journal:["You begin in "+region.name+(region.zone?" in "+region.zone:".")],aiCampaign:window.soaMnmAiChronicle?.createCampaign?.(profile)||null,updatedAt:new Date().toISOString()};
}
function validSave(value,profile){
 if(!value||typeof value!=="object"||Array.isArray(value)||value.version!==VERSION||value.characterId!==String(profile?.id||""))return false;
 if(!REGIONS.some(region=>region.id===value.currentLocation)||!["city","arena"].includes(value.currentSite))return false;
 if(!validArenaRecord(value.arenaRecord)||typeof value.arenaEncounterId!=="string"||value.arenaEncounterId.length>100||!Number.isSafeInteger(value.arenaKillsAtStart)||value.arenaKillsAtStart<0||typeof value.arenaFoeName!=="string"||value.arenaFoeName.length>220)return false;
 if(!Array.isArray(value.journal)||value.journal.length>100||value.journal.some(item=>typeof item!=="string"))return false;
 if(value.aiCampaign!==null&&window.soaMnmAiChronicle&&!window.soaMnmAiChronicle.validCampaign(value.aiCampaign,profile))return false;
 return true;
}
function addJournal(save,line){
 if(!Array.isArray(save.journal))save.journal=[];
 save.journal.push(cleanText(line));
 if(save.journal.length>100)save.journal=save.journal.slice(-100);
 save.updatedAt=new Date().toISOString();
}
function migrateAdventureSave(value,profile){
 if(!value||typeof value!=="object"||Array.isArray(value)||![1,2,VERSION].includes(value.version))return {save:value,changed:false};
 let changed=false;
 const oldVersion=value.version,retiredKeys=["origin","stage","clue","approachUsed","outcome","completed","racialFeatureUsed","combatEncounterId","combatKillsAtStart","combatFoeName"];
 const hadRetiredChapter=retiredKeys.some(key=>Object.prototype.hasOwnProperty.call(value,key));
 if(!Array.isArray(value.journal)){value.journal=[];changed=true}
 if(oldVersion!==VERSION){
  value.version=VERSION;changed=true;
  if(hadRetiredChapter&&!value.journal.some(line=>typeof line==="string"&&line.includes("standalone chapter was retired")))addJournal(value,"The standalone chapter was retired; existing Journey Log entries remain. Adventure now continues through the generated campaign.");
  if(oldVersion===1)for(const key of ["enemyResolve","enemyPressure","trollAdaptationReady","titanBraceReady","calafreyWardReady","spiritLatticeReady","wyrdpathReady"])delete value[key];
 }
 if(!REGIONS.some(region=>region.id===value.currentLocation)){value.currentLocation=REGIONS.some(region=>region.id===value.origin)?value.origin:startingRegionForProfile(profile);changed=true}
 if(value.currentSite!=="city"&&value.currentSite!=="arena"){value.currentSite="city";changed=true}
 if(!validArenaRecord(value.arenaRecord)){value.arenaRecord={bouts:0,wins:0,withdrawals:0};changed=true}
 if(typeof value.arenaEncounterId!=="string"||value.arenaEncounterId.length>100){value.arenaEncounterId="";changed=true}
 if(!Number.isSafeInteger(value.arenaKillsAtStart)||value.arenaKillsAtStart<0){value.arenaKillsAtStart=0;changed=true}
 if(typeof value.arenaFoeName!=="string"||value.arenaFoeName.length>220){value.arenaFoeName="";changed=true}
 if(value.aiCampaign===undefined){value.aiCampaign=window.soaMnmAiChronicle?.createCampaign?.(profile)||null;changed=true}
 for(const key of retiredKeys)if(Object.prototype.hasOwnProperty.call(value,key)){delete value[key];changed=true}
 return {save:value,changed};
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
    const migration=migrateAdventureSave(parsed,profile);
    save=migration.save;
    if(!validSave(save,profile))throw new Error("The M&M adventure save does not match the active character or current save format.");
     if(migration.changed||needsAiMigration)localStorage.setItem(KEY,JSON.stringify(save));
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
 function setView(name,focus){
  view=name;render();
  if(focus)app.querySelector('[data-view="'+name+'"]')?.focus();
 }
 function persistAiCampaign(options={}){
  if(blocked||!save)return false;
  if(window.soaSaveRules?.isIntegrityBlocked?.()){blocked=true;statusText="Saved data is paused until the character archive is recovered.";render();return false;}
  const previousUpdatedAt=save.updatedAt;
  try{save.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(save));statusText=options.message||"Campaign saved to this character's story.";if(options.render!==false)render();return true}
  catch{save.updatedAt=previousUpdatedAt;statusText="The campaign could not be saved. Your previous saved story is intact.";return false}
 }
 function currentStoryProfile(){
  const state=window.soaMnmSystems?.read?.(profile);
  return {...profile,level:state?.ok?state.save.level:profile.level||1};
 }
 function persistAdventure(next,message){
  if(blocked||window.soaSaveRules?.isIntegrityBlocked?.()){blocked=true;statusText="Saved data is paused until the character archive is recovered.";return false}
  try{next.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(next));save=next;if(message!==undefined)statusText=message;return true}
  catch{statusText="The adventure could not be saved. Your previous story remains intact.";return false}
 }
 function synchronizeArenaCombat(){
  if(!save?.arenaEncounterId)return false;
  const state=window.soaMnmSystems?.read?.(profile);
  if(!state?.ok)return false;
  if(state.save.rpg.encounter?.id===save.arenaEncounterId)return false;
  const next=clone(save),won=state.save.rpg.kills>next.arenaKillsAtStart;
  next.arenaRecord.bouts++;
  if(won)next.arenaRecord.wins++;else next.arenaRecord.withdrawals++;
  const foe=next.arenaFoeName||"the arena opponent";
  next.arenaEncounterId="";next.arenaKillsAtStart=0;next.arenaFoeName="";
  addJournal(next,won?"Arena bout won against "+foe+".":"Arena bout ended without a victory against "+foe+".");
  return persistAdventure(next,won?"Arena victory recorded. You may enter another bout.":"The arena bout ended without a victory. Your record has been saved.");
 }
 function travelWithinCity(site){
  if(blocked||!save)return;
  if(site!=="city"&&site!=="arena")return;
  if(site===save.currentSite)return;
  if(site==="city"&&save.arenaEncounterId){statusText="Finish or escape your arena bout before leaving the arena.";render();return}
  const state=window.soaMnmSystems?.read?.(profile);
  if(!state?.ok){statusText=state?.error||"The current encounter could not be checked safely.";render();return}
  if(state.save.rpg.encounter){statusText="Finish or escape your current encounter before moving around the city.";render();return}
  const next=clone(save),region=REGIONS.find(item=>item.id===next.currentLocation),name=arenaNameForRegion(next.currentLocation);
  next.currentSite=site;
  addJournal(next,site==="arena"?"Traveled from "+region.name+" city streets to "+name+".":"Returned from "+name+" to "+region.name+" city streets.");
  if(persistAdventure(next,site==="arena"?"You arrive at "+name+". Arena challenges are available here.":"You return to the streets of "+region.name+"."))render();
 }
 function travelToRegion(to){
  if(blocked||!save)return;
  if(save.currentSite==="arena"){statusText="Return to the city streets before traveling to another region.";render();return}
  const state=window.soaMnmSystems?.read?.(profile);
  if(!state?.ok){statusText=state?.error||"The current encounter could not be checked safely.";render();return}
  if(state.save.rpg.encounter){statusText="Finish or escape your current encounter before leaving this region.";render();return}
  const route=TRAVEL_ROUTES.find(item=>item.from===save.currentLocation&&item.to===to);
  if(!route){statusText="There is no direct route from this location.";render();return}
  const from=REGIONS.find(item=>item.id===route.from),target=REGIONS.find(item=>item.id===route.to),next=clone(save);
  next.currentLocation=target.id;next.currentSite="city";
  addJournal(next,"Traveled from "+from.name+" to "+target.name+" by "+route.method.toLowerCase()+".");
  if(persistAdventure(next,"You arrive in "+target.name+(target.zone?", "+target.zone:".")))render();
 }
 function beginArenaBout(){
  if(blocked||!save)return;
  if(save.currentSite!=="arena"){statusText="Travel to the city arena through the World tab before entering a bout.";render();return}
  const systems=window.soaMnmSystems,state=systems?.read?.(profile);
  if(!state?.ok){statusText=state?.error||"Arena combat is unavailable right now.";render();return}
  if(state.save.rpg.encounter){statusText="Finish or leave your current encounter before entering an arena bout.";render();return}
  const previous=clone(save),expectedId="rpg-foe-"+(Number(state.save.rpg.encounterSerial||0)+1),pending=clone(save);
  pending.arenaEncounterId=expectedId;pending.arenaKillsAtStart=state.save.rpg.kills;pending.arenaFoeName="";
  if(!persistAdventure(pending,"The arena marshal prepares your bout.")){render();return}
  const started=systems.startEncounter(currentStoryProfile(),save.currentLocation);
  if(!started?.ok){
   persistAdventure(previous,started?.error||"The arena bout could not be started.");
   render();return;
  }
  const foe=started.save?.rpg?.encounter||started.result?.encounter;
  if(!foe){
   persistAdventure(previous,"The arena opponent could not be saved. Your previous story is intact.");
   render();return;
  }
  const next=clone(save);next.arenaEncounterId=foe.id;next.arenaFoeName=cleanText(foe.name);
  addJournal(next,"Entered a city arena bout in "+arenaNameForRegion(next.currentLocation)+" against "+foe.name+".");
  persistAdventure(next,"Arena bout started against "+foe.name+". Use the Combat tab or fight here to continue.");
  render();
 }
 activeBindPointReturn=destination=>{
  if(blocked||!save)return false;
  synchronizeArenaCombat();
  const target=REGIONS.find(region=>region.id===String(destination))||REGIONS.find(region=>region.id===startingRegionForProfile(profile))||REGIONS[0];
  const next=clone(save);
  next.currentLocation=target.id;next.currentSite="city";
  addJournal(next,"Defeat returned you to your bind point in "+target.name+". Your belongings remain on a recoverable corpse.");
  try{localStorage.setItem(KEY,JSON.stringify(next));save=next;view="inventory";statusText="You wake in "+target.name+". Travel back to the encounter region to recover your corpse.";render();return true}
  catch{statusText="You were defeated, but your return to the bind point could not be saved. Your previous adventure remains intact.";render();return false}
 };
 function renderArena(panel){
  const region=REGIONS.find(item=>item.id===save.currentLocation)||REGIONS[0],name=arenaNameForRegion(region.id);
  panel.append(el("div","CITY ARENA · CUSTOM M&M: RPG RULES","soa-mnm-kicker"),el("h2",name));
  if(save.currentSite!=="arena"){
   panel.append(el("p","You are in "+region.name+", not at its arena. Arena services only work after traveling there in person."));
   panel.append(button("Travel through the city","Open World and travel to "+name+". Choosing this tab does not move your character.",()=>setView("world",true),"med"));
   return;
  }
  panel.append(el("p","You are physically at "+name+". Bouts use the shared turn-based combat system and this region's custom encounter table. Standard M&M: RPG custom combat rewards apply; these are not official M&M arena rules."));
  const state=window.soaMnmSystems?.read?.(profile);
  if(!state?.ok){panel.append(el("p",state?.error||"Arena combat could not be loaded safely."));return}
  const foe=state.save.rpg.encounter;
  if(save.arenaEncounterId&&foe?.id===save.arenaEncounterId){
   panel.append(el("p","Arena bout in progress · "+foe.name+" · Round "+foe.round,"soa-mnm-feature-status"));
   const combat=window.soaMnmSystems.render("combat",currentStoryProfile(),()=>{synchronizeArenaCombat();render()},{locationId:save.currentLocation,returnToBindPoint:destination=>activeBindPointReturn(destination)});
   if(combat)panel.append(combat);else panel.append(el("p","Combat could not be loaded. Your saved bout remains intact.","soa-mnm-live"));
  }else if(foe){
   panel.append(el("p","Finish or escape your current encounter in the Combat tab before entering the arena."));
   panel.append(button("Open Combat","Resolve the encounter already in progress.",()=>setView("combat",true),"med"));
  }else{
   const record=save.arenaRecord;
   panel.append(el("p","Career record · "+record.wins+" wins · "+record.withdrawals+" bouts ended without a victory · "+record.bouts+" completed bouts.","soa-mnm-feature-status"));
   panel.append(button("Enter an arena bout","Face one regional opponent using normal turn-based combat. Victory awards use the standard custom encounter rules.",beginArenaBout,"med"));
   panel.append(button("Return to the city streets","Leave the arena and continue traveling through "+region.name+".",()=>travelWithinCity("city")));
  }
 }
 function renderJournal(panel){
  panel.append(el("div","YOUR ADVENTURE · LOCAL JOURNAL","soa-mnm-kicker"),el("h2","Journey Log"));
  if(!save?.journal?.length)panel.append(el("p","No journal entries have been recorded yet. Begin a generated chapter or travel through the World tab."));
  else{const list=el("ol",undefined,"soa-mnm-journal");for(const line of save.journal)list.append(el("li",line));panel.append(list)}
  panel.append(el("p","Saved on this device with the selected character's other save data. It is included in the character archive backup."));
 }
 function renderWorld(panel){
  const current=REGIONS.find(region=>region.id===save.currentLocation)||REGIONS[0],arena=arenaNameForRegion(current.id);
  panel.append(el("div","AÊTHORIL · WORLD","soa-mnm-kicker"),el("h2",current.name));
  panel.append(el("p",(current.zone?current.zone+" · ":"")+current.description+" "+current.lore));
  if(save.currentSite==="arena"){
   panel.append(el("p","Current location · "+arena+". You are physically at the city arena."));
   if(save.arenaEncounterId)panel.append(el("p","Complete or escape the active arena bout before returning to the city streets."));
   else panel.append(button("Return to the city streets","Leave "+arena+" and continue exploring "+current.name+".",()=>travelWithinCity("city")));
   panel.append(button("Open the Arena","Return to your arena bout or enter a new one.",()=>setView("arena",true),"med"));
   return;
  }
  panel.append(el("p","Current location · "+current.name+" city streets."));
  const state=window.soaMnmSystems?.read?.(profile);
  const encounter=state?.ok?state.save.rpg.encounter:null,hasEncounter=!!encounter;
  if(hasEncounter){
   panel.append(el("p","Active encounter · "+encounter.name+" · Level "+encounter.level+" · Health "+encounter.hp+" / "+encounter.maxHp,"soa-mnm-feature-status"));
   panel.append(button("Continue the encounter","Open Combat to take a turn or try to escape. City travel unlocks when the encounter ends.",()=>setView("combat",true),"med"));
  }
  const arenaButton=button("Travel to "+arena,"Visit the city arena in person. The Arena tab stays unavailable for bouts until you arrive.",()=>travelWithinCity("arena"),"med");
  arenaButton.disabled=!state?.ok||hasEncounter;panel.append(arenaButton);
  const routes=TRAVEL_ROUTES.filter(route=>route.from===current.id);
  if(routes.length){
   panel.append(el("h3","Travel from here"));
   const grid=el("div",undefined,"soa-mnm-choice-grid");
   for(const route of routes){const choice=button(route.name,route.method+" · "+route.detail,()=>travelToRegion(route.to));choice.disabled=!state?.ok||hasEncounter;grid.append(choice)}
   panel.append(grid);
  }
  panel.append(button("Continue the campaign","Return to your generated story and current location.",()=>setView("ai",false),"med"));
 }
 function render(){
  if(!app.isConnected)return;
  if(!blocked)synchronizeArenaCombat();
  app.replaceChildren();
  const hero=el("section",undefined,"soa-mnm-game-heading");
  hero.append(el("div","MONSTERS & MEMORIES \u00b7 ORIGINAL ADVENTURE","soa-mnm-kicker"),el("h1",profile.name));
  const current=REGIONS.find(x=>x.id===save?.currentLocation);
  const currentLevel=window.soaMnmSystems?.progressFor?.(profile)?.level||profile.level||1;
  const currentProfile={...profile,level:currentLevel};
  hero.append(el("p",profile.race+" "+profile.className+" · Level "+currentLevel+" · "+(current?(save.currentSite==="arena"?"At "+arenaNameForRegion(current.id)+" · "+current.zone:"In "+current.name+(current.zone?" · "+current.zone:"")):"Choose a starting city"),"soa-mnm-subtitle"));
  const racial=window.soaMnmRules.racialAbilities?.[profile.raceId];if(racial)hero.append(el("p","CUSTOM RACIAL FEATURE · "+racial.name+" - "+racial.description+" Effect: "+racial.effect,"soa-mnm-feature"));
  app.append(hero);
  const tabs=el("div",undefined,"soa-mnm-tabs");tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","M&M character views");
  for(const [id,label] of [["ai","Adventure"],["arena","Arena"],["world","World"],["character","Character"],["journal","Journey Log"],["combat","Combat"],["progress","Progress"],["inventory","Items"]]){
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
   else{const pane=el("section",undefined,"soa-mnm-adventure-panel");pane.append(el("h2","AI Chronicle unavailable"),el("p","The AI story module did not load. World travel, combat, the Arena, inventory, and character-bound saves remain available."));app.append(pane)}
  }else if(view==="combat"||view==="progress"||view==="inventory"){
   const systemPanel=window.soaMnmSystems?.render?.(view,currentProfile,()=>render(),{locationId:save.currentLocation,returnToBindPoint:destination=>activeBindPointReturn(destination)});
   if(systemPanel)app.append(systemPanel);
   else{const pane=el("section",undefined,"soa-mnm-adventure-panel");pane.append(el("h2","M&M system unavailable"),el("p","The M&M rules module did not load."));app.append(pane)}
  }else if(view==="arena"){
   const pane=el("section",undefined,"soa-mnm-adventure-panel");renderArena(pane);app.append(pane);
  }else{
   const pane=el("section",undefined,"soa-mnm-adventure-panel");pane.append(el("h2","View unavailable"),el("p","Choose one of the available character views."));app.append(pane);
  }
  const rules=el("details",undefined,"soa-mnm-rules-disclosure");
  rules.append(el("summary","Story rules and M&M source note"));
  rules.append(el("p","Adventure is the continuing generated campaign. Choices and custom d20 checks are saved locally before the Story Director responds; previous chapters, combat outcomes, and unresolved leads carry forward. City arenas require physical travel through the World tab and use the shared turn-based combat system. Combat, Progress, Items, and story-check values are original M&M: RPG rules, separate from confirmed M&M facts."));
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
window.soaMnmAdventure=Object.freeze({key:KEY,version:VERSION,humanStartRegion:"night-harbor",createSave,validSave,migrateAdventureSave,regions:REGIONS.map(x=>({...x})),travelRoutes:TRAVEL_ROUTES.map(x=>({...x})),arenaNames:{...ARENA_NAMES},returnToBindPoint:destination=>activeBindPointReturn(destination),boot});
if(document.readyState==="complete")start();else window.addEventListener("load",start,{once:true});
})();

