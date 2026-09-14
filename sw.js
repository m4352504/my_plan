self.addEventListener("install",e=>e.waitUntil(caches.open("moy-plan-v1").then(c=>c.addAll(["./","./index.html","./styles.css","./app.js"]))));
self.addEventListener("fetch",e=>{if(e.request.method==="GET"&&new URL(e.request.url).origin===location.origin)e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request)))});
