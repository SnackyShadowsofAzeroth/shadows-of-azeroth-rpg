(()=>{"use strict";
// D&D-inspired six-ability engine; deterministic allocations, never random on load.
// Values are in the existing slot-scoped progression save and are safe to reload.
const KEYS=["STR","DEX","CON","INT","WIS","CHA"];
const MOD=v=>Math.floor((Number(v)-10)/2);
const TEMPLATES={
 Rogue:[10,16,13,12,12,12],Paladin:[16,10,14,10,12,13],Priest:[9,12,13,12,16,13],
 Warrior:[16,12,14,10,12,10],Hunter:[11,16,13,11,14,10],Mage:[8,13,12,16,12,12],
 Warlock:[9,12,14,14,11,16],Druid:[10,12,14,12,16,10],Shaman:[12,12,14,12,16,10]
};
const HIT_DIE={Rogue:8,Paladin:10,Priest:8,Warrior:10,Hunter:10,Mage:6,Warlock:8,Druid:8,Shaman:8};
const BOON={snacky:{DEX:2,WIS:2},pippa:{DEX:1},bromli:{CON:1},lethariel:{WIS:1}};
const RACE_BONUS={"Human":{STR:1,DEX:1,CON:1,INT:1,WIS:1,CHA:1},"Gnome":{INT:2},"Dwarf":{CON:2},"Night Elf":{DEX:2},"Orc":{STR:2},"Troll":{DEX:2},"Undead":{CON:1,WIS:1},"Tauren":{STR:2},"Skyborne":{CHA:1,WIS:1}};
const SAVES={Rogue:["DEX","INT"],Paladin:["WIS","CHA"],Priest:["WIS","CHA"],Warrior:["STR","CON"],Hunter:["STR","DEX"],Mage:["INT","WIS"],Warlock:["WIS","CHA"],Druid:["INT","WIS"],Shaman:["STR","WIS"]};
const META={pippa:{name:"Pippa Sparkwhistle",race:"Gnome",className:"Rogue",specialization:"Subtlety"},bromli:{name:"Bromli Ironkeg",race:"Dwarf",className:"Paladin",specialization:"Protection"},lethariel:{name:"Lethariel Moonguard",race:"Night Elf",className:"Priest",specialization:"Restoration"}};
const clean=v=>Math.max(1,Math.min(60,Number(v)||1));
const profileFor=id=>id==="hero"?(window.soaCharacters?.profile?.()||{id:"snacky",name:"Snacky Lugnuts",race:"Gnome",className:"Rogue"}):META[id]||{name:id,className:"Warrior"};
const progress=id=>window.soaProgression?.progress?.(id)||{level:10};
const statId=(id,p)=>id==="hero"&&p.id==="snacky"?"snacky":id;
const get=id=>{
 const p=profileFor(id),lv=clean(progress(id).level);
 const base=TEMPLATES[p.className]||TEMPLATES.Rogue,boon=BOON[statId(id,p)]||{},racial=RACE_BONUS[p.race]||{};
 // One point at each fourth level: STR/CON for defenders, INT for casters, DEX for Rogues.
 const priority=p.className==="Paladin"?"STR":p.className==="Priest"||p.className==="Druid"||p.className==="Shaman"?"WIS":p.className==="Mage"?"INT":p.className==="Warlock"?"CHA":p.className==="Warrior"?"STR":"DEX";
 const values={};
 KEYS.forEach((k,i)=>{values[k]=Math.min(20,base[i]+(racial[k]||0)+(boon[k]||0)+(k===priority?Math.floor(lv/4):0))});
 const equipment=id==="hero"?(window.soaEquipment?.modifiers?.()||{}):{};
 if(id==="hero")for(const k of KEYS)values[k]=Math.max(1,Math.min(22,values[k]+(Number(equipment[k])||0)));
 const hitDie=HIT_DIE[p.className]||8,con=MOD(values.CON);
 const racialHp=id==="hero"?(window.soaRacialAbilities?.passives?.(p.race)?.maxHp||0):0;
 const hp=Math.max(1,hitDie+con+(lv-1)*(Math.ceil(hitDie/2)+1+con)+racialHp);
 const modifiers=Object.fromEntries(KEYS.map(k=>[k,MOD(values[k])]));
 const proficiency=2+Math.floor((lv-1)/4);
 const racialPassive=id==="hero"?window.soaRacialAbilities?.passives?.(p.race):null;
 const armorClass=10+modifiers.DEX+(p.className==="Paladin"||p.className==="Warrior"?4:p.className==="Priest"?1:2)+(id==="hero"?(Number(equipment.ac)||0):0)+(racialPassive?.armorClass||0);
 const savingThrows=Object.fromEntries(KEYS.map(k=>[k,modifiers[k]+(SAVES[p.className]?.includes(k)?proficiency:0)]));
 return {name:p.name||"Adventurer",race:p.race||"",className:p.className||"",level:lv,stats:values,modifiers,proficiency,hitDie,maxHp:hp,armorClass,initiative:modifiers.DEX,passivePerception:10+modifiers.WIS,savingThrows,special:statId(id,p)==="snacky"?"SI:7 field veteran · +2 DEX and WIS":null};
};
const skillAbility={bluff:"CHA",bribe:"CHA",romance:"CHA",threaten:"CHA",social:"CHA",stealth:"DEX",engineering:"INT",investigate:"WIS",combat:"DEX",move:"DEX",rest:"CON"};
const modifier=(name,id="hero")=>{const p=profileFor(id),ab=name==="combat"&&(p.className==="Paladin"||p.className==="Warrior")?"STR":skillAbility[name],base=ab?get(id).modifiers[ab]:0,racial=id==="hero"?(window.soaRacialAbilities?.passives?.(p.race)?.skills?.[name]||0):0;return base+racial};
const percent=(name,id="hero")=>modifier(name,id)*.0125;
const card=(id="hero")=>{
 const s=get(id),box=document.createElement("section");box.className="soa-ability-sheet";
 const title=document.createElement("h3");title.textContent="Ability Scores";box.append(title);
 const caption=document.createElement("p");caption.className="soa-ability-caption";caption.textContent=s.className+" · Level "+s.level+" · Proficiency +"+s.proficiency+" · Hit Die d"+s.hitDie;box.append(caption);
 const grid=document.createElement("div");grid.className="soa-ability-grid";
 for(const key of KEYS){const cell=document.createElement("div");cell.className="soa-ability-stat";
  const label=document.createElement("strong");label.textContent=key;
  const score=document.createElement("span");score.textContent=s.stats[key];
  const mod=document.createElement("em");mod.textContent=(s.modifiers[key]>=0?"+":"")+s.modifiers[key];
  cell.append(label,score,mod);grid.append(cell);
 }box.append(grid);
 const hp=document.createElement("p");hp.className="soa-ability-caption";hp.textContent="D&D class HP benchmark: "+s.maxHp+" · AC "+s.armorClass+" · Initiative "+(s.initiative>=0?"+":"")+s.initiative+" · Passive Perception "+s.passivePerception;box.append(hp);
 const saves=document.createElement("p");saves.className="soa-ability-caption";saves.textContent="Saving throws: "+KEYS.map(k=>k+" "+(s.savingThrows[k]>=0?"+":"")+s.savingThrows[k]).join(" · ");box.append(saves);
 if(s.special){const special=document.createElement("p");special.className="soa-ability-special";special.textContent="✦ "+s.special;box.append(special)}
 return box;
};
window.soaAbilities={get,modifier,percent,card,keys:KEYS};
})();