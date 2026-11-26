import assert from 'node:assert/strict';
import test from 'node:test';
import {simplifyTellMemoryEditor} from './f5-editor-clean-layout.mjs';

// Source-contract fixture from the observed original editor anchors (not a
// separate app). Executes the patched widget and toolbar on a DOM test-double.
const source=`<html><head></head><body><script>
function setupV20Tags(g,details){
 const clean=a=>{const seen=new Set();return a.map(x=>String(x).trim()).filter(x=>{const k=x.toLowerCase();if(!x||seen.has(k))return false;seen.add(k);return true})};
 const favorites=()=>['Familie','Jeugd','Werk'];
 const display=x=>x,text=(k,v)=>v;
 g.tags=clean(g.tags).slice(0,16);
 const box=document.createElement('div');box.className='talera-tags-v20';
 box.innerHTML='<button class="talera-tags-toggle" type="button" aria-expanded="false"></button><div class="talera-tags-selected" aria-live="polite"></div><div class="talera-tags-panel" hidden><div class="talera-tags-choices" role="group"></div><div class="talera-tags-confirm"><button type="button" class="talera-tag-apply"></button><button type="button" class="talera-tag-cancel"></button></div></div>';
 details.append(box);
 const toggle=box.querySelector('.talera-tags-toggle'),chips=box.querySelector('.talera-tags-selected'),panel=box.querySelector('.talera-tags-panel'),choices=box.querySelector('.talera-tags-choices'),apply=box.querySelector('.talera-tag-apply'),cancel=box.querySelector('.talera-tag-cancel');
 let pending=new Set(),openFavorites=[];
 const id=x=>x.toLocaleLowerCase('nl');
 const close=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');pending.clear()};
 function paintChips(){
  chips.replaceChildren();
  for(const tag of g.tags){
   const b=document.createElement('button');b.type='button';b.className='talera-tag-badge';b.textContent=display(tag)+' ×';
   b.onclick=()=>{g.tags=g.tags.filter(x=>id(x)!==id(tag));saveDraft();paintChips()};chips.append(b);
  }
 }
 function paintChoices(){
  choices.replaceChildren();
  choices.setAttribute('aria-label',text('tag.selected','Mijn favoriete kenmerken'));
  for(const tag of openFavorites){
   const b=document.createElement('button');b.className='talera-tag-choice';b.type='button';
   const chosen=pending.has(id(tag));b.setAttribute('aria-pressed',String(chosen));b.textContent=(chosen?'✓  ':'')+display(tag);
   b.onclick=()=>{if(pending.has(id(tag)))pending.delete(id(tag));else pending.add(id(tag));paintChoices()};
   choices.append(b);
  }
 }
 function paintLabels(){
  toggle.textContent='＋ Waar gaat deze herinnering over?';
  apply.textContent=text('common.add','Toevoegen');cancel.textContent=text('common.cancel','Annuleren');
  paintChips();if(!panel.hidden)paintChoices();
 }
 toggle.onclick=()=>{if(!panel.hidden){close();return}openFavorites=favorites();pending=new Set(openFavorites.filter(x=>g.tags.some(t=>id(x)===id(t))).map(id));panel.hidden=false;toggle.setAttribute('aria-expanded','true');paintChoices()};
 apply.onclick=()=>{
  const oldOther=g.tags.filter(x=>!openFavorites.some(f=>id(f)===id(x)));
  const selected=openFavorites.filter(x=>pending.has(id(x)));
  g.tags=clean([...oldOther,...selected]).slice(0,16);
  saveDraft();close();paintLabels();
 };
 cancel.onclick=close;
 document.addEventListener('talera:languagechange',paintLabels);
 paintLabels();
}function setupV10(){}
function taleraV16InstallToolbar(g){
 const publish=document.publish;
  publish.textContent='Plaatsen';
  publish.setAttribute('aria-label','Plaatsen op tijdlijn');
}
function workView(){}
</script></body></html>`;
function fixture({tags=['Niet meer favoriet'],edit='',existing=null,language='nl'}={}){
 const node=()=>({children:[],hidden:true,attrs:{},events:{},isConnected:true,
  setAttribute(k,v){this.attrs[k]=v},replaceChildren(){this.children=[]},append(n){this.children.push(n)},
  addEventListener(k,f){this.events[k]=f},dispatchEvent(e){this.events[e.type]?.()},
  querySelectorAll(sel){return this.children.filter(x=>'.'+x.className===sel)},
  querySelector(sel){return this.parts?.[sel]}
 });
 const details=node(),publish=node(),window={TaleraI18n:{language}};
 const parts=Object.fromEntries(['.talera-tags-toggle','.talera-tags-selected','.talera-tags-panel','.talera-tags-choices'].map(x=>[x,node()]));
 const document={publish,documentElement:{lang:language},createElement(){const n=node();n.parts=parts;return n},addEventListener(){},removeEventListener(){}};
 const group={tags:[...tags],existing},saved=[];
 const html=simplifyTellMemoryEditor(source);
 const js=html.split('<script>')[1].split('</script>')[0];
 new Function('document','window','location','saveDraft','g','details',js+'\nsetupV20Tags(g,details);taleraV16InstallToolbar(g);')(document,window,{search:edit},()=>saved.push([...group.tags]),group,details);
 return {group,saved,parts,publish,html};
}
test('existing favorites and original attached non-favorites are retained; selection directly changes only the draft',()=>{
 const f=fixture();
 const toggle=f.parts['.talera-tags-toggle'],panel=f.parts['.talera-tags-panel'],choices=f.parts['.talera-tags-choices'];
 toggle.onclick();assert.equal(panel.hidden,false);assert.equal(choices.children.length,4);
 const family=choices.children[0],old=choices.children[3];
 assert.equal(old.attrs['aria-pressed'],'true');assert.equal(family.attrs['aria-pressed'],'false');
 family.onclick();assert.deepEqual(f.group.tags,['Niet meer favoriet','Familie']);assert.deepEqual(f.saved,[['Niet meer favoriet','Familie']]);
 assert.equal(family.attrs['aria-pressed'],'true');assert.strictEqual(choices.children[0],family);
 family.onclick();assert.deepEqual(f.group.tags,['Niet meer favoriet']);assert.equal(family.attrs['aria-pressed'],'false');
 toggle.onclick();assert.equal(panel.hidden,true);toggle.onclick();assert.equal(choices.children[3].attrs['aria-pressed'],'true');
 assert.doesNotMatch(f.html,/talera-tag-apply|talera-tag-cancel|talera-tags-confirm|talera-tags-own-input/);
});
test('existing memory Save only on exact edit route, five languages; ordinary new memory Place',()=>{
 for(const [language,label] of [['nl','Opslaan'],['en','Save'],['de','Speichern'],['fr','Enregistrer'],['es','Guardar']]){
  assert.equal(fixture({existing:'local-12345678',edit:'?edit=local-12345678',language}).publish.textContent,label);
 }
 assert.equal(fixture({existing:null,edit:'?edit=local-12345678'}).publish.textContent,'Plaatsen');
 assert.equal(fixture({existing:'local-12345678',edit:'?edit=local-other'}).publish.textContent,'Plaatsen');
 assert.equal(fixture({existing:'local-12345678',edit:''}).publish.textContent,'Plaatsen');
});
test('16-tag maximum never evicts any attached tag; removing existing selection restores capacity',()=>{
 const f=fixture({tags:Array.from({length:16},(_,i)=>'Onderwerp '+i)});
 f.parts['.talera-tags-toggle'].onclick();const choices=f.parts['.talera-tags-choices'].children;
 assert.equal(choices[0].disabled,true);choices[0].onclick();assert.equal(f.group.tags.length,16);assert.equal(f.saved.length,0);
 choices[3].onclick();assert.equal(f.group.tags.length,15);assert.equal(choices[0].disabled,false);
 choices[0].onclick();assert.equal(f.group.tags.length,16);assert.equal(f.group.tags.at(-1),'Familie');
});
test('refuse original source drift and keep layout style editor scoped',()=>{
 assert.throws(()=>simplifyTellMemoryEditor(source.replace('let pending=new Set(),openFavorites=[];','let wrong=[];')),/SOURCE_DRIFT/);
 const html=simplifyTellMemoryEditor(source);
 assert.match(html,/id="talera-editor-clean-layout-v1"/);
 assert.match(html,/body:has\(#app #main .work.talera-r16-editor\) #app>header.top>strong/);
 assert.match(html,/aria-pressed="true"/);
});
