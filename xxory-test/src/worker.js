const APP_NAME = "TALERA Test 0.1";
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const MAX_STORY_TEXT_CHARS = 20000;
const RECORDING_FLOW_VERSION = "approved-v1";

const COLORS = {
  primary: "#1E5BFF",
  connection: "#8FB5FF",
  ink: "#0F1F37",
  sky: "#E9F1FB",
  white: "#FAFBFD",
  coral: "#FF7A6A",
};

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    audio_object_key TEXT NOT NULL,
    audio_mime_type TEXT NOT NULL,
    audio_size_bytes INTEGER NOT NULL,
    duration_seconds REAL,
    display_name TEXT,
    manage_token_hash TEXT NOT NULL,
    parent_story_id TEXT,
    parent_share_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS story_texts (
    story_id TEXT PRIMARY KEY,
    text_content TEXT NOT NULL,
    FOREIGN KEY(story_id) REFERENCES stories(id)
  )`,
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

let schemaPromise = null;

export default {
  async fetch(request, env, ctx) {
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
      for (const statement of SCHEMA_STATEMENTS) {
        await env.DB.prepare(statement).run();
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
    return json({
      ok: true,
      app: APP_NAME,
      database: "connected",
      media: "connected",
    });
  }

  if (request.method === "POST" && pathname === "/api/stories") {
    return createStory(request, env);
  }

  const shareCreate = pathname.match(/^\/api\/stories\/([^/]+)\/share$/);
  if (request.method === "POST" && shareCreate) {
    return createShare(request, env, shareCreate[1], url);
  }

  const shareMeta = pathname.match(/^\/api\/s\/([^/]+)$/);
  if (request.method === "GET" && shareMeta) {
    return getSharedStory(env, shareMeta[1]);
  }

  const shareAudio = pathname.match(/^\/api\/s\/([^/]+)\/audio$/);
  if (request.method === "GET" && shareAudio) {
    return getSharedAudio(request, env, shareAudio[1]);
  }

  if (request.method === "POST" && pathname === "/api/events") {
    return recordEvent(request, env);
  }

  return json({ error: "Niet gevonden." }, 404);
}

async function createStory(request, env) {
  const form = await request.formData();
  const audio = form.get("audio");
  const storyText = cleanText(form.get("storyText"), MAX_STORY_TEXT_CHARS);

  const hasAudio = audio instanceof File && audio.size > 0;
  const hasText = Boolean(storyText);

  if (!hasAudio && !hasText) {
    return json({ error: "Verhaal ontbreekt." }, 400);
  }

  if (hasAudio && hasText) {
    return json({ error: "Kies één manier: inspreken of typen." }, 400);
  }

  if (hasAudio && audio.size > MAX_AUDIO_BYTES) {
    return json({ error: "Deze test accepteert maximaal 50 MB per gesproken verhaal." }, 413);
  }

  const storyId = randomToken(16);
  const manageToken = randomToken(32);
  const manageTokenHash = await sha256(manageToken);
  const createdAt = new Date().toISOString();

  const mimeType = hasAudio ? (audio.type || "application/octet-stream") : "text/plain";
  const extension = hasAudio ? extensionForMime(mimeType) : null;
  const objectKey = hasAudio ? `stories/${storyId}/audio.${extension}` : "";
  const duration = hasAudio ? parseOptionalNumber(form.get("durationSeconds")) : null;

  const displayName = cleanText(form.get("displayName"), 80);
  const parentShareToken = cleanText(form.get("parentShareToken"), 256);
  const rawExperimentVariant = cleanText(form.get("experimentVariant"), 8);
  const experimentVariant = ["A", "B", "C"].includes(rawExperimentVariant)
    ? rawExperimentVariant
    : null;

  let parentStoryId = null;
  let parentShareId = null;

  if (parentShareToken) {
    const tokenHash = await sha256(parentShareToken);
    const parent = await env.DB.prepare(`
      SELECT s.id AS share_id, s.story_id, s.revoked_at, s.expires_at, st.status
      FROM shares s
      JOIN stories st ON st.id = s.story_id
      WHERE s.token_hash = ?
      LIMIT 1
    `).bind(tokenHash).first();

    if (isShareActive(parent)) {
      parentStoryId = parent.story_id;
      parentShareId = parent.share_id;
    }
  }

  if (hasAudio) {
    await env.MEDIA.put(objectKey, audio, {
      httpMetadata: { contentType: mimeType },
      customMetadata: { storyId, createdAt },
    });
  }

  try {
    await env.DB.prepare(`
      INSERT INTO stories (
        id, created_at, audio_object_key, audio_mime_type, audio_size_bytes,
        duration_seconds, display_name, manage_token_hash,
        parent_story_id, parent_share_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      storyId,
      createdAt,
      objectKey,
      mimeType,
      hasAudio ? audio.size : 0,
      duration,
      displayName,
      manageTokenHash,
      parentStoryId,
      parentShareId
    ).run();

    if (hasText) {
      await env.DB.prepare(`
        INSERT INTO story_texts (story_id, text_content)
        VALUES (?, ?)
      `).bind(storyId, storyText).run();
    }
  } catch (error) {
    try {
      await env.DB.prepare(`DELETE FROM stories WHERE id = ?`).bind(storyId).run();
    } catch {}
    if (hasAudio) {
      try { await env.MEDIA.delete(objectKey); } catch {}
    }
    throw error;
  }

  await insertEvent(
    env,
    hasAudio ? "recording_completed" : "text_story_completed",
    storyId,
    null,
    null,
    experimentVariant
      ? JSON.stringify({
          variant: experimentVariant,
          mode: hasAudio ? "voice" : "text",
          recordingFlow: hasAudio ? "approved-v1" : null
        })
      : JSON.stringify({
          mode: hasAudio ? "voice" : "text",
          recordingFlow: hasAudio ? "approved-v1" : null
        })
  );

  return json({
    storyId,
    manageToken,
    createdAt,
    storyType: hasAudio ? "audio" : "text",
  }, 201);
}

