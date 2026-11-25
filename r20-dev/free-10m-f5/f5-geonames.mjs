// Optional GPS reverse lookup. No media, account identity or coordinates stored
// on the server. The application username never enters the browser bundle.
import {json,sameOrigin} from '../free-10m-auth-pilot/auth-util.mjs';
const safeText=s=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=120&&!/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(s);
// GeoNames points are approximate, not locality boundaries. Never choose a
// district merely because it is the nearest point. Postal locality evidence
// can disambiguate ordinary PPL entries, including mislabeled neighborhoods.
const codes=new Set(['PPL','PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLG']);
const administrative=new Set(['PPLA','PPLA2','PPLA3','PPLA4','PPLA5','PPLC','PPLG']);
const nameKey=s=>s.normalize('NFC').toLocaleLowerCase('en');
const km=x=>typeof x==='number'||typeof x==='string'&&x.trim()!==''?Number(x):NaN;
const countryCode=x=>typeof x==='string'&&/^[A-Z]{2}$/.test(x)&&x!=='ZZ';
export function selectNearbyPlace(data,postal){
 if(data?.status||postal?.status||!Array.isArray(data?.geonames)||!Array.isArray(postal?.postalCodes))return null;
 const rows=data.geonames.filter(x=>x&&x.fcl==='P'&&safeText(x.name)&&countryCode(x.countryCode)&&
  Number.isFinite(km(x.distance))&&km(x.distance)>=0&&km(x.distance)<=2).sort((a,b)=>km(a.distance)-km(b.distance));
 const eligible=rows.filter(x=>codes.has(x.fcode));
 if(!eligible.length)return null;
 const post=postal.postalCodes.filter(x=>x&&safeText(x.placeName)&&countryCode(x.countryCode)&&Number.isFinite(km(x.distance))&&km(x.distance)>=0&&km(x.distance)<=1).sort((a,b)=>km(a.distance)-km(b.distance));
 let selected;
 if(post.length){
  const nearest=post[0],same=x=>x.countryCode===nearest.countryCode&&nameKey(x.placeName)===nameKey(nearest.placeName);
  if(post.some(x=>km(x.distance)-km(nearest.distance)<0.25&&!same(x)))return null;
  const matches=eligible.filter(x=>x.countryCode===nearest.countryCode&&nameKey(x.name)===nameKey(nearest.placeName));
  if(!matches.length)return null;
  selected=matches[0];
  // A foreign-country point is never evidence for this locality.
  if(rows.some(x=>x.countryCode!==selected.countryCode&&km(x.distance)<km(selected.distance)+0.25))return null;
 }else{
  // With no postal coverage, accept only an explicit administrative seat
  // that is the unambiguous nearest eligible place; ordinary PPL may be a
  // district or a village and cannot be distinguished from the points alone.
  const first=eligible[0];
  if(!administrative.has(first.fcode)||rows[0]!==first)return null;
  if(rows.some(x=>x!==first&&(x.name!==first.name||x.countryCode!==first.countryCode)&&km(x.distance)-km(first.distance)<0.25))return null;
  selected=first;
 }
 let country;try{country=new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(selected.countryCode)}catch(_){return null}
 if(!safeText(country))return null;
 return {countryCode:selected.countryCode,country,city:selected.name,source:'geonames-locality-v2'};
}
export async function capturePlaceApi(request,env,{getAccount,getScope,fetcher=fetch}){
 const unavailable=diagnostic=>json({place:null,diagnostic},503);
 if(request.method!=='POST')return json({place:null},405);
 if(!sameOrigin(request)||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({place:null},403);
 const actor=await getAccount();
 if(!actor?.id)return json({place:null},401);
 if(request.headers.get('x-talera-local-scope')!==(await getScope(actor.id)).slice(0,32))return json({place:null},403);
 const user=env.GEONAMES_USERNAME;
 if(typeof user!=='string'||! /^[A-Za-z0-9_.-]{1,80}$/.test(user)||user.toLowerCase()==='demo'||!env.AUTH_RATES?.get)return unavailable('api-configuratie');
 try{
  // Limit request body without buffering an arbitrary upload.
  const reader=request.body?.getReader();if(!reader)return json({place:null},400);
  let text='',n=0;const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>256){await reader.cancel();return json({place:null},400)}text+=decoder.decode(value,{stream:true})}
  text+=decoder.decode();
  let input;try{input=JSON.parse(text)}catch(_){return json({place:null},400)}
  if(!input||Object.keys(input).sort().join(',')!=='latitude,longitude')return json({place:null},400);
  const {latitude,longitude}=input;
  if(typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return json({place:null},400);
  // Use the existing durable rate namespace, with isolated keys and no
  // additional database/Worker. At most 72 requests per hour window;
  // even 25 adjacent windows cost <= 9,000 credits in 24 hours (3+2 each).
  // Same jurisdiction as the existing Free authentication rate service.
  // Fail closed, rather than silently use an unrestricted namespace.
  let ns;
  try{ns=env.AUTH_STORAGE_JURISDICTION==='eu'?env.AUTH_RATES.jurisdiction('eu'):
    env.AUTH_STORAGE_JURISDICTION==='local-test'?env.AUTH_RATES:null;
   if(!ns?.get||!ns?.idFromName)return unavailable('api-configuratie');
   const hit=(key,limit)=>ns.get(ns.idFromName('talera-capture-place-v1:'+key)).hit({limit,windowMs:3600000});
   if(!await hit('account:'+actor.id,24)||!await hit('application',72))return json({place:null},429);
  }catch(_){return unavailable('api-limiet-opslag')}
  const url=new URL('https://secure.geonames.org/findNearbyPlaceNameJSON');
  url.search=new URLSearchParams({lat:latitude.toFixed(3),lng:longitude.toFixed(3),username:user,lang:'nl',radius:'2',maxRows:'10',style:'FULL',localCountry:'true'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
  try{
   // workerd rejects redirect:'error' BEFORE any network request. Manual
   // redirects preserve fail-closed behaviour; never forward GPS or username
   // to a Location destination. Use the supported Request mode explicitly.
   const response=await fetcher(url,{method:'GET',redirect:'manual',signal:controller.signal,headers:{accept:'application/json'}});
   if(response.status>=300&&response.status<400)return unavailable('api-provider-http');
   if(!response.ok)return unavailable('api-provider-http');
   let data;try{data=await response.json()}catch(_){return unavailable('api-provider-antwoord')}
   if(data?.status)return unavailable('api-provider-status');
   if(!Array.isArray(data?.geonames))return unavailable('api-provider-antwoord');
   if(!data.geonames.length)return json({place:null});
   const postalUrl=new URL('https://secure.geonames.org/findNearbyPostalCodesJSON');
   postalUrl.search=new URLSearchParams({lat:latitude.toFixed(3),lng:longitude.toFixed(3),username:user,radius:'1',maxRows:'15',style:'FULL',localCountry:'true'});
   const postalResponse=await fetcher(postalUrl,{method:'GET',redirect:'manual',signal:controller.signal,headers:{accept:'application/json'}});
   if(!postalResponse.ok||postalResponse.status>=300&&postalResponse.status<400)return unavailable('api-provider-http');
   let postal;try{postal=await postalResponse.json()}catch(_){return unavailable('api-provider-antwoord')}
   if(postal?.status)return unavailable('api-provider-status');
   if(!Array.isArray(postal?.postalCodes))return unavailable('api-provider-antwoord');
   return json({place:selectNearbyPlace(data,postal)});
  }catch(_){return unavailable('api-provider-netwerk')}finally{clearTimeout(timer)}
 }catch(_){return unavailable('api-configuratie')}
}
