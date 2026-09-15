import baseWorker from './orb-app-v79-worker.js';
import { handleV9TimelinePublish } from './workblad-v9-timeline-publish.js';
import { WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT } from './workblad-v9-timeline-handoff.js';
import { handleSharePreviewStorage } from './share-preview-storage.js';

const WRAPPER_REV = 'workblad-v9-manual-handoff-spinner-20260915-r5';

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
        timelineHandoff: 'storyId+manageToken'
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
      html.replace('</body>', WORKBLAD_V9_TIMELINE_HANDOFF_SCRIPT + '</body>'),
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
