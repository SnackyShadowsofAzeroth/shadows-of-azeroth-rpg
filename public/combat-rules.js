(()=>{"use strict";
const roll=(sides,rng=Math.random)=>1+Math.floor(Math.min(.999999999,Math.max(0,rng()))*sides);
const mod=score=>Math.floor((Number(score)-10)/2);
const attack=(bonus,ac,{advantage=0,criticalOn=20,rng=Math.random}={})=>{
 const a=roll(20,rng),b=advantage?roll(20,rng):null;
 const die=b===null?a:advantage>0?Math.max(a,b):Math.min(a,b);
 const total=die+bonus,threshold=Math.max(2,Math.min(20,Math.trunc(Number(criticalOn)||20)));
 const critical=die>=threshold&&die!==1;
 return {die,other:b,total,bonus,ac,critical,hit:critical||die!==1&&total>=ac};
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
// One enemy phase per player action. This helper never advances time, resources,
// cooldowns or regeneration; callers settle those once after the whole phase.
function resolveEnemyPhase({s,c,enemies,rules,round,heroAC=12,heroName="Your hero",guard=false,guaranteedEvade=false,interruptedTarget=null,attackPenalty=0,allowParry=false,allies=[],allyAC=()=>12}){
 const attacks=[];let taken=0,heroTaken=0,heroHits=0,parry=false;
 const evasionActive=(Number(c.evasionUntil)||0)>=round;
 for(const enemy of enemies){
  if(enemy.hp<=0)continue;
  const row={index:attacks.length+1,enemy:enemy.name,recipient:heroName,before:s.hp,after:s.hp,damage:0,hit:false,critical:false,die:null,total:null,bonus:null,defenderAC:heroAC,evasionRoll:null,evaded:false,parry:false};
  const caught=c.snaredEnemy===enemy.name&&c.snareUntil>=round;
  if(enemy===interruptedTarget||caught){row.skipped=true;row.reason=caught?"snared":"interrupted";if(caught)c.snareUntil=0;attacks.push(row);continue;}
  if(guaranteedEvade){row.evaded=true;row.guaranteedEvade=true;attacks.push(row);continue;}
  const eligible=allies.filter(a=>Number.isInteger(a.hp)&&a.hp>0&&a.maxHp>0);
  const ally=eligible.length&&Math.random()<.35?eligible[Math.floor(Math.random()*eligible.length)]:null;
  const defender=ally||s;
  row.recipient=ally?.name||heroName;row.before=defender.hp;row.defenderAC=ally?allyAC(ally):heroAC;
  const block=rules.statBlock(enemy),roll=rules.attack(block.bonus-attackPenalty,row.defenderAC,{advantage:guard||c.guardUntil>=round?-1:0});
  Object.assign(row,{die:roll.die,total:roll.total,bonus:roll.bonus,hit:!!roll.hit,critical:!!roll.critical});
  if(roll.hit&&!ally&&evasionActive){row.evasionRoll=rules.roll(100);row.evaded=row.evasionRoll<=50;}
  if(roll.hit&&!row.evaded){
   row.damage=Math.min(Math.max(0,defender.hp-(ally?0:1)),rules.damage(block.die,2,roll.critical));defender.hp-=row.damage;taken+=row.damage;
   if(!ally){heroTaken+=row.damage;if(row.damage>0)heroHits++;}
   else {c.partyHealth||={};c.partyHealth[ally.name]={hp:ally.hp,maxHp:ally.maxHp,derived:c.partyHealth[ally.name]?.derived===true};}
  }
  row.after=defender.hp;
  row.parry=allowParry&&!ally&&!roll.hit&&roll.total<row.defenderAC&&roll.die>1&&Math.random()<.5;parry=parry||row.parry;
  attacks.push(row);
 }
 const first=attacks.find(x=>!x.skipped)||attacks[0];
 return {attacks,taken,heroTaken,heroHits,parry,evaded:attacks.some(x=>x.evaded),evasionActive,evasionRoll:first?.evasionRoll??null,first};
}
function enemyPhaseSummary(attacks){
 return attacks.length?attacks.map(row=>{
  if(row.skipped)return row.enemy+" is "+row.reason+" and cannot attack.";
  if(row.guaranteedEvade)return row.enemy+"'s attack is automatically evaded by Vanish.";
  const roll="d20 "+row.die+" + "+row.bonus+" = "+row.total+" vs AC "+row.defenderAC;
  if(row.evaded)return row.enemy+"'s hit is dodged by Evasion (d100 "+row.evasionRoll+" ≤ 50; "+roll+").";
  const dodge=row.evasionRoll!==null?" Evasion fails (d100 "+row.evasionRoll+" > 50).":"";
  return row.enemy+(row.hit?" hits ":" misses ")+row.recipient+" ("+roll+")"+(row.critical?" · Critical":"")+": "+row.damage+" damage ("+row.before+" → "+row.after+" HP)."+dodge+(row.parry?" Parried; Riposte is ready next turn.":"");
 }).join(" "):"No living enemy can attack.";
}
window.soaEnemyPhase={resolve:resolveEnemyPhase,summary:enemyPhaseSummary};
window.soaCombatRules={roll,mod,attack,damage,enemyAC,enemyBonus,enemyDie,statBlock,mitigate,initiative,weapon};
})();
