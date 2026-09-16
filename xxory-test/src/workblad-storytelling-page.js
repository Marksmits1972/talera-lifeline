export const WORKBLAD_STORYTELLING_PAGE_REV = 'workblad-storytelling-photo-first-20260916-r1';

export const WORKBLAD_STORYTELLING_PAGE_STYLE = String.raw`
html.talera-storytelling-active,
html.talera-storytelling-active body{
  background:#F7F4EF!important;
}

.work-stage.talera-storytelling-host{
  position:relative!important;
  width:100%!important;
  min-height:100dvh!important;
  height:100dvh!important;
  margin:0!important;
  padding:0!important;
  display:block!important;
  overflow:hidden!important;
  background:#F7F4EF!important;
  color:#0F2747!important;
}

.talera-storytelling-host > .work-top,
.talera-storytelling-host > .work-scroll,
.talera-storytelling-host > .work-actions,
.talera-storytelling-host > .work-universal-nav,
.talera-storytelling-host > .talera-workbar{
  position:fixed!important;
  left:-10000px!important;
  top:0!important;
  width:1px!important;
  height:1px!important;
  min-width:1px!important;
  min-height:1px!important;
  max-width:1px!important;
  max-height:1px!important;
  margin:0!important;
  padding:0!important;
  overflow:hidden!important;
  opacity:.001!important;
  pointer-events:none!important;
}

.talera-storytelling-shell{
  position:absolute;
  inset:0;
  z-index:60;
  display:grid;
  grid-template-rows:auto minmax(0,1fr) auto;
  min-height:0;
  background:#F7F4EF;
  color:#0F2747;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
}

.talera-storytelling-header{
  min-height:54px;
  padding:max(12px,env(safe-area-inset-top)) 17px 9px;
  display:grid;
  grid-template-columns:1fr auto 1fr;
  align-items:end;
  gap:10px;
  background:rgba(247,244,239,.96);
  border-bottom:1px solid rgba(15,39,71,.045);
}
.talera-storytelling-brand{
  justify-self:start;
  font-size:14px;
  font-weight:820;
  letter-spacing:.16em;
}
.talera-storytelling-mode{
  justify-self:center;
  font-size:13px;
  font-weight:720;
  color:rgba(15,39,71,.58);
}
.talera-storytelling-state{
  justify-self:end;
  display:flex;
  align-items:center;
  gap:7px;
  color:rgba(15,39,71,.46);
  font-size:11.5px;
  font-weight:650;
}
.talera-storytelling-state::before{
  content:"";
  width:7px;
  height:7px;
  border-radius:50%;
  background:#E7A98B;
  box-shadow:0 0 0 4px rgba(231,169,139,.12);
}

.talera-storytelling-scroll{
  min-height:0;
  overflow:auto;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior-y:contain;
  padding:0 0 28px;
}

.talera-storytelling-photo-wrap{
  position:relative;
  width:100%;
  background:#DDE6EB;
}
.talera-storytelling-photo{
  position:relative;
  width:100%;
  height:clamp(340px,52dvh,560px);
  min-height:340px;
  overflow:hidden;
  display:grid;
  place-items:center;
  background:
    radial-gradient(circle at 50% 24%,rgba(255,255,255,.72),transparent 48%),
    linear-gradient(150deg,#D9E5EC 0%,#E8E7E2 58%,#EEE9E0 100%);
  touch-action:pan-y;
  user-select:none;
  -webkit-user-select:none;
}
.talera-storytelling-photo.has-photo::before{
  content:"";
  position:absolute;
  inset:-34px;
  background-image:var(--talera-story-photo-bg,none);
  background-position:center;
  background-size:cover;
  filter:blur(24px) saturate(.82);
  opacity:.34;
  transform:scale(1.08);
}
.talera-storytelling-photo.has-photo::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:2;
  pointer-events:none;
  background:linear-gradient(180deg,rgba(7,21,36,.18),transparent 27%,transparent 67%,rgba(7,21,36,.28));
}
.talera-storytelling-photo img{
  position:relative;
  z-index:1;
  width:100%;
  height:100%;
  object-fit:contain;
  object-position:center;
  display:block;
  background:transparent;
  pointer-events:none;
}
.talera-storytelling-empty{
  position:relative;
  z-index:3;
  width:min(78%,360px);
  display:grid;
  place-items:center;
  gap:12px;
  text-align:center;
  color:rgba(15,39,71,.64);
}
.talera-storytelling-empty strong{
  font-size:18px;
  line-height:1.25;
  color:#0F2747;
}
.talera-storytelling-empty span{
  font-size:13px;
  line-height:1.42;
}
.talera-storytelling-add-main{
  width:70px;
  height:70px;
  border:1px solid rgba(255,255,255,.82);
  border-radius:50%;
  display:grid;
  place-items:center;
  background:rgba(255,255,255,.84);
  color:#0F2747;
  box-shadow:0 14px 38px rgba(15,39,71,.12);
  font-size:34px;
  font-weight:300;
  cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}

.talera-storytelling-photo-top{
  position:absolute;
  z-index:8;
  top:12px;
  left:12px;
  right:12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  pointer-events:none;
}
.talera-storytelling-photo-left,
.talera-storytelling-photo-right{
  display:flex;
  align-items:center;
  gap:7px;
}
.talera-storytelling-count,
.talera-storytelling-add-photo,
.talera-storytelling-remove-photo{
  min-height:36px;
  border:1px solid rgba(255,255,255,.48);
  border-radius:999px;
  padding:0 12px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(13,35,58,.40);
  color:white;
  font-size:12px;
  font-weight:760;
  text-shadow:0 1px 5px rgba(0,0,0,.22);
  backdrop-filter:blur(13px);
  -webkit-backdrop-filter:blur(13px);
  box-shadow:0 6px 20px rgba(15,39,71,.10);
  pointer-events:auto;
  cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}
.talera-storytelling-remove-photo{
  width:36px;
  padding:0;
}
.talera-storytelling-remove-photo svg{
  width:17px;
  height:17px;
}
.talera-storytelling-dots{
  position:absolute;
  z-index:8;
  left:50%;
  bottom:18px;
  transform:translateX(-50%);
  max-width:64%;
  display:flex;
  gap:6px;
  align-items:center;
  justify-content:center;
  padding:6px 9px;
  border-radius:999px;
  background:rgba(8,25,42,.20);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
}
.talera-storytelling-dot{
  width:6px;
  height:6px;
  padding:0;
  border:0;
  border-radius:999px;
  background:rgba(255,255,255,.58);
}
.talera-storytelling-dot.active{
  width:20px;
  background:white;
}

.talera-storytelling-mic-row{
  position:relative;
  z-index:10;
  min-height:58px;
  margin-top:-29px;
  display:grid;
  place-items:center;
  pointer-events:none;
}
.talera-storytelling-mic{
  width:70px;
  height:70px;
  display:grid;
  place-items:center;
  border:1px solid rgba(255,255,255,.78);
  border-radius:50%;
  background:#0F2747;
  color:white;
  box-shadow:0 12px 34px rgba(15,39,71,.22),inset 0 1px 0 rgba(255,255,255,.18);
  pointer-events:auto;
  cursor:pointer;
  -webkit-tap-highlight-color:transparent;
}
.talera-storytelling-mic svg{
  width:28px;
  height:28px;
}
.talera-storytelling-mic.recording{
  background:#315F87;
  box-shadow:0 0 0 8px rgba(49,95,135,.10),0 12px 34px rgba(15,39,71,.24);
  animation:taleraStoryMicPulse 1.8s ease-in-out infinite;
}
@keyframes taleraStoryMicPulse{
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.045)}
}
.talera-storytelling-mic-label{
  margin-top:6px;
  text-align:center;
  color:rgba(15,39,71,.58);
  font-size:12.5px;
  font-weight:680;
}

.talera-storytelling-content{
  width:min(100%,700px);
  margin:0 auto;
  padding:8px 18px 10px;
}
.talera-storytelling-story-head{
  margin:12px 0 2px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.talera-storytelling-story-head strong{
  font-size:14px;
  font-weight:800;
}
.talera-storytelling-audio-state{
  min-height:28px;
  padding:0 10px;
  display:flex;
  align-items:center;
  gap:6px;
  border-radius:999px;
  background:rgba(220,234,246,.55);
  color:#315F87;
  font-size:11px;
  font-weight:760;
}
.talera-storytelling-audio-state[hidden]{display:none}
.talera-storytelling-story{
  width:100%;
  min-height:170px;
  max-height:none;
  border:0;
  outline:0;
  resize:none;
  padding:10px 0 12px;
  background:transparent;
  color:#33465C;
  font-size:18px;
  line-height:1.55;
  letter-spacing:-.008em;
  overflow:hidden;
}
.talera-storytelling-story::placeholder{
  color:rgba(62,74,89,.31);
}

.talera-storytelling-meta{
  margin-top:8px;
  padding:14px 0 2px;
  border-top:1px solid rgba(15,39,71,.07);
  display:grid;
  gap:10px;
}
.talera-storytelling-title{
  width:100%;
  min-height:44px;
  border:0;
  outline:0;
  padding:0;
  background:transparent;
  color:#0F2747;
  font-size:21px;
  line-height:1.2;
  font-weight:720;
  letter-spacing:-.018em;
}
.talera-storytelling-title::placeholder{
  color:rgba(15,39,71,.30);
}
.talera-storytelling-date{
  width:max-content;
  max-width:100%;
  min-height:40px;
  padding:0 13px;
  display:flex;
  align-items:center;
  gap:8px;
  border:1px solid rgba(15,39,71,.09);
  border-radius:999px;
  background:rgba(255,255,255,.62);
  color:rgba(15,39,71,.74);
  font-size:13px;
  font-weight:700;
  box-shadow:0 5px 17px rgba(15,39,71,.04);
}
.talera-storytelling-date svg{
  width:17px;
  height:17px;
}
.talera-storytelling-date.missing{
  box-shadow:0 0 0 2px rgba(231,169,139,.44);
}

.talera-storytelling-status{
  min-height:0;
  margin-top:10px;
  padding:0;
  border-radius:15px;
  color:rgba(15,39,71,.68);
  font-size:12px;
  line-height:1.4;
  font-weight:650;
  transition:padding .15s ease,background .15s ease;
}
.talera-storytelling-status.show{
  min-height:40px;
  padding:10px 12px;
  background:rgba(220,234,246,.42);
}
.talera-storytelling-status.bad{
  background:rgba(255,235,231,.88);
  color:#8B3D35;
}

.talera-storytelling-footer{
  position:relative;
  z-index:20;
  background:rgba(247,244,239,.94);
  border-top:1px solid rgba(15,39,71,.055);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
}
.talera-storytelling-finish-wrap{
  padding:10px 14px 8px;
}
.talera-storytelling-finish{
  width:100%;
  min-height:55px;
  border:1px solid rgba(255,255,255,.22);
  border-radius:999px;
  background:#315F87;
  color:white;
  font-size:15px;
  font-weight:790;
  letter-spacing:-.01em;
  box-shadow:0 10px 28px rgba(15,39,71,.18),inset 0 1px 0 rgba(255,255,255,.18);
}
.talera-storytelling-nav{
  min-height:58px;
  padding:2px 18px max(6px,env(safe-area-inset-bottom));
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  align-items:end;
}
.talera-storytelling-nav button{
  min-height:44px;
  border:0;
  background:transparent;
  color:rgba(62,74,89,.55);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:3px;
  font-size:10px;
}
.talera-storytelling-nav button.active{
  color:#0F2747;
  font-weight:750;
}
.talera-storytelling-nav svg{
  width:24px;
  height:24px;
}
.talera-storytelling-home{
  justify-self:center!important;
  width:48px!important;
  height:48px!important;
  min-height:48px!important;
  border-radius:50%!important;
  background:#0F2747!important;
  color:white!important;
  box-shadow:0 9px 23px rgba(15,39,71,.17),inset 0 1px 0 rgba(255,255,255,.16)!important;
}
.talera-storytelling-more-dots{
  font-size:19px;
  letter-spacing:2px;
  line-height:1;
}

html.talera-storytelling-active .work-saving{
  display:none!important;
}

/* Spraak blijft op dezelfde foto: geen ORB, geen schermwissel. */
html.talera-storytelling-active .voice-layer{
  position:fixed!important;
  z-index:220!important;
  inset:auto 10px calc(72px + env(safe-area-inset-bottom)) 10px!important;
  min-height:0!important;
  width:auto!important;
  padding:12px!important;
  display:grid!important;
  grid-template-columns:1fr auto!important;
  grid-template-areas:"status close" "controls controls"!important;
  gap:9px!important;
  background:rgba(247,244,239,.96)!important;
  border:1px solid rgba(15,39,71,.08)!important;
  border-radius:22px!important;
  box-shadow:0 18px 50px rgba(15,39,71,.20)!important;
  backdrop-filter:blur(18px)!important;
  -webkit-backdrop-filter:blur(18px)!important;
  pointer-events:none!important;
}
html.talera-storytelling-active .voice-layer .voice-close{
  grid-area:close!important;
  justify-self:end!important;
  width:36px!important;
  height:36px!important;
  min-height:36px!important;
  display:grid!important;
  place-items:center!important;
  border:0!important;
  border-radius:50%!important;
  background:rgba(220,234,246,.62)!important;
  color:#0F2747!important;
  box-shadow:none!important;
  font-size:21px!important;
  pointer-events:auto!important;
}
html.talera-storytelling-active .voice-layer .voice-center{
  grid-area:status!important;
  min-height:36px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:flex-start!important;
  gap:10px!important;
  flex-direction:row!important;
  pointer-events:none!important;
}
html.talera-storytelling-active .voice-layer .voice-center::before{
  content:"";
  width:34px;
  height:34px;
  flex:0 0 auto;
  border-radius:50%;
  background:#315F87;
  box-shadow:0 0 0 6px rgba(49,95,135,.10);
}
html.talera-storytelling-active .voice-layer .core-wrap{
  display:none!important;
}
html.talera-storytelling-active .voice-layer .voice-status{
  min-height:0!important;
  margin:0!important;
  padding:0!important;
  text-align:left!important;
  color:#0F2747!important;
  font-size:13px!important;
  font-weight:700!important;
  opacity:.74!important;
}
html.talera-storytelling-active .voice-layer .voice-bottom{
  grid-area:controls!important;
  min-height:0!important;
  display:block!important;
  pointer-events:auto!important;
}
html.talera-storytelling-active .voice-layer .voice-bottom > div{
  width:100%!important;
  display:grid!important;
  grid-template-columns:1fr 1fr!important;
  gap:8px!important;
}
html.talera-storytelling-active .voice-layer .pill{
  width:100%!important;
  min-width:0!important;
  min-height:48px!important;
  border:1px solid rgba(15,39,71,.09)!important;
  border-radius:15px!important;
  background:white!important;
  color:#0F2747!important;
  box-shadow:none!important;
  font-size:14px!important;
  font-weight:760!important;
}

.work-stage.voice-open .talera-storytelling-shell{
  opacity:1!important;
  filter:none!important;
  transform:none!important;
  pointer-events:auto!important;
}

@media(max-width:600px){
  .talera-storytelling-header{
    min-height:50px;
    padding-left:15px;
    padding-right:15px;
  }
  .talera-storytelling-photo{
    height:clamp(320px,50dvh,470px);
    min-height:320px;
  }
  .talera-storytelling-content{
    padding-left:16px;
    padding-right:16px;
  }
  .talera-storytelling-story{
    min-height:150px;
    font-size:17px;
  }
}

@media(max-width:600px) and (max-height:740px){
  .talera-storytelling-photo{
    height:300px;
    min-height:300px;
  }
  .talera-storytelling-story{
    min-height:118px;
  }
}
`;

