// Optional GPS reverse lookup. No media, account identity or coordinates stored
// on the server. The application username never enters the browser bundle.
import {json,sameOrigin} from '../free-10m-auth-pilot/auth-util.mjs';
const safeText=s=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=120&&!/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(s);
export function selectNearbyPlace(data){
 if(data?.status||!Array.isArray(data?.geonames)||!data.geonames.length)return null;
 const rows=data.geonames;
 const first=rows[0],distance=Number(first?.distance);
 if(first?.fcl!=='P'||typeof first.distance!=='string'&&typeof first.distance!=='number'||
    first.distance===''||!Number.isFinite(distance)||distance<0||distance>2||
    !/^[A-Z]{2}$/.test(first.countryCode||'')||!safeText(first.name))return null;
 // The provider returns point locations, not municipal boundaries.
 // Reject close competing names rather than imply false precision.
 const rival=rows.slice(1).find(x=>x.name!==first.name||x.countryCode!==first.countryCode);
 if(rival&&(!Number.isFinite(Number(rival.distance))||Number(rival.distance)-distance<0.25))return null;
 let country;try{country=new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(first.countryCode)}catch(_){return null}
 if(!safeText(country)||first.countryCode==='ZZ')return null;
 return {countryCode:first.countryCode,country,city:first.name,source:'geonames-nearby-place'};
}
export async function capturePlaceApi(request,env,{getAccount,getScope,fetcher=fetch}){
 const unavailable=()=>json({place:null},503);
 if(request.method!=='POST')return json({place:null},405);
 if(!sameOrigin(request)||!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return json({place:null},403);
 const actor=await getAccount();
 if(!actor?.id)return json({place:null},401);
 if(request.headers.get('x-talera-local-scope')!==(await getScope(actor.id)).slice(0,32))return json({place:null},403);
 const user=env.GEONAMES_USERNAME;
 if(typeof user!=='string'||! /^[A-Za-z0-9_.-]{1,80}$/.test(user)||user.toLowerCase()==='demo'||!env.AUTH_RATES?.get)return unavailable();
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
  // additional database/Worker. At most 120 requests per hour window;
  // even 25 adjacent windows cost <= 9,000 credits in 24 hours (3 each).
  const ns=env.AUTH_RATES;
  const hit=(key,limit)=>ns.get(ns.idFromName('talera-capture-place-v1:'+key)).hit({limit,windowMs:3600000});
  if(!await hit('account:'+actor.id,24)||!await hit('application',120))return json({place:null},429);
  const url=new URL('https://secure.geonames.org/findNearbyPlaceNameJSON');
  url.search=new URLSearchParams({lat:latitude.toFixed(3),lng:longitude.toFixed(3),username:user,lang:'nl',radius:'2',maxRows:'3',style:'MEDIUM',localCountry:'true'});
  const response=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(6000),headers:{accept:'application/json'}});
  if(!response.ok)return unavailable();
  const data=await response.json();
  if(data?.status)return unavailable();
  return json({place:selectNearbyPlace(data)});
 }catch(_){return unavailable()}
}
