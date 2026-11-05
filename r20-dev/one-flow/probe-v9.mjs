// Read-only inspection from GitHub Actions: probe the *actual* protected V9 HTML.
// Never writes to Cloudflare or user storage; prints only bounded source excerpts.
const origin='https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev';
const paths=['/present','/v9','/vertelmodus-embed?mode=record'];
const anchors=[
 'function taleraInlineSetFrame','function taleraInlineVoiceEnded','function taleraInlineInstallAudioControls','function taleraInlineLoadVideo','function present(memory)',
 'function taleraInlineReplayNext','function taleraInlineCleanVideo',
 'function taleraInlineStart','function taleraInline',
 'audio.onended=','taleraInlineVoiceEnded(s)',
 'narrationCues','narrationDurationMs','TaleraMemories.save','function safeCues','function present(',
 'taleraInlineSharedAudio','__taleraInlineSharedAudio',
 'function startRecording','function finishRecording','MediaRecorder',
 'const TALERA', 'function writeMemory'
];
for(const path of paths){
 const response=await fetch(origin+path,{headers:{'accept':'text/html'}});
 console.log('ROUTE',path,'status',response.status,'type',response.headers.get('content-type'));
 if(!response.ok){ console.log('SKIP unsupported route',path); continue; }
 const body=await response.text();
 console.log('SIZE',body.length,'TITLE',(body.match(/<title[^>]*>([^<]+)/i)||[])[1]||'');
 for(const anchor of anchors){
  let p=body.indexOf(anchor);
  if(p<0)continue;
  const count=body.split(anchor).length-1;
  const from=Math.max(0,p-180),to=Math.min(body.length,p+((/InlineInstallAudioControls|InlineLoadVideo|present\\(/.test(anchor))?4500:2000));
  console.log('ANCHOR',JSON.stringify(anchor),'COUNT',count,'EXCERPT',JSON.stringify(body.slice(from,to)));
 }
}
