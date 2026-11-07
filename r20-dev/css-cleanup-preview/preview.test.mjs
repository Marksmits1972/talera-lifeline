import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import app, {cleanPreviewHtml} from './preview.worker.mjs';

const source=readFileSync(new URL('./preview.worker.mjs',import.meta.url),'utf8');
function getLiteral(name){
 const m=source.match(new RegExp('const '+name+' = ("(?:\\\\.|[^"\\\\])*");'));
 if(!m)throw Error('Missing '+name);
 return JSON.parse(m[1]);
}
const before=getLiteral('BEFORE_CSS');
const after=getLiteral('AFTER_CSS');
const tag='<style id="talera-stille-luxe">';
function winners(css){
 const rules=[...css.matchAll(/([^{}]+)\\{([^{}]*)\\}/g)];
 const map=new Map();
 for(const rule of rules){
  const sel=rule[1].replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').trim().replace(/\\s+/g,' ');
  if(!sel||sel.startsWith('@'))continue;
  for(const d of rule[2].matchAll(/([\\w-]+)\\s*:\\s*([^;]+);/g)){
   const key=sel+'||'+d[1], value=d[2].trim(),important=value.includes('!important');
   const existing=map.get(key);
   if(!existing||!existing.important||important)map.set(key,{value,important});
  }
 }
 return [...map.entries()].sort(([a],[b])=>a.localeCompare(b));
}

test('Only 560 characters of superseded CSS, all winning declarations identical',()=>{
 assert.equal(before.length-after.length,560);
 assert.deepEqual(winners(before),winners(after));
});
test('Rewrites one existing style, leaving scripts and other HTML identical',()=>{
 const html='<html><head>'+tag+before+'</style><script>window.talera=1;</script></head><body>Test</body></html>';
 const value=cleanPreviewHtml(html);
 assert.equal(value.status,'applied');
 assert.equal(value.html,html.replace(before,after));
 assert.match(value.html,/window\\.talera=1/);
});
test('Never rewrites unmatched / missing / ambiguous style',()=>{
 for(const input of [
  '<html><script>window.test=1</script></html>',
  tag+before+' extra</style>',
  tag+before+'</style>'+tag+before+'</style>',
  tag+before
 ]){
  const result=cleanPreviewHtml(input);
  assert.notEqual(result.status,'applied');
  assert.equal(result.html,input);
 }
});
test('GET home previews CSS, but /present and /api are untouched',async()=>{
 const body='<html><head>'+tag+before+'</style></head><body>OK</body></html>';
 const paths=[];
 const env={TALERA_BASE:{fetch:async req=>{
  paths.push(new URL(req.url).pathname);
  return new Response(body,{headers:{'content-type':'text/html; charset=UTF-8','etag':'old','content-length':String(body.length)}});
 }}};
 const home=await app.fetch(new Request('https://test.invalid/mijn-leven'),env);
 assert.equal(home.headers.get('x-talera-css-cleanup-phase1'),'applied');
 assert.equal(home.headers.get('etag'),null);
 assert.match(await home.text(),/OK/);
 const present=await app.fetch(new Request('https://test.invalid/present'),env);
 assert.equal(present.headers.get('x-talera-css-cleanup-phase1'),null);
 assert.equal(await present.text(),body);
 const api=await app.fetch(new Request('https://test.invalid/api/me'),env);
 assert.equal(await api.text(),body);
 assert.deepEqual(paths,['/mijn-leven','/present','/api/me']);
});
