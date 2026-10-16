(()=>{"use strict";
const ROSTER_KEY="soa-character-roster-v1", SLOT_PREFIX="soa-character-slot-v1-", ENTER_KEY="soa-character-entered";
const SAVES=["soa-save-v1","soa-campaign-v1","soa-companions-v1","soa-campaign-enabled"];
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
let roster,active;
const get=id=>document.getElementById(id);
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}};
const write=(key,val)=>{try{localStorage.setItem(key,JSON.stringify(val));return true}catch{return false}};
function defaults(){
 const professions={Mining:{skill:1,events:0},Engineering:{skill:1,events:0}};
 return {id:"snacky",name:"Snacky Lugnuts",race:"Gnome",faction:"Alliance",className:"Rogue",specialization:"Combat Swords",professions,secondary:Object.fromEntries(SECONDARY.map(x=>[x,{skill:1,events:0}])),professionLog:[],professionEvents:[],origin:"legacy"};
}
function init(){
 roster=read(ROSTER_KEY);
 if(!roster||!Array.isArray(roster.characters)||!roster.characters.length){roster={version:1,active:"snacky",characters:[defaults()]};write(ROSTER_KEY,roster);snapshot("snacky");}
 for(const p of roster.characters){p.professions ||= {};p.secondary ||= {};p.professionLog ||= [];p.professionEvents ||= []}
 active=roster.characters.find(x=>x.id===roster.active)||roster.characters[0];roster.active=active.id;write(ROSTER_KEY,roster);
}
function snapshot(id){
 const data={};for(const key of SAVES)data[key]=localStorage.getItem(key);
 return write(SLOT_PREFIX+id,data);
}
function restore(id){
 const data=read(SLOT_PREFIX+id);if(!data)return false;
 for(const key of SAVES){if(data[key]===null||data[key]===undefined)localStorage.removeItem(key);else localStorage.setItem(key,data[key])}
 return true;
}
function baseState(profile){return {id:"junction",hp:100,en:100,money:0,time:0,alert:0,seen:[],flags:{},enemy:null,log:["A new journey begins for "+profile.name,"The first chapter awaits."]}}
function newCampaign(profile){
 return {turn:0,scene:null,history:[],journal:[],lastError:"",lastAction:"Begin a completely new, character-specific adventure for "+profile.name+", an adventurer of the "+profile.faction+" — "+profile.race+" "+profile.className+". Start in "+(profile.faction==="Alliance"?"the Eastern Kingdoms":"Kalimdor")+" with an atmospheric personal mystery, a meaningful first encounter and 3–5 choices. Do not start at Hollow Raven or involve Snacky's mission.",lastResult:"New protagonist and prologue, no previous battles or rewards.",pending:null};
}
function selectedProfile(){return {...active,professions:Object.fromEntries(Object.entries(active.professions||{}).map(([k,v])=>[k,v.skill||1]))}}
function commitRoster(){write(ROSTER_KEY,roster)}
function enter(id){
 if(!roster.characters.some(x=>x.id===id))return;
 if(id!==active.id){if(!snapshot(active.id)){alert("Cannot switch: unable to back up your current character. Check available device storage.");return}if(!restore(id))return;active=roster.characters.find(x=>x.id===id);roster.active=id;commitRoster()}
 try{sessionStorage.setItem(ENTER_KEY,"1")}catch(e){}
 location.reload();
}
function create(profile){
 if(roster.characters.length>=16){alert("Character roster full (16).");return}
 const id="hero-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
 const p={...profile,id,origin:"custom",specialization:"Unchosen",professions:Object.fromEntries(profile.professionNames.map(n=>[n,{skill:1,events:0}])),secondary:Object.fromEntries(SECONDARY.map(n=>[n,{skill:1,events:0}])),professionEvents:[],professionLog:[]};
 delete p.professionNames;
 if(!snapshot(active.id)){alert("Unable to back up your current adventure. Character creation has been stopped to protect your save.");return}
 roster.characters.push(p);roster.active=id;active=p;commitRoster();
 write("soa-save-v1",baseState(p));write("soa-campaign-v1",newCampaign(p));
 localStorage.removeItem("soa-companions-v1");localStorage.setItem("soa-campaign-enabled","1");
 snapshot(id);
 try{sessionStorage.setItem(ENTER_KEY,"1")}catch(e){}
 location.reload();
}
function selectOptions(select,values){select.replaceChildren();for(const val of values){const op=make("option",val);op.value=val;select.append(op)}}
function drawMenu(){
 let overlay=get("soa-character-menu");if(overlay)overlay.remove();
 overlay=make("div",undefined,"soa-menu-overlay");overlay.id="soa-character-menu";
 const shell=make("div",undefined,"soa-menu-card");
 shell.append(make("div","SHADOWS OF AZEROTH · CHARACTER SELECT","soa-roster-kicker"),make("h1","Choose Your Hero"));
 const list=make("div",undefined,"soa-character-list");
 for(const p of roster.characters){
  const item=make("div",undefined,"soa-character-item");
  const description=make("div");description.append(make("strong",p.name),make("span",p.faction+" · "+p.race+" "+p.className+" · "+Object.keys(p.professions||{}).join(" / ")));
  const button=make("button",p.id===active.id?"Play":"Switch & Play");button.type="button";button.onclick=()=>enter(p.id);
  item.append(description,button);list.append(item);
 }
 shell.append(list);
 const expand=make("details");expand.className="soa-create-new";
 const summary=make("summary","＋ Create New Character");expand.append(summary);
 const form=make("form");form.className="soa-create-form";
 const name=make("input");name.type="text";name.maxLength=36;name.minLength=2;name.required=true;name.placeholder="Character name";
 const nameLabel=make("label","Character name");nameLabel.append(name);
 const race=make("select"),faction=make("select"),className=make("select"),prof1=make("select"),prof2=make("select");
 const labeled=(title,field)=>{const label=make("label",title);label.append(field);return label};
 selectOptions(race,Object.keys(RACES));race.value="Human";
 function update(){
  const r=RACES[race.value];const oldFaction=faction.value;
  selectOptions(faction,r.faction==="Choose"?["Alliance","Horde"]:[r.faction]);
  if(Array.from(faction.options).some(x=>x.value===oldFaction))faction.value=oldFaction;
  const valid=race.value==="Skyborne"?r.classes.filter(c=>!(faction.value==="Alliance"&&c==="Shaman")&&!(faction.value==="Horde"&&c==="Mage")):r.classes;
  const lastClass=className.value;selectOptions(className,valid);if(valid.includes(lastClass))className.value=lastClass;
 }
 race.onchange=update;faction.onchange=update;update();
 selectOptions(prof1,PROFS);selectOptions(prof2,PROFS);prof1.value="Mining";prof2.value="Engineering";
 form.append(nameLabel,labeled("Race",race),labeled("Faction",faction),labeled("Class",className),labeled("Primary profession I",prof1),labeled("Primary profession II",prof2));
 const hint=make("p","Each hero has their own story, saves and profession skills. New story generation requires Gemini online. Secondary skills: Cooking, Fishing and First Aid.","muted");form.append(hint);
 const warning=make("p","","soa-menu-error");warning.setAttribute("aria-live","polite");form.append(warning);
 const submit=make("button","Create Character & Start Story");submit.type="submit";form.append(submit);
 form.onsubmit=e=>{e.preventDefault();const n=name.value.trim();if(n.length<2||n.length>36){warning.textContent="Enter a name between 2 and 36 characters.";return}if(prof1.value===prof2.value){warning.textContent="Choose two different primary professions.";return}if(roster.characters.some(x=>x.name.toLowerCase()===n.toLowerCase())){warning.textContent="That character name is already in your roster.";return}create({name:n,race:race.value,faction:faction.value,className:className.value,professionNames:[prof1.value,prof2.value]})};
 expand.append(form);shell.append(expand);
 const close=make("button","Return to Game");close.className="soa-menu-back";close.onclick=()=>{overlay.remove();document.documentElement.classList.remove("soa-character-menu-open");try{sessionStorage.setItem(ENTER_KEY,"1")}catch(e){}};
 shell.append(close);overlay.append(shell);document.body.append(overlay);document.documentElement.classList.add("soa-character-menu-open");
}
function profilePanel(){
 const head=document.querySelector("header");if(!head)return;
 const title=get("soa-player-name"),tag=get("soa-player-class");if(title)title.textContent=active.name;if(tag)tag.textContent=active.id==="snacky"?"SI:7 · Combat Swords":active.faction+" · "+active.race+" "+active.className;
 if(typeof render==="function")render();
 const menu=make("button","☰ Characters");menu.id="soa-characters-button";menu.type="button";menu.onclick=drawMenu;head.append(menu);
 const pane=make("section");pane.className="panel soa-profession-panel";pane.id="soa-profession-panel";
 head.after(pane);drawProfessions();
}
function drawProfessions(){
 const root=get("soa-profession-panel");if(!root)return;root.replaceChildren();
 root.append(make("div","CHARACTER RECORD","soa-roster-kicker"),make("h2",active.name+" · "+active.race+" "+active.className));
 const meta=make("p",active.faction+" · "+(active.specialization||"Unchosen"),"muted");root.append(meta);
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
function applyProfession(action,resolution,id){
 if(!id||!active||active.professionEvents.includes(id))return false;
 const txt=String(action||"").toLowerCase();const good=/^Success:/i.test(String(resolution||""));
 const patterns={Mining:/\b(min(e|ing|ed)|ore vein|excavat(e|ion))\b/,Engineering:/\b(engineer|mechanic|device|gadget|tinker|construct)\b/,Herbalism:/\b(herb|gather plant|botany)\b/,Alchemy:/\b(alchem|brew potion|elixir|transmut)\b/,Blacksmithing:/\b(blacksmith|forge|smithing|anvil)\b/,Enchanting:/\b(enchant|imbue|disenchant)\b/,Leatherworking:/\b(leatherwork|stitch leather|craft leather)\b/,Skinning:/\b(skin(ning)?|flay|hide)\b/,Tailoring:/\b(tailor|sew|weav(e|ing)|stitch cloth)\b/,Cooking:/\b(cook|prepare meal|roast)\b/,Fishing:/\b(fish(ing)?|cast line)\b/,"First Aid":/\b(first aid|bandag(e|ing))\b/};
 const found=Object.keys(patterns).find(name=>(active.professions[name]||active.secondary[name])&&patterns[name].test(txt));
 active.professionEvents.push(id);active.professionEvents=active.professionEvents.slice(-150);
 if(found&&good){const skill=active.professions[found]||active.secondary[found];const gained=Math.min(3,300-skill.skill);skill.skill+=gained;skill.events=(skill.events||0)+1;active.professionLog.push(found+" +"+gained+" skill");active.professionLog=active.professionLog.slice(-30)}
 commitRoster();drawProfessions();return !!(found&&good);
}
init();
window.soaCharacters={profile:selectedProfile,isNewCharacter:()=>active.origin==="custom",initialLocalState:baseState,applyProfession,showMenu:drawMenu,refreshProfessions:drawProfessions};
window.addEventListener("pagehide",()=>snapshot(active.id));
document.addEventListener("DOMContentLoaded",()=>{
 profilePanel();
 try{if(sessionStorage.getItem(ENTER_KEY)!=="1")drawMenu()}catch(e){drawMenu()}
 // New-character adventures need their own future companions. Snacky's fixed party should not be shown as theirs.
 if(active.origin==="custom"){const pane=get("companion-panel");if(pane)pane.hidden=true;const journal=get("journal");if(journal?.closest){const legacy=journal.closest("section.panel");if(legacy)legacy.hidden=true}}
});
})();
