import { STORYLAB_CLEAN_PAGE_HTML, STORYLAB_CLEAN_PAGE_REVISION } from './storylab-clean-page.js';

const STORYLAB_CLEAN_UX_REVISION = 'storylab-clean-ux-20260922-r16';

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

const UX_STYLE = `<style id="talera-storylab-clean-ux-r16">
.sheet{--talera-sheet-open-height:min(58dvh,500px);--talera-sheet-offset:calc(var(--talera-sheet-open-height) - 56px);height:var(--talera-sheet-open-height)!important;transform:translate3d(0,var(--talera-sheet-offset),0)!important;cursor:grab;will-change:transform;transition:transform .38s cubic-bezier(.22,.82,.25,1),box-shadow .24s ease!important;overflow:hidden;touch-action:none}.sheet.open{z-index:22;height:var(--talera-sheet-open-height)!important;transform:translate3d(0,var(--talera-sheet-offset),0)!important;cursor:default}.sheet.dragging{transition:none!important;cursor:grabbing;user-select:none;-webkit-user-select:none}.sheet.dragging .handle{background:#aeb8c1}.sheet-editor{opacity:0;transform:translateY(10px);transition:opacity .18s ease,transform .22s ease}.sheet.open .sheet-editor{opacity:1;transform:translateY(0)}.sheet.open .sheet-text{display:none}.sheet.open .sheet-editor{display:flex}.sheet textarea{cursor:text}.sheet-close{transition:transform .16s ease}.sheet-close:active{transform:scale(.97)}
.talera-publish-timeline{left:50%!important;right:auto!important;width:min(58vw,220px)!important;min-width:176px!important;height:38px!important;bottom:66px!important;transform:translateX(-50%)!important;padding:0 18px!important;font-size:12px!important;white-space:nowrap!important;box-shadow:0 6px 18px rgba(4,20,32,.13)!important}
.screen.sheet-open .talera-publish-timeline{transform:translate(-50%,10px)!important}
.talera-story-carousel{position:absolute;z-index:1;inset:0;overflow:hidden;opacity:0;pointer-events:none;transition:opacity .18s ease}.screen.has-photo .talera-story-carousel.ready{opacity:1;pointer-events:auto}.talera-story-page{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center center;transform:translate3d(0,0,0);will-change:transform;user-select:none;-webkit-user-drag:none;pointer-events:none}.talera-story-carousel.dragging .talera-story-page{transition:none!important}.talera-story-dots{position:absolute;z-index:6;left:50%;bottom:244px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;justify-content:center;min-height:22px;padding:5px 9px;border-radius:999px;background:rgba(8,28,43,.20);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .18s ease}.screen.has-photo .talera-story-dots.show{opacity:1}.talera-story-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.62);box-shadow:0 1px 5px rgba(4,20,32,.18)}.talera-story-dot.active{background:#fff;transform:scale(1.35)}.talera-story-wash{position:absolute;z-index:4;inset:0;background:#f8f7f2;opacity:0;pointer-events:none;will-change:opacity}.top,.photo-voice,.photo-more,.talera-publish-timeline,.talera-story-dots{will-change:opacity}
.bg-photo{z-index:0}.shade{z-index:2}.top,.empty,.mic-zone,.photo-ui,.sheet{isolation:isolate}
@media(max-height:760px){.sheet{--talera-sheet-height:50px}.talera-publish-timeline{bottom:58px!important;height:36px!important;width:min(60vw,210px)!important;min-width:168px!important}.talera-story-dots{bottom:214px}}
</style>`;

