/* Keep 轨迹生成器 —— Service Worker
   只缓存本应用自己的静态文件；高德接口、高程接口、地图瓦片一律走网络。 */
const CACHE = "keep-track-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 逐个 add，任何一个 404 都不会让整个 install 失败
    await Promise.all(ASSETS.map((u) => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 跨域请求不接管

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) {
      // 后台顺手更新，下次打开就是新的
      fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {});
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      const shell = await cache.match("./index.html", { ignoreSearch: true });
      if (shell) return shell;
      throw err;
    }
  })());
});
