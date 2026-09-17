import { STORYLAB_CLEAN_PAGE_HTML, STORYLAB_CLEAN_PAGE_REVISION } from './storylab-clean-page.js';

const STORYLAB_CLEAN_UX_REVISION = 'storylab-clean-ux-20260917-r14';

const htmlHeaders = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-storylab-clean-revision': STORYLAB_CLEAN_PAGE_REVISION,
  'x-storylab-clean-ux': STORYLAB_CLEAN_UX_REVISION
};

const jsonHeaders = { 'cache-control': 'no-store, max-age=0' };
const DEFAULT_STATE = {
  title: '',
  date: '',
  storyText: '',
  note: '',
  photos: [],
  currentIndex: 0,
  fit: 'cover',
  audioId: ''
};

const UX_STYLE = `<style id="talera-storylab-clean-ux-r14">
.sheet{cursor:pointer}.sheet:not(.open){touch-action:none}.sheet.open{z-index:22}
.talera-publish-timeline{left:50%!important;right:auto!important;width:min(58vw,220px)!important;min-width:176px!important;height:38px!important;bottom:66px!important;transform:translateX(-50%)!important;padding:0 18px!important;font-size:12px!important;white-space:nowrap!important;box-shadow:0 6px 18px rgba(4,20,32,.13)!important}
.screen.sheet-open .talera-publish-timeline{transform:translate(-50%,10px)!important}
@media(max-height:760px){.talera-publish-timeline{bottom:58px!important;height:36px!important;width:min(60vw,210px)!important;min-width:168px!important}}
</style>`;

const EARLY_SESSION_SCRIPT = `<script id="talera-storylab-clean-fresh-session-r14">
(()=>{
  const clientKey='talera.storylab.clean.client';
  const sessionKey='talera.storylab.clean.session-client';
  const params=new URLSearchParams(location.search);
  const navigation=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||null;
  let navType=navigation&&navigation.type?navigation.type:'navigate';
  if(!navigation&&performance.navigation&&performance.navigation.type===1)navType='reload';
  const keepExisting=params.get('resume')==='1'||navType==='reload'||navType==='back_forward';
  let client=keepExisting?(sessionStorage.getItem(sessionKey)||localStorage.getItem(clientKey)||''):'';
  if(!client){
    client=(globalThis.crypto&&crypto.randomUUID)?crypto.randomUUID():('story-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12));
  }
  localStorage.setItem(clientKey,client);
  sessionStorage.setItem(sessionKey,client);
})();
</script>`;

const LATE_UX_SCRIPT = `<script id="talera-storylab-clean-late-ux-r14">
(()=>{
  const sheet=document.getElementById('sheet');
  const storyText=document.getElementById('storyText');
  const screen=document.getElementById('screen');
  if(sheet&&screen){
    const openSheet=()=>{
      if(sheet.classList.contains('open'))return;
      sheet.classList.add('open');
      screen.classList.add('sheet-open');
      sheet.setAttribute('aria-expanded','true');
      setTimeout(()=>{try{storyText&&storyText.focus({preventScroll:true})}catch(e){try{storyText&&storyText.focus()}catch(_){}}},60);
    };
    const closeState=()=>sheet.setAttribute('aria-expanded',sheet.classList.contains('open')?'true':'false');
    sheet.setAttribute('aria-expanded',sheet.classList.contains('open')?'true':'false');
    sheet.addEventListener('click',event=>{
      if(sheet.classList.contains('open'))return;
      const target=event.target;
      if(target&&target.closest&&target.closest('textarea,button'))return;
      openSheet();
    });
    let pointerY=null;
    sheet.addEventListener('pointerdown',event=>{pointerY=event.clientY},{passive:true});
    sheet.addEventListener('pointerup',event=>{
      if(pointerY==null)return;
      const dy=event.clientY-pointerY;pointerY=null;
      if(dy<-18)openSheet();
      closeState();
    },{passive:true});
    new MutationObserver(closeState).observe(sheet,{attributes:true,attributeFilter:['class']});
  }
  setTimeout(()=>{
    const publish=document.getElementById('timelinePublish');
    if(publish)publish.textContent='Plaats op tijdlijn';
  },0);
})();
</script>`;

function storyLabHtml() {
  return STORYLAB_CLEAN_PAGE_HTML
    .replace('</head>', UX_STYLE + '</head>')
    .replace('<body>', '<body>' + EARLY_SESSION_SCRIPT)
    .replace('</body>', LATE_UX_SCRIPT + '</body>');
}

function safeClient(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
}

function safeId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
}

function idFromUrl(url, kind) {
  const queryId = safeId(url.searchParams.get('id'));
  if (queryId) return queryId;
  const prefix = '/api/storylab-clean/' + kind + '&id=';
  if (url.pathname.startsWith(prefix)) {
    return safeId(decodeURIComponent(url.pathname.slice(prefix.length)));
  }
  return null;
}