const EARLY_SESSION_SCRIPT = `<script id="talera-storylab-clean-fresh-session-r16">
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

const LATE_UX_SCRIPT = `<script id="talera-storylab-clean-late-ux-r16">
(()=>{
  const sheet=document.getElementById('sheet');
  const storyText=document.getElementById('storyText');
  const screen=document.getElementById('screen');
  const handle=document.getElementById('sheetHandle');
  const preview=document.getElementById('sheetPreview');
  const closeButton=document.getElementById('sheetClose');
  const bg=document.getElementById('bgPhoto');
  const shade=document.querySelector('.shade');
  const topArea=document.querySelector('.top');
  const photoVoice=document.querySelector('.photo-voice');
  const photoMore=document.querySelector('.photo-more');
  const client=localStorage.getItem('talera.storylab.clean.client')||'';
  if(!sheet||!screen)return;

  const wash=document.createElement('div');
  wash.className='talera-story-wash';
  wash.setAttribute('aria-hidden','true');
  if(shade&&shade.parentNode)shade.parentNode.insertBefore(wash,shade.nextSibling);
  else screen.prepend(wash);

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const closedHeight=()=>window.innerHeight<=760?50:56;
  const openHeight=()=>Math.min(window.innerHeight*.58,500);
  const closedOffset=()=>Math.max(0,openHeight()-closedHeight());
  let sheetPointer=null,startY=0,startOffset=closedOffset(),sheetOffset=closedOffset(),lastY=0,lastT=0,dragMoved=false;

  if(handle)handle.onclick=null;
  if(preview)preview.onclick=null;
  if(closeButton)closeButton.onclick=null;

  function progressFor(offset){
    const max=closedOffset();
    return max<=0?1:clamp(1-(offset/max),0,1);
  }
  function updateScene(progress){
    const p=clamp(progress,0,1);
    wash.style.opacity=String(p*.84);
    if(topArea)topArea.style.opacity=String(1-p*.46);
    if(photoVoice)photoVoice.style.opacity=String(1-p*.94);
    if(photoMore)photoMore.style.opacity=String(1-p*.94);
    const publish=document.getElementById('timelinePublish');
    if(publish)publish.style.opacity=String(1-p*.94);
    const photoDots=document.querySelector('.talera-story-dots');
    if(photoDots)photoDots.style.opacity=String((photoDots.classList.contains('show')?1:0)*(1-p*.88));
  }
  function applySheetOffset(offset){
    sheetOffset=clamp(offset,0,closedOffset());
    sheet.style.setProperty('--talera-sheet-open-height',Math.round(openHeight())+'px');
    sheet.style.setProperty('--talera-sheet-offset',Math.round(sheetOffset)+'px');
    updateScene(progressFor(sheetOffset));
  }
  function setSheet(open,animate=true){
    if(animate)sheet.classList.remove('dragging');
    else sheet.classList.add('dragging');
    sheet.classList.toggle('open',Boolean(open));
    screen.classList.toggle('sheet-open',Boolean(open));
    sheet.setAttribute('aria-expanded',open?'true':'false');
    applySheetOffset(open?0:closedOffset());
    if(!open&&storyText){try{storyText.blur()}catch(e){}}
    if(!animate)requestAnimationFrame(()=>sheet.classList.remove('dragging'));
  }
  setSheet(sheet.classList.contains('open'),false);

  ['touchstart','touchmove','touchend','touchcancel'].forEach(type=>{
    sheet.addEventListener(type,event=>event.stopImmediatePropagation(),{capture:true,passive:true});
  });

  sheet.addEventListener('pointerdown',event=>{
    const target=event.target;
    if(target&&target.closest&&target.closest('textarea,button'))return;
    sheetPointer=event.pointerId;startY=event.clientY;lastY=event.clientY;lastT=performance.now();dragMoved=false;
    startOffset=sheetOffset;
    sheet.classList.add('dragging');
    try{sheet.setPointerCapture(event.pointerId)}catch(e){}
  });
  sheet.addEventListener('pointermove',event=>{
    if(sheetPointer!==event.pointerId)return;
    const dy=event.clientY-startY;
    if(Math.abs(dy)>3)dragMoved=true;
    applySheetOffset(startOffset+dy);
    lastY=event.clientY;lastT=performance.now();
    if(event.cancelable)event.preventDefault();
  },{passive:false});
  function finishSheet(event){
    if(sheetPointer!==event.pointerId)return;
    const now=performance.now();
    const dt=Math.max(12,now-lastT);
    const velocity=(event.clientY-lastY)/dt;
    const projected=clamp(sheetOffset+velocity*150,0,closedOffset());
    const midpoint=closedOffset()*.54;
    sheetPointer=null;
    try{sheet.releasePointerCapture(event.pointerId)}catch(e){}
    sheet.classList.remove('dragging');
    setSheet(projected<midpoint,true);
  }
  sheet.addEventListener('pointerup',finishSheet);
  sheet.addEventListener('pointercancel',finishSheet);
  sheet.addEventListener('click',event=>{
    if(dragMoved){dragMoved=false;event.preventDefault();return}
    const target=event.target;
    if(target&&target.closest&&target.closest('textarea,button'))return;
    if(!sheet.classList.contains('open'))setSheet(true,true);
  });
  if(closeButton)closeButton.addEventListener('click',()=>setSheet(false,true));
  window.addEventListener('resize',()=>setSheet(sheet.classList.contains('open'),false),{passive:true});

  const carousel=document.createElement('div');
  carousel.className='talera-story-carousel';
  carousel.setAttribute('aria-label','Foto’s van deze herinnering');
  carousel.innerHTML='<img class="talera-story-page previous" alt=""><img class="talera-story-page current" alt=""><img class="talera-story-page next" alt="">';
  const dots=document.createElement('div');dots.className='talera-story-dots';dots.setAttribute('aria-hidden','true');
  if(shade&&shade.parentNode){shade.parentNode.insertBefore(carousel,shade);shade.parentNode.insertBefore(dots,shade.nextSibling)}else{screen.prepend(carousel);screen.appendChild(dots)}
  ['touchstart','touchmove','touchend','touchcancel'].forEach(type=>{
    carousel.addEventListener(type,event=>event.stopPropagation(),{capture:true,passive:true});
  });
  const previous=carousel.querySelector('.previous'),current=carousel.querySelector('.current'),next=carousel.querySelector('.next');
  const cache=new Map();
  let viewState=null,photoPointer=null,photoStartX=0,photoStartY=0,photoLastX=0,photoLastY=0,photoMode='',settling=false;

  function stateUrl(){return '/api/storylab-clean/state?client='+encodeURIComponent(client)}
  function photoUrl(id){return '/api/storylab-clean/photo?id='+encodeURIComponent(id)+'&client='+encodeURIComponent(client)}
  async function readState(){
    if(!client)return null;
    try{const res=await fetch(stateUrl(),{cache:'no-store'});if(!res.ok)return null;return await res.json()}catch(e){return null}
  }
  async function sourceFor(photo){
    if(!photo||!photo.id)return '';
    if(cache.has(photo.id))return cache.get(photo.id);
    const res=await fetch(photoUrl(photo.id),{cache:'force-cache'});if(!res.ok)throw new Error('photo');
    const blob=await res.blob(),url=URL.createObjectURL(blob);cache.set(photo.id,url);return url;
  }
  function normalized(index,count){return ((index%count)+count)%count}
  function setTransform(node,x,animate){
    node.style.transition=animate?'transform .30s cubic-bezier(.22,.82,.25,1)':'none';
    node.style.transform='translate3d('+Math.round(x)+'px,0,0)';
  }
  async function setPage(node,index){
    if(!viewState||!viewState.photos||!viewState.photos.length){node.removeAttribute('src');return}
    const photo=viewState.photos[normalized(index,viewState.photos.length)];
    try{const src=await sourceFor(photo);if(node.dataset.photoId!==photo.id){node.dataset.photoId=photo.id;node.src=src}node.style.objectFit=viewState.fit==='contain'?'contain':'cover'}catch(e){}
  }
  function syncDots(){
    if(!viewState||viewState.photos.length<=1){dots.classList.remove('show');dots.innerHTML='';return}
    dots.innerHTML=viewState.photos.map((_,index)=>'<span class="talera-story-dot'+(index===viewState.currentIndex?' active':'')+'"></span>').join('');
    dots.classList.add('show');
  }
  async function preparePages(){
    if(!viewState||!Array.isArray(viewState.photos)||viewState.photos.length<=1){carousel.classList.remove('ready');syncDots();return}
    carousel.classList.add('ready');
    const w=screen.getBoundingClientRect().width;
    setTransform(previous,-w,false);setTransform(current,0,false);setTransform(next,w,false);
    await Promise.all([setPage(previous,viewState.currentIndex-1),setPage(current,viewState.currentIndex),setPage(next,viewState.currentIndex+1)]);
    syncDots();
  }
  async function refreshCarousel(){
    const fresh=await readState();if(!fresh)return;
    fresh.currentIndex=clamp(Number(fresh.currentIndex||0),0,Math.max(0,(fresh.photos||[]).length-1));
    viewState=fresh;
    await preparePages();
  }
  function settlePhoto(direction){
    if(!viewState||viewState.photos.length<=1)return;
    viewState.currentIndex=normalized(viewState.currentIndex+direction,viewState.photos.length);
    const chosen=direction>0?next:previous;
    if(chosen&&chosen.src&&bg){bg.src=chosen.src;bg.style.objectFit=viewState.fit==='contain'?'contain':'cover'}
    setTimeout(()=>{preparePages();setTimeout(refreshCarousel,220)},305);
  }
  function releasePhoto(event){
    if(photoPointer!==event.pointerId||settling)return;
    const dx=photoLastX-photoStartX,dy=photoLastY-photoStartY,w=screen.getBoundingClientRect().width;
    const commit=photoMode==='horizontal'&&Math.abs(dx)>=42&&Math.abs(dx)>Math.abs(dy)*1.15;
    photoPointer=null;carousel.classList.remove('dragging');
    try{carousel.releasePointerCapture(event.pointerId)}catch(e){}
    if(!photoMode){photoMode='';return}
    settling=true;
    if(commit){
      const direction=dx<0?1:-1,target=direction>0?-w:w;
      setTransform(previous,target-w,true);setTransform(current,target,true);setTransform(next,target+w,true);
      setTimeout(()=>{settling=false;photoMode='';settlePhoto(direction)},300);
    }else{
      setTransform(previous,-w,true);setTransform(current,0,true);setTransform(next,w,true);
      setTimeout(()=>{settling=false;photoMode=''},300);
    }
  }
  carousel.addEventListener('pointerdown',event=>{
    if(settling||sheet.classList.contains('open')||!viewState||viewState.photos.length<=1)return;
    photoPointer=event.pointerId;photoStartX=photoLastX=event.clientX;photoStartY=photoLastY=event.clientY;photoMode='';carousel.classList.add('dragging');
    try{carousel.setPointerCapture(event.pointerId)}catch(e){}
  });
  carousel.addEventListener('pointermove',event=>{
    if(photoPointer!==event.pointerId||settling)return;
    photoLastX=event.clientX;photoLastY=event.clientY;
    const dx=photoLastX-photoStartX,dy=photoLastY-photoStartY;
    if(!photoMode){
      if(Math.abs(dx)>=4&&Math.abs(dx)>Math.abs(dy)*1.05)photoMode='horizontal';
      else if(Math.abs(dy)>=9&&Math.abs(dy)>Math.abs(dx)*1.14)photoMode='vertical';
    }
    if(photoMode!=='horizontal')return;
    if(event.cancelable)event.preventDefault();
    const w=screen.getBoundingClientRect().width;
    setTransform(previous,dx-w,false);setTransform(current,dx,false);setTransform(next,dx+w,false);
  },{passive:false});
  carousel.addEventListener('pointerup',releasePhoto);
  carousel.addEventListener('pointercancel',releasePhoto);

  const observer=new MutationObserver(()=>{if(screen.classList.contains('has-photo'))setTimeout(refreshCarousel,80);else{carousel.classList.remove('ready');dots.classList.remove('show')}});
  observer.observe(screen,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pageshow',refreshCarousel);
  setTimeout(refreshCarousel,100);
  setTimeout(refreshCarousel,900);

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
      photoSwipeInteraction: 'direct-follow-snap',
      audioEnabled: true,
      audioPersistence: 'r2',
      transcriptEnabled: 'browser-if-available',
      editableStoryText: true,
      freshDraftOnNavigate: true,
      resumeDraftOnReload: true,
      transcriptSheetInteraction: 'direct-follow-spring',
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