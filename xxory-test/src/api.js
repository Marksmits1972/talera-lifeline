import { Buffer } from "node:buffer";

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const MAX_MEDIA_BYTES = 35 * 1024 * 1024;
const MAX_STORY_TEXT_CHARS = 20000;
const MAX_PEOPLE = 12;

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
  `CREATE TABLE IF NOT EXISTS story_metadata (
    story_id TEXT PRIMARY KEY,
    transcript TEXT,
    title TEXT,
    event_time_label TEXT,
    event_time_start TEXT,
    event_time_end TEXT,
    event_time_precision TEXT,
    place TEXT,
    people_json TEXT NOT NULL DEFAULT '[]',
    ai_status TEXT NOT NULL DEFAULT 'pending',
    confirmed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(story_id) REFERENCES stories(id)
  )`,
  `CREATE TABLE IF NOT EXISTS story_media (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    object_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'attachment',
    sort_order INTEGER NOT NULL DEFAULT 0,
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
  `CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name)`
];

let schemaPromise = null;

export async function ensureSchema(env) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      for (const statement of SCHEMA_STATEMENTS) await env.DB.prepare(statement).run();
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function handleApi(request, env, url) {
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/health") {
    return json({ ok: true, database: "connected", media: "connected", ai: Boolean(env.AI) });
  }

  if (request.method === "POST" && path === "/api/stories") {
    return createStory(request, env);
  }

  let match = path.match(/^\/api\/stories\/([^/]+)$/);
  if (request.method === "GET" && match) return getOwnerStory(request, env, match[1]);

  match = path.match(/^\/api\/stories\/([^/]+)\/enrich$/);
  if (request.method === "POST" && match) return enrichStory(request, env, match[1]);

  match = path.match(/^\/api\/stories\/([^/]+)\/metadata$/);
  if (request.method === "PUT" && match) return confirmMetadata(request, env, match[1]);

  match = path.match(/^\/api\/stories\/([^/]+)\/media$/);
  if (request.method === "POST" && match) return addMedia(request, env, match[1]);

  match = path.match(/^\/api\/stories\/([^/]+)\/media\/([^/]+)$/);
  if (request.method === "GET" && match) return getOwnerMedia(request, env, match[1], match[2]);

  match = path.match(/^\/api\/stories\/([^/]+)\/share$/);
  if (request.method === "POST" && match) return createShare(request, env, match[1], url);

  match = path.match(/^\/api\/s\/([^/]+)$/);
  if (request.method === "GET" && match) return getSharedStory(env, match[1]);

  match = path.match(/^\/api\/s\/([^/]+)\/audio$/);
  if (request.method === "GET" && match) return getSharedAudio(request, env, match[1]);

  match = path.match(/^\/api\/s\/([^/]+)\/media\/([^/]+)$/);
  if (request.method === "GET" && match) return getSharedMedia(request, env, match[1], match[2]);

  if (request.method === "POST" && path === "/api/events") return recordEvent(request, env);

  return json({ error: "Niet gevonden." }, 404);
}

async function createStory(request, env) {
  const form = await request.formData();
  const audio = form.get("audio");
  const storyText = cleanText(form.get("storyText"), MAX_STORY_TEXT_CHARS);
  const startPhoto = form.get("startPhoto");
  const hasAudio = audio instanceof File && audio.size > 0;
  const hasText = Boolean(storyText);

  if (!hasAudio && !hasText) return json({ error: "Verhaal ontbreekt." }, 400);
  if (hasAudio && hasText) return json({ error: "Kies één manier: inspreken of typen." }, 400);
  if (hasAudio && audio.size > MAX_AUDIO_BYTES) return json({ error: "Deze opname is te groot." }, 413);
  if (startPhoto instanceof File && startPhoto.size > MAX_MEDIA_BYTES) return json({ error: "De gekozen foto is te groot." }, 413);
  if (startPhoto instanceof File && startPhoto.size && !String(startPhoto.type || "").startsWith("image/")) {
    return json({ error: "Als startanker kan alleen een foto worden gekozen." }, 400);
  }

  const storyId = randomToken(16);
  const manageToken = randomToken(32);
  const manageTokenHash = await sha256(manageToken);
  const createdAt = new Date().toISOString();
  const mimeType = hasAudio ? (audio.type || "application/octet-stream") : "text/plain";
  const objectKey = hasAudio ? `stories/${storyId}/audio.${extensionForMime(mimeType)}` : "";
  const duration = hasAudio ? parseOptionalNumber(form.get("durationSeconds")) : null;
  const displayName = cleanText(form.get("displayName"), 80);

  if (hasAudio) {
    await env.MEDIA.put(objectKey, audio, {
      httpMetadata: { contentType: mimeType },
      customMetadata: { storyId, createdAt, kind: "audio" }
    });
  }

  try {
    await env.DB.prepare(`
      INSERT INTO stories (
        id, created_at, audio_object_key, audio_mime_type, audio_size_bytes,
        duration_seconds, display_name, manage_token_hash, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).bind(
      storyId, createdAt, objectKey, mimeType, hasAudio ? audio.size : 0,
      duration, displayName, manageTokenHash
    ).run();

    if (hasText) {
      await env.DB.prepare(`INSERT INTO story_texts (story_id, text_content) VALUES (?, ?)`)
        .bind(storyId, storyText).run();
    }

    await env.DB.prepare(`
      INSERT INTO story_metadata (story_id, people_json, ai_status, confirmed, updated_at)
      VALUES (?, '[]', 'pending', 0, ?)
    `).bind(storyId, createdAt).run();

    if (startPhoto instanceof File && startPhoto.size > 0) {
      await storeMediaFile(env, storyId, startPhoto, "start_photo", 0);
    }
  } catch (error) {
    try { await env.DB.prepare(`DELETE FROM story_media WHERE story_id = ?`).bind(storyId).run(); } catch {}
    try { await env.DB.prepare(`DELETE FROM story_metadata WHERE story_id = ?`).bind(storyId).run(); } catch {}
    try { await env.DB.prepare(`DELETE FROM story_texts WHERE story_id = ?`).bind(storyId).run(); } catch {}
    try { await env.DB.prepare(`DELETE FROM stories WHERE id = ?`).bind(storyId).run(); } catch {}
    if (hasAudio) try { await env.MEDIA.delete(objectKey); } catch {}
    throw error;
  }

  await insertEvent(env, hasAudio ? "recording_completed" : "text_story_completed", storyId, null, null, null);

  return json({ storyId, manageToken, createdAt, storyType: hasAudio ? "audio" : "text" }, 201);
}

