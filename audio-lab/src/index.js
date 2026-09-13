const APP_REV = "audio-lab-v2-20260913";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        app: "TALERA Audio Lab",
        revision: APP_REV,
        storageBound: Boolean(env.AUDIO),
      });
    }

    if (url.pathname === "/api/audio" && request.method === "POST") {
      return uploadAudio(request, env);
    }

    const audioMatch = url.pathname.match(/^\/api\/audio\/([A-Za-z0-9_-]{20,80})$/);
    if (audioMatch && (request.method === "GET" || request.method === "HEAD")) {
      return readAudio(request, env, audioMatch[1]);
    }
    if (audioMatch && request.method === "DELETE") {
      return deleteAudio(env, audioMatch[1]);
    }

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/") {
      return new Response(request.method === "HEAD" ? null : HTML, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "no-store, max-age=0",
          "x-talera-audio-lab": APP_REV,
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

async function uploadAudio(request, env) {
  if (!env.AUDIO) return json({ error: "R2 binding AUDIO ontbreekt." }, 500);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Ongeldige multipart-upload." }, 400);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size <= 0) {
    return json({ error: "Geen audiobestand ontvangen." }, 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return json({ error: "Audiobestand is groter dan 10 MB." }, 413);
  }

  const bytes = await audio.arrayBuffer();
  const actualBytes = bytes.byteLength;
  if (actualBytes <= 0 || actualBytes !== audio.size) {
    return json({
      error: "De ontvangen audiobytes kloppen niet met het bestand.",
      fileBytes: audio.size,
      receivedBytes: actualBytes,
    }, 400);
  }

  const sha256 = await digestHex(bytes);
  const id = randomToken(24);
  const key = `audio-lab/${id}`;
  const mimeType = String(audio.type || "application/octet-stream");
  const createdAt = new Date().toISOString();

  await env.AUDIO.put(key, bytes, {
    httpMetadata: {
      contentType: mimeType,
      cacheControl: "no-store",
    },
    customMetadata: {
      labRevision: APP_REV,
      createdAt,
      originalBytes: String(actualBytes),
      sha256,
    },
  });

  const head = await env.AUDIO.head(key);
  const storedBytes = Number(head?.size || 0);
  const storedSha256 = String(head?.customMetadata?.sha256 || "");
  const storedMimeType = String(head?.httpMetadata?.contentType || mimeType);

  if (!head || storedBytes !== actualBytes || storedSha256 !== sha256) {
    try { await env.AUDIO.delete(key); } catch {}
    return json({
      error: "R2 kon de opslag niet exact bevestigen.",
      uploadedBytes: actualBytes,
      storedBytes,
      uploadedSha256: sha256,
      storedSha256,
    }, 500);
  }

  return json({
    ok: true,
    id,
    uploadedBytes: actualBytes,
    storedBytes,
    mimeType: storedMimeType,
    sha256,
    playbackUrl: `/api/audio/${encodeURIComponent(id)}`,
    createdAt,
    revision: APP_REV,
  }, 201);
}

async function readAudio(request, env, id) {
  if (!env.AUDIO) return json({ error: "R2 binding AUDIO ontbreekt." }, 500);
  const key = `audio-lab/${id}`;

  if (request.method === "HEAD") {
    const head = await env.AUDIO.head(key);
    if (!head) return new Response(null, { status: 404 });
    return new Response(null, {
      status: 200,
      headers: audioHeaders(head),
    });
  }

  const object = await env.AUDIO.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    status: 200,
    headers: audioHeaders(object),
  });
}

async function deleteAudio(env, id) {
  if (!env.AUDIO) return json({ error: "R2 binding AUDIO ontbreekt." }, 500);
  await env.AUDIO.delete(`audio-lab/${id}`);
  return json({ ok: true });
}

function audioHeaders(object) {
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/octet-stream");
  headers.set("content-length", String(object.size || 0));
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-talera-audio-lab", APP_REV);
  const sha = String(object?.customMetadata?.sha256 || "");
  if (sha) headers.set("x-audio-sha256", sha);
  return headers;
}

async function digestHex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store, max-age=0",
      "x-talera-audio-lab": APP_REV,
    },
  });
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let text = "";
  for (const byte of data) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f4f1eb">
