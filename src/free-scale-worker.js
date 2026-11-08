// TALERA Free 10M staging gateway (not the production Worker).
// Only the verified, anonymous, parameterless homepage uses the static shell.
// Personal/invite/API/authorized requests always execute the original Worker.
import originalWorker from './timeline-polish-worker.js';
import { anonymousFreeShell } from './generated/free-scale-shell.mjs';

function isAnonymousShellRequest(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.pathname !== '/' || url.search !== '') return false;
  if (request.headers.has('authorization') || request.headers.has('cookie')) return false;
  if (request.headers.has('range') || request.headers.has('if-none-match')) return false;
  return true;
}
export { isAnonymousShellRequest };

export default {
  async fetch(request, env, ctx) {
    if (!isAnonymousShellRequest(request)) return originalWorker.fetch(request, env, ctx);
    return new Response(anonymousFreeShell, {
      headers: {
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'no-store, max-age=0',
        'x-content-type-options': 'nosniff',
        'x-talera-free-scale': 'anonymous-static-shell-staging'
      }
    });
  }
};