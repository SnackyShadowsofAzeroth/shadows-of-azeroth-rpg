(()=>{
"use strict";
const VERSION=2,MAX_TURNS=10,MIN_CHAPTER_TURNS=4,MAX_HISTORY=100;
const STATS=["str","sta","dex","agi","int","wis","cha"];
const DIFFICULTY_DC=Object.freeze({easy:11,standard:13,hard:15});
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
 return {version:VERSION,characterId:String(profile?.id||""),status:"idle",seed:randomSeed(),chapter:1,chapterTitle:"",turn:0,locationId:regions().some(x=>x.id===start)?start:"night-harbor",objective:"",summary:"",scene:null,history:[],chapters:[],threads:[],pending:null,lastCombatSignature:"",updatedAt:new Date().toISOString()};
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
 return value===null||object(value)&&Number.isInteger(value.turn)&&value.turn===campaign.turn+1&&value.turn>=1&&value.turn<=MAX_TURNS&&Number.isInteger(value.roll)&&value.roll>=1&&value.roll<=20&&object(value.action)&&typeof value.action.text==="string"&&value.action.text.length>=8&&value.action.text.length<=180&&STATS.includes(value.action.stat)&&Object.prototype.hasOwnProperty.call(DIFFICULTY_DC,value.action.difficulty);
}
function validCampaign(value,profile){
 if(!object(value)||value.version!==VERSION||value.characterId!==String(profile?.id||"")||!["idle","active","chapter-complete"].includes(value.status)||typeof value.seed!=="string"||value.seed.length<1||value.seed.length>64||!Number.isInteger(value.chapter)||value.chapter<1||value.chapter>1000||typeof value.chapterTitle!=="string"||value.chapterTitle.length>90||!Number.isInteger(value.turn)||value.turn<0||value.turn>MAX_TURNS||!regions().some(x=>x.id===value.locationId)||typeof value.objective!=="string"||value.objective.length>200||typeof value.summary!=="string"||value.summary.length>600||!Array.isArray(value.history)||value.history.length>MAX_HISTORY||!value.history.every(validHistoryRow)||!Array.isArray(value.chapters)||value.chapters.length>40||!value.chapters.every(validChapter)||!Array.isArray(value.threads)||value.threads.length>6||value.threads.some(item=>typeof item!=="string"||item.length>150)||typeof value.lastCombatSignature!=="string"||value.lastCombatSignature.length>2000||!validPending(value.pending,value)||!((value.status==="idle"&&value.scene===null&&value.pending===null)||(value.status!=="idle"&&validScene(value.scene,value.status,value.locationId))))return false;
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
  const next={...original,version:VERSION,status:"active",seed:randomSeed(),chapter,chapterTitle:scene.title,turn:0,locationId:region.id,objective:scene.objective,summary:clean(data.summary,600),scene,chapters:archived,threads:Array.isArray(data.threads)?data.threads.map(x=>clean(x,150)).filter(Boolean).slice(0,6):carriedThreads,pending:null,lastCombatSignature:payload.combatSignature||original.lastCombatSignature,updatedAt:new Date().toISOString()};
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
 if(!code){status.textContent="Enter the AI access code configured in Cloudflare first.";return}
 if(campaign.pending){status.textContent="Your previous action is already saved. Retry that same roll before choosing again.";return}
 if(!region||campaign.locationId!==region.id){status.textContent="Open a fresh chapter at your current location first.";return}
 const roll=Math.floor(Math.random()*20)+1,pending={turn:campaign.turn+1,action:{text:clean(choice.text,180),stat:choice.stat,difficulty:choice.difficulty},roll};
 if(pending.turn>MAX_TURNS){status.textContent="This chapter is ready to conclude. Continue the chronicle to start the next one.";return}
 setCode(code);
 const next={...campaign,pending,updatedAt:new Date().toISOString()};
 if(!commitCampaign(save,next,onChange,{render:false,message:"Your action and d20 roll are saved before the story continues."})){status.textContent="Your action could not be saved; no roll was spent.";return}
 status.textContent="Your d20 result is saved. The Story Director is writing what follows.";
 resolvePending(profile,save,panel,status,onChange,code);
}
function render(profile,save,onChange){
 const panel=element("section",undefined,"soa-mnm-adventure-panel soa-mnm-ai-chronicle");panel.setAttribute("aria-label","M&M generated campaign");
 panel.append(element("div","AÊTHORIL · YOUR CAMPAIGN","soa-mnm-kicker"),element("h2","A living story in Aêthoril"));
 const region=currentRegion(save),campaign=save.aiCampaign;
 const connection=element("details",undefined,"soa-mnm-ai-connection");connection.open=campaign.status==="idle"||!getCode();
 connection.append(element("summary","AI connection and story rules"));
 connection.append(element("p","Your choices and d20 results are saved before the Story Director responds. Completed chapters, open leads, recent decisions, your character's current resources, and learned official abilities guide each new scene. The AI writes story only; it cannot change character stats, health, Focus, level, XP, abilities, currency, inventory, or combat results."));
 const label=element("label","AI access code (not an API key)","soa-mnm-system-label");label.htmlFor="soa-mnm-ai-code";
 const codeInput=element("input",undefined,"soa-mnm-system-input");codeInput.id="soa-mnm-ai-code";codeInput.type="password";codeInput.autocomplete="off";codeInput.placeholder="Cloudflare AI_ACCESS_CODE";codeInput.value=getCode();label.append(codeInput);connection.append(label);
 const connectionStatus=element("p","Stored only for this browser tab. Each generated scene uses the game's configured AI quota.","soa-mnm-live");connectionStatus.setAttribute("role","status");connectionStatus.setAttribute("aria-live","polite");connection.append(connectionStatus);
 const test=element("button","Test AI connection","soa-mnm-system-button");test.type="button";test.dataset.aiConnection="true";
 test.onclick=async()=>{const code=codeInput.value.trim();if(!code){connectionStatus.textContent="Enter the separate AI access code configured in Cloudflare.";return}setCode(code);test.disabled=true;connectionStatus.textContent="Checking the Story Director…";try{const result=await apiRequest(code,null);if(!panel.isConnected||!sameActiveCharacter(profile.id))return;connectionStatus.textContent=result.status||"AI connection ready."}catch(error){if(panel.isConnected)connectionStatus.textContent=error.message}finally{test.disabled=false}};
 connection.append(test);panel.append(connection);
 const status=element("p","", "soa-mnm-live");status.dataset.aiStatus="true";status.setAttribute("role","status");status.setAttribute("aria-live","polite");panel.append(status);
 if(!region){panel.append(element("p","No connected world region is available for this character."));return panel}
 if(campaign.status==="idle"){
  panel.append(element("p","Begin in "+region.name+(region.zone?", "+region.zone:"")+". The campaign is generated around this character's race, class, official learned abilities, and starting home. Story choices never spend or alter combat resources."));
  const start=element("button","Begin your campaign","soa-mnm-system-button soa-mnm-ai-primary");start.type="button";start.onclick=()=>startChapter(profile,save,panel,status,onChange,codeInput.value.trim()||getCode());panel.append(start);
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

