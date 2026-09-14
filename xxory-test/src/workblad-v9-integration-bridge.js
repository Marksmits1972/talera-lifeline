export const WORKBLAD_V9_INTEGRATION_BRIDGE_SCRIPT = String.raw`<script id="talera-workblad-v9-integration-bridge">
(() => {
  const REV = 'workblad-v9-bridge-20260914-r3';
  const DB_NAME = 'talera-workblad-v2';
  const STORE = 'drafts';
  const originalFetch = window.fetch.bind(window);
  const log = (...args) => console.log('[TALERA V9 BRIDGE]', ...args);
  const $ = id => document.getElementById(id);
  const findSaveButton = () => $('workFinish');

  function statusBox() {
    let box = $('talera-v9-bridge-status');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'talera-v9-bridge-status';
    box.style.cssText = 'margin:12px 0;padding:12px 14px;border-radius:16px;font:700 14px/1.35 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:#eef4f7;color:#17385e;';
    const sheet = document.querySelector('.work-sheet');
    const tools = document.querySelector('.work-tools');
    if (sheet && tools) sheet.insertBefore(box, tools);
    else (findSaveButton()?.parentElement || document.body).appendChild(box);
    return box;
  }

  function setStatus(text, mode='') {
    const box = statusBox();
    box.textContent = text;
    box.style.background = mode === 'bad' ? '#fbe9e6' : mode === 'ok' ? '#e8f3ed' : '#eef4f7';
    box.style.color = mode === 'bad' ? '#923d35' : mode === 'ok' ? '#2c684e' : '#17385e';
  }

  function readCurrentWorkblad() {
    if (typeof window.__taleraWorkbladV9Read !== 'function') throw new Error('De werkblad-koppeling is nog niet geladen. Herlaad deze pagina één keer.');
    const snapshot = window.__taleraWorkbladV9Read();
    if (!snapshot || typeof snapshot !== 'object') throw new Error('Het huidige werkblad kon niet worden uitgelezen.');
    return snapshot;
  }

  function openDraftDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Conceptopslag kon niet worden geopend'));
    });
  }

  async function clearDraft() {
    try {
      const db = await openDraftDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.objectStore(STORE).delete('current');
      });
      db.close();
    } catch {}
    try { localStorage.removeItem('talera-workblad-text-v2'); } catch {}
  }

  async function sha256(blob) {
    const bytes = await blob.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength !== blob.size) throw new Error('Lokale bytes konden niet volledig worden gelezen');
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
  }

  async function jsonFetch(url, options) {
    const res = await originalFetch(url, { cache:'no-store', ...options });
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok || !data?.ok) throw new Error(data?.error || ('HTTP ' + res.status));
    return data;
  }

  async function uploadAudio(blob) {
    setStatus('Stap 1/4 · je stem wordt exact gecontroleerd…');
    const localSha = await sha256(blob);
    const type = String(blob.type || 'application/octet-stream');
    const name = /mp4|m4a/i.test(type) ? 'verhaal.m4a' : /ogg/i.test(type) ? 'verhaal.ogg' : /mpeg|mp3/i.test(type) ? 'verhaal.mp3' : 'verhaal.webm';
    const form = new FormData();
    form.append('audio', blob, name);
    const data = await jsonFetch('/api/v9/audio', { method:'POST', body:form });
    const head = await originalFetch(data.playbackUrl, { method:'HEAD', cache:'no-store' });
    if (!head.ok) throw new Error('Serveraudio kon niet worden gecontroleerd');
    const get = await originalFetch(data.playbackUrl, { cache:'no-store' });
    if (!get.ok) throw new Error('Serveraudio kon niet worden teruggehaald');
    const serverBlob = await get.blob();
    const serverSha = await sha256(serverBlob);
    const headBytes = Number(head.headers.get('content-length') || 0);
    const headSha = head.headers.get('x-talera-sha256') || '';
    const sameBytes = serverBlob.size === blob.size && headBytes === blob.size && Number(data.storedBytes) === blob.size;
    const sameHash = localSha === serverSha && localSha === data.sha256 && (!headSha || headSha === localSha);
    if (!sameBytes || !sameHash) throw new Error('Audio kwam niet exact byte/hash-gelijk terug');
    return data;
  }

  async function uploadPhoto(blob) {
    if (!(blob instanceof Blob) || !blob.size) return null;
    setStatus('Stap 2/4 · je foto wordt apart gecontroleerd…');
    const localSha = await sha256(blob);
    const type = String(blob.type || 'image/jpeg');
    const name = blob.name || (/png/i.test(type) ? 'herinnering.png' : /heic|heif/i.test(type) ? 'herinnering.heic' : 'herinnering.jpg');
    const form = new FormData();
    form.append('photo', blob, name);
    const data = await jsonFetch('/api/v9/photo', { method:'POST', body:form });
    const get = await originalFetch(data.playbackUrl, { cache:'no-store' });
    if (!get.ok) throw new Error('Serverfoto kon niet worden teruggehaald');
    const serverBlob = await get.blob();
    const serverSha = await sha256(serverBlob);
    if (serverBlob.size !== blob.size || serverSha !== localSha || data.sha256 !== localSha) throw new Error('Foto kwam niet exact byte/hash-gelijk terug');
    return data;
  }

  async function saveMemory(audioData, photoData, snapshot) {
    setStatus('Stap 3/4 · titel, datum en verhaal worden gekoppeld…');
    const title = String(snapshot.title || '').trim();
    const eventTime = String(snapshot.eventTime || '').trim();
    const storyText = String(snapshot.storyText || '').trim();
    if (!title) throw new Error('Vul eerst een titel in');
    if (!eventTime) throw new Error('Kies eerst wanneer dit verhaal speelde');
    return jsonFetch('/api/v9/memory', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({ title, eventTime, storyText, audioId:audioData.id, photoId:photoData?.id || null })
    });
  }

  async function verifyMemory(memory) {
    setStatus('Stap 4/4 · de complete herinnering wordt teruggelezen…');
    const data = await jsonFetch('/api/v9/memory/' + encodeURIComponent(memory.memoryId), { method:'GET' });
    if (!data?.memory?.id || data.memory.id !== memory.memoryId) throw new Error('Herinnering kon niet worden teruggelezen');
    return data;
  }

  async function runV9Save(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const btn = findSaveButton();
    if (!btn || btn.dataset.v9Busy === '1' || btn.dataset.v9Saved === '1') return;
    btn.dataset.v9Busy = '1';
    btn.disabled = true;
    let saved = false;
    try {
      const snapshot = readCurrentWorkblad();
      const audio = snapshot.audioBlob;
      const photos = Array.isArray(snapshot.photos) ? snapshot.photos.filter(x => x instanceof Blob && x.size > 0) : [];
      if (!(audio instanceof Blob) || !audio.size) throw new Error('Geen geluidsopname gevonden in het huidige werkblad. Spreek eerst opnieuw in.');
      if (photos.length > 1) log('Voor deze eerste geïntegreerde proef wordt alleen de eerste foto gekoppeld', {photoCount:photos.length});
      log('current workblad read', {audioBytes:audio.size, photoCount:photos.length, title:snapshot.title, eventTime:snapshot.eventTime});

      const audioData = await uploadAudio(audio);
      const photoData = await uploadPhoto(photos[0] || snapshot.photoFile || null);
      const memory = await saveMemory(audioData, photoData, snapshot);
      await verifyMemory(memory);
      await clearDraft();

      window.__taleraLastV9MemoryId = memory.memoryId;
      setStatus('✓ Complete herinnering veilig bevestigd via de bewezen v9-motor.', 'ok');
      btn.textContent = 'Veilig opgeslagen';
      btn.dataset.v9Saved = '1';
      saved = true;
      log('complete memory saved', memory);
    } catch (error) {
      setStatus('Opslaan mislukt: ' + String(error?.message || error), 'bad');
      log('save failed', error);
    } finally {
      btn.dataset.v9Busy = '0';
      btn.disabled = saved;
    }
  }

  function arm() {
    const btn = findSaveButton();
    if (!btn || btn.dataset.v9BridgeArmed === '1') return;
    btn.dataset.v9BridgeArmed = '1';
    btn.addEventListener('click', runV9Save, true);
    log('bridge armed', {revision:REV});
  }

  arm();
  const observer = new MutationObserver(arm);
  observer.observe(document.documentElement, {subtree:true, childList:true});
})();
</script>`;
