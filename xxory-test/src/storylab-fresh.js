import { STORYLAB_FRESH_HTML, STORYLAB_FRESH_PAGE_REV } from './storylab-fresh-page.js';

export const STORYLAB_FRESH_REV = 'storylab-fresh-isolated-20260916-r1';

export async function handleStoryLabFresh(request) {
  const url = new URL(request.url);
  if ((url.pathname === '/storylab' || url.pathname === '/storylab/') && (request.method === 'GET' || request.method === 'HEAD')) {
    return new Response(request.method === 'HEAD' ? null : STORYLAB_FRESH_HTML, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'no-store, max-age=0',
        'x-talera-storylab-fresh': STORYLAB_FRESH_REV,
        'x-talera-storylab-page': STORYLAB_FRESH_PAGE_REV
      }
    });
  }

  if (url.pathname === '/api/storylab/revision' && request.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      revision: STORYLAB_FRESH_REV,
      pageRevision: STORYLAB_FRESH_PAGE_REV,
      phase: 'visual-shell-only',
      builtFromBlank: true,
      legacyStoryLabAttached: false,
      cleanStackAttached: false,
      v9StackAttached: false,
      audioEnabled: false,
      persistentPhotoStorage: false,
      timelineEnabled: false
    }), {
      status: 200,
      headers: {'content-type':'application/json; charset=UTF-8','cache-control':'no-store, max-age=0'}
    });
  }

  return null;
}
