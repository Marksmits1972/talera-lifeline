import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const unwrap=name=>source(name).replace(/^export (?=(?:async )?function |const )/gm,'');
export function installInternalSend(sourceCode){
 let code=sourceCode;
 const once=(a,b)=>{assert.equal(code.split(a).length,2,'INTERNAL_SEND_BUILD_DRIFT '+a.slice(0,90));code=code.replace(a,b)};
 const lib='const taleraContactAccess=(()=>{'+unwrap('f5-my-people.mjs')+'\nreturn {openPeopleStore};})();\n'+
  'const taleraInternalSender=(()=>{'+unwrap('f5-internal-send.mjs')+'\nreturn {internalSendOriginal};})();\n';
 once('const shareAdapter={',lib+'\nconst shareAdapter={');
 once('function mount(){',"function mount(){if(new URLSearchParams(location.search).has('received'))return;");
 const vars='let mode=null,memory=runtime.currentMemory(),focus=null,consent=false,shareAuth=null,authBusy=false;';
 once(vars,vars+'\n'+source('f5-internal-send-view.js'));
 once("function close(){const wasShare=mode==='share';mode=null;", "function close(){const wasShare=mode==='share'||mode==='internal';internalView=null;mode=null;");
 once("function render(){if(!mode)return;", "function render(){if(!mode)return;if(mode==='internal'){renderInternal();return;}");
 once("taleraRenderSharePanel(closeButton+'<h2>Delen via WhatsApp</h2>", "taleraRenderSharePanel(closeButton+internalRouteOption()+'<h2>Delen via WhatsApp</h2>");
 once("const a=e.target.closest('[data-action]')?.dataset.action;if(a==='close')", "const a=e.target.closest('[data-action]')?.dataset.action;if(a==='internal-route'){void openInternal();return}if(a==='close')");
 return code;
}
