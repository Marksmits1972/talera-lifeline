import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { integratedStoryPlayerScript, integratedStoryPlayerStyle } from '../src/story-player-v2-integrated.js';

const src=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const carousel=readFileSync(new URL('../src/live-memory-integration.js',import.meta.url),'utf8');

test('the new Story Player parses as one embedded PWA controller',()=>{
  assert.doesNotThrow(()=>new Function(integratedStoryPlayerScript));
  assert.ok(integratedStoryPlayerStyle.includes('.talera-v2-sheet'));
  assert.ok(src.includes('integratedStoryPlayerScript'));
  assert.ok(src.includes('integratedStoryPlayerStyle'));
  assert.ok(!src.includes('taleraTellScript'));
  assert.ok(src.includes('talera-library-first-story-player-controller'));
  assert.ok(!integratedStoryPlayerScript.includes('location.href='));
  assert.ok(!integratedStoryPlayerScript.includes('window.open('));
});

test('library owns original bytes, story record owns references only',()=>{
  assert.ok(integratedStoryPlayerScript.includes('storage.getDirectory()'));
  assert.ok(integratedStoryPlayerScript.includes('handle.createWritable()'));
  assert.ok(integratedStoryPlayerScript.includes('await writable.write(file)'));
  assert.ok(integratedStoryPlayerScript.includes('story.mediaIds'));
  assert.ok(integratedStoryPlayerScript.includes('story.cues'));
  assert.ok(integratedStoryPlayerScript.includes('draftFileKeys')===false);
  const save=integratedStoryPlayerScript.slice(integratedStoryPlayerScript.indexOf('async function saveStory('), integratedStoryPlayerScript.indexOf('async function readStory('));
  assert.ok(save.includes("tx.objectStore('stories').put(story)"));
  assert.ok(!save.includes('writable.write'));
  assert.ok(!save.includes('importFile('));
});

test('new memories use only the existing RH19 presentation stage',()=>{
  assert.ok(integratedStoryPlayerScript.includes("document.getElementById('photoStage')")||
    integratedStoryPlayerScript.includes("docs.getElementById('photoStage')")||
    integratedStoryPlayerScript.includes("const runtime=window.__taleraTimelineRuntime,stage=document.getElementById('photoStage')"));
  assert.ok(integratedStoryPlayerScript.includes("runtime.registerMemory(memory)"));
  assert.ok(integratedStoryPlayerScript.includes("runtime.writeMemory(m)"));
  assert.ok(integratedStoryPlayerScript.includes("docs.querySelectorAll('.talera-photo-dot')"));
  assert.ok(integratedStoryPlayerScript.includes("const nodes=layerImages()"));
  assert.ok(carousel.includes('if(memory&&memory._taleraLibraryV2)return;'));
});

test('one narration clock and actual successful image decode govern cues',()=>{
  assert.match(integratedStoryPlayerScript,/Number\(audio\.currentTime\)\|\|0/);
  assert.match(integratedStoryPlayerScript,/await img\.decode\(\)/);
  assert.match(integratedStoryPlayerScript,/await writable\.close\(\)/);
  assert.match(integratedStoryPlayerScript,/pendingFramePromise/);
  assert.match(integratedStoryPlayerScript,/function cueAt\(ms\)/);
  assert.match(integratedStoryPlayerScript,/document\.addEventListener\('visibilitychange'|docs\.addEventListener\('visibilitychange'/);
});

test('no second window, and iPhone playback stops when PWA is hidden',()=>{
  assert.ok(integratedStoryPlayerScript.includes("window.addEventListener('pagehide'"));
  assert.ok(integratedStoryPlayerScript.includes("if(docs.hidden){pauseVoice()"));
  assert.ok(integratedStoryPlayerScript.includes("if(recState==='recording')pauseRecording()"));
  assert.ok(!integratedStoryPlayerScript.includes('localStorage.setItem('));
});

test('iPhone playback is initiated before awaiting photo decode',()=>{
  const start=integratedStoryPlayerScript.indexOf("const startPlayback=story.audioId?node.play():null;");
  const firstPhoto=integratedStoryPlayerScript.indexOf("if(first)await showFrame(first.mediaId);");
  assert.ok(start>=0&&firstPhoto>start,'audio starts synchronously before image decoding');
  assert.ok(integratedStoryPlayerScript.includes('primeAudioForCurrent(selectedStory)'));
  assert.ok(integratedStoryPlayerScript.includes("audio?.paused&&audio.src"));
});

test('video pauses without clearing its source and can be resumed',()=>{
  const a=integratedStoryPlayerScript.indexOf('function pauseVoice(){');
  const b=integratedStoryPlayerScript.indexOf('function status(',a);
  const fragment=integratedStoryPlayerScript.slice(a,b);
  assert.ok(fragment.includes('video.pause()'));
  assert.ok(!fragment.includes('stopVideo()'));
});
