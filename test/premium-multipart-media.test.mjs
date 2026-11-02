import test from 'node:test';
import assert from 'node:assert/strict';
import {premiumMultipartRoute,PART_BYTES,multipartFingerprint} from '../src/core/premium-multipart-media.mjs';
import {createLargeMediaManifest,uploadLargePremiumMedia} from '../src/mijn-talera/premium-large-media.mjs';
const alice='a8f08aa9-a0a2-4ce3-a179-44fb758d1102',bob='f5cbaefc-d7d8-4a3a-a334-b93d0a08d170';
function fixture(){
 const sessions=new Map(),chunks=new Map(),media=new Map(),uploads=new Map(),objects=new Map();
 const index=(a,id)=>a+'/'+id;
 const DB={prepare(sql){return {bind(...arg){return {
  async first(){
   if(sql.includes('talera_premium_uploads'))return sessions.get(index(arg[0],arg[1]))||null;
   if(sql.includes('talera_premium_upload_parts'))return chunks.get(index(arg[0],arg[1])+'/'+arg[2])||null;
   if(sql.includes('talera_premium_media'))return media.get(index(arg[0],arg[1]))||null;
   throw Error('unexpected first query: '+sql);
  },
  async all(){
   if(!sql.includes('talera_premium_upload_parts'))throw Error('unexpected all query');
   return {results:[...chunks.values()].filter(x=>x.account_id===arg[0]&&x.media_id===arg[1])
    .sort((a,b)=>a.part_number-b.part_number)};
  },
  async run(){
   if(sql.startsWith('INSERT INTO talera_premium_uploads')){
    const [account_id,media_id,upload_id,content_type,byte_size,part_size,part_count,fingerprint,created_at]=arg;
    sessions.set(index(account_id,media_id),{account_id,media_id,upload_id,content_type,byte_size,part_size,part_count,fingerprint,created_at});
   } else if(sql.startsWith('INSERT INTO talera_premium_upload_parts')){
    const [account_id,media_id,part_number,sha256,byte_size,etag]=arg;
    chunks.set(index(account_id,media_id)+'/'+part_number,{account_id,media_id,part_number,sha256,byte_size,etag});
   }else if(sql.startsWith('INSERT INTO talera_premium_media')){
    const [account_id,media_id,object_key,content_type,byte_size,sha256,created_at]=arg;
    media.set(index(account_id,media_id),{account_id,media_id,object_key,content_type,byte_size,sha256,digest_kind:'part-sha256-v1',created_at});
   }else if(sql.startsWith('DELETE FROM talera_premium_upload_parts')){
    for(const key of chunks.keys())if(key.startsWith(index(arg[0],arg[1])+'/'))chunks.delete(key);
   }else if(sql.startsWith('DELETE FROM talera_premium_uploads')){
    sessions.delete(index(arg[0],arg[1]));
   }else throw Error('unexpected write: '+sql);
   return {success:true};
  }
 }}}}};
 const bucket={
  async createMultipartUpload(key,metadata){
   const id='upload-'+(uploads.size+1);
   uploads.set(id,{key,metadata,parts:new Map()});return this.resumeMultipartUpload(key,id);
  },
  resumeMultipartUpload(key,id){
   return {
    uploadId:id,
    async uploadPart(number,bytes){
     const record=uploads.get(id);if(!record||record.key!==key)throw Error('invalid_upload');
     const tag='etag-'+number+'-'+bytes.byteLength;record.parts.set(number,{etag:tag,bytes:new Uint8Array(bytes)});
     return {partNumber:number,etag:tag};
    },
    async complete(parts){
     const record=uploads.get(id);if(!record)throw Error('missing upload');
     const ordered=parts.map(p=>{const chunk=record.parts.get(p.partNumber);
      if(!chunk||chunk.etag!==p.etag)throw Error('part ETag mismatch');return chunk.bytes});
     const result=new Uint8Array(ordered.reduce((n,x)=>n+x.length,0));let offset=0;
     for(const chunk of ordered){result.set(chunk,offset);offset+=chunk.length}
     const obj={size:result.byteLength,customMetadata:record.metadata.customMetadata,bytes:result};
     objects.set(key,obj);uploads.delete(id);return obj;
    },
    async abort(){uploads.delete(id)}
   };
  },
  async head(key){return objects.get(key)||null}
 };
 return {env:{DB,PREMIUM_PRIVATE:bucket},objects,media,chunks,uploads};
}
const video=()=>({key:'large-video-memory',mime:'video/mp4',blob:new Blob([new Uint8Array(26*1024*1024+127)],{type:'video/mp4'})});
test('large video is streamed in 8 MiB chunks, verified, registered once and resumable',async()=>{
 const {env,objects,media}=fixture();
 const source=video(),manifest=await createLargeMediaManifest(source,{crypto});
 assert.equal(manifest.parts.length,4);
 assert.equal(manifest.parts[0].byte_size,PART_BYTES);
 assert.equal(manifest.parts[3].byte_size,2*1024*1024+127);
 assert.equal(await multipartFingerprint({byteSize:manifest.size,contentType:manifest.mime,parts:manifest.parts}),manifest.fingerprint);
 const fetcher=(path,init)=>premiumMultipartRoute({request:new Request('https://talera.test'+path,init),env,accountId:alice,writeAllowed:true});
 const outcome=await uploadLargePremiumMedia({media:source,manifest,crypto,fetcher});
 assert.deepEqual(outcome,{ok:true,reason:'stored'});
 const row=media.get(alice+'/'+manifest.mediaId);
 assert.equal(row.digest_kind,'part-sha256-v1');assert.equal(row.sha256,manifest.fingerprint);
 assert.equal(objects.get(row.object_key).size,source.blob.size);
 const again=await uploadLargePremiumMedia({media:source,manifest,crypto,fetcher});
 assert.equal(again.reason,'already_stored');assert.equal(objects.size,1);
 const fromAnotherAccount=await premiumMultipartRoute({
  request:new Request('https://talera.test/api/premium/cloud/multipart/'+manifest.mediaId+'/status'),
  env,accountId:bob});
 assert.equal(fromAnotherAccount.status,404);
});
test('interrupted upload resumes only outstanding parts',async()=>{
 const {env,uploads}=fixture();
 const source=video(),manifest=await createLargeMediaManifest(source,{crypto});
 let partCalls=0;
 const fetcher=async(path,init)=>{
  if(path.includes('/part/')){partCalls++;if(partCalls===2)throw Error('offline_disconnect')}
  return premiumMultipartRoute({request:new Request('https://talera.test'+path,init),env,accountId:alice,writeAllowed:true});
 };
 await assert.rejects(uploadLargePremiumMedia({media:source,manifest,crypto,fetcher}),/offline_disconnect/);
 assert.equal(uploads.size,1);
 const resumed=await uploadLargePremiumMedia({media:source,manifest,crypto,fetcher});
 assert.equal(resumed.reason,'stored');assert.equal(partCalls,5); // 1 old + 1 failed + 3 outstanding
});
test('changed part and a changed account cannot finish under the old identity',async()=>{
 const {env}=fixture(),source=video(),manifest=await createLargeMediaManifest(source,{crypto});
 const base='/api/premium/cloud/multipart/'+manifest.mediaId;
 const fetcher=(path,init)=>premiumMultipartRoute({request:new Request('https://talera.test'+path,init),env,accountId:alice,writeAllowed:true});
 await fetcher(base+'/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
  contentType:manifest.mime,byteSize:manifest.size,fingerprint:manifest.fingerprint})});
 const part=manifest.parts[0],bytes=await source.blob.slice(0,PART_BYTES).arrayBuffer();
 const fail=await fetcher(base+'/part/1',{method:'PUT',body:bytes,headers:{'x-content-sha256':'0'.repeat(64)}});
 assert.equal(fail.status,400);assert.equal((await fail.json()).reason,'part_digest_mismatch');
 const different=await uploadLargePremiumMedia({media:source,manifest,crypto,fetcher,ownerMatches:()=>false});
 assert.equal(different.reason,'account_changed');
});
