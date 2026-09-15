export async function handleV9StagedPhotoLink(request, env) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/v9\/staged-photo-link\/([A-Za-z0-9_-]{16,80})\/([A-Za-z0-9_-]{20,80})$/);
  if (!match || request.method !== 'POST') return null;
  if (!env.DB || !env.MEDIA) return json({ error:'Opslagbinding ontbreekt.' }, 500);

  const storyId = match[1];
  const photoId = match[2];
  const token = bearer(request.headers.get('authorization'));
  if (!token) return json({ error:'Beheerautorisatie ontbreekt.' }, 401);

  const story = await env.DB.prepare(`
    SELECT id, status, manage_token_hash
    FROM stories
    WHERE id = ? LIMIT 1
  `).bind(storyId).first();
  if (!story || story.status !== 'active') return json({ error:'Herinnering niet gevonden.' }, 404);

  const tokenHash = await sha256Text(token);
  if (!story.manage_token_hash || String(story.manage_token_hash) !== tokenHash) {
    return json({ error:'Je hebt geen toegang om deze foto te koppelen.' }, 403);
  }

  const objectKey = `v9/photo/${photoId}`;
  const head = await env.MEDIA.head(objectKey);
  if (!head || !Number(head.size || 0)) return json({ error:'Klaargezette foto niet gevonden.' }, 404);
  const sha = String(head.customMetadata?.sha256 || '');
  if (!sha) return json({ error:'Klaargezette foto mist opslagbevestiging.' }, 409);
  const mimeType = String(head.httpMetadata?.contentType || 'image/jpeg');
  if (!mimeType.toLowerCase().startsWith('image/')) return json({ error:'Klaargezet bestand is geen afbeelding.' }, 415);

  const existing = await env.DB.prepare(`
    SELECT id, mime_type, size_bytes, role
    FROM story_media
    WHERE story_id = ? AND object_key = ? LIMIT 1
  `).bind(storyId, objectKey).first();
  if (existing?.id) {
    return json({
      ok:true,
      reused:true,
      item:{
        id:existing.id,
        mediaType:'image',
        mimeType:existing.mime_type || mimeType,
        sizeBytes:Number(existing.size_bytes || head.size || 0),
        role:existing.role || 'extra'
      }
    });
  }

  const mediaId = randomToken(12);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO story_media (id, story_id, object_key, mime_type, size_bytes, media_type, role, created_at)
    VALUES (?, ?, ?, ?, ?, 'image', 'extra', ?)
  `).bind(mediaId, storyId, objectKey, mimeType, Number(head.size), now).run();

  const verify = await env.DB.prepare(`
    SELECT id, object_key, mime_type, size_bytes, role
    FROM story_media
    WHERE id = ? AND story_id = ? LIMIT 1
  `).bind(mediaId, storyId).first();
  if (!verify || verify.object_key !== objectKey) {
    return json({ error:'De klaargezette foto kon niet worden teruggecontroleerd.' }, 500);
  }

  return json({
    ok:true,
    reused:false,
    item:{
      id:verify.id,
      mediaType:'image',
      mimeType:verify.mime_type || mimeType,
      sizeBytes:Number(verify.size_bytes || head.size || 0),
      role:verify.role || 'extra'
    }
  }, 201);
}

function bearer(value) {
  const match = String(value || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function randomToken(bytes = 18) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let text = '';
  for (const value of data) text += String.fromCharCode(value);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Text(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers:{
      'content-type':'application/json; charset=UTF-8',
      'cache-control':'no-store, max-age=0'
    }
  });
}
