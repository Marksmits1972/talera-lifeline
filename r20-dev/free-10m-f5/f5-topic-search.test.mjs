import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createTopicSearch,installCharacteristicSearchHome} from './f5-topic-search.mjs';
import {languageCatalog} from './f5-language-catalog.mjs';

const {key,parse,href,matches,intersect}=createTopicSearch();
test('characteristics: normalized exact AND; no aliases, no empty widening',()=>{
  assert.equal(key('  Familie  '),'familie');
  assert.equal(key('Reis   zomer'),'reis zomer');
  assert.equal(matches([' Familie ','VAKANTIE','Kinderen'],['familie']),true);
  assert.equal(matches(['Familie','Vakantie','Kinderen'],['familie','vakantie','kinderen']),true);
  assert.equal(matches(['Familie','Vakantie'],['familie','vakantie','kinderen']),false);
  assert.equal(matches(['Familie'],['familie','vakantie']),false);
  assert.equal(matches(['Reizen & vakanties'],['vakantie']),false);
  assert.equal(matches(['Familie'],[]),false);
  assert.equal(matches(null,['familie']),false);
});
test('characteristics: device-local URL fragment, no query or malformed fallback',()=>{
  const url=new URL(href([' Familie','Vakantie','A& B # café','familie']),'https://example.invalid');
  assert.equal(url.pathname,'/present');
  assert.equal(url.search,'');
  assert.deepEqual(parse(url.hash),['familie','vakantie','a& b # café']);
  assert.equal(parse('#story=123&token=456'),null);
  assert.deepEqual(parse(url.hash,'?memory=other'),[]);
  for(const hash of ['#talera-kenmerken=','#talera-kenmerken=%','#talera-kenmerken=%5B%5D','#talera-kenmerken=%5B1%5D'])
    assert.deepEqual(parse(hash),[]);
});
test('characteristics: intersection of metadata IDs and 10,000 records',()=>{
  const entries=new Map([
    ['familie',{ids:new Set(Array.from({length:10000},(_,i)=>'local-'+i))}],
    ['vakantie',{ids:new Set(Array.from({length:5000},(_,i)=>'local-'+(i*2)))}],
    ['kinderen',{ids:new Set(['local-1','local-2','local-4','local-9999'])}]
  ]);
  assert.equal(intersect(entries,new Set(['familie'])).length,10000);
  assert.equal(intersect(entries,new Set(['familie','vakantie'])).length,5000);
  assert.deepEqual(intersect(entries,new Set(['familie','vakantie','kinderen'])),['local-2','local-4']);
  assert.deepEqual(intersect(entries,new Set(['familie','deleted'])),[]);
  assert.deepEqual(intersect(entries,new Set()),[]);
});
test('characteristics: all seven independently localized positions and executable injected script',()=>{
  const keys=['toggle','choose','open','zero','one','many','back'];
  for(const lang of ['nl','en','de','fr','es']){
    for(const k of keys)assert.ok(languageCatalog[lang]['core.topicSearch.'+k]);
    assert.match(languageCatalog[lang]['core.topicSearch.many'],/\{count\}/);
  }
  const source='<head></head>const available=[...topics.values()].sort((a,b)=>normalized(a.name).localeCompare(normalized(b.name),\'nl\'));';
  const html=installCharacteristicSearchHome(source);
  const js=/<script id="talera-characteristic-search-script">([\s\S]*?)<\/script>/.exec(html)[1];
  const sandbox={window:{}};
  vm.runInNewContext(js,sandbox);
  assert.equal(sandbox.window.__taleraCharacteristicSearch.key('Vakantie'),'vakantie');
  assert.throws(()=>installCharacteristicSearchHome('<head></head>'),/SOURCE_DRIFT/);
});

test('characteristics: own route only; recipient and other routes remain unfiltered',()=>{
  const search=createTopicSearch();
  const base='https://example.invalid';
  const fragment=new URL(href(['Familie','Vakantie']),base).hash;
  assert.deepEqual(search.selection(new URL('/present'+fragment,base)),['familie','vakantie']);
  for(const path of ['/s/opaque-capability','/mijn-leven','/tell','/vertelmodus-embed'])
    assert.equal(search.selection(new URL(path+fragment,base)),null);
  assert.deepEqual(search.selection(new URL('/present?memory=local-'+fragment,base)),[]);
  assert.equal(search.selection(new URL('/present?theme=Familie',base)),null);
});

