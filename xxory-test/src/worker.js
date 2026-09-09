const APP_NAME = "TALERA Vertel";
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const MAX_STORY_TEXT_CHARS = 20000;

const COLORS = {
  deep: "#0F2747",
  blue: "#5B8FB9",
  light: "#DCEAF6",
  warm: "#E7A98B",
  neutral: "#F7F4EF",
  text: "#3E4A59",
  white: "#FFFFFF",
};

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    audio_object_key TEXT NOT NULL DEFAULT '',
    audio_mime_type TEXT NOT NULL DEFAULT '',
    audio_size_bytes INTEGER NOT NULL DEFAULT 0,
    duration_seconds REAL,
    display_name TEXT,
    manage_token_hash TEXT NOT NULL,
    parent_story_id TEXT,
    parent_share_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    deleted_at TEXT,
    title TEXT,
    event_time_text TEXT,
    place_text TEXT,
    people_text TEXT,
    event_time_precision TEXT,
    source_mode TEXT,
    start_photo_key TEXT,
    updated_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS story_texts (
    story_id TEXT PRIMARY KEY,
    text_content TEXT NOT NULL,
    FOREIGN KEY(story_id) REFERENCES stories(id)
  )`,
  `CREATE TABLE IF NOT EXISTS story_media (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    object_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    media_type TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'extra',
    created_at TEXT NOT NULL,
    FOREIGN KEY(story_id) REFERENCES stories(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_story_media_story_id ON story_media(story_id)`,
  `CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    revoked_at TEXT,
    FOREIGN KEY(story_id) REFERENCES stories(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_shares_story_id ON shares(story_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shares_token_hash ON shares(token_hash)`,
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    event_name TEXT NOT NULL,
    story_id TEXT,
    share_id TEXT,
    anonymous_session_id TEXT,
    detail TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_story_id ON events(story_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_share_id ON events(share_id)`,
  `CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name)`,
];

const ALTER_STATEMENTS = [
  `ALTER TABLE stories ADD COLUMN title TEXT`,
  `ALTER TABLE stories ADD COLUMN event_time_text TEXT`,
  `ALTER TABLE stories ADD COLUMN place_text TEXT`,
  `ALTER TABLE stories ADD COLUMN people_text TEXT`,
  `ALTER TABLE stories ADD COLUMN event_time_precision TEXT`,
  `ALTER TABLE stories ADD COLUMN source_mode TEXT`,
  `ALTER TABLE stories ADD COLUMN start_photo_key TEXT`,
  `ALTER TABLE stories ADD COLUMN updated_at TEXT`,
];

let schemaPromise = null;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) {
        await ensureSchema(env);
        return await handleApi(request, env, url);
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      return htmlResponse(renderAppHtml());
    } catch (error) {
      console.error("TALERA worker error", error);
      if (new URL(request.url).pathname.startsWith("/api/")) {
        return json({ error: "Er ging iets mis. Probeer het opnieuw." }, 500);
      }
      return htmlResponse(renderAppHtml(), 200);
    }
  },
};

