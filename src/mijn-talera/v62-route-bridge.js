/**
 * TALERA V62 — Mijn TALERA menu integration, staged on top of V56.
 *
 * This Worker intentionally owns no database, memory, login or social controller.
 * All application requests are forwarded unchanged to the V56 service binding.
 * Only the legacy navigation routes and one existing menu module are adapted.
 *
 * No migration, personal-data write, cache deletion or account reset.
 * Promote only after owner acceptance on a real iPhone/Safari.
 */
export const V62_MARKER = "mijn-talera-profieloverzicht-v62-20261101";
export const MENU_MODULE = "/__clean/menu-integration.mjs";
const OLD_MENU_OPEN = "if(['hub','account','login','privacy','messages','settings'].includes(requestedMenu))open(requestedMenu);";
const NEW_MENU_OPEN = "if(['hub','account','login','privacy','messages','settings','people','mine','shared','subscription','help','language','accessibility','display'].includes(requestedMenu))open(requestedMenu);";
const OLD_AUTO_LOGIN = "if(!state.open&&location.pathname==='/present'&&!new URLSearchParams(location.search).has('preview'))open('login','initial')";

export function patchMenuScript(source) {
  if (typeof source !== "string") return { ok: false, text: source, reason: "no-script" };
  if (!source.includes(OLD_MENU_OPEN) || !source.includes(OLD_AUTO_LOGIN)) {
    // Preserve the original module rather than injecting a partial or broken patch.
    return { ok: false, text: source, reason: "upstream-changed" };
  }
  let text = source.replace(OLD_MENU_OPEN, NEW_MENU_OPEN).replace(OLD_AUTO_LOGIN, "");
  // When an account-only screen is opened through a deep link, show an
  // explicit login action; previously these screens only showed information.
  const loginPrompts = [
    "Meld je aan om mensen op TALERA te vinden.",
    "Meld je aan om gedeelde herinneringen te beheren.",
    "Meld je aan om ontvangen herinneringen te openen.",
    "Meld je aan om je berichten te bekijken.",
  ];
  for (const message of loginPrompts) {
    const original = "info('Aanmelden nodig','" + message + "')";
    if (text.includes(original)) {
      text = text.replace(original, original + "+'<button class=\\\"primary\\\" data-view=\\\"login\\\">Aanmelden</button>'");
    }
  }
  return { ok: true, text, reason: "patched" };
}


export function patchV58MenuScript(source) {
 const v57=patchMenuScript(source);
 if(!v57.ok)return v57;
 const modifications=[["const esc=v=>","const storageState={local:null,owned:null,received:null,error:''};\nconst esc=v=>"],["help:'Hulp en over TALERA'","storage:'Opslag en herinneringen',help:'Hulp en over TALERA'"],["section('Account en voorkeuren',option('privacy'","section('Account en voorkeuren',option('storage','▤','Opslag en herinneringen','Controleer lokale en accountgegevens')+option('privacy'"],["section('Account en privacy',option('privacy'","section('Account en privacy',option('storage','▤','Opslag en herinneringen','Bewaring en koppelingen controleren')+option('privacy'"],[" case 'subscription':","\n  case 'storage':\n    html=title('Opslag en herinneringen','Controle voor deze browser en jouw TALERA-account.')+\n      info('Op dit toestel',storageState.local===null?'Nog niet gecontroleerd of niet beschikbaar':storageState.local+' lokale herinnering'+(storageState.local===1?'':'en')+' in deze browser')+\n      (a?info('In mijn TALERA-account',storageState.owned===null?'Nog niet gecontroleerd':storageState.owned+' account-herinneringen')+\n         info('Met mij gedeeld',storageState.received===null?'Nog niet gecontroleerd':storageState.received+' ontvangen herinneringen'):\n         info('Account','Niet aangemeld. Je kunt je lokale herinneringen wel bekijken.')+'<button class=\"secondary\" type=\"button\" data-view=\"login\">Aanmelden</button>')+\n      (storageState.error?info('Controle niet volledig',storageState.error):'')+\n      info('Let op','Lokale herinneringen staan in de opslag van deze browser en zijn niet automatisch geback-upt. Iedere TALERA-testlink heeft zijn eigen lokale opslag. Alleen na jouw expliciete toestemming mogen gegevens naar je account worden overgezet. Deze controle wijzigt of uploadt niets.')+\n      '<button class=\"secondary\" type=\"button\" data-action=\"storage-refresh\">Opnieuw controleren</button>';\n    break;\n case 'subscription':"],["||view==='messages'){","||view==='messages'||view==='storage'){"],["  if(view==='shared')state.shared=","\n   if(view==='storage'){\n     storageState.local=null;storageState.owned=null;storageState.received=null;storageState.error='';\n     if(state.open&&state.view===view)render();\n     const failed=[];\n     try{\n       const rows=await window.TaleraMemories?.list?.();\n       if(Array.isArray(rows))storageState.local=rows.length;\n       else failed.push('Lokale bibliotheek kon niet worden gelezen.');\n     }catch(e){failed.push('Lokale opslag kon niet worden gelezen.')}\n     if(state.account){\n       const [owned,received]=await Promise.allSettled([api('/api/memories'),api('/api/shared-with-me')]);\n       if(owned.status==='fulfilled'&&Array.isArray(owned.value?.items))storageState.owned=owned.value.items.length;\n       else failed.push('Account-herinneringen niet beschikbaar.');\n       if(received.status==='fulfilled'&&Array.isArray(received.value?.items))storageState.received=received.value.items.length;\n       else failed.push('Ontvangen herinneringen niet beschikbaar.');\n     }\n     storageState.error=failed.join(' ');\n   }\n  if(view==='shared')state.shared="],[" case 'logout':void api(","  case 'storage-refresh':void load('storage');break;\n case 'logout':void api("],["'accessibility','display'].includes(requestedMenu)","'accessibility','display','storage'].includes(requestedMenu)"]];
 // Validate all anchors before modifying anything; do not return a partially patched script.
 if(modifications.some(([old])=>!v57.text.includes(old)))return {ok:false,text:source,reason:"v58-upstream-changed"};
 let content=v57.text;
 for(const [old,replacement] of modifications)content=content.replace(old,replacement);
 return {ok:true,text:content,reason:"patched-v58"};
}


