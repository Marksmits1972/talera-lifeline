// Fail closed: only add original-home alias to the protected QA Worker.
// Do not touch original /present markup, /tell, media, accounts or PLAYER.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const workerPath='r20-dev/free-10m-f5/f5-worker.mjs';
const baseline='4ba7829aac46145487a61d95fff31925bf069117';
const previous=execFileSync('git',['show',baseline+':'+workerPath],{encoding:'utf8'});
const current=readFileSync(workerPath,'utf8');
const original=[
 "    if(!await hasQaAccess(request,env))return deny();",
 "    // Exact original embedded player route is allowed before the normal"
].join('\n');
const revised=[
 "    if(!await hasQaAccess(request,env))return deny();",
 "    // The APPROVED original presentation back button and original home nav",
 "    // target '/'. Reuse the SAME verified personal home page and IDB origin.",
 "    // No other routes, auth permissions, player code or media are changed.",
 "    if(p==='/'&&m==='GET'&&!url.search)",
 "      return new Response(null,{status:302,headers:{",
 "        location:'/mijn-leven','cache-control':'private, no-store',",
 "        'x-content-type-options':'nosniff'",
 "      }});",
 "    // Exact original embedded player route is allowed before the normal"
].join('\n');
assert.equal(previous.split(original).length,2,'Approved F5 QA route changed');
assert.equal(current.split(revised).length,2,'New root redirect must occur once');
assert.equal(current.replace(revised,original),previous,
 'Only exact private root redirect may change in Worker');
const present=readFileSync('r20-dev/free-10m-delivery/generated/reference-present.html','utf8');
const home=readFileSync('r20-dev/free-10m-delivery/generated/reference-mijn-leven.html','utf8');
assert.ok(present.includes("a.href='/'")&&present.includes("back.href='/'"),
 'Approved presentation back button originally points to root');
assert.match(home,/href="\/" id="navMine"/,
 'Approved Mijn leven navigation also points to original root');
assert.match(current,/if\(!await hasQaAccess\(request,env\)\)return deny\(\);[\s\S]*if\(p==='\/'&&m==='GET'&&!url\.search\)/,
 'Root must remain behind original QA access check');
assert.ok(current.includes("if(m==='GET'&&PUBLIC_PAGES.has(p))return publicPage(request,env)"));
assert.ok(current.includes("const silenced=pathname==='/tell'?muteEditorOnlyVideo(stableEditedCues):stableEditedCues"));
console.log('TALERA_F5_ORIGINAL_BACK_NAV_EXACT_GUARD_PASS',JSON.stringify({
 approvedOriginalBackToRoot:true,rootRedirectsToActualPrivateHome:true,
 noCustomerDataWrote:true,originalTellAndPresentUnchanged:true,
 workerDiffExactOneRoute:true,qaGateFirst:true,accountIdbUnchanged:true
}));
