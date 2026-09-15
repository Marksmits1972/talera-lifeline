import baseWorker from './orb-app-v79-worker.js';
import { handleV9TimelinePublish } from './workblad-v9-timeline-publish.js';
import { handleV9StagedPhotoLink } from './workblad-v9-staged-photo-link.js';
import { WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT } from './workblad-v9-timeline-handoff.js';
import { handleStoryPhotoCleanup } from './workblad-story-photo-cleanup.js';
import { handleStoryManagement, WORKBLAD_STORY_MANAGEMENT_SCRIPT } from './workblad-story-management.js';
import { handleSharePreviewStorage } from './share-preview-storage.js';

const WRAPPER_REV = 'workblad-v9-management-v2-20260915-r9';

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
        timelineHandoff: 'storyId+manageToken',
        stagedPhotoLink: true,
        storyPhotoCleanup: true,
        storyManagement: true,
        storyManagementRevision: 'v2-undo',
        storyDeleteMode: 'soft-delete'
      }, base.status || 200);
    }

    const response = await baseWorker.fetch(request, env, ctx);
    if (request.method === 'HEAD' || url.pathname !== '/') return response;
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store, max-age=0');
    headers.set('x-talera-v9-timeline-publish', WRAPPER_REV);
    return new Response(
      html.replace('</body>', WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT + WORKBLAD_STORY_MANAGEMENT_SCRIPT + '</body>'),
      { status: response.status, statusText: response.statusText, headers }
    );
  }
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store, max-age=0'
    }
  });
}