async function createShare(request, env, storyId, url) {
  const manageToken = bearerToken(request);
  if (!manageToken) return json({ error: "Beheer-token ontbreekt." }, 401);

  const story = await env.DB.prepare(`
    SELECT id, manage_token_hash, status
    FROM stories
    WHERE id = ?
  `).bind(storyId).first();

  if (!story || story.status !== "active") {
    return json({ error: "Verhaal niet gevonden." }, 404);
  }
  if (!(await secureHashMatch(manageToken, story.manage_token_hash))) {
    return json({ error: "Geen toegang." }, 403);
  }

  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const shareId = randomToken(16);
  const createdAt = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO shares (id, story_id, token_hash, created_at)
    VALUES (?, ?, ?, ?)
  `).bind(shareId, storyId, tokenHash, createdAt).run();

  await insertEvent(env, "shared", storyId, shareId, null, null);

  return json({
    shareId,
    shareUrl: `${url.origin}/s/${encodeURIComponent(token)}`,
    createdAt,
  }, 201);
}

async function getSharedStory(env, token) {
  const tokenHash = await sha256(token);

  const row = await env.DB.prepare(`
    SELECT
      s.id AS share_id,
      s.story_id,
      s.expires_at,
      s.revoked_at,
      st.created_at,
      st.duration_seconds,
      st.display_name,
      st.audio_mime_type,
      st.status,
      tx.text_content
    FROM shares s
    JOIN stories st ON st.id = s.story_id
    LEFT JOIN story_texts tx ON tx.story_id = st.id
    WHERE s.token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!isShareActive(row)) {
    return json({ error: "Deze link is niet meer beschikbaar." }, 404);
  }

  await insertEvent(env, "story_opened", row.story_id, row.share_id, null, null);

  return json({
    shareId: row.share_id,
    storyId: row.story_id,
    createdAt: row.created_at,
    durationSeconds: row.duration_seconds,
    displayName: row.display_name || null,
    storyType: row.text_content ? "text" : "audio",
    textContent: row.text_content || null,
    audioMimeType: row.text_content ? null : row.audio_mime_type,
    audioUrl: row.text_content ? null : `/api/s/${encodeURIComponent(token)}/audio`,
  });
}

async function getSharedAudio(request, env, token) {
  const tokenHash = await sha256(token);

  const row = await env.DB.prepare(`
    SELECT
      s.id AS share_id,
      s.story_id,
      s.expires_at,
      s.revoked_at,
      st.audio_object_key,
      st.audio_mime_type,
      st.status
    FROM shares s
    JOIN stories st ON st.id = s.story_id
    WHERE s.token_hash = ?
    LIMIT 1
  `).bind(tokenHash).first();

  if (!isShareActive(row)) {
    return new Response("Niet beschikbaar", { status: 404 });
  }

  const object = await env.MEDIA.get(row.audio_object_key, {
    onlyIf: request.headers,
    range: request.headers,
  });

  if (!object) return new Response("Audio niet gevonden", { status: 404 });
  if (!("body" in object)) return new Response(null, { status: 412 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", row.audio_mime_type || headers.get("content-type") || "application/octet-stream");
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "private, max-age=300");
  headers.set("etag", object.httpEtag);

  let status = 200;
  if (object.range && typeof object.range.offset === "number" && typeof object.range.length === "number") {
    const start = object.range.offset;
    const end = start + object.range.length - 1;
    headers.set("content-range", `bytes ${start}-${end}/${object.size}`);
    headers.set("content-length", String(object.range.length));
    status = 206;
  } else {
    headers.set("content-length", String(object.size));
  }

  return new Response(object.body, { status, headers });
}

async function recordEvent(request, env) {
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Ongeldig event." }, 400);
  }

  const allowed = new Set([
    "recording_started",
    "recording_completed",
    "typing_started",
    "text_story_completed",
    "shared",
    "story_opened",
    "playback_started",
    "playback_completed",
    "invitation_seen",
    "reply_started",
  ]);

  if (!allowed.has(payload.eventName)) {
    return json({ error: "Event niet toegestaan." }, 400);
  }

  await insertEvent(
    env,
    payload.eventName,
    cleanText(payload.storyId, 100),
    cleanText(payload.shareId, 100),
    cleanText(payload.sessionId, 100),
    payload.detail ? JSON.stringify(payload.detail).slice(0, 1000) : null
  );

  return json({ ok: true });
}

