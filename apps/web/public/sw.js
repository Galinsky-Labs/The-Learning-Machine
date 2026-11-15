// TLM-092: offline operation for the static lessons. Same-origin GET requests only; nothing is sent anywhere.
const CACHE='tlm-offline-v1';
const ROUTES=['/','/vision/','/shapes/','/model/','/audio/','/law/','/market/','/studio/','/capstone/','/policy/'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ROUTES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 // Network first so new releases appear immediately; fall back to the cached copy when offline.
 event.respondWith(fetch(event.request).then(response=>{if(response.ok&&response.type==='basic'){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return response})
  .catch(()=>caches.match(event.request,{ignoreSearch:true}).then(hit=>hit||caches.match(url.pathname.endsWith('/')?url.pathname:url.pathname+'/')).then(hit=>hit||new Response('Offline and not yet cached. Open this page once while online.',{status:503,headers:{'content-type':'text/plain'}}))));
});
