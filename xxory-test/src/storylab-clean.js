import { STORYLAB_CLEAN_PAGE_HTML, STORYLAB_CLEAN_PAGE_REVISION } from './storylab-clean-page.js';

const htmlHeaders = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-storylab-clean-revision': STORYLAB_CLEAN_PAGE_REVISION
};

const jsonHeaders = { 'cache-control': 'no-store, max-age=0' };
const DEFAULT_STATE = {
  title: '',
  date: '',
  storyText: '',
  note: '',
  photos: [],
  currentIndex: 0,
  fit: 'cover',
  audioId: ''
};

function safeClient(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
}

function safeId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
}

function idFromUrl(url, kind) {
  const queryId = safeId(url.searchParams.get('id'));
  if (queryId) return queryId;
  const prefix = '/api/storylab-clean/' + kind + '&id=';
  if (url.pathname.startsWith(prefix)) {
    return safeId(decodeURIComponent(url.pathname.slice(prefix.length)));
  }
  return null;
}

function cleanState(input) {
  const source = input && typeof input === 'object' ? input : {};
  const photos = Array.isArray(source.photos) ? source.photos.slice(0, 12).map((photo) => ({
    id: safeId(photo?.id) || '',
    name: String(photo?.name || 'foto').slice(0, 180),
    type: String(photo?.type || 'image/jpeg').slice(0, 100),
    createdAt: Number(photo?.createdAt || Date.now())
  })).filter((photo) => photo.id) : [];
  const maxIndex = Math.max(0, photos.length - 1);
  return {
    title: String(source.title || '').slice(0, 140),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(source.date || '')) ? String(source.date) : '',
    storyText: String(source.storyText || '').slice(0, 50000),
    note: String(source.note || '').slice(0, 10000),
    photos,
    currentIndex: Math.min(Math.max(0, Number(source.currentIndex || 0)), maxIndex),
    fit: source.fit === 'contain' ? 'contain' : 'cover',
    audioId: safeId(source.audioId) || ''
  };
}

function stateKey(client) {
  return `storylab-clean/${client}/state.json`;
}

function mediaKey(client, kind, id) {
  return `storylab-clean/${client}/${kind}/${id}`;
}

async function handleState(request, env, url, client) {
  if (request.method === 'GET') {
    const object = await env.MEDIA.get(stateKey(client));
    if (!object) return Response.json(DEFAULT_STATE, { headers: jsonHeaders });
    try {
      return Response.json(cleanState(JSON.parse(await object.text())), { headers: jsonHeaders });
    } catch {
      return Response.json(DEFAULT_STATE, { headers: jsonHeaders });
    }
  }
  if (request.method === 'PUT') {
    let input;
    try { input = await request.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400, headers: jsonHeaders }); }
    const state = cleanState(input);
    await env.MEDIA.put(stateKey(client), JSON.stringify(state), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' }
    });
    return Response.json({ ok: true, state }, { headers: jsonHeaders });
  }
  return new Response('Method not allowed', { status: 405 });
}

async function handleBinary(request, env, url, client, kind, expectedPrefix, maxBytes) {
  const id = idFromUrl(url, kind);
  if (!id) return Response.json({ error: 'invalid_id' }, { status: 400, headers: jsonHeaders });
  const key = mediaKey(client, kind === 'photo' ? 'photos' : 'audio', id);

  if (request.method === 'GET') {
    const object = await env.MEDIA.get(key);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'private, max-age=3600');
    return new Response(object.body, { headers });
  }

  if (request.method === 'DELETE') {
    await env.MEDIA.delete(key);
    return Response.json({ ok: true }, { headers: jsonHeaders });
  }

  if (request.method === 'PUT') {
    const type = request.headers.get('content-type') || '';
    if (!type.startsWith(expectedPrefix)) return Response.json({ error: 'invalid_type' }, { status: 415, headers: jsonHeaders });
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared && declared > maxBytes) return Response.json({ error: 'too_large' }, { status: 413, headers: jsonHeaders });
    const body = await request.arrayBuffer();
    if (body.byteLength > maxBytes) return Response.json({ error: 'too_large' }, { status: 413, headers: jsonHeaders });
    await env.MEDIA.put(key, body, {
      httpMetadata: { contentType: type },
      customMetadata: { originalName: (request.headers.get('x-file-name') || '').slice(0, 300) }
    });
    return Response.json({ ok: true, id, bytes: body.byteLength }, { headers: jsonHeaders });
  }

  return new Response('Method not allowed', { status: 405 });
}

export async function handleStoryLabClean(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/storylab-clean' || url.pathname === '/storylab-clean/') {
    return new Response(STORYLAB_CLEAN_PAGE_HTML, { status: 200, headers: htmlHeaders });
  }

  if (url.pathname === '/api/storylab-clean/revision') {
    return Response.json({
      revision: STORYLAB_CLEAN_PAGE_REVISION,
      phase: 'functional-photo-story-build',
      cleanSlate: true,
      importsLegacyStoryLab: false,
      importsV9: false,
      importsCleanRebuild: false,
      photoSelectionEnabled: true,
      persistentPhotoStorage: 'r2',
      multiplePhotosEnabled: true,
      swipePhotosEnabled: true,
      audioEnabled: true,
      audioPersistence: 'r2',
      transcriptEnabled: false,
      editableStoryText: true,
      timelineEnabled: false
    }, {
      headers: jsonHeaders
    });
  }

  if (url.pathname === '/api/storylab-clean/state' || url.pathname.startsWith('/api/storylab-clean/photo') || url.pathname.startsWith('/api/storylab-clean/audio')) {
    if (!env?.MEDIA) return Response.json({ error: 'media_binding_missing' }, { status: 503, headers: jsonHeaders });
    const client = safeClient(url.searchParams.get('client'));
    if (!client) return Response.json({ error: 'invalid_client' }, { status: 400, headers: jsonHeaders });

    if (url.pathname === '/api/storylab-clean/state') return handleState(request, env, url, client);
    if (url.pathname.startsWith('/api/storylab-clean/photo')) return handleBinary(request, env, url, client, 'photo', 'image/', 20 * 1024 * 1024);
    if (url.pathname.startsWith('/api/storylab-clean/audio')) return handleBinary(request, env, url, client, 'audio', 'audio/', 60 * 1024 * 1024);
  }

  return null;
}
