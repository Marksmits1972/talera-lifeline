export const V9_PLAYBACK_PATCH_REV = "v9-playback-handoff-20260914-r1";

export const V9_PLAYBACK_PATCH_SCRIPT = String.raw`<script>(function(){
  if(window.__taleraV9PlaybackPatch)return;
  window.__taleraV9PlaybackPatch=true;

  function ready(fn){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fn,{once:true});
    else fn();
  }

  function wait(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}

  function waitForMedia(audio,timeoutMs){
    return new Promise(function(resolve){
      var done=false;
      var timer=setTimeout(finish,timeoutMs||1800);
      function finish(){if(done)return;done=true;clearTimeout(timer);audio.removeEventListener('canplay',finish);audio.removeEventListener('loadedmetadata',finish);resolve()}
      audio.addEventListener('canplay',finish,{once:true});
      audio.addEventListener('loadedmetadata',finish,{once:true});
      if(audio.readyState>=1)finish();
    });
  }

  ready(function(){
    var audio=document.getElementById('localAudio');
    var play=document.getElementById('playLocal');
    var status=document.getElementById('recordStatus');
    var confirm=document.getElementById('confirmLocal');
    if(!audio||!play)return;

    var badge=document.createElement('div');
    badge.textContent='iPhone playback bridge actief';
    badge.style.cssText='margin:8px 0 0;font-size:11px;font-weight:850;color:#2c684e';
    var card=audio.closest('.card');
    if(card)card.insertBefore(badge,card.children[1]||null);

    audio.controls=true;
    audio.style.display='block';
    audio.style.width='100%';
    audio.style.marginTop='10px';
    audio.muted=false;
    try{audio.volume=1}catch(e){}

    play.addEventListener('click',async function(event){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(!audio.src)return;
      play.disabled=true;
      if(confirm)confirm.disabled=true;
      if(status){status.textContent='iPhone schakelt van microfoon naar afspelen…';status.className='status live'}
      try{
        audio.pause();
        try{audio.currentTime=0}catch(e){}
        audio.muted=false;
        try{audio.volume=1}catch(e){}
        audio.load();
        await waitForMedia(audio,1800);
        await wait(220);
        await audio.play();
        if(status){status.textContent='Lokale opname speelt af…';status.className='status live'}
      }catch(error){
        play.disabled=false;
        if(status){status.textContent='Lokale playback mislukt: '+(error&&error.message?error.message:'onbekende fout');status.className='status bad'}
      }
    },true);

    audio.addEventListener('playing',function(){
      play.disabled=false;
      play.textContent='Speel opnieuw';
      if(status){status.textContent='Lokale opname speelt hoorbaar af. Luister en bevestig daarna.';status.className='status live'}
    });

    audio.addEventListener('timeupdate',function(){
      if(audio.paused||audio.ended)return;
      var now=Number(audio.currentTime||0).toFixed(1);
      var total=Number.isFinite(audio.duration)?Number(audio.duration).toFixed(1):'?';
      if(status){status.textContent='Lokale opname speelt: '+now+' / '+total+' s';status.className='status live'}
    });

    audio.addEventListener('ended',function(){
      play.disabled=false;
      if(status){status.textContent='Lokale opname afgespeeld. Bevestig alleen als je jezelf goed hoorde.';status.className='status ok'}
    });

    audio.addEventListener('error',function(){
      play.disabled=false;
      var code=audio.error&&audio.error.code?audio.error.code:'?';
      if(status){status.textContent='iPhone audio-element fout (code '+code+').';status.className='status bad'}
    });
  });
})();</scr`+`ipt>`;
