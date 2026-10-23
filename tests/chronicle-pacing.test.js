"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const src=fs.readFileSync(path.join(__dirname,"../public/chronicle.js"),"utf8");
function setup(turn=0){
 const element=tag=>({tag,children:[],dataset:{},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items},setAttribute(){},remove(){this.removed=true}});
 const ctx={window:{addEventListener(){},soaCharacters:{profile:()=>({id:"hero",name:"Hero"})},soaSaveRules:{isIntegrityBlocked:()=>false},confirm:()=>true},document:{addEventListener(){},getElementById:()=>null,createElement:element}};
 vm.createContext(ctx);vm.runInContext(src,ctx);let saved=true,saves=0;ctx.window.soaChronicleSetSave(()=>{saves++;return saved;});
 const c={turn,scene:{title:"At the Shrine",location:"Starbreeze Cleft"},enemies:[],chronicle:{act:1,actTitle:"Roots of Corruption",chapter:1,chapterTitle:"The Grove",startedAtTurn:0,quests:[{id:"shrine",title:"Cleanse the Shrine",status:"active",objectives:[{id:"cleanse",label:"Find the source",done:false}]}],archives:[],primaryQuest:{title:"Cleanse the Shrine",objective:"Find the source"}},hp:74,money:500};
 const api=ctx.window.soaChronicle;api.attach(c);
 const next=(data={})=>{c.turn++;c.scene={title:"A New Response",location:c.scene.location,...data};api.receive(c,c.scene);};
 const walk=node=>[node,...node.children.flatMap(walk)];
 return {ctx,c,api,next,walk,fail:()=>{saved=false;},saves:()=>saves};
}
const discovery=()=>({journal:"The shrine's corruption originates beneath the old barrow.",storyBeat:{startScene:true,focus:"Explore the old barrow",reason:"The source has been identified; the journey turns underground."},chapterMilestone:{propose:true,kind:"chapter",title:"Beneath the Roots",reason:"A major discovery opens the next stage.",basis:"discovery",evidence:"The shrine's corruption originates beneath the old barrow.",nextObjective:"Explore the old barrow"}});
test("an existing 201-turn save keeps its history, quests, money and health without invented chapters",()=>{
 const x=setup(201),before=JSON.stringify(x.c.chronicle.quests),p=x.api.progress(x.c);
 assert.equal(p.turn,201);assert.equal(p.scene,1);assert.equal(p.chapter,1);assert.equal(x.c.chronicle.archives.length,0);assert.equal(x.c.hp,74);assert.equal(x.c.money,500);assert.equal(JSON.stringify(x.c.chronicle.quests),before);
 assert.equal(x.api.context(x.c).pacing.reviewDue,true);assert.equal(x.api.progress(x.c).sceneTitle,"At the Shrine");
});
test("successive attacks stay in one scene even when narration titles and combat locations vary",()=>{
 const x=setup();x.c.enemies=[{name:"Satyr",hp:100}];x.c.chronicle.pacing.inCombat=true;
 for(let round=1;round<=6;round++)x.next({title:"Strike "+round,location:"Shrine, altar "+round,storyBeat:{startScene:true,focus:"Attack "+round,reason:"An attack lands."}});
 assert.equal(x.api.progress(x.c).scene,1);assert.equal(x.api.progress(x.c).sceneTitle,"At the Shrine");assert.equal(x.c.chronicle.chapter,1);
});
test("travel starts a new local scene and processing the same response twice is harmless",()=>{
 const x=setup();x.next({title:"Below the Barrow",location:"The Barrow"});assert.equal(x.api.progress(x.c).scene,2);assert.equal(x.api.progress(x.c).sceneTitle,"Below the Barrow");
 const saved=JSON.stringify(x.c.chronicle);x.api.receive(x.c,x.c.scene);assert.equal(JSON.stringify(x.c.chronicle),saved);
});
test("new verified quest completion opens a chapter with recap and resets its local scene count",()=>{
 const x=setup(20),q=x.c.chronicle.quests[0];q.status="completed";q.objectives[0].done=true;x.next();
 assert.equal(x.c.chronicle.chapter,2);assert.equal(x.api.progress(x.c).scene,1);assert.equal(x.c.chronicle.archives.length,1);assert.match(x.c.chronicle.banner.reason,/Completed: Cleanse the Shrine/);assert.equal(q.status,"completed");
 x.next();assert.equal(x.c.chronicle.chapter,2);assert.equal(x.c.chronicle.archives.length,1);
});
test("already completed quests on reload are baseline history, not new milestones",()=>{
 const x=setup(201);x.c.chronicle.quests[0].status="completed";delete x.c.chronicle.pacing;x.api.attach(x.c);x.next();assert.equal(x.c.chronicle.chapter,1);
});
test("a completion during combat waits until the encounter is over",()=>{
 const x=setup(12);x.c.enemies=[{name:"Satyr",hp:40}];x.c.chronicle.quests[0].status="completed";x.next();assert.equal(x.c.chronicle.chapter,1);assert.equal(x.c.chronicle.pacing.queuedCompletions.length,1);
 x.c.enemies=[];x.next();assert.equal(x.c.chronicle.chapter,2);assert.equal(x.c.chronicle.pacing.queuedCompletions.length,0);
});
test("class quest completion is a tracked milestone while a narration claim cannot finish it",()=>{
 const x=setup(12);x.c.druidQuests={bear:{state:"active"}};x.next({chapterMilestone:{propose:true,kind:"chapter",title:"Bear Training Complete",reason:"Training is done.",basis:"quest",evidence:"druid:bear"}});assert.equal(x.c.chronicle.chapter,1);assert.equal(x.c.druidQuests.bear.state,"active");
 x.c.druidQuests.bear={state:"claimed",receipt:"druid-form:bear"};x.next();assert.equal(x.c.chronicle.chapter,2);
});
test("a significant current discovery changes chapter without completing or replacing the pinned quest",()=>{
 const x=setup(20),pinned=JSON.stringify(x.c.chronicle.primaryQuest);x.next(discovery());assert.equal(x.c.chronicle.chapter,2);assert.equal(x.c.chronicle.chapterTitle,"Beneath the Roots");assert.equal(x.c.chronicle.quests[0].status,"active");assert.equal(JSON.stringify(x.c.chronicle.primaryQuest),pinned);
 for(let i=0;i<8;i++)x.next(discovery());assert.equal(x.c.chronicle.chapter,2,"the same discovery cannot repeatedly open chapters");
});
test("minor, stale, unanchored and mid-combat discoveries cannot automatically advance chapters",()=>{
 for(const mode of ["early","stale","repeated journal","no goal","no boundary","combat"]){const x=setup(mode==="early"?0:20),data=discovery();if(mode==="stale")data.journal="";if(mode==="repeated journal")x.c.journal=[data.journal];if(mode==="no goal")data.chapterMilestone.nextObjective="Find the source";if(mode==="no boundary")data.storyBeat.startScene=false;if(mode==="combat")x.c.enemies=[{name:"Satyr",hp:40}];x.next(data);assert.equal(x.c.chronicle.chapter,1,mode);}
});
test("periodic pacing reviews never force chapter advancement",()=>{
 const x=setup();for(let i=0;i<12;i++)x.next();assert.equal(x.api.context(x.c).pacing.reviewDue,true);x.next();assert.equal(x.api.context(x.c).pacing.reviewDue,false);
 for(let i=0;i<90;i++)x.next();assert.equal(x.c.chronicle.chapter,1);assert.equal(x.c.chronicle.pacing.scene,1);
});
test("Act changes are directly reviewable in Adventure and only occur after confirmation",()=>{
 const x=setup(30);x.next({chapterMilestone:{propose:true,kind:"act",title:"Beyond Teldrassil",chapterTitle:"The Long Crossing",reason:"The central arc has ended."}});assert.equal(x.c.chronicle.act,1);assert.equal(x.c.chronicle.pendingMilestone.kind,"act");
 const proposal=x.api.banner(x.c),button=x.walk(proposal).find(n=>n.textContent==="Begin act");assert.ok(button);button.onclick();assert.equal(x.c.chronicle.act,2);assert.equal(x.c.chronicle.chapter,1);assert.equal(x.c.chronicle.chapterTitle,"The Long Crossing");assert.equal(x.c.chronicle.archives.length,1);assert.equal(x.c.chronicle.quests[0].status,"active");
});
test("failed chapter persistence and failed Act confirmation restore the prior progression",()=>{
 const x=setup(20);const before=JSON.stringify(x.c.chronicle);x.fail();x.next(discovery());assert.equal(JSON.stringify(x.c.chronicle),before);
 const y=setup(30);y.next({chapterMilestone:{propose:true,kind:"act",title:"The Crossing",reason:"The arc concludes."}});const saved=JSON.stringify(y.c.chronicle);y.fail();y.walk(y.api.banner(y.c)).find(n=>n.textContent==="Begin act").onclick();assert.equal(JSON.stringify(y.c.chronicle),saved);
});
test("saving and reloading preserves local scene counts and milestone receipts",()=>{
 const x=setup(20);x.next(discovery());x.next({title:"The Barrow Door",location:"Old Barrow"});const restored=JSON.parse(JSON.stringify(x.c));x.api.attach(restored);assert.equal(x.api.progress(restored).scene,2);assert.equal(x.api.progress(restored).chapter,2);restored.turn++;x.api.receive(restored,discovery());assert.equal(restored.chronicle.chapter,2);
});
test("the story API carries pacing context and returns bounded scene and chapter metadata",async()=>{
 const {onRequestPost}=await import("../functions/api/campaign.js"),previous=global.fetch,x=setup(201),data=discovery();let sent;
 global.fetch=async(_url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({title:"Below the Barrow",location:"Starbreeze Cleft",story:"You prepare to follow the newly uncovered lead.",choices:[{text:"Follow the trail",type:"move",difficulty:"easy"},{text:"Inspect the entrance",type:"investigate",difficulty:"easy"}],enemies:[],allies:[],...data})}]}}]}),{status:200});};
 try{
  const response=await onRequestPost({request:new Request("https://game.example/api/campaign",{method:"POST",headers:{"Content-Type":"application/json","X-Story-Access":"test-code"},body:JSON.stringify({context:{turn:201,location:"Starbreeze Cleft",chronicle:x.api.context(x.c)}})}),env:{GEMINI_API_KEY:"test-key",AI_ACCESS_CODE:"test-code"}});
  assert.equal(response.status,200);const result=await response.json(),context=JSON.parse(sent.contents[0].parts[0].text);assert.equal(context.chronicle.pacing.reviewDue,true);assert.equal(context.chronicle.pacing.scene,1);assert.equal(result.storyBeat.startScene,true);assert.equal(result.chapterMilestone.basis,"discovery");assert.equal(result.chapterMilestone.evidence,result.journal);assert.match(sent.systemInstruction.parts[0].text,/Never start a new chapter mid-combat/);assert.match(sent.systemInstruction.parts[0].text,/never invent retrospective chapters/);
 }finally{global.fetch=previous;}
});
