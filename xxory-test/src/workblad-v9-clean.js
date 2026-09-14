const V9_REV = "talera-v9-clean-audio-first-20260914";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

export async function handleWorkbladV9(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/v9/revision" && request.method === "GET") {
    return json({
      ok: true,
      revision: V9_REV,
      isolated: true,
      audioTransport: "single-file-multipart-audio-lab-v2",
      metadataTransport: "json",
      photoTransport: "single-file-multipart",
      legacyPatches: false,
      localDraftPersistence: false,
    });
  }

  if ((path === "/v9" || path === "/v9/") && (request.method === "GET" || request.method === "HEAD")) {
    return new Response(request.method === "HEAD" ? null : V9_HTML, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=UTF-8",
        "cache-control": "no-store, max-age=0",
        "x-talera-v9": V9_REV,
      },
    });
  }

  if (path === "/api/v9/audio" && request.method === "POST") return uploadAudio(request, env);
  const audioMatch = path.match(/^\/api\/v9\/audio\/([A-Za-z0-9_-]{20,80})$/);
  if (audioMatch && (request.method === "GET" || request.method === "HEAD")) return readObject(request, env, "audio", audioMatch[1]);
  if (audioMatch && request.method === "DELETE") return deleteObject(env, "audio", audioMatch[1]);

  if (path === "/api/v9/photo" && request.method === "POST") return uploadPhoto(request, env);
  const photoMatch = path.match(/^\/api\/v9\/photo\/([A-Za-z0-9_-]{20,80})$/);
  if (photoMatch && (request.method === "GET" || request.method === "HEAD")) return readObject(request, env, "photo", photoMatch[1]);
  if (photoMatch && request.method === "DELETE") return deleteObject(env, "photo", photoMatch[1]);

  if (path === "/api/v9/memory" && request.method === "POST") return createMemory(request, env);
  const memoryMatch = path.match(/^\/api\/v9\/memory\/([A-Za-z0-9_-]{16,80})$/);
  if (memoryMatch && request.method === "GET") return readMemory(env, memoryMatch[1]);

  if (path.startsWith("/api/v9/")) return json({ error: "Niet gevonden." }, 404);
  return null;
}

async function uploadAudio(request, env) {
  if (!env.MEDIA) return json({ error: "R2 binding MEDIA ontbreekt." }, 500);
  let form;
  try { form = await request.formData(); }
  catch { return json({ error: "Ongeldige audio-upload." }, 400); }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size <= 0) return json({ error: "Geen audiobestand ontvangen." }, 400);
  if (audio.size > MAX_AUDIO_BYTES) return json({ error: "Audiobestand is groter dan 10 MB." }, 413);

  const bytes = await audio.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength !== audio.size) {
    return json({ error: "De ontvangen audiobytes kloppen niet met het bestand.", fileBytes: audio.size, receivedBytes: bytes.byteLength }, 400);
  }

  const sha256 = await digestHex(bytes);
  const id = randomToken(24);
  const key = objectKey("audio", id);
  const mimeType = String(audio.type || "application/octet-stream");
  const createdAt = new Date().toISOString();

  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: mimeType, cacheControl: "no-store" },
    customMetadata: { v9Revision: V9_REV, kind: "audio", createdAt, originalBytes: String(bytes.byteLength), sha256 },
  });

  const head = await env.MEDIA.head(key);
  const storedBytes = Number(head?.size || 0);
  const storedSha = String(head?.customMetadata?.sha256 || "");
  if (!head || storedBytes !== bytes.byteLength || storedSha !== sha256) {
    try { await env.MEDIA.delete(key); } catch {}
    return json({ error: "R2 kon de audio-opslag niet exact bevestigen.", uploadedBytes: bytes.byteLength, storedBytes, uploadedSha256: sha256, storedSha256: storedSha }, 500);
  }

  return json({ ok: true, id, uploadedBytes: bytes.byteLength, storedBytes, mimeType, sha256, playbackUrl: `/api/v9/audio/${encodeURIComponent(id)}`, createdAt, revision: V9_REV }, 201);
}

