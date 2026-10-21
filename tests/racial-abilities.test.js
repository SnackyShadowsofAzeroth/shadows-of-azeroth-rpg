"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const profile={id:"hero",name:"Tester",race:"Gnome",className:"Mage"};
const context={window:{soaCharacters:{profile:()=>profile},soaProgression:{level:()=>1,progress:()=>({level:1}),bonus:()=>0},soaEquipment:{modifiers:()=>({})}},document:{createElement:()=>({append(){},className:"",textContent:""})}};
const source=fs.readFileSync(path.join(__dirname,"..","public","racial-abilities.js"),"utf8");
vm.runInNewContext(source,context,{filename:"racial-abilities.js"});
const racial=context.window.soaRacialAbilities;
const expected=["Human","Dwarf","Night Elf","Gnome","Orc","Undead","Tauren","Troll","Skyborne"];
assert.deepEqual(Array.from(Object.keys(racial.races)),expected);
for(const race of expected){
 const p=racial.passives(race);
 assert.ok(p?.description, race+" has a passive racial trait");
 assert.ok(racial.list(race).length>=1,race+" has an active racial ability");
 for(const a of racial.list(race)){
  assert.ok(a.id&&a.name&&a.description,race+" ability is fully described");
  assert.ok(Number.isInteger(a.cooldown)&&a.cooldown>0,race+" ability has a cooldown");
  if(a.mode==="combat")assert.ok(["damage","guard","heal","interrupt"].includes(a.effect),race+" combat effect is supported");
  else assert.equal(a.mode,"focus");
 }
}
assert.ok(racial.get("cannibalize","Undead").requiresCorpse);
assert.equal(racial.get("war_stomp","Tauren").effect,"interrupt");
assert.ok(racial.get("escape_artist","Gnome"));
assert.ok(racial.get("eureka","Gnome"));
assert.ok(racial.passives("Tauren").maxHp>0);
assert.ok(racial.passives("Troll").regeneration>0);
const abilitiesSource=fs.readFileSync(path.join(__dirname,"..","public","abilities.js"),"utf8");
vm.runInNewContext(abilitiesSource,context,{filename:"abilities.js"});
assert.equal(context.window.soaAbilities.modifier("engineering"),6,"Gnome Eureka stacks with the Gnome Intelligence bonus");
profile.race="Night Elf";profile.className="Rogue";
assert.equal(context.window.soaAbilities.get("hero").armorClass,16,"Night Elf Quickness raises AC");
profile.race="Tauren";profile.className="Warrior";
assert.equal(context.window.soaAbilities.get("hero").maxHp,22,"Tauren Endurance adds maximum HP");
profile.race="Troll";profile.className="Rogue";
assert.equal(context.window.soaRacialAbilities.passives("Troll").regeneration,2,"Troll Regeneration is represented mechanically");
console.log("Racial ability catalog and passive bonuses verified.");