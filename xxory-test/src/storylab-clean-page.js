export const STORYLAB_CLEAN_PAGE_REVISION = 'storylab-clean-functional-20260924-video-duration-r1';

export const STORYLAB_CLEAN_PAGE_HTML = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="theme-color" content="#0b2740" />
<title>TALERA — Vertelpagina</title>
<style>
:root{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",system-ui,sans-serif;--ink:#0d2b49;--cream:#f7f4ef;--sheet-text:#60738a}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b2740}body{-webkit-text-size-adjust:100%;color:#fff;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}button,input,textarea{font:inherit}button{color:inherit;-webkit-tap-highlight-color:transparent}.hidden{display:none!important}
.screen{position:relative;width:100%;height:100dvh;min-height:100dvh;overflow:hidden;background:linear-gradient(180deg,#5d7d92 0%,#4f7187 34%,#1d4661 66%,#0c2c44 100%)}
.bg-photo,.bg-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .12s ease}.screen.has-photo:not(.has-video) .bg-photo{opacity:1}.screen.has-video .bg-video{opacity:1}.bg-video{background:#081a28}.shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(4,23,38,.055) 0%,rgba(4,23,38,.01) 44%,rgba(4,23,38,.01) 61%,rgba(5,24,39,.15) 100%)}.screen.has-photo .shade{background:linear-gradient(180deg,rgba(7,15,22,.32) 0%,rgba(7,15,22,.07) 31%,rgba(7,15,22,.015) 61%,rgba(5,20,32,.36) 100%)}
.top{position:absolute;z-index:5;left:18px;right:18px;top:max(30px,env(safe-area-inset-top));display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start}.brand{margin:0;font-size:10.8px;line-height:1;font-weight:800;letter-spacing:.30em;color:rgba(255,255,255,.88)}
.title{display:block;width:min(76vw,330px);margin:9px 0 0;padding:0;border:0;outline:0;background:transparent;color:rgba(255,255,255,.96);font-size:clamp(18.2px,4.75vw,22.5px);line-height:1.06;font-weight:760;letter-spacing:-.028em}.title::placeholder{color:rgba(255,255,255,.96);opacity:1}.screen.has-photo .title{font-size:clamp(18px,4.8vw,23px);font-weight:760;text-shadow:0 2px 16px rgba(0,0,0,.22)}
.date{position:relative;margin-top:13px;min-height:37px;padding:0 10px;border:.85px solid rgba(255,255,255,.34);border-radius:999px;background:rgba(10,34,53,.055);display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:720;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.date svg{width:15px;height:15px;flex:0 0 auto;opacity:.92}.date input{position:absolute;inset:0;opacity:0;width:100%;height:100%}
.photo-button{min-height:42px;padding:0 13px;border:.85px solid rgba(255,255,255,.32);border-radius:999px;background:rgba(10,34,53,.055);font-size:13.5px;font-weight:780;white-space:nowrap;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.empty{position:absolute;z-index:3;left:24px;right:24px;top:40%;transform:translateY(-22%);text-align:center}.plus{width:70px;height:70px;margin:0 auto 19px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(250,248,244,.985);color:var(--ink);font-size:36px;line-height:1;font-weight:280;box-shadow:0 7px 20px rgba(0,0,0,.045)}.empty h2{margin:0 auto;max-width:314px;font-size:19.6px;line-height:1.11;font-weight:780;letter-spacing:-.026em}.empty p{margin:14px auto 0;max-width:322px;color:rgba(255,255,255,.58);font-size:13.2px;line-height:1.43;font-weight:450}
.mic-zone{position:absolute;z-index:4;left:0;right:0;bottom:92px;text-align:center}.mic-halo{display:inline-grid;place-items:center;width:100px;height:100px;border-radius:50%;background:rgba(173,206,229,.10)}.mic-ring{display:grid;place-items:center;width:84px;height:84px;border-radius:50%;background:rgba(123,166,198,.22);box-shadow:inset 0 0 0 1px rgba(225,238,248,.22)}.mic{width:70px;height:70px;border:.9px solid rgba(255,255,255,.48);border-radius:50%;background:#4682b2;color:#fff;display:grid;place-items:center;box-shadow:0 7px 18px rgba(4,20,32,.11),inset 0 0 0 1px rgba(255,255,255,.08)}.mic.recording{background:#a84848}.mic svg{width:26px;height:26px;opacity:.96}.mic-label{margin-top:6px;font-size:11.2px;line-height:1.2;font-weight:730;color:rgba(255,255,255,.75)}
.sheet{position:absolute;z-index:12;left:0;right:0;bottom:0;height:56px;border-radius:25px 25px 0 0;background:var(--cream);color:var(--sheet-text);box-shadow:0 -5px 18px rgba(0,0,0,.06);transition:height .24s ease,transform .18s ease}.sheet.open{height:min(54dvh,460px)}.sheet.nudge{animation:nudgeSheet .9s ease 2}@keyframes nudgeSheet{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.handle{width:50px;height:4px;margin:9px auto 8px;border-radius:999px;background:#c5cbd1}.sheet-text{padding:0 18px;font-size:11.2px;line-height:1.28;font-weight:720;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:center}.sheet-editor{display:none;height:calc(100% - 34px);padding:0 16px 16px}.sheet.open .sheet-text{display:none}.sheet.open .sheet-editor{display:flex;flex-direction:column;gap:10px}.sheet-editor textarea{flex:1;width:100%;resize:none;border:0;outline:0;border-radius:18px;background:#fff;color:#233a50;padding:16px;font-size:16px;line-height:1.45}.sheet-close{align-self:flex-end;border:0;border-radius:999px;background:#dce4ea;color:#304b63;padding:9px 14px;font-weight:760}
.photo-ui{display:none}.screen.has-photo .empty,.screen.has-photo .mic-zone{display:none}.screen.has-photo .photo-ui{display:block}
.photo-voice{position:absolute;z-index:7;left:0;right:0;bottom:124px;text-align:center;transition:opacity .18s ease,transform .18s ease}.photo-mic-halo{display:inline-grid;place-items:center;width:124px;height:124px;border-radius:50%;background:rgba(117,167,201,.18);box-shadow:0 12px 34px rgba(2,17,28,.18)}.photo-mic-ring{display:grid;place-items:center;width:104px;height:104px;border-radius:50%;background:rgba(95,151,190,.26);box-shadow:inset 0 0 0 1px rgba(239,247,252,.25)}.photo-mic{width:88px;height:88px;border:1.2px solid rgba(255,255,255,.68);border-radius:50%;background:#4384b7;display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,.18),inset 0 0 0 1px rgba(255,255,255,.08)}.photo-mic.recording{background:#a84848}.photo-mic svg{width:35px;height:35px}.photo-voice-title{margin-top:9px;font-size:14px;font-weight:790;text-shadow:0 2px 12px rgba(0,0,0,.28)}.photo-voice-sub{margin:3px auto 0;max-width:290px;font-size:11.5px;line-height:1.3;font-weight:620;color:rgba(255,255,255,.78);text-shadow:0 2px 12px rgba(0,0,0,.28)}
.photo-more{position:absolute;z-index:10;right:16px;bottom:66px;width:44px;height:38px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(14,24,32,.34);font-size:19px;letter-spacing:.06em;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}.screen.sheet-open .photo-voice,.screen.sheet-open .photo-more{opacity:0;pointer-events:none;transform:translateY(12px)}
.modal{position:fixed;z-index:30;inset:0;display:none;align-items:flex-end;background:rgba(5,12,18,.34);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}.modal.open{display:flex}.card{width:100%;padding:18px 18px calc(18px + env(safe-area-inset-bottom));border-radius:28px 28px 0 0;background:#fbfaf7;color:#19324a}.card h3{margin:0 0 14px;font-size:21px}.field{display:grid;gap:6px;margin:10px 0}.field label{font-size:12px;font-weight:760;color:#627589}.field input,.field textarea{width:100%;border:1px solid #d7dde2;border-radius:14px;background:#fff;padding:12px 13px;color:#19324a}.field textarea{min-height:120px;resize:vertical}.card-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.card-actions button{border:0;border-radius:13px;padding:11px 14px;font-weight:760}.secondary{background:#e8edf1;color:#496075}.primary{background:#173851;color:#fff}.more-list{display:grid;gap:8px}.more-item{width:100%;min-height:50px;border:0;border-radius:15px;background:#eef2f5;color:#263f56;display:flex;align-items:center;justify-content:space-between;padding:0 15px;font-weight:740}.more-item.danger{color:#9d3d3d;background:#f4eceb}.more-close{margin-top:10px;width:100%;min-height:48px;border:0;border-radius:15px;background:#173851;color:#fff;font-weight:760}
.photo-manage-card{padding-bottom:calc(14px + env(safe-area-inset-bottom))}.photo-manage-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.photo-manage-head h3{margin:0}.photo-manage-count{font-size:12px;font-weight:760;color:#6a7c8c}.photo-manage-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-height:52dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:2px}.photo-manage-tile{position:relative;aspect-ratio:1/1;border-radius:13px;overflow:hidden;background:#e9eef1;box-shadow:inset 0 0 0 1px rgba(26,52,73,.08);touch-action:pan-y;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none;transition:transform .16s ease,box-shadow .16s ease,opacity .16s ease}.photo-manage-tile.current{box-shadow:inset 0 0 0 3px #3b8ec5}.photo-manage-tile.drag-source{opacity:.35;transform:scale(.96)}.photo-manage-tile.drag-target{box-shadow:inset 0 0 0 3px #168cf0;transform:scale(.97)}.photo-manage-tile img,.photo-manage-tile video{width:100%;height:100%;object-fit:cover;display:block}.photo-manage-video-badge{position:absolute;left:6px;bottom:6px;z-index:2;min-width:28px;height:23px;padding:0 7px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(7,25,39,.78);color:#fff;font-size:11px;font-weight:800;box-shadow:0 2px 8px rgba(0,0,0,.16)}.photo-manage-delete{position:absolute;top:5px;right:5px;width:27px;height:27px;border:0;border-radius:50%;background:rgba(9,31,47,.92);color:#fff;display:grid;place-items:center;font-size:18px;line-height:1;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.18);z-index:2}.photo-manage-add{border:2px dashed #9dc5df;background:#f6fafc;color:#347eaa;display:grid;place-items:center;font-size:34px;font-weight:300}.photo-manage-add span{display:block;margin-top:-2px}.photo-manage-empty{grid-column:1/-1;padding:28px 14px;text-align:center;color:#687b8b;font-size:14px}.photo-drag-ghost{position:fixed;z-index:80;pointer-events:none;border-radius:13px;overflow:hidden;box-shadow:0 14px 34px rgba(0,0,0,.28);transform:scale(1.04);opacity:.95}.photo-drag-ghost .photo-manage-delete{display:none}
.notice{position:fixed;z-index:40;left:50%;bottom:74px;transform:translateX(-50%) translateY(18px);opacity:0;pointer-events:none;max-width:calc(100vw - 36px);padding:10px 14px;border-radius:999px;background:rgba(16,28,39,.90);color:#fff;font-size:12px;font-weight:700;transition:.2s ease;white-space:nowrap}.notice.show{opacity:1;transform:translateX(-50%) translateY(0)}.file-input{display:none}
@media(max-height:760px){.top{top:max(18px,env(safe-area-inset-top));left:17px;right:17px}.brand{font-size:9.8px}.title{margin-top:8px;font-size:17.8px;max-width:252px}.screen.has-photo .title{font-size:18px}.date{margin-top:11px;min-height:33px;padding:0 9px;gap:6px;font-size:12.1px}.date svg{width:14px;height:14px}.photo-button{min-height:37px;padding:0 11px;font-size:13px}.empty{top:34.5%;transform:translateY(-4%);left:22px;right:22px}.plus{width:68px;height:68px;margin-bottom:15px;font-size:34px}.empty h2{max-width:296px;font-size:19px}.empty p{margin-top:11px;max-width:296px;font-size:12.4px}.mic-zone{bottom:72px}.mic-halo{width:88px;height:88px}.mic-ring{width:74px;height:74px}.mic{width:62px;height:62px}.mic svg{width:24px;height:24px}.mic-label{font-size:10.7px}.sheet{height:50px;border-radius:23px 23px 0 0}.handle{width:46px;margin:7px auto 6px}.sheet-text{font-size:10.7px}.photo-voice{bottom:105px}.photo-mic-halo{width:108px;height:108px}.photo-mic-ring{width:91px;height:91px}.photo-mic{width:77px;height:77px}.photo-mic svg{width:31px;height:31px}.photo-more{bottom:58px;height:36px}}
@media(min-width:700px){body{background:#082238}.screen{max-width:520px;margin:0 auto;box-shadow:0 0 70px rgba(0,0,0,.25)}.modal .card{max-width:520px;margin:0 auto}}
</style>
</head>
<body>
<main id="screen" class="screen" data-revision="${STORYLAB_CLEAN_PAGE_REVISION}">
  <img id="bgPhoto" class="bg-photo" alt="Foto bij deze herinnering" /><video id="bgVideo" class="bg-video" muted playsinline preload="metadata" aria-label="Video bij deze herinnering"></video>
  <div class="shade"></div>
  <input id="photoInput" class="file-input" type="file" accept="image/*,video/*,.heic,.heif,.mov,.mp4,.m4v" multiple />
  <header class="top">
    <div>
      <p class="brand">TALERA</p>
      <input id="title" class="title" type="text" maxlength="140" autocomplete="off" placeholder="Titel van deze herinnering" aria-label="Titel van deze herinnering" />
      <label class="date" aria-label="Wanneer was dit?">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path></svg>
        <span id="dateText">Wanneer was dit?</span><input id="dateInput" type="date" />
      </label>
    </div>

  </header>

  <section class="empty" aria-label="Foto kiezen">
    <button id="bigPlus" class="plus" type="button" aria-label="Kies een foto of video">+</button>
    <h2>Kies een foto of video die je herinnering oproept</h2>
    <p>Daarna kun je gewoon kijken en je verhaal vertellen.</p>
  </section>

  <section class="mic-zone" aria-label="Vertellen">
    <div class="mic-halo"><div class="mic-ring"><button id="mic" class="mic" type="button" aria-label="Microfoon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"></path></svg></button></div></div>
    <div id="micLabel" class="mic-label">Tik om te vertellen</div>
  </section>

  <section id="sheet" class="sheet" aria-label="Verhaaltekst">
    <div id="sheetHandle" class="handle"></div>
    <div id="sheetPreview" class="sheet-text">Je tekst verschijnt hier · veeg omhoog</div>
    <div class="sheet-editor"><textarea id="storyText" placeholder="Je verhaaltekst..."></textarea><button id="sheetClose" class="sheet-close" type="button">Klaar</button></div>
  </section>

  <section class="photo-ui" aria-label="Vertellen bij foto">
    <div class="photo-voice">
      <div class="photo-mic-halo"><div class="photo-mic-ring"><button id="storyTrigger" class="photo-mic" type="button" aria-label="Begin met vertellen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"></path></svg></button></div></div>
      <div id="photoVoiceTitle" class="photo-voice-title">Tik en vertel</div>
      <div id="photoVoiceSub" class="photo-voice-sub">Kijk naar je foto en vertel wat er gebeurde</div>
    </div>
    <button id="moreBtn" class="photo-more" type="button" aria-label="Meer opties">•••</button>
  </section>
</main>

<div id="editModal" class="modal"><section class="card"><h3>Herinnering bewerken</h3><div class="field"><label>Titel</label><input id="editTitle" maxlength="140" /></div><div class="field"><label>Datum</label><input id="editDate" type="date" /></div><div class="card-actions"><button class="secondary" data-close="editModal">Annuleren</button><button id="saveEdit" class="primary">Opslaan</button></div></section></div>
<div id="noteModal" class="modal"><section class="card"><h3>Opmerking</h3><div class="field"><textarea id="noteText" placeholder="Voeg een opmerking toe..."></textarea></div><div class="card-actions"><button class="secondary" data-close="noteModal">Annuleren</button><button id="saveNote" class="primary">Opslaan</button></div></section></div>
<div id="moreModal" class="modal"><section class="card"><h3>Meer</h3><div class="more-list"><button id="addAnother" class="more-item" type="button"><span>Foto of video toevoegen</span><span>›</span></button><button id="managePhotosBtn" class="more-item" type="button"><span>Foto’s en video’s beheren</span><span>›</span></button><button id="editBtn" class="more-item" type="button"><span>Titel en datum</span><span>›</span></button></div><button class="more-close" data-close="moreModal" type="button">Klaar</button></section></div>
<div id="photoManageModal" class="modal"><section class="card photo-manage-card"><div class="photo-manage-head"><h3>Foto’s en video’s beheren</h3><span id="photoManageCount" class="photo-manage-count"></span></div><div id="photoManageGrid" class="photo-manage-grid"></div><button class="more-close" data-close="photoManageModal" type="button">Klaar</button></section></div>
<div id="notice" class="notice"></div>

<script>
(function(){
  const screen=document.getElementById('screen'),bg=document.getElementById('bgPhoto'),bgVideo=document.getElementById('bgVideo'),photoInput=document.getElementById('photoInput'),title=document.getElementById('title'),dateInput=document.getElementById('dateInput'),dateText=document.getElementById('dateText'),storyText=document.getElementById('storyText'),sheet=document.getElementById('sheet'),sheetPreview=document.getElementById('sheetPreview'),notice=document.getElementById('notice'),photoVoiceTitle=document.getElementById('photoVoiceTitle'),photoVoiceSub=document.getElementById('photoVoiceSub'),baseMicLabel=document.getElementById('micLabel');
  const today=new Date().toISOString().slice(0,10);dateInput.max=today;document.getElementById('editDate').max=today;
  function makeId(){return crypto&&crypto.randomUUID?crypto.randomUUID():('id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2))}
  const clientKey='talera.storylab.clean.client';let clientId=localStorage.getItem(clientKey);if(!clientId){clientId=makeId();localStorage.setItem(clientKey,clientId)}
  let state={title:'',date:'',storyText:'',note:'',photos:[],currentIndex:0,fit:'cover',audioId:''};
  let recorder=null,chunks=[],stream=null,touchX=0,touchY=0,touchBlocked=false,sheetY=0,recognition=null,speechWanted=false,speechBase='',speechFinal='',speechInterim='';
  const localPhotoUrls=new Map(),previewPhotoUrls=new Map(),photoCache=new Map();
  let mediaUploading=0;
  function signalMedia(){try{window.dispatchEvent(new CustomEvent('talera-storylab-mediachange'))}catch(e){}}
  window.__taleraStoryLabMedia={
    getState:()=>state,
    getPreviewUrl:(id)=>previewPhotoUrls.get(id)||'',
    getUrl:(id)=>previewPhotoUrls.get(id)||localPhotoUrls.get(id)||photoCache.get(id)||'',
    ensureUrl:async(id)=>{
      const p=(state.photos||[]).find(photo=>photo.id===id);
      return p?fetchPhotoUrl(p):'';
    },
    isUploading:()=>mediaUploading>0,
    setIndex:(index)=>{
      if(!state.photos||!state.photos.length)return;
      state.currentIndex=((Number(index)||0)%state.photos.length+state.photos.length)%state.photos.length;
      renderPhoto().catch(()=>{});
    }
  };
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition||null;
  const photoManageGrid=document.getElementById('photoManageGrid'),photoManageCount=document.getElementById('photoManageCount');
  let photoDragTimer=0,photoDrag=null,photoDragJustEnded=false;
  function showNotice(t){notice.textContent=t;notice.classList.add('show');setTimeout(()=>notice.classList.remove('show'),2200)}
  function api(path,opts){return fetch(path+(path.indexOf('?')>-1?'&':'?')+'client='+encodeURIComponent(clientId),opts)}
  function formatDate(v){if(!v)return 'Wanneer was dit?';const d=new Date(v+'T12:00:00');return new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long',year:'numeric'}).format(d)}
  function imageMime(file){const t=String(file&&file.type||'').toLowerCase();if(t.startsWith('image/'))return t;const n=String(file&&file.name||'').toLowerCase();if(/\.heic$/.test(n))return 'image/heic';if(/\.heif$/.test(n))return 'image/heif';if(/\.png$/.test(n))return 'image/png';if(/\.webp$/.test(n))return 'image/webp';if(/\.gif$/.test(n))return 'image/gif';if(/\.avif$/.test(n))return 'image/avif';return 'image/jpeg'}
  function videoMime(file){const t=String(file&&file.type||'').toLowerCase();if(t.startsWith('video/'))return t;const n=String(file&&file.name||'').toLowerCase();if(/\.mov$/i.test(n))return 'video/quicktime';if(/\.m4v$/i.test(n))return 'video/x-m4v';return 'video/mp4'}
  function isImageFile(file){const t=String(file&&file.type||'').toLowerCase(),n=String(file&&file.name||'').toLowerCase();return t.startsWith('image/')||/\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(n)}
  function isVideoFile(file){const t=String(file&&file.type||'').toLowerCase(),n=String(file&&file.name||'').toLowerCase();return t.startsWith('video/')||/\.(mov|mp4|m4v|webm)$/i.test(n)}
  function isVideoItem(item){return String(item&&item.type||'').toLowerCase().startsWith('video/')}
  function posterUrl(item){
    if(!item||!item.posterId)return '';
    if(previewPhotoUrls.has(item.posterId))return previewPhotoUrls.get(item.posterId);
    return '/api/storylab-clean/photo?id='+encodeURIComponent(item.posterId)+'&client='+encodeURIComponent(clientId)
  }
  async function makeVideoPoster(file,id){
    if(!file||!id)return null;
    let objectUrl='',timer=0;
    const video=document.createElement('video');
    try{
      objectUrl=URL.createObjectURL(file);
      video.muted=true;video.playsInline=true;video.preload='auto';video.src=objectUrl;
      await new Promise((resolve,reject)=>{
        const done=()=>{clearTimeout(timer);video.removeEventListener('loadeddata',done);video.removeEventListener('error',fail);resolve()};
        const fail=()=>{clearTimeout(timer);video.removeEventListener('loadeddata',done);video.removeEventListener('error',fail);reject(new Error('video poster'))};
        timer=setTimeout(fail,5000);
        video.addEventListener('loadeddata',done,{once:true});
        video.addEventListener('error',fail,{once:true});
        try{video.load()}catch(e){}
      });
      const width=video.videoWidth||0,height=video.videoHeight||0;
      if(!width||!height)return null;
      const maxSide=1280,scale=Math.min(1,maxSide/Math.max(width,height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
      if(!blob)return null;
      const preview=URL.createObjectURL(blob);
      previewPhotoUrls.set(id,preview);signalMedia();
      return {blob:blob,durationSeconds:Number.isFinite(video.duration)?Math.max(0,video.duration):0}
    }catch(e){return null}
    finally{
      clearTimeout(timer);
      try{video.pause();video.removeAttribute('src');video.load()}catch(e){}
      if(objectUrl)try{URL.revokeObjectURL(objectUrl)}catch(e){}
    }
  }
  async function makePreview(blob,id){
    if(!blob||!id||previewPhotoUrls.has(id))return previewPhotoUrls.get(id)||'';
    let bitmap=null,source=null,width=0,height=0;
    try{
      if(window.createImageBitmap){
        bitmap=await createImageBitmap(blob);
        width=bitmap.width;height=bitmap.height;source=bitmap;
      }else{
        const url=URL.createObjectURL(blob),img=new Image();
        await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
        URL.revokeObjectURL(url);
        width=img.naturalWidth||img.width;height=img.naturalHeight||img.height;source=img;
      }
      if(!width||!height)return '';
      const maxSide=1280,scale=Math.min(1,maxSide/Math.max(width,height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
      const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return '';
      ctx.drawImage(source,0,0,canvas.width,canvas.height);
      if(bitmap&&bitmap.close)bitmap.close();
      const out=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
      if(!out)return '';
      const url=URL.createObjectURL(out);
      previewPhotoUrls.set(id,url);signalMedia();return url;
    }catch(e){try{if(bitmap&&bitmap.close)bitmap.close()}catch(_e){}return ''}
  }
  function updateSheetPreview(custom){if(custom){sheetPreview.textContent=custom;return}const text=String(storyText.value||'').trim();sheetPreview.textContent=text?text:'Je tekst verschijnt hier · veeg omhoog'}
  async function saveState(){state.title=title.value.trim();state.date=dateInput.value;state.storyText=storyText.value;await api('/api/storylab-clean/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(state)}).catch(()=>{})}
  function setPhotoSource(url){if(!url)return;try{bgVideo.pause()}catch(e){}bgVideo.removeAttribute('src');screen.classList.remove('has-video');bg.src=url;bg.style.objectFit=state.fit||'cover';screen.classList.add('has-photo')}
  function setVideoSource(url,poster){if(!url)return;bg.removeAttribute('src');screen.classList.add('has-photo','has-video');if(poster)bgVideo.poster=poster;else bgVideo.removeAttribute('poster');if(bgVideo.src!==url)bgVideo.src=url;bgVideo.style.objectFit=state.fit||'cover';bgVideo.muted=true;bgVideo.playsInline=true;const p=bgVideo.play();if(p&&p.catch)p.catch(()=>{})}
  async function fetchPhotoUrl(photo){
    if(!photo)return '';
    if(!isVideoItem(photo)&&previewPhotoUrls.has(photo.id))return previewPhotoUrls.get(photo.id);
    if(localPhotoUrls.has(photo.id))return localPhotoUrls.get(photo.id);
    if(photoCache.has(photo.id))return photoCache.get(photo.id);
    const kind=isVideoItem(photo)?'video':'photo';
    if(isVideoItem(photo)){
      const url='/api/storylab-clean/video?id='+encodeURIComponent(photo.id)+'&client='+encodeURIComponent(clientId);
      photoCache.set(photo.id,url);return url
    }
    const r=await api('/api/storylab-clean/'+kind+'?id='+encodeURIComponent(photo.id));if(!r.ok)throw new Error('load '+r.status);
    const blob=await r.blob(),url=URL.createObjectURL(blob);photoCache.set(photo.id,url);
    makePreview(blob,photo.id).catch(()=>{});
    return url
  }
  function prefetchIndex(index){if(!state.photos.length)return;const i=(index+state.photos.length)%state.photos.length,photo=state.photos[i];if(!photo||isVideoItem(photo)||localPhotoUrls.has(photo.id)||photoCache.has(photo.id))return;fetchPhotoUrl(photo).catch(()=>{})}
  async function renderPhoto(){if(!state.photos||!state.photos.length){screen.classList.remove('has-photo','has-video');bg.removeAttribute('src');try{bgVideo.pause();bgVideo.removeAttribute('src')}catch(e){}setIdleVoiceCopy();return}if(state.currentIndex<0)state.currentIndex=0;if(state.currentIndex>=state.photos.length)state.currentIndex=state.photos.length-1;const photo=state.photos[state.currentIndex];try{const cached=(!isVideoItem(photo)&&previewPhotoUrls.get(photo.id))||localPhotoUrls.get(photo.id)||photoCache.get(photo.id);const src=cached||await fetchPhotoUrl(photo);if(isVideoItem(photo))setVideoSource(src,posterUrl(photo));else setPhotoSource(src);prefetchIndex(state.currentIndex-1);prefetchIndex(state.currentIndex+1)}catch(e){showNotice(isVideoItem(photo)?'Video kon niet worden geladen':'Foto kon niet worden geladen')}setIdleVoiceCopy()}
  async function loadState(){try{const r=await api('/api/storylab-clean/state');if(r.ok){const s=await r.json();state=Object.assign(state,s||{})}}catch(e){}title.value=state.title||'';dateInput.value=state.date||'';dateText.textContent=formatDate(state.date);storyText.value=state.storyText||'';updateSheetPreview();await renderPhoto()}
  async function addFiles(files){
    const room=Math.max(0,12-(state.photos||[]).length),list=Array.from(files||[]).filter(f=>isImageFile(f)||isVideoFile(f)).slice(0,room);
    if(!list.length){showNotice(room?'Geen bruikbare foto of video geselecteerd':'Maximaal 12 media-items');return}
    const startIndex=state.photos.length,pending=[];
    for(const f of list){
      const id=makeId(),url=URL.createObjectURL(f),video=isVideoFile(f),type=video?videoMime(f):imageMime(f),posterId=video?makeId():'';
      localPhotoUrls.set(id,url);
      state.photos.push({id:id,name:f.name||(video?'video':'foto'),type:type,posterId:posterId,createdAt:Date.now()});
      pending.push({id:id,file:f,type:type,url:url,video:video,posterId:posterId,posterBlob:null,durationSeconds:0});
    }
    state.currentIndex=startIndex;
    mediaUploading++;
    renderPhoto();
    const previewWork=Promise.allSettled(pending.map(async item=>{
      if(!item.video)return makePreview(item.file,item.id);
      const posterResult=await makeVideoPoster(item.file,item.posterId);
      const blob=posterResult&&posterResult.blob||null;
      item.posterBlob=blob;
      item.durationSeconds=posterResult&&Number(posterResult.durationSeconds)||0;
      const media=(state.photos||[]).find(p=>p.id===item.id);
      if(media&&item.durationSeconds)media.durationSeconds=item.durationSeconds;
      if(!blob){
        if(media)media.posterId='';
        return null
      }
      try{
        const r=await api('/api/storylab-clean/photo?id='+encodeURIComponent(item.posterId),{method:'PUT',headers:{'content-type':'image/jpeg','x-file-name':encodeURIComponent((item.file.name||'video')+'-poster.jpg')},body:blob});
        if(!r.ok)throw new Error('poster upload '+r.status);
      }catch(e){
        const media=(state.photos||[]).find(p=>p.id===item.id);if(media)media.posterId='';
      }
      signalMedia();return blob
    }));
    let failed=0;
    const uploadWork=Promise.all(pending.map(async item=>{
      try{
        const kind=item.video?'video':'photo';const r=await api('/api/storylab-clean/'+kind+'?id='+encodeURIComponent(item.id),{method:'PUT',headers:{'content-type':item.type,'x-file-name':encodeURIComponent(item.file.name||(item.video?'video':'foto'))},body:item.file});
        if(!r.ok)throw new Error('upload '+r.status);
        if(item.video){
          const remote='/api/storylab-clean/video?id='+encodeURIComponent(item.id)+'&client='+encodeURIComponent(clientId);
          photoCache.set(item.id,remote);
          try{URL.revokeObjectURL(item.url)}catch(e){}
        }else{
          photoCache.set(item.id,item.url);
        }
        localPhotoUrls.delete(item.id);
      }catch(e){
        failed++;
        const idx=state.photos.findIndex(p=>p.id===item.id);
        if(idx>-1)state.photos.splice(idx,1);
        const u=localPhotoUrls.get(item.id);
        if(u)URL.revokeObjectURL(u);
        localPhotoUrls.delete(item.id);
        const preview=previewPhotoUrls.get(item.id);if(preview){URL.revokeObjectURL(preview);previewPhotoUrls.delete(item.id)}
        signalMedia();
      }
    }));
    await previewWork;
    signalMedia();
    renderPhoto();
    await uploadWork;
    if(state.currentIndex>=state.photos.length)state.currentIndex=Math.max(0,state.photos.length-1);
    await saveState();
    mediaUploading=Math.max(0,mediaUploading-1);
    signalMedia();
    renderPhoto();
    if(failed)showNotice(failed===list.length?'Upload niet gelukt · probeer opnieuw':'Niet alle media konden worden bewaard');
  }
  async function removePhotoById(id){
    const idx=state.photos.findIndex(p=>p.id===id);if(idx<0)return;
    const p=state.photos[idx];
    await api('/api/storylab-clean/'+(isVideoItem(p)?'video':'photo')+'?id='+encodeURIComponent(p.id),{method:'DELETE'}).catch(()=>{});
    if(isVideoItem(p)&&p.posterId)await api('/api/storylab-clean/photo?id='+encodeURIComponent(p.posterId),{method:'DELETE'}).catch(()=>{});
    const local=localPhotoUrls.get(p.id),preview=previewPhotoUrls.get(p.id),cached=photoCache.get(p.id);
    if(local)URL.revokeObjectURL(local);if(preview&&preview!==local)URL.revokeObjectURL(preview);if(cached&&cached!==local&&cached!==preview)URL.revokeObjectURL(cached);
    localPhotoUrls.delete(p.id);previewPhotoUrls.delete(p.id);photoCache.delete(p.id);
    if(p.posterId){const posterPreview=previewPhotoUrls.get(p.posterId);if(posterPreview)try{URL.revokeObjectURL(posterPreview)}catch(e){}previewPhotoUrls.delete(p.posterId)}
    state.photos.splice(idx,1);
    if(!state.photos.length)state.currentIndex=0;
    else if(idx<state.currentIndex)state.currentIndex=Math.max(0,state.currentIndex-1);
    else if(state.currentIndex>=state.photos.length)state.currentIndex=state.photos.length-1;
    await saveState();signalMedia();await renderPhoto();renderPhotoManager();
  }
  async function removeCurrent(){if(!state.photos.length)return;await removePhotoById(state.photos[state.currentIndex].id);closeModal('moreModal')}
  function clearPhotoDragTarget(){
    photoManageGrid.querySelectorAll('.drag-target').forEach(el=>el.classList.remove('drag-target'));
  }
  function cancelPhotoDragPending(){
    clearTimeout(photoDragTimer);photoDragTimer=0;
  }
  function startPhotoDrag(tile,id,x,y,touchId){
    cancelPhotoDragPending();
    const rect=tile.getBoundingClientRect(),ghost=tile.cloneNode(true);
    ghost.classList.remove('current','drag-source','drag-target');
    ghost.classList.add('photo-drag-ghost');
    ghost.style.width=rect.width+'px';ghost.style.height=rect.height+'px';
    ghost.style.left=(x-rect.width/2)+'px';ghost.style.top=(y-rect.height/2)+'px';
    document.body.appendChild(ghost);
    tile.classList.add('drag-source');
    photoDrag={id,touchId,tile,ghost,targetId:id,width:rect.width,height:rect.height,lastX:x,lastY:y};
    if(navigator.vibrate){try{navigator.vibrate(18)}catch(e){}}
  }
  function updatePhotoDrag(x,y){
    if(!photoDrag)return;
    photoDrag.lastX=x;photoDrag.lastY=y;
    photoDrag.ghost.style.left=(x-photoDrag.width/2)+'px';
    photoDrag.ghost.style.top=(y-photoDrag.height/2)+'px';
    clearPhotoDragTarget();
    const hit=document.elementFromPoint(x,y);
    const target=hit&&hit.closest?hit.closest('.photo-manage-tile[data-photo-id]'):null;
    if(target&&target.dataset.photoId!==photoDrag.id){
      photoDrag.targetId=target.dataset.photoId;target.classList.add('drag-target');
    }else if(target){
      photoDrag.targetId=photoDrag.id;
    }
    const gridRect=photoManageGrid.getBoundingClientRect();
    if(y<gridRect.top+48)photoManageGrid.scrollTop-=12;
    else if(y>gridRect.bottom-48)photoManageGrid.scrollTop+=12;
  }
  async function finishPhotoDrag(){
    cancelPhotoDragPending();
    if(!photoDrag)return;
    const drag=photoDrag;photoDrag=null;photoDragJustEnded=true;
    clearPhotoDragTarget();drag.tile.classList.remove('drag-source');drag.ghost.remove();
    const from=state.photos.findIndex(p=>p.id===drag.id),to=state.photos.findIndex(p=>p.id===drag.targetId);
    if(from>-1&&to>-1&&from!==to){
      const activeId=state.photos[state.currentIndex]&&state.photos[state.currentIndex].id;
      const moved=state.photos.splice(from,1)[0];
      state.photos.splice(to,0,moved);
      if(activeId)state.currentIndex=Math.max(0,state.photos.findIndex(p=>p.id===activeId));
      await saveState();signalMedia();
    }
    renderPhotoManager();
    setTimeout(()=>{photoDragJustEnded=false},100);
  }
  function formatDuration(seconds){
    const total=Math.max(0,Math.round(Number(seconds)||0));
    const mins=Math.floor(total/60),secs=total%60;
    return mins+':'+String(secs).padStart(2,'0')
  }
  async function ensureVideoDuration(item,badge){
    if(!item||!isVideoItem(item))return;
    if(Number(item.durationSeconds)>0){if(badge)badge.textContent='▶ '+formatDuration(item.durationSeconds);return}
    let video=null;
    try{
      const src=localPhotoUrls.get(item.id)||photoCache.get(item.id)||await fetchPhotoUrl(item);
      if(!src)return;
      video=document.createElement('video');video.preload='metadata';video.muted=true;video.playsInline=true;video.src=src;
      const duration=await new Promise((resolve,reject)=>{
        const done=()=>{const d=Number(video.duration)||0;cleanup();d>0?resolve(d):reject(new Error('duration'))};
        const fail=()=>{cleanup();reject(new Error('duration'))};
        const cleanup=()=>{clearTimeout(timer);video.removeEventListener('loadedmetadata',done);video.removeEventListener('error',fail)};
        const timer=setTimeout(fail,5000);
        video.addEventListener('loadedmetadata',done,{once:true});
        video.addEventListener('error',fail,{once:true});
        try{video.load()}catch(e){}
      });
      item.durationSeconds=duration;
      if(badge)badge.textContent='▶ '+formatDuration(duration);
      saveState().catch(()=>{});
    }catch(e){}
    finally{if(video){try{video.pause();video.removeAttribute('src');video.load()}catch(e){}}}
  }
  async function renderPhotoManager(){
    if(!photoManageGrid)return;
    const photoCount=(state.photos||[]).length;photoManageCount.textContent=photoCount+(photoCount===1?' item':' items');
    photoManageGrid.innerHTML='';
    const add=document.createElement('button');add.type='button';add.className='photo-manage-tile photo-manage-add';add.innerHTML='<span>+</span>';add.setAttribute('aria-label','Foto of video toevoegen');add.onclick=()=>{closeModal('photoManageModal');photoInput.click()};photoManageGrid.appendChild(add);
    if(!state.photos||!state.photos.length){const empty=document.createElement('div');empty.className='photo-manage-empty';empty.textContent='Nog geen foto’s of video’s toegevoegd';photoManageGrid.appendChild(empty);return}
    for(let i=0;i<state.photos.length;i++){
      const p=state.photos[i],tile=document.createElement('div');tile.className='photo-manage-tile'+(i===state.currentIndex?' current':'');tile.dataset.photoId=p.id;
      const media=document.createElement('img');media.alt='';if(isVideoItem(p)){const badge=document.createElement('span');badge.className='photo-manage-video-badge';badge.textContent=Number(p.durationSeconds)>0?('▶ '+formatDuration(p.durationSeconds)):'▶';tile.appendChild(badge);ensureVideoDuration(p,badge)}tile.appendChild(media);
      const del=document.createElement('button');del.type='button';del.className='photo-manage-delete';del.textContent='×';del.setAttribute('aria-label',isVideoItem(p)?'Video verwijderen':'Foto verwijderen');del.onclick=e=>{e.stopPropagation();removePhotoById(p.id)};tile.appendChild(del);
      tile.onclick=()=>{if(photoDragJustEnded)return;state.currentIndex=i;renderPhoto();saveState();signalMedia()};
      let touchStartX=0,touchStartY=0,touchId=null;
      tile.addEventListener('touchstart',e=>{
        if(e.touches.length!==1||e.target&&e.target.closest&&e.target.closest('.photo-manage-delete'))return;
        const t=e.touches[0];touchStartX=t.clientX;touchStartY=t.clientY;touchId=t.identifier;
        cancelPhotoDragPending();
        photoDragTimer=setTimeout(()=>startPhotoDrag(tile,p.id,touchStartX,touchStartY,touchId),300);
      },{passive:true});
      tile.addEventListener('touchmove',e=>{
        const t=Array.from(e.touches||[]).find(x=>x.identifier===touchId)||e.touches[0];
        if(!t)return;
        if(photoDrag&&photoDrag.touchId===touchId){
          if(e.cancelable)e.preventDefault();
          e.stopPropagation();
          updatePhotoDrag(t.clientX,t.clientY);
          return;
        }
        if(photoDragTimer&&Math.hypot(t.clientX-touchStartX,t.clientY-touchStartY)>9)cancelPhotoDragPending();
      },{passive:false});
      tile.addEventListener('touchend',e=>{
        cancelPhotoDragPending();
        if(photoDrag&&photoDrag.touchId===touchId){
          if(e.cancelable)e.preventDefault();
          e.stopPropagation();
          finishPhotoDrag();
        }
        touchId=null;
      },{passive:false});
      tile.addEventListener('touchcancel',()=>{cancelPhotoDragPending();if(photoDrag&&photoDrag.touchId===touchId)finishPhotoDrag();touchId=null},{passive:true});
      tile.addEventListener('pointerdown',e=>{
        if(e.pointerType!=='mouse'||e.target&&e.target.closest&&e.target.closest('.photo-manage-delete'))return;
        cancelPhotoDragPending();
        const sx=e.clientX,sy=e.clientY;
        photoDragTimer=setTimeout(()=>startPhotoDrag(tile,p.id,sx,sy,'mouse'),240);
      });
      tile.addEventListener('pointermove',e=>{
        if(e.pointerType!=='mouse')return;
        if(photoDrag&&photoDrag.touchId==='mouse'){updatePhotoDrag(e.clientX,e.clientY);if(e.cancelable)e.preventDefault()}
      },{passive:false});
      tile.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'){cancelPhotoDragPending();if(photoDrag&&photoDrag.touchId==='mouse')finishPhotoDrag()}});
      photoManageGrid.appendChild(tile);
      try{media.src=isVideoItem(p)?(posterUrl(p)||localPhotoUrls.get(p.id)||photoCache.get(p.id)||await fetchPhotoUrl(p)):((previewPhotoUrls.get(p.id))||localPhotoUrls.get(p.id)||photoCache.get(p.id)||await fetchPhotoUrl(p))}catch(e){}
    }
  }
  function setIdleVoiceCopy(){if(!screen.classList.contains('has-photo')){baseMicLabel.textContent='Tik om te vertellen';return}if(state.audioId||String(storyText.value||'').trim()){photoVoiceTitle.textContent='Vertel verder';photoVoiceSub.textContent='Of veeg de witte balk omhoog voor je tekst'}else{photoVoiceTitle.textContent='Tik en vertel';photoVoiceSub.textContent=state.photos.length>1?'Swipe door je foto’s en video’s en vertel wat je ziet':(isVideoItem(state.photos[state.currentIndex])?'Kijk naar je video en vertel wat er gebeurde':'Kijk naar je foto en vertel wat er gebeurde')}}
  function openSheet(){sheet.classList.add('open');screen.classList.add('sheet-open');storyText.focus()}
  function closeSheet(){sheet.classList.remove('open');screen.classList.remove('sheet-open');updateSheetPreview()}
  function nudgeSheet(message){updateSheetPreview(message);sheet.classList.remove('nudge');void sheet.offsetWidth;sheet.classList.add('nudge');setTimeout(()=>sheet.classList.remove('nudge'),1900)}
  function currentSpeechText(){const pieces=[];if(speechBase.trim())pieces.push(speechBase.trim());if(speechFinal.trim())pieces.push(speechFinal.trim());if(speechInterim.trim())pieces.push(speechInterim.trim());return pieces.join(' ').replace(/\s+/g,' ').trim()}
  function launchRecognition(){if(!SpeechRecognition||!speechWanted)return;try{recognition=new SpeechRecognition();recognition.lang='nl-NL';recognition.continuous=true;recognition.interimResults=true;recognition.onresult=function(e){let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=(e.results[i][0]&&e.results[i][0].transcript)||'';if(e.results[i].isFinal)speechFinal+=(t+' ');else interim+=t}speechInterim=interim;storyText.value=currentSpeechText();updateSheetPreview()};recognition.onerror=function(){};recognition.onend=function(){if(speechWanted)setTimeout(launchRecognition,160)};recognition.start()}catch(e){}}
  function beginSpeechCapture(){speechBase=String(storyText.value||'').trim();speechFinal='';speechInterim='';speechWanted=true;launchRecognition()}
  function stopSpeechCapture(){speechWanted=false;if(recognition){try{recognition.stop()}catch(e){}recognition=null}speechInterim='';storyText.value=currentSpeechText();updateSheetPreview()}
  async function startStopRecording(btn){if(recorder&&recorder.state==='recording'){recorder.stop();btn.classList.remove('recording');document.getElementById('mic').classList.remove('recording');photoVoiceTitle.textContent='Even afronden…';photoVoiceSub.textContent='';baseMicLabel.textContent='Even afronden…';stopSpeechCapture();return}if(!navigator.mediaDevices||!window.MediaRecorder){showNotice('Opname wordt hier niet ondersteund');return}try{stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=async()=>{const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'}),id=makeId();await new Promise(r=>setTimeout(r,180));try{const r=await api('/api/storylab-clean/audio?id='+encodeURIComponent(id),{method:'PUT',headers:{'content-type':blob.type||'audio/webm'},body:blob});if(r.ok){state.audioId=id;state.storyText=storyText.value;await saveState();if(screen.classList.contains('has-photo')){photoVoiceTitle.textContent='Klaar';photoVoiceSub.textContent='Veeg de witte balk omhoog om je tekst te bekijken';nudgeSheet(String(storyText.value||'').trim()?'Je tekst staat klaar · veeg omhoog':'Opname bewaard · veeg omhoog voor je tekst')}else{baseMicLabel.textContent='Klaar · veeg de witte balk omhoog';nudgeSheet(String(storyText.value||'').trim()?'Je tekst staat klaar · veeg omhoog':'Opname bewaard · veeg omhoog')}}else{showNotice('Opname kon niet worden bewaard');setIdleVoiceCopy()}}catch(e){showNotice('Opname kon niet worden bewaard');setIdleVoiceCopy()}if(stream)stream.getTracks().forEach(t=>t.stop())};recorder.start();beginSpeechCapture();btn.classList.add('recording');if(btn.id!=='mic')document.getElementById('mic').classList.add('recording');if(screen.classList.contains('has-photo')){photoVoiceTitle.textContent='Je vertelt nu';photoVoiceSub.textContent='Tik om te stoppen'}else baseMicLabel.textContent='Je vertelt nu · tik om te stoppen'}catch(e){showNotice('Microfoon niet beschikbaar')}}
  document.getElementById('bigPlus').onclick=()=>photoInput.click();document.getElementById('addAnother').onclick=()=>{closeModal('moreModal');photoInput.click()};photoInput.onchange=async()=>{const chosen=Array.from(photoInput.files||[]);photoInput.value='';await addFiles(chosen)};
  title.addEventListener('change',saveState);title.addEventListener('blur',saveState);dateInput.addEventListener('change',async()=>{if(dateInput.value>today)dateInput.value=today;dateText.textContent=formatDate(dateInput.value);await saveState()});storyText.addEventListener('input',updateSheetPreview);storyText.addEventListener('change',saveState);storyText.addEventListener('blur',saveState);
  document.getElementById('sheetHandle').onclick=openSheet;sheetPreview.onclick=openSheet;document.getElementById('sheetClose').onclick=async()=>{closeSheet();await saveState();setIdleVoiceCopy()};sheet.addEventListener('touchstart',e=>{sheetY=e.changedTouches[0].clientY},{passive:true});sheet.addEventListener('touchend',e=>{const dy=e.changedTouches[0].clientY-sheetY;if(dy<-28)openSheet();else if(dy>28&&sheet.classList.contains('open')){closeSheet();saveState();setIdleVoiceCopy()}},{passive:true});
  document.getElementById('mic').onclick=e=>startStopRecording(e.currentTarget);document.getElementById('storyTrigger').onclick=e=>startStopRecording(e.currentTarget);
  function openModal(id){document.getElementById(id).classList.add('open')}function closeModal(id){document.getElementById(id).classList.remove('open')}
  document.getElementById('moreBtn').onclick=()=>openModal('moreModal');document.getElementById('managePhotosBtn').onclick=()=>{closeModal('moreModal');renderPhotoManager();openModal('photoManageModal')};document.getElementById('editBtn').onclick=()=>{closeModal('moreModal');document.getElementById('editTitle').value=title.value;document.getElementById('editDate').value=dateInput.value;openModal('editModal')};
  document.getElementById('saveEdit').onclick=async()=>{title.value=document.getElementById('editTitle').value;dateInput.value=document.getElementById('editDate').value;if(dateInput.value>today)dateInput.value=today;dateText.textContent=formatDate(dateInput.value);closeModal('editModal');await saveState()};document.getElementById('saveNote').onclick=async()=>{state.note=document.getElementById('noteText').value;closeModal('noteModal');await saveState()};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
  /* Horizontal photo swiping is owned exclusively by the r19 carousel layer. */
  window.addEventListener('pagehide',()=>{speechWanted=false;if(recognition){try{recognition.stop()}catch(e){}}for(const u of localPhotoUrls.values()){try{URL.revokeObjectURL(u)}catch(e){}}for(const u of previewPhotoUrls.values()){try{URL.revokeObjectURL(u)}catch(e){}}for(const u of photoCache.values()){try{URL.revokeObjectURL(u)}catch(e){}}if(stream)stream.getTracks().forEach(t=>t.stop())});loadState();
})();
</script>
</body>
</html>`;