async function uploadPhoto(request, env) {
  if (!env.MEDIA) return json({ error: "R2 binding MEDIA ontbreekt." }, 500);
  let form;
  try { form = await request.formData(); }
  catch { return json({ error: "Ongeldige foto-upload." }, 400); }

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size <= 0) return json({ error: "Geen foto ontvangen." }, 400);
  if (!String(photo.type || "").toLowerCase().startsWith("image/")) return json({ error: "Het gekozen bestand is geen afbeelding." }, 415);
  if (photo.size > MAX_PHOTO_BYTES) return json({ error: "De foto is groter dan 25 MB." }, 413);

  const bytes = await photo.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength !== photo.size) {
    return json({ error: "De ontvangen fotobytes kloppen niet met het bestand.", fileBytes: photo.size, receivedBytes: bytes.byteLength }, 400);
  }

  const sha256 = await digestHex(bytes);
  const id = randomToken(24);
  const key = objectKey("photo", id);
  const mimeType = String(photo.type || "application/octet-stream");
  const createdAt = new Date().toISOString();

  await env.MEDIA.put(key, bytes, {
    httpMetadata: { contentType: mimeType, cacheControl: "no-store" },
    customMetadata: { v9Revision: V9_REV, kind: "photo", createdAt, originalBytes: String(bytes.byteLength), sha256 },
  });

  const head = await env.MEDIA.head(key);
  const storedBytes = Number(head?.size || 0);
  const storedSha = String(head?.customMetadata?.sha256 || "");
  if (!head || storedBytes !== bytes.byteLength || storedSha !== sha256) {
    try { await env.MEDIA.delete(key); } catch {}
    return json({ error: "R2 kon de foto-opslag niet exact bevestigen.", uploadedBytes: bytes.byteLength, storedBytes, uploadedSha256: sha256, storedSha256: storedSha }, 500);
  }

  return json({ ok: true, id, uploadedBytes: bytes.byteLength, storedBytes, mimeType, sha256, playbackUrl: `/api/v9/photo/${encodeURIComponent(id)}`, createdAt, revision: V9_REV }, 201);
}

async function readObject(request, env, kind, id) {
  if (!env.MEDIA) return json({ error: "R2 binding MEDIA ontbreekt." }, 500);
  const key = objectKey(kind, id);
  if (request.method === "HEAD") {
    const head = await env.MEDIA.head(key);
    if (!head) return new Response(null, { status: 404 });
    return new Response(null, { status: 200, headers: objectHeaders(head, kind) });
  }
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { status: 200, headers: objectHeaders(object, kind) });
}

async function deleteObject(env, kind, id) {
  if (!env.MEDIA) return json({ error: "R2 binding MEDIA ontbreekt." }, 500);
  await env.MEDIA.delete(objectKey(kind, id));
  return json({ ok: true });
}

