export const WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT = String.raw`<script id="talera-workblad-v9-timeline-handoff">
(() => {
  const REV = 'workblad-v9-timeline-handoff-20260914-r1';
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

  function replaceFinishButton(text, onClick) {
    const old = document.getElementById('workFinish');
    if (!old) return null;
    const btn = old.cloneNode(true);
    btn.disabled = false;
    btn.textContent = text;
    btn.removeAttribute('data-v9-busy');
    btn.removeAttribute('data-v9-saved');
    btn.removeAttribute('data-v9-bridge-armed');
    old.replaceWith(btn);
    if (onClick) btn.addEventListener('click', onClick);
    return btn;
  }

  function goToTimeline(handoffUrl) {
    if (!handoffUrl) return;
    location.href = handoffUrl;
  }

  async function publish(memoryId) {
    if (!memoryId || publishing || publishedMemoryId === memoryId) return;
    publishing = true;
    clearTimeout(timer);
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

      publishedMemoryId = memoryId;
      try {
        localStorage.setItem('talera-last-v9-timeline-handoff-v1', JSON.stringify({
          memoryId,
          storyId:data.storyId,
          manageToken:data.manageToken,
          handoffUrl:data.handoffUrl,
          savedAt:Date.now()
        }));
      } catch {}

      setStatus('✓ Veilig opgeslagen én aan je tijdlijn gekoppeld.', 'ok');
      replaceFinishButton('Naar mijn tijdlijn', e => {
        e.preventDefault();
        goToTimeline(data.handoffUrl);
      });
      timer = setTimeout(() => goToTimeline(data.handoffUrl), 1100);
      console.log('[TALERA V9 TIMELINE]', 'published', {revision:REV, memoryId, storyId:data.storyId, reused:Boolean(data.reused)});
    } catch (error) {
      setStatus('Je herinnering is veilig opgeslagen, maar de koppeling met de tijdlijn lukte nog niet: ' + String(error?.message || error), 'bad');
      replaceFinishButton('Probeer tijdlijnkoppeling opnieuw', e => {
        e.preventDefault();
        publishing = false;
        publish(memoryId);
      });
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
