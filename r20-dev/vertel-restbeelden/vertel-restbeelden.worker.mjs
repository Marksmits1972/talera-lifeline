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
const MARKER = 'taleraV10PrepareBeforeOriginalVideoRound';

export const ORIGINAL_VIDEO_ROUND_INSERTION_POINT = '/* Capture presentation gestures inside its iframe: swipe changes story; tap advances medium. */';
export const PHOTO_TAIL_PATCH = [
  '/* TALERA V10: photographs before unchanged original-sound videos. */',
  missingStillIndices.toString(),
  "\n/* V10: intercept the EXISTING working transition into the original-sound\n   video round, without rewriting the audio ended handler or the video player. */\nconst taleraV10SavedStartOriginalVideoRound = taleraStartOriginalRound;\nlet taleraV10PendingStillIndices = [];\nlet taleraV10StillTotal = 0;\nlet taleraV10StillTimer = null;\nlet taleraV10StillRunning = false;\nfunction taleraV10CancelStillRound() {\n  if (taleraV10StillTimer !== null) clearTimeout(taleraV10StillTimer);\n  taleraV10StillTimer = null;\n  taleraV10PendingStillIndices = [];\n  taleraV10StillTotal = 0;\n  taleraV10StillRunning = false;\n}\nfunction taleraV10AdvanceStillRound() {\n  if (!taleraV10StillRunning) return;\n  if (taleraV10StillTimer !== null) clearTimeout(taleraV10StillTimer);\n  taleraV10StillTimer = null;\n  const nextIndex = taleraV10PendingStillIndices.shift();\n  if (nextIndex === undefined) {\n    taleraV10CancelStillRound();\n    // This is the ORIGINAL approved second round. Its code is not patched.\n    const videosStarted = taleraV10SavedStartOriginalVideoRound();\n    if (!videosStarted) {\n      mode('ready');\n      $('play').hidden = false;\n      msg('Herinnering afgelopen');\n    }\n    return;\n  }\n  show(nextIndex);\n  mode('ready');\n  $('play').hidden = true;\n  msg('Overige foto ' +\n    (taleraV10StillTotal - taleraV10PendingStillIndices.length) +\n    ' van ' + taleraV10StillTotal);\n  taleraV10StillTimer = setTimeout(taleraV10AdvanceStillRound, 4000);\n}\nfunction taleraV10PrepareBeforeOriginalVideoRound() {\n  if (!document.body.classList.contains('present') ||\n      !state.voiceUrl || !state.items.length) {\n    return taleraV10SavedStartOriginalVideoRound();\n  }\n  // The parent preserves the IDs in media order; the voice cues store their\n  // indices into that exact ordered list. Images not referenced by a cue are\n  // shown once in original order. Video objects never enter this tail.\n  const unspoken = missingStillIndices(state.items, state.cues);\n  if (!unspoken.length) return taleraV10SavedStartOriginalVideoRound();\n  taleraV10CancelStillRound();\n  taleraV10PendingStillIndices = unspoken;\n  taleraV10StillTotal = unspoken.length;\n  taleraV10StillRunning = true;\n  taleraV10AdvanceStillRound();\n  return true; // tell the ORIGINAL ended handler the following round started\n}\ntaleraStartOriginalRound = taleraV10PrepareBeforeOriginalVideoRound;\nwindow.addEventListener('message', function(event) {\n  if (event.origin !== location.origin || !event.data?.taleraZero) return;\n  if (event.data.type === 'INIT' || event.data.type === 'PAUSE_PLAYER')\n    taleraV10CancelStillRound();\n}, true);\nwindow.addEventListener('pagehide', taleraV10CancelStillRound, {once:true});\n"
].join('\n');

export function applyMissingPhotoTail(html) {
  if (typeof html !== 'string') return {html, status:'not-html'};
  if (html.includes(MARKER)) return {html, status:'already-installed'};
  // Require the exact existing video-start function and unmodified voice
  // ended handler before inserting a hook immediately after the function.
  // Nothing in the original videoplayer or audio-ended code is replaced.
  const first = html.indexOf(ORIGINAL_VIDEO_ROUND_INSERTION_POINT);
  const originalVoiceEnd = html.indexOf(ORIGINAL_VOICE_END);
  if (first < 0 || html.indexOf(ORIGINAL_VIDEO_ROUND_INSERTION_POINT, first + 1) !== -1 ||
      originalVoiceEnd < 0 ||
      !html.includes('function taleraStartOriginalRound(){') ||
      !html.includes('taleraZero')) {
    return {html, status:'anchor-unmatched'};
  }
  return {
    html:html.slice(0, first) + PHOTO_TAIL_PATCH + '\n' + html.slice(first),
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
