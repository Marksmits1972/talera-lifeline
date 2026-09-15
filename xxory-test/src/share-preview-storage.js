const MAX_BYTES = 900_000;
const TOKEN_PATTERN = /^[a-f0-9]{32}$/;

export async function handleSharePreviewStorage(request, env) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/integration\/share-preview/, '/api/share-preview');
  if (!route.startsWith('/api/share-preview')) return null;
  const bucket = env && (env.SHARE_PREVIEWS || env.MEDIA);
  if (!bucket) return text('Preview-opslag niet beschikbaar', 503);

  if (route === '/api/share-preview' && request.method === 'POST') {
    const statedSize = Number(request.headers.get('content-length')) || 0;
    if (statedSize > MAX_BYTES + 100_000) return text('Preview te groot', 413);

    let form;
    try { form = await request.formData(); }
    catch { return text('Ongeldige preview', 400); }

    const image = form.get('image');
    if (!image || typeof image.arrayBuffer !== 'function' || image.size > MAX_BYTES) {
      return text('Afbeelding ontbreekt', 400);
    }
    if (String(image.type || '').toLowerCase() !== 'image/jpeg') {
      return text('Ongeldig afbeeldingstype', 415);
    }

    const bytes = await image.arrayBuffer();
    const hash = await sha256Bytes(bytes);
    const token = randomHex(16);
    const maxAge = previewLifetime(String(form.get('duration') || '30 dagen'));
    const imageObjectKey = `share-previews/images/${hash}.jpg`;
    const meta = {
      token,
      kind: form.get('kind') === 'timeline' ? 'timeline' : 'story',
      title: cleanText(form.get('title'), 'Een persoonlijke herinnering', 180),
      imageKey: imageObjectKey,
      hasPhoto: form.get('hasPhoto') === '1',
      expiresAt: Date.now() + maxAge * 1000,
    };

    if (!(await bucket.head(imageObjectKey))) {
      await bucket.put(imageObjectKey, bytes, {
        httpMetadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' },
        customMetadata: { role: 'share-preview', createdAt: new Date().toISOString() },
      });
    }
    await bucket.put(inviteKey(token), JSON.stringify(meta), {
      httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'no-store' },
      customMetadata: { role: 'share-invite', expiresAt: String(meta.expiresAt) },
    });

    return json({ token, kind: meta.kind, title: meta.title, hasPhoto: meta.hasPhoto, expiresAt: meta.expiresAt }, 201);
  }

  const match = route.match(/^\/api\/share-preview\/(image|meta)\/([a-f0-9]{32})$/);
  if (!match || (request.method !== 'GET' && request.method !== 'HEAD')) return text('Niet gevonden', 404);

  const meta = await readMeta(bucket, match[2]);
  if (!meta) return text('Preview verlopen', 404);
  if (match[1] === 'meta') {
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(meta), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const object = request.method === 'HEAD' ? await bucket.head(meta.imageKey) : await bucket.get(meta.imageKey);
  if (!object) return text('Preview verlopen', 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-type', headers.get('content-type') || 'image/jpeg');
  headers.set('cache-control', 'public, max-age=86400');
  if (object.httpEtag || object.etag) headers.set('etag', object.httpEtag || object.etag);
  return new Response(request.method === 'HEAD' ? null : object.body, { headers });
}

async function readMeta(bucket, token) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const object = await bucket.get(inviteKey(token));
  if (!object) return null;
  let meta;
  try { meta = JSON.parse(await object.text()); }
  catch { return null; }
  if (!meta || Number(meta.expiresAt) < Date.now()) {
    try { await bucket.delete(inviteKey(token)); } catch {}
    return null;
  }
  return meta;
}

function inviteKey(token) { return `share-previews/invites/${token}.json`; }

function previewLifetime(duration) {
  if (duration === '24 uur') return 24 * 60 * 60;
  if (duration === '7 dagen') return 7 * 24 * 60 * 60;
  return 30 * 24 * 60 * 60;
}

function cleanText(value, fallback, maxLength) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  return (clean || fallback).slice(0, maxLength);
}

function randomHex(bytes) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256Bytes(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function text(value, status) {
  return new Response(value, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}
