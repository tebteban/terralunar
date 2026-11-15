import test from 'node:test'
import assert from 'node:assert/strict'
import {inPolygon,geologyAt} from '../src/geologyContext.ts'
import {lunarTarget} from '../src/searchTarget.ts'
const rings=[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]]
test('geología respeta huecos y multipolígonos',()=>{assert.equal(inPolygon([1,1],rings),true);assert.equal(inPolygon([5,5],rings),false);assert.equal(geologyAt(1,1,[{geometry:{type:'MultiPolygon',coordinates:[rings]},properties:{unidad:'x'}}])[0].unidad,'x');assert.equal(geologyAt(20,20,[]).length,0)})
test('selección lunar calcula escala común y rechaza bordes',async()=>{const previous=globalThis.fetch;const n=40,buffer=new ArrayBuffer(n*n*2);const v=new DataView(buffer);for(let y=0;y<n;y++)for(let x=0;x<n;x++)v.setInt16((y*n+x)*2,1000,true);globalThis.fetch=async(path)=>String(path).endsWith('index.json')?new Response(JSON.stringify({lola_res_m:80,globe:{cap_n:n,cap_block:10,cap_dem:'cap.bin'}})):new Response(buffer);try{const result=await lunarTarget(200,200,-85,30);assert.equal(result.cell_m,2000);assert.equal(result.features.desnivel_m,0);assert.equal(result.features.pendiente_mediana,0);await assert.rejects(()=>lunarTarget(0,0,-85,30))}finally{globalThis.fetch=previous}})
