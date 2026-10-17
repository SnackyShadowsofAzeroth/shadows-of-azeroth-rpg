(()=>{"use strict";
const ENCHANTS=[
 {id:"minor-agility",name:"Fine Agility",slots:["back","hands","feet"],effect:{DEX:1},skill:1,copper:4500,dust:1},
 {id:"warding",name:"Enchanter's Warding",slots:["chest","back"],effect:{ac:1},skill:25,copper:8500,dust:2},
 {id:"striking",name:"Weapon Striking",slots:["mainhand","offhand","weapon"],effect:{damage:1},skill:30,copper:9000,dust:2},
 {id:"precision",name:"Weapon Precision",slots:["mainhand","offhand","weapon","ranged"],effect:{attack:1},skill:75,copper:18000,dust:3},
 {id:"fortitude",name:"Fortitude",slots:["wrists","feet","chest"],effect:{CON:1},skill:50,copper:11500,dust:2},
 {id:"greater-agility",name:"Greater Agility",slots:["back","hands","feet"],effect:{DEX:2},skill:125,copper:30000,dust:5}
];
const VENDOR=/stormwind|ironforge|darnassus|undercity|orgrimmar|thunder bluff|enchant(?:er|ing)|trade district|mage quarter/i;
const safeInt=n=>Number.isSafeInteger(n)&&n>=0;
const getState=c=>{c.enchanting||={enchants:{},materials:{ArcaneDust:0},skill:1,history:[],receipts:[]};return c.enchanting};
const format=c=>{c=Math.floor(c);return Math.floor(c/10000)+"g "+String(Math.floor(c%10000/100)).padStart(2,"0")+"s "+String(c%100).padStart(2,"0")+"c"};
const professions=()=>window.soaCharacters?.profile?.()?.professions||{};
const owned=()=>Object.prototype.hasOwnProperty.call(professions(),"Enchanting");
function eligibleSlots(c){
 const itemSlots=[];
 if(window.soaCharacters?.profile?.()?.id==="snacky")for(const [slot,name] of window.soaEquipment?.SNACKY_LOADOUT||[])itemSlots.push({key:"baseline:"+slot,slot,name});
 const q=c.quests;
 for(const [slot,index] of Object.entries(q?.equipped||{})){
  const item=q.inventory?.[index];
  if(!item)continue;
  itemSlots.push({key:"reward:"+slot,slot,name:item.name});
 }
 return itemSlots;
}
function displaySlot(label){return {head:"Head",back:"Back",shoulders:"Shoulders",chest:"Chest",wrists:"Wrists",hands:"Hands",waist:"Waist",legs:"Legs",feet:"Feet",finger1:"Ring 1",finger2:"Ring 2",mainhand:"Main hand",offhand:"Off hand",sidearm:"Sidearm",ranged:"Ranged"}[label]||label}
function bonuses(c){
 const state=getState(c),b={DEX:0,CON:0,ac:0,damage:0,attack:0};
 const permitted=new Map(eligibleSlots(c).map(x=>[x.key,x]));
 for(const [key,entry] of Object.entries(state.enchants)){
  const target=permitted.get(key),recipe=ENCHANTS.find(x=>x.id===entry.id);
  if(!target||!recipe||entry.item!==target.name||!recipe.slots.includes(target.slot))continue;
  for(const [k,v] of Object.entries(recipe.effect))b[k]=(b[k]||0)+v;
 }
 return b;
}
function apply(c,{key,recipeId,method,location,wallet}){
 const st=getState(c),target=eligibleSlots(c).find(x=>x.key===key),recipe=ENCHANTS.find(x=>x.id===recipeId);
 if(!target||!recipe||!recipe.slots.includes(target.slot))return {error:"Invalid item or enchant slot."};
 if(!["vendor","self"].includes(method))return {error:"Select an enchanting method."};
 if(method==="vendor"&&!VENDOR.test(String(location)))return {error:"Visit an enchanter in a major city."};
 if(method==="self"&&!owned())return {error:"Enchanting must be one of your trained primary professions."};
 if(method==="self"&&(st.skill||1)<recipe.skill)return {error:"Enchanting skill too low for this recipe."};
 const cost=method==="vendor"?recipe.copper:Math.ceil(recipe.copper*.2);
 const dust=method==="self"?recipe.dust:0;
 if(!safeInt(wallet)||wallet<cost)return {error:"Insufficient money."};
 if((st.materials?.ArcaneDust||0)<dust)return {error:"Not enough Arcane Dust. Obtain dust through disenchanting eligible spare reward items."};
 // One enchant per equipped item. Replacing existing enchant is intentional.
 if(st.enchants[key]?.id===recipe.id&&st.enchants[key]?.item===target.name)return {error:"Item already has this enchant."};
 const receipt="enchant:"+String(c.turn||0)+":"+String(c.actionSerial||0)+":"+key+":"+recipe.id+":"+st.history.length;
 const entry={id:recipe.id,item:target.name,method,atTurn:c.turn||0};
 st.materials.ArcaneDust=(st.materials.ArcaneDust||0)-dust;
 st.enchants[key]=entry;
 if(method==="self")st.skill=Math.min(300,(st.skill||1)+(st.skill<recipe.skill+30?2:1));
 st.history.push({receipt,slot:target.slot,item:target.name,recipe:recipe.name,cost,dust,method});
 st.history=st.history.slice(-100);
 return {wallet:wallet-cost,message:(method==="vendor"?"The enchanter":"You")+" applied "+recipe.name+" to "+target.name+" for "+format(cost)+(dust?" and "+dust+" Arcane Dust":"")+".",receipt};
}
function disenchant(c,index){
 const st=getState(c),q=c.quests,item=q?.inventory?.[index];
 if(!owned())return {error:"Train Enchanting first."};
 if(!item)return {error:"No reward item at that index."};
 if(Object.values(q.equipped||{}).includes(index))return {error:"Unequip this item before disenchanting."};
 const info=window.soaEquipment?.itemInfo?.(item);
 if(!info||info.slot==="utility")return {error:"This item has no enchantable magical components."};
 const amount=info.rarity==="rare"?3:info.rarity==="uncommon"?2:1;
 q.inventory.splice(index,1);
 for(const [slot,idx] of Object.entries(q.equipped||{})){if(idx>index)q.equipped[slot]=idx-1}
 st.materials.ArcaneDust=(st.materials.ArcaneDust||0)+amount;
 st.history.push({item:item.name,disenchanted:true,dust:amount});st.history=st.history.slice(-100);
 return {message:"Disenchanted "+item.name+" into "+amount+" Arcane Dust.",dust:amount};
}
function panel(c,location,wallet,commit){
 const el=document.createElement("details"),head=document.createElement("summary");head.textContent="Enchanting · Enchanter Services & Crafting";el.append(head);
 const st=getState(c),p=document.createElement("p");
 p.textContent="NPC services in major cities. Self-enchanting requires the Enchanting primary profession, trained skill and Arcane Dust. One enchant per item; new enchants replace the old effect.";el.append(p);
 const status=document.createElement("p");status.textContent="Enchanting profession: "+(owned()?"Trained · Skill "+st.skill:"Not trained")+" · Arcane Dust: "+(st.materials?.ArcaneDust||0);el.append(status);
 if(!owned()){const note=document.createElement("p");note.textContent="To pursue Enchanting yourself, choose it as a primary profession through character creation or the profession system. Snacky's current Mining and Engineering are retained; no profession is replaced automatically.";el.append(note)}
 const targets=eligibleSlots(c);
 if(!targets.length){const note=document.createElement("p");note.textContent="No equipped items available.";el.append(note);return el}
 for(const target of targets){
  const row=document.createElement("div");row.style.cssText="border-top:1px solid #b69b71;padding:9px 0";
  const label=document.createElement("strong");label.textContent=displaySlot(target.slot)+" · "+target.name;row.append(label);
  const existing=st.enchants[target.key],summary=document.createElement("p");
  summary.textContent="Current enchant: "+(existing?(ENCHANTS.find(x=>x.id===existing.id)?.name||existing.id):"None");row.append(summary);
  const available=ENCHANTS.filter(e=>e.slots.includes(target.slot));
  for(const recipe of available){
   const button=document.createElement("button");button.type="button";button.style.cssText="margin:4px;max-width:100%;white-space:normal";
   button.textContent=recipe.name+" · "+format(recipe.copper)+" NPC"+(owned()?" / "+format(Math.ceil(recipe.copper*.2))+" self":"");
   button.onclick=()=>{
    const method=owned()&&window.confirm("Enchant with your own materials and skill? Choose Cancel to hire the NPC.")?"self":"vendor";
    const result=apply(c,{key:target.key,recipeId:recipe.id,method,location,wallet:wallet()});
    if(result.error){window.alert(result.error);return}
    commit(result);window.soaLivingCampaign?.refreshUI?.();
   };
   row.append(button);
  }
  el.append(row);
 }
 if(owned()&&(c.quests?.inventory||[]).length){
  const de=document.createElement("details"),label=document.createElement("summary");label.textContent="Disenchant spare quest rewards";de.append(label);
  (c.quests.inventory||[]).forEach((item,i)=>{
   const b=document.createElement("button");b.type="button";b.textContent="Disenchant "+item.name;
   b.onclick=()=>{if(!window.confirm("Destroy "+item.name+" permanently for enchanting materials? This cannot be undone."))return;const result=disenchant(c,i);if(result.error){window.alert(result.error);return}commit(result);window.soaLivingCampaign?.refreshUI?.()};de.append(b)
  });el.append(de)
 }
 const history=document.createElement("details"),hh=document.createElement("summary");hh.textContent="Enchanting ledger · "+st.history.length;history.append(hh);
 for(const x of st.history.slice(-15).reverse()){const line=document.createElement("p");line.textContent=x.disenchanted?"Disenchanted "+x.item+" · +"+x.dust+" dust":x.item+" · "+x.recipe+" · "+format(x.cost);history.append(line)}el.append(history);
 return el;
}
window.soaEnchanting={ENCHANTS,VENDOR,getState,apply,disenchant,bonuses,panel,eligibleSlots};
})();