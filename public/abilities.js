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
const BOON={snacky:{STR:1,DEX:2,CON:1,INT:1,WIS:1,CHA:1},pippa:{DEX:1,INT:1},bromli:{CON:1,WIS:1},lethariel:{WIS:1,CHA:1}};
const META={pippa:{name:"Pippa Sparkwhistle",race:"Gnome",className:"Rogue",specialization:"Subtlety"},bromli:{name:"Bromli Ironkeg",race:"Dwarf",className:"Paladin",specialization:"Protection"},lethariel:{name:"Lethariel Moonguard",race:"Night Elf",className:"Priest",specialization:"Restoration"}};
const clean=v=>Math.max(1,Math.min(60,Number(v)||1));
const profileFor=id=>id==="hero"?(window.soaCharacters?.profile?.()||{id:"snacky",name:"Snacky Lugnuts",race:"Gnome",className:"Rogue"}):META[id]||{name:id,className:"Warrior"};
const progress=id=>window.soaProgression?.progress?.(id)||{level:10};
const statId=(id,p)=>id==="hero"&&p.id==="snacky"?"snacky":id;
const get=id=>{
 const p=profileFor(id),lv=clean(progress(id).level);
 const base=TEMPLATES[p.className]||TEMPLATES.Rogue,boon=BOON[statId(id,p)]||{};
 // One point at each fourth level: STR/CON for defenders, INT for casters, DEX for Rogues.
 const priority=p.className==="Paladin"?"STR":p.className==="Priest"||p.className==="Druid"||p.className==="Shaman"?"WIS":p.className==="Mage"?"INT":p.className==="Warlock"?"CHA":p.className==="Warrior"?"STR":"DEX";
 const values={};
 KEYS.forEach((k,i)=>{values[k]=Math.min(20,base[i]+(boon[k]||0)+(k===priority?Math.floor(lv/4):0))});
 const hitDie=HIT_DIE[p.className]||8,con=MOD(values.CON);
 const hp=Math.max(1,hitDie+con+(lv-1)*(Math.ceil(hitDie/2)+1+con));
 return {name:p.name||"Adventurer",race:p.race||"",className:p.className||"",level:lv,stats:values,modifiers:Object.fromEntries(KEYS.map(k=>[k,MOD(values[k])])),proficiency:2+Math.floor((lv-1)/4),hitDie,maxHp:hp,special:statId(id,p)==="snacky"?"SI:7 veteran · exceptional training":null};
};
const skillAbility={bluff:"CHA",bribe:"CHA",romance:"CHA",threaten:"CHA",social:"CHA",stealth:"DEX",engineering:"INT",investigate:"WIS",combat:"DEX"};
const modifier=(name,id="hero")=>{const ab=skillAbility[name];return ab?get(id).modifiers[ab]:0};
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
 const hp=document.createElement("p");hp.className="soa-ability-caption";hp.textContent="Calculated maximum HP: "+s.maxHp+" · "+(s.special||"Ability scores improve with level.");box.append(hp);
 return box;
};
window.soaAbilities={get,modifier,percent,card,keys:KEYS};
})();