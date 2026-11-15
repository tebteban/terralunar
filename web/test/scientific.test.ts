import test from 'node:test'
import assert from 'node:assert/strict'
import {combine,normalize,targetMatch,MONS_WEIGHTS} from '../src/scientificEngine.ts'
test('normalización y límites explícitos',()=>{assert.equal(normalize(5,0,10,'cost'),.5);assert.equal(normalize(20,0,10,'benefit'),1);assert.throws(()=>normalize(2,1,1,'cost'))})
test('máscara excluye toda la suma',()=>{assert.equal(combine([{id:'a',weight:20,value:1},{id:'b',weight:80,value:1}],0).score,0)})
test('datos ausentes no se convierten en cero ni inflan el puntaje',()=>{const r=combine([{id:'a',weight:20,value:1},{id:'b',weight:80,value:null}]);assert.equal(r.score,null);assert.equal(r.coverage,.2);assert.deepEqual(r.bounds,[20,100]);assert.equal(combine([{id:'a',weight:1,value:1}],null).score,null)})
test('similitud depende del objetivo, no de minimizar todo',()=>{assert.equal(targetMatch(10,10,5),1);assert.equal(targetMatch(0,10,5),0);assert.throws(()=>targetMatch(0,0,0))})
test('pesos alteran el resultado de forma explicable',()=>{assert.equal(combine([{id:'a',weight:1,value:1},{id:'b',weight:3,value:0}]).score,25);assert.equal(combine([{id:'a',weight:3,value:1},{id:'b',weight:1,value:0}]).score,75);assert.throws(()=>combine([{id:'a',weight:0,value:1}]));assert.throws(()=>combine([{id:'a',weight:1,value:NaN}]));assert.ok(Math.abs(Object.values(MONS_WEIGHTS).reduce((a,b)=>a+b,0)-1)<1e-12)})
