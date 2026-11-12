// Source-exact approved-11-Nov menu regression: one backup action only, no private data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {secureAccountMenuTransitions,connectExistingStorageBackup,removeInactiveAccessibilityMenu} from './f5-account-switch-guard.mjs';
const source=readFileSync('r20-dev/free-10m-f5/generated/approved-menu-original.mjs','utf8');
const {verifiedPublicScripts}=await import('./generated/public-template-map.mjs');
const scriptPath=verifiedPublicScripts['/__clean/menu-integration.mjs'];
assert.match(scriptPath||'',/^\/__talera_free\/f5scripts\/[a-f0-9]{64}\.mjs$/);
const served=readFileSync(path.join('r20-dev/free-10m-delivery/public',scriptPath.slice(1)),'utf8');
assert.equal(served,removeInactiveAccessibilityMenu(connectExistingStorageBackup(secureAccountMenuTransitions(source))),
 'Original account menu must remain unchanged except auth, backup and removed Accessibility placeholder');
assert.ok(source.includes("option('accessibility'")&&source.includes("case 'accessibility':"),'Original menu source still has placeholder; verify minimal change');
assert.ok(!served.includes("option('accessibility'")&&!served.includes("case 'accessibility':")&&!served.includes("accessibility:'Toegankelijkheid'")&&!served.includes("'accessibility','display'"),'No Accessibility menu, screen, heading or deep-link remains');
assert.ok(served.includes("option('display'")&&served.includes("option('language'")&&served.includes("option('storage'"),'Every other settings item must remain present');
assert.throws(()=>removeInactiveAccessibilityMenu(source.replace("case 'accessibility':","case 'accessibility-changed':")),/ACCESSIBILITY_MENU_SOURCE_DRIFT/,'Refuse removal against drifted source');
assert.equal((served.match(/data-action="open-backup"/g)||[]).length,1,
 'Exactly one genuine local backup button, only inside existing Storage screen');
assert.ok(served.includes("state.view==='storage'&&state.account")&&
  served.includes("window.location.assign('/__f5/backup')"),
 'Only an existing signed-in Storage menu can navigate to existing private backup');
assert.ok(served.includes('data-action="storage-refresh"'),
 'Existing Storage status-refresh action must remain');
assert.ok(!served.includes('Reservekopie en herstel worden nog ontwikkeld.'),
 'Do not falsely label an active local back-up function unfinished');
assert.ok(!source.includes('data-action="open-backup"'),
 'Never inject duplicate backup controls into the source menu');
assert.throws(()=>connectExistingStorageBackup(source.replace(
 'Reservekopie en herstel worden nog ontwikkeld.',
 'Back-up alleen na expliciete toestemming.')),/ORIGINAL_STORAGE_BACKUP_MENU_SOURCE_DRIFT/,
 'Fail closed if the existing menu screen has drifted');
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
 changesToOriginalSource:'three account reloads, one local-list bridge, one Storage backup entry',
 realIphoneTested:false,oldOriginMigrationCompleted:false
}));
