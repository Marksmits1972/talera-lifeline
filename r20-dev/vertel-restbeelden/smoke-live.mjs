/* Read-only public smoke for the separate V10 Worker.
 * Never submits voices, media, user identifiers or uploads.
 */
import assert from 'node:assert/strict';
import {Script} from 'node:vm';

const base=process.env.TALERA_V10_TEST_URL ||
 'https://talera-vertel-restbeelden-v10-test-20261105.mark-a39.workers.dev';
const checks=[
 {path:'/vertelmodus-embed?mode=present',expect:'installed'},
 {path:'/vertelmodus-embed?mode=record',expect:'installed'},
 {path:'/',expect:null},
 {path:'/present',expect:null},
 {path:'/tell',expect:null}
];
let passes=0;
for(const check of checks){
 const resp=await fetch(base+check.path,{headers:{'cache-control':'no-cache'},redirect:'manual'});
 assert.equal(resp.status,200,check.path+' status must be OK');
 const contentType=resp.headers.get('content-type')||'';
 assert.match(contentType,/text\/html/,check.path+' remains HTML');
 const text=await resp.text();
 assert.ok(text.length>250,'real page body '+check.path);
 assert.equal(resp.headers.get('x-talera-v10-tail-photos'),check.expect,check.path+' must only be changed at embed');
 if(check.expect==='installed'){
   assert.match(text,/function taleraV10PlayRemainingPhotosThenVideos/,'only one photo tail helper added');
   assert.match(text,/voice\.addEventListener\("ended",function\(\)\{if\(state\.media/,'original voice-ended callback structure stays intact');
   assert.match(text,/if\(!taleraV10PlayRemainingPhotosThenVideos\(\)\)/,'only original call is redirected to photo check');
   assert.match(text,/function taleraStartOriginalRound\(\)\{/,'native video player is unchanged');
   assert.match(text,/voice\.addEventListener\("timeupdate",follow\)/,'original narrator timing untouched');
   assert.doesNotMatch(text,/taleraV10SavedStartOriginalVideoRound|taleraV10PendingStillIndices/,'former wrappers and queue deleted');
   const scripts=[...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
   assert.ok(scripts.length,'embed has inline scripts');
   for(const [index,inline] of scripts.entries()){
     if(inline.trim())
       assert.doesNotThrow(()=>new Script(inline,{filename:'live-vertelmodus-script-'+index+'.js'}),
         'real standalone player script '+index+' must compile');
   }
 }else{
   assert.doesNotMatch(text,/function taleraV10PlayRemainingPhotosThenVideos/,'other pages are unmodified');
 }
 passes++;
 console.log('PASS',check.path,'status',resp.status,'header',check.expect||'untouched');
}
console.log('V10 live read-only smoke:',passes,'/',checks.length,'passed');
