import baseWorker from './orb-app-v79-worker.js';
import { handleV9TimelinePublish } from './workblad-v9-timeline-publish.js';
import { handleV9StagedPhotoLink } from './workblad-v9-staged-photo-link.js';
import { handleV9TextMemory } from './workblad-v9-text-memory.js';
import { handleWorkbladDatePolicy } from './workblad-date-policy.js';
import { WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT } from './workblad-v9-timeline-handoff.js';
import { handleStoryPhotoCleanup } from './workblad-story-photo-cleanup.js';
import { handleStoryManagement, WORKBLAD_STORY_MANAGEMENT_SCRIPT } from './workblad-story-management.js';
import { WORKBLAD_MANAGEMENT_COMPAT_SCRIPT } from './workblad-management-compat.js';
import { handleSharePreviewStorage } from './share-preview-storage.js';
import {
  WORKBLAD_STORYTELLING_PAGE_REV,
  WORKBLAD_STORYTELLING_PAGE_STYLE,
  WORKBLAD_STORYTELLING_PAGE_SCRIPT
} from './workblad-storytelling-page.js';

const WRAPPER_REV = 'workblad-storytelling-shell-20260916-r1';
const ENGINE_MARKER = 'window.__taleraWorkbladV9SetDate=function(value){';
const STORYTELLING_ENGINE_PATCH =
  "window.__taleraStorytellingActions=Object.freeze({" +
    "snapshot:function(){capture();ensure();return {" +
      "audioBlob:(state.audioBlob instanceof Blob&&state.audioBlob.size)?state.audioBlob:null," +
      "hasExistingAudio:Boolean(state.hasExistingAudio)," +
      "duration:Number(state.duration)||0," +
      "voiceAttempted:Boolean(state.voiceAttempted)," +
      "title:String(state.workTitle||'')," +
      "eventTime:String(state.workDate||'')," +
      "storyText:String(state.workText||'')," +
      "view:String(state.view||'workblad')," +
      "isEdit:Boolean(state.editingStoryId)," +
      "media:state.workMedia.map(function(m){return {" +
        "kind:String(m&&m.kind||'')," +
        "id:String(m&&m.id||'')," +
        "url:String(m&&m.localUrl||'')," +
        "role:String(m&&m.role||'')," +
        "size:(m&&m.file instanceof Blob)?m.file.size:0," +
        "blob:(m&&m.file instanceof Blob)?m.file:null" +
      "};})" +
    "};}," +
    "setTitle:function(value){ensure();state.workTitle=String(value||'').slice(0,140);var el=document.getElementById('workTitle');if(el)el.value=state.workTitle;state.workError='';draftSoon();return true;}," +
    "setText:function(value){ensure();state.workText=String(value||'').slice(0,20000);var el=document.getElementById('workText');if(el)el.value=state.workText;state.workError='';draftSoon();return true;}," +
    "pickPhotos:function(){capture();photoPick();return true;}," +
    "openDate:function(){capture();var el=document.getElementById('workDate');if(el){el.click();return true;}openDatePicker();return true;}," +
    "startVoice:function(){capture();return voiceStart();}," +
    "finish:function(){var btn=document.getElementById('workFinish');if(btn){btn.click();return true;}finishWorkblad();return true;}," +
    "removePhoto:async function(index){" +
      "ensure();index=Number(index);if(!Number.isInteger(index)||index<0||index>=state.workMedia.length)throw new Error('Foto niet gevonden.');" +
      "var item=state.workMedia[index],file=item&&item.file;" +
      "if(item&&item.kind==='remote'&&item.id&&state.editingStoryId&&state.editingToken){" +
        "var res=await fetch('/api/v9/story-photo/'+encodeURIComponent(state.editingStoryId)+'/'+encodeURIComponent(item.id),{method:'DELETE',headers:{authorization:'Bearer '+state.editingToken},cache:'no-store'});" +
        "var data={};try{data=await res.json();}catch(e){}if(!res.ok||!data.ok)throw new Error(data.error||'Foto verwijderen mislukt.');" +
      "}" +
      "if(item&&item.localUrl)try{URL.revokeObjectURL(item.localUrl);}catch(e){}" +
      "state.workMedia.splice(index,1);" +
      "if(file instanceof Blob){" +
        "state.newPhotoFiles=state.newPhotoFiles.filter(function(candidate){return candidate!==file;});" +
        "if(window.__taleraPhotoStaging&&typeof window.__taleraPhotoStaging.stage==='function'){" +
          "Promise.resolve(window.__taleraPhotoStaging.stage(file)).then(function(staged){" +
            "if(staged&&staged.id)return fetch('/api/v9/photo/'+encodeURIComponent(staged.id),{method:'DELETE',cache:'no-store'});" +
          "}).catch(function(error){console.warn('[TALERA STORYTELLING] staged photo cleanup deferred',error);});" +
        "}" +
      "}" +
      "state.workError='';await draftSave();renderWorkblad();" +
      "document.dispatchEvent(new CustomEvent('talera:storytelling-photo-removed',{detail:{index:index}}));" +
      "return {ok:true,index:index};" +
    "}" +
  "});";

function extendStorytellingEngine(html) {
  if (!html.includes(ENGINE_MARKER)) {
    console.warn('[TALERA STORYTELLING]', 'engine marker missing; storytelling shell will use read-only fallback');
    return html;
  }
  return html.replace(ENGINE_MARKER, STORYTELLING_ENGINE_PATCH + ENGINE_MARKER);
}

