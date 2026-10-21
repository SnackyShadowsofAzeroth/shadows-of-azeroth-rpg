(()=>{"use strict";
const KEY="soa-layout-v1";
const tabs=[
 ["adventure","Adventure","campaign-box"],
 ["quest","Quest","soa-chronicle"],
 ["character","Character","soa-character-screen"],
 ["reputation","Reputation","companion-panel"],
 ["settings","Settings","soa-save-settings"],
];
const legacyTabs={journal:"quest",companions:"reputation"};
const normalize=name=>legacyTabs[name]||name;
const validTab=name=>tabs.some(([id])=>id===name);
let active="adventure";
try{const saved=normalize(localStorage.getItem(KEY));if(validTab(saved))active=saved}catch{window.soaReportStorageFailure?.("Tab preference could not be read; Adventure is selected for this session.")}
const get=id=>document.getElementById(id);
function sections(){return [...document.querySelectorAll("main > section.panel, main > section.soa-game-screen")]}
function group(section){
 if(section.id==="soa-contract-board")return "quest";
 if(["campaign-box","soa-adventure-story"].includes(section.id)||section.querySelector?.("#choices"))return "adventure";
 if(["soa-chronicle","soa-party-evidence"].includes(section.id))return "quest";
 if(["soa-character-screen","soa-character-status","soa-profession-panel"].includes(section.id)||section.querySelector?.("#hpbar"))return "character";
 if(["companion-panel","soa-standalone-reputation"].includes(section.id)||section.querySelector?.("#soa-companions-content"))return "reputation";
 if(["soa-legacy-ai","soa-ai-narration"].includes(section.id))return "adventure";
 if(section.id==="soa-save-settings"||section.querySelector?.("#export"))return "settings";
 return "adventure";
}
function removeLegacyNavigation(){
 document.getElementById("soa-mobile-nav")?.remove();
 document.getElementById("soa-mobile-summary")?.remove();
 document.querySelector(".soa-quick-nav")?.remove();
}
function createNavigation(){
 const nav=document.createElement("nav");nav.id="soa-mobile-nav";nav.setAttribute("aria-label","Game sections");
 for(const [tab,label,target] of tabs){
  const button=document.createElement("button");button.type="button";button.textContent=label;button.dataset.gameTab=tab;button.setAttribute("aria-controls",target);button.setAttribute("aria-current","false");
  nav.append(button);
 }
 document.body.append(nav);return nav;
}
function init(){
 removeLegacyNavigation();
 window.soaCharacters?.organizeSections?.();
 const nav=createNavigation();
 const buttons=[...nav.querySelectorAll("button")];
 for(const button of buttons){const tab=button.dataset.gameTab;if(validTab(tab))button.onclick=()=>select(tab)}
 document.body.classList.add("soa-tabbed");
 function render(){
  if(!document.body.classList.contains("soa-tabbed"))return;
  for(const section of sections())section.hidden=group(section)!==active||section.dataset.soaUnavailable==="true"||(section.id==="soa-legacy-ai"&&window.soaAiDirector?.isConnected?.()===true);
  for(const button of buttons){const selected=button.dataset.gameTab===active;button.setAttribute("aria-current",selected?"page":"false");button.classList.toggle("active",selected)}
 }
 function select(name){
  const selected=normalize(name);if(!validTab(selected))return;
  active=selected;
  try{localStorage.setItem(KEY,active)}catch{window.soaReportStorageFailure?.("Tab preference could not be saved; the selected section remains open for this session.")}
  render();window.scrollTo?.({top:0,behavior:"auto"});
 }
 window.soaLayout={
  version:2,select,refresh:render,
  disable:()=>{document.body.classList.remove("soa-tabbed");sections().forEach(section=>{section.hidden=section.dataset.soaUnavailable==="true"})},
  enable:()=>{document.body.classList.add("soa-tabbed");render()},
 };
 render();
}
if(document.readyState==="loading"||document.readyState==="interactive")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
