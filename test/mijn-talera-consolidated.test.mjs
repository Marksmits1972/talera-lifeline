import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const menu=readFileSync(new URL("../src/mijn-talera/menu-integration.txt",import.meta.url),"utf8");
const worker=readFileSync(new URL("../src/mijn-talera/worker.js",import.meta.url),"utf8");

test("canonical Mijn TALERA menu has valid JavaScript and no runtime patch cascade",()=>{
  assert.doesNotThrow(()=>new Function(menu));
  assert.ok(menu.includes("window.__taleraMoreMenu={ready:true"));
  assert.ok(worker.includes('import menuSource from "./menu-integration.txt"'));
  assert.ok(!worker.includes("patchV62MenuScript"));
  assert.ok(!worker.includes("patchV61MenuScript"));
  assert.ok(!worker.includes("replace(OLD_MENU_OPEN"));
});

test("existing user-facing navigation and personal account functions are preserved",()=>{
  for(const term of [
    "'hub'","'account'","'profile'","'people'","'mine'","'shared'",
    "'messages'","'settings'","'storage'","'privacy'",
    "Naam opslaan","/api/profile","/api/discovery","/api/me",
    "Opslag en back-up","Door mij gedeeld","Met mij gedeeld","Mijn mensen"
  ])assert.ok(menu.includes(term),term);
});

test("safe back navigation, account session isolation and Free entry remain",()=>{
  assert.ok(menu.includes("back.hidden=state.view==='hub'"));
  assert.ok(menu.includes("else if(state.view!=='hub'){state.view='hub'}"));
  assert.ok(menu.includes("clearPrivateState()"));
  assert.ok(menu.includes("requestEpoch!==authEpoch"));
  assert.ok(!menu.includes("if(!state.open&&location.pathname==='/present'"));
});

test("menu is served once, unchanged and without caching; all other requests proxy unchanged",()=>{
  assert.ok(worker.includes("url.pathname === MENU_MODULE"));
  assert.ok(worker.includes('return new Response(menuSource, {'));
  assert.ok(worker.includes('"cache-control":"no-store"'));
  assert.ok(worker.includes("return env.V56_BASE.fetch(request)"));
  assert.ok(worker.includes('if (path === "/gedeeld") return "shared"'));
  assert.ok(worker.includes('if (path === "/meldingen") return "messages"'));
  assert.ok(!worker.includes("api/profile"));
});
