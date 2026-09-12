const APP_REV = "audio-lab-v1-20260912";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, app: "TALERA Audio Lab", revision: APP_REV, storage: Boolean(env.AUDIO) });
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
        headers: {
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "no-store",
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
    return json({ error: "Ongeldige upload." }, 400);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size <= 0) {
    return json({ error: "Geen audiobestand ontvangen." }, 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return json({ error: "Audiobestand is te groot voor het lab." }, 413);
  }

  const id = randomToken(24);
  const key = `audio-lab/${id}`;
  const mimeType = String(audio.type || "application/octet-stream");
  const createdAt = new Date().toISOString();

  await env.AUDIO.put(key, audio, {
    httpMetadata: {
      contentType: mimeType,
      cacheControl: "no-store",
    },
    customMetadata: {
      labRevision: APP_REV,
      createdAt,
      originalBytes: String(audio.size),
    },
  });

  const head = await env.AUDIO.head(key);
  const storedBytes = Number(head?.size || 0);
  if (!head || storedBytes <= 0 || storedBytes !== audio.size) {
    try { await env.AUDIO.delete(key); } catch {}
    return json({
      error: "R2 bevestigde het bestand niet byte-voor-byte.",
      uploadedBytes: audio.size,
      storedBytes,
    }, 500);
  }

  return json({
    ok: true,
    id,
    mimeType,
    uploadedBytes: audio.size,
    storedBytes,
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
    const headers = audioHeaders(head);
    headers.set("content-length", String(head.size || 0));
    return new Response(null, { status: 200, headers });
  }

  const object = await env.AUDIO.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = audioHeaders(object);
  headers.set("content-length", String(object.size || 0));
  return new Response(object.body, { status: 200, headers });
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
  headers.set("cache-control", "no-store");
  headers.set("accept-ranges", "bytes");
  headers.set("x-talera-audio-lab", APP_REV);
  return headers;
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "cache-control": "no-store",
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
<meta name="theme-color" content="#f5f3ef">
<title>Audio Lab</title>
<style>
:root{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:#12233f;background:#f5f3ef}
*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#12233f}.page{max-width:760px;margin:0 auto;padding:28px 18px 56px}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.16em;color:#6a7482}.title{font-size:clamp(30px,8vw,48px);line-height:1;margin:10px 0 12px;letter-spacing:-.04em}.intro{font-size:16px;line-height:1.5;color:#566273;margin:0 0 22px}.card{background:#fff;border:1px solid rgba(18,35,63,.08);border-radius:24px;padding:18px;margin:14px 0;box-shadow:0 10px 30px rgba(18,35,63,.05)}.card h2{font-size:18px;margin:0 0 12px}.row{display:flex;gap:10px;flex-wrap:wrap}.btn{appearance:none;border:0;border-radius:16px;min-height:52px;padding:0 18px;font-size:16px;font-weight:800;background:#102b4d;color:#fff}.btn.secondary{background:#e8eef4;color:#102b4d}.btn.warn{background:#f0e1dc;color:#783e34}.btn:disabled{opacity:.35}.state{display:inline-flex;align-items:center;gap:8px;background:#eef2f5;border-radius:999px;padding:8px 11px;font-size:13px;font-weight:700}.dot{width:8px;height:8px;border-radius:50%;background:#9aa4af}.state.recording .dot{background:#df654f;box-shadow:0 0 0 5px rgba(223,101,79,.12)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.metric{background:#f6f7f8;border-radius:14px;padding:11px}.metric span{display:block;font-size:11px;color:#75808d;margin-bottom:3px}.metric strong{font-size:14px;word-break:break-word}.ok{color:#1a7151}.bad{color:#a33d34}.pending{color:#8a6423}.play{width:100%;margin-top:10px}.log{background:#0f1720;color:#d9e2ec;border-radius:18px;padding:14px;min-height:160px;max-height:280px;overflow:auto;white-space:pre-wrap;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.small{font-size:12px;color:#73808d}.hidden{display:none!important}@media(max-width:520px){.page{padding:22px 12px 40px}.card{padding:15px;border-radius:20px}.grid{grid-template-columns:1fr}.btn{flex:1 1 auto}}
</style>
</head>
<body>
<main class="page">
  <div class="eyebrow">GEÏSOLEERDE TEST · ${APP_REV}</div>
  <h1 class="title">Audio Lab</h1>
  <p class="intro">Dit staat volledig los van TALERA. We bewijzen maar één trein: iPhone-microfoon → audiobestand → R2 → opnieuw ophalen → afspelen.</p>

  <section class="card">
    <h2>1. Neem iets op</h2>
    <div id="stateBadge" class="state"><span class="dot"></span><span id="stateText">Klaar</span></div>
    <div class="row" style="margin-top:14px">
      <button id="startBtn" class="btn">Start opname</button>
      <button id="pauseBtn" class="btn secondary" disabled>Pauze</button>
      <button id="stopBtn" class="btn warn" disabled>Stop</button>
    </div>
    <div class="grid" style="margin-top:14px">
      <div class="metric"><span>Secure context</span><strong id="secureMetric">—</strong></div>
      <div class="metric"><span>MediaRecorder</span><strong id="recorderMetric">—</strong></div>
      <div class="metric"><span>Gekozen MIME</span><strong id="mimeMetric">—</strong></div>
      <div class="metric"><span>Duur</span><strong id="durationMetric">0.0 s</strong></div>
    </div>
  </section>

  <section class="card">
    <h2>2. Bewijs op de iPhone</h2>
    <div class="grid">
      <div class="metric"><span>Lokale bytes</span><strong id="localBytes">—</strong></div>
      <div class="metric"><span>Lokale MIME</span><strong id="localMime">—</strong></div>
    </div>
    <button id="playLocalBtn" class="btn secondary play" disabled>Luister lokaal</button>
    <audio id="localAudio" playsinline preload="metadata"></audio>
    <p class="small">Als dit werkt, weten we dat Safari zelf een echt audiobestand heeft gemaakt.</p>
  </section>

  <section class="card">
    <h2>3. Bewijs vanaf de server</h2>
    <div class="grid">
      <div class="metric"><span>R2 opgeslagen</span><strong id="storedBytes">—</strong></div>
      <div class="metric"><span>Teruggehaald</span><strong id="downloadBytes">—</strong></div>
      <div class="metric"><span>Server MIME</span><strong id="serverMime">—</strong></div>
      <div class="metric"><span>Resultaat</span><strong id="serverResult">Nog niet getest</strong></div>
    </div>
    <button id="playServerBtn" class="btn play" disabled>Luister vanaf server</button>
    <audio id="serverAudio" playsinline preload="metadata"></audio>
    <p class="small">Deze knop speelt niet de lokale opname af, maar een nieuwe blob die opnieuw via de Worker uit R2 is opgehaald.</p>
  </section>

  <section class="card">
    <h2>Diagnose</h2>
    <div id="log" class="log"></div>
  </section>
</main>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const startBtn = $('startBtn');
  const pauseBtn = $('pauseBtn');
  const stopBtn = $('stopBtn');
  const playLocalBtn = $('playLocalBtn');
  const playServerBtn = $('playServerBtn');
  const localAudio = $('localAudio');
  const serverAudio = $('serverAudio');
  const logEl = $('log');

  let stream = null;
  let recorder = null;
  let chunks = [];
  let startedAt = 0;
  let clock = 0;
  let localUrl = '';
  let serverUrl = '';
  let remoteId = '';
  let stopRequested = false;

  function log(message, data) {
    const stamp = new Date().toLocaleTimeString('nl-NL', {hour12:false});
    let line = '[' + stamp + '] ' + message;
    if (data !== undefined) {
      try { line += ' ' + JSON.stringify(data); } catch {}
    }
    logEl.textContent += (logEl.textContent ? '\n' : '') + line;
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setState(text, recording) {
    $('stateText').textContent = text;
    $('stateBadge').classList.toggle('recording', Boolean(recording));
  }

  function bytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  function isAppleMobile() {
    const ua = String(navigator.userAgent || '');
    return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  }

  function chooseMime() {
    const apple = isAppleMobile();
    const candidates = apple
      ? ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    for (const type of candidates) {
      try {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) return type;
      } catch {}
    }
    return '';
  }

  function clearObjectUrls() {
    if (localUrl) URL.revokeObjectURL(localUrl);
    if (serverUrl) URL.revokeObjectURL(serverUrl);
    localUrl = '';
    serverUrl = '';
    localAudio.removeAttribute('src');
    serverAudio.removeAttribute('src');
  }

  function stopTracks() {
    if (stream) {
      for (const track of stream.getTracks()) {
        try { track.stop(); } catch {}
      }
    }
    stream = null;
  }

  function resetResultUi() {
    clearObjectUrls();
    remoteId = '';
    playLocalBtn.disabled = true;
    playServerBtn.disabled = true;
    $('localBytes').textContent = '—';
    $('localMime').textContent = '—';
    $('storedBytes').textContent = '—';
    $('downloadBytes').textContent = '—';
    $('serverMime').textContent = '—';
    $('serverResult').textContent = 'Nog niet getest';
    $('serverResult').className = '';
  }

  function startClock() {
    clearInterval(clock);
    clock = setInterval(() => {
      $('durationMetric').textContent = startedAt ? ((Date.now() - startedAt) / 1000).toFixed(1) + ' s' : '0.0 s';
    }, 100);
  }

  function stopClock() {
    clearInterval(clock);
    clock = 0;
    if (startedAt) $('durationMetric').textContent = ((Date.now() - startedAt) / 1000).toFixed(1) + ' s';
  }

  async function startRecording() {
    if (recorder && recorder.state !== 'inactive') return;
    resetResultUi();
    chunks = [];
    stopRequested = false;
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    setState('Microfoon openen…', false);
    log('getUserMedia gevraagd');

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log('Microfoonstream geopend', { tracks: stream.getAudioTracks().length });

      const mime = chooseMime();
      $('mimeMetric').textContent = mime || '(browser kiest)';
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      log('MediaRecorder aangemaakt', { mimeType: recorder.mimeType || mime || 'onbekend' });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
          log('Audioblok ontvangen', { bytes: event.data.size, chunks: chunks.length });
        }
      };

      recorder.onerror = (event) => {
        log('MediaRecorder fout', { name: event.error?.name || 'unknown', message: event.error?.message || '' });
        setState('Recorderfout', false);
      };

      recorder.onpause = () => {
        setState('Gepauzeerd', false);
        pauseBtn.textContent = 'Verder';
        log('Recorder gepauzeerd');
      };

      recorder.onresume = () => {
        setState('Opnemen', true);
        pauseBtn.textContent = 'Pauze';
        log('Recorder hervat');
      };

      recorder.onstop = async () => {
        stopClock();
        stopTracks();
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        pauseBtn.textContent = 'Pauze';

        const type = recorder?.mimeType || mime || (isAppleMobile() ? 'audio/mp4' : 'audio/webm');
        const blob = new Blob(chunks, { type });
        log('Lokale blob gebouwd', { bytes: blob.size, type: blob.type, chunks: chunks.length });
        recorder = null;

        if (!blob.size) {
          setState('Geen audiobytes', false);
          $('serverResult').textContent = 'Recorder leverde 0 bytes';
          $('serverResult').className = 'bad';
          return;
        }

        localUrl = URL.createObjectURL(blob);
        localAudio.src = localUrl;
        $('localBytes').textContent = bytes(blob.size) + ' (' + blob.size + ')';
        $('localMime').textContent = blob.type || 'onbekend';
        playLocalBtn.disabled = false;
        setState('Lokale audio klaar', false);

        await uploadAndPrepareServer(blob);
      };

      recorder.start();
      startedAt = Date.now();
      startClock();
      setState('Opnemen', true);
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      log('Recorder gestart');
    } catch (error) {
      stopTracks();
      startBtn.disabled = false;
      setState('Microfoon niet beschikbaar', false);
      log('Start mislukt', { name: error?.name || '', message: error?.message || String(error) });
    }
  }

  function togglePause() {
    if (!recorder) return;
    try {
      if (recorder.state === 'recording') {
        if (typeof recorder.requestData === 'function') recorder.requestData();
        recorder.pause();
      } else if (recorder.state === 'paused') {
        recorder.resume();
      }
    } catch (error) {
      log('Pauze/Verder mislukt', { message: error?.message || String(error) });
    }
  }

  function stopRecording() {
    if (!recorder || recorder.state === 'inactive' || stopRequested) return;
    stopRequested = true;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    setState('Opname afronden…', false);
    log('Stop gevraagd', { recorderState: recorder.state });

    try {
      if (recorder.state === 'paused') recorder.resume();
      if (typeof recorder.requestData === 'function') recorder.requestData();
    } catch {}

    setTimeout(() => {
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      } catch (error) {
        log('Stop mislukt', { message: error?.message || String(error) });
      }
    }, 180);
  }

  async function uploadAndPrepareServer(blob) {
    setState('Uploaden naar R2…', false);
    $('serverResult').textContent = 'Uploaden…';
    $('serverResult').className = 'pending';
    log('Upload gestart', { bytes: blob.size, type: blob.type });

    try {
      const form = new FormData();
      const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mpeg') ? 'mp3' : 'webm';
      form.append('audio', blob, 'lab-opname.' + ext);

      const response = await fetch('/api/audio', { method: 'POST', body: form, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload mislukt');

      remoteId = data.id;
      $('storedBytes').textContent = bytes(data.storedBytes) + ' (' + data.storedBytes + ')';
      log('R2 bevestigd', data);

      const remoteResponse = await fetch(data.playbackUrl, { cache: 'no-store' });
      if (!remoteResponse.ok) throw new Error('Server GET gaf HTTP ' + remoteResponse.status);
      const remoteBlob = await remoteResponse.blob();
      log('Serverbestand opnieuw opgehaald', { bytes: remoteBlob.size, type: remoteBlob.type });

      $('downloadBytes').textContent = bytes(remoteBlob.size) + ' (' + remoteBlob.size + ')';
      $('serverMime').textContent = remoteBlob.type || response.headers.get('content-type') || 'onbekend';

      if (remoteBlob.size !== blob.size || remoteBlob.size !== Number(data.storedBytes)) {
        throw new Error('Bytegrootte verschilt: lokaal ' + blob.size + ', R2 ' + data.storedBytes + ', GET ' + remoteBlob.size);
      }

      serverUrl = URL.createObjectURL(remoteBlob);
      serverAudio.src = serverUrl;
      playServerBtn.disabled = false;
      $('serverResult').textContent = 'Volledige keten byte-voor-byte bevestigd';
      $('serverResult').className = 'ok';
      setState('Serveraudio klaar', false);
      log('Keten technisch groen');
    } catch (error) {
      $('serverResult').textContent = error?.message || String(error);
      $('serverResult').className = 'bad';
      setState('Serverstap mislukt', false);
      log('Serverstap mislukt', { message: error?.message || String(error) });
    }
  }

  async function playPrepared(audio, label) {
    try {
      audio.currentTime = 0;
      await audio.play();
      log(label + ' playback gestart');
    } catch (error) {
      log(label + ' playback mislukt', { name: error?.name || '', message: error?.message || String(error) });
    }
  }

  startBtn.addEventListener('click', startRecording);
  pauseBtn.addEventListener('click', togglePause);
  stopBtn.addEventListener('click', stopRecording);
  playLocalBtn.addEventListener('click', () => playPrepared(localAudio, 'Lokale'));
  playServerBtn.addEventListener('click', () => playPrepared(serverAudio, 'Server'));

  $('secureMetric').textContent = window.isSecureContext ? 'Ja' : 'Nee';
  $('secureMetric').className = window.isSecureContext ? 'ok' : 'bad';
  const hasGum = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const hasRecorder = typeof MediaRecorder !== 'undefined';
  $('recorderMetric').textContent = hasGum && hasRecorder ? 'Beschikbaar' : 'Niet beschikbaar';
  $('recorderMetric').className = hasGum && hasRecorder ? 'ok' : 'bad';
  $('mimeMetric').textContent = hasRecorder ? (chooseMime() || '(browser kiest)') : '—';
  log('Lab geladen', {
    revision: '${APP_REV}',
    secureContext: window.isSecureContext,
    getUserMedia: hasGum,
    mediaRecorder: hasRecorder,
    appleMobile: isAppleMobile(),
    userAgent: navigator.userAgent
  });
})();
</script>
</body>
</html>`;
