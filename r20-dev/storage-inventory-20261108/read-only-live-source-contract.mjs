/**
 * Read ONLY live Cloudflare Worker sources and emit minimal non-sensitive
 * architecture signals. The source itself is NEVER printed, uploaded or
 * written to disk. No D1 queries, no R2 reads, no user API calls.
 * Regex evidence is advisory: no false claim of complete AST coverage.
 */
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
const account=String(process.env.CLOUDFLARE_ACCOUNT_ID||'').trim();
const token=String(process.env.CLOUDFLARE_API_TOKEN||'').trim();
assert.match(account,/^[a-f0-9]{32}$/i);
assert.ok(token.length>20);
const approved=[
 'talera-clean-core-staging-20261030',
 'talera-pwa-v56-whatsapp-foto-social-20261031',
 'talera-pwa-v45-talera-en-whatsapp-20261030',
 'talera-account-birthdate-test-20261107',
 'xxory-test'
];
const out=[];
for(const worker of approved){
 let content=null,error=null;
 try{
  const res=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+
   '/workers/scripts/'+encodeURIComponent(worker),{
    headers:{authorization:'Bearer '+token},
    method:'GET',signal:AbortSignal.timeout(25000)
   });
  if(!res.ok){error='HTTP_'+res.status;}
  else {
   const header=res.headers.get('content-type')||'';
   if(!/(javascript|multipart|octet-stream|text\/plain)/i.test(header)){
    error='UNEXPECTED_CONTENT_TYPE';
   }else content=await res.text();
  }
 }catch{error='READ_ERROR_OR_TIMEOUT'}
 if(content!==null){
  // Filter strictly to alphanumeric SQL table and path identifiers, do not
  // expose script literals, token strings, account IDs or source content.
  const matches=(re)=>[...content.matchAll(re)].map(m=>m[1]);
  const tables=[...new Set(matches(/\b(?:CREATE TABLE(?: IF NOT EXISTS)?|INSERT(?: OR IGNORE)? INTO|UPDATE|DELETE FROM|FROM|JOIN)\s+([a-zA-Z][a-zA-Z0-9_]*)\b/gi))]
   .filter(x=>!['SET','VALUES','SELECT','IF','NOT','TABLE','WHERE'].includes(x.toUpperCase()))
   .slice(0,90).sort();
  const routes=[...new Set(matches(/["'\x60](\/api\/[a-z0-9/_-]{2,100})["'\x60]/gi))]
   .filter(p=>/^\/api\/[a-z0-9/_-]+$/i.test(p)).slice(0,100).sort();
  const summary={
   worker,readSucceeded:true,
   approximateSourceBytes:new TextEncoder().encode(content).byteLength,
   tableIdentifiersFromCode:tables,
   staticApiPathsFromCode:routes,
   referencesToD1:/\b(?:env\.DB|env\.CORE|env\.BIRTH_DB|\.prepare\()/i.test(content),
   referencesToMedia:/\b(?:env\.(?:MEDIA|PREMIUM_MEDIA|PREMIUM_PRIVATE|CORE_MEDIA|SHARE_MEDIA)|\.put\(|\.get\()/i.test(content),
   containsSessionCookieTerm:/talera_sid/.test(content),
   containsManageTokenTerm:/manage_token_hash|manageToken/.test(content),
   containsPremiumTerm:/premium/i.test(content),
   note:'Lexical inventory only. Raw Worker code not saved, shown or uploaded.'
  };
  out.push(summary);
  console.log('LIVE_WORKER_SOURCE_CONTRACT',JSON.stringify(summary));
 }else{
  out.push({worker,readSucceeded:false,error});
  console.log('UNVERIFIED_LIVE_WORKER_SOURCE',JSON.stringify({worker,error}));
 }
}
mkdirSync(join(dir,'results'),{recursive:true});
writeFileSync(join(dir,'results/live-source-contract-sanitized.json'),
 JSON.stringify({scope:'GET-only Cloudflare Worker source; sanitized lexical metadata',workers:out},null,2)+'\n');
if(!out.some(x=>x.readSucceeded))throw Error('No Worker source visible; live code contract remains unknown');
