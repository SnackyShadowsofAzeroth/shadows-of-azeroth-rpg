(()=>{"use strict";
/* Chapters follow recorded milestones. Acts remain player-confirmed.
   Narrative pacing never completes quests, moves the player or grants rewards. */
const clean=(value,n=120)=>String(value??"").trim().slice(0,n);
const MAX_COMPLETED_QUESTS=20;
const roman=n=>{const vals=[["X",10],["IX",9],["V",5],["IV",4],["I",1]];let out="";for(const [symbol,v] of vals){while(n>=v){out+=symbol;n-=v}}return out||"I"};
const el=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e};
const get=id=>document.getElementById(id);
let save=()=>{},current=null;
const integrityBlocked=()=>window.soaSaveRules?.isIntegrityBlocked?.()===true;
const normalized=value=>clean(value,240).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function completedMilestones(c,d){
 const items=d.quests.filter(q=>q?.status==="completed"&&q.id!=="personal-quest").map(q=>({id:"journal:"+q.id,title:clean(q.title)}));
 for(const [id,q] of Object.entries(c.quests?.missions||{}))if(q?.state==="claimed")items.push({id:"mission:"+id,title:clean(window.soaQuests?.missions?.().find(m=>m.id===id)?.title||id.replaceAll("-"," "))});
 for(const [id,q] of Object.entries(c.druidQuests||{}))if(q?.state==="claimed"&&q.receipt)items.push({id:"druid:"+id,title:clean(window.soaDruid?.QUESTS?.[id]?.title||id.replaceAll("_"," ")+" form training")});
 for(const [id,q] of Object.entries(c.dungeons?.quests||{}))if(q?.claimed&&q.completedRun)items.push({id:"dungeon:"+id,title:clean(window.soaDungeons?.definition?.(id)?.quest||id+" dungeon clearance")});
 return items;
}
function pacing(c,d){
 if(!d.pacing||d.pacing.version!==1){
  // Existing turn totals are history, not evidence of invented past chapters.
  d.pacing={version:1,scene:1,title:clean(c.scene?.title,95),location:normalized(c.scene?.location),focus:clean(d.primaryQuest?.objective,120),lastTurn:Number(c.turn)||0,sceneStartedAtTurn:Number(c.turn)||0,chapterStartedAtTurn:Number(d.startedAtTurn)||0,reviewedAtTurn:Math.max(Number(d.startedAtTurn)||0,(Number(c.turn)||0)-12),seenCompletions:completedMilestones(c,d).map(x=>x.id),queuedCompletions:[],usedEvidence:[],inCombat:(c.enemies||[]).some(e=>e.hp>0)};
 }
 const p=d.pacing;
 p.scene=Math.max(1,Math.floor(Number(p.scene)||1));
 for(const key of ["seenCompletions","queuedCompletions","usedEvidence"])if(!Array.isArray(p[key]))p[key]=[];
 return p;
}
function makeQuest(id,title,objectives,complete=false){
 return {id,title,status:complete?"completed":"active",objectives:objectives.map((label,i)=>({id:id+"-"+i,label,done:complete}))};
}
function initial(){
 const person=window.soaCharacters?.profile?.();
 if(person?.id==="snacky"||!person){
  return {schema:1,act:1,actTitle:"Azeroth Adventures",chapter:1,chapterTitle:"A New Journey",startedAtTurn:0,archives:[],quests:[makeQuest("personal-quest","The First Adventure",["Follow the opening lead"],false)],pendingMilestone:null,lastPresented:"",banner:null};
 }
 return {schema:1,act:1,actTitle:"An Adventurer's Beginning",chapter:1,chapterTitle:"A New Path",startedAtTurn:0,archives:[],quests:[makeQuest("personal-quest","The First Adventure",["Follow the opening lead"],false)],pendingMilestone:null,lastPresented:"",banner:null};
}
function isUntouchedLegacySeed(c,d){
 const location=String(c?.scene?.location||"");
 const seedPrimary=d?.primaryQuest;
 const primaryMatches=!seedPrimary||(seedPrimary.title==="The Stormwind Threat"&&seedPrimary.objective==="Return to Stormwind"&&Number(seedPrimary.updatedAtTurn||0)===0);
 const archive=d?.archives?.[0];
 const quest=id=>d?.quests?.find(item=>item?.id===id);
 const completed=quest("hollow-raven"),stormwind=quest("stormwind"),debrief=quest("si7-debrief");
 const exactQuest=(item,title,status,labels,done)=>item?.title===title&&item.status===status&&Array.isArray(item.objectives)&&item.objectives.length===labels.length&&item.objectives.every((objective,index)=>objective.label===labels[index]&&objective.done===done);
 return Boolean(location&&!/\bstormwind\b/i.test(location)&&d?.act===2&&d.actTitle==="Shadows Over Stormwind"&&d.chapter===1&&d.chapterTitle==="The Threat in the Capital"&&primaryMatches&&d.quests?.length===3&&d.archives?.length===1&&archive?.id==="hollow-raven-complete"&&archive.completed===true&&exactQuest(completed,"Investigate Hollow Raven","completed",["Solve the Hollow Raven operation"],true)&&exactQuest(stormwind,"The Stormwind Threat","active",["Return to Stormwind","Investigate the explosives threat","Defuse the threat"],false)&&exactQuest(debrief,"Report to SI:7","active",["Brief SI:7 on Hollow Raven and the Stormwind situation"],false));
}
function migrateUntouchedLegacySeed(c,d){
 if(!isUntouchedLegacySeed(c,d))return false;
 d.quests=d.quests.filter(quest=>quest.id!=="stormwind"&&quest.id!=="si7-debrief");
 d.quests.push(makeQuest("personal-quest","The First Adventure",["Follow the current story lead"],false));
 d.primaryQuest=null;
 d.actTitle="A Continuing Adventure";
 d.chapterTitle="Current Story";
 return true;
}
function attach(c){
 if(!c||typeof c!=="object")return null;
 if(!c.chronicle||typeof c.chronicle!=="object")c.chronicle=initial();
 const d=c.chronicle;
 const migrated=migrateUntouchedLegacySeed(c,d);
 d.act=Math.max(1,Math.min(99,Math.floor(Number(d.act)||1)));
 d.chapter=Math.max(1,Math.min(99,Math.floor(Number(d.chapter)||1)));
 d.actTitle=clean(d.actTitle)||"An Unnamed Act";
 d.chapterTitle=clean(d.chapterTitle)||"An Unnamed Chapter";
 if(!Array.isArray(d.archives))d.archives=[];
 if(!Array.isArray(d.quests))d.quests=[];
 if(!Array.isArray(d.entries))d.entries=[];
 if(d.primaryQuest&&typeof d.primaryQuest==="object"){
  const title=clean(d.primaryQuest.title,120),objective=clean(d.primaryQuest.objective,240);
  d.primaryQuest=title&&objective?{title,objective,updatedAtTurn:Math.max(0,Math.floor(Number(d.primaryQuest.updatedAtTurn)||0))}:null;
 }else{
  const quest=d.quests.find(q=>q&&q.status==="active"&&Array.isArray(q.objectives)&&!(q.id==="personal-quest"&&q.title==="The First Adventure"));
  const objective=quest?.objectives.find(o=>o&&o.done!==true);
  d.primaryQuest=quest&&objective?{title:clean(quest.title,120),objective:clean(objective.label,240),updatedAtTurn:0}:null;
 }
 trimCompletedQuests(d);
 pacing(c,d);
 current=c;
 if(migrated)save();
 return d;
}
function completedTime(q){
 const value=q?.completedAt;
 if(typeof value==="number"&&Number.isFinite(value))return value;
 const parsed=Date.parse(value||"");return Number.isFinite(parsed)?parsed:0;
}
function trimCompletedQuests(d){
 const completed=d.quests.map((quest,index)=>({quest,index})).filter(item=>item.quest?.status==="completed");
 for(const {quest,index} of completed)if(quest.completedAt==null)quest.completedAt=index+1;
 if(completed.length<=MAX_COMPLETED_QUESTS)return;
 completed.sort((a,b)=>completedTime(a.quest)-completedTime(b.quest)||a.index-b.index);
 const retained=new Set(completed.slice(-MAX_COMPLETED_QUESTS).map(item=>item.quest));
 d.quests=d.quests.filter(quest=>quest?.status!=="completed"||retained.has(quest));
}
function context(c){
 const d=attach(c);if(!d)return null;
 const p=pacing(c,d),turn=Number(c.turn)||0;
 return {act:d.act,actTitle:d.actTitle,chapter:d.chapter,chapterTitle:d.chapterTitle,pacing:{scene:p.scene,sceneTitle:p.title,focus:p.focus,chapterTurns:Math.max(0,turn-p.chapterStartedAtTurn),reviewDue:turn-p.reviewedAtTurn>=12,availableMilestones:completedMilestones(c,d).filter(x=>!p.seenCompletions.includes(x.id)).concat(p.queuedCompletions).slice(0,8)},primaryQuest:d.primaryQuest?{title:clean(d.primaryQuest.title,120),objective:clean(d.primaryQuest.objective,240)}:null,activeQuests:d.quests.filter(q=>q&&q.status==="active"&&Array.isArray(q.objectives)&&!(q.id==="personal-quest"&&q.title==="The First Adventure")).slice(0,8).map(q=>({title:clean(q.title),objectives:q.objectives.filter(o=>o&&o.done!==true).map(o=>clean(o.label))})),completedQuests:d.quests.filter(q=>q&&q.status==="completed").sort((a,b)=>completedTime(b)-completedTime(a)).slice(0,6).map(q=>clean(q.title)),recentArchives:d.archives.slice(-4).map(x=>({act:x.act,chapter:x.chapter,title:clean(x.chapterTitle),summary:clean(x.summary,180)}))};
}
function transition(c,d,m){
 const p=pacing(c,d),archive={id:"archive-"+d.act+"-"+d.chapter,act:d.act,actTitle:d.actTitle,chapter:d.chapter,chapterTitle:d.chapterTitle,summary:clean(m.reason,220),completed:true,startedAtTurn:d.startedAtTurn||0,endedAtTurn:Number(c.turn)||0,scenes:p.scene};
 if(!d.archives.some(x=>x.id===archive.id))d.archives.push(archive);
 d.archives=d.archives.slice(-75);
 if(m.kind==="act"){d.act=Math.min(99,d.act+1);d.chapter=1;d.actTitle=m.title;d.chapterTitle=clean(m.chapterTitle,90)||"Opening Moves";}
 else {d.chapter=Math.min(99,d.chapter+1);d.chapterTitle=m.title;}
 d.startedAtTurn=Number(c.turn)||0;p.chapterStartedAtTurn=d.startedAtTurn;p.reviewedAtTurn=d.startedAtTurn;p.scene=1;p.sceneStartedAtTurn=d.startedAtTurn;p.title=clean(c.scene?.title,95);p.queuedCompletions=[];
 d.banner={act:d.act,chapter:d.chapter,title:m.title,reason:m.reason,kind:m.kind};d.pendingMilestone=null;
}
function receive(c,scene){
 if(integrityBlocked())return;
 const d=attach(c);if(!d||!scene)return;
 const before=JSON.parse(JSON.stringify(d)),p=pacing(c,d),turn=Number(c.turn)||0,previousFocus=p.focus;
 if(turn<=p.lastTurn)return;
 const inCombat=(c.enemies||[]).some(e=>e.hp>0),location=normalized(scene.location),beat=scene.storyBeat||{};
 const newFocus=clean(beat.focus,120),sceneChange=(!p.inCombat||!inCombat)&&(location!==p.location&&!!p.location||!p.inCombat&&inCombat||beat.startScene===true&&!!clean(beat.reason)&&!!newFocus&&normalized(newFocus)!==normalized(p.focus));
 if(sceneChange){p.scene++;p.sceneStartedAtTurn=turn;p.title=clean(scene.title,95);}
 if(!p.title)p.title=clean(scene.title,95);
 if(!p.inCombat||!inCombat){p.location=location;if(newFocus&&(sceneChange||!p.focus))p.focus=newFocus;}
 p.inCombat=inCombat;p.lastTurn=turn;
 const completions=completedMilestones(c,d),fresh=completions.filter(x=>!p.seenCompletions.includes(x.id));
 p.queuedCompletions.push(...fresh);p.seenCompletions=[...new Set([...p.seenCompletions,...fresh.map(x=>x.id)])].slice(-200);
 const candidate=scene.chapterMilestone||{},title=clean(candidate.title,90),reason=clean(candidate.reason,220),valid=candidate.propose===true&&!!title&&!!reason;
 const discovery=clean(scene.journal,200),evidence=normalized(candidate.evidence),discoveryKey="discovery:"+normalized(discovery);
 const discoveryBoundary=valid&&candidate.basis==="discovery"&&!!discovery&&evidence===normalized(discovery)&&!(c.journal||[]).some(entry=>normalized(entry)===normalized(discovery))&&!!clean(candidate.nextObjective)&&beat.startScene===true&&!!clean(beat.reason)&&normalized(candidate.nextObjective)!==normalized(previousFocus)&&turn-p.chapterStartedAtTurn>=6&&!p.usedEvidence.includes(discoveryKey);
 if(!inCombat&&!d.pendingMilestone){
  if(valid&&candidate.kind==="act")d.pendingMilestone={id:"milestone-"+turn+"-"+normalized(title),title,reason,kind:"act",chapterTitle:clean(candidate.chapterTitle,90),sceneTitle:clean(scene.title,90)};
  else if(p.queuedCompletions.length||discoveryBoundary){
   const verified=p.queuedCompletions.length>0;
   const recap=verified?"Completed: "+p.queuedCompletions.map(x=>x.title).join("; ")+".":discovery;
   transition(c,d,{kind:"chapter",title:valid?title:"The Road Ahead",reason:recap});
   if(discoveryBoundary){p.usedEvidence.push(discoveryKey);p.usedEvidence=p.usedEvidence.slice(-40);p.focus=clean(candidate.nextObjective,120);}
  }
 }
 if(turn-p.reviewedAtTurn>12)p.reviewedAtTurn=turn;
 if(save()===false){c.chronicle=before;return;}
 render(c);
}
function confirm(c){
 if(integrityBlocked())return;
 const d=attach(c);if(!d?.pendingMilestone)return;
 if((c.enemies||[]).some(e=>e.hp>0)||c.pending)return;
 const before=JSON.parse(JSON.stringify(d));transition(c,d,d.pendingMilestone);
 if(save()===false){c.chronicle=before;render(c);return;}
 render(c);window.soaLivingCampaign?.refreshUI?.();
}
function dismiss(c){if(integrityBlocked()||c.pending)return;const d=attach(c);if(!d)return;const before=d.pendingMilestone;d.pendingMilestone=null;if(save()===false){d.pendingMilestone=before;return;}render(c);window.soaLivingCampaign?.refreshUI?.()}
function completeObjective(c,questId,objectiveId){
 if(integrityBlocked())return;
 const d=attach(c),q=d?.quests.find(x=>x.id===questId&&x.status==="active");
 if(!q)return;
 const o=q.objectives.find(x=>x.id===objectiveId&&!x.done);if(!o)return;
 if(!window.confirm("Mark this objective complete? Only confirm if it actually happened in your adventure."))return;
 const before=JSON.parse(JSON.stringify(d));o.done=true;if(q.objectives.every(x=>x.done)){q.status="completed";q.completedAt=Date.now()}
 trimCompletedQuests(d);
 if(save()===false)c.chronicle=before;render(c);
}
function journalPanel(c,d){
 const panel=el("div",undefined,"soa-personal-journal");
 const form=el("form",undefined,"soa-journal-compose");
 const label=el("label","Write a journal entry");
 const input=el("textarea");input.maxLength=2000;input.rows=4;input.placeholder="Record a thought, clue, or moment from your adventure…";input.setAttribute("aria-label","Journal entry");label.append(input);
 const add=el("button","Add to Journal");add.type="submit";form.append(label,add);
 form.onsubmit=e=>{e.preventDefault();if(integrityBlocked())return;const text=clean(input.value,2000);if(!text)return;d.entries.push({id:"entry-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),text,createdAt:new Date().toISOString(),updatedAt:null});d.entries=d.entries.slice(-100);save();render(c)};
 panel.append(form,el("h3","Saved entries · "+d.entries.length,"soa-journal-list-heading"));
 if(!d.entries.length)panel.append(el("p","Your journal is empty. Add a note above to keep track of clues, plans, or memorable moments.","muted"));
 for(const entry of d.entries.slice().reverse()){
  const card=el("article",undefined,"soa-personal-entry");
  const content=el("p",entry.text,"soa-journal-record");card.append(content);
  const actions=el("div",undefined,"soa-entry-actions");
  const edit=el("button","Edit");edit.type="button";edit.setAttribute("aria-label","Edit journal entry");
  const remove=el("button","Remove");remove.type="button";remove.setAttribute("aria-label","Remove journal entry");
  edit.onclick=()=>{
   if(integrityBlocked())return;
   const editor=el("form",undefined,"soa-journal-edit");const field=el("textarea");field.value=entry.text;field.maxLength=2000;field.rows=4;field.setAttribute("aria-label","Edit journal entry");
   const saveButton=el("button","Save changes");saveButton.type="submit";const cancel=el("button","Cancel");cancel.type="button";cancel.onclick=()=>render(c);
   editor.append(field,saveButton,cancel);editor.onsubmit=e=>{e.preventDefault();if(integrityBlocked())return;const text=clean(field.value,2000);if(!text){field.focus();return}entry.text=text;entry.updatedAt=new Date().toISOString();save();render(c)};
   card.replaceChildren(editor);field.focus();
  };
  remove.onclick=()=>{if(integrityBlocked()||!window.confirm("Remove this journal entry?"))return;d.entries=d.entries.filter(item=>item.id!==entry.id);save();render(c)};
  actions.append(edit,remove);card.append(actions);panel.append(card);
 }
 return panel;
}
function setPrimaryQuest(c,title,objective){
 if(integrityBlocked())return false;
 const d=attach(c),cleanTitle=clean(title,120),cleanObjective=clean(objective,240);
 if(!d||!cleanTitle||!cleanObjective)return false;
 d.primaryQuest={title:cleanTitle,objective:cleanObjective,updatedAtTurn:Math.max(0,Number(c.turn)||0)};
 if(!save())return false;
 return true;
}
function storyFocusPanel(c,d){
 const panel=el("section",undefined,"soa-story-focus");
 panel.append(el("h4","Pinned current quest"),el("p","This player-chosen quest and objective are carried into every new scene. They stay in focus until you change them; new leads won’t replace them on their own.","soa-story-focus-hint"));
 const form=document.createElement("form");form.className="soa-story-focus-form";
 const titleLabel=el("label","Quest title");titleLabel.htmlFor="soa-primary-quest-title";
 const title=document.createElement("input");title.id="soa-primary-quest-title";title.type="text";title.maxLength=120;title.required=true;title.placeholder="Explore the crypt";title.value=d.primaryQuest?.title||"";
 const objectiveLabel=el("label","Current objective");objectiveLabel.htmlFor="soa-primary-quest-objective";
 const objective=document.createElement("input");objective.id="soa-primary-quest-objective";objective.type="text";objective.maxLength=240;objective.required=true;objective.placeholder="Search the lower chambers and identify the source of the disturbance";objective.value=d.primaryQuest?.objective||"";
 const status=el("p",undefined,"soa-story-focus-status");status.setAttribute("aria-live","polite");
 const submit=el("button","Save quest focus");submit.type="submit";
 form.onsubmit=e=>{e.preventDefault();if(setPrimaryQuest(c,title.value,objective.value)){status.textContent="Quest focus saved and will guide future scenes."}else status.textContent="Enter both a quest and its current objective. If saving failed, check browser storage before continuing."};
 form.append(titleLabel,title,objectiveLabel,objective,submit,status);panel.append(form);return panel;
}
function questPanel(c,d){
 const area=el("div",undefined,"soa-quest-list");
 area.append(storyFocusPanel(c,d));
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
 const completed=d.quests.filter(q=>q.status==="completed").sort((a,b)=>completedTime(b)-completedTime(a));
 const past=el("details",undefined,"soa-collapsible-quests");past.append(el("summary","Completed quests ("+completed.length+" of "+MAX_COMPLETED_QUESTS+" most recent)"));
 if(!completed.length)past.append(el("p","None recorded yet.","muted"));
 for(const q of completed)past.append(el("p","✓ "+q.title,"soa-journal-record"));
 area.append(past);
 return area;
}
function render(c=current){
 const d=attach(c),root=get("soa-chronicle");if(!d||!root)return;
 root.replaceChildren();
 root.append(el("div","QUEST JOURNAL · "+(window.soaCharacters?.profile?.()?.name||"Adventurer"),"soa-chronicle-kicker"));
 root.append(el("h2","The Campaign Chronicle"));
 root.append(el("p","Act "+roman(d.act)+" — "+d.actTitle+" · Chapter "+roman(d.chapter)+": "+d.chapterTitle,"soa-current-chapter"));
 root.append(el("p","Scene "+d.pacing.scene+" in this chapter · Turn "+(Number(c.turn)||0)+" across your journey","soa-story-focus-hint"));
 const chapters=el("details",undefined,"soa-collapsible-quests");chapters.append(el("summary","Completed chapters · "+d.archives.length));
 for(const archive of d.archives.slice().reverse()){const entry=el("section",undefined,"soa-quest-entry");entry.append(el("h4","Act "+roman(archive.act)+" · Chapter "+roman(archive.chapter)+" — "+archive.chapterTitle),el("p",archive.summary||"Chapter archived."));chapters.append(entry)}
 root.append(chapters);
 const dungeonQuests=window.soaDungeons?.questPanel?.(c);if(dungeonQuests)root.append(dungeonQuests);
 const tabs=el("div",undefined,"soa-journal-tabs");const quest=el("button","Quests"),archive=el("button","Journal"),notes=el("button","Discoveries");
 const body=el("div",undefined,"soa-journal-body");
 let selected=root.dataset.view||"quests";
 function view(name){selected=name;root.dataset.view=name;body.replaceChildren();if(name==="quests")body.append(questPanel(c,d));else if(name==="archive")body.append(journalPanel(c,d));else{const journals=Array.isArray(c?.journal)?c.journal:[];for(const note of journals.slice(-30).reverse())body.append(el("p",note,"soa-journal-record"));if(!journals.length)body.append(el("p","No discoveries recorded yet.","muted"))}
  for(const [b,n] of [[quest,"quests"],[archive,"archive"],[notes,"notes"]])b.setAttribute("aria-pressed",String(name===n))}
 for(const [b,n] of [[quest,"quests"],[archive,"archive"],[notes,"notes"]]){b.type="button";b.onclick=()=>view(n);tabs.append(b)}
 root.append(tabs,body);view(selected);
 if(d.pendingMilestone)root.append(milestonePanel(c,d));
}
function milestonePanel(c,d){
 const offer=el("section",undefined,"soa-chapter-proposal"),act=d.pendingMilestone.kind==="act";
 offer.append(el("strong",(act?"A new act awaits: ":"Chapter milestone: ")+d.pendingMilestone.title),el("p",d.pendingMilestone.reason));
 const actions=el("div",undefined,"soa-milestone-actions"),accept=el("button",act?"Begin act":"Begin chapter"),decline=el("button","Not yet");
 accept.type=decline.type="button";accept.disabled=decline.disabled=!!c.pending||(c.enemies||[]).some(e=>e.hp>0);
 accept.onclick=()=>confirm(c);decline.onclick=()=>dismiss(c);actions.append(accept,decline);offer.append(actions);return offer;
}
function banner(c){
 const d=attach(c);if(!d)return null;if(!d.banner)return d.pendingMilestone?milestonePanel(c,d):null;
 // The transition is shown until the next player acknowledgement; dismissing is visual only.
 const wrap=el("section",undefined,"soa-chapter-banner");
 wrap.append(el("span",d.banner.kind==="act"?"A NEW ACT BEGINS":"A NEW CHAPTER BEGINS","soa-chapter-eyebrow"));
 wrap.append(el("h3","ACT "+roman(d.banner.act)+" · CHAPTER "+roman(d.banner.chapter)));
 wrap.append(el("h4",d.banner.title));
 wrap.append(el("p",d.banner.reason));
 const button=el("button","Continue the adventure");button.type="button";button.onclick=()=>{if(integrityBlocked())return;const before=d.banner;d.banner=null;if(save()===false){d.banner=before;return;}render(c);window.soaLivingCampaign?.refreshUI?.();wrap.remove()};
 wrap.append(button);if(d.pendingMilestone)wrap.append(milestonePanel(c,d));return wrap;
}
function progress(c){
 const d=attach(c);return d?{act:d.act,actRoman:roman(d.act),actTitle:d.actTitle,chapter:d.chapter,chapterRoman:roman(d.chapter),chapterTitle:d.chapterTitle,scene:d.pacing.scene,sceneTitle:d.pacing.title,turn:Number(c.turn)||0}:null;
}
window.soaChronicle={attach,context,receive,render,banner,progress,setPrimaryQuest};
document.addEventListener("DOMContentLoaded",()=>{
 if(get("soa-chronicle"))return;
 const section=el("section",undefined,"panel soa-chronicle-panel");section.id="soa-chronicle";
 const adventure=get("campaign-box"),header=document.querySelector("header");
 if(adventure)adventure.after(section);else header?.after(section);
 const saved=window.soaLivingCampaign?.getState?.();
 if(saved){attach(saved);render(saved)}
 else{section.append(el("div","QUEST JOURNAL · "+(window.soaCharacters?.profile?.()?.name||"Adventurer"),"soa-chronicle-kicker"),el("h2","The Campaign Chronicle"),el("p","Quest, journal, and discovery records will appear here when an adventure begins. Existing saved data remains untouched.","muted"))}
});
window.addEventListener("soa-chronicle-display",()=>render());
window.soaChronicleSetSave=fn=>{if(typeof fn==="function")save=fn};
})();

