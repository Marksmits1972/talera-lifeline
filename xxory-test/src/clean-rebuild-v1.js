export const CLEAN_REBUILD_REV = 'clean-rebuild-photo-foundation-20260916-r1';

const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const PHOTO_KEY_PREFIX = 'clean-rebuild/photo/';

export async function handleCleanRebuild(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if ((path === '/clean' || path === '/clean/') && (request.method === 'GET' || request.method === 'HEAD')) {
    return new Response(request.method === 'HEAD' ? null : CLEAN_HTML, {
      status: 200,
      headers: htmlHeaders()
    });
  }

  if (path === '/api/clean/revision' && request.method === 'GET') {
    return json({
      ok: true,
      revision: CLEAN_REBUILD_REV,
      phase: 'photo-foundation',
      isolated: true,
      legacyWorkbladDependencies: false,
      clientImageProcessing: false,
      directLocalPreview: true,
      directServerUpload: true
    });
  }

  if (path === '/api/clean/photo' && request.method === 'POST') {
    return uploadPhoto(request, env);
  }

  const photoMatch = path.match(/^\/api\/clean\/photo\/([A-Za-z0-9_-]{20,80})$/);
  if (photoMatch && (request.method === 'GET' || request.method === 'HEAD')) {
    return readPhoto(request, env, photoMatch[1]);
  }
  if (photoMatch && request.method === 'DELETE') {
    return deletePhoto(env, photoMatch[1]);
  }

  if (path.startsWith('/api/clean/')) return json({ error: 'Niet gevonden.' }, 404);
  return null;
}

async function uploadPhoto(request, env) {
  if (!env.MEDIA) return json({ error: 'Foto-opslag is niet beschikbaar.' }, 500);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'De gekozen foto kon niet worden gelezen.' }, 400);
  }

  const photo = form.get('photo');
  if (!(photo instanceof File) || photo.size <= 0) return json({ error: 'Geen foto ontvangen.' }, 400);
  if (!String(photo.type || '').toLowerCase().startsWith('image/')) return json({ error: 'Het gekozen bestand is geen afbeelding.' }, 415);
  if (photo.size > MAX_PHOTO_BYTES) return json({ error: 'Deze foto is groter dan 25 MB.' }, 413);

  const bytes = await photo.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength !== photo.size) {
    return json({ error: 'De fotobytes zijn niet volledig ontvangen.' }, 400);
  }

  const id = randomToken(24);
  const key = PHOTO_KEY_PREFIX + id;
  const mimeType = String(photo.type || 'application/octet-stream');
  const sha256 = await digestHex(bytes);
  const createdAt = new Date().toISOString();

  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: mimeType, cacheControl: 'no-store' },
    customMetadata: {
      kind: 'clean-rebuild-photo',
      revision: CLEAN_REBUILD_REV,
      createdAt,
      originalName: String(photo.name || '').slice(0, 160),
      sha256
    }
  });

  const head = await env.MEDIA.head(key);
  if (!head || Number(head.size || 0) !== bytes.byteLength || String(head.customMetadata?.sha256 || '') !== sha256) {
    try { await env.MEDIA.delete(key); } catch {}
    return json({ error: 'De foto kon niet veilig worden bevestigd.' }, 500);
  }

  return json({
    ok: true,
    id,
    playbackUrl: '/api/clean/photo/' + encodeURIComponent(id),
    mimeType,
    bytes: bytes.byteLength,
    sha256,
    createdAt,
    revision: CLEAN_REBUILD_REV
  }, 201);
}

async function readPhoto(request, env, id) {
  if (!env.MEDIA) return json({ error: 'Foto-opslag is niet beschikbaar.' }, 500);
  const key = PHOTO_KEY_PREFIX + id;

  if (request.method === 'HEAD') {
    const head = await env.MEDIA.head(key);
    if (!head) return new Response(null, { status: 404 });
    return new Response(null, { status: 200, headers: photoHeaders(head) });
  }

  const object = await env.MEDIA.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, { status: 200, headers: photoHeaders(object) });
}

async function deletePhoto(env, id) {
  if (!env.MEDIA) return json({ error: 'Foto-opslag is niet beschikbaar.' }, 500);
  await env.MEDIA.delete(PHOTO_KEY_PREFIX + id);
  return json({ ok: true });
}

function photoHeaders(object) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/octet-stream');
  headers.set('content-length', String(object.size || 0));
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-talera-clean-rebuild', CLEAN_REBUILD_REV);
  const sha = String(object.customMetadata?.sha256 || '');
  if (sha) headers.set('x-talera-sha256', sha);
  return headers;
}

