/* M&M in-game stat model for M&M: RPG.
 * Race/class modifiers were supplied by the user. The seven stat keys follow the in-game character sheet; this project's starting baseline is 10.
 * Deep Dwarf, High Elf, and Troll modifiers are provisional and retained for saved profiles, but those races are not offered for new creation until in-game values are supplied. Var'nai is also kept for old saves only.
 */
(()=>{"use strict";
const ABILITIES=Object.freeze(["str","dex","con","int","wis","cha"]); // legacy six-score helper, retained for compatibility
const STAT_KEYS=Object.freeze(["str","sta","dex","agi","int","wis","cha"]);
const STAT_BASE=10,MAX_LEVEL=60;
const RACES=Object.freeze([
 {id:"human",name:"Human"},{id:"gnome",name:"Gnome"},{id:"deep_gnome",name:"Deep Gnome"},
 {id:"dwarf",name:"Dwarf"},{id:"deep_dwarf",name:"Deep Dwarf",provisional:true,selectable:false},
 {id:"high_elf",name:"High Elf",provisional:true,selectable:false},{id:"wood_elf",name:"Wood Elf"},{id:"deep_elf",name:"Deep Elf"},
 {id:"ogre",name:"Ogre"},{id:"halfling",name:"Halfling"},{id:"troll",name:"Troll",provisional:true,selectable:false},
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
/* Original M&M: RPG racial features. Their displayed descriptions stay general and are not official M&M abilities. */
const RACIAL_ABILITIES=Object.freeze({
 human:Object.freeze({"name":"Many Roads","description":"A Ba’Haara sailor and a Sojourner trader might solve the same problem in entirely different ways. You know when to borrow a method outside your usual training.","effect":"Choose a different stat for one offered story action. Its difficulty and what you are trying to accomplish stay the same.","mode":"story"}),
 gnome:Object.freeze({"name":"Eureka","description":"Sometimes a gnome has the answer before anyone else has finished asking the question. The trick is knowing when the answer is good enough.","effect":"Take a 12 instead of rolling for one offered action. Your usual modifier and the target still apply.","mode":"story"}),
 deep_gnome:Object.freeze({"name":"Spiral Cartographer","description":"Explorers of the Spirals learn to picture paths that double back on themselves. Even on ordinary ground, you look for the turning everyone else has walked past.","effect":"Bypass an early scene without a roll or a discovery. On the next scene, the offered approaches are one difficulty tier easier, to a minimum of Easy.","mode":"story"}),
 goblin:Object.freeze({"name":"Secret-Sense","description":"At the Heap, knowing which entrance was meant to be missed can be worth more than knowing the way in. You notice the hesitation that gives an opening away.","effect":"See your next d20 before choosing a story action. Choose how to use it; that die is yours even if you write your own approach.","mode":"story"}),
 halfling:Object.freeze({"name":"Fontborn Memory","description":"Halflings have kept Eth-ur’s stories through ages of travel and quiet years in the warrens. A deed from this very journey is already worth telling twice.","effect":"Recall one of your successes from this chapter. Use its die for a new offered action, with the new action’s modifier and difficulty.","mode":"story"}),
 dwarf:Object.freeze({"name":"Galdri Foothold","description":"A traveler in the Galdri Range learns to trust the ground before trusting a shield. You let a hard blow break against a well-chosen stance.","effect":"Meet a heavy windup head-on. Stop the blow and expose the foe: your next weapon attack gets +2 to hit and deals 3 extra damage on a hit.","mode":"combat","combatAction":"brace"}),
 ogre:Object.freeze({"name":"Storm Coast Breaker","description":"The warlords of the north prize the soldier who can put all that strength exactly where it counts. You drive through a guard in one committed motion.","effect":"Make a Strength weapon attack. Break through an existing brace and deal 3 extra damage on a hit. A surviving foe still takes its turn.","mode":"combat","combatAction":"assault"}),
 deep_elf:Object.freeze({"name":"Shadow’s Patience","description":"The Ail’trist survived in the Deep by listening when others rushed ahead. You wait for a foe to give away the one instant it cannot answer.","effect":"Against an exposed foe, make a weapon attack with the opening’s bonuses. A hit also denies its reply; on a miss it acts normally.","mode":"combat","combatAction":"ambush"}),
 wood_elf:Object.freeze({"name":"Keeper’s Footfall","description":"The Faelewyn who keep watch over the woods learn how little it takes to betray a footstep. You leave while your pursuer’s attention is elsewhere.","effect":"When the foe is guarding or recovering, withdraw safely. There is no escape roll, enemy reply, or victory reward.","mode":"combat","combatAction":"flank"}),
 deep_dwarf:Object.freeze({"name":"Spirit Lattice","description":"In the workshops of the Deep, patient hands give strange vessels a life of their own. Yours stirs when an opponent pauses to gather strength.","effect":"Interrupt Guard or Recover, strip an existing brace, and restore up to 4 Health.","mode":"combat","combatAction":"weaken"}),
 high_elf:Object.freeze({"name":"Cilindrine Ward","description":"Cilindrine discipline favors a spell laid precisely over power spent in haste. You hold one measured ward in reserve.","effect":"Spend 1 Focus to absorb up to 6 damage from the next hit in this fight. A miss does not expend the ward.","mode":"combat","combatAction":"ward"}),
 troll:Object.freeze({"name":"Tempered Survivor","description":"A hunter in the crags may have to make it home long after the easy fight is over. You husband your strength for that moment.","effect":"At half Health or less, regain one fifth of your maximum Health, rounded up. The foe still takes its turn.","mode":"combat","combatAction":"recover"}),
 varnai:Object.freeze({"name":"Stillwater Breath","description":"The Var’nai won the freedom to live beside the waters of Eth-ur. You draw on the discipline of your people to steady your breath under pressure.","effect":"When short of Focus and facing a quick or heavy strike, regain up to 3 Focus and guard this turn: +4 Defense and half damage if hit.","mode":"combat","combatAction":"riptide"})
});
const raceById=id=>RACES.find(x=>x.id===id)||null;
const raceByName=name=>RACES.find(x=>x.name===name)||null;
const classById=id=>CLASSES.find(x=>x.id===id)||null;
const classesForRace=id=>(AVAILABILITY[id]||[]).map(classById).filter(Boolean);
const isSelectableRace=id=>{const race=raceById(id)||raceByName(id);return !!race&&race.selectable!==false;};
const selectableRaces=()=>RACES.filter(x=>isSelectableRace(x.id));
const STARTING_LOCATIONS=Object.freeze({human:"night-harbor",halfling:"night-harbor",gnome:"night-harbor",dwarf:"night-harbor",deep_gnome:"underdocks",deep_elf:"underdocks",goblin:"underdocks",ogre:"underdocks",wood_elf:"penshaw",deep_dwarf:"night-harbor",high_elf:"night-harbor",troll:"night-harbor",varnai:"night-harbor"});
const startLocationForRace=id=>STARTING_LOCATIONS[raceById(id)?.id]||"night-harbor";
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
 const startingLocation=startLocationForRace(race.id);
 return {...input,startingLocation,system:"mnm",raceId:race.id,race:race.name,classId:klass.id,className:klass.name,classPrefix:klass.prefix,level,baseStats:sheet.base,racialBonuses:sheet.racialBonuses,classBonuses:sheet.classBonuses,stats:sheet.stats,statRulesVersion:1,provisionalRaceStats:sheet.provisional,availableForCreation:sheet.available,racialAbility:RACIAL_ABILITIES[race.id]||null,...(legacyScores?{abilities:legacyScores,modifiers:abilityModifiers(legacyScores)}:{}),learnedAbilities:learned};
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
window.soaMnmRules=Object.freeze({version:4,maxLevel:MAX_LEVEL,abilities:ABILITIES,statKeys:STAT_KEYS,statBase:STAT_BASE,races:RACES,classes:CLASSES,raceBonuses:RACE_BONUSES,classBonuses:CLASS_BONUSES,racialAbilities:RACIAL_ABILITIES,raceById,raceByName,classById,classesForRace,isSelectableRace,selectableRaces,startLocationForRace,isValidSelection,startingStats,abilityModifier,abilityModifiers,normalizeCharacter,d20Check,abilityRequirement,canUseAbility});
})();
