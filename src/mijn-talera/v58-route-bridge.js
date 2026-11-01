/**
 * TALERA V58 — Mijn TALERA menu integration, staged on top of V56.
 *
 * This Worker intentionally owns no database, memory, login or social controller.
 * All application requests are forwarded unchanged to the V56 service binding.
 * Only the legacy navigation routes and one existing menu module are adapted.
 *
 * No migration, personal-data write, cache deletion or account reset.
 * Promote only after owner acceptance on a real iPhone/Safari.
 */
export const V58_MARKER = "mijn-talera-opslagcontrole-v58-20261101";
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
 const modifications=[["const esc=v=>","const storageState={local:null,owned:null,received:null,error:''};\nconst esc=v=>"],["help:'Hulp en over TALERA'","storage:'Opslag en herinneringen',help:'Hulp en over TALERA'"],["section('Account en voorkeuren',option('privacy'","section('Account en voorkeuren',option('storage','▤','Opslag en herinneringen','Controleer lokale en accountgegevens')+option('privacy'"],["section('Account en privacy',option('privacy'","section('Account en privacy',option('storage','▤','Opslag en herinneringen','Bewaring en koppelingen controleren')+option('privacy'"],["  case 'subscription':","\n  case 'storage':\n    html=title('Opslag en herinneringen','Controle voor deze browser en jouw TALERA-account.')+\n      info('Op dit toestel',storageState.local===null?'Nog niet gecontroleerd of niet beschikbaar':storageState.local+' lokale herinnering'+(storageState.local===1?'':'en')+' in deze browser')+\n      (a?info('In mijn TALERA-account',storageState.owned===null?'Nog niet gecontroleerd':storageState.owned+' account-herinneringen')+\n         info('Met mij gedeeld',storageState.received===null?'Nog niet gecontroleerd':storageState.received+' ontvangen herinneringen'):\n         info('Account','Niet aangemeld. Je kunt je lokale herinneringen wel bekijken.')+'<button class=\"secondary\" type=\"button\" data-view=\"login\">Aanmelden</button>')+\n      (storageState.error?info('Controle niet volledig',storageState.error):'')+\n      info('Let op','Lokale herinneringen staan in de opslag van deze browser en zijn niet automatisch geback-upt. Iedere TALERA-testlink heeft zijn eigen lokale opslag. Alleen na jouw expliciete toestemming mogen gegevens naar je account worden overgezet. Deze controle wijzigt of uploadt niets.')+\n      '<button class=\"secondary\" type=\"button\" data-action=\"storage-refresh\">Opnieuw controleren</button>';\n    break;\n  case 'subscription':"],["||view==='messages'){","||view==='messages'||view==='storage'){"],["   if(view==='shared')state.shared=","\n   if(view==='storage'){\n     storageState.local=null;storageState.owned=null;storageState.received=null;storageState.error='';\n     if(state.open&&state.view===view)render();\n     const failed=[];\n     try{\n       const rows=await window.TaleraMemories?.list?.();\n       if(Array.isArray(rows))storageState.local=rows.length;\n       else failed.push('Lokale bibliotheek kon niet worden gelezen.');\n     }catch(e){failed.push('Lokale opslag kon niet worden gelezen.')}\n     if(state.account){\n       const [owned,received]=await Promise.allSettled([api('/api/memories'),api('/api/shared-with-me')]);\n       if(owned.status==='fulfilled'&&Array.isArray(owned.value?.items))storageState.owned=owned.value.items.length;\n       else failed.push('Account-herinneringen niet beschikbaar.');\n       if(received.status==='fulfilled'&&Array.isArray(received.value?.items))storageState.received=received.value.items.length;\n       else failed.push('Ontvangen herinneringen niet beschikbaar.');\n     }\n     storageState.error=failed.join(' ');\n   }\n   if(view==='shared')state.shared="],["  case 'logout':void api(","  case 'storage-refresh':void load('storage');break;\n  case 'logout':void api("],["'accessibility','display'].includes(requestedMenu)","'accessibility','display','storage'].includes(requestedMenu)"]];
 // Validate all anchors before modifying anything; do not return a partially patched script.
 if(modifications.some(([old])=>!v57.text.includes(old)))return {ok:false,text:source,reason:"v58-upstream-changed"};
 let content=v57.text;
 for(const [old,replacement] of modifications)content=content.replace(old,replacement);
 return {ok:true,text:content,reason:"patched-v58"};
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
          "x-talera-integratie": V58_MARKER,
        },
      });
    }

    // Keep request method, body, cookies and authorization context untouched.
    const upstream = await env.V56_BASE.fetch(request);

    if (url.pathname !== MENU_MODULE || request.method !== "GET" || !upstream.ok) {
      const headers = new Headers(upstream.headers);
      headers.set("x-talera-integratie", V58_MARKER);
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }

    const original = await upstream.text();
    const updated = patchV58MenuScript(original);
    const headers = new Headers(upstream.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.set("cache-control", "no-store");
    headers.set("content-type", "text/javascript; charset=utf-8");
    headers.set("x-talera-integratie", updated.ok ? V58_MARKER : "v58-upstream-changed");
    return new Response(updated.text, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
