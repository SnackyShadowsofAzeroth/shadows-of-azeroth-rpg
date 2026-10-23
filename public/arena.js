(()=>{"use strict";
const RANKS=["Arena Contender","Iron Challenger","Bronze Gladiator","Silver Gladiator","Gold Gladiator","Platinum Duelist","Emerald Duelist","Sapphire Duelist","Ruby Duelist","Diamond Duelist","Veteran Fighter","Elite Fighter","Master Fighter","Champion's Hope","Champion's Hand","Grand Gladiator","Elite Gladiator","Warlord","Arena Legend","Arena Grand Champion"];
const ARCHETYPES=["Duelist","Shield Fighter","Ranger","Spellblade","Pit Champion"];
const state=c=>{if(!c.arena||typeof c.arena!=="object")c.arena={version:1,serial:0,wins:0,active:null,history:[]};if(!Array.isArray(c.arena.history))c.arena.history=[];return c.arena};
const current=c=>c?.arena?.active||null;
const rank=wins=>Math.min(20,1+Math.floor(Math.max(0,Number(wins)||0)/20));
const title=wins=>RANKS[rank(wins)-1];
function venue(faction){return faction==="Alliance"?"Stormwind City":faction==="Horde"?"Orgrimmar":null;}
function isAtVenue(location,faction){const place=venue(faction);return !!place&&(place==="Stormwind City"?/stormwind(?: city)?/i.test(String(location||"")):/orgrimmar/i.test(String(location||"")));}
function opponent(faction,level,wins,bout){
 const currentRank=rank(wins),name=(faction==="Alliance"?"Stormwind":"Orgrimmar")+" "+ARCHETYPES[(bout-1)%ARCHETYPES.length]+" · Bout "+bout;
 const hp=Math.min(500,18+Math.max(1,level)*3+currentRank*5),ac=Math.min(22,12+Math.floor(Math.max(1,level)/15)+Math.floor((currentRank-1)/5)),attackBonus=Math.min(14,3+Math.floor(Math.max(1,level)/12)+Math.floor((currentRank-1)/4)),damageDie=Math.min(12,6+Math.floor((currentRank-1)/5));
 return {name,hp,maxHp:hp,armorClass:ac,attackBonus,damageDie,arenaOpponent:true,arenaRank:currentRank,arenaBout:bout};
}
function scene(c,message,opponentName){const active=current(c);c.scene={title:opponentName?"The Arena · "+opponentName:active?.status==="lost"?"The Arena · Defeat":"The Arena",location:active?.venue||venue(active?.faction)||c.scene?.location||"Arena",story:message,choices:[],enemies:(c.enemies||[]).map(e=>({...e})),allies:c.combatAllies||[],journal:""};c.enemyLocation=c.scene.location;}
function command(c,s,action,hero,level){
 if(window.soaSaveRules?.isIntegrityBlocked?.()||c.pending)return {error:"Resolve the pending save or story action first."};
 const ledger=state(c),op=action.arenaAction,active=current(c);
 if(op==="enter"){
  const place=venue(hero?.faction);if(!place)return {error:"Your character needs an Alliance or Horde faction to enter a capital arena."};
  if(!isAtVenue(c.scene?.location,hero.faction))return {error:"Travel to "+place+" to enter your faction's arena."};
  if(active)return {error:"You are already entered in an arena challenge."};
  if(window.soaDungeons?.current?.(c))return {error:"Finish or leave your dungeon expedition before entering the arena."};
  if((c.enemies||[]).some(e=>e.hp>0))return {error:"Finish the current encounter before entering the arena."};
  if(s.hp<=1)return {error:"Recover your health before entering the arena."};
  ledger.serial++;ledger.active={id:"arena-"+ledger.serial,faction:hero.faction,venue:place,status:"ready",bout:ledger.wins+1,startedAtTurn:Number(c.turn)||0,home:structuredClone(c.scene)};
  scene(c,"The arena marshal records your name and opens an unlimited challenge. Defeat each opponent to claim a victory; you may stop between bouts. Your rank rises every 20 career victories.");s.time++;
  return {message:"Arena challenge entered at "+place+". Your career record is saved across visits.",spent:true};
 }
 if(!active)return {error:"Enter your faction's arena before choosing a challenge action."};
 if(op==="fight"){
  if(active.status!=="ready")return {error:"You cannot begin another bout yet."};
  if((c.enemies||[]).some(e=>e.hp>0))return {error:"Resolve the current opponent first."};
  if(s.hp<=1)return {error:"Recover your health before facing another challenger."};
  const foe=opponent(active.faction,level,ledger.wins,active.bout);c.enemies=[foe];active.status="fighting";active.opponent=foe.name;active.fightRound=0;active.resolvedRound=0;
  scene(c,foe.name+" steps into the ring. Rank "+rank(ledger.wins)+" · "+title(ledger.wins)+". One opponent stands between you and your next victory.",foe.name);s.time++;
  return {message:"Bout "+active.bout+" begins against "+foe.name+" ("+foe.maxHp+" HP · AC "+foe.armorClass+").",spent:true,startEncounter:true};
 }
 if(op==="leave"){
  const inFight=active.status==="fighting"&&(c.enemies||[]).some(e=>e.hp>0);
  if(inFight&&action.confirmed!==true)return {error:"Confirm leaving the arena during a live bout."};
  const abandoned=active.status==="fighting";
  if(abandoned){c.enemies=[];if(c.xpEncounter?.active){c.xpEncounter.active=false;c.xpEncounter.abandoned=true;c.xpEncounter.pendingVictory=false;}}
  c.arena.history=ledger.history.slice(-20);ledger.active=null;c.enemies=[];c.scene=structuredClone(active.home);c.enemyLocation=c.scene?.location||"";s.time++;
  return {message:"You leave the arena with "+ledger.wins+" career victories · "+title(ledger.wins)+". Your record and rank are saved.",spent:true,abandonEncounter:abandoned};
 }
 return {error:"Unknown arena action."};
}
function settle(c,s,event){
 const active=current(c),ledger=state(c);if(!active||active.status!=="fighting"||!event||event.round!==c.combatRound||active.resolvedRound>=event.round)return {message:""};
 active.resolvedRound=event.round;active.fightRound=event.round;
 const foe=(c.enemies||[]).find(e=>e.arenaOpponent&&e.arenaBout===active.bout);
 if(!foe)return {error:"Arena opponent record is missing. Reload before continuing."};
 if(s.hp<=1&&foe.hp>0){active.status="lost";c.enemies=[];if(c.xpEncounter?.active){c.xpEncounter.active=false;c.xpEncounter.abandoned=true;c.xpEncounter.pendingVictory=false;}scene(c,"You can no longer continue. The marshal ends the bout and helps you from the ring. This is not a victory; recover before trying again. Your career record remains intact.");return {message:"Defeat in bout "+active.bout+". Career wins and rank are unchanged.",lost:true};}
 if(foe.hp>0)return {message:""};
 const before=rank(ledger.wins);ledger.wins=Math.min(100000000,ledger.wins+1);const after=rank(ledger.wins),advanced=after>before;
 ledger.history.push({bout:active.bout,opponent:foe.name,win:true,rank:after,turn:Number(c.turn)||0});ledger.history=ledger.history.slice(-20);
 active.status="ready";active.bout=ledger.wins+1;active.opponent=null;active.fightRound=0;active.resolvedRound=0;
 scene(c,"Victory over "+foe.name+". Career wins: "+ledger.wins+" · Rank "+after+"/20 — "+title(ledger.wins)+"."+(advanced?" You advance to the next arena rank.":after===20?" You have reached the highest rank; further victories still count.":" "+(20-ledger.wins%20)+" victories until the next rank."));
 return {message:"Arena victory recorded · "+ledger.wins+" total wins · Rank "+after+"/20 · "+title(ledger.wins)+(advanced?" · Rank advanced!":""),waveCleared:true,advanced,rank:after,wins:ledger.wins};
}
function panel(c,s,hero,choose,busy=false){
 const root=document.createElement("details");root.className="soa-arena-panel";root.open=!!current(c);
 const el=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
 const button=(text,op,disabled=false)=>{const b=el("button",text);b.type="button";b.disabled=busy||disabled;b.onclick=()=>{const confirmed=op==="leave"&&current(c)?.status==="fighting"?window.confirm("Leave this live bout? It will count as a forfeit, but your career wins remain safe."):false;if(op==="leave"&&current(c)?.status==="fighting"&&!confirmed)return;choose({arenaAction:op,confirmed,text,type:"arena"});};return b;};
 const ledger=state(c),active=current(c),place=venue(hero?.faction);root.append(el("summary",active?"Arena challenge · "+active.venue:"Faction Arena · Endless challenge"));
 root.append(el("p","Career record · "+ledger.wins+" victories · Rank "+rank(ledger.wins)+"/20 · "+title(ledger.wins)));
 if(rank(ledger.wins)<20)root.append(el("p",(ledger.wins%20)+" / 20 victories toward rank "+(rank(ledger.wins)+1)+" · "+(20-ledger.wins%20)+" to advance."));else root.append(el("p","Maximum rank reached. Keep fighting; victories continue to count."));
 if(active){
  root.append(el("p","Challenge active · Bout "+active.bout+" · "+active.status+" · your record saves after every action."));
  if(active.status==="ready")root.append(button("Face the next challenger","fight",s.hp<=1));
  if(active.status==="fighting")root.append(el("p","Defeat the opponent to record a win. Combat actions resolve one exchange at a time."));
  if(active.status==="lost")root.append(el("p","This challenge ended in a loss. Your victories and rank are retained."));
  root.append(button(active.status==="fighting"?"Forfeit and leave the arena":"Leave the arena","leave"));return root;
 }
 if(!place){root.append(el("p","Arena access requires an Alliance or Horde character."));return root;}
 if(!isAtVenue(c.scene?.location,hero.faction)){root.append(el("p","Travel to "+place+" to enter the "+(hero.faction==="Alliance"?"Alliance":"Horde")+" arena. The other faction's arena is closed to you."));return root;}
 root.append(el("p","Unlimited one-on-one bouts · one victory per opponent · advance a rank every 20 wins · maximum rank: Arena Grand Champion. Leave between bouts whenever you like."));
 if(window.soaDungeons?.current?.(c))root.append(el("p","Finish or leave your dungeon expedition before entering."));
 root.append(button("Enter the "+place+" arena", "enter",s.hp<=1||!!window.soaDungeons?.current?.(c)||(c.enemies||[]).some(e=>e.hp>0)));
 const recent=ledger.history.slice(-5).reverse();if(recent.length){const details=document.createElement("details");details.append(el("summary","Recent victories"));for(const row of recent)details.append(el("p","Bout "+row.bout+" · "+row.opponent+" · Rank "+row.rank));root.append(details);}
 return root;
}
window.soaArena={RANKS,state,current,rank,title,venue,isAtVenue,opponent,command,settle,panel};
})();
