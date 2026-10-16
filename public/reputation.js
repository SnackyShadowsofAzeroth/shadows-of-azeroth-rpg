(()=>{"use strict";
const KEY="soa-reputation-v1", LIMIT=100;
const FACTIONS={
 "si7":{name:"SI:7",affiliation:"Alliance intelligence",base:0},
 "stormwind":{name:"Stormwind",affiliation:"Alliance kingdom",base:0},
 "night-watch":{name:"Night Watch",affiliation:"Duskwood defenders",base:0},
 "ironforge":{name:"Ironforge",affiliation:"Alliance kingdom",base:0},
 "horde":{name:"The Horde",affiliation:"Faction alliance",base:0},
 "defias":{name:"Defias Brotherhood",affiliation:"Outlaw organization",base:0},
 "scarlet":{name:"Scarlet Crusade",affiliation:"Militant order",base:0}
};
const aliases={
 si7:/\b(?:SI:?7|Stormwind intelligence)\b/i,
 stormwind:/\bStormwind\b/i,
 "night-watch":/\bNight Watch\b/i,
 ironforge:/\bIronforge\b/i,
 horde:/\b(?:the Horde|Horde forces|Horde patrol)\b/i,
 defias:/\bDefias(?: Brotherhood)?\b/i,
 scarlet:/\bScarlet Crusade\b/i
};
const good= /\b(?:help\w*|aid\w*|rescu\w*|defend\w*|protect\w*|deliver\w*|support\w*|assist\w*|warn\w*|save\w*|serve\w*)\b/i;
const bad=/\b(?:betray\w*|attack\w*|steal\w*|sabotag\w*|assault\w*|rob\w*|ambush\w*|harm\w*|deceiv\w*|threaten\w*)\b/i;
const reputationLabel=n=>n<=-75?"Hunted":n<=-50?"Hostile":n<=-20?"Unfriendly":n<20?"Neutral":n<50?"Friendly":n<75?"Honored":"Exalted";
const clamp=n=>Math.max(-100,Math.min(100,Math.round(Number(n)||0)));
let data={factions:{},events:[],handled:[],notices:[]};
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
const character=()=>window.soaCharacters?.profile?.()?.id||"snacky";
function baseline(id){
 const r={};for(const [key,f] of Object.entries(FACTIONS))r[key]={value:f.base};
 // Historical alignments are inferred from character affiliation; no unearned money/items.
 const p=window.soaCharacters?.profile?.();
 if(p?.id==="snacky"){r.si7.value=40;r.stormwind.value=25;r["night-watch"].value=20;r.defias.value=-15;r.scarlet.value=-20}
 else if(p?.faction==="Alliance"){r.stormwind.value=15;r.horde.value=-15}
 else if(p?.faction==="Horde"){r.horde.value=15;r.stormwind.value=-15}
 return r;
}
function load(){
 try{const saved=JSON.parse(localStorage.getItem(KEY)||"null");
  if(saved&&saved.factions&&typeof saved.factions==="object"){
    for(const [key,entry] of Object.entries(saved.factions)){if(FACTIONS[key])data.factions[key]={value:clamp(entry?.value)}}
    data.events=Array.isArray(saved.events)?saved.events.slice(-50):[];
    data.handled=Array.isArray(saved.handled)?saved.handled.filter(x=>typeof x==="string").slice(-200):[];
    data.notices=Array.isArray(saved.notices)?saved.notices.slice(-30):[];
  }
 }catch(e){}
 const base=baseline(character());
 for(const [key,entry] of Object.entries(base))if(!data.factions[key])data.factions[key]=entry;
 persist();
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}}
function standing(){return Object.fromEntries(Object.entries(data.factions).map(([id,r])=>[id,{name:FACTIONS[id].name,value:r.value,label:reputationLabel(r.value)}]))}
function pendingNotices(){return data.notices.slice(-6).map(e=>({faction:FACTIONS[e.faction]?.name||"",kind:e.kind,status:"unresolved"}))}
function applyChange({id,faction,delta,source}){
 if(!id||!FACTIONS[faction]||!Number.isFinite(delta)||data.handled.includes(id))return false;
 const record=data.factions[faction],before=record.value,after=clamp(before+Math.max(-20,Math.min(20,delta)));
 record.value=after;data.handled.push(id);data.handled=data.handled.slice(-200);
 data.events.push({faction,delta:after-before,source:String(source||"Adventure event").slice(0,115),at:new Date().toISOString()});data.events=data.events.slice(-50);
 // Issue ONE hook at a threshold crossing; this is narrative only, NEVER coins, items or damage.
 if(before>-75&&after<=-75)data.notices.push({faction,kind:"pursuit",id:id+":pursuit"});
 if(before<75&&after>=75)data.notices.push({faction,kind:"patronage",id:id+":patronage"});
 data.notices=data.notices.slice(-30);persist();renderInto();return true;
}
function fromAction({id,action,resolution}){
 if(!id||!/^Success:/i.test(String(resolution||"")))return false;
 const text=String(action||"").slice(0,360);
 const matches=Object.keys(aliases).filter(key=>aliases[key].test(text));
 // If action explicitly names multiple factions, let the story resolve it rather than guess.
 if(matches.length!==1)return false;
 const positive=good.test(text),negative=bad.test(text);
 if(positive===negative)return false;
 return applyChange({id,faction:matches[0],delta:positive?8:-12,source:text});
}
function markResolved(id){
 const n=data.notices.find(x=>x.id===id);if(!n)return false;
 data.notices=data.notices.filter(x=>x.id!==id);
 persist();renderInto();return true;
}
function rowFor(id){
 const f=FACTIONS[id],value=data.factions[id]?.value||0;
 const wrap=node("div",undefined,"soa-faction-row");
 const top=node("div",undefined,"soa-faction-top");
 top.append(node("strong",f.name),node("span",reputationLabel(value)+" · "+(value>0?"+":"")+value));
 const note=node("div",f.affiliation,"soa-faction-note");
 const rail=node("div",undefined,"soa-faction-rail"),fill=node("div",undefined,"soa-faction-fill");
 fill.style.width=((value+100)/2)+"%";
 fill.className+=" "+(value<=-50?"danger":value>=50?"loyal":"neutral");
 rail.append(fill);wrap.append(top,note,rail);
 return wrap;
}
function renderInto(target){
 target=target||$("companion-panel");if(!target)return;
 const old=target.querySelector("#soa-faction-ledger");if(old)old.remove();
 const section=node("section",undefined,"soa-reputation-ledger");section.id="soa-faction-ledger";
 const title=node("h3","Faction standings");title.className="soa-section-title";section.append(title);
 section.append(node("p","Actions influence factions. Friendly powers may offer support; hostile groups may pursue you. Offers and threats become story opportunities, never automatic inventory or combat changes.","muted"));
 const tabs=node("div",undefined,"soa-reputation-tabs");
 const all=["All","Allies","Hostiles"];let filter="All";
 const records=node("div",undefined,"soa-faction-list");
 function drawRows(){records.replaceChildren();for(const key of Object.keys(FACTIONS)){const n=data.factions[key]?.value||0;if(filter==="Allies"&&n<20)continue;if(filter==="Hostiles"&&n>-20)continue;records.append(rowFor(key))}if(!records.children.length)records.append(node("p","No factions in this category yet.","muted"))}
 for(const name of all){const b=node("button",name,"soa-reputation-tab");b.type="button";b.setAttribute("aria-pressed",String(name===filter));b.onclick=()=>{filter=name;for(const v of tabs.children)v.setAttribute("aria-pressed",String(v===b));drawRows()};tabs.append(b)}
 section.append(tabs,records);drawRows();
 if(data.notices.length){
  const alerts=node("div",undefined,"soa-reputation-alerts");alerts.append(node("h3","Developments awaiting resolution"));
  for(const entry of data.notices.slice(-5)){
   const f=FACTIONS[entry.faction];if(!f)continue;
   alerts.append(node("p",entry.kind==="pursuit"?f.name+" may send agents to find you. No encounter has started.":f.name+" may offer aid or supplies through a messenger. Nothing has been received."));
  }section.append(alerts);
 }
 const history=node("details",undefined,"soa-reputation-history");history.append(node("summary","Faction history ("+data.events.length+")"));
 if(!data.events.length)history.append(node("p","Your reputation will change through meaningful faction-related actions."));
 for(const e of data.events.slice(-8).reverse()){history.append(node("p",(FACTIONS[e.faction]?.name||"Faction")+" "+(e.delta>=0?"+":"")+e.delta+" — "+e.source))}
 section.append(history);
 target.append(section);
}
load();
window.soaReputation={getStandings:standing,getDevelopments:pendingNotices,applyChange,fromAction,markResolved,renderInto};
})();
