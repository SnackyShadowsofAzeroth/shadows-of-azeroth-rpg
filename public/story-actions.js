(()=>{"use strict";
const normalize=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const mentions=(text,name)=>(" "+normalize(text)+" ").includes(" "+normalize(name)+" ");
const obstacles=/\b(?:root[ -]knot|tangled roots|vines?|brambles?|barricade|wooden door|door|padlock|lock|chains?|webbing|spiderweb|boulder|fallen branch|fallen log|obstruction|obstacle|bindings?|thorny growth|corrupted growth|corruption|ritual seal|magical seal|ward|runes?|debris|ice wall|ice barrier|blocked passage)\b/gi;
const creatures=/\b(?:satyr|bandit|raider|poacher|cultist|saboteur|smuggler|assassin|ghoul|skeleton|zombie|wraith|spider|wolf|worg|boar|raptor|scorpid|harpy|gnoll|kobold|murloc|trogg|ogre|golem|guard|stalker|horror|abomination|beast|creature)\b/gi;
const unavailable=/\b(?:dead|corpse|fallen|defeated|unconscious|incapacitated|absent|distant|faraway|miles away|remember|recalled|rumou?r|legend|painting|statue|friendly|peaceful|tame|no longer|not present|no (?:visible |nearby )?(?:enemy|hostile|satyr|bandit|guard))\b/i;
const hostile=/\b(?:hostile|enemy|lurks?|lurking|prowls?|prowling|snarls?|snarling|lunges?|lunging|attacks?|attacking|charges?|charging|threatens?|threatening|blocks?|blocking|aggressive|ambush|stalks?|stalking|raider|bandit|corruptor)\b/i;
function obstacle(action,c){
 const story=String(c.scene?.story||"");
 return [...String(action?.text||"").matchAll(obstacles)].map(m=>normalize(m[0])).find(name=>story.split(/(?<=[.!?])\s+|\n+/).some(sentence=>mentions(sentence,name)&&!/\b(?:destroyed|shattered|cleared|removed|gone|absent|imaginary|hypothetical)\b/i.test(sentence)&&!mentions(sentence,"no "+name)))||null;
}
function visibleHostile(action,c,level){
 const story=String(c.scene?.story||""),text=String(action?.text||"");
 for(const e of c.scene?.enemies||[]){
  if(!e||typeof e.name!=="string"||!mentions(text,e.name)||!Number.isInteger(e.hp)||e.hp<=0||!Number.isInteger(e.maxHp)||e.maxHp<e.hp)continue;
  if(!story.split(/(?<=[.!?])\s+|\n+/).some(sentence=>mentions(sentence,e.name)&&!unavailable.test(sentence)))continue;
  if((c.defeatedEnemies||[]).includes(String(c.scene?.location||"")+"|"+e.name.toLowerCase()))continue;
  return {name:e.name,hp:Math.min(500,e.hp),maxHp:Math.min(500,e.maxHp)};
 }
 // A choice alone is not proof of a creature's presence. Prose must establish it here.
 for(const name of [...text.matchAll(creatures)].map(m=>m[0])){
  const sentences=story.split(/(?<=[.!?])\s+|\n+/),mentionsAt=[];
  sentences.forEach((sentence,index)=>{if(mentions(sentence,name)&&!unavailable.test(sentence))mentionsAt.push(index)});
  // Scene prose may name a threat in one sentence and describe its attack posture nearby.
  if(!mentionsAt.some(index=>sentences.slice(Math.max(0,index-1),Math.min(sentences.length,index+3)).some(sentence=>hostile.test(sentence)&&!unavailable.test(sentence))))continue;
  const structured=(c.scene?.enemies||[]).find(e=>mentions(e.name,name)&&mentions(text,e.name));
  const storyOccurrence=story.match(new RegExp("\\b"+name+"\\b","i"));
  const before=storyOccurrence?story.slice(0,storyOccurrence.index):"";
  const titlePrefix=before.match(/(?:^|[^.!?\n])((?:[A-Z][a-z'’’-]*\s+){0,2})$/)?.[1]||"";
  const inferredName=(titlePrefix+name).trim().replace(/^(?:The|A|An)\s+/,"");
  const targetName=structured?.name||inferredName[0].toUpperCase()+inferredName.slice(1);
  if((c.defeatedEnemies||[]).includes(String(c.scene?.location||"")+"|"+targetName.toLowerCase()))continue;
  const maxHp=Number.isInteger(structured?.maxHp)&&structured.maxHp>0?Math.min(500,structured.maxHp):Math.min(140,35+Math.max(1,level)*2);
  const hp=Number.isInteger(structured?.hp)?Math.min(maxHp,structured.hp):maxHp;if(hp<=0)continue;
  return {name:targetName,hp,maxHp};
 }
 return null;
}
function named(action,hero,level){
 const all=window.soaClassAbilities?.all?.(hero.className)||[],learned=window.soaClassAbilities?.available?.(hero.className,level)||[];
 const options=[...all,...learned].sort((a,b)=>b.name.length-a.name.length);
 const own=options.find(a=>a.id===action.ability)||options.find(a=>mentions(action.text,a.name));if(own)return own;
 if(/\b(?:cast|channel|invoke|unleash)\b/i.test(action.text||""))for(const other of ["Warrior","Paladin","Hunter","Rogue","Priest","Mage","Warlock","Druid","Shaman"]){if(other===hero.className)continue;const foreign=window.soaClassAbilities?.all?.(other).find(a=>mentions(action.text,a.name));if(foreign)return foreign;}
 return null;
}
function plan({action,s,c,hero,level,enemies=[],selected=null,cooldown=()=>0,maxHP=100}){
 if(!action||["racial","druid_quest"].includes(action.type)||action.craftRecipe||action.survey||["bromli_guard","pippa_snare","lethariel_heal"].includes(action.ability)||/\b(?:don't|do not|avoid|without)\b.{0,45}\b(?:cast|use|vanish)\b/i.test(action.text||""))return null;
 if(hero.className==="Druid"&&window.soaDruid?.shiftFrom){
  const form=window.soaDruid.shiftFrom(action);
  if(form!==null){const combat=enemies.length>0,error=window.soaDruid.shiftError(s,c,hero,level,form,combat);return error?{error}:{kind:"shift",form,combat};}
 }
 const known=named(action,hero,level);
 if(known&&!action.ability&&action.type!=="combat"&&!/\b(?:cast|use|channel|invoke|call|unleash|heal|strike|attack|blast|burn|freeze|bind|blink|vanish|prowl|enter|activate)\b/i.test(action.text||"")&&!normalize(action.text).startsWith(normalize(known.name)))return null;
 const ability=known?window.soaClassAbilities?.get?.(known.id,hero.className,level):null;
 if(known&&!ability)return {error:known.name+" is not learned or unavailable in this form."};
 if(!ability&&action.type!=="combat")return null;
 if(ability){
  if(s.en<ability.cost)return {error:"Not enough resource for "+ability.name+"."};
  if(cooldown(ability)>0)return {error:ability.name+" is cooling down."};
  if(ability.effect==="heal"&&s.hp>=maxHP)return {error:"Health is already full."};
 }
 const self=ability&&["heal","guard"].includes(ability.effect)||ability?.prowl;
 if(self&&(c.combatAllies||[]).some(ally=>(mentions(action.text,ally.name)||mentions(action.text,ally.name.split(" ")[0]))&&ally.name!==hero.name))return {error:"This ability currently supports self-casting only."};
 if(enemies.length){
  const matches=enemies.filter(e=>mentions(action.text,e.name));
  const selectedTarget=enemies.find(e=>e.name===selected)||null;
  if(matches.length>1&&!self&&!ability?.aoe&&!selectedTarget)return {error:"Name one enemy or choose a single combat target."};
  if(obstacle(action,c)&&!matches.length&&!self)return {error:"Resolve or leave the engaged fight before working on this obstacle."};
  const target=matches.length===1?matches[0]:selectedTarget||(enemies.length===1?enemies[0]:null);
  if(!target&&!self)return {error:"Choose a combat target first."};
  if(hero.className==="Druid"&&ability){const error=window.soaDruid?.errorFor?.(ability,s,c,true,target||enemies[0]);if(error)return {error};}
  if(ability?.effect==="riposte"&&!c.parryReady)return {error:"Riposte requires a parry."};
  return {kind:"combat",ability,target:target||enemies[0]};
 }
 if(hero.className==="Druid"&&ability){const error=window.soaDruid?.errorFor?.(ability,s,c,false);if(error)return {error};if(ability.prowl&&window.soaDruid?.current?.()?.prowl)return {error:"Prowl is already active."};}
 if(ability?.roar||ability?.challenge)return {error:"This roar affects engaged enemies; use it during combat."};
 if(self)return {kind:"self",ability};
 const object=obstacle(action,c);
 if(object&&(!ability||["damage","interrupt"].includes(ability.effect)&&!ability.finisher&&!ability.opener&&!ability.bleed&&!["psychic","shadow"].includes(ability.damageType)))return {kind:"obstacle",ability,target:object,dc:action.difficulty==="easy"?10:action.difficulty==="hard"?17:13};
 const enemy=visibleHostile(action,c,level);
 if(enemy){
  if(hero.className==="Druid"&&window.soaDruid?.current?.()&&window.soaDruid.FORMS[window.soaDruid.current().form]?.resource==="rage"&&ability?.cost>0&&!(c.storyGuard?.id==="enrage"&&c.storyGuard.expires>s.time))return {error:"Build Rage in combat before using this ability."};
  if(ability?.finisher||ability?.effect==="riposte")return {error:"That ability needs combat setup first."};
  return {kind:"opening",ability,target:enemy};
 }
 return {error:"No visible enemy or suitable environmental target for that action."};
}
function fallback(index){
 const options=["Pause to consider the safest next step","Take a quiet moment and listen for nearby movement","Pause to assess your available resources","Take a quiet moment to regain composure","Pause and look for a safe way forward","Rest briefly and check your bearings before proceeding"];
 return {text:options[index%options.length],type:"rest",difficulty:"easy"};
}
function outside(plan,{s,c,hero,rules,actor,maxHP=100}){
 const a=plan.ability||{id:"story_weapon",name:"Weapon Strike",cost:0,stat:["Warrior","Paladin"].includes(hero.className)?"STR":"DEX",effect:"damage"},before=s.en,oldHP=s.hp;
 let detail;
 if(plan.kind==="self"){
  if(a.effect==="heal"){s.hp=Math.min(maxHP,s.hp+rules.damage(a.die,a.flat+(actor?.modifiers?.[a.stat]||0)));detail=a.name+" restores "+(s.hp-oldHP)+" HP to yourself.";}
  else {c.storyGuard={id:a.id,expires:(Number(s.time)||0)+2};if(hero.className==="Druid"&&a.enrage){const d=window.soaDruid.current();s.en=Math.min(100,s.en+20);d.pools.rage=s.en;}detail=a.name+" prepared: "+a.description+" Begins with the next combat exchange if combat starts before your next action; no enemy is attacked.";}
 }else{
  const die=rules.roll(20),bonus=(actor?.proficiency||2)+(actor?.modifiers?.[a.stat]||0),success=die===20||die!==1&&die+bonus>=plan.dc;
  detail="Used "+a.name+" on the "+plan.target+". d20 "+die+" + "+bonus+" vs obstacle DC "+plan.dc+". "+(success?"The selected obstacle effect succeeds.":"The attempt fails; the obstacle remains unresolved.")+" No hostile was attacked or defeated; no retaliation, loot or quest proof awarded.";
  detail=(success?"Success: ":"Complication: ")+detail;
 }
 if(hero.className==="Druid"&&window.soaDruid?.current?.())window.soaDruid.recover(s,{cost:a.cost,combat:false});else s.en=Math.min(100,s.en-a.cost+25);s.time++;
 if(a.cooldown){if(hero.className==="Druid"&&window.soaDruid?.current?.()){const d=window.soaDruid.current();d.cooldowns||={};d.cooldowns[a.id]=s.time+a.cooldown;}else{c.storyCooldowns||={};c.storyCooldowns[a.id]=s.time+a.cooldown;}}
 return (/^(?:Success|Complication):/.test(detail)?"":"Success: ")+detail+" Resource "+before+" → "+s.en+"/100; "+a.cost+" spent. One action resolved.";
}
window.soaStoryActions={mentions,obstacle,visibleHostile,named,plan,fallback,outside};
})();
