/* M&M in-game stat model for Shadows of Azeroth.
 * Race/class modifiers were supplied by the user. The seven stat keys follow the in-game character sheet; this project's starting baseline is 10.
 * Three unreleased race modifiers are explicitly provisional; Var'nai is kept for old saves but not offered for new creation.
 */
(()=>{"use strict";
const ABILITIES=Object.freeze(["str","dex","con","int","wis","cha"]); // legacy six-score helper, retained for compatibility
const STAT_KEYS=Object.freeze(["str","sta","dex","agi","int","wis","cha"]);
const STAT_BASE=10,MAX_LEVEL=60;
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
/* Original Shadows of Azeroth racial features. These are custom Chapter One mechanics, not official M&M abilities. */
const RACIAL_ABILITIES=Object.freeze({
 human:{name:"Many Roads",description:"Humans vary widely across Ba'Haara, Tarellian, Easthymn, and Sojourner traditions; no single disposition defines them.",effect:"After a failed investigation, try one different approach with a fresh roll and no racial modifier."},
 gnome:{name:"Eureka",description:"Patient curiosity and extraordinary epiphanies reflect the gnomes' relentless pursuit of truth.",effect:"During the investigation, reveal the clue without a roll; the scavenger begins the encounter with 2 Resolve."},
 deep_gnome:{name:"Spiral Cartographer",description:"Deep gnomes explore dreamscapes, astral paths, and the Spirals, mapping ways through realities others fear to enter.",effect:"During the encounter, map a safe alternate route and finish with a reliable warning; the stolen slate remains unrecovered."},
 dwarf:{name:"Titan's Craft",description:"A dwarf's practical craft, stone lore, and steadfastness draw on Galdri traditions without assuming every dwarf is a smith.",effect:"During the encounter, remove 1 Danger; if Danger is still 0, brace the marker so it cancels the next Danger increase."},
 deep_dwarf:{name:"Spirit Lattice",description:"Deep dwarves bind spirits into strange creations and reshape corrupted stone with cold precision.",effect:"Prepare a spirit lattice: your next failed encounter exchange also removes 1 scavenger Resolve, while Danger still rises."},
 high_elf:{name:"Calafrey Discipline",description:"Cilindrine magical mastery and measured doctrine let a high elf hold a precise line under pressure.",effect:"Prepare a ward that prevents Danger from rising on your next failed encounter exchange."},
 wood_elf:{name:"Wyrdpath",description:"Faelewyn read the living forest and its paths; this feature follows natural signs and does not create or summon a Wyrdgate.",effect:"Take a living flank: your next successful encounter exchange removes 2 Resolve instead of 1, with no roll bonus."},
 deep_elf:{name:"Shadow's Veil",description:"The Ail'trist adapted to the Deep beneath the Shadow, learning to move deliberately through darkness and danger.",effect:"After finding a clue, use the cover of darkness to remove 1 scavenger Resolve without raising Danger."},
 ogre:{name:"Storm Coast Fury",description:"Ogres were made for war and forged a disciplined martial society after the Storm Coast catastrophe.",effect:"Make a committed assault: remove 1 scavenger Resolve and add 1 Danger."},
 halfling:{name:"Fontborn Memory",description:"Halflings' bond to Eth-ur and their long tradition of storytelling and lorekeeping preserve old ways through memory.",effect:"When the scavenger has 1 Resolve, settle the encounter peacefully and recover the slate through a remembered wayfarer's tale."},
 troll:{name:"Tempered Survivor",description:"Trolls are resilient, adaptive hunters whose lives have been tempered by war and catastrophe.",effect:"Once, when Danger would force the scavenger to escape, hold at 2 Danger and counter for 1 Resolve."},
 goblin:{name:"Secret-Sense",description:"Goblins are valued for sensing secrets, hidden entrances, deception, and opportunities others miss.",effect:"After finding a clue, attempt an unmodified Dexterity check (DC 13) to recover the slate through a hidden route; failure adds Danger."}
});
const raceById=const raceById=id=>RACES.find(x=>x.id===id)||null;
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
 const sheet=startingStats(race.id,klass.id),level=Math.max(1,Math.min(MAX_LEVEL,Math.trunc(Number(input.level)||1)));
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
window.soaMnmRules=Object.freeze({version:4,maxLevel:MAX_LEVEL,abilities:ABILITIES,statKeys:STAT_KEYS,statBase:STAT_BASE,races:RACES,classes:CLASSES,raceBonuses:RACE_BONUSES,classBonuses:CLASS_BONUSES,racialAbilities:RACIAL_ABILITIES,raceById,raceByName,classById,classesForRace,selectableRaces,isValidSelection,startingStats,abilityModifier,abilityModifiers,normalizeCharacter,d20Check,abilityRequirement,canUseAbility});
})();