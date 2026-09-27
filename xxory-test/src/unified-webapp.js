import timelineWorker from '../../src/timeline-polish-worker.js';

export const UNIFIED_WEBAPP_REV = 'webapp-phase2-3-20260927-r1';

const DESKTOP_STYLE = String.raw`
<style id="talera-unified-desktop-style">
html.talera-unified-timeline,html.talera-unified-timeline body{background:#F7F4EF}
@media (min-width:900px){
  html.talera-unified-timeline .app{
    width:min(1440px,100%);
    margin:0 auto;
    grid-template-rows:minmax(0,1fr) 68px;
    box-shadow:0 0 0 1px rgba(15,39,71,.035),0 20px 70px rgba(15,39,71,.08);
  }
  html.talera-unified-timeline main{
    grid-template-rows:clamp(240px,30vh,330px) minmax(0,1fr);
  }
  html.talera-unified-timeline .memory-caption{
    padding-left:clamp(34px,4vw,72px);
    padding-right:clamp(34px,4vw,72px);
  }
  html.talera-unified-timeline nav{
    height:68px;
    min-height:68px;
    max-height:68px;
    padding-left:clamp(40px,7vw,120px);
    padding-right:clamp(40px,7vw,120px);
  }
  html.talera-unified-timeline .tell{
    width:54px;
    height:54px;
  }
}
@media (min-width:1200px){
  html.talera-unified-timeline main{
    grid-template-rows:clamp(260px,32vh,360px) minmax(0,1fr);
  }
}
</style>`;

const UNIFIED_SCRIPT = String.raw`
<script id="talera-unified-webapp-script">
(()=>{
  const REV='webapp-phase2-3-20260927-r1';
  const unifiedTimeline=location.pathname==='/timeline'||location.pathname==='/timeline/';
  if(unifiedTimeline){
    document.documentElement.classList.add('talera-unified-timeline');
    const tell=document.querySelector('nav .tell');
    if(tell&&!tell.dataset.taleraUnified){
      tell.dataset.taleraUnified='1';
      tell.addEventListener('click',(event)=>{
        event.preventDefault();
        location.href='/tell';
      },true);
    }
    const home=document.querySelector('nav .home');
    if(home&&!home.dataset.taleraUnified){
      home.dataset.taleraUnified='1';
      home.addEventListener('click',(event)=>{
        event.preventDefault();
        location.href='/timeline';
      },true);
    }
  }
  console.log('[TALERA WEBAPP]',REV,location.pathname);
})();
</script>`;

export async function handleUnifiedWebapp(request, env, ctx, legacyWorker) {
  const url = new URL(request.url);

  if (url.pathname === '/api/webapp/revision' && request.method === 'GET') {
    return Response.json({
      ok: true,
      revision: UNIFIED_WEBAPP_REV,
      phase2: {
        sameOriginTimeline: true,
        sameOriginTell: true,
        sameOriginLinkedMemoryApi: true,
        sharedMemoryStore: 'D1+R2-existing-story-model',
        externalTimelineHandoffRequired: false
      },
      phase3: {
        responsivePhoneDesktop: true,
        phonePrimaryCreation: true,
        desktopPrimaryTimelinePresentation: true,
        tvPlayerSeparateSurface: '/tv',
        testPortal: '/app'
      },
      routes: {
        app: '/app',
        tell: '/tell',
        timeline: '/timeline',
        tv: '/tv'
      }
    }, { headers: noStoreHeaders() });
  }

  if ((url.pathname === '/app' || url.pathname === '/app/' || url.pathname === '/home') &&
      (request.method === 'GET' || request.method === 'HEAD')) {
    return html(request.method === 'HEAD' ? '' : renderAppHome(), {
      'x-talera-webapp': UNIFIED_WEBAPP_REV
    });
  }


  if ((url.pathname === '/timeline' || url.pathname === '/timeline/') &&
      (request.method === 'GET' || request.method === 'HEAD')) {
    const rewritten = new URL(request.url);
    rewritten.pathname = '/';
    const timelineEnv = { ...env, SHARE_PREVIEWS: env?.SHARE_PREVIEWS || env?.MEDIA };
    const response = await timelineWorker.fetch(new Request(rewritten.toString(), {
      method: request.method,
      headers: request.headers
    }), timelineEnv, ctx);
    return decorateTimelineResponse(response);
  }

  if (url.pathname.startsWith('/api/linked/')) {
    return handleLocalLinkedMemory(request, env, ctx, legacyWorker);
  }

  if (url.pathname.startsWith('/api/share-preview')) {
    const timelineEnv = { ...env, SHARE_PREVIEWS: env?.SHARE_PREVIEWS || env?.MEDIA };
    const response = await timelineWorker.fetch(request, timelineEnv, ctx);
    return rewriteSharePreviewResponse(response, request);
  }

  return null;
}

async function handleLocalLinkedMemory(request, env, ctx, legacyWorker) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }

  const incoming = new URL(request.url);
  const allowed = /^\/api\/linked\/stories\/[^/]+(?:\/media\/[^/]+|\/audio)?$/;
  if (!allowed.test(incoming.pathname)) {
    return Response.json({ error: 'Niet gevonden.' }, { status: 404, headers: noStoreHeaders() });
  }

  const target = new URL(request.url);
  target.pathname = target.pathname.replace(/^\/api\/linked/, '/api/integration');

  const headers = new Headers();
  for (const name of ['authorization','range','if-none-match']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const response = await legacyWorker.fetch(new Request(target.toString(), {
    method: request.method,
    headers
  }), env, ctx);

  const out = new Headers(response.headers);
  out.delete('access-control-allow-origin');
  out.delete('access-control-allow-headers');
  out.delete('access-control-allow-methods');
  out.set('x-talera-linked-mode', 'same-origin');
  out.set('x-talera-webapp', UNIFIED_WEBAPP_REV);
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: out
  });
}

