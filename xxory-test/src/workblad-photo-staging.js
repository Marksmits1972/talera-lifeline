export const WORKBLAD_PHOTO_STAGING_SCRIPT = String.raw`<script id="talera-workblad-photo-staging">
(() => {
  if (window.__taleraPhotoStaging) return;

  const REV = 'photo-background-staging-20260915-r1';
  const cache = new WeakMap();
  const transportFetch = window.fetch.bind(window);
  const originalOptimizer = typeof window.__taleraOptimizePhoto === 'function'
    ? window.__taleraOptimizePhoto.bind(window)
    : null;

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
    entry.promise = uploadAndVerify(blob).then(data => {
      entry.data = data;
      return data;
    }).catch(error => {
      cache.delete(blob);
      throw error;
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

  armFetch();
  window.__taleraPhotoStaging = Object.freeze({
    revision:REV,
    stage,
    has(blob){ return cache.has(blob); },
    rearmFetch:armFetch
  });
})();
</script>`;

export const WORKBLAD_PHOTO_STAGING_REARM_SCRIPT = String.raw`<script id="talera-workblad-photo-staging-rearm">window.__taleraPhotoStaging?.rearmFetch?.();</script>`;
