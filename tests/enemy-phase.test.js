"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../public/campaign.js"),"utf8");
function block(name){const at=source.indexOf("function "+name+"("),end=source.indexOf("\nfunction ",at+1);return source.slice(at,end);}
function setup(){
 const math=Object.create(Math);math.random=()=>.9;
 const ctx={window:{},Math:math,s:{hp:100,en:70,time:0},campaign:{enemies:["Wolf","Satyr","Guard"].map(name=>({name,hp:80,maxHp:80})),combatRound:0,flags:{}},COMBAT_RESOURCE_RECOVERY:25,selectedCombatTarget:"Wolf"};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/combat-rules.js"),"utf8"),ctx);
 const calls=[],rules={statBlock:e=>({ac:12,bonus:3,die:6,type:"beast",initiative:0}),attack:(bonus,ac,options={})=>{calls.push({bonus,ac,...options});return {die:15,total:15+bonus,bonus,hit:true,critical:false};},damage:(_die,flat)=>4+flat,mitigate:n=>n,initiative:()=>10,roll:()=>90,weapon:()=>({die:6,flat:3,type:"physical"})};
 Object.assign(ctx.window,{soaCombatRules:rules,soaCharacters:{profile:()=>({name:"Hero",className:"Warrior"})},soaAbilities:{get:()=>({armorClass:14,proficiency:2,modifiers:{STR:3,DEX:2,WIS:3}})},soaEquipment:{modifiers:()=>({})},soaProgression:{level:()=>10},soaClassAbilities:{get:()=>null,costOf:()=>0}});
 Object.assign(ctx,{livingEnemies:()=>ctx.campaign.enemies.filter(e=>e.hp>0),resourceName:()=>"Mana",heroHealthCap:()=>100,racialRegeneration:()=>0,classCooldownLeft:()=>0,partyExperienceIds:()=>[],resolvedCombatAbility:a=>a.ability||"strike",resolvedRacialCombatAbility:()=>null,status:m=>{ctx.notice=m;},startProgressionEncounter:()=>ctx.campaign.xpEncounter||=( {id:"battle",party:[],defeated:[]} )});
 for(const name of ["recordCombatDelta","companionExchange","classAbilityExchange","fightExchange"])vm.runInContext(block(name),ctx);
 const run=options=>ctx.window.soaEnemyPhase.resolve({s:ctx.s,c:ctx.campaign,enemies:ctx.campaign.enemies,rules,round:1,heroAC:14,heroName:"Hero",...options});
 return {ctx,calls,rules,run};
}
test("all living enemies attack in roster order with sequential HP and no extra turns",()=>{
 const {ctx,run}=setup(),out=run();assert.equal(out.attacks.length,3);assert.equal(out.taken,18);assert.equal(ctx.s.hp,82);
 assert.deepEqual(Array.from(out.attacks,r=>[r.enemy,r.before,r.after]),[["Wolf",100,94],["Satyr",94,88],["Guard",88,82]]);
 assert.equal(ctx.s.time,0);assert.equal(ctx.s.en,70);assert.equal(ctx.campaign.combatRound,0);
});
test("defeated enemies never act and interrupts or snares stop only the affected opponent",()=>{
 const {ctx,run,calls}=setup();ctx.campaign.enemies[0].hp=0;ctx.campaign.snaredEnemy="Satyr";ctx.campaign.snareUntil=1;
 const out=run({interruptedTarget:ctx.campaign.enemies[2]});assert.equal(calls.length,0);assert.equal(out.attacks.length,2);assert.equal(out.attacks[0].reason,"snared");assert.equal(out.attacks[1].reason,"interrupted");assert.equal(ctx.campaign.snareUntil,0);
});
test("Evasion rolls separately per incoming hit and guard applies to every enemy",()=>{
 const {ctx,run,rules,calls}=setup();ctx.campaign.evasionUntil=2;let n=0;rules.roll=()=>++n===1?20:90;
 const out=run({guard:true,attackPenalty:3});assert.equal(n,3);assert.equal(out.attacks[0].evaded,true);assert.equal(out.attacks[1].evaded,false);assert.equal(out.taken,12);assert.ok(calls.every(r=>r.advantage===-1&&r.bonus===0));
});
test("Vanish protects the entire phase without rolling attacks or damage",()=>{
 const {run,calls,ctx}=setup();const out=run({guaranteedEvade:true});assert.equal(out.attacks.length,3);assert.ok(out.attacks.every(r=>r.evaded));assert.equal(calls.length,0);assert.equal(ctx.s.hp,100);
});
test("fallen allies cannot receive later attacks and damage records preserve each recipient",()=>{
 const {ctx,run}=setup();ctx.Math.random=()=>.1;const ally={name:"Bromli Ironkeg",hp:4,maxHp:30};ctx.campaign.combatAllies=[ally];
 const out=run({allies:ctx.campaign.combatAllies,allyAC:()=>18});assert.equal(ally.hp,0);assert.equal(ctx.campaign.partyHealth[ally.name].hp,0);assert.equal(out.attacks[0].recipient,ally.name);assert.equal(out.attacks[1].recipient,"Hero");assert.equal(out.heroTaken,12);assert.equal(out.taken,16);
});
test("nonfatal HP floor and recorded damage remain consistent under several attacks",()=>{
 const {ctx,run}=setup();ctx.s.hp=4;const out=run();assert.equal(ctx.s.hp,1);assert.equal(out.taken,3);assert.equal(out.heroHits,1);assert.deepEqual(Array.from(out.attacks,r=>r.damage),[3,0,0]);
});
test("a later enemy's qualifying parry opens Riposte and a miss never rolls Evasion",()=>{
 const {ctx,run,rules}=setup();ctx.Math.random=()=>.1;let calls=0,dodges=0;
 rules.attack=()=>++calls===2?{die:5,total:8,bonus:3,hit:false,critical:false}:{die:15,total:18,bonus:3,hit:true,critical:false};rules.roll=()=>{dodges++;return 90;};ctx.campaign.evasionUntil=2;
 const out=run({allowParry:true});assert.equal(out.parry,true);assert.equal(out.attacks[1].parry,true);assert.equal(out.attacks[1].evasionRoll,null);assert.equal(dodges,2);
});
const spell={id:"test_spell",name:"Test Spell",cost:30,effect:"damage",stat:"STR",die:6,flat:3,cooldown:2};
test("class spells resolve three responses but charge resources, cooldown and regeneration once",()=>{
 const {ctx}=setup();ctx.window.soaClassAbilities.get=()=>spell;ctx.window.soaRacialAbilities={passives:()=>({regeneration:5})};ctx.s.hp=80;
 ctx.classAbilityExchange({text:"Attack Wolf"},spell,ctx.campaign.enemies);
 assert.equal(ctx.campaign.lastExchange.enemyAttacks.length,3);assert.equal(ctx.s.hp,67);assert.equal(ctx.s.en,65);assert.equal(ctx.s.time,1);assert.equal(ctx.campaign.combatRound,1);assert.equal(ctx.campaign.classCooldowns.test_spell,4);assert.equal(ctx.campaign.lastExchange.regenerated,5);
 assert.equal(ctx.campaign.combatLog[0].events.filter(e=>e.side==="ally"&&e.delta<0).length,3);
});
test("an interrupt or takedown does not suppress attacks from the remaining enemies",()=>{
 for(const kill of [false,true]){const {ctx}=setup();if(kill)ctx.campaign.enemies[0].hp=1;ctx.classAbilityExchange({text:"Interrupt Wolf"},{...spell,effect:"interrupt"},ctx.campaign.enemies);const e=ctx.campaign.lastExchange;assert.equal(e.taken,12);assert.equal(e.enemyAttacks.length,kill?2:3);assert.equal(ctx.s.hp,88);}
});
test("basic strikes use the same full enemy phase",()=>{
 const {ctx}=setup();ctx.fightExchange({ability:"strike",text:"Strike Wolf"});assert.equal(ctx.campaign.lastExchange.enemyAttacks.length,3);assert.equal(ctx.s.hp,82);assert.equal(ctx.s.time,1);assert.equal(ctx.campaign.combatRound,1);assert.equal(ctx.s.en,95);
});
test("companion snare stops its selected target while the other enemies attack",()=>{
 const {ctx}=setup();ctx.campaign.combatAllies=[{name:"Pippa Sparkwhistle",hp:30,maxHp:30}];ctx.selectedCombatTarget="Satyr";
 ctx.companionExchange({ability:"pippa_snare"});const out=ctx.campaign.lastExchange;assert.equal(out.enemyAttacks.length,3);assert.equal(out.enemyAttacks[1].reason,"snared");assert.equal(out.taken,12);assert.equal(ctx.s.time,1);assert.equal(ctx.campaign.combatRound,1);assert.equal(ctx.campaign.combatLog.length,1);
});
