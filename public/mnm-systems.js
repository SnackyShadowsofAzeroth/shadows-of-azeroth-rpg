(()=>{"use strict";
const KEY="soa-mnm-systems-v1",VERSION=1,MAX_LEVEL=60,ACTION_SLOTS=10;
const PAGES=["skills","innates","spells"];
const TRUE_CASTER_CLASSES=new Set(["cleric","druid","elementalist","enchanter","necromancer","shaman","wizard"]);
const SAFE_HAVENS=new Set(["night-harbor","underdocks","penshaw","faelindral","ail-vorith"]);
const RESTED_XP_BONUS=0.15,RESTED_CAP_MINUTES=20,REST_PER_CAMP_MINUTE=10;
const MINUTE=60*1000,HOUR=60*MINUTE,DAY=24*HOUR;
const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const clampLevel=value=>Math.max(1,Math.min(MAX_LEVEL,Math.trunc(Number(value)||1)));
const CURRENCY_EXCHANGE="100 Copper = 1 Silver · 100 Silver = 1 Gold · 100 Gold = 1 Platinum.";
function currencyBreakdown(copperAmount){
 let remainder=Math.max(0,Math.trunc(Number(copperAmount)||0));
 const platinum=Math.floor(remainder/1000000);remainder%=1000000;
 const gold=Math.floor(remainder/10000);remainder%=10000;
 const silver=Math.floor(remainder/100);const copper=remainder%100;
 return {platinum,gold,silver,copper};
}
function formatCurrency(copperAmount){
 const coins=currencyBreakdown(copperAmount),parts=[];
 for(const [name,amount] of [["Platinum",coins.platinum],["Gold",coins.gold],["Silver",coins.silver],["Copper",coins.copper]])if(amount)parts.push(amount+" "+name);
 return parts.join(" · ")||"0 Copper";
}
function formatWallet(copperAmount){
 const coins=currencyBreakdown(copperAmount);
 return coins.platinum+" Platinum · "+coins.gold+" Gold · "+coins.silver+" Silver · "+coins.copper+" Copper";
}
const validDate=value=>typeof value==="string"&&Number.isFinite(Date.parse(value));
const clone=value=>JSON.parse(JSON.stringify(value));
const itemKinds=new Set(["document","light","bag","spellbook","scroll","equipment","misc"]);
const RPG_ITEM_DEFS=Object.freeze({
 "road-worn-weapon":{name:"Road-worn weapon",kind:"weapon",slot:"weapon",attack:1,damage:2,defense:0,weight:3,price:0,description:"A serviceable weapon for the road. Its statistics are an original M&M: RPG rule."},
 "patched-travel-coat":{name:"Patched travel coat",kind:"armor",slot:"armor",attack:0,damage:0,defense:1,weight:4,price:0,description:"Travel-worn protection. Its statistics are an original M&M: RPG rule."},
 "healing-poultice":{name:"Healing poultice",kind:"consumable",heal:14,focus:0,weight:1,price:8,description:"Restore health in or out of combat."},
 "waybread":{name:"Waybread",kind:"consumable",heal:0,focus:4,weight:1,price:6,description:"Restore Focus in or out of combat."},
 "iron-shard":{name:"Iron shard",kind:"material",weight:1,price:3,description:"A useful scrap from a broken tool or buckle."},
 "saltwind-knife":{name:"Saltwind knife",kind:"weapon",slot:"weapon",attack:2,damage:4,defense:0,weight:3,price:46,description:"A balanced blade traded along the Shaded Dunes. Original project item."},
 "liftwarden-coat":{name:"Liftwarden coat",kind:"armor",slot:"armor",attack:0,damage:0,defense:2,weight:5,price:46,description:"Layered hide and riveted cloth made for close quarters. Original project item."},
 "thornwood-bow":{name:"Thornwood bow",kind:"weapon",slot:"weapon",attack:3,damage:4,defense:0,weight:3,price:46,description:"A flexible bow made from storm-fallen wood. Original project item."},
 "blightmantle":{name:"Blightmantle",kind:"armor",slot:"armor",attack:0,damage:0,defense:2,weight:4,price:46,description:"A weatherproof mantle patched with gathered hide. Original project item."},
 "deep-forged-edge":{name:"Deep-forged edge",kind:"weapon",slot:"weapon",attack:3,damage:5,defense:0,weight:4,price:54,description:"A compact weapon traded below Night Harbor. Original project item."},
 "branchguard":{name:"Branchguard vest",kind:"armor",slot:"armor",attack:0,damage:0,defense:3,weight:4,price:54,description:"A light vest reinforced with gathered bark and hide. Original project item."}
});
const PRIMARY_STAT=Object.freeze({archer:"dex",bard:"cha",beastmaster:"str",cleric:"wis",druid:"wis",elementalist:"int",enchanter:"cha",fighter:"str",inquisitor:"wis",monk:"agi",necromancer:"int",paladin:"str",ranger:"dex",rogue:"agi",shadow_knight:"str",shaman:"wis",spellblade:"int",wizard:"int"});
const STARTER_CLASS_ABILITIES=Object.freeze({
 archer:Object.freeze({id:"archer:point-blank",name:"Point Blank",classId:"archer",level:1,page:"innates",source:"official",description:"An instant point-blank shot with no minimum range.",rpgAction:"strike",rpgStarter:true,sourceUrl:"https://monstersandmemories.com/class-archer-deep-dive"}),
 rogue:Object.freeze({id:"rogue:backstab",name:"Backstab",classId:"rogue",level:1,page:"innates",source:"official",description:"Core Rogue attack. After at least three seconds in Stealth, the weapon-based portion of Backstab damage is doubled.",rpgAction:"backstab",rpgStarter:true,sourceUrl:"https://monstersandmemories.com/class-rogue-deep-dive"})
});
const FOES=Object.freeze({
 "night-harbor":[["Dune jackal","A lean scavenger tests the caravan road."],["Saltwind viper","A quick shape stirs beneath the wind-raked stones."],["Quay cutpurse","A desperate local blocks the narrow market lane."]],
 "underdocks":[["Heap runner","A wary scavenger darts between stacked crates."],["Blind-echo skitter","A pale burrower follows sound through the lift tunnels."],["Lost lift warden","An abandoned sentinel guards a rusted platform."]],
 penshaw:[["Blightwood stalker","A dark shape watches from the edge of the tree line."],["Mossback wolf","A hungry wolf emerges from the fern shadow."],["Thorn-snag prowler","A low, thorn-caught shape circles the path."]],
 faelindral:[["Branchlight wisp","A drifting light gathers itself among the high boughs."],["Mossback guardian","A bark-armored figure steps between you and the trail."],["Fae-touched hound","A quiet hound lowers its head and blocks the way."]],
 "ail-vorith":[["Deepstone watcher","A stone sentinel wakes in the tunnel wall."],["Shadow-sworn prowler","A hooded shape emerges from the old passage."],["Tunnel devourer","Something plated scrapes across the cavern floor."]]
});
function createItem(id,name,kind){return {id,name,kind,source:"official-guide",weight:null,...(kind==="document"?{read:false}:{}),...(kind==="light"?{lit:false}:{})}}
function emptyInventory(){return {backpack:[],bags:[null,null,null],belt:[null,null,null]}}
function primaryStat(profile){return PRIMARY_STAT[profile?.classId]||"str"}
function statModifier(profile,key){return window.soaMnmRules?.abilityModifier?.(profile?.stats?.[key]??10)||0}
function xpToNext(level){return clampLevel(level)>=MAX_LEVEL?0:100+(clampLevel(level)-1)*35}
function rpgMaxHp(profile,level=1){return 18+Math.max(3,Math.trunc(Number(profile?.stats?.sta)||10))*2+(clampLevel(level)-1)*5}
function rpgMaxFocus(profile,level=1){return Math.max(3,Math.min(40,6+statModifier(profile,primaryStat(profile))+Math.floor((clampLevel(level)-1)/2)))}
function createRpgState(profile,level=profile?.level){
 const current=clampLevel(level),maxHp=rpgMaxHp(profile,current),maxFocus=rpgMaxFocus(profile,current);
 return {version:1,hp:maxHp,maxHp,focus:maxFocus,maxFocus,xp:0,totalXp:0,kills:0,coppers:24,inventory:[{id:"road-worn-weapon",quantity:1},{id:"patched-travel-coat",quantity:1},{id:"healing-poultice",quantity:2},{id:"waybread",quantity:2}],equipment:{weapon:"road-worn-weapon",armor:"patched-travel-coat"},encounter:null,encounterSerial:0,guarding:false,claimedStories:[],log:["Custom M&M: RPG rules are active. Your road-worn weapon, travel coat, poultices, and waybread are original project items."]};
}
function validRpgState(value,profile,level){
 if(!object(value)||value.version!==1||!Number.isInteger(value.hp)||!Number.isInteger(value.maxHp)||value.maxHp<1||value.maxHp>10000||value.hp<0||value.hp>value.maxHp||!Number.isInteger(value.focus)||!Number.isInteger(value.maxFocus)||value.maxFocus<1||value.maxFocus>100||value.focus<0||value.focus>value.maxFocus||!Number.isInteger(value.xp)||value.xp<0||value.xp>=Math.max(1,xpToNext(level))&&level<MAX_LEVEL||!Number.isInteger(value.totalXp)||value.totalXp<0||!Number.isInteger(value.kills)||value.kills<0||!Number.isInteger(value.coppers)||value.coppers<0||value.coppers>100000000||!Array.isArray(value.inventory)||value.inventory.length>40||value.inventory.some(entry=>!object(entry)||!RPG_ITEM_DEFS[entry.id]||!Number.isInteger(entry.quantity)||entry.quantity<1||entry.quantity>99)||!object(value.equipment)||!["weapon","armor"].every(slot=>value.equipment[slot]===null||typeof value.equipment[slot]==="string"&&RPG_ITEM_DEFS[value.equipment[slot]]?.slot===slot&&value.inventory.some(entry=>entry.id===value.equipment[slot]&&entry.quantity>0))||!Number.isInteger(value.encounterSerial)||value.encounterSerial<0||typeof value.guarding!=="boolean"||!Array.isArray(value.claimedStories)||value.claimedStories.length>500||value.claimedStories.some(id=>typeof id!=="string"||id.length>120)||!Array.isArray(value.log)||value.log.length>30||value.log.some(line=>typeof line!=="string"||line.length>240))return false;
 if(value.hp>value.maxHp||value.focus>value.maxFocus)return false;
 if(value.encounter && [value.encounter.heritageUsed,value.encounter.heritageWard].some(flag=>flag!==undefined&&typeof flag!=="boolean"))return false;
 if(value.encounter!==null){const foe=value.encounter;if(!object(foe)||typeof foe.id!=="string"||foe.id.length>80||typeof foe.name!=="string"||foe.name.length>80||!isRpgFoe(foe)||!Number.isInteger(foe.level)||foe.level<1||foe.level>MAX_LEVEL||!Number.isInteger(foe.hp)||!Number.isInteger(foe.maxHp)||foe.maxHp<1||foe.hp<1||foe.hp>foe.maxHp||!Number.isInteger(foe.defense)||foe.defense<1||foe.defense>100||!Number.isInteger(foe.attack)||foe.attack<0||foe.attack>100||!Number.isInteger(foe.round)||foe.round<0||typeof foe.weakened!=="boolean"||foe.playerHidden!==undefined&&typeof foe.playerHidden!=="boolean"||foe.intent!==undefined&&!["strike","heavy","guard","recover"].includes(foe.intent)||foe.exposed!==undefined&&typeof foe.exposed!=="boolean"||foe.braced!==undefined&&typeof foe.braced!=="boolean"||!Array.isArray(foe.log)||foe.log.length>20||foe.log.some(line=>typeof line!=="string"||line.length>240))return false}
 return true;
}
function createSave(profile){
 if(!profile||profile.system!=="mnm"||typeof profile.id!=="string")throw new Error("An M&M character is required.");
 const note=createItem("class-guild-note","Class guild note","document");
 const candle=createItem("trainees-candle","Trainee's Candle","light");
 const level=clampLevel(profile.level),startingLocation=String(profile.startingLocation||profile.startingZone||"Night Harbor");
 const save={version:VERSION,characterId:profile.id,classId:String(profile.classId||""),level,learnedAbilities:Array.isArray(profile.learnedAbilities)?[...new Set(profile.learnedAbilities.filter(x=>typeof x==="string").slice(0,300))]:[],abilityBook:{skills:[],innates:[],spells:[]},memorizedAbilities:Array(ACTION_SLOTS).fill(null),assignedCantrips:[],combat:{autoAttack:false},restedMinutes:0,bindPoint:startingLocation,corpse:null,inventory:{backpack:[note,candle],bags:[null,null,null],belt:[null,null,null]},rpg:createRpgState(profile,level),updatedAt:new Date().toISOString()};seedStartingAbilities(save,profile);return save;
}
function validItem(item){
 return object(item)&&typeof item.id==="string"&&/^[a-z0-9_-]{1,80}$/i.test(item.id)&&typeof item.name==="string"&&item.name.trim().length>0&&item.name.length<=120&&itemKinds.has(item.kind)&&typeof item.source==="string"&&item.source.length<=120&&(item.weight===null||typeof item.weight==="number"&&Number.isFinite(item.weight)&&item.weight>=0)&&(item.read===undefined||typeof item.read==="boolean")&&(item.lit===undefined||typeof item.lit==="boolean");
}
function validInventory(value){
 if(!object(value)||!Array.isArray(value.backpack)||value.backpack.length>200||value.backpack.some(item=>!validItem(item))||!Array.isArray(value.bags)||value.bags.length!==3||!Array.isArray(value.belt)||value.belt.length!==3||value.belt.some(item=>item!==null&&!validItem(item)))return false;
 if(value.bags.some(slot=>slot!==null&&(!object(slot)||!validItem(slot.item)||slot.item.kind!=="bag"||!Array.isArray(slot.contents)||slot.contents.length>200||slot.contents.some(item=>!validItem(item)))))return false;
 return true;
}
function validAbility(record,profile){
 return object(record)&&record.source==="official"&&typeof record.id==="string"&&/^[a-z0-9:_-]{1,120}$/i.test(record.id)&&typeof record.name==="string"&&record.name.trim().length>0&&record.name.length<=120&&record.classId===profile.classId&&Number.isInteger(record.level)&&record.level>=1&&record.level<=MAX_LEVEL&&PAGES.includes(record.page);
}
function seedStartingAbilities(save,profile){
 const starter=STARTER_CLASS_ABILITIES[profile?.classId];
 if(!starter||save.level<starter.level)return false;
 let changed=false;
 let record=save.abilityBook[starter.page].find(item=>item.id===starter.id);
 if(!record){record=clone(starter);save.abilityBook[starter.page].push(record);changed=true}
 else if(!record.rpgAction){record.rpgAction=starter.rpgAction;record.rpgStarter=true;changed=true}
 if(!save.learnedAbilities.includes(starter.id)){save.learnedAbilities.push(starter.id);changed=true}
 if(!save.memorizedAbilities.includes(starter.id)){const slot=save.memorizedAbilities.indexOf(null);if(slot>=0){save.memorizedAbilities[slot]=starter.id;changed=true}}
 return changed;
}
function validSave(value,profile){
 if(!object(value)||value.version!==VERSION||value.characterId!==profile?.id||value.classId!==profile?.classId||!Number.isInteger(value.level)||value.level<1||value.level>MAX_LEVEL||!Array.isArray(value.learnedAbilities)||value.learnedAbilities.length>300||value.learnedAbilities.some(id=>typeof id!=="string"||id.length>120)||!object(value.abilityBook)||PAGES.some(page=>!Array.isArray(value.abilityBook[page])||value.abilityBook[page].length>300||value.abilityBook[page].some(record=>!validAbility(record,profile)))||!Array.isArray(value.memorizedAbilities)||value.memorizedAbilities.length!==ACTION_SLOTS||value.memorizedAbilities.some(id=>id!==null&&typeof id!=="string"||typeof id==="string"&&!PAGES.some(page=>value.abilityBook[page].some(record=>record.id===id)))||!Array.isArray(value.assignedCantrips)||value.assignedCantrips.length>10||value.assignedCantrips.some(id=>typeof id!=="string"||!value.abilityBook.spells.some(record=>record.id===id))||!object(value.combat)||typeof value.combat.autoAttack!=="boolean"||!Number.isFinite(value.restedMinutes)||value.restedMinutes<0||value.restedMinutes>RESTED_CAP_MINUTES||!(value.bindPoint===null||typeof value.bindPoint==="string"&&value.bindPoint.length<=120)||!validInventory(value.inventory)||value.rpg!==undefined&&!validRpgState(value.rpg,profile,value.level)||!validDate(value.updatedAt))return false;
 if(value.corpse!==null&&(!object(value.corpse)||!Number.isInteger(value.corpse.level)||value.corpse.level<1||value.corpse.level>MAX_LEVEL||typeof value.corpse.hasItems!=="boolean"||!validDate(value.corpse.createdAt)||!validDate(value.corpse.expiresAt)||Date.parse(value.corpse.expiresAt)<=Date.parse(value.corpse.createdAt)||!validInventory(value.corpse.inventory)||value.corpse.rpgInventory!==undefined&&(!Array.isArray(value.corpse.rpgInventory)||value.corpse.rpgInventory.some(entry=>!object(entry)||!RPG_ITEM_DEFS[entry.id]||!Number.isInteger(entry.quantity)||entry.quantity<1||entry.quantity>99))||value.corpse.rpgEquipment!==undefined&&(!object(value.corpse.rpgEquipment)||!["weapon","armor"].every(slot=>value.corpse.rpgEquipment[slot]===null||typeof value.corpse.rpgEquipment[slot]==="string"&&RPG_ITEM_DEFS[value.corpse.rpgEquipment[slot]]?.slot===slot))||(value.corpse.bindPoint!==null&&typeof value.corpse.bindPoint!=="string")))return false;
 if(value.corpse?.locationId!==undefined&&(typeof value.corpse.locationId!=="string"||!FOES[value.corpse.locationId]))return false;
 if(TRUE_CASTER_CLASSES.has(value.classId)===false&&value.assignedCantrips.length)return false;
 return true;
}
function read(profile){
 if(!profile||profile.system!=="mnm")return {ok:false,error:"M&M character is required."};
 if(window.soaSaveRules?.isIntegrityBlocked?.())return {ok:false,error:"Saved data is paused until the character archive is recovered."};
 const stored=window.soaSaveRules?.readStoredJSON?.(KEY);
 if(!stored?.ok)return {ok:false,error:"M&M system data could not be read safely."};
 if(stored.missing){
  const save=createSave(profile);
  try{localStorage.setItem(KEY,JSON.stringify(save));return {ok:true,save,created:true}}
  catch(error){window.soaReportStorageFailure?.("M&M system data could not be saved. Check available device storage.");return {ok:false,error:"M&M system data could not be saved."}}
 }
 if(!validSave(stored.value,profile)){
  window.soaSaveRules?.reportCorruption?.(KEY);
  return {ok:false,error:"M&M system data did not match this character and was preserved."};
 }
 let changed=false;
 if(!stored.value.rpg){stored.value.rpg=createRpgState(profile,stored.value.level);changed=true}
 if(seedStartingAbilities(stored.value,profile))changed=true;
 const foe=stored.value.rpg.encounter;
 if(foe){if(!foe.intent){foe.intent="strike";changed=true}if(typeof foe.exposed!=="boolean"){foe.exposed=false;changed=true}if(typeof foe.braced!=="boolean"){foe.braced=false;changed=true}}
 if(stored.value.combat.autoAttack){stored.value.combat.autoAttack=false;logRpg(stored.value.rpg,"Legacy auto-attack was disabled. Combat now advances only when you choose a turn.");changed=true}
 if(changed){const migrated=persist(profile,stored.value);if(!migrated.ok)return {ok:false,error:migrated.error}}
 return {ok:true,save:stored.value,created:false};
}
function progressFor(profile){
 const loaded=read(profile);
 if(!loaded.ok)return {level:clampLevel(profile?.level),xp:0,xpToNext:xpToNext(profile?.level),totalXp:0,maxLevel:MAX_LEVEL,error:loaded.error};
 const {save}=loaded;return {level:save.level,xp:save.rpg.xp,xpToNext:xpToNext(save.level),totalXp:save.rpg.totalXp,maxLevel:MAX_LEVEL,hp:save.rpg.hp,maxHp:save.rpg.maxHp,focus:save.rpg.focus,maxFocus:save.rpg.maxFocus};
}
function persist(profile,save){
 if(save.rpg)save.level=clampLevel(save.level);
 if(!validSave(save,profile))return {ok:false,error:"M&M system data failed its save check and was not written."};
 if(window.soaSaveRules?.isIntegrityBlocked?.())return {ok:false,error:"Saved data is paused until the character archive is recovered."};
 save.updatedAt=new Date().toISOString();
 try{localStorage.setItem(KEY,JSON.stringify(save));return {ok:true,save}}
 catch(error){window.soaReportStorageFailure?.("M&M system data could not be saved. Check available device storage.");return {ok:false,error:"M&M system data could not be saved."}}
}
function mutate(profile,change){
 const loaded=read(profile);if(!loaded.ok)return loaded;
 const next=clone(loaded.save),result=change(next);
 if(result&&result.error)return {ok:false,error:result.error};
 const saved=persist(profile,next);return saved.ok?{...saved,result}:{ok:false,error:saved.error};
}
function equippedSpellbook(save){return save.inventory.belt.some(item=>item?.kind==="spellbook")}
function recordRestInterval(profile,elapsedMinutes,{atCampfire=false,atInn=false,adverseWeather=false,sheltered=false}={}){
 return mutate(profile,save=>{
  const elapsed=Number(elapsedMinutes);
  if(!Number.isFinite(elapsed)||elapsed<=0)return {error:"Rest time must be a positive number of minutes."};
  if(!atCampfire&&!atInn)return {error:"Rest accumulates only near a campfire or inside an inn."};
  if(adverseWeather&&!sheltered)return {error:"Rest does not accumulate during adverse weather without shelter."};
  save.restedMinutes=Math.min(RESTED_CAP_MINUTES,save.restedMinutes+elapsed*REST_PER_CAMP_MINUTE);
  return null;
 });
}
function experienceMultiplier(profile){
 const loaded=read(profile);return loaded.ok&&loaded.save.restedMinutes>0?1+RESTED_XP_BONUS:1;
}
function groupExperienceEligibility(level,highestLevel){
 const player=Number(level),highest=Number(highestLevel);
 if(!Number.isInteger(player)||!Number.isInteger(highest)||player<1||player>MAX_LEVEL||highest<player||highest>MAX_LEVEL)return false;
 return player<=15?highest-player<=5:player*3>=highest*2;
}
function corpseDurationMs(level,hasItems){
 const current=clampLevel(level);
 if(hasItems)return current===1?2*HOUR:7*DAY;
 if(current<=4)return 30*MINUTE;
 if(current<=29)return 3*HOUR;
 return 24*HOUR;
}
function inventoryItems(inventory){
 const items=[...inventory.backpack,...inventory.belt.filter(Boolean)];
 for(const bag of inventory.bags)if(bag){items.push(bag.item,...bag.contents)}
 return items;
}
function weightSummary(save){
 const items=inventoryItems(save.inventory),known=items.filter(item=>typeof item.weight==="number");
 return {knownWeight:known.reduce((total,item)=>total+item.weight,0),unknownCount:items.length-known.length,totalItems:items.length,capacity:null,encumbered:null};
}
function recordDeath(profile,now=Date.now(),locationId){
 return mutate(profile,save=>{
  const current=Number(now);if(!Number.isFinite(current))return {error:"Death time is invalid."};
  if(save.corpse&&Date.parse(save.corpse.expiresAt)>current)return {error:"Recover the existing corpse before recording another death."};
  const inventory=clone(save.inventory),customItems=clone(save.rpg.inventory),hasItems=inventoryItems(inventory).length>0||customItems.length>0,expiresAt=new Date(current+corpseDurationMs(save.level,hasItems)).toISOString();
  const fallbackLocation=FOES[profile.startingLocation]?profile.startingLocation:"night-harbor";
  save.corpse={level:save.level,hasItems,createdAt:new Date(current).toISOString(),expiresAt,bindPoint:save.bindPoint,locationId:FOES[locationId]?locationId:fallbackLocation,inventory,rpgInventory:customItems,rpgEquipment:clone(save.rpg.equipment)};
  save.inventory=emptyInventory();save.rpg.inventory=[];save.rpg.equipment={weapon:null,armor:null};save.rpg.encounter=null;save.rpg.guarding=false;save.rpg.hp=1;save.rpg.focus=0;save.combat.autoAttack=false;
  return null;
 });
}
function recoverCorpse(profile,now=Date.now(),locationId){
 return mutate(profile,save=>{
  if(!save.corpse)return {error:"There is no saved corpse to recover."};
  const current=Number(now);if(!Number.isFinite(current))return {error:"Recovery time is invalid."};
  if(current>=Date.parse(save.corpse.expiresAt)){save.corpse=null;return {expired:true}}
  if(save.rpg.encounter)return {error:"Leave the encounter before recovering a corpse."};
  const corpseLocation=save.corpse.locationId||save.corpse.bindPoint||profile.startingLocation||"night-harbor";
  if(locationId!==corpseLocation){const region=window.soaMnmAdventure?.regions?.find(item=>item.id===corpseLocation);return {error:"Travel to "+(region?.name||"the corpse's region")+" to recover your items."}}
  save.inventory=clone(save.corpse.inventory);
  if(Array.isArray(save.corpse.rpgInventory)){save.rpg.inventory=clone(save.corpse.rpgInventory);save.rpg.equipment=clone(save.corpse.rpgEquipment||{weapon:null,armor:null})}
  save.rpg.hp=Math.max(1,Math.floor(save.rpg.maxHp/2));save.rpg.focus=Math.floor(save.rpg.maxFocus/2);save.corpse=null;
  return null;
 });
}
function setAutoAttack(profile,value){
 if(value)return {ok:false,error:"Turn-based combat advances only when you choose an action."};
 return mutate(profile,save=>{save.combat.autoAttack=false;return null});
}
function rpgInventoryWeight(rpg){return rpg.inventory.reduce((sum,entry)=>sum+(RPG_ITEM_DEFS[entry.id]?.weight||0)*entry.quantity,0)}
function rpgCarryCapacity(profile){return 12+Math.max(3,Math.trunc(Number(profile?.stats?.str)||10))}
function hasRpgItem(rpg,id){return rpg.inventory.some(entry=>entry.id===id&&entry.quantity>0)}
function equippedItem(rpg,slot){return rpg.equipment?.[slot]||null}
function equipmentBonus(rpg,slot,key){return RPG_ITEM_DEFS[equippedItem(rpg,slot)]?.[key]||0}
function addRpgItem(rpg,profile,id,quantity=1){
 const item=RPG_ITEM_DEFS[id],count=Math.trunc(Number(quantity));
 if(!item||!Number.isInteger(count)||count<1||count>99)return {ok:false,error:"That project item is not available."};
 if(rpgInventoryWeight(rpg)+item.weight*count>rpgCarryCapacity(profile))return {ok:false,error:"Your custom carry limit is full. Sell or discard something before taking more."};
 const existing=rpg.inventory.find(entry=>entry.id===id);
 if(existing){if(existing.quantity+count>99)return {ok:false,error:"That stack is full."};existing.quantity+=count}
 else{if(rpg.inventory.length>=40)return {ok:false,error:"Your custom pack has no free item slots."};rpg.inventory.push({id,quantity:count})}
 return {ok:true,item:item.name,quantity:count};
}
function removeRpgItem(rpg,id,quantity=1){
 const entry=rpg.inventory.find(item=>item.id===id),count=Math.trunc(Number(quantity));
 if(!entry||!Number.isInteger(count)||count<1||entry.quantity<count)return false;
 entry.quantity-=count;if(!entry.quantity)rpg.inventory=rpg.inventory.filter(item=>item.id!==id);return true;
}
function logRpg(rpg,line){rpg.log=[line,...rpg.log].slice(0,30)}
function rpgDefense(profile,save){return 10+statModifier(profile,"agi")+equipmentBonus(save.rpg,"armor","defense")+Math.floor((save.level-1)/2)}
function rollDie(random,max=20){return Math.max(1,Math.min(max,Math.floor(Number(random())*max)+1))}
function rollText(die,modifier,total,target,targetName){return "d20 "+die+" "+(modifier<0?"− ":"+ ")+Math.abs(modifier)+" = "+total+" vs "+targetName+" "+target}
function grantExperience(save,baseAmount){
 const bonus=save.restedMinutes>0?Math.floor(baseAmount*RESTED_XP_BONUS):0,amount=baseAmount+bonus;
 if(bonus)save.restedMinutes=Math.max(0,save.restedMinutes-1);
 const rpg=save.rpg;rpg.xp+=amount;rpg.totalXp+=amount;const levels=[];
 while(save.level<MAX_LEVEL&&rpg.xp>=xpToNext(save.level)){
  rpg.xp-=xpToNext(save.level);save.level++;rpg.maxHp+=5;rpg.hp=rpg.maxHp;
  if(save.level%2===0){rpg.maxFocus=Math.min(40,rpg.maxFocus+1);rpg.focus=rpg.maxFocus}
  levels.push(save.level);
 }
 if(save.level>=MAX_LEVEL)rpg.xp=0;
 return {amount,restedBonus:bonus,levels,next:xpToNext(save.level)};
}
const FOE_MOVE_NAMES=Object.freeze({
 "Dune jackal":{strike:"Snap",heavy:"Pouncing bite",guard:"Circle for an opening",recover:"Catch its breath"},
 "Saltwind viper":{strike:"Quick strike",heavy:"Coiled lunge",guard:"Withdraw behind stone",recover:"Gather itself"},
 "Quay cutpurse":{strike:"Knife jab",heavy:"Desperate slash",guard:"Parry",recover:"Regain footing"},
 "Heap runner":{strike:"Quick jab",heavy:"Crate rush",guard:"Duck behind freight",recover:"Catch its breath"},
 "Blind-echo skitter":{strike:"Scraping swipe",heavy:"Echoing lunge",guard:"Fold into the tunnel",recover:"Pause to listen"},
 "Lost lift warden":{strike:"Iron swing",heavy:"Crushing drop",guard:"Lock its frame",recover:"Reset its gears"},
 "Blightwood stalker":{strike:"Thorn swipe",heavy:"Rooted lunge",guard:"Close its boughs",recover:"Recoil into the brush"},
 "Mossback wolf":{strike:"Bite",heavy:"Driving pounce",guard:"Circle low",recover:"Shake off dust"},
 "Thorn-snag prowler":{strike:"Raking claw",heavy:"Low rush",guard:"Tangle in thorn cover",recover:"Regain its breath"},
 "Branchlight wisp":{strike:"Flash of light",heavy:"Branchlight burst",guard:"Fold into leaves",recover:"Gather its glow"},
 "Mossback guardian":{strike:"Bark-fist",heavy:"Root-breaking blow",guard:"Raise a bark shield",recover:"Settle its stance"},
 "Fae-touched hound":{strike:"Quick bite",heavy:"Leaping bite",guard:"Circle the trail",recover:"Watch for movement"},
 "Deepstone watcher":{strike:"Stone fist",heavy:"Falling hammer",guard:"Set its stone guard",recover:"Reform its stance"},
 "Shadow-sworn prowler":{strike:"Knife cut",heavy:"Shadowing lunge",guard:"Fade behind cover",recover:"Regain composure"},
 "Tunnel devourer":{strike:"Mandible snap",heavy:"Burrowing charge",guard:"Curl beneath its plates",recover:"Gather itself"}
});
function chooseNextEnemyIntent(random,previous=""){
 const roll=rollDie(random,100);
 let intent=roll<=58?"strike":roll<=80?"heavy":roll<=92?"guard":"recover";
 if(intent===previous)intent=intent==="strike"?"heavy":"strike";
 return intent;
}
function enemyIntentTitle(foe){
 return FOE_MOVE_NAMES[foe?.name]?.[foe?.intent]||({strike:"Quick attack",heavy:"Heavy windup",guard:"Guard",recover:"Recover"}[foe?.intent]||"Quick attack");
}
function enemyIntentDetail(foe){
 const descriptions={
  strike:"A standard attack is coming. Guard raises your defense and halves damage if it hits.",
  heavy:"A powerful blow is winding up. A successful Feint interrupts it; Guard can reduce the hit.",
  guard:"The foe will brace, gaining +2 guard against your next Strike. A successful Feint breaks the stance.",
  recover:"The foe will recover 4 Health. A successful Feint interrupts the recovery."
 };
 return descriptions[foe?.intent]||descriptions.strike;
}
function createEncounter(profile,locationId,serial,random,characterLevel=profile?.level){
 const place=FOES[locationId]?locationId:"night-harbor",choices=FOES[place],template=choices[rollDie(random,choices.length)-1],level=clampLevel((Number(characterLevel)||1)+rollDie(random,3)-2);
 return {id:"rpg-foe-"+serial,name:template[0],description:template[1],locationId:place,level,maxHp:14+7*level,hp:14+7*level,defense:11+Math.floor(level/2),attack:1+Math.floor(level*.6),round:0,intent:"strike",weakened:false,exposed:false,braced:false,playerHidden:false,log:[template[1]]};
}
function isRpgFoe(value){return FOES[value?.locationId]?.some(row=>row[0]===value?.name)||false}
function attackFoe(save,profile,foe,random,{ability=null,bonusDamage=0}={}){
 const rpg=save.rpg,stat=ability?.stat||primaryStat(profile),die=rollDie(random),weaponAttack=equipmentBonus(rpg,"weapon","attack"),opening=foe.exposed?2:0,guard=foe.defense+(foe.braced?2:0),modifier=statModifier(profile,stat)+Math.floor((save.level-1)/2)+weaponAttack+opening;
 const total=die+modifier,hit=die===20||die!==1&&total>=guard,label=ability?.name||"Strike",wasExposed=!!foe.exposed,check=rollText(die,modifier,total,guard,"guard");
 if(!hit){foe.exposed=false;foe.braced=false;return {hit:false,roll:die,modifier,total,damage:0,defense:guard,line:label+" · "+check+" · miss."}}
 const weaponDamage=equipmentBonus(rpg,"weapon","damage"),base=3+Math.floor((save.level-1)/4)+weaponDamage+Math.max(-2,statModifier(profile,stat)),openingBonus=ability?.rpgAction==="backstab"&&foe.playerHidden?Math.max(0,weaponDamage):0,exposedDamage=wasExposed?3:0,damage=Math.max(1,base+openingBonus+exposedDamage+bonusDamage+(die===20?5:0));
 foe.hp=Math.max(0,foe.hp-damage);foe.exposed=false;foe.braced=false;
 return {hit:true,roll:die,modifier,total,damage,defense:guard,line:label+" · "+check+" · hits for "+damage+(die===20?" critical damage":"")+(wasExposed?" through the opening":".")};
}
function enemyExchange(save,profile,foe,random,{interrupt=false,stoppedBy=""}={}){
 const rpg=save.rpg,intent=foe.intent||"strike";
 let damage=0,line="",roll=null,total=null,modifier=null,defense=null,healed=0;
 if(stoppedBy){
  line=stoppedBy+" stops "+foe.name+"'s "+enemyIntentTitle(foe)+".";
 }else if(foe.playerHidden){
  rpg.guarding=false;line=foe.name+" searches the shadows and loses your position.";
 }else if(interrupt&&intent!=="strike"){
  foe.braced=false;line="Your feint interrupts "+foe.name+"'s "+enemyIntentTitle({...foe,intent})+".";
 }else if(intent==="guard"){
  foe.braced=true;line=foe.name+" braces; its next guard rises by 2.";
 }else if(intent==="recover"){
  healed=Math.min(4,foe.maxHp-foe.hp);foe.hp+=healed;line=healed?foe.name+" recovers "+healed+" Health.":foe.name+" tries to recover, but is already at full Health.";
 }else{
  const die=rollDie(random),heavy=intent==="heavy",coverPenalty=foe.exposed?2:0,attackBonus=heavy?2:0;
  modifier=foe.attack+attackBonus-coverPenalty;total=die+modifier;roll=die;defense=rpgDefense(profile,save)+(rpg.guarding?4:0);
  const hit=die===20||die!==1&&total>=defense,check=rollText(die,modifier,total,defense,"Defense");
  if(hit){
   damage=Math.max(1,2+Math.floor(foe.level/2)+rollDie(random,4)+(heavy?2:0)-(foe.weakened?2:0)-equipmentBonus(rpg,"armor","damageReduction"));
   if(rpg.guarding)damage=Math.ceil(damage/2);
   const absorbed=foe.heritageWard?Math.min(damage,6):0;damage-=absorbed;if(absorbed)foe.heritageWard=false;
   rpg.hp=Math.max(0,rpg.hp-damage);
   line=foe.name+" · "+check+" · hits for "+damage+(heavy?" with its heavy move.":".")+(absorbed?" Your ward absorbs "+absorbed+" damage and fades.":"");
  }else line=foe.name+" · "+check+" · misses"+(heavy?" with its heavy move.":".");
  foe.weakened=false;
 }
 rpg.guarding=false;foe.round++;
 const prior=intent;foe.intent=chooseNextEnemyIntent(random,prior);
 const intentLine=foe.name+" prepares "+enemyIntentTitle(foe)+".";
 foe.log=[intentLine,line,...foe.log].slice(0,20);
 return {hit:damage>0,damage,line,roll,total,modifier,defense,healed,intent:prior,nextIntent:foe.intent,intentLine};
}
function storeRpgCorpse(save,now=Date.now(),locationId){
 const rpg=save.rpg,standardInventory=clone(save.inventory),customInventory=clone(rpg.inventory),hasItems=inventoryItems(standardInventory).length>0||customInventory.length>0;
 const expiresAt=new Date(Number(now)+corpseDurationMs(save.level,hasItems)).toISOString();
 save.corpse={level:save.level,hasItems,createdAt:new Date(Number(now)).toISOString(),expiresAt,bindPoint:save.bindPoint,locationId:FOES[locationId]?locationId:save.bindPoint||"night-harbor",inventory:standardInventory,rpgInventory:customInventory,rpgEquipment:clone(rpg.equipment)};
 save.inventory=emptyInventory();rpg.inventory=[];rpg.equipment={weapon:null,armor:null};rpg.encounter=null;rpg.guarding=false;rpg.hp=1;rpg.focus=0;save.combat.autoAttack=false;
}
function startEncounter(profile,locationId="night-harbor",random=Math.random){
 return mutate(profile,save=>{
  const rpg=save.rpg;if(rpg.encounter)return {error:"Finish or leave the current encounter first."};
  if(rpg.hp<=0)return {error:"Recover your gear and rest before starting another encounter."};
  rpg.encounterSerial++;rpg.encounter=createEncounter(profile,locationId,rpg.encounterSerial,random,save.level);rpg.guarding=false;save.combat.autoAttack=false;
  logRpg(rpg,"Encounter started: "+rpg.encounter.name+" (level "+rpg.encounter.level+").");return {encounter:clone(rpg.encounter)};
 });
}
function combatHeritage(profile){
 const feature=window.soaMnmRules?.racialAbilities?.[profile?.raceId];
 return feature?.mode==="combat"&&feature.combatAction?feature:null;
}
// Both the button and the turn resolver use the same eligibility rules. Missing
// flags in an older encounter mean its heritage has not been used.
function heritageBlocked(id,rpg,foe){
 if(foe.heritageUsed)return "Used this encounter.";
 if(foe.playerHidden)return "Finish your Stealth opening first.";
 switch(id){
  case "brace":return foe.intent==="heavy"?"":"Wait for a heavy windup.";
  case "assault":return "";
  case "ambush":return foe.exposed?"":"Expose the foe with a successful Feint first.";
  case "flank":case "weaken":return ["guard","recover"].includes(foe.intent)?"":"Wait for the foe to guard or recover.";
  case "ward":return rpg.focus>0?"":"Requires 1 Focus.";
  case "recover":return rpg.hp*2<=rpg.maxHp?"":"Available at half Health or less.";
  case "riptide":return rpg.focus>=rpg.maxFocus?"Your Focus is full.":["strike","heavy"].includes(foe.intent)?"":"Wait for an incoming attack.";
  default:return "This heritage has no combat action.";
 }
}
function resolveRpgAction(profile,action,{random=Math.random,now=Date.now,returnToBindPoint}={}){
 const result=mutate(profile,save=>{
  const rpg=save.rpg,foe=rpg.encounter;
  if(!foe)return {error:"Find a foe before choosing a combat action."};
  if(rpg.hp<=0)return {error:"Recover your character and gear before continuing."};
  let playerLine="",usedItem=null,rolled=null,interruptEnemy=false,stoppedBy="";
  if(action==="technique"){
   if(rpg.focus<2)return {error:"Not enough Focus for the retired custom class technique."};
   return {error:"Class techniques are unavailable unless they are listed as verified, memorized abilities."};
  }
  if(action==="attack"||action==="strike"){
   if(profile.classId==="rogue"&&foe.playerHidden)return {error:"You are hidden; use Backstab while the opening lasts."};
   const strike=attackFoe(save,profile,foe,random);playerLine=strike.line;rolled={roll:strike.roll,modifier:strike.modifier,total:strike.total,dc:strike.defense,damage:strike.damage};
   if(strike.hit)rpg.focus=Math.min(rpg.maxFocus,rpg.focus+1);
  }else if(action==="stealth"){
   if(profile.classId!=="rogue")return {error:"Only Rogues can enter Stealth in this custom combat."};
   if(foe.playerHidden)return {error:"You are already hidden; use Backstab."};
   const die=rollDie(random),modifier=statModifier(profile,"agi"),total=die+modifier,dc=10+foe.level;rolled={roll:die,modifier,total,dc,stat:"agi"};
   if(die===20||die!==1&&total>=dc){foe.playerHidden=true;save.combat.autoAttack=false;playerLine="You enter Stealth · "+rollText(die,modifier,total,dc,"DC")+" · Backstab is ready."}
   else playerLine="You fail to enter Stealth · "+rollText(die,modifier,total,dc,"DC")+".";
  }else if(typeof action==="object"&&action?.type==="ability"){
   const abilityId=String(action.id||""),ability=PAGES.flatMap(page=>save.abilityBook[page]).find(record=>record.id===abilityId);
   if(!ability||!save.learnedAbilities.includes(abilityId)||!save.memorizedAbilities.includes(abilityId))return {error:"Learn and memorize this ability before using it."};
   if(!validAbility(ability,profile))return {error:"That ability is not a verified record for this class."};
   if(ability.level>save.level)return {error:"This ability is above the character's current level."};
   if(!["strike","backstab"].includes(ability.rpgAction))return {error:"This ability has no custom combat resolution yet."};
   if(ability.rpgAction==="backstab"&&!foe.playerHidden)return {error:"Enter Stealth before using Backstab."};
   if(foe.playerHidden&&ability.rpgAction!=="backstab")return {error:"Use Backstab while you have the opening."};
   const strike=attackFoe(save,profile,foe,random,{ability});playerLine=strike.line;rolled={roll:strike.roll,modifier:strike.modifier,total:strike.total,dc:strike.defense,damage:strike.damage};
   if(ability.rpgAction==="backstab")foe.playerHidden=false;
  }else if(action==="feint"||typeof action==="object"&&action?.type==="feint"){
   if(rpg.focus<1)return {error:"Not enough Focus to attempt a Feint."};
   rpg.focus=Math.max(0,rpg.focus-1);
   const die=rollDie(random),modifier=statModifier(profile,"agi"),total=die+modifier,dc=foe.defense+(foe.braced?2:0),success=die===20||die!==1&&total>=dc;
   rolled={roll:die,modifier,total,dc,success,stat:"agi"};
   if(success){
    foe.exposed=true;foe.braced=false;interruptEnemy=foe.intent!=="strike";
    playerLine="Your feint succeeds · "+rollText(die,modifier,total,dc,"guard")+" · The foe is exposed"+(interruptEnemy?" and its telegraphed move is interrupted.":".");
   }else playerLine="Your feint fails · "+rollText(die,modifier,total,dc,"guard")+" · The foe keeps its announced move.";
  }else if(action==="guard"){
   rpg.guarding=true;rpg.focus=Math.min(rpg.maxFocus,rpg.focus+2);playerLine="You guard: +4 Defense and half damage against the next hit.";
  }else if(typeof action==="object"&&action?.type==="item"){
   const item=RPG_ITEM_DEFS[action.id];if(!item||item.kind!=="consumable"||!hasRpgItem(rpg,action.id))return {error:"That consumable is not in your custom pack."};
   if(item.heal&&rpg.hp>=rpg.maxHp)return {error:"Your health is already full."};
   if(item.focus&&rpg.focus>=rpg.maxFocus)return {error:"Your Focus is already full."};
   removeRpgItem(rpg,action.id);rpg.hp=Math.min(rpg.maxHp,rpg.hp+(item.heal||0));rpg.focus=Math.min(rpg.maxFocus,rpg.focus+(item.focus||0));usedItem=item.name;playerLine="You use "+item.name+".";
  }else if(typeof action==="object"&&action?.type==="racial"){
   const feature=combatHeritage(profile);
   if(!feature||feature.combatAction!==action.id)return {error:"That combat heritage does not belong to this character."};
   const blocked=heritageBlocked(action.id,rpg,foe);if(blocked)return {error:blocked};
   foe.heritageUsed=true;
   switch(action.id){
    case "brace":
     stoppedBy=feature.name;foe.exposed=true;foe.braced=false;
     playerLine=feature.name+": the blow falls wide. Your footing holds and the foe is exposed.";break;
    case "assault":case "ambush":{
     const breaker=action.id==="assault",wasBraced=foe.braced;
     if(breaker)foe.braced=false;
     const strike=attackFoe(save,profile,foe,random,{ability:{name:feature.name,stat:breaker?"str":primaryStat(profile)},bonusDamage:breaker?3:0});
     playerLine=strike.line+(breaker&&wasBraced?" The foe's brace breaks.":"");
     rolled={roll:strike.roll,modifier:strike.modifier,total:strike.total,dc:strike.defense,damage:strike.damage};
     if(!breaker&&strike.hit)stoppedBy=feature.name;
     break;
    }
    case "flank":{
     const enemy=foe.name;rpg.encounter=null;rpg.guarding=false;save.combat.autoAttack=false;
     const line="You escape from "+enemy+" without a reward. "+feature.name+" carries you out of reach.";
     logRpg(rpg,line);return {escaped:true,enemy,line};
    }
    case "weaken":{
     stoppedBy=feature.name;foe.braced=false;const restored=Math.min(4,rpg.maxHp-rpg.hp);rpg.hp+=restored;
     playerLine=feature.name+": the lattice steals the foe's moment of respite."+(restored?" You recover "+restored+" Health.":"");break;
    }
    case "ward":
     rpg.focus--;foe.heritageWard=true;playerLine=feature.name+": you spend 1 Focus. Your ward will absorb up to 6 damage from the next hit.";break;
    case "recover":{
     const healed=Math.min(Math.ceil(rpg.maxHp/5),rpg.maxHp-rpg.hp);rpg.hp+=healed;
     playerLine=feature.name+": you draw breath and recover "+healed+" Health.";break;
    }
    case "riptide":{
     rpg.guarding=true;const restored=Math.min(3,rpg.maxFocus-rpg.focus);rpg.focus+=restored;
     playerLine=feature.name+": you settle into guard and recover "+restored+" Focus.";break;
    }
   }
  }else if(action==="flee"){
   const die=rollDie(random),modifier=statModifier(profile,"agi"),total=die+modifier,dc=10+foe.level;
   if(die===20||die!==1&&total>=dc){rpg.encounter=null;rpg.guarding=false;save.combat.autoAttack=false;logRpg(rpg,"You escape from "+foe.name+" without a reward · "+rollText(die,modifier,total,dc,"DC")+".");return {escaped:true,roll:die,modifier,total,dc,line:"You break away from the encounter."}}
   playerLine="You fail to escape · "+rollText(die,modifier,total,dc,"DC")+".";rolled={roll:die,modifier,total,dc,stat:"agi"};
  }else return {error:"Unknown combat action."};
  logRpg(rpg,playerLine);
  if(foe.hp<=0){
   rpg.kills++;const xp=grantExperience(save,30+foe.level*20),coins=4+foe.level*2;rpg.coppers+=coins;
   let lootId,lootRoll=rollDie(random,100);
   if(lootRoll<=42)lootId="healing-poultice";else if(lootRoll<=72)lootId="waybread";else if(lootRoll<=90)lootId="iron-shard";else{const rare={"night-harbor":"saltwind-knife",underdocks:"deep-forged-edge",penshaw:"thornwood-bow",faelindral:"branchguard","ail-vorith":"liftwarden-coat"};lootId=rare[foe.locationId]||"saltwind-knife"}
   const loot=addRpgItem(rpg,profile,lootId,1);const lootText=loot.ok?"Loot: "+RPG_ITEM_DEFS[lootId].name+".":"The pack is full; "+RPG_ITEM_DEFS[lootId].name+" is left at the scene.";
   rpg.encounter=null;rpg.guarding=false;save.combat.autoAttack=false;
   const line="Victory over "+foe.name+". +"+xp.amount+" custom XP, +"+formatCurrency(coins)+". "+lootText+(xp.levels.length?" Level up: "+xp.levels.join(", ")+".":"");logRpg(rpg,line);
   return {victory:true,enemy:foe.name,xp:xp.amount,restedBonus:xp.restedBonus,coins,loot:loot.ok?lootId:null,lootError:loot.error||null,levels:xp.levels,line,roll:rolled};
  }
  const incoming=enemyExchange(save,profile,foe,random,{interrupt:interruptEnemy,stoppedBy});
  logRpg(rpg,incoming.line);if(incoming.intentLine)logRpg(rpg,incoming.intentLine);
  if(rpg.hp<=0){const bindPoint=save.bindPoint||profile.startingLocation||"night-harbor";storeRpgCorpse(save,now(),foe.locationId);logRpg(rpg,"You were defeated. Your carried items are on a recoverable corpse; you wake at your bind point.");return {defeated:true,bindPoint,line:"Defeated by "+foe.name+". Your items were left on a recoverable corpse; there is no custom XP loss."}}
  return {turn:true,line:playerLine+" "+incoming.line,enemyHp:foe.hp,playerHp:rpg.hp,focus:rpg.focus,roll:rolled,enemyRoll:{roll:incoming.roll,modifier:incoming.modifier,total:incoming.total,defense:incoming.defense,damage:incoming.damage,intent:incoming.intent},nextIntent:foe.intent,usedItem};
 });
 if(result.ok&&result.result?.defeated){
  const destination=String(result.result.bindPoint||profile.startingLocation||"night-harbor");(returnToBindPoint||window.soaMnmAdventure?.returnToBindPoint)?.(destination);
 }
 return result;
}
function useRacialCombatTactic(profile,tacticId,options={}){
 return resolveRpgAction(profile,{type:"racial",id:tacticId},options);
}
function claimStoryReward(profile,storyId,baseXp=90){
 return mutate(profile,save=>{
  const id=String(storyId||"");if(!/^[a-z0-9:_-]{1,120}$/i.test(id))return {error:"Story reward identifier is invalid."};
  if(save.rpg.claimedStories.includes(id))return {claimed:false,alreadyClaimed:true};
  save.rpg.claimedStories.push(id);const xp=grantExperience(save,Math.max(1,Math.trunc(Number(baseXp)||90)));
  logRpg(save.rpg,"Story resolved: +"+xp.amount+" custom XP."+(xp.levels.length?" Level up: "+xp.levels.join(", ")+".":""));return {claimed:true,xp:xp.amount,levels:xp.levels};
 });
}
function restAtSafeHaven(profile,locationId){
 return mutate(profile,save=>{
  if(!SAFE_HAVENS.has(locationId))return {error:"Travel to a settlement before resting safely."};
  if(save.rpg.encounter)return {error:"Leave the encounter before resting."};
  save.rpg.hp=save.rpg.maxHp;save.rpg.focus=save.rpg.maxFocus;save.rpg.guarding=false;
  save.restedMinutes=Math.min(RESTED_CAP_MINUTES,save.restedMinutes+2*REST_PER_CAMP_MINUTE);
  logRpg(save.rpg,"You rest safely, recover fully, and bank custom Rested time.");return {restedMinutes:save.restedMinutes};
 });
}
function useRpgItem(profile,id){
 return mutate(profile,save=>{
  const item=RPG_ITEM_DEFS[id];if(!item||item.kind!=="consumable"||!hasRpgItem(save.rpg,id))return {error:"That consumable is not in your custom pack."};
  if(save.rpg.encounter)return {error:"Use consumables as a combat action while an encounter is active."};
  if(item.heal&&save.rpg.hp>=save.rpg.maxHp)return {error:"Your health is already full."};
  if(item.focus&&save.rpg.focus>=save.rpg.maxFocus)return {error:"Your Focus is already full."};
  removeRpgItem(save.rpg,id);save.rpg.hp=Math.min(save.rpg.maxHp,save.rpg.hp+(item.heal||0));save.rpg.focus=Math.min(save.rpg.maxFocus,save.rpg.focus+(item.focus||0));
  logRpg(save.rpg,"You use "+item.name+".");return {item:item.name,hp:save.rpg.hp,focus:save.rpg.focus};
 });
}
function equipRpgItem(profile,id){
 return mutate(profile,save=>{
  const item=RPG_ITEM_DEFS[id];if(!item||!["weapon","armor"].includes(item.kind)||!hasRpgItem(save.rpg,id))return {error:"That equipment is not in your custom pack."};
  if(save.rpg.encounter)return {error:"Equipment changes wait until the encounter is over."};
  save.rpg.equipment[item.slot]=id;logRpg(save.rpg,"Equipped "+item.name+".");return {item:item.name,slot:item.slot};
 });
}
function discardRpgItem(profile,id){
 return mutate(profile,save=>{
  if(save.rpg.encounter)return {error:"Items cannot be discarded during an encounter."};
  if(!hasRpgItem(save.rpg,id))return {error:"That item is not in your custom pack."};
  if(Object.values(save.rpg.equipment).includes(id))return {error:"Unequip the item before discarding it."};
  if(!removeRpgItem(save.rpg,id))return {error:"That item could not be removed."};return {discarded:id};
 });
}
function purchaseRpgItem(profile,id,quantity=1,locationId){
 return mutate(profile,save=>{
  if(locationId!=="night-harbor")return {error:"Travel to Night Harbor to shop."};
  if(save.rpg.encounter)return {error:"Finish the encounter before shopping."};
  const item=RPG_ITEM_DEFS[id],count=Math.trunc(Number(quantity));if(!item||!Number.isInteger(count)||count<1||count>10)return {error:"Choose a valid item and quantity."};
  const cost=item.price*count;if(save.rpg.coppers<cost)return {error:"You need "+formatCurrency(cost)+" for that purchase."};
  const added=addRpgItem(save.rpg,profile,id,count);if(!added.ok)return {error:added.error};save.rpg.coppers-=cost;logRpg(save.rpg,"Bought "+count+" "+item.name+(count===1?"":"s")+" for "+formatCurrency(cost)+".");return {item:id,quantity:count,cost};
 });
}
function sellRpgItem(profile,id,quantity=1,locationId){
 return mutate(profile,save=>{
  if(locationId!=="night-harbor")return {error:"Travel to Night Harbor to sell equipment."};
  if(save.rpg.encounter)return {error:"Finish the encounter before selling items."};
  const item=RPG_ITEM_DEFS[id],count=Math.trunc(Number(quantity));if(!item||!Number.isInteger(count)||count<1||!hasRpgItem(save.rpg,id))return {error:"That item is not available to sell."};
  if(item.price<=0)return {error:"That item has no custom resale value."};
  if(Object.values(save.rpg.equipment).includes(id))return {error:"Unequip that item before selling it."};
  const entry=save.rpg.inventory.find(row=>row.id===id);if(entry.quantity<count)return {error:"You do not have that many."};
  removeRpgItem(save.rpg,id,count);const coins=Math.max(1,Math.floor(item.price*.4))*count;save.rpg.coppers+=coins;logRpg(save.rpg,"Sold "+item.name+" for "+formatCurrency(coins)+".");return {item:id,quantity:count,coins};
 });
}
function toggleCandle(profile){
 return mutate(profile,save=>{
  const candle=save.inventory.backpack.find(item=>item.id==="trainees-candle");
  if(!candle)return {error:"The Trainee's Candle is not in the backpack."};
  candle.lit=!candle.lit;return null;
 });
}
function markGuildNoteRead(profile){
 return mutate(profile,save=>{
  const note=save.inventory.backpack.find(item=>item.id==="class-guild-note");
  if(!note)return {error:"The class guild note is not in the backpack."};
  note.read=true;return null;
 });
}
function scribeAbility(profile,record){
 return mutate(profile,save=>{
  if(!validAbility(record,profile))return {error:"Only verified official ability records for this class can be scribed."};
  if(record.level>save.level)return {error:"This ability's level is above the character's current level."};
  if(record.page==="spells"&&!equippedSpellbook(save))return {error:"Equip a spellbook in a belt slot before scribing spells."};
  if(save.abilityBook[record.page].some(item=>item.id===record.id))return {error:"This ability is already scribed."};
  save.abilityBook[record.page].push(clone(record));
  if(!save.learnedAbilities.includes(record.id))save.learnedAbilities.push(record.id);
  return null;
 });
}
function memorizeAbility(profile,abilityId,slotIndex){
 return mutate(profile,save=>{
  if(!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>=ACTION_SLOTS)return {error:"Choose one of the ten ability slots."};
  const record=PAGES.flatMap(page=>save.abilityBook[page]).find(item=>item.id===abilityId);
  if(!record||!save.learnedAbilities.includes(abilityId))return {error:"Scribe and learn this ability before memorizing it."};
  if(record.level>save.level)return {error:"This ability's level is above the character's current level."};
  if(record.page==="spells"&&!equippedSpellbook(save))return {error:"Equip a spellbook in a belt slot before memorizing spells."};
  save.memorizedAbilities[slotIndex]=abilityId;return null;
 });
}
function groupXpText(level,highest){
 return groupExperienceEligibility(level,highest)
  ?"Eligible for group experience under the documented level rule."
  :"Not eligible under the documented level rule.";
}
function card(title,body){
 const box=document.createElement("section");box.className="soa-mnm-system-card";
 const h=document.createElement("h3");h.textContent=title;box.append(h);
 const p=document.createElement("p");p.textContent=body;box.append(p);return box;
}
function kicker(text){
 const e=document.createElement("div");e.className="soa-mnm-kicker";e.textContent=text;return e;
}
function link(label,url){
 const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label;return a;
}
function makeSystemButton(label,onClick,disabled=false){const button=document.createElement("button");button.type="button";button.className="soa-mnm-system-button";button.textContent=label;button.disabled=!!disabled;button.onclick=onClick;return button}
function statusNode(){const p=document.createElement("p");p.className="soa-mnm-live soa-mnm-system-live";p.setAttribute("role","status");p.setAttribute("aria-live","polite");return p}
function updateFromResult(result,onChange,status){if(!result.ok){status.textContent=result.error||"The action could not be saved.";return false}onChange?.();return true}
let autoAttackTimer=null,autoAttackKey="";
function renderCombat(profile,onChange,context={}){
 const panel=document.createElement("section");panel.className="soa-mnm-adventure-panel soa-mnm-system-view";
 panel.append(kicker("M&M: RPG CUSTOM RULES · TURN-BASED COMBAT"));
 const h=document.createElement("h2");h.textContent="Combat";panel.append(h);
 const state=read(profile);if(!state.ok){panel.append(card("Combat paused",state.error));return panel}
 const save=state.save,rpg=save.rpg,locationId=FOES[context.locationId]?context.locationId:"night-harbor";
 const status=statusNode();panel.append(status);
 const act=action=>{const result=resolveRpgAction(profile,action,{returnToBindPoint:context.returnToBindPoint});updateFromResult(result,onChange,status)};
 const foe=rpg.encounter;
 if(!foe){
  const regions=window.soaMnmAdventure?.regions||[],place=regions.find(row=>row.id===locationId);
  const aftermath=rpg.log.find(line=>/^(Victory over |You escape from |You were defeated\.|A remembered tale persuades)/.test(line));
  if(aftermath)panel.append(card("Last encounter",aftermath));
  if(context.onResumeAdventure)panel.append(makeSystemButton("Continue the adventure",context.onResumeAdventure));
  if(context.onOpenWorld)panel.append(makeSystemButton("Return to city travel",context.onOpenWorld));
  panel.append(card(place?.name||"Beyond the city gates","Health "+rpg.hp+" / "+rpg.maxHp+" · Focus "+rpg.focus+" / "+rpg.maxFocus+". Seek a local opponent when you are ready."));
  panel.append(makeSystemButton("Find a foe",()=>{const result=startEncounter(profile,locationId);updateFromResult(result,onChange,status)}));
 }else{
  h.textContent=foe.name;
  const encounter=card("Round "+(foe.round+1)+" · Foe intent: "+enemyIntentTitle(foe),enemyIntentDetail(foe));
  const hp=document.createElement("p");hp.textContent="Foe health "+foe.hp+" / "+foe.maxHp+" · Guard "+(foe.defense+(foe.braced?2:0))+(foe.exposed?" · Exposed":"");encounter.append(hp);
  const vitals=document.createElement("p");vitals.textContent="Your health "+rpg.hp+" / "+rpg.maxHp+" · Focus "+rpg.focus+" / "+rpg.maxFocus+(foe.heritageWard?" · Ward ready: 6 damage":"");encounter.append(vitals);panel.append(encounter);
  const actions=document.createElement("div");actions.className="soa-mnm-choice-grid";
  actions.append(makeSystemButton("Strike · take your turn",()=>act("attack"),profile.classId==="rogue"&&!!foe.playerHidden));
  actions.append(makeSystemButton("Feint · AGI · 1 Focus",()=>act("feint"),rpg.focus<1));
  if(profile.classId==="rogue")actions.append(makeSystemButton(foe.playerHidden?"Hidden · Backstab ready":"Enter Stealth · AGI check",()=>act("stealth"),!!foe.playerHidden));
  const usedAbilityIds=new Set();
  for(let i=0;i<ACTION_SLOTS;i++){const id=save.memorizedAbilities[i],ability=id&&PAGES.flatMap(page=>save.abilityBook[page]).find(item=>item.id===id);if(!ability||usedAbilityIds.has(id)||!ability.rpgAction)continue;usedAbilityIds.add(id);const ready=ability.level<=save.level&&(ability.rpgAction!=="backstab"||!!foe.playerHidden),label=ability.name+(ability.rpgAction==="backstab"&&!foe.playerHidden?" · Stealth required":"");actions.append(makeSystemButton(label,()=>act({type:"ability",id:ability.id}),!ready))}
  actions.append(makeSystemButton("Guard · reduce the next hit",()=>act("guard")));
  const consumable=rpg.inventory.find(entry=>RPG_ITEM_DEFS[entry.id]?.kind==="consumable"&&((RPG_ITEM_DEFS[entry.id].heal&&rpg.hp<rpg.maxHp)||(RPG_ITEM_DEFS[entry.id].focus&&rpg.focus<rpg.maxFocus)));
  if(consumable){const item=RPG_ITEM_DEFS[consumable.id];actions.append(makeSystemButton("Use "+item.name+" · "+consumable.quantity+" left",()=>act({type:"item",id:consumable.id})))}
  actions.append(makeSystemButton("Try to escape",()=>act("flee")));
  panel.append(actions);
  const feature=combatHeritage(profile);
  if(feature){
   const blocked=heritageBlocked(feature.combatAction,rpg,foe);
   const heritage=card(feature.name,feature.effect);
   const availability=document.createElement("p");availability.textContent=blocked||"Ready · Once this encounter · Uses your turn";
   heritage.append(availability,makeSystemButton("Use "+feature.name,()=>act({type:"racial",id:feature.combatAction}),!!blocked));
   panel.append(heritage);
  }
 }
 if(foe?.round>0&&rpg.log[0]===foe.log[0]&&rpg.log[2])panel.append(card("Last exchange",rpg.log[2]+" "+rpg.log[1]));
 const log=document.createElement("details");log.className="soa-mnm-system-card";const logHeading=document.createElement("summary");logHeading.textContent="Encounter journal · dice and damage";log.append(logHeading);
 const entries=document.createElement("ol");entries.className="soa-mnm-journal";for(const line of rpg.log.slice(0,12)){const row=document.createElement("li");row.textContent=line;entries.append(row)}log.append(entries);panel.append(log);
 const memorized=save.memorizedAbilities.filter(Boolean).map(id=>PAGES.flatMap(page=>save.abilityBook[page]).find(item=>item.id===id)).filter(Boolean);
 const guide=document.createElement("details");guide.className="soa-mnm-system-card";const guideTitle=document.createElement("summary");guideTitle.textContent="Combat rules and memorized abilities";guide.append(guideTitle);panel.append(guide);
 guide.append(card("Taking a turn","Choose one action to advance the fight. Your action resolves first. A foe still standing can respond. A basic Strike costs no Focus and restores one Focus on a hit. Combat uses original M&M: RPG rules."));
 guide.append(card("Memorized abilities",memorized.length?memorized.map(item=>item.name+" · level "+item.level).join(" · "):"No verified M&M abilities are memorized. Basic Strike, Guard, Feint, items, and escape remain available."));
 guide.append(card("Using class abilities","Only learned, memorized, class-matching M&M ability records can appear here. This game uses separate custom d20 resolution. Backstab requires Stealth and gains the custom exposed-opening bonus; official M&M damage ratios and cooldowns are not simulated."));
 const sources=document.createElement("p");sources.className="soa-mnm-system-sources";sources.append(link("Official combat controls and ability rules","https://monstersandmemories.com/new-player-guide"));const classSource=STARTER_CLASS_ABILITIES[profile.classId]?.sourceUrl;if(classSource)sources.append(document.createTextNode(" · "),link("Official class ability Deep Dive",classSource));guide.append(sources);
 return panel;
}
function renderProgress(profile,onChange,context={}){
 const panel=document.createElement("section");panel.className="soa-mnm-adventure-panel soa-mnm-system-view";panel.append(kicker("M&M: RPG CUSTOM RULES \u00b7 EXPERIENCE AND LEVELS"));
 const h=document.createElement("h2");h.textContent="Progress";panel.append(h);
 const state=read(profile);if(!state.ok){panel.append(card("Progress paused",state.error));return panel}
 const save=state.save,rpg=save.rpg,next=xpToNext(save.level),fraction=next?Math.max(0,Math.min(1,rpg.xp/next)):1;
 panel.append(card("Level "+save.level+" / "+MAX_LEVEL,"Custom progression. Defeat local story foes and resolve AI chapters for XP; levels increase health, and every second level increases Focus. The level cap of 60 is documented by M&M; the XP curve here is original."));
  if(profile.classId==="rogue")panel.append(card("Published Rogue milestones","Level 4: first Snaring Poison, learned from a Poison Maker. Level 20: Nimble Evasion. Level 35: Assassin Trait. Level 40: Fury of the Assassin. These are the unlock levels published in the Rogue Deep Dive, not a complete ability schedule."));
 const bar=document.createElement("div");bar.className="soa-mnm-system-card";const barTitle=document.createElement("h3");barTitle.textContent="Experience";bar.append(barTitle);
 const xp=document.createElement("p");xp.textContent=save.level>=MAX_LEVEL?"Maximum level reached · "+rpg.totalXp+" total custom XP":rpg.xp+" / "+next+" XP to level "+(save.level+1)+" · "+rpg.totalXp+" total custom XP";bar.append(xp);
 const meter=document.createElement("div");meter.className="soa-mnm-meter-track";const fill=document.createElement("i");fill.style.width=(fraction*100)+"%";meter.append(fill);bar.append(meter);panel.append(bar);
 panel.append(card("Adventuring record",rpg.kills+" custom encounters won · "+rpg.claimedStories.length+" story rewards claimed · Wallet: "+formatWallet(rpg.coppers)+"."));
 const rest=document.createElement("section");rest.className="soa-mnm-system-card";const rh=document.createElement("h3");rh.textContent="Rest and recovery";rest.append(rh);
 const rp=document.createElement("p");rp.textContent="Rested bank: "+save.restedMinutes+" / "+RESTED_CAP_MINUTES+" minutes. A safe two-minute rest in a settlement fully restores health and Focus and banks up to 20 Rested minutes. This custom interface spends one banked minute per reward; the exact official consumption rate is not published.";rest.append(rp);
 const status=statusNode();rest.append(status);rest.append(makeSystemButton("Rest at a safe haven",()=>{const result=restAtSafeHaven(profile,context.locationId);updateFromResult(result,onChange,status)},!!rpg.encounter||!SAFE_HAVENS.has(context.locationId)));panel.append(rest);
 const group=document.createElement("section");group.className="soa-mnm-system-card";const gh=document.createElement("h3");gh.textContent="Group XP eligibility";group.append(gh);
 const gp=document.createElement("p");gp.textContent="Documented M&M rule: through level 15, you must be within five levels of the highest member; above level 15, you must be at least two-thirds their level.";group.append(gp);
 const label=document.createElement("label");label.className="soa-mnm-system-label";label.textContent="Highest group member level";const input=document.createElement("input");input.className="soa-mnm-system-input";input.type="number";input.min="1";input.max=String(MAX_LEVEL);input.step="1";input.value=String(save.level);label.append(input);group.append(label);
 const result=statusNode();const check=makeSystemButton("Check eligibility",()=>{const highest=Number(input.value);result.textContent=Number.isInteger(highest)&&highest>=1&&highest<=MAX_LEVEL?groupXpText(save.level,highest):"Enter a level from 1 to "+MAX_LEVEL+"."});group.append(check,result);panel.append(group);
 panel.append(card("Official and custom rules","M&M documents kill-focused XP, quest and dungeon rewards, campfire bonuses, and corpse recovery. This project uses its own single-character XP curve, turn-based combat, simple Rested consumption, and chapter rewards. No official XP thresholds or damage values are claimed."));
 const sources=document.createElement("p");sources.className="soa-mnm-system-sources";sources.append(link("Official New Player Guide","https://monstersandmemories.com/new-player-guide"),document.createTextNode(" · "),link("Official XP FAQ","https://account2.monstersandmemories.com/community/faqs/15"));panel.append(sources);return panel;
}
function renderInventory(profile,onChange,context={}){
 const panel=document.createElement("section");panel.className="soa-mnm-adventure-panel soa-mnm-system-view";panel.append(kicker("M&M: RPG ITEMS \u00b7 CUSTOM PACK AND DOCUMENTED SLOTS"));
 const h=document.createElement("h2");h.textContent="Items";panel.append(h);const status=statusNode();panel.append(status);
 const state=read(profile);if(!state.ok){panel.append(card("Inventory paused",state.error));return panel}
 const save=state.save,inv=save.inventory,rpg=save.rpg;
 const custom=document.createElement("section");custom.className="soa-mnm-system-card";const customTitle=document.createElement("h3");customTitle.textContent="Adventurer's pack · custom rules";custom.append(customTitle);
 const customWeight=rpgInventoryWeight(rpg),capacity=rpgCarryCapacity(profile),purse=document.createElement("p");purse.textContent="Custom load "+customWeight+" / "+capacity+" units · Purse: "+formatWallet(rpg.coppers);custom.append(purse);
 const currencyNote=document.createElement("p");currencyNote.className="soa-mnm-note";currencyNote.textContent="Coin values convert automatically: "+CURRENCY_EXCHANGE;custom.append(currencyNote);
 const customList=document.createElement("div");customList.className="soa-mnm-item-list";
 for(const entry of rpg.inventory){const item=RPG_ITEM_DEFS[entry.id];if(!item)continue;const row=document.createElement("article");row.className="soa-mnm-item-row";
  const name=document.createElement("strong");name.textContent=item.name+(entry.quantity>1?" × "+entry.quantity:"")+(Object.values(rpg.equipment).includes(entry.id)?" · Equipped":"");row.append(name);
  const detail=document.createElement("p");detail.textContent=item.description+" Custom weight "+item.weight+" · Value "+formatCurrency(item.price)+(item.kind==="weapon"?" · Attack +"+item.attack+" · Damage +"+item.damage:item.kind==="armor"?" · Defense +"+item.defense:item.kind==="consumable"?" · Heal "+item.heal+" · Focus "+item.focus:"");row.append(detail);
  const actions=document.createElement("div");actions.className="soa-mnm-choice-grid";
  if(item.kind==="weapon"||item.kind==="armor"){const slot=item.slot;actions.append(makeSystemButton(rpg.equipment[slot]===entry.id?"Equipped":"Equip",()=>{const result=equipRpgItem(profile,entry.id);updateFromResult(result,onChange,status)},!!rpg.encounter||rpg.equipment[slot]===entry.id))}
  if(item.kind==="consumable"){const useful=!!((item.heal&&rpg.hp<rpg.maxHp)||(item.focus&&rpg.focus<rpg.maxFocus));actions.append(makeSystemButton("Use",()=>{const result=useRpgItem(profile,entry.id);updateFromResult(result,onChange,status)},!useful||!!rpg.encounter))}
  if(!Object.values(rpg.equipment).includes(entry.id)){actions.append(makeSystemButton("Sell 1",()=>{const result=sellRpgItem(profile,entry.id,1,context.locationId);updateFromResult(result,onChange,status)},!!rpg.encounter||item.price<=0||context.locationId!=="night-harbor"));actions.append(makeSystemButton("Discard 1",()=>{const result=discardRpgItem(profile,entry.id);updateFromResult(result,onChange,status)},!!rpg.encounter))}
  row.append(actions);customList.append(row);
 }
 if(!rpg.inventory.length)customList.append(card("Pack empty","Travel to a settlement market or defeat a custom story foe to find gear."));custom.append(customList);panel.append(custom);
 const market=document.createElement("section");market.className="soa-mnm-system-card";const mh=document.createElement("h3");mh.textContent="Night Harbor market · stock";market.append(mh);const mp=document.createElement("p");mp.textContent=context.locationId==="night-harbor"?"Item prices and carry limits are original M&M: RPG rules. "+CURRENCY_EXCHANGE:"Night Harbor merchants sell this stock. Travel there to buy or sell.";market.append(mp);
 for(const id of ["healing-poultice","waybread","iron-shard","saltwind-knife","liftwarden-coat","thornwood-bow","blightmantle","deep-forged-edge","branchguard"]){const item=RPG_ITEM_DEFS[id],row=document.createElement("div");row.className="soa-mnm-item-row";const title=document.createElement("strong");title.textContent=item.name+" · "+formatCurrency(item.price);const description=document.createElement("p");description.textContent=item.description;row.append(title,description,makeSystemButton("Buy 1",()=>{const result=purchaseRpgItem(profile,id,1,context.locationId);updateFromResult(result,onChange,status)},rpg.coppers<item.price||!!rpg.encounter||context.locationId!=="night-harbor"));market.append(row)}panel.append(market);
 const backpack=document.createElement("section");backpack.className="soa-mnm-system-card";const bh=document.createElement("h3");bh.textContent="Documented starting items";backpack.append(bh);const list=document.createElement("div");list.className="soa-mnm-item-list";
 for(const item of inv.backpack){const row=document.createElement("article");row.className="soa-mnm-item-row";const name=document.createElement("strong");name.textContent=item.name;row.append(name);const detail=document.createElement("p");detail.textContent=item.id==="class-guild-note"?"Official guide starting note. Read it to learn about your class guild; its class-specific text and guild master are not modeled here.":item.id==="trainees-candle"?"Documented light source. Its fuel and burn duration are not published here.":"Weight "+(item.weight===null?"not supplied":item.weight);row.append(detail);
  if(item.id==="class-guild-note")row.append(makeSystemButton(item.read?"Note read":"Read guild note",()=>{const result=markGuildNoteRead(profile);if(result.ok)onChange?.()}));
  if(item.id==="trainees-candle"){const light=makeSystemButton(item.lit?"Extinguish candle":"Light candle",()=>{const result=toggleCandle(profile);if(result.ok)onChange?.()});light.setAttribute("aria-pressed",String(item.lit===true));row.append(light)}list.append(row)}
 if(!inv.backpack.length)list.append(card("Empty","No documented starting items are in the backpack."));backpack.append(list);panel.append(backpack);
 const containers=document.createElement("div");containers.className="soa-mnm-system-grid";const bags=document.createElement("section");bags.className="soa-mnm-system-card";const bagsHeading=document.createElement("h3");bagsHeading.textContent="Bags · 3 slots";bags.append(bagsHeading);inv.bags.forEach((slot,index)=>{const p=document.createElement("p");p.textContent="Bag slot "+(index+1)+": "+(slot?slot.item.name:"empty; bag must be equipped to access its contents");bags.append(p)});containers.append(bags);
 const belt=document.createElement("section");belt.className="soa-mnm-system-card";const beltHeading=document.createElement("h3");beltHeading.textContent="Belt · 3 item slots";belt.append(beltHeading);inv.belt.forEach((item,index)=>{const p=document.createElement("p");p.textContent="Belt slot "+(index+1)+": "+(item?item.name:"empty");belt.append(p)});belt.append(document.createTextNode(equippedSpellbook(save)?" A spellbook is equipped.":" A spellbook is required in a belt slot to scribe or memorize spells; casting already memorized spells does not require it."));containers.append(belt);panel.append(containers);
 panel.append(card("Official weight rules","The official guide says carried item weight counts against a Strength-raised limit; excess weight slows or can immobilize, and teleport spells fail while encumbered. The numerical formula is not published. Custom pack load above is a separate game rule."));
 if(save.corpse){const remaining=Math.max(0,Date.parse(save.corpse.expiresAt)-Date.now()),corpseLocation=save.corpse.locationId||save.corpse.bindPoint||save.bindPoint||"night-harbor",region=window.soaMnmAdventure?.regions?.find(item=>item.id===corpseLocation),atCorpse=context.locationId===corpseLocation,corpseCard=card(remaining?"Corpse recovery":"Corpse expired",remaining?"Documented items and custom gear are on the corpse in "+(region?.name||"the field")+". Time remaining: "+formatDuration(remaining)+".":"This corpse passed its documented recovery window; unrecovered items are lost.");corpseCard.append(makeSystemButton(remaining?atCorpse?"Recover corpse":"Travel to "+(region?.name||"the corpse"):"Clear expired corpse",()=>{if(!remaining){const result=recoverCorpse(profile);if(result.ok)onChange?.();else status.textContent=result.error||"The corpse could not be cleared.";return}if(!atCorpse){status.textContent="Use the World tab to travel to "+(region?.name||"the corpse's region")+".";return}const result=recoverCorpse(profile,Date.now(),context.locationId);updateFromResult(result,onChange,status)},!remaining?false:!atCorpse||!!rpg.encounter));panel.append(corpseCard)}else panel.append(card("Corpse recovery","Custom defeats leave carried items on a recoverable corpse in the encounter region. Official expiry: no items = 30 min at levels 1–4, 3 hr at 5–29, 24 hr at 30+; with items = 2 hr at level 1, 7 days at level 2+."));
 panel.append(card("Class ability records","Official M&M class abilities appear only from source-verified records. This game seeds Rogue Backstab and Archer Point Blank; other classes receive no invented technique stand-ins. The available official sources do not publish a complete current level-by-level ability table for every class."));
 const caster=TRUE_CASTER_CLASSES.has(profile.classId);panel.append(card("Cantrips",caster?"True caster class. An assigned memorized spell can be retained after death; the first cantrip is available at level 4. Later cantrip intervals and spell eligibility data are not loaded.":"Cantrips are documented for Cleric, Druid, Elementalist, Enchanter, Necromancer, Shaman, and Wizard."));
 const sources=document.createElement("p");sources.className="soa-mnm-system-sources";sources.append(link("Official New Player Guide","https://monstersandmemories.com/new-player-guide"),document.createTextNode(" · "),link("Official weight FAQ","https://account2.monstersandmemories.com/community/faqs/45"));panel.append(sources);return panel;
}
function formatDuration(ms){
 const minutes=Math.ceil(ms/MINUTE),days=Math.floor(minutes/(24*60)),hours=Math.floor(minutes/60)%24,remaining=minutes%60;
 return [days?days+"d":"",hours?hours+"h":"",remaining?remaining+"m":""].filter(Boolean).join(" ")||"under 1m";
}
function render(view,profile,onChange,context={}){
 if(view==="combat")return renderCombat(profile,onChange,context);
 if(view==="progress")return renderProgress(profile,onChange,context);
 if(view==="inventory")return renderInventory(profile,onChange,context);
 return null;
}
window.soaMnmSystems=Object.freeze({key:KEY,maxLevel:MAX_LEVEL,actionSlots:ACTION_SLOTS,createSave,validSave,read,progressFor,render,formatCurrency,formatWallet,currencyExchange:CURRENCY_EXCHANGE,groupExperienceEligibility,corpseDurationMs,weightSummary,recordDeath,recoverCorpse,recordRestInterval,experienceMultiplier,scribeAbility,memorizeAbility,startEncounter,resolveRpgAction,useRacialCombatTactic,claimStoryReward,restAtSafeHaven,useRpgItem,equipRpgItem,discardRpgItem,purchaseRpgItem,sellRpgItem,setAutoAttack});
})();

