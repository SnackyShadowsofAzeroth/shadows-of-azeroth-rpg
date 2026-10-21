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

test("hostile cards show the same AC used by combat resolution",()=>{
 assert.equal(rules.statBlock({name:"Restless Ghoul"}).ac,13);
 assert.equal(rules.statBlock({name:"Forsaken Mage",armorClass:16}).ac,16);
 assert.ok(campaign.includes(`stats.textContent="Armor Class "+(block?.ac??"unknown")`));
});

test("recognizable classed enemies get the matching resource meter",()=>{
 const expected={Warrior:"Rage",Paladin:"Mana",Hunter:"Focus",Rogue:"Energy",Priest:"Mana",Mage:"Mana",Warlock:"Mana",Druid:"Mana",Shaman:"Mana"};
 for(const [className,label] of Object.entries(expected))assert.equal(resources.forClass(className).label,label);
 assert.equal(resources.forClass("Druid","cat").label,"Energy");
 assert.equal(resources.forClass("Druid","bear").label,"Rage");
 assert.match(campaign,/const nameClass=.*warrior.*paladin.*hunter.*rogue.*priest.*mage.*warlock.*druid.*shaman/);
 assert.match(campaign,/soa-foe-resource-rail/);
});

test("generic hostile creatures receive AC without an invented class resource",()=>{
 assert.match(campaign,/const resource=enemyClass\?window\.soaResources/);
 assert.match(campaign,/resource&&Number\.isFinite\(enemy\.resource\)/);
});
