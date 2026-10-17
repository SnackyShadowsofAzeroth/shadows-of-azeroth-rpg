(()=>{"use strict";
const roll=(sides,rng=Math.random)=>1+Math.floor(Math.min(.999999999,Math.max(0,rng()))*sides);
const mod=score=>Math.floor((Number(score)-10)/2);
const attack=(bonus,ac,{advantage=0,rng=Math.random}={})=>{
 const a=roll(20,rng),b=advantage?roll(20,rng):null;
 const die=b===null?a:advantage>0?Math.max(a,b):Math.min(a,b);
 const total=die+bonus;
 return {die,other:b,total,bonus,ac,critical:die===20,hit:die===20||die!==1&&total>=ac};
};
const damage=(sides,bonus=0,critical=false,rng=Math.random)=>Math.max(1,roll(sides,rng)+(critical?roll(sides,rng):0)+bonus);
const enemyAC=enemy=>Math.max(10,Math.min(22,Number.isFinite(Number(enemy?.armorClass))?Number(enemy.armorClass):12+Math.min(5,Math.floor((Number(enemy?.maxHp)||20)/55))));
const enemyBonus=enemy=>Math.max(2,Math.min(10,Number.isFinite(Number(enemy?.attackBonus))?Number(enemy.attackBonus):2+Math.floor((Number(enemy?.maxHp)||20)/50)));
const enemyDie=enemy=>Math.max(4,Math.min(12,Number.isFinite(Number(enemy?.damageDie))?Number(enemy.damageDie):6));
const TYPES=[
 {test:/skeleton|undead|ghoul|zombie/i,type:"undead",ac:13,bonus:4,die:6,resist:["poison"],vulnerable:["bludgeoning"],initiative:1},
 {test:/wolf|worg|beast|spider/i,type:"beast",ac:12,bonus:4,die:6,resist:[],vulnerable:[],initiative:3},
 {test:/knight|captain|paladin|armored|armoured/i,type:"armored",ac:17,bonus:5,die:8,resist:[],vulnerable:[],initiative:0},
 {test:/rogue|assassin|scout|bandit/i,type:"skirmisher",ac:14,bonus:5,die:6,resist:[],vulnerable:[],initiative:4},
 {test:/mage|caster|warlock|priest/i,type:"caster",ac:11,bonus:4,die:6,resist:[],vulnerable:[],initiative:2},
 {test:/guard|soldier|watchman/i,type:"guard",ac:14,bonus:4,die:8,resist:[],vulnerable:[],initiative:1}
];
const statBlock=e=>{
 const match=TYPES.find(t=>t.test.test(String(e?.name||"")));
 const t=match||{type:"adventurer",ac:12,bonus:3,die:6,resist:[],vulnerable:[],initiative:1};
 return {...t,ac:Number.isFinite(e?.armorClass)?Math.max(8,Math.min(25,e.armorClass)):t.ac,bonus:Number.isFinite(e?.attackBonus)?Math.max(-2,Math.min(15,e.attackBonus)):t.bonus,die:Number.isFinite(e?.damageDie)?Math.max(4,Math.min(12,e.damageDie)):t.die};
};
const mitigate=(amount,type,block)=>Math.max(0,Math.floor(amount*(block.resist.includes(type)?.5:block.vulnerable.includes(type)?2:1)));
const initiative=(dexBonus=0,rng=Math.random)=>roll(20,rng)+dexBonus;
const weapon=(actor,ability)=>{
 const cl=actor?.className||"Rogue",bonus=actor?.modifiers?.DEX||0;
 if(ability==="kick")return {die:6,flat:4+bonus,type:"bludgeoning"};
 if(cl==="Warrior"||cl==="Paladin")return {die:8,flat:5+(actor?.modifiers?.STR||0),type:"slashing"};
 if(cl==="Mage"||cl==="Priest"||cl==="Warlock")return {die:6,flat:3+(actor?.modifiers?.INT||0),type:"force"};
 return {die:10,flat:10+bonus,type:"piercing"};
};
window.soaCombatRules={roll,mod,attack,damage,enemyAC,enemyBonus,enemyDie,statBlock,mitigate,initiative,weapon};
})();