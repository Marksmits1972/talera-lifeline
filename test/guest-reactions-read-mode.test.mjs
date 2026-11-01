import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/guest/guest-reactions.js',import.meta.url),'utf8');

test('guest script is syntactically valid and retains native one-memory presentation',()=>{
 assert.doesNotThrow(()=>new Function(source));
 assert.ok(source.includes("runtime.restrictToMemory(memory)"));
 assert.ok(source.includes("base='/api/guest/threads/'"));
 assert.ok(source.includes("nav.addEventListener('click'"));
 assert.ok(source.includes("function comments()"));
 assert.ok(source.includes("const name=document.createElement('strong')"));
});

test('replies are a deliberate action, and reading remains undisturbed',()=>{
 assert.ok(source.includes("reply.id='talera-guest-reply-start'"));
 assert.ok(source.includes("reply.textContent='Reageren'"));
 assert.ok(source.includes("form.hidden=true"));
 assert.ok(source.includes("reply.addEventListener('click'"));
 assert.ok(source.includes("reply.hidden=true;form.hidden=false"));
 assert.ok(source.includes("form.hidden=true;reply.hidden=false"));
 assert.ok(source.includes("#talera-guest-dialog [hidden]{display:none!important}"));
});

test('guest first name is kept only locally, is editable, and is never an account identity',()=>{
 assert.ok(source.includes("'talera-gast-voornaam'"));
 assert.ok(source.includes("localStorage.getItem(savedKey)"));
 assert.ok(source.includes("localStorage.setItem('talera-gast-voornaam',payload.name)"));
 assert.ok(source.includes("caption.textContent='Reageren als '+value"));
 assert.ok(source.includes("change.textContent='Naam wijzigen'"));
 assert.ok(source.includes("input.maxLength=40"));
 assert.ok(source.includes("form.append(known,label,input)"));
 assert.ok(!source.includes('/api/profile'));
});

test('only successful comment posts close the form and preserve original thread',()=>{
 const submit=source.slice(source.indexOf("form.addEventListener('submit'"));
 const success=submit.indexOf("await api(base+'/comments','POST',payload)");
 const collapse=submit.indexOf("form.hidden=true;reply.hidden=false");
 const error=submit.indexOf("catch(ex){status.textContent=ex.message}");
 assert.ok(success>=0&&collapse>success&&error>collapse);
 assert.ok(source.includes("await refresh();comments()"));
 assert.ok(source.includes("time.textContent=when.toLocaleString('nl-NL'"));
});
