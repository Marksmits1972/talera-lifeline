import {makePages,htmlHeaders} from './pages.js';
import storage from './storage.browser.js';
import media from './media.browser.js';
import bridge from './bridge.browser.js';
import copy from './copy.browser.js';
const assets={'/local/storage.js':storage,'/local/media.js':media,'/local/bridge.js':bridge,'/local/copy.browser.js':copy};
export default {async fetch(request){
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method))return new Response('Local prototype: no server writes',{status:405});
  if(assets[url.pathname])return new Response(request.method==='HEAD'?null:assets[url.pathname],{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}});
  if(!['/','/tell','/tell/'].includes(url.pathname))return new Response('Not found',{status:404});
  const pages=await makePages();
  return new Response(request.method==='HEAD'?null:(url.pathname==='/'?pages.timeline:pages.tell),{headers:htmlHeaders});
}};
