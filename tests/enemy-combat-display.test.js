"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const vm=require("node:vm");
const root=path.join(__dirname,"..","public");
const rulesContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"combat-rules.js"),"utf8"),rulesContext,{filename:"combat-rules.js"});
const resourcesContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"resource-rules.js"),"utf8"),resourcesContext,{filename:"resource-rules.js"});
const rules=rulesContext.window.soaCombatRules,resources=resourcesContext.window.soaResources;
const campaign=fs.readFileSync(path.join(root,"campaign.js"),"utf8");
const chronicleCss=fs.readFileSync(path.join(root,"chronicle.css"),"utf8");

test("hostile cards show the same AC used by combat resolution",()=>{
 assert.equal(rules.statBlock({name:"Restless Ghoul"}).ac,13);
 assert.equal(rules.statBlock({name:"Forsaken Mage",armorClass:16}).ac,16);
 assert.ok(campaign.includes(`stats.textContent="Armor Class "+(block?.ac??"unknown")`));
});

test("recognizable classed enemies get the matching resource meter",()=>{
 const expected={Warrior:"Rage",Paladin:"Mana",Hunter:"Focus",Rogue:"Energy",Priest:"Mana",Mage:"Mana",Warlock:"Mana",Druid:"Mana",Shaman:"Mana"};
 for(const [className,label] of Object.entries(expected))assert.equal(resources.forClass(className).label,label);
 assert.equal(resources.forClass("Druid","cat").label,"Energy");
 assert.equal(resources.forClass("Druid","bear").label,"Rage");
 assert.match(campaign,/const nameClass=.*warrior.*paladin.*hunter.*rogue.*priest.*mage.*warlock.*druid.*shaman/);
 assert.match(campaign,/soa-foe-resource-rail/);
});

test("combat damage summary shows both HP values against the same maximum",()=>{
 assert.ok(campaign.includes('" damage to "+exchange.target+" · HP "+exchange.enemyBefore+"/"+exchange.enemyMax+" → "+exchange.enemyAfter+"/"+exchange.enemyMax+"."'));
});

test("allied combat health bars use the green ally fill",()=>{
 assert.ok(campaign.includes('className="soa-foe-fill soa-ally-fill"'));
 assert.ok(chronicleCss.includes("body.theme-alternative .soa-ally-fill{background:linear-gradient(90deg,#37845d,#74b581)}"));
});

test("generic hostile creatures receive AC without an invented class resource",()=>{
 assert.match(campaign,/const resource=enemyClass\?window\.soaResources/);
 assert.match(campaign,/resource&&Number\.isFinite\(enemy\.resource\)/);
});

