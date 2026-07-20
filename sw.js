'use strict';
/* Bump VER together with APP_VER in index.html on EVERY index change (rule §6.4) */
const VER='v1.4-s1';
const CACHE='tc-'+VER;
const CORE=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
const SHEETJS='https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    /* cache:'reload' defeats GitHub Pages' 10-min HTTP cache */
    await Promise.all(CORE.map(async u=>{
      try{const r=await fetch(u,{cache:'reload'});if(r.ok)await c.put(u,r);}catch(err){}
    }));
    /* SheetJS pre-cache is non-blocking */
    fetch(SHEETJS).then(r=>{if(r.ok)c.put(SHEETJS,r);}).catch(()=>{});
    self.skipWaiting();
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  /* SheetJS CDN: cache-first so exports work offline after first load */
  if(req.url===SHEETJS){
    e.respondWith((async()=>{
      const hit=await caches.match(SHEETJS);
      if(hit)return hit;
      const r=await fetch(req);
      if(r.ok)(await caches.open(CACHE)).put(SHEETJS,r.clone());
      return r;
    })());
    return;
  }

  /* Same-origin: NETWORK-FIRST — cache is the offline fallback only (rule §6.2) */
  if(url.origin===location.origin){
    e.respondWith((async()=>{
      try{
        const r=await fetch(req);
        if(r.ok)(await caches.open(CACHE)).put(req,r.clone());
        return r;
      }catch(err){
        const hit=await caches.match(req);
        if(hit)return hit;
        if(req.mode==='navigate'){
          const idx=await caches.match('./index.html');
          if(idx)return idx;
        }
        return new Response('Offline',{status:503});
      }
    })());
  }
});
