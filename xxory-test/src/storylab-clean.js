import { STORYLAB_CLEAN_PAGE_HTML, STORYLAB_CLEAN_PAGE_REVISION } from './storylab-clean-page.js';

const htmlHeaders = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-storylab-clean-revision': STORYLAB_CLEAN_PAGE_REVISION
};

export async function handleStoryLabClean(request) {
  const url = new URL(request.url);

  if (url.pathname === '/storylab-clean' || url.pathname === '/storylab-clean/') {
    return new Response(STORYLAB_CLEAN_PAGE_HTML, { status: 200, headers: htmlHeaders });
  }

  if (url.pathname === '/api/storylab-clean/revision') {
    return Response.json({
      revision: STORYLAB_CLEAN_PAGE_REVISION,
      phase: 'clean-foundation-visual-only',
      cleanSlate: true,
      importsLegacyStoryLab: false,
      importsV9: false,
      importsCleanRebuild: false,
      photoSelectionEnabled: false,
      audioEnabled: false,
      transcriptEnabled: false,
      timelineEnabled: false
    }, {
      headers: { 'cache-control': 'no-store, max-age=0' }
    });
  }

  return null;
}
