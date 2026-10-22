// Static-shell offline cache. API requests are network-only and are never cached.
const CACHE="shadows-of-azeroth-v91";
const FILES=["./","./index.html","./manifest.webmanifest","./icon.svg","./campaign.js","./racial-abilities.js","./specializations.js","./class-abilities.js","./quests.js","./equipment.js","./forever-items.js","./enchanting.js","./combat-rules.js","./companions.js","./theme.css","./characters.css","./characters.js","./character-rules.js","./resource-rules.js","./save-rules.js","./reputation.css","./reputation.js","./portraits.css","./portraits.js","./chronicle.css","./chapters.css","./chronicle.js","./progression.js","./progression.css","./abilities.js","./abilities.css","./mobile-layout.js","./mobile-layout.css"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("shadows-of-azeroth-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=="GET"||url.origin!==self.location.origin||url.pathname.includes("/api/"))return;
  const shell=req.mode==="navigate";
  event.respondWith(fetch(req).then(response=>{
    if(response.ok&&!url.search){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{}));}
    return response;
  }).catch(async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    if(shell)return (await caches.match("./index.html"))||Response.error();
    return Response.error();
  }));
});
