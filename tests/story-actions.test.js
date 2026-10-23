"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const src=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8"),campaignSource=src("public/campaign.js");
function block(name){const at=campaignSource.indexOf("function "+name+"("),end=campaignSource.indexOf("\nfunction ",at+1);assert.ok(at>=0);return campaignSource.slice(at,end);}
function setup(className="Druid",level=10){
 const hero={id:"hero",name:"Test Hero",className,level,race:"Night Elf",form:"caster",specialization:"Feral"};
 const ctx={window:{},structuredClone,console};vm.createContext(ctx);
 Object.assign(ctx,{s:{hp:60,en:100,time:0,flags:{}},campaign:{turn:1,combatRound:0,actionSerial:0,enemies:[],history:[],scene:{location:"Forest trail",story:"A fragile root knot blocks the trail.",enemies:[]}},selectedCombatTarget:null,busy:false,campaignLoadBlocked:false,campaignStorageReadFailed:false,campaignSaveFailed:false,navigator:{onLine:true},MAX:24,ACTION_RESOURCE_RECOVERY:25,COMBAT_RESOURCE_RECOVERY:25});
 const rules={roll:n=>n===100?90:15,attack:(bonus,ac)=>({die:15,bonus,total:15+bonus,hit:15+bonus>=ac,critical:false}),damage:(die,flat)=>4+flat,statBlock:()=>({ac:12,bonus:3,die:6,type:"humanoid",initiative:0,resist:[],vulnerable:[]}),mitigate:n=>n,initiative:()=>10,weapon:()=>({die:6,flat:3,type:"physical"})};
 const actor={className,modifiers:{STR:2,DEX:2,WIS:4,INT:4,CHA:3,CON:2},proficiency:2,armorClass:14,initiative:2};
 Object.assign(ctx.window,{soaCharacters:{profile:()=>({...hero,form:className==="Druid"?ctx.s.druid?.form||"caster":undefined})},soaProgression:{level:()=>level},soaAbilities:{get:()=>actor},soaCombatRules:rules,soaEquipment:{modifiers:()=>({})}});
 for(const f of ["save-rules","story-actions","druid","class-abilities"])vm.runInContext(src("public/"+f+".js"),ctx);
 if(className==="Druid"){ctx.window.soaDruid.bind({state:()=>ctx.s,campaign:()=>ctx.campaign});ctx.window.soaDruid.state(ctx.s);}else delete ctx.window.soaDruid;
 Object.assign(ctx,{livingEnemies:()=>ctx.campaign.enemies.filter(e=>e.hp>0),partyExperienceIds:()=>["hero"],recordCombatDelta(){},concludeProgressionEncounter(){},resourceName:()=>"Mana",heroHealthCap:()=>100,status:m=>ctx.notice=m,save:()=>true,store:()=>true,pending:()=>ctx.campaign.pending,accessCode:()=>true,dialogueFromCustom:()=>null,socialSkill:()=>null,resolvedStoryVanish:()=>null,unavailableClassAbility:()=>null,resolvedCombatAbility:a=>a.ability||ctx.window.soaStoryActions.named(a,hero,level)?.id||"strike",recordActionPractice(){},refreshDisplay(){},returnToAdventure(){},safe:String,advance:async()=>ctx.generations=(ctx.generations||0)+1,hasRecentCorpse:()=>false,actionOdds:()=>({cost:0,skill:"rest",target:100}),scavengeFallenEnemy:()=>null,canonicalStoryChoice:c=>c,selectedAllyTarget:null});
 // Execute production routing and exchange functions, not a replacement implementation.
 for(const name of ["classCooldownLeft","storyActionPlan","playableStoryChoice","dicePreview","resetEncounterCombatState","startProgressionEncounter","classAbilityExchange","druidResult","result","resourceForecast"])vm.runInContext(block(name),ctx);
 ctx.fightExchange=a=>ctx.classAbilityExchange(a,ctx.window.soaClassAbilities.get(a.ability,className,level)||{id:"strike",name:"Weapon Strike",cost:0,effect:"damage",stat:"DEX",die:6,flat:3},ctx.livingEnemies());
 const start=campaignSource.indexOf("async function choose("),end=campaignSource.indexOf("\nasync function advance(",start);vm.runInContext(campaignSource.slice(start,end)+"\nglobalThis.select=choose;",ctx);
 const plan=action=>ctx.storyActionPlan(action),cast=(text,ability)=>({text,ability,type:"combat",difficulty:"easy"});
 return {ctx,hero,rules,actor,plan,cast,api:ctx.window.soaStoryActions};
}
test("environmental spell routing works across Druid, Mage, Shaman and Priest without enemy damage",async()=>{
 for(const [cls,id,name] of [["Druid","wrath","Wrath"],["Mage","fireball","Fireball"],["Shaman","lightning_bolt","Lightning Bolt"],["Priest","smite","Smite"]]){const x=setup(cls),a=x.cast("Cast "+name+" at the root knot",id);assert.equal(x.plan(a).kind,"obstacle");await x.ctx.select(a);assert.equal(x.ctx.s.time,1,cls);assert.equal(x.ctx.campaign.enemies.length,0);assert.equal(x.ctx.campaign.combatRound,0);assert.equal(x.ctx.s.hp,60);assert.match(x.ctx.campaign.pending.resolution,/obstacle DC 10/);assert.equal(x.ctx.campaign.pending.combatExchangeResolved,false);assert.equal(x.ctx.s.en,100-x.ctx.window.soaClassAbilities.get(id,cls,10).cost+25);}
});
test("opening Moonfire registers the visible hostile and resolves exactly one exchange",async()=>{
 const x=setup();x.ctx.campaign.scene.story="A hostile satyr lurks beside the trail.";const a=x.cast("Cast Moonfire at the lurking satyr","moonfire");assert.equal(x.plan(a).kind,"opening");await x.ctx.select(a);const c=x.ctx.campaign;assert.equal(c.enemies.length,1);assert.equal(c.enemies[0].name,"Satyr");assert.ok(c.enemies[0].hp>0&&c.enemies[0].hp<c.enemies[0].maxHp);assert.equal(c.combatRound,1);assert.equal(x.ctx.s.time,1);assert.equal(c.pending.combatExchangeResolved,true);assert.equal(c.lastExchange.target,"Satyr");assert.equal(x.ctx.s.en,95);assert.equal(x.ctx.generations,1);await x.ctx.select(a);assert.equal(x.ctx.s.time,1);assert.equal(x.ctx.generations,1);
});
test("named visible enemies retain their exact tracked identity and HP",()=>{
 const x=setup();x.ctx.campaign.scene={location:"Forest",story:"Lunaclaw snarls before you.",enemies:[{name:"Lunaclaw",hp:44,maxHp:55}]};const p=x.plan(x.cast("Cast Wrath at Lunaclaw","wrath"));assert.equal(p.kind,"opening");assert.equal(p.target.name,"Lunaclaw");assert.equal(p.target.hp,44);
});
test("a choice cannot manufacture enemies, scenery, distant threats or a free victory",async()=>{
 for(const story of ["The grove is quiet.","A distant satyr lurks miles away.","You remember the hostile satyr from yesterday.","The defeated satyr lies unconscious.","A friendly satyr stands nearby.","There is no satyr lurking here."]){const x=setup();x.ctx.campaign.scene.story=story;const a=x.cast("Cast Wrath at the satyr","wrath"),before=JSON.stringify(x.ctx.s);assert.ok(x.plan(a).error,story);await x.ctx.select(a);assert.equal(JSON.stringify(x.ctx.s),before);assert.equal(x.ctx.campaign.enemies.length,0);assert.equal(x.ctx.generations,undefined);}
 const x=setup();x.ctx.campaign.scene.story="The grove is quiet.";x.ctx.campaign.scene.choices=[x.cast("Cast Wrath at the root knot","wrath")];assert.ok(x.plan(x.ctx.campaign.scene.choices[0]).error);
});
test("self healing needs no hostile, uses real costs, and respects full health and cooldown",async()=>{
 for(const [cls,id,name] of [["Druid","rejuvenation","Rejuvenation"],["Shaman","healing_wave","Healing Wave"],["Priest","lesser_heal","Lesser Heal"],["Paladin","flash_of_light","Flash of Light"]]){const x=setup(cls),a=x.cast("Cast "+name+" upon yourself",id);assert.equal(x.plan(a).kind,"self");await x.ctx.select(a);assert.ok(x.ctx.s.hp>60,cls);assert.equal(x.ctx.campaign.combatRound,0);assert.equal(x.ctx.s.time,1);x.ctx.campaign.pending=null;assert.ok(x.plan(a).error,cls+" cooldown");}
 const x=setup();x.ctx.s.hp=100;assert.match(x.plan(x.cast("Cast Rejuvenation on yourself","rejuvenation")).error,/full/);
});
test("defensive spells prepare a saved ward without manufacturing an opponent",async()=>{
 const x=setup("Mage"),a=x.cast("Use Blink to prepare an evasive defense","blink");assert.equal(x.plan(a).kind,"self");await x.ctx.select(a);assert.equal(x.ctx.campaign.enemies.length,0);assert.equal(x.ctx.campaign.storyGuard.id,"blink");assert.equal(x.ctx.s.en,95);assert.equal(x.ctx.s.time,1);
 x.ctx.campaign.pending=null;x.ctx.campaign.scene.story="A hostile satyr lurks nearby.";await x.ctx.select(x.cast("Cast Fireball at the satyr","fireball"));assert.equal(x.ctx.campaign.guardUntil,1);assert.equal(x.ctx.campaign.storyGuard,undefined);
});
test("single enemy is automatic; multiple enemies require a named or selected target",()=>{
 const x=setup();const c=x.ctx.campaign;c.enemies=[{name:"Satyr",hp:50,maxHp:50}];assert.equal(x.plan(x.cast("Cast Wrath","wrath")).target.name,"Satyr");c.enemies.push({name:"Bandit",hp:50,maxHp:50});assert.ok(x.plan(x.cast("Cast Wrath","wrath")).error);x.ctx.selectedCombatTarget="Bandit";assert.equal(x.plan(x.cast("Cast Wrath","wrath")).target.name,"Bandit");assert.equal(x.plan(x.cast("Cast Wrath at the satyr","wrath")).target.name,"Satyr");
});
test("unlearned spells, foreign spells, insufficient resource and invalid forms are filtered",()=>{
 const x=setup("Druid",1);assert.ok(x.plan(x.cast("Cast Moonfire at the root knot","moonfire")).error);assert.ok(x.plan(x.cast("Cast Fireball at the root knot")).error);x.ctx.s.en=10;assert.ok(x.plan(x.cast("Cast Wrath at the root knot","wrath")).error);const fallback=x.ctx.playableStoryChoice(x.cast("Cast Wrath at the root knot","wrath"),0);assert.equal(fallback.type,"rest");assert.doesNotMatch(fallback.text,/cast|wrath/i);
});
test("blocked combat choices become a free strike instead of a free rest exchange",()=>{
 const x=setup();x.ctx.campaign.enemies=[{name:"Satyr",hp:50,maxHp:50}];x.ctx.s.en=0;const fallback=x.ctx.playableStoryChoice(x.cast("Cast Wrath at the satyr","wrath"),0);assert.equal(fallback.ability,"strike");assert.equal(fallback.type,"combat");assert.equal(x.plan(fallback).error,undefined);
});
test("environment actions cannot silently hit an engaged foe instead",()=>{
 const x=setup();x.ctx.campaign.enemies=[{name:"Satyr",hp:50,maxHp:50}];assert.ok(x.plan(x.cast("Cast Wrath at the root knot","wrath")).error);
});
test("opening attack transaction rolls back its foe, damage, resource and turn if saving fails",async()=>{
 const x=setup();x.ctx.campaign.scene.story="A hostile satyr lurks nearby.";x.ctx.store=()=>false;const before=JSON.stringify(x.ctx.s);await x.ctx.select(x.cast("Cast Moonfire at the satyr","moonfire"));assert.equal(JSON.stringify(x.ctx.s),before);assert.equal(x.ctx.campaign.enemies.length,0);assert.equal(x.ctx.campaign.combatRound,0);assert.equal(x.ctx.campaign.pending,undefined);assert.equal(x.ctx.generations,undefined);
});
test("obstacle and self-cast forecasts use the same spell cost as resolution",()=>{
 const x=setup("Shaman"),a=x.cast("Cast Lightning Bolt at the root knot","lightning_bolt");const forecast=x.ctx.resourceForecast(a);assert.equal(forecast.cost,40);assert.equal(forecast.after,85);
});
test("self-cast does not redirect an explicit companion heal onto the player",()=>{
 const x=setup();x.ctx.campaign.combatAllies=[{name:"Bromli Ironkeg",hp:10,maxHp:100}];assert.ok(x.plan(x.cast("Cast Rejuvenation on Bromli Ironkeg","rejuvenation")).error);
});
test("discussion of a spell is not itself a spellcast",()=>{
 const x=setup();assert.equal(x.plan({text:"Discuss the history of Wrath",type:"social"}),null);
});
test("an explicit named Druid spell hits that enemy, not a different dropdown selection",async()=>{
 const x=setup();x.ctx.campaign.enemies=[{name:"Satyr",hp:70,maxHp:70},{name:"Bandit",hp:70,maxHp:70}];x.ctx.campaign.enemyLocation="Forest trail";x.ctx.selectedCombatTarget="Bandit";await x.ctx.select(x.cast("Cast Wrath at the satyr","wrath"));assert.equal(x.ctx.campaign.lastExchange.target,"Satyr");assert.ok(x.ctx.campaign.enemies[0].hp<70);assert.equal(x.ctx.campaign.enemies[1].hp,70);
});
test("ambiguous enemy lists and destroyed obstacles are not actionable spell targets",()=>{
 const x=setup();x.ctx.campaign.enemies=[{name:"Satyr",hp:70,maxHp:70},{name:"Bandit",hp:70,maxHp:70}];x.ctx.selectedCombatTarget="Bandit";assert.ok(x.plan(x.cast("Cast Wrath at the satyr and bandit","wrath")).error);x.ctx.campaign.enemies=[];x.ctx.campaign.scene.story="The root knot is destroyed and the trail is clear.";assert.ok(x.plan(x.cast("Cast Wrath at the root knot","wrath")).error);
});
test("prepared Vanish prevents retaliation during the next opening exchange",async()=>{
 const x=setup("Rogue");await x.ctx.select(x.cast("Use Vanish","vanish"));x.ctx.campaign.pending=null;x.ctx.campaign.scene.story="A hostile satyr lurks nearby.";const hp=x.ctx.s.hp;await x.ctx.select(x.cast("Use Sinister Strike against the satyr","sinister_strike"));assert.equal(x.ctx.s.hp,hp);assert.equal(x.ctx.campaign.lastExchange.evaded,true);assert.equal(x.ctx.campaign.preparedVanish,false);
});
test("Bear Enrage can be prepared without a target and retains its Rage for the opening attack",async()=>{
 const x=setup("Druid",12),ctx=x.ctx;ctx.campaign.druidQuests={bear:{state:"claimed"}};ctx.s.druid.form="bear";ctx.s.en=0;ctx.s.druid.pools.rage=0;
 await ctx.select(x.cast("Use Enrage","enrage"));assert.equal(ctx.s.en,15);assert.equal(ctx.campaign.storyGuard.id,"enrage");ctx.campaign.pending=null;ctx.campaign.scene.story="A hostile satyr lurks nearby.";assert.equal(x.plan(x.cast("Use Maul against the satyr","maul")).kind,"opening");await ctx.select(x.cast("Use Maul against the satyr","maul"));assert.equal(ctx.campaign.combatRound,1);assert.equal(ctx.s.druid.effects.enrageUntil,2);assert.equal(ctx.campaign.guardUntil,0);
});
test("Druid roars are not offered without enemies for their debuff",()=>{
 const x=setup(),ctx=x.ctx;ctx.campaign.druidQuests={bear:{state:"claimed"}};ctx.s.druid.form="bear";ctx.s.en=50;ctx.s.druid.pools.rage=50;assert.match(x.plan(x.cast("Use Demoralizing Roar","demoralizing_roar")).error,/engaged enemies/);
});
function bearReturnSetup(combat=false){
 const x=setup(),ctx=x.ctx;ctx.campaign.druidQuests={bear:{state:"claimed"}};ctx.s.druid.form="bear";ctx.s.en=0;ctx.s.druid.pools.rage=0;ctx.s.druid.pools.mana=7;
 if(combat){ctx.campaign.enemies=[{name:"Satyr",hp:50,maxHp:50}];ctx.campaign.enemyLocation=ctx.campaign.scene.location;}
 const action={text:"Shift out of bear form into your natural Night Elf shape",type:"move",difficulty:"easy"};return {...x,action};
}
test("reported Bear return choice previews zero Mana and shifts to Humanoid exactly once",async()=>{
 const x=bearReturnSetup(),ctx=x.ctx;assert.equal(x.plan(x.action).kind,"shift");assert.equal(x.plan(x.action).form,"caster");const preview=ctx.dicePreview(x.action);assert.match(preview.primary,/Humanoid/);assert.match(preview.secondary,/No Mana cost/);
 const forecast=ctx.resourceForecast(x.action);assert.equal(forecast.cost,0);assert.equal(forecast.current,7);assert.equal(forecast.after,7);assert.equal(forecast.affordable,true);assert.doesNotMatch(forecast.text,/20 cost|Rage earned/);
 await ctx.select(x.action);assert.equal(ctx.s.druid.form,"caster");assert.equal(ctx.s.druid.pools.mana,7);assert.equal(ctx.s.en,7);assert.equal(ctx.s.time,1);assert.equal(ctx.generations,1);assert.match(ctx.campaign.pending.resolution,/Humanoid.*No Mana cost/);await ctx.select(x.action);assert.equal(ctx.s.time,1);assert.equal(ctx.generations,1);
});
test("returning to natural form is possible at zero Mana",async()=>{
 const x=bearReturnSetup(),ctx=x.ctx;ctx.s.druid.pools.mana=0;assert.equal(ctx.resourceForecast(x.action).affordable,true);await ctx.select(x.action);assert.equal(ctx.s.druid.form,"caster");assert.equal(ctx.s.druid.pools.mana,0);assert.equal(ctx.s.time,1);
});
test("a return story choice in combat is one recorded shift exchange with retaliation",async()=>{
 const x=bearReturnSetup(true),ctx=x.ctx,hp=ctx.s.hp;await ctx.select(x.action);assert.equal(ctx.s.druid.form,"caster");assert.equal(ctx.campaign.combatRound,1);assert.equal(ctx.campaign.enemies[0].hp,50);assert.equal(ctx.campaign.lastExchange.dealt,0);assert.equal(ctx.campaign.lastExchange.shapeshift,true);assert.equal(ctx.campaign.lastExchange.ability,"shift_caster");assert.equal(ctx.campaign.pending.combat,true);assert.equal(ctx.campaign.pending.combatExchangeResolved,true);assert.ok(ctx.s.hp<hp);assert.equal(ctx.s.druid.pools.mana,7);
});
test("already-natural and unaffordable form choices are filtered before selection",async()=>{
 const x=bearReturnSetup(),ctx=x.ctx;ctx.s.druid.form="caster";ctx.s.en=7;assert.match(x.plan(x.action).error,/Already in Humanoid Form/);assert.equal(ctx.playableStoryChoice(x.action,0).type,"rest");const before=JSON.stringify(ctx.s);await ctx.select(x.action);assert.equal(JSON.stringify(ctx.s),before);assert.equal(ctx.generations,undefined);
 const entry={text:"Shapeshift into Bear Form",type:"move"};assert.match(x.plan(entry).error,/20 Mana/);assert.equal(ctx.playableStoryChoice(entry,1).type,"rest");
});
test("form-change persistence failure restores the prior Bear form and Mana pool",async()=>{
 const x=bearReturnSetup(),ctx=x.ctx;ctx.store=()=>false;const before=JSON.stringify(ctx.s);await ctx.select(x.action);assert.equal(JSON.stringify(ctx.s),before);assert.equal(ctx.campaign.pending,undefined);assert.equal(ctx.generations,undefined);
});
