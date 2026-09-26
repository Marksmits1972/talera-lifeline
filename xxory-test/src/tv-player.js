const TV_REVISION = 'tv-player-foundation-20260926-r1';
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const COMMAND_TYPES = new Set(['home', 'next', 'previous', 'present', 'pause', 'disconnect']);

let schemaPromise = null;

export async function handleTVPlayer(request, env) {
  const url = new URL(request.url);

  if ((url.pathname === '/tv' || url.pathname === '/tv/') && (request.method === 'GET' || request.method === 'HEAD')) {
    return htmlResponse(request.method === 'HEAD' ? '' : renderTVPage(), {
      'x-talera-tv-player': TV_REVISION
    });
  }

  if (url.pathname === '/tv/pair' && (request.method === 'GET' || request.method === 'HEAD')) {
    return htmlResponse(request.method === 'HEAD' ? '' : renderPairPage(), {
      'x-talera-tv-player': TV_REVISION
    });
  }

  if (!url.pathname.startsWith('/api/tv/')) return null;
  if (!env?.DB) return json({ error: 'TV-sessieopslag is nog niet beschikbaar.' }, 503);

  await ensureSchema(env);

  if (url.pathname === '/api/tv/revision' && request.method === 'GET') {
    return json({
      ok: true,
      revision: TV_REVISION,
      phase: 'desktop-as-tv-foundation',
      qrPairing: true,
      controllerCommands: [...COMMAND_TYPES],
      accountIdentityAttached: false,
      timelinePlaybackAttached: false
    });
  }

  if (url.pathname === '/api/tv/session' && request.method === 'POST') {
    return createSession(request, env);
  }

  const stateMatch = url.pathname.match(/^\/api\/tv\/session\/([A-Za-z0-9_-]{12,80})$/);
  if (stateMatch && request.method === 'GET') {
    return getSessionState(request, env, stateMatch[1]);
  }
  if (stateMatch && request.method === 'DELETE') {
    return closeSession(request, env, stateMatch[1]);
  }

  const pairMatch = url.pathname.match(/^\/api\/tv\/session\/([A-Za-z0-9_-]{12,80})\/pair$/);
  if (pairMatch && request.method === 'POST') {
    return pairSession(request, env, pairMatch[1]);
  }

  const commandMatch = url.pathname.match(/^\/api\/tv\/session\/([A-Za-z0-9_-]{12,80})\/command$/);
  if (commandMatch && request.method === 'POST') {
    return sendCommand(request, env, commandMatch[1]);
  }

  return json({ error: 'Niet gevonden.' }, 404);
}

