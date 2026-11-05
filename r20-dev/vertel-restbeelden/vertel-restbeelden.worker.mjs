/* TALERA V10 — photos not covered by recorded narration.
 * Separate Cloudflare Worker: read-only wrapper around protected style staging.
 * Saved narration cues, media IDs, original video-sound round, swipes,
 * photo cropping, editor, Free/Premium and storage are never mutated.
 */

export function missingStillIndices(items, cues) {
  if (!Array.isArray(items) || !items.length) return [];
  const seen = new Set();
  for (const cue of Array.isArray(cues) ? cues : []) {
    const index = Number(cue?.index);
    if (Number.isInteger(index) && index >= 0 && index < items.length) seen.add(index);
  }
  const missing = [];
  items.forEach((item, index) => {
    if (item?.type === 'image' && !seen.has(index)) missing.push(index);
  });
  return missing;
}

export const ORIGINAL_VOICE_END = 'voice.addEventListener("ended",function(){if(state.media&&state.media.pause)state.media.pause();if(!taleraStartOriginalRound()){mode("ready");msg("Terugkijken afgelopen")} $("clock").textContent=clock(state.duration)});';
export const PHOTO_HOLD_MS = 4000;
const MARKER = 'taleraV10StartRemainingPhotos';

export const PHOTO_TAIL_PATCH = [
  '/* TALERA V10: after narration, only unused photos, then ORIGINAL video sound. */',
  missingStillIndices.toString(),
  "\nlet taleraV10MissingPhotos = [];\nlet taleraV10MissingTotal = 0;\nlet taleraV10MissingTimer = null;\nlet taleraV10MissingActive = false;\nfunction taleraV10ClearRemainingPhotos() {\n  if (taleraV10MissingTimer !== null) clearTimeout(taleraV10MissingTimer);\n  taleraV10MissingTimer = null;\n  taleraV10MissingPhotos = [];\n  taleraV10MissingTotal = 0;\n  taleraV10MissingActive = false;\n}\nfunction taleraV10NextRemainingPhoto() {\n  if (!taleraV10MissingActive) return;\n  if (taleraV10MissingTimer !== null) clearTimeout(taleraV10MissingTimer);\n  taleraV10MissingTimer = null;\n  const index = taleraV10MissingPhotos.shift();\n  if (index === undefined) {\n    taleraV10ClearRemainingPhotos();\n    // Keep the approved original-video-sound round after the photo tail.\n    if (!taleraStartOriginalRound()) {\n      mode('ready');\n      msg('Terugkijken afgelopen');\n    }\n    return;\n  }\n  show(index);\n  mode('ready');\n  $('play').hidden = true;\n  msg('Overige foto ' + (taleraV10MissingTotal - taleraV10MissingPhotos.length) +\n      ' van ' + taleraV10MissingTotal);\n  taleraV10MissingTimer = setTimeout(taleraV10NextRemainingPhoto, 4000);\n}\nfunction taleraV10StartRemainingPhotos() {\n  if (!document.body.classList.contains('present') ||\n      !state.voiceUrl || !state.items.length) return false;\n  const upcoming = missingStillIndices(state.items, state.cues);\n  if (!upcoming.length) return false;\n  taleraV10ClearRemainingPhotos();\n  taleraV10MissingPhotos = upcoming;\n  taleraV10MissingTotal = upcoming.length;\n  taleraV10MissingActive = true;\n  taleraV10NextRemainingPhoto();\n  return true;\n}\nwindow.addEventListener('message', function(event) {\n  if (event.origin !== location.origin || !event.data?.taleraZero) return;\n  if (event.data.type === 'INIT' || event.data.type === 'PAUSE_PLAYER')\n    taleraV10ClearRemainingPhotos();\n}, true);\nwindow.addEventListener('pagehide', taleraV10ClearRemainingPhotos, {once:true});\nvoice.addEventListener(\"ended\", function() {\n  if (state.media && state.media.pause) state.media.pause();\n  if (!taleraV10StartRemainingPhotos()) {\n    if (!taleraStartOriginalRound()) {\n      mode(\"ready\");\n      msg(\"Terugkijken afgelopen\");\n    }\n  }\n  $(\"clock\").textContent = clock(state.duration);\n});"
].join('\n');

export function applyMissingPhotoTail(html) {
  if (typeof html !== 'string') return {html, status:'not-html'};
  if (html.includes(MARKER)) return {html, status:'already-installed'};
  const first = html.indexOf(ORIGINAL_VOICE_END);
  if (first < 0 || html.indexOf(ORIGINAL_VOICE_END, first + 1) !== -1 ||
      !html.includes('taleraStartOriginalRound') ||
      !html.includes('taleraZero')) {
    return {html, status:'anchor-unmatched'};
  }
  return {
    html:html.slice(0, first) + PHOTO_TAIL_PATCH + html.slice(first + ORIGINAL_VOICE_END.length),
    status:'installed'
  };
}

export default {
  async fetch(request, env) {
    if (!env?.STYLE_BASE?.fetch)
      return new Response('Afzonderlijke TALERA-stijltestbasis ontbreekt', {status:503});
    const upstream = await env.STYLE_BASE.fetch(request);
    const path = new URL(request.url).pathname;
    if (request.method !== 'GET' || path !== '/vertelmodus-embed' ||
        !upstream.ok ||
        !(upstream.headers.get('content-type') || '').includes('text/html'))
      return upstream;
    const original = await upstream.text();
    const result = applyMissingPhotoTail(original);
    const headers = new Headers(upstream.headers);
    if (result.status === 'installed') {
      headers.delete('etag');
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.set('cache-control','no-store');
    }
    headers.set('x-talera-v10-tail-photos',result.status);
    return new Response(result.html,{
      status:upstream.status,statusText:upstream.statusText,headers
    });
  }
};
