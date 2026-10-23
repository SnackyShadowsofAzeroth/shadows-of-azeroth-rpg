"use strict";

const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),test=require("node:test"),vm=require("node:vm");
const source=file=>fs.readFileSync(path.join(__dirname,"..","public",file),"utf8");
function setup({className="Druid",level=60,location="Orgrimmar"}={}){
 const ctx={window:{},structuredClone,Math:Object.create(Math),console};ctx.Math.random=()=>0.37;vm.createContext(ctx);
 vm.runInContext(source("dungeon-data.js"),ctx);vm.runInContext(source("save-rules.js"),ctx);vm.runInContext(source("dungeons.js"),ctx);
 const campaign={turn:1,combatRound:0,enemies:[],history:[],scene:{title:"A clearing",location,story:"The road waits.",choices:[]},quests:{inventory:[],equipped:{}}};
 const save={hp:100,en:100,money:2500,time:0};const hero={name:"Test Hero",className,race:"Night Elf",form:"caster"};
 const api=ctx.window.soaDungeons,data=ctx.window.soaDungeonData;
 const command=(op,id="rfc",extra={})=>api.command(campaign,save,{dungeonAction:op,dungeon:id,...extra},hero,level);
 return {ctx,campaign,save,hero,api,data,command};
}

test("Classic catalog has 26 route variants and class-restricted, level-scaled equipment",()=>{
 const {data}=setup();assert.equal(data.CATALOG.length,26);assert.equal(new Set(data.CATALOG.map(d=>d.id)).size,26);assert.equal(Object.keys(data.ITEMS).length,26*9*3);
 for(const dungeon of data.CATALOG){assert.ok(dungeon.bosses.length>=1,dungeon.id);assert.equal(dungeon.minions.length,2);assert.ok(dungeon.low<=dungeon.high);for(const boss of dungeon.bosses)assert.ok(boss.trim());}
 const tiers=[...new Set(data.CATALOG.map(d=>d.low))].map(low=>data.CATALOG.find(d=>d.low===low)).sort((a,b)=>a.low-b.low);
 const rewards=tiers.map(d=>data.ITEMS[Object.keys(data.ITEMS).find(n=>data.ITEMS[n].dungeon===d.id&&data.ITEMS[n].classes[0]==="Druid"&&data.ITEMS[n].slot==="weapon")]);
 assert.ok(rewards.at(-1).bonuses.damage>rewards[0].bonuses.damage);assert.equal(rewards.at(-1).classes[0],"Druid");assert.match(rewards.at(-1).description,/SoA-adapted/);
});

test("entry is gated by level, travel, combat and health without changing the character",()=>{
 for(const mode of ["level","location","combat","health"]){const x=setup({level:mode==="level"?1:60,location:mode==="location"?"Stormwind":"Orgrimmar"});if(mode==="combat")x.campaign.enemies=[{name:"Guard",hp:4}];if(mode==="health")x.save.hp=1;const before={scene:JSON.stringify(x.campaign.scene),enemies:JSON.stringify(x.campaign.enemies),serial:x.campaign.dungeons?.serial||0,hp:x.save.hp,time:x.save.time};const out=x.command("enter");assert.ok(out.error,mode);assert.equal(JSON.stringify(x.campaign.scene),before.scene,mode);assert.equal(JSON.stringify(x.campaign.enemies),before.enemies,mode);assert.equal(x.campaign.dungeons.serial,before.serial,mode);assert.equal(x.save.hp,before.hp,mode);assert.equal(x.save.time,before.time,mode);}
});

test("patrols and bosses require every foe; stages cannot be skipped",()=>{
 const x=setup(),{campaign:c,save:s,api}=x;assert.equal(x.command("accept").spent,false);assert.equal(x.command("enter").spent,true);
 assert.ok(x.command("next").error);assert.ok(x.command("claim").error);assert.ok(x.command("pull").startEncounter);assert.equal(c.enemies.length,2);assert.ok(c.enemies.every(e=>e.dungeonRun===api.current(c).runId));
 c.combatRound++;c.enemies[0].hp=0;assert.equal(api.settle(c,s,{round:c.combatRound}).waveCleared,undefined);assert.equal(api.current(c).status,"fighting");assert.ok(x.command("rest").error);assert.ok(x.command("next").error);
 c.combatRound++;c.enemies[1].hp=0;assert.equal(api.settle(c,s,{round:c.combatRound}).waveCleared,true);assert.equal(api.current(c).status,"cleared");assert.ok(x.command("next").spent);
 assert.equal(api.current(c).stage,1);assert.equal(api.current(c).status,"ready");
});

