"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const src=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function setup(level=60){
 const s={id:"new-hero-start",hp:80,en:100,time:0,money:1500,flags:{},log:[],seen:[]},c={combatRound:0,enemies:[],scene:{location:"Moonglade"}},profile={id:"test",name:"Test Druid",className:"Druid",race:"Night Elf",specialization:"Feral",level};
 const actor={modifiers:{STR:4,DEX:4,WIS:4,CON:2},proficiency:4,armorClass:12};
 const context={window:{soaCharacters:{profile:()=>profile},soaProgression:{level:()=>level},soaAbilities:{get:()=>actor},soaEquipment:{modifiers:()=>({})}},document:{createElement:()=>({append(){},setAttribute(){},style:{},dataset:{}})},structuredClone};
 vm.createContext(context);for(const f of ["save-rules","resource-rules","specializations","druid","class-abilities","combat-rules"])vm.runInContext(src("public/"+f+".js"),context);
 const d=context.window.soaDruid;d.bind({state:()=>s,campaign:()=>c});d.state(s);
 const unlock=id=>{const steps=d.QUESTS[id]?.steps.length||0;c.druidQuests||={};c.druidQuests[id]={state:"claimed",step:steps,proof:Array.from({length:steps},(_,i)=>({step:i})),receipt:"druid-form:"+id};};
 const foe=()=>{const e={name:"Trial Guard",hp:500,maxHp:500};c.enemies=[e];return e;};
 const rules={roll:()=>15,statBlock:()=>({ac:12,bonus:4,die:6,resist:[],vulnerable:[]}),attack:bonus=>({die:15,total:15+bonus,bonus,hit:true,critical:false}),damage:(die,flat)=>4+flat,mitigate:x=>x};
 const learned=()=>context.window.soaClassAbilities.available("Druid",level);
 const cast=(id,target=c.enemies[0])=>d.exchange(s,c,profile,level,{ability:id},learned().find(a=>a.id===id),target,rules,actor);
 return {s,c,profile,actor,d,unlock,foe,rules,learned,cast,context,level};
}
test("legacy Druid Mana migrates once without changing money, HP or other saves",()=>{
 const x=setup();x.s.en=42;delete x.s.druid;const d=x.d.state(x.s);assert.equal(d.pools.mana,42);assert.equal(d.form,"caster");assert.equal(x.s.money,1500);assert.equal(x.s.hp,80);d.pools.energy=17;assert.equal(x.d.state(x.s).pools.energy,17);
});
test("every form requires both its level and a verified quest receipt",()=>{
 const x=setup();for(const [id,f] of Object.entries(x.d.FORMS)){if(id==="caster")continue;x.profile.specialization=f.spec||"Feral";assert.equal(x.d.unlocked(x.c,id,x.profile,60),false);x.unlock(id);assert.equal(x.d.unlocked(x.c,id,x.profile,f.level-1),false);assert.equal(x.d.unlocked(x.c,id,x.profile,f.level),true);}
 x.profile.specialization="Feral";assert.equal(x.d.unlocked(x.c,"moonkin",x.profile,60),false);
});
test("shifts charge separate Mana, retain Energy and do not convert or refill pools",()=>{
 const x=setup();for(const id of ["bear","cat"])x.unlock(id);
 x.d.shift(x.s,x.c,x.profile,60,"cat");assert.equal(x.s.en,100);assert.equal(x.s.druid.pools.mana,80);
 x.s.en=37;x.s.druid.pools.energy=37;x.d.shift(x.s,x.c,x.profile,60,"bear");assert.equal(x.s.en,0);assert.equal(x.s.druid.pools.mana,60);
 x.s.en=40;x.s.druid.pools.rage=40;x.d.shift(x.s,x.c,x.profile,60,"caster");assert.equal(x.s.en,60);assert.equal(x.s.druid.pools.rage,0);
 x.d.shift(x.s,x.c,x.profile,60,"cat");assert.equal(x.s.en,37);assert.equal(x.s.druid.pools.mana,40);
});
test("combat shifting spends exactly one exchange and allows retaliation, with zero attack",()=>{
 const x=setup();x.unlock("bear");const target=x.foe(),before=x.s.hp;
 const out=x.d.exchange(x.s,x.c,x.profile,60,{form:"bear"},null,target,x.rules,x.actor);
 assert.equal(out.event.shapeshift,true);assert.equal(out.event.dealt,0);assert.equal(target.hp,500);assert.equal(x.s.time,1);assert.equal(x.c.combatRound,1);assert.ok(x.s.hp<before);assert.equal(x.s.druid.pools.mana,80);assert.equal(x.s.en,0);assert.equal(out.event.defenderAC,15);
 const old=JSON.stringify(x.s);assert.match(x.d.exchange(x.s,x.c,x.profile,60,{form:"bear"},null,target,x.rules,x.actor).error,/Already/);assert.equal(JSON.stringify(x.s),old);
});
test("Cat, Bear, Moonkin, Tree and utility forms enforce their actual spellbooks",()=>{
 const x=setup();for(const id of ["bear","cat","moonkin","tree","travel"])x.unlock(id);
 x.d.shift(x.s,x.c,x.profile,60,"bear");let ids=x.learned().map(a=>a.id);assert.ok(ids.includes("maul"));assert.ok(ids.includes("spec_druid_feral"));assert.ok(!ids.includes("wrath"));assert.ok(!ids.includes("rejuvenation"));
 x.d.shift(x.s,x.c,x.profile,60,"cat");ids=x.learned().map(a=>a.id);assert.ok(ids.includes("claw"));assert.ok(!ids.includes("maul"));
 x.s.druid.pools.mana=100;x.profile.specialization="Balance";x.d.shift(x.s,x.c,x.profile,60,"moonkin");ids=x.learned().map(a=>a.id);assert.ok(ids.includes("wrath"));assert.ok(ids.includes("spec_druid_balance"));assert.ok(!ids.includes("rejuvenation"));
 x.profile.specialization="Restoration";x.d.shift(x.s,x.c,x.profile,60,"tree");assert.ok(x.learned().every(a=>a.effect==="heal"));assert.equal(x.learned().find(a=>a.id==="rejuvenation").cost,30);
 x.d.shift(x.s,x.c,x.profile,60,"travel");assert.equal(x.learned().length,0);x.foe();assert.match(x.cast("claw").error,/Return to humanoid/);
});
test("form abilities appear only at the specified level and require that form",()=>{
 for(const level of [10,12,14,16,20,22,24,26,28,32,36]){
  const x=setup(level);x.unlock("bear");x.unlock("cat");x.d.shift(x.s,x.c,x.profile,level,level>=20?"cat":"bear");assert.ok(x.learned().every(a=>a.level<=level));
  for(const a of x.d.all().filter(a=>a.forms.includes(x.s.druid.form)))assert.equal(x.learned().some(b=>b.id===a.id),a.level<=level);
 }
});
test("Rage is earned on hits and damage; Cat Energy regenerates independently",()=>{
 const x=setup();x.unlock("bear");x.unlock("cat");x.d.shift(x.s,x.c,x.profile,60,"bear");x.d.recover(x.s,{hit:true,taken:4});assert.equal(x.s.en,10);assert.equal(x.s.druid.pools.mana,85);x.d.recover(x.s);assert.equal(x.s.en,10);x.d.recover(x.s,{combat:false});assert.equal(x.s.en,5);
 x.d.shift(x.s,x.c,x.profile,60,"cat");x.s.en=60;x.d.recover(x.s,{cost:40});assert.equal(x.s.en,40);assert.equal(x.s.druid.pools.energy,40);
});
test("Cat combo points are target bound, build on hits, and finishers consume them",()=>{
 const x=setup();x.unlock("cat");x.d.shift(x.s,x.c,x.profile,60,"cat");const target=x.foe();assert.match(x.cast("ferocious_bite").error,/Build combo/);
 assert.ok(!x.cast("claw").error);assert.equal(x.s.druid.combo.points,1);assert.equal(x.s.druid.combo.target,target.name);
 const other={name:"Other Guard",hp:500,maxHp:500};x.c.enemies.push(other);assert.match(x.cast("ferocious_bite",other).error,/Build combo/);
 x.s.en=100;assert.ok(!x.cast("ferocious_bite").error);assert.equal(x.s.druid.combo.points,0);
});
test("bleeds tick once per future exchange and cannot tick while viewing or retrying",()=>{
 const x=setup();x.unlock("cat");x.d.shift(x.s,x.c,x.profile,60,"cat");const target=x.foe();x.cast("rake");const after=target.hp;assert.equal(x.s.druid.dots.length,1);x.d.context();x.d.context();assert.equal(target.hp,after);
 const basic={id:"test_guard",name:"Wait",cost:0,effect:"guard",stat:"DEX",die:0,flat:0};
 for(let i=0;i<3;i++)x.d.exchange(x.s,x.c,x.profile,60,{},basic,target,x.rules,x.actor);
 assert.equal(target.hp,after-9);assert.equal(x.s.druid.dots.length,0);
});
test("Prowl openers, timed buffs and real cooldowns are enforced",()=>{
 const x=setup();x.unlock("cat");x.d.shift(x.s,x.c,x.profile,60,"cat");x.foe();assert.match(x.cast("pounce").error,/requires Prowl/);x.s.druid.prowl=true;assert.ok(!x.cast("pounce").error);assert.equal(x.s.druid.prowl,false);x.s.en=100;assert.match(x.cast("pounce").error,/requires Prowl|cooling/);
 x.s.druid.prowl=true;assert.match(x.cast("pounce").error,/cooling/);
});
test("utility form environment checks and Flight combat prohibition have no side effects",()=>{
 const x=setup();for(const id of ["aquatic","travel","flight"])x.unlock(id);
 x.c.scene.location="Raven Hill laboratory";let before=JSON.stringify(x.s);assert.ok(x.d.shift(x.s,x.c,x.profile,60,"travel").error);assert.equal(JSON.stringify(x.s),before);
 x.c.scene.location="Moonglade";assert.ok(x.d.shift(x.s,x.c,x.profile,60,"aquatic").error);x.c.scene.location="Lake Elune'ara";assert.ok(!x.d.shift(x.s,x.c,x.profile,60,"aquatic").error);
 x.c.scene.location="Mount Hyjal summit";assert.ok(x.d.shift(x.s,x.c,x.profile,60,"flight",true).error);assert.ok(!x.d.shift(x.s,x.c,x.profile,60,"flight").error);
});
test("Bear quest requires location-specific objectives, real combat and mentor turn-in",()=>{
 const x=setup(10);const q=(op)=>x.d.questAction(x.s,x.c,x.profile,10,"bear",op,x.rules);
 assert.ok(!q("accept").error);assert.ok(q("claim").error);assert.equal(x.d.unlocked(x.c,"bear",x.profile,10),false);
 assert.match(q("step").message,/Objective verified/);x.c.scene.location="Stormwind";assert.ok(q("step").error);x.c.scene.location="Moonkin Stone clearing";q("step");assert.equal(x.c.enemies[0].name,"Lunaclaw");assert.equal(x.c.druidQuests.bear.step,1);assert.ok(q("claim").error);
 x.d.onDefeat(x.c,"Other Guard");assert.equal(x.c.druidQuests.bear.step,1);x.c.enemies[0].hp=0;x.d.onDefeat(x.c,"Lunaclaw");assert.equal(x.c.druidQuests.bear.step,2);assert.ok(q("claim").error);x.c.scene.location="Darnassus";assert.ok(!q("claim").error);assert.equal(x.d.unlocked(x.c,"bear",x.profile,10),true);assert.ok(q("claim").error);assert.equal(x.s.money,1500);
});
test("all quest chains are completable, cannot skip objectives, and claim once",()=>{
 const x=setup();
 const locations={bear:["Moonglade","Moonkin Stone clearing"],aquatic:["Lake Elune'ara","Darkshore coast","Shrine of Remulos"],cat:["Stormrage Barrow Den","Stormrage Barrow Den","Stormrage Barrow Den"],travel:["The Barrens","Wind-carved ridge"],dire_bear:["Felwood","Felwood"],moonkin:["Moonglade","Winterspring"],tree:["Moonglade","Felwood"],flight:["Mount Hyjal summit","Mount Hyjal summit"]};
 for(const [id,q] of Object.entries(x.d.QUESTS)){
  x.profile.specialization=x.d.FORMS[id].spec||"Feral";x.c.scene.location="Moonglade";
  assert.ok(!x.d.questAction(x.s,x.c,x.profile,60,id,"accept",x.rules).error,id);
  assert.ok(x.d.questAction(x.s,x.c,x.profile,60,id,"claim",x.rules).error);
  q.steps.forEach((step,i)=>{x.c.scene.location=locations[id][i];const result=x.d.questAction(x.s,x.c,x.profile,60,id,"step",x.rules);assert.ok(!result.error,id+": "+result.error);if(step.kind==="combat"){x.c.enemies[0].hp=0;x.d.onDefeat(x.c,step.target);}});
  x.c.scene.location="Moonglade";assert.ok(!x.d.questAction(x.s,x.c,x.profile,60,id,"claim",x.rules).error,id);assert.equal(x.d.unlocked(x.c,id,x.profile,60),true);
 }
});
test("save validation preserves valid form state and rejects corrupt pools and quest progress",()=>{
 const x=setup();x.unlock("cat");x.d.shift(x.s,x.c,x.profile,60,"cat");const validate=x.context.window.soaSaveRules;
 const loaded=validate.validateOfflineSave(x.s);assert.equal(loaded.druid.form,"cat");assert.equal(loaded.druid.pools.mana,80);assert.equal(validate.validateCampaignSave(x.c).druidQuests.cat.state,"claimed");
 const bad=structuredClone(x.s);bad.druid.pools.energy=999;assert.throws(()=>validate.validateOfflineSave(bad));const badQuest=structuredClone(x.c);badQuest.druidQuests.cat.step=0;assert.throws(()=>validate.validateCampaignSave(badQuest));
});
test("Skyborne variants preserve mechanics and normal characters retain their own form names",()=>{
 const x=setup();assert.equal(x.d.name("cat",x.profile),"Cat");x.profile.race="Skyborne";assert.equal(x.d.name("cat",x.profile),"Windstalker Raptor");assert.equal(x.d.FORMS.cat.resource,"energy");x.profile.className="Rogue";assert.equal(x.d.unlocked(x.c,"caster",x.profile,60),false);
});

test("named shifts recognize Skyborne names, ordinary form names and explicit IDs",()=>{
 const x=setup();assert.equal(x.d.shiftFrom({text:"Transform into Great Ironfeather Guardian Form"}),"dire_bear");assert.equal(x.d.shiftFrom({text:"Shapeshift into Cat Form"}),"cat");assert.equal(x.d.shiftFrom({ability:"shift_bear"}),"bear");assert.equal(x.d.shiftFrom({text:"Inspect a bear's tracks"}),null);
});
