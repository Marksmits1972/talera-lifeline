// One account-local address book for TALERA Free. Imported personal details
// never leave this browser; a contact is NOT a grant or verified account.
export function normalizePeoplePhone(input){
 const raw=String(input??'').trim().replace(/^tel:/i,'');
 if(!raw)return '';
 // No guessed country, no extensions or arbitrary characters. Users may
 // correct a national number themselves; international + / 00 are equivalent.
 if(!/^(?:\+|00)?[\d\s().-]+$/.test(raw))throw Error('PHONE_INVALID');
 let number=raw.replace(/[\s().-]/g,'');
 if(number.startsWith('00'))number='+'+number.slice(2);
 if(!/^\+?[0-9]{5,15}$/.test(number)||(/^\+0/.test(number)))throw Error('PHONE_INVALID');
 return number;
}
export function sanitizePeopleContact(input){
 const name=String(input?.name??'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 if(!name||name.length>120)throw Error('NAME_INVALID');
 return {name,phone:normalizePeoplePhone(input?.phone),favorite:input?.favorite===true};
}
export function parsePeopleVcards(value){
 // Only FN/N and TEL are extracted; no e-mails, addresses, photos, notes.
 // vCard 3/4 UTF-8, including folded lines, escaped separators and URI TEL.
 if(typeof value!=='string'||value.length>8_000_000)throw Error('VCARD_INVALID');
 const lines=value.replace(/^\uFEFF/,'').replace(/\r\n|\r/g,'\n').replace(/\n[ \t]/g,'').split('\n');
 const unesc=s=>s.replace(/\\([nN,;\\])/g,(_,c)=>/[nN]/.test(c)?' ':c);
 const result=[];
 let current=null;
 for(const line of lines){
  if(/^BEGIN:VCARD$/i.test(line)){current={name:'',fallback:'',phones:[]};continue}
  if(/^END:VCARD$/i.test(line)){
   if(current){
    const name=current.name||current.fallback;
    if(name){
     try{const clean=sanitizePeopleContact({name});result.push({name:clean.name,phones:[...new Set(current.phones)]})}catch{}
    }
   }
   current=null;continue
  }
  if(!current)continue;
  const colon=line.indexOf(':');if(colon<0)continue;
  const descriptor=line.slice(0,colon),key=descriptor.split(';')[0].split('.').at(-1).toUpperCase();
  // Do not silently mis-decode old quoted-printable or non-UTF-8 names.
  if(/ENCODING=|CHARSET=(?!UTF-8(?:;|$))/i.test(descriptor))continue;
  const raw=line.slice(colon+1);
  if(key==='FN')current.name=unesc(raw);
  else if(key==='N')current.fallback=raw.split(/(?<!\\);/).filter(Boolean).map(unesc).reverse().join(' ');
  else if(key==='TEL')try{const phone=normalizePeoplePhone(unesc(raw));if(phone)current.phones.push(phone)}catch{}
 }
 return result;
}
export function peoplePickerCandidates(records){
 if(!Array.isArray(records))return [];
 return records.flatMap(record=>{
  try{
   const name=sanitizePeopleContact({name:record?.name?.[0]}).name;
   const phones=[...new Set((Array.isArray(record.tel)?record.tel:[]).flatMap(x=>{
    try{const number=normalizePeoplePhone(x);return number?[number]:[]}catch{return []}
   }))];
   return [{name,phones}];
  }catch{return []}
 });
}
export function planPeopleChanges(existing,input,uuid){
 // Exact canonical phone match only; no account/name guessing. No merge of
 // differently named unnumbered people. Exact repeated name-only imports
 // require explicit choice if they are genuinely different people.
 const rows=existing.map(c=>({...c})),results=[];
 for(const candidate of input){
  const clean=sanitizePeopleContact(candidate);
  const match=rows.find(c=>clean.phone?c.phone===clean.phone:!c.phone&&c.name===clean.name);
  if(match){results.push({id:match.id,added:false});continue}
  const record={id:uuid(),...clean};rows.push(record);results.push({id:record.id,added:true});
 }
 return {rows,results};
}
export async function openPeopleStore(accountId,{isCurrent=()=>true,indexedDB=globalThis.indexedDB,crypto=globalThis.crypto}={}){
 if(typeof accountId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(accountId))throw Error('ACCOUNT_REQUIRED');
 const assertCurrent=()=>{if(!isCurrent())throw Error('ACCOUNT_CHANGED')};
 assertCurrent();
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('TALERA_FREE_CONTACTS_V1:'+accountId.toLowerCase()));
 const scope=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 assertCurrent();
 const db=await new Promise((resolve,reject)=>{
  const request=indexedDB.open('talera-free-people-'+scope+'-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('contacts',{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(Error('CONTACTS_STORAGE'));
 });
 try{assertCurrent()}catch(e){db.close();throw e}
 db.onversionchange=()=>db.close();
 const transact=(mode,fn)=>new Promise((resolve,reject)=>{
  assertCurrent();
  const transaction=db.transaction('contacts',mode),store=transaction.objectStore('contacts');
  let result,failed;
  const fail=e=>{failed=e;try{transaction.abort()}catch{}};
  transaction.oncomplete=()=>{try{assertCurrent();resolve(result)}catch(e){reject(e)}};
  transaction.onerror=()=>reject(failed||transaction.error||Error('CONTACTS_STORAGE'));
  transaction.onabort=()=>reject(failed||transaction.error||Error('CONTACTS_STORAGE'));
  const r=store.getAll();
  r.onsuccess=()=>{try{assertCurrent();result=fn(r.result,store)}catch(e){fail(e)}};
  r.onerror=()=>fail(r.error);
 });
 return {
  list:()=>transact('readonly',rows=>rows.sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.name.localeCompare(b.name,undefined,{sensitivity:'base'}))),
  add:input=>transact('readwrite',(rows,store)=>{
   if(!Array.isArray(input))throw Error('CONTACT_INVALID');
   const plan=planPeopleChanges(rows,input,()=>crypto.randomUUID());
   for(const row of plan.rows.slice(rows.length))store.add(row);
   return plan.results;
  }),
  update:(id,changes)=>transact('readwrite',(rows,store)=>{
   const original=rows.find(r=>r.id===id);if(!original)throw Error('CONTACT_MISSING');
   const clean=sanitizePeopleContact({...original,...changes});
   if(clean.phone&&rows.some(r=>r.id!==id&&r.phone===clean.phone))throw Error('CONTACT_DUPLICATE');
   const changed={id,...clean,...(original.pairingApiUsed?{pairingApiUsed:true}:{})};store.put(changed);return changed;
  }),
  markPairingUsed:id=>transact('readwrite',(rows,store)=>{const record=rows.find(r=>r.id===id);if(!record)throw Error('CONTACT_MISSING');store.put({...record,pairingApiUsed:true})}),
  remove:id=>transact('readwrite',(rows,store)=>{if(!rows.some(r=>r.id===id))throw Error('CONTACT_MISSING');store.delete(id)}),
  close:()=>db.close()
 };
}
