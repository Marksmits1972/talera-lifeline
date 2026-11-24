// TALERA Free F5 exact WhatsApp origin — ONLY storage/connectivity, not UX.
// All tests use synthetic identifiers; no live TALERA data or Cloudflare secret.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scopeLocalMemories,privateAccountScope} from './f5-local-scope.mjs';
import {referencePages} from './generated/public-template-map.mjs';
import {alignEditedNarrationCueRefs} from './f5-edit-cue-rebind.mjs';
import {retainEditorCanonicalMediaIds} from './f5-editor-canonical-refs.mjs';
import {preserveOriginalMediaIdsOnEdit} from './f5-library-editor-stable-save.mjs';

const root='r20-dev/';
const base='https://talera-design-cleanup-fase1-test-20261107.mark-a39.workers.dev';
const build=readFileSync(root+'free-10m-delivery/build.mjs','utf8');
const assets=readFileSync(root+'free-10m-f5/f5-public-assets.mjs','utf8');
const gateway=readFileSync(root+'free-10m-f5/f5-worker.mjs','utf8');
const config=JSON.parse(readFileSync(root+'free-10m-f5/wrangler.staging.jsonc','utf8'));
assert.ok(build.includes(base),'Wrong public source in anonymous Free build');
assert.ok(assets.includes(base),'Wrong public source in embedded/public Free asset build');
assert.ok(!build.includes('talera-account-birthdate-test-20261107.mark-a39.workers.dev'),
  'Do not silently switch back to a different UI origin');
for(const forbidden of [
 'addTransparentVideoPicker','eliminateFirstSwipeBlank',
 'taleraF5AddVideoButton','talera-f5-narrated-swipe-band',
 'f5PrewarmFirstAdjacent','talera-f5-media-status'
])assert.ok(!gateway.includes(forbidden),'Storage-only app contains UI patch '+forbidden);
assert.ok(gateway.includes('scopeLocalMemories(privateHtml,await privateAccountScope(actor.id))'),
  'Private local media must be bound to verified session identity');
assert.ok(gateway.includes("pathname==='/tell'?preserveOriginalMediaIdsOnEdit(retainEditorCanonicalMediaIds(alignEditedNarrationCueRefs(scoped))):scoped"),
  'Only recording media-ID integrity is allowed as an editor storage correction');
assert.ok(gateway.includes("const silenced=pathname==='/tell'?muteEditorOnlyVideo(stableEditedCues):stableEditedCues;")&&
  gateway.includes('const threeTabHome=homeScreen?evenlySpaceThreeHomeTabs(silenced):silenced;')&&
  gateway.includes('assetizeHtml(threeTabHome,new Set(approvedAssets))'),
  'Existing approved editor video muting and three-tab Home must retain the same scoped storage');
assert.ok(gateway.includes("if(p==='/api/version'&&m==='GET')"),
  'Restore the original periodic version check without replacing the UI');
assert.ok(gateway.includes('allowedVersionCheck(url,m)'),
  'Keep strict original first-party query allowlisting');
assert.equal(config.name,'talera-free-f5-combined-stage-20261108');
assert.equal(config.durable_objects.bindings.length,7);
assert.equal(config.d1_databases?.length||0,0);
assert.equal(config.r2_buckets?.length||0,0);
assert.equal(config.services?.length||0,0);

const account1='ba6a9010-00ed-4e29-b14d-c9632bd74047';
const account2='45dc3d56-b7fb-44cf-bc3f-4c04338f64c6';
const s1=await privateAccountScope(account1);
const s2=await privateAccountScope(account2);
assert.match(s1,/^[a-f0-9]{64}$/);
// Golden account-local namespace fixed before the owner's real iPhone media.
// An accidental change would point the SAME signed-in account at a new,
// empty IndexedDB while its prior original blobs remain hidden on-device.
// Never change this mapping without an explicitly approved, verified,
// nondestructive migration plan.
assert.equal(s1,
  'a6afaca11456c65ab2b306da6eba92b3890a82d161a644862bc39c4c467ef03c',
  'SAME USER ACCOUNT NOW POINTS TO A DIFFERENT PRIVATE LIBRARY');
