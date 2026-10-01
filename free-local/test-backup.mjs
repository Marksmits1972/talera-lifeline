import assert from 'node:assert/strict';
await import(process.env.FREE_INDEXEDDB_MODULE||'fake-indexeddb/auto');
import {storage} from './storage.browser.js';
import {createBackup,readBackup} from './backup.browser.js';
const photo={id:'backup-photo',blob:new Blob(['photo bytes'],{type:'image/jpeg'}),thumbnail:new Blob(['thumb bytes'],{type:'image/jpeg'}),width:1600,height:1200,sourceBytes:100000,createdAt:1};
await storage.putMedia(photo);
await storage.save({id:'published',title:'Mijn verhaal',date:'2020-06-10',storyText:'Mijn volledige tekst',note:'Een opmerking',photos:[{id:photo.id}],status:'published'});
await storage.save({id:'draft',title:'Nog bezig',date:'',storyText:'Nog niet af',photos:[],status:'draft'});
const backup=await createBackup(storage);
assert.equal(backup.storyCount,2);assert.equal(backup.photoCount,1);
const checked=await readBackup(backup.file);
assert.equal(checked.stories.find(s=>s.id==='published').note,'Een opmerking');
// Remove all original records, then prove recovery from independent file bytes.
await storage.restore({stories:[],media:[]});
assert.equal((await storage.stories()).length,0);
await storage.restore(checked);
assert.equal((await storage.story('published')).storyText,'Mijn volledige tekst');
assert.equal(await (await storage.media(photo.id)).blob.text(),'photo bytes');
assert.equal(await (await storage.media(photo.id)).thumbnail.text(),'thumb bytes');
assert.equal((await storage.story('draft')).status,'draft');
// Corruption, truncation, unrelated file, future version and missing media must preserve current data.
const bytes=new Uint8Array(await backup.file.arrayBuffer());bytes[bytes.length-1]^=1;
await assert.rejects(readBackup(new Blob([bytes])));
await assert.rejects(readBackup(backup.file.slice(0,-2)));
await assert.rejects(readBackup(new Blob(['not a TALERA file'])));
const clean=new Uint8Array(await backup.file.arrayBuffer());
const headerLength=new DataView(clean.buffer).getUint32(8);
const header=JSON.parse(new TextDecoder().decode(clean.slice(12,12+headerLength)));
async function altered(manifest){const encoded=new TextEncoder().encode(JSON.stringify(manifest));const n=new Uint8Array(4);new DataView(n.buffer).setUint32(0,encoded.length);return new Blob([clean.slice(0,8),n,encoded,clean.slice(12+headerLength)]);}
await assert.rejects(readBackup(await altered({...header,version:99})));
const bad=structuredClone(header);bad.stories[0].photos=[{id:'missing'}];
await assert.rejects(readBackup(await altered(bad)));
await assert.rejects(storage.restore({...checked,stories:[{id:'bad',photos:[{id:'absent'}]}]}));
assert.equal((await storage.story('published')).storyText,'Mijn volledige tekst');
// Simulate a failure AFTER clears and a media write have been queued: transaction rolls back.
const fail={...checked,stories:[{...checked.stories[0],uncloneable:()=>{}}]};
await assert.rejects(storage.restore(fail));
assert.equal((await storage.story('published')).storyText,'Mijn volledige tekst');
assert.equal(await (await storage.media(photo.id)).blob.text(),'photo bytes');
const second=await createBackup(storage);assert.equal(second.storyCount,2);
console.log('Backup tests passed: complete collection, drafts, photo/thumbnail bytes, independent-file restore, corruption/truncation/schema checks and rollback after queued deletion.');
