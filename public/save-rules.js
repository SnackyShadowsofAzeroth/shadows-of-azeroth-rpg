(()=>{"use strict";
const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const finite=(value,min,max)=>typeof value==="number"&&Number.isFinite(value)&&value>=min&&value<=max;
const fail=message=>{throw new Error(message)};
const integrityIssues=new Set();
function reportCorruption(key){
 const name=String(key||"unknown save");integrityIssues.add(name);
 window.soaSaveIntegrityBlocked=true;
 window.soaReportSaveCorruption?.([...integrityIssues]);
}
function clearCorruption(key){
 integrityIssues.delete(String(key||"unknown save"));
 window.soaSaveIntegrityBlocked=integrityIssues.size>0;
 return integrityIssues.size===0;
}
function clearAllCorruption(){integrityIssues.clear();window.soaSaveIntegrityBlocked=false}
function readStoredJSON(key){
 let raw;
 try{raw=localStorage.getItem(key)}catch(error){
  integrityIssues.add("browser storage");window.soaSaveIntegrityBlocked=true;
  window.soaReportSaveCorruption?.([...integrityIssues]);
  window.soaReportStorageFailure?.("Browser storage is unavailable. Reload after restoring access; the game has paused without changing saves.");
  return {ok:false,unavailable:true,error};
 }
 if(integrityIssues.delete("browser storage"))window.soaSaveIntegrityBlocked=integrityIssues.size>0;
 if(raw===null)return {ok:true,missing:true,value:null,raw:null};
 try{return {ok:true,missing:false,value:JSON.parse(raw),raw}}
 catch(error){reportCorruption(key);return {ok:false,corrupt:true,error,raw}}
}
function validateOfflineSave(value){
 if(!object(value)||typeof value.id!=="string"||!value.id.trim()||value.id.length>80)fail("Save data is incomplete.");
 if(!["afterbattle","archives","combat","crossing","death","hall","junction","memo","new-hero-start","relayfailed","trap","trapfailed","wires"].includes(value.id))fail("Save points to an unknown scene.");
 if(!finite(value.hp,0,110))fail("Health is outside the allowed range.");
 const result=structuredClone(value);
 result.en=result.en===undefined?100:result.en;
 result.money=result.money===undefined?0:result.money;
 result.time=result.time===undefined?0:result.time;
 result.alert=result.alert===undefined?0:result.alert;
 if(!finite(result.en,0,100)||!Number.isSafeInteger(result.money)||result.money<0||!Number.isSafeInteger(result.time)||result.time<0||!Number.isInteger(result.alert)||result.alert<0||result.alert>100)fail("Save values are invalid.");
 result.seen=result.seen===undefined?[]:result.seen;
 result.flags=result.flags===undefined?{}:result.flags;
 result.enemy=result.enemy===undefined?null:result.enemy;
 result.log=result.log===undefined?[]:result.log;
 if(!Array.isArray(result.seen)||result.seen.length>300||result.seen.some(item=>typeof item!=="string"||item.length>120))fail("Save history is invalid.");
 if(!object(result.flags)||Object.keys(result.flags).length>300)fail("Save flags are invalid.");
 if(!Array.isArray(result.log)||result.log.length>300||result.log.some(item=>typeof item!=="string"||item.length>500))fail("Journal entries are invalid.");
 if(result.equipment!==undefined&&(!Array.isArray(result.equipment)||result.equipment.length>100||result.equipment.some(item=>typeof item!=="string"||item.length>120)))fail("Equipment data is invalid.");
 if(result.enemy!==null&&(!object(result.enemy)||typeof result.enemy.name!=="string"||!result.enemy.name.trim()||result.enemy.name.length>100||!finite(result.enemy.hp,0,10000)||!finite(result.enemy.max,1,10000)||result.enemy.hp>result.enemy.max||!finite(result.enemy.damage,0,10000)))fail("Encounter data is invalid.");
 if(result.id==="combat"&&result.enemy===null)fail("The combat scene has no saved opponent.");
 
 if(result.druid!==undefined){
  const d=result.druid,forms=["caster","bear","cat","aquatic","travel","dire_bear","moonkin","tree","flight"];
  if(!object(d)||d.version!==1||!forms.includes(d.form)||!object(d.pools)||["mana","energy","rage"].some(k=>!Number.isInteger(d.pools[k])||!finite(d.pools[k],0,100))||!object(d.combo)||!Number.isInteger(d.combo.points)||!finite(d.combo.points,0,5)||(d.combo.target!==null&&typeof d.combo.target!=="string")||typeof d.prowl!=="boolean")fail("Druid form or resource data is invalid.");
  if(d.cooldowns!==undefined&&(!object(d.cooldowns)||Object.values(d.cooldowns).some(n=>!Number.isSafeInteger(n)||n<0)))fail("Druid cooldown data is invalid.");
  if(d.effects!==undefined&&!object(d.effects))fail("Druid effect data is invalid.");
  if(d.effects?.rejuvenation!==undefined){const hot=d.effects.rejuvenation;if(!object(hot)||!Number.isInteger(hot.remaining)||hot.remaining<1||hot.remaining>3||!Number.isSafeInteger(hot.nextTime)||hot.nextTime<0)fail("Rejuvenation healing data is invalid.");}
  if(d.dots!==undefined&&(!Array.isArray(d.dots)||d.dots.length>20||d.dots.some(x=>!object(x)||typeof x.id!=="string"||typeof x.target!=="string"||!finite(x.amount,0,50)||!Number.isInteger(x.start)||!Number.isInteger(x.until)||x.start<0||x.until<x.start)))fail("Druid bleed data is invalid.");
 }
 return result;
}
function freshOfflineSave(){
 return {id:"new-hero-start",hp:100,en:100,money:1500,time:0,alert:0,seen:[],flags:{},enemy:null,log:["A new journey begins.","Starting funds: 15 silver."]};
}
function validateChronicle(value){
 if(!object(value))fail("Backup journal data is invalid.");
 if(value.schema!==undefined&&value.schema!==1)fail("Backup journal version is unsupported.");
 const quests=value.quests===undefined?[]:value.quests,archives=value.archives===undefined?[]:value.archives,entries=value.entries===undefined?[]:value.entries;
 if(!Array.isArray(quests)||quests.length>200)fail("Backup journal quests are invalid.");
 if(!Array.isArray(archives)||archives.length>75)fail("Backup chapter archive is invalid.");
 if(!Array.isArray(entries)||entries.length>100)fail("Backup journal entries are invalid.");
 if(value.primaryQuest!==undefined&&value.primaryQuest!==null&&(!object(value.primaryQuest)||typeof value.primaryQuest.title!=="string"||!value.primaryQuest.title.trim()||value.primaryQuest.title.length>120||typeof value.primaryQuest.objective!=="string"||!value.primaryQuest.objective.trim()||value.primaryQuest.objective.length>240||(value.primaryQuest.updatedAtTurn!==undefined&&!finite(value.primaryQuest.updatedAtTurn,0,Number.MAX_SAFE_INTEGER))))fail("Backup current quest focus is invalid.");
 for(const quest of quests){
  if(!object(quest)||typeof quest.id!=="string"||!quest.id.trim()||quest.id.length>120||typeof quest.title!=="string"||!quest.title.trim()||quest.title.length>180||!['active','completed'].includes(quest.status)||!Array.isArray(quest.objectives)||quest.objectives.length>40)fail("Backup contains an invalid quest record.");
  for(const objective of quest.objectives)if(!object(objective)||typeof objective.id!=="string"||!objective.id.trim()||objective.id.length>140||typeof objective.label!=="string"||!objective.label.trim()||objective.label.length>280||typeof objective.done!=="boolean")fail("Backup contains an invalid quest objective.");
  if(quest.completedAt!==undefined&&!(typeof quest.completedAt==="number"&&Number.isFinite(quest.completedAt))&&!(typeof quest.completedAt==="string"&&Number.isFinite(Date.parse(quest.completedAt))))fail("Backup quest completion date is invalid.");
 }
 for(const archive of archives)if(!object(archive)||typeof archive.id!=="string"||archive.id.length>120||!Number.isInteger(archive.act)||archive.act<1||archive.act>99||!Number.isInteger(archive.chapter)||archive.chapter<1||archive.chapter>99||typeof archive.chapterTitle!=="string"||archive.chapterTitle.length>120||typeof archive.summary!=="string"||archive.summary.length>500)fail("Backup contains an invalid chapter archive entry.");
 for(const entry of entries)if(!object(entry)||typeof entry.id!=="string"||entry.id.length>140||typeof entry.text!=="string"||!entry.text.trim()||entry.text.length>2000||typeof entry.createdAt!=="string"||!Number.isFinite(Date.parse(entry.createdAt))||(entry.updatedAt!==null&&entry.updatedAt!==undefined&&(typeof entry.updatedAt!=="string"||!Number.isFinite(Date.parse(entry.updatedAt)))))fail("Backup contains an invalid personal journal entry.");
 if(value.pendingMilestone!==null&&value.pendingMilestone!==undefined&&(!object(value.pendingMilestone)||typeof value.pendingMilestone.title!=="string"||typeof value.pendingMilestone.reason!=="string"))fail("Backup pending chapter milestone is invalid.");
 return true;
}
function validateCampaignSave(value){
 if(!object(value))fail("Backup campaign data is invalid.");
 if(value.druidQuests!==undefined){
  if(!object(value.druidQuests))fail("Druid quest data is invalid.");
  const lengths={bear:2,aquatic:3,cat:3,travel:2,dire_bear:2,moonkin:2,tree:2,flight:2};
  for(const [id,r] of Object.entries(value.druidQuests))if(!(id in lengths)||!object(r)||!["active","claimed"].includes(r.state)||!Number.isInteger(r.step)||r.step<0||r.step>lengths[id]||!Array.isArray(r.proof)||r.proof.length!==r.step||r.state==="claimed"&&(r.step!==lengths[id]||r.receipt!=="druid-form:"+id))fail("Druid quest progress is invalid.");
 }
 if(value.chronicle!==undefined&&value.chronicle!==null)validateChronicle(value.chronicle);
 if(value.quests!==undefined&&value.quests!==null&&!object(value.quests))fail("Backup campaign quests are invalid.");
 return structuredClone(value);
}
function validateProgressionSave(value){
 if(!object(value)||!object(value.actors)||!object(value.actors.hero)||Object.keys(value.actors).length>40)fail("Backup progression data is invalid.");
 for(const actor of Object.values(value.actors)){
  if(!object(actor))fail("Backup contains an invalid progression actor.");
  if(actor.level!==undefined&&!finite(actor.level,1,60))fail("Backup progression level is invalid.");
  if(actor.xp!==undefined&&!finite(actor.xp,0,Number.MAX_SAFE_INTEGER))fail("Backup progression XP is invalid.");
  if(actor.totalXp!==undefined&&!finite(actor.totalXp,0,Number.MAX_SAFE_INTEGER))fail("Backup total XP is invalid.");
  if(actor.skills!==undefined&&!object(actor.skills))fail("Backup skill progression is invalid.");
  for(const skill of Object.values(actor.skills||{}))if(!object(skill)||["rank","practice","attempts","successes"].some(key=>skill[key]!==undefined&&!finite(skill[key],0,1000000)))fail("Backup skill record is invalid.");
 }
 if(value.receipts!==undefined&&(!Array.isArray(value.receipts)||value.receipts.length>800||value.receipts.some(item=>typeof item!=="string")))fail("Backup progression receipts are invalid.");
 if(value.history!==undefined&&(!Array.isArray(value.history)||value.history.length>30||value.history.some(item=>!object(item))))fail("Backup progression history is invalid.");
 if(value.labels!==undefined&&!object(value.labels))fail("Backup progression labels are invalid.");
 return structuredClone(value);
}
function validateCompanionsSave(value){
 if(!object(value)||!object(value.rapport)||Object.values(value.rapport).some(item=>!finite(item,0,5))||!Array.isArray(value.entries)||value.entries.length>40||value.entries.some(item=>!object(item)||typeof item.text!=="string"||typeof item.person!=="string"))fail("Backup relationship data is invalid.");
 if(value.relations!==undefined&&!object(value.relations))fail("Backup companion relationships are invalid.");
 for(const relation of Object.values(value.relations||{})){
  if(!object(relation)||(relation.memories!==undefined&&!Array.isArray(relation.memories)))fail("Backup companion relationship record is invalid.");
  for(const key of ["trust","affection","respect"])if(relation[key]!==undefined&&!finite(relation[key],-100,100))fail("Backup companion relationship score is invalid.");
  for(const key of ["interactions","grievances","nights"])if(relation[key]!==undefined&&!finite(relation[key],0,Number.MAX_SAFE_INTEGER))fail("Backup companion relationship count is invalid.");
 }
 if(value.dialogueIds!==undefined&&(!Array.isArray(value.dialogueIds)||value.dialogueIds.length>100||value.dialogueIds.some(item=>typeof item!=="string")))fail("Backup conversation history is invalid.");
 return structuredClone(value);
}
function validateReputationSave(value){
 if(!object(value)||!object(value.factions))fail("Backup reputation data is invalid.");
 for(const record of Object.values(value.factions))if(!object(record)||!finite(record.value,-100,100))fail("Backup faction standing is invalid.");
 for(const key of ["individuals","events","handled","notices"]){if(value[key]!==undefined&&((key==="individuals"&&!object(value[key]))||(key!=="individuals"&&!Array.isArray(value[key]))))fail("Backup reputation history is invalid.")}
 for(const record of Object.values(value.individuals||{}))if(!object(record)||!finite(record.value,-100,100))fail("Backup individual standing is invalid.");
 if(value.events?.some(event=>!object(event))||value.handled?.some(id=>typeof id!=="string")||value.notices?.some(notice=>!object(notice)))fail("Backup reputation events are invalid.");
 return structuredClone(value);
}
function validateCharacterRoster(value){
 if(!object(value)||value.version!==1||!Array.isArray(value.characters)||value.characters.length<1||value.characters.length>16)fail("Character roster is incomplete.");
 const ids=new Set();
 for(const person of value.characters){
  if(!object(person)||typeof person.id!=="string"||!/^[a-z0-9_-]{1,64}$/i.test(person.id)||typeof person.name!=="string"||!person.name.trim()||person.name.length>60||!window.soaCharacterRules?.validSelection?.(person)||(person.professions!==undefined&&(!object(person.professions)))||(person.secondary!==undefined&&(!object(person.secondary)))||(person.professionLog!==undefined&&!Array.isArray(person.professionLog))||(person.professionEvents!==undefined&&!Array.isArray(person.professionEvents)))fail("Character roster contains an invalid profile.");
  if(ids.has(person.id))fail("Character roster contains duplicate IDs.");
  ids.add(person.id);
 }
 if(!ids.has(value.active))fail("Character roster active slot is missing.");
 return structuredClone(value);
}
function validateRosterBackup(value){
 if(!object(value)||value.kind!=="shadows-of-azeroth-multi-character-backup"||value.version!==1)fail("This is not a supported all-character backup.");
 const roster=value.roster,slots=value.slots,portraits=value.portraits||{};
 if(!object(roster)||roster.version!==1||!Array.isArray(roster.characters)||roster.characters.length<1||roster.characters.length>16||!object(slots)||!object(portraits))fail("Backup roster is incomplete.");
 const validRoster=validateCharacterRoster(roster),ids=new Set(validRoster.characters.map(person=>person.id));
 if(!ids.has(roster.active)||Object.keys(slots).length!==ids.size||Object.keys(slots).some(id=>!ids.has(id)))fail("Backup character slots do not match the roster.");
 const saveKeys=["soa-save-v1","soa-campaign-v1","soa-companions-v1","soa-reputation-v1","soa-campaign-enabled","soa-progression-v1"];
 for(const id of ids){
  const slot=slots[id];
  if(!object(slot)||saveKeys.some(key=>!Object.hasOwn(slot,key))||saveKeys.some(key=>slot[key]!==null&&typeof slot[key]!=="string"))fail("Backup contains an invalid character save slot.");
  for(const key of saveKeys.slice(0,4).concat(saveKeys.slice(5))){
   if(slot[key]===null)continue;
   let parsed;try{parsed=JSON.parse(slot[key])}catch{fail("Backup contains unreadable save data.")}
   if(key==="soa-save-v1")validateOfflineSave(parsed);
   else if(key==="soa-campaign-v1")validateCampaignSave(parsed);
   else if(key==="soa-companions-v1")validateCompanionsSave(parsed);
   else if(key==="soa-reputation-v1")validateReputationSave(parsed);
   else if(key==="soa-progression-v1")validateProgressionSave(parsed);
   else if(!object(parsed))fail("Backup contains invalid character data.");
  }
  if(slot["soa-campaign-enabled"]!==null&&!['0','1'].includes(slot["soa-campaign-enabled"]))fail("Backup campaign setting is invalid.");
  if(typeof slot["soa-save-v1"]!=="string"&&typeof slot["soa-campaign-v1"]!=="string")fail("A character is missing both game saves.");
 }
 for(const [id,data] of Object.entries(portraits))if(!ids.has(id)||typeof data!=="string"||data.length>=210000||!/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(data))fail("Backup portrait data is invalid.");
 return structuredClone(value);
}
window.soaSaveRules={validateOfflineSave,validateCampaignSave,validateChronicle,validateProgressionSave,validateCompanionsSave,validateReputationSave,validateCharacterRoster,validateRosterBackup,freshOfflineSave,readStoredJSON,reportCorruption,clearCorruption,clearAllCorruption,isIntegrityBlocked:()=>integrityIssues.size>0};
})();

