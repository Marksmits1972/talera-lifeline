import stableV79Worker from "./archive/orb-app-v79-stable-20260911.js";
import { WORKBLAD_V1_STYLE } from "./workblad-v1-style.js";
import { WORKBLAD_V1_FOCUS_RING_STYLE } from "./workblad-v1-focus-ring-style.js";
import { WORKBLAD_V2_STYLE } from "./workblad-v2-style.js";
import { WORKBLAD_V2_SCRIPT } from "./workblad-v2-client.js";
import { WORKBLAD_RAW_STORAGE_BRIDGE_SCRIPT } from "./workblad-raw-storage-bridge.js";
import { WORKBLAD_UNIVERSAL_NAV_STYLE, WORKBLAD_UNIVERSAL_NAV_SCRIPT } from "./workblad-universal-nav.js";
import { WORKBLAD_LAYOUT_TUNING_STYLE, WORKBLAD_LAYOUT_TUNING_SCRIPT } from "./workblad-layout-tuning.js";
import { handleWorkbladIntegrationApi } from "./workblad-integration-api.js";
import { handleWorkbladRawStorageApi } from "./workblad-raw-storage-api.js";
import { normalizeMultipartRequest } from "./multipart-request-normalizer.js";

const TALERA_DEPLOY_REV = "full-listen-cycle-v8-raw-storage-20260914";

function enhanceWorkblad(html){
  return html
    .replace('</head>','<style>'+WORKBLAD_V1_STYLE+WORKBLAD_V1_FOCUS_RING_STYLE+WORKBLAD_V2_STYLE+WORKBLAD_UNIVERSAL_NAV_STYLE+WORKBLAD_LAYOUT_TUNING_STYLE+'</style></head>')
    .replace('</body>',WORKBLAD_V2_SCRIPT+WORKBLAD_RAW_STORAGE_BRIDGE_SCRIPT+WORKBLAD_UNIVERSAL_NAV_SCRIPT+WORKBLAD_LAYOUT_TUNING_SCRIPT+'</body>');
}

async function storageReady(url,env,ctx){
  const healthRequest=new Request(new URL('/api/health',url),{method:'GET'});
  const healthResponse=await stableV79Worker.fetch(healthRequest,env,ctx);
  return healthResponse.ok;
}

function storageError(status,message){
  return new Response(JSON.stringify({error:message}),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
}

export default {
  async fetch(request,env,ctx){
    const initialUrl=new URL(request.url);
    if(initialUrl.pathname==='/api/integration/revision'&&request.method==='GET'){
      return new Response(JSON.stringify({
        ok:true,
        revision:TALERA_DEPLOY_REV,
        rawStorage:true,
        multipartNormalizer:true
      }),{
        status:200,
        headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
      });
    }

    if(initialUrl.pathname.startsWith('/api/integration/raw/')){
      try{
        if(!(await storageReady(initialUrl,env,ctx))){
          return storageError(503,'De opslag kon niet worden voorbereid. Probeer het opnieuw.');
        }
        const rawResponse=await handleWorkbladRawStorageApi(request,env);
        if(rawResponse)return rawResponse;
      }catch(error){
        console.error('TALERA raw storage error',error);
        const detail=String(error&&error.message?error.message:error||'onbekende fout').slice(0,180);
        return storageError(500,'Opslaan op de server mislukt: '+detail);
      }
    }

    let activeRequest=request;
    try{
      activeRequest=await normalizeMultipartRequest(request);
    }catch(error){
      console.error('TALERA multipart normalization error',error);
      const detail=String(error&&error.message?error.message:error||'onbekende fout').slice(0,180);
      return storageError(400,'Opslaan op de server mislukt: '+detail);
    }

    const url=new URL(activeRequest.url);
    if(url.pathname.startsWith('/api/integration/')){
      try{
        if(!(await storageReady(url,env,ctx))){
          return storageError(503,'De opslag kon niet worden voorbereid. Probeer het opnieuw.');
        }
        const integrationResponse=await handleWorkbladIntegrationApi(activeRequest,env);
        if(integrationResponse)return integrationResponse;
      }catch(error){
        console.error('TALERA workblad integration error',error);
        const detail=String(error&&error.message?error.message:error||'onbekende fout').slice(0,180);
        return storageError(500,'Opslaan op de server mislukt: '+detail);
      }
    }

    const response=await stableV79Worker.fetch(activeRequest,env,ctx);
    const type=response.headers.get('content-type')||'';
    if(activeRequest.method==='HEAD'||!type.includes('text/html'))return response;
    const html=await response.text();
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control','no-store');
    headers.set('x-talera-orb-app','organic-v79-stable-with-workblad-v2-audio-cycle');
    headers.set('x-talera-vertel-ui',TALERA_DEPLOY_REV);
    return new Response(enhanceWorkblad(html),{status:response.status,statusText:response.statusText,headers});
  }
};
