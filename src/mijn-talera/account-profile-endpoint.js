/**
 * TALERA Clean Core — one additive profile endpoint.
 * Deployed into the EXISTING Clean Core Worker, not a separate service/chain.
 * Email stays read-only until verified email delivery is configured.
 */
export const PROFILE_ANCHOR =
  " if(p==='/api/me'&&m==='GET')return user?json({account:{id:user.id,displayName:user.display_name,email:user.email}}):error(401,'Aanmelden bij TALERA is nodig');";

export const PROFILE_ENDPOINT = String.raw`
 if(p==='/api/profile'&&m==='POST'){
   if(!user)return error(401,'Aanmelden bij TALERA is nodig');
   if(!await rateLimit(req,env,'profile-update',12))return error(429,'Probeer later opnieuw');
   const d=await body(req),name=typeof d.displayName==='string'?d.displayName.trim():'';
   if(!name||name.length>100||/[\\u0000-\\u001f\\u007f]/.test(name))return error(400,'Vul een geldige naam in (maximaal 100 tekens)');
   await env.DB.prepare("UPDATE accounts SET display_name=? WHERE id=? AND status='active'").bind(name,user.id).run();
   return json({account:{id:user.id,displayName:name,email:user.email}});
 }
`;

export function addProfileEndpoint(source){
  if(typeof source!=='string')throw Error('Geen broncode');
  if(source.includes("if(p==='/api/profile'&&m==='POST')"))return {source,changed:false};
  if(source.split(PROFILE_ANCHOR).length!==2)throw Error('Clean Core is gewijzigd; geen gedeeltelijke patch');
  if(!source.includes("if(m!=='GET'&&!allowedWrite(req))return error(403"))throw Error('Herkomstcontrole niet gevonden');
  if(!source.includes("if(!user)return error(401,'Aanmelden bij TALERA is nodig')"))throw Error('Sessiecontrole niet gevonden');
  return {source:source.replace(PROFILE_ANCHOR,PROFILE_ANCHOR+PROFILE_ENDPOINT),changed:true};
}
