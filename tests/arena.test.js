"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),test=require("node:test"),vm=require("node:vm");
const source=file=>fs.readFileSync(path.join(__dirname,"..","public",file),"utf8");
function setup({faction="Alliance",location=faction==="Alliance"?"Stormwind City":"Orgrimmar",level=10}={}){
 const ctx={window:{},structuredClone,console};vm.createContext(ctx);vm.runInContext(source("dungeon-data.js"),ctx);vm.runInContext(source("save-rules.js"),ctx);vm.runInContext(source("arena.js"),ctx);
 const campaign={turn:1,combatRound:0,enemies:[],scene:{title:"A city street",location,story:"The capital is busy.",choices:[]}},save={hp:100,en:100,time:0},hero={name:"Arena Tester",className:"Warrior",race:"Human",faction};
 const api=ctx.window.soaArena,action=(op,extra={})=>api.command(campaign,save,{arenaAction:op,...extra},hero,level);
 return {ctx,campaign,save,hero,api,action};
}

test("Alliance and Horde arena access is faction and capital specific",()=>{
 const alliance=setup();assert.equal(alliance.api.venue("Alliance"),"Stormwind City");assert.ok(alliance.action("enter").spent);assert.equal(alliance.api.current(alliance.campaign).venue,"Stormwind City");
 const wrongCapital=setup({location:"Orgrimmar"});assert.match(wrongCapital.action("enter").error,/Stormwind City/);
 const horde=setup({faction:"Horde",location:"Orgrimmar"});assert.ok(horde.action("enter").spent);assert.equal(horde.api.current(horde.campaign).venue,"Orgrimmar");
 const wrongFaction=setup({faction:"Horde",location:"Stormwind City"});assert.match(wrongFaction.action("enter").error,/Orgrimmar/);
});

test("arena is optional, cannot overlap dungeon combat, and records survive leaving",()=>{
 const x=setup(),{campaign:c,action,api,ctx}=x;
 ctx.window.soaDungeons={current:campaign=>campaign?.dungeons?.active||null};c.dungeons={version:1,serial:1,active:{}};assert.match(action("enter").error,/dungeon expedition/);delete c.dungeons;delete ctx.window.soaDungeons;
 assert.ok(action("enter").spent);assert.equal(action("enter").error,"You are already entered in an arena challenge.");
 const home=structuredClone(c.arena.active.home);assert.ok(action("leave").spent);assert.equal(api.current(c),null);assert.deepEqual(c.scene,home);
 const valid=x.ctx.window.soaSaveRules.validateCampaignSave(JSON.parse(JSON.stringify(c)));assert.equal(valid.arena.wins,0);
});

test("each opponent starts separately, victory counts once, and every 20 wins advances one rank",()=>{
 const x=setup(),{campaign:c,api,action,save}=x;action("enter");
 for(let win=1;win<=40;win++){
  const started=action("fight");assert.ok(started.startEncounter);assert.equal(api.current(c).status,"fighting");
  const foe=c.enemies[0];assert.equal(foe.arenaRank,api.rank(win-1));assert.equal(foe.arenaBout,win);foe.hp=0;c.combatRound=win;
  const event={round:win,target:foe.name};const result=api.settle(c,save,event);assert.equal(result.waveCleared,true);assert.equal(api.current(c).status,"ready");assert.equal(api.state(c).wins,win);
  assert.equal(api.settle(c,save,event).message,"","a recorded round cannot add another victory");
 }
 assert.equal(api.rank(c.arena.wins),3);assert.equal(api.title(c.arena.wins),"Bronze Gladiator");assert.equal(c.arena.history.length,20,"recent history remains bounded");
});

test("rank caps at twenty and the final title is Arena Grand Champion while wins continue",()=>{
 const x=setup(),{campaign:c,api,action,save}=x;action("enter");
 for(let win=1;win<=401;win++){
  action("fight");const foe=c.enemies[0];foe.hp=0;c.combatRound=win;api.settle(c,save,{round:win,target:foe.name});
 }
 assert.equal(c.arena.wins,401);assert.equal(api.rank(c.arena.wins),20);assert.equal(api.title(c.arena.wins),"Arena Grand Champion");
 assert.match(api.settle(c,save,{round:401}).message,/^$/);
});

test("challengers scale with hero level and rank, and defeat preserves the career record",()=>{
 const x=setup({level:40}),{campaign:c,api,action,save}=x;action("enter");action("fight");const first={...c.enemies[0]};assert.ok(first.maxHp>0&&first.armorClass>=12&&first.attackBonus>=3);
 c.enemies[0].hp=0;c.combatRound=1;api.settle(c,save,{round:1});action("fight");const second=c.enemies[0];second.hp=second.maxHp;save.hp=1;c.combatRound=2;
 const lost=api.settle(c,save,{round:2});assert.equal(lost.lost,true);assert.equal(c.arena.wins,1);assert.equal(api.current(c).status,"lost");assert.equal(c.xpEncounter,undefined);
 assert.ok(action("leave").spent);assert.equal(c.arena.wins,1);assert.equal(api.rank(c.arena.wins),1);
});

test("save validation accepts active arena progress and rejects malformed rank, venue and overlap",()=>{
 const x=setup(),{campaign:c,action,ctx}=x;action("enter");action("fight");const good=ctx.window.soaSaveRules.validateCampaignSave(JSON.parse(JSON.stringify(c)));assert.equal(good.arena.active.status,"fighting");
 const badRank=JSON.parse(JSON.stringify(c));badRank.arena.history=[{bout:1,opponent:"Opponent",win:true,rank:21,turn:1}];assert.throws(()=>ctx.window.soaSaveRules.validateCampaignSave(badRank),/Arena history/);
 const badVenue=JSON.parse(JSON.stringify(c));badVenue.arena.active.venue="Orgrimmar";assert.throws(()=>ctx.window.soaSaveRules.validateCampaignSave(badVenue),/Active arena challenge/);
});

test("arena board presents the proper faction venue, record and unlimited challenge controls",()=>{
 const x=setup(),{campaign:c,api,ctx}=x;class Element{constructor(tag){this.tag=tag;this.children=[];this.textContent="";this.disabled=false;}append(...nodes){this.children.push(...nodes)}}
 ctx.document={createElement:tag=>new Element(tag)};const choices=[],panel=api.panel(c,x.save,x.hero,choice=>choices.push(choice));const flatten=node=>[node,...(node.children||[]).flatMap(flatten)],nodes=flatten(panel),buttons=nodes.filter(node=>node.tag==="button");
 assert.ok(nodes.some(node=>node.textContent==="Faction Arena · Endless challenge"));assert.ok(nodes.some(node=>node.textContent.includes("Stormwind City")));assert.ok(nodes.some(node=>node.textContent.includes("maximum rank: Arena Grand Champion")));
 buttons[0].onclick();assert.equal(choices[0].arenaAction,"enter");
});
