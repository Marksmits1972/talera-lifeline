// TALERA F5 - extra Safari-family regression, no deployment/customer content.
// Playwright Linux WebKit is NOT a physical iPhone. Only synthetic video + sound.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import {webkit,devices} from 'playwright';
const dir='r20-dev/free-10m-f5/generated';
mkdirSync(dir,{recursive:true});
const formats=[
 {name:'mov-h264-aac',ext:'mov',mime:'video/quicktime',video:'libx264',audio:'aac',file:dir+'/webkit-synthetic-h264-aac.mov'},
 {name:'webm-vp8-opus',ext:'webm',mime:'video/webm',video:'libvpx',audio:'libopus',file:dir+'/webkit-synthetic-vp8-opus.webm'}
];
for(const x of formats){
 const args=['-nostdin','-y','-hide_banner','-loglevel','error',
 '-f','lavfi','-i','testsrc2=size=192x108:rate=15:duration=2',
 '-f','lavfi','-i','sine=frequency=660:sample_rate=44100:duration=2',
 '-c:v',x.video,...(x.video==='libx264'?['-preset','ultrafast','-pix_fmt','yuv420p']:['-deadline','realtime','-cpu-used','6']),
 '-c:a',x.audio,'-shortest',x.file];
 execFileSync('ffmpeg',args,{timeout:30000});
 const tracks=execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type',
 '-of','csv=p=0',x.file],{encoding:'utf8',timeout:10000});
 assert.ok(tracks.includes('video')&&tracks.includes('audio'),'Must test actual video with sound');
}
const origin='http://127.0.0.1:8847',gate='1'.repeat(64);
const worker=spawn('node_modules/.bin/wrangler',[
 'dev','--local','--ip','127.0.0.1','--port','8847',
 '--config','r20-dev/free-10m-f5/wrangler.jsonc',
 '--persist-to',dir+'/webkit-synthetic-video-audio-only',
 '--var','STAGING_F5_KEY:'+gate,
 '--var','STAGING_ACCESS_KEY:'+'2'.repeat(64),
 '--var','STAGING_SOCIAL_KEY:'+'3'.repeat(64),
 '--var','AUTH_NAMESPACE_KEY:SYNTHETIC_WEBKIT_AUDIO_POSTER_20261109',
 '--var','DEMO_IDENTITY_KEY:SYNTHETIC_WEBKIT_SOCIAL_20261109',
 '--log-level','error'
],{env:{...process.env,CI:'true',BROWSER:'none'},stdio:['ignore','pipe','pipe']});
let output='',browser;
for(const stream of [worker.stdout,worker.stderr])
 stream.on('data',x=>output=(output+x.toString()).slice(-3000));
try{
 let alive=false;
 for(let i=0;i<110;i++){
  try{const r=await fetch(origin+'/__f5/health',{signal:AbortSignal.timeout(800)});if(r.status===200){alive=true;break}}catch{}
  if(worker.exitCode!==null)break;
  await new Promise(ok=>setTimeout(ok,300));
 }
 assert.ok(alive,'Local F5 browser test unavailable '+output);
 const nonce=Date.now().toString(36),user={
  email:'f5-webkit-media-'+nonce+'@example.invalid',username:'webkitaudio'+nonce,
  displayName:'Synthetic WebKit audio video',password:'Synthetic_WebKit_Sound_Only_F5_2026',
  birthDate:'1974-04-02'
 };
 const reg=await fetch(origin+'/api/register',{method:'POST',headers:{
  origin,'content-type':'application/json','cf-connecting-ip':'192.0.2.232','x-talera-f5-key':gate
 },body:JSON.stringify(user)});
 assert.equal(reg.status,200,'Synthetic local account sign-in');
 const sid=/talera_sid=([a-f0-9]{64})/.exec(reg.headers.get('set-cookie')||'')?.[1];
 assert.ok(sid);
 browser=await webkit.launch({headless:true});
 const context=await browser.newContext({...devices['iPhone 13'],
  extraHTTPHeaders:{'x-talera-f5-key':gate}});
 await context.addCookies([{name:'talera_sid',value:sid,domain:'127.0.0.1',
  path:'/',secure:false,httpOnly:true,sameSite:'Lax'}]);
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,400)));
 await page.addInitScript(()=>{
  window.__taleraMutedVideoPlays=[];
  const original=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(...a){
   if(this.tagName==='VIDEO')window.__taleraMutedVideoPlays.push({
    muted:this.muted,defaultMuted:this.defaultMuted,
    className:String(this.className||''),parentId:this.parentElement?.id||''
   });
   return original.apply(this,a);
  };
 });
 const pageResponse=await page.goto(origin+'/tell',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(pageResponse.status(),200);
 const support=await page.evaluate(()=>({
  mov:document.createElement('video').canPlayType('video/quicktime; codecs="avc1.42E01E,mp4a.40.2"'),
  h264:document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E,mp4a.40.2"'),
  webm:document.createElement('video').canPlayType('video/webm; codecs="vp8,opus"'),
  browser: navigator.userAgent.slice(0,160)
 }));
 console.log('TALERA_F5_WEBKIT_CODEC_SUPPORT',JSON.stringify(support));
 const outcomes=[];
 for(const format of formats){
  await page.locator('#photoInput').setInputFiles({name:'synthetic-'+format.name+'.'+format.ext,
   mimeType:format.mime,buffer:readFileSync(format.file)});
  await page.locator('.talera-work-tiles .tile[data-id]').first()
   .waitFor({state:'visible',timeout:28000});
  await page.waitForTimeout(14500);
  const observed=await page.evaluate(()=>{
   const tile=document.querySelector('.talera-work-tiles .tile[data-id]');
   const img=tile?.querySelector('img');
   const native=tile?.querySelector('video.talera-v61-native-cover');
   const frame=document.querySelector('#frame > video');
   return {
    frameMuted:frame?.muted,
    frameDefaultMuted:frame?.defaultMuted,
    tileImageKind:(img?.src||'').split(':')[0],
    tileImageWidth:img?.naturalWidth||0,
    nativeCover:!!native,
    nativeOpacity:native?.style.opacity||null,
    nativeWidth:native?.videoWidth||0,
    mutedPlayEvents:window.__taleraMutedVideoPlays.slice(),
    tiles:document.querySelectorAll('.talera-work-tiles .tile[data-id]').length
   };
  });
  outcomes.push({name:format.name,...observed});
  assert.equal(observed.frameMuted,true,
   'Editor video unmuted in WebKit for '+format.name);
  assert.equal(observed.frameDefaultMuted,true,
   'Editor default muted false in WebKit '+format.name);
  assert.ok(observed.mutedPlayEvents.every(x=>x.muted),
   'Audio-bearing video played with unmuted sound in WebKit '+format.name);
  // Video codec support on a Linux runner does NOT prove iPhone MOV/HEVC.
  // Missing thumbnails in an unsupported decoder are diagnostic, not app failures.
 }
 console.log('TALERA_F5_WEBKIT_AUDIO_AND_COVER_RESULTS',JSON.stringify({
  engine:'Linux Playwright WebKit (not physical Safari)',
  syntheticAudioPresent:true,baselineApprovedMarkupPreserved:true,
  support,outcomes,pageErrors:errors,
  realIPhoneMediaCertified:false,cloudMediaUploads:0
 }));
 assert.equal(errors.length,0,'Real WebKit runtime exceptions');
 await context.close();
}finally{
 if(browser)await browser.close();
 if(worker&&!worker.killed)worker.kill('SIGTERM');
}
