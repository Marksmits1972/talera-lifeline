// Source-exact account-switch privacy regression, no customer data, no UI edits.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {secureAccountMenuTransitions} from './f5-account-switch-guard.mjs';
const source=readFileSync('r20-dev/free-10m-f5/generated/approved-menu-original.mjs','utf8');
const {verifiedPublicScripts}=await import('./generated/public-template-map.mjs');
const scriptPath=verifiedPublicScripts['/__clean/menu-integration.mjs'];
assert.match(scriptPath||'',/^\/__talera_free\/f5scripts\/[a-f0-9]{64}\.mjs$/);
const served=readFileSync(path.join('r20-dev/free-10m-delivery/public',scriptPath.slice(1)),'utf8');
assert.equal(served,secureAccountMenuTransitions(source),
 'Approved account menu must be unchanged except reloading after auth transitions');
assert.equal((served.match(/location\.reload\(\);/g)||[]).length,3,
 'Exactly three successful auth state transitions require same-path page refresh');
for(const k of ['\/api\/register','\/api\/login','\/api\/logout'])assert.ok(served.includes(k),
 'Original auth route lost: '+k);
assert.ok(!source.includes('location.reload();'),
 'Do not duplicate an existing source reload without review');
assert.throws(()=>secureAccountMenuTransitions(source.replace('setActiveAccount(result.account||null);state.history=[];',
 'setActiveAccount(result.account||null);state.history=undefined;')),
 /ORIGINAL_ACCOUNT_MENU_TRANSITION_MARKER_CHANGED/,
 'Fail closed if original approved account menu changes');
console.log('TALERA_F5_ACCOUNT_REBIND_AFTER_AUTH_PASS',JSON.stringify({
 loginAndRegisterTransitions:2,logoutTransitions:1,
 previousAccountJsCannotRemainOpenAfterSuccessfulAccountAction:true,
 onlyChangeToOriginalSource:'three location.reload() calls',
 realIphoneTested:false,oldOriginMigrationCompleted:false
}));
