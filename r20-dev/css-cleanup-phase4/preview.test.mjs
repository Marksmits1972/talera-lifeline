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
 assert.equal(homeBefore.length-homeAfter.length,725);
 const ignored=new Set([
  '#sheetBody #v17-timebox .v17-rail-ruler|background-color',
  '#sheetBody #v17-timebox .v17-rail-progress|background-color'
 ]);
 const withoutSuperseded=rules=>rules.filter(([key])=>!ignored.has(key));
 assert.deepEqual(withoutSuperseded(winnerMap(homeBefore)),withoutSuperseded(winnerMap(homeAfter)));
 assert.match(homeAfter,/#sheetBody #v17-timebox \.v17-rail-ruler\{background:transparent!important;border:0!important;box-shadow:none!important;\}/);
 assert.match(homeAfter,/#sheetBody #v17-timebox \.v17-rail-progress\{background:transparent!important;border:0!important;box-shadow:none!important;\}/);
});
test('Phase 4 removes exactly two earlier, now invisible timeline rail backgrounds',()=>{
 const prevSource=readFileSync(new URL('../tell-header-fix/preview.worker.mjs',import.meta.url),'utf8');
 const match=prevSource.match(new RegExp('const AFTER_CSS = ("(?:\\\\.|[^"\\\\])*");'));
 assert.ok(match,'Prior accepted phase 3+header CSS source');
 const previously=JSON.parse(match[1]);
 const redundant=[
  '#sheetBody #v17-timebox .v17-rail-ruler{background-color:rgba(85,121,169,.42);}\n',
  '#sheetBody #v17-timebox .v17-rail-progress{background-color:var(--talera-blue-mid);}\n'
 ];
 let expected=previously;
 for(const rule of redundant){
  assert.ok(expected.includes(rule),'Previous style has obsolete rail color');
  expected=expected.replace(rule,'');
  assert.ok(!homeAfter.includes(rule),'Obsolete rail color removed');
 }
 assert.equal(previously.length-homeAfter.length,165);
 assert.equal(expected,homeAfter,'Only two exact redundant rules were removed');
});

test('Phases 2–3 active presentation CSS winners remain unchanged',()=>{
 assert.equal(presentBefore.length-presentAfter.length,831);
 assert.deepEqual(winnerMap(presentBefore),winnerMap(presentAfter));
 assert.match(presentBefore,/TALERA touch repair/);
 assert.match(presentAfter,/TALERA touch repair/);
 assert.match(presentAfter,/TALERA PWA alignment/);
 assert.match(presentAfter,/width:45px!important;height:45px!important/);
 assert.match(presentAfter,/width:34px!important;height:34px!important/);
 assert.match(presentAfter,/border-radius:50%!important/);
 assert.match(presentAfter,/body\.talera-v18-reading/);
});

test('Phase 3 only removes 4 superseded chevron rules; active arrow remains 9px',()=>{
 const previous=readFileSync(new URL('../css-cleanup-phase2/preview.worker.mjs',import.meta.url),'utf8');
 const m=previous.match(new RegExp('const AFTER_PRESENT_CSS = ("(?:\\\\.|[^"\\\\])*");'));
 assert.ok(m,'Phase 2 CSS baseline');
 const phase2CSS=JSON.parse(m[1]);
 assert.equal(phase2CSS.length-presentAfter.length,140);
 assert.deepEqual(winnerMap(phase2CSS),winnerMap(presentAfter));
 for(const discarded of [
  ' left:calc(50% + 2px)!important;',
  ' width:15px!important;',
  ' height:15px!important;',
  ' filter:drop-shadow(0 1px 2px rgba(7,26,61,.55))!important;'
 ]) {
  assert.ok(phase2CSS.includes(discarded),'Expected old declaration: '+discarded);
  assert.ok(!presentAfter.includes(discarded),'No obsolete declaration: '+discarded);
 }
 for(const current of [
  ' left:calc(50% + 1px)!important;',
  ' width:9px!important;',
  ' height:9px!important;',
  ' filter:drop-shadow(0 1px 1px rgba(50,50,50,.27))!important;'
 ])assert.ok(presentAfter.includes(current),'Final chevron protected '+current);
});

test('Presentation and home HTML are changed only in the existing exact CSS block',()=>{
 for(const [route,tag,oldCss,newCss] of [
  ['/mijn-leven',homeTag,homeBefore,homeAfter],
  ['/tell',homeTag,homeBefore,homeAfter.replace(":is(.topbar,header:not(.presentation-header):not(.mast)){background-color:#FFFFFF;}",":is(.topbar,header:not(.presentation-header):not(.mast)){background-color:#FFFFFF;}\n#app>header.top{background-color:#f8f7f4;}")],
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

test('Tell header is the existing #f8f7f4 canvas color and no other route changes',()=>{
 const originalHtml='<html><head>'+homeTag+homeBefore+'</style></head><body><div id="app"><header class="top"><button id="back">Back</button><strong>TALERA</strong></header></div></body></html>';
 const oldHome=cleanPreviewHtml(originalHtml,'/mijn-leven');
 const tell=cleanPreviewHtml(originalHtml,'/tell');
 assert.equal(oldHome.status,'applied');
 assert.equal(tell.status,'applied');
 assert.notEqual(tell.html,oldHome.html);
 const homeStyle=oldHome.html.split('</style>')[0];
 assert.ok(!homeStyle.includes("#app>header.top{background-color:#f8f7f4;}"),'Home remains untouched');
 const fixStyle=tell.html.split('</style>')[0];
 assert.ok(fixStyle.includes("#app>header.top{background-color:#f8f7f4;}"),'Tell uses exact canvas color');
 assert.ok(fixStyle.includes(":is(.topbar,header:not(.presentation-header):not(.mast)){background-color:#FFFFFF;}"),'Existing global rule unchanged');
 assert.equal(tell.html.replace(fixStyle,homeStyle),oldHome.html);
 assert.ok(tell.html.includes('<button id="back">Back</button><strong>TALERA</strong>'));
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
 assert.equal(homeResp.headers.get('x-talera-css-cleanup-phase4'),'applied');
 assert.equal(homeResp.headers.get('etag'),null);
 assert.equal(await homeResp.text(),home.replace(homeBefore,homeAfter));
 const presResp=await app.fetch(new Request('https://test.invalid/present'),env);
 assert.equal(presResp.headers.get('x-talera-css-cleanup-phase4'),'applied');
 assert.equal(await presResp.text(),present.replace(presentBefore,presentAfter));
 const apiResp=await app.fetch(new Request('https://test.invalid/api/me'),env);
 assert.equal(apiResp.headers.get('x-talera-css-cleanup-phase4'),null);
 assert.equal(await apiResp.text(),home);
 const postResp=await app.fetch(new Request('https://test.invalid/present',{method:'POST'}),env);
 assert.equal(postResp.headers.get('x-talera-css-cleanup-phase4'),null);
 assert.equal(await postResp.text(),present);
 assert.deepEqual(seen,['/mijn-leven GET','/present GET','/api/me GET','/present POST']);
});
