import {test} from 'node:test'
import assert from 'node:assert/strict'
import {metrics, similarity, offset, elevation} from '../src/marsData.ts'
test('flat terrain and inclined plane recover physical slopes',()=>{
 const flat=metrics(new Float32Array(100).fill(300))
 assert.equal(flat.pendiente_mediana,0);assert.equal(flat.rugosidad_m,0)
 const plane=Float32Array.from({length:100},(_,i)=>(i%10)*200)
 const m=metrics(plane)
 assert.ok(Math.abs(m.pendiente_mediana-Math.atan(.1)*180/Math.PI)<1e-6)
 assert.ok(m.rugosidad_m<1e-8)
 assert.equal(similarity(m,m),1)
})
test('coordinate offsets wrap and remain valid at both poles',()=>{
 for(const lat of [-90,0,90])for(const lon of [-180,180,0]){
 const [l,p]=offset(lon,lat,10000,10000)
 assert.ok(Number.isFinite(l)&&Number.isFinite(p)&&Math.abs(p)<=90&&Math.abs(l)<=180)
 }
})
test('longitude seam samples wrap consistently',()=>{
 const grid=new Int16Array(11520*5760)
 grid[2879*11520+11519]=100;grid[2879*11520]=200
 assert.equal(elevation(grid,0,0),elevation(grid,360,0))
 assert.equal(elevation(grid,-180,0),elevation(grid,180,0))
})
