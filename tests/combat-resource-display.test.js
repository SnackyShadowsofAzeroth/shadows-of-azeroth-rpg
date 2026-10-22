"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const vm=require("node:vm");
const root=path.join(__dirname,"..","public");
const resourcesContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"resource-rules.js"),"utf8"),resourcesContext,{filename:"resource-rules.js"});
const resources=resourcesContext.window.soaResources;
const campaign=fs.readFileSync(path.join(root,"campaign.js"),"utf8");

test("combat resource mapping covers each selectable class and Druid forms",()=>{
 const expected={Warrior:"Rage",Paladin:"Mana",Hunter:"Focus",Rogue:"Energy",Priest:"Mana",Mage:"Mana",Warlock:"Mana",Druid:"Mana",Shaman:"Mana"};
 for(const [className,label] of Object.entries(expected))assert.equal(resources.forClass(className).label,label);
 assert.equal(resources.forClass("Druid","cat").label,"Energy");
 assert.equal(resources.forClass("Druid","bear").label,"Rage");
});

test("the allied player combat card displays the class resource as a live progress bar",()=>{
 assert.match(campaign,/resource:s\.en,maxResource:100/);
 assert.match(campaign,/const actor=window\.soaAbilities\?\.get\?\.\("hero"\),resource=window\.soaResources\?\.forClass\?\.\(actor\?\.className,actor\?\.form\)/);
 assert.match(campaign,/soa-combat-resource-rail/);
 assert.match(campaign,/aria-valuenow/);
 assert.match(campaign,/current\\/max\\*100/);
});

test("combat actions are integrated above story choices with a free baseline strike",()=>{
 const draw=campaign.indexOf("drawCombatActions(box);");
 const choices=campaign.indexOf("for(const [index,choice] of sc.choices.entries())");
 assert.ok(draw>0&&draw<choices,"combat actions should appear inside the next-move flow before story options");
 assert.match(campaign,/Weapon Strike · Free/);
 assert.match(campaign,/Always available · combat exchange restores up to/);
 assert.match(campaign,/classCooldownLeft\(ability\)/);
});
