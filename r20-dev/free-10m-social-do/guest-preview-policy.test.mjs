import test from 'node:test';
import assert from 'node:assert/strict';
import {GUEST_HOURS,PREVIEW_LIMIT,validCompactJPEG,validCompactPreview,compactPreviewPolicy} from './guest-preview-policy.mjs';
import {languageCatalog} from '../free-10m-f5/f5-language-catalog.mjs';

test('new duration choices retain one hour, one day, seven days',()=>{
 assert.deepEqual(GUEST_HOURS,[1,24,168]);
});
test('legacy manifest is identified separately and never opts in to title',()=>{
 assert.equal(compactPreviewPolicy(JSON.stringify({version:1,items:[]})),null);
 assert.equal(compactPreviewPolicy(undefined),null);
 assert.equal(compactPreviewPolicy('null'),null);
});
test('compact preview consent is explicit, and photo requires title consent',()=>{
 for(const [title,photo,ok] of [[true,true,true],[true,false,true],[false,false,true],[false,true,false],['true',true,false]]){
  const policy={version:1,title,photo};
  assert.equal(validCompactPreview(policy),ok);
  assert.deepEqual(compactPreviewPolicy(JSON.stringify({compactPreview:policy})),ok?policy:null);
 }
 assert.equal(validCompactPreview({version:1,title:true,photo:true,privateText:'secret'}),false);
});
function jpeg({height=512,width=512,metadata=[]}={}){
 return Uint8Array.from([255,216,...metadata,255,192,0,11,8,height>>8,height&255,width>>8,width&255,1,1,17,0,255,218,0,8,1,1,0,0,63,0,12,8,255,217]);
}
test('public preview enforces exact square, cap, JPEG marker structure and metadata restrictions',()=>{
 assert.ok(validCompactJPEG(jpeg()));
 assert.equal(validCompactJPEG(jpeg({width:513})),false);
 assert.equal(validCompactJPEG(jpeg({height:511})),false);
 assert.equal(validCompactJPEG(jpeg({metadata:[255,225,0,4,1,2]})),false);
 assert.equal(validCompactJPEG(jpeg({metadata:[255,254,0,4,1,2]})),false);
 assert.equal(validCompactJPEG(jpeg().slice(0,-2)),false);
 assert.equal(validCompactJPEG(new Uint8Array(PREVIEW_LIMIT+1)),false);
});
test('all five languages have the compact preview consent, status and handoff copy',()=>{
 for(const lang of ['nl','en','de','fr','es'])for(const key of ['previewPhoto','previewPrivacy','previewReady','previewFallback','sendReady']){
  assert.ok(languageCatalog[lang]['core.whatsapp.'+key]?.length>15);
 }
});
