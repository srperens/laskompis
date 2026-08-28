/* Läskompis service worker.

   The point of going offline-capable is not really offline use — Chrome's
   speech recognition sends the audio to Google and stops working without a
   network, so a fully offline session only works in Safari. The point is that
   an installed app starts instantly and, on iOS, is exempt from Safari's
   habit of clearing storage for sites nobody has visited in a week. That is
   where the saved profiles live.

   Bump CACHE when the shell changes. */
/* Bumped when the shell's file layout changes, not on every deploy — the shell
   revalidates on its own. The v1 cache held a self-contained index.html; leaving
   it behind means a stylesheet and a script that the old service worker had
   cached cache-first can't outlive the change. */
const CACHE = 'laskompis-v2';
const MODELS = 'laskompis-models-v1';
/* The scope root, so a navigation can be told from any other page served from
   the same origin — the cached shell must only ever be the app itself. */
const ROOT = new URL('./', self.location).pathname;
const FONTS = 'laskompis-fonts-v1';
const SHELL = [
  './', './index.html', './app.css', './app.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e=>{
  e.waitUntil((async ()=>{
    const c = await caches.open(CACHE);
    // one unreachable URL must not fail the whole install
    await Promise.all(SHELL.map(u => c.add(u).catch(()=>{})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e=>{
  e.waitUntil((async ()=>{
    const keep = [CACHE, FONTS, MODELS];
    for(const k of await caches.keys()){
      if(!keep.includes(k)) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;

  let url;
  try{ url = new URL(req.url); }catch(err){ return; }

  /* Google Fonts: cache-first. The URLs are content-addressed, so a hit is
     always current. The font files come back opaque (status 0), which is fine
     to store and replay — but means we cannot check res.ok. */
  if(url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith((async ()=>{
      const c = await caches.open(FONTS);
      const hit = await c.match(req);
      if(hit) return hit;
      try{
        const res = await fetch(req);
        if(res) c.put(req, res.clone());
        return res;
      }catch(err){
        return Response.error();
      }
    })());
    return;
  }

  /* The optional neural voice's model is 60 MB, and it has to survive restarts or
     it is paid for again on every one. The library that loads it caches into the
     Origin Private File System, but its write is fire-and-forget — download()
     resolves before the file is on disk — and Safari's support for writing there
     has been uneven. The Cache API is what this app already stands on, so the
     model goes in here too, in its own cache so the shell's cleanup can't sweep
     it. Cache-first without revalidation: the files are addressed by revision and
     never change under a given URL. */
  if(url.hostname === 'huggingface.co' && /\.onnx(\.json)?$/.test(url.pathname)){
    e.respondWith((async ()=>{
      const c = await caches.open(MODELS);
      const hit = await c.match(req);
      if(hit) return hit;
      try{
        const res = await fetch(req);
        // not awaited: 60 MB should not delay handing the response on
        if(res && res.ok) c.put(req, res.clone()).catch(()=>{});
        return res;
      }catch(err){
        return Response.error();
      }
    })());
    return;
  }

  if(url.origin !== self.location.origin) return;

  /* The app's own code — the page, the stylesheet, the script — is network-first:
     a new version must never be held back by the cache, and the three must never
     be served from different deploys. The stored copies exist for having no
     network at all.

     Going to the network is not enough on its own. A plain fetch() is still
     answered by the HTTP cache, and GitHub Pages serves these with max-age=600,
     so a cold start within ten minutes of a deploy would load the old version off
     disk without ever asking the server. 'no-cache' sends the ETag along and
     revalidates instead: an unchanged file costs a 304, a changed one arrives at
     once. Cache-first here would be actively wrong — it would hand back yesterday's
     script to today's markup. */
  const revalidating = (key, offline) => e.respondWith((async ()=>{
    const store = async res =>{
      if(res && res.ok && key){
        const c = await caches.open(CACHE);
        c.put(key, res.clone());
      }
      return res;
    };
    /* The second attempt drops the cache override, for a browser that refuses to
       re-initialise a navigation request. */
    try{ return await store(await fetch(req, {cache:'no-cache'})); }catch(err){}
    try{ return await store(await fetch(req)); }catch(err){}
    return (await offline()) || Response.error();
  })());

  if(req.mode === 'navigate'){
    /* Only the app itself is the shell. Any other page on this origin — a test
       page, a scratch page — is served but never stored, since storing it under
       './index.html' would replace the app's offline copy with it. */
    const isShell = url.pathname === ROOT || url.pathname === ROOT + 'index.html';
    revalidating(isShell ? './index.html' : null, async ()=>{
      if(!isShell) return null;              // no stored copy to fall back on
      const c = await caches.open(CACHE);
      return (await c.match('./index.html')) || (await c.match('./'));
    });
    return;
  }

  if(/\.(css|js)$/.test(url.pathname)){
    revalidating(req.url, async ()=> (await caches.open(CACHE)).match(req));
    return;
  }

  // icons and the manifest: they change with the app, not between deploys, so
  // serve from cache and refresh in the background
  e.respondWith((async ()=>{
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    const net = fetch(req).then(res=>{
      if(res && res.ok) c.put(req, res.clone());
      return res;
    }).catch(()=>null);
    return hit || (await net) || Response.error();
  })());
});
