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
 ["Ring 2","Field Researcher's Ring"],
 ["Main hand","Ruby-Adorned Blade"],
 ["Off hand","Bloody Brass Knuckles"],
 ["Sidearm","Toxic Revenger"],
 ["Ranged","Golemsight Long Gun"]
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
function itemInfo(item){const name=String(item?.name||"");return CATALOG[name]||null}
function equipment(){
 const q=holder();if(!q)return {};
 q.equipped||={};return q.equipped;
}
function valid(item,character){
 const info=itemInfo(item);if(!info||!slots.includes(info.slot))return false;
 return !info.classes.length||info.classes.includes(character?.className);
}
function equip(index){
 const q=holder(),p=window.soaCharacters?.profile?.();if(!q||!Array.isArray(q.inventory))return {error:"Inventory unavailable"};
 const item=q.inventory[index],info=itemInfo(item);if(!valid(item,p))return {error:"Item cannot be equipped by this class"};
 if(!Number.isInteger(index)||index<0||index>=q.inventory.length)return {error:"Item missing"};
 equipment()[info.slot]=index;window.soaLivingCampaign?.persist?.();return {message:"Equipped "+item.name};
}
function unequip(slot){if(!slots.includes(slot))return;delete equipment()[slot];window.soaLivingCampaign?.persist?.()}
function modifiers(){
 const q=holder(),eq=equipment(),bonuses={STR:0,DEX:0,CON:0,INT:0,WIS:0,CHA:0,ac:0,attack:0,damage:0};
 const seen=new Set();
 for(const slot of slots){const idx=eq[slot],item=q?.inventory?.[idx],info=itemInfo(item);if(!Number.isInteger(idx)||seen.has(idx)||!info||info.slot!==slot||!valid(item,window.soaCharacters?.profile?.()))continue;seen.add(idx);for(const [k,v] of Object.entries(info.bonuses)){bonuses[k]+=v}}
 const base=baselineModifiers();
 const enchanting=window.soaEnchanting?.bonuses?.(state())||{};
 for(const k of Object.keys(bonuses))bonuses[k]+=(base[k]||0)+(enchanting[k]||0);
 return bonuses;
}
function panel(){
 const q=holder();if(!q)return null;
 const section=document.createElement("details"),head=document.createElement("summary");section.open=sessionStorage.getItem("soa-equipment-panel-open")==="1";section.ontoggle=()=>sessionStorage.setItem("soa-equipment-panel-open",section.open?"1":"0");head.textContent="Equipment & Reward Inventory";section.append(head);
 const intro=document.createElement("p");intro.textContent="Equipped items modify your stats and combat; rewards remain in your saved inventory.";section.append(intro);
 const isSnacky=window.soaCharacters?.profile?.()?.id==="snacky";
 if(isSnacky){
  const title=document.createElement("h3");title.textContent="Snacky's Current Equipment";section.append(title);
  const hint=document.createElement("p");hint.textContent="Forever item tooltip values shown where verified. Combat uses capped RPG conversions, not raw WoW stat totals. Unresolved ring and Highlander class eligibility are excluded from bonuses.";section.append(hint);
  const grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin:12px 0 20px";
  for(const [slot,name] of SNACKY_LOADOUT){
   const cell=document.createElement("div");cell.style.cssText="border:1px solid #ae9365;border-radius:8px;padding:9px;min-width:0";
   const label=document.createElement("small");label.style.cssText="display:block;opacity:.75";label.textContent=slot;
   const value=document.createElement("strong");value.style.cssText="display:block;overflow-wrap:anywhere";value.textContent=name;
   const item=window.soaForeverItems?.byName?.(name);
   const info=document.createElement("small");info.style.cssText="display:block;opacity:.85";
   if(item?.verified){const stats=Object.entries(item.stats||{}).map(([k,v])=>"+"+v+" "+k).join(" · ");info.textContent=(item.armor?item.armor+" armor · ":"")+stats+(item.effect?" · "+item.effect:"");}
   else info.textContent=item?.note||"Stats not verified";
   cell.append(label,value,info);grid.append(cell);
  }
  section.append(grid);
 }
 const subtitle=document.createElement("h3");subtitle.textContent="Additional Quest Rewards";section.append(subtitle);
 const items=q.inventory||[],eq=equipment();
 if(!items.length){const p=document.createElement("p");p.textContent="No additional quest equipment collected yet.";section.append(p)}
 items.forEach((item,i)=>{const info=itemInfo(item),row=document.createElement("div");row.style.cssText="padding:8px 0;border-top:1px solid #ad946b";
 const title=document.createElement("strong");title.textContent=item.name+" · "+(info?.rarity||item.rarity||"unclassified");row.append(title);
 const p=document.createElement("p");p.textContent=info?.description||"Quest item; no equipment statistics";row.append(p);
 if(info&&slots.includes(info.slot)){const button=document.createElement("button");button.type="button";const equipped=eq[info.slot]===i;button.textContent=equipped?"Unequip":"Equip";button.disabled=!equipped&&!valid(item,window.soaCharacters?.profile?.());button.onclick=()=>{if(equipped)unequip(info.slot);else equip(i);window.soaLivingCampaign?.refreshUI?.()};row.append(button)}
 section.append(row)});
 return section;
}
window.soaEquipment={CATALOG,SNACKY_LOADOUT,canonicalSlots,baselineModifiers,itemInfo,equip,unequip,equipment,modifiers,panel};
})();