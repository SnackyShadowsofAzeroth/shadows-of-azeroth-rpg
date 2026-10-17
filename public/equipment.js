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
 return bonuses;
}
function panel(){
 const q=holder();if(!q)return null;
 const section=document.createElement("details"),head=document.createElement("summary");section.open=sessionStorage.getItem("soa-equipment-panel-open")==="1";section.ontoggle=()=>sessionStorage.setItem("soa-equipment-panel-open",section.open?"1":"0");head.textContent="Equipment & Reward Inventory";section.append(head);
 const intro=document.createElement("p");intro.textContent="Equipped items modify your stats and combat; rewards remain in your saved inventory.";section.append(intro);
 const items=q.inventory||[],eq=equipment();
 if(!items.length){const p=document.createElement("p");p.textContent="No quest equipment collected yet.";section.append(p)}
 items.forEach((item,i)=>{const info=itemInfo(item),row=document.createElement("div");row.style.cssText="padding:8px 0;border-top:1px solid #ad946b";
 const title=document.createElement("strong");title.textContent=item.name+" · "+(info?.rarity||item.rarity||"unclassified");row.append(title);
 const p=document.createElement("p");p.textContent=info?.description||"Quest item; no equipment statistics";row.append(p);
 if(info&&slots.includes(info.slot)){const button=document.createElement("button");button.type="button";const equipped=eq[info.slot]===i;button.textContent=equipped?"Unequip":"Equip";button.disabled=!equipped&&!valid(item,window.soaCharacters?.profile?.());button.onclick=()=>{if(equipped)unequip(info.slot);else equip(i);window.soaLivingCampaign?.refreshUI?.()};row.append(button)}
 section.append(row)});
 return section;
}
window.soaEquipment={CATALOG,itemInfo,equip,unequip,equipment,modifiers,panel};
})();