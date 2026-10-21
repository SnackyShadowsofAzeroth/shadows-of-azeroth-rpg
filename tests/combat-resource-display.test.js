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
 assert.match(campaign,/window\.soaResources\?\.forClass\?\.\(ally\.className,ally\.form\)/);
 assert.match(campaign,/soa-combat-resource-rail/);
 assert.match(campaign,/aria-valuenow/);
 assert.match(campaign,/current\/maximum\*100/);
});
