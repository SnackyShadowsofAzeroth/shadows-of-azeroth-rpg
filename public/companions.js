(()=>{"use strict";
const KEY="soa-companions-v1", PEOPLE={
 pippa:{name:"Pippa Sparkwhistle",race:"Gnome",className:"Rogue",specialization:"Subtlety",role:"Stealth reconnaissance · Engineering",icon:"🗡",base:"Pippa checks the shadows along the corridor, one hand resting near her concealed blades and the other on her engineering satchel."},
 bromli:{name:"Bromli Ironkeg",race:"Dwarf",className:"Paladin",specialization:"Protection",role:"Frontline protection · The Light",icon:"🛡",base:"Bromli steadies his shield and warhammer, ready to hold the line with the Light."},
 lethariel:{name:"Lethariel Moonguard",race:"Night Elf",className:"Priest",specialization:"Restoration",role:"Restorative healing · Support",icon:"✦",base:"Lethariel Moonguard watches over the party, conserving her restorative magic for those who need it."}
};
const ACTIONS=[
 {id:"talk",label:"Catch up",detail:"A brief conversation"},
 {id:"encourage",label:"Encourage",detail:"Raise their spirits"},
 {id:"advice",label:"Ask advice",detail:"Get their perspective"},
 {id:"flirt",label:"Show interest",detail:"A respectful compliment"},
 {id:"bond",label:"Deepen friendship",detail:"Build trust together"},
 {id:"apologize",label:"Make amends",detail:"Repair a damaged bond"},
 {id:"confess",label:"Confess feelings",detail:"Ask about mutual romance"},
 {id:"commit",label:"Become partners",detail:"Discuss a future together"},
 {id:"propose",label:"Propose marriage",detail:"Ask for a shared future"},
 {id:"wedding",label:"Hold wedding",detail:"Celebrate your commitment"},
 {id:"argue",label:"Challenge values",detail:"Risk a disagreement"},
 {id:"betray",label:"Betray their trust",detail:"Potentially become enemies"}
];
let selected="pippa", activeReputationView="companions", romanceExpanded=false, conflictExpanded=false, data={rapport:{pippa:0,bromli:0,lethariel:0},entries:[],relations:{},dialogueIds:[]}, last="";
let storageBlocked=false;
const blank=()=>({trust:0,affection:0,respect:0,status:"Acquaintance",romance:"none",grievances:0,interactions:0,memories:[],nights:0,lastNightDay:null});
const clamp=(v,min=-100,max=100)=>Math.max(min,Math.min(max,Number(v)||0));
const rel=id=>data.relations[id]||(data.relations[id]=blank());
function status(r){return r.trust<=-65?"Enemy":r.trust<=-25?"Rival":r.romance==="married"?"Married":r.romance==="engaged"?"Engaged":r.romance==="committed"?"Partners":r.romance==="dating"?"Dating":r.trust>=65?"Close friend":r.trust>=25?"Friend":"Acquaintance"}
function adjust(r,change){for(const [k,n] of Object.entries(change))r[k]=clamp(r[k]+n);if(r.trust<=-65){r.romance="none"}r.status=status(r)}
const $=id=>document.getElementById(id);
function load(){
 const loaded=window.soaSaveRules.readStoredJSON(KEY);
 if(!loaded.ok){storageBlocked=true;return}
 let v=loaded.value;if(v===null)return;
 try{v=window.soaSaveRules.validateCompanionsSave(v)}catch{storageBlocked=true;window.soaSaveRules.reportCorruption(KEY);return}
 for(const id of Object.keys(PEOPLE))data.rapport[id]=Math.max(0,Math.min(5,Number(v.rapport[id])||0));
 data.entries=v.entries.slice(-40).map(x=>x.person==="Lethariel"?{...x,person:"Lethariel Moonguard"}:x);
 data.dialogueIds=Array.isArray(v.dialogueIds)?v.dialogueIds.filter(x=>typeof x==="string").slice(-100):[];
 if(v.relations&&typeof v.relations==="object"){
  for(const id of Object.keys(PEOPLE)){const old=v.relations[id]||{};if(!old||typeof old!=="object"||Array.isArray(old)){storageBlocked=true;window.soaSaveRules.reportCorruption(KEY);return}const r=blank();for(const k of ["trust","affection","respect"])r[k]=clamp(old[k]);r.interactions=clamp(old.interactions,0,999);r.grievances=clamp(old.grievances,0,999);r.romance=["none","dating","committed","engaged","married"].includes(old.romance)?old.romance:"none";r.memories=Array.isArray(old.memories)?old.memories.slice(-15):[];r.nights=Math.max(0,Number(old.nights)||0);r.lastNightDay=old.lastNightDay??null;r.status=status(r);data.relations[id]=r}
 }else for(const id of Object.keys(PEOPLE)){const r=rel(id),n=data.rapport[id]||0;r.trust=n*9;r.affection=n*5;r.respect=n*6;r.interactions=n;r.status=status(r)}
}
function save(){if(storageBlocked||window.soaSaveRules.isIntegrityBlocked())return false;try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch{window.soaReportStorageFailure?.("Relationship save failed. Check available browser storage.");return false}}
function add(tag,text){const e=document.createElement(tag);e.textContent=text;return e}
function locationAllows(id){if(id!=="lethariel")return true;let mode=false;try{mode=localStorage.getItem("soa-campaign-enabled")==="1"}catch{}if(!mode)return false;const scene=window.soaLivingCampaign?.getState?.()?.scene;return /checkpoint|tavern|regroup/i.test(String(scene?.location||""))}
function encounter(id,kind){
 const level=data.rapport[id]||0,turn=rel(id).interactions||0;
 const scene=window.soaLivingCampaign?.getState?.()?.scene||{};
 const place=String(scene.location||"");
 const subterranean=/canal|drain|tunnel|sewer|vault|corridor|underground/i.test(place);
 const danger=/charge|powder|explosiv|sabot|trap|fuse/i.test(String(scene.title||"")+" "+String(scene.story||"").slice(0,450));
 const pool={
  pippa:{
   talk:[
    'Pippa readjusts her satchel. "Every mystery has a loose wire somewhere. The trick is spotting it before it sparks."',
    'Pippa lowers her voice. "I used to think being clever meant knowing the answer. Now I think it means asking a better question."',
    'She smiles over her goggles. "When this is over, Snacky, I want to build something that absolutely cannot explode."',
    'Pippa gives a quiet laugh. "Someday we should write this adventure down. Nobody back home would believe half of it."'],
   encourage:['Pippa steadies her hands. "Thank you. Even an engineer needs someone to believe in her now and then."','She straightens her goggles. "One problem at a time. I can manage that."','Pippa nods with fresh confidence. "Right. We have come too far to stop thinking clearly now."'],
   advice:['Pippa warns, "Find the weakest connection before touching the mechanism. Someone may have planned for the obvious solution."','She sketches in the dust. "Follow the power. That is where the clever tricks hide."','Pippa says, "Secure our way back before we commit to the next room."'],
   flirt:['Pippa arches a brow. "Was that a compliment, or are you distracting me from work? Because it is working."','A blush crosses Pippa’s cheeks. "You could give a girl some warning before saying things like that, Snacky."','Pippa squeezes your wrist. "Spending this much time with you has become rather inconvenient for my concentration."']},
  bromli:{
   talk:['Bromli adjusts his warhammer. "After this, first round is on me. Dwarven orders, lad."','Bromli strokes his beard. "Marched with folk twice your size. Few had half your nerve."','He chuckles softly. "My old captain called me the loudest scout he ever met. Still promoted me."','Bromli says, "Courage is showing up when your knees would rather go home."'],
   encourage:['Bromli nods. "Aye, little brother. I needed that. I have your back."','He rolls his shoulders. "We make it home together, and I will tell the story twice as loud as it deserves."','Bromli pats his breastplate. "Still standing. That counts for something."'],
   advice:['Bromli advises, "Keep an escape route. There is no shame in living to win the next fight."','He lowers his voice. "When a room is too quiet, check the corners."','Bromli says, "Never split the party without a plan to bring it together again."'],
   flirt:['Bromli snorts. "Careful, lad. Keep that up and I will think you fancy me warhammer collection."','He grins. "Flattery? Buy me a decent ale and I might hear you out."']},
  lethariel:{
   talk:['Lethariel reflects, "Some journeys change us quietly. Only later do we notice what we have become."','She folds her hands. "I have learned much about courage from this company."','Lethariel smiles. "There are things worth protecting beyond the mission itself."'],
   encourage:['Lethariel bows her head. "Your confidence in me is appreciated. I will conserve my strength for those who need it."','She touches your shoulder. "Kind words are never wasted in difficult places."'],
   advice:['Lethariel counsels, "Do not spend your last strength on a danger that patience could avoid."','She replies, "Watch the frightened and wounded. They sometimes notice a danger first."','Lethariel says, "Patience is not surrender."'],
   flirt:['Lethariel acknowledges your compliment kindly before redirecting the conversation toward the expedition.','The priestess inclines her head. "Your kindness is noticed, Snacky, but my heart follows its own path."']}
 };
 let lines=pool[id]?.[kind]||pool[id]?.talk||[PEOPLE[id].base];
 if(kind==="talk"&&subterranean){
  lines=[...lines,id==="bromli"?'Bromli whispers, "Remind me how much I dislike ceilings made of someone else’s masonry."':id==="pippa"?'Pippa studies the stone. "These tunnels were built to carry water, not secrets. Yet here we are."':'Lethariel listens to the dripping stone. "Even here, the world has a heartbeat."'];
 }
 if(kind==="advice"&&danger){
  lines=[...lines,id==="bromli"?'Bromli warns, "Keep the powder away from our people and an exit behind us."':id==="pippa"?'Pippa warns, "Never trust a silent fuse until you know where it ends."':'Lethariel replies, "Keep everyone clear until the danger is truly past."'];
 }
 // Do not repeat the same line in recent conversations with this companion.
 const recent=data.entries.filter(x=>x.person===PEOPLE[id].name).slice(-4).map(x=>x.text);
 const start=(turn+Math.floor(turn/Math.max(1,lines.length)))%lines.length;
 for(let k=0;k<lines.length;k++){const candidate=lines[(start+k)%lines.length];if(!recent.some(x=>x.includes(candidate)))return candidate}
 return lines[start];
}
function recordMemory(id,kind,message){
 const r=rel(id);r.memories||=[];
 const memories={talk:"Shared conversation",encourage:"Encouragement remembered",advice:"Offered personal advice",flirt:"A moment of attraction",bond:"Shared private confidence",confess:"Mutual feelings acknowledged",commit:"Chose partnership",propose:"Promised a future",wedding:"Marriage ceremony",apologize:"Attempted reconciliation",argue:"A difficult disagreement",betray:"Trust was betrayed",overnight:"Spent a peaceful night together"};
 const summary=memories[kind]||"Personal moment";
 r.memories.push({kind,text:summary,at:new Date().toISOString()});r.memories=r.memories.slice(-15);
}
function canSpendNightTogether(id){
 const r=rel(id),adventure=window.soaLivingCampaign?.getState?.();
 const place=String(adventure?.scene?.location||"");
 const period=Math.floor(Math.max(0,Number(adventure?.turn)||0)/12);
 return window.soaCharacters?.profile?.()?.id==="snacky" &&
  locationAllows(id) &&
  ["dating","committed","engaged","married"].includes(r.romance) &&
  r.trust>=65&&r.affection>=70&&r.respect>=35&&r.grievances===0 &&
  /tavern|inn|safehouse|home|quarters|lodging|camp|rest area|sanctuary/i.test(place) &&
  !adventure?.enemies?.some(e=>e.hp>0) &&
  !(Number.isInteger(r.lastNightDay)&&period<=r.lastNightDay);
}
function overnightRest(){
 if(!canSpendNightTogether(selected)){last="A shared overnight stay is not currently available.";draw();return}
 const id=selected,r=rel(id),profile=window.soaCharacters?.profile?.();
 if(profile?.id!=="snacky"){last="This established companion route belongs to Snacky's adventure.";draw();return}
 if(!locationAllows(id)){last="You must be together before arranging an overnight stay.";draw();return}
 if(!["dating","committed","engaged","married"].includes(r.romance)||r.trust<65||r.affection<70||r.respect<35||r.grievances>0){
  last="A shared overnight stay requires an established mutual romance, high trust and affection, respect, and no unresolved grievance.";draw();return
 }
 const scene=window.soaLivingCampaign?.getState?.()?.scene||{},place=String(scene.location||"");
 if(!/tavern|inn|safehouse|home|quarters|lodging|camp|rest area|sanctuary/i.test(place)){
  last="Find safe private lodging or a peaceful camp before spending the night together.";draw();return
 }
 const adventure=window.soaLivingCampaign?.getState?.();
 if(Array.isArray(adventure?.enemies)&&adventure.enemies.some(x=>x.hp>0)){
  last="A hostile encounter is active. Rest is unsafe.";draw();return
 }
 // A fixed story-turn interval prevents farming successive scenes for unlimited XP.
 const dayKey=Math.floor(Math.max(0,Number(adventure?.turn)||0)/12);
 if(Number.isInteger(r.lastNightDay)&&dayKey<=r.lastNightDay){last="You have already received a shared-rest bonus during this story period. Spend time adventuring before another overnight rest.";draw();return}
 
 const receipt="shared-night:"+id+":period-"+dayKey;
 const reward=window.soaProgression?.overnightBond?.({receipt,companionId:id,quality:r.affection>=85&&r.trust>=80?2:1});
 if(!reward?.awarded){last="The morning reward could not be recorded. No relationship change was made.";draw();return}
 r.lastNightDay=dayKey;r.nights=(r.nights||0)+1;
 adjust(r,{trust:2,affection:2});recordMemory(id,"overnight");
 const message="You and "+PEOPLE[id].name+" spend a quiet, consensual evening together. The scene fades to the following morning; renewed companionship grants +"+reward.awarded+" XP. No further reward can be claimed for this rest.";
 data.entries.push({person:PEOPLE[id].name,text:message,kind:"overnight",at:new Date().toISOString(),source:"interaction",sceneTurn:adventure?.turn??null});data.entries=data.entries.slice(-40);
 last=message;save();draw();window.soaLivingCampaign?.refreshUI?.();
}
function interact(kind){
 if(storageBlocked||window.soaSaveRules.isIntegrityBlocked()){last="Relationship changes are paused until saved data has been recovered.";draw();return}
 if(!locationAllows(selected)){last="That companion is stationed elsewhere. Regroup before speaking in person.";draw();return}
 const r=rel(selected),person=PEOPLE[selected].name;let message="",change={},valid=true;
 if(kind==="talk"){change={trust:5,respect:2};message=encounter(selected,"talk")}
 if(kind==="encourage"){change={trust:7,respect:5};message=encounter(selected,"encourage")}
 if(kind==="advice"){change={trust:2,respect:4};message=encounter(selected,"advice")}
 if(kind==="flirt"){if(r.trust<0){valid=false;message=person+" doesn't welcome this right now. Respect the boundary."}else{change={affection:r.trust>=20?8:3,trust:2};message=encounter(selected,"flirt")}}
 if(kind==="bond"){if(r.trust<18){valid=false;message="Get to know one another better before sharing a deeper bond."}else{change={trust:9,respect:4,affection:3};message=person+" shares a private hope and appreciates Snacky's attention."}}
 if(kind==="apologize"){if(r.trust>=10&&r.grievances===0){valid=false;message="There is no outstanding disagreement to settle."}else{change={trust:9,respect:3};r.grievances=Math.max(0,r.grievances-1);message=person+" hears the apology. Trust will take further effort to rebuild."}}
 if(kind==="confess"){if(r.trust<45||r.affection<35||r.interactions<5){valid=false;message="A mutual romance requires more trust, affection, and shared history."}else if(r.romance!=="none"){valid=false;message="That conversation has already happened; nurture your existing relationship."}else{r.romance="dating";change={trust:4,affection:8};message=person+" reciprocates Snacky's feelings and agrees to explore romance at a comfortable pace."}}
 if(kind==="commit"){if(r.romance!=="dating"||r.trust<65||r.affection<60){valid=false;message="A lasting partnership requires an established romance and deeper trust."}else{r.romance="committed";change={trust:5,affection:6};message=person+" agrees to build a future with Snacky."}}
 if(kind==="propose"){if(r.romance!=="committed"||r.trust<82||r.affection<82||r.interactions<12){valid=false;message="A proposal requires a strong committed partnership and shared history."}else{r.romance="engaged";change={trust:2,affection:2};message=person+" accepts Snacky's proposal. They plan a ceremony once safely back in town."}}
 if(kind==="wedding"){if(r.romance!=="engaged"){valid=false;message="A wedding requires an accepted proposal."}else if(!/tavern|town|camp|darkshire/i.test(String(window.soaLivingCampaign?.getState?.()?.scene?.location||""))){valid=false;message="Return to a peaceful location, such as Scarlet Raven Tavern, to celebrate the wedding."}else{r.romance="married";change={trust:4,affection:4};message=person+" and Snacky exchange vows before their friends. Their marriage is entered into the relationship journal."}}
 if(kind==="argue"){change={trust:-14,respect:-10};r.grievances++;message=person+" disagrees strongly with Snacky. Their relationship becomes strained."}
 if(kind==="betray"){change={trust:-44,respect:-24,affection:-18};r.grievances+=2;message=person+" feels betrayed. This may turn a friend into a rival or enemy."}
 if(!message)return;
 if(valid){adjust(r,change);r.interactions++;recordMemory(selected,kind);data.rapport[selected]=clamp(r.trust/9,0,5)}
 last=message;const label=ACTIONS.find(x=>x.id===kind)?.label||kind;
 const moment={person,text:label+": "+message,dialogue:message,kind,at:new Date().toISOString(),source:"interaction",sceneTurn:window.soaLivingCampaign?.getState?.()?.turn??null};
 data.entries.push(moment);data.entries=data.entries.slice(-40);save();draw();
 window.soaLivingCampaign?.refreshUI?.();
 const adventure=document.getElementById("soa-companion-dialogue");
 if(adventure&&adventure.scrollIntoView)adventure.scrollIntoView({behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"auto":"smooth",block:"center"});
}
function applyStoryConsequence(id,kind){
 if(storageBlocked||window.soaSaveRules.isIntegrityBlocked())return false;
 if(!PEOPLE[id])return false;
 const impacts={protect:{trust:12,respect:9,affection:4},honor:{trust:10,respect:10},deceive:{trust:-18,respect:-12},cruelty:{trust:-25,respect:-25,affection:-12},betray:{trust:-45,respect:-30,affection:-25}};
 if(!impacts[kind])return false;const r=rel(id);adjust(r,impacts[kind]);
 if(["deceive","cruelty","betray"].includes(kind))r.grievances++;r.interactions++;
 const text=PEOPLE[id].name+" reacts to "+kind+"; relationship: "+status(r)+".";
 data.entries.push({person:PEOPLE[id].name,text,at:new Date().toISOString()});data.entries=data.entries.slice(-40);save();draw();return true;
}
// Story dialogue adjusts relationships only after its scene is confirmed and saved.
// The unique action ID makes reloads and retries idempotent.
function applyDialogueOutcome(event){
 if(storageBlocked||window.soaSaveRules.isIntegrityBlocked())return false;
 if(!event||typeof event!=="object")return false;
 const id=String(event.id||""),target=String(event.target||"");
 const tone=String(event.tone||"neutral"),success=event.success===true;
 if(!id||!PEOPLE[target]||!["friendly","support","flirt","honest","disagree","insult","betray","apologize","neutral"].includes(tone))return false;
 if(data.dialogueIds.includes(id))return false;
 const changes={
  friendly:{trust:4,respect:1},
  support:{trust:7,respect:3,affection:1},
  flirt:{trust:1,affection:6},
  honest:{trust:4,respect:6},
  disagree:{trust:-4,respect:-2},
  insult:{trust:-12,respect:-10,affection:-5},
  betray:{trust:-30,respect:-22,affection:-16},
  apologize:{trust:6,respect:2},
  neutral:{}
 };
 const r=rel(target);
 let delta=success?changes[tone]:{};
 // A failed friendly approach has no automatic penalty; an insult or betrayal still hurts.
 if(!success&&["insult","betray"].includes(tone))delta=changes[tone];
 if(tone==="flirt"&&r.trust<0)delta={};
 if(tone==="apologize"&&r.grievances===0)delta={};
 if(Object.keys(delta).length){adjust(r,delta);r.interactions++;data.rapport[target]=clamp(r.trust/9,0,5)}
 if(["insult","betray"].includes(tone))r.grievances++;
 if(tone==="apologize"&&Object.keys(delta).length)r.grievances=Math.max(0,r.grievances-1);
 data.dialogueIds.push(id);data.dialogueIds=data.dialogueIds.slice(-100);
 const summary=Object.entries(delta).map(([k,v])=>k+" "+(v>0?"+":"")+v).join(", ");
 const description="Custom dialogue ("+tone+"): "+(summary||"no change")+"; "+status(r)+".";
 data.entries.push({person:PEOPLE[target].name,text:description,at:new Date().toISOString()});
 data.entries=data.entries.slice(-40);save();draw();return true;
}
function draw(){
 const target=$("companion-panel");if(!target)return;
 target.replaceChildren();
 const top=add("div","REPUTATION · ALLIES, FACTIONS & ENEMIES");top.className="soa-kicker";target.append(top);
 const heading=add("h2","Reputation");heading.className="soa-section-title";target.append(heading);
 const intro=add("p","Companion bonds, faction standings and enemies shape your reputation across Azeroth. Friendship, romance and rivalries remain part of your story.");intro.className="muted";target.append(intro);
 const views=add("div","");views.className="soa-reputation-view-tabs";views.setAttribute("role","group");views.setAttribute("aria-label","Reputation section");
 const companionsButton=add("button","Companions & Romance"),factionsButton=add("button","Factions & Enemies");
 for(const btn of [companionsButton,factionsButton]){btn.type="button";btn.className="soa-reputation-view-button";views.append(btn)}
 target.append(views);
 const companionGroup=add("div","");companionGroup.id="soa-companions-content";target.append(companionGroup);
 const factionGroup=add("div","");factionGroup.id="soa-factions-content";target.append(factionGroup);
 function showView(view){
  activeReputationView=view==="factions"?"factions":"companions";
  companionGroup.hidden=activeReputationView!=="companions";
  factionGroup.hidden=activeReputationView!=="factions";
  companionsButton.setAttribute("aria-pressed",String(activeReputationView==="companions"));
  factionsButton.setAttribute("aria-pressed",String(activeReputationView==="factions"));
 }
 companionsButton.onclick=()=>showView("companions");
 factionsButton.onclick=()=>showView("factions");
 showView(activeReputationView);
 // Fresh heroes must not inherit Snacky's named companions or relationship actions.
 const soloHero=window.soaCharacters?.isNewCharacter?.()===true;
 const present=window.soaLivingCampaign?.getState?.()?.combatAllies||[];
 const hasKnownCompanion=Array.isArray(present)&&present.some(ally=>Object.values(PEOPLE).some(p=>p.name===ally?.name));
 if(soloHero&&!hasKnownCompanion){
  const empty=add("p","Your adventurer is traveling alone. Companions and relationships will become available when you meet someone and they actually join your adventure.");
  empty.className="muted";companionGroup.append(empty);
  showView("factions");window.soaReputation?.renderInto?.(factionGroup);
  return;
 }
 const subhead=add("h3","Companions & personal relationships");subhead.className="soa-section-title";companionGroup.append(subhead);
 const nav=add("div","");nav.className="soa-people";nav.setAttribute("role","group");nav.setAttribute("aria-label","Choose companion");
 for(const [id,p] of Object.entries(PEOPLE)){
  const b=document.createElement("button");b.type="button";b.className="soa-person"+(id===selected?" selected":"");b.setAttribute("aria-pressed",id===selected?"true":"false");b.textContent=p.icon+" "+p.name.split(" ")[0];b.onclick=()=>{selected=id;last="";draw()};nav.append(b)
 }companionGroup.append(nav);
 const p=PEOPLE[selected],info=add("div","");info.className="soa-companion-info";info.append(add("strong",p.name),add("span",p.role));
 const identity=add("p",p.race+" · "+p.specialization+" "+p.className);identity.className="soa-companion-class";info.append(identity);
 const r=rel(selected);const stars=add("span",status(r));stars.className="soa-rapport";info.append(stars);companionGroup.append(info);
 const leveling=window.soaProgression?.companionBadge?.(selected);if(leveling)companionGroup.append(leveling);
 const sheet=window.soaAbilities?.card?.(selected);if(sheet)companionGroup.append(sheet);
 const indicators=add("div","");indicators.className="soa-relation-metrics";for(const [name,label] of [["trust","Trust"],["affection","Affection"],["respect","Respect"]]){const unit=add("div","");unit.className="soa-relation-cell";const title=add("div",label+" · "+r[name]);title.className="soa-relation-label";const rail=add("div","");rail.className="soa-relation-rail";const fill=add("div","");fill.className="soa-relation-fill "+name;fill.style.width=((r[name]+100)/2)+"%";rail.append(fill);unit.append(title,rail);indicators.append(unit)}companionGroup.append(indicators);
 if(!locationAllows(selected)){const msg=add("p",p.base);msg.className="muted";companionGroup.append(msg)}
 if(canSpendNightTogether(selected)){
  const nights=add("button","Spend the night together · restful morning XP");nights.type="button";nights.className="soa-social-action";nights.onclick=overnightRest;companionGroup.append(nights);
 }
 const categories=[
  {label:"Everyday interactions",ids:["talk","encourage","advice","flirt","bond"],expanded:true},
  {label:"Romance & commitments",ids:["confess","commit","propose","wedding"],expanded:romanceExpanded,key:"romance"},
  {label:"Disagreements & reconciliation",ids:["apologize","argue","betray"],expanded:conflictExpanded,key:"conflict"}
 ];
 for(const category of categories){
  const wrapper=category.key?document.createElement("details"):add("div","");
  wrapper.className="soa-relation-action-group";
  if(category.key){wrapper.open=category.expanded;wrapper.ontoggle=()=>{if(category.key==="romance")romanceExpanded=wrapper.open;else conflictExpanded=wrapper.open};wrapper.append(add("summary",category.label))}
  else wrapper.append(add("h4",category.label));
  const grid=add("div","");grid.className="soa-interactions";
  for(const a of ACTIONS.filter(a=>category.ids.includes(a.id))){
   const b=document.createElement("button");b.type="button";b.className="soa-social-action";b.disabled=!locationAllows(selected);
   b.append(add("strong",a.label),add("small",a.detail));b.onclick=()=>interact(a.id);grid.append(b);
  }
  wrapper.append(grid);companionGroup.append(wrapper);
 }
 // Companion conversations appear within Adventure narration instead of here.
 window.soaReputation?.renderInto?.(factionGroup);
}
load();
const el=document.createElement("section");el.className="panel soa-companion-panel";el.id="companion-panel";
const campaign=$("campaign-box");if(campaign)campaign.after(el);else document.querySelector("header")?.after(el);
draw();
window.soaCompanions={getProfiles:()=>Object.fromEntries(Object.entries(PEOPLE).map(([id,p])=>[id,{name:p.name,race:p.race,className:p.className,specialization:p.specialization,level:window.soaProgression?.level?.(id)||10,role:p.role}])),getRecent:()=>{const seen=new Set();return data.entries.slice().reverse().filter(x=>{const key=(x.person+"|"+x.text).toLowerCase().replace(/\s+/g," ").trim();if(seen.has(key))return false;seen.add(key);return true}).slice(0,4).reverse().map(x=>x.person+": "+x.text.slice(0,150))},getAdventureMoments:()=>{const turn=window.soaLivingCampaign?.getState?.()?.turn;return data.entries.filter(x=>x.source==="interaction"&&typeof x.dialogue==="string"&&x.sceneTurn===turn).slice(-3)},getRapport:()=>({...data.rapport}),getConversationContext:()=>Object.fromEntries(Object.keys(PEOPLE).map(id=>{const r=rel(id);return [id,{stage:status(r),romance:r.romance,trust:r.trust,affection:r.affection,respect:r.respect,interactions:r.interactions,grievances:r.grievances,nights:r.nights||0,memories:(r.memories||[]).slice(-8).map(m=>m.text),recentMoments:data.entries.filter(x=>x.person===PEOPLE[id].name).slice(-4).map(x=>x.text.slice(0,150))}]})),getRelationships:()=>Object.fromEntries(Object.keys(PEOPLE).map(id=>{const r=rel(id);return [id,{trust:r.trust,affection:r.affection,respect:r.respect,status:status(r),romance:r.romance,grievances:r.grievances}]})),applyStoryConsequence,applyDialogueOutcome,refresh:draw,refreshProgress:draw};
})();
