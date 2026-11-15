import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {maskDecision,DEFAULT_MASK} from '../src/coverageMask.ts'
const valid={id:'a',valid_fraction:1,water:0,built:0,vegetation:0,ndvi:0}
test('exclusión independiente y NDVI estricto',()=>{const p={...DEFAULT_MASK,enabled:true};for(const key of ['water','built','vegetation'])assert.equal(maskDecision({...valid,[key]:1},p).status,'excluded');assert.equal(maskDecision({...valid,ndvi:.1},{...p,ndviMax:.1}).status,'excluded');assert.equal(maskDecision(valid,p).status,'pass')})
test('NoData y NDVI ausente no pasan',()=>{const p={...DEFAULT_MASK,enabled:true};assert.equal(maskDecision(undefined,p).status,'unknown');assert.equal(maskDecision({...valid,ndvi:null},{...p,ndviMax:.1}).status,'unknown');assert.equal(maskDecision({...valid,valid_fraction:.5},p).status,'unknown');assert.equal(maskDecision(undefined,DEFAULT_MASK).status,'off')})
test('cobertura real y umbrales',()=>{const c=JSON.parse(fs.readFileSync('../data/discovery/coverage.json','utf8'));assert.equal(c.items.length,36);assert.equal(c.failures.length,0);assert.ok(c.items.every(x=>x.ndvi===null));assert.throws(()=>maskDecision(valid,{...DEFAULT_MASK,enabled:true,waterMax:NaN}));const results=c.items.map(x=>maskDecision(x,{...DEFAULT_MASK,enabled:true}));console.log('Cobertura real',JSON.stringify(results.reduce((a,r)=>({...a,[r.status]:(a[r.status]||0)+1}),{})))})
