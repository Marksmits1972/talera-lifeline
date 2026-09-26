import legacyWorker from './orb-app-v79-worker-timeline-publish.js';
import { handleCleanRebuildV2 } from './clean-rebuild-v2.js';
import { handleStoryLabFresh } from './storylab-fresh.js';
import { handleStoryLabClean } from './storylab-clean.js';
import { handleTVPlayer } from './tv-player.js';

const TIMELINE_ORIGIN = 'https://talera-timeline-prototype.mark-a39.workers.dev';
const PUBLISH_REVISION = 'storylab-clean-timeline-publish-20260923-video-r1';

function safeClient(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(value) ? value : null;
}

function cleanStoryState(input) {
  const source = input && typeof input === 'object' ? input : {};
  const photos = Array.isArray(source.photos) ? source.photos.slice(0, 12).map((photo) => ({
    id: String(photo?.id || ''),
    name: String(photo?.name || 'foto').slice(0, 180),
    type: String(photo?.type || 'image/jpeg').slice(0, 100),
    posterId: String(photo?.posterId || '').slice(0, 80),
    durationSeconds: Math.max(0, Math.min(86400, Number(photo?.durationSeconds || 0))),
    createdAt: Number(photo?.createdAt || Date.now())
  })).filter((photo) => /^[A-Za-z0-9_-]{8,80}$/.test(photo.id)) : [];
  return {
    title: String(source.title || '').trim().slice(0, 140),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(source.date || '')) ? String(source.date) : '',
    storyText: String(source.storyText || '').trim().slice(0, 20000),
    photos,
    audioId: /^[A-Za-z0-9_-]{8,80}$/.test(String(source.audioId || '')) ? String(source.audioId) : ''
  };
}

function stateKey(client) {
  return `storylab-clean/${client}/state.json`;
}

function photoKey(client, id) {
  return `storylab-clean/${client}/photos/${id}`;
}

function videoKey(client, id) {
  return `storylab-clean/${client}/videos/${id}`;
}

function audioKey(client, id) {
  return `storylab-clean/${client}/audio/${id}`;
}

function randomToken(bytes = 24) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  let text = '';
  for (const value of data) text += String.fromCharCode(value);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Text(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text || '')));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

function isFutureDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const candidate = Date.UTC(year, month - 1, day);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Number.isFinite(candidate) && candidate > today;
}

function fallbackTitle(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Mijn herinnering';
  const first = clean.match(/^(.{1,120}?)(?:[.!?](?:\s|$)|$)/);
  return String(first?.[1] || clean.slice(0, 120)).trim() || 'Mijn herinnering';
}

async function ensurePublishLinkTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS storylab_clean_timeline_links (
      client_id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      manage_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
}

