export const WORKBLAD_STORYTELLING_PAGE_REV = 'workblad-presentation-like-tell-20260916-r2';

export const WORKBLAD_STORYTELLING_PAGE_STYLE = String.raw`
html.talera-storytelling-active,
html.talera-storytelling-active body{
  margin:0!important;
  overflow:hidden!important;
  background:#0c1d2d!important;
}

.work-stage.talera-storytelling-host{
  position:relative!important;
  width:100%!important;
  height:100dvh!important;
  min-height:100dvh!important;
  margin:0!important;
  padding:0!important;
  overflow:hidden!important;
  background:#0c1d2d!important;
  color:white!important;
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
  z-index:70;
  overflow:hidden;
  background:#0c1d2d;
  color:white;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",system-ui,sans-serif;
  touch-action:none;
}

.talera-storytelling-visual{
  position:absolute;
  inset:0;
  overflow:hidden;
  background:
    radial-gradient(circle at 50% 20%,rgba(255,255,255,.16),transparent 45%),
    linear-gradient(155deg,#7891a2 0%,#405b72 44%,#172f43 100%);
}
.talera-storytelling-visual.has-photo::before{
  content:"";
  position:absolute;
  inset:-36px;
  background-image:var(--talera-story-photo-bg,none);
  background-position:center;
  background-size:cover;
  filter:blur(28px) saturate(.78) brightness(.76);
  opacity:.72;
  transform:scale(1.1);
}
.talera-storytelling-visual::after{
  content:"";
  position:absolute;
  inset:0;
  z-index:2;
  pointer-events:none;
  background:linear-gradient(180deg,rgba(5,14,25,.58) 0%,rgba(5,14,25,.12) 25%,rgba(5,14,25,.02) 52%,rgba(5,14,25,.55) 100%);
}
.talera-storytelling-photo-image{
  position:absolute;
  inset:0;
  z-index:1;
  width:100%;
  height:100%;
  object-fit:contain;
  object-position:center;
  pointer-events:none;
}

.talera-storytelling-top{
  position:absolute;
  z-index:12;
  top:0;
  left:0;
  right:0;
  padding:max(18px,env(safe-area-inset-top)) 16px 12px;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:12px;
  align-items:start;
  pointer-events:none;
}
.talera-storytelling-top-copy{
  min-width:0;
  display:grid;
  gap:7px;
  pointer-events:auto;
}
.talera-storytelling-brand{
  font-size:11px;
  font-weight:820;
  letter-spacing:.18em;
  opacity:.72;
}
.talera-storytelling-title{
  width:100%;
  min-width:0;
  border:0;
  outline:0;
  padding:0;
  background:transparent;
  color:white;
  font-size:clamp(24px,6.2vw,34px);
  line-height:1.03;
  font-weight:720;
  letter-spacing:-.035em;
  text-shadow:0 2px 18px rgba(0,0,0,.3);
}
.talera-storytelling-title::placeholder{color:rgba(255,255,255,.72)}
.talera-storytelling-date{
  width:max-content;
  max-width:100%;
  min-height:34px;
  padding:0 11px;
  display:flex;
  align-items:center;
  gap:7px;
  border:1px solid rgba(255,255,255,.28);
  border-radius:999px;
  background:rgba(7,22,35,.30);
  color:rgba(255,255,255,.90);
  font-size:12px;
  font-weight:680;
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  box-shadow:0 6px 22px rgba(0,0,0,.08);
}
.talera-storytelling-date svg{width:15px;height:15px}
.talera-storytelling-date.missing{box-shadow:0 0 0 2px rgba(240,176,141,.78)}
.talera-storytelling-top-actions{
  display:flex;
  gap:7px;
  pointer-events:auto;
}
.talera-storytelling-glass-btn{
  min-width:40px;
  height:40px;
  padding:0 12px;
  border:1px solid rgba(255,255,255,.26);
  border-radius:999px;
  display:grid;
  place-items:center;
  background:rgba(7,22,35,.34);
  color:white;
  font-size:12px;
  font-weight:760;
  backdrop-filter:blur(13px);
  -webkit-backdrop-filter:blur(13px);
  box-shadow:0 6px 24px rgba(0,0,0,.12);
}
.talera-storytelling-glass-btn svg{width:17px;height:17px}

.talera-storytelling-empty{
  position:absolute;
  z-index:6;
  inset:0;
  display:grid;
  place-items:center;
  padding:118px 30px 170px;
  text-align:center;
  pointer-events:none;
}
.talera-storytelling-empty-inner{
  width:min(330px,84vw);
  display:grid;
  place-items:center;
  gap:12px;
  color:rgba(255,255,255,.84);
}
.talera-storytelling-empty-inner strong{font-size:20px;line-height:1.2;color:white}
.talera-storytelling-empty-inner span{font-size:13px;line-height:1.45;opacity:.74}
.talera-storytelling-add-main{
  width:72px;
  height:72px;
  border:1px solid rgba(255,255,255,.54);
  border-radius:50%;
  display:grid;
  place-items:center;
  background:rgba(255,255,255,.90);
  color:#0f2747;
  box-shadow:0 18px 46px rgba(0,0,0,.22);
  font-size:36px;
  font-weight:300;
  pointer-events:auto;
}

.talera-storytelling-photo-tools{
  position:absolute;
  z-index:12;
  top:calc(max(18px,env(safe-area-inset-top)) + 92px);
  left:16px;
  right:16px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  pointer-events:none;
}
.talera-storytelling-photo-count,
.talera-storytelling-remove-photo{
  min-height:34px;
  padding:0 11px;
  border:1px solid rgba(255,255,255,.25);
  border-radius:999px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(7,22,35,.30);
  color:white;
  font-size:11px;
  font-weight:740;
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  pointer-events:auto;
}
.talera-storytelling-remove-photo{width:34px;padding:0}
.talera-storytelling-remove-photo svg{width:16px;height:16px}

.talera-storytelling-dots{
  position:absolute;
  z-index:12;
  left:50%;
  bottom:166px;
  transform:translateX(-50%);
  display:flex;
  align-items:center;
  gap:6px;
  padding:6px 9px;
  border-radius:999px;
  background:rgba(5,18,30,.24);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
}
.talera-storytelling-dot{
  width:6px;
  height:6px;
  padding:0;
  border:0;
  border-radius:999px;
  background:rgba(255,255,255,.48);
}
.talera-storytelling-dot.active{width:20px;background:white}

.talera-storytelling-mic-area{
  position:absolute;
  z-index:15;
  left:0;
  right:0;
  bottom:70px;
  display:grid;
  place-items:center;
  pointer-events:none;
}
.talera-storytelling-mic{
  width:76px;
  height:76px;
  border:1px solid rgba(255,255,255,.58);
  border-radius:50%;
  display:grid;
  place-items:center;
  background:rgba(247,244,239,.94);
  color:#0f2747;
  box-shadow:0 17px 44px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.5);
  pointer-events:auto;
  -webkit-tap-highlight-color:transparent;
}
.talera-storytelling-mic svg{width:30px;height:30px}
.talera-storytelling-mic.recording{
  background:#315f87;
  color:white;
  box-shadow:0 0 0 9px rgba(255,255,255,.13),0 17px 44px rgba(0,0,0,.3);
  animation:taleraMicPulse 1.7s ease-in-out infinite;
}
@keyframes taleraMicPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
.talera-storytelling-mic-label{
  margin-top:8px;
  color:rgba(255,255,255,.84);
  font-size:12px;
  font-weight:680;
  text-shadow:0 2px 14px rgba(0,0,0,.4);
}

.talera-storytelling-bottom{
  position:absolute;
  z-index:16;
  left:0;
  right:0;
  bottom:0;
  min-height:58px;
  padding:7px 12px max(8px,env(safe-area-inset-bottom));
  display:grid;
  grid-template-columns:1fr auto 1fr;
  align-items:center;
  gap:8px;
  background:linear-gradient(180deg,transparent,rgba(5,15,26,.32));
  pointer-events:none;
}
.talera-storytelling-read-handle{
  justify-self:center;
  min-height:43px;
  padding:0 15px;
  border:1px solid rgba(255,255,255,.22);
  border-radius:999px;
  display:flex;
  align-items:center;
  gap:7px;
  background:rgba(7,22,35,.30);
  color:rgba(255,255,255,.90);
  font-size:11px;
  font-weight:720;
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  pointer-events:auto;
}
.talera-storytelling-read-handle::before{content:'↑';font-size:14px}
.talera-storytelling-finish{
  justify-self:end;
  min-height:43px;
  padding:0 16px;
  border:1px solid rgba(255,255,255,.22);
  border-radius:999px;
  background:rgba(247,244,239,.94);
  color:#0f2747;
  font-size:12px;
  font-weight:790;
  box-shadow:0 7px 22px rgba(0,0,0,.13);
  pointer-events:auto;
}
.talera-storytelling-mode-label{
  justify-self:start;
  font-size:11px;
  font-weight:720;
  color:rgba(255,255,255,.68);
}

.talera-storytelling-transcript{
  position:absolute;
  z-index:40;
  left:0;
  right:0;
  bottom:0;
  height:min(82dvh,780px);
  transform:translateY(calc(100% - 54px));
  transition:transform .32s cubic-bezier(.2,.78,.2,1);
  border-radius:26px 26px 0 0;
  background:rgba(249,247,243,.985);
  color:#0f2747;
  box-shadow:0 -18px 56px rgba(0,0,0,.25);
  backdrop-filter:blur(22px);
  -webkit-backdrop-filter:blur(22px);
  overflow:hidden;
  touch-action:pan-y;
}
.talera-storytelling-transcript.open{transform:translateY(0)}
.talera-storytelling-sheet-grab{
  height:54px;
  display:grid;
  place-items:center;
  gap:4px;
  color:rgba(15,39,71,.58);
  font-size:11px;
  font-weight:730;
  cursor:grab;
}
.talera-storytelling-sheet-grab::before{
  content:"";
  width:38px;
  height:4px;
  border-radius:99px;
  background:rgba(15,39,71,.22);
}
.talera-storytelling-sheet-body{
  height:calc(100% - 54px);
  overflow:auto;
  -webkit-overflow-scrolling:touch;
  padding:8px 20px calc(28px + env(safe-area-inset-bottom));
}
.talera-storytelling-sheet-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  margin:2px 0 12px;
}
.talera-storytelling-sheet-head h2{margin:0;font-size:22px;line-height:1.1;letter-spacing:-.025em}
.talera-storytelling-sheet-head p{margin:5px 0 0;color:rgba(15,39,71,.54);font-size:12px;line-height:1.4}
.talera-storytelling-close-sheet{
  width:38px;
  height:38px;
  border:0;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:#e8edf0;
  color:#0f2747;
  font-size:20px;
}
.talera-storytelling-story{
  width:100%;
  min-height:280px;
  border:0;
  outline:0;
  resize:none;
  padding:6px 0 20px;
  background:transparent;
  color:#33465c;
  font-size:18px;
  line-height:1.58;
  overflow:hidden;
}
.talera-storytelling-story::placeholder{color:rgba(51,70,92,.34)}
.talera-storytelling-audio-state{
  display:inline-flex;
  align-items:center;
  gap:6px;
  min-height:28px;
  padding:0 10px;
  margin-bottom:10px;
  border-radius:999px;
  background:#e7eff5;
  color:#315f87;
  font-size:11px;
  font-weight:760;
}
.talera-storytelling-audio-state[hidden]{display:none}
.talera-storytelling-status{
  min-height:0;
  margin:10px 0 0;
  padding:0;
  border-radius:15px;
  color:rgba(15,39,71,.66);
  font-size:12px;
  line-height:1.4;
  font-weight:650;
}
.talera-storytelling-status.show{padding:10px 12px;background:#eaf0f3}
.talera-storytelling-status.bad{background:#fbeae7;color:#873c35}

.talera-storytelling-file-input{
  position:absolute!important;
  z-index:-1!important;
  width:1px!important;
  height:1px!important;
  opacity:.001!important;
  overflow:hidden!important;
  pointer-events:none!important;
}

/* De bewezen recorder blijft actief, maar de ORB wordt niet als vertelinterface getoond. */
html.talera-storytelling-active .voice-layer{
  position:fixed!important;
  z-index:55!important;
  left:14px!important;
  right:14px!important;
  bottom:calc(128px + env(safe-area-inset-bottom))!important;
  top:auto!important;
  width:auto!important;
  min-height:0!important;
  padding:10px!important;
  display:grid!important;
  grid-template-columns:1fr auto!important;
  gap:8px!important;
  border:1px solid rgba(255,255,255,.20)!important;
  border-radius:20px!important;
  background:rgba(7,22,35,.72)!important;
  color:white!important;
  box-shadow:0 14px 40px rgba(0,0,0,.24)!important;
  backdrop-filter:blur(16px)!important;
  -webkit-backdrop-filter:blur(16px)!important;
  pointer-events:none!important;
}
html.talera-storytelling-active .voice-layer .core-wrap{display:none!important}
html.talera-storytelling-active .voice-layer .voice-center{
  min-height:34px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:flex-start!important;
  pointer-events:none!important;
}
html.talera-storytelling-active .voice-layer .voice-status{
  margin:0!important;
  padding:0!important;
  color:white!important;
  font-size:12px!important;
  font-weight:700!important;
  opacity:.82!important;
}
html.talera-storytelling-active .voice-layer .voice-close{
  width:34px!important;
  height:34px!important;
  min-height:34px!important;
  border:1px solid rgba(255,255,255,.16)!important;
  border-radius:50%!important;
  background:rgba(255,255,255,.12)!important;
  color:white!important;
  pointer-events:auto!important;
}
html.talera-storytelling-active .voice-layer .voice-bottom{
  grid-column:1/-1!important;
  pointer-events:auto!important;
}
html.talera-storytelling-active .voice-layer .voice-bottom > div{
  width:100%!important;
  display:grid!important;
  grid-template-columns:1fr 1fr!important;
  gap:7px!important;
}
html.talera-storytelling-active .voice-layer .pill{
  width:100%!important;
  min-width:0!important;
  min-height:44px!important;
  border:1px solid rgba(255,255,255,.15)!important;
  border-radius:14px!important;
  background:rgba(255,255,255,.12)!important;
  color:white!important;
  box-shadow:none!important;
  font-size:13px!important;
  font-weight:750!important;
}
html.talera-storytelling-active .work-saving{display:none!important}
.work-stage.voice-open .talera-storytelling-shell{opacity:1!important;filter:none!important;transform:none!important;pointer-events:auto!important}

@media(max-width:600px){
  .talera-storytelling-top{padding-left:14px;padding-right:14px}
  .talera-storytelling-photo-tools{left:14px;right:14px}
  .talera-storytelling-title{font-size:27px}
  .talera-storytelling-transcript{height:84dvh}
}
`;