async function ensureV9Table(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS v9_memories (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      title TEXT NOT NULL,
      event_time_text TEXT NOT NULL,
      story_text TEXT NOT NULL,
      audio_id TEXT NOT NULL,
      audio_key TEXT NOT NULL,
      audio_mime_type TEXT NOT NULL,
      audio_size_bytes INTEGER NOT NULL,
      audio_sha256 TEXT NOT NULL,
      photo_id TEXT,
      photo_key TEXT,
      photo_mime_type TEXT,
      photo_size_bytes INTEGER,
      photo_sha256 TEXT,
      revision TEXT NOT NULL
    )
  `).run();
}

async function createMemory(request, env) {
  if (!env.DB || !env.MEDIA) return json({ error: "Opslagbinding ontbreekt." }, 500);
  let payload;
  try { payload = await request.json(); }
  catch { return json({ error: "Ongeldige herinneringsgegevens." }, 400); }

  const title = cleanText(payload.title, 140);
  const eventTime = cleanText(payload.eventTime, 120);
  const storyText = cleanText(payload.storyText, 20000) || "";
  const audioId = cleanId(payload.audioId);
  const photoId = payload.photoId ? cleanId(payload.photoId) : null;
  if (!title) return json({ error: "Titel ontbreekt." }, 422);
  if (!eventTime) return json({ error: "Datum/periode ontbreekt." }, 422);
  if (!audioId) return json({ error: "Bewezen audio ontbreekt." }, 422);

  const audioHead = await env.MEDIA.head(objectKey("audio", audioId));
  if (!audioHead) return json({ error: "De bewezen audio is niet meer aanwezig." }, 409);
  const audioSha = String(audioHead.customMetadata?.sha256 || "");
  if (!audioSha || !audioHead.size) return json({ error: "De audio heeft geen geldige opslagbevestiging." }, 409);

  let photoHead = null;
  if (photoId) {
    photoHead = await env.MEDIA.head(objectKey("photo", photoId));
    if (!photoHead) return json({ error: "De foto is niet meer aanwezig." }, 409);
    if (!photoHead.customMetadata?.sha256 || !photoHead.size) return json({ error: "De foto heeft geen geldige opslagbevestiging." }, 409);
  }

  await ensureV9Table(env);
  const id = randomToken(18);
  const createdAt = new Date().toISOString();
  const audioType = String(audioHead.httpMetadata?.contentType || "application/octet-stream");
  const photoType = photoHead ? String(photoHead.httpMetadata?.contentType || "application/octet-stream") : null;
  const photoSha = photoHead ? String(photoHead.customMetadata?.sha256 || "") : null;

  await env.DB.prepare(`
    INSERT INTO v9_memories (
      id, created_at, title, event_time_text, story_text,
      audio_id, audio_key, audio_mime_type, audio_size_bytes, audio_sha256,
      photo_id, photo_key, photo_mime_type, photo_size_bytes, photo_sha256, revision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, createdAt, title, eventTime, storyText,
    audioId, objectKey("audio", audioId), audioType, Number(audioHead.size), audioSha,
    photoId, photoId ? objectKey("photo", photoId) : null, photoType, photoHead ? Number(photoHead.size) : null, photoSha, V9_REV
  ).run();

  return json({ ok: true, memoryId: id, createdAt, title, eventTime, storyText, audioId, photoId, revision: V9_REV }, 201);
}

async function readMemory(env, id) {
  if (!env.DB) return json({ error: "D1 binding ontbreekt." }, 500);
  await ensureV9Table(env);
  const row = await env.DB.prepare(`SELECT * FROM v9_memories WHERE id = ? LIMIT 1`).bind(id).first();
  if (!row) return json({ error: "Herinnering niet gevonden." }, 404);
  return json({ ok: true, memory: row, revision: V9_REV });
}

