const TIMELINE_ORIGIN = 'https://talera-timeline-prototype.mark-a39.workers.dev';

export async function handleV9TimelinePublish(request, env) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/v9\/timeline-publish\/([A-Za-z0-9_-]{16,80})$/);
  if (!match || request.method !== 'POST') return null;
  if (!env.DB || !env.MEDIA) return json({ error: 'Opslagbinding ontbreekt.' }, 500);

  const memoryId = match[1];
  await ensureLinkTable(env);

  const existing = await env.DB.prepare(`
    SELECT memory_id, story_id, manage_token
    FROM v9_timeline_links
    WHERE memory_id = ? LIMIT 1
  `).bind(memoryId).first();
  if (existing?.story_id && existing?.manage_token) {
    const story = await env.DB.prepare(`SELECT id, status FROM stories WHERE id = ? LIMIT 1`).bind(existing.story_id).first();
    if (story && story.status === 'active') return publishResponse(memoryId, existing.story_id, existing.manage_token, true);
  }

  const row = await env.DB.prepare(`
    SELECT id, created_at, title, event_time_text, story_text,
      audio_id, audio_key, audio_mime_type, audio_size_bytes, audio_sha256,
      photo_id, photo_key, photo_mime_type, photo_size_bytes, photo_sha256
    FROM v9_memories
    WHERE id = ? LIMIT 1
  `).bind(memoryId).first();
  if (!row) return json({ error: 'V9-herinnering niet gevonden.' }, 404);

  const hasAudio = Boolean(String(row.audio_key || '') && Number(row.audio_size_bytes || 0) > 0 && String(row.audio_sha256 || ''));
  let audioHead = null;
  if (hasAudio) {
    audioHead = await env.MEDIA.head(row.audio_key);
    if (!audioHead || Number(audioHead.size || 0) !== Number(row.audio_size_bytes || 0)) {
      return json({ error: 'De bewezen audio kon niet meer exact worden bevestigd.' }, 409);
    }
    const audioSha = String(audioHead.customMetadata?.sha256 || '');
    if (!audioSha || audioSha !== String(row.audio_sha256 || '')) {
      return json({ error: 'De bewezen audio-hash klopt niet meer.' }, 409);
    }
  }

  let photoHead = null;
  if (row.photo_key) {
    photoHead = await env.MEDIA.head(row.photo_key);
    if (!photoHead || Number(photoHead.size || 0) !== Number(row.photo_size_bytes || 0)) {
      return json({ error: 'De bewezen foto kon niet meer exact worden bevestigd.' }, 409);
    }
    const photoSha = String(photoHead.customMetadata?.sha256 || '');
    if (!photoSha || photoSha !== String(row.photo_sha256 || '')) {
      return json({ error: 'De bewezen foto-hash klopt niet meer.' }, 409);
    }
  }

  const storyId = randomToken(16);
  const manageToken = randomToken(32);
  const manageTokenHash = await sha256Text(manageToken);
  const now = new Date().toISOString();
  const mediaId = row.photo_key ? randomToken(12) : null;

  const statements = [
    env.DB.prepare(`
      INSERT INTO stories (
        id, created_at, audio_object_key, audio_mime_type, audio_size_bytes,
        duration_seconds, display_name, manage_token_hash, status,
        source_mode, start_photo_key, updated_at, title, event_time_text, event_time_precision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, 'gebruiker')
    `).bind(
      storyId,
      row.created_at || now,
      hasAudio ? row.audio_key : '',
      hasAudio ? (row.audio_mime_type || audioHead?.httpMetadata?.contentType || 'application/octet-stream') : '',
      hasAudio ? Number(audioHead?.size || row.audio_size_bytes || 0) : 0,
      null,
      null,
      manageTokenHash,
      'workblad-v9',
      row.photo_key || null,
      now,
      row.title || '',
      row.event_time_text || ''
    ),
    env.DB.prepare(`
      INSERT INTO story_texts (story_id, text_content) VALUES (?, ?)
    `).bind(storyId, row.story_text || ''),
    env.DB.prepare(`
      INSERT INTO v9_timeline_links (memory_id, story_id, manage_token, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(memoryId, storyId, manageToken, now)
  ];

  if (row.photo_key && mediaId) {
    statements.splice(2, 0,
      env.DB.prepare(`
        INSERT INTO story_media (id, story_id, object_key, mime_type, size_bytes, media_type, role, created_at)
        VALUES (?, ?, ?, ?, ?, 'image', 'start', ?)
      `).bind(
        mediaId,
        storyId,
        row.photo_key,
        row.photo_mime_type || photoHead?.httpMetadata?.contentType || 'image/jpeg',
        Number(photoHead?.size || row.photo_size_bytes || 0),
        now
      )
    );
  }

  try {
    await env.DB.batch(statements);
  } catch (error) {
    console.error('TALERA v9 timeline publish failed', error);
    return json({ error: 'De herinnering is veilig opgeslagen, maar kon nog niet aan de tijdlijn worden gekoppeld.' }, 500);
  }

  const verify = await env.DB.prepare(`
    SELECT st.id, st.status, st.audio_object_key, st.title, st.event_time_text,
      tx.text_content
    FROM stories st
    LEFT JOIN story_texts tx ON tx.story_id = st.id
    WHERE st.id = ? LIMIT 1
  `).bind(storyId).first();
  const audioMatches = hasAudio ? verify?.audio_object_key === row.audio_key : !String(verify?.audio_object_key || '');
  if (!verify || verify.status !== 'active' || !audioMatches) {
    return json({ error: 'De tijdlijnkoppeling kon niet worden teruggecontroleerd.' }, 500);
  }

  return publishResponse(memoryId, storyId, manageToken, false);
}

async function ensureLinkTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS v9_timeline_links (
      memory_id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      manage_token TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
}

function publishResponse(memoryId, storyId, manageToken, reused) {
  const handoffUrl = `${TIMELINE_ORIGIN}/#story=${encodeURIComponent(storyId)}&token=${encodeURIComponent(manageToken)}`;
  return json({ ok: true, memoryId, storyId, manageToken, handoffUrl, reused });
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let text = '';
  for (const b of data) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Text(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, max-age=0'
    }
  });
}
