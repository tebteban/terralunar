import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {loadCandidates,rankCandidates,type Candidate} from '../src/globalSearch.ts'
import {earthPatchZone} from '../src/earthSelection.ts'
import {DEFAULT_MASK} from '../src/coverageMask.ts'
import {experimentPlan} from '../src/analogyScope.ts'
import {validateRegions} from '../src/regions.ts'
const features={pendiente_mediana:5,pendiente_p90:8,rugosidad_m:100,desnivel_m:500}
function candidate(id:string,lon:number,origin:'catalogue'|'sampled'='sampled'):Candidate{return {id,name:id,source:'DEM',zone:earthPatchZone({id,name:id,source:'DEM',lon,lat:0}),features,origin,region:'test',coverSource:'unknown',geology:[]}}
const weights=experimentPlan('regional').weights

test('búsqueda mundial mantiene destino, exclusiones, diversidad y origen',()=>{
 const list=[candidate('ref',0,'catalogue'),candidate('near',.1),candidate('new',2),candidate('adjacent',2.1),candidate('far',10)]
 const r=rankCandidates(list,features,weights,DEFAULT_MASK)
 assert.equal(rankCandidates([candidate('near',.1)],features,weights,DEFAULT_MASK,undefined,[{lon:0,lat:0}]).counts.nearReference,1)
 assert.equal(r.counts.nearReference,1);assert.equal(r.rows.length,3);assert.ok(r.rows.every(p=>p.score===100));assert.equal(r.rows.filter(p=>p.origin==='catalogue').length,1)
 const area=rankCandidates(list,features,weights,DEFAULT_MASK,{west:1,east:3,south:-1,north:1});assert.equal(area.counts.inArea,2);assert.equal(area.rows.length,1)
 assert.throws(()=>rankCandidates([],features,{...weights,pendiente_mediana:NaN},DEFAULT_MASK))
})
test('datos ausentes no superan el filtro y coberturas excluidas no se puntúan',()=>{
 const unknown=candidate('unknown',0),wet={...candidate('wet',4),cover:{id:'wet',valid_fraction:1,water:.5,built:0,vegetation:0,ndvi:0}},dry={...candidate('dry',8),cover:{id:'dry',valid_fraction:1,water:0,built:0,vegetation:0,ndvi:0}}
 const r=rankCandidates([unknown,wet,dry],features,weights,{...DEFAULT_MASK,enabled:true})
 assert.equal(r.counts.unknown,1);assert.equal(r.counts.excluded,1);assert.deepEqual(r.rows.map(p=>p.id),['dry'])
})
test('una malla del catálogo ausente no bloquea la búsqueda regional',async()=>{
 const original=globalThis.fetch
 globalThis.fetch=async(input)=>{const u=String(input);if(u.startsWith('/compare/')&&u!=='/compare/index.json')return new Response('',{status:404});try{return new Response(readFileSync('../data'+u))}catch{return new Response('',{status:404})}}
 try{
  const regions=validateRegions(JSON.parse(readFileSync('../data/discovery/regions.json','utf8')))
  const one=await loadCandidates(regions,regions[0].id,false)
  assert.ok(one.candidates.length>0);assert.ok(one.referencePoints.length>0)
  const all=await loadCandidates(regions,'global',false)
  assert.ok(all.candidates.length>0);assert.match(all.reports.find(r=>r.name==='Catálogo mundial')!.status,/Falta el recorte/)
 }finally{globalThis.fetch=original}
})
test('carga multirregional real y puntuación con datos locales, sin red',async()=>{
 const original=globalThis.fetch
 globalThis.fetch=async(input)=>{try{return new Response(readFileSync('../data'+String(input)))}catch{return new Response('',{status:404})}}
 try{
  const regions=validateRegions(JSON.parse(readFileSync('../data/discovery/regions.json','utf8')))
  const all=await loadCandidates(regions,'global',true)
  assert.ok(all.candidates.length>=65);assert.equal(all.reports.length,regions.length+2)
  assert.ok(all.candidates.some(c=>c.origin==='catalogue'));assert.ok(all.candidates.some(c=>c.region.includes('Hawái')))
  assert.equal(all.candidates.filter(c=>c.thermal).length,38)
  const ranked=rankCandidates(all.candidates,features,weights,DEFAULT_MASK)
  const bare=all.candidates.map(c=>({...c,thermal:undefined}))
  assert.deepEqual(ranked.rows.map(c=>[c.id,c.score]),rankCandidates(bare,features,weights,DEFAULT_MASK).rows.map(c=>[c.id,c.score]))
  assert.ok(ranked.rows.length>20);assert.ok(ranked.rows.every(c=>Number.isFinite(c.score)&&c.score>=0&&c.score<=100))
  // Repeatability and exportable polygons.
  assert.deepEqual(ranked.rows.map(c=>c.id),rankCandidates(all.candidates,features,weights,DEFAULT_MASK).rows.map(c=>c.id))
  for(const c of ranked.rows)assert.deepEqual(c.zone.polygon.coordinates[0][0],c.zone.polygon.coordinates[0].at(-1))
 }finally{globalThis.fetch=original}
})
