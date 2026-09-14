const MULTIPART_RE=/^multipart\/form-data\b/i;

export async function normalizeMultipartRequest(request){
  const method=String(request.method||'GET').toUpperCase();
  const contentType=request.headers.get('content-type')||'';
  if(method==='GET'||method==='HEAD'||!MULTIPART_RE.test(contentType))return request;

  const raw=new Uint8Array(await request.arrayBuffer());
  const headers=new Headers(request.headers);
  headers.delete('content-length');

  let boundary=readBoundary(contentType);
  let body=raw;
  const decoder=new TextDecoder();
  const encoder=new TextEncoder();
  const probe=decoder.decode(raw.slice(0,Math.min(raw.length,4096)));

  if(!boundary){
    const inferred=probe.match(/(?:^|\r?\n)--([^\r\n]{1,200})\r?\n/);
    if(inferred)boundary=inferred[1];
  }

  if(boundary){
    const marker='--'+boundary;
    const markerBytes=encoder.encode(marker);
    const offset=indexOfBytes(raw,markerBytes,8192);

    // Safari/Workers occasionally exposes a multipart body with harmless bytes
    // before the first boundary. Strip only that preamble; never touch part data.
    if(offset>0)body=raw.slice(offset);
    else if(offset<0&&/^\s*Content-Disposition:/i.test(probe)){
      const prefix=encoder.encode(marker+'\r\n');
      const joined=new Uint8Array(prefix.length+raw.length);
      joined.set(prefix,0);joined.set(raw,prefix.length);body=joined;
    }

    headers.set('content-type','multipart/form-data; boundary='+boundary);
  }

  return new Request(request.url,{
    method,
    headers,
    body,
    redirect:request.redirect,
  });
}

function readBoundary(contentType){
  const quoted=contentType.match(/boundary="([^"]+)"/i);
  if(quoted)return quoted[1];
  const plain=contentType.match(/boundary=([^;\s]+)/i);
  return plain?plain[1].trim():'';
}

function indexOfBytes(haystack,needle,maxScan){
  if(!needle.length)return -1;
  const limit=Math.min(haystack.length-needle.length+1,Math.max(0,maxScan||haystack.length));
  outer:for(let i=0;i<limit;i++){
    for(let j=0;j<needle.length;j++)if(haystack[i+j]!==needle[j])continue outer;
    return i;
  }
  return -1;
}