async function insertEvent(env, eventName, storyId, shareId, sessionId, detail) {
  await env.DB.prepare(`
    INSERT INTO events (
      created_at, event_name, story_id, share_id, anonymous_session_id, detail
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    new Date().toISOString(),
    eventName,
    storyId,
    shareId,
    sessionId,
    detail
  ).run();
}

function isShareActive(row) {
  if (!row || row.status !== "active" || row.revoked_at) return false;
  if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) return false;
  return true;
}

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ")
    ? value.slice(7).trim()
    : null;
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
  for (let i = 0; i < actualHash.length; i++) {
    difference |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return difference === 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "permissions-policy": "camera=(), geolocation=(), microphone=(self)",
    },
  });
}

function renderAppHtml() {
  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="${COLORS.white}">
  <meta name="robots" content="noindex,nofollow">
  <title>TALERA</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@500;600;700&display=swap" rel="stylesheet">

  <style>
    :root {
      --primary: ${COLORS.primary};
      --connection: ${COLORS.connection};
      --ink: ${COLORS.ink};
      --sky: ${COLORS.sky};
      --soft-white: ${COLORS.white};
      --coral: ${COLORS.coral};
      --muted: #6C7890;
      --line: #E5EBF4;
      --danger: #D84B4B;
      --shadow: 0 20px 60px rgba(15,31,55,.08);
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      min-height: 100%;
      background: var(--soft-white);
      color: var(--ink);
    }

    body {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    button, input { font: inherit; }

    button {
      -webkit-tap-highlight-color: transparent;
      cursor: pointer;
    }

    .app {
      min-height: 100dvh;
      display: flex;
      justify-content: center;
      padding:
        max(20px, env(safe-area-inset-top))
        20px
        max(24px, env(safe-area-inset-bottom));
    }

    .screen {
      width: min(100%, 540px);
      min-height: calc(100dvh - 44px);
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 20px;
    }

    [hidden] {
      display: none !important;
    }

    .top {
      display: flex;
      justify-content: center;
      min-height: 48px;
      align-items: center;
    }

    .wordmark {
      width: auto;
      display: block;
      font-family: "Manrope", "Inter", sans-serif;
      font-size: 26px;
      line-height: 1;
      font-weight: 600;
      letter-spacing: .08em;
      color: var(--ink);
    }

    .center {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      gap: 20px;
      min-height: 420px;
    }

    h1, h2 {
      font-family: "Manrope", "Inter", sans-serif;
      margin: 0;
      letter-spacing: -.035em;
      color: var(--ink);
    }

    h1 {
      max-width: 460px;
      font-size: clamp(32px, 9vw, 46px);
      line-height: 1.08;
      font-weight: 600;
    }

    h2 {
      font-size: 24px;
      font-weight: 600;
    }

    p { margin: 0; line-height: 1.55; }

    .lead {
      max-width: 390px;
      color: var(--muted);
      font-size: 17px;
    }

    .small {
      color: var(--muted);
      font-size: 13px;
    }

    .actions {
      width: 100%;
      display: grid;
      gap: 10px;
    }

    .btn {
      width: 100%;
      min-height: 56px;
      border-radius: 18px;
      border: 1px solid transparent;
      padding: 0 20px;
      font-weight: 600;
      transition: transform .12s ease, opacity .12s ease, background .12s ease;
    }

    .btn:active { transform: scale(.99); }
    .btn:disabled { opacity: .45; cursor: default; }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-human {
      background: var(--coral);
      color: white;
    }

    .btn-secondary {
      background: white;
      color: var(--ink);
      border-color: var(--line);
    }

    .btn-text {
      background: transparent;
      color: var(--muted);
      min-height: 46px;
    }

    .presence {
      width: 142px;
      height: 142px;
      position: relative;
      display: grid;
      place-items: center;
    }

    .presence::before,
    .presence::after {
      content: "";
      position: absolute;
      border-radius: 50%;
      background: var(--sky);
      opacity: .65;
      transform: scale(calc(.82 + var(--voice, 0) * .20));
      transition: transform 90ms linear, opacity 180ms ease;
    }

    .presence::before {
      width: 142px;
      height: 142px;
      animation: breathe 3.4s ease-in-out infinite;
    }

    .presence::after {
      width: 108px;
      height: 108px;
      opacity: .9;
      animation: breathe 3.4s ease-in-out infinite reverse;
    }

    .presence-mark {
      width: 72px;
      height: 42px;
      z-index: 1;
    }

    @keyframes breathe {
      0%,100% { transform: scale(.92); }
      50% { transform: scale(1.04); }
    }

    .controls {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }


    .field {
      width: 100%;
      display: grid;
      gap: 8px;
      text-align: left;
    }

    .field label {
      color: var(--ink);
      font-size: 14px;
      font-weight: 600;
    }

    .field input {
      width: 100%;
      min-height: 56px;
      border-radius: 16px;
      border: 1px solid var(--line);
      padding: 0 16px;
      background: white;
      color: var(--ink);
      font-size: 17px;
      outline: none;
    }

    .field input:focus {
      border-color: var(--connection);
      box-shadow: 0 0 0 3px rgba(143,181,255,.20);
    }

    .card {
      width: 100%;
      padding: 20px;
      border: 1px solid var(--line);
      background: white;
      border-radius: 22px;
      box-shadow: 0 14px 34px rgba(15,31,55,.04);
    }

    .listen-card {
      width: min(320px, 84vw);
      display: grid;
      gap: 16px;
      place-items: center;
      padding: 0;
      border: 0;
      background: transparent;
      border-radius: 0;
      box-shadow: none;
    }

    .play {
      width: 56px;
      height: 56px;
      border: 0;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      font-size: 18px;
      display: grid;
      place-items: center;
    }

    .progress-wrap {
      width: 100%;
      display: grid;
      gap: 0;
    }

    .progress {
      width: 100%;
      height: 2px;
      background: var(--sky);
      border-radius: 999px;
      overflow: hidden;
    }

    .progress > div {
      width: 0%;
      height: 100%;
      background: var(--primary);
      transition: width .15s linear;
    }

    .btn-compact {
      width: auto;
      min-width: 126px;
      min-height: 46px;
      border-radius: 15px;
      padding: 0 24px;
      justify-self: center;
    }

    .replay-link {
      border: 0;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 14px;
      padding: 8px 10px;
      cursor: pointer;
    }

    .voice-orb {
      width: 188px;
      height: 188px;
      border: 0;
      border-radius: 50%;
      background: rgba(30,91,255,.22);
      box-shadow: inset 0 0 0 1px rgba(30,91,255,.10);
      display: grid;
      place-items: center;
      cursor: pointer;
      padding: 0;
      position: relative;
      overflow: visible;
      transition: transform .16s ease, background .16s ease, box-shadow .16s ease;
    }

    .voice-orb:active {
      transform: scale(.96);
    }

    .voice-orb::before {
      content: "";
      width: 82px;
      height: 82px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 0 0 1px rgba(30,91,255,.10), 0 6px 20px rgba(30,91,255,.08);
      position: absolute;
      z-index: 0;
    }

    .voice-orb::after {
      content: "";
      position: absolute;
      inset: -7px;
      border-radius: 50%;
      border: 1px solid rgba(30,91,255,.14);
      opacity: .28;
      pointer-events: none;
    }

    .voice-bars {
      height: 36px;
      display: flex;
      align-items: center;
      gap: 6px;
      z-index: 1;
    }

    .voice-bars span {
      width: 6px;
      border-radius: 999px;
      background: var(--primary);
      display: block;
      transform-origin: center;
    }

    .voice-bars span:nth-child(1) { height: 17px; }
    .voice-bars span:nth-child(2) { height: 34px; }
    .voice-bars span:nth-child(3) { height: 22px; }

    .voice-orb-label {
      position: relative;
      z-index: 1;
      font-family: "Inter", sans-serif;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: .01em;
      color: var(--primary);
      user-select: none;
      pointer-events: none;
    }

    .type-link {
      border: 0;
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 15px;
      padding: 8px 12px;
      cursor: pointer;
    }

    .story-editor {
      width: min(100%, 520px);
      min-height: 42dvh;
      resize: none;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--ink);
      font-family: "Inter", sans-serif;
      font-size: 19px;
      line-height: 1.65;
      padding: 8px 2px;
    }

    .story-editor::placeholder {
      color: #8B98AA;
    }

    .text-story {
      width: min(100%, 520px);
      white-space: pre-wrap;
      text-align: left;
      font-size: 18px;
      line-height: 1.7;
      color: var(--ink);
    }

    .voice-orb-live {
      cursor: default;
      background: rgba(30,91,255,.18);
      box-shadow: inset 0 0 0 1px rgba(30,91,255,.10);
      transform: scale(calc(1 + var(--voice, 0) * .075));
      transition: transform 60ms linear, background 70ms linear, box-shadow 70ms linear;
    }

    .voice-orb-live::after {
      opacity: calc(.08 + var(--voice, 0) * .62);
      transform: scale(calc(1 + var(--voice, 0) * .11));
      transition: opacity 60ms linear, transform 60ms linear;
    }

    .voice-orb-live .voice-bars span {
      background: rgba(30,91,255, calc(.22 + var(--voice, 0) * .78));
      opacity: calc(.28 + var(--voice, 0) * .72);
      transition: transform 50ms linear, opacity 50ms linear, background 50ms linear;
    }

    .voice-orb-live .voice-bars span:nth-child(1) {
      transform: scaleY(calc(.72 + var(--voice, 0) * 1.85));
    }

    .voice-orb-live .voice-bars span:nth-child(2) {
      transform: scaleY(calc(.68 + var(--voice, 0) * 2.35));
    }

    .voice-orb-live .voice-bars span:nth-child(3) {
      transform: scaleY(calc(.74 + var(--voice, 0) * 2.05));
    }

    .recording-controls-delayed {
      width: auto;
      grid-template-columns: auto auto;
      opacity: 0;
      transform: translateY(8px);
      pointer-events: none;
      transition: opacity .22s ease, transform .22s ease;
    }

    .recording-controls-delayed.visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .recording-controls-delayed .btn {
      min-width: 104px;
      min-height: 48px;
      padding: 0 20px;
    }

    .voice-presence {
      width: 118px;
      height: 118px;
    }

    .voice-presence::before {
      width: 118px;
      height: 118px;
    }

    .voice-presence::after {
      width: 82px;
      height: 82px;
    }

    .saved-check {
      width: 74px;
      height: 74px;
      border-radius: 50%;
      background: var(--sky);
      color: var(--primary);
      display: grid;
      place-items: center;
      font-size: 34px;
      font-weight: 600;
    }

    .warm-dot {
      width: 10px;
      height: 10px;
      background: var(--coral);
      border-radius: 50%;
    }

    .notice {
      width: 100%;
      border-radius: 16px;
      background: var(--sky);
      padding: 14px 16px;
      color: #315187;
      font-size: 14px;
      line-height: 1.5;
    }

    .error {
      width: 100%;
      border-radius: 16px;
      background: #FFF2F2;
      padding: 14px 16px;
      color: #9C3333;
      font-size: 14px;
      line-height: 1.5;
    }

    .footer {
      min-height: 44px;
      display: flex;
      justify-content: center;
      align-items: end;
      text-align: center;
      color: var(--muted);
      font-size: 12px;
    }

    .footer:empty {
      min-height: 0;
    }

    .fade-in {
      animation: fadeIn .28s ease both;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (min-width: 700px) {
      .screen {
        min-height: 760px;
        max-height: 920px;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <main id="root" class="screen" aria-live="polite"></main>
  </div>

  <script>
    const root = document.querySelector("#root");
    const PRIMARY = "${COLORS.primary}";
    const CONNECTION = "${COLORS.connection}";
    const INK = "${COLORS.ink}";
    const CORAL = "${COLORS.coral}";

    let recorderState = null;
    let pendingBlob = null;

    const sessionId = (() => {
      const existing = sessionStorage.getItem("xxory-session");
      if (existing) return existing;
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      sessionStorage.setItem("xxory-session", id);
      return id;
    })();

    function getReplyExperimentVariant(shareId) {
      const key = "talera-reply-experiment-v1:" + String(shareId || "unknown");
      const existing = localStorage.getItem(key);
      if (["A", "B", "C"].includes(existing)) return existing;

      const variants = ["A", "B", "C"];
      const variant = variants[Math.floor(Math.random() * variants.length)];
      try { localStorage.setItem(key, variant); } catch {}
      return variant;
    }

    function experimentDetail(variant) {
      return ["A", "B", "C"].includes(variant) ? { variant } : null;
    }

    function logoSvg(className = "wordmark") {
      return \`<div class="\${className}" role="img" aria-label="TALERA">TALERA</div>\`;
    }

    function markSvg() {
      return "";
    }

    function shell(content, footer = "") {
      root.innerHTML = \`
        <div class="top">\${logoSvg()}</div>
        <section class="center fade-in">\${content}</section>
        <div class="footer">\${footer}</div>
      \`;
    }

    function renderHome() {
      shell(\`
        <button id="tellBtn" class="voice-orb" aria-label="Tik om te vertellen">
          <span class="voice-orb-label">Tik</span>
        </button>
        <button id="typeBtn" class="type-link">Typ liever</button>
      \`);

      document.querySelector("#tellBtn").addEventListener("click", () => {
        const name = getDisplayName();
        if (name) activateApprovedVoiceFlow(null, null);
        else renderNamePrompt(null, null, "voice");
      });

      document.querySelector("#typeBtn").addEventListener("click", () => {
        const name = getDisplayName();
        if (name) renderTextComposer(null, null);
        else renderNamePrompt(null, null, "text");
      });
    }

    function renderNamePrompt(parentShareToken, experimentVariant = null, nextMode = "voice") {
      shell(\`
        <h1>Hoe mogen we je noemen?</h1>
        <p class="lead">Je voornaam is genoeg.</p>
        <div class="field">
          <label for="nameInput">Voornaam</label>
          <input id="nameInput" maxlength="80" autocomplete="given-name" inputmode="text" />
        </div>
        <div class="actions">
          <button id="continueBtn" class="btn btn-primary">Verder</button>
        </div>
      \`);

      const input = document.querySelector("#nameInput");
      const btn = document.querySelector("#continueBtn");
      input.focus();

      const continueWithName = () => {
        const value = input.value.trim();
        if (!value) return input.focus();
        localStorage.setItem("xxory-display-name", value.slice(0, 80));
        if (nextMode === "text") {
          renderTextComposer(parentShareToken, experimentVariant);
        } else {
          renderRecordingReady(parentShareToken, experimentVariant);
        }
      };

      btn.addEventListener("click", continueWithName);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") continueWithName();
      });
    }

    function getDisplayName() {
      return (localStorage.getItem("xxory-display-name") || "").trim();
    }

    function activateApprovedVoiceFlow(parentShareToken, experimentVariant = null) {
      return renderRecordingReady(parentShareToken, experimentVariant);
    }

    function renderRecordingReady(parentShareToken, experimentVariant = null) {
      shell(\`
        <button id="recordReadyBtn" class="voice-orb" aria-label="Tik om de microfoon te activeren en te vertellen">
          <span class="voice-orb-label">Tik</span>
        </button>
        <button id="typeInsteadBtn" class="type-link">Typ liever</button>
      \`);

      document.querySelector("#recordReadyBtn").addEventListener("click", () => {
        startRecording(parentShareToken, experimentVariant);
      });

      document.querySelector("#typeInsteadBtn").addEventListener("click", () => {
        renderTextComposer(parentShareToken, experimentVariant);
      });
    }


    let pendingTextStory = null;

    function renderTextComposer(parentShareToken, experimentVariant = null, initialText = "") {
      shell(\`
        <textarea id="storyEditor" class="story-editor" maxlength="20000" placeholder="Schrijf je verhaal…" aria-label="Schrijf je verhaal"></textarea>
        <div class="actions">
          <button id="saveTextBtn" class="btn btn-primary btn-compact">Klaar</button>
        </div>
      \`);

      const editor = document.querySelector("#storyEditor");
      const saveBtn = document.querySelector("#saveTextBtn");
      editor.value = initialText || "";
      editor.focus();

      postEvent("typing_started", {
        detail: experimentVariant ? { variant: experimentVariant, mode: "text" } : { mode: "text" },
      });

      saveBtn.addEventListener("click", () => {
        const storyText = editor.value.trim();
        if (!storyText) {
          editor.focus();
          return;
        }

        pendingTextStory = {
          text: storyText.slice(0, 20000),
          parentShareToken: parentShareToken || null,
          experimentVariant: experimentVariant || null,
        };

        try {
          localStorage.setItem("talera-pending-text-story-v1", JSON.stringify(pendingTextStory));
        } catch {}

        safelyUploadPendingText();
      });
    }

    async function uploadPendingTextOnce() {
      const form = new FormData();
      form.append("storyText", pendingTextStory.text);
      form.append("displayName", getDisplayName());

      if (pendingTextStory.parentShareToken) {
        form.append("parentShareToken", pendingTextStory.parentShareToken);
      }
      if (pendingTextStory.experimentVariant) {
        form.append("experimentVariant", pendingTextStory.experimentVariant);
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch("/api/stories", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });

        const raw = await response.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch {}

        if (!response.ok) {
          throw new Error(data.error || "Opslaan mislukt");
        }

        return data;
      } finally {
        window.clearTimeout(timeout);
      }
    }

    async function safelyUploadPendingText() {
      if (!pendingTextStory) return;

      renderUploading();

      try {
        let data = null;
        let lastError = null;
        const delays = [0, 700, 1800];

        for (let attempt = 0; attempt < delays.length; attempt++) {
          if (delays[attempt]) await wait(delays[attempt]);

          try {
            data = await uploadPendingTextOnce();
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!data) throw lastError || new Error("Opslaan mislukt");

        try { localStorage.removeItem("talera-pending-text-story-v1"); } catch {}
        pendingTextStory = null;

        renderSaved(data.storyId, data.manageToken);
      } catch (error) {
        renderError(
          "Je geschreven verhaal staat nog op dit apparaat, maar kon nog niet online worden bewaard.",
          safelyUploadPendingText,
          "Nog eens proberen"
        );
      }
    }

    async function startRecording(parentShareToken, experimentVariant = null) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        shell(\`
          <h1>Inspreken lukt hier niet.</h1>
          <button id="fallbackTypeBtn" class="btn btn-primary btn-compact">Typ je verhaal</button>
        \`);
        document.querySelector("#fallbackTypeBtn").addEventListener("click", () => {
          renderTextComposer(parentShareToken, experimentVariant);
        });
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });

        const mimeType = chooseMimeType();
        const options = mimeType ? { mimeType } : undefined;
        const mediaRecorder = new MediaRecorder(stream, options);
        const chunks = [];
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.18;
        source.connect(analyser);
        try { await audioContext.resume(); } catch {}

        const state = {
          stream,
          mediaRecorder,
          chunks,
          audioContext,
          analyser,
          startAt: performance.now(),
          pauseStartedAt: 0,
          pausedTotal: 0,
          voiceFrame: null,
          controlsRevealed: false,
          voiceActiveFrames: 0,
          voiceLevel: 0,
          parentShareToken,
          experimentVariant,
        };

        recorderState = state;

        mediaRecorder.addEventListener("dataavailable", (event) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        });

        mediaRecorder.start(1000);
        postEvent("recording_started", {
          detail: {
            ...(experimentDetail(experimentVariant) || {}),
            mode: "voice",
            recordingFlow: RECORDING_FLOW_VERSION,
          },
        });

        renderRecording();

        startVoiceAnimation();
      } catch (error) {
        const permissionIssue =
          error && (error.name === "NotAllowedError" || error.name === "SecurityError");

        shell(\`
          <h1>\${permissionIssue ? "Microfoon nog niet beschikbaar." : "Inspreken lukt nog niet."}</h1>
          <div class="actions">
            <button id="retryMicBtn" class="btn btn-primary btn-compact">Probeer opnieuw</button>
            <button id="typeFallbackBtn" class="type-link">Typ liever</button>
          </div>
        \`);

        document.querySelector("#retryMicBtn").addEventListener("click", () => {
          renderRecordingReady(parentShareToken, experimentVariant);
        });
        document.querySelector("#typeFallbackBtn").addEventListener("click", () => {
          renderTextComposer(parentShareToken, experimentVariant);
        });
      }
    }

    function renderRecording() {
      shell(\`
        <div id="presence" class="voice-orb voice-orb-live" style="--voice:0" aria-label="Microfoon actief">
          <span class="voice-bars" aria-hidden="true"><span></span><span></span><span></span></span>
        </div>
        <div id="recordingControls" class="controls recording-controls-delayed">
          <button id="pauseBtn" class="btn btn-secondary">Pauze</button>
          <button id="stopBtn" class="btn btn-primary">Klaar</button>
        </div>
      \`);

      document.querySelector("#pauseBtn").addEventListener("click", togglePause);
      document.querySelector("#stopBtn").addEventListener("click", finishRecording);
    }

    function revealRecordingControls() {
      const state = recorderState;
      if (!state || state.controlsRevealed) return;

      state.controlsRevealed = true;

      const controls = document.querySelector("#recordingControls");
      if (controls) controls.classList.add("visible");
    }

    function togglePause() {
      const state = recorderState;
      if (!state) return;

      const btn = document.querySelector("#pauseBtn");

      if (state.mediaRecorder.state === "recording") {
        state.mediaRecorder.pause();
        state.pauseStartedAt = performance.now();
        btn.textContent = "Verder";
      } else if (state.mediaRecorder.state === "paused") {
        state.mediaRecorder.resume();
        state.pausedTotal += performance.now() - state.pauseStartedAt;
        state.pauseStartedAt = 0;
        btn.textContent = "Pauze";
      }
    }

    async function finishRecording() {
      const state = recorderState;
      if (!state) return;

      const stopBtn = document.querySelector("#stopBtn");
      const pauseBtn = document.querySelector("#pauseBtn");
      stopBtn.disabled = true;
      pauseBtn.disabled = true;

      if (state.mediaRecorder.state === "paused") {
        state.mediaRecorder.resume();
        state.pausedTotal += performance.now() - state.pauseStartedAt;
        state.pauseStartedAt = 0;
      }

      const stopped = new Promise((resolve) => {
        state.mediaRecorder.addEventListener("stop", resolve, { once: true });
      });

      state.mediaRecorder.stop();
      await stopped;

      if (state.voiceFrame) cancelAnimationFrame(state.voiceFrame);

      state.stream.getTracks().forEach((track) => track.stop());
      try { await state.audioContext.close(); } catch {}

      const mimeType = state.mediaRecorder.mimeType || (state.chunks[0] && state.chunks[0].type) || "audio/webm";
      const blob = new Blob(state.chunks, { type: mimeType });
      const duration = currentDurationSeconds(state);
      const parentShareToken = state.parentShareToken;
      const experimentVariant = state.experimentVariant || null;

      recorderState = null;
      pendingBlob = { blob, duration, parentShareToken, experimentVariant };

      await safelyUploadPending();
    }

    function wait(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    async function uploadPendingOnce() {
      const form = new FormData();
      form.append("audio", pendingBlob.blob, "talera-audio");
      form.append("durationSeconds", String(pendingBlob.duration));
      form.append("displayName", getDisplayName());

      if (pendingBlob.parentShareToken) {
        form.append("parentShareToken", pendingBlob.parentShareToken);
      }
      if (pendingBlob.experimentVariant) {
        form.append("experimentVariant", pendingBlob.experimentVariant);
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch("/api/stories", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });

        const raw = await response.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch {}

        if (!response.ok) {
          throw new Error(data.error || "Opslaan mislukt");
        }

        return data;
      } finally {
        window.clearTimeout(timeout);
      }
    }

    async function safelyUploadPending() {
      if (!pendingBlob) return;

      renderUploading();

      try {
        // First protect the recording locally. Only then start network work.
        await savePendingToIndexedDb(pendingBlob);

        let data = null;
        let lastError = null;
        const delays = [0, 700, 1800];

        for (let attempt = 0; attempt < delays.length; attempt++) {
          if (delays[attempt]) await wait(delays[attempt]);

          try {
            data = await uploadPendingOnce();
            break;
          } catch (error) {
            lastError = error;
            postEvent("upload_retry", {
              detail: {
                attempt: attempt + 1,
                message: String(error && error.message ? error.message : error),
              },
            });
          }
        }

        if (!data) throw lastError || new Error("Opslaan mislukt");

        await clearPendingFromIndexedDb();
        pendingBlob = null;

        renderSaved(data.storyId, data.manageToken);
      } catch (error) {
        renderError(
          "Je verhaal staat veilig op dit apparaat. TALERA heeft het automatisch opnieuw geprobeerd, maar kon het nog niet online bewaren.",
          safelyUploadPending,
          "Nog eens proberen"
        );
      }
    }

    function renderUploading() {
      shell(\`
        <div class="presence" style="--voice:0">\${markSvg()}</div>
        <h1>Je verhaal wordt bewaard.</h1>
      \`);
    }

    function renderSaved(storyId, manageToken) {
      shell(\`
        <div class="saved-check">✓</div>
        <h1>Je verhaal is bewaard.</h1>
        <div class="actions">
          <button id="shareBtn" class="btn btn-primary">Deel via WhatsApp</button>
          <button id="doneBtn" class="btn btn-text">Klaar voor nu</button>
        </div>
      \`);

      document.querySelector("#shareBtn").addEventListener("click", () => shareStory(storyId, manageToken));
      document.querySelector("#doneBtn").addEventListener("click", renderHome);
    }

    async function shareStory(storyId, manageToken) {
      const button = document.querySelector("#shareBtn");
      button.disabled = true;
      button.textContent = "Link maken…";

      try {
        const response = await fetch("/api/stories/" + encodeURIComponent(storyId) + "/share", {
          method: "POST",
          headers: { authorization: "Bearer " + manageToken },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Delen mislukt");

        const text = "Ik heb iets voor je verteld in TALERA. Luister hier: " + data.shareUrl;
        const whatsappUrl = "https://wa.me/?text=" + encodeURIComponent(text);

        button.disabled = false;
        button.textContent = "Deel via WhatsApp";

        window.location.href = whatsappUrl;
      } catch (error) {
        button.disabled = false;
        button.textContent = "Probeer delen opnieuw";
      }
    }

    async function renderSharedStory(token) {
      shell(\`
        <div class="presence" style="--voice:0">\${markSvg()}</div>
        <h1>Even laden…</h1>
      \`);

      try {
        const response = await fetch("/api/s/" + encodeURIComponent(token));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Niet beschikbaar");

        const isTextStory = data.storyType === "text";
        const who = data.displayName
          ? escapeHtml(data.displayName) + (isTextStory ? " heeft iets voor je geschreven." : " heeft iets voor je verteld.")
          : (isTextStory ? "Iemand heeft iets voor je geschreven." : "Iemand heeft iets voor je verteld.");

        shell(\`
          <h1>\${who}</h1>
          <div class="actions">
            <button id="openStoryBtn" class="btn btn-primary">\${isTextStory ? "Lees" : "Luister"}</button>
          </div>
        \`);

        document.querySelector("#openStoryBtn").addEventListener("click", () => {
          if (isTextStory) startReading(data, token);
          else startListening(data, token);
        });
      } catch (error) {
        shell(\`
          <h1>Deze link werkt niet meer.</h1>
          <p class="lead">Vraag de afzender om een nieuwe link.</p>
        \`, "TALERA");
      }
    }

    function startReading(data, token) {
      shell(\`
        <div class="text-story">\${escapeHtml(data.textContent || "")}</div>
        <div class="actions">
          <button id="writeOwnBtn" class="btn btn-primary btn-compact">Schrijf iets van jou</button>
          <button id="tellOwnBtn" class="type-link">Of vertel</button>
        </div>
      \`);

      document.querySelector("#writeOwnBtn").addEventListener("click", () => {
        const name = getDisplayName();
        if (name) renderTextComposer(token, null);
        else renderNamePrompt(token, null, "text");
      });

      document.querySelector("#tellOwnBtn").addEventListener("click", () => {
        const name = getDisplayName();
        if (name) renderRecordingReady(token, null);
        else renderNamePrompt(token, null, "voice");
      });
    }

    function startListening(data, token) {
      shell(\`
        <div id="listenControls" class="listen-card">
          <button id="playBtn" class="play" aria-label="Pauze">Ⅱ</button>
          <div class="progress-wrap">
            <div class="progress"><div id="progressFill"></div></div>
          </div>
          <audio id="audio" preload="metadata" src="\${escapeAttr(data.audioUrl)}"></audio>
        </div>
        <div id="afterListen" class="actions" hidden></div>
      \`);

      const audio = document.querySelector("#audio");
      const playBtn = document.querySelector("#playBtn");
      const fill = document.querySelector("#progressFill");
      const listenControls = document.querySelector("#listenControls");
      let firstPlay = true;

      const updateButton = () => {
        playBtn.textContent = audio.paused ? "▶" : "Ⅱ";
        playBtn.setAttribute("aria-label", audio.paused ? "Afspelen" : "Pauze");
      };

      playBtn.addEventListener("click", async () => {
        if (audio.paused) await audio.play();
        else audio.pause();
        updateButton();
      });

      audio.addEventListener("play", () => {
        updateButton();
        if (firstPlay) {
          firstPlay = false;
          postEvent("playback_started", {
            storyId: data.storyId,
            shareId: data.shareId,
          });
        }
      });

      audio.addEventListener("pause", updateButton);

      audio.addEventListener("timeupdate", () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          fill.style.width = Math.min(100, (audio.currentTime / audio.duration) * 100) + "%";
        }
      });

      audio.addEventListener("ended", () => {
        updateButton();
        fill.style.width = "100%";
        if (listenControls) {
          listenControls.hidden = true;
          listenControls.style.display = "none";
        }

        postEvent("playback_completed", {
          storyId: data.storyId,
          shareId: data.shareId,
        });

        window.setTimeout(() => showReplyPrompt(data, token), 450);
      });

      audio.play().catch(() => {
        updateButton();
      });
    }

    function showReplyPrompt(data, token) {
      const after = document.querySelector("#afterListen");
      const audio = document.querySelector("#audio");
      const fill = document.querySelector("#progressFill");
      const listenControls = document.querySelector("#listenControls");
      if (!after || !audio) return;

      const variant = getReplyExperimentVariant(data.shareId);

      const invitationByVariant = {
        A: \`
          <div class="fade-in" style="display:grid;gap:12px;width:100%;place-items:center;text-align:center;">
            <button id="replyBtn" class="btn btn-primary btn-compact">Vertel</button>
            <button id="typeReplyBtn" class="type-link">Typ liever</button>
            <button id="replayBtn" class="replay-link">Nog eens luisteren</button>
          </div>
        \`,
        B: \`
          <div class="fade-in" style="display:grid;gap:12px;width:100%;place-items:center;text-align:center;">
            <h2>Vertel eens iets van jou.</h2>
            <button id="replyBtn" class="btn btn-primary btn-compact">Vertel</button>
            <button id="typeReplyBtn" class="type-link">Typ liever</button>
            <button id="replayBtn" class="replay-link">Nog eens luisteren</button>
          </div>
        \`,
        C: \`
          <div class="fade-in" style="display:grid;width:100%;place-items:center;text-align:center;">
            <button id="replyBtn" class="voice-orb" aria-label="Tik om te vertellen">
              <span class="voice-orb-label">Tik</span>
            </button>
            <button id="typeReplyBtn" class="type-link">Typ liever</button>
          </div>
        \`,
      };

      after.hidden = false;
      after.innerHTML = invitationByVariant[variant];

      postEvent("invitation_seen", {
        storyId: data.storyId,
        shareId: data.shareId,
        detail: experimentDetail(variant),
      });

      document.querySelector("#replyBtn").addEventListener("click", () => {
        postEvent("reply_started", {
          storyId: data.storyId,
          shareId: data.shareId,
          detail: experimentDetail(variant),
        });

        const name = getDisplayName();
        if (!name) {
          renderNamePrompt(token, variant);
        } else if (variant === "C") {
          activateApprovedVoiceFlow(token, variant);
        } else {
          renderRecordingReady(token, variant);
        }
      });

      const typeReplyBtn = document.querySelector("#typeReplyBtn");
      if (typeReplyBtn) {
        typeReplyBtn.addEventListener("click", () => {
          const name = getDisplayName();
          if (name) renderTextComposer(token, variant);
          else renderNamePrompt(token, variant, "text");
        });
      }

      const replayBtn = document.querySelector("#replayBtn");
      if (replayBtn) {
        replayBtn.addEventListener("click", async () => {
          after.hidden = true;
          if (listenControls) {
            listenControls.hidden = false;
            listenControls.style.display = "grid";
          }
          audio.currentTime = 0;
          if (fill) fill.style.width = "0%";
          try {
            await audio.play();
          } catch (_) {}
        });
      }
    }

    function renderError(message, retry, label = "Probeer opnieuw") {
      shell(\`
        <h1>Dat lukte nog niet.</h1>
        <div class="error">\${escapeHtml(message)}</div>
        <div class="actions">
          <button id="retryBtn" class="btn btn-primary">\${escapeHtml(label)}</button>
        </div>
      \`);

      document.querySelector("#retryBtn").addEventListener("click", retry);
    }

    function startVoiceAnimation() {
      const state = recorderState;
      if (!state) return;

      const data = new Uint8Array(state.analyser.fftSize);

      const tick = () => {
        if (!recorderState || state.mediaRecorder.state === "inactive") return;

        if (state.mediaRecorder.state === "paused") {
          state.voiceLevel = 0;
          const pausedPresence = document.querySelector("#presence");
          if (pausedPresence) pausedPresence.style.setProperty("--voice", "0");
          state.voiceFrame = requestAnimationFrame(tick);
          return;
        }

        state.analyser.getByteTimeDomainData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const value = (data[i] - 128) / 128;
          sum += value * value;
        }

        const rms = Math.sqrt(sum / data.length);

        // Phone microphones vary a lot in gain. Keep the silence gate low,
        // then amplify real speech strongly enough to make the feedback obvious.
        let target = Math.min(1, Math.max(0, (rms - .0065) * 24));
        if (target < .05) target = 0;

        // Fast attack and clear fall-back to silence.
        if (target > state.voiceLevel) {
          state.voiceLevel = target;
        } else {
          state.voiceLevel = Math.max(0, state.voiceLevel * .52);
          if (state.voiceLevel < .035) state.voiceLevel = 0;
        }

        const normalized = state.voiceLevel;
        const presence = document.querySelector("#presence");
        if (presence) presence.style.setProperty("--voice", normalized.toFixed(3));

        if (!state.controlsRevealed) {
          if (normalized > .13) {
            state.voiceActiveFrames += 1;
          } else {
            state.voiceActiveFrames = Math.max(0, state.voiceActiveFrames - 1);
          }

          // Roughly a tenth of a second of real speech is enough.
          if (state.voiceActiveFrames >= 6) {
            revealRecordingControls();
          }
        }

        state.voiceFrame = requestAnimationFrame(tick);
      };

      tick();
    }

    function currentDurationSeconds(state) {
      let paused = state.pausedTotal;
      if (state.pauseStartedAt) paused += performance.now() - state.pauseStartedAt;
      return Math.max(0, (performance.now() - state.startAt - paused) / 1000);
    }

    function chooseMimeType() {
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];

      if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
      return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
    }

    async function postEvent(eventName, values = {}) {
      try {
        await fetch("/api/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            eventName,
            storyId: values.storyId || null,
            shareId: values.shareId || null,
            sessionId,
            detail: values.detail || null,
          }),
          keepalive: true,
        });
      } catch {}
    }

    function escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function escapeAttr(value) {
      return escapeHtml(value);
    }

    function savePendingToIndexedDb(value) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("xxory-local-safety", 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("pending")) {
            db.createObjectStore("pending");
          }
        };

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("pending", "readwrite");
          tx.objectStore("pending").put(value, "latest");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      });
    }

    function loadPendingFromIndexedDb() {
      return new Promise((resolve) => {
        const request = indexedDB.open("xxory-local-safety", 1);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("pending")) {
            db.createObjectStore("pending");
          }
        };

        request.onerror = () => resolve(null);

        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("pending", "readonly");
          const get = tx.objectStore("pending").get("latest");
          get.onsuccess = () => {
            const value = get.result || null;
            db.close();
            resolve(value);
          };
          get.onerror = () => {
            db.close();
            resolve(null);
          };
        };
      });
    }

    function clearPendingFromIndexedDb() {
      return new Promise((resolve) => {
        const request = indexedDB.open("xxory-local-safety", 1);

        request.onerror = () => resolve();

        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("pending", "readwrite");
          tx.objectStore("pending").delete("latest");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            resolve();
          };
        };
      });
    }

    async function boot() {
      try {
        const pendingText = localStorage.getItem("talera-pending-text-story-v1");
        if (pendingText) {
          const parsed = JSON.parse(pendingText);
          if (parsed && parsed.text) {
            pendingTextStory = parsed;
            await safelyUploadPendingText();
            return;
          }
        }
      } catch {}

      const pending = await loadPendingFromIndexedDb();
      if (pending && pending.blob) {
        pendingBlob = pending;
        await safelyUploadPending();
        return;
      }

      const shareMatch = location.pathname.match(/^\\/s\\/([^/]+)$/);
      if (shareMatch) {
        renderSharedStory(decodeURIComponent(shareMatch[1]));
      } else {
        renderHome();
      }
    }

    boot();
  </script>
</body>
</html>`;
}