function cleanState(input) {
  const source = input && typeof input === 'object' ? input : {};
  const photos = Array.isArray(source.photos) ? source.photos.slice(0, 12).map((photo) => ({
    id: safeId(photo?.id) || '',
    name: String(photo?.name || 'foto').slice(0, 180),
    type: String(photo?.type || 'image/jpeg').slice(0, 100),
    createdAt: Number(photo?.createdAt || Date.now())
  })).filter((photo) => photo.id) : [];
  const maxIndex = Math.max(0, photos.length - 1);
  return {
    title: String(source.title || '').slice(0, 140),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(source.date || '')) ? String(source.date) : '',
    storyText: String(source.storyText || '').slice(0, 50000),
    note: String(source.note || '').slice(0, 10000),
    photos,
    currentIndex: Math.min(Math.max(0, Number(source.currentIndex || 0)), maxIndex),
    fit: source.fit === 'contain' ? 'contain' : 'cover',
    audioId: safeId(source.audioId) || ''
  };
}

function stateKey(client) {
  return `storylab-clean/${client}/state.json`;
}

function mediaKey(client, kind, id) {
  return `storylab-clean/${client}/${kind}/${id}`;
}

async function handleState(request, env, url, client) {
  if (request.method === 'GET') {
    const object = await env.MEDIA.get(stateKey(client));
    if (!object) return Response.json(DEFAULT_STATE, { headers: jsonHeaders });
    try {
      return Response.json(cleanState(JSON.parse(await object.text())), { headers: jsonHeaders });
    } catch {
      return Response.json(DEFAULT_STATE, { headers: jsonHeaders });
    }
  }
  if (request.method === 'PUT') {
    let input;
    try { input = await request.json(); } catch { return Response.json({ error: 'invalid_json' }, { status: 400, headers: jsonHeaders }); }
    const state = cleanState(input);
    await env.MEDIA.put(stateKey(client), JSON.stringify(state), {
      httpMetadata: { contentType: 'application/json; charset=utf-8' }
    });
    return Response.json({ ok: true, state }, { headers: jsonHeaders });
  }
  return new Response('Method not allowed', { status: 405 });
}

async function handleBinary(request, env, url, client, kind, expectedPrefix, maxBytes) {
  const id = idFromUrl(url, kind);
  if (!id) return Response.json({ error: 'invalid_id' }, { status: 400, headers: jsonHeaders });
  const key = mediaKey(client, kind === 'photo' ? 'photos' : 'audio', id);

  if (request.method === 'GET') {
    const object = await env.MEDIA.get(key);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'private, max-age=3600');
    return new Response(object.body, { headers });
  }

  if (request.method === 'DELETE') {
    await env.MEDIA.delete(key);
    return Response.json({ ok: true }, { headers: jsonHeaders });
  }

  if (request.method === 'PUT') {
    const type = request.headers.get('content-type') || '';
    if (!type.startsWith(expectedPrefix)) return Response.json({ error: 'invalid_type' }, { status: 415, headers: jsonHeaders });
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared && declared > maxBytes) return Response.json({ error: 'too_large' }, { status: 413, headers: jsonHeaders });
    const body = await request.arrayBuffer();
    if (body.byteLength > maxBytes) return Response.json({ error: 'too_large' }, { status: 413, headers: jsonHeaders });
    await env.MEDIA.put(key, body, {
      httpMetadata: { contentType: type },
      customMetadata: { originalName: (request.headers.get('x-file-name') || '').slice(0, 300) }
    });
    return Response.json({ ok: true, id, bytes: body.byteLength }, { headers: jsonHeaders });
  }

  return new Response('Method not allowed', { status: 405 });
}

export async function handleStoryLabClean(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/storylab-clean' || url.pathname === '/storylab-clean/') {
    return new Response(storyLabHtml(), { status: 200, headers: htmlHeaders });
  }

  if (url.pathname === '/api/storylab-clean/revision') {
    return Response.json({
      revision: STORYLAB_CLEAN_PAGE_REVISION,
      uxRevision: STORYLAB_CLEAN_UX_REVISION,
      phase: 'functional-photo-story-build',
      cleanSlate: true,
      importsLegacyStoryLab: false,
      importsV9: false,
      importsCleanRebuild: false,
      photoSelectionEnabled: true,
      persistentPhotoStorage: 'r2',
      multiplePhotosEnabled: true,
      swipePhotosEnabled: true,
      audioEnabled: true,
      audioPersistence: 'r2',
      transcriptEnabled: false,
      editableStoryText: true,
      freshDraftOnNavigate: true,
      resumeDraftOnReload: true,
      transcriptSheetInteraction: 'tap+swipe',
      compactTimelineButton: true,
      timelineEnabled: false
    }, {
      headers: jsonHeaders
    });
  }

  if (url.pathname === '/api/storylab-clean/state' || url.pathname.startsWith('/api/storylab-clean/photo') || url.pathname.startsWith('/api/storylab-clean/audio')) {
    if (!env?.MEDIA) return Response.json({ error: 'media_binding_missing' }, { status: 503, headers: jsonHeaders });
    const client = safeClient(url.searchParams.get('client'));
    if (!client) return Response.json({ error: 'invalid_client' }, { status: 400, headers: jsonHeaders });

    if (url.pathname === '/api/storylab-clean/state') return handleState(request, env, url, client);
    if (url.pathname.startsWith('/api/storylab-clean/photo')) return handleBinary(request, env, url, client, 'photo', 'image/', 20 * 1024 * 1024);
    if (url.pathname.startsWith('/api/storylab-clean/audio')) return handleBinary(request, env, url, client, 'audio', 'audio/', 60 * 1024 * 1024);
  }

  return null;
}