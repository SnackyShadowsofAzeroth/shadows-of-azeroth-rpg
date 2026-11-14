(()=>{"use strict";
const VERSION=1,STATS=["str","sta","dex","agi","int","wis","cha"],DIFFICULTY_DC=Object.freeze({easy:11,standard:13,hard:15});
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
 return {version:VERSION,characterId:String(profile?.id||""),status:"idle",seed:randomSeed(),chapter:1,turn:0,locationId:regions().some(x=>x.id===start)?start:"night-harbor",objective:"",summary:"",scene:null,history:[],updatedAt:new Date().toISOString()};
}
function validScene(value,status,locationId){
 if(!object(value)||typeof value.title!=="string"||value.title.trim().length<3||value.title.length>90||typeof value.narration!=="string"||value.narration.trim().length<80||value.narration.length>1800||typeof value.objective!=="string"||value.objective.length>200||value.locationId!==locationId||!Array.isArray(value.choices)||value.choices.length>(status==="active"?3:0))return false;
 if(status==="active"&&value.choices.length!==3||status==="chapter-complete"&&value.choices.length!==0)return false;
 return value.choices.every((choice,index)=>object(choice)&&choice.id==="choice-"+(index+1)&&typeof choice.text==="string"&&choice.text.trim().length>=8&&choice.text.length<=150&&STATS.includes(choice.stat)&&Object.prototype.hasOwnProperty.call(DIFFICULTY_DC,choice.difficulty)&&choice.dc===DIFFICULTY_DC[choice.difficulty]);
}
function validCampaign(value,profile){
 if(!object(value)||value.version!==VERSION||value.characterId!==String(profile?.id||"")||!["idle","active","chapter-complete"].includes(value.status)||typeof value.seed!=="string"||value.seed.length<1||value.seed.length>64||!Number.isInteger(value.chapter)||value.chapter<1||value.chapter>1000||!Number.isInteger(value.turn)||value.turn<0||value.turn>8||!regions().some(x=>x.id===value.locationId)||typeof value.objective!=="string"||value.objective.length>200||typeof value.summary!=="string"||value.summary.length>600||!Array.isArray(value.history)||value.history.length>100||value.history.some(row=>!object(row)||!Number.isInteger(row.chapter)||row.chapter<1||row.chapter>1000||typeof row.title!=="string"||row.title.length>90||typeof row.action!=="string"||row.action.length>180||typeof row.result!=="string"||row.result.length>120||typeof row.summary!=="string"||row.summary.length>220)||!((value.status==="idle"&&value.scene===null)||(value.status!=="idle"&&validScene(value.scene,value.status,value.locationId))))return false;
 return true;
}
function resolveChoice(choice,scores,roll){
 const die=Math.trunc(Number(roll)),score=Number(scores?.[choice?.stat]);
 if(!STATS.includes(choice?.stat)||!Object.prototype.hasOwnProperty.call(DIFFICULTY_DC,choice?.difficulty)||!Number.isInteger(die)||die<1||die>20||!Number.isFinite(score))throw new Error("Invalid custom story check.");
 const modifier=Math.floor((score-10)/2),dc=DIFFICULTY_DC[choice.difficulty],total=die+modifier;
 return {roll:die,stat:choice.stat,modifier,total,dc,success:die===20||die!==1&&total>=dc,critical:die===20};
}
function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node}
function getCode(){try{return sessionStorage.getItem(STORAGE_KEY)||""}catch{return ""}}
function setCode(value){try{sessionStorage.setItem(STORAGE_KEY,value)}catch{} }
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
 if(!validScene(scene,data.chapterComplete?"chapter-complete":"active",locationId))throw new Error("The Story Director returned an incomplete scene. Your current story is unchanged.");
 return scene;
}
function contextCharacter(profile){
 return {id:String(profile.id),name:clean(profile.name,36),raceId:profile.raceId,classId:profile.classId,level:Number(profile.level)||1,stats:Object.fromEntries(STATS.map(key=>[key,Math.trunc(Number(profile.stats?.[key])||10)]))};
}
function historyEntry(campaign,action,result,roll){
 const check="d20 "+roll.roll+(roll.modifier>=0?" + ":" - ")+Math.abs(roll.modifier)+" = "+roll.total+" vs DC "+roll.dc+" · "+(roll.success?"success":"failure");
 return {chapter:campaign.chapter,title:campaign.scene.title,action:clean(action.text,180),result:check,summary:clean(result.summary,220)};
}
function makePayload(kind,profile,campaign,regionId,chapter,turn,extra={}){
 return {kind,character:contextCharacter(profile),regionId,chapter,turn,seed:campaign.seed,objective:campaign.objective,previousSummary:campaign.summary,history:campaign.history.slice(-8),...extra};
}
async function startChapter(profile,save,panel,status,onChange,code){
 if(!code){status.textContent="Enter the AI access code configured in Cloudflare first.";return}
 setCode(code);
 const original=save.aiCampaign,prior=original.status==="chapter-complete"?original.summary:original.summary,chapter=original.status==="chapter-complete"?original.chapter+1:original.chapter,region=currentRegion(save);
 if(!region){status.textContent="Choose a known starting region before beginning.";return}
 setBusy(panel,true,"The Story Director is shaping a new chapter…");
 try{
  const data=await apiRequest(code,makePayload("opening",profile,original,region.id,chapter,0,{previousSummary:prior}));
  if(!sameActiveCharacter(profile.id))return;
  const scene=sceneFromResponse(data,region.id);
  const next={...original,status:"active",seed:randomSeed(),chapter,turn:0,locationId:region.id,objective:scene.objective,summary:clean(data.summary,600),scene,history:original.history.slice(-96),updatedAt:new Date().toISOString()};
  if(!commitCampaign(save,next,onChange)){status.textContent="The AI chapter could not be saved. Your previous story is intact.";return}
 }catch(error){if(panel.isConnected)status.textContent=error.message}
 finally{setBusy(panel,false)}
}
async function chooseAction(profile,save,panel,status,onChange,code,choice){
 const campaign=save.aiCampaign,region=currentRegion(save);
 if(!code){status.textContent="Enter the AI access code configured in Cloudflare first.";return}
 setCode(code);
 if(!region||campaign.locationId!==region.id){status.textContent="You have traveled since this scene. Open a fresh scene in your current region before choosing.";return}
 const roll=Math.floor(Math.random()*20)+1,resolution=resolveChoice(choice,profile.stats,roll),nextTurn=campaign.turn+1;
 setBusy(panel,true,"Resolving your choice and generating the next scene…");
 try{
  const data=await apiRequest(code,makePayload("turn",profile,campaign,region.id,campaign.chapter,nextTurn,{scene:{title:campaign.scene.title,narration:campaign.scene.narration,objective:campaign.scene.objective},action:{text:choice.text,stat:choice.stat,difficulty:choice.difficulty},roll}));
  if(!sameActiveCharacter(profile.id))return;
  const scene=sceneFromResponse(data,region.id),entry=historyEntry(campaign,choice,data,resolution);
  const complete=data.chapterComplete===true;
  const next={...campaign,status:complete?"chapter-complete":"active",turn:nextTurn,locationId:region.id,objective:scene.objective,summary:clean(data.summary,600),scene,history:[...campaign.history,entry].slice(-100),updatedAt:new Date().toISOString()};
  const previousJournal=save.journal,previousUpdatedAt=save.updatedAt;
  save.journal=[...save.journal,"AI Chronicle · Chapter "+campaign.chapter+", turn "+nextTurn+": "+entry.action+" — "+entry.result+"."].slice(-100);
  save.updatedAt=new Date().toISOString();
  if(!commitCampaign(save,next,onChange)){save.journal=previousJournal;save.updatedAt=previousUpdatedAt;status.textContent="The AI turn could not be saved. Your previous story is intact.";return}
 }catch(error){if(panel.isConnected)status.textContent=error.message}
 finally{setBusy(panel,false)}
}
function commitCampaign(save,next,onChange){
 const previous=save.aiCampaign;save.aiCampaign=next;
 if(onChange?.()!==false)return true;
 save.aiCampaign=previous;return false;
}
function setBusy(panel,busy,message){
 const status=panel.querySelector("[data-ai-status]");if(status&&message)status.textContent=message;
 panel.setAttribute("aria-busy",String(busy));panel.querySelectorAll("button").forEach(button=>{if(button.dataset.aiConnection!=="true")button.disabled=busy});
}
function render(profile,save,onChange){
 const panel=element("section",undefined,"soa-mnm-adventure-panel soa-mnm-ai-chronicle");panel.setAttribute("aria-label","AI-generated M&M Chronicle");
 panel.append(element("div","AI CHRONICLE · ORIGINAL STORY","soa-mnm-kicker"),element("h2","A living story in Aêthoril"));
 const region=currentRegion(save),campaign=save.aiCampaign;
 const connection=element("details",undefined,"soa-mnm-ai-connection");connection.open=campaign.status==="idle";
 connection.append(element("summary","AI connection and story rules"));
 connection.append(element("p","The AI writes new scenes and choices using the selected race, class, region, and your recent story. Dice are rolled locally; the AI cannot alter your character sheet, grant XP, levels, currency, items, or abilities. This custom story check is not official M&M combat."));
 const label=element("label","AI access code (not an API key)","soa-mnm-system-label");label.htmlFor="soa-mnm-ai-code";
 const codeInput=element("input",undefined,"soa-mnm-system-input");codeInput.id="soa-mnm-ai-code";codeInput.type="password";codeInput.autocomplete="off";codeInput.placeholder="Cloudflare AI_ACCESS_CODE";codeInput.value=getCode();label.append(codeInput);connection.append(label);
 const connectionStatus=element("p","Stored only for this browser tab. Each generated scene uses the game's configured AI quota.","soa-mnm-live");connectionStatus.setAttribute("role","status");connectionStatus.setAttribute("aria-live","polite");connection.append(connectionStatus);
 const test=element("button","Test AI connection","soa-mnm-system-button");test.type="button";test.dataset.aiConnection="true";test.onclick=async()=>{const code=codeInput.value.trim();if(!code){connectionStatus.textContent="Enter the separate AI access code configured in Cloudflare.";return}setCode(code);test.disabled=true;connectionStatus.textContent="Checking the Story Director…";try{const result=await apiRequest(code,null);if(!panel.isConnected||!sameActiveCharacter(profile.id))return;connectionStatus.textContent=result.status||"AI connection ready."}catch(error){if(panel.isConnected)connectionStatus.textContent=error.message}finally{test.disabled=false}};
 connection.append(test);panel.append(connection);
 const status=element("p","", "soa-mnm-live");status.dataset.aiStatus="true";status.setAttribute("role","status");status.setAttribute("aria-live","polite");panel.append(status);
 if(!region){panel.append(element("p","No connected world region is available for this character."));return panel}
 if(campaign.status==="idle"){
  panel.append(element("p","Begin in "+region.name+(region.zone?", "+region.zone:"")+". Each chapter is generated as original story content anchored to M&M lore; your checked actions and journal stay on this device."));
  const start=element("button","Generate a new chapter","soa-mnm-system-button soa-mnm-ai-primary");start.type="button";start.onclick=()=>startChapter(profile,save,panel,status,onChange,codeInput.value.trim()||getCode());panel.append(start);
  return panel;
 }
 if(!validCampaign(campaign,profile)){panel.append(element("p","AI Chronicle data did not pass its save check and was preserved."));return panel}
 const currentMatches=campaign.locationId===region.id;
 panel.append(element("div","CHAPTER "+campaign.chapter+(campaign.turn?" · SCENE "+campaign.turn:""),"soa-mnm-kicker"),element("h3",campaign.scene.title),element("p",campaign.scene.narration,"soa-mnm-ai-narrative"));
 if(campaign.objective)panel.append(element("p","Current aim · "+campaign.objective,"soa-mnm-feature-status"));
 if(!currentMatches){const move=element("button","Generate a scene in "+region.name,"soa-mnm-system-button soa-mnm-ai-primary");move.type="button";move.onclick=()=>startChapter(profile,save,panel,status,onChange,codeInput.value.trim()||getCode());panel.append(element("p","You traveled from the scene's region. Start a fresh scene at your current destination before continuing."),move);return panel}
 if(campaign.status==="chapter-complete"){
  panel.append(element("p","Chapter summary · "+campaign.summary,"soa-mnm-feature-status"),element("p","This narrative chapter grants no XP, currency, abilities, or inventory. Official M&M reward values remain separate from this custom story mode."));
  const next=element("button","Generate the next chapter","soa-mnm-system-button soa-mnm-ai-primary");next.type="button";next.onclick=()=>startChapter(profile,save,panel,status,onChange,codeInput.value.trim()||getCode());panel.append(next);
 }else{
  const grid=element("div",undefined,"soa-mnm-choice-grid");
  campaign.scene.choices.forEach(choice=>{const button=element("button",undefined,"soa-mnm-choice soa-mnm-ai-choice");button.type="button";button.append(element("strong",choice.text),element("span",STAT_NAMES[choice.stat]+" · "+choice.difficulty+" · DC "+choice.dc+" (custom story check)"));button.onclick=()=>chooseAction(profile,save,panel,status,onChange,codeInput.value.trim()||getCode(),choice);grid.append(button)});
  panel.append(grid);
  if(campaign.turn>=3){const close=element("button","Close this chapter and continue the chronicle","soa-mnm-system-button");close.type="button";close.onclick=()=>{const previous=save.aiCampaign,next={...previous,status:"chapter-complete",scene:{...previous.scene,choices:[]},summary:previous.summary||"The chapter was closed by the player.",updatedAt:new Date().toISOString()};if(!commitCampaign(save,next,onChange))status.textContent="The chapter could not be saved."};panel.append(close)}
 }
 const history=campaign.history.slice(-6);
 if(history.length){const details=element("details",undefined,"soa-mnm-ai-history");details.append(element("summary","Recent choices and rolls"));const list=element("ol",undefined,"soa-mnm-journal");history.forEach(row=>list.append(element("li","Ch. "+row.chapter+" · "+row.title+" — "+row.action+" ("+row.result+") · "+row.summary)));details.append(list);panel.append(details)}
 return panel;
}
window.soaMnmAiChronicle=Object.freeze({version:VERSION,difficultyDC:DIFFICULTY_DC,createCampaign,validCampaign,validScene,resolveChoice,render});
})();

