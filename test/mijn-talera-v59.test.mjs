import test from "node:test";
import assert from "node:assert/strict";
import worker, {patchMenuScript, patchV58MenuScript, patchV59MenuScript, legacyDestination, V59_MARKER, MENU_MODULE} from "../src/mijn-talera/v59-route-bridge.js";

const OLD_OPEN = "if(['hub','account','login','privacy','messages','settings'].includes(requestedMenu))open(requestedMenu);";
const OLD_LOGIN = "if(!state.open&&location.pathname==='/present'&&!new URLSearchParams(location.search).has('preview'))open('login','initial')";
const original = "const requestedMenu = p.get('talera_menu');\n" + OLD_OPEN + "\n" + OLD_LOGIN + ";";

function fakeEnv(onFetch) {
  return { V56_BASE: {fetch: onFetch || (async () => new Response(original, {headers:{"content-type":"text/javascript"}}))} };
}

test("V57 patches exactly the existing menu deep links and removes involuntary Free login", () => {
  const modified = patchMenuScript(original);
  assert.equal(modified.ok, true);
  assert.ok(modified.text.includes("'shared'"));
  assert.ok(modified.text.includes("'people'"));
  assert.ok(modified.text.includes("'mine'"));
  assert.ok(modified.text.includes("'subscription'"));
  assert.ok(!modified.text.includes(OLD_LOGIN));
  assert.ok(modified.text.includes("const requestedMenu"));
});

test("V57 fails open to the unmodified existing module on upstream changes", () => {
  const changed = "const newSource = true;";
  assert.deepEqual(patchMenuScript(changed), {ok:false,text:changed,reason:"upstream-changed"});
});

test("legacy Shared and Notifications routes resolve to the existing account menu", () => {
  assert.equal(legacyDestination("/gedeeld"), "shared");
  assert.equal(legacyDestination("/gedeeld/"), "shared");
  assert.equal(legacyDestination("/meldingen"), "messages");
  assert.equal(legacyDestination("/present"), null);
});

test("legacy route redirect does not call backend or modify data", async () => {
  let calls=0;
  const response=await worker.fetch(new Request("https://staging.example/gedeeld"), fakeEnv(async()=>{calls++;return new Response("bad")}));
  assert.equal(response.status,302);
  assert.equal(response.headers.get("location"),"https://staging.example/present?talera_menu=shared");
  assert.equal(calls,0);
});

test("existing memory and API requests are forwarded without changing their method, cookies or body", async () => {
  let captured;
  const env=fakeEnv(async req=>{
    captured=req;
    return new Response(JSON.stringify({status:"ok"}), {status:201,headers:{"content-type":"application/json"}});
  });
  const request=new Request("https://staging.example/api/threads/123/comments", {method:"POST",headers:{cookie:"session=abc","content-type":"application/json"},body:'{"body":"test"}'});
  const response=await worker.fetch(request,env);
  assert.equal(response.status,201);
  assert.equal(response.headers.get("x-talera-integratie"),V59_MARKER);
  assert.equal(captured.method,"POST");
  assert.equal(captured.headers.get("cookie"),"session=abc");
  assert.equal(await captured.text(),'{"body":"test"}');
});

test("only the existing menu module is patched", async () => {
  const env=fakeEnv(async()=>new Response(v59Fixture, {headers:{"content-type":"text/javascript"}}));
  const patch=await worker.fetch(new Request("https://staging.example"+MENU_MODULE),env);
  assert.equal(patch.headers.get("x-talera-integratie"),V59_MARKER);
  assert.ok((await patch.text()).includes("'shared'"));
  const other=await worker.fetch(new Request("https://staging.example/some.js"),env);
  assert.equal(await other.text(),v59Fixture);
});

test("missing V56 service returns 503 instead of attempting unauthenticated alternate access", async () => {
  const r=await worker.fetch(new Request("https://staging.example/"),{});
  assert.equal(r.status,503);
});

