(()=>{"use strict";
// Turn-based adaptation: levels follow Classic; additional form rites are SoA quests.
const FORMS={
 caster:{name:"Humanoid",level:1,resource:"mana",ac:0,description:"Weapons, nature spells and healing."},
 bear:{name:"Bear",level:10,resource:"rage",ac:3,description:"Thick hide: +3 AC. Rage comes from fighting, not passive recovery."},
 aquatic:{name:"Aquatic",level:16,resource:"mana",ac:0,water:true,utility:true,description:"Underwater breathing; +20 to swimming checks. No attacks or spells."},
 cat:{name:"Cat",level:20,resource:"energy",ac:1,description:"+1 AC; Energy, Prowl and target-bound combo points."},
 travel:{name:"Travel",level:30,resource:"mana",ac:0,outdoors:true,utility:true,description:"+15 to land movement checks outdoors. No attacks or spells."},
 dire_bear:{name:"Dire Bear",level:40,resource:"rage",ac:5,requires:"bear",description:"Improved bear: +5 AC and +2 melee damage; shares Bear techniques."},
 moonkin:{name:"Moonkin",level:40,resource:"mana",ac:3,spec:"Balance",description:"+3 AC; +3 spell damage. Nature and Arcane spells, no healing."},
 tree:{name:"Tree of Life",level:40,resource:"mana",ac:1,spec:"Restoration",description:"Healing costs 5 less Mana and restores 3 extra HP. No offensive spells."},
 flight:{name:"Flight",level:60,resource:"mana",ac:0,outdoors:true,utility:true,noCombat:true,description:"SoA level-60 capstone: +25 to aerial movement checks outdoors. Cannot enter during combat or attack."}
};
const SKY={caster:"Humanoid",bear:"Ironfeather Guardian",dire_bear:"Great Ironfeather Guardian",cat:"Windstalker Raptor",aquatic:"Tidewing Diver",travel:"Swiftstrider",moonkin:"Astral Owl",tree:"Living Aerie",flight:"Stormwing"};
const MENTOR=/\b(?:moonglade|nighthaven|darnassus|thunder bluff)\b/i;
const step=(text,region,kind="check",extra={})=>({text,region,kind,...extra});
const QUESTS={
 bear:{title:"Body and Heart",source:"Classic-inspired",steps:[step("Speak with the Great Bear Spirit in Moonglade",/moonglade|great bear spirit/i,"check"),step("Face Lunaclaw in Moonkin Stone clearing",/moonkin stone|darkshore|mulgore/i,"combat",{target:"Lunaclaw"})]},
 aquatic:{title:"Trial of the Sea Lion",source:"Classic-inspired",steps:[step("Recover the first pendant half from the waters of Lake Elune'ara",/lake elune.?ara|moonglade.*lake/i),step("Recover the second pendant half from the coastal shrine",/darkshore.*(?:coast|sea)|silverpine.*(?:coast|sea)|westfall.*(?:coast|sea)|sea lion shrine/i),step("Join the pendant at the Shrine of Remulos",/shrine of remulos|moonglade/i,"ritual")]},
 cat:{title:"The Great Cat Spirit",source:"Forever-inspired",requires:"bear",steps:[step("Recover the Relic of Instinct in Stormrage Barrow Den",/stormrage barrow den/i),step("Recover the Relic of Grace in Stormrage Barrow Den",/stormrage barrow den/i),step("Recover the Relic of Ferocity in Stormrage Barrow Den",/stormrage barrow den/i)]},
 travel:{title:"Trial of the Open Wilds",source:"SoA custom rite",requires:"cat",steps:[step("Follow the swift spirit across the Barrens or Ashenvale",/barrens|ashenvale/i),step("Cross the wind-carved ridge without disturbing the herd",/barrens.*ridge|ashenvale.*ridge|wind.carved ridge/i)]},
 dire_bear:{title:"The Elder Guardian",source:"SoA custom rite",requires:"bear",steps:[step("Seek the elder bear spirit in Felwood",/felwood/i),step("Withstand the Elder Guardian's trial",/felwood|elder guardian/i,"combat",{target:"Elder Guardian"})]},
 moonkin:{title:"Balance of Sun and Moon",source:"SoA custom rite",steps:[step("Attune to the lunar shrine in Moonglade",/moonglade|lunar shrine/i),step("Balance the solar focus in Winterspring",/winterspring/i)]},
 tree:{title:"Roots of Renewal",source:"SoA custom rite",steps:[step("Gather a living seed from the protected grove in Moonglade",/moonglade/i),step("Renew the blighted grove in Felwood",/felwood/i)]},
 flight:{title:"Wings of the Wild",source:"SoA custom capstone (not a Classic unlock)",requires:"travel",steps:[step("Study the wind spirits at the summit of Mount Hyjal",/mount hyjal.*(?:summit|peak)|hyjal summit/i),step("Complete the final wind trial at the summit",/mount hyjal.*(?:summit|peak)|hyjal summit/i)]}
};
const A=(id,name,level,cost,effect,stat,die,flat,forms,extra={})=>({id,name,level,cost,effect,stat,die,flat,forms,damageType:"slashing",cooldown:0,description:name,...extra});
const BEARS=["bear","dire_bear"];
const KIT=[
 A("maul","Maul",10,15,"damage","STR",8,5,BEARS,{description:"A heavy claw strike; costs 15 Rage."}),
 A("demoralizing_roar","Demoralizing Roar",10,10,"guard","STR",0,0,BEARS,{cooldown:3,roar:true,description:"All foes suffer -3 attack for three exchanges."}),
 A("enrage","Enrage",12,0,"guard","STR",0,0,BEARS,{cooldown:5,enrage:true,description:"Gain 20 Rage; lose 2 AC for two exchanges."}),
 A("bash","Bash",14,10,"interrupt","STR",6,3,BEARS,{cooldown:3,description:"A successful hit stuns the target for this retaliation."}),
 A("swipe","Swipe",16,20,"damage","STR",6,3,BEARS,{aoe:true,description:"Separate attack rolls against up to three living foes."}),
 A("challenging_roar","Challenging Roar",28,15,"guard","STR",0,0,BEARS,{cooldown:5,challenge:true,description:"Draw hostile attention and gain +3 AC for two exchanges."}),
 A("frenzied_regeneration","Frenzied Regeneration",36,30,"heal","CON",8,7,BEARS,{cooldown:4,description:"Convert 30 Rage into immediate healing."}),
 A("claw","Claw",20,40,"damage","DEX",8,5,["cat"],{builder:true,description:"A claw strike; a hit builds one combo point."}),
 A("rip","Rip",20,30,"damage","DEX",4,1,["cat"],{finisher:true,bleed:true,description:"Consume 1–5 combo points to apply a three-round bleed."}),
 A("prowl","Prowl",20,0,"guard","DEX",0,0,["cat"],{outOfCombat:true,prowl:true,description:"Enter cat stealth outside combat; improves stealth checks and enables an opener."}),
 A("shred","Shred",22,50,"damage","DEX",10,7,["cat"],{builder:true,opener:true,description:"Prowl-only flanking strike; a hit builds one combo point."}),
 A("rake","Rake",24,35,"damage","DEX",6,2,["cat"],{builder:true,bleed:true,description:"A hit builds one combo point and applies a three-round bleed."}),
 A("tigers_fury","Tiger's Fury",24,30,"guard","DEX",0,0,["cat"],{cooldown:4,fury:true,description:"Gain +4 melee damage for the next two exchanges."}),
 A("dash","Dash",26,0,"guard","DEX",0,0,["cat"],{cooldown:5,dash:true,description:"Gain +3 AC for two exchanges and +15 movement for the next two actions."}),
 A("cower","Cower",28,20,"guard","DEX",0,0,["cat"],{cooldown:3,description:"Force disadvantage on the next enemy retaliation."}),
 A("ferocious_bite","Ferocious Bite",32,35,"damage","DEX",10,4,["cat"],{finisher:true,description:"Consume 1–5 combo points; deal +3 damage per point."}),
 A("ravage","Ravage",32,60,"damage","DEX",12,10,["cat"],{builder:true,opener:true,description:"Powerful Prowl-only opener that builds a combo point on hit."}),
 A("pounce","Pounce",36,50,"interrupt","DEX",6,3,["cat"],{builder:true,opener:true,bleed:true,cooldown:3,description:"Prowl-only opener: stun and bleed on hit, plus a combo point."}),
 A("regrowth","Regrowth",12,45,"heal","WIS",8,4,["caster","tree"],{hot:true,damageType:"nature",cooldown:2,description:"Immediate healing plus 4 HP at each of the next three exchanges."})
];
let binding=null;
const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
const hero=()=>window.soaCharacters?.profile?.();
function state(s){
 if(!s.druid)s.druid={version:1,form:"caster",pools:{mana:clamp(s.en),energy:100,rage:0},combo:{target:null,points:0},prowl:false};
 return s.druid;
}
function current(){return binding&&hero()?.className==="Druid"?state(binding.state()):null}
function form(){return binding?.state()?.druid?.form||"caster"}
function name(id,profile=hero()){return profile?.race==="Skyborne"?SKY[id]||id:FORMS[id]?.name||id}
function quests(c){if(!c.druidQuests)c.druidQuests={};return c.druidQuests}
function unlocked(c,id,profile,level){const f=FORMS[id];return !!f&&profile?.className==="Druid"&&level>=f.level&&(!f.spec||profile.specialization===f.spec)&&(id==="caster"||quests(c)[id]?.state==="claimed")}
function environment(location){const l=String(location||"");const indoors=/\b(?:laboratory|dungeon|crypt|tavern|inn|barrow|chamber|cellar|interior|indoors|cave|tunnel)\b/i.test(l);return {outdoors:!indoors&&/\b(?:forest|woods|grove|ridge|coast|shore|field|plains|barrens|ashenvale|felwood|winterspring|hyjal|mulgore|darkshore|moonglade|lake|river|sea|ocean|summit|outdoors|road|trail|valley)\b/i.test(l),water:/\b(?:lake|river|sea|ocean|underwater|submerged|water|coast|shore|aquatic shrine)\b/i.test(l)}}
function shiftError(s,c,profile,level,id,inCombat=false){
 const d=state(s),f=FORMS[id];
 if(profile?.className!=="Druid"||!f)return "Only Druids can shapeshift.";
 if(d.form===id)return "Already in that form.";
 if(!unlocked(c,id,profile,level))return "Requires level "+f.level+(f.spec?" and "+f.spec:"")+" and the completed "+(QUESTS[id]?.title||"form")+" quest.";
 const env=environment(c.scene?.location);
 if(f.water&&!env.water)return "Aquatic Form requires a water location.";
 if(f.outdoors&&!env.outdoors)return "This form requires a confirmed outdoor location.";
 if(f.noCombat&&inCombat)return "Flight Form cannot be entered in combat.";
 if(id!=="caster"&&d.pools.mana<20)return "Shapeshifting requires 20 Mana from your separate Mana reserve.";
 return null;
}
function shift(s,c,profile,level,id,inCombat=false){
 const error=shiftError(s,c,profile,level,id,inCombat);if(error)return {error};
 const d=state(s);d.pools[FORMS[d.form].resource]=clamp(s.en);
 if(id!=="caster")d.pools.mana-=20;
 if(FORMS[d.form].resource==="rage"&&FORMS[id].resource!=="rage")d.pools.rage=0;
 d.form=id;d.prowl=false;d.combo={target:null,points:0};s.en=d.pools[FORMS[id].resource];
 return {message:"Shapeshifted into "+name(id,profile)+". "+(id==="caster"?"No Mana cost.":"Spent 20 Mana.")+" Shifting uses one full turn; no attack or spell is included."};
}
function abilities(base,signature,level,s,c,profile){
 const d=state(s),f=d.form,unlockedForm=unlocked(c,f,profile,level);
 if(!unlockedForm)return [];
 const spellForms=["caster","moonkin","tree"];
 const caster=spellForms.includes(f)?base.filter(a=>a.level<=level).filter(a=>f!=="tree"||a.effect==="heal").filter(a=>f!=="moonkin"||a.effect!=="heal"):[];
 const sig=signature&&((signature.id==="spec_druid_feral"&&BEARS.concat("cat").includes(f))||(signature.id==="spec_druid_balance"&&["caster","moonkin"].includes(f))||(signature.id==="spec_druid_restoration"&&["caster","tree"].includes(f)))?[signature]:[];
 return [...caster,...KIT.filter(a=>a.level<=level&&a.forms.includes(f)),...sig].map(a=>{
  if(a.id==="spec_druid_feral")return f==="cat"
   ?{...a,stat:"DEX",die:12,flat:7,damageStatMultiplier:1,cost:35,cooldown:1,criticalOn:19,builder:true,description:"A ferocious strike: 1d12 + 7 + Dexterity modifier. A hit builds 1 combo point; natural 19–20 critically hits."}
   :{...a,stat:"STR",die:12,flat:7,damageStatMultiplier:2,cost:20,cooldown:2,criticalOn:20,builder:false,description:"A crushing strike: 1d12 + 7 + twice your Strength modifier."};
  return {...a,cost:f==="tree"&&a.effect==="heal"&&a.id!=="rejuvenation"?Math.max(0,a.cost-5):a.cost};
 });
}
function available(base,signature,level){const p=hero();return binding&&p?.className==="Druid"?abilities(base,signature,level,binding.state(),binding.campaign()||{},p):base.filter(a=>a.level<=level)}
function all(){return KIT.map(x=>({...x}))}
function named(action,base=[]){const t=" "+String(action.text||"").toLowerCase().replace(/[^a-z0-9]+/g," ")+" ";return [...base,...KIT].sort((a,b)=>b.name.length-a.name.length).find(a=>a.id===action.ability||t.includes(" "+a.name.toLowerCase().replace(/[^a-z0-9]+/g," ")+" "))}
function shiftFrom(action){
 if(action.form)return action.form;
 if(String(action.ability||"").startsWith("shift_"))return action.ability.slice(6);
 const text=String(action.text||"");if(!/\b(?:shift|shapeshift|transform|return to humanoid|leave .+form)\b/i.test(text))return null;
 const aliases=Object.entries(FORMS).flatMap(([id,f])=>[[id,id.replaceAll("_"," ")],[id,f.name],[id,SKY[id]]]).sort((a,b)=>b[1].length-a[1].length);
 return aliases.find(([,label])=>new RegExp("\\b"+label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?: form)?\\b","i").test(text))?.[0]||null;
}
function errorFor(ability,s,c,combat=true,target){
 const d=state(s);
 if(ability.outOfCombat&&combat)return ability.name+" is only available outside combat.";
 if(ability.opener&&!d.prowl)return ability.name+" requires Prowl. Enter Prowl before engaging.";
 if(ability.finisher&&(d.combo.points<1||d.combo.target!==target?.name))return "Build combo points on this target first.";
 if(ability.id==="rejuvenation"&&d.effects?.rejuvenation)return "Rejuvenation active · "+d.effects.rejuvenation.remaining+" healing round"+(d.effects.rejuvenation.remaining===1?"":"s")+" remaining.";
 const cooldown=Math.max(0,(d.cooldowns?.[ability.id]||0)-(Number(s.time)||0));
 if(cooldown)return ability.name+" cooldown · "+cooldown+" round"+(cooldown===1?"":"s")+" remaining.";
 if(ability.effect==="heal"&&s.hp>=100+(window.soaRacialAbilities?.passives?.(hero()?.race)?.maxHp||0))return "Health is already full.";
 if(s.en<ability.cost)return "Not enough "+FORMS[d.form].resource+" for "+ability.name+".";
 return null;
}
function startRejuvenation(s){const d=state(s);d.effects||={};d.effects.rejuvenation={remaining:3,nextTime:(Number(s.time)||0)+1};}
function tickRejuvenation(s,profile=hero()){
 const d=state(s),hot=d.effects?.rejuvenation;
 if(!hot||s.time<hot.nextTime)return null;
 const before=s.hp,max=100+(window.soaRacialAbilities?.passives?.(profile?.race)?.maxHp||0);
 s.hp=Math.min(max,s.hp+15);hot.remaining--;hot.nextTime=s.time+1;
 const remaining=hot.remaining;if(!remaining)delete d.effects.rejuvenation;
 return {amount:s.hp-before,remaining,message:"Rejuvenation restores "+(s.hp-before)+" HP · "+remaining+" healing round"+(remaining===1?"":"s")+" remaining."};
}
function healOutsideCombat(s,c,profile,ability,rules,actor){
 const error=errorFor(ability,s,c,false);if(error)return {error};
 const before=s.hp,d=state(s),max=100+(window.soaRacialAbilities?.passives?.(profile.race)?.maxHp||0);
 if(ability.periodicHeal)startRejuvenation(s);
 else s.hp=Math.min(max,s.hp+rules.damage(ability.die,ability.flat+(actor?.modifiers?.[ability.stat]||0)+modifiers(s).heal));
 recover(s,{cost:ability.cost,combat:false});s.time++;
 const hot=tickRejuvenation(s,profile);
 if(ability.hot){d.effects||={};d.effects.regrowth={until:(c.combatRound||0)+3};}
 if(ability.cooldown){d.cooldowns||={};d.cooldowns[ability.id]=s.time+ability.cooldown;}
 return {message:"Success: "+ability.name+(ability.periodicHeal?" applied for three rounds; "+hot.message:" restores "+(s.hp-before)+" HP.")+" "+FORMS[d.form].resource+" now "+s.en+"/100; "+ability.cost+" spent. One turn resolved."};
}
function recover(s,{cost=0,hit=false,taken=0,shifted=false,combat=true}={}){
 const d=state(s),key=FORMS[d.form].resource;
 if(!shifted){const gain=key==="energy"?20:key==="rage"?(hit?5:0)+(taken>0?5:0):25;s.en=clamp(s.en-cost+gain);d.pools[key]=s.en;}
 if(key!=="mana"&&!shifted)d.pools.mana=clamp(d.pools.mana+5);
 if(!combat&&key==="rage"){s.en=Math.max(0,s.en-5);d.pools.rage=s.en;}
 return s.en;
}
// Story choices may aim a learned spell at scenery without creating an enemy.
function environmentalTarget(action,c){
 if(window.soaStoryActions)return window.soaStoryActions.obstacle(action,c);
 const text=String(action?.text||""),match=text.match(/\b(?:root[ -]knot|tangled roots|vines?|brambles?|barricade|wooden door|door|padlock|lock|chains?|webbing|spiderweb|boulder|fallen branch|fallen log|obstruction|obstacle)\b/i);
 if(!match)return null;
 const target=match[0].toLowerCase().replace(/-/g," ");
 const scene=String(c.scene?.story||"")+" "+(c.scene?.choices||[]).map(x=>x.text||"").join(" ");
 return scene.toLowerCase().replace(/-/g," ").includes(target)?target:null;
}
function obstacleDC(action){return action?.difficulty==="easy"?10:action?.difficulty==="hard"?17:13}
function castAtEnvironment(s,c,profile,level,action,ability,rules,actor){
 const target=environmentalTarget(action,c);
 if((c.enemies||[]).some(e=>e.hp>0))return {error:"Use the combat target controls while an enemy is engaged."};
 if(!target||!["damage","interrupt"].includes(ability?.effect))return {error:"That ability requires a hostile target or a visible environmental obstacle."};
 const d=state(s),err=errorFor(ability,s,c,false);if(err)return {error:err};
 if(!unlocked(c,d.form,profile,level)||FORMS[d.form].utility)return {error:"That spell cannot be used in your current form."};
 const before=s.en,dc=obstacleDC(action),die=rules.roll(20),bonus=(actor?.proficiency||2)+(actor?.modifiers?.[ability.stat]||0),success=die===20||die!==1&&die+bonus>=dc;
 recover(s,{cost:ability.cost,combat:false});s.time++;
 if(ability.cooldown){d.cooldowns||={};d.cooldowns[ability.id]=s.time+ability.cooldown;}
 d.prowl=false;
 return {success,target,die,dc,message:(success?"Success: ":"Complication: ")+"Used "+ability.name+" on the "+target+". d20 "+die+" + "+bonus+" vs obstacle DC "+dc+". "+(success?"The spell achieves the selected effect on this environmental obstacle.":"The attempt fails; the obstacle remains unresolved.")+" "+FORMS[d.form].resource+" "+before+" → "+s.en+"/100; "+ability.cost+" spent. One action resolved. No hostile was attacked or defeated; no enemy damage, retaliation, loot or quest proof was awarded."};
}
function modifiers(s){const d=state(s);return {ac:FORMS[d.form].ac,damage:d.form==="dire_bear"?2:d.form==="moonkin"?3:0,heal:d.form==="tree"?3:0}}
function skillBonus(skill){const d=current();if(!d)return 0;const env=environment(binding?.campaign()?.scene?.location);if((FORMS[d.form].outdoors&&!env.outdoors)||(FORMS[d.form].water&&!env.water))return 0;return skill==="stealth"&&d.prowl?20:skill==="move"&&d.effects?.dashActions>0?15:skill==="move"?(d.form==="travel"?15:d.form==="aquatic"?20:d.form==="flight"?25:0):0}
// All effects tick only on a resolved exchange, never on rendering/retries.
function exchange(s,c,profile,level,action,ability,target,rules,actor){
 const targets=(c.enemies||[]).filter(e=>e.hp>0),d=state(s),shiftId=shiftFrom(action),beforeResources={...d.pools},beforeForm=d.form;
 if(!target)target=targets[0];
 const shifting=shiftId!==null;
 if(shifting){const err=shiftError(s,c,profile,level,shiftId,true);if(err)return {error:err};}
 else {
  if(!unlocked(c,d.form,profile,level))return {error:"This form is no longer available for your level or specialization; return to humanoid."};
  if(FORMS[d.form].utility)return {error:"Return to humanoid or a combat form before attacking or casting."};
  if(!ability)return {error:"That Druid ability is not available in this form or at this level."};
  const err=errorFor(ability,s,c,true,target);if(err)return {error:err};
 }
 if(!target)return {error:"No hostile target is engaged."};
 const round=(Number(c.combatRound)||0)+1,beforeHP=s.hp,oldResource=s.en,maxHP=100+(window.soaRacialAbilities?.passives?.(profile.race)?.maxHp||0),snap=targets.map(e=>({enemy:e,before:e.hp}));
 if(shifting)shift(s,c,profile,level,shiftId,true);
 const mods=modifiers(s),stat=actor?.modifiers?.[ability?.stat]||0,gear=window.soaEquipment?.modifiers?.()||{};
 d.effects||={};d.dots||=[];
 const notes=[],attacks=[];let dealt=0,healed=0,hit=false,interrupted=false,guard=false;
 const used=shifting?"shift_"+shiftId:ability.id;
 if(!shifting){
  guard=ability.effect==="guard";
  if(ability.effect==="heal"){
   if(ability.periodicHeal)startRejuvenation(s);
   else {const amount=rules.damage(ability.die,ability.flat+stat+mods.heal),old=s.hp;s.hp=Math.min(maxHP,s.hp+amount);healed=s.hp-old;}
   if(ability.hot)d.effects.regrowth={until:round+3};
  }else if(["damage","interrupt"].includes(ability.effect)){
   const victims=ability.aoe?targets.slice(0,3):[target];
   for(const enemy of victims){
    const block=rules.statBlock(enemy),roll=rules.attack((actor?.proficiency||2)+stat+(gear.attack||0),block.ac,{advantage:d.prowl?1:0,criticalOn:ability.criticalOn||20});
    const cp=ability.finisher?d.combo.points:0,bonus=ability.finisher&&!ability.bleed?cp*3:0;
    const raw=rules.damage(ability.die,ability.flat+stat*(ability.damageStatMultiplier||1)+(d.form!=="moonkin"||["nature","arcane"].includes(ability.damageType)?mods.damage:0)+(gear.damage||0)+bonus+(d.form==="cat"&&d.effects.furyUntil>=round?4:0),roll.critical);
    const before=enemy.hp,damage=roll.hit?Math.min(enemy.hp,rules.mitigate(raw,ability.damageType,block)):0;enemy.hp-=damage;dealt+=damage;hit=hit||roll.hit;
    attacks.push({index:attacks.length+1,target:enemy.name,die:roll.die,total:roll.total,bonus:roll.bonus,ac:block.ac,hit:roll.hit,damage,critical:roll.critical,criticalOn:ability.criticalOn||20,before,after:enemy.hp,maxHp:enemy.maxHp});
    if(roll.hit&&ability.bleed)d.dots=[...d.dots.filter(x=>!(x.target===enemy.name&&x.id===ability.id)),{id:ability.id,target:enemy.name,amount:ability.finisher?2+cp*2:3,until:round+3,start:round+1}];
    if(roll.hit&&ability.builder){if(d.combo.target!==enemy.name)d.combo={target:enemy.name,points:0};d.combo.points=Math.min(5,d.combo.points+1);}
   }
   interrupted=ability.effect==="interrupt"&&hit;
   if(ability.finisher)d.combo={target:null,points:0};
  }
  if(ability.roar)d.effects.roarUntil=round+2;
  if(ability.enrage){s.en=clamp(s.en+20);d.effects.enrageUntil=round+1;}
  if(ability.challenge)d.effects.challengeUntil=round+1;
  if(ability.dash){d.effects.dashUntil=round+1;d.effects.dashActions=2;}
  if(ability.fury)d.effects.furyUntil=round+2;
  d.prowl=false;
 }
 // Bleeds and Regrowth continue across forms. Each gets exactly three future ticks.
 for(const dot of d.dots){const foe=targets.find(e=>e.name===dot.target);if(foe?.hp>0&&dot.start<=round&&dot.until>=round){const amount=Math.min(foe.hp,dot.amount);foe.hp-=amount;dealt+=amount;notes.push(dot.id+" bleeds "+foe.name+" for "+amount+" HP");}}
 d.dots=d.dots.filter(x=>x.until>round&&targets.some(e=>e.name===x.target&&e.hp>0));
 if(d.effects.regrowth?.until>=round&&!ability?.hot){const old=s.hp;s.hp=Math.min(maxHP,s.hp+4);healed+=s.hp-old;notes.push("Regrowth restores "+(s.hp-old)+" HP");}
 const retaliationTarget=targets.find(e=>e.name===target.name&&e.hp>0)||targets.find(e=>e.hp>0);
 const ac=(actor?.armorClass||12)+(actor?.form===d.form?0:mods.ac)+(BEARS.includes(d.form)&&d.effects.challengeUntil>=round?3:0)+(d.form==="cat"&&d.effects.dashUntil>=round?3:0)-(BEARS.includes(d.form)&&d.effects.enrageUntil>=round?2:0);
 let enemyRoll=null,taken=0;
 if(retaliationTarget&&!(interrupted&&retaliationTarget===target)){
  const block=rules.statBlock(retaliationTarget);enemyRoll=rules.attack(block.bonus-(d.effects.roarUntil>=round?3:0),ac,{advantage:guard&&!ability?.enrage||c.guardUntil>=round?-1:0});
  if(enemyRoll.hit){taken=Math.min(Math.max(0,s.hp-1),rules.damage(block.die,2,enemyRoll.critical));s.hp-=taken;}
 }
 if(!shifting)recover(s,{cost:ability.cost,hit,taken});
 else {d.pools[FORMS[d.form].resource]=s.en;}
 const regen=window.soaRacialAbilities?.passives?.(profile.race)?.regeneration||0;const preRegen=s.hp;s.hp=Math.min(maxHP,s.hp+regen);healed+=s.hp-preRegen;
 c.combatRound=round;s.time++;
 const rejuvenationTick=tickRejuvenation(s,profile);if(rejuvenationTick){healed+=rejuvenationTick.amount;notes.push(rejuvenationTick.message);}
 if(!shifting&&ability.cooldown){d.cooldowns||={};d.cooldowns[ability.id]=s.time+ability.cooldown;}
 const rows=snap.map(row=>({...row,dealt:row.before-row.enemy.hp}));
 if(!targets.some(e=>e.name===d.combo.target&&e.hp>0))d.combo={target:null,points:0};
 const resourceReport="Mana "+beforeResources.mana+" → "+d.pools.mana+", Energy "+beforeResources.energy+" → "+d.pools.energy+", Rage "+beforeResources.rage+" → "+d.pools.rage;
 const event={round,ability:used,abilityName:shifting?"Shapeshift":ability.name,effect:shifting?"shift":ability.effect,form:d.form,previousForm:beforeForm,shapeshift:shifting,target:target.name,hit,dealt,taken,healed,heroBefore:beforeHP,heroAfter:s.hp,recipient:profile.name,recipientBefore:beforeHP,recipientAfter:s.hp,energyBefore:oldResource,energyAfter:s.en,enemyBefore:snap.find(x=>x.enemy===target).before,enemyAfter:target.hp,enemyMax:target.maxHp,defenderAC:ac,enemyRoll:enemyRoll?.die??null,enemyTotal:enemyRoll?.total??null,attackRoll:attacks[0]?.die??null,attackTotal:attacks[0]?.total??null,targetAC:attacks[0]?.ac??null,damageType:ability?.damageType||"physical",defeated:target.hp===0,defeatedTargets:rows.filter(x=>x.before>0&&x.enemy.hp===0).map(x=>({name:x.enemy.name,maxHp:x.enemy.maxHp})),combo:{...d.combo},resourceReport,details:notes,strikes:attacks};
 const message=(shifting?"Shapeshifted into "+name(d.form,profile)+"; no attack or spell":ability.name+": "+dealt+" damage, "+healed+" healing")+". Received "+taken+" damage. "+resourceReport+". "+(notes.length?notes.join("; ")+". ":"")+"Exactly one combat exchange resolved.";
 return {message:"Success: "+message,event,rows};
}
function questAction(s,c,profile,level,id,operation,rules){
 const f=FORMS[id],q=QUESTS[id],records=quests(c),record=records[id],loc=String(c.scene?.location||"");
 if(profile?.className!=="Druid"||!q)return {error:"Unknown Druid quest."};
 if(level<f.level||f.spec&&profile.specialization!==f.spec)return {error:"Requires level "+f.level+(f.spec?" and "+f.spec:"")+"."};
 const required=q.requires||f.requires;if(required&&!unlocked(c,required,profile,level))return {error:"Complete the "+FORMS[required].name+" rite first."};
 if((c.enemies||[]).some(e=>e.hp>0))return {error:"Finish the current encounter before continuing a form quest."};
 if(operation==="accept"){
  if(record)return {error:"This quest is already recorded."};if(!MENTOR.test(loc))return {error:"Visit a Druid mentor in Moonglade, Darnassus or Thunder Bluff."};
  records[id]={state:"active",step:0,proof:[]};s.time++;return {message:"Accepted "+q.title+". Next: "+q.steps[0].text+". Return to a mentor after every objective is verified."};
 }
 if(!record||record.state!=="active")return {error:"This quest is not active."};
 if(operation!=="step"&&operation!=="claim")return {error:"Unknown quest action."};
 if(operation==="claim"){
  if(record.step!==q.steps.length||!MENTOR.test(loc))return {error:"Complete every objective, then return to a Druid mentor."};
  record.state="claimed";record.receipt="druid-form:"+id;record.claimedAt=c.turn||0;s.time++;
  return {message:"Quest complete: "+q.title+". Learned "+name(id,profile)+" Form. No automatic shapeshift or currency reward."};
 }
 const objective=q.steps[record.step];if(!objective||!objective.region.test(loc))return {error:"Travel to the objective location first: "+(objective?.text||"return to your mentor")+"."};
 if(record.fighting)return {error:"The summoned trial must be defeated through combat."};
 if(objective.kind==="combat"){
  record.fighting=objective.target;c.enemies=[{name:objective.target,hp:40+level,maxHp:40+level}];c.enemyLocation=loc;s.time++;
  // A repeated trial uses a fresh engine-owned encounter, without reviving unrelated foes.
  c.defeatedEnemies=(c.defeatedEnemies||[]).filter(x=>x!==(loc+"|"+objective.target.toLowerCase()));
  return {message:"The "+objective.target+" trial begins. Resolve each round with combat actions; the quest is not complete."};
 }
 const die=rules.roll(20),bonus=window.soaAbilities?.get?.("hero")?.modifiers?.WIS||0,ok=die===20||die!==1&&die+bonus>=11;
 s.time++;recover(s,{combat:false});
 if(ok){record.proof.push({step:record.step,location:loc,roll:die});record.step++;}
 return {message:(ok?"Success: ":"Complication: ")+objective.text+" · d20 "+die+" + "+bonus+" vs DC 11. "+(ok?"Objective verified. "+(record.step===q.steps.length?"Return to your mentor to learn the form.":"Next: "+q.steps[record.step].text):"Objective incomplete; you may try again on a later turn.")};
}
function onDefeat(c,enemy){for(const [id,r] of Object.entries(quests(c))){const o=QUESTS[id]?.steps[r.step];if(r.state==="active"&&r.fighting===enemy&&o?.target===enemy){r.proof.push({step:r.step,target:enemy,location:c.enemyLocation});r.step++;delete r.fighting;}}}
function resetEncounter(s){const d=state(s);d.combo={target:null,points:0};d.dots=[];const hot=d.effects?.regrowth;const rejuvenation=d.effects?.rejuvenation;d.effects={...(hot?{regrowth:{until:3}}:{}),...(rejuvenation?{rejuvenation}:{} )};d.pools.rage=0;if(FORMS[d.form].resource==="rage")s.en=0;}
function context(){const d=current();if(!d||!binding)return null;const c=binding.campaign()||{},p=hero(),level=window.soaProgression?.level?.()||1;return {form:d.form,appearance:name(d.form,p),pools:{...d.pools},combo:{...d.combo},prowl:d.prowl,rejuvenation:d.effects?.rejuvenation?{remaining:d.effects.rejuvenation.remaining}:null,unlocked:Object.keys(FORMS).filter(id=>unlocked(c,id,p,level)),learned:window.soaClassAbilities?.available?.("Druid",level).map(a=>({name:a.name,cost:a.cost,effect:a.effect})),quests:Object.entries(quests(c)).map(([id,r])=>({id,title:QUESTS[id]?.title,state:r.state,next:QUESTS[id]?.steps[r.step]?.text||"Return to mentor"}))}}
function panel(s,c,p,level,choose,locked=false){
 const box=document.createElement("section");box.className="soa-druid-panel";box.setAttribute("aria-label","Druid forms and training");
 const add=(tag,text,parent=box)=>{const e=document.createElement(tag);e.textContent=text;if(tag==="details")e.className="soa-collapsible-quests";parent.append(e);return e;};
 const d=state(s),combat=(c.enemies||[]).some(e=>e.hp>0),learnedForms=Object.keys(FORMS).filter(id=>unlocked(c,id,p,level)),resources=[...new Set(learnedForms.map(id=>FORMS[id].resource))];
 add("h4","Shapeshifting · "+name(d.form,p));add("p",FORMS[d.form].description);
 if(learnedForms.length>1)add("p","Changing form takes one turn. Entering a form costs 20 Mana; returning to humanoid costs no Mana.");
 const maxHealth=100+(window.soaRacialAbilities?.passives?.(p.race)?.maxHp||0);
 for(const key of ["health",...resources]){
  const value=key==="health"?s.hp:d.pools[key],max=key==="health"?maxHealth:100;
  const wrap=document.createElement("div");wrap.className="soa-druid-pool";wrap.dataset.resource=key;
  add("strong",key.toUpperCase()+" · "+value+" / "+max,wrap);
  const rail=add("div","",wrap);rail.className="soa-druid-rail";rail.setAttribute("role","progressbar");rail.setAttribute("aria-label",key==="health"?"Current health":key+" reserve");rail.setAttribute("aria-valuemin","0");rail.setAttribute("aria-valuemax",String(max));rail.setAttribute("aria-valuenow",String(value));
  const fill=add("i","",rail);fill.style.width=Math.max(0,Math.min(100,value/max*100))+"%";box.append(wrap);
 }
 const rules=add("details","");add("summary","Resource rules",rules);add("p","Mana recovers up to 25 in caster forms; inactive Mana recovers 5 per ordinary action.",rules);
 if(resources.includes("energy"))add("p","Cat Energy recovers 20 per exchange.",rules);
 if(resources.includes("rage"))add("p","Bear Rage gains 5 per landed attack and 5 when hit; it loses 5 outside combat.",rules);
 if(learnedForms.length>1)add("p","Shifting never refills a resource pool.",rules);
 if(d.effects?.rejuvenation){const status=add("p","Rejuvenation active · 15 HP per round · "+d.effects.rejuvenation.remaining+" rounds remaining");status.className="soa-druid-hot";status.setAttribute("aria-live","polite");}
 if(d.form==="cat")add("p","Combo points: "+d.combo.points+" / 5"+(d.combo.target?" on "+d.combo.target:"")+(d.prowl?" · Prowl active":""));
 if(learnedForms.length>1){
 const formPicker=add("details","");add("summary","Change form · one full turn",formPicker);
 for(const id of learnedForms){
  const f=FORMS[id],reason=shiftError(s,c,p,level,id,combat),button=add("button",name(id,p)+(id!=="caster"?" · Level "+f.level:"")+" · "+(id===d.form?"Active":"Shift"),formPicker);button.type="button";button.dataset.form=id;button.setAttribute("aria-pressed",String(id===d.form));button.disabled=locked||!!reason;button.title=reason||f.description;button.onclick=()=>choose({text:"Shapeshift into "+name(id,p)+" Form",type:combat?"combat":"move",ability:"shift_"+id,form:id,difficulty:"easy"});
 }
 }
 const techniques=KIT.filter(a=>a.level<=level&&a.forms.some(id=>learnedForms.includes(id)));
 if(techniques.length){const spellbook=add("details","");add("summary","Learned form abilities",spellbook);
 for(const a of techniques)add("p",a.name+" · Level "+a.level+" · "+a.forms.filter(id=>learnedForms.includes(id)).map(id=>name(id,p)).join(" / ")+" · "+a.cost+" "+FORMS[a.forms[0]].resource+" · "+a.description,spellbook);}
 if(!combat){
  const learned=window.soaClassAbilities?.available?.("Druid",level)||[];
  for(const a of learned.filter(a=>a.prowl||a.effect==="heal")){const reason=locked?"Waiting for the current action.":errorFor(a,s,c,false),button=add("button",a.name+" · "+a.cost+" "+FORMS[d.form].resource);button.disabled=!!reason;button.title=reason||a.description;add("small",reason||(a.periodicHeal?"15 HP per round · 3 rounds · 3-round cooldown":"Ready"),button);button.onclick=()=>choose({text:"Use "+a.name,type:"druid",ability:a.id});}
 }
 const visibleQuests=Object.entries(QUESTS).filter(([id,q])=>{const f=FORMS[id],record=quests(c)[id],required=q.requires||f.requires;return !!record||(level>=f.level&&(!f.spec||p.specialization===f.spec)&&(!required||unlocked(c,required,p,level)));});
 if(!visibleQuests.length&&learnedForms.length===1)add("p","No animal forms learned yet. Druid training begins at level 10.");
 if(visibleQuests.length){const journal=add("details","");add("summary","Druid training quests",journal);
 for(const [id,q] of visibleQuests){
  const record=quests(c)[id],f=FORMS[id];const row=add("div","",journal);add("strong",q.title+" · Level "+f.level+(f.spec?" · "+f.spec:""),row);add("small",q.source,row);
  const next=q.steps[record?.step||0];add("p",record?.state==="claimed"?"Completed · "+name(id,p)+" Form learned":record?"Objectives "+record.step+" / "+q.steps.length+" · "+(next?.text||"Return to a mentor"):"Speak with a Druid mentor in Moonglade, Darnassus or Thunder Bluff.",row);
  const op=!record?"accept":record.step===q.steps.length?"claim":"step";
  const button=add("button",record?.state==="claimed"?"Learned":op==="accept"?"Accept form quest":op==="claim"?"Return quest to mentor":record.fighting?"Trial in progress":"Attempt next objective",row);button.type="button";
  button.disabled=locked||combat||record?.state==="claimed"||level<f.level||!!f.spec&&p.specialization!==f.spec||((op==="accept"||op==="claim")?!MENTOR.test(c.scene?.location||""):!next?.region.test(c.scene?.location||""));
  button.onclick=()=>choose({text:q.title+": "+op,type:"druid_quest",quest:id,operation:op});
 }
 }
 return box;
}
window.soaDruid={FORMS,QUESTS,state,current,form,name,bind:callbacks=>{binding=callbacks;},unlocked,environment,shiftError,shift,abilities,available,all,named,shiftFrom,errorFor,startRejuvenation,tickRejuvenation,healOutsideCombat,recover,environmentalTarget,obstacleDC,castAtEnvironment,modifiers,skillBonus,exchange,questAction,onDefeat,resetEncounter,context,panel};
})();
