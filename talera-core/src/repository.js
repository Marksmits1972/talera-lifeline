import { CAPABILITY_SCOPE, STORY_STATUS } from './domain.js';
import { verifyCapability } from './security.js';

export async function createStoryRecord(env, story, capabilityHashes) {
  const now = new Date().toISOString();
  const storyId = randomId(16);
  const ownerCapabilityId = randomId(16);
  const readerCapabilityId = randomId(16);

  const batch = [
    env.DB.prepare(`
      INSERT INTO core_stories (
        id, owner_user_id, title, event_time_text, event_at, event_time_precision,
        story_text, display_name, status, revision, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      storyId,
      story.title,
      story.eventTimeText,
      story.eventAt,
      story.eventTimePrecision,
      story.storyText,
      story.displayName,
      STORY_STATUS.ACTIVE,
      now,
      now,
    ),
    env.DB.prepare(`
      INSERT INTO core_story_capabilities (
        id, story_id, scope, token_hash, created_at, revoked_at
      ) VALUES (?, ?, ?, ?, ?, NULL)
    `).bind(ownerCapabilityId, storyId, CAPABILITY_SCOPE.OWNER, capabilityHashes.ownerHash, now),
    env.DB.prepare(`
      INSERT INTO core_story_capabilities (
        id, story_id, scope, token_hash, created_at, revoked_at
      ) VALUES (?, ?, ?, ?, ?, NULL)
    `).bind(readerCapabilityId, storyId, CAPABILITY_SCOPE.READER, capabilityHashes.readerHash, now),
  ];

  await env.DB.batch(batch);
  return { storyId, createdAt: now, updatedAt: now, revision: 1 };
}

export async function getStory(env, storyId) {
  return env.DB.prepare(`
    SELECT id, owner_user_id, title, event_time_text, event_at, event_time_precision,
      story_text, display_name, status, revision, created_at, updated_at
    FROM core_stories
    WHERE id = ? AND status = ?
    LIMIT 1
  `).bind(storyId, STORY_STATUS.ACTIVE).first();
}

export async function authorizeStory(env, request, storyId, action) {
  const token = readBearer(request);
  if (!token) return { ok: false, status: 401, message: 'Toegangstoken ontbreekt.' };

  const rows = await env.DB.prepare(`
    SELECT scope, token_hash
    FROM core_story_capabilities
    WHERE story_id = ? AND revoked_at IS NULL
  `).bind(storyId).all();

  for (const row of rows.results || []) {
    if (!(await verifyCapability(token, row.token_hash))) continue;
    const allowed = row.scope === CAPABILITY_SCOPE.OWNER ||
      (row.scope === CAPABILITY_SCOPE.READER && (action === 'read' || action === 'listen'));
    if (!allowed) return { ok: false, status: 403, message: 'Deze toegang geeft geen toestemming voor deze handeling.' };
    return { ok: true, scope: row.scope };
  }
  return { ok: false, status: 403, message: 'Geen toegang.' };
}

export async function updateStoryRecord(env, storyId, patch) {
  const current = await getStory(env, storyId);
  if (!current) return null;

  const next = {
    title: patch.title ?? current.title,
    eventTimeText: patch.eventTimeText ?? current.event_time_text,
    eventAt: patch.eventAt ?? current.event_at,
    eventTimePrecision: patch.eventTimePrecision ?? current.event_time_precision,
    storyText: patch.storyText ?? current.story_text,
  };
  const updatedAt = new Date().toISOString();
  const revision = Number(current.revision || 0) + 1;

  await env.DB.prepare(`
    UPDATE core_stories
    SET title = ?, event_time_text = ?, event_at = ?, event_time_precision = ?,
      story_text = ?, revision = ?, updated_at = ?
    WHERE id = ? AND status = ?
  `).bind(
    next.title,
    next.eventTimeText,
    next.eventAt,
    next.eventTimePrecision,
    next.storyText,
    revision,
    updatedAt,
    storyId,
    STORY_STATUS.ACTIVE,
  ).run();

  return { ...next, id: storyId, revision, updatedAt };
}

export async function currentAudio(env, storyId) {
  return env.DB.prepare(`
    SELECT id, story_id, object_key, mime_type, size_bytes, sha256, duration_seconds, created_at
    FROM core_story_audio
    WHERE story_id = ? AND is_current = 1
    LIMIT 1
  `).bind(storyId).first();
}

export async function replaceCurrentAudio(env, storyId, audio) {
  const now = new Date().toISOString();
  const audioId = randomId(16);
  const existing = await currentAudio(env, storyId);

  await env.DB.batch([
    env.DB.prepare(`UPDATE core_story_audio SET is_current = 0, superseded_at = ? WHERE story_id = ? AND is_current = 1`).bind(now, storyId),
    env.DB.prepare(`
      INSERT INTO core_story_audio (
        id, story_id, object_key, mime_type, size_bytes, sha256, duration_seconds,
        is_current, created_at, superseded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NULL)
    `).bind(
      audioId,
      storyId,
      audio.objectKey,
      audio.mimeType,
      audio.sizeBytes,
      audio.sha256,
      audio.durationSeconds,
      now,
    ),
    env.DB.prepare(`UPDATE core_stories SET revision = revision + 1, updated_at = ? WHERE id = ?`).bind(now, storyId),
  ]);

  return { id: audioId, previousObjectKey: existing?.object_key || '', createdAt: now };
}

function readBearer(request) {
  const value = request.headers.get('authorization') || '';
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
}

function randomId(bytes) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
