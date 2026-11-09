// Read-only inventory of server routes referenced by the user's exact
// approved PWA code. Presence is not proof that every route is invoked.
// NEVER call these URLs or access private data: source inventory only.
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const top='r20-dev/free-10m-delivery';
const queue=[
 path.join(top,'generated/reference-mijn-leven.html'),
 path.join(top,'generated/reference-present.html'),
 path.join(top,'generated/reference-tell.html'),
 path.join(top,'public/__talera_free/assets'),
 // Approved public external scripts drive the real menu/account/share actions.
 path.join(top,'public/__talera_free/f5scripts'),
 // Includes the original embedded narrator and the three untouched sources.
 path.join(top,'public/__talera_free/f5references')
];
const paths=[];
while(queue.length){
 const current=queue.shift();

 if(['/assets','/f5scripts','/f5references'].some(x=>current.endsWith(x))){
   for(const f of readdirSync(current))queue.push(path.join(current,f));
   continue;
 }
 paths.push(current);
}
const seen=new Map();
const contextByRoute=new Map();
for(const file of paths){
 const source=readFileSync(file,'utf8');
 const matches=[...source.matchAll(new RegExp('/api/[A-Za-z0-9_/-]+','g'))];
 for(const item of matches){
   const route=item[0].replace(/[/]$/,'');
   if(!seen.has(route))seen.set(route,new Set());
   seen.get(route).add(file.replace(top+'/',''));
   if(!contextByRoute.has(route))contextByRoute.set(route,[]);
   if(contextByRoute.get(route).length<3){
     const start=Math.max(0,item.index-170),end=Math.min(source.length,item.index+route.length+210);
     const excerpt=source.slice(start,end).replace(/\\s+/g,' ').slice(0,440);
     contextByRoute.get(route).push({file:file.replace(top+'/',''),excerpt});
   }
 }
}
// Source-level usage proof for the account menu's API contract. This is not
// a browser traffic trace. The script is public and contains no customer data.
const mapping=await import('./generated/public-template-map.mjs');
const accountMenu=mapping.verifiedPublicScripts['/__clean/menu-integration.mjs'];
if(!accountMenu)throw Error('APPROVED_MENU_REFERENCE_MISSING');
const menuSource=readFileSync(path.join(top,'public',accountMenu.slice(1)),'utf8');
const menuAnchors=["api('/api/discovery'","state.discovery","case 'privacy'","case 'forgot'","case 'login'","case 'register'","const storageState"];
const menuContexts=menuAnchors.map(term=>{
 const i=menuSource.indexOf(term);
 return {term,found:i>=0,excerpt:i>=0?menuSource.slice(Math.max(0,i-1050),i+1750):''};
});
console.log('TALERA_F5_ORIGINAL_MENU_CONTRACT',JSON.stringify(menuContexts));
const native=new Set(['/api/register','/api/login','/api/logout','/api/me',
 '/api/profile','/api/profile/birthdate','/api/version']);
const routes=[...seen.keys()].sort().map(route=>({
 route,explicitF5Route:native.has(route),sourceFiles:[...seen.get(route)].slice(0,8),
 examples:contextByRoute.get(route)
}));
const unported=routes.filter(x=>!x.explicitF5Route);
const result={
 source:'https://talera-design-cleanup-fase1-test-20261107.mark-a39.workers.dev',
 analysis:'STATIC_REFERENCES_ONLY_NOT_A_RUNTIME_TRAFFIC_TRACE',
 auditedSources:['anonymous-home','anonymous-present','anonymous-tell',
  'external-approved-scripts','approved-snapshot-inline-and-narrator'],
 scannedFiles:paths.length,
 explicitlyImplemented:'GET /api/version and existing Free auth/birthdate routes are counted as implemented; never count a string-only reference as a live call',
 routesFound:routes.length,possibleUnportedRoutes:unported.length,
 warning:'F5 returns 404 for unported routes; determine which are active before declaring unchanged app functionality.',
 routes
};
mkdirSync('r20-dev/free-10m-f5/generated',{recursive:true});
writeFileSync('r20-dev/free-10m-f5/generated/storage-route-inventory.json',
  JSON.stringify(result,null,2)+'\\n');
console.log('TALERA_F5_WHATSAPP_API_INVENTORY',JSON.stringify(result));
