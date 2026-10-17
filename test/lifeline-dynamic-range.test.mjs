import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {deriveLifeRange,LIFE_RANGE_SCRIPT} from '../src/life-range.js';

const today=new Date(2026,9,17,12);
const at=(date)=>({at:date});
const local=(date)=>({date});

test('the life line stretches from the earliest memory to today',()=>{
 const range=deriveLifeRange([at('1948-05-23T12:00:00'),at('2026-06-10T11:00:00')],null,today);
 assert.equal(range.startYear,1948);
 assert.equal(range.endYear,2026);
 assert.equal(range.startMs,new Date(1948,0,1).getTime());
 assert.equal(range.endMs,today.getTime());
});

test('a birth year starts the timeline unless an earlier stored memory exists',()=>{
 assert.equal(deriveLifeRange([local('1985-07-18')],1952,today).startYear,1952);
 assert.equal(deriveLifeRange([local('1948-07-18')],1952,today).startYear,1948);
 assert.equal(deriveLifeRange([],1952,today).startYear,1952);
 assert.equal(deriveLifeRange([],null,today).startYear,2026);
});

test('timeline end always follows today and never silently stops in September 2026',()=>{
 const nextYear=new Date(2032,4,9,10);
 const r=deriveLifeRange([local('1948-02-01')],1952,nextYear);
 assert.equal(r.startYear,1948);
 assert.equal(r.endYear,2032);
 assert.equal(r.endMs,nextYear.getTime());
 assert.ok(r.totalDays>0);
});

test('browser helper runs the exact same implementation, not an independent date formula',()=>{
 const script=LIFE_RANGE_SCRIPT.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const browser={window:{}};
 vm.runInNewContext(script,browser);
 const r=browser.window.TaleraLifeRange([local('1948-02-01')],1952,today);
 const actual=deriveLifeRange([local('1948-02-01')],1952,today);
 assert.equal(r.startYear,actual.startYear);
 assert.equal(r.endYear,actual.endYear);
 assert.equal(r.startMs,actual.startMs);
 assert.equal(r.totalDays,actual.totalDays);
});

test('native RH19 uses the shared dynamic life bounds for density and navigation',()=>{
 const index=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
 const html3=readFileSync(new URL('../src/html/chunk3.js',import.meta.url),'utf8');
 const html7=readFileSync(new URL('../src/html/chunk7.js',import.meta.url),'utf8');
 const home=readFileSync(new URL('../experiments/lifeline-main/visual-v8-photo-space.html',import.meta.url),'utf8');
 const adapter=readFileSync(new URL('../experiments/lifeline-main/local-rh19-adapter.js',import.meta.url),'utf8');
 assert.match(index,/get lifeStart\(\)\{return LIFE_START\}/);
 assert.match(index,/get lifeEnd\(\)\{return LIFE_END\}/);
 assert.match(index,/dayCounts=new Uint16Array\(TOTAL_DAYS\)/);
 assert.match(index,/taleraBirthYear/);
 assert.match(html3,/"let LIFE_START = 0;"/);
 assert.match(html7,/initialLifeRange=window\.TaleraLifeRange\(MEMORIES,null\)/);
 assert.match(home,/function updateLifeBounds\(\)/);
 assert.match(home,/window\.TaleraLifeRange\(memories,profileBirthYear\)/);
 assert.match(adapter,/runtime\.setBirthYear\?\.\(store\.birthday\?\.\(\)\)/);
 assert.doesNotMatch(index,/lifeEnd:.*2026/);
});
