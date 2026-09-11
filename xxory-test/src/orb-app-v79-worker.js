import stableV79Worker from "./archive/orb-app-v79-stable-20260911.js";
import { WORKBLAD_V1_STYLE } from "./workblad-v1-style.js";
import { WORKBLAD_V1_FOCUS_RING_STYLE } from "./workblad-v1-focus-ring-style.js";
import { WORKBLAD_V1_SCRIPT } from "./workblad-v1-client.js";

const TALERA_DEPLOY_REV = "workblad-v1-orb-focus-tight-zero-fade";

/* Repair the one-character Promise closure typo in the first workblad client build.
   Keep the source prototype intact while making the proven live entry boot correctly. */
const WORKBLAD_V1_SCRIPT_FIXED = WORKBLAD_V1_SCRIPT.replace(
  "r.onerror=function(){no(r.error)})}",
  "r.onerror=function(){no(r.error)}})}"
);

function enhanceWorkblad(html){
  return html
    .replace('</head>','<style>'+WORKBLAD_V1_STYLE+WORKBLAD_V1_FOCUS_RING_STYLE+'</style></head>')
    .replace('</body>',WORKBLAD_V1_SCRIPT_FIXED+'</body>');
}

export default {
  async fetch(request,env,ctx){
    const response=await stableV79Worker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    headers.set('x-talera-orb-app','organic-v79-stable-with-workblad-v1');
    headers.set('x-talera-vertel-ui',TALERA_DEPLOY_REV);
    return new Response(enhanceWorkblad(html),{status:response.status,statusText:response.statusText,headers});
  }
};