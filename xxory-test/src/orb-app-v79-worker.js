import stableV79Worker from "./archive/orb-app-v79-stable-20260911.js";
import { WORKBLAD_V1_STYLE } from "./workblad-v1-style.js";
import { WORKBLAD_V1_FOCUS_RING_STYLE } from "./workblad-v1-focus-ring-style.js";
import { WORKBLAD_V2_STYLE } from "./workblad-v2-style.js";
import { WORKBLAD_V2_SCRIPT } from "./workblad-v2-client.js";
import { WORKBLAD_UNIVERSAL_NAV_STYLE, WORKBLAD_UNIVERSAL_NAV_SCRIPT } from "./workblad-universal-nav.js";
import { WORKBLAD_AUDIO_PERSIST_SCRIPT } from "./workblad-audio-persist.js";
import { WORKBLAD_AUDIO_COMMIT_GUARD_SCRIPT } from "./workblad-audio-commit-guard.js";
import { handleWorkbladAudioHead } from "./workblad-audio-head.js";
import { TALERA_CORE_WORKBLAD_PRELUDE, TALERA_CORE_WORKBLAD_STYLE, TALERA_CORE_WORKBLAD_SCRIPT } from "./talera-core-workblad.js";
import { handleWorkbladIntegrationApi } from "./workblad-integration-api.js";

const TALERA_DEPLOY_REV = "talera-core-direct-workblad-r2-20260911-2310";

const CORE_BOOT_GUARD = String.raw`<script>(function(){
setTimeout(function(){
  if(document.querySelector('.work-stage'))return;
  var root=document.getElementById('app');
  if(!root)return;
  root.innerHTML='<div style="min-height:100dvh;display:grid;place-items:center;padding:28px;background:#F7F4EF;color:#0F2747;font-family:system-ui,-apple-system,sans-serif;text-align:center"><div><strong style="font-size:20px">Talera kon het vertelblad niet openen.</strong><p style="line-height:1.5;opacity:.7">Ga terug naar je tijdlijn en probeer het opnieuw.</p><button id="taleraBootBack" style="border:0;border-radius:16px;background:#0F2747;color:white;padding:14px 18px;font-weight:700">Terug naar mijn tijdlijn</button></div></div>';
  var b=document.getElementById('taleraBootBack');if(b)b.onclick=function(){location.href='https://talera-timeline-prototype.mark-a39.workers.dev/'};
},900);
})();</scr`+`ipt>`;

function suppressLegacyEntry(html){
  return html.replace(/renderEntry\(\);\s*<\/script>\s*<\/body>/,'/* TALERA core owns the initial render; legacy chooser intentionally disabled. */\n</script></body>');
}

function enhanceWorkblad(html){
  const base=suppressLegacyEntry(html);
  return base
    .replace('</head>','<style>'+WORKBLAD_V1_STYLE+WORKBLAD_V1_FOCUS_RING_STYLE+WORKBLAD_V2_STYLE+WORKBLAD_UNIVERSAL_NAV_STYLE+TALERA_CORE_WORKBLAD_STYLE+'</style></head>')
    .replace('</body>',TALERA_CORE_WORKBLAD_PRELUDE+WORKBLAD_AUDIO_COMMIT_GUARD_SCRIPT+WORKBLAD_V2_SCRIPT+WORKBLAD_UNIVERSAL_NAV_SCRIPT+WORKBLAD_AUDIO_PERSIST_SCRIPT+TALERA_CORE_WORKBLAD_SCRIPT+CORE_BOOT_GUARD+'</body>');
}

export default {
  async fetch(request,env,ctx){
    const audioHeadResponse=await handleWorkbladAudioHead(request,env);
    if(audioHeadResponse)return audioHeadResponse;

    const integrationResponse=await handleWorkbladIntegrationApi(request,env);
    if(integrationResponse)return integrationResponse;

    const response=await stableV79Worker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    headers.set('x-talera-orb-app','organic-v79-stable-with-core-workblad');
    headers.set('x-talera-vertel-ui',TALERA_DEPLOY_REV);
    return new Response(enhanceWorkblad(html),{status:response.status,statusText:response.statusText,headers});
  }
};
