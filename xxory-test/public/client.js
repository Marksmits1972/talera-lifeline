window.__TALERA_CONFIG__={"basePath":""};(function clientMain() {
  "use strict";

  const root = document.getElementById("root");
  const BASE = (window.__TALERA_CONFIG__?.basePath || "").replace(/\/$/, "");
  const SILENCE_TO_FINISH_MS = 2700;
  const VOICE_GATE = 0.055;
  const FIRST_SPEECH_FRAMES = 5;
  const sessionId = (() => {
    try {
      const found = sessionStorage.getItem("talera-session-v2");
      if (found) return found;
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      sessionStorage.setItem("talera-session-v2", id);
      return id;
    } catch { return Math.random().toString(36).slice(2); }
  })();

  const state = {
    phase: "entry",
    startPhoto: null,
    startPhotoUrl: "",
    mediaFiles: [],
    recorder: null,
    pendingStory: null,
    storyId: null,
    manageToken: null,
    metadata: null,
    transcript: "",
    returnTo: new URLSearchParams(location.search).get("returnTo") || ""
  };

  function api(path) { return BASE + path; }
  function appPath(path) { return BASE + path; }
  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function escapeAttr(value) { return escapeHtml(value); }

  function coreMarkup(className = "", caption = "") {
    return '<div class="core-wrap ' + className + '" id="livingCore" style="--voice:0" aria-label="Levende kern"><div class="core-halo"></div><div class="core-body"></div></div><div class="core-caption" id="coreCaption">' + escapeHtml(caption) + '</div>';
  }

  function page({ body, bottom = "", className = "", back = null }) {
    root.innerHTML = '<section class="page ' + className + '"><header class="topbar">' +
      (back ? '<button class="back" id="backBtn" aria-label="Terug">‹ Terug</button>' : '') +
      '<div class="wordmark">TALERA</div></header><div class="stage">' + body + '</div><footer class="bottom">' + bottom + '</footer></section>';
    if (back) document.getElementById("backBtn")?.addEventListener("click", back);
  }

  function renderEntry() {
    state.phase = "entry";
    revokePhotoUrl();
    state.startPhoto = null;
    state.mediaFiles = [];
    page({
      body: coreMarkup("", ""),
      bottom: '<div class="actions-2"><button class="btn btn-primary" id="voiceStart">Vertellen</button><button class="btn btn-soft" id="photoStart">Begin met een foto</button></div><button class="btn btn-text" id="typeStart">Typ liever</button>'
    });
    document.getElementById("voiceStart").addEventListener("click", () => beginVoice());
    document.getElementById("photoStart").addEventListener("click", chooseStartPhoto);
    document.getElementById("typeStart").addEventListener("click", renderTextComposer);
  }

  function chooseStartPhoto() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      revokePhotoUrl();
      state.startPhoto = file;
      state.startPhotoUrl = URL.createObjectURL(file);
      renderPhotoReady();
    }, { once: true });
    input.click();
  }

  function renderPhotoReady() {
    state.phase = "photo-ready";
    const photo = '<div class="photo-context"><img src="' + escapeAttr(state.startPhotoUrl) + '" alt="Gekozen herinneringsfoto"></div>';
    page({
      className: "photo-page",
      back: renderEntry,
      body: photo + coreMarkup("", ""),
      bottom: '<button class="btn btn-primary" id="voiceStart">Vertellen</button><button class="btn btn-text" id="otherPhoto">Andere foto kiezen</button>'
    });
    document.getElementById("voiceStart").addEventListener("click", () => beginVoice());
    document.getElementById("otherPhoto").addEventListener("click", chooseStartPhoto);
  }

  function renderTextComposer() {
    state.phase = "typing";
    page({
      back: renderEntry,
      body: '<textarea class="editor" id="storyText" maxlength="20000" placeholder="Schrijf je verhaal…" aria-label="Schrijf je verhaal"></textarea>',
      bottom: '<button class="btn btn-primary" id="textDone">Klaar</button>'
    });
    const editor = document.getElementById("storyText");
    editor.focus();
    postEvent("typing_started");
    document.getElementById("textDone").addEventListener("click", async () => {
      const text = editor.value.trim();
      if (!text) return editor.focus();
      const pending = { kind: "text", text: text.slice(0,20000), startPhoto: null };
      await storePending(pending);
      state.pendingStory = pending;
      await uploadAndProcess();
    });
  }

  async function beginVoice() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      return renderMicError("Inspreken wordt door deze browser niet ondersteund.");
    }
    state.phase = "mic-initializing";
    renderListening(false, "Even luisteren…");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true } });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = .18;
      source.connect(analyser);
      try { await audioContext.resume(); } catch {}

      const mimeType = chooseMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const recorder = {
        stream, audioContext, analyser, mediaRecorder,
        preRoll: [], chunks: [], speechStarted: false, activeFrames: 0,
        voiceLevel: 0, voiceFrame: 0, silenceAt: 0, paused: false,
        pauseStartedAt: 0, pausedTotal: 0, firstSpeechAt: 0, controlMode: "none"
      };
      state.recorder = recorder;

      mediaRecorder.addEventListener("dataavailable", (event) => {
        if (!event.data || event.data.size === 0) return;
        if (!recorder.speechStarted) {
          recorder.preRoll.push(event.data);
          while (recorder.preRoll.length > 2) recorder.preRoll.shift();
        } else recorder.chunks.push(event.data);
      });

      mediaRecorder.start(250); // technical rolling buffer; story semantics begin on first detected speech.
      renderListening(false, "Neem je tijd.");
      startVoiceLoop();
    } catch (error) {
      renderMicError(error?.name === "NotAllowedError" ? "De microfoon is nog niet toegestaan." : "De microfoon kon niet worden geopend.");
    }
  }

  function renderListening(awake, caption) {
    const photo = state.startPhotoUrl ? '<div class="photo-context"><img src="' + escapeAttr(state.startPhotoUrl) + '" alt="Gekozen herinneringsfoto"></div>' : '';
    page({
      className: state.startPhotoUrl ? "photo-page" : "",
      body: photo + coreMarkup(awake ? "awake" : "", caption),
      bottom: '<button class="single-control" id="recordControl">Pauze</button>'
    });
    document.getElementById("recordControl").addEventListener("click", handleRecordControl);
  }

  function renderMicError(message) {
    stopRecorderSilently();
    page({
      body: coreMarkup("", "" ) + '<div class="notice error" style="margin-top:18px">' + escapeHtml(message) + '</div>',
      bottom: '<button class="btn btn-primary" id="retryMic">Probeer opnieuw</button><button class="btn btn-text" id="typeFallback">Typ liever</button>',
      back: state.startPhoto ? renderPhotoReady : renderEntry
    });
    document.getElementById("retryMic").addEventListener("click", beginVoice);
    document.getElementById("typeFallback").addEventListener("click", renderTextComposer);
  }

  function startVoiceLoop() {
    const rec = state.recorder;
    if (!rec) return;
    const samples = new Uint8Array(rec.analyser.fftSize);
    const tick = () => {
      if (!state.recorder || rec.mediaRecorder.state === "inactive") return;
      const core = document.getElementById("livingCore");
      const caption = document.getElementById("coreCaption");
      const control = document.getElementById("recordControl");

      if (rec.paused || rec.mediaRecorder.state === "paused") {
        rec.voiceLevel = 0;
        core?.style.setProperty("--voice", "0");
        core?.classList.add("paused");
        rec.voiceFrame = requestAnimationFrame(tick);
        return;
      }

      rec.analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (let i=0;i<samples.length;i++) { const v=(samples[i]-128)/128; sum += v*v; }
      const rms = Math.sqrt(sum/samples.length);
      let target = Math.min(1, Math.max(0, (rms-.0065)*24));
      if (target < .05) target = 0;
      rec.voiceLevel = target > rec.voiceLevel ? target : Math.max(0, rec.voiceLevel*.58);
      if (rec.voiceLevel < .035) rec.voiceLevel = 0;
      const voice = rec.voiceLevel;
      core?.style.setProperty("--voice", voice.toFixed(3));

      if (!rec.speechStarted) {
        if (voice > .13) rec.activeFrames++; else rec.activeFrames = Math.max(0,rec.activeFrames-1);
        if (rec.activeFrames >= FIRST_SPEECH_FRAMES) {
          rec.speechStarted = true;
          rec.firstSpeechAt = performance.now();
          rec.chunks.push(...rec.preRoll);
          rec.preRoll.length = 0;
          core?.classList.add("awake");
          if (caption) caption.textContent = "";
          setRecordControl("pause");
          postEvent("recording_started");
          postEvent("recording_first_speech");
        }
      } else {
        const speaking = voice > VOICE_GATE;
        if (speaking) {
          rec.silenceAt = 0;
          core?.classList.add("awake");
          if (rec.controlMode !== "pause") setRecordControl("pause", true);
        } else {
          if (!rec.silenceAt) rec.silenceAt = performance.now();
          if (performance.now()-rec.silenceAt >= SILENCE_TO_FINISH_MS && rec.controlMode !== "finish") setRecordControl("finish");
        }
      }
      rec.voiceFrame = requestAnimationFrame(tick);
    };
    tick();
  }

  function setRecordControl(mode, immediate=false) {
    const rec = state.recorder;
    const control = document.getElementById("recordControl");
    if (!rec || !control) return;
    rec.controlMode = mode;
    control.classList.add("visible");
    if (mode === "pause") {
      control.textContent = "Pauze";
      control.classList.remove("finish");
      if (immediate) control.style.transitionDuration = "0s";
      requestAnimationFrame(() => { control.style.transitionDuration = ""; });
    } else if (mode === "finish") {
      control.textContent = "Klaar?";
      control.classList.add("finish");
    } else if (mode === "resume") {
      control.textContent = "Verder";
      control.classList.remove("finish");
    }
  }

  async function handleRecordControl() {
    const rec = state.recorder;
    if (!rec || !rec.speechStarted) return;
    if (rec.controlMode === "finish") return finishRecording();
    if (rec.controlMode === "resume") return resumeRecording();
    return pauseRecording();
  }

  function pauseRecording() {
    const rec = state.recorder;
    if (!rec || rec.mediaRecorder.state !== "recording") return;
    rec.mediaRecorder.pause();
    rec.paused = true;
    rec.pauseStartedAt = performance.now();
    rec.silenceAt = 0;
    document.getElementById("livingCore")?.classList.add("paused");
    setRecordControl("resume");
    postEvent("recording_paused");
  }

  function resumeRecording() {
    const rec = state.recorder;
    if (!rec || rec.mediaRecorder.state !== "paused") return;
    rec.mediaRecorder.resume();
    rec.paused = false;
    rec.pausedTotal += performance.now()-rec.pauseStartedAt;
    rec.pauseStartedAt = 0;
    rec.silenceAt = 0;
    const core = document.getElementById("livingCore");
    core?.classList.remove("paused"); core?.classList.add("awake");
    setRecordControl("pause", true);
    postEvent("recording_resumed");
  }

  async function finishRecording() {
    const rec = state.recorder;
    if (!rec || !rec.speechStarted) return;
    state.phase = "finishing";
    renderProcessing("Je verhaal is veilig bij mij.");

    if (rec.mediaRecorder.state === "paused") {
      rec.mediaRecorder.resume();
      rec.pausedTotal += performance.now()-rec.pauseStartedAt;
      rec.pauseStartedAt = 0;
    }
    const stopped = new Promise((resolve) => rec.mediaRecorder.addEventListener("stop", resolve, { once:true }));
    rec.mediaRecorder.stop();
    await stopped;
    if (rec.voiceFrame) cancelAnimationFrame(rec.voiceFrame);
    rec.stream.getTracks().forEach((t) => t.stop());
    try { await rec.audioContext.close(); } catch {}

    const mime = rec.mediaRecorder.mimeType || rec.chunks[0]?.type || "audio/webm";
    const blob = new Blob(rec.chunks, { type:mime });
    const duration = Math.max(0,(performance.now()-rec.firstSpeechAt-rec.pausedTotal)/1000);
    const pending = { kind:"audio", blob, duration, startPhoto:state.startPhoto || null };
    state.recorder = null;
    state.pendingStory = pending;
    await storePending(pending);
    await uploadAndProcess();
  }

  function renderProcessing(message) {
    state.phase = "processing";
    page({
      body: coreMarkup("processing", "") + '<div class="spinner-note" id="processNote">' + escapeHtml(message) + '</div>'
    });
  }

  async function uploadAndProcess() {
    renderProcessing("Je verhaal wordt bewaard.");
    try {
      const data = await retry(uploadPendingOnce, [0,700,1800]);
      state.storyId = data.storyId;
      state.manageToken = data.manageToken;
      saveWorkflow({ storyId:state.storyId, manageToken:state.manageToken, stage:"uploaded" });
      await clearPending();
      state.pendingStory = null;
      await runEnrichment();
    } catch (error) {
      renderRecoverableError("Je verhaal staat veilig op dit apparaat of in TALERA, maar de volgende stap lukte nog niet.", uploadAndProcess);
    }
  }

  async function runEnrichment() {
    renderProcessing("Ik kijk nog één keer naar wat je vertelde.");
    postEvent("ai_enrichment_started", { storyId:state.storyId });
    const enrich = await fetch(api('/api/stories/' + encodeURIComponent(state.storyId) + '/enrich'), {
      method:"POST", headers:{ authorization:'Bearer '+state.manageToken }
    });
    const result = await enrich.json().catch(() => ({}));
    if (!enrich.ok) throw new Error(result.error || "Verwerking mislukt");
    state.metadata = result.proposal || {};
    state.transcript = result.transcript || "";
    saveWorkflow({ storyId:state.storyId, manageToken:state.manageToken, stage:"review" });
    postEvent("ai_enrichment_completed", { storyId:state.storyId, detail:{ aiAvailable:Boolean(result.aiAvailable) } });
    renderReview(result);
  }

  async function resumeWorkflow(workflow) {
    state.storyId = workflow.storyId;
    state.manageToken = workflow.manageToken;
    renderProcessing("Je verhaal wordt weer opgepakt.");
    try {
      const response = await fetch(api('/api/stories/' + encodeURIComponent(state.storyId)), { headers:{ authorization:'Bearer '+state.manageToken } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Verhaal niet gevonden");
      const meta = data.metadata || {};
      state.metadata = {
        title:meta.title||"", timeLabel:meta.timeLabel||"", timeStart:meta.timeStart||"", timeEnd:meta.timeEnd||"",
        timePrecision:meta.timePrecision||"unknown", place:meta.place||"", people:Array.isArray(meta.people)?meta.people:[]
      };
      state.transcript = meta.transcript || "";
      if (meta.confirmed) {
        saveWorkflow({ storyId:state.storyId, manageToken:state.manageToken, stage:"confirmed" });
        renderMediaChoice();
        return;
      }
      if (meta.aiStatus === "ready" || meta.aiStatus === "needs_review") {
        renderReview({ aiAvailable: meta.aiStatus === "ready" });
        return;
      }
      await runEnrichment();
    } catch (error) {
      renderRecoverableError("Je verhaal is bewaard, maar de vervolgstap kon nog niet worden hervat.", () => resumeWorkflow(workflow));
    }
  }

  async function uploadPendingOnce() {
    const pending = state.pendingStory;
    if (!pending) throw new Error("Geen verhaal klaar om te bewaren");
    const form = new FormData();
    if (pending.kind === "audio") {
      form.append("audio", pending.blob, "talera-verhaal");
      form.append("durationSeconds", String(pending.duration || 0));
    } else form.append("storyText", pending.text);
    if (pending.startPhoto instanceof File) form.append("startPhoto", pending.startPhoto, pending.startPhoto.name || "startfoto");
    const displayName = (() => { try { return localStorage.getItem("xxory-display-name") || ""; } catch { return ""; } })();
    if (displayName) form.append("displayName", displayName);
    const response = await fetch(api("/api/stories"), { method:"POST", body:form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Opslaan mislukt");
    return data;
  }

  function renderReview(enrichResult) {
    state.phase = "review";
    const m = state.metadata || {};
    const notice = enrichResult.aiAvailable ? '' : '<div class="notice">Je verhaal is veilig bewaard. Het automatisch invullen lukte deze keer niet volledig; je kunt de gegevens hieronder zelf aanvullen.</div>';
    page({
      className:"review-page",
      body:'<div class="review-stage"><div class="review-head"><h1>Heb ik je goed begrepen?</h1><p class="lead">Controleer dit één keer. Als het klopt, hoef je niets meer in te vullen.</p></div>' + notice + reviewList(m,false) + '</div>',
      bottom:'<div class="actions-2"><button class="btn btn-primary" id="acceptMeta">Ja, akkoord en door</button><button class="btn btn-outline" id="changeMeta">Aanpassen</button></div>'
    });
    const accept = document.getElementById("acceptMeta");
    if (!m.title) accept.disabled = true;
    accept.addEventListener("click", () => confirmCurrentMetadata(m));
    document.getElementById("changeMeta").addEventListener("click", () => renderEditSelection(m));
  }

  function reviewList(m, withEditButtons) {
    const values = [
      ["Titel",m.title,"title"],
      ["Tijd",m.timeLabel,"timeLabel"],
      ["Plaats",m.place,"place"],
      ["Belangrijkste personen",Array.isArray(m.people)&&m.people.length?m.people.join(", "):"","people"]
    ];
    return '<div class="review-list">' + values.map(([label,value,key]) => '<div class="review-row edit-row" data-key="'+key+'"><div><div class="review-label">'+label+'</div><div class="review-value '+(!value?'empty':'')+'">'+escapeHtml(value || "Niet genoemd")+'</div></div>' + (withEditButtons?'<button class="edit-choice" data-edit="'+key+'">Dit aanpassen</button>':'') + '</div>').join('') + '</div>';
  }

  function renderEditSelection(m) {
    state.phase = "review-select-edit";
    page({
      className:"review-page",
      body:'<div class="review-stage"><div class="review-head"><h1>Wat wil je aanpassen?</h1><p class="lead">Kies alleen het onderdeel dat niet klopt.</p></div>'+reviewList(m,true)+'</div>',
      bottom:'<button class="btn btn-text" id="backReview">Terug naar overzicht</button>'
    });
    document.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => renderSingleEditor(m,btn.dataset.edit)));
    document.getElementById("backReview").addEventListener("click", () => renderReview({aiAvailable:true}));
  }

  function renderSingleEditor(m,key) {
    state.phase = "review-edit";
    const labels = {title:"Titel",timeLabel:"Tijd",place:"Plaats",people:"Belangrijkste personen"};
    const current = key === "people" ? (m.people || []).join(", ") : (m[key] || "");
    page({
      className:"review-page",
      body:'<div class="review-stage"><div class="review-head"><h1>'+escapeHtml(labels[key])+' aanpassen</h1></div><div class="review-row"><div class="review-label">'+escapeHtml(labels[key])+'</div><input class="field" id="metaField" value="'+escapeAttr(current)+'" autocomplete="off"></div></div>',
      bottom:'<button class="btn btn-primary" id="saveField">Wijziging gebruiken</button><button class="btn btn-text" id="cancelField">Annuleren</button>'
    });
    const field = document.getElementById("metaField"); field.focus(); field.select();
    document.getElementById("saveField").addEventListener("click", () => {
      const next = {...m, people:[...(m.people||[])]};
      if (key === "people") next.people = field.value.split(",").map(s=>s.trim()).filter(Boolean).slice(0,12);
      else next[key] = field.value.trim();
      if (key === "timeLabel") Object.assign(next,normalizeTimeLabel(next.timeLabel));
      state.metadata = next;
      renderEditSelection(next);
    });
    document.getElementById("cancelField").addEventListener("click", () => renderEditSelection(m));
  }

  async function confirmCurrentMetadata(m) {
    if (!m.title) return renderEditSelection(m);
    const response = await fetch(api('/api/stories/' + encodeURIComponent(state.storyId) + '/metadata'), {
      method:"PUT",
      headers:{"content-type":"application/json",authorization:'Bearer '+state.manageToken},
      body:JSON.stringify(m)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return renderRecoverableError(data.error || "Bevestigen lukte nog niet.", () => confirmCurrentMetadata(m));
    state.metadata = data.metadata;
    saveWorkflow({ storyId:state.storyId, manageToken:state.manageToken, stage:"confirmed" });
    postEvent("metadata_confirmed", { storyId:state.storyId });
    renderMediaChoice();
  }

  function normalizeTimeLabel(label) {
    const text = String(label||"").trim().toLowerCase();
    const exact = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (exact) return {timeStart:text,timeEnd:text,timePrecision:"exact_date"};
    const yearMatch = text.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
    if (!yearMatch) return {timeStart:"",timeEnd:"",timePrecision:"unknown"};
    const y = Number(yearMatch[1]);
    if (/lente|voorjaar/.test(text)) return {timeStart:`${y}-03-01`,timeEnd:`${y}-05-31`,timePrecision:"season"};
    if (/zomer/.test(text)) return {timeStart:`${y}-06-01`,timeEnd:`${y}-08-31`,timePrecision:"season"};
    if (/herfst|najaar/.test(text)) return {timeStart:`${y}-09-01`,timeEnd:`${y}-11-30`,timePrecision:"season"};
    if (/winter/.test(text)) return {timeStart:`${y}-12-01`,timeEnd:`${y}-12-31`,timePrecision:"season"};
    return {timeStart:`${y}-01-01`,timeEnd:`${y}-12-31`,timePrecision:"year"};
  }

  function renderMediaChoice() {
    state.phase = "media-choice";
    page({
      body:'<h1>Wil je nog media toevoegen?</h1><p class="lead">Foto’s en video’s kunnen dit verhaal later extra herkenbaar maken.</p>',
      bottom:'<button class="btn btn-primary" id="addMedia">Foto’s of video’s toevoegen</button><button class="btn btn-text" id="skipMedia">Niet nu</button>'
    });
    document.getElementById("addMedia").addEventListener("click", chooseExtraMedia);
    document.getElementById("skipMedia").addEventListener("click", finishFlow);
  }

  function chooseExtraMedia() {
    const input = document.createElement("input");
    input.type="file"; input.accept="image/*,video/*"; input.multiple=true;
    input.addEventListener("change", () => {
      const chosen = [...(input.files||[])];
      if (chosen.length) state.mediaFiles.push(...chosen);
      renderMediaPreview();
    }, {once:true});
    input.click();
  }

  function renderMediaPreview() {
    state.phase = "media-preview";
    const thumbs = state.mediaFiles.map((file,i) => {
      const url=URL.createObjectURL(file);
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      return file.type.startsWith("video/") ? '<div class="media-thumb video"><video src="'+escapeAttr(url)+'" muted playsinline></video></div>' : '<div class="media-thumb"><img src="'+escapeAttr(url)+'" alt="Gekozen foto"></div>';
    }).join('');
    page({
      body:'<h1>Mooi, dit hoort erbij.</h1><div class="media-grid">'+thumbs+'</div>',
      bottom:'<button class="btn btn-primary" id="uploadMedia">Verder</button><button class="btn btn-outline" id="moreMedia">Nog iets toevoegen</button>'
    });
    document.getElementById("moreMedia").addEventListener("click",chooseExtraMedia);
    document.getElementById("uploadMedia").addEventListener("click",uploadExtraMedia);
  }

  async function uploadExtraMedia() {
    if (!state.mediaFiles.length) return finishFlow();
    renderProcessing("Je media worden aan dit verhaal toegevoegd.");
    try {
      const form = new FormData();
      state.mediaFiles.slice(0,12).forEach((f) => form.append("media",f,f.name||"media"));
      const response = await fetch(api('/api/stories/'+encodeURIComponent(state.storyId)+'/media'), {method:"POST",headers:{authorization:'Bearer '+state.manageToken},body:form});
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.error||"Media toevoegen mislukt");
      postEvent("media_added",{storyId:state.storyId,detail:{count:data.media?.length||0}});
      state.mediaFiles=[];
      finishFlow();
    } catch (error) {
      renderRecoverableError("Je verhaal is al veilig opgeslagen. Alleen het toevoegen van media lukte nog niet.",uploadExtraMedia);
    }
  }

  function finishFlow() {
    state.phase = "complete";
    const target = safeReturnTarget(state.returnTo);
    clearWorkflow();
    if (target) {
      const url = new URL(target, location.href);
      url.searchParams.set("taleraNewStory",state.storyId);
      url.hash = 'taleraStory='+encodeURIComponent(state.storyId)+'&manage='+encodeURIComponent(state.manageToken);
      location.href = url.toString();
      return;
    }
    page({
      body:coreMarkup("processing","")+'<h1 style="margin-top:10px">Je verhaal staat klaar.</h1><p class="lead">Het is opgeslagen en klaar om op de tijdlijn te verschijnen.</p>',
      bottom:'<button class="btn btn-primary" id="newStory">Nieuw verhaal</button>'
    });
    document.getElementById("newStory").addEventListener("click",renderEntry);
  }

  function safeReturnTarget(value) {
    if (!value) return "";
    try {
      const u = new URL(value,location.href);
      if (u.origin !== location.origin) return "";
      return u.toString();
    } catch { return ""; }
  }

  async function renderSharedStory(token) {
    page({body:coreMarkup("processing","")+'<div class="spinner-note">Even openen…</div>'});
    try {
      const response = await fetch(api('/api/s/'+encodeURIComponent(token)));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error||"Niet beschikbaar");
      const photo = (data.media||[]).find(m=>String(m.mimeType||"").startsWith("image/"));
      const title = data.metadata?.title || "Een verhaal in TALERA";
      const time = data.metadata?.timeLabel || "";
      const place = data.metadata?.place || "";
      const context = [time,place].filter(Boolean).join(" · ");
      const content = data.storyType === "text"
        ? '<p>'+escapeHtml(data.textContent||"")+'</p>'
        : '<audio class="audio" controls preload="metadata" src="'+escapeAttr(api(data.audioUrl))+'"></audio>';
      const card = '<article class="shared-card">'+(photo?'<img class="shared-photo" src="'+escapeAttr(api(photo.url))+'" alt="Foto bij dit verhaal">':'')+'<div class="shared-copy"><h1>'+escapeHtml(title)+'</h1>'+(context?'<div class="review-label" style="margin-top:7px">'+escapeHtml(context)+'</div>':'')+content+'</div></article>';
      page({body:card});
    } catch {
      page({body:'<h1>Deze link werkt niet meer.</h1><p class="lead">Vraag de afzender om een nieuwe link.</p>'});
    }
  }

  function renderRecoverableError(message,retryFn) {
    page({
      body:'<h1>Dat lukte nog niet.</h1><div class="notice error" style="margin-top:18px">'+escapeHtml(message)+'</div>',
      bottom:'<button class="btn btn-primary" id="retry">Nog eens proberen</button>'
    });
    document.getElementById("retry").addEventListener("click",retryFn);
  }

  function chooseMimeType() {
    const types=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg;codecs=opus"];
    return types.find(t=>MediaRecorder.isTypeSupported?.(t))||"";
  }

  async function retry(fn,delays) {
    let last;
    for (const delay of delays) {
      if (delay) await new Promise(r=>setTimeout(r,delay));
      try { return await fn(); } catch (e) { last=e; }
    }
    throw last||new Error("Mislukt");
  }

  function stopRecorderSilently() {
    const rec=state.recorder; if(!rec)return;
    try{if(rec.voiceFrame)cancelAnimationFrame(rec.voiceFrame)}catch{}
    try{if(rec.mediaRecorder.state!=="inactive")rec.mediaRecorder.stop()}catch{}
    try{rec.stream.getTracks().forEach(t=>t.stop())}catch{}
    try{rec.audioContext.close()}catch{}
    state.recorder=null;
  }

  async function postEvent(eventName, values={}) {
    try {
      await fetch(api("/api/events"),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventName,storyId:values.storyId||null,shareId:values.shareId||null,sessionId,detail:values.detail||null}),keepalive:true});
    } catch {}
  }

  function saveWorkflow(value){try{localStorage.setItem("talera-workflow-v2",JSON.stringify(value))}catch{}}
  function loadWorkflow(){try{const raw=localStorage.getItem("talera-workflow-v2");if(!raw)return null;const v=JSON.parse(raw);return v?.storyId&&v?.manageToken?v:null}catch{return null}}
  function clearWorkflow(){try{localStorage.removeItem("talera-workflow-v2")}catch{}}

  function pendingDb() {
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open("talera-local-safety-v2",1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains("pending"))req.result.createObjectStore("pending")};
      req.onerror=()=>reject(req.error);req.onsuccess=()=>resolve(req.result);
    });
  }
  async function storePending(value) {
    const db=await pendingDb();
    await new Promise((resolve,reject)=>{const tx=db.transaction("pending","readwrite");tx.objectStore("pending").put(value,"latest");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
    db.close();
  }
  async function loadPending() {
    try{const db=await pendingDb();const value=await new Promise(resolve=>{const tx=db.transaction("pending","readonly");const g=tx.objectStore("pending").get("latest");g.onsuccess=()=>resolve(g.result||null);g.onerror=()=>resolve(null)});db.close();return value}catch{return null}
  }
  async function clearPending() {
    try{const db=await pendingDb();await new Promise(resolve=>{const tx=db.transaction("pending","readwrite");tx.objectStore("pending").delete("latest");tx.oncomplete=resolve;tx.onerror=resolve});db.close()}catch{}
  }
  function revokePhotoUrl(){if(state.startPhotoUrl){try{URL.revokeObjectURL(state.startPhotoUrl)}catch{}state.startPhotoUrl=""}}

  async function boot() {
    const path = BASE && location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) || "/" : location.pathname;
    const share = path.match(/^\/s\/([^/]+)$/);
    if (share) return renderSharedStory(decodeURIComponent(share[1]));
    const pending=await loadPending();
    if(pending){state.pendingStory=pending;state.startPhoto=pending.startPhoto||null;await uploadAndProcess();return}
    const workflow=loadWorkflow();
    if(workflow){await resumeWorkflow(workflow);return}
    renderEntry();
  }

  window.addEventListener("pagehide",()=>{if(state.phase!=="complete"&&state.recorder)stopRecorderSilently()},{once:true});
  boot();
})();
