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
 {id:"flirt",label:"Flirt",detail:"A playful, respectful remark"}
];
let selected="pippa", data={rapport:{pippa:0,bromli:0,lethariel:0},entries:[]}, last="";
const $=id=>document.getElementById(id);
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v&&v.rapport&&Array.isArray(v.entries)){for(const id of Object.keys(PEOPLE))data.rapport[id]=Math.max(0,Math.min(5,Number(v.rapport[id])||0));data.entries=v.entries.slice(-30).filter(x=>x&&typeof x.text==="string"&&typeof x.person==="string");}}catch(e){}}
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
 const response=encounter(selected,kind),person=PEOPLE[selected].name;
 if(kind==="encourage"||kind==="flirt"||kind==="talk")data.rapport[selected]=Math.min(5,(data.rapport[selected]||0)+1);
 const label=ACTIONS.find(a=>a.id===kind)?.label||kind;
 last=response;data.entries.push({person,text:label+": "+response,at:new Date().toISOString()});
 data.entries=data.entries.slice(-30);save();draw();
}
function draw(){
 const target=$("companion-panel");if(!target)return;
 target.replaceChildren();
 const top=add("div","COMPANION MOMENTS · OPTIONAL");top.className="soa-kicker";target.append(top);
 const heading=add("h2","Campfire & Companions");heading.className="soa-section-title";target.append(heading);
 const intro=add("p","Take a brief character moment without advancing the mission, spending Energy, or requiring AI. Local interactions save separately.");intro.className="muted";target.append(intro);
 const nav=add("div","");nav.className="soa-people";nav.setAttribute("role","group");nav.setAttribute("aria-label","Choose companion");
 for(const [id,p] of Object.entries(PEOPLE)){
  const b=document.createElement("button");b.type="button";b.className="soa-person"+(id===selected?" selected":"");b.setAttribute("aria-pressed",id===selected?"true":"false");b.textContent=p.icon+" "+p.name.split(" ")[0];b.onclick=()=>{selected=id;last="";draw()};nav.append(b)
 }target.append(nav);
 const p=PEOPLE[selected],info=add("div","");info.className="soa-companion-info";info.append(add("strong",p.name),add("span",p.role));
 const stars=add("span","Rapport "+(data.rapport[selected]||0)+"/5");stars.className="soa-rapport";info.append(stars);target.append(info);
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
window.soaCompanions={getRecent:()=>data.entries.slice(-4).map(x=>x.person+": "+x.text.slice(0,150)),getRapport:()=>({...data.rapport})};
})();
