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
window.soaCombatRules={roll,mod,attack,damage,enemyAC,enemyBonus,enemyDie};
})();