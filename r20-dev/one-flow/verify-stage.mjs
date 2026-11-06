import assert from 'node:assert/strict';
const domain='https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
for(let attempt=0;attempt<8;attempt++){
  const reports=[];
  for(const path of ['/present','/','/tell','/vertelmodus-embed?mode=record']){
    try{
      const res=await fetch(domain+path);
      const body=await res.text();
      const report={path,status:res.status,marker:res.headers.get('x-talera-closed-core'),
        type:res.headers.get('content-type'),size:body.length,
        excerpt:res.ok?'':body.slice(0,160)};
      reports.push(report);
    }catch(e){reports.push({path,error:String(e)})}
  }
  console.log('Staging verification attempt '+(attempt+1),JSON.stringify(reports));
  if(reports.every(x=>x.status===200)&&reports[0].marker==='installed'){
    console.log('PASS staging test ready '+domain+'/present');
    process.exit(0);
  }
  await sleep(2500);
}
throw new Error('Staging is not ready; do not share this link as confirmed');
