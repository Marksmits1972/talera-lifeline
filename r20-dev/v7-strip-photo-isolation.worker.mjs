/* TALERA V7 — ONE presentation-only fix.
 * Preserve TALERA V6 (and its V5/R20 parents) unchanged.
 * The current photo must never be copied into all visible timeline-strip pages.
 * Those pages are owned by the existing timeline renderer and represent
 * separate memories with separate IDs and dates.
 *
 * No modifications to story model, narration, audio, editor, swipe handlers,
 * memory storage, delete flow, design, or current-photo presentation layers.
 */
const STRIP_LEAK = [
  "    const visibleStrip=document.querySelector('.talera-photo-strip.is-visible');",
  "    if(visibleStrip){",
  "      visibleStrip.querySelectorAll('.talera-photo-strip-page').forEach(page=>forceLayerPhoto(page,src,1));",
  "    }"
].join('\n');
const FIXED = [
  "    /* V7: do not project this memory's photo onto neighboring strip pages.",
  "       Each neighboring page must keep its own memory image. */"
].join('\n');

export default {
 async fetch(request,env){
  if(!env?.V6_BASE?.fetch)return new Response('Werkende TALERA V6-servicebinding ontbreekt',{status:503});
  const upstream=await env.V6_BASE.fetch(request);
  const url=new URL(request.url);
  if(request.method!=='GET' ||
    !['/','/mijn-leven','/present','/present/'].includes(url.pathname) ||
    !upstream.ok ||
    !(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
  const html=await upstream.text();
  const count=html.split(STRIP_LEAK).length-1;
  const headers=new Headers(upstream.headers);
  headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');
  headers.set('cache-control','no-store');
  headers.set('x-talera-v7-photo-strip-fix',count===1?'active':'anchor-unmatched');
  return new Response(count===1?html.replace(STRIP_LEAK,FIXED):html,{
    status:upstream.status,statusText:upstream.statusText,headers
  });
 }
};
