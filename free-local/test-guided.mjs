import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {JSDOM}=await import(process.env.FREE_JSDOM_MODULE||'jsdom');
const dom=new JSDOM('<main id="screen"><header class="top"><input id="title"><label class="date"></label></header><textarea id="storyText"></textarea><button id="timelinePublish"></button><input id="editTitle"><input id="editDate"><button id="editBtn"></button></main>',{pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:{getItem:()=>null,setItem:()=>{}}});
let resolveTitle,saves=0;globalThis.createTitle=()=>({analyze:()=>new Promise(resolve=>resolveTitle=resolve)});
let draft={photos:[],storyText:'',title:'',status:'draft'};
const code=(await readFile(new URL('./guided.browser.js',import.meta.url),'utf8')).replace(/^import .*;\n/,'');
const {installGuidedTell}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
installGuidedTell({getStory:()=>draft,flush:async()=>{},saveTitle:async(title,current)=>{if(!current())return false;saves++;draft.title=title;draft.titleSource='ai';return true;},notice:()=>{}});
assert.equal(document.getElementById('title').hidden,true);assert.equal(document.querySelector('.date').hidden,true);assert.equal(document.getElementById('timelinePublish').hidden,true);
document.getElementById('freeSkipPhoto').click();assert.equal(document.getElementById('screen').dataset.freeStep,'story');
const field=document.getElementById('storyText');field.value='Een wandeling door het bos.';field.dispatchEvent(new window.Event('input'));assert.equal(document.getElementById('freeReview').hidden,false);
document.getElementById('freeReview').click();await new Promise(r=>setTimeout(r,0));assert.equal(document.getElementById('title').hidden,false);assert.equal(document.getElementById('editTitle').value,'');assert.equal(document.getElementById('freeTitleRetry'),null);
const edit=document.getElementById('editTitle');edit.value='Mijn eigen titel';edit.dispatchEvent(new window.Event('input'));resolveTitle({title:'Wandeling door het bos',analysis:{sourceText:field.value}});await new Promise(r=>setTimeout(r,0));assert.equal(edit.value,'Mijn eigen titel');assert.equal(saves,0);
// A fresh photo alone unlocks review, but does not expose title/date until review.
draft={photos:[{id:'photo'}],title:'',status:'draft'};field.value='';document.getElementById('screen').dataset.freeStep='photo';
dom.window.close();
console.log('Guided flow: photo optional, fields deferred, review available, late AI never overwrites manual title.');

const secondDOM=new JSDOM('<main id="screen"><header class="top"><input id="title"><label class="date"></label></header><textarea id="storyText"></textarea><button id="timelinePublish"></button><input id="editTitle"><input id="editDate"><button id="editBtn"></button></main>');Object.assign(globalThis,{window:secondDOM.window,document:secondDOM.window.document});
let photoDraft={photos:[],title:'',status:'draft'},opened=0;document.getElementById('editBtn').onclick=()=>opened++;
installGuidedTell({getStory:()=>photoDraft,flush:async()=>{},saveTitle:async(title,current)=>{if(!current())return false;photoDraft.title=title;photoDraft.titleSource='suggestion';return true;},notice:()=>{}});document.getElementById('editBtn').click();assert.equal(opened,0);assert.equal(document.getElementById('title').hidden,true);
photoDraft.photos.push({id:'p',captureDate:'2020-06-10'});window.dispatchEvent(new window.Event('talera-free-saved'));assert.equal(document.getElementById('freeReview').hidden,false);assert.equal(document.getElementById('title').hidden,true);document.getElementById('freeReview').click();await new Promise(r=>setTimeout(r,0));assert.equal(opened,1);assert.equal(document.getElementById('editTitle').value,'Mijn herinnering');assert.equal(document.getElementById('editDate').value,'2020-06-10');assert.equal(document.getElementById('title').hidden,false);secondDOM.window.close();
console.log('Photo-only flow: hidden metadata before content, neutral prefilled title and capture date at review.');
