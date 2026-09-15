export const WORKBLAD_PHOTO_STAGING_SCRIPT = String.raw`<script id="talera-workblad-photo-staging">
(() => {
  if (window.__taleraPhotoStaging) return;

  const REV = 'photo-background-staging-20260915-r2';
  const cache = new WeakMap();
  const transportFetch = window.fetch.bind(window);
  const originalOptimizer = typeof window.__taleraOptimizePhoto === 'function'
    ? window.__taleraOptimizePhoto.bind(window)
    : null;
  let pendingCount = 0;
  let readyTimer = 0;

  function absoluteUrl(input) {
    try { return new URL(typeof input === 'string' ? input : input.url, location.href); }
    catch { return null; }
  }

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'content-type':'application/json; charset=utf-8',
        'cache-control':'no-store, max-age=0',
        'x-talera-photo-staging':REV
      }
    });
  }

  function ensureProgressStyle() {
    if (document.getElementById('talera-photo-stage-style')) return;
    const style = document.createElement('style');
    style.id = 'talera-photo-stage-style';
    style.textContent = '@keyframes taleraPhotoStageSpin{to{transform:rotate(360deg)}}.talera-photo-stage{display:flex;align-items:center;gap:9px;margin:10px 0;padding:10px 12px;border-radius:15px;background:#eef4f7;color:#17385e;font:690 12px/1.35 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}.talera-photo-stage.ready{background:#e8f3ed;color:#2c684e}.talera-photo-stage-spin{width:17px;height:17px;flex:0 0 auto;border:2.5px solid rgba(23,56,94,.20);border-top-color:#17385e;border-radius:50%;animation:taleraPhotoStageSpin .8s linear infinite}';
    document.head.appendChild(style);
  }

  function progressNode() {
    let node = document.getElementById('talera-photo-stage');
    const sheet = document.querySelector('.work-sheet');
    if (!sheet) return null;
    if (!node) {
      ensureProgressStyle();
      node = document.createElement('div');
      node.id = 'talera-photo-stage';
      node.className = 'talera-photo-stage';
      const tools = sheet.querySelector('.work-tools');
      if (tools) sheet.insertBefore(node, tools);
      else sheet.appendChild(node);
    }
    return node;
  }

  function renderProgress(mode = 'busy') {
    clearTimeout(readyTimer);
    if (pendingCount > 0) {
      const node = progressNode();
      if (!node) return;
      node.className = 'talera-photo-stage';
      node.innerHTML = '<span class="talera-photo-stage-spin" aria-hidden="true"></span><span>' + (pendingCount === 1 ? 'Foto wordt veilig klaargezet…' : pendingCount + ' foto’s worden veilig klaargezet…') + '</span>';
      return;
    }
    const node = document.getElementById('talera-photo-stage');
    if (!node) return;
    if (mode === 'ready') {
      node.className = 'talera-photo-stage ready';
      node.textContent = '✓ Foto’s staan veilig klaar. Je kunt gewoon verder.';
      readyTimer = setTimeout(() => node.remove(), 1100);
    } else {
      node.remove();
    }
  }

  async function sha256(blob) {
    const bytes = await blob.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength !== blob.size) throw new Error('Fotobytes konden niet volledig worden gelezen.');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  }

  async function uploadAndVerify(blob) {
    if (!(blob instanceof Blob) || !blob.size) throw new Error('Geen foto om klaar te zetten.');
    const localSha = await sha256(blob);
    const form = new FormData();
    form.append('photo', blob, blob.name || 'herinnering.jpg');
    const response = await transportFetch('/api/v9/photo', { method:'POST', body:form, cache:'no-store' });
    let data = null;
    try { data = await response.json(); } catch {}
    if (!response.ok || !data?.ok || !data?.id || !data?.playbackUrl) {
      throw new Error(data?.error || ('Foto klaarzetten mislukt (HTTP ' + response.status + ').'));
    }

    const stored = await transportFetch(data.playbackUrl, { cache:'no-store' });
    if (!stored.ok) throw new Error('Klaargezette foto kon niet worden teruggelezen.');
    const serverBlob = await stored.blob();
    const serverSha = await sha256(serverBlob);
    if (serverBlob.size !== blob.size || serverSha !== localSha || String(data.sha256 || '') !== localSha) {
      throw new Error('Klaargezette foto kwam niet byte/hash-gelijk terug.');
    }
    return data;
  }

  function stage(blob) {
    if (!(blob instanceof Blob) || !blob.size) return Promise.reject(new Error('Geen foto om klaar te zetten.'));
    const existing = cache.get(blob);
    if (existing?.promise) return existing.promise;
    const entry = {};
    pendingCount += 1;
    renderProgress('busy');
    entry.promise = uploadAndVerify(blob).then(data => {
      entry.data = data;
      return data;
    }).catch(error => {
      cache.delete(blob);
      throw error;
    }).finally(() => {
      pendingCount = Math.max(0, pendingCount - 1);
      renderProgress(pendingCount ? 'busy' : 'ready');
    });
    cache.set(blob, entry);
    return entry.promise;
  }

  function stageQuietly(blob) {
    stage(blob).catch(error => console.warn('[TALERA PHOTO STAGING]', 'background staging deferred', error));
  }

  if (originalOptimizer) {
    window.__taleraOptimizePhoto = async function(file) {
      const prepared = await originalOptimizer(file);
      const result = prepared || file;
      if (result instanceof Blob && result.size) stageQuietly(result);
      return result;
    };
  }

  function makeFetchWrapper(downstreamFetch) {
    return async function(input, init = {}) {
      const url = absoluteUrl(input);
      const method = String(init.method || (input && input.method) || 'GET').toUpperCase();
      const body = init.body;
      if (!url || url.origin !== location.origin) return downstreamFetch(input, init);

      if (method === 'POST' && url.pathname === '/api/v9/photo' && body instanceof FormData) {
        const photo = body.get('photo');
        if (photo instanceof Blob && photo.size && cache.has(photo)) {
          try {
            const data = await stage(photo);
            return jsonResponse(data, 201);
          } catch (error) {
            console.warn('[TALERA PHOTO STAGING]', 'verified staging reuse failed; normal upload remains available', error);
          }
        }
      }

      const mediaMatch = url.pathname.match(/^\/api\/stories\/([^/]+)\/media$/);
      if (method === 'POST' && mediaMatch && body instanceof FormData) {
        const photos = body.getAll('media').filter(item => item instanceof Blob && item.size);
        if (photos.length && photos.every(photo => cache.has(photo))) {
          try {
            const authorization = new Headers(init.headers || {}).get('authorization') || '';
            const storyId = decodeURIComponent(mediaMatch[1]);
            const items = [];
            for (const photo of photos) {
              const staged = await stage(photo);
              const link = await transportFetch('/api/v9/staged-photo-link/' + encodeURIComponent(storyId) + '/' + encodeURIComponent(staged.id), {
                method:'POST',
                headers:{ authorization },
                cache:'no-store'
              });
              let result = null;
              try { result = await link.json(); } catch {}
              if (!link.ok || !result?.ok || !result?.item) throw new Error(result?.error || 'Klaargezette foto kon niet aan het verhaal worden gekoppeld.');
              items.push(result.item);
            }
            return jsonResponse({ ok:true, items, count:items.length, staged:true }, 201);
          } catch (error) {
            console.warn('[TALERA PHOTO STAGING]', 'staged attach failed; normal media upload remains available', error);
          }
        }
      }

      return downstreamFetch(input, init);
    };
  }

  function armFetch() {
    const downstream = window.fetch.bind(window);
    window.fetch = makeFetchWrapper(downstream);
  }

  new MutationObserver(() => { if (pendingCount > 0) renderProgress('busy'); }).observe(document.documentElement, {subtree:true, childList:true});
  armFetch();
  window.__taleraPhotoStaging = Object.freeze({
    revision:REV,
    stage,
    has(blob){ return cache.has(blob); },
    pending(){ return pendingCount; },
    rearmFetch:armFetch
  });
})();
</script>`;

export const WORKBLAD_PHOTO_STAGING_REARM_SCRIPT = String.raw`<script id="talera-workblad-photo-staging-rearm">window.__taleraPhotoStaging?.rearmFetch?.();</script>`;
