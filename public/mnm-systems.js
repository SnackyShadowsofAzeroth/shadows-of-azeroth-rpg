(()=>{"use strict";
const KEY="soa-mnm-systems-v1",VERSION=1,MAX_LEVEL=60,ACTION_SLOTS=10;
const PAGES=["skills","innates","spells"];
const TRUE_CASTER_CLASSES=new Set(["cleric","druid","elementalist","enchanter","necromancer","shaman","wizard"]);
const RESTED_XP_BONUS=0.15,RESTED_CAP_MINUTES=20,REST_PER_CAMP_MINUTE=10;
const MINUTE=60*1000,HOUR=60*MINUTE,DAY=24*HOUR;
const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const clampLevel=value=>Math.max(1,Math.min(MAX_LEVEL,Math.trunc(Number(value)||1)));
const validDate=value=>typeof value==="string"&&Number.isFinite(Date.parse(value));
const clone=value=>JSON.parse(JSON.stringify(value));
const itemKinds=new Set(["document","light","bag","spellbook","scroll","equipment","misc"]);
function createItem(id,name,kind){return {id,name,kind,source:"official-guide",weight:null,...(kind==="document"?{read:false}:{}),...(kind==="light"?{lit:false}:{})}}
function emptyInventory(){return {backpack:[],bags:[null,null,null],belt:[null,null,null]}}
function createSave(profile){
 if(!profile||profile.system!=="mnm"||typeof profile.id!=="string")throw new Error("An M&M character is required.");
 const note=createItem("class-guild-note","Class guild note","document");
 const candle=createItem("trainees-candle","Trainee's Candle","light");
 return {version:VERSION,characterId:profile.id,classId:String(profile.classId||""),level:clampLevel(profile.level),learnedAbilities:Array.isArray(profile.learnedAbilities)?[...new Set(profile.learnedAbilities.filter(x=>typeof x==="string").slice(0,300))]:[],abilityBook:{skills:[],innates:[],spells:[]},memorizedAbilities:Array(ACTION_SLOTS).fill(null),assignedCantrips:[],combat:{autoAttack:false},restedMinutes:0,bindPoint:null,corpse:null,inventory:{backpack:[note,candle],bags:[null,null,null],belt:[null,null,null]},updatedAt:new Date().toISOString()};
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
 if(!object(value)||value.version!==VERSION||value.characterId!==profile?.id||value.classId!==profile?.classId||!Number.isInteger(value.level)||value.level<1||value.level>MAX_LEVEL||!Array.isArray(value.learnedAbilities)||value.learnedAbilities.length>300||value.learnedAbilities.some(id=>typeof id!=="string"||id.length>120)||!object(value.abilityBook)||PAGES.some(page=>!Array.isArray(value.abilityBook[page])||value.abilityBook[page].length>300||value.abilityBook[page].some(record=>!validAbility(record,profile)))||!Array.isArray(value.memorizedAbilities)||value.memorizedAbilities.length!==ACTION_SLOTS||value.memorizedAbilities.some(id=>id!==null&&typeof id!=="string"||typeof id==="string"&&!PAGES.some(page=>value.abilityBook[page].some(record=>record.id===id)))||!Array.isArray(value.assignedCantrips)||value.assignedCantrips.length>10||value.assignedCantrips.some(id=>typeof id!=="string"||!value.abilityBook.spells.some(record=>record.id===id))||!object(value.combat)||typeof value.combat.autoAttack!=="boolean"||!Number.isFinite(value.restedMinutes)||value.restedMinutes<0||value.restedMinutes>RESTED_CAP_MINUTES||!(value.bindPoint===null||typeof value.bindPoint==="string"&&value.bindPoint.length<=120)||!validInventory(value.inventory)||!validDate(value.updatedAt))return false;
 if(value.corpse!==null&&(!object(value.corpse)||!Number.isInteger(value.corpse.level)||value.corpse.level<1||value.corpse.level>MAX_LEVEL||typeof value.corpse.hasItems!=="boolean"||!validDate(value.corpse.createdAt)||!validDate(value.corpse.expiresAt)||Date.parse(value.corpse.expiresAt)<=Date.parse(value.corpse.createdAt)||!validInventory(value.corpse.inventory)||(value.corpse.bindPoint!==null&&typeof value.corpse.bindPoint!=="string")))return false;
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
 return {ok:true,save:stored.value,created:false};
}
function persist(profile,save){
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
function recordDeath(profile,now=Date.now()){
 return mutate(profile,save=>{
  const current=Number(now);if(!Number.isFinite(current))return {error:"Death time is invalid."};
  if(save.corpse&&Date.parse(save.corpse.expiresAt)>current)return {error:"Recover the existing corpse before recording another death."};
  const inventory=clone(save.inventory),hasItems=inventoryItems(inventory).length>0,expiresAt=new Date(current+corpseDurationMs(save.level,hasItems)).toISOString();
  save.corpse={level:save.level,hasItems,createdAt:new Date(current).toISOString(),expiresAt,bindPoint:save.bindPoint,inventory};
  save.inventory=emptyInventory();save.combat.autoAttack=false;
  return null;
 });
}
function recoverCorpse(profile,now=Date.now()){
 return mutate(profile,save=>{
  if(!save.corpse)return {error:"There is no saved corpse to recover."};
  const current=Number(now);if(!Number.isFinite(current))return {error:"Recovery time is invalid."};
  if(current>=Date.parse(save.corpse.expiresAt)){save.corpse=null;return {expired:true}}
  save.inventory=clone(save.corpse.inventory);save.corpse=null;
  return null;
 });
}
function setAutoAttack(profile,value){
 return mutate(profile,save=>{save.combat.autoAttack=!!value;return null});
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
function renderCombat(profile,onChange){
 const panel=document.createElement("section");panel.className="soa-mnm-adventure-panel soa-mnm-system-view";
 panel.append(kicker("M&M RULES \u00b7 COMBAT AND ABILITIES"));
 const h=document.createElement("h2");h.textContent="Combat";panel.append(h);
 const state=read(profile);
 if(!state.ok){panel.append(card("Combat paused",state.error));return panel}
 const save=state.save,archer=profile.classId==="archer"||profile.classId==="ranger";
 const toggle=document.createElement("button");toggle.type="button";toggle.className="soa-mnm-system-button";toggle.setAttribute("aria-pressed",String(save.combat.autoAttack));
 toggle.textContent="Q \u00b7 Melee auto-attack: "+(save.combat.autoAttack?"On":"Off");
 toggle.onclick=()=>{const result=setAutoAttack(profile,!save.combat.autoAttack);if(!result.ok){panel.append(card("Save paused",result.error));return}onChange?.()};
 panel.append(toggle);
 const live=document.createElement("p");live.className="soa-mnm-live soa-mnm-system-live";live.setAttribute("role","status");live.setAttribute("aria-live","polite");live.textContent="Auto-attack "+(save.combat.autoAttack?"enabled":"disabled")+". No target or attack resolution is connected in this story chapter.";panel.append(live);
 panel.append(card("Target required","The official control targets an enemy before Q enables auto-attack. This story chapter has no target or weapon combat engine, so this toggle records the setting only and will not resolve an attack. With no target, the official guide says an ability is used on yourself, even if it has a negative effect; this prototype does not cast abilities."));

 panel.append(card(archer?"Ranged auto-attack":"Ranged attacks",archer?"Archer and Ranger use ranged auto-attack when outside melee range.":"Other classes need a learned Shoot or Throw ability to shoot or throw."));
 const slotHeading=document.createElement("h3");slotHeading.textContent="Ability bar \u00b7 10 memorized slots";panel.append(slotHeading);
 const slots=document.createElement("div");slots.className="soa-mnm-action-slots";
 for(let i=0;i<ACTION_SLOTS;i++){
  const button=document.createElement("button");button.type="button";button.className="soa-mnm-action-slot";button.disabled=true;
  const key=document.createElement("strong");key.textContent=i===9?"0":String(i+1);
  const id=save.memorizedAbilities[i],ability=id&&PAGES.flatMap(page=>save.abilityBook[page]).find(item=>item.id===id);
  const name=document.createElement("span");name.textContent=ability?.name||"Empty";
  button.append(key,name);slots.append(button);
 }
 panel.append(slots);
 const pageGrid=document.createElement("div");pageGrid.className="soa-mnm-system-grid";
 for(const page of PAGES){const records=save.abilityBook[page];pageGrid.append(card(page==="innates"?"Innates":page.charAt(0).toUpperCase()+page.slice(1),records.length?records.map(item=>item.name).join(", "):"No verified ability data is loaded for this page."))}
 panel.append(pageGrid);
 const hasBook=equippedSpellbook(save);
 panel.append(card("Spellbook",hasBook?"A spellbook is equipped in a belt slot. Spells may be scribed and memorized. It is not required to cast an already memorized spell.":"Spells cannot be scribed or memorized until a spellbook is equipped in a belt slot. The guide confirms a few class-specific starting scrolls, but does not list their names here."));
 panel.append(card("Unconfigured combat data","Combat skills improve through fighting, but their progression, attack rolls, weapon skill levels, damage, defense, timing, ability costs, cooldowns, enemy statistics, and effects are not defined here. No legacy d20 combat is used for this M&M view."));
 const sources=document.createElement("p");sources.className="soa-mnm-system-sources";sources.append(link("Official New Player Guide","https://monstersandmemories.com/new-player-guide"));panel.append(sources);
 return panel;
}
function renderProgress(profile){
 const panel=document.createElement("section");panel.className="soa-mnm-adventure-panel soa-mnm-system-view";
 panel.append(kicker("M&M RULES \u00b7 LEVELS AND EXPERIENCE"));
 const h=document.createElement("h2");h.textContent="Progress";panel.append(h);
 const state=read(profile);
 if(!state.ok){panel.append(card("Progress paused",state.error));return panel}
 const save=state.save;
 panel.append(card("Level "+save.level+" / "+MAX_LEVEL,"The level cap is recorded as 60. XP rewards and level thresholds are not available here, so this chapter does not award XP or calculate progress to the next level."));
 panel.append(card("How XP is gained","Repeatedly defeating nearby monsters in a camp is the most efficient route. Quests and dungeons also award experience. A Rested character gains 15% bonus XP."));
 const rest=document.createElement("section");rest.className="soa-mnm-system-card";
 const rh=document.createElement("h3");rh.textContent="Rested state";rest.append(rh);
 const rp=document.createElement("p");rp.textContent="Up to "+RESTED_CAP_MINUTES+" minutes of Rested time can be banked. Near a campfire or in an inn, about 1 minute builds "+REST_PER_CAMP_MINUTE+" minutes of rest (roughly 2 minutes to fill the bank). Rain or adverse weather stops campfire rest unless sheltered. Placing a field campfire requires the Survival skill and eight wood; rekindling it uses one wood. The prototype does not simulate location, weather, fire placement, rest consumption, or XP rounding.";rest.append(rp);
 panel.append(rest);
 const group=document.createElement("section");group.className="soa-mnm-system-card";
 const gh=document.createElement("h3");gh.textContent="Group XP eligibility";group.append(gh);
 const gp=document.createElement("p");gp.textContent="Enter the highest level in the group. Through level 15, you must be within five levels of that member; above level 15, you must be at least two-thirds their level.";group.append(gp);
 const label=document.createElement("label");label.className="soa-mnm-system-label";label.textContent="Highest group member level";
 const input=document.createElement("input");input.className="soa-mnm-system-input";input.type="number";input.min="1";input.max=String(MAX_LEVEL);input.step="1";input.value=String(save.level);label.append(input);group.append(label);
 const check=document.createElement("button");check.type="button";check.className="soa-mnm-system-button";check.textContent="Check eligibility";group.append(check);
 const result=document.createElement("p");result.className="soa-mnm-live";result.setAttribute("role","status");result.setAttribute("aria-live","polite");result.textContent="";group.append(result);
 check.onclick=()=>{const highest=Number(input.value);result.textContent=Number.isInteger(highest)&&highest>=1&&highest<=MAX_LEVEL?groupXpText(save.level,highest):"Enter a level from 1 to "+MAX_LEVEL+".";};
 panel.append(group);
 panel.append(card("Death and XP","Death leaves items on the corpse. The guide notes that death loses some XP and some resurrection spells restore some of it, but the loss and recovery values are not published here, so the prototype does not subtract or restore XP."));
 const sources=document.createElement("p");sources.className="soa-mnm-system-sources";sources.append(link("Official New Player Guide","https://monstersandmemories.com/new-player-guide"),document.createTextNode(" \u00b7 "),link("Official XP FAQ","https://account2.monstersandmemories.com/community/faqs/15"));panel.append(sources);
 return panel;
}
function renderInventory(profile,onChange){
 const panel=document.createElement("section");panel.className="soa-mnm-adventure-panel soa-mnm-system-view";
 panel.append(kicker("M&M RULES \u00b7 INVENTORY AND CORPSE RECOVERY"));
 const h=document.createElement("h2");h.textContent="Items";panel.append(h);
 const state=read(profile);
 if(!state.ok){panel.append(card("Inventory paused",state.error));return panel}
 const save=state.save,inv=save.inventory;
 const backpack=document.createElement("section");backpack.className="soa-mnm-system-card";
 const bh=document.createElement("h3");bh.textContent="Backpack";backpack.append(bh);
 const list=document.createElement("div");list.className="soa-mnm-item-list";
 for(const item of inv.backpack){
  const row=document.createElement("article");row.className="soa-mnm-item-row";
  const name=document.createElement("strong");name.textContent=item.name;row.append(name);
  const detail=document.createElement("p");detail.textContent=item.id==="class-guild-note"?"Official guide starting note. Read it to learn about your class guild; its class-specific text and guild master are not modeled here.":item.id==="trainees-candle"?"Documented light source. Its fuel and burn duration are not published here.":"Weight "+(item.weight===null?"not supplied":item.weight);
  row.append(detail);
  if(item.id==="class-guild-note"){
   const read=document.createElement("button");read.type="button";read.className="soa-mnm-system-button";read.textContent=item.read?"Note read":"Read guild note";read.onclick=()=>{const result=markGuildNoteRead(profile);if(result.ok)onChange?.()};row.append(read);
  }
  if(item.id==="trainees-candle"){
   const light=document.createElement("button");light.type="button";light.className="soa-mnm-system-button";light.setAttribute("aria-pressed",String(item.lit===true));light.textContent=item.lit?"Extinguish candle":"Light candle";light.onclick=()=>{const result=toggleCandle(profile);if(result.ok)onChange?.()};row.append(light);
  }
  list.append(row);
 }
 if(!inv.backpack.length)list.append(card("Empty","No items are in the backpack."));
 backpack.append(list);panel.append(backpack);
 panel.append(card("Starting ability scrolls","The official guide confirms a few class-specific ability/spell scrolls, but the available source does not list their names. No placeholder scrolls or abilities are added."));
 const containers=document.createElement("div");containers.className="soa-mnm-system-grid";
 const bags=document.createElement("section");bags.className="soa-mnm-system-card";const bagsHeading=document.createElement("h3");bagsHeading.textContent="Bags \u00b7 3 slots";bags.append(bagsHeading);
 inv.bags.forEach((slot,index)=>{const p=document.createElement("p");p.textContent="Bag slot "+(index+1)+": "+(slot?slot.item.name:"empty; bag must be equipped to access its contents");bags.append(p)});
 containers.append(bags);
 const belt=document.createElement("section");belt.className="soa-mnm-system-card";const beltHeading=document.createElement("h3");beltHeading.textContent="Belt \u00b7 3 item slots";belt.append(beltHeading);
 inv.belt.forEach((item,index)=>{const p=document.createElement("p");p.textContent="Belt slot "+(index+1)+": "+(item?item.name:"empty");belt.append(p)});
 belt.append(document.createTextNode(equippedSpellbook(save)?" A spellbook is equipped.":" A spellbook is required in a belt slot to scribe or memorize spells; casting already memorized spells does not require it."));
 containers.append(belt);panel.append(containers);
 const weight=weightSummary(save);
 panel.append(card("Carried weight",weight.unknownCount?"Known weight subtotal: "+weight.knownWeight+"; "+weight.unknownCount+" item weight value(s) are missing. The carry limit and penalty curve are not published; STR raises the limit, excess weight slows movement, severe excess can immobilize, and teleport spells fail while encumbered.":"Known item weight: "+weight.knownWeight+". The character's carry limit is not published, so Encumbered state cannot be calculated."));
 if(save.corpse){
  const remaining=Math.max(0,Date.parse(save.corpse.expiresAt)-Date.now());
  const corpseCard=card(remaining?"Corpse recovery":"Corpse expired",remaining?"Items are on the corpse. Time remaining: "+formatDuration(remaining)+".":"This corpse passed its documented recovery window.");
  const recover=document.createElement("button");recover.type="button";recover.className="soa-mnm-system-button";recover.textContent=remaining?"Recover corpse":"Clear expired corpse";recover.onclick=()=>{const result=recoverCorpse(profile);if(result.ok)onChange?.();else corpseCard.append(document.createTextNode(" "+result.error))};corpseCard.append(recover);panel.append(corpseCard);
 }else{
  panel.append(card("Death recovery","Items remain on the corpse and respawn is at the bind point (initially the first logged-in location). Corpse expiry: no items = 30 min at levels 1-4, 3 hr at 5-29, 24 hr at 30+; with items = 2 hr at level 1, 7 days at level 2+."));
 }
 const caster=TRUE_CASTER_CLASSES.has(profile.classId);
 panel.append(card("Cantrips",caster?"True caster class. An assigned memorized spell can be retained after death; the first cantrip is available at level 4. Later cantrip intervals and spell eligibility data are not loaded.":"Cantrips are documented for Cleric, Druid, Elementalist, Enchanter, Necromancer, Shaman, and Wizard."));
 const sources=document.createElement("p");sources.className="soa-mnm-system-sources";sources.append(link("Official New Player Guide","https://monstersandmemories.com/new-player-guide"),document.createTextNode(" \u00b7 "),link("Official weight FAQ","https://account2.monstersandmemories.com/community/faqs/45"));panel.append(sources);
 return panel;
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
function render(view,profile,onChange){
 installKeyHandler();
 if(view==="combat")return renderCombat(profile,onChange);
 if(view==="progress")return renderProgress(profile);
 if(view==="inventory")return renderInventory(profile,onChange);
 return null;
}
window.soaMnmSystems=Object.freeze({key:KEY,maxLevel:MAX_LEVEL,actionSlots:ACTION_SLOTS,createSave,validSave,render,groupExperienceEligibility,corpseDurationMs,weightSummary,recordDeath,recoverCorpse,recordRestInterval,experienceMultiplier,scribeAbility,memorizeAbility});
})();