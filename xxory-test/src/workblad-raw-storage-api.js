const MAX_STORY_TEXT_CHARS = 20000;
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

export async function handleWorkbladRawStorageApi(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/integration/raw/')) return null;

  if (request.method === 'OPTIONS') {
    return json({ ok: true });
  }

  if (url.pathname === '/api/integration/raw/stories' && request.method === 'POST') {
    return createRawStory(request, env);
  }

  const audioMatch = url.pathname.match(/^\/api\/integration\/raw\/stories\/([^/]+)\/audio$/);
  if (audioMatch && request.method === 'PUT') {
    return putRawAudio(request, env, audioMatch[1]);
  }

  const mediaMatch = url.pathname.match(/^\/api\/integration\/raw\/stories\/([^/]+)\/media$/);
  if (mediaMatch && request.method === 'POST') {
    return putRawMedia(request, env, mediaMatch[1], url.searchParams.get('role') || 'extra');
  }

  return json({ error: 'Niet gevonden.' }, 404);
}

async function createRawStory(request, env) {
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Ongeldige verhaalgegevens.' }, 400);
  }

  const title = cleanText(payload.title, 140) || '';
  const eventTime = cleanText(payload.eventTime, 120) || '';
  const storyText = cleanText(payload.storyText, MAX_STORY_TEXT_CHARS) || '';
  const sourceMode = cleanText(payload.sourceMode, 24) || 'workblad';
  const displayName = cleanText(payload.displayName, 80);
  const voiceAttempted = Boolean(payload.voiceAttempted);

  if (!title) return json({ error: 'Vul eerst een titel in.' }, 422);
  if (!eventTime) return json({ error: 'Kies eerst wanneer dit verhaal speelde.' }, 422);
  if (!storyText && !voiceAttempted) return json({ error: 'Verhaal ontbreekt.' }, 400);

  const storyId = randomToken(16);
  const manageToken = randomToken(32);
  const manageTokenHash = await sha256(manageToken);
  const createdAt = new Date().toISOString();

  try {
    await env.DB.prepare(`
      INSERT INTO stories (
        id, created_at, audio_object_key, audio_mime_type, audio_size_bytes,
        duration_seconds, display_name, manage_token_hash, status,
        source_mode, start_photo_key, updated_at, title, event_time_text, event_time_precision
      ) VALUES (?, ?, '', '', 0, NULL, ?, ?, 'active', ?, NULL, ?, ?, ?, 'gebruiker')
    `).bind(
      storyId,
      createdAt,
      displayName,
      manageTokenHash,
      sourceMode,
      createdAt,
      title,
      eventTime
    ).run();

    if (storyText) {
      await env.DB.prepare(`INSERT INTO story_texts (story_id, text_content) VALUES (?, ?)`).bind(storyId, storyText).run();
    }
  } catch (error) {
    try { await env.DB.prepare(`DELETE FROM story_texts WHERE story_id = ?`).bind(storyId).run(); } catch {}
    try { await env.DB.prepare(`DELETE FROM stories WHERE id = ?`).bind(storyId).run(); } catch {}
    throw error;
  }

  return json({
    ok: true,
    storyId,
    manageToken,
    createdAt,
    proposal: {},
    title,
    eventTime,
    hasAudio: false,
    audioSizeBytes: 0,
  }, 201);
}

