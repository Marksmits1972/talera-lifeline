/**
 * Read-only diagnostic page for the isolated TALERA Story Player test.
 * Reads only anonymous local record counts. Never sends story content to a server.
 */
export const STORY_PLAYER_CHECK_HTML = String.raw`<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f8f5ef">
<title>TALERA — Controle fototijdstempels</title>
<style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f8f5ef;color:#173550;font:16px/1.55 -apple-system,BlinkMacSystemFont,system-ui,sans-serif}
main{max-width:540px;margin:0 auto;padding:36px 22px 60px}h1{font-size:25px;line-height:1.16;margin:20px 0 14px}p{line-height:1.5}
a{color:#1660a0}.status{background:white;border:1px solid #e0e5e9;border-radius:15px;padding:18px;margin:20px 0}
.summary{font-weight:700}.entry{padding:14px 0;border-top:1px solid #e0e5e9}.ok{color:#207044}.bad{color:#af5319}
small{color:#566778;display:block}.disclaimer{font-size:13px;color:#526675}button{border:0;border-radius:10px;background:#1b5988;color:#fff;padding:12px 18px;font:inherit}
</style></head>
<body><main>
<a href="/present">← Terug naar TALERA</a>
<h1>Controle van fototijdstempels</h1>
<p>Dit controleert op je eigen toestel of gesproken herinneringen fotomomenten bevatten. Er wordt niets gewijzigd en er worden geen foto's, namen of geluidsbestanden verstuurd.</p>
<section class="status"><p class="summary" id="status">Herinneringen controleren…</p><div id="records"></div></section>
<p class="disclaimer">Als een opname nul opgeslagen fotomomenten heeft, kan de speler de foto's niet automatisch wisselen. Als er wel geldige fotomomenten zijn maar de foto's stilstaan, zit de fout in de afspeel- of beeldweergave op dit toestel.</p>
</main>
<script>
(async function(){
const $=id=>document.getElementById(id),status=$('status'),records=$('records');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
try{
const db=await new Promise((resolve,reject)=>{
const q=indexedDB.open('talera-lifeline-dev-local-v1',1);
q.onupgradeneeded=()=>{try{q.transaction.abort()}catch(e){}};
q.onsuccess=()=>resolve(q.result);
q.onerror=()=>reject(q.error||new Error('Lokale opslag niet gevonden'));
});
const rows=await new Promise((resolve,reject)=>{
const t=db.transaction('stories','readonly'),q=t.objectStore('stories').getAll();
q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error);
});db.close();
const narrated=rows.filter(x=>Array.isArray(x.items)&&x.items.some(y=>y.kind==='audio')).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
if(!narrated.length){status.textContent='Geen gesproken herinneringen op deze testomgeving gevonden.';return}
const good=narrated.filter(row=>{
const frames=row.items.filter(i=>i.kind==='photo'||i.kind==='video'),cues=Array.isArray(row.narrationCues)?row.narrationCues:[];
return cues.some(c=>typeof c.mediaId==='string'?frames.some(f=>(f.id||f.key)===c.mediaId):Number.isInteger(c.index)&&c.index>=0&&c.index<frames.length);
}).length;
status.textContent=narrated.length+' gesproken herinnering(en) · '+good+' met bruikbare fototijdstempels';
records.innerHTML=narrated.slice(0,12).map((row,i)=>{
const frames=row.items.filter(x=>x.kind==='photo'||x.kind==='video'),cues=Array.isArray(row.narrationCues)?row.narrationCues:[];
const valid=cues.filter(c=>typeof c.mediaId==='string'?frames.some(f=>(f.id||f.key)===c.mediaId):Number.isInteger(c.index)&&c.index>=0&&c.index<frames.length);
const ok=valid.length>0;
return '<div class="entry"><strong>Opname '+(i+1)+' <span class="'+(ok?'ok':'bad')+'">'+(ok?'· Fotomomenten aanwezig':'· Geen bruikbare fotomomenten')+'</span></strong><small>'+
frames.length+' foto’s/video’s · '+cues.length+' opgeslagen markers · '+valid.length+' gekoppelde markers</small></div>'
}).join('');
}catch(err){status.textContent='Controle niet mogelijk op dit toestel.';records.textContent=String(err&&err.message||err)}
})();
</script></body></html>`;
