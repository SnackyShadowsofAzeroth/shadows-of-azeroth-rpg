(()=>{"use strict";
const KEY="soa-campaign-v1", MAX=24;
let campaign=null,busy=false,enabled=false,customDraft="",customType="investigate";
const get=id=>document.getElementById(id);
function store(){try{localStorage.setItem(KEY,JSON.stringify(campaign))}catch(e){}}
function make(){return {turn:0,scene:null,history:[],journal:[],lastError:"",lastAction:"Begin the next chapter from the secured central junction",lastResult:"No further events yet. The six-person expedition is intact; the zero-alarm objective is active."}}
function safe(text){return String(text||"").slice(0,2600)}
function result(action){
 const t=action.type;let cost=0,chance=1,damage=0;
 if(t==="stealth"){cost=20;chance=.78-s.alert*.08}
 if(t==="engineering"){cost=10;chance=.75-s.alert*.05}
 if(t==="social"){cost=0;chance=.8-s.alert*.08}
 if(t==="combat"){cost=35;chance=.68-s.alert*.04}
 if(t==="investigate"){cost=10;chance=.88}
 if(t==="move"){cost=0;chance=.95}
 if(t==="rest"){cost=0;chance=.94}
 chance=Math.max(.25,Math.min(.97,chance+(action.difficulty==="easy"?.09:action.difficulty==="hard"?-.2:0)));
 if(s.en<cost)return null;
 const ok=Math.random()<chance;
 s.en=Math.min(100,s.en-cost+10);s.time++; if(!ok&&["stealth","engineering","combat"].includes(t)){s.alert=Math.min(3,s.alert+1);damage=t==="combat"?8:t==="stealth"?3:0;s.hp=Math.max(1,s.hp-damage)}
 if(ok&&t==="rest")s.hp=Math.min(100,s.hp+4);
 if(ok&&t==="combat"){s.money+=75;addLog("Combat encounter survived; 75 copper recovered")}
 const msg=ok?"Success":"Complication";
 let effect=t==="combat"?(ok?"The immediate opponent is overcome in a single abstract skirmish.":"The opponent remains a threat; Snacky takes "+damage+" damage."):t==="stealth"?(ok?"Snacky remains concealed.":"A noise attracts nearby attention."):t==="engineering"?(ok?"Pippa's mechanism works as intended.":"The apparatus sparks and raises suspicion."):t==="social"?(ok?"The approach is received favorably.":"The target refuses to cooperate."):t==="rest"?(ok?"The party regains composure.":"The party cannot safely rest."):ok?"The action achieves its immediate intent.":"The action encounters resistance.";
 return msg+": "+effect+" Result is authoritative; do not invent additional mechanical effects.";
}
function interfaceUI(){
 if(get("campaign-box"))return;
 const el=document.createElement("section");el.className="panel";el.id="campaign-box";
 el.innerHTML='<h2>Living Campaign <span class="tag">Gemini · Online</span></h2><p class="muted">Automatic scene generation after each choice. Game rolls, health, energy, money and alarms remain local. All new story scenes save on this device. Offline: existing saved scene remains readable and the original scripted adventure remains playable.</p><label class="ai-toggle"><input type="checkbox" id="campaign-mode"> Enable living campaign</label><button id="campaign-start">Start / Resume AI campaign</button><button id="campaign-offline" class="sub">Return to offline adventure</button><div id="campaign-status" class="muted" aria-live="polite"></div><div id="campaign-scene"></div>';
 document.querySelector("header").after(el);
 get("campaign-mode").onchange=e=>{enabled=e.target.checked;localStorage.setItem("soa-campaign-enabled",enabled?"1":"0");if(enabled){if(!campaign)campaign=make();store();draw();if(navigator.onLine)advance(campaign.lastAction,campaign.lastResult,true)}else{get("campaign-scene").replaceChildren();showOriginal(true)}};
 get("campaign-start").onclick=()=>{if(!campaign)campaign=make();enabled=true;get("campaign-mode").checked=true;localStorage.setItem("soa-campaign-enabled","1");advance(campaign.lastAction,campaign.lastResult,true)};
 get("campaign-offline").onclick=()=>{enabled=false;get("campaign-mode").checked=false;localStorage.setItem("soa-campaign-enabled","0");showOriginal(true);get("campaign-status").textContent="Offline scripted adventure enabled."};
}
function showOriginal(show){for(const el of document.querySelectorAll("main > section.panel")){if(el.id==="campaign-box")continue;const isStory=!!el.querySelector("#choices");if(isStory)el.style.display=show?"":"none"}}
function draw(){
 if(!enabled||!campaign)return;showOriginal(false);
 const box=get("campaign-scene");box.replaceChildren();
 if(!campaign.scene){get("campaign-status").textContent="Ready to generate the next scene.";return}
 const sc=campaign.scene,head=document.createElement("h3"),where=document.createElement("div"),text=document.createElement("p");head.textContent=sc.title||"The Hollow Raven";where.className="muted";where.textContent=sc.location||"Raven Hill";text.style.whiteSpace="pre-line";text.textContent=sc.story;box.append(head,where,text);
 for(const choice of sc.choices){const b=document.createElement("button");b.textContent=choice.text+" · "+choice.type;b.className=choice.difficulty==="easy"?"low":choice.difficulty==="hard"?"high":"med";b.disabled=busy;b.onclick=()=>choose(choice);box.append(b)}
 const form=document.createElement("form"),label=document.createElement("label"),input=document.createElement("textarea"),typeLabel=document.createElement("label"),type=document.createElement("select"),submit=document.createElement("button"),help=document.createElement("p");
 label.htmlFor="campaign-custom-action";label.textContent="Or choose your own action";
 input.id="campaign-custom-action";input.className="ai-input";input.maxLength=300;input.required=true;input.rows=3;input.placeholder="e.g. Ask Pippa to build a distraction while I slip past the guards";input.value=customDraft;input.disabled=busy;
 input.oninput=()=>{customDraft=input.value;submit.disabled=busy||!navigator.onLine||!customDraft.trim()};
 typeLabel.htmlFor="campaign-custom-type";typeLabel.textContent="Action type";type.id="campaign-custom-type";type.className="ai-input";type.disabled=busy;
 for(const [value,name] of [["investigate","Investigate"],["stealth","Stealth"],["engineering","Engineering"],["social","Social"],["combat","Combat"],["move","Move"],["rest","Rest"]]){const option=document.createElement("option");option.value=value;option.textContent=name;type.append(option)}
 type.value=customType;type.onchange=()=>{customType=type.value};
 help.id="campaign-custom-help";help.className="muted";help.textContent="Describe what you attempt. Action type sets the normal Energy cost and roll; custom actions use medium difficulty. New scenes require internet.";input.setAttribute("aria-describedby",help.id);
 submit.type="submit";submit.textContent="Take custom action";submit.disabled=busy||!navigator.onLine||!customDraft.trim();
 form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text||busy)return;choose({text,type:type.value,difficulty:"medium"})};form.append(label,input,typeLabel,type,help,submit);box.append(form);
 const foot=document.createElement("p");foot.className="muted";foot.textContent="Scene "+campaign.turn+" · "+(navigator.onLine?"Online":"Offline saved scene")+" · "+campaign.journal.slice(-2).join(" · ");box.append(foot)
}
async function choose(choice){if(busy)return; if(!navigator.onLine){get("campaign-status").textContent="Offline: return to scripted adventure or reconnect to generate your next scene.";return}
 if(!get("ai-code")?.value.trim()){get("campaign-status").textContent="Enter your private AI access code below before taking an action.";return}
 const resolution=result(choice);if(!resolution){get("campaign-status").textContent="Not enough Energy for that action.";return}
 campaign.lastAction=safe(choice.text);campaign.lastResult=resolution;campaign.history.push("Player: "+campaign.lastAction+" | "+resolution);campaign.history=campaign.history.slice(-MAX);store();render();await advance(campaign.lastAction,resolution,false)}