export const WORKBLAD_STORYTELLING_PAGE_SCRIPT = String.raw`<script id="talera-workblad-storytelling-page">
(() => {
  if (window.__taleraStorytellingPage) return;
  const REV = '${WORKBLAD_STORYTELLING_PAGE_REV}';
  const TIMELINE_URL = 'https://talera-timeline-prototype.mark-a39.workers.dev/';
  let activePhotoIndex = 0;
  let mounting = false;
  let lastMediaSignature = '';
  let lastUserStatus = '';
  let lastUserStatusBad = false;

  const micSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a4 4 0 0 0 4-4V7a4 4 0 1 0-8 0v4.5a4 4 0 0 0 4 4Z" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  const calendarSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const homeSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3.5l8.5 7v9a1 1 0 0 1-1 1h-5.2v-6H9.7v6H4.5a1 1 0 0 1-1-1Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const tellSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-7.7L6.5 20v-3.5H5a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  const trashSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9 7V4.5h6V7M7 9.5l.7 10h8.6l.7-10M10 11.5v5M14 11.5v5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function actions() {
    return window.__taleraStorytellingActions || null;
  }

  function snapshot() {
    try {
      const api = actions();
      if (api && typeof api.snapshot === 'function') return api.snapshot();
      const fallback = typeof window.__taleraWorkbladV9Read === 'function' ? window.__taleraWorkbladV9Read() : null;
      return fallback ? { ...fallback, media:[] } : null;
    } catch {
      return null;
    }
  }

  function mediaItems(data) {
    const media = Array.isArray(data?.media) ? data.media : [];
    return media.filter(item => item && item.url);
  }

  function signature(items) {
    return items.map(item => [item.kind || '', item.id || '', item.url || '', item.size || 0].join(':')).join('|');
  }

  function isRecording(data) {
    return data?.view === 'listening' || data?.view === 'mic-initializing' || Boolean(document.getElementById('voiceLayer'));
  }

  function fitTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(150, el.scrollHeight) + 'px';
  }

  function status(message, bad = false) {
    lastUserStatus = String(message || '');
    lastUserStatusBad = Boolean(bad);
    syncStatus();
  }

  function hiddenStatusText() {
    const bridge = document.getElementById('talera-v9-bridge-status');
    if (bridge?.textContent?.trim()) return {text:bridge.textContent.trim(), bad:/mislukt|niet|fout/i.test(bridge.textContent)};
    const stage = document.getElementById('talera-photo-stage');
    if (stage?.textContent?.trim()) return {text:stage.textContent.trim(), bad:false};
    const oldError = document.querySelector('.work-error');
    if (oldError?.textContent?.trim()) return {text:oldError.textContent.trim(), bad:true};
    return null;
  }

  function syncStatus() {
    const node = document.querySelector('.talera-storytelling-status');
    if (!node) return;
    const inherited = hiddenStatusText();
    const text = inherited?.text || lastUserStatus;
    const bad = inherited ? inherited.bad : lastUserStatusBad;
    node.textContent = text || '';
    node.classList.toggle('show', Boolean(text));
    node.classList.toggle('bad', Boolean(text && bad));
  }

  function buildShell(stage, data) {
    const shell = document.createElement('div');
    shell.className = 'talera-storytelling-shell';
    shell.innerHTML =
      '<header class="talera-storytelling-header">' +
        '<span class="talera-storytelling-brand">TALERA</span>' +
        '<span class="talera-storytelling-mode">Vertellen</span>' +
        '<span class="talera-storytelling-state">' + (data?.isEdit ? 'bewerken' : 'concept') + '</span>' +
      '</header>' +
      '<div class="talera-storytelling-scroll">' +
        '<section class="talera-storytelling-photo-wrap">' +
          '<div class="talera-storytelling-photo" id="taleraStoryPhoto" aria-label="Foto bij deze herinnering"></div>' +
          '<div class="talera-storytelling-mic-row">' +
            '<button type="button" class="talera-storytelling-mic" id="taleraStoryMic" aria-label="Vertel iets bij deze herinnering">' + micSvg + '</button>' +
          '</div>' +
          '<div class="talera-storytelling-mic-label" id="taleraStoryMicLabel">Vertel wat je je herinnert</div>' +
        '</section>' +
        '<section class="talera-storytelling-content">' +
          '<div class="talera-storytelling-story-head"><strong>Jouw verhaal</strong><span class="talera-storytelling-audio-state" id="taleraStoryAudioState" hidden>● opname toegevoegd</span></div>' +
          '<textarea class="talera-storytelling-story" id="taleraStoryText" maxlength="20000" placeholder="Vertel of schrijf wat je wilt onthouden…"></textarea>' +
          '<div class="talera-storytelling-meta" id="taleraStoryMeta">' +
            '<input class="talera-storytelling-title" id="taleraStoryTitle" maxlength="140" placeholder="Geef deze herinnering een titel">' +
            '<button type="button" class="talera-storytelling-date" id="taleraStoryDate">' + calendarSvg + '<span>Wanneer was dit?</span></button>' +
          '</div>' +
          '<div class="talera-storytelling-status" aria-live="polite"></div>' +
        '</section>' +
      '</div>' +
      '<footer class="talera-storytelling-footer">' +
        '<div class="talera-storytelling-finish-wrap"><button type="button" class="talera-storytelling-finish" id="taleraStoryFinish">' + (data?.isEdit ? 'Terug naar presentatie' : 'Koppel aan mijn tijdlijn') + '</button></div>' +
        '<nav class="talera-storytelling-nav" aria-label="TALERA navigatie">' +
          '<button type="button" class="active" aria-current="page">' + tellSvg + '<span>Vertellen</span></button>' +
          '<button type="button" class="talera-storytelling-home" id="taleraStoryHome" aria-label="Home">' + homeSvg + '</button>' +
          '<button type="button" id="taleraStoryMore"><span class="talera-storytelling-more-dots">•••</span><span>Meer</span></button>' +
        '</nav>' +
      '</footer>';

    stage.appendChild(shell);
    document.documentElement.classList.add('talera-storytelling-active');
    wireShell(shell);
    syncFromEngine(true);
  }

  function wireShell(shell) {
    const title = shell.querySelector('#taleraStoryTitle');
    const story = shell.querySelector('#taleraStoryText');
    const date = shell.querySelector('#taleraStoryDate');
    const mic = shell.querySelector('#taleraStoryMic');
    const finish = shell.querySelector('#taleraStoryFinish');
    const home = shell.querySelector('#taleraStoryHome');
    const more = shell.querySelector('#taleraStoryMore');

    title.addEventListener('input', () => {
      actions()?.setTitle?.(title.value);
      title.classList.remove('missing');
    });

    story.addEventListener('input', () => {
      actions()?.setText?.(story.value);
      fitTextarea(story);
    });

    date.addEventListener('click', event => {
      event.preventDefault();
      actions()?.openDate?.();
    });

    mic.addEventListener('click', event => {
      event.preventDefault();
      actions()?.startVoice?.();
    });

    finish.addEventListener('click', event => {
      event.preventDefault();
      const data = snapshot();
      const titleValue = String(data?.title || '').trim();
      const dateValue = String(data?.eventTime || '').trim();
      if (!titleValue || !dateValue) {
        status(!titleValue && !dateValue ? 'Voeg nog een titel en een datum toe voordat je koppelt.' : (!titleValue ? 'Geef deze herinnering nog een titel.' : 'Kies nog wanneer deze herinnering speelde.'), true);
        if (!titleValue) title.focus();
        else date.classList.add('missing');
        shell.querySelector('#taleraStoryMeta')?.scrollIntoView({behavior:'smooth', block:'center'});
        return;
      }
      status(data?.isEdit ? 'Wijzigingen worden veilig opgeslagen…' : 'Je herinnering wordt veilig gekoppeld…');
      actions()?.finish?.();
    });

    home.addEventListener('click', () => {
      try {
        const ref = String(document.referrer || '');
        if (ref.indexOf(TIMELINE_URL) === 0 && history.length > 1) {
          history.back();
          return;
        }
      } catch {}
      location.href = TIMELINE_URL;
    });

    more.addEventListener('click', () => {
      status('Meer opties komen in een volgende stap. Je herinnering blijft gewoon bewaard.');
    });
  }

  function renderPhoto(data) {
    const photo = document.getElementById('taleraStoryPhoto');
    if (!photo) return;
    const items = mediaItems(data);
    const sig = signature(items);
    if (sig !== lastMediaSignature) {
      lastMediaSignature = sig;
      activePhotoIndex = Math.max(0, Math.min(activePhotoIndex, Math.max(0, items.length - 1)));
    }
    photo.replaceChildren();
    photo.classList.toggle('has-photo', items.length > 0);

    if (!items.length) {
      photo.style.removeProperty('--talera-story-photo-bg');
      const empty = document.createElement('div');
      empty.className = 'talera-storytelling-empty';
      empty.innerHTML = '<button type="button" class="talera-storytelling-add-main" aria-label="Foto toevoegen">+</button><strong>Voeg een foto toe die je helpt herinneren</strong><span>Je kunt ook zonder foto beginnen en later foto’s toevoegen.</span>';
      photo.appendChild(empty);
      empty.querySelector('button').addEventListener('click', event => {
        event.preventDefault();
        actions()?.pickPhotos?.();
      });
      return;
    }

    const item = items[activePhotoIndex];
    const img = document.createElement('img');
    img.alt = 'Foto ' + (activePhotoIndex + 1) + ' bij deze herinnering';
    img.src = item.url;
    photo.appendChild(img);
    photo.style.setProperty('--talera-story-photo-bg', 'url("' + String(item.url).replace(/"/g,'%22') + '")');

    const top = document.createElement('div');
    top.className = 'talera-storytelling-photo-top';
    top.innerHTML =
      '<div class="talera-storytelling-photo-left">' +
        '<span class="talera-storytelling-count">' + (activePhotoIndex + 1) + ' / ' + items.length + '</span>' +
        '<button type="button" class="talera-storytelling-remove-photo" aria-label="Verwijder deze foto">' + trashSvg + '</button>' +
      '</div>' +
      '<div class="talera-storytelling-photo-right"><button type="button" class="talera-storytelling-add-photo">+ foto</button></div>';
    photo.appendChild(top);
    top.querySelector('.talera-storytelling-add-photo').addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      actions()?.pickPhotos?.();
    });
    top.querySelector('.talera-storytelling-remove-photo').addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const index = activePhotoIndex;
      status('Foto wordt uit deze herinnering verwijderd…');
      try {
        await actions()?.removePhoto?.(index);
        activePhotoIndex = Math.max(0, Math.min(index, items.length - 2));
        status('Foto verwijderd.');
      } catch (error) {
        status('Deze foto kon nog niet worden verwijderd: ' + String(error?.message || error), true);
      }
    });

    if (items.length > 1) {
      const dots = document.createElement('div');
      dots.className = 'talera-storytelling-dots';
      items.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'talera-storytelling-dot' + (index === activePhotoIndex ? ' active' : '');
        dot.setAttribute('aria-label','Toon foto ' + (index + 1));
        dot.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          activePhotoIndex = index;
          renderPhoto(snapshot());
        });
        dots.appendChild(dot);
      });
      photo.appendChild(dots);
      wireSwipe(photo, items.length);
    }
  }

  function wireSwipe(photo, count) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;

    photo.addEventListener('pointerdown', event => {
      if (event.target.closest('button')) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      dragging = false;
      try { photo.setPointerCapture(pointerId); } catch {}
    });

    photo.addEventListener('pointermove', event => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.08) dragging = true;
      if (dragging) event.preventDefault();
    });

    photo.addEventListener('pointerup', event => {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const didDrag = dragging;
      pointerId = null;
      dragging = false;
      try { photo.releasePointerCapture(event.pointerId); } catch {}
      if (!didDrag || Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy) * 1.06) return;
      const next = dx < 0 ? Math.min(activePhotoIndex + 1, count - 1) : Math.max(activePhotoIndex - 1, 0);
      if (next !== activePhotoIndex) {
        activePhotoIndex = next;
        renderPhoto(snapshot());
      }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    photo.addEventListener('touchstart', event => {
      if (event.target.closest('button') || !event.touches?.length) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, {passive:true});
    photo.addEventListener('touchend', event => {
      if (!event.changedTouches?.length) return;
      const dx = event.changedTouches[0].clientX - touchStartX;
      const dy = event.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.08) return;
      const next = dx < 0 ? Math.min(activePhotoIndex + 1, count - 1) : Math.max(activePhotoIndex - 1, 0);
      if (next !== activePhotoIndex) {
        activePhotoIndex = next;
        renderPhoto(snapshot());
      }
    }, {passive:true});
  }

  function syncFromEngine(force = false) {
    const data = snapshot();
    const shell = document.querySelector('.talera-storytelling-shell');
    if (!data || !shell) return;

    const title = shell.querySelector('#taleraStoryTitle');
    const story = shell.querySelector('#taleraStoryText');
    const date = shell.querySelector('#taleraStoryDate span');
    const mic = shell.querySelector('#taleraStoryMic');
    const micLabel = shell.querySelector('#taleraStoryMicLabel');
    const audioState = shell.querySelector('#taleraStoryAudioState');
    const finish = shell.querySelector('#taleraStoryFinish');

    if (force || document.activeElement !== title) {
      const value = String(data.title || '');
      if (title.value !== value) title.value = value;
    }
    if (force || document.activeElement !== story) {
      const value = String(data.storyText || '');
      if (story.value !== value) {
        story.value = value;
        fitTextarea(story);
      }
    }
    date.textContent = String(data.eventTime || '') || 'Wanneer was dit?';

    const recording = isRecording(data);
    mic.classList.toggle('recording', recording);
    const hasAudio = Boolean(data.audioBlob || data.hasExistingAudio);
    audioState.hidden = !hasAudio;
    micLabel.textContent = recording ? 'Je vertelt nu · de foto blijft gewoon zichtbaar' : (hasAudio ? 'Opnieuw inspreken' : 'Vertel wat je je herinnert');
    finish.textContent = data.isEdit ? 'Terug naar presentatie' : 'Koppel aan mijn tijdlijn';

    renderPhoto(data);
    syncStatus();
  }

  function mount() {
    if (mounting) return;
    mounting = true;
    try {
      const stage = document.querySelector('.work-stage');
      if (!stage) return;
      stage.classList.add('talera-storytelling-host');
      if (!stage.querySelector('.talera-storytelling-shell')) buildShell(stage, snapshot() || {});
      else syncFromEngine();
    } finally {
      mounting = false;
    }
  }

  const observer = new MutationObserver(() => {
    requestAnimationFrame(mount);
  });
  observer.observe(document.documentElement, {subtree:true, childList:true});

  setInterval(() => {
    mount();
    syncFromEngine();
  }, 360);

  window.addEventListener('pageshow', mount, {passive:true});
  document.addEventListener('talera:storytelling-photo-removed', () => setTimeout(syncFromEngine, 0));
  mount();

  window.__taleraStorytellingPage = Object.freeze({
    revision:REV,
    refresh:syncFromEngine
  });
})();
</script>`;
