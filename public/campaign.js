(()=>{"use strict";
const KEY="soa-campaign-v1", MAX=24, COMBAT_RESOURCE_RECOVERY=25, ACTION_RESOURCE_RECOVERY=25;
let campaign=null,busy=false,enabled=false,customDraft="",customType="investigate",customSocialSkill="auto",statusMessage="",campaignSaveFailed=false,campaignLoadBlocked=false,campaignStorageReadFailed=false,selectedCombatTarget=null,selectedAllyTarget=null;
const get=id=>document.getElementById(id);
function localGet(key){try{return localStorage.getItem(key)}catch{campaignStorageReadFailed=true;return null}}
function localSet(key,value){try{localStorage.setItem(key,value);return true}catch{return false}}
function store(){if(campaignLoadBlocked||window.soaSaveRules.isIntegrityBlocked()){status("Saved data could not be read. Restore a valid backup before continuing.");return false}try{localStorage.setItem(KEY,JSON.stringify(campaign));campaignSaveFailed=false;return true}catch(e){campaignSaveFailed=true;status("Campaign save failed. Check device storage; your current scene is still open.");window.soaReportStorageFailure?.("Campaign save failed. Check browser storage before continuing.");return false}}
function make(){return {turn:0,combatRound:0,evasionUntil:0,scene:null,history:[],journal:[],lastError:"",lastAction:"Begin the next scene of this character’s adventure.",lastResult:"A new campaign is ready. No action has been taken yet.",pending:null}}
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
 c.combatLog=Array.isArray(c.combatLog)?c.combatLog.slice(-30).filter(row=>row&&typeof row==="object"&&Array.isArray(row.events)).map(row=>({round:Number.isSafeInteger(row.round)&&row.round>=0?row.round:0,encounterId:typeof row.encounterId==="string"?row.encounterId.slice(0,100):null,events:row.events.filter(event=>event&&typeof event.name==="string").slice(0,10).map(event=>({name:event.name.slice(0,80),side:typeof event.side==="string"?event.side.slice(0,12):"",delta:Number.isFinite(event.delta)?event.delta:0,after:Number.isFinite(event.after)?event.after:0,maxHp:Number.isFinite(event.maxHp)?event.maxHp:null}))})):[];
 c.supportCooldowns=c.supportCooldowns&&typeof c.supportCooldowns==="object"&&!Array.isArray(c.supportCooldowns)?c.supportCooldowns:{};
 c.classCooldowns=c.classCooldowns&&typeof c.classCooldowns==="object"&&!Array.isArray(c.classCooldowns)?c.classCooldowns:{};
 c.combatRound=Number.isSafeInteger(c.combatRound)&&c.combatRound>=0?c.combatRound:0;
 c.evasionUntil=Number.isSafeInteger(c.evasionUntil)&&c.evasionUntil>=0?c.evasionUntil:0;
 c.partyHealth=c.partyHealth&&typeof c.partyHealth==="object"&&!Array.isArray(c.partyHealth)?c.partyHealth:{};
 c.defeatedEnemies=Array.isArray(c.defeatedEnemies)?c.defeatedEnemies.filter(item=>typeof item==="string").slice(-80):[];
 if(c.pending&&(typeof c.pending!=="object"||Array.isArray(c.pending)||typeof c.pending.action!=="string"||typeof c.pending.resolution!=="string"))c.pending=null;
 else if(c.pending){
  const p=c.pending,tones=new Set(["betray","insult","apologize","flirt","disagree","support","honest","friendly","neutral"]),targets=new Set(["pippa","bromli","lethariel"]);
  const roundBefore=Number.isSafeInteger(p.combatRoundBefore)&&p.combatRoundBefore>=0?p.combatRoundBefore:null,roundAfter=Number.isSafeInteger(p.combatRoundAfter)&&p.combatRoundAfter>=0?p.combatRoundAfter:null;
  c.pending={action:p.action.slice(0,320),resolution:p.resolution.slice(0,700),startedAt:Number.isSafeInteger(p.startedAt)&&p.startedAt>=0?p.startedAt:0,dialogue:p.dialogue&&targets.has(p.dialogue.target)?{target:p.dialogue.target,tone:tones.has(p.dialogue.tone)?p.dialogue.tone:"neutral"}:null,survey:p.survey===true,combat:p.combat===true,combatRoundBefore:roundBefore,combatRoundAfter:roundAfter,combatExchangeResolved:p.combat===true&&roundBefore!==null&&roundAfter!==null&&roundAfter>roundBefore,actionReceipt:typeof p.actionReceipt==="string"?p.actionReceipt.slice(0,120):""};
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

function status(message,showInAdventure=false){statusMessage=message;const displayMessage=campaignLoadBlocked?"Stored Living Campaign could not be read. Restore a valid all-character backup before starting it again.":campaignStorageReadFailed?"Device storage could not be read. Reload after enabling browser storage; no new campaign was started.":campaignSaveFailed?"Campaign save failed. Retry saving before continuing. "+message:message;const el=get("campaign-status");if(el)el.textContent=displayMessage;const progress=get("campaign-progress-status"),isProgress=/^Gemini is (?:writing|still generating)/.test(displayMessage),showAdventure=isProgress||showInAdventure;if(progress){progress.hidden=!showAdventure;progress.textContent=showAdventure?displayMessage:""}}
function accessCode(){return get("ai-code")?.value.trim()||""}
function focusAccess(){const message="Enter your private AI access code in the AI Story Director panel to continue.";status(message);window.soaAiDirector?.showSetup?.(message,true);const f=get("ai-code");if(f){f.scrollIntoView({behavior:"smooth",block:"center"});f.focus()}}
function refreshDisplay(){render();draw();window.soaCharacters?.refreshProfessions?.()}
function pending(){return campaign?.pending&&typeof campaign.pending.action==="string"?campaign.pending:null}
function originOfCampaign(){
 const hero=window.soaCharacters?.profile?.();
 if(hero&&hero.id!=="snacky")return "Separate personal adventure for "+String(hero.name||"this hero").slice(0,36)+"; starts at level "+hero.level+" alone in "+String(hero.startingZone||"their race starting zone")+" with 15 silver; keep independent from other character campaigns.";
 return "Snacky Lugnuts is a male Gnome Rogue who uses he/him pronouns. Preserve his identity, established appearance, companion identities and all confirmed consequences. The saved scene and Quest Journal define his current location and objectives; this background never authorizes a quest change, relocation, or outcome.";
}

function returnToAdventure(mode="scene"){
 const destination=mode==="status"?get("campaign-progress-status")||get("campaign-status"):get("campaign-scene")?.querySelector("h3")||get("campaign-status");
 if(!destination?.scrollIntoView)return;
 const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
 destination.scrollIntoView({behavior:reduced?"instant":"smooth",block:"start"});
}
function returnToDungeons(){
 window.soaLayout?.select?.("dungeons");
 const destination=get("soa-dungeons-screen")?.querySelector?.("h2")||get("soa-dungeons-screen");
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
 const classBonus=((({Shaman:{combat:10,stealth:-25}}[window.soaCharacters?.profile?.()?.className]||{})[relevant])||0)+(window.soaDruid?.skillBonus?.(relevant)||0);
 const target=Math.max(10,Math.min(95,Math.round(base+modifier*3+trained*2+Math.max(0,level-1)*.2+difficulty-(s.alert||0)*5+racialFocus+classBonus)));
 return {cost:costs[relevant]??costs[t]??0,target,skill:relevant,modifier,trained,classBonus};
}
function heroHealthCap(){const hero=window.soaCharacters?.profile?.();return 100+(window.soaRacialAbilities?.passives?.(hero?.race)?.maxHp||0)}
function racialRegeneration(){const hero=window.soaCharacters?.profile?.();return window.soaRacialAbilities?.passives?.(hero?.race)?.regeneration||0}
function resourceName(){const hero=window.soaCharacters?.profile?.();return window.soaResources?.forClass?.(hero?.className,hero?.form)?.label||"Energy"}
function classCooldownLeft(ability){if(window.soaDruid?.current?.())return Math.max(0,(window.soaDruid.current().cooldowns?.[ability?.id]||0)-(Number(s.time)||0));const readyAt=Number(campaign?.classCooldowns?.[ability?.id])||0;return Math.max(0,readyAt-((Number(campaign?.combatRound)||0)+1),(Number(campaign?.storyCooldowns?.[ability?.id])||0)-(Number(s.time)||0))}
function resourceKey(){const hero=window.soaCharacters?.profile?.();return window.soaResources?.forClass?.(hero?.className,hero?.form)?.key||"energy"}
function resolvedCombatAbility(action){
 const hero=window.soaCharacters?.profile?.(),level=window.soaProgression?.level?.()||hero?.startLevel||1;
 if(window.soaClassAbilities?.get?.(action.ability,hero?.className,level))return action.ability;
 const normalize=value=>" "+String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()+" ";
 const description=normalize(action.text);
 const learned=window.soaClassAbilities?.available?.(hero?.className,level)||[];
 const named=learned.slice().sort((a,b)=>String(b.name||"").length-String(a.name||"").length).find(ability=>description.includes(normalize(ability.name)));
 if(named)return named.id;
 const aliases={riposte:/\briposte\b/i,evasion:/\b(?:evasion|evade)\b/i,kick:/\bkick\b/i};
 for(const [id,pattern] of Object.entries(aliases))if(pattern.test(String(action.text||""))&&window.soaClassAbilities?.get?.(id,hero?.className,level))return id;
 return ["strike","kick","evasion","riposte"].includes(action.ability)?action.ability:"strike";
}
function resolvedRacialCombatAbility(action){
 if(action?.type!=="combat")return null;
 const race=window.soaCharacters?.profile?.()?.race;
 const abilities=window.soaRacialAbilities?.list?.(race)||[];
 const selected=abilities.find(ability=>ability.mode==="combat"&&ability.id===action.ability);
 if(selected)return selected;
 const normalized=" "+String(action.text||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()+" ";
 return abilities.find(ability=>ability.mode==="combat"&&normalized.includes(" "+ability.name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()+" "))||null;
}
function unavailableClassAbility(action){
 const hero=window.soaCharacters?.profile?.(),level=window.soaProgression?.level?.()||hero?.startLevel||1;
 const all=window.soaClassAbilities?.all?.(hero?.className)||[];
 if(hero?.className==="Druid"&&window.soaDruid){const named=window.soaDruid.named(action,all);if(named&&!window.soaClassAbilities.get(named.id,"Druid",level))return {...named,level:null};}
 const locked=all.filter(ability=>ability.level>level);
 const explicit=locked.find(ability=>ability.id===action?.ability);
 if(explicit)return explicit;
 if(action?.type!=="combat")return null;
 const text=String(action.text||"");
 if(/\b(?:don't|do not|avoid|without)\b.{0,45}\b(?:cast|use)\b/i.test(text))return null;
 const normalized=" "+text.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()+" ";
 const named=locked.find(ability=>normalized.includes(" "+ability.name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()+" "));
 if(named)return named;
 // These are not in the Shaman kit; never resolve them as a free weapon strike.
 if(hero?.className==="Shaman"&&/\b(?:fire|flame|frost)\s+shock\b/i.test(text))return {name:"Fire Shock",level:null};
 return null;
}
function canonicalStoryChoice(choice){
 const text=String(choice?.text||"");
 const hero=window.soaCharacters?.profile?.(),level=window.soaProgression?.level?.()||hero?.startLevel||1;
 const unavailable=unavailableClassAbility(choice);
 if(unavailable){
  const learned=window.soaClassAbilities?.available?.(hero?.className,level)||[];
  const replacement=learned.find(ability=>ability.effect==="damage")||learned[0];
  return replacement?{...choice,text:"Cast "+replacement.name+" at the target",type:"combat",ability:replacement.id}:{...choice,text:"Strike the target with your weapon",type:"combat",ability:"strike"};
 }
 if(!/\bvanish\b/i.test(text)||/\b(?:don't|do not|avoid|without)\b.{0,45}\bvanish\b/i.test(text))return choice;
 if(hero?.className!=="Rogue"||level<5)return {...choice,text:"Move quietly to avoid notice",type:"stealth",difficulty:"medium"};
 return {...choice,text:"Vanish into the shadows",type:"stealth"};
}
function resolvedStoryVanish(action){
 if(action?.type!=="stealth"||!/\bvanish\b/i.test(String(action.text||""))||/\b(?:don't|do not|avoid|without)\b.{0,45}\bvanish\b/i.test(String(action.text||"")))return null;
 const hero=window.soaCharacters?.profile?.(),level=window.soaProgression?.level?.()||hero?.startLevel||1;
 return window.soaClassAbilities?.get?.("vanish",hero?.className,level)?"vanish":null;
}
function d20SuccessChance(bonus,dc,advantage=0,criticalOn=20){
 let hits=0,rolls=0;
 const threshold=Math.max(2,Math.min(20,Math.trunc(Number(criticalOn)||20)));
 const succeeds=die=>die>=threshold||die!==1&&die+bonus>=dc;
 if(advantage){for(let a=1;a<=20;a++)for(let b=1;b<=20;b++){rolls++;if(succeeds(advantage>0?Math.max(a,b):Math.min(a,b)))hits++}}
 else{for(let die=1;die<=20;die++){rolls++;if(succeeds(die))hits++}}
 return hits*100/rolls;
}
function chanceLabel(value){const rounded=Math.round(value*10)/10;return (Number.isInteger(rounded)?String(rounded):rounded.toFixed(1))+"%"}
function storyActionPlan(action){const enemies=livingEnemies(),selected=enemies.some(enemy=>enemy.name===selectedCombatTarget)?selectedCombatTarget:enemies[0]?.name||null;return window.soaStoryActions?.plan?.({action,s,c:campaign,hero:window.soaCharacters?.profile?.()||{},level:window.soaProgression?.level?.()||1,enemies,selected,cooldown:classCooldownLeft,maxHP:heroHealthCap()})||null;}
function playableStoryChoice(choice,index){
 const candidate=canonicalStoryChoice(choice),plan=storyActionPlan(candidate);
 // Validate the original too: replacing a locked spell must not silently change its target or intent.
 const original=storyActionPlan(choice);
 if(!plan?.error&&!original?.error)return candidate;
 const foes=livingEnemies();
 if(foes.length){const hero=window.soaCharacters?.profile?.(),target=foes.find(e=>e.name===selectedCombatTarget)||foes[0];if(hero?.className==="Druid"&&window.soaDruid?.FORMS?.[hero.form]?.utility)return {text:"Return to Humanoid Form",type:"combat",difficulty:"easy",ability:"shift_caster",form:"caster"};return {text:"Use a free weapon strike against "+target.name,type:"combat",difficulty:"medium",ability:"strike"};}
 return window.soaStoryActions.fallback(index);
}
function dicePreview(action){
 if(window.soaStoryActions){
  const plan=storyActionPlan(action);
  if(plan?.error)return {primary:"Action unavailable",secondary:plan.error};
  if(plan?.kind==="shift")return {primary:"Shapeshift into "+window.soaDruid.name(plan.form)+" · one full turn",secondary:(plan.form==="caster"?"No Mana cost":"20 Mana from your Mana reserve")+" · No attack included."};
  if(plan?.kind==="obstacle")return {primary:(plan.ability?.name||"Weapon Strike")+" · d20 + proficiency + "+(plan.ability?.stat||"DEX")+" vs obstacle DC "+plan.dc,secondary:"Environmental target: "+plan.target+" · no enemy required"};
  if(plan?.kind==="opening")return {primary:(plan.ability?.name||"Weapon Strike")+" · Opening attack on "+plan.target.name,secondary:"Begins combat and resolves one exchange · "+(plan.ability?.cost||0)+" "+resourceName()};
  if(plan?.kind==="self")return {primary:(plan.ability?.name||"Ability")+" · Self-cast · no enemy required",secondary:plan.ability?.description||"One action"};
 }
 if(window.soaDruid?.current?.()){const shift=window.soaDruid.shiftFrom(action);if(shift!==null)return {primary:"Shapeshift · one full turn",secondary:"20 Mana to enter a form; return to humanoid costs no Mana. No attack included."};const a=window.soaClassAbilities.available("Druid",window.soaProgression?.level?.()||1).find(x=>x.id===resolvedCombatAbility(action));if(a&&!livingEnemies().length&&["damage","interrupt"].includes(a.effect)){const target=window.soaDruid.environmentalTarget(action,campaign);return {primary:target?a.name+" · d20 + proficiency + "+a.stat+" vs obstacle DC "+window.soaDruid.obstacleDC(action):a.name+" · Requires a hostile target or visible obstacle",secondary:a.description+" · "+a.cost+" "+resourceName()};}if(a)return {primary:a.name+" · "+(a.periodicHeal?"15 HP per round · 3 rounds":a.effect==="heal"?"Healing roll":a.effect==="guard"?"Defensive action":"d20 + proficiency + "+a.stat+" vs target AC"),secondary:a.description+" · "+a.cost+" "+resourceName()};}
 // Combat takes priority over social keyword detection, matching the resolver.
 const storyAbility=resolvedStoryVanish(action);
 if((action.type==="combat"||storyAbility)&&livingEnemies().length){
  const racialAbility=resolvedRacialCombatAbility(action),abilityId=storyAbility||racialAbility?.id||resolvedCombatAbility(action);
  const profile=window.soaCharacters?.profile?.(),level=window.soaProgression?.level?.()||profile?.startLevel||1;
  const classAbility=window.soaClassAbilities?.get?.(abilityId,profile?.className,level)||racialAbility;
  const cost=racialAbility?0:window.soaClassAbilities?.costOf?.(abilityId,profile?.className,level)??0;
  const resource=resourceName();
  if(classAbility?.guaranteedEvade){const cooldown=classCooldownLeft(classAbility);return {primary:"🎲 Guaranteed success · 100%",secondary:"Vanish automatically evades the incoming attack · "+cost+" "+resource+" cost · "+(cooldown?cooldown+" exchange"+(cooldown===1?"":"s")+" remaining":classAbility.cooldown+" exchange cooldown")};}
  if(abilityId==="evasion")return {primary:"🎲 50% dodge chance per incoming hit",secondary:"Lasts 2 rounds · "+cost+" "+resource+" cost · 2-round cooldown · up to +25 "+resource+" recovery"};
  const attacker=window.soaAbilities?.get?.("hero");
  const gear=window.soaEquipment?.modifiers?.()||{};
  if(abilityId==="riposte")return {primary:"🎲 Automatic hit after parry",secondary:(24+(attacker?.modifiers?.DEX||0)+(gear.damage||0))+" raw damage on a valid Riposte · "+cost+" "+resource+" cost · up to +25 recovery"};
  const attackAbility=attacker?.className==="Warrior"||attacker?.className==="Paladin"?"STR":"DEX";
  const attackModifier=attacker?.modifiers?.[attackAbility]??2;
  const bonus=(attacker?.proficiency??2)+attackModifier+(gear.attack||0);
  const targets=livingEnemies(),selected=targets.find(e=>e.name===selectedCombatTarget)||targets[0];
  const ac=window.soaCombatRules?.statBlock?.(selected)?.ac||12;
  const weaponStrike=classAbility?.weaponDamage===true;
  const weapon=window.soaCombatRules?.weapon?.(attacker,weaponStrike?"strike":abilityId)||{die:abilityId==="kick"?6:10,flat:abilityId==="kick"?4+(attacker?.modifiers?.DEX||0):10+(attacker?.modifiers?.DEX||0)};
  const advantage=campaign?.flags?.advantage?1:0,rollLabel=advantage?"d20 with advantage + ":"d20 + ",criticalOn=classAbility?.criticalOn||20;
  const chance=chanceLabel(d20SuccessChance(bonus,ac,advantage,criticalOn));
  const criticalLabel=criticalOn===19?"natural 19–20 critical":"natural 20 critical";
  if(weaponStrike&&classAbility.strikes>1){
   const count=Math.max(1,Math.trunc(classAbility.strikes));
   return {primary:"🎲 "+count+" separate attack rolls: each "+rollLabel+bonus+" vs AC "+ac+" · "+chance+" hit · "+criticalLabel,secondary:count+" weapon strikes · each 1d"+weapon.die+" + "+(weapon.flat+(gear.damage||0))+" raw damage"+(classAbility.followupMultiplier?" · follow-up hits deal half damage":"")+" · "+cost+" "+resource+" cost · up to +25 recovery"};
  }
  return {primary:"🎲 "+rollLabel+bonus+" vs AC "+ac+" · "+chance+" hit · "+criticalLabel,secondary:"1d"+weapon.die+" + "+(weapon.flat+(gear.damage||0))+" raw damage · "+cost+" "+resource+" cost · up to +25 recovery"+(abilityId==="kick"?" · interrupt on hit":"")};
 }
 const skill=socialSkill(action);
 if(skill){
  const {bonus,dc}=socialTarget(action,skill);
  return {primary:"🎲 d20 "+(bonus>=0?"+ "+bonus:"− "+Math.abs(bonus))+" vs DC "+dc+" · "+chanceLabel(d20SuccessChance(bonus,dc))+" success",secondary:"CHA-based "+skill+" check · Natural 1 fails, 20 succeeds"};
 }
 const odds=actionOdds(action);
 const {cost,target}=odds;return {primary:"🎲 "+odds.skill+" · d100 ≤ "+target+" ("+target+"%)",secondary:cost+" "+resourceName()+" cost · up to +"+ACTION_RESOURCE_RECOVERY+" recovery · ability modifier "+(odds.modifier>=0?"+":"")+odds.modifier+" · training +"+odds.trained+(odds.classBonus?" · class aptitude "+(odds.classBonus>0?"+":"")+odds.classBonus:"")};
}
function resourceForecast(action){
 if(action.craftRecipe)return {cost:0,affordable:true,current:s.en,after:s.en,text:"Crafting · one action · materials consumed"};
 if(window.soaDruid?.current?.()){
  const d=window.soaDruid.current(),shift=window.soaDruid.shiftFrom(action);
  if(shift!==null){const current=d.pools.mana,cost=shift==="caster"?0:20,after=Math.max(0,current-cost);return {label:"Mana",current,max:100,cost,after,affordable:current>=cost,cooldown:0,abilityId:"shift_"+shift,text:"Mana "+current+" → "+after+"/100 · "+(cost?cost+" cost":"No Mana cost")+" · One full turn"};}
  const key=window.soaDruid.FORMS[d.form].resource,level=window.soaProgression?.level?.()||1,a=window.soaClassAbilities.available("Druid",level).find(x=>x.id===resolvedCombatAbility(action)),cost=a?.cost??(action.type==="combat"?0:actionOdds(action).cost),current=s.en,gain=key==="rage"?0:key==="energy"?20:25,after=Math.min(100,current-cost+gain),label=resourceName();
  return {label,current,max:100,cost,after,affordable:current>=cost,cooldown:a?classCooldownLeft(a):0,abilityId:a?.id,text:label+" "+current+" → "+Math.max(0,after)+"/100 · "+cost+" cost"+(key==="rage"?" · +5 per landed attack and each enemy attack aimed at you, even if it misses":" · +"+gain+" recovery")};
 }
 const profile=window.soaCharacters?.profile?.(),label=resourceName(),current=Math.max(0,Math.min(100,Number(s.en)||0)),storyAbility=resolvedStoryVanish(action);
 const storyPlan=window.soaStoryActions?storyActionPlan(action):null;
 const combatAction=(action.type==="combat"||!!storyAbility)&&livingEnemies().length>0||storyPlan?.kind==="opening";
 let abilityId=null,cost=0;
 const racialAbility=combatAction?resolvedRacialCombatAbility(action):null;
 if(combatAction){abilityId=storyAbility||racialAbility?.id||resolvedCombatAbility(action);const level=window.soaProgression?.level?.()||profile?.startLevel||1;cost=racialAbility?0:window.soaClassAbilities?.costOf?.(abilityId,profile?.className,level)??0}
 else if(storyPlan?.ability){abilityId=storyPlan.ability.id;cost=storyPlan.ability.cost;}
 else if(!socialSkill(action))cost=actionOdds(action).cost;
 const recovery=combatAction?COMBAT_RESOURCE_RECOVERY:ACTION_RESOURCE_RECOVERY,affordable=current>=cost,after=affordable?Math.min(100,current-cost+recovery):current;
 const ability=abilityId?(window.soaClassAbilities?.get?.(abilityId,profile?.className,window.soaProgression?.level?.()||profile?.startLevel||1)||racialAbility):null;
 const cooldown=ability?(racialAbility?racialCooldownLeft(ability):classCooldownLeft(ability)):0,unit=racialAbility?"action":"exchange",cooldownText=ability?.cooldown?(cooldown?" · "+ability.name+" cooldown · "+cooldown+" "+unit+(cooldown===1?"":"s")+" remaining":" · "+ability.name+" · "+ability.cooldown+" "+unit+" cooldown"):"";
 const text=(affordable?(label+" "+current+" → "+after+"/100 · "+(cost?cost+" cost":"no cost")+" · +"+recovery+" recovery"):"Need "+cost+" "+label+" · have "+current+"/100")+cooldownText;
 return{label,current,max:100,cost,after,affordable,text,cooldown,abilityId};
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
 s.time++;s.en=Math.min(100,s.en+ACTION_RESOURCE_RECOVERY);
 return (ok?"Success":"Complication")+": "+skill[0].toUpperCase()+skill.slice(1)+" check: d20 "+roll+" + "+bonus+" = "+total+" vs DC "+dc+". "+effect+" Result is authoritative. Do not fabricate further costs, relationship stages, or compelled consent.";
}
function livingEnemies(){return Array.isArray(campaign?.enemies)?campaign.enemies.filter(e=>e&&e.hp>0&&e.maxHp>0):[]}
function partyExperienceIds(){
 const names=Array.isArray(campaign?.combatAllies)?campaign.combatAllies.filter(a=>!a?.dungeonGuest).map(a=>a?.name).filter(Boolean):[];
 return [...new Set(names.map(name=>window.soaProgression?.register?.(name)).filter(Boolean))];
}
function resetEncounterCombatState(){
 campaign.preparedVanish=false;
 if(window.soaCharacters?.profile?.()?.className==="Druid")window.soaDruid?.resetEncounter?.(s);
 campaign.classCooldowns={};campaign.supportCooldowns={};
 campaign.combatRound=0;campaign.evasionUntil=0;campaign.guardUntil=0;campaign.snareUntil=0;
 campaign.snaredEnemy=null;campaign.parryReady=false;
 campaign.initiativeFor=null;campaign.initiativeRoll=null;campaign.enemyInitiative=null;
}
function startProgressionEncounter(){
 if(campaign.xpEncounter&&campaign.xpEncounter.active)return campaign.xpEncounter;
 const prepared=campaign.storyGuard?.expires>s.time?campaign.storyGuard:null;
 const preparedRage=prepared?.id==="enrage"?s.en:0;
 resetEncounterCombatState();
 if(prepared){
  if(!["enrage","tigers_fury","dash"].includes(prepared.id))campaign.guardUntil=1;
  if(prepared.id==="evasion")campaign.evasionUntil=2;if(prepared.id==="vanish")campaign.preparedVanish=true;
  if(window.soaCharacters?.profile?.()?.className==="Druid"){const d=window.soaDruid.state(s);d.effects||={};if(prepared.id==="enrage"){d.pools.rage=preparedRage;s.en=preparedRage;d.effects.enrageUntil=2;}if(prepared.id==="tigers_fury")d.effects.furyUntil=2;if(prepared.id==="dash"){d.effects.dashUntil=2;d.effects.dashActions=2;}}
 }delete campaign.storyGuard;
 campaign.encounterSerial=(Number(campaign.encounterSerial)||0)+1;
 const reference="encounter-"+campaign.encounterSerial;
 campaign.xpEncounter={id:reference,active:true,defeated:[],party:partyExperienceIds(),pendingVictory:false};
 return campaign.xpEncounter;
}
function concludeProgressionEncounter(allowNextRoster=false){
 const encounter=campaign.xpEncounter;
 if(!encounter?.active||!encounter.pendingVictory||(!allowNextRoster&&livingEnemies().length)||!encounter.defeated.length)return null;
 const result=window.soaProgression?.battle?.({receipt:encounter.id,defeated:encounter.defeated,allies:encounter.party})||null;
 if(result?.storageWarning){campaign.lastProgression="Victory experience could not be saved. Restore storage and retry before the next encounter.";return result;}
 encounter.active=false;encounter.pendingVictory=false;encounter.completed=true;
 if(result?.awarded){
  const extra=result.party?.reduce((sum,p)=>sum+(p.awarded||0),0)||0;
  campaign.lastProgression="Victory · +"+result.awarded+" XP to your hero"+(extra?" · companions shared "+extra+" XP":"")+(result.vitalsRestored?" · LEVEL UP! Full health and "+resourceName()+" restored":"");
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
  campaign.lastProgression=(success?"Successful":"Attempted")+" "+skill+" check · +"+earned.awarded+" XP"+(earned.rankUp?" · "+skill+" skill rank increased!":"")+(earned.vitalsRestored?" · LEVEL UP! Full health and "+resourceName()+" restored":"");
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
 const foes=livingEnemies();if(!foes.length)return null;
 const encounter=startProgressionEncounter(),heroBefore=s.hp;
 campaign.supportCooldowns||={};
 const round=Number(campaign.combatRound)||0;
 if((campaign.supportCooldowns[id]||0)>round){status("Ability cooling down; no turn spent.");return null}
 const previous=s.en;
 let description="",healed=0;
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
  if(recipient.player){const before=s.hp;s.hp=Math.min(recipient.maxHp,s.hp+value);healed=s.hp-before;description="Lethariel heals "+recipient.name+" for "+healed+" HP."}
  else{const allyRecord=campaign.combatAllies.find(a=>a.name===recipient.name),before=allyRecord.hp;allyRecord.hp=Math.min(allyRecord.maxHp,allyRecord.hp+value);healed=allyRecord.hp-before;campaign.partyHealth||={};campaign.partyHealth[allyRecord.name]={hp:allyRecord.hp,maxHp:allyRecord.maxHp,derived:true};description="Lethariel heals "+recipient.name+" for "+healed+" HP."}
 }
 campaign.supportCooldowns[id]=round+spec.cooldown+1;
 campaign.combatRound=round+1;
 s.time++;s.en=Math.min(100,s.en+COMBAT_RESOURCE_RECOVERY);
 const phase=window.soaEnemyPhase.resolve({s,c:campaign,enemies:foes,rules,round:campaign.combatRound,heroAC:window.soaAbilities?.get?.("hero")?.armorClass||12,heroName:window.soaCharacters?.profile?.()?.name||"Your hero",guaranteedEvade:campaign.preparedVanish===true});
 const retaliation=window.soaEnemyPhase.summary(phase.attacks),{evasionRoll,evasionActive,evaded}=phase;
 campaign.preparedVanish=false;
 const beforeRegeneration=s.hp;s.hp=Math.min(heroHealthCap(),s.hp+racialRegeneration());const regenerated=s.hp-beforeRegeneration;
 campaign.parryReady=false;
 campaign.lastSupport={round:campaign.combatRound,actor:spec.name,description,retaliation,evasionActive,evasionRoll,evaded,regenerated,enemyAttacks:phase.attacks};
 campaign.lastExchange={round:campaign.combatRound,encounterId:encounter.id,ability:id,abilityName:({bromli_guard:"Bromli's Guard",pippa_snare:"Pippa's Snare",lethariel_heal:"Lethariel's Healing"})[id],effect:id==="lethariel_heal"?"heal":"guard",target:foes[0].name,dealt:0,taken:phase.taken,healed,heroBefore,heroAfter:s.hp,recipient:window.soaCharacters?.profile?.()?.name||"Your hero",recipientBefore:heroBefore,recipientAfter:s.hp,regenerated,enemyAttacks:phase.attacks,details:[description]};
 recordCombatDelta(foes[0],0,phase.taken,campaign.lastExchange.recipient,heroBefore,s.hp,[],regenerated,phase.attacks);
 return "Success: Round "+campaign.combatRound+". "+description+" "+retaliation+(regenerated?" Regeneration restores "+regenerated+" HP.":"")+" "+resourceName()+" "+previous+" → "+s.en+". Exactly one exchange resolved.";
}
function classAbilityExchange(action,ability,targets){
 function touchOfTheGrave(target,hit,damageType){const hero=window.soaCharacters?.profile?.();const passive=window.soaRacialAbilities?.passives?.(hero?.race)?.touchOfTheGrave;if(!passive||!hit||!["physical","slashing","piercing","bludgeoning"].includes(damageType)||Math.random()>=passive.chance)return null;const level=window.soaProgression?.level?.()||hero?.startLevel||1,rules=window.soaCombatRules,rolled=rules.damage(passive.die,Math.floor(Math.max(0,level-1)/passive.levelScaling)),dealt=Math.min(target.hp,rules.mitigate(rolled,"shadow",rules.statBlock(target)));target.hp=Math.max(0,target.hp-dealt);const before=s.hp,cap=100+(window.soaRacialAbilities?.passives?.(hero.race)?.maxHp||0);s.hp=Math.min(cap,s.hp+dealt);return{damage:dealt,healing:s.hp-before};}
 const name=window.soaCharacters?.profile?.()?.name||"Your hero",resource=resourceName();
 const heroHealthCap=()=>100+(window.soaRacialAbilities?.passives?.(window.soaCharacters?.profile?.()?.race)?.maxHp||0);
 const racialRegeneration=()=>window.soaRacialAbilities?.passives?.(window.soaCharacters?.profile?.()?.race)?.regeneration||0;
 const isClassAbility=!!window.soaClassAbilities?.get?.(ability.id,window.soaCharacters?.profile?.()?.className,window.soaProgression?.level?.()||window.soaCharacters?.profile?.()?.startLevel||1);
 const cooldown=isClassAbility?classCooldownLeft(ability):0;
 if(cooldown){status(ability.name+" is cooling down for "+cooldown+" more exchange"+(cooldown===1?"":"s")+". No action spent.");return null}
 if(ability.effect==="riposte"&&!campaign.parryReady){status("Riposte requires a parry in the previous exchange. No action spent.");return null}
 if(s.en<ability.cost){status("Not enough "+resource+" for "+ability.name+" ("+ability.cost+" required). No action spent.");return null}
 const requested=String(action.text||"").toLowerCase(),matches=targets.filter(e=>requested.includes(e.name.toLowerCase()));
 const chosen=targets.find(e=>e.name===selectedCombatTarget),target=["heal","guard"].includes(ability.effect)?chosen||targets[0]:matches.length===1?matches[0]:matches.length>1?null:chosen||targets[0];
 if(!target){status("Select a specific enemy before using that ability. No action spent.");return null}
 if(ability.requiresCorpse&&!hasRecentCorpse()){status("Cannibalize requires a nearby defeated humanoid. No action spent.");return null}
 if(ability.effect==="heal"&&s.hp>=heroHealthCap()){status("Your health is already full. No action spent.");return null}
 const encounter=startProgressionEncounter();for(const id of partyExperienceIds())if(!encounter.party.includes(id))encounter.party.push(id);
 const rules=window.soaCombatRules,actor=window.soaAbilities?.get?.("hero"),stat=actor?.modifiers?.[ability.stat]||0,proficiency=actor?.proficiency||2;
 const block=rules.statBlock(target),gear=window.soaEquipment?.modifiers?.()||{},heroHP=s.hp,oldResource=s.en,oldHP=target.hp;
 if(!campaign.initiativeFor||campaign.initiativeFor!==campaign.enemyLocation){campaign.initiativeFor=campaign.enemyLocation;campaign.initiativeRoll=rules.initiative(actor?.initiative||0);campaign.enemyInitiative=rules.initiative(block.initiative)}
 const advantage=campaign.flags?.advantage?1:0,attackBonus=proficiency+stat+(gear.attack||0),weaponStrike=ability.weaponDamage===true,strikeCount=weaponStrike?Math.max(1,Math.min(6,Math.trunc(Number(ability.strikes)||1))):1;
 const weapon=weaponStrike?rules.weapon(actor,"strike"):null;
 let roll=null,hit=false,dealt=0,healed=0,racialProc=null,damageType=weaponStrike?weapon.type:ability.damageType||"physical",interrupted=false,guarding=ability.effect==="guard",evaded=false,evasionRoll=null,evasionActive=false,evasionUntil=Number(campaign.evasionUntil)||0;
 const strikeDetails=[],racialProcs=[],targetDamage=new Map();
 const addTargetDamage=(enemy,before,amount=0)=>{let row=targetDamage.get(enemy);if(!row){row={enemy,before,dealt:0};targetDamage.set(enemy,row)}row.dealt+=Math.max(0,Number(amount)||0);return row};
 if(["damage","interrupt","drain","riposte"].includes(ability.effect)){
  if(weaponStrike){
   let currentTarget=target;
   for(let index=0;index<strikeCount;index++){
    if(!currentTarget||currentTarget.hp<=0)currentTarget=livingEnemies()[0]||null;
    if(!currentTarget){strikeDetails.push({index:index+1,skipped:true});break}
    const before=currentTarget.hp,strikeBlock=rules.statBlock(currentTarget),attack=rules.attack(attackBonus,strikeBlock.ac,{advantage,criticalOn:ability.criticalOn||20});
    if(!roll)roll=attack;
    const strikeHit=!!attack.hit,raw=strikeHit?rules.damage(weapon.die,weapon.flat+(gear.damage||0),!!attack.critical):0;
    const scaledRaw=strikeHit&&index>0&&ability.followupMultiplier?Math.max(1,Math.floor(raw*ability.followupMultiplier)):raw;
    let strikeDamage=strikeHit?Math.min(currentTarget.hp,rules.mitigate(scaledRaw,damageType,strikeBlock)):0;
    currentTarget.hp=Math.max(0,currentTarget.hp-strikeDamage);
    const proc=touchOfTheGrave(currentTarget,strikeHit,damageType);
    if(proc){strikeDamage+=proc.damage;healed+=proc.healing;racialProcs.push(proc);if(!racialProc)racialProc=proc}
    dealt+=strikeDamage;hit=hit||strikeHit;addTargetDamage(currentTarget,before,strikeDamage);
    strikeDetails.push({index:index+1,target:currentTarget.name,die:attack.die,total:attack.total,bonus:attack.bonus,ac:strikeBlock.ac,critical:!!attack.critical,criticalOn:ability.criticalOn||20,hit:strikeHit,damage:strikeDamage,before,after:currentTarget.hp,maxHp:currentTarget.maxHp});
    currentTarget=currentTarget.hp>0?currentTarget:null;
   }
  }else{
   roll=ability.effect==="riposte"?null:rules.attack(attackBonus,block.ac,{advantage,criticalOn:ability.criticalOn||20});
   hit=ability.effect==="riposte"?true:!!roll?.hit;
   const raw=ability.effect==="riposte"?rules.damage(ability.die,ability.flat+stat+(gear.damage||0)):rules.damage(ability.die,ability.flat+stat+(gear.damage||0)+(ability.bonusDamage||0),!!roll?.critical);
   dealt=hit?Math.min(target.hp,rules.mitigate(raw,damageType,block)):0;target.hp=Math.max(0,target.hp-dealt);
   racialProc=touchOfTheGrave(target,hit,damageType);if(racialProc){dealt+=racialProc.damage;healed+=racialProc.healing;racialProcs.push(racialProc)}
   addTargetDamage(target,oldHP,dealt);
  }
  if(ability.effect==="drain"&&dealt){const before=s.hp;s.hp=Math.min(heroHealthCap(),s.hp+Math.max(1,Math.floor(dealt/2)));healed+=s.hp-before}
  interrupted=ability.effect==="interrupt"&&hit;
 }else if(ability.effect==="heal"){
  const before=s.hp;s.hp=Math.min(heroHealthCap(),s.hp+rules.damage(ability.die,ability.flat+stat));healed=s.hp-before;
 }
 const defeatedTargets=[];
 for(const row of targetDamage.values()){
  if(row.before>0&&row.enemy.hp===0){
   defeatedTargets.push({name:row.enemy.name,maxHp:row.enemy.maxHp});
   window.soaQuests?.onDefeat?.(campaign,row.enemy.name);
   if(!encounter.defeated.some(x=>x.name===row.enemy.name))encounter.defeated.push({name:row.enemy.name,maxHp:row.enemy.maxHp});
   campaign.defeatedEnemies||=[];campaign.defeatedEnemies.push(String(campaign.enemyLocation||campaign.scene?.location||"")+"|"+row.enemy.name.toLowerCase());campaign.defeatedEnemies=campaign.defeatedEnemies.slice(-80);
   if(selectedCombatTarget===row.enemy.name)selectedCombatTarget=null;
  }
 }
 if(!livingEnemies().length&&defeatedTargets.length)encounter.pendingVictory=true;
 const heroAC=actor?.armorClass||12;
 const guaranteedEvade=ability.guaranteedEvade===true||campaign.preparedVanish===true,attackRound=(Number(campaign.combatRound)||0)+1;
 if(ability.id==="evasion")campaign.evasionUntil=attackRound+1;
 evasionUntil=Number(campaign.evasionUntil)||0;evasionActive=evasionUntil>=attackRound;
 const phase=window.soaEnemyPhase.resolve({s,c:campaign,enemies:livingEnemies(),rules,round:attackRound,heroAC,heroName:name,guard:guarding&&ability.id!=="evasion",guaranteedEvade,interruptedTarget:interrupted?target:null,allowParry:!guarding});
 evaded=phase.evaded;evasionRoll=phase.evasionRoll;
 const taken=phase.taken,enemyAttack=phase.first,parry=phase.parry;
 const beforeRegeneration=s.hp;s.hp=Math.min(heroHealthCap(),s.hp+racialRegeneration());const regenerated=s.hp-beforeRegeneration;
 campaign.preparedVanish=false;campaign.parryReady=parry;s.en=Math.min(100,s.en-ability.cost+COMBAT_RESOURCE_RECOVERY);s.time++;campaign.combatRound=(Number(campaign.combatRound)||0)+1;
 if(isClassAbility&&ability.cooldown>0){campaign.classCooldowns||={};campaign.classCooldowns[ability.id]=campaign.combatRound+ability.cooldown+1}
 const firstDamage=targetDamage.values().next().value||{enemy:target,dealt:0},additionalDamage=Array.from(targetDamage.values()).slice(1);
 const event={round:campaign.combatRound,encounterId:encounter.id,ability:ability.id,racialProc,racialProcs,attackRoll:roll?.die??null,targetAC:block.ac,enemyType:block.type,damageType,initiative:campaign.initiativeRoll,enemyInitiative:campaign.enemyInitiative,attackTotal:roll?.total??null,critical:weaponStrike?strikeDetails.some(x=>x.critical):!!roll?.critical,enemyRoll:enemyAttack?.die??null,enemyTotal:enemyAttack?.total??null,defenderAC:heroAC,target:target.name,dealt,taken,hit,defeated:target.hp===0,defeatedTargets,enemyBefore:oldHP,enemyAfter:target.hp,enemyMax:target.maxHp,heroBefore:heroHP,heroAfter:s.hp,regenerated,energyBefore:oldResource,energyAfter:s.en,recipient:name,recipientBefore:heroHP,recipientAfter:s.hp,healed,parry,evaded,guaranteedEvade,evasionRoll,evasionActive,evasionUntil,evasionRemaining:Math.max(0,evasionUntil-campaign.combatRound),strikes:weaponStrike?strikeDetails:undefined};
 campaign.lastExchange=event;
 event.abilityName=ability.name;event.effect=ability.effect;event.weaponDamage=weaponStrike;event.enemyAttacks=phase.attacks;
 recordCombatDelta(firstDamage.enemy,firstDamage.dealt,taken,name,heroHP,s.hp,additionalDamage,regenerated,phase.attacks);
 const strikeReport=weaponStrike?" Strikes: "+strikeDetails.map(x=>x.skipped?"Strike "+x.index+" skipped; no living target.":"Strike "+x.index+" "+(x.hit?"hit":"miss")+(x.critical?" (critical)":"")+" for "+x.damage+" damage to "+x.target+" (d20 "+x.die+" + "+x.bonus+" = "+x.total+" vs AC "+x.ac+").").join(" "):"";
 const racialReport=racialProcs.length?" "+racialProcs.map(proc=>"Touch of the Grave deals "+proc.damage+" Shadow damage and restores "+proc.healing+" HP.").join(" "):"";
 const effect=ability.guaranteedEvade?(evaded?"vanishes and automatically evades the incoming attack (100% success)":"vanishes successfully; no enemy attack reaches you"):ability.id==="evasion"?"activates Evasion (50% dodge chance per incoming hit for two rounds)":weaponStrike?(hit?"connects with "+strikeDetails.filter(x=>x.hit).length+" of "+strikeDetails.filter(x=>!x.skipped).length+" weapon strikes for "+dealt+" total damage":"misses with all "+strikeCount+" weapon strikes"):guarding?"takes a defensive stance":healed?"restores "+healed+" HP":hit?"hits "+target.name+" for "+dealt+" damage":ability.effect==="heal"?"restores no health":"misses "+target.name;
 const retaliation=window.soaEnemyPhase.summary(phase.attacks);
 const normalAttackReport=!weaponStrike&&roll?" Attack d20 "+roll.die+" + "+(proficiency+stat+(gear.attack||0))+" vs AC "+block.ac+".":"";
 return (hit||guarding||healed?"Success":"Complication")+": "+name+" uses "+ability.name+" and "+effect+"."+strikeReport+normalAttackReport+" "+retaliation+racialReport+" "+resource+" "+oldResource+" → "+s.en+". Player HP "+heroHP+" → "+s.hp+". Exactly one combat exchange resolved.";
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
 const namedRacial=resolvedRacialCombatAbility(action);
 if(namedRacial)return racialCombatExchange(action,namedRacial,targets);
 const ability=resolvedCombatAbility(action);
 const inferredClassAbility=window.soaClassAbilities?.get?.(ability,heroProfile?.className,heroLevel);
 if(inferredClassAbility)return classAbilityExchange(action,inferredClassAbility,targets);
 const price=window.soaClassAbilities?.costOf?.(ability,heroProfile?.className,heroLevel)??0;
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
 const advantage=campaign.flags?.advantage?1:0,actionRound=(Number(campaign.combatRound)||0)+1;
 if(ability==="evasion")campaign.evasionUntil=actionRound+1;
 const evasionUntil=Number(campaign.evasionUntil)||0,evasionActive=evasionUntil>=actionRound;
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
 const preparedVanish=campaign.preparedVanish===true;
 const phase=window.soaEnemyPhase.resolve({s,c:campaign,enemies:livingEnemies(),rules,round:actionRound,heroAC,heroName:heroProfile?.name||"Your hero",interruptedTarget:interrupted?target:null,guaranteedEvade:preparedVanish,allowParry:ability!=="evasion",allies:campaign.combatAllies||[],allyAC:ally=>{const id=({"Pippa Sparkwhistle":"pippa","Bromli Ironkeg":"bromli","Lethariel Moonguard":"lethariel"})[ally.name];return id?window.soaAbilities?.get?.(id)?.armorClass||12:heroAC;}});
 const enemyAttack=phase.first,defenderAC=enemyAttack?.defenderAC||heroAC,evasionRoll=phase.evasionRoll,evaded=phase.evaded,taken=phase.taken;
 const receivedName=enemyAttack?.recipient||heroProfile?.name||"Your hero",recipientBefore=enemyAttack?.before??s.hp,recipientAfter=enemyAttack?.after??s.hp;
 const beforeRegeneration=s.hp;s.hp=Math.min(heroHealthCap(),s.hp+racialRegeneration());const regenerated=s.hp-beforeRegeneration;
 const parry=phase.parry;
 campaign.parryReady=parry;
 campaign.preparedVanish=false;s.en=Math.min(100,s.en-price+COMBAT_RESOURCE_RECOVERY);s.time++;
 campaign.combatRound=(Number(campaign.combatRound)||0)+1;
 const event={round:campaign.combatRound,encounterId:encounter.id,ability,racialProc,healed:racialProc?.healing||0,attackRoll,hitTarget,targetAC,enemyType:block.type,damageType:arm.type,initiative:campaign.initiativeRoll,enemyInitiative:campaign.enemyInitiative,attackTotal:playerAttack?.total??null,critical:!!playerAttack?.critical,enemyRoll:enemyAttack?.die??null,enemyTotal:enemyAttack?.total??null,defenderAC,target:target.name,dealt,taken,hit,defeated,enemyBefore:oldHP,enemyAfter:target.hp,enemyMax:target.maxHp,heroBefore:heroHP,heroAfter:s.hp,regenerated,energyBefore:oldEnergy,energyAfter:s.en,recipient:receivedName,recipientBefore,recipientAfter,parry,evaded,evasionRoll,evasionActive,evasionUntil,evasionRemaining:Math.max(0,evasionUntil-campaign.combatRound)};
 campaign.lastExchange=event;
 event.abilityName=({strike:"Weapon Strike",kick:"Kick",evasion:"Evasion",riposte:"Riposte"})[ability]||ability;event.effect=ability==="evasion"?"guard":"damage";event.weaponDamage=true;event.enemyAttacks=phase.attacks;
 recordCombatDelta(target,dealt,taken,receivedName,recipientBefore,recipientAfter,[],regenerated,phase.attacks);
 if(defeated){
  window.soaQuests?.onDefeat?.(campaign,target.name);
  if(!encounter.defeated.some(x=>x.name===target.name))encounter.defeated.push({name:target.name,maxHp:target.maxHp});
  if(!livingEnemies().length)encounter.pendingVictory=true;
  if(selectedCombatTarget===target.name)selectedCombatTarget=null;
  campaign.defeatedEnemies||=[];
  campaign.defeatedEnemies.push(String(campaign.enemyLocation||campaign.scene?.location||"")+"|"+target.name.toLowerCase());
  campaign.defeatedEnemies=campaign.defeatedEnemies.slice(-80);
 }
 const report=(ability==="evasion"?"Evasion activated: 50% dodge chance per incoming hit for two rounds.":hit?"Used "+ability+" on "+target.name+" for "+dealt+" HP.":"Used "+ability+" on "+target.name+" but missed.")+
  (attackRoll!==null?" d20 attack "+attackRoll+" + "+playerAttack.bonus+" vs AC "+targetAC+".":"")+
  " Enemy "+target.name+" HP "+oldHP+"/"+target.maxHp+" → "+target.hp+"/"+target.maxHp+". "+
  window.soaEnemyPhase.summary(phase.attacks)+
  " Player HP "+heroHP+" → "+s.hp+"; "+resourceName()+" "+oldEnergy+" → "+s.en+"."+
  (racialProc?" Touch of the Grave erupts for "+racialProc.damage+" Shadow damage and restores "+racialProc.healing+" HP.":"")+(defeated?" Opponent defeated.":"")+" Exactly ONE consequential combat exchange resolved. No automatic loot, extra turns, or unconfirmed healing.";
 return (hit||ability==="evasion"?"Success":"Complication")+": Combat exchange "+campaign.combatRound+": "+report;
}
function updateLivingEnemies(scene){
 if(window.soaDungeons?.current?.(campaign))return;
 if(!Array.isArray(scene?.enemies))return;
 const location=String(scene.location||"");
 const previous=(campaign.enemyLocation===location||campaign.pending?.combat)?livingEnemies():[];
 if(!previous.length)campaign.evasionUntil=0;
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
 // A generated scene can omit an engaged foe even after a noncombat choice.
 // Keep local survivors and their HP until the player explicitly disengages or changes location.
 const disengaged=/\b(?:retreat|flee|escape|withdraw|disengage|leave|exit)\b/i.test(String(campaign.pending?.action||""));
 if(previous.length&&!disengaged){
  for(const enemy of previous){
   if(next.length>=4)break;
   if(!next.some(item=>item.name.toLowerCase()===enemy.name.toLowerCase()))next.push(enemy);
  }
 }
 const hasIncomingHostiles=next.length>0;
 const newEncounter=hasIncomingHostiles&&!campaign.pending?.combat&&!previous.length;
 if(newEncounter){
  if(campaign.xpEncounter?.active){
   if(campaign.xpEncounter.pendingVictory)concludeProgressionEncounter(true);
   else{campaign.xpEncounter.active=false;campaign.xpEncounter.abandoned=true}
  }
  resetEncounterCombatState();
 }else if(hasIncomingHostiles&&campaign.pending?.combat&&campaign.xpEncounter?.active&&campaign.xpEncounter.pendingVictory){
  // Reinforcements arriving after a combat action continue the same encounter.
  campaign.xpEncounter.pendingVictory=false;
 }
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
function recordCombatDelta(enemy,dealt,taken,recipient,recipientBefore,recipientAfter,additional=[],regenerated=0,enemyAttacks=null){
 const log=Array.isArray(campaign.combatLog)?campaign.combatLog:[];
 const targets=[{enemy,dealt},...(Array.isArray(additional)?additional:[])].filter(entry=>entry?.enemy);
 const events=targets.map(entry=>({name:entry.enemy.name,side:"enemy",delta:-Math.max(0,Number(entry.dealt)||0),after:entry.enemy.hp,maxHp:entry.enemy.maxHp}));
 const incoming=Array.isArray(enemyAttacks)?enemyAttacks:[{recipient,damage:taken,before:recipientBefore,after:recipientAfter}];
 for(const row of incoming)events.push({name:row.recipient,source:row.enemy,side:"ally",delta:-row.damage,before:row.before,after:row.after,maxHp:row.recipient===(window.soaCharacters?.profile?.()?.name||"Your hero")?heroHealthCap():campaign.combatAllies?.find(a=>a.name===row.recipient)?.maxHp||null});
 if(regenerated>0)events.push({name:window.soaCharacters?.profile?.()?.name||"Your hero",side:"ally",delta:regenerated,after:s.hp,maxHp:heroHealthCap()});
 log.push({round:campaign.combatRound,encounterId:campaign.xpEncounter?.id||null,events,...(Array.isArray(enemyAttacks)?{enemyAttacks}:{})});
 campaign.combatLog=log.slice(-12);
}
function racialCooldownLeft(ability){return Math.max(0,(campaign?.racialCooldowns?.[ability.id]||0)-(Number(campaign?.actionSerial)||0))}
function hasRecentCorpse(){const location=String(campaign?.enemyLocation||campaign?.scene?.location||"");return window.soaRacialAbilities?.hasNearbyHumanoidCorpse?.(location,campaign?.defeatedEnemies)||false}
function racialCombatExchange(action,ability,targets){
 const left=racialCooldownLeft(ability);if(left){status(ability.name+" is cooling down for "+left+" more actions. No action spent.");return null}
 const actor=window.soaAbilities?.get?.("hero");const weaponStat=actor?.className==="Warrior"||actor?.className==="Paladin"?"STR":"DEX";
 const resolution=classAbilityExchange(action,{...ability,cost:0,stat:ability.weaponDamage?weaponStat:ability.stat||"DEX"},targets);
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
  s.en=Math.min(100,s.en+ACTION_RESOURCE_RECOVERY);s.time++;
  return "Success: "+(hero?.name||"Your hero")+" uses "+ability.name+". The next "+ability.skill+" check gains +"+ability.bonus+" percentage points. "+resourceName()+" recovers by up to "+ACTION_RESOURCE_RECOVERY+". No resource cost.";
 }
 if(ability.mode==="combat"&&livingEnemies().length)return fightExchange(action);
 if(ability.id==="cannibalize"){
  if(!hasRecentCorpse()){status("Cannibalize requires a nearby defeated humanoid. No action spent.");return null}
  if(s.hp>=heroHealthCap()){status("Your health is already full. No action spent.");return null}
  const actor=window.soaAbilities?.get?.("hero"),heal=window.soaCombatRules.roll(ability.die)+(ability.flat||0)+(actor?.modifiers?.CON||0),before=s.hp;
  s.hp=Math.min(heroHealthCap(),s.hp+heal);s.en=Math.min(100,s.en+ACTION_RESOURCE_RECOVERY);s.time++;
  campaign.racialCooldowns={...(campaign.racialCooldowns||{}),[ability.id]:(Number(campaign.actionSerial)||0)+ability.cooldown+1};
  return "Success: "+(hero?.name||"Your hero")+" uses Cannibalize on a defeated humanoid, restoring "+(s.hp-before)+" HP. "+resourceName()+" recovers by up to "+ACTION_RESOURCE_RECOVERY+".";
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
function combatExchangeDisplay(exchange){
 const hero=window.soaCharacters?.profile?.();
 const signature=hero?window.soaSpecializations?.ability?.(hero,60):null;
 const definition=(window.soaClassAbilities?.all?.(hero?.className)||[]).find(a=>a.id===exchange.ability)
  ||(signature?.id===exchange.ability?signature:null)
  ||window.soaRacialAbilities?.get?.(exchange.ability,hero?.race);
 const basic={strike:"Weapon Strike",druid_strike:exchange.form==="caster"?"Staff Strike":"Natural Strike",kick:"Kick",evasion:"Evasion",riposte:"Riposte",sprint:"Sprint",berserking:"Berserking",spec_rogue_combat:"Killing Spree"};
 const name=exchange.abilityName||definition?.name||basic[exchange.ability]||String(exchange.ability||"Attack").replaceAll("_"," ").replace(/\b\w/g,ch=>ch.toUpperCase());
 const weapon=exchange.weaponDamage===true||definition?.weaponDamage===true;
 const strikes=(Array.isArray(exchange.strikes)?exchange.strikes:[]).filter(x=>x&&typeof x==="object");
 const rolls=strikes.map((strike,i)=>{
  const index=Number.isInteger(strike.index)&&strike.index>0?strike.index:i+1,label=(weapon?"Strike ":"Attack ")+index;
  if(strike.skipped)return label+": skipped; no living target remained.";
  const primary=strike.target===exchange.target;
  const before=Number.isFinite(strike.before)?strike.before:primary?exchange.enemyBefore:null;
  const after=Number.isFinite(strike.after)?strike.after:Number.isFinite(before)&&Number.isFinite(strike.damage)?Math.max(0,before-strike.damage):null;
  const max=Number.isFinite(strike.maxHp)?strike.maxHp:primary?exchange.enemyMax:null;
  const hp=Number.isFinite(before)&&Number.isFinite(after)&&Number.isFinite(max)?" ("+before+" → "+after+"/"+max+" HP)":"";
  const roll=[strike.die,strike.bonus,strike.total,strike.ac].every(Number.isFinite)?"d20 "+strike.die+" + "+strike.bonus+" = "+strike.total+" vs AC "+strike.ac:"Roll not recorded";
  const critical=strike.critical?" · Critical (natural "+(Number.isInteger(strike.criticalOn)&&strike.criticalOn<20?strike.criticalOn+"–20":"20")+")":"";
  return label+": "+roll+" · "+(strike.hit?"Hit":"Miss")+critical+" · "+(Number.isFinite(strike.damage)?strike.damage:0)+" damage to "+(strike.target||exchange.target||"target")+hp+".";
 });
 const count=strikes.filter(x=>!x.skipped).length;
 const attackSummary=name+" · "+count+" "+(weapon?"weapon strike":"attack")+(count===1?"":"s")+" · "+(Number.isFinite(exchange.dealt)?exchange.dealt:0)+" total damage"+(exchange.defeatedTargets?.length?" · defeated "+exchange.defeatedTargets.map(x=>x.name).join(", "):"")+".";
 return {name,effect:exchange.effect||definition?.effect,strikes,rolls,attackSummary};
}
function currentEncounterExchange(){
 const encounterId=campaign?.xpEncounter?.active?String(campaign.xpEncounter.id||""):"";
 const exchange=campaign?.lastExchange||null;
 return encounterId&&exchange?.encounterId===encounterId?exchange:null;
}
function drawEnemyStatus(box){
 const enemies=livingEnemies();
 if(!enemies.length)return;
 const exchange=currentEncounterExchange();
 const section=document.createElement("section");section.className="soa-enemy-status";
 const heading=document.createElement("h4");heading.textContent=exchange?"Combat · Round "+exchange.round:"Combat";section.append(heading);
 const orderNote=document.createElement("p");orderNote.className="soa-combat-basic-note";orderNote.textContent="One action per round. Each surviving enemy responds in the order shown.";section.append(orderNote);
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
 const fallenTargets=Array.isArray(exchange?.defeatedTargets)?exchange.defeatedTargets:exchange?.defeated?[{name:exchange.target,maxHp:exchange.enemyMax}]:[];
 for(const fallenTarget of fallenTargets){
  if(enemies.some(e=>e.name===fallenTarget.name))continue;
  const fallen=document.createElement("div");fallen.className="soa-foe soa-foe-defeated";
  const title=document.createElement("div");title.className="soa-foe-heading";
  const name=document.createElement("strong");name.textContent=fallenTarget.name;
  const hp=document.createElement("span");hp.textContent="0 / "+fallenTarget.maxHp+" HP";
  title.append(name,hp);
  const track=document.createElement("div");track.className="soa-foe-track";track.setAttribute("role","progressbar");
  track.setAttribute("aria-label",fallenTarget.name+" health");track.setAttribute("aria-valuemin","0");track.setAttribute("aria-valuemax",String(fallenTarget.maxHp));track.setAttribute("aria-valuenow","0");
  const fill=document.createElement("div");fill.className="soa-foe-fill";fill.style.width="0%";track.append(fill);
  fallen.append(title,track);section.append(fallen);
 }
 if(exchange){
  const summary=document.createElement("div");summary.className="soa-exchange";
  const title=document.createElement("strong");title.textContent="Last exchange · Round "+exchange.round;
  const dealt=document.createElement("p");
  const presentation=combatExchangeDisplay(exchange);
  if(presentation.strikes.length){
   dealt.textContent=presentation.attackSummary;
  }else if(exchange.guaranteedEvade&&exchange.ability==="vanish"){
   dealt.textContent="Vanish succeeded · guaranteed 100% evade"+(exchange.evaded?"; incoming attack avoided.":"; no enemy attack reached you.");
  }else{
   const evasionNote=exchange.evasionActive&&!Array.isArray(exchange.enemyAttacks)?(Number.isInteger(exchange.evasionRoll)?exchange.evaded?" · Evasion succeeds (d100 "+exchange.evasionRoll+" ≤ 50).":" · Evasion fails (d100 "+exchange.evasionRoll+" > 50).":" · Evasion active; no dodge roll was needed."):"";
   dealt.textContent=exchange.shapeshift?"Shapeshifted into "+window.soaDruid.name(exchange.form)+" · full turn · no attack.":exchange.ability==="evasion"?"Evasion activated · 50% dodge chance per incoming hit for 2 rounds · 2-round cooldown"+evasionNote+".":presentation.effect==="heal"?"Used "+presentation.name+" · restored "+(exchange.healed||0)+" HP."+evasionNote:exchange.ability==="sprint"?"Used Sprint · incoming attack disadvantaged."+evasionNote:presentation.effect==="guard"?"Used "+presentation.name+"."+evasionNote:exchange.hit?presentation.name+" · Hit · "+exchange.dealt+" damage to "+exchange.target+" · HP "+exchange.enemyBefore+"/"+exchange.enemyMax+" → "+exchange.enemyAfter+"/"+exchange.enemyMax+"."+evasionNote:presentation.name+" · Miss · 0 damage to "+exchange.target+"."+evasionNote;
  }
  const taken=document.createElement("p");taken.textContent=Array.isArray(exchange.enemyAttacks)?"Enemy phase · "+exchange.enemyAttacks.length+" responses · "+exchange.taken+" total damage received.":"Damage received · "+(exchange.recipient||"you")+" "+exchange.taken+" HP ("+(exchange.recipientBefore??exchange.heroBefore)+" → "+(exchange.recipientAfter??exchange.heroAfter)+" HP).";
  summary.append(title,dealt,taken);
  for(const row of Array.isArray(exchange.enemyAttacks)?exchange.enemyAttacks:[]){const entry=document.createElement("p");entry.textContent=row.index+") "+row.enemy+" → "+row.recipient+" · "+(row.skipped?row.reason+"; no attack":row.evaded?"Dodged"+(row.evasionRoll!==null?" (Evasion "+row.evasionRoll+"/100)":""):row.hit?(row.critical?"Critical · ":"Hit · ")+row.damage+" damage ("+row.before+" → "+row.after+" HP)":"Miss · 0 damage")+(row.parry?" · Riposte ready":"");summary.append(entry)}
  if(exchange.healed>0&&presentation.effect!=="heal"){const healing=document.createElement("p");healing.textContent="Healing received · "+exchange.healed+" HP.";summary.append(healing)}
  if(exchange.resourceReport){const report=document.createElement("p");report.textContent=exchange.resourceReport;summary.append(report)}
  if(exchange.regenerated>0){const healing=document.createElement("p");healing.textContent="Troll Regeneration · "+(window.soaCharacters?.profile?.()?.name||"Your hero")+" recovers "+exchange.regenerated+" HP (up to maximum).";summary.append(healing)}
  const details=document.createElement("details");details.className="soa-exchange-details";
  const detailsLabel=document.createElement("summary");detailsLabel.textContent="Roll & event details";details.append(detailsLabel);
  if(presentation.rolls.length){
   for(const text of presentation.rolls){const roll=document.createElement("p");roll.textContent=text;details.append(roll)}
  }else if(Number.isInteger(exchange.attackRoll)){const roll=document.createElement("p");roll.textContent="Attack roll: d20 "+exchange.attackRoll+" + modifier = "+exchange.attackTotal+" vs AC "+exchange.targetAC+(exchange.critical?" · Critical hit":"");details.append(roll)}
  if(exchange.ability==="evasion"){const note=document.createElement("p");note.textContent="Evasion gives a 50% chance to dodge each incoming hit for two rounds. A separate d100 roll of 1–50 dodges; 51–100 does not. Its two-round cooldown starts on use.";details.append(note)}
  if(exchange.guaranteedEvade){const note=document.createElement("p");note.textContent="Vanish is guaranteed: when a hostile can attack this exchange, that attack is automatically evaded.";details.append(note)}
  if(exchange.evasionActive&&!Array.isArray(exchange.enemyAttacks)){const note=document.createElement("p");note.textContent=Number.isInteger(exchange.evasionRoll)?"Evasion d100 "+exchange.evasionRoll+" · "+(exchange.evaded?"dodged (1–50 succeeds)":"not dodged (51–100 fails)")+" · active through round "+exchange.evasionUntil+".":"Evasion was active for this round; no dodge roll was needed"+(exchange.evasionUntil?" · active through round "+exchange.evasionUntil:"")+".";details.append(note)}
  if(Number.isInteger(exchange.initiative)){const init=document.createElement("p");init.textContent="Initiative: Hero "+exchange.initiative+" · Foe "+exchange.enemyInitiative+" · "+exchange.enemyType+" · "+exchange.damageType+" damage";details.append(init)}
  if(Array.isArray(exchange.enemyAttacks)){for(const row of exchange.enemyAttacks){const defense=document.createElement("p");defense.textContent=window.soaEnemyPhase.summary([row]);details.append(defense)}}
  else if(Number.isInteger(exchange.enemyRoll)){const defense=document.createElement("p");defense.textContent="Enemy attack: d20 "+exchange.enemyRoll+" = "+exchange.enemyTotal+" vs defender AC "+exchange.defenderAC;details.append(defense)}
  for(const text of Array.isArray(exchange.details)?exchange.details:[]){if(typeof text!=="string")continue;const note=document.createElement("p");note.textContent=text;details.append(note)}
  if(exchange.defeatedTargets?.length){const note=document.createElement("p");note.textContent=exchange.defeatedTargets.map(x=>x.name).join(", ")+" defeated; loot is collected through a separate search action.";details.append(note)}
  else if(exchange.defeated){const note=document.createElement("p");note.textContent=exchange.target+" defeated; loot is collected through a separate search action.";details.append(note)}
  summary.append(details);section.append(summary);
 }
 const roster=document.createElement("section");roster.className="soa-combat-roster";
 const caption=document.createElement("h4");caption.textContent="Allied combatants";roster.append(caption);
 for(const ally of combatParty()){
  const card=document.createElement("div");card.className="soa-ally";const title=document.createElement("div");title.className="soa-foe-heading";
  const person=document.createElement("strong");person.textContent=ally.name;const hp=document.createElement("span");hp.textContent=ally.player?s.hp+" / "+heroHealthCap()+" HP":ally.hp===null?"HP unknown":ally.hp+" / "+ally.maxHp+" HP";
  title.append(person,hp);card.append(title);
  if(ally.hp!==null||ally.player){
   const current=ally.player?s.hp:ally.hp,max=ally.player?heroHealthCap():ally.maxHp;
   const rail=document.createElement("div");rail.className="soa-foe-track";rail.setAttribute("role","progressbar");rail.setAttribute("aria-label",ally.name+" health");rail.setAttribute("aria-valuemin","0");rail.setAttribute("aria-valuemax",String(max));rail.setAttribute("aria-valuenow",String(current));
   const fill=document.createElement("div");fill.className="soa-foe-fill soa-ally-fill";fill.style.width=Math.max(0,Math.min(100,current/max*100))+"%";rail.append(fill);card.append(rail);
  }
  if(ally.player){
   const actor=window.soaAbilities?.get?.("hero"),resource=window.soaResources?.forClass?.(actor?.className,actor?.form);
   const current=Math.max(0,Math.min(resource?.max||100,Number(s.en)||0)),max=resource?.max||100;
   const meter=document.createElement("div");meter.className="soa-combat-resource soa-hero-resource";
   const label=document.createElement("div");label.className="soa-combat-resource-heading soa-hero-resource-heading";
   const resourceNameNode=document.createElement("strong");resourceNameNode.textContent=resource?.label||"Resource";
   const resourceValue=document.createElement("span");resourceValue.textContent=current+" / "+max;
   label.append(resourceNameNode,resourceValue);
   const resourceRail=document.createElement("div");resourceRail.className="soa-combat-resource-rail";resourceRail.dataset.resource=resource?.key||"";resourceRail.setAttribute("role","progressbar");resourceRail.setAttribute("aria-label",ally.name+" "+(resource?.label||"Resource"));resourceRail.setAttribute("aria-valuemin","0");resourceRail.setAttribute("aria-valuemax",String(max));resourceRail.setAttribute("aria-valuenow",String(current));
   const resourceFill=document.createElement("div");resourceFill.className="soa-combat-resource-fill";resourceFill.style.width=Math.max(0,Math.min(100,current/max*100))+"%";resourceRail.append(resourceFill);meter.append(label,resourceRail);card.append(meter);
   const block=actor?.armorClass;const details=document.createElement("p");details.className="soa-foe-stats";details.textContent="Armor Class "+(block??"unknown")+" · HP calculated from class, Constitution, and level";card.append(details);
  }
  roster.append(card);
 }
 section.append(roster);box.append(section);
}
function drawCombatActions(box){
 const enemies=livingEnemies();if(!enemies.length)return;
 const hero=window.soaCharacters?.profile?.(),level=window.soaProgression?.level?.()||hero?.startLevel||1;
 const section=document.createElement("section");section.className="soa-combat-move-panel";
 const heading=document.createElement("div");heading.className="soa-combat-move-heading";
 const title=document.createElement("strong");title.textContent="Combat actions";
 const hint=document.createElement("span");hint.textContent=hero?.className==="Druid"?(resourceKey()==="rage"?"Rage builds from combat":resourceKey()==="energy"?"+20 Energy per exchange":"+25 Mana per exchange"):"+"+COMBAT_RESOURCE_RECOVERY+" "+resourceName()+" each exchange";
 heading.append(title,hint);section.append(heading);
 const evasionRemaining=Math.max(0,(Number(campaign.evasionUntil)||0)-(Number(campaign.combatRound)||0));
 if(evasionRemaining>0){const evasionStatus=document.createElement("p");evasionStatus.className="soa-evasion-status";evasionStatus.textContent="Evasion active · 50% dodge chance per incoming hit · "+evasionRemaining+" round"+(evasionRemaining===1?"":"s")+" remaining";section.append(evasionStatus)}
 const targetLabel=document.createElement("label");targetLabel.className="soa-combat-target-label";targetLabel.textContent="Target";
 const target=document.createElement("select");target.className="soa-combat-target-select";target.setAttribute("aria-label","Combat target");
 const selected=enemies.find(e=>e.name===selectedCombatTarget)||enemies[0];selectedCombatTarget=selected.name;
 for(const enemy of enemies){const option=document.createElement("option");option.value=enemy.name;option.textContent=enemy.name+" · "+enemy.hp+"/"+enemy.maxHp+" HP";target.append(option)}
 target.value=selected.name;
 target.onchange=()=>{selectedCombatTarget=target.value;draw()};
 targetLabel.append(target);section.append(targetLabel);
 const basic=document.createElement("button");basic.type="button";basic.className="soa-ability-button soa-combat-basic";
 basic.textContent=hero?.className==="Druid"&&hero.form!=="caster"?"Natural Strike · Free":"Weapon Strike · Free";
 basic.title="A reliable attack that is always available.";
 basic.disabled=busy||!!pending()||hero?.className==="Druid"&&window.soaDruid?.FORMS?.[hero.form]?.utility;
 basic.onclick=()=>choose({text:(hero?.name||"Hero")+" uses Weapon Strike against "+target.value,type:"combat",difficulty:"medium",ability:"strike"});
 const basicNote=document.createElement("small");basicNote.className="soa-combat-basic-note";basicNote.textContent=hero?.className==="Druid"?"One exchange · form resource rules shown above":"Always available · combat exchange restores up to +"+COMBAT_RESOURCE_RECOVERY+" "+resourceName();
 const basicWrap=document.createElement("div");basicWrap.className="soa-combat-basic-wrap";basicWrap.append(basic,basicNote);section.append(basicWrap);
 const learned=window.soaClassAbilities?.available?.(hero?.className,level)||[];
 const racial=(window.soaRacialAbilities?.list?.(hero?.race)||[]).filter(a=>a.mode==="combat"&&(!a.requiresCorpse||hasRecentCorpse()));
 if(learned.length||racial.length){
  const more=document.createElement("details");more.className="soa-combat-special-drawer";more.open=localGet("soa-combat-specials-open")==="1";
  more.ontoggle=()=>{if(!localSet("soa-combat-specials-open",more.open?"1":"0"))window.soaReportStorageFailure?.("Combat display preference could not be saved; game progress is unchanged.")};
  const summary=document.createElement("summary");summary.textContent="Special abilities · "+(learned.length+racial.length);more.append(summary);
  const grid=document.createElement("div");grid.className="soa-combat-special-grid";
  for(const ability of learned){
   const {id,name,cost,effect}=ability,button=document.createElement("button"),cooldown=classCooldownLeft(ability),isKillingSpree=ability.strikes===2&&ability.weaponDamage===true,isGuaranteedVanish=ability.guaranteedEvade===true,isEvasion=ability.id==="evasion";
   button.type="button";button.className="soa-ability-button soa-combat-special-button";
   button.textContent=name+" · "+cost+" "+resourceName()+(cooldown?" · "+cooldown+" exchange"+(cooldown===1?"":"s"):"");
   button.title=ability.description||name;
   const needsTarget=!(["guard","heal"].includes(effect));
   button.disabled=busy||!!pending()||s.en<cost||!!cooldown||(hero?.className==="Druid"&&!!window.soaDruid?.errorFor?.(ability,s,campaign,true,selected))||(effect==="riposte"&&!campaign.parryReady)||needsTarget&&!target.value;
   button.onclick=()=>choose({text:(hero?.name||"Your hero")+" uses "+name+(needsTarget?" against "+target.value:""),type:"combat",difficulty:"medium",ability:id});
   const note=document.createElement("small");
   const mechanics=isKillingSpree?"Two weapon strikes · crits on 19–20":isGuaranteedVanish?"Guaranteed evade · 100% success":isEvasion?"50% dodge chance · lasts 2 rounds":"";
   const state=cooldown?"Cooldown · "+cooldown+" exchange"+(cooldown===1?"":"s"):ability.cooldown?"Ready · "+cost+" "+resourceName()+" · "+ability.cooldown+" exchange cooldown":cost+" "+resourceName()+" · Ready";
   const unavailableReason=hero?.className==="Druid"?window.soaDruid?.errorFor?.(ability,s,campaign,true,selected):null;note.textContent=unavailableReason||state+(ability.periodicHeal?" · 15 HP per round for 3 rounds":"")+(mechanics?" · "+mechanics:"");button.append(note);grid.append(button);
  }
  for(const ability of racial){
   const left=racialCooldownLeft(ability),button=document.createElement("button");button.type="button";button.className="soa-ability-button soa-combat-special-button soa-racial-combat-button";
   button.textContent=ability.name+" · No cost"+(left?" · "+left+" actions":"");
   button.title=ability.description;button.disabled=busy||!!pending()||!!left||s.hp>=heroHealthCap()&&ability.effect==="heal"||ability.requiresCorpse&&!hasRecentCorpse();
   button.onclick=()=>choose({text:(hero?.name||"Your hero")+" uses "+ability.name+" against "+target.value,type:"combat",difficulty:"medium",ability:ability.id});
   const note=document.createElement("small");const mechanics=ability.id==="berserking"?" · 3 separate melee rolls · first hit full, follow-ups half · 4-action cooldown":"";note.textContent=(left?"Cooldown · "+left+" actions":"Ready · No resource cost")+mechanics;button.append(note);grid.append(button);
  }
  more.append(grid);section.append(more);
 }
 box.append(section);
}
function scavengeFallenEnemy(action,success){
 if(!success)return null;
 const text=String(action?.text||"").toLowerCase();
 const searching=/\b(?:scaveng\w*|loot\w*|rifl\w*|ransack\w*|search\w*|pocket\w*)\b/.test(text);
 const corpse=/\b(?:fallen|dead|defeated|corpse|body|bodies|remains|foe|enemy|enemies)\b/.test(text);
 const records=Array.isArray(campaign.defeatedEnemies)?campaign.defeatedEnemies:[];
 const location=String(campaign.scene?.location||campaign.enemyLocation||"").toLowerCase()+"|";
 const nearby=records.filter(id=>id.toLowerCase().startsWith(location)&&!/(?:beast|wolf|worg|spider|scorp\w*|boar|serpent|raptor|crocolisk|construct|elemental)/i.test(id.slice(location.length)));
 if(!searching||(!corpse&&!nearby.some(id=>text.includes(id.slice(location.length)))))return null;
 s.flags||={};
 const claimed=Array.isArray(s.flags.lootReceipts)?s.flags.lootReceipts:[];
 const unsearched=nearby.filter(id=>!claimed.includes(id));
 const named=unsearched.findLast(id=>text.includes(id.slice(location.length)));
 const id=named||unsearched.at(-1);
 if(!id)return "No unsearched fallen enemy here yielded coins.";
 const amount=6+Math.floor(Math.random()*19)+(Math.random()<0.1?100:0);
 s.money+=amount;
 s.flags.lootReceipts=[...claimed,id].slice(-80);
 const silver=Math.floor(amount/100),copper=amount%100;
 const coins=(silver?silver+" silver"+(copper?" and ":""):"")+(copper?copper+" copper":"");
 return "Loot: found "+coins+" on "+id.slice(location.length)+". Wallet now "+fmtMoney(s.money)+".";
}
function druidResult(action){
 const druid=window.soaDruid,profile=window.soaCharacters?.profile?.();
 if(!druid||profile?.className!=="Druid")return undefined;
 const level=window.soaProgression?.level?.()||profile.startLevel||1,d=druid.state(s),enemies=livingEnemies(),combat=enemies.length>0;
 const shiftId=druid.shiftFrom(action),base=window.soaClassAbilities.all("Druid"),learned=window.soaClassAbilities.available("Druid",level),known=window.soaStoryActions&&!storyActionPlan(action)?.ability?null:druid.named(action,[...base,...learned]);
 const ability=known?learned.find(a=>a.id===known.id):null;
 const fail=message=>{status(message+" No action spent.");return null};
 if(action.type==="druid_quest"){
  const outcome=druid.questAction(s,campaign,profile,level,action.quest,action.operation,window.soaCombatRules);
  if(outcome.error)return fail(outcome.error);
  campaign.druidResolvedTime=s.time;return outcome.message;
 }
 if(shiftId!==null&&!combat){
  const outcome=druid.shift(s,campaign,profile,level,shiftId);if(outcome.error)return fail(outcome.error);
  s.time++;campaign.druidResolvedTime=s.time;return "Success: "+outcome.message;
 }
 if(known&&!ability)return fail(known.name+" is not learned or cannot be used in "+druid.name(d.form)+" Form");
 if(ability&&!combat){
  const err=druid.errorFor(ability,s,campaign,false);if(err)return fail(err);
  if(ability.effect==="guard"&&window.soaStoryActions){const outcome=window.soaStoryActions.outside({kind:"self",ability},{s,c:campaign,hero:profile,rules:window.soaCombatRules,actor:window.soaAbilities.get("hero"),maxHP:heroHealthCap()});if(ability.dash){d.effects||={};d.effects.dashActions=3;}campaign.druidResolvedTime=s.time;return outcome;}
  if(!ability.prowl&&ability.effect!=="heal"){
   const outcome=druid.castAtEnvironment(s,campaign,profile,level,action,ability,window.soaCombatRules,window.soaAbilities.get("hero"));
   if(outcome.error)return fail(outcome.error);
   campaign.druidResolvedTime=s.time;return outcome.message;
  }
  if(ability.prowl){if(d.prowl)return fail("Prowl is already active");d.prowl=true;}
  else {const outcome=druid.healOutsideCombat(s,campaign,profile,ability,window.soaCombatRules,window.soaAbilities.get("hero"));if(outcome.error)return fail(outcome.error);campaign.druidResolvedTime=s.time;return outcome.message;}
  druid.recover(s,{cost:ability.cost,combat:false});s.time++;campaign.druidResolvedTime=s.time;return "Success: Prowl active. Your next cat opener gains advantage. One turn resolved.";
 }
 if(!combat||(!ability&&shiftId===null&&action.type!=="combat"))return undefined;
 // Racial and companion actions retain their existing resolver and settle resource pools afterwards.
 if(druid.FORMS[d.form].utility&&action.type==="combat")return fail("Return to humanoid or a combat form before attacking");
 if(action.type==="racial"||window.soaRacialAbilities?.get?.(action.ability,profile.race)||["bromli_guard","pippa_snare","lethariel_heal"].includes(action.ability))return undefined;
 const target=(window.soaStoryActions?storyActionPlan(action)?.target:null)||enemies.find(e=>String(action.text||"").toLowerCase().includes(e.name.toLowerCase()))||enemies.find(e=>e.name===selectedCombatTarget)||enemies[0];
 const basic={id:"druid_strike",name:druid.FORMS[d.form].resource==="mana"?"Staff Strike":"Natural Strike",cost:0,effect:"damage",stat:["bear","dire_bear"].includes(d.form)?"STR":"DEX",die:6,flat:3,damageType:"slashing",cooldown:0};
 const beforeExchange=structuredClone(s),beforeCampaign=structuredClone(campaign),encounter=startProgressionEncounter();
 const outcome=druid.exchange(s,campaign,profile,level,action,ability||basic,target,window.soaCombatRules,window.soaAbilities.get("hero"));
 if(outcome.error){s=beforeExchange;campaign=beforeCampaign;return fail(outcome.error);}
 const event=outcome.event;event.encounterId=encounter.id;campaign.lastExchange=event;campaign.parryReady=false;campaign.druidResolvedTime=s.time;
 for(const row of outcome.rows)if(row.before>0&&row.enemy.hp===0){
  window.soaQuests?.onDefeat?.(campaign,row.enemy.name);druid.onDefeat(campaign,row.enemy.name);
  if(!encounter.defeated.some(x=>x.name===row.enemy.name))encounter.defeated.push({name:row.enemy.name,maxHp:row.enemy.maxHp});
  campaign.defeatedEnemies||=[];campaign.defeatedEnemies.push(String(campaign.enemyLocation||campaign.scene?.location||"")+"|"+row.enemy.name.toLowerCase());
 }
 campaign.defeatedEnemies=(campaign.defeatedEnemies||[]).slice(-80);
 if(!livingEnemies().length&&event.defeatedTargets.length)encounter.pendingVictory=true;
 const first=outcome.rows[0];recordCombatDelta(first.enemy,first.dealt,event.taken,profile.name,event.heroBefore,s.hp,outcome.rows.slice(1),0,event.enemyAttacks);
 return outcome.message;
}
function result(action){
 if(action.craftRecipe){
  const receipt="craft:"+campaign.turn+":"+((Number(campaign.actionSerial)||0)+1),crafted=window.soaCrafting.craft(campaign,action.craftRecipe,receipt);
  if(crafted.error){status(crafted.error+" No action spent.");return null}
  s.time++;if(!window.soaDruid?.current?.())s.en=Math.min(100,s.en+ACTION_RESOURCE_RECOVERY);
  return "Success: "+crafted.message+" Materials consumed once; no automatic equip. Result is authoritative.";
 }
 if(/\b(?:craft|forge|stitch|sew|make|build|assemble)\w*\b/i.test(action.text||"")&&/\b(?:armor|armour|tunic|robe|mail|blade|sword|goggles|targeting lens)\b/i.test(action.text||"")){status("Use Character → Loadout & Equipment → Crafting to choose a tracked recipe and materials. No action spent.");return null}
 const storyPlan=window.soaStoryActions?storyActionPlan(action):null;
 if(storyPlan?.error){status(storyPlan.error+" No action spent.");return null}
 if(storyPlan&&["self","obstacle"].includes(storyPlan.kind)&&(window.soaCharacters?.profile?.()?.className!=="Druid"||!storyPlan.ability)){const outcome=window.soaStoryActions.outside(storyPlan,{s,c:campaign,hero:window.soaCharacters.profile(),rules:window.soaCombatRules,actor:window.soaAbilities.get("hero"),maxHP:heroHealthCap()});if(window.soaDruid?.current?.())campaign.druidResolvedTime=s.time;return outcome;}
 if(storyPlan?.kind==="combat"&&window.soaCharacters?.profile?.()?.className!=="Druid")return fightExchange({...action,type:"combat",...(storyPlan.ability?{ability:storyPlan.ability.id}:{})});
 const druidResolution=window.soaDruid?druidResult(action):undefined;if(druidResolution!==undefined)return druidResolution;
 const unavailable=unavailableClassAbility(action);
 if(unavailable){status(unavailable.name+(unavailable.level?" unlocks at level "+unavailable.level:" is not learned")+". No action spent.");return null}
 if(action.type==="racial")return useRacialAbility(action);
 if(action.type==="combat"&&livingEnemies().length)return fightExchange(action);
 const storyAbility=resolvedStoryVanish(action);
 if(storyAbility&&livingEnemies().length)return fightExchange({...action,type:"combat",ability:storyAbility});
 const skill=socialSkill(action);if(skill)return socialCheck(action,skill);
 const {cost,target,skill:t}=actionOdds(action);let damage=0;
 const woundCare=/\b(?:bandag\w*|first aid|field dressing)\b|\b(?:bind|tend|dress|treat)\w*\b.{0,45}\b(?:my|your|own|self|wound|injur\w*|cut|bleed)\b|\b(?:my|your|own|self|wound|injur\w*|cut|bleed)\b.{0,45}\b(?:bind|tend|dress|treat)\w*\b/i.test(String(action.text||""));
 if(campaign.racialFocus?.skill===t)campaign.racialFocus=null;
 if(s.en<cost)return null;
 const rolled=1+Math.floor(Math.random()*100),ok=rolled<=target;
 s.en=Math.min(100,s.en-cost+ACTION_RESOURCE_RECOVERY);s.time++; if(!ok&&["stealth","engineering","combat"].includes(t)){s.alert=Math.min(3,s.alert+1);damage=t==="combat"?8:t==="stealth"?3:0;s.hp=Math.max(1,s.hp-damage)}
 let healed=0;
 if(ok&&(t==="rest"||woundCare)){const before=s.hp;s.hp=Math.min(heroHealthCap(),s.hp+4);healed=s.hp-before}
 // Only an explicit successful search can credit one tracked fallen foe.
 const scavenged=scavengeFallenEnemy(action,ok);
 const msg=ok?"Success":"Complication";
 let effect=woundCare?(ok?"You bind your wounds and restore "+healed+" HP; the bleeding subsides.":"Your attempt to bind your wounds fails; no HP is restored."):t==="combat"?(ok?"The immediate opponent is overcome in a single abstract skirmish.":"The opponent remains a threat; Snacky takes "+damage+" damage."):t==="stealth"?(ok?"Snacky remains concealed.":"A noise attracts nearby attention."):t==="engineering"?(ok?"Pippa's mechanism works as intended.":"The apparatus sparks and raises suspicion."):t==="social"?(ok?"The approach is received favorably.":"The target refuses to cooperate."):t==="rest"?(ok?"The party regains composure.":"The party cannot safely rest."):ok?"The action achieves its immediate intent.":"The action encounters resistance.";
 return msg+": d100 roll "+rolled+" vs target "+target+" ("+(ok?"success":"failure")+"). "+effect+(scavenged?" "+scavenged:"")+" Result is authoritative; do not invent additional mechanical effects.";
}
function interfaceUI(){
 if(get("campaign-box"))return;
 const el=document.createElement("section");el.className="panel";el.id="campaign-box";el.style.display="none";
 const progress=document.createElement("p");progress.id="campaign-progress-status";progress.className="soa-pending";progress.hidden=true;progress.setAttribute("role","status");progress.setAttribute("aria-live","polite");
 const scene=document.createElement("div");scene.id="campaign-scene";el.append(progress,scene);
 document.querySelector("header").after(el);
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
 content.append(toggleLabel,start,offline,campaignStatus);disclosure.append(summary,content);
 const settings=get("soa-save-settings");
 if(settings)settings.insertBefore(disclosure,get("export"));
 else document.querySelector("main")?.append(disclosure);
 get("campaign-mode").onchange=e=>{if(e.target.checked){if(campaignLoadBlocked||campaignStorageReadFailed){e.target.checked=false;status("");return}if(!campaign)campaign=make();if(!store()){e.target.checked=false;enabled=false;return}enabled=true;if(!localSet("soa-campaign-enabled","1"))window.soaReportStorageFailure?.("Campaign mode preference could not be saved.");draw();if(navigator.onLine&&(!campaign.scene||pending())){window.soaLayout?.select?.("adventure");advance(campaign.lastAction,campaign.lastResult,true)}}else{enabled=false;if(!localSet("soa-campaign-enabled","0"))window.soaReportStorageFailure?.("Campaign mode preference could not be saved.");document.body.classList.remove("soa-living-mode");get("campaign-scene").replaceChildren();showOriginal(true)}};
 get("campaign-start").onclick=()=>{if(campaignLoadBlocked||campaignStorageReadFailed){selectionFeedback("");return}if(!campaign)campaign=make();if(!store())return;enabled=true;get("campaign-mode").checked=true;if(!localSet("soa-campaign-enabled","1"))window.soaReportStorageFailure?.("Campaign mode preference could not be saved.");draw();if(!accessCode()){focusAccess();selectionFeedback("Enter your private AI access code in Settings to continue. Your choice has not been spent.");return}window.soaLayout?.select?.("adventure");if(pending()||!campaign.scene)advance(campaign.lastAction,campaign.lastResult,true);else{status("Saved scene ready. Choose your next action below.");refreshDisplay()}};
 get("campaign-offline").onclick=()=>{enabled=false;document.body.classList.remove("soa-living-mode");get("campaign-mode").checked=false;if(!localSet("soa-campaign-enabled","0"))window.soaReportStorageFailure?.("Campaign mode preference could not be saved.");showOriginal(true);get("campaign-status").textContent="Offline scripted adventure enabled.";window.soaLayout?.select?.("adventure")};
}
function showOriginal(show){const campaignBox=get("campaign-box");if(campaignBox)campaignBox.style.display=show?"none":"";if(window.soaCharacters?.isNewCharacter?.())show=false;for(const el of document.querySelectorAll("main > section.panel")){if(el.id==="campaign-box")continue;const isStory=!!el.querySelector("#choices");if(isStory)el.style.display=show?"":"none"}}
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
 const challengeMount=get("soa-dungeons-controls");
 if(!campaign.scene){
  status(statusMessage||"Ready to generate the next scene.");
  if(challengeMount){challengeMount.replaceChildren();const arenaPanel=window.soaArena?.panel?.(campaign,s,window.soaCharacters?.profile?.(),choose,busy||!!pending());if(arenaPanel)challengeMount.append(arenaPanel);const dungeonPanel=window.soaDungeons?.panel?.(campaign,s,window.soaCharacters?.profile?.(),window.soaProgression?.level?.()||1,choose,busy||!!pending());if(dungeonPanel)challengeMount.append(dungeonPanel)}
  window.soaLayout?.refresh?.();return
 }
 const activeChallenge=!!(window.soaDungeons?.current?.(campaign)||window.soaArena?.current?.(campaign));
 if(challengeMount)challengeMount.replaceChildren();
 const gameplayPanel=activeChallenge&&challengeMount?challengeMount:box;
 const sc=campaign.scene,head=document.createElement("h3"),where=document.createElement("div"),text=document.createElement("p");
 reconcileAuthorizedMissionReward();
 const questPanel=window.soaQuests?.panel?.(campaign,sc.location,()=>s.money,(result)=>{if(result?.error){status(result.error);return}if(Number.isSafeInteger(result?.wallet)){s.money=result.wallet;save()}store();render();draw();status(result?.description||result?.message||"Contract updated.");}) || null;
 const transition=window.soaChronicle?.banner?.(campaign);if(transition)box.append(transition);
 const kicker=document.createElement("div");kicker.className="soa-scene-kicker";const position=window.soaChronicle?.progress?.(campaign);kicker.textContent=position?"ACT "+position.actRoman+" · "+position.actTitle:"YOUR ADVENTURE";box.append(kicker);
 if(position){const chapter=document.createElement("p");chapter.className="soa-story-chapter";chapter.textContent="Chapter "+position.chapterRoman+" — "+position.chapterTitle;box.append(chapter)}
 head.textContent=position?.sceneTitle||sc.title||"The Current Scene";where.className="muted";where.textContent=sc.location||"Current Location";text.className="soa-story-prose";text.style.whiteSpace="pre-line";text.textContent=readableStory(sc.story);box.append(head,where,text);
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
 const crafting=window.soaCrafting?.panel?.(campaign,{wallet:()=>s.money,locked:busy||!!pending()||campaignSaveFailed,choose,commit:operation=>{
  if(busy||pending()||window.soaSaveRules.isIntegrityBlocked())return;
  const before=structuredClone(campaign),oldMoney=s.money,result=operation();
  if(result?.error){status(result.error);window.alert(result.error);return}
  if(Number.isSafeInteger(result?.wallet))s.money=result.wallet;
  if(!save()||!store()){campaign=before;s.money=oldMoney;save();store();status("Crafting change could not be saved; no materials or items committed.");refreshDisplay();return}
  refreshDisplay();status(result.message);
 }});
 const enchanting=window.soaEnchanting?.panel?.(campaign,sc.location,()=>s.money,(result)=>{if(Number.isSafeInteger(result?.wallet)){s.money=result.wallet;save()}store();render();draw();status(result?.message||"Enchanting updated.")});
 let toolsPanel=get("soa-character-tools");
 if(gear||enchanting||crafting){
  if(!toolsPanel){toolsPanel=document.createElement("section");toolsPanel.id="soa-character-tools";toolsPanel.className="panel"}
  toolsPanel.replaceChildren();const toolsHeading=document.createElement("h2");toolsHeading.textContent="Loadout & Equipment";toolsPanel.append(toolsHeading);
  if(gear)toolsPanel.append(gear);if(crafting)toolsPanel.append(crafting);if(enchanting)toolsPanel.append(enchanting);
  const characterScreen=get("soa-character-screen"),main=document.querySelector("main");
  if(characterScreen)characterScreen.after(toolsPanel);else if(main)main.append(toolsPanel);
 }else toolsPanel?.remove();
 window.soaLayout?.refresh?.();
 if(/\\b(?:coins?|silver|gold|copper|retainer|payment|payout|reward|stipend|wages)\\b/i.test(sc.story||"")&&/\\b(?:hands? (?:over|you)|slides? (?:an? |the )?(?:iron-bound )?(?:lockbox|coins?)|paid|pays|receiv(?:e|ed)|collect(?:ed)?|claim(?:ed)?|authorized|rewarded)\\b/i.test(sc.story||"")&&!campaign.lastPayment){
  const notice=document.createElement("p");notice.className="soa-level-toast";
  notice.textContent="Payment mentioned in narration · Amount not verified · No currency credited by the game engine.";
  box.append(notice);
 }
 const lootText=String(campaign.lastResult||"").match(/Loot: found ([^.]+)\. Wallet now ([^.]+)\./);
 if(lootText){const notice=document.createElement("p");notice.className="soa-level-toast";notice.textContent="COINS FOUND · "+lootText[1]+" · Wallet "+lootText[2];box.append(notice)}
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

 drawEnemyStatus(gameplayPanel);
 drawRacialActions(gameplayPanel);
 const druidStatusPanel=window.soaCharacters?.profile?.()?.className==="Druid"&&window.soaDruid?window.soaDruid.panel(s,campaign,window.soaCharacters.profile(),window.soaProgression?.level?.()||1,choose,busy||!!pending()):null;
 if(druidStatusPanel)gameplayPanel.append(druidStatusPanel);
 if(!livingEnemies().length&&sc.choices?.some(choice=>choice.type==="combat")){
  const cue=document.createElement("p");cue.className="soa-precombat-cue";
  cue.textContent="Spell choices can affect visible obstacles or yourself without an enemy. An opening attack on a visible foe begins combat and resolves one exchange.";
  gameplayPanel.append(cue);
 }
 if(!druidStatusPanel){
  const reserve=document.createElement("section");reserve.className="soa-choice-resource";reserve.dataset.resource=resourceKey();reserve.setAttribute("aria-label","Current "+resourceName());
  const reserveHeading=document.createElement("div");reserveHeading.className="soa-choice-resource-heading";
  const reserveLabel=document.createElement("strong");reserveLabel.textContent="CURRENT "+resourceName().toUpperCase();
  const reserveValue=document.createElement("span"),reserveCurrent=Math.max(0,Math.min(100,Number(s.en)||0));reserveValue.textContent=reserveCurrent+" / 100";reserveHeading.append(reserveLabel,reserveValue);
  const reserveTrack=document.createElement("div");reserveTrack.className="soa-choice-resource-track";reserveTrack.dataset.resource=resourceKey();reserveTrack.setAttribute("role","progressbar");reserveTrack.setAttribute("aria-label",resourceName()+" reserve");reserveTrack.setAttribute("aria-valuemin","0");reserveTrack.setAttribute("aria-valuemax","100");reserveTrack.setAttribute("aria-valuenow",String(reserveCurrent));
  const reserveFill=document.createElement("div");reserveFill.className="soa-choice-resource-fill";reserveFill.style.width=reserveCurrent+"%";reserveTrack.append(reserveFill);
  const reserveHint=document.createElement("small");reserveHint.textContent="Combat exchanges and other actions restore up to +25 "+resourceName()+" (maximum 100). Costs below show your projected balance.";
  reserve.append(reserveHeading,reserveTrack,reserveHint);gameplayPanel.append(reserve);
 }
 const arenaPanel=window.soaArena?.panel?.(campaign,s,window.soaCharacters?.profile?.(),choose,busy||!!pending());if(arenaPanel)challengeMount?.append(arenaPanel);
 const dungeonPanel=window.soaDungeons?.panel?.(campaign,s,window.soaCharacters?.profile?.(),window.soaProgression?.level?.()||1,choose,busy||!!pending());if(dungeonPanel)challengeMount?.append(dungeonPanel);
 const choicesHeader=document.createElement("div");choicesHeader.className="soa-choices-heading";
 if(activeChallenge){const cue=document.createElement("p");cue.className="soa-precombat-cue";cue.textContent="Your expedition or arena bout is active. Continue the encounter in Dungeons.";box.append(cue);drawCombatActions(gameplayPanel);const foot=document.createElement("p");foot.className="muted soa-scene-footer";foot.textContent="Turn "+campaign.turn+" · Local challenge progress saved on this device";gameplayPanel.append(foot);return;}
 const title=document.createElement("strong");title.textContent="Choose your next move";
 const count=document.createElement("span");count.textContent=sc.choices.length+" story paths"+(livingEnemies().length?" · combat actions above":" + resources + custom");
 choicesHeader.append(title,count);box.append(choicesHeader);
 drawCombatActions(box);
 for(const [index,choice] of sc.choices.entries()){const displayedChoice=window.soaStoryActions?playableStoryChoice(choice,index):canonicalStoryChoice(choice);const b=document.createElement("button");b.type="button";b.className=displayedChoice.difficulty==="easy"?"low":displayedChoice.difficulty==="hard"?"high":"med";const headline=document.createElement("strong"),detail=document.createElement("small");headline.textContent=String.fromCharCode(65+index)+") "+displayedChoice.text;headline.style.display="block";const preview=dicePreview(displayedChoice);
 detail.textContent=(displayedChoice.difficulty||"medium")+" difficulty · "+(socialSkill(displayedChoice)||displayedChoice.type||"investigate");
 const rollLine=document.createElement("span");rollLine.className="soa-roll-preview";rollLine.textContent=preview.primary;
 const rollHint=document.createElement("span");rollHint.className="soa-roll-hint";rollHint.textContent=preview.secondary;const transaction=document.createElement("span");transaction.className="soa-choice-resource-transaction";transaction.textContent=resourceForecast(displayedChoice).text;detail.style.cssText="display:block;margin-top:5px;color:#bccbd6;font:12px system-ui;text-transform:capitalize";b.append(headline,detail,rollLine,rollHint,transaction);b.disabled=busy||!!pending();b.onclick=()=>choose(displayedChoice);box.append(b)}
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
 input.id="campaign-custom-action";input.className="ai-input";input.maxLength=300;input.required=true;input.rows=3;input.placeholder="Take a custom action, and command your journey";input.value=customDraft;input.disabled=busy||!!pending();
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
 const foot=document.createElement("p");foot.className="muted soa-scene-footer";foot.textContent="Turn "+campaign.turn+" · Saved on this device · "+(navigator.onLine?"Online":"Offline reading");box.append(foot)
}
async function chooseDungeon(choice){
 if(busy)return;busy=true;
 const engine=window.soaDungeons,hero=window.soaCharacters.profile(),level=window.soaProgression?.level?.()||hero.startLevel||1;
 const before={s:structuredClone(s),c:structuredClone(campaign),selected:selectedCombatTarget},roundBefore=Number(campaign.combatRound)||0,oldEnergy=s.en;
 const rollback=message=>{s=before.s;campaign=before.c;selectedCombatTarget=before.selected;status(message);refreshDisplay();};
 let resolution,out,spent=true;
 try{
  if(choice.dungeonAction){out=engine.command(campaign,s,choice,hero,level);if(out.error){rollback(out.error);return;}resolution="Success: "+out.message;spent=out.spent;
   if(out.startEncounter){if(campaign.xpEncounter?.active){const award=concludeProgressionEncounter(true);if(award?.storageWarning){rollback("Victory experience could not be saved. Retry after restoring storage.");return;}campaign.xpEncounter.active=false;}selectedCombatTarget=null;startProgressionEncounter();}
   if(out.abandonEncounter){if(campaign.xpEncounter?.active){const award=concludeProgressionEncounter();if(award?.storageWarning){rollback("Victory experience could not be saved. Retry after restoring storage.");return;}campaign.xpEncounter.active=false;campaign.xpEncounter.abandoned=true;}selectedCombatTarget=null;}
  }else{
   const run=engine.current(campaign);if(!run||run.status==="failed"){rollback("This expedition cannot continue. Retreat first.");return;}
   const intent=window.soaStoryActions?storyActionPlan(choice):null,shift=window.soaDruid?.shiftFrom?.(choice);
   if(intent?.error||intent?.kind==="opening"||choice.type==="druid_quest"||choice.craftRecipe||(!["combat","racial"].includes(choice.type)&&shift==null&&!intent?.ability)){rollback(intent?.error||"Use the dungeon controls, learned spells or combat actions to continue.");return;}
   const cost=window.soaDruid?.current?.()?resourceForecast(choice).cost:0;
   resolution=result(choice);if(!resolution){rollback("That action is unavailable. No turn spent.");return;}
   if(window.soaDruid?.current?.()&&campaign.druidResolvedTime!==s.time){s.en=oldEnergy;window.soaDruid.recover(s,{cost,hit:campaign.lastExchange?.hit===true,taken:campaign.lastExchange?.taken||0,takenHits:campaign.lastExchange?.enemyAttacks?.filter(row=>row.recipient===hero.name&&!row.skipped).length,combat:livingEnemies().length>0});}
   const tick=window.soaDruid?.tickRejuvenation?.(s);if(tick){resolution+=" "+tick.message;if(campaign.lastExchange&&campaign.combatRound>roundBefore){campaign.lastExchange.healed=(campaign.lastExchange.healed||0)+tick.amount;campaign.lastExchange.heroAfter=s.hp;}}
   if((Number(campaign.combatRound)||0)>roundBefore){const partyAction=engine.resolveParty?.(campaign,s,campaign.lastExchange,hero,window.soaCombatRules);if(partyAction)resolution+=" Adventurers: "+partyAction;if(selectedCombatTarget&&!livingEnemies().some(enemy=>enemy.name===selectedCombatTarget))selectedCombatTarget=livingEnemies()[0]?.name||null;out=engine.settle(campaign,s,campaign.lastExchange);if(out.error){rollback(out.error);return;}if(out.message)resolution+=" "+out.message;}
  }
  if(choice.dungeonAction){const tick=window.soaDruid?.tickRejuvenation?.(s);if(tick)resolution+=" "+tick.message;}
  if(spent){campaign.turn++;campaign.actionSerial=(Number(campaign.actionSerial)||0)+1;}
  campaign.lastAction=String(choice.text||choice.dungeonAction||"Dungeon action");campaign.lastResult=resolution;
  campaign.history.push("Dungeon: "+campaign.lastAction+" | "+resolution);campaign.history=campaign.history.slice(-MAX);
  window.soaChronicle?.receive?.(campaign,campaign.scene);
  if(!(save()&&store())){rollback("Dungeon action could not be saved. No turn committed; retry after restoring storage.");save();store();return;}
  if(out?.waveCleared)concludeProgressionEncounter();
  store();window.soaChronicle?.render?.(campaign);refreshDisplay();status(resolution);returnToDungeons();
 }catch(error){rollback("Dungeon action could not be completed: "+error.message+". No turn committed.");}
 finally{busy=false;refreshDisplay();}
}
async function chooseArena(choice){
 if(busy)return;busy=true;
 const engine=window.soaArena,hero=window.soaCharacters.profile(),level=window.soaProgression?.level?.()||hero.startLevel||1;
 const before={s:structuredClone(s),c:structuredClone(campaign),selected:selectedCombatTarget},roundBefore=Number(campaign.combatRound)||0,oldEnergy=s.en;
 const rollback=message=>{s=before.s;campaign=before.c;selectedCombatTarget=before.selected;status(message);refreshDisplay();};
 let resolution,out,spent=true;
 try{
  if(choice.arenaAction){out=engine.command(campaign,s,choice,hero,level);if(out.error){rollback(out.error);return;}resolution="Success: "+out.message;spent=out.spent;
   if(out.startEncounter){if(campaign.xpEncounter?.active){if(campaign.xpEncounter.pendingVictory)concludeProgressionEncounter(true);campaign.xpEncounter.active=false;}selectedCombatTarget=campaign.enemies.find(e=>e.hp>0)?.name||null;startProgressionEncounter();}
   if(out.abandonEncounter)selectedCombatTarget=null;
  }else{
   const active=engine.current(campaign);if(!active||active.status!=="fighting"){rollback("Use the arena board to start a bout or leave the challenge.");return;}
   const intent=window.soaStoryActions?storyActionPlan(choice):null,shift=window.soaDruid?.shiftFrom?.(choice);
   if(intent?.error||intent?.kind==="opening"||choice.type==="druid_quest"||choice.craftRecipe||(!["combat","racial"].includes(choice.type)&&shift==null&&!intent?.ability)){rollback(intent?.error||"Use learned spells or combat actions during an arena bout.");return;}
   const cost=window.soaDruid?.current?.()?resourceForecast(choice).cost:0;
   resolution=result(choice);if(!resolution){rollback("That action is unavailable. No turn spent.");return;}
   if(window.soaDruid?.current?.()&&campaign.druidResolvedTime!==s.time){s.en=oldEnergy;window.soaDruid.recover(s,{cost,hit:campaign.lastExchange?.hit===true,taken:campaign.lastExchange?.taken||0,takenHits:campaign.lastExchange?.enemyAttacks?.filter(row=>row.damage>0&&row.recipient===hero.name).length,combat:livingEnemies().length>0});}
   const tick=window.soaDruid?.tickRejuvenation?.(s);if(tick){resolution+=" "+tick.message;if(campaign.lastExchange&&campaign.combatRound>roundBefore){campaign.lastExchange.healed=(campaign.lastExchange.healed||0)+tick.amount;campaign.lastExchange.heroAfter=s.hp;}}
   if((Number(campaign.combatRound)||0)>roundBefore){out=engine.settle(campaign,s,campaign.lastExchange);if(out.error){rollback(out.error);return;}if(out.message)resolution+=" "+out.message;if(out.lost)selectedCombatTarget=null;}
  }
  if(choice.arenaAction){const tick=window.soaDruid?.tickRejuvenation?.(s);if(tick)resolution+=" "+tick.message;}
  if(spent){campaign.turn++;campaign.actionSerial=(Number(campaign.actionSerial)||0)+1;}
  campaign.lastAction=String(choice.text||choice.arenaAction||"Arena action");campaign.lastResult=resolution;
  campaign.history.push("Arena: "+campaign.lastAction+" | "+resolution);campaign.history=campaign.history.slice(-MAX);
  window.soaChronicle?.receive?.(campaign,campaign.scene);
  if(!(save()&&store())){rollback("Arena action could not be saved. No turn committed; retry after restoring storage.");save();store();return;}
  if(out?.waveCleared)concludeProgressionEncounter();
  store();window.soaChronicle?.render?.(campaign);refreshDisplay();status(resolution);returnToDungeons();
 }catch(error){rollback("Arena action could not be completed: "+error.message+". No turn committed.");}
 finally{busy=false;refreshDisplay();}
}
async function choose(choice){
 const selectionFeedback=message=>{status(message,true);returnToAdventure("status")};
 if(busy||pending())return;
 if(window.soaSaveRules.isIntegrityBlocked()){selectionFeedback("Saved data could not be read. Restore a valid backup before continuing.");return}
 if(campaignLoadBlocked||campaignStorageReadFailed){status("");return}
 if(campaignSaveFailed&&!store()){draw();selectionFeedback("Campaign save failed. Retry saving before continuing.");return}
 if(window.soaDungeons&&(choice.dungeonAction||window.soaDungeons.current(campaign)))return chooseDungeon(choice);
 if(window.soaArena&&(choice.arenaAction||window.soaArena.current(campaign)))return chooseArena(choice);
 if(!navigator.onLine){selectionFeedback("Offline: your saved scene is available. Reconnect to generate another.");return}
 if(!accessCode()){focusAccess();return}
 const detected=dialogueFromCustom(choice);if((detected||socialSkill(choice))&&choice.custom&&choice.type==="investigate")choice={...choice,type:"social"};
 const intent=window.soaStoryActions?storyActionPlan(choice):null;
 if(intent?.error){selectionFeedback(intent.error+" No action spent.");return}
 const storyBefore=intent?{s:structuredClone(s),c:structuredClone(campaign),selected:selectedCombatTarget}:null;
 if(intent?.kind==="opening"){
  campaign.enemies=[{...intent.target}];campaign.enemyLocation=String(campaign.scene?.location||"");
  if(campaign.xpEncounter?.active){if(campaign.xpEncounter.pendingVictory)concludeProgressionEncounter(true);else campaign.xpEncounter.active=false;}
  startProgressionEncounter();selectedCombatTarget=intent.target.name;
 }
 const storyAbility=resolvedStoryVanish(choice),routeCombat=intent&&["opening","combat"].includes(intent.kind),resolvingChoice=intent?.kind==="shift"?{...choice,type:intent.combat?"combat":"move",form:intent.form,ability:"shift_"+intent.form}:routeCombat?{...choice,type:"combat",ability:intent.ability?.id||choice.ability||"strike"}:storyAbility&&livingEnemies().length?{...choice,type:"combat",ability:storyAbility}:choice;
 const combatRoundBefore=Number(campaign.combatRound)||0;
 const craftingBefore=choice.craftRecipe?{s:structuredClone(s),c:structuredClone(campaign)}:null;
 const druidBefore=window.soaDruid?.current?.()?{s:structuredClone(s),c:structuredClone(campaign),energy:s.en,cost:resourceForecast(resolvingChoice).cost}:null;
 let resolution=result(resolvingChoice);
 if(resolution&&druidBefore&&campaign.druidResolvedTime!==s.time){s.en=druidBefore.energy;window.soaDruid.recover(s,{cost:druidBefore.cost,hit:(Number(campaign.combatRound)||0)>combatRoundBefore&&campaign.lastExchange?.hit===true,taken:(Number(campaign.combatRound)||0)>combatRoundBefore?campaign.lastExchange?.taken||0:0,takenHits:(Number(campaign.combatRound)||0)>combatRoundBefore?campaign.lastExchange?.enemyAttacks?.filter(row=>row.damage>0&&row.recipient===window.soaCharacters.profile().name).length:0,combat:livingEnemies().length>0});}
 
 if(resolution&&druidBefore){const tick=window.soaDruid.tickRejuvenation(s);if(tick){resolution+=" "+tick.message;
  if((Number(campaign.combatRound)||0)>combatRoundBefore&&campaign.lastExchange){const exchange=campaign.lastExchange;exchange.healed=(exchange.healed||0)+tick.amount;exchange.heroAfter=s.hp;if(exchange.recipient===window.soaCharacters.profile().name)exchange.recipientAfter=s.hp;
   const row=campaign.combatLog?.at(-1);if(row)row.events.push({name:window.soaCharacters.profile().name,side:"ally",delta:tick.amount,after:s.hp,maxHp:heroHealthCap()});
  }
 }}
 if(!resolution){if(storyBefore){s=storyBefore.s;campaign=storyBefore.c;selectedCombatTarget=storyBefore.selected;return}selectionFeedback("That choice could not be resolved. No turn was spent; choose another action.");return}
 if(druidBefore&&window.soaDruid.current()?.effects?.dashActions>0)window.soaDruid.current().effects.dashActions--;
 const combatRoundAfter=Number(campaign.combatRound)||0;
 campaign.lastProgression="";
 campaign.actionSerial=(Number(campaign.actionSerial)||0)+1;
 const actionReceipt="turn-"+campaign.turn+"-action-"+campaign.actionSerial;
 recordActionPractice(resolvingChoice,resolution,actionReceipt);
 campaign.lastAction=safe(choice.text);campaign.lastResult=resolution;
 campaign.pending={action:campaign.lastAction,resolution,startedAt:Date.now(),dialogue:detected,survey:choice.survey===true,combat:resolvingChoice.type==="combat",combatRoundBefore,combatRoundAfter,combatExchangeResolved:resolvingChoice.type==="combat"&&combatRoundAfter>combatRoundBefore,actionReceipt};
 campaign.history.push("At "+safe(campaign.scene?.location||"unknown location")+": Player: "+campaign.lastAction+" | "+resolution);
 campaign.history=campaign.history.slice(-MAX);const beforeAction=storyBefore||craftingBefore||druidBefore,saved=beforeAction?(save()&&store()):store();if(!saved&&beforeAction){s=beforeAction.s;campaign=beforeAction.c;if(storyBefore)selectedCombatTarget=storyBefore.selected;save();store();status("Action could not be saved. No turn committed; retry after restoring device storage.");refreshDisplay();return;}refreshDisplay();if(!saved)return;
 // Release the iPhone keyboard and return to the story while Gemini works.
 if(choice.custom&&document.activeElement?.blur)document.activeElement.blur();
 returnToAdventure("status");
 await advance(campaign.lastAction,resolution,false);
}
async function advance(action,resolution,retry){
 if(window.soaDungeons?.current?.(campaign)){status("The dungeon encounter is resolved locally. Use the dungeon board to continue the expedition.");draw();return}
 if(window.soaSaveRules.isIntegrityBlocked()){status("Saved data could not be read. Restore a valid backup before continuing.");return}
 if(busy)return;if(!navigator.onLine){get("campaign-status").textContent="Offline: saved scene available; new scenes require internet.";draw();return}
 const code=accessCode();
 if(!code){focusAccess();draw();return}
 busy=true;status("Gemini is writing the next scene…");draw();returnToAdventure("status");
 let requestTimeout,progressNotice;
 try{
 const controller=new AbortController();requestTimeout=setTimeout(()=>controller.abort(),85000);
 progressNotice=setTimeout(()=>{if(busy){status("Gemini is still generating the scene. Your action is saved; please keep this page open.");returnToAdventure("status")}},20000);
 const response=await fetch("./api/campaign",{method:"POST",headers:{"content-type":"application/json","x-story-access":code},signal:controller.signal,body:JSON.stringify({context:{location:campaign.scene?.location||(window.soaCharacters?.profile?.()?.startingZone||"Current starting area"),previousTitle:campaign.scene?.title||"",previousScene:campaign.scene?.story||"",campaignOrigin:originOfCampaign(),startingZone:window.soaCharacters?.profile?.()?.startingZone||null,recentDiscoveries:campaign.journal.slice(-12),action,resolution,hp:s.hp,energy:s.en,resourceLabel:resourceName(),druid:window.soaDruid?.context?.()||null,gold:fmtMoney(s.money),alarm:s.alert,turn:campaign.turn,history:campaign.history.slice(-20),flags:Object.keys(s.flags||{}),companionMoments:window.soaCompanions?.getRecent?.()||[],companionProfiles:window.soaCompanions?.getProfiles?.()||{},relationships:window.soaCompanions?.getRelationships?.()||{},conversationContext:window.soaCompanions?.getConversationContext?.()||{},character:window.soaCharacters?.profile?.()||null,abilityScores:window.soaAbilities?.get?.("hero")?.stats||null,reputation:window.soaReputation?.getStandings?.()||{},reputationDevelopments:window.soaReputation?.getDevelopments?.()||[],enemies:livingEnemies().map(e=>({name:e.name,hp:e.hp,maxHp:e.maxHp})),allies:combatParty().map(e=>({name:e.name,hp:e.hp,maxHp:e.maxHp})),questRewards:{last:campaign.quests?.lastReward||null,activeMissions:Object.entries(campaign.quests?.missions||{}).filter(([,v])=>v.state!=="claimed").map(([id,v])=>({id,state:v.state}))},combatAction:campaign.pending?.combatExchangeResolved===true&&campaign.xpEncounter?.active===true,
encounterId:campaign.pending?.combatExchangeResolved===true?campaign.xpEncounter?.id||null:null,
combatRound:Number(campaign.combatRound)||0,
combatLog:campaign.pending?.combatExchangeResolved===true?(campaign.combatLog||[]).filter(row=>row.encounterId===campaign.xpEncounter?.id).slice(-3):[],
lastExchange:campaign.pending?.combatExchangeResolved===true&&campaign.lastExchange?.encounterId===campaign.xpEncounter?.id&&campaign.lastExchange?.round===campaign.pending?.combatRoundAfter?campaign.lastExchange:null,chronicle:window.soaChronicle?.context?.(campaign)||null,resourceSurvey:campaign.pending?.survey===true}})});
 const data=await response.json().catch(()=>({error:"Invalid server response"}));if(window.soaSaveRules.isIntegrityBlocked()){status("Saved data could not be read. The pending scene was not applied; restore a valid backup before continuing.");return}if(!response.ok){if(response.status===401||response.status===403||response.status>=500)window.soaAiDirector?.showSetup?.(data.error||"AI connection needs attention.");const requestError=Error(data.error||"Request failed");if(response.status===409)requestError.name="ContinuityError";throw requestError};
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
 }catch(e){const continuityFailure=e.name==="ContinuityError";if(e.name==="AbortError"||e instanceof TypeError)window.soaAiDirector?.showSetup?.("AI connection needs attention. Your selection is saved and can be retried.");campaign.lastError=e.name==="AbortError"?"Story request timed out":continuityFailure?"Story continuity check failed":"AI request failed";store();status(e.name==="AbortError"?"The story request timed out. Your selection is saved; tap Retry generating next scene. It will not spend "+resourceName()+" twice.":continuityFailure?"Continuity check stopped this scene: "+e.message+" Your last action is preserved; tap Retry generating next scene. It will not spend "+resourceName()+" twice.":"AI unavailable: "+e.message+". Your last action is preserved. Tap Retry generating next scene; it will not spend "+resourceName()+" twice.")}finally{clearTimeout(requestTimeout);clearTimeout(progressNotice);busy=false;refreshDisplay();returnToAdventure(campaign?.lastError?"status":"scene")}
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
window.soaDruid?.bind?.({state:()=>s,campaign:()=>campaign});
if(window.soaCharacters?.profile?.()?.className==="Druid")window.soaDruid?.state?.(s);
function repairLegacyEncounterBoundary(){
 const encounter=campaign?.xpEncounter;
 if(!encounter?.active||!encounter.pendingVictory||!livingEnemies().length)return;
 const abilityId=String(campaign.lastExchange?.ability||"");
 const abilityIdName=abilityId.replaceAll("_"," ").toLowerCase();
 const hero=window.soaCharacters?.profile?.(),level=window.soaProgression?.level?.()||hero?.startLevel||1;
 const abilityName=window.soaClassAbilities?.get?.(abilityId,hero?.className,level)?.name?.toLowerCase()||"";
 const selected=(String(campaign.lastAction||"")+" "+String(campaign.lastResult||"")).toLowerCase();
 if([abilityIdName,abilityName].some(name=>name&&selected.includes(name))){encounter.pendingVictory=false;return}
 concludeProgressionEncounter(true);
 resetEncounterCombatState();
}
repairLegacyEncounterBoundary();
enabled=localGet("soa-campaign-enabled")==="1"&&!campaignLoadBlocked&&!campaignStorageReadFailed;let campaignReady=true;if(campaign){window.soaChronicle?.attach?.(campaign);campaignReady=store();window.soaChronicle?.render?.(campaign)}window.soaChronicleSetSave?.(store);interfaceUI();get("campaign-mode").checked=enabled;
if(campaignLoadBlocked||campaignStorageReadFailed){status("")}else if(enabled){if(!campaign){campaign=make();campaignReady=store()}draw();if(campaignReady&&!campaign.scene&&navigator.onLine)advance(campaign.lastAction,campaign.lastResult,true)}
window.soaLivingCampaign={getState:()=>campaign,enabled:()=>enabled,persist:store,refreshUI:()=>{draw();window.soaCharacters?.refreshProfessions?.()}};})();