/**
 * V59 privacy hardening: never show account A's cached social data after
 * switching to account B, or accept an obsolete API response in the new session.
 * No auth API semantics or backend data are changed.
 */
export function patchV59MenuScript(source){
 const previous=patchV58MenuScript(source);
 if(!previous.ok)return previous;
 const changes=[
  {old:"const esc=v=>",new:"\nlet authEpoch=0;\nfunction clearPrivateState(){\n  state.discovery=null;state.search=[];state.query='';\n  state.shared=[];state.messages=[];state.memories=[];\n  state.thread=null;state.threadData=null;\n  state.shares=[];state.grants=[];state.person=null;state.personMemories=[];\n  state.titles={};\n  storageState.owned=null;storageState.received=null;storageState.error='';\n  const badge=document.querySelector('nav.flow-nav #navNotifications .talera-unread-badge');\n  if(badge){badge.hidden=true;badge.textContent=''}\n  const tab=document.querySelector('nav.flow-nav #navNotifications');\n  if(tab)tab.setAttribute('aria-label','Berichten');\n}\nfunction setActiveAccount(account){\n  const before=String(state.account?.id||''),after=String(account?.id||'');\n  if(before!==after){authEpoch++;clearPrivateState()}\n  state.account=account||null;\n}\n"+"const esc=v=>"},
  {old:"async function api(path,method='GET',payload){",new:"async function api(path,method='GET',payload){\n  const requestEpoch=authEpoch;"},
  {old:"const res=await fetch(path,opt),data=await res.json().catch(()=>({}));",new:"const res=await fetch(path,opt),data=await res.json().catch(()=>({}));\n  if(method==='GET'&&path!=='/api/me'&&requestEpoch!==authEpoch){const e=new Error('Account gewijzigd. Open dit onderdeel opnieuw.');e.code='STALE_ACCOUNT';throw e}"},
  {old:"async function load(view){",new:"async function load(view){\n  const startEpoch=authEpoch;"},
  {old:"try{const m=await api('/api/me');state.account=m.account}catch(e){if(e.status===401)state.account=null;else throw e}",new:"try{const m=await api('/api/me');if(startEpoch!==authEpoch)return;setActiveAccount(m.account)}catch(e){if(startEpoch!==authEpoch)return;if(e.status===401)setActiveAccount(null);else throw e}"},
  {old:"state.account=result.account||null;",new:"setActiveAccount(result.account||null);",all:true},
  {old:"state.account=null;state.discovery=null;state.history=[];",new:"setActiveAccount(null);state.history=[];"},
  {old:"}catch(e){if(state.open&&state.view===view)feedback(e.message,true)}",new:"}catch(e){if(e?.code==='STALE_ACCOUNT')return;if(state.open&&state.view===view)feedback(e.message,true)}"},
  {old:"async function checkSession(){",new:"async function checkSession(){\n  const startEpoch=authEpoch;"},
  {old:"try{const m=await api('/api/me');state.account=m.account;void updateUnreadBadge();",new:"try{const m=await api('/api/me');if(startEpoch!==authEpoch)return;setActiveAccount(m.account);void updateUnreadBadge();"},
  {old:"catch(e){if(e.status===401){state.account=null;document.documentElement.dataset.taleraAuth='signed-out';",new:"catch(e){if(startEpoch!==authEpoch)return;if(e.status===401){setActiveAccount(null);document.documentElement.dataset.taleraAuth='signed-out';"}
 ];
 if(changes.some(({old})=>!previous.text.includes(old)))return {ok:false,text:source,reason:"v59-upstream-changed"};
 let changed=previous.text;
 for(const {old,new:replacement,all} of changes)changed=all?changed.replaceAll(old,replacement):changed.replace(old,replacement);
 return {ok:true,text:changed,reason:"patched-v59"};
}

