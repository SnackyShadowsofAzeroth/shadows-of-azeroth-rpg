(()=>{"use strict";
// Portraits are local, per-character and separate from gameplay save slots.
// Reduced JPEG data URLs keep mobile browser storage use predictable.
const KEY="soa-portrait-v1-", MAX_FILE=12*1024*1024, SIZE=320, QUALITY=.78, LIMIT=210000;
const qs=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
function read(id){try{const value=localStorage.getItem(KEY+id);return value&&/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(value)&&value.length<LIMIT?value:null}catch{return null}}
function renderPicture(id,name,cls){
 const holder=node("div",undefined,cls||"soa-portrait-frame"),src=read(id);
 if(src){const img=node("img");img.src=src;img.alt=name+" character portrait";img.loading="lazy";img.decoding="async";holder.append(img)}
 else{holder.classList.add("soa-portrait-empty");const initial=node("span",String(name||"?").trim().slice(0,1).toUpperCase());initial.setAttribute("aria-hidden","true");holder.append(initial)}
 return holder;
}
async function optimize(file){
 if(!file||!/^image\/(?:jpeg|png|webp)$/i.test(file.type))throw Error("Choose a JPG, PNG or WebP image.");
 if(file.size>MAX_FILE)throw Error("Please choose an image smaller than 12 MB.");
 const src=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error("Unable to read this image."));image.src=src});
  if(!image.naturalWidth||!image.naturalHeight)throw Error("Invalid image dimensions.");
  const canvas=document.createElement("canvas");canvas.width=canvas.height=SIZE;
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Image processing is unavailable in this browser.");
  ctx.fillStyle="#cbb58a";ctx.fillRect(0,0,SIZE,SIZE);
  const scale=Math.max(SIZE/image.naturalWidth,SIZE/image.naturalHeight);
  const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
  ctx.drawImage(image,(SIZE-width)/2,(SIZE-height)/2,width,height);
  const result=canvas.toDataURL("image/jpeg",QUALITY);
  if(result.length>=LIMIT)throw Error("The processed portrait exceeds the local storage limit.");
  return result;
 }finally{URL.revokeObjectURL(src)}
}
function selectImage(id,name,status){
 const input=node("input");input.type="file";input.accept="image/jpeg,image/png,image/webp";input.className="soa-portrait-file";
 input.setAttribute("aria-label","Upload portrait for "+name);
 input.onchange=async()=>{
  const file=input.files?.[0];if(!file)return;
  status.textContent="Preparing portrait…";
  try{
   const data=await optimize(file);
   localStorage.setItem(KEY+id,data);
   status.textContent="Portrait saved for "+name+".";
   refresh();window.soaPortraits?.refreshMenu?.();
  }catch(e){status.textContent=e?.name==="QuotaExceededError"?"Device storage is full; your existing portrait was preserved.":String(e.message||"Unable to save image.")}
  input.value="";
 };
 input.click();
}
function controls(id,name,cls){
 const wrap=node("div",undefined,cls||"soa-portrait-controls");
 const status=node("p","","soa-portrait-status");status.setAttribute("role","status");
 const upload=node("button",read(id)?"Change portrait":"Upload portrait");upload.type="button";
 upload.onclick=()=>selectImage(id,name,status);
 const remove=node("button","Remove");remove.type="button";remove.className="soa-portrait-remove";remove.disabled=!read(id);
 remove.onclick=()=>{if(!window.confirm("Remove "+name+"'s portrait? Your game save will be unchanged."))return;try{localStorage.removeItem(KEY+id);refresh();window.soaPortraits?.refreshMenu?.()}catch(e){status.textContent="Unable to remove portrait."}};
 wrap.append(upload,remove,status);return wrap;
}
function refresh(){
 const profile=window.soaCharacters?.profile?.();const pane=qs("soa-profession-panel");
 if(!profile||!pane)return;
 const old=qs("soa-active-portrait");if(old)old.remove();
 const section=node("div",undefined,"soa-active-portrait");section.id="soa-active-portrait";
 section.append(renderPicture(profile.id,profile.name,"soa-portrait-frame soa-active-portrait-frame"),controls(profile.id,profile.name));
 const heading=pane.querySelector("h2");if(heading)heading.after(section);else pane.prepend(section);
}
function enhanceMenu(){
 const overlay=qs("soa-character-menu");if(!overlay)return;
 const list=overlay.querySelector(".soa-character-list");if(!list)return;
 const roster=(()=>{try{return JSON.parse(localStorage.getItem("soa-character-roster-v1")||"null")}catch{return null}})();
 if(!Array.isArray(roster?.characters))return;
 Array.from(list.children).forEach((row,index)=>{
  const profile=roster.characters[index];if(!profile)return;
  const existing=row.querySelector(".soa-character-avatar");if(existing)existing.remove();
  const frame=renderPicture(profile.id,profile.name,"soa-portrait-frame soa-character-avatar");
  row.prepend(frame);
 });
 const old=overlay.querySelector("#soa-portrait-menu-help");if(old)old.remove();
 const note=node("p","Portraits can be added or changed in each hero's Character Record. Images stay on this device.","soa-menu-help");
 note.id="soa-portrait-menu-help";list.after(note);
}
function exportPortraits(ids){
 const portraits={};
 for(const id of ids){const data=read(id);if(data)portraits[id]=data}
 return portraits;
}
document.addEventListener("DOMContentLoaded",()=>{refresh();enhanceMenu()});
window.soaPortraits={read,refresh,refreshMenu:enhanceMenu,exportPortraits};
})();
