// TALERA Free: auth transition must never leave the currently loaded
// account-scoped IndexedDB JS bound to a *previous* user's account.
// No UI elements, design, narration or story data are changed.
// Hard fail if the exact approved source no longer has these anchors.
const LOGIN_ANCHOR='setActiveAccount(result.account||null);state.history=[];';
const LOGOUT_ANCHOR="document.documentElement.dataset.taleraAuth='signed-out';setActiveAccount(null);state.history=[];";
const LOGIN_PATCH='setActiveAccount(result.account||null);location.reload();state.history=[];';
const LOGOUT_PATCH="document.documentElement.dataset.taleraAuth='signed-out';setActiveAccount(null);location.reload();state.history=[];";
function count(source,fragment){return source.split(fragment).length-1}
export function secureAccountMenuTransitions(source){
 if(typeof source!=='string'||count(source,LOGIN_ANCHOR)!==2||
   count(source,LOGOUT_ANCHOR)!==1||
   source.includes(LOGIN_PATCH)||source.includes(LOGOUT_PATCH))
   throw Error('ORIGINAL_ACCOUNT_MENU_TRANSITION_MARKER_CHANGED');
 const changed=source.replaceAll(LOGIN_ANCHOR,LOGIN_PATCH)
   .replace(LOGOUT_ANCHOR,LOGOUT_PATCH);
 if(count(changed,LOGIN_PATCH)!==2||count(changed,LOGOUT_PATCH)!==1||
   changed.replaceAll(LOGIN_PATCH,LOGIN_ANCHOR)
     .replace(LOGOUT_PATCH,LOGOUT_ANCHOR)!==source)
   throw Error('ACCOUNT_TRANSITION_CHANGE_NOT_MINIMAL');
 return changed;
}