async function enrichStory(request, env, storyId) {
  const story = await requireOwner(request, env, storyId);
  if (story instanceof Response) return story;

  let transcript = "";
  const textRow = await env.DB.prepare(`SELECT text_content FROM story_texts WHERE story_id = ?`).bind(storyId).first();
  if (textRow?.text_content) transcript = String(textRow.text_content).trim();

  try {
    if (!transcript && story.audio_object_key) {
      if (!env.AI) throw new Error("AI-binding ontbreekt");
      const object = await env.MEDIA.get(story.audio_object_key);
      if (!object) throw new Error("Audio niet gevonden");
      if (object.size > 22 * 1024 * 1024) throw new Error("Opname te groot voor directe transcriptie in deze prototypeversie");
      const buffer = await object.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const result = await env.AI.run("@cf/openai/whisper-large-v3-turbo", {
        audio: base64,
        task: "transcribe",
        language: "nl",
        vad_filter: true,
        condition_on_previous_text: true
      });
      transcript = String(result?.text || result?.transcription_info?.text || "").trim();
      if (!transcript) throw new Error("Transcriptie leverde geen tekst op");
    }

    if (!env.AI) throw new Error("AI-binding ontbreekt");
    const proposal = await extractMetadataWithAi(env, transcript, story.created_at);
    await saveMetadataProposal(env, storyId, transcript, proposal, "ready");
    return json({ ok: true, aiAvailable: true, transcript, proposal });
  } catch (error) {
    const notice = String(error?.message || error || "AI-verwerking mislukt");
    const fallback = {
      title: "",
      timeLabel: "",
      timeStart: "",
      timeEnd: "",
      timePrecision: "unknown",
      place: "",
      people: []
    };
    await saveMetadataProposal(env, storyId, transcript, fallback, "needs_review");
    return json({ ok: true, aiAvailable: false, transcript, proposal: fallback, notice });
  }
}

