export async function handleStoryPhotoCleanup(request, env) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/v9\/story-photo\/([A-Za-z0-9_-]{16,80})\/([A-Za-z0-9_-]{12,80})$/);
  if (!match || request.method !== 'DELETE') return null;
  if (!env.DB || !env.MEDIA) return json({ error:'Opslagbinding ontbreekt.' }, 500);

  const storyId = match[1];
  const mediaId = match[2];
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
    return json({ error:'Je hebt geen toegang om deze foto te verwijderen.' }, 403);
  }

  const media = await env.DB.prepare(`
    SELECT id, object_key, media_type, role
    FROM story_media
    WHERE id = ? AND story_id = ? LIMIT 1
  `).bind(mediaId, storyId).first();
  if (!media) return json({ error:'Foto niet gevonden.' }, 404);
  if (media.media_type !== 'image') return json({ error:'Alleen foto’s kunnen via deze route worden verwijderd.' }, 415);

  const now = new Date().toISOString();
  await env.DB.prepare(`DELETE FROM story_media WHERE id = ? AND story_id = ?`).bind(mediaId, storyId).run();

  let promoted = null;
  if (media.role === 'start') {
    promoted = await env.DB.prepare(`
      SELECT id, object_key
      FROM story_media
      WHERE story_id = ? AND media_type = 'image'
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `).bind(storyId).first();
    if (promoted?.id) {
      await env.DB.prepare(`UPDATE story_media SET role = 'start' WHERE id = ? AND story_id = ?`).bind(promoted.id, storyId).run();
      await env.DB.prepare(`UPDATE stories SET start_photo_key = ?, updated_at = ? WHERE id = ?`).bind(promoted.object_key, now, storyId).run();
    } else {
      await env.DB.prepare(`UPDATE stories SET start_photo_key = NULL, updated_at = ? WHERE id = ?`).bind(now, storyId).run();
    }
  } else {
    await env.DB.prepare(`UPDATE stories SET updated_at = ? WHERE id = ?`).bind(now, storyId).run();
  }

  try { await env.MEDIA.delete(media.object_key); }
  catch (error) { console.warn('[TALERA PHOTO CLEANUP] orphaned media object', media.object_key, error); }

  const countRow = await env.DB.prepare(`
    SELECT COUNT(*) AS count
    FROM story_media
    WHERE story_id = ? AND media_type = 'image'
  `).bind(storyId).first();

  return json({
    ok:true,
    storyId,
    removedMediaId:mediaId,
    promotedMediaId:promoted?.id || null,
    remainingPhotoCount:Number(countRow?.count || 0)
  });
}

// De oude geïnjecteerde mini-UI gebruikte window.confirm()/alert() en reloadde
// het hele werkblad. Beheer v2 is nu de enige UI-owner voor fotoverwijdering.
export const WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT = '';

function bearer(value) {
  const match = String(value || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
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
