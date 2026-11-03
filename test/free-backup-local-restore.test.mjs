import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";

const app=readFileSync(new URL("../src/mijn-talera/free-backup.txt",import.meta.url),"utf8");
const menu=readFileSync(new URL("../src/mijn-talera/menu-integration.txt",import.meta.url),"utf8");
const worker=readFileSync(new URL("../src/mijn-talera/worker.js",import.meta.url),"utf8");
const labels=JSON.parse(readFileSync(new URL("../src/mijn-talera/vertalingen-free-backup.json",import.meta.url),"utf8"));

test("Free archive module parses without a second storage or backend",()=>{
 assert.doesNotThrow(()=>new Script(app));
 assert.ok(app.includes("const DB='talera-lifeline-dev-local-v1'"));
 assert.ok(app.includes("db.transaction(['stories','files'],'readonly')"));
 assert.ok(app.includes("db.transaction(['stories','files'],'readwrite')"));
 assert.ok(app.includes("window.TaleraFreeBackup={prepare,preview,restore,render,remind,acknowledge,archivedComments,socialSnapshot}"));
 assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|\.cloudflare\.com/.test(app));
});

test("exports stories and media with format and SHA-256 integrity",()=>{
 assert.ok(app.includes("TALERA_FREE_BACKUP"));
 assert.ok(app.includes("TALERA-FREE/1"));
 assert.ok(app.includes("crypto.subtle.digest('SHA-256'"));
 assert.ok(app.includes("if(await digest(metadata)!==sha)"));
 assert.ok(app.includes("if(await digest(await blob.arrayBuffer())!==f.sha256)"));
 assert.ok(app.includes("if(offset!==file.size)"));
 assert.ok(app.includes("for(const s of stories)for(const it of s.items"));
});

test("restore previews, checks differences and only adds in one transaction",()=>{
 assert.ok(app.includes("const again=await preview(info.file)"));
 assert.ok(app.includes("if(again.conflicts.length)"));
 assert.ok(app.includes("tx.objectStore('stories').add(s)"));
 assert.ok(app.includes("tx.objectStore('files').add({key:f.key"));
 assert.ok(!app.includes("tx.objectStore('stories').put(s)"));
 assert.ok(!app.includes("tx.objectStore('files').put("));
});

test("backup requires user saving the file outside the browser",()=>{
 assert.ok(app.includes("navigator.canShare?.({files:[file]})"));
 assert.ok(app.includes("a.download=prepared.filename"));
 assert.ok(app.includes("'.talerabackup'"));
 assert.ok(app.includes("L(3),()=>{acknowledge()"));
 assert.ok(!app.includes("acknowledge();return prepared"));
});

test("monthly reminder is on opening a menu, not on each memory save",()=>{
 assert.ok(app.includes("MONTH=30*86400000"));
 assert.ok(app.includes("localStorage.setItem(FIRST,String(now))"));
 assert.ok(app.includes("if(now-seen<MONTH)return"));
 assert.ok(app.includes("localStorage.setItem(SEEN,String(now))"));
 assert.ok(app.includes("const rows=await window.TaleraMemories?.list?.()"));
 assert.ok(menu.includes("state.open&&state.view==='hub'"));
 assert.ok(menu.includes("TaleraFreeBackup?.remind(shell)"));
});

test("same Worker serves app backup without a new database or service",()=>{
 assert.ok(worker.includes('import backupSource from "./free-backup.txt"'));
 assert.ok(worker.includes('url.pathname === "/__clean/free-backup.js"'));
 assert.ok(worker.includes("return env.V56_BASE.fetch(request)"));
 assert.ok(menu.includes("TaleraFreeBackup?.render(body)"));
 assert.ok(menu.includes("backupLoader.src='/__clean/free-backup.js'"));
});

test("Free labels use existing five-language register",()=>{
 const langs=["nl","en","de","fr","es"];
 assert.deepEqual(labels.languages,langs);
 for(const lang of langs){
   assert.deepEqual(Object.keys(labels.catalog[lang]),Object.keys(labels.catalog.nl));
   assert.equal(Object.keys(labels.catalog[lang]).length,22);
   assert.ok(Object.values(labels.catalog[lang]).every(s=>typeof s==="string"&&s.trim()));
 }
 assert.ok(app.includes("window.TaleraI18n?.t?.('backup.'+LABEL_KEYS[n])"));
 assert.ok(!app.includes("const I={"));
});

test("one unified chronological stream of account and WhatsApp guest replies",()=>{
 assert.ok(app.includes("const items=unionThreads(previous,live.items)"));
 assert.ok(app.includes("if(items.length)threads.push({localId:story.id,items})"));
 assert.ok(app.includes("guest:!!c.guest"));
 assert.ok(app.includes("a.created_at-b.created_at"));
 assert.ok(app.includes("if(items.length>=200)throw Error"));
 assert.ok(app.includes("if(m.version===1)m.threads=[]"));
 assert.ok(app.includes("status:'not-authenticated'"));
 assert.ok(app.includes("status:'unverified'"));
});
test("locally restored messages remain inert and never POST as another sender",()=>{
 const adapter=readFileSync(new URL("../src/mijn-talera/social-archive-adapter-snippet.txt",import.meta.url),"utf8");
 assert.doesNotThrow(()=>new Script(adapter));
 assert.ok(adapter.includes("window.TaleraFreeBackup.socialSnapshot(localMemoryId)"));
 assert.ok(adapter.includes("async commitLocal(){throw Error"));
 assert.ok(app.includes("for(const c of again.newComments)tx.objectStore('files').add"));
 assert.ok(app.includes("window.TaleraFreeBackup={prepare,preview,restore,render,remind,acknowledge,archivedComments,socialSnapshot}"));
});
