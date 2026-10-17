(()=>{"use strict";
// Verified Forever tooltip data. Raw game stats are displayed verbatim;
// tabletop bonuses are scaled separately in equipment.js, never 1:1.
const records=[
["Gnomish Goggles","head",45,{AGI:9,STA:9,SPI:9},10545],
["Parachute Cloak","back",30,{AGI:8},10518,"Slow Fall: 10 seconds; 30-minute cooldown"],
["Barbaric Bracers","wrists",47,{STR:4,AGI:4,STA:6},18948],
["Mantle of Thieves","shoulders",77,{AGI:10,STA:4,SPI:3},2264],
["Dusky Leather Armor","chest",102,{AGI:14},7374],
["Tiger Hunter Gloves","hands",65,{STR:7,AGI:8},4107],
["Highlander's Chain Girdle","waist",61,{STA:5,AP:24},20090,"Forever leather variant; requires League of Arathor Honored (item usability unverified for Rogue)"],
["Triprunner Dungarees","legs",101,{STR:3,AGI:18,STA:6},9624],
["Feet of the Lynx","feet",63,{STR:3,AGI:8},1121],
["Ironspine’s Eye","finger1",0,{STR:4,AGI:9},7686],
["Ruby-Adorned Blade","mainhand",0,{AGI:3,STA:8},277246,"38–72 damage; speed 2.30"],
["Bloody Brass Knuckles","offhand",0,{AP:12,APHumanoid:15},7683,"24–46 damage; speed 1.60"],
["Toxic Revenger","sidearm",0,{},9453,"27–51 damage; speed 1.90; poison cloud proc"],
["Golemsight Long Gun","ranged",0,{AGI:6},273029,"29–54 damage; speed 2.50"]
];
const verified=Object.fromEntries(records.map(([name,slot,armor,stats,itemId,effect])=>[name,{name,slot,armor,stats,itemId,effect:effect||"",source:"https://www.wowhead.com/forever/item="+itemId,verified:true}]));
// User's naming and the verified Forever item may differ.
const tentative={"Field Researcher's Ring":{name:"Field Researcher's Ring",slot:"finger2",verified:false,possible:"Field Researcher's Loop",possibleSource:"https://www.wowhead.com/forever/item=281634",note:"No exact Forever item found under supplied name; possible Loop is +7 Agility, +7 Stamina. Not applied until confirmed."}};
const byName=name=>verified[name]||tentative[name]||null;
window.soaForeverItems={verified,tentative,byName,records};
})();