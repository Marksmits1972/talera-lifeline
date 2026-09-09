export const storyPageStyle = String.raw`
/* TALERA — vertelpagina 9 september 2026
   De pagina ligt als zelfstandige laag boven het presentatiescherm.
   De bestaande tijdlijncode blijft onaangeraakt. */
.talera-story-page{
  --deep:#0F2747;
  --soft:#5B8FB9;
  --light:#DCEAF6;
  --warm:#E7A98B;
  --paper:#F7F4EF;
  --white:#FFFEFC;
  --text:#3E4A59;
  position:fixed;
  inset:0;
  z-index:10000;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  color:var(--deep);
  background:
    radial-gradient(circle at 50% 42%,rgba(220,234,246,.88) 0 17%,rgba(220,234,246,.35) 36%,rgba(247,244,239,0) 62%),
    linear-gradient(180deg,#fffefc 0%,#f7f4ef 76%,#f3eee7 100%);
  opacity:0;
  transform:translateY(12px) scale(.995);
  pointer-events:none;
  transition:opacity .28s ease,transform .36s cubic-bezier(.2,.8,.2,1);
  font-family:"Avenir Next","Helvetica Neue",Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
.talera-story-page.is-open{opacity:1;transform:none;pointer-events:auto}
.talera-story-page *{box-sizing:border-box}
.talera-story-page button,.talera-story-page input{font:inherit}
.talera-story-top{
  position:relative;z-index:5;
  display:grid;grid-template-columns:44px 1fr 44px;align-items:center;
  min-height:70px;padding:calc(env(safe-area-inset-top) + 8px) 14px 8px;
}
.talera-story-top h1{margin:0;text-align:center;font-size:15px;font-weight:680;letter-spacing:.01em}
.talera-story-close{
  width:40px;height:40px;border:0;border-radius:50%;background:rgba(255,254,252,.72);color:var(--deep);
  display:grid;place-items:center;font-size:25px;font-weight:300;box-shadow:0 3px 14px rgba(15,39,71,.05)
}
.talera-story-close span{transform:translateY(-1px)}
.talera-story-shell{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;padding:4px 22px calc(env(safe-area-inset-bottom) + 20px)}
.talera-story-intro{text-align:center;max-width:310px;margin:6px auto 0;transition:opacity .2s ease,transform .2s ease}
.talera-story-kicker{margin:0 0 5px;font-size:11px;font-weight:700;letter-spacing:.11em;text-transform:uppercase;color:rgba(15,39,71,.48)}
.talera-story-title{margin:0;font-size:25px;line-height:1.16;font-weight:650;letter-spacing:-.025em}
.talera-story-sub{margin:9px auto 0;max-width:27ch;font-size:13px;line-height:1.45;color:rgba(62,74,89,.68)}
.talera-core-wrap{position:relative;width:min(68vw,285px);aspect-ratio:1;margin:auto 0;display:grid;place-items:center;isolation:isolate}
.talera-core-halo,.talera-core-halo::before,.talera-core-halo::after{position:absolute;inset:0;border-radius:50%;content:""}
.talera-core-halo{
  inset:5%;
  background:radial-gradient(circle,rgba(91,143,185,.15),rgba(91,143,185,.05) 53%,transparent 71%);
  filter:blur(1px);animation:taleraBreathe 5.8s ease-in-out infinite;
}
.talera-core-halo::before{inset:13%;border:1px solid rgba(91,143,185,.15);animation:taleraOrbit 13s linear infinite}
.talera-core-halo::after{inset:24%;border:1px solid rgba(231,169,139,.22);animation:taleraOrbit 17s linear infinite reverse}
.talera-core{
  position:relative;z-index:2;width:47%;aspect-ratio:1;border:0;border-radius:50%;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
  color:var(--deep);
  background:
    radial-gradient(circle at 35% 30%,rgba(255,255,255,.94),rgba(220,234,246,.82) 34%,rgba(91,143,185,.42) 70%,rgba(15,39,71,.16) 100%);
  box-shadow:0 18px 48px rgba(15,39,71,.13),inset 0 1px 2px rgba(255,255,255,.9),0 0 0 12px rgba(220,234,246,.23);
  transition:width .35s ease,background .35s ease,box-shadow .35s ease,transform .2s ease;
}
.talera-core:active{transform:scale(.97)}
.talera-core-dot{width:9px;height:9px;border-radius:50%;background:var(--warm);box-shadow:0 0 0 6px rgba(231,169,139,.17)}
.talera-core-label{margin-top:8px;font-size:13px;font-weight:700}
.talera-core-caption{font-size:10px;color:rgba(15,39,71,.5)}
.talera-story-page[data-mode="recording"] .talera-core{width:55%;background:radial-gradient(circle at 35% 30%,#fff,rgba(231,169,139,.67) 39%,rgba(231,169,139,.38) 70%,rgba(15,39,71,.13));box-shadow:0 18px 54px rgba(15,39,71,.13),0 0 0 14px rgba(231,169,139,.13)}
.talera-story-page[data-mode="recording"] .talera-core-halo{animation-duration:2.4s}
.talera-story-page[data-mode="recording"] .talera-core-dot{animation:taleraRecord 1.45s ease-in-out infinite}
.talera-story-page.has-photo{background-size:cover;background-position:center}
.talera-story-page.has-photo::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,39,71,.22),rgba(247,244,239,.34) 36%,rgba(247,244,239,.93) 79%,rgba(247,244,239,.99));backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
.talera-story-page.has-photo .talera-story-top,.talera-story-page.has-photo .talera-story-shell{position:relative;z-index:2}
.talera-entry-grid{width:min(100%,390px);display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:auto}
.talera-entry{
  min-height:72px;border:1px solid rgba(15,39,71,.08);border-radius:20px;padding:12px 14px;
  display:flex;align-items:center;gap:11px;text-align:left;background:rgba(255,254,252,.8);color:var(--deep);
  box-shadow:0 8px 24px rgba(15,39,71,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)
}
.talera-entry:first-child{grid-column:1 / -1;min-height:80px;background:rgba(15,39,71,.96);color:var(--white);border-color:transparent}
.talera-entry-icon{flex:0 0 38px;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(220,234,246,.46);font-size:18px}
.talera-entry:first-child .talera-entry-icon{background:rgba(255,255,255,.13)}
.talera-entry strong{display:block;font-size:14px;font-weight:700;line-height:1.2}
.talera-entry small{display:block;margin-top:3px;font-size:10px;line-height:1.3;opacity:.63}
.talera-mode-actions{display:none;width:min(100%,390px);margin-top:auto;gap:10px;grid-template-columns:1fr 1fr}
.talera-story-page:not([data-mode="home"]) .talera-entry-grid{display:none}
.talera-story-page:not([data-mode="home"]) .talera-mode-actions{display:grid}
.talera-action{min-height:50px;border:1px solid rgba(15,39,71,.1);border-radius:16px;background:rgba(255,254,252,.82);color:var(--deep);font-size:12px;font-weight:700;padding:10px 14px}
.talera-action.primary{background:var(--deep);border-color:var(--deep);color:var(--white)}
.talera-action.wide{grid-column:1 / -1}
.talera-back-link{position:absolute;left:20px;top:84px;border:0;background:transparent;color:rgba(15,39,71,.6);font-size:12px;font-weight:650;padding:8px 4px;display:none;z-index:6}
.talera-story-page:not([data-mode="home"]) .talera-back-link{display:block}
.talera-timer{font-variant-numeric:tabular-nums;font-size:12px;font-weight:700;color:rgba(15,39,71,.62);min-height:18px;margin-top:4px}
.talera-share-panel{display:none;width:min(100%,390px);margin:auto 0 0;padding:18px;border-radius:24px;background:rgba(255,254,252,.84);border:1px solid rgba(15,39,71,.08);box-shadow:0 12px 32px rgba(15,39,71,.07);text-align:left}
.talera-story-page[data-mode="share"] .talera-core-wrap{display:none}
.talera-story-page[data-mode="share"] .talera-share-panel{display:block}
.talera-share-panel h2{font-size:18px;margin:0 0 7px}.talera-share-panel p{font-size:12px;line-height:1.5;color:rgba(62,74,89,.7);margin:0 0 15px}
.talera-share-choice{width:100%;border:0;border-top:1px solid rgba(15,39,71,.08);background:transparent;color:var(--deep);padding:14px 0;text-align:left;font-size:13px;font-weight:650}
.talera-file-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
@keyframes taleraBreathe{0%,100%{transform:scale(.94);opacity:.62}50%{transform:scale(1.05);opacity:1}}
@keyframes taleraOrbit{to{transform:rotate(360deg)}}
@keyframes taleraRecord{0%,100%{transform:scale(.9);opacity:.72}50%{transform:scale(1.22);opacity:1}}
@media (max-height:650px){.talera-core-wrap{width:min(49vw,220px)}.talera-story-intro{margin-top:0}.talera-story-title{font-size:21px}.talera-entry{min-height:62px}.talera-entry:first-child{min-height:66px}}
@media (prefers-reduced-motion:reduce){.talera-story-page,.talera-core,.talera-core-halo,.talera-core-halo::before,.talera-core-halo::after,.talera-core-dot{animation:none!important;transition:none!important}}
`;

