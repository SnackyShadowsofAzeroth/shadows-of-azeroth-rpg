"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
function setup(){
 const context={window:{soaCharacters:{profile:()=>({professions:{Enchanting:100}})},soaEquipment:{itemInfo:()=>({slot:"weapon",rarity:"uncommon"})}}};
 vm.createContext(context);
 for(const name of ["quests","enchanting"])vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/"+name+".js"),"utf8"),context);
 const c={quests:{inventory:[{name:"Spare Sword"},{name:"Enchanted Staff"}],equipped:{weapon:1}}};
 const e=context.window.soaEnchanting;
 assert.ok(!e.apply(c,{key:"reward:weapon:1",recipeId:"striking",method:"vendor",location:"Stormwind Enchanter's shop",wallet:20000}).error);
 return {c,e,q:context.window.soaQuests};
}
test("disenchanting a spare item preserves the equipped item's enchantment across reindex and reload",()=>{
 const {c,e,q}=setup();assert.equal(e.bonuses(c).damage,1);
 assert.ok(!e.disenchant(c,0).error);assert.equal(c.quests.equipped.weapon,0);assert.equal(e.bonuses(c).damage,1);
 q.ensure(c);assert.equal(e.bonuses(JSON.parse(JSON.stringify(c))).damage,1);
});
test("repairing invalid inventory entries preserves valid equipped enchantments",()=>{
 const {c,e,q}=setup();c.quests.inventory[0]=null;q.ensure(c);
 assert.equal(c.quests.equipped.weapon,0);assert.equal(e.bonuses(c).damage,1);
});
test("a destroyed item's enchantment cannot attach to a later item at the same index",()=>{
 const {c,e}=setup();delete c.quests.equipped.weapon;
 assert.ok(!e.disenchant(c,1).error);
 c.quests.inventory.push({name:"Enchanted Staff"});c.quests.equipped.weapon=1;
 assert.equal(e.bonuses(c).damage,0);
 assert.equal(Object.keys(c.enchanting.enchants).length,0);
});
