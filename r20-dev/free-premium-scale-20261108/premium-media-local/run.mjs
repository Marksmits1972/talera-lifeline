// TALERA: Real binary PNG/WAV/MP4 fixtures, local Cloudflare DO/SQLite/R2 runtime.
// Generates valid *synthetic media files*, never opens real users' personal files.
// Never connects to the Cloudflare API or deployed Workers.
import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';

const BASE='http://127.0.0.1:8791';
const SECRET='test-only-isolated-hmac-secret-longer-than-forty-bytes-20261108';
const root='r20-dev/free-premium-scale-20261108/premium-media-local';
const runtimeDir=path.resolve('.talera-premium-binary-proof');
mkdirSync(runtimeDir,{recursive:true});
const cmd=path.resolve('node_modules/.bin/wrangler');
const args=['dev','--local','--ip','127.0.0.1','--port','8791','--config',
 path.resolve(root,'wrangler.jsonc'),'--persist-to',runtimeDir,
 '--var','TEST_TOKEN_SECRET:'+SECRET,'--log-level','error'];
const child=spawn(cmd,args,{env:{...process.env,BROWSER:'none',CI:'true',NO_COLOR:'1'},stdio:['ignore','pipe','pipe']});
let logs='',exited=false,requests=0;
for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{logs=(logs+b.toString()).slice(-16000)});
child.on('exit',(code,signal)=>{exited=true;logs+='\nWRANGLER_EXIT='+code+' '+signal});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const token=id=>id+'.'+createHmac('sha256',SECRET).update(id).digest('hex');
const digest=buf=>createHash('sha256').update(buf).digest('hex');
async function call(method,route,{account,bytes,contentType,hash,json}={}){
 requests++;
 const headers={};
 if(account)headers.authorization='Bearer '+token(account);
 if(bytes){headers['content-type']=contentType;headers['x-content-sha256']=hash||digest(bytes)}
 if(json)headers['content-type']='application/json';
 const start=performance.now();
 const response=await fetch(BASE+route,{
  method,headers,
  body:bytes||(json?JSON.stringify(json):undefined),
  signal:AbortSignal.timeout(20000)
 });
 const data=await response.arrayBuffer();
 const buffer=Buffer.from(data);
 let result;
 if(/application\/json/i.test(response.headers.get('content-type')||''))result=JSON.parse(buffer.toString('utf8'));
 return {status:response.status,ms:performance.now()-start,result,buffer,headers:response.headers};
}
function crc32(data){
 let crc=0xffffffff;
 for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1}
 return (crc^0xffffffff)>>>0;
}
function pngChunk(name,content){
 const bytes=Buffer.alloc(12+content.length),type=Buffer.from(name);
 bytes.writeUInt32BE(content.length,0);type.copy(bytes,4);content.copy(bytes,8);
 bytes.writeUInt32BE(crc32(Buffer.concat([type,content])),8+content.length);return bytes;
}
function makePng(seed,w=640,h=480){
 const stride=1+w*3,pixels=Buffer.alloc(stride*h);
 let x=seed+1;
 for(let y=0;y<h;y++){
  const offset=y*stride;pixels[offset]=0;
  for(let i=1;i<stride;i++){x^=x<<13;x^=x>>>17;x^=x<<5;pixels[offset+i]=x&255}
 }
 const head=Buffer.alloc(13);
 head.writeUInt32BE(w,0);head.writeUInt32BE(h,4);head[8]=8;head[9]=2;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),
  pngChunk('IHDR',head),pngChunk('IDAT',deflateSync(pixels,{level:3})),pngChunk('IEND',Buffer.alloc(0))]);
}
function makeWav(){
 const sampleRate=16000,seconds=20,frames=sampleRate*seconds;
 const buf=Buffer.alloc(44+frames*2);
 buf.write('RIFF',0);buf.writeUInt32LE(buf.length-8,4);buf.write('WAVE',8);
 buf.write('fmt ',12);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);
 buf.writeUInt16LE(1,22);buf.writeUInt32LE(sampleRate,24);
 buf.writeUInt32LE(sampleRate*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);
 buf.write('data',36);buf.writeUInt32LE(frames*2,40);
 for(let i=0;i<frames;i++){
  const sample=Math.round(12000*Math.sin(i*2*Math.PI*220/sampleRate)*(0.6+0.4*Math.sin(i/9000)));
  buf.writeInt16LE(sample,44+i*2);
 }
 return buf;
}
function makeMp4(){
 const directory=mkdtempSync(path.join(tmpdir(),'talera-mp4-test-'));
 const filename=path.join(directory,'synthetic-video.mp4');
 const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',
  '-f','lavfi','-i','testsrc2=size=640x360:rate=15','-t','6','-an',
  '-c:v','mpeg4','-q:v','7','-movflags','+faststart',filename],
 {timeout:60000,encoding:'utf8'});
 assert.equal(r.status,0,'Need ffmpeg to generate valid synthetic MP4: '+(r.stderr||''));
 const buf=readFileSync(filename);
 assert.equal(buf.toString('ascii',4,8),'ftyp');
 return buf;
}
const fixtures=[
 ...Array.from({length:6},(_,i)=>({id:'photo-'+i,type:'image/png',buf:makePng(i+1)})),
 {id:'audio-0',type:'audio/wav',buf:makeWav()},
 {id:'video-0',type:'video/mp4',buf:makeMp4()}
];
function manifest(storyId,label){
 return {storyId,text:'FICTIEVE STEM: '+label,
  media:fixtures.map(x=>({id:x.id,type:x.type,sha256:digest(x.buf),size:x.buf.length})),
  cues:[...Array.from({length:6},(_,i)=>({atMs:i*3000,mediaId:'photo-'+i})),
   {atMs:20000,mediaId:'video-0'}]
 };
}
function percentile(ms,n){const sorted=[...ms].sort((a,b)=>a-b);return Number(sorted[Math.ceil(n*sorted.length)-1].toFixed(2))}
async function bounded(items,limit,fn){
 let cursor=0;const out=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
  while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i],i)}
 }));
 return out;
}
async function run(){
 let ready=false;
 for(let i=0;i<90;i++){
  if(exited)throw Error('Wrangler stopped during startup '+logs);
  try{const a=await call('GET','/health');if(a.status===200&&a.result.localFixture){ready=true;break}}
  catch{}
  await sleep(500);
 }
 assert.ok(ready,'Unable to boot local Durable Object + R2 media test: '+logs);
 const unauthorized=await call('GET','/_test/story/story-a');
 assert.equal(unauthorized.status,401);
 const a='demo-test-a',b='demo-test-b',sA='story-a',sB='story-b';
 const premature=await call('POST','/_test/story',{account:a,json:manifest(sA,'A')});
 assert.equal(premature.status,409,'Story cannot commit before every object is safely stored');
 const wrongChecksum=await call('PUT','/_test/media/'+sA+'/photo-0',
  {account:a,bytes:fixtures[0].buf,contentType:'image/png',hash:'0'.repeat(64)});
 assert.equal(wrongChecksum.status,422,'Checksum mismatch must never be silently accepted');
 const uploads=[];
 for(const [account,storyId] of [[a,sA],[b,sB]]){
  for(const obj of fixtures)uploads.push({account,storyId,...obj});
 }
 const uploadTimings=await bounded(uploads,4,async obj=>{
  const x=await call('PUT','/_test/media/'+obj.storyId+'/'+obj.id,
   {account:obj.account,bytes:obj.buf,contentType:obj.type});
  assert.equal(x.status,200,'Upload '+obj.account+' '+obj.id+' '+JSON.stringify(x.result));
  assert.equal(x.result.size,obj.buf.length);
  return x.ms;
 });
 const commits=[];
 for(const [account,storyId] of [[a,sA],[b,sB]]){
  const x=await call('POST','/_test/story',{account,json:manifest(storyId,account)});
  assert.equal(x.status,200,'Commit '+JSON.stringify(x.result));
  assert.equal(x.result.mediaCount,8);
  commits.push(x.result);
 }
 for(const [account,storyId] of [[a,sA],[b,sB]]){
  const x=await call('GET','/_test/story/'+storyId,{account});
  assert.equal(x.status,200);assert.equal(x.result.story.media.length,8);
  assert.equal(x.result.story.cues.length,7);
  assert.match(x.result.story.text,new RegExp(account));
 }
 const forbiddenStory=await call('GET','/_test/story/'+sA,{account:b});
 assert.equal(forbiddenStory.status,404,'Account B must never load account A story');
 const forbiddenMedia=await call('GET','/_test/media/'+sA+'/photo-0',{account:b});
 assert.equal(forbiddenMedia.status,404,'Account B must never load account A binary media');
 const bands=[];
 const readTargets=uploads;
 for(const concurrency of [1,5,10,25]){
  const elapsed=await bounded(readTargets,concurrency,async item=>{
   const x=await call('GET','/_test/media/'+item.storyId+'/'+item.id,{account:item.account});
   assert.equal(x.status,200,'Binary GET '+item.account+' '+item.id+' '+JSON.stringify(x.result));
   assert.equal(x.buffer.byteLength,item.buf.byteLength);
   assert.equal(digest(x.buffer),digest(item.buf),'Byte-for-byte integrity failed: '+item.id);
   assert.equal(x.headers.get('cache-control'),'private, no-store');
   return x.ms;
  });
  bands.push({concurrentLocalRequests:concurrency,successfulReads:elapsed.length,p95LocalMs:percentile(elapsed,.95)});
 }
 const stats=await call('GET','/_test/stats',{account:a});
 assert.equal(stats.status,200);assert.equal(stats.result.stories,1);
 return {
  kind:'LOCAL ISOLATED REAL BINARY MEDIA TEST',
  result:'PASS',
  fakeAccounts:2,
  committedStories:commits.length,
  mediaPerStory:{photos:6,audio:1,video:1},
  mediaUploaded:uploadTimings.length,
  validPngBytes:fixtures.filter(x=>x.type==='image/png').reduce((n,x)=>n+x.buf.length,0),
  validWavBytes:fixtures.find(x=>x.type==='audio/wav').buf.length,
  validMp4Bytes:fixtures.find(x=>x.type==='video/mp4').buf.length,
  byteForByteBinaryReads:bands.reduce((n,x)=>n+x.successfulReads,0),
  preventedPrematureCommit:true,
  rejectedWrongHash:true,
  protectedAccountBoundaries:true,
  accountAuthenticationModel:'HMAC test-only fake accounts, NOT live TALERA authentication',
  locallyEmulatedR2AndSQLite:true,
  reachedActualCloudflareEdge:false,
  noCustomerDataOrProductionTouched:true,
  localLatencyNotACloudSla:bands,
  requests,
  premiumOneMillionConcurrentProven:false
 };
}
try{
 const report=await run();
 writeFileSync('r20-dev/free-premium-scale-20261108/premium-media-local/results.json',JSON.stringify(report,null,2)+'\n');
 console.log('TALERA_PREMIUM_FULL_BINARY_MEDIA_TEST',JSON.stringify(report,null,2));
}catch(e){
 console.error('WRANGLER_LOCAL_LAST_LOG',logs.slice(-6000));
 throw e;
}finally{
 if(!exited)child.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(3000)]);
}
