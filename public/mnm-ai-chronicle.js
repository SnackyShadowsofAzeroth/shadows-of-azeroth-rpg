(()=>{
"use strict";
const VERSION=2,MAX_TURNS=10,MIN_CHAPTER_TURNS=4,MAX_HISTORY=100,LOCAL_TURNS=4;
const STATS=["str","sta","dex","agi","int","wis","cha"];
const DIFFICULTY_DC=Object.freeze({easy:11,standard:13,hard:15});
const LOCAL_ARCS=Object.freeze({
 "night-harbor":[
  {id:"salt-ledger",title:"The Salt Ledger",objective:"Discover why the east quay cargo account was altered before the next tide.",site:"the east quay tallyhouse",contact:"Mara, the night weighmaster",opening:"A cargo account has been changed after the harbor seal was set. The crew named in the book swears their load was counted correctly, and the next vessel is already tying up.",beats:["A smear of lampblack appears beside the altered entry; Mara recognizes the mark from a private tally used after the books close.","The mark leads to a warehouse where the cargo is present, but the person who signed for it is nowhere in sight.","The weighmaster, the accused crew, and the clerk are finally in one place. The argument is loud enough to draw the watch, and the tide is turning."],successEnding:"You establish who altered the record and keep the wrong crew from carrying the blame. Mara offers to put your name forward when the harbor needs a steady hand.",partialEnding:"You stop the innocent crew from being punished, but the person behind the alteration slips away before the watch arrives.",thread:"Who paid to alter the east quay cargo account?"},
  {id:"low-tide-lanterns",title:"Lanterns at Low Tide",objective:"Find who is signaling from the breakwater after the harbor bells go quiet.",site:"the western breakwater",contact:"Tovin, a ferry pilot on the late watch",opening:"A chain of hooded lanterns appears beyond the breakwater whenever the harbor bells fall silent. Tovin has seen it three nights running, but each time the watch arrives the lights are gone.",beats:["The lanterns are not answering one another; they are marking a safe path through water that should be too shallow for a boat.","A ferry hand admits someone has been asking which crews carry sealed cargo, then refuses to say who hired them.","The next low tide will expose the channel. Tovin is ready to guide a boat through it, while a shadow moves on the far rocks."],successEnding:"You uncover the hidden channel and bring its users into the open before the next crew can be drawn into the scheme.",partialEnding:"You keep the late-watch crews safe, but the lanterns go dark before their owner can be identified.",thread:"Who uses the hidden channel beyond the western breakwater?"}
 ],
 underdocks:[
  {id:"vacant-lift",title:"The Vacant Lift",objective:"Learn why the Underdocks lift keeps arriving empty at the upper platform.",site:"the lower lift landing",contact:"Hessa, a lift counter",opening:"The lift cage arrives at the lower landing with its chain warm and its lamps burning, but no one inside. Hessa has counted every trip; one passenger is missing from the tally and from the streets above.",beats:["Fresh grit on the cage floor matches the older passage, not the public shaft. Someone stepped out before the platform reached its stop.","A lift hand remembers a second bell beneath the machinery, answered from a sealed service walk.","The counterweight shudders as the lift starts another trip. Hessa hears a voice below and asks you to choose between stopping the cage or following the sound."],successEnding:"You find the hidden service walk and bring the missing rider back to the landing. The lift crew agrees to inspect every shaft before reopening the lower run.",partialEnding:"You stop the lift from taking another rider, but the missing passenger remains somewhere beyond the sealed service walk.",thread:"Where does the lower service walk lead, and who was using it?"},
  {id:"cistern-echo",title:"Voices in the Cistern",objective:"Find the source of voices heard beneath the Underdocks water stores.",site:"the old cistern gallery",contact:"Brel, a water carrier",opening:"Water carriers refuse to use one cistern after hearing a voice answer from below. The gallery is safe by the posted marks, yet the sound comes from behind an older wall that no current map explains.",beats:["The voice answers only when the water wheel slows; its rhythm matches a work call used by the old tunnel crews.","Brel's route notes show that fresh water has been diverted through a narrow side channel, and someone has been maintaining it.","The water level begins to rise against a blocked grate. The sound behind the wall is now close enough to understand, but the gallery is filling."],successEnding:"You open a safe drain and discover who was trapped beyond the old wall. The carriers can return to work while the passage is surveyed properly.",partialEnding:"You clear the rising water and keep the cistern usable, but the voice falls silent behind the sealed stone.",thread:"Who was calling from beyond the old cistern wall?"}
 ],
 penshaw:[
  {id:"fallen-bough",title:"The Fallen Bough",objective:"Settle a dispute over a storm-fallen bough before the path wardens close the woodland road.",site:"the rain-split woodland path",contact:"Eryn, a path warden",opening:"A storm has brought down a huge bough across a woodland road. Two groups claim the timber for different reasons, and the wardens will close the path unless someone learns what happened before the storm.",beats:["The cut marks are too clean for a storm break; the bough was weakened before the rain came.","A quiet trail leads to a sheltered glade where a traveler has been sleeping beside the road, afraid to return to either camp.","Both claimants arrive at the glade at once. The argument has shifted from ownership to fear that the road itself is no longer safe."],successEnding:"You establish how the bough fell and find a use for the timber that keeps the road open. Eryn asks you to help settle the next dispute before it grows.",partialEnding:"You keep the argument from becoming a fight and reopen a footpath, but the reason the bough was weakened remains uncertain.",thread:"Who weakened the fallen bough before the storm?"},
  {id:"fern-road",title:"The Fern Road",objective:"Find why travelers keep leaving the marked path through the fernwood.",site:"the fernwood boundary",contact:"Sael, a trail keeper",opening:"Travelers return from the fernwood by different paths and describe the same distant bell. Sael has found no bell on the map, but new footprints keep crossing the boundary stones after dusk.",beats:["The footprints are not wandering; they form a careful loop around ground where the ferns have been pressed flat.","A traveler admits following a voice that sounded like a companion who vanished years ago, then found their own tracks leading away.","The bell rings once from inside the loop. Sael wants the boundary closed, while a traveler steps toward the sound."],successEnding:"You mark a safe route and learn who has been drawing travelers off the road. Sael leaves the boundary open under a proper watch.",partialEnding:"You guide the travelers back to the road, but the bell still rings beyond the boundary stones.",thread:"What is calling travelers away from the fern road?"}
 ],
 faelindral:[
  {id:"branchlight",title:"A Light Between Branches",objective:"Learn why a wandering branchlight keeps drawing night travelers from the city walkways.",site:"the eastern canopy walk",contact:"Ilan, a bridge tender",opening:"A pale branchlight has appeared beyond the eastern canopy walk. It never holds still, and two night travelers have followed it into unfinished boughways before the bridge tenders could reach them.",beats:["The light pauses wherever a handrail is broken, as though it is showing the places the city builders left unfinished.","A tender recognizes the path of an old maintenance line, but its far end was sealed after a fall years ago.","The light gathers at the sealed landing while a strong wind moves through the upper branches. The bridge tender will not let anyone cross without a plan."],successEnding:"You secure the unfinished walk and learn why the branchlight kept returning to it. The bridge tenders can repair the route before another traveler is lost.",partialEnding:"You bring the night travelers home and close the unsafe walk, but the branchlight still appears beyond the sealed landing.",thread:"Why does the branchlight return to the sealed landing?"},
  {id:"rootway-market",title:"The Rootway Measure",objective:"Find who is diverting goods from a market route beneath the city boughs.",site:"the rootway market steps",contact:"Veya, a basket merchant",opening:"Several small traders arrive with empty baskets after taking the rootway under the western boughs. No one has seen a robber, yet each load is lighter at the same turn in the passage.",beats:["The lost goods were never taken from the baskets; their weight was recorded twice at one of the old measuring stones.","A young porter is copying the false marks under orders and has been promised that no one will blame them.","The traders and the porter meet at the measure stone. The true weight is easy to show, but the person giving the orders has noticed your inquiry."],successEnding:"You expose the false measure and make the route safe for the small traders again. Veya helps settle the account openly.",partialEnding:"You restore some of the missing goods and clear the porter of blame, but the person behind the false measure escapes.",thread:"Who ordered the rootway measure altered?"}
 ],
 "ail-vorith":[
  {id:"silent-runner",title:"The Silent Runner",objective:"Find the missing courier whose message never reached the lower council walk.",site:"the lower council approach",contact:"Darel, a passage guide",opening:"A courier left before the last watch and never reached the lower council walk. Darel knows the usual route by heart, but the marks on the stone show someone turned away from the public passage.",beats:["The turned mark was made deliberately, then partly scraped away. The courier expected to be followed.","A passage guide recognizes the scrape as a warning used by crews who find a route unsafe, not as a sign of an ambush.","A second warning appears beyond the old arch. The courier's lamp is visible ahead, and the stone around it has begun to shift."],successEnding:"You reach the courier and guide them back through a stable passage. Their message can be delivered without exposing the route they were protecting.",partialEnding:"You find the courier's lamp and clear a safe way out, but the courier has moved deeper before you can reach them.",thread:"What danger forced the courier off the council approach?"},
  {id:"old-door",title:"The Door That Answers",objective:"Learn why a sealed stone door has started answering knocks from inside.",site:"the abandoned eastern gallery",contact:"Serrit, a quiet stone tender",opening:"A sealed stone door has begun answering when the night crews pass the eastern gallery. The sound is measured, never frantic. Serrit says the door has stood untouched for generations, but fresh dust lies on its inner seam.",beats:["The knocks repeat an old shift pattern. Someone on the other side knows when the passage crews change.","Serrit finds a second seam beneath the stonework, too narrow for a person but wide enough for air and sound.","The answering knocks stop. A faint scrape comes from the other side, and the night crew is waiting for you to decide whether to open, seal, or call for help."],successEnding:"You discover who has been signaling and keep the gallery from becoming a danger to the night crews. Serrit marks the passage for a careful inspection.",partialEnding:"You reinforce the door and keep the crew safe, but the voice on the other side does not answer again.",thread:"Who has been signaling from beyond the eastern gallery?"}
 ]
});
function validLocalState(value){
 const ids=Object.values(LOCAL_ARCS).flat().map(arc=>arc.id);
 return object(value)&&typeof value.arcId==="string"&&(value.arcId==="continuation"||ids.includes(value.arcId))&&Number.isInteger(value.progress)&&value.progress>=0&&value.progress<=LOCAL_TURNS&&Number.isInteger(value.successes)&&value.successes>=0&&value.successes<=LOCAL_TURNS&&Number.isInteger(value.setbacks)&&value.setbacks>=0&&value.setbacks<=LOCAL_TURNS&&value.progress===value.successes+value.setbacks;
}
const STAT_NAMES={str:"Strength",sta:"Stamina",dex:"Dexterity",agi:"Agility",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};
const STORAGE_KEY="soa-mnm-ai-access-code";
const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const clean=(value,max=1800)=>String(value??"").replace(/[<>]/g,"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
const regions=()=>window.soaMnmAdventure?.regions||[];

function randomSeed(){
 try{const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);return Array.from(bytes,x=>x.toString(36)).join("-")}
 catch{return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,12)}
}
function createCampaign(profile){
 const start=profile?.startingLocation||window.soaMnmRules?.startLocationForRace?.(profile?.raceId)||"night-harbor";
 return {version:VERSION,characterId:String(profile?.id||""),mode:"ai",status:"idle",seed:randomSeed(),chapter:1,chapterTitle:"",turn:0,locationId:regions().some(x=>x.id===start)?start:"night-harbor",objective:"",summary:"",scene:null,history:[],chapters:[],threads:[],pending:null,lastCombatSignature:"",updatedAt:new Date().toISOString()};
}
function validScene(value,status,locationId){
 if(!object(value)||typeof value.title!=="string"||value.title.trim().length<3||value.title.length>90||typeof value.narration!=="string"||value.narration.trim().length<80||value.narration.length>1800||typeof value.objective!=="string"||value.objective.length>200||value.locationId!==locationId||!Array.isArray(value.choices)||value.choices.length>(status==="active"?3:0))return false;
 if(status==="active"&&value.choices.length!==3||status==="chapter-complete"&&value.choices.length!==0)return false;
 return value.choices.every((choice,index)=>object(choice)&&choice.id==="choice-"+(index+1)&&typeof choice.text==="string"&&choice.text.trim().length>=8&&choice.text.length<=150&&STATS.includes(choice.stat)&&Object.prototype.hasOwnProperty.call(DIFFICULTY_DC,choice.difficulty)&&choice.dc===DIFFICULTY_DC[choice.difficulty]);
}
function validHistoryRow(row){
 return object(row)&&Number.isInteger(row.chapter)&&row.chapter>=1&&row.chapter<=1000&&typeof row.title==="string"&&row.title.length<=90&&typeof row.action==="string"&&row.action.length<=180&&typeof row.result==="string"&&row.result.length<=180&&typeof row.summary==="string"&&row.summary.length<=300;
}
function validChapter(row){
 return object(row)&&Number.isInteger(row.chapter)&&row.chapter>=1&&row.chapter<=1000&&["complete","paused"].includes(row.status)&&typeof row.title==="string"&&row.title.length<=90&&typeof row.locationId==="string"&&regions().some(region=>region.id===row.locationId)&&typeof row.summary==="string"&&row.summary.length<=500&&Array.isArray(row.decisions)&&row.decisions.length<=10&&row.decisions.every(item=>typeof item==="string"&&item.length<=280);
}
function validPending(value,campaign){
 const maxTurn=campaign.mode==="local"?LOCAL_TURNS:MAX_TURNS;
 return value===null||object(value)&&Number.isInteger(value.turn)&&value.turn===campaign.turn+1&&value.turn>=1&&value.turn<=maxTurn&&Number.isInteger(value.roll)&&value.roll>=1&&value.roll<=20&&object(value.action)&&typeof value.action.text==="string"&&value.action.text.length>=8&&value.action.text.length<=180&&STATS.includes(value.action.stat)&&Object.prototype.hasOwnProperty.call(DIFFICULTY_DC,value.action.difficulty);
}
function validCampaign(value,profile){
 if(!object(value)||value.version!==VERSION||value.characterId!==String(profile?.id||"")||!["idle","active","chapter-complete"].includes(value.status)||typeof value.seed!=="string"||value.seed.length<1||value.seed.length>64||!Number.isInteger(value.chapter)||value.chapter<1||value.chapter>1000||typeof value.chapterTitle!=="string"||value.chapterTitle.length>90||!Number.isInteger(value.turn)||value.turn<0||value.turn>MAX_TURNS||!regions().some(x=>x.id===value.locationId)||typeof value.objective!=="string"||value.objective.length>200||typeof value.summary!=="string"||value.summary.length>600||!Array.isArray(value.history)||value.history.length>MAX_HISTORY||!value.history.every(validHistoryRow)||!Array.isArray(value.chapters)||value.chapters.length>40||!value.chapters.every(validChapter)||!Array.isArray(value.threads)||value.threads.length>6||value.threads.some(item=>typeof item!=="string"||item.length>150)||typeof value.lastCombatSignature!=="string"||value.lastCombatSignature.length>2000||!validPending(value.pending,value)||!((value.status==="idle"&&value.scene===null&&value.pending===null)||(value.status!=="idle"&&validScene(value.scene,value.status,value.locationId))))return false;
 const mode=value.mode||"ai";
 if(!["ai","local"].includes(mode))return false;
 if(mode==="local"&&(!validLocalState(value.localState)||value.turn>LOCAL_TURNS))return false;
 if(mode==="ai"&&value.localState!==undefined&&value.localState!==null)return false;
 return true;
}
function migrateCampaign(value,profile){
 if(value===null||value===undefined)return null;
 if(value.version===VERSION)return validCampaign(value,profile)?value:null;
 if(!object(value)||value.version!==1||value.characterId!==String(profile?.id||"")||!["idle","active","chapter-complete"].includes(value.status)||typeof value.seed!=="string"||!Number.isInteger(value.chapter)||value.chapter<1||!Number.isInteger(value.turn)||value.turn<0||value.turn>8||!regions().some(x=>x.id===value.locationId)||!Array.isArray(value.history))return null;
 const history=value.history.filter(validHistoryRow).slice(-MAX_HISTORY);
 const migrated={...value,version:VERSION,chapterTitle:clean(value.chapterTitle||value.scene?.title||"A continuing story",90),chapters:[],threads:[],pending:null,lastCombatSignature:"",history,updatedAt:new Date().toISOString()};
 return validCampaign(migrated,profile)?migrated:null;
}
function resolveChoice(choice,scores,roll){
 const die=Math.trunc(Number(roll)),score=Number(scores?.[choice?.stat]);
 if(!STATS.includes(choice?.stat)||!Object.prototype.hasOwnProperty.call(DIFFICULTY_DC,choice?.difficulty)||!Number.isInteger(die)||die<1||die>20||!Number.isFinite(score))throw new Error("Invalid custom story check.");
 const modifier=Math.floor((score-10)/2),dc=DIFFICULTY_DC[choice.difficulty],total=die+modifier;
 return {roll:die,stat:choice.stat,modifier,total,dc,success:die===20||die!==1&&total>=dc,critical:die===20};
}
function localArcFor(campaign,region){
 const local=campaign.localState||{};
 if(local.arcId==="continuation"){
  const objective=clean(campaign.objective||"Follow the unresolved lead",200);
  return {id:"continuation",title:campaign.chapterTitle||"A Continuing Lead",objective,site:"the streets and workrooms of "+region.name,contact:"a local witness who knows the ground",opening:"Your current lead remains open, and the people closest to it are waiting to see what you do next.",beats:["Your choice changes who is willing to speak, and a practical detail from the last scene points toward the next step.","A second account contradicts the first, but both point toward the same place. The situation will not wait for perfect certainty.","The people involved are close enough to hear one another. Your next move will decide whether the matter is settled openly or left for another day."],successEnding:"You turn the lead into a clear outcome and leave the people involved with a safer way forward.",partialEnding:"You contain the immediate trouble, but one important question remains unanswered.",thread:"Unresolved lead: "+objective};
 }
 for(const arc of Object.values(LOCAL_ARCS).flat())if(arc.id===local.arcId)return arc;
 return selectLocalArc(region.id,campaign.seed,campaign.chapter,"");
}
function seedIndex(seed,length){
 let hash=2166136261;
 for(const char of String(seed||""))hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return (hash>>>0)%length;
}
function selectLocalArc(regionId,seed,chapter,excludeId){
 const pool=LOCAL_ARCS[regionId]||LOCAL_ARCS["night-harbor"];
 let index=seedIndex(String(seed)+":"+chapter,pool.length);
 if(pool.length>1&&pool[index].id===excludeId)index=(index+1)%pool.length;
 return pool[index];
}
function localChoices(arc,beat){
 const sets=[
  [
   ["Inspect "+arc.site+" for signs of a changed account or hidden route.","int","standard"],
   ["Ask "+arc.contact+" what the official story leaves out.","cha","easy"],
   ["Scout the nearby passage before the next watch changes.","agi","hard"]
  ],
  [
   ["Compare the witness accounts against the detail you found.","wis","standard"],
   ["Invite someone overlooked to speak with you privately.","cha","standard"],
   ["Follow the less-traveled route around "+arc.site+".","agi","hard"]
  ],
  [
   ["Present the evidence and ask for a direct explanation.","int","hard"],
   ["Bring the people involved together before rumor spreads.","cha","standard"],
   ["Put yourself between the vulnerable and the danger.","str","hard"]
  ],
  [
   ["Settle the matter through a careful public account.","cha","standard"],
   ["Take the dangerous route and secure the truth firsthand.","agi","hard"],
   ["Stand firm and demand that the immediate threat end.","str","hard"]
  ]
 ];
 return sets[Math.min(3,beat)].map((row,index)=>({id:"choice-"+(index+1),text:row[0],stat:row[1],difficulty:row[2],dc:DIFFICULTY_DC[row[2]]}));
}
function localScene(campaign,region,arc,progress,lastOutcome){
 const stages=["The first trace","A new complication","The final approach"];
 const narration=progress===0
  ?"In "+region.name+", the matter begins at "+arc.site+". "+arc.opening+" You have one chance to choose how to approach it before the next watch changes."
  :(lastOutcome.success?"Your approach succeeds. ":"Your approach falters, costing time, but it reveals another way forward. ")+lastOutcome.summary+" "+arc.beats[progress-1]+" The people involved are waiting for your next move.";
 return {title:progress===0?arc.title:arc.title+" · "+stages[progress-1],narration:clean(narration,1800),objective:campaign.objective||arc.objective,locationId:region.id,choices:localChoices(arc,progress)};
}
function localEnding(campaign,region,arc,state){
 const solved=state.successes>=2,summary=solved?arc.successEnding:arc.partialEnding;
 const narration=solved
  ?"The pressure lifts from "+region.name+". "+summary+" The people you helped will remember how you handled the matter."
  :"The immediate danger passes in "+region.name+", though the full truth remains out of reach. "+summary+" The unresolved lead is recorded in your journal.";
 return {summary:clean(summary,500),scene:{title:campaign.chapterTitle+" · Outcome",narration:clean(narration,1800),objective:solved?"The immediate objective is resolved.":"The immediate danger is contained; an open lead remains.",locationId:region.id,choices:[]},thread:arc.thread,solved};
}
function startLocalChapter(profile,save,panel,status,onChange){
 const original=save.aiCampaign,region=currentRegion(save);
 if(!region){status.textContent="Choose a known region before beginning a local chapter.";return}
 if(original.pending){status.textContent="Resolve the saved action first, or continue it locally with the same roll.";return}
 if(original.status==="active"&&original.locationId===region.id){status.textContent="Finish the current chapter before starting another.";return}
 const leftActive=original.status==="active"&&original.locationId!==region.id;
 const chapter=original.status==="chapter-complete"||leftActive?original.chapter+1:original.chapter;
 const archived=leftActive?[...original.chapters,chapterRecord(original,"paused","This lead remains open: "+original.objective+" "+original.summary,original.history)].slice(-40):original.chapters;
 const threads=leftActive?["Unresolved lead: "+clean(original.objective,100),...original.threads].slice(0,6):original.threads;
 const arc=selectLocalArc(region.id,randomSeed(),chapter,original.localState?.arcId||"");
 const localState={arcId:arc.id,progress:0,successes:0,setbacks:0};
 const next={...original,mode:"local",localState,version:VERSION,status:"active",seed:randomSeed(),chapterTitle:arc.title,chapter,turn:0,locationId:region.id,objective:arc.objective,summary:arc.opening,scene:null,chapters:archived,threads,pending:null,lastCombatSignature:original.lastCombatSignature,updatedAt:new Date().toISOString()};
 next.scene=localScene(next,region,arc,0,null);
 if(!commitCampaign(save,next,onChange,{render:true,message:"A local campaign begins in "+region.name+". Your choices and d20 rolls are saved on this device."}))status.textContent="The local campaign could not be saved; your previous story is intact.";
}
function continueLocally(profile,save,panel,status,onChange){
 const original=save.aiCampaign,region=currentRegion(save);
 if(!region||original.locationId!==region.id){status.textContent="Return to the scene's region before continuing locally.";return}
 if(original.mode==="local"){status.textContent="This campaign already resolves locally.";return}
 const next={...original,mode:"local",localState:{arcId:"continuation",progress:0,successes:0,setbacks:0},turn:0,pending:null,updatedAt:new Date().toISOString()};
 if(original.pending)next.pending={...original.pending,turn:1};
 if(!commitCampaign(save,next,onChange,{render:!next.pending,message:"Local play is ready. Existing story choices and saved history remain in place."})){status.textContent="Local play could not be saved; the prior campaign remains intact.";return}
 if(next.pending)resolveLocalPending(profile,save,panel,status,onChange);
}
function localOutcomeSummary(resolution){
 return clean(resolution.success?"The check succeeds, shifting the local situation in your favor.":"The check fails. It costs time, but exposes another way forward.",300);
}
function resolveLocalPending(profile,save,panel,status,onChange){
 const campaign=save.aiCampaign,pending=campaign.pending,region=currentRegion(save);
 if(!pending||campaign.mode!=="local"){status.textContent="There is no saved local action waiting to resolve.";return}
 if(!region||campaign.locationId!==region.id){status.textContent="Return to the scene's region before resolving this saved action.";return}
 const resolution=resolveChoice(pending.action,profile.stats,pending.roll),arc=localArcFor(campaign,region),progress=campaign.localState.progress+1;
 const outcomeSummary=localOutcomeSummary(resolution),entry=historyEntry(campaign,campaign.scene,pending.action,{summary:outcomeSummary},resolution),history=[...campaign.history,entry].slice(-MAX_HISTORY);
 const localState={...campaign.localState,progress,successes:campaign.localState.successes+(resolution.success?1:0),setbacks:campaign.localState.setbacks+(resolution.success?0:1)};
 let statusValue="active",summary=outcomeSummary,scene,chapters=campaign.chapters,threads=campaign.threads;
 if(progress>=LOCAL_TURNS){
  const ending=localEnding(campaign,region,arc,localState);
  summary=ending.summary;scene=ending.scene;statusValue="chapter-complete";
  chapters=[...chapters,chapterRecord({...campaign,chapterTitle:campaign.chapterTitle||scene.title},"complete",summary,history)].slice(-40);
  threads=ending.solved?threads:[ending.thread,...threads].slice(0,6);
 }else scene=localScene(campaign,region,arc,progress,{success:resolution.success,summary:outcomeSummary});
 const next={...campaign,mode:"local",localState,status:statusValue,turn:pending.turn,summary,scene,history,chapters,threads,pending:null,updatedAt:new Date().toISOString()};
 const previousJournal=save.journal,previousUpdatedAt=save.updatedAt;
 save.journal=[...save.journal,"Local campaign · Chapter "+campaign.chapter+", scene "+pending.turn+": "+entry.action+" — "+entry.result+" — "+entry.summary].slice(-100);
 save.updatedAt=new Date().toISOString();
 const rollText="d20 "+resolution.roll+(resolution.modifier>=0?" + ":" - ")+Math.abs(resolution.modifier)+" = "+resolution.total+" vs DC "+resolution.dc+" · "+(resolution.success?"success":"failure");
 if(!commitCampaign(save,next,onChange,{render:true,message:rollText+" — "+outcomeSummary})){
  save.journal=previousJournal;save.updatedAt=previousUpdatedAt;status.textContent="The local turn could not be saved. Your exact die roll remains available.";
 }
}

function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node}
function getCode(){try{return sessionStorage.getItem(STORAGE_KEY)||""}catch{return ""}}
function setCode(value){try{sessionStorage.setItem(STORAGE_KEY,value)}catch{}}
function currentRegion(save){return regions().find(x=>x.id===save.currentLocation)||regions().find(x=>x.id==="night-harbor")}
function sameActiveCharacter(id){return String(window.soaCharacters?.profile?.()?.id||"")===String(id)}
async function apiRequest(code,payload){
 const response=await fetch("/api/mnm-chronicle",{method:payload?"POST":"GET",cache:"no-store",headers:{"X-Story-Access":code,...(payload?{"Content-Type":"application/json"}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
 const data=await response.json().catch(()=>({error:"Unexpected response from the Story Director."}));
 if(!response.ok)throw new Error(data.error||"Story Director returned "+response.status+".");
 return data;
}
function sceneFromResponse(data,locationId){
 const scene={title:clean(data.title,90),narration:clean(data.narration,1800),objective:clean(data.objective,200),locationId,choices:Array.isArray(data.choices)?data.choices.map((choice,index)=>({id:"choice-"+(index+1),text:clean(choice.text,150),stat:choice.stat,difficulty:choice.difficulty,dc:Number(choice.dc)})):[]};
 if(!validScene(scene,data.chapterComplete?"chapter-complete":"active",locationId))throw new Error("The Story Director returned an incomplete scene. Your saved action and roll are unchanged.");
 return scene;
}
function contextCharacter(profile,lastCombatSignature=""){
 const loaded=window.soaMnmSystems?.read?.(profile),system=loaded?.ok?loaded.save:null,rpg=system?.rpg;
 const learned=new Set([...(system?.learnedAbilities||[]),...(system?.memorizedAbilities||[]).filter(Boolean)]);
 const abilities=system?.abilityBook?Object.values(system.abilityBook).flat().filter(record=>record?.source==="official"&&record.classId===profile.classId&&learned.has(record.id)).map(record=>clean(record.name,100)).slice(0,16):[];
 const log=Array.isArray(rpg?.log)?rpg.log.slice(0,30):[],startIndex=log.findIndex(line=>String(line).startsWith("Encounter started:")),resultIndex=startIndex>=0?log.slice(0,startIndex).findIndex(line=>/^(?:Victory over |Defeated by |You were defeated\.|You escape from )/.test(String(line))):-1;
 const recentCombat=resultIndex>=0?log.slice(resultIndex,startIndex+1).reverse().slice(-10).map(line=>clean(line,220)):[];
 const combatSignature=recentCombat.length?String(system?.rpg?.encounterSerial||0)+":"+recentCombat.join(" | ").slice(0,1700):lastCombatSignature;
 return {character:{id:String(profile.id),name:clean(profile.name,36),raceId:profile.raceId,classId:profile.classId,level:Number(system?.level||profile.level)||1,stats:Object.fromEntries(STATS.map(key=>[key,Math.trunc(Number(profile.stats?.[key])||10)])),health:rpg?{current:Number(rpg.hp)||0,max:Number(rpg.maxHp)||0}:null,focus:rpg?{current:Number(rpg.focus)||0,max:Number(rpg.maxFocus)||0}:null,knownAbilities:abilities},recentCombat:combatSignature&&combatSignature!==lastCombatSignature?recentCombat:[],combatSignature:combatSignature||lastCombatSignature};
}
function historyEntry(campaign,scene,action,result,roll){
 const check="d20 "+roll.roll+(roll.modifier>=0?" + ":" - ")+Math.abs(roll.modifier)+" = "+roll.total+" vs DC "+roll.dc+" · "+(roll.success?"success":"failure");
 return {chapter:campaign.chapter,title:scene.title,action:clean(action.text,180),result:check,summary:clean(result.summary,300)};
}
function makePayload(kind,profile,campaign,regionId,chapter,turn,extra={}){
 const chapters=campaign.chapters.slice(-8).map(row=>({chapter:row.chapter,status:row.status,title:row.title,locationId:row.locationId,summary:row.summary,decisions:row.decisions.slice(-5)})),characterState=contextCharacter(profile,campaign.lastCombatSignature);
 return {kind,character:characterState.character,recentCombat:characterState.recentCombat,combatSignature:characterState.combatSignature,regionId,chapter,turn,seed:campaign.seed,objective:campaign.objective,previousSummary:campaign.summary,chapters,threads:campaign.threads,history:campaign.history.slice(-12),...extra};
}
function chapterRecord(campaign,status,summary,history){
 const decisions=history.filter(row=>row.chapter===campaign.chapter).slice(-10).map(row=>clean(row.action+" — "+row.result+" — "+row.summary,280));
 return {chapter:campaign.chapter,status,title:campaign.chapterTitle||campaign.scene?.title||"Untitled chapter",locationId:campaign.locationId,summary:clean(summary,500),decisions};
}
function setBusy(panel,busy,message){
 const status=panel.querySelector("[data-ai-status]");if(status&&message)status.textContent=message;
 panel.setAttribute("aria-busy",String(busy));panel.querySelectorAll("button,textarea,select").forEach(control=>{if(control.dataset.aiConnection!=="true")control.disabled=busy});
}
function commitCampaign(save,next,onChange,options={}){
 const previous=save.aiCampaign;save.aiCampaign=next;
 if(onChange?.(options)!==false)return true;
 save.aiCampaign=previous;return false;
}
async function startChapter(profile,save,panel,status,onChange,code){
 if(!code){status.textContent="Enter the AI access code configured in Cloudflare first.";return}
 if(save.aiCampaign.pending){status.textContent="Resolve or retry your saved action before starting another chapter.";return}
 setCode(code);
 const original=save.aiCampaign,region=currentRegion(save);
 if(!region){status.textContent="Choose a known starting region before beginning.";return}
 const leftActiveChapter=original.status==="active"&&original.locationId!==region.id;
 const chapter=original.status==="chapter-complete"||leftActiveChapter?original.chapter+1:original.chapter;
 const archived=leftActiveChapter?[...original.chapters,chapterRecord(original,"paused","This lead remains unresolved: "+original.objective+" "+original.summary,original.history)].slice(-40):original.chapters;
 const carriedThreads=leftActiveChapter?["Unresolved lead: "+clean(original.objective,100),...original.threads].slice(0,6):original.threads;
 const payloadCampaign={...original,chapters:archived,threads:carriedThreads};
 const prior=leftActiveChapter?"Unresolved objective: "+original.objective+". Last known progress: "+original.summary:original.summary;
 setBusy(panel,true,"The Story Director is shaping the next part of your campaign…");
 try{
  const payload=makePayload("opening",profile,payloadCampaign,region.id,chapter,0,{previousSummary:prior}),data=await apiRequest(code,payload);
  if(!sameActiveCharacter(profile.id))return;
  const scene=sceneFromResponse(data,region.id);
  const next={...original,version:VERSION,mode:"ai",status:"active",seed:randomSeed(),chapter,chapterTitle:scene.title,turn:0,locationId:region.id,objective:scene.objective,summary:clean(data.summary,600),scene,chapters:archived,threads:Array.isArray(data.threads)?data.threads.map(x=>clean(x,150)).filter(Boolean).slice(0,6):carriedThreads,pending:null,lastCombatSignature:payload.combatSignature||original.lastCombatSignature,updatedAt:new Date().toISOString()};
  delete next.localState;
  if(!commitCampaign(save,next,onChange,{render:true,message:"A new chapter is saved to this character's campaign."})){status.textContent="The AI chapter could not be saved. Your previous story is intact.";return}
 }catch(error){
  if(panel.isConnected)status.textContent=error.message;
 }finally{if(panel.isConnected)setBusy(panel,false)}
}
async function resolvePending(profile,save,panel,status,onChange,code){
 const campaign=save.aiCampaign,pending=campaign.pending,region=currentRegion(save);
 if(!pending){status.textContent="There is no saved action waiting to resolve.";return}
 if(!code){status.textContent="Enter the AI access code configured in Cloudflare to retry this same roll.";return}
 if(!region||campaign.locationId!==region.id){status.textContent="Return to the scene's region before resolving this saved action.";return}
 setCode(code);
 const resolution=resolveChoice(pending.action,profile.stats,pending.roll);
 setBusy(panel,true,"Your saved d20 result is locked. The Story Director is continuing from it…");
 try{
  const payload=makePayload("turn",profile,campaign,region.id,campaign.chapter,pending.turn,{scene:{title:campaign.scene.title,narration:campaign.scene.narration,objective:campaign.scene.objective},action:pending.action,roll:pending.roll}),data=await apiRequest(code,payload);
  if(!sameActiveCharacter(profile.id))return;
  const scene=sceneFromResponse(data,region.id),entry=historyEntry(campaign,campaign.scene,pending.action,data,resolution),complete=data.chapterComplete===true;
  const history=[...campaign.history,entry].slice(-MAX_HISTORY),chapters=complete?[...campaign.chapters,chapterRecord({...campaign,chapterTitle:campaign.chapterTitle||campaign.scene.title},"complete",data.summary,history)].slice(-40):campaign.chapters;
  const next={...campaign,status:complete?"chapter-complete":"active",turn:pending.turn,locationId:region.id,objective:scene.objective,summary:clean(data.summary,600),scene,history,chapters,threads:Array.isArray(data.threads)?data.threads.map(x=>clean(x,150)).filter(Boolean).slice(0,6):campaign.threads,pending:null,lastCombatSignature:payload.combatSignature||campaign.lastCombatSignature,updatedAt:new Date().toISOString()};
  const previousJournal=save.journal,previousUpdatedAt=save.updatedAt;
  save.journal=[...save.journal,"AI Chronicle · Chapter "+campaign.chapter+", turn "+pending.turn+": "+entry.action+" — "+entry.result+" — "+entry.summary].slice(-100);
  save.updatedAt=new Date().toISOString();
  if(!commitCampaign(save,next,onChange,{render:true,message:(resolution.success?"Your approach succeeds. ":"The check fails, and the story carries that setback forward. ")+"The result is saved in the Journey Log."})){
   save.journal=previousJournal;save.updatedAt=previousUpdatedAt;status.textContent="The AI turn could not be saved. Your exact die roll remains available to retry.";return;
  }
 }catch(error){
  if(panel.isConnected){setBusy(panel,false);status.textContent="Your exact d20 roll is saved. "+error.message+" Retry when ready."}
  onChange?.({render:true,message:"Your exact d20 roll is saved. "+error.message+" Retry the same action when ready."});
 }finally{if(panel.isConnected)setBusy(panel,false)}
}
function chooseAction(profile,save,panel,status,onChange,code,choice){
 const campaign=save.aiCampaign,region=currentRegion(save);
 if(campaign.pending){status.textContent="Your previous action is already saved. Resolve that same roll before choosing again.";return}
 if(!region||campaign.locationId!==region.id){status.textContent="Open a fresh chapter at your current location first.";return}
 if(campaign.mode==="local"){
  const roll=Math.floor(Math.random()*20)+1,pending={turn:campaign.turn+1,action:{text:clean(choice.text,180),stat:choice.stat,difficulty:choice.difficulty},roll};
  if(pending.turn>LOCAL_TURNS){status.textContent="This local chapter is ready to conclude. Continue the campaign for another generated adventure.";return}
  if(!commitCampaign(save,{...campaign,pending,updatedAt:new Date().toISOString()},onChange,{render:false,message:"Your choice and exact d20 roll are saved locally."})){status.textContent="Your action could not be saved; no roll was spent.";return}
  resolveLocalPending(profile,save,panel,status,onChange);return;
 }
 if(!code){status.textContent="Enter the AI access code in Story rules, or continue this scene locally.";return}
 const roll=Math.floor(Math.random()*20)+1,pending={turn:campaign.turn+1,action:{text:clean(choice.text,180),stat:choice.stat,difficulty:choice.difficulty},roll};
 if(pending.turn>MAX_TURNS){status.textContent="This chapter is ready to conclude. Continue the chronicle to start the next one.";return}
 setCode(code);
 const next={...campaign,pending,updatedAt:new Date().toISOString()};
 if(!commitCampaign(save,next,onChange,{render:false,message:"Your action and d20 roll are saved before the story continues."})){status.textContent="Your action could not be saved; no roll was spent.";return}
 status.textContent="Your d20 result is saved. The Story Director is writing what follows.";
 resolvePending(profile,save,panel,status,onChange,code);
}
function render(profile,save,onChange){
 const panel=element("section",undefined,"soa-mnm-adventure-panel soa-mnm-ai-chronicle");panel.setAttribute("aria-label","M&M Adventure campaign");
 const region=currentRegion(save),campaign=save.aiCampaign,isLocal=campaign.mode==="local",code=getCode();
 panel.append(element("div",isLocal?"LOCAL CAMPAIGN · SAVED ON THIS DEVICE":"AÊTHORIL · AI CHRONICLE","soa-mnm-kicker"),element("h2",isLocal?"A local campaign in Aêthoril":"A living story in Aêthoril"));
 const connection=element("details",undefined,"soa-mnm-ai-connection");connection.open=campaign.status==="idle"||!isLocal&&!code;
 connection.append(element("summary","AI connection and story rules"));
 connection.append(element("p","AI-written scenes need the separate Cloudflare access code and a working internet connection. A local campaign works on this device without either. Both modes save choices and custom d20 checks; story text cannot change Health, Focus, levels, XP, abilities, items, currency, or combat results."));
 const label=element("label","AI access code (not an API key)","soa-mnm-system-label");label.htmlFor="soa-mnm-ai-code";
 const codeInput=element("input",undefined,"soa-mnm-system-input");codeInput.id="soa-mnm-ai-code";codeInput.type="password";codeInput.autocomplete="off";codeInput.placeholder="Cloudflare AI_ACCESS_CODE";codeInput.value=getCode();label.append(codeInput);connection.append(label);
 const connectionStatus=element("p","The access code stays in this browser tab. Local campaigns do not use it or consume AI quota.","soa-mnm-live");connectionStatus.setAttribute("role","status");connectionStatus.setAttribute("aria-live","polite");connection.append(connectionStatus);
 const test=element("button","Test AI connection","soa-mnm-system-button");test.type="button";test.dataset.aiConnection="true";
 test.onclick=async()=>{const code=codeInput.value.trim();if(!code){connectionStatus.textContent="Enter the separate AI access code configured in Cloudflare.";return}setCode(code);test.disabled=true;connectionStatus.textContent="Checking the Story Director…";try{const result=await apiRequest(code,null);if(!panel.isConnected||!sameActiveCharacter(profile.id))return;connectionStatus.textContent=result.status||"AI connection ready."}catch(error){if(panel.isConnected)connectionStatus.textContent=error.message}finally{test.disabled=false}};
 connection.append(test);panel.append(connection);
 const status=element("p","", "soa-mnm-live");status.dataset.aiStatus="true";status.setAttribute("role","status");status.setAttribute("aria-live","polite");panel.append(status);
 if(!region){panel.append(element("p","No connected world region is available for this character."));return panel}
 if(campaign.status==="idle"){
  panel.append(element("p","Begin in "+region.name+(region.zone?", "+region.zone:"")+". Choose AI-written scenes if you have the access code, or start a saved local adventure immediately. Your race, class, and starting home shape the setting; custom d20 checks decide how each lead changes."));
  const aiStart=element("button","Begin an AI-generated campaign","soa-mnm-system-button");aiStart.type="button";aiStart.onclick=()=>startChapter(profile,save,panel,status,onChange,codeInput.value.trim()||getCode());
  const localStart=element("button","Start a local campaign now","soa-mnm-system-button soa-mnm-ai-primary");localStart.type="button";localStart.onclick=()=>startLocalChapter(profile,save,panel,status,onChange);
  if(code){panel.append(aiStart,localStart)}else{panel.append(localStart,aiStart)}
  panel.append(element("p","Local chapters are selected from original regional story arcs. Each has four d20 decisions, success and setback branches, an ending, and an optional custom XP claim; local play does not need an AI service.","soa-mnm-note"));
  return panel;
 }
 const migrated=migrateCampaign(campaign,profile);
 if(!migrated||!validCampaign(campaign,profile)){panel.append(element("p","Campaign data did not pass its save check and was preserved. No story state was reset."));return panel}
 const currentMatches=campaign.locationId===region.id;
 panel.append(element("div","CHAPTER "+campaign.chapter+(campaign.turn?" · SCENE "+campaign.turn:""),"soa-mnm-kicker"),element("h3",campaign.chapterTitle||campaign.scene.title),element("p",campaign.scene.narration,"soa-mnm-ai-narrative"));
 if(campaign.objective)panel.append(element("p","Current aim · "+campaign.objective,"soa-mnm-feature-status"));
 if(campaign.threads.length){const leads=element("details",undefined,"soa-mnm-ai-history");leads.append(element("summary","Open leads and unresolved threads"));const list=element("ul",undefined,"soa-mnm-journal");campaign.threads.forEach(thread=>list.append(element("li",thread)));leads.append(list);panel.append(leads)}
 if(!currentMatches&&campaign.pending){
  panel.append(element("p","Your action and exact die roll are saved with the scene at "+(regions().find(x=>x.id===campaign.locationId)?.name||"another location")+". Return there through the World tab before retrying; the roll cannot be changed."));
 }else if(!currentMatches){
  panel.append(element("p","This scene is saved at "+(regions().find(x=>x.id===campaign.locationId)?.name||"another location")+". Start a chapter here and the unresolved lead will carry into the campaign journal."));
  const move=element("button","Start a chapter in "+region.name,"soa-mnm-system-button soa-mnm-ai-primary");move.type="button";move.onclick=()=>startChapter(profile,save,panel,status,onChange,codeInput.value.trim()||getCode());panel.append(move);
 }else if(campaign.status==="chapter-complete"){
  panel.append(element("p","Chapter summary · "+campaign.summary,"soa-mnm-feature-status"));
  const rewardId="ai-chapter-"+campaign.chapter,systems=window.soaMnmSystems,systemSave=systems?.read?.(profile),rewardClaimed=!!(systemSave?.ok&&systemSave.save.rpg.claimedStories.includes(rewardId));
  if(rewardClaimed)panel.append(element("p","This chapter's optional custom XP reward has already been claimed."));
  else{
   const reward=element("button","Claim optional 90 custom XP","soa-mnm-system-button");reward.type="button";reward.onclick=()=>{const result=systems?.claimStoryReward?.(profile,rewardId,90);if(!result?.ok){status.textContent=result?.error||"The chapter reward could not be saved.";return}status.textContent="Claimed "+result.result.xp+" custom XP for this AI chapter.";onChange?.({render:true,message:status.textContent})};panel.append(reward);
  }
  panel.append(element("small","Chapter rewards and the leveling curve are original M&M: RPG rules. You can continue without claiming the reward.","soa-mnm-note"));
  const next=element("button","Continue the campaign","soa-mnm-system-button soa-mnm-ai-primary");next.type="button";next.onclick=()=>startChapter(profile,save,panel,status,onChange,codeInput.value.trim()||getCode());panel.append(next);
 }else if(campaign.pending){
  const outcome=resolveChoice(campaign.pending.action,profile.stats,campaign.pending.roll);
  panel.append(element("p","Saved choice · "+campaign.pending.action.text+" ("+STAT_NAMES[campaign.pending.action.stat]+" · DC "+outcome.dc+")","soa-mnm-feature-status"));
  panel.append(element("p","Locked roll · d20 "+outcome.roll+" + "+outcome.modifier+" = "+outcome.total+" vs DC "+outcome.dc+" · "+(outcome.success?"success":"failure")+"; retrying will use this same roll."));
  const retry=element("button","Retry this same roll","soa-mnm-system-button soa-mnm-ai-primary");retry.type="button";retry.onclick=()=>resolvePending(profile,save,panel,status,onChange,codeInput.value.trim()||getCode());panel.append(retry);
 }else{
  const grid=element("div",undefined,"soa-mnm-choice-grid");
  campaign.scene.choices.forEach(choice=>{const button=element("button",undefined,"soa-mnm-choice soa-mnm-ai-choice");button.type="button";button.append(element("strong",choice.text),element("span",STAT_NAMES[choice.stat]+" · "+choice.difficulty+" · DC "+choice.dc+" (custom story check)"));button.onclick=()=>chooseAction(profile,save,panel,status,onChange,codeInput.value.trim()||getCode(),choice);grid.append(button)});
  panel.append(grid);
  const form=element("form",undefined,"soa-mnm-ai-custom-action");
  form.append(element("h3","Try your own approach"),element("p","Describe a different action. Choose the stat and difficulty; this uses the same local d20 rules as the generated choices."));
  const actionLabel=element("label","Your action","soa-mnm-system-label"),actionInput=element("textarea",undefined,"soa-mnm-system-input");actionInput.maxLength=180;actionInput.required=true;actionInput.rows=3;actionInput.placeholder="What do you try?";actionLabel.append(actionInput);form.append(actionLabel);
  const controls=element("div",undefined,"soa-mnm-ai-action-controls"),statLabel=element("label","Stat","soa-mnm-system-label"),statSelect=element("select",undefined,"soa-mnm-system-input"),sorted=STATS.slice().sort((a,b)=>Number(profile.stats?.[b]||10)-Number(profile.stats?.[a]||10));
  sorted.forEach(stat=>{const option=element("option",STAT_NAMES[stat]);option.value=stat;statSelect.append(option)});statLabel.append(statSelect);
  const difficultyLabel=element("label","Difficulty","soa-mnm-system-label"),difficultySelect=element("select",undefined,"soa-mnm-system-input");
  [["easy","Easy · DC 11"],["standard","Standard · DC 13"],["hard","Hard · DC 15"]].forEach(([value,labelText])=>{const option=element("option",labelText);option.value=value;difficultySelect.append(option)});difficultyLabel.append(difficultySelect);controls.append(statLabel,difficultyLabel);form.append(controls);
  const submit=element("button","Resolve my action","soa-mnm-system-button");submit.type="submit";form.append(submit);
  form.addEventListener("submit",event=>{event.preventDefault();const text=clean(actionInput.value,180);if(text.length<8){status.textContent="Describe your action in at least eight characters.";return}chooseAction(profile,save,panel,status,onChange,codeInput.value.trim()||getCode(),{text,stat:statSelect.value,difficulty:difficultySelect.value})});
  panel.append(form);
 }
 const history=campaign.history.slice(-8);
 if(history.length){const details=element("details",undefined,"soa-mnm-ai-history");details.append(element("summary","Recent choices and rolls"));const list=element("ol",undefined,"soa-mnm-journal");history.forEach(row=>list.append(element("li","Ch. "+row.chapter+" · "+row.title+" — "+row.action+" ("+row.result+") · "+row.summary)));details.append(list);panel.append(details)}
 if(campaign.chapters.length){const details=element("details",undefined,"soa-mnm-ai-history");details.append(element("summary","Earlier chapters · "+campaign.chapters.length));const list=element("ol",undefined,"soa-mnm-journal");campaign.chapters.slice(-8).forEach(row=>list.append(element("li","Ch. "+row.chapter+" · "+row.title+" ["+row.status+"] — "+row.summary)));details.append(list);panel.append(details)}
 return panel;
}
window.soaMnmAiChronicle=Object.freeze({version:VERSION,maxTurns:MAX_TURNS,difficultyDC:DIFFICULTY_DC,createCampaign,validCampaign,validScene,migrateCampaign,resolveChoice,render});
})();

