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
const abilitiesCss=fs.readFileSync(path.join(root,"abilities.css"),"utf8");

test("combat resource mapping covers each selectable class and Druid forms",()=>{
 const expected={Warrior:"Rage",Paladin:"Mana",Hunter:"Focus",Rogue:"Energy",Priest:"Mana",Mage:"Mana",Warlock:"Mana",Druid:"Mana",Shaman:"Mana"};
 for(const [className,label] of Object.entries(expected))assert.equal(resources.forClass(className).label,label);
 assert.equal(resources.forClass("Druid","cat").label,"Energy");
 assert.equal(resources.forClass("Druid","bear").label,"Rage");
});

test("Bear Form noncombat choices do not require Rage and preview its normal out-of-combat fade",()=>{
 const functionSource=name=>{const start=campaign.indexOf("function "+name+"("),end=campaign.indexOf(String.fromCharCode(10)+"function ",start+1);assert.ok(start>=0&&end>start,name);return campaign.slice(start,end)};
 const druid={form:"bear"},context={window:{
  soaDruid:{current:()=>druid,FORMS:{bear:{resource:"rage"}},skillBonus:()=>0},
  soaCharacters:{profile:()=>({className:"Druid",form:"bear"})},
  soaProgression:{level:()=>10,bonus:()=>0},
  soaClassAbilities:{available:()=>[]},
  soaAbilities:{modifier:()=>0}
 },campaign:{},s:{en:0,alert:0},resourceName:()=>"Rage",resolvedCombatAbility:()=>"strike",classCooldownLeft:()=>0,livingEnemies:()=>[]};
 vm.createContext(context);
 vm.runInContext(functionSource("actionOdds")+String.fromCharCode(10)+functionSource("resourceForecast")+";globalThis.odds=actionOdds;globalThis.forecast=resourceForecast;",context);
 const action={type:"investigate",text:"Inspect the nearby void crystals for signs of instability",difficulty:"medium"};
 assert.equal(context.odds(action).cost,0);
 const forecast=context.forecast(action);
 assert.equal(forecast.cost,0);assert.equal(forecast.affordable,true);assert.equal(forecast.after,0);assert.match(forecast.text,/No Rage cost/);assert.match(forecast.text,/5 Rage fades outside combat/);
});

test("the allied player combat card displays the class resource as a live progress bar",()=>{
 assert.match(campaign,/resource:s\.en,maxResource:100/);
 assert.match(campaign,/const actor=window\.soaAbilities\?\.get\?\.\("hero"\),resource=window\.soaResources\?\.forClass\?\.\(actor\?\.className,actor\?\.form\)/);
 assert.match(campaign,/soa-combat-resource-rail/);
 assert.match(campaign,/aria-valuenow/);
 assert.match(campaign,/current\/max\*100/);
});

test("allied hero resource has a clean aligned label/value row above its meter",()=>{
 assert.ok(campaign.includes('meter.className="soa-combat-resource soa-hero-resource"'));
 assert.ok(campaign.includes('label.className="soa-combat-resource-heading soa-hero-resource-heading"'));
 assert.ok(abilitiesCss.includes(".soa-combat-resource-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;font:700 13px/1.4 system-ui;color:#664b31}"));
 assert.ok(abilitiesCss.includes(".soa-combat-resource-heading span{flex:0 0 auto;white-space:nowrap;font-variant-numeric:tabular-nums}"));
});

test("combat actions are integrated above story choices with a free baseline strike",()=>{
 const draw=campaign.indexOf("drawCombatActions(box);");
 const choices=campaign.indexOf("for(const [index,choice] of sc.choices.entries())");
 assert.ok(draw>0&&draw<choices,"combat actions should appear inside the next-move flow before story options");
 assert.match(campaign,/Weapon Strike · Free/);
 assert.match(campaign,/Always available · combat exchange restores up to/);
 assert.match(campaign,/classCooldownLeft\(ability\)/);
});