export const storyPageScript = String.raw`
(() => {
  "use strict";
  if (window.__taleraStoryPageInstalled) return;
  window.__taleraStoryPageInstalled = true;

  const page = document.createElement("section");
  page.className = "talera-story-page";
  page.dataset.mode = "home";
  page.setAttribute("aria-hidden", "true");
  page.innerHTML = `
    <header class="talera-story-top">
      <button class="talera-story-close" type="button" aria-label="Sluiten"><span>×</span></button>
      <h1>Nieuw verhaal</h1><span></span>
    </header>
    <button class="talera-back-link" type="button">‹ Begin opnieuw</button>
    <div class="talera-story-shell">
      <div class="talera-story-intro">
        <p class="talera-story-kicker">Vertellen · bewaren · delen</p>
        <h2 class="talera-story-title">Waar wil je beginnen?</h2>
        <p class="talera-story-sub">Een verhaal mag klein beginnen. Met je stem, met een foto, of door iets samen te delen.</p>
        <div class="talera-timer" aria-live="polite"></div>
      </div>

      <div class="talera-core-wrap" aria-hidden="true">
        <div class="talera-core-halo"></div>
        <button class="talera-core" type="button" tabindex="-1">
          <span class="talera-core-dot"></span>
          <span class="talera-core-label">Een herinnering</span>
          <span class="talera-core-caption">begint hier</span>
        </button>
      </div>

      <div class="talera-share-panel">
        <h2>Delen begint met een herinnering</h2>
        <p>Houd delen rustig en persoonlijk. Kies wat je wilt doen; niets wordt verstuurd zonder een bewuste vervolgstap.</p>
        <button class="talera-share-choice" type="button">Een bestaande herinnering delen ›</button>
        <button class="talera-share-choice" type="button">Iemand uitnodigen om iets te vertellen ›</button>
      </div>

      <div class="talera-entry-grid">
        <button class="talera-entry" data-entry="tell" type="button">
          <span class="talera-entry-icon">●</span><span><strong>Vertellen</strong><small>Begin met je stem</small></span>
        </button>
        <button class="talera-entry" data-entry="photo" type="button">
          <span class="talera-entry-icon">▧</span><span><strong>Foto eerst</strong><small>Kies een beeld en vertel daarna</small></span>
        </button>
        <button class="talera-entry" data-entry="share" type="button">
          <span class="talera-entry-icon">↗</span><span><strong>Delen</strong><small>Samen een herinnering bewaren</small></span>
        </button>
      </div>

      <div class="talera-mode-actions">
        <button class="talera-action primary wide" data-action="record" type="button">Vertellen</button>
        <button class="talera-action" data-action="photo" type="button">Foto toevoegen</button>
        <button class="talera-action" data-action="done" type="button">Klaar</button>
      </div>
      <input class="talera-file-input" type="file" accept="image/*" aria-label="Foto kiezen">
    </div>`;
  document.body.appendChild(page);

  const title = page.querySelector(".talera-story-title");
  const sub = page.querySelector(".talera-story-sub");
  const timerEl = page.querySelector(".talera-timer");
  const coreLabel = page.querySelector(".talera-core-label");
  const coreCaption = page.querySelector(".talera-core-caption");
  const recordBtn = page.querySelector('[data-action="record"]');
  const doneBtn = page.querySelector('[data-action="done"]');
  const photoInput = page.querySelector(".talera-file-input");

  let stream = null;
  let recorder = null;
  let chunks = [];
  let timer = null;
  let startedAt = 0;
  let photoUrl = null;

  function formatTime(ms){
    const total = Math.max(0,Math.floor(ms/1000));
    const min = String(Math.floor(total/60)).padStart(2,"0");
    const sec = String(total%60).padStart(2,"0");
    return min + ":" + sec;
  }
  function stopTimer(){ if(timer){clearInterval(timer);timer=null;} }
  function stopTracks(){
    if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
  }
  function resetVisualPhoto(){
    if(photoUrl){URL.revokeObjectURL(photoUrl);photoUrl=null;}
    page.classList.remove("has-photo");
    page.style.backgroundImage="";
    photoInput.value="";
  }
  function setMode(mode){
    page.dataset.mode=mode;
    timerEl.textContent="";
    if(mode === "home"){
      title.textContent="Waar wil je beginnen?";
      sub.textContent="Een verhaal mag klein beginnen. Met je stem, met een foto, of door iets samen te delen.";
      coreLabel.textContent="Een herinnering";
      coreCaption.textContent="begint hier";
      recordBtn.textContent="Vertellen";
    }
    if(mode === "tell"){
      title.textContent="Vertel maar";
      sub.textContent="De microfoon start pas wanneer jij hieronder bewust op Vertellen drukt.";
      coreLabel.textContent="Jouw verhaal";
      coreCaption.textContent="wacht op je stem";
      recordBtn.textContent="Vertellen";
    }
    if(mode === "photo"){
      title.textContent=photoUrl ? "Vertel bij deze foto" : "Kies eerst een foto";
      sub.textContent=photoUrl ? "Gebruik het beeld als startpunt. De microfoon blijft uit tot jij Vertellen kiest." : "Een beeld kan genoeg zijn om een herinnering weer dichtbij te brengen.";
      coreLabel.textContent=photoUrl ? "Deze foto" : "Foto eerst";
      coreCaption.textContent=photoUrl ? "vertel wat je erbij voelt" : "kies een beeld";
      recordBtn.textContent="Vertellen";
    }
    if(mode === "share"){
      title.textContent="Delen";
      sub.textContent="Een rustige ingang om een herinnering met iemand anders te verbinden.";
    }
    if(mode === "saved"){
      title.textContent="Je verhaal is veilig afgerond";
      sub.textContent="Vanuit hier kan de herinnering later rustig verder worden aangevuld en op de tijdlijn worden geplaatst.";
      coreLabel.textContent="Bewaard";
      coreCaption.textContent="één herinnering rijker";
      recordBtn.textContent="Nog iets vertellen";
      doneBtn.textContent="Terug naar tijdlijn";
    } else {
      doneBtn.textContent="Klaar";
    }
  }
  function openPage(){
    setMode("home");
    page.setAttribute("aria-hidden","false");
    requestAnimationFrame(()=>page.classList.add("is-open"));
  }
  function closePage(){
    stopTimer();
    if(recorder && recorder.state !== "inactive"){try{recorder.stop();}catch(_){}}
    stopTracks();
    resetVisualPhoto();
    page.classList.remove("is-open");
    page.setAttribute("aria-hidden","true");
    setTimeout(()=>setMode("home"),320);
  }
  async function startRecording(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      timerEl.textContent="Microfoonopname wordt in deze browser niet ondersteund.";
      return;
    }
    try{
      stream = await navigator.mediaDevices.getUserMedia({audio:true});
      chunks=[];
      recorder = new MediaRecorder(stream);
      recorder.addEventListener("dataavailable",e=>{if(e.data && e.data.size) chunks.push(e.data);});
      recorder.addEventListener("stop",()=>{stopTracks();});
      recorder.start();
      startedAt=Date.now();
      page.dataset.mode="recording";
      title.textContent=photoUrl ? "Vertel bij deze foto" : "Ik luister";
      sub.textContent="Neem de tijd. Jij bepaalt wanneer dit verhaal klaar is.";
      coreLabel.textContent="Aan het vertellen";
      coreCaption.textContent="jouw stem wordt opgenomen";
      recordBtn.textContent="Pauzeer";
      timerEl.textContent="00:00";
      timer=setInterval(()=>timerEl.textContent=formatTime(Date.now()-startedAt),250);
    }catch(err){
      timerEl.textContent="De microfoon is niet gestart. Je kunt toestemming geven wanneer je wilt vertellen.";
    }
  }
  function stopRecording(){
    stopTimer();
    if(recorder && recorder.state !== "inactive"){try{recorder.stop();}catch(_){}}
    stopTracks();
    page.dataset.mode = photoUrl ? "photo" : "tell";
    title.textContent="Je verhaal staat klaar";
    sub.textContent="Druk op Klaar om dit moment af te ronden, of vertel nog iets verder.";
    coreLabel.textContent="Opname klaar";
    coreCaption.textContent="nog niet gedeeld";
    recordBtn.textContent="Verder vertellen";
  }
  function finishStory(){
    if(page.dataset.mode === "saved"){closePage();return;}
    if(page.dataset.mode === "recording") stopRecording();
    setMode("saved");
  }

  document.addEventListener("click", (event) => {
    const tell = event.target.closest(".tell");
    if(tell && !page.contains(tell)){
      event.preventDefault();
      event.stopImmediatePropagation();
      openPage();
      return;
    }
  }, true);

  page.addEventListener("click",event=>{
    if(event.target.closest(".talera-story-close")){closePage();return;}
    if(event.target.closest(".talera-back-link")){
      stopTimer(); if(recorder && recorder.state !== "inactive"){try{recorder.stop();}catch(_){}} stopTracks(); resetVisualPhoto(); setMode("home"); return;
    }
    const entry=event.target.closest("[data-entry]");
    if(entry){
      const kind=entry.dataset.entry;
      if(kind==="photo"){setMode("photo");setTimeout(()=>photoInput.click(),120);} else setMode(kind);
      return;
    }
    const action=event.target.closest("[data-action]");
    if(!action)return;
    if(action.dataset.action==="photo"){photoInput.click();return;}
    if(action.dataset.action==="record"){
      if(page.dataset.mode==="recording") stopRecording(); else startRecording();
      return;
    }
    if(action.dataset.action==="done"){finishStory();return;}
  });

  photoInput.addEventListener("change",()=>{
    const file=photoInput.files && photoInput.files[0];
    if(!file)return;
    if(photoUrl)URL.revokeObjectURL(photoUrl);
    photoUrl=URL.createObjectURL(file);
    page.style.backgroundImage=`url("${photoUrl}")`;
    page.classList.add("has-photo");
    setMode("photo");
  });

  window.TaleraStoryPage={open:openPage,close:closePage};
})();
`;
