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

test("new campaigns do not treat the vague opening placeholder as a pinned quest",()=>{
 const chronicle=makeChronicle();
 const save={chronicle:{quests:[{id:"personal-quest",title:"The First Adventure",status:"active",objectives:[{id:"first",label:"Follow the opening lead",done:false}]}]}};
 assert.equal(chronicle.context(save).primaryQuest,null);
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
