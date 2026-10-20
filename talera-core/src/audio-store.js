import { LIMITS, audioExtensionForMime, validationError } from './domain.js';
import { sha256Hex } from './security.js';

export async function storeExactAudio(env, storyId, file, durationSeconds) {
  if (!(file instanceof File) || file.size <= 0) throw validationError('audio', 'Geen geluidsopname ontvangen.');
  if (file.size > LIMITS.audioBytes) {
    const error = new Error('Deze geluidsopname is te groot.');
    error.status = 413;
    throw error;
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength !== file.size || bytes.byteLength <= 0) {
    const error = new Error('De ontvangen audiobytes zijn niet compleet.');
    error.status = 400;
    throw error;
  }

  const mimeType = String(file.type || 'application/octet-stream');
  const sha256 = await sha256Hex(bytes);
  const objectKey = `core/stories/${storyId}/audio/${Date.now()}-${randomSuffix(8)}.${audioExtensionForMime(mimeType)}`;

  await env.MEDIA.put(objectKey, bytes, {
    httpMetadata: { contentType: mimeType, cacheControl: 'private, max-age=0' },
    customMetadata: {
      storyId,
      sha256,
      originalBytes: String(bytes.byteLength),
      role: 'story-audio',
    },
  });

  const head = await env.MEDIA.head(objectKey);
  const storedBytes = Number(head?.size || 0);
  const storedSha = String(head?.customMetadata?.sha256 || '');
  if (!head || storedBytes !== bytes.byteLength || storedSha !== sha256) {
    try { await env.MEDIA.delete(objectKey); } catch {}
    const error = new Error('De geluidsopname kon niet byte-voor-byte worden bevestigd.');
    error.status = 502;
    throw error;
  }

  return {
    objectKey,
    mimeType: head.httpMetadata?.contentType || mimeType,
    sizeBytes: storedBytes,
    sha256,
    durationSeconds: normalizeDuration(durationSeconds),
  };
}

export async function audioResponse(request, env, asset) {
  if (!asset?.object_key) return new Response('Audio niet gevonden.', { status: 404 });

  if (request.method === 'HEAD') {
    const head = await env.MEDIA.head(asset.object_key);
    if (!head) return new Response(null, { status: 404 });
    return new Response(null, { status: 200, headers: buildHeaders(head, asset) });
  }

  const object = await env.MEDIA.get(asset.object_key);
  if (!object) return new Response('Audio niet gevonden.', { status: 404 });
  return new Response(object.body, { status: 200, headers: buildHeaders(object, asset) });
}

function buildHeaders(object, asset) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set('content-type', asset.mime_type || headers.get('content-type') || 'application/octet-stream');
  headers.set('content-length', String(object.size || asset.size_bytes || 0));
  headers.set('cache-control', 'private, max-age=0, no-store');
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  if (asset.sha256) headers.set('x-talera-audio-sha256', asset.sha256);
  return headers;
}

function normalizeDuration(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function randomSuffix(bytes) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map((value) => value.toString(16).padStart(2, '0')).join('');
}
