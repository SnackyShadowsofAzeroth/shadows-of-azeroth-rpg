(()=>{"use strict";
// Classic Era names/routes; level gates, encounter sizes and statistics are SoA
// adaptations. Rare-spawn and class-summoned encounters are excluded unless listed.
const rows=[
 ["rfc","Ragefire Chasm","Ragefire",8,13,18,"Orgrimmar|Cleft of Shadow|Ragefire Chasm","Ragefire Trogg|Searing Blade Cultist","Oggleflint|Taragaman the Hungerer|Jergosh the Invoker|Bazzalan"],
 ["wc","Wailing Caverns","Fang",10,15,25,"Barrens|Wailing Caverns","Deviate Ravager|Druid of the Fang","Lady Anacondra|Kresh|Lord Cobrahn|Lord Pythas|Skum|Lord Serpentis|Verdan the Everliving|Mutanus the Devourer"],
 ["deadmines","The Deadmines","Defias",10,18,23,"Westfall|Moonbrook|Deadmines","Defias Miner|Defias Overseer","Rhahk'Zor|Sneed's Shredder|Sneed|Gilnid|Mr. Smite|Captain Greenskin|Cookie|Edwin VanCleef"],
 ["sfk","Shadowfang Keep","Shadowfang",14,22,30,"Silverpine|Pyrewood|Shadowfang Keep","Shadowfang Worgen|Wailing Guardsman","Rethilgore|Razorclaw the Butcher|Baron Silverlaine|Commander Springvale|Odo the Blindwatcher|Fenrus the Devourer|Wolf Master Nandos|Archmage Arugal"],
 ["bfd","Blackfathom Deeps","Blackfathom",15,24,32,"Ashenvale|Zoram Strand|Blackfathom","Blackfathom Tidecaller|Twilight Acolyte","Ghamoo-ra|Lady Sarevess|Gelihast|Lorgus Jett|Baron Aquanis|Old Serra'kis|Twilight Lord Kelris|Aku'mai"],
 ["stockade","The Stockade","Stockade",15,22,30,"Stormwind|Stockade","Defias Prisoner|Defias Inmate","Targorr the Dread|Dextren Ward|Kam Deepfury|Hamhock|Bazil Thredd"],
 ["rfk","Razorfen Kraul","Razorfen",25,30,40,"Barrens|Razorfen Kraul","Razorfen Quilboar|Razorfen Geomancer","Roogug|Aggem Thorncurse|Death Speaker Jargba|Overlord Ramtusk|Agathelos the Raging|Charlga Razorflank"],
 ["gnomer","Gnomeregan","Gnomeregan",19,29,38,"Dun Morogh|Gnomeregan","Leprous Technician|Irradiated Trogg","Grubbis|Viscous Fallout|Electrocutioner 6000|Crowd Pummeler 9-60|Mekgineer Thermaplugg"],
 ["sm-graveyard","Scarlet Monastery: Graveyard","Scarlet Graveyard",20,26,36,"Tirisfal|Scarlet Monastery","Scarlet Interrogator|Haunting Phantasm","Interrogator Vishas|Bloodmage Thalnos"],
 ["sm-library","Scarlet Monastery: Library","Scarlet Library",20,29,39,"Tirisfal|Scarlet Monastery","Scarlet Monk|Scarlet Chaplain","Houndmaster Loksey|Arcanist Doan"],
 ["sm-armory","Scarlet Monastery: Armory","Scarlet Armory",20,32,42,"Tirisfal|Scarlet Monastery","Scarlet Myrmidon|Scarlet Defender","Herod"],
 ["sm-cathedral","Scarlet Monastery: Cathedral","Scarlet Cathedral",20,35,45,"Tirisfal|Scarlet Monastery","Scarlet Champion|Scarlet Abbot","High Inquisitor Fairbanks|Scarlet Commander Mograine|High Inquisitor Whitemane"],
 ["rfd","Razorfen Downs","Death's Head",35,37,46,"Barrens|Razorfen Downs","Death's Head Cultist|Risen Warrior","Tuten'kash|Mordresh Fire Eye|Glutton|Plaguemaw the Rotting|Amnennar the Coldbringer"],
 ["uldaman","Uldaman","Uldaman",30,40,50,"Badlands|Uldaman","Stonevault Trogg|Earthen Guardian","Revelosh|Baelog|Eric the Swift|Olaf|Ironaya|Obsidian Sentinel|Ancient Stone Keeper|Galgann Firehammer|Grimlok|Archaedas"],
 ["zf","Zul'Farrak","Sandfury",39,44,54,"Tanaris|Zul'Farrak","Sandfury Shadowhunter|Sandfury Blood Drinker","Antu'sul|Theka the Martyr|Witch Doctor Zum'rah|Sandfury Executioner|Nekrum Gutchewer|Shadowpriest Sezz'ziz|Sergeant Bly|Hydromancer Velratha|Gahz'rilla|Ruuzlu|Chief Ukorz Sandscalp"],
 ["mara","Maraudon","Maraudon",30,46,55,"Desolace|Valley of Spears|Maraudon","Maraudine Satyr|Corrupted Slime","Noxxion|Razorlash|Lord Vyletongue|Celebras the Cursed|Landslide|Tinkerer Gizlock|Rotgrip|Princess Theradras"],
 ["st","Sunken Temple","Atal'ai",35,50,60,"Swamp of Sorrows|Sunken Temple|Atal'Hakkar","Atal'ai Priest|Nightmare Wyrmkin","Atal'alarion|Gasher|Hukku|Loro|Mijan|Zolo|Zul'Lor|Jammal'an the Prophet|Ogom the Wretched|Dreamscythe|Weaver|Morphaz|Hazzas|Avatar of Hakkar|Shade of Eranikus"],
 ["brd","Blackrock Depths","Dark Iron",40,52,60,"Blackrock Mountain|Burning Steppes|Searing Gorge|Blackrock Depths","Dark Iron Taskmaster|Dark Iron Geomancer","High Interrogator Gerstahn|Lord Roccor|Houndmaster Grebmar|Gorosh the Dervish|Pyromancer Loregrain|Lord Incendius|Warder Stilgiss|Fineous Darkvire|Bael'Gar|General Angerforge|Golem Lord Argelmach|Hurley Blackbreath|Phalanx|Ribbly Screwspigot|Plugger Spazzring|Ambassador Flamelash|The Seven|Magmus|Emperor Dagran Thaurissan"],
 ["lbrs","Lower Blackrock Spire","Blackrock Lower",45,55,60,"Blackrock Mountain|Burning Steppes|Searing Gorge|Blackrock Spire","Blackrock Raider|Spirestone Enforcer","Highlord Omokk|Shadow Hunter Vosh'gajin|War Master Voone|Mother Smolderweb|Urok Doomhowl|Quartermaster Zigris|Halycon|Gizrul the Slavener|Overlord Wyrmthalak"],
 ["ubrs","Upper Blackrock Spire","Blackrock Upper",45,55,60,"Blackrock Mountain|Burning Steppes|Searing Gorge|Blackrock Spire","Blackhand Veteran|Blackhand Summoner","Pyroguard Emberseer|Solakar Flamewreath|Gyth|Warchief Rend Blackhand|The Beast|General Drakkisath"],
 ["dm-east","Dire Maul: East","Warpwood",45,55,60,"Feralas|Dire Maul","Warpwood Treant|Wildspawn Satyr","Pusillin|Lethtendris|Hydrospawn|Zevrim Thornhoof|Alzzin the Wildshaper"],
 ["dm-west","Dire Maul: West","Eldreth",45,55,60,"Feralas|Dire Maul","Eldreth Apparition|Arcane Aberration","Tendris Warpwood|Illyanna Ravenoak|Magister Kalendris|Immol'thar|Prince Tortheldrin"],
 ["dm-north","Dire Maul: North","Gordok",45,55,60,"Feralas|Dire Maul","Gordok Brute|Gordok Warlock","Guard Mol'dar|Stomper Kreeg|Guard Fengus|Guard Slip'kik|Captain Kromcrush|Cho'Rush the Observer|King Gordok"],
 ["strat-live","Stratholme: Living","Crimson",45,58,60,"Eastern Plaguelands|Stratholme","Scarlet Gallant|Scarlet Sorcerer","The Unforgiven|Timmy the Cruel|Cannon Master Willey|Archivist Galford|Grand Crusader Dathrohan / Balnazzar"],
 ["strat-undead","Stratholme: Undead","Deathcharger",45,58,60,"Eastern Plaguelands|Stratholme","Crypt Crawler|Bile Spewer","Baroness Anastari|Nerub'enkan|Maleki the Pallid|Magistrate Barthilas|Ramstein the Gorger|Baron Rivendare"],
 ["scholo","Scholomance","Scholomance",45,58,60,"Western Plaguelands|Caer Darrow|Scholomance","Scholomance Acolyte|Risen Construct","Kirtonos the Herald|Jandice Barov|Rattlegore|Marduk Blackpool|Vectus|Ras Frostwhisper|Instructor Malicia|Doctor Theolen Krastinov|Lorekeeper Polkelt|The Ravenian|Lady Illucia Barov|Lord Alexei Barov|Darkmaster Gandling"]
];
const CLASSES=["Warrior","Paladin","Hunter","Rogue","Priest","Mage","Warlock","Druid","Shaman"];
const primary={Warrior:"STR",Paladin:"STR",Hunter:"DEX",Rogue:"DEX",Priest:"WIS",Mage:"INT",Warlock:"CHA",Druid:"WIS",Shaman:"WIS"};
const CATALOG=rows.map(([id,name,prefix,level,low,high,region,minions,bosses])=>({id,name,prefix,level,low,high,region,minions:minions.split("|"),bosses:bosses.split("|"),quest:"Clear "+name,description:"Defeat every listed boss and its minion groups. Full-clear route; no skipping or tribute shortcut."}));
const ITEMS={};
for(const d of CATALOG)for(const cl of CLASSES)for(const slot of ["weapon","armor","trinket"]){
 const tier=d.low>=58?4:d.low>=50?3:d.low>=35?2:d.low>=25?1:0;
 const label=slot==="weapon"?(["Mage","Priest","Warlock","Druid"].includes(cl)?"Runestaff":cl==="Hunter"?"Longbow":"Warblade"):slot==="armor"?"Vestments":"Seal";
 const name=d.prefix+" "+cl+" "+label,bonuses=slot==="weapon"?{attack:[1,1,2,2,3][tier],damage:[2,3,4,5,6][tier]}:slot==="armor"?{ac:[1,1,2,3,3][tier],...(tier?{[primary[cl]]:tier===4?2:1}:{})}:{[primary[cl]]:tier>=3?2:1,...(tier>=2?{ac:1}:{})};
 ITEMS[name]={name,dungeon:d.id,slot,level:d.level,classes:[cl],rarity:tier>=2?"rare":"uncommon",bonuses,description:Object.entries(bonuses).map(([key,n])=>(key==="ac"?"AC":key==="damage"?"Damage":key==="attack"?"Attack":key)+" +"+n).join(" · ")+" · SoA-adapted dungeon gear"};
}
window.soaDungeonData={CATALOG,ITEMS,CLASSES,primary};
})();
