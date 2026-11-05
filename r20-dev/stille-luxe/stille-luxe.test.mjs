import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync,inflateSync} from 'node:zlib';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import app from './stille-luxe.worker.mjs';

const origin='https://staging.example.test';
const testHtml= [
 '<!doctype html><html><head>',
 '<meta name="theme-color" content="#e7a98b">',
 '<style>.nav-item{color:#337cca}.story.active{background:#eaf4ff}#photoStage{background:#fbfaf7}.talera-v61-narration-visual #photoLayerA{background:#337cca}</style>',
 '<script id="talera-player">const COLOR="#337cca";const inner="<style>.frame{color:#337cca}</style>";</script>',
 '<style id="talera-v8-player-clock">.clock{color:#337cca}</style>',
 '</head><body class="app"><div class="logo">TALERA</div></body></html>'
].join('');
function mock(body,{status=200,contentType='text/html'}={}){
 const seen=[];
 const env={V9_BASE:{fetch:async request=>{
  seen.push({method:request.method,path:new URL(request.url).pathname});
  return new Response(body,{status,headers:{'content-type':contentType,'etag':'original-hash'}});
 }}};
 return {env,seen};
}
test('actual HTML styles normalized, while player JavaScript and its embedded CSS remain intact',async()=>{
 const {env}=mock(testHtml);
 const response=await app.fetch(new Request(origin+'/mijn-leven'),env);
 const html=await response.text();
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-talera-style'),'stille-luxe-v9-20261104');
 assert.equal(response.headers.get('etag'),null);
 assert.match(html,/\.nav-item\{color:#304653\}/);
 assert.match(html,/\.story\.active\{background:#F7F5F0\}/);
 assert.match(html,/const COLOR="#337cca"/);
 assert.match(html,/const inner="<style>\.frame\{color:#337cca\}<\/style>"/);
 assert.match(html,/\.clock\{color:#337cca\}/);
 assert.match(html,/#photoStage\{background:#fbfaf7\}/);
 assert.match(html,/\.talera-v61-narration-visual #photoLayerA\{background:#337cca\}/);
 assert.match(html,/content="#FFFFFF"/);
 assert.match(html,/id="talera-stille-luxe"/);
 assert.equal((html.match(/id="talera-stille-luxe"/g)||[]).length,1);
});
test('repeated styling does not duplicate the central CSS block',async()=>{
 const first=await app.fetch(new Request(origin+'/tell'),mock(testHtml).env);
 const again=await app.fetch(new Request(origin+'/tell'),mock(await first.text()).env);
 const s=await again.text();
 assert.equal((s.match(/id="talera-stille-luxe"/g)||[]).length,1);
});
test('historical working photo status returns, only head changes and bottom tint handler is installed',async()=>{
 const original='<!doctype html><html><head>'+
 '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
 '<meta name="apple-mobile-web-app-capable" content="yes">'+
 '<meta name="apple-mobile-web-app-status-bar-style" content="default">'+
 '<meta name="theme-color" content="#ffffff">'+
 '</head><body><div id="photoStage"><img src="image.jpg"></div>'+
 '<script>const narrator="DO NOT TOUCH";const swipe={duration:500};</script></body></html>';
 const response=await app.fetch(new Request(origin+'/present'),mock(original).env);
 const changed=await response.text();
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-talera-style'),null);
 assert.match(changed,/name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
 assert.match(changed,/name="theme-color" content="#000000"/);
 assert.match(changed,/viewport-fit=cover/);
 assert.match(changed,/<style id="talera-present-bottom-tint">/);
 assert.match(changed,/<script id="talera-present-bottom-tint-script">/);
 assert.match(changed,/FOOTER_PAPER_AT_PX = 75/,'defer paper-colored footer until sheet is mostly opaque');
 assert.match(changed,/--story-neutral/);
 assert.doesNotMatch(changed,/getImageData/,'no photo color analysis in black bar test');
 assert.match(changed,/theme\.setAttribute\('content', color\)/);
 assert.match(changed,/isReading\(\)/);
 assert.doesNotMatch(changed,/talera-present-ios-edge-to-edge/);
 assert.doesNotMatch(changed,/100dvh \+ env\(safe-area-inset-top/);
 assert.equal(changed.slice(changed.indexOf('</head>')+7),original.slice(original.indexOf('</head>')+7));
 assert.equal((changed.match(/name="apple-mobile-web-app-status-bar-style"/g)||[]).length,1);
 const again=await app.fetch(new Request(origin+'/present'),mock(changed).env);
 assert.equal(await again.text(),changed,'presentation head transform must be idempotent');
});
test('photo presentation with no metadata receives safe working historic top plus adaptive bottom',async()=>{
 const original='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div class="timeline">keep</div><script>originalPlayer()</script></body></html>';
 const res=await app.fetch(new Request(origin+'/present/'),mock(original).env);
 const changed=await res.text();
 assert.match(changed,/name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
 assert.match(changed,/name="theme-color" content="#000000"/);
 assert.match(changed,/talera-present-bottom-tint-script/);
 assert.equal(changed.slice(changed.indexOf('</head>')+7),original.slice(original.indexOf('</head>')+7));
});
test('private APIs and unrelated paths are forwarded without styling',async()=>{
 const {env,seen}=mock('{"secret":"untouched"}',{contentType:'application/json'});
 const out=await app.fetch(new Request(origin+'/api/v9/memory'),env);
 assert.equal(await out.text(),'{"secret":"untouched"}');
 assert.deepEqual(seen,[{method:'GET',path:'/api/v9/memory'}]);
});
test('data-changing requests are forwarded and never rewritten',async()=>{
 const {env,seen}=mock(testHtml);
 const out=await app.fetch(new Request(origin+'/tell',{method:'POST',body:'test'}),env);
 assert.equal(await out.text(),testHtml);
 assert.deepEqual(seen,[{method:'POST',path:'/tell'}]);
});
test('manifest keeps other metadata but serves exact branded icon sizes and white theme',async()=>{
 const input={name:'TALERA',start_url:'/',display:'standalone',theme_color:'#123456',background_color:'#eeeeee',icons:[{src:'/old.png'}]};
 const {env}=mock(JSON.stringify(input),{contentType:'application/manifest+json'});
 const res=await app.fetch(new Request(origin+'/manifest.webmanifest'),env);
 const out=await res.json();
 assert.equal(out.name,input.name);
 assert.equal(out.display,input.display);
 assert.equal(out.theme_color,'#FFFFFF');
 assert.equal(out.background_color,'#FFFFFF');
 assert.deepEqual(out.icons.map(i=>i.src),['/talera-stille-luxe-icon-192.png','/talera-stille-luxe-icon-512.png']);
});
test('unparseable manifest remains unchanged rather than breaking installation',async()=>{
 const {env}=mock('not json',{contentType:'application/manifest+json'});
 const out=await app.fetch(new Request(origin+'/manifest.webmanifest'),env);
 assert.equal(await out.text(),'not json');
});
test('service binding absence fails closed rather than touching another app',async()=>{
 const out=await app.fetch(new Request(origin+'/mijn-leven'),{});
 assert.equal(out.status,503);
 assert.match(await out.text(),/V9-herstelbasis ontbreekt/);
});
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function be32(n){const x=Buffer.alloc(4);x.writeUInt32BE(n>>>0);return x;}
function chunk(t,bytes){const text=Buffer.from(t);return Buffer.concat([be32(bytes.length),text,bytes,be32(crc32(Buffer.concat([text,bytes])))]);}
function makePng(){const w=12,h=1,bytes=Buffer.alloc(1+w*3,255);bytes[0]=0;const set=(x,r,g,b)=>{bytes[1+x*3]=r;bytes[2+x*3]=g;bytes[3+x*3]=b;};set(0,0,30,180);set(7,40,100,200);set(11,60,150,220);const hdr=Buffer.alloc(13);hdr.writeUInt32BE(w,0);hdr.writeUInt32BE(h,4);hdr[8]=8;hdr[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',hdr),chunk('IDAT',deflateSync(bytes)),chunk('IEND',Buffer.alloc(0))]);}
function readPng(png){const ids=[];for(let i=8;i+12<=png.length;){const n=png.readUInt32BE(i),type=png.toString('ascii',i+4,i+8);if(type==='IDAT')ids.push(png.subarray(i+8,i+8+n));i+=n+12;if(type==='IEND')break;}return inflateSync(Buffer.concat(ids));}
test('original PNG image geometry and white route are preserved while all three panel colors are applied',async()=>{
 const original=makePng();
 const seen=[];
 const env={V9_BASE:{fetch:async req=>{seen.push(new URL(req.url).pathname);return new Response(original,{headers:{'content-type':'image/png'}});}}};
 const response=await app.fetch(new Request(origin+'/pwa-192.png'),env);
 const png=Buffer.from(await response.arrayBuffer());
 assert.equal(response.status,200);
 assert.equal(response.headers.get('content-type'),'image/png');
 assert.deepEqual(seen,['/talera-brand-v3-192.png']);
 assert.equal(png.readUInt32BE(16),12);
 assert.equal(png.readUInt32BE(20),1);
 const raw=readPng(png);
 const pixel=x=>Array.from(raw.subarray(1+x*3,4+x*3));
 assert.deepEqual(pixel(0),[48,70,83]);
 assert.deepEqual(pixel(4),[255,255,255]);
 assert.deepEqual(pixel(7),[113,141,154]);
 assert.deepEqual(pixel(11),[181,198,205]);
});


test('photo-memory headline remains white for legibility without changing the photo layer',()=>{
 const css=readFileSync(new URL('./stille-luxe.css',import.meta.url),'utf8');
 assert.match(css,/\.hero-caption,\.hero-caption h1,\.hero-caption small\{color:#FFFFFF;\}/);
 assert.doesNotMatch(css,/\.hero\s*img\s*\{/);
 assert.doesNotMatch(css,/#photoStage\s*\{/);
});

test('approved photo-led homepage has ink-blue status bar and no white mast override',async()=>{
 const hero='<!doctype html><html lang="nl"><head><meta name="theme-color" content="#fff"></head><body><section class="hero"></section><header class="mast"><div class="logo">TALERA</div></header><div class="hero-caption main-only"><h1>Herinnering</h1></div><div class="life-sheet"></div></body></html>';
 const {env}=mock(hero);
 const res=await app.fetch(new Request(origin+'/mijn-leven'),env);
 const output=await res.text();
 assert.match(output,/<html data-talera-hero="true" lang="nl">/);
 assert.match(output,/<meta name="theme-color" content="#304653">/);
 assert.match(output,/\.hero\{background:#304653;\}/);
 assert.match(output,/\.mast\{background:transparent;color:#FFFFFF;\}/);
 assert.match(output,/\.mast \.logo\{color:#FFFFFF/);
 assert.match(output,/html\[data-talera-hero="true"\],html\[data-talera-hero="true"\] body\{background-color:#FFFFFF;\}/);
 assert.match(output,/name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
 assert.doesNotMatch(output,/html\[data-talera-hero="true"\] body\{background-color:#304653;\}/);
 assert.doesNotMatch(output,/header:not\(\.presentation-header\)\)\{background-color:#FFFFFF;\}/);
 assert.match(output,/\.hero-caption/);
 const twice=await app.fetch(new Request(origin+'/mijn-leven'),mock(output).env);
 const second=await twice.text();
 assert.equal((second.match(/<html data-talera-hero="true"/g)||[]).length,1);
 assert.equal((second.match(/id="talera-stille-luxe"/g)||[]).length,1);
});
test('native editor visuals change only color tokens, not recording or toolbar geometry',()=>{
 const css=readFileSync(new URL('./stille-luxe.css',import.meta.url),'utf8');
 assert.match(css,/\.talera-r16-toolbar #publish\{background-color:#304653!important/);
 assert.match(css,/#v30DateBox #v30DateCancel\{background:#FFFFFF/);
 assert.match(css,/#v30DateBox #v30DateSave\{background:#304653/);
 assert.doesNotMatch(css,/#taleraV61RecControls\s*\{/);
 assert.doesNotMatch(css,/#photoLayerA\s*\{/);
});

test('reading-sheet fades faster and footer stays black until paper is almost solid',async()=>{
 const original='<!doctype html><html><head><meta name="theme-color" content="#ffffff"></head><body></body></html>';
 const response=await app.fetch(new Request(origin+'/present'),mock(original).env);
 const html=await response.text();
 const script=html.match(/<script id="talera-present-bottom-tint-script">([\s\S]*?)<\/script>/)?.[1];
 const style=html.match(/<style id="talera-present-bottom-tint">([\s\S]*?)<\/style>/)?.[1];
 assert.ok(script&&style,'only presentation-injected style and color sync');
 assert.match(style,/html,body\{background-color:#000000!important/,'photo footer black from initial paint');
 assert.match(style,/html\[data-talera-present-reading="true"\]/,'solid paper state preloaded');
 assert.match(style,/#memoryCaption\{/,'only existing raised story sheet is restyled');
 assert.match(style,/--talera-v28-paper-alpha:var\(--talera-present-sheet-alpha,0\)!important/,'overrides slow V28 paper fade');
 assert.match(style,/--talera-v28-title-color:var\(--talera-present-sheet-title,#FFFFFF\)!important/,'text contrast transitions with paper');
 assert.doesNotMatch(style,/html:has\(/,'old early-white reading class selectors removed');
 assert.match(script,/SHEET_FADE_PX = 78/,'paper fade tuned to 78px vs original V28 155px');
 assert.match(script,/FOOTER_PAPER_AT_PX = 60/,'send iOS paper request at 86 percent opacity to allow browser response time');
 assert.doesNotMatch(script,/requestAnimationFrame\(/,'synchronous without added timers');
 assert.doesNotMatch(script,/getImageData|drawImage|activePhoto/,'photo and swipe layers untouched');
 const vars={},attrs={},events={};let themeValue='',paper='247,244,239',queued=0;
 const scroll={scrollTop:0,classList:{contains:()=>false},
  addEventListener:(name,fn)=>events['scroll:'+name]=fn};
 const space={classList:{contains:()=>false}};
 const card={};
 const theme={setAttribute:(key,value)=>{if(key==='content')themeValue=value;}};
 const doc={
  readyState:'complete',
  documentElement:{style:{setProperty:(key,value)=>vars[key]=value},
   setAttribute:(key,value)=>attrs[key]=value},
  body:{style:{setProperty:()=>{throw Error('body must be governed by CSS rules');}}},
  querySelector:q=>q==='.memory-space'?space:q==='meta[name="theme-color"]'?theme:null,
  getElementById:q=>q==='memoryStoryScroll'?scroll:q==='memoryCaption'?card:null,
  addEventListener:(name,fn)=>events['document:'+name]=fn
 };
 runInNewContext(script,{
  window:{addEventListener:(name,fn)=>events['window:'+name]=fn},
  document:doc,
  getComputedStyle:element=>element===space?{
    getPropertyValue:key=>key==='--story-neutral'?paper:''
  }:{backgroundColor:'rgb(247, 244, 239)'},
  MutationObserver:class{observe(){}},
  requestAnimationFrame:()=>{queued++;return 1;}
 });
 assert.equal(vars['--talera-present-paper-rgb'],'247,244,239','paper read once up-front from same V9 token');
 assert.equal(themeValue,'#000000','initial footer black');
 for(const y of [1,18,40,45,59]){
   scroll.scrollTop=y;
   events['scroll:scroll']();
   assert.equal(attrs['data-talera-present-reading'],'false','black footer before 60px, scroll='+y);
   assert.equal(themeValue,'#000000','no early white native request at scroll='+y);
 }
 assert.ok(Number(vars['--talera-present-sheet-alpha'])>.9,'paper has already almost solidified before footer switches');
 scroll.scrollTop=45;
 events['scroll:scroll']();
 assert.equal(vars['--talera-present-sheet-title'],'rgb(255,255,255)','heading stays fully light at 45px');
 scroll.scrollTop=60;
 events['scroll:scroll']();
 assert.equal(attrs['data-talera-present-reading'],'true','paper tint requested at 60px');
 assert.equal(themeValue,'#F7F4EF','footer matches actual sheet token');
 assert.ok(Number(vars['--talera-present-sheet-alpha'])>.86,'paper is at least 86 percent opaque when tint is requested');
 scroll.scrollTop=78;
 events['scroll:scroll']();
 assert.equal(vars['--talera-present-sheet-alpha'],'1.0000','full paper by 78px');
 assert.equal(vars['--talera-present-sheet-shadow'],'0.000','dark text fully legible');
 scroll.scrollTop=0;
 events['scroll:scroll']();
 assert.equal(attrs['data-talera-present-reading'],'false','black CSS restored on sheet collapse');
 assert.equal(themeValue,'#000000');
 assert.equal(vars['--talera-present-sheet-alpha'],'0.0000','photo title returns');
 assert.equal(queued,0,'never wait for a new JS animation frame');
});

test('all ordinary HTML entry routes request the same iOS status mode as presentation',async()=>{
 for(const path of ['/','/mijn-leven','/tell','/meer']){
  const html='<!doctype html><html><head><meta name="apple-mobile-web-app-status-bar-style" content="default"></head><body><main>original</main></body></html>';
  const res=await app.fetch(new Request(origin+path),mock(html).env);
  const out=await res.text();
  assert.match(out,/name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.doesNotMatch(out,/name="apple-mobile-web-app-status-bar-style" content="default"/);
  assert.equal((out.match(/name="apple-mobile-web-app-status-bar-style"/g)||[]).length,1);
  assert.match(out,/html,body\{background-color:#FFFFFF/,'ordinary canvas stays white');
 }
});
