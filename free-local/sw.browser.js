const CACHE='talera-free-story-media-v13';
const SHELL=['/local/video.browser.js','/local/analysis.browser.js','/local/video.js','/local/tell-media.js','/local/analysis.js','/local/guided.js','/local/title.js','/local/title-worker.js','/local/dates.browser.js','/local/presentation.browser.js','/local/speech.browser.js','/local/dates.js','/local/presentation.js','/local/speech.js','/local/speech-worker.js','/local/speech-worklet.js','/','/tell','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png','/local/bridge.js','/local/storage.js','/local/media.js','/local/copy.browser.js','/local/catalog.js','/local/backup.js','/local/backup-ui.js','/local/recorder.js','/local/photos.js','/local/experience.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('talera-free-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);if(event.request.method!=='GET')return;
  const runtimeFiles=['transformers.min.js','ort.bundle.min.mjs','ort-wasm-simd-threaded.jsep.mjs','ort-wasm-simd-threaded.jsep.wasm'];
  if(url.origin==='https://cdn.jsdelivr.net'&&runtimeFiles.includes(url.pathname.replace('/npm/@huggingface/transformers@3.8.1/dist/',''))){
    event.respondWith(caches.open('talera-speech-runtime-v1').then(async cache=>{const saved=await cache.match(event.request);if(saved)return saved;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}));return;
  }
  if(url.origin!==self.location.origin)return;
  const path=url.pathname==='/tell/'?'/tell':url.pathname;if(!SHELL.includes(path))return;
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(path))||fetch(event.request)));
});
