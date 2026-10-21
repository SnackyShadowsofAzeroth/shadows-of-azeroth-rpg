(()=>{"use strict";
// One primary action pool is currently modeled by the legacy save field `en`.
// Keep this mapping pure so labels can change without migrating or resetting saves.
const primaryResources={
 Warrior:{key:"rage",label:"Rage"},
 Paladin:{key:"mana",label:"Mana"},
 Hunter:{key:"focus",label:"Focus"},
 Rogue:{key:"energy",label:"Energy"},
 Priest:{key:"mana",label:"Mana"},
 Mage:{key:"mana",label:"Mana"},
 Warlock:{key:"mana",label:"Mana"},
 Druid:{key:"mana",label:"Mana"},
 Shaman:{key:"mana",label:"Mana"}
};
function forClass(className,form){
 if(className==="Druid"&&form==="cat")return {key:"energy",label:"Energy"};
 if(className==="Druid"&&form==="bear")return {key:"rage",label:"Rage"};
 return primaryResources[className]||primaryResources.Rogue;
}
window.soaResources={forClass,primaryResources};
})();
