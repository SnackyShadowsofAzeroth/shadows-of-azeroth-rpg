(()=>{"use strict";
const KEY="soa-companions-v1", PEOPLE={
 pippa:{name:"Pippa Sparkwhistle",role:"Gnome engineer · scout",icon:"⚙",base:"Pippa adjusts her emerald-tinted goggles, keeping a watchful eye on the corridor."},
 bromli:{name:"Bromli Ironkeg",role:"Dwarf warrior · scout",icon:"🛡",base:"Bromli rests a gauntleted hand on his warhammer."},
 lethariel:{name:"Lethariel",role:"Night elf priestess · rear guard",icon:"✦",base:"Lethariel is currently assigned to checkpoint security, away from the Archive scouting party."}
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
let selected="pippa", data={rapport:{pippa:0,bromli:0,lethariel:0},entries:[],relations:{},dialogueIds:[]}, last="";
const blank=()=>({trust:0,affection:0,respect:0,status:"Acquaintance",romance:"none",grievances:0,interactions:0});
const clamp=(v,min=-100,max=100)=>Math.max(min,Math.min(max,Number(v)||0));
const rel=id=>data.relations[id]||(data.relations[id]=blank());
function status(r){return r.trust<=-65?"Enemy":r.trust<=-25?"Rival":r.romance==="married"?"Married":r.romance==="engaged"?"Engaged":r.romance==="committed"?"Partners":r.romance==="dating"?"Dating":r.trust>=65?"Close friend":r.trust>=25?"Friend":"Acquaintance"}
function adjust(r,change){for(const [k,n] of Object.entries(change))r[k]=clamp(r[k]+n);if(r.trust<=-65){r.romance="none"}r.status=status(r)}
const $=id=>document.getElementById(id);
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v&&v.rapport&&Array.isArray(v.entries)){for(const id of Object.keys(PEOPLE))data.rapport[id]=Math.max(0,Math.min(5,Number(v.rapport[id])||0));data.entries=v.entries.slice(-40).filter(x=>x&&typeof x.text==="string"&&typeof x.person==="string");data.dialogueIds=Array.isArray(v.dialogueIds)?v.dialogueIds.filter(x=>typeof x==="string").slice(-100):[];if(v.relations&&typeof v.relations==="object"){for(const id of Object.keys(PEOPLE)){const old=v.relations[id]||{},r=blank();for(const k of ["trust","affection","respect"])r[k]=clamp(old[k]);r.interactions=clamp(old.interactions,0,999);r.grievances=clamp(old.grievances,0,999);r.romance=["none","dating","committed","engaged","married"].includes(old.romance)?old.romance:"none";r.status=status(r);data.relations[id]=r}}else{for(const id of Object.keys(PEOPLE)){const r=rel(id),n=data.rapport[id]||0;r.trust=n*9;r.affection=n*5;r.respect=n*6;r.interactions=n;r.status=status(r)}}}}catch(e){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}}
function add(tag,text){const e=document.createElement(tag);e.textContent=text;return e}
function locationAllows(id){if(id!=="lethariel")return true;const mode=localStorage.getItem("soa-campaign-enabled")==="1";if(!mode)return false;const scene=window.soaLivingCampaign?.getState?.()?.scene;return /checkpoint|tavern|regroup/i.test(String(scene?.location||""))}
function encounter(id,kind){const level=data.rapport[id]||0;
 if(id==="pippa"){
  if(kind==="flirt")return level>=3?"Pippa's smile lingers. “Careful, Snacky. You're becoming my favorite distraction.”":"Pippa arches a brow. “Is that a compliment, or are you trying to borrow my wrench again?”";
  if(kind==="encourage")return "Pippa straightens her satchel. “Glad someone appreciates an elegant solution.”";
  if(kind==="advice")return "Pippa recommends examining unfamiliar mechanisms before trusting stolen credentials. “We can be bold without being careless.”";
  return "Pippa shares a quick observation about the team's improvised Whisper-Links, then returns her attention to the expedition.";
 }
 if(id==="bromli"){
  if(kind==="flirt")return "Bromli bursts into a muffled laugh. “Save yer charm for someone who isn't wearing plate armor, lad!”";
  if(kind==="encourage")return "Bromli thumps his chest lightly. “Aye. I've got your back, little brother.”";
  if(kind==="advice")return "Bromli suggests keeping a clear retreat route. “No shame in leaving a fight to win the next one.”";
  return "Bromli tells a short tavern story, carefully keeping his voice below its usual booming volume.";
 }
 if(kind==="flirt")return "Lethariel gives a measured smile and gently redirects the conversation toward the expedition.";
 if(kind==="encourage")return "Lethariel appreciates the thought and reminds Snacky to preserve the party's strength.";
 if(kind==="advice")return "Lethariel recommends restraint with scarce healing magic and caution around mnemonic machinery.";
 return "Lethariel acknowledges Snacky's concern and quietly reports that she is maintaining the rear guard.";
}
function interact(kind){
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
 if(valid){adjust(r,change);r.interactions++;data.rapport[selected]=clamp(r.trust/9,0,5)}
 last=message;const label=ACTIONS.find(x=>x.id===kind)?.label||kind;
 data.entries.push({person,text:label+": "+message,at:new Date().toISOString()});data.entries=data.entries.slice(-40);save();draw();
}
function applyStoryConsequence(id,kind){
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
 const top=add("div","RELATIONSHIPS · FRIENDSHIP AND RIVALRY");top.className="soa-kicker";target.append(top);
 const heading=add("h2","Bonds of Azeroth");heading.className="soa-section-title";target.append(heading);
 const intro=add("p","Build friendship, explore mutual romance, commit or marry. Choices can also damage trust and create rivals or enemies. Optional conversations do not advance the mission or spend Energy.");intro.className="muted";target.append(intro);
 const nav=add("div","");nav.className="soa-people";nav.setAttribute("role","group");nav.setAttribute("aria-label","Choose companion");
 for(const [id,p] of Object.entries(PEOPLE)){
  const b=document.createElement("button");b.type="button";b.className="soa-person"+(id===selected?" selected":"");b.setAttribute("aria-pressed",id===selected?"true":"false");b.textContent=p.icon+" "+p.name.split(" ")[0];b.onclick=()=>{selected=id;last="";draw()};nav.append(b)
 }target.append(nav);
 const p=PEOPLE[selected],info=add("div","");info.className="soa-companion-info";info.append(add("strong",p.name),add("span",p.role));
 const r=rel(selected);const stars=add("span",status(r));stars.className="soa-rapport";info.append(stars);target.append(info);
 const indicators=add("div","");indicators.className="soa-relation-metrics";for(const [name,label] of [["trust","Trust"],["affection","Affection"],["respect","Respect"]]){const unit=add("div","");unit.className="soa-relation-cell";const title=add("div",label+" · "+r[name]);title.className="soa-relation-label";const rail=add("div","");rail.className="soa-relation-rail";const fill=add("div","");fill.className="soa-relation-fill "+name;fill.style.width=((r[name]+100)/2)+"%";rail.append(fill);unit.append(title,rail);indicators.append(unit)}target.append(indicators);
 if(!locationAllows(selected)){const msg=add("p",p.base);msg.className="muted";target.append(msg)}
 const grid=add("div","");grid.className="soa-interactions";
 for(const a of ACTIONS){const b=document.createElement("button");b.type="button";b.className="soa-social-action";b.disabled=!locationAllows(selected);b.append(add("strong",a.label),add("small",a.detail));b.onclick=()=>interact(a.id);grid.append(b)}target.append(grid);
 if(last){const output=add("blockquote",last);output.className="soa-social-result";output.setAttribute("aria-live","polite");target.append(output)}
 const details=document.createElement("details");details.className="soa-journal";
 const summary=add("summary","Relationship journal ("+data.entries.length+")");details.append(summary);
 const entries=add("div","");entries.className="soa-journal-entries";
 if(!data.entries.length)entries.append(add("p","Your first companion moment awaits."));
 for(const entry of data.entries.slice(-8).reverse()){const e=add("p",entry.person+" — "+entry.text);entries.append(e)}
 details.append(entries);target.append(details);
}
load();
const el=document.createElement("section");el.className="panel soa-companion-panel";el.id="companion-panel";
const campaign=$("campaign-box");if(campaign)campaign.after(el);else document.querySelector("header")?.after(el);
draw();
window.soaCompanions={getRecent:()=>data.entries.slice(-4).map(x=>x.person+": "+x.text.slice(0,150)),getRapport:()=>({...data.rapport}),getRelationships:()=>Object.fromEntries(Object.keys(PEOPLE).map(id=>{const r=rel(id);return [id,{trust:r.trust,affection:r.affection,respect:r.respect,status:status(r),romance:r.romance,grievances:r.grievances}]})),applyStoryConsequence,applyDialogueOutcome,refresh:draw};
})();
