export const WORKBLAD_NEW_STORY_CONTEXT_SCRIPT = String.raw`<script>(function(){
try{
  var url=new URL(location.href);
  if(url.searchParams.get('new')!=='1')return;
  var suggested=url.searchParams.get('at')||'';
  if(suggested)try{sessionStorage.setItem('talera-new-story-suggested-at',suggested)}catch(e){}
  if(url.searchParams.has('at')){
    url.searchParams.delete('at');
    history.replaceState(null,'',url.pathname+(url.searchParams.toString()?'?'+url.searchParams.toString():'')+url.hash);
  }
}catch(e){}
})();</scr`+`ipt>`;
