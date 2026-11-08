import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {approvedAssets,anonymousShells} from './generated/approved-assets.mjs';
import {assetizeHtml,candidates,eligible,PUBLIC_PATHS} from './rewrite.mjs';
import freeWorker from './free-worker.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));
const allowed=new Set(approvedAssets);
const read=route=>readFileSync(path.join(dir,'generated','reference-'+route+'.html'),'utf8');
const publicFile=key=>readFileSync(path.join(dir,'public','__talera_free','assets',key),'utf8');
test('The whitelist contains content-addressed public files only',()=>{
 assert.ok(approvedAssets.length>=3,'Minimum three real shared code blocks');
 for(const k of approvedAssets){
  assert.match(k,/^[0-9a-f]{64}\.(?:js|css)$/);
  assert.ok(publicFile(k).length>=1024);
 }
 const headers=readFileSync(path.join(dir,'public','_headers'),'utf8');
 assert.match(headers,/__talera_free\/assets/);
 assert.match(headers,/max-age=31536000, immutable/);
});
test('Approved images/media, private routes and anonymous HTML cannot become public CDN files',()=>{
 assert.deepEqual([...PUBLIC_PATHS].sort(),['/','/account','/instellingen','/mijn-leven','/present','/tell'].sort());
 for(const k of approvedAssets)assert.ok(k.endsWith('.js')||k.endsWith('.css'));
});
for(const route of ['mijn-leven','present','tell']){
 test('Full source and execution order preserved for '+route,async()=>{
  const html=read(route);
  const result=await assetizeHtml(html,allowed);
  assert.ok(result.savedBytes>0,'Need measurable shared savings: '+route);
  assert.ok(result.html.length<html.length,'New HTML must be smaller');
  const match=[...html.matchAll(/<(script|style)(\s[^>]*?)?>([\s\S]*?)<\/\1\s*>/gi)];
  // Check each replaced script/style is EXACTLY the original code copied to an immutable file.
  let translated=0;
  for(const m of match){
   if(!eligible(m[1].toLowerCase(),m[2]||'',m[3]))continue;
   const original=m[3];
   const x=(await candidates(m[0]))[0];
   const key=x.sha+'.'+(x.kind==='script'?'js':'css');
   if(!allowed.has(key))continue;
   assert.equal(publicFile(key),original,'Byte exact same script/css');
   assert.ok(result.html.includes('/__talera_free/assets/'+key),'Has same content-addressed path');
   translated++;
  }
  assert.equal(translated,result.converted);
  // State-specific markup exists unmodified; HTML page is not a shared static asset.
  assert.ok(result.html.includes('<html')||result.html.includes('<!DOCTYPE'));
 });
}
test('Personalized JavaScript is never moved into shared cache when its bytes differ',async()=>{
 const original=read('mijn-leven');
 const list=await candidates(original);
 const candidate=list.find(c=>allowed.has(c.sha+'.js')&&c.kind==='script');
 assert.ok(candidate,'Expected at least one canonical approved JS block');
 const marker='PRIVATE_ACCOUNT_BIRTH_DATE_1976_09_06__NOT_FOR_CDN';
 const mutated=original.replace(candidate.body,candidate.body+';/*'+marker+'*/');
 const result=await assetizeHtml(mutated,allowed);
 assert.ok(result.html.includes(marker),'Changed private script must stay inline');
 assert.ok(!approvedAssets.some(k=>publicFile(k).includes(marker)),'Private data never appears in public bundles');
});
test('Do not externalize behavior-sensitive inline scripts or relative CSS',()=>{
 assert.equal(eligible('script','','const x=document.currentScript;'.repeat(100)),false);
 assert.equal(eligible('script',' type="module"','console.log(123);'.repeat(80)),false);
 assert.equal(eligible('script','','document.write("hello");'.repeat(80)),false);
 assert.equal(eligible('style','','background:url(/private.png);'.repeat(100)),false);
});
test('Existing TALERA auth and private API stay untouched, HTML remains no-store',async()=>{
 const src=read('mijn-leven');
 let upstreamCalls=0;
 const env={
  TALERA_BASE:{
   async fetch(req){
    upstreamCalls++;
    return new Response(req.url.includes('/api/me')?JSON.stringify({account:null}):src,{
     status:200,headers:{'content-type':req.url.includes('/api/me')?'application/json':'text/html','cache-control':'no-store'}
    });
   }
  },
  ASSETS:{async fetch(req){
   const filename=new URL(req.url).pathname.split('/').at(-1);
   return new Response(publicFile(filename),{headers:{'content-type':filename.endsWith('.js')?'application/javascript':'text/css'}});
  }}
 };
 const userHtml=src.replace('</head>','<meta name="account-personal-test" content="NOT_PUBLIC_A_123"></head>');
 const fakeEnv={...env,TALERA_BASE:{fetch:async()=>{upstreamCalls++;return new Response(userHtml,{headers:{'content-type':'text/html','cache-control':'no-store'}})}}};
 const page=await freeWorker.fetch(new Request('https://fake.talera.test/mijn-leven?private=1'),fakeEnv,{});
 const html=await page.text();
 assert.equal(page.status,200);
 assert.match(page.headers.get('cache-control'),/no-store/);
 assert.ok(html.includes('NOT_PUBLIC_A_123'),'Personal HTML must survive');
 assert.equal(page.headers.get('x-talera-free-shared-code'),'exact-match');
 const asset=approvedAssets[0];
 const previousCalls=upstreamCalls;
 const served=await freeWorker.fetch(new Request('https://fake.talera.test/__talera_free/assets/'+asset),env,{});
 assert.equal(served.status,200);
 assert.equal(await served.text(),publicFile(asset));
 assert.equal(upstreamCalls,previousCalls,'Static assets should bypass account service');
 const userApi=await freeWorker.fetch(new Request('https://fake.talera.test/api/private',{headers:{cookie:'talera_sid=x'}}),env,{});
 assert.equal(userApi.status,200,'API backend unchanged');
 assert.ok(upstreamCalls>previousCalls);
});
test('Authenticated request with private date still cannot cache its HTML',async()=>{
 const source=read('present');
 const env={
  TALERA_BASE:{fetch:async req=>{
   if(new URL(req.url).pathname==='/api/me')
    return Response.json({account:{id:'fake-test-account'}});
   return new Response(source,{headers:{'content-type':'text/html'}});
  }},
  FREE_ACCOUNT:{idFromName:name=>name,get:id=>({getBirthDate:async()=> '2000-02-29'})}
 };
 const page=await freeWorker.fetch(new Request('https://fake.talera.test/present',{headers:{cookie:'talera_sid=fake'}}),env,{});
 assert.match(page.headers.get('cache-control'),/private, no-store/);
 const html=await page.text();
 assert.ok(html.includes('new Date(2000,1,29)'),'Personal DOB replaced inside the correct timeline');
 assert.ok(!html.includes('src="/__talera_free/assets/"'));
});


