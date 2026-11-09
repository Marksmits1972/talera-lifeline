// F5-only guarded video-picker transparency patch for the CURRENT approved
// /tell HTML. The recorder, swipe clocks, presentation, media blobs, and
// account-private IndexedDB remain byte-identical outside these 3 UI sites.
const once=(source,find,replacement)=>{
 const n=source.split(find).length-1;
 if(n!==1)throw Error('F5_VIDEO_PICKER_MARKER_CHANGED:'+n+':'+find.slice(0,38));
 return source.replace(find,replacement);
};
export function addTransparentVideoPicker(html){
 if(typeof html!=='string'||!html.includes('talera-memory-store-v1'))
   throw Error('F5_VIDEO_SOURCE_MISSING');
 // Global page-local selection count, never files, filenames, or content.
 const helper=`
function taleraF5FilesReceived(files){
 const names=Array.isArray(files)?files:[];
 const videos=names.filter(f=>kind(f)==='video').length;
 window.__taleraF5PickerCounts={
   photos:names.length-videos,videos,count:names.length
 };
}
`;
 html=once(html,
  'function bindInput(){const input=',
  helper+'function bindInput(){const input=');
 // Initial picker also reports the count the iPhone ACTUALLY handed to JS.
 html=once(html,
  "const a=[...(e.target.files||[])];e.target.value='';importPhotos(a)",
  "const a=[...(e.target.files||[])];e.target.value='';"+
  "taleraF5FilesReceived(a);"+
  "if(!a.length){showError('De iPhone gaf geen foto of video door. Kies het bestand opnieuw.');return;}"+
  "importPhotos(a)");
 // In the existing + tile, never silently accept a zero-file picker result.
 html=once(html,
  "const files=[...(input.files||[])];input.value='';\n    if(files.length)void importPhotos(files,g.id);",
  "const files=[...(input.files||[])];input.value='';\n"+
  "    taleraF5FilesReceived(files);\n"+
  "    if(files.length)void importPhotos(files,g.id);\n"+
  "    else showError('De iPhone heeft geen bestand doorgegeven. Kies de video apart.');");
 // Render the real local media count after EACH editor re-render. The count
 // is based on the already imported File objects (not guessed from a picker).
 const status=`
  const tally=document.createElement('p');
  tally.id='talera-f5-media-status';
  tally.setAttribute('role','status');
  tally.setAttribute('aria-live','polite');
  tally.style.cssText='font:500 13px/1.45 system-ui;color:#244d66;'+
    'margin:12px 2px 4px;text-align:left;';
  const actualVideos=g.media.filter(id=>kind(assets.get(id))==='video').length;
  const received=window.__taleraF5PickerCounts;
  tally.textContent='In dit verhaal: '+(g.media.length-actualVideos)+
    ' foto(’s) en '+actualVideos+' video(’s).'+
    (received?' Laatste selectie aan TALERA doorgegeven: '+
      received.photos+' foto(’s), '+received.videos+' video(’s).':'');
  panel.append(tally);
`;
 html=once(html,
  '  if(!grid)return;\n  // Keep every original TALERA tile',
  '  if(!grid)return;\n'+status+'  // Keep every original TALERA tile');
 // A dedicated native iOS video chooser bypasses the mixed-photos picker.
 // It reuses the EXACT original target-memory importPhotos(...,g.id) flow.
 const extra=`
  const pickVideo=document.createElement('input');
  pickVideo.type='file';
  pickVideo.id='taleraF5AddVideoInput';
  pickVideo.accept='video/*,.mov,.mp4,.m4v';
  pickVideo.hidden=true;
  pickVideo.setAttribute('aria-label','Een video kiezen voor dit verhaal');
  const videoButton=document.createElement('button');
  videoButton.type='button';
  videoButton.id='taleraF5AddVideoButton';
  videoButton.textContent='▶ Video apart toevoegen';
  videoButton.setAttribute('aria-label','Video apart toevoegen');
  videoButton.style.cssText='display:block;width:100%;min-height:44px;'+
    'margin:8px 0 2px;padding:10px 12px;border:1px solid #96adc2;'+
    'border-radius:12px;background:#f5f8fc;color:#17365c;'+
    'font:600 14px system-ui;';
  videoButton.onclick=()=>{
    if(taleraZeroSession||taleraV9MediaMutating){
      showError('Stop eerst de opname voordat je een video toevoegt.');return;
    }
    pickVideo.click();
  };
  pickVideo.onchange=()=>{
    const files=[...(pickVideo.files||[])];pickVideo.value='';
    taleraF5FilesReceived(files);
    if(!files.length){
      showError('De iPhone heeft geen video aan TALERA doorgegeven. '+
        'Kies de video rechtstreeks via de afzonderlijke videoknop.');return;
    }
    if(files.length!==1||kind(files[0])!=='video'){
      showError('Kies precies één video (.MOV of .MP4).');return;
    }
    if(!files[0].size){
      showError('De geselecteerde video is leeg of niet beschikbaar in iCloud.');return;
    }
    if(files[0].size>95*1024*1024){
      showError('Deze video is groter dan de huidige Free-testlimiet van 95 MB. '+
        'Er is niets ongemerkt weggelaten.');return;
    }
    void importPhotos(files,g.id);
  };
  panel.append(pickVideo,videoButton);
`;
 html=once(html,
  '  grid.append(add);panel.append(input);\n}',
  '  grid.append(add);panel.append(input);\n'+extra+'}');
 return html;
}
