// The received library is an ephemeral read-only adapter for the existing
// presentation. It never reads or writes the owner's own library.
import {receiveParts} from './f5-internal-receive.mjs';
const requireProjection=(ok,code='RECEIVED_UNAVAILABLE')=>{if(!ok)throw Error(code)};
const projectionHash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
export async function makeReceivedProjection(key,store,{isCurrent=()=>true,createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url)}={}){
 const guard=()=>requireProjection(isCurrent(),'ACCOUNT_CHANGED');
 guard();requireProjection(/^[a-f0-9]{64}$/.test(key));
 const record=await store.get(key);guard();
 requireProjection(record?.state==='ready'&&record.key===key);
 const content=record.content,manifest=content?.manifest;
 requireProjection(await projectionHash(new TextEncoder().encode(JSON.stringify(manifest)))===content?.manifestHash,'RECEIVED_MANIFEST_HASH');
 const parts=receiveParts(manifest),byId=new Map(parts.map(p=>[p.id,p])),assets=new Map(),urls=new Set();
 const read=async id=>{
  guard();const part=byId.get(id),bytes=await store.getPart(key,id);guard();
  requireProjection(part&&bytes instanceof Uint8Array&&bytes.byteLength===part.size&&await projectionHash(bytes)===part.hash,'RECEIVED_LOCAL_CORRUPT');guard();return bytes;
 };
 // Confirm all local bytes before a single received frame is exposed.
 for(const part of parts)await read(part.id);
 const items=manifest.items.map((item,index)=>{
  requireProjection(!assets.has(item.mediaId),'RECEIVED_MEDIA_ID');
  assets.set(item.mediaId,{mime:item.mime,ids:Array.from({length:item.parts},(_,p)=>'asset-'+index+'-'+p)});
  return {key:item.mediaId,kind:item.kind,mime:item.mime};
 });
 for(const p of manifest.posters||[]){
  const posterKey=items[p.mediaIndex].key+':phone-v1';requireProjection(!assets.has(posterKey),'RECEIVED_MEDIA_ID');
  assets.set(posterKey,{mime:p.mime,ids:['poster-'+p.mediaIndex]});
 }
 const cues=manifest.narrationCues.map(c=>{
  const result={...c};
  if(c.mediaIndex!==undefined){const item=items[c.mediaIndex];requireProjection(item&&item.kind!=='audio','RECEIVED_CUE_INVALID');result.mediaId=item.key;delete result.mediaIndex}
  return result;
 });
 const event=content.eventDate;
 const date=/^\d{4}-\d{2}-\d{2}$/.test(event)?event:/^\d{4}$/.test(event)?event+'-01-01':new Date(record.createdAt).toISOString().slice(0,10);
 const time=/^\d{2}:\d{2}(?::\d{2})?$/.test(manifest.time||'')?manifest.time:'12:00:00';
 requireProjection(Number.isFinite(Date.parse(date+'T'+time)));
 const row={id:'local-received-'+key,source:'pwa-local',date,time,datePrecision:manifest.datePrecision||'unknown',title:content.title,text:content.storyText,
  createdAt:new Date(record.createdAt).toISOString(),items,narrationCues:cues,narrationDurationMs:manifest.narrationDurationMs,tags:[]};
 const blob=async id=>{
  guard();const asset=assets.get(id);if(!asset)return null;
  const chunks=[];for(const id of asset.ids)chunks.push(await read(id));guard();
  return new Blob(chunks,{type:asset.mime});
 };
 const mediaUrl=async id=>{const data=await blob(id);guard();if(!data)return null;const url=createUrl(data);urls.add(url);return url};
 return {library:{list:async()=>{guard();return [row]},get:async id=>{guard();return id===row.id?row:null},blob,mediaUrl,displayUrl:mediaUrl},
  markSeen:async()=>{guard();await store.markSeen(key);guard()},
  dispose:()=>{for(const url of urls)revokeUrl(url);urls.clear();store.close()}
 };
}