function objectKey(kind, id) { return `v9/${kind}/${id}`; }
function cleanId(value) { const id = String(value || "").trim(); return /^[A-Za-z0-9_-]{16,80}$/.test(id) ? id : null; }
function cleanText(value, max) { if (typeof value !== "string") return null; const text = value.trim(); return text ? text.slice(0, max) : null; }
function randomToken(bytes = 24) { const data = new Uint8Array(bytes); crypto.getRandomValues(data); let text = ""; for (const b of data) text += String.fromCharCode(b); return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
async function digestHex(buffer) { const digest = await crypto.subtle.digest("SHA-256", buffer); return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join(""); }
function objectHeaders(object, kind) { const h = new Headers(); object.writeHttpMetadata?.(h); if (!h.has("content-type")) h.set("content-type", "application/octet-stream"); h.set("content-length", String(object.size || 0)); h.set("cache-control", "no-store, max-age=0"); h.set("x-talera-v9", V9_REV); h.set("x-talera-kind", kind); const sha = String(object.customMetadata?.sha256 || ""); if (sha) h.set("x-talera-sha256", sha); return h; }
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store, max-age=0", "x-talera-v9": V9_REV } }); }

const V9_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f5f1ea">
<title>TALERA v9</title>
<style>
:root{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:#102e54;background:#f5f1ea}*{box-sizing:border-box}body{margin:0;background:#f5f1ea;color:#102e54;-webkit-text-size-adjust:100%}button,input,textarea{font:inherit}.page{max-width:720px;margin:auto;padding:22px 14px calc(40px + env(safe-area-inset-bottom))}.eyebrow{font-size:11px;font-weight:900;letter-spacing:.12em;color:#73808d}.badge{display:inline-block;margin-top:8px;padding:7px 10px;border-radius:999px;background:#e5f1ea;color:#2a674d;font-size:12px;font-weight:850}h1{font-size:clamp(34px,9vw,50px);line-height:.98;letter-spacing:-.04em;margin:14px 0 10px}.intro{color:#647181;line-height:1.45;margin:0 0 16px}.card{background:#fff;border:1px solid rgba(16,46,84,.08);box-shadow:0 12px 32px rgba(16,46,84,.055);border-radius:24px;padding:17px;margin:12px 0}.card h2{font-size:18px;margin:0 0 12px}.field{display:block;margin:10px 0}.field span{display:block;font-size:12px;font-weight:800;color:#74808d;margin-bottom:5px}.field input,.field textarea{width:100%;border:1px solid #dfe5e9;border-radius:14px;padding:12px 13px;color:#102e54;background:#fbfcfc;outline:none}.field textarea{min-height:130px;resize:vertical}.row{display:flex;gap:9px;flex-wrap:wrap}.btn{border:0;border-radius:16px;min-height:52px;padding:0 17px;background:#102f55;color:#fff;font-weight:850}.btn.secondary{background:#e8eef3;color:#102f55}.btn.confirm{background:#2c6b50}.btn.warm{background:#efdcd4;color:#7b4036}.btn:disabled{opacity:.35}.wide{width:100%}.status{border-radius:15px;background:#f3f6f8;padding:12px 13px;font-size:13px;font-weight:750;line-height:1.4;margin:10px 0}.status.live{background:#fff2ed;color:#8a493e}.status.ok{background:#e8f3ed;color:#2c684e}.status.bad{background:#fbe9e6;color:#923d35}.metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.metric{background:#f6f8f9;border-radius:13px;padding:10px;min-width:0}.metric span{font-size:10px;color:#7d8791;display:block}.metric strong{font-size:12px;display:block;word-break:break-word;margin-top:3px}.photo-preview{width:100%;max-height:280px;object-fit:contain;border-radius:16px;background:#f2f4f5;margin-top:8px}.hidden{display:none!important}.log{white-space:pre-wrap;background:#111923;color:#dae4ed;border-radius:16px;padding:12px;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;max-height:220px;overflow:auto}.success{font-size:20px;font-weight:900;color:#2c684e}.note{font-size:12px;color:#73808d;line-height:1.4}@media(max-width:520px){.page{padding-left:10px;padding-right:10px}.card{border-radius:20px;padding:15px}.metrics{grid-template-columns:1fr}.row .btn{flex:1 1 44%}}
</style>
</head>
<body>
<main class="page">
<div class="eyebrow">TALERA · SCHONE V9 HERBOUW</div>
<div class="badge">Gebouwd vanuit de 10/10 Audio Lab-trein</div>
<h1>Eén herinnering. Eén rechte trein.</h1>
<p class="intro">Deze pagina gebruikt geen oude workblad-opslag, geen multipart-normalizer en geen lokaal conceptarchief. Eerst bewijzen we de verse audio. Daarna tekst/gegevens. De foto gaat apart.</p>

<section class="card">
<h2>1. Gegevens</h2>
<label class="field"><span>Titel</span><input id="title" maxlength="140" placeholder="Bijv. Ponykamp vandaag"></label>
<label class="field"><span>Wanneer</span><input id="date" maxlength="120" placeholder="Bijv. zomer 2026"></label>
<label class="field"><span>Tekst</span><textarea id="story" maxlength="20000" placeholder="Wat wil je bij deze herinnering bewaren?"></textarea></label>
<label class="field"><span>Foto — optioneel, kies voor deze test een verse foto</span><input id="photo" type="file" accept="image/*"></label>
<img id="photoPreview" class="photo-preview hidden" alt="Gekozen foto">
</section>

<section class="card">
<h2>2. Bewezen audio</h2>
<div id="recordStatus" class="status">Klaar voor een verse opname.</div>
<div class="row"><button id="start" class="btn">Start opname</button><button id="stop" class="btn warm" disabled>Stop</button></div>
<div class="metrics"><div class="metric"><span>Duur</span><strong id="duration">0.0 s</strong></div><div class="metric"><span>Type</span><strong id="mime">—</strong></div><div class="metric"><span>Lokale bytes</span><strong id="localBytes">—</strong></div><div class="metric"><span>Lokale hash</span><strong id="localHash">—</strong></div></div>
<div class="row" style="margin-top:10px"><button id="playLocal" class="btn secondary" disabled>Luister lokaal</button><button id="confirmLocal" class="btn confirm" disabled>Ja, dit is goed</button></div>
<audio id="localAudio" playsinline preload="metadata"></audio>
</section>

<section class="card">
<h2>3. Opslaan</h2>
<div id="saveStatus" class="status">Wacht op bevestigde lokale audio.</div>
<button id="save" class="btn wide" disabled>Bewijs audio en sla herinnering op</button>
<div class="metrics"><div class="metric"><span>Server audio bytes</span><strong id="serverBytes">—</strong></div><div class="metric"><span>Audio hash gelijk</span><strong id="audioEqual">—</strong></div><div class="metric"><span>Foto</span><strong id="photoState">niet gekozen</strong></div><div class="metric"><span>Herinnering-ID</span><strong id="memoryId">—</strong></div></div>
<div id="success" class="success hidden" style="margin-top:14px">✓ Complete v9-herinnering veilig bevestigd.</div>
<p class="note">Pas nadat audio teruggehaald en byte/hash-gelijk is, worden gegevens en foto gekoppeld.</p>
</section>

<section class="card"><h2>Diagnose</h2><div id="log" class="log"></div></section>
</main>
<script>
(() => {
const REV=${JSON.stringify(V9_REV)}, $=id=>document.getElementById(id);
let stream=null, recorder=null, chunks=[], startedAt=0, timer=0, localBlob=null, localUrl='', localSha='', localPlayed=false, localConfirmed=false, chosenPhoto=null, photoUrl='';
const logEl=$('log');
function log(msg,data){const t=new Date().toLocaleTimeString('nl-NL',{hour12:false});let line='['+t+'] '+msg;if(data!==undefined){try{line+=' '+JSON.stringify(data)}catch{}}logEl.textContent+=(logEl.textContent?'\n':'')+line;logEl.scrollTop=logEl.scrollHeight}
function status(id,text,mode=''){const el=$(id);el.textContent=text;el.className='status'+(mode?' '+mode:'')}
function pretty(n){n=Number(n)||0;if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(2)+' MB'}
function shortHash(v){v=String(v||'');return v?v.slice(0,12)+'…'+v.slice(-8):'—'}
function hex(b){return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}
async function hashBlob(blob){return hex(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))}
function apple(){const ua=String(navigator.userAgent||'');return /iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1)}
function chooseMime(){const list=apple()?['audio/mp4','audio/webm;codecs=opus','audio/webm']:['audio/webm;codecs=opus','audio/webm','audio/mp4'];for(const t of list){try{if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))return t}catch{}}return ''}
function fileName(type){type=String(type||'').toLowerCase();if(type.includes('mp4')||type.includes('m4a'))return 'talera-v9.m4a';if(type.includes('ogg'))return 'talera-v9.ogg';if(type.includes('mpeg'))return 'talera-v9.mp3';return 'talera-v9.webm'}
function stopTracks(){if(stream)stream.getTracks().forEach(t=>{try{t.stop()}catch{}});stream=null}
function startClock(){clearInterval(timer);timer=setInterval(()=>{$('duration').textContent=((Date.now()-startedAt)/1000).toFixed(1)+' s'},100)}
function stopClock(){clearInterval(timer);timer=0;if(startedAt)$('duration').textContent=((Date.now()-startedAt)/1000).toFixed(1)+' s'}
async function startRecording(){if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder!=='function'){return status('recordStatus','Opname-API ontbreekt op dit toestel.','bad')}if(localUrl){URL.revokeObjectURL(localUrl);localUrl=''}localBlob=null;localSha='';localConfirmed=false;localPlayed=false;$('playLocal').disabled=true;$('confirmLocal').disabled=true;$('save').disabled=true;status('recordStatus','Microfoon openen…','live');try{stream=await navigator.mediaDevices.getUserMedia({audio:true});const mime=chooseMime();chunks=[];recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);$('mime').textContent=recorder.mimeType||mime||'browser kiest';recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};recorder.onerror=e=>{status('recordStatus','Recorderfout: '+(e?.error?.message||e?.name||'onbekend'),'bad')};recorder.onstop=finalize;recorder.start();startedAt=Date.now();startClock();$('start').disabled=true;$('stop').disabled=false;status('recordStatus','Opname loopt','live');log('Opname gestart',{mime:recorder.mimeType||mime})}catch(e){stopTracks();$('start').disabled=false;status('recordStatus','Microfoon kon niet openen: '+e.message,'bad');log('getUserMedia fout',{name:e.name,message:e.message})}}
function stopRecording(){if(!recorder||recorder.state==='inactive')return;$('stop').disabled=true;status('recordStatus','Opname afronden…');try{recorder.stop()}catch(e){status('recordStatus','Stoppen mislukt: '+e.message,'bad')}}
async function finalize(){stopClock();stopTracks();const type=recorder?.mimeType||chunks.find(Boolean)?.type||'application/octet-stream';recorder=null;const blob=new Blob(chunks,{type});chunks=[];$('start').disabled=false;if(!blob.size)return status('recordStatus','Geen audiobytes gemaakt.','bad');localBlob=blob;localSha=await hashBlob(blob);localUrl=URL.createObjectURL(blob);$('localAudio').src=localUrl;$('localAudio').load();$('localBytes').textContent=pretty(blob.size)+' ('+blob.size+')';$('localHash').textContent=shortHash(localSha);$('playLocal').disabled=false;status('recordStatus','Verse lokale opname klaar.','ok');log('Lokale opname klaar',{bytes:blob.size,type:blob.type,sha256:localSha})}
async function playLocal(){if(!localBlob)return;localPlayed=false;$('confirmLocal').disabled=true;try{$('localAudio').currentTime=0;await $('localAudio').play()}catch(e){status('recordStatus','Lokale playback mislukt: '+e.message,'bad')}}
$('localAudio').addEventListener('playing',()=>{localPlayed=true;$('confirmLocal').disabled=false;status('recordStatus','Luister en bevestig dat dit goed klinkt.','live')});
function confirmLocal(){if(!localPlayed)return;localConfirmed=true;$('confirmLocal').disabled=true;$('save').disabled=false;status('recordStatus','Lokale audio door jou bevestigd.','ok');status('saveStatus','Klaar voor de bewezen Audio Lab-upload.');log('Lokale audio bevestigd')}
$('photo').addEventListener('change',()=>{const f=$('photo').files?.[0]||null;chosenPhoto=f;if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=''}if(f){photoUrl=URL.createObjectURL(f);$('photoPreview').src=photoUrl;$('photoPreview').classList.remove('hidden');$('photoState').textContent='vers gekozen: '+pretty(f.size)}else{$('photoPreview').classList.add('hidden');$('photoState').textContent='niet gekozen'}});
async function uploadAudio(){status('saveStatus','Stap 1/4 · audio naar R2 en exact terugcontroleren…','live');const form=new FormData();form.append('audio',localBlob,fileName(localBlob.type));const res=await fetch('/api/v9/audio',{method:'POST',body:form,cache:'no-store'});const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||'Audio-upload mislukt');const head=await fetch(data.playbackUrl,{method:'HEAD',cache:'no-store'});if(!head.ok)throw new Error('HEAD op serveraudio mislukt');const get=await fetch(data.playbackUrl,{cache:'no-store'});if(!get.ok)throw new Error('Serveraudio terughalen mislukt');const serverBlob=await get.blob(),serverSha=await hashBlob(serverBlob),headBytes=Number(head.headers.get('content-length')||0),headSha=head.headers.get('x-talera-sha256')||'';const sameBytes=serverBlob.size===localBlob.size&&headBytes===localBlob.size&&Number(data.storedBytes)===localBlob.size;const sameHash=localSha===serverSha&&localSha===data.sha256&&(!headSha||headSha===localSha);$('serverBytes').textContent=pretty(serverBlob.size)+' ('+serverBlob.size+')';$('audioEqual').textContent=sameBytes&&sameHash?'JA':'NEE';if(!sameBytes||!sameHash)throw new Error('Audio kwam niet exact byte/hash-gelijk terug.');log('Audio bewezen',{id:data.id,sameBytes,sameHash,bytes:serverBlob.size,sha256:serverSha});return data}
async function uploadPhoto(){if(!chosenPhoto)return null;status('saveStatus','Stap 2/4 · foto apart opslaan…','live');const localPhotoSha=await hashBlob(chosenPhoto),form=new FormData();form.append('photo',chosenPhoto,chosenPhoto.name||'foto.jpg');const res=await fetch('/api/v9/photo',{method:'POST',body:form,cache:'no-store'});const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||'Foto-upload mislukt');const get=await fetch(data.playbackUrl,{cache:'no-store'});if(!get.ok)throw new Error('Serverfoto terughalen mislukt');const blob=await get.blob(),serverSha=await hashBlob(blob);if(blob.size!==chosenPhoto.size||serverSha!==localPhotoSha||data.sha256!==localPhotoSha)throw new Error('Foto kwam niet exact byte/hash-gelijk terug.');$('photoState').textContent='bewezen: '+pretty(blob.size);log('Foto bewezen',{id:data.id,bytes:blob.size,sha256:serverSha});return data}
async function saveMemory(){const title=$('title').value.trim(),eventTime=$('date').value.trim(),storyText=$('story').value.trim();if(!title||!eventTime)return status('saveStatus','Vul eerst titel en wanneer in.','bad');if(!localBlob||!localConfirmed)return status('saveStatus','Bevestig eerst een verse lokale opname.','bad');$('save').disabled=true;$('success').classList.add('hidden');try{const audio=await uploadAudio();const photo=await uploadPhoto();status('saveStatus','Stap 3/4 · tekst en gegevens via JSON koppelen…','live');const res=await fetch('/api/v9/memory',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,eventTime,storyText,audioId:audio.id,photoId:photo?.id||null}),cache:'no-store'});const data=await res.json();if(!res.ok||!data.ok)throw new Error(data.error||'Herinnering koppelen mislukt');status('saveStatus','Stap 4/4 · complete herinnering terugcontroleren…','live');const check=await fetch('/api/v9/memory/'+encodeURIComponent(data.memoryId),{cache:'no-store'}),checkData=await check.json();if(!check.ok||!checkData.ok||!checkData.memory||checkData.memory.audio_id!==audio.id)throw new Error('Complete herinnering kon niet worden terugbevestigd.');$('memoryId').textContent=data.memoryId;$('success').classList.remove('hidden');status('saveStatus','Alles bevestigd: audio, gegevens'+(photo?' en foto':'')+'.','ok');log('COMPLETE V9 HERINNERING BEWEZEN',{memoryId:data.memoryId,audioId:audio.id,photoId:photo?.id||null});}catch(e){status('saveStatus',e.message||'Opslaan mislukt','bad');$('save').disabled=false;log('Opslagketen fout',{name:e.name,message:e.message})}}
$('start').addEventListener('click',startRecording);$('stop').addEventListener('click',stopRecording);$('playLocal').addEventListener('click',playLocal);$('confirmLocal').addEventListener('click',confirmLocal);$('save').addEventListener('click',saveMemory);window.addEventListener('pagehide',()=>{stopTracks();try{$('localAudio').pause()}catch{}});log('V9 gestart',{revision:REV,appleMobile:apple(),secureContext:window.isSecureContext,userAgent:navigator.userAgent});
})();
</script>
</body>
</html>`;