async function ensureSchema(env) {
  if (!schemaPromise) {
    schemaPromise = env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS tv_sessions (
        session_id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'waiting',
        pair_code TEXT NOT NULL,
        pair_token_hash TEXT NOT NULL,
        player_token_hash TEXT NOT NULL,
        controller_token_hash TEXT,
        paired_at TEXT,
        updated_at TEXT NOT NULL,
        command_version INTEGER NOT NULL DEFAULT 0,
        command_json TEXT
      )
    `).run().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function createSession(request, env) {
  const now = new Date();
  const sessionId = randomToken(16);
  const pairToken = randomToken(24);
  const playerToken = randomToken(24);
  const pairCode = randomDigits(6);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  try {
    await env.DB.prepare(`
      DELETE FROM tv_sessions WHERE expires_at < ?
    `).bind(now.toISOString()).run();
  } catch {}

  await env.DB.prepare(`
    INSERT INTO tv_sessions (
      session_id, created_at, expires_at, state, pair_code,
      pair_token_hash, player_token_hash, updated_at
    ) VALUES (?, ?, ?, 'waiting', ?, ?, ?, ?)
  `).bind(
    sessionId,
    now.toISOString(),
    expiresAt.toISOString(),
    pairCode,
    await sha256(pairToken),
    await sha256(playerToken),
    now.toISOString()
  ).run();

  const origin = new URL(request.url).origin;
  const pairUrl = `\${origin}/tv/pair?session=\${encodeURIComponent(sessionId)}&token=\${encodeURIComponent(pairToken)}`;

  return json({
    ok: true,
    revision: TV_REVISION,
    sessionId,
    playerToken,
    pairCode,
    pairUrl,
    expiresAt: expiresAt.toISOString()
  }, 201);
}

async function getSessionState(request, env, sessionId) {
  const token = bearerToken(request);
  if (!token) return json({ error: 'Sessie-token ontbreekt.' }, 401);

  const row = await env.DB.prepare(`
    SELECT session_id, expires_at, state, player_token_hash, controller_token_hash,
      paired_at, updated_at, command_version, command_json
    FROM tv_sessions WHERE session_id = ? LIMIT 1
  `).bind(sessionId).first();

  if (!row || isExpired(row.expires_at)) return json({ error: 'Deze TV-sessie is verlopen.' }, 404);

  const hash = await sha256(token);
  const playerAllowed = safeEqual(hash, row.player_token_hash);
  const controllerAllowed = row.controller_token_hash && safeEqual(hash, row.controller_token_hash);
  if (!playerAllowed && !controllerAllowed) return json({ error: 'Geen toegang tot deze TV-sessie.' }, 403);

  let command = null;
  if (row.command_json) {
    try { command = JSON.parse(row.command_json); } catch {}
  }

  return json({
    ok: true,
    revision: TV_REVISION,
    sessionId: row.session_id,
    state: row.state,
    paired: row.state === 'paired',
    pairedAt: row.paired_at || null,
    updatedAt: row.updated_at,
    commandVersion: Number(row.command_version || 0),
    command
  });
}

async function pairSession(request, env, sessionId) {
  let payload = {};
  try { payload = await request.json(); }
  catch { return json({ error: 'Ongeldige koppelgegevens.' }, 400); }

  const pairToken = String(payload.pairToken || '');
  if (!pairToken) return json({ error: 'Koppel-token ontbreekt.' }, 400);

  const row = await env.DB.prepare(`
    SELECT session_id, expires_at, state, pair_token_hash
    FROM tv_sessions WHERE session_id = ? LIMIT 1
  `).bind(sessionId).first();

  if (!row || isExpired(row.expires_at)) return json({ error: 'Deze TV-sessie is verlopen.' }, 404);
  if (!safeEqual(await sha256(pairToken), row.pair_token_hash)) return json({ error: 'Deze QR-code is niet geldig.' }, 403);

  const controllerToken = randomToken(24);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE tv_sessions
    SET state = 'paired', controller_token_hash = ?, paired_at = ?, updated_at = ?
    WHERE session_id = ?
  `).bind(await sha256(controllerToken), now, now, sessionId).run();

  return json({
    ok: true,
    revision: TV_REVISION,
    sessionId,
    controllerToken,
    pairedAt: now,
    identityMode: 'anonymous-prototype'
  });
}

async function sendCommand(request, env, sessionId) {
  const token = bearerToken(request);
  if (!token) return json({ error: 'Bediening-token ontbreekt.' }, 401);

  const row = await env.DB.prepare(`
    SELECT session_id, expires_at, state, controller_token_hash, command_version
    FROM tv_sessions WHERE session_id = ? LIMIT 1
  `).bind(sessionId).first();

  if (!row || isExpired(row.expires_at)) return json({ error: 'Deze TV-sessie is verlopen.' }, 404);
  if (row.state !== 'paired' || !row.controller_token_hash) return json({ error: 'Koppel eerst een telefoon.' }, 409);
  if (!safeEqual(await sha256(token), row.controller_token_hash)) return json({ error: 'Geen toegang.' }, 403);

  let payload = {};
  try { payload = await request.json(); }
  catch { return json({ error: 'Ongeldige opdracht.' }, 400); }

  const type = String(payload.type || '');
  if (!COMMAND_TYPES.has(type)) return json({ error: 'Onbekende opdracht.' }, 422);

  const version = Number(row.command_version || 0) + 1;
  const now = new Date().toISOString();
  const command = {
    type,
    memoryId: cleanId(payload.memoryId),
    storyId: cleanId(payload.storyId),
    issuedAt: now
  };

  const nextState = type === 'disconnect' ? 'waiting' : 'paired';
  await env.DB.prepare(`
    UPDATE tv_sessions
    SET state = ?, command_version = ?, command_json = ?, updated_at = ?,
      controller_token_hash = CASE WHEN ? = 'disconnect' THEN NULL ELSE controller_token_hash END,
      paired_at = CASE WHEN ? = 'disconnect' THEN NULL ELSE paired_at END
    WHERE session_id = ?
  `).bind(nextState, version, JSON.stringify(command), now, type, type, sessionId).run();

  return json({ ok: true, version, command });
}

