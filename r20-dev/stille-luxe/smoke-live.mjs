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
   }else{
    assert.equal(version,null,'presentation must not receive general styling');
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
