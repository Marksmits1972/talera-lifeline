// Read approved anonymous /tell snapshot only; no accounts/files.
import {readFileSync} from 'node:fs';
const s=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const targets=['Bedenk een titel','const kind=f=>','function makeGroups(rows)','async function importPhotos(chosen)','function bindInput()','function workView()','function taleraCompactWorkbench','function startView()','function overview()','function fileSelected','videoInput','video toevoegen','videoSelected','id="photoInput"','addMedia','extraVideo','maximaal zes'];
for(const needle of targets){
 const positions=[];
 let at=-1;
 while((at=s.toLowerCase().indexOf(needle.toLowerCase(),at+1))>=0){positions.push(at);if(positions.length>25)break}
 const snippet=positions[0]===undefined?'':s.slice(Math.max(0,positions[0]-200),positions[0]+(needle.includes('importPhotos')?4800:needle.includes('workView')?3900:needle.includes('Compact')?2700:1600));
 console.log('TALERA_REAL_VIDEO_IMPORT_SOURCE',JSON.stringify({needle,positions,context:snippet}));
}
