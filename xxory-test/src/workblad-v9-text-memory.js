const V9_TEXT_REV = 'talera-v9-text-photo-memory-20260915-r1';

export async function handleV9TextMemory(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/v9/memory' || request.method !== 'POST') return null;
  if (!env.DB || !env.MEDIA) return json({ error:'Opslagbinding ontbreekt.' }, 500);

  let payload = {};
  try { payload = await request.clone().json(); }
  catch { return null; }

  // Audio blijft eigendom van de bewezen audio-first V9-route. Alleen audio-loze
  // herinneringen worden hier afgehandeld, zodat bestaande audio-opslag onaangeraakt blijft.
  if (cleanId(payload.audioId)) return null;

  const title = cleanText(payload.title, 140);
  const eventTime = cleanText(payload.eventTime, 120);
  const storyText = cleanText(payload.storyText, 20000) || '';
  const photoId = payload.photoId ? cleanId(payload.photoId) : null;
  if (!title) return json({ error:'Titel ontbreekt.' }, 422);
  if (!eventTime) return json({ error:'Datum/periode ontbreekt.' }, 422);
  if (!storyText && !photoId) return json({ error:'Voeg tekst of een foto toe aan deze herinnering.' }, 422);

  let photoHead = null;
  if (photoId) {
    photoHead = await env.MEDIA.head(objectKey('photo', photoId));
    if (!photoHead) return json({ error:'De foto is niet meer aanwezig.' }, 409);
    if (!photoHead.customMetadata?.sha256 || !photoHead.size) return json({ error:'De foto heeft geen geldige opslagbevestiging.' }, 409);
  }

  await ensureV9Table(env);
  const id = randomToken(18);
  const createdAt = new Date().toISOString();
  const photoType = photoHead ? String(photoHead.httpMetadata?.contentType || 'application/octet-stream') : null;
  const photoSha = photoHead ? String(photoHead.customMetadata?.sha256 || '') : null;

  // De bestaande V9-tabel heeft NOT NULL audiokolommen. Lege waarden + 0 bytes
  // representeren bewust "geen audio" zonder risicovolle schema-migratie.
  await env.DB.prepare(`
    INSERT INTO v9_memories (
      id, created_at, title, event_time_text, story_text,
      audio_id, audio_key, audio_mime_type, audio_size_bytes, audio_sha256,
      photo_id, photo_key, photo_mime_type, photo_size_bytes, photo_sha256, revision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, createdAt, title, eventTime, storyText,
    '', '', '', 0, '',
    photoId, photoId ? objectKey('photo', photoId) : null, photoType, photoHead ? Number(photoHead.size) : null, photoSha, V9_TEXT_REV
  ).run();

  return json({
    ok:true,
    memoryId:id,
    createdAt,
    title,
    eventTime,
    storyText,
    audioId:null,
    photoId,
    hasAudio:false,
    revision:V9_TEXT_REV
  }, 201);
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

function objectKey(kind, id) { return `v9/${kind}/${id}`; }
function cleanId(value) { const id=String(value||'').trim(); return /^[A-Za-z0-9_-]{16,80}$/.test(id) ? id : null; }
function cleanText(value, max) { if (typeof value !== 'string') return null; const text=value.trim(); return text ? text.slice(0,max) : null; }
function randomToken(bytes=24) { const data=new Uint8Array(bytes); crypto.getRandomValues(data); let text=''; for (const b of data) text+=String.fromCharCode(b); return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,''); }
function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=UTF-8','cache-control':'no-store, max-age=0','x-talera-v9-text-memory':V9_TEXT_REV}})}
