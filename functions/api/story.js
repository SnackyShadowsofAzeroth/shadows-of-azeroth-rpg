const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
export async function onRequestPost({request,env}){
 if(!env.OPENAI_API_KEY||!env.AI_ACCESS_CODE)return respond({error:"AI Story Director not configured. Add OPENAI_API_KEY and AI_ACCESS_CODE as Cloudflare secrets."},503);
 const origin=new URL(request.url).origin;
 if(request.headers.get("origin")&&request.headers.get("origin")!==origin)return respond({error:"Origin not allowed"},403);
 if(request.headers.get("x-story-access")!==env.AI_ACCESS_CODE)return respond({error:"Incorrect story access code"},401);
 if(Number(request.headers.get("content-length")||0)>12000)return respond({error:"Request too large"},413);
 let data;try{data=await request.json()}catch{return respond({error:"Invalid JSON"},400)}
 const {scene,action,state}=data||{};
 if(typeof scene!=="string"||scene.length>2300||typeof action!=="string"||action.length>300||!state||typeof state!=="object")return respond({error:"Invalid scene data"},400);
 const safeState={hp:Math.max(0,Math.min(100,Number(state.hp)||0)),energy:Math.max(0,Math.min(100,Number(state.energy)||0)),money:String(state.money||"").slice(0,40),location:String(state.location||"").slice(0,120),alert:String(state.alert||"").slice(0,60),notes:Array.isArray(state.notes)?state.notes.slice(0,12).map(x=>String(x).slice(0,120)):[]};
 const instructions="You are the optional AI Story Director for an unofficial text RPG called Shadows of Azeroth. Produce immersive second-person fantasy narration about Snacky Lugnuts, a gnome SI:7 Combat Swords rogue with emerald multifaceted goggles, black beard, and blue/teal armor. Companions include Pippa Sparkwhistle (engineer), Bromli (dwarf fighter), Lethariel (night elf priestess). Location: underground Hollow Raven laboratory beneath Raven Hill. Tone: ominous espionage with restrained dialogue. Prioritize established facts and continuity. CRITICAL: The client is the ONLY authority for HP, Energy, rolls, combat, money, inventory, loot, timing, quest unlocks, and success or failure. Never assert that an action succeeded or failed unless explicitly stated in supplied facts; never invent or grant rewards, injuries, new companions, enemies, or completed objectives. Write a short atmospheric OPTIONAL scene embellishment (80-150 words) that does not change game state. Do not present mechanical choices. Return plain text, not markdown or JSON.";
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),17000);
 try{
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-4.1-mini",instructions,input:JSON.stringify({scene,requested_framing:action,confirmed_state:safeState}),max_output_tokens:280,store:false}),signal:controller.signal});
  if(!response.ok){const err=await response.json().catch(()=>({}));return respond({error:response.status===429?"AI rate limit or API credit limit reached.":response.status===401?"OpenAI API key rejected.":"OpenAI request failed ("+response.status+").",detail:err?.error?.type||""},502)}
  const output=await response.json();const story=(output.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n").trim();
  if(!story)return respond({error:"AI returned no narration."},502);
  return respond({story:story.slice(0,2400),model:output.model||""});
 }catch(e){return respond({error:e.name==="AbortError"?"AI request timed out.":"AI service temporarily unavailable."},502)}finally{clearTimeout(timeout)}
}
export function onRequestGet(){return respond({status:"Story Director endpoint available; POST requires an access code. AI may still require configuration."})}
