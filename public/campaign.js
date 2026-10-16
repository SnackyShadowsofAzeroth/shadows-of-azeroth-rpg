(()=>{"use strict";
const KEY="soa-campaign-v1", MAX=24;
let campaign=null,busy=false,enabled=false,customDraft="",customType="investigate",statusMessage="";
const get=id=>document.getElementById(id);
function store(){try{localStorage.setItem(KEY,JSON.stringify(campaign))}catch(e){}}
function make(){return {turn:0,scene:null,history:[],journal:[],lastError:"",lastAction:"Begin the next chapter from the secured central junction",lastResult:"No further events yet. The six-person expedition is intact; the zero-alarm objective is active.",pending:null}}
function safe(text){return String(text||"").slice(0,2600)}
function status(message){statusMessage=message;const el=get("campaign-status");if(el)el.textContent=message}
function accessCode(){return get("ai-code")?.value.trim()||""}
function focusAccess(){status("Enter your private AI access code in the AI Story Director panel to continue.");const f=get("ai-code");if(f){f.scrollIntoView({behavior:"smooth",block:"center"});f.focus()}}
function refreshDisplay(){render();draw();window.soaCompanions?.refresh?.();window.soaCharacters?.refreshProfessions?.()}
function pending(){return campaign?.pending&&typeof campaign.pending.action==="string"?campaign.pending:null}
// Conservative explicit-target parsing: never infer a relationship event from ordinary movement.
function dialogueFromCustom(action){
 if(!action?.custom)return null;
 const text=String(action.text||"").slice(0,300);
 const mentions=[["pippa",/\b(?:pippa|sparkwhistle)\b/i],["bromli",/\b(?:bromli|ironkeg)\b/i],["lethariel",/\b(?:lethariel)\b/i]].filter(([id,re])=>re.test(text));
 if(mentions.length!==1)return null;
 // Explicit dialogue intent required; references to a companion in another activity don't count.
 if(!/\b(?:talk\w*|speak\w*|say|tell|chat\w*|convers\w*|compliment\w*|flirt\w*|jok\w*|thank\w*|prais\w*|apologiz\w*|confess\w*|insult\w*|mock\w*|argu\w*|betray\w*|lie\b|reassur\w*|encourag\w*|comfort\w*|support\w*)\b/i.test(text))return null;
 const tone=/\b(?:betray|sell out|turn against)\b/i.test(text)?"betray":
 /\b(?:insult|mock|humiliat\w*|threaten)\b/i.test(text)?"insult":
 /\b(?:apologiz\w*|sorry|forgive me)\b/i.test(text)?"apologize":
 /\b(?:flirt\w*|romance|attract\w*|kiss\w*|beautiful|handsome|adorable|crush)\b/i.test(text)?"flirt":
 /\b(?:argue|disagree|challenge)\b/i.test(text)?"disagree":
 /\b(?:support|comfort|reassure|encourage|protect)\b/i.test(text)?"support":
 /\b(?:truth|honest|confess)\b/i.test(text)?"honest":
 /\b(?:thank\w*|prais\w*|compliment\w*|jok\w*|friendly|friend|kind)\b/i.test(text)?"friendly":"neutral";
 return {target:mentions[0][0],tone};
}
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
 // Defeating an opponent does not itself loot them: currency changes require explicit search/loot actions.
 const msg=ok?"Success":"Complication";
 let effect=t==="combat"?(ok?"The immediate opponent is overcome in a single abstract skirmish.":"The opponent remains a threat; Snacky takes "+damage+" damage."):t==="stealth"?(ok?"Snacky remains concealed.":"A noise attracts nearby attention."):t==="engineering"?(ok?"Pippa's mechanism works as intended.":"The apparatus sparks and raises suspicion."):t==="social"?(ok?"The approach is received favorably.":"The target refuses to cooperate."):t==="rest"?(ok?"The party regains composure.":"The party cannot safely rest."):ok?"The action achieves its immediate intent.":"The action encounters resistance.";
 return msg+": "+effect+" Result is authoritative; do not invent additional mechanical effects.";
}
function interfaceUI(){
 if(get("campaign-box"))return;
 const el=document.createElement("section");el.className="panel";el.id="campaign-box";
 el.innerHTML='<h2>Living Campaign <span class="tag">Gemini · Online</span></h2><label class="ai-toggle"><input type="checkbox" id="campaign-mode"> Enable living campaign</label><button id="campaign-start">Start / Resume AI campaign</button><button id="campaign-offline" class="sub">Return to offline adventure</button><div id="campaign-status" class="muted" aria-live="polite"></div><div id="campaign-scene"></div>';
 document.querySelector("header").after(el);
 get("campaign-mode").onchange=e=>{enabled=e.target.checked;localStorage.setItem("soa-campaign-enabled",enabled?"1":"0");if(enabled){if(!campaign)campaign=make();store();draw();if(navigator.onLine&&(!campaign.scene||pending()))advance(campaign.lastAction,campaign.lastResult,true)}else{get("campaign-scene").replaceChildren();showOriginal(true)}};
 get("campaign-start").onclick=()=>{if(!campaign)campaign=make();enabled=true;get("campaign-mode").checked=true;localStorage.setItem("soa-campaign-enabled","1");draw();if(!accessCode()){focusAccess();return}if(pending()||!campaign.scene)advance(campaign.lastAction,campaign.lastResult,true);else{status("Saved scene ready. Choose an action below.");refreshDisplay()}};
 get("campaign-offline").onclick=()=>{enabled=false;get("campaign-mode").checked=false;localStorage.setItem("soa-campaign-enabled","0");showOriginal(true);get("campaign-status").textContent="Offline scripted adventure enabled."};
}
function showOriginal(show){if(window.soaCharacters?.isNewCharacter?.())show=false;for(const el of document.querySelectorAll("main > section.panel")){if(el.id==="campaign-box")continue;const isStory=!!el.querySelector("#choices");if(isStory)el.style.display=show?"":"none"}}
function draw(){
 if(!enabled||!campaign)return;showOriginal(false);
 const box=get("campaign-scene");box.replaceChildren();
 if(!campaign.scene){status(statusMessage||"Ready to generate the next scene.");return}
 const sc=campaign.scene,head=document.createElement("h3"),where=document.createElement("div"),text=document.createElement("p");head.textContent=sc.title||"The Hollow Raven";where.className="muted";where.textContent=sc.location||"Raven Hill";text.style.whiteSpace="pre-line";text.textContent=sc.story;box.append(head,where,text);
 if(pending()){const note=document.createElement("p");note.className="soa-pending";note.textContent="Your last decision is saved. The next story scene has not arrived. Retry safely without repeating the action.";box.append(note);const retry=document.createElement("button");retry.className="med";retry.textContent="Retry generating next scene";retry.disabled=busy;retry.onclick=()=>advance(campaign.lastAction,campaign.lastResult,true);box.append(retry)}
 for(const [index,choice] of sc.choices.entries()){const b=document.createElement("button");b.className=choice.difficulty==="easy"?"low":choice.difficulty==="hard"?"high":"med";const headline=document.createElement("strong"),detail=document.createElement("small");headline.textContent=String.fromCharCode(65+index)+") "+choice.text;headline.style.display="block";detail.textContent=(choice.difficulty||"medium")+" difficulty · "+(choice.type||"investigate");detail.style.cssText="display:block;margin-top:5px;color:#bccbd6;font:12px system-ui;text-transform:capitalize";b.append(headline,detail);b.disabled=busy||!!pending();b.onclick=()=>choose(choice);box.append(b)}
 const surveyIndex=sc.choices.length;
 const survey=document.createElement("button");
 survey.type="button";survey.className="low soa-resource-survey";
 const surveyTitle=document.createElement("strong"),surveyHint=document.createElement("small");
 surveyTitle.textContent=String.fromCharCode(65+surveyIndex)+") Survey surrounding resources";
 surveyTitle.style.display="block";
 surveyHint.textContent="Look for ore, herbs, water and other natural materials · Investigate";
 surveyHint.style.cssText="display:block;margin-top:5px;color:#d6dfd2;font:12px system-ui";
 survey.append(surveyTitle,surveyHint);
 survey.disabled=busy||!!pending()||!navigator.onLine;
 survey.onclick=()=>choose({text:"Survey the immediate surroundings for accessible natural resources suitable for this character's professions. Search carefully for visible ore veins, herbs, fishable water, recoverable hides and other plausible materials; note what is actually present. Do not harvest, mine, gather or award materials yet. If none are accessible, report that clearly.",type:"investigate",difficulty:"medium",survey:true});
 box.append(survey);
 const form=document.createElement("form"),label=document.createElement("label"),input=document.createElement("textarea"),typeLabel=document.createElement("label"),type=document.createElement("select"),submit=document.createElement("button"),help=document.createElement("p");
 label.htmlFor="campaign-custom-action";label.textContent=String.fromCharCode(65+Math.min(sc.choices.length+1,25))+") Custom action — choose your own approach";
 input.id="campaign-custom-action";input.className="ai-input";input.maxLength=300;input.required=true;input.rows=3;input.placeholder="e.g. Ask Pippa to build a distraction while I slip past the guards";input.value=customDraft;input.disabled=busy||!!pending();
 input.oninput=()=>{customDraft=input.value;submit.disabled=busy||!!pending()||!navigator.onLine||!customDraft.trim()};
 typeLabel.htmlFor="campaign-custom-type";typeLabel.textContent="Action type";type.id="campaign-custom-type";type.className="ai-input";type.disabled=busy||!!pending();
 for(const [value,name] of [["investigate","Investigate"],["stealth","Stealth"],["engineering","Engineering"],["social","Social"],["combat","Combat"],["move","Move"],["rest","Rest"]]){const option=document.createElement("option");option.value=value;option.textContent=name;type.append(option)}
 type.value=customType;type.onchange=()=>{customType=type.value};
 help.id="campaign-custom-help";help.className="muted";help.textContent="Write dialogue with Pippa, Bromli or Lethariel to affect relationships after the scene resolves. Direct conversation is recognized automatically; other actions use the selected type. New scenes require internet.";;input.setAttribute("aria-describedby",help.id);
 submit.type="submit";submit.textContent="Take custom action";submit.disabled=busy||!navigator.onLine||!customDraft.trim();
 form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text||busy)return;choose({text,type:type.value,difficulty:"medium",custom:true})};form.append(label,input,typeLabel,type,help,submit);box.append(form);
 const foot=document.createElement("p");foot.className="muted";foot.textContent="Scene "+campaign.turn+" · "+(navigator.onLine?"Online":"Offline saved scene")+" · "+campaign.journal.slice(-2).join(" · ");box.append(foot)
}
async function choose(choice){
 if(busy||pending())return;
 if(!navigator.onLine){status("Offline: your saved scene is available. Reconnect to generate another.");return}
 if(!accessCode()){focusAccess();return}
 const detected=dialogueFromCustom(choice);if(detected&&choice.custom&&choice.type==="investigate")choice={...choice,type:"social"};
 const resolution=result(choice);
 if(!resolution){status("Not enough Energy for that action.");return}
 campaign.lastAction=safe(choice.text);campaign.lastResult=resolution;
 campaign.pending={action:campaign.lastAction,resolution,startedAt:Date.now(),dialogue:detected,survey:choice.survey===true};
 campaign.history.push("Player: "+campaign.lastAction+" | "+resolution);
 campaign.history=campaign.history.slice(-MAX);store();refreshDisplay();
 await advance(campaign.lastAction,resolution,false);
}
async function advance(action,resolution,retry){
 if(busy)return;if(!navigator.onLine){get("campaign-status").textContent="Offline: saved scene available; new scenes require internet.";draw();return}
 const code=accessCode();
 if(!code){focusAccess();draw();return}
 busy=true;status("Gemini is writing the next scene…");draw();
 try{
 const response=await fetch("./api/campaign",{method:"POST",headers:{"content-type":"application/json","x-story-access":code},body:JSON.stringify({context:{location:campaign.scene?.location||(window.soaCharacters?.isNewCharacter?.()?"New adventurer prologue":"Hollow Raven laboratory"),previousScene:campaign.scene?.story||"",action,resolution,hp:s.hp,energy:s.en,gold:fmtMoney(s.money),alarm:s.alert,turn:campaign.turn,history:campaign.history,flags:Object.keys(s.flags||{}),companionMoments:window.soaCompanions?.getRecent?.()||[],relationships:window.soaCompanions?.getRelationships?.()||{},character:window.soaCharacters?.profile?.()||null,resourceSurvey:campaign.pending?.survey===true}})});
 const data=await response.json().catch(()=>({error:"Invalid server response"}));if(!response.ok)throw Error(data.error||"Request failed");
 if(!Array.isArray(data.choices)||!data.story)throw Error("Incomplete generated scene");
 const completedDialogue=campaign.pending?.dialogue?{...campaign.pending.dialogue,id:"campaign-dialogue-"+campaign.pending.startedAt+"-"+campaign.turn,success:/^Success:/i.test(campaign.pending.resolution)}:null;
 const completedProfession=campaign.pending?{action:campaign.pending.action,resolution:campaign.pending.resolution,id:"profession-"+campaign.pending.startedAt+"-"+campaign.turn}:null;
 campaign.scene=data;campaign.turn++;campaign.pending=null;customDraft="";campaign.history.push("Scene: "+safe(data.title)+" - "+safe(data.story).slice(0,180));campaign.history=campaign.history.slice(-MAX);if(data.journal)campaign.journal.push(safe(data.journal).slice(0,200));campaign.journal=campaign.journal.slice(-100);campaign.lastError="";if(completedDialogue)window.soaCompanions?.applyDialogueOutcome?.(completedDialogue);if(completedProfession)window.soaCharacters?.applyProfession?.(completedProfession.action,completedProfession.resolution,completedProfession.id);store();status("Scene generated and saved. Choose your next action.");
 }catch(e){campaign.lastError=e.message;store();status("AI unavailable: "+e.message+". Your last action is preserved. Tap Retry generating next scene; it will not spend Energy twice.")}finally{busy=false;refreshDisplay()}
}
try{campaign=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){campaign=null}
enabled=localStorage.getItem("soa-campaign-enabled")==="1";interfaceUI();get("campaign-mode").checked=enabled;
if(enabled){if(!campaign)campaign=make();draw();if(!campaign.scene&&navigator.onLine)advance(campaign.lastAction,campaign.lastResult,true)}
window.soaLivingCampaign={getState:()=>campaign,enabled:()=>enabled};})();