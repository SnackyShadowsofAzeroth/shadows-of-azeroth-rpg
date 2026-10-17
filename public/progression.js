(()=>{"use strict";
// Save-slot-scoped progression. No Gemini response may modify XP or levels.
const KEY="soa-progression-v1",ESTABLISHED_LEVEL=10,FRESH_LEVEL=1,MAX_LEVEL=60,MAX_RANK=15;
const currentProfile=(()=>{try{const r=JSON.parse(localStorage.getItem("soa-character-roster-v1")||"null");return r?.characters?.find(x=>x.id===r.active)||null}catch{return null}})();
const isNewHero=currentProfile?.origin==="custom"&&currentProfile.startLevel===1;
const START_LEVEL=isNewHero?FRESH_LEVEL:ESTABLISHED_LEVEL;
const SKILLS=["bluff","bribe","romance","threaten","stealth","engineering","investigate","social","combat"];
const HERO="hero",PARTY=["pippa","bromli","lethariel"];
const knownNames={"Pippa Sparkwhistle":"pippa","Bromli Ironkeg":"bromli","Lethariel Moonguard":"lethariel"};
const LABELS={bluff:"Bluff",bribe:"Bribe",romance:"Romance",threaten:"Threaten",stealth:"Stealth",engineering:"Engineering",investigate:"Investigation",social:"Persuasion",combat:"Combat"};
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(Number(n))?Math.trunc(Number(n)):lo));
const xpNeeded=level=>level>=MAX_LEVEL?0:140+22*level+2*level*level;
const skillNeeded=rank=>rank>=MAX_RANK?0:4+2*rank;
const blank=()=>({level:START_LEVEL,xp:0,totalXp:0,skills:{},lastGain:null});
const fresh=()=>({version:1,actors:isNewHero?{hero:blank()}:{hero:blank(),pippa:blank(),bromli:blank(),lethariel:blank()},receipts:[],history:[]});
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch{return null}};
let data=read();
if(!data||typeof data!=="object"||!data.actors)data=fresh();
for(const id of [HERO,...(isNewHero?[]:PARTY)]){
 const actor=data.actors[id]&&typeof data.actors[id]==="object"?data.actors[id]:blank();
 actor.level=clamp(actor.level,FRESH_LEVEL,MAX_LEVEL);
 actor.xp=actor.level===MAX_LEVEL?0:clamp(actor.xp,0,xpNeeded(actor.level)-1);
 actor.totalXp=clamp(actor.totalXp,0,Number.MAX_SAFE_INTEGER);
 if(!actor.skills||typeof actor.skills!=="object")actor.skills={};
 data.actors[id]=actor;
}
if(!Array.isArray(data.receipts))data.receipts=[];
if(!Array.isArray(data.history))data.history=[];
if(!data.labels||typeof data.labels!=="object")data.labels={};
function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch{return false}}
persist();
const elem=(tag,label,cls)=>{const e=document.createElement(tag);if(label!==undefined)e.textContent=label;if(cls)e.className=cls;return e};
function identity(id){return [HERO,...PARTY].includes(id)||(typeof id==="string"&&id.startsWith("party:")&&Object.prototype.hasOwnProperty.call(data.actors,id))?id:null}
function register(name){
 if(typeof name!=="string"||!name.trim())return null;
 const cleanName=name.trim().slice(0,60);
 if(knownNames[cleanName]){
  const id=knownNames[cleanName];
  if(!data.actors[id]){data.actors[id]=blank();persist()}
  return id;
 }
 const slug=cleanName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50);
 if(!slug)return null;
 const id="party:"+slug;
 if(!data.actors[id]||data.labels[id]!==cleanName){
  if(!data.actors[id])data.actors[id]=blank();
  data.labels[id]=cleanName;persist();
 }
 return id;
}
function score(id=HERO){return data.actors[identity(id)||HERO]||data.actors[HERO]}
function level(id=HERO){return score(id).level}
function skill(id,name){
 if(!SKILLS.includes(name))return {rank:0,practice:0,attempts:0,successes:0};
 const v=score(id).skills[name];return v?{rank:clamp(v.rank,0,MAX_RANK),practice:clamp(v.practice,0,1000),attempts:clamp(v.attempts,0,1000000),successes:clamp(v.successes,0,1000000)}:{rank:0,practice:0,attempts:0,successes:0};
}
function bonus(name){return skill(HERO,name).rank}
function award(id,amount,receipt,reason){
 id=identity(id);amount=clamp(amount,0,5000);
 if(!id||!receipt||amount===0||data.receipts.includes(receipt))return {awarded:0,levels:0};
 const actor=score(id),previous=actor.level;
 actor.totalXp+=amount;
 if(actor.level<MAX_LEVEL)actor.xp+=amount;
 while(actor.level<MAX_LEVEL&&actor.xp>=xpNeeded(actor.level)){
  actor.xp-=xpNeeded(actor.level);actor.level++;
 }
 if(actor.level===MAX_LEVEL)actor.xp=0;
 actor.lastGain={amount,reason:String(reason||"Experience").slice(0,80),level:actor.level};
 data.receipts.push(receipt);data.receipts=data.receipts.slice(-800);
 data.history.push({actor:id,amount,reason:actor.lastGain.reason,level:actor.level,at:Date.now()});
 data.history=data.history.slice(-30);
 if(!persist())return {awarded:amount,levels:actor.level-previous,storageWarning:true};
 return {awarded:amount,levels:actor.level-previous,level:actor.level};
}
function check({receipt,name,success,difficulty,actorId="hero",practiceOnly=false}){
 if(!receipt||!identity(actorId)||!SKILLS.includes(name)||data.receipts.includes("check:"+actorId+":"+receipt))return {awarded:0,rankUp:false};
 const actor=score(actorId),value=skill(actorId,name);
 const old=value.rank;
 value.attempts++;if(success)value.successes++;
 value.practice+=success?2:1;
 while(value.rank<MAX_RANK&&value.practice>=skillNeeded(value.rank)){
  value.practice-=skillNeeded(value.rank);value.rank++;
 }
 if(value.rank===MAX_RANK)value.practice=0;
 actor.skills[name]=value;
 const amount=success?(difficulty==="hard"?30:difficulty==="easy"?16:23):7;
 let result;
 if(practiceOnly){
  data.receipts.push("check:"+actorId+":"+receipt);data.receipts=data.receipts.slice(-800);
  persist();result={awarded:0,levels:0,level:actor.level};
 }else{
  result=award(actorId,amount,"check:"+actorId+":"+receipt,(success?"Passed ":"Attempted ")+(LABELS[name]||name)+" check");
 }
 // Battle rewards refresh once after the full distribution rather than after every practice point.
 if(!practiceOnly)refresh();return {...result,rankUp:value.rank>old,rank:value.rank,skill:name};
}
function battle({receipt,defeated,allies}){
 if(!receipt||data.receipts.includes("battle:"+receipt))return {awarded:0,party:[]};
 const foes=Array.isArray(defeated)?defeated:[];
 const amount=clamp(foes.reduce((sum,foe)=>sum+55+Math.round(clamp(foe.maxHp,1,500)*.8),0),0,5000);
 if(!amount)return {awarded:0,party:[]};
 const hero=award(HERO,amount,"battle:"+receipt,"Encounter won · "+foes.length+" foe"+(foes.length===1?"":"s"));
 check({receipt:"victory:"+receipt,name:"combat",success:true,difficulty:"medium",actorId:HERO,practiceOnly:true});
 const party=[];
 for(const id of new Set(Array.isArray(allies)?allies:[])){
  if(!identity(id)||id===HERO)continue;
  const reward=award(id,Math.max(1,Math.round(amount*.7)),"party:"+receipt+":"+id,"Shared battle victory");
  check({receipt:"victory:"+receipt,name:"combat",success:true,difficulty:"medium",actorId:id,practiceOnly:true});
  party.push({id,...reward});
 }
 refresh();return {...hero,party};
}
function recent(){return data.history.slice(-7).reverse()}
function progress(id){const v=score(id);return {level:v.level,xp:v.xp,needed:xpNeeded(v.level),totalXp:v.totalXp,max:MAX_LEVEL,lastGain:v.lastGain}}
function bar(current,max,label){
 const track=elem("div",undefined,"soa-xp-track");track.setAttribute("role","progressbar");track.setAttribute("aria-label",label);
 track.setAttribute("aria-valuemin","0");track.setAttribute("aria-valuemax",String(max||1));track.setAttribute("aria-valuenow",String(current));
 const fill=elem("div",undefined,"soa-xp-fill");fill.style.width=max?Math.min(100,current/max*100)+"%":"100%";track.append(fill);return track;
}
function heroPanel(){
 const box=elem("section",undefined,"soa-progression-card");
 box.append(elem("div","CHARACTER PROGRESSION","soa-roster-kicker"));
 const p=progress(),heading=elem("div",undefined,"soa-level-heading");
 heading.append(elem("strong","Level "+p.level+" / "+MAX_LEVEL),elem("span",p.level===MAX_LEVEL?"Maximum level":p.xp+" / "+p.needed+" XP"));box.append(heading,bar(p.xp,p.needed,"Experience to next level"));
 const detail=elem("details",undefined,"soa-skill-list");detail.append(elem("summary","Skill mastery · view practice and ranks"));
 for(const name of SKILLS){
  const x=skill(HERO,name),row=elem("div",undefined,"soa-skill-line");
  row.append(elem("span",LABELS[name]),elem("span","Rank "+x.rank+" / "+MAX_RANK+" · "+(x.rank===MAX_RANK?"Mastered":x.practice+"/"+skillNeeded(x.rank)+" practice")));detail.append(row);
 }
 box.append(detail);
 const extras=Object.entries(data.labels);
 if(extras.length){const party=elem("details",undefined,"soa-xp-history");party.append(elem("summary","Additional party members ("+extras.length+")"));for(const [id,name] of extras){const p=progress(id);party.append(elem("p",name+" · Level "+p.level+" · "+(p.level===MAX_LEVEL?"Maximum level":p.xp+"/"+p.needed+" XP")))}box.append(party)}
 const history=recent();
 if(history.length){const logs=elem("details",undefined,"soa-xp-history");logs.append(elem("summary","Recent experience"));for(const h of history){const who=h.actor==="hero"?"You":data.labels[h.actor]||h.actor[0].toUpperCase()+h.actor.slice(1);logs.append(elem("p",who+" · +"+h.amount+" XP · "+h.reason))}box.append(logs)}
 return box;
}
function companionBadge(id){
 if(!PARTY.includes(id))return null;
 const p=progress(id),root=elem("div",undefined,"soa-companion-level");
 root.append(elem("strong","Level "+p.level+" / "+MAX_LEVEL),elem("span",p.level===MAX_LEVEL?"Maximum level":p.xp+" / "+p.needed+" XP"));
 root.append(bar(p.xp,p.needed,id+" experience"));return root;
}
function refresh(){
 const host=document.getElementById("soa-profession-panel");
 if(host){
  const previous=host.querySelector("#soa-progress-display");if(previous)previous.remove();
  const panel=heroPanel();panel.id="soa-progress-display";
  const heading=host.querySelector("h2");if(heading)heading.after(panel);else host.prepend(panel);
 }
 window.soaCompanions?.refreshProgress?.();
}
function overnightBond({receipt,companionId,quality=1}={}){
 if(!receipt||!["pippa","bromli","lethariel"].includes(companionId))return {awarded:0};
 // Fixed, modest once-per-rest reward, no stacking from repeated UI renders.
 const amount=quality>=2?35:25;
 const result=award("hero",amount,"bond-rest:"+receipt,"Restful morning with trusted companion");
 if(result.awarded)refresh();
 return result;
}
window.soaProgression={level,progress,skill,bonus,check,battle,overnightBond,register,recent,refresh,heroPanel,companionBadge,xpNeeded,skillNeeded,MAX_LEVEL};
document.addEventListener("DOMContentLoaded",refresh);
})();