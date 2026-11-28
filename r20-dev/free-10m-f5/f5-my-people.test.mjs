import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePeoplePhone,sanitizePeopleContact,parsePeopleVcards,peoplePickerCandidates,planPeopleChanges,openPeopleStore} from './f5-my-people.mjs';

test('canonical phone numbers never guess a country or accept extension/script input',()=>{
 assert.equal(normalizePeoplePhone('+31 (6) 0000-0123'),'+31600000123');
 assert.equal(normalizePeoplePhone('0031 600 000 123'),'+31600000123');
 assert.equal(normalizePeoplePhone('06 0000 0123'),'0600000123');
 assert.equal(normalizePeoplePhone(''),'');
 for(const bad of ['+012345','1','foo','+31 123;ext=7','+1234567890123456','<img>'])assert.throws(()=>normalizePeoplePhone(bad),/PHONE_INVALID/);
});
test('only name, chosen number and explicit favorites survive contact sanitization',()=>{
 assert.deepEqual(sanitizePeopleContact({name:'  Mama  ',phone:'0031600000123',favorite:true,accountId:'spoof',email:'private',notes:'private'}),{name:'Mama',phone:'+31600000123',favorite:true});
 assert.throws(()=>sanitizePeopleContact({name:'   '}),/NAME_INVALID/);
});
test('vCard parsing preserves choice of numbers and excludes every unwanted field',()=>{
 const vcard='BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Anna\\, test\r\nTEL;TYPE=CELL:+31 600 000 123\r\nTEL;TYPE=HOME:0031600000123\r\nTEL;VALUE=uri:tel:+31600000124\r\nEMAIL:secret@example.invalid\r\nNOTE:private\r\nPHOTO;ENCODING=b:123\r\nEND:VCARD\r\nBEGIN:VCARD\r\nFN:Bert\r\n  test\r\nEND:VCARD';
 assert.deepEqual(parsePeopleVcards(vcard),[{name:'Anna, test',phones:['+31600000123','+31600000124']},{name:'Bert test',phones:[]}]);
 assert.deepEqual(parsePeopleVcards('BEGIN:VCARD\nFN:unfinished'),[]);
 assert.throws(()=>parsePeopleVcards(null),/VCARD_INVALID/);
});
test('native multiselect records omit e-mails, photos and unknown fields',()=>{
 assert.deepEqual(peoplePickerCandidates([{name:['Test'],tel:['0031600000123','+31600000123','bad'],email:['private'],icon:['secret']},{name:[],tel:['+31600000123']}]),[{name:'Test',phones:['+31600000123']}]);
});
test('repeated import creates no duplicate, never overwrites user name/favorite or associates an account',()=>{
 const existing=[{id:'existing',name:'My original',phone:'+31600000123',favorite:true}];
 let n=0;const result=planPeopleChanges(existing,[{name:'Changed',phone:'0031600000123',favorite:false,accountId:'spoof'},{name:'New',phone:'+31600000124'},{name:'Duplicate',phone:'+31600000124'}],()=>String(++n));
 assert.deepEqual(result.rows,[...existing,{id:'1',name:'New',phone:'+31600000124',favorite:false}]);
 assert.deepEqual(result.results,[{id:'existing',added:false},{id:'1',added:true},{id:'1',added:false}]);
});
test('no account or a stale account cannot open a contact store',async()=>{
 await assert.rejects(openPeopleStore('anonymous'),/ACCOUNT_REQUIRED/);
 await assert.rejects(openPeopleStore('00000000-0000-4000-8000-000000000001',{isCurrent:()=>false}),/ACCOUNT_CHANGED/);
});