async function closeSession(request, env, sessionId) {
  const token = bearerToken(request);
  if (!token) return json({ error: 'Sessie-token ontbreekt.' }, 401);

  const row = await env.DB.prepare(`
    SELECT session_id, player_token_hash, controller_token_hash
    FROM tv_sessions WHERE session_id = ? LIMIT 1
  `).bind(sessionId).first();
  if (!row) return json({ ok: true });

  const hash = await sha256(token);
  const allowed = safeEqual(hash, row.player_token_hash) ||
    (row.controller_token_hash && safeEqual(hash, row.controller_token_hash));
  if (!allowed) return json({ error: 'Geen toegang.' }, 403);

  await env.DB.prepare(`DELETE FROM tv_sessions WHERE session_id = ?`).bind(sessionId).run();
  return json({ ok: true });
}

function renderTVPage() {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0F2747">
<title>TALERA Player</title>
<style>
:root{color-scheme:light;--ink:#0F2747;--paper:#F7F4EF;--blue:#DCEAF6;--warm:#E7A98B;--muted:#647181}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--paper);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink)}
body{min-height:100dvh;overflow:hidden}
.player{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;padding:clamp(24px,4vw,58px);background:
radial-gradient(circle at 74% 16%,rgba(220,234,246,.92),transparent 34%),
radial-gradient(circle at 18% 88%,rgba(231,169,139,.16),transparent 33%),
linear-gradient(180deg,#FBF9F5 0%,#F7F4EF 100%)}
.brand{font-weight:850;letter-spacing:.34em;padding-left:.34em;font-size:clamp(15px,1.4vw,20px)}
.stage{display:grid;place-items:center}
.card{width:min(760px,90vw);display:grid;grid-template-columns:minmax(190px,280px) 1fr;gap:clamp(28px,5vw,60px);align-items:center}
.qr-wrap{aspect-ratio:1;border-radius:30px;background:#fff;display:grid;place-items:center;padding:20px;box-shadow:0 24px 70px rgba(15,39,71,.12);border:1px solid rgba(15,39,71,.06)}
#qr{width:100%;height:100%;display:grid;place-items:center}
#qr img,#qr canvas{max-width:100%!important;height:auto!important}
.copy h1{font-size:clamp(34px,5vw,68px);line-height:.98;letter-spacing:-.055em;margin:0 0 20px;font-weight:760}
.copy p{font-size:clamp(16px,1.8vw,22px);line-height:1.45;color:#3E4A59;margin:0 0 16px;max-width:620px}
.code{display:inline-flex;align-items:center;gap:12px;padding:10px 16px;border-radius:999px;background:rgba(255,255,255,.72);border:1px solid rgba(15,39,71,.07);font-weight:750;letter-spacing:.16em}
.status{font-size:14px;color:var(--muted)}
.status strong{color:var(--ink)}
.footer{display:flex;justify-content:space-between;gap:24px;align-items:end;font-size:13px;color:rgba(15,39,71,.55)}
.paired .qr-wrap{box-shadow:0 24px 70px rgba(49,95,135,.17)}
.paired .copy h1{font-size:clamp(32px,4.2vw,58px)}
.command{margin-top:24px;padding:18px 20px;border-radius:20px;background:rgba(255,255,255,.56);border:1px solid rgba(15,39,71,.06);font-size:15px;min-height:58px}
@media(max-width:760px){.player{padding:24px}.card{grid-template-columns:1fr;text-align:center;width:min(440px,94vw)}.qr-wrap{width:min(270px,72vw);margin:auto}.copy p{margin-left:auto;margin-right:auto}.footer{font-size:12px}.brand{text-align:center}}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" defer></script>
</head>
<body>
<main class="player" id="player">
  <div class="brand">TALERA</div>
  <section class="stage">
    <div class="card">
      <div class="qr-wrap"><div id="qr" aria-label="QR-code om telefoon te koppelen"></div></div>
      <div class="copy">
        <h1 id="headline">Koppel je telefoon</h1>
        <p id="lead">Scan de QR-code met je telefoon. Daarna wordt je telefoon de bediening voor deze TALERA Player.</p>
        <div class="code">CODE <span id="pairCode">------</span></div>
        <div class="command" id="command">De Player wacht op een telefoon.</div>
      </div>
    </div>
  </section>
  <footer class="footer"><span id="status">Nieuwe TV-sessie starten…</span><span>TALERA Player · desktop testmodus</span></footer>
</main>
<script>
(()=>{
  const player=document.getElementById('player');
  const status=document.getElementById('status');
  const headline=document.getElementById('headline');
  const lead=document.getElementById('lead');
  const code=document.getElementById('pairCode');
  const command=document.getElementById('command');
  const qr=document.getElementById('qr');
  let session=null;
  let lastVersion=-1;
  let timer=null;

  function showQR(url){
    qr.innerHTML='';
    if(window.QRCode){new QRCode(qr,{text:url,width:260,height:260,colorDark:'#0F2747',colorLight:'#FFFFFF',correctLevel:QRCode.CorrectLevel.M});return}
    const fallback=document.createElement('div');
    fallback.style.cssText='font-size:13px;line-height:1.4;text-align:center;word-break:break-word;color:#0F2747';
    fallback.textContent=url;
    qr.appendChild(fallback);
  }

  function applyCommand(item){
    if(!item)return;
    const labels={home:'Open TALERA start',next:'Volgende herinnering',previous:'Vorige herinnering',present:'Start presentatie',pause:'Pauzeer presentatie',disconnect:'Telefoon losgekoppeld'};
    command.textContent=labels[item.type]||'Nieuwe opdracht ontvangen';
  }

  async function state(){
    if(!session)return;
    try{
      const res=await fetch('/api/tv/session/'+encodeURIComponent(session.sessionId),{headers:{authorization:'Bearer '+session.playerToken},cache:'no-store'});
      if(!res.ok)throw new Error('Sessie niet beschikbaar');
      const data=await res.json();
      if(data.paired){
        player.classList.add('paired');
        headline.textContent='Telefoon gekoppeld';
        lead.textContent='De TALERA Player is klaar. In de volgende bouwstap koppelen we hier de echte tijdlijn en herinneringen aan.';
        status.innerHTML='<strong>Verbonden</strong> · bediening via telefoon';
      }else{
        player.classList.remove('paired');
        headline.textContent='Koppel je telefoon';
        lead.textContent='Scan de QR-code met je telefoon. Daarna wordt je telefoon de bediening voor deze TALERA Player.';
        status.textContent='Wachten op telefoon…';
      }
      if(Number(data.commandVersion)!==lastVersion){
        lastVersion=Number(data.commandVersion);
        applyCommand(data.command);
      }
    }catch(error){
      status.textContent='Verbinding opnieuw opbouwen…';
    }
  }

  async function start(){
    const res=await fetch('/api/tv/session',{method:'POST',cache:'no-store'});
    if(!res.ok)throw new Error('TV-sessie kon niet starten');
    session=await res.json();
    code.textContent=session.pairCode;
    showQR(session.pairUrl);
    status.textContent='Wachten op telefoon…';
    await state();
    timer=setInterval(state,1200);
  }

  window.addEventListener('load',()=>start().catch(()=>{status.textContent='TV-sessie kon niet starten. Vernieuw de pagina.'}));
  window.addEventListener('pagehide',()=>{
    if(timer)clearInterval(timer);
    if(session)fetch('/api/tv/session/'+encodeURIComponent(session.sessionId),{method:'DELETE',headers:{authorization:'Bearer '+session.playerToken},keepalive:true}).catch(()=>{});
  });
})();
</script>
</body>
</html>`;
}

function renderPairPage() {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F7F4EF">
<title>Koppel met TALERA Player</title>
<style>
:root{--ink:#0F2747;--paper:#F7F4EF;--blue:#315F87;--muted:#647181}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--paper);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink)}
body{min-height:100dvh;display:grid;place-items:center;padding:22px}
.shell{width:min(520px,100%)}.brand{text-align:center;font-weight:850;letter-spacing:.31em;padding-left:.31em;margin-bottom:28px}
.card{padding:26px;border-radius:28px;background:rgba(255,255,255,.72);border:1px solid rgba(15,39,71,.06);box-shadow:0 18px 60px rgba(15,39,71,.09)}
h1{margin:0 0 12px;font-size:34px;line-height:1.02;letter-spacing:-.04em}p{margin:0 0 22px;color:#3E4A59;line-height:1.5}
button{width:100%;min-height:54px;border:0;border-radius:999px;background:var(--blue);color:white;font-size:15px;font-weight:760;padding:0 20px}
button.secondary{margin-top:10px;background:rgba(220,234,246,.72);color:var(--ink)}
button:disabled{opacity:.55}.notice{min-height:24px;margin:16px 0 0;color:var(--muted);font-size:14px;text-align:center}
.controls{display:none;margin-top:20px;grid-template-columns:1fr 1fr;gap:10px}.controls.show{display:grid}.controls button{min-height:48px}.controls .wide{grid-column:1/-1}
</style>
</head>
<body>
<main class="shell">
  <div class="brand">TALERA</div>
  <section class="card">
    <h1 id="title">Koppel met dit scherm</h1>
    <p id="copy">Met één tik maak je deze telefoon tijdelijk de bediening van de TALERA Player.</p>
    <button id="pair">Koppel deze telefoon</button>
    <div class="controls" id="controls">
      <button data-command="previous" class="secondary">Vorige</button>
      <button data-command="next" class="secondary">Volgende</button>
      <button data-command="present" class="wide">Start presentatie</button>
      <button data-command="home" class="secondary">TALERA start</button>
      <button data-command="pause" class="secondary">Pauze</button>
      <button data-command="disconnect" class="wide secondary">Verbinding verbreken</button>
    </div>
    <div class="notice" id="notice"></div>
  </section>
</main>
<script>
(()=>{
  const params=new URLSearchParams(location.search);
  const sessionId=params.get('session')||'';
  const pairToken=params.get('token')||'';
  const pairBtn=document.getElementById('pair');
  const controls=document.getElementById('controls');
  const notice=document.getElementById('notice');
  const title=document.getElementById('title');
  const copy=document.getElementById('copy');
  const storageKey='talera.tv.controller.'+sessionId;
  let controllerToken=localStorage.getItem(storageKey)||'';

  function paired(){
    pairBtn.style.display='none';
    controls.classList.add('show');
    title.textContent='Verbonden met TALERA';
    copy.textContent='Deze telefoon bedient nu het gekoppelde scherm.';
    notice.textContent='Klaar om de Player te bedienen.';
  }

  async function pair(){
    if(!sessionId||!pairToken){notice.textContent='Deze QR-code is onvolledig.';pairBtn.disabled=true;return}
    pairBtn.disabled=true;notice.textContent='Koppelen…';
    try{
      const res=await fetch('/api/tv/session/'+encodeURIComponent(sessionId)+'/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pairToken}),cache:'no-store'});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Koppelen lukte niet.');
      controllerToken=data.controllerToken;
      localStorage.setItem(storageKey,controllerToken);
      paired();
    }catch(error){
      pairBtn.disabled=false;notice.textContent=String(error.message||error);
    }
  }

  async function command(type){
    if(!controllerToken)return;
    notice.textContent='Opdracht sturen…';
    try{
      const res=await fetch('/api/tv/session/'+encodeURIComponent(sessionId)+'/command',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+controllerToken},body:JSON.stringify({type}),cache:'no-store'});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Opdracht mislukt.');
      notice.textContent=type==='disconnect'?'Verbinding verbroken.':'Opdracht ontvangen door TALERA.';
      if(type==='disconnect'){localStorage.removeItem(storageKey);controllerToken='';controls.classList.remove('show');pairBtn.style.display='block';pairBtn.disabled=false;title.textContent='Koppel met dit scherm';copy.textContent='Scan de QR-code opnieuw als je opnieuw wilt koppelen.'}
    }catch(error){notice.textContent=String(error.message||error)}
  }

  pairBtn.addEventListener('click',pair);
  controls.addEventListener('click',(event)=>{const button=event.target.closest('[data-command]');if(button)command(button.dataset.command)});
  if(controllerToken)paired();
})();
</script>
</body>
</html>`;
}

function cleanId(value) {
  const text = String(value || '');
  return /^[A-Za-z0-9_-]{1,120}$/.test(text) ? text : '';
}

function bearerToken(request) {
  const value = request.headers.get('authorization') || '';
  return value.toLowerCase().startsWith('bearer ') ? value.slice(7).trim() : '';
}

function isExpired(value) {
  const time = Date.parse(String(value || ''));
  return !Number.isFinite(time) || time <= Date.now();
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let text = '';
  for (const value of data) text += String.fromCharCode(value);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomDigits(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => String(value % 10)).join('');
}

async function sha256(value) {
  const data = new TextEncoder().encode(String(value || ''));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return Array.from(digest, (value) => value.toString(16).padStart(2, '0')).join('');
}

function safeEqual(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store, max-age=0',
      'x-talera-tv-player': TV_REVISION
    }
  });
}

function htmlResponse(html, extraHeaders = {}) {
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'no-store, max-age=0',
      ...extraHeaders
    }
  });
}