/**
 * V60: all submenus must have a navigable way back to Mijn TALERA.
 * Preserve normal back-stack semantics. For any directly opened deep-link
 * (e.g. account after login), back goes to hub instead of disappearing.
 * X continues to close the entire panel back to the PWA.
 */
export function patchV60MenuScript(source){
  const prior=patchV59MenuScript(source);
  if(!prior.ok)return prior;
  const changes=[
    {
      old:"back.hidden=!state.history.length;",
      new:"back.hidden=state.view==='hub';back.setAttribute('aria-label',state.history.length?'Terug naar vorig menu':'Terug naar Mijn TALERA');"
    },
    {
      old:"function backOne(){if(!state.history.length){close();return}state.view=state.history.pop();state.notice='';render();void load(state.view)}",
      new:"function backOne(){if(state.history.length){state.view=state.history.pop()}else if(state.view!=='hub'){state.view='hub'}else{close();return}state.notice='';render();void load(state.view)}"
    }
  ];
  if(changes.some(c=>!prior.text.includes(c.old)))return {ok:false,text:source,reason:"v60-menu-upstream-changed"};
  let result=prior.text;
  for(const change of changes)result=result.replace(change.old,change.new);
  return {ok:true,text:result,reason:"patched-v60"};
}

/**
 * V61: one task, one place.
 * Move storage diagnostics out of the Mijn TALERA and Mijn account overviews
 * into Instellingen > Opslag en back-up.
 * This does not enable backup: that future feature remains explicitly labelled.
 * Keep backwards-compatible deep-link /present?talera_menu=storage.
 */
export function patchV61MenuScript(source) {
  const previous=patchV60MenuScript(source);
  if(!previous.ok)return previous;
  const changes=[
    {
      old:"section('Account en voorkeuren',option('storage','▤','Opslag en herinneringen','Controleer lokale en accountgegevens')+option('privacy'",
      replacement:"section('Account en voorkeuren',option('privacy'"
    },
    {
      old:"section('Account en privacy',option('storage','▤','Opslag en herinneringen','Bewaring en koppelingen controleren')+option('privacy'",
      replacement:"section('Account en privacy',option('privacy'"
    },
    {
      old:"option('display','◐','Weergave','Rust, beweging en visuele voorkeuren'))+",
      replacement:"option('display','◐','Weergave','Rust, beweging en visuele voorkeuren')+option('storage','▤','Opslag en back-up','Bekijk opslag; back-up volgt'))+"
    },
    {
      old:"storage:'Opslag en herinneringen'",
      replacement:"storage:'Opslag en back-up'"
    },
    {
      old:"title('Opslag en herinneringen','Controle voor deze browser en jouw TALERA-account.')",
      replacement:"title('Opslag en back-up','Controle voor deze browser en jouw TALERA-account.')"
    },
    {
      old:"info('Let op','Lokale herinneringen staan in de opslag van deze browser en zijn niet automatisch geback-upt.",
      replacement:"info('Let op','Reservekopie en herstel worden nog ontwikkeld. Lokale herinneringen staan in de opslag van deze browser en zijn niet automatisch geback-upt."
    }
  ];
  // Atomic patch and no accidental duplicate settings entries.
  if(changes.some(({old})=>previous.text.split(old).length!==2))
    return {ok:false,text:source,reason:"v61-upstream-changed"};
  let result=previous.text;
  for(const {old,replacement} of changes)result=result.replace(old,replacement);
  return {ok:true,text:result,reason:"patched-v61"};
}


