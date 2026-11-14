(()=>{"use strict";
const KEY="soa-mnm-systems-v1",VERSION=1,MAX_LEVEL=60,ACTION_SLOTS=10;
const PAGES=["skills","innates","spells"];
const TRUE_CASTER_CLASSES=new Set(["cleric","druid","elementalist","enchanter","necromancer","shaman","wizard"]);
const SAFE_HAVENS=new Set(["night-harbor","underdocks","penshaw","faelindral","ail-vorith"]);
const RESTED_XP_BONUS=0.15,RESTED_CAP_MINUTES=20,REST_PER_CAMP_MINUTE=10;
const AUTO_ATTACK_INTERVAL=1600;
const MINUTE=60*1000,HOUR=60*MINUTE,DAY=24*HOUR;
const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const clampLevel=value=>Math.max(1,Math.min(MAX_LEVEL,Math.trunc(Number(value)||1)));
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
const TECHNIQUES=Object.freeze({
 archer:{name:"Pinning Shot",stat:"dex",damage:5,heal:0,focus:2,description:"A measured ranged strike."},
 bard:{name:"Rousing Verse",stat:"cha",damage:3,heal:3,focus:2,description:"A cutting refrain that steadies your resolve."},
 beastmaster:{name:"Pack Command",stat:"str",damage:5,heal:0,focus:2,description:"Drive forward with a practiced hunting call."},
 cleric:{name:"Guiding Light",stat:"wis",damage:4,heal:5,focus:3,description:"Turn a protective prayer into a forceful answer."},
 druid:{name:"Briar Lash",stat:"wis",damage:5,heal:2,focus:3,description:"Call a thorned vine through the enemy's guard."},
 elementalist:{name:"Flare",stat:"int",damage:7,heal:0,focus:3,description:"Shape a short burst of elemental force."},
 enchanter:{name:"Jinx",stat:"cha",damage:4,heal:0,focus:3,description:"Rattle the foe's focus and weaken its next attack."},
 fighter:{name:"Shield Break",stat:"str",damage:6,heal:0,focus:2,description:"Put your weight behind a deliberate opening strike."},
 inquisitor:{name:"Judgment",stat:"wis",damage:5,heal:2,focus:3,description:"Read the opening, then answer with conviction."},
 monk:{name:"Open Palm",stat:"agi",damage:5,heal:0,focus:2,description:"Slip inside the guard with a precise palm strike."},
 necromancer:{name:"Grave Spark",stat:"int",damage:6,heal:0,focus:3,description:"Unleash a contained pulse of grave-cold energy."},
 paladin:{name:"Oathbound Smite",stat:"str",damage:5,heal:3,focus:3,description:"Strike with an oath that steadies you."},
 ranger:{name:"Marked Arrow",stat:"dex",damage:6,heal:0,focus:2,description:"Find a clean line and loose a measured shot."},
 rogue:{name:"Quick Cut",stat:"agi",damage:5,heal:0,focus:2,description:"Exploit a gap before the enemy can close it."},
 shadow_knight:{name:"Dread Strike",stat:"str",damage:6,heal:0,focus:3,description:"A heavy blow backed by an unsettling presence."},
 shaman:{name:"Stormmark",stat:"wis",damage:5,heal:2,focus:3,description:"Shape a brief storm pulse around the weapon's edge."},
 spellblade:{name:"Aether Edge",stat:"int",damage:6,heal:0,focus:3,description:"Carry a flash of gathered aether along a weapon strike."},
 wizard:{name:"Arcane Bolt",stat:"int",damage:7,heal:0,focus:3,description:"Send a compact bolt of controlled arcane force."}
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
 if(value.encounter!==null){const foe=value.encounter;if(!object(foe)||typeof foe.id!=="string"||foe.id.length>80||typeof foe.name!=="string"||foe.name.length>80||!isRpgFoe(foe)||!Number.isInteger(foe.level)||foe.level<1||foe.level>MAX_LEVEL||!Number.isInteger(foe.hp)||!Number.isInteger(foe.maxHp)||foe.maxHp<1||foe.hp<1||foe.hp>foe.maxHp||!Number.isInteger(foe.defense)||foe.defense<1||foe.defense>100||!Number.isInteger(foe.attack)||foe.attack<0||foe.attack>100||!Number.isInteger(foe.round)||foe.round<0||typeof foe.weakened!=="boolean"||!Array.isArray(foe.log)||foe.log.length>20||foe.log.some(line=>typeof line!=="string"||line.length>240))return false}
 return true;
}
function createSave(profile){
 if(!profile||profile.system!=="mnm"||typeof profile.id!=="string")throw new Error("An M&M character is required.");
 const note=createItem("class-guild-note","Class guild note","document");
 const candle=createItem("trainees-candle","Trainee's Candle","light");
 const level=clampLevel(profile.level),startingLocation=String(profile.startingLocation||profile.startingZone||"Night Harbor");
 return {version:VERSION,characterId:profile.id,classId:String(profile.classId||""),level,learnedAbilities:Array.isArray(profile.learnedAbilities)?[...new Set(profile.learnedAbilities.filter(x=>typeof x==="string").slice(0,300))]:[],abilityBook:{skills:[],innates:[],spells:[]},memorizedAbilities:Array(ACTION_SLOTS).fill(null),assignedCantrips:[],combat:{autoAttack:false},restedMinutes:0,bindPoint:startingLocation,corpse:null,inventory:{backpack:[note,candle],bags:[null,null,null],belt:[null,null,null]},rpg:createRpgState(profile,level),updatedAt:new Date().toISOString()};
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
 if(!stored.value.rpg){
  stored.value.rpg=createRpgState(profile,stored.value.level);
  const migrated=persist(profile,stored.value);
  if(!migrated.ok)return {ok:false,error:migrated.error};
 }
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
 return mutate(profile,save=>{save.combat.autoAttack=!!value;return null});
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
function createEncounter(profile,locationId,serial,random){
 const place=FOES[locationId]?locationId:"night-harbor",choices=FOES[place],template=choices[rollDie(random,choices.length)-1],level=clampLevel((Number(profile.level)||1)+rollDie(random,3)-2);
 return {id:"rpg-foe-"+serial,name:template[0],description:template[1],locationId:place,level,maxHp:14+7*level,hp:14+7*level,defense:11+Math.floor(level/2),attack:1+Math.floor(level*.6),round:0,weakened:false,log:[template[1]]};
}
function isRpgFoe(value){return FOES[value?.locationId]?.some(row=>row[0]===value?.name)||false}
function attackFoe(save,profile,foe,random,{technique=false}={}){
 const rpg=save.rpg,ability=technique?TECHNIQUES[profile.classId]||TECHNIQUES.fighter:null,stat=ability?.stat||primaryStat(profile),die=rollDie(random),weaponAttack=equipmentBonus(rpg,"weapon","attack");
 const total=die+statModifier(profile,stat)+Math.floor((save.level-1)/2)+weaponAttack,hit=die===20||die!==1&&total>=foe.defense;
 if(!hit)return {hit:false,roll:die,total,damage:0,line:(ability?.name||"Strike")+" misses ("+total+" vs guard "+foe.defense+")."};
 const weaponDamage=equipmentBonus(rpg,"weapon","damage"),base=3+Math.floor((save.level-1)/4)+weaponDamage+Math.max(-2,statModifier(profile,stat)),damage=Math.max(1,base+(ability?.damage||0)+(die===20?5:0));
 foe.hp=Math.max(0,foe.hp-damage);
 if(ability?.heal)rpg.hp=Math.min(rpg.maxHp,rpg.hp+ability.heal);
 if(ability?.name==="Jinx")foe.weakened=true;
 if(technique)rpg.focus-=ability.focus;
 return {hit:true,roll:die,total,damage,line:(ability?.name||"Strike")+" hits for "+damage+(die===20?" critical damage":"")+" ("+total+" vs guard "+foe.defense+")."};
}
function enemyExchange(save,profile,foe,random){
 const rpg=save.rpg,die=rollDie(random),total=die+foe.attack,bonus=equipmentBonus(rpg,"armor","defense"),guard=rpg.guarding?4:0,defense=rpgDefense(profile,save)+guard,hit=die===20||die!==1&&total>=defense;
 let damage=0,line;
 if(hit){damage=Math.max(1,2+Math.floor(foe.level/2)+rollDie(random,4)-equipmentBonus(rpg,"armor","damageReduction"));if(foe.weakened){damage=Math.max(1,damage-2);foe.weakened=false}if(rpg.guarding)damage=Math.ceil(damage/2);rpg.hp=Math.max(0,rpg.hp-damage);line=foe.name+" hits for "+damage+" ("+total+" vs defense "+defense+")."}
 else{line=foe.name+" misses ("+total+" vs defense "+defense+").";if(foe.weakened)foe.weakened=false}
 rpg.guarding=false;foe.round++;foe.log=[line,...foe.log].slice(0,20);return {hit,damage,line,defense,attack:total};
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
  rpg.encounterSerial++;rpg.encounter=createEncounter(profile,locationId,rpg.encounterSerial,random);rpg.guarding=false;save.combat.autoAttack=false;
  logRpg(rpg,"Encounter started: "+rpg.encounter.name+" (level "+rpg.encounter.level+").");return {encounter:clone(rpg.encounter)};
 });
}
function resolveRpgAction(profile,action,{random=Math.random,now=Date.now,returnToBindPoint}={}){
 const result=mutate(profile,save=>{
  const rpg=save.rpg,foe=rpg.encounter;
  if(!foe)return {error:"Find a foe before choosing a combat action."};
  if(rpg.hp<=0)return {error:"Recover your character and gear before continuing."};
  let playerLine="",usedItem=null,rolled=null;
  if(action==="attack"||action==="technique"){
   const technique=action==="technique"?TECHNIQUES[profile.classId]||TECHNIQUES.fighter:null;
   if(technique&&rpg.focus<technique.focus)return {error:"Not enough Focus for "+technique.name+"."};
   const strike=attackFoe(save,profile,foe,random,{technique:action==="technique"});playerLine=strike.line;rolled={roll:strike.roll,total:strike.total,damage:strike.damage};
   if(strike.hit)rpg.focus=Math.min(rpg.maxFocus,rpg.focus+1);
  }else if(action==="guard"){
   rpg.guarding=true;rpg.focus=Math.min(rpg.maxFocus,rpg.focus+2);playerLine="You brace behind your guard; the next incoming strike is reduced.";
  }else if(typeof action==="object"&&action?.type==="item"){
   const item=RPG_ITEM_DEFS[action.id];if(!item||item.kind!=="consumable"||!hasRpgItem(rpg,action.id))return {error:"That consumable is not in your custom pack."};
   if(item.heal&&rpg.hp>=rpg.maxHp)return {error:"Your health is already full."};
   if(item.focus&&rpg.focus>=rpg.maxFocus)return {error:"Your Focus is already full."};
   removeRpgItem(rpg,action.id);rpg.hp=Math.min(rpg.maxHp,rpg.hp+(item.heal||0));rpg.focus=Math.min(rpg.maxFocus,rpg.focus+(item.focus||0));usedItem=item.name;playerLine="You use "+item.name+".";
  }else if(action==="flee"){
   const die=rollDie(random),total=die+statModifier(profile,"agi"),dc=10+foe.level;
   if(die===20||die!==1&&total>=dc){rpg.encounter=null;rpg.guarding=false;save.combat.autoAttack=false;logRpg(rpg,"You escape from "+foe.name+" without a reward.");return {escaped:true,roll:die,total,dc,line:"You break away from the encounter."}}
   playerLine="You fail to find an opening to escape ("+total+" vs DC "+dc+").";
  }else return {error:"Unknown combat action."};
  logRpg(rpg,playerLine);
  if(foe.hp<=0){
   rpg.kills++;const xp=grantExperience(save,30+foe.level*20),coins=4+foe.level*2;rpg.coppers+=coins;
   let lootId,lootRoll=rollDie(random,100);
   if(lootRoll<=42)lootId="healing-poultice";else if(lootRoll<=72)lootId="waybread";else if(lootRoll<=90)lootId="iron-shard";else{const rare={"night-harbor":"saltwind-knife",underdocks:"deep-forged-edge",penshaw:"thornwood-bow",faelindral:"branchguard","ail-vorith":"liftwarden-coat"};lootId=rare[foe.locationId]||"saltwind-knife"}
   const loot=addRpgItem(rpg,profile,lootId,1);const lootText=loot.ok?"Loot: "+RPG_ITEM_DEFS[lootId].name+".":"The pack is full; "+RPG_ITEM_DEFS[lootId].name+" is left at the scene.";
   rpg.encounter=null;rpg.guarding=false;save.combat.autoAttack=false;
   const line="Victory over "+foe.name+". +"+xp.amount+" custom XP, +"+coins+" custom coppers. "+lootText+(xp.levels.length?" Level up: "+xp.levels.join(", ")+".":"");logRpg(rpg,line);
   return {victory:true,enemy:foe.name,xp:xp.amount,restedBonus:xp.restedBonus,coins,loot:loot.ok?lootId:null,lootError:loot.error||null,levels:xp.levels,line,roll:rolled};
  }
  const incoming=enemyExchange(save,profile,foe,random);logRpg(rpg,incoming.line);
  if(rpg.hp<=0){const bindPoint=save.bindPoint||profile.startingLocation||"night-harbor";storeRpgCorpse(save,now(),foe.locationId);logRpg(rpg,"You were defeated. Your carried items are on a recoverable corpse; you wake at your bind point." );return {defeated:true,bindPoint,line:"Defeated by "+foe.name+". Your items were left on a recoverable corpse; there is no custom XP loss."}}
  return {turn:true,line:playerLine+" "+incoming.line,enemyHp:foe.hp,playerHp:rpg.hp,focus:rpg.focus,roll:rolled,usedItem};
 });
 if(result.ok&&result.result?.defeated){
  const destination=String(result.result.bindPoint||profile.startingLocation||"night-harbor");(returnToBindPoint||window.soaMnmAdventure?.returnToBindPoint)?.(destination);
 }
 return result;
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
  const cost=item.price*count;if(save.rpg.coppers<cost)return {error:"You need "+cost+" custom coppers for that purchase."};
  const added=addRpgItem(save.rpg,profile,id,count);if(!added.ok)return {error:added.error};save.rpg.coppers-=cost;logRpg(save.rpg,"Bought "+count+" "+item.name+(count===1?"":"s")+" for "+cost+" custom coppers.");return {item:id,quantity:count,cost};
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
  removeRpgItem(save.rpg,id,count);const coins=Math.max(1,Math.floor(item.price*.4))*count;save.rpg.coppers+=coins;logRpg(save.rpg,"Sold "+item.name+" for "+coins+" custom coppers.");return {item:id,quantity:count,coins};
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
function stopAutoAttackRunner(){if(autoAttackTimer!==null)clearTimeout(autoAttackTimer);autoAttackTimer=null;autoAttackKey=""}
function syncAutoAttackRunner(profile,save,onChange,context){
 const encounter=save.rpg?.encounter,key=profile.id+":"+(encounter?.id||"");
 if(!save.combat.autoAttack||!encounter){stopAutoAttackRunner();return}
 if(autoAttackKey&&autoAttackKey!==key)stopAutoAttackRunner();
 if(autoAttackTimer!==null)return;
 autoAttackKey=key;
 autoAttackTimer=setTimeout(()=>{
  autoAttackTimer=null;
  const latest=read(profile);
  if(!latest.ok||!latest.save.combat.autoAttack||latest.save.rpg.encounter?.id!==encounter.id){stopAutoAttackRunner();return}
  const result=resolveRpgAction(profile,"attack",{returnToBindPoint:context.returnToBindPoint});
  if(!result.ok){setAutoAttack(profile,false);stopAutoAttackRunner()}
  else if(result.result?.defeated)stopAutoAttackRunner();
  onChange?.();
 },AUTO_ATTACK_INTERVAL);
}
function renderCombat(profile,onChange,context={}){
 const panel=document.createElement("section");panel.className="soa-mnm-adventure-panel soa-mnm-system-view";
 panel.append(kicker("M&M: RPG CUSTOM RULES \u00b7 TURN-BASED COMBAT"));
 const h=document.createElement("h2");h.textContent="Combat";panel.append(h);
 const state=read(profile);if(!state.ok){panel.append(card("Combat paused",state.error));return panel}
 const save=state.save,rpg=save.rpg,technique=TECHNIQUES[profile.classId]||TECHNIQUES.fighter,locationId=FOES[context.locationId]?context.locationId:"night-harbor";
 panel.append(card("Custom project rules","These attack, defense, Focus, enemy, item, and reward values are original M&M: RPG rules. They are not official Monsters & Memories formulas or ability data."));
 const health=card("Health and Focus","Health "+rpg.hp+" / "+rpg.maxHp+" \u00b7 Focus "+rpg.focus+" / "+rpg.maxFocus+" \u00b7 Level "+save.level);
 panel.append(health);
 const status=statusNode();panel.append(status);
 const toggle=makeSystemButton("Q \u00b7 Auto-attack: "+(save.combat.autoAttack?"On":"Off"),()=>{const result=setAutoAttack(profile,!save.combat.autoAttack);updateFromResult(result,onChange,status)});toggle.setAttribute("aria-pressed",String(save.combat.autoAttack));panel.append(toggle);
 const foe=rpg.encounter;
 if(!foe){
  const regions=window.soaMnmAdventure?.regions||[],place=regions.find(row=>row.id===locationId);
  panel.append(card("Looking for trouble",(place?.name||"This region")+" \u00b7 Select a custom encounter drawn from this area's original project foe table."));
  panel.append(makeSystemButton("Find a foe",()=>{const result=startEncounter(profile,locationId);updateFromResult(result,onChange,status)}));
 }else{
  const encounter=card(foe.name+" \u00b7 Level "+foe.level,foe.description+" Guard "+foe.defense+" \u00b7 Round "+(foe.round+1));
  const hp=document.createElement("p");hp.textContent="Foe health "+foe.hp+" / "+foe.maxHp;encounter.append(hp);panel.append(encounter);
  const actions=document.createElement("div");actions.className="soa-mnm-choice-grid";
  const strikeLabel=save.combat.autoAttack?"Strike now":"Strike once";
  const act=action=>{const result=resolveRpgAction(profile,action,{returnToBindPoint:context.returnToBindPoint});if(result.ok&&result.result?.defeated)stopAutoAttackRunner();updateFromResult(result,onChange,status)};
  actions.append(makeSystemButton(strikeLabel,()=>act("attack")));
  actions.append(makeSystemButton(technique.name+" \u00b7 "+technique.focus+" Focus",()=>act("technique"),rpg.focus<technique.focus));
  actions.append(makeSystemButton("Guard",()=>act("guard")));
  const consumable=rpg.inventory.find(entry=>RPG_ITEM_DEFS[entry.id]?.kind==="consumable"&&((RPG_ITEM_DEFS[entry.id].heal&&rpg.hp<rpg.maxHp)||(RPG_ITEM_DEFS[entry.id].focus&&rpg.focus<rpg.maxFocus)));
  if(consumable){const item=RPG_ITEM_DEFS[consumable.id];actions.append(makeSystemButton("Use "+item.name+" \u00b7 "+consumable.quantity+" left",()=>act({type:"item",id:consumable.id})))}
  actions.append(makeSystemButton("Try to escape",()=>act("flee")));
  panel.append(actions);
 }
 const log=document.createElement("section");log.className="soa-mnm-system-card";const logHeading=document.createElement("h3");logHeading.textContent="Encounter journal";log.append(logHeading);
 const entries=document.createElement("ol");entries.className="soa-mnm-journal";for(const line of rpg.log.slice(0,12)){const row=document.createElement("li");row.textContent=line;entries.append(row)}log.append(entries);panel.append(log);
 const slots=document.createElement("div");slots.className="soa-mnm-system-grid";
 for(let i=0;i<ACTION_SLOTS;i++){const id=save.memorizedAbilities[i],ability=id&&PAGES.flatMap(page=>save.abilityBook[page]).find(item=>item.id===id);slots.append(card("Ability slot "+(i===9?"0":i+1),ability?ability.name:"Empty"))}
 panel.append(card("Class technique",technique.name+" · "+technique.description+" Uses "+technique.stat.toUpperCase()+" and restores "+technique.heal+" health when it hits. This is an original custom action, not an official ability."));
 panel.append(slots);
 syncAutoAttackRunner(profile,save,onChange,context);
 const sources=document.createElement("p");sources.className="soa-mnm-system-sources";sources.append(link("Official combat controls and ability rules","https://monstersandmemories.com/new-player-guide"));panel.append(sources);
 return panel;
}
function renderProgress(profile,onChange,context={}){
 const panel=document.createElement("section");panel.className="soa-mnm-adventure-panel soa-mnm-system-view";panel.append(kicker("M&M: RPG CUSTOM RULES \u00b7 EXPERIENCE AND LEVELS"));
 const h=document.createElement("h2");h.textContent="Progress";panel.append(h);
 const state=read(profile);if(!state.ok){panel.append(card("Progress paused",state.error));return panel}
 const save=state.save,rpg=save.rpg,next=xpToNext(save.level),fraction=next?Math.max(0,Math.min(1,rpg.xp/next)):1;
 panel.append(card("Level "+save.level+" / "+MAX_LEVEL,"Custom progression. Defeat local story foes and resolve AI chapters for XP; levels increase health, and every second level increases Focus. The level cap of 60 is documented by M&M; the XP curve here is original."));
 const bar=document.createElement("div");bar.className="soa-mnm-system-card";const barTitle=document.createElement("h3");barTitle.textContent="Experience";bar.append(barTitle);
 const xp=document.createElement("p");xp.textContent=save.level>=MAX_LEVEL?"Maximum level reached · "+rpg.totalXp+" total custom XP":rpg.xp+" / "+next+" XP to level "+(save.level+1)+" · "+rpg.totalXp+" total custom XP";bar.append(xp);
 const meter=document.createElement("div");meter.className="soa-mnm-meter-track";const fill=document.createElement("i");fill.style.width=(fraction*100)+"%";meter.append(fill);bar.append(meter);panel.append(bar);
 panel.append(card("Adventuring record",rpg.kills+" custom encounters won · "+rpg.claimedStories.length+" story rewards claimed · "+rpg.coppers+" custom coppers."));
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
 const customWeight=rpgInventoryWeight(rpg),capacity=rpgCarryCapacity(profile),purse=document.createElement("p");purse.textContent="Custom load "+customWeight+" / "+capacity+" units · Purse "+rpg.coppers+" custom coppers";custom.append(purse);
 const customList=document.createElement("div");customList.className="soa-mnm-item-list";
 for(const entry of rpg.inventory){const item=RPG_ITEM_DEFS[entry.id];if(!item)continue;const row=document.createElement("article");row.className="soa-mnm-item-row";
  const name=document.createElement("strong");name.textContent=item.name+(entry.quantity>1?" × "+entry.quantity:"")+(Object.values(rpg.equipment).includes(entry.id)?" · Equipped":"");row.append(name);
  const detail=document.createElement("p");detail.textContent=item.description+" Custom weight "+item.weight+" · Value "+item.price+" coppers"+(item.kind==="weapon"?" · Attack +"+item.attack+" · Damage +"+item.damage:item.kind==="armor"?" · Defense +"+item.defense:item.kind==="consumable"?" · Heal "+item.heal+" · Focus "+item.focus:"");row.append(detail);
  const actions=document.createElement("div");actions.className="soa-mnm-choice-grid";
  if(item.kind==="weapon"||item.kind==="armor"){const slot=item.slot;actions.append(makeSystemButton(rpg.equipment[slot]===entry.id?"Equipped":"Equip",()=>{const result=equipRpgItem(profile,entry.id);updateFromResult(result,onChange,status)},!!rpg.encounter||rpg.equipment[slot]===entry.id))}
  if(item.kind==="consumable"){const useful=!!((item.heal&&rpg.hp<rpg.maxHp)||(item.focus&&rpg.focus<rpg.maxFocus));actions.append(makeSystemButton("Use",()=>{const result=useRpgItem(profile,entry.id);updateFromResult(result,onChange,status)},!useful||!!rpg.encounter))}
  if(!Object.values(rpg.equipment).includes(entry.id)){actions.append(makeSystemButton("Sell 1",()=>{const result=sellRpgItem(profile,entry.id,1,context.locationId);updateFromResult(result,onChange,status)},!!rpg.encounter||item.price<=0||context.locationId!=="night-harbor"));actions.append(makeSystemButton("Discard 1",()=>{const result=discardRpgItem(profile,entry.id);updateFromResult(result,onChange,status)},!!rpg.encounter))}
  row.append(actions);customList.append(row);
 }
 if(!rpg.inventory.length)customList.append(card("Pack empty","Travel to a settlement market or defeat a custom story foe to find gear."));custom.append(customList);panel.append(custom);
 const market=document.createElement("section");market.className="soa-mnm-system-card";const mh=document.createElement("h3");mh.textContent="Night Harbor market · custom stock";market.append(mh);const mp=document.createElement("p");mp.textContent=context.locationId==="night-harbor"?"Prices, coppers, stock, and carry limits are original M&M: RPG rules. These supplies are sold by Night Harbor merchants.":"Night Harbor merchants sell this custom stock. Travel there to buy or sell.";market.append(mp);
 for(const id of ["healing-poultice","waybread","iron-shard","saltwind-knife","liftwarden-coat","thornwood-bow","blightmantle","deep-forged-edge","branchguard"]){const item=RPG_ITEM_DEFS[id],row=document.createElement("div");row.className="soa-mnm-item-row";const title=document.createElement("strong");title.textContent=item.name+" · "+item.price+" custom coppers";const description=document.createElement("p");description.textContent=item.description;row.append(title,description,makeSystemButton("Buy 1",()=>{const result=purchaseRpgItem(profile,id,1,context.locationId);updateFromResult(result,onChange,status)},rpg.coppers<item.price||!!rpg.encounter||context.locationId!=="night-harbor"));market.append(row)}panel.append(market);
 const backpack=document.createElement("section");backpack.className="soa-mnm-system-card";const bh=document.createElement("h3");bh.textContent="Documented starting items";backpack.append(bh);const list=document.createElement("div");list.className="soa-mnm-item-list";
 for(const item of inv.backpack){const row=document.createElement("article");row.className="soa-mnm-item-row";const name=document.createElement("strong");name.textContent=item.name;row.append(name);const detail=document.createElement("p");detail.textContent=item.id==="class-guild-note"?"Official guide starting note. Read it to learn about your class guild; its class-specific text and guild master are not modeled here.":item.id==="trainees-candle"?"Documented light source. Its fuel and burn duration are not published here.":"Weight "+(item.weight===null?"not supplied":item.weight);row.append(detail);
  if(item.id==="class-guild-note")row.append(makeSystemButton(item.read?"Note read":"Read guild note",()=>{const result=markGuildNoteRead(profile);if(result.ok)onChange?.()}));
  if(item.id==="trainees-candle"){const light=makeSystemButton(item.lit?"Extinguish candle":"Light candle",()=>{const result=toggleCandle(profile);if(result.ok)onChange?.()});light.setAttribute("aria-pressed",String(item.lit===true));row.append(light)}list.append(row)}
 if(!inv.backpack.length)list.append(card("Empty","No documented starting items are in the backpack."));backpack.append(list);panel.append(backpack);
 const containers=document.createElement("div");containers.className="soa-mnm-system-grid";const bags=document.createElement("section");bags.className="soa-mnm-system-card";const bagsHeading=document.createElement("h3");bagsHeading.textContent="Bags · 3 slots";bags.append(bagsHeading);inv.bags.forEach((slot,index)=>{const p=document.createElement("p");p.textContent="Bag slot "+(index+1)+": "+(slot?slot.item.name:"empty; bag must be equipped to access its contents");bags.append(p)});containers.append(bags);
 const belt=document.createElement("section");belt.className="soa-mnm-system-card";const beltHeading=document.createElement("h3");beltHeading.textContent="Belt · 3 item slots";belt.append(beltHeading);inv.belt.forEach((item,index)=>{const p=document.createElement("p");p.textContent="Belt slot "+(index+1)+": "+(item?item.name:"empty");belt.append(p)});belt.append(document.createTextNode(equippedSpellbook(save)?" A spellbook is equipped.":" A spellbook is required in a belt slot to scribe or memorize spells; casting already memorized spells does not require it."));containers.append(belt);panel.append(containers);
 panel.append(card("Official weight rules","The official guide says carried item weight counts against a Strength-raised limit; excess weight slows or can immobilize, and teleport spells fail while encumbered. The numerical formula is not published. Custom pack load above is a separate game rule."));
 if(save.corpse){const remaining=Math.max(0,Date.parse(save.corpse.expiresAt)-Date.now()),corpseLocation=save.corpse.locationId||save.corpse.bindPoint||save.bindPoint||"night-harbor",region=window.soaMnmAdventure?.regions?.find(item=>item.id===corpseLocation),atCorpse=context.locationId===corpseLocation,corpseCard=card(remaining?"Corpse recovery":"Corpse expired",remaining?"Documented items and custom gear are on the corpse in "+(region?.name||"the field")+". Time remaining: "+formatDuration(remaining)+".":"This corpse passed its documented recovery window; unrecovered items are lost.");corpseCard.append(makeSystemButton(remaining?atCorpse?"Recover corpse":"Travel to "+(region?.name||"the corpse"):"Clear expired corpse",()=>{if(!remaining){const result=recoverCorpse(profile);if(result.ok)onChange?.();else status.textContent=result.error||"The corpse could not be cleared.";return}if(!atCorpse){status.textContent="Use the World tab to travel to "+(region?.name||"the corpse's region")+".";return}const result=recoverCorpse(profile,Date.now(),context.locationId);updateFromResult(result,onChange,status)},!remaining?false:!atCorpse||!!rpg.encounter));panel.append(corpseCard)}else panel.append(card("Corpse recovery","Custom defeats leave carried items on a recoverable corpse in the encounter region. Official expiry: no items = 30 min at levels 1–4, 3 hr at 5–29, 24 hr at 30+; with items = 2 hr at level 1, 7 days at level 2+."));
 panel.append(card("Starting ability scrolls","The official guide confirms class-specific ability/spell scrolls but the available source does not list their names. The custom combat technique above is separate and does not claim to be an official scroll ability."));
 const caster=TRUE_CASTER_CLASSES.has(profile.classId);panel.append(card("Cantrips",caster?"True caster class. An assigned memorized spell can be retained after death; the first cantrip is available at level 4. Later cantrip intervals and spell eligibility data are not loaded.":"Cantrips are documented for Cleric, Druid, Elementalist, Enchanter, Necromancer, Shaman, and Wizard."));
 const sources=document.createElement("p");sources.className="soa-mnm-system-sources";sources.append(link("Official New Player Guide","https://monstersandmemories.com/new-player-guide"),document.createTextNode(" · "),link("Official weight FAQ","https://account2.monstersandmemories.com/community/faqs/45"));panel.append(sources);return panel;
}
function formatDuration(ms){
 const minutes=Math.ceil(ms/MINUTE),days=Math.floor(minutes/(24*60)),hours=Math.floor(minutes/60)%24,remaining=minutes%60;
 return [days?days+"d":"",hours?hours+"h":"",remaining?remaining+"m":""].filter(Boolean).join(" ")||"under 1m";
}
let keyHandlerInstalled=false;
function installKeyHandler(){
 if(keyHandlerInstalled)return;keyHandlerInstalled=true;
 document.addEventListener("keydown",event=>{
  if(event.key.toLowerCase()!=="q"||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  const active=document.activeElement;
  if(active&&(active.tagName==="INPUT"||active.tagName==="TEXTAREA"||active.tagName==="SELECT"||active.isContentEditable))return;
  const profile=window.soaCharacters?.profile?.();
  if(profile?.system!=="mnm"||!document.body.classList.contains("soa-ruleset-mnm"))return;
  const loaded=read(profile);if(!loaded.ok)return;
  event.preventDefault();setAutoAttack(profile,!loaded.save.combat.autoAttack);
  const status=document.querySelector(".soa-mnm-system-view .soa-mnm-system-live");
  if(status)status.textContent="Auto-attack "+(loaded.save.combat.autoAttack?"enabled":"disabled")+". No target or attack resolution is connected in this story chapter.";
  document.querySelector(".soa-mnm-game")?.dispatchEvent(new CustomEvent("soa-mnm-system-update"));
 });
}
function render(view,profile,onChange,context={}){
 installKeyHandler();
 if(view!=="combat")stopAutoAttackRunner();
 if(view==="combat")return renderCombat(profile,onChange,context);
 if(view==="progress")return renderProgress(profile,onChange,context);
 if(view==="inventory")return renderInventory(profile,onChange,context);
 return null;
}
window.soaMnmSystems=Object.freeze({key:KEY,maxLevel:MAX_LEVEL,actionSlots:ACTION_SLOTS,createSave,validSave,read,progressFor,render,groupExperienceEligibility,corpseDurationMs,weightSummary,recordDeath,recoverCorpse,recordRestInterval,experienceMultiplier,scribeAbility,memorizeAbility,startEncounter,resolveRpgAction,claimStoryReward,restAtSafeHaven,useRpgItem,equipRpgItem,discardRpgItem,purchaseRpgItem,sellRpgItem,setAutoAttack,stopAutoAttackRunner});
})();
