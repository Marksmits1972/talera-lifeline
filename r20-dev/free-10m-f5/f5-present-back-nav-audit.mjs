// Read-only inventory of ORIGINAL approved source navigation. No customer data.
import {readFileSync,readdirSync} from 'node:fs';
const root='r20-dev/free-10m-delivery';
const files=[
 root+'/generated/reference-mijn-leven.html',
 root+'/generated/reference-present.html',
 root+'/generated/reference-tell.html'
];
const scriptsDir=root+'/public/__talera_free/f5scripts';
for(const f of readdirSync(scriptsDir))if(/\.(js|mjs)$/.test(f))files.push(scriptsDir+'/'+f);
const patterns=[
 /(?:aria-label|title|innerText|textContent|alt)\s*=\s*['"][^'"]*(?:terug|back|herinneringen|tijdlijn|life\s*space)[^'"]*['"]/gi,
 /(?:href|location(?:\.href)?|location\.assign|location\.replace|window\.open)\s*(?:=|\()\s*['"][^'"]{1,180}['"]/gi,
 /(?:history\.back|history\.go|navigate|popstate|\/mijn-leven|\/present|\/timeline|\/tijdlijn|\/leven|\/herinnering|\/memories|\/memory)/gi,
 /(?:id|class)=["'][^"']*(?:back|terug|return|vorige|prev)[^"']*["']/gi
];
for(const file of files){
 const s=readFileSync(file,'utf8');
 const result=patterns.map((regex,index)=>{
  const matches=[...s.matchAll(regex)];
  return{kind:index,total:matches.length,items:matches.slice(0,file.includes('present')?85:35).map(m=>({
   at:m.index,term:m[0].slice(0,170),
   context:s.slice(Math.max(0,m.index-240),Math.min(s.length,m.index+360)).replace(/\s+/g,' ').slice(0,570)
  }))};
 });
 console.log('TALERA_F5_BACK_NAV_SOURCE',JSON.stringify({file,size:s.length,results:result}));
}
console.log('TALERA_F5_NAV_SOURCE_AUDIT_COMPLETE');
