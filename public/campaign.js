(()=>{"use strict";
const KEY="soa-campaign-v1", MAX=24;
let campaign=null,busy=false,enabled=false,customDraft="",customType="investigate",customSocialSkill="auto",statusMessage="",selectedCombatTarget=null,selectedAllyTarget=null;
const get=id=>document.getElementById(id);
function store(){try{localStorage.setItem(KEY,JSON.stringify(campaign))}catch(e){}}
function make(){return {turn:0,scene:null,history:[],journal:[],lastError:"",lastAction:"Begin the next chapter of Snacky’s continuing mission in Stormwind, addressing the explosives threat and preparing his SI:7 debrief.",lastResult:"Hollow Raven is complete; the Stormwind threat is unresolved. No new action has yet been taken.",pending:null}}
function safe(text){return String(text||"").slice(0,2600)}
function readableStory(text){return String(text||"").replace(/\bPipprained in her satchel\b/gi,"Pippa rummaged in her satchel").replace(/\bPipprained\b/gi,"Pippa")}

function status(message){statusMessage=message;const el=get("campaign-status");if(el)el.textContent=message}
function accessCode(){return get("ai-code")?.value.trim()||""}
function focusAccess(){status("Enter your private AI access code in the AI Story Director panel to continue.");const f=get("ai-code");if(f){f.scrollIntoView({behavior:"smooth",block:"center"});f.focus()}}
function refreshDisplay(){render();draw();window.soaCharacters?.refreshProfessions?.()}
function pending(){return campaign?.pending&&typeof campaign.pending.action==="string"?campaign.pending:null}
function originOfCampaign(){
 const hero=window.soaCharacters?.profile?.();
 if(hero&&hero.id!=="snacky")return "Separate personal adventure for "+String(hero.name||"this hero").slice(0,36)+"; starts at level "+hero.level+" ALONE with no allies in "+String(hero.startingZone||"their race starting zone")+" with 15 silver, and must not merge with Snacky's Hollow Raven story.";
 return "CANONICAL PLAYER DECISION: Snacky Lugnuts completed and solved the Hollow Raven investigation; treat that mission as CLOSED and do not reopen it as an unfinished quest. Hollow Raven involved missing SI:7 intelligence, the Memory Anchor, Subject Seven, Thorne, Valecroft and Protocol Mirrorfall; retain those as historical debrief evidence only. CURRENT OBJECTIVES: return to Stormwind, investigate and defuse the explosives threat, then debrief SI:7 on the completed Hollow Raven operation and current threat. Travel must be shown or grounded in the saved scene; never teleport the party merely because these are objectives. COMPANION PROFILES: Pippa Sparkwhistle is a Gnome Subtlety Rogue who also practices engineering; Bromli Ironkeg is a Dwarf Protection Paladin and frontline defender, not a Warrior; Lethariel Moonguard is a Night Elf Restoration Priest and healer. Preserve the companion identities and abilities in every new scene. SI:7 headquarters access is restricted to actual SI:7 operatives: Snacky may enter, but Pippa, Bromli and Lethariel Moonguard must remain outside unless separately proven to be members. CHARACTER DYNAMICS: Pippa Sparkwhistle is infatuated with Snacky, but has her own agency and boundaries; Lethariel has romantic feelings toward Bromli. Express this through subtle dialogue and behavior, not forced relationships or automatic numeric changes. Preserve all established scenes, inventory, consequences and player choices.";
}

function returnToAdventure(mode="scene"){
 const destination=mode==="status"?get("campaign-status"):get("campaign-scene")?.querySelector("h3")||get("campaign-status");
 if(!destination?.scrollIntoView)return;
 const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
 destination.scrollIntoView({behavior:reduced?"instant":"smooth",block:"start"});
}
// Conservative explicit-target parsing: never infer a relationship event from ordinary movement.
function dialogueFromCustom(action){
 if(!action?.custom)return null;
 const text=String(action.text||"").slice(0,300);
 const mentions=[["pippa",/\b(?:pippa|sparkwhistle)\b/i],["bromli",/\b(?:bromli|ironkeg)\b/i],["lethariel",/\b(?:lethariel|moonguard)\b/i]].filter(([id,re])=>re.test(text));
 if(mentions.length!==1)return null;
 // Explicit dialogue intent required; references to a companion in another activity don't count.
 if(!/\b(?:talk\w*|speak\w*|say|tell|chat\w*|convers\w*|compliment\w*|flirt\w*|jok\w*|thank\w*|prais\w*|apologiz\w*|confess\w*|insult\w*|mock\w*|argu\w*|betray\w*|lie\b|reassur\w*|encourag\w*|comfort\w*|support\w*)\b/i.test(text))return null;
 const tone=/\b(?:betray|sell out|turn against)\b/i.test(text)?"betray":
 /\b(?:insult|mock|humiliat\w*|threaten)\b/i.test(text)?"insult":
 /\b(?:apologiz\w*|sorry|forgive me)\b/i.test(text)?"apologize":
 /\b(?:flirt\w*|romance|attract\w*|kiss\w*|beautiful|handsome|adorable|crush)\b/i.test(text)?"flirt":
 /\b(?:argue|disagree|challenge)\b/i.test(text)?"disagree":
 /\b(?:support|comfort|reassure|encourage|protect)\b/i.test(text)?"support":
 /\b(?:truth|honest|confess)\b/i.test(text)?"honest":
 /\b(?:thank\w*|prais\w*|compliment\w*|jok\w*|friendly|friend|kind)\b/i.test(text)?"friendly":"neutral";
 return {target:mentions[0][0],tone};
}
// Targeted social checks use d20 and a character's learned background.
function socialSkill(action){
 if(action?.socialSkill&&["bluff","bribe","romance","threaten"].includes(action.socialSkill))return action.socialSkill;
 const text=String(action?.text||"");
 if(/\b(?:brib\w*|pay off|buy (?:off|their silence)|offer\s+\d+\s*(?:gold|silver|copper|g\b|s\b|c\b))\b/i.test(text))return "bribe";
 if(/\b(?:threaten\w*|intimidat\w*|menac\w*|coerc\w*|frighten\w*|scare\w*)\b/i.test(text))return "threaten";
 if(/\b(?:flirt\w*|romanc\w*|seduc\w*|woo\b|court\w*|charm\w*|kiss\w*|confess feelings|show (?:romantic )?interest)\b/i.test(text))return "romance";
 if(/\b(?:bluff\w*|deceiv\w*|lie\b|pretend\w*|impersonat\w*|mislead\w*|con\b|fabricat\w*|false identity|fake credential)\b/i.test(text))return "bluff";
 return null;
}
function bribeCopper(text){
 const amounts=[...String(text||"").matchAll(/(\d{1,7})\s*(gold|silver|copper|g\b|s\b|c\b)/gi)];
 if(!amounts.length)return null;
 const factors={gold:10000,g:10000,silver:100,s:100,copper:1,c:1};
 return amounts.reduce((sum,m)=>sum+Number(m[1])*factors[m[2].toLowerCase()],0);
}
function socialTarget(action,skill){
 const bonuses=window.soaCharacters?.getSocialSkills?.()||{bluff:5,bribe:3,romance:3,threaten:2};
 const bonus=Number(bonuses[skill])||0;
 const baseDC=action.difficulty==="easy"?10:action.difficulty==="hard"?18:14;
 let modifier=0;
 if(skill==="romance"){
  const text=String(action.text||"").toLowerCase();
  const who=text.includes("pippa")?"pippa":text.includes("bromli")?"bromli":text.includes("lethariel")?"lethariel":null;
  const relationship=who?window.soaCompanions?.getRelationships?.()?.[who]:null;
  if(relationship&&relationship.trust<0)modifier=4;
 }
 return {bonus,dc:baseDC+modifier};
}
function actionOdds(action){
 const t=action.type, text=String(action.text||"").toLowerCase();
 const costs={stealth:20,engineering:10,social:0,combat:35,investigate:10,move:0,rest:0};
 const relevant=/\b(?:pick|lock|tinker|wire|mechanism|repair|device|engineer|disable trap)\b/.test(text)?"engineering":/\b(?:hide|sneak|stealth|shadow|slip past|ambush|conceal|pickpocket)\b/.test(text)?"stealth":/\b(?:search|inspect|investigate|examine|study|track|deduce|analyze|observe)\b/.test(text)?"investigate":/\b(?:climb|leap|jump|sprint|run|swim|dodge|balance)\b/.test(text)?"move":/\b(?:persuade|convince|negotiate|discuss|appeal|talk)\b/.test(text)?"social":/\b(?:rest|sleep|recover)\b/.test(text)?"rest":t;
 const base={stealth:68,engineering:64,social:65,combat:55,investigate:70,move:76,rest:83}[relevant]??65;
 const modifier=window.soaAbilities?.modifier?.(relevant)||0;
 const trained=window.soaProgression?.bonus?.(relevant)||0;
 const level=window.soaProgression?.level?.()||1;
 const difficulty=action.difficulty==="easy"?12:action.difficulty==="hard"?-22:0;
 const target=Math.max(10,Math.min(95,Math.round(base+modifier*5+trained*2+Math.max(0,level-1)*.2+difficulty-(s.alert||0)*5)));
 return {cost:costs[relevant]??costs[t]??0,target,skill:relevant,modifier,trained};
}
function combatAccuracy(action){
 const rank=window.soaProgression?.bonus?.("combat")||0,level=window.soaProgression?.level?.()||10;
 return Math.max(.25,Math.min(.90,.74+(window.soaAbilities?.percent?.("combat")||0)-s.alert*.04+(action.difficulty==="easy"?.08:action.difficulty==="hard"?-.13:0)+rank*.008+Math.max(0,level-10)*.0015));
}
function resolvedCombatAbility(action){
 const description=String(action.text||"");
 const rogue=window.soaCharacters?.profile?.()?.className==="Rogue";
 const inferred=rogue&&/\briposte\b/i.test(description)?"riposte":rogue&&/\b(?:evasion|evade)\b/i.test(description)?"evasion":rogue&&/\bkick\b/i.test(description)?"kick":"strike";
 return ["strike","kick","evasion","riposte"].includes(action.ability)?action.ability:inferred;
}
function dicePreview(action){
 // Combat takes priority over social keyword detection, matching the resolver.
 if(action.type==="combat"&&livingEnemies().length){
  const ability=resolvedCombatAbility(action);
  if(ability==="evasion")return {primary:"🎲 No attack roll",secondary:"Defensive exchange · 0 Energy"};
  if(ability==="riposte")return {primary:"🎲 Automatic hit after parry",secondary:(24+Math.max(-2,Math.min(4,window.soaAbilities?.modifier?.("combat")||0)))+" HP on a valid Riposte · 10 Energy"};
  const attacker=window.soaAbilities?.get?.("hero");
  const bonus=(attacker?.proficiency||2)+(attacker?.modifiers?.DEX||0);
  const targets=livingEnemies(),selected=targets.find(e=>e.name===selectedCombatTarget)||targets[0];
  const ac=window.soaCombatRules?.statBlock?.(selected)?.ac||12;
  return {primary:"🎲 d20 + "+bonus+" vs AC "+ac+" · natural 20 critical",secondary:ability==="kick"?"1d6 + "+(4+(attacker?.modifiers?.DEX||0))+" damage · 25 Energy · interrupt on hit":"1d10 + "+(10+(attacker?.modifiers?.DEX||0))+" damage · 35 Energy"};
 }
 const skill=socialSkill(action);
 if(skill){
  const {bonus,dc}=socialTarget(action,skill);
  return {primary:"🎲 d20 "+(bonus>=0?"+ "+bonus:"− "+Math.abs(bonus))+" vs DC "+dc,secondary:"CHA-based "+skill+" check · Natural 1 fails, 20 succeeds"};
 }
 const odds=actionOdds(action);
 const {cost,target}=odds;return {primary:"🎲 "+odds.skill+" · d100 ≤ "+target+" ("+target+"%)",secondary:cost+" Energy · ability modifier "+(odds.modifier>=0?"+":"")+odds.modifier+" · training +"+odds.trained};
}

function socialCheck(action,skill){
 const amounts=skill==="bribe"?bribeCopper(action.text):null;
 if(skill==="bribe"&&(!Number.isSafeInteger(amounts)||amounts<=0)){status("Specify an explicit bribe amount, such as 'offer 50 silver to the guard'. No action was spent.");return null}
 if(skill==="bribe"&&s.money<amounts){status("Not enough money for the proposed bribe. No action was spent.");return null}
 const {bonus,dc}=socialTarget(action,skill);
 const roll=1+Math.floor(Math.random()*20),total=roll+bonus,ok=roll!==1&&(roll===20||total>=dc);
 let effect="";
 if(skill==="bluff")effect=ok?"The deception is provisionally believed.":"The target detects inconsistencies or remains unconvinced.";
 if(skill==="threaten")effect=ok?"The target yields to pressure for now.":"The target refuses to be intimidated.";
 if(skill==="romance")effect=ok?"The approach is welcomed as a conversation, without guaranteeing romantic reciprocation or consent.":"The approach is not reciprocated or the moment is unsuitable; respect the boundary.";
 if(skill==="bribe"){
  if(ok){s.money-=amounts;effect="The offered "+fmtMoney(amounts)+" is accepted and paid; the target cooperates within reason."}
  else effect="The offer is refused. No money changes hands.";
 }
 s.time++;s.en=Math.min(100,s.en+10);
 return (ok?"Success":"Complication")+": "+skill[0].toUpperCase()+skill.slice(1)+" check: d20 "+roll+" + "+bonus+" = "+total+" vs DC "+dc+". "+effect+" Result is authoritative. Do not fabricate further costs, relationship stages, or compelled consent.";
}
function livingEnemies(){return Array.isArray(campaign?.enemies)?campaign.enemies.filter(e=>e&&e.hp>0&&e.maxHp>0):[]}
function partyExperienceIds(){
 const names=Array.isArray(campaign?.combatAllies)?campaign.combatAllies.map(a=>a?.name).filter(Boolean):[];
 return [...new Set(names.map(name=>window.soaProgression?.register?.(name)).filter(Boolean))];
}
function startProgressionEncounter(){
 if(campaign.xpEncounter&&campaign.xpEncounter.active)return campaign.xpEncounter;
 campaign.encounterSerial=(Number(campaign.encounterSerial)||0)+1;
 const reference="encounter-"+campaign.encounterSerial;
 campaign.xpEncounter={id:reference,active:true,defeated:[],party:partyExperienceIds(),pendingVictory:false};
 return campaign.xpEncounter;
}
function concludeProgressionEncounter(){
 const encounter=campaign.xpEncounter;
 if(!encounter?.active||!encounter.pendingVictory||livingEnemies().length||!encounter.defeated.length)return null;
 const result=window.soaProgression?.battle?.({receipt:encounter.id,defeated:encounter.defeated,allies:encounter.party})||null;
 encounter.active=false;encounter.pendingVictory=false;encounter.completed=true;
 if(result?.awarded){
  const extra=result.party?.reduce((sum,p)=>sum+(p.awarded||0),0)||0;
  campaign.lastProgression="Victory · +"+result.awarded+" XP to your hero"+(extra?" · companions shared "+extra+" XP":"")+(result.levels?" · LEVEL UP!":"");
 }
 return result;
}
function resolvedSkillName(choice){
 if(choice.type==="combat")return "combat";
 const social=socialSkill(choice);
 if(social)return social;
 const t=String(choice.type||"");
 return ["stealth","engineering","investigate","social","combat"].includes(t)?t:null;
}
function meaningfulSocialPractice(choice,skill){
 if(!["social","romance","bluff","bribe","threaten"].includes(skill))return true;
 const text=String(choice?.text||"").toLowerCase();
 // Relationship conversations are their own reward, not character-XP farms.
 const consequential=/\b(?:persuad\w*|convinc\w*|negotiat\w*|bargain\w*|interrogat\w*|secure (?:a |the )?(?:release|agreement|permission|access)|request (?:clearance|authorization)|win (?:support|approval)|broker\w*|resolve (?:the |a )?(?:dispute|conflict)|sway\w*|obtain (?:information|intel|evidence)|brib\w*|intimidat\w*|threaten\w*|deceiv\w*|impersonat\w*)\b/i;
 const casual=/\b(?:chat\w*|catch up|small talk|flirt\w*|compliment\w*|jok\w*|banter|kiss\w*|hold hands|ask (?:how|about|advice)|say hello|thank\w*|encourag\w*|share feelings)\b/i;
 if(consequential.test(text))return true;
 if(casual.test(text)||skill==="romance")return false;
 // Unspecified generic 'talk' and 'social' checks do not earn farming XP.
 return skill!=="social";
}
function recordActionPractice(choice,resolution,receipt){
 const skill=resolvedSkillName(choice);
 if(!skill)return;
 const success=/^Success:/i.test(String(resolution||""));
 const meaningful=meaningfulSocialPractice(choice,skill);
 const earned=window.soaProgression?.check?.({receipt,name:skill,success,difficulty:choice.difficulty||"medium",meaningful});
 if(earned?.awarded){
  campaign.lastProgression=(success?"Successful":"Attempted")+" "+skill+" check · +"+earned.awarded+" XP"+(earned.rankUp?" · "+skill+" skill rank increased!":"")+(earned.levels?" · LEVEL UP!":"");
 }
 // Participating companions gain skill practice only for an explicitly shared named task.
 const text=String(choice.text||"").toLowerCase();
 const scene=String(campaign.scene?.story||"").toLowerCase();
 const possible=[["pippa","pippa"],["bromli","bromli"],["lethariel","lethariel"]];
 for(const [name,id] of possible){
  if(!text.includes(name)||!scene.includes(name))continue;
  const allowed=id==="pippa"?(skill==="engineering"||skill==="stealth"||skill==="investigate"):id==="bromli"?(skill==="combat"||skill==="investigate"):id==="lethariel"?(skill==="social"||skill==="investigate"):false;
  if(allowed&&meaningful)window.soaProgression?.check?.({receipt:"companion:"+receipt,name:skill,success,difficulty:choice.difficulty||"medium",actorId:id});
 }
}
function companionExchange(action){
 const rules=window.soaCombatRules, id=action.ability;
 const types={bromli_guard:{name:"Bromli Ironkeg",cooldown:2},pippa_snare:{name:"Pippa Sparkwhistle",cooldown:3},lethariel_heal:{name:"Lethariel Moonguard",cooldown:3}};
 const spec=types[id];if(!spec)return null;
 const ally=campaign.combatAllies?.find(a=>a.name===spec.name&&a.hp>0);
 if(!ally){status(spec.name+" is not available to assist.");return null}
 campaign.supportCooldowns||={};
 const round=Number(campaign.combatRound)||0;
 if((campaign.supportCooldowns[id]||0)>round){status("Ability cooling down; no turn spent.");return null}
 const foes=livingEnemies();if(!foes.length)return null;
 const previous=s.en;
 let description="";
 if(id==="bromli_guard"){campaign.guardUntil=round+2;description="Bromli raises his shield: enemy attacks suffer disadvantage for this exchange and the next."}
 if(id==="pippa_snare"){
  const target=foes.find(e=>e.name===selectedCombatTarget)||foes[0],block=rules.statBlock(target);
  const roll=rules.attack(5,block.ac);
  if(roll.hit){campaign.snaredEnemy=target.name;campaign.snareUntil=round+2;description="Pippa's snare catches "+target.name+" (d20 "+roll.die+" total "+roll.total+" vs AC "+block.ac+"). The foe loses its next attack."}
  else description="Pippa's snare misses "+target.name+" (d20 "+roll.die+" total "+roll.total+" vs AC "+block.ac+").";
 }
 if(id==="lethariel_heal"){
  const recipient=combatParty().filter(a=>Number.isFinite(a.hp)&&a.hp<a.maxHp).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];
  if(!recipient){status("No wounded ally needs healing; no turn spent.");return null}
  const value=rules.roll(8)+5;
  if(recipient.player){const before=s.hp;s.hp=Math.min(recipient.maxHp,s.hp+value);description="Lethariel heals "+recipient.name+" for "+(s.hp-before)+" HP."}
  else{const allyRecord=campaign.combatAllies.find(a=>a.name===recipient.name),before=allyRecord.hp;allyRecord.hp=Math.min(allyRecord.maxHp,allyRecord.hp+value);campaign.partyHealth||={};campaign.partyHealth[allyRecord.name]={hp:allyRecord.hp,maxHp:allyRecord.maxHp,derived:true};description="Lethariel heals "+recipient.name+" for "+(allyRecord.hp-before)+" HP."}
 }
 campaign.supportCooldowns[id]=round+spec.cooldown+1;
 campaign.combatRound=round+1;
 s.time++;s.en=Math.min(100,s.en+10);
 const enemy=foes.find(e=>e.hp>0);
 let retaliation="";
 if(enemy){
  const block=rules.statBlock(enemy),hero=window.soaAbilities?.get?.("hero"),heroAC=hero?.armorClass||12;
  const caught=campaign.snaredEnemy===enemy.name&&campaign.snareUntil>=campaign.combatRound;
  if(caught){retaliation=enemy.name+" is snared and cannot attack.";campaign.snareUntil=0}
  else{
   const roll=rules.attack(block.bonus,heroAC,{advantage:campaign.guardUntil>=campaign.combatRound?-1:0});
   if(roll.hit){const wound=rules.damage(block.die,2,roll.critical),before=s.hp;s.hp=Math.max(1,s.hp-wound);retaliation=enemy.name+" attacks: d20 "+roll.die+" total "+roll.total+" vs AC "+heroAC+", dealing "+(before-s.hp)+" damage."}
   else retaliation=enemy.name+" misses: d20 "+roll.die+" total "+roll.total+" vs AC "+heroAC+".";
  }
 }
 campaign.parryReady=false;
 campaign.lastSupport={round:campaign.combatRound,actor:spec.name,description,retaliation};
 return "Success: Round "+campaign.combatRound+". "+description+" "+retaliation+" Energy "+previous+" → "+s.en+". Exactly one exchange resolved.";
}
function fightExchange(action){
 if(["bromli_guard","pippa_snare","lethariel_heal"].includes(action.ability))return companionExchange(action);
 const targets=livingEnemies();
 if(!targets.length)return null;
 const ability=resolvedCombatAbility(action);
 const price={strike:35,kick:25,evasion:0,riposte:10}[ability];
 if(ability==="riposte"&&!campaign.parryReady){status("Riposte requires a parry in the previous exchange. No action spent.");return null}
 if(s.en<price){status("Not enough Energy for "+ability+" ("+price+" required). No action spent.");return null}
 const requested=String(action.text||"").toLowerCase();
 const matches=targets.filter(e=>requested.includes(e.name.toLowerCase()));
 const selected=targets.find(e=>e.name===selectedCombatTarget);
 const enemy=matches.length===1?matches[0]:matches.length>1?null:selected||(targets.length===1?targets[0]:null);
 if(!enemy&&ability!=="evasion"){status("Select a specific enemy target before attacking. No action spent.");return null}
 const encounter=startProgressionEncounter();
 for(const id of partyExperienceIds())if(!encounter.party.includes(id))encounter.party.push(id);
 const target=enemy||targets[0],oldHP=target.hp,heroHP=s.hp,oldEnergy=s.en;
 const rules=window.soaCombatRules;
 const actor=window.soaAbilities?.get?.("hero");
 const dex=actor?.modifiers?.DEX??2;
 const proficiency=actor?.proficiency??2;
 const block=rules.statBlock(target);
 const targetAC=block.ac;
 if(!campaign.initiativeFor||campaign.initiativeFor!==campaign.enemyLocation){
  campaign.initiativeFor=campaign.enemyLocation;
  campaign.initiativeRoll=rules.initiative(dex);
  campaign.enemyInitiative=rules.initiative(block.initiative);
 }
 const advantage=campaign.flags?.advantage?1:0;
 const playerAttack=ability==="riposte"||ability==="evasion"?null:rules.attack(proficiency+dex,targetAC,{advantage});
 const attackRoll=playerAttack?.die??null;
 const hit=ability==="riposte"?true:ability==="evasion"?false:playerAttack.hit;
 const hitTarget=targetAC;
 const damageModifier=dex;
 const arm=rules.weapon(actor,ability);
 const rolled=ability==="riposte"?24+damageModifier:ability==="evasion"?0:rules.damage(arm.die,arm.flat,!!playerAttack?.critical);
 const dealt=hit?Math.min(target.hp,rules.mitigate(rolled,arm.type,block)):0;
 target.hp=Math.max(0,target.hp-dealt);
 const defeated=target.hp===0;
 const interrupted=ability==="kick"&&hit;
 const heroAC=actor?.armorClass||12;
 const enemyActsFirst=(campaign.enemyInitiative||0)>(campaign.initiativeRoll||0);
 const retaliationAttempt=enemyActsFirst||(!defeated&&!interrupted);
 const eligibleTargets=combatParty().filter(e=>!e.player&&Number.isInteger(e.hp)&&e.hp>0&&e.maxHp>0);
 const defendingAlly=retaliationAttempt&&eligibleTargets.length&&Math.random()<.35?eligibleTargets[Math.floor(Math.random()*eligibleTargets.length)]:null;
 const defendingId=defendingAlly?({"Pippa Sparkwhistle":"pippa","Bromli Ironkeg":"bromli","Lethariel Moonguard":"lethariel"})[defendingAlly.name]:null;
 const defenderAC=defendingId?window.soaAbilities?.get?.(defendingId)?.armorClass||12:heroAC;
 const enemyAttack=retaliationAttempt?rules.attack(block.bonus,defenderAC,{advantage:ability==="evasion"||campaign.guardUntil>=(Number(campaign.combatRound)||0)+1?-1:0}):null;
 const caught=campaign.snaredEnemy===target.name&&campaign.snareUntil>=(Number(campaign.combatRound)||0)+1;
 const retaliates=!caught&&!!enemyAttack?.hit;
 if(caught)campaign.snareUntil=0;
 const amount=retaliates?rules.damage(block.die,2,enemyAttack.critical):0;
 const allyRecipient=defendingAlly;
 const receivedName=allyRecipient?.name||(window.soaCharacters?.profile?.()?.name||"Your hero");
 let taken=0,recipientBefore=allyRecipient?allyRecipient.hp:s.hp,recipientAfter=recipientBefore;
 if(retaliates){
  if(allyRecipient){
   const record=campaign.combatAllies.find(a=>a.name===allyRecipient.name);
   taken=Math.min(record.hp,amount);
   record.hp=Math.max(0,record.hp-taken);recipientAfter=record.hp;
   campaign.partyHealth||={};campaign.partyHealth[record.name]={hp:record.hp,maxHp:record.maxHp,derived:campaign.partyHealth?.[record.name]?.derived===true};
  }else{
   taken=Math.min(Math.max(0,s.hp-1),amount);
   s.hp=Math.max(1,s.hp-taken);recipientAfter=s.hp;
  }
 }
 const parry=!!enemyAttack&&!enemyAttack.hit&&!defeated&&ability!=="evasion"&&enemyAttack.total<defenderAC&&enemyAttack.die>1&&defendingAlly===null&&Math.random()<.5;
 campaign.parryReady=parry;
 s.en=Math.min(100,s.en-price+10);s.time++;
 campaign.combatRound=(Number(campaign.combatRound)||0)+1;
 const event={round:campaign.combatRound,ability,attackRoll,hitTarget,targetAC,enemyType:block.type,damageType:arm.type,initiative:campaign.initiativeRoll,enemyInitiative:campaign.enemyInitiative,attackTotal:playerAttack?.total??null,critical:!!playerAttack?.critical,enemyRoll:enemyAttack?.die??null,enemyTotal:enemyAttack?.total??null,defenderAC,target:target.name,dealt,taken,hit,defeated,enemyBefore:oldHP,enemyAfter:target.hp,enemyMax:target.maxHp,heroBefore:heroHP,heroAfter:s.hp,energyBefore:oldEnergy,energyAfter:s.en,recipient:receivedName,recipientBefore,recipientAfter,parry};
 campaign.lastExchange=event;
 recordCombatDelta(target,dealt,taken,receivedName,recipientBefore,recipientAfter);
 if(defeated){
  window.soaQuests?.onDefeat?.(campaign,target.name);
  if(!encounter.defeated.some(x=>x.name===target.name))encounter.defeated.push({name:target.name,maxHp:target.maxHp});
  if(!livingEnemies().length)encounter.pendingVictory=true;
  if(selectedCombatTarget===target.name)selectedCombatTarget=null;
  campaign.defeatedEnemies||=[];
  campaign.defeatedEnemies.push(String(campaign.enemyLocation||campaign.scene?.location||"")+"|"+target.name.toLowerCase());
  campaign.defeatedEnemies=campaign.defeatedEnemies.slice(-80);
 }
 const report=(ability==="evasion"?"Defensive evasion; no attack roll.":hit?"Used "+ability+" on "+target.name+" for "+dealt+" HP.":"Used "+ability+" on "+target.name+" but missed.")+
  (attackRoll!==null?" d20 attack "+attackRoll+" + "+(proficiency+dex)+" vs AC "+targetAC+".":"")+
  " Enemy "+target.name+" HP "+oldHP+"/"+target.maxHp+" → "+target.hp+"/"+target.maxHp+". "+
  (retaliates?target.name+" retaliates against "+receivedName+" for "+taken+" HP ("+recipientBefore+" → "+recipientAfter+").":"No damage received.")+
  " Player HP "+heroHP+" → "+s.hp+"; Energy "+oldEnergy+" → "+s.en+"."+
  (defeated?" Opponent defeated.":"")+" Exactly ONE consequential combat exchange resolved. No automatic loot, extra turns, or unconfirmed healing.";
 return (hit||ability==="evasion"?"Success":"Complication")+": Combat exchange "+campaign.combatRound+": "+report;
}
function updateLivingEnemies(scene){
 if(!Array.isArray(scene?.enemies))return;
 const location=String(scene.location||"");
 const previous=(campaign.enemyLocation===location||campaign.pending?.combat)?livingEnemies():[];
 const defeated=campaign.defeatedEnemies||[];
 const next=[];
 for(const item of scene.enemies.slice(0,4)){
  if(!item||typeof item.name!=="string"||!Number.isInteger(item.maxHp)||item.maxHp<1)continue;
  const name=item.name.trim().slice(0,60),id=location+"|"+name.toLowerCase();
  if(!name||defeated.includes(id)||next.some(x=>x.name.toLowerCase()===name.toLowerCase()))continue;
  const existing=previous.find(x=>x.name.toLowerCase()===name.toLowerCase());
  const maxHp=Math.min(500,item.maxHp);
  next.push(existing||{name,maxHp,hp:Math.max(1,Math.min(maxHp,Math.round(Number(item.hp)||maxHp)))});
 }
 // If Gemini omits surviving enemies right after a strike, keep their locally tracked HP.
 // Deliberate movement or noncombat disengagement can clear the previous encounter.
 if(!next.length&&previous.length&&campaign.pending?.combat)next.push(...previous);
 // Disengaging from a fight without defeating every tracked foe ends that encounter
 // without a victory payment. A later fight starts a new receipt and reward pool.
 if(!next.length&&!campaign.pending?.combat&&campaign.xpEncounter?.active&&!campaign.xpEncounter.pendingVictory){
  campaign.xpEncounter.active=false;campaign.xpEncounter.abandoned=true;
 }
 campaign.enemies=next;campaign.enemyLocation=location;
}
function hydrateKnownAllyHP(){
 if(!campaign)return;
 const roster=Array.isArray(campaign.combatAllies)?campaign.combatAllies:[];
 const names={"Pippa Sparkwhistle":"pippa","Bromli Ironkeg":"bromli","Lethariel Moonguard":"lethariel"};
 campaign.partyHealth||={};
 for(const ally of roster){
  const id=names[ally?.name];if(!id)continue;
  const expected=window.soaAbilities?.get?.(id)?.maxHp;
  if(!Number.isInteger(expected)||expected<1)continue;
  const old=campaign.partyHealth[ally.name];
  // Derive maximum HP from class hit die, CON and level. Preserve existing wounds
  // as missing HP; legacy manual entries may establish wounds but not max HP.
  const priorMax=Number.isInteger(old?.maxHp)&&old.maxHp>0?old.maxHp:Number.isInteger(ally.maxHp)&&ally.maxHp>0?ally.maxHp:expected;
  const priorCurrent=Number.isInteger(old?.hp)?old.hp:Number.isInteger(ally.hp)?ally.hp:priorMax;
  const missing=Math.max(0,priorMax-Math.max(0,Math.min(priorMax,priorCurrent)));
  ally.maxHp=expected;
  ally.hp=Math.max(0,expected-missing);
  campaign.partyHealth[ally.name]={hp:ally.hp,maxHp:expected,derived:true};

 }
}
function combatParty(){
 hydrateKnownAllyHP();
 const list=Array.isArray(campaign?.combatAllies)?campaign.combatAllies:[];
 const isSn=window.soaCharacters?.profile?.()?.id==="snacky";
 return [{name:window.soaCharacters?.profile?.()?.name||"Your hero",hp:s.hp,maxHp:100,player:true},...list.filter(e=>e&&typeof e.name==="string").slice(0,6).filter(e=>!isSn||!/^Snacky Lugnuts$/i.test(e.name)).map(e=>({...e,player:false}))];
}
function reconcileCombatAllies(scene){
 if(!Array.isArray(scene?.allies))return;
 const existing=Array.isArray(campaign.combatAllies)?campaign.combatAllies:[];
 campaign.partyHealth||={};
 for(const member of existing)if(member&&member.name&&Number.isInteger(member.hp)&&Number.isInteger(member.maxHp)&&member.maxHp>0&&!campaign.partyHealth[member.name]){
  campaign.partyHealth[member.name]={hp:member.hp,maxHp:member.maxHp};
 }
 const incoming=[];
 for(const e of scene.allies.slice(0,6)){
  if(!e||typeof e.name!=="string"||!e.name.trim())continue;
  const name=e.name.trim().slice(0,60);
  if(name===(window.soaCharacters?.profile?.()?.name||"Snacky Lugnuts")||incoming.some(x=>x.name===name))continue;
  const stored=campaign.partyHealth[name],previous=existing.find(x=>x.name===name);
  const max=Number.isInteger(e.maxHp)&&e.maxHp>0?Math.min(500,e.maxHp):null;
  const hp=Number.isInteger(e.hp)&&e.hp>=0&&max!==null?Math.min(max,e.hp):null;
  const member=stored&&Number.isInteger(stored.hp)&&Number.isInteger(stored.maxHp)&&stored.maxHp>0
   ?{name,hp:stored.hp,maxHp:stored.maxHp,role:String(e.role||previous?.role||"Ally").slice(0,32)}
   :previous&&Number.isInteger(previous.hp)&&Number.isInteger(previous.maxHp)
   ?{...previous,name}
   :{name,hp,maxHp:max,role:String(e.role||"Ally").slice(0,32)};
  incoming.push(member);
  if(Number.isInteger(member.hp)&&Number.isInteger(member.maxHp)&&member.maxHp>0)
   campaign.partyHealth[name]={hp:member.hp,maxHp:member.maxHp,derived:stored?.derived===true};
 }
 if(!incoming.length&&campaign.pending?.combat&&existing.length)return;
 campaign.combatAllies=incoming;campaign.allyLocation=String(scene.location||"");
 hydrateKnownAllyHP();
}
function recordCombatDelta(enemy,dealt,taken,recipient,recipientBefore,recipientAfter){
 const log=Array.isArray(campaign.combatLog)?campaign.combatLog:[];
 log.push({round:campaign.combatRound,events:[
  {name:enemy.name,side:"enemy",delta:-dealt,after:enemy.hp,maxHp:enemy.maxHp},
  {name:recipient,side:"ally",delta:-taken,before:recipientBefore,after:recipientAfter,maxHp:recipient===(window.soaCharacters?.profile?.()?.name||"Your hero")?100:campaign.combatAllies?.find(a=>a.name===recipient)?.maxHp||null}
 ]});
 campaign.combatLog=log.slice(-12);
}
function drawEnemyStatus(box){
 const enemies=livingEnemies(),activeContext=enemies.length||(campaign?.combatAllies||[]).length||campaign?.scene?.choices?.some(x=>x.type==="combat");
 const exchange=activeContext?campaign?.lastExchange:null;
 if(!activeContext)return;
 const section=document.createElement("section");section.className="soa-enemy-status";
 const heading=document.createElement("h4");heading.textContent="Battle Overview";section.append(heading);
 if(!enemies.length){const hint=document.createElement("p");hint.className="soa-combat-hint";hint.textContent=exchange?.defeated?"The last opponent has been defeated.":"No enemy HP has been confirmed for this scene yet. The story will reveal enemy health when combatants are identified.";section.append(hint)}
 for(const enemy of enemies){
  const item=document.createElement("div");item.className="soa-foe";
  const header=document.createElement("div");header.className="soa-foe-heading";
  const name=document.createElement("strong");name.textContent=enemy.name;
  const hp=document.createElement("span");hp.textContent=enemy.hp+" / "+enemy.maxHp+" HP";
  header.append(name,hp);
  const rail=document.createElement("div");rail.className="soa-foe-track";rail.setAttribute("role","progressbar");
  rail.setAttribute("aria-label",enemy.name+" health");rail.setAttribute("aria-valuemin","0");rail.setAttribute("aria-valuemax",String(enemy.maxHp));rail.setAttribute("aria-valuenow",String(enemy.hp));
  const fill=document.createElement("div");fill.className="soa-foe-fill";fill.style.width=Math.max(0,Math.min(100,enemy.hp/enemy.maxHp*100))+"%";rail.append(fill);item.append(header,rail);section.append(item);
 }
 if(exchange?.defeated&&!enemies.some(e=>e.name===exchange.target)){
  const fallen=document.createElement("div");fallen.className="soa-foe soa-foe-defeated";
  const title=document.createElement("div");title.className="soa-foe-heading";
  const name=document.createElement("strong");name.textContent=exchange.target;
  const hp=document.createElement("span");hp.textContent="0 / "+exchange.enemyMax+" HP";
  title.append(name,hp);
  const track=document.createElement("div");track.className="soa-foe-track";track.setAttribute("role","progressbar");
  track.setAttribute("aria-label",exchange.target+" health");track.setAttribute("aria-valuemin","0");track.setAttribute("aria-valuemax",String(exchange.enemyMax));track.setAttribute("aria-valuenow","0");
  const fill=document.createElement("div");fill.className="soa-foe-fill";fill.style.width="0%";track.append(fill);
  fallen.append(title,track);section.append(fallen);
 }
 if(exchange){
  const summary=document.createElement("div");summary.className="soa-exchange";
  const title=document.createElement("strong");title.textContent="Last exchange · Round "+exchange.round;
  const dealt=document.createElement("p");dealt.textContent=exchange.hit?"Damage dealt: "+exchange.dealt+" HP to "+exchange.target+" ("+exchange.enemyBefore+" → "+exchange.enemyAfter+"/"+exchange.enemyMax+").":"Missed "+exchange.target+" · 0 damage.";
  const taken=document.createElement("p");taken.textContent="Damage received by "+(exchange.recipient||"your hero")+": "+exchange.taken+" HP · "+(exchange.recipientBefore??exchange.heroBefore)+" → "+(exchange.recipientAfter??exchange.heroAfter)+" HP.";
  summary.append(title,dealt,taken);if(Number.isInteger(exchange.attackRoll)){const roll=document.createElement("p");roll.textContent="Your attack: d20 "+exchange.attackRoll+" + modifier = "+exchange.attackTotal+" vs AC "+exchange.targetAC+(exchange.critical?" · CRITICAL HIT":"");summary.append(roll)}if(Number.isInteger(exchange.initiative)){const init=document.createElement("p");init.textContent="Initiative: Hero "+exchange.initiative+" · Foe "+exchange.enemyInitiative+" · "+exchange.enemyType+" · "+exchange.damageType+" damage";summary.append(init)}if(Number.isInteger(exchange.enemyRoll)){const defense=document.createElement("p");defense.textContent="Enemy attack: d20 "+exchange.enemyRoll+" = "+exchange.enemyTotal+" vs defender AC "+exchange.defenderAC;summary.append(defense)}if(exchange.defeated){const note=document.createElement("p");note.textContent=exchange.target+" defeated; no loot collected automatically.";summary.append(note)}section.append(summary);
 }
 const roster=document.createElement("section");roster.className="soa-combat-roster";
 const caption=document.createElement("h4");caption.textContent="Allied combatants";roster.append(caption);
 for(const ally of combatParty()){
  const item=document.createElement("div");item.className="soa-combat-person";
  const heading=document.createElement("div");heading.className="soa-combat-person-heading";
  const name=document.createElement("strong");name.textContent=ally.name;
  const hp=document.createElement("span");hp.textContent=Number.isFinite(ally.hp)&&Number.isFinite(ally.maxHp)?ally.hp+" / "+ally.maxHp+" HP":"HP unconfirmed";
  heading.append(name,hp);item.append(heading);
  if(!Number.isFinite(ally.hp)||!Number.isFinite(ally.maxHp)){
   const unknown=document.createElement("div");unknown.className="soa-combat-ally-rail soa-hp-unknown";unknown.setAttribute("aria-label",ally.name+" health unconfirmed");item.append(unknown);
  }
  if(Number.isFinite(ally.hp)&&Number.isFinite(ally.maxHp)&&ally.maxHp>0){
   const bar=document.createElement("div");bar.className="soa-combat-ally-rail";bar.setAttribute("role","progressbar");bar.setAttribute("aria-label",ally.name+" health");bar.setAttribute("aria-valuemin","0");bar.setAttribute("aria-valuemax",String(ally.maxHp));bar.setAttribute("aria-valuenow",String(ally.hp));
   const fill=document.createElement("div");fill.className="soa-combat-ally-fill";fill.style.width=Math.max(0,Math.min(100,ally.hp/ally.maxHp*100))+"%";bar.append(fill);item.append(bar);
  }
  const statId=ally.player?"hero":({"Pippa Sparkwhistle":"pippa","Bromli Ironkeg":"bromli","Lethariel Moonguard":"lethariel"})[ally.name];
  const ac=statId?window.soaAbilities?.get?.(statId)?.armorClass:null;
  const info=document.createElement("div");info.className="soa-combat-hint";
  info.textContent=Number.isFinite(ac)?"Armor Class "+ac+" · HP calculated from class, Constitution, and level":"Armor Class unknown · HP tracked by the combat engine";
  item.append(info);

  roster.append(item);
 }
 section.insertBefore(roster,section.children[1]||null);
 const hostileHeading=document.createElement("h4");hostileHeading.className="soa-hostile-heading";hostileHeading.textContent="Hostile combatants";roster.after(hostileHeading);
 const allyTargets=document.createElement("div");allyTargets.className="soa-combat-targets soa-combat-ally-targets";
 const allyLabel=document.createElement("strong");allyLabel.textContent="Choose an ally to assist";allyTargets.append(allyLabel);
 for(const ally of combatParty().filter(x=>!x.player)){
  const b=document.createElement("button");b.type="button";b.className="soa-target-button soa-ally-target-button";
  b.textContent=ally.name+(Number.isFinite(ally.hp)? " · "+ally.hp+"/"+ally.maxHp+" HP":" · HP unknown");
  b.setAttribute("aria-pressed",String(selectedAllyTarget===ally.name));b.disabled=busy||!!pending();
  b.onclick=()=>{selectedAllyTarget=ally.name;customDraft="Coordinate with "+ally.name+" to protect or assist them without assuming any healing or damage.";customType="investigate";customSocialSkill="auto";draw()};
  allyTargets.append(b);
 }
 if(allyTargets.children.length>1){
  const info=document.createElement("p");info.className="soa-combat-hint";info.textContent="Selecting an ally drafts a support action. It never heals or spends a turn by itself; health changes require a confirmed action.";roster.append(info);
  const assist=document.createElement("button");assist.type="button";assist.className="soa-assist-button";
  assist.textContent="Coordinate with selected ally · 1 action";
  assist.disabled=busy||!!pending()||!combatParty().some(a=>!a.player&&a.name===selectedAllyTarget);
  assist.onclick=()=>{const target=combatParty().find(a=>!a.player&&a.name===selectedAllyTarget);if(!target)return;
   choose({text:"Coordinate defensively with "+target.name+" to assist their next move without inventing healing, supplies, damage or extra turns.",type:"investigate",difficulty:"medium"});
  };
  allyTargets.append(assist);roster.after(allyTargets);
 }
 if(enemies.length){
  const support=document.createElement("section");support.className="soa-combat-abilities";
  const heading=document.createElement("strong");heading.textContent="Companion combat actions · one exchange each";support.append(heading);
  const options=[["bromli_guard","Bromli · Shield Wall (disadvantage)","Bromli Ironkeg"],["pippa_snare","Pippa · Engineering Snare","Pippa Sparkwhistle"],["lethariel_heal","Lethariel · Healing Prayer","Lethariel Moonguard"]];
  for(const [ability,title,name] of options){
   const member=combatParty().find(a=>a.name===name&&a.hp>0);
   if(!member)continue;
   const btn=document.createElement("button");btn.type="button";btn.className="soa-ability-button";
   const left=Math.max(0,(campaign.supportCooldowns?.[ability]||0)-(campaign.combatRound||0));
   btn.textContent=title+(left?" · cooldown "+left+" rounds":" · Ready");
   btn.disabled=busy||!!pending()||left>0;
   btn.onclick=()=>choose({text:title+" supports the party",type:"combat",difficulty:"medium",ability});
   support.append(btn);
  }
  section.append(support);
  if(campaign.lastSupport){const note=document.createElement("p");note.className="soa-combat-hint";note.textContent="Support round "+campaign.lastSupport.round+": "+campaign.lastSupport.description+" "+campaign.lastSupport.retaliation;section.append(note)}
 }
 const picker=document.createElement("div");picker.className="soa-combat-targets";const label=document.createElement("strong");label.textContent="Choose an enemy target";picker.append(label);
 for(const foe of enemies){
  const button=document.createElement("button");button.type="button";button.className="soa-target-button";button.textContent=foe.name+" · "+foe.hp+"/"+foe.maxHp+" HP";button.setAttribute("aria-pressed",String(selectedCombatTarget===foe.name));
  button.disabled=busy||!!pending();button.onclick=()=>{selectedCombatTarget=foe.name;draw()};
  picker.append(button);
 }
 if(enemies.length)section.append(picker);
 const skills=document.createElement("div");skills.className="soa-combat-abilities";
 const abilitiesLabel=document.createElement("strong");abilitiesLabel.textContent="Combat abilities";skills.append(abilitiesLabel);
 const rogue=window.soaCharacters?.profile?.()?.className==="Rogue";
 const available=rogue?[["strike","Strike",35],["kick","Kick · interrupt",25],["evasion","Evasion",0],["riposte","Riposte · after parry",10]]:[["strike","Attack",35],["evasion","Defend",0]];
 for(const [id,label,cost] of available){
  const button=document.createElement("button");button.type="button";button.className="soa-ability-button";
  button.textContent=label+" · "+cost+" Energy";
  button.disabled=busy||!!pending()||s.en<cost||(id==="riposte"&&!campaign.parryReady)||(id!=="evasion"&&!enemies.some(e=>e.name===selectedCombatTarget)&&enemies.length>1);
  button.onclick=()=>{const target=enemies.find(e=>e.name===selectedCombatTarget)||enemies[0];if(!target)return;
   choose({text:(window.soaCharacters?.profile?.()?.name||"Hero")+" uses "+label+" against "+target.name,type:"combat",difficulty:"medium",ability:id});
  };
  skills.append(button);
 }
 if(enemies.length)section.append(skills);
 if(Array.isArray(campaign.combatLog)&&campaign.combatLog.length){
  const history=document.createElement("details");history.className="soa-battle-history";const head=document.createElement("summary");head.textContent="Damage log · "+campaign.combatLog.length+" exchanges";history.append(head);
  for(const entry of campaign.combatLog.slice(-5).reverse()){const line=document.createElement("p");line.textContent="Round "+entry.round+": "+entry.events.map(e=>e.name+" "+(e.delta<0?e.delta+" HP":"no damage")+" ("+e.after+"/"+e.maxHp+")").join(" · ");history.append(line)}section.append(history);
 }
 box.append(section);
}
function result(action){
 if(action.type==="combat"&&livingEnemies().length)return fightExchange(action);
 const skill=socialSkill(action);if(skill)return socialCheck(action,skill);
 const t=action.type,{cost,target}=actionOdds(action);let damage=0;
 if(s.en<cost)return null;
 const rolled=1+Math.floor(Math.random()*100),ok=rolled<=target;
 s.en=Math.min(100,s.en-cost+10);s.time++; if(!ok&&["stealth","engineering","combat"].includes(t)){s.alert=Math.min(3,s.alert+1);damage=t==="combat"?8:t==="stealth"?3:0;s.hp=Math.max(1,s.hp-damage)}
 if(ok&&t==="rest")s.hp=Math.min(100,s.hp+4);
 // Defeating an opponent does not itself loot them: currency changes require explicit search/loot actions.
 const msg=ok?"Success":"Complication";
 let effect=t==="combat"?(ok?"The immediate opponent is overcome in a single abstract skirmish.":"The opponent remains a threat; Snacky takes "+damage+" damage."):t==="stealth"?(ok?"Snacky remains concealed.":"A noise attracts nearby attention."):t==="engineering"?(ok?"Pippa's mechanism works as intended.":"The apparatus sparks and raises suspicion."):t==="social"?(ok?"The approach is received favorably.":"The target refuses to cooperate."):t==="rest"?(ok?"The party regains composure.":"The party cannot safely rest."):ok?"The action achieves its immediate intent.":"The action encounters resistance.";
 return msg+": d100 roll "+rolled+" vs target "+target+" ("+(ok?"success":"failure")+"). "+effect+" Result is authoritative; do not invent additional mechanical effects.";
}
function interfaceUI(){
 if(get("campaign-box"))return;
 const el=document.createElement("section");el.className="panel";el.id="campaign-box";
 el.innerHTML='<h2>Living Campaign <span class="tag">Gemini · Online</span></h2><label class="ai-toggle"><input type="checkbox" id="campaign-mode"> Enable living campaign</label><button id="campaign-start">Start / Resume AI campaign</button><button id="campaign-offline" class="sub">Return to offline adventure</button><div id="campaign-status" class="muted" aria-live="polite"></div><div id="campaign-scene"></div>';
 document.querySelector("header").after(el);
 get("campaign-mode").onchange=e=>{enabled=e.target.checked;localStorage.setItem("soa-campaign-enabled",enabled?"1":"0");if(enabled){if(!campaign)campaign=make();store();draw();if(navigator.onLine&&(!campaign.scene||pending()))advance(campaign.lastAction,campaign.lastResult,true)}else{get("campaign-scene").replaceChildren();showOriginal(true)}};
 get("campaign-start").onclick=()=>{if(!campaign)campaign=make();enabled=true;get("campaign-mode").checked=true;localStorage.setItem("soa-campaign-enabled","1");draw();if(!accessCode()){focusAccess();return}if(pending()||!campaign.scene)advance(campaign.lastAction,campaign.lastResult,true);else{status("Saved scene ready. Choose an action below.");refreshDisplay()}};
 get("campaign-offline").onclick=()=>{enabled=false;get("campaign-mode").checked=false;localStorage.setItem("soa-campaign-enabled","0");showOriginal(true);get("campaign-status").textContent="Offline scripted adventure enabled."};
}
function showOriginal(show){if(window.soaCharacters?.isNewCharacter?.())show=false;for(const el of document.querySelectorAll("main > section.panel")){if(el.id==="campaign-box")continue;const isStory=!!el.querySelector("#choices");if(isStory)el.style.display=show?"":"none"}}
function reconcileAuthorizedMissionReward(){
 if(!campaign||window.soaCharacters?.profile?.()?.id!=="snacky")return;
 const q=window.soaQuests?.ensure?.(campaign);
 if(!q||q.claimed?.["mission:stormwind-explosives-defused:v1"])return;
 // Approved by player specifically for the completed defusal. Not inferred from Gemini prose.
 const result=window.soaQuests?.grantStormwindMission?.(campaign,s.money);
 if(Number.isSafeInteger(result?.wallet)){
  s.money=result.wallet;
  campaign.lastPayment=result.description;
  campaign.history.push(result.description);
  campaign.history=campaign.history.slice(-MAX);
  store();save();
 }
}
function draw(){
 if(!enabled||!campaign)return;showOriginal(false);
 const box=get("campaign-scene");box.replaceChildren();
 if(!campaign.scene){status(statusMessage||"Ready to generate the next scene.");return}
 const sc=campaign.scene,head=document.createElement("h3"),where=document.createElement("div"),text=document.createElement("p");
 reconcileAuthorizedMissionReward();
 const questPanel=window.soaQuests?.panel?.(campaign,sc.location,()=>s.money,(result)=>{if(result?.error){status(result.error);return}if(Number.isInteger(result?.wallet))s.money=result.wallet;store();render();draw();status(result?.description||result?.message||"Contract updated.");}) || null;
 const transition=window.soaChronicle?.banner?.(campaign);if(transition)box.append(transition);
 const kicker=document.createElement("div");kicker.className="soa-scene-kicker";const position=window.soaChronicle?.progress?.(campaign);kicker.textContent=position?"ACT "+position.actRoman+" · CHAPTER "+position.chapterRoman+" · SCENE "+position.scene:"FIELD CHRONICLE · SCENE "+campaign.turn;box.append(kicker);head.textContent=sc.title||"The Hollow Raven";where.className="muted";where.textContent=sc.location||"Raven Hill";text.className="soa-story-prose";text.style.whiteSpace="pre-line";text.textContent=readableStory(sc.story);box.append(head,where,text);
 const paid=campaign.quests?.claimed?.["mission:stormwind-explosives-defused:v1"];
 if(paid){const receipt=document.createElement("p");receipt.className="soa-level-toast";receipt.textContent="MISSION PAID · Stormwind explosives defused · Total party reward: +5g 00s 00c · Credited to shared wallet once.";box.append(receipt)}
 if(questPanel)box.append(questPanel);
 if(/\\b(?:coins?|silver|gold|copper|retainer|payment|payout|reward|stipend|wages)\\b/i.test(sc.story||"")&&/\\b(?:hands? (?:over|you)|slides? (?:an? |the )?(?:iron-bound )?(?:lockbox|coins?)|paid|pays|receiv(?:e|ed)|collect(?:ed)?|claim(?:ed)?|authorized|rewarded)\\b/i.test(sc.story||"")&&!campaign.lastPayment){
  const notice=document.createElement("p");notice.className="soa-level-toast";
  notice.textContent="Payment mentioned in narration · Amount not verified · No currency credited by the game engine.";
  box.append(notice);
 }
 if(campaign.lastProgression){const gained=document.createElement("p");gained.className="soa-level-toast";gained.textContent=campaign.lastProgression;box.append(gained)}
 const moments=window.soaCompanions?.getAdventureMoments?.()||[];
 if(moments.length){
  const dialogue=document.createElement("section");dialogue.className="soa-companion-dialogue";dialogue.id="soa-companion-dialogue";
  dialogue.setAttribute("aria-label","Companion conversations");
  const label=document.createElement("div");label.className="soa-companion-dialogue-heading";label.textContent="COMPANION CONVERSATIONS";
  dialogue.append(label);
  for(const moment of moments){
   const entry=document.createElement("blockquote");entry.className="soa-companion-quote";
   const who=document.createElement("strong");who.textContent=moment.person;
   const words=document.createElement("p");words.textContent=moment.dialogue;
   entry.append(who,words);dialogue.append(entry);
  }
  box.append(dialogue);
 }
 if(pending()){const note=document.createElement("p");note.className="soa-pending";note.textContent="Your last decision is saved. The next story scene has not arrived. Retry safely without repeating the action.";box.append(note);const retry=document.createElement("button");retry.className="med";retry.textContent="Retry generating next scene";retry.disabled=busy;retry.onclick=()=>{returnToAdventure("status");advance(campaign.lastAction,campaign.lastResult,true)};box.append(retry)}
 if(campaign.journal.length){
  const notes=document.createElement("details");notes.className="soa-field-notes";
  const summary=document.createElement("summary");summary.textContent="Field notes · "+campaign.journal.length+" discoveries";notes.append(summary);
  const list=document.createElement("ul");
  for(const fact of campaign.journal.slice(-8).reverse()){const item=document.createElement("li");item.textContent=fact;list.append(item)}
  notes.append(list);box.append(notes);
 }
 drawEnemyStatus(box);
 if(campaign?.chronicle?.pendingMilestone){
  const notice=document.createElement("button");notice.type="button";notice.className="soa-chapter-review";
  notice.textContent="✦ A chapter milestone is ready for your review · Open Journal";
  notice.onclick=()=>get("soa-chronicle")?.scrollIntoView({behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"auto":"smooth",block:"start"});
  box.append(notice);
 }
 const choicesHeader=document.createElement("div");choicesHeader.className="soa-choices-heading";
 const title=document.createElement("strong");title.textContent="Choose your next move";
 const count=document.createElement("span");count.textContent=sc.choices.length+" paths + resources + custom";
 choicesHeader.append(title,count);box.append(choicesHeader);
 for(const [index,choice] of sc.choices.entries()){const b=document.createElement("button");b.className=choice.difficulty==="easy"?"low":choice.difficulty==="hard"?"high":"med";const headline=document.createElement("strong"),detail=document.createElement("small");headline.textContent=String.fromCharCode(65+index)+") "+choice.text;headline.style.display="block";const preview=dicePreview(choice);
 detail.textContent=(choice.difficulty||"medium")+" difficulty · "+(socialSkill(choice)||choice.type||"investigate");
 const rollLine=document.createElement("span");rollLine.className="soa-roll-preview";rollLine.textContent=preview.primary;
 const rollHint=document.createElement("span");rollHint.className="soa-roll-hint";rollHint.textContent=preview.secondary;detail.style.cssText="display:block;margin-top:5px;color:#bccbd6;font:12px system-ui;text-transform:capitalize";b.append(headline,detail,rollLine,rollHint);b.disabled=busy||!!pending();b.onclick=()=>choose(choice);box.append(b)}
 const surveyIndex=sc.choices.length;
 const survey=document.createElement("button");
 survey.type="button";survey.className="low soa-resource-survey";
 const surveyTitle=document.createElement("strong"),surveyHint=document.createElement("small");
 surveyTitle.textContent=String.fromCharCode(65+surveyIndex)+") Survey surrounding resources";
 surveyTitle.style.display="block";
 surveyHint.textContent="Look for ore, herbs, water and other natural materials · Investigate";
 surveyHint.style.cssText="display:block;margin-top:5px;color:#d6dfd2;font:12px system-ui";
 const surveyRoll=document.createElement("span");surveyRoll.className="soa-roll-preview";surveyRoll.textContent=dicePreview({type:"investigate",difficulty:"medium"}).primary;
 survey.append(surveyTitle,surveyHint,surveyRoll);
 survey.disabled=busy||!!pending()||!navigator.onLine;
 survey.onclick=()=>choose({text:"Survey the immediate surroundings for accessible natural resources suitable for this character's professions. Search carefully for visible ore veins, herbs, fishable water, recoverable hides and other plausible materials; note what is actually present. Do not harvest, mine, gather or award materials yet. If none are accessible, report that clearly.",type:"investigate",difficulty:"medium",survey:true});
 box.append(survey);
 const form=document.createElement("form"),label=document.createElement("label"),input=document.createElement("textarea"),typeLabel=document.createElement("label"),type=document.createElement("select"),skillLabel=document.createElement("label"),skillSelect=document.createElement("select"),submit=document.createElement("button"),help=document.createElement("p");
 label.htmlFor="campaign-custom-action";label.textContent=String.fromCharCode(65+Math.min(sc.choices.length+1,25))+") Custom action — choose your own approach";
 input.id="campaign-custom-action";input.className="ai-input";input.maxLength=300;input.required=true;input.rows=3;input.placeholder="e.g. Ask Pippa to build a distraction while I slip past the guards";input.value=customDraft;input.disabled=busy||!!pending();
 input.oninput=()=>{customDraft=input.value;submit.disabled=busy||!!pending()||!navigator.onLine||!customDraft.trim()};
 typeLabel.htmlFor="campaign-custom-type";typeLabel.textContent="Action type";type.id="campaign-custom-type";type.className="ai-input";type.disabled=busy||!!pending();
 for(const [value,name] of [["investigate","Investigate"],["stealth","Stealth"],["engineering","Engineering"],["social","Social"],["combat","Combat"],["move","Move"],["rest","Rest"]]){const option=document.createElement("option");option.value=value;option.textContent=name;type.append(option)}
 type.value=customType;type.onchange=()=>{customType=type.value};
 skillLabel.htmlFor="campaign-social-skill";skillLabel.textContent="Social check (optional)";
 skillSelect.id="campaign-social-skill";skillSelect.className="ai-input";skillSelect.disabled=busy||!!pending();
 for(const [value,label] of [["auto","Auto-detect"],["bluff","Bluff · Deception"],["bribe","Bribe · Negotiation"],["romance","Romance · Charm"],["threaten","Threaten · Intimidation"]]){const opt=document.createElement("option");opt.value=value;opt.textContent=label;skillSelect.append(opt)}
 skillSelect.value=customSocialSkill;skillSelect.onchange=()=>{customSocialSkill=skillSelect.value};
 const customRoll=document.createElement("p");customRoll.className="soa-custom-roll-preview";customRoll.setAttribute("aria-live","polite");
 function updateCustomRoll(){const action={text:input.value,type:type.value,difficulty:"medium",socialSkill:skillSelect.value==="auto"?undefined:skillSelect.value};
 const preview=dicePreview(action);customRoll.textContent=preview.primary+" · "+preview.secondary}
 input.addEventListener("input",updateCustomRoll);type.addEventListener("change",updateCustomRoll);skillSelect.addEventListener("change",updateCustomRoll);
 updateCustomRoll();
 help.id="campaign-custom-help";help.className="muted";help.textContent="Bluff, Bribe, Romance and Threaten use d20 + skill against difficulty DC. Bribes require an explicit amount (e.g. offer 50 silver); coins are paid only when accepted. A successful romance check never overrides consent. Other custom actions use their selected type.";;;input.setAttribute("aria-describedby",help.id);
 submit.type="submit";submit.textContent="Take custom action";submit.disabled=busy||!!pending()||!navigator.onLine||!customDraft.trim();
 form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text||busy||pending())return;choose({text,type:type.value,difficulty:"medium",custom:true,socialSkill:skillSelect.value==="auto"?undefined:skillSelect.value})};form.append(label,input,typeLabel,type,skillLabel,skillSelect,customRoll,help,submit);box.append(form);
 const foot=document.createElement("p");foot.className="muted";foot.className="muted soa-scene-footer";foot.textContent="Scene "+campaign.turn+" · Saved on this device · "+(navigator.onLine?"Online":"Offline reading");box.append(foot)
}
async function choose(choice){
 if(busy||pending())return;
 if(!navigator.onLine){status("Offline: your saved scene is available. Reconnect to generate another.");return}
 if(!accessCode()){focusAccess();return}
 const detected=dialogueFromCustom(choice);if((detected||socialSkill(choice))&&choice.custom&&choice.type==="investigate")choice={...choice,type:"social"};
 const resolution=result(choice);
 if(!resolution){if(!socialSkill(choice)&&choice.type!=="combat")status("Not enough Energy for that action.");return}
 campaign.lastProgression="";
 campaign.actionSerial=(Number(campaign.actionSerial)||0)+1;
 const actionReceipt="turn-"+campaign.turn+"-action-"+campaign.actionSerial;
 recordActionPractice(choice,resolution,actionReceipt);
 campaign.lastAction=safe(choice.text);campaign.lastResult=resolution;
 campaign.pending={action:campaign.lastAction,resolution,startedAt:Date.now(),dialogue:detected,survey:choice.survey===true,combat:choice.type==="combat",actionReceipt};
 campaign.history.push("At "+safe(campaign.scene?.location||"unknown location")+": Player: "+campaign.lastAction+" | "+resolution);
 campaign.history=campaign.history.slice(-MAX);store();refreshDisplay();
 // Release the iPhone keyboard and return to the story while Gemini works.
 if(choice.custom&&document.activeElement?.blur)document.activeElement.blur();
 returnToAdventure("status");
 await advance(campaign.lastAction,resolution,false);
}
async function advance(action,resolution,retry){
 if(busy)return;if(!navigator.onLine){get("campaign-status").textContent="Offline: saved scene available; new scenes require internet.";draw();return}
 const code=accessCode();
 if(!code){focusAccess();draw();return}
 busy=true;status("Gemini is writing the next scene…");draw();
 try{
 const response=await fetch("./api/campaign",{method:"POST",headers:{"content-type":"application/json","x-story-access":code},body:JSON.stringify({context:{location:campaign.scene?.location||(window.soaCharacters?.isNewCharacter?.()?(window.soaCharacters?.profile?.()?.startingZone||"New adventurer starting zone"):"Hollow Raven laboratory"),previousTitle:campaign.scene?.title||"",previousScene:campaign.scene?.story||"",campaignOrigin:originOfCampaign(),startingZone:window.soaCharacters?.profile?.()?.startingZone||null,recentDiscoveries:campaign.journal.slice(-12),action,resolution,hp:s.hp,energy:s.en,gold:fmtMoney(s.money),alarm:s.alert,turn:campaign.turn,history:campaign.history.slice(-20),flags:Object.keys(s.flags||{}),companionMoments:window.soaCompanions?.getRecent?.()||[],companionProfiles:window.soaCompanions?.getProfiles?.()||{},relationships:window.soaCompanions?.getRelationships?.()||{},conversationContext:window.soaCompanions?.getConversationContext?.()||{},character:window.soaCharacters?.profile?.()||null,abilityScores:window.soaAbilities?.get?.("hero")?.stats||null,reputation:window.soaReputation?.getStandings?.()||{},reputationDevelopments:window.soaReputation?.getDevelopments?.()||[],enemies:livingEnemies().map(e=>({name:e.name,hp:e.hp,maxHp:e.maxHp})),allies:combatParty().map(e=>({name:e.name,hp:e.hp,maxHp:e.maxHp})),combatLog:(campaign.combatLog||[]).slice(-3),lastExchange:campaign.lastExchange||null,chronicle:window.soaChronicle?.context?.(campaign)||null,resourceSurvey:campaign.pending?.survey===true}})});
 const data=await response.json().catch(()=>({error:"Invalid server response"}));if(!response.ok)throw Error(data.error||"Request failed");
 if(!Array.isArray(data.choices)||!data.story)throw Error("Incomplete generated scene");
 const completedDialogue=campaign.pending?.dialogue?{...campaign.pending.dialogue,id:"campaign-dialogue-"+campaign.pending.startedAt+"-"+campaign.turn,success:/^Success:/i.test(campaign.pending.resolution)}:null;
 const completedProfession=campaign.pending&&!campaign.pending.survey?{action:campaign.pending.action,resolution:campaign.pending.resolution,id:"profession-"+campaign.pending.startedAt+"-"+campaign.turn}:null;
 const completedFaction=campaign.pending?{action:campaign.pending.action,resolution:campaign.pending.resolution,id:"faction-"+campaign.pending.startedAt+"-"+campaign.turn}:null;
 updateLivingEnemies(data);reconcileCombatAllies(data);
 if(campaign.xpEncounter?.active){
  for(const id of partyExperienceIds())if(!campaign.xpEncounter.party.includes(id))campaign.xpEncounter.party.push(id);
  if(campaign.xpEncounter.defeated.length&&!livingEnemies().length)campaign.xpEncounter.pendingVictory=true;
  if(campaign.xpEncounter.pendingVictory)concludeProgressionEncounter();
 }
 campaign.scene=data;campaign.turn++;window.soaChronicle?.receive?.(campaign,data);campaign.pending=null;customDraft="";customSocialSkill="auto";campaign.history.push("Scene: "+safe(data.title)+" @ "+safe(data.location)+" — "+safe(data.story).slice(0,380));campaign.history=campaign.history.slice(-MAX);if(data.journal)campaign.journal.push(safe(data.journal).slice(0,200));campaign.journal=campaign.journal.slice(-100);window.soaChronicle?.render?.(campaign);campaign.lastError="";if(completedDialogue)window.soaCompanions?.applyDialogueOutcome?.(completedDialogue);if(completedProfession)window.soaCharacters?.applyProfession?.(completedProfession.action,completedProfession.resolution,completedProfession.id);if(completedFaction)window.soaReputation?.fromAction?.(completedFaction);store();status("Scene generated and saved. Choose your next action.");
 }catch(e){campaign.lastError=e.message;store();status("AI unavailable: "+e.message+". Your last action is preserved. Tap Retry generating next scene; it will not spend Energy twice.")}finally{busy=false;refreshDisplay();returnToAdventure(campaign?.lastError?"status":"scene")}
}
function migrateCompanionDisplayNames(){
 if(!campaign)return;
 const canonical=name=>name==="Lethariel"?"Lethariel Moonguard":name;
 if(Array.isArray(campaign.combatAllies))for(const ally of campaign.combatAllies)if(ally&&typeof ally.name==="string")ally.name=canonical(ally.name);
 if(campaign.partyHealth&&typeof campaign.partyHealth==="object"&&campaign.partyHealth.Lethariel){
  if(!campaign.partyHealth["Lethariel Moonguard"])campaign.partyHealth["Lethariel Moonguard"]=campaign.partyHealth.Lethariel;
  delete campaign.partyHealth.Lethariel;
 }
 if(campaign.lastExchange?.recipient==="Lethariel")campaign.lastExchange.recipient="Lethariel Moonguard";
 if(Array.isArray(campaign.combatLog))for(const row of campaign.combatLog)if(Array.isArray(row?.events))for(const event of row.events)if(event?.name==="Lethariel")event.name="Lethariel Moonguard";
}
try{campaign=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){campaign=null}
migrateCompanionDisplayNames();
enabled=localStorage.getItem("soa-campaign-enabled")==="1";if(campaign){window.soaChronicle?.attach?.(campaign);store()}window.soaChronicleSetSave?.(store);interfaceUI();get("campaign-mode").checked=enabled;
if(enabled){if(!campaign)campaign=make();draw();if(!campaign.scene&&navigator.onLine)advance(campaign.lastAction,campaign.lastResult,true)}
window.soaLivingCampaign={getState:()=>campaign,enabled:()=>enabled,refreshUI:()=>{draw()}};})();