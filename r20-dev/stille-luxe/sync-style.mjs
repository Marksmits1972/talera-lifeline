/**
 * TALERA Stille luxe build check.
 * The .css file is the only editable source of style declarations.
 * The Worker embeds a generated copy to keep Cloudflare one-file deployment simple.
 * No dependencies, no changes to other TALERA branches or Workers.
 *
 * Usage: node r20-dev/stille-luxe/sync-style.mjs --check
 *        node r20-dev/stille-luxe/sync-style.mjs
 */
import {readFileSync,writeFileSync} from 'node:fs';
const cssUrl=new URL('./stille-luxe.css',import.meta.url);
const workerUrl=new URL('./stille-luxe.worker.mjs',import.meta.url);
const css=readFileSync(cssUrl,'utf8');
const worker=readFileSync(workerUrl,'utf8');
const marker=/^const BRAND_CSS = .*;(?=\nconst PALETTE)/m;
const existing=worker.match(marker);
if(!existing)throw Error('Cannot find generated style marker; refuse to modify Worker.');
const next='const BRAND_CSS = '+JSON.stringify(css)+';';
if(process.argv.includes('--check')){
 if(existing[0]!==next){console.error('Stijlbron en Worker zijn NIET gelijk. Voer sync-style.mjs uit.');process.exitCode=1;}
 else console.log('PASS: enige CSS-bron en Worker-bundel zijn gelijk.');
}else if(existing[0]===next){
 console.log('Geen wijzigingen nodig.');
}else{
 writeFileSync(workerUrl,worker.replace(marker,next));
 console.log('Stijlbron opnieuw ingebed in afzonderlijke staging-Worker.');
}
