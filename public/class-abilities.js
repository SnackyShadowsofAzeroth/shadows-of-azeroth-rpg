(()=>{"use strict";
// Small, deterministic class kits. Abilities unlock from the saved level only;
// this catalog does not add or migrate anything in a character save.
const kits={
 Warrior:[
  ["heroic_strike","Heroic Strike",1,20,"damage","STR",8,5,"slashing","A forceful weapon strike."],
  ["shield_block","Shield Block",1,15,"guard","STR",0,0,"physical","Brace to blunt the next incoming attack."],
  ["overpower","Overpower",5,20,"damage","STR",10,7,"slashing","A practiced counterattack."],
  ["mortal_strike","Mortal Strike",10,30,"damage","STR",12,8,"slashing","A heavy, decisive blow."]
 ],
 Paladin:[
  ["crusader_strike","Crusader Strike",1,18,"damage","STR",8,5,"radiant","A weapon strike fueled by holy power."],
  ["flash_of_light","Flash of Light",1,24,"heal","WIS",8,5,"radiant","Restore health with a quick burst of light."],
  ["judgment","Judgment",5,22,"damage","WIS",10,6,"radiant","Hurl a measured blast of holy light."],
  ["divine_protection","Divine Protection",10,25,"guard","WIS",0,0,"radiant","Call on the Light to soften the next attack."]
 ],
 Hunter:[
  ["arcane_shot","Arcane Shot",1,18,"damage","DEX",8,5,"arcane","A focused ranged shot."],
  ["raptor_strike","Raptor Strike",1,15,"damage","DEX",8,4,"piercing","A quick close-range weapon strike."],
  ["concussive_shot","Concussive Shot",5,22,"interrupt","DEX",8,4,"physical","A disruptive shot that can interrupt on a hit."],
  ["aimed_shot","Aimed Shot",10,30,"damage","DEX",12,8,"piercing","Take careful aim for a powerful shot."]
 ],
 Rogue:[
  ["sinister_strike","Sinister Strike",1,20,"damage","DEX",8,6,"slashing","A fast, precise weapon attack."],
  ["kick","Kick",1,18,"interrupt","DEX",6,4,"bludgeoning","A quick kick that interrupts on a hit."],
  ["evasion","Evasion",1,0,"guard","DEX",0,0,"physical","Dodge and reduce the chance of a hit this exchange."],
  ["sprint","Sprint",1,10,"guard","DEX",0,0,"physical","Burst into motion to avoid the next attack."],
  ["blade_flurry","Blade Flurry",5,28,"damage","DEX",10,8,"slashing","A rapid flurry of blade work."],
  ["vanish","Vanish",5,20,"guard","DEX",0,0,"physical","Disappear into the shadows to evade an attack."],
  ["riposte","Riposte",5,10,"riposte","DEX",10,8,"slashing","A precise counterstrike, available after a parry."]
 ],
 Priest:[
  ["smite","Smite",1,18,"damage","WIS",8,5,"radiant","Strike a foe with focused holy power."],
  ["lesser_heal","Lesser Heal",1,22,"heal","WIS",8,5,"radiant","Restore health with a measured prayer."],
  ["power_word_shield","Power Word: Shield",5,24,"guard","WIS",0,0,"radiant","A protective ward helps blunt the next attack."],
  ["mind_blast","Mind Blast",10,30,"damage","WIS",12,7,"psychic","A sharp burst of focused will."]
 ],
 Mage:[
  ["fireball","Fireball",1,22,"damage","INT",10,5,"fire","Launch a concentrated bolt of flame."],
  ["frostbolt","Frostbolt",1,18,"interrupt","INT",8,4,"cold","A chilling bolt that can interrupt on a hit."],
  ["blink","Blink",5,18,"guard","INT",0,0,"arcane","Blink away from danger to avoid the next attack."],
  ["arcane_barrage","Arcane Barrage",10,30,"damage","INT",12,7,"arcane","Release a focused burst of arcane energy."]
 ],
 Warlock:[
  ["shadow_bolt","Shadow Bolt",1,20,"damage","CHA",10,5,"shadow","Hurl a bolt of shadow at your foe."],
  ["drain_life","Drain Life",1,24,"drain","CHA",8,3,"shadow","Damage a foe and recover some health."],
  ["corruption","Corruption",5,22,"damage","CHA",10,6,"shadow","Inflict a burst of lingering shadow damage."],
  ["fear","Fear",10,30,"interrupt","CHA",8,5,"shadow","Disrupt an enemy with a wave of fear."]
 ],
 Druid:[
  ["wrath","Wrath",1,18,"damage","WIS",8,5,"nature","Call down a swift blast of nature magic."],
  ["rejuvenation","Rejuvenation",1,22,"heal","WIS",8,5,"nature","Restore health with living nature magic."],
  ["moonfire","Moonfire",5,20,"damage","WIS",10,5,"arcane","Strike with a beam of lunar energy."],
  ["entangling_roots","Entangling Roots",10,28,"interrupt","WIS",8,4,"nature","Roots hinder and can interrupt your foe."]
 ],
 Shaman:[
  ["lightning_bolt","Lightning Bolt",1,18,"damage","WIS",8,5,"lightning","Hurl a focused bolt of lightning."],
  ["healing_wave","Healing Wave",1,24,"heal","WIS",8,5,"nature","Restore health with a surge of healing energy."],
  ["earth_shock","Earth Shock",5,22,"interrupt","WIS",10,5,"lightning","A burst of elemental force that can interrupt."],
  ["chain_lightning","Chain Lightning",10,30,"damage","WIS",12,7,"lightning","Unleash a powerful lightning strike."]
 ]
};
const normalize=([id,name,level,cost,effect,stat,die,flat,damageType,description])=>({id,name,level,cost,effect,stat,die,flat,damageType,description});
function all(className){return (kits[className]||[]).map(normalize)}
function available(className,level=1){const lv=Math.max(1,Math.min(60,Number(level)||1));return all(className).filter(x=>x.level<=lv)}
function get(id,className,level=1){return available(className,level).find(x=>x.id===id)||null}
function card(className,level=1){
 const box=document.createElement("section");box.className="soa-class-abilities";
 const heading=document.createElement("h3");heading.textContent="Class abilities";box.append(heading);
 const resource=window.soaResources?.forClass?.(className)?.label||"Resource";
 const hint=document.createElement("p");hint.className="soa-ability-caption";hint.textContent="Learned abilities · new techniques unlock automatically as you level · costs use "+resource;box.append(hint);
 const learned=available(className,level),upcoming=all(className).filter(x=>x.level>level);
 for(const ability of learned){const row=document.createElement("div");row.className="soa-class-ability";const name=document.createElement("strong"),detail=document.createElement("span");name.textContent=ability.name;detail.textContent=ability.description+" · "+(ability.cost?ability.cost+" "+resource:"No resource cost");row.append(name,detail);box.append(row)}
 if(upcoming.length){const next=upcoming[0],row=document.createElement("p");row.className="soa-next-ability";row.textContent="Next unlock · Level "+next.level+": "+next.name;box.append(row)}
 return box;
}
window.soaClassAbilities={all,available,get,card};
})();
