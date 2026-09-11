import stableV79Worker from "./archive/orb-app-v79-stable-20260911.js";
import { WORKBLAD_V1_STYLE } from "./workblad-v1-style.js";
import { WORKBLAD_V1_FOCUS_RING_STYLE } from "./workblad-v1-focus-ring-style.js";
import { WORKBLAD_V2_STYLE } from "./workblad-v2-style.js";
import { WORKBLAD_V2_SCRIPT } from "./workblad-v2-client.js";
import { WORKBLAD_UNIVERSAL_NAV_STYLE, WORKBLAD_UNIVERSAL_NAV_SCRIPT } from "./workblad-universal-nav.js";
import { WORKBLAD_LAYOUT_TUNING_STYLE, WORKBLAD_LAYOUT_TUNING_SCRIPT } from "./workblad-layout-tuning.js";
import { WORKBLAD_AUDIO_PERSIST_SCRIPT } from "./workblad-audio-persist.js";
import { WORKBLAD_PHOTO_CAROUSEL_STYLE, WORKBLAD_PHOTO_CAROUSEL_SCRIPT } from "./workblad-photo-carousel.js";
import { handleWorkbladIntegrationApi } from "./workblad-integration-api.js";
import { handleWorkbladCoverApi } from "./workblad-cover-api.js";

const TALERA_DEPLOY_REV = "workblad-v2-photo-carousel-active-cover-20260911";

function enhanceWorkblad(html){
  return html
    .replace('</head>','<style>'+WORKBLAD_V1_STYLE+WORKBLAD_V1_FOCUS_RING_STYLE+WORKBLAD_V2_STYLE+WORKBLAD_UNIVERSAL_NAV_STYLE+WORKBLAD_LAYOUT_TUNING_STYLE+WORKBLAD_PHOTO_CAROUSEL_STYLE+'</style></head>')
    .replace('</body>',WORKBLAD_V2_SCRIPT+WORKBLAD_UNIVERSAL_NAV_SCRIPT+WORKBLAD_LAYOUT_TUNING_SCRIPT+WORKBLAD_AUDIO_PERSIST_SCRIPT+WORKBLAD_PHOTO_CAROUSEL_SCRIPT+'</body>');
}

export default {
  async fetch(request,env,ctx){
    const coverResponse=await handleWorkbladCoverApi(request,env);
    if(coverResponse)return coverResponse;
    const integrationResponse=await handleWorkbladIntegrationApi(request,env);
    if(integrationResponse)return integrationResponse;

    const response=await stableV79Worker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    headers.set('x-talera-orb-app','organic-v79-stable-with-workblad-v2');
    headers.set('x-talera-vertel-ui',TALERA_DEPLOY_REV);
    return new Response(enhanceWorkblad(html),{status:response.status,statusText:response.statusText,headers});
  }
};