export const WORKBLAD_STORYTELLING_PAGE_SCRIPT = String.raw`<script id="talera-workblad-storytelling-page">
(() => {
  if (window.__taleraStorytellingPage) return;
  const REV = '${WORKBLAD_STORYTELLING_PAGE_REV}';
  let activePhotoIndex = 0;
  let mounting = false;
  let lastMediaSignature = '';
  let lastRenderedPhotoKey = '';
  let lastUserStatus = '';
  let lastUserStatusBad = false;
  let gestureStart = null;

  const micSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a4 4 0 0 0 4-4V7a4 4 0 1 0-8 0v4.5a4 4 0 0 0 4 4Z" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  const calendarSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const trashSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9 7V4.5h6V7M7 9.5l.7 10h8.6l.7-10M10 11.5v5M14 11.5v5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function actions(){ return window.__taleraStorytellingActions || null; }
  function snapshot(){
    try{
      const api=actions();
      if(api&&typeof api.snapshot==='function')return api.snapshot();
      const fallback=typeof window.__taleraWorkbladV9Read==='function'?window.__taleraWorkbladV9Read():null;
      return fallback?{...fallback,media:[]}:null;
    }catch{return null;}
  }
  function mediaItems(data){ return (Array.isArray(data?.media)?data.media:[]).filter(item=>item&&item.url); }
  function signature(items){ return items.map(item=>[item.kind||'',item.id||'',item.url||'',item.size||0].join(':')).join('|'); }
  function isRecording(data){ return data?.view==='listening'||data?.view==='mic-initializing'||Boolean(document.getElementById('voiceLayer')); }
  function fitTextarea(el){ if(!el)return;el.style.height='auto';el.style.height=Math.max(280,el.scrollHeight)+'px'; }

  function status(message,bad=false){
    lastUserStatus=String(message||'');
    lastUserStatusBad=Boolean(bad);
    syncStatus();
  }
  function hiddenStatusText(){
    const bridge=document.getElementById('talera-v9-bridge-status');
    if(bridge?.textContent?.trim())return {text:bridge.textContent.trim(),bad:/mislukt|niet|fout/i.test(bridge.textContent)};
    const stage=document.getElementById('talera-photo-stage');
    if(stage?.textContent?.trim())return {text:stage.textContent.trim(),bad:false};
    const oldError=document.querySelector('.work-error');
    if(oldError?.textContent?.trim())return {text:oldError.textContent.trim(),bad:true};
    return null;
  }
  function syncStatus(){
    const node=document.querySelector('.talera-storytelling-status');
    if(!node)return;
    const inherited=hiddenStatusText();
    const text=inherited?.text||lastUserStatus;
    const bad=inherited?inherited.bad:lastUserStatusBad;
    node.textContent=text||'';
    node.classList.toggle('show',Boolean(text));
    node.classList.toggle('bad',Boolean(text&&bad));
  }

  function openTranscript(open=true){
    const sheet=document.getElementById('taleraStoryTranscript');
    if(!sheet)return;
    sheet.classList.toggle('open',Boolean(open));
    sheet.setAttribute('aria-expanded',open?'true':'false');
    if(open)setTimeout(()=>fitTextarea(document.getElementById('taleraStoryText')),30);
  }

  function triggerPhotoPicker(){
    const input=document.getElementById('taleraStoryPhotoInput');
    if(!input)return;
    input.value='';
    input.click();
  }

  function buildShell(stage,data){
    const shell=document.createElement('div');
    shell.className='talera-storytelling-shell';
    shell.innerHTML=
      '<section class="talera-storytelling-visual" id="taleraStoryVisual" aria-label="Vertel bij je foto">' +
        '<div class="talera-storytelling-top">' +
          '<div class="talera-storytelling-top-copy">' +
            '<span class="talera-storytelling-brand">TALERA</span>' +
            '<input class="talera-storytelling-title" id="taleraStoryTitle" maxlength="140" placeholder="Titel van deze herinnering">' +
            '<button type="button" class="talera-storytelling-date" id="taleraStoryDate">'+calendarSvg+'<span>Wanneer was dit?</span></button>' +
          '</div>' +
          '<div class="talera-storytelling-top-actions"><button type="button" class="talera-storytelling-glass-btn" id="taleraStoryAddPhoto">+ foto</button></div>' +
        '</div>' +
        '<div class="talera-storytelling-photo-tools" id="taleraStoryPhotoTools" hidden></div>' +
        '<div class="talera-storytelling-mic-area">' +
          '<button type="button" class="talera-storytelling-mic" id="taleraStoryMic" aria-label="Vertel bij deze foto">'+micSvg+'</button>' +
          '<span class="talera-storytelling-mic-label" id="taleraStoryMicLabel">Vertel wat je je herinnert</span>' +
        '</div>' +
        '<div class="talera-storytelling-bottom">' +
          '<span class="talera-storytelling-mode-label">Vertellen</span>' +
          '<button type="button" class="talera-storytelling-read-handle" id="taleraStoryRead">Lees / bewerk tekst</button>' +
          '<button type="button" class="talera-storytelling-finish" id="taleraStoryFinish">'+(data?.isEdit?'Terug naar presentatie':'Koppel')+'</button>' +
        '</div>' +
      '</section>' +
      '<section class="talera-storytelling-transcript" id="taleraStoryTranscript" aria-expanded="false">' +
        '<button type="button" class="talera-storytelling-sheet-grab" id="taleraStoryGrab">Veeg omlaag om terug te gaan naar je foto</button>' +
        '<div class="talera-storytelling-sheet-body">' +
          '<div class="talera-storytelling-sheet-head"><div><h2>Je verhaal</h2><p>Hier lees en corrigeer je de transcriptie. Tijdens vertellen blijft deze laag uit beeld.</p></div><button type="button" class="talera-storytelling-close-sheet" id="taleraStoryClose" aria-label="Terug naar foto">×</button></div>' +
          '<span class="talera-storytelling-audio-state" id="taleraStoryAudioState" hidden>● originele opname toegevoegd</span>' +
          '<textarea class="talera-storytelling-story" id="taleraStoryText" maxlength="20000" placeholder="Je transcriptie en geschreven verhaal verschijnen hier…"></textarea>' +
          '<div class="talera-storytelling-status" aria-live="polite"></div>' +
        '</div>' +
      '</section>' +
      '<input class="talera-storytelling-file-input" id="taleraStoryPhotoInput" type="file" accept="image/*" multiple aria-hidden="true">';

    stage.appendChild(shell);
    document.documentElement.classList.add('talera-storytelling-active');
    wireShell(shell);
    syncFromEngine(true);
  }

  function wireShell(shell){
    const title=shell.querySelector('#taleraStoryTitle');
    const story=shell.querySelector('#taleraStoryText');
    const date=shell.querySelector('#taleraStoryDate');
    const mic=shell.querySelector('#taleraStoryMic');
    const finish=shell.querySelector('#taleraStoryFinish');
    const add=shell.querySelector('#taleraStoryAddPhoto');
    const input=shell.querySelector('#taleraStoryPhotoInput');
    const read=shell.querySelector('#taleraStoryRead');
    const close=shell.querySelector('#taleraStoryClose');
    const grab=shell.querySelector('#taleraStoryGrab');
    const visual=shell.querySelector('#taleraStoryVisual');
    const transcript=shell.querySelector('#taleraStoryTranscript');

    title.addEventListener('input',()=>{ actions()?.setTitle?.(title.value); title.classList.remove('missing'); });
    story.addEventListener('input',()=>{ actions()?.setText?.(story.value); fitTextarea(story); });
    date.addEventListener('click',event=>{ event.preventDefault(); actions()?.openDate?.(); });
    mic.addEventListener('click',event=>{ event.preventDefault(); actions()?.startVoice?.(); });
    add.addEventListener('click',event=>{ event.preventDefault(); triggerPhotoPicker(); });
    input.addEventListener('change',async()=>{
      const files=Array.from(input.files||[]);
      if(!files.length)return;
      status(files.length===1?'Foto wordt toegevoegd…':files.length+' foto’s worden toegevoegd…');
      try{
        if(typeof actions()?.addPhotos!=='function')throw new Error('Fotokiezer is nog niet gekoppeld.');
        await actions().addPhotos(files);
        status('Foto toegevoegd.');
      }catch(error){
        status('Foto toevoegen lukt nog niet: '+String(error?.message||error),true);
      }
    });
    read.addEventListener('click',()=>openTranscript(true));
    close.addEventListener('click',()=>openTranscript(false));
    grab.addEventListener('click',()=>openTranscript(false));

    finish.addEventListener('click',event=>{
      event.preventDefault();
      const data=snapshot();
      const titleValue=String(data?.title||'').trim();
      const dateValue=String(data?.eventTime||'').trim();
      if(!titleValue||!dateValue){
        status(!titleValue&&!dateValue?'Voeg nog een titel en datum toe voordat je koppelt.':(!titleValue?'Geef deze herinnering nog een titel.':'Kies nog wanneer deze herinnering speelde.'),true);
        if(!titleValue)title.focus();else date.classList.add('missing');
        return;
      }
      status(data?.isEdit?'Wijzigingen worden veilig opgeslagen…':'Je herinnering wordt veilig gekoppeld…');
      actions()?.finish?.();
    });

    visual.addEventListener('pointerdown',event=>{
      if(event.target.closest('button,input,textarea'))return;
      gestureStart={id:event.pointerId,x:event.clientX,y:event.clientY};
      try{visual.setPointerCapture(event.pointerId)}catch{}
    });
    visual.addEventListener('pointerup',event=>{
      if(!gestureStart||gestureStart.id!==event.pointerId)return;
      const dx=event.clientX-gestureStart.x;
      const dy=event.clientY-gestureStart.y;
      gestureStart=null;
      try{visual.releasePointerCapture(event.pointerId)}catch{}
      if(Math.abs(dy)>56&&Math.abs(dy)>Math.abs(dx)*1.15&&dy<0){ openTranscript(true); return; }
      if(Math.abs(dx)>42&&Math.abs(dx)>Math.abs(dy)*1.12) movePhoto(dx<0?1:-1);
    });

    let sheetStartY=0;
    transcript.addEventListener('touchstart',event=>{ if(event.touches?.length)sheetStartY=event.touches[0].clientY; },{passive:true});
    transcript.addEventListener('touchend',event=>{
      if(!event.changedTouches?.length)return;
      const dy=event.changedTouches[0].clientY-sheetStartY;
      const body=transcript.querySelector('.talera-storytelling-sheet-body');
      if(dy>70&&(!body||body.scrollTop<=0))openTranscript(false);
    },{passive:true});
  }

  function renderPhoto(data,force=false){
    const visual=document.getElementById('taleraStoryVisual');
    if(!visual)return;
    const items=mediaItems(data);
    const sig=signature(items);
    if(sig!==lastMediaSignature){
      lastMediaSignature=sig;
      activePhotoIndex=Math.max(0,Math.min(activePhotoIndex,Math.max(0,items.length-1)));
    }
    const renderKey=sig+'#'+activePhotoIndex;
    if(!force&&renderKey===lastRenderedPhotoKey)return;
    lastRenderedPhotoKey=renderKey;

    visual.querySelectorAll('.talera-storytelling-photo-image,.talera-storytelling-empty,.talera-storytelling-dots').forEach(node=>node.remove());
    const tools=document.getElementById('taleraStoryPhotoTools');
    tools.replaceChildren();
    tools.hidden=!items.length;
    visual.classList.toggle('has-photo',items.length>0);

    if(!items.length){
      visual.style.removeProperty('--talera-story-photo-bg');
      const empty=document.createElement('div');
      empty.className='talera-storytelling-empty';
      empty.innerHTML='<div class="talera-storytelling-empty-inner"><button type="button" class="talera-storytelling-add-main" aria-label="Foto toevoegen">+</button><strong>Kies een foto die je herinnering oproept</strong><span>Daarna kun je gewoon naar de foto kijken en je verhaal vertellen.</span></div>';
      visual.insertBefore(empty,visual.firstChild);
      empty.querySelector('button').addEventListener('click',event=>{ event.preventDefault();triggerPhotoPicker(); });
      return;
    }

    const item=items[activePhotoIndex];
    const img=document.createElement('img');
    img.className='talera-storytelling-photo-image';
    img.alt='Foto '+(activePhotoIndex+1)+' bij deze herinnering';
    img.src=item.url;
    visual.insertBefore(img,visual.firstChild);
    visual.style.setProperty('--talera-story-photo-bg','url("'+String(item.url).replace(/"/g,'%22')+'")');

    const count=document.createElement('span');
    count.className='talera-storytelling-photo-count';
    count.textContent=(activePhotoIndex+1)+' / '+items.length;
    const remove=document.createElement('button');
    remove.type='button';
    remove.className='talera-storytelling-remove-photo';
    remove.setAttribute('aria-label','Verwijder deze foto');
    remove.innerHTML=trashSvg;
    tools.append(count,remove);
    remove.addEventListener('click',async event=>{
      event.preventDefault();
      const index=activePhotoIndex;
      status('Foto wordt verwijderd…');
      try{
        await actions()?.removePhoto?.(index);
        activePhotoIndex=Math.max(0,Math.min(index,items.length-2));
        lastRenderedPhotoKey='';
        status('Foto verwijderd.');
      }catch(error){status('Deze foto kon nog niet worden verwijderd: '+String(error?.message||error),true);}
    });

    if(items.length>1){
      const dots=document.createElement('div');
      dots.className='talera-storytelling-dots';
      items.forEach((_,index)=>{
        const dot=document.createElement('button');
        dot.type='button';
        dot.className='talera-storytelling-dot'+(index===activePhotoIndex?' active':'');
        dot.setAttribute('aria-label','Toon foto '+(index+1));
        dot.addEventListener('click',event=>{event.preventDefault();activePhotoIndex=index;lastRenderedPhotoKey='';renderPhoto(snapshot(),true);});
        dots.appendChild(dot);
      });
      visual.appendChild(dots);
    }
  }

  function movePhoto(direction){
    const data=snapshot();
    const items=mediaItems(data);
    if(items.length<2)return;
    const next=Math.max(0,Math.min(activePhotoIndex+direction,items.length-1));
    if(next===activePhotoIndex)return;
    activePhotoIndex=next;
    lastRenderedPhotoKey='';
    renderPhoto(data,true);
  }

  function syncFromEngine(force=false){
    const data=snapshot();
    const shell=document.querySelector('.talera-storytelling-shell');
    if(!data||!shell)return;
    const title=shell.querySelector('#taleraStoryTitle');
    const story=shell.querySelector('#taleraStoryText');
    const date=shell.querySelector('#taleraStoryDate span');
    const mic=shell.querySelector('#taleraStoryMic');
    const micLabel=shell.querySelector('#taleraStoryMicLabel');
    const audioState=shell.querySelector('#taleraStoryAudioState');
    const finish=shell.querySelector('#taleraStoryFinish');

    if(force||document.activeElement!==title){const value=String(data.title||'');if(title.value!==value)title.value=value;}
    if(force||document.activeElement!==story){const value=String(data.storyText||'');if(story.value!==value){story.value=value;fitTextarea(story);}}
    date.textContent=String(data.eventTime||'')||'Wanneer was dit?';
    const recording=isRecording(data);
    mic.classList.toggle('recording',recording);
    const hasAudio=Boolean(data.audioBlob||data.hasExistingAudio);
    audioState.hidden=!hasAudio;
    micLabel.textContent=recording?'Je vertelt nu · swipe gerust door je foto’s':(hasAudio?'Opnieuw inspreken':'Vertel wat je je herinnert');
    finish.textContent=data.isEdit?'Presenteren':'Koppel';
    renderPhoto(data,force);
    syncStatus();
  }

  function mount(){
    if(mounting)return;
    mounting=true;
    try{
      const stage=document.querySelector('.work-stage');
      if(!stage)return;
      stage.classList.add('talera-storytelling-host');
      if(!stage.querySelector('.talera-storytelling-shell'))buildShell(stage,snapshot()||{});else syncFromEngine();
    }finally{mounting=false;}
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(mount));
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>{mount();syncFromEngine();},420);
  window.addEventListener('pageshow',mount,{passive:true});
  document.addEventListener('talera:storytelling-photo-removed',()=>{lastRenderedPhotoKey='';setTimeout(()=>syncFromEngine(true),0)});
  mount();

  window.__taleraStorytellingPage=Object.freeze({revision:REV,refresh:syncFromEngine,openTranscript});
})();
</script>`;
