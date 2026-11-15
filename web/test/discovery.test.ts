import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {discover,distanceKm} from '../src/discovery.ts'
import {metrics} from '../src/marsData.ts'
const manifest=JSON.parse(fs.readFileSync('../data/discovery/pilot.json','utf8'))
const index=JSON.parse(fs.readFileSync('../data/compare/index.json','utf8'))
const raw=fs.readFileSync('../data/compare/luna-mons-mouton.bin');const h=new Float32Array(100)
for(let y=0;y<10;y++)for(let x=0;x<10;x++){let sum=0;for(let j=0;j<25;j++)for(let i=0;i<25;i++)sum+=raw.readUInt16LE(((y*25+j)*250+x*25+i)*2);h[y*10+x]=sum/625}
const target=metrics(h),weights={pendiente_mediana:25,pendiente_p90:25,rugosidad_m:25,desnivel_m:25},known=index.items.filter(p=>p.body==='tierra')
const result=discover(manifest.items,target,weights,known)
test('piloto completo, alturas reales finitas y geometrías cerradas',()=>{assert.equal(manifest.processed,36);assert.equal(manifest.failures.length,0);for(const p of manifest.items){assert.equal(p.heights.length,100);assert.ok(p.heights.every(Number.isFinite));assert.deepEqual(p.polygon.coordinates[0][0],p.polygon.coordinates[0][4])}})
test('excluye catálogo y dispersa resultados; reproducción determinista',()=>{assert.ok(result.diverse.length>0);for(const p of result.diverse){assert.ok(known.every(k=>distanceKm(k,p)>=30));assert.ok(result.diverse.every(q=>q.id===p.id||distanceKm(p,q)>=30))}assert.deepEqual(result,discover(manifest.items,target,weights,known))})
test('rechaza datos incompletos y no finitos',()=>{assert.equal(discover([{...manifest.items[0],coverage:.8}],target,weights).scored.length,0);assert.throws(()=>discover([{...manifest.items[0],heights:[NaN]}],target,weights))})
const baseline=result.scored.slice(0,5).map(p=>p.id)
const sensitivity=Object.keys(weights).map(key=>{const altered={...weights,[key]:50};const r=discover(manifest.items,target,altered,known);return {double_weight:key,top1:r.scored[0]?.id,top5_overlap:r.scored.slice(0,5).filter(p=>baseline.includes(p.id)).length}})
fs.writeFileSync('../data/discovery/validation.json',JSON.stringify({target:'luna-mons-mouton',target_features:target,weights,eligible:result.scored.length,representatives:result.diverse.length,top:result.diverse.slice(0,5).map(({id,lat,lon,features,score})=>({id,lat,lon,features,score})),sensitivity,interpretation:'Technical checks and weight sensitivity only; no independent scientific ground truth.'},null,2))
console.log(JSON.stringify({eligible:result.scored.length,representatives:result.diverse.length,top:result.diverse[0]?.id,sensitivity}))
