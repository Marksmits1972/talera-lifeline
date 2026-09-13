import { normalizeStoryInput, normalizeStoryPatch } from './domain.js';
import { issueStoryCapabilities } from './security.js';
import {
  authorizeStory,
  createStoryRecord,
  currentAudio,
  getStory,
  replaceCurrentAudio,
  updateStoryRecord,
} from './repository.js';
import { audioResponse, storeExactAudio } from './audio-store.js';

const APP = 'talera-core-v1';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (request.method === 'OPTIONS') return cors(request, env, new Response(null, { status: 204 }));
      const response = await route(request, env, url);
      return cors(request, env, response);
    } catch (error) {
      console.error('TALERA Core error', error);
      const status = Number(error?.status || 500);
      return cors(request, env, json({
        error: status >= 500 ? 'Er ging iets mis in TALERA Core.' : String(error?.message || 'Ongeldige aanvraag.'),
        field: error?.field || undefined,
      }, status));
    }
  },
};

async function route(request, env, url) {
  if (request.method === 'GET' && url.pathname === '/api/v1/health') {
    return json({
      ok: true,
      app: APP,
      databaseBound: Boolean(env.DB),
      mediaBound: Boolean(env.MEDIA),
    });
  }

  if (!env.DB) return json({ error: 'Databasebinding DB ontbreekt.' }, 503);

  if (request.method === 'POST' && url.pathname === '/api/v1/stories') {
    return createStory(request, env);
  }

  const storyMatch = url.pathname.match(/^\/api\/v1\/stories\/([A-Za-z0-9_-]{10,80})$/);
  if (storyMatch && request.method === 'GET') return readStory(request, env, storyMatch[1]);
  if (storyMatch && request.method === 'PATCH') return updateStory(request, env, storyMatch[1]);

  const audioMatch = url.pathname.match(/^\/api\/v1\/stories\/([A-Za-z0-9_-]{10,80})\/audio$/);
  if (audioMatch && request.method === 'POST') return uploadAudio(request, env, audioMatch[1]);
  if (audioMatch && (request.method === 'GET' || request.method === 'HEAD')) return readAudio(request, env, audioMatch[1]);

  return json({ error: 'Niet gevonden.' }, 404);
}

async function createStory(request, env) {
  const payload = await readJson(request);
  const story = normalizeStoryInput(payload);
  const capabilities = await issueStoryCapabilities();
  const created = await createStoryRecord(env, story, capabilities);

  return json({
    storyId: created.storyId,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    revision: created.revision,
    ownerToken: capabilities.ownerToken,
    readerToken: capabilities.readerToken,
  }, 201);
}

async function readStory(request, env, storyId) {
  const auth = await authorizeStory(env, request, storyId, 'read');
  if (!auth.ok) return json({ error: auth.message }, auth.status);

  const row = await getStory(env, storyId);
  if (!row) return json({ error: 'Herinnering niet gevonden.' }, 404);
  const audio = await currentAudio(env, storyId);

  return json({
    storyId: row.id,
    title: row.title,
    eventTimeText: row.event_time_text,
    eventAt: row.event_at,
    eventTimePrecision: row.event_time_precision,
    storyText: row.story_text || '',
    displayName: row.display_name || '',
    revision: Number(row.revision || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasAudio: Boolean(audio),
    audio: audio ? {
      mimeType: audio.mime_type,
      sizeBytes: Number(audio.size_bytes || 0),
      durationSeconds: audio.duration_seconds,
      sha256: audio.sha256,
      url: `/api/v1/stories/${encodeURIComponent(storyId)}/audio`,
    } : null,
  });
}

async function updateStory(request, env, storyId) {
  const auth = await authorizeStory(env, request, storyId, 'edit');
  if (!auth.ok) return json({ error: auth.message }, auth.status);
  const patch = normalizeStoryPatch(await readJson(request));
  const updated = await updateStoryRecord(env, storyId, patch);
  if (!updated) return json({ error: 'Herinnering niet gevonden.' }, 404);
  return json({ ok: true, storyId, revision: updated.revision, updatedAt: updated.updatedAt });
}

async function uploadAudio(request, env, storyId) {
  if (!env.MEDIA) return json({ error: 'Mediabinding MEDIA ontbreekt.' }, 503);
  const auth = await authorizeStory(env, request, storyId, 'edit');
  if (!auth.ok) return json({ error: auth.message }, auth.status);
  if (!(await getStory(env, storyId))) return json({ error: 'Herinnering niet gevonden.' }, 404);

  const form = await request.formData();
  const stored = await storeExactAudio(env, storyId, form.get('audio'), form.get('durationSeconds'));
  let result;
  try {
    result = await replaceCurrentAudio(env, storyId, stored);
  } catch (error) {
    try { await env.MEDIA.delete(stored.objectKey); } catch {}
    throw error;
  }

  if (result.previousObjectKey && result.previousObjectKey !== stored.objectKey) {
    try { await env.MEDIA.delete(result.previousObjectKey); } catch (error) {
      console.warn('Oude TALERA-audio kon niet worden verwijderd', error);
    }
  }

  return json({
    ok: true,
    storyId,
    hasAudio: true,
    audioSizeBytes: stored.sizeBytes,
    audioMimeType: stored.mimeType,
    audioSha256: stored.sha256,
    durationSeconds: stored.durationSeconds,
  }, 201);
}

async function readAudio(request, env, storyId) {
  if (!env.MEDIA) return json({ error: 'Mediabinding MEDIA ontbreekt.' }, 503);
  const auth = await authorizeStory(env, request, storyId, 'listen');
  if (!auth.ok) return json({ error: auth.message }, auth.status);
  const asset = await currentAudio(env, storyId);
  if (!asset) return new Response('Audio niet gevonden.', { status: 404 });
  return audioResponse(request, env, asset);
}

async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const error = new Error('Content-Type application/json is vereist.');
    error.status = 415;
    throw error;
  }
  try {
    return await request.json();
  } catch {
    const error = new Error('Ongeldige JSON.');
    error.status = 400;
    throw error;
  }
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-talera-core': APP,
    },
  });
}

function cors(request, env, response) {
  const origin = request.headers.get('origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const headers = new Headers(response.headers);
  if (origin && allowed.includes(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
    headers.set('access-control-allow-methods', 'GET,HEAD,POST,PATCH,OPTIONS');
    headers.set('access-control-allow-headers', 'authorization,content-type');
    headers.set('access-control-max-age', '600');
  }
  headers.set('x-content-type-options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
