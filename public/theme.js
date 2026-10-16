(()=>{"use strict";
const KEY="soa-ui-theme-v1", CLASS="theme-alternative";
const supported=new Set(["classic","alternative"]);
let current="classic";
try{const saved=localStorage.getItem(KEY);if(supported.has(saved))current=saved}catch(e){}
function apply(value,persist=true){
 const next=supported.has(value)?value:"classic";current=next;
 document.body.classList.toggle(CLASS,next==="alternative");
 document.body.classList.remove("theme-stormwind-si7");
 for(const button of document.querySelectorAll("[data-soa-theme]"))button.setAttribute("aria-pressed",String(button.dataset.soaTheme===next));
 const note=document.getElementById("soa-theme-note");
 if(note)note.textContent=next==="classic"?"Original appearance restored.":"Parchment quest-journal appearance active.";
 if(persist)try{localStorage.setItem(KEY,next)}catch(e){}
 return next;
}
const header=document.querySelector("header");if(!header)return;
const wrap=document.createElement("nav");wrap.className="soa-theme-switch";wrap.setAttribute("aria-label","Appearance theme");
const label=document.createElement("span");label.className="soa-theme-label";label.textContent="Appearance";wrap.append(label);
for(const [id,name] of [["classic","Classic"],["alternative","Alternative Theme"]]){
 const button=document.createElement("button");button.type="button";button.dataset.soaTheme=id;button.textContent=name;
 button.onclick=()=>apply(id);wrap.append(button);
}
const note=document.createElement("p");note.className="soa-theme-note";note.id="soa-theme-note";note.setAttribute("aria-live","polite");wrap.append(note);
header.append(wrap);apply(current,false);
window.soaTheme={set:apply,current:()=>current};
})();