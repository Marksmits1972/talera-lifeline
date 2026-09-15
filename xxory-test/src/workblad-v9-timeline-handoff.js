export const WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT = String.raw`<script id="talera-workblad-v9-timeline-handoff">
(() => {
  const REV = 'workblad-v9-direct-timeline-handoff-20260915-r1';
  const TIMELINE_ORIGIN = 'https://talera-timeline-prototype.mark-a39.workers.dev/';
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

  function editContext() {
    const q = new URLSearchParams(location.search);
    const storyId = q.get('edit') || '';
    if (!storyId) return null;
    const h = new URLSearchParams(String(location.hash || '').replace(/^#/,''));
    let token = h.get('token') || '';
    if (storyId && token) try { sessionStorage.setItem('talera-edit-token:' + storyId, token); } catch {}
    if (storyId && !token) try { token = sessionStorage.getItem('talera-edit-token:' + storyId) || ''; } catch {}
    return storyId && token ? { storyId, token } : null;
  }

  function timelineUrl(storyId, token) {
    return TIMELINE_ORIGIN + '?handoff=1#story=' + encodeURIComponent(storyId) + '&token=' + encodeURIComponent(token);
  }

  async function resetPublishedWorkblad(renderFresh=false) {
    try {
      if (typeof window.__taleraWorkbladV9ResetAfterPublish === 'function') {
        await window.__taleraWorkbladV9ResetAfterPublish(Boolean(renderFresh));
      }
    } catch (error) {
      console.warn('[TALERA V9 TIMELINE]', 'published workblad reset failed', error);
    }
  }

  async function goToTimeline(handoffUrl) {
    if (!handoffUrl) return;
    await resetPublishedWorkblad(false);
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
    setFinishLabel('Koppelen aan mijn tijdlijn…');
    setStatus('Je herinnering wordt op de juiste plek in je tijdlijn gezet…');
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
      window.__taleraExpectedV9PhotoCount = 0;
      try {
        localStorage.setItem('talera-last-v9-timeline-handoff-v1', JSON.stringify({
          memoryId,
          storyId:data.storyId,
          manageToken:data.manageToken,
          handoffUrl:data.handoffUrl,
          savedAt:Date.now()
        }));
      } catch {}

      setStatus('Je herinnering staat klaar. We openen precies dit verhaal…');
      console.log('[TALERA V9 TIMELINE]', 'published and opening target', {revision:REV, memoryId, storyId:data.storyId, reused:Boolean(data.reused)});
      await goToTimeline(data.handoffUrl);
    } catch (error) {
      setFinishLabel('Koppelen aan mijn tijdlijn');
      setStatus('Je herinnering is veilig opgeslagen, maar de tijdlijnkoppeling lukte nog niet. Tik nogmaals op Koppelen om alleen die laatste stap opnieuw te proberen: ' + String(error?.message || error), 'bad');
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

  async function runEditAndReturn(event, btn, context) {
    if (!btn || btn.dataset.v9EditReturning === '1') return;
    const originalHandler = btn.onclick;
    if (typeof originalHandler !== 'function') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    btn.dataset.v9EditReturning = '1';
    btn.disabled = true;
    btn.textContent = 'Opslaan…';
    try {
      await originalHandler.call(btn);
      if (document.querySelector('.work-saved-sheet')) {
        location.href = timelineUrl(context.storyId, context.token);
        return;
      }
    } catch (error) {
      console.warn('[TALERA V9 TIMELINE]', 'edit save failed', error);
    }
    btn.dataset.v9EditReturning = '0';
    btn.disabled = false;
  }

  function onFinishClick(event) {
    const btn = event.currentTarget;
    const context = editContext();
    if (context) {
      runEditAndReturn(event, btn, context);
      return;
    }

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
    btn.textContent = editContext() ? 'Naar presentatie' : 'Koppelen aan mijn tijdlijn';
    btn.addEventListener('click', onFinishClick, true);
  }

  document.addEventListener('talera:v9-memory-saved', event => {
    const memoryId = String(event.detail?.memoryId || '');
    armManualHandoff(memoryId);
    // De gebruiker heeft zojuist bewust op Koppelen gedrukt. Na bewezen opslag
    // gaat dezelfde handeling daarom direct door met publiceren en openen.
    publish(memoryId);
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && publishedMemoryId) {
      publishedMemoryId = '';
      publishedHandoffUrl = '';
      readyMemoryId = '';
      window.__taleraLastV9MemoryId = '';
      resetPublishedWorkblad(true);
      return;
    }
    armManualHandoff();
  });
  armButton();
  new MutationObserver(armButton).observe(document.documentElement, {subtree:true, childList:true});
})();
</script>`;
