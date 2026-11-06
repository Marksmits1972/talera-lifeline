import assert from 'node:assert/strict';
import test from 'node:test';
import {Script} from 'node:vm';
import worker,{injectVisualOnly} from './worker.mjs';
import frozen from '../one-flow/one-flow.worker.mjs';
const document='<!doctype html><html><head><meta name="theme-color" content="#fff"></head><body><header><button id="back">Terug</button></header><main><input type="file" accept="image/*,video/*"><button id="add">Foto’s toevoegen</button><button id="record">Vertellen</button><button id="save">Plaatsen</button></main><script>window.originalNavigationMarker=1;</script></body></html>';
const env={STYLE_BASE:{fetch:async()=>new Response(document,{status:200,headers:{'content-type':'text/html; charset=utf-8'}})}};
test('inject only markup and passive presentation; all original HTML survives byte-for-byte',()=>{
  const changed=injectVisualOnly(document);
  assert.notEqual(changed,document);
  const originalPieces=changed.replace(/<style id="talera-import-arrival-presentation-only">[\s\S]*?<\/style><script id="talera-import-arrival-readonly">[\s\S]*?<\/script>/,'');
  assert.equal(originalPieces,document);
  assert.equal(injectVisualOnly(changed),changed,'injection is idempotent');
  const code=changed.match(/<script id="talera-import-arrival-readonly">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(code,'passive visual script exists');
  assert.doesNotThrow(()=>new Script(code));
  assert.doesNotMatch(code,/preventDefault\s*\(|stopPropagation\s*\(|stopImmediatePropagation\s*\(|\.click\s*\(|\.submit\s*\(|location\s*=|location\.href\s*=|\.disabled\s*=/);
  assert.match(code,/addEventListener\('change'/);
  assert.match(code,/e.target.files/);
});
test('real PWA tell remains same route and same buttons with extra visual strip',async()=>{
  const req=new Request('https://real-pwa.invalid/tell');
  const res=await worker.fetch(req,env);
  assert.equal(res.status,200);
  assert.equal(res.headers.get('x-talera-pwa-visual-only'),'passive-file-input-observer');
  const html=await res.text();
  for(const control of ['id="back"','id="add"','id="record"','id="save"','window.originalNavigationMarker=1'])assert.ok(html.includes(control),control);
});
test('presentation and all other routes are unchanged relative to frozen Worker',async()=>{
  for(const path of ['/', '/present','/api/file','/other','/manifest.webmanifest']){
    const request=new Request('https://real-pwa.invalid'+path);
    const actual=await worker.fetch(request,env);
    const expected=await frozen.fetch(request,env);
    assert.equal(actual.status,expected.status,path);
    assert.equal(await actual.text(),await expected.text(),path);
    assert.equal(actual.headers.get('x-talera-pwa-visual-only'),null,path);
  }
});
test('no new handlers for buttons, navigation, uploads or recording',async()=>{
  const html=await (await worker.fetch(new Request('https://real-pwa.invalid/tell'),env)).text();
  const script=html.match(/<script id="talera-import-arrival-readonly">([\s\S]*?)<\/script>/)?.[1]||'';
  const rest=html.replace(/<style id="talera-import-arrival-presentation-only">[\s\S]*?<\/style><script id="talera-import-arrival-readonly">[\s\S]*?<\/script>/,'');
  assert.equal(rest,document);
  assert.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|indexedDB|localStorage|sessionStorage|postMessage|addEventListener\('submit'/);
});
