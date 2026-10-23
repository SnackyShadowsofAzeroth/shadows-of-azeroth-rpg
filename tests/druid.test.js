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
 x.profile.specialization="Restoration";x.d.shift(x.s,x.c,x.profile,60,"tree");assert.ok(x.learned().every(a=>a.effect==="heal"));assert.equal(x.learned().find(a=>a.id==="rejuvenation").cost,35);
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
test("Druid area attacks record named abilities and complete per-target HP and roll data",()=>{
 const x=setup(16);x.unlock("bear");x.d.shift(x.s,x.c,x.profile,16,"bear");x.s.en=100;x.s.druid.pools.rage=100;x.foe();x.c.enemies.push({name:"Second Guard",hp:50,maxHp:50});
 const out=x.cast("swipe");assert.equal(out.event.abilityName,"Swipe");assert.equal(out.event.effect,"damage");assert.equal(out.event.strikes.length,2);
 out.event.strikes.forEach((strike,i)=>{assert.equal(strike.index,i+1);assert.equal(strike.criticalOn,20);assert.equal(strike.before-strike.damage,strike.after);assert.equal(strike.after,x.c.enemies[i].hp);assert.equal(strike.maxHp,x.c.enemies[i].maxHp);});
});
test("Bear Mangle costs 20 Rage and doubles Strength for damage, not accuracy",()=>{
 const x=setup(10);x.unlock("bear");x.d.shift(x.s,x.c,x.profile,10,"bear");x.foe();x.s.en=50;x.s.druid.pools.rage=50;
 const mangle=x.learned().find(a=>a.id==="spec_druid_feral"),calls=[];assert.equal(mangle.cost,20);assert.equal(mangle.stat,"STR");assert.equal(mangle.cooldown,2);
 x.rules.attack=(bonus,ac,options)=>{calls.push({bonus,options});return {die:15,total:15+bonus,bonus,hit:true,critical:false};};
 const before=x.c.enemies[0].hp,out=x.cast("spec_druid_feral");assert.equal(before-x.c.enemies[0].hp,4+7+2*x.actor.modifiers.STR);assert.equal(calls[0].bonus,x.actor.proficiency+x.actor.modifiers.STR);assert.equal(calls[0].options.criticalOn,20);assert.equal(x.s.en,40,"50 - 20 + 5 landed + 5 damage taken");assert.equal(out.event.abilityName,"Mangle");assert.equal(x.s.druid.combo.points,0);
});
test("Maul remains a cheaper repeatable Bear attack and Dire Bear adds its flat bonus once",()=>{
 const x=setup();x.unlock("bear");x.unlock("dire_bear");x.d.shift(x.s,x.c,x.profile,60,"dire_bear");x.foe();x.s.en=100;x.s.druid.pools.rage=100;
 x.context.window.soaEquipment.modifiers=()=>({damage:3});const before=x.c.enemies[0].hp;x.cast("spec_druid_feral");assert.equal(before-x.c.enemies[0].hp,4+7+2*x.actor.modifiers.STR+2+3);
 const maul=x.learned().find(a=>a.id==="maul");assert.equal(maul.cost,15);assert.equal(maul.cooldown,0);const hp=x.c.enemies[0].hp;assert.ok(!x.cast("maul").error);assert.equal(hp-x.c.enemies[0].hp,4+5+x.actor.modifiers.STR+2+3);
});
test("Cat Mangle costs 35 Energy, builds one target-bound combo point and caps at five",()=>{
 const x=setup(24);x.unlock("cat");x.d.shift(x.s,x.c,x.profile,24,"cat");x.foe();const m=x.learned().find(a=>a.id==="spec_druid_feral");assert.equal(m.cost,35);assert.equal(m.stat,"DEX");assert.equal(m.die,12);assert.equal(m.cooldown,1);assert.equal(m.criticalOn,19);
 const before=x.c.enemies[0].hp;x.cast(m.id);assert.equal(before-x.c.enemies[0].hp,4+7+x.actor.modifiers.DEX);assert.equal(x.s.en,85);assert.equal(x.s.druid.combo.points,1);assert.equal(x.s.druid.combo.target,x.c.enemies[0].name);
 x.s.time=x.s.druid.cooldowns[m.id];x.s.druid.combo.points=5;x.s.en=100;x.cast(m.id);assert.equal(x.s.druid.combo.points,5);
 x.s.time=x.s.druid.cooldowns[m.id];x.s.en=100;const other={name:"Second Guard",hp:500,maxHp:500};x.c.enemies.push(other);x.cast(m.id,other);assert.equal(x.s.druid.combo.target,other.name);assert.equal(x.s.druid.combo.points,1);
});
test("only Cat Mangle critically hits on natural 19; its critical doubles dice only",()=>{
 for(const form of ["bear","cat"]){const x=setup(20);x.unlock(form);x.d.shift(x.s,x.c,x.profile,20,form);x.foe();x.s.en=100;x.s.druid.pools[form==="bear"?"rage":"energy"]=100;
  const actual=x.context.window.soaCombatRules;x.rules.statBlock=()=>({ac:100,bonus:3,die:6,resist:[],vulnerable:[]});x.rules.attack=(bonus,ac,options)=>actual.attack(bonus,ac,{...options,rng:()=>.9});x.rules.damage=(die,flat,critical)=>actual.damage(die,flat,critical,()=>0);
  const before=x.c.enemies[0].hp,out=x.cast("spec_druid_feral");assert.equal(out.event.hit,form==="cat");assert.equal(out.event.strikes[0].critical,form==="cat");assert.equal(out.event.strikes[0].criticalOn,form==="cat"?19:20);assert.equal(before-x.c.enemies[0].hp,form==="cat"?2+7+x.actor.modifiers.DEX:0);assert.equal(x.s.druid.combo.points,form==="cat"?1:0);
 }
});
test("Mangle cooldowns require exactly two intervening Bear turns or one Cat turn",()=>{
 for(const form of ["bear","cat"]){const x=setup(20);x.unlock(form);x.d.shift(x.s,x.c,x.profile,20,form);x.foe();x.s.en=100;x.cast("spec_druid_feral");const wait=form==="bear"?2:1;
  const basic={id:"druid_strike",name:"Natural Strike",cost:0,effect:"damage",stat:form==="bear"?"STR":"DEX",die:6,flat:3};
  for(let i=0;i<wait;i++){const before=JSON.stringify(x.s);assert.match(x.cast("spec_druid_feral").error,/cooldown/);assert.equal(JSON.stringify(x.s),before);x.d.exchange(x.s,x.c,x.profile,20,{},basic,x.c.enemies[0],x.rules,x.actor);}
  x.s.en=100;assert.ok(!x.cast("spec_druid_feral").error);
 }
});
test("form variants do not mutate the signature or bypass learned-form and Feral requirements",()=>{
 const x=setup(20),signature=x.context.window.soaSpecializations.ability(x.profile,20);x.unlock("bear");x.unlock("cat");x.d.shift(x.s,x.c,x.profile,20,"cat");assert.equal(x.learned().find(a=>a.id===signature.id).cost,35);assert.equal(signature.cost,20);assert.equal(signature.damageStatMultiplier,2);
 x.d.shift(x.s,x.c,x.profile,20,"bear");assert.equal(x.learned().find(a=>a.id===signature.id).cost,20);x.profile.specialization="Balance";assert.ok(!x.learned().some(a=>a.id===signature.id));x.d.shift(x.s,x.c,x.profile,20,"caster");x.profile.specialization="Feral";assert.ok(!x.learned().some(a=>a.id===signature.id));
});
test("bleeds tick once per future exchange and cannot tick while viewing or retrying",()=>{
 const x=setup();x.unlock("cat");x.d.shift(x.s,x.c,x.profile,60,"cat");const target=x.foe();x.cast("rake");const after=target.hp;assert.equal(x.s.druid.dots.length,1);x.d.context();x.d.context();assert.equal(target.hp,after);
 const basic={id:"test_guard",name:"Wait",cost:0,effect:"guard",stat:"DEX",die:0,flat:0};
 for(let i=0;i<3;i++)x.d.exchange(x.s,x.c,x.profile,60,{},basic,target,x.rules,x.actor);
 assert.equal(target.hp,after-9);assert.equal(x.s.druid.dots.length,0);
});
test("Prowl openers, timed buffs and real cooldowns are enforced",()=>{
 const x=setup();x.unlock("cat");x.d.shift(x.s,x.c,x.profile,60,"cat");x.foe();assert.match(x.cast("pounce").error,/requires Prowl/);x.s.druid.prowl=true;assert.ok(!x.cast("pounce").error);assert.equal(x.s.druid.prowl,false);x.s.en=100;assert.match(x.cast("pounce").error,/requires Prowl|cooldown/);
 x.s.druid.prowl=true;assert.match(x.cast("pounce").error,/cooldown/);
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
test("leaving a form resolves its destination instead of the form being left",()=>{
 const x=setup();
 for(const text of ["Shift out of bear form into your natural Night Elf shape","Shift out of Bear Form","Leave Bear Form","Revert to your original form","Return to humanoid form","Change back to my natural shape","Return to Night Elf form","Cancel shapeshift","Shift back"]){assert.equal(x.d.shiftFrom({text}),"caster",text);}
 for(const [text,form] of [["Shift from Bear Form into Cat Form","cat"],["Shift out of Cat Form into Bear Form","bear"],["Transform from Bear Form to Dire Bear Form","dire_bear"],["Shift out of Windstalker Raptor into Great Ironfeather Guardian Form","dire_bear"]])assert.equal(x.d.shiftFrom({text}),form,text);
 assert.equal(x.d.shiftFrom({text:"Shift out of Bear Form",form:"cat"}),"cat","explicit destination remains authoritative");
 for(const text of ["Do not shift out of bear form","Inspect a bear's tracks","Return to camp after watching a bear","Leave the forest quietly","Return to the Druid trainer to discuss Bear Form","Return to Darnassus in Cat Form"]){assert.equal(x.d.shiftFrom({text}),null,text);}
});

test("form menu reveals only earned forms, their resources and eligible training",()=>{
 const x=setup(10);
 function element(tag){return {tag,children:[],dataset:{},style:{},attributes:{},textContent:"",append(...items){this.children.push(...items)},setAttribute(k,v){this.attributes[k]=v;}};}
 x.context.document.createElement=element;
 const walk=node=>[node,...node.children.flatMap(walk)],draw=level=>walk(x.d.panel(x.s,x.c,x.profile,level,()=>{}));
 let nodes=draw(1);
 assert.deepEqual(nodes.filter(n=>n.className==="soa-druid-pool").map(n=>n.dataset.resource),["health","mana"]);
 assert.ok(nodes.some(n=>n.textContent==="HEALTH · 80 / 100"));
 const health=nodes.find(n=>n.dataset.resource==="health");assert.equal(health.children[1].attributes["aria-valuenow"],"80");assert.equal(health.children[1].children[0].style.width,"80%");
 assert.equal(nodes.filter(n=>n.dataset.form).length,0);
 assert.ok(!nodes.some(n=>/Great Cat Spirit|Trial of the Sea Lion|Wings of the Wild/.test(n.textContent)));
 nodes=draw(10);assert.ok(nodes.some(n=>n.textContent.includes("Body and Heart")));assert.equal(nodes.filter(n=>n.dataset.form).length,0);
 // Accepting a quest must not reveal the locked form or its Rage bar.
 x.c.druidQuests={bear:{state:"active",step:0,proof:[]}};nodes=draw(10);
 assert.equal(nodes.filter(n=>n.dataset.form).length,0);assert.deepEqual(nodes.filter(n=>n.className==="soa-druid-pool").map(n=>n.dataset.resource),["health","mana"]);
 x.unlock("bear");nodes=draw(10);
 assert.deepEqual(nodes.filter(n=>n.dataset.form).map(n=>n.dataset.form),["caster","bear"]);
 assert.deepEqual(nodes.filter(n=>n.className==="soa-druid-pool").map(n=>n.dataset.resource),["health","mana","rage"]);
 assert.ok(!nodes.some(n=>n.textContent.includes("Quest locked")));
 assert.ok(!nodes.some(n=>/Windstalker|Frenzied Regeneration|Dire Bear/.test(n.textContent)));
 assert.ok(nodes.filter(n=>n.tag==="details").every(n=>n.className==="soa-collapsible-quests"));
 x.s.hp=37;nodes=draw(10);assert.ok(nodes.some(n=>n.textContent==="HEALTH · 37 / 100"));
 x.profile.race="Tauren";x.context.window.soaRacialAbilities={passives:()=>({maxHp:10})};nodes=draw(10);assert.ok(nodes.some(n=>n.textContent==="HEALTH · 37 / 110"));
});

test("Wrath can resolve an environmental root-knot choice without spawning an enemy",()=>{
 const x=setup(1),action={text:"Channel Wrath to blast the fragile root knot",type:"combat",difficulty:"easy"};
 x.c.scene.story="A fragile root knot obstructs the trail.";x.c.scene.choices=[action];
 const wrath=x.learned().find(a=>a.id==="wrath"),beforeHP=x.s.hp;
 assert.equal(x.d.environmentalTarget(action,x.c),"root knot");
 const out=x.d.castAtEnvironment(x.s,x.c,x.profile,1,action,wrath,x.rules,x.actor);
 assert.equal(out.success,true);assert.equal(out.dc,10);assert.equal(x.s.en,95);assert.equal(x.s.druid.pools.mana,95);assert.equal(x.s.time,1);assert.equal(x.c.combatRound,0);assert.equal(x.c.enemies.length,0);assert.equal(x.s.hp,beforeHP);assert.match(out.message,/No hostile was attacked or defeated/);
});
test("failed obstacle casts spend one action, never retaliate, and respect resource gates",()=>{
 const x=setup(1),action={text:"Use Wrath on the root knot",difficulty:"hard"};x.c.scene.story="A root knot blocks the way.";const wrath=x.learned().find(a=>a.id==="wrath");
 const out=x.d.castAtEnvironment(x.s,x.c,x.profile,1,action,wrath,{...x.rules,roll:()=>1},x.actor);assert.equal(out.success,false);assert.equal(x.s.en,95);assert.equal(x.s.hp,80);assert.match(out.message,/obstacle remains unresolved/);
 x.s.en=20;x.s.druid.pools.mana=20;const before=JSON.stringify(x.s);assert.match(x.d.castAtEnvironment(x.s,x.c,x.profile,1,action,wrath,x.rules,x.actor).error,/Not enough/);assert.equal(JSON.stringify(x.s),before);
});
test("environmental casting cannot invent scenery or defeat an untracked enemy",()=>{
 const x=setup(1),wrath=x.learned().find(a=>a.id==="wrath");x.c.scene.story="A wolf prowls the path.";
 const before=JSON.stringify(x.s);assert.ok(x.d.castAtEnvironment(x.s,x.c,x.profile,1,{text:"Cast Wrath on the wolf"},wrath,x.rules,x.actor).error);assert.ok(x.d.castAtEnvironment(x.s,x.c,x.profile,1,{text:"Cast Wrath on a root knot"},wrath,x.rules,x.actor).error);assert.equal(JSON.stringify(x.s),before);
 x.c.scene.story="A root knot blocks the path.";x.foe();assert.match(x.d.castAtEnvironment(x.s,x.c,x.profile,1,{text:"Cast Wrath on the root knot"},wrath,x.rules,x.actor).error,/combat target/);
});

test("Rejuvenation costs 35 Mana and heals exactly 15 per round for three rounds",()=>{
 const x=setup(1);x.s.hp=20;const a=x.learned().find(a=>a.id==="rejuvenation");
 assert.equal(a.cost,35);assert.equal(a.cooldown,3);assert.equal(a.periodicHeal.amount,15);assert.equal(a.periodicHeal.rounds,3);
 const outcome=x.d.healOutsideCombat(x.s,x.c,x.profile,a,x.rules,x.actor);
 assert.ok(!outcome.error);assert.equal(x.s.hp,35);assert.equal(x.s.en,90);assert.equal(x.s.time,1);assert.equal(x.s.druid.effects.rejuvenation.remaining,2);
 assert.equal(x.d.tickRejuvenation(x.s),null,"rendering/retrying at the same action time cannot heal twice");
 x.s.time++;assert.equal(x.d.tickRejuvenation(x.s).amount,15);assert.equal(x.s.hp,50);
 x.s.time++;assert.equal(x.d.tickRejuvenation(x.s).amount,15);assert.equal(x.s.hp,65);assert.equal(x.s.druid.effects.rejuvenation,undefined);
 x.s.time++;assert.equal(x.d.tickRejuvenation(x.s),null);assert.equal(x.s.hp,65);
});
test("Rejuvenation ticks after enemy damage and blocks exactly three following turns",()=>{
 const x=setup(1);x.s.hp=20;x.foe();let out=x.cast("rejuvenation");assert.equal(out.event.healed,15);assert.equal(x.s.hp,29);assert.equal(x.s.druid.cooldowns.rejuvenation,4);
 const guard={id:"wait",name:"Wait",effect:"guard",cost:0,stat:"WIS",die:0,flat:0};
 for(let i=0;i<3;i++){
  assert.ok(x.d.errorFor(x.learned().find(a=>a.id==="rejuvenation"),x.s,x.c,true));
  out=x.d.exchange(x.s,x.c,x.profile,1,{},guard,x.c.enemies[0],x.rules,x.actor);
  assert.equal(out.event.healed,i<2?15:0);
 }
 assert.equal(x.s.time,4);assert.equal(x.d.errorFor(x.learned().find(a=>a.id==="rejuvenation"),x.s,x.c,true),null);
});
test("Rejuvenation survives encounter boundaries, shapeshifting and save reload",()=>{
 const x=setup();x.s.hp=20;const a=x.learned().find(a=>a.id==="rejuvenation");x.d.healOutsideCombat(x.s,x.c,x.profile,a,x.rules,x.actor);
 const loaded=x.context.window.soaSaveRules.validateOfflineSave(x.s);assert.equal(loaded.druid.effects.rejuvenation.remaining,2);assert.equal(x.d.tickRejuvenation(loaded),null);
 x.d.resetEncounter(x.s);assert.equal(x.s.druid.effects.rejuvenation.remaining,2);x.unlock("cat");x.foe();const out=x.d.exchange(x.s,x.c,x.profile,60,{form:"cat"},null,x.c.enemies[0],x.rules,x.actor);assert.equal(out.event.healed,15);assert.equal(x.s.druid.effects.rejuvenation.remaining,1);assert.equal(x.s.druid.form,"cat");
});
test("Rejuvenation does not stack, bank overhealing or gain Tree bonuses",()=>{
 const x=setup();x.profile.specialization="Restoration";x.unlock("tree");x.d.shift(x.s,x.c,x.profile,60,"tree");x.s.hp=90;const a=x.learned().find(a=>a.id==="rejuvenation");assert.equal(a.cost,35);
 x.d.healOutsideCombat(x.s,x.c,x.profile,a,x.rules,x.actor);assert.equal(x.s.hp,100);assert.match(x.d.errorFor(a,x.s,x.c,false),/active/);
 x.s.time++;assert.equal(x.d.tickRejuvenation(x.s).amount,0);x.s.hp=70;x.s.time++;assert.equal(x.d.tickRejuvenation(x.s).amount,15);assert.equal(x.s.hp,85);
 x.s.time++;x.d.tickRejuvenation(x.s);assert.equal(x.s.hp,85);
});
test("healing availability exposes health, duration, cooldown and Mana reasons",()=>{
 const x=setup(1),a=x.learned().find(a=>a.id==="rejuvenation");x.s.hp=100;assert.match(x.d.errorFor(a,x.s,x.c,false),/Health is already full/);
 x.s.hp=30;x.s.en=20;assert.match(x.d.errorFor(a,x.s,x.c,false),/Not enough mana/);
 x.s.en=100;x.d.healOutsideCombat(x.s,x.c,x.profile,a,x.rules,x.actor);assert.match(x.d.errorFor(a,x.s,x.c,false),/2 healing rounds remaining/);
 x.s.time+=2;x.d.tickRejuvenation(x.s);x.s.time++;x.d.tickRejuvenation(x.s);x.s.druid.cooldowns.rejuvenation=x.s.time+2;assert.match(x.d.errorFor(a,x.s,x.c,false),/2 rounds remaining/);
 const bad=structuredClone(x.s);bad.druid.effects.rejuvenation={remaining:99,nextTime:1};assert.throws(()=>x.context.window.soaSaveRules.validateOfflineSave(bad));
});
