const CACHE='talera-free-backup-verified-v1';
const SHELL=['/','/tell','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png','/local/bridge.js','/local/storage.js','/local/media.js','/local/copy.browser.js','/local/catalog.js','/local/backup.js','/local/backup-ui.js','/local/recorder.js','/local/photos.js','/local/experience.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('talera-free-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET')return;
  const path=url.pathname==='/tell/'?'/tell':url.pathname;if(!SHELL.includes(path))return;
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(path))||fetch(event.request)));
});
