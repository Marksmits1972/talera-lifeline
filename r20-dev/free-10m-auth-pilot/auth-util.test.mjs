import test from 'node:test';
import assert from 'node:assert/strict';
import {
 validEmail,validHandle,validDisplay,validPassword,validAccountId,
 passwordHash,safeEqualHex,shaHex,namespacedHash,readSessionCookie,sessionCookie
} from './auth-util.mjs';

test('Email, username, name, password and UUID retain original TALERA constraints',()=>{
 assert.equal(validEmail(' Example@Example.COM '),'example@example.com');
 assert.equal(validHandle('@John DOE'),'john doe');
 assert.equal(validDisplay(' Mijn naam '),'Mijn naam');
 assert.equal(validPassword('correct horse'),'correct horse');
 assert.equal(validAccountId('5c719d21-114e-48e6-ad2c-199ead3aaadb'),'5c719d21-114e-48e6-ad2c-199ead3aaadb');
 for(const x of ['', 'ab', '@', 'bad/username'])assert.throws(()=>validHandle(x));
 for(const x of ['x','abc','nope@'])assert.throws(()=>validEmail(x));
 for(const x of ['', 'short'])assert.throws(()=>validPassword(x));
});
test('Legacy-compatible PBKDF2 hashes are stable, and comparison never accepts wrong hash',async()=>{
 const h=await passwordHash('correct horse','a'.repeat(64));
 assert.match(h,/^[0-9a-f]{64}$/);
 assert.equal(await passwordHash('correct horse','a'.repeat(64)),h);
 assert.ok(safeEqualHex(h,h));
 assert.equal(safeEqualHex(h,'a'.repeat(64)),false);
 assert.equal(safeEqualHex(h.slice(0,63),h),false);
 assert.notEqual(await passwordHash('wrong','a'.repeat(64)),h);
});
test('Account identity routing is deterministic but does not leak raw emails or usernames',async()=>{
 const key='TEST_ONLY_FAKE_NAMESPACE_KEY_WITH_AT_LEAST_40_CHARACTERS';
 const a=await namespacedHash(key,'email:alice@example.invalid');
 const b=await namespacedHash(key,'email:bob@example.invalid');
 const handle=await namespacedHash(key,'handle:alice');
 assert.match(a,/^[0-9a-f]{64}$/);
 assert.equal(a,await namespacedHash(key,'email:alice@example.invalid'));
 assert.notEqual(a,b);assert.notEqual(a,handle);
 assert.ok(!a.includes('alice'));assert.ok(!a.includes('@'));
 assert.throws(()=>validAccountId('alice@example.invalid'));
 await assert.rejects(namespacedHash('too-short','email:alice@example.invalid'));
});
test('Session cookies are exact 64-byte-hex tokens, HttpOnly, Secure and not duplicated',async()=>{
 const t='a'.repeat(64);
 const cookie=sessionCookie(t);
 assert.match(cookie,/HttpOnly/);
 assert.match(cookie,/Secure/);
 assert.match(cookie,/SameSite=Lax/);
 assert.match(cookie,/Max-Age=604800/);
 assert.equal(readSessionCookie(new Request('https://demo.invalid',{headers:{cookie:'other=1; talera_sid='+t}})),t);
 assert.equal(readSessionCookie(new Request('https://demo.invalid',{headers:{cookie:'talera_sid='+t+'; talera_sid='+t}})),null);
 assert.equal(readSessionCookie(new Request('https://demo.invalid',{headers:{cookie:'talera_sid=bad'}})),null);
 assert.notEqual(await shaHex(t),t);
 assert.match(sessionCookie('',0),/Max-Age=0/);
});
