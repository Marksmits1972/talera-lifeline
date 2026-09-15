export const WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT = String.raw`<script id="talera-workblad-v9-timeline-handoff">
(() => {
  const REV = 'workblad-v9-timeline-handoff-20260914-r2';
  let publishing = false;
  let publishedMemoryId = '';
  let timer = 0;

  function statusBox() {
    return document.getElementById('talera-v9-bridge-status');
  }

  function setStatus(text, mode='') {
    const box = statusBox();
    if (!box) return;
    box.textContent = text;
    box.style.background = mode === 'bad' ? '#fbe9e6' : mode === 'ok' ? '#e8f3ed' : '#eef4f7';
    box.style.color = mode === 'bad' ? '#923d35' : mode === 'ok' ? '#2c684e' : '#17385e';
  }

  function setFinishLabel(text) {
    const btn = document.getElementById('workFinish');
    if (btn) btn.textContent = text;
  }

  function addRetry(memoryId) {
    const box = statusBox();
    if (!box) return;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.id = 'taleraTimelinePublishRetry';
    retry.textContent = 'Probeer tijdlijnkoppeling opnieuw';
    retry.style.cssText = 'display:block;width:100%;margin-top:10px;border:0;border-radius:14px;padding:12px 14px;background:#0f2f57;color:white;font:800 14px -apple-system,BlinkMacSystemFont,system-ui,sans-serif;';
    retry.addEventListener('click', e => {
      e.preventDefault();
      retry.remove();
      publishing = false;
      publish(memoryId);
    });
    box.appendChild(retry);
  }

  function goToTimeline(handoffUrl) {
    if (!handoffUrl) return;
    location.href = handoffUrl;
  }

  async function attachExtraPhotos(data) {
    const queue = Array.isArray(window.__taleraPendingV9Photos) ? window.__taleraPendingV9Photos : [];
    const expected = Number(window.__taleraExpectedV9PhotoCount || 0);
    while (queue.length) {
      const photo = queue[0];
      setStatus('Laatste stap · foto ' + (expected - queue.length + 1) + ' van ' + expected + ' wordt aan je verhaal gekoppeld…');
      const form = new FormData();
      form.append('media', photo, photo.name || 'herinnering.jpg');
      const response = await fetch('/api/stories/' + encodeURIComponent(data.storyId) + '/media', {
        method:'POST',
        headers:{'authorization':'Bearer ' + data.manageToken},
        body:form,
        cache:'no-store'
      });
      let result = null;
      try { result = await response.json(); } catch {}
      const stored = Array.isArray(result?.items) ? result.items.length : Number(result?.count);
      if (!response.ok || stored !== 1) throw new Error(result?.error || 'Een extra foto kon niet veilig worden gekoppeld.');
      queue.shift();
    }
    if (expected > 0) {
      const verify = await fetch('/api/integration/stories/' + encodeURIComponent(data.storyId), {
        headers:{'authorization':'Bearer ' + data.manageToken},
        cache:'no-store'
      });
      let detail = null;
      try { detail = await verify.json(); } catch {}
      const count = Array.isArray(detail?.media) ? detail.media.filter(item => item.mediaType === 'image').length : 0;
      if (!verify.ok || count < expected) throw new Error('Nog niet alle gekozen foto’s staan in het verhaal.');
    }
  }

  async function publish(memoryId) {
    if (!memoryId || publishing || publishedMemoryId === memoryId) return;
    publishing = true;
    clearTimeout(timer);
    setFinishLabel('Koppelen aan tijdlijn…');
    setStatus('Laatste stap · je herinnering wordt aan de tijdlijn gekoppeld…');
    try {
      const res = await fetch('/api/v9/timeline-publish/' + encodeURIComponent(memoryId), {
        method:'POST',
        cache:'no-store'
      });
      let data = null;
      try { data = await res.json(); } catch {}
      if (!res.ok || !data?.ok || !data?.storyId || !data?.manageToken || !data?.handoffUrl) {
        throw new Error(data?.error || ('HTTP ' + res.status));
      }

      await attachExtraPhotos(data);

      publishedMemoryId = memoryId;
      window.__taleraPendingV9Photos = [];
      try {
        localStorage.setItem('talera-last-v9-timeline-handoff-v1', JSON.stringify({
          memoryId,
          storyId:data.storyId,
          manageToken:data.manageToken,
          handoffUrl:data.handoffUrl,
          savedAt:Date.now()
        }));
      } catch {}

      setFinishLabel('Gekoppeld aan mijn tijdlijn');
      setStatus('✓ Veilig opgeslagen én aan je tijdlijn gekoppeld.', 'ok');
      timer = setTimeout(() => goToTimeline(data.handoffUrl), 1100);
      console.log('[TALERA V9 TIMELINE]', 'published', {revision:REV, memoryId, storyId:data.storyId, reused:Boolean(data.reused)});
    } catch (error) {
      setFinishLabel('Veilig opgeslagen');
      setStatus('Je herinnering is veilig opgeslagen, maar de koppeling met de tijdlijn lukte nog niet: ' + String(error?.message || error), 'bad');
      addRetry(memoryId);
      console.warn('[TALERA V9 TIMELINE]', 'publish failed', error);
    } finally {
      publishing = false;
    }
  }

  function check() {
    const id = String(window.__taleraLastV9MemoryId || '');
    if (id && id !== publishedMemoryId) publish(id);
  }

  const interval = setInterval(check, 220);
  window.addEventListener('pagehide', () => clearInterval(interval), {once:true});
  window.addEventListener('pageshow', check);
  check();
})();
</script>`;
