// Compare the actual expanded public dataset against the published resolver.
// This is data validation/measurement, not an app or a production release.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createOfflineLocalityResolver} from './f5-offline-locality.mjs';
const [root,oldFile]=process.argv.slice(2);
const meta=JSON.parse(readFileSync(join(root,'world-manifest.json'),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const data=readFileSync(oldFile);
const original=createOfflineLocalityResolver(data);
assert.equal(meta.license,'CC BY 4.0');
const slots=676,head=16+slots*8,record=14,scale=100000;
let maxPartOpenMs=0;const layer={};let sampled=[];
for(const [kind,info] of Object.entries(meta.layers)){
  let total=0,bytes=0; const installed=[];
  for(const part of info.parts){
    const buf=readFileSync(join(root,part.file));
    assert.equal(buf.length,part.bytes);assert.equal(hash(buf),part.sha256);assert.ok(buf.length<=24*1024*1024);
    const clock=performance.now(),resolve=createOfflineLocalityResolver(buf);
    maxPartOpenMs=Math.max(maxPartOpenMs,performance.now()-clock);
    const n=buf.readUInt32LE(8),pool=head+n*record;assert.equal(n,part.records);
    let tally=0;
    for(const [cc,range] of Object.entries(part.coverage)){
      const s=(cc.charCodeAt(0)-65)*26+cc.charCodeAt(1)-65;
      const start=buf.readUInt32LE(16+s*8),count=buf.readUInt32LE(20+s*8);
      assert.equal(count,range.records);assert.ok(start+count<=n);
      let prev=-Infinity;
      for(let i=start;i<start+count;i++){
        const p=head+record*i,lat=buf.readInt32LE(p),lon=buf.readInt32LE(p+4),nameOffset=buf.readUInt32LE(p+8),len=buf.readUInt16LE(p+12);
        assert.ok(lat>=prev&&Math.abs(lat)<=90*scale&&Math.abs(lon)<=180*scale);prev=lat;
        assert.ok(len&&pool+nameOffset+len<=buf.length);
        if(kind==='populated'&&(i%1009===0||i===start)){
          sampled.push({cc,lat:lat/scale,lon:lon/scale,label:buf.subarray(pool+nameOffset,pool+nameOffset+len).toString('utf8')});
        }
      }
      tally+=count;
    }
    assert.equal(tally,n);total+=n;bytes+=buf.length;
    installed.push({resolve,coverage:part.coverage});
  }
  assert.equal(total,info.records);assert.equal(bytes,info.bytes);
  layer[kind]=installed;
}
const lookup=(gps,cc)=>{
  const candidates=layer.populated.filter(x=>{
    const c=x.coverage[cc];return c&&gps.latitude>=c.minLat-0.046&&gps.latitude<=c.maxLat+0.046;
  });
  // Conservative boundary handling; later resolver must compare all shard
  // neighbours before resolving overlapping candidates.
  if(candidates.length!==1)return null;
  return candidates[0].resolve(gps,cc);
};
const cases=[['Arnhem','NL',51.98,5.91111],['Schijndel','NL',51.6225,5.43194],['Rovinj','HR',45.08268,13.63457],['Salzburg','AT',47.79941,13.04399],['remote mountain','AT',47.074,12.695],['ocean wrong country','NL',0,-150]];
for(const [label,cc,latitude,longitude] of cases){
  const gps={latitude,longitude};
  console.log('TALERA_WORLD_PUBLIC_COORDINATE',JSON.stringify({label,cc,old:original(gps,cc),expanded:lookup(gps,cc)}));
}
let oldKnown=0,newKnown=0,added=0,lost=0,changed=0,exact=0,combinedKnown=0,combinedLost=0,combinedChanged=0;const times=[],oldTimes=[];
for(const {cc,lat,lon,label} of sampled){
  const gps={latitude:lat,longitude:lon};
  let t=performance.now();const a=original(gps,cc);oldTimes.push(performance.now()-t);
  t=performance.now();const b=lookup(gps,cc);times.push(performance.now()-t);
  if(a)oldKnown++;if(b)newKnown++;if(!a&&b)added++;if(a&&!b)lost++;if(a&&b&&a!==b)changed++;if(b===label)exact++;const combined=a||b;if(combined)combinedKnown++;if(a&&!combined)combinedLost++;if(a&&combined!==a)combinedChanged++;
}
assert.equal(combinedLost,0);assert.equal(combinedChanged,0);assert.equal(combinedKnown,oldKnown+added);
console.log('TALERA_WORLD_BASELINE_FIRST',JSON.stringify({samples:sampled.length,oldKnown,combinedKnown,added,combinedLost,combinedChanged}));
const quantile=(rows,p)=>rows.slice().sort((a,b)=>a-b)[Math.floor((rows.length-1)*p)];
console.log('TALERA_WORLD_INDEX_BENCHMARK',JSON.stringify({node:process.version,sample:'deterministically sampled real place centre records; not a general photo accuracy test',samples:sampled.length,oldKnown,newKnown,added,lost,changed,exact,oldP95Ms:quantile(oldTimes,.95),newP50Ms:quantile(times,.5),newP95Ms:quantile(times,.95),newP99Ms:quantile(times,.99),newMaxMs:Math.max(...times),maxPartOpenMs,rssBytes:process.memoryUsage().rss,externalBytes:process.memoryUsage().external,physicalIphoneAccepted:false}));
