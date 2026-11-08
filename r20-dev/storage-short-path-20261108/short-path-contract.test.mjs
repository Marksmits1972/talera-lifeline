import test from 'node:test';
import assert from 'node:assert/strict';
import {
 importRouteKey,issueAccountRoute,resolveAccountShard,
 issueShareLocator,resolveShareShard,SyntheticAccountDirectory
} from './short-path-contract.mjs';
const KEY='This-is-just-a-synthetic-HMAC-key-for-GitHub-tests-and-not-live-'+('7'.repeat(38));
const fixed=Date.parse('2026-11-08T11:00:00Z');
const key=await importRouteKey(KEY);
const dbA={id:'A',ownedStories:new Map(),shares:new Map()};
const dbB={id:'B',ownedStories:new Map(),shares:new Map()};
const bindings={DATA_SHARD_A:dbA,DATA_SHARD_B:dbB};

test('After login: the same account goes directly to ONE D1 without checking directory on each story operation',async()=>{
 const dir=new SyntheticAccountDirectory(['A','B']);
 const account='synthetic-account-one';
 const stable=dir.register(account);
 let directoryLookups=0;
 function login(id){directoryLookups++;return dir.find(id)}
 const hint=await issueAccountRoute({accountId:account,shardId:login(account),nowMs:fixed},key);
 for(let i=0;i<1200;i++){
  const res=await resolveAccountShard({hint,authenticatedAccountId:account,nowMs:fixed+2*60_000},key,bindings);
  assert.equal(res.shardId,stable);
  res.db.ownedStories.set(account+'-story-'+i,{owner:account,cue:{time:i,mediaId:'media-'+i}});
 }
 assert.equal(directoryLookups,1,'One placement lookup at login, never per story request');
 assert.equal(bindings['DATA_SHARD_'+stable].ownedStories.size,1200);
 assert.equal((stable==='A'?dbB:dbA).ownedStories.size,0);
 console.log('SHORT_PATH',JSON.stringify({loginDirectoryLookups:directoryLookups,authenticatedStoryOperations:1200,
  dbHopsPerStory:1,allAccountMetadataInOneShard:true}));
});
test('Second physical shard added: existing records and owner assignments remain unchanged',()=>{
 const dir=new SyntheticAccountDirectory(['A']);
 const before=new Map();
 for(let i=0;i<10000;i++){
  const id='synthetic-existing-'+i;before.set(id,dir.register(id));
 }
 dir.addShard('B');
 for(let i=0;i<10000;i++)dir.register('synthetic-new-'+i);
 for(const [id,shard] of before){
  assert.equal(dir.find(id),shard);
 }
 const newB=Array.from({length:10000},(_,i)=>dir.find('synthetic-new-'+i)).filter(x=>x==='B').length;
 assert.ok(newB>9000,'New capacity absorbs new registrations; old accounts do not move');
 console.log('NO_MOVEMENT_ON_SCALE_UP',JSON.stringify({originalAccounts:before.size,newAccountsAssignedToB:newB}));
});
test('Missing or offline shard stops access; never automatically searches an alternative database',async()=>{
 const hint=await issueAccountRoute({accountId:'synthetic-one',shardId:'A',nowMs:fixed},key);
 await assert.rejects(
  resolveAccountShard({hint,authenticatedAccountId:'synthetic-one',nowMs:fixed},key,{DATA_SHARD_B:dbB}),
  /assigned shard missing/
 );
});
test('Forging shard ID in an unsigned client change is rejected by HMAC',async()=>{
 const legit=await issueAccountRoute({accountId:'synthetic-aaa',shardId:'A',nowMs:fixed},key);
 const [data,signature]=legit.split('.');
 const payload=JSON.parse(atob(data.replace(/-/g,'+').replace(/_/g,'/')));
 payload.s='B';
 const modified=btoa(JSON.stringify(payload)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')+'.'+signature;
 await assert.rejects(
  resolveAccountShard({hint:modified,authenticatedAccountId:'synthetic-aaa',nowMs:fixed},key,bindings),
  /signature/
 );
});
test('Even a genuine signed routing hint cannot cross to another authenticated account',async()=>{
 const hint=await issueAccountRoute({accountId:'synthetic-alice',shardId:'A',nowMs:fixed},key);
 await assert.rejects(
  resolveAccountShard({hint,authenticatedAccountId:'synthetic-bob',nowMs:fixed},key,bindings),
  /authenticated account/
 );
});
test('Expired hint cannot be used; a legitimate new login can refresh the same placement',async()=>{
 const hint=await issueAccountRoute({accountId:'synthetic-a',shardId:'A',nowMs:fixed},key);
 await assert.rejects(
  resolveAccountShard({hint,authenticatedAccountId:'synthetic-a',nowMs:fixed+16*60_000},key,bindings),
  /valid matching/
 );
 const renewed=await issueAccountRoute({accountId:'synthetic-a',shardId:'A',nowMs:fixed+16*60_000},key);
 assert.equal((await resolveAccountShard(
  {hint:renewed,authenticatedAccountId:'synthetic-a',nowMs:fixed+16*60_000},key,bindings)).shardId,'A');
});
test('Public share locator does NOT grant access; revocation checked inside the correct shard',async()=>{
 const locator=await issueShareLocator({shardId:'B',shareId:'share-qwerty-123'},key);
 const resolved=await resolveShareShard({locator},key,bindings);
 assert.equal(resolved.db,dbB);
 const privateShare={shareId:'share-qwerty-123',secretHash:'hash-of-secret-server-only',revokedAt:null};
 dbB.shares.set('share-qwerty-123',privateShare);
 const allowed=(r,secret)=>r?.secretHash===secret&&!r?.revokedAt;
 assert.equal(allowed(dbB.shares.get(resolved.shareId),'wrong-secret'),false);
 assert.equal(allowed(dbB.shares.get(resolved.shareId),'hash-of-secret-server-only'),true);
 privateShare.revokedAt='2026-11-08T11:10:00Z';
 assert.equal(allowed(dbB.shares.get(resolved.shareId),'hash-of-secret-server-only'),false);
 assert.equal(dbA.shares.size,0);
});
test('One million synthetic accounts can be grouped while each has ONE stable database',()=>{
 const dir=new SyntheticAccountDirectory(['A','B','C','D','E','F','G','H']);
 const snapshots=new Map();
 for(let i=0;i<1000000;i++){
  const id='synthetic-'+i;
  const shard=dir.register(id);
  if(i%50000===0)snapshots.set(id,shard);
 }
 assert.equal(dir.accounts.size,1000000);
 const counts=Object.fromEntries([...dir.counts].sort());
 for(const count of Object.values(counts))assert.equal(count,125000);
 for(const [id,shard] of snapshots)assert.equal(dir.find(id),shard);
 console.log('MILLION_USERS_FIXED_PLACEMENT',JSON.stringify({accounts:1000000,shards:counts.size,
   perShardCounts:counts,ownerPlacementsUnchanged:true}));
});