function renderExchange(overrides={},className="Druid"){
 const exchange={round:1,ability:"druid_strike",form:"bear",hit:true,dealt:10,taken:0,target:"Corrupted Satyr",enemyBefore:50,enemyAfter:40,enemyMax:50,heroBefore:100,heroAfter:100,...overrides};
 const hero={className,race:className==="Shaman"?"Troll":"Night Elf",specialization:className==="Rogue"?"Combat":"Feral"};
 const ctx={window:{soaCharacters:{profile:()=>hero},soaCombatRules:{statBlock:()=>({ac:12})}},livingEnemies:()=>[{name:"Corrupted Satyr",hp:40,maxHp:50}],currentEncounterExchange:()=>exchange,selectedCombatTarget:null,busy:false,pending:()=>false,combatParty:()=>[]};
 const element=()=>({children:[],style:{},dataset:{},append(...children){this.children.push(...children)},setAttribute(){}});
 ctx.document={createElement:element};vm.createContext(ctx);
 for(const file of ["specializations.js","druid.js","class-abilities.js","racial-abilities.js"])vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),ctx);
 const helper=campaign.slice(campaign.indexOf("function combatExchangeDisplay("),campaign.indexOf("\nfunction currentEncounterExchange("));
 const draw=campaign.slice(campaign.indexOf("function drawEnemyStatus("),campaign.indexOf("\nfunction drawCombatActions("));
 vm.runInContext(helper+"\n"+draw+"\nglobalThis.show=drawEnemyStatus;globalThis.present=combatExchangeDisplay;",ctx);
 const box=element();ctx.show(box);const text=node=>[node.textContent||"",...node.children.map(text)].join(" ");
 return {text:text(box),exchange,presentation:ctx.present(exchange)};
}
const oldDruidStrike={target:"Corrupted Satyr",die:15,bonus:8,total:23,ac:12,hit:true,damage:10};
test("legacy Druid attacks show their actual ability and recover available strike HP details",()=>{
 const x=renderExchange({strikes:[oldDruidStrike]});assert.match(x.text,/Natural Strike · 1 attack · 10 total damage/);assert.match(x.text,/Attack 1: d20 15 \+ 8 = 23 vs AC 12/);assert.match(x.text,/50 → 40\/50 HP/);assert.doesNotMatch(x.text,/Killing Spree|undefined|NaN/);
});
test("Druid spells and area attacks are never relabeled as weapon-only Rogue abilities",()=>{
 for(const [id,label,strikes] of [["wrath","Wrath",[oldDruidStrike]],["maul","Maul",[oldDruidStrike]],["swipe","Swipe",[oldDruidStrike,{...oldDruidStrike,target:"Satyr Cultist"}]]]){const x=renderExchange({ability:id,strikes});assert.match(x.text,new RegExp(label+" · "));assert.doesNotMatch(x.text,/Killing Spree|weapon strike|undefined|NaN/);}
});
test("Killing Spree and Berserking retain their names and separate weapon rolls",()=>{
 for(const [id,name,cls] of [["spec_rogue_combat","Killing Spree","Rogue"],["berserking","Berserking","Shaman"]]){const x=renderExchange({ability:id,strikes:[{...oldDruidStrike,index:1,critical:true,criticalOn:19,before:50,after:40,maxHp:50},{...oldDruidStrike,index:2,before:40,after:30,maxHp:50}]},cls);assert.match(x.text,new RegExp(name+" · 2 weapon strikes"));assert.match(x.text,/Strike 1:.*Critical \(natural 19–20\)/);assert.match(x.text,/Strike 2:/);assert.doesNotMatch(x.text,/undefined|NaN/);}
});
test("heals, defensive effects and shifts with empty attack arrays show their own outcome",()=>{
 const heal=renderExchange({ability:"rejuvenation",strikes:[],hit:false,dealt:0,healed:15});assert.match(heal.text,/Rejuvenation · restored 15 HP/);assert.doesNotMatch(heal.text,/Killing Spree|0.*weapon strike|Miss ·/);
 const guard=renderExchange({ability:"demoralizing_roar",strikes:[],hit:false,dealt:0});assert.match(guard.text,/Used Demoralizing Roar/);assert.doesNotMatch(guard.text,/Killing Spree|Miss ·/);
 const shift=renderExchange({ability:"shift_bear",shapeshift:true,strikes:[],hit:false,dealt:0});assert.match(shift.text,/Shapeshifted into Bear/);assert.doesNotMatch(shift.text,/Killing Spree|Miss ·/);
});
test("periodic healing does not replace the primary damage result",()=>{
 const x=renderExchange({ability:"wrath",strikes:[oldDruidStrike],healed:15,details:["Rejuvenation restores 15 HP"]});assert.match(x.text,/Wrath · 1 attack · 10 total damage/);assert.match(x.text,/Healing received · 15 HP/);assert.match(x.text,/Rejuvenation restores 15 HP/);
});
test("old secondary-target rolls omit unavailable HP and default critical threshold to 20",()=>{
 const x=renderExchange({ability:"swipe",strikes:[oldDruidStrike,{...oldDruidStrike,target:"Satyr Cultist",critical:true}]});assert.match(x.text,/Attack 2:.*Critical \(natural 20\)/);assert.doesNotMatch(x.text,/undefined|NaN|null|20–20/);
});
test("recorded names remain accurate after a form or specialization changes",()=>{
 const x=renderExchange({ability:"custom_old_ability",abilityName:"Earlier Learned Spell",strikes:[oldDruidStrike]});assert.match(x.text,/Earlier Learned Spell · 1 attack/);assert.doesNotMatch(x.text,/Killing Spree/);
});

