/* TALERA V10 — uitsluitend twee ontbrekende foto's na gesproken cyclus.
 * Een kleine, omkeerbare toevoeging aan de bestaande vertelspeler.
 * Geen vervanging van de originele video-afspeelfunctie, geen opslagwijziging.
 */

export const ORIGINAL_VOICE_END="voice.addEventListener(\"ended\",function(){if(state.media&&state.media.pause)state.media.pause();if(!taleraStartOriginalRound()){mode(\"ready\");msg(\"Terugkijken afgelopen\")} $(\"clock\").textContent=clock(state.duration)});";
export const PATCHED_VOICE_END="voice.addEventListener(\"ended\",function(){if(state.media&&state.media.pause)state.media.pause();if(!taleraV10PlayRemainingPhotosThenVideos()){mode(\"ready\");msg(\"Terugkijken afgelopen\")} $(\"clock\").textContent=clock(state.duration)});";
export const PHOTO_TAIL_MS=4000;
const SENTINEL='function taleraV10PlayRemainingPhotosThenVideos()';
const HELPER="/* V10: one small addition to the ORIGINAL narration cycle.\n   The original voice cues, playback UI and original video function stay intact. */\nfunction taleraV10PlayRemainingPhotosThenVideos(){\n  if(!document.body.classList.contains('present')||!state.voiceUrl)\n    return taleraStartOriginalRound();\n  const used=new Set(state.cues.map(c=>Number(c.index)));\n  const remaining=state.items.flatMap((item,index)=>\n    item.type==='image'&&!used.has(index)?[index]:[]);\n  if(!remaining.length)return taleraStartOriginalRound();\n  // When a different memory loads, state.items changes; never continue an\n  // old photo timer into a different story.\n  const originalItems=state.items,originalVoice=state.voiceUrl;\n  let nextIndex=0;\n  mode('ready');\n  function next(){\n    if(state.items!==originalItems||state.voiceUrl!==originalVoice)return;\n    if(nextIndex===remaining.length){\n      if(!taleraStartOriginalRound()){\n        mode('ready');msg('Terugkijken afgelopen');\n        $('play').hidden=false;\n      }\n      return;\n    }\n    show(remaining[nextIndex++]);\n    $('play').hidden=true;\n    setTimeout(next,4000);\n  }\n  next();\n  return true;\n}\n";

export function addUnspokenPhotosToNarration(html){
  if(typeof html!=='string')return{html,status:'not-html'};
  if(html.includes(SENTINEL))return{html,status:'already-installed'};
  const pos=html.indexOf(ORIGINAL_VOICE_END);
  if(pos<0||html.indexOf(ORIGINAL_VOICE_END,pos+1)!==-1||
      !html.includes('function taleraStartOriginalRound(){')||
      !html.includes('taleraZero'))return{html,status:'anchor-unmatched'};
  // Replace only the original event handler's single call to the video round.
  // The video function itself and all other HTML/body code are untouched.
  const updated=html.slice(0,pos)+HELPER+'\n'+PATCHED_VOICE_END+
      html.slice(pos+ORIGINAL_VOICE_END.length);
  return{html:updated,status:'installed'};
}

export default{
  async fetch(request,env){
    if(!env?.STYLE_BASE?.fetch)
      return new Response('Afzonderlijke TALERA-stijltestbasis ontbreekt',{status:503});
    const response=await env.STYLE_BASE.fetch(request);
    if(request.method!=='GET'||new URL(request.url).pathname!=='/vertelmodus-embed'||
       !response.ok||!(response.headers.get('content-type')||'').includes('text/html'))
      return response;
    const {html,status}=addUnspokenPhotosToNarration(await response.text());
    const headers=new Headers(response.headers);
    if(status==='installed'){
      headers.delete('etag');
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.set('cache-control','no-store');
    }
    headers.set('x-talera-v10-tail-photos',status);
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }
};
