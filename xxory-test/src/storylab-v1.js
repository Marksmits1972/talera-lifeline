import { STORYLAB_HTML, STORYLAB_PAGE_REV } from './storylab-page-v1.js';

export const STORYLAB_REV = 'storylab-isolated-restart-20260916-r1';

export async function handleStoryLabV1(request) {
  const url = new URL(request.url);
  if ((url.pathname === '/storylab' || url.pathname === '/storylab/') && (request.method === 'GET' || request.method === 'HEAD')) {
    return new Response(request.method === 'HEAD' ? null : STORYLAB_HTML, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'no-store, max-age=0',
        'x-talera-storylab': STORYLAB_REV,
        'x-talera-storylab-page': STORYLAB_PAGE_REV
      }
    });
  }
  if (url.pathname === '/api/storylab/revision' && request.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      revision: STORYLAB_REV,
      pageRevision: STORYLAB_PAGE_REV,
      phase: 'visual-foundation-only',
      isolatedFromClean: true,
      isolatedFromV9: true,
      persistentStorage: false,
      audioEnabled: false,
      transcriptEnabled: false,
      timelineEnabled: false
    }), {
      status: 200,
      headers: {'content-type':'application/json; charset=UTF-8','cache-control':'no-store, max-age=0'}
    });
  }
  return null;
}
