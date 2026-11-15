import test from 'node:test'
import assert from 'node:assert/strict'
import {terrarium,tilePixel} from '../src/earthTerrain.ts'

test('tiles Terrarium: píxel Web Mercator y decodificación de altura',()=>{
 assert.deepEqual(tilePixel(0,0,0),[128,128])
 const [x,y]=tilePixel(-180,85.05112878,1);assert.equal(x,0);assert.ok(Math.abs(y)<1e-6)
 assert.equal(terrarium(128,0,0),0);assert.equal(terrarium(128,100,128),100.5);assert.equal(terrarium(0,0,0),-32768)
})
