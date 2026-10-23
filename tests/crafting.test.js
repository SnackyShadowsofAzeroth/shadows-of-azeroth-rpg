"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const src=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
function setup(){
 const c={turn:148,scene:{location:"Shadowglen Sanctuary, Teldrassil",story:"You slip the newly finished reinforced leather tunic over your shoulders."},history:[],quests:{inventory:[],equipped:{}}};
 const profile={id:"druid",origin:"custom",className:"Druid",level:10,form:"caster",professions:{Leatherworking:1,Skinning:1}};
 let saved=true,commits=0;
 class Element{constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};}append(...els){this.children.push(...els)}replaceChildren(...els){this.children=els}addEventListener(){}setAttribute(){} }
 const mount=new Element("div"),document={createElement:tag=>new Element(tag),getElementById:id=>id==="soa-equipped-slot"?mount:null};
 const ctx={window:{soaCharacters:{profile:()=>profile,startingEquipment:()=>["Worn Wooden Staff","Plain Cloth Tunic"]},soaProgression:{level:()=>profile.level},soaLivingCampaign:{getState:()=>c,persist:()=>{commits++;return saved},refreshUI(){}},alert(){},confirm:()=>true},document,sessionStorage:{getItem:()=>null,setItem(){}},structuredClone};
 vm.createContext(ctx);for(const f of ["save-rules","crafting","equipment","quests"])vm.runInContext(src("public/"+f+".js"),ctx);
 const craft=ctx.window.soaCrafting,equip=ctx.window.soaEquipment;
 return {c,profile,craft,equip,ctx,mount,supply:(id="leather-0")=>{const r=craft.RECIPES.find(r=>r.id===id);craft.getState(c).materials[r.material]=r.quantity;},failSave:()=>saved=false,commits:()=>commits};
}
const texts=node=>[node.textContent||"",...(node.children||[]).map(texts)].join(" ");
test("craft creates real inventory gear, consumes materials once, and waits for explicit Equip",()=>{
 const x=setup();x.supply();const out=x.craft.craft(x.c,"leather-0","turn-1");assert.ok(!out.error);assert.equal(x.c.quests.inventory[0].name,"Reinforced Leather Tunic");assert.equal(x.c.crafting.materials["Light Leather"],0);assert.equal(x.equip.modifiers().ac,0);
 assert.ok(!x.equip.equip(0).error);assert.equal(x.equip.modifiers().ac,1);assert.ok(x.craft.craft(x.c,"leather-0","turn-1").error);assert.equal(x.c.quests.inventory.length,1);
});
test("craft item metadata survives quest normalization and save/reload",()=>{
 const x=setup();x.supply();x.craft.craft(x.c,"leather-0","receipt");x.equip.equip(0);x.ctx.window.soaQuests.ensure(x.c);const restored=x.ctx.window.soaSaveRules.validateCampaignSave(JSON.parse(JSON.stringify(x.c)));assert.equal(restored.crafting.receipts.receipt,"leather-0");assert.equal(x.equip.itemInfo(restored.quests.inventory[0]).bonuses.ac,1);assert.equal(x.equip.modifiers().ac,1);
});
test("missing materials, profession, character level and crafting skill cannot grant equipment",()=>{
 for(const mode of ["materials","profession","level","skill"]){const x=setup();if(mode!=="materials")x.supply(mode==="level"||mode==="skill"?"leather-1":"leather-0");if(mode==="profession")delete x.profile.professions.Leatherworking;if(mode==="skill")x.profile.level=20;assert.ok(x.craft.craft(x.c,mode==="level"||mode==="skill"?"leather-1":"leather-0","attempt").error,mode);assert.equal(x.c.quests.inventory.length,0);}
});
test("combat, non-caster form, pending generation and corrupt saves block crafting",()=>{
 for(const mode of ["combat","form","pending","integrity"]){const x=setup();x.supply();if(mode==="combat")x.c.enemies=[{hp:1}];if(mode==="form")x.profile.form="cat";if(mode==="pending")x.c.pending={action:"test"};if(mode==="integrity")x.ctx.window.soaSaveRules.reportCorruption("test");assert.ok(x.craft.craft(x.c,"leather-0","attempt").error);assert.equal(x.c.crafting.materials["Light Leather"],4);}
});
test("higher tiers have bounded bonuses and replace, not stack, armor",()=>{
 const x=setup();x.profile.level=60;x.profile.professions.Leatherworking=300;
 for(let i=0;i<4;i++){x.supply("leather-"+i);assert.ok(!x.craft.craft(x.c,"leather-"+i,"tier"+i).error);x.equip.equip(i);assert.equal(x.equip.modifiers().ac,[1,1,2,3][i]);assert.equal(x.equip.modifiers().CON,i?1:0);}
 for(const r of x.craft.RECIPES){assert.ok(Object.values(r.bonuses).every(n=>n>=0&&n<=3));assert.ok(r.description.length);}
 x.equip.unequip("armor");assert.equal(x.equip.modifiers().ac,0);
});
test("class and level requirements apply at Equip and when calculating bonuses",()=>{
 const x=setup();x.c.quests.inventory.push({name:"Copper Chain Armor"},{name:"Ancient Grove Leather Armor"});assert.ok(x.equip.equip(0).error);assert.ok(x.equip.equip(1).error);x.c.quests.equipped.armor=1;assert.equal(x.equip.modifiers().ac,0);
});
test("failed equipment persistence rolls back equip and unequip",()=>{
 const x=setup();x.supply();x.craft.craft(x.c,"leather-0","test");x.equip.equip(0);x.failSave();assert.ok(x.equip.unequip("armor").error);assert.equal(x.c.quests.equipped.armor,0);x.c.quests.equipped={};assert.ok(x.equip.equip(0).error);assert.equal(x.c.quests.equipped.armor,undefined);
});
test("supply purchases charge exact copper and only work at suppliers",()=>{
 const x=setup();const out=x.craft.buy(x.c,"leather-0",1500);assert.equal(out.wallet,1440);assert.equal(x.c.crafting.materials["Light Leather"],4);assert.ok(x.craft.buy(x.c,"leather-0",0).error);x.c.scene.location="Deep Cave";assert.ok(x.craft.buy(x.c,"leather-0",1500).error);assert.equal(x.c.crafting.materials["Light Leather"],4);
});
test("documented finished tunic can be recovered once, never automatically equipped",()=>{
 const x=setup();assert.equal(x.craft.recoverable(x.c)[0].id,"leather-0");assert.ok(!x.craft.recover(x.c,"leather-0").error);assert.equal(x.c.quests.inventory.length,1);assert.equal(x.c.quests.equipped.armor,undefined);assert.ok(x.craft.recover(x.c,"leather-0").error);x.c.quests.inventory=[];assert.ok(x.craft.recover(x.c,"leather-0").error,"disenchanting cannot repeat recovery");
});
test("preparation, failures, future promises and unsupported prose never manufacture loot",()=>{
 for(const story of ["You will craft a reinforced leather tunic.","You have not crafted the reinforced leather tunic.","You failed to craft a reinforced leather tunic.","The reinforced leather tunic needs more stitching."]){const x=setup();x.c.scene.story=story;assert.equal(x.craft.recoverable(x.c).length,0);assert.ok(x.craft.recover(x.c,"leather-0").error);}
});
test("full inventory rejects crafting without consuming materials",()=>{
 const x=setup();x.supply();x.c.quests.inventory=Array.from({length:200},()=>({name:"Old loot"}));assert.ok(x.craft.craft(x.c,"leather-0","overflow").error);assert.equal(x.c.crafting.materials["Light Leather"],4);
});
test("gear panel shows actual crafted bonuses and replaces starter armor display",()=>{
 const x=setup();x.supply();x.craft.craft(x.c,"leather-0","test");const panel=x.equip.panel();assert.match(texts(panel),/Reinforced Leather Tunic/);assert.match(texts(panel),/\+1 AC/);assert.match(texts(panel),/Equip/);x.equip.equip(0);x.equip.renderStatus();const text=texts(x.mount);assert.match(text,/Reinforced Leather Tunic/);assert.match(text,/Worn Wooden Staff/);assert.doesNotMatch(text,/Plain Cloth Tunic/);
});
test("crafting UI lists owned professions, disabled reasons, recovery and supplies",()=>{
 const x=setup();const panel=x.craft.panel(x.c,{wallet:()=>1500,commit(){},choose(){}}),text=texts(panel);assert.match(text,/Recover previously crafted Reinforced Leather Tunic/);assert.match(text,/Need 4 Light Leather/);assert.match(text,/Requires character level 20/);assert.doesNotMatch(text,/Copper Chain Armor/);assert.match(text,/Buy 4 Light Leather/);
});
test("legacy saves need no crafting migration, corrupt crafting ledgers are rejected",()=>{
 const x=setup(),v=x.ctx.window.soaSaveRules.validateCampaignSave;assert.ok(v({turn:1}));x.craft.getState(x.c);assert.ok(v(x.c));for(const n of [-1,Infinity,1.5,10001]){x.c.crafting.materials["Light Leather"]=n;assert.throws(()=>v(x.c));}
});
test("crafting action is recorded before pending scene; retry cannot craft a second item",()=>{
 const source=src("public/campaign.js");assert.match(source,/if\(action.craftRecipe\)/);assert.ok(source.indexOf("soaCrafting.craft(campaign")<source.indexOf("async function choose"));assert.match(source,/craftingBefore\|\|druidBefore/);assert.match(src("functions/api/campaign.js"),/instructions\+craftingGuidance/);
});
function turnSetup(fail=false){
 const x=setup(),ctx=x.ctx,source=src("public/campaign.js");x.supply();x.c.actionSerial=0;
 Object.assign(ctx,{s:{hp:100,en:40,time:1},campaign:x.c,busy:false,campaignLoadBlocked:false,campaignStorageReadFailed:false,campaignSaveFailed:false,ACTION_RESOURCE_RECOVERY:25,MAX:24,navigator:{onLine:true},structuredClone,
 pending:()=>!!ctx.campaign.pending,store:()=>!fail,save:()=>true,status:message=>ctx.notice=message,accessCode:()=>true,dialogueFromCustom:()=>null,socialSkill:()=>null,resolvedStoryVanish:()=>null,recordActionPractice(){},safe:String,refreshDisplay(){},returnToAdventure(){},advance:async()=>{ctx.generated=(ctx.generated||0)+1;}});
 const result=source.slice(source.indexOf("function result("),source.indexOf("\nfunction interfaceUI("));
 const choose=source.slice(source.indexOf("async function choose("),source.indexOf("\nasync function advance("));
 vm.runInContext(result+"\n"+choose+"\nglobalThis.select=choose;",ctx);return x;
}
test("actual selection creates item and spends one turn before story request; pending retry is inert",async()=>{
 const x=turnSetup(),ctx=x.ctx;await ctx.select({craftRecipe:"leather-0",text:"Craft Reinforced Leather Tunic using Leatherworking",type:"investigate"});assert.equal(ctx.campaign.quests.inventory.length,1);assert.equal(ctx.campaign.crafting.materials["Light Leather"],0);assert.equal(ctx.s.time,2);assert.equal(ctx.s.en,65);assert.equal(ctx.generated,1);assert.match(ctx.campaign.pending.resolution,/not automatically equipped/);await ctx.select({craftRecipe:"leather-0",text:"Craft again"});assert.equal(ctx.campaign.quests.inventory.length,1);assert.equal(ctx.generated,1);
});
test("actual selection rolls back item, materials and elapsed time on failed persistence",async()=>{
 const x=turnSetup(true),ctx=x.ctx;await ctx.select({craftRecipe:"leather-0",text:"Craft Reinforced Leather Tunic",type:"investigate"});assert.equal(ctx.campaign.quests.inventory.length,0);assert.equal(ctx.campaign.crafting.materials["Light Leather"],4);assert.equal(ctx.s.time,1);assert.equal(ctx.generated,undefined);assert.match(ctx.notice,/could not be saved/);
});
test("new rewards never evict equipped crafted armor or shift its index",()=>{
 const x=setup();x.supply();x.craft.craft(x.c,"leather-0","test");x.equip.equip(0);x.c.quests.inventory.push(...Array.from({length:205},()=>({name:"Loot"})));x.ctx.window.soaQuests.ensure(x.c);assert.equal(x.c.quests.inventory.length,206);assert.equal(x.c.quests.equipped.armor,0);assert.equal(x.equip.modifiers().ac,1);
});
