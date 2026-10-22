"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const test=require("node:test");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const chronicleSource=fs.readFileSync(path.join(root,"public","chronicle.js"),"utf8");
const apiSource=fs.readFileSync(path.join(root,"functions","api","campaign.js"),"utf8");
function makeChronicle(){
 const context={
  window:{soaSaveRules:{isIntegrityBlocked:()=>false},soaCharacters:{profile:()=>null},addEventListener(){}},
  document:{addEventListener(){},getElementById(){return null}}
 };
 vm.createContext(context);
 vm.runInContext(chronicleSource,context,{filename:"chronicle.js"});
 return {chronicle:context.window.soaChronicle,setSave:context.window.soaChronicleSetSave};
}

test("an existing active objective is promoted into the player-facing continuity anchor",()=>{
 const {chronicle}=makeChronicle();
 const save={turn:12,chronicle:{act:1,actTitle:"Crypt Descent",chapter:1,chapterTitle:"The Sealed Door",quests:[
  {id:"crypt",title:"Explore the crypt",status:"active",objectives:[
   {id:"crypt-1",label:"Search the lower chambers",done:false},
   {id:"crypt-2",label:"Identify the source of the disturbance",done:false}
  ]}
 ]}};
 const context=chronicle.context(save);
 assert.equal(context.primaryQuest.title,"Explore the crypt");
 assert.equal(context.primaryQuest.objective,"Search the lower chambers");
});

test("new campaigns do not receive a preset quest and hide the opening placeholder from AI context",()=>{
 const {chronicle}=makeChronicle();
 const save={turn:0};
 const context=chronicle.context(save);
 assert.equal(context.primaryQuest,null);
 assert.equal(context.activeQuests.length,0);
 assert.equal(save.chronicle.quests[0].title,"The First Adventure");
 assert.equal(save.chronicle.actTitle,"Azeroth Adventures");
});

test("an untouched legacy Stormwind seed is removed when the saved scene is elsewhere",()=>{
 const {chronicle,setSave}=makeChronicle();
 const save={turn:148,scene:{location:"Service Tunnel, Upper Gantry, Ice-Drill Site, Dun Morogh"},chronicle:{
  schema:1,act:2,actTitle:"Shadows Over Stormwind",chapter:1,chapterTitle:"The Threat in the Capital",startedAtTurn:0,
  archives:[{id:"hollow-raven-complete",act:1,actTitle:"The Hollow Raven Conspiracy",chapter:1,chapterTitle:"The Hollow Raven Investigation",summary:"The Hollow Raven investigation is completed and its findings await debriefing with SI:7.",completed:true}],
  quests:[
   {id:"hollow-raven",title:"Investigate Hollow Raven",status:"completed",objectives:[{id:"hollow-raven-0",label:"Solve the Hollow Raven operation",done:true}]},
   {id:"stormwind",title:"The Stormwind Threat",status:"active",objectives:[
    {id:"stormwind-0",label:"Return to Stormwind",done:false},
    {id:"stormwind-1",label:"Investigate the explosives threat",done:false},
    {id:"stormwind-2",label:"Defuse the threat",done:false}
   ]},
   {id:"si7-debrief",title:"Report to SI:7",status:"active",objectives:[{id:"si7-debrief-0",label:"Brief SI:7 on Hollow Raven and the Stormwind situation",done:false}]}
  ],
  primaryQuest:{title:"The Stormwind Threat",objective:"Return to Stormwind",updatedAtTurn:0},entries:[],pendingMilestone:null
 }};
 let saves=0;setSave(()=>{saves++;return true});
 const context=chronicle.context(save);
 assert.equal(context.primaryQuest,null);
 assert.equal(context.activeQuests.length,0);
 assert.equal(context.completedQuests.includes("Investigate Hollow Raven"),true);
 assert.equal(save.chronicle.actTitle,"A Continuing Adventure");
 assert.equal(save.chronicle.quests.some(quest=>quest.id==="stormwind"||quest.id==="si7-debrief"),false);
 assert.equal(saves,1);
});

test("the legacy seed migration preserves a player-edited quest focus",()=>{
 const {chronicle}=makeChronicle();
 const save={turn:40,scene:{location:"Dun Morogh"},chronicle:{
  act:2,actTitle:"Shadows Over Stormwind",chapter:1,chapterTitle:"The Threat in the Capital",
  archives:[{id:"hollow-raven-complete",completed:true}],
  quests:[
   {id:"hollow-raven",title:"Investigate Hollow Raven",status:"completed",objectives:[{id:"one",label:"Solve the Hollow Raven operation",done:true}]},
   {id:"stormwind",title:"The Stormwind Threat",status:"active",objectives:[{id:"one",label:"Return to Stormwind",done:false},{id:"two",label:"Investigate the explosives threat",done:false},{id:"three",label:"Defuse the threat",done:false}]},
   {id:"si7-debrief",title:"Report to SI:7",status:"active",objectives:[{id:"one",label:"Brief SI:7 on Hollow Raven and the Stormwind situation",done:false}]}
  ],
  primaryQuest:{title:"Explore the crypt",objective:"Search the lower chambers",updatedAtTurn:32},entries:[]
 }};
 const context=chronicle.context(save);
 assert.equal(context.primaryQuest.title,"Explore the crypt");
 assert.equal(context.primaryQuest.objective,"Search the lower chambers");
 assert.equal(save.chronicle.quests.some(quest=>quest.id==="stormwind"),true);
});

test("a player can pin and persist a specific quest and immediate objective",()=>{
 const {chronicle,setSave}=makeChronicle();
 const save={turn:17,chronicle:{quests:[]}};
 let saved=0;
 setSave(()=>{saved++;return true});
 assert.equal(chronicle.setPrimaryQuest(save,"Explore the crypt","Map the lower chambers and find the source of the disturbance"),true);
 assert.equal(chronicle.context(save).primaryQuest.title,"Explore the crypt");
 assert.equal(chronicle.context(save).primaryQuest.objective,"Map the lower chambers and find the source of the disturbance");
 assert.equal(save.chronicle.primaryQuest.updatedAtTurn,17);
 assert.equal(saved,1);
});

test("the story API sanitizes and prioritizes the pinned quest anchor",()=>{
 assert.match(apiSource,/primaryQuest:input\.chronicle\.primaryQuest/);
 assert.match(apiSource,/player's explicitly pinned current quest/);
 assert.match(apiSource,/Other active quests and new threats remain secondary/);
});
