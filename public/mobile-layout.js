(()=>{"use strict";
const KEY="soa-layout-v1";
const tabs=[["adventure","Adventure","campaign-box"],["character","Character","soa-profession-panel"],["journal","Journal","soa-chronicle"],["companions","Companions","companion-panel"],["settings","Settings","ai-enabled"]];
let active=localStorage.getItem(KEY)||"adventure";
const shell=document.createElement("nav");shell.id="soa-mobile-nav";shell.setAttribute("aria-label","Game sections");
const summary=document.createElement("div");summary.id="soa-mobile-summary";
document.body.append(shell);
const get=id=>document.getElementById(id);
function target(tab){
 if(tab==="settings")return get("ai-enabled")?.closest("section.panel");
 if(tab==="journal")return get("soa-chronicle")||document.querySelector("#journal")?.closest("section.panel");
 if(tab==="character")return get("soa-profession-panel");
 if(tab==="companions")return get("companion-panel")||get("soa-standalone-reputation");
 return get("campaign-box")||get("choices")?.closest("section.panel");
}
function topLevel(section){let e=section;while(e&&e.parentElement&&e.parentElement.tagName!=="MAIN")e=e.parentElement;return e?.parentElement?.tagName==="MAIN"?e:null}
function sections(){return [...document.querySelectorAll("main > section.panel")]}
function group(section){
 if(section.id==="campaign-box"||section.querySelector("#choices"))return "adventure";
 if(section.id==="soa-profession-panel"||section.querySelector("#hpbar"))return "character";
 if(section.id==="soa-chronicle"||section.querySelector("#journal"))return "journal";
 if(section.id==="companion-panel"||section.id==="soa-standalone-reputation")return "companions";
 if(section.querySelector("#ai-enabled")||section.querySelector("#export"))return "settings";
 return "adventure";
}
function render(){
 const enabled=document.body.classList.contains("soa-tabbed");
 if(!enabled)return;
 for(const s of sections()){const belongs=group(s);s.classList.toggle("soa-tab-hidden",belongs!==active)}
 for(const b of shell.querySelectorAll("button")){const on=b.dataset.tab===active;b.setAttribute("aria-current",on?"page":"false");b.classList.toggle("active",on)}
 const hp=get("hp")?.textContent||"",en=get("energy")?.textContent||"",money=get("gold")?.textContent||"";
 summary.textContent=hp?"HP "+hp+"  ·  Energy "+en+"  ·  "+money:"Shadows of Azeroth";
}
function select(name){active=name;localStorage.setItem(KEY,name);render();window.scrollTo({top:0,behavior:"instant"})}
for(const [id,label] of tabs){const b=document.createElement("button");b.type="button";b.textContent=label;b.dataset.tab=id;b.onclick=()=>select(id);shell.append(b)}
document.body.classList.add("soa-tabbed");document.querySelector("main")?.prepend(summary);
const observer=new MutationObserver(()=>{if(!document.body.classList.contains("soa-tabbed"))return;render()});
observer.observe(document.querySelector("main")||document.body,{childList:true,subtree:false});
window.soaLayout={select,refresh:render,disable:()=>{document.body.classList.remove("soa-tabbed");sections().forEach(s=>s.classList.remove("soa-tab-hidden"));shell.hidden=true;summary.hidden=true},enable:()=>{document.body.classList.add("soa-tabbed");shell.hidden=false;summary.hidden=false;render()}};
render();
})();