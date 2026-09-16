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
  WORKBLAD_POLISHED_TEST_PAGE_REV,
  WORKBLAD_POLISHED_TEST_PAGE_STYLE,
  WORKBLAD_POLISHED_TEST_PAGE_SCRIPT
} from './workblad-polished-test-page.js';
import {
  WORKBLAD_MOBILE_INTERACTION_FIX_REV,
  WORKBLAD_MOBILE_INTERACTION_FIX_STYLE,
  WORKBLAD_MOBILE_INTERACTION_FIX_SCRIPT
} from './workblad-mobile-interaction-fix.js';

const WRAPPER_REV = 'workblad-polished-photo-first-20260916-r2';

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
        polishedWorkbladTestPage: true,
        polishedWorkbladRevision: WORKBLAD_POLISHED_TEST_PAGE_REV,
        mobileInteractionFix: true,
        mobileInteractionRevision: WORKBLAD_MOBILE_INTERACTION_FIX_REV,
        photoFirstWorkblad: true,
        photoSwipeWhileTelling: true,
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

    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store, max-age=0');
    headers.set('x-talera-v9-timeline-publish', WRAPPER_REV);
    headers.set('x-talera-workblad-experience', WORKBLAD_POLISHED_TEST_PAGE_REV);
    headers.set('x-talera-mobile-interaction', WORKBLAD_MOBILE_INTERACTION_FIX_REV);
    const withPolishedStyle = html.replace(
      '</head>',
      '<style id="talera-workblad-polished-test-page-style">' + WORKBLAD_POLISHED_TEST_PAGE_STYLE + WORKBLAD_MOBILE_INTERACTION_FIX_STYLE + '</style></head>'
    );
    return new Response(
      withPolishedStyle.replace(
        '</body>',
        WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT +
          WORKBLAD_MANAGEMENT_COMPAT_SCRIPT +
          WORKBLAD_STORY_MANAGEMENT_SCRIPT +
          WORKBLAD_POLISHED_TEST_PAGE_SCRIPT +
          WORKBLAD_MOBILE_INTERACTION_FIX_SCRIPT +
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
