export const WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT = String.raw`<script id="talera-workblad-v9-integration-bridge">
(() => {
  const REV = 'workblad-v9-bridge-20260914';
  const originalFetch = window.fetch.bind(window);
  const log = (...args) => console.log('[TALERA V9 BRIDGE]', ...args);

  function byText(selector, matcher) {
    return Array.from(document.querySelectorAll(selector)).find(el => matcher((el.textContent || '').trim())) || null;
  }

  function first(...values) { return values.find(Boolean) || null; }

  function findTitle() {
    return first(
      document.querySelector('[data-workblad-title]'),
      document.querySelector('input[name="title"]'),
      document.querySelector('#title'),
      document.querySelector('input[placeholder*="titel" i]')
    );
  }

  function findDate() {
    return first(
      document.querySelector('[data-workblad-date]'),
      document.querySelector('input[name="eventTime"]'),
      document.querySelector('input[name="date"]'),
      document.querySelector('#date'),
      document.querySelector('input[placeholder*="zomer" i]'),
      document.querySelector('input[placeholder*="datum" i]')
    );
  }

  function findStory() {
    return first(
      document.querySelector('[data-workblad-story]'),
      document.querySelector('textarea[name="story"]'),
      document.querySelector('#story'),
      document.querySelector('textarea')
    );
  }

  function findPhotoInput() {
    return first(
      document.querySelector('input[type="file"][accept*="image"]'),
      document.querySelector('input[type="file"]')
    );
  }

  function findSaveButton() {
    return first(
      document.querySelector('[data-save-to-timeline]'),
      byText('button', t => /op mijn tijdlijn/i.test(t)),
      byText('button', t => /tijdlijn/i.test(t) && /op/i.test(t))
    );
  }

  function findStatusHost() {
    return first(
      document.querySelector('[data-workblad-save-status]'),
      document.querySelector('.save-status'),
      document.querySelector('.server-error'),
      document.querySelector('.spoken-story-card')?.parentElement,
      findSaveButton()?.parentElement
    );
  }

  function statusBox() {
    let box = document.querySelector('#talera-v9-bridge-status');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'talera-v9-bridge-status';
    box.style.cssText = 'margin:12px 0;padding:12px 14px;border-radius:16px;font:700 14px/1.35 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:#eef4f7;color:#17385e;';
    const host = findStatusHost();
    if (host) host.appendChild(box); else document.body.appendChild(box);
    return box;
  }

  function setStatus(text, mode='') {
    const box = statusBox();
    box.textContent = text;
    box.style.background = mode === 'bad' ? '#fbe9e6' : mode === 'ok' ? '#e8f3ed' : '#eef4f7';
    box.style.color = mode === 'bad' ? '#923d35' : mode === 'ok' ? '#2c684e' : '#17385e';
  }

  async function sha256(blob) {
    const bytes = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
  }

  async function jsonFetch(url, options) {
    const res = await originalFetch(url, { cache: 'no-store', ...options });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok || !data?.ok) throw new Error(data?.error || ('HTTP ' + res.status));
    return data;
  }

  function getFreshAudioBlob() {
    const candidates = [
      window.__taleraLastAudioBlob,
      window.__taleraAudioBlob,
      window.__workbladAudioBlob,
      window.__taleraRecorderBlob,
      window.__taleraWorkbladState?.audioBlob,
      window.__taleraWorkblad?.audioBlob
    ];
    for (const item of candidates) if (item instanceof Blob && item.size > 0) return item;
    return null;
  }

  function discoverAudioBlobFromObjectUrl() {
    const audio = document.querySelector('audio[src^="blob:"]');
    if (!audio?.src) return null;
    return fetch(audio.src).then(r => r.blob()).then(b => b.size ? b : null).catch(() => null);
  }

  async function getAudioBlob() {
    return getFreshAudioBlob() || await discoverAudioBlobFromObjectUrl();
  }

  async function uploadAudio(blob) {
    setStatus('Stap 1/4 · audio exact bewijzen…');
    const localSha = await sha256(blob);
    const form = new FormData();
    const type = String(blob.type || 'application/octet-stream');
    const name = /mp4|m4a/i.test(type) ? 'talera.m4a' : /ogg/i.test(type) ? 'talera.ogg' : /mpeg|mp3/i.test(type) ? 'talera.mp3' : 'talera.webm';
    form.append('audio', blob, name);
    const data = await jsonFetch('/api/v9/audio', { method: 'POST', body: form });

    const head = await originalFetch(data.playbackUrl, { method:'HEAD', cache:'no-store' });
    if (!head.ok) throw new Error('Serveraudio HEAD mislukt');
    const get = await originalFetch(data.playbackUrl, { cache:'no-store' });
    if (!get.ok) throw new Error('Serveraudio terughalen mislukt');
    const serverBlob = await get.blob();
    const serverSha = await sha256(serverBlob);
    const headBytes = Number(head.headers.get('content-length') || 0);
    const headSha = head.headers.get('x-talera-sha256') || '';
    const sameBytes = serverBlob.size === blob.size && headBytes === blob.size && Number(data.storedBytes) === blob.size;
    const sameHash = localSha === serverSha && localSha === data.sha256 && (!headSha || headSha === localSha);
    if (!sameBytes || !sameHash) throw new Error('Audio kwam niet byte/hash-gelijk terug');
    return data;
  }

  async function uploadPhoto(file) {
    if (!(file instanceof File) || !file.size) return null;
    setStatus('Stap 2/4 · foto apart bewijzen…');
    const localSha = await sha256(file);
    const form = new FormData();
    form.append('photo', file, file.name || 'foto.jpg');
    const data = await jsonFetch('/api/v9/photo', { method:'POST', body: form });
    const get = await originalFetch(data.playbackUrl, { cache:'no-store' });
    if (!get.ok) throw new Error('Serverfoto terughalen mislukt');
    const serverBlob = await get.blob();
    const serverSha = await sha256(serverBlob);
    if (serverBlob.size !== file.size || serverSha !== localSha || data.sha256 !== localSha) throw new Error('Foto kwam niet byte/hash-gelijk terug');
    return data;
  }

  async function saveMemory(audioData, photoData) {
    setStatus('Stap 3/4 · gegevens koppelen…');
    const title = String(findTitle()?.value || findTitle()?.textContent || '').trim();
    const eventTime = String(findDate()?.value || findDate()?.textContent || '').trim();
    const storyText = String(findStory()?.value || findStory()?.textContent || '').trim();
    if (!title) throw new Error('Titel ontbreekt');
    if (!eventTime) throw new Error('Datum/periode ontbreekt');
    return jsonFetch('/api/v9/memory', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ title, eventTime, storyText, audioId:audioData.id, photoId:photoData?.id || null })
    });
  }

  async function verifyMemory(memory) {
    setStatus('Stap 4/4 · herinnering terugcontroleren…');
    const data = await jsonFetch('/api/v9/memory/' + encodeURIComponent(memory.memoryId), { method:'GET' });
    if (!data?.memory?.id || data.memory.id !== memory.memoryId) throw new Error('Herinnering kon niet worden teruggelezen');
    return data;
  }

  async function runV9Save(ev) {
    ev?.preventDefault?.();
    ev?.stopImmediatePropagation?.();
    const btn = findSaveButton();
    if (!btn || btn.dataset.v9Busy === '1') return;
    btn.dataset.v9Busy = '1';
    btn.disabled = true;
    try {
      const audio = await getAudioBlob();
      if (!(audio instanceof Blob) || !audio.size) throw new Error('Geen verse opname gevonden. Spreek eerst opnieuw in.');
      const photo = findPhotoInput()?.files?.[0] || null;
      const audioData = await uploadAudio(audio);
      const photoData = await uploadPhoto(photo);
      const memory = await saveMemory(audioData, photoData);
      await verifyMemory(memory);
      window.__taleraLastV9MemoryId = memory.memoryId;
      setStatus('✓ Veilig opgeslagen via de bewezen v9-motor. Herinnering-ID: ' + memory.memoryId, 'ok');
      btn.textContent = 'Opgeslagen op mijn tijdlijn';
      log('complete memory saved', memory);
    } catch (error) {
      setStatus('Opslaan mislukt: ' + String(error?.message || error), 'bad');
      log('save failed', error);
    } finally {
      btn.disabled = false;
      btn.dataset.v9Busy = '0';
    }
  }

  function arm() {
    const btn = findSaveButton();
    if (!btn) return false;
    if (btn.dataset.v9BridgeArmed === '1') return true;
    btn.dataset.v9BridgeArmed = '1';
    btn.addEventListener('click', runV9Save, true);
    log('bridge armed', {revision:REV});
    return true;
  }

  if (!arm()) {
    const observer = new MutationObserver(() => { if (arm()) observer.disconnect(); });
    observer.observe(document.documentElement, {subtree:true, childList:true});
    setTimeout(() => observer.disconnect(), 15000);
  }
})();
</script>`;