test("account-gated menu deep links include an explicit login action", () => {
  const prompts = [
    "Meld je aan om mensen op TALERA te vinden.",
    "Meld je aan om gedeelde herinneringen te beheren.",
    "Meld je aan om ontvangen herinneringen te openen.",
    "Meld je aan om je berichten te bekijken.",
  ];
  const fixture = original + "\n" + prompts.map(p => "info('Aanmelden nodig','" + p + "')").join("\n");
  const patched = patchMenuScript(fixture);
  assert.equal(patched.ok, true);
  assert.equal(patched.text.split("Aanmelden</button>").length - 1, 4);
});


const anchorFixture = original + [
 "const esc=v=>String(v);",
 "help:'Hulp en over TALERA'",
 "section('Account en voorkeuren',option('privacy'",
 "section('Account en privacy',option('privacy'",
 " case 'subscription':",
 "||view==='messages'){",
 "  if(view==='shared')state.shared=",
 " case 'logout':void api(",
].join("\n");

test("V58 adds one local/account storage overview without changing existing account endpoints",()=>{
 const result=patchV58MenuScript(anchorFixture);
 assert.equal(result.ok,true);
 assert.ok(result.text.includes("case 'storage':"));
 assert.ok(result.text.includes("TaleraMemories?.list?.()"));
 assert.ok(result.text.includes("api('/api/memories')"));
 assert.ok(result.text.includes("api('/api/shared-with-me')"));
 assert.ok(result.text.includes("Deze controle wijzigt of uploadt niets"));
 assert.ok(result.text.includes("'display','storage'"));
 assert.ok(result.text.includes("Opnieuw controleren"));
 assert.ok(!result.text.includes("if(!state.open&&location.pathname"));
});
test("V58 refuses partial UI transformation when a prior version changed",()=>{
 const partial=anchorFixture.replace("section('Account en privacy',option('privacy'","section('Nieuwe accountmodule'");
 const changed=patchV58MenuScript(partial);
 assert.deepEqual(changed,{ok:false,text:partial,reason:"v58-upstream-changed"});
});

const v59Fixture = anchorFixture + "\n" + [
 "async function api(path,method='GET',payload){",
 "const res=await fetch(path,opt),data=await res.json().catch(()=>({}));",
 "async function load(view){",
 "try{const m=await api('/api/me');state.account=m.account}catch(e){if(e.status===401)state.account=null;else throw e}",
 "state.account=result.account||null;",
 "state.account=null;state.discovery=null;state.history=[];",
 "}catch(e){if(state.open&&state.view===view)feedback(e.message,true)}",
 "async function checkSession(){",
 "try{const m=await api('/api/me');state.account=m.account;void updateUnreadBadge();",
 "catch(e){if(e.status===401){state.account=null;document.documentElement.dataset.taleraAuth='signed-out';",
].join("\n");

test("V59 removes all user-specific cached lists and unread state on account change",()=>{
 const x=patchV59MenuScript(v59Fixture);
 assert.equal(x.ok,true);
 for(const expected of ["state.shared=[]","state.messages=[]","state.memories=[]","state.threadData=null","state.search=[]","state.shares=[]","state.grants=[]","state.titles={}","state.person=null","storageState.owned=null","storageState.received=null","badge.hidden=true"])assert.ok(x.text.includes(expected),expected);
 assert.ok(x.text.includes("if(before!==after){authEpoch++;clearPrivateState()}"));
});
test("V59 rejects stale account-scoped GET replies, but preserves existing POST semantics",()=>{
 const x=patchV59MenuScript(v59Fixture);
 assert.equal(x.ok,true);
 assert.ok(x.text.includes("method==='GET'&&path!=='/api/me'&&requestEpoch!==authEpoch"));
 assert.ok(x.text.includes("if(startEpoch!==authEpoch)return;setActiveAccount(m.account)"));
 assert.ok(x.text.includes("setActiveAccount(result.account||null)"));
 assert.ok(x.text.includes("setActiveAccount(null);state.history=[]"));
 assert.ok(x.text.includes("if(e?.code==='STALE_ACCOUNT')return"));
});
test("V59 rejects partial upstream patches safely",()=>{
 const f=v59Fixture.replace("async function checkSession(){","async function checkSessionChanged(){");
 const x=patchV59MenuScript(f);
 assert.deepEqual(x,{ok:false,text:f,reason:"v59-upstream-changed"});
});
