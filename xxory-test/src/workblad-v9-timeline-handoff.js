export const WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT = String.raw`<script id="talera-workblad-v9-timeline-handoff">
(() => {
  const REV = 'workblad-v9-manual-timeline-handoff-20260915-r3';
  let publishing = false;
  let readyMemoryId = '';
  let publishedMemoryId = '';
  let publishedHandoffUrl = '';

  function ensureProgressStyles() {
    if (document.getElementById('talera-v9-progress-styles')) return;
    const style = document.createElement('style');
    style.id = 'talera-v9-progress-styles';
    style.textContent = '@keyframes taleraV9Spin{to{transform:rotate(360deg)}}.talera-v9-spinner{display:inline-block;flex:0 0 auto;width:20px;height:20px;border:3px solid rgba(23,56,94,.22);border-top-color:#17385e;border-radius:50%;animation:taleraV9Spin .8s linear infinite}.talera-v9-status-text{min-width:0}';
    document.head.appendChild(style);
  }

  function statusBox() {
    return document.getElementById('talera-v9-bridge-status');
  }

  function setStatus(text, mode='busy') {
    const box = statusBox();
    if (!box) return;
    ensureProgressStyles();
    box.replaceChildren();
    if (mode === 'busy') {
      const spinner = document.createElement('span');
      spinner.className = 'talera-v9-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      box.appendChild(spinner);
    }
    const label = document.createElement('span');
    label.className = 'talera-v9-status-text';
    label.textContent = text;
    box.appendChild(label);
    box.style.background = mode === 'bad' ? '#fbe9e6' : mode === 'ok' ? '#e8f3ed' : '#eef4f7';
    box.style.color = mode === 'bad' ? '#923d35' : mode === 'ok' ? '#2c684e' : '#17385e';
  }

  function setFinishLabel(text) {
    const btn = document.getElementById('workFinish');
    if (btn) btn.textContent = text;
  }

  function setFinishDisabled(disabled) {
    const btn = document.getElementById('workFinish');
    if (btn) btn.disabled = Boolean(disabled);
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
    setFinishDisabled(true);
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
      publishedHandoffUrl = data.handoffUrl;
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

      setFinishLabel('Open mijn tijdlijn');
      setStatus('✓ Veilig opgeslagen én gekoppeld. Open nu zelf je tijdlijn.', 'ok');
      console.log('[TALERA V9 TIMELINE]', 'published', {revision:REV, memoryId, storyId:data.storyId, reused:Boolean(data.reused)});
    } catch (error) {
      setFinishLabel('Koppelen aan mijn tijdlijn');
      setStatus('Je herinnering is veilig opgeslagen, maar de koppeling met de tijdlijn lukte nog niet: ' + String(error?.message || error), 'bad');
      addRetry(memoryId);
      console.warn('[TALERA V9 TIMELINE]', 'publish failed', error);
    } finally {
      publishing = false;
      setFinishDisabled(false);
    }
  }

  function armManualHandoff(memoryId) {
    const id = String(memoryId || window.__taleraLastV9MemoryId || '');
    if (!id || publishedMemoryId === id) return;
    readyMemoryId = id;
    setFinishLabel('Koppelen aan mijn tijdlijn');
    setFinishDisabled(false);
  }

  function onFinishClick(event) {
    const memoryId = String(readyMemoryId || window.__taleraLastV9MemoryId || '');
    if (!memoryId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (publishedMemoryId === memoryId && publishedHandoffUrl) {
      goToTimeline(publishedHandoffUrl);
      return;
    }
    publish(memoryId);
  }

  function armButton() {
    const btn = document.getElementById('workFinish');
    if (!btn || btn.dataset.v9TimelineArmed === '1') return;
    btn.dataset.v9TimelineArmed = '1';
    btn.addEventListener('click', onFinishClick, true);
  }

  document.addEventListener('talera:v9-memory-saved', event => armManualHandoff(event.detail?.memoryId));
  window.addEventListener('pageshow', () => armManualHandoff());
  armButton();
  new MutationObserver(armButton).observe(document.documentElement, {subtree:true, childList:true});
})();
</script>`;
