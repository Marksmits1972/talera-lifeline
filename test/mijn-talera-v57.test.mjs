import test from "node:test";
import assert from "node:assert/strict";
import worker, {patchMenuScript, legacyDestination, V57_MARKER, MENU_MODULE} from "../src/mijn-talera/v57-route-bridge.js";

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
  assert.equal(response.headers.get("x-talera-integratie"),V57_MARKER);
  assert.equal(captured.method,"POST");
  assert.equal(captured.headers.get("cookie"),"session=abc");
  assert.equal(await captured.text(),'{"body":"test"}');
});

test("only the existing menu module is patched", async () => {
  const env=fakeEnv();
  const patch=await worker.fetch(new Request("https://staging.example"+MENU_MODULE),env);
  assert.equal(patch.headers.get("x-talera-integratie"),V57_MARKER);
  assert.ok((await patch.text()).includes("'shared'"));
  const other=await worker.fetch(new Request("https://staging.example/some.js"),env);
  assert.equal(await other.text(),original);
});

test("missing V56 service returns 503 instead of attempting unauthenticated alternate access", async () => {
  const r=await worker.fetch(new Request("https://staging.example/"),{});
  assert.equal(r.status,503);
});