async function putRawAudio(request, env, storyId) {
  const auth = await authorize(request, env, storyId);
  if (auth.errorResponse) return auth.errorResponse;

  const contentType = String(request.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
  if (!contentType.toLowerCase().startsWith('audio/')) {
    return json({ error: 'Ongeldig audiotype.' }, 415);
  }

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return json({ error: 'Opname ontbreekt.' }, 400);
  if (bytes.byteLength > MAX_AUDIO_BYTES) return json({ error: 'Deze opname is te groot.' }, 413);

  const updatedAt = new Date().toISOString();
  const duration = parseOptionalNumber(request.headers.get('x-talera-duration-seconds'));
  const objectKey = `stories/${storyId}/audio-${Date.now()}.${extensionForAudioMime(contentType)}`;

  await env.MEDIA.put(objectKey, bytes, {
    httpMetadata: { contentType, cacheControl: 'no-store' },
    customMetadata: { storyId, updatedAt, role: 'story-audio', transport: 'raw-v1' },
  });

  const written = await env.MEDIA.head(objectKey);
  if (!written || Number(written.size || 0) !== bytes.byteLength) {
    try { await env.MEDIA.delete(objectKey); } catch {}
    return json({ error: 'De opname kon niet exact op de server worden vastgelegd.' }, 502);
  }

  await env.DB.prepare(`
    UPDATE stories
    SET audio_object_key = ?, audio_mime_type = ?, audio_size_bytes = ?, duration_seconds = ?, updated_at = ?
    WHERE id = ?
  `).bind(objectKey, contentType, bytes.byteLength, duration, updatedAt, storyId).run();

  if (auth.row.audio_object_key && auth.row.audio_object_key !== objectKey) {
    try { await env.MEDIA.delete(auth.row.audio_object_key); } catch {}
  }

  return json({
    ok: true,
    storyId,
    hasAudio: true,
    audioMimeType: contentType,
    audioSizeBytes: bytes.byteLength,
    durationSeconds: duration,
    updatedAt,
  });
}

async function putRawMedia(request, env, storyId, requestedRole) {
  const auth = await authorize(request, env, storyId);
  if (auth.errorResponse) return auth.errorResponse;

  const contentType = String(request.headers.get('content-type') || '').split(';')[0].trim();
  if (!contentType.toLowerCase().startsWith('image/')) {
    return json({ error: 'Alleen afbeeldingen kunnen hier worden toegevoegd.' }, 415);
  }

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return json({ error: 'Foto ontbreekt.' }, 400);
  if (bytes.byteLength > MAX_MEDIA_BYTES) return json({ error: 'Deze foto is te groot.' }, 413);

  const role = requestedRole === 'start' ? 'start' : 'extra';
  const createdAt = new Date().toISOString();
  const mediaId = randomToken(12);
  const objectKey = `stories/${storyId}/media-${mediaId}.${extensionForMediaMime(contentType)}`;

  await env.MEDIA.put(objectKey, bytes, {
    httpMetadata: { contentType, cacheControl: 'no-store' },
    customMetadata: { storyId, createdAt, role, transport: 'raw-v1' },
  });

  const written = await env.MEDIA.head(objectKey);
  if (!written || Number(written.size || 0) !== bytes.byteLength) {
    try { await env.MEDIA.delete(objectKey); } catch {}
    return json({ error: 'De foto kon niet exact op de server worden vastgelegd.' }, 502);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO story_media (id, story_id, object_key, mime_type, size_bytes, media_type, role, created_at)
      VALUES (?, ?, ?, ?, ?, 'image', ?, ?)
    `).bind(mediaId, storyId, objectKey, contentType, bytes.byteLength, role, createdAt).run();

    if (role === 'start') {
      await env.DB.prepare(`UPDATE stories SET start_photo_key = ?, updated_at = ? WHERE id = ?`).bind(objectKey, createdAt, storyId).run();
    }
  } catch (error) {
    try { await env.MEDIA.delete(objectKey); } catch {}
    throw error;
  }

  return json({ ok: true, storyId, mediaId, role, mimeType: contentType, sizeBytes: bytes.byteLength }, 201);
}

async function authorize(request, env, storyId) {
  const token = bearerToken(request);
  if (!token) return { errorResponse: json({ error: 'Beheer-token ontbreekt.' }, 401) };

  const row = await env.DB.prepare(`
    SELECT id, manage_token_hash, status, audio_object_key
    FROM stories
    WHERE id = ?
    LIMIT 1
  `).bind(storyId).first();

  if (!row || row.status === 'deleted') return { errorResponse: json({ error: 'Verhaal niet gevonden.' }, 404) };
  if (!(await secureHashMatch(token, row.manage_token_hash))) return { errorResponse: json({ error: 'Geen toegang.' }, 403) };
  return { row };
}

function bearerToken(request) {
  const value = request.headers.get('authorization') || '';
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : null;
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function randomToken(bytes) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  let binary = '';
  for (const value of values) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function secureHashMatch(token, expectedHash) {
  const actualHash = await sha256(token);
  if (!expectedHash || actualHash.length !== expectedHash.length) return false;
  let difference = 0;
  for (let i = 0; i < actualHash.length; i++) difference |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return difference === 0;
}

function extensionForAudioMime(mimeType) {
  const type = String(mimeType || '').toLowerCase();
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('wav')) return 'wav';
  return 'webm';
}

function extensionForMediaMime(mimeType) {
  const type = String(mimeType || '').toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('heic') || type.includes('heif')) return 'heic';
  if (type.includes('gif')) return 'gif';
  return 'jpg';
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