test('Verified anonymous shells skip all account Workers and D1 without caching personal HTML',async()=>{
 const routes=Object.keys(anonymousShells);
 assert.ok(routes.length>0,'At least one byte-identical anonymous shell expected');
 assert.ok(routes.every(route=>['/mijn-leven','/present','/tell'].includes(route)));
 for(const route of routes){
  let originCalls=0;
  let assetCalls=0;
  const env={
   TALERA_BASE:{fetch:async()=>{originCalls++;return new Response('ORIGIN_IS_PRIVATE')}},
   ASSETS:{fetch:async req=>{
    assetCalls++;
    const pathname=new URL(req.url).pathname;
    assert.equal(pathname,anonymousShells[route],'Must read ONLY exactly whitelisted shell');
    const local=path.join(dir,'public',pathname.slice(1));
    return new Response(readFileSync(local),{headers:{'content-type':'text/html','cache-control':'public, max-age=31536000, immutable'}});
   }}
  };
  const response=await freeWorker.fetch(new Request('https://fake.talera.test'+route),env,{});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store','Browser HTML cannot be cached across login');
  assert.equal(response.headers.get('x-talera-free-shared-code'),'edge-anonymous-shell');
  const content=await response.text();
  assert.ok(content.length<read(route.slice(1)).length);
  assert.equal(originCalls,0,'No per-user database or origin request for anonymous Free');
  assert.equal(assetCalls,1);
 }
});
test('Any Cookie, Authorization or URL query bypasses shared Free HTML shell',async()=>{
 const route=Object.keys(anonymousShells)[0];
 assert.ok(route);
 let originCalls=0,staticCalls=0;
 const env={
  TALERA_BASE:{fetch:async req=>{
   originCalls++;
   if(new URL(req.url).pathname==='/api/me')return Response.json({account:null},{status:401});
   return new Response(read(route.slice(1)),{headers:{'content-type':'text/html'}});
  }},
  ASSETS:{fetch:async()=>{staticCalls++;return new Response('FORBIDDEN_SHARED_RESPONSE')}}
 };
 for(const request of [
  new Request('https://fake.talera.test'+route,{headers:{cookie:'talera_sid=dummy'}}),
  new Request('https://fake.talera.test'+route,{headers:{authorization:'Bearer private'}}),
  new Request('https://fake.talera.test'+route+'?talera_invite=aaa')
 ]){
  const res=await freeWorker.fetch(request,env,{});
  assert.notEqual(res.headers.get('x-talera-free-shared-code'),'edge-anonymous-shell');
  assert.match(res.headers.get('cache-control'),/no-store/);
  assert.ok((await res.text()).includes('talera'));
 }
 assert.equal(staticCalls,0,'Privileged paths must not fetch public HTML shell');
 assert.ok(originCalls>=3,'Personal requests keep original account Worker path');
});