assert.notEqual(s1,s2,'Account separation is mandatory');
assert.equal(s1,await privateAccountScope(account1),'Same account must restore same local storage');
const html='<html><head><style>body{color:#071A3D}</style></head><body>'+
 '<h1>ORIGINAL TALERA</h1>'+
 '<script id="talera-memory-store-v1">var DB_NAME=\'talera-lifeline-dev-local-v1\';</script>'+
 '<script>const edit=indexedDB.open("talera-lifeline-dev-local-v1");</script>'+
 '<script>const remove=indexedDB.open(\'talera-lifeline-dev-local-v1\');</script>'+
 '<script>const year=\'talera-dev-birthyear-v1\';</script>'+
 '<p>Exact original buttons, styling, logos and gesture handlers stay here.</p></body></html>';
const result=scopeLocalMemories(html,s1);
const original='talera-lifeline-dev-local-v1';
const privateDb='talera-free-local-'+s1.slice(0,32)+'-v1';
const birthKey='talera-free-birthyear-'+s1.slice(0,32)+'-v1';
assert.equal(html.split(original).length-1,3,'All three editor/store/delete references present');
assert.equal(result.split(privateDb).length-1,3,'All three references must use same account DB');
assert.ok(!result.includes(original),'No shared legacy memory DB name may survive');
assert.equal(result,
  html.replaceAll(original,privateDb).replaceAll('talera-dev-birthyear-v1',birthKey),
  'No markup or styling changes beyond isolated storage namespace');
assert.ok(!scopeLocalMemories(html,s2).includes(privateDb),'Different user is isolated');
assert.throws(()=>scopeLocalMemories(html,'123'),/INVALID_PRIVATE_LOCAL_SCOPE/);
// Regression for the ACTUAL packaged /tell page: the latest photo File-copy
// must remain compatible with private editor media-ID preservation.
// This is read-only source/HTML composition, not a new app or media test.
const packagedTellPath=referencePages['/tell'];
assert.match(packagedTellPath||'',new RegExp('^/__talera_free/f5references/[a-f0-9]{64}[.]html$'),
 'Expected the exact same /tell artifact that the existing Worker serves');
const packagedTell=readFileSync('r20-dev/free-10m-delivery/public'+packagedTellPath,'utf8');
assert.equal(packagedTell.split('blob:taleraOwnedPhotoUploads[j]').length,2,
 'Current /tell must store owned original photo bytes');
assert.ok(!packagedTell.includes('blob:uploads[j]'),
 'No original photo picker-backed File may be persisted in /tell');
const privateTell=preserveOriginalMediaIdsOnEdit(retainEditorCanonicalMediaIds(
 alignEditedNarrationCueRefs(scopeLocalMemories(packagedTell,s1))));
assert.ok(privateTell.includes('await taleraPayload.prepare(files[j].key,taleraOwnedPhotoUploads[j])'),
 'Private editor must store the SAME byte-owned originals in the shared payload');
assert.ok(privateTell.includes('payloadPlans.push(existing&&canonicalIds!==undefined&&canonicalIds[j]?null:')&&
 privateTell.includes('payloadPlans.filter((plan,j)=>plan&&!reused.has(j))'),
 'Editing must never create write plans for retained original media IDs');
assert.ok(!privateTell.includes('blob:uploads[j]'),
 'Editor must never revert the byte-owned photo storage correction');
console.log('TALERA_F5_PACKAGED_TELL_PHOTO_COPY_EDITOR_COMPOSITION_PASS');

console.log('TALERA_FREE_WHATSAPP_STORAGE_ONLY_CONTRACT_PASS',JSON.stringify({
 source:base,sevenDurableObjectBindings:true,noLegacyD1R2ProductionBind:true,
 visualAndInteractionMarkupUnchanged:true,mediaAndCuesStoredInSingleAccountDb:true,
 originalMediaAndDesignNotModified:true,realIphoneValidated:false,
 tenMillionLoadTestPassed:false
}));
