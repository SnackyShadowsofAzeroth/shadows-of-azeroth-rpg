// Static-shell offline cache. API requests are network-only and are never cached.
const CACHE="shadows-of-azeroth-v6";
const FILES=["./","./index.html","./manifest.webmanifest","./icon.svg","./campaign.js","./companions.js"];
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
