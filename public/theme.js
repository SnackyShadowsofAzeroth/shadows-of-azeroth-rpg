(()=>{"use strict";
const KEY="soa-ui-theme-v1";
const CLASS="theme-stormwind-si7";
const supported=new Set(["classic","stormwind-si7"]);
let current="classic";
try{const value=localStorage.getItem(KEY);if(supported.has(value))current=value}catch(e){}
function apply(value,persist=true){
 const next=supported.has(value)?value:"classic";
 current=next;
 document.body.classList.toggle(CLASS,next==="stormwind-si7");
 for(const button of document.querySelectorAll("[data-soa-theme]")){
   const chosen=button.dataset.soaTheme===next;
   button.setAttribute("aria-pressed",String(chosen));
 }
 const note=document.getElementById("soa-theme-note");
 if(note)note.textContent=next==="classic"?"Original appearance restored. Your adventure stays unchanged.":"Stormwind stonework and SI:7 dossier style active. Tap Classic to revert.";
 if(persist){try{localStorage.setItem(KEY,next)}catch(e){}}
 return next;
}
const header=document.querySelector("header");
if(!header)return;
const wrap=document.createElement("nav");
wrap.className="soa-theme-switch";
wrap.setAttribute("aria-label","Appearance theme");
const label=document.createElement("span");label.className="soa-theme-label";label.textContent="Appearance · SI:7 Field Operations";
wrap.append(label);
for(const [id,name] of [["classic","Classic"],["stormwind-si7","Stormwind SI:7"]]){
 const button=document.createElement("button");
 button.type="button";button.dataset.soaTheme=id;button.textContent=name;
 button.onclick=()=>apply(id);
 wrap.append(button);
}
const note=document.createElement("p");note.className="soa-theme-note";note.id="soa-theme-note";note.setAttribute("aria-live","polite");wrap.append(note);
header.append(wrap);
apply(current,false);
window.soaTheme={set:apply,current:()=>current};
})();
