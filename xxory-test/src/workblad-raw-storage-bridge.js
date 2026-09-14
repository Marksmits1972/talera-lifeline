export const WORKBLAD_RAW_STORAGE_BRIDGE_SCRIPT = String.raw`<script>(function(){
  if(window.__taleraRawStorageBridge)return;
  window.__taleraRawStorageBridge=true;

  var nativeFetch=window.fetch.bind(window);
  var STORAGE_TIMEOUT_MS=15000;

  function absoluteUrl(input){
    try{return new URL(typeof input==='string'?input:input.url,location.href)}catch(e){return null}
  }

  function headerValue(headers,name){
    try{return new Headers(headers||{}).get(name)||''}catch(e){return ''}
  }

  function setStage(text){
    try{var el=document.querySelector('.work-saving .muted');if(el&&text)el.textContent=text}catch(e){}
  }

  function jsonResponse(data,status){
    return new Response(JSON.stringify(data),{
      status:status||200,
      headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
    });
  }

  async function readJson(response){
    var data={};
    try{data=await response.clone().json()}catch(e){}
    return data;
  }

  async function fetchTimed(input,init,label){
    var controller=new AbortController();
    var timer=setTimeout(function(){try{controller.abort()}catch(e){}},STORAGE_TIMEOUT_MS);
    var options=Object.assign({},init||{}, {signal:controller.signal});
    if(label)setStage(label);
    try{
      return await nativeFetch(input,options);
    }catch(error){
      if(error&&error.name==='AbortError')throw new Error((label||'Deze opslagstap')+' duurde te lang. Probeer het opnieuw.');
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }

  function fileReaderBytes(blob){
    return new Promise(function(resolve,reject){
      try{
        var reader=new FileReader();
        reader.onload=function(){resolve(reader.result)};
        reader.onerror=function(){reject(reader.error||new Error('Bestand kon niet worden gelezen.'))};
        reader.onabort=function(){reject(new Error('Lezen van bestand is afgebroken.'))};
        reader.readAsArrayBuffer(blob);
      }catch(error){reject(error)}
    });
  }

  async function fixedBytes(blob,kind){
    if(!(blob instanceof Blob)||!blob.size)throw new Error(kind==='audio'?'De geluidsopname ontbreekt.':'De foto ontbreekt.');
    var bytes=null,firstError=null;
    try{bytes=await blob.arrayBuffer()}catch(error){firstError=error}
    if(!bytes||bytes.byteLength!==blob.size){
      try{bytes=await fileReaderBytes(blob)}catch(error){if(!firstError)firstError=error}
    }
    if(!bytes||bytes.byteLength!==blob.size){
      if(kind==='audio')throw new Error('De lokaal bewaarde geluidsopname is niet meer leesbaar op deze iPhone. Spreek alleen de opname opnieuw in; je tekst en foto blijven staan.');
      throw new Error('De lokaal bewaarde foto is niet meer leesbaar op deze iPhone. Kies alleen deze foto opnieuw; je tekst en opname blijven staan.');
    }
    return bytes;
  }

  async function uploadRawAudio(storyId,token,blob,duration,preparedBytes){
    var bytes=preparedBytes||await fixedBytes(blob,'audio');
    var res=await fetchTimed('/api/integration/raw/stories/'+encodeURIComponent(storyId)+'/audio',{
      method:'PUT',
      headers:{
        'authorization':'Bearer '+token,
        'content-type':blob.type||'application/octet-stream',
        'x-talera-duration-seconds':String(Number(duration)||0)
      },
      body:bytes,
      cache:'no-store'
    },'Je stem wordt veilig opgeslagen…');
    return {response:res,data:await readJson(res)};
  }

  async function uploadRawMedia(storyId,token,file,role,preparedBytes){
    var bytes=preparedBytes||await fixedBytes(file,'photo');
    var res=await fetchTimed('/api/integration/raw/stories/'+encodeURIComponent(storyId)+'/media?role='+(role==='start'?'start':'extra'),{
      method:'POST',
      headers:{
        'authorization':'Bearer '+token,
        'content-type':file.type||'application/octet-stream'
      },
      body:bytes,
      cache:'no-store'
    },role==='start'?'Je foto wordt veilig opgeslagen…':'Extra foto wordt veilig opgeslagen…');
    return {response:res,data:await readJson(res)};
  }

  window.fetch=async function(input,init){
    init=init||{};
    var url=absoluteUrl(input);
    var method=String(init.method||(input&&input.method)||'GET').toUpperCase();
    var body=init.body;
    if(!url||url.origin!==location.origin)return nativeFetch(input,init);

    if(method==='POST'&&url.pathname==='/api/integration/stories'&&body instanceof FormData){
      var audio=body.get('audio');
      var startPhoto=body.get('startPhoto');
      var payload={
        storyText:String(body.get('storyText')||''),
        liveTranscript:String(body.get('liveTranscript')||''),
        sourceMode:String(body.get('sourceMode')||'workblad'),
        durationSeconds:Number(body.get('durationSeconds')||0),
        voiceAttempted:String(body.get('voiceAttempted')||'')==='1',
        eventTime:String(body.get('eventTime')||''),
        title:String(body.get('title')||''),
        sessionId:String(body.get('sessionId')||''),
        displayName:String(body.get('displayName')||'')
      };

      setStage('Lokale opname en foto worden gecontroleerd…');
      var preparedAudio=null,preparedPhoto=null;
      if(audio instanceof Blob&&audio.size)preparedAudio=await fixedBytes(audio,'audio');
      if(startPhoto instanceof Blob&&startPhoto.size)preparedPhoto=await fixedBytes(startPhoto,'photo');

      var createRes=await fetchTimed('/api/integration/raw/stories',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload),
        cache:'no-store'
      },'Je herinnering wordt voorbereid…');
      var createData=await readJson(createRes);
      if(!createRes.ok)return jsonResponse(createData,createRes.status);

      if(audio instanceof Blob&&audio.size){
        var audioResult=await uploadRawAudio(createData.storyId,createData.manageToken,audio,payload.durationSeconds,preparedAudio);
        if(!audioResult.response.ok)return jsonResponse(audioResult.data,audioResult.response.status);
        createData.hasAudio=true;
        createData.audioMimeType=audioResult.data.audioMimeType||audio.type||null;
        createData.audioSizeBytes=Number(audioResult.data.audioSizeBytes||audio.size||0);
      }

      if(startPhoto instanceof Blob&&startPhoto.size){
        var mediaResult=await uploadRawMedia(createData.storyId,createData.manageToken,startPhoto,'start',preparedPhoto);
        if(!mediaResult.response.ok)return jsonResponse(mediaResult.data,mediaResult.response.status);
      }

      setStage('Opslag wordt gecontroleerd…');
      createData.rawStorage=true;
      return jsonResponse(createData,201);
    }

    var editAudio=url.pathname.match(/^\/api\/integration\/stories\/([^/]+)\/audio$/);
    if(method==='PUT'&&editAudio&&body instanceof FormData){
      var editBlob=body.get('audio');
      if(!(editBlob instanceof Blob)||!editBlob.size)return jsonResponse({error:'Opname ontbreekt.'},400);
      var editBytes=await fixedBytes(editBlob,'audio');
      var token=headerValue(init.headers,'authorization').replace(/^Bearer\s+/i,'');
      var editResult=await uploadRawAudio(decodeURIComponent(editAudio[1]),token,editBlob,body.get('durationSeconds'),editBytes);
      return jsonResponse(editResult.data,editResult.response.status);
    }

    var legacyMedia=url.pathname.match(/^\/api\/stories\/([^/]+)\/media$/);
    if(method==='POST'&&legacyMedia&&body instanceof FormData){
      var files=body.getAll('media').filter(function(item){return item instanceof Blob&&item.size});
      var auth=headerValue(init.headers,'authorization').replace(/^Bearer\s+/i,'');
      var storyId=decodeURIComponent(legacyMedia[1]);
      for(var i=0;i<files.length;i++){
        var fileBytes=await fixedBytes(files[i],'photo');
        var result=await uploadRawMedia(storyId,auth,files[i],'extra',fileBytes);
        if(!result.response.ok)return jsonResponse(result.data,result.response.status);
      }
      return jsonResponse({ok:true,count:files.length,rawStorage:true},201);
    }

    if(url.pathname.indexOf('/api/integration/')===0){
      return fetchTimed(input,init,'Opslag wordt gecontroleerd…');
    }

    return nativeFetch(input,init);
  };
})();</scr`+`ipt>`;
