import baseWorker from './index.js';

const POLISH_REVISION = 'timeline-photo-handoff-polish-20260917-r1';

const POLISH_STYLE = String.raw`
<style id="talera-timeline-photo-handoff-polish">
.talera-live-loading{display:none!important}
.timeline .talera-photo-dots{
  top:calc(100% + 18px)!important;
  min-height:22px!important;
  padding:4px 10px!important;
  gap:7px!important;
  background:rgba(15,39,71,.12)!important;
  box-shadow:0 4px 14px rgba(15,39,71,.10)!important;
}
.timeline .talera-photo-dot{width:7px!important;height:7px!important}
.talera-media-wait{
  position:absolute;
  z-index:19;
  inset:0;
  display:grid;
  place-items:center;
  padding:28px;
  color:#fff;
  background:
    radial-gradient(circle at 68% 26%,rgba(91,143,185,.26),transparent 32%),
    linear-gradient(180deg,#5b788d 0%,#365b75 44%,#173c58 72%,#0f2747 100%);
  opacity:0;
  visibility:hidden;
  pointer-events:none;
  transition:opacity .28s ease,visibility 0s linear .3s;
}
.talera-media-wait.show{opacity:1;visibility:visible;transition:opacity .28s ease,visibility 0s}
.talera-media-wait-card{text-align:center;transform:translateY(-3vh);text-shadow:0 2px 12px rgba(6,18,30,.22)}
.talera-media-wait-brand{font:820 17px/1 -apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif;letter-spacing:.31em;padding-left:.31em}
.talera-media-wait-copy{margin-top:13px;font:650 13px/1.28 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:rgba(255,255,255,.84)}
.talera-media-wait-line{position:relative;width:88px;height:3px;margin:18px auto 0;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.20)}
.talera-media-wait-line::after{content:"";position:absolute;inset:0;width:42%;border-radius:inherit;background:#fff;animation:taleraWaitSlide 1.15s ease-in-out infinite}
@keyframes taleraWaitSlide{0%{transform:translateX(-115%)}55%{transform:translateX(105%)}100%{transform:translateX(245%)}}
@media(prefers-reduced-motion:reduce){.talera-media-wait,.talera-media-wait-line::after{transition:none!important;animation:none!important}.talera-media-wait-line::after{transform:translateX(70%)}}
</style>`;

const POLISH_SCRIPT = String.raw`
<script id="talera-timeline-photo-handoff-polish-script">
(()=>{
  const REV='${POLISH_REVISION}';
  const runtime=window.__taleraTimelineRuntime;
  const memorySpace=document.querySelector('.memory-space');
  if(!runtime||!memorySpace)return;

  const waitLayer=document.createElement('div');
  waitLayer.className='talera-media-wait';
  waitLayer.setAttribute('aria-live','polite');
  waitLayer.innerHTML='<div class="talera-media-wait-card"><div class="talera-media-wait-brand">TALERA</div><div class="talera-media-wait-copy">Je herinnering wordt klaargezet</div><div class="talera-media-wait-line" aria-hidden="true"></div></div>';
  memorySpace.appendChild(waitLayer);

  const inflight=new Set();
  const firstPhotoUrls=new Map();

  function loading(memory){
    return Boolean(memory&&memory._taleraLive&&memory._photoLoading&&memory.storyId&&memory._manageToken);
  }

  function renderWait(memory){
    waitLayer.classList.toggle('show',loading(memory));
  }

  function auth(token){return {authorization:'Bearer '+token}}

  async function fetchJson(path,token){
    const response=await fetch(path,{headers:auth(token),cache:'no-store'});
    if(!response.ok)throw new Error('story '+response.status);
    return response.json();
  }

  async function fetchFirstPhoto(memory){
    const storyId=String(memory.storyId||'');
    const token=String(memory._manageToken||'');
    if(!storyId||!token||inflight.has(storyId))return;
    inflight.add(storyId);
    try{
      const detail=await fetchJson('/api/linked/stories/'+encodeURIComponent(storyId),token);
      const first=(Array.isArray(detail.media)?detail.media:[]).find(item=>item&&item.mediaType==='image');
      if(!first){
        const current=runtime.currentMemory();
        if(current&&String(current.storyId||'')===storyId){
          current._photoLoading=false;
          runtime.writeMemory(current);
          runtime.draw();
        }
        return;
      }

      const response=await fetch('/api/linked/stories/'+encodeURIComponent(storyId)+'/media/'+encodeURIComponent(first.id),{headers:auth(token),cache:'no-store'});
      if(!response.ok)throw new Error('media '+response.status);
      const blob=await response.blob();
      if(!blob.size)throw new Error('empty image');
      const url=URL.createObjectURL(blob);
      firstPhotoUrls.set(storyId,url);

      const current=runtime.currentMemory();
      if(!current||String(current.storyId||'')!==storyId||!current._photoLoading)return;
      current.photos=[url];
      current._photoIndex=0;
      current.image=url;
      current._photoLoading=false;
      runtime.writeMemory(current);
      runtime.settlePhoto(current);
      runtime.draw();
      renderWait(current);
    }catch(error){
      console.warn('[TALERA photo-first polish]',error);
    }finally{
      inflight.delete(storyId);
    }
  }

  function handle(memory){
    renderWait(memory);
    if(loading(memory))fetchFirstPhoto(memory);
  }

  runtime.subscribe(handle);
  handle(runtime.currentMemory());
  window.addEventListener('pagehide',()=>{
    firstPhotoUrls.forEach(url=>{try{URL.revokeObjectURL(url)}catch(e){}});
    firstPhotoUrls.clear();
  },{once:true});
  console.log('[TALERA]',REV,'ready');
})();
</script>`;

function decorateTimeline(response, request) {
  const url = new URL(request.url);
  if (url.pathname !== '/') return response;
  if (response.status !== 200 || !(response.headers.get('content-type') || '').includes('text/html')) return response;
  return response.text().then((html) => {
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store, max-age=0');
    headers.set('x-talera-photo-polish', POLISH_REVISION);
    const withStyle = html.replace('</head>', POLISH_STYLE + '</head>');
    return new Response(withStyle.replace('</body>', POLISH_SCRIPT + '</body>'), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
}

export default {
  async fetch(request, env, ctx) {
    const response = await baseWorker.fetch(request, env, ctx);
    return decorateTimeline(response, request);
  },
};