async function extractMetadataWithAi(env, transcript, createdAt) {
  const schema = {
    type: "object",
    properties: {
      title: { type: "string" },
      timeLabel: { type: "string" },
      timeStart: { type: "string" },
      timeEnd: { type: "string" },
      timePrecision: { type: "string", enum: ["exact_date", "month", "season", "year", "period", "unknown"] },
      place: { type: "string" },
      people: { type: "array", items: { type: "string" }, maxItems: MAX_PEOPLE }
    },
    required: ["title", "timeLabel", "timeStart", "timeEnd", "timePrecision", "place", "people"]
  };

  const system = [
    "Je verwerkt één persoonlijk levensverhaal voor TALERA.",
    "Haal alleen informatie uit het verhaal die nodig is om de herinnering te herkennen en op een levenslijn te plaatsen.",
    "Maak een korte specifieke titel die de kern van DIT verhaal benoemt; nooit een generieke titel als alleen 'Zomer 1952'.",
    "Tijd betekent wanneer de gebeurtenis in het verhaal plaatsvond, niet wanneer de opname is gemaakt.",
    "Gebruik alleen precisie die het verhaal echt ondersteunt. Verzin geen dag, maand, jaar, plaats of persoon.",
    "timeLabel is menselijk Nederlands, bijvoorbeeld 'zomer 1952', 'rond 1988' of '14 mei 1982'.",
    "timeStart en timeEnd zijn ISO-datums YYYY-MM-DD als een verantwoorde grens kan worden afgeleid; anders lege strings.",
    "Neem alleen personen op die een betekenisvolle rol in de herinnering hebben. Houd relaties zoals 'oma' als er geen naam is genoemd.",
    "Als plaats of tijd niet uit het verhaal blijkt: gebruik een lege string en precision unknown.",
    "Schrijf in het Nederlands."
  ].join(" ");

  const user = `Opnamedatum ter referentie voor relatieve tijdsaanduidingen: ${createdAt}.\n\nVERHAAL:\n${transcript}`;

  const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: { type: "json_schema", json_schema: schema },
    max_tokens: 650,
    temperature: 0.15
  });

  const value = result?.response ?? result;
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return {
    title: cleanText(parsed?.title, 140) || "",
    timeLabel: cleanText(parsed?.timeLabel, 120) || "",
    timeStart: cleanIsoDate(parsed?.timeStart),
    timeEnd: cleanIsoDate(parsed?.timeEnd),
    timePrecision: ["exact_date", "month", "season", "year", "period", "unknown"].includes(parsed?.timePrecision) ? parsed.timePrecision : "unknown",
    place: cleanText(parsed?.place, 140) || "",
    people: cleanPeople(parsed?.people)
  };
}

async function saveMetadataProposal(env, storyId, transcript, proposal, status) {
  await env.DB.prepare(`
    INSERT INTO story_metadata (
      story_id, transcript, title, event_time_label, event_time_start, event_time_end,
      event_time_precision, place, people_json, ai_status, confirmed, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    ON CONFLICT(story_id) DO UPDATE SET
      transcript=excluded.transcript,
      title=excluded.title,
      event_time_label=excluded.event_time_label,
      event_time_start=excluded.event_time_start,
      event_time_end=excluded.event_time_end,
      event_time_precision=excluded.event_time_precision,
      place=excluded.place,
      people_json=excluded.people_json,
      ai_status=excluded.ai_status,
      confirmed=0,
      updated_at=excluded.updated_at
  `).bind(
    storyId,
    transcript || null,
    proposal.title || null,
    proposal.timeLabel || null,
    proposal.timeStart || null,
    proposal.timeEnd || null,
    proposal.timePrecision || "unknown",
    proposal.place || null,
    JSON.stringify(proposal.people || []),
    status,
    new Date().toISOString()
  ).run();
}

