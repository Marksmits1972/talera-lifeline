import assert from 'node:assert/strict';
import {createDraft} from './draft.browser.js';
const initial={id:'draft-race',title:'Mijn verhaal',storyText:'Begin',photos:[],date:'2020-01-01',analysis:{title:'Oud'}};
const draft=createDraft(initial);
draft.hydrate(initial);
let release,writes=0,stored;
const saving=draft.save(async(snapshot,first)=>{
  writes++;
  if(first)await new Promise(resolve=>{release=resolve;});
  stored={...snapshot,updatedAt:writes};return stored;
},{photos:[{id:'new-photo'}],audioId:'new-audio'});
// A live transcript and manual title arrive during the media transaction.
draft.patch({storyText:'Begin. Nieuwe gesproken woorden.',title:'Aan het water',titleSource:'manual'});
release();await saving;
assert.equal(stored.storyText,'Begin. Nieuwe gesproken woorden.');
assert.equal(stored.title,'Aan het water');
assert.equal(stored.titleSource,'manual');
assert.equal(stored.audioId,'new-audio');
assert.deepEqual(stored.photos,[{id:'new-photo'}]);
assert.equal(draft.current.analysis,undefined);
assert.equal(writes,2);
// Repeated blur/change saves without edits perform no extra transactions.
await draft.save(()=>{throw new Error('Unexpected duplicate write');});
// A failed save retains edits and can be retried without losing the transcript.
draft.patch({storyText:'Nog meer woorden'});
await assert.rejects(draft.save(async()=>{throw new Error('Disk full');}),/Disk full/);
assert.equal(draft.current.storyText,'Nog meer woorden');
await draft.save(async value=>(stored={...value,updatedAt:3}));
assert.equal(stored.storyText,'Nog meer woorden');
console.log('Draft: pending media preserves newer text/title, invalidates analysis, skips unchanged saves, retries failed edits.');

const mediaDraft=createDraft(initial);
await assert.rejects(mediaDraft.save(async()=>{mediaDraft.patch({storyText:'Nieuwe woorden'});throw new Error('Media failed');},{photos:[{id:'uncommitted'}]},['photos']),/Media failed/);
assert.deepEqual(mediaDraft.current.photos,[]);assert.equal(mediaDraft.current.storyText,'Nieuwe woorden');
