// Real, read-only baseline PWA test with a synthetic MP4 that HAS a soundtrack.
// Exercises original local video thumbnail extraction; no account/server uploads.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium,devices} from 'playwright';
const dir='r20-dev/free-10m-f5/generated';
mkdirSync(dir,{recursive:true});
const file=dir+'/regression-soundtrack.mp4';
execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y',
'-f','lavfi','-i','color=c=blue:s=320x180:r=15:d=2',
'-f','lavfi','-i','sine=frequency=523:duration=2',
'-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p',
'-c:a','aac','-b:a','96k','-shortest','-movflags','+faststart',file]);
const streams=execFileSync('ffprobe',['-v','error',
'-show_entries','stream=codec_type','-of','csv=p=0',file],{encoding:'utf8'});
assert.ok(streams.includes('audio')&&streams.includes('video'));
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
try{
const context=await browser.newContext({...devices['iPhone 13']});
await context.addInitScript(()=>{
 window.__videoPlays=[];
 const original=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(...args){
  if(this.tagName==='VIDEO')window.__videoPlays.push({
   muted:this.muted,volume:this.volume,cls:String(this.className)});
  return original.apply(this,args);
 };
});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e.message)));
const origin='https://talera-design-cleanup-fase1-test-20261107.mark-a39.workers.dev';
const response=await page.goto(origin+'/tell',{waitUntil:'domcontentloaded',timeout:30000});
assert.equal(response.status(),200);
await page.locator('#photoInput').setInputFiles({
 name:'video-met-hoorbaar-geluid.mp4',mimeType:'video/mp4',buffer:readFileSync(file)});
await page.locator('.talera-work-tiles .tile[data-id]').first().waitFor({timeout:30000});
await page.waitForTimeout(13000);
const result=await page.evaluate(()=>{
 const tile=document.querySelector('.talera-work-tiles .tile[data-id]');
 const pic=tile?.querySelector('img');
 const frame=document.querySelector('#frame > video');
 return {imageSrcKind:pic?.src?.split(':')[0],imageWidth:pic?.naturalWidth||0,
  frameMuted:frame?.muted,frameDefaultMuted:frame?.defaultMuted,
  nativeCover:!!tile?.querySelector('video.talera-v61-native-cover'),
  videoPlays:window.__videoPlays.slice(0,10)};
});
console.log('TALERA_ORIGINAL_SOUND_VIDEO_POSTER_BROWSE',JSON.stringify({
  ...result,errors,videoHasActualAacAudio:true,sourceOriginalUI:true
}));
assert.equal(errors.length,0);
assert.equal(result.imageSrcKind,'blob','Actual video must have JPEG thumbnail, not placeholder');
assert.ok(result.imageWidth>0);
assert.ok(result.videoPlays.every(p=>p.muted),'Video thumbnail extraction must not play soundtrack');
await context.close();
}finally{await browser.close()}
