import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {referenceFor,comparisonFor,serializeRun,type AnalysisRun} from '../src/analysisRun.ts'
import {loadCandidates,rankCandidates} from '../src/globalSearch.ts'
import {validateRegions} from '../src/regions.ts'
import {experimentPlan} from '../src/analogyScope.ts'
import {DEFAULT_MASK} from '../src/coverageMask.ts'
test('ejecución real conserva destino, alturas, score ponderado, huella y exportación',async()=>{
 const original=globalThis.fetch
 globalThis.fetch=async input=>{try{return new Response(readFileSync('../data'+String(input)))}catch{return new Response('',{status:404})}}
 try{
  const resolvedTarget=await referenceFor('luna-mons-malapert')
  const regions=validateRegions(JSON.parse(readFileSync('../data/discovery/regions.json','utf8')))
  const loaded=await loadCandidates(regions,'global',true)
  const weights=experimentPlan('rover').weights
  const ranked=rankCandidates(loaded.candidates,resolvedTarget.features,weights,DEFAULT_MASK)
  const run:AnalysisRun={...ranked,id:'test-real',resolvedTarget,reference:resolvedTarget.features,target:'luna-mons-malapert',experiment:'rover',weights,scope:'global',recent:true,mask:DEFAULT_MASK,bounds:null,generated:'2026-11-15',elapsed:0,reports:loaded.reports}
  for(const row of run.rows){const c=comparisonFor(run,row)!;assert.equal(c.items[0].name,resolvedTarget.name);assert.deepEqual(c.items[0].heights,resolvedTarget.heights);assert.deepEqual(c.items[1].heights,row.heights);assert.equal(c.items[1].lon,row.zone.centroid[0]);assert.equal(c.res_m,2000);assert.equal(c.items[0].id,'mission-target')}
  const exported=JSON.parse(serializeRun(run));assert.equal(exported.resolvedTarget.heights.length,100);assert.equal(exported.rows[0].heights.length,100);assert.equal(exported.rows[0].score,run.rows[0].score);assert.deepEqual(exported.weights,weights)
  assert.equal(comparisonFor(run,{...run.rows[0],id:'not-in-this-run'}),null)
  assert.equal(comparisonFor(run,{...run.rows[0],heights:undefined}),null)
  assert.ok(run.rows.some(r=>r.origin==='sampled'));assert.ok(run.rows.some(r=>r.origin==='catalogue'))
 }finally{globalThis.fetch=original}
})