async function rewriteSharePreviewResponse(response, request) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/share-preview' || request.method !== 'POST' || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) return response;

  let data;
  try { data = await response.json(); } catch { return response; }
  if (typeof data?.shareUrl === 'string') {
    const share = new URL(data.shareUrl);
    if (share.pathname === '/') share.pathname = '/timeline';
    data.shareUrl = share.toString();
  }
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-talera-webapp', UNIFIED_WEBAPP_REV);
  headers.set('content-type', 'application/json; charset=UTF-8');
  return new Response(JSON.stringify(data), { status: response.status, headers });
}

async function decorateTimelineResponse(response) {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return withHeader(response, 'x-talera-webapp', UNIFIED_WEBAPP_REV);
  const source = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-talera-webapp', UNIFIED_WEBAPP_REV);
  headers.set('x-talera-surface', 'timeline-desktop-responsive');

  const htmlText = source
    .replace('<html lang="nl">', '<html lang="nl" class="talera-unified-timeline">')
    .replace('</head>', DESKTOP_STYLE + '</head>')
    .replace('</body>', UNIFIED_SCRIPT + '</body>')
    .replace('<title>TALERA — Tijdlijnprototype v22 · PhotoBook</title>', '<title>TALERA — Mijn tijdlijn</title>');

  return new Response(htmlText, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function withHeader(response, name, value) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function noStoreHeaders() {
  return {
    'content-type': 'application/json; charset=UTF-8',
    'cache-control': 'no-store, max-age=0',
    'x-talera-webapp': UNIFIED_WEBAPP_REV
  };
}

function html(value, extra = {}) {
  return new Response(value, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'no-store, max-age=0',
      ...extra
    }
  });
}

function renderAppHome() {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F7F4EF">
<title>TALERA</title>
<style>
:root{--ink:#0F2747;--paper:#F7F4EF;--blue:#315F87;--soft:#DCEAF6;--warm:#E7A98B;--muted:#647181}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
body{min-height:100dvh}
.shell{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;padding:max(22px,env(safe-area-inset-top)) clamp(18px,4vw,54px) max(20px,env(safe-area-inset-bottom));gap:24px}
.brand{font-weight:850;letter-spacing:.34em;padding-left:.34em;font-size:16px}
.hero{display:grid;place-items:center}
.wrap{width:min(980px,100%)}
h1{font-size:clamp(38px,7vw,76px);line-height:.96;letter-spacing:-.055em;margin:0 0 18px;max-width:10ch}
.lead{font-size:clamp(17px,2vw,22px);line-height:1.5;color:#3E4A59;max-width:650px;margin:0 0 34px}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.card{min-height:190px;padding:24px;border-radius:28px;text-decoration:none;color:inherit;background:rgba(255,255,255,.72);border:1px solid rgba(15,39,71,.06);box-shadow:0 15px 46px rgba(15,39,71,.07);display:flex;flex-direction:column;justify-content:space-between;transition:transform .16s ease,box-shadow .16s ease}
.card:hover{transform:translateY(-2px);box-shadow:0 19px 54px rgba(15,39,71,.10)}
.card strong{font-size:24px;letter-spacing:-.03em}.card span{color:var(--muted);line-height:1.4}.mark{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--soft);font-weight:800}.card.primary .mark{background:var(--blue);color:white}.card.tv .mark{background:rgba(231,169,139,.28)}
.foot{font-size:12px;color:rgba(15,39,71,.48)}
@media(max-width:760px){.shell{gap:12px}.hero{place-items:start}.wrap{padding-top:6vh}.grid{grid-template-columns:1fr}.card{min-height:132px;padding:20px}h1{font-size:44px}.lead{font-size:17px;margin-bottom:24px}}
</style>
</head>
<body>
<main class="shell">
  <div class="brand">TALERA</div>
  <section class="hero">
    <div class="wrap">
      <h1>Jouw leven, verteld.</h1>
      <p class="lead">Dit is de gecombineerde webapp-testomgeving. Dezelfde herinneringen worden gebruikt op telefoon, desktop en straks in de TALERA Player.</p>
      <div class="grid">
        <a class="card primary" href="/timeline"><div class="mark">↔</div><div><strong>Mijn tijdlijn</strong><br><span>Bekijken, bladeren en presenteren. Op desktop krijgt deze omgeving extra ruimte.</span></div></a>
        <a class="card" href="/tell"><div class="mark">●</div><div><strong>Vertellen</strong><br><span>Een herinnering maken of verder bewerken. Telefoon blijft hiervoor de primaire werkplek.</span></div></a>
        <a class="card tv" href="/tv"><div class="mark">▣</div><div><strong>TV Player</strong><br><span>Open de groot-schermomgeving en test de QR-koppeling alsof deze desktop je televisie is.</span></div></a>
      </div>
    </div>
  </section>
  <div class="foot">Webapp bouwbranch · webapp-phase2-3-20260927-r1</div>
</main>
</body>
</html>`;
}