test("a full route clears only after every boss and minion stage, then pays its contract once",()=>{
 const x=setup({className:"Rogue"}),{campaign:c,save:s,api,data}=x,d=data.CATALOG.find(y=>y.id==="rfc"),stages=api.stages(d);x.command("accept");x.command("enter");
 for(let index=0;index<stages.length;index++){
  assert.equal(api.current(c).stage,index);assert.ok(x.command("pull").startEncounter);const isBoss=!!stages[index].boss;assert.equal(c.enemies.some(e=>e.dungeonBoss),isBoss);
  c.combatRound++;for(const foe of c.enemies)foe.hp=0;const settled=api.settle(c,s,{round:c.combatRound});assert.equal(settled.waveCleared,true);assert.equal(api.current(c).cleared.at(-1),index);
  if(isBoss){const receipt=Object.values(api.current(c).loot).at(-1);assert.ok(receipt);assert.equal(receipt.chance,index===stages.length-1?60:35);assert.equal(receipt.roll,1+((receipt.roll-1)%100));}
  const search=x.command("loot");if(!search.error)assert.equal(search.spent,true);
  if(index<stages.length-1){assert.ok(x.command("rest").spent);assert.ok(x.command("next").spent);}
 }
 assert.equal(api.current(c).status,"complete");assert.equal(api.current(c).cleared.length,stages.length);assert.equal(c.dungeons.quests.rfc.completedRun,api.current(c).runId);
 const before=c.quests.inventory.length,claim=x.command("claim");assert.ok(claim.message.includes("paid once"));assert.equal(c.quests.inventory.length,before+1);assert.equal(c.dungeons.quests.rfc.claimed,true);assert.ok(x.command("claim").error);
 const kept=c.quests.inventory.length;assert.ok(x.command("leave").spent);assert.equal(c.dungeons.active,null);assert.equal(c.scene.location,"Orgrimmar");assert.equal(c.quests.inventory.length,kept);assert.equal(c.dungeons.history[0].completed,true);
});

test("accepting a contract after a completed active run makes that exact clear claimable",()=>{
 const x=setup(),{campaign:c,api}=x;x.command("enter");const d=api.definition("rfc"),run=api.current(c);run.status="complete";run.cleared=api.stages(d).map(stage=>stage.id);const accepted=x.command("accept");assert.equal(accepted.spent,false);assert.equal(c.dungeons.quests.rfc.completedRun,run.runId);assert.ok(x.command("claim").message.includes("paid once"));
});

test("boss weapon rewards flow into the existing equipment and stat systems",()=>{
 const x=setup({className:"Warrior"}),{campaign:c,ctx,data,hero}=x,item=Object.values(data.ITEMS).find(row=>row.dungeon==="rfc"&&row.classes[0]==="Warrior"&&row.slot==="weapon");
 c.quests.inventory.push({name:item.name,source:"Dungeon boss: Oggleflint",rarity:item.rarity});
 class Element{constructor(){this.children=[];this.style={};this.dataset={};}append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}addEventListener(){}setAttribute(){}}
 ctx.document={createElement:()=>new Element(),getElementById:()=>null};ctx.sessionStorage={getItem:()=>null,setItem(){}};
 Object.assign(ctx.window,{soaCharacters:{profile:()=>hero,startingEquipment:()=>[]},soaProgression:{level:()=>60},soaLivingCampaign:{getState:()=>c,persist:()=>true}});vm.runInContext(source("equipment.js"),ctx);
 const equip=ctx.window.soaEquipment;assert.equal(equip.itemInfo(c.quests.inventory[0]).dungeon,"rfc");assert.ok(equip.equip(0).message);assert.equal(equip.modifiers().attack,item.bonuses.attack);assert.equal(equip.modifiers().damage,item.bonuses.damage);assert.equal(c.quests.equipped.weapon,0);
});

test("loot receipts are stable across reloads, inventory overflow is recoverable, and equipment is never auto-equipped",()=>{
 const x=setup({className:"Warrior"}),{campaign:c,save:s,api}=x;x.command("enter");api.current(c).seed=123456;const bossStage=1;api.current(c).stage=0;x.command("pull");c.combatRound++;c.enemies[0].hp=0;c.enemies[1].hp=0;api.settle(c,s,{round:c.combatRound});x.command("next");x.command("pull");c.combatRound++;for(const e of c.enemies)e.hp=0;api.settle(c,s,{round:c.combatRound});
 const run=api.current(c),receipt=Object.values(run.loot)[0],serialized=JSON.stringify(c);const restored=JSON.parse(serialized);assert.equal(JSON.stringify(restored.dungeons.active.loot),JSON.stringify(run.loot));assert.equal(receipt.stage,bossStage);
 const slot=receipt.item?200:0;c.quests.inventory=Array.from({length:slot},()=>({name:"Occupied"}));if(receipt.item){assert.ok(x.command("loot").error);assert.equal(receipt.collected,false);c.quests.inventory.pop();assert.ok(x.command("loot").spent);assert.equal(c.quests.inventory.at(-1).name,receipt.item);assert.equal(c.quests.equipped.weapon,undefined);assert.ok(x.command("loot").error);}
 const valid=x.ctx.window.soaSaveRules.validateCampaignSave(JSON.parse(JSON.stringify(c)));assert.equal(valid.dungeons.active.loot[Object.keys(run.loot)[0]].roll,receipt.roll);
});

