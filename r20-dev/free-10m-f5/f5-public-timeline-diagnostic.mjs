// Diagnose ONLY anonymous, published public TALERA code. Never read accounts/media.
import {readFileSync} from 'node:fs';
const paths=['mijn-leven','present','tell'];
const terms=[
  'Het tijdschema met media-ID','tijdschema met media','tijdschema',
  'media-ID', 'Nog niet geplaatst', 'kon niet worden teruggelezen',
  'narrationCues','narrationTimeline','timeSegments','mediaId',
  'timecode','mem.save(','mem.get(','function save','async function publish',
  'tijdstempels','voiceCues','g.media','plaats','saveDraft',
];
for(const page of paths){
 const s=readFileSync('r20-dev/free-10m-delivery/generated/reference-'+page+'.html','utf8');
 const lines=[];
 for(const term of terms){
  let at=-1,count=0,examples=[];
  while((at=s.toLowerCase().indexOf(term.toLowerCase(),at+1))>=0){
   count++;
   if(examples.length<3)
    examples.push({i:at,around:s.slice(Math.max(0,at-900),at+1450)});
  }
  if(count)lines.push({term,count,examples});
 }
 console.log('TALERA_PUBLIC_TIMELINE_DIAG',JSON.stringify({page,htmlLength:s.length,terms:lines}));
}

const tell=readFileSync('r20-dev/free-10m-delivery/generated/reference-tell.html','utf8');
const markers=[
  'talera-lifeline-dev-local-v1','function dbOpen','const dbOpen',
  'async function taleraV61PersistMediaIds',
  'const updated={...persisted,narrationCues:mapped,narrationSchema:',
  'function safeCues','async function get('
];
for(const mark of markers){
 let i=-1,positions=[],samples=[];
 while((i=tell.indexOf(mark,i+1))>=0){
   positions.push(i);
   if(samples.length<3)samples.push(tell.slice(Math.max(0,i-500),i+1350));
 }
 console.log('TALERA_DB_PUBLISH_CONTRACT',JSON.stringify({marker:mark,count:positions.length,positions,samples}));
}
