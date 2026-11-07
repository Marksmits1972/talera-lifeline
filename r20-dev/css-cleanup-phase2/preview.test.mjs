import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import app, {cleanPreviewHtml} from './preview.worker.mjs';

const source=readFileSync(new URL('./preview.worker.mjs',import.meta.url),'utf8');
function literal(name){
 const m=source.match(new RegExp('const '+name+' = ("(?:\\\\.|[^"\\\\])*");'));
 if(!m)throw Error('Missing literal '+name);
 return JSON.parse(m[1]);
}
const homeBefore=literal('BEFORE_CSS');
const homeAfter=literal('AFTER_CSS');
const presentBefore=literal('BEFORE_PRESENT_CSS');
const presentAfter=literal('AFTER_PRESENT_CSS');
const homeTag='<style id="talera-stille-luxe">';
const presentTag='<style id="talera-deepblue-menu-content">';

function winnerMap(css){
 const values=new Map();
 for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  const selector=match[1].replace(/\/\*[\s\S]*?\*\//g,'').trim().replace(/\s+/g,' ');
  if(!selector||selector.startsWith('@'))continue;
  for(const decl of match[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)){
   const key=selector+'|'+decl[1],value=decl[2].trim(),important=value.includes('!important');
   const old=values.get(key);
   if(!old||!old.important||important)values.set(key,{value,important});
  }
 }
 return [...values.entries()].sort(([a],[b])=>a.localeCompare(b));
}

test('Phase 1 approved CSS winners remain unchanged',()=>{
 assert.equal(homeBefore.length-homeAfter.length,560);
 assert.deepEqual(winnerMap(homeBefore),winnerMap(homeAfter));
});
test('Phase 2 active presentation CSS winners remain unchanged',()=>{
 assert.equal(presentBefore.length-presentAfter.length,691);
 assert.deepEqual(winnerMap(presentBefore),winnerMap(presentAfter));
 assert.match(presentBefore,/TALERA touch repair/);
 assert.match(presentAfter,/TALERA touch repair/);
 assert.match(presentAfter,/TALERA PWA alignment/);
 assert.match(presentAfter,/width:45px!important;height:45px!important/);
 assert.match(presentAfter,/width:34px!important;height:34px!important/);
 assert.match(presentAfter,/border-radius:50%!important/);
 assert.match(presentAfter,/body\.talera-v18-reading/);
});
test('Presentation and home HTML are changed only in the existing exact CSS block',()=>{
 for(const [route,tag,oldCss,newCss] of [
  ['/mijn-leven',homeTag,homeBefore,homeAfter],
  ['/tell',homeTag,homeBefore,homeAfter],
  ['/present',presentTag,presentBefore,presentAfter]
 ]){
  const src='<html><head>'+tag+oldCss+'</style><script>window.TALERA=true;</script></head><body><button>OK</button></body></html>';
  const result=cleanPreviewHtml(src,route);
  assert.equal(result.status,'applied',route);
  assert.equal(result.html,src.replace(oldCss,newCss),route);
  assert.match(result.html,/<script>window.TALERA=true;<\/script>/);
 }
});
test('Fail closed: no new style or broken pages if source changes',()=>{
 for(const [route,tag,oldCss] of [
  ['/mijn-leven',homeTag,homeBefore],
  ['/present',presentTag,presentBefore]
 ]){
  for(const html of [
    '<html><head></head></html>',
    tag+oldCss+' unexpected</style>',
    tag+oldCss+'</style>'+tag+oldCss+'</style>',
    tag+oldCss
  ]){
    const result=cleanPreviewHtml(html,route);
    assert.notEqual(result.status,'applied');
    assert.equal(result.html,html);
  }
 }
});
test('Proxy changes CSS only on allowed GET pages; API requests pass through untouched',async()=>{
 const home='<html><head>'+homeTag+homeBefore+'</style></head><body>home</body></html>';
 const present='<html><head>'+presentTag+presentBefore+'</style></head><body>present</body></html>';
 const seen=[];
 const env={TALERA_BASE:{fetch:async req=>{
  const route=new URL(req.url).pathname;seen.push(route+' '+req.method);
  const html=route==='/present'?present:home;
  return new Response(html,{headers:{'content-type':'text/html; charset=utf-8',etag:'old','content-length':String(html.length)}});
 }}};
 const homeResp=await app.fetch(new Request('https://test.invalid/mijn-leven'),env);
 assert.equal(homeResp.headers.get('x-talera-css-cleanup-phase2'),'applied');
 assert.equal(homeResp.headers.get('etag'),null);
 assert.equal(await homeResp.text(),home.replace(homeBefore,homeAfter));
 const presResp=await app.fetch(new Request('https://test.invalid/present'),env);
 assert.equal(presResp.headers.get('x-talera-css-cleanup-phase2'),'applied');
 assert.equal(await presResp.text(),present.replace(presentBefore,presentAfter));
 const apiResp=await app.fetch(new Request('https://test.invalid/api/me'),env);
 assert.equal(apiResp.headers.get('x-talera-css-cleanup-phase2'),null);
 assert.equal(await apiResp.text(),home);
 const postResp=await app.fetch(new Request('https://test.invalid/present',{method:'POST'}),env);
 assert.equal(postResp.headers.get('x-talera-css-cleanup-phase2'),null);
 assert.equal(await postResp.text(),present);
 assert.deepEqual(seen,['/mijn-leven GET','/present GET','/api/me GET','/present POST']);
});
