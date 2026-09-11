import orbV79Worker from "./orb-app-v79-worker.js";
import { WORKBLAD_V1_STYLE } from "./workblad-v1-style.js";
import { WORKBLAD_V1_SCRIPT } from "./workblad-v1-client.js";

function enhanceWorkblad(html){
  return html
    .replace('</head>','<style>'+WORKBLAD_V1_STYLE+'</style></head>')
    .replace('</body>',WORKBLAD_V1_SCRIPT+'</body>');
}

export default {
  async fetch(request,env,ctx){
    const response=await orbV79Worker.fetch(request,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(request.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    headers.set('x-talera-vertel-ui','workblad-v1-orb-tool');
    return new Response(enhanceWorkblad(html),{status:response.status,statusText:response.statusText,headers});
  }
};