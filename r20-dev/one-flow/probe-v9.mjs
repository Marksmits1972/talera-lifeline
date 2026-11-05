// Read-only inspection from GitHub Actions: probe the *actual* protected V9 HTML.
// Never writes to Cloudflare or user storage; prints only bounded source excerpts.
const origin='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';
const paths=['/present','/v9','/vertelmodus-embed?mode=record'];
const anchors=[
 'function taleraInlineSetFrame','function taleraInlineVoiceEnded',
 'function taleraInlineReplayNext','function taleraInlineCleanVideo',
 'function taleraInlineStart','function taleraInline',
 'audio.onended=','taleraInlineVoiceEnded(s)',
 'narrationCues','narrationDurationMs','TaleraMemories.save',
 'taleraInlineSharedAudio','__taleraInlineSharedAudio',
 'function startRecording','function finishRecording','MediaRecorder',
 'const TALERA', 'function writeMemory'
];
for(const path of paths){
 const response=await fetch(origin+path,{headers:{'accept':'text/html'}});
 console.log('ROUTE',path,'status',response.status,'type',response.headers.get('content-type'));
 if(!response.ok)throw new Error('live protected V9 route unreachable');
 const body=await response.text();
 console.log('SIZE',body.length,'TITLE',(body.match(/<title[^>]*>([^<]+)/i)||[])[1]||'');
 for(const anchor of anchors){
  let p=body.indexOf(anchor);
  if(p<0)continue;
  const count=body.split(anchor).length-1;
  const from=Math.max(0,p-180),to=Math.min(body.length,p+1400);
  console.log('ANCHOR',JSON.stringify(anchor),'COUNT',count,'EXCERPT',JSON.stringify(body.slice(from,to)));
 }
}