test("camping is once per stage, failure requires retreat, and incomplete leave preserves the home scene",()=>{
 const x=setup(),{campaign:c,save:s,api}=x;x.command("enter");const home=structuredClone(c.dungeons.active.home);x.command("pull");c.combatRound++;for(const e of c.enemies)e.hp=0;api.settle(c,s,{round:c.combatRound});s.hp=40;s.en=10;assert.ok(x.command("rest").spent);assert.equal(s.hp,75);assert.equal(s.en,40);assert.ok(x.command("rest").error);assert.ok(x.command("next").spent);x.command("pull");s.hp=1;c.combatRound++;api.settle(c,s,{round:c.combatRound});assert.equal(api.current(c).status,"failed");assert.ok(x.command("pull").error);assert.ok(x.command("rest").error);assert.ok(x.command("leave").spent);assert.deepEqual(c.scene,home);
});

test("invalid dungeon ledgers are rejected while a save/reload preserves valid progress",()=>{
 const x=setup(),{campaign:c,api,ctx}=x;x.command("accept");x.command("enter");const valid=ctx.window.soaSaveRules.validateCampaignSave(JSON.parse(JSON.stringify(c)));assert.equal(valid.dungeons.active.runId,"dungeon-1");
 const bad=JSON.parse(JSON.stringify(c));bad.dungeons.active.cleared=[1];assert.throws(()=>ctx.window.soaSaveRules.validateCampaignSave(bad),/Active dungeon progress/);
 const badLoot=JSON.parse(JSON.stringify(c));badLoot.dungeons.active.loot.boss={boss:"Bad",stage:0,roll:101,chance:35,collected:false,item:null};assert.throws(()=>ctx.window.soaSaveRules.validateCampaignSave(badLoot),/Dungeon loot receipt/);
 const badQuest=JSON.parse(JSON.stringify(c));badQuest.dungeons.quests.rfc.claimed=true;assert.throws(()=>ctx.window.soaSaveRules.validateCampaignSave(badQuest),/Dungeon contract/);
 const badRun=JSON.parse(JSON.stringify(c));badRun.dungeons.active.id="not-a-dungeon";assert.throws(()=>ctx.window.soaSaveRules.validateCampaignSave(badRun),/Active dungeon progress/);
 assert.equal(api.current(c).status,"ready");
});

test("AI advancement cannot overwrite an active local dungeon scene",()=>{
 const campaign=source("campaign.js"),at=campaign.indexOf("async function advance(");assert.ok(at>=0);const next=campaign.indexOf("\n const code=accessCode();",at);const guard=campaign.slice(at,next);assert.match(guard,/soaDungeons\?\.current\?\.\(campaign\)/);assert.match(guard,/encounter is resolved locally/);assert.doesNotMatch(guard,/await fetch\(/);
});

test("campaign dungeon entry works offline and restores the save if persistence fails",async()=>{
 const x=setup(),{ctx,api,campaign,save,hero}=x,originalCampaign=JSON.stringify(campaign),originalSave=JSON.stringify(save),page=source("campaign.js");
 Object.assign(ctx,{campaign,s:save,selectedCombatTarget:null,busy:false,MAX:24,status(message){ctx.notice=message},refreshDisplay(){},returnToAdventure(){},startProgressionEncounter(){},save:()=>true,store:()=>true,concludeProgressionEncounter(){}});
 Object.assign(ctx.window,{soaDungeons:api,soaCharacters:{profile:()=>hero},soaProgression:{level:()=>60},soaSaveRules:{isIntegrityBlocked:()=>false},soaChronicle:{receive(){},render(){}}});
 const start=page.indexOf("async function chooseDungeon("),end=page.indexOf("\nasync function choose(",start);assert.ok(start>=0&&end>start);vm.runInContext(page.slice(start,end)+"\nglobalThis.runDungeonChoice=chooseDungeon;",ctx);
 let stores=0;ctx.store=()=>++stores>1;
 await ctx.runDungeonChoice({dungeonAction:"enter",dungeon:"rfc",text:"Enter Ragefire Chasm"});
 assert.equal(JSON.stringify(ctx.campaign),originalCampaign);assert.equal(JSON.stringify(ctx.s),originalSave);assert.equal(ctx.campaign.dungeons,undefined);assert.equal(ctx.busy,false);
 ctx.store=()=>true;await ctx.runDungeonChoice({dungeonAction:"enter",dungeon:"rfc",text:"Enter Ragefire Chasm"});assert.ok(ctx.campaign.dungeons?.active,ctx.notice);assert.equal(ctx.campaign.dungeons.active.id,"rfc");assert.equal(ctx.campaign.dungeons.active.status,"ready");assert.equal(ctx.campaign.enemies.length,0);assert.equal(ctx.s.time,1);assert.equal(ctx.busy,false);
});
