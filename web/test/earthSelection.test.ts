import test from 'node:test'
import assert from 'node:assert/strict'
import {earthPatchZone} from '../src/earthSelection.ts'
import {similarity} from '../src/marsData.ts'
import {moonSimilarity} from '../src/moonRelief.ts'

test('Earth navigation footprint follows the actual DEM sampling grid, including high latitudes',()=>{
 for(const lat of [0,-26.55,75]) {
  const z=earthPatchZone({id:'patch',name:'Patch',lon:170,lat,source:'DEM'})
  const ring=z.polygon.coordinates[0]
  assert.deepEqual(z.centroid,[170,lat]);assert.deepEqual(ring[0],ring[4])
  assert.ok(Math.abs((ring[1][0]-ring[0][0])*111320*Math.cos(lat*Math.PI/180)-20000)<1e-6)
  assert.ok(Math.abs((ring[0][1]-ring[2][1])*111320-20000)<1e-6)
  assert.equal(z.area_km2,400);assert.deepEqual(z.scores,{})
 }
})
test('Lunar and Martian scores use target similarity, with scale-specific roughness tolerances',()=>{
 const a={pendiente_mediana:4,pendiente_p90:8,rugosidad_m:2,desnivel_m:400}
 assert.equal(similarity(a,a),1);assert.equal(moonSimilarity(a,a),1)
 const b={...a,pendiente_mediana:9}
 assert.equal(similarity(a,b),.75);assert.equal(moonSimilarity(a,b),.75)
 const c={...a,rugosidad_m:5}
 assert.equal(moonSimilarity(a,c),.75);assert.ok(similarity(a,c)>.99)
 assert.throws(()=>similarity(a,{...a,desnivel_m:NaN}))
})
