import test from 'node:test';
import assert from 'node:assert/strict';
import {TransferSignaling} from './f5-transfer-signal.mjs';
import {inventory,planTransfer,makeTransfer,reviewTransfer} from './f5-transfer-library.mjs';
import {sendFrame,frameReceiver,pairingVerificationCode} from './f5-transfer-transport.mjs';
const code='a'.repeat(32),sid='a'.repeat(64),other='b'.repeat(64),proof='c'.repeat(64);
const sdp='v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n';
test('pairing bound to separate sessions, one join, expiry and cancel',()=>{
 let now=0;const signal=new TransferSignaling(()=>now);
 assert.deepEqual(signal.handle(sid,{action:'create',code,sdp,proof}),{ok:true});
 assert.throws(()=>signal.offer(sid,code));assert.throws(()=>signal.offer(other,'b'.repeat(32)));
 assert.deepEqual(signal.offer(other,code).offer,{sdp,proof});
 assert.throws(()=>signal.handle(other,{action:'poll',code}));
 assert.throws(()=>signal.handle(other,{action:'cancel',code}));
 assert.throws(()=>signal.handle(other,{action:'join',code,sdp,proof,media:'private'}));
 signal.handle(other,{action:'join',code,sdp,proof});
 assert.deepEqual(signal.handle(sid,{action:'poll',code}).answer,{sdp,proof});
 assert.throws(()=>signal.handle('d'.repeat(64),{action:'join',code,sdp,proof}));
 signal.handle(other,{action:'cancel',code});assert.throws(()=>signal.handle(sid,{action:'poll',code}));
 now=4000;signal.handle(sid,{action:'create',code,sdp,proof});now+=120001;
 assert.throws(()=>signal.offer(other,code));assert.throws(()=>signal.handle(sid,{action:'poll',code}));
});
test('pairing rejects media SDP and oversized messages',()=>{
 const s=new TransferSignaling();
 assert.throws(()=>s.handle(sid,{action:'create',code,proof,sdp:sdp+'m=video 9 UDP\r\n'}));
 assert.throws(()=>s.handle(sid,{action:'create',code,proof,sdp:sdp+'x'.repeat(12000)}));
});
test('automatic discovery is temporary, account-local, invisible to its owner and after joining',()=>{
 let now=0;const signal=new TransferSignaling(()=>now),unrelatedAccount=new TransferSignaling(()=>now);
 const secret='f'.repeat(20),invitation={code,secret},search={action:'discover'};
 assert.deepEqual(signal.handle(other,search),{ok:true,invitation:null});
 assert.throws(()=>signal.handle(sid,{action:'create',code,sdp,proof,secret:[secret]}));
 assert.throws(()=>signal.handle(sid,{action:'create',code,sdp,proof,secret:'invalid'}));
 signal.handle(sid,{action:'create',code,sdp,proof,secret});
 assert.deepEqual(signal.handle(sid,search),{ok:true,invitation:null});
 assert.deepEqual(signal.handle(other,search),{ok:true,invitation});
 assert.deepEqual(unrelatedAccount.handle(other,search),{ok:true,invitation:null});
 assert.throws(()=>signal.handle(other,{action:'discover',code}));
 assert.throws(()=>signal.handle(other,{action:'cancel',code}));
 signal.handle(other,{action:'join',code,sdp,proof});
 assert.deepEqual(signal.handle('d'.repeat(64),search),{ok:true,invitation:null});
 assert.equal(signal.state.secret,null);
 signal.handle(sid,{action:'cancel',code});
 assert.deepEqual(signal.handle(other,search),{ok:true,invitation:null});
 now=4000;signal.handle(sid,{action:'create',code,sdp,proof,secret});
 now+=120000;assert.deepEqual(signal.handle(other,search),{ok:true,invitation:null});
 now+=4000;signal.handle(sid,{action:'create',code,sdp,proof});
 assert.deepEqual(signal.handle(other,search),{ok:true,invitation:null});
 assert.deepEqual(signal.offer(other,code).offer,{sdp,proof});
});
test('confirmation code binds both SDP messages and locator',async()=>{
 const a=await pairingVerificationCode(code,sdp,sdp+'answer');
 assert.match(a,/^\d{4} \d{4}$/);
 assert.equal(a,await pairingVerificationCode(code,sdp,sdp+'answer'));
 assert.notEqual(a,await pairingVerificationCode(code,sdp+'changed',sdp+'answer'));
 assert.notEqual(a,await pairingVerificationCode(code,sdp,sdp+'changed'));
 assert.notEqual(a,await pairingVerificationCode('b'.repeat(32),sdp,sdp+'answer'));
 await assert.rejects(pairingVerificationCode('',sdp,sdp));
});
const scope='talera-free-local-'+('a'.repeat(32))+'-v1',origin='https://example.test';
const photo={key:'local-test:0',blob:new File([new Uint8Array([0,1,2,3])],'a.jpg',{type:'image/jpeg',lastModified:10})};
const video={key:'local-test:1',blob:new File([new Uint8Array([4,5,6,7])],'b.mov',{type:'video/quicktime',lastModified:20})};
const a={id:'local-a',items:[{key:photo.key,kind:'photo'}],narrationCues:[{t:0,index:0}],title:'A'};
const b={id:'local-b',items:[{key:photo.key,kind:'photo'},{key:video.key,kind:'video'}],narrationCues:[{t:0,mediaId:photo.key}],title:'B'};
const full={stories:[a,b],files:[photo,video,{key:'talera-v4-work:manifest',blob:['private draft']}]};
const empty={stories:[],files:[]},partial={stories:[a],files:[photo]};
test('first copy keeps original story metadata and file bytes, excludes drafts',async()=>{
 const result=await makeTransfer(full,await inventory(empty),scope,origin);
 assert.equal(result.count,2);assert.deepEqual(result.reuse,[]);
 const checked=await reviewTransfer(result.archive,result.reuse,empty,scope,origin);
 assert.deepEqual(checked.stories,[a,b]);assert.deepEqual(checked.files.map(x=>x.key),[photo.key,video.key]);
 assert.equal(checked.files[0].blob.name,'a.jpg');
 assert.deepEqual(new Uint8Array(await checked.files[0].blob.arrayBuffer()),new Uint8Array([0,1,2,3]));
});
test('repeat transfer sends only new stories and absent media; reconstructs identical shared media locally',async()=>{
 const result=await makeTransfer(full,await inventory(partial),scope,origin);
 assert.equal(result.count,1);assert.equal(result.duplicates,1);assert.equal(result.reuse[0][0],photo.key);
 const checked=await reviewTransfer(result.archive,result.reuse,partial,scope,origin);
 assert.deepEqual(checked.stories,[b]);assert.equal(checked.files.length,2);
 const again=await makeTransfer(full,await inventory(full),scope,origin);
 assert.equal(again.count,0);assert.equal(again.archive,null);
});
test('changed story and changed original bytes block instead of overwrite',async()=>{
 await assert.rejects(planTransfer(full,await inventory({stories:[{...a,title:'modified'}],files:[photo]})),/CONFLICT/);
 await assert.rejects(planTransfer(full,await inventory({stories:[a],files:[{...photo,blob:new File(['diff'],'a.jpg',{type:'image/jpeg',lastModified:10})}]})),/CONFLICT/);
});
test('wrong account/origin, corrupt archives and target changed since preview fail',async()=>{
 const result=await makeTransfer(full,await inventory(partial),scope,origin);
 await assert.rejects(reviewTransfer(result.archive,result.reuse,partial,'different',origin),/CONFLICT/);
 await assert.rejects(reviewTransfer(result.archive,result.reuse,partial,scope,'https://other.test'),/CONFLICT/);
 await assert.rejects(reviewTransfer(result.archive,result.reuse,full,scope,origin),/CONFLICT/);
 const changed={stories:[a],files:[{...photo,blob:new File(['diff'],'a.jpg',{type:'image/jpeg',lastModified:10})}]};
 await assert.rejects(reviewTransfer(result.archive,result.reuse,changed,scope,origin),/CONFLICT/);
 const corrupt=new Uint8Array(await result.archive.arrayBuffer());corrupt[corrupt.length-1]^=1;
 await assert.rejects(reviewTransfer(new Blob([corrupt]),result.reuse,partial,scope,origin));
});
class Channel extends EventTarget{
 readyState='open';bufferedAmount=0;
 send(data){queueMicrotask(()=>this.other.dispatchEvent(new MessageEvent('message',{data})))}
}
test('ordered binary frames with flow control preserve data',async()=>{
 const a=new Channel(),b=new Channel();a.other=b;b.other=a;
 const data=new Uint8Array(600000);for(let i=0;i<data.length;i++)data[i]=i%251;
 let received;const receiver=frameReceiver(b,async(kind,blob)=>{assert.equal(kind,'archive');received=new Uint8Array(await blob.arrayBuffer())},e=>{throw e});
 await sendFrame(a,'archive',new Blob([data]));await receiver.dispose();
 assert.deepEqual(received,data);
});
test('reject invalid frame length before accepting data',async()=>{
 const c=new Channel();let error;
 const receiver=frameReceiver(c,()=>assert.fail('must not accept'),e=>{error=e});
 c.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'archive',bytes:99999999999})}));
 await new Promise(r=>setTimeout(r,5));assert.match(error.message,/PROTOCOL/);await receiver.dispose();
});
test('unexpected archive headers are rejected before allocating a receive sink',async()=>{
 const c=new Channel();let error,checked=0;
 const receiver=frameReceiver(c,()=>assert.fail('unexpected frame'),e=>{error=e},()=>{},(kind,bytes)=>{
  assert.equal(kind,'archive');assert.equal(bytes,1024*1024*100);checked++;return false;
 });
 c.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({kind:'archive',bytes:1024*1024*100})}));
 await new Promise(r=>setTimeout(r,5));assert.equal(checked,1);assert.match(error.message,/PROTOCOL/);await receiver.dispose();
});
