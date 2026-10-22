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
const chronicleCss=fs.readFileSync(path.join(root,"chronicle.css"),"utf8");

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

test("combat damage summary shows both HP values against the same maximum",()=>{
 assert.ok(campaign.includes('" damage to "+exchange.target+" · HP "+exchange.enemyBefore+"/"+exchange.enemyMax+" → "+exchange.enemyAfter+"/"+exchange.enemyMax+"."'));
});

test("allied combat health bars use the green ally fill",()=>{
 assert.ok(campaign.includes('className="soa-foe-fill soa-ally-fill"'));
 assert.ok(chronicleCss.includes("body.theme-alternative .soa-ally-fill{background:linear-gradient(90deg,#37845d,#74b581)}"));
});

test("generic hostile creatures receive AC without an invented class resource",()=>{
 assert.match(campaign,/const resource=enemyClass\?window\.soaResources/);
 assert.match(campaign,/resource&&Number\.isFinite\(enemy\.resource\)/);
});