function stableStorytellingScript() {
  return WORKBLAD_STORYTELLING_PAGE_SCRIPT
    .replace(
      "  let lastMediaSignature = '';",
      "  let lastMediaSignature = '';\n  let lastRenderedPhotoKey = '';"
    )
    .replace(
      '    stage.appendChild(shell);',
      "    lastRenderedPhotoKey = '';\n    stage.appendChild(shell);"
    )
    .replace(
      '    photo.replaceChildren();',
      "    const renderKey = sig + '#' + activePhotoIndex;\n    if (renderKey === lastRenderedPhotoKey) return;\n    lastRenderedPhotoKey = renderKey;\n    photo.replaceChildren();"
    );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      const previewResponse = await handleSharePreviewStorage(request, env);
      if (previewResponse) return previewResponse;
    } catch (error) {
      console.error('TALERA share preview storage error', error);
      return json({ error: 'De uitnodigingsminiatuur kon niet veilig worden opgeslagen.' }, 500);
    }

    try {
      const managementResponse = await handleStoryManagement(request, env);
      if (managementResponse) return managementResponse;
    } catch (error) {
      console.error('TALERA story management error', error);
      return json({ error: 'De herinnering kon niet veilig worden beheerd.' }, 500);
    }

    try {
      const cleanupResponse = await handleStoryPhotoCleanup(request, env);
      if (cleanupResponse) return cleanupResponse;
    } catch (error) {
      console.error('TALERA story photo cleanup error', error);
      return json({ error: 'De foto kon niet veilig uit deze herinnering worden verwijderd.' }, 500);
    }

    try {
      const stagedPhotoResponse = await handleV9StagedPhotoLink(request, env);
      if (stagedPhotoResponse) return stagedPhotoResponse;
    } catch (error) {
      console.error('TALERA staged photo link error', error);
      return json({ error: 'De klaargezette foto kon nog niet aan de herinnering worden gekoppeld.' }, 500);
    }

    try {
      const datePolicyResponse = await handleWorkbladDatePolicy(request);
      if (datePolicyResponse) return datePolicyResponse;
    } catch (error) {
      console.error('TALERA date policy error', error);
      return json({ error: 'De datum kon niet veilig worden gecontroleerd.' }, 500);
    }

    try {
      const textMemoryResponse = await handleV9TextMemory(request, env);
      if (textMemoryResponse) return textMemoryResponse;
    } catch (error) {
      console.error('TALERA v9 text/photo memory error', error);
      return json({ error: 'De herinnering zonder geluidsopname kon niet veilig worden opgeslagen.' }, 500);
    }

    try {
      const publishResponse = await handleV9TimelinePublish(request, env);
      if (publishResponse) return publishResponse;
    } catch (error) {
      console.error('TALERA v9 timeline publish wrapper error', error);
      return json({ error: 'De herinnering is veilig opgeslagen, maar de tijdlijnkoppeling kon niet worden uitgevoerd.' }, 500);
    }

    if (url.pathname === '/api/integration/revision' && request.method === 'GET') {
      const base = await baseWorker.fetch(request, env, ctx);
      let data = {};
      try { data = await base.json(); } catch {}
      return json({
        ...data,
        timelinePublishBridge: true,
        timelinePublishRevision: WRAPPER_REV,
        timelineHandoff: 'target-first-storyId+manageToken',
        canonicalWorkbladRoute: '/v9',
        unifiedTaleraExperience: true,
        storytellingWorkblad: true,
        storytellingWorkbladRevision: WORKBLAD_STORYTELLING_PAGE_REV,
        storytellingVisualModel: 'photo-anchor+inline-microphone+same-page-story',
        workbladOrbVisible: false,
        photoFirstWorkblad: true,
        photoSwipeWhileTelling: true,
        photoRemovalBeforePublish: true,
        stagedPhotoLink: true,
        v9TextPhotoMemory: true,
        audioRequiredForTimeline: false,
        futureDateBlocked: true,
        storyPhotoCleanup: true,
        storyManagement: true,
        storyManagementRevision: 'v2-undo',
        legacyPhotoCleanupUi: false,
        storyDeleteMode: 'soft-delete'
      }, base.status || 200);
    }

    const response = await baseWorker.fetch(request, env, ctx);
    const isWorkbladPage = url.pathname === '/' || url.pathname === '/v9' || url.pathname === '/v9/';
    if (request.method === 'HEAD' || !isWorkbladPage) return response;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    const html = extendStorytellingEngine(await response.text());
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store, max-age=0');
    headers.set('x-talera-v9-timeline-publish', WRAPPER_REV);
    headers.set('x-talera-workblad-experience', WORKBLAD_STORYTELLING_PAGE_REV);

    const withStorytellingStyle = html.replace(
      '</head>',
      '<style id="talera-workblad-storytelling-page-style">' + WORKBLAD_STORYTELLING_PAGE_STYLE + '</style></head>'
    );

    return new Response(
      withStorytellingStyle.replace(
        '</body>',
        WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT +
          WORKBLAD_MANAGEMENT_COMPAT_SCRIPT +
          WORKBLAD_STORY_MANAGEMENT_SCRIPT +
          stableStorytellingScript() +
          '</body>'
      ),
      { status: response.status, statusText: response.statusText, headers }
    );
  }
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type':'application/json; charset=UTF-8',
      'cache-control':'no-store, max-age=0'
    }
  });
}
