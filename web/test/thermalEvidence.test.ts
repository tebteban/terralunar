import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {thermalAt,type ThermalManifest} from '../src/thermalEvidence.ts'
const manifest=JSON.parse(readFileSync(new URL('../../data/thermal/modis-observations.json',import.meta.url),'utf8')) as ThermalManifest
test('real MODIS observations retain date, units and quality; coordinates must match',()=>{
 assert.equal(manifest.date,'2025-08-04')
 assert.equal(manifest.items.length,38)
 for(const item of manifest.items){
  const value=thermalAt(manifest,item.id,item.lon,item.lat)
  assert.ok(value)
  assert.equal(value.comparisonEligible,false)
  assert.ok(value.day.kelvin![1]>150&&value.day.kelvin![1]<400)
  assert.equal(thermalAt(manifest,item.id,item.lon+1,item.lat),undefined)
 }
 assert.equal(thermalAt(manifest,'unknown',0,0),undefined)
})
test('invalid coverage and unordered percentiles are rejected',()=>{
 const m=structuredClone(manifest),p=m.items[0]
 p.day.validFraction=2
 assert.equal(thermalAt(m,p.id,p.lon,p.lat),undefined)
 p.day.validFraction=p.day.count/p.day.total;p.day.kelvin=[300,200,250]
 assert.equal(thermalAt(m,p.id,p.lon,p.lat),undefined)
})
