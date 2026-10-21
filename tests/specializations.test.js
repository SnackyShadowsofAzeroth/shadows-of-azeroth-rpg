"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const vm=require("node:vm");
const classes=["Warrior","Paladin","Hunter","Rogue","Priest","Mage","Warlock","Druid","Shaman"];
let profile={className:"Rogue",specialization:"Combat Swords"};
const window={soaCharacters:{profile:()=>profile},soaResources:{forClass:()=>({label:"Energy"})}};
const context={window,document:{createElement:()=>({append(){},className:"",textContent:""})}};
const root=path.join(__dirname,"..","public");
vm.runInNewContext(fs.readFileSync(path.join(root,"specializations.js"),"utf8"),context,{filename:"specializations.js"});
vm.runInNewContext(fs.readFileSync(path.join(root,"class-abilities.js"),"utf8"),context,{filename:"class-abilities.js"});
const specs=window.soaSpecializations,abilities=window.soaClassAbilities;

test("every class has three named trees and a signature ability for each",()=>{
 for(const name of classes){
  const choices=specs.choices(name);
  assert.equal(choices.length,3,name);
  assert.equal(new Set(choices.map(x=>x.name)).size,3,name);
  assert.ok(choices.every(x=>x.ability.level===10&&x.ability.id.startsWith("spec_")),name);
 }
});

test("specialization ability is gated until level 10 and selection is class-specific",()=>{
 profile={className:"Mage",specialization:"Fire"};
 assert.equal(specs.ability(profile,9),null);
 assert.equal(specs.ability(profile,10).name,"Pyroblast");
 assert.equal(abilities.get("spec_mage_fire", "Mage",9),null);
 assert.equal(abilities.get("spec_mage_fire", "Mage",10).name,"Pyroblast");
 assert.equal(abilities.get("spec_mage_fire","Warlock",10),null);
});

test("legacy Combat Swords characters keep their saved value and receive Combat's signature move",()=>{
 profile={className:"Rogue",specialization:"Combat Swords"};
 assert.equal(specs.selected(profile),"Combat");
 assert.equal(specs.ability(profile,10).name,"Killing Spree");
 assert.equal(abilities.available("Rogue",10).some(x=>x.name==="Killing Spree"),true);
});

test("signature ability data uses supported combat effects and deliberate resource costs",()=>{
 const supported=new Set(["damage","interrupt","heal","drain","guard"]);
 for(const name of classes)for(const choice of specs.choices(name)){
  const a=choice.ability;
  assert.ok(supported.has(a.effect),name+" "+choice.name);
  assert.ok([35,40,45].includes(a.cost),name+" "+choice.name);
  assert.equal(a.cooldown,2,name+" "+choice.name+" should be a tactical signature move");
  assert.ok(a.description.length>8);
 }
});

test("each class tree includes the expected example specialization",()=>{
 for(const [name,tree] of [["Rogue","Combat"],["Paladin","Protection"],["Shaman","Enhancement"]]){
  assert.ok(specs.choices(name).some(x=>x.name===tree));
 }
});
