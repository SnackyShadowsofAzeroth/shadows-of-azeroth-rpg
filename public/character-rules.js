(()=>{"use strict";
const races={
 "Human":{faction:"Alliance",classes:["Warrior","Paladin","Hunter","Rogue","Priest","Mage","Warlock"]},
 "Dwarf":{faction:"Alliance",classes:["Warrior","Paladin","Hunter","Rogue","Priest","Shaman"]},
 "Night Elf":{faction:"Alliance",classes:["Warrior","Hunter","Rogue","Priest","Druid"]},
 "Gnome":{faction:"Alliance",classes:["Warrior","Rogue","Priest","Mage","Warlock"]},
 "Orc":{faction:"Horde",classes:["Warrior","Hunter","Rogue","Shaman","Mage","Warlock"]},
 "Undead":{faction:"Horde",classes:["Warrior","Paladin","Rogue","Priest","Mage","Warlock"]},
 "Tauren":{faction:"Horde",classes:["Warrior","Hunter","Shaman","Druid"]},
 "Troll":{faction:"Horde",classes:["Warrior","Hunter","Rogue","Priest","Shaman","Mage","Warlock"]},
 "Skyborne":{faction:"Choose",classes:["Warrior","Hunter","Rogue","Druid","Mage","Shaman"]}
};
const skyborneShared=["Warrior","Hunter","Rogue","Druid"];
const skybornePaths={Alliance:{name:"High Order Skyborne",className:"Mage"},Horde:{name:"Windshaper Skyborne",className:"Shaman"}};
function pathForFaction(faction){return skybornePaths[faction]?.name||""}
function displayFaction(profile){
 if(profile?.race==="Skyborne")return pathForFaction(profile.faction)+" ("+profile.faction+")";
 return profile?.faction||"";
}
function classesFor(raceName,faction){
 const race=races[raceName];if(!race)return [];
 if(raceName!=="Skyborne")return race.classes.slice();
 const exclusive=skybornePaths[faction]?.className;
 return [...skyborneShared,...(exclusive?[exclusive]:[])];
}
function validSelection(profile){
 const race=races[profile?.race];
 return !!race&&(race.faction==="Choose"?Object.hasOwn(skybornePaths,profile.faction):profile.faction===race.faction)&&classesFor(profile.race,profile.faction).includes(profile.className);
}
function factionOptions(raceName){
 const race=races[raceName];if(!race)return [];
 if(raceName==="Skyborne")return [
  {value:"Alliance",label:"Alliance — High Order Skyborne"},
  {value:"Horde",label:"Horde — Windshaper Skyborne"}
 ];
 return ["Alliance","Horde"].map(value=>({value,label:value+(value===race.faction?" — required by race":" — unavailable for this race"),disabled:value!==race.faction}));
}
window.soaCharacterRules={races,classesFor,validSelection,factionOptions,pathForFaction,displayFaction};
})();