<title>TALERA Audio Lab</title>
<style>
:root{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:#102947;background:#f4f1eb}
*{box-sizing:border-box}
body{margin:0;background:#f4f1eb;color:#102947;-webkit-text-size-adjust:100%}
button{font:inherit}
.page{max-width:760px;margin:0 auto;padding:24px 14px calc(44px + env(safe-area-inset-bottom))}
.topline{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
.eyebrow{font-size:11px;font-weight:850;letter-spacing:.14em;color:#6d7886}
.freeze{font-size:11px;font-weight:800;color:#35644f;background:#e5f1ea;border-radius:999px;padding:7px 10px;white-space:nowrap}
h1{font-size:clamp(32px,9vw,52px);line-height:.96;letter-spacing:-.045em;margin:12px 0 12px}
.intro{font-size:16px;line-height:1.48;color:#566474;margin:0 0 18px;max-width:650px}
.progress-card,.card{background:#fff;border:1px solid rgba(16,41,71,.08);box-shadow:0 12px 34px rgba(16,41,71,.055);border-radius:24px;padding:17px;margin:12px 0}
.progress-card{display:flex;align-items:center;gap:14px}
.ring{width:58px;height:58px;flex:0 0 58px;border-radius:50%;display:grid;place-items:center;background:#eef3f7;font-weight:900;font-size:17px}
.progress-copy strong{display:block;font-size:16px}.progress-copy span{display:block;font-size:13px;color:#71808e;margin-top:3px;line-height:1.35}
.step-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.step-head h2{font-size:18px;margin:0}.step-no{width:29px;height:29px;border-radius:50%;display:grid;place-items:center;background:#edf2f6;font-size:13px;font-weight:900}
.status{display:flex;align-items:center;gap:8px;border-radius:14px;background:#f4f6f8;padding:11px 12px;font-size:13px;font-weight:750;margin-bottom:12px}.status-dot{width:9px;height:9px;border-radius:50%;background:#97a2ad}.status.live .status-dot{background:#df6d58;box-shadow:0 0 0 5px rgba(223,109,88,.12)}.status.ok .status-dot{background:#2d8a61}.status.bad .status-dot{background:#b94b45}
.row{display:flex;gap:9px;flex-wrap:wrap}
.btn{appearance:none;border:0;border-radius:16px;min-height:52px;padding:0 17px;font-size:16px;font-weight:850;background:#102f55;color:#fff;touch-action:manipulation}.btn.secondary{background:#e9eff4;color:#102f55}.btn.warm{background:#f0ddd5;color:#7c4035}.btn.confirm{background:#246449}.btn:disabled{opacity:.33}.btn.wide{width:100%}
.metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.metric{background:#f6f7f8;border-radius:14px;padding:11px;min-width:0}.metric span{display:block;font-size:11px;color:#76818c;margin-bottom:4px}.metric strong{display:block;font-size:13px;word-break:break-word;line-height:1.3}.good{color:#247052}.wrong{color:#a23c35}.wait{color:#8a6423}
.help{font-size:12px;line-height:1.45;color:#71808d;margin:10px 1px 0}.hidden{display:none!important}
.pass{background:#e8f3ed;border:1px solid #c8e4d5;border-radius:18px;padding:14px;margin-top:12px;color:#245f48;font-weight:800;line-height:1.4}
.log{background:#101923;color:#d8e3ee;border-radius:17px;padding:13px;min-height:170px;max-height:300px;overflow:auto;white-space:pre-wrap;font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin-top:10px}.diag-actions{display:flex;gap:8px;flex-wrap:wrap}.mini{min-height:42px;font-size:13px;border-radius:13px}
@media(max-width:520px){.page{padding-left:10px;padding-right:10px}.progress-card,.card{border-radius:20px;padding:15px}.metrics{grid-template-columns:1fr}.row .btn{flex:1 1 44%}.topline{align-items:flex-start;flex-direction:column;gap:7px}}
</style>
</head>
<body>
<main class="page">
  <div class="topline">
    <div class="eyebrow">TALERA · AUDIO LAB · ${APP_REV}</div>
    <div class="freeze">TALERA zelf blijft bevroren</div>
  </div>
  <h1>Eerst bewijzen dat audio werkt.</h1>
  <p class="intro">Geen tijdlijn, geen Orb, geen transcriptie. Alleen de kale trein: opnemen op deze iPhone, lokaal terugluisteren, exact hetzelfde bestand naar R2 sturen en opnieuw vanaf de server horen.</p>

  <section class="progress-card">
    <div id="passRing" class="ring">0/10</div>
    <div class="progress-copy"><strong>Volledig geslaagde rondes</strong><span>We bouwen pas terug naar TALERA nadat deze keten tien keer achter elkaar goed loopt.</span></div>
  </section>

  <section class="card">
    <div class="step-head"><h2>1. Neem 5–10 seconden op</h2><div class="step-no">1</div></div>
    <div id="recordStatus" class="status"><span class="status-dot"></span><span id="recordStatusText">Klaar om te starten</span></div>
    <div class="row">
      <button id="startBtn" class="btn">Start opname</button>
      <button id="pauseBtn" class="btn secondary" disabled>Pauze</button>
      <button id="stopBtn" class="btn warm" disabled>Stop</button>
    </div>
    <div class="metrics">
      <div class="metric"><span>Microfoon</span><strong id="micMetric">Nog niet gevraagd</strong></div>
      <div class="metric"><span>MediaRecorder</span><strong id="recorderMetric">Controleren…</strong></div>
      <div class="metric"><span>Gekozen MIME</span><strong id="mimeMetric">—</strong></div>
      <div class="metric"><span>Duur</span><strong id="durationMetric">0.0 s</strong></div>
    </div>
  </section>

  <section class="card">
    <div class="step-head"><h2>2. Luister naar de lokale iPhone-opname</h2><div class="step-no">2</div></div>
    <div id="localStatus" class="status"><span class="status-dot"></span><span id="localStatusText">Nog geen opname</span></div>
    <div class="metrics">
      <div class="metric"><span>Lokale bytes</span><strong id="localBytes">—</strong></div>
      <div class="metric"><span>Lokale MIME</span><strong id="localMime">—</strong></div>
      <div class="metric"><span>Lokale SHA‑256</span><strong id="localHash">—</strong></div>
      <div class="metric"><span>Playback</span><strong id="localPlayback">Nog niet gestart</strong></div>
    </div>
    <div class="row" style="margin-top:12px">
      <button id="playLocalBtn" class="btn secondary" disabled>Luister lokaal</button>
      <button id="confirmLocalBtn" class="btn confirm" disabled>Ja, ik hoor mezelf</button>
    </div>
    <audio id="localAudio" playsinline preload="metadata"></audio>
    <p class="help">Als dit mislukt, zit de fout vóór Cloudflare: in opname, codec of lokale Safari-playback.</p>
  </section>

  <section class="card">
    <div class="step-head"><h2>3. Stuur exact dit bestand naar R2</h2><div class="step-no">3</div></div>
    <div id="uploadStatus" class="status"><span class="status-dot"></span><span id="uploadStatusText">Wacht op lokale luistertest</span></div>
    <button id="uploadBtn" class="btn wide" disabled>Upload naar R2 en haal terug</button>
    <div class="metrics">
      <div class="metric"><span>R2 opgeslagen bytes</span><strong id="storedBytes">—</strong></div>
      <div class="metric"><span>Teruggehaalde bytes</span><strong id="downloadBytes">—</strong></div>
      <div class="metric"><span>Server MIME</span><strong id="serverMime">—</strong></div>
      <div class="metric"><span>Server SHA‑256</span><strong id="serverHash">—</strong></div>
      <div class="metric"><span>Bytes gelijk</span><strong id="bytesEqual">—</strong></div>
      <div class="metric"><span>Hash gelijk</span><strong id="hashEqual">—</strong></div>
    </div>
  </section>

  <section class="card">
    <div class="step-head"><h2>4. Luister naar wat uit R2 terugkwam</h2><div class="step-no">4</div></div>
    <div id="serverStatus" class="status"><span class="status-dot"></span><span id="serverStatusText">Nog niet beschikbaar</span></div>
    <div class="row">
      <button id="playServerBtn" class="btn" disabled>Luister vanaf server</button>
      <button id="confirmServerBtn" class="btn confirm" disabled>Ja, dit is dezelfde opname</button>
    </div>
    <audio id="serverAudio" playsinline preload="metadata"></audio>
    <div id="passMessage" class="pass hidden">Volledige audiotrein bewezen voor deze ronde.</div>
    <button id="newTestBtn" class="btn secondary wide" style="margin-top:12px" disabled>Nieuwe ronde</button>
  </section>

  <section class="card">
    <div class="step-head"><h2>Diagnose</h2><div class="step-no">i</div></div>
    <div class="diag-actions">
      <button id="copyBtn" class="btn secondary mini">Kopieer diagnose</button>
      <button id="clearCountBtn" class="btn secondary mini">Reset 10-rondes teller</button>
    </div>
    <div id="log" class="log"></div>
  </section>
</main>
<script>
(() => {
  const REV = ${JSON.stringify(APP_REV)};
  const $ = (id) => document.getElementById(id);
  const startBtn = $('startBtn');
  const pauseBtn = $('pauseBtn');
  const stopBtn = $('stopBtn');
  const playLocalBtn = $('playLocalBtn');
  const confirmLocalBtn = $('confirmLocalBtn');
  const uploadBtn = $('uploadBtn');
  const playServerBtn = $('playServerBtn');
  const confirmServerBtn = $('confirmServerBtn');
  const newTestBtn = $('newTestBtn');
  const localAudio = $('localAudio');
  const serverAudio = $('serverAudio');
  const logEl = $('log');
  const PASS_KEY = 'talera-audio-lab-v2-passes';

  let stream = null;
  let recorder = null;
  let chunks = [];
  let startedAt = 0;
  let timer = 0;
  let localBlob = null;
  let localUrl = '';
  let localSha = '';
  let localConfirmed = false;
  let localPlayed = false;
  let serverBlob = null;
  let serverUrl = '';
  let serverSha = '';
  let serverPlayed = false;
  let remoteId = '';
  let roundPassed = false;

  function log(message, data) {
    const stamp = new Date().toLocaleTimeString('nl-NL', { hour12: false });
    let line = '[' + stamp + '] ' + message;
    if (data !== undefined) {
      try { line += ' ' + JSON.stringify(data); } catch {}
    }
    logEl.textContent += (logEl.textContent ? '\n' : '') + line;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setStatus(prefix, text, mode) {
    const box = $(prefix + 'Status');
    const textEl = $(prefix + 'StatusText');
    if (textEl) textEl.textContent = text;
    if (box) {
      box.classList.remove('live', 'ok', 'bad');
      if (mode) box.classList.add(mode);
    }
  }

  function prettyBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  function shortHash(value) {
    value = String(value || '');
    return value ? value.slice(0, 14) + '…' + value.slice(-8) : '—';
  }

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
  }

  async function hashBlob(blob) {
    const buffer = await blob.arrayBuffer();
    return hex(await crypto.subtle.digest('SHA-256', buffer));
  }

  function isAppleMobile() {
    const ua = String(navigator.userAgent || '');
    return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  }

  function chooseMime() {
    const list = isAppleMobile()
      ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    for (const type of list) {
      try {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) return type;
      } catch {}
    }
    return '';
  }

  function filenameFor(type) {
    type = String(type || '').toLowerCase();
    if (type.includes('mp4') || type.includes('m4a')) return 'audio-lab.m4a';
    if (type.includes('ogg')) return 'audio-lab.ogg';
    if (type.includes('mpeg')) return 'audio-lab.mp3';
    return 'audio-lab.webm';
  }

  function stopTracks() {
    if (stream) {
      stream.getTracks().forEach(track => {
        try { track.stop(); } catch {}
      });
    }
    stream = null;
  }

  function revokeUrls() {
    if (localUrl) URL.revokeObjectURL(localUrl);
    if (serverUrl) URL.revokeObjectURL(serverUrl);
    localUrl = '';
    serverUrl = '';
    localAudio.pause();
    serverAudio.pause();
    localAudio.removeAttribute('src');
    serverAudio.removeAttribute('src');
    try { localAudio.load(); } catch {}
    try { serverAudio.load(); } catch {}
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      const seconds = startedAt ? (Date.now() - startedAt) / 1000 : 0;
      $('durationMetric').textContent = seconds.toFixed(1) + ' s';
    }, 100);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = 0;
    const seconds = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    $('durationMetric').textContent = seconds.toFixed(1) + ' s';
  }

  function passCount() {
    return Math.max(0, Math.min(10, Number(localStorage.getItem(PASS_KEY) || 0)));
  }

  function drawPassCount() {
    $('passRing').textContent = passCount() + '/10';
  }

  async function permissionSnapshot() {
    if (!navigator.permissions || !navigator.permissions.query) return 'browser meldt status niet';
    try {
      const p = await navigator.permissions.query({ name: 'microphone' });
      return p.state || 'onbekend';
    } catch {
      return 'browser meldt status niet';
    }
  }

  async function environmentCheck() {
    $('recorderMetric').textContent = typeof MediaRecorder === 'function' ? 'beschikbaar' : 'NIET beschikbaar';
    $('recorderMetric').className = typeof MediaRecorder === 'function' ? 'good' : 'wrong';
    const permission = await permissionSnapshot();
    $('micMetric').textContent = permission;
    log('Lab gestart', {
      revision: REV,
      secureContext: window.isSecureContext,
      mediaDevices: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      mediaRecorder: typeof MediaRecorder === 'function',
      permission,
      appleMobile: isAppleMobile(),
      userAgent: navigator.userAgent,
    });
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const data = await res.json();
      log('Server health', data);
      if (!res.ok || !data.storageBound) setStatus('record', 'Server of R2-binding niet klaar', 'bad');
    } catch (error) {
      log('Server health mislukt', { message: error.message });
      setStatus('record', 'Server health-check mislukt', 'bad');
    }
  }

  async function cleanupRemote() {
    if (!remoteId) return;
    const id = remoteId;
    remoteId = '';
    try {
      await fetch('/api/audio/' + encodeURIComponent(id), { method: 'DELETE', cache: 'no-store' });
      log('Vorige R2-testobject verwijderd', { id });
    } catch (error) {
      log('Opschonen R2-testobject mislukt', { message: error.message });
    }
  }

  async function resetRound() {
    stopTracks();
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch {}
    }
    recorder = null;
    clearInterval(timer);
    timer = 0;
    revokeUrls();
    await cleanupRemote();
    chunks = [];
    startedAt = 0;
    localBlob = null;
    localSha = '';
    localConfirmed = false;
    localPlayed = false;
    serverBlob = null;
    serverSha = '';
    serverPlayed = false;
    roundPassed = false;
    $('durationMetric').textContent = '0.0 s';
    $('localBytes').textContent = '—';
    $('localMime').textContent = '—';
    $('localHash').textContent = '—';
    $('localPlayback').textContent = 'Nog niet gestart';
    $('localPlayback').className = '';
    $('storedBytes').textContent = '—';
    $('downloadBytes').textContent = '—';
    $('serverMime').textContent = '—';
    $('serverHash').textContent = '—';
    $('bytesEqual').textContent = '—';
    $('hashEqual').textContent = '—';
    $('passMessage').classList.add('hidden');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = 'Pauze';
    stopBtn.disabled = true;
    playLocalBtn.disabled = true;
    confirmLocalBtn.disabled = true;
    uploadBtn.disabled = true;
    playServerBtn.disabled = true;
    confirmServerBtn.disabled = true;
    newTestBtn.disabled = true;
    setStatus('record', 'Klaar om te starten', '');
    setStatus('local', 'Nog geen opname', '');
    setStatus('upload', 'Wacht op lokale luistertest', '');
    setStatus('server', 'Nog niet beschikbaar', '');
    log('Nieuwe ronde klaar');
  }

  async function startRecording() {
    if (!window.isSecureContext) {
      setStatus('record', 'HTTPS/secure context ontbreekt', 'bad');
      log('Opname geblokkeerd: geen secure context');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder !== 'function') {
      setStatus('record', 'Deze browser mist opname-API’s', 'bad');
      log('Opname-API ontbreekt');
      return;
    }

    if (localBlob || serverBlob || remoteId) await resetRound();

    startBtn.disabled = true;
    setStatus('record', 'Microfoon openen…', 'live');
    $('micMetric').textContent = 'toegang vragen / gebruiken';
    log('getUserMedia gestart');

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0] || null;
      const settings = track?.getSettings ? track.getSettings() : {};
      $('micMetric').textContent = track ? 'actief' : 'geen audiotrack';
      $('micMetric').className = track ? 'good' : 'wrong';
      log('Microfoonstream geopend', {
        label: track?.label || '',
        enabled: track?.enabled,
        muted: track?.muted,
        readyState: track?.readyState,
        settings,
      });

      const mime = chooseMime();
      $('mimeMetric').textContent = mime || 'browser kiest zelf';
      chunks = [];
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      log('MediaRecorder aangemaakt', { mimeType: recorder.mimeType || mime || 'onbekend' });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          log('Audiobrok ontvangen', { bytes: event.data.size, type: event.data.type || '' });
        }
      };

      recorder.onerror = (event) => {
        const message = event?.error?.message || event?.name || 'onbekende recorderfout';
        log('MediaRecorder fout', { message });
        setStatus('record', 'Recorderfout: ' + message, 'bad');
      };

      recorder.onstop = finalizeRecording;
      recorder.start();
      startedAt = Date.now();
      startTimer();
      setStatus('record', 'Opname loopt', 'live');
      pauseBtn.disabled = !(typeof recorder.pause === 'function' && typeof recorder.resume === 'function');
      stopBtn.disabled = false;
      if (pauseBtn.disabled) pauseBtn.textContent = 'Pauze niet ondersteund';
      log('MediaRecorder gestart', { state: recorder.state });
    } catch (error) {
      stopTracks();
      recorder = null;
      startBtn.disabled = false;
      $('micMetric').textContent = 'geweigerd / mislukt';
      $('micMetric').className = 'wrong';
      setStatus('record', 'Microfoon kon niet openen', 'bad');
      log('getUserMedia mislukt', { name: error.name, message: error.message });
    }
  }

  function togglePause() {
    if (!recorder) return;
    try {
      if (recorder.state === 'recording') {
        recorder.pause();
        pauseBtn.textContent = 'Verder';
        setStatus('record', 'Opname gepauzeerd', '');
        log('Recorder gepauzeerd');
      } else if (recorder.state === 'paused') {
        recorder.resume();
        pauseBtn.textContent = 'Pauze';
        setStatus('record', 'Opname loopt', 'live');
        log('Recorder hervat');
      }
    } catch (error) {
      log('Pauze/Verder mislukt', { name: error.name, message: error.message });
    }
  }

  function stopRecording() {
    if (!recorder || recorder.state === 'inactive') return;
    stopBtn.disabled = true;
    pauseBtn.disabled = true;
    setStatus('record', 'Opname afronden…', '');
    log('Stop gevraagd', { state: recorder.state });
    try {
      recorder.stop();
    } catch (error) {
      log('Recorder.stop mislukt', { name: error.name, message: error.message });
      setStatus('record', 'Stoppen mislukt', 'bad');
      startBtn.disabled = false;
      stopTracks();
    }
  }

  async function finalizeRecording() {
    stopTimer();
    stopTracks();
    const type = recorder?.mimeType || chunks.find(Boolean)?.type || 'application/octet-stream';
    recorder = null;
    const blob = new Blob(chunks, { type });
    chunks = [];
    log('Lokale blob gemaakt', { bytes: blob.size, type: blob.type });

    if (!blob.size) {
      setStatus('record', 'Geen audiobytes gemaakt', 'bad');
      setStatus('local', 'Lokale blob is leeg', 'bad');
      startBtn.disabled = false;
      $('localBytes').textContent = '0 B';
      $('localMime').textContent = blob.type || '—';
      return;
    }

    try {
      localSha = await hashBlob(blob);
    } catch (error) {
      localSha = '';
      log('Lokale SHA-256 mislukt', { message: error.message });
    }

    localBlob = blob;
    localUrl = URL.createObjectURL(blob);
    localAudio.src = localUrl;
    localAudio.load();
    $('localBytes').textContent = prettyBytes(blob.size) + ' (' + blob.size + ')';
    $('localMime').textContent = blob.type || 'onbekend';
    $('localHash').textContent = shortHash(localSha);
    setStatus('record', 'Opname klaar', 'ok');
    setStatus('local', 'Lokale opname klaar om te luisteren', '');
    playLocalBtn.disabled = false;
    startBtn.disabled = false;
    log('Lokale opname gereed', { bytes: blob.size, type: blob.type, sha256: localSha });
  }

  async function playLocal() {
    if (!localBlob || !localUrl) return;
    localPlayed = false;
    confirmLocalBtn.disabled = true;
    $('localPlayback').textContent = 'starten…';
    $('localPlayback').className = 'wait';
    log('Lokale playback gevraagd');
    try {
      localAudio.currentTime = 0;
      await localAudio.play();
    } catch (error) {
      $('localPlayback').textContent = 'MISLUKT';
      $('localPlayback').className = 'wrong';
      setStatus('local', 'Lokale playback kon niet starten', 'bad');
      log('Lokale audio.play mislukt', { name: error.name, message: error.message, code: localAudio.error?.code });
    }
  }

  function confirmLocal() {
    if (!localPlayed) return;
    localConfirmed = true;
    confirmLocalBtn.disabled = true;
    uploadBtn.disabled = false;
    setStatus('local', 'Door jou bevestigd: lokale opname klinkt goed', 'ok');
    setStatus('upload', 'Klaar om exact dit bestand naar R2 te sturen', '');
    log('Gebruiker bevestigt lokale audio');
  }

  async function uploadAndFetchBack() {
    if (!localBlob || !localConfirmed) return;
    uploadBtn.disabled = true;
    setStatus('upload', 'Uploaden naar R2…', 'live');
    log('Upload gestart', { bytes: localBlob.size, type: localBlob.type, sha256: localSha });

    try {
      const form = new FormData();
      form.append('audio', localBlob, filenameFor(localBlob.type));
      const response = await fetch('/api/audio', { method: 'POST', body: form, cache: 'no-store' });
      const data = await response.json();
      log('Upload response', { status: response.status, data });
      if (!response.ok || !data.ok) throw new Error(data.error || 'Upload mislukt');

      remoteId = data.id;
      $('storedBytes').textContent = prettyBytes(data.storedBytes) + ' (' + data.storedBytes + ')';
      $('serverMime').textContent = data.mimeType || '—';

      const head = await fetch(data.playbackUrl, { method: 'HEAD', cache: 'no-store' });
      const headBytes = Number(head.headers.get('content-length') || 0);
      const headSha = head.headers.get('x-audio-sha256') || '';
      log('R2 HEAD', { status: head.status, bytes: headBytes, sha256: headSha, mime: head.headers.get('content-type') });
      if (!head.ok) throw new Error('HEAD op opgeslagen audio mislukt');

      const get = await fetch(data.playbackUrl, { cache: 'no-store' });
      if (!get.ok) throw new Error('GET van opgeslagen audio mislukt');
      const blob = await get.blob();
      serverBlob = blob;
      serverSha = await hashBlob(blob);
      $('downloadBytes').textContent = prettyBytes(blob.size) + ' (' + blob.size + ')';
      $('serverMime').textContent = blob.type || data.mimeType || '—';
      $('serverHash').textContent = shortHash(serverSha);

      const sameBytes = blob.size === localBlob.size && headBytes === localBlob.size && Number(data.storedBytes) === localBlob.size;
      const sameHash = Boolean(localSha && serverSha && data.sha256) && localSha === serverSha && localSha === data.sha256 && (!headSha || headSha === localSha);
      $('bytesEqual').textContent = sameBytes ? 'JA' : 'NEE';
      $('bytesEqual').className = sameBytes ? 'good' : 'wrong';
      $('hashEqual').textContent = sameHash ? 'JA' : 'NEE';
      $('hashEqual').className = sameHash ? 'good' : 'wrong';
      log('Vergelijking lokaal ↔ R2', {
        sameBytes,
        sameHash,
        localBytes: localBlob.size,
        serverBytes: blob.size,
        localSha,
        serverSha,
        apiSha: data.sha256,
      });

      if (!sameBytes || !sameHash) {
        setStatus('upload', 'Bestand kwam NIET identiek terug', 'bad');
        setStatus('server', 'Serverbestand niet betrouwbaar genoeg om te testen', 'bad');
        return;
      }

      if (serverUrl) URL.revokeObjectURL(serverUrl);
      serverUrl = URL.createObjectURL(blob);
      serverAudio.src = serverUrl;
      serverAudio.load();
      setStatus('upload', 'R2 bewezen: bytes en hash zijn exact gelijk', 'ok');
      setStatus('server', 'Serverkopie klaar om te luisteren', '');
      playServerBtn.disabled = false;
    } catch (error) {
      setStatus('upload', 'Upload / terughalen mislukt', 'bad');
      setStatus('server', 'Nog niet beschikbaar', 'bad');
      uploadBtn.disabled = false;
      log('Uploadketen fout', { name: error.name, message: error.message });
    }
  }

  async function playServer() {
    if (!serverBlob || !serverUrl) return;
    serverPlayed = false;
    confirmServerBtn.disabled = true;
    log('Server playback gevraagd');
    try {
      serverAudio.currentTime = 0;
      await serverAudio.play();
    } catch (error) {
      setStatus('server', 'Server playback kon niet starten', 'bad');
      log('Server audio.play mislukt', { name: error.name, message: error.message, code: serverAudio.error?.code });
    }
  }

  function confirmServer() {
    if (!serverPlayed || roundPassed) return;
    roundPassed = true;
    let count = passCount();
    count = Math.min(10, count + 1);
    localStorage.setItem(PASS_KEY, String(count));
    drawPassCount();
    confirmServerBtn.disabled = true;
    newTestBtn.disabled = false;
    $('passMessage').classList.remove('hidden');
    setStatus('server', 'Door jou bevestigd: serveropname is dezelfde', 'ok');
    log('RONDE GESLAAGD', { successfulRounds: count });
  }

  localAudio.addEventListener('playing', () => {
    localPlayed = true;
    $('localPlayback').textContent = 'speelt';
    $('localPlayback').className = 'good';
    confirmLocalBtn.disabled = false;
    setStatus('local', 'Lokale playback gestart — luister en bevestig', 'live');
    log('Lokale audio playing-event');
  });
  localAudio.addEventListener('ended', () => log('Lokale audio afgelopen'));
  localAudio.addEventListener('error', () => {
    $('localPlayback').textContent = 'audio-element fout';
    $('localPlayback').className = 'wrong';
    setStatus('local', 'Lokale audio-element fout', 'bad');
    log('Lokale audio error-event', { code: localAudio.error?.code, message: localAudio.error?.message });
  });

  serverAudio.addEventListener('playing', () => {
    serverPlayed = true;
    confirmServerBtn.disabled = false;
    setStatus('server', 'Server playback gestart — luister en bevestig', 'live');
    log('Server audio playing-event');
  });
  serverAudio.addEventListener('ended', () => log('Server audio afgelopen'));
  serverAudio.addEventListener('error', () => {
    setStatus('server', 'Server audio-element fout', 'bad');
    log('Server audio error-event', { code: serverAudio.error?.code, message: serverAudio.error?.message });
  });

  startBtn.addEventListener('click', startRecording);
  pauseBtn.addEventListener('click', togglePause);
  stopBtn.addEventListener('click', stopRecording);
  playLocalBtn.addEventListener('click', playLocal);
  confirmLocalBtn.addEventListener('click', confirmLocal);
  uploadBtn.addEventListener('click', uploadAndFetchBack);
  playServerBtn.addEventListener('click', playServer);
  confirmServerBtn.addEventListener('click', confirmServer);
  newTestBtn.addEventListener('click', resetRound);

  $('copyBtn').addEventListener('click', async () => {
    const report = 'TALERA Audio Lab ' + REV + '\n' + logEl.textContent;
    try {
      await navigator.clipboard.writeText(report);
      log('Diagnose gekopieerd');
    } catch (error) {
      log('Kopiëren diagnose mislukt', { message: error.message });
    }
  });

  $('clearCountBtn').addEventListener('click', () => {
    localStorage.removeItem(PASS_KEY);
    drawPassCount();
    log('10-rondes teller gereset');
  });

  window.addEventListener('pagehide', () => {
    stopTracks();
    try { localAudio.pause(); serverAudio.pause(); } catch {}
  });

  drawPassCount();
  environmentCheck();
})();
</script>
</body>
</html>`;
