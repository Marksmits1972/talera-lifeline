const TIMELINE_ORIGIN_RE = /^https:\/\/talera-timeline-prototype\.[a-z0-9-]+\.workers\.dev$/i;
const MAX_STORY_TEXT_CHARS = 20000;

export async function handleWorkbladIntegrationApi(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/integration/')) return null;

  if (request.method === 'OPTIONS') {
    return withCors(request, new Response(null, { status: 204 }));
  }

  const storyMatch = url.pathname.match(/^\/api\/integration\/stories\/([^/]+)$/);
  if (storyMatch && request.method === 'GET') {
    const response = await getPrivateStory(request, env, storyMatch[1], url.origin);
    return withCors(request, response);
  }

  const contentMatch = url.pathname.match(/^\/api\/integration\/stories\/([^/]+)\/content$/);
  if (contentMatch && request.method === 'PUT') {
    const response = await updatePrivateStoryText(request, env, contentMatch[1]);
    return withCors(request, response);
  }

  const mediaMatch = url.pathname.match(/^\/api\/integration\/stories\/([^/]+)\/media\/([^/]+)$/);
  if (mediaMatch && request.method === 'GET') {
    const response = await getPrivateMedia(request, env, mediaMatch[1], mediaMatch[2]);
    return withCors(request, response);
  }

  const audioMatch = url.pathname.match(/^\/api\/integration\/stories\/([^/]+)\/audio$/);
  if (audioMatch && request.method === 'GET') {
    const response = await getPrivateAudio(request, env, audioMatch[1]);
    return withCors(request, response);
  }

  return withCors(request, json({ error: 'Niet gevonden.' }, 404));
}

async function getPrivateStory(request, env, storyId, origin) {
  const story = await authorizedStory(request, env, storyId, `
    SELECT st.id, st.created_at, st.duration_seconds, st.display_name,
      st.audio_mime_type, st.audio_size_bytes, st.title, st.event_time_text,
      st.place_text, st.people_text, st.event_time_precision, st.source_mode,
      st.updated_at, tx.text_content
    FROM stories st
    LEFT JOIN story_texts tx ON tx.story_id = st.id
    WHERE st.id = ? AND st.status = 'active' LIMIT 1
  `);
  if (story.errorResponse) return story.errorResponse;

  const row = story.row;
  const mediaResult = await env.DB.prepare(`
    SELECT id, mime_type, media_type, role, created_at
    FROM story_media
    WHERE story_id = ?
    ORDER BY CASE WHEN role = 'start' THEN 0 ELSE 1 END, created_at ASC, id ASC
  `).bind(storyId).all();

  const media = (mediaResult.results || []).map((item) => ({
    id: item.id,
    mediaType: item.media_type,
    mimeType: item.mime_type,
    role: item.role,
    createdAt: item.created_at,
    url: `${origin}/api/integration/stories/${encodeURIComponent(storyId)}/media/${encodeURIComponent(item.id)}`,
  }));

  const eventAt = resolveEventAt(row.event_time_text, row.created_at);
  return json({
    storyId: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    durationSeconds: row.duration_seconds,
    displayName: row.display_name || null,
    title: row.title || '',
    eventTime: row.event_time_text || '',
    eventTimePrecision: row.event_time_precision || 'onbekend',
    eventAt,
    place: row.place_text || '',
    people: row.people_text || '',
    sourceMode: row.source_mode || 'workblad',
    textContent: row.text_content || '',
    hasAudio: Number(row.audio_size_bytes || 0) > 0,
    audioMimeType: row.audio_mime_type || null,
    audioUrl: Number(row.audio_size_bytes || 0) > 0
      ? `${origin}/api/integration/stories/${encodeURIComponent(storyId)}/audio`
      : null,
    media,
  });
}

