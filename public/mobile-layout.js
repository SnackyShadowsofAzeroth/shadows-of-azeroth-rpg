(()=>{"use strict";
const KEY="soa-layout-v1";
const tabs=[
 ["adventure","Adventure"],
 ["quest","Quest"],
 ["character","Character"],
 ["reputation","Reputation"],
 ["settings","Settings"],
];
const legacyTabs={journal:"quest",companions:"reputation"};
const normalize=name=>legacyTabs[name]||name;
const validTab=name=>tabs.some(([id])=>id===name);
let active="adventure";
try{const saved=normalize(localStorage.getItem(KEY));if(validTab(saved))active=saved}catch{window.soaReportStorageFailure?.("Tab preference could not be read; Adventure is selected for this session.")}
const get=id=>document.getElementById(id);
function sections(){return [...document.querySelectorAll("main > section.panel, main > section.soa-game-screen")]}
function group(section){
 if(["campaign-box","soa-adventure-story"].includes(section.id)||section.querySelector?.("#choices"))return "adventure";
 if(["soa-chronicle","soa-party-evidence"].includes(section.id))return "quest";
 if(["soa-character-screen","soa-character-status","soa-profession-panel"].includes(section.id)||section.querySelector?.("#hpbar"))return "character";
 if(["companion-panel","soa-standalone-reputation"].includes(section.id)||section.querySelector?.("#soa-companions-content"))return "reputation";
 if(["soa-legacy-ai","soa-save-settings"].includes(section.id)||section.querySelector?.("#ai-enabled,#export"))return "settings";
 return "adventure";
}
function init(){
 window.soaCharacters?.organizeSections?.();
 const nav=document.querySelector(".soa-quick-nav");if(!nav)return;
 const buttons=[...nav.querySelectorAll("button.soa-quick-link")];
 for(const button of buttons){const tab=button.dataset.gameTab;if(validTab(tab))button.onclick=()=>select(tab)}
 document.body.classList.add("soa-tabbed");
 function render(){
  if(!document.body.classList.contains("soa-tabbed"))return;
  for(const section of sections())section.hidden=group(section)!==active||section.dataset.soaUnavailable==="true";
  for(const button of buttons){const selected=button.dataset.gameTab===active;button.setAttribute("aria-current",selected?"page":"false");button.classList.toggle("active",selected)}
 }
 function select(name){
  const selected=normalize(name);if(!validTab(selected))return;
  active=selected;
  try{localStorage.setItem(KEY,active)}catch{window.soaReportStorageFailure?.("Tab preference could not be saved; the selected section remains open for this session.")}
  render();window.scrollTo?.({top:0,behavior:"auto"});
 }
 window.soaLayout={
  select,refresh:render,
  disable:()=>{document.body.classList.remove("soa-tabbed");sections().forEach(section=>{section.hidden=section.dataset.soaUnavailable==="true"})},
  enable:()=>{document.body.classList.add("soa-tabbed");render()},
 };
 render();
}
if(document.readyState==="loading"||document.readyState==="interactive")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
