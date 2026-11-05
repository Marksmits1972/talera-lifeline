/**
 * TALERA Stille luxe: public read-only HTTP smoke test.
 * No credentials, cookies, private content, personal data or uploads.
 * No scripts from the PWA are executed.
 */
import assert from 'node:assert/strict';
const host='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';
const checks=[
 {path:'/',kind:'html',styled:true},
 {path:'/mijn-leven',kind:'html',styled:true},
 {path:'/tell',kind:'html',styled:true},
 {path:'/present',kind:'html',styled:false},
 {path:'/manifest.webmanifest',kind:'manifest'},
 {path:'/talera-stille-luxe-icon-180.png',kind:'png',size:180},
 {path:'/talera-stille-luxe-icon-192.png',kind:'png',size:192},
 {path:'/talera-stille-luxe-icon-512.png',kind:'png',size:512}
];
let failures=0;
for(const check of checks){
 try{
  const response=await fetch(host+check.path,{
   method:'GET',redirect:'manual',signal:AbortSignal.timeout(20000),
   headers:{'cache-control':'no-cache','user-agent':'TALERA-Style-ReadOnly-CI/1'}
  });
  const version=response.headers.get('x-talera-style');
  assert.equal(response.status,200,'HTTP '+response.status);
  if(check.kind==='html'){
   assert.match(response.headers.get('content-type')||'',/text\/html/);
   const text=await response.text();
   assert.match(text,/<html/i,'HTML document');
   assert.equal(text.includes('id="talera-stille-luxe"'),check.styled,'style expected only for ordinary pages');
   if(check.styled){
    assert.equal(version,'stille-luxe-v9-20261104');
    assert.match(text,/#304653/);
    assert.match(text,/#FFFFFF/);
    if(check.path==='/'||check.path==='/mijn-leven'){
      assert.match(text,/<html[^>]*data-talera-hero="true"/,'photo-led hero marker');
      assert.match(text,/<meta name="theme-color" content="#304653"/,'dark iPhone status-bar color');
      assert.match(text,/name=["']apple-mobile-web-app-status-bar-style["']\s+content=["']black-translucent/,'launcher must match /present for full-bleed photo above');
      assert.match(text,/\.mast\{background:transparent;color:#FFFFFF;/,'photographic mast not white');
    }
   }else{
    assert.equal(version,null,'presentation must not receive ordinary-page styling');
    assert.match(text,/name=["']apple-mobile-web-app-status-bar-style["']\s+content=["']black-translucent/,'verified photo beneath clock and battery');
    assert.match(text,/viewport-fit=cover/,'keep original viewport');
    assert.match(text,/name=["']theme-color["']\s+content=["']#000000/,'initial black presentation footer');
    assert.match(text,/<style id="talera-present-bottom-tint">/,'black lower safe-area color rules');
    assert.match(text,/<script id="talera-present-bottom-tint-script">/,'black/reading-paper color synchronizer');
    assert.match(text,/--talera-present-edge-color:#000000/,'black at start');
    assert.match(text,/--story-neutral/,'open reading panel reuses existing paper token');
    assert.match(text,/data-talera-present-reading/,'both black/paper states loaded up-front');
    assert.match(text,/scroll\.addEventListener\('scroll', sync/,'immediate readout update without scheduled frame');
    assert.match(text,/--talera-present-paper-rgb/,'reading footer follows source-paper RGB');
    assert.match(text,/talera-v26-reading/,'open reading state recognized');
    const tintScript=text.match(/<script id="talera-present-bottom-tint-script">([\s\S]*?)<\/script>/)?.[1]||'';
    assert.ok(tintScript,'isolated black/paper-color code present');
    assert.doesNotMatch(tintScript,/getImageData/,'fixed black switch contains no photo sampling; protected V9 may use canvas elsewhere');
    assert.doesNotMatch(text,/<style id="talera-present-ios-edge-to-edge">/,'no old overscan hacks');
    // Compare the entire protected R20/V9 body to its original live route.
    const baseline=await fetch(
      'https://talera-v61-r20-definitief-verwijderen-v9-20261104.mark-a39.workers.dev/present',
      {headers:{'cache-control':'no-cache','user-agent':'TALERA-Style-ReadOnly-CI/1'},
       signal:AbortSignal.timeout(20000)}
    );
    assert.equal(baseline.status,200,'V9 source is online');
    const baselineHtml=await baseline.text();
    const body=html=>{const match=/<\/head\s*>/i.exec(html);assert.ok(match,'head closes');return html.slice(match.index+match[0].length);};
    assert.equal(body(text),body(baselineHtml),'photo, narrated player, swipe and timeline markup unchanged');
   }
  }else if(check.kind==='manifest'){
   const manifest=await response.json();
   assert.equal(manifest.theme_color,'#FFFFFF');
   assert.equal(manifest.background_color,'#FFFFFF');
   assert.deepEqual(manifest.icons.map(x=>x.src),[
    '/talera-stille-luxe-icon-192.png',
    '/talera-stille-luxe-icon-512.png'
   ]);
  }else{
   assert.match(response.headers.get('content-type')||'',/image\/png/);
   const bytes=Buffer.from(await response.arrayBuffer());
   assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   assert.equal(bytes.readUInt32BE(16),check.size);
   assert.equal(bytes.readUInt32BE(20),check.size);
  }
  console.log('PASS',check.path,'status',response.status);
 }catch(error){
  failures++;
  console.error('FAIL',check.path,String(error.message||error));
 }
}
console.log('Live HTTP checks:',checks.length-failures,'/',checks.length,'passed');
if(failures)process.exitCode=1;
