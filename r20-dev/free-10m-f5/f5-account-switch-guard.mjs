// TALERA Free F5: protected account-scoped storage connections, no UI edit.
// The original menu remains source-exact except three auth reloads and a
// GET /api/memories bridge to the ALREADY existing local TaleraMemories.list().
// A Cloudflare response can never hold personal Free stories/media.
const LOGIN_ANCHOR='setActiveAccount(result.account||null);state.history=[];';
const LOGOUT_ANCHOR="document.documentElement.dataset.taleraAuth='signed-out';setActiveAccount(null);state.history=[];";
const LOGIN_PATCH='setActiveAccount(result.account||null);location.reload();state.history=[];';
const LOGOUT_PATCH="document.documentElement.dataset.taleraAuth='signed-out';setActiveAccount(null);location.reload();state.history=[];";
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
   count(source,LOGOUT_ANCHOR)!==1||count(source,API_ENTRY)!==1||
   source.includes(LOGIN_PATCH)||source.includes(LOGOUT_PATCH)||
   source.includes(LOCAL_API_PATCH))
   throw Error('ORIGINAL_ACCOUNT_MENU_TRANSITION_MARKER_CHANGED');
 const changed=source.replaceAll(LOGIN_ANCHOR,LOGIN_PATCH)
   .replace(LOGOUT_ANCHOR,LOGOUT_PATCH)
   .replace(API_ENTRY,LOCAL_API_PATCH);
 if(count(changed,LOGIN_PATCH)!==2||count(changed,LOGOUT_PATCH)!==1||
   count(changed,LOCAL_API_PATCH)!==1||
   changed.replaceAll(LOGIN_PATCH,LOGIN_ANCHOR)
     .replace(LOGOUT_PATCH,LOGOUT_ANCHOR)
     .replace(LOCAL_API_PATCH,API_ENTRY)!==source)
   throw Error('ACCOUNT_STORAGE_CONNECTION_CHANGE_NOT_MINIMAL');
 return changed;
}