async function updatePrivateStoryText(request, env, storyId) {
  const story = await authorizedStory(request, env, storyId, `
    SELECT id, manage_token_hash, status FROM stories WHERE id = ? LIMIT 1
  `, true);
  if (story.errorResponse) return story.errorResponse;

  let payload = {};
  try { payload = await request.json(); }
  catch { return json({ error: 'Ongeldige gegevens.' }, 400); }

  const textContent = cleanText(payload.storyText, MAX_STORY_TEXT_CHARS) || '';
  const updatedAt = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO story_texts (story_id, text_content)
    VALUES (?, ?)
    ON CONFLICT(story_id) DO UPDATE SET text_content = excluded.text_content
  `).bind(storyId, textContent).run();
  await env.DB.prepare(`UPDATE stories SET updated_at = ? WHERE id = ?`).bind(updatedAt, storyId).run();

  return json({ ok: true, storyId, updatedAt });
}

async function getPrivateMedia(request, env, storyId, mediaId) {
  const auth = await authorizedStory(request, env, storyId, `
    SELECT id, manage_token_hash, status FROM stories WHERE id = ? LIMIT 1
  `, true);
  if (auth.errorResponse) return auth.errorResponse;

  const row = await env.DB.prepare(`
    SELECT object_key, mime_type, media_type
    FROM story_media
    WHERE id = ? AND story_id = ? LIMIT 1
  `).bind(mediaId, storyId).first();
  if (!row) return new Response('Media niet gevonden', { status: 404 });

  return r2Response(request, env, row.object_key, row.mime_type || 'application/octet-stream');
}

async function getPrivateAudio(request, env, storyId) {
  const auth = await authorizedStory(request, env, storyId, `
    SELECT id, manage_token_hash, status, audio_object_key, audio_mime_type
    FROM stories WHERE id = ? LIMIT 1
  `, true);
  if (auth.errorResponse) return auth.errorResponse;
  if (!auth.row.audio_object_key) return new Response('Audio niet gevonden', { status: 404 });
  return r2Response(request, env, auth.row.audio_object_key, auth.row.audio_mime_type || 'application/octet-stream');
}

async function authorizedStory(request, env, storyId, query, queryAlreadyIncludesToken = false) {
  const token = bearerToken(request);
  if (!token) return { errorResponse: json({ error: 'Beheer-token ontbreekt.' }, 401) };

  let row;
  if (queryAlreadyIncludesToken) {
    row = await env.DB.prepare(query).bind(storyId).first();
  } else {
    row = await env.DB.prepare(query).bind(storyId).first();
    if (row && !row.manage_token_hash) {
      const tokenRow = await env.DB.prepare(`SELECT manage_token_hash FROM stories WHERE id = ? LIMIT 1`).bind(storyId).first();
      if (tokenRow) row.manage_token_hash = tokenRow.manage_token_hash;
    }
  }

  if (!row || row.status === 'deleted') return { errorResponse: json({ error: 'Verhaal niet gevonden.' }, 404) };
  const expectedHash = row.manage_token_hash || (await env.DB.prepare(`SELECT manage_token_hash FROM stories WHERE id = ? LIMIT 1`).bind(storyId).first())?.manage_token_hash;
  if (!(await secureHashMatch(token, expectedHash))) return { errorResponse: json({ error: 'Geen toegang.' }, 403) };
  return { row };
}

async function r2Response(request, env, key, mimeType) {
  const object = await env.MEDIA.get(key, { onlyIf: request.headers, range: request.headers });
  if (!object) return new Response('Niet gevonden', { status: 404 });
  if (!("body" in object)) return new Response(null, { status: 412 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-type', mimeType || headers.get('content-type') || 'application/octet-stream');
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'private, max-age=120');
  headers.set('etag', object.httpEtag);
  return new Response(object.body, { status: 200, headers });
}

function resolveEventAt(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  const lower = raw.toLocaleLowerCase('nl-NL');
  const yearMatch = lower.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;

  const direct = Date.parse(raw);
  if (Number.isFinite(direct) && direct > Date.UTC(1900, 0, 1)) return new Date(direct).toISOString();
  if (!year) return fallback;

  const months = {
    januari: 0, jan: 0, februari: 1, feb: 1, maart: 2, mrt: 2, april: 3, apr: 3,
    mei: 4, juni: 5, jun: 5, juli: 6, jul: 6, augustus: 7, aug: 7,
    september: 8, sep: 8, oktober: 9, okt: 9, november: 10, nov: 10, december: 11, dec: 11,
  };
  let month = null;
  for (const [name, index] of Object.entries(months)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(lower)) { month = index; break; }
  }
  if (month === null) {
    if (/\blente\b/.test(lower)) month = 3;
    else if (/\bzomer\b/.test(lower)) month = 6;
    else if (/\bherfst\b/.test(lower)) month = 9;
    else if (/\bwinter\b/.test(lower)) month = 0;
    else month = 6;
  }
  const dayMatch = lower.match(/\b([12]?\d|3[01])\b(?=\s+(?:januari|jan|februari|feb|maart|mrt|april|apr|mei|juni|jun|juli|jul|augustus|aug|september|sep|oktober|okt|november|nov|december|dec)\b)/i);
  const day = dayMatch ? Math.max(1, Math.min(28, Number(dayMatch[1]))) : 1;
  return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
}

function withCors(request, response) {
  const origin = request.headers.get('origin') || '';
  const headers = new Headers(response.headers);
  if (TIMELINE_ORIGIN_RE.test(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
    headers.set('access-control-allow-methods', 'GET,PUT,OPTIONS');
    headers.set('access-control-allow-headers', 'authorization,content-type');
    headers.set('access-control-max-age', '600');
  }
  headers.set('cache-control', headers.get('cache-control') || 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
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
