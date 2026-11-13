/* M&M in-game stat model for Shadows of Azeroth.
 * Race/class modifiers were supplied by the user. Baseline 16 and seven stat keys follow the in-game character sheet.
 * Three unreleased race modifiers are explicitly provisional; Var'nai is kept for old saves but not offered for new creation.
 */
(()=>{"use strict";
const ABILITIES=Object.freeze(["str","dex","con","int","wis","cha"]); // legacy six-score helper, retained for compatibility
const STAT_KEYS=Object.freeze(["str","sta","dex","agi","int","wis","cha"]);
const STAT_BASE=10;
const RACES=Object.freeze([
 {id:"human",name:"Human"},{id:"gnome",name:"Gnome"},{id:"deep_gnome",name:"Deep Gnome"},
 {id:"dwarf",name:"Dwarf"},{id:"deep_dwarf",name:"Deep Dwarf",provisional:true},
 {id:"high_elf",name:"High Elf",provisional:true},{id:"wood_elf",name:"Wood Elf"},{id:"deep_elf",name:"Deep Elf"},
 {id:"ogre",name:"Ogre"},{id:"halfling",name:"Halfling"},{id:"troll",name:"Troll",provisional:true},
 {id:"goblin",name:"Goblin"},{id:"varnai",name:"Var’nai",selectable:false}
]);
const CLASSES=Object.freeze([
 {id:"archer",prefix:"ARC",name:"Archer"},{id:"bard",prefix:"BRD",name:"Bard"},
 {id:"beastmaster",prefix:"BST",name:"Beastmaster"},{id:"cleric",prefix:"CLR",name:"Cleric"},
 {id:"druid",prefix:"DRU",name:"Druid"},{id:"elementalist",prefix:"ELE",name:"Elementalist"},
 {id:"enchanter",prefix:"ENC",name:"Enchanter"},{id:"fighter",prefix:"FTR",name:"Fighter"},
 {id:"inquisitor",prefix:"INQ",name:"Inquisitor"},{id:"monk",prefix:"MNK",name:"Monk"},
 {id:"necromancer",prefix:"NEC",name:"Necromancer"},{id:"paladin",prefix:"PAL",name:"Paladin"},
 {id:"ranger",prefix:"RNG",name:"Ranger"},{id:"rogue",prefix:"ROG",name:"Rogue"},
 {id:"shadow_knight",prefix:"SHD",name:"Shadow Knight"},{id:"shaman",prefix:"SHM",name:"Shaman"},
 {id:"spellblade",prefix:"SPB",name:"Spellblade"},{id:"wizard",prefix:"WIZ",name:"Wizard"}
]);
const AVAILABILITY={
 human:CLASSES.map(x=>x.id),
 gnome:["cleric","elementalist","enchanter","fighter","necromancer","paladin","rogue","spellblade","wizard"],
 deep_gnome:["beastmaster","bard","druid","elementalist","enchanter","necromancer","rogue","shaman","wizard"],
 dwarf:["bard","cleric","elementalist","enchanter","fighter","paladin","ranger","rogue","spellblade","wizard"],
 deep_dwarf:["cleric","elementalist","fighter","inquisitor","necromancer","paladin","shadow_knight","spellblade"],
 high_elf:["archer","cleric","elementalist","enchanter","inquisitor","paladin","spellblade","wizard"],
 wood_elf:["archer","bard","beastmaster","druid","fighter","ranger","rogue","shaman"],
 deep_elf:["archer","cleric","elementalist","enchanter","fighter","inquisitor","monk","necromancer","paladin","ranger","rogue","shadow_knight","spellblade","wizard"],
 ogre:["archer","beastmaster","elementalist","fighter","monk","ranger","shadow_knight","shaman"],
 halfling:["archer","bard","beastmaster","cleric","druid","fighter","paladin","ranger","rogue"],
 troll:["beastmaster","druid","enchanter","fighter","necromancer","rogue","shadow_knight","shaman"],
 goblin:["archer","beastmaster","druid","enchanter","fighter","necromancer","ranger","rogue","shadow_knight","shaman"],
 varnai:["cleric","enchanter","fighter","monk","necromancer","shaman"]
};
const zero=()=>Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
const vector=values=>Object.freeze({...zero(),...values});
const RACE_BONUSES=Object.freeze({
 deep_elf:vector({str:-2,sta:-1,agi:2,int:3,wis:1,cha:-1}),
 deep_gnome:vector({str:-2,sta:-1,dex:2,agi:2,int:3,wis:-2}),
 dwarf:vector({str:1,sta:1,dex:2,agi:-1,cha:-1}),
 gnome:vector({str:-2,sta:-1,dex:3,int:4,wis:-1,cha:-1}),
 goblin:vector({str:-1,sta:-1,dex:3,agi:3,int:1,cha:-3}),
 halfling:vector({str:-1,sta:1,agi:1,int:-2,wis:4,cha:-1}),
 human:vector({sta:1,cha:1}),
 ogre:vector({str:4,sta:3,dex:-1,agi:-2,wis:-1,cha:-1}),
 wood_elf:vector({str:-2,sta:-2,dex:2,agi:4,int:-1,wis:1}),
 // Provisional values for races whose in-game stat lines were unavailable.
 deep_dwarf:vector({str:2,sta:2,dex:1,agi:-2,int:2,wis:-1,cha:-2}),
 high_elf:vector({str:2,sta:1,dex:1,agi:-2,int:2,wis:-1,cha:-1}),
 troll:vector({str:2,sta:2,agi:2,int:-2,cha:-2}),
 // Retained only to avoid invalidating an old profile. Not offered in new character creation.
 varnai:vector({})
});
const CLASS_BONUSES=Object.freeze({
 archer:vector({str:2,agi:2,dex:4}),
 bard:vector({str:1,dex:3,cha:4}),
 beastmaster:vector({str:4,agi:2,wis:2}),
 cleric:vector({str:2,sta:2,wis:3,cha:1}),
 druid:vector({agi:2,wis:4,cha:2}),
 elementalist:vector({sta:4,int:4}),
 enchanter:vector({int:4,cha:4}),
 fighter:vector({str:4,sta:3,agi:1}),
 inquisitor:vector({str:1,sta:3,dex:1,int:2,cha:1}),
 monk:vector({str:1,agi:4,dex:3}),
 necromancer:vector({dex:4,int:4}),
 paladin:vector({str:2,sta:4,wis:2}),
 ranger:vector({str:1,agi:2,dex:3,wis:2}),
 rogue:vector({agi:4,dex:4}),
 shadow_knight:vector({str:3,sta:2,int:3}),
 shaman:vector({str:1,sta:2,dex:1,wis:4}),
 spellblade:vector({str:2,dex:3,int:3}),
 wizard:vector({str:3,dex:1,int:4})
});
/* Custom, lore-grounded design concepts; descriptions only, with no gameplay effects yet. */
const RACIAL_ABILITIES=Object.freeze({
 human:{name:"Many Roads",description:"A human's upbringing in a seafaring, noble, bureaucratic, or nomadic tradition lends a practical perspective to unfamiliar trouble."},
 gnome:{name:"Eureka",description:"A flash of patient curiosity turns a puzzling detail into an inventive lead, reflecting the gnomes' relentless search for truth."},
 deep_gnome:{name:"Spiral Cartographer",description:"Study of dreamscapes, astral paths, and the Spirals helps a deep gnome recognize a strange crossing and choose a route through it."},
 dwarf:{name:"Titan's Craft",description:"Stone, metal, and the old Galdri creation stories guide a dwarf's hands when making or repairing a tool under pressure."},
 deep_dwarf:{name:"Spirit Lattice",description:"Deep dwarves shape corrupted stone and bind spirits into strange works; a spirit lattice helps a crafted object answer its maker's command."},
 high_elf:{name:"Calafrey Discipline",description:"Centuries-old Cilindrine doctrine and mastery of magic help a high elf hold a measured line through a complex working."},
 wood_elf:{name:"Wyrdpath",description:"A Faelewyn reads the forest's living signs and notices where an existing Wyrdgate or Fae-touched path crosses the mortal wood."},
 deep_elf:{name:"Shadow's Veil",description:"Ail'trist survival in the Deep beneath the Shadow lends a practiced use of darkness and silence to conceal deliberate movement."},
 ogre:{name:"Storm Coast Fury",description:"Made for war against the Spiral Lords, an ogre turns fearless discipline into one committed burst of force."},
 halfling:{name:"Fontborn Memory",description:"A halfling's bond to Eth-ur and its ancient stories can bring a forgotten detail to mind when the land or its history matters."},
 troll:{name:"Tempered Survivor",description:"A troll adapts after a hunt turns against them, changing ground, method, or pace instead of yielding."},
 goblin:{name:"Secret-Sense",description:"A goblin notices the unguarded hinge, concealed entrance, or false note in a story that others overlook."}
});
const raceById=id=>RACES.find(x=>x.id===id)||null;
const raceByName=name=>RACES.find(x=>x.name===name)||null;
const classById=id=>CLASSES.find(x=>x.id===id)||null;
const classesForRace=id=>(AVAILABILITY[id]||[]).map(classById).filter(Boolean);
const selectableRaces=()=>RACES.filter(x=>x.selectable!==false);
function isValidSelection(p={}){const race=raceById(p.raceId||p.race)||raceByName(p.race);const klass=classById(p.classId)||CLASSES.find(x=>x.name===p.className);return !!race&&!!klass&&AVAILABILITY[race.id]?.includes(klass.id);}
function startingStats(raceId,classId){
 const race=raceById(raceId),klass=classById(classId);
 if(!race||!klass||!isValidSelection({raceId,classId}))throw new Error("Choose a supported M&M race and class combination.");
 const racial=RACE_BONUSES[race.id]||zero(),classBonus=CLASS_BONUSES[klass.id]||zero();
 const stats=Object.fromEntries(STAT_KEYS.map(key=>[key,STAT_BASE+racial[key]+classBonus[key]]));
 return {base:Object.fromEntries(STAT_KEYS.map(key=>[key,STAT_BASE])),racialBonuses:{...racial},classBonuses:{...classBonus},stats,provisional:!!race.provisional,available:race.selectable!==false};
}
function abilityModifier(score){const n=Number(score);if(!Number.isFinite(n))throw new TypeError("Ability score must be numeric.");return Math.floor((n-10)/2);}
function abilityModifiers(scores={}){return Object.fromEntries(ABILITIES.map(key=>[key,abilityModifier(scores[key]??10)]));}
function normalizeCharacter(input={}){
 const race=raceById(input.raceId||input.race)||raceByName(input.race),klass=classById(input.classId||input.class);
 if(!race||!klass||!AVAILABILITY[race.id]?.includes(klass.id))throw new Error("Choose a supported M&M race and class combination.");
 const sheet=startingStats(race.id,klass.id),level=Math.max(1,Math.trunc(Number(input.level)||1));
 const learned=Array.isArray(input.learnedAbilities)?[...new Set(input.learnedAbilities)]:[];
 const legacyScores=input.abilities?Object.fromEntries(ABILITIES.map(key=>[key,Math.max(3,Math.min(25,Math.trunc(Number(input.abilities[key]??10))))])):undefined;
 return {...input,system:"mnm",raceId:race.id,race:race.name,classId:klass.id,className:klass.name,classPrefix:klass.prefix,level,baseStats:sheet.base,racialBonuses:sheet.racialBonuses,classBonuses:sheet.classBonuses,stats:sheet.stats,statRulesVersion:1,provisionalRaceStats:sheet.provisional,availableForCreation:sheet.available,racialAbility:RACIAL_ABILITIES[race.id]||null,...(legacyScores?{abilities:legacyScores,modifiers:abilityModifiers(legacyScores)}:{}),learnedAbilities:learned};
}
function d20Check({roll,ability="dex",scores={},skillBonus=0,proficiency=0,dc}){const die=Math.trunc(Number(roll));if(die<1||die>20)throw new RangeError("d20 roll must be 1–20.");const total=die+abilityModifier(scores[ability]??10)+Math.trunc(Number(skillBonus)||0)+Math.trunc(Number(proficiency)||0);return {roll:die,total,dc:Number(dc),success:die===20||die!==1&&total>=Number(dc),critical:die===20};}
function abilityRequirement(ability,character,{target,equipment=[],reagents={},mana=Infinity}={}){
 if(!ability||!character)return "No ability or character supplied.";
 const expected=classById(character.classId||character.class);
 if(ability.source==="official"&&(!expected||ability.classId!==expected.id))return "This ability belongs to a different class.";
 if(ability.source==="official"&&Number(character.level)<Number(ability.level||1))return "Requires level "+ability.level+".";
 if(ability.source==="official"&&!character.learnedAbilities?.includes(ability.id))return "Learn this ability from a trainer or scroll first.";
 if(ability.requiresTarget&&!target)return "Choose a valid target.";
 if(ability.equipment&&!equipment.includes(ability.equipment))return "Requires "+ability.equipment+".";
 for(const [item,count] of Object.entries(ability.reagents||{}))if((Number(reagents[item])||0)<count)return "Requires "+count+" "+item+".";
 if((Number(ability.mana)||0)>Number(mana))return "Not enough Mana.";
 return null;
}
function canUseAbility(ability,character,context={}){return abilityRequirement(ability,character,context)===null;}
window.soaMnmRules=Object.freeze({version:3,abilities:ABILITIES,statKeys:STAT_KEYS,statBase:STAT_BASE,races:RACES,classes:CLASSES,raceBonuses:RACE_BONUSES,classBonuses:CLASS_BONUSES,racialAbilities:RACIAL_ABILITIES,raceById,raceByName,classById,classesForRace,selectableRaces,isValidSelection,startingStats,abilityModifier,abilityModifiers,normalizeCharacter,d20Check,abilityRequirement,canUseAbility});
})();