async function confirmMetadata(request, env, storyId) {
  const story = await requireOwner(request, env, storyId);
  if (story instanceof Response) return story;

  let payload;
  try { payload = await request.json(); } catch { return json({ error: "Ongeldige gegevens." }, 400); }

  const title = cleanText(payload.title, 140);
  const timeLabel = cleanText(payload.timeLabel, 120);
  const place = cleanText(payload.place, 140);
  const people = cleanPeople(payload.people);
  const timeStart = cleanIsoDate(payload.timeStart);
  const timeEnd = cleanIsoDate(payload.timeEnd);
  const precision = ["exact_date", "month", "season", "year", "period", "unknown"].includes(payload.timePrecision)
    ? payload.timePrecision
    : "unknown";

  if (!title) return json({ error: "Een titel helpt om dit verhaal later terug te vinden." }, 400);

  await env.DB.prepare(`
    UPDATE story_metadata
    SET title=?, event_time_label=?, event_time_start=?, event_time_end=?, event_time_precision=?,
        place=?, people_json=?, ai_status='confirmed', confirmed=1, updated_at=?
    WHERE story_id=?
  `).bind(
    title, timeLabel, timeStart, timeEnd, precision, place, JSON.stringify(people), new Date().toISOString(), storyId
  ).run();

  return json({ ok: true, metadata: { title, timeLabel: timeLabel || "", timeStart, timeEnd, timePrecision: precision, place: place || "", people } });
}

async function addMedia(request, env, storyId) {
  const story = await requireOwner(request, env, storyId);
  if (story instanceof Response) return story;

  const form = await request.formData();
  const files = form.getAll("media").filter((item) => item instanceof File && item.size > 0);
  if (!files.length) return json({ error: "Geen media gekozen." }, 400);
  if (files.length > 12) return json({ error: "Voeg maximaal 12 bestanden per keer toe." }, 400);

  const existing = await env.DB.prepare(`SELECT COUNT(*) AS count FROM story_media WHERE story_id=?`).bind(storyId).first();
  let order = Number(existing?.count || 0);
  const stored = [];

  for (const file of files) {
    const mime = String(file.type || "application/octet-stream");
    if (!mime.startsWith("image/") && !mime.startsWith("video/")) continue;
    if (file.size > MAX_MEDIA_BYTES) return json({ error: "Een van de mediabestanden is te groot." }, 413);
    stored.push(await storeMediaFile(env, storyId, file, "attachment", order++));
  }

  if (!stored.length) return json({ error: "Kies een foto of video." }, 400);
  return json({ ok: true, media: stored }, 201);
}

