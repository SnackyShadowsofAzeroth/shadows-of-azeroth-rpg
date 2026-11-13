/* M&M rules foundation for Shadows of Azeroth.
 * Data and resolvers only: this module does not render UI or alter existing saves.
 * Class abilities are supplied by the class source/catalog and remain learned-state gated.
 */
(()=>{"use strict";
const ABILITIES=Object.freeze(["str","dex","con","int","wis","cha"]);
const RACES=Object.freeze([
 {id:"human",name:"Human"},{id:"dwarf",name:"Dwarf"},{id:"elf",name:"Elf"},
 {id:"deep_elf",name:"Deep Elf"},{id:"gnome",name:"Gnome"},{id:"deep_gnome",name:"Deep Gnome"},
 {id:"halfling",name:"Halfling"},{id:"goblin",name:"Goblin"},{id:"troll",name:"Troll"},{id:"ogre",name:"Ogre"}
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
const raceById=id=>RACES.find(x=>x.id===id)||null;
const classById=id=>CLASSES.find(x=>x.id===id)||null;
function abilityModifier(score){const n=Number(score);if(!Number.isFinite(n))throw new TypeError("Ability score must be numeric.");return Math.floor((n-10)/2);}
function abilityModifiers(scores={}){return Object.fromEntries(ABILITIES.map(key=>[key,abilityModifier(scores[key]??10)]));}
function normalizeCharacter(input={}){
 const scores=Object.fromEntries(ABILITIES.map(key=>[key,Math.max(3,Math.min(25,Math.trunc(Number(input.abilities?.[key]??10))))]));
 const race=raceById(input.race),klass=classById(input.classId||input.class);
 if(!race||!klass)throw new Error("Choose a supported M&M race and class.");
 const level=Math.max(1,Math.trunc(Number(input.level)||1));
 const learned=Array.isArray(input.learnedAbilities)?[...new Set(input.learnedAbilities)]:[];
 return {...input,system:"mnm",race:race.id,classId:klass.id,classPrefix:klass.prefix,level,abilities:scores,modifiers:abilityModifiers(scores),learnedAbilities:learned};
}
function d20Check({roll,ability="dex",skillBonus=0,proficiency=0,dc}){
 const die=Math.trunc(Number(roll));if(die<1||die>20)throw new RangeError("d20 roll must be 1–20.");
 const total=die+abilityModifier(10)+Math.trunc(Number(skillBonus)||0)+Math.trunc(Number(proficiency)||0);
 return {roll:die,total,dc:Number(dc),success:die===20||die!==1&&total>=Number(dc),critical:die===20};
}
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
window.soaMnmRules=Object.freeze({version:1,abilities:ABILITIES,races:RACES,classes:CLASSES,raceById,classById,abilityModifier,abilityModifiers,normalizeCharacter,d20Check,abilityRequirement,canUseAbility});
})();
