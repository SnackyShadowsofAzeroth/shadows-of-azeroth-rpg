(()=>{"use strict";
/* Chronicle v1: save-bound act/chapter and quest journal. No automatic quest
   completion or teleportation. Player confirms each milestone explicitly. */
const clean=(value,n=120)=>String(value??"").trim().slice(0,n);
const roman=n=>{const vals=[["X",10],["IX",9],["V",5],["IV",4],["I",1]];let out="";for(const [symbol,v] of vals){while(n>=v){out+=symbol;n-=v}}return out||"I"};
const el=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e};
const get=id=>document.getElementById(id);
let save=()=>{},current=null;
function makeQuest(id,title,objectives,complete=false){
 return {id,title,status:complete?"completed":"active",objectives:objectives.map((label,i)=>({id:id+"-"+i,label,done:complete}))};
}
function initial(){
 const person=window.soaCharacters?.profile?.();
 if(person?.id==="snacky"||!person){
  return {schema:1,act:2,actTitle:"Shadows Over Stormwind",chapter:1,chapterTitle:"The Threat in the Capital",startedAtTurn:0,archives:[{id:"hollow-raven-complete",act:1,actTitle:"The Hollow Raven Conspiracy",chapter:1,chapterTitle:"The Hollow Raven Investigation",summary:"The Hollow Raven investigation is completed and its findings await debriefing with SI:7.",completed:true}],quests:[
    makeQuest("hollow-raven","Investigate Hollow Raven",["Solve the Hollow Raven operation"],true),
    makeQuest("stormwind","The Stormwind Threat",["Return to Stormwind","Investigate the explosives threat","Defuse the threat"],false),
    makeQuest("si7-debrief","Report to SI:7",["Brief SI:7 on Hollow Raven and the Stormwind situation"],false)
   ],pendingMilestone:null,lastPresented:"",banner:null};
 }
 return {schema:1,act:1,actTitle:"An Adventurer's Beginning",chapter:1,chapterTitle:"A New Path",startedAtTurn:0,archives:[],quests:[makeQuest("personal-quest","The First Adventure",["Follow the opening lead"],false)],pendingMilestone:null,lastPresented:"",banner:null};
}
function attach(c){
 if(!c||typeof c!=="object")return null;
 if(!c.chronicle||typeof c.chronicle!=="object")c.chronicle=initial();
 const d=c.chronicle;
 d.act=Math.max(1,Math.min(99,Math.floor(Number(d.act)||1)));
 d.chapter=Math.max(1,Math.min(99,Math.floor(Number(d.chapter)||1)));
 d.actTitle=clean(d.actTitle)||"An Unnamed Act";
 d.chapterTitle=clean(d.chapterTitle)||"An Unnamed Chapter";
 if(!Array.isArray(d.archives))d.archives=[];
 if(!Array.isArray(d.quests))d.quests=[];
 if(!Array.isArray(d.entries))d.entries=[];
 current=c;
 return d;
}
function context(c){
 const d=attach(c);if(!d)return null;
 return {act:d.act,actTitle:d.actTitle,chapter:d.chapter,chapterTitle:d.chapterTitle,activeQuests:d.quests.filter(q=>q.status==="active").slice(0,8).map(q=>({title:clean(q.title),objectives:q.objectives.filter(o=>!o.done).map(o=>clean(o.label))})),completedQuests:d.quests.filter(q=>q.status==="completed").slice(-6).map(q=>clean(q.title)),recentArchives:d.archives.slice(-4).map(x=>({act:x.act,chapter:x.chapter,title:clean(x.chapterTitle),summary:clean(x.summary,180)}))};
}
function receive(c,scene){
 const d=attach(c);if(!d||!scene||d.pendingMilestone)return;
 const candidate=scene.chapterMilestone;
 if(!candidate||candidate.propose!==true||typeof candidate.title!=="string")return;
 // An AI suggestion is review-only; no scene result may silently advance a chapter.
 const title=clean(candidate.title,90),reason=clean(candidate.reason,220);
 if(!title||!reason)return;
 d.pendingMilestone={id:"milestone-"+String(c.turn||0)+"-"+title.toLowerCase(),title,reason,kind:candidate.kind==="act"?"act":"chapter",sceneTitle:clean(scene.title,90)};
 save();render(c);
}
function confirm(c){
 const d=attach(c);if(!d?.pendingMilestone)return;
 const m=d.pendingMilestone,archive={id:"archive-"+d.act+"-"+d.chapter,act:d.act,actTitle:d.actTitle,chapter:d.chapter,chapterTitle:d.chapterTitle,summary:clean(m.reason,220),completed:true};
 if(!d.archives.some(x=>x.id===archive.id))d.archives.push(archive);
 d.archives=d.archives.slice(-75);
 if(m.kind==="act"){d.act++;d.chapter=1;d.actTitle=m.title;d.chapterTitle="Opening Moves"}
 else{d.chapter++;d.chapterTitle=m.title}
 d.startedAtTurn=Number(c.turn)||0;d.banner={act:d.act,chapter:d.chapter,title:m.title,reason:m.reason};
 d.pendingMilestone=null;save();render();window.soaLivingCampaign?.refreshUI?.();
}
function dismiss(c){const d=attach(c);if(!d)return;d.pendingMilestone=null;save();render();window.soaLivingCampaign?.refreshUI?.()}
function completeObjective(c,questId,objectiveId){
 const d=attach(c),q=d?.quests.find(x=>x.id===questId&&x.status==="active");
 if(!q)return;
 const o=q.objectives.find(x=>x.id===objectiveId&&!x.done);if(!o)return;
 if(!window.confirm("Mark this objective complete? Only confirm if it actually happened in your adventure."))return;
 o.done=true;if(q.objectives.every(x=>x.done))q.status="completed";
 save();render();
}
function journalPanel(c,d){
 const panel=el("div",undefined,"soa-personal-journal");
 const form=el("form",undefined,"soa-journal-compose");
 const label=el("label","Write a journal entry");
 const input=el("textarea");input.maxLength=2000;input.rows=4;input.placeholder="Record a thought, clue, or moment from your adventure…";input.setAttribute("aria-label","Journal entry");label.append(input);
 const add=el("button","Add to Journal");add.type="submit";form.append(label,add);
 form.onsubmit=e=>{e.preventDefault();const text=clean(input.value,2000);if(!text)return;d.entries.push({id:"entry-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),text,createdAt:new Date().toISOString(),updatedAt:null});d.entries=d.entries.slice(-100);save();render(c)};
 panel.append(form,el("h3","Saved entries · "+d.entries.length,"soa-journal-list-heading"));
 if(!d.entries.length)panel.append(el("p","Your journal is empty. Add a note above to keep track of clues, plans, or memorable moments.","muted"));
 for(const entry of d.entries.slice().reverse()){
  const card=el("article",undefined,"soa-personal-entry");
  const content=el("p",entry.text,"soa-journal-record");card.append(content);
  const actions=el("div",undefined,"soa-entry-actions");
  const edit=el("button","Edit");edit.type="button";edit.setAttribute("aria-label","Edit journal entry");
  const remove=el("button","Remove");remove.type="button";remove.setAttribute("aria-label","Remove journal entry");
  edit.onclick=()=>{
   const editor=el("form",undefined,"soa-journal-edit");const field=el("textarea");field.value=entry.text;field.maxLength=2000;field.rows=4;field.setAttribute("aria-label","Edit journal entry");
   const saveButton=el("button","Save changes");saveButton.type="submit";const cancel=el("button","Cancel");cancel.type="button";cancel.onclick=()=>render(c);
   editor.append(field,saveButton,cancel);editor.onsubmit=e=>{e.preventDefault();const text=clean(field.value,2000);if(!text){field.focus();return}entry.text=text;entry.updatedAt=new Date().toISOString();save();render(c)};
   card.replaceChildren(editor);field.focus();
  };
  remove.onclick=()=>{if(!window.confirm("Remove this journal entry?"))return;d.entries=d.entries.filter(item=>item.id!==entry.id);save();render(c)};
  actions.append(edit,remove);card.append(actions);panel.append(card);
 }
 return panel;
}
function questPanel(d){
 const area=el("div",undefined,"soa-quest-list");
 const active=d.quests.filter(q=>q.status==="active");
 if(!active.length)area.append(el("p","No active objectives recorded. You can add a new lead.","muted"));
 for(const q of active){
  const part=el("section",undefined,"soa-quest-entry");
  part.append(el("h4",q.title));
  for(const o of q.objectives){
   const row=el("div",undefined,"soa-quest-objective");
   row.append(el("span",(o.done?"✓ ":"○ ")+o.label));
   if(!o.done){const btn=el("button","Mark complete");btn.type="button";btn.onclick=()=>completeObjective(current,q.id,o.id);row.append(btn)}
   part.append(row);
  }area.append(part);
 }
 const completed=d.quests.filter(q=>q.status==="completed");
 const past=el("details");past.append(el("summary","Completed quests ("+completed.length+")"));
 if(!completed.length)past.append(el("p","None recorded yet.","muted"));
 for(const q of completed.slice(-15).reverse())past.append(el("p","✓ "+q.title,"soa-journal-record"));
 area.append(past);
 return area;
}
function render(c=current){
 const d=attach(c),root=get("soa-chronicle");if(!d||!root)return;
 root.replaceChildren();
 root.append(el("div","QUEST JOURNAL · "+(window.soaCharacters?.profile?.()?.name||"Adventurer"),"soa-chronicle-kicker"));
 root.append(el("h2","The Campaign Chronicle"));
 root.append(el("p","Act "+roman(d.act)+" — "+d.actTitle+" · Chapter "+roman(d.chapter)+": "+d.chapterTitle,"soa-current-chapter"));
 const tabs=el("div",undefined,"soa-journal-tabs");const quest=el("button","Quests"),archive=el("button","Journal"),notes=el("button","Discoveries");
 const body=el("div",undefined,"soa-journal-body");
 let selected=root.dataset.view||"quests";
 function view(name){selected=name;root.dataset.view=name;body.replaceChildren();if(name==="quests")body.append(questPanel(d));else if(name==="archive")body.append(journalPanel(c,d));else{const journals=Array.isArray(c?.journal)?c.journal:[];for(const note of journals.slice(-30).reverse())body.append(el("p",note,"soa-journal-record"));if(!journals.length)body.append(el("p","No discoveries recorded yet.","muted"))}
  for(const [b,n] of [[quest,"quests"],[archive,"archive"],[notes,"notes"]])b.setAttribute("aria-pressed",String(name===n))}
 for(const [b,n] of [[quest,"quests"],[archive,"archive"],[notes,"notes"]]){b.type="button";b.onclick=()=>view(n);tabs.append(b)}
 root.append(tabs,body);view(selected);
 if(d.pendingMilestone){
  const offer=el("div",undefined,"soa-chapter-proposal");
  offer.append(el("strong","Suggested "+(d.pendingMilestone.kind==="act"?"new act":"chapter")+": "+d.pendingMilestone.title));
  offer.append(el("p",d.pendingMilestone.reason));
  const actions=el("div",undefined,"soa-milestone-actions");
  const accept=el("button","Begin chapter");accept.type="button";accept.onclick=()=>confirm(c);
  const decline=el("button","Not yet");decline.type="button";decline.onclick=()=>dismiss(c);
  actions.append(accept,decline);offer.append(actions);root.append(offer);
 }
}
function banner(c){
 const d=attach(c);if(!d?.banner)return null;
 // The transition is shown until the next player acknowledgement; dismissing is visual only.
 const wrap=el("section",undefined,"soa-chapter-banner");
 wrap.append(el("span","A NEW CHAPTER BEGINS","soa-chapter-eyebrow"));
 wrap.append(el("h3","ACT "+roman(d.banner.act)+" · CHAPTER "+roman(d.banner.chapter)));
 wrap.append(el("h4",d.banner.title));
 wrap.append(el("p",d.banner.reason));
 const button=el("button","Continue the adventure");button.type="button";button.onclick=()=>{d.banner=null;save();render();wrap.remove()};
 wrap.append(button);return wrap;
}
function progress(c){
 const d=attach(c);return d?{act:d.act,actRoman:roman(d.act),actTitle:d.actTitle,chapter:d.chapter,chapterRoman:roman(d.chapter),chapterTitle:d.chapterTitle,scene:Number(c.turn)||0}:null;
}
window.soaChronicle={attach,context,receive,render,banner,progress};
document.addEventListener("DOMContentLoaded",()=>{
 if(get("soa-chronicle"))return;
 const section=el("section",undefined,"panel soa-chronicle-panel");section.id="soa-chronicle";
 const adventure=get("campaign-box"),header=document.querySelector("header");
 if(adventure)adventure.after(section);else header?.after(section);
 const saved=window.soaLivingCampaign?.getState?.();if(saved){attach(saved);render(saved)}
});
window.addEventListener("soa-chronicle-display",()=>render());
window.soaChronicleSetSave=fn=>{if(typeof fn==="function")save=fn};
})();
