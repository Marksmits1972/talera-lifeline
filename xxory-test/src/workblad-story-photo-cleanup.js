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

export const WORKBLAD_STORY_PHOTO_CLEANUP_SCRIPT = String.raw`<script id="talera-story-photo-cleanup">
(() => {
  const panelId = 'talera-story-photo-cleanup-panel';
  let loading = false;
  let objectUrls = [];

  function context() {
    const q = new URLSearchParams(location.search);
    const storyId = q.get('edit') || '';
    if (!storyId) return null;
    const h = new URLSearchParams(String(location.hash || '').replace(/^#/, ''));
    let token = h.get('token') || '';
    if (storyId && token) try { sessionStorage.setItem('talera-edit-token:' + storyId, token); } catch {}
    if (storyId && !token) try { token = sessionStorage.getItem('talera-edit-token:' + storyId) || ''; } catch {}
    return storyId && token ? { storyId, token } : null;
  }

  function ensureStyle() {
    if (document.getElementById('talera-story-photo-cleanup-style')) return;
    const style = document.createElement('style');
    style.id = 'talera-story-photo-cleanup-style';
    style.textContent = '.talera-photo-cleanup{display:grid;gap:8px;padding:10px 11px;border-radius:16px;background:rgba(220,234,246,.44);border:1px solid rgba(15,39,71,.08)}.talera-photo-cleanup-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.talera-photo-cleanup-head strong{font-size:12px;color:#0F2747}.talera-photo-cleanup-head span{font-size:10px;color:#697786}.talera-photo-cleanup-grid{display:flex;gap:7px;overflow-x:auto;padding:2px 1px 4px;-webkit-overflow-scrolling:touch}.talera-photo-cleanup-item{position:relative;flex:0 0 58px;width:58px;height:58px;border-radius:12px;overflow:hidden;background:#ebe8e2;border:1px solid rgba(15,39,71,.10)}.talera-photo-cleanup-item img{display:block;width:100%;height:100%;object-fit:cover}.talera-photo-cleanup-remove{position:absolute;right:3px;top:3px;width:23px;height:23px;border:0;border-radius:50%;display:grid;place-items:center;padding:0;background:rgba(15,39,71,.82);color:#fff;font:800 15px/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;box-shadow:0 2px 8px rgba(15,39,71,.22)}.talera-photo-cleanup-badge{position:absolute;left:3px;bottom:3px;border-radius:999px;padding:3px 5px;background:rgba(255,255,255,.88);color:#0F2747;font:800 7px/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;text-transform:uppercase}.talera-photo-cleanup-empty{font-size:11px;color:#697786}';
    document.head.appendChild(style);
  }

  function revokeUrls() {
    objectUrls.forEach(url => { try { URL.revokeObjectURL(url); } catch {} });
    objectUrls = [];
  }

  async function removePhoto(ctx, item, button) {
    if (!confirm('Deze foto uit deze herinnering verwijderen?')) return;
    button.disabled = true;
    const response = await fetch('/api/v9/story-photo/' + encodeURIComponent(ctx.storyId) + '/' + encodeURIComponent(item.id), {
      method:'DELETE',
      headers:{'authorization':'Bearer ' + ctx.token},
      cache:'no-store'
    });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok || !data?.ok) {
      button.disabled = false;
      alert(data?.error || 'De foto kon niet worden verwijderd.');
      return;
    }
    revokeUrls();
    location.reload();
  }

  async function mount() {
    const ctx = context();
    if (!ctx || loading || document.getElementById(panelId)) return;
    const section = document.querySelector('.work-photo-section');
    if (!section) return;
    loading = true;
    try {
      const response = await fetch('/api/integration/stories/' + encodeURIComponent(ctx.storyId), {
        headers:{'authorization':'Bearer ' + ctx.token},
        cache:'no-store'
      });
      let detail = null;
      try { detail = await response.json(); } catch {}
      if (!response.ok) return;
      const items = Array.isArray(detail?.media) ? detail.media.filter(item => item.mediaType === 'image') : [];
      ensureStyle();
      const panel = document.createElement('div');
      panel.id = panelId;
      panel.className = 'talera-photo-cleanup';
      const head = document.createElement('div');
      head.className = 'talera-photo-cleanup-head';
      head.innerHTML = '<strong>Foto’s in deze herinnering</strong><span>× = verwijderen</span>';
      panel.appendChild(head);
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'talera-photo-cleanup-empty';
        empty.textContent = 'Er staan geen foto’s meer in deze herinnering.';
        panel.appendChild(empty);
      } else {
        const grid = document.createElement('div');
        grid.className = 'talera-photo-cleanup-grid';
        panel.appendChild(grid);
        for (const item of items) {
          try {
            const mediaResponse = await fetch(item.url, { headers:{'authorization':'Bearer ' + ctx.token}, cache:'no-store' });
            if (!mediaResponse.ok) continue;
            const blob = await mediaResponse.blob();
            const src = URL.createObjectURL(blob);
            objectUrls.push(src);
            const tile = document.createElement('div');
            tile.className = 'talera-photo-cleanup-item';
            const img = document.createElement('img');
            img.alt = '';
            img.src = src;
            tile.appendChild(img);
            if (item.role === 'start') {
              const badge = document.createElement('span');
              badge.className = 'talera-photo-cleanup-badge';
              badge.textContent = 'voorop';
              tile.appendChild(badge);
            }
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'talera-photo-cleanup-remove';
            remove.setAttribute('aria-label', 'Foto verwijderen');
            remove.textContent = '×';
            remove.addEventListener('click', event => {
              event.preventDefault();
              event.stopPropagation();
              removePhoto(ctx, item, remove);
            });
            tile.appendChild(remove);
            grid.appendChild(tile);
          } catch {}
        }
      }
      section.insertAdjacentElement('afterend', panel);
    } finally {
      loading = false;
    }
  }

  mount();
  new MutationObserver(() => mount()).observe(document.documentElement, {subtree:true, childList:true});
  addEventListener('pagehide', revokeUrls, {once:true});
})();
</scr`+`ipt>`;

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
