import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const menu=readFileSync(new URL("../src/mijn-talera/menu-integration.txt",import.meta.url),"utf8");
const worker=readFileSync(new URL("../src/mijn-talera/worker.js",import.meta.url),"utf8");
const knowledge=readFileSync(new URL("../src/mijn-talera/kennisbank.html",import.meta.url),"utf8");
const languages=JSON.parse(readFileSync(new URL("../src/mijn-talera/vertalingen-menu.json",import.meta.url),"utf8"));

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

test("Kennisbank opens on the same TALERA origin and has a clear route back",()=>{
  assert.ok(menu.includes('href="/kennisbank/"'));
  assert.ok(menu.includes("Kennisbank en hulp"));
  assert.ok(!menu.includes('talera-website.pages.dev/welkom/'));
  assert.ok(!menu.includes('target="_blank">Ontdek TALERA'));
  assert.ok(worker.includes('import knowledgeSource from "./kennisbank.html"'));
  assert.ok(worker.includes('url.pathname === "/kennisbank/"'));
  assert.ok(knowledge.includes('Terug naar Mijn TALERA'));
  assert.ok(knowledge.includes('Veelgestelde vragen'));
  assert.ok(knowledge.includes('href="https://talera-pwa-v62-mijn-profiel-20261101.mark-a39.workers.dev/present?talera_menu=help"'));
});

test("i18n: existing TaleraI18n gets the same 152 extra keys for all five app languages",()=>{
  const langs=["nl","en","de","fr","es"];
  assert.deepEqual(languages.languages,langs);
  const keys=Object.keys(languages.catalog.nl);
  assert.equal(keys.length,152);
  for(const lang of langs){
    const strings=languages.catalog[lang];
    assert.deepEqual(Object.keys(strings),keys);
    assert.ok(keys.every(key=>typeof strings[key]==="string"&&strings[key].trim()),lang);
  }
  assert.ok(keys.every(key=>key.startsWith("more.")));
  assert.equal(languages.catalog.de["more.hub.people"],"Meine Kontakte");
  assert.equal(languages.catalog.fr["more.settings.storage"],"Stockage et sauvegarde");
  assert.equal(languages.catalog.es["more.help.open"],"Abrir el centro de ayuda");
});
test("i18n: language settings select uses the existing global language registry",()=>{
  assert.ok(menu.includes("window.TaleraI18n?.supported"));
  assert.ok(menu.includes("window.TaleraI18n?.setLanguage?.(e.target.value)"));
  assert.ok(menu.includes('id="talera-menu-language"'));
  assert.ok(menu.includes("talera:languagechange"));
  assert.ok(!menu.includes("case 'go-language':close();location.assign('/')"));
  assert.ok(!menu.includes("const TALERA_V23_TRANSLATIONS="));
  assert.ok(!menu.includes("TaleraI18n={"));
});
