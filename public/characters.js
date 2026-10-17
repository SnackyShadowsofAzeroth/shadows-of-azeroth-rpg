(()=>{"use strict";
const ROSTER_KEY="soa-character-roster-v1", SLOT_PREFIX="soa-character-slot-v1-", ENTER_KEY="soa-character-entered";
const SAVES=["soa-save-v1","soa-campaign-v1","soa-companions-v1","soa-reputation-v1","soa-campaign-enabled","soa-progression-v1"];
const RACES={
 "Human":{faction:"Alliance",classes:["Warrior","Paladin","Hunter","Rogue","Priest","Mage","Warlock"]},
 "Dwarf":{faction:"Alliance",classes:["Warrior","Paladin","Hunter","Rogue","Priest","Shaman"]},
 "Night Elf":{faction:"Alliance",classes:["Warrior","Hunter","Rogue","Priest","Druid"]},
 "Gnome":{faction:"Alliance",classes:["Warrior","Rogue","Priest","Mage","Warlock"]},
 "Orc":{faction:"Horde",classes:["Warrior","Hunter","Rogue","Shaman","Mage","Warlock"]},
 "Undead":{faction:"Horde",classes:["Warrior","Paladin","Rogue","Priest","Mage","Warlock"]},
 "Tauren":{faction:"Horde",classes:["Warrior","Hunter","Shaman","Druid"]},
 "Troll":{faction:"Horde",classes:["Warrior","Hunter","Rogue","Priest","Shaman","Mage","Warlock"]},
 "Skyborne":{faction:"Choose",classes:["Warrior","Hunter","Rogue","Druid","Mage","Shaman"]}
};
const PROFS=["Alchemy","Blacksmithing","Enchanting","Engineering","Herbalism","Leatherworking","Mining","Skinning","Tailoring"];
const SECONDARY=["Cooking","Fishing","First Aid"];
const BASIC_GEAR={Warrior:["Worn Training Sword","Plain Shield","Simple Cloth Tunic"],Paladin:["Worn Training Mace","Plain Shield","Simple Cloth Tunic"],Hunter:["Worn Practice Bow","Small Quiver","Simple Cloth Tunic"],Rogue:["Worn Practice Dagger","Plain Cloth Tunic"],Priest:["Worn Wooden Staff","Plain Cloth Robe"],Shaman:["Worn Wooden Mace","Plain Cloth Tunic"],Mage:["Worn Wooden Staff","Plain Cloth Robe"],Warlock:["Worn Wooden Staff","Plain Cloth Robe"],Druid:["Worn Wooden Staff","Plain Cloth Tunic"]};
const isSnackyEgg=p=>p?.name==="Snacky Lugnuts"&&p?.gender==="Male"&&p?.race==="Gnome"&&p?.className==="Rogue"&&Object.keys(p?.professions||{}).includes("Mining")&&Object.keys(p?.professions||{}).includes("Engineering");
const START_ZONES={"Human":"Northshire Valley, Elwynn Forest","Dwarf":"Coldridge Valley, Dun Morogh","Gnome":"Coldridge Valley, Dun Morogh","Night Elf":"Shadowglen, Teldrassil","Orc":"Valley of Trials, Durotar","Troll":"Valley of Trials, Durotar","Undead":"Deathknell, Tirisfal Glades","Tauren":"Red Cloud Mesa, Mulgore","Skyborne":"Skyborne Enclave (original starting settlement)"};
const startingZone=p=>START_ZONES[p.race]||"a settlement in "+(p.faction==="Horde"?"Kalimdor":"the Eastern Kingdoms");
let roster,active;
const get=id=>document.getElementById(id);
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
// Keep grouped game content visible. Details elements remain useful as semantic containers,
// but players should not have to expand menus to reach their contents.
function keepGameSectionsExpanded(root=document){
 const expand=scope=>scope.querySelectorAll?.("details:not(.soa-collapsible-quests)").forEach(node=>{node.open=true});
 expand(root);
 const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
  if(node.nodeType!==1)return;
  if(node.matches("details")&&!node.classList.contains("soa-collapsible-quests"))node.open=true;
  expand(node);
 })));
 observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("toggle",event=>{if(event.target instanceof HTMLDetailsElement&&!event.target.open&&!event.target.classList.contains("soa-collapsible-quests"))event.target.open=true},true);
}
keepGameSectionsExpanded();
const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}};
const write=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));return true}catch{return false}};
function defaults(){
 const professions={Mining:{skill:225,events:0},Engineering:{skill:225,events:0}};
 return {id:"snacky",name:"Snacky Lugnuts",gender:"Male",race:"Gnome",faction:"Alliance",className:"Rogue",specialization:"Combat Swords",professions,secondary:Object.fromEntries(SECONDARY.map(x=>[x,{skill:1,events:0}])),professionLog:[],professionEvents:[],origin:"legacy"};
}
function init(){
 roster=read(ROSTER_KEY);
 if(!roster||!Array.isArray(roster.characters)||!roster.characters.length){roster={version:1,active:"snacky",characters:[defaults()]};write(ROSTER_KEY,roster);snapshot("snacky");}
 for(const p of roster.characters){p.professions ||= {};p.secondary ||= {};if(p.id==="snacky"&&!p.gender)p.gender="Male";p.professionLog ||= [];p.professionEvents ||= []}
 // One-time correction for Snacky only. Preserve any progress above the established 225 baseline.
 const snacky=roster.characters.find(p=>p.id==="snacky");
 if(snacky&&!roster.snackyProfession225Applied){
  for(const profession of ["Mining","Engineering"]){
   const current=snacky.professions[profession];
   if(current&&typeof current==="object")current.skill=Math.max(225,Number(current.skill)||0);
   else snacky.professions[profession]={skill:225,events:0};
  }
  roster.snackyProfession225Applied=true;
 }
 active=roster.characters.find(x=>x.id===roster.active)||roster.characters[0];roster.active=active.id;write(ROSTER_KEY,roster);
}
function snapshot(id){
 try{
  const data={};for(const key of SAVES)data[key]=localStorage.getItem(key);
  return write(SLOT_PREFIX+id,data);
 }catch{return false}
}
function restore(id){
 const data=read(SLOT_PREFIX+id);
 // Never restore a corrupt slot that contains none of the actual save payloads.
 if(!data||typeof data!=="object"||!SAVES.some(key=>typeof data[key]==="string")){
  alert("This character slot is missing its save data. The current character has not been changed.");
  return false;
 }
 const previous={};
 try{
  for(const key of SAVES)previous[key]=localStorage.getItem(key);
  for(const key of SAVES){
   const next=data[key]===null||data[key]===undefined?null:data[key];
   // Avoid unnecessary writes, particularly important if iOS storage is nearly full.
   if(next===previous[key])continue;
   if(next===null)localStorage.removeItem(key);
   else localStorage.setItem(key,next);
  }
  return true;
 }catch{
  // Best-effort rollback: a partial slot cannot silently become the active save.
  for(const key of SAVES)try{
   if(previous[key]===null||previous[key]===undefined)localStorage.removeItem(key);
   else localStorage.setItem(key,previous[key]);
  }catch{}
  alert("Character switch could not finish. Your previous adventure is still selected; check available device storage.");
  return false;
 }
}
function baseState(profile){return {equipment:[...(profile.startingEquipment||BASIC_GEAR[profile.className]||[])],id:"new-hero-start",hp:100,en:100,money:1500,time:0,alert:0,seen:[],flags:{},enemy:null,log:["A new journey begins for "+profile.name+" in "+startingZone(profile)+".","You have 15 silver and no companions."]}}
function newCampaign(profile){
 const zone=startingZone(profile);
 return {turn:0,scene:null,history:[],journal:[],startingZone:zone,lastError:"",lastAction:"Begin the FIRST scene of a completely new adventure for "+profile.name+", a LEVEL 1 "+profile.race+" "+profile.className+" of the "+profile.faction+". STARTING LOCATION: "+zone+". The character starts PHYSICALLY IN THIS STARTING ZONE, ALONE, with exactly 15 silver (1,500 copper), basic class starter equipment only, and no existing allies, companions, party, completed missions, or earned equipment beyond the starter kit. Introduce a modest class-appropriate first task and six distinct action choices. No travel skips, established companions, Hollow Raven or Snacky's storyline. Do not grant XP, extra currency, equipment, specialization, or followers in the opening narration.",lastResult:"Level 1 newcomer in "+zone+". Starting funds: 15 silver. No previous battles, companions, or rewards.",pending:null};
}
// Social bonuses are per-character, derived from established class/race backgrounds.
// All figures are visible on the Character Record. Existing saves need no migration.
const SOCIAL_BASE={
 Rogue:{bluff:5,bribe:3,romance:3,threaten:2},
 Warrior:{bluff:1,bribe:2,romance:2,threaten:5},
 Paladin:{bluff:1,bribe:3,romance:4,threaten:3},
 Hunter:{bluff:2,bribe:2,romance:2,threaten:3},
 Priest:{bluff:2,bribe:3,romance:5,threaten:2},
 Mage:{bluff:4,bribe:4,romance:2,threaten:2},
 Warlock:{bluff:4,bribe:3,romance:2,threaten:5},
 Shaman:{bluff:2,bribe:3,romance:3,threaten:3},
 Druid:{bluff:2,bribe:2,romance:4,threaten:2}
};
function socialSkills(){
 const base=SOCIAL_BASE[active.className]||SOCIAL_BASE.Rogue;
 // Snacky's training as an SI:7 operative is reflected in his bluff score.
 const si7=active.id==="snacky"?1:0;const hidden=isSnackyEgg(active)?1:0;
 const trained=window.soaProgression?.bonus;
 const mod=skill=>window.soaAbilities?.modifier?.(skill)||0;
 return {bluff:base.bluff+si7+hidden+(trained?.("bluff")||0)+mod("bluff"),bribe:base.bribe+(trained?.("bribe")||0)+mod("bribe"),romance:base.romance+(trained?.("romance")||0)+mod("romance"),threaten:base.threaten+(trained?.("threaten")||0)+mod("threaten")};
}
function selectedProfile(){return {...active,level:window.soaProgression?.level?.()||10,professions:Object.fromEntries(Object.entries(active.professions||{}).map(([k,v])=>[k,v.skill||1]))}}
function commitRoster(){return write(ROSTER_KEY,roster)}
function enter(id){
 if(!roster.characters.some(x=>x.id===id))return;
 if(id!==active.id){
  const previousId=active.id;
  if(!snapshot(previousId)){alert("Cannot switch: unable to back up your current character. Check available device storage.");return}
  if(!restore(id))return;
  const next=roster.characters.find(x=>x.id===id);
  roster.active=id;
  if(!commitRoster()){
   roster.active=previousId;
   restore(previousId);
   alert("Unable to save the active character selection. Your previous character was retained.");
   return;
  }
  active=next;
 }
 try{sessionStorage.setItem(ENTER_KEY,"1")}catch(e){}
 location.reload();
}
function create(profile){
 if(!Array.isArray(profile.professionNames)||profile.professionNames.length>2||new Set(profile.professionNames).size!==profile.professionNames.length||profile.professionNames.some(n=>!PROFS.includes(n))){alert("Choose at most two distinct primary professions.");return}
 if(roster.characters.length>=16){alert("Character roster full (16).");return}
 const id="hero-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
 const p={...profile,id,origin:"custom",startLevel:1,startingZone:startingZone(profile),startingEquipment:[...(BASIC_GEAR[profile.className]||[])],specialization:"Unchosen",professions:Object.fromEntries(profile.professionNames.map(n=>[n,{skill:1,events:0}])),secondary:Object.fromEntries(SECONDARY.map(n=>[n,{skill:1,events:0}])),professionEvents:[],professionLog:[]};
 delete p.professionNames;
 const previous=active.id;
 if(!snapshot(previous)){alert("Unable to back up your current adventure. Character creation has been stopped to protect your save.");return}
 try{
  if(!write("soa-save-v1",baseState(p))||!write("soa-campaign-v1",newCampaign(p)))throw Error("Insufficient storage for new character data");
  localStorage.removeItem("soa-companions-v1");
  localStorage.removeItem("soa-reputation-v1");
  localStorage.removeItem("soa-progression-v1");
  localStorage.setItem("soa-campaign-enabled","1");
  if(!snapshot(id))throw Error("Could not create the character's independent save slot");
  roster.characters.push(p);roster.active=id;
  if(!commitRoster())throw Error("Could not save the updated character roster");
  active=p;
 }catch(err){
  roster.characters=roster.characters.filter(x=>x.id!==id);
  roster.active=previous;
  active=roster.characters.find(x=>x.id===previous)||active;
  restore(previous);commitRoster();
  alert("Character creation was canceled safely: "+err.message+". Your previous character remains active.");
  return;
 }
 try{sessionStorage.setItem(ENTER_KEY,"1")}catch(e){}
 location.reload();
}
function selectOptions(select,values){select.replaceChildren();for(const val of values){const op=make("option",val);op.value=val;select.append(op)}}
// Non-destructive multi-character backup. Does not include AI access codes or API secrets.
// The current live working save is snapshotted before the archive is generated.
function exportRosterBackup(){
 if(!snapshot(active.id)){alert("Couldn't safely read your current save for export. No data was changed.");return false}
 const slots={};
 for(const p of roster.characters){
  const saved=read(SLOT_PREFIX+p.id);
  if(!saved){alert("Backup stopped: a save slot for "+p.name+" is missing.");return false}
  slots[p.id]=saved;
 }
 const archive={kind:"shadows-of-azeroth-multi-character-backup",version:1,createdAt:new Date().toISOString(),roster:roster,slots:slots,portraits:window.soaPortraits?.exportPortraits?.(roster.characters.map(p=>p.id))||{}};
 try{
  const blob=new Blob([JSON.stringify(archive,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download="shadows-of-azeroth-all-characters.json";
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  return true;
 }catch(e){alert("Unable to download backup: "+e.message);return false}
}
function drawMenu(){
 let overlay=get("soa-character-menu");if(overlay)overlay.remove();
 overlay=make("div",undefined,"soa-menu-overlay");overlay.id="soa-character-menu";
 const shell=make("div",undefined,"soa-menu-card");
 shell.append(make("div","SHADOWS OF AZEROTH · CHARACTER SELECT","soa-roster-kicker"),make("h1","Choose Your Hero"));
 const list=make("div",undefined,"soa-character-list");
 for(const p of roster.characters){
  const item=make("div",undefined,"soa-character-item");
  const description=make("div");description.append(make("strong",p.name),make("span",p.faction+" · "+p.race+" "+p.className+" · Level "+(p.id===active.id?(window.soaProgression?.level?.()||p.startLevel||10):(()=>{const slot=read(SLOT_PREFIX+p.id);try{return Number(JSON.parse(slot?.["soa-progression-v1"]||"null")?.actors?.hero?.level)||p.startLevel||10}catch{return p.startLevel||10}})())+" · "+Object.keys(p.professions||{}).join(" / ")));
  const button=make("button",p.id===active.id?"Play":"Switch & Play");button.type="button";button.onclick=()=>enter(p.id);
  item.append(description,button);list.append(item);
 }
 shell.append(list);
 const expand=make("details");expand.className="soa-create-new";
 const summary=make("summary","＋ Create New Character");expand.append(summary);
 const form=make("form");form.className="soa-create-form";
 const name=make("input");name.type="text";name.maxLength=36;name.minLength=2;name.required=true;name.placeholder="Character name";
 const nameLabel=make("label","Character name");nameLabel.append(name);
 const race=make("select"),gender=make("select"),faction=make("select"),className=make("select"),prof1=make("select"),prof2=make("select");
 const labeled=(title,field)=>{const label=make("label",title);label.append(field);return label};
 selectOptions(race,Object.keys(RACES));race.value="Human";selectOptions(gender,["Male","Female"]);
 function update(){
  const r=RACES[race.value];const oldFaction=faction.value;
  selectOptions(faction,r.faction==="Choose"?["Alliance","Horde"]:[r.faction]);
  if(Array.from(faction.options).some(x=>x.value===oldFaction))faction.value=oldFaction;
  const valid=race.value==="Skyborne"?r.classes.filter(c=>!(faction.value==="Alliance"&&c==="Shaman")&&!(faction.value==="Horde"&&c==="Mage")):r.classes;
  const lastClass=className.value;selectOptions(className,valid);if(valid.includes(lastClass))className.value=lastClass;
 }
 race.onchange=update;faction.onchange=update;update();
 selectOptions(prof1,PROFS);selectOptions(prof2,PROFS);prof1.value="Mining";prof2.value="Engineering";
 form.append(nameLabel,labeled("Gender",gender),labeled("Race",race),labeled("Faction",faction),labeled("Class",className),labeled("Primary profession I",prof1),labeled("Primary profession II",prof2));
 const hint=make("p","New heroes begin alone at level 1 with 15 silver in their starting zone. Independent saves and professions; generating the new story requires Gemini online.","muted");form.append(hint);
 const warning=make("p","","soa-menu-error");warning.setAttribute("aria-live","polite");form.append(warning);
 const submit=make("button","Create Character & Start Story");submit.type="submit";form.append(submit);
 form.onsubmit=e=>{e.preventDefault();const n=name.value.trim();if(n.length<2||n.length>36){warning.textContent="Enter a name between 2 and 36 characters.";return}if(prof1.value===prof2.value){warning.textContent="Choose two different primary professions.";return}if(roster.characters.some(x=>x.name.toLowerCase()===n.toLowerCase())){warning.textContent="That character name is already in your roster.";return}create({name:n,gender:gender.value,race:race.value,faction:faction.value,className:className.value,professionNames:[prof1.value,prof2.value]})};
 expand.append(form);shell.append(expand);
 const backup=make("button","Download All Character Saves");backup.type="button";backup.className="soa-roster-backup";backup.onclick=exportRosterBackup;shell.append(backup);
 const backupHelp=make("p","Download a backup of every hero, story, reputation and relationship. Keep the file somewhere safe; in-app full-roster restore is not available yet.","soa-menu-help");shell.append(backupHelp);
 const close=make("button","Return to Game");close.className="soa-menu-back";close.onclick=()=>{overlay.remove();document.documentElement.classList.remove("soa-character-menu-open");try{sessionStorage.setItem(ENTER_KEY,"1")}catch(e){}};
 shell.append(close);overlay.append(shell);document.body.append(overlay);document.documentElement.classList.add("soa-character-menu-open");window.soaPortraits?.refreshMenu?.();
}
function profilePanel(){
 const head=document.querySelector("header");if(!head)return;
 const title=get("soa-player-name"),tag=get("soa-player-class");if(title)title.textContent=active.name;if(tag)tag.textContent=active.id==="snacky"?"SI:7 · Combat Swords":active.faction+" · "+active.race+" "+active.className;
 if(typeof render==="function")render();
 const menu=make("button","☰ Characters");menu.id="soa-characters-button";menu.type="button";menu.onclick=drawMenu;head.append(menu);
 const nav=make("nav",undefined,"soa-quick-nav");nav.setAttribute("aria-label","Game sections");
 for(const [label,targetId] of [["Adventure","campaign-box"],["Journal","soa-chronicle"],["Character","soa-profession-panel"],["Reputation",active.origin==="custom"?"soa-standalone-reputation":"companion-panel"]]){
  const jump=make("button",label);jump.type="button";jump.className="soa-quick-link";
  jump.onclick=()=>{const dest=get(targetId);if(dest){dest.scrollIntoView({behavior:"smooth",block:"start"})}};
  nav.append(jump);
 }
 head.append(nav);
 const pane=make("section");pane.className="panel soa-profession-panel";pane.id="soa-profession-panel";
 head.after(pane);drawProfessions();window.soaPortraits?.refresh?.();
}
function drawProfessions(){
 const root=get("soa-profession-panel");if(!root)return;root.replaceChildren();
 root.append(make("div","CHARACTER RECORD","soa-roster-kicker"),make("h2",active.name+" · "+active.race+" "+active.className));
 const abilityCard=window.soaAbilities?.card?.("hero");if(abilityCard)root.append(abilityCard);
 window.soaProgression?.refresh?.();
 window.soaPortraits?.refresh?.();
 const meta=make("p",active.faction+" · "+(active.specialization||"Unchosen"),"muted");root.append(meta);
 const social=make("details");social.className="soa-social-stats";
 social.append(make("summary","Social skills · bluff, bribe, romance, threaten"));
 const scores=make("div",undefined,"soa-social-score-grid");
 for(const [skill,bonus] of Object.entries(socialSkills())){
  const score=make("div",undefined,"soa-social-score");
  score.append(make("strong",skill[0].toUpperCase()+skill.slice(1)),make("span","+"+bonus));
  scores.append(score);
 }
 social.append(scores,make("p","Living Campaign social actions use d20 + skill versus a difficulty check. Bribery requires an explicitly offered amount; affection still requires mutual consent.","muted"));
 root.append(social);
 root.append(make("h3","Professions"));
 for(const [name,progress] of Object.entries(active.professions||{})){
  const row=make("div",undefined,"soa-profession-row");row.append(make("strong",name),make("span","Skill "+progress.skill+"/300"));
  const action=make("button","Practice via Story");action.type="button";action.onclick=()=>prefill(name);row.append(action);root.append(row);
 }
 const secondary=make("details");const sum=make("summary","Secondary skills");secondary.append(sum);
 for(const [name,skill] of Object.entries(active.secondary||{})){
  const r=make("div",undefined,"soa-profession-row");r.append(make("span",name+" · "+skill.skill+"/300"));const b=make("button","Practice");b.onclick=()=>prefill(name);r.append(b);secondary.append(r)
 }root.append(secondary);
 const recents=active.professionLog||[];if(recents.length)root.append(make("p",recents.slice(-2).join(" · "),"muted"));
}
function prefill(prof){
 const action=get("campaign-custom-action"),type=get("campaign-custom-type");
 if(!action||!window.soaLivingCampaign?.enabled?.()){drawMenu();return}
 const tasks={Mining:"Carefully mine a nearby ore vein and assess the stone.",Engineering:"Use portable tools to craft a simple mechanical device.",Herbalism:"Search for and carefully gather a useful local herb.",Alchemy:"Mix a simple alchemical preparation using available supplies.",Blacksmithing:"Practice shaping metal with a suitable forge and tools.",Enchanting:"Practice a minor enchantment on a suitable material.",Leatherworking:"Craft a basic leather item using available materials.",Skinning:"Carefully skin a suitable fallen beast.",Tailoring:"Sew a simple cloth item with available fabric.",Cooking:"Prepare a simple cooked meal from available food.",Fishing:"Fish in nearby accessible water.", "First Aid":"Practice making and applying a clean bandage."};
 action.value=tasks[prof]||"Practice "+prof+" safely";action.dispatchEvent(new Event("input",{bubbles:true}));if(type){type.value="engineering";type.dispatchEvent(new Event("change",{bubbles:true}))}action.scrollIntoView({behavior:"smooth",block:"center"});
}
// Profession-based checks and ordinary world gathering can award a single skill point.
// Stable rolls and recorded action IDs make retries idempotent.
const PROF_MATCH={
 Mining:/\b(?:min(?:e|es|ed|ing)|ore vein|ore deposit|prospect\w*|excavat\w*|extract\w* ore|gather\w* (?:copper |tin |iron |silver |gold |mithril |thorium )?ore|harvest\w* ore|pickaxe)\b/i,
 Engineering:/\b(?:engineer\w*|mechanic\w*|tinker\w*|clockwork|gadget\w*|device|apparatus|circuit\w*|wiring|calibrat\w*|construct\w*)\b/i,
 Herbalism:/\b(?:herb\w*|botan\w*|forag\w*|gather\w* (?:plants?|flowers?|roots?)|harvest\w* (?:plants?|flowers?|roots?))\b/i,
 Alchemy:/\b(?:alchem\w*|potion\w*|elixir\w*|transmut\w*|brew\w* (?:mixture|draught))\b/i,
 Blacksmithing:/\b(?:blacksmith\w*|smith\w*|anvil|forge\w*|smelt\w*|hammer\w* (?:metal|iron|steel))\b/i,
 Enchanting:/\b(?:enchant\w*|disenchant\w*|imbu\w*|runic infusion)\b/i,
 Leatherworking:/\b(?:leatherwork\w*|craft\w* leather|sew\w* leather|stitch\w* leather|cure\w* hide|tan(?:ning)? hides?)\b/i,
 Skinning:/\b(?:skin\w*|flay\w*|peel\w* hide|harvest\w* (?:hide|pelt))\b/i,
 Tailoring:/\b(?:tailor\w*|sew\w*|weav\w*|stitch\w* (?:cloth|fabric)|craft\w* (?:robe|cloak))\b/i,
 Cooking:/\b(?:cook\w*|roast\w*|bake\w*|prepar\w* (?:meal|food|stew))\b/i,
 Fishing:/\b(?:fish\w*|angl\w*|cast\w* (?:a |the )?(?:line|hook)|reel\w* (?:in )?(?:fish|catch))\b/i,
 "First Aid":/\b(?:first aid|bandag\w*|dress\w* (?:wound|injury)|stitch\w* wound|tend\w* wounds?)\b/i
};
const PROF_INTENT=/\b(?:practic\w*|train\w*|craft\w*|build\w*|assembl\w*|creat\w*|make|use|work|operat\w*|repair\w*|fix|calibrat\w*|examin\w*|inspect\w*|analyz\w*|identify|test|disarm\w*|dismantl\w*|forge\w*|brew\w*|mix\w*|sew\w*|stitch\w*|enchant\w*|skin\w*|cook\w*|bandag\w*|tend\w*|harvest\w*|gather\w*|collect\w*|mine\w*|prospect\w*|fish\w*|cast\w*|reel\w*|forag\w*|extract\w*|smelt\w*|pick\w*)\b/i;
const GATHER={
 Mining:/\b(?:min(?:e|es|ed|ing)|excavat\w*|prospect\w*|extract\w* ore|gather\w* (?:copper |tin |iron |silver |gold |mithril |thorium )?ore|harvest\w* ore)\b/i,
 Herbalism:/\b(?:gather\w*|pick\w*|harvest\w*|forag\w*|collect\w*)\b.{0,65}\b(?:herb\w*|plants?|flowers?|roots?)\b|\b(?:herb\w*|plants?|flowers?|roots?)\b.{0,35}\b(?:gather\w*|pick\w*|harvest\w*)\b/i,
 Skinning:/\b(?:skin\w*|flay\w*|harvest\w* (?:hide|pelt))\b/i,
 Fishing:/\b(?:fish\w*|angl\w*|cast\w* (?:a |the )?(?:line|hook)|reel\w* (?:in )?(?:fish|catch))\b/i
};
function professionChance(level){return level<75?.85:level<150?.70:level<225?.55:level<275?.35:.20}
function professionRoll(id,name){
 let h=2166136261;
 for(const ch of id+"|"+name){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
 h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;
 return (h>>>0)/4294967296;
}
function applyProfession(action,resolution,id){
 if(!id||!active||active.professionEvents.includes(id))return false;
 const txt=String(action||"").slice(0,500);
 const success=/^Success:/i.test(String(resolution||""));
 const owned={...active.professions,...active.secondary};
 const found=PROF_INTENT.test(txt)?Object.keys(PROF_MATCH).find(name=>owned[name]&&PROF_MATCH[name].test(txt)):null;
 active.professionEvents.push(id);active.professionEvents=active.professionEvents.slice(-150);
 if(found&&success){
  const record=owned[found],level=Math.max(1,Math.min(300,Number(record.skill)||1));
  const gathered=!!GATHER[found]?.test(txt);
  const gained=level<300&&professionRoll(id,found)<professionChance(level);
  if(gained){
   record.skill=level+1;record.events=(Number(record.events)||0)+1;
   active.professionLog.push(found+" +1 skill ("+(gathered?"gathering":"skill check")+", "+record.skill+"/300)");
  }else{
   active.professionLog.push(found+" check completed — no skill gain"+(level>=300?" (maximum reached)":""));
  }
  active.professionLog=active.professionLog.slice(-30);
 }
 commitRoster();drawProfessions();
 return !!(found&&success);
}
function updateCraftSkill(name,level){
 const r=active?.professions?.[name];if(!r||!Number.isInteger(level)||level<1||level>300)return false;
 const old=r.skill;r.skill=Math.max(Number(r.skill)||1,level);
 if(!commitRoster()){r.skill=old;return false}
 drawProfessions();return true;
}
function retrainPrimaryProfession(dropName,newName){
 if(Object.keys(active?.professions||{}).length!==2)return {error:"Retraining requires two occupied primary profession slots."};
 if(!PROFS.includes(newName)||!active?.professions||!Object.hasOwn(active.professions,dropName))return {error:"Choose a currently trained primary profession."};
 if(Object.hasOwn(active.professions,newName))return {error:"Already trained in that profession."};
 if(Object.keys(active.professions).length>2)return {error:"Invalid profession roster."};
 const before={...active.professions};
 delete active.professions[dropName];
 active.professions[newName]={skill:1,events:0};
 if(!commitRoster()){active.professions=before;return {error:"Could not save profession change."}}
 drawProfessions();return {message:"Unlearned "+dropName+" and trained "+newName+" at skill 1. Previous profession progress is lost."};
}
init();
window.soaCharacters={retrainPrimaryProfession,updateCraftSkill,profile:selectedProfile,startingEquipment:()=>[...(active.startingEquipment||[])],isNewCharacter:()=>active.origin==="custom",initialLocalState:baseState,applyProfession,showMenu:drawMenu,refreshProfessions:drawProfessions,exportRosterBackup,getSocialSkills:socialSkills};
window.addEventListener("pagehide",()=>snapshot(active.id));
document.addEventListener("DOMContentLoaded",()=>{
 profilePanel();
 try{if(sessionStorage.getItem(ENTER_KEY)!=="1")drawMenu()}catch(e){drawMenu()}
 // New-character adventures need their own future companions. Snacky's fixed party should not be shown as theirs.
 if(active.origin==="custom"){const pane=get("companion-panel");if(pane)pane.hidden=true;const rep=document.createElement("section");rep.className="panel soa-standalone-reputation";rep.id="soa-standalone-reputation";rep.append(document.createElement("h2"));rep.firstChild.textContent="Reputation";get("soa-profession-panel")?.after(rep);window.soaReputation?.renderInto?.(rep);const journal=get("journal");if(journal?.closest){const legacy=journal.closest("section.panel");if(legacy)legacy.hidden=true}}
});
})();
