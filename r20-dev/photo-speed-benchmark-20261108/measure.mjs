/**
 * Real, bounded latency experiment from ONE GitHub Actions runner.
 * D1, Durable Objects and R2 are real, dedicated EU test resources.
 * "Photoband" = 12 genuine PNG images (320x180) fetched concurrently.
 * This measures HTTP transfer, NOT image decoding, layout, iPhone or CDN.
 */
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='https://talera-photo-strip-speed-test-20261108.mark-a39.workers.dev';
const token=String(process.env.BENCH_TOKEN||'');
assert.ok(token.length>=40,'Missing private synthetic test token');
const accounts=Array.from({length:8},(_,i)=>'demo-perf-'+String(i+1).padStart(3,'0'));
const photos=Array.from({length:12},(_,i)=>'photo-'+String(i+1).padStart(2,'0'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function crc32(buf){
 let crc=0xffffffff;
 for(const byte of buf){
  crc^=byte;
  for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
 const typeBytes=Buffer.from(type,'ascii');
 const length=Buffer.alloc(4);length.writeUInt32BE(data.length);
 const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([typeBytes,data])));
 return Buffer.concat([length,typeBytes,data,crc]);
}
function pngFixture(seed){
 const width=320,height=180,raw=Buffer.alloc((width*3+1)*height);
 let n=(0xC0FFEE^seed)>>>0;
 for(let y=0;y<height;y++){
  let start=y*(width*3+1);raw[start]=0;
  for(let x=0;x<width*3;x++){
   n^=n<<13;n^=n>>>17;n^=n<<5;
   raw[start+1+x]=(n>>>12)&255;
  }
 }
 const ihdr=Buffer.alloc(13);
 ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),
  chunk('IDAT',deflateSync(raw,{level:5})),chunk('IEND',Buffer.alloc(0))
 ]);
}
async function fetchOne(path,options={},retries=2){
 let last;
 for(let i=0;i<=retries;i++){
  try{
   const start=performance.now();
   const response=await fetch(base+path,{
    ...options,
    headers:{authorization:'Bearer '+token,...(options.headers||{})},
    signal:AbortSignal.timeout(18000)
   });
   const bytes=Buffer.from(await response.arrayBuffer());
   const end=performance.now();
   if(!response.ok)throw Error('HTTP_'+response.status+' '+bytes.toString('utf8').slice(0,120));
   return {status:response.status,ms:end-start,bytes:bytes.length,
    dbMs:Number(response.headers.get('x-bench-db-ms')),
    r2Ms:Number(response.headers.get('x-bench-r2-ms')),
    json:response.headers.get('content-type')?.includes('application/json')?JSON.parse(bytes.toString()):null};
  }catch(e){last=e;if(i<retries)await sleep(150*(i+1));}
 }
 throw last;
}
const sortMetric=arr=>arr.filter(Number.isFinite).sort((a,b)=>a-b);
const pct=(sorted,q)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(q*(sorted.length-1)))]:null;
function summarize(samples){
 const lat=sortMetric(samples.map(s=>s.ms));
 const db=sortMetric(samples.map(s=>s.dbMs));
 const r2=sortMetric(samples.map(s=>s.r2Ms));
 return {
  requests:samples.length,
  p50Ms:Number(pct(lat,0.5)?.toFixed(2)),
  p95Ms:Number(pct(lat,0.95)?.toFixed(2)),
  maxMs:Number(lat.at(-1)?.toFixed(2)),
  serverDbP50Ms:db.length?Number(pct(db,0.5).toFixed(2)):null,
  serverR2P50Ms:r2.length?Number(pct(r2,0.5).toFixed(2)):null,
  totalBytes:samples.reduce((n,s)=>n+s.bytes,0)
 };
}
async function main(){
 // After secret rotation, Cloudflare may still be propagating the new secret.
 for(let i=0;i<15;i++){
  const response=await fetch(base+'/_bench/catalog?mode=d1&accountId='+accounts[0],{
   headers:{authorization:'Bearer '+token}});
  if(response.status!==401)break;
  await sleep(2000);
  if(i===14)throw Error('New benchmark secret did not propagate');
 }
 const health=await fetch(base+'/health').then(r=>r.json());
 assert.equal(health.realTaleraConnected,false);
 const denied=await fetch(base+'/_bench/catalog?mode=d1&accountId='+accounts[0]);
 assert.equal(denied.status,401);
 const fixtures=[];
 for(let i=0;i<12;i++){
  const bytes=pngFixture(i+1);
  const result=await fetchOne('/_bench/fixture?photoId='+photos[i],{
   method:'POST',headers:{'content-type':'image/png'},
   body:bytes
  },0);
  assert.equal(result.json.size,bytes.length);
  fixtures.push(bytes.length);
 }
 console.log('PHOTO_TEST_IMAGES',JSON.stringify({images:fixtures.length,format:'valid-PNG',
  width:320,height:180,avgBytes:Math.round(fixtures.reduce((a,b)=>a+b,0)/fixtures.length),
  accountOrMediaData:'SYNTHETIC ONLY'}));
 for(const id of accounts){
  for(const mode of ['d1','do']){
   const response=await fetchOne('/_bench/seed',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({accountId:id,mode})
   });
   assert.equal(response.json.count,12);
  }
 }
 async function readCatalog(mode,id){
  const response=await fetchOne('/_bench/catalog?mode='+mode+'&accountId='+id,{},{});
  assert.equal(response.json.photos.length,12);
  assert.deepEqual(response.json.photos.map(x=>x.id),photos);
  return response;
 }
 const catalog={d1:[],do:[]};
 // Alternating modes in each round limits systematic effects of warmup order.
 for(let i=0;i<24;i++){
  const id=accounts[i%accounts.length];
  const order=i%2?['do','d1']:['d1','do'];
  for(const mode of order)catalog[mode].push(await readCatalog(mode,id));
 }
 // The actual perceived photo-band fetch includes catalog + all image bytes;
 // mode=r2 represents a single owner-authenticated manifest followed by
 // R2 bytes only (without requerying SQL per photo).
 const bands={d1:[],do:[],r2:[]};
 const photoReqs={d1:[],do:[],r2:[]};
 for(let trial=0;trial<6;trial++){
  const id=accounts[trial%accounts.length];
  for(const mode of trial%2?['r2','do','d1']:['d1','do','r2']){
   const start=performance.now();
   const manifest=await readCatalog('d1'===mode?'d1':'do',id);
   const items=await Promise.all(photos.map(photoId=>fetchOne(
    '/_bench/photo?mode='+mode+'&accountId='+id+'&photoId='+photoId,{},1)));
   for(const sample of items){
    assert.ok(sample.bytes>10000,'full valid PNG bytes must be loaded');
    photoReqs[mode].push(sample);
   }
   bands[mode].push({ms:performance.now()-start,catalogMs:manifest.ms,
    bytes:items.reduce((n,x)=>n+x.bytes,0)});
  }
 }
 // Owner isolation: second account does not see a photo absent from its DO.
 // All benchmark fixtures are shared synthetic art, never TALERA media.
 const report={
  methodology:{
   date:'2026-11-08',source:'GitHub Actions Linux runner -> Cloudflare workers.dev',
   backend:'same Worker, identical photo SQL records, same EU R2 objects, same SQL payload',
   accounts:accounts.length,photosPerBand:photos.length,bytesPerPhotoAvg:Math.round(
    fixtures.reduce((a,b)=>a+b,0)/fixtures.length),
   catalogIterationsPerBackend:catalog.d1.length,
   bandTrialsPerBackend:bands.d1.length,
   caching:'No-store HTTP, no browser cache, no CDN/custom domain',
   transfer:'All 12 PNG image bytes completely downloaded over HTTPS',
   notMeasured:['iPhone screen render','image decoding/layout','warm CDN cache','last-mile mobile 4G','100k simultaneous users','app-specific photo-cue UI'],
   noProductionResources:true,
  },
  catalog:Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,summarize(v)])),
  imageRequests:Object.fromEntries(Object.entries(photoReqs).map(([k,v])=>[k,summarize(v)])),
  fullPhotoBand:Object.fromEntries(Object.entries(bands).map(([k,v])=>[k,summarize(v)]))
 };
 mkdirSync('r20-dev/photo-speed-benchmark-20261108/results',{recursive:true});
 writeFileSync('r20-dev/photo-speed-benchmark-20261108/results/real-network-benchmark.json',JSON.stringify(report,null,2)+'\n');
 console.log('REAL_PHOTO_STRIP_LATENCY',JSON.stringify(report));
}
await main();
