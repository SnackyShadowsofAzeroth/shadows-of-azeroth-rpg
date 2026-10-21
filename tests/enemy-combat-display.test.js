"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const vm=require("node:vm");
const root=path.join(__dirname,"..","public");
const rulesContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"combat-rules.js"),"utf8"),rulesContext,{filename:"combat-rules.js"});
const resourcesContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"resource-rules.js"),"utf8"),resourcesContext,{filename:"resource-rules.js"});
const rules=rulesContext.window.soaCombatRules,resources=resourcesContext.window.soaResources;
const campaign=fs.readFileSync(path.join(root,"campaign.js"),"utf8");
const api=fs.readFileSync(path.join(__dirname,"..","functions","api","campaign.js"),"utf8");

test("hostile cards use the same armor class rules as combat",()=>{
 assert.equal(rules.statBlock({name:"Restless Ghoul"}).ac,13);
 assert.equal(rules.statBlock({name:"Forsaken Mage",armorClass:16}).ac,16);
 assert.match(campaign,/Armor Class \+"\+\(block\?\.ac\?\?"unknown"\)/);
 assert.match(campaign,/armorClass:Math\.max\(8,Math\.min\(25,item\.armorClass\)\)/);
});

test("classed hostile records carry a class-appropriate resource pool",()=>{
 const expected={Warrior:"Rage",Paladin:"Mana",Hunter:"Focus",Rogue:"Energy",Priest:"Mana",Mage:"Mana",Warlock:"Mana",Druid:"Mana",Shaman:"Mana"};
 for(const [className,label] of Object.entries(expected))assert.equal(resources.forClass(className).label,label);
 assert.equal(resources.forClass("Druid","cat").label,"Energy");
 assert.equal(resources.forClass("Druid","bear").label,"Rage");
 assert.match(campaign,/soa-foe-resource-rail/);
 assert.match(campaign,/resource:resource/);
});

test("campaign API preserves validated enemy class, AC, form, and resource metadata",()=>{
 for(const field of ["className","armorClass","resource","maxResource"])assert.ok(api.includes(field+":"),field+" should pass through the API sanitizer");
 assert.match(api,/When a hostile is clearly a classed adventurer/);
});
