// Real, isolated EU Cloudflare F5 audio/thumbnail test; synthetic account only.
// Stage QA secret comes from masked GitHub Actions env, never logged or stored.
import assert from 'node:assert/strict';
const host=process.env.F5_STAGE_HOST||'';
const gate=process.env.STAGING_F5_KEY||'';
assert.match(host,/^talera-free-f5-[a-z0-9-]+\.mark-a39\.workers\.dev$/);
assert.match(gate,/^[a-f0-9]{64}$/);
const origin='https://'+host,id=Date.now().toString(36);
const registered=await fetch(origin+'/api/register',{method:'POST',headers:{
 origin,'x-talera-f5-key':gate,'content-type':'application/json'
},body:JSON.stringify({
 email:'f5-real-sound-'+id+'@example.invalid',
 username:'f5sound'+id,displayName:'Fictieve video met geluid',
 password:'Synthetic_Only_Free_F5_Media_Recording_2026',
 birthDate:'1974-04-02'
}),signal:AbortSignal.timeout(18000)});
assert.equal(registered.status,200,'Synthetic stage account should be possible');
const sid=/talera_sid=([a-f0-9]{64})/.exec(registered.headers.get('set-cookie')||'')?.[1];
assert.ok(sid);
process.env.F5_POSTER_TEST_ORIGIN=origin;
process.env.F5_POSTER_TEST_GATE=gate;
process.env.F5_POSTER_TEST_SID=sid;
await import('./f5-soundtrack-poster-original-browser.mjs');
console.log('TALERA_F5_REAL_EU_STAGE_ORIGINAL_EDITOR_MUTED_AND_POSTER_PASS');