async function ensureSchema(env) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const statement of SCHEMA_STATEMENTS) await env.DB.prepare(statement).run();
      for (const statement of ALTER_STATEMENTS) {
        try { await env.DB.prepare(statement).run(); } catch (error) {
          const message = String(error?.message || error);
          if (!/duplicate column name/i.test(message)) throw error;
        }
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function handleApi(request, env, url) {
  const { pathname } = url;
  if (request.method === "GET" && pathname === "/api/health") {
    return json({ ok: true, app: APP_NAME, database: "connected", media: "connected" });
  }
  if (request.method === "POST" && pathname === "/api/stories") return createStory(request, env);

  const meta = pathname.match(/^\/api\/stories\/([^/]+)\/metadata$/);
  if (meta && request.method === "PUT") return updateMetadata(request, env, meta[1]);

  const media = pathname.match(/^\/api\/stories\/([^/]+)\/media$/);
  if (media && request.method === "POST") return addMedia(request, env, media[1]);

  const shareCreate = pathname.match(/^\/api\/stories\/([^/]+)\/share$/);
  if (shareCreate && request.method === "POST") return createShare(request, env, shareCreate[1], url);

  const shareMeta = pathname.match(/^\/api\/s\/([^/]+)$/);
  if (shareMeta && request.method === "GET") return getSharedStory(env, shareMeta[1]);

  const shareAudio = pathname.match(/^\/api\/s\/([^/]+)\/audio$/);
  if (shareAudio && request.method === "GET") return getSharedAudio(request, env, shareAudio[1]);

  if (request.method === "POST" && pathname === "/api/events") return recordEvent(request, env);
  return json({ error: "Niet gevonden." }, 404);
}

async function createStory(request, env) {
  const form = await request.formData();
  const audio = form.get("audio");
  const storyText = cleanText(form.get("storyText"), MAX_STORY_TEXT_CHARS);
  const startPhoto = form.get("startPhoto");
  const sourceMode = cleanText(form.get("sourceMode"), 24) || "voice";
  const hasAudio = audio instanceof File && audio.size > 0;
  const hasText = Boolean(storyText);
  const hasPhoto = startPhoto instanceof File && startPhoto.size > 0;

  if (!hasAudio && !hasText) return json({ error: "Verhaal ontbreekt." }, 400);
  if (hasAudio && audio.size > MAX_AUDIO_BYTES) return json({ error: "Deze opname is te groot." }, 413);
  if (hasPhoto && startPhoto.size > MAX_MEDIA_BYTES) return json({ error: "Deze foto is te groot." }, 413);

  const storyId = randomToken(16);
  const manageToken = randomToken(32);
  const manageTokenHash = await sha256(manageToken);
  const createdAt = new Date().toISOString();
  const displayName = cleanText(form.get("displayName"), 80);
  const duration = hasAudio ? parseOptionalNumber(form.get("durationSeconds")) : null;
  const mimeType = hasAudio ? (audio.type || "application/octet-stream") : "";
  const objectKey = hasAudio ? `stories/${storyId}/audio.${extensionForMime(mimeType)}` : "";
  const startPhotoKey = hasPhoto ? `stories/${storyId}/start-${randomToken(6)}.${extensionForMedia(startPhoto.type)}` : null;

  if (hasAudio) {
    await env.MEDIA.put(objectKey, audio, {
      httpMetadata: { contentType: mimeType },
      customMetadata: { storyId, createdAt, role: "story-audio" },
    });
  }
  if (hasPhoto) {
    await env.MEDIA.put(startPhotoKey, startPhoto, {
      httpMetadata: { contentType: startPhoto.type || "image/jpeg" },
      customMetadata: { storyId, createdAt, role: "start-photo" },
    });
  }

  try {
    await env.DB.prepare(`
      INSERT INTO stories (
        id, created_at, audio_object_key, audio_mime_type, audio_size_bytes,
        duration_seconds, display_name, manage_token_hash, status,
        source_mode, start_photo_key, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).bind(
      storyId, createdAt, objectKey, mimeType, hasAudio ? audio.size : 0,
      duration, displayName, manageTokenHash, sourceMode, startPhotoKey, createdAt
    ).run();

    if (hasText) {
      await env.DB.prepare(`INSERT INTO story_texts (story_id, text_content) VALUES (?, ?)`).bind(storyId, storyText).run();
    }
    if (hasPhoto) {
      await env.DB.prepare(`
        INSERT INTO story_media (id, story_id, object_key, mime_type, size_bytes, media_type, role, created_at)
        VALUES (?, ?, ?, ?, ?, 'image', 'start', ?)
      `).bind(randomToken(12), storyId, startPhotoKey, startPhoto.type || "image/jpeg", startPhoto.size, createdAt).run();
    }
  } catch (error) {
    try { await env.DB.prepare(`DELETE FROM stories WHERE id = ?`).bind(storyId).run(); } catch {}
    if (hasAudio) try { await env.MEDIA.delete(objectKey); } catch {}
    if (hasPhoto) try { await env.MEDIA.delete(startPhotoKey); } catch {}
    throw error;
  }

  const proposal = proposeMetadata(storyText || cleanText(form.get("liveTranscript"), MAX_STORY_TEXT_CHARS) || "");
  await insertEvent(env, "story_saved", storyId, null, cleanText(form.get("sessionId"), 100), JSON.stringify({ sourceMode }));

  return json({ storyId, manageToken, createdAt, proposal }, 201);
}

async function updateMetadata(request, env, storyId) {
  const manageToken = bearerToken(request);
  if (!manageToken) return json({ error: "Beheer-token ontbreekt." }, 401);
  const story = await env.DB.prepare(`SELECT id, manage_token_hash, status FROM stories WHERE id = ?`).bind(storyId).first();
  if (!story || story.status !== "active") return json({ error: "Verhaal niet gevonden." }, 404);
  if (!(await secureHashMatch(manageToken, story.manage_token_hash))) return json({ error: "Geen toegang." }, 403);

  let payload = {};
  try { payload = await request.json(); } catch { return json({ error: "Ongeldige gegevens." }, 400); }
  const title = cleanText(payload.title, 140);
  const eventTime = cleanText(payload.eventTime, 120);
  const place = cleanText(payload.place, 140);
  const people = cleanText(payload.people, 300);
  const precision = cleanText(payload.eventTimePrecision, 40);
  const updatedAt = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE stories
    SET title = ?, event_time_text = ?, place_text = ?, people_text = ?, event_time_precision = ?, updated_at = ?
    WHERE id = ?
  `).bind(title, eventTime, place, people, precision, updatedAt, storyId).run();
  await insertEvent(env, "metadata_confirmed", storyId, null, null, JSON.stringify({ adjusted: Boolean(payload.adjusted) }));
  return json({ ok: true, storyId, updatedAt });
}

async function addMedia(request, env, storyId) {
  const manageToken = bearerToken(request);
  if (!manageToken) return json({ error: "Beheer-token ontbreekt." }, 401);
  const story = await env.DB.prepare(`SELECT id, manage_token_hash, status FROM stories WHERE id = ?`).bind(storyId).first();
  if (!story || story.status !== "active") return json({ error: "Verhaal niet gevonden." }, 404);
  if (!(await secureHashMatch(manageToken, story.manage_token_hash))) return json({ error: "Geen toegang." }, 403);

  const form = await request.formData();
  const files = form.getAll("media").filter((item) => item instanceof File && item.size > 0).slice(0, 12);
  const created = [];
  for (const file of files) {
    if (file.size > MAX_MEDIA_BYTES) continue;
    const isVideo = String(file.type || "").startsWith("video/");
    const isImage = String(file.type || "").startsWith("image/");
    if (!isVideo && !isImage) continue;
    const mediaId = randomToken(12);
    const objectKey = `stories/${storyId}/media/${mediaId}.${extensionForMedia(file.type)}`;
    await env.MEDIA.put(objectKey, file, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { storyId, role: "extra-media" },
    });
    await env.DB.prepare(`
      INSERT INTO story_media (id, story_id, object_key, mime_type, size_bytes, media_type, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'extra', ?)
    `).bind(mediaId, storyId, objectKey, file.type || "application/octet-stream", file.size, isVideo ? "video" : "image", new Date().toISOString()).run();
    created.push({ id: mediaId, mediaType: isVideo ? "video" : "image" });
  }
  await insertEvent(env, "media_added", storyId, null, null, JSON.stringify({ count: created.length }));
  return json({ ok: true, items: created });
}

async function createShare(request, env, storyId, url) {
  const manageToken = bearerToken(request);
  if (!manageToken) return json({ error: "Beheer-token ontbreekt." }, 401);
  const story = await env.DB.prepare(`SELECT id, manage_token_hash, status FROM stories WHERE id = ?`).bind(storyId).first();
  if (!story || story.status !== "active") return json({ error: "Verhaal niet gevonden." }, 404);
  if (!(await secureHashMatch(manageToken, story.manage_token_hash))) return json({ error: "Geen toegang." }, 403);

  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const shareId = randomToken(16);
  const createdAt = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO shares (id, story_id, token_hash, created_at) VALUES (?, ?, ?, ?)`).bind(shareId, storyId, tokenHash, createdAt).run();
  await insertEvent(env, "shared", storyId, shareId, null, null);
  return json({ shareId, shareUrl: `${url.origin}/s/${encodeURIComponent(token)}`, createdAt }, 201);
}

async function getSharedStory(env, token) {
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT s.id AS share_id, s.story_id, s.expires_at, s.revoked_at,
      st.created_at, st.duration_seconds, st.display_name, st.audio_mime_type,
      st.status, st.title, st.event_time_text, st.place_text, st.people_text,
      tx.text_content
    FROM shares s
    JOIN stories st ON st.id = s.story_id
    LEFT JOIN story_texts tx ON tx.story_id = st.id
    WHERE s.token_hash = ? LIMIT 1
  `).bind(tokenHash).first();
  if (!isShareActive(row)) return json({ error: "Deze link is niet meer beschikbaar." }, 404);
  await insertEvent(env, "story_opened", row.story_id, row.share_id, null, null);
  return json({
    shareId: row.share_id,
    storyId: row.story_id,
    createdAt: row.created_at,
    durationSeconds: row.duration_seconds,
    displayName: row.display_name || null,
    title: row.title || null,
    eventTime: row.event_time_text || null,
    place: row.place_text || null,
    people: row.people_text || null,
    storyType: row.text_content ? "text" : "audio",
    textContent: row.text_content || null,
    audioMimeType: row.text_content ? null : row.audio_mime_type,
    audioUrl: row.text_content ? null : `/api/s/${encodeURIComponent(token)}/audio`,
  });
}