function htmlHeaders() {
  return {
    'content-type': 'text/html; charset=UTF-8',
    'cache-control': 'no-store, max-age=0',
    'x-talera-clean-rebuild': CLEAN_REBUILD_REV
  };
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, max-age=0',
      'x-talera-clean-rebuild': CLEAN_REBUILD_REV
    }
  });
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let text = '';
  for (const value of data) text += String.fromCharCode(value);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function digestHex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

const CLEAN_HTML = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0b2740">
<title>TALERA — schone herbouw</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",system-ui,sans-serif;color:#fff;background:#0b2740;--ink:#0b2740;--cream:#f5f1e9;--glass:rgba(8,31,51,.44)}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#0b2740}body{-webkit-text-size-adjust:100%;overscroll-behavior:none}.stage{position:relative;min-height:100svh;overflow:hidden;background:linear-gradient(180deg,#526f83 0%,#355a73 38%,#0b2740 100%)}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none}.photo.show{display:block}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,25,42,.54) 0%,rgba(5,25,42,.12) 34%,rgba(5,25,42,.08) 58%,rgba(5,25,42,.70) 100%);pointer-events:none}.top{position:relative;z-index:2;padding:max(26px,env(safe-area-inset-top)) 24px 0}.brand{font-size:14px;font-weight:900;letter-spacing:.22em}.title{margin:14px 0 0;font-size:28px;font-weight:780;letter-spacing:-.035em}.date{display:inline-flex;align-items:center;gap:8px;margin-top:13px;padding:10px 14px;border:1px solid rgba(255,255,255,.4);border-radius:999px;background:rgba(9,34,54,.18);font-weight:740}.phase{position:absolute;top:max(27px,env(safe-area-inset-top));right:22px;z-index:3;font-size:11px;font-weight:800;letter-spacing:.08em;padding:8px 10px;border-radius:999px;background:rgba(255,255,255,.14);backdrop-filter:blur(10px)}.empty{position:absolute;z-index:2;inset:170px 28px 170px;display:grid;place-content:center;text-align:center}.plusWrap{width:132px;height:132px;margin:0 auto 24px;position:relative;border-radius:50%;background:var(--cream);box-shadow:0 18px 46px rgba(0,0,0,.16)}.plus{display:grid;place-items:center;width:100%;height:100%;font-size:58px;font-weight:300;color:var(--ink)}.picker{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0}.empty h1{margin:0;font-size:28px;line-height:1.06;letter-spacing:-.03em}.empty p{margin:14px auto 0;max-width:310px;color:rgba(255,255,255,.72);font-size:16px;line-height:1.45}.controls{position:absolute;z-index:4;left:0;right:0;bottom:max(20px,env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center;gap:14px;padding:0 22px}.mic{width:112px;height:112px;border:0;border-radius:50%;background:var(--cream);color:var(--ink);font-size:42px;display:grid;place-items:center;box-shadow:0 18px 46px rgba(0,0,0,.18)}.mic[disabled]{opacity:.72}.status{min-height:42px;max-width:92vw;padding:10px 14px;border-radius:16px;background:var(--glass);backdrop-filter:blur(12px);font-size:13px;font-weight:700;text-align:center;color:rgba(255,255,255,.86)}.photoTools{position:absolute;z-index:3;top:150px;right:22px;display:none;gap:10px}.photoTools.show{display:flex}.tool{position:relative;border:1px solid rgba(255,255,255,.38);border-radius:999px;background:rgba(9,34,54,.28);color:#fff;padding:10px 14px;font-weight:800;backdrop-filter:blur(10px)}.tool input{position:absolute;inset:0;width:100%;height:100%;opacity:0}.reset{border:0}.savedBadge{position:absolute;z-index:3;left:22px;bottom:164px;padding:8px 11px;border-radius:999px;background:rgba(10,42,47,.62);font-size:12px;font-weight:800;display:none}.savedBadge.show{display:block}@media (min-width:700px){.stage{max-width:520px;margin:0 auto;box-shadow:0 0 70px rgba(0,0,0,.28)}}
</style>
</head>
<body>
<main class="stage" id="stage">
  <img class="photo" id="photo" alt="Foto bij deze herinnering">
  <div class="shade"></div>
  <div class="top">
    <div class="brand">TALERA</div>
    <div class="title">Titel van deze herinnering</div>
    <div class="date">▣&nbsp;&nbsp;Wanneer was dit?</div>
  </div>
  <div class="phase">SCHONE BOUW · FOTO</div>

  <section class="empty" id="empty">
    <div class="plusWrap">
      <div class="plus">+</div>
      <input class="picker" id="photoInput" type="file" accept="image/*" aria-label="Kies een foto">
    </div>
    <h1>Kies één foto die je herinnering oproept</h1>
    <p>Deze eerste schone stap bewijst alleen: kiezen, direct zien en veilig bewaren.</p>
  </section>

  <div class="photoTools" id="photoTools">
    <label class="tool">+ andere foto<input id="replaceInput" type="file" accept="image/*" aria-label="Kies een andere foto"></label>
    <button class="tool reset" id="removePhoto" type="button">Verwijder</button>
  </div>
  <div class="savedBadge" id="savedBadge">✓ veilig bewaard</div>

  <div class="controls">
    <button class="mic" type="button" disabled aria-label="Microfoon volgt in de volgende bouwstap">⌁</button>
    <div class="status" id="status">Eerst maken we de foto-route rotsvast op je iPhone.</div>
  </div>
