(()=>{"use strict";
// Recipes, not generated prose, are authoritative for items and bonuses.
const TIERS=[
 {label:"Apprentice",level:10,skill:1,quantity:4,price:60,ac:1,stat:0},
 {label:"Journeyman",level:20,skill:75,quantity:6,price:150,ac:1,stat:1},
 {label:"Expert",level:35,skill:150,quantity:8,price:400,ac:2,stat:1},
 {label:"Artisan",level:50,skill:225,quantity:10,price:800,ac:3,stat:1}
];
const FAMILIES=[
 {id:"leather",profession:"Leatherworking",material:["Light Leather","Medium Leather","Heavy Leather","Rugged Leather"],names:["Reinforced Leather Tunic","Supple Guardian Tunic","Wildwarden Leather Armor","Ancient Grove Leather Armor"],slot:"armor",classes:[],stat:"CON"},
 {id:"cloth",profession:"Tailoring",material:["Linen Cloth","Wool Cloth","Silk Cloth","Runecloth"],names:["Reinforced Linen Robe","Moonwoven Wool Robe","Runewoven Silk Robe","Archmage Runecloth Robe"],slot:"armor",classes:[],stat:"WIS"},
 {id:"mail",profession:"Blacksmithing",material:["Copper Bar","Bronze Bar","Iron Bar","Thorium Bar"],names:["Copper Chain Armor","Bronze Guardian Mail","Iron Sentinel Mail","Thorium Warden Mail"],slot:"armor",classes:["Warrior","Paladin","Hunter","Shaman"],stat:"CON"},
 {id:"blade",profession:"Blacksmithing",material:["Copper Bar","Bronze Bar","Iron Bar","Thorium Bar"],names:["Balanced Copper Blade","Tempered Bronze Blade","Honed Iron Blade","Masterwork Thorium Blade"],slot:"weapon",classes:["Warrior","Paladin","Hunter","Rogue"],stat:"STR"},
 {id:"device",profession:"Engineering",material:["Copper Parts","Bronze Parts","Iron Parts","Thorium Parts"],names:["Calibrated Targeting Lens","Precision Targeting Lens","Expert Targeting Lens","Artisan Targeting Lens"],slot:"trinket",classes:[],stat:"DEX"}
];
const RECIPES=FAMILIES.flatMap(f=>TIERS.map((t,i)=>{
 const bonuses=f.slot==="armor"?{ac:t.ac,...(t.stat?{[f.stat]:t.stat}:{})}:f.slot==="weapon"?{attack:i<1?0:i<3?1:2,damage:i<2?1:2}:{DEX:i<2?1:2,...(i>=2?{attack:1}:{})};
 const description=Object.entries(bonuses).filter(([,n])=>n).map(([k,n])=>"+"+n+" "+({ac:"AC",attack:"attack",damage:"weapon damage"}[k]||k)).join(" · ");
 return {id:f.id+"-"+i,name:f.names[i],profession:f.profession,material:f.material[i],quantity:t.quantity,price:t.price,level:t.level,skill:t.skill,tier:t.label,slot:f.slot,classes:f.classes,bonuses,description,rarity:i<2?"uncommon":"rare"};
}));
const recipe=id=>RECIPES.find(r=>r.id===id);
const itemInfo=item=>RECIPES.find(r=>r.name===item?.name)||null;
const profile=()=>window.soaCharacters?.profile?.()||{};
const level=()=>window.soaProgression?.level?.()||profile().level||1;
const blocked=c=>window.soaSaveRules?.isIntegrityBlocked?.()?"Restore the damaged save first.":c.pending?"Finish the pending action first.":(c.enemies||[]).some(e=>e.hp>0)?"Leave combat before crafting.":profile().className==="Druid"&&profile().form&&profile().form!=="caster"?"Return to Humanoid Form to craft.":null;
const getState=c=>c.crafting||=( {version:1,materials:{},receipts:{},recovered:{},log:[]} );
function requirement(c,r,{materials=true}={}){
 if(!r)return "Unknown recipe.";
 const lock=blocked(c);if(lock)return lock;
 if(!Object.hasOwn(profile().professions||{},r.profession))return "Train "+r.profession+" first.";
 if(level()<r.level)return "Requires character level "+r.level+".";
 if((Number(profile().professions[r.profession])||1)<r.skill)return "Requires "+r.profession+" skill "+r.skill+".";
 if((c.quests?.inventory||[]).length>=200)return "Equipment inventory is full (200 items).";
 if(materials&&(getState(c).materials[r.material]||0)<r.quantity)return "Need "+r.quantity+" "+r.material+".";
 return null;
}
function addItem(c,r,receipt,recovered=false){
 c.quests||={};c.quests.inventory||=[];
 c.quests.inventory.push({name:r.name,rarity:r.rarity,source:(recovered?"Recovered craft: ":"Crafted: ")+r.profession});
 const st=getState(c);st.receipts[receipt]=r.id;st.log.push({item:r.name,receipt,turn:c.turn||0,recovered});st.log=st.log.slice(-60);
 return {message:r.name+" added to inventory · "+r.description+". Equip it in Character → Loadout & Equipment; it is not automatically equipped.",item:r.name};
}
function craft(c,id,receipt){
 const r=recipe(id);if(typeof receipt!=="string"||!receipt||receipt.length>160)return {error:"Missing craft receipt."};
 if(getState(c).receipts[receipt])return {error:"This craft was already recorded."};
 const error=requirement(c,r);if(error)return {error};
 getState(c).materials[r.material]-=r.quantity;
 return addItem(c,r,receipt);
}
const SUPPLIER=/\b(?:shadowglen|dolanaar|darnassus|stormwind|goldshire|ironforge|kharanos|exodar|azure watch|orgrimmar|razor hill|sen'jin|thunder bluff|bloodhoof|brill|undercity|silvermoon|falconwing|crossroads|darkshire|nighthaven|crafting supplier|trade supplies|general store)\b/i;
function buy(c,id,wallet){
 const r=recipe(id),lock=blocked(c);if(lock)return {error:lock};
 if(!r||!Object.hasOwn(profile().professions||{},r.profession))return {error:"Choose supplies for a trained profession."};
 if(!SUPPLIER.test(c.scene?.location||""))return {error:"Visit a settlement crafting supplier."};
 if(!Number.isSafeInteger(wallet)||wallet<r.price)return {error:"Not enough copper for supplies."};
 const st=getState(c),amount=st.materials[r.material]||0;if(amount>9995)return {error:"Material storage is full."};
 st.materials[r.material]=amount+4;
 return {wallet:wallet-r.price,message:"Bought 4 "+r.material+" for "+r.price+" copper."};
}
// One-time, player-confirmed migration of specific finished items still documented locally.
function recoverable(c){
 const st=getState(c),texts=[c.scene?.story,...(c.history||[]).filter(x=>x.startsWith("Scene:"))].filter(x=>typeof x==="string");
 return RECIPES.filter(r=>!st.recovered[r.id]&&!c.quests?.inventory?.some(i=>i.name===r.name)&&Object.hasOwn(profile().professions||{},r.profession)&&texts.some(text=>{
  const at=text.toLowerCase().indexOf(r.name.toLowerCase());if(at<0)return false;
  const nearby=text.slice(Math.max(0,at-90),at+r.name.length+90);
  return /\b(?:newly (?:finished|crafted)|finished crafting|successfully (?:crafted|stitched|forged)|completed (?:the |your )?(?:craft|tunic|armor)|you (?:have )?(?:crafted|forged|stitched))\b/i.test(nearby)&&!/\b(?:not|haven't|haven’t|failed|unfinished|could|would|will|intend|plan)\b/i.test(nearby);
 }));
}
function recover(c,id){
 const lock=blocked(c);if(lock)return {error:lock};
 const r=recoverable(c).find(r=>r.id===id);if(!r)return {error:"No unclaimed finished craft is documented in recent scenes."};
 if((c.quests?.inventory||[]).length>=200)return {error:"Equipment inventory is full."};
 getState(c).recovered[id]=true;return addItem(c,r,"recovered:"+id,true);
}
function panel(c,{wallet,commit,choose,locked=false}){
 const owned=RECIPES.filter(r=>Object.hasOwn(profile().professions||{},r.profession));if(!owned.length)return null;
 const root=document.createElement("details"),head=document.createElement("summary");head.textContent="Crafting · Recipes & Materials";root.append(head);
 root.open=sessionStorage.getItem("soa-crafting-open")==="1";root.ontoggle=()=>sessionStorage.setItem("soa-crafting-open",root.open?"1":"0");
 const add=(tag,text,parent=root)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;};
 add("p","Crafting takes one action, consumes the listed materials and guarantees the selected recipe. Items wait in inventory until you Equip them. Bonuses replace other gear in the same slot; tiers never stack. Recipe tiers require both character level and profession skill.");
 const st=getState(c);add("p","Materials: "+(Object.entries(st.materials).filter(([,n])=>n>0).map(([k,n])=>k+" ×"+n).join(" · ")||"None"));
 for(const r of recoverable(c)){const b=add("button","Recover previously crafted "+r.name);b.type="button";b.disabled=locked||!!blocked(c);b.onclick=()=>{if(window.confirm("Recover the finished "+r.name+" documented in your recent story? No materials will be charged. This is available once."))commit(()=>recover(c,r.id));};}
 const supplied=new Set();
 for(const r of owned){
  const row=add("div","");row.style.cssText="padding:12px 0;border-top:1px solid var(--soa-border,#71815b)";
  add("strong",r.name+" · "+r.tier,row);add("p",r.description+" · "+r.slot+" · "+(r.classes.length?r.classes.join("/"):"All classes"),row);
  add("p",r.profession+" "+r.skill+" · Level "+r.level+" · "+r.quantity+" "+r.material,row);
  const reason=requirement(c,r),b=add("button",reason||"Craft "+r.name,row);b.type="button";b.disabled=locked||!!reason;b.onclick=()=>choose({text:"Craft "+r.name+" using "+r.profession,type:"investigate",difficulty:"easy",craftRecipe:r.id});
  if(!supplied.has(r.material)){supplied.add(r.material);const b=add("button","Buy 4 "+r.material+" · "+r.price+" copper",row);b.type="button";b.disabled=locked||!!blocked(c)||!SUPPLIER.test(c.scene?.location||"")||wallet()<r.price;b.onclick=()=>commit(()=>buy(c,r.id,wallet()));}
 }
 if(!SUPPLIER.test(c.scene?.location||""))add("p","Buy crafting supplies in a settlement or at a crafting supplier. Untracked materials mentioned only in narration are not spent or granted automatically.");
 const log=add("details","");add("summary","Crafting ledger · "+st.log.length,log);for(const x of st.log.slice(-15).reverse())add("p",(x.recovered?"Recovered: ":"Crafted: ")+x.item,log);
 return root;
}
window.soaCrafting={TIERS,RECIPES,itemInfo,getState,requirement,craft,buy,recoverable,recover,panel};
})();
