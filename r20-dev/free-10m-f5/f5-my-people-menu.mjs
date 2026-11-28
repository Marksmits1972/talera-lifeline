// Inject only into the original, localized Mijn mensen view; no new page,
// app page, grant or presentation controller.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export function installMyPeopleMenu(source){
 const core=readFileSync(new URL('./f5-my-people.mjs',import.meta.url),'utf8')
  .replace(/^export (?=(?:async )?function )/gm,'');
 assert.ok(!/^export /m.test(core),'MY_PEOPLE_CORE_EXPORT_DRIFT');
 const runtime=readFileSync(new URL('./f5-my-people-view.js',import.meta.url),'utf8');
 const receiver=readFileSync(new URL('./f5-internal-receive.mjs',import.meta.url),'utf8').replace(/^export (?=(?:async )?function )/gm,'');
 const inbox=readFileSync(new URL('./f5-internal-inbox-view.js',import.meta.url),'utf8');
 const receiveLib='const taleraReceive=(()=>{'+receiver+'\nreturn {openReceivedStore,receiveInternalShare,receivedTransport};})();\n';
 const patch=(a,b)=>{
  assert.equal(source.split(a).length,2,'MY_PEOPLE_MENU_DRIFT '+a.slice(0,80));
  source=source.replace(a,b);
 };
 // Retain the original old cleanup function's other protections.
 patch("prune('people');prune('shared');prune('subscription');","prune('shared');prune('subscription');");
 const start=source.indexOf(" case 'people':"),end=source.indexOf(" case 'recipient':",start);
 assert.ok(start>=0&&end>start&&source.slice(start,end).includes('data-form="search"'),'MY_PEOPLE_OLD_SEARCH_DRIFT');
 source=source.slice(0,start)+String.raw` case 'people':
  html=a?'<div id="talera-my-people-mount"></div>':
    info(t("menu.people.signInTitle"),t("menu.people.signInHint"))+'<button class="primary" data-view="login">'+esc(t("menu.people.signInAction"))+'</button>';
  break;
`+source.slice(end);
 patch('function render(){',core+'\n'+runtime+'\n'+receiveLib+inbox+'\nfunction render(){');
 patch('body.innerHTML=html+notice();taleraCleanFreeMenu();body.scrollTop=0;',
  'body.innerHTML=html+notice();taleraCleanFreeMenu();taleraRenderPeopleView();taleraRenderInbox();body.scrollTop=0;');
 patch('function clearPrivateState(){','function clearPrivateState(){\n  taleraClearPeopleView();taleraClearInbox();');
 // Direct Meldingen entry uses the original account menu after the session
 // is resolved, never an independent page or a separate inbox engine.
 patch('void checkSession();',"if(location.pathname==='/meldingen'){void checkSession().then(()=>open('messages'))}else void checkSession();");
 patch('function close(){state.open=false;', 'function close(){taleraClearPeopleView();taleraInboxPanel?.root.remove();taleraInboxPanel=null;state.open=false;');
 patch("  const count=await api('/api/messages/unread-count');","  let count={unread:0};try{count=await api('/api/messages/unread-count')}catch{}");
 patch("  const value=Math.max(0,Number(count.unread)||0);",
  "  const ownAccount=state.account?.id,ownEpoch=authEpoch;let internalCount=0;try{internalCount=(await taleraInboxData()).filter(x=>x.unread).length}catch{}if(!inboxCurrent(ownAccount,ownEpoch))return;\n  const value=Math.max(0,Number(count.unread)||0)+internalCount;");
 return source;
}