</main>
<script>
(function(){
  'use strict';
  var STORAGE_KEY='talera-clean-rebuild-photo-v1';
  var photo=document.getElementById('photo');
  var empty=document.getElementById('empty');
  var tools=document.getElementById('photoTools');
  var status=document.getElementById('status');
  var savedBadge=document.getElementById('savedBadge');
  var input=document.getElementById('photoInput');
  var replace=document.getElementById('replaceInput');
  var remove=document.getElementById('removePhoto');
  var localUrl='';
  var activeId='';
  var uploadToken=0;

  function setStatus(text){status.textContent=text;}
  function showPhoto(src,saved){
    photo.onload=function(){photo.classList.add('show');empty.style.display='none';tools.classList.add('show');savedBadge.classList.toggle('show',Boolean(saved));};
    photo.onerror=function(){setStatus('De foto is bewaard, maar kan op dit toestel nog niet worden getoond.');};
    photo.src=src;
  }
  function clearLocalUrl(){if(localUrl){try{URL.revokeObjectURL(localUrl);}catch(e){}localUrl='';}}
  function readStored(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch(e){return null;}
  }
  function writeStored(data){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch(e){}}
  function clearStored(){try{localStorage.removeItem(STORAGE_KEY);}catch(e){}}

  async function choose(file){
    if(!file)return;
    if(!String(file.type||'').toLowerCase().startsWith('image/')){setStatus('Kies een afbeelding.');return;}
    if(file.size>25*1024*1024){setStatus('Deze foto is groter dan 25 MB. Kies voor deze test een kleinere foto.');return;}

    var token=++uploadToken;
    clearLocalUrl();
    localUrl=URL.createObjectURL(file);
    savedBadge.classList.remove('show');
    showPhoto(localUrl,false);
    setStatus('Foto staat in beeld. TALERA bewaart hem nu rustig op de achtergrond…');

    var form=new FormData();
    form.append('photo',file,file.name||'herinnering.jpg');
    try{
      var response=await fetch('/api/clean/photo',{method:'POST',body:form,cache:'no-store'});
      var data={};
      try{data=await response.json();}catch(e){}
      if(token!==uploadToken)return;
      if(!response.ok||!data.ok||!data.id)throw new Error(data.error||('Upload mislukt (HTTP '+response.status+').'));
      activeId=data.id;
      writeStored({id:data.id,url:data.playbackUrl,mimeType:data.mimeType,bytes:data.bytes,savedAt:Date.now()});
      savedBadge.classList.add('show');
      setStatus('✓ Foto veilig bewaard. Ververs nu gerust deze pagina: dezelfde foto moet terugkomen.');
    }catch(error){
      if(token!==uploadToken)return;
      setStatus('De foto blijft zichtbaar, maar bewaren lukte nog niet: '+String(error&&error.message?error.message:error));
    }
  }

  input.addEventListener('change',function(){var file=input.files&&input.files[0];if(file)choose(file);});
  replace.addEventListener('change',function(){var file=replace.files&&replace.files[0];if(file)choose(file);});
  remove.addEventListener('click',async function(){
    var id=activeId;
    uploadToken++;
    activeId='';
    clearLocalUrl();
    clearStored();
    photo.removeAttribute('src');
    photo.classList.remove('show');
    empty.style.display='grid';
    tools.classList.remove('show');
    savedBadge.classList.remove('show');
    input.value='';replace.value='';
    setStatus('Foto verwijderd. Kies opnieuw één foto.');
    if(id){try{await fetch('/api/clean/photo/'+encodeURIComponent(id),{method:'DELETE',cache:'no-store'});}catch(e){}}
  });

  var stored=readStored();
  if(stored&&stored.id){
    activeId=stored.id;
    setStatus('Bewaarde foto wordt teruggezet…');
    showPhoto('/api/clean/photo/'+encodeURIComponent(stored.id),true);
    setTimeout(function(){if(photo.complete&&photo.naturalWidth){setStatus('✓ Deze foto kwam na verversen terug. De eerste schone bouwstap werkt.');}},80);
  }
})();
</script>
</body>
</html>`;