/**
 * V62: personal profile is an honest, session-protected overview.
 *
 * The clean core currently exposes GET /api/me and read/write discovery.
 * It does NOT expose a verified name/email edit API. Do not create fake Save
 * controls, shadow copies, or new identity tables.
 */
export function patchV62MenuScript(source) {
  const prior=patchV61MenuScript(source);
  if(!prior.ok)return prior;
  const profileCase=String.raw`
  case 'profile':
    html=(a?
      title('Mijn profielgegevens','Dit zijn de gegevens van jouw ingelogde TALERA-account.')+
      info('Naam',a.displayName||'Niet ingevuld')+
      info('E-mailadres',a.email||'Niet ingevuld')+
      info('Gebruikersnaam',state.discovery?.publicHandle?'@'+state.discovery.publicHandle:'Nog niet ingesteld')+
      section('Aanpassen',option('privacy','♢','Gebruikersnaam en vindbaarheid','Deze gegevens kun je al wijzigen'))+
      info('Naam en e-mailadres','Deze gegevens zijn nog niet te wijzigen in TALERA. We voegen pas een bewerkfunctie toe als het veilig opslaan in de accountservice beschikbaar is.') :
      info('Aanmelden nodig','Meld je aan om je eigen profielgegevens te bekijken.')+
      '<button type="button" class="primary" data-view="login">Aanmelden</button>');
    break;
`;
  const changes=[
    {
      old:"section('Account en privacy',option('privacy'",
      replacement:"section('Mijn profiel',option('profile','◉','Mijn profielgegevens','Naam, e-mailadres en gebruikersnaam'))+section('Account en privacy',option('privacy'"
    },
    {
      old:"account:'Mijn account',login:'Aanmelden'",
      replacement:"account:'Mijn account',profile:'Mijn profielgegevens',login:'Aanmelden'"
    },
    {
      old:"  case 'login':",
      replacement:profileCase+"  case 'login':"
    },
    {
      old:"||view==='storage'){",
      replacement:"||view==='storage'||view==='profile'){"
    },
    {
      old:"view==='privacy'||view==='settings'))state.discovery=",
      replacement:"view==='privacy'||view==='settings'||view==='profile'))state.discovery="
    },
    {
      old:"'accessibility','display','storage'].includes(requestedMenu)",
      replacement:"'accessibility','display','storage','profile'].includes(requestedMenu)"
    },
    {
      old:"option('forgot','◈','Wachtwoord herstellen','Via je e-mailadres')",
      replacement:"option('forgot','◈','Wachtwoord herstellen','Herstelmail nog niet aangesloten')"
    }
  ];
  if(changes.some(({old})=>prior.text.split(old).length!==2))
    return {ok:false,text:source,reason:"v62-upstream-changed"};
  let text=prior.text;
  for(const {old,replacement} of changes) text=text.replace(old,replacement);
  return {ok:true,text,reason:"patched-v62"};
}

export function legacyDestination(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/gedeeld") return "shared";
  if (path === "/meldingen") return "messages";
  return null;
}

export default {
  async fetch(request, env) {
    if (!env?.V56_BASE?.fetch) {
      return new Response("Upstream V56 service is not configured.", { status: 503 });
    }

    const url = new URL(request.url);
    const view = (request.method === "GET" || request.method === "HEAD")
      ? legacyDestination(url.pathname)
      : null;

    if (view) {
      const target = new URL("/present", url);
      target.searchParams.set("talera_menu", view);
      // Response.redirect() has immutable headers in the Workers runtime.
      return new Response(null, {
        status: 302,
        headers: {
          location: target.toString(),
          "cache-control": "no-store",
          "x-talera-integratie": V62_MARKER,
        },
      });
    }

    // Keep request method, body, cookies and authorization context untouched.
    const upstream = await env.V56_BASE.fetch(request);

    if (url.pathname !== MENU_MODULE || request.method !== "GET" || !upstream.ok) {
      const headers = new Headers(upstream.headers);
      headers.set("x-talera-integratie", V62_MARKER);
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }

    const original = await upstream.text();
    const updated = patchV62MenuScript(original);
    const headers = new Headers(upstream.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.set("cache-control", "no-store");
    headers.set("content-type", "text/javascript; charset=utf-8");
    headers.set("x-talera-integratie", updated.ok ? V62_MARKER : updated.reason);
    return new Response(updated.text, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