async function getSharedAudio(request, env, token) {
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT s.id AS share_id, s.story_id, s.expires_at, s.revoked_at,
      st.audio_object_key, st.audio_mime_type, st.status
    FROM shares s JOIN stories st ON st.id = s.story_id
    WHERE s.token_hash = ? LIMIT 1
  `).bind(tokenHash).first();
  if (!isShareActive(row) || !row.audio_object_key) return new Response("Niet beschikbaar", { status: 404 });
  const object = await env.MEDIA.get(row.audio_object_key, { onlyIf: request.headers, range: request.headers });
  if (!object) return new Response("Audio niet gevonden", { status: 404 });
  if (!("body" in object)) return new Response(null, { status: 412 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", row.audio_mime_type || headers.get("content-type") || "application/octet-stream");
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=300");
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { status: 200, headers });
}

async function recordEvent(request, env) {
  let payload = {};
  try { payload = await request.json(); } catch { return json({ error: "Ongeldig event." }, 400); }
  await insertEvent(env, cleanText(payload.eventName, 80) || "client_event", cleanText(payload.storyId, 100), cleanText(payload.shareId, 100), cleanText(payload.sessionId, 100), payload.detail ? JSON.stringify(payload.detail).slice(0, 1200) : null);
  return json({ ok: true });
}

async function insertEvent(env, eventName, storyId, shareId, sessionId, detail) {
  await env.DB.prepare(`INSERT INTO events (created_at, event_name, story_id, share_id, anonymous_session_id, detail) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(new Date().toISOString(), eventName, storyId, shareId, sessionId, detail).run();
}

