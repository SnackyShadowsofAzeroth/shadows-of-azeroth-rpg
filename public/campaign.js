(()=>{"use strict";
const KEY="soa-campaign-v1", MAX=24, COMBAT_RESOURCE_RECOVERY=25, ACTION_RESOURCE_RECOVERY=10;
let campaign=null,busy=false,enabled=false,customDraft="",customType="investigate",customSocialSkill="auto",statusMessage="",campaignSaveFailed=false,campaignLoadBlocked=false,campaignStorageReadFailed=false,selectedCombatTarget=null,selectedAllyTarget=null;
const get=id=>document.getElementById(id);
function localGet(key){try{return localStorage.getItem(key)}catch{campaignStorageReadFailed=true;return null}}
function localSet(key,value){try{localStorage.setItem(key,value);return true}catch{return false}}
function store(){if(campaignLoadBlocked||window.soaSaveRules.isIntegrityBlocked()){status("Saved data could not be read. Restore a valid backup before continuing.");return false}try{localStorage.setItem(KEY,JSON.stringify(campaign));campaignSaveFailed=false;return true}catch(e){campaignSaveFailed=true;status("Campaign save failed. Check device storage; your current scene is still open.");window.soaReportStorageFailure?.("Campaign save failed. Check browser storage before continuing.");return false}}
function make(){return {turn:0,scene:null,history:[],journal:[],lastError:"",lastAction:"Begin the next scene of this character’s adventure.",lastResult:"A new campaign is ready. No action has been taken yet.",pending:null}}
function normalizeCampaignState(value){
 value=window.soaSaveRules.validateCampaignSave(value);
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const c=value;
 c.turn=Number.isSafeInteger(c.turn)&&c.turn>=0?c.turn:0;
 c.history=Array.isArray(c.history)?c.history.filter(item=>typeof item==="string").slice(-MAX):[];
 c.journal=Array.isArray(c.journal)?c.journal.filter(item=>typeof item==="string").slice(-100):[];
 c.lastAction=typeof c.lastAction==="string"?c.lastAction.slice(0,320):make().lastAction;
 c.lastResult=typeof c.lastResult==="string"?c.lastResult.slice(0,900):make().lastResult;
 c.flags=c.flags&&typeof c.flags==="object"&&!Array.isArray(c.flags)?c.flags:{};
 c.enemies=Array.isArray(c.enemies)?c.enemies.filter(enemy=>enemy&&typeof enemy.name==="string"&&Number.isFinite(enemy.hp)&&enemy.hp>=0&&Number.isFinite(enemy.maxHp)&&enemy.maxHp>0&&enemy.hp<=enemy.maxHp).slice(0,4):[];
 c.combatAllies=Array.isArray(c.combatAllies)?c.combatAllies.filter(ally=>ally&&typeof ally.name==="string").slice(0,7):[];
 c.combatLog=Array.isArray(c.combatLog)?c.combatLog.slice(-30).filter(row=>row&&typeof row==="object"&&Array.isArray(row.events)).map(row=>({round:Number.isSafeInteger(row.round)&&row.round>=0?row.round:0,events:row.events.filter(event=>event&&typeof event.name==="string").slice(0,10).map(event=>({name:event.name.slice(0,80),side:typeof event.side==="string"?event.side.slice(0,12):"",delta:Number.isFinite(event.delta)?event.delta:0,after:Number.isFinite(event.after)?event.after:0,maxHp:Number.isFinite(event.maxHp)?event.maxHp:null}))})):[];
 c.supportCooldowns=c.supportCooldowns&&typeof c.supportCooldowns==="object"&&!Array.isArray(c.supportCooldowns)?c.supportCooldowns:{};
 c.partyHealth=c.partyHealth&&typeof c.partyHealth==="object"&&!Array.isArray(c.partyHealth)?c.partyHealth:{};
 c.defeatedEnemies=Array.isArray(c.defeatedEnemies)?c.defeatedEnemies.filter(item=>typeof item==="string").slice(-80):[];
 if(c.pending&&(typeof c.pending!=="object"||Array.isArray(c.pending)||typeof c.pending.action!=="string"||typeof c.pending.resolution!=="string"))c.pending=null;
 else if(c.pending){
  const p=c.pending,tones=new Set(["betray","insult","apologize","flirt","disagree","support","honest","friendly","neutral"]),targets=new Set(["pippa","bromli","lethariel"]);
  c.pending={action:p.action.slice(0,320),resolution:p.resolution.slice(0,700),startedAt:Number.isSafeInteger(p.startedAt)&&p.startedAt>=0?p.startedAt:0,dialogue:p.dialogue&&targets.has(p.dialogue.target)?{target:p.dialogue.target,tone:tones.has(p.dialogue.tone)?p.dialogue.tone:"neutral"}:null,survey:p.survey===true,combat:p.combat===true,actionReceipt:typeof p.actionReceipt==="string"?p.actionReceipt.slice(0,120):""};
 }
 if(c.xpEncounter&&typeof c.xpEncounter==="object"&&!Array.isArray(c.xpEncounter)){
  const e=c.xpEncounter;
  e.id=typeof e.id==="string"?e.id.slice(0,100):"encounter-legacy";
  e.active=e.active===true;e.pendingVictory=e.pendingVictory===true;
  e.party=Array.isArray(e.party)?e.party.filter(id=>typeof id==="string").slice(0,20):[];
  e.defeated=Array.isArray(e.defeated)?e.defeated.filter(foe=>foe&&typeof foe.name==="string"&&Number.isFinite(foe.maxHp)&&foe.maxHp>0).slice(0,20):[];
 }else c.xpEncounter=null;
 if(c.scene&&typeof c.scene==="object"&&!Array.isArray(c.scene)&&typeof c.scene.story==="string"&&Array.isArray(c.scene.choices)){
  const types=new Set(["stealth","combat","social","investigate","move","engineering","rest"]),difficulties=new Set(["easy","medium","hard"]);
  c.scene.choices=c.scene.choices.filter(choice=>choice&&typeof choice.text==="string"&&choice.text.trim()).slice(0,6).map(choice=>({text:choice.text.slice(0,170),type:types.has(choice.type)?choice.type:"investigate",difficulty:difficulties.has(choice.difficulty)?choice.difficulty:"medium"}));
  if(!c.scene.choices.length)c.scene=null;
  else{c.scene.title=typeof c.scene.title==="string"?c.scene.title.slice(0,95):"The Continuing Adventure";c.scene.location=typeof c.scene.location==="string"?c.scene.location.slice(0,120):"Unknown location";c.scene.story=c.scene.story.slice(0,2800)}
 }else c.scene=null;
 return c;
}
function safe(text){return String(text||"").slice(0,2600)}
function readableStory(text){return String(text||"").replace(/\bPipprained in her satchel\b/gi,"Pippa rummaged in her satchel").replace(/\bPipprained\b/gi,"Pippa")}

function status(message){statusMessage=message;const el=get("campaign-status");if(el)el.textContent=campaignLoadBlocked?"Stored Living Campaign could not be read. Restore a valid all-character backup before starting it again.":campaignStorageReadFailed?"Device storage could not be read. Reload after enabling browser storage; no new campaign was started.":campaignSaveFailed?"Campaign save failed. Retry saving before continuing. "+message:message}
function accessCode(){return get("ai-code")?.value.trim()||""}
function focusAccess(){const message="Enter your private AI access code in the AI Story Director panel to continue.";status(message);window.soaAiDirector?.showSetup?.(message,true);const f=get("ai-code");if(f){f.scrollIntoView({behavior:"smooth",block:"center"});f.focus()}}
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
 const costs={stealth:20,engineering:10,social:0,combat:20,investigate:10,move:0,rest:0};
 const relevant=/\b(?:pick|lock|tinker|wire|mechanism|repair|device|engineer|disable trap)\b/.test(text)?"engineering":/\b(?:hide|sneak|stealth|shadow|slip past|ambush|conceal|pickpocket)\b/.test(text)?"stealth":/\b(?:search|inspect|investigate|examine|study|track|deduce|analyze|observe)\b/.test(text)?"investigate":/\b(?:climb|leap|jump|sprint|run|swim|dodge|balance)\b/.test(text)?"move":/\b(?:persuade|convince|negotiate|discuss|appeal|talk)\b/.test(text)?"social":/\b(?:rest|sleep|recover)\b/.test(text)?"rest":t;
 const base={stealth:68,engineering:64,social:65,combat:55,investigate:70,move:76,rest:83}[relevant]??65;
 const modifier=window.soaAbilities?.modifier?.(relevant)||0;
 const trained=window.soaProgression?.bonus?.(relevant)||0;
 const level=window.soaProgression?.level?.()||1;
 const difficulty=action.difficulty==="easy"?12:action.difficulty==="hard"?-22:0;
 const racialFocus=campaign?.racialFocus?.skill===relevant?Math.max(0,Number(campaign.racialFocus.bonus)||0):0;
 const target=Math.max(10,Math.min(95,Math.round(base+modifier*3+trained*2+Math.max(0,level-1)*.2+difficulty-(s.alert||0)*5+racialFocus)));
 return {cost:costs[relevant]??costs[t]??0,target,skill:relevant,modifier,trained};
}
function heroHealthCap(){const hero=window.soaCharacters?.profile?.();return 100+(window.soaRacialAbilities?.passives?.(hero?.race)?.maxHp||0)}
function racialRegeneration(){const hero=window.soaCharacters?.profile?.();return window.soaRacialAbilities?.passives?.(hero?.race)?.regeneration||0}
function resourceName(){const hero=window.soaCharacters?.profile?.();return window.soaResources?.forClass?.(hero?.className,hero?.form)?.label||"Energy"}
function resourceKey(){const hero=window.soaCharacters?.profile?.();return window.soaResources?.forClass?.(hero?.className,hero?.form)?.key||"energy"}
function resolvedCombatAbility(action){
 const hero=window.soaCharacters?.profile?.(),level=window.soaProgression?.level?.()||hero?.startLevel||1;
 if(window.soaClassAbilities?.get?.(action.ability,hero?.className,level))return action.ability;
 const description=String(action.text||"");
 const rogue=window.soaCharacters?.profile?.()?.className==="Rogue";
 const inferred=rogue&&/\briposte\b/i.test(description)?"riposte":rogue&&/\b(?:evasion|evade)\b/i.test(description)?"evasion":rogue&&/\bkick\b/i.test(description)?"kick":"strike";
 return ["strike","kick","evasion","riposte"].includes(action.ability)?action.ability:inferred;
}
function d20SuccessChance(bonus,dc,advantage=0){
 let hits=0,rolls=0;
 const succeeds=die=>die===20||die!==1&&die+bonus>=dc;
 if(advantage){for(let a=1;a<=20;a++)for(let b=1;b<=20;b++){rolls++;if(succeeds(advantage>0?Math.max(a,b):Math.min(a,b)))hits++}}
 else{for(let die=1;die<=20;die++){rolls++;if(succeeds(die))hits++}}
 return hits*100/rolls;
}
function chanceLabel(value){const rounded=Math.round(value*10)/10;return (Number.isInteger(rounded)?String(rounded):rounded.toFixed(1))+"%"}
function dicePreview(action){
 // Combat takes priority over social keyword detection, matching the resolver.
 if(action.type==="combat"&&livingEnemies().length){
  const ability=resolvedCombatAbility(action);
  const profile=window.soaCharacters?.profile?.(),level=window.soaProgression?.level?.()||profile?.startLevel||1;
  const cost=window.soaClassAbilities?.costOf?.(ability,profile?.className,level)??25;
  if(ability==="evasion")return {primary:"🎲 No attack roll",secondary:"Incoming attack at disadvantage · "+cost+" "+resourceName()+" cost · up to +25 "+resourceName()+" recovery"};
  const attacker=window.soaAbilities?.get?.("hero");
  const gear=window.soaEquipment?.modifiers?.()||{};
  if(ability==="riposte")return {primary:"🎲 Automatic hit after parry",secondary:(24+(attacker?.modifiers?.DEX||0)+(gear.damage||0))+" raw damage on a valid Riposte · "+cost+" "+resourceName()+" cost · up to +25 recovery"};
  const attackAbility=attacker?.className==="Warrior"||attacker?.className==="Paladin"?"STR":"DEX";
  const attackModifier=attacker?.modifiers?.[attackAbility]??2;
  const bonus=(attacker?.proficiency??2)+attackModifier+(gear.attack||0);
  const targets=livingEnemies(),selected=targets.find(e=>e.name===selectedCombatTarget)||targets[0];
  const ac=window.soaCombatRules?.statBlock?.(selected)?.ac||12;
  const weapon=window.soaCombatRules?.weapon?.(attacker,ability)||{die:ability==="kick"?6:10,flat:ability==="kick"?4+(attacker?.modifiers?.DEX||0):10+(attacker?.modifiers?.DEX||0)};
  
  const advantage=campaign?.flags?.advantage?1:0,rollLabel=advantage?"d20 with advantage + ":"d20 + ",chance=chanceLabel(d20SuccessChance(bonus,ac,advantage));
  return {primary:"🎲 "+rollLabel+bonus+" vs AC "+ac+" · "+chance+" hit · natural 20 critical",secondary:"1d"+weapon.die+" + "+(weapon.flat+(gear.damage||0))+" raw damage · "+cost+" "+resourceName()+" cost · up to +25 recovery"+(ability==="kick"?" · interrupt on hit":"")};
 }
 const skill=socialSkill(action);
 if(skill){
  const {bonus,dc}=socialTarget(action,skill);
  return {primary:"🎲 d20 "+(bonus>=0?"+ "+bonus:"− "+Math.abs(bonus))+" vs DC "+dc+" · "+chanceLabel(d20SuccessChance(bonus,dc))+" success",secondary:"CHA-based "+skill+" check · Natural 1 fails, 20 succeeds"};
 }
 const odds=actionOdds(action);
 const {cost,target}=odds;return {primary:"🎲 "+odds.skill+" · d100 ≤ "+target+" ("+target+"%)",secondary:cost+" "+resourceName()+" cost · up to +10 recovery · ability modifier "+(odds.modifier>=0?"+":"")+odds.modifier+" · training +"+odds.trained};
}

function resourceForecast(action){
 const profile=window.soaCharacters?.profile?.(),label=resourceName(),current=Math.max(0,Math.min(100,Number(s.en)||0));
 let cost=0;
 if(action.type==="combat"&&livingEnemies().length){const ability=resolvedCombatAbility(action),level=window.soaProgression?.level?.()||profile?.startLevel||1;cost=window.soaClassAbilities?.costOf?.(ability,profile?.className,level)??25}
 else if(!socialSkill(action))cost=actionOdds(action).cost;
 const recovery=action.type==="combat"&&livingEnemies().length?COMBAT_RESOURCE_RECOVERY:ACTION_RESOURCE_RECOVERY,affordable=current>=cost,after=affordable?Math.min(100,current-cost+recovery):current;
 const text=affordable?(label+" "+current+" → "+after+"/100 · "+(cost?cost+" cost":"no cost")+" · +"+recovery+" recovery"):"Need "+cost+" "+label+" · have "+current+"/100";
 return{label,current,max:100,cost,after,affordable,text};
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
 if(choice.type==="combat"&&livingEnemies().length)return "combat";
 const social=socialSkill(choice);
 if(social)return social;
 const t=actionOdds(choice).skill;
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
 s.time++;s.en=Math.min(100,s.en+COMBAT_RESOURCE_RECOVERY);
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
 return "Success: Round "+campaign.combatRound+". "+description+" "+retaliation+" "+resourceName()+" "+previous+" → "+s.en+". Exactly one exchange resolved.";
}
function classAbilityExchange(action,ability,targets){
 function touchOfTheGrave(target,hit,damageType){const hero=window.soaCharacters?.profile?.();const passive=window.soaRacialAbilities?.passives?.(hero?.race)?.touchOfTheGrave;if(!passive||!hit||!["physical","slashing","piercing","bludgeoning"].includes(damageType)||Math.random()>=passive.chance)return null;const level=window.soaProgression?.level?.()||hero?.startLevel||1,rules=window.soaCombatRules,rolled=rules.damage(passive.die,Math.floor(Math.max(0,level-1)/passive.levelScaling)),dealt=Math.min(target.hp,rules.mitigate(rolled,"shadow",rules.statBlock(target)));target.hp=Math.max(0,target.hp-dealt);const before=s.hp,cap=100+(window.soaRacialAbilities?.passives?.(hero.race)?.maxHp||0);s.hp=Math.min(cap,s.hp+dealt);return{damage:dealt,healing:s.hp-before};}
 const name=window.soaCharacters?.profile?.()?.name||"Your hero",resource=resourceName();
 const heroHealthCap=()=>100+(window.soaRacialAbilities?.passives?.(window.soaCharacters?.profile?.()?.race)?.maxHp||0);
 const racialRegeneration=()=>window.soaRacialAbilities?.passives?.(window.soaCharacters?.profile?.()?.race)?.regeneration||0;
 if(ability.effect==="riposte"&&!campaign.parryReady){status("Riposte requires a parry in the previous exchange. No action spent.");return null}
 if(s.en<ability.cost){status("Not enough "+resource+" for "+ability.name+" ("+ability.cost+" required). No action spent.");return null}
 const requested=String(action.text||"").toLowerCase(),matches=targets.filter(e=>requested.includes(e.name.toLowerCase()));
 const chosen=targets.find(e=>e.name===selectedCombatTarget),target=matches.length===1?matches[0]:matches.length>1?null:chosen||targets[0];
 if(!target){status("Select a specific enemy before using that ability. No action spent.");return null}
 if(ability.requiresCorpse&&!hasRecentCorpse()){status("Cannibalize requires a nearby defeated humanoid. No action spent.");return null}
 if(ability.effect==="heal"&&s.hp>=heroHealthCap()){status("Your health is already full. No action spent.");return null}
 const encounter=startProgressionEncounter();for(const id of partyExperienceIds())if(!encounter.party.includes(id))encounter.party.push(id);
 const rules=window.soaCombatRules,actor=window.soaAbilities?.get?.("hero"),stat=actor?.modifiers?.[ability.stat]||0,proficiency=actor?.proficiency||2;
 const block=rules.statBlock(target),gear=window.soaEquipment?.modifiers?.()||{},heroHP=s.hp,oldResource=s.en,oldHP=target.hp;
 if(!campaign.initiativeFor||campaign.initiativeFor!==campaign.enemyLocation){campaign.initiativeFor=campaign.enemyLocation;campaign.initiativeRoll=rules.initiative(actor?.initiative||0);campaign.enemyInitiative=rules.initiative(block.initiative)}
 let roll=null,hit=false,dealt=0,healed=0,racialProc=null,damageType=ability.damageType||"physical",interrupted=false,guarding=ability.effect==="guard";
 if(["damage","interrupt","drain","riposte"].includes(ability.effect)){
  roll=ability.effect==="riposte"?null:rules.attack(proficiency+stat+(gear.attack||0),block.ac,{advantage:campaign.flags?.advantage?1:0});
  hit=ability.effect==="riposte"?true:!!roll?.hit;
  const rolled=ability.effect==="riposte"?rules.damage(ability.die,ability.flat+stat+(gear.damage||0)):rules.damage(ability.die,ability.flat+stat+(gear.damage||0)+(ability.bonusDamage||0),!!roll?.critical);
  dealt=hit?Math.min(target.hp,rules.mitigate(rolled,damageType,block)):0;target.hp=Math.max(0,target.hp-dealt);
  racialProc=touchOfTheGrave(target,hit,damageType);if(racialProc){dealt+=racialProc.damage;healed+=racialProc.healing}
  if(ability.effect==="drain"&&dealt){const before=s.hp;s.hp=Math.min(heroHealthCap(),s.hp+Math.max(1,Math.floor(dealt/2)));healed=s.hp-before}
  interrupted=ability.effect==="interrupt"&&hit;
 }else if(ability.effect==="heal"){
  const before=s.hp;s.hp=Math.min(heroHealthCap(),s.hp+rules.damage(ability.die,ability.flat+stat));healed=s.hp-before;
 }
 const defeated=target.hp===0,enemyActsFirst=(campaign.enemyInitiative||0)>(campaign.initiativeRoll||0);
 const retaliationAttempt=enemyActsFirst||(!defeated&&!interrupted),heroAC=actor?.armorClass||12;
 const enemyAttack=retaliationAttempt?rules.attack(block.bonus,heroAC,{advantage:guarding||ability.id==="evasion"?-1:campaign.guardUntil>=(Number(campaign.combatRound)||0)+1?-1:0}):null;
 const retaliates=!!enemyAttack?.hit,amount=retaliates?rules.damage(block.die,2,enemyAttack.critical):0;
 const taken=retaliates?Math.min(Math.max(0,s.hp-1),amount):0;s.hp=Math.min(heroHealthCap(),Math.max(1,s.hp-taken)+racialRegeneration());
 const parry=!!enemyAttack&&!enemyAttack.hit&&!defeated&&!guarding&&enemyAttack.total<heroAC&&enemyAttack.die>1&&Math.random()<.5;
 campaign.parryReady=parry;s.en=Math.min(100,s.en-ability.cost+COMBAT_RESOURCE_RECOVERY);s.time++;campaign.combatRound=(Number(campaign.combatRound)||0)+1;
 const event={round:campaign.combatRound,ability:ability.id,racialProc,attackRoll:roll?.die??null,targetAC:block.ac,enemyType:block.type,damageType,initiative:campaign.initiativeRoll,enemyInitiative:campaign.enemyInitiative,attackTotal:roll?.total??null,critical:!!roll?.critical,enemyRoll:enemyAttack?.die??null,enemyTotal:enemyAttack?.total??null,defenderAC:heroAC,target:target.name,dealt,taken,hit,defeated,enemyBefore:oldHP,enemyAfter:target.hp,enemyMax:target.maxHp,heroBefore:heroHP,heroAfter:s.hp,energyBefore:oldResource,energyAfter:s.en,recipient:name,recipientBefore:heroHP,recipientAfter:s.hp,healed,parry};
 campaign.lastExchange=event;recordCombatDelta(target,dealt,taken,name,heroHP,s.hp);
 if(defeated){window.soaQuests?.onDefeat?.(campaign,target.name);if(!encounter.defeated.some(x=>x.name===target.name))encounter.defeated.push({name:target.name,maxHp:target.maxHp});if(!livingEnemies().length)encounter.pendingVictory=true;if(selectedCombatTarget===target.name)selectedCombatTarget=null;campaign.defeatedEnemies||=[];campaign.defeatedEnemies.push(String(campaign.enemyLocation||campaign.scene?.location||"")+"|"+target.name.toLowerCase());campaign.defeatedEnemies=campaign.defeatedEnemies.slice(-80)}
 const effect=guarding?"evades the incoming attack":healed?"restores "+healed+" HP":hit?"hits "+target.name+" for "+dealt+" damage":ability.effect==="heal"?"restores no health":"misses "+target.name;
 return (hit||guarding||healed?"Success":"Complication")+": "+name+" uses "+ability.name+" and "+effect+". "+(racialProc?"Touch of the Grave deals "+racialProc.damage+" Shadow damage and restores "+racialProc.healing+" HP. ":"")+(roll?"Attack d20 "+roll.die+" + "+(proficiency+stat+(gear.attack||0))+" vs AC "+block.ac+". ":"")+ (retaliates?target.name+" retaliates for "+taken+" HP.":"No damage received.")+" "+resource+" "+oldResource+" → "+s.en+". Player HP "+heroHP+" → "+s.hp+". Exactly one combat exchange resolved.";
}
function fightExchange(action){
 function touchOfTheGrave(target,hit,damageType){const hero=window.soaCharacters?.profile?.();const passive=window.soaRacialAbilities?.passives?.(hero?.race)?.touchOfTheGrave;if(!passive||!hit||!["physical","slashing","piercing","bludgeoning"].includes(damageType)||Math.random()>=passive.chance)return null;const level=window.soaProgression?.level?.()||hero?.startLevel||1,rules=window.soaCombatRules,rolled=rules.damage(passive.die,Math.floor(Math.max(0,level-1)/passive.levelScaling)),dealt=Math.min(target.hp,rules.mitigate(rolled,"shadow",rules.statBlock(target)));target.hp=Math.max(0,target.hp-dealt);const before=s.hp,cap=100+(window.soaRacialAbilities?.passives?.(hero.race)?.maxHp||0);s.hp=Math.min(cap,s.hp+dealt);return{damage:dealt,healing:s.hp-before};}
 if(["bromli_guard","pippa_snare","lethariel_heal"].includes(action.ability))return companionExchange(action);
 const targets=livingEnemies();
 if(!targets.length)return null;
 const heroProfile=window.soaCharacters?.profile?.(),heroLevel=window.soaProgression?.level?.()||heroProfile?.startLevel||1;
 const classAbility=window.soaClassAbilities?.get?.(action.ability,heroProfile?.className,heroLevel);
 if(classAbility)return classAbilityExchange(action,classAbility,targets);
 const racialAbility=window.soaRacialAbilities?.get?.(action.ability,heroProfile?.race);
 if(racialAbility?.mode==="combat")return racialCombatExchange(action,racialAbility,targets);
 const ability=resolvedCombatAbility(action);
 const price=window.soaClassAbilities?.costOf?.(ability,heroProfile?.className,heroLevel)??25;
 if(ability==="riposte"&&!campaign.parryReady){status("Riposte requires a parry in the previous exchange. No action spent.");return null}
 if(s.en<price){status("Not enough "+resourceName()+" for "+ability+" ("+price+" required). No action spent.");return null}
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
 const attackAbility=actor?.className==="Warrior"||actor?.className==="Paladin"?"STR":"DEX";
 const attackModifier=actor?.modifiers?.[attackAbility]??dex;
 const proficiency=actor?.proficiency??2;
 const block=rules.statBlock(target);
 const targetAC=block.ac;
 if(!campaign.initiativeFor||campaign.initiativeFor!==campaign.enemyLocation){
  campaign.initiativeFor=campaign.enemyLocation;
  campaign.initiativeRoll=rules.initiative(dex);
  campaign.enemyInitiative=rules.initiative(block.initiative);
 }
 const advantage=campaign.flags?.advantage?1:0;
 const gearBonus=window.soaEquipment?.modifiers?.()||{};
 const playerAttack=ability==="riposte"||ability==="evasion"?null:rules.attack(proficiency+attackModifier+(gearBonus.attack||0),targetAC,{advantage});
 const attackRoll=playerAttack?.die??null;
 const hit=ability==="riposte"?true:ability==="evasion"?false:playerAttack.hit;
 const hitTarget=targetAC;
 const damageModifier=dex;
 const arm=rules.weapon(actor,ability);
 const rolled=ability==="riposte"?24+damageModifier+(gearBonus.damage||0):ability==="evasion"?0:rules.damage(arm.die,arm.flat+(gearBonus.damage||0),!!playerAttack?.critical);
 let dealt=hit?Math.min(target.hp,rules.mitigate(rolled,arm.type,block)):0;
 target.hp=Math.max(0,target.hp-dealt);
 const racialProc=touchOfTheGrave(target,hit,arm.type);if(racialProc)dealt+=racialProc.damage;
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
 if(!allyRecipient&&racialRegeneration())s.hp=Math.min(heroHealthCap(),s.hp+racialRegeneration());
 const parry=!!enemyAttack&&!enemyAttack.hit&&!defeated&&ability!=="evasion"&&enemyAttack.total<defenderAC&&enemyAttack.die>1&&defendingAlly===null&&Math.random()<.5;
 campaign.parryReady=parry;
 s.en=Math.min(100,s.en-price+COMBAT_RESOURCE_RECOVERY);s.time++;
 campaign.combatRound=(Number(campaign.combatRound)||0)+1;
 const event={round:campaign.combatRound,ability,racialProc,healed:racialProc?.healing||0,attackRoll,hitTarget,targetAC,enemyType:block.type,damageType:arm.type,initiative:campaign.initiativeRoll,enemyInitiative:campaign.enemyInitiative,attackTotal:playerAttack?.total??null,critical:!!playerAttack?.critical,enemyRoll:enemyAttack?.die??null,enemyTotal:enemyAttack?.total??null,defenderAC,target:target.name,dealt,taken,hit,defeated,enemyBefore:oldHP,enemyAfter:target.hp,enemyMax:target.maxHp,heroBefore:heroHP,heroAfter:s.hp,energyBefore:oldEnergy,energyAfter:s.en,recipient:receivedName,recipientBefore,recipientAfter,parry};
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
  (attackRoll!==null?" d20 attack "+attackRoll+" + "+playerAttack.bonus+" vs AC "+targetAC+".":"")+
  " Enemy "+target.name+" HP "+oldHP+"/"+target.maxHp+" → "+target.hp+"/"+target.maxHp+". "+
  (retaliates?target.name+" retaliates against "+receivedName+" for "+taken+" HP ("+recipientBefore+" → "+recipientAfter+").":"No damage received.")+
  " Player HP "+heroHP+" → "+s.hp+"; "+resourceName()+" "+oldEnergy+" → "+s.en+"."+
  (racialProc?" Touch of the Grave erupts for "+racialProc.damage+" Shadow damage and restores "+racialProc.healing+" HP.":"")+(defeated?" Opponent defeated.":"")+" Exactly ONE consequential combat exchange resolved. No automatic loot, extra turns, or unconfirmed healing.";
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
  const classes=new Set(["Warrior","Paladin","Hunter","Rogue","Priest","Mage","Warlock","Druid","Shaman"]);
  const nameClass=/\bwarrior|fighter\b/i.test(name)?"Warrior":/\bpaladin\b/i.test(name)?"Paladin":/\bhunter|ranger\b/i.test(name)?"Hunter":/\brogue|assassin|cutthroat\b/i.test(name)?"Rogue":/\bpriest\b/i.test(name)?"Priest":/\bmage|wizard\b/i.test(name)?"Mage":/\bwarlock\b/i.test(name)?"Warlock":/\bdruid\b/i.test(name)?"Druid":/\bshaman\b/i.test(name)?"Shaman":null;
  const className=classes.has(item.className)?item.className:existing?.className||nameClass;
  const maxResource=Number.isInteger(item.maxResource)?Math.max(1,Math.min(100,item.maxResource)):Number.isInteger(existing?.maxResource)?existing.maxResource:100;
  const resource=Number.isInteger(item.resource)?Math.max(0,Math.min(maxResource,item.resource)):Number.isInteger(existing?.resource)?Math.min(maxResource,existing.resource):className?maxResource:null;
  const form=["cat","bear"].includes(item.form)?item.form:existing?.form||null;
  const armorClass=Number.isInteger(item.armorClass)?Math.max(8,Math.min(25,item.armorClass)):existing?.armorClass;
  next.push({...existing,name,maxHp,hp:existing?Math.max(0,Math.min(maxHp,existing.hp)):Math.max(1,Math.min(maxHp,Math.round(Number(item.hp)||maxHp))),className,form,armorClass,resource,maxResource});
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
 const profile=window.soaCharacters?.profile?.();
 const isSn=profile?.id==="snacky";
 return [{name:profile?.name||"Your hero",hp:s.hp,maxHp:100,player:true,className:profile?.className,form:profile?.form,resource:s.en,maxResource:100},...list.filter(e=>e&&typeof e.name==="string").slice(0,6).filter(e=>!isSn||!/^Snacky Lugnuts$/i.test(e.name)).map(e=>({...e,player:false}))];
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
function racialCooldownLeft(ability){return Math.max(0,(campaign?.racialCooldowns?.[ability.id]||0)-(Number(campaign?.actionSerial)||0))}
function hasRecentCorpse(){const location=String(campaign?.enemyLocation||campaign?.scene?.location||"").toLowerCase(),names=[...(campaign?.xpEncounter?.defeated||[]).map(x=>x.name),...(campaign?.defeatedEnemies||[]).filter(x=>String(x).toLowerCase().startsWith(location+"|")).map(x=>String(x).slice(String(x).indexOf("|")+1))];return names.some(name=>!/(?:beast|wolf|worg|spider|skeleton|ghoul|zombie|undead|construct|elemental)/i.test(String(name||"")))}
function racialCombatExchange(action,ability,targets){
 const left=racialCooldownLeft(ability);if(left){status(ability.name+" is cooling down for "+left+" more actions. No action spent.");return null}
 const resolution=classAbilityExchange(action,{...ability,cost:0,stat:ability.stat||"DEX"},targets);
 if(resolution)campaign.racialCooldowns={...(campaign.racialCooldowns||{}),[ability.id]:(Number(campaign.actionSerial)||0)+ability.cooldown+1};
 return resolution;
}
function useRacialAbility(action){
 const hero=window.soaCharacters?.profile?.(),ability=window.soaRacialAbilities?.get?.(action.ability,hero?.race);
 if(!ability){status("That racial ability is unavailable to this character.");return null}
 const left=racialCooldownLeft(ability);if(left){status(ability.name+" is cooling down for "+left+" more actions. No action spent.");return null}
 if(ability.mode==="focus"){
  campaign.racialFocus={skill:ability.skill,bonus:ability.bonus,source:ability.id};
  campaign.racialCooldowns={...(campaign.racialCooldowns||{}),[ability.id]:(Number(campaign.actionSerial)||0)+ability.cooldown+1};
  s.en=Math.min(100,s.en+10);s.time++;
  return "Success: "+(hero?.name||"Your hero")+" uses "+ability.name+". The next "+ability.skill+" check gains +"+ability.bonus+" percentage points. "+resourceName()+" recovers by up to 10. No resource cost.";
 }
 if(ability.mode==="combat"&&livingEnemies().length)return fightExchange(action);
 if(ability.id==="cannibalize"){
  if(!hasRecentCorpse()){status("Cannibalize requires a nearby defeated humanoid. No action spent.");return null}
  if(s.hp>=heroHealthCap()){status("Your health is already full. No action spent.");return null}
  const actor=window.soaAbilities?.get?.("hero"),heal=window.soaCombatRules.roll(ability.die)+(ability.flat||0)+(actor?.modifiers?.CON||0),before=s.hp;
  s.hp=Math.min(heroHealthCap(),s.hp+heal);s.en=Math.min(100,s.en+10);s.time++;
  campaign.racialCooldowns={...(campaign.racialCooldowns||{}),[ability.id]:(Number(campaign.actionSerial)||0)+ability.cooldown+1};
  return "Success: "+(hero?.name||"Your hero")+" uses Cannibalize on a defeated humanoid, restoring "+(s.hp-before)+" HP. "+resourceName()+" recovers by up to 10.";
 }
 status(ability.name+" can only be used during combat. No action spent.");return null;
}
function drawRacialActions(box){
 const hero=window.soaCharacters?.profile?.(),abilities=window.soaRacialAbilities?.list?.(hero?.race)||[];
 const usable=abilities.filter(a=>a.mode==="focus"||(a.id==="cannibalize"&&!livingEnemies().length&&hasRecentCorpse()));
 if(!usable.length)return;
 const section=document.createElement("section");section.className="soa-racial-action-panel";const title=document.createElement("strong");title.textContent="Racial abilities";section.append(title);
 for(const ability of usable){const button=document.createElement("button");button.type="button";button.className="soa-ability-button";const left=racialCooldownLeft(ability);button.textContent=ability.name+" · "+(left?"Cooldown "+left:"Ready");button.title=ability.description;button.disabled=busy||!!pending()||!!left||(ability.id==="cannibalize"&&s.hp>=heroHealthCap());button.onclick=()=>choose({text:(hero?.name||"Your hero")+" uses "+ability.name,type:"racial",difficulty:"medium",ability:ability.id});section.append(button)}
 box.append(section);
}
function drawEnemyStatus(box){
 const enemies=livingEnemies(),activeContext=enemies.length||(campaign?.combatAllies||[]).length||campaign?.scene?.choices?.some(x=>x.type==="combat");
 const exchange=activeContext?campaign?.lastExchange:null;
 if(!activeContext)return;
 const section=document.createElement("section");section.className="soa-enemy-status";
 const heading=document.createElement("h4");heading.textContent="Combat · Round "+(exchange?.round||campaign?.combatRound||1);section.append(heading);
 if(!enemies.length){const hint=document.createElement("p");hint.className="soa-combat-hint";hint.textContent=exchange?.defeated?"The last opponent has been defeated.":"No enemy HP has been confirmed for this scene yet. The story will reveal enemy health when combatants are identified.";section.append(hint)}
 for(const enemy of enemies){
  const item=document.createElement("button");item.type="button";item.className="soa-foe soa-foe-target";item.setAttribute("aria-pressed",String(selectedCombatTarget===enemy.name));item.setAttribute("aria-label",enemy.name+" · "+enemy.hp+" / "+enemy.maxHp+" HP · select target");item.disabled=busy||!!pending();item.onclick=()=>{selectedCombatTarget=enemy.name;draw()};
  const header=document.createElement("div");header.className="soa-foe-heading";
  const name=document.createElement("strong");name.textContent=enemy.name;
  const hp=document.createElement("span");hp.textContent=enemy.hp+" / "+enemy.maxHp+" HP";
  header.append(name,hp);
  const rail=document.createElement("div");rail.className="soa-foe-track";rail.setAttribute("role","progressbar");
  rail.setAttribute("aria-label",enemy.name+" health");rail.setAttribute("aria-valuemin","0");rail.setAttribute("aria-valuemax",String(enemy.maxHp));rail.setAttribute("aria-valuenow",String(enemy.hp));
  const fill=document.createElement("div");fill.className="soa-foe-fill";fill.style.width=Math.max(0,Math.min(100,enemy.hp/enemy.maxHp*100))+"%";rail.append(fill);item.append(header,rail);
  const block=window.soaCombatRules?.statBlock?.(enemy),enemyClass=enemy.className||null;
  const stats=document.createElement("p");stats.className="soa-foe-stats";stats.textContent="Armor Class "+(block?.ac??"unknown")+(enemyClass?" · "+enemyClass:" · "+(block?.type||"hostile"));item.append(stats);
  const resource=enemyClass?window.soaResources?.forClass?.(enemyClass,enemy.form):null;
  if(resource&&Number.isFinite(enemy.resource)&&Number.isFinite(enemy.maxResource)&&enemy.maxResource>0){
   const current=Math.max(0,Math.min(enemy.maxResource,enemy.resource)),meter=document.createElement("div");meter.className="soa-foe-resource";
   const label=document.createElement("div");label.className="soa-foe-resource-heading";
   const resourceName=document.createElement("strong");resourceName.textContent=resource.label;
   const resourceValue=document.createElement("span");resourceValue.textContent=current+" / "+enemy.maxResource;
   label.append(resourceName,resourceValue);
   const resourceRail=document.createElement("div");resourceRail.className="soa-combat-resource-rail soa-foe-resource-rail";resourceRail.dataset.resource=resource.key;resourceRail.setAttribute("role","progressbar");resourceRail.setAttribute("aria-label",enemy.name+" "+resource.label);resourceRail.setAttribute("aria-valuemin","0");resourceRail.setAttribute("aria-valuemax",String(enemy.maxResource));resourceRail.setAttribute("aria-valuenow",String(current));
   const resourceFill=document.createElement("div");resourceFill.className="soa-combat-resource-fill";resourceFill.style.width=Math.max(0,Math.min(100,current/enemy.maxResource*100))+"%";resourceRail.append(resourceFill);meter.append(label,resourceRail);item.append(meter);
  }
  section.append(item);
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
  const dealt=document.createElement("p");dealt.textContent=exchange.healed?"Used "+String(exchange.ability||"ability").replaceAll("_"," ")+" · restored "+exchange.healed+" HP.":exchange.ability==="evasion"||["shield_block","divine_protection","power_word_shield","blink","sprint","vanish"].includes(exchange.ability)?"Used "+String(exchange.ability).replaceAll("_"," ")+" · incoming attack disadvantaged.":exchange.hit?"Hit · "+exchange.dealt+" damage to "+exchange.target+" ("+exchange.enemyBefore+" → "+exchange.enemyAfter+"/"+exchange.enemyMax+" HP).":"Miss · 0 damage to "+exchange.target+".";
  const taken=document.createElement("p");taken.textContent="Damage received · "+(exchange.recipient||"you")+" "+exchange.taken+" HP ("+(exchange.recipientBefore??exchange.heroBefore)+" → "+(exchange.recipientAfter??exchange.heroAfter)+" HP).";
  summary.append(title,dealt,taken);
  const details=document.createElement("details");details.className="soa-exchange-details";
  const detailsLabel=document.createElement("summary");detailsLabel.textContent="Roll & event details";details.append(detailsLabel);
  if(Number.isInteger(exchange.attackRoll)){const roll=document.createElement("p");roll.textContent="Attack roll: d20 "+exchange.attackRoll+" + modifier = "+exchange.attackTotal+" vs AC "+exchange.targetAC+(exchange.critical?" · Critical hit":"");details.append(roll)}
  if(Number.isInteger(exchange.initiative)){const init=document.createElement("p");init.textContent="Initiative: Hero "+exchange.initiative+" · Foe "+exchange.enemyInitiative+" · "+exchange.enemyType+" · "+exchange.damageType+" damage";details.append(init)}
  if(Number.isInteger(exchange.enemyRoll)){const defense=document.createElement("p");defense.textContent="Enemy attack: d20 "+exchange.enemyRoll+" = "+exchange.enemyTotal+" vs defender AC "+exchange.defenderAC;details.append(defense)}
  if(exchange.defeated){const note=document.createElement("p");note.textContent=exchange.target+" defeated; loot is collected through a separate search action.";details.append(note)}
  summary.append(details);section.append(summary);
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
  if(ally.player){
   const resource=window.soaResources?.forClass?.(ally.className,ally.form);
   if(resource){
    const current=Math.max(0,Math.min(100,Number(ally.resource)||0));
    const maximum=Math.max(1,Number(ally.maxResource)||100);
    const meter=document.createElement("div");meter.className="soa-combat-resource";
    const label=document.createElement("div");label.className="soa-combat-resource-heading";
    const labelName=document.createElement("strong");labelName.textContent=resource.label;
    const value=document.createElement("span");value.textContent=current+" / "+maximum;
    label.append(labelName,value);
    const rail=document.createElement("div");rail.className="soa-combat-resource-rail";rail.dataset.resource=resource.key;rail.setAttribute("role","progressbar");rail.setAttribute("aria-label",ally.name+" "+resource.label);rail.setAttribute("aria-valuemin","0");rail.setAttribute("aria-valuemax",String(maximum));rail.setAttribute("aria-valuenow",String(current));
    const fill=document.createElement("div");fill.className="soa-combat-resource-fill";fill.style.width=Math.max(0,Math.min(100,current/maximum*100))+"%";rail.append(fill);meter.append(label,rail);item.append(meter);
   }
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
  const info=document.createElement("p");info.className="soa-combat-hint";info.textContent="Selecting an ally drafts a support action. It never heals or spends a turn by itself; health changes require a confirmed action.";
  const assist=document.createElement("button");assist.type="button";assist.className="soa-assist-button";
  assist.textContent="Coordinate with selected ally · 1 action";
  assist.disabled=busy||!!pending()||!combatParty().some(a=>!a.player&&a.name===selectedAllyTarget);
  assist.onclick=()=>{const target=combatParty().find(a=>!a.player&&a.name===selectedAllyTarget);if(!target)return;
   choose({text:"Coordinate defensively with "+target.name+" to assist their next move without inventing healing, supplies, damage or extra turns.",type:"investigate",difficulty:"medium"});
  };
  const allyDetails=document.createElement("details");allyDetails.className="soa-combat-optional soa-ally-coordination";
  const allySummary=document.createElement("summary");allySummary.textContent="Coordinate an ally";
  allyDetails.append(allySummary,allyTargets,info,assist);section.append(allyDetails);
 }
 if(enemies.length){
  const support=document.createElement("details");support.className="soa-combat-optional soa-companion-combat-actions";
  const heading=document.createElement("summary");heading.textContent="Companion actions · one exchange each";support.append(heading);
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
  if(support.children.length>1)section.append(support);
  if(campaign.lastSupport){const note=document.createElement("p");note.className="soa-combat-hint";note.textContent="Support round "+campaign.lastSupport.round+": "+campaign.lastSupport.description+" "+campaign.lastSupport.retaliation;support.append(note)}
 }
 const skills=document.createElement("div");skills.className="soa-combat-abilities";
 const abilitiesLabel=document.createElement("strong");abilitiesLabel.className="soa-class-combat-heading";abilitiesLabel.textContent="Actions · Level "+(window.soaProgression?.level?.()||1);skills.append(abilitiesLabel);const currentTarget=document.createElement("p");currentTarget.className="soa-combat-current-target";currentTarget.textContent="Target · "+(enemies.find(e=>e.name===selectedCombatTarget)?.name||enemies[0]?.name||"none selected");skills.append(currentTarget);
 const available=[{id:"strike",name:"Weapon Strike",cost:15,effect:"damage",description:"A standard weapon attack."},...(window.soaClassAbilities?.available?.(window.soaCharacters?.profile?.()?.className,window.soaProgression?.level?.()||1)||[])];
 for(const ability of available){
  const {id,name,cost,effect}=ability;
  const button=document.createElement("button");button.type="button";button.className="soa-ability-button";
  button.classList.add("soa-class-combat-button");button.textContent=name+" · "+(cost?cost+" "+resourceName():"No cost");button.title=ability.description||name;
  const needsTarget=!(["guard","heal"].includes(effect));
  button.disabled=busy||!!pending()||s.en<cost||(effect==="riposte"&&!campaign.parryReady)||(needsTarget&&!enemies.some(e=>e.name===selectedCombatTarget)&&enemies.length>1);
  button.onclick=()=>{const target=enemies.find(e=>e.name===selectedCombatTarget)||enemies[0];if(!target)return;
   choose({text:(window.soaCharacters?.profile?.()?.name||"Hero")+" uses "+name+(needsTarget?" against "+target.name:""),type:"combat",difficulty:"medium",ability:id});
  };
  skills.append(button);
 }
 const racialCombat=(window.soaRacialAbilities?.list?.(window.soaCharacters?.profile?.()?.race)||[]).filter(a=>a.mode==="combat");
 for(const ability of racialCombat){const button=document.createElement("button");button.type="button";button.className="soa-ability-button soa-racial-combat-button";const left=racialCooldownLeft(ability);button.textContent=ability.name+" · No resource cost"+(left?" · cooldown "+left:" · Ready");button.title=ability.description;button.disabled=busy||!!pending()||!!left||s.hp>=heroHealthCap()&&ability.effect==="heal"||ability.requiresCorpse&&!hasRecentCorpse();button.onclick=()=>choose({text:(window.soaCharacters?.profile?.()?.name||"Hero")+" uses "+ability.name+" against "+(targets[0]?.name||"the nearby foe"),type:"combat",difficulty:"medium",ability:ability.id});skills.append(button)}
 if(enemies.length)section.append(skills);
 if(Array.isArray(campaign.combatLog)&&campaign.combatLog.length){
  const history=document.createElement("details");history.className="soa-battle-history";const head=document.createElement("summary");head.textContent="Damage log · "+campaign.combatLog.length+" exchanges";history.append(head);
  for(const entry of campaign.combatLog.slice(-5).reverse()){const line=document.createElement("p");line.textContent="Round "+entry.round+": "+entry.events.map(e=>e.name+" "+(e.delta<0?e.delta+" HP":"no damage")+" ("+e.after+"/"+e.maxHp+")").join(" · ");history.append(line)}section.append(history);
 }
 box.append(section);
}
function result(action){
 if(action.type==="racial")return useRacialAbility(action);
 if(action.type==="combat"&&livingEnemies().length)return fightExchange(action);
 const skill=socialSkill(action);if(skill)return socialCheck(action,skill);
 const {cost,target,skill:t}=actionOdds(action);let damage=0;
 if(campaign.racialFocus?.skill===t)campaign.racialFocus=null;
 if(s.en<cost)return null;
 const rolled=1+Math.floor(Math.random()*100),ok=rolled<=target;
 s.en=Math.min(100,s.en-cost+10);s.time++; if(!ok&&["stealth","engineering","combat"].includes(t)){s.alert=Math.min(3,s.alert+1);damage=t==="combat"?8:t==="stealth"?3:0;s.hp=Math.max(1,s.hp-damage)}
 if(ok&&t==="rest")s.hp=Math.min(heroHealthCap(),s.hp+4);
 // Defeating an opponent does not itself loot them: currency changes require explicit search/loot actions.
 const msg=ok?"Success":"Complication";
 let effect=t==="combat"?(ok?"The immediate opponent is overcome in a single abstract skirmish.":"The opponent remains a threat; Snacky takes "+damage+" damage."):t==="stealth"?(ok?"Snacky remains concealed.":"A noise attracts nearby attention."):t==="engineering"?(ok?"Pippa's mechanism works as intended.":"The apparatus sparks and raises suspicion."):t==="social"?(ok?"The approach is received favorably.":"The target refuses to cooperate."):t==="rest"?(ok?"The party regains composure.":"The party cannot safely rest."):ok?"The action achieves its immediate intent.":"The action encounters resistance.";
 return msg+": d100 roll "+rolled+" vs target "+target+" ("+(ok?"success":"failure")+"). "+effect+" Result is authoritative; do not invent additional mechanical effects.";
}
function interfaceUI(){
 if(get("campaign-box"))return;
 const el=document.createElement("section");el.className="panel";el.id="campaign-box";
 const disclosure=document.createElement("details");disclosure.className="soa-panel-disclosure soa-campaign-disclosure";
 disclosure.open=localGet("soa-campaign-panel-open")==="1";
 disclosure.ontoggle=()=>{if(!localSet("soa-campaign-panel-open",disclosure.open?"1":"0"))window.soaReportStorageFailure?.("Campaign panel preference could not be saved; game progress is unchanged.")};
 const summary=document.createElement("summary");summary.innerHTML='Living Campaign <span class="tag">Gemini · Online</span>';
 const content=document.createElement("div");content.className="soa-panel-disclosure-content";
 const toggleLabel=document.createElement("label");toggleLabel.className="ai-toggle";toggleLabel.htmlFor="campaign-mode";
 const toggle=document.createElement("input");toggle.type="checkbox";toggle.id="campaign-mode";toggleLabel.append(toggle,document.createTextNode(" Enable living campaign"));
 const start=document.createElement("button");start.id="campaign-start";start.textContent="Start / Resume AI campaign";
 const offline=document.createElement("button");offline.id="campaign-offline";offline.className="sub";offline.textContent="Return to offline adventure";
 const campaignStatus=document.createElement("div");campaignStatus.id="campaign-status";campaignStatus.className="muted";campaignStatus.setAttribute("aria-live","polite");
 const scene=document.createElement("div");scene.id="campaign-scene";
 content.append(toggleLabel,start,offline,campaignStatus,scene);disclosure.append(summary,content);el.append(disclosure);
 document.querySelector("header").after(el);
 get("campaign-mode").onchange=e=>{if(e.target.checked){if(campaignLoadBlocked||campaignStorageReadFailed){e.target.checked=false;status("");return}if(!campaign)campaign=make();if(!store()){e.target.checked=false;enabled=false;return}enabled=true;if(!localSet("soa-campaign-enabled","1"))window.soaReportStorageFailure?.("Campaign mode preference could not be saved.");draw();if(navigator.onLine&&(!campaign.scene||pending()))advance(campaign.lastAction,campaign.lastResult,true)}else{enabled=false;if(!localSet("soa-campaign-enabled","0"))window.soaReportStorageFailure?.("Campaign mode preference could not be saved.");document.body.classList.remove("soa-living-mode");get("campaign-scene").replaceChildren();showOriginal(true)}};
 get("campaign-start").onclick=()=>{if(campaignLoadBlocked||campaignStorageReadFailed){status("");return}if(!campaign)campaign=make();if(!store())return;enabled=true;get("campaign-mode").checked=true;if(!localSet("soa-campaign-enabled","1"))window.soaReportStorageFailure?.("Campaign mode preference could not be saved.");draw();if(!accessCode()){focusAccess();return}if(pending()||!campaign.scene)advance(campaign.lastAction,campaign.lastResult,true);else{status("Saved scene ready. Choose your next action below.");refreshDisplay()}};
 get("campaign-offline").onclick=()=>{enabled=false;document.body.classList.remove("soa-living-mode");get("campaign-mode").checked=false;if(!localSet("soa-campaign-enabled","0"))window.soaReportStorageFailure?.("Campaign mode preference could not be saved.");showOriginal(true);get("campaign-status").textContent="Offline scripted adventure enabled."};
}
function showOriginal(show){if(window.soaCharacters?.isNewCharacter?.())show=false;for(const el of document.querySelectorAll("main > section.panel")){if(el.id==="campaign-box")continue;const isStory=!!el.querySelector("#choices");if(isStory)el.style.display=show?"":"none"}}
function reconcileAuthorizedMissionReward(){
 if(!campaign||window.soaCharacters?.profile?.()?.id!=="snacky")return;
 const q=window.soaQuests?.ensure?.(campaign);
 if(!q||q.claimed?.["mission:stormwind-explosives-defused:v1"])return;
 // Require the player to confirm every Stormwind quest objective before the
 // one-time mission payment is credited. A scene render alone is not proof.
 const stormwindComplete=campaign.chronicle?.quests?.some(quest=>
  quest?.id==="stormwind"&&quest.status==="completed"&&Array.isArray(quest.objectives)&&
  quest.objectives.length>0&&quest.objectives.every(objective=>objective?.done===true)
 );
 if(!stormwindComplete)return;
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
 if(!enabled||!campaign)return;document.body.classList.add("soa-living-mode");showOriginal(false);
 const box=get("campaign-scene");box.replaceChildren();
 if(campaignSaveFailed){const retrySave=document.createElement("button");retrySave.type="button";retrySave.className="med";retrySave.textContent="Retry saving campaign";retrySave.onclick=()=>{if(!store())return;status("Campaign saved. You can safely continue.");if(pending())advance(campaign.lastAction,campaign.lastResult,true);else if(!campaign.scene&&navigator.onLine)advance(campaign.lastAction,campaign.lastResult,true);else refreshDisplay()};box.append(retrySave)}
 if(!campaign.scene){status(statusMessage||"Ready to generate the next scene.");return}
 const sc=campaign.scene,head=document.createElement("h3"),where=document.createElement("div"),text=document.createElement("p");
 reconcileAuthorizedMissionReward();
 const questPanel=window.soaQuests?.panel?.(campaign,sc.location,()=>s.money,(result)=>{if(result?.error){status(result.error);return}if(Number.isSafeInteger(result?.wallet)){s.money=result.wallet;save()}store();render();draw();status(result?.description||result?.message||"Contract updated.");}) || null;
 const transition=window.soaChronicle?.banner?.(campaign);if(transition)box.append(transition);
 const kicker=document.createElement("div");kicker.className="soa-scene-kicker";const position=window.soaChronicle?.progress?.(campaign);kicker.textContent=position?"ACT "+position.actRoman+" · CHAPTER "+position.chapterRoman+" · SCENE "+position.scene:"FIELD CHRONICLE · SCENE "+campaign.turn;box.append(kicker);head.textContent=sc.title||"The Hollow Raven";where.className="muted";where.textContent=sc.location||"Raven Hill";text.className="soa-story-prose";text.style.whiteSpace="pre-line";text.textContent=readableStory(sc.story);box.append(head,where,text);
 const sceneReward=window.soaQuests?.rewardForScene?.(campaign);
 if(sceneReward?.receipt==="mission:stormwind-explosives-defused:v1"){const receipt=document.createElement("p");receipt.className="soa-level-toast";receipt.textContent="MISSION PAID · Stormwind explosives defused · Total party reward: +5g 00s 00c · Credited to shared wallet once.";box.append(receipt)}
 const missions=window.soaQuests?.missionPanel?.(campaign,sc.location,()=>s.money,(result)=>{if(result?.error){status(result.error);return}if(Number.isSafeInteger(result?.wallet)){s.money=result.wallet;save()}store();render();draw();status(result?.description||result?.message||"Mission updated.");});
 let board=get("soa-contract-board");
 if(questPanel||missions){
  if(!board){
   board=document.createElement("section");board.id="soa-contract-board";board.className="panel";
   const chronicle=get("soa-chronicle"),main=document.querySelector("main");
   if(chronicle)chronicle.before(board);else if(main)main.append(board);
  }
  board.replaceChildren();
  const questHeading=document.createElement("h2");questHeading.textContent="Quests & Rewards";board.append(questHeading);
  if(questPanel)board.append(questPanel);
  if(missions)board.append(missions);
 }else board?.remove();
 window.soaEquipment?.renderStatus?.();
 const gear=window.soaEquipment?.panel?.();
 const enchanting=window.soaEnchanting?.panel?.(campaign,sc.location,()=>s.money,(result)=>{if(Number.isSafeInteger(result?.wallet)){s.money=result.wallet;save()}store();render();draw();status(result?.message||"Enchanting updated.")});
 let toolsPanel=get("soa-character-tools");
 if(gear||enchanting){
  if(!toolsPanel){toolsPanel=document.createElement("section");toolsPanel.id="soa-character-tools";toolsPanel.className="panel"}
  toolsPanel.replaceChildren();const toolsHeading=document.createElement("h2");toolsHeading.textContent="Loadout & Equipment";toolsPanel.append(toolsHeading);
  if(gear)toolsPanel.append(gear);if(enchanting)toolsPanel.append(enchanting);
  const characterScreen=get("soa-character-screen"),main=document.querySelector("main");
  if(characterScreen)characterScreen.after(toolsPanel);else if(main)main.append(toolsPanel);
 }else toolsPanel?.remove();
 window.soaLayout?.refresh?.();
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

 drawEnemyStatus(box);
 drawRacialActions(box);
 if(campaign?.chronicle?.pendingMilestone){
  const notice=document.createElement("button");notice.type="button";notice.className="soa-chapter-review";
  notice.textContent="✦ A chapter milestone is ready for your review · Open Journal";
  notice.onclick=()=>get("soa-chronicle")?.scrollIntoView({behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"auto":"smooth",block:"start"});
  box.append(notice);
 }
 const reserve=document.createElement("section");reserve.className="soa-choice-resource";reserve.dataset.resource=resourceKey();reserve.setAttribute("aria-label","Current "+resourceName());const reserveHeading=document.createElement("div");reserveHeading.className="soa-choice-resource-heading";const reserveLabel=document.createElement("strong");reserveLabel.textContent="CURRENT "+resourceName().toUpperCase();const reserveValue=document.createElement("span");const reserveCurrent=Math.max(0,Math.min(100,Number(s.en)||0));reserveValue.textContent=reserveCurrent+" / 100";reserveHeading.append(reserveLabel,reserveValue);const reserveTrack=document.createElement("div");reserveTrack.className="soa-choice-resource-track";reserveTrack.dataset.resource=resourceKey();reserveTrack.setAttribute("role","progressbar");reserveTrack.setAttribute("aria-label",resourceName()+" reserve");reserveTrack.setAttribute("aria-valuemin","0");reserveTrack.setAttribute("aria-valuemax","100");reserveTrack.setAttribute("aria-valuenow",String(reserveCurrent));const reserveFill=document.createElement("div");reserveFill.className="soa-choice-resource-fill";reserveFill.style.width=reserveCurrent+"%";reserveTrack.append(reserveFill);const reserveHint=document.createElement("small");reserveHint.textContent="Combat restores +25 "+resourceName()+" after each completed exchange; other actions restore +10. Costs below show your projected balance.";reserve.append(reserveHeading,reserveTrack,reserveHint);box.append(reserve);
 const choicesHeader=document.createElement("div");choicesHeader.className="soa-choices-heading";
 const title=document.createElement("strong");title.textContent="Choose your next move";
 const count=document.createElement("span");count.textContent=sc.choices.length+" paths + resources + custom";
 choicesHeader.append(title,count);box.append(choicesHeader);
 for(const [index,choice] of sc.choices.entries()){const b=document.createElement("button");b.className=choice.difficulty==="easy"?"low":choice.difficulty==="hard"?"high":"med";const headline=document.createElement("strong"),detail=document.createElement("small");headline.textContent=String.fromCharCode(65+index)+") "+choice.text;headline.style.display="block";const preview=dicePreview(choice);
 detail.textContent=(choice.difficulty||"medium")+" difficulty · "+(socialSkill(choice)||choice.type||"investigate");
 const rollLine=document.createElement("span");rollLine.className="soa-roll-preview";rollLine.textContent=preview.primary;
 const rollHint=document.createElement("span");rollHint.className="soa-roll-hint";rollHint.textContent=preview.secondary;const transaction=document.createElement("span");transaction.className="soa-choice-resource-transaction";transaction.textContent=resourceForecast(choice).text;detail.style.cssText="display:block;margin-top:5px;color:#bccbd6;font:12px system-ui;text-transform:capitalize";b.append(headline,detail,rollLine,rollHint,transaction);b.disabled=busy||!!pending();b.onclick=()=>choose(choice);box.append(b)}
 const surveyIndex=sc.choices.length;
 const survey=document.createElement("button");
 survey.type="button";survey.className="low soa-resource-survey";
 const surveyTitle=document.createElement("strong"),surveyHint=document.createElement("small");
 surveyTitle.textContent=String.fromCharCode(65+surveyIndex)+") Survey surrounding resources";
 surveyTitle.style.display="block";
 surveyHint.textContent="Look for ore, herbs, water and other natural materials · Investigate";
 surveyHint.style.cssText="display:block;margin-top:5px;color:#d6dfd2;font:12px system-ui";
 const surveyRoll=document.createElement("span");surveyRoll.className="soa-roll-preview";surveyRoll.textContent=dicePreview({type:"investigate",difficulty:"medium"}).primary;const surveyResource=document.createElement("span");surveyResource.className="soa-choice-resource-transaction";surveyResource.textContent=resourceForecast({type:"investigate",difficulty:"medium"}).text;
 survey.append(surveyTitle,surveyHint,surveyRoll,surveyResource);
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
 const customRoll=document.createElement("p");customRoll.className="soa-custom-roll-preview";customRoll.setAttribute("aria-live","polite");const customResource=document.createElement("p");customResource.className="soa-choice-resource-transaction soa-custom-resource-transaction";
 function updateCustomRoll(){const action={text:input.value,type:type.value,difficulty:"medium",socialSkill:skillSelect.value==="auto"?undefined:skillSelect.value};
 const preview=dicePreview(action);customRoll.textContent=preview.primary+" · "+preview.secondary;customResource.textContent=resourceForecast(action).text}
 input.addEventListener("input",updateCustomRoll);type.addEventListener("change",updateCustomRoll);skillSelect.addEventListener("change",updateCustomRoll);
 updateCustomRoll();
 help.id="campaign-custom-help";help.className="muted";help.textContent="Bluff, Bribe, Romance and Threaten use d20 + skill against difficulty DC. Bribes require an explicit amount (e.g. offer 50 silver); coins are paid only when accepted. A successful romance check never overrides consent. Other custom actions use their selected type.";;;input.setAttribute("aria-describedby",help.id);
 submit.type="submit";submit.textContent="Take custom action";submit.disabled=busy||!!pending()||!navigator.onLine||!customDraft.trim();
 form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text||busy||pending())return;choose({text,type:type.value,difficulty:"medium",custom:true,socialSkill:skillSelect.value==="auto"?undefined:skillSelect.value})};form.append(label,input,typeLabel,type,skillLabel,skillSelect,customRoll,customResource,help,submit);box.append(form);
 const foot=document.createElement("p");foot.className="muted";foot.className="muted soa-scene-footer";foot.textContent="Scene "+campaign.turn+" · Saved on this device · "+(navigator.onLine?"Online":"Offline reading");box.append(foot)
}
async function choose(choice){
 if(busy||pending())return;
 if(window.soaSaveRules.isIntegrityBlocked()){status("Saved data could not be read. Restore a valid backup before continuing.");return}
 if(campaignLoadBlocked||campaignStorageReadFailed){status("");return}
 if(campaignSaveFailed&&!store()){draw();return}
 if(!navigator.onLine){status("Offline: your saved scene is available. Reconnect to generate another.");return}
 if(!accessCode()){focusAccess();return}
 const detected=dialogueFromCustom(choice);if((detected||socialSkill(choice))&&choice.custom&&choice.type==="investigate")choice={...choice,type:"social"};
 const resolution=result(choice);
 if(!resolution){if(!socialSkill(choice)&&choice.type!=="combat")status("Not enough "+resourceName()+" for that action.");return}
 campaign.lastProgression="";
 campaign.actionSerial=(Number(campaign.actionSerial)||0)+1;
 const actionReceipt="turn-"+campaign.turn+"-action-"+campaign.actionSerial;
 recordActionPractice(choice,resolution,actionReceipt);
 campaign.lastAction=safe(choice.text);campaign.lastResult=resolution;
 campaign.pending={action:campaign.lastAction,resolution,startedAt:Date.now(),dialogue:detected,survey:choice.survey===true,combat:choice.type==="combat",actionReceipt};
 campaign.history.push("At "+safe(campaign.scene?.location||"unknown location")+": Player: "+campaign.lastAction+" | "+resolution);
 campaign.history=campaign.history.slice(-MAX);const saved=store();refreshDisplay();if(!saved)return;
 // Release the iPhone keyboard and return to the story while Gemini works.
 if(choice.custom&&document.activeElement?.blur)document.activeElement.blur();
 returnToAdventure("status");
 await advance(campaign.lastAction,resolution,false);
}
async function advance(action,resolution,retry){
 if(window.soaSaveRules.isIntegrityBlocked()){status("Saved data could not be read. Restore a valid backup before continuing.");return}
 if(busy)return;if(!navigator.onLine){get("campaign-status").textContent="Offline: saved scene available; new scenes require internet.";draw();return}
 const code=accessCode();
 if(!code){focusAccess();draw();return}
 busy=true;status("Gemini is writing the next scene…");draw();
 let requestTimeout;
 try{
 const controller=new AbortController();requestTimeout=setTimeout(()=>controller.abort(),28000);
 const response=await fetch("./api/campaign",{method:"POST",headers:{"content-type":"application/json","x-story-access":code},signal:controller.signal,body:JSON.stringify({context:{location:campaign.scene?.location||(window.soaCharacters?.isNewCharacter?.()?(window.soaCharacters?.profile?.()?.startingZone||"New adventurer starting zone"):"Hollow Raven laboratory"),previousTitle:campaign.scene?.title||"",previousScene:campaign.scene?.story||"",campaignOrigin:originOfCampaign(),startingZone:window.soaCharacters?.profile?.()?.startingZone||null,recentDiscoveries:campaign.journal.slice(-12),action,resolution,hp:s.hp,energy:s.en,resourceLabel:resourceName(),gold:fmtMoney(s.money),alarm:s.alert,turn:campaign.turn,history:campaign.history.slice(-20),flags:Object.keys(s.flags||{}),companionMoments:window.soaCompanions?.getRecent?.()||[],companionProfiles:window.soaCompanions?.getProfiles?.()||{},relationships:window.soaCompanions?.getRelationships?.()||{},conversationContext:window.soaCompanions?.getConversationContext?.()||{},character:window.soaCharacters?.profile?.()||null,abilityScores:window.soaAbilities?.get?.("hero")?.stats||null,reputation:window.soaReputation?.getStandings?.()||{},reputationDevelopments:window.soaReputation?.getDevelopments?.()||[],enemies:livingEnemies().map(e=>({name:e.name,hp:e.hp,maxHp:e.maxHp})),allies:combatParty().map(e=>({name:e.name,hp:e.hp,maxHp:e.maxHp})),questRewards:{last:campaign.quests?.lastReward||null,activeMissions:Object.entries(campaign.quests?.missions||{}).filter(([,v])=>v.state!=="claimed").map(([id,v])=>({id,state:v.state}))},combatLog:(campaign.combatLog||[]).slice(-3),lastExchange:campaign.lastExchange||null,chronicle:window.soaChronicle?.context?.(campaign)||null,resourceSurvey:campaign.pending?.survey===true}})});
 const data=await response.json().catch(()=>({error:"Invalid server response"}));if(window.soaSaveRules.isIntegrityBlocked()){status("Saved data could not be read. The pending scene was not applied; restore a valid backup before continuing.");return}if(!response.ok){if(response.status===401||response.status===403||response.status>=500)window.soaAiDirector?.showSetup?.(data.error||"AI connection needs attention.");throw Error(data.error||"Request failed")};
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
 }catch(e){if(e.name==="AbortError"||e instanceof TypeError)window.soaAiDirector?.showSetup?.("AI connection needs attention. Your selection is saved and can be retried.");campaign.lastError=e.name==="AbortError"?"Story request timed out":"AI request failed";store();status(e.name==="AbortError"?"The story request timed out. Your selection is saved; tap Retry generating next scene. It will not spend "+resourceName()+" twice.":"AI unavailable: "+e.message+". Your last action is preserved. Tap Retry generating next scene; it will not spend "+resourceName()+" twice.")}finally{clearTimeout(requestTimeout);busy=false;refreshDisplay();returnToAdventure(campaign?.lastError?"status":"scene")}
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
const savedCampaign=localGet(KEY);if(campaignStorageReadFailed)campaignSaveFailed=true;
if(savedCampaign!==null){try{campaign=normalizeCampaignState(JSON.parse(savedCampaign));if(!campaign)campaignLoadBlocked=true}catch{campaign=null;campaignLoadBlocked=true;window.soaSaveRules.reportCorruption(KEY)}}
migrateCompanionDisplayNames();
enabled=localGet("soa-campaign-enabled")==="1"&&!campaignLoadBlocked&&!campaignStorageReadFailed;let campaignReady=true;if(campaign){window.soaChronicle?.attach?.(campaign);campaignReady=store();window.soaChronicle?.render?.(campaign)}window.soaChronicleSetSave?.(store);interfaceUI();get("campaign-mode").checked=enabled;
if(campaignLoadBlocked||campaignStorageReadFailed){status("")}else if(enabled){if(!campaign){campaign=make();campaignReady=store()}draw();if(campaignReady&&!campaign.scene&&navigator.onLine)advance(campaign.lastAction,campaign.lastResult,true)}
window.soaLivingCampaign={getState:()=>campaign,enabled:()=>enabled,persist:store,refreshUI:()=>{draw();window.soaCharacters?.refreshProfessions?.()}};})();
