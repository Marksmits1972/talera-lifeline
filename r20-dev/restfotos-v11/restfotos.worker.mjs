/* TALERA V11 — minimale fotoaanvulling na de bestaande vertelcyclus.
 * Alleen de bestaande stem-eindafhandeling krijgt één aanvullende functie.
 * Geen aanpassing aan opnemen, tijdcodes, videoafspelen, opslag of stijl.
 * Deze Worker is uitsluitend een veilige test-omhulling rond de beschermde stijlversie.
 */
export const VOICE_END_ORIGINAL="voice.addEventListener(\"ended\",function(){if(state.media&&state.media.pause)state.media.pause();if(!taleraStartOriginalRound()){mode(\"ready\");msg(\"Terugkijken afgelopen\")} $(\"clock\").textContent=clock(state.duration)});";
export const VOICE_END_WITH_PHOTOS="voice.addEventListener(\"ended\",function(){if(state.media&&state.media.pause)state.media.pause();if(!taleraV11ShowRemainingPhotos()){mode(\"ready\");msg(\"Terugkijken afgelopen\")} $(\"clock\").textContent=clock(state.duration)});";
export const PHOTO_HELPER="/* TALERA: one check at the end of the existing voice cycle.\n   Use the positions of the already stored photo IDs and spoken cues. */\nfunction taleraV11ShowRemainingPhotos(){\n  const used=new Set(state.cues.map(c=>Number(c.index)));\n  const rest=state.items.flatMap((item,index)=>\n    item.type==='image'&&!used.has(index)?[index]:[]);\n  if(!rest.length)return taleraStartOriginalRound();\n  const items=state.items, voiceId=state.voiceUrl;\n  let nextIndex=0;\n  // Stop the existing voice-following loop from restoring its last cue image.\n  mode('ready');\n  $('play').hidden=true;\n  function next(){\n    if(state.items!==items||state.voiceUrl!==voiceId)return;\n    if(nextIndex===rest.length){\n      if(!taleraStartOriginalRound()){\n        mode('ready');\n        $('play').hidden=false;\n        msg('Terugkijken afgelopen');\n      }\n      return;\n    }\n    show(rest[nextIndex++]);\n    setTimeout(next,4000);\n  }\n  next();\n  return true;\n}\n";
const SENTINEL='function taleraV11ShowRemainingPhotos(){';

export function addRemainingPhotos(html){
  if(typeof html!=='string')return{status:'not-html',html};
  if(html.includes(SENTINEL))return{status:'already-installed',html};
  const p=html.indexOf(VOICE_END_ORIGINAL);
  if(p<0||html.indexOf(VOICE_END_ORIGINAL,p+1)!==-1||
     !html.includes('function taleraStartOriginalRound(){')||
     !html.includes('taleraZero'))return{status:'anchor-unmatched',html};
  const modified=html.slice(0,p)+PHOTO_HELPER+'\n'+VOICE_END_WITH_PHOTOS+
    html.slice(p+VOICE_END_ORIGINAL.length);
  return{status:'installed',html:modified};
}

export default{
  async fetch(request,env){
    if(!env?.STYLE_BASE?.fetch)
      return new Response('TALERA testbasis niet gevonden',{status:503});
    const upstream=await env.STYLE_BASE.fetch(request);
    if(request.method!=='GET'||
       new URL(request.url).pathname!=='/vertelmodus-embed'||
       !upstream.ok||
       !(upstream.headers.get('content-type')||'').includes('text/html'))
      return upstream;
    const {status,html}=addRemainingPhotos(await upstream.text());
    const headers=new Headers(upstream.headers);
    if(status==='installed'){
      headers.delete('etag');
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.set('cache-control','no-store');
    }
    headers.set('x-talera-v11-photos',status);
    return new Response(html,{status:upstream.status,
      statusText:upstream.statusText,headers});
  }
};