function proposeMetadata(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  const sentence = cleaned.split(/[.!?]/).map((x) => x.trim()).find(Boolean) || "";
  const title = sentence ? sentence.split(" ").slice(0, 10).join(" ").replace(/^[a-z]/, (c) => c.toUpperCase()) : "Mijn herinnering";
  const yearMatch = cleaned.match(/\b(19\d{2}|20\d{2})\b/);
  const placeMatch = cleaned.match(/\b(?:in|op|naar)\s+([A-ZÁÉÍÓÚÄËÏÖÜ][\p{L}'-]+(?:\s+[A-ZÁÉÍÓÚÄËÏÖÜ][\p{L}'-]+){0,2})/u);
  const people = [...cleaned.matchAll(/\b(?:met|bij)\s+(?:mijn\s+)?([A-ZÁÉÍÓÚÄËÏÖÜ][\p{L}'-]+)/gu)].map((m) => m[1]).slice(0, 4);
  return {
    title,
    eventTime: yearMatch ? yearMatch[1] : "",
    eventTimePrecision: yearMatch ? "jaar" : "onbekend",
    place: placeMatch ? placeMatch[1] : "",
    people: people.join(", "),
  };
}

function isShareActive(row) {
  if (!row || row.status !== "active" || row.revoked_at) return false;
  if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) return false;
  return true;
}
function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : null;
}
function cleanText(value, maxLength) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}
function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
function extensionForMime(mime) {
  const value = (mime || "").toLowerCase();
  if (value.includes("mp4") || value.includes("m4a")) return "m4a";
  if (value.includes("ogg")) return "ogg";
  if (value.includes("wav")) return "wav";
  if (value.includes("aac")) return "aac";
  return "webm";
}
function extensionForMedia(mime) {
  const value = (mime || "").toLowerCase();
  if (value.includes("png")) return "png";
  if (value.includes("webp")) return "webp";
  if (value.includes("heic")) return "heic";
  if (value.includes("quicktime")) return "mov";
  if (value.includes("mp4")) return "mp4";
  return "jpg";
}
function randomToken(bytes) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return bytesToBase64Url(array);
}
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function secureHashMatch(token, expectedHash) {
  const actualHash = await sha256(token);
  if (!expectedHash || actualHash.length !== expectedHash.length) return false;
  let difference = 0;
  for (let i = 0; i < actualHash.length; i++) difference |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return difference === 0;
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
function htmlResponse(body, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer", "permissions-policy": "camera=(), geolocation=(), microphone=(self)" } });
}

function renderAppHtml() {
  return `<!doctype html>
<html lang="nl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="${COLORS.neutral}"><meta name="robots" content="noindex,nofollow"><title>TALERA — Vertel</title>
<style>
:root{--deep:${COLORS.deep};--blue:${COLORS.blue};--light:${COLORS.light};--warm:${COLORS.warm};--neutral:${COLORS.neutral};--text:${COLORS.text};--white:${COLORS.white};--voice:0;--awake:0}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--neutral);color:var(--deep)}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}button,input,textarea{font:inherit}button{-webkit-tap-highlight-color:transparent}.app{min-height:100dvh;display:grid;place-items:stretch}.stage{position:relative;min-height:100dvh;overflow:hidden;display:grid;grid-template-rows:auto 1fr auto;padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 38%,#fff 0,#fbfaf7 38%,var(--neutral) 72%)}
.top{display:flex;justify-content:center;align-items:center;min-height:38px;z-index:5}.brand{font-weight:650;letter-spacing:.18em;font-size:17px;color:var(--deep)}.main{min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;position:relative;z-index:3}.bottom{display:grid;gap:10px;z-index:5;max-width:520px;width:100%;margin:0 auto}.muted{color:var(--text);opacity:.72;text-align:center;line-height:1.5}.tiny{font-size:13px}.title{font-size:clamp(28px,8vw,42px);line-height:1.08;letter-spacing:-.035em;text-align:center;margin:0;max-width:520px}.btn{border:0;border-radius:18px;min-height:54px;padding:0 20px;font-weight:650}.primary{background:var(--deep);color:white}.secondary{background:rgba(255,255,255,.74);color:var(--deep);box-shadow:inset 0 0 0 1px rgba(15,39,71,.10);backdrop-filter:blur(12px)}.ghost{background:transparent;color:var(--text)}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.single{display:grid;grid-template-columns:1fr}.hidden{display:none!important}
.core-wrap{width:min(58vw,250px);aspect-ratio:1;display:grid;place-items:center;position:relative;transition:transform .8s cubic-bezier(.2,.8,.2,1),margin .5s ease}.core-wrap.photo-mode{transform:translateY(-8vh) scale(.88)}.halo{position:absolute;width:126%;height:126%;border-radius:48% 52% 46% 54%/53% 47% 55% 45%;background:radial-gradient(circle,rgba(220,234,246,.62),rgba(220,234,246,.18) 52%,transparent 72%);filter:blur(8px);opacity:.8}.core{width:78%;height:78%;position:relative;border-radius:47% 53% 50% 50%/50% 44% 56% 50%;background:radial-gradient(circle at 35% 30%,#f8fcff 0%,var(--light) 34%,var(--blue) 74%,var(--deep) 132%);box-shadow:0 28px 70px rgba(15,39,71,.12),inset -16px -18px 34px rgba(15,39,71,.10),inset 14px 12px 34px rgba(255,255,255,.56);animation:sleep 5.8s ease-in-out infinite;transform:scale(calc(1 + var(--awake)*.15 + var(--voice)*.055));transition:transform .16s linear,filter .3s ease}.core::before,.core::after{content:"";position:absolute;border-radius:50%;background:rgba(255,255,255,.22);filter:blur(10px)}.core::before{width:38%;height:30%;left:17%;top:18%;transform:rotate(-20deg)}.core::after{width:21%;height:18%;right:17%;bottom:24%;opacity:.18}.core.active{animation:none}.core.listening{filter:saturate(1.06) brightness(1.02)}@keyframes sleep{0%,100%{transform:scale(.975)}50%{transform:scale(1.015)}}
.photo-layer{position:absolute;inset:0;z-index:1;background:#111;opacity:0;transition:opacity .45s ease}.photo-layer.visible{opacity:1}.photo-layer img{width:100%;height:100%;object-fit:cover;display:block}.photo-layer::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,39,71,.12),rgba(15,39,71,.02) 45%,rgba(15,39,71,.24));pointer-events:none}.stage.has-photo{background:#111}.stage.has-photo .top,.stage.has-photo .main,.stage.has-photo .bottom{color:white}.stage.has-photo .brand{color:white;text-shadow:0 1px 12px rgba(0,0,0,.28)}.stage.has-photo .secondary{background:rgba(247,244,239,.82);color:var(--deep)}.stage.has-photo .ghost{color:white;text-shadow:0 1px 12px rgba(0,0,0,.3)}
.status{min-height:28px;font-size:15px;color:var(--text);opacity:.78;text-align:center}.stage.has-photo .status{color:white}.one-control{min-height:58px;display:grid;place-items:center}.pill{border:1px solid rgba(15,39,71,.12);background:rgba(255,255,255,.62);backdrop-filter:blur(12px);color:var(--deep);border-radius:999px;min-width:142px;min-height:48px;padding:0 24px;font-weight:650;transition:opacity .2s ease,transform .2s ease}.stage.has-photo .pill{background:rgba(247,244,239,.84)}
.processing{width:76px;height:76px;border-radius:50%;border:2px solid rgba(91,143,185,.18);border-top-color:var(--blue);animation:spin 1.1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.summary{width:min(100%,520px);display:grid;gap:10px}.summary-card{background:rgba(255,255,255,.8);border-radius:22px;padding:18px 18px 16px;box-shadow:inset 0 0 0 1px rgba(15,39,71,.08);text-align:left}.summary-label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--blue);font-weight:700;margin-bottom:6px}.summary-value{font-size:18px;line-height:1.35;color:var(--deep);min-height:24px}.summary-value.empty{opacity:.45}.edit-grid{width:min(100%,520px);display:grid;gap:12px}.field{display:grid;gap:7px;text-align:left}.field label{font-size:13px;font-weight:700;color:var(--deep)}.field input{min-height:52px;border-radius:16px;border:1px solid rgba(15,39,71,.12);background:white;padding:0 14px;color:var(--deep);outline:none}.field input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(91,143,185,.14)}
.media-box{width:min(100%,520px);border:1px dashed rgba(15,39,71,.2);border-radius:22px;padding:22px;text-align:center;background:rgba(255,255,255,.52)}.share-overlay{position:fixed;inset:auto 16px max(16px,env(safe-area-inset-bottom));z-index:20;background:rgba(247,244,239,.96);backdrop-filter:blur(18px);border-radius:24px;padding:18px;box-shadow:0 22px 60px rgba(15,39,71,.2);display:grid;gap:14px;max-width:520px;margin:auto;color:var(--deep)}.share-overlay h3{margin:0;font-size:22px}.share-overlay p{margin:0;color:var(--text);line-height:1.45}.saved{width:82px;height:82px;border-radius:50%;display:grid;place-items:center;background:var(--light);color:var(--deep);font-size:34px}.error{background:#fff1ef;color:#8f3a31;border-radius:16px;padding:12px 14px;width:100%;max-width:520px}.text-editor{width:min(100%,520px);min-height:40dvh;border:0;outline:0;background:transparent;color:var(--deep);font-size:19px;line-height:1.65;resize:none;padding:12px 4px}.text-editor::placeholder{color:rgba(62,74,89,.45)}
@media(min-width:700px){.stage{max-width:620px;margin:0 auto;box-shadow:0 0 0 1px rgba(15,39,71,.04),0 20px 80px rgba(15,39,71,.08)}}
</style></head><body><div id="app"></div>
<script>
const app=document.querySelector('#app');
const state={view:'entry',photo:null,photoUrl:null,stream:null,recorder:null,chunks:[],audioBlob:null,startedAt:0,duration:0,hasSpeech:false,lastSpeechAt:0,voice:0,silenceTimer:null,raf:null,context:null,analyser:null,source:null,storyId:null,manageToken:null,proposal:null,metadata:null,liveTranscript:'',recognition:null,paused:false,sourceMode:'voice'};
const sessionId=(()=>{const k='talera-session-v2';let v=sessionStorage.getItem(k);if(!v){v=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2);sessionStorage.setItem(k,v)}return v})();
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function shell(main,bottom='',opts={}){app.innerHTML='<div class="stage '+(opts.photo?'has-photo':'')+'"><div class="photo-layer '+(opts.photo?'visible':'')+'">'+(opts.photo?'<img src="'+esc(opts.photo)+'" alt="Gekozen herinneringsfoto">':'')+'</div><div class="top"><div class="brand">TALERA</div></div><main class="main">'+main+'</main><div class="bottom">'+bottom+'</div></div>'}
function core(photoMode=false,active=false){return '<div class="core-wrap '+(photoMode?'photo-mode':'')+'"><div class="halo"></div><div id="core" class="core '+(active?'active listening':'')+'"></div></div>'}
function renderEntry(){state.view='entry';state.sourceMode='voice';shell(core(false,false)+'<div class="status">Ik ben er. Neem je tijd.</div>','<div class="pair"><button id="tell" class="btn primary">Vertellen</button><button id="photo" class="btn secondary">Begin met een foto</button></div><button id="type" class="btn ghost">Typ liever</button>');document.querySelector('#tell').onclick=()=>activateMic(false);document.querySelector('#photo').onclick=pickPhoto;document.querySelector('#type').onclick=renderTyping}
function pickPhoto(){const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=()=>{const f=input.files&&input.files[0];if(!f)return;state.photo=f;if(state.photoUrl)URL.revokeObjectURL(state.photoUrl);state.photoUrl=URL.createObjectURL(f);state.sourceMode='photo';renderPhotoReady()};input.click()}
function renderPhotoReady(){state.view='photo-ready';shell(core(true,false)+'<div class="status">Deze foto mag je helpen herinneren.</div>','<div class="single"><button id="tell" class="btn secondary">Vertellen</button></div><button id="change" class="btn ghost">Andere foto kiezen</button>',{photo:state.photoUrl});document.querySelector('#tell').onclick=()=>activateMic(true);document.querySelector('#change').onclick=pickPhoto}
async function activateMic(withPhoto){state.view='mic-initializing';shell(core(withPhoto,false)+'<div class="status">Even luisteren…</div>','',{photo:withPhoto?state.photoUrl:null});try{state.stream=await navigator.mediaDevices.getUserMedia({audio:true});setupAudioAnalysis();setupRecognition();startRecorder();renderListening(withPhoto)}catch(e){renderError('De microfoon kon niet worden geopend. Controleer de toestemming en probeer opnieuw.',withPhoto)}}
function setupAudioAnalysis(){state.context=new (window.AudioContext||window.webkitAudioContext)();state.analyser=state.context.createAnalyser();state.analyser.fftSize=256;state.source=state.context.createMediaStreamSource(state.stream);state.source.connect(state.analyser);const arr=new Uint8Array(state.analyser.frequencyBinCount);const loop=()=>{if(!state.analyser)return;state.analyser.getByteFrequencyData(arr);let sum=0;for(const v of arr)sum+=v;const avg=sum/arr.length;const normalized=Math.max(0,Math.min(1,(avg-8)/42));state.voice=state.voice*.72+normalized*.28;document.documentElement.style.setProperty('--voice',state.voice.toFixed(3));if(state.voice>.08){const now=performance.now();state.lastSpeechAt=now;if(!state.hasSpeech){state.hasSpeech=true;state.startedAt=Date.now();state.chunks=[];document.documentElement.style.setProperty('--awake','1');postEvent('first_speech');}updateSpeechUi(true)}else updateSpeechUi(false);state.raf=requestAnimationFrame(loop)};loop()}
function setupRecognition(){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return;try{const r=new R();r.lang='nl-NL';r.continuous=true;r.interimResults=true;r.onresult=e=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript+' ';state.liveTranscript=t.trim()};r.onerror=()=>{};r.onend=()=>{if(state.stream&&state.view==='listening')try{r.start()}catch{}};r.start();state.recognition=r}catch{}}
function startRecorder(){const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(x=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(x))||'';state.chunks=[];state.recorder=new MediaRecorder(state.stream,mime?{mimeType:mime}:undefined);state.recorder.ondataavailable=e=>{if(e.data&&e.data.size)state.chunks.push(e.data)};state.recorder.onstop=()=>{state.audioBlob=new Blob(state.chunks,{type:state.recorder.mimeType||'audio/webm'});state.duration=state.startedAt?Math.max(0,(Date.now()-state.startedAt)/1000):0;stopMedia();saveStory()};state.recorder.start(500)}
function renderListening(withPhoto){state.view='listening';shell(core(withPhoto,true)+'<div id="status" class="status">Neem je tijd. Ik luister.</div>','<div class="one-control"><button id="singleControl" class="pill hidden">Pauze</button></div>',{photo:withPhoto?state.photoUrl:null});const c=document.querySelector('#singleControl');c.onclick=()=>{if(c.dataset.mode==='done')finishRecording();else togglePause()}}
function updateSpeechUi(speaking){if(state.view!=='listening')return;const control=document.querySelector('#singleControl');const status=document.querySelector('#status');if(!control)return;if(state.hasSpeech)control.classList.remove('hidden');if(speaking){control.textContent=state.paused?'Verder':'Pauze';control.dataset.mode='pause';if(status)status.textContent=state.paused?'Gepauzeerd':'Ik luister.';if(state.silenceTimer){clearTimeout(state.silenceTimer);state.silenceTimer=null}}else if(state.hasSpeech&&!state.paused&&!state.silenceTimer){state.silenceTimer=setTimeout(()=>{if(state.view==='listening'&&!state.paused){control.textContent='Klaar?';control.dataset.mode='done';if(status)status.textContent='Neem gerust nog even de tijd.'}state.silenceTimer=null},2800)}}
function togglePause(){if(!state.recorder)return;const control=document.querySelector('#singleControl');const status=document.querySelector('#status');if(state.paused){try{state.recorder.resume()}catch{};state.paused=false;control.textContent='Pauze';control.dataset.mode='pause';if(status)status.textContent='Ik luister.';postEvent('recording_resumed')}else{try{state.recorder.requestData();state.recorder.pause()}catch{};state.paused=true;control.textContent='Verder';control.dataset.mode='pause';if(status)status.textContent='Gepauzeerd. Je verhaal is veilig.';document.documentElement.style.setProperty('--awake','.15');postEvent('recording_paused')}}
function finishRecording(){if(!state.hasSpeech){renderError('Ik heb nog geen verhaal gehoord. Je kunt rustig beginnen wanneer je wilt.',Boolean(state.photo));return}state.view='finishing';if(state.recorder&&state.recorder.state!=='inactive')state.recorder.stop();else saveStory()}
function stopMedia(){if(state.raf)cancelAnimationFrame(state.raf);state.raf=null;if(state.analyser)try{state.analyser.disconnect()}catch{};if(state.source)try{state.source.disconnect()}catch{};if(state.context)try{state.context.close()}catch{};state.analyser=null;state.source=null;state.context=null;if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null}if(state.recognition){try{state.recognition.onend=null;state.recognition.stop()}catch{};state.recognition=null}document.documentElement.style.setProperty('--voice','0');document.documentElement.style.setProperty('--awake','0')}
async function saveStory(){state.view='saving';shell('<div class="processing"></div><h1 class="title">Je verhaal wordt veilig bewaard</h1><div class="muted">Daarna kijken we samen even of alles goed begrepen is.</div>');const fd=new FormData();if(state.audioBlob)fd.append('audio',state.audioBlob,'verhaal.webm');if(state.liveTranscript)fd.append('liveTranscript',state.liveTranscript);if(state.photo)fd.append('startPhoto',state.photo,state.photo.name||'herinnering.jpg');fd.append('sourceMode',state.sourceMode);fd.append('durationSeconds',String(state.duration||0));fd.append('sessionId',sessionId);const name=localStorage.getItem('xxory-display-name');if(name)fd.append('displayName',name);try{const res=await fetch('/api/stories',{method:'POST',body:fd});const data=await res.json();if(!res.ok)throw new Error(data.error||'Opslaan mislukt');state.storyId=data.storyId;state.manageToken=data.manageToken;state.proposal=data.proposal||{};renderProcessing()}catch(e){renderError(e.message||'Opslaan mislukt',Boolean(state.photo))}}
function renderProcessing(){state.view='processing';shell('<div class="processing"></div><h1 class="title">Even verwerken</h1><div class="muted">Ik haal alleen de gegevens eruit die nodig zijn om deze herinnering goed te plaatsen.</div>');setTimeout(renderConfirmation,900)}
function renderConfirmation(){state.view='confirm';const p=state.proposal||{};state.metadata={title:p.title||'',eventTime:p.eventTime||'',place:p.place||'',people:p.people||'',eventTimePrecision:p.eventTimePrecision||'onbekend'};shell('<h1 class="title">Heb ik je goed begrepen?</h1><div class="summary">'+summaryCard('Titel',state.metadata.title)+summaryCard('Tijd',state.metadata.eventTime)+summaryCard('Plaats',state.metadata.place)+summaryCard('Belangrijkste personen',state.metadata.people)+'</div>','<div class="pair"><button id="ok" class="btn primary">Ja, akkoord en door</button><button id="adjust" class="btn secondary">Aanpassen</button></div>');document.querySelector('#ok').onclick=()=>saveMetadata(false);document.querySelector('#adjust').onclick=renderAdjust}
function summaryCard(label,value){return '<div class="summary-card"><div class="summary-label">'+esc(label)+'</div><div class="summary-value '+(!value?'empty':'')+'">'+esc(value||'Niet duidelijk uit het verhaal')+'</div></div>'}
function renderAdjust(){state.view='adjust';shell('<h1 class="title">Wat wil je aanpassen?</h1><div class="edit-grid">'+field('title','Titel',state.metadata.title)+field('eventTime','Tijd van de gebeurtenis',state.metadata.eventTime)+field('place','Plaats',state.metadata.place)+field('people','Belangrijkste personen',state.metadata.people)+'</div>','<div class="single"><button id="save" class="btn primary">Klaar</button></div>');document.querySelector('#save').onclick=()=>{state.metadata.title=document.querySelector('#title').value.trim();state.metadata.eventTime=document.querySelector('#eventTime').value.trim();state.metadata.place=document.querySelector('#place').value.trim();state.metadata.people=document.querySelector('#people').value.trim();saveMetadata(true)}}
function field(id,label,value){return '<div class="field"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" value="'+esc(value||'')+'"></div>'}
async function saveMetadata(adjusted){try{const res=await fetch('/api/stories/'+encodeURIComponent(state.storyId)+'/metadata',{method:'PUT',headers:{'content-type':'application/json','authorization':'Bearer '+state.manageToken},body:JSON.stringify({...state.metadata,adjusted})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Opslaan mislukt');renderMediaStep()}catch(e){renderError(e.message||'Opslaan mislukt',false)}}
function renderMediaStep(){state.view='media';shell('<h1 class="title">Wil je nog media toevoegen?</h1><div class="muted">Je verhaal is al veilig. Je kunt nu extra foto’s of video’s toevoegen, of dit overslaan.</div><div class="media-box"><input id="mediaInput" type="file" accept="image/*,video/*" multiple></div>','<div class="pair"><button id="add" class="btn primary">Toevoegen en door</button><button id="skip" class="btn secondary">Niet nu</button></div>');document.querySelector('#add').onclick=uploadMedia;document.querySelector('#skip').onclick=renderSaved}
async function uploadMedia(){const files=[...document.querySelector('#mediaInput').files];if(!files.length)return renderSaved();const fd=new FormData();files.slice(0,12).forEach(f=>fd.append('media',f));try{const res=await fetch('/api/stories/'+encodeURIComponent(state.storyId)+'/media',{method:'POST',headers:{'authorization':'Bearer '+state.manageToken},body:fd});const data=await res.json();if(!res.ok)throw new Error(data.error||'Media toevoegen mislukt');renderSaved()}catch(e){renderError(e.message||'Media toevoegen mislukt',false)}}
function renderSaved(){state.view='saved';shell('<div class="saved">✓</div><h1 class="title">Je herinnering staat veilig</h1><div class="muted">Hij is klaar om op zijn plek in je levenslijn te verschijnen.</div>','<div class="single"><button id="timeline" class="btn primary">Terug naar mijn tijdlijn</button></div>');document.querySelector('#timeline').onclick=()=>{postEvent('return_to_timeline',{storyId:state.storyId});renderShareInvite()};setTimeout(renderShareInvite,650)}
function renderShareInvite(){if(state.view==='share')return;state.view='share';shell('<div class="saved">✓</div><h1 class="title">Je herinnering is bewaard</h1><div class="muted">De tijdlijnkoppeling kan vanuit de presentatieworker op deze nieuwe herinnering landen.</div>','');const overlay=document.createElement('div');overlay.className='share-overlay';overlay.innerHTML='<h3>Wil je dit verhaal delen?</h3><p>Delen staat los van opslaan. Je herinnering blijft veilig, ook als je later kiest.</p><div class="pair"><button id="shareNow" class="btn primary">Ja, delen</button><button id="later" class="btn secondary">Later</button></div>';document.body.appendChild(overlay);overlay.querySelector('#later').onclick=()=>{overlay.remove();renderEntry()};overlay.querySelector('#shareNow').onclick=()=>shareStory(overlay)}
async function shareStory(overlay){try{const res=await fetch('/api/stories/'+encodeURIComponent(state.storyId)+'/share',{method:'POST',headers:{'authorization':'Bearer '+state.manageToken}});const data=await res.json();if(!res.ok)throw new Error(data.error||'Delen mislukt');const text='Ik wil dit verhaal met je delen via TALERA: '+data.shareUrl;const wa='https://wa.me/?text='+encodeURIComponent(text);window.location.href=wa}catch(e){overlay.querySelector('p').textContent=e.message||'Delen mislukt'}}
function renderTyping(){state.view='typing';state.sourceMode='text';shell('<textarea id="storyText" class="text-editor" maxlength="20000" placeholder="Schrijf je verhaal…"></textarea>','<div class="single"><button id="done" class="btn primary">Klaar</button></div>');document.querySelector('#done').onclick=async()=>{const text=document.querySelector('#storyText').value.trim();if(!text)return;const fd=new FormData();fd.append('storyText',text);fd.append('sourceMode','text');fd.append('sessionId',sessionId);const name=localStorage.getItem('xxory-display-name');if(name)fd.append('displayName',name);shell('<div class="processing"></div><h1 class="title">Je verhaal wordt veilig bewaard</h1>');try{const res=await fetch('/api/stories',{method:'POST',body:fd});const data=await res.json();if(!res.ok)throw new Error(data.error||'Opslaan mislukt');state.storyId=data.storyId;state.manageToken=data.manageToken;state.proposal=data.proposal||{};renderProcessing()}catch(e){renderError(e.message||'Opslaan mislukt',false)}}}
function renderError(message,withPhoto=false){shell(core(withPhoto,false)+'<div class="error">'+esc(message)+'</div>','<div class="single"><button id="retry" class="btn primary">Opnieuw proberen</button></div>',{photo:withPhoto?state.photoUrl:null});document.querySelector('#retry').onclick=()=>withPhoto?renderPhotoReady():renderEntry()}
function postEvent(eventName,detail){fetch('/api/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventName,storyId:state.storyId,sessionId,detail})}).catch(()=>{})}
renderEntry();
</script></body></html>`;
}
