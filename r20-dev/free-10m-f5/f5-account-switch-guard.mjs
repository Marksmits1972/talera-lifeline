// TALERA Free F5: protected account-scoped storage connections.
// Original auth transitions and account-local list remain source-exact.
// The only additional UI change connects the EXISTING Storage and back-up
// menu to the existing authenticated same-origin /__f5/backup page.
// A Cloudflare response can never hold personal Free stories/media.
const LOGIN_ANCHOR='setActiveAccount(result.account||null);state.history=[];';
const LOGOUT_ANCHOR="document.documentElement.dataset.taleraAuth='signed-out';setActiveAccount(null);state.history=[];";
const LOGIN_PATCH='setActiveAccount(result.account||null);location.reload();state.history=[];';
const LOGOUT_PATCH="document.documentElement.dataset.taleraAuth='signed-out';setActiveAccount(null);location.reload();state.history=[];";
const TITLES_ANCHOR="state.titles=Object.fromEntries(state.memories.map(row=>[String(row.id),row.title||'Herinnering']));";
const TITLES_PATCH=TITLES_ANCHOR+"\n   state.grants=state.grants.map(row=>({...row,title:state.titles[String(row.memory_id)]||'Herinnering'}));";
const API_ENTRY="async function api(path,method='GET',payload){\n  const requestEpoch=authEpoch;";
const LOCAL_API_PATCH=`async function api(path,method='GET',payload){
  const requestEpoch=authEpoch;
  // F5 Free originals stay on this authenticated device, never in an
  // account server response. Keep the original menu data contract {items}.
  if(path==='/api/memories'&&method==='GET'){
    if(!state.account){const e=new Error('Aanmelden vereist');e.status=401;throw e}
    const rows=await window.TaleraMemories?.list?.();
    if(requestEpoch!==authEpoch)throw Error('Account gewijzigd. Open dit onderdeel opnieuw.');
    if(!Array.isArray(rows))throw Error('De lokale herinneringen konden niet worden gelezen.');
    return {items:rows};
  }`;
function count(source,fragment){return source.split(fragment).length-1}
export function secureAccountMenuTransitions(source){
 if(typeof source!=='string'||count(source,LOGIN_ANCHOR)!==2||
   count(source,LOGOUT_ANCHOR)!==1||count(source,API_ENTRY)!==1||count(source,TITLES_ANCHOR)!==1||
   source.includes(LOGIN_PATCH)||source.includes(LOGOUT_PATCH)||
   source.includes(LOCAL_API_PATCH)||source.includes(TITLES_PATCH))
   throw Error('ORIGINAL_ACCOUNT_MENU_TRANSITION_MARKER_CHANGED');
 const changed=source.replaceAll(LOGIN_ANCHOR,LOGIN_PATCH)
   .replace(LOGOUT_ANCHOR,LOGOUT_PATCH)
   .replace(API_ENTRY,LOCAL_API_PATCH)
   .replace(TITLES_ANCHOR,TITLES_PATCH);
 if(count(changed,LOGIN_PATCH)!==2||count(changed,LOGOUT_PATCH)!==1||
   count(changed,LOCAL_API_PATCH)!==1||count(changed,TITLES_PATCH)!==1||
   changed.replaceAll(LOGIN_PATCH,LOGIN_ANCHOR)
     .replace(LOGOUT_PATCH,LOGOUT_ANCHOR)
     .replace(LOCAL_API_PATCH,API_ENTRY)
     .replace(TITLES_PATCH,TITLES_ANCHOR)!==source)
   throw Error('ACCOUNT_STORAGE_CONNECTION_CHANGE_NOT_MINIMAL');
 return changed;
}

// Link the EXISTING Storage and back-up screen to the already available,
// authenticated local archive page. No account/data/player changes.
const STORAGE_HINT="option('storage','▤','Opslag en back-up','Bekijk opslag; back-up volgt')";
const STORAGE_HINT_NEW="option('storage','▤','Opslag en back-up','Bekijk opslag en reservekopie')";
const STORAGE_NOTICE="Reservekopie en herstel worden nog ontwikkeld. Lokale herinneringen staan in de opslag van deze browser en zijn niet automatisch geback-upt. Iedere TALERA-testlink heeft zijn eigen lokale opslag. Alleen na jouw expliciete toestemming mogen gegevens naar je account worden overgezet. Deze controle wijzigt of uploadt niets.";
const STORAGE_NOTICE_NEW="Je herinneringen blijven lokaal. Via de knop hieronder kun je zelf een reservekopie maken of herstellen. Het bestand bevat originele media en is niet versleuteld: bewaar het privé. Er wordt niets automatisch geüpload.";
const STORAGE_REFRESH="      '<button class=\"secondary\" type=\"button\" data-action=\"storage-refresh\">Opnieuw controleren</button>';";
const STORAGE_ACTION="      (a?'<button class=\"primary\" type=\"button\" data-action=\"open-backup\">Back-up maken of herstellen</button>':'')+\n      '<button class=\"secondary\" type=\"button\" data-action=\"storage-refresh\">Opnieuw controleren</button>';";
const MENU_CLICK=" if(button.dataset.view){go(button.dataset.view);return}";
const MENU_CLICK_NEW=" if(button.dataset.view){go(button.dataset.view);return}\n if(button.dataset.action==='open-backup'&&state.view==='storage'&&state.account){window.location.assign('/__f5/backup');return;}";
export function connectExistingStorageBackup(source){
 if(typeof source!=='string')throw Error('ORIGINAL_STORAGE_BACKUP_MENU_SOURCE_DRIFT');
 const edits=[
  [STORAGE_HINT,STORAGE_HINT_NEW],
  [STORAGE_NOTICE,STORAGE_NOTICE_NEW],
  [STORAGE_REFRESH,STORAGE_ACTION],
  [MENU_CLICK,MENU_CLICK_NEW]
 ];
 let changed=source;
 for(const [before,after] of edits){
  if(count(changed,before)!==1||changed.includes(after))
   throw Error('ORIGINAL_STORAGE_BACKUP_MENU_SOURCE_DRIFT');
  changed=changed.replace(before,after);
 }
 let original=changed;
 for(const [before,after] of edits.slice().reverse()){
  if(count(original,after)!==1)throw Error('STORAGE_BACKUP_MENU_PATCH_NOT_MINIMAL');
  original=original.replace(after,before);
 }
 if(original!==source)throw Error('STORAGE_BACKUP_MENU_PATCH_NOT_MINIMAL');
 return changed;
}