async function storeMediaFile(env, storyId, file, role, sortOrder) {
  const id = randomToken(12);
  const mime = String(file.type || "application/octet-stream");
  const ext = extensionForMediaMime(mime);
  const objectKey = `stories/${storyId}/media/${id}.${ext}`;
  const createdAt = new Date().toISOString();

  await env.MEDIA.put(objectKey, file, {
    httpMetadata: { contentType: mime },
    customMetadata: { storyId, mediaId: id, role, createdAt }
  });

  try {
    await env.DB.prepare(`
      INSERT INTO story_media (id, story_id, object_key, mime_type, size_bytes, role, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, storyId, objectKey, mime, file.size, role, sortOrder, createdAt).run();
  } catch (error) {
    try { await env.MEDIA.delete(objectKey); } catch {}
    throw error;
  }

  return { id, mimeType: mime, role, sortOrder };
}

async function getOwnerStory(request, env, storyId) {
  const story = await requireOwner(request, env, storyId);
  if (story instanceof Response) return story;
  const meta = await env.DB.prepare(`SELECT * FROM story_metadata WHERE story_id=?`).bind(storyId).first();
  const media = await env.DB.prepare(`SELECT id,mime_type,role,sort_order FROM story_media WHERE story_id=? ORDER BY sort_order,id`).bind(storyId).all();
  return json({
    storyId,
    createdAt: story.created_at,
    durationSeconds: story.duration_seconds,
    storyType: story.audio_object_key ? "audio" : "text",
    metadata: metadataFromRow(meta),
    media: (media.results || []).map((m) => ({ id: m.id, mimeType: m.mime_type, role: m.role, sortOrder: m.sort_order, url: `/api/stories/${encodeURIComponent(storyId)}/media/${encodeURIComponent(m.id)}` }))
  });
}

async function getOwnerMedia(request, env, storyId, mediaId) {
  const story = await requireOwner(request, env, storyId);
  if (story instanceof Response) return story;
  const row = await env.DB.prepare(`SELECT * FROM story_media WHERE id=? AND story_id=?`).bind(mediaId, storyId).first();
  if (!row) return new Response("Niet gevonden", { status: 404 });
  return streamR2(request, env, row.object_key, row.mime_type);
}

async function createShare(request, env, storyId, url) {
  const story = await requireOwner(request, env, storyId);
  if (story instanceof Response) return story;

  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const shareId = randomToken(16);
  const createdAt = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO shares (id, story_id, token_hash, created_at) VALUES (?, ?, ?, ?)`)
    .bind(shareId, storyId, tokenHash, createdAt).run();
  await insertEvent(env, "shared", storyId, shareId, null, null);

  const prefix = cleanPublicPrefix(request.headers.get("x-talera-public-prefix"));
  return json({ shareId, shareUrl: `${url.origin}${prefix}/s/${encodeURIComponent(token)}`, createdAt }, 201);
}

async function getSharedStory(env, token) {
  const share = await getShareRow(env, token);
  if (!isShareActive(share)) return json({ error: "Deze link is niet meer beschikbaar." }, 404);
  const meta = await env.DB.prepare(`SELECT * FROM story_metadata WHERE story_id=?`).bind(share.story_id).first();
  const text = await env.DB.prepare(`SELECT text_content FROM story_texts WHERE story_id=?`).bind(share.story_id).first();
  const media = await env.DB.prepare(`SELECT id,mime_type,role,sort_order FROM story_media WHERE story_id=? ORDER BY sort_order,id`).bind(share.story_id).all();

  await insertEvent(env, "story_opened", share.story_id, share.share_id, null, null);
  return json({
    shareId: share.share_id,
    storyId: share.story_id,
    createdAt: share.created_at_story,
    durationSeconds: share.duration_seconds,
    displayName: share.display_name || null,
    storyType: text?.text_content ? "text" : "audio",
    textContent: text?.text_content || null,
    audioUrl: text?.text_content ? null : `/api/s/${encodeURIComponent(token)}/audio`,
    metadata: metadataFromRow(meta),
    media: (media.results || []).map((m) => ({ id: m.id, mimeType: m.mime_type, role: m.role, sortOrder: m.sort_order, url: `/api/s/${encodeURIComponent(token)}/media/${encodeURIComponent(m.id)}` }))
  });
}

async function getSharedAudio(request, env, token) {
  const share = await getShareRow(env, token);
  if (!isShareActive(share) || !share.audio_object_key) return new Response("Niet beschikbaar", { status: 404 });
  return streamR2(request, env, share.audio_object_key, share.audio_mime_type);
}

async function getSharedMedia(request, env, token, mediaId) {
  const share = await getShareRow(env, token);
  if (!isShareActive(share)) return new Response("Niet beschikbaar", { status: 404 });
  const row = await env.DB.prepare(`SELECT * FROM story_media WHERE id=? AND story_id=?`).bind(mediaId, share.story_id).first();
  if (!row) return new Response("Niet beschikbaar", { status: 404 });
  return streamR2(request, env, row.object_key, row.mime_type);
}

async function getShareRow(env, token) {
  const tokenHash = await sha256(token);
  return env.DB.prepare(`
    SELECT sh.id AS share_id, sh.story_id, sh.expires_at, sh.revoked_at,
           st.created_at AS created_at_story, st.duration_seconds, st.display_name,
           st.audio_object_key, st.audio_mime_type, st.status
    FROM shares sh JOIN stories st ON st.id=sh.story_id
    WHERE sh.token_hash=? LIMIT 1
  `).bind(tokenHash).first();
}

async function streamR2(request, env, objectKey, mimeType) {
  const object = await env.MEDIA.get(objectKey, { onlyIf: request.headers, range: request.headers });
  if (!object) return new Response("Niet gevonden", { status: 404 });
  if (!("body" in object)) return new Response(null, { status: 412 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", mimeType || headers.get("content-type") || "application/octet-stream");
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
  } else headers.set("content-length", String(object.size));
  return new Response(object.body, { status, headers });
}

async function requireOwner(request, env, storyId) {
  const token = bearerToken(request);
  if (!token) return json({ error: "Beheer-token ontbreekt." }, 401);
  const story = await env.DB.prepare(`SELECT * FROM stories WHERE id=?`).bind(storyId).first();
  if (!story || story.status !== "active") return json({ error: "Verhaal niet gevonden." }, 404);
  if (!(await secureHashMatch(token, story.manage_token_hash))) return json({ error: "Geen toegang." }, 403);
  return story;
}

async function recordEvent(request, env) {
  let payload = {};
  try { payload = await request.json(); } catch { return json({ error: "Ongeldig event." }, 400); }
  const allowed = new Set([
    "recording_started", "recording_first_speech", "recording_paused", "recording_resumed",
    "recording_completed", "typing_started", "text_story_completed", "ai_enrichment_started",
    "ai_enrichment_completed", "metadata_confirmed", "media_added", "shared", "story_opened",
    "playback_started", "playback_completed"
  ]);
  if (!allowed.has(payload.eventName)) return json({ error: "Event niet toegestaan." }, 400);
  await insertEvent(env, payload.eventName, cleanText(payload.storyId, 100), cleanText(payload.shareId, 100), cleanText(payload.sessionId, 100), payload.detail ? JSON.stringify(payload.detail).slice(0, 1600) : null);
  return json({ ok: true });
}

async function insertEvent(env, eventName, storyId, shareId, sessionId, detail) {
  await env.DB.prepare(`INSERT INTO events (created_at,event_name,story_id,share_id,anonymous_session_id,detail) VALUES (?,?,?,?,?,?)`)
    .bind(new Date().toISOString(), eventName, storyId, shareId, sessionId, detail).run();
}

function metadataFromRow(row) {
  if (!row) return null;
  let people = [];
  try { people = JSON.parse(row.people_json || "[]"); } catch {}
  return {
    transcript: row.transcript || "",
    title: row.title || "",
    timeLabel: row.event_time_label || "",
    timeStart: row.event_time_start || "",
    timeEnd: row.event_time_end || "",
    timePrecision: row.event_time_precision || "unknown",
    place: row.place || "",
    people: Array.isArray(people) ? people : [],
    aiStatus: row.ai_status || "pending",
    confirmed: Boolean(row.confirmed)
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

function cleanPeople(value) {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const result = [];
  for (const item of source) {
    const cleaned = cleanText(String(item ?? ""), 100);
    if (!cleaned) continue;
    const key = cleaned.toLocaleLowerCase("nl-NL");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= MAX_PEOPLE) break;
  }
  return result;
}

function cleanIsoDate(value) {
  if (typeof value !== "string") return "";
  const v = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function extensionForMime(mime) {
  const value = String(mime || "").toLowerCase();
  if (value.includes("mp4") || value.includes("m4a")) return "m4a";
  if (value.includes("ogg")) return "ogg";
  if (value.includes("wav")) return "wav";
  if (value.includes("aac")) return "aac";
  return "webm";
}

function extensionForMediaMime(mime) {
  const value = String(mime || "").toLowerCase();
  if (value.includes("jpeg")) return "jpg";
  if (value.includes("png")) return "png";
  if (value.includes("webp")) return "webp";
  if (value.includes("heic") || value.includes("heif")) return "heic";
  if (value.includes("quicktime")) return "mov";
  if (value.includes("mp4")) return "mp4";
  return value.startsWith("video/") ? "video" : "bin";
}

function cleanPublicPrefix(value) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v || v === "/") return "";
  if (!v.startsWith("/") || v.includes("..") || v.includes("?") || v.includes("#")) return "";
  return v.replace(/\/$/, "");
}

function randomToken(bytes) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
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

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