async function handleCleanPublish(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/storylab-clean/publish') return null;
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  if (!env?.DB || !env?.MEDIA) return Response.json({ error: 'Opslagbinding ontbreekt.' }, { status: 503 });

  const client = safeClient(url.searchParams.get('client'));
  if (!client) return Response.json({ error: 'Deze vertelpagina kon niet veilig worden herkend.' }, { status: 400 });

  const object = await env.MEDIA.get(stateKey(client));
  if (!object) return Response.json({ error: 'Je verhaal is nog niet opgeslagen.' }, { status: 404 });

  let state;
  try { state = cleanStoryState(JSON.parse(await object.text())); }
  catch { return Response.json({ error: 'Je verhaal kon niet worden gelezen.' }, { status: 409 }); }

  if (!state.date) return Response.json({ error: 'Kies eerst wanneer deze herinnering was.' }, { status: 422 });
  if (isFutureDate(state.date)) return Response.json({ error: 'Een herinnering kan niet in de toekomst worden geplaatst.' }, { status: 422 });

  let audioHead = null;
  let storedAudioKey = '';
  if (state.audioId) {
    storedAudioKey = audioKey(client, state.audioId);
    try { audioHead = await env.MEDIA.head(storedAudioKey); } catch {}
    if (!audioHead || !Number(audioHead.size || 0)) {
      audioHead = null;
      storedAudioKey = '';
    }
  }

  if (!audioHead && !state.storyText) {
    return Response.json({ error: 'Vertel eerst je herinnering of voeg tekst toe.' }, { status: 422 });
  }

  const media = [];
  for (let index = 0; index < state.photos.length; index += 1) {
    const item = state.photos[index];
    const mediaType = String(item.type || '').toLowerCase().startsWith('video/') ? 'video' : 'image';
    const key = mediaType === 'video' ? videoKey(client, item.id) : photoKey(client, item.id);
    let head = null;
    try { head = await env.MEDIA.head(key); } catch {}
    if (!head || !Number(head.size || 0)) continue;
    media.push({
      key,
      mimeType: String(head.httpMetadata?.contentType || item.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg')),
      size: Number(head.size || 0),
      mediaType,
      order: index
    });
  }

  await ensurePublishLinkTable(env);
  const existing = await env.DB.prepare(`
    SELECT client_id, story_id, manage_token, created_at
    FROM storylab_clean_timeline_links
    WHERE client_id = ? LIMIT 1
  `).bind(client).first();

  let storyId = existing?.story_id || '';
  let manageToken = existing?.manage_token || '';
  let reused = false;
  if (storyId && manageToken) {
    const story = await env.DB.prepare(`SELECT id, status FROM stories WHERE id = ? LIMIT 1`).bind(storyId).first();
    reused = Boolean(story && story.status === 'active');
  }
  if (!reused) {
    storyId = randomToken(16);
    manageToken = randomToken(32);
  }

  const manageTokenHash = await sha256Text(manageToken);
  const now = new Date().toISOString();
  const createdAt = reused ? (existing?.created_at || now) : now;
  const title = state.title || fallbackTitle(state.storyText);
  const startPhotoKey = media.find((item) => item.mediaType === 'image')?.key || null;
  const audioMimeType = audioHead ? String(audioHead.httpMetadata?.contentType || 'application/octet-stream') : '';
  const audioSize = audioHead ? Number(audioHead.size || 0) : 0;
  const statements = [];

  if (reused) {
    statements.push(
      env.DB.prepare(`
        UPDATE stories
        SET audio_object_key = ?, audio_mime_type = ?, audio_size_bytes = ?, duration_seconds = NULL,
          display_name = NULL, manage_token_hash = ?, status = 'active', source_mode = 'storylab-clean',
          start_photo_key = ?, updated_at = ?, title = ?, event_time_text = ?, event_time_precision = 'gebruiker'
        WHERE id = ?
      `).bind(storedAudioKey, audioMimeType, audioSize, manageTokenHash, startPhotoKey, now, title, state.date, storyId),
      env.DB.prepare(`DELETE FROM story_texts WHERE story_id = ?`).bind(storyId),
      env.DB.prepare(`DELETE FROM story_media WHERE story_id = ?`).bind(storyId)
    );
  } else {
    statements.push(env.DB.prepare(`
      INSERT INTO stories (
        id, created_at, audio_object_key, audio_mime_type, audio_size_bytes,
        duration_seconds, display_name, manage_token_hash, status,
        source_mode, start_photo_key, updated_at, title, event_time_text, event_time_precision
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'active', 'storylab-clean', ?, ?, ?, ?, 'gebruiker')
    `).bind(storyId, createdAt, storedAudioKey, audioMimeType, audioSize, manageTokenHash, startPhotoKey, now, title, state.date));
  }

  statements.push(
    env.DB.prepare(`INSERT INTO story_texts (story_id, text_content) VALUES (?, ?)`).bind(storyId, state.storyText || '')
  );

  media.forEach((item, index) => {
    const mediaCreatedAt = new Date(Date.now() + index).toISOString();
    statements.push(env.DB.prepare(`
      INSERT INTO story_media (id, story_id, object_key, mime_type, size_bytes, media_type, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(randomToken(12), storyId, item.key, item.mimeType, item.size, item.mediaType, item.key === startPhotoKey ? 'start' : 'extra', mediaCreatedAt));
  });

  if (reused) {
    statements.push(env.DB.prepare(`
      UPDATE storylab_clean_timeline_links SET updated_at = ? WHERE client_id = ?
    `).bind(now, client));
  } else {
    statements.push(env.DB.prepare(`
      INSERT INTO storylab_clean_timeline_links (client_id, story_id, manage_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET story_id = excluded.story_id, manage_token = excluded.manage_token, updated_at = excluded.updated_at
    `).bind(client, storyId, manageToken, createdAt, now));
  }

  try {
    await env.DB.batch(statements);
  } catch (error) {
    console.error('[STORYLAB CLEAN] timeline publish failed', error);
    return Response.json({ error: 'Je verhaal is veilig bewaard, maar kon nog niet op de tijdlijn worden gezet.' }, { status: 500 });
  }

  const verify = await env.DB.prepare(`SELECT id, status, title, event_time_text FROM stories WHERE id = ? LIMIT 1`).bind(storyId).first();
  if (!verify || verify.status !== 'active') {
    return Response.json({ error: 'De tijdlijnkoppeling kon niet worden teruggecontroleerd.' }, { status: 500 });
  }

  const handoffUrl = `${TIMELINE_ORIGIN}/?handoff=1#story=${encodeURIComponent(storyId)}&token=${encodeURIComponent(manageToken)}`;
  return Response.json({ ok: true, storyId, manageToken, handoffUrl, reused, revision: PUBLISH_REVISION }, {
    headers: { 'cache-control': 'no-store, max-age=0' }
  });
}

const PUBLISH_STYLE = `<style id="talera-storylab-clean-publish-style">
.talera-publish-timeline{position:absolute;z-index:11;left:16px;right:72px;bottom:66px;height:40px;border:1px solid rgba(255,255,255,.32);border-radius:999px;background:rgba(247,244,239,.94);color:#173851;font:780 12.5px/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;box-shadow:0 7px 20px rgba(4,20,32,.14);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;transition:opacity .18s ease,transform .18s ease}
.screen.has-photo .talera-publish-timeline.ready{display:flex}.talera-publish-timeline:disabled{opacity:.72}.screen.sheet-open .talera-publish-timeline{opacity:0;pointer-events:none;transform:translateY(10px)}
@media(max-height:760px){.talera-publish-timeline{bottom:58px;height:36px;font-size:11.8px}}
</style>`;

const PUBLISH_BUTTON = `<button id="timelinePublish" class="talera-publish-timeline" type="button">Publiceer op tijdlijn</button>`;

const PUBLISH_SCRIPT = `<script id="talera-storylab-clean-publish-script">
(()=>{
  const REV='${PUBLISH_REVISION}';
  const btn=document.getElementById('timelinePublish');
  const screen=document.getElementById('screen');
  const storyText=document.getElementById('storyText');
  const title=document.getElementById('title');
  const dateInput=document.getElementById('dateInput');
  const voiceTitle=document.getElementById('photoVoiceTitle');
  if(!btn||!screen)return;
  const client=localStorage.getItem('talera.storylab.clean.client')||'';
  let busy=false;

  function notice(text){
    const el=document.getElementById('notice');
    if(!el)return;
    el.textContent=text;el.classList.add('show');
    clearTimeout(el.__taleraPublishTimer);
    el.__taleraPublishTimer=setTimeout(()=>el.classList.remove('show'),2600);
  }
  function stateUrl(){return '/api/storylab-clean/state?client='+encodeURIComponent(client)}
  async function currentState(){
    const res=await fetch(stateUrl(),{cache:'no-store'});
    if(!res.ok)throw new Error('Je verhaal kon niet worden geladen.');
    return res.json();
  }
  async function syncLatest(){
    const state=await currentState();
    state.title=String(title&&title.value||state.title||'').trim();
    state.date=String(dateInput&&dateInput.value||state.date||'');
    state.storyText=String(storyText&&storyText.value||state.storyText||'');
    const res=await fetch(stateUrl(),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(state),cache:'no-store'});
    if(!res.ok)throw new Error('Je laatste wijzigingen konden niet worden opgeslagen.');
    return res.json();
  }
  async function refreshReady(){
    if(!client)return;
    try{
      const state=await currentState();
      const ready=Boolean(String(state.audioId||'')||String(state.storyText||'').trim());
      btn.classList.toggle('ready',ready);
    }catch(e){}
  }
  async function publish(){
    if(busy)return;
    if(document.querySelector('.photo-mic.recording,.mic.recording')){notice('Stop eerst je opname.');return}
    if(!client){notice('Deze vertelpagina kon niet veilig worden herkend.');return}
    busy=true;btn.disabled=true;const old=btn.textContent;btn.textContent='Publiceren…';
    try{
      await syncLatest();
      const res=await fetch('/api/storylab-clean/publish?client='+encodeURIComponent(client),{method:'POST',cache:'no-store'});
      let data=null;try{data=await res.json()}catch(e){}
      if(!res.ok||!data?.ok||!data?.handoffUrl)throw new Error(data?.error||'Publiceren lukte nog niet.');
      btn.textContent='Openen…';
      location.href=data.handoffUrl;
    }catch(error){
      btn.textContent=old;btn.disabled=false;busy=false;notice(String(error?.message||error));
    }
  }
  btn.addEventListener('click',publish);
  if(storyText)storyText.addEventListener('input',()=>btn.classList.toggle('ready',Boolean(storyText.value.trim())||btn.classList.contains('ready')));
  if(voiceTitle)new MutationObserver(()=>{if(/Klaar|Vertel verder|Bewaard/i.test(voiceTitle.textContent||''))setTimeout(refreshReady,180)}).observe(voiceTitle,{childList:true,subtree:true,characterData:true});
  window.addEventListener('pageshow',refreshReady);
  refreshReady();
  console.log('[STORYLAB CLEAN]',REV,'publish bridge ready');
})();
</script>`;

async function decorateCleanStoryLabResponse(response, url) {
  if (url.pathname === '/api/storylab-clean/revision') {
    try {
      const data = await response.json();
      return Response.json({
        ...data,
        timelineEnabled: true,
        timelinePublishRevision: PUBLISH_REVISION,
        timelineHandoff: 'target-first-storyId+manageToken',
        transcriptEnabled: 'browser-if-available'
      }, { status: response.status, headers: { 'cache-control': 'no-store, max-age=0' } });
    } catch { return response; }
  }
  if (url.pathname !== '/storylab-clean' && url.pathname !== '/storylab-clean/') return response;
  if (response.status !== 200 || !(response.headers.get('content-type') || '').includes('text/html')) return response;
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-storylab-clean-publish', PUBLISH_REVISION);
  const withStyle = html.replace('</head>', PUBLISH_STYLE + '</head>');
  const withButton = withStyle.replace('</main>', PUBLISH_BUTTON + '</main>');
  return new Response(withButton.replace('</body>', PUBLISH_SCRIPT + '</body>'), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const tvResponse = await handleTVPlayer(request, env);
    if (tvResponse) return tvResponse;

    const publishResponse = await handleCleanPublish(request, env);
    if (publishResponse) return publishResponse;

    const cleanStoryLabResponse = await handleStoryLabClean(request, env);
    if (cleanStoryLabResponse) return decorateCleanStoryLabResponse(cleanStoryLabResponse, url);

    const storyLabResponse = await handleStoryLabFresh(request, env);
    if (storyLabResponse) return storyLabResponse;

    const cleanResponse = await handleCleanRebuildV2(request, env);
    if (cleanResponse) return cleanResponse;

    return legacyWorker.fetch(request, env, ctx);
  }
};
