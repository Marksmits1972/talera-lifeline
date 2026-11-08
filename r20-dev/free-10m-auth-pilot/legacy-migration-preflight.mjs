// TALERA Free legacy-login migration SAFETY GATE — offline data validator only.
// Does not copy, modify, expose or export customer records. Fails closed.
// Legacy D1 session IDs are SHA-256 hashes of talera_sid tokens: their matching
// DO object can be populated WITHOUT reading the raw cookie itself.
import {validAccountId,validEmail,validHandle,validDisplay} from './auth-util.mjs';

const HEX64=/^[0-9a-f]{64}$/;
const asInteger=n=>Number.isSafeInteger(n)&&n>=0;
const issue=(code,index)=>({code,rowIndex:index});
export function inspectLegacySnapshot({accounts,sessions,birthdates=[],now=Date.now()}){
 if(!Array.isArray(accounts)||!Array.isArray(sessions)||!Array.isArray(birthdates)
    ||!asInteger(now))throw Error('INVALID_LEGACY_INPUT');
 const errors=[],ids=new Set(),emails=new Set(),handles=new Set(),sessionHashes=new Set();
 let activeAccounts=0,disabledAccounts=0,validSessions=0,expiredSessions=0;
 for(let i=0;i<accounts.length;i++){
  const a=accounts[i]||{};
  try{validAccountId(a.id)}catch{errors.push(issue('ACCOUNT_ID',i))}
  if(ids.has(a.id))errors.push(issue('DUPLICATE_ACCOUNT_ID',i));
  ids.add(a.id);
  let email;
  try{email=validEmail(a.email)}catch{errors.push(issue('EMAIL',i))}
  if(email&&emails.has(email))errors.push(issue('DUPLICATE_EMAIL',i));
  if(email)emails.add(email);
  if(a.public_handle!=null&&a.public_handle!==''){
   let handle;
   try{handle=validHandle(a.public_handle)}catch{errors.push(issue('HANDLE',i))}
   if(handle&&handles.has(handle))errors.push(issue('DUPLICATE_HANDLE',i));
   if(handle)handles.add(handle);
  }
  try{validDisplay(a.display_name)}catch{errors.push(issue('DISPLAY_NAME',i))}
  if(!HEX64.test(a.password_hash||'')||!HEX64.test(a.password_salt||''))
   errors.push(issue('PASSWORD_HASH_LAYOUT',i));
  if(!asInteger(a.created_at))errors.push(issue('CREATED_AT',i));
  if(a.status==='active')activeAccounts++;
  else if(a.status==='disabled'||a.status==='suspended')disabledAccounts++;
  else errors.push(issue('UNKNOWN_ACCOUNT_STATUS',i));
  if(a.discoverable!==0&&a.discoverable!==1)errors.push(issue('DISCOVERABILITY',i));
 }
 for(let i=0;i<sessions.length;i++){
  const s=sessions[i]||{};
  if(!HEX64.test(s.id_hash||''))errors.push(issue('SESSION_HASH',i));
  if(sessionHashes.has(s.id_hash))errors.push(issue('DUPLICATE_SESSION_HASH',i));
  sessionHashes.add(s.id_hash);
  if(!ids.has(s.account_id))errors.push(issue('MISSING_ACCOUNT_FOR_SESSION',i));
  if(!asInteger(s.expires_at)||!asInteger(s.created_at)||s.expires_at<=s.created_at)
   errors.push(issue('SESSION_TIME',i));
  if(asInteger(s.expires_at)&&s.expires_at>now)validSessions++;
  else expiredSessions++;
 }
 const bornIds=new Set();
 for(let i=0;i<birthdates.length;i++){
  const b=birthdates[i]||{};
  if(!ids.has(b.account_id))errors.push(issue('ORPHAN_BIRTHDATE',i));
  if(bornIds.has(b.account_id))errors.push(issue('DUPLICATE_BIRTHDATE',i));
  bornIds.add(b.account_id);
  const raw=b.birth_date;
  if(typeof raw!=='string'||!(/^\d{4}-\d{2}-\d{2}$/).test(raw)){
   errors.push(issue('BIRTH_DATE_LAYOUT',i));continue;
  }
  const [year,month,day]=raw.split('-').map(Number);
  const parsed=new Date(Date.UTC(year,month-1,day));
  if(parsed.getUTCFullYear()!==year||parsed.getUTCMonth()!==month-1||
     parsed.getUTCDate()!==day||year<1900||raw>new Date(now).toISOString().slice(0,10))
   errors.push(issue('INVALID_BIRTH_DATE',i));
 }
 return Object.freeze({
  acceptable:errors.length===0,
  counts:{accounts:accounts.length,activeAccounts,disabledAccounts,
   sessions:sessions.length,unexpiredSessions:validSessions,
   expiredSessions,birthdates:birthdates.length},
  issueCodes:errors,
  // No customer identity, cookie, salted password hash, birthdate, email or token is exposed.
  unsafeDataExport:false,
  rawTokensRequired:false,
  oldD1MutationPerformed:false
 });
}
