import assert from 'node:assert/strict';
import {createTitle} from './title.browser.js';
const workers=[];let lock=Promise.resolve();Object.defineProperty(globalThis,'navigator',{value:{locks:{request:(name,task)=>{assert.equal(name,'talera-local-title-model');const next=lock.then(task);lock=next.catch(()=>{});return next;}}},configurable:true});
globalThis.Worker=class{constructor(){this.closed=false;workers.push(this);}postMessage(message){this.message=message;}terminate(){this.closed=true;}};
const a=createTitle(),b=createTitle(),first=a.suggest('Een wandeling.'),second=b.suggest('Een middag buiten.');await new Promise(r=>setTimeout(r,0));assert.equal(workers.length,1);
workers[0].onmessage({data:{kind:'title',id:workers[0].message.id,title:'Een wandeling'}});assert.equal(await first,'Een wandeling');assert.equal(workers[0].closed,true);await new Promise(r=>setTimeout(r,0));assert.equal(workers.length,2);
workers[1].onmessage({data:{kind:'title',id:workers[1].message.id,title:'Een middag buiten'}});assert.equal(await second,'Een middag buiten');assert.equal(workers[1].closed,true);
console.log('Local title workers: exclusive inference across pages and model memory released after results.');
