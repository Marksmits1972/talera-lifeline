export const WORKBLAD_AUDIO_COMMIT_GUARD_SCRIPT = String.raw`<script>(function(){
var nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  var method=String((init&&init.method)||(input instanceof Request?input.method:'GET')||'GET').toUpperCase();
  var target='';
  try{target=new URL(typeof input==='string'?input:input.url,location.href).pathname}catch(e){}
  var body=init&&init.body;
  if(method!=='POST'||target!=='/api/stories'||!(body instanceof FormData))return nativeFetch(input,init);

  var audio=body.get('audio');
  var transcript=String(body.get('liveTranscript')||'').trim();
  if(!(audio instanceof Blob)||!audio.size){
    if(transcript){
      return new Response(JSON.stringify({error:'Je woorden zijn wel herkend, maar de geluidsopname is niet vastgelegd. Probeer Vertel nogmaals voordat je dit verhaal op de tijdlijn zet.'}),{status:422,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
    }
    return nativeFetch(input,init);
  }

  var response=await nativeFetch(input,init);
  if(!response.ok)return response;

  var created={};
  try{created=await response.clone().json()}catch(e){}
  var storyId=created.storyId||'';
  var token=created.manageToken||'';
  if(!storyId||!token)return new Response(JSON.stringify({error:'De gesproken opname kon niet aan de herinnering worden gekoppeld.'}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});

  var fd=new FormData();
  fd.append('audio',audio,'verhaal-opname');
  fd.append('durationSeconds',String(body.get('durationSeconds')||0));
  var audioPath='/api/integration/stories/'+encodeURIComponent(storyId)+'/audio';
  var put=await nativeFetch(audioPath,{method:'PUT',headers:{'authorization':'Bearer '+token},body:fd,cache:'no-store'});

  var head=await nativeFetch(audioPath,{method:'HEAD',headers:{'authorization':'Bearer '+token},cache:'no-store'});
  var storedBytes=Number(head.headers.get('content-length')||0);
  if(!head.ok||storedBytes<=0){
    var detail='';
    if(!put.ok)try{var p=await put.clone().json();detail=p&&p.error?String(p.error):''}catch(e){}
    return new Response(JSON.stringify({error:detail||'De gesproken opname is niet veilig opgeslagen. Probeer het nog een keer.'}),{status:502,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
  }

  return response;
};
})();</scr`+`ipt>`;