test('characteristics: native-control event contract, refresh and language change use the same production code',()=>{
  // Minimal DOM-contract fixture; tests the actual injected runtime, not a mock
  // implementation of filtering. Browser/layout/IndexedDB proof remains separate.
  class Node {
    constructor(tag){this.tagName=tag;this.children=[];this.events=new Map();this.attributes={};this.textContent='';}
    get firstElementChild(){return this.children[0]||null}
    get lastElementChild(){return this.children.at(-1)||null}
    get nextElementSibling(){const p=this.parentElement;return p?.children[p.children.indexOf(this)+1]||null}
    setAttribute(k,v){this.attributes[k]=v}
    remove(){if(this.parentElement){const a=this.parentElement.children;a.splice(a.indexOf(this),1);this.parentElement=null}}
    append(...nodes){for(const node of nodes)this.insertBefore(node,null)}
    insertBefore(node,ref){if(node===ref)return;node.remove();this.children.splice(ref===null?this.children.length:this.children.indexOf(ref),0,node);node.parentElement=this}
    after(node){this.parentElement.insertBefore(node,this.nextElementSibling)}
    addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(fn)}
    removeEventListener(type,fn){this.events.get(type)?.delete(fn)}
    emit(type){for(const fn of this.events.get(type)||[])fn()}
  }
  const body=new Node('body'),grid=new Node('div');body.append(grid);
  const document=new Node('document');document.body=body;document.createElement=tag=>new Node(tag);
  document.getElementById=id=>{const find=n=>n.id===id?n:n.children.map(find).find(Boolean);return find(body)};
  const nav=[];let lang='nl';
  const window={TaleraI18n:{t:(key,params={})=>languageCatalog[lang][key].replace('{count}',String(params.count??''))}};
  const source='<head></head>const available=[...topics.values()].sort((a,b)=>normalized(a.name).localeCompare(normalized(b.name),\'nl\'));';
  const script=/<script id="talera-characteristic-search-script">([\s\S]*?)<\/script>/.exec(installCharacteristicSearchHome(source))[1];
  vm.runInNewContext(script,{document,window,location:{assign:url=>nav.push(url)}});
  const api=window.__taleraCharacteristicSearch;
  const entry=(name,ids)=>({name,memories:ids.map(id=>({id}))});
  const rows=[entry('Familie',['local-1','local-2','local-3']),entry(' familie ',['local-1']),entry('Vakantie',['local-1','local-2']),entry('Kinderen',['local-1']),entry('Werk',['local-4']),...Array.from({length:9},(_,i)=>entry('Extra '+i,['local-4']))];
  api.render(grid,[]);assert.equal(body.children.length,1);
  api.render(grid,rows);
  const root=grid.nextElementSibling,field=root.lastElementChild;
  const [legend,choices,status,submit]=field.children;
  assert.equal(root.tagName,'details');assert.equal(choices.children.length,13);
  assert.equal(submit.disabled,true);
  const choice=name=>choices.children.find(label=>label.lastElementChild.textContent===name).firstElementChild;
  const select=(name,checked=true)=>{const input=choice(name);input.checked=checked;input.emit('change')};
  select('Familie');assert.equal(status.textContent,'3 herinneringen');
  select('Vakantie');assert.equal(status.textContent,'2 herinneringen');
  select('Kinderen');assert.equal(status.textContent,'1 herinnering');
  select('Werk');assert.equal(submit.disabled,true);submit.emit('click');assert.deepEqual(nav,[]);
  select('Werk',false);assert.equal(submit.disabled,false);
  const sameInput=choice('Familie');
  for(const next of ['en','de','fr','es','nl']){lang=next;document.emit('talera:languagechange');assert.equal(root.firstElementChild.textContent,languageCatalog[lang]['core.topicSearch.toggle']);assert.equal(sameInput.checked,true);}
  api.render(grid,rows);assert.equal(choice('Familie'),sameInput);
  submit.emit('click');assert.equal(nav.length,1);assert.deepEqual(parse(new URL(nav[0],'https://example.invalid').hash),['familie','vakantie','kinderen']);
  api.render(grid,rows.filter(r=>r.name!=='Kinderen'));assert.equal(choices.children.length,12);
  assert.equal(submit.disabled,true);assert.equal(sameInput.checked,false);submit.emit('click');assert.equal(nav.length,1);
  api.render(grid,[]);assert.equal(grid.nextElementSibling,null);
  api.showEmpty();assert.equal(document.getElementById('talera-characteristic-empty').lastElementChild.href,'/mijn-leven');
});
