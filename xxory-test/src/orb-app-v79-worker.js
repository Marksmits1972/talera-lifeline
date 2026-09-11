import stableV79Worker from "./archive/orb-app-v79-stable-20260911.js";
import { WORKBLAD_V1_STYLE } from "./workblad-v1-style.js";
import { WORKBLAD_V1_FOCUS_RING_STYLE } from "./workblad-v1-focus-ring-style.js";
import { WORKBLAD_V2_STYLE } from "./workblad-v2-style.js";
import { WORKBLAD_V2_SCRIPT } from "./workblad-v2-client.js";
import { WORKBLAD_UNIVERSAL_NAV_STYLE, WORKBLAD_UNIVERSAL_NAV_SCRIPT } from "./workblad-universal-nav.js";
import { WORKBLAD_LAYOUT_TUNING_STYLE, WORKBLAD_LAYOUT_TUNING_SCRIPT } from "./workblad-layout-tuning.js";
import { WORKBLAD_AUDIO_PERSIST_SCRIPT } from "./workblad-audio-persist.js";
import { WORKBLAD_AUDIO_COMMIT_GUARD_SCRIPT } from "./workblad-audio-commit-guard.js";
import { handleWorkbladAudioHead } from "./workblad-audio-head.js";
import { WORKBLAD_PHOTO_SWIPE_LITE_STYLE, WORKBLAD_PHOTO_SWIPE_LITE_SCRIPT } from "./workblad-photo-swipe-lite.js";
import { WORKBLAD_REQUIRED_DATE_STYLE, WORKBLAD_REQUIRED_DATE_SCRIPT } from "./workblad-required-date.js";
import { WORKBLAD_DIRECT_OPEN_GUARD_SCRIPT } from "./workblad-direct-open-guard.js";
import { WORKBLAD_VOICE_FIRST_STYLE, WORKBLAD_VOICE_FIRST_SCRIPT } from "./workblad-voice-first.js";
import { WORKBLAD_NEW_STORY_CONTEXT_SCRIPT } from "./workblad-new-story-context.js";
import { handleWorkbladIntegrationApi } from "./workblad-integration-api.js";

const TALERA_DEPLOY_REV = "workblad-v2-audio-write-verify-r4-20260911";

function enhanceWorkblad(html){
  return html
    .replace('</head>','<style>'+WORKBLAD_V1_STYLE+WORKBLAD_V1_FOCUS_RING_STYLE+WORKBLAD_V2_STYLE+WORKBLAD_UNIVERSAL_NAV_STYLE+WORKBLAD_LAYOUT_TUNING_STYLE+WORKBLAD_PHOTO_SWIPE_LITE_STYLE+WORKBLAD_REQUIRED_DATE_STYLE+WORKBLAD_VOICE_FIRST_STYLE+'</style></head>')
    .replace('</body>',WORKBLAD_NEW_STORY_CONTEXT_SCRIPT+WORKBLAD_AUDIO_COMMIT_GUARD_SCRIPT+WORKBLAD_V2_SCRIPT+WORKBLAD_UNIVERSAL_NAV_SCRIPT+WORKBLAD_LAYOUT_TUNING_SCRIPT+WORKBLAD_AUDIO_PERSIST_SCRIPT+WORKBLAD_PHOTO_SWIPE_LITE_SCRIPT+WORKBLAD_REQUIRED_DATE_SCRIPT+WORKBLAD_DIRECT_OPEN_GUARD_SCRIPT+WORKBLAD_VOICE_FIRST_SCRIPT+'</body>');
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
    headers.set('x-talera-orb-app','organic-v79-stable-with-workblad-v2');
    headers.set('x-talera-vertel-ui',TALERA_DEPLOY_REV);
    return new Response(enhanceWorkblad(html),{status:response.status,statusText:response.statusText,headers});
  }
};