async function advance(action,resolution,retry){
 if(busy)return;if(!navigator.onLine){get("campaign-status").textContent="Offline: saved scene available; new scenes require internet.";draw();return}
 const code=get("ai-code")?.value.trim();
 if(!code){get("campaign-status").textContent="Enter your private AI access code in the AI Story Director panel below, then tap Start / Resume.";draw();return}
 busy=true;get("campaign-status").textContent="Gemini is writing the next scene…";draw();
 try{
 const response=await fetch("./api/campaign",{method:"POST",headers:{"content-type":"application/json","x-story-access":code},body:JSON.stringify({context:{location:campaign.scene?.location||"Hollow Raven laboratory",previousScene:campaign.scene?.story||"",action,resolution,hp:s.hp,energy:s.en,gold:fmtMoney(s.money),alarm:s.alert,turn:campaign.turn,history:campaign.history,flags:Object.keys(s.flags||{})}})});
 const data=await response.json().catch(()=>({error:"Invalid server response"}));if(!response.ok)throw Error(data.error||"Request failed");
 if(!Array.isArray(data.choices)||!data.story)throw Error("Incomplete generated scene");
 campaign.scene=data;campaign.turn++;customDraft="";campaign.history.push("Scene: "+safe(data.title)+" - "+safe(data.story).slice(0,180));campaign.history=campaign.history.slice(-MAX);if(data.journal)campaign.journal.push(safe(data.journal).slice(0,200));campaign.journal=campaign.journal.slice(-100);campaign.lastError="";store();get("campaign-status").textContent="Scene generated and saved. Choose your next action.";
 }catch(e){campaign.lastError=e.message;store();get("campaign-status").textContent="AI unavailable: "+e.message+". Your game progress remains saved; tap Start / Resume to retry."}finally{busy=false;draw()}
}
try{campaign=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){campaign=null}
enabled=localStorage.getItem("soa-campaign-enabled")==="1";interfaceUI();get("campaign-mode").checked=enabled;
if(enabled){if(!campaign)campaign=make();draw();if(!campaign.scene&&navigator.onLine)advance(campaign.lastAction,campaign.lastResult,true)}
window.soaLivingCampaign={getState:()=>campaign,enabled:()=>enabled};})();