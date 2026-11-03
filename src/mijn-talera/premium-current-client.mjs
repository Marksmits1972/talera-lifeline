/* BB63 current-version client, server-side account authority remains decisive.
 * Separate read/update operations; immutable R2 snapshots are not overwritten.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KINDS=new Set(['media','story','comment_archive']);
export async function fetchPremiumCurrentVersions(fetcher,kind){
 if(typeof fetcher!=='function'||!KINDS.has(kind))throw Error('invalid_current_kind');
 const items=new Map(),seen=new Set();let after='';
 for(let page=0;page<1000;page++){
  const path='/api/premium/cloud/current?kind='+encodeURIComponent(kind)+(after?'&after='+encodeURIComponent(after):'');
  const response=await fetcher(path,{method:'GET',credentials:'same-origin',cache:'no-store'});
  if(!response?.ok)throw Error('current_api_unavailable');
  const body=await response.json();
  if(body?.ok!==true||!Array.isArray(body.items)||body.items.length>500)throw Error('invalid_current_page');
  for(const row of body.items){
   if(row.kind!==kind||typeof row.source_key!=='string'||row.source_key.length<1||
      row.source_key.length>1024||!UUID.test(row.current_id||'')||
      !Number.isSafeInteger(row.revision)||row.revision<1||items.has(row.source_key))
    throw Error('invalid_current_row');
   items.set(row.source_key,row);
  }
  if(!body.next)return items;
  if(typeof body.next!=='string'||body.next.length>1024||seen.has(body.next)||
     body.next===after||body.items.length!==500)throw Error('invalid_current_cursor');
  seen.add(body.next);after=body.next;
 }
 throw Error('current_page_limit');
}
export async function commitPremiumCurrentVersion({fetcher,kind,sourceKey,snapshotId,expectedCurrentId=null}={}){
 if(typeof fetcher!=='function'||!KINDS.has(kind)||typeof sourceKey!=='string'||sourceKey.length<1||
    !UUID.test(snapshotId||'')||(expectedCurrentId!==null&&!UUID.test(expectedCurrentId)))
  throw Error('invalid_current_request');
 const response=await fetcher('/api/premium/cloud/current',{
  method:'POST',credentials:'same-origin',cache:'no-store',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({kind,sourceKey,snapshotId,expectedCurrentId})
 });
 if(!response?.ok)return {ok:false,reason:response?.status===409?'current_changed':'current_api_unavailable'};
 const result=await response.json().catch(()=>null);
 return result?.ok===true?result:{ok:false,reason:'current_update_unconfirmed'};
}
