import test from 'node:test'
import assert from 'node:assert/strict'
import {terrainFile,terrainGeometry} from '../src/terrainExport.ts'

const n=32,h=Float32Array.from({length:n*n},(_,i)=>Math.floor(i/n)) // sube 1 m por fila hacia el sur

test('la malla conserva escala, exageración y centro',()=>{
 const g=terrainGeometry(h,n,20000,2);g.computeBoundingBox()
 const b=g.boundingBox!
 assert.equal(b.max.x-b.min.x,20000);assert.equal(b.max.y-b.min.y,(n-1)*2);assert.ok(Math.abs(b.max.y+b.min.y)<1e-6)
 assert.throws(()=>terrainGeometry(h,n+1,20000,2))
})
test('STL binario y OBJ con Z hacia arriba y norte en +Y',()=>{
 const stl=terrainFile(h,n,20000,1,'stl','Prueba') as DataView
 assert.equal(stl.byteLength,84+50*2*(n-1)**2)
 const obj=terrainFile(h,n,20000,1,'obj','Prueba') as string
 assert.match(obj,/^o Prueba$/m);assert.equal(obj.match(/^v /gm)!.length,n*n)
 const v=obj.match(/^v .+$/gm)!.map(l=>l.split(' ').slice(1).map(Number))
 const north=v.filter(p=>p[1]===10000),south=v.filter(p=>p[1]===-10000)
 assert.ok(north[0][2]<south[0][2]) // la fila norte (índice 0) es la más baja
})
