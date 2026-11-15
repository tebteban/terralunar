import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {withinBounds,validateRegions} from '../src/regions.ts'
test('registro seguro y extensible',()=>{const d=JSON.parse(fs.readFileSync('../data/discovery/regions.json','utf8').replace(/^\uFEFF/,''));assert.equal(validateRegions(d).length,6);assert.throws(()=>validateRegions({...d,regions:[d.regions[0],d.regions[0]]}));assert.throws(()=>validateRegions({...d,regions:[{...d.regions[0],base:'https://other.example/'}]}))})
test('área terrestre explícita y límites inválidos',()=>{const b={west:-69,east:-67,south:-25,north:-23};assert.equal(withinBounds(-68,-24,b),true);assert.equal(withinBounds(-155,19,b),false);assert.throws(()=>withinBounds(0,0,{...b,west:NaN}));assert.throws(()=>withinBounds(0,0,{...b,east:-70}))})
test('Hawái tiene cobertura real vinculada al manifiesto',()=>{const raw=fs.readFileSync('../data/discovery/hawaii/pilot.json');const c=JSON.parse(fs.readFileSync('../data/discovery/hawaii/coverage.json','utf8'));assert.equal(c.pilot_sha256,createHash('sha256').update(raw).digest('hex'));assert.equal(c.items.length,9);assert.equal(c.failures.length,0);assert.ok(c.sources.every((u:string)=>u.includes('N18W156')));assert.ok(c.items.every((i:{samples:number})=>i.samples===10000))})
test('Hawái reciente conserva fechas, calidad y origen del terreno',()=>{const raw=fs.readFileSync('../data/discovery/hawaii/pilot.json');const d=JSON.parse(fs.readFileSync('../data/discovery/hawaii/recent-2026.json','utf8'));assert.equal(d.pilot_sha256,createHash('sha256').update(raw).digest('hex'));assert.equal(d.items.length,9);assert.equal(d.failures.length,0);assert.equal(d.max_scenes_per_tile,2);assert.ok(d.items.every((i:{ndvi:number|null;built:number|null;dates:string[]})=>i.built===null&&(i.ndvi===null||Math.abs(i.ndvi)<=1)&&i.dates.every(v=>v.startsWith('2026-'))))})


test('nuevas regiones tienen DEM real completo, huella y procedencia trazable',()=>{
 for(const id of ['namib','australia','utah','qaidam']){
  const d=JSON.parse(fs.readFileSync('../data/discovery/'+id+'/pilot.json','utf8'))
  assert.equal(d.processed,9);assert.equal(d.failures.length,0);assert.equal(d.cell_m,2000);assert.ok(Object.keys(d.tiles).length>0)
  for(const p of d.items){assert.equal(p.heights.length,100);assert.ok(p.heights.every(Number.isFinite));assert.deepEqual(p.polygon.coordinates[0][0],p.polygon.coordinates[0].at(-1))}
  for(const tile of Object.values(d.tiles) as {url:string;sha256:string}[]) {assert.ok(tile.url.startsWith('https://s3.amazonaws.com/elevation-tiles-prod/'));assert.match(tile.sha256,/^[a-f0-9]{64}$/)}
 }
})
