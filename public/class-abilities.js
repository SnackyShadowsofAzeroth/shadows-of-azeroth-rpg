(()=>{"use strict";
// Class actions are priced against +25 resource recovery per combat exchange.
// Core class attacks cost slightly more than round recovery; stronger moves deliberately spend banked resource.
const kits={
 Warrior:[
  ["heroic_strike","Heroic Strike",1,30,"damage","STR",8,5,"slashing","A forceful weapon strike.",0],
  ["shield_block","Shield Block",1,30,"guard","STR",0,0,"physical","Brace to blunt the next incoming attack.",2],
  ["overpower","Overpower",5,40,"damage","STR",10,7,"slashing","A practiced counterattack.",2],
  ["mortal_strike","Mortal Strike",10,45,"damage","STR",12,8,"slashing","A heavy, decisive blow.",2]
 ],
 Paladin:[
  ["crusader_strike","Crusader Strike",1,30,"damage","STR",8,5,"radiant","A weapon strike fueled by holy power.",0],
  ["flash_of_light","Flash of Light",1,35,"heal","WIS",8,5,"radiant","Restore health with a quick burst of light.",2],
  ["judgment","Judgment",5,35,"damage","WIS",10,6,"radiant","Hurl a measured blast of holy light.",1],
  ["divine_protection","Divine Protection",10,35,"guard","WIS",0,0,"radiant","Call on the Light to soften the next attack.",3]
 ],
 Hunter:[
  ["arcane_shot","Arcane Shot",1,30,"damage","DEX",8,5,"arcane","A focused ranged shot.",0],
  ["raptor_strike","Raptor Strike",1,30,"damage","DEX",8,4,"piercing","A quick close-range weapon strike.",0],
  ["concussive_shot","Concussive Shot",5,35,"interrupt","DEX",8,4,"physical","A disruptive shot that can interrupt on a hit.",2],
  ["aimed_shot","Aimed Shot",10,45,"damage","DEX",12,8,"piercing","Take careful aim for a powerful shot.",2]
 ],
 Rogue:[
  ["sinister_strike","Sinister Strike",1,30,"damage","DEX",8,6,"slashing","A fast, precise weapon attack.",0],
  ["kick","Kick",1,35,"interrupt","DEX",6,4,"bludgeoning","A quick kick that interrupts on a hit.",1],
  ["evasion","Evasion",1,35,"guard","DEX",0,0,"physical","Dodge and reduce the chance of a hit this exchange.",2],
  ["sprint","Sprint",1,30,"guard","DEX",0,0,"physical","Burst into motion to avoid the next attack.",2],
  ["blade_flurry","Blade Flurry",5,45,"damage","DEX",10,8,"slashing","A rapid flurry of blade work.",2],
  ["vanish","Vanish",5,40,"guard","DEX",0,0,"physical","Disappear into the shadows to automatically evade the next incoming attack (100% success).",5,{guaranteedEvade:true}],
  ["riposte","Riposte",5,30,"riposte","DEX",10,8,"slashing","A precise counterstrike, available after a parry.",1]
 ],
 Priest:[
  ["smite","Smite",1,30,"damage","WIS",8,5,"radiant","Strike a foe with focused holy power.",0],
  ["lesser_heal","Lesser Heal",1,35,"heal","WIS",8,5,"radiant","Restore health with a measured prayer.",2],
  ["power_word_shield","Power Word: Shield",5,30,"guard","WIS",0,0,"radiant","A protective ward helps blunt the next attack.",2],
  ["mind_blast","Mind Blast",10,45,"damage","WIS",12,7,"psychic","A sharp burst of focused will.",2]
 ],
 Mage:[
  ["fireball","Fireball",1,30,"damage","INT",10,5,"fire","Launch a concentrated bolt of flame.",0],
  ["frostbolt","Frostbolt",1,35,"interrupt","INT",8,4,"cold","A chilling bolt that can interrupt on a hit.",1],
  ["blink","Blink",5,30,"guard","INT",0,0,"arcane","Blink away from danger to avoid the next attack.",2],
  ["arcane_barrage","Arcane Barrage",10,45,"damage","INT",12,7,"arcane","Release a focused burst of arcane energy.",2]
 ],
 Warlock:[
  ["shadow_bolt","Shadow Bolt",1,30,"damage","CHA",10,5,"shadow","Hurl a bolt of shadow at your foe.",0],
  ["drain_life","Drain Life",1,40,"drain","CHA",8,3,"shadow","Damage a foe and recover some health.",2],
  ["corruption","Corruption",5,35,"damage","CHA",10,6,"shadow","Inflict a burst of lingering shadow damage.",2],
  ["fear","Fear",10,40,"interrupt","CHA",8,5,"shadow","Disrupt an enemy with a wave of fear.",2]
 ],
 Druid:[
  ["wrath","Wrath",1,30,"damage","WIS",8,5,"nature","Call down a swift blast of nature magic.",0],
  ["rejuvenation","Rejuvenation",1,35,"heal","WIS",8,5,"nature","Restore health with living nature magic.",2],
  ["moonfire","Moonfire",5,30,"damage","WIS",10,5,"arcane","Strike with a beam of lunar energy.",0],
  ["entangling_roots","Entangling Roots",10,35,"interrupt","WIS",8,4,"nature","Roots hinder and can interrupt your foe.",2]
 ],
 Shaman:[
  ["lightning_bolt","Lightning Bolt",1,30,"damage","WIS",8,5,"lightning","Hurl a focused bolt of lightning.",0],
  ["healing_wave","Healing Wave",1,35,"heal","WIS",8,5,"nature","Restore health with a surge of healing energy.",2],
  ["earth_shock","Earth Shock",5,35,"interrupt","WIS",10,5,"lightning","A burst of elemental force that can interrupt.",1],
  ["chain_lightning","Chain Lightning",10,45,"damage","WIS",12,7,"lightning","Unleash a powerful lightning strike.",2]
 ]
};
const normalize=([id,name,level,cost,effect,stat,die,flat,damageType,description,cooldown=0,mechanics={}])=>({id,name,level,cost,effect,stat,die,flat,damageType,description,cooldown,...mechanics});
function all(className){return (kits[className]||[]).map(normalize)}
function available(className,level=1){const lv=Math.max(1,Math.min(60,Number(level)||1)),learned=all(className).filter(x=>x.level<=lv),profile=window.soaCharacters?.profile?.();const signature=profile?.className===className?window.soaSpecializations?.ability?.(profile,lv):null;return signature?[...learned,signature]:learned}
function get(id,className,level=1){return available(className,level).find(x=>x.id===id)||null}
const fallbackCosts={strike:0,kick:35,evasion:35,riposte:30};
function costOf(id,className,level=1){return get(id,className,level)?.cost??fallbackCosts[id]??null}
function card(className,level=1){
 const box=document.createElement("section");box.className="soa-class-abilities";
 const heading=document.createElement("h3");heading.textContent="Class abilities";box.append(heading);
 const resource=window.soaResources?.forClass?.(className)?.label||"Resource";
 const hint=document.createElement("p");hint.className="soa-ability-caption";hint.textContent="Learned abilities · new techniques unlock automatically as you level · costs use "+resource;box.append(hint);
 const learned=available(className,level),upcoming=all(className).filter(x=>x.level>level);
 for(const ability of learned){const row=document.createElement("div");row.className="soa-class-ability";const name=document.createElement("strong"),detail=document.createElement("span");name.textContent=ability.name;detail.textContent=ability.description+" · "+(ability.cost?ability.cost+" "+resource:"No resource cost")+(ability.cooldown?" · "+ability.cooldown+" exchange cooldown":" · No cooldown");row.append(name,detail);box.append(row)}
 if(upcoming.length){const next=upcoming[0],row=document.createElement("p");row.className="soa-next-ability";row.textContent="Next unlock · Level "+next.level+": "+next.name;box.append(row)}
 return box;
}
window.soaClassAbilities={all,available,get,costOf,card};
})();