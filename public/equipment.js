(()=>{"use strict";
const CATALOG={
 "Defias Shadowblade":{slot:"weapon",rarity:"rare",classes:["Rogue"],bonuses:{attack:1,damage:2},description:"Attack +1, weapon damage +2 · Rogue"},
 "Ironforge Warhammer":{slot:"weapon",rarity:"rare",classes:["Warrior","Paladin"],bonuses:{attack:1,damage:2},description:"Attack +1, weapon damage +2 · Warrior/Paladin"},
 "Sealed SI:7 Field Kit":{slot:"trinket",rarity:"uncommon",classes:["Rogue"],bonuses:{DEX:1},description:"Dexterity +1"},
 "Consecrated Silver Pendant":{slot:"trinket",rarity:"uncommon",classes:[],bonuses:{WIS:1},description:"Wisdom +1"},
 "Reinforced Explorer's Gloves":{slot:"armor",rarity:"uncommon",classes:[],bonuses:{ac:1},description:"Armor Class +1"},
 "Captain's Signet":{slot:"trinket",rarity:"uncommon",classes:[],bonuses:{CHA:1},description:"Charisma +1"},
 "Purified Bone Charm":{slot:"trinket",rarity:"common",classes:[],bonuses:{WIS:1},description:"Wisdom +1"},
 "Wraithbound Trinket":{slot:"trinket",rarity:"rare",classes:[],bonuses:{WIS:2,ac:1},description:"Wisdom +2, AC +1"},
 "Reinforced Gear":{slot:"armor",rarity:"uncommon",classes:[],bonuses:{ac:1},description:"AC +1"},
 "Rare Bounty Relic":{slot:"trinket",rarity:"rare",classes:[],bonuses:{CON:1,ac:1},description:"Constitution +1, AC +1"},
 "SI:7 Supply Voucher":{slot:"utility",rarity:"common",classes:[],bonuses:{},description:"Supply token (not equipable)"}
};
// Established Snacky Lugnuts equipment, supplied by the player.
// These are display-only canonical pieces, not new loot grants or invented numerical buffs.
const SNACKY_LOADOUT=[
 ["Head","Gnomish Goggles"],
 ["Back","Parachute Cloak"],
 ["Shoulders","Mantle of Thieves"],
 ["Chest","Dusky Leather Armor"],
 ["Wrists","Barbaric Bracers"],
 ["Hands","Tiger Hunter Gloves"],
 ["Waist","Highlander's Chain Girdle"],
 ["Legs","Triprunner Dungarees"],
 ["Feet","Feet of the Lynx"],
 ["Ring 1","Ironspine’s Eye"],
 ["Ring 2","Field Researcher's Loop"],
 ["Main hand","Ruby-Adorned Blade"],
 ["Off hand","Bloody Brass Knuckles"],
 ["Sidearm","Toxic Revenger"],
 ["Ranged","Golemsight Long Gun"],
 ["Trinket","Empty"]
];
const SLOT_KEY={"Head":"head","Back":"back","Shoulders":"shoulders","Chest":"chest","Wrists":"wrists","Hands":"hands","Waist":"waist","Legs":"legs","Feet":"feet","Neck":"neck","Ring 1":"finger1","Ring 2":"finger2","Main hand":"mainhand","Off hand":"offhand","Sidearm":"sidearm","Ranged":"ranged"};
function canonicalSlots(){return SNACKY_LOADOUT.map(([slot,name])=>({slot:SLOT_KEY[slot]||slot.toLowerCase(),name,display:slot}));}
function baselineModifiers(){
 const z={DEX:0,STR:0,CON:0,WIS:0,ac:0,damage:0,attack:0};
 if(window.soaCharacters?.profile?.()?.id!=="snacky")return z;
 const sum={AGI:0,STR:0,STA:0,SPI:0,AP:0,armor:0};
 for(const x of canonicalSlots()){
  const record=window.soaForeverItems?.byName?.(x.name);
  if(!record?.verified)continue;
  for(const k of ["AGI","STR","STA","SPI","AP"])sum[k]+=record.stats?.[k]||0;
  sum.armor+=record.armor||0;
 }
 // WoW stat units are NOT directly transferable to D&D abilities.
 // Conservative game-specific compression prevents 100+ AGI on level-10 heroes.
 z.DEX=Math.min(3,Math.floor(sum.AGI/25));
 z.STR=Math.min(1,Math.floor(sum.STR/18));
 z.CON=Math.min(2,Math.floor(sum.STA/20));
 z.WIS=Math.min(1,Math.floor(sum.SPI/15));
 z.ac=Math.min(1,Math.floor(sum.armor/350));
 z.damage=Math.min(1,Math.floor(sum.AP/20));
 return z;
}
const slots=["weapon","armor","trinket"];
const state=()=>window.soaLivingCampaign?.getState?.();
const holder=()=>state()?.quests;
function itemInfo(item){const name=String(item?.name||"");return CATALOG[name]||window.soaCrafting?.itemInfo?.(item)||window.soaDungeons?.itemInfo?.(item)||null}
function equipment(){
 const q=holder();if(!q)return {};
 q.equipped||={};return q.equipped;
}
function valid(item,character){
 const info=itemInfo(item);if(!info||!slots.includes(info.slot))return false;
 return (!info.classes.length||info.classes.includes(character?.className))&&(!info.level||(window.soaProgression?.level?.()||character?.level||1)>=info.level);
}
function equip(index){
 if(window.soaSaveRules?.isIntegrityBlocked?.())return {error:"Restore the damaged save first"};
 const q=holder(),p=window.soaCharacters?.profile?.();if(!q||!Array.isArray(q.inventory))return {error:"Inventory unavailable"};
 const item=q.inventory[index],info=itemInfo(item);if(!valid(item,p))return {error:"Item cannot be equipped by this class"};
 if(!Number.isInteger(index)||index<0||index>=q.inventory.length)return {error:"Item missing"};
 const before={...equipment()};equipment()[info.slot]=index;
 if(window.soaLivingCampaign?.persist?.()===false){q.equipped=before;return {error:"Equipment could not be saved"};}return {message:"Equipped "+item.name};
}
function unequip(slot){if(!slots.includes(slot)||window.soaSaveRules?.isIntegrityBlocked?.())return {error:"Equipment changes unavailable"};const q=holder(),before={...equipment()};delete equipment()[slot];if(window.soaLivingCampaign?.persist?.()===false){q.equipped=before;return {error:"Equipment could not be saved"};}return {message:"Unequipped "+slot}}
function modifiers(){
 const q=holder(),eq=equipment(),bonuses={STR:0,DEX:0,CON:0,INT:0,WIS:0,CHA:0,ac:0,attack:0,damage:0};
 const seen=new Set();
 for(const slot of slots){const idx=eq[slot],item=q?.inventory?.[idx],info=itemInfo(item);if(!Number.isInteger(idx)||seen.has(idx)||!info||info.slot!==slot||!valid(item,window.soaCharacters?.profile?.()))continue;seen.add(idx);for(const [k,v] of Object.entries(info.bonuses)){bonuses[k]+=v}}
 const base=baselineModifiers();
 const enchanting=window.soaEnchanting?.bonuses?.(state())||{};
 for(const k of Object.keys(bonuses))bonuses[k]+=(base[k]||0)+(enchanting[k]||0);
 return bonuses;
}
function renderStatus(){
 const mount=document.getElementById("soa-equipped-slot");if(!mount)return;
 const profile=window.soaCharacters?.profile?.();
 const isSnacky=profile?.id==="snacky";
 const gathered=[];
 if(isSnacky)for(const [label,name] of SNACKY_LOADOUT)gathered.push({label,name,source:"baseline"});
 if(profile?.origin==="custom")for(const name of window.soaCharacters?.startingEquipment?.()||[]){const slot=/staff|sword|blade|mace|axe|dagger|bow|hammer/i.test(name)?"weapon":"armor";if(!Number.isInteger(holder()?.equipped?.[slot]))gathered.push({label:"Starter gear",name,source:"starter"});}
 const q=holder(),eq=q?.equipped||{};
 for(const [slot,index] of Object.entries(eq)){
  const item=q?.inventory?.[index];if(!item)continue;
  gathered.push({label:slot==="weapon"?"Equipped weapon":slot==="armor"?"Equipped armor":slot==="trinket"?"Equipped trinket":slot,name:item.name,source:"reward"});
 }
 const wasOpen=sessionStorage.getItem("soa-character-gear-open")==="1";
 const details=document.createElement("details");details.className="soa-character-gear";details.open=wasOpen;
 details.addEventListener("toggle",()=>sessionStorage.setItem("soa-character-gear-open",details.open?"1":"0"));
 const summary=document.createElement("summary");summary.textContent=(profile?.origin==="custom"?"Gear":"Equipped Gear")+" · "+gathered.filter(item=>item.name!=="Empty").length+" items";details.append(summary);
 const grid=document.createElement("div");grid.className="soa-character-gear-grid";
 if(!gathered.length){const none=document.createElement("p");none.textContent="No tracked equipped items yet.";grid.append(none)}
 if(profile?.origin==="custom"&&gathered.some(item=>item.source==="starter")){const note=document.createElement("p");note.className="soa-character-gear-note";note.textContent="Class starter kit · basic level 1 gear";grid.append(note)}
 for(const {label,name} of gathered){
  const row=document.createElement("div");row.className="soa-character-gear-item";
  const tag=document.createElement("small");tag.textContent=label;
  const value=document.createElement("strong");value.textContent=name;
  row.append(tag,value);
  const craftedInfo=itemInfo({name});if(craftedInfo){const stats=document.createElement("small");stats.textContent=craftedInfo.description;row.append(stats)}
  const tooltip=window.soaForeverItems?.byName?.(name);
  if(tooltip?.verified){
   const stats=Object.entries(tooltip.stats||{}).map(([k,v])=>"+"+v+" "+k).join(" · ");
   if(stats||tooltip.armor){const secondary=document.createElement("small");secondary.className="soa-character-gear-stats";secondary.textContent=(tooltip.armor?tooltip.armor+" Armor":"")+(tooltip.armor&&stats?" · ":"")+stats;row.append(secondary)}
  }
  const ench=window.soaEnchanting?.getState&&q?window.soaEnchanting.getState(window.soaLivingCampaign?.getState?.()):null;
  const slot=canonicalSlots().find(x=>x.name===name)?.slot;
  const active=slot?ench?.enchants?.["baseline:"+slot]:null;
  if(active?.item===name){const badge=document.createElement("small");badge.className="soa-character-gear-enchant";badge.textContent="Enchanted · "+(window.soaEnchanting.ENCHANTS.find(x=>x.id===active.id)?.name||active.id);row.append(badge)}
  grid.append(row);
 }
 details.append(grid);mount.replaceChildren(details);
}
function panel(){
 const q=holder();if(!q)return null;
 const section=document.createElement("details"),head=document.createElement("summary");section.open=sessionStorage.getItem("soa-equipment-panel-open")==="1";section.ontoggle=()=>sessionStorage.setItem("soa-equipment-panel-open",section.open?"1":"0");head.textContent="Inventory · Crafted Gear & Quest Rewards";section.append(head);
 const intro=document.createElement("p");intro.textContent="Spare quest rewards and newly acquired equipment. Currently equipped gear is shown in the character panel.";section.append(intro);
 if(window.soaCrafting?.recoverable?.(state())?.length){const note=document.createElement("p");note.textContent="A finished craft is documented in your recent story. Open Crafting → Recover previously crafted gear below to restore it to inventory once.";section.append(note)}
 const subtitle=document.createElement("h3");subtitle.textContent="Available Equipment & Rewards";section.append(subtitle);
 const items=q.inventory||[],eq=equipment();
 if(!items.length){const p=document.createElement("p");p.textContent="No additional equipment collected or crafted yet.";section.append(p)}
 items.forEach((item,i)=>{const info=itemInfo(item),row=document.createElement("div");row.style.cssText="padding:8px 0;border-top:1px solid #ad946b";
 const title=document.createElement("strong");title.textContent=item.name+" · "+(info?.rarity||item.rarity||"unclassified");row.append(title);
 const p=document.createElement("p");p.textContent=(info?.description||"Quest item; no equipment statistics")+" · "+(item.source||"Unknown source")+(info?.level?" · Requires level "+info.level:"");row.append(p);
 if(info&&slots.includes(info.slot)){const button=document.createElement("button");button.type="button";const equipped=eq[info.slot]===i;button.textContent=equipped?"Unequip":valid(item,window.soaCharacters?.profile?.())?"Equip":"Class or level requirement not met";button.disabled=window.soaSaveRules?.isIntegrityBlocked?.()||!!state()?.pending||!equipped&&!valid(item,window.soaCharacters?.profile?.());button.onclick=()=>{const result=equipped?unequip(info.slot):equip(i);if(result?.error)window.alert(result.error);window.soaLivingCampaign?.refreshUI?.()};row.append(button)}
 section.append(row)});
 return section;
}
window.soaEquipment={CATALOG,SNACKY_LOADOUT,canonicalSlots,baselineModifiers,renderStatus,itemInfo,equip,unequip,equipment,modifiers,panel};
